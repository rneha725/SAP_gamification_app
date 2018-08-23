/* global sinaDefine */
sinaDefine(['../core/core', './Suggestion', './SuggestionType'], function (core, Suggestion, SuggestionType) {
    "use strict";

    return Suggestion.derive({

        type: SuggestionType.DataSource,

        _meta: {
            properties: {
                dataSource: {
                    required: true
                }
            }
        }

    });

});
