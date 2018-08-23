// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview The Unified Shell's sap.ushell.adapters.cdm.CommonDataModelAdapter for the 'CDM'
 *               platform.
 *
 * @version 1.56.5
 */

 /* global jQuery, sap, window*/

sap.ui.define([
    "sap/ushell/adapters/cdm/ClientSideTargetResolutionAdapter",
    "sap/base/util/extend",
    "sap/base/Log",
    "sap/base/util/UriParameters"
], function () {
    "use strict";
    /**
     * This method MUST be called by the Unified Shell's container only.
     * Constructs a new instance of the CommonDataModelAdapter for the CDM platform.
     *
     * @param {object} oUnused
     * @param {string} sParameter
     * @param {object} oAdapterConfiguration
     * @param {string} oAdapterConfiguration.siteDataUrl
     *  - The url to load the CDM site from
     * @param {boolean} oAdapterConfiguration.ignoreSiteDataPersonalization
     *  - Whether existing site data personalization should be ignored, default is false
     * @param {boolean} oAdapterConfiguration.allowSiteSourceFromURLParameter
     *  - Whether it should be allowed to specify a custom site url via url parameter, default is false
     *
     * @class
     * @constructor
     * @see {@link sap.ushell.adapters.cdm.CommonDataModelAdapter}
     */

    var CommonDataModelAdapter = function (oUnused, sParameter, oAdapterConfiguration) {

        this.oAdapterConfiguration = oAdapterConfiguration;
        if (oAdapterConfiguration && oAdapterConfiguration.config && oAdapterConfiguration.config.siteData) {
            this.oCdmSiteDataRequestPromise = new jQuery.Deferred().resolve(oAdapterConfiguration.config.siteData);
        } else if (oAdapterConfiguration && oAdapterConfiguration.config && oAdapterConfiguration.config.siteDataPromise) {
            this.oCdmSiteDataRequestPromise = oAdapterConfiguration.config.siteDataPromise;
        } else {
            var sSiteUrl = this._identifySiteUrlFromConfig(oAdapterConfiguration);
            //request cdm site
            this.oCdmSiteDataRequestPromise = this._requestSiteData(sSiteUrl);
        }
    };

    /**
     * Bundles the request logic for fetching the CDM site
     *
     * @param {string} sUrl
     *   Url for fetching the cdm site data
     * @returns {object} promise
     *   The promise's done handler returns the parsed CDM site object.
     *   In case an error occured, the promise's fail handler returns an error message.
     * @private
     */
    CommonDataModelAdapter.prototype._requestSiteData = function (sUrl) {
        var oSiteDataRequestDeferred = new jQuery.Deferred();

        if (!sUrl) {
            return oSiteDataRequestDeferred.reject(
                "Cannot load site: configuration property 'siteDataUrl' is missing for CommonDataModelAdapter.");
        }

        jQuery.ajax({
            type: "GET",
            dataType: "json",
            url: sUrl
        }).done( function (oResponseData) {
            oSiteDataRequestDeferred.resolve(oResponseData);
        }).fail( function (oError) {
            jQuery.sap.log.error(oError.responseText);
            oSiteDataRequestDeferred.reject("CDM Site was requested but could not be loaded.");
        });

        return oSiteDataRequestDeferred.promise();
    };

    /**
     * Retrieves the CDM site
     *
     * @returns {object} promise
     *   The promise's done handler returns the CDM site object.
     *   In case an error occured, the promise's fail handler returns an error message.
     * @public
     */
    CommonDataModelAdapter.prototype.getSite = function () {
        var oDeferred = new jQuery.Deferred();

        this.oCdmSiteDataRequestPromise.done(function (oSiteData) {
            var oSiteWithoutPers = jQuery.extend({}, oSiteData);

            delete oSiteWithoutPers.personalization;
            oDeferred.resolve(oSiteWithoutPers);
        }).fail(function (sMessage) {
            oDeferred.reject(sMessage);
        });

        return oDeferred.promise();
    };

    /**
     * Retrieves the personalization part of the CDM site
     *
     * @returns {object} promise
     *   The promise's done handler returns the personalization object of the CDM site.
     *   In case an error occured, the promise's fail handler returns an error message.
     * @public
     */
    CommonDataModelAdapter.prototype.getPersonalization = function () {
        var oDeferred = new jQuery.Deferred(),
            that = this;

        this.oCdmSiteDataRequestPromise.done(function (oSiteData) {
            var oSiteDataCopy = jQuery.extend({}, oSiteData);
            if (that.oAdapterConfiguration && that.oAdapterConfiguration.config && that.oAdapterConfiguration.config.ignoreSiteDataPersonalization) {
                delete oSiteDataCopy.personalization;
            }
            if (oSiteDataCopy.personalization) {
                oDeferred.resolve(oSiteDataCopy.personalization);
            } else {
                that._readPersonalizationDataFromStorage()
                .done(function (oPersonalizationData) {
                    oDeferred.resolve(oPersonalizationData);
                })
                .fail(function (sMessage) {
                    oDeferred.reject(sMessage);
                });
            }
        }).fail(function (sMessage) {
            oDeferred.reject(sMessage);
        });

        return oDeferred.promise();
    };

    /**
     * Wraps the logic for storing the personalization data.
     *
     * @param {object} oPersonalizationData
     *   Personalization data which should get stored
     * @returns {object} promise
     *   The promise's done handler indicates successful storing of personalization data.
     *   In case an error occured, the promise's fail handler returns an error message.
     * @private
     */
    CommonDataModelAdapter.prototype._storePersonalizationData = function (oPersonalizationData) {
        var oPersonalizationDeferred = new jQuery.Deferred(),
            oPersonalizationService = sap.ushell.Container.getService("Personalization"),
            oComponent,
            oScope = {
                keyCategory : oPersonalizationService.constants.keyCategory.FIXED_KEY,
                writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
                clientStorageAllowed : true
            },
            oPersId = {
                container : "sap.ushell.cdm.personalization",
                item : "data"
            },
            oPersonalizer = oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);

        oPersonalizer.setPersData(oPersonalizationData)
            .done(function () {
                jQuery.sap.log.info("Personalization data has been stored successfully.");
                oPersonalizationDeferred.resolve();
            })
            .fail(function () {
                oPersonalizationDeferred.reject("Writing personalization data failed.");
            });

        return oPersonalizationDeferred.promise();
    };

    /**
     * Wraps the logic for fetching the personalization data.
     *
     * @returns {object} promise
     *   The promise's done handler returns the parsed personalization data.
     *   In case an error occured, the promise's fail handler returns an error message.
     * @private
     */
    CommonDataModelAdapter.prototype._readPersonalizationDataFromStorage = function () {
        var oPersonalizationDeferred = new jQuery.Deferred(),
            oPersonalizationService = sap.ushell.Container.getService("Personalization"),
            oComponent,
            oScope = {
                keyCategory : oPersonalizationService.constants.keyCategory.FIXED_KEY,
                writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
                clientStorageAllowed : true
            },
            oPersId = {
                container : "sap.ushell.cdm.personalization",
                item : "data"
            },
            oPersonalizer = oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);

        oPersonalizer.getPersData()
            .done(function (oPersonalizationData) {
                if (!oPersonalizationData) {
                    oPersonalizationData = {};
                }
                oPersonalizationDeferred.resolve(oPersonalizationData);
            })
            .fail(function () {
                oPersonalizationDeferred.reject("Fetching personalization data failed.");
            });
        return oPersonalizationDeferred.promise();
    };

    /**
     * Wraps the logic for identifying the valid SiteURL based on this priorities:
     * 1. Provided as URL parameter "sap-ushell-cdm-site-url"
     * 2. Provided as part of the adapter configuration object as:
     * 2a. siteDataUrl
     * 2b. cdmSiteUrl
     *
     * @param {object} oAdapterConfiguration
     *   The adapter configuration object
     * @returns {string} sSiteUrl
     *   The valid site URL based on the defined priority
     * @private
     */
    CommonDataModelAdapter.prototype._identifySiteUrlFromConfig = function (oAdapterConfiguration) {
        var oParams = jQuery.sap.getUriParameters();
        var sSiteURL = oParams.get("sap-ushell-cdm-site-url");
        var oConfig = oAdapterConfiguration && oAdapterConfiguration.config;
        // take the site URL from the url parameter "sap-ushell-cdm-site-url" preferred if provided
        // to enable the loading of a test site but only if explicitly set via configuration to allow this
        if ((oConfig && !oConfig.allowSiteSourceFromURLParameter) && sSiteURL) {
            sSiteURL = null;
        }
        if (oConfig && !sSiteURL) {
            // if cdm site data is not directly set in configuration, a URL has to be defined
            // for consistency, the property should be called 'siteDataUrl', but we still support
            // 'cdmSiteUrl' for backwards compatibility
            sSiteURL = oConfig.siteDataUrl || oConfig.cdmSiteUrl;
        }
        this.sCdmSiteUrl = sSiteURL;
        return sSiteURL;
    };

    return CommonDataModelAdapter;
}, /*export=*/ true);
