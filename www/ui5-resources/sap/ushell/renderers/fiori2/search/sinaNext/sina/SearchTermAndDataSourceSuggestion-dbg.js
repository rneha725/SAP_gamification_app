/* global sinaDefine */
sinaDefine(['../core/core', './SearchTermSuggestion', './SuggestionType'], function (core, SearchTermSuggestion, SuggestionType) {
    "use strict";

    return SearchTermSuggestion.derive({

        type: SuggestionType.SearchTermAndDataSource,

        _meta: {
            properties: {
                dataSource: {
                    required: true
                }
            }
        }

    });

});
