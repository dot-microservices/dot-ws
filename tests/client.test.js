#!/usr/bin/env node

'use strict';

const Client = require('../src/client');
const Server = require('../src/server');

class TestService {
    static _name() {
        return 't';
    }

    static echo(request, reply) {
        reply(request);
    }
}

const server = new Server({});
server.start();
const client = new Client({});
server.addService(TestService);

test('service health', async done => {
    const now = Date.now();
    setTimeout(() => {
        client.send('t.echo', { now }, r => {
            expect(r.now).toBe(now);
            client.disconnect();
            server.shutdown();
            done();
        });
    }, 1000);
});
