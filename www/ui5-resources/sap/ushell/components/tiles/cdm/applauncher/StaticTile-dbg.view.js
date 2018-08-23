// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/m/GenericTile",
    "sap/m/ImageContent",
    "sap/m/TileContent",
    "sap/ui/core/mvc/JSView"
], function(GenericTile, ImageContent, TileContent) {
    "use strict";

    /*global jQuery, sap */
    /*jslint nomen: true */

    return sap.ui.jsview("sap.ushell.components.tiles.cdm.applauncher.StaticTile", {
        getControllerName: function () {
            return "sap.ushell.components.tiles.cdm.applauncher.StaticTile";
        },
        createContent: function (oController) {
            var oViewDataProperties = this.getViewData().properties;
            this.setHeight('100%');
            this.setWidth('100%');

            return new GenericTile({
                header: oViewDataProperties.title,
                subheader: oViewDataProperties.subtitle,
                size: 'Auto',
                sizeBehavior : '{/properties/sizeBehavior}',
                tileContent: new TileContent({
                    size: "Auto",
                    footer: oViewDataProperties.info,
                    content: new ImageContent({
                        src: oViewDataProperties.icon,
                        width: "100%"
                    })
                }),

                press: [ oController.onPress, oController ]
            });
        }
    });

}, /* bExport= */ true);
