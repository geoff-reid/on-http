// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

var ws = require('ws');

describe('Http.Server', function () {
    var app, server;
    var HttpService;
    var services = [];

    var nock = require('nock');
    helper.before(function () {
        return [
            dihelper.simpleWrapper(require('express')(), 'express-app'),
            dihelper.simpleWrapper(require('swagger-express-mw'), 'swagger'),
            dihelper.simpleWrapper(ws.Server, 'WebSocketServer'),
            dihelper.simpleWrapper({}, 'Task.Services.OBM'),
            dihelper.simpleWrapper({}, 'ipmi-obm-service'),
            dihelper.requireWrapper('rimraf', 'rimraf'),
            dihelper.requireWrapper('os-tmpdir', 'osTmpdir'),
            helper.require('/lib/services/http-service'),
            helper.requireGlob('/lib/api/1.1/*.js'),
            helper.requireGlob('/lib/services/**/*.js'),
            helper.requireGlob('/lib/serializables/**/*.js')
        ];
    });

    before(function () {
        app = helper.injector.get('express-app');

        app.use('/test', function (req, res) {
            res.send('Hello World!');
        });

        // server = helper.injector.get('Http.Server');
        HttpService = helper.injector.get('Http.Server');
    });

    helper.after();

    before('allow self signed certs', function () {
       process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    });

    after('disallow self signed certs', function () {
       process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    });

    describe('http', function () {
        before('listen', function () {
            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', false)
            // can't use port 80 because it requires setuid root
                .set('httpBindPort', 8089);
            server.listen();
        });

        it('should respond to requests', function () {
            return helper.request('http://localhost:8089')
            .get('/test')
            .expect(200)
            .expect('Hello World!');
        });

        after('close', function () {
            server.close();
        });
    });

    describe('https', function () {
        before('listen', function () {
            helper.injector.get('Services.Configuration')
                .set('httpEnabled', false)
                .set('httpsEnabled', true)
                .set('httpsCert', 'data/dev-cert.pem')
                .set('httpsKey', 'data/dev-key.pem')
            // can't use port 443 because it requires setuid root
                .set('httpsBindPort', 8443);
            server.listen();
        });

        it('should respond to requests', function () {
            return helper.request('https://localhost:8443')
            .get('/test')
            .expect(200)
            .expect('Hello World!');
        });

        after('close', function () {
            server.close();
        });
    });

    describe('https with pfx', function () {
        before('listen', function () {
            helper.injector.get('Services.Configuration')
                .set('httpEndpoints', endpoints)
            //     .set('httpEnabled', false)
            //     .set('httpsEnabled', true)
            //     .set('httpsPfx', 'data/dev.pfx')
            // // can't use port 443 because it requires setuid root
            //     .set('httpsBindPort', 8444);
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
                    "routers": "northbound-api-router"
                },
                {
                    "address": "172.31.128.1",
                    "port": 9080,
                    "httpsEnabled": false,
                    "proxiesEnabled": true,
                    "routers": "southbound-api-router"
                }
            ];
            _.forEach(endpoints, function(endpoint) {
                var service = new HttpService(endpoint);
                services.push(service);
                return service.start();
            })
            // server.listen();
        });

        it('should respond to requests', function () {
            return helper.request('https://localhost:8444')
            .get('/test')
            .expect(200)
            .expect('Hello World!');
        });

        after('close', function () {
            // server.close();
            _.forEach(services, function(service) {
                service.stop();
            })
        });
    });

    it('should throw an error if http and https are both disabled', function () {
        helper.injector.get('Services.Configuration')
        .set('httpEnabled', false)
        .set('httpsEnabled', false);

        expect(function () {
            server.listen();
        }).to.throw(Error);
    });

    describe('http proxy', function () {
        before('listen', function () {
            var proxyConfig = [
                {
                    "localPath": "/local/proxy1",
                    "server": "http://test.com",
                    "remotePath": '/remote1'
                },
                {
                    "localPath": "/local/proxy2",
                    "server": "http://test.com"
                },
                {
                    "server": "http://test.com",
                    "remotePath": "/remote3"
                },
                {
                    //this is to test whether server.listen can still run without speicfy server
                    'localPath': '/local/proxy4',
                    'remotePath': '/remote4'
                },
                {
                    'server': 'http://test.com',
                    'remotePath': '/remote5',
                    'localPath': '/local/proxy5'
                }
            ];

            nock('http://test.com')
                .get('/').reply(200, 'Root Resource')
                .get('/remote1/foo/bar').reply(200, 'This is Foo Bar1!')
                .get('/remote2/foo/bar').reply(200, 'This is Foo Bar2!')
                .get('/remote3/foo/bar').reply(200, 'This is Foo Bar3!')
                .get('/remote4/foo/bar').reply(200, 'This is Foo Bar4!')
                .get('/remote5/foo/bar').reply(200, 'This is Foo Bar5!');

            app.use('/local/proxy5/foo/bar', function (req, res) {
                res.send('This is local Foo Bar5!');
            });

            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', false)
                .set('httpBindPort', 8099)
                .set('httpProxies', proxyConfig);
            server.listen();
        });

        it('should respond to remote request via proxy', function () {
            return helper.request('http://localhost:8099')
                .get('/local/proxy1/foo/bar')
                .expect(200)
                .expect('This is Foo Bar1!');
        });

        it('should proxy to remote root path if missing remotePath', function () {
            return helper.request('http://localhost:8099')
                .get('/local/proxy2/remote2/foo/bar')
                .expect(200)
                .expect('This is Foo Bar2!');
        });

        it('should proxy to local root path if missing localPath', function () {
            return helper.request('http://localhost:8099')
                .get('/foo/bar')
                .expect(200)
                .expect('This is Foo Bar3!');
        });

        it('should favor local source over proxy', function() {
            return helper.request('http://localhost:8099')
                .get('/local/proxy5/foo/bar')
                .expect('This is local Foo Bar5!');
        });

        after('close', function () {
            server.close();
            nock.restore();
            //Configuration is shared globaly
            //Should reset the configureation for other feature unit tests
            helper.injector.get('Services.Configuration')
                .set('httpProxies', []);
        });
    });
});
