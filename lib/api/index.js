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

function commonApiFactory (injector) {
    var router = express.Router();

    router.use(injector.get('northbound-api-router'));
    router.use(injector.get('southbound-api-router'));

    return router;
}
