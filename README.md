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

### Server

- **debug       :** Debug mode. It's disabled by default.
- **delimiter   :** Delimiter between service and method names. It's a single dot(.) by default.
- **host        :** Binds server instance to this value. It's 0.0.0.0 by default.
- **port        :** Start point for port range. If you set server instance looks up for its port starting from this number. It's 8000 by default.
- **redis_host  :** redis hostname
- **redis_port  :** redis port

### Client

- **debug       :** Debug mode. It's disabled by default.
- **delimiter   :** Delimiter between service and method names. It must be same value in server and client instances. It's a single dot(.) by default.
- **timeout     :** Request timeout. Socket communication has auto recovery feature but in some cases you might want to have a timeout option.

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
const Server = require('dot-ws').Server;

class SampleService {
    static test(request, reply) {
        reply(request);
    }

    static async test2(request) {
        if (!request) throw new Error('invalid request');
        return request;
    }
}

const server = new Server();
server.addService(SampleService);
server.start();
```

### Example Client

```js
const Client = require('dot-ws').Client;

const client = new Client();
client.send('sampleService.test', request, response => {
    console.log(response);
});
```
