/* global sinaDefine */
sinaDefine(['../core/core', './SinaObject'], function (core, SinaObject) {
    "use strict";

    return SinaObject.derive({

        _meta: {
            properties: {
                fuzzy: {
                    required: false,
                    default: false
                }
            }
        }

    });

});
