var Generator = require('generate-js'),
    Joi = require('joi'),
    async = require('async');

function TRY_CATCH(func, request, options, callback) {
    try {
        if (func.length === 3) {
            func.call(null, request, options, callback);
        } else if (func.length === 2) {
            func.call(null, request, callback);
        } else if (func.length === 1) {
            func.call(null, callback);
        } else {
            func.call(null);
            async.setImmediate(function () {
                callback();
            });
        }
    } catch (err) {
        console.error(err.stack);
        callback(err);
    }
}

function downcaseKeys(obj) {
    var newObj = {};

    for (var key in obj) {
        newObj[key.toLowerCase()] = obj[key];
    }

    return newObj;
}

function validate(key, request, next) {
    var _ = this;

    var result = Joi.validate(request[key], _[key], _.validateOptions);

    request[key] = result.value;

    next(result.error || null);
}

var EndPoint = Generator.generate(function EndPoint(options) {
    var _ = this;

    if (typeof options.formatResponse !== 'function') {
        options.formatResponse = function formatResponse(err, request, options, done) {
            if (err) console.error(err);
            done(err, request.response);
        }
    }

    if (typeof options.debug === 'undefined') options.debug = false;

    _.defineProperties(options);

    _.defineProperties({
        validateHeaders: function (request, done) {
            validate.call(_, 'headers', request, done);
        },
        validatePayload: function (request, done) {
            validate.call(_, 'payload', request, done);
        },
        validateQuery: function (request, done) {
            validate.call(_, 'query', request, done);
        },
        validateParams: function (request, done) {
            validate.call(_, 'params', request, done);
        },
        validateResponse: function (request, done) {
            validate.call(_, 'response', request, done);
        }
    });
});

EndPoint.Joi = Joi;

EndPoint.definePrototype({
    headers:   Joi.object().allow(null),
    payload:   Joi.object().allow(null),
    query:     Joi.object().allow(null),
    params:    Joi.object().allow(null),

    response:  Joi.object().allow(null),

    validateOptions: {
        abortEarly: false,
        stripUnknown: true
    },

    run: function run(request, done) {
        var _ = this,
            filters = [
                _.validateHeaders,
                _.validatePayload,
                _.validateQuery,
                _.validateParams
            ],
            cleaners = [],
            options = {};

        request.response = {};
        request.headers = downcaseKeys(request.headers);

        for (var i = 0; i < _.filters.length; i++) {
            filters.push(_.filters[i]);
        }

        filters.push(_.validateResponse);

        async.eachSeries(
            filters,
            function iterator(item, next) {
                var func = item;

                if (item && typeof item === 'object') {
                    func = item.run;

                    if (item.cleanup instanceof Function) {
                        cleaners.push(item.cleanup);
                    }
                }

                _.debug && console.log('FILTER: ' + func.name, request);

                TRY_CATCH(func, request, options, next);
            },
            function callback(err) {
                _.debug && console.log('OUT: ', request);
                _.debug && err && console.log('ERROR: ');
                _.debug && err && console.error(err.stack);

                if (err) {
                    async.eachSeries(
                        cleaners,
                        function iterator(item, next) {
                            var func = item;

                            _.debug && console.log('CLEANER: ' + func.name, request);

                            TRY_CATCH(func, request, options, next);
                        },
                        function callback(cleaning_err) {
                            _.debug && console.log('CLEANED: ', request);
                            _.debug && cleaning_err && console.log('CLEANING-ERROR: ');
                            _.debug && cleaning_err && console.error(cleaning_err.stack);
                            _.formatResponse(err, request, options, done);
                        }
                    );
                } else {
                    _.formatResponse(null, request, options, done);
                }
            }
        );
    }
});

module.exports = EndPoint;
