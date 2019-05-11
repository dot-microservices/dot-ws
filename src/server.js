'use strict';

const exists = require('fs').existsSync;
const is = require('is_js');
const joinPath = require('path').join;
const portfinder = require('portfinder');
const readdir = require('fs').readdirSync;
const ServiceRegistry = require('clerq');
const WebSocket = require('ws');

const Base = require('./base');

/**
 * @class Server
 * @extends {Base}
 */
class Server extends Base {
    /**
     *Creates an instance of Server.
     * @param {Object} [options={}]
     * @memberof Server
     */
    constructor(options = {}) {
        super(Object.assign({ shutdown: 5000 }, options));
        this._services = {};
        this._registry = new ServiceRegistry({
            host: this.options.redis_host || '127.0.0.1',
            port: this.options.redis_port || 6379
        });
    }

    /**
     * @description Registers a service class
     * @param {Class} service
     * @throws Error
     * @memberof Server
     */
    addService(service) {
        if (is.not.function(service)) throw new Error('service must be a class');

        const name = this.fixServiceName(service);
        this._services[name] = service;
    }

    /**
     * @description Registers a list of service classes
     * @param {Array} services
     * @throws Error
     * @memberof Server
     */
    addServices(services) {
        if (is.not.array(services)) throw new Error('you must provide an array of services');

        for (let service of services) this.addService(service);
    }

    /**
     * @description Registers
     * @param {String} dir full path
     * @throws Error
     * @memberof Server
     */
    addPath(dir) {
        if (is.not.string(dir)) throw new Error('you must provide a path to service classes');
        else if (!exists(dir)) throw new Error('invalid path');

        const files = readdir(dir);
        for (let file of files)
            this.addService(require(joinPath(dir, file)));
    }

    /**
     * @description Starts server instance
     * @param {Function} cbErr callback for error only
     * @memberof Server
     */
    start(cbErr) {
        portfinder.getPortPromise({
            port: is.number(this.options.port) && this.options.port > 0 ? this.options.port : undefined
        }).then(port => {
            this.options.port = port;
            this._socket = new WebSocket.Server({ port });
            this._socket.on('connection', ws => {
                ws.on('message', message => {
                    try {
                        message = JSON.parse(message);
                    } catch (e) {
                        message = {};
                    }
                    if (is.object(message)) this._onMessage(message.p, message.d, ws);
                    else ws.send('INVALID_PATH');
                });
            });
            for (let service of Object.keys(this._services))
                this._registry.up(service, port).catch(e => {
                    if (this.options.debug) console.log(e);
                });
        }).catch(error => {
            if (is.function(cbErr)) cbErr(error);
        });
    }

    /**
     * @description Handles incoming messages to server socket
     * @throws Error
     * @access private
     * @memberof Server
     */
    _onMessage(path, payload, ws) {
        if (is.not.string(path) || is.empty(path)) return ws.send('INVALID_PATH');

        const delimiter = this.options.delimiter;
        path = path.split(is.string(delimiter) && is.not.empty(delimiter) ? delimiter : '.');

        const service = path.shift(), method = path.shift();
        if (!this._services.hasOwnProperty(service)) {
            switch (service) {
            case this.COMMAND_CLEAN_SHUTDOWN:
                return this.shutdown();
            default:
                return ws.send('INVALID_SERVICE');
            }
        } else if (!method || is.empty(method)) return ws.send('MISSING_METHOD');
        else if (method.charAt(0) === '_') return ws.send('INVALID_METHOD');
        else if (!this._services[service].hasOwnProperty(method)) return ws.send('INVALID_METHOD');
        else if (is.not.function(this._services[service][method])) return ws.send('INVALID_METHOD');

        const p = this._services[service][method](payload,
            r => ws.send(is.string(r) ? r : JSON.stringify(r)));
        if (p instanceof Promise)
            p.then(r => r !== undefined && ws.send(ws.send(is.string(r) ? r : JSON.stringify(r))))
                .catch(e => {
                    if (this.options.debug) console.log(e);
                    ws.send(e.message);
                });
    }

    /**
     * @description stops the server instance
     * @memberof Server
     */
    shutdown() {
        this._socket.close();
        const services = Object.keys(this._services);
        for (let service of services)
            this._registry.down(service, this.options.port).catch(e => {
                if (this.options.debug) console.log(e);
            });
        this._registry.stop();
        if (this.options.debug) console.log('server closed');
    }
}

module.exports = Server;
