'use strict';

const is = require('is_js');

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
    }

    /**
     * @description Makes service name camel-case
     * @param {String} service service class
     * @access private
     * @memberof Base
     */
    fixServiceName(service) {
        if (service.hasOwnProperty('_name') && is.function(service._name)) return service._name();

        return `${ service.name.charAt(0).toLowerCase() }${ service.name.slice(1) }`;
    }
}

module.exports = Base;
