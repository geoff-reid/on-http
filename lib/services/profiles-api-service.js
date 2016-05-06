// Copyright 2015-2016, EMC, Inc.

'use strict';

var di = require('di'),
    ejs = require('ejs');


module.exports = profileApiServiceFactory;
di.annotate(profileApiServiceFactory, new di.Provide('Http.Services.Api.Profiles'));
di.annotate(profileApiServiceFactory,
    new di.Inject(
        'Promise',
        'Http.Services.Api.Workflows',
        'Protocol.Task',
        'Protocol.Events',
        'Services.Waterline',
        'Services.Configuration',
        'Services.Lookup',
        'Logger',
        'Errors',
        '_',
        'Profiles',
        'Services.Environment'
    )
);
function profileApiServiceFactory(
    Promise,
    workflowApiService,
    taskProtocol,
    eventsProtocol,
    waterline,
    configuration,
    lookupService,
    Logger,
    Errors,
    _,
    profiles,
    Env
) {

    var logger = Logger.initialize(profileApiServiceFactory);

    function ProfileApiService() {
    }

    // Helper to convert property kargs into an ipxe friendly string.
    ProfileApiService.prototype.convertProperties = function(properties) {
        properties = properties || {};

        if (properties.hasOwnProperty('kargs')) {
            // This a promotion of the kargs property
            // for DOS disks (or linux) for saving
            // the trouble of having to write a
            // bunch of code in the EJS template.
            properties.kargs = _.map(
                properties.kargs, function (value, key) {
                return key + '=' + value;
            }).join(' ');
        } else {
            // Ensure kargs is set for rendering.
            properties.kargs = null;
        }

        return properties;
    };

    ProfileApiService.prototype.getMacs = function(macs) {
        return _.flattenDeep([macs]);
    };

    ProfileApiService.prototype.setLookup = function(query) {
        if (query.mac && query.ip) {
            return waterline.nodes.findByIdentifier(this.getMacs(query.mac))
            .then(function (node) {
                if (_.isUndefined(node)) {
                    return lookupService.setIpAddress(
                        query.ip,
                        query.mac
                    );
                }
            });
        }
        return Promise.resolve();
    };

    ProfileApiService.prototype.getNode = function(macAddresses, options) {
        var self = this;
        return waterline.nodes.findByIdentifier(macAddresses)
        .then(function (node) {
            if (node) {
                return node.discovered()
                .then(function(discovered) {
                    if (!discovered) {
                        return taskProtocol.activeTaskExists(node.id)
                        .then(function() {
                            return node;
                        })
                        .catch(function() {
                            return self.runDiscovery(node, options);
                        });
                    } else {
                        // We only count a node as having been discovered if
                        // a node document exists AND it has any catalogs
                        // associated with it
                        return node;
                    }

                });
            } else {
                return self.createNodeAndRunDiscovery(macAddresses, options);
            }
        });
    };

    ProfileApiService.prototype.runDiscovery = function(node, options) {
        var self = this;
        var configuration;

        if (node.type === 'switch') {
            configuration = self.getSwitchDiscoveryConfiguration(node, options.switchVendor);
        } else {
            configuration = {
                name: 'Graph.SKU.Discovery',
                options: {
                    defaults: {
                        graphOptions: {
                            target: node.id
                        },
                        nodeId: node.id
                    }
                }
            };
        }

        // The nested workflow holds the lock against the nodeId in this case,
        // so don't add it as a target to the outer workflow context
        return workflowApiService.createAndRunGraph(configuration, null)
        .then(function() {
            return self.waitForDiscoveryStart(node.id);
        })
        .then(function() {
            return node;
        });
    };

    ProfileApiService.prototype.getSwitchDiscoveryConfiguration = function(node, vendor) {
        var configuration = {
            name: 'Graph.SKU.Switch.Discovery.Active',
            options: {
                defaults: {
                    graphOptions: {
                        target: node.id
                    },
                    nodeId: node.id
                },
                'vendor-discovery-graph': {
                    graphName: null
                }
            }
        };

        vendor = vendor.toLowerCase();

        if (vendor === 'cisco') {
            configuration.options['vendor-discovery-graph'].graphName =
                'Graph.Switch.Discovery.Cisco.Poap';
        } else if (vendor === 'arista') {
            configuration.options['vendor-discovery-graph'].graphName =
                'Graph.Switch.Discovery.Arista.Ztp';
        } else {
            throw new Errors.BadRequestError('Unknown switch vendor ' + vendor);
        }

        return configuration;
    };

    ProfileApiService.prototype.createNodeAndRunDiscovery = function(macAddresses, options) {
        var self = this;
        var node;
        return waterline.nodes.create({
            name: macAddresses.join(','),
            identifiers: macAddresses,
            type: options.type
        })
        .then(function (_node) {
            node = _node;

            return Promise.resolve(macAddresses).each(function (macAddress) {
                return waterline.lookups.upsertNodeToMacAddress(node.id, macAddress);
            });
        })
        .then(function () {
            // Setting newRecord to true allows us to
            // render the redirect again to avoid refresh
            // of the node document and race conditions with
            // the state machine changing states.
            node.newRecord = true;

            return self.runDiscovery(node, options);
        });
    };

    // Quick and dirty extra two retries for the discovery graph, as the
    // runTaskGraph promise gets resolved before the tasks themselves are
    // necessarily started up and subscribed to bus events.
    ProfileApiService.prototype.waitForDiscoveryStart = function(nodeId) {
        var retryRequestProperties = function(error) {
            if (error instanceof Errors.RequestTimedOutError) {
                return taskProtocol.requestProperties(nodeId);
            } else {
                throw error;
            }
        };

        return taskProtocol.requestProperties(nodeId)
        .catch(retryRequestProperties)
        .catch(retryRequestProperties);
    };

    ProfileApiService.prototype._handleProfileRenderError = function(errMsg, type, status) {
        if (type === 'switch') {
            // We don't usually get error output dumped to the switch
            // startup screen, so it's not useful to do anything more
            // than return a 500 status here.
            var err = new Error(errMsg);
            err.status = status || 500;
            throw err;
        }
        return {
            profile: 'error.ipxe',
            options: { error: errMsg },
            context: undefined
        };
    };

    ProfileApiService.prototype.renderProfileFromTaskOrNode = function(node) {
        var self = this;
        var defaultProfile;

        if (node.type === 'switch') {
            // Unlike for compute nodes, we don't need to or have the capability
            // of booting into a microkernel, so just send down the
            // python script right away, and start downloading
            // and executing tasks governed by the switch-specific
            // discovery workflow.
            defaultProfile = 'taskrunner.py';
        } else {
            defaultProfile = 'redirect.ipxe';
        }

        return workflowApiService.findActiveGraphForTarget(node.id)
        .then(function (taskgraphInstance) {
            if (taskgraphInstance) {
                return taskProtocol.requestProfile(node.id)
                .catch(function(err) {
                    if (node.type === 'switch') {
                        return null;
                    } else {
                        throw err;
                    }
                })
                .then(function(profile) {
                    return [profile, taskProtocol.requestProperties(node.id)];
                })
                .spread(function (profile, properties) {
                    var _options;
                    if (node.type === 'compute') {
                        _options = self.convertProperties(properties);
                    } else if (node.type === 'switch') {
                        _options = { identifier: node.id };
                    }
                    return {
                        profile: profile || defaultProfile,
                        options: _options,
                        context: taskgraphInstance.context
                    };
                })
                .catch(function (e) {
                    logger.warning("Unable to retrieve workflow properties", {
                        error: e,
                        id: node.id,
                        taskgraphInstance: taskgraphInstance
                    });
                    return self._handleProfileRenderError(
                        'Unable to retrieve workflow properties', node.type);
                });
            } else {
                if (_.has(node, 'bootSettings')) {
                    if (_.has(node.bootSettings, 'options') &&
                            _.has(node.bootSettings, 'profile')) {
                        return {
                            profile: node.bootSettings.profile || 'redirect.ipxe',
                            options: node.bootSettings.options
                        };
                    } else {
                        return self._handleProfileRenderError(
                                'Unable to retrieve node bootSettings', node.type);
                    }
                } else {
                    return self._handleProfileRenderError(
                        'Unable to locate active workflow or there are no bootSettings',
                        node.type,
                        400
                    );
                }
            }
        });
    };

    //todo use Brian's context builder in the swagger_api_service
    ProfileApiService.prototype._buildContext = function(graphContext, res) {
        var self = this;
        var scope = res.locals.scope;
        var config = configuration.getAll();
        var baseUri = 'http://' + config.apiServerAddress + ':' + config.apiServerPort + '/api/current';
        graphContext = graphContext || {};

        return Promise.props({
            server: config.apiServerAddress || '10.1.1.1',
            port: config.apiServerPort || 80,
            ipaddress: res.locals.ipAddress,
            netmask: config.dhcpSubnetMask || '255.255.255.0',
            gateway: config.dhcpGateway || '10.1.1.1',
            macaddress: lookupService.ipAddressToMacAddress(res.locals.ipAddress),
            sku: Env.get('config', {}, [ scope[0] ]),
            env: Env.get('config', {}, scope),
            // Build structure that mimics the task renderContext
            api: {
                server: 'http://' + config.apiServerAddress + ':' + config.apiServerPort,
                base: baseUri,
                files: baseUri + '/files',
                nodes: baseUri + '/nodes'
            },
            context: graphContext,
            task: {
                nodeId: graphContext.target
            }
        });
    };

    ProfileApiService.prototype.renderProfile = function (profile, res) {
        var self = this;
        var scope = res.locals.scope;
        var options = profile.options || {};
        var status = profile.status || 200;
        var graphContext = profile.context || {};

        var promises = [
            //todo use Brian's context builder in the swagger_api_service instead of local
            self._buildContext(graphContext, res),
            profiles.get(profile.profile, true, scope)
        ];

        if (profile.profile.endsWith('.ipxe')) {
            promises.push(profiles.get('error.ipxe', true, scope));
            promises.push(profiles.get('boilerplate.ipxe', true, scope));
        } else if (profile.profile.endsWith('.zt')) {
            promises.push(profiles.get('error.zt', true, scope));
        }

        return Promise.all(promises).spread(
            function (localOptions, contents, errorPlate, boilerPlate) {
                var output = null;

                options = _.merge({}, options, localOptions);
                // Render the requested profile + options. Don't stringify undefined.
                return ejs.render((boilerPlate || '') + contents, options);
            }
        )
    };

    ProfileApiService.prototype.getProfiles = function(query) {
        var self = this;
        return this.setLookup(query)
            .then(function() {
                var macs = query.mac || query.macs;
                if (macs) {
                    var macAddresses = self.getMacs(macs);
                    var options = {
                        type: 'compute',
                    };

                    return self.getNode(macAddresses, options)
                        .then(function (node) {
                            if (node.newRecord) {
                                return { profile: 'redirect.ipxe' };
                            } else {
                                return self.renderProfileFromTaskOrNode(node, 'compute')
                                    .then(function (render) {
                                        return(render);
                                    });
                            }
                        });
                } else {
                    return { profile: 'redirect.ipxe' };
                }
            })
            .catch(function (err) {
                throw new Errors.InternalServerError(err);
            });
    };
    

    return new ProfileApiService();
}
