/* global sinaDefine */
sinaDefine(['../core/core', './FacetQuery'], function (core, FacetQuery) {
    "use strict";

    return FacetQuery.derive({

        _meta: {
            properties: {
                dataSource: {
                    required: true
                }
            }
        }

    });

});
