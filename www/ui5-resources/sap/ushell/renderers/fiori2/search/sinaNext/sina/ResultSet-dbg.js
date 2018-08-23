/* global sinaDefine */
sinaDefine(['../core/core', './SinaObject'], function (core, SinaObject) {
    "use strict";

    return SinaObject.derive({

        _meta: {
            properties: {
                id: {
                    required: false,
                    default: function () {
                        return core.generateId();
                    }
                },
                title: {
                    required: true
                },
                items: {
                    required: false,
                    default: function () {
                        return [];
                    },
                    aggregation: true
                },
                query: {
                    required: true
                }
            }
        },

        toString: function () {
            var result = [];
            for (var i = 0; i < this.items.length; ++i) {
                var item = this.items[i];
                result.push(item.toString());
            }
            return result.join('\n');
        }

    });

});
