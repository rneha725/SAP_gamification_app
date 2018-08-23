sap.ui.define([
    // ui5 modules
    "jquery.sap.global",
    // own modules
    "./common.read.ui5theme.from.config"
], function (jQuery, getUi5Theme) {
    "use strict";

    function setThemesInUserInfoAdapter(oUshellConfig) {
        var oThemeRange = jQuery.sap.getObject('services.Container.adapter.config.userProfile.metadata.ranges.theme', NaN, oUshellConfig);
        if (!oThemeRange) {
            return;
        }
        // creates path
        jQuery.sap.getObject('services.UserInfo.adapter.config.themes', 0, oUshellConfig);

        oUshellConfig.services.UserInfo.adapter.config.themes = Object.keys(oThemeRange).map(function (key) {
            return {
                "id": key,
                "name": oThemeRange[key].displayName,
                "root": oThemeRange[key].themeRoot
            };
        });
    }

    /**
     * Configures UI5 theme based on the shell configuration.
     *
     * @param {object} oUshellConfig The ushell configuration.
     *
     * @private
     */
    function configureUi5Theme(oUshellConfig) {

        var oContainerAdapterConfig = jQuery.sap.getObject('services.Container.adapter.config', NaN, oUshellConfig),
            oValidTheme = getUi5Theme(oUshellConfig);

        setThemesInUserInfoAdapter(oUshellConfig);


        // does personalized or standard theme exists
        if (oValidTheme.theme) {
            oContainerAdapterConfig.userProfile.defaults.bootTheme = oValidTheme;
        } else {
            var sDefaultTheme = jQuery.sap.getObject('userProfile.defaults.theme', NaN, oContainerAdapterConfig),
                sPersonalizedTheme = jQuery.sap.getObject('userProfilePersonalization.theme', NaN, oContainerAdapterConfig);
            jQuery.sap.log.error("No valid boot theme could be determined: personalizedTheme = '" + sPersonalizedTheme +
                "' default theme = '" + sDefaultTheme + "'", null,
                "common.configure.ui5theme"
            );
        }
    }

    return configureUi5Theme;
});
