/* global sinaDefine */
sinaDefine(['../../core/core', '../../core/ajax'], function (core, ajax) {
    "use strict";

    var module = {};

    module.Exception = core.Exception.derive({
        _init: function (properties) {
            core.Exception.prototype._init.apply(this, [properties]);
        }
    });

    var addErrorHandlingDecorator = function (originalFunction) {
        return function () {
            return originalFunction.apply(this, arguments).then(function (response) {
                return response; // just forward success response
            }.bind(this), function (error) {
                if (!(error instanceof ajax.Exception)) {
                    return core.Promise.reject(error); // just forward error response
                }
                return parseError(error);
            }.bind(this));
        };
    };

    var parseError = function (error) {
        try {

            var parsedError = JSON.parse(error.responseText);

            var message = [];
            if (parsedError && parsedError.error && parsedError.error.code) {
                message.push(parsedError.error.code);
            }
            if (parsedError && parsedError.error && parsedError.error.message && parsedError.error.message.value) {
                message.push(parsedError.error.message.value);
            }
            if (message.length === 0) {
                return core.Promise.reject(error);
            }

            return core.Promise.reject(new module.Exception({
                message: message.join('\n'),
                previous: error
            }));

        } catch (e) {
            return core.Promise.reject(error);
        }
    };

    module.createAjaxClient = function () {
        var client = new ajax.Client({
            csrf: true,
            requestNormalization: function (payload) {
                if (payload === null) {
                    return {};
                }
                if (payload.Events !== undefined) {
                    return {
                        "NotToRecord": true
                    };
                }
                delete payload.SessionID;
                delete payload.SessionTimestamp;
                if (payload.d && payload.d.QueryOptions) {
                    delete payload.d.QueryOptions.ClientSessionID;
                    delete payload.d.QueryOptions.ClientCallTimestamp;
                    delete payload.d.QueryOptions.ClientServiceName;
                    delete payload.d.QueryOptions.ClientLastExecutionID;
                }
                return payload;
            }
            //csrfByPassCache: true
        });
        client.postJson = addErrorHandlingDecorator(client.postJson);
        client.getJson = addErrorHandlingDecorator(client.getJson);
        client.mergeJson = addErrorHandlingDecorator(client.mergeJson);
        return client;
    };

    return module;

});
