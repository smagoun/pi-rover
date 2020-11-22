
"use strict"

class Queue {

    constructor() {
	this.array = [];
    }

    enqueue(item) {
	this.array.push(item);
    }

    peek() {
	return this.array[0];
    }

    size() {
	return this.array.length;
    }

    /**
     * @param {Object} item The item to remove from the queue
     * @param {function} onRemove Callback fired when an event is removed
     */
    remove(item, onRemove) {
	let index = this.array.indexOf(item);
        if (index !== -1) {
            this.array.splice(index, 1);
        }
        if (this.array.length > 0) {
	    let next = this.array[0];
	    if (onRemove !== null) {
		onRemove(next);
	    }
	}
    }
}

module.exports = Queue;
