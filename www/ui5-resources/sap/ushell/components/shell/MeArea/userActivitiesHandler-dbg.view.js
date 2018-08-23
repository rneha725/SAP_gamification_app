// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, document, self */
    /*jslint plusplus: true, nomen: true, vars: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.userActivitiesHandler", {
        createContent: function (oController) {
            var i18n = sap.ushell.resources.i18n;
            var sFlexDirection = sap.ui.Device.system.phone ? 'Column' : 'Row';
            var sFlexAlignItems = sap.ui.Device.system.phone ? 'Stretch' : 'Center';
            var sTextAlign = sap.ui.Device.system.phone ? 'Left' : 'Right';

            this.trackingLabel = new sap.m.Label('trackingLabel', {
                text: i18n.getText("trackingLabel") ,
                textAlign: sTextAlign
            }).addStyleClass("sapUshellCleanActivityLabel");


            this.trackUserActivitySwitch =   new sap.m.Switch("trackUserActivitySwitch", {
                type: sap.m.SwitchType.Default,
                customTextOn : i18n.getText("Yes") ,
                customTextOff : i18n.getText("No") ,
                change: function (oEvent) {
                    oController._handleTrackUserActivitySwitch(oEvent.getParameter("state"));
                }
            });

            var fTrackingSwitch = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    this.trackingLabel,
                    this.trackUserActivitySwitch
                ]
            });

            this.cleanActivityLabel = new sap.m.Label('cleanActivityLabel', {
                text: i18n.getText("cleanActivityLabel") ,
                textAlign: sTextAlign
            }).addStyleClass("sapUshellCleanActivityLabel");


            this.cleanActivityButton =new sap.m.Button({
                id: "cleanActivityButton",
                text: i18n.getText("cleanActivityButton"),
                press: oController._handleCleanHistory
            });

            var fcleanActivity = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    this.cleanActivityLabel,
                    this.cleanActivityButton
                ]
            });

            var vbox = new sap.m.VBox({
                items: [ fTrackingSwitch,fcleanActivity]
            });
            vbox.addStyleClass("sapUiSmallMargin");

            return vbox;
        },

        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.userActivitiesHandler";
        }
    });



}, /* bExport= */ false);
