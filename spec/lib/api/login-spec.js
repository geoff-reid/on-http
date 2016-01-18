// Copyright 2016, EMC, Inc.
/* jshint node:true */

'use strict';

var ws = require('ws');

describe('Http.Api.Login', function () {
    var server;
    var sandbox = sinon.sandbox.create();
    var localStrategy = require('passport-local').Strategy;

    var SUCCESS_STATUS = 200;
    var BAD_REQUEST_STATUS = 400;
    var UNAUTHORIZED_STATUS = 401;
    var NOT_FOUND_STATUS = 404;
    var ERROR_STATUS = 500;

    function cleanUp(){
        server.close();
        sandbox.restore();
        helper.injector.get('Services.Configuration')
            .set('httpEnabled', true)
            .set('httpsEnabled', true)
            .set('authEnabled', false)
            .set('httpBindPort', 8080)
            .set('httpsBindPort', 8443)
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
        server = helper.injector.get('Http.Server');
    });

    helper.after();

    before('allow self signed certs', function () {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    });

    after('disallow self signed certs', function () {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    });

    describe('test with authentication enabled', function () {
        before('start HTTPs server', function () {
            this.timeout(5000);
            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpBindPort', 8089)
                .set('httpsBindPort', 8443);
            server.listen();
        });

        it('should return a token with correct credential in request body', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: "admin123"})
                .expect(SUCCESS_STATUS)
                .expect(function(res) {
                    expect(res.body.token).to.be.a('string');
                    console.log(SUCCESS_STATUS, res.body);
                })
        });

        it('should fail with wrong username in request body', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "balabalabala", password: "admin123"})
                .expect(UNAUTHORIZED_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Invalid username or password');
                    console.log(UNAUTHORIZED_STATUS, res.body);
                })
        });

        it('should fail with wrong password in request body', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: "balabalabala"})
                .expect(UNAUTHORIZED_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Invalid username or password');
                    console.log(UNAUTHORIZED_STATUS, res.body);
                })
        });

        it('should fail with empty username in request body', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "", password: "admin123"})
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        it('should fail with empty password in request body', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: ""})
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        it('should fail with no username key in request body', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({password: "admin123"})
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        it('should fail with no password key in request body', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin"})
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        it('should return a token with correct credential in query string', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login?username=admin&password=admin123')
                .send()
                .expect(SUCCESS_STATUS)
                .expect(function(res) {
                    expect(res.body.token).to.be.a('string');
                    console.log(SUCCESS_STATUS, res.body);
                })
        });

        it('should fail with wrong username in query string', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login?username=balabalabala&password=admin123')
                .send()
                .expect(UNAUTHORIZED_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Invalid username or password');
                    console.log(UNAUTHORIZED_STATUS, res.body);
                })
        });

        it('should fail with wrong password in query string', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login?username=admin&password=balabalabala')
                .send()
                .expect(UNAUTHORIZED_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Invalid username or password');
                    console.log(UNAUTHORIZED_STATUS, res.body);
                })
        });

        it('should fail with empty username in query string', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login?username=&password=admin123')
                .send()
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        it('should fail with empty password in query string', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login?username=admin&password=')
                .send()
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        it('should fail with no username parameter in query string', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login?password=admin123')
                .send()
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        it('should fail with no password parameter in query string', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login?username=admin')
                .send()
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        //passport-local middleware we choose does not support authentication
        // with credential in the header. Following test will fail if auth header
        // is supported in the future, thus people will get alerted.
        it('should fail with credential in request header', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .set('username', 'admin')
                .set('password', 'admin123')
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        it('should fail no credential at all - https', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        //give a shoot on http instead of https.
        it('should success auth with http instead of https', function() {
            return helper.request('http://localhost:8089')
                .post('/api/1.1/login')
                .send({username: "admin", password: "admin123"})
                .expect(SUCCESS_STATUS)
                .expect(function(res) {
                    expect(res.body.token).to.be.a('string');
                    console.log(SUCCESS_STATUS, res.body);
                })
        });

        it('should fail no credential at all - http', function() {
            return helper.request('http://localhost:8089')
                .post('/api/1.1/login')
                .expect(BAD_REQUEST_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Missing credentials');
                    console.log(BAD_REQUEST_STATUS, res.body);
                })
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });

    describe('test with authentication disabled', function () {
        before('start HTTPs server', function () {
            this.timeout(5000);
            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', true)
                .set('authEnabled', false)
                .set('httpBindPort', 8089)
                .set('httpsBindPort', 8443);
            server.listen();
        });

        it('should fail with auth disabled', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: "admin123"})
                .expect(NOT_FOUND_STATUS)
                .expect(function(res) {
                    console.log(NOT_FOUND_STATUS, res.body);
                })
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });

    describe('Should return internal server error with auth error callback', function () {
        before('start HTTPs server', function () {
            this.timeout(5000);
            sandbox.stub(localStrategy.prototype, 'authenticate', function(req, options) {
                return this.error('something');
            });
            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpBindPort', 8089)
                .set('httpsBindPort', 8443);
            server.listen();
        });

        it('should fail with auth', function() {
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

    describe('Should fail with exceptional error message', function () {
        before('start HTTPs server', function () {
            this.timeout(5000);
            sandbox.stub(localStrategy.prototype, 'authenticate', function(req, options) {
                return this.fail({message: 'Some other message'});
            });
            helper.injector.get('Services.Configuration')
                .set('httpEnabled', true)
                .set('httpsEnabled', true)
                .set('authEnabled', true)
                .set('httpBindPort', 8089)
                .set('httpsBindPort', 8443);
            server.listen();
        });

        it('should fail with auth', function() {
            return helper.request('https://localhost:8443')
                .post('/api/1.1/login')
                .send({username: "admin", password: "admin123"})
                .expect(UNAUTHORIZED_STATUS)
                .expect(function(res) {
                    expect(res.body.message).to.be.a('string');
                    expect(res.body.message).to.equal('Some other message');
                    console.log(UNAUTHORIZED_STATUS, res.body);
                })
        });

        after('stop server, restore mock and configure',function () {
            cleanUp();
        });
    });
});

