/* global sinaDefine */
sinaDefine(['../core/core', './ResultSet'], function (core, ResultSet) {
    "use strict";

    return ResultSet.derive({

        toString: function () {
            var result = [];
            result.push('--Facet');
            result.push(ResultSet.prototype.toString.apply(this, arguments));
            return result.join('\n');
        }

    });

});
