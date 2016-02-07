// Copyright 2016, EMC, Inc.

'use strict'

var di = require('di');

module.exports = swaggerFactory;

di.annotate(swaggerFactory, new di.Provide('Http.Services.Swagger'));
di.annotate(swaggerFactory,
    new di.Inject(
            'Promise',
            '_',
            di.Injector,
            'Templates',
            'ejs'
        )
    );

function swaggerFactory(
    Promise,
    _,
    injector,
    templates,
    ejs
) {
    function swaggerController(callback) {
        return function(req, res, next) {
            return Promise.resolve().then(function() {
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
        function serialize(data) {
            return Promise.resolve().then(function() {
                return serializer.serialize(data);
            }).then(function(serialized) {
                return serializer.validateAsModel(serialized).then(function() {
                    return serialized;
                });
            });
        }      
        return function(req, res, next) {
            var serialized;
            if (_.isArray(res.body)) {
                console.log('array');
                serialized = Promise.map(res.body, function(item) {
                    return serialize(item);
                });
            } else {
                console.log('not array');
                serialized = serialize(res.body);
            }
            return serialized.then(function(validated) {
                res.body = validated;
                next();
            }).catch(function(err) {
                next(err);
            });
        }
    }

    function swaggerRenderer(templateName, data, schemaName, options) {
        var self = this;
        return templates.get(templateName, ['global'])
            .then(function(template) {
                return template.contents;
            })
            .then(function(contents) {
                var output = ejs.render(contents, data[0]); // TODO make this work for an array
                return output;

                // TODO add validation
                /*
                return self.validate(output, 'http://redfish.dmtf.org/schemas/v1/' + schemaName)
                    .then(function(result) {
                        if(result.error) {
                            throw new Error(result.error);
                        }
                        return output;
                    });
                */
            });
    };

    return {
        controller: swaggerController,
        deserializer: swaggerDeserializer,
        serializer: swaggerSerializer,
        renderer: swaggerRenderer
    };
}
