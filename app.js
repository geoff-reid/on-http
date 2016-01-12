// Copyright 2015, EMC, Inc.
/* jshint node: true */

"use strict";

var di = require('di');

module.exports = Runner;

di.annotate(Runner, new di.Provide('app'));
di.annotate(Runner, new di.Inject(
        'Http.Server',
        'Services.Core',
        'Services.Configuration',
        'Profiles',
        'Templates',
        'fileService',
        'Promise',
        'Http.Services.SkuPack'
    )
);
function Runner(
    HttpService,
    core,
    configuration,
    profiles,
    templates,
    fileService,
    Promise,
    skuPack
) {
    var services = [];

    function start() {
        return core.start()
            .then(function() {
                return Promise.all([profiles.load(), templates.load()]);
            })
            .then(function() {
                return fileService.start({
                    defaultBackend: {
                        type: configuration.get('httpFileServiceType', 'FileSystem'),
                        root: configuration.get('httpFileServiceRoot', './static/files')
                    }
                });
            })
            .then(function() {
                return skuPack.start(configuration.get('skuPackRoot', './skupack.d'));
            })
            .then(function() {
                // var endpoints = configuration.get('httpEndpoints', [{port:8080}]);
                //for debug
                var endpoints = [
                    {
                        "address": "0.0.0.0",
                        "port": 8443,
                        "httpsEnabled": true,
                        "httpsCert": "data/dev-cert.pem",
                        "httpsKey": "data/dev-key.pem",
                        "httpsPfx": null,
                        "proxiesEnabled": false,
                        "authEnabled": true,
                        "router": "northbound-api-router"
                    },
                    {
                        "address": "172.31.128.1",
                        "port": 9080,
                        "httpsEnabled": false,
                        "proxiesEnabled": true,
                        "router": "southbound-api-router"
                    }
                ];
                return Promise.map(endpoints, function(endpoint) {
                    var service = new HttpService(endpoint);
                    services.push(service);
                    return service.start();
                });
            });
    }

    function stop() {
        return Promise.map(services, function(service) {
             service.stop();
        })
        .then(function() {
            return core.stop();
        });
    }

    return {
        start: start,
        stop: stop
    };
}
