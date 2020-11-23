
"use strict"

/**
 * Lightweight wrapper for arrays to provide queue-like functionalty.
 * Uniquely this has the ability to identify when there is a new item
 * at the head of the queue, which makes it useful for managing access to
 * a restricted resource.
 */
class Queue {

    /**
     * Create a new queue
     *
     * @param {function} onNewHead Function called whenever a new
     *     item reaches the head of the queue. First parameter is the
     *     new item at the head of the queue.
     */
    constructor(onNewHead) {
	this.array = [];
	this.onNewHead = onNewHead;
    }

    /**
     * Add an item to the end of the queue
     *
     * @param {*} item
     */
    enqueue(item) {
	this.array.push(item);
	if (this.array.length === 1 && this.onNewHead != undefined) {
	    this.onNewHead(item);
	}
    }

    /**
     * Return the first item in the queue
     *
     * @returns {*} The first item in the queue
     */
    peek() {
	return this.array[0];
    }

    /**
     * Return the number of items in the queue
     *
     * @returns {number} Number of items in the queue
     */
    size() {
	return this.array.length;
    }

    /**
     * Remove the given item from the queue. If an item was removed, calls
     * the callback with the next item in the queue.
     *
     * @param {Object} item The item to remove from the queue
     */
    remove(item) {
	let index = this.array.indexOf(item);
        if (index !== -1) {
            this.array.splice(index, 1);
        }
	// Did the head of the queue change?
        if (index == 0 && this.array.length > 0) {
	    let next = this.array[0];
	    if (this.onNewHead != undefined) {
		this.onNewHead(next);
	    }
	}
    }
}

module.exports = Queue;
