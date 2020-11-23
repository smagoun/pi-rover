
let Queue = require('./queue.js');

test('Enqueues and ensures the callback is called with that item', () => {
    const item = 'my string';
    const cb = jest.fn();
    let q = new Queue(cb);
    q.enqueue(item);
    expect(cb).toBeCalledWith(item);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(q.size()).toBe(1);
});

test('Enqueues 2 items and ensures the callback is called only once', () => {
    const item = 'my string', item2 = 'my other string';
    const cb = jest.fn();
    let q = new Queue(cb);
    q.enqueue(item);
    q.enqueue(item2);
    expect(cb).toBeCalledWith(item);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(q.size()).toBe(2);
});

test('Enqueues with no callback', () => {
    const item = 'my string';
    let q = new Queue();
    q.enqueue(item);
    expect(q.size()).toBe(1);
});

test('Removes an item', () => {
    const item = 'my string';
    const cb = jest.fn();
    let q = new Queue(cb);
    q.enqueue(item);
    expect(cb).toHaveBeenCalledTimes(1);
    q.remove(item);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(q.size()).toBe(0);
});

test('Removes the first item in a multi-element queue', () => {
    const item = 'my string', item2 = 'my other string';
    const cb = jest.fn();
    let q = new Queue(cb);
    q.enqueue(item);
    q.enqueue(item2);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(item);
    q.remove(item);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(item2);
    expect(q.size()).toBe(1);
});

test('Removes the second item in a multi-element queue', () => {
    const item = 'my string', item2 = 'my other string';
    const cb = jest.fn();
    let q = new Queue(cb);
    q.enqueue(item);
    q.enqueue(item2);
    expect(cb).toHaveBeenCalledTimes(1);
    q.remove(item2);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(q.size()).toBe(1);
});

test("Tries to remove an item that doesn't exist", () => {
    const item = 'my string', item2 = 'my other string';
    const cb = jest.fn();
    let q = new Queue(cb);
    q.enqueue(item);
    expect(cb).toHaveBeenCalledTimes(1);
    q.remove(item2);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(q.size()).toBe(1);
});

test('Peeks at the head of the queue', () => {
    const item = 'my string';
    let q = new Queue();
    q.enqueue(item);
    expect(q.peek()).toBe(item);
});

test('Peeks at the head of an empty queue', () => {
    const item = 'my string';
    let q = new Queue();
    expect(q.peek()).toBeUndefined();
});
