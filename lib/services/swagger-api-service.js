// Copyright 2016, EMC, Inc.

'use strict'

var di = require('di');

module.exports = swaggerFactory;

di.annotate(swaggerFactory, new di.Provide('Http.Services.Swagger'));
di.annotate(swaggerFactory,
    new di.Inject(
            'Promise',
            '_',
            di.Injector
        )
    );

function swaggerFactory(
    Promise,
    _,
    injector
) {
    function swaggerController(callback) {
        return function(req, res, next) {
            Promise.resolve().then(function() {
                return callback(req, res);
            }).then(function(result) {
                if (!res.headersSent) {
                    res.body = result;
                    next();
                }
            }).catch(function(err) {
                next(err);
            });
        };
    }

    function swaggerDeserializer(injectableDeserializer) {
        var Deserializer = injector.get(injectableDeserializer);
        var deserializer = new Deserializer();
        // todo assert type
        return function(req, res, next) {
            return Promise.resolve().then(function() {
                // validate here or somewhere else?
                if (req.method === 'PATCH') {
                    return deserializer.validatePartial(req.body);
                }
                return deserializer.validate(req.body);
            }).then(function() {
                req.body = deserializer.deserialize(req.body);
                next();
            }).catch(function(err) {
                next(err);
            });
        };
    }

    function swaggerSerializer(injectableSerializer) {
        var Serializer = injector.get(injectableSerializer);
        var serializer = new Serializer();
        // todo assert type
        return function(req, res, next) {
            return Promise.resolve().then(function() {
                return serializer.serialize(res.body);
            }).then(function(serialized) {
                //todo validation?
                //res.body = serializer.validateAsModel(serialized).then(function() {
                //    return serialized;
                //});
                res.body = serialized;
                next();
            }).catch(function(err) {
                next(err);
            });
        }
    }

    //todo validation methods?

    return {
        controller: swaggerController,
        deserializer: swaggerDeserializer,
        serializer: swaggerSerializer
    };
}
