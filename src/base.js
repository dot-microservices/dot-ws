'use strict';

const Clerq = require('clerq');
const is = require('is_js');
const pino = require('pino');

/**
 * @description Base class for Client and Server
 * @class Base
 */
class Base {
    /**
     * Creates an instance of Base.
     * @param {Object} options
     * @memberof Base
     */
    constructor(options) {
        this.COMMAND_CLEAN_SHUTDOWN = '#CS#';
        this.options = { delimiter: '.', debug: false };
        if (is.object(options) && is.not.array(options))
            this.options = Object.assign(this.options, options);
        this._logger = pino(Object.assign({ level: 'error' }, is.object(this.options.pino) ? this.options.pino : {}));
        this._clerq();
    }

    /**
     * @description creates a valid clerq instance for service registry and discovery
     * @memberof Base
     */
    _clerq() {
        const options = { host: this.options.redis_host || '127.0.0.1',
            port: this.options.redis_port || 6379, redis: this.options.redis };
        if (this.options.cache) options.cache = this.options.cache;
        if (this.options.delimiter) options.delimiter = this.options.delimiter;
        if (this.options.expire) options.expire = this.options.expire;
        if (this.options.prefix) options.prefix = this.options.prefix;
        if (this.options.pino) options.pino = this.options.pino;
        this._registry = new Clerq(options);
    }

    /**
     * @description Makes service name camel-case
     * @param {String} service service class
     * @access private
     * @memberof Base
     */
    fixServiceName(service) {
        if (is.function(service) && is.function(service._name)) return service._name();

        return `${ service.name.charAt(0).toLowerCase() }${ service.name.slice(1) }`;
    }
}

module.exports = Base;
