sap.ui.define([
    "jquery.sap.global",
    "sap/ushell/bootstrap/common/common.util"
], function (jQuery, oUtils) {
    "use strict";

    return configureXhrLogon;

    /**
     * Creates a logger for XMLHttpRequest(s) that logs errors, warnings, info
     * and debug messages via jQuery.sap.log.
     *
     * @return {object}
     *    A logger that can be assigned to XMLHttpRequest.
     *
     * @private
     */
    function createUi5ConnectedXhrLogger() {
        return ["error", "warning", "info", "debug"].reduce(function (oXhrLogger, sLevel) {
            oXhrLogger[sLevel] = function (sMsg) {
                return jQuery.sap.log[sLevel](sMsg);
            };
            return oXhrLogger;
        }, {});
    }

    /**
     * Makes a given base frame logon manager compatible with the one expected
     * by the shell container. This is necessary because the XHR library we use
     * on the CDM platform has functional gaps with the one we use on the ABAP
     * platform.
     *
     * @param {object} oBaseFrameLogonManager
     *   A frame logon manager to be amended
     *
     * @return {object}
     *   The amended logon manager. Note, since this method modifies
     *   <code>oBaseFrameLogonManager</code> inplace, one can also avoid
     *   consuming the returned result when calling this method.
     *
     * @private
     */
    function makeLogonManagerCompatibleWithUshellContainer(oBaseFrameLogonManager) {
        oBaseFrameLogonManager.setLogonFrameProvider = function (oLogonFrameProvider) {
            oBaseFrameLogonManager.logonFrameProvider = oLogonFrameProvider;
        };

        if (!oBaseFrameLogonManager.setTimeout) {
            oBaseFrameLogonManager.setTimeout = function () {
                // FLP does not crash at least
            };
        }

        return oBaseFrameLogonManager;
    }

    /**
     * Initializes the ignore list of the XHR logon manager.
     * <p>
     * If the UI5 resources (including the own bootstrap script) are loaded from an absolute URL
     * (in case CDN is activated),
     * this URL is added to the ignore list to prevent CORS preflight requests due to the X headers.
     * We expect that all resources can be loaded without authentication in this case.
     *
     * @param {string} sUi5ResourceRootUrl
     *     the root URL for loading SAPUI5 resources
     * @param {object} oLocalFrameLogonManager
     *     the logon frame manager instance to use
     *
     * @private
     */
    function initXhrLogonIgnoreList (sUi5ResourceRootUrl, oLocalFrameLogonManager) {
        var oLocalLogonManager = oLocalFrameLogonManager.logonManager,
            sOrigin = oUtils.getLocationOrigin();

        // add "/" to origin, as otherwise the following use case will match:
        //      sUi5ResourceRootUrl: http://sap.com:123
        //      sOrigin:             http://sap.com
        if (sUi5ResourceRootUrl && sUi5ResourceRootUrl.indexOf(sOrigin + "/") === -1) {
            // In case UI5 is loaded from a different domain (CDN / AKAMAI), that URL
            // needs to be ignored for the XHR logon, as we expect that the resources
            // are not protected.
            if (!oLocalLogonManager.ignore) {
                oLocalLogonManager.createIgnoreList();
            }
            oLocalLogonManager.ignore.add(sUi5ResourceRootUrl);
        }
    }

    /**
     * Enables the handling of the XHR Logon in the FLP.
     * Note: using jQuery.sap.getModulePath for initXhrLogonIgnoreList as it
     * will be loaded in CDM (compare to ABAP, where this is not the case)
     *
     * @param {object} oSapUshellContainer
     *    The active <code>sap.ushell.Container</code> instance to configure
     *    the logon manager into.
     *
     * @param {object} oXhrLogonLib XHR logon lib.
     *
     * @private
     */
    function configureXhrLogon (oSapUshellContainer, oXhrLogonLib) {
        var oFrameLogonManager = oXhrLogonLib.FrameLogonManager.startup();

        initXhrLogonIgnoreList(jQuery.sap.getModulePath(""), oFrameLogonManager);

        var oCompatibleFrameLogonManager
            = makeLogonManagerCompatibleWithUshellContainer(oFrameLogonManager);

        // configure logger
        XMLHttpRequest.logger = createUi5ConnectedXhrLogger();

        oSapUshellContainer.oFrameLogonManager = oCompatibleFrameLogonManager;

    }
});
