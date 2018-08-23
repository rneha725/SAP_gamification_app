sap.ui.require.preload({
	"sap/ushell/components/tiles/cdm/applauncher/Component.js":function(){// ${copyright}
/* global jQuery, sap */

sap.ui.define([
    "sap/ui/core/UIComponent"
], function (UIComponent) {
    "use strict";

    return UIComponent.extend("sap.ushell.components.tiles.cdm.applauncher.Component", {
        metadata : {},

        // create content
        createContent : function () {

            // take tile configuration from manifest - if exists
            // take tile personalization from component properties - if exists
            // merging the tile configuration and tile personalization
            var oComponentData = this.getComponentData();
            var oP13n = oComponentData.properties.tilePersonalization || {};

            // adding sap-system to configuration
            var oStartupParams = oComponentData.startupParameters;
            if (oStartupParams && oStartupParams["sap-system"]) {
                //sap-system is always an array. we take the first value
                oP13n["sap-system"] = oStartupParams["sap-system"][0];
            }

            var oTile = sap.ui.view({
                type : sap.ui.core.mvc.ViewType.JS,
                viewName : "sap.ushell.components.tiles.cdm.applauncher.StaticTile",
                viewData: {
                    properties: oComponentData.properties,
                    configuration: oP13n
                }
            });
            this._oController = oTile.getController();
            return oTile;
        },

        // interface to be provided by the tile
        tileSetVisualProperties : function (oNewVisualProperties) {
            if (this._oController) {
                this._oController.updatePropertiesHandler(oNewVisualProperties);
            }
        },

        // interface to be provided by the tile
        tileRefresh : function () {
            // empty implementation. currently static tile has no need in referesh handler logic
        },

        // interface to be provided by the tile
        tileSetVisible : function (bIsVisible) {
            // empty implementation. currently static tile has no need in visibility handler logic
        },

        exit : function () {
            this._oController = null;
        }
    });
});
},
	"sap/ushell/components/tiles/cdm/applauncher/StaticTile.controller.js":function(){// ${copyright}
sap.ui.define(['sap/ui/core/mvc/Controller','sap/ushell/components/applicationIntegration/AppLifeCycle'], function (Controller,AppLifeCycle) {
    "use strict";

    /*global jQuery, sap, hasher, window */
    return Controller.extend("sap.ushell.components.tiles.cdm.applauncher.StaticTile", {

      _getConfiguration : function () {
        var oConfig = this.getView().getViewData();
        this.oShellModel = AppLifeCycle.getElementsModel();
        if (this.oShellModel)
          if (this.oShellModel.getModel() && oConfig.properties) {
            oConfig.properties.sizeBehavior = this.oShellModel.getModel().getProperty("/sizeBehavior") ?
              this.oShellModel.getModel().getProperty("/sizeBehavior") : "Responsive";
          }
        return oConfig;
      },

        onInit : function () {
          var oView = this.getView();
          var oModel = new sap.ui.model.json.JSONModel();
          oModel.setData(this._getConfiguration());

          // set model, add content
          oView.setModel(oModel);
        },



        // trigger to show the configuration UI if the tile is pressed in Admin mode
        onPress: function (oEvent) {
            var oConfig = this.getView().getViewData().properties,
                oRecentEntry = {},
                oRenderer = sap.ushell.Container.getRenderer("fiori2");
            if (oEvent.getSource().getScope && oEvent.getSource().getScope() === sap.m.GenericTileScope.Display) {
                var sTargetURL = this._createTargetUrl();
                if (sTargetURL.length === 0) {
                    return;
                }

                if (sTargetURL[0] === '#') {
                    hasher.setHash(sTargetURL);
                } else {
                    // add the URL to recent activity log
                    oRecentEntry.title = oConfig.title;
                    oRecentEntry.appType = "App";
                    oRecentEntry.url = oConfig.targetURL;
                    oRecentEntry.appId = oConfig.targetURL;
                    oRenderer.logRecentActivity(oRecentEntry);

                    window.open(sTargetURL, '_blank');
                }
            }
        },

        updatePropertiesHandler: function (oNewProperties) {

            var oTile = this.getView().getContent()[0],
                oTileContent = oTile.getTileContent()[0];

            if (typeof oNewProperties.title !== 'undefined') {
                oTile.setHeader(oNewProperties.title);
            }
            if (typeof oNewProperties.subtitle !== 'undefined') {
                oTile.setSubheader(oNewProperties.subtitle);
            }
            if (typeof oNewProperties.icon !== 'undefined') {
                oTileContent.getContent().setSrc(oNewProperties.icon);
            }
            /*
            Is this needed? to be checked
            if (typeof oNewProperties.targetURL !== 'undefined') {
                oPropertiesData.targetURL = oNewProperties.targetURL;
                bChanged = true;
            }
            */
            if (typeof oNewProperties.info !== 'undefined') {
                oTileContent.setFooter(oNewProperties.info);
            }
        },

        _createTargetUrl: function (){
            var sTargetURL = this.getView().getViewData().properties.targetURL,
                sSystem = this.getView().getViewData().configuration["sap-system"],
                oUrlParser,oHash;

            if (sTargetURL && sSystem) {
                oUrlParser = sap.ushell.Container.getService("URLParsing");
                // when the navigation url is hash we want to make sure system parameter is in the parameters part
                if (oUrlParser.isIntentUrl(sTargetURL)){
                    oHash = oUrlParser.parseShellHash(sTargetURL) ;
                    if (!oHash.params){
                        oHash.params = {};
                    }
                    oHash.params["sap-system"] = sSystem;
                    sTargetURL = "#"+ oUrlParser.constructShellHash(oHash);
                } else {
                    sTargetURL += ((sTargetURL.indexOf("?") < 0) ? "?" : "&")
                        + "sap-system=" + sSystem;
                }
            }
            return sTargetURL;

        },

        _getCurrentProperties: function (){
            var oTile = this.getView().getContent()[0],
                oTileContent = oTile.getTileContent()[0],
                sizeBehavior = "Responsive";

          this.oShellModel = AppLifeCycle.getElementsModel();
          var sizeBehavior = "Responsive";
          if (this.oShellModel) {
            if (this.oShellModel.getModel()) {
              sizeBehavior = this.oShellModel.getModel().getProperty("/sizeBehavior") ? this.oShellModel.getModel().getProperty("/sizeBehavior") : "Responsive";
            }
          }

          return {
                title: oTile.getHeader(),
                subtitle: oTile.getSubheader(),
                info: oTileContent.getFooter(),
                icon: oTileContent.getContent().getSrc(),
                sizeBehavior: sizeBehavior
            };
        }
    });


}, /* bExport= */ true);
},
	"sap/ushell/components/tiles/cdm/applauncher/StaticTile.view.js":function(){// ${copyright}

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
},
	"sap/ushell/components/tiles/cdm/applauncher/i18n/i18n.properties":'\n#XTIT: Title of Static App Launcher\ntitle=Static App Launcher\n',
	"sap/ushell/components/tiles/cdm/applauncher/manifest.json":'{\n    "_version": "1.1.0",\n    "sap.flp": {\n        "type": "tile",\n        "tileSize": "1x1"\n    },\n    "sap.app": {\n        "id": "sap.ushell.components.tiles.cdm.applauncher",\n        "_version": "1.0.0",\n        "type": "component",\n        "applicationVersion": {\n            "version": "1.0.0"\n        },\n        "title": "{{title}}",\n        "description": "",\n        "tags": {\n            "keywords": []\n        },\n        "ach": "CA-FE-FLP-EU"\n    },\n    "sap.ui": {\n        "_version": "1.1.0",\n        "icons": {\n            "icon": ""\n        },\n        "deviceTypes": {\n            "desktop": true,\n            "tablet": true,\n            "phone": true\n        },\n        "supportedThemes": [\n            "sap_hcb",\n            "sap_belize",\n            "sap_belize_plus"\n        ]\n    },\n    "sap.ui5": {\n        "_version": "1.1.0",\n        "componentName": "sap.ushell.components.tiles.cdm.applauncher",\n        "dependencies": {\n            "minUI5Version": "1.42",\n            "libs": {\n                "sap.m": {}\n            }\n        },\n        "models": {\n            "i18n": {\n                "type": "sap.ui.model.resource.ResourceModel",\n                "uri": "i18n/i18n.properties"\n            }\n        },\n        "rootView": "sap.ushell.components.tiles.cdm.applauncher",\n        "handleValidation": false\n    }\n}'
},"Component-preload"
);
