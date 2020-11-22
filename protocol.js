
"use strict";

//
// Procotol definition, shared between client and server
//
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
    exports.CMD_BEGIN = "begin";

    // 'protocol' is the name of the object that the browser will see
}) (typeof exports === 'undefined' ? this['protocol'] = {} : exports);
