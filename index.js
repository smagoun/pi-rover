#!/usr/bin/env node

"use strict";

const http = require('http');
const fs = require('fs');
const WebSocketServer = require('websocket').server;

const protocol = require('./protocol.js');
let Queue = require('./queue.js');

const rover = require('rpi-gpio');

const PIN_MODE   = rover.MODE_BCM;
const PIN_L_FWD  = 17;
const PIN_L_BACK = 18;
const PIN_R_FWD  = 27;
const PIN_R_BACK = 22;
const PINS = [PIN_L_FWD, PIN_L_BACK, PIN_R_FWD, PIN_R_BACK];

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

// List of connected clients
let clients = new Queue();
// Queue of clients that want control
let control_queue = new Queue();
// ID of the most-recently issued connection
let connection_id = -1;

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

function processCommand(conn, cmd) {
    // Validate + execute command
    let duration = 0;
    console.log('protocol', protocol.CMD_REQUEST_CONTROL);
    switch (cmd) {
    case protocol.CMD_LEFT:
    case protocol.CMD_RIGHT:
	duration = 200;
    case protocol.CMD_FWD:
    case protocol.CMD_BACK:
	duration = (duration === 0) ? 1000 : duration;
	console.log('executing command:', cmd, duration);
	executeCommand(cmd, duration);
	break;
    case protocol.CMD_CEDE_CONTROL:
	// Give up control and notify the next in line
	console.log('Received cmd:', cmd);
	control_queue.remove(conn, function(next_client) {
            next_client.send(protocol.CMD_BEGIN);
	});
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
    case protocol.CMD_LEFT:
	rover.write(PIN_L_BACK, 1);
	rover.write(PIN_R_FWD, 1);
	await sleep(duration);
	rover.write(PIN_L_BACK, 0);
	rover.write(PIN_R_FWD, 0);
	break;
    case protocol.CMD_RIGHT:
	rover.write(PIN_L_FWD, 1);
	rover.write(PIN_R_BACK, 1);
	await sleep(duration);
	rover.write(PIN_L_FWD, 0);
	rover.write(PIN_R_BACK, 0);
	break;
    case protocol.CMD_FWD:
	rover.write(PIN_L_FWD, 1);
	rover.write(PIN_R_FWD, 1);
	await sleep(duration);
	rover.write(PIN_L_FWD, 0);
	rover.write(PIN_R_FWD, 0);
	break;
    case protocol.CMD_BACK:
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
	// This can sometimes thrown an 'EACCES: permission denied' error when opening
	// one of the gpios in sysfs. Not clear why that is happening. A timeout between
	// calls doesn't seem to help.
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
    let connection = req.accept(protocol.PROTOCOL, req.origin);
    clients.enqueue(connection);
    // TODO: Send the connection_id to the client, which will then send it
    // back to us in messages

    let msg = {
	type: 'id',
	id: connection.clientID,
    };
    
    connection.on('message', function(msg) {
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
	if (cmd === protocol.CMD_REQUEST_CONTROL) {
	    // Get in line to control the rover
	    control_queue.enqueue(this);
	    // If we're first in line, send 'begin'
	    if (control_queue.size() == 1) {
		this.send(protocol.CMD_BEGIN);
	    }
	} else {
	    // Only take input from the currently-active client
	    let active_conn = clients.peek();
	    if (active_conn !== this) {
		console.log('Ignoring message not from active client');
		return;
	    }
	    processCommand(this, cmd);
	}
    });

    connection.on('close', function() {
	console.log('closing connection to', this.remoteAddress);
	// Remove the connection from the array
	clients.remove(this, null);
	// Notify the next in line
	control_queue.remove(this, function(next_client) {
	    next_client.send(protocol.CMD_BEGIN);
	});
    });
});

connectRover();
