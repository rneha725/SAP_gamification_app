/* global sinaDefine */
sinaDefine(['../core/core', './SinaObject'], function (core, SinaObject) {
    "use strict";

    return SinaObject.derive({

        _meta: {
            properties: {
                id: {
                    required: true
                },
                label: {
                    required: true
                },
                value: {
                    required: true
                },
                valueFormatted: {
                    required: true
                },
                valueHighlighted: {
                    required: true
                },
                isHighlighted: {
                    required: true
                },
                unitOfMeasure: {
                    required: false
                },
                description: {
                    required: false
                },
                defaultNavigationTarget: {
                    required: false,
                    aggregation: true
                },
                navigationTargets: {
                    required: false,
                    aggregation: true
                },
                metadata: {
                    required: true
                }
            }
        },

        toString: function () {
            return this.label + ':' + this.valueFormatted;
        }

    });

});
