// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview The Unified Shell's search service which provides Enterprise Search via SINA.
 *
 * @version 1.56.5
 */
/* global jQuery,sap */
sap.ui.define(["jquery.sap.global",'sap/ushell/renderers/fiori2/search/appsearch/AppSearchInMemoryProvider', 'sap/ushell/renderers/fiori2/search/appsearch/AppSearchEsProvider'], function ($ ,AppSearchInMemoryProvider, AppSearchEsProvider) {
    "use strict";
    /* eslint valid-jsdoc:0 */

    function Search (oAdapter, oContainerInterface) {
        this.init.apply(this, arguments);
    }

    Search.prototype = {

        init: function (oAdapter, oContainerInterface, sParameter, oServiceProperties) {

            this.oAdapter = oAdapter;
            this.oContainerInterface = oContainerInterface;
            this.oLpdService = sap.ushell.Container.getService("LaunchPage");

            // create app search providers
            var appSearchProviderProperties = { optimizedAppSearch: false };
            if (oServiceProperties && oServiceProperties.config && oServiceProperties.config.optimizedAppSearch !== undefined) {
                appSearchProviderProperties.optimizedAppSearch = oServiceProperties.config.optimizedAppSearch;
            }
            this.appSearchInMemoryProvider = new AppSearchInMemoryProvider(appSearchProviderProperties);
            this.appSearchEsProvider = new AppSearchEsProvider(appSearchProviderProperties);
        },

        isSearchAvailable: function () {
            return this.oAdapter.isSearchAvailable();
        },

        getSina: function () {
            return this.oAdapter.getSina();
        },

        prefetchTiles: function () {
            return this.getAppSearchProvider().then(function (appSearchProvider) {
                return appSearchProvider.prefetchTiles();
            });
        },

        getUrlParameter: function (name, url) {
            if (!url) url = window.location.href;
            name = name.replace(/[\[\]]/g, "\\$&");
            var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                results = regex.exec(url);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        },

        getAppSearchProvider: function () {
            // check cache
            if (this.appSearchProviderDeferred) {
                return this.appSearchProviderDeferred;
            }
            // 1. check url parameter
            this.appSearchProviderDeferred = new $.Deferred();
            var appSearchProvider = this.getUrlParameter('appSearchProvider');
            if (appSearchProvider) {
                switch (appSearchProvider) {
                    case 'es':
                        this.appSearchProviderDeferred.resolve(this.appSearchEsProvider);
                        break;
                    case 'memory':
                        this.appSearchProviderDeferred.resolve(this.appSearchInMemoryProvider);
                        break;
                    default:
                        this.appSearchProviderDeferred.resolve(this.appSearchInMemoryProvider);
                }
                return this.appSearchProviderDeferred;
            }
            // 2. autodetermination of service
            this.appSearchEsProvider.isActive().then(function (isActive) {
                isActive = false;
                if (isActive) {
                    this.appSearchProviderDeferred.resolve(this.appSearchEsProvider);
                } else {
                    this.appSearchProviderDeferred.resolve(this.appSearchInMemoryProvider);
                }
            }.bind(this));
            return this.appSearchProviderDeferred;
        },

        queryApplications: function (query) {
            query.top = query.top || 10;
            query.skip = query.skip || 0;
            return this.getAppSearchProvider().then(function (appSearchProvider) {
                return appSearchProvider.search(query);
            }.bind(this)).then(function (searchResult) {
                return {
                    totalResults: searchResult.totalCount,
                    searchTerm: query.searchTerm,
                    getElements: function () {
                        return searchResult.tiles;
                    }
                };
            }.bind(this));
        },

        /**
         * Search all catalog tiles by their Semantic Object - Action pair
         * The given callback is called on success. This does not touch the respective search adapters.
         *
         * @param {array} aSemObjects
         *     an array of semantic object + action objects
         * @param {function} resultCallback
         *     the callback that will be called
         * @public
         */
        queryApplicationsByTarget: function (aSemObjects, resultCallback) {
            this._getCatalogTiles().done(function (aCatalogTileDescriptions) {
                var aResults = [];
                // loop through Semantic Objects, thus result is in same order as input SOs
                for (var j = 0, jL = aSemObjects && aSemObjects.length || 0; j < jL; j++) {
                    var oSemO = aSemObjects[j],
                        oURLParsingSrvc = sap.ushell.Container.getService("URLParsing");
                    for (var i = 0; i < aCatalogTileDescriptions.length; i++) {
                        var oTarget = oURLParsingSrvc.parseShellHash(aCatalogTileDescriptions[i].url);
                        if (oTarget && (oTarget.semanticObject === oSemO.semanticObject) && (oTarget.action === oSemO.action)) {
                            aResults.push(aCatalogTileDescriptions[i]);
                            // only take first match
                            break;
                        }
                    }
                }
                resultCallback(aResults);
            });
        }
    };


    Search.hasNoAdapter = false;
    return Search;

}, true /* bExport */);
