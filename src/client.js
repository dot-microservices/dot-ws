'use strict';

const is = require('is_js');
const ServiceRegistry = require('clerq');
const WebSocket = require('ws');

const Base = require('./base');

/**
 * @class Client
 * @extends {Base}
 */
class Client extends Base {
    /**
     *Creates an instance of Client.
     * @param {Object} [options={}]
     * @memberof Client
     */
    constructor(options={}) {
        super(options);
        this._registry = new ServiceRegistry({
            host: this.options.redis_host || '127.0.0.1',
            port: this.options.redis_port || 6379
        });
    }

    /**
     * @description Sends a request
     * @param {String} path service call
     * @param {Any} payload data
     * @param {Function} cb callback
     * @memberof Client
     */
    send(path, payload, cb) {
        if (is.not.function(cb)) cb = function() {};
        if (is.not.string(path) || is.empty(path))
            return cb(new Error('INVALID_PATH'));

        const delimiter = this.options.delimiter;
        const timeout = this.options.timeout, useTimeout = is.number(timeout) && timeout > 0;
        const service = path.split(is.string(delimiter) && is.not.empty(delimiter) ? delimiter : '.');
        if (service.length < 2) return cb(new Error('MISSING_METHOD'));
        else if (!service[1].trim().length || service[1].charAt(0) === '_')
            return cb(new Error('INVALID_METHOD'));

        this._registry.get(service[0])
            .then(s => {
                if (s) {
                    let t_o = null, socket = null;
                    try {
                        if (useTimeout)
                            t_o = setTimeout(() => {
                                t_o = undefined;
                                if (socket) socket.close();
                                cb(new Error('REQUEST_TIMEOUT'));
                            }, timeout);
                        socket = new WebSocket(`ws://${ s }`);
                        socket.on('open', () => socket.send(JSON.stringify({ p: path, d: payload })));
                        socket.on('message', response => {
                            socket.close();
                            if (is.not.undefined(t_o)) {
                                try {
                                    response = JSON.parse(response);
                                } catch (e) {
                                    response = is.string(response) && is.not.empty(response) ?
                                        response.trim() : 'INVALID_RESPONSE';
                                }
                                if (t_o) clearTimeout(t_o);
                                if (is.existy(response) && is.not.string(response)) cb(response);
                                else cb(is.empty(response) ? new Error('INVALID_RESPONSE') : new Error(response));
                            }
                        });
                    } catch(e) {
                        if (this.options.debug) console.log(e);
                        if (t_o) clearTimeout();
                        if (socket) socket.close();
                        cb(e);
                    }
                } else cb(new Error('INVALID_SERVICE'));
            }).catch(e => {
                if (this.options.debug) console.log(e);
                cb(new Error('INVALID_SERVICE'));
            });
    }

    /**
     * @description Closes client sockets
     * @memberof Client
     */
    disconnect() {
        this._registry.stop();
    }
}

module.exports = Client;
