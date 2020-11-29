
const protocol = require('./protocol.js');
const gpio = require('rpi-gpio');

const PIN_MODE   = gpio.MODE_BCM;
const PIN_L_FWD  = 17;
const PIN_L_BACK = 18;
const PIN_R_FWD  = 27;
const PIN_R_BACK = 22;
const PINS = [PIN_L_FWD, PIN_L_BACK, PIN_R_FWD, PIN_R_BACK];

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

class Rover {
    /**
     * Set up the GPIOs to talk to the rover
     */
    constructor(errorCallback) {
	gpio.setMode(PIN_MODE);
	for (const pin of PINS) {
	    // Due to a bug in rpi-gpio, this can sometimes thrown an 'EACCES: permission denied' error.
	    // Bug: https://github.com/JamesBarwell/rpi-gpio.js/issues/111
	    // Patch to rpi-gpio: https://github.com/JamesBarwell/rpi-gpio.js/pull/112/files
	    gpio.setup(pin, gpio.DIR_OUT, errorCallback);
	}
	console.log('Rover connected');
    }
    
    /**
     * Sends a command to the rover
     *
     * @param {String} cmd One of the Protocol.CMD_* commands
     * @param {number} duration Duration of the command, in ms
     */
    async executeCommand(cmd, duration) {
	// TODO: Figure out event queueing so that we don't have multiple
	// commands trying to execute simultaneously.
	switch (cmd) {
	case protocol.CMD_LEFT:
	    gpio.write(PIN_L_BACK, 1);
	    gpio.write(PIN_R_FWD, 1);
	    await sleep(duration);
	    gpio.write(PIN_L_BACK, 0);
	    gpio.write(PIN_R_FWD, 0);
	    break;
	case protocol.CMD_RIGHT:
	    gpio.write(PIN_L_FWD, 1);
	    gpio.write(PIN_R_BACK, 1);
	    await sleep(duration);
	    gpio.write(PIN_L_FWD, 0);
	    gpio.write(PIN_R_BACK, 0);
	    break;
	case protocol.CMD_FWD:
	    gpio.write(PIN_L_FWD, 1);
	    gpio.write(PIN_R_FWD, 1);
	    await sleep(duration);
	    gpio.write(PIN_L_FWD, 0);
	    gpio.write(PIN_R_FWD, 0);
	    break;
	case protocol.CMD_BACK:
	    gpio.write(PIN_L_BACK, 1);
	    gpio.write(PIN_R_BACK, 1);
	    await sleep(duration);
	    gpio.write(PIN_L_BACK, 0);
	    gpio.write(PIN_R_BACK, 0);
	    break;
	default:
	    console.log('Unknown command:', cmd);
	}
    }
}

module.exports = Rover;
