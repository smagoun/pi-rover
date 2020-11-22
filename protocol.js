
"use strict";

/** 
 * Procotol definition, shared between client and server
 *
 * The basic procotol:
 * 1. Establish a connection to the server
 * 2. Client sends CMD_REQUEST_CONTROL to request control of the rover
 * 3. Server sends CMD_BEGIN when it's ready for the client to take control (which
 *    may be some time later, if the rover is already in use)
 * 4. Client sends CMD_* commands to control the rover
 * 5. When finished, client sends CMD_CEDE_CONTROL to relinquish control of the rover
 * 
 * The client may send CMD_CEDE_CONTROL at any time, even if it hasn't received a CMD_BEGIN
 * from the server.
 *
 * The server may send CMD_END_CONTROL to the client at any time to tell the client it
 * no longer has control of the rover.
 */
// Weird constructs here are to bridge differences in browser/node
// module loading; see https://www.geeksforgeeks.org/how-to-share-code-between-node-js-and-the-browser/
(function(exports) {
    exports.PROTOCOL = 'rover-control';

    // Messages from the client to server
    exports.CMD_FWD   = 'forward';
    exports.CMD_BACK  = 'back';
    exports.CMD_LEFT  = 'left';
    exports.CMD_RIGHT = 'right';
    exports.CMD_REQUEST_CONTROL = 'request-control';
    exports.CMD_CEDE_CONTROL = 'cede-control';
    
    // Messages from the server to client
    exports.CMD_BEGIN_CONTROL = "begin-control";

    // 'protocol' is the name of the object that the browser will see
}) (typeof exports === 'undefined' ? this['protocol'] = {} : exports);
