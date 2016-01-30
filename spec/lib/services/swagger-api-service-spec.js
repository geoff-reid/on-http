// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('Services.Http.Swagger', function() {
    var swaggerService;
    var Promise;
    function MockSerializable() {}
    
    before('inject swagger service', function() {
        // Create mock serializable.
        MockSerializable.prototype.serialize = sinon.stub();
        MockSerializable.prototype.deserialize = sinon.stub();
        MockSerializable.prototype.validateAsModel = sinon.stub();
        MockSerializable.prototype.validatePartial = sinon.stub();
        MockSerializable.prototype.validate = sinon.stub();
        
        helper.setupInjector(_.flattenDeep([
                onHttpContext.prerequisiteInjectables,
                onHttpContext.injectables,
                dihelper.simpleWrapper(MockSerializable, 'Mock.Serializable')
            ])
        );

        swaggerService = helper.injector.get('Http.Services.Swagger');
        Promise = helper.injector.get('Promise');
    });

    describe('controller()', function() {
        var mockNext;
        var mockController;
        var controller;

        beforeEach(function() {
            mockNext = sinon.stub();
            mockController = sinon.stub();
            controller = swaggerService.controller(mockController);
        });

        it('should call controller callback', function() {
            var req = {};
            var res = {
                headersSent: false
            };
            var mockData = {data: 'mock data'};
            
            expect(controller).to.be.a('function');
            mockController.resolves(mockData);
            return controller(req, res, mockNext).then(function() {
                expect(res.body).to.equal(mockData);
                expect(mockNext).to.be.called.once;
            });
        });
        
        it('should not call next after sending headers', function() {
            var req = {};
            var res = {
                headersSent: true
            };
            var mockData = {data: 'mock data'};
            
            expect(controller).to.be.a('function');
            mockController.resolves(mockData);
            return controller(req, res, mockNext).then(function() {
                expect(mockController).to.be.called.once;
                expect(mockNext).not.to.be.called;
            });
        });
        
        it('should call next if an error occurs', function() {
            var req = {};
            var res = {
                headersSent: false 
            };
            var mockError = {message: 'mock error'};
            
            expect(controller).to.be.a('function');
            mockController.rejects(mockError);
            return controller(req, res, mockNext).then(function() {
                expect(mockController).to.be.called.once;
                expect(mockNext).to.be.calledWith(mockError);
            });
        });
    });

    describe('serializer()', function() {
        var mockNext;
        var serializer;
        
        beforeEach(function() {
            mockNext = sinon.stub();
            serializer = swaggerService.serializer('Mock.Serializable');
        });
        
        it('should serialize a scalar', function() {
            var mockData = {
                data: 'some data'
            }
            var req = {};
            var res = {
                body: mockData
            }
            MockSerializable.prototype.serialize.returnsArg(0);
            MockSerializable.prototype.validateAsModel.returnsArg(0);

            expect(serializer).to.be.a('function');
            return serializer(req, res, mockNext).then(function() {
                expect(res.body).to.equal(mockData);
            });
            
        });
        
        it('should serialize an array', function() {
            var mockData = 
            [{
                data: 'some data'
            },
            {
                data: 'some other data'
            }];
            var req = {};
            var res = {
                body: mockData
            };

            MockSerializable.prototype.serialize.returnsArg(0);
            MockSerializable.prototype.validateAsModel.returnsArg(0);

            expect(serializer).to.be.a('function');
            return serializer(req, res, mockNext).then(function() {
                expect(res.body).to.equal(mockData);
            });        
        });
    });

    describe('deserializer()', function() {
    
    });
});
