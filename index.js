#!/usr/bin/env node

"use strict";

const http = require('http');
const fs = require('fs');
const WebSocketServer = require('websocket').server;
const LISTEN_PORT = 8080;

const protocol = require('./protocol.js');
let Queue = require('./queue.js');
let Rover = require('./rover.js');

/** Time (in ms) to run while turning */
const DUR_TURN = 200;
/** Time (in ms) to move forward or backward */ 
const DUR_MOVE = 1000;

/** Supported MIME types for the HTTP server */
const MIME_TYPES = {
    'html': 'text/html',
    'ico': 'image/x-icon',
    'js': 'text/javascript',
    'css': 'text/css',
};

/** URL to filename mappings */
const VALID_URLS = {
    '/': 'index.html',
    '/favicon.ico': 'favicon.ico',
    '/rover-client.js': 'rover-client.js',
    '/protocol.js': 'protocol.js',
};

/** List of valid origins for the WebSocket */
let valid_origins = [];

/** Queue of clients that want control of the rover */
let control_queue = new Queue(function (next_client) {
    next_client.send(protocol.CMD_BEGIN_CONTROL);
});

/** Rover instance */
let rover = null;

/**
 * Read a file from disk, put it into the response, and send the response.
 *
 * Does not do any checks to ensure that we are not serving something dangerous;
 * perform these checks beforehand.
 *
 * @param {http.ClientRequest} req Request from the client
 * @param {http.ServerResponse} res Response to be send to the client
 * @param {String} filename Name of the file to be served
 */
function serveFile(req, res, filename) {
    // Read file each time for hot reload
    let ext = filename.split('.').pop();
    let ctype = (ext != '') ? MIME_TYPES[ext] : 'text/html';  // Assume dir listings are html
    
    // Always assume encoding is binary since we're not looking at the file
    fs.readFile(filename, (err, data) => {
	if (err) {
	    console.log('Error loading', filename);
	    res.writeHead(500);
	} else {
	    res.writeHead(200, {
		'Content-Type': ctype,
		'Content-Length': data.length
	    });
	    res.write(data);
	}
	res.end();
    });
}

/**
 * Create the HTTP server that handles initial requests from clients.
 * 
 * While we could serve HTTP requests elsewhere such as from nginx, we do it
 * here to be as self-contained as possible.
 * 
 * @returns {http.Server} A new instance of a Node http.Server
 */
function createHttpServer() {
    const server = http.createServer(function(req, res) {
	console.log('Received req for', req.url);
	// Simple security, anything we don't explicitly recognize is an error
	let filename = VALID_URLS[req.url];
	if (filename) {
	    serveFile(req, res, filename);
	} else {
	    // For now, redirect all other traffic to the index page
	    res.writeHead(302, {
		'Location': 'http://' + req.headers['host'] + '/'
	    });
	    res.end();
	}
    });
    server.listen(LISTEN_PORT, function() {
	console.log('Listening on port', LISTEN_PORT);
    });
    return server;
}

/**
 * Handle a command from the client. Assumes that the command has already
 * been validated as OK to process.
 *
 * @param {WebSocketConnection} conn Connection that provided the command
 * @param {String} cmd One of the Protocol.CMD_* commands from the client.
 *     Does not handle CMD_REQUEST_CONTROL, which can be sent by any client
 *     (not just a valid client) and therefore should be processed separately.
 */
function processCommand(conn, cmd) {
    // Validate + execute command
    let duration = 0;
    switch (cmd) {
    case protocol.CMD_LEFT:
    case protocol.CMD_RIGHT:
	duration = DUR_TURN;
    case protocol.CMD_FWD:
    case protocol.CMD_BACK:
	duration = (duration === 0) ? DUR_MOVE : duration;
	console.log('executing command:', cmd, duration);
	try {
	    rover.executeCommand(cmd, duration);
	} catch (e) {
	    console.log(e);
	}
	break;
    case protocol.CMD_CEDE_CONTROL:
	// Give up control and notify the next in line
	console.log('Received cmd:', cmd);
	control_queue.remove(conn);
	break;
    default:
	console.log('Unknown command' , cmd);
    }
}

/**
 * Callback for errors when communicating with the rover
 * 
 * @param {Error} error
 */
function roverCallback(error) {
    if (error) {
	console.log('Rover callback:', error);
    }
}

/**
 * Read and process environment variables
 */
function readEnv() {
    const env = process.env.ORIGIN;
    if (env) {
	let origins = env.split(',');
	valid_origins.push(...origins);
    }
    console.log('valid origins:', valid_origins);
}

/**
 * Determine whether to accept request from the given origin.
 *
 * If valid_origins is populated, checks that origin is in valid_origins.
 * 
 * @param {String} origin Origin from the request
 * @returns {boolean} true if it's OK to accept requests from this origin
 */
function validateOrigin(origin) {
    if (origin === null || origin === "*"
	|| (valid_origins.length > 0 && !valid_origins.includes(origin))) {

	console.log('invalid origin', origin);
	return false;
    }
    return true;
}

/**
 * Create the WebSocket server instance
 * 
 * @param {http.Server} httpServer http.Server instance
 */
function createWsServer(httpServer) {
    const wsServer = new WebSocketServer({
	httpServer: httpServer,
	autoAcceptConnections: false
    });
    wsServer.on('request', function(req) {
	console.log('Handling req from', req.origin);
	if (!validateOrigin(req.origin)) {
	    console.log('Client sent invalid origin', req.origin);
	    req.reject(404, 'Invalid origin');
	    return;
	}
	if (!req.requestedProtocols.includes(protocol.PROTOCOL)) {
	    console.log("Client doesn't want to speak", protocol.PROTOCOL);
	    req.reject(404, 'Protocol not supported');
	    return;
	}
	let connection = req.accept(protocol.PROTOCOL, req.origin);
	connection.on('message', onMessage);
	connection.on('close', onClose);
    });
}

/**
 * Handler for 'message' events from the WebSocketServer.
 * 
 * Enqueues requests to control the rover. Validates incoming
 * commands and dispatches them to the rover if appropriate.
 *
 * @param {Object} msg Message from the client
 */
function onMessage(msg) {
    if (msg.type !== 'utf8') {
	console.log('received unknown message type', msg.type);
	return;
    }
    console.log('received message:', msg.utf8Data);
    let msg_data = JSON.parse(msg.utf8Data);
    let cmd = msg_data.command;
    if (cmd === null) {
	console.log('malformed command:', cmd);
	return;
    }
    switch (cmd) {
    case protocol.CMD_REQUEST_CONTROL:
	// Get in line to control the rover, and take control if we're first
	control_queue.enqueue(this);
	break;
    case protocol.CMD_CEDE_CONTROL:
	// Give up control and notify the next in line
	control_queue.remove(this);
	break;
    default:
	// Only take input from the currently-active client
	let active_conn = control_queue.peek();
	if (active_conn !== this) {
	    console.log('Ignoring message not from active client');
	    return;
	}
	processCommand(this, cmd);
    }
}

/**
 * Handler for close events from the WebSocket server.
 *
 * Removes the connection from the queue of controllers and if appropriate
 * notifies the next client that it's their turn to control the rover.
 *
 * @param {number} reason Reason code
 * @param {String} description Description of the close event
 */
function onClose(reason, description) {
    console.log('closing connection to', this.remoteAddress, reason, description);
    // Give up control and notify the next in line
    control_queue.remove(this);
}

/**
 * Entry point
 */
let main = function() {
    readEnv();
    rover =  new Rover(roverCallback);
    const server = createHttpServer();
    createWsServer(server);
}
if (require.main === module) {
    main();
}
