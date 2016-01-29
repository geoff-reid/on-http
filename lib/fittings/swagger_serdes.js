'use strict'

var debug = require('debug')('swagger:serialize');
var path = require('path');
var _ = require('lodash');

module.exports = function create(fittingDef, bagpipes) {
    var swaggerNodeRunner = bagpipes.config.swaggerNodeRunner;
    var appRoot = swaggerNodeRunner.config.swagger.appRoot;
    var serdesDirs = fittingDef.serdesDirs.map(function(dir) {
        return path.resolve(appRoot, dir);
    });
    var serdesFunctionCache = {};

    return function swagger_serdes(context, next) {
        var serdesNameKey = fittingDef.serdesNameKey;
        var operation = context.request.swagger.operation;
        var serdes;

        try {
            var serdesName = operation[serdesNameKey] || operation.pathObject[serdesNameKey];
            if (!serdesName) { return next(); }
        } catch (err) {
            // serdes is optional, hand off to the next fitting if serdesName is undefined.
            return next();
        }

        if (serdesName in serdesFunctionCache) {
            serdes = serdesFunctionCache[serdesName];
        } else {
            for(var i = 0; i < serdesDirs.length; i++) {
                var serdesPath = path.resolve(serdesDirs[i], serdesName);
                try {
                    serdes = require(serdesPath);
                    serdesFunctionCache[serdesName] = serdes;
                    break;
                } catch (err) {
                    if (i === serdesDirs.length - 1) { return next(err); }
                }
            }
        }
        if (serdes) {
            var serdesFunction = serdes[operation.operationId];
            if (serdesFunction && typeof serdesFunction === 'function') {
                return serdesFunction(context.request, context.response, next);
            }
        }
        next(new Error('No serdes found for ' + serdesName));
    }
}

