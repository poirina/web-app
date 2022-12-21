# EndPoint

EndPoint is a schema-validated waterfall.

### What does an endpoint look like?

```
var EndPoint = require('api-endpoint'),
    Joi = EndPoint.Joi;

var myEndpoint = EndPoint.create({
    headers: Joi.object(), // Headers validator

    payload: Joi.object(), // Payload validator

    query: Joi.object(), // Query string validator

    params: Joi.object(), // URL string validator

    response: Joi.object(), // Response validator

    validateOptions: { // optional JOI validation options
        abortEarly: false,
        stripUnknown: true
    },

    filters: [ // An array of work to perform
        function findUser(data, next) {
            next(err || null, data);
        },
        function createTask(data, next) {
            next(err || null, data);
        }
    ]
});

module.exports = endpoint;
```

### How do I run my endpoint?

```
myEndpoint.run(data, function(err, data) {
    console.log(err, data); // `data` is the final object scoped to the outgoing schema
})
```

### How do I deal with errors?

Your endpoint is a waterfall. If any of your `filters` error, your endpoint will run its callback function with the error you provide (`data` will be `null`).
