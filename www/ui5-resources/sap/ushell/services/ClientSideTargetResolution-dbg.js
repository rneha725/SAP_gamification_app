// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview
 *
 * <p>This module performs client side navigation target resolution.</p>
 *
 * <p>This Module focuses on the core algorithm of matching an intent against a
 * list of Inbounds, (aka AppDescriptor signature objects), which in addition
 * have a property resolutionResult representing an "opaque"
 * resolutionResult.</p>
 *
 * <p>getLinks should be called with already expanded hash fragment.
 * The output of getLinks should then be postprocessed for
 * compaction, outside this service.</p>
 *
 * <p>
 *   Missing:
 *   <ul>
 *   <li>Scope mechanism</li>
 *   <li>Parameter expansion with dynamic parameters</li>
 *   </ul>
 * </p>
 *
 * <p><b>NOTE:</b> Currently the ABAP adapter also delegates isIntentSupported
 * <b>only</b> (=erroneously) to the resolveHashFragment adapter implementation,
 * missing intents injected via custom resolver plug-ins.  The custom resolver
 * hook functionality is currently outside of this method (only affecting
 * resolveHashFragment), as before. The future architecture should handle this
 * consistently.</p>
 *
 * <p><b>NOTE:</b> Old implementations also gave inconsistent results. For example
 * the ABAP adapter on isIntentSupported did call directly the adapter, not the
 * service, thus missing additional targets added only via a custom resolver.</p>
 *
 * <p> In the future, the custom resolver mechanism should be probably moved
 * towards modifying (or only adding to the list of Inbounds), this way a
 * single data source has to be altered to support consistently
 * getLinks, isIntentSupported.</p>
 *
 * @version 1.56.5
 */
