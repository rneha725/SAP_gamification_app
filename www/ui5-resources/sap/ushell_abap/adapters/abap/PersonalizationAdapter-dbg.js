// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview The Unified Shell's personalization adapter for the ABAP
 *               platform.
 *               The internal data structure of the AdapterContainer corresponds to the
 *               ABAP EDM.
 *               Container header properties transported via pseudo-items are mapped to the
 *               respective header properties in setItem/getItem/delItem
 *
 * @version 1.56.5
 */
sap.ui.define([
    "sap/ushell/services/Personalization",
    "sap/ushell/services/_Personalization/constants"
], function (Personalization, constants) {

    "use strict";
    /*jslint nomen: true*/
    /*global jQuery sap setTimeout */
    jQuery.sap.require("sap.ui2.srvc.ODataWrapper");
    jQuery.sap.require("sap.ui2.srvc.ODataService");

    var sABAPTIMESTAMPFORMAT = "yyyyMMddHHmmss",
        sInitialStorage = new Date(9999, 1, 1, 0, 0, 0),
        sInitialExpire = new Date(9999, 1, 1, 0, 0, 0, 0),
        sCONTAINERCOLLECTIONNAME = "PersContainers",
        sITEM_KEY_ADMIN_EXPIRE = "ADMIN#sap-ushell-container-expireUTCTimestamp",
        sITEM_KEY_ADMIN_STORAGEUTC = "ADMIN#sap-ushell-container-storageUTCTimestamp",
        sITEM_KEY_ADMIN_SCOPE = "ADMIN#sap-ushell-container-scope";

    // Ensure Namespace
    jQuery.sap.getObject("sap.ushell_abap.adapters.abap", 0 /* create namespace */);

    // --- Adapter ---

    /**
     * This method MUST be called by the Unified Shell's personalization service only.
     * Constructs a new instance of the personalization adapter for the ABAP
     * platform.
     *
     * @param {object}
     *            oSystem the system served by the adapter
     *
     * @class The Unified Shell's personalization adapter for the ABAP platform.
     *
     * @constructor
     * @since 1.11.0
     * @private
     */
    sap.ushell_abap.adapters.abap.PersonalizationAdapter = function (oSystem, sParameters, oConfig) {
        this._oConfig = oConfig && oConfig.config;
        var sPersonalizationServiceURL = (jQuery.sap.getObject("config.services.personalization.baseUrl",
            undefined, oConfig) || "/sap/opu/odata/UI2/INTEROP") + "/";
        var oODataWrapperSettings = {
            baseUrl:      sPersonalizationServiceURL,
            'sap-language': sap.ushell.Container.getUser().getLanguage(),
            'sap-client':   sap.ushell.Container.getLogonSystem().getClient()
        };
        this._oWrapper = sap.ui2.srvc.createODataWrapper(oODataWrapperSettings);
        function fnDefaultFailure(oMessage) {
            sap.ui2.srvc.Error(oMessage, "sap.ushell_abap.adapters.abap.PersonalizationAdapter");
        }
        sap.ui2.srvc.ODataService.call(this, this._oWrapper, fnDefaultFailure);
    };

    // historically, the service always called  getAdapterContainer and then load
    // thus an implementation was not required to initialize a fully implemented container on getAdapterContainer
    // if the following property is set to true, it indicates getAdapterContainer is sufficient and a load is not
    // required if an initial contain is requested.
    sap.ushell_abap.adapters.abap.PersonalizationAdapter.prototype.supportsGetWithoutSubsequentLoad = true;

    sap.ushell_abap.adapters.abap.PersonalizationAdapter.prototype.getAdapterContainer = function (sContainerKey, oScope, sAppName) {
        return new sap.ushell_abap.adapters.abap.AdapterContainer(sContainerKey, this, oScope, sAppName);
    };

    sap.ushell_abap.adapters.abap.PersonalizationAdapter.prototype.delAdapterContainer = function (sContainerKey, oScope) {
        return this.getAdapterContainer(sContainerKey, oScope).del();
    };

    function rectifyKey(sContainerKey) {
        var sCONTAINER_KEY_PREFIX = "sap.ushell.personalization#";
        if (sContainerKey.substring(0, sCONTAINER_KEY_PREFIX.length)  !== sCONTAINER_KEY_PREFIX) {
            jQuery.sap.log.error("Unexpected ContainerKey " + sContainerKey);
            return sContainerKey;
        }
        return sContainerKey.substring(sCONTAINER_KEY_PREFIX.length, sCONTAINER_KEY_PREFIX.length + 40);
    }

    /**
     * Determine the correct category resulting out of possible scope flag combinations
     * @returns {string}
     *  category information
     * @private
     */
    sap.ui2.srvc.testPublishAt(sap.ushell_abap.adapters.abap.PersonalizationAdapter);
    sap.ushell_abap.adapters.abap.PersonalizationAdapter.prototype._determineCategory = function (oScope) {
        if (!oScope) {
            return "U";
        }
        var oConstants = constants;
        if (oScope.keyCategory && oScope.keyCategory === oConstants.keyCategory.FIXED_KEY &&
                oScope.writeFrequency && oScope.writeFrequency === oConstants.writeFrequency.LOW &&
                    oScope.clientStorageAllowed && oScope.clientStorageAllowed === true) {
            return "P";
        }
        return "U";
    };

    sap.ushell_abap.adapters.abap.AdapterContainer = function (sContainerKey, oService, oScope, sAppName) {
        this._oService = oService;
        this._oScope = oScope;
        this["sap-cache-id"] = jQuery.sap.getObject("_oService._oConfig.services.personalization.cacheId", undefined, this);
        sCONTAINERCOLLECTIONNAME = jQuery.sap.getObject("_oService._oConfig.services.personalization.relativeUrl", undefined, this) || "PersContainers";
        this._sContainerKey = rectifyKey(sContainerKey);
        this._sAppName = sAppName || "";

        //Determine category resulting out of possible scope flag combinations
        this._category = sap.ushell_abap.adapters.abap.PersonalizationAdapter.prototype._determineCategory(oScope);

        this._oJSONContainer = {
            "category" : this._category,
            "clientExpirationTime" : sInitialExpire,
//            "Changedat" : sInitialStorage,
            "appName" : this._sAppName,
            "component" : "", //csn component
            "id" : this._sContainerKey,
            PersContainerItems : []
        };
//          "Changedat" : "\/Date(1402911849000)\/",
//          "Expiredat" : "\/Date(1401109666000)\/",
//          "Achcomponent" : "SCM-BAS-DF",
//          "Validity" : 30,
//          "Changedby" : "FORSTMANN",
//          "items" : [
//              {
//                  "Itemvalue" : "Fiori Rocks" + new Date(),
//                  "Itemid" : "ITEM#ITEM1",
//                  "Itemtype" : " ",
//                  "Containerid" : sKey,
//                  "Containertype" : "P"
//              },
//              {{}; // OData model container -> items
//        obj = {
//                "Containertype" : "P",
//                "Containerid" : sKey,
//                "Changedat" : "\/Date(1402911849000)\/",
//                "Expiredat" : "\/Date(1401109666000)\/",
//                "Achcomponent" : "SCM-BAS-DF",
//                "Validity" : 30,
//                "Changedby" : "FORSTMANN",
//                "items" : [
//                    {
//                        "Itemvalue" : "Fiori Rocks" + new Date(),
//                        "Itemid" : "ITEM#ITEM1",
//                        "Itemtype" : " ",
//                        "Containerid" : sKey,
//                        "Containertype" : "P"
//                    },
//                    {
//                        "Itemvalue" : "3REALLLYCLIENTDF" + new Date(),
//                        "Itemid" : "ITEM#ITEM2",
//                        "Itemtype" : " ",
//                        "Containerid" : sKey,
//                        "Containertype" : "P"
//                    },
//                    {
//                        "Itemvalue" : "3REALLLYCLIENTDF" + new Date(),
//                        "Itemid" : "ITEM#ITEM3",
//                        "Itemtype" : " ",
//                        "Containerid" : sKey,
//                        "Containertype" : "P"
//                    },
//                    {
//                        "Itemvalue" : "3REALLLYCLIENTDF" + new Date(),
//                        "Itemid" : "ITEM#ITEM4",
//                        "Itemtype" : " ",
//                        "Containerid" : sKey,
//                        "Containertype" : "P"
//                    }
//                ]
//            };
        this._oPropertyBag = {};
        this._aOperationQueue = [];
    };

    /**
     * Resets the container item values to initial ( retaining key, validity, etc!)
     */
    sap.ushell_abap.adapters.abap.AdapterContainer.prototype._reset = function () {
        this._oJSONContainer.PersContainerItems = [];
    };

    sap.ushell_abap.adapters.abap.AdapterContainer.prototype._obtainODataWrapper = function () {
        return this._oService._oWrapper;
    };

    // loads data from backend, when done, oPropertyBag contains the items
    sap.ushell_abap.adapters.abap.AdapterContainer.prototype.load = function () {
        var oDeferred = new jQuery.Deferred(),
            that = this,
            oDataWrapper = this._obtainODataWrapper(),
            // load container data with _sContainerKey data into _oPoprertyBag
            sRelativeUrl = sCONTAINERCOLLECTIONNAME + "(category='" + this._category + "',id='" + encodeURIComponent(this._sContainerKey) + "')?$expand=PersContainerItems";
        if (this._category && (this._category === 'P') && this["sap-cache-id"]) {
            sRelativeUrl = sRelativeUrl + "&sap-cache-id=" + this["sap-cache-id"];
        }
        sap.ui2.srvc.ODataService.call(this, oDataWrapper, function () {
            return false;
        });

        oDataWrapper.read(sRelativeUrl, function (oData) {
            // TODO : align container id?
            that._oJSONContainer = oData;
            // overwrite key and category, do not trust server response
            that._oJSONContainer.category = that._category;
            that._oJSONContainer.id = that._sContainerKey;
            that._oJSONContainer.appName = that._sAppName;
            // response contains items.results (!)
            that._oJSONContainer.PersContainerItems = (that._oJSONContainer.PersContainerItems && that._oJSONContainer.PersContainerItems.results) || [];
            oDeferred.resolve(that);
        }, function (sErrorMessage) {
            jQuery.sap.log.warning(sErrorMessage);
            // load errors are ok (at least 404), return empty(!) container
            that._reset();
            oDeferred.resolve(that);
        });
        return oDeferred.promise();
    };

    sap.ushell_abap.adapters.abap.AdapterContainer.prototype.save = function () {
        var oDeferred = new jQuery.Deferred(),
            that = this,
            oDataWrapper = this._obtainODataWrapper(),
            sRelativeURL = sCONTAINERCOLLECTIONNAME;
        // serialize the current JSON
        sap.ui2.srvc.ODataService.call(this, oDataWrapper, function () {
            return false;
        });

        oDataWrapper.create(sRelativeURL, this._oJSONContainer, function (response) {
            oDeferred.resolve(that);
        }, function (sErrorMessage) {
            oDeferred.reject(sErrorMessage);
        });
        return oDeferred.promise();
    };

    sap.ushell_abap.adapters.abap.AdapterContainer.prototype.del = function () {
        var oDeferred = new jQuery.Deferred(),
            that = this,
            oDataWrapper = this._obtainODataWrapper(),
            sRelativeURL = sCONTAINERCOLLECTIONNAME + "(category='" + this._category + "',id='" + encodeURIComponent(this._sContainerKey) + "')";
            //sRelativeURL = "containers(Containertype='',Containerid='" + encodeURIComponent(this._sContainerKey) + "')";
        // serialize the current JSON
        sap.ui2.srvc.ODataService.call(this, oDataWrapper, function () {
            return false;
        });

        oDataWrapper.del(sRelativeURL, function (response) {
            oDeferred.resolve(that);
        }, function (sErrorMessage) {
            oDeferred.reject(sErrorMessage);
        });
        this._reset();
        return oDeferred.promise();
    };

    sap.ushell_abap.adapters.abap.AdapterContainer.prototype.getItemKeys = function () {
        var res = [];
        // collect item names from types
        this._oJSONContainer.PersContainerItems.forEach(function (oMember) {
            if (oMember.category === "V") {
                res.push("VARIANTSET#" + oMember.id);
            } else if (oMember.category === "I") {
                res.push("ITEM#" + oMember.id);
            }
        });
        // add "artifical item names if present
        if (this._oJSONContainer.validity >= 0) {
            res.push(sITEM_KEY_ADMIN_STORAGEUTC); //  + this._oJSONContainer.Validity);
            res.push(sITEM_KEY_ADMIN_EXPIRE); //  + this._oJSONContainer.Expiredat);
            res.push(sITEM_KEY_ADMIN_SCOPE); //  + this._oJSONContainer.Expiredat);
        }
        return res;
    };
    sap.ushell_abap.adapters.abap.AdapterContainer.prototype.containsItem = function (sItemKey) {
        return this.getItemKeys().indexOf(sItemKey) >= 0 ? true : false;
    };

    function fnABAPDateToEDMDate(sABAPDate) {
        if (sABAPDate === undefined || sABAPDate === null) {
            return null;
        }
        var oFormatter = sap.ui.core.format.DateFormat.getDateInstance({ pattern : sABAPTIMESTAMPFORMAT});
        return oFormatter.parse(JSON.parse(sABAPDate), true);
    }

    function fnEDMDateToABAPDate(oDate) {
        var oFormatter = sap.ui.core.format.DateFormat.getDateInstance({ pattern : sABAPTIMESTAMPFORMAT});
        if (oDate === null) {
            oDate = sInitialExpire;
        }
        if (typeof oDate === "string") {
            if (/\/Date\(([0-9]+)\)\//.exec(oDate)) {
                oDate = new Date(parseInt(/\/Date\(([0-9]+)\)\//.exec(oDate)[1], 10));
            } else {
                jQuery.sap.log.error("Expected Date format " + oDate);
            }
        }
        // beware, Date comparision returns false, use + to compare the milliseconds values (!)
        if (+oDate === +sInitialExpire) {
            // undefined is mapped to sInitialExpire in ABAP OData representation
            return undefined;
        }
        return oFormatter.format(oDate, true);
    }

    sap.ushell_abap.adapters.abap.AdapterContainer.prototype._findItemIndex = function (sItemId, sCategory) {
        var i;
        for (i = 0; i < this._oJSONContainer.PersContainerItems.length; i = i + 1) {
            if (this._oJSONContainer.PersContainerItems[i].id === sItemId && this._oJSONContainer.PersContainerItems[i].category === sCategory) {
                return i;
            }
        }
        return undefined;
    };
    /**
     * Locates an item for the key sItemKey,
     * returns  { index : nr,  TrueItemKey : truekey,  containerProperty : }
     * either trueKey xor containerProperty is set.
     * index is filled iff it is a present item
     */
    sap.ushell_abap.adapters.abap.AdapterContainer.prototype._locateItem = function (sItemKey) {
        var res = { index : -1};
        if (sItemKey === sITEM_KEY_ADMIN_EXPIRE) {
            return { containerProperty : "clientExpirationTime",
                initialValue : sInitialExpire,
                convToABAP : fnABAPDateToEDMDate,
                convFromABAP : fnEDMDateToABAPDate
                };
        }
        if (sItemKey === sITEM_KEY_ADMIN_SCOPE) {
            // extract validity, and save as scope property
            return { containerProperty : "validity",
                initialValue : 0,
                convToABAP : function (oArg) {
                    if (!oArg) {
                        return null;
                    }
                    return JSON.parse(oArg).validity;
                },
                convFromABAP : function (oValue, oItem) {
                    if (oValue <= 0) {
                        return undefined;
                    }
                    oItem = oItem || {};
                    oItem.validity = oValue;
                    return oItem;
                }
                //// with the following lines uncommented, scope would be serialized as item 'A' 'scope' in addition!
                // currently in ABAP, only validity is stored in the Container Header
                // trueItemKey : "scope",
                // category : "A",
                // index : this._findItemIndex("scope", "A")
                };
        }
        // this is no longer present !
        if (sItemKey === sITEM_KEY_ADMIN_STORAGEUTC) {
            return { containerProperty : " ignore", // ChangedatNOLONGERPRESENT",
                initialValue : sInitialStorage,
                convToABAP : fnABAPDateToEDMDate,
                convFromABAP : fnEDMDateToABAPDate
                };
        }
        // Remove prefix, mapping into category,
        // Strip prefix from itemkey and truncate to 40 effective characters
        if (sItemKey.indexOf("ITEM#") === 0) {
            res.trueItemKey = sItemKey.substring("ITEM#".length, "ITEM#".length + 40);
            res.category = "I";
        } else if (sItemKey.indexOf("VARIANTSET#") === 0) {
            res.trueItemKey = sItemKey.substring("VARIANTSET#".length, "VARIANTSET#".length + 40);
            res.category = "V";
        } else if (sItemKey.indexOf("ADMIN#") !== 0) {
            jQuery.sap.log.error("Unknown itemkey prefix" + sItemKey);
        }
        res.index = this._findItemIndex(res.trueItemKey, res.category);
        return res;
    };

    sap.ushell_abap.adapters.abap.AdapterContainer.prototype.getItemValue = function (sItemKey) {
        var sItemValue = "",
            oItemValue,
            oItemRef = this._locateItem(sItemKey);
        if (oItemRef.containerProperty === " ignore") {
            return undefined; // not present in persistence
        }
        if (oItemRef.index >= 0) {
            sItemValue = this._oJSONContainer.PersContainerItems[oItemRef.index].value;
            try {
                oItemValue = JSON.parse(sItemValue);
            } catch (e) {
                // Workaround for
                // GW Bug "true" => "X" and false => "" at the backend
                // can be removed once Correction of Note 2013368 is implemented in landscape
                if (sItemValue === "X") {
                    oItemValue = true;
                } else {
                    oItemValue = undefined;
                }
            }
        }
        if (oItemRef.containerProperty) {
            if (typeof oItemRef.convFromABAP === "function") {
                return oItemRef.convFromABAP(this._oJSONContainer[oItemRef.containerProperty], oItemValue); // TODO Conversion!
            }
            return this._oJSONContainer[oItemRef.containerProperty];
        }
        return oItemValue;
    };


    /**
     * set oItemValue under sItemKey
     * returns undefined
     */
    sap.ushell_abap.adapters.abap.AdapterContainer.prototype.setItemValue = function (sItemKey, oItemValue) {
        var sItemValue = JSON.stringify(oItemValue),
            oItemRef = this._locateItem(sItemKey);
        if (oItemRef.containerProperty === " ignore") {
            return; // not present in persistence
        }
        if (oItemRef.containerProperty) {
            if (typeof oItemRef.convToABAP === "function") {
                this._oJSONContainer[oItemRef.containerProperty] = oItemRef.convToABAP(sItemValue); // TODO Conversion!
            } else {
                this._oJSONContainer[oItemRef.containerProperty] = sItemValue; // TODO Conversion!
            }
            if (!oItemRef.trueItemKey) {
                return;
            }
        }
        if (oItemRef.index >= 0) {
            this._oJSONContainer.PersContainerItems[oItemRef.index].value = sItemValue;
            return;
        }
        // not yet present
        this._oJSONContainer.PersContainerItems.push({
            "value" : sItemValue,
            "id" : oItemRef.trueItemKey,
            "category" : oItemRef.category,
            "containerId" : this._sContainerKey,
            "containerCategory" : this._category
        });
    };

    /**
     * delete (1st) item with key sItemKey
     */
    sap.ushell_abap.adapters.abap.AdapterContainer.prototype.delItem = function (sItemKey) {
        var oItemRef = this._locateItem(sItemKey);
        if (oItemRef.containerProperty === " ignore") {
            return; // not present in persistence
        }
        if (oItemRef.containerProperty) {
            this._oJSONContainer[oItemRef.containerProperty] = oItemRef.initialValue;
            return;
        }
        if (oItemRef.index >= 0) {
            this._oJSONContainer.PersContainerItems.splice(oItemRef.index, 1);
            return;
        }
        // TODO throw?
    };

    return sap.ushell_abap.adapters.abap.PersonalizationAdapter;

});
