'use strict';

const exists = require('fs').existsSync;
const is = require('is_js');
const joinPath = require('path').join;
const portfinder = require('portfinder');
const readdir = require('fs').readdirSync;
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
    start(cbErr) { // ! TODO: make this async just like dot-rest
        portfinder.getPortPromise({
            port: is.number(this.options.port) && this.options.port > 0 ? this.options.port : undefined
        }).then(port => {
            this.options.port = port;
            const opt = { port };
            if (this.options.host) opt.host = this.options.host;
            this._socket = new WebSocket.Server(opt);
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
                    this._logger.error(e, `registry.up(${ service }, ${ port })`);
                });
        }).catch(e => {
            this._logger.error(e, 'port finder on start failed');
            if (is.function(cbErr)) cbErr(e);
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
        if (is.not.existy(this._services[service])) {
            switch (service) {
            case this.COMMAND_CLEAN_SHUTDOWN:
                return this.shutdown();
            default:
                return ws.send('INVALID_SERVICE');
            }
        } else if (!method || is.empty(method)) return ws.send('MISSING_METHOD');
        else if (method.charAt(0) === '_') return ws.send('INVALID_METHOD');
        else if (is.not.existy(this._services[service][method])) return ws.send('INVALID_METHOD');
        else if (is.not.function(this._services[service][method])) return ws.send('INVALID_METHOD');

        const p = this._services[service][method](payload,
            r => ws.send(is.string(r) ? r : JSON.stringify(r)));
        if (p instanceof Promise)
            p.then(r => r !== undefined && ws.send(ws.send(is.string(r) ? r : JSON.stringify(r))))
                .catch(e => {
                    this._logger.error(e, `onMessage(${ path }, ${ JSON.stringify(payload) })`);
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
            this._registry.down(service, this.options.port).catch(e =>
                this._logger.error(e, `registry.down(${ service }, ${ this.options.port })`));
        this._registry.stop();
        this._logger.info('Server.shutdown() success');
    }
}

module.exports = Server;
