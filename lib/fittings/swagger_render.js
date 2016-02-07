
var injector = require('../../index.js').injector;

module.exports = function create(fittingDef, bagpipes) {
    return function swagger_render(context, next) {
        if (!context.response.headersSent) {
            var swag = injector.get('Http.Services.Swagger');
            var templateNameKey = fittingDef.templateNameKey;
            var operation = context.request.swagger.operation;
            var template = operation[templateNameKey];
            swag.renderer(template, context.response.body).then(function (renderedOutput) {
                context.response.json(renderedOutput);
            }); // TODO add error condition and unresolved promise
            //context.response.json(context.response.body);
        }
    };
}

