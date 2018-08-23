// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

sap.ui.define(["sap/m/GenericTile", "sap/m/ImageContent", "sap/m/Link"], function (GenericTile, ImageContent, Link) {
	"use strict";

    /*global jQuery, sap */
    /*jslint nomen: true */

    sap.ui.jsview("sap.ushell.components.tiles.applauncher.StaticTile", {
        getControllerName: function () {
            return "sap.ushell.components.tiles.applauncher.StaticTile";
        },
        createContent: function (oController) {
            this.setHeight('100%');
            this.setWidth('100%');
        },
        getTileControl: function () {
            var oController = this.getController();
            
          var dsplMode = '{/config/display_mode}';
            return new sap.m.GenericTile({
                //TODO - Change display_mode to the right parameter
                mode:  dsplMode ? dsplMode : sap.m.GenericTileMode.ContentMode,
                header: '{/config/display_title_text}',
                subheader: '{/config/display_subtitle_text}',
                sizeBehavior : '{/sizeBehavior}',
                size: "Auto",
                tileContent: new sap.m.TileContent({
                    size: "Auto",
                    footer: '{/config/display_info_text}',
                    content: new ImageContent({
                        src: '{/config/display_icon_url}',
                        width: "100%"
                    })
                }),
                press: [ oController.onPress, oController ]
            });
        },
        getLinkControl: function () {
            return new Link({
               text: "{/config/display_title_text}",
               href: "{/nav/navigation_target_url}",
               //set target formatter so external links would be opened in a new tab
               target: {
                   path: "/nav/navigation_target_url",
                   formatter: function (sUrl){
                       if (sUrl && sUrl[0] !== '#'){
                           return "_blank";
                       }
                   }
               }
           });
        }
    });


}, /* bExport= */ false);
