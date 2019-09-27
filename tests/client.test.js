#!/usr/bin/env node

'use strict';

const Clerq = require('clerq');
const Client = require('../src/client');
const redis = require('redis-mock');
const Server = require('../src/server');

class TestService {
    static _name() {
        return 't';
    }

    static echo(request, reply) {
        reply(request);
    }
}

const registry = new Clerq(redis.createClient(), { expire: 5, pino: { level: 'debug' } });
const server = new Server(registry, { pino: { level: 'debug' } });
server.start();
const client = new Client(registry, { pino: { level: 'debug' } });
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
