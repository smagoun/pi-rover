
"use strict";

let socket = null;

// Identifier provided by the server
let client_id = 0;

// Counter for messages we send
let message_id = 0;

// Error timeout, in ms
const ERR_MSG_TIMEOUT = 3000;

function connect(host, port, openCallback, closeCallback) {
    if (socket != null) {
	if (socket.readyState != WebSocket.CLOSED) {
	    socket.close();
	    // TODO: Should only continue when we get the onclose event
	}
    }
    // TOOD: Support wss too
    const url = `ws://${host}:${port}`;
    console.log(`connecting socket to ${url}`);
    socket = new WebSocket(url, 'rover-control');
    socket.onopen = openCallback;
    socket.onclose = closeCallback;
}

// Send a command to the server
//
// Requires that the socket is already open
function sendCommand(cmd) {
    let msg = {
	client_id: client_id,
	message_id: message_id,
	command: cmd,
	date: Date.now(),
    };
    if (socket != null) {
	let state = socket.readyState;
	if (state === WebSocket.OPEN) {
	    console.log(`sending command: ${JSON.stringify(msg)}`);
	    socket.send(JSON.stringify(msg));
	    message_id++;
	} else {
	    console.log(`Unable to send message, socket not ready (state is ${state})`);
	}
    } else {
	console.log(`Unable to send message, socket is null`);
    }
}

function buttonPress(cmd, element) {
    console.log(`${cmd} button pressed`);
    sendCommand(cmd);
}

function openCallback(evt) {
    console.log('socket opened', evt);
    enableElement('ctl_buttons');
    disableElement('btn_connect');
    enableElement('btn_disconnect');
    sendCommand('take_control');
}

async function closeCallback(evt) {
    console.log('socket closed', evt);
    socket = null;
    message_id = 0;
    
    disableElement('ctl_buttons');
    disableElement('btn_disconnect');
    enableElement('btn_connect');
    
    if (evt.code != 1000) {  // 1000 is 'Normal closure'. See WebSockets API: CloseEvent
	msgs = document.getElementById('msgs');
	msgs.innerText = 'The server closed the connection.';
	await sleep(ERR_MSG_TIMEOUT);
	msgs.innerText = '';
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

function takeControl(host, port) {
    connect(host, port, openCallback, closeCallback);
}

function enableElement(id) {
    document.getElementById(id).disabled = false;
}
function disableElement(id) {
    document.getElementById(id).disabled = true;
}

function cedeControl() {
    if (socket != null) {
	sendCommand('cede_control');
	socket.close();
    }
}