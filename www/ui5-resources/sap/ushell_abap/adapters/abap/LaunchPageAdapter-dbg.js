
// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview The Unified Shell's page building adapter for the ABAP platform.
 *
 * @version 1.56.5
 */
(function () {
    "use strict";
    /*global jQuery, sap, URI, window */

    var sCOMPONENT = "sap.ushell_abap.adapters.abap.LaunchPageAdapter",
        sDEFAULT_PAGE_ID = "/UI2/Fiori2LaunchpadHome",
        sDEFAULT_CATALOG_ID = "/UI2/FLPD_CATALOG",
        sDYNAMIC_BASE_CHIP_ID = "X-SAP-UI2-CHIP:/UI2/DYNAMIC_APPLAUNCHER",
        sSTATIC_BASE_CHIP_ID = "X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER",
        O_ERROR_TYPES = {
            catalogTileNotFound: "catalogTileNotFound",
            referenceTileNotFound: "referenceTileNotFound",
            noTargetMapping: "noTargetMapping",
            emptyConfiguration: "emptyConfiguration",
            tileIntentSupportException: "tileIntentSupportException"
        };

    jQuery.sap.declare("sap.ushell_abap.adapters.abap.LaunchPageAdapter");

    /**
     * This method MUST be called by the Unified Shell's container only.
     * Constructs a new instance of the launch page adapter for the ABAP platform.
     *
     * @param {object} oUnused
     *     the system served by the adapter
     * @param {string} sParam
     *     parameter as string (legacy, was used before oAdapterConfiguration was added)
     * @param {oject} oAdapterConfiguration
     *     configuration for the adapter. Enables configuration of OData service URLs and
     *     cache buster tokens, for example.
     *
     * @class The Unified Shell's launch page adapter for the ABAP platform.
     *
     * @constructor
     * @see sap.ushell.services.LaunchPage
     * @since 1.11.0
     * @private
     */
    sap.ushell_abap.adapters.abap.LaunchPageAdapter = function (oUnused, sParameter, oAdapterConfiguration) {
        var bCatalogsValid, // undefined = not yet valid
            oCurrentPageSet = null,
            bPageSetFullyLoaded = false,
            oGetGroupsDeferred, // used to synchronize parallel getGroups-requests
            oGetCatalogsDeferred, // used to synchronize parallel getCatalog-requests

            // Stores a boolean that indicates whether a target mapping is
            // supported on the current device. One should use
            // makeTargetMappingSupportKey to store and retrieve values to/from
            // this map.
            oTargetMappingSupport = new sap.ui2.srvc.Map(),

            oAdapterConfig = (oAdapterConfiguration && oAdapterConfiguration.config) || {},
            oTargetMappingServiceConfig = oAdapterConfig.services && oAdapterConfig.services.targetMappings,
            oLaunchPageServiceConfig = oAdapterConfig.services && oAdapterConfig.services.launchPage,
            mEarlyTileVisibilities = {},
            that = this;

        if (!oTargetMappingServiceConfig) {
            throw new Error("Configuration for target mappings service not passed");
        }
        if (!oTargetMappingServiceConfig.baseUrl) {
            throw new Error("baseUrl was not passed in Configuration for target mappings service");
        }
        if (!oTargetMappingServiceConfig.relativeUrl) {
            throw new Error("relativeUrl was not passed in Configuration for target mappings service");
        }
        /**
         * Robust call to <code>sap.ui2.srvc.ChipInstance#getImplementationAsSapui5()</code>.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         * @param {string} sTitle
         * @param {string} sMessage
         * @returns {sap.ui.core.Control}
         */
        function getImplementationAsSapui5(oTile, sTitle, sMessage) {
            try {
                return oTile.getImplementationAsSapui5();
            } catch (ex) {
                // log errors, but do not fail
                jQuery.sap.log.error(sMessage + ": " + (ex.message || ex),
                    ex.stack, sCOMPONENT);
                return new sap.ushell.ui.tile.StaticTile({ //TODO remove as soon as RT has a own
                    icon: "sap-icon://error",
                    info: "",
                    infoState: "Critical",
                    subtitle: ex.message || ex,
                    title: sTitle
                }).addStyleClass("sapUshellTileError");
            }
        }

        /**
         * Checks if oChip has a bag with ID sBagId and if that bag contains a text with the name.
         * If so, the value for that text is returned. If not, undefined is returned.
         * The bag will not be created, in case it does not exist (calling getBag directly would do)!
         *
         * @param {object} oChip
         *  CHIP potentially containing the bag
         * @param {string} sBagId
         *  Bag ID to check for
         * @param {string} sTextName
         *  Text name to check for
         * @returns {string}
         *  Value for sTextName, or undefined if not found
         *
         * @private
         *
         * @see sap.ui2.srvc.ChipInstance#getBag
         * @see sap.ui2.srvc.ChipInstance#getBagIds
         * @see sap.ui2.srvc.Bag#getText
         * @see sap.ui2.srvc.Bag#getTextNames
         */
        sap.ui2.srvc.testPublishAt(that);
        function getBagText(oChip, sBagId, sTextName) {
            // calling getBag directly, will create the bag if it does not exist yet!
            if (oChip.getBagIds().indexOf(sBagId) > -1 &&
                oChip.getBag(sBagId).getTextNames().indexOf(sTextName) > -1) {
                return oChip.getBag(sBagId).getText(sTextName);
            }
        }

        /**
         * Checks if oChip has a configuration parameter with ID sConfigParameterId. Its value must be a stringified
         * JSON object. If that object contains a property named sPropertyName, it's value will be returned.
         * This method is save: In case the value cannot be read due to any reason undefined is returned.
         *
         * @param {object} oChip
         *  CHIP potentially containing the the configuration parameter and property and property name
         * @param {string} sConfigParameterId
         *  Configuration parameter ID to check for. The value must be a stringified JSON otherwise the method will
         *  return undefined
         * @param {string} sPropertyName
         *  Name of the property which is expected on the parsed object value from sConfigParameterId
         * @returns {string}
         *  Value for sPropertyName, or undefined if not found or an error occurred (e.g. due to failed parsing)
         *
         * @private
         *
         * @see sap.ui2.srvc.ChipInstance#getConfigurationParameter
         */
        sap.ui2.srvc.testPublishAt(that);
        function getConfigurationProperty(oChip, sConfigParameterId, sPropertyName) {
            var sTileConfig,
                oTileConfig;

            try {
                sTileConfig = oChip.getConfigurationParameter(sConfigParameterId);
                oTileConfig = JSON.parse(sTileConfig);
            } catch (e) {
                // most likely this is not a static or dynamic applauncher
                return;
            }

            if (oTileConfig[sPropertyName] !== undefined) { // also consider falsy values
               return oTileConfig[sPropertyName];
            }
        }

        /**
         * this method takes a configuration object and an array of elements (each must have a getId()
         * method) and returns a new array containing the ordered elements as defined in the
         * configuration.order
         *
         * Note1: elements not occurring in the string are appended to the end (as it was in aElements)
         * Note2: in case of double ids in configuration only the first one will take into account the
         *        following are ignored
         *
         * @param {object} [oConfiguration]
         *  object containing an order array, example: {order: ["id1", "id2", "id3"]}
         * @param {object[]} aElements
         *  array of objects. Each object must provide a getId method
         * @private
         * @since 1.11.0
         */
        sap.ui2.srvc.testPublishAt(that);
        function orderBasedOnConfiguration(oConfiguration, aElements) {
            var aOrder = oConfiguration && sap.ui2.srvc.isArray(oConfiguration.order) ?
                    oConfiguration.order : [],
                mElementsById = {},
                aOrderedElements = [],
                oElement,
                sId,
                i,
                n;

            aOrder = oConfiguration && sap.ui2.srvc.isArray(oConfiguration.order) ?
                oConfiguration.order : [];
            //append link tiles as they are exposed together with tiles via getGroupTiles
            aOrder = aOrder.concat(oConfiguration && sap.ui2.srvc.isArray(oConfiguration.linkOrder) ?
                oConfiguration.linkOrder : []);

            // create a map of instances by ID
            for (i = 0, n = aElements.length; i < n; i += 1) {
                oElement = aElements[i];
                mElementsById[oElement.getId()] = oElement;
            }
            // iterate over the order and move all found instances from the map to the result list
            for (i = 0, n = aOrder.length; i < n; i += 1) {
                sId = aOrder[i];
                if (Object.prototype.hasOwnProperty.call(mElementsById, sId)) {
                    aOrderedElements.push(mElementsById[sId]);
                    delete mElementsById[sId];
                }
            }
            // iterate again over the unordered list and add those that are still in the map
            for (i = 0, n = aElements.length; i < n; i += 1) {
                oElement = aElements[i];
                if (Object.prototype.hasOwnProperty.call(mElementsById, oElement.getId())) {
                    aOrderedElements.push(oElement);
                }
            }
            return aOrderedElements;
        }

        /**
         *  Orders the pages of oCurrentPageSet based on the configuration maintained in
         *  oCurrentPageSet and returns the result.
         *  @returns {sap.ui2.srvc.Page[]}
         *  @private
         */
        function getOrderedPages() {
            var oConfiguration;
            // always insert the default group ID at the first position, this moves the default
            // group to the beginning; it doesn't matter that the ID might be contained
            // twice, the order routine can handle this
            try {
                oConfiguration = JSON.parse(oCurrentPageSet.getConfiguration());
                oConfiguration.order.splice(0, 0, oCurrentPageSet.getDefaultPage().getId());
            } catch (e) {
                oConfiguration = {order: [oCurrentPageSet.getDefaultPage().getId()]};
            }
            return orderBasedOnConfiguration(oConfiguration, oCurrentPageSet.getPages());
        }

        /**
         * Stores the hidden groups under the existing configuration property of the pageset object
         * (by overriding the existing value or creating it if not yet exist).
         * A new property is added in order not to damage the existing groups order functionality
         * (i.e. configuration.order).
         *
         * @param {string[]} aHiddenGruopsIDs -
         *  The input parameter must be of type array, containing the IDs of the groups that should
         *  be set hidden. In case an empty array is provided all groups should be changed to
         *  visible.
         * @returns {object}
         *  promise object.
         *
         * @private
         */
        this.hideGroups = function (aHiddenGroupsIDs) {
            var oConf,
                oDeferred = new jQuery.Deferred();

            if (!aHiddenGroupsIDs || !(aHiddenGroupsIDs instanceof Array)) {
                oDeferred.reject('Input parameter must be of type Array.');
            } else {
                oConf = JSON.parse(oCurrentPageSet.getConfiguration() || "{}");

                // Replace the hidden groups array on the current configuration with the new hidden
                // groups array
                oConf.hiddenGroups = aHiddenGroupsIDs;
                oCurrentPageSet.setConfiguration(JSON.stringify(oConf),
                    /*fnSuccess*/oDeferred.resolve.bind(oDeferred),
                    /*fnFailure*/oDeferred.reject.bind(oDeferred));
            }
            return oDeferred.promise();
        };

        /**
         * Checks if the provided group should be visible or hidden.
         * It is decided according the group ID (oGroup should have a getId function).
         *
         *  @param {sap.ui2.srvc.Page} oGroup
         *    The group to be checked.
         *  @returns {boolean}
         *    true\false accordingly.
         *
         *  @private
         */
        this.isGroupVisible = function (oGroup) {
            var sConf = oCurrentPageSet.getConfiguration(),
                oConf,
                aHiddenGroups,
                i;

            if (!sConf) {
                return true;
            }

            oConf = JSON.parse(sConf);
            if (!oConf || !oConf.hiddenGroups) {
                return true;
            }

            //Go through the hidden groups array to check if we find the current group
            aHiddenGroups = oConf.hiddenGroups;
            for (i = 0; i < aHiddenGroups.length; i += 1) {
                if (aHiddenGroups[i] === oGroup.getId()) {
                    //If we found the group, it should not be visible
                    return false;
                }
            }
            //If the group is not in the hidden groups array then it should be visible
            return true;
        };

        /**
         * Triggers loading of a CHIP instance and adds the temporary property $loadingPromise
         * to it as it does not wait for the loading success or failure.
         * As soon as it is completely loaded (or loading failed) the $loadingPromise property
         * is removed again.
         */
        sap.ui2.srvc.testPublishAt(that);
        function triggerChipInstanceLoad(oChipInstance) {
            function fnSuccess() {
                oChipInstance.hasOwnProperty("_loadingDeferred") && oChipInstance._loadingDeferred.resolve();
                delete oChipInstance._loadingDeferred;
                delete oChipInstance.$loadingPromise; // was temporarily needed only
            }
            function fnFailure(sMessage) {
                // log errors, but do not fail
                jQuery.sap.log.error("Failed to load tile: " + sMessage,
                    oChipInstance.toString(), sCOMPONENT);
                oChipInstance.hasOwnProperty("_loadingDeferred") && oChipInstance._loadingDeferred.reject();
                delete oChipInstance._loadingDeferred;
                delete oChipInstance.$loadingPromise; // was temporarily needed only
            }
            oChipInstance.load(fnSuccess, fnFailure);
        }

        /**
         * Triggers loading of all ChipInstances of the given pages and calls fnLocalChipsLoaded
         * when all local CHIP instances are completely loaded.
         *
         * @param {sap.ui2.srvc.Page[]} aPages
         *  the pages
         * @param {function} fnLocalChipsLoaded
         *  Success handler which is called as soon as all LOCAL CHIPs are completely loaded.
         * @private
         */
        function loadApplaunchersAndDelayLoadingOfOtherChips(aPages, fnLocalChipsLoaded) {
            var iPendingRequests = 0, // counter used for loading app launchers only
                aLocalCustomTiles = [],
                aRemoteTiles = [];

            /**
             * if all pending requests are done the function triggers ordering of the array and
             * calls resolve afterwards
             */
            function finalize() {
                if (iPendingRequests <= 0) {
                    fnLocalChipsLoaded();
                }
            }

            /**
             * Loads dependent libraries (core-ext-light for custom tiles
             * and custom remote tiles) and triggers the loading of the chip instances.
             */
            function loadDependenciesAndTriggerChipInstanceLoad(oChipInstance) {
                // append the promise for loading to the instance, but only as long as loading is
                // pending. Note: will be used by getTileView
                oChipInstance._loadingDeferred = new jQuery.Deferred(); // used for KPI tiles and custom tiles
                oChipInstance.$loadingPromise = oChipInstance._loadingDeferred.promise();

                if (window["sap-ui-debug"] === true) {
                    triggerChipInstanceLoad(oChipInstance);
                } else {
                    // we don't distinguish KPI tiles from other custom tiles, because the
                    // static preload optimization (sap/fiori/indicator-tiles.js bundle)
                    // was only valid for a certain set of old KPI tiles; for newer KPI tiles used in S4
                    // the bundle did not contain all depenencies and therefore the optimization
                    // led to even more round trips; in practice, chances are high that the homepage
                    // will contain some non-KPI custom tiles, so core-ext-light will probably be loaded
                    // in most cases
                    // see internal BCP 1770271005
                    sap.ui.require(["sap/ushell/EventHub"], function (oEventHub) {
                        var oCoreResourcesComplementEvent = oEventHub.on("CoreResourcesComplementLoaded");

                        oCoreResourcesComplementEvent.do(function (oEvent) {
                            if (oEvent.status === "success") {
                                triggerChipInstanceLoad(oChipInstance);
                                oCoreResourcesComplementEvent.off();
                            }
                        });

                        oEventHub.emit("loadCoreResourcesComplement");
                    });
                }
            }

            /**
             * loads a CHIP instance and triggers finalize() or reject afterwards
             */
            function loadChipInstance(oChipInstance) {
                function onLoad() {
                    iPendingRequests -= 1;
                    finalize();
                }
                iPendingRequests += 1;
                oChipInstance.load(onLoad, function (sMessage) {
                    // log errors, but do not fail
                    jQuery.sap.log.error("Failed to load tile: " + sMessage,
                        oChipInstance.toString(), sCOMPONENT);
                    onLoad();
                });
            }

            aPages.forEach(function (oPage) {
                oPage.getChipInstances().forEach(function (oChipInstance) {
                    if (isRemoteChipInstance(oChipInstance)) {
                        aRemoteTiles.push(oChipInstance);
                    } else if (isBrokenChip(oChipInstance)) {
                        // This chip was not included in the expanded PageSets request so it does not exist.
                        // As it cannot be loaded, do not even try again it again.
                        // this also avoids unnecessary 404 CHIP requests at start-up
                        // BCP: 1880105843
                    } else if (isAppLauncher(oChipInstance)) {
                        // load local CHIP instances completely (also wait for them)
                        loadChipInstance(oChipInstance);
                    } else {
                        aLocalCustomTiles.push(oChipInstance);
                    }
                });
            });

            // after loading of app launchers is done we load the local custom tiles
            aLocalCustomTiles.forEach(function (oChipInstance) {
                loadDependenciesAndTriggerChipInstanceLoad(oChipInstance);
            });

            // after loading local tiles we load the remote tiles
            aRemoteTiles.forEach(function (oChipInstance) {
                loadDependenciesAndTriggerChipInstanceLoad(oChipInstance);
            });
            finalize(); // if no CHIP instances exist
        }

        /**
         * This method reads all target mappings for the current user via
         * a) a compactTM promise if present in config
         * b) xor a start_up service call with tm_compact=true
         * @returns {object}
         *    a jQuery promise
         *  which resolves to an array
         *  <code>
         *  [ {
         *          semanticObject : "SO",
         *          semanticAction : "action",
         *          formFactors : { desktop : true , ...}
         *    },
         *    ...
         *  ]
         * </code>
         */
        sap.ui2.srvc.testPublishAt(that, "readTargetMappings");
        function readTargetMappings() {
            var oDeferred = new jQuery.Deferred(),
                oTargetMappingsConfig,
                sCacheId,
                sUrl;

            function formatResult(oDirectStartTargetMappings) {
                var aRes = [];
                Object.keys(oDirectStartTargetMappings).forEach(function(sKey) {
                    var x = {};
                    ["semanticObject", "semanticAction", "formFactors"].forEach(function (sMember) {
                        x[sMember] = oDirectStartTargetMappings[sKey][sMember];
                    });
                    aRes.push(x);
                });
                return aRes;
            }
            if (jQuery.sap.getObject("compactTMPromise", undefined, oAdapterConfig)) {
                oAdapterConfig.compactTMPromise.then(function(oResult) {
                    var aRes = formatResult(oResult || {});
                    oDeferred.resolve({ results : aRes});
                }, function(sFail) {
                    oDeferred.reject(sFail);
                });
                return oDeferred.promise();
            }
            oTargetMappingsConfig = jQuery.sap.getObject("services.targetMappings", 0, oAdapterConfig);
            sCacheId = oTargetMappingsConfig.cacheId || "";
            sUrl = "/sap/bc/ui2/start_up?so=*&action=*&tm-compact=true&shellType=" + that._getShellType() + "&depth=0";

            if (sCacheId) {
                sUrl += (sUrl.indexOf("?") < 0 ? "?" : "&" ) + "sap-cache-id=" + sCacheId;
            }
            var sUI2CacheDisable = oTargetMappingsConfig.sUI2CacheDisable;
            if (sUI2CacheDisable) {
                sUrl += (sUrl.indexOf("?") < 0 ? "?" : "&" ) + "sap-ui2-cache-disable=" + sUI2CacheDisable;
            }

            sap.ui2.srvc.get(
                sUrl,
                false, /*xml=*/
                function (sDirectStartResult) {
                    var oDirectStartResult = JSON.parse(sDirectStartResult),
                        oDirectStartTargetMappings = oDirectStartResult.targetMappings || {};
                    var aRes = formatResult(oDirectStartTargetMappings);
                    oDeferred.resolve({ results : aRes});
                },
                function (sMessage) {
                    oDeferred.reject(sMessage);
                }
            );
            return oDeferred.promise();
        }

        /**
         * Returns the key to access the TargetMappingSupport map.
         *
         * @param {string} sSemanticObject
         *   the semantic object
         * @param {string} sSemanticAction
         *   the action
         * @returns {string}
         *   a key that can be used to access oTargetMappingsConfig
         * @private
         */
        sap.ui2.srvc.testPublishAt(that);
        function makeTargetMappingSupportKey(sSemanticObject, sSemanticAction) {
            return sSemanticObject + "-" + sSemanticAction;
        }

        /**
         * Tells whether the given tile is a CHIP instance wrapper only, i.e. does not contain
         * added value compared to the wrapped CHIP. This is the case for the results of
         * {@link #addTile}, but not for {@link #addBookmark}. Such wrappers must be unwrapped
         * by {@link #moveTile} or else the title becomes "hard coded" in the newly created CHIP
         * instance.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         * @returns {boolean}
         */
        sap.ui2.srvc.testPublishAt(that);
        function isWrapperOnly(oTile) {
            // Note: getLayoutData() not relevant for LaunchPage service
            //       getTitle() relevant, but difficult and always together with getConfiguration()
            //       getBagIds() difficult due to CHIP bags, but not needed for our goal
            return !oTile.getConfiguration();
        }

        /**
         * Wraps the given CHIPs as CHIP instances, filtering out action CHIPs.
         *
         * @param {sap.ui2.srvc.Chip[]} aChips array of chips
         * @returns {sap.ui2.srvc.ChipInstance[]} array of chip instances
         */
        function wrapAsChipInstances(aChips) {
            var aChipInstances = [],
                oFactory = sap.ushell.Container.getService("PageBuilding").getFactory();

            aChips.forEach(function (oChip) {
                var oRemoteCatalog = oChip.getRemoteCatalog(),
                    oChipInstance;
                //Action CHIP filtered out in catalog; can thus also not be added to any group
                if (oChip.getBaseChipId() === "X-SAP-UI2-CHIP:/UI2/ACTION") {
                    return;
                }
                oChipInstance = oFactory.createChipInstance({
                    chipId: oChip.getId(),
                    remoteCatalogId: oRemoteCatalog && oRemoteCatalog.getId()
                });
                aChipInstances.push(oChipInstance);
            });

            return aChipInstances;
        }

        /**
         * Wraps the current <code>allCatalogs</code> collection into black box objects.
         *
         * @returns {Array}
         *
         * TODO cache result?!
         */
        function wrapCatalogs() {
            var oAllCatalogs = oCurrentPageSet.getDefaultPage().getAllCatalogs(),
                oCatalog,
                aCatalogs = oAllCatalogs.getCatalogs(),
                aWrappedCatalogs = [],
                i;

            for (i = 0; i < aCatalogs.length; i += 1) {
                oCatalog = aCatalogs[i];
                // handle catalog stubs gracefully
                aWrappedCatalogs.push({
                    data: {}, //TODO find out what shall be inside this property?
                    errorMessage: undefined,
                    id: oCatalog.getId(),
                    title: oCatalog.isStub()
                        ? oCatalog.getId() // title not available, use ID instead
                        : oCatalog.getTitle(),
                    tiles: oCatalog.isStub()
                        ? []
                        : wrapAsChipInstances(oCatalog.getChips()),
                    ui2catalog: oCatalog //for convenience
                });
            }

            return aWrappedCatalogs;
        }

        /**
         * Tells whether the given CHIP instance is a static or dynamic app launcher
         * @param {sap.ui2.srvc.ChipInstance} oChipInstance
         * @returns {boolean}
         */
        function isAppLauncher(oChipInstance) {
            var sBaseChipId = oChipInstance.getChip().getBaseChipId();
            return sBaseChipId === sDYNAMIC_BASE_CHIP_ID || sBaseChipId === sSTATIC_BASE_CHIP_ID;
        }

        /**
         * Tells whether the given CHIP instance is remote
         * @param {sap.ui2.srvc.ChipInstance} oChipInstance
         * @returns {boolean}
         */
        function isRemoteChipInstance(oChipInstance) {
            return !!oChipInstance.getChip().getRemoteCatalog();
        }


        /**
         * Tells whether the given CHIP instance is not loadable.
         * This means it's data from the OData Service could not be loaded.
         *
         * Note: If this method returns false does not mean that the later loading will not fail
         *
         * @param {sap.ui2.srvc.ChipInstance} oChipInstance
         * @returns {boolean}
         */
        function isBrokenChip(oChipInstance) {
            // alternative: !oChipInstance.getChip().isInitiallyDefined();
            return !isRemoteChipInstance(oChipInstance) && oChipInstance.getChip().getBaseChipId() === undefined;
        }

        /**
         * Returns the tile configuration of the given (app launcher) CHIP
         * instance. It logs an error message if the tile configuration cannot
         * be parsed.
         *
         * @param {sap.ui2.srvc.ChipInstance} oChipInstance
         *   must not be a stub anymore. Also it's CHIP must not be a stub anymore.
         *
         * @returns {object}
         *   the tile configuration
         */
        function getAppLauncherTileConfiguration(oChipInstance) {
            var oParsedTileConfiguration,
                sConfigParam = oChipInstance.getConfigurationParameter("tileConfiguration");
            try {
                oParsedTileConfiguration = JSON.parse(sConfigParam || "{}");
            } catch (oEx) {
                jQuery.sap.log.error("Tile with ID '" + oChipInstance.getId() +
                    "' has a corrupt configuration containing a 'tileConfiguration' value '" + sConfigParam +
                    "' which could not be parsed. If present, a (stringified) JSON is expected as value.",
                    oEx.message,
                    "sap.ushell_abap.adapters.abap.LaunchPageAdapter"
                );
                return {}; // the FLP must react robust on broken single tiles
            }
            return oParsedTileConfiguration;
        }

        /**
         * Returns the tile configuration of the given custom CHIP
         * instance, but only if it uses the same configuration structure
         * as the standard static and dynamic app launcher.
         *
         * @param {sap.ui2.srvc.ChipInstance} oChipInstance
         *   It's CHIP may still be a stub.
         *
         * @returns {object}
         *   the tile configuration or an empty object
         */
        function getCustomTileConfiguration(oChipInstance) {
            var oParsedTileConfiguration,
                oConfigParam;

            try {
                // Try to read the configuration string from the CHIP, if the CHIP sticks to the same configuration
                // structure as the SAP app launcher tiles, it may benefit from special treatment.
                // _getChipRawConfigurationString is used to avoid that the getChip().load() must be called
                // which will load the CHIP definition XML, which would end up in additional requests at
                // in case this method is called during critical FLP start-up time.
                // Drawback: Configuration defaults (which are usually not used in Fiori) from CHIP
                // definition XML are ignored here.
                oConfigParam = JSON.parse(oChipInstance.getChip()._getChipRawConfigurationString());
                oParsedTileConfiguration = JSON.parse(oConfigParam && oConfigParam.tileConfiguration || "{}");
            } catch (oEx) {
                // Custom tiles may or may not stick to the app launcher's configuration format
                return {};
            }

            return oParsedTileConfiguration;
        }

        /**
         * Identifies the parts of a full chip id.
         *
         * @param {string} sFullId
         *   A chip id, a string like:
         *   <ul>
         *      <li>X-SAP-UI2-PAGE:X-SAP-UI2-CATALOGPAGE:/UI2/FLP_DEMO_WDA_GUI:00O2TR99M0M42Q9E2AF196A2D</li>
         *      <li>X-SAP-UI2-CATALOGPAGE:/UI2/FLP_DEMO_WDA_GUI:00O2TR99M0M42Q9E2AF196A2D</li>
         *      <li>X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER</li>
         *   </ul>
         *
         * @return {object}
         *   The parts that make up the full chip id. An object like:
         *   <pre>
         *   {
         *      id: "00O2TR99M0M42Q9E2AF196A2D",
         *      catalog: "X-SAP-UI2-CATALOGPAGE:/UI2/FLP_DEMO_WDA_GUI",
         *      prefix: "X-SAP-UI2-PAGE" // or null
         *   }
         *   </pre>
         */
        this._parseFullChipId = function (sFullId) {
            var aSplit = sFullId.split(":"),
                sId = aSplit.pop(),
                sPrefix = null;

            if (aSplit.length > 2) {
                sPrefix = aSplit.shift();
            }

            return {
                id: sId,
                prefix: sPrefix,
                catalog: aSplit.join(":")
            };
        };

        /**
         * Extracts catalog id and chip is from a text.
         *
         * This method logs a warning if the input text is not as expected.
         *
         * @param {string} sReferenceLost
         *   A text indicating that a certain reference is lost.
         *   The text is assumed to be a string in the format:
         *   'Reference lost: Note <NUMBER> Page <CATALOG_ID> , Instance ID <CHIP_ID>'
         *
         * @return {object}
         *   The catalog id and the chip id, in an object like:
         *   <pre>
         *   {
         *      id: <CHIP_ID>,
         *      catalog: <CATALOG_ID>
         *   }
         *   </pre>
         *
         *   or as follows in case <code>sReferenceLost</code> is not in the
         *   expected format:
         *   <pre>
         *   {
         *      id: "Unknown",
         *      catalog: "Unknown"
         *   }
         *   </pre>
         *
         * @private
         */
        this._parseReferenceLost = function (sReferenceLost) {
            var aCatalogAndChipId;

            var sReferenceLostSafe = sReferenceLost || Object.prototype.toString.apply(sReferenceLostSafe);

            if (!sReferenceLostSafe.match(/^Reference lost: Note \d+ Page.+\s,\sInstance ID.+$/)) {
                jQuery.sap.log.warning(
                    "The string that describes a lost reference is in an unexpected format",
                    "This is expected to be a string exactly like 'Reference lost: Note <#> Page <CATALOG_ID> , Instance ID <CHIP_ID>' instead of the given '" + sReferenceLost + "'",
                    "sap.ushell_abap.adapters.abap.LaunchPageAdapter"
                );

                return {
                    id: "Unknown",
                    catalog: "Unknown"
                };
            }

            aCatalogAndChipId = sReferenceLostSafe.split(" , ").map(function (sPart) {
                return sPart.split(" ").pop();
            });

            return {
                id: aCatalogAndChipId[1],
                catalog: aCatalogAndChipId[0]
            };
        };


        /**
         * Flattens an array of items (deeply nested at any level).
         *
         * @param {array} aItems
         *   An array of items to flatten
         *
         * @returns {array}
         *   The flattened array of items
         */
        this._flattenArray = function (aItems) {
            var that = this;

            if (Object.prototype.toString.apply(aItems) !== "[object Array]") {
                return aItems;
            }

            return aItems.reduce(function (aFlattened, vItem) {
                return aFlattened.concat(that._flattenArray(vItem));
            }, [] /* oResult */);
        };

        /**
         * Finds and reports possible tile errors in a given PageSet object.
         *
         * <p>
         * It logs at most two messages (one warning and one error), grouping
         * errors by groups and error type.
         * </p>
         *
         * @param {sap.ui2.srvc.Page[]} aPages
         *    an array of all the pages.
         * @param {sap.ui2.srvc.Map} oTargetMappingSupport
         *   a map containing whether an intent is supported taking into
         *   account its form factor.
         *
         * @private
         */
        this._findAndReportTileErrors = function (aPages, oTargetMappingSupport) {
            var aGroupTileErrors;

            aGroupTileErrors = this._getPossibleTileErrors(
                aPages,
                oTargetMappingSupport
            );

            if (aGroupTileErrors.length > 0) {
                this._reportTileErrors(aGroupTileErrors);
            }
        };


        /**
         * Finds errors on tiles in all Groups.
         *
         * @param {array} aPages
         *   an array of <code>sap.ui2.srvc.Page</code> objects representing
         *   groups of tiles.
         *
         * @param {sap.ui2.srvc.Map} oTargetMappingSupport
         *   a map containing whether an intent is supported taking into
         *   account its form factor.
         *
         * @returns {array}
         *   An array describing each error found.
         *
         * @private
         */
        this._getPossibleTileErrors = function(aPages, oTargetMappingSupport) {
            var that = this;

            return aPages.map(function (oPage) {
                return {
                    group: { id: oPage.getId(), title: oPage.getTitle() },
                    errors: that._getPossibleTileErrorsFromOnePage(oPage, oTargetMappingSupport)
                };
            });
        };

        /**
         * Finds possible errors on tiles in a given Group.
         *
         * @param {object} oPage
         *   an <code>sap.ui2.srvc.Page</code> object representing a
         *   group of tiles.
         *
         * @param {sap.ui2.srvc.Map} oTargetMappingSupport
         *   a map containing whether an intent is supported taking into
         *   account its form factor.
         *
         * @returns {array}
         *   An array describing each error found
         *
         * @private
         */
        this._getPossibleTileErrorsFromOnePage = function (oPage, oTargetMappingSupport) {
            var that = this;

            var aErrors = oPage.getChipInstances().reduce(function (aResult, oChipInstance) {
                var oTileSupport,
                    oChipId,
                    sSubTitle,
                    sTitle,
                    oLostReference,
                    oTileConfiguration,
                    sRawTileConfiguration,
                    oChip;

                oChip = oChipInstance.getChip();
                oChipId = that._parseFullChipId(oChip.getId());

                // The PageSets request uses $expand on Chips which means Chip
                // data should be included in the response.
                if (!oChip.isInitiallyDefined()) {
                    // i.e., chip === null
                    aResult.push({
                        type: O_ERROR_TYPES.catalogTileNotFound,
                        chipInstanceId: oChipInstance.getId(),
                        chipId: oChipId.id,
                        chipCatalogId: oChipId.catalog
                    });

                } else if (oChip.isReference() && oChip.isBrokenReference()) {
                    // title is guaranteed to be a string like:
                    // Reference lost: Page <PREFIX>:<CATALOG_ID> , Instance ID <CHIP_ID>
                    oLostReference = that._parseReferenceLost(oChip.getTitle());

                    aResult.push({
                        type: O_ERROR_TYPES.referenceTileNotFound,
                        chipInstanceId: oChipInstance.getId(),
                        referenceChipId: oChipId.id,
                        referenceChipCatalogId: oChipId.catalog,
                        missingReferredChipId: oLostReference.id,
                        missingReferredCatalogId: oLostReference.catalog
                    });

                } else {

                    try {
                        oTileSupport = that._checkTileIntentSupport(oChipInstance, oTargetMappingSupport);
                    } catch (oError) {
                        oTileSupport = {
                            isSupported: false,
                            reason: O_ERROR_TYPES.tileIntentSupportException,
                            exception: oError
                        };
                    }

                    if (!oTileSupport.isSupported) {
                        sTitle = getBagText(oChipInstance, "tileProperties", "display_title_text");
                        sSubTitle = getBagText(oChipInstance, "tileProperties", "display_subtitle_text");
                        switch (oTileSupport.reason) {
                            case O_ERROR_TYPES.noTargetMapping:
                                if (isAppLauncher(oChipInstance)) {
                                    oTileConfiguration = getAppLauncherTileConfiguration(oChipInstance);
                                } else {
                                    oTileConfiguration = getCustomTileConfiguration(oChipInstance);
                                }
                                aResult.push({
                                    type: O_ERROR_TYPES.noTargetMapping,
                                    chipInstanceId: oChipInstance.getId(),
                                    chipInstanceTitle: sTitle || oTileConfiguration.display_title_text || oChipInstance.getTitle(),
                                    chipInstanceSubtitle: sSubTitle || oTileConfiguration.display_subtitle_text,
                                    tileURL: oTileConfiguration.navigation_target_url ||
                                        "#" + oTileConfiguration.navigation_semantic_object +
                                        "-" + oTileConfiguration.navigation_semantic_action +
                                        (oTileConfiguration.navigation_semantic_parameters ? "?" + oTileConfiguration.navigation_semantic_parameters : "")
                                });
                                break;
                            case O_ERROR_TYPES.emptyConfiguration:
                                sRawTileConfiguration = oChipInstance.getConfigurationParameter("tileConfiguration");
                                aResult.push({
                                    type: O_ERROR_TYPES.emptyConfiguration,
                                    chipInstanceId: oChipInstance.getId(),
                                    chipInstanceTitle: sTitle || oChipInstance.getTitle(),
                                    chipInstanceSubtitle: sSubTitle || null,
                                    tileConfiguration: sRawTileConfiguration
                                });
                                break;
                            case O_ERROR_TYPES.tileIntentSupportException:
                                aResult.push({
                                    type: O_ERROR_TYPES.tileIntentSupportException,
                                    exception: oTileSupport.exception,
                                    chipInstanceId: oChipInstance.getId()
                                });
                                break;
                            case O_ERROR_TYPES.referenceTileNotFound:
                                // ignored because it's already handled above
                                // (for all tiles - not just AppLaunchers).
                                break;
                            default:
                                // nop
                        }
                    }
                }

                return aResult;

            }, [] /* aResult */);

            return aErrors;
        };

        /**
         * Formats information about one error into a string.
         *
         * @param {object} oTileError
         *
         * An object representing tile errors
         */
        this._formatTileError = function (oTileError) {
            switch (oTileError.type) {
                case O_ERROR_TYPES.catalogTileNotFound:
                    return "comes from catalog tile with ID '" + oTileError.chipId +
                        "' but this cannot be found in catalog '" + oTileError.chipCatalogId + "' (CATALOG TILE NOT FOUND).";
                case O_ERROR_TYPES.referenceTileNotFound:
                    return "comes from reference tile '" + oTileError.referenceChipId + "'" +
                          " in catalog '" + oTileError.referenceChipCatalogId + "'" +
                          " which in turn refers to the tile '" + oTileError.missingReferredChipId + "'" +
                          " from catalog '" + oTileError.missingReferredCatalogId + "', but this is missing (REFERENCED TILE NOT FOUND).";
                case O_ERROR_TYPES.noTargetMapping:
                    return "was hidden because a target mapping for the tile URL '" + oTileError.tileURL + "' was not found (TARGET MAPPING NOT FOUND).";
                case O_ERROR_TYPES.emptyConfiguration:
                    return "the tile configuration '" + oTileError.tileConfiguration + "' is empty or invalid (BAD CONFIGURATION).";
                case O_ERROR_TYPES.tileIntentSupportException:
                    return "exception occurred while checking tile intent support: " + oTileError.exception + " (EXCEPTION RAISED).";
                default:
                    return "unknown error type '" + oTileError.type + "' (UNKNOWN ERROR). Error data: " + JSON.stringify(oTileError, null, 3);
            }
        };

        /**
         * Logs a warning or an error message about possible tile errors.
         *
         * @param {array} aErrorsByGroup
         *    an array containing information about errors within one group
         * @private
         */
        this._reportTileErrors = function (aErrorsByGroup) {
            var that = this;
            var aWarningMessage = [];
            var aErrorMessage = [];

            // constructs a string like "Title (Subtitle)"
            function constructTileTitle(sTitle, sSubtitle) {
                var sCombined = [ sTitle, sSubtitle ]
                    .map(function (s, i) {
                        return i === 1 && s ? "(" + s + ")" : s;
                    })
                    .filter(function (s) {
                        return typeof s === "string" && s.length > 0;
                    })
                    .join(" ");

                return sCombined.length > 0
                    ? "'" + sCombined + "'"
                    : "";
            }

            aErrorsByGroup.forEach(function (oErrorByGroup) {
                var sGroupInformation = "  in Group '" + oErrorByGroup.group.title + "' with Group ID '" + oErrorByGroup.group.id + "'",
                    aGroupErrorMessage = [],
                    aGroupWarningMessage = [];

                oErrorByGroup.errors.forEach(function (oError) {
                    var sTileIdentifier = [
                        "  - tile instance",
                        constructTileTitle(oError.chipInstanceTitle, oError.chipInstanceSubtitle),
                        "with ID '" + oError.chipInstanceId + "'"
                    ]
                    .filter(function (s) { return s.length > 0; })
                    .join(" ");

                    if (oError.type === O_ERROR_TYPES.noTargetMapping) {
                        aGroupWarningMessage.push([
                            sTileIdentifier,
                            "    " + that._formatTileError(oError)
                        ].join("\n"));
                    } else {
                        aGroupErrorMessage.push([
                            sTileIdentifier,
                            "    " + that._formatTileError(oError)
                        ].join("\n"));
                    }
                });

                if (aGroupErrorMessage.length > 0) {
                    aErrorMessage.push([
                        sGroupInformation,
                        aGroupErrorMessage.join("\n")
                    ].join("\n"));
                }
                if (aGroupWarningMessage.length > 0) {
                    aWarningMessage.push([
                        sGroupInformation,
                        aGroupWarningMessage.join("\n")
                    ].join("\n"));
                }
            });

            if (aErrorMessage.length > 0) {
                aErrorMessage.unshift("Tile error(s) were detected:");
                jQuery.sap.log.error(aErrorMessage.join("\n"), null, "sap.ushell_abap.adapters.abap.LaunchPageAdapter");
            }

            if (aWarningMessage.length > 0) {
                aWarningMessage.unshift("Tile warning(s) were detected:");
                jQuery.sap.log.warning(aWarningMessage.join("\n"), null, "sap.ushell_abap.adapters.abap.LaunchPageAdapter");
            }
        };

        /**
         * Returns the groups of the user. This is an asynchronous function using a jQuery.Promise.
         * In case of success its <code>done</code> function is called and gets an array of
         * <code>sap.ui2.srvc.Page</code> objects. These page objects can be passed in to all
         * functions expecting a group.
         *
         * The first group in this list is considered the default group.
         *
         * In case of error the promise's <code>fail</code> function is called.
         *
         * @returns {object}
         *  jQuery.Promise object.
         * @since 1.11.0
         */
        this.getGroups = function () {
            var that = this,
                oDeferred, // the deferred used for page set loading
                oMappingPromise, // the promise of readMappingTargets
                oUshellPbs, // ushell service PageBuilding
                oPageSetsPromise;

            if (bPageSetFullyLoaded) {
                // return the already known page set (the order is recomputed because the page set
                // might have changed it since the last call)
                return (new jQuery.Deferred()).resolve(getOrderedPages()).promise();
            }
            if (!oGetGroupsDeferred) {
                // start a new request and remember it in oGetGroupsDeferred, so that parallel
                // calls don't start another one
                oGetGroupsDeferred = new jQuery.Deferred();
                oDeferred = new jQuery.Deferred();
                oUshellPbs = sap.ushell.Container.getService("PageBuilding");

                if (oLaunchPageServiceConfig && oLaunchPageServiceConfig.cacheId) {
                    // add PageSet cache buster token if configured
                    oUshellPbs.getFactory().getPageBuildingService().readPageSet.cacheBusterTokens
                        .put(sDEFAULT_PAGE_ID, oLaunchPageServiceConfig.cacheId);
                }
                if (oLaunchPageServiceConfig && oLaunchPageServiceConfig["sap-ui2-cache-disable"]
                    && oUshellPbs.getFactory().getPageBuildingService().readPageSet) {
                    oUshellPbs.getFactory().getPageBuildingService().readPageSet.appendedParameters =
                        { "sap-ui2-cache-disable" : oLaunchPageServiceConfig["sap-ui2-cache-disable"] };
                }

                oPageSetsPromise = oUshellPbs.getPageSet(sDEFAULT_PAGE_ID);

                oPageSetsPromise
                    .fail(oDeferred.reject.bind(oDeferred))
                    .done(function (oPageSet) {

                        oCurrentPageSet = oPageSet;
                        // remove unsupported pages before loading their chip instances
                        oCurrentPageSet.filter([sDEFAULT_PAGE_ID], [sDEFAULT_CATALOG_ID]);
                        // Trigger load of all CHIP instances, but wait for the locals only
                        loadApplaunchersAndDelayLoadingOfOtherChips(oPageSet.getPages(),
                            oDeferred.resolve.bind(oDeferred, oPageSet));
                    });

                oMappingPromise = readTargetMappings().done(function (oTargetMappings) {
                    var sFormFactor = sap.ui2.srvc.getFormFactor();

                    oTargetMappings.results.forEach(function (oTargetMapping) {
                        var sKey = makeTargetMappingSupportKey(
                            oTargetMapping.semanticObject,
                            oTargetMapping.semanticAction
                        );

                        oTargetMappingSupport.put(sKey,
                            // make sure it's boolean
                            oTargetMappingSupport.get(sKey)
                            || !!(oTargetMapping.formFactors && oTargetMapping.formFactors[sFormFactor]));
                    });
                });

                jQuery.when(oMappingPromise, oDeferred)
                    .done(function (oTargetMappings /* unused */, oPageSet) {
                        bPageSetFullyLoaded = true;

                        if (jQuery.sap.log.getLevel() >= jQuery.sap.log.Level.DEBUG) { // sap-ui-debug = true
                            that._findAndReportTileErrors(oPageSet.getPages(), oTargetMappingSupport);
                        }

                        oGetGroupsDeferred.resolve(getOrderedPages());
                    })
                    .fail(oGetGroupsDeferred.reject.bind(oGetGroupsDeferred));
            }
            return oGetGroupsDeferred.promise();
        };


        /**
         * Returns the default group. This is an asynchronous function using a jQuery.Promise.
         * In case of success its <code>done</code> function is called and gets the
         * <code>sap.ui2.srvc.Page</code> object representing the default group.
         *
         * In case of error the promise's <code>fail</code> function is called.
         *
         * @returns {object}
         *  jQuery.Promise object.
         * @since 1.11.0
         */
        this.getDefaultGroup = function () {
            var oDeferred = new jQuery.Deferred();

            this.getGroups().done(function () {
                //TODO test if getGroups()[0] is faster than getDefaultPage
                oDeferred.resolve(oCurrentPageSet.getDefaultPage());
            }).fail(oDeferred.reject.bind(oDeferred));

            return oDeferred.promise();
        };

        /**
         * Returns the title of the given group.
         *
         * @param {sap.ui2.srvc.Page} oGroup
         *     the group (as received via #getGroups())
         * @returns {string}
         *     the group title
         * @since 1.11.0
         */
        this.getGroupTitle = function (oGroup) {
            return oGroup.getTitle();
        };

        /**
         * Returns the unique identifier of the given group.
         *
         * @param {sap.ui2.srvc.Page} oGroup
         *     the group (as received via #getGroups())
         * @returns {string}
         *     the group id
         * @since 1.11.0
         */
        this.getGroupId = function (oGroup) {
            return oGroup.getId();
        };

        /**
         * Returns the tiles of the given group.
         *
         * @param {sap.ui2.srvc.Page} oGroup
         *     the group
         * @returns {sap.ui2.srvc.ChipInstance[]}
         *     the tiles in the order to be displayed.
         * @since 1.11.0
         */
        this.getGroupTiles = function (oGroup) {
            var oLayout;

            try {
                oLayout = JSON.parse(oGroup.getLayout());
            } catch (e) {
                jQuery.sap.log.warning("Group " + oGroup.getId() + ": invalid layout: "
                        + oGroup.getLayout(), null, sCOMPONENT);
                // no valid layout
            }
            return orderBasedOnConfiguration(oLayout, oGroup.getChipInstances());
        };

        /**
         * Adds a new group. This is an asynchronous function using a jQuery.Promise. In case of
         * success its <code>done</code> function is called and gets the added group as a
         * <code>sap.ui2.srvc.Page</code>.
         *
         * Intention: the page builder adds this group to the end of the home screen.
         *
         * In case of error the promise's <code>fail</code> function is called and gets the
         * consistent backend state of all groups as array of <code>sap.ui2.srvc.Page</code>.
         *
         * @param {string} sTitle
         *     the title of the new group
         * @returns {object}
         *     a jQuery.Promise.
         * @since 1.11.0
         */
        this.addGroup = function (sTitle) {
            var oDeferred = new jQuery.Deferred();

            oCurrentPageSet.appendPage(sTitle, sDEFAULT_CATALOG_ID,
                oDeferred.resolve.bind(oDeferred),
                oDeferred.reject.bind(oDeferred, getOrderedPages()));

            return oDeferred.promise();
        };


        /**
         * Removes a group. This is an asynchronous function using a jQuery.Promise. In case of
         * success its <code>done</code> function is called.
         *
         * In case of error the promise's <code>fail</code> function is called and gets the
         * consistent backend state of all groups as array of <code>sap.ui2.srvc.Page</code>.
         *
         * @param {object} oGroup
         *     the group to be removed
         * @returns {object}
         *     a jQuery.Promise
         * @since 1.11.0
         */
        this.removeGroup = function (oGroup) {
            var oDeferred = new jQuery.Deferred();

            if (oCurrentPageSet.isPageRemovable(oGroup)) {
                oCurrentPageSet.removePage(oGroup, oDeferred.resolve.bind(oDeferred),
                    oDeferred.reject.bind(oDeferred, getOrderedPages()));
            } else {
                oDeferred.reject(getOrderedPages());
            }
            return oDeferred.promise();
        };

        /**
         * Resets a group. Only groups can be reset for which <code>isGroupRemovable</code> returns
         * false. For others the fail handler is called.
         * This is an asynchronous function using a jQuery.Promise. In case of
         * success its <code>done</code> function is called.
         *
         * In case of error the promise's <code>fail</code> function is called and gets the
         * consistent backend state of all groups as array of <code>sap.ui2.srvc.Page</code>.
         *
         * @param {sap.ui2.srvc.Page} oGroup
         *     the group to be reset
         * @returns {object}
         *     a jQuery.Promise
         * @since 1.11.0
         */
        this.resetGroup = function (oGroup) {
            var oDeferred = new jQuery.Deferred();

            if (oCurrentPageSet.isPageRemovable(oGroup)) {
                // pages which are removable should be removed and cannot be reset
                oDeferred.reject(getOrderedPages());
            } else if (oCurrentPageSet.isPageResettable(oGroup)) {
                // pages which are resettable should be reset
                oCurrentPageSet.resetPage(oGroup, function () {
                    loadApplaunchersAndDelayLoadingOfOtherChips([oGroup],
                        oDeferred.resolve.bind(oDeferred, oGroup));
                }, oDeferred.reject.bind(oDeferred, getOrderedPages()));
            } else {
                // on all other pages an reset has simply no effect
                oDeferred.resolve();
            }

            return oDeferred.promise();
        };

        /**
         * Checks if a group can be removed. Returns a boolean indicating if the group is removable.
         *
         * @param {object} oGroup
         *     the group to be checked
         * @return {boolean}
         *  true if removable; false if only resettable
         * @since 1.11.0
         */
        this.isGroupRemovable = function (oGroup) {
            return oCurrentPageSet.isPageRemovable(oGroup);
        };

        /**
         * Checks if a group is locked (which means that the group is not changeable). Returns a boolean indicating this issue.
         *
         * @param {object} oGroup
         *     the group to be checked
         * @return {boolean}
         *  true if locked; false if not locked
         * @since 1.25.0
         */
        this.isGroupLocked = function (oGroup) {
            return oGroup.isPersonalizationLocked();
        };

        /**
         * Returns <code>true</code> if the tile's target intent is supported
         * taking into account the form factor of the current device.
         *
         * "Supported" means that the tile is not a broken reference
         * and that navigation to the intent is possible.
         *
         * <p>
         * This function may be called both for group tiles and for catalog tiles.
         *
         * <p>
         * This function will log a warning if a falsy value is returned.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *   the group tile or catalog tile
         * @returns {boolean}
         *   <code>true</code> if the tile's target intent is supported
         * @since 1.21.0
         */
        this.isTileIntentSupported = function (oTile) {
            var oTileConfiguration,
                sIntent,
                sSubTitle,
                sTitle;

            var oSupport = this._checkTileIntentSupport(oTile, oTargetMappingSupport);

            if (!oSupport.isSupported && oSupport.reason === O_ERROR_TYPES.noTargetMapping) {
                if (isAppLauncher(oTile)) {
                    oTileConfiguration = getAppLauncherTileConfiguration(oTile);
                } else {
                    oTileConfiguration = getCustomTileConfiguration(oTile);
                }
                sTitle = getBagText(oTile, "tileProperties", "display_title_text") || oTileConfiguration.display_title_text;
                sSubTitle = getBagText(oTile, "tileProperties", "display_subtitle_text") || oTileConfiguration.display_subtitle_text;
                sIntent = oTileConfiguration.navigation_target_url;

                // This error is already logged in an aggregated log message by _reportTileErrors, but we keep it
                // because tiles may be added to the FLP home at a later point of time within the session (not covered by
                // the other log).
                jQuery.sap.log.warning("Group tile with ID '" + oTile.getId() + "' is filtered out as the current user has no target mapping assigned for the intent '" +
                        sIntent + "'",
                        "\nGroup Tile ID: '" + oTile.getId() + "'\n" +
                        "Title: '" + sTitle + "'\n" +
                        "Subtitle: '" + sSubTitle + "'\n" +
                        "Intent: '" + sIntent + "' - ",
                        "sap.ushell_abap.adapters.abap.LaunchPageAdapter");
            }

            return oSupport.isSupported;
        };

        /**
         * Implements the functionality described in the public
         * <code>#isTileIntentSupported</code> without logging.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *   the group tile or catalog tile
         *
         * @param {sap.ui2.srvc.Map} oTargetMappingSupport
         *   the tile target mapping support
         *
         * @returns {object}
         *   An object reporting the support of the tile intent that looks like
         *   the following objects based on whether the tile intent is
         *   supported:
         *   <pre>
         *   {
         *      isSupported: true
         *   }
         *   </pre>
         *   or
         *   <pre>
         *   {
         *      isSupported: false,
         *      reason: "<REASON>"
         *   }
         *   </pre>
         *   Where "<REASON>" is one of the following strings:
         *   <ul>
         *       <li>"brokenReference": the group tile references to a catalog
         *       reference tile that refers to a non-existing tile</li>
         *       <li>"emptyConfiguration": the tile configuration was found to be
         *       empty</li>
         *       <li>"noTargetMapping": no matching target mapping corresponds to
         *       the given group tile</li>
         *   </ul>
         * @private
         *
         * @see sap.ushell.services.LaunchPage#isTileIntentSupported
         */
        this._checkTileIntentSupport = function (oTile, oTargetMappingSupport) {
            var oTileConfiguration,
                bIsTileIntentSupported;

            var fnMkKey = makeTargetMappingSupportKey;

            if (!isAppLauncher(oTile)) {

                // Try to read the configuration string from the CHIP, if the CHIP sticks to the same configuration
                // structure as the SAP app launcher tiles, it may be filtered in case it launches a intent which is
                // not assigned.
                oTileConfiguration = getCustomTileConfiguration(oTile);
                if (!oTileConfiguration.navigation_use_semantic_object || !oTileConfiguration.navigation_semantic_object ||
                    !oTileConfiguration.navigation_semantic_action) {
                    // This tile does not launch an intent, so it will never be filtered
                    return {
                        isSupported: true
                    };
                }

                bIsTileIntentSupported = oTargetMappingSupport.get(fnMkKey(
                    oTileConfiguration.navigation_semantic_object,
                    oTileConfiguration.navigation_semantic_action
                ));

                if (!bIsTileIntentSupported) {
                    return {
                        isSupported: false,
                        reason: O_ERROR_TYPES.noTargetMapping
                    };
                }

                // Only for app launchers we are able to detect if they launch
                // a "valid" intent. For other tiles we do not even know if and
                // what will be launched, as it is a tile internal information.
                return {
                    isSupported: true
                };
            }
            if (oTile.isStub()) {
                // the assumption is that currently launcher tiles are always local CHIPs and for
                // those getGroups is waiting. Thus this Error should newer be reached.
                // If stub launchers shall be supported, it must found a way how to decided if they
                // are supported.
                throw new sap.ui2.srvc.Error("Applauncher Tile not loaded completely",
                    "sap.ushell_abap.adapters.abap.LaunchPageAdapter");
            }

            if (oTile.getChip() && typeof oTile.getChip().isBrokenReference === "function" && oTile.getChip().isBrokenReference()) {
                return {
                    isSupported: false,
                    reason: O_ERROR_TYPES.referenceTileNotFound
                };
            }

            oTileConfiguration = getAppLauncherTileConfiguration(oTile);

            if (jQuery.isEmptyObject(oTileConfiguration)) {
                // it seems as if there was an error in getAppLauncherTileConfiguration
                // the app launcher has no valid configuration, so hide it
                return {
                    isSupported: false,
                    reason: O_ERROR_TYPES.emptyConfiguration
                };
            }

            if (!oTileConfiguration.navigation_use_semantic_object) {
                // the tile launches an arbitrary URL which is always supported
                return {
                    isSupported: true
                };
            }

            bIsTileIntentSupported = oTargetMappingSupport.get(fnMkKey(
                oTileConfiguration.navigation_semantic_object,
                oTileConfiguration.navigation_semantic_action
            ));

            if (bIsTileIntentSupported) {
                return {
                    isSupported: true
                };
            }

            return {
                isSupported: false,
                reason: O_ERROR_TYPES.noTargetMapping
            };
        };

        /**
         * Moves a group to a new index. This is an asynchronous function using a jQuery.Promise.
         * In case of success its <code>done</code> function is called.
         *
         * In case of error the promise's <code>fail</code> function is called and gets the
         * consistent backend state of all groups as array of <code>sap.ui2.srvc.Page</code>.
         *
         * @param {object} oGroup
         *     the group to be moved
         * @param {integer} iNewIndex
         *     the new index for the group
         * @returns {object}
         *     a jQuery.Promise
         * @since 1.11.0
         */
        this.moveGroup = function (oGroup, iNewIndex) {
            // see wiki UICEI/PageSets+and+Groups#PageSetsandGroups-Rearrangegroupsonthehomepage
            var oDeferred = new jQuery.Deferred();

            function updateConfiguration(aPages) {
                var oConf,
                    aIds = [];

                aPages.forEach(function (oPage) {
                    aIds.push(oPage.getId());
                });

                // save new order without overwriting other parts of the configuration
                oConf = JSON.parse(oCurrentPageSet.getConfiguration() || "{}");
                oConf.order = aIds;
                oCurrentPageSet.setConfiguration(JSON.stringify(oConf),
                    oDeferred.resolve.bind(oDeferred),
                    oDeferred.reject.bind(oDeferred, getOrderedPages()));
            }

            this.getGroups().done(function (aPages) {
                var iIndex = aPages.indexOf(oGroup);

                aPages.splice(iIndex, 1);
                aPages.splice(iNewIndex, 0, oGroup);
                updateConfiguration(aPages);
            });

            return oDeferred.promise();
        };

        /**
         * Sets a new title to an existing group. This is an asynchronous function using a
         * jQuery.Promise. In case of success its <code>done</code> function is called.
         *
         * In case of error the promise's <code>fail</code> function is called and gets the
         * old title.
         *
         * @param {string} sTitle
         *     the new title of the group
         * @param {object} oGroup
         *     the group we need to set the title
         * @returns {object}
         *     a jQuery.Promise
         * @since 1.11.0
         */
        this.setGroupTitle = function (oGroup, sNewTitle) {

            var oDeferred = new jQuery.Deferred();

            oGroup.setTitle(sNewTitle,
                oDeferred.resolve.bind(oDeferred),
                function () { oDeferred.reject(oGroup.getTitle()); });

            return oDeferred.promise();

        };

        /**
         * Adds a tile to the end of a group. The group is optional. If no group is given, use
         * the default group. This is an asynchronous function using a jQuery.Promise. In case
         * of success its <code>done</code> function is called and gets the new tile as a
         * <code>sap.ui2.srvc.ChipInstance</code>.
         *
         * In case of error the promise's <code>fail</code> function is called and gets the
         * consistent backend state of all groups as array of <code>sap.ui2.srvc.Page</code>.

         * @param {sap.ui2.srvc.ChipInstance} oCatalogTile
         *     an 'anonymous' catalog tile from the catalog browser
         * @param {sap.ui2.srvc.Page} [oGroup]
         *     the group
         * @returns {object}
         *     a jQuery.Promise
         * @since 1.11.0
         */
        this.addTile = function (oCatalogTile, oGroup) {
            var oDeferred = new jQuery.Deferred(),
                oChip = oCatalogTile.getChip(); // unwrap (see wrapAsChipInstances)

            if (oCatalogTile.isStub()) {
                // this is a "Cannot load tile" tile, this should not be added to the group
                // BCP 1670300106
                oDeferred.reject(getOrderedPages(),
                    "Tile was not added to the group as the tile failed loading");
            } else {
                if (!oGroup) {
                    oGroup = oCurrentPageSet.getDefaultPage();
                }

                oGroup.addChipInstance(oChip,
                    oDeferred.resolve.bind(oDeferred),
                    oDeferred.reject.bind(oDeferred, getOrderedPages()));
            }

            return oDeferred.promise();
        };

        /**
         * Removes the given tile from the given group. This is an asynchronous function using a
         * jQuery.Promise. In case of success its <code>done</code> function is called.
         *
         * In case of error the promise's <code>fail</code> function is called and gets the
         * consistent backend state of all groups as array of <code>sap.ui2.srvc.Page</code>.
         *
         * @param {sap.ui2.srvc.Page} oGroup
         *     the group containing the tile
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *     the tile
         * @returns {object}
         *     a jQuery.Promise
         * @since 1.11.0
         */
        this.removeTile = function (oGroup, oTile) {
            var oDeferred = jQuery.Deferred();

            oGroup.removeChipInstance(oTile,
                oDeferred.resolve.bind(oDeferred),
                oDeferred.reject.bind(oDeferred, getOrderedPages()));
            return oDeferred.promise();
        };

        /**
         * Moves a tile to another location in the same or a different group. This is an
         * asynchronous function using a jQuery.Promise. In case of success its <code>done</code>
         * function is called and gets the new target tile (which may be identical).
         *
         * In case of error the promise's <code>fail</code> function is called and gets the
         * consistent backend state of all groups as array of <code>sap.ui2.srvc.Page</code>.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *     the tile to be moved
         * @param {integer} iSourceIndex
         *     the index in the source group
         * @param {integer} iTargetIndex
         *     TODO discuss API: what does this "not supplied" mean?
         *     the index in the target group, in case this parameter is not supplied we assume the move tile is within the source group using iSourceIndex
         * @param {sap.ui2.srvc.Page} oSourceGroup
         *     the tile's group
         * @param {sap.ui2.srvc.Page} [oTargetGroup]
         *     the group the tile will be placed in or tile's group if not supplied
         * @returns {object}
         *     a jQuery.Promise
         * @since 1.11.0
         */
        this.moveTile = function (oTile, iSourceIndex, iTargetIndex, oSourceGroup, oTargetGroup) {
            var oDeferred = new jQuery.Deferred(),
                bIsWrapperOnly = isWrapperOnly(oTile),
                oPbs,
                oBagsContents = new sap.ui2.srvc.Map(),
                oCreatedChipInstance,
                aBagIds,
                aSourceChipInstances,
                aTargetChipInstances,
                fnFailure = oDeferred.reject.bind(oDeferred, getOrderedPages()),
                iCalls = 2;

            // Updates the page's layout value for the new CHIP instance order.
            function updateLayout(oPage, aChipInstances, fnSuccess) {
                var i,
                    oLayout;

                try {
                    oLayout = JSON.parse(oPage.getLayout());
                } catch (e) {
                    // invalid layout, must have been read before, so do not log again
                    oLayout = {};
                }
                oLayout.order = [];
                for (i = 0; i < aChipInstances.length; i += 1) {
                    oLayout.order.push(aChipInstances[i].getId());
                }
                oPage.setLayout(JSON.stringify(oLayout), fnSuccess, fnFailure);
            }

            function resolveMoveBetweenGroups(oNewChipInstance) {
                iCalls -= 1;

                // In case addChipInstance is faster then removeChipInstance, oNewChipInstance needs to be
                // cached for the removeChipInstance call
                oCreatedChipInstance = oCreatedChipInstance || oNewChipInstance;
                if (iCalls <= 0) {
                    oDeferred.resolve(oCreatedChipInstance);
                }
            }

            if (!oTargetGroup) {
                oTargetGroup = oSourceGroup;
            }
            aSourceChipInstances = this.getGroupTiles(oSourceGroup);
            iSourceIndex = aSourceChipInstances.indexOf(oTile);
            if (iSourceIndex < 0) {
                jQuery.sap.log.error("moveTile: tile not found in source group", null, sCOMPONENT);
                fnFailure();
                return oDeferred.promise();
            }
            aSourceChipInstances.splice(iSourceIndex, 1);
            if (oSourceGroup === oTargetGroup) {
                aSourceChipInstances.splice(iTargetIndex, 0, oTile);
                updateLayout(oSourceGroup, aSourceChipInstances,
                    oDeferred.resolve.bind(oDeferred, oTile),
                    fnFailure);
            } else {
                oPbs = sap.ushell.Container.getService("PageBuilding").getFactory()
                    .getPageBuildingService();

                // store bag contents for later storing them in the new CHIP instances
                aBagIds = oTile.getBagIds();
                aBagIds.forEach(function (sBagId) {
                    var oBagContent = {
                        texts : [],
                        properties : []
                    },
                    oBag = oTile.getBag(sBagId);
                    // ignore contents of CHIP bags
                    oBag.getOwnTextNames().forEach(function (sName) {
                        oBagContent.texts.push({name: sName, value: oBag.getText(sName)});
                    });
                    oBag.getOwnPropertyNames().forEach(function (sName) {
                        oBagContent.properties.push({name: sName, value: oBag.getProperty(sName)});
                    });
                    if (oBagContent.texts.length > 0 || oBagContent.properties.length > 0) {
                        oBagsContents.put(sBagId, oBagContent);
                    }
                });

                // one $batch to add tile to target group, remove old tile, update layout of
                // source group
                oPbs.openBatchQueue();

                aTargetChipInstances = this.getGroupTiles(oTargetGroup);
                oTargetGroup.addChipInstance(bIsWrapperOnly ? oTile.getChip() : oTile,
                    function (oChipInstance) {
                        var oCurrentBag, oBagContent;
                        aTargetChipInstances.splice(iTargetIndex, 0, oChipInstance);
                        // Note: additional requests after the $batch required, because new ID was
                        // previously unknown. So this requests could not be batched together

                        // Add bags to CHIP instance in target group
                        aBagIds.forEach(function (sBagId) {
                            oBagContent = oBagsContents.get(sBagId);
                            if (oBagContent) {
                                oCurrentBag = oChipInstance.getBag(sBagId);
                                oBagContent.texts.forEach(function (oText) {
                                    oCurrentBag.setText(oText.name, oText.value);
                                });
                                oBagContent.properties.forEach(function (oProperty) {
                                    oCurrentBag.setProperty(oProperty.name, oProperty.value);
                                });
                                oCurrentBag.save(function () {
                                    // don't wait for the save operation for performance reasons
                                }, function () {
                                    jQuery.sap.log.error("Bag " + sBagId + ": could not be saved"
                                        , null, sCOMPONENT);
                                });
                            }
                        });
                        // update order of tiles, which is stored in the layout property
                        updateLayout(oTargetGroup, aTargetChipInstances,
                            resolveMoveBetweenGroups.bind(this, oChipInstance));
                    }, fnFailure, oTile.isStub()); // do not load the tile if first load failed
                oSourceGroup.removeChipInstance(oTile, resolveMoveBetweenGroups, fnFailure);
                updateLayout(oSourceGroup, aSourceChipInstances, undefined);

                oPbs.submitBatchQueue(undefined, fnFailure);
            }
            return oDeferred.promise();
        };

        /**
         * Returns the tile's unique identifier
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *     the tile
         * @returns {string}
         *     the id
         * @since 1.11.0
         */
        this.getTileId = function (oTile) {
            return oTile.getId();
        };

        /**
         * Returns the tile's type. This is even possible if the tile is not fully loaded so far.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *     the tile
         * @returns {string}
         *     the type. either <code>"tile"</code> or <code>"link"</code>.
         * @since 1.32.0
         */
        this.getTileType = function (oTile) {
            var oGroup = oTile.getPage(),
                oLayout;

            try {
                oLayout = JSON.parse(oGroup.getLayout());
                // oLayout.order -> contains ordered chip instance IDs to be displayed as a tile
                // oLayout.linkOrder -> contains ordered chip instance IDs to be displayed as a link
                if (oLayout.linkOrder && oLayout.linkOrder.indexOf(oTile.getId()) > -1) {
                    //Note: no verification if oTile.getChip().getAvailableTypes() contains "link".
                    // -> fail early in this case
                    return "link";
                }
            } catch (e) {
                jQuery.sap.log.warning("Group " + oGroup.getId() + ": invalid layout: "
                        + oGroup.getLayout(), null, sCOMPONENT);
            }

            return "tile";
        };

        /**
         * Returns the tile's title.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *     the tile
         * @returns {string}
         *     the title, might be <code>undefined</code> if tile has not finished loading
         *     (see {@link #getTileView}).
         * @since 1.11.0
         */
        this.getTileTitle = function (oTile) {
            return oTile.getTitle();
        };

        /**
         * Returns the tile's SAPUI5 representation. This is an asynchronous function using a
         * jQuery.Promise. In case of success its <code>done</code> function is called and gets the
         * {sap.ui.core.Control} of the tile.
         * In case of error the promise's <code>fail</code> function is called with the error
         * message as parameter.
         * <br>
         * Note: this function became async since 1.23.0.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *     the tile
         * @returns {object}
         *     jQuery.Promise object.
         * @since 1.11.0
         */
        this.getTileView = function (oTile) {
            var that = this,
                oDeferred = new jQuery.Deferred(),
                oTypesContract;

            function doResolve() {
                // if needed, notify the tile in which way it shall display itself
                oTypesContract = oTile.getContract("types");
                if (oTypesContract) {
                    // set the tile type before getting the view
                    // note: the contract caches the new type until the handler is attached
                    oTypesContract.setType(that.getTileType(oTile));
                }

                // Note: resolve.bind does not work as oTile.getImplementationAsSapui5()
                // will be called at binding time in that case
                // Note 2: getImplementationAsSapui5 catches exceptions (via sap.ui2.srvc.call)
                oDeferred.resolve(oTile.getImplementationAsSapui5());
            }

            function doReject(sMessage) {
                oDeferred.reject("Tile not successfully loaded" +
                    (sMessage ? (": " + sMessage) : ""));
            }

            // TODO cache the view for later re-use - might not work cause view can get destroyed
            // and is not reusable!
            // Needs further investigation - don't implement cache for now

            if (!oTile.$loadingPromise) { // loading resolved or failed
                if (!oTile.isStub()) { // success
                    // call getImplementationAsSapui5 async for non-AppLaunchers and resolves.
                    // For AppLaunchers, there is an optimization (requested by RT) to call it sync
                    // as the resources are already bundled and loaded at startup. As a result,
                    // the Home will initially at least display app launchers.
                    sap.ui2.srvc.call(doResolve, doReject, /*async*/!isAppLauncher(oTile));
                } else { //failed
                    doReject();
                }
            } else { // loading pending
                oTile.$loadingPromise
                    .fail(doReject)
                    .done(function () {
                        try {
                            doResolve();
                        } catch (ex) {
                            doReject((ex.message || ex));
                        }
                    });
            }

            return oDeferred.promise();
        };
        /**
         * Returns the tile size in the format <code>1x1</code> or <code>1x2</code>.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *     the tile
         * @returns {string}
         *     the tile size
         * @since 1.11.0
         */
        this.getTileSize = function (oTile) {
            var row = (!oTile.isStub() && oTile.getConfigurationParameter("row")) || "1",
                col = (!oTile.isStub() && oTile.getConfigurationParameter("col")) || "1";
            return row + "x" + col;
        };

        /**
         * Refresh a tile with its latest data.
         * Only dynamic data should be updated, not the tile configuration itself.
         *
         * @param {sap.ui2.srvc.ChipInstance} oTile
         *      the tile

         */
        this.refreshTile = function (oTile) {
            oTile.refresh();
        };

        /**
         * Notifies the given tile that the tile's visibility had been changed.
         *
         * @param {object} oTile
         *     the tile
         * @param {boolean} bNewVisible
         *   the CHIP visibility
         */
        this.setTileVisible = function (oTile, bNewVisible) {
            var oVisibleContract = !oTile.isStub() && oTile.getContract("visible"),
                sTileId,
                bOldVisibility;

            if (oVisibleContract) {
                // tile has been successfully loaded already
                oVisibleContract.setVisible(bNewVisible);
                return;
            }

            if (oTile.isStub() && oTile.$loadingPromise) {
                // the tile is currently loaded
                sTileId = this.getTileId(oTile);
                bOldVisibility = mEarlyTileVisibilities[sTileId];
                // update cached visibility also if handler was already attached
                mEarlyTileVisibilities[sTileId] = bNewVisible;

                if (bOldVisibility === undefined) {
                    // attach handler, but only once.
                    oTile.$loadingPromise.done(function () {
                        var oVisibleContract = oTile.getContract("visible");

                        if (oVisibleContract) {
                            // tile uses visibility contract and sets the latest visibilty
                            // NOTE: mEarlyTileVisibilities[sTileId] may be changed
                            // after handler was attached
                            oVisibleContract.setVisible(mEarlyTileVisibilities[sTileId]);
                        }
                    });
                }
                return;
            }

            // oTile.isStub() && ! oTile.$loadingPromise means that tile failed
            // loading ("cannot load tile"). In this case nothing needs to be done!
        };

        this.getTileActions = function (oTile) {
            var oActionsContract = !oTile.isStub() && oTile.getContract("actions");
            if (oActionsContract) {
                return oActionsContract.getActions();
            }
            return [];
        };


        /**
         * A function which returns the tile's navigation target.
         * Assigning this to <code>location.hash</code> will open the app.
         *
         * @param {object} oTile
         *     the tile
         * @returns {string}
         *  the tile target
         */
        this.getTileTarget = function (oTile) {
            //TODO method obsolete for now - TBD (don't implement)
            return null;
        };

        /**
         * A function which returns the technical information about the tile.
         * <p>
         * The ABAP adapter returns details about the chip instance corresponding to the tile.
         *
         * @param {object} oTile
         *     the tile
         * @returns {string}
         *     debug information for the tile
         */
        this.getTileDebugInfo = function (oTile) {
            var oDebugInfo, sDebugInfo, oChip = oTile.getChip(), oCatalog = oChip.getCatalog();

            oDebugInfo = {
                chipId: oChip.getId(),
                chipInstanceId: oTile.getId(),
                completelyLoaded: !oTile.isStub()
            };

            if (oCatalog) {
                oDebugInfo.catalogId = oCatalog.getId();
            }
            sDebugInfo = JSON.stringify(oDebugInfo);

            return sDebugInfo;
        };

        /**
         * Returns the user's catalogs. This operation provides graceful degradation and improved
         * responsiveness.
         * <p>
         * Only severe failures make the overall operation fail. If loading of a remote catalog
         * fails, this is handled gracefully by providing a "dummy" empty catalog (with ID instead
         * of title). Use {@link getCatalogError} to check if a (remote) catalog could not be
         * loaded from the backend.
         * <p>
         * Care has been taken to make sure that progress notifications are sent reliably for each
         * single catalog, i.e. attaching a <code>progress</code> handler gives you the same
         * possibilities as attaching a <code>done</code> handler, but with the advantage of
         * improved responsiveness.
         *
         * @example
         *   sap.ushell.Container.getService("LaunchPage").getCatalogs()
         *   .fail(function (sErrorMessage) { // string
         *     // handle error situation
         *   })
         *   .progress(function (oCatalog) { // object
         *     // do s.th. with single catalog
         *   })
         *   .done(function (aCatalogs) { // object[]
         *     aCatalogs.forEach(function (oCatalog) {
         *       // do s.th. with single catalog
         *     });
         *   });
         *
         * @returns {object}
         *   A <code>jQuery.Deferred</code> object's promise which informs about success or failure
         *   of this asynchronous operation.  In case of success, an array of black-box catalog
         *   objects is provided (which might be empty). In case of failure, an error message is
         *   passed. Progress notifications are sent for each single catalog, providing a single
         *   black-box catalog object each time.
         *
         * @since 1.11.0
         */
        this.getCatalogs = function () {
            var oDeferred,
                oOldGetCatalogsDeferred = oGetCatalogsDeferred,
                bRefreshRequired = bCatalogsValid === false;

            /**
             * Resolves the promise to return the user's catalogs...by refreshing the first remote
             * catalog found, failing gracefully.
             */
            function refreshRemoteCatalogs() {
                var iPendingRequests = 0, aWrappedCatalogs = wrapCatalogs();

                aWrappedCatalogs.forEach(function (oWrappedCatalog) {
                    var oCatalog = oWrappedCatalog.ui2catalog;
                    //TODO Improve performance: One invalid remote catalog causes refresh of all
                    if (oCatalog.isStub() || oCatalog.getType() === 'H'
                            || oCatalog.getType() === 'REMOTE') {
                        iPendingRequests += 1;
                        oCatalog.refresh(function () {
                            oWrappedCatalog.title = oCatalog.getTitle();
                            oWrappedCatalog.tiles = wrapAsChipInstances(oCatalog.getChips());
                            //TODO oRemoteCatalogWrapper.errorMessage once wrappers are cached

                            oDeferred.notify(oWrappedCatalog);

                            iPendingRequests -= 1;
                            if (iPendingRequests <= 0) {
                                oDeferred.resolve(aWrappedCatalogs);
                            }
                        }, function (sMessage) {
                            // log errors, but do not fail
                            jQuery.sap.log.error("Failed to load catalog: " + sMessage,
                                    oCatalog.toString(), sCOMPONENT);
                            oWrappedCatalog.errorMessage = sMessage || "Error"; // not undefined!

                            oDeferred.notify(oWrappedCatalog);

                            iPendingRequests -= 1;
                            if (iPendingRequests <= 0) {
                                oDeferred.resolve(aWrappedCatalogs);
                            }
                        });
                    } else {
                        oDeferred.notify(oWrappedCatalog);
                        oDeferred.$notified = true; // notifications have already been sent
                    }
                });

                if (iPendingRequests <= 0) {
                    oDeferred.resolve(aWrappedCatalogs);
                }
            }

            /**
             * Resolves the promise to return the user's catalogs...by just knowing them already.
             */
            function useKnownCatalogs() {
                var aWrappedCatalogs = wrapCatalogs();

                aWrappedCatalogs.forEach(function (oWrappedCatalog) {
                    oDeferred.notify(oWrappedCatalog);
                });

                oDeferred.resolve(aWrappedCatalogs);
            }

            /**
             * Resolves the promise to return the user's catalogs...either by loading them,
             * by refreshing them, or by just knowing them already.
             *
             * @param {boolean} bSynchronous
             *   whether this method is called synchronous to the original
             *   <code>this.getCatalogs()</code> call.
             */
            function doGetCatalogs(bSynchronous) {
                var oAllCatalogs = oCurrentPageSet.getDefaultPage().getAllCatalogs();

                if (oAllCatalogs.isStub()) {
                    oAllCatalogs.load(refreshRemoteCatalogs, oDeferred.reject.bind(oDeferred),
                        "type eq 'CATALOG_PAGE' or type eq 'H' or type eq 'SM_CATALOG'" +
                        " or type eq 'REMOTE'",
                        /*bPartially*/true,/*sorting field*/ "title");
                } else {
                    // Make sure that oDeferred is not notified _before_ progress handler has been
                    // registered! Delay calls in case we are still synchronous!
                    sap.ui2.srvc.call(
                        bRefreshRequired ? refreshRemoteCatalogs : useKnownCatalogs,
                        oDeferred.reject.bind(oDeferred),
                        bSynchronous // = bAsync
                    );
                }
            }

            /**
             * Starts loading of catalogs, after parallel calls and invalidation have been taken
             * care of.
             *
             * @param {boolean} bSynchronous
             *   whether this method is called synchronous to the original
             *   <code>this.getCatalogs()</code> call.
             */
            function startLoading(bSynchronous) {
                if (oTargetMappingServiceConfig && oTargetMappingServiceConfig.cacheId) {
                    // add cache buster token for the allCatalogs request. Reuse TargetMappings token as it is also
                    // invalidated in case the user's catalogs changed
                    sap.ushell.Container.getService("PageBuilding").getFactory().getPageBuildingService()
                        .readAllCatalogs.cacheBusterTokens
                        .put(sDEFAULT_PAGE_ID, oTargetMappingServiceConfig.cacheId);
                }

                if (bPageSetFullyLoaded) {
                    doGetCatalogs(bSynchronous);
                } else {
                    // call getGroups because it is the entry point of the LPA
                    that.getGroups().done(doGetCatalogs).fail(oDeferred.reject.bind(oDeferred));
                }
            }

            // Note: bCatalogsValid can be undefined, false, true
            if (oGetCatalogsDeferred && !oGetCatalogsDeferred.$notified && !bRefreshRequired) {
                // re-use existing Deferred object; we cannot miss any notifications!
                oDeferred = oGetCatalogsDeferred;
            } else {
                oDeferred = oGetCatalogsDeferred = new jQuery.Deferred();
                oDeferred.done(function () {
                    if (oDeferred === oGetCatalogsDeferred) {
                        // only the last call is allowed to change "global" variables
                        bCatalogsValid = true;
                    }
                }).always(function () {
                    if (oDeferred === oGetCatalogsDeferred) {
                        // only the last call is allowed to change "global" variables
                        oGetCatalogsDeferred = null;
                    }
                });

                if (oOldGetCatalogsDeferred) {
                    if (bRefreshRequired) {
                        bCatalogsValid = undefined; // not yet valid, refresh is in progress...
                    }
                    // if we cannot reuse the old Deferred object, wait until it is done;
                    // after invalidation, wait until old operations are complete and then start a
                    // new roundtrip
                    oOldGetCatalogsDeferred.always(startLoading);
                } else {
                    startLoading(true);
                }
            }

            return oDeferred.promise();
        };

        /**
         * Returns whether the catalogs collection previously returned by
         * <code>getCatalogs()</code> is still valid. Initially, this is <code>false</code>
         * until <code>getCatalogs()</code> has been called. Later, it might become
         * <code>false</code> again in case one of the catalogs has been invalidated, e.g. due to
         * the addition of a tile ("Add to catalog" scenario).
         *
         * @returns {boolean}
         * @since 1.16.4
         * @see #getCatalogs
         */
        this.isCatalogsValid = function () {
            return !!bCatalogsValid; // converts undefined to false
        };

        /**
         * Returns the catalog's technical data.
         *
         * @param {object} oConfigCatalog
         *     the catalog
         * @returns {object}
         *     an object with the following properties (the list may be incomplete):
         *     <ul>
         *     <li><code>id</code>: the catalog ID
         *     <li><code>systemId</code>: [remote catalogs] the ID of the remote system
         *     <li><code>remoteId</code>: [remote catalogs] the ID of the catalog in the
         *       remote system
         *     <li><code>baseUrl</code>: [remote catalogs] the base URL of the catalog in the
         *       remote system
         *     </ul>
         * @since 1.21.2
         */
        this.getCatalogData = function (oConfigCatalog) {
            return oConfigCatalog.ui2catalog.getCatalogData();
        };

        /**
         * Returns the catalog's technical error message in case it could not be loaded from the
         * backend.
         * <p>
         * <b>Beware:</b> The technical error message is not translated!
         *
         * @param {object} oConfigCatalog
         *     the catalog
         * @returns {string}
         *     the technical error message or <code>undefined</code> if the catalog was loaded
         *     properly
         * @since 1.17.1
         */
        this.getCatalogError = function (oConfigCatalog) {
            return oConfigCatalog.errorMessage;
        };

        /**
         * Returns the catalog's unique identifier
         *
         * @param {object} oConfigCatalog
         *     the catalog as received via #getCatalogs()
         * @returns {string}
         *     the id
         * @since 1.11.0
         */
        this.getCatalogId = function (oConfigCatalog) {
            return oConfigCatalog.id;
        };

        /**
         * Returns the catalog's title
         *
         * @param {object} oConfigCatalog
         *     the catalog
         * @returns {string}
         *     the title
         * @since 1.11.0
         */
        this.getCatalogTitle = function (oConfigCatalog) {
            return oConfigCatalog.title;
        };

        /**
         * Returns the catalog's tiles. This is an asynchronous function using a jQuery.Promise.
         * In case of success its <code>done</code> function is called and gets the tiles as array
         * of <code>sap.ui2.srvc.Chip</code>.
         *
         * In case of error the promise's <code>fail</code> function is called.
         *
         * @param {object} oConfigCatalog
         *     the catalog
         * @returns {object}
         *     a jQuery.Promise
         * @since 1.11.0
         */
        this.getCatalogTiles = function (oConfigCatalog) {
            var i,
                oChipInstance,
                oDeferred = new jQuery.Deferred(),
                iAsyncCount = 0;

            function onLoaded() {
                iAsyncCount -= 1;

                if (iAsyncCount === 0) {
                    oDeferred.resolve(oConfigCatalog.tiles);
                }
            }

            function onFailure(oCatalogTile, sMessage) {
                // log errors, but do not fail
                jQuery.sap.log.error("Failed to load catalog tile: " + sMessage,
                    oCatalogTile.toString(), sCOMPONENT);
                onLoaded();
            }

            for (i = 0; i < oConfigCatalog.tiles.length; i += 1) {
                oChipInstance = oConfigCatalog.tiles[i];
                if (oChipInstance.isStub()) {
                    iAsyncCount += 1;
                    oChipInstance.load(onLoaded, onFailure.bind(null, oChipInstance));
                }
            }

            if (iAsyncCount === 0) {
                oDeferred.resolve(oConfigCatalog.tiles);
            }

            return oDeferred.promise();
        };

        /**
         * Returns the unique identifier of the catalog tile. May be called for a catalog tile or
         * (since 1.21.0) for a group tile. In the latter case it returns the unique identifier of
         * the catalog tile on which the group tile is based.
         *
         * @param {sap.ui2.ChipInstance} oTile
         *     the tile or the catalog tile
         * @returns {string}
         *     the id
         * @since 1.11.0
         */
        this.getCatalogTileId = function (oTile) {
            var oChip = oTile.getChip(),
                sId = oChip.getId();

            if (oChip.getCatalog() &&
                    oChip.getCatalog().getCatalogData() &&
                    oChip.getCatalog().getCatalogData().systemAlias) {

                // Add system alias to the ID so the runtime distinguishes tiles with different
                // aliases. This is needed for the app finder (=tile catalog)
                sId += "_" + oChip.getCatalog().getCatalogData().systemAlias;
            }

            return sId;
        };

        /**
         * Returns the catalog tile's title. May be called for a catalog tile or
         * (since 1.32.0) for a group tile.
         *
         * @param {sap.ui2.ChipInstance} oCatalogTile
         *     the catalog tile
         * @returns {string}
         *     the title
         * @since 1.11.0
         */
        this.getCatalogTileTitle = function (oCatalogTile) {
            // if we rely on the fallback inside oCatalogTile.getTitle() (which calls
            // chip.getTitle() if it has no own title), this method may not be cannot be called
            // with group tiles. -> this is used by Usage analysis reporting
            return oCatalogTile.getChip().getTitle();
        };

        /**
         * Returns the catalog tile's size in the format <code>1x1</code> or <code>1x2</code>.
         *
         * @param {sap.ui2.ChipInstance} oCatalogTile
         *     the catalog tile
         * @returns {string}
         *     the size
         * @since 1.11.0
         */
        this.getCatalogTileSize = function (oCatalogTile) {
            return this.getTileSize(oCatalogTile);
        };

        /**
         * A function which returns UI5 view / control  of the catalog tile
         *
         * @param {sap.ui2.ChipInstance} oCatalogTile
         *     the catalog tile
         * @returns {sap.ui.core.Control}
         *     the UI5 representation
         * @since 1.11.0
         */
        this.getCatalogTileView = function (oCatalogTile) {
            var sTitle = this.getCatalogTileTitle(oCatalogTile);
            // TODO cache the view for later re-use - might not work cause view can get destroyed and is not reusable!
            // Needs further investigation - don't implement cache for now
            if (oCatalogTile.isStub()) {
                jQuery.sap.log.warning("CHIP (instance) is just a stub!", oCatalogTile.toString(true),
                    sCOMPONENT);
                return new sap.ushell.ui.tile.StaticTile({ //TODO remove as soon as RT has a own
                    icon: "sap-icon://hide",
                    info: "",
                    infoState: "Critical",
                    subtitle: "",
                    title: sTitle
                }).addStyleClass("sapUshellTileError");
            }
            if (oCatalogTile.getContract("preview")) {
                oCatalogTile.getContract("preview").setEnabled(true);
                return getImplementationAsSapui5(oCatalogTile, sTitle,
                    "Cannot get catalog tile view as SAPUI5");
            }
            return new sap.ushell.ui.tile.StaticTile({ //TODO remove as soon as RT has a own
                title : sTitle,
                subtitle: "",
                info: "",
                infoState: "Neutral",
                icon: "sap-icon://folder-full"
            });
        };

        /**
         * Get navigation target URL for a catalog tile.
         *
         * @param {sap.ui2.ChipInstance} oCatalogTile
         *     the catalog tile
         * @returns {string}
         *     the target URL for the catalog tile's underlying application as provided via the
         *     "preview" contract
         * @since 1.11.0
         */
        this.getCatalogTileTargetURL = function (oCatalogTile) {
            var sAppLauncherTarget = getConfigurationProperty(oCatalogTile, "tileConfiguration", "navigation_target_url");
            return sAppLauncherTarget || (!oCatalogTile.isStub() && oCatalogTile.getContract("preview")
                    && oCatalogTile.getContract("preview").getTargetUrl())
                    || undefined;
        };

        /**
         * Get preview subtitle for a catalog tile.
         *
         * @param {sap.ui2.ChipInstance} oCatalogTile
         *     the catalog tile
         * @returns {string}
         *     the preview subtitle for the catalog tile's underlying application as provided via the
         *     "preview" contract
         * @since 1.40.0
         */
        this.getCatalogTilePreviewSubtitle = function (oCatalogTile) {
            var sAppLauncherSubTitle = getBagText(oCatalogTile, "tileProperties", "display_subtitle_text");
            return sAppLauncherSubTitle || (!oCatalogTile.isStub() && oCatalogTile.getContract("preview")
                    && oCatalogTile.getContract("preview").getPreviewSubtitle())
                    || undefined;

        };

        /**
         * Get preview title for a catalog tile.
         *
         * @param {sap.ui2.ChipInstance} oCatalogTile
         *     the catalog tile
         * @returns {string}
         *     the preview title for the catalog tile's underlying application as provided via the
         *     "preview" contract
         * @since 1.16.3
         */
        this.getCatalogTilePreviewTitle = function (oCatalogTile) {
            var sAppLauncherTitle = getBagText(oCatalogTile, "tileProperties", "display_title_text");
            return sAppLauncherTitle || (!oCatalogTile.isStub() && oCatalogTile.getContract("preview")
                    && oCatalogTile.getContract("preview").getPreviewTitle())
                    || undefined;
        };

        /**
         * Get preview icon for a catalog tile.
         *
         * @param {sap.ui2.ChipInstance} oCatalogTile
         *     the catalog tile
         * @returns {string}
         *     the preview icon as URL/URI for the catalog tile's underlying application as provided via the
         *     "preview" contract
         * @since 1.16.3
         */
        this.getCatalogTilePreviewIcon = function (oCatalogTile) {
            var sAppLauncherIcon = getConfigurationProperty(oCatalogTile, "tileConfiguration", "display_icon_url");

            return sAppLauncherIcon || (!oCatalogTile.isStub() && oCatalogTile.getContract("preview")
                    && oCatalogTile.getContract("preview").getPreviewIcon())
                    || undefined;
        };

        /**
         * Returns the keywords associated with a catalog tile which can be used
         * to find the catalog tile in a search.
         * Note: getCatalogTileView <b>must</b> be called <b>before</b> this
         * method. Otherwise the keywords may be incomplete.
         *
         * @param {sap.ui2.ChipInstance} oCatalogTile
         *      The catalog tile
         * @returns string[]
         *      The keywords associated with this catalog tile
         * @since 1.11.0
         */
        this.getCatalogTileKeywords = function (oCatalogTile) {
            var oKeywordsSet = {},
            sCatalogTitle = oCatalogTile.getTitle(),
            sCatalogDescription = oCatalogTile.getChip().getDescription();

            function addKeywords(oKeywordsSet, aKeywordsList) {
                if (sap.ui2.srvc.isArray(aKeywordsList)) {
                    aKeywordsList.forEach(function (sKeyword) {
                        if (oKeywordsSet.hasOwnProperty(sKeyword)) {
                            return;
                        }

                        oKeywordsSet[sKeyword] = null;
                    });
                }
            }

            // Relevant for app launcher tiles which are not instantiated in the
            // app finder. It directly fetches keywords from catalogs data
            function getKeywordsDefinedInCatalogsData(oCatalogTile) {
                var sKeywordsText = getBagText(oCatalogTile, "tileProperties", "display_search_keywords");

                if (!sap.ui2.srvc.isString(sKeywordsText)) {
                    return [];
                }

                return sKeywordsText.trim().split(/\s*,\s*/g);
            }

            // Apply the 'search' contract when available
            function getKeywordsFromSearchContract(oCatalogTile) {
                var oSearchContract;

                if (oCatalogTile.isStub()){
                    return [];
                }

                oSearchContract = oCatalogTile.getContract("search");
                if (oSearchContract) {
                    return oSearchContract.getKeywords();
                }

                return [];
            }

            addKeywords(
                oKeywordsSet,
                getKeywordsDefinedInCatalogsData(oCatalogTile)
            );
            addKeywords(
                oKeywordsSet,
                getKeywordsFromSearchContract(oCatalogTile)
            );
            if (sCatalogTitle) {
                addKeywords(oKeywordsSet, [sCatalogTitle]);
            }
            if (sCatalogDescription) {
                addKeywords(oKeywordsSet, [sCatalogDescription]);
            }

            return Object.keys(oKeywordsSet);
        };

        /**
         * Adds a bookmark to the user's home page.
         *
         * @param {object} oParameters
         *   bookmark parameters. In addition to title and URL, a bookmark might allow additional
         *   settings, such as an icon or a subtitle. Which settings are supported depends
         *   on the environment in which the application is running. Unsupported parameters will be
         *   ignored.
         * @param {string} oParameters.title
         *   The title of the bookmark.
         * @param {string} oParameters.url
         *   The URL of the bookmark. If the target application shall run in the Shell the URL has
         *   to be in the format <code>"#SO-Action~Context?P1=a&P2=x&/route?RPV=1"</code>
         * @param {string} [oParameters.icon]
         *   The icon URL of the bookmark (e.g. <code>"sap-icon://home"</code>).
         * @param {string} [oParameters.info]
         *   The information text of the bookmark.
         * @param {string} [oParameters.subtitle]
         *   The subtitle of the bookmark.
         * @param {string} [oParameters.serviceUrl]
         *   The URL to a REST or OData service that provides some dynamic information for the
         *   bookmark.
         * @param {string} [oParameters.serviceRefreshInterval]
         *   The refresh interval for the <code>serviceUrl</code> in seconds.
         * @param {string} [oParameters.numberUnit]
         *   The unit for the number retrieved from <code>serviceUrl</code>.
         * @param {object} [oGroup=DefaultGroup]
         *   Group to which the bookmark will be added to. If not given the default group
         *   {@link #getDefaultGroup} is used.
         *
         * @returns {object}
         *   a jQuery promise.
         *
         * @see sap.ushell.services.URLParsing#getShellHash
         * @since 1.11.0
         */
        this.addBookmark = function (oParameters, oGroup) {
            jQuery.sap.require("sap.ui.thirdparty.URI");
            var URI = sap.ui.require('sap/ui/thirdparty/URI');
            /* eslint-disable camelcase */
            var sChipId = sSTATIC_BASE_CHIP_ID,
                oConfiguration = {
                    display_icon_url: oParameters.icon || "",
                    display_info_text: oParameters.info || "",
                    display_subtitle_text: oParameters.subtitle || "",
                    display_title_text: oParameters.title,
                    navigation_target_url: oParameters.url,
                    navigation_use_semantic_object: false
                },
                /* eslint-enable camelcase */
                oDeferred = new jQuery.Deferred(),
                oFactory = sap.ushell.Container.getService("PageBuilding").getFactory(),
                oUrlParsing,
                oLocationUri = new URI(),
                oBookmarkUri,
                oHash,
                oPbs = oFactory.getPageBuildingService(),
                oChipInstance,
                fnMkKey = makeTargetMappingSupportKey;

            function addBagAndResolve(oChipInstance, oConfiguration, oDeferred) {
                // add texts also to the bag, as this is prio 1 for applaunchers
                oChipInstance.getBag("tileProperties").setText("display_title_text",
                    oConfiguration.display_title_text || "");
                oChipInstance.getBag("tileProperties").setText("display_subtitle_text",
                    oConfiguration.display_subtitle_text || "");
                oChipInstance.getBag("tileProperties").setText("display_info_text",
                    oConfiguration.display_info_text || "");
                oChipInstance.getBag("tileProperties").save(function () {
                    //resolve w/o parameter as caller (app) does not need access the bookmark
                    // NOTE: until 1.30.4 resolve was called with oChipInstance as parameter if
                    // bPageSetFullyLoaded was true, and otherwise no parameter was given this was
                    // removed as the behaviour for apps were different depending on the startup
                    // mode
                    oDeferred.resolve();
                }, function (sMessage) {
                    oDeferred.reject(sMessage);
                });
            }

            // note: mandatory parameters have been checked by the service
            oBookmarkUri = new URI(oParameters.url); // http://medialize.github.io/URI.js/about-uris.html
            // check and process oParameters.url
            if (oParameters.url &&
                (oParameters.url[0] === '#' ||
                 oBookmarkUri.host() + oBookmarkUri.path() ===
                     oLocationUri.host() + oLocationUri.path())) {
                // try to figure out if SO navigation is used to enable form factor filtering
                // but only if bookmark URL points to the same domain. Foreign domains are not
                // expected to use intent based navigation.
                oUrlParsing = sap.ushell.Container.getService("URLParsing");
                oHash = oUrlParsing.parseShellHash(oUrlParsing.getShellHash(oParameters.url));
                if (oHash && // note: oTargetMappingSupport#get may return false
                    oTargetMappingSupport.get(fnMkKey(oHash.semanticObject, oHash.action)) !== undefined) {
                    // User has a target mapping matching the URL, so add this information to the
                    // bookmark for form factor based filtering
                    oConfiguration.navigation_use_semantic_object = true;
                    oConfiguration.navigation_semantic_object = oHash.semanticObject;
                    oConfiguration.navigation_semantic_action = oHash.action;
                    oConfiguration.navigation_semantic_parameters =
                        oUrlParsing.paramsToString(oHash.params);
                }
                // TODO add also display_search_keywords?
            }
            if (oParameters.serviceUrl) {
                sChipId = sDYNAMIC_BASE_CHIP_ID;
                oConfiguration.display_number_unit = oParameters.numberUnit;
                oConfiguration.service_refresh_interval = oParameters.serviceRefreshInterval || 0;
                oConfiguration.service_url = oParameters.serviceUrl;
            }
            if (oGroup && !(oGroup instanceof sap.ui2.srvc.Page)) {
                // same behavior like addCatalogTileToGroup of the Bookmark service:
                // if the group is unknown don't use the default group but reject.
                oDeferred.reject("The given object is not a group");
                return oDeferred.promise();
            }
            if (bPageSetFullyLoaded) {
                // use the default group if no group is specified
                oGroup = oGroup || oCurrentPageSet.getDefaultPage();
                oChipInstance = oFactory.createChipInstance({chipId: sChipId,
                    pageId: oGroup.getId(),
                    title: oParameters.title,
                    configuration: JSON.stringify({tileConfiguration:
                        JSON.stringify(oConfiguration)}),
                    layoutData: ""
                    // note: no deep insert, do not set the subtitle as bag property here, set later on the created chip!
                    // the create service does not support deep insert
                    // Chip ChipBags -> Chip
                    });
                oGroup.addChipInstance(oChipInstance, function (oNewChipInstance) {
                    addBagAndResolve(oNewChipInstance, oConfiguration, oDeferred);
                }, oDeferred.reject.bind(oDeferred), undefined);
            } else {
                // This can happen in the app cold-start use case, when the app creates a bookmark
                // createPageChipInstanceFromRawData might throw Errors
                try {
                    oPbs.createPageChipInstanceFromRawData({
                        chipId: sChipId,
                        configuration: JSON.stringify({tileConfiguration:
                            JSON.stringify(oConfiguration)}),
                        pageId: "/UI2/Fiori2LaunchpadHome", //Default Page
                        title: oParameters.title
                    }, function (oRawChipInstance) {
                        oFactory.createChipInstance(oRawChipInstance, function (oNewChipInstance) {
                            addBagAndResolve(oNewChipInstance, oConfiguration, oDeferred);
                        }, oDeferred.reject.bind(oDeferred), /*oPage*/undefined);
                    }, oDeferred.reject.bind(oDeferred));
                } catch (e) {
                    oDeferred.reject(e.toString());
                }
            }
            return oDeferred.promise();
        };

        /**
         * Tells whether the given CHIP instance represents a bookmark pointing to the given URL.
         *
         * @param {sap.ui2.srvc.ChipInstance} oChipInstance
         * @param {string} sUrl
         * @returns {boolean}
         *
         * @see #addBookmark
         * @since 1.17.1
         */
        sap.ui2.srvc.testPublishAt(that);
        function isBookmarkFor(oChipInstance, sUrl) {
            return isAppLauncher(oChipInstance)
                && getAppLauncherTileConfiguration(oChipInstance).navigation_target_url === sUrl;
        }

        /**
         * Visits <b>all</b> bookmarks pointing to the given URL from all of the user's groups and
         * calls the given visitor function on each such bookmark.
         * <p>
         * This is a potentially asynchronous operation in case the user's groups have not yet been
         * loaded completely!
         *
         * @param {string} sUrl
         *   The URL of the bookmarks to be visited, exactly as specified to {@link #addBookmark}.
         * @param {function(sap.ui2.srvc.ChipInstance)} [fnVisitor]
         *   The asynchronous visitor function returning a <code>jQuery.Deferred</code> object's
         *   promise. In case of success, no details are expected. In case of failure, an error
         *   message is passed.
         * @returns {object}
         *   A <code>jQuery.Deferred</code> object's promise which informs about success or failure
         *   of this asynchronous operation. In case of success, the count of visited bookmarks
         *   is provided (which might be zero). In case of failure, an error message is passed.
         *
         * @see #addBookmark
         * @since 1.17.1
         */
        sap.ui2.srvc.testPublishAt(that);
        function visitBookmarks(sUrl, fnVisitor) {
            var aDeferreds = [],
                oDeferred = new jQuery.Deferred();

            that.getGroups().fail(oDeferred.reject.bind(oDeferred)).done(function (aGroups) {
                var iCount = 0;
                aGroups.forEach(function (oGroup) {
                    oGroup.getChipInstances().forEach(function (oChipInstance) {
                        if (isBookmarkFor(oChipInstance, sUrl)) {
                            iCount += 1;
                            if (fnVisitor) {
                                aDeferreds.push(fnVisitor(oChipInstance));
                            }
                        }
                    });
                });
                if (aDeferreds.length === 0) {
                    oDeferred.resolve(iCount);
                } else {
                    jQuery.when.apply(jQuery, aDeferreds)
                        .fail(function (sMessage) {
                            oDeferred.reject(sMessage);
                        })
                        .done(function () {
                            oDeferred.resolve(iCount);
                        });
                }
            });
            return oDeferred.promise();
        }

        /**
         * Counts <b>all</b> bookmarks pointing to the given URL from all of the user's pages. You
         * can use this method to check if a bookmark already exists.
         * <p>
         * This is a potentially asynchronous operation in case the user's pages have not yet been
         * loaded completely!
         *
         * @param {string} sUrl
         *   The URL of the bookmarks to be counted, exactly as specified to {@link #addBookmark}.
         * @returns {object}
         *   A <code>jQuery.Deferred</code> object's promise which informs about success or failure
         *   of this asynchronous operation. In case of success, the count of existing bookmarks
         *   is provided (which might be zero). In case of failure, an error message is passed.
         *
         * @see #addBookmark
         * @since 1.17.1
         */
        this.countBookmarks = function (sUrl) {
            return visitBookmarks(sUrl);
        };

        /**
         * Deletes <b>all</b> bookmarks pointing to the given URL from all of the user's pages.
         *
         * @param {string} sUrl
         *   The URL of the bookmarks to be deleted, exactly as specified to {@link #addBookmark}.
         * @returns {object}
         *   A <code>jQuery.Deferred</code> object's promise which informs about success or failure
         *   of this asynchronous operation. In case of success, the number of deleted bookmarks
         *   is provided (which might be zero). In case of failure, an error message is passed.
         *
         * @see #addBookmark
         * @see #countBookmarks
         * @since 1.17.1
         */
        this.deleteBookmarks = function (sUrl) {
            return visitBookmarks(sUrl, function (oChipInstance) {
                var oDeferred = new jQuery.Deferred();
                oChipInstance.remove(oDeferred.resolve.bind(oDeferred),
                    oDeferred.reject.bind(oDeferred));
                return oDeferred.promise();
            });
        };

        /**
         * Updates <b>all</b> bookmarks pointing to the given URL in all of the user's groups
         * with the given new parameters. Parameters which are omitted are not changed in the
         * existing bookmarks.
         *
         * @param {string} sUrl
         *   The URL of the bookmarks to be updated, exactly as specified to {@link #addBookmark}.
         *   In case you need to update the URL itself, pass the old one here and the new one as
         *   <code>oParameters.url</code>!
         * @param {object} oParameters
         *   The bookmark parameters as documented in {@link #addBookmark}.
         * @returns {object}
         *   A <code>jQuery.Deferred</code> object's promise which informs about success or failure
         *   of this asynchronous operation.  In case of success, the number of updated bookmarks
         *   is provided (which might be zero). In case of failure, an error message is passed.
         *
         * @see #addBookmark
         * @see #countBookmarks
         * @see #deleteBookmarks
         * @since 1.17.1
         */
        this.updateBookmarks = function (sUrl, oParameters) {
            return visitBookmarks(sUrl, function (oChipInstance) {
                var oConfiguration = getAppLauncherTileConfiguration(oChipInstance),
                    oDeferred = new jQuery.Deferred(),
                    bBagUpdated = false;

                function configUpdated() {
                    // notify the tile, that it should updated itself as the configuration may have changed
                    oChipInstance.getContract("configuration").fireConfigurationUpdated(["tileConfiguration"]);
                    conditionalUpdateBag();
                }

                function bagsUpdated() {
                    // notify the tile, that it should updated the view based on the changed bag data
                    oChipInstance.getContract("bag").fireBagsUpdated(["tileProperties"]);
                    oDeferred.resolve();
                }

                function conditionalUpdateBag() {
                    // add texts also to the bag, as this is prio 1 for applaunchers
                    if (typeof oConfiguration.display_title_text === "string") {
                        oChipInstance.getBag("tileProperties")
                            .setText("display_title_text", oConfiguration.display_title_text);
                        bBagUpdated = true;
                    }
                    if (typeof oConfiguration.display_subtitle_text === "string") {
                        oChipInstance.getBag("tileProperties")
                            .setText("display_subtitle_text", oConfiguration.display_subtitle_text);
                        bBagUpdated = true;
                    }
                    if (typeof oConfiguration.display_info_text === "string") {
                        oChipInstance.getBag("tileProperties")
                            .setText("display_info_text", oConfiguration.display_info_text);
                        bBagUpdated = true;
                    }

                    // update bag only if necessary
                    if (bBagUpdated) {
                        oChipInstance.getBag("tileProperties").save(
                            bagsUpdated, oDeferred.reject.bind(oDeferred)
                        );
                    } else {
                        oDeferred.resolve();
                    }
                }

                /* eslint-disable camelcase */
                oConfiguration.display_icon_url = oParameters.icon
                    || oConfiguration.display_icon_url;
                oConfiguration.display_info_text = oParameters.info
                    || oConfiguration.display_info_text;
                oConfiguration.display_subtitle_text = oParameters.subtitle
                    || oConfiguration.display_subtitle_text;
                oConfiguration.display_title_text = oParameters.title
                    || oConfiguration.display_title_text;
                oConfiguration.navigation_target_url = oParameters.url
                    || oConfiguration.navigation_target_url;
                oConfiguration.display_number_unit = oParameters.numberUnit
                    || oConfiguration.display_number_unit;
                oConfiguration.service_refresh_interval = oParameters.serviceRefreshInterval
                    || oConfiguration.service_refresh_interval;
                oConfiguration.service_url = oParameters.serviceUrl
                    || oConfiguration.service_url;
                /* eslint-enable camelcase */

                // TODO is special treatment of semantic object + action needed here,
                //      e.g. updating old bookmarks whithout it?

                oChipInstance.updateConfiguration({
                    tileConfiguration: JSON.stringify(oConfiguration)
                }, configUpdated, oDeferred.reject.bind(oDeferred));

                return oDeferred.promise();
            });
        };

        /**
         * This method is called to notify that the given tile has been added to some remote
         * catalog which is not specified further.
         *
         * @param {string} sTileId
         *   the ID of the tile that has been added to the catalog (as returned by that OData POST
         *   operation)
         * @private
         * @since 1.16.4
         */
        this.onCatalogTileAdded = function (sTileId) {
            bCatalogsValid = false;
        };
    };

    /**
     * Returns the current shell type, without relying on the existence
     * of {@link sap.ushell_abap#getShellType}.
     *
     * @returns {string}
     *   the shell type ("NWBC" or "FLP"). Defaults to "FLP" in case
     *   the adapter is not running on the ABAP platform.
     *
     * @private
     * @see sap.ushell_abap.adapters.abap.ClientSideTargetResolutionAdapter.prototype._getShellType
     */
    sap.ushell_abap.adapters.abap.LaunchPageAdapter.prototype._getShellType = function () {
        if (sap && sap.ushell_abap && typeof sap.ushell_abap.getShellType === "function") {
            return sap.ushell_abap.getShellType();
        }
        return "FLP";
    };
}());
