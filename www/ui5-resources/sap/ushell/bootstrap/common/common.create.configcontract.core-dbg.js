/*
 * This module provides with a factory to define the configuration for the FLP
 * core component.
 */
sap.ui.define([
],
function () {
    "use strict";

    function fnCreateConfigContract (oMergedSapUshellConfig) {
        function getConfigValue (sPath, oDefaultValue) {
            var aPathParts = sPath.split("/");
            var sLastPart = aPathParts.pop();
            var oDeepObject = aPathParts.reduce(function (oObject, sPathPart) {
                if (!oObject || !oObject.hasOwnProperty(sPathPart)) {
                    return {};
                }
                return oObject[sPathPart];
            }, oMergedSapUshellConfig);

            return oDeepObject[sLastPart] !== undefined ? oDeepObject[sLastPart] : oDefaultValue;
        }

        /*
         * Contract of configuration defines *FLP* features and points to
         * the owner component of a feature. Each flag it must be expressed
         * with the following path prefix.
         *
         * "/<owner component short name>/<functionality>/<feature>"
         */
        var oConfigDefinition = {
            core: {  // the unified shell core
                extension: {
                    EndUserFeedback: getConfigValue("services/EndUserFeedback/config/enabled", true),
                    SupportTicket: getConfigValue("services/SupportTicket/config/enabled", false)
                },
                navigation: {
                    enableInPlaceForClassicUIs: {
                        GUI: getConfigValue("services/ClientSideTargetResolution/config/enableInPlaceForClassicUIs/GUI", false),
                        WDA: getConfigValue("services/ClientSideTargetResolution/config/enableInPlaceForClassicUIs/WDA", false),
                        WCF: getConfigValue("services/ClientSideTargetResolution/config/enableInPlaceForClassicUIs/WCF", true)
                    }
                }
            }
        };

        return oConfigDefinition;
    }

    return fnCreateConfigContract;
}, false);
