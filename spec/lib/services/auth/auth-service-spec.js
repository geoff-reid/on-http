// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var ws = require('ws');

describe('Auth.Service', function () {
    var server;
    var sandbox = sinon.sandbox.create();
    var sandbox = sinon.sandbox.create();
    var jwtStrategy = require('passport-jwt').Strategy;

    var SUCCESS_STATUS = 200;
    var BAD_REQUEST_STATUS = 400;
    var UNAUTHORIZED_STATUS = 401;
    var NOT_FOUND_STATUS = 404;
    var ERROR_STATUS = 500;

    var token = '';

    function cleanUp(){
        server.close();
        sandbox.restore();
        helper.injector.get('Services.Configuration')
            .set('httpEnabled', true)
            .set('httpsEnabled', true)
            .set('authEnabled', false)
            .set('httpBindPort', 8080)
            .set('httpsBindPort', 8443)
            .set('authPasswordHash', 'KcBN9YobNV0wdux8h0fKNqi4uoKCgGl/j8c6YGlG7iA0PB3P9ojbmANGhDlcSBE0iOTIsYsGbtSsbqP4wvsVcw==')
            .set('authPasswordSalt', 'zlxkgxjvcFwm0M8sWaGojh25qNYO8tuNWUMN4xKPH93PidwkCAvaX2JItLA3p7BSCWIzkw4GwWuezoMvKf3UXg==')
            .set('authTokenExpireIn', 86400)
    };

    helper.before(function () {
        return [
            dihelper.simpleWrapper(require('express')(), 'express-app'),
            dihelper.simpleWrapper(ws.Server, 'WebSocketServer'),
            dihelper.simpleWrapper({}, 'Task.Services.OBM'),
            dihelper.simpleWrapper({}, 'ipmi-obm-service'),
            helper.require('/lib/services/http-service'),
            helper.requireGlob('/lib/**/*.js')
        ];
    });

    before(function () {

    });

    before('start http and https server with auth enabled', function () {
        this.timeout(5000);
        server = helper.injector.get('Http.Server');

        helper.injector.get('Services.Configuration')
            .set('httpEnabled', true)
            .set('httpsEnabled', true)
            .set('authEnabled', true)
            .set('httpBindPort', 8089)
            .set('httpsBindPort', 8443);
        server.listen();
    });

    it('should return a token from /login', function () {
        return helper.request('https://localhost:8443')
            .post('/api/1.1/login')
            .send({username: "admin", password: "admin123"})
            .expect(SUCCESS_STATUS)
            .expect(function(res) {
                expect(res.body.token).to.be.a('string');
                token = res.body.token;
                console.log(SUCCESS_STATUS, res.body)
            })
    });

    it('should able to access with correct token in query string', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config?auth_token=' + token)
            .expect(SUCCESS_STATUS)
            .expect(function(res) {
                expect(res.body).to.be.a('object');
                expect(res.body.authEnabled).to.equal(true);
                console.log(SUCCESS_STATUS, 'authEnabled=' ,res.body.authEnabled)
            })
    });

    it('should fail with wrong token in query string', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config?auth_token=' + token + 'balabalabala')
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('invalid signature');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should fail with empty token in query string', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config?auth_token=')
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('No auth token');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should fail with wrong token key in query string', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config?auth_tokennnnnnnn=')
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('No auth token');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should able to access with correct token in query header', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .set("authorization", 'JWT ' + token)
            .send()
            .expect(SUCCESS_STATUS)
            .expect(function(res) {
                expect(res.body).to.be.a('object');
                expect(res.body.authEnabled).to.equal(true);
                console.log(SUCCESS_STATUS, 'authEnabled=' ,res.body.authEnabled)
            })
    });

    it('should fail with wrong token in query header', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .set("authorization", 'JWT ' + token + 'balabalabala')
            .send()
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('invalid signature');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should fail with empty token in query header', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .set("authorization", '')
            .send()
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('No auth token');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should fail with wrong token key in query header', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .set("authorization_balabalabala", '')
            .send()
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('No auth token');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should able to access with correct token in query body', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .send({auth_token: token})
            .expect(SUCCESS_STATUS)
            .expect(function(res) {
                expect(res.body).to.be.a('object');
                expect(res.body.authEnabled).to.equal(true);
                console.log(SUCCESS_STATUS, 'authEnabled=' ,res.body.authEnabled)
            })
    });

    it('should fail with wrong token in query body', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .send({auth_token: token + 'balabalabala'})
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('invalid signature');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should fail with empty token in query body', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .send({auth_token: ''})
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('No auth token');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should fail with wrong token key in query body', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .send({auth_tokennnnnnnnn: token})
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('No auth token');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    it('should fail with no token at all', function () {
        return helper.request('https://localhost:8443')
            .get('/api/1.1/config')
            .expect(UNAUTHORIZED_STATUS)
            .expect(function(res) {
                expect(res.body.message).to.be.a('string');
                expect(res.body.message).to.equal('No auth token');
                console.log(UNAUTHORIZED_STATUS ,res.body)
            })
    });

    before('allow self signed certs', function () {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    });

    helper.after();

    after('disallow self signed certs', function () {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    });

    after('Clean up', function(){
        cleanUp();
    });

    describe('Should return internal server error with auth error callback', function () {
        before('start HTTPs server', function () {
            sandbox.stub(jwtStrategy.prototype, 'authenticate', function(req, options) {
                return this.error('something');
            });
        });

        it('should fail with auth', function() {
            return helper.request('https://localhost:8443')
                .get('/api/1.1/config?auth_token=' + token)
                .expect(ERROR_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Internal server error');
                    console.log(ERROR_STATUS, res.body);
                })
        });

        after('stop server, restore mock and configure',function () {
            sandbox.restore();
            cleanUp();
        });
    });

    describe('Corrupted hash from config', function () {
        before('Mock configure settings', function () {
            this.timeout(5000);

            helper.injector.get('Services.Configuration')
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpsBindPort', 8443)
                .set('authPasswordHash', 'aaa');
        });

        it('Should throw exception with wrong length of hash from config', function() {
            var authService = helper.injector.get('Auth.Services');
            expect(function () {
                authService.init();
            }).to.throw(Error);
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });

    describe('Corrupted salt from config', function () {
        before('Mock configure settings', function () {
            this.timeout(5000);

            helper.injector.get('Services.Configuration')
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpsBindPort', 8443)
                .set('authPasswordSalt', 'aaa');
        });

        it('Should throw exception with wrong length of salt from config', function() {
            var authService = helper.injector.get('Auth.Services');
            expect(function () {
                authService.init();
            }).to.throw(Error);
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });

    describe('Token expiration from config is not a number', function () {
        before('Mock configure settings', function () {
            this.timeout(5000);

            helper.injector.get('Services.Configuration')
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpsBindPort', 8443)
                .set('authTokenExpireIn', 'aaa');
        });

        it('Should throw exception with wrong length of salt from config', function() {
            var authService = helper.injector.get('Auth.Services');
            expect(function () {
                authService.init();
            }).to.throw(Error);
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });

    describe('Token should expire as expected', function () {
        before('start http and https server with auth enabled', function () {
            this.timeout(10000);
            server = helper.injector.get('Http.Server');

            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpBindPort', 8089)
                .set('httpsBindPort', 8443)
                .set('authTokenExpireIn', 1);
            server.listen();
        });

        it('should return a token from /login', function () {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: "admin123"})
                .expect(SUCCESS_STATUS)
                .expect(function(res) {
                    expect(res.body.token).to.be.a('string');
                    token = res.body.token;
                    console.log(SUCCESS_STATUS, res.body)
                })
        });

        it('should able to access with correct token in query string', function () {
            return helper.request('https://localhost:8443')
                .get('/api/1.1/config?auth_token=' + token)
                .expect(SUCCESS_STATUS)
                .expect(function(res) {
                    expect(res.body).to.be.a('object');
                    expect(res.body.authEnabled).to.equal(true);
                    console.log(SUCCESS_STATUS, 'authEnabled=' ,res.body.authEnabled)
                })
        });

        it('Should get token expire error', function() {
            this.timeout(5000);

            var Promise = helper.injector.get('Promise');
            return Promise.delay(1000)
                .then(function(){
                    return helper.request('https://localhost:8443')
                        .get('/api/1.1/config?auth_token=' + token)
                        .expect(UNAUTHORIZED_STATUS)
                        .expect(function (res) {
                            expect(res.body.message).to.be.a('string');
                            expect(res.body.message).to.equal('jwt expired');
                            console.log(UNAUTHORIZED_STATUS, res.body);
                        });
                });
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });

    describe('Token should not expire as expected', function () {
        before('start http and https server expiration set to 1 second', function () {
            this.timeout(5000);
            server = helper.injector.get('Http.Server');

            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpBindPort', 8089)
                .set('httpsBindPort', 8443)
                .set('authTokenExpireIn', 1);
            server.listen().then(function() {
                // close server, override token expire setting and restart server
                server.close().then(function() {
                    helper.injector.get('Services.Configuration')
                        .set('authTokenExpireIn', 0);
                    server.listen();
                });
            });
        });

        it('should return a token from /login', function () {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: "admin123"})
                .expect(SUCCESS_STATUS)
                .expect(function(res) {
                    expect(res.body.token).to.be.a('string');
                    token = res.body.token;
                    console.log(SUCCESS_STATUS, res.body)
                })
        });

        it('should able to access with correct token in query string', function () {
            return helper.request('https://localhost:8443')
                .get('/api/1.1/config?auth_token=' + token)
                .expect(SUCCESS_STATUS)
                .expect(function(res) {
                    expect(res.body).to.be.a('object');
                    expect(res.body.authEnabled).to.equal(true);
                    console.log(SUCCESS_STATUS, 'authEnabled=' ,res.body.authEnabled)
                });
        });

        it('Should still able to access after certain time', function() {
            this.timeout(5000);
            var Promise = helper.injector.get('Promise');
            return Promise.delay(1000)
                .then(function(){
                    return helper.request('https://localhost:8443')
                        .get('/api/1.1/config?auth_token=' + token)
                        .expect(SUCCESS_STATUS)
                        .expect(function(res) {
                            expect(res.body).to.be.a('object');
                            expect(res.body.authEnabled).to.equal(true);
                            console.log(SUCCESS_STATUS, 'authEnabled=' ,res.body.authEnabled)
                        });
                });
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });

    describe('Should fail with crypto errors', function () {
        before('start http and https server', function () {
            this.timeout(5000);
            var crypto = helper.injector.get('crypto')
            sandbox.stub(crypto, 'pbkdf2',
                function(password, salt, interation, bytes, callback) {
                return callback('something');
            });
            server = helper.injector.get('Http.Server');
            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpBindPort', 8089)
                .set('httpsBindPort', 8443)
                .set('authTokenExpireIn', 86400);
            server.listen();
        });

        it('should fail accessing /login with internal error', function () {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: "admin123"})
                .expect(ERROR_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Internal server error');
                    console.log(ERROR_STATUS, res.body);
                })
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });

    describe('Should fail with token signature errors', function () {
        before('start http and https server', function () {
            this.timeout(5000);
            var authService = helper.injector.get('Auth.Services');
            var jwt = require('jsonwebtoken');
            sandbox.stub(authService, 'createJwtToken',function (user) {
                    var self = this;
                console.log('in jwt sign ~~~~~~~')
                    return jwt.sign({
                            user: 'test_user'
                        },
                        self.secretOrKey,
                        self.jwtSignOptions
                    );
                });
            server = helper.injector.get('Http.Server');
            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpBindPort', 8089)
                .set('httpsBindPort', 8443)
                .set('authTokenExpireIn', 86400);
            server.listen();
        });

        it('should return a token from /login', function () {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: "admin123"})
                .expect(SUCCESS_STATUS)
                .expect(function(res) {
                    expect(res.body.token).to.be.a('string');
                    token = res.body.token;
                    console.log(SUCCESS_STATUS, res.body)
                })
        });

        it('Should get token expire error', function() {
            this.timeout(5000);

            return helper.request('https://localhost:8443')
                .get('/api/1.1/config?auth_token=' + token)
                .expect(ERROR_STATUS)
                .expect(function (res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Internal server error');
                    console.log(ERROR_STATUS, res.body);
                });
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });
});
