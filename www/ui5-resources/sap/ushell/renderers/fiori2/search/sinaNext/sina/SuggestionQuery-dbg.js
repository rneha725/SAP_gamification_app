/* global sinaDefine */
sinaDefine(['../core/core', './Query', './SuggestionType', './SuggestionCalculationMode'], function (core, Query, SuggestionType, SuggestionCalculationMode) {
    "use strict";

    return Query.derive({

        _meta: {
            properties: {
                types: {
                    default: function () {
                        return [SuggestionType.DataSource, SuggestionType.Object, SuggestionType.SearchTerm];
                    },
                    setter: true
                },
                calculationModes: {
                    default: function () {
                        return [SuggestionCalculationMode.Data, SuggestionCalculationMode.History];
                    },
                    setter: true
                }
            }
        },

        _initClone: function (other) {
            this.types = other.types.slice();
            this.calculationModes = other.calculationModes.slice();
        },

        _equals: function (other) {
            return core.equals(this.types, other.types, false) &&
                core.equals(this.calculationModes, other.calculationModes, false);
        },

        _execute: function (query) {
            return this.sina.provider.executeSuggestionQuery(query);
        }

    });



});
