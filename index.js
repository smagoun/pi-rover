#!/usr/bin/env node

"use strict";

const http = require('http');
const fs = require('fs');
const WebSocketServer = require('websocket').server;

const rover = require('rpi-gpio');

const PIN_MODE   = rover.MODE_BCM;
const PIN_L_FWD  = 17;
const PIN_L_BACK = 18;
const PIN_R_FWD  = 27;
const PIN_R_BACK = 22;
const PINS = [PIN_L_FWD, PIN_L_BACK, PIN_R_FWD, PIN_R_BACK];

//
// Procotol definition, shared between client and server
//

//const PROTOCOL = 'rover-control';

const CMD_FWD   = 'forward';
const CMD_BACK  = 'back';
const CMD_LEFT  = 'left';
const CMD_RIGHT = 'right';
const CMD_TAKE_CONTROL = 'take-control';
const CMD_CEDE_CONTROL = 'cede-control';


// HTTP Server constants
const MIME_TYPES = {
    'html': 'text/html',
    'ico': 'image/x-icon',
    'js': 'text/javascript',
    'css': 'text/css',
};

// URL to filename mappings
const VALID_URLS = {
    '/': 'index.html',
    '/favicon.ico': 'favicon.ico',
    '/rover-client.js': 'rover-client.js',
    '/protocol.js': 'protocol.js',
};

// Read a file, put it in the response, and end the response
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

// Handle initial HTTP request from server
// Could be done by e.g. nginx but we do it here to
// be as self-contained as possible
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
server.listen(8080, function() {
    console.log('Listening on port 8080');
});

function processCommand(cmd) {
    // Validate + execute command
    let duration = 0;
    switch (cmd) {
    case CMD_LEFT:
    case CMD_RIGHT:
	duration = 200;
    case CMD_FWD:
    case CMD_BACK:
	duration = (duration === 0) ? 1000 : duration;
	console.log('executing command:', cmd, duration);
	executeCommand(cmd, duration);
	break;
    case CMD_TAKE_CONTROL:
	// TODO: Anything to do here?
	console.log('Received cmd:', cmd);
	break;
    case CMD_CEDE_CONTROL:
	// TODO: Anything to do here?
	console.log('Received cmd:', cmd);
	break;
    default:
	console.log('Unknown command' , cmd);
    }
}

/**
 * Sleep for 'ms' millisconds
 *
 * @example
 * async function foo() {
 *   await sleep(100);
 * }
 *
 * @param {number} ms
 * @returns {Promise} Promise resolved after ms milliseconds.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCommand(cmd, duration) {
    // TODO: Figure out event queueing so that we don't have multiple
    // commands trying to execute simultaneously.
    switch (cmd) {
    case CMD_LEFT:
	rover.write(PIN_L_BACK, 1);
	rover.write(PIN_R_FWD, 1);
	await sleep(duration);
	rover.write(PIN_L_BACK, 0);
	rover.write(PIN_R_FWD, 0);
	break;
    case CMD_RIGHT:
	rover.write(PIN_L_FWD, 1);
	rover.write(PIN_R_BACK, 1);
	await sleep(duration);
	rover.write(PIN_L_FWD, 0);
	rover.write(PIN_R_BACK, 0);
	break;
    case CMD_FWD:
	rover.write(PIN_L_FWD, 1);
	rover.write(PIN_R_FWD, 1);
	await sleep(duration);
	rover.write(PIN_L_FWD, 0);
	rover.write(PIN_R_FWD, 0);
	break;
    case CMD_BACK:
	rover.write(PIN_L_BACK, 1);
	rover.write(PIN_R_BACK, 1);
	await sleep(duration);
	rover.write(PIN_L_BACK, 0);
	rover.write(PIN_R_BACK, 0);
	break;
    default:
	console.log('Unknown command:', cmd);
    }
}

function roverCallback(error) {
    if (error) {
	console.log('Rover callback:', error);
    }
}

function connectRover() {
    rover.setMode(PIN_MODE);
    for (const pin of PINS) {
	rover.setup(pin, rover.DIR_OUT, roverCallback);
    }
    console.log('Rover connected');
}

// WebSocket server
const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});
wsServer.on('request', function(req) {
    console.log('Handling req from', req.origin);
    let connection = req.accept('rover-control', req.origin);
    // TODO: Implement queue of clients
    //connectionArray.push(connection);
    let msg = {
	type: 'id',
	id: connection.clientID,
    };
    //connection.setUTF(JSON.stringify(msg));

    connection.on('message', function(msg) {
	if (msg.type === 'utf8') {
	    console.log('received message:', msg.utf8Data);
	    let msg_data = JSON.parse(msg.utf8Data);
	    // TODO: Check whether we've missed any messages
	    // TODO: check whether we allow commands from this client (is it their turn?)
	    let cmd = msg_data.command;
	    if (cmd === null) {
		console.log('malformed command:', cmd);
	    } else {
		processCommand(cmd);
	    }
	} else {
	    console.log('received unknown message type', msg.type);
	}
    });

    connection.on('close', function(conn) {
	console.log('closing connection to', conn.remoteAddress);
    });
});

connectRover();
