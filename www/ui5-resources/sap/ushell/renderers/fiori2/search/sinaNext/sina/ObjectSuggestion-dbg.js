/* global sinaDefine */
sinaDefine(['../core/core', './Suggestion', './SuggestionType'], function (core, Suggestion, SuggestionType) {
    "use strict";

    return Suggestion.derive({

        type: SuggestionType.Object,

        _meta: {
            properties: {
                object: {
                    required: true,
                    aggregation: true
                }
            }
        }

    });

});
