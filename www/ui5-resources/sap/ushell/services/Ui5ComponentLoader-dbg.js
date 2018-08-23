// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview The Unified Shell's UI5 component loader service.
 *  This is a shell-internal service and no public or application facing API!
 *
 * @version 1.56.5
 */
sap.ui.define([
    "sap/ushell/services/Ui5ComponentHandle",
    "sap/ushell/services/_Ui5ComponentLoader/utils",
    "sap/ushell/EventHub"
], function (Ui5ComponentHandle, oUtils, oEventHub) {
    "use strict";
    /*jslint nomen: true */
    /*global jQuery, sap, window */

    /**
     * This method MUST be called by the Unified Shell's container only, others
     * MUST call <code>sap.ushell.Container.getService("Ui5ComponentLoader")</code>.
     * Constructs a new instance of the UI5 Component Loader service.
     *
     * @class The Unified Shell's UI5 Component Loader service
     *
     * Note: This loader adds some hardcoded libraries for the standard fiori packaging.
     * Notably scaffolding libraries and core-ext-light must be available. This can be turned off
     * explicitly by setting the <code>amendedLoading</code> property to <code>false</code> in the
     * service configuration:
     * <pre>
     *  window["sap-ushell-config"] = {
     *      services : {
     *          "Ui5ComponentLoader": {
     *              config : {
     *                  amendedLoading : false,
     *                  coreResourcesComplement : {
     *                      name: "core-ext-light-custom",          // Name of the Bundle
     *                      count: 4,                               // Number of individual parts of the bundle
     *                      debugName: "core-ext-light-custom-dbg", // Name of the debug resource
     *                      path: "sap/fiori/"
     *                  }
     *              }
     *          }
     *      }
     * </pre>
     *
     * @private
     * @constructor
     * @see sap.ushell.services.Container#getService
     *
     * @since 1.38.0
     */
    function Ui5ComponentLoader (oContainerInterface, sParameter, oConfig) {
        this._oConfig = (oConfig && oConfig.config) || {};
        this._defaultBundle = {
            name: "core-ext-light",
            count: 4,
            debugName: "core-ext-light-dbg",
            path: "sap/fiori/"
        };

        /**
         * Loads and creates the UI5 component from the specified application properties object (the result of
         * a navigation target resolution).
         *
         * @param {object} oAppProperties
         *    Application properties as typically produced by resolveHashFragment,
         *    note that some members of componentData are propagated, this is used in the myinbox scenario,
         *    see (CrossApplicationNavigation.createComponentInstance)
         * @param {object} oParsedShellHash
         *    The shell hash of the application that is to be opened already
         *    parsed via
         *    <code>sap.ushell.services.URLParsing#parseShellHash</code><code>sap.ushell.services.URLParsing#parseShellHash</code>.
         * @param {array} aWaitForBeforeInstantiation
         *    An array of promises which delays the instantiation of the
         *    Component class until those Promises are resolved.
         * @return {jQuery.Deferred.promise}
         *  a jQuery promise which resolves with the application properties object which is enriched
         *  with an <code>componentHandle<code> object that encapsulates the loaded component.
         *  If the UI5 core resources have been loaded completely as a result of this call (either amendedLoading is
         *  disabled or the core-ext-light.js module is loaded as part of this call or was already loaded), the result
         *  object also gets a flag <code>coreResourcesFullyLoaded</code> which is true.
         *
         * @private
         */
        this.createComponent = function (oAppProperties, oParsedShellHash, aWaitForBeforeInstantiation) {
            var oAppPropertiesSafe = oAppProperties || {};
            var bLoadCoreExt = oUtils.shouldLoadCoreExt(oAppPropertiesSafe);
            var bAmendedLoading = oUtils.shouldUseAmendedLoading(this._oConfig);
            var bLoadDefaultDependencies = oUtils.shouldLoadDefaultDependencies(oAppPropertiesSafe, this._oConfig, bAmendedLoading);

            var oApplicationDependencies = oAppPropertiesSafe.applicationDependencies || {};
            oUtils.logAnyApplicationDependenciesMessages(
                oApplicationDependencies.name,
                oApplicationDependencies.messages
            );

            if (!oAppPropertiesSafe.ui5ComponentName) {
                return new jQuery.Deferred().resolve(oAppProperties).promise();
            }

            // Avoid warnings in ApplicationContainer.
            // TODO: can be removed when ApplicationContainer construction is
            // changed.
            delete oAppPropertiesSafe.loadCoreExt;
            delete oAppPropertiesSafe.loadDefaultDependencies;

            var oComponentData = this._createComponentData(
                oAppPropertiesSafe.componentData || {},
                oAppPropertiesSafe.url,
                oAppPropertiesSafe.applicationConfiguration,
                oAppPropertiesSafe.reservedParameters
            );

            var sComponentId = oUtils.constructAppComponentId(oParsedShellHash || {});
            var bAddCoreExtPreloadBundle = bLoadCoreExt && bAmendedLoading;
            var oComponentProperties = this._createComponentProperties(
                bAddCoreExtPreloadBundle,
                bLoadDefaultDependencies,
                aWaitForBeforeInstantiation,
                oAppPropertiesSafe.applicationDependencies || {},
                oAppPropertiesSafe.ui5ComponentName,
                oAppPropertiesSafe.url,
                sComponentId
            );

            // notify we are about to create component
            Ui5ComponentHandle.onBeforeApplicationInstanceCreated.call(null, oComponentProperties);

            var oDeferred = new jQuery.Deferred();

            oUtils.createUi5Component(oComponentProperties, oComponentData)
                .then(function (oComponent) {
                    var oComponentHandle = new Ui5ComponentHandle(oComponent);
                    oAppPropertiesSafe.componentHandle = oComponentHandle;

                    var bCoreResourcesFullyLoaded = bLoadCoreExt && (bLoadCoreExt || (bAmendedLoading === false));
                    if (bCoreResourcesFullyLoaded) {
                        oAppPropertiesSafe.coreResourcesFullyLoaded = bCoreResourcesFullyLoaded;
                    }

                    oDeferred.resolve(oAppPropertiesSafe);
                }, function (vError) {
                    var sComponentProperties = JSON.stringify(oComponentProperties, null, 4);

                    oUtils.logInstantiateComponentError(
                        oComponentProperties.name,
                        vError + "",
                        vError.status,
                        vError.stack,
                        sComponentProperties
                    );

                    oDeferred.reject(vError);
                });

            return oDeferred.promise();
        };

        /*
         * Creates a componentData object that can be used to instantiate a ui5
         * component.
         */
        this._createComponentData = function (oBaseComponentData, sComponentUrl, oApplicationConfiguration, oTechnicalParameters) {
            var oComponentData = jQuery.extend(true, {
                startupParameters: {}
            }, oBaseComponentData);

            if (oApplicationConfiguration) {
                oComponentData.config = oApplicationConfiguration;
            }
            if (oTechnicalParameters) {
                oComponentData.technicalParameters = oTechnicalParameters;
            }

            if (oUtils.urlHasParameters(sComponentUrl)) {
                var oUrlData = oUtils.getParameterMap(sComponentUrl);

                // pass GET parameters of URL via component data as member
                // startupParameters and as xAppState (to allow blending with
                // other oComponentData usage, e.g. extensibility use case)
                oComponentData.startupParameters = oUrlData.startupParameters;
                if (oUrlData["sap-xapp-state"]) {
                    oComponentData["sap-xapp-state"] = oUrlData["sap-xapp-state"];
                }
            }

            return oComponentData;
        };

        /*
         * Creates a componentProperties object that can be used to instantiate
         * a ui5 component.
         */
        this._createComponentProperties = function (
            bAddCoreExtPreloadBundle,
            bLoadDefaultDependencies,
            aWaitForBeforeInstantiation,
            oApplicationDependencies,
            sUi5ComponentName,
            sComponentUrl,
            sAppComponentId
        ) {
            // take over all properties of applicationDependencies to enable extensions in server w/o
            // necessary changes in client
            var oComponentProperties = jQuery.extend(true, {}, oApplicationDependencies);

            // set default library dependencies if no asyncHints defined (apps without manifest)
            // TODO: move fallback logic to server implementation
            if (!oComponentProperties.asyncHints) {
                oComponentProperties.asyncHints = bLoadDefaultDependencies
                    ? { "libs": ["sap.ca.scfld.md", "sap.ca.ui", "sap.me", "sap.ui.unified"] }
                    : {};
            }

            if (bAddCoreExtPreloadBundle) {
                oComponentProperties.asyncHints.preloadBundles =
                    oComponentProperties.asyncHints.preloadBundles || [];

                var oCoreResourcesComplementBundle = this._prepareBundle();

                oComponentProperties.asyncHints.preloadBundles =
                    oComponentProperties.asyncHints.preloadBundles.concat(oCoreResourcesComplementBundle.aResources);
            }

            if (aWaitForBeforeInstantiation) {
                oComponentProperties.asyncHints.waitFor = aWaitForBeforeInstantiation;
            }

            // Use component name from app properties (target mapping) only if no name
            // was provided in the component properties (applicationDependencies)
            // for supporting application variants, we have to differentiate between app ID
            // and component name
            if (!oComponentProperties.name) {
                oComponentProperties.name = sUi5ComponentName;
            }

            if (sComponentUrl) {
                oComponentProperties.url = oUtils.removeParametersFromUrl(sComponentUrl);
            }

            if (sAppComponentId) {
                oComponentProperties.id = sAppComponentId;
            }

            return oComponentProperties;
        };

        /**
         * Loads a Bundle that complements the Core Resources as configured in the configuration
         * (default core-ext-light)
         *
         * This should normally be triggered by the corresponding EventHub Event (loadCoreExtLight)
         * Can also be called directly and returns a promise if used that way.
         *
         * @returns {Promise} A Promise that resolves as soon as the Core Complements bundle is loaded
         *
         * @private
         */
        this.loadCoreResourcesComplement = function () {
            if (this.loadCoreResourcesComplementPromise) {
                return this.loadCoreResourcesComplementPromise.promise();
            }

            var oCoreResourcesComplementBundle = this._prepareBundle(),
                oDeferred = new jQuery.Deferred();

            this._loadBundle(oCoreResourcesComplementBundle)
                .done(function () {
                    oEventHub.emit("CoreResourcesComplementLoaded", { status: "success" });
                    this.loadCoreResourcesComplementPromise = oDeferred;
                    oDeferred.resolve();
                }.bind(this))
                .fail(function () {
                    oEventHub.emit("CoreResourcesComplementLoaded", { status: "failed" });
                    oDeferred.reject();
                });

            return oDeferred.promise();
        };

        /**
         * Prepares the bundle Object used to trigger bundle loading based on the bootstrap configuration
         * If a bundle is provided in the config we use that one, if not we use core-ext-light as a default
         *
         * @returns {Object} Prepared Object that can be used to trigger bundle loading
         *
         */
        this._prepareBundle = function () {
            var oBundle,
                oCoreResourcesComplementBundle = {
                    name: "CoreResourcesComplement"
                };

            if (this._validateConfiguredBundle()) {
                oBundle = this._oConfig.coreResourcesComplement;
            } else {
                oBundle = this._defaultBundle;
            }

            if (window["sap-ui-debug"] === true) {
                oCoreResourcesComplementBundle.aResources = [oBundle.path + oBundle.debugName + ".js"];
            } else {
                oCoreResourcesComplementBundle.aResources = this._buildBundleResourcesArray(oBundle.name, oBundle.path, oBundle.count);
            }

            return oCoreResourcesComplementBundle;
        };

        /**
         * Validates that the configured CoreResourcesComplement bundle is structually
         * correct and doesn't have wrong data types assigned
         *
         * @returns {boolean} isValid
         *      Bundle is valid?
         *
         * @private
         */
        this._validateConfiguredBundle = function () {
            var isValid = true,
                oConfiguredBundle = this._oConfig.coreResourcesComplement;

            if (!oConfiguredBundle) {
                return false;
            }

            if (!oConfiguredBundle.name || typeof oConfiguredBundle.name !== "string") {
                jQuery.sap.log.error("Ui5ComponentLoader: Configured CoreResourcesComplement Bundle has incorrect 'name' property");
                isValid = false;
            }

            if (!oConfiguredBundle.count || typeof oConfiguredBundle.count !== "number") {
                jQuery.sap.log.error("Ui5ComponentLoader: Configured CoreResourcesComplement Bundle has incorrect 'count' property");
                isValid = false;
            }

            if (!oConfiguredBundle.debugName || typeof oConfiguredBundle.debugName !== "string") {
                jQuery.sap.log.error("Ui5ComponentLoader: Configured CoreResourcesComplement Bundle has incorrect 'debugName' property");
                isValid = false;
            }

            if (!oConfiguredBundle.path || typeof oConfiguredBundle.path !== "string") {
                jQuery.sap.log.error("Ui5ComponentLoader: Configured CoreResourcesComplement Bundle has incorrect 'path' property");
                isValid = false;
            }

            return isValid;
        };

        /**
         * Constructs a proper Array of Resources based on the count of different sub-modules of a Bundle
         * respecting the provided Path
         * Note: This method calls itself recursively
         * e.g. core-resources-complement with resource count 4:
         * ["core-resources-complement-0.js", "core-resources-complement-1.js", "core-resources-complement-2.js", "core-resources-complement-3.js"]
         *
         * @param {String} sBundleName
         *    The Name of the Bundle. e.g.: core-resources-complement
         * @param {String} sPath
         *    The path to the source file. e.g.: sap/fiori/
         * @param {Number} iResourceCount
         *    The amount of sub-modules of the bundle. See Description of the Method
         * @returns {Array}
         *    The actual Array of the Resources
         *
         * @private
         */
        this._buildBundleResourcesArray = function (sBundleName, sPath, iResourceCount) {
            var aResourceArray = arguments[3] || [],
                sResourcePath = sPath;

            if (typeof sBundleName !== "string" ||typeof sResourcePath !== "string" || typeof iResourceCount !== "number") {
                jQuery.sap.log.error("Ui5ComponentLoader: _buildBundleResourcesArray called with invalid arguments");
                return null;
            }

            if (sResourcePath.substr(-1) !== "/") {
                sResourcePath += "/";
            }

            if (iResourceCount === 1) {
                aResourceArray.push(sResourcePath + sBundleName + ".js");
            }

            if (aResourceArray.length >= iResourceCount) {
                return aResourceArray;
            } else {
                aResourceArray.push(sResourcePath + sBundleName + "-" + aResourceArray.length + ".js");
                return this._buildBundleResourcesArray(sBundleName, sResourcePath, iResourceCount, aResourceArray);
            }
        };

        /**
         * Loads the specified Bundle asynchronously and triggers a Event in the EventHub
         * with the current status in a Object.
         * e.g. of the EventHub Data:
         * { status: "success" } / { status: "failed" }
         *
         * @param {Object} oBundle
         *    Represents the Bundle that needs to be loaded.
         *    {
         *        name: "TheBundleName", // The name of the Bundle.
         *        resources: [
         *            "SampleResource"
         *        ]
         *    }
         *
         * @returns {Promise} Promise that resolves as soon as the bundle is loaded.
         *
         * @private
         */
        this._loadBundle = function (oBundle) {
            if (!oBundle || !Array.isArray(oBundle.aResources) || !oBundle.name) {
                jQuery.sap.log.error("Ui5ComponentLoader: _loadBundle called with invalid arguments");
                return null;
            }

            var aPromises = [],
                oDeferred = new jQuery.Deferred();

            oBundle.aResources.forEach(function (sResource) {
                // since 1.46, multiple calls of jQuery.sap._loadJSResourceAsync
                // for the same module will return the same promise,
                // i.e. there is no need to check if the module has been loaded before
                aPromises.push(jQuery.sap._loadJSResourceAsync(sResource));
            });

            Promise.all(aPromises)
                .then(function () {
                    oDeferred.resolve();
                })
                .catch(function () {
                    jQuery.sap.log.error("Ui5ComponentLoader: failed to load bundle: " + oBundle.name);
                    oDeferred.reject();
                });

            return oDeferred.promise();
        };

        /**
         * Load the Core-Ext-Light bundle when the appropiate Event is emitted
         */
        oEventHub.once("loadCoreResourcesComplement")
            .do(function () {
                this.loadCoreResourcesComplement();
            }.bind(this));
    }

    Ui5ComponentLoader.hasNoAdapter = true;
    return Ui5ComponentLoader;

}, true /* bExport */);
