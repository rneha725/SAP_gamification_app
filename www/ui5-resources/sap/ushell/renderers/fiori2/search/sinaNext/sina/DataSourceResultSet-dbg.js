/* global sinaDefine */
sinaDefine(['../core/core', './FacetResultSet', './FacetType'], function (core, FacetResultSet, FacetType) {
    "use strict";

    return FacetResultSet.derive({

        type: FacetType.DataSource

    });

});
