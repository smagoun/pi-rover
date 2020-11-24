
const Queue = require('./queue.js');

/**
 * Controller that uses a Queue to control access to a limited resource.
 * 
 * Callers can register as wanting control of the resource. When it's their
 * turn, they will be notified and can begin to send messages to the resource.
 * The broker passes messages to the resource, ensuring that the resource only
 * accepts messages from the object in control of the resource.
 */
class Broker {

    /**
     * Create a new Broker for the given resource.
     *
     * @param {*} resource The resource that needs limited access
     * @param {function} commandProcessor Function to be called when a command
     *     is sent to the resource. The first two parameters are the resource and the command.
     * @param {function} notifyCallback Function to call when an object in the queue is
     *     notified that it can take control of the resource. The first parameter is the 
     *     object being given control.
     */
    constructor(resource, commandProcessor, notifyCallback) {
	this.resource = resource;
	this.commandProcessor = commandProcessor;
	// Queue of clients that want control/access to the resources
	this.control_queue = new Queue(notifyCallback);
    }

    /**
     * Register an object as wanting access to the limited resource.
     * If the object is first in line, it will be notified that it has control
     * of the resource.
     *
     * @param {Object} obj Object that wants to take control of the resource
     */
    register(obj) {
	this.control_queue.enqueue(obj);
    }

    /**
     * Call this when the object no longer wants access to the limited resource.
     * If the object is currently in control of the resource, the next object
     * in the queue will be notified that it now has control.
     *
     * @param {Object} obj Object that no longer wants to control the resource
     */
    unregister(obj) {
	this.control_queue.remove(obj);
    }
    
    /**
     * Pass a command to the limited resource. Validates that the caller has
     * control of the resource before passing along the command.
     *
     * @param {*} cmd Command to pass to the resource
     * @param {*} obj Object that wants the resource to execute the command
     */
    passCommand(cmd, obj) {
	if (cmd == undefined || obj == undefined) {
	    console.log('malformed command:', cmd, obj);
	    return;
	}
	// Only take input from the object that has control
	const active_obj = this.control_queue.peek();
	if (active_obj !== obj) {
	    console.log('Ignoring command from client not in control');
	    return;
	}
	this.commandProcessor(this.resource, cmd);
    }
}

module.exports = Broker;
