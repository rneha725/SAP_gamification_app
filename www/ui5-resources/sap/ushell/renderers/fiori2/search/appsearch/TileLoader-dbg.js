sap.ui.define([
    'sap/ushell/renderers/fiori2/search/SearchHelper',
    'sap/ushell/renderers/fiori2/search/appsearch/JsSearch'
], function (SearchHelper, JsSearch) {
    "use strict";

    var TileLoader = function () {
        this.init.apply(this, arguments);
    };

    TileLoader.prototype = {

        init: function (properties) {
            this.launchPageService = sap.ushell.Container.getService("LaunchPage");
            this.optimizedAppSearch = properties.optimizedAppSearch;
            this.searchEngines = {};
        },

        getTiles: function () {

            if (this.loadDeferred) {
                return this.loadDeferred;
            }

            this.loadDeferred = this.launchPageService.getCatalogs().then(function (catalogs) {

                var catalogDeferreds = [];

                // 1) get promises for all catalogs' tiles
                for (var i = 0; i < catalogs.length; i++) {
                    catalogDeferreds.push(this.launchPageService.getCatalogTiles(catalogs[i]));
                }

                // 2) append personalized group tiles
                catalogDeferreds.push(this._getPersonalizedGroupTiles());

                // when all promises have been resolved, merge their results together
                return jQuery.when.apply(jQuery, catalogDeferreds).then(function () {

                    // split into general catalogs and personalized part
                    var args = Array.prototype.slice.call(arguments);
                    var catalogs = args.slice(0, -1);
                    var personalizedCatalogs = args.slice(-1);

                    // collect valid catalog tiles

                    var catalogTiles, catalogTileMap, personalizedTiles;

                    try {
                        catalogTiles = this._collectTiles(catalogs);
                        this._sortTiles(catalogTiles);
                        catalogTileMap = this._createTileMap(catalogTiles);

                        // collect valid personalized tiles
                        personalizedTiles = this._collectTiles(personalizedCatalogs);
                        this._sortTiles(personalizedTiles);
                        this._caculateCorrespondingCatalogTiles(personalizedTiles, catalogTiles);
                    } catch (e) {
                        return jQuery.Deferred().reject(e); // eslint-disable-line new-cap
                    }


                    // all tiles = catalog tiles + personalized tiles
                    var allTiles = [];
                    allTiles.push.apply(allTiles, catalogTiles);
                    allTiles.push.apply(allTiles, personalizedTiles);
                    allTiles = this._removeDuplicateTiles(allTiles);
                    this._sortTiles(allTiles);

                    // return tile collections
                    return {
                        catalogTiles: catalogTiles,
                        catalogTileMap: catalogTileMap,
                        personalizedTiles: personalizedTiles,
                        allTiles: allTiles
                    };

                }.bind(this));
            }.bind(this));

            return this.loadDeferred;
        },

        getSearchEngine: function (scope) {
            return this.getTiles().then(function (tiles) {
                var searchEngine = this.searchEngines[scope];
                if (searchEngine) {
                    return searchEngine;
                }
                searchEngine = new JsSearch({
                    objects: tiles[scope],
                    algorithm: {
                        id: 'contains-ranked',
                        options: [50, 49, 40, 39, 5, 4, 51]
                    },
                    fields: ['label', 'keywords']
                });
                this.searchEngines[scope] = searchEngine;
                return searchEngine;
            }.bind(this));
        },

        search: function (query) {


            return this.getSearchEngine(query.scope).then(function (searchEngine) {

                // search
                var searchResults = searchEngine.search({
                    searchFor: query.searchTerm,
                    top: query.top,
                    skip: query.skip
                });

                // format search result 
                var resultTiles = [];
                for (var i = 0; i < searchResults.results.length; ++i) {
                    var searchResult = searchResults.results[i];
                    var tile = searchResult.object;
                    var highlightedLabel = searchResult.highlighted.label;
                    resultTiles.push(this._formatTile(tile, highlightedLabel));
                }

                // return results
                return {
                    totalCount: searchResults.totalCount,
                    tiles: resultTiles
                };

            }.bind(this));

        },

        _formatTile: function (tile, highlightedLabel) {
            var resultTile = jQuery.extend({}, tile);
            if (highlightedLabel) {
                resultTile.label = highlightedLabel;
            }
            return resultTile;
        },

        _createTileMap: function (tiles) {
            var map = {};
            for (var i = 0; i < tiles.length; ++i) {
                var tile = tiles[i];
                if (!tile.tile.getChip) {
                    continue;
                }
                var chip = tile.tile.getChip();
                if (!chip) {
                    continue;
                }
                var id = chip.getId();
                map[id] = tile;
            }
            return map;
        },

        _isTileViewNeeded: function (tile) {
            if (this.optimizedAppSearch) {
                return false;
            }
            return !this.launchPageService.getCatalogTilePreviewTitle(tile);
        },

        _collectTiles: function (catalogs) {
            var tiles = [];
            var tile, tileView, title, keywords, targetURL, subTitle, size, icon;
            var factSheetTest = new RegExp('DisplayFactSheet', 'i');
            for (var i = 0; i < catalogs.length; i++) {
                var catalog = catalogs[i];
                for (var j = 0; j < catalog.length; j++) {
                    try {

                        tile = catalog[j];

                        // create tile view
                        tileView = null;
                        if (this._isTileViewNeeded(tile)) {
                            tileView = this.launchPageService.getCatalogTileView(tile);
                        }

                        // get tile properties
                        keywords = this.launchPageService.getCatalogTileKeywords(tile);
                        targetURL = this.launchPageService.getCatalogTileTargetURL(tile);
                        title = this.launchPageService.getCatalogTilePreviewTitle(tile) || this.oLpdService.getCatalogTileTitle(tile);
                        subTitle = this.launchPageService.getCatalogTilePreviewSubtitle(tile);
                        size = this.launchPageService.getCatalogTileSize(tile);
                        icon = this.launchPageService.getCatalogTilePreviewIcon(tile) || "sap-icon://business-objects-experience";

                        // destroy tile view
                        if (tileView) {
                            if (!tileView.destroy) {
                                var err = new Error('The tileview "' + title + '" with target url "' + targetURL + '" does not implement mandatory function destroy!');
                                err.name = 'Missing Impementation';
                                throw err;
                            }
                            tileView.destroy();
                        }

                        // unknown special logic: unclear whether this is needed
                        if (tile.getContract) {
                            var previewContract = tile.getContract("preview");
                            if (previewContract) {
                                previewContract.setEnabled(false);
                            }
                        }

                        // check validity
                        if (!this._isValid(tile)) {
                            continue;
                        }

                        // remove tiles without url
                        if (!targetURL) {
                            continue;
                        }

                        // remove factsheet tiles
                        if (factSheetTest.test(targetURL)) {
                            continue;
                        }

                        // assemble label
                        var label = title;
                        if (subTitle) {
                            label += ' - ' + subTitle;
                        }

                        // collect tile
                        tiles.push({
                            tile: tile,
                            keywords: (keywords instanceof Array) ? keywords.join(' ') : keywords,
                            url: targetURL,
                            label: label,
                            title: title || '',
                            subtitle: subTitle || '',
                            tooltip: title || '',
                            icon: icon,
                            size: size
                        });

                    } catch (e) {
                        jQuery.sap.log.error(e);
                        if (e.toString().indexOf('does not implement mandatory function destroy') >= 0) {
                            throw e;
                        }
                    }
                }
            }
            return tiles;
        },

        _isValid: function (tile) {
            if (this.launchPageService.isTileIntentSupported) {
                return this.launchPageService.isTileIntentSupported(tile);
            } else {
                return true;
            }
        },

        _getPersonalizedGroupTiles: function () {
            return this.launchPageService.getGroups().then(function (groups) {
                var resultTiles = [];
                for (var j = 0; j < groups.length; j++) {
                    var tiles = this.launchPageService.getGroupTiles(groups[j]) || [];
                    resultTiles.push.apply(resultTiles, tiles);
                }
                return resultTiles;
            }.bind(this));
        },

        calcKey: function (tile) {
            return tile.title + tile.url + tile.icon;
        },

        _removeDuplicateTiles: function (tiles) {
            var tileMap = {};
            var resultTiles = [];
            for (var i = 0; i < tiles.length; ++i) {
                var tile = tiles[i];
                var key = this.calcKey(tile);
                // remove duplicate tiles
                if (tileMap[key]) {
                    continue;
                }
                // append tile to result
                tileMap[key] = tile;
                resultTiles.push(tile);
            }
            return resultTiles;
        },

        _caculateCorrespondingCatalogTiles: function (personalizedTiles, catalogTiles) {
            // build index
            var map = {};
            var key;
            for (var i = 0; i < catalogTiles.length; ++i) {
                var tile = catalogTiles[i];
                key = this.calcKey(tile);
                map[key] = tile;
            }
            // calculate corresponding catalog tiles
            for (var j = 0; j < personalizedTiles.length; ++j) {
                var personalizedTile = personalizedTiles[j];
                key = this.calcKey(personalizedTile);
                personalizedTile.catalogTile = map[key];
            }
        },

        _sortTiles: function (tiles) {
            // sort by title (for primitive alphabetical ranking in result list)
            tiles.sort(function (a, b) {
                if (a.title.toUpperCase() < b.title.toUpperCase()) {
                    return -1;
                }
                if (a.title.toUpperCase() > b.title.toUpperCase()) {
                    return 1;
                }
                return 0;
            });
        }

    };

    return TileLoader;
});
