/*
 * This module provides the task to be executed after the UI5 library has loaded.
 */
sap.ui.define(["./common.constants", "../common/common.configure.ui5language", "../common/common.configure.ui5theme", "../common/common.configure.ui5datetimeformat", "../common/common.configure.xhrlogon", "../common/common.load.ui5theme", "../common/common.load.xhrlogon", "sap/base/util/UriParameters", "sap/base/util/getObject", "sap/ushell/services/Container"], function (oConstants, fnConfigureUI5Language, fnConfigureUI5Theme, fnConfigureUI5DateTimeFormat, fnConfigureXhrLogon, fnLoadUI5Theme, oXhrLogonLib, UriParameters, fnGetObject, Container) {
    "use strict";

    return bootTask;

    /**
     * This function should be called after the UI5 library has loaded.
     *
     * @param {string} sUshellBootstrapPlatform The current platform (could be CDM for instance).
     * @param {function} fnContinueUI5Boot The function to execute to continue booting the UI5 framework.
     *
     * @returns {Promise|jQuery.Deferred} A promise to exectute the boot task.
     *
     * @private
     */
    function bootTask (sUshellBootstrapPlatform, fnContinueUI5Boot) {
        var oConfiguredTheme,
            oUshellConfig = window[oConstants.ushellConfigNamespace];

        // We need to set the langauge first in order to evaluate it when
        // setting the theme as we need to identify the RTL relvevant langauges then
        // Therefore the following sequence needs to be kept.
        fnConfigureUI5Language(oUshellConfig);
        fnConfigureUI5Theme(oUshellConfig);
        fnConfigureUI5DateTimeFormat(oUshellConfig);

        if ((new UriParameters(window.location.href)).get("sap-ushell-cdm-loadFioriTheme") === true) {
            oConfiguredTheme = fnGetObject('services.Container.adapter.config.userProfile.defaults.bootTheme', NaN, oUshellConfig);
            fnLoadUI5Theme(oConfiguredTheme);
        }

        window.sap.ushell.bootstrap(sUshellBootstrapPlatform)
            .then(function () { // make sap.ushell.Container available
                fnConfigureXhrLogon(sap.ushell.Container, oXhrLogonLib);
            })
            .then(fnContinueUI5Boot);
    }
});
