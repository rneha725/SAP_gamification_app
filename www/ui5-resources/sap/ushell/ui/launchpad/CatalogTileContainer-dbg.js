/**
 * @name sap.ushell.ui.launchpad.CatalogTileContainer
 *
 * @private
 */
sap.ui.define([
    'jquery.sap.global',
    'sap/ui/base/ManagedObject',
    'sap/ushell/ui/launchpad/TileContainer',
    './CatalogTileContainerRenderer'
], function(jQuery, ManagedObject, TileContainer/*, CatalogTileContainerRenderer */) {
    "use strict";

    return TileContainer.extend("sap.ushell.ui.launchpad.CatalogTileContainer", {
        updateTiles:  function (sReason) {
            var sName = "tiles";
            if (this.isTreeBinding(sName)) {
                // no idea how to handle -> delegate to parent
                ManagedObject.prototype.updateAggregation.apply(this, arguments);
            } else {
                jQuery.sap.log.debug("Updating TileContainer. Reason: ", sReason);
                try {
                    this.filterTiles(); // may fail if filter broadens after non-filter update
                } catch (ex) {
                    this.updateAggregation(sName);
                }
            }
        }
    });
});




