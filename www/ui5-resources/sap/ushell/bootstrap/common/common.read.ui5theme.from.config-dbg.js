sap.ui.define([
    "jquery.sap.global"
], function(jQuery) {
    "use strict";

    return getValidTheme;

    function extractThemeDataFromConfig(oUshellConfig) {
        var oContainerAdapterConfig = jQuery.sap.getObject('services.Container.adapter.config', NaN, oUshellConfig);
        return {
            sDefaultTheme : jQuery.sap.getObject('userProfile.defaults.theme', NaN, oContainerAdapterConfig),
            sPersonalizedTheme : jQuery.sap.getObject('userProfilePersonalization.theme', NaN, oContainerAdapterConfig),
            oRangeTheme : jQuery.sap.getObject('userProfile.metadata.ranges.theme', NaN, oContainerAdapterConfig)
        };
    }

    function getValidTheme(oUshellConfig) {
        var oThemeData = extractThemeDataFromConfig(oUshellConfig),
            sPersonalizedTheme = oThemeData.sPersonalizedTheme,
            oRangeTheme = oThemeData.oRangeTheme,
            sDefaultTheme = oThemeData.sDefaultTheme;

        if (oThemeData.oRangeTheme) {
            // Range of themes contains boot theme
            if (Object.keys(oRangeTheme).indexOf(sPersonalizedTheme) > -1) {
                var oPersonalizedTheme = oRangeTheme[sPersonalizedTheme] || {};
                return { theme: sPersonalizedTheme, root: oPersonalizedTheme.themeRoot };
            } else {
                // return DefaultTheme
                var oDefaultTheme = oRangeTheme[sDefaultTheme] || {};
                return {
                    theme: sDefaultTheme,
                    root: oDefaultTheme.themeRoot
                };
            }
        } else {
            // stay compatible
            var sAppliedTheme = sPersonalizedTheme || sDefaultTheme;
            return {
                theme: sAppliedTheme, root: ""
            };
        }
    }
});