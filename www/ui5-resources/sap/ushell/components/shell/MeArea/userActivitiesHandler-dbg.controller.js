// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define([
        'sap/ushell/components/applicationIntegration/AppLifeCycle'
    ],
    function(AppLifeCycle) {
	"use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    sap.ui.controller("sap.ushell.components.shell.MeArea.userActivitiesHandler", {

        onInit: function () {
            this.oModel = AppLifeCycle.getElementsModel().getModel();
            this.isTrackingEnable = this.oModel.getProperty("/enableTrackingActivity")!= undefined ? this.oModel.getProperty("/enableTrackingActivity") : true;
            this.currentTrackingMode = this.isTrackingEnable;
            this.oView.trackUserActivitySwitch.setState(this.isTrackingEnable);
        },

        getContent: function () {
            var oDfd = jQuery.Deferred();
            oDfd.resolve(this.getView());
            return oDfd.promise();
        },

        getValue: function () {
            return jQuery.Deferred().resolve(" ");
        },

        onCancel: function () {
            var oDfd = jQuery.Deferred();
            if (this.currentTrackingMode != this.isTrackingEnable) {
                this.isTrackingEnable = !this.isTrackingEnable;
                this.oView.trackUserActivitySwitch.setState(this.isTrackingEnable);
            }
            oDfd.resolve();
            return oDfd.promise();
        },

        onSave: function () {
            var oDfd = jQuery.Deferred();
            if (this.currentTrackingMode != this.isTrackingEnable) {
                this.oModel.setProperty("/enableTrackingActivity", this.isTrackingEnable);
                this.writeUserActivityModeToPersonalization(this.isTrackingEnable);
                this.currentTrackingMode = this.isTrackingEnable;
                sap.ui.getCore().byId('meAreaIconTabBar').setVisible(this.isTrackingEnable);
                var meAreaView = sap.ui.getCore().byId('meArea');
                // tracking wasn't able - need to get content from server and update the container
                if (this.isTrackingEnable) {
                    var meAreaController = meAreaView.getController();
                    if (!meAreaController.oUserRecentsSrvc) {
                        meAreaController.oUserRecentsSrvc = sap.ushell.Container.getService('UserRecents');
                    }
                    meAreaController.refreshRecentActivities();
                    meAreaController.refreshFrequentActivities();
                    oDfd.resolve();
                } else {
                    oDfd.resolve();
                }
            } else {
                oDfd.resolve();
            }
            return oDfd.promise();
        },

        writeUserActivityModeToPersonalization: function (isTrackingEnable) {
            var oDeferred,
                oPromise;

            try {
                oPromise = this._getPersonalizer().setPersData(isTrackingEnable);
            } catch (err) {
                jQuery.sap.log.error("Personalization service does not work:");
                jQuery.sap.log.error(err.name + ": " + err.message);
                oDeferred = new jQuery.Deferred();
                oDeferred.reject(err);
                oPromise = oDeferred.promise();
            }
            return oPromise;
        },

        _getPersonalizer: function () {
            var oPersonalizationService = sap.ushell.Container.getService("Personalization");
            var oComponent = sap.ui.core.Component.getOwnerComponentFor(this);
            var oScope = {
                keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
                writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
                clientStorageAllowed: true
            };

            var oPersId = {
                container: "flp.settings.FlpSettings",
                item: "userActivitesTracking"
            };

            return oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);
        },


        _handleCleanHistory : function () {
            sap.ushell.Container.getServiceAsync("UserRecents").then( function(oService) {
                oService.clearRecentActivities();
                showSaveMessageToast();

                function showSaveMessageToast () {
                    sap.ui.require(['sap/m/MessageToast'],
                        function (MessageToast) {
                            var message = sap.ushell.resources.i18n.getText("savedChanges");

                            MessageToast.show(message, {
                                duration: 3000,
                                width: "15em",
                                my: "center bottom",
                                at: "center bottom",
                                of: window,
                                offset: "0 -50",
                                collision: "fit fit"
                            });
                        });
                };
            });
        },

        _handleTrackUserActivitySwitch : function (isVisible) {
            this.isTrackingEnable = isVisible;
        }
    });


}, /* bExport= */ false);
