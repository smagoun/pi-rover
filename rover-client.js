
"use strict";

let socket = null;

// Counter for messages we send
let message_id = 0;

// Message timeout, in ms
const MSG_TIMEOUT = 3000;

/**
 * Open a connection to the WebSocker server
 *
 * @param {String} host Hostname to connect to
 * @param {number} port Port to connect to
 */
function connect(host, port) {
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

/**
 * Send a command to the server. Requires that the socket is already open.
 *
 * @param {String} cmd One of CMD_*
 */
function sendCommand(cmd) {
    if (socket == null) {
	console.log(`Unable to send message, socket is null`);
	return;
    }
    let state = socket.readyState;
    if (socket.readyState !== WebSocket.OPEN) {
	console.log(`Unable to send message, socket not ready (state is ${state})`);
	return;
    }
    let msg = {
	message_id: message_id,
	command: cmd,
	date: Date.now(),
    };
    console.log(`sending command: ${JSON.stringify(msg)}`);
    socket.send(JSON.stringify(msg));
    message_id++;
}

/**
 * Handle a button press from the web page
 *
 * @param {String} cmd One of the CMD_* commands
 * @param {element} element DOM element of the button that was clicked
 */
function buttonPress(cmd, element) {
    console.log(`${cmd} button pressed`);
    sendCommand(cmd);
}

/**
 * Callback function for socket open events
 *
 * @param {Event} evt 
 */
function openCallback(evt) {
    console.log('socket opened', evt);
    disableElement('btn_connect');
    enableElement('btn_disconnect');
    sendCommand(protocol.CMD_REQUEST_CONTROL);
}

/**
 * Callback function for socket close events. Reverts the UI to its original state
 *
 * @param {Event} evt 
 */
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

/**
 * Callback function for socket errors
 *
 * @param {Event} evt 
 */
function errorCallback(evt) {
    console.log('socket error', evt);
    socket = null;
    message_id = 0;

    disableElement('ctl_buttons');
    disableElement('btn_disconnect');
    enableElement('btn_connect');

    writeStatus('Error communicating with rover', MSG_TIMEOUT);
}

/**
 * Callback function for messages received from the server
 *
 * @param {Event} evt 
 */
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

/**
 * Write a status message to the UI
 *
 * @param {String} msg Message to be written
 * @param {number} timeout Length of time to display the message, in ms
 */
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

/**
 * Open a connection to the server and request control of the rover
 *
 * @param {String} host Hostname to connect to
 * @param {number} port Port to connect to
 */
function requestControl(host, port) {
    connect(host, port);
}

/**
 * Tell the server we no longer want to control the rover
 */
function cedeControl() {
    if (socket != null) {
	sendCommand(protocol.CMD_CEDE_CONTROL);
	socket.close();
    }
}

/**
 * Mark an element as enabled
 *
 * @param {String} id ID of a DOM element
 */
function enableElement(id) {
    document.getElementById(id).disabled = false;
}

/**
 * Mark an element as disabled
 *
 * @param {String} id ID of a DOM element
 */
function disableElement(id) {
    document.getElementById(id).disabled = true;
}
