
"use strict";

let socket = null;

// Counter for messages we send
let message_id = 0;

/** Length of time to display a status message to the user, in ms */
const STATUS_MSG_TIMEOUT = 3000;

/**
 * Time in ms between messages we send to the server. Should be a little longer than the
 * longest DUR_* variables in index.js to avoid spamming the rover with commands.
 */
const SEND_INTERVAL = 1100;

/** Timer used to send multiple messages to the server on press-and-hold */
let send_timer;


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
 * Bind EventListeners to the control buttons. Enables us to have press-and-hold
 * support for easier driving.
 */
function bindListeners() {
    for (let btn of document.querySelectorAll('.ctl_button')) {
	let cmd = btn.value;
	btn.addEventListener("mousedown", function(e) { onPress(e, cmd) }, false);
	btn.addEventListener("mouseup", onRelease, false);
	btn.addEventListener("mouseleave", onRelease, false);
	btn.addEventListener("touchstart", function(e) { onPress(e, cmd) }, false);
	btn.addEventListener("touchend", onRelease, false);
    }
}

/**
 * Sends arrow key events as commands to the rover.
 *
 * @param {Event} evt
 */
function keyPressListener(evt) {
    let cmd = undefined;
    switch (evt.key) {
    case 'ArrowDown':
	cmd = 'back';
	break;
    case 'ArrowUp':
	cmd = 'forward';
	break;
    case 'ArrowLeft':
	cmd = 'left';
	break;
    case 'ArrowRight':
	cmd = 'right';
	break;
    default:
	break;
    }
    if (cmd !== undefined) {
	onPress(evt, cmd);
    }
}

/**
 * Stops the key-repeat timer for sending events to the rover
 */
function keyReleaseListener(evt) {
    onRelease(evt);
}

/**
 * Handle a button press from the web page. Continues to fire events
 * as long as the button is pressed. Call onRelease() to stop the events. 
 *
 * @param {Event} evt
 * @param {String} cmd One of the CMD_* commands
 */
function onPress(evt, cmd) {
    evt.preventDefault();  // Cancel propagation. Ensures we don't get double events (touch+mouse) on mobile
    sendCommand(cmd);
    clearInterval(send_timer);  // Just in case...
    send_timer = setInterval(sendCommand, SEND_INTERVAL, cmd);
}

/**
 * Call when a button is released to stop the events being fired by the button.
 */
function onRelease() {
    clearInterval(send_timer);
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

    window.removeEventListener("keydown", keyPressListener);
    window.removeEventListener("keyup", keyReleaseListener);
    
    if (evt.code != 1000) {  // 1000 is 'Normal closure'. See WebSockets API: CloseEvent
	writeStatus('The server closed the connection', STATUS_MSG_TIMEOUT);
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

    window.removeEventListener("keydown", keyPressListener);
    window.removeEventListener("keyup", keyReleaseListener);

    writeStatus('Error communicating with rover', STATUS_MSG_TIMEOUT);
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
	    window.addEventListener("keydown", keyPressListener, false);
	    window.addEventListener("keyup", keyReleaseListener, false);
	    writeStatus('Time to drive!', STATUS_MSG_TIMEOUT);
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
