// Copyright 2015, EMC, Inc.

'use strict';

var di = require('di'),
    express = require('express');

module.exports = commonApiFactory;

di.annotate(commonApiFactory, new di.Provide('common-api-router'));
di.annotate(commonApiFactory, new di.Inject(
        di.Injector
    )
);

function commonApiFactory (
    injector
) {
    var router = express.Router();
    router.endpoint = {};

    router.mount = function() {

        // Unmount existing routes in case router.mount has
        // been call multiple times.
        this.unmount();

        if (router.endpoint.authEnabled) {
            // mount ./login only when authentication is enabled
            router.use(injector.get(require('./northbound/login')));

            var authRouter = injector.get('Http.Api.Auth');
            authRouter.init();
            router.use(authRouter.getRouter());
            // all API mounted after this will need authentication, if
            // authEnabled is set true in configure file
        }

        router.use(injector.get('northbound-api-router'));
        router.use(injector.get('southbound-api-router'));
    };

    router.unmount = function(){
        this.stack = [];
    };

    return router;
}