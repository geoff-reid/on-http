// Copyright 2016, EMC Inc.

'use strict';

var injector = require('../../../index.js').injector;
var controller = injector.get('Http.Services.Swagger').controller;
var profileApiService = injector.get('Http.Services.Api.Profiles');
var presenter = injector.get('common-api-presenter');
var Errors = injector.get('Errors');
var _ = injector.get('_');    // jshint ignore:line

/**
 * @api {get} /api/2.0/profiles GET /
 * @apiVersion 2.0.0
 * @apiParam {query} macs List of valid MAC addresses to lookup
 * @apiParam {query} mac When macs parameter is not passed,
 *                       passed with IP adds MAC address to lookup
 * @apiParam {query} ip When macs parameters is not passed,
 *                      passed with MAC adds IP address to lookup
 * @apiDescription used internally by the system -- will NOT get a list of all profiles,
 *                 look at api/current/profiles/library
 * @apiName profiles-get
 * @apiGroup profiles
 */

var profilesGet = controller(function(req, res) {
    return profileApiService.getProfiles(req.swagger.query)
        .then (function(render) {
            var data;
            return profileApiService.renderProfile(render, res);

        })

});

module.exports = {
    profilesGet: profilesGet
}
