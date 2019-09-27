'use strict';

const is = require('is_js');
const pino = require('pino');

/**
 * @description Base class for Client and Server
 * @class Base
 */
class Base {
    /**
     * Creates an instance of Base.
     * @param {Object} clerq Clerq instance
     * @param {Object} options
     * @memberof Base
     */
    constructor(clerq, options) {
        this.COMMAND_CLEAN_SHUTDOWN = '#CS#';
        this.options = { delimiter: '.', debug: false };
        if (is.object(options) && is.not.array(options))
            this.options = Object.assign(this.options, options);
        this._logger = pino(Object.assign({ level: 'error' }, is.object(this.options.pino) ? this.options.pino : {}));
        this._registry = clerq;
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
