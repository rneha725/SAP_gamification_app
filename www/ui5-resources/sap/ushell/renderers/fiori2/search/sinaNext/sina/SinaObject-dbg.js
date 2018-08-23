/* global sinaDefine */
sinaDefine(['../core/core'], function (core) {
    "use strict";

    return core.defineClass({

        _meta: {
            properties: {
                sina: {
                    required: false,
                    getter: true
                }
            }
        },

        _initClone: function (other) {
            this.sina = other.sina;
        },

        _equals: function (other) {
            return this.sina === other.sina;
        }

    });

});
