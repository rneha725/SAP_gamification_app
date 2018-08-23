/* global sinaDefine */
sinaDefine(['../core/core', './SinaObject'], function (core, SinaObject) {
    "use strict";

    return SinaObject.derive({

        _meta: {
            properties: {
                type: {
                    required: true
                },
                id: {
                    required: true
                },
                label: {
                    required: true
                },
                usage: {
                    required: true
                },
                format: {
                    required: false
                },
                isSortable: {
                    required: true
                },
                isKey: {
                    required: true
                },
                isDescription: {
                    required: false
                },
                descriptionAttribute: {
                    required: false
                },
                descriptionTextArrangement: {
                    required: false
                },
                isQuantity: {
                    required: false
                },
                isUnitOfMeasure: {
                    required: false
                },
                unitOfMeasureAttribute: {
                    required: false
                },
                isPhoneNr: {
                    required: false
                },
                isEmailAddress: {
                    required: false
                },
                isCurrency: {
                    required: false
                },
                matchingStrategy: {
                    required: true
                },
                displayOrder: {
                    required: false
                }
            }
        }

    });

});