sap.ui.define([
    "sap/ushell/utils",
    "sap/ushell/services/_ClientSideTargetResolution/Utils",
    "sap/ushell/services/AppConfiguration",
    "sap/ushell/services/_ClientSideTargetResolution/InboundProvider",
    "sap/ushell/services/_ClientSideTargetResolution/InboundIndex",
    "sap/ushell/services/_ClientSideTargetResolution/VirtualInbounds",
    "sap/ushell/services/_ClientSideTargetResolution/Search",
    "sap/ushell/services/_ClientSideTargetResolution/StagedLogger",
    "sap/ushell/services/_ClientSideTargetResolution/Formatter",
    "sap/ushell/navigationMode",
    "sap/ushell/Config",
    "sap/ui/thirdparty/URI"
], function (
    oUtils,
    oCSTRUtils,
    appConfiguration,
    InboundProvider,
    InboundIndex,
    VirtualInbounds,
    oSearch,
    oLogger,
    oFormatter,
    oNavigationMode,
    Config,
    URI
) {
    "use strict";

    /* global jQuery, sap, Promise */

    /**
     * <p>A module to perform client side target resolution where possible, based
     * on a complete list of Inbounds.</p>
     *
     * <p>This list defines a common strategy for selecting <b>one</b> appropriate
     * target (even in case of conflicts) across all platforms.</p>
     *
     * <p>The interface assumes a <b>complete</b> list of inbounds has been
     * passed, including parameter signatures. The array of inbounds is to be
     * injected by the <code>oAdapter.getInbounds()</code> function.
     *
     * <p>Note that the resolution results (e.g. targets and descriptions) may
     * <b>not</b> be present on the client.</p>
     *
     * <p>All interfaces shall still be asynchronous interfaces w.r.t client
     * invocation.</p>n
     *
     * The following request can be served from the client:
     * <ol>
     * <li>isIntentSupported</li>
     * <li>getLinks</li>
     * </ol>
     *
     * <p>This module does <b>not</b> perform hash expansion or compaction.</p> This
     * is performed by respective preprocessing of the hash (see
     * {@link sap.ushell.services.NavTargetResolution#resolveHashFragment}) and:</p>
     *
     * <ul>
     * <li>resolveHashFragment    (expansion, NavTargetResolution.isIntentSupported)</li>
     * <li>isIntentSupported
     * <li>getLinks   (post processing, Service)</li>
     * </ul>
     *
     *
     * <p>
     * the Parameter sap-ui-tech-hint can be used to attempt to give one Ui technology preference
     * over another, legal values are UI5, WDA, GUI
     * </p>
     *
     *
     *
     *
     * Usage:
     *
     * <pre>
     * var oSrvc = sap.ushell.Container.getService("ClientSideTargetResolution");
     * oSrvc.isIntentSupported("#SemanticObject-action");
     * </pre>
     *
     * @name sap.ushell.services.ClientSideTargetResolution
     *
     * @param {object} oAdapter
     *   Adapter, provides an array of Inbounds
     * @param {object} oContainerInterface
     *   Not in use
     * @param {string} sParameters
     *   Parameter string, not in use
     * @param {object} oServiceConfiguration
     *   The service configuration not in use
     *
     * @constructor
     * @class
     * @see {@link sap.ushell.services.Container#getService}
     * @since 1.32.0
     */
    function ClientSideTargetResolution (oAdapter, oContainerInterface, sParameters, oServiceConfiguration) {
        this._init.apply(this, arguments);
    }

    var S_LOCAL_SYSTEM_ALIAS = "";  // the empty value means the LOCAL system alias. Adapter should resolve this by design.
    var O_SYSTEM_ALIAS_SEMANTICS = {
        apply: "apply",
        applied: "applied"
    };

    ClientSideTargetResolution.prototype._init = function (oAdapter, oContainerInterface, sParameters, oServiceConfiguration) {
        // A unique (sequential) id used during logging.
        this._iLogId = 0;

        sap.ui.lazyRequire("sap/ui/generic/app/navigation/service/SelectionVariant");

        if (!this._implementsServiceInterface(oAdapter)) {
            jQuery.sap.log.error(
                "Cannot get Inbounds",
                "ClientSideTargetResolutionAdapter should implement getInbounds method",
                "sap.ushell.services.ClientSideTargetResolution"
            );
            return;
        }

        this._oInboundProvider = new InboundProvider(oAdapter.getInbounds.bind(oAdapter));

        // Deferred objects resolved once the easy access systems are obtained
        this._oHaveEasyAccessSystemsDeferreds = {
            userMenu: null,
            sapMenu: null
        };

        this._oServiceConfiguration = oServiceConfiguration;

        this._oAdapter = oAdapter;
    };

    /**
     * Checks whether the platform adapter has a compatible service
     * interface.
     *
     * @param {object} oAdapter
     *   An instance of ClientSideTargetResolution Adapter for the platform
     *   at hand.
     *
     * @return {boolean}
     *   Whether the adapter implements the ClientSideTargetResolution
     *   required interface.
     */
    ClientSideTargetResolution.prototype._implementsServiceInterface = function (oAdapter) {
        if (typeof oAdapter.getInbounds === "function") {
            return true;
        }
        return false;
    };


    ClientSideTargetResolution.prototype._getURLParsing = function () {
        if (!this._oURLParsing) {
            this._oURLParsing = sap.ushell.Container.getService("URLParsing");
        }
        return this._oURLParsing;
    };

    /**
     * Determine whether we are dealing with local full url construction
     * (given sap.wda namespace, construct a full url)
     *
     * @param {object} oMatchResult
     *    The current match result
     *
     * @returns {boolean}
     *    Whether a local WDA resolution is to be made.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._isFullLocalWDAResolution = function (oMatchResult) {
        var oInbound = oMatchResult.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult;

        if (this._oServiceConfiguration && this._oServiceConfiguration.config && this._oServiceConfiguration.config["enableWdaLocalResolution"] === false) {
            return false;
        }

        return !(!oInbound ||
            !oResolutionResult ||
            !(oResolutionResult["sap.wda"]) ||
            !(oResolutionResult.applicationType === "WDA")
        );
    };

    /**
     * Determine whether we can apply local WDA resolution.
     *
     * @param {object} oMatchResult
     *    The current match result
     *
     * @returns {boolean}
     *    Whether a local WDA resolution is to be made.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._isLocalWDAResolution = function (oMatchResult) {
        var oInbound = oMatchResult.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult;

        if (this._oServiceConfiguration && this._oServiceConfiguration.config && this._oServiceConfiguration.config["enableWdaLocalResolution"] === false) {

            return false;
        }

        return !(!oInbound ||
            !oResolutionResult ||
            !(oResolutionResult.applicationType === "WDA")
        );
    };

    /**
     * Determine whether we are dealing with local full url construction
     * (given sap.gui namespace with Transaction id, construct a full url)
     *
     * @param {object} oMatchResult
     *    The current match result
     *
     * @returns {boolean}
     *    Whether a local WDA resolution is to be made.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._isFullLocalWebguiResolution = function (oMatchResult) {
        var oInbound = oMatchResult.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult;

        if (this._oServiceConfiguration && this._oServiceConfiguration.config && this._oServiceConfiguration.config["enableWebguiLocalResolution"] === false) {
            return false;
        }

        return !(!oInbound ||
            !oResolutionResult ||
            !(oResolutionResult["sap.gui"]) ||
            !(oResolutionResult.applicationType === "TR")
        );
    };

    /**
     * Determine whether we can apply local Webgui resolution for
     * non-wrapped URLs.
     *
     * <p>Example:
     * <code>/ui2/nwbc/~canvas;window=app/transaction/SU01</code>
     * </p>
     *
     * @param {object} oMatchResult
     *    The current match result
     *
     * @returns {boolean}
     *    Whether a local Webgui resolution is to be made.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._isLocalWebguiNowrapResolution = function (oMatchResult) {
        var oInbound = oMatchResult.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult;

        if (this._oServiceConfiguration && this._oServiceConfiguration.config && this._oServiceConfiguration.config["enableWebguiLocalResolution"] === false) {

            return false;
        }

        // possible wrapped URLs:
        // - <protocol>://<host>:<port>/ui2/nwbc/~canvas;window=app/transaction/APB_LPD_CALL_B_I_TXN?DYNP_OKCODE=onli&P_APPL=FS2_TEST&P_CTO=EA%20%20X%20X&P_DYNNR=1000&P_OBJECT=&P_OKCODE=OKCODE&P_PRGRAM=FOOS&P_ROLE=FS2SAMAP&P_SELSCR=X&P_TCODE=SU01&sap-client=120&sap-language=EN"
        // - /ui2/nwbc/~canvas;window=app/transaction/APB_LPD_CALL_TRANS?DYNP_OKCODE=onli&P_APPL=UI_INTEGRATION_SAMPLES&P_OBJECT=&P_PNP=&P_ROLE=FLP_SAMPLE&P_SELSCR=X&P_TCODE=SU01&sap-client=120&sap-language=EN&sap-theme=sap_bluecrystal

        return !((!oInbound ||
            !oResolutionResult ||
            !(oResolutionResult.applicationType === "TR") ||
            !(oResolutionResult.url.indexOf("/~canvas;") >= 0) ||
            !(oResolutionResult.url.indexOf("app/transaction/APB_LPD_CALL_") === -1)) // check no WRAPPED transaction
        );
    };

    /**
     * Determine whether we can apply local Webgui resolution for wrapped
     * URLs.
     *
     * <p>Examples:</p>
     * <p>
     * <code><protocol>://<host>:<port>/ui2/nwbc/~canvas;window=app/transaction/APB_LPD_CALL_B_I_TXN?DYNP_OKCODE=onli&P_APPL=FS2_TEST&P_CTO=EA%20%20X%20X&P_DYNNR=1000&P_OBJECT=&P_OKCODE=OKCODE&P_PRGRAM=FOOS&P_ROLE=FS2SAMAP&P_SELSCR=X&P_TCODE=SU01&sap-client=120&sap-language=EN"</code>
     * <code>/ui2/nwbc/~canvas;window=app/transaction/APB_LPD_CALL_TRANS?DYNP_OKCODE=onli&P_APPL=UI_INTEGRATION_SAMPLES&P_OBJECT=&P_PNP=&P_ROLE=FLP_SAMPLE&P_SELSCR=X&P_TCODE=SU01&sap-client=120&sap-language=EN&sap-theme=sap_bluecrystal</code>
     * </p>
     *
     * @param {object} oMatchResult
     *    The current match result
     *
     * @returns {boolean}
     *    Whether a local Webgui resolution is to be made.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._isLocalWebguiWrapResolution = function (oMatchResult) {
        var oInbound = oMatchResult.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult;

        if (this._oServiceConfiguration && this._oServiceConfiguration.config && this._oServiceConfiguration.config["enableWebguiLocalResolution"] === false) {

            return false;
        }

        return !((!oInbound ||
            !oResolutionResult ||
            !(oResolutionResult.applicationType === "TR") ||
            !(oResolutionResult.url.indexOf("/~canvas;") >= 0) ||
            !(oResolutionResult.url.indexOf("app/transaction/APB_LPD_CALL_") >= 0)) // check WRAPPED transaction
        );
    };

    /**
     * Determine whether we can apply local Webgui resolution for
     * wrapped URLs.
     *
     * <p>Example:
     * <code>/sap/bc/gui/sap/its/webgui;~sysid=UV2;~service=3255?%7etransaction=*APB_LPD_CALL_TRANS%20DYNP_OKCODE%3donli%3bP_APPL%3dUI_INTEGRATION_SAMPLES%3bP_OBJECT%3d%3bP_PNP%3d%3bP_ROLE%3dFLP_SAMPLE%3bP_SELSCR%3dX%3bP_TCODE%3dSU01&%7enosplash=1&sap-client=120&sap-language=EN</code>
     * </p>
     *
     * @param {object} oMatchResult
     *    The current match result
     *
     * @returns {boolean}
     *    Whether a local native Webgui resolution is to be made.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._isLocalNativeWebguiWrapResolution = function (oMatchResult) {
        var oInbound = oMatchResult.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult;

        if (this._oServiceConfiguration && this._oServiceConfiguration.config && this._oServiceConfiguration.config["enableNativeWebguiLocalResolution"] === false) {
            return false;
        }

        // Possible URL:
        // /sap/bc/gui/sap/its/webgui;~sysid=UV2;~service=3255?%7etransaction=*APB_LPD_CALL_TRANS%20DYNP_OKCODE%3donli%3bP_APPL%3dUI_INTEGRATION_SAMPLES%3bP_OBJECT%3d%3bP_PNP%3d%3bP_ROLE%3dFLP_SAMPLE%3bP_SELSCR%3dX%3bP_TCODE%3dSU01&%7enosplash=1&sap-client=120&sap-language=EN

        return !((// a native webgui URL
        !oInbound ||
            !oResolutionResult ||
            !(oResolutionResult.applicationType === "TR") ||
            !(oResolutionResult.url.indexOf("/its/webgui") >= 0) ||
            !(oResolutionResult.url.indexOf("APB_LPD_CALL_") !== -1)) // a WRAPPED URL
        );
    };

    /**
     * Determine whether we can apply local Webgui resolution for
     * non-wrapped URLs.
     *
     * <p>Example:
     * <code>/sap/bc/gui/sap/its/webgui;~sysid=UV2;~service=3255;~transaction=SU01?sap-client=120&sap-language=EN</code>
     * </p>
     *
     * @param {object} oMatchResult
     *    The current match result
     *
     * @returns {boolean}
     *    Whether a local native Webgui resolution is to be made.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._isLocalNativeWebguiNowrapResolution = function (oMatchResult) {
        var oInbound = oMatchResult.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult;

        if (this._oServiceConfiguration && this._oServiceConfiguration.config && this._oServiceConfiguration.config["enableNativeWebguiLocalResolution"] === false) {
            return false;
        }

        // Possible URL:
        // /sap/bc/gui/sap/its/webgui;~sysid=UV2;~service=3255;~transaction=SU01?sap-client=120&sap-language=EN

        return !((// a native webgui URL
        !oInbound ||
            !oResolutionResult ||
            !(oResolutionResult.applicationType === "TR") ||
            !(oResolutionResult.url.indexOf("/its/webgui") >= 0) ||
            !(oResolutionResult.url.indexOf("APB_LPD_CALL_") === -1)) // a non wrapped URL
        );
    };

    /**
     * return true iff any of the signature parameters of oMatchingTarget indicate
     * a renaming is happening
     * @param {object} oMatchingTarget
     *  a matchign target
     * @return {boolean}
     *  whether a renaming is part of the signature
     */
    ClientSideTargetResolution.prototype._hasRenameTo = function (oMatchingTarget) {
        return oMatchingTarget.inbound && oMatchingTarget.inbound.signature &&
            oMatchingTarget.inbound.signature.parameters &&
            Object.keys(oMatchingTarget.inbound.signature.parameters).some(function (sKey) {
                return !!(oMatchingTarget.inbound.signature.parameters[sKey].renameTo);
            });
    };

    /**
     * Clean up the unused complex parameter values from the default list
     *
     * After the invocation, the
     *  oMatchingTarget.resolutionResult.oNewAppStateMembers
     *  contains the actually *used* members (members present are deleted from the collection)
     *  Thus all defaultedParameterNames which are  thus the following defaultedParameterNames can be d
     * a) complex and b) not part of oMatchingTarget.resolutionResult.oNewAppStateMembers
     * can be removed, as they were effectively not defaulted
     * @param {object} oMatchingTarget the matching target
     * @private
     */
    ClientSideTargetResolution.prototype._removeUnusedComplexParameterValuesFromDefaultList = function (oMatchingTarget) {
        oMatchingTarget.defaultedParamNames = oMatchingTarget.defaultedParamNames.filter(function (sName) {
            if (oMatchingTarget.intentParamsPlusAllDefaults[sName] && !jQuery.isArray(oMatchingTarget.intentParamsPlusAllDefaults[sName])) {
                if (!(oMatchingTarget.resolutionResult.oNewAppStateMembers && oMatchingTarget.resolutionResult.oNewAppStateMembers[sName])) {
                    return false;
                }
            }
            return true;
        });
    };

    /**
     *  read: defaultedParamNames
     *        inbound.signature.parameters
     *  created: mappedDefaultedParamNames
     * @param {object} oMatchingTarget the matching target
     * @private
     */
    ClientSideTargetResolution.prototype._mapDefaultParameterNames = function (oMatchingTarget) {
        var oParameters = jQuery.sap.getObject("inbound.signature.parameters", undefined, oMatchingTarget) || {},
            oMap = {};
        oMatchingTarget.defaultedParamNames.forEach(function (sName) {
            var sNewName = (oParameters[sName] && oParameters[sName].renameTo) || sName;
            if (oMap[sNewName]) {
                jQuery.sap.log.error("renaming of defaultedParamNames creates duplicates" + sName + "->" + sNewName);
            } else {
                oMap[sNewName] = true;
            }
        });
        oMatchingTarget.mappedDefaultedParamNames = Object.keys(oMap).sort();
    };

    /**
     * This method modifies a passed Application State if
     * extended User Defaults are to be merged with an AppState or renaming takes place.
     *
     * It also *always* takes care of renaming parameters (generating mappedDefauledParamNames)
     * Thus it must be invoked in the flow even for targets which do not deal with appstate
     *
     * If one or more extended user default values are present, they will be added to a new
     * AppState unless already present
     *
     * A new Appstate is created when renaming has to occur or parameters are merged
     * <note>
     * If an incoming AppState content is encountered which is not
     * a) undefined or (b) an object, no new AppState is created and no renaming
     * or default merging takes place. The original passed AppState is returned unchanged
     *</note>
     *
     *Note that within this function also renaming of default Parameter names takes place
     *(independent of whether the AppState was tampered with!
     *
     * Technically, we
     * a) remove defaulted parameters which are already present
     * b) merge the remaining parameters into the appstate
     * c) rename the app state, logging collisions
     * d) remove effectively not used defaults from defaultParamNames
     * e) remap defaultParamNames in case of renameTo
     *
     * The new AppState is mixed it into the resolution result
     *
     * After the invocation, the
     * oMatchingTarget.resolutionResult.oNewAppStateMembers
     * contains the actually *used* members (members present are deleted from the collection)
     * Thus all defaultedParameterNames which are  thus the following defaultedParameterNames can be d
     * a) complex and b) not part of oMatchingTarget.resolutionResult.oNewAppStateMembers
     * can be removed, as they were effectively not defaulted
     *
     * If one or more extended user default values are present, they will be added to a new
     * AppState. In case there is an existing AppState, it's values will be copied as well.
     * The new AppState is mixed it into the resolution result.
     * If no extended user default value is present, the existing AppState is reused.
     * @param {object} oMatchingTarget
     *   One of the objects returned by {@link #_getMatchingInbounds}.
     * @param {object} oAppStateService
     *   the app state service instance
     * @returns {object}
     *   jQuery promise
     * @private
     * @since 1.34.0
     *
     */
    ClientSideTargetResolution.prototype._mixAppStateIntoResolutionResultAndRename = function (oMatchingTarget, oAppStateService) {
        var oDeferred = new jQuery.Deferred(),
            that = this,
            oNewAppState,
            sSourceAppStateKey,
            oSourceAppStateData;

        var oResolutionResult = oMatchingTarget.resolutionResult;

        function cleanupAndResolve (oTarget) {
            var oNavModeProperties;

            that._removeUnusedComplexParameterValuesFromDefaultList(oTarget);
            that._mapDefaultParameterNames(oTarget);

            // compute NavigationMode
            oNavModeProperties = oNavigationMode.compute(
                jQuery.sap.getObject("inbound.resolutionResult.applicationType", undefined, oTarget),
                (oTarget.intentParamsPlusAllDefaults["sap-ushell-next-navmode"] || [])[0],
                (oTarget.intentParamsPlusAllDefaults["sap-ushell-navmode"] || [])[0],
                (appConfiguration.getCurrentApplication() || {}).applicationType,
                // that._oServiceConfiguration && that._oServiceConfiguration.config && that._oServiceConfiguration.config.enableInPlaceForClassicUIs
                Config.last("/core/navigation/enableInPlaceForClassicUIs")
            );
            oUtils.shallowMergeObject(oTarget.resolutionResult, oNavModeProperties);

            // remove oNewAppStateMembers as it is not needed afterwards anymore
            delete oTarget.resolutionResult.oNewAppStateMembers;
            oDeferred.resolve(oTarget);
        }

        function hasAppStateMembers (oResolutionResult) {
            return (oResolutionResult.oNewAppStateMembers && !jQuery.isEmptyObject(oResolutionResult.oNewAppStateMembers));
        }

        function isPresentProperty (aList, aParamName) {
            return jQuery.isArray(aList) && aList.some(function (oMember) {
                return (aParamName.indexOf(oMember) !== -1);
            });
        }

        function checkIfParameterExists (oAppStateData, aParamName) {
            var oSelectionVariant,
                aPNs,
                aSOs;
            // check whether parameter exists as part of selectionVariant.Parameters or SelectOptions
            if (oAppStateData && oAppStateData.selectionVariant) {
                oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(JSON.stringify(oAppStateData.selectionVariant));
                aSOs = oSelectionVariant.getSelectOptionsPropertyNames() || [];
                aPNs = oSelectionVariant.getParameterNames() || [];
                if (isPresentProperty(aSOs, aParamName) || isPresentProperty(aPNs, aParamName)) {
                    return true;
                }
            }
            return false;
        }

        function renameAndRemoveDuplicates (oSelectionVariant, oRecordChange, oParameters, bIgnoreAdditionalParameters) {
            var oResultingSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(),
                aSelectionVariantParameterNames = oSelectionVariant.getParameterNames() || [],
                aSelectionVariantSelectOptionsPropertyNames = oSelectionVariant.getSelectOptionsPropertyNames() || [],
                sParamValue,
                aSelectOption;

            // Rename parameters and remove duplicates
            aSelectionVariantParameterNames.forEach(function (sParamName) {
                sParamValue = oSelectionVariant.getParameter(sParamName);

                // ignore parameter if it's not required
                if (bIgnoreAdditionalParameters && !oParameters[sParamName]) {
                    oRecordChange.deleted = true;
                    return;
                }

                if (oParameters[sParamName] && oParameters[sParamName].renameTo) {  // parameter is in signature
                    // Check whether a parameter with the -renameTo- name already exists as part of the SelectionVariant
                    if ((oResultingSelectionVariant.getParameter(oParameters[sParamName].renameTo) === undefined) &&
                        (oResultingSelectionVariant.getSelectOption(oParameters[sParamName].renameTo) === undefined)) {

                        oResultingSelectionVariant.addParameter(oParameters[sParamName].renameTo, sParamValue);
                        oRecordChange.changed = true;
                    } else {
                        jQuery.sap.log.error("renaming of appstate creates duplicates " + sParamName + "->" + oParameters[sParamName].renameTo);
                    }
                } else {
                    /* eslint-disable no-lonely-if */
                    if ((oResultingSelectionVariant.getParameter(sParamName) === undefined) &&
                        (oResultingSelectionVariant.getSelectOption(sParamName) === undefined)) {

                        oResultingSelectionVariant.addParameter(sParamName, sParamValue);
                    }
                    /* eslint-enable no-lonely-if */
                }
            });

            // Rename SelectOptions and remove duplicates
            aSelectionVariantSelectOptionsPropertyNames.forEach(function (sSelectOptionPropertyName) {
                aSelectOption = oSelectionVariant.getSelectOption(sSelectOptionPropertyName);

                // ignore parameter if it's not required
                if (bIgnoreAdditionalParameters && !oParameters[sSelectOptionPropertyName]) {
                    oRecordChange.deleted = true;
                    return;
                }

                if (oParameters[sSelectOptionPropertyName] && oParameters[sSelectOptionPropertyName].renameTo) {
                    // Check whether a parameter with the -renameTo- name already exists as part of the SelectionVariant
                    if ((oResultingSelectionVariant.getSelectOption(oParameters[sSelectOptionPropertyName].renameTo) === undefined) &&
                        (oResultingSelectionVariant.getParameter(oParameters[sSelectOptionPropertyName].renameTo) === undefined)) {
                        oResultingSelectionVariant.massAddSelectOption(oParameters[sSelectOptionPropertyName].renameTo, aSelectOption);
                        oRecordChange.changed = true;
                    } else {
                        jQuery.sap.log.error("renaming of appstate creates duplicates " + sSelectOptionPropertyName + "->" + oParameters[sSelectOptionPropertyName].renameTo);
                    }
                } else {
                    /* eslint-disable no-lonely-if */
                    if ((oResultingSelectionVariant.getSelectOption(sSelectOptionPropertyName) === undefined) &&
                        (oResultingSelectionVariant.getParameter(sSelectOptionPropertyName) === undefined)) {
                        oResultingSelectionVariant.massAddSelectOption(sSelectOptionPropertyName, aSelectOption);
                    }
                    /* eslint-enable no-lonely-if */
                }
            });

            // Remove all parameters from source SelectionVariant
            aSelectionVariantParameterNames.forEach(function (sParamName) {
                oSelectionVariant.removeParameter(sParamName);
            });
            // Remove all SelectOptions from source SelectionVariant
            aSelectionVariantSelectOptionsPropertyNames.forEach(function (sSelectOptionPropertyName) {
                oSelectionVariant.removeSelectOption(sSelectOptionPropertyName);
            });

            // Copy all parameters and SelectOptions from resulting SelectionVariant into source SelectionVariant,
            // because other important attributes as ID, Text, ParameterContextUrl, FilterContextUrl need to be kept as they were before
            oResultingSelectionVariant.getParameterNames().forEach(function (sParamName) {
                oSelectionVariant.addParameter(sParamName, oResultingSelectionVariant.getParameter(sParamName));
            });
            oResultingSelectionVariant.getSelectOptionsPropertyNames().forEach(function (sSelectOptionPropertyName) {
                oSelectionVariant.massAddSelectOption(sSelectOptionPropertyName, oResultingSelectionVariant.getSelectOption(sSelectOptionPropertyName));
            });

            return oSelectionVariant;
        }

        function isInvalidAppStateData (oData) {
            if (oData === undefined || jQuery.isPlainObject(oData)) {
                return false;
            }
            return true;
        }

        function fnMergeAppState (oNewAppState0) {
            // at this point, oNewAppState Members only contains members which are to be added!
            // (there should be no collisions!)
            var oNewAppStateData = oNewAppState0.getData() || {},
                oSelectionVariant,
                oChangeRecorder = {};

            var oSignature = oMatchingTarget.inbound.signature;

            if (oNewAppStateData.selectionVariant) {
                oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(JSON.stringify(oNewAppStateData.selectionVariant));
            } else {
                oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant();
            }

            if (hasAppStateMembers(oResolutionResult)) {
                Object.keys(oResolutionResult.oNewAppStateMembers).forEach(function (sName) {
                    oSelectionVariant.massAddSelectOption(sName, oResolutionResult.oNewAppStateMembers[sName].Ranges);
                });
            }

            var bIgnoreAdditionalParameters = oSignature.additionalParameters === "ignored";
            oSelectionVariant = renameAndRemoveDuplicates(oSelectionVariant, oChangeRecorder, oSignature.parameters, bIgnoreAdditionalParameters);

            if (oSelectionVariant.getParameterNames().length !== 0 || oSelectionVariant.getSelectOptionsPropertyNames().length !== 0 || oChangeRecorder.deleted) {
                oNewAppStateData.selectionVariant = oSelectionVariant.toJSONObject();
            }

            if (!oChangeRecorder.changed && !oChangeRecorder.deleted && !hasAppStateMembers(oResolutionResult)) {
                // there was no effective change -> retain old appstate
                cleanupAndResolve(oMatchingTarget);
                return;
            }
            oNewAppState0.setData(oNewAppStateData);
            oNewAppState0.save().done(function () {
                oMatchingTarget.intentParamsPlusAllDefaults["sap-xapp-state"] = [oNewAppState0.getKey()];
                oMatchingTarget.mappedIntentParamsPlusSimpleDefaults["sap-xapp-state"] = [oNewAppState0.getKey()];
                cleanupAndResolve(oMatchingTarget);
            });
        }

        if (!hasAppStateMembers(oResolutionResult) && !that._hasRenameTo(oMatchingTarget)) {
            // keep old AppState
            cleanupAndResolve(oMatchingTarget);
        } else {
            sSourceAppStateKey = oMatchingTarget.intentParamsPlusAllDefaults["sap-xapp-state"] &&
                oMatchingTarget.intentParamsPlusAllDefaults["sap-xapp-state"][0];

            if (sSourceAppStateKey) {
                // if an AppState key is already present as part of the intent parameters, take
                // this one and copy its data to a new AppState (remember, AppState instances
                // are immutable)
                oAppStateService.getAppState(sSourceAppStateKey).done(function (oSourceAppState) {
                    var oParameterDominatorMap = oCSTRUtils.constructParameterDominatorMap(oMatchingTarget.inbound.signature.parameters);
                    oSourceAppStateData = oSourceAppState.getData();
                    // if the data is not usable ...
                    if (isInvalidAppStateData(oSourceAppStateData)) {
                        // we indicate removal of all extended defaults!
                        delete oResolutionResult.oNewAppStateMembers;
                        // and return the old appstate
                        cleanupAndResolve(oMatchingTarget);
                    }
                    if (oResolutionResult.oNewAppStateMembers) {
                        Object.keys(oResolutionResult.oNewAppStateMembers).forEach(function (sParamName) {
                            var aDominatorParams = oParameterDominatorMap[sParamName].dominatedBy;
                            if (checkIfParameterExists(oSourceAppStateData, aDominatorParams)) {
                                delete oResolutionResult.oNewAppStateMembers[sParamName];
                            }
                        });
                    }

                    if (!hasAppStateMembers(oResolutionResult) && !that._hasRenameTo(oMatchingTarget)) {
                        // keep old AppState
                        cleanupAndResolve(oMatchingTarget);
                    } else {
                        oNewAppState = oAppStateService.createEmptyAppState(undefined, true);
                        if (oNewAppState) {
                            oNewAppState.setData(oSourceAppState.getData());
                            fnMergeAppState(oNewAppState);
                        }
                    }
                });
            } else if (hasAppStateMembers(oResolutionResult)) {
                fnMergeAppState(oAppStateService.createEmptyAppState(undefined, true));
            } else {
                // no need to rename in nonexisting appstate
                cleanupAndResolve(oMatchingTarget);
            }
        }
        return oDeferred.promise();
    };

    /**
     * Expand inbound filter object for the CSTR Adapter if enabled via configuration.
     *
     * @param {variant} vObject
     *   An input structure to extract the filter from.
     *   Currently we support a string representing a hash fragment.
     *
     * @returns {object[]}
     *   <code>undefined</code>, or an array of Segments (tuples semanticObject, action) in the form:
     * <pre>
     *  [
     *    {
     *      semanticObject : "So1",
     *      action : "action1"
     *    },
     *    ...
     *  ]
     * </pre>
     *
     */
    ClientSideTargetResolution.prototype._extractInboundFilter = function (vObject) {
        if (!this._oAdapter.hasSegmentedAccess) {
            return undefined;
        }
        if (typeof vObject !== "string") {
            return undefined;
        }

        var sFixedHashFragment = vObject.indexOf("#") === 0 ? vObject : "#" + vObject;
        var oShellHash = this._getURLParsing().parseShellHash(sFixedHashFragment);

        if (!oShellHash || !oShellHash.semanticObject || !oShellHash.action) {
            return undefined;
        }

        return [{
            semanticObject: oShellHash.semanticObject,
            action: oShellHash.action
        }];
    };

    /**
     * Resolves the URL hash fragment asynchronously.
     * <p>
     * The form factor of the current device is used to filter the
     * navigation targets returned.
     * </p>
     * @param {string} sHashFragment
     *   The URL hash fragment in internal format (as obtained by the hasher service from SAPUI5,
     *   not as given in <code>location.hash</code>)
     *
     * @returns {object}
     *   A <code>jQuery.Promise</code>. Its <code>done()</code> function
     *   gets an object that you can use to create a {@link
     *   sap.ushell.components.container.ApplicationContainer} or
     *   <code>undefined</code> in case the hash fragment was empty.
     *
     * @private
     * @since 1.34.0
     */
    ClientSideTargetResolution.prototype.resolveHashFragment = function (sHashFragment) {
        var that = this,
            oDeferred = new jQuery.Deferred(),
            // NOTE: adapter may not implement fallback function
            fnBoundFallback = this._oAdapter.resolveHashFragmentFallback && this._oAdapter.resolveHashFragmentFallback.bind(this._oAdapter),
            aSegments = this._extractInboundFilter(sHashFragment);

        this._oInboundProvider.getInbounds(aSegments)
            .then(function (oInboundIndex) {
                that._resolveHashFragment(sHashFragment, fnBoundFallback, oInboundIndex)
                    .done(function (o) {
                        return oDeferred.resolve(o);
                    })
                    .fail(oDeferred.reject.bind(oDeferred));
            }, function () {
                oDeferred.reject.apply(oDeferred, arguments);
            });

        return oDeferred.promise();
    };

    /**
     * Resolves a given intent to information that can be used to render a tile.
     *
     * @param {string} sHashFragment
     *   The intent to be resolved (including the "#" sign)
     *
     * @return {jQuery.Deferred.promise}
     *   A promise that resolves with an object containing the necessary
     *   information to render a tile, or rejects with an error message or
     *   <code>undefined</code>.
     *
     * @private
     * @since 1.38.0
     */
    ClientSideTargetResolution.prototype.resolveTileIntent = function (sHashFragment) {
        var that = this,
            oDeferred = new jQuery.Deferred(),

            // NOTE: adapter may not implement fallback function
            aSegments = this._extractInboundFilter(sHashFragment);

        this._oInboundProvider.getInbounds(aSegments).then(
            function (oInboundIndex) {
                that._resolveTileIntent(sHashFragment, undefined, oInboundIndex)
                    .done(oDeferred.resolve.bind(oDeferred))
                    .fail(oDeferred.reject.bind(oDeferred));
            },
            function () {
                oDeferred.reject.apply(oDeferred, arguments);
            }
        );
        return oDeferred.promise();
    };

    /**
     * Resolves the given tile intent in the context of the given inbounds.
     *
     * @param {array} aInbounds
     *   The Inbounds.
     * @param {string} sHashFragment
     *   The intent to be resolved.
     *
     * @private
     */
    ClientSideTargetResolution.prototype.resolveTileIntentInContext = function (aInbounds, sHashFragment) {
        var oInboundIndex,
            oDeferred = new jQuery.Deferred();

        // create Inbound Index for aInbounds
        oInboundIndex = InboundIndex.createIndex(
            aInbounds.concat(VirtualInbounds.getInbounds())
        );

        this._resolveTileIntent(sHashFragment, undefined /* fnBoundFallback */, oInboundIndex)
            .done(oDeferred.resolve.bind(oDeferred))
            .fail(oDeferred.reject.bind(oDeferred));

        return oDeferred.promise();
    };

    ClientSideTargetResolution.prototype._resolveHashFragment = function (sHashFragment, fnBoundFallback, oInboundIndex) {
        var oUrlParsing = this._getURLParsing(),
            that = this,
            oDeferred = new jQuery.Deferred(),
            sFixedHashFragment = sHashFragment.indexOf("#") === 0 ? sHashFragment : "#" + sHashFragment,
            oShellHash = oUrlParsing.parseShellHash(sFixedHashFragment);

        if (oShellHash === undefined) {
            jQuery.sap.log.error("Could not parse shell hash '" + sHashFragment + "'",
                "please specify a valid shell hash",
                "sap.ushell.services.ClientSideTargetResolution");
            return oDeferred.reject().promise();
        }

        oShellHash.formFactor = oUtils.getFormFactor();

        this._getMatchingInbounds(oShellHash, oInboundIndex, { bExcludeTileInbounds: true })
            .fail(function (sError) {
                jQuery.sap.log.error("Could not resolve " + sHashFragment,
                    "_getMatchingInbounds promise rejected with: " + sError,
                    "sap.ushell.services.ClientSideTargetResolution");
                oDeferred.reject(sError);
            })
            .done(function (aMatchingTargets) {
                var oMatchingTarget;

                if (aMatchingTargets.length === 0) {
                    jQuery.sap.log.warning("Could not resolve " + sHashFragment,
                        "rejecting promise",
                        "sap.ushell.services.ClientSideTargetResolution");
                    oDeferred.reject("Could not resolve navigation target");
                    return;
                }

                oMatchingTarget = aMatchingTargets[0];

                oCSTRUtils.whenDebugEnabled(function () {
                    // Replacer for JSON.stringify to show undefined values
                    function undefinedReplacer (sKey, vVal) {
                        return this[sKey] === undefined ? "<undefined>" : vVal;
                    }

                    function fnReplacer (key, value) {
                        return (key === "_original") ? undefined : undefinedReplacer.call(this, key, value);
                    }

                    var sMatchedTarget = JSON.stringify(oMatchingTarget, fnReplacer, "   ");

                    jQuery.sap.log.debug(
                        "The following target will now be resolved",
                        sMatchedTarget,
                        "sap.ushell.services.ClientSideTargetResolution"
                    );
                });

                that._resolveSingleMatchingTarget(oMatchingTarget, fnBoundFallback, sFixedHashFragment)
                    .done(function (o) {
                        oDeferred.resolve(o);
                    })
                    .fail(oDeferred.reject.bind(oDeferred));
            });

        return oDeferred.promise();
    };

    /**
     * Produces a resolution result from an Easy Access Menu intent
     * like Shell-startGUI or Shell-startWDA.
     *
     * @param {object} oIntent
     *   The intent to be resolved. It must have semantic object and
     *   actions like: #Shell-startGUI and #Shell-startWDA.
     * @param {object} [oMatchingTarget]
     *   The mathing target, an oInbound.resolutionResult["sap.platform.runtime"] member will be propagated
     * @param {function} [fnBoundFallback]
     * @param {string} [sFixedHashFragment]
     * @returns {Promise}
     *   A promise that resolved with the resolution result generated from
     *   the given intent, or rejects with an error message.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._resolveEasyAccessMenuIntent = function (oIntent, oMatchingTarget, fnBoundFallback, sFixedHashFragment) {
        var sError = "Intent must be either #Shell-startGUI or #Shell-startWDA";

        // Determine whether intent is valid
        if (oIntent.action === "startGUI") {
            return this._resolveEasyAccessMenuIntentWebgui(oIntent, oMatchingTarget, fnBoundFallback, sFixedHashFragment, true);
        }

        if (oIntent.action === "startWDA") {
            return this._resolveEasyAccessMenuIntentWDA(oIntent, oMatchingTarget);
        }

        // Error occurred if this point is reached
        return Promise.reject(
            "The easy access menu intent " + oIntent.semanticObject + "-" + oIntent.action + " could not be resolved: " + sError
        );
    };

    ClientSideTargetResolution.prototype._resolveEasyAccessMenuIntentWDA = function (oIntent, oMatchingTarget) {
        var sConfId,
            sAppId,
            oOtherParams,
            that = this;


        sAppId = oIntent.params["sap-ui2-wd-app-id"][0];
        sConfId = (jQuery.sap.getObject("params.sap-ui2-wd-conf-id", undefined, oIntent) || [])[0];

        oOtherParams = Object.keys(oIntent.params).reduce(function (oResultParams, sParamName) {
            if (sParamName !== "sap-ui2-wd-app-id" && sParamName !== "sap-ui2-wd-conf-id") {
                oResultParams[sParamName] = oIntent.params[sParamName];
            }
            return oResultParams;
        }, {});


        return new Promise(function (fnResolve, fnReject) {
            that._buildWdaURI(sAppId, sConfId, oOtherParams  /* may include sap-system and/or sap-system-src */)
                .done(function (oURI) {
                    var sSapSystemDataSrc = oIntent.params.hasOwnProperty("sap-system-src") && oIntent.params["sap-system-src"][0];

                    var oResolutionResult = {
                        url: oURI.toString(),
                        applicationType: "NWBC",
                        text: sAppId,
                        additionalInformation: "",
                        "sap-system": oIntent.params["sap-system"][0]
                    };

                    if (typeof sSapSystemDataSrc === "string") {
                        oResolutionResult["sap-system-src"] = sSapSystemDataSrc;
                    }

                    if (oMatchingTarget && oMatchingTarget.inbound && oMatchingTarget.inbound.resolutionResult && oMatchingTarget.inbound.resolutionResult["sap.platform.runtime"]) {
                        oResolutionResult["sap.platform.runtime"] = oMatchingTarget.inbound.resolutionResult["sap.platform.runtime"];
                    }

                    fnResolve(oResolutionResult);
                })
                .fail(function (oError) {
                    fnReject(oError);
                });

        });
    };

    /**
     * Creates a native webgui URL given the a resolution result "from" nothing (but either a
     * Shell-startURL intent or a  appdescriptor information
     * like Shell-startGUI or Shell-startWDA.
     *
     * @param {string} sTcode
     *   The transaction code to use, must not be empty
     *
     * @param {string} sSapSystem
     *   A sap system as a string
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that resolved with the URI object
     *
     * @private
     */
    ClientSideTargetResolution.prototype._buildNativeWebGuiURI = function (sTcode, sSapSystem, sSapSystemDataSrc) {
        var sUrl, oURI;
        sUrl = "/gui/sap/its/webgui?%7etransaction=" + sTcode + "&%7enosplash=1";
        oURI = new URI(sUrl);
        return this._spliceSapSystemIntoURI(oURI, S_LOCAL_SYSTEM_ALIAS, sSapSystem, sSapSystemDataSrc, "NATIVEWEBGUI", O_SYSTEM_ALIAS_SEMANTICS.apply);
    };

    /**
     * Creates a WDA URI object based on the provided application id and
     * configuration id of a WDA application.
     *
     * <p>
     * It resolves and interpolates sap-system into
     * the URL if this is present among the other input parameter object.
     * </p>
     *
     * @param {string} sApplicationId
     *   The WDA application id
     *
     * @param {string} [sConfigId]
     *   The WDA config id.
     *
     * @param {object} oOtherParams
     *   Other parameters to be passed to the WDA application. This must be an object like:
     *   <pre>
     *      {
     *          p1: [v1, v2, ... ],
     *          p2: [v3],
     *          ...
     *      }
     *   </pre>
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that resolves with a WDA URI object
     *
     * @private
     */
    ClientSideTargetResolution.prototype._buildWdaURI = function (sApplicationId, sConfigId, oOtherParameters) {
        var sSapSystem,
            sSapSystemDataSrc,
            sUrl,
            oURI,
            oUrlParameters = jQuery.extend(true, {}, oOtherParameters);

        // Add config id if provided
        if (sConfigId) {
            oUrlParameters["sap-wd-configId"] = sConfigId;
        }

        // Extract sap-system (should not appear as a parameter!)
        sSapSystem = oUrlParameters["sap-system"][0];
        delete oUrlParameters["sap-system"];

        // Extract sap-system-src (should not appear as a parameter!)
        if (oUrlParameters.hasOwnProperty("sap-system-src")) {
            sSapSystemDataSrc = oUrlParameters["sap-system-src"][0];
            delete oUrlParameters["sap-system-src"];
        }

        sUrl = "/ui2/nwbc/~canvas;window=app/wda/" + sApplicationId + "/" +
            "?" + this._getURLParsing().paramsToString(oUrlParameters);

        oURI = new URI(sUrl);

        return this._spliceSapSystemIntoURI(oURI, S_LOCAL_SYSTEM_ALIAS, sSapSystem, sSapSystemDataSrc, "WDA", O_SYSTEM_ALIAS_SEMANTICS.apply);
    };

    /**
     * Produces a resolution result "from" nothing (but either a
     * Shell-startURL intent or a  appdescriptor information
     * like Shell-startGUI or Shell-startWDA.
     *
     * @param {object} oIntent
     *   The intent to be resolved. It must have semantic object action #Shell-startGUI
     *   If is assumed to have a sap-system and sap-ui2-tcode parameter
     *
     * @param {object} oMatchingTarget
     *   The matching target, an oInbound.resolutionResult["sap.platform.runtime"] member will be propagated
     *   Test will be taken from this unless
     *   bUseTACodeAsText is truthy
     *
     * @param {object} fnBoundFallback
     * the fallback for the call
     * @param {object} sFixedHashFragment
     * the hash fragment used for a fallback call
     *
     * @param {object} bUseTACodeAsText
     *   if truthy, the value of sap-ui2-tcode parameter will be used as text
     *
     *   a System Alias in the TM will not be used
     * @returns {Promise}
     *   A promise that resolved with the Matching Target(!) amended with the resolution result generated from
     *   the given intent, or rejects with an error message.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._resolveEasyAccessMenuIntentWebgui = function (oIntent, oMatchingTarget, fnBoundFallback, sFixedHashFragment, bUseTACodeAsText) {
        var that = this;

        return new Promise(function (fnResolve, fnReject) {
            var sSapSystemDataSrc;
            if (oIntent.params["sap-system-src"]) {
                sSapSystemDataSrc = oIntent.params["sap-system-src"][0];
            }

            that._buildNativeWebGuiURI( oIntent.params["sap-ui2-tcode"][0], oIntent.params["sap-system"][0], sSapSystemDataSrc)
                .done(function (oURI) {
                    delete oMatchingTarget.intentParamsPlusAllDefaults["sap-ui2-tcode"];
                    // rename Parameters
                    that._mapParameterNamesAndRemoveObjects(oMatchingTarget);
                    var oResolutionResult = that._blendParamsIntoNativeWebGUI(oMatchingTarget.inbound, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults, oURI);
                    if (oResolutionResult && oMatchingTarget.inbound && oMatchingTarget.inbound.resolutionResult && oMatchingTarget.inbound.resolutionResult["sap.platform.runtime"]) {
                        oResolutionResult["sap.platform.runtime"] = oMatchingTarget.inbound.resolutionResult["sap.platform.runtime"];
                    }
                    oResolutionResult["sap-system"] = oIntent.params["sap-system"][0];
                    if (bUseTACodeAsText) {
                        oResolutionResult.text = oIntent.params["sap-ui2-tcode"][0];
                    }
                    fnResolve(oResolutionResult);
                })
                .fail(function (sError) {
                    fnReject(sError);
                });
        });
    };

    ClientSideTargetResolution.prototype._resolveSingleMatchingTarget = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment) {
        var that = this,
            oDeferred = new jQuery.Deferred(),
            oUrlParsingSrvc = this._getURLParsing(),
            oIntent = oUrlParsingSrvc.parseShellHash(sFixedHashFragment);

        if (oIntent.semanticObject === "Shell" && (
                oIntent.action === "startWDA" || oIntent.action === "startGUI")) {

            this._resolveEasyAccessMenuIntent(oIntent, oMatchingTarget,fnBoundFallback, sFixedHashFragment)
                .then(function (oResolutionResult) {
                    // compute NavigationMode
                    var oNavModeProperties = oNavigationMode.compute(
                        jQuery.sap.getObject("inbound.resolutionResult.applicationType", undefined, oMatchingTarget),
                        (oMatchingTarget.intentParamsPlusAllDefaults["sap-ushell-next-navmode"] || [])[0],
                        (oMatchingTarget.intentParamsPlusAllDefaults["sap-ushell-navmode"] || [])[0],
                        (appConfiguration.getCurrentApplication() || {}),
                        Config.last("/core/navigation/enableInPlaceForClassicUIs")
                        // that._oServiceConfiguration && that._oServiceConfiguration.config && that._oServiceConfiguration.config.enableInPlaceForClassicUIs
                    );

                    oUtils.shallowMergeObject(oResolutionResult, oNavModeProperties);

                    oDeferred.resolve(oResolutionResult);
                }, function (sError) {
                    oDeferred.reject(sError);
                });

            return oDeferred.promise();
        }

        // rename Parameters
        this._mapParameterNamesAndRemoveObjects(oMatchingTarget);
        this._mixAppStateIntoResolutionResultAndRename(oMatchingTarget, sap.ushell.Container.getService("AppState")).done(function (oMatchingTarget) {
            // prepare a proper URL!
            var fnBoundResolutionResultProcessor = that._determineResultProcessor(oMatchingTarget);

            // remove parameters that should not make it to the URL (in any case!)
            delete oMatchingTarget.intentParamsPlusAllDefaults["sap-tag"];
            delete oMatchingTarget.mappedIntentParamsPlusSimpleDefaults["sap-tag"];
            oMatchingTarget.mappedDefaultedParamNames = oMatchingTarget.mappedDefaultedParamNames.filter(function (sParameterName) {
                return sParameterName !== "sap-tag";
            });

            var sBaseUrl = jQuery.sap.getObject(
                'inbound.resolutionResult.url',
                undefined,   // don't modify oMatchResult
                oMatchingTarget
            );

            fnBoundResolutionResultProcessor(oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl)
                .then(function (oResolutionResult) {
                    jQuery.sap.log.debug(
                        "Intent was resolved to the following target",
                        JSON.stringify(oMatchingTarget.resolutionResult, null, 3),
                        "sap.ushell.services.ClientSideTargetResolution"
                    );

                    oUtils.shallowMergeObject(oMatchingTarget.resolutionResult, oResolutionResult);

                    oDeferred.resolve(oMatchingTarget.resolutionResult);
                }, function (sMessage) {
                    if (sMessage.indexOf("fallback:") >= 0) {
                        that._constructFallbackResolutionResult.call(this, oMatchingTarget, fnBoundFallback, sFixedHashFragment)
                            .then(function (oResolutionResult) {

                                oUtils.shallowMergeObject(oMatchingTarget.resolutionResult, oResolutionResult);
                                oDeferred.resolve(oMatchingTarget.resolutionResult);

                            }, oDeferred.reject.bind(oDeferred));
                    } else {
                        oDeferred.reject(sMessage);
                    }
                });
        });

        return oDeferred.promise();
    };

    ClientSideTargetResolution.prototype._resolveTileIntent = function (sHashFragment, fnBoundFallback, oInboundIndex) {
        var oUrlParsing = this._getURLParsing(),
            that = this,
            oDeferred = new jQuery.Deferred(),
            sFixedHashFragment = sHashFragment.indexOf("#") === 0 ? sHashFragment : "#" + sHashFragment,
            oShellHash = oUrlParsing.parseShellHash(sFixedHashFragment);

        if (oShellHash === undefined) {
            jQuery.sap.log.error("Could not parse shell hash '" + sHashFragment + "'",
                "please specify a valid shell hash",
                "sap.ushell.services.ClientSideTargetResolution");
            return oDeferred.reject("Cannot parse shell hash").promise();
        }

        oShellHash.formFactor = oUtils.getFormFactor();

        this._getMatchingInbounds(oShellHash, oInboundIndex, { bExcludeTileInbounds: false })
            .fail(function (sError) {
                jQuery.sap.log.error("Could not resolve " + sHashFragment,
                    "_getMatchingInbounds promise rejected with: " + sError,
                    "sap.ushell.services.ClientSideTargetResolution");
                oDeferred.reject(sError);
            })
            .done(function (aMatchingTargets) {
                var oMatchingTarget;

                if (aMatchingTargets.length === 0) {
                    jQuery.sap.log.warning("Could not resolve " + sHashFragment,
                        "no matching targets were found",
                        "sap.ushell.services.ClientSideTargetResolution");
                    oDeferred.reject("No matching targets found");
                    return;
                }

                oMatchingTarget = aMatchingTargets[0];
                that._resolveSingleMatchingTileIntent(oMatchingTarget, fnBoundFallback, sFixedHashFragment)
                    .done(oDeferred.resolve.bind(oDeferred))
                    .fail(oDeferred.reject.bind(oDeferred));
            });
        return oDeferred.promise();
    };

    ClientSideTargetResolution.prototype._resolveSingleMatchingTileIntent = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment) {
        var oDeferred = new jQuery.Deferred(),
            that = this;

        // rename Parameters
        this._mapParameterNamesAndRemoveObjects(oMatchingTarget);
        this._mixAppStateIntoResolutionResultAndRename(oMatchingTarget, sap.ushell.Container.getService("AppState")).done(function (oMatchingTarget) {
            // prepare a proper URL!
            var fnBoundResolutionResultProcessor = that._determineResultProcessor(oMatchingTarget);

            // remove parameters that should not make it to the URL (in any case!)
            delete oMatchingTarget.intentParamsPlusAllDefaults["sap-tag"];
            delete oMatchingTarget.mappedIntentParamsPlusSimpleDefaults["sap-tag"];
            oMatchingTarget.mappedDefaultedParamNames = oMatchingTarget.mappedDefaultedParamNames.filter(function (sParameterName) {
                return sParameterName !== "sap-tag";
            });

            var sBaseUrl = jQuery.sap.getObject(
                'inbound.resolutionResult.url',
                undefined,   // don't modify oMatchResult
                oMatchingTarget
            );

            fnBoundResolutionResultProcessor(oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl)
                .then(function (oResolutionResult) {

                    oUtils.shallowMergeObject(oMatchingTarget.resolutionResult, oResolutionResult);

                    var oTileResolutionResult = jQuery.extend(true, {}, oMatchingTarget.inbound.tileResolutionResult);  // beware, shallow copy of central object! only modify root properties!

                    oTileResolutionResult.startupParameters = oMatchingTarget.effectiveParameters;
                    oTileResolutionResult.navigationMode = oMatchingTarget.resolutionResult.navigationMode;
                    if (!oTileResolutionResult.navigationMode){
                        oTileResolutionResult.navigationMode = oNavigationMode.getNavigationMode(oMatchingTarget.resolutionResult);
                    }
                    oDeferred.resolve(oTileResolutionResult);
                    jQuery.sap.log.debug(
                        "Tile Intent was resolved to the following target",
                        JSON.stringify(oTileResolutionResult, null, 3),
                        "sap.ushell.services.ClientSideTargetResolution"
                    );
                }, function (sMessage) {
                    oDeferred.reject(sMessage);
                });
        });

        return oDeferred.promise();
    };

    /**
     * Determines the result processor for the matching target.
     *
     * @param {object} oMatchingTarget
     *   The matching target
     *
     * @returns {function}
     *   The result processor for the given matching target, that is, a
     *   function that can be called on the matching target to construct an
     *   appropriate resolution result.
     */
    ClientSideTargetResolution.prototype._determineResultProcessor = function (oMatchingTarget) {
        var oInbound = oMatchingTarget.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult;

        function logProcessor (sProcessorType, sReason) {
            jQuery.sap.log.debug(
                "Resolution result will be constructed via " + sProcessorType + " processor",
                sReason,
                "sap.ushell.services.ClientSideTargetResolution"
            );
        }

        if (!oInbound || !oResolutionResult) {
            logProcessor("FALLBACK", "the inbound or the inbound resolutionResult member was not available");
            return this._constructFallbackResolutionResult.bind(this);
        }

        if (oResolutionResult.applicationType === "SAPUI5") {
            logProcessor("SAPUI5", "inbound resolutionResult had SAPUI5 applicationType");
            return this._constructSAPUI5ResolutionResult.bind(this);
        }

        var isFullWDA = this._isFullLocalWDAResolution(oMatchingTarget);
        if (isFullWDA) {
            logProcessor("WDA full url construction");
            return this._constructFullWDAResolutionResult.bind(this);
        }

        var isWDA = this._isLocalWDAResolution(oMatchingTarget);
        if (isWDA) {
            logProcessor("WDA");
            return this._constructWDAResolutionResult.bind(this);
        }

        var isFullWebgui = this._isFullLocalWebguiResolution(oMatchingTarget);
        if (isFullWebgui) {
            logProcessor("NON-WRAPPED WEBGUI full url construction");
            return this._constructFullWebguiResolutionResult.bind(this);
        }
        var isLocalWebguiNowrap = this._isLocalWebguiNowrapResolution(oMatchingTarget);
        if (isLocalWebguiNowrap) {
            logProcessor("NON-WRAPPED WEBGUI");
            return this._constructWebguiNowrapResult.bind(this);
        }

        var isLocalWebguiWrap = this._isLocalWebguiWrapResolution(oMatchingTarget);
        if (isLocalWebguiWrap) {
            logProcessor("WRAPPED WEBGUI");
            return this._constructWebguiWrapResult.bind(this);
        }

        var isNativeWebguiNowrap = this._isLocalNativeWebguiNowrapResolution(oMatchingTarget);
        if (isNativeWebguiNowrap) {
            logProcessor("NATIVE NON-WRAPPED WEBGUI");
            return this._constructNativeWebguiNowrapResult.bind(this);
        }

        var isNativeWebguiWrap = this._isLocalNativeWebguiWrapResolution(oMatchingTarget);
        if (isNativeWebguiWrap) {
            logProcessor("NATIVE WRAPPED WEBGUI");
            return this._constructNativeWebguiWrapResult.bind(this);
        }

        if (oResolutionResult.applicationType === "URL") {
            logProcessor("URL", "inbound resolutionResult had URL applicationType");
            return this._constructURLResolutionResult.bind(this);
        }

        if (oResolutionResult.applicationType === "WCF") {
            logProcessor("WCF", "inbound resolutionResult had WCF applicationType");
            return this._constructWCFResolutionResult.bind(this);
        }

        logProcessor("FALLBACK", "could not apply any result processor to inbound resolutionResult: " + JSON.stringify(oResolutionResult, null, "   "));
        return this._constructFallbackResolutionResult.bind(this);
    };

    /**
     * De-interpolates a URL interpolated with data (protocol, port...)
     * from a system alias.
     *
     * @param {URI} oURI
     *   A URI object that may or may not have been interpolated with a
     *   certain system alias.
     *
     * @param {string} sSystem
     *   The system alias or sap-system the url in <code>oURI</code> was
     *   interpolated with, or <code>undefined</code> if the URL was not
     *   intepolated.  <p>This is used as a hint to de-interpolate the URL path
     *   prefix.</p>
     *
     * @param {string} sSystemDataSrc
     *   The id of another system. Indicates that the data for the indicated
     *   system should be taken from a system other than the current system.
     *
     * @param {string} sURIType
     *   The type of URI, for example, "WDA".
     *
     * @returns {Promise}
     *   A promise that resolves to a URI object containing a URL
     *   de-interpolated of parts from a system alias.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._stripURI = function (oURI, sSystem, sSystemDataSrc, sURIType) {
        var oDeferred = new jQuery.Deferred(),
            that = this;

        if (typeof sSystem === "undefined") {
            this._stripURIWithSystemAlias(oURI, sSystem, sURIType, undefined)
                .fail(function (sError) {
                    oDeferred.reject(sError);
                })
                .done(function (oNewURI) {
                    oDeferred.resolve(oNewURI);
                });

            return oDeferred.promise();
        }

        this._resolveSystemAlias(sSystem, sSystemDataSrc)
            .fail(function (sErrorMessage) {
                oDeferred.reject(sErrorMessage);
            })
            .done(function (oResolvedSystemAlias) {
                that._stripURIWithSystemAlias(oURI, sSystem, sURIType, oResolvedSystemAlias)
                    .fail(function (sError) {
                        oDeferred.reject(sError);
                    })
                    .done(function (oNewURI) {
                        oDeferred.resolve(oNewURI);
                    });
            });

        return oDeferred.promise();
    };

    /**
     * Resolves a system id using the adapter if necessary. It rejects the
     * promise in case the adapter does not implement the
     * 'resolveSystemAlias' method.
     *
     * @param {string} sSystem
     *   The id of the system to be resolved.
     *
     * @param {string} sSapSystemDataSrc
     *   Whether the system data should be taken from a system other than the
     *   local system where the FLP runs.
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that resolves to a system alias resolved by the
     *   adapter or rejects with an error message if the adapter cannot
     *   resolve the system alias.
     *
     *   <p> NOTE: the "fallback:" prefix in the error message of the
     *   rejected promise is currently used as a convention to trigger
     *   fallback behavior. </p>
     *
     * @private
     */
    ClientSideTargetResolution.prototype._resolveSystemAlias = function (sSystemAlias, sSystemDataSrc) {
        //
        // Check local storage first
        //
        var bSystemDataSrcProvided = typeof sSystemDataSrc === "string";
        var aSystemIds = [sSystemAlias];
        if (bSystemDataSrcProvided) {
            aSystemIds.unshift(sSystemDataSrc);
        }

        var sKey = oUtils.generateLocalStorageKey("sap-system-data", aSystemIds);
        var oLocalStorage = oUtils.getLocalStorage();
        var sSerializedSystemData = oLocalStorage.getItem(sKey);
        var oSystemData = {};

        if (sSerializedSystemData) {
            try {
                oSystemData = JSON.parse(sSerializedSystemData);
            } catch (oError) {
                return new jQuery.Deferred().reject("Cannot parse system data from local storage at key '" + sKey + "'. Data: " + sSerializedSystemData);
            }
            return new jQuery.Deferred().resolve(oSystemData).promise();
        } else if (bSystemDataSrcProvided) {
            // Fail in this case, because the navigation **must** be done in
            // the context of the source system.
            return new jQuery.Deferred().reject("Cannot find data for system '" + sSystemAlias + "' in local storage using key '" + sKey + "'");
        }

        //
        // Check adapter
        //

        // Prepare to call resolveSystemAlias, ensure method is there.
        if (typeof this._oAdapter.resolveSystemAlias !== "function") {
            return new jQuery.Deferred().reject("fallback: the adapter does not implement resolveSystemAlias").promise();
        }

        return this._oAdapter.resolveSystemAlias(sSystemAlias);
    };

    /**
     * Helper for {@link #_stripURI}.
     *
     * @param {URI} oURI
     *   A URI object that may or may not have been interpolated with a
     *   certain system alias.
     * @param {string} sSystemAlias
     *   The system alias the url in <code>oURI</code> was interpolated
     *   with, or <code>undefined</code> if the URL was not intepolated.
     *   <p>This is used as a hint to de-interpolate the URL path
     *   prefix.</p>
     * @param {string} sURIType
     *   The type of URI, for example, "WDA".
     * @param {object} oResolvedSystemAlias
     *   The resolved system alias
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that resolves to a URI object containing a URL
     *   de-interpolated of parts from a system alias.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._stripURIWithSystemAlias = function (oURI, sSystemAlias, sURIType, oResolvedSystemAlias) {
        var that = this,
            oSystemAliasData,
            sSystemAliasDataName,
            sTmpPath,
            sSystemAliasPathPrefix,
            oDeferred = new jQuery.Deferred(),
            oPathPrefixDeferred = new jQuery.Deferred();

        // Strip web-related parts..
        oURI.protocol("");
        oURI.hostname("");
        oURI.port("");

        that._removeParametersFromURI(oURI, ["sap-client", "sap-language"]);

        /*
         * Only modify paths if we are going to replace a systemAlias (i.e.,
         * take into account undefined system alias -> no replacement).
         */
        if (!jQuery.isPlainObject(oResolvedSystemAlias) || typeof sSystemAlias !== "string") {
            return oDeferred.resolve(oURI).promise();
        }

        // guess what web system alias was used to interpolate URL
        sSystemAliasDataName = that._selectSystemAliasDataName(
            oResolvedSystemAlias, new URI(window.location.toString()).protocol()
        );
        oSystemAliasData = oResolvedSystemAlias[sSystemAliasDataName];

        // decide path prefix
        sSystemAliasPathPrefix = (typeof oSystemAliasData.pathPrefix === "string") && oSystemAliasData.pathPrefix;
        if (sSystemAliasPathPrefix !== "") {
            // current system alias is good enough for de-interpolate
            oPathPrefixDeferred.resolve(sSystemAliasPathPrefix);

        } else {
            // must use local path prefix
            this._resolveSystemAlias("" /* local system alias */ )
                .fail(function (sErrorMessage) {
                    oDeferred.reject(sErrorMessage);
                })
                .done(function (oResolvedLocalSystemAlias) {
                    var oResolvedLocalSystemAliasData = oResolvedLocalSystemAlias[sSystemAliasDataName];
                    oPathPrefixDeferred.resolve(oResolvedLocalSystemAliasData.pathPrefix);
                });
        }

        // deinterpolate path prefix from url string
        oPathPrefixDeferred
            .fail(function (sErrorMessage) {
                oDeferred.reject(sErrorMessage);
            })
            .done(function (sSystemAliasPathPrefix) {

                if (sSystemAliasPathPrefix && sSystemAliasPathPrefix.length > 0) {

                    // use the obtained data to strip path prefix, otherwise assume it was hardcoded
                    sTmpPath = oURI.path();
                    sTmpPath = sTmpPath.replace(sSystemAliasPathPrefix, "");

                    // add leading forward slash if replacement deleted it
                    if (sTmpPath.indexOf("/") !== 0) {
                        sTmpPath = "/" + sTmpPath;
                    }

                    oURI.path(sTmpPath);
                }

                // Deal with transaction related parts
                if (sURIType === "NATIVEWEBGUI" && oResolvedSystemAlias.hasOwnProperty("rfc")) {

                    // remove all rfc related parameters from the path
                    sTmpPath = oURI.path();
                    sTmpPath = sTmpPath.split(";")
                        .filter(function (sParam) {
                            return sParam.indexOf("~sysid=") !== 0 &&
                                sParam.indexOf("~service=") !== 0 &&
                                sParam.indexOf("~loginGroup=") !== 0 &&
                                sParam.indexOf("~messageServer=") !== 0 &&
                                sParam.indexOf("~sncNameR3=") !== 0 &&
                                sParam.indexOf("~sncQoPR3=") !== 0;
                        })
                        .join(";");

                    oURI.path(sTmpPath);
                }

                oDeferred.resolve(oURI);
            });

        return oDeferred.promise();
    };

    /**
     * Removes the specified parameters from the given URI object. Treats
     * the given object which is mutated.
     *
     * @param {URI} oURI
     *    The URI object to remove parameter from.
     * @param {string[]} aParametersToRemove
     *    An array of parameters to remove from oURI query
     *
     * @private
     */
    ClientSideTargetResolution.prototype._removeParametersFromURI = function (oURI, aParametersToRemove) {
        var oBannedParametersLookup = {},
            sTmpQuery;

        aParametersToRemove.forEach(function (sParam) {
            oBannedParametersLookup[sParam] = true;
        });

        sTmpQuery = oURI.query();
        sTmpQuery = sTmpQuery
            .split("&")
            .filter(function (sParam) {
                var sParamName = (sParam.split("=")[0] || "").toLowerCase();
                return !oBannedParametersLookup.hasOwnProperty(sParamName);
            })
            .join("&");
        oURI.query(sTmpQuery);
    };


    /**
     * Resolves the given sSapSystem interpolating the result into the
     * given oURI object.
     *
     * @param {URI} oURI
     *   An URI object representing the current URL type.
     *
     * @param {string} [sSystemAlias]
     *   The sap-system alias that was used to generate the url in
     *   <code>oURI</code>. The value <code>undefined</code> will
     *   implicitly indicate that the url in <code>oURI</code> was not
     *   generated or processed based on a sap-system alias.
     *
     * @param {string} sSapSystem
     *   The sap-system alias to be resolved, may be undefined.  The object
     *   is mutated, e.g. server, port, and search (sap-client within
     *   search) are modified to represent the actual system.
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that is resolved with a modified URI object, or rejected
     *   with two parameters in case it was not possible to resolve the
     *   given sap-system.
     *
     *   <p> NOTE: the "fallback:" prefix in the error message of the
     *   rejected promise is currently used as a convention to trigger
     *   fallback behavior. </p>
     *
     * @private
     */
    ClientSideTargetResolution.prototype._spliceSapSystemIntoUrlURI = function (oURI, sSystemAlias, sSapSystem, sSapSystemDataSrc) {
        var that = this,
            oDeferred = new jQuery.Deferred();

        /*
         * Deal with empty system alias cases
         *
         * having an empty or undefined system alias indicates that the URL
         * was not pre-interpolated.
         */
        if (sSystemAlias === S_LOCAL_SYSTEM_ALIAS || typeof sSystemAlias === "undefined") {
            // absolute urls are kept as is and resolved directly
            if (this._isAbsoluteURI(oURI)) {
                return oDeferred.resolve(oURI);
            }

            // no need to check for containment of all parts, can apply sap
            // system directly as the url is relative.
            that._applyAliasToURI(sSapSystem, sSapSystemDataSrc, oURI, "URL")
                .fail(function (sError) {
                    oDeferred.reject(sError);
                })
                .done(function (oURIWithSystemAlias) {
                    oDeferred.resolve(oURIWithSystemAlias);
                });

            return oDeferred.promise();
        }

        /*
         * At this point we need to detect the case in which an absolute
         * URL was given because the system alias was applied to it.  To
         * detect this, we try to strip each piece of the system alias from
         * the URL and if we are not successful we can assume the URL was
         * hardcoded.
         */
        this._resolveSystemAlias(sSystemAlias) // must check if the URL was given absolute because of the systemAlias
            .fail(function (sError) {
                oDeferred.reject(sError);
            })
            .done(function (oResolvedSystemAlias) {
                var sSystemAliasDataName = that._selectSystemAliasDataName(
                        oResolvedSystemAlias, new URI(window.location.toString()).protocol()
                    ),
                    oSystemAliasData = oResolvedSystemAlias[sSystemAliasDataName],
                    sDeinterpolatedPath;

                // Check if URL contains *all* the parts from the systemAlias
                if ((oURI.protocol() || "").toLowerCase() === sSystemAliasDataName &&
                    (oURI.hostname() || "") === oSystemAliasData.host &&
                    (oURI.path().indexOf(oSystemAliasData.pathPrefix) === 0)) {

                    // URL was interpolated - must de-interpolate it!
                    oURI.protocol("");
                    oURI.hostname("");
                    sDeinterpolatedPath = oURI.path().replace(oSystemAliasData.pathPrefix, "");
                    oURI.path(sDeinterpolatedPath);
                    that._removeParametersFromURI(oURI, ["sap-language", "sap-client"]);

                    // URL was de-interpolated, apply sap system!
                    that._applyAliasToURI(sSapSystem, sSapSystemDataSrc, oURI, "URL")
                        .fail(function (sError) {
                            oDeferred.reject(sError);
                        })
                        .done(function (oURIWithSystemAlias) {
                            oDeferred.resolve(oURIWithSystemAlias);
                        });
                } else {
                    oDeferred.resolve(oURI);
                }

            });


        return oDeferred.promise();
    };

    /**
     * Resolves the given sSapSystem interpolating the result into the
     * given oURI object.
     *
     * @param {URI} oURI
     *   An URI object representing the current URI.
     *
     * @param {string} [sSystemAlias]
     *   The sap-system alias that was used to generate the url in
     *   <code>oURI</code>. The value <code>undefined</code> will
     *   implicitly indicate that the url in <code>oURI</code> was not
     *   generated or processed based on a sap-system alias.
     *
     * @param {string} sSapSystem
     *   The sap-system alias to be resolved, may be undefined.  The object
     *   is mutated, e.g. server, port, and search (sap-client within
     *   search) are modified to represent the actual system.
     *
     * @param {string} sURIType
     *   The type of URI passed as first parameter, for example, "WDA".
     *
     * @param {string} sSystemAliasSemantics
     *  How to interpret the system alias in relation to a configured URL. This
     *  can be one of the following two strings:
     *  <ul>
     *  <li>applied: the system alias was already applied to the URL</li>
     *  <li>apply: the system alias is to be applied to the URL</li>
     *  </ul>
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that is resolved with a modified URI object, or rejected
     *   with two parameters in case it was not possible to resolve the
     *   given sap-system.
     *
     *   <p> NOTE: the "fallback:" prefix in the error message of the
     *   rejected promise is currently used as a convention to trigger
     *   fallback behavior.  </p>
     *
     * @private
     */
    ClientSideTargetResolution.prototype._spliceSapSystemIntoURI = function (oURI, sSystemAlias, sSapSystem, sSapSystemDataSrc, sURIType, sSystemAliasSemantics) {
        var oDeferred = new jQuery.Deferred(),
            that = this;

        if (sSystemAliasSemantics !== O_SYSTEM_ALIAS_SEMANTICS.apply && sSystemAliasSemantics !== O_SYSTEM_ALIAS_SEMANTICS.applied) {
            throw new Error("Invalid system alias semantic was provided: '" + sSystemAliasSemantics + "'");
        }

        // Cases in which there is no need to manipulate the source url.
        if (sSystemAliasSemantics === O_SYSTEM_ALIAS_SEMANTICS.applied && ( // assuming system alias was already applied...
            (// ... no sap system to apply
            typeof sSapSystem === "undefined"
            || sSystemAlias === sSapSystem)     // ... sap system is the same as the (already applied) system alias
        )) {
            return oDeferred.resolve(oURI).promise();
        }

        if (sSystemAliasSemantics === O_SYSTEM_ALIAS_SEMANTICS.apply  // if the logic is to apply something...
            && typeof sSystemAlias === "undefined"
            && typeof sSapSystem === "undefined") {   // ... but there is nothing that can be applied

            return oDeferred.resolve(oURI).promise();
        }

        // Treat URL types where a system alias was already applied separately...
        if (sURIType === "URL" && sSystemAliasSemantics == O_SYSTEM_ALIAS_SEMANTICS.applied) {
            return this._spliceSapSystemIntoUrlURI(oURI, sSystemAlias, sSapSystem, sSapSystemDataSrc);
        }

        (new Promise(function (fnResolve) {
            if (sSystemAliasSemantics === O_SYSTEM_ALIAS_SEMANTICS.apply) {
                fnResolve({
                    targetUri: oURI,
                    alias: sSapSystem
                        ? sSapSystem
                        : sSystemAlias,
                    sapSystemSrc: sSapSystem
                        ? sSapSystemDataSrc
                        : undefined
                });  // don't strip URI, just apply.
                return;
            }

            // 'applied' semantics

            that._stripURI(oURI, sSystemAlias, undefined /* sSystemDataSrc */, sURIType)
                .fail(function (sErrorMessage) {
                    oDeferred.reject(sErrorMessage);
                })
                .done(function (oStrippedURI) {
                    fnResolve({
                        targetUri: oStrippedURI,
                        alias: sSapSystem
                    });
                });

        })).then(function (oApply) {

            that._applyAliasToURI(oApply.alias, oApply.sapSystemSrc, oApply.targetUri, sURIType)
                .fail(function (sError) {
                    oDeferred.reject(sError);
                })
                .done(function (oInterpolatedURI) {
                    oDeferred.resolve(oInterpolatedURI);
                });
        });

        return oDeferred.promise();
    };

    /**
     * Applies the given system alias to the given URI object.
     *
     * @param {string} sSystemAlias
     *   The name of the system alias to interpolate the given URI with.
     * @param {URI} oURI
     *   The URI object to interpolate with the system alias.
     * @param {string} sURIType
     *   The type of URI (e.g., "TR")
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that resolves to a URI object with data from the given
     *   sSystemAlias.
     *
     * @private
     * @since 1.34.1
     */
    ClientSideTargetResolution.prototype._applyAliasToURI = function (sSystemAlias, sSystemDataSrc, oURI, sURIType) {
        var that = this,
            oNewURI = oURI,
            oDeferred = new jQuery.Deferred();

        // Interpolate oURI
        this._resolveSystemAlias(sSystemAlias, sSystemDataSrc)
            .fail(function (sErrorMessage) {
                oDeferred.reject(sErrorMessage);
            })
            .done(function (oResolvedSystemAlias) {
                var oValidation = that._validateResolvedSystemAlias(oResolvedSystemAlias);
                if (!oValidation.isValid) {
                    that._reportResolvedSystemAliasValidationErrors(oValidation);
                    oDeferred.reject("Invalid system alias definition");
                    return oDeferred;
                }

                var sSystemAliasDataName = that._selectSystemAliasDataName(
                        oResolvedSystemAlias, new URI(window.location.toString()).protocol()
                    ),
                    oSystemAliasData = oResolvedSystemAlias[sSystemAliasDataName],
                    sQuery,
                    sLanguage,
                    oUser;

                // replace using data in oSystemAliasData

                // Add web-related parts
                if (sSystemAlias === S_LOCAL_SYSTEM_ALIAS
                    && oSystemAliasData.host === ""
                    && (oSystemAliasData.port === 0 || oSystemAliasData.port === "")) {

                    // Cancel the protocol to avoid having
                    // "https:///sap/bc/...". We want a relative URL in this
                    // case.
                    sSystemAliasDataName = "";
                }

                oNewURI.protocol(sSystemAliasDataName); // http or https
                oNewURI.hostname(oSystemAliasData.host);
                oNewURI.port(oSystemAliasData.port);

                that._interpolatePathPrefixIntoURI(oNewURI, sURIType, oSystemAliasData.pathPrefix)
                    .fail(function (sErrorMessage) {
                        oDeferred.reject(sErrorMessage);
                    })
                    .done(function (oNewURI) {
                        // add sap-client and sap-language in case we have data for them
                        sQuery = oNewURI.query();
                        if (typeof oResolvedSystemAlias.client === "string" && oResolvedSystemAlias.client !== "") {
                            sQuery = sQuery + (sQuery.length > 0 ? "&" : "") + "sap-client=" + oResolvedSystemAlias.client;
                        }

                        // set sap-language
                        if (typeof oResolvedSystemAlias.language === "string" && oResolvedSystemAlias.language !== "") {
                            sLanguage = oResolvedSystemAlias.language;
                        } else {
                            oUser = sap.ushell.Container.getUser();
                            if (!oUser) {
                                jQuery.sap.log.error(
                                    "Cannot retieve the User object via sap.ushell.Container while determining sap-language",
                                    "will default to 'en' language",
                                    "sap.ushell.services.ClientSideTargetResolution"
                                );
                                sLanguage = "en";
                            } else {
                                sLanguage = oUser.getLanguage();
                            }
                        }
                        sQuery = sQuery + (sQuery.length > 0 ? "&" : "") + "sap-language=" + sLanguage;
                        oNewURI.query(sQuery);

                        // native webgui interpolation
                        if (oResolvedSystemAlias.hasOwnProperty("rfc") && sURIType === "NATIVEWEBGUI") {
                            var sWebguiParameters = that._constructNativeWebguiParameters(oResolvedSystemAlias.rfc, oSystemAliasData.host, oNewURI);
                            var sPathWithParameters = oNewURI.path() + ";" + sWebguiParameters;

                            // 1. invalidate internal oURI _string cache
                            oNewURI.path(sPathWithParameters); // NOTE: after this, oURI._parts.path is
                                                               // partly unescaped (but we want to keep escaping!)

                            // Overwrite internal _parts.path member of URI object.
                            //
                            // With 1. the _string cache is invalidated, and this new _parts.path should be used to
                            // reconstruct it when the toString() method is next called.
                            //
                            oURI._parts.path = sPathWithParameters;
                        }

                        oDeferred.resolve(oNewURI);
                    });
            });

        return oDeferred.promise();
    };


    /**
     * Generates the list of "tilde-parameters" necessary to start a native
     * Webgui transaction, based on the given RFC information and the current
     * host name.
     *
     * @param {object} oSystemAliasDataRfc
     *   The "rfc" section of the resolved system alias data.
     *
     * @param {string} sSystemAliasHttpHost
     *   The host name that will be part of the http or https URL.
     *
     * @returns {string}
     *   The parameters to be appended to a Native webgui URL.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructNativeWebguiParameters = function (oSystemAliasDataRfc, sSystemAliasHttpHost) {
        var bRfcHostIsConnectString,
            bRfcHostSameAsHttpHost,
            bIsLoadBalancing,
            aTransactionParamSet,
            sRfcHostName;

        /*
         * Add a certain subset of parameters depending on
         * whether load balancing is active in rfc. For now use:
         *
         * system id provided -> load balancing active
         */
        bIsLoadBalancing = !!oSystemAliasDataRfc.systemId;


        if (bIsLoadBalancing) {
            aTransactionParamSet = [
                oSystemAliasDataRfc.systemId && ("~sysid=" + oSystemAliasDataRfc.systemId),
                oSystemAliasDataRfc.loginGroup && ("~loginGroup=" + oSystemAliasDataRfc.loginGroup),
                oSystemAliasDataRfc.sncNameR3 && ("~messageServer=" + encodeURIComponent(oSystemAliasDataRfc.sncNameR3)),
                oSystemAliasDataRfc.sncNameR3 && ("~sncNameR3=" + encodeURIComponent(oSystemAliasDataRfc.sncNameR3)),
                oSystemAliasDataRfc.sncQoPR3 && ("~sncQoPR3=" + oSystemAliasDataRfc.sncQoPR3)
            ].filter(function (o) {
                return (typeof o === "string") && (o !== "");
            }); // remove empty parameters
        } else {
            sRfcHostName = (oSystemAliasDataRfc.host || "");
            bRfcHostSameAsHttpHost = sRfcHostName.toLowerCase() === sSystemAliasHttpHost.toLowerCase();

            // Connect string: /H/<host>/S/<service>/M/<message server>/S/<service>..."
            // See wikipage: /wiki/x/NnT-ag
            bRfcHostIsConnectString = /^[/][HGMR][/].*/.test(sRfcHostName);

            if (sRfcHostName.length > 0 && !bRfcHostSameAsHttpHost && !bRfcHostIsConnectString) {
                jQuery.sap.log.error(
                    "Invalid connect string provided in 'host' field of system alias",
                    "Data for rfc destination provided are: " + JSON.stringify(oSystemAliasDataRfc, null, 3),
                    "sap.ushell.services.ClientSideTargetResolution"
                );
            }

            aTransactionParamSet = [
                sRfcHostName && !bRfcHostIsConnectString && !bRfcHostSameAsHttpHost && ("~rfcHostName=" + sRfcHostName),
                bRfcHostIsConnectString && ("~connectString=" + encodeURIComponent(sRfcHostName)),
                oSystemAliasDataRfc.service && ("~service=" + oSystemAliasDataRfc.service),
                oSystemAliasDataRfc.sncNameR3 && ("~sncNameR3=" + encodeURIComponent(oSystemAliasDataRfc.sncNameR3)),
                oSystemAliasDataRfc.sncQoPR3 && ("~sncQoPR3=" + oSystemAliasDataRfc.sncQoPR3)
            ].filter(function (o) {
                return (typeof o === "string") && (o !== "");
            }); // remove empty parameters
        }

        return aTransactionParamSet.join(";")
            .replace(/(%[A-F0-9]{2})/g, function (sEncodedChars) { // lower case all HEX-encoded strings to avoid double
                return sEncodedChars.toLowerCase(); // encoding format (lower case is currently used anywhere
            }); // else when dealing with URLs.
    };

    /**
     * Helper method to interpolate the given path prefix into the given
     * URI object, taking into account that the empty path prefix should be
     * resolved to the local path prefix.
     *
     * @param {URI} oURI
     *   The URI object to interpolate tha path prefix into.
     * @param {string} sURIType
     *   The type of the URI being interpolated. e.g., "WEBGUI"
     * @param {string} sPathPrefixToInterpolate
     *   The path prefix to interpolate. The empty string indicates that
     *   the path prefix should be taken from the local system alias.
     *   <p>
     *      <b>IMPORTANT</b> this parameter cannot be <code>undefined</code>
     *   </p>
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that resolves to a URI object amended with the given path prefix.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._interpolatePathPrefixIntoURI = function (oURI, sURIType, sPathPrefixToInterpolate) {
        var that = this,
            oDeferred = new jQuery.Deferred(),
            sTmpPath;

        // Do not treat empty path prefix as local path prefix
        if (sURIType === "URL" && sPathPrefixToInterpolate.length === 0) {
            return oDeferred.resolve(oURI).promise();
        }

        function prependPathAndResolve (sPath) {
            var sResultPath = sPath + oURI.path();
            oURI.path(sResultPath.replace(/\/+/g, "/")); // avoid double slashes
            oDeferred.resolve(oURI);
        }

        if (sPathPrefixToInterpolate.length > 0) {
            /*
             * In these cases WDA and WEBGUI urls have their complete
             * prefix stripped! So the pathPrefix is prepended before
             * ~canvas.
             */
            if ((sURIType === "WDA" || sURIType === "WEBGUI") && oURI.path().indexOf("~canvas") >= 0) {
                // Strip the complete path if we are dealing with WDA and TR urls.
                sTmpPath = oURI.path();
                sTmpPath = "/~canvas" + sTmpPath.split("~canvas")[1]; // "<anything>~canvas;<anything>" -> "/~canvas;<anything>"
                oURI.path(sTmpPath);
            }
            prependPathAndResolve(sPathPrefixToInterpolate);
        } else {
            // must take the path from local system alias
            this._resolveSystemAlias("", undefined /* sSystemDataSrc */)
                .fail(function (sErrorMessage) {
                    oDeferred.reject(sErrorMessage);
                })
                .done(function (oResolvedSystemAlias) {
                    var sSystemAliasDataName = that._selectSystemAliasDataName(
                            oResolvedSystemAlias, new URI(window.location.toString()).protocol()
                        ),
                        sPathPrefix = oResolvedSystemAlias[sSystemAliasDataName].pathPrefix;

                    prependPathAndResolve(sPathPrefix);
                });
        }

        return oDeferred.promise();
    };

    /**
     * Select the name of the right system alias among those available in
     * the given collection.
     *
     * @param {object} oSystemAliasData
     *   All available system alias data. An object with either one or both
     *   http/https, like:
     *   <pre>
     *   {
     *      "http": { ... },
     *      "https": { ... }
     *   }
     *   </pre>
     * @param {string} sBrowserLocationProtocol
     *   The protocol displayed in the current url. Can be obtained via
     *   <code>window.location.url</code>.
     *
     * @return {string}
     *   The name of the right system alias name in
     *   <code>oSystemAliasData</code>, or logs an error message
     *   and returns undefined if it was not possible to determine the
     *   name of the right system alias name.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._selectSystemAliasDataName = function (oSystemAliasData, sBrowserLocationProtocol) {
        // 1. prefer https
        if (oSystemAliasData.hasOwnProperty("https")) {
            return "https";
        }

        // 2. fallback to http
        if (oSystemAliasData.hasOwnProperty("http")) {
            return "http";
        }

        jQuery.sap.log.error(
            "Cannot select which system alias to pick between http/https",
            "make sure they are provided in the given system alias collection",
            "sap.ushell.services.ClientSideTargetResolution"
        );

        return undefined;
    };

    /**
     * Retrieves the renamed parameter of a given parameter from the
     * signature object.
     *
     * @param {string} sParamName
     *   The parameter name
     * @param {object} oSignature
     *   The signature object that may contain a mapping for
     *   <code>sParamName</code>
     * @param {array} aParamValue
     *   The value of <code>sParamName</code> into an array (as one
     *   parameter may have multiple values).
     *
     * @returns {string}
     *   The renamed parameter for <code>sParamName</code> if present in
     *   the given signature object, or <code>sParamName</code> otherwise.
     *
     *   <p>NOTE: the aParamValue must be present and passed in the form of
     *   an array, otherwise <code>sParamName</code> will be returned even
     *   if a renamed parameter exists in the signature.</p>
     *
     * @private
     */
    ClientSideTargetResolution.prototype._getRenameParameterName = function (sParamName, oSignature, aParamValue) {
        if (!aParamValue || !jQuery.isArray(aParamValue)) {
            return sParamName;
        }
        if (oSignature && oSignature.parameters && oSignature.parameters[sParamName] && oSignature.parameters[sParamName].renameTo) {

            return oSignature.parameters[sParamName].renameTo;
        }

        return sParamName;
    };

    /**
     * Creates a member <code>mappedIntentParamsPlusSimpleDefaults</code>
     * in the given <code>oMatchingTarget</code>, which contains the
     * re-mapped parameters based on the mappings provided in the
     * signature.
     *
     * <p>The member is added to <code>oMatchingTarget</code> as it is not clear whether
     * we also want to modify the original sap-ushell-defaultedParameter names collection.</p>
     *
     * <p>NOTE: only simple parameters are re-mapped, complex parameters
     * are not part of the
     * <code>mappedIntentParamsPlusSimpleDefaults</code>.</p>
     *
     * @param {object} oMatchingTarget
     *   The mutated matching target object
     *
     * @private
     */
    ClientSideTargetResolution.prototype._mapParameterNamesAndRemoveObjects = function (oMatchingTarget) {
        var that = this,
            oNewParameters = {},
            oOldParamsPlusAllDefaults = oMatchingTarget.intentParamsPlusAllDefaults;

        Object.keys(oOldParamsPlusAllDefaults).sort().forEach(function (sParamName) {
            var sRenameTo = that._getRenameParameterName(sParamName, oMatchingTarget.inbound.signature, oOldParamsPlusAllDefaults[sParamName]);

            if (jQuery.isArray(oMatchingTarget.intentParamsPlusAllDefaults[sParamName])) {
                if (oNewParameters[sRenameTo]) {
                    jQuery.sap.log.error("collision of values during parameter mapping : \"" + sParamName + "\" -> \"" + sRenameTo + "\"");
                } else {
                    oNewParameters[sRenameTo] = oMatchingTarget.intentParamsPlusAllDefaults[sParamName];
                }
            }
        });
        oMatchingTarget.mappedIntentParamsPlusSimpleDefaults = oNewParameters;
    };

    /*
     * The following table compares the capabilities and behaviour of
     * the differnt technologies
     *                                            SAPUI5  URL  WDA WebGui WebGuiWrapped WCF
     *
     * server/port/client etc. altered               N     Y    Y     Y    Y             Y
     * sap-system part of URL                        Y     Y    N     N    N             N
     * sap-ushell-defaultedParametersNames part      Y     Y    Y     N    N             Y
     * part of URL
     *
     * parameters                                    Y     N    Y     N    N             Y
     * compacted
     */


    /**
     * Constructs the resolution result (including full URL) of the given WDA
     * matching target using applicationId and confId from the inbound
     * resolution result.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     *
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     *
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructFullWDAResolutionResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment) {
        var that = this,
            oInboundResolutionResult = jQuery.sap.getObject("inbound.resolutionResult", undefined, oMatchingTarget),
            oMappedIntentParamsPlusSimpleDefaults = oMatchingTarget.mappedIntentParamsPlusSimpleDefaults || {};

        var sSapSystem = oInboundResolutionResult.systemAlias;
        if (oMappedIntentParamsPlusSimpleDefaults["sap-system"]) {
            sSapSystem = oMappedIntentParamsPlusSimpleDefaults["sap-system"][0];
        }

        var sSapSystemDataSrc;
        if (oMappedIntentParamsPlusSimpleDefaults["sap-system-src"]) {
            sSapSystemDataSrc = oMappedIntentParamsPlusSimpleDefaults["sap-system-src"][0];
        }

        var oOtherParams = {
            "sap-system": [ sSapSystem ]
        };
        if (typeof sSapSystemDataSrc === "string") {
            oOtherParams["sap-system-src"] = [ sSapSystemDataSrc ];
        }

        return new Promise(function (fnResolve, fnReject) {
            that._buildWdaURI(
                oInboundResolutionResult["sap.wda"].applicationId,
                oInboundResolutionResult["sap.wda"].configId,
                oOtherParams
            ).done(function (oWdaURIWithSystemAlias) {

                var oMappedIntentParamsPlusSimpleDefaults = oMatchingTarget.mappedIntentParamsPlusSimpleDefaults;

                that._constructWDAURLParameters(oMappedIntentParamsPlusSimpleDefaults, oMatchingTarget.mappedDefaultedParamNames)
                    .then(function (sUrlParameters) {
                        var sFinalWDAURL = that._appendParametersToURI(oWdaURIWithSystemAlias, sUrlParameters);
                        var sSapSystem = oMappedIntentParamsPlusSimpleDefaults["sap-system"] && oMappedIntentParamsPlusSimpleDefaults["sap-system"][0];
                        var sSapSystemDataSrc = oMappedIntentParamsPlusSimpleDefaults["sap-system-src"] && oMappedIntentParamsPlusSimpleDefaults["sap-system-src"][0];

                        var oResolutionResult = that._createWDAResolutionResult(oMatchingTarget.inbound, sFinalWDAURL, sSapSystem, sSapSystemDataSrc);

                        fnResolve(oResolutionResult);
                    }, function (sError1) {
                        fnReject(sError1);
                    });

            }).fail(function (sError2) {
                fnReject(sError2);
            });
        });
    };

    /**
     * Constructs the resolution result (including full URL) of the given
     * WebGui matching target using the transaction specified in the "sap.gui"
     * field of the inbound resolution result.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     *
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     *
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructFullWebguiResolutionResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment) {
        var that = this,
            oInbound = oMatchingTarget.inbound,
            oInboundResolutionResult = oInbound && oInbound.resolutionResult,
            oMappedIntentParamsPlusSimpleDefaults = oMatchingTarget.mappedIntentParamsPlusSimpleDefaults || {};

        var sSapSystem = oInboundResolutionResult.systemAlias;
        if (oMappedIntentParamsPlusSimpleDefaults["sap-system"]) {
            sSapSystem = oMappedIntentParamsPlusSimpleDefaults["sap-system"][0];
        }

        var sSapSystemDataSrc;
        if (oMappedIntentParamsPlusSimpleDefaults["sap-system-src"]) {
            sSapSystemDataSrc = oMappedIntentParamsPlusSimpleDefaults["sap-system-src"][0];
        }

        return new Promise(function (fnResolve, fnReject) {
            that._buildNativeWebGuiURI(oInbound.resolutionResult["sap.gui"].transaction, sSapSystem, sSapSystemDataSrc).done(function (oURIWithSystemAlias) {
                that._mapParameterNamesAndRemoveObjects(oMatchingTarget);
                var oResolutionResult = that._blendParamsIntoNativeWebGUI(oMatchingTarget.inbound, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults, oURIWithSystemAlias);
                if (oResolutionResult && oMatchingTarget.inbound && oMatchingTarget.inbound.resolutionResult && oMatchingTarget.inbound.resolutionResult["sap.platform.runtime"]) {
                    oResolutionResult["sap.platform.runtime"] = oMatchingTarget.inbound.resolutionResult["sap.platform.runtime"];
                }

                oResolutionResult["sap-system"] = sSapSystem;

                fnResolve(oResolutionResult);
            }).fail(fnReject);
        });
    };

    /**
     * Constructs the resolution result of the given WDA matching target.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     *
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     *
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     *
     * @param {string} sBaseUrl
     *   A base URL (without parameters) that should be used to construct the
     *   resolution result
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructWDAResolutionResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl) {
        var that = this,
            oInbound = oMatchingTarget.inbound,
            oInboundResolutionResult = oInbound && oInbound.resolutionResult,
            oMappedIntentParamsPlusSimpleDefaults = oMatchingTarget.mappedIntentParamsPlusSimpleDefaults;

        // splice parameters into WDA url
        var oWDAURI = new URI(sBaseUrl);
        var sSapSystem = oMappedIntentParamsPlusSimpleDefaults["sap-system"] && oMappedIntentParamsPlusSimpleDefaults["sap-system"][0];
        var sSapSystemDataSrc = oMappedIntentParamsPlusSimpleDefaults["sap-system-src"] && oMappedIntentParamsPlusSimpleDefaults["sap-system-src"][0];

        return Promise.all([
            (new Promise(function (fnDone, fnReject) {
                that._spliceSapSystemIntoURI(oWDAURI, oInboundResolutionResult.systemAlias, sSapSystem, sSapSystemDataSrc, "WDA", oInboundResolutionResult.systemAliasSemantics || O_SYSTEM_ALIAS_SEMANTICS.applied)
                    .fail(fnReject)
                    .done(fnDone);
            })),

            that._constructWDAURLParameters(oMappedIntentParamsPlusSimpleDefaults, oMatchingTarget.mappedDefaultedParamNames)

        ]).then(function (aResults) {
            var oWDAURIWithSapSystem = aResults[0];
            var sUrlParameters = aResults[1];
            var sFinalWDAURL = that._appendParametersToURI(oWDAURIWithSapSystem, sUrlParameters);

            var oResolutionResult = that._createWDAResolutionResult(oInbound, sFinalWDAURL, sSapSystem, sSapSystemDataSrc);

            return oResolutionResult;
        }, function (sError) {
            return Promise.reject(sError);
        });
    };

    /**
     * Creates and returns the resolution result for WDA only.
     *
     * @param {object} oInbound
     *  The inbound of the matched target.
     * @param {string} sFinalWDAURL
     *  The URL to add to the resolutionResult.
     * @param {string} sSapSystem
     *  The sap-system from the matched target.
     * @param {string} sSapSystemDataSrc
     *  The sap-system-src from the matched target.
     *
     * @return {object}
     *  An object that represents the resolution result, like:
     *  <pre>
     *     {
     *        "sap-system": ...,
     *        url: ...,
     *        text: ...,
     *        applicationType: ...
     *     }
     *  </pre>
     *
     * @private
     */
    ClientSideTargetResolution.prototype._createWDAResolutionResult = function (oInbound, sFinalWDAURL, sSapSystem, sSapSystemDataSrc) {
        var oResolutionResult = {
            "sap-system": sSapSystem,
            url: sFinalWDAURL,
            text: oInbound.title,
            applicationType: "NWBC"
        };

        if (typeof sSapSystemDataSrc === "string") {
            oResolutionResult["sap-system-src"] = sSapSystemDataSrc;
        }

        // propagate properties from the inbound in the resolution result
        ["additionalInformation", "applicationDependencies"].forEach(function (sPropName) {
            if (oInbound.resolutionResult.hasOwnProperty(sPropName)) {
                oResolutionResult[sPropName] = oInbound.resolutionResult[sPropName];
            }
        });

        return oResolutionResult;
    };

    /**
     * Appends a string of parameters to a URI.
     *
     * @param {object} oURI
     *   A URI object (with or without parameters).
     *
     * @param {string} sUrlParameters
     *   The parameters to be appended to the URI. This string is not
     *   manipulated but just appended to the URL.
     *
     * @returns {string}
     *   A string representing the URI with the given parameters appended.
     *   This method does not remove or override duplicate parameters that may
     *   be already in the given URI object.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._appendParametersToURI = function (oURI, sUrlParameters) {
        // ASSUMPTION: there are no relevant parameters in the WDA url, but only WDA parameters.
        var sParams = oURI.search();
        if (sUrlParameters) {
            sParams = sParams + ((sParams.indexOf("?") < 0) ? "?" : "&") + sUrlParameters;
        }

        return oURI.search(sParams).toString();
    };

    /**
     * Creates a string containing the final parameters to append to the the
     * final WDA URL. Parameters are compacted if they are too many.
     *
     * @param {object} oParams
     *   The parameters constructed by matching an intent with an inbound.
     *
     * @param {array} aMappedDefaultedParameterNames
     *   The mapped (renamed according to parameter mapping) parameters that
     *   were defaulted -- not contained in the intent, but in the inbound
     *   signature.
     *
     * @return {Promise}
     *   An ES6 promise that resolves with a string representing the parameters
     *   that must be appended to a final WDA URL, or rejects with an error
     *   message.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructWDAURLParameters = function (oParams, aMappedDefaultedParameterNames) {
        var that = this;

        return new Promise(function (fnResolve, fnReject) {
            var oEffectiveParameters = jQuery.extend(true, {}, oParams);

            // construct effective parameters including defaults
            if (aMappedDefaultedParameterNames.length > 0) {
                // This parameter signals the target application what parameters in
                // the URL were defaulted.
                oEffectiveParameters["sap-ushell-defaultedParameterNames"] = [ // enclose in array for URLParsing
                    JSON.stringify(aMappedDefaultedParameterNames)
                ];
            }

            // in the WDA case, the sap-system intent parameter is *not* part of the final url
            delete oEffectiveParameters["sap-system"];

            // compact our intent url parameters if required
            sap.ushell.Container.getService("ShellNavigation")
                .compactParams(oEffectiveParameters, ["sap-xapp-state", "sap-ushell-defaultedParameterNames", "sap-intent-params"], undefined /* no Component*/ , true /*transient*/ )
                .fail(function (sError) {
                    fnReject(sError);
                })
                .done(function (oEffectiveCompactedIntentParams) {

                    // important to extract after compaction to get a potentially modified client
                    var sEffectiveStartupParams = that._getURLParsing().paramsToString(oEffectiveCompactedIntentParams);

                    fnResolve(sEffectiveStartupParams);
                });
        });
    };

    /**
     * Constructs the resolution result of the given non-wrapped Webgui matching target.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     * @param {string} sBaseUrl
     *   A base URL (without parameters) that should be used to construct the
     *   resolution result
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructWebguiNowrapResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl) {
        var that = this,
            oInbound = oMatchingTarget.inbound,
            oInboundResolutionResult = oInbound && oInbound.resolutionResult;

        var oResolutionResult = {};

        // splice parameters into Webgui url
        var oWebguiURI = new URI(sBaseUrl);

        // construct effective parameters excluding defaults (!)
        var oEffectiveParameters = jQuery.extend(true, {}, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults);

        var sSapSystem = oEffectiveParameters["sap-system"] && oEffectiveParameters["sap-system"][0];
        var sSapSystemDataSrc = oEffectiveParameters["sap-system-src"] && oEffectiveParameters["sap-system-src"][0];

        // in the Webgui case, the sap-system intent parameter is *not* part of the final url
        oResolutionResult["sap-system"] = sSapSystem;
        delete oEffectiveParameters["sap-system"];

        if (typeof sSapSystemDataSrc === "string") {
            oResolutionResult["sap-system-src"] = sSapSystemDataSrc;
            delete oEffectiveParameters["sap-system-src"];
        }

        var aUnneccessaryParameters = that._getUnnecessaryWebguiParameters(oEffectiveParameters, oInbound || {});
        this._removeObjectKey(oEffectiveParameters, aUnneccessaryParameters);

        return new Promise(function (fnResolve, fnReject) {
            that._spliceSapSystemIntoURI(oWebguiURI, oInboundResolutionResult.systemAlias, sSapSystem, sSapSystemDataSrc, "WEBGUI", oResolutionResult.systemAliasSemantics || O_SYSTEM_ALIAS_SEMANTICS.applied)
                .fail(fnReject)
                .done(function (oWebguiURI) {
                    // important to extract here to get a potentially modified client
                    var sEffectiveStartupParams = that._getURLParsing().paramsToString(oEffectiveParameters);

                    // Reconstruct the final url
                    // ASSUMPTION: there are no relevant parameters in the Webgui url, but only Webgui parameters.
                    var sParams = oWebguiURI.search(); // Webgui parameters
                    if (sEffectiveStartupParams) {
                        // append effective parameters to Webgui URL
                        sParams = sParams + ((sParams.indexOf("?") < 0) ? "?" : "&") + sEffectiveStartupParams;
                    }
                    oWebguiURI.search(sParams);

                    // propagate properties from the inbound in the resolution result
                    ["additionalInformation", "applicationDependencies"].forEach(function (sPropName) {
                        if (oInbound.resolutionResult.hasOwnProperty(sPropName)) {
                            oResolutionResult[sPropName] = oInbound.resolutionResult[sPropName];
                        }
                    });
                    oResolutionResult.url = oWebguiURI.toString();
                    oResolutionResult.text = oInbound.title;
                    oResolutionResult.applicationType = "NWBC";

                    fnResolve(oResolutionResult);
                });
        });
    };

    /**
     * Constructs the resolution result of the given wrapped Webgui matching target.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     *
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     *
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     *
     * @param {string} sBaseUrl
     *   A base URL (without parameters) that should be used to construct the
     *   resolution result
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructWebguiWrapResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl) {
        var that = this,
            oInbound = oMatchingTarget.inbound,
            oInboundResolutionResult = oInbound && oInbound.resolutionResult;

        var oResolutionResult = {};

        // splice parameters into Webgui url
        var oWebguiURI = new URI(sBaseUrl);

        // construct effective parameters

        /*
        /* NOTE: do not include defaultedParameterNames for wrapped URLs,
         * as they may cause a crash the called application.
         */
        var oEffectiveParameters = jQuery.extend(true, {}, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults);

        var sSapSystem = oEffectiveParameters["sap-system"] && oEffectiveParameters["sap-system"][0];
        var sSapSystemDataSrc = oEffectiveParameters["sap-system-src"] && oEffectiveParameters["sap-system-src"][0];

        // in the Webgui case, the sap-system intent parameter is *not* part of the final url
        oResolutionResult["sap-system"] = sSapSystem;
        delete oEffectiveParameters["sap-system"];

        if (typeof sSapSystemDataSrc === "string") {
            oResolutionResult["sap-system-src"] = sSapSystemDataSrc;
            delete oEffectiveParameters["sap-system-src"];
        }

        return new Promise(function (fnResolve, fnReject) {
            that._spliceSapSystemIntoURI(oWebguiURI, oInboundResolutionResult.systemAlias, sSapSystem, sSapSystemDataSrc, "WEBGUI", oInboundResolutionResult.systemAliasSemantics || O_SYSTEM_ALIAS_SEMANTICS.applied)
                .fail(fnReject)
                .done(function (oWebguiURI) {
                    // Reconstruct the final url
                    // ASSUMPTION: there are no relevant parameters in the Webgui url, but only Webgui parameters.
                    var sParams = oWebguiURI.search(); // Webgui parameters

                    // Inject effective startup param
                    sParams = that._injectEffectiveParametersIntoWebguiPobjectParam(sParams, oEffectiveParameters, "&", "=");

                    oWebguiURI.search(sParams);

                    // propagate properties from the inbound in the resolution result
                    ["additionalInformation", "applicationDependencies"].forEach(function (sPropName) {
                        if (oInbound.resolutionResult.hasOwnProperty(sPropName)) {
                            oResolutionResult[sPropName] = oInbound.resolutionResult[sPropName];
                        }
                    });

                    oResolutionResult.url = oWebguiURI.toString();
                    oResolutionResult.text = oInbound.title;
                    oResolutionResult.applicationType = "NWBC";

                    fnResolve(oResolutionResult);
                });
        });

    };

    /**
     *
     * Constructs the resolution result of the WCF application.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     *
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     *
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     *
     * @param {string} sBaseUrl
     *   A base URL (without parameters) that should be used to construct the
     *   resolution result
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructWCFResolutionResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl) {
        var that = this,
            oUri = new URI(sBaseUrl),
            oInbound = oMatchingTarget.inbound,
            oInboundResolutionResult = oInbound && oInbound.resolutionResult,
            oEffectiveParameters = jQuery.extend(true, {}, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults),
            sSapSystem,
            sSapSystemDataSrc;

        if (oEffectiveParameters["sap-system"]) {
            sSapSystem = oEffectiveParameters["sap-system"][0];
            delete oEffectiveParameters["sap-system"];
        }

        if (oEffectiveParameters["sap-system-src"]) {
            sSapSystemDataSrc = oEffectiveParameters["sap-system-src"][0];
            delete oEffectiveParameters["sap-system-src"];
        }

        return new Promise(function (fnResolve, fnReject) {
            that._spliceSapSystemIntoURI(oUri, oInboundResolutionResult.systemAlias, sSapSystem, sSapSystemDataSrc, "WCF", oInboundResolutionResult.systemAliasSemantics || O_SYSTEM_ALIAS_SEMANTICS.apply)
                .done(function (oURI) {
                    var sParameters = that._getURLParsing().paramsToString(oEffectiveParameters),
                        sFinalUrl = that._appendParametersToUrl(sParameters, oURI.toString());

                    var oResolutionResult = {
                        url: sFinalUrl,
                        text: "",
                        additionalInformation: "",
                        applicationType: "WCF",
                        fullWidth: true
                    };

                    fnResolve(oResolutionResult);
                })
                .fail(function (sError) {
                    fnReject(sError);
                });
        });
    };

    /**
     * Interpolates the parameters into the given query using transaction
     * interpolation format.
     *
     * The method tries to intepolate the given parameters into the
     * <code>P_OBJECT</code> query parameter if present in the query
     * string.  Otherwise the <code>P_OBJECT</code> parameter is added to
     * the query string.
     *
     * <p>Contrarily to standard URLs, the parameter must be injected into the
     * query parameter double escaped (via encodeURIComponent) and with
     * the nonstandard delimiters passed as input.
     *
     * <p >For example, when using '&' and '=' as delimiters, given the
     * query string <code>A=B&P_OBJECT=</code>
     * and the parameter object
     * <pre>
     * {
     *    B: ["C"],
     *    C: ["D"]
     * }
     * </pre>, the interpolated query string
     * <code>A=B&P_OBJECT=B%2521C%2525C%2521D</code> is returned.
     *
     * <p>
     * IMPORTANT: the <code>P_OBJECT</code> parameter can take maximum 132
     * characters in its value. In case the given parameters form a string
     * that is longer than 132 characters (unescaped), the string will be
     * splitted over multiple <code>P_OBJx</code> parameters that are added
     * to the URL.
     * <br />
     * For example, this method may return the following interpolated query:
     * <code>P_OBJ1=rest_of_p_object_value&P_OBJ2=...&P_OBJECT=...some_long_value...</code>
     * </p>
     *
     * @param {string} sQuery
     *   The query string to interpolate the parameters into
     * @param {object} oParamsToInject
     *   An object indicating the parameters that need to be interpolated.
     * @param {string} sQueryParamDelimiter
     *   The delimiter used to separate parameters and values in <code>sQuery</code>. E.g., "&"
     * @param {string} sQueryParamAssignDelimiter
     *   The delimiter used to separate assignments of a value to a parameter in <code>sQuery</code>. E.g., "="
     *
     * @return {string}
     *   The interpolated query string.
     */
    ClientSideTargetResolution.prototype._injectEffectiveParametersIntoWebguiPobjectParam = function (sQuery, oParamsToInject, sQueryParamDelimiter, sQueryParamAssignDelimiter) {
        var sInjectedParams,
            sPobjectPlusDelimiter = "P_OBJECT" + sQueryParamAssignDelimiter,
            iMaxGUIParamLength = 132;

        // NOTE: the result of privparamsToString does not encode
        //       delimiters, hence we pass them encoded.
        var sParamsToInject = this._getURLParsing().privparamsToString(
            oParamsToInject,
            "%25", // a.k.a. "%", instead of &
            "%21" // a.k.a. "!", instead of =
        );

        if (!sParamsToInject) {
            return sQuery;
        }

        // Parse away existing parameters in P_OBJECT
        var sParamsToInjectPrefix = "";
        this._amendGuiParam("P_OBJECT", sQuery, sQueryParamDelimiter, sQueryParamAssignDelimiter, function (sParamNameAndValueDoubleEncoded) {
            var sParamValueDoubleEncoded = sParamNameAndValueDoubleEncoded.replace(sPobjectPlusDelimiter, "");
            sParamsToInjectPrefix = decodeURIComponent(sParamValueDoubleEncoded);
            if (sParamsToInjectPrefix.length > 0) {
                sParamsToInjectPrefix = sParamsToInjectPrefix + "%25";
            }

            return sPobjectPlusDelimiter; // just leave the P_OBJECT= placeholder if found
        });
        sParamsToInject = sParamsToInjectPrefix + sParamsToInject;

        // Generate the injected parameters
        var oParamsSections = {
            pObjX: "",
            pObject: ""
        };
        sParamsToInject
            .match(new RegExp(".{1," + iMaxGUIParamLength + "}", "g"))
            .map(function (sParamGroupEncoded) {
                return encodeURIComponent(sParamGroupEncoded);
            })
            .forEach(function (sParamGroupDoubleEncoded, iGroupIdx) {
                // parameter name should be P_OBJECT or P_OBJx for further parameters
                var sParamName = "P_OBJECT";
                var sParamSection = "pObject";
                if (iGroupIdx > 0) {
                    sParamName = "P_OBJ" + iGroupIdx;
                    sParamSection = "pObjX";
                }

                var sSectionDelimiter = oParamsSections[sParamSection].length === 0 ? "" : sQueryParamDelimiter;

                oParamsSections[sParamSection] = oParamsSections[sParamSection] + sSectionDelimiter + sParamName + sQueryParamAssignDelimiter + sParamGroupDoubleEncoded;
            });

        sInjectedParams = [oParamsSections.pObjX, oParamsSections.pObject]
            .filter(function (sParamSection) {
                return sParamSection.length > 0;
            })
            .join(sQueryParamDelimiter);

        // Place the injected params in the right place in the query
        var oAmendResult = this._amendGuiParam("P_OBJECT", sQuery, sQueryParamDelimiter, sQueryParamAssignDelimiter, function (sFoundParamNameAndValue) {
            return sInjectedParams;
        });

        if (oAmendResult.found) {
            return oAmendResult.query;
        }

        // amendment not performed: just append the concatenation
        return sQuery + (sQuery.length === 0 ? "" : sQueryParamDelimiter) + sInjectedParams;
    };

    /**
     * Amends a specified GUI param through a given callback function.
     *
     * @param {string} sTargetParamName
     *   The target WebGui parameter to find
     * @param {string} sQuery
     *   The query string to find the parameter in
     * @param {string} sQueryParamDelimiter
     *   The delimiter used to separate parameters and values in <code>sQuery</code>. E.g., "&"
     * @param {string} sQueryParamAssignDelimiter
     *   The delimiter used to separate assignments of a value to a parameter in <code>sQuery</code>. E.g., "="
     * @param {function} fnAmend
     *   A callback used to amend the <code>sTargetParamName</code>
     *   parameter of the query string. It is a function that should return
     *   the value to assign to the target parameter in the query string,
     *   should this target parameter be present.
     *   <p>When this function returns <code>undefined</code>, the target
     *   parameter will be removed from the query string</p>
     *
     * @return {object}
     *   An object representing the result of the amend operation. It is like:
     *   <pre>
     *   {
     *      found: <boolean> // whether the target parameter was found
     *      query: <string>  // the amended query string or the original
     *                       // query string if the target parameter was not found
     *   }
     *   </pre>
     */
    ClientSideTargetResolution.prototype._amendGuiParam = function (sTargetParamName, sQuery, sQueryParamDelimiter, sQueryParamAssignDelimiter, fnAmend) {
        var bFound = false,
            sParamSearchPrefix = sTargetParamName + sQueryParamAssignDelimiter; // Param=

        var sAmendedQuery = sQuery
            .split(sQueryParamDelimiter)
            .map(function (sParam) {

                if (sParam.indexOf(sParamSearchPrefix) !== 0) {
                    return sParam;
                }

                bFound = true;

                return fnAmend(sParam);
            })
            .filter(function (sParam) {
                return typeof sParam !== "undefined";
            })
            .join(sQueryParamDelimiter);

        return {
            found: bFound,
            query: sAmendedQuery
        };
    };

    /**
     * Parses Native Webgui query parameter
     *
     * @param {string} sTransactionQueryParam
     *   The full ~transaction query parameter with or without question
     *   mark. E.g., <code>?%7etransaction=*SU01%20p1%3d%3bP2=v2</code>
     *
     * @returns {object}
     *   An object containing the parsed parts of the URL parameter
     *
     * @private
     */
    ClientSideTargetResolution.prototype._parseWebguiTransactionQueryParam = function (sTransactionQueryParam) {

        var sTransactionValueRe = "^(.+?)(%20|(%20)(.+))?$",
            reTransactionValue = new RegExp(sTransactionValueRe, "i"),
            sTransactionValue,
            oParsed = {
                hasParameters: null, // whether actual parameters are passed to the transaction
                transactionParamName: "", // ?%7etransaction or %7etransaction
                transactionCode: "", // SU01 or *SU01
                parameters: [] // { name: ..., value: ... }
            };

        var aParamNameValues = sTransactionQueryParam.split("=");

        if (aParamNameValues.length > 2) {
            return {
                "error": "Found more than one assignment ('=') in the transaction query parameter",
                "details": "Only one '=' sign is expected in " + sTransactionQueryParam
            };
        }

        if (aParamNameValues.length < 2 || typeof aParamNameValues[1] === "undefined" || aParamNameValues[1].length === 0) {
            return {
                "error": "The transaction query parameter must specify at least the transaction name",
                "details": "Got " + sTransactionQueryParam + " instead."
            };
        }

        oParsed.transactionParamName = aParamNameValues[0];
        sTransactionValue = aParamNameValues[1];

        var aMatch = sTransactionValue.match(reTransactionValue);
        if (!aMatch) {
            return {
                "error": "Cannot parse ~transaction query parameter value.",
                "details": sTransactionValue + " should match /" + sTransactionValueRe + "/"
            };
        }

        oParsed.transactionCode = aMatch[1];
        if (aMatch[2] && aMatch[2] !== "%20") { // if !== "%20" -> matches (%20)(.+)
            // must parse parameters
            var sTransactionParams = aMatch[4] || "";
            sTransactionParams
                .split("%3b") // i.e., "="
                .forEach(function (sNameAndValue) {
                    var aNameAndValue = sNameAndValue.split("%3d"),
                        sParamName = aNameAndValue[0];

                    if (sParamName && typeof sParamName === "string" && sParamName.length > 0) { // no empty names
                        oParsed.parameters.push({
                            name: sParamName,
                            value: aNameAndValue[1]
                        });
                    }
                });
        }

        // post parsing adjustments

        // detect whether the transaction name had a '*' or if the * was
        // added because of parameters.
        // NOTE: **SU01 would be a valid tcode
        oParsed.hasParameters = false;
        if (oParsed.parameters.length > 0) {
            oParsed.hasParameters = true;

            // must remove the starting "*" from the transaction code if
            // any is found (was added because of parameters).
            oParsed.transactionCode = oParsed.transactionCode.replace(/^[*]/, "");
        }

        return oParsed;
    };


    /**
     * Interpolates the given parameters into the webgui ~transaction parameter.
     *
     * The method tries to intepolate the given parameters after the
     * transaction code present in the given ~transaction parameter.
     *
     * <p>For example, given the query string
     * <code>?%7etransaction=SU01</code>
     *
     * and the parameter object
     * <pre>
     * {
     *    B: ["C"],
     *    C: ["D"]
     * }
     * </pre>, the following string is returned:
     * <code>?%7etransaction=*SU01%20B%3dC%3bC%3dD</code
     *
     * @param {string} sTransactionQueryParam
     *   The whole ~transaction parameter. Must start with "?%7etransaction" or "%7etransaction".
     *   For example <ul
     *   <li><code>%7etransaction=*SU01%20AAAA%3d4321</code> (with AAAA=4321 parameter)</li>
     *   <li><code>?%7etransaction=SU01</code> (no parameters)</li>
     *   </ul>
     * @param {object} oParamsToInject
     *   An object ating the parameters that need to be interpolated
     *   into <code>sTransactionQueryParam</code>.
     *
     * @return {string}
     *   The interpolated ~transaction parameter (the leading ? is
     *   preserved if passed).  The transaction code will have the form
     *   <code>*[CODE]%20[PARAMETERS]]</code> only when the transaction
     *   will be called with parameters, otherwise the format would be
     *   <code>[CODE]</code>.
     */
    ClientSideTargetResolution.prototype._injectEffectiveParametersIntoWebguiQueryParam = function (sTransactionQueryParam, oParamsToInject) {
        var oParsedTransactionQueryParam = this._parseWebguiTransactionQueryParam(sTransactionQueryParam);
        if (oParsedTransactionQueryParam.error) {
            jQuery.sap.log.error(
                oParsedTransactionQueryParam.error,
                oParsedTransactionQueryParam.details,
                "sap.ushell.services.ClientSideTargetResolution"
            );
            return sTransactionQueryParam;
        }

        // Inject parameters
        var aParametersFinal = oParsedTransactionQueryParam.parameters.map(function (oParameter) {
            return oParameter.name.toUpperCase() + "%3d" + oParameter.value;
        });

        // Turn all names upper case
        var oParamsToInjectUpperCase = {};
        Object.keys(oParamsToInject).forEach(function (sKey) {
            oParamsToInjectUpperCase[sKey.toUpperCase()] = oParamsToInject[sKey];
        });
        // NOTE: privparamsToString treats delimiters verbatim and encodes
        //       the parameters if necessary.
        //       Therefore we pass the delimiters already encoded!
        //
        var sParamsToInject = this._getURLParsing().privparamsToString(
            oParamsToInjectUpperCase,
            "%3b", // parameters delimiter
            "%3d" // assigment
        );
        if (sParamsToInject) {
            aParametersFinal.push(sParamsToInject);
        }

        // Note: do not rely on oParsedTransactionQueryParam as we may
        // still have injected parameters here.
        var bHasParameters = aParametersFinal.length > 0;

        return oParsedTransactionQueryParam.transactionParamName + "=" + (bHasParameters ? "*" : "") + oParsedTransactionQueryParam.transactionCode + (bHasParameters ? "%20" : "") + aParametersFinal.join("%3b");
    };

    /**
     * Constructs the resolution result of the given native wrapped Webgui
     * matching target.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     * @param {string} sBaseUrl
     *   A base URL (without parameters) that should be used to construct the
     *   resolution result
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructNativeWebguiWrapResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl) {
        var that = this,
            oInbound = oMatchingTarget.inbound,
            oInboundResolutionResult = oInbound && oInbound.resolutionResult,
            oResolutionResult = {};

        // splice parameters into Webgui url
        var oWebguiURI = new URI(sBaseUrl);

        // construct effective parameters
        /*
        /* NOTE: do not include defaultedParameterNames for wrapped URLs,
         * as they may cause a crash the called application.
         */
        var oEffectiveParameters = jQuery.extend(true, {}, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults);

        var sSapSystem = oEffectiveParameters["sap-system"] && oEffectiveParameters["sap-system"][0];
        var sSapSystemDataSrc = oEffectiveParameters["sap-system-src"] && oEffectiveParameters["sap-system-src"][0];

        // in the Webgui case, the sap-system intent parameter is *not* part of the final url
        oResolutionResult["sap-system"] = sSapSystem;
        delete oEffectiveParameters["sap-system"];

        // in the Webgui case, the sap-system-src intent parameter is *not* part of the final url
        if (typeof sSapSystemDataSrc === "string") {
            oResolutionResult["sap-system-src"] = sSapSystemDataSrc;
            delete oEffectiveParameters["sap-system-src"];
        }

        return new Promise(function (fnResolve, fnReject) {
            that._spliceSapSystemIntoURI(oWebguiURI, oInboundResolutionResult.systemAlias, sSapSystem, sSapSystemDataSrc, "NATIVEWEBGUI", oInboundResolutionResult.systemAliasSemantics || O_SYSTEM_ALIAS_SEMANTICS.applied )
                .fail(fnReject)
                .done(function (oWebguiURI) {
                    // Reconstruct the final url
                    // ASSUMPTION: there are no relevant parameters in the Webgui url, but only Webgui parameters.

                    var sParams = oWebguiURI.search(); // Webgui parameters
                    var sParamsInterpolated = sParams
                        .split("&")
                        .map(function (sQueryParam) {
                            // interpolate effective parameter in the correct place within the ~transaction parameter

                            var sInterpolatedQueryParam;
                            if (sQueryParam.indexOf("?%7etransaction") === 0 ||
                                sQueryParam.indexOf("%7etransaction") === 0) { // found transaction

                                // treat transaction as if it was a query parameter
                                sInterpolatedQueryParam = that._injectEffectiveParametersIntoWebguiPobjectParam(
                                    sQueryParam,
                                    oEffectiveParameters,
                                    "%3b", // parameter separator -> ";"
                                    "%3d" // parameter assign delimiter -> "="
                                );
                                return sInterpolatedQueryParam;
                            }

                            return sQueryParam;
                        })
                        .join("&");

                    oWebguiURI.search(sParamsInterpolated);

                    // propagate properties from the inbound in the resolution result
                    ["additionalInformation", "applicationDependencies"].forEach(function (sPropName) {
                        if (oInbound.resolutionResult.hasOwnProperty(sPropName)) {
                            oResolutionResult[sPropName] = oInbound.resolutionResult[sPropName];
                        }
                    });
                    oResolutionResult.url = oWebguiURI.toString();
                    oResolutionResult.text = oInbound.title;
                    oResolutionResult.applicationType = "TR"; // Triggers Native navigation

                    fnResolve(oResolutionResult);
                });
        });

    };

    /**
     * Tells whether the given parameter is a Webgui business parameter
     * This method has a polimorphic signature: it can be called with one or two arguments.
     * If called with one argument both the name and the parameter value
     * should be passed, separated by "=". The first "=" will be treated as
     * parameter separator. Otherwise two parameters (name, value) can be passed.
     *
     * NOTE: the method determines whether the value is passed based on how
     * many arguments are passed.
     *
     * @param {string} sName
     *   A parameter name or a name=value string.
     * @param {string} [sValue]
     *   An optional parameter value to be used in combination with the
     *   name specified in <code>sNameMaybeValue</code>.
     *
     * @returns {boolean}
     *   Whether the given parameter is a Webgui business parameter.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._isWebguiBusinessParameter = function (sName, sValue) {
        var aNameValue;
        // handle case in which sName is in the form "name=value"
        if (arguments.length === 1) {
            aNameValue = sName.split(/[=](.+)?/); // split on first "="
            if (aNameValue.length > 1) {
                return this._isWebguiBusinessParameter.apply(this, aNameValue);
            }
        }

        return !(
            sName.indexOf("sap-") === 0 ||
            sName.charAt(0) === "~"
        );
    };

    /**
     * Finds and returns webgui non-business parameters.
     *
     * @param {object} oParams
     *   set of WebGUI parameters
     *
     * @return {object}
     *   the set of non-business parameters
     *
     * @private
     */
    ClientSideTargetResolution.prototype._getWebguiNonBusinessParameters = function (oParams) {
        var that = this,
            oNonBusinessParams;

        oNonBusinessParams = oCSTRUtils.filterObject(oParams, function (sKey, sVal) {
            return !that._isWebguiBusinessParameter(sKey, sVal);
        });

        return oNonBusinessParams;
    };

    /**
     * Finds and returns webgui business parameters.
     *
     * @param {object} oParams
     *   set of WebGUI parameters
     *
     * @return {object}
     *   the set of business parameters
     *
     * @private
     */
    ClientSideTargetResolution.prototype._getWebguiBusinessParameters = function (oParams) {
        var oBusinessParameters = oCSTRUtils.filterObject(oParams, this._isWebguiBusinessParameter);
        return oBusinessParameters;
    };


    function isRequiredParameter (sParameterName, oInbound) {
        return oInbound && oInbound.signature && oInbound.signature && oInbound.signature.parameters && oInbound.signature.parameters[sParameterName] && oInbound.signature.parameters[sParameterName].required === true;
    }

    /**
     * Returns the name of parameters that should not appear in a WebGUI URL.
     *
     * @param {object} oEffectiveParameters
     *    The array that contains of parameters possibly including parameter DYNP_OKCODE
     *    which might be mandatory, indicating that the first screen to be skipped
     *
     * @param {object} oInbound
     *    The inbound of the matching target
     *
     * @returns {array}
     *    The name parameters from <code>oEffectiveParameters</code> that
     *    should not be included in a WebGUI URL.
     */
    ClientSideTargetResolution.prototype._getUnnecessaryWebguiParameters = function (oEffectiveParameters, oInbound) {
        var bIsRequired = isRequiredParameter("DYNP_OKCODE", oInbound)
            || isRequiredParameter("DYNP_NO1ST", oInbound);

        var aBusinessParameters = [];

        if (bIsRequired) {
            return [];
        }

        var oBusinessParameters = this._getWebguiBusinessParameters(oEffectiveParameters);

        function upperCaseString (s) {
            return s.toUpperCase();
        }

        var aNormalizedBusinessParameters = Object.keys(oBusinessParameters)
            .map(upperCaseString)
            .sort();

        // checks if 2 arrays of strings are equal, the arrays are assumed to be sorted
        function arraysEqual (aArray1, aArray2) {
            if (aArray1.length !== aArray2.length) {
                return false;
            }

            return aArray1.every(function (vUnused, iIdx) {
                return aArray1[iIdx] == aArray2[iIdx];
            });
        }

        // check unnecessary parameter combinations
        if (arraysEqual(["DYNP_NO1ST","DYNP_OKCODE"], aNormalizedBusinessParameters)
            || arraysEqual(["DYNP_OKCODE"], aNormalizedBusinessParameters)
            || arraysEqual(["DYNP_NO1ST"], aNormalizedBusinessParameters)
        ) {
            aBusinessParameters = Object.keys(oBusinessParameters);
        }

        return aBusinessParameters;
    };

    /**
     * Constructs the resolution result of the given non-wrapped Native
     * Webgui matching target.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     * @param {string} sBaseUrl
     *   A base URL (without parameters) that should be used to construct the
     *   resolution result
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructNativeWebguiNowrapResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl) {
        var that = this,
            oInbound = oMatchingTarget.inbound,
            oResolutionResult = oInbound && oInbound.resolutionResult,
            oForbiddenParameters = {
                "sap-wd-run-sc": true,
                "sap-wd-auto-detect": true,
                "sap-ep-version": true,
                "sap-system": true,
                "sap-system-src": true
            };

        // splice parameters into Webgui url
        var oWebguiURI = new URI(sBaseUrl);

        // construct effective parameters
        /*
        /* NOTE: do not include defaultedParameterNames for wrapped URLs,
         * as they may cause a crash the called application.
         */
        var oEffectiveParameters = jQuery.extend(true, {}, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults);

        var sSapSystem = oEffectiveParameters["sap-system"] && oEffectiveParameters["sap-system"][0];
        var sSapSystemDataSrc = oEffectiveParameters["sap-system-src"] && oEffectiveParameters["sap-system-src"][0];

        // remove "forbidden" parameters
        Object.keys(oEffectiveParameters).forEach(function (sParamName) {
            if (oForbiddenParameters[sParamName.toLowerCase()]) {
                delete oEffectiveParameters[sParamName];
            }
        });

        return new Promise(function (fnResolve, fnReject) {
            that._spliceSapSystemIntoURI(oWebguiURI, oResolutionResult.systemAlias, sSapSystem, sSapSystemDataSrc, "NATIVEWEBGUI", oResolutionResult.systemAliasSemantics || O_SYSTEM_ALIAS_SEMANTICS.applied)
                .fail(fnReject)
                .done(function (oWebguiURI) {
                    var oResolutionResult = that._blendParamsIntoNativeWebGUI(oMatchingTarget.inbound, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults, oWebguiURI);

                    fnResolve(oResolutionResult);
                });
        });
    };
    /**
     * removes properties of an object
     * @param {*} oObject
     *   Object that is modified and that has its properties deleted
     * @param {array} aKeysToRemove The keys of properties to be removed
     */
    ClientSideTargetResolution.prototype._removeObjectKey = function (oObject, aKeysToRemove) {
        aKeysToRemove.forEach(function (sKeyToRemove) {
            delete oObject[sKeyToRemove];
        });
    };
    /**
     * blends parameters of oMatchingTarget into the oWebguiURI,
     * then sets the altered URI constructing a resolution result in oMatchingTarget
     *
     * @param {object} oInbound
     *   The original inbound
     *
     * @param {object} oMappedIntentParamsPlusSimpleDefaults
     *   The set of mapped parameters including simple default parameters
     *
     * @param {function} oWebguiURI
     *   A (native) WebGui URI Object
     *
     * @returns {object} oResolutionResult
     *
     * Note: the method mutates oWebguiURI
     * @private
     */

    ClientSideTargetResolution.prototype._blendParamsIntoNativeWebGUI = function (oInbound, oMappedIntentParamsPlusSimpleDefaults, oWebguiURI) {
        var that = this,
            oForbiddenParameters = {
                "sap-wd-run-sc": true,
                "sap-wd-auto-detect": true,
                "sap-ep-version": true,
                "sap-system": true
            };

        var oResolutionResult = {};

        // construct effective parameters
        /*
        /* NOTE: do not include defaultedParameterNames for wrapped URLs,
         * as they may cause a crash the called application.
         */
        var oEffectiveParameters = jQuery.extend(true, {}, oMappedIntentParamsPlusSimpleDefaults);
        var sSapSystem = oEffectiveParameters["sap-system"] && oEffectiveParameters["sap-system"][0];
        var sSapSystemDataSrc = oEffectiveParameters["sap-system-src"] && oEffectiveParameters["sap-system-src"][0];
        // before deleting forbidden parameters, back-up sap-system and sap-system-src
        oResolutionResult["sap-system"] = sSapSystem;
        if (typeof sSapSystemDataSrc === "string") {
            oResolutionResult["sap-system-src"] = sSapSystemDataSrc;
        }

        // remove "forbidden" parameters
        Object.keys(oEffectiveParameters).forEach(function (sParamName) {
            if (oForbiddenParameters[sParamName.toLowerCase()]) {
                delete oEffectiveParameters[sParamName];
            }
        });

        var aUnneccessaryParameters = that._getUnnecessaryWebguiParameters(oEffectiveParameters, oInbound || {});
        this._removeObjectKey(oEffectiveParameters, aUnneccessaryParameters);

        var oEffectiveParametersToAppend = this._getWebguiNonBusinessParameters(oEffectiveParameters);
        this._removeObjectKey(oEffectiveParameters, Object.keys(oEffectiveParametersToAppend));

        // Reconstruct the final url
        // ASSUMPTION: there are no relevant parameters in the Webgui url, but only Webgui parameters.

        var sParams = oWebguiURI.search(); // Webgui parameters
        var sParamsInterpolated = sParams
            .split("&")
            .map(function (sQueryParam) {
                var aNonBusinessParam;
                // interpolate effective parameter in the correct
                // place within the ~transaction parameter

                if (!that._isWebguiBusinessParameter(sQueryParam)) { // non-business parameters go in the end
                    // we need name = value
                    if (sQueryParam.indexOf("=") >= 0) {

                        aNonBusinessParam = sQueryParam.split("=");
                        if (!oEffectiveParametersToAppend.hasOwnProperty(aNonBusinessParam[0])) { // effective parameters have precedence
                            oEffectiveParametersToAppend[
                                aNonBusinessParam[0] // name
                            ] = aNonBusinessParam[1]; // value
                        }

                    } else {
                        jQuery.sap.log.error(
                            "Found no '=' separator of Webgui non-business parameter. Parameter will be skipped.",
                            "'" + sQueryParam + "'",
                            "sap.ushell.services.ClientSideTargetResolution"
                        );
                    }

                    return undefined; // do not append this parameter
                }

                var sInterpolatedQueryParam;
                if (sQueryParam.indexOf("?%7etransaction") === 0 ||
                    sQueryParam.indexOf("%7etransaction") === 0) { // found transaction

                    // treat transaction as if it was a query parameter
                    sInterpolatedQueryParam = that._injectEffectiveParametersIntoWebguiQueryParam(
                        sQueryParam,
                        oEffectiveParameters,
                        "%3b", // parameter separator -> ";"
                        "%3d" // parameter assign delimiter -> "="
                    );
                    return sInterpolatedQueryParam;
                }
                return sQueryParam;
            })
            .filter(function (sParam) {
                return typeof sParam !== "undefined";
            }) // remove skipped parameters
            .join("&");

        // append non business parameters
        var sEffectiveParamsToAppend = that._getURLParsing().paramsToString(oEffectiveParametersToAppend);
        sParamsInterpolated = [
            sParamsInterpolated,
            sEffectiveParamsToAppend.replace("~", "%7e") // encodeURIComponent escapes all characters except:
            // alphabetic, decimal digits, - _ . ! ~ * ' ( )'
        ].join("&");

        oWebguiURI.search(sParamsInterpolated);

        // propagate properties from the inbound in the resolution result
        ["additionalInformation", "applicationDependencies", "sap.platform.runtime"].forEach(function (sPropName) {
            if (oInbound.resolutionResult.hasOwnProperty(sPropName)) {
                oResolutionResult[sPropName] = oInbound.resolutionResult[sPropName];
            }
        });
        oResolutionResult.url = oWebguiURI.toString();
        oResolutionResult.text = oInbound.title;
        oResolutionResult.applicationType = "TR"; // Triggers native navigation

        return oResolutionResult;
    };

    /**
     * Constructs the resolution result of the given SAPUI5 matching target.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     *
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     *
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     *
     * @param {string} sBaseUrl
     *   A base URL (without parameters) that should be used to construct the
     *   resolution result
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructSAPUI5ResolutionResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl) {
        var oInbound = oMatchingTarget.inbound,
            sUrlParams,
            sSapSystem,
            sSapSystemSrc,
            oEffectiveParameters,
            oResolutionResult = {};

        // propagate properties from the inbound in the resolution result
        // NOTE: we **propagate** applicationType here, as we want to handle URLs as well
        ["applicationType", "additionalInformation", "applicationDependencies"].forEach(function (sPropName) {
            if (oInbound.resolutionResult.hasOwnProperty(sPropName)) {
                oResolutionResult[sPropName] = oInbound.resolutionResult[sPropName];
            }
        });

        oResolutionResult.url = sBaseUrl;

        // urls are not required if:
        // - the UI5 specifies the manifestUrl among the application dependencies or
        // - the component is part of the dist layer
        if (oResolutionResult.applicationDependencies
            && typeof oResolutionResult.url === "undefined") {

            oResolutionResult.url = ""; // relative url
        }

        // empty urls are valid (they indicate relative url path). This happens in case of
        // app variants where the Component is located in the dist layer.
        if (typeof oResolutionResult.url === "undefined") {
            return Promise.reject("Cannot resolve intent: url was not specified in matched inbound");
        }

        // construct effective parameters including defaults
        oEffectiveParameters = jQuery.extend(true, {}, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults);

        /*
         * Deal with reserved parameters
         *
         * Reserved parameters are removed from the result url and moved
         * to a separate section of the resolution result.
         */
        oResolutionResult.reservedParameters = {};
        var oReservedParameters = {
            //
            // Used by the RT plugin to determine whether the RT change was made
            // by a key user or by a end-user.
            //
            "sap-ui-fl-max-layer": true,
            //
            // Used by RTA to determine which control variant id(s) should be
            // selected when the application is loaded.
            //
            "sap-ui-fl-control-variant-id": true
        };
        Object.keys(oReservedParameters).forEach(function (sName) {
            var sValue = oEffectiveParameters[sName];
            if (sValue) {
                delete oEffectiveParameters[sName];
                oResolutionResult.reservedParameters[sName] = sValue;
            }

        });
        // don't list reserved parameters as defaulted
        oMatchingTarget.mappedDefaultedParamNames = oMatchingTarget.mappedDefaultedParamNames
            .filter(function (sDefaultedParameterName) {
                return !oReservedParameters[sDefaultedParameterName];
            });

        if (oMatchingTarget.mappedDefaultedParamNames.length > 0) {
            oEffectiveParameters["sap-ushell-defaultedParameterNames"] = [JSON.stringify(oMatchingTarget.mappedDefaultedParamNames)];
        }

        sSapSystem = oEffectiveParameters["sap-system"] && oEffectiveParameters["sap-system"][0];
        sSapSystemSrc = oEffectiveParameters["sap-system-src"] && oEffectiveParameters["sap-system-src"][0];

        // contrarily to the WDA case, in the SAPUI5 case sap-system and
        // sap-system-src are part of the final URL
        oResolutionResult["sap-system"] = sSapSystem;
        if (typeof sSapSystemSrc === "string") {
            oResolutionResult["sap-system-src"] = sSapSystemSrc;
        }

        oMatchingTarget.effectiveParameters = oEffectiveParameters;

        // prepare a proper URL!
        sUrlParams = this._getURLParsing().paramsToString(oEffectiveParameters);
        if (sUrlParams) {
            // append parameters to URL
            oResolutionResult.url = sBaseUrl + ((sBaseUrl.indexOf("?") < 0) ? "?" : "&") + sUrlParams;
        }

        // IMPORTANT: check for no ui5ComponentName to avoid adding it to URL types
        if (typeof oInbound.resolutionResult.ui5ComponentName !== "undefined") {
            oResolutionResult.ui5ComponentName = oInbound.resolutionResult.ui5ComponentName;
        }

        oResolutionResult.text = oInbound.title;

        return Promise.resolve(oResolutionResult);
    };

    /**
     * Determines whether the given URI object is absolute or not.
     *
     * @param {URI} oURI
     *    The URI object to check.
     *
     * @returns {boolean}
     *    Whether the given URI object is absolute.
     */
    ClientSideTargetResolution.prototype._isAbsoluteURI = function (oURI) {
        return (oURI.protocol() || "").length > 0;
    };

    /**
     * Checks whether an absolute URL was typed in some configuration of the
     * inbound by the User or it's absolute becaus of a system alias was
     * provided.<br />
     *
     * @param {object} oURI
     *  The URI object to check.
     *
     * @param {string} sSystemAlias
     *  The system alias configured for this URL.
     *
     * @param {string} sSystemAliasSemantics
     *  How to interpret the system alias in relation to a configured URL. This
     *  can be one of the following two strings:
     *  <ul>
     *  <li>applied (default): the system alias was already applied to the URL</li>
     *  <li>apply: the system alias is to be applied to the URL</li>
     *  </ul>
     *
     * @returns {boolean}
     *  Whether the URL provided was defined as absolute by the user.
     *
     * @throws
     *  An error with a message is thrown if an invalid value of
     *  sSystemAliasSemantics is provided.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._absoluteUrlDefinedByUser = function (oURI, sSystemAlias, sSystemAliasSemantics) {
        if (!sSystemAliasSemantics  // default semantics is 'applied'
            || sSystemAliasSemantics === O_SYSTEM_ALIAS_SEMANTICS.applied) {

            // In 'applied' semantics, the system alias is already
            // applied to the URL. Therefore it has protocol,
            // port and (part of the) path because the system alias was already
            // given as pre-interpolated.

            return this._isAbsoluteURI(oURI)
                && !sSystemAlias; // no system alias -> user has typed in the absolute URL
        }

        if (sSystemAliasSemantics === O_SYSTEM_ALIAS_SEMANTICS.apply) {

            // In 'apply' semantic, the system alias is not pre-interpolated to
            // the URL, but must be applied to the URL.  This excludes the
            // possibility that the URL is absolute because a system alias was
            // provided... and therefore it MUST have been typed in as absolute
            // URL by the user!

            return this._isAbsoluteURI(oURI);
        }

        throw new Error("Invalid system alias semantics: '" + sSystemAliasSemantics + "'");

    };
    /**
     * Constructs the resolution result of the given URL matching target.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     *
     * @param {function} fnBoundFallback
     *   A fallback function used to resolve the hash fragment server-side
     *
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     *
     * @param {string} sBaseUrl
     *   A base URL (without parameters) that should be used to construct the
     *   resolution result
     *
     * @returns {Promise}
     *   A promise that resolves with the resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructURLResolutionResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment, sBaseUrl) {
        var that = this,
            oInbound = oMatchingTarget.inbound,
            oInboundResolutionResult = oInbound && oInbound.resolutionResult,
            oResolutionResult = {};

        // splice parameters into url
        var oURI = new URI(sBaseUrl);

        // construct effective parameters including defaults
        var oEffectiveParameters = jQuery.extend(true, {}, oMatchingTarget.mappedIntentParamsPlusSimpleDefaults);

        // a special hack to work around the AA modelling of Tile Intents in the export
        // the special intent Shell-launchURL with a dedicated parameter sap-external-url
        // which shall *not* be propagated into the final url
        if (oMatchingTarget.inbound && oMatchingTarget.inbound.action === "launchURL" && oMatchingTarget.inbound.semanticObject === "Shell") {
            delete oEffectiveParameters["sap-external-url"];
        }

        var sSapSystem = oEffectiveParameters["sap-system"] && oEffectiveParameters["sap-system"][0];
        var sSapSystemDataSrc = oEffectiveParameters["sap-system-src"] && oEffectiveParameters["sap-system-src"][0];

        // do not include the sap-system parameter in the URL
        oResolutionResult["sap-system"] = sSapSystem;
        delete oEffectiveParameters["sap-system"];

        // do not include the sap-system-src parameter in the URL
        if (typeof sSapSystemDataSrc === "string") {
            oResolutionResult["sap-system-src"] = sSapSystemDataSrc;
            delete oEffectiveParameters["sap-system-src"];
        }

        return (new Promise(function (fnResolve, fnReject) {
            if (that._absoluteUrlDefinedByUser(oURI, oInboundResolutionResult.systemAlias, oInboundResolutionResult.systemAliasSemantics)) {
                fnResolve(sBaseUrl);
            } else {
                that._spliceSapSystemIntoURI(oURI, oInboundResolutionResult.systemAlias, sSapSystem, sSapSystemDataSrc, "URL", oInboundResolutionResult.systemAliasSemantics || O_SYSTEM_ALIAS_SEMANTICS.applied)
                    .fail(fnReject)
                    .done(function (oSapSystemURI) {
                        var sSapSystemUrl = oSapSystemURI.toString();
                        fnResolve(sSapSystemUrl);
                    });
            }
        }))
        .then(function (sUrlWithoutParameters) {
            var sParameters = that._getURLParsing().paramsToString(oEffectiveParameters);
            return that._appendParametersToUrl(sParameters, sUrlWithoutParameters);
        }, Promise.reject.bind(Promise))
        .then(function (sUrlWithParameters) {
            // propagate properties from the inbound in the resolution result
            ["additionalInformation", "applicationDependencies"].forEach(function (sPropName) {
                if (oInbound.resolutionResult.hasOwnProperty(sPropName)) {
                    oResolutionResult[sPropName] = oInbound.resolutionResult[sPropName];
                }
            });

            oResolutionResult.url = sUrlWithParameters;
            oResolutionResult.text = oInbound.title;
            oResolutionResult.applicationType = "URL";

            return Promise.resolve(oResolutionResult);
        }, Promise.reject.bind(Promise));
    };

    /**
     * Append the given parameters to the URL.
     *
     * @param {object} sParameters
     *   a string of parameters to append to the url. For example like:
     *   <code>A=1&B=2&C=3</code>
     *
     * @param {string} sUrl
     *   the URL to append parameters to
     *
     * @returns {string}
     *   the URL with the parameters appended.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._appendParametersToUrl = function (sParameters, sUrl) {
        var sSapSystemUrlWoFragment,
            sFragment;

        if (sParameters) {

            var sUrlFragment = sUrl.match(/#.*/);
            if (sUrlFragment) {
                sFragment = sUrlFragment;
                sSapSystemUrlWoFragment = sUrl.replace(sUrlFragment, "");
            } else {
                sSapSystemUrlWoFragment = sUrl;
                sFragment = "";
            }

            sUrl = sSapSystemUrlWoFragment + ((sUrl.indexOf("?") < 0) ? "?" : "&") + sParameters + sFragment;
        }

        return sUrl;
    };

    /**
     * Construct the resolution result of the given matching delegating the
     * actual construction of the resolution result to a given fallback
     * function.
     *
     * @param {object} oMatchingTarget
     *   The matching target to amend with the resolution result
     *
     * @param {function} fnBoundFallback
     *   A fallback function used by this method to resolve the given hash
     *   fragment. It is called with the following positional parameters:
     *   <ol>
     *     <li>hash fragment string</li>
     *     <li>inbound that matched the hash fragment</li>
     *     <li>oEffectiveParameters, the parameters to be added to the resolved url</li>
     *   </ol>
     *
     *   This function must return a jQuery promise that is resolved with an
     *   object like:
     *   <pre>
     *   {
     *      applicationType: ...,
     *      additionalInformation: ...,
     *      url: ...,
     *      applicationDependencies: ...,
     *      text: ...
     *   }
     *   </pre>
     *
     *   Missing properties will be excluded from the resolution result.
     *
     * @param {string} sFixedHashFragment
     *   The hash fragment to be resolved with a guaranteed "#" prefix
     *
     * @returns {Promise}
     *   A promise that resolves with the ResolutionResult or rejects with an
     *   error message if either the <code>fnBoundFallback</code> parameter was
     *   undefined or failed to produce a resolution result.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._constructFallbackResolutionResult = function (oMatchingTarget, fnBoundFallback, sFixedHashFragment) {
        /*
         * The current flow is to resolve the result with all
         * *uncompressed* default substituted parameters and alteres
         * appState compress the url afterwards if needed (the fallback
         * function takes care of this).
         */
        var oEffectiveParameters = {},
            aDefaultedParamNames;

        Object.keys(oMatchingTarget.intentParamsPlusAllDefaults).forEach(function (sParamName) {
            if (jQuery.isArray(oMatchingTarget.intentParamsPlusAllDefaults[sParamName])) {
                oEffectiveParameters[sParamName] = oMatchingTarget.intentParamsPlusAllDefaults[sParamName];
            }
        });
        aDefaultedParamNames = oMatchingTarget.mappedDefaultedParamNames || oMatchingTarget.defaultedParamNames;
        if (aDefaultedParamNames.length > 0) {
            oEffectiveParameters["sap-ushell-defaultedParameterNames"] = [JSON.stringify(aDefaultedParamNames)];
        }

        if (typeof fnBoundFallback !== "function") {
            // no fallback logic available
            jQuery.sap.log.error(
                "Cannot resolve hash fragment",
                sFixedHashFragment + " has matched an inbound that cannot be resolved client side" + " and no resolveHashFragmentFallback method was implemented in ClientSideTargetResolutionAdapter",
                "sap.ushell.services.ClientSideTargetResolution"
            );

            return Promise.reject("Cannot resolve hash fragment: no fallback provided.");
        }

        // fallback
        jQuery.sap.log.warning(
            "Cannot resolve hash fragment client side",
            sFixedHashFragment + " has matched an inbound that cannot be resolved client side. Using fallback logic",
            "sap.ushell.services.ClientSideTargetResolution"
        );

        // NOTE: the callback function will be invoked with the effective *unmapped* parameter names! as 3rd argument
        return new Promise(function (fnResolve, fnReject) {
            fnBoundFallback(
                    sFixedHashFragment,
                    jQuery.extend(true, {}, oMatchingTarget.inbound), // don't let adapters to change the inbound member
                    oEffectiveParameters
                )
                .done(function (oFallbackResolutionResult) {
                    var oResolutionResult = {};
                    // propagate properties from the resolution result returned by the fallback function
                    ["applicationType", "additionalInformation", "url", "applicationDependencies", "text"].forEach(function (sPropName) {
                        if (oFallbackResolutionResult.hasOwnProperty(sPropName)) {
                            oResolutionResult[sPropName] = oFallbackResolutionResult[sPropName];
                        }
                    });

                    fnResolve(oResolutionResult);
                })
                .fail(fnReject.bind(null));
        });
    };

    /**
     * Returns a list of unique semantic objects assigned to the current
     * user. The semantic objects coming from an inbound with
     * hideIntentLink set to <code>true</code> are not returned since these
     * inbounds are not returned by getLinks.
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that resolves with an array of strings representing the
     *   User's semantic objects or rejects with an error message.
     *   <p>
     *   NOTE: semantic objects are returned in lexicographical order in
     *   the result array.
     *   </p>
     *
     * @private
     * @since 1.38.0
     */
    ClientSideTargetResolution.prototype.getDistinctSemanticObjects = function () {
        var oDeferred = new jQuery.Deferred();

        this._oInboundProvider.getInbounds().then(function (oInboundIndex) {
                var oSemanticObjects = {};

                oInboundIndex.getAllInbounds().forEach(function (oInbound) {
                    if (typeof oInbound.semanticObject === "string" && oInbound.semanticObject !== "*" && !oInbound.hideIntentLink && oInbound.semanticObject.length > 0) {

                        oSemanticObjects[oInbound.semanticObject] = true;
                    }
                });

                oDeferred.resolve(
                    Object.keys(oSemanticObjects).sort()
                );
            },
            function () {
                oDeferred.reject.apply(oDeferred, arguments);
            });

        return oDeferred.promise();
    };

    /**
     * Resolves a semantic object/action and business parameters to a list
     * of links, taking into account the form factor of the current device.
     *
     * @param {object} oArgs
     *   An object containing nominal arguments for the method, having the
     *   following structure:
     *   {
     *      semanticObject: "Object", // optional (matches all semantic objects)
     *      action: "action",         // optional (matches all actions)
     *      params: {                 // optional business parameters
     *         A: "B",
     *         C: ["e", "j"]
     *      },
     *      paramsOptions: [          // optional
     *         { name: "A", required: true }
     *      ],
     *      ignoreFormFactor: true,    // (optional) defaults to false
     *      treatTechHintAsFilter : true, // (optional) default false
     *
     *      // List of tags under which the returned links may belong to.
     *      tags: [ "tag-A", "tag-B" ] // (optional) defaults to undefined
     *   }
     *
     *   <p>
     *   Note: positional arguments supported prior to version 1.38.0 are
     *   now deprecated. The caller should always specify nominal
     *   parameters, using an object. Also, wildcards for semanticObject
     *   and action parameters are now expressed via <code>undefined</code>,
     *   or by just omitting the parameter in the object.
     *   </p>
     *   <p>
     *   Note: treatTechHintAsFilter does a plain filtering on technology if supplied
     *   it does *not* do conflict resolution.
     *     Example:   "UI5" ?P1=1   "(UI5)"
     *                "WDA" ?P1=1   "(WDA)"
     *                "GUI"         "(GUI)"
     *
     *   <p>calling getLinks with P1=1&sap-ui-tech-hint=GUI will return
     *   <br>A-b?P1=1&sap-ui-tech-hint=GUI</br> and the text "(GUI)"</p>
     *   <p>
     *   resolving A-b?P1=1&sap-ui-tech-hint=GUI will always invoke UI5 (!)
     *   </p>
     *   </p>
     *
     * @returns {jQuery.Deferred.promise}
     *   A promise that resolves with an array of links objects containing
     *   (at least) the following properties:
     *
     * <pre>
     *   {
     *      intent: "#AnObject-Action?A=B&C=e&C=j",
     *      text: "Perform action",
     *      icon: "sap-icon://Fiori2/F0018",   //optional
     *      subTitle: "Action" //optional,
     *      shortTitle: "Perform" //optional
     *   }
     * </pre>
     *
     * @private
     * @since 1.38.0
     */
    ClientSideTargetResolution.prototype.getLinks = function (oArgs) {
        var oNominalArgs,
            that = this,
            sSemanticObject, mParameters, bIgnoreFormFactor, // old 3-arguments tuple
            oDeferred = new jQuery.Deferred(),
            oCallArgs;

        if (arguments.length === 1 && jQuery.isPlainObject(arguments[0])) {
            oNominalArgs = arguments[0];
            oCallArgs = jQuery.extend(true, {}, oNominalArgs);
            // assure action : undefined in transported, as there is a check on this below !?!
            ["action", "semanticObject"].forEach(function (sArg) {
                if (oNominalArgs.hasOwnProperty(sArg)) {
                    oCallArgs[sArg] = oNominalArgs[sArg];
                }
            });
            if (oCallArgs.appStateKey) {
                oCallArgs.params = oCallArgs.params || {};
                oCallArgs.params["sap-xapp-state"] = [oCallArgs.appStateKey];
                delete oCallArgs.appStateKey;
            }

            // note, may be a 1.38+ call or a pre 1.38 call if without action.

        } else if (arguments.length <= 3) {
            // 3 parameters: pre-1.38.0 behavior, parameters are sSemanticObject, mParameters, bIgnoreFormFactor
            // NOTE: in 1.38.0 only the first argument is mandatory!

            // NOTE: in theory there should be no public caller of this
            // method (it's private) apart from some sample apps.
            jQuery.sap.log.warning(
                "Passing positional arguments to getLinks is deprecated",
                "Please use nominal arguments instead",
                "sap.ushell.services.ClientSideTargetResolution"
            );

            sSemanticObject = arguments[0];
            mParameters = arguments[1];
            bIgnoreFormFactor = arguments[2];

            oCallArgs = { // NOTE: no action passed here
                semanticObject: sSemanticObject,
                params: mParameters,
                ignoreFormFactor: bIgnoreFormFactor
            };
        } else {
            return oDeferred.reject("invalid arguments for getLinks").promise();
        }

        this._oInboundProvider.getInbounds().then(function (oInboundIndex) {

            that._getLinks(oCallArgs, oInboundIndex)
                .done(oDeferred.resolve.bind(oDeferred))
                .fail(oDeferred.reject.bind(oDeferred));

        }, function () {
            oDeferred.reject.apply(oDeferred, arguments);
        });

        return oDeferred.promise();
    };

    /**
     * Validate input arguments for <code>_getLinks</code>
     * and log the first input validation error.
     *
     * @param {object} oArgs
     *   An object of nominal parameters.
     *
     * @returns {string}
     *   An error message if validation was not successful or undefined in
     *   case of successful validation.
     *
     * @private
     */
    ClientSideTargetResolution.prototype._validateGetSemanticObjectLinksArgs = function (oArgs) {
        var sSemanticObject = oArgs.semanticObject,
            sAction = oArgs.action,
            bIsPre138Call = !oArgs.hasOwnProperty("action"); // action always passed in ushell-lib 1.38.0+

        if (typeof sSemanticObject !== "undefined" || bIsPre138Call) {
            if (typeof sSemanticObject !== "string") {
                jQuery.sap.log.error("invalid input for _getLinks",
                    "the semantic object must be a string, got " + Object.prototype.toString.call(sSemanticObject) + " instead",
                    "sap.ushell.services.ClientSideTargetResolution");
                return "invalid semantic object";
            }
            if (bIsPre138Call && sSemanticObject.match(/^\s+$/)) {
                jQuery.sap.log.error("invalid input for _getLinks",
                    "the semantic object must be a non-empty string, got '" + sSemanticObject + "' instead",
                    "sap.ushell.services.ClientSideTargetResolution");
                return "invalid semantic object";
            }
            if (!bIsPre138Call && sSemanticObject.length === 0) {
                jQuery.sap.log.error("invalid input for _getLinks",
                    "the semantic object must not be an empty string, got '" + sSemanticObject + "' instead",
                    "sap.ushell.services.ClientSideTargetResolution");
                return "invalid semantic object";
            }
        }
        if (typeof sAction !== "undefined") {
            if (typeof sAction !== "string") {
                jQuery.sap.log.error("invalid input for _getLinks",
                    "the action must be a string, got " + Object.prototype.toString.call(sAction) + " instead",
                    "sap.ushell.services.ClientSideTargetResolution");
                return "invalid action";
            }
            if (sAction.length === 0) {
                jQuery.sap.log.error("invalid input for _getLinks",
                    "the action must not be an empty string, got '" + sAction + "' instead",
                    "sap.ushell.services.ClientSideTargetResolution");
                return "invalid action";
            }
        }

        return undefined;
    };

    /**
     * Internal implementation of getLinks
     *
     * @param {object} oArgs
     *   An object containing nominal parameters for getLinks like:
     *
     *   <pre>
     *   {
     *      semanticObject: "...",       // optional
     *      action: "...",               // optional
     *      params: { ... },             // optional, note this is always
     *                                   // passed in compact format,
     *                                   // compatibly with
     *                                   // URLParsing.paramsToString.
     *                                   // See sap.ushell.services.CrossApplicationNavigation
     *                                   // for information on extended format.
     *      paramsOptions: [             // optional
     *         { name: "A", required: true }
     *      ],
     *      appStateKey : string         // optional, better put into params!
     *      withAtLeastOneUsedParam: true, // Allows to obtain only those links
     *                                   // that, when resolved, would result
     *                                   // in at least one of the parameters
     *                                   // from 'params' to be used in the
     *                                   // target URL.
     *                                   //
     *                                   // Note that by construction this
     *                                   // parameter is effective when
     *                                   // inbounds specify additionalParameters:
     *                                   // "ignored". In fact if additional
     *                                   // parameters are allowed, these would be
     *                                   // still be processed (therefore used)
     *                                   // when the navigation occurs.
     *      ignoreFormFactor: true|false // optional, defaults to true
     *   }
     *   </pre>
     *
     * @param {array} oInboundIndex
     *   An inbound index to retrieve the get semantic object links from.
     *
     * @returns {array}
     *   An array of link objects containing (at least) the following
     *   properties:
     * <pre>
     * {
     *   intent: "#AnObject-Action?A=B&C=e&C=j",
     *   text: "Perform action",
     *   icon: "sap-icon://Fiori2/F0018",   //optional,
     *   subTitle: "Action" //optional,
     *   shortTitle: "Perform" //optional
     * }
     * </pre>
     *
     * @private
     */
    ClientSideTargetResolution.prototype._getLinks = function (oArgs, oInboundIndex) {
        var sSemanticObject = oArgs.semanticObject,
            sAction = oArgs.action,
            mParameters = oArgs.params,
            bWithAtLeastOneUsedParam = !!oArgs.withAtLeastOneUsedParam,
            bTreatTechHintAsFilter = !!oArgs.treatTechHintAsFilter,
            bIgnoreFormFactor = oArgs.ignoreFormFactor,
            sSortProperty = oArgs.hasOwnProperty("sortResultsBy")
                ? oArgs.sortResultsBy
                : "intent";

        if (oArgs.hasOwnProperty("sortResultOnTexts")) {
            jQuery.sap.log.warning(
                "the parameter 'sortResultOnTexts' was experimantal and is no longer supported",
                "getLinks results will be sorted by '" + sSortProperty + "'",
                "sap.ushell.services.ClientsideTargetResolution"
            );
        }

        var oInboundsConstraints = { bExcludeTileInbounds: true };

        var sErrorMessage = this._validateGetSemanticObjectLinksArgs( oArgs );

        if ( oArgs.tags ) {
            oInboundsConstraints.tags = oArgs.tags;
        }

        if ( sErrorMessage ) {
            return new jQuery.Deferred().reject( sErrorMessage ).promise();
        }

        if ( sSemanticObject === "*" ) {
            // shortcut: skip matching inbounds and return directly.
            // It can only match "*" and we don't return it anyway.
            return jQuery.when( [ ] );
        }

        /*
         * Returns ?-prefixed business parameters
         */
        function fnConstructBusinessParamsString (oUrlParsing, mParameters) {
            var sBusinessParams = oUrlParsing.paramsToString(mParameters);
            return sBusinessParams ? "?" + sBusinessParams : "";
        }

        var oUrlParsing = this._getURLParsing(),
            oDeferred = new jQuery.Deferred(),
            sFormFactor = oUtils.getFormFactor(),
            oAllIntentParams = oUrlParsing.parseParameters(fnConstructBusinessParamsString(oUrlParsing, mParameters)),
            oShellHash = {
                semanticObject: (sSemanticObject === "" ? undefined : sSemanticObject),
                action: sAction, // undefined: match all actions
                formFactor: (
                    bIgnoreFormFactor ? undefined // match any form factor
                    : sFormFactor
                ),
                params: oAllIntentParams
            };
        if (bTreatTechHintAsFilter) {
            oShellHash.treatTechHintAsFilter = true;
        }

        this._getMatchingInbounds( oShellHash, oInboundIndex, oInboundsConstraints )
            .done(function (aMatchingTargets) {
                var oUniqueIntents = {},
                    aResults = aMatchingTargets
                    .map(function (oMatchResult) {
                        var sAdjustedSemanticObject = sSemanticObject || oMatchResult.inbound.semanticObject,
                            sIntent = "#" + sAdjustedSemanticObject + "-" + oMatchResult.inbound.action,
                            oNeededParameters;

                        // we never return "*" semantic objects from
                        // getLinks as they are not parsable links
                        if (sAdjustedSemanticObject === "*") {
                            return undefined;
                        }

                        // we never want to return "*" actions from
                        // getLinks as they are non parsable links
                        if (oMatchResult.inbound.action === "*") {
                            return undefined;
                        }

                        if (oMatchResult.inbound && oMatchResult.inbound.hasOwnProperty("hideIntentLink") && oMatchResult.inbound.hideIntentLink === true) {
                            return undefined;
                        }

                        if (!oUniqueIntents.hasOwnProperty(sIntent)) {
                            oUniqueIntents[sIntent] = {
                                matchingInbound: oMatchResult.inbound,
                                count: 1
                            };

                            if (oMatchResult.inbound.signature.additionalParameters === "ignored") {
                                /*
                                 * In the result do not show all intent
                                 * parameters, but only those mentioned by
                                 * the inbound.
                                 */
                                oNeededParameters = oCSTRUtils.filterObjectKeys(oAllIntentParams, function (sIntentParam) {
                                    return (sIntentParam.indexOf("sap-") === 0) ||
                                        oMatchResult.inbound.signature.parameters.hasOwnProperty(sIntentParam);
                                }, false);
                            } else {
                                oNeededParameters = oAllIntentParams;
                            }

                            // --- begin of post-match reject reasons

                            if (bWithAtLeastOneUsedParam) {
                                var bAtLeastOneNonSapParam = Object.keys(oNeededParameters).some(function (sNeededParamName) {
                                    return sNeededParamName.indexOf("sap-") !== 0;
                                });
                                if (!bAtLeastOneNonSapParam) {
                                    oUniqueIntents[sIntent].hideReason = "getLinks called with 'withAtLeastOneUsedParam = true', but the inbound had no business parameters defined.";
                                    return undefined;
                                }
                            }

                            var bSignatureMeetsParameterOptions = oCSTRUtils.inboundSignatureMeetsParameterOptions(
                                oMatchResult.inbound.signature.parameters,
                                oArgs.paramsOptions || []
                            );
                            if (!bSignatureMeetsParameterOptions) {
                                oUniqueIntents[sIntent].hideReason = "inbound signature does not meet the requested parameter filter options";
                                return undefined;
                            }

                            // --- end of post-match reject reasons

                            var oResult = {
                                "intent": sIntent + fnConstructBusinessParamsString(oUrlParsing, oNeededParameters),
                                "text": oMatchResult.inbound.title
                            };

                            if (oMatchResult.inbound.icon) {
                                oResult.icon = oMatchResult.inbound.icon;
                            }
                            if (oMatchResult.inbound.subTitle) {
                                oResult.subTitle = oMatchResult.inbound.subTitle;
                            }
                            if (oMatchResult.inbound.shortTitle) {
                                oResult.shortTitle = oMatchResult.inbound.shortTitle;
                            }

                            var sInboundTag = jQuery.sap.getObject(
                                'inbound.signature.parameters.sap-tag.defaultValue.value',
                                undefined,   // don't modify oMatchResult
                                oMatchResult
                            );
                            if (sInboundTag) {
                                oResult.tags = [ sInboundTag ];
                            }

                            return oResult;

                        } else {
                            // for debugging purposes
                            oUniqueIntents[sIntent].count++;
                        }
                        return undefined;
                    })
                    .filter(function (oSemanticObjectLink) {
                        return typeof oSemanticObjectLink === "object";
                    });

                if (sSortProperty !== "priority") {
                    aResults.sort(function (oGetSoLinksResult1, oGetSoLinksResult2) {
                        return oGetSoLinksResult1[sSortProperty] < oGetSoLinksResult2[sSortProperty] ? -1 : 1;
                    });
                }

                if (aResults.length === 0) {
                    jQuery.sap.log.debug("_getLinks returned no results");
                } else if (jQuery.sap.log.getLevel() >= jQuery.sap.log.Level.DEBUG) {

                    if (jQuery.sap.log.getLevel() >= jQuery.sap.log.Level.TRACE) {
                        var aResultLines = [];
                        var aHiddenResultLines = [];

                        aResults.forEach(function (oResult) {
                            var sIntent = oResult.intent.split("?")[0];

                            if (oUniqueIntents[sIntent].hideReason) {
                                aHiddenResultLines.push([
                                    "-", sIntent + "(" + oUniqueIntents[sIntent].hideReason + ")\n",
                                    " text:", oResult.text + "\n",
                                    " full intent:", oResult.intent
                                ].join(" "));
                            } else {
                                aResultLines.push([
                                    "-", sIntent,
                                        oUniqueIntents[sIntent].count > 1
                                            ? "(" + (oUniqueIntents[sIntent].count - 1) + " others matched)\n"
                                            : "\n",
                                    "text:", oResult.text + "\n",
                                    "full intent:", oResult.intent
                                ].join(" "));
                            }
                        });

                        jQuery.sap.log.debug(
                            "_getLinks filtered to the following unique intents:",
                            "\n" + aResultLines.join("\n"),
                            "sap.ushell.services.ClientSideTargetResolution"
                        );

                        jQuery.sap.log.debug(
                            "_getLinks would have also returned the following unique intents, but something prevented this:",
                            aHiddenResultLines.join("\n"),
                            "sap.ushell.services.ClientSideTargetResolution"
                        );

                    } else {
                        jQuery.sap.log.debug(
                            "_getLinks filtered to unique intents.",
                            "Reporting histogram: \n - " + Object.keys(oUniqueIntents).join("\n - "),
                            "sap.ushell.services.ClientSideTargetResolution"
                        );
                    }
                }
                oDeferred.resolve(aResults);
            })
            .fail(oDeferred.reject.bind(oDeferred));

        return oDeferred.promise();
    };

    /**
     * Matches the given resolved shell hash against all the inbounds.
     *
     * @param {object} oShellHash
     *     The resolved hash fragment. This is an object like:
     * <pre>
     *  {
     *      semanticObject: "SomeSO" // (or undefined),
     *      action: "someAction"     // (or undefined),
     *      formFactor: "desktop"    // (or tablet, phone, or undefined)
     *      params: {
     *           "name": ["value"],
     *           ...
     *      }
     *  }
     * </pre>
     * <br>
     * where <code>undefined</code> value represent wildcards.
     *
     * @param {array} oInboundIndex
     *     An inbound index to match the intent against
     *
     * @param {boolean} [oConstraints.bExcludeTileInbounds]
     *     Whether the tile inbounds should be filtered out during
     *     matching. Defaults to <code>false</code>. Tile inbounds can be
     *     distinguished by other inbounds because they specify the
     *     following:
     *
     *<pre>
     *  { ...
     *    "tileResolutionResult" : { "isCustomTile": true }
     *    ...
     *  }
     *</pre>
     *@param {array} [oConstraints.tags] Tags to which the queried inbounds should belong to.
     *
     * @returns {jQuery.Promise[]}
     *     a sorted array of matching targets. A target is a matching result
     *     that in addition has a specific priority with respect to other
     *     matching targets.
     *
     * @private
     * @since 1.32.0
     *
     * @todo This method is 250 lines long, consider splitting it into a
     *      composition of smaller units if possible.
     */
    ClientSideTargetResolution.prototype._getMatchingInbounds = function (oShellHash, oInboundIndex, oConstraints) {
        var that = this,
            aTags,
            sAction,
            iLogId,
            aInbounds,
            sSemanticObject,
            bExcludeTileInbounds,
            aPreFilteredInbounds,
            oDeferred = new jQuery.Deferred();

        if ( oConstraints ) {
            aTags = oConstraints.tags;
            bExcludeTileInbounds = oConstraints.bExcludeTileInbounds;
        }


        oCSTRUtils.whenDebugEnabled(function () {
            iLogId = ++that._iLogId;
        });

        oLogger.begin(function () {

            /*
             * This function exists because wildcards (represented with
             * undefined) break URLParsing#constructShellHash.  URLParsing
             * wants a valid semantic object/action to produce correct output.
             */
            function constructShellHashForLogging (oMaybeWildcardedHash) {

                var sActionExplicit = oMaybeWildcardedHash.action || (
                    typeof oMaybeWildcardedHash.action === "undefined"
                        ? "<any>"
                        : "<invalid-value>"
                );

                var sSemanticObjectExplicit = oMaybeWildcardedHash.semanticObject || (
                    typeof oMaybeWildcardedHash.semanticObject === "undefined"
                        ? "<any>"
                        : "<invalid-value>"
                );

                return that._getURLParsing().constructShellHash({
                    semanticObject: sSemanticObjectExplicit,
                    action: sActionExplicit,
                    params: oMaybeWildcardedHash.params
                });
            }

            var sIntent = constructShellHashForLogging(oShellHash);

            return {
                logId: iLogId,
                title: "Matching Intent '" + sIntent + "' to inbounds (form factor: " + (oShellHash.formFactor || '<any>') + ")",
                moduleName: "sap.ushell.services.ClientSideTargetResolution",
                stages: [
                    "STAGE1: Find matching inbounds",
                    "STAGE2: Resolve references",
                    "STAGE3: Rematch with references",
                    "STAGE4: Sort matched targets"
                ]
            };
        });

        sSemanticObject = oShellHash.semanticObject;
        sAction = oShellHash.action;

        // oInboundIndex.getSegment called with second argument 'sAction'
        // although it accepts only one. The test on the method in question
        // does not test calls with 2 argumens. Does this call indicate a
        // desirable we should implement?
        aInbounds = aTags ? oInboundIndex.getSegmentByTags( aTags ) : oInboundIndex.getSegment( sSemanticObject, sAction );

        /*
         * Logic that filters independently on the target to be
         * matched goes here.
         */
        if ( bExcludeTileInbounds ) {
            aPreFilteredInbounds = aInbounds.filter( function ( oInbound ) {
                // keep all non custom tiles
                return !oInbound.tileResolutionResult || !oInbound.tileResolutionResult.isCustomTile;
            } );
        } else {
            aPreFilteredInbounds = aInbounds;
        }

        // initial match
        oSearch
            .match(oShellHash, aPreFilteredInbounds, {} /* known default */, oCSTRUtils.isDebugEnabled())
            .then(function (oInitialMatchResult) {
                /*
                 * Resolve References
                 */

                oLogger.log(function () {
                    return {
                        logId: iLogId,
                        stage: 1,
                        prefix: "\u2718", // heavy black X
                        lines: Object.keys(oInitialMatchResult.noMatchReasons || {}).map(function (sInbound) {
                            return sInbound + " " + oInitialMatchResult.noMatchReasons[sInbound];
                        })
                    };
                });

                oLogger.log(function () {
                    var aLines = oInitialMatchResult.matchResults.map(function (oMatchResult) {
                        return oFormatter.formatInbound(oMatchResult.inbound);
                    });

                    return {
                        logId: iLogId,
                        stage: 1,
                        prefix: aLines.length > 0
                            ? "\u2705"  // green checkmark
                            : "\u2718", // heavy black X
                        lines: aLines.length > 0
                            ? aLines
                            : ["No inbound was matched"]
                    };
                });

                var aMissingReferences = Object.keys(oInitialMatchResult.missingReferences || []);

                // no references to resolve
                if (aMissingReferences.length === 0) {

                    oLogger.log(function () {
                        return {
                            logId: iLogId,
                            stage: 2,
                            prefix: "\u2705", // green checkmark
                            line: "No need to resolve references"
                        };
                    });

                    return new jQuery.Deferred().resolve({
                        matchResults: oInitialMatchResult.matchResults,
                        referencesToInclude: null
                    }).promise();
                }

                // must resolve references
                oLogger.log(function () {
                    return {
                        logId: iLogId,
                        stage: 2,
                        line: "@ Must resolve the following references:",
                        prefix: "\u2022", // bullet point
                        lines: aMissingReferences
                    };
                });

                var oReadyToRematchDeferred = new jQuery.Deferred();

                sap.ushell.Container.getService("ReferenceResolver")
                    .resolveReferences(aMissingReferences)
                    .done(function (oResolvedRefs) {
                        oLogger.log(function () {
                            return {
                                logId: iLogId,
                                stage: 2,
                                line: "\u2705 resolved references with the following values:",
                                prefix: "\u2022", // bullet point
                                lines: Object.keys(oResolvedRefs).map(function (sRefName) {
                                    return sRefName + ": '" + oResolvedRefs[sRefName] + "'";
                                })
                            };
                        });
                        oReadyToRematchDeferred.resolve({
                            matchResults: oInitialMatchResult.matchResults,
                            referencesToInclude: oResolvedRefs
                        });
                    })
                    .fail(function (sError) {
                        oLogger.log(function () {
                            return {
                                logId: iLogId,
                                stage: 2,
                                prefix: "\u274c", // red X
                                line: "Failed to resolve references: " + sError
                            };
                        });

                        // don't continue processing, just exit with an empty
                        // result set.
                        oDeferred.resolve([]);
                    });

                return oReadyToRematchDeferred.promise();
            })
            .then(function (oInitialMatchWithReferencesResult) {
                /*
                 * Re-match with resolved references
                 */
                var aMatchingInbounds,
                    aMatchResults,
                    oReferences = oInitialMatchWithReferencesResult.referencesToInclude;

                if (!oReferences) {
                    oLogger.log(function () {
                        return {
                            logId: iLogId,
                            stage: 3,
                            line: "rematch was skipped (no references to resolve)",
                            prefix: "\u2705" // green checkmark
                        };
                    });
                    // no references, skip re-match
                    return new jQuery.Deferred().resolve(oInitialMatchWithReferencesResult).promise();
                }

                // rematch using the set of the already matched inbounds
                aMatchResults = oInitialMatchWithReferencesResult.matchResults;
                aMatchingInbounds = aMatchResults.map(function (oMatchResult) {
                    return oMatchResult.inbound;
                });

                return oSearch.match(oShellHash, aMatchingInbounds, oReferences, 0 /* iDebugLevel */).then(function (oFinalMatchResult) {
                    oLogger.log(function () {
                        var aMatchResults = oFinalMatchResult.matchResults || [];
                        if (aMatchResults.length >= 1) {
                            return {
                                logId: iLogId,
                                stage: 3,
                                line: "The following inbounds re-matched:",
                                lines: aMatchResults.map(function (oMatchResult) {
                                    return oFormatter.formatInbound(oMatchResult.inbound);
                                }),
                                prefix: "\u2705" // green checkmark
                            };
                        }

                        return {
                            logId: iLogId,
                            stage: 3,
                            line: "No inbounds re-matched",
                            prefix: "-"
                        };
                    });

                    return oFinalMatchResult;
                });
            })
            .then(function (oFinalMatchResult) {
                /*
                 * Sorting
                 */

                var aMatchResultsToSort = oFinalMatchResult.matchResults || [];


                if (aMatchResultsToSort.length <= 1) {
                    oLogger.log(function () {
                        return {
                            logId: iLogId,
                            stage: 4,
                            line: "Nothing to sort"
                        };
                    });

                    oDeferred.resolve(aMatchResultsToSort);
                    return;
                }

                var aSortedMatchResults = oSearch.sortMatchingResultsDeterministic(oFinalMatchResult.matchResults || []);

                oLogger.log(function () {

                    var aLines = aSortedMatchResults.map(function (oMatchResult) {
                        return oFormatter.formatInbound(oMatchResult.inbound || {}) +
                            (oMatchResult.matchesVirtualInbound ? " (virtual)" : "")
                            + "\n[ Sort Criteria ] "
                            + "\n * 1 * sap-priority: '" + oMatchResult["sap-priority"] + "'"
                            + "\n * 2 * Sort string: '" + oMatchResult.priorityString
                            + "\n * 3 * Deterministic blob: '" + oSearch.serializeMatchingResult(oMatchResult) + "'";
                    });

                    return {
                        logId: iLogId,
                        stage: 4,
                        line: "Sorted inbounds as follows:",
                        lines: aLines,
                        prefix: ".",
                        number: true
                    };
                });

                oDeferred.resolve(aSortedMatchResults);

            });

        return oDeferred.promise().then(function (aMatchResults) {
            // output logs before returning

            oLogger.end(function () {
                return { logId: iLogId };
            });

            return aMatchResults;
        });
    };

    /**
     *
     * Determines whether a single intent matches one or more navigation
     * targets.
     *
     * @param {string} sIntent
     *    the intent to be matched
     * @param {object} oInboundIndex
     *    the index of the inbounds to be matched
     *
     * @returns {jQuery.Deferred.promise}
     *    a promise that is resolved with a boolean if the intent is
     *    supported and rejected if not. The promise resolves to true
     *    if only one target matches the intent, and false if multiple
     *    targets match the intent.
     *
     * @private
     * @since 1.32.0
     */
    ClientSideTargetResolution.prototype._isIntentSupportedOne = function (sIntent, oInboundIndex) {
        var oDeferred = new jQuery.Deferred(),
            oShellHash = this._getURLParsing().parseShellHash(sIntent);
        // navigation to '#' is always considered possible
        if (sIntent === "#") {
            oDeferred.resolve(true);
            return oDeferred.promise();
        }
        if (oShellHash === undefined) {
            return oDeferred.reject("Could not parse shell hash '" + sIntent + "'").promise();
        }

        oShellHash.formFactor = oUtils.getFormFactor();

        this._getMatchingInbounds( oShellHash, oInboundIndex, { bExcludeTileInbounds: true } )
            .done(function (aTargets) {
                oDeferred.resolve(aTargets.length > 0);
            })
            .fail(function () {
                oDeferred.reject();
            });

        return oDeferred.promise();
    };

    /**
     * Tells whether the given intent(s) are supported, taking into account
     * the form factor of the current device. "Supported" means that
     * navigation to the intent is possible.
     *
     * @param {array} aIntents
     *   The intents (such as <code>"#AnObject-Action?A=B&C=e&C=j"</code>) to be checked
     *
     * @returns {object}
     *   A <code>jQuery.Deferred</code> object's promise which is resolved with a map
     *   containing the intents from <code>aIntents</code> as keys. The map values are
     *   objects with a property <code>supported</code> of type <code>boolean</code>.<br/>
     *   Example:
     * <pre>
     * {
     *   "#AnObject-Action?A=B&C=e&C=j": { supported: false },
     *   "#AnotherObject-Action2": { supported: true }
     * }
     * </pre>
     *
     * @private
     * @since 1.32.0
     */
    ClientSideTargetResolution.prototype.isIntentSupported = function (aIntents) {
        var that = this,
            oDeferred = new jQuery.Deferred();

        this._oInboundProvider.getInbounds().then(
            function (oInboundIndex) {
                that._isIntentSupported(aIntents, oInboundIndex)
                    .done(oDeferred.resolve.bind(oDeferred))
                    .fail(oDeferred.reject.bind(oDeferred));
            },
            function () {
                oDeferred.reject.apply(oDeferred, arguments);
            });

        return oDeferred.promise();
    };

    ClientSideTargetResolution.prototype._isIntentSupported = function (aIntents, oInboundIndex) {
        var that = this,
            oDeferred = new jQuery.Deferred(),
            mSupportedByIntent = {};

        oDeferred.resolve();

        /*
         * Sets the result for the given intent as indicated.
         * @params {string} sIntent
         * @params {boolean} bSupported
         */
        function setResult (sIntent, bSupported) {
            mSupportedByIntent[sIntent] = {
                supported: bSupported
            };
        }

        var aRejectErrors = [];

        aIntents.forEach(function (sIntent) {
            var oNextPromise = that._isIntentSupportedOne(sIntent, oInboundIndex);
            oNextPromise.fail(function (sErrorMessage) {
                aRejectErrors.push(sErrorMessage);
            });
            oNextPromise.done(function (bResult) {
                setResult(sIntent, bResult);
            });
            oDeferred = jQuery.when(oDeferred, oNextPromise);
        });

        var oRes = new jQuery.Deferred();
        oDeferred.done(function () {
            oRes.resolve(mSupportedByIntent);
        }).fail(function () {
            oRes.reject("One or more input intents contain errors: " + aRejectErrors.join(", "));
        });

        return oRes.promise();
    };

    /**
     * Finds and returns all unique user default parameter names referenced
     * in inbounds.
     *
     * @returns {jQuery.Deferred.promise}
     *    <p>A promise that resolves to an object with the following structure <code>
     *    {
     *        simple: {
     *           parameternamextractUserDefaultReferenceNamee1 : {},
     *           parametername2 : {}
     *        }
     *        extended: {
     *           parametername3: {},
     *           parametername4: {}
     *        }
     *    }
     *    </code>
     *    The name of a user default parameter referenced in an inbound.
     *    </p>
     *    <p>
     *    NOTE: the parameter names do not include surrounding special
     *    syntax. Only the inner part is returned. For example:
     *    <pre>
     *    "UserDefault.ParameterName" is returned as "ParameterName"
     *    </pre>
     *    </p>
     *
     * Signature changed in 1.34!
     *
     * @private
     * @since 1.32.0
     */
    ClientSideTargetResolution.prototype.getUserDefaultParameterNames = function () {
        // the empty objects may in future bear information like sap-system relevance
        var that = this,
            oDeferred = new jQuery.Deferred();

        this._oInboundProvider.getInbounds().then(
            function (oInboundIndex) {
                var oRes;
                try {
                    oRes = that._getUserDefaultParameterNames(oInboundIndex.getAllInbounds());
                    oDeferred.resolve(oRes);
                } catch (e) {
                    oDeferred.reject("Cannot get user default parameters from inbounds: " + e);
                }
            },
            function () {
                oDeferred.reject.apply(oDeferred, arguments);
            }
        );

        return oDeferred.promise();
    };

    ClientSideTargetResolution.prototype._getUserDefaultParameterNames = function (aInbounds) {
        var oRefs = {
            simple: {},
            extended: {}
        };

        aInbounds.forEach(function (oTm) {
            var oSignatureParams = oTm.signature && oTm.signature.parameters || [];

            Object.keys(oSignatureParams).forEach(function (sParamName) {
                var oParam = oSignatureParams[sParamName],
                    sRefName,
                    sExtendedRefName,
                    sReferenceParamName,
                    oRefResolverSrvc;

                if (oParam) {
                    // first try to get the user default value from the filter

                    if (oParam.filter && oParam.filter.format === "reference") {
                        sReferenceParamName = oParam.filter.value;

                    } else if (oParam.defaultValue && oParam.defaultValue.format === "reference") {
                        sReferenceParamName = oParam.defaultValue.value;
                    }

                    if (typeof sReferenceParamName === "string") {
                        oRefResolverSrvc = sap.ushell.Container.getService("ReferenceResolver");
                        // only extract user defaults
                        sRefName = oRefResolverSrvc.extractUserDefaultReferenceName(sReferenceParamName);
                        if (typeof sRefName === "string") {
                            oRefs.simple[sRefName] = {};
                        }
                        sExtendedRefName = oRefResolverSrvc.extractExtendedUserDefaultReferenceName(sReferenceParamName);
                        if (typeof sExtendedRefName === "string") {
                            oRefs.extended[sExtendedRefName] = {};
                        }
                    }
                }
            });
        });

        return oRefs;
    };

    /**
     * Returns the list of easy access systems provided via specific inbounds.
     *
     * <p>The admin can define one or more of <code>Shell-start*</code> inbounds.
     * In case multiple <code>Shell-start*</code> inbounds are defined with
     * the same system alias, the title will be chosen from the inbound with
     * the most priority, which is as follows:
     * <ol>
     * <li>Shell-startGUI</li>
     * <li>Shell-startWDA</li>
     * <li>Shell-startURL</li>
     * </ol>
     *
     * @param {string} [sMenuType="sapMenu"]
     *   The type of menu to return the entries for. This can be one of
     *   "userMenu" or "sapMenu". If this parameter is not specified, just
     *   the entries for the sap menu will be returned for the sap menu are
     *   returned.
     *
     * @returns {jQuery.Deferred.promise}
     *   Returns a promise that resolves with an object containing the systems:
     * <pre>
     *   {
     *       <system alias {string}>: {
     *           text: <text to be displayed in the system list {string}>
     *       }
     *   }
     * </pre>
     *
     * Example
     * <pre>
     * {
     *     AB1CLNT000: {
     *        text: "CRM Europe",
     *        appType: {
     *           WDA: true,
     *           GUI: true,
     *           URL: true
     *        }
     *     }
     * }
     * </pre>
     *
     * @private
     * @since 1.38.0
     */
    ClientSideTargetResolution.prototype.getEasyAccessSystems = function (sMenuType) {
        var oResultEasyAccessSystemSet = {}, // see @returns example in JSDOC
            oActionDefinitions,
            oValidMenuTypeActions,
            oDeferred;

        // default
        sMenuType = sMenuType || "sapMenu";

        if (this._oHaveEasyAccessSystemsDeferreds[sMenuType]) {
            return this._oHaveEasyAccessSystemsDeferreds[sMenuType].promise();
        }
        this._oHaveEasyAccessSystemsDeferreds[sMenuType] = new jQuery.Deferred();
        oDeferred = this._oHaveEasyAccessSystemsDeferreds[sMenuType]; // shorter name

        function isValidEasyAccessMenuInbound (oInbound, sCurrentFormFactor, oValidMenuTypeActions) {
            return oInbound && oInbound.semanticObject && oInbound.semanticObject === "Shell" && oInbound.action && oValidMenuTypeActions[sMenuType][oInbound.action] && oInbound.deviceTypes && sCurrentFormFactor !== undefined && oInbound.deviceTypes[sCurrentFormFactor];
        }

        oActionDefinitions = {
            startGUI: {
                priority: 3, // startGUI titles are preferred over WDA and URL
                appType: "TR"
            },
            startWDA: {
                priority: 2, // preferred over URL
                appType: "WDA"
            },
            startURL: {
                priority: 1,
                appType: "URL"
            }
        };

        oValidMenuTypeActions = {
            userMenu: {
                startGUI: true,
                startWDA: true,
                startURL: true // NOTE: startURL should only appear in the user menu
            },
            sapMenu: {
                startGUI: true,
                startWDA: true,
                startURL: false
            }
        };

        this._oInboundProvider.getInbounds().then(function (oInboundIndex) { // all inbounds, no segments
            var oLastPriorityPerSystem = {};

            oInboundIndex.getAllInbounds().filter(function (oInbound) {
                return isValidEasyAccessMenuInbound(
                    oInbound, oUtils.getFormFactor(), oValidMenuTypeActions
                );
            }).forEach(function (oEasyAccessInbound) {
                // extract the data for the easy access system list
                var sSystemAliasName;
                if (jQuery.isPlainObject(oEasyAccessInbound.signature.parameters["sap-system"]) &&
                    oEasyAccessInbound.signature.parameters["sap-system"].hasOwnProperty("filter")) {

                    sSystemAliasName = jQuery.sap.getObject("signature.parameters.sap-system.filter.value", undefined, oEasyAccessInbound);
                }

                if (typeof sSystemAliasName === "string") {
                    /*
                     * Code below builds the set of easy access system that
                     * should be displayed in the sapMenu/userMenu.  In
                     * case multiple inbounds exist with a certain system,
                     * the app type with the highest priority is used to
                     * choose the title (see oActionDefinitions above).
                     * Note that other app types should still appear in the
                     * result set (see 'appType' in the example result from
                     * jsdoc).
                     */
                    var iCurrentActionPriority = oActionDefinitions[oEasyAccessInbound.action].priority;
                    var sCurrentActionAppType = oActionDefinitions[oEasyAccessInbound.action].appType;

                    if (!oResultEasyAccessSystemSet[sSystemAliasName]) {
                        // provide base structure...
                        oLastPriorityPerSystem[sSystemAliasName] = -1;
                        oResultEasyAccessSystemSet[sSystemAliasName] = {
                            appType: {}
                        };
                    }

                    if (oLastPriorityPerSystem[sSystemAliasName] < iCurrentActionPriority) {
                        // ...then populate in case
                        oResultEasyAccessSystemSet[sSystemAliasName].text = oEasyAccessInbound.title;
                        oLastPriorityPerSystem[sSystemAliasName] = iCurrentActionPriority;
                    }

                    // keep track of all the app types
                    oResultEasyAccessSystemSet[sSystemAliasName].appType[sCurrentActionAppType] = true;

                } else {

                    jQuery.sap.log.warning(
                        "Cannot extract sap-system from easy access menu inbound: " + oFormatter.formatInbound(oEasyAccessInbound),
                        "This parameter is supposed to be a string. Got '" + sSystemAliasName + "' instead.",
                        "sap.ushell.services.ClientSideTargetResolution"
                    );
                }
            });

            oDeferred.resolve(oResultEasyAccessSystemSet);

        }, function () {

            oDeferred.reject.apply(oDeferred, arguments);
        });

        return oDeferred.promise();
    };

    /**
     * Logs system alias validation errors on the console.
     *
     * @param {object} oValidation
     *    Validation data generated via <code>#_validateResolvedSystemAlias</code>
     *
     * @private
     */
    ClientSideTargetResolution.prototype._reportResolvedSystemAliasValidationErrors = function (oValidation) {
        jQuery.sap.log.error(
            "Invalid system alias definition: " + oValidation.debug,
            "ERRORS:" + oValidation.errors.map(function (sError) {
                return "\n - " + sError;
            }).join(""),
            "sap.ushell.services.ClientSideTargetResolution"
        );
    };

    /**
     * Validates a resolved system alias.
     *
     * @param {object} oResolvedSystemAlias
     *    A system alias resolved by the adapter. An object like:
     *    <pre>
     *        "http": {
     *            "id": "ALIAS111",
     *            "host": "vmw.example.corp.com",
     *            "port": 44335,
     *            "pathPrefix": "/go-to/the/moon"
     *        },
     *        "https": {
     *            "id": "ALIAS111_HTTPS",
     *            "host": "vmw.example.corp.com",
     *            "port": 44335,
     *            "pathPrefix": "/go-to/the/moon"
     *        },
     *        "rfc": {
     *            "id": "",
     *            "systemId": "",
     *            "host": "",
     *            "service": 32,
     *            "loginGroup": "",
     *            "sncNameR3": "",
     *            "sncQoPR3": ""
     *        },
     *        "id": "ALIAS111",
     *        "client": "111",
     *        "language": ""
     *    </pre>
     *
     * @returns {object}
     *    An object describing whether the system alias is valid or not. It's an object structured like:
     *    <pre>
     *    {
     *      isValid: false,
     *      errors: "error message",   // only provided when invalid
     *      debug: "..." // printable string representing the system alias that was checked
     *    }
     *    </pre>
     *
     * @private
     */
    ClientSideTargetResolution.prototype._validateResolvedSystemAlias = function (oResolvedSystemAlias) {
        function validateWebProtocolField (oField) {
            var aErrors = [];

            if (typeof oField.host !== "string") {
                aErrors.push("host field must be a string");
            }
            if (typeof oField.port !== "number" && typeof oField.port !== "string") {
                aErrors.push("port field must be a number or a string");
            }
            if (typeof oField.pathPrefix !== "string") {
                aErrors.push("pathPrefix field must be a string");
            }

            return aErrors;
        }

        var aErrors = [],
            bHasHttpsField = oResolvedSystemAlias.hasOwnProperty("https"),
            bHasHttpField = oResolvedSystemAlias.hasOwnProperty("http");

        // A correct system alias must have one of http/https defined
        if (!bHasHttpField && !bHasHttpsField) {
            aErrors.push("at least one of 'http' or 'https' fields must be defined");
        }


        if (bHasHttpsField) {
            validateWebProtocolField(oResolvedSystemAlias.https).forEach(function (sError) {
                aErrors.push("https>" + sError);
            });
        }
        if (bHasHttpField) {
            validateWebProtocolField(oResolvedSystemAlias.http).forEach(function (sError) {
                aErrors.push("http>" + sError);
            });
        }

        if (aErrors.length > 0) {
            return {
                isValid: false,
                errors: aErrors,
                debug: JSON.stringify(oResolvedSystemAlias, null, 3)
            };
        }

        return { isValid: true };
    };

    ClientSideTargetResolution.hasNoAdapter = false;
    return ClientSideTargetResolution;

}, true /* bExport */ );
