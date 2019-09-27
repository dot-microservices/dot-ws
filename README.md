# dot-ws

**dot-ws** is a minimalist toolkit for building fast, scalable and fault tolerant microservices.

## Install

```bash
npm i --save dot-ws
```

You can also clone this repository and make use of it yourself.

```bash
git clone https://github.com/Dvs-Bilisim/dot-ws.git
cd dot-ws
npm i
npm test
```

## Configuration

- **host        :** binds server instance to this value. it's 0.0.0.0 by default.
- **pino        :** options for pino logger. it's { "level": "error" } by default.
- **port        :** start point for port assignment. it's 8000 by default.
- **timeout     :** request timeout.
                    socket communication has auto recovery feature but in some cases you might want to have a timeout option.

### Error Types

To have a better understanding on error types, there are a few more things to explain.
A service is the name of your *Service* class in camel-case form and each static function in that class is called method.
On client-side, you need to concatenate service name and method with delimiter as *path*. Default delimiter is a single dot(.).
You can configure that by *delimeter* parameter.

- **INVALID_METHOD      :** Requested method doesn't exist in your service class
- **INVALID_PATH        :** Path parameter is not a valid string
- **INVALID_RESPONSE    :** Service sent an invalid response back
- **INVALID_SERVICE     :** Requested service doesn't exist
- **LOCKED              :** Clean shutdown on progress
- **MISSING_METHOD      :** Method is not a valid string
- **REQUEST_TIMEOUT     :** Request sent via socket but no response in allowed amount of time
- **SERVICE_TIMEOUT     :** No service found to send the request in allowed amount of time

### Example Server

```js
const Clerq = require('clerq');
const Server = require('dot-ws').Server;
const IORedis = require('ioredis');

class SampleService {
    static test(request, reply) {
        reply(request);
    }

    static async test2(request) {
        if (!request) throw new Error('invalid request');
        return request;
    }
}

const registry = new Clerq(new IORedis(), { expire: 5, pino: { level: 'error' } });
const server = new Server(registry);
server.addService(SampleService);
server.start();
```

### Example Client

```js
const Clerq = require('clerq');
const Client = require('dot-ws').Client;
const IORedis = require('ioredis');

const registry = new Clerq(new IORedis(), { expire: 5, pino: { level: 'error' } });
const client = new Client(registry);
client.send('sampleService.test', request, response => {
    console.log(response);
});
```
