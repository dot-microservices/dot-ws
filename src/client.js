'use strict';

const is = require('is_js');
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
                                if (is.existy(response) && is.not.string(response)) {
                                    this._logger.info({ path, payload, response }, 'success');
                                    cb(response);
                                } else {
                                    const res = is.empty(response) ? new Error('INVALID_RESPONSE') : new Error(response);
                                    this._logger.error(res, `send(${ path }, ${ JSON.stringify(payload) })`);
                                    cb(res);
                                }
                            }
                        });
                    } catch(e) {
                        if (t_o) clearTimeout();
                        if (socket) socket.close();
                        this._logger.error(e, `send(${ path }, ${ JSON.stringify(payload) })`);
                        cb(e);
                    }
                } else cb(new Error('INVALID_SERVICE'));
            }).catch(e => {
                this._logger.error(e, `send(${ path }, ${ JSON.stringify(payload) })`);
                cb(new Error('INVALID_SERVICE'));
            });
    }

    /**
     * @description Closes client sockets
     * @memberof Client
     */
    disconnect() {
        this._registry.stop();
        this._logger.info('Client.disconnect() success');
    }
}

module.exports = Client;
