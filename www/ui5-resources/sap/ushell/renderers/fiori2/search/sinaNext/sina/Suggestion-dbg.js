/* global sinaDefine */
sinaDefine(['../core/core', './ResultSetItem'], function (core, ResultSetItem) {
    "use strict";

    return ResultSetItem.derive({

        _meta: {
            properties: {
                calculationMode: {
                    required: true
                },
                label: {
                    required: true
                }
            }
        }

    });

});
