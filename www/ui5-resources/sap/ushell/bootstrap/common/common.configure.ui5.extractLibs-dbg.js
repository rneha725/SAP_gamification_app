sap.ui.define([
    "jquery.sap.global"
], function (jQuery) {
    "use strict";

    /**
     * Given the shell configuration, it reads library dependencies that are
     * unsually required to load the launchpad. A prominent case the
     * `sap.ushell_abap` library which the CDM platform still has a dependency
     * to.
     *
     * @param {object} oUShellConfig The ushell configuration.
     *
     * @returns {Array} A list of additionally required libraries to load.
     *
     * @private
     */
    return function readRequiredLibsFromConfig(oUShellConfig) {

        if (!oUShellConfig || !oUShellConfig.ui5 || !oUShellConfig.ui5.libs) {
            return [];
        }

        if (!jQuery.isPlainObject(oUShellConfig.ui5.libs)) {
            jQuery.sap.log.error("Invalid ushell configuration: /ui5/libs must be an object");
            return [];
        }

        return Object
            .keys(oUShellConfig.ui5.libs)
            .filter(function (sKey) {
                return this[sKey];
            }, oUShellConfig.ui5.libs);
    };
});