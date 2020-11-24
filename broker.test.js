
let Broker = require('./broker.js');

test('Adds one caller', () => {
    const resource = 'valuable resource';
    const cmdProc = jest.fn();
    const notifyCb = jest.fn();
    const b = new Broker(resource, cmdProc, notifyCb);
    const caller1 = 'c1';

    b.register(caller1);
    expect(notifyCb).toBeCalledWith(caller1);
});

test('Adds 2 callers', () => {
    const resource = 'valuable resource';
    const cmdProc = jest.fn();
    const notifyCb = jest.fn();
    const b = new Broker(resource, cmdProc, notifyCb);
    const caller1 = 'c1';
    const caller2 = 'c2';

    b.register(caller1);
    b.register(caller2);
    expect(notifyCb).toBeCalledWith(caller1);
    expect(notifyCb).toHaveBeenCalledTimes(1);
});

test('Sends a command', () => {
    const resource = 'valuable resource';
    const cmdProc = jest.fn();
    const notifyCb = jest.fn();
    const b = new Broker(resource, cmdProc, notifyCb);
    const caller1 = 'c1';
    const cmd = 'command';

    b.register(caller1);
    b.passCommand(cmd, caller1);
    expect(cmdProc).toBeCalledWith(resource, cmd);
    expect(cmdProc).toHaveBeenCalledTimes(1);
});

test('Sends a command from object without control', () => {
    const resource = 'valuable resource';
    const cmdProc = jest.fn();
    const notifyCb = jest.fn();
    const b = new Broker(resource, cmdProc, notifyCb);
    const caller1 = 'c1';
    const caller2 = 'c2';
    const cmd = 'command';

    b.register(caller1);
    b.register(caller2);
    b.passCommand(cmd, caller2);
    expect(cmdProc).toHaveBeenCalledTimes(0);
});
