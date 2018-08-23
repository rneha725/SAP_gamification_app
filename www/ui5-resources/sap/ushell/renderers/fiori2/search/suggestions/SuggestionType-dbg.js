/* global jQuery, sap, window */

sap.ui.define([], function () {
    "use strict";

    // =======================================================================
    // declare package
    // =======================================================================
    jQuery.sap.declare('sap.ushell.renderers.fiori2.search.suggestions.SuggestionTypeProps');
    var module = sap.ushell.renderers.fiori2.search.suggestions.SuggestionTypeProps = {};

    // =======================================================================
    // constants for suggestion types
    // =======================================================================
    module.App = 'App';
    module.DataSource = 'DataSource';
    module.SearchTermHistory = 'SearchTermHistory';
    module.SearchTermData = 'SearchTermData';
    module.Object = 'Object';

    // =======================================================================
    // list of all suggestion types
    // =======================================================================
    module.types = [module.App, module.DataSource, module.SearchTermHistory, module.SearchTermData, module.Object];

    // =======================================================================
    // properties of suggestion types
    // =======================================================================
    module.properties = {
        App: {
            position: 20, // TODO sinaNext check values
            limitDsAll: 3,
            limitDsApps: 7
        },
        DataSource: {
            position: 10,
            limit: 2
        },
        SearchTermHistory: {
            position: 30,
            limit: 3
        },
        SearchTermData: {
            position: 40,
            limit: 7
        },
        Object: {
            position: 25,
            limit: 3
        }
    };

    return module;
});
