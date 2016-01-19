// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = northApiFactory;

di.annotate(northApiFactory, new di.Provide('northbound-api-router'));
di.annotate(northApiFactory, new di.Inject(
        di.Injector
    )
);

function northApiFactory (injector) {
    var router = express.Router();
    router.endpoint = {};

    router.mount = function() {

        // Un-mount existing routes in case router.mount has
        // been call multiple times.
        this.unMountAllRouters();

        if (router.endpoint.authEnabled) {
            // mount ./login only when authentication is enabled
            router.use(injector.get(require('./login')));

            var authRouter = injector.get('Http.Api.Auth');
            authRouter.init();
            router.use(authRouter.getRouter());
            // all API mounted after this will need authentication, if
            // authEnabled is set true in configure file
        }

        router.use(injector.get(require('./catalogs')));
        router.use(injector.get(require('./config')));
        router.use(injector.get(require('./files')));
        router.use(injector.get(require('./lookups')));
        router.use(injector.get(require('./nodes')));
        router.use(injector.get(require('./obms')));
        router.use(injector.get(require('./pollers')));
        router.use(injector.get(require('./profiles')));
        router.use(injector.get(require('./schemas')));
        router.use(injector.get(require('./skus')));
        router.use(injector.get(require('./templates')));
        router.use(injector.get(require('./workflows')));
        router.use(injector.get(require('./versions')));
    };

    router.unMountAllRouters = function(){
        this.stack = [];
    };

    return router;
}
