/* global sinaDefine */
sinaDefine(['../core/core', './FacetResultSetItem'], function (core, FacetResultSetItem) {
    "use strict";

    return FacetResultSetItem.derive({
        _meta: {
            properties: {
                dataSource: {
                    required: true
                }
            }
        }

    });

});
