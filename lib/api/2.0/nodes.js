'use strict'

var debug = require('debug')('geoff');

var injector = require('../../../index').injector;
var controller = injector.get('Http.Services.Swagger').controller;
var waterline = injector.get('Services.Waterline');

var nodesGet = controller(function(req, res) {
    debug('running get nodes controller');
    return waterline.nodes.find(req.query); // todo replace with service
});

module.exports = {
    nodesGet: nodesGet
};
