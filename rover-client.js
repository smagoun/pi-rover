
"use strict";

let socket = null;

// Identifier provided by the server
let client_id = 0;

// Counter for messages we send
let message_id = 0;

// Message timeout, in ms
const MSG_TIMEOUT = 3000;

function connect(host, port, openCallback, closeCallback) {
    if (socket != null) {
	if (socket.readyState != WebSocket.CLOSED) {
	    socket.close();
	    // TODO: Should only continue when we get the onclose event
	}
    }
    // TODO: Support wss too
    const url = `ws://${host}:${port}`;
    console.log(`connecting socket to ${url}`);
    socket = new WebSocket(url, protocol.PROTOCOL);
    socket.onopen = openCallback;
    socket.onclose = closeCallback;
    socket.onmessage = messageCallback;
    socket.onerror = errorCallback;
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
    disableElement('btn_connect');
    enableElement('btn_disconnect');
    sendCommand(protocol.CMD_REQUEST_CONTROL);
}

function closeCallback(evt) {
    console.log('socket closed', evt);
    socket = null;
    message_id = 0;
    
    disableElement('ctl_buttons');
    disableElement('btn_disconnect');
    enableElement('btn_connect');
    
    if (evt.code != 1000) {  // 1000 is 'Normal closure'. See WebSockets API: CloseEvent
	writeStatus('The server closed the connection', MSG_TIMEOUT);
    }
}

function errorCallback(evt) {
    console.log('socket error', evt);
    socket = null;
    message_id = 0;

    disableElement('ctl_buttons');
    disableElement('btn_disconnect');
    enableElement('btn_connect');

    writeStatus('Error communicating with rover', MSG_TIMEOUT);
}

function messageCallback(evt) {
    console.log('message from server', evt);
    if (evt.type === 'message') {
	switch (evt.data) {
	case protocol.CMD_BEGIN_CONTROL:
	    enableElement('ctl_buttons');
	    writeStatus('Time to drive!', MSG_TIMEOUT);
	    break;
	default:
	    console.log('received unknown command from server', evt.data);
	}
    }
}

async function writeStatus(msg, timeout) {
    msgs = document.getElementById('msgs');
    msgs.innerText = msg;
    await sleep(timeout);
    msgs.innerText = '';
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

function requestControl(host, port) {
    connect(host, port, openCallback, closeCallback);
}

function cedeControl() {
    if (socket != null) {
	sendCommand(protocol.CMD_CEDE_CONTROL);
	socket.close();
    }
}

function enableElement(id) {
    document.getElementById(id).disabled = false;
}
function disableElement(id) {
    document.getElementById(id).disabled = true;
}
