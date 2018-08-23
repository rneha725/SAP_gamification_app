/* global sinaDefine */
sinaDefine(['../core/core', './ResultSetItem'], function (core, ResultSetItem) {
    "use strict";

    return ResultSetItem.derive({

        _meta: {
            properties: {
                dataSource: {
                    required: true
                },
                title: {
                    required: true
                },
                titleHighlighted: {
                    required: true
                },
                titleAttributes: {
                    required: true,
                    aggregation: true
                },
                detailAttributes: {
                    required: true,
                    aggregation: true
                },
                defaultNavigationTarget: {
                    required: false,
                    aggregation: true
                },
                navigationTargets: {
                    required: false,
                    aggregation: true
                }
            }
        },

        toString: function () {
            var result = [];
            result.push('--' + this.title);
            for (var i = 0; i < this.attributeAreaAttributes.length; ++i) {
                var attributeAreaAttribute = this.attributeAreaAttributes[i];
                result.push(attributeAreaAttribute.toString());
            }
            return result.join('\n');
        }

    });

});
