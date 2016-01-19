// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = internalApiFactory;

di.annotate(internalApiFactory, new di.Provide('southbound-api-router'));
di.annotate(internalApiFactory, new di.Inject(
        di.Injector
    )
);

function internalApiFactory (injector) {
    var router = express.Router();
    router.endpoint = {};

    router.mount = function() {

        // Un-mount existing routes in case router.mount has
        // been call multiple times.
        this.unMountAllRouters();

        router.use(injector.get(require('./profiles')));
        router.use(injector.get(require('./files')));
        router.use(injector.get(require('./tasks')));
        router.use(injector.get(require('./templates')));
    };

    router.unMountAllRouters = function(){
        this.stack = [];
    };

    return router;
}
