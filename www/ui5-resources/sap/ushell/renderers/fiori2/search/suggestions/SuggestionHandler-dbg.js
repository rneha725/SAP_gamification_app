/* global jQuery, sap, clearTimeout, setTimeout  */

sap.ui.define([
    'sap/ushell/renderers/fiori2/search/SearchHelper',
    'sap/ushell/renderers/fiori2/search/suggestions/SinaSuggestionProvider',
    'sap/ushell/renderers/fiori2/search/suggestions/AppSuggestionProvider',
    'sap/ushell/renderers/fiori2/search/suggestions/TimeMerger',
    'sap/ushell/renderers/fiori2/search/suggestions/SuggestionType'
], function (SearchHelper, SinaSuggestionProvider, AppSuggestionProvider, TimeMerger, SuggestionType) {
    "use strict";

    // =======================================================================
    // declare package
    // =======================================================================
    jQuery.sap.declare('sap.ushell.renderers.fiori2.search.suggestions.SuggestionHandler');
    var suggestions = sap.ushell.renderers.fiori2.search.suggestions;

    // =======================================================================
    // helper for buffering suggestion terms
    // =======================================================================
    var SuggestionTermBuffer = function () {
        this.init.apply(this, arguments);
    };
    SuggestionTermBuffer.prototype = {

        init: function () {
            this.terms = {};
        },

        addTerm: function (term) {
            term = term.trim().toLowerCase();
            this.terms[term] = true;
        },

        hasTerm: function (term) {
            term = term.trim().toLowerCase();
            return !!this.terms[term];
        },

        clear: function () {
            this.terms = {};
        }

    };

    // =======================================================================
    // suggestions handler
    // =======================================================================
    suggestions.SuggestionHandler = function () {
        this.init.apply(this, arguments);
    };

    suggestions.SuggestionHandler.prototype = {

        // init
        // ===================================================================
        init: function (params) {

            // members
            var that = this;
            that.model = params.model;
            that.suggestionProviders = [];
            that.suggestionTermBuffer = new SuggestionTermBuffer();

            // times
            that.keyboardRelaxationTime = 400;
            that.uiUpdateInterval = 500;
            that.uiClearOldSuggestionsTimeOut = 1000;

            // apps suggestion provider
            that.appSuggestionProvider = new AppSuggestionProvider({
                model: that.model,
                suggestionTermBuffer: that.suggestionTermBuffer
            });

            // decorator for delayed suggestion execution, make delayed 400ms
            that.doSuggestionInternal = SearchHelper.delayedExecution(that.doSuggestionInternal, that.keyboardRelaxationTime);

            // time merger for merging returning suggestions callbacks
            that.timeMerger = new TimeMerger();

        },

        // abort suggestions
        // ===================================================================
        abortSuggestions: function (clearSuggestions) {
            if (clearSuggestions === undefined || clearSuggestions === true) {
                this.model.setProperty("/suggestions", []);
            }
            if (this.clearSuggestionTimer) {
                clearTimeout(this.clearSuggestionTimer);
                this.clearSuggestionTimer = null;
            }
            this.doSuggestionInternal.abort(); // abort time delayed calls
            this.getSuggestionProviders().done(function (suggestionProviders) {
                for (var i = 0; i < suggestionProviders.length; ++i) {
                    var suggestionProvider = suggestionProviders[i];
                    suggestionProvider.abortSuggestions();
                }
            });
            this.timeMerger.abort();
        },

        // get suggestion providers dependend on server capabilities
        // ===================================================================
        getSuggestionProviders: function () {

            // check cache
            var that = this;
            if (that.suggestionProvidersDeferred) {
                return that.suggestionProvidersDeferred;
            }

            that.suggestionProvidersDeferred = that.model.initBusinessObjSearch().then(function () {

                // link to sina
                that.sinaNext = that.model.sinaNext;

                // init list of suggestion providers (app suggestions are always available)
                var suggestionProviders = [that.appSuggestionProvider];

                // if no business obj search configured -> just use app suggestion provider
                if (!that.model.config.searchBusinessObjects) {
                    return jQuery.when(suggestionProviders);
                }

                // create sina suggestion providers
                suggestionProviders.push.apply(suggestionProviders, that.createSinaSuggestionProviders());
                return jQuery.when(suggestionProviders);
            });

            return that.suggestionProvidersDeferred;
        },

        // create sina suggestion providers
        // ===================================================================
        createSinaSuggestionProviders: function () {

            // provider configuration
            var providerConfigurations = [{
                    suggestionTypes: [SuggestionType.SearchTermHistory]
                }, {
                    suggestionTypes: [SuggestionType.SearchTermData]
                }, {
                    suggestionTypes: [SuggestionType.DataSource]
                }
                /*, {
                                suggestionTypes: [SuggestionType.Object]
                            }*/
            ];

            // create suggestion providers
            var suggestionProviders = [];
            for (var k = 0; k < providerConfigurations.length; ++k) {
                var providerConfiguration = providerConfigurations[k];
                suggestionProviders.push(new SinaSuggestionProvider({
                    model: this.model,
                    sinaNext: this.sinaNext,
                    suggestionTermBuffer: this.suggestionTermBuffer,
                    suggestionTypes: providerConfiguration.suggestionTypes
                }));
            }

            return suggestionProviders;
        },

        // check if suggestions are visible
        // ===================================================================
        isSuggestionPopupVisible: function () {
            return jQuery('.searchSuggestion').filter(':visible').length > 0;
        },

        // do suggestions
        // ===================================================================
        doSuggestion: function (filter) {
            var that = this;
            if (this.isSuggestionPopupVisible()) {
                // 1. smooth update : old suggestions are cleared when new suggestion call returns
                this.abortSuggestions(false);
                // in case suggestion call needs to long:
                // clear old suggestions after 1sec
                this.clearSuggestionTimer = setTimeout(function () {
                    that.clearSuggestionTimer = null;
                    that.model.setProperty("/suggestions", []);
                }, that.uiClearOldSuggestionsTimeOut);
            } else {
                // 2. hard update : clear old suggestions immediately
                this.abortSuggestions();
            }
            this.doSuggestionInternal(filter); // time delayed
        },

        // do suggestion internal
        // ===================================================================
        doSuggestionInternal: function (filter) {
            /* eslint no-loop-func:0 */

            // don't suggest if there is no search term
            var that = this;
            var suggestionTerm = that.model.getProperty("/uiFilter/searchTerm");
            if (suggestionTerm.length === 0) {
                return;
            }

            // no suggestions for *
            if (suggestionTerm.trim() === '*') {
                return;
            }

            // log suggestion request
            that.model.eventLogger.logEvent({
                type: that.model.eventLogger.SUGGESTION_REQUEST,
                suggestionTerm: that.model.getProperty('/uiFilter/searchTerm'),
                dataSourceKey: that.model.getProperty('/uiFilter/dataSource').id
            });

            // clear suggestion term buffer
            that.suggestionTermBuffer.clear();

            // get suggestion providers
            that.getSuggestionProviders().done(function (suggestionProviders) {

                // get suggestion promises from all providers
                var promises = [];
                var first = true;
                var pending = suggestionProviders.length;
                for (var i = 0; i < suggestionProviders.length; ++i) {
                    var suggestionProvider = suggestionProviders[i];
                    promises.push(suggestionProvider.getSuggestions(filter));
                }

                // process suggestions using time merger
                // (merge returning suggestion callbacks happening within a time slot
                // in order to reduce number of UI updates)
                that.timeMerger.abort();
                that.timeMerger = new TimeMerger(promises, that.uiUpdateInterval);
                that.timeMerger.process(function (results) {
                    pending -= results.length;
                    var suggestions = [];
                    for (var j = 0; j < results.length; ++j) {
                        var result = results[j];
                        suggestions.push.apply(suggestions, result);
                    }
                    if (pending > 0 && suggestions.length === 0) {
                        return; // empty result -> return and don't update (flicker) suggestions on UI
                    }
                    if (that.clearSuggestionTimer) {
                        clearTimeout(that.clearSuggestionTimer);
                        that.clearSuggestionTimer = null;
                    }
                    that.insertSuggestions(suggestions, first);
                    first = false;
                });

            });

        },

        // insert suggestions
        // ===================================================================
        insertSuggestions: function (insertSuggestions, flagReplace) {
            var suggestions = this.model.getProperty('/suggestions');
            if (flagReplace) {
                suggestions = [];
            }
            var groups = this._groupByPosition(insertSuggestions);
            for (var position in groups) {
                var group = groups[position];
                this._insertSuggestions(suggestions, group);
            }

            // set width of suggestion drop-down
            var input = sap.ui.getCore().byId('searchFieldInShell-input');
            var inputWidth = input.getDomRef().getBoundingClientRect().width / 16;
            inputWidth += 2;
            if (inputWidth < 20) {
                inputWidth = 35;
            }
            input.setMaxSuggestionWidth((inputWidth * 16) + 'px');

            this.model.setProperty('/suggestions', suggestions);
        },

        // group suggestions by position
        // ===================================================================
        _groupByPosition: function (suggestions) {
            var groups = {};
            for (var i = 0; i < suggestions.length; ++i) {
                var suggestion = suggestions[i];
                var group = groups[suggestion.position];
                if (!group) {
                    group = [];
                    groups[suggestion.position] = group;
                }
                group.push(suggestion);
            }
            return groups;
        },

        // insert suggestions (with identical position)
        // ===================================================================
        _insertSuggestions: function (suggestions, insertSuggestions) {

            // get first suggestion to be inserted
            if (insertSuggestions.length <= 0) {
                return;
            }
            var insertSuggestion = insertSuggestions[0];

            // find insertion index
            var index = 0;
            for (; index < suggestions.length; ++index) {
                var suggestion = suggestions[index];
                if (suggestion.position > insertSuggestion.position) {
                    break;
                }
            }

            // insert
            var spliceArgs = [index, 0];
            spliceArgs.push.apply(spliceArgs, insertSuggestions);
            suggestions.splice.apply(suggestions, spliceArgs);

        }

    };

    return suggestions.SuggestionHandler;
});
