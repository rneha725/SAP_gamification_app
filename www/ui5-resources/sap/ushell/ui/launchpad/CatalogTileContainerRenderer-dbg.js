// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/*global jQuery, sap*/

sap.ui.define(['sap/ui/core/Renderer', './TileContainerRenderer'],
	function(Renderer, TileContainerRenderer) {
	"use strict";

    /**
     * @name CatalogTileContainer renderer.
     * @static
     * @private
     */
    var CatalogTileContainerRenderer = Renderer.extend(TileContainerRenderer);

    return CatalogTileContainerRenderer;

}, /* bExport= */ true);
