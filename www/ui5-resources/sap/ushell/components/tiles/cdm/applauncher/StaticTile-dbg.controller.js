// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
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
