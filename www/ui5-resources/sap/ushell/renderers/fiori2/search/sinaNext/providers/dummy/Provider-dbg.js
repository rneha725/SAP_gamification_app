/* global sinaDefine */
sinaDefine(['../../core/core'], function (core) {
    "use strict";

    return core.defineClass({
        id: 'dummy',
        _initAsync: function (properties) {
            return Promise.resolve();
        }
    });
});
