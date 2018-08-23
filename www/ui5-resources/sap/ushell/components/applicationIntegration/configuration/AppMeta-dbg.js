// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview handle all the resources for the different applications.
 * @version 1.56.5
 */
sap.ui.define([
    'sap/ushell/services/AppConfiguration',
    'sap/ui/Device'
    //'sap/ushell/components/container/ApplicationContainer',
], function (AppConfiguration, Device) {
    "use strict";

    function AppMeta () {

        /**
         * Helper function to get the favIcon image URL based on a given theme parameter.
         */
        this._getDefaultFavIcon = function (oParameters) {
            var favIcon = oParameters.get('sapUiShellFavicon');
            if (favIcon) {
                var match = /url[\s]*\('?"?([^\'")]*)'?"?\)/.exec(favIcon);
                if (match) {
                    favIcon = match[1];
                } else if (favIcon === "''" || favIcon === "none") {
                    favIcon = null;
                }
            }

            if (!favIcon) {
                var sModulePath = jQuery.sap.getModulePath("sap.ushell");
                return sModulePath + '/themes/base/img/launchpad_favicon.ico';
            }

            return favIcon;

        };

        this.getFavIconHref = function () {
            return jQuery('link').filter('[rel="shortcut icon"]').attr('href') || '';
        };

        this.getAppIcon = function () {
            var sIcon = "sap-icon://folder",
                appMetaData = AppConfiguration.getMetadata();

            if (appMetaData && appMetaData.icon) {
                sIcon = appMetaData.icon;
            }
            return sIcon;
        };

        this.setAppIcons = function (oMetadataConfig) {
            sap.ui.require(["sap/ui/core/theming/Parameters"], function (Parameters) {
                //Performance Debug
                jQuery.sap.measure.start("FLP:ShellController.setAppIcons", "setAppIcons","FLP");

                var sModulePath = jQuery.sap.getModulePath("sap.ushell"),
                    oLaunchIconPhone = (oMetadataConfig && oMetadataConfig.homeScreenIconPhone) ||
                        (sModulePath + '/themes/base/img/launchicons/57_iPhone_Desktop_Launch.png'),
                    oLaunchIconPhone2 = (oMetadataConfig && oMetadataConfig["homeScreenIconPhone@2"]) ||
                        (sModulePath + '/themes/base/img/launchicons/114_iPhone-Retina_Web_Clip.png'),
                    oLaunchIconTablet = (oMetadataConfig && oMetadataConfig.homeScreenIconTablet) ||
                        (sModulePath + '/themes/base/img/launchicons/72_iPad_Desktop_Launch.png'),
                    oLaunchIconTablet2 = (oMetadataConfig && oMetadataConfig["homeScreenIconTablet@2"]) ||
                        (sModulePath + '/themes/base/img/launchicons/144_iPad_Retina_Web_Clip.png'),
                    oFavIcon = (oMetadataConfig && oMetadataConfig.favIcon) || (this._getDefaultFavIcon(Parameters)),
                    sCurrentFavIconHref = this.getFavIconHref();
                if (Device.os.ios) {
                    jQuery.sap.setIcons({
                        'phone': oLaunchIconPhone,
                        'phone@2': oLaunchIconPhone2,
                        'tablet': oLaunchIconTablet,
                        'tablet@2': oLaunchIconTablet2,
                        'favicon': oFavIcon,
                        'precomposed': false
                    });
                } else if (sCurrentFavIconHref !== oFavIcon) {
                    jQuery.sap.setIcons({
                        'phone': '',
                        'phone@2': '',
                        'tablet': '',
                        'tablet@2': '',
                        'favicon': oFavIcon,
                        'precomposed': true
                    });
                }
                jQuery.sap.measure.end("FLP:ShellController.setAppIcons");
            }.bind(this));
        };

        //The priority order is (from left to right): UserInfo, application metadata, device type
        this._applyContentDensityByPriority = function (isCompact) {
            if (isCompact === undefined) {
                //in case non of the below conditions is relevant, then cannot determine cozy or compact
                if (Device.system.combi) {
                    var userInfoService = sap.ushell.Container.getService("UserInfo"),
                        oUser = userInfoService.getUser(),
                        sContentDensity = "autoDetect";
                    // if oUser doesn't exist - then default is auto detect
                    if (oUser) {
                        sContentDensity = oUser.getContentDensity();
                    }
                    switch (sContentDensity) {
                        case "cozy":
                            isCompact = false;
                            break;
                        case "compact":
                            isCompact = true;
                            break;
                        default: //autoDetect
                            var appMetaData = AppConfiguration.getMetadata();
                            // Compact == true , Cozy == false
                            // All other cases - go to Cozy
                            if (appMetaData.compactContentDensity && !appMetaData.cozyContentDensity) {
                                isCompact = true;
                            } else {
                                isCompact = false;
                            }
                    }
                } else {
                    var appMetaData = AppConfiguration.getMetadata();
                    // Compact == true , Cozy == false
                    if (appMetaData.compactContentDensity && !appMetaData.cozyContentDensity) {
                        isCompact = true;
                    } else {
                        // Compact == false , Cozy == true
                        if (!appMetaData.compactContentDensity && appMetaData.cozyContentDensity) {
                            isCompact = false;
                        } else {
                            // Compact == true , Cozy == true
                            // Compact == false , Cozy == false
                            isCompact = this._isCompactContentDensityByDevice();
                        }
                    }
                }
            }
            this._applyContentDensityClass(isCompact);
        };

        this._applyContentDensityClass = function (isCompact) {
            if (isCompact === undefined) {
                var userInfoService = sap.ushell.Container.getService("UserInfo"),
                    oUser = userInfoService.getUser ? userInfoService.getUser() : undefined;
                if (oUser && oUser.getContentDensity() === 'cozy') {
                    isCompact = false;
                } else {
                    isCompact = this._isCompactContentDensityByDevice();
                }
            }

            if (isCompact) {
                jQuery('body').removeClass('sapUiSizeCozy');
                jQuery('body').addClass('sapUiSizeCompact');
            } else {
                jQuery('body').removeClass('sapUiSizeCompact');
                jQuery('body').addClass('sapUiSizeCozy');
            }
        };

        this._isCompactContentDensityByDevice = function () {
            var isCompact;
            // Combi - If this flag is set to true, the device is recognized as a combination of a desktop system and tablet.
            // Touch - If this flag is set to true, the used browser supports touch events.
            if (!Device.support.touch || Device.system.combi) {
                isCompact = true;
            } else {
                isCompact = false;
            }
            return isCompact;
        };

        this.getTitleDefaultValue = function () {
            var sTitle = "",
                appMetaData = AppConfiguration.getMetadata();

            if (appMetaData && appMetaData.title) {
                sTitle = appMetaData.title;
            }
            return sTitle;
        };

    }


    return new AppMeta();
}, /* bExport= */ true);
