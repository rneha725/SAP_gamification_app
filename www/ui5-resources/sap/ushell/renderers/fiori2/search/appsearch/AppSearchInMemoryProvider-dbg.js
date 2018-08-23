sap.ui.define(['sap/ushell/renderers/fiori2/search/appsearch/TileLoader'], function (TileLoader) {
    "use strict";

    var AppSearchInMemoryProvider = function () {
        this.init.apply(this, arguments);
    };

    AppSearchInMemoryProvider.prototype = {

        init: function (properties) {
            this.tileLoader = new TileLoader(properties);
        },

        search: function (query) {
            query.scope = 'allTiles';
            return this.tileLoader.search(query);
        },

        prefetchTiles: function () {
            return this.tileLoader.getTiles();
        }
    };

    return AppSearchInMemoryProvider;

});
