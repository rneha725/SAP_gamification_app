/* global $ */
/* add * for suggestion query 
 */
sap.ui.define([
    'sap/ushell/renderers/fiori2/search/SearchModel',
    'sap/ushell/renderers/fiori2/search/SearchHelper',
    'sap/ushell/renderers/fiori2/search/appsearch/TileLoader'
], function (SearchModel, SearchHelper, TileLoader) {
    "use strict";

    var AppSearchEsProvider = function () {
        this.init.apply(this, arguments);
    };

    AppSearchEsProvider.prototype = {

        init: function (properties) {
            this.searchModel = sap.ushell.renderers.fiori2.search.getModelSingleton();
            this.tileLoader = new TileLoader(properties);
        },

        delayedInit: function () {
            if (this.delayedInitDeferred) {
                return this.delayedInitDeferred;
            }
            this.delayedInitDeferred = this.tileLoader.getTiles().then(function (tiles) {
                this.tiles = tiles;
            }.bind(this));
            return this.delayedInitDeferred;
        },

        isActive: function () {
            return this.searchModel.initBusinessObjSearch().then(function () {
                //return false;
                if (this.searchModel.config.searchBusinessObjects) {
                    return true;
                } else {
                    return false;
                }
            }.bind(this));
        },

        prefetchTiles: function () {
            return this.tileLoader.getTiles();
        },

        search: function (query) {
            return this.delayedInit().then(function () {

                // assemble search queries for personalized tiles and catalog tiles
                var personalizedTilesQuery = $.extend({}, query);
                var catalogTilesQuery = $.extend({}, query);
                if (query.suggestion) {
                    // for suggestions: 
                    // - no totalcount calculation necessary
                    // - load top+skip results
                    // - skip=0 necessary because we need to merge the personalized tiles and catalog tiles
                    //   according to their ranking
                    personalizedTilesQuery.top = query.top + query.skip;
                    personalizedTilesQuery.skip = 0;
                    catalogTilesQuery.top = query.top + query.skip;
                    catalogTilesQuery.skip = 0;
                } else {
                    // search mode (no suggestions).
                    // total count needs to be caluclated -> just load all results and then count
                    personalizedTilesQuery.top = 1000000;
                    personalizedTilesQuery.skip = 0;
                    catalogTilesQuery.top = 1000000;
                    catalogTilesQuery.skip = 0;
                }

                // fire the queries
                return $.when(this.searchPersonalizedTiles(personalizedTilesQuery), this.searchCatalogTiles(catalogTilesQuery))
                    .then(function (personalizedTiles, catalogTiles) {
                        // merge the query result sets
                        return this.mergeTiles(query, personalizedTiles.tiles, catalogTiles.tiles);
                    }.bind(this));

            }.bind(this));
        },

        mergeTiles: function (query, personalizedTiles, catalogTiles) {
            var resultTiles = [];
            var map = {};
            var tile, key;

            // personalized tiles
            for (var i = 0; i < personalizedTiles.length; ++i) {
                tile = personalizedTiles[i];
                key = this.tileLoader.calcKey(tile);
                map[key] = true;
                resultTiles.push(tile);
            }

            // catalog tiles
            for (var j = 0; j < catalogTiles.length; ++j) {
                tile = catalogTiles[j];
                key = this.tileLoader.calcKey(tile);
                if (map[key]) {
                    continue;
                }
                resultTiles.push(tile);
            }

            // total count
            var totalCount = resultTiles.length;

            // cut window defined by top and skip
            resultTiles = resultTiles.slice(query.skip, query.top + query.skip);

            return {
                totalCount: totalCount,
                tiles: resultTiles
            };
        },

        searchPersonalizedTiles: function (query) {
            query.scope = 'personalizedTiles';
            return this.tileLoader.search(query);
        },

        getSystemId: function () {
            var dataSources = this.searchModel.sinaNext.getBusinessObjectDataSources();
            var dataSource = dataSources[0];
            return dataSource.id.slice(0, 3);
        },

        getAppDataSource: function () {

            // check cache
            if (this.appDataSource) {
                return this.appDataSource;
            }

            // check sina cache
            var systemId = this.getSystemId();
            var dataSourceId = systemId + 'ALL~ESH_APD_MODEL_V~';
            this.appDataSource = this.searchModel.sinaNext.getDataSource(dataSourceId);
            if (this.appDataSource) {
                return this.appDataSource;
            }

            // create datasource
            this.appDataSource = this.searchModel.sinaNext._createDataSource({
                id: dataSourceId,
                label: 'Apps',
                labelPlural: 'Apps',
                hidden: true,
                type: this.searchModel.sinaNext.DataSourceType.BusinessObject,
                attributesMetadata: [{
                        "type": "String",
                        "id": "APP_GUID_NA",
                        "label": "App GUID",
                        "usage": {
                            "Title": {
                                "displayOrder": 0
                            },
                            "Detail": {
                                "displayOrder": 0
                            }
                        },
                        "isSortable": true,
                        "isKey": true,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "APP_ID",
                        "label": "App ID",
                        "usage": {
                            "Title": {
                                "displayOrder": 1
                            },
                            "Detail": {
                                "displayOrder": 1
                            }
                        },
                        "isSortable": true,
                        "isKey": false,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "CATALOG_ID",
                        "label": "Catalog ID",
                        "usage": {
                            "Title": {
                                "displayOrder": 2
                            },
                            "Detail": {
                                "displayOrder": 2
                            }
                        },
                        "isSortable": true,
                        "isKey": false,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "ICON",
                        "label": "Icon",
                        "usage": {
                            "Detail": {
                                "displayOrder": 4
                            }
                        },
                        "isSortable": true,
                        "isKey": false,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "TITLE",
                        "label": "Title",
                        "usage": {
                            "Detail": {
                                "displayOrder": 5
                            }
                        },
                        "isSortable": true,
                        "isKey": false,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "SUBTITLE",
                        "label": "Subtitle",
                        "usage": {
                            "Detail": {
                                "displayOrder": 6
                            }
                        },
                        "isSortable": true,
                        "isKey": false,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "TILE_INFORMATION",
                        "label": "Title Information",
                        "usage": {
                            "Detail": {
                                "displayOrder": 7
                            }
                        },
                        "isSortable": true,
                        "isKey": false,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "KEYWORDS",
                        "label": "Tile Keywords",
                        "usage": {
                            "Title": {
                                "displayOrder": 3
                            },
                            "Detail": {
                                "displayOrder": 3
                            }
                        },
                        "isSortable": true,
                        "isKey": false,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "MANDT",
                        "label": "",
                        "usage": {},
                        "isSortable": false,
                        "isKey": true,
                        "matchingStrategy": "Exact"
                    },
                    {
                        "type": "String",
                        "id": "TEXT_SPRAS",
                        "label": "Language Key",
                        "usage": {},
                        "isSortable": true,
                        "isKey": false,
                        "matchingStrategy": "Exact"
                    }
                ]
            });
            return this.appDataSource;
        },

        searchCatalogTiles: function (query) {

            // assemble search query
            var appDataSource = this.getAppDataSource();
            var searchQuery = this.searchModel.sinaNext.createSearchQuery({
                dataSource: appDataSource,
                searchTerm: query.searchTerm,
                top: query.top,
                skip: query.skip
            });

            // fire query
            return SearchHelper.convertPromiseTojQueryDeferred(searchQuery.getResultSetAsync()).then(function (resultSet) {
                var searchResult = [];
                // format results
                for (var i = 0; i < resultSet.items.length; ++i) {
                    var item = resultSet.items[i];
                    var id = item.detailAttributes[1].value;
                    var tile = this.tiles.catalogTileMap[id];
                    if (!tile) {
                        continue;
                    }
                    searchResult.push(tile);
                }
                return {
                    totalCount: searchResult.length,
                    tiles: searchResult
                };
            }.bind(this));

        }
    };

    return AppSearchEsProvider;

});
