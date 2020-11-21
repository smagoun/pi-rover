
"use strict";

let socket = null;

// Identifier provided by the server
let client_id = 0;

// Counter for messages we send
let message_id = 0;

function connect(host, port, callback) {
    if (socket != null) {
	if (socket.readyState != WebSocket.CLOSED) {
	    socket.close();
	    // TODO: Should only continue when we get the onclose event
	    socket = null;
	    message_id = 0;
	}
    }
    // TOOD: Support wss too
    const url = `ws://${host}:${port}`;
    console.log(`connecting socket to ${url}`);
    socket = new WebSocket(url, 'rover-control');
    socket.onopen = function() {
	console.log(`socket opened`);
	callback();
    }
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

function takeControl(host, port) {
    connect(host, port, function (evt) {
	enableElement('ctl_buttons');
	disableElement('btn_connect');
	enableElement('btn_disconnect');
	sendCommand('take_control');
    });
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
	// TODO: Should only continue when we get the onclose event
	socket = null;
	message_id = 0;
    }
    disableElement('ctl_buttons');
    disableElement('btn_disconnect');
    enableElement('btn_connect');
}
