// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview This file contains miscellaneous utility functions.
 */
/* global jQuery, OData, sap */
sap.ui.define(["sap/ushell/components/tiles/utilsRT", "sap/ushell/resources"], function (utilsRT, resources) {
    "use strict";


/* eslint-disable no-undef */



// var oTilesResourceBundle;

// /**
// * Converts parameters formatted in a query string into an array of name value pairs.
// *
// * @param {string} sQueryString
// * the query string (without leading '?') as coming from the launchpad; it must at least
// * contain one parameter
// * @returns {[object]}
// * the parameters as array of object with <code>name</code> and <code>value</code>
// */
// function stringToNameValuePairs(sQueryString) {
// var aNameValuePairs = sQueryString.replace(/\+/g, ' ').split("&"),
// aPair,
// i,
// aResult = [];
//
// for (i = 0; i < aNameValuePairs.length; i += 1) {
// aPair = aNameValuePairs[i].split("=");
// aResult.push({
// name: decodeURIComponent(aPair.shift()),
// value: decodeURIComponent(aPair.join("="))
// });
// }
// return aResult;
// }

    var oUtils = {};
    // "public static methods" **************************************************
    /**
     * Checks whether the translated chip title is in initial state.
     *
     * @param {string} sTitle The chip title.
     * @returns {boolean} True, if the title is in initial state.
     */
    oUtils.isInitial = function (sTitle) {
        return sTitle === "App Launcher – Static" || sTitle === "App Launcher – Dynamic" || sTitle === "Target Mapping";
    };

    /**
     * Get shared resource bundle model for applauncher and action tiles.
     *
     * @returns {sap.ui.model.resource.ResourceModel} Shared resource bundle model for applauncher and action tiles.
     */
    oUtils.getResourceBundleModel = function () {
            return resources.i18nModel;
    };



    // Create a row template for adding new empty row to the params table (mapping signature)
    oUtils.getEmptyRowObj = function (bEdit) {
        return {
            name: "",
            mandatory: false,
            value: "",
            isRegularExpression: false,
            defaultValue: "",
            valEnabled: false || !bEdit,
            defValEnabled: true,
            editable: bEdit
        };

    };

    // Create a row template for adding new empty row to the Tile Actions table
    oUtils.getEmptyTileActionsRowObj = function (bEdit) {
        var oResourceBundle = oUtils.getResourceBundleModel().getResourceBundle();
        return {
            menu_title: "",
            target_type: oResourceBundle.getText("configuration.tile_actions.table.target_type.url"),
            navigation_target: "",
            action: "",
            icon: "",
            isTargetTypeIntent: false,
            editable: bEdit
        };

    };

    /**
     * This function will be called during init operation Returns tile navigation actions array for design time. Returns empty row if there are not
     * navigation actions maintained.
     *
     * @param {object} oTileApi The instance-specific chip API.
     * @returns {array} atileActionsRows Returns tile navigation actions array. Example: [{action: "" icon: "sap-icon://Fiori2/F0101"
     *          isTargetTypeIntent: false menu_title: "action1" navigation_target: "http://google.co.in" target_type: "URL"} {action: "action" icon:
     *          "sap-icon://Fiori2/F0212" isTargetTypeIntent: true menu_title: "action2" navigation_target: "AccessControlRole" target_type:
     *          "Intent"}] Empty row Example: [{menu_title: "" , target_type: "URL", navigation_target: "", action: "", icon: "", isTargetTypeIntent:
     *          false}]
     */
    oUtils.getTileNavigationActionsRows = function (oTileApi, bEdit) {
        var atileActionsRows = [], aTileNavigationActions = [];

        aTileNavigationActions = this.getTileNavigationActions(oTileApi);
        if (aTileNavigationActions.length) {
            for (var i = 0; i < aTileNavigationActions.length; i++) {
                atileActionsRows.push(tileAction2TileActionsRow(aTileNavigationActions[i], bEdit));
            }
        } else {
            atileActionsRows = [
                this.getEmptyTileActionsRowObj(bEdit)
            ];
        }

        return atileActionsRows;
    };

    /**
     * This function will be called by runtime Returns tile navigation actions array
     *
     * @param {object} oTileApi The instance-specific chip API.
     * @returns {array} aTileNavigationActions Returns tile navigation actions array. Actions title text will be translated text Example: [{icon:
     *          "sap-icon://Fiori2/F0211", targetURL: "https://www.google.co.in", text: "action1"}, {icon: "sap-icon://Fiori2/F0210", targetURL:
     *          "#AccessControlRole-action", text: "action2"}]
     */
    oUtils.getTileNavigationActions = function (oTileApi) {
        var aTileNavigationActions = [], sTileActionTitle = '';
        var bag = oTileApi.bag.getBag('tileNavigationActions');
        if (bag.getPropertyNames().indexOf('tile_navigation_actions') >= 0) {
            aTileNavigationActions = JSON.parse(bag.getProperty('tile_navigation_actions')); // Bag will return tile navigation actions as a
            // string.JSON.parse will parse the string to an array
            for (var i = 0; i < aTileNavigationActions.length; i++) {
                if (aTileNavigationActions[i].text) {
                    if (bag.getTextNames().indexOf('action_tile_' + (i + 1)) >= 0) {
                        sTileActionTitle = bag.getText('action_tile_' + (i + 1)); // Get translated action title text from bag
                    }
                    aTileNavigationActions[i].text = sTileActionTitle; // Update the action title text with the translated text fetched from bag
                }
            }
        }

        return aTileNavigationActions;
    };

    /**
     * Retruns tile actions table row object
     *
     * @param {object} oTileActionsRow Tile Navigation Actions row object
     * @returns {object} tileActionsRowObject Returns tile navigation actions row object Example: {action: "" icon: "sap-icon://Fiori2/F0101"
     *          isTargetTypeIntent: false menu_title: "action1" navigation_target: "http://google.co.in" target_type: "URL"}
     */
    var tileAction2TileActionsRow = function (oTileActionsRow, bEdit) {
        var tileActionsRowObject = {}, oResourceBundle = oUtils.getResourceBundleModel().getResourceBundle();

        tileActionsRowObject.menu_title = oTileActionsRow.text;
        tileActionsRowObject.icon = oTileActionsRow.icon;
        if ((oTileActionsRow.targetURL).charAt(0) === "#") {
            // Target Type is Intent
            tileActionsRowObject.target_type = oResourceBundle.getText("configuration.tile_actions.table.target_type.intent");
            var aNavigationTarget = oTileActionsRow.targetURL.split("-");
            tileActionsRowObject.navigation_target = aNavigationTarget[0].substring(1, aNavigationTarget[0].length); // removes # for the semantic
            // object
            tileActionsRowObject.action = aNavigationTarget[1];
            tileActionsRowObject.isTargetTypeIntent = true;
        } else {
            // Target Type is URL
            tileActionsRowObject.target_type = oResourceBundle.getText("configuration.tile_actions.table.target_type.url");
            tileActionsRowObject.navigation_target = oTileActionsRow.targetURL;
            tileActionsRowObject.action = "";
            tileActionsRowObject.isTargetTypeIntent = false;
        }
        tileActionsRowObject.editable = bEdit;

        return tileActionsRowObject;
    };

    /**
     * This function will be called during save operation. Build the tile actions array according to the entries of the table.
     *
     * @param {array} aTableContent Tile Navigation Actions array
     * @returns {array} aTileNavigationActions Returns tile navigation actions array Example for two rows data. First row:Target_Type: URL, second row
     *          Target_Type: Intent: [{icon: "sap-icon://Fiori2/F0211", targetURL: "https://www.google.co.in", text: "action1"}, {icon:
     *          "sap-icon://Fiori2/F0210", targetURL: "#AccessControlRole-action", text: "action2"}]
     */
    oUtils.tileActionsRows2TileActionsArray = function (aTableContent) {
        var aTileNavigationActions = [];
        for (var i = 0; i < aTableContent.length; i++) {
            if (aTableContent[i].menu_title) {
                aTileNavigationActions.push(tileActionRow2TileActionObject(aTableContent[i]));
            }
        }
        return aTileNavigationActions; // might be empty
    };

    /**
     * Build tile actions row object. If Target Type is Intent, then taregtURL will be prefixed with '#'.
     *
     * @param {object} oTileActionRow Tile Navigation Actions row object
     * @returns {object} oTileAction Returns tile navigation actions row object with semantic object and action combined Example for Target Type URL:
     *          {icon: "sap-icon://Fiori2/F0211", targetURL: "https://www.google.co.in", text: "action1"} Example for target type Intent: {icon:
     *          "sap-icon://Fiori2/F0210", targetURL: "#AccessControlRole-action", text: "action2"}
     */
    var tileActionRow2TileActionObject = function (oTileActionRow) {
        var oTileAction = {};
        oTileAction.text = oTileActionRow.menu_title;
        oTileAction.icon = oTileActionRow.icon;
        if (oTileActionRow.action) {
            oTileAction.targetURL = "#" + oTileActionRow.navigation_target + "-" + oTileActionRow.action;
        } else {
            oTileAction.targetURL = oTileActionRow.navigation_target;
        }

        return oTileAction;
    };
    /**
     * Saves the tile navigation actions in to the bag.
     *
     * @param {Object} tileNavigationActionsBag Bag into which the tile navigation actions has to be saved
     * @param {Array} aNavigationProperties Array of tile navigation actions
     */
    oUtils.populateTileNavigationActionsBag = function (tileNavigationActionsBag, aNavigationProperties) {
        // Stringify the array and populate it to the bag as a property, tile_navigation_actions
        tileNavigationActionsBag.setProperty('tile_navigation_actions', JSON.stringify(aNavigationProperties));
        for (var i = 0; i < aNavigationProperties.length; i++) {
            var sActionTitle = aNavigationProperties[i].text;
            tileNavigationActionsBag.setText('action_tile_' + (i + 1), sActionTitle);
        }
    };

    // The default values for the form factor is to let the application decide what devices are supported (i.e. form factors). The admin can override
    // the defaults.
    oUtils.getDefaultFormFactors = function () {

        return {
            "appDefault": false,
            "manual": {
                "desktop": true,
                "tablet": true,
                "phone": true
            },
            "defaultParam": true
        };
    };

    // Build form factors list as populated by the user. This format is expected by the nav target resolution service.
    // When the appDefault is true, the form factor check-boxes are disabled and their value should be ignored.
    // otherwise, they are used to determine on what form factors this nav target can be used.
    // The values "desktop"/"tablet"/"phone" are sync with the sap.ui.Device.system values which are used in the resolving.
    oUtils.buildFormFactorsObject = function (oModel) {

        return {
            "appDefault": oModel.getProperty("/config/appFormFactor"),
            "manual": {
                "desktop": oModel.getProperty("/config/desktopChecked"),
                "tablet": oModel.getProperty("/config/tabletChecked"),
                "phone": oModel.getProperty("/config/phoneChecked")
            }
        };
    };

    // Check if the parameters table has duplicate parameter names, return true if it does, false otherwise
    oUtils.tableHasDuplicateParameterNames = function (aTableContent) {
        var parametersMap = {};
        for (var i = 0; i < aTableContent.length; i++) {
            var paramName = aTableContent[i].name;
            if (paramName !== "") {
                if (parametersMap[paramName]) {
                    return true;
                } else {
                    parametersMap[paramName] = true;
                }
            }
        }
        return false;
    };

    // Build the mapping signature string according to the entries of the table and the value of the allowed undefined checkbox.
    // This function will be called during save operation
    oUtils.getMappingSignatureString = function (tableContent, allowUnknownParameters) {
        var mappingSignature = "";
        for (var i = 0; i < tableContent.length; i++) {
            if (tableContent[i].name) {
                mappingSignature += (getOneParamSignature(tableContent[i]) + "&");
            }
        }
        return allowUnknownParameters ? mappingSignature + "*=*" : mappingSignature.substring(0, mappingSignature.length - 1); // might be empty
    };

    // build a string representation of the provided row object
    var getOneParamSignature = function (tableRow) {
        var paramSignature = "";

        if (tableRow.mandatory) {
            if (tableRow.isRegularExpression) {
                paramSignature = "{" + tableRow.name + "=" + encodeURIComponent(tableRow.value) + "}";
            } else {
                paramSignature = tableRow.name + "=" + encodeURIComponent(tableRow.value);
            }
        } else {
            paramSignature = "[" + tableRow.name + "=" + encodeURIComponent(tableRow.defaultValue) + "]";
        }
        return paramSignature;
    };

    // var mappingSignatureStringExample = "par1=B%3C%3E&{par2=D*}&[par3=F%40%40]";

    // Build the table data according to the mapping signature string
    // This function will be called during init operation
    oUtils.getMappingSignatureTableData = function (mappingSignatureString, bEdit) {
        var paramsArray = [];
        var paramStringsArray = mappingSignatureString.split("&");

        for (var i = 0; i < paramStringsArray.length; i++) {
            var currentParam = paramStringsArray[i];
            if (currentParam !== "*=*") {
                // For each parameter string (except from the "allow unknown parameters" sign),
                // get the parameter object and add to the array
                paramsArray.push(getOneParamObject(paramStringsArray[i], bEdit));
            }
        }
        return paramsArray;
    };

    var getOneParamObject = function (paramString, bEdit) {
        var paramObject = {};

        if (paramString.charAt(0) === "[") {
            // If there are [] brackets, this parameter is optional
            paramObject.mandatory = false;
            paramObject.isRegularExpression = false; // Optional params can't be regular expressions
            paramObject.value = ""; // No value for optional params (only default value)
            paramString = paramString.substring(1, paramString.length - 1); // Remove [] brackets
            paramObject.name = paramString.substring(0, paramString.indexOf("=")); // Get name
            paramObject.defaultValue = decodeURIComponent(paramString.substring(paramString.indexOf("=") + 1)); // Get default value
        } else {
            // No [] brackets so this parameter is mandatory
            paramObject.mandatory = true;
            paramObject.defaultValue = ""; // No default value for mandatory params (only value is allowed)
            if (paramString.charAt(0) === "{") {
                // If there are {} brackets, this parameter is a regular expression
                paramObject.isRegularExpression = true;
                paramString = paramString.substring(1, paramString.length - 1); // Remove {} brackets
            } else {
                // No {} brackets, so this parameter is not a regular expression
                paramObject.isRegularExpression = false;
            }
            paramObject.name = paramString.substring(0, paramString.indexOf("=")); // Get name
            paramObject.value = decodeURIComponent(paramString.substring(paramString.indexOf("=") + 1)); // Get value
        }
        paramObject.editable = bEdit;

        if (bEdit) {
            paramObject.valEnabled = paramObject.mandatory;
            paramObject.defValEnabled = !paramObject.mandatory;
        } else {
            paramObject.valEnabled = true;
            paramObject.defValEnabled = true;
        }

        return paramObject;
    };

    // Get the allowUnknownParameters check-box value from the mapping signature string (Will be called during init operation)
    oUtils.getAllowUnknownParametersValue = function (mappingSignatureString) {
        // Check if the last parameter is *=* then "allow unknown parameters" should be true
        if (mappingSignatureString && (mappingSignatureString.substring(mappingSignatureString.length - 3, mappingSignatureString.length) === "*=*")) {
            return true;
        } else {
            return false;
        }
    };

    oUtils.getMappingSignature = function (aRows, bAdditionalParameters) {
        var sAdditionalParameters = bAdditionalParameters ? "allowed" : "ignored";
        var oUserDefParser = new RegExp("%%UserDefault[.].+%%");
        var aMatch = [];
        var oMappingSignature = {
            "parameters": {},
            "additional_parameters": sAdditionalParameters
        };
        aRows.forEach(function (oRow) {
            oMappingSignature.parameters[oRow.name] = {
                "required": oRow.mandatory,
                "rename_to": oRow.rename_to
            };
            if (oRow.defaultValue) {
                aMatch = oUserDefParser.exec(oRow.defaultValue);
                if (aMatch) {
                    oRow.defaultValue = aMatch[0];
                }
                oMappingSignature.parameters[oRow.name].defaultValue = {
                    "value": oRow.defaultValue
                };
            }
            if (oRow.value) {
                aMatch = oUserDefParser.exec(oRow.value);
                if (aMatch) {
                    oRow.value = aMatch[0];
                }

                oMappingSignature.parameters[oRow.name].filter = {
                    "value": oRow.value
                };
                if (oRow.isRegularExpression) {
                    oMappingSignature.parameters[oRow.name].filter.format = "regexp";
                }
            }
        });
        return oMappingSignature;
    };

    oUtils.getSignatureTableData = function (oSignature, bEdit) {
        var paramsArray = [];
        var oRow = {};
        var oParameter = {};
        var oParameters = oSignature.parameters;

        for ( var key in oParameters) {

            oParameter = oParameters[key];

            oRow = {};
            oRow.editable = bEdit;
            oRow.name = key;
            oRow.mandatory = oParameter.required;
            oParameter.rename_to ? oRow.rename_to = oParameter.rename_to : oRow.rename_to = oParameter.renameTo;

            if (bEdit) {
                oRow.valEnabled = oRow.mandatory;
                oRow.defValEnabled = !oRow.mandatory;
            } else {
                oRow.valEnabled = true;
                oRow.defValEnabled = true;
            }

            if (oParameter.filter) {
                oRow.value = oParameter.filter.value;
                if (oParameter.filter.format && oParameter.filter.format === "regexp") {
                    oRow.isRegularExpression = true;
                }
            }

            if (oParameter.defaultValue) {
                oRow.defaultValue = oParameter.defaultValue.value;
            }

            paramsArray.push(oRow);

        }
        return paramsArray;
    };

    /**
     * Returns the translated title string.
     *
     * @param {object} oTileApi The instance-specific chip API.
     * @returns {string} The translated chip title.
     */
    oUtils.getTranslatedTitle = function (oTileApi) {
        // Note: "oTileApi.title" is no genuine contract, but is injected by the launchpad designer.
        // As such, "title" is only available in design time and not during runtime.
        // At runtime. oTileApi.preview.getTitle() can be used to fetch the translatable title.

        // first try to get title from bag
        if (oTileApi.bag) {
            var bag = oTileApi.bag.getBag('tileProperties');
            if (bag.getTextNames().indexOf("display_title_text") >= 0) {
                return bag.getText('display_title_text');
            }
        }

        // design time
        if (oTileApi.title) {
            return oTileApi.title.getTitle();
        }
        // runtime
        if (oTileApi.preview) {
            return oTileApi.preview.getTitle();
        }
        return "";
    };

    /**
     * Returns the translated subtitle string.
     *
     * @param {object} oTileApi The instance-specific chip API.
     * @param {object} oConfig The instance-specific tile configuration.
     * @returns {string} The translated chip subtitle.
     */
    oUtils.getTranslatedSubtitle = function (oTileApi, oConfig) {
        // first try to get subtitle from bag
        if (oTileApi.bag) {
            var bag = oTileApi.bag.getBag('tileProperties');
            if (bag.getTextNames().indexOf("display_subtitle_text") >= 0) {
                return bag.getText('display_subtitle_text');
            }
        }

        // try to get it from configuration
        if (typeof oConfig['display_subtitle_text'] === "string") {
            return oConfig['display_subtitle_text'];
        }

        // then try to get it from the preview
        if (oTileApi.preview && oTileApi.preview.getDescription && oTileApi.preview.getDescription()) {
            return oTileApi.preview.getDescription();
        }

        // last get it from the configuration
        // return oConfig['display_subtitle_text'];

        return '';
    };

    /**
     * Returns the translated property string from .
     *
     * @param {object} oTileApi The instance-specific chip API.
     * @param {string} sPropertyKey The property key
     * @returns {string} The translated chip property.
     */
    oUtils.getTranslatedProperty = function (oTileApi, oTileConfig, sPropertyKey) {

        // Try to read data from the property bag. If there are properties for description etc. > use them
        if (oTileApi.bag) {
            var bag = oTileApi.bag.getBag('tileProperties');
            if (bag.getTextNames().indexOf(sPropertyKey) >= 0) {
                return bag.getText(sPropertyKey);
            }
        }

        // If there is no data in the property bag, use the config bag to read the data
        return oTileConfig[sPropertyKey];

    };

    /**
     * Read and initialize configuration object from given JSON string. Used by the action chip (aka target mapping).
     *
     * @param {string} sConfig Configuration string in JSON format
     * @param {string} bAdmin A flag that indicates, whether the configuration shall be shown in the Admin UI
     * @returns {object} Returns parsed and initialized configuration object
     */
    oUtils.getActionConfiguration = function (oTileApi, bAdmin) {
        var sConfig = oTileApi.configuration.getParameterValueAsString('tileConfiguration');
        var oConfig = JSON.parse(sConfig || "{}"), oResourceBundle;
        if (typeof bAdmin == "undefined") {
            bAdmin = oTileApi.configurationUi.isEnabled();
        }

        if (bAdmin) {
            oResourceBundle = oUtils.getResourceBundleModel().getResourceBundle();
        }
        oConfig.semantic_object = oConfig.semantic_object || (bAdmin ? "[" + oResourceBundle.getText("configuration.semantic_object") + "]" : "");
        oConfig.semantic_action = oConfig.semantic_action || (bAdmin ? "[" + oResourceBundle.getText("configuration.semantic_action") + "]" : "");
        oConfig.navigation_provider = oConfig.navigation_provider || "";
        oConfig.navigation_provider_role = oConfig.navigation_provider_role || "";
        oConfig.navigation_provider_instance = oConfig.navigation_provider_instance || "";
        oConfig.target_application_id = oConfig.target_application_id || "";
        oConfig.target_application_alias = oConfig.target_application_alias || "";
        oConfig.display_info_text = oConfig.display_info_text || "";

        oConfig.editable = true;
        if (oTileApi.configurationUi && oTileApi.configurationUi.isReadOnly) {
            if (oTileApi.configurationUi.isReadOnly()) {
                oConfig.editable = false;
            }
        }
        return oConfig;
    };

    /**
     * Takes an existing view (<code>ActionTile</code>, <code>StaticTile</code>, <code>DynamicTile</code>) and initializes the configuration
     * UI.
     *
     * @param {object} oView The view for which the configuration UI shall be initialized
     * @param {string} sViewName The name of the view to initialize
     * @returns {object} The configuration view to be shown in the Admin UI, e.g., {@link components.tiles.action.Configuration},
     *          {@link components.tiles.applauncher.Configuration}, or {@link components.tiles.applauncherdynamic.Configuration}
     */
    oUtils.getConfigurationUi = function (oView, sViewName) {
        var oViewData = oView.getViewData();
        var oTileApi = oViewData.chip;
        var oConfigurationView, oSemanticObjectSelector, oRoleSelector, oInstanceSelector, oAliasSelector, oApplicationType;
        var utilsRT = sap.ui.require("sap/ushell/components/tiles/utilsRT");
        var oCurrentConfig = utilsRT.getConfiguration(oTileApi, true, true);

        // verify user allow to edit (user locale = original Locate

        var oConfigurationModel = new sap.ui.model.json.JSONModel({
            config: oCurrentConfig,
            // keep reference to the model in this model
            // (to be able to update it directly on configuration changes)
            tileModel: oView.getModel()
        });

        oConfigurationView = new sap.ui.view({
            type: sap.ui.core.mvc.ViewType.XML,
            viewData: oViewData,
            viewName: sViewName
        });

        oConfigurationView.setModel(oConfigurationModel);

        // initialize state of input fields depending on navigation_use_semantic_object
        // navigation_semantic_objectInput</code> used in static and dynamic tiles
        // semantic_objectInput used in action tile
        oSemanticObjectSelector = oConfigurationView.byId("navigation_semantic_objectInput") || oConfigurationView.byId("semantic_objectInput");
        if (oSemanticObjectSelector) {
            oSemanticObjectSelector.getModel().setProperty("/enabled", oCurrentConfig.navigation_use_semantic_object);
            oSemanticObjectSelector.getModel().setProperty("/value", oCurrentConfig.semantic_object || oCurrentConfig.navigation_semantic_object);
        }
        oRoleSelector = oConfigurationView.byId("navigation_provider_roleInput");
        if (oRoleSelector) {
            oRoleSelector.getModel().setProperty("/value", oCurrentConfig.navigation_provider_role);
        }
        oInstanceSelector = oConfigurationView.byId("navigation_provider_instanceInput");
        if (oInstanceSelector) {
            oInstanceSelector.getModel().setProperty("/value", oCurrentConfig.navigation_provider_instance);
        }
        oAliasSelector = oConfigurationView.byId("target_application_aliasInput");
        if (oAliasSelector) {
            oAliasSelector.getModel().setProperty("/value", oCurrentConfig.target_application_alias);
        }

        // Enable Application type radio button LPD_CUST/SAPUI5 depending on navigation_provider
        // Application type is used in action tile configuration
        oApplicationType = oConfigurationView.byId("targetTypeInput");
        if (oApplicationType) {

            if (!oConfigurationView.getModel().getProperty("/config/transaction")) {
                oConfigurationView.getModel().setProperty("/config/transaction", {});
            }
            if (!oConfigurationView.getModel().getProperty("/config/web_dynpro")) {
                oConfigurationView.getModel().setProperty("/config/web_dynpro", {});
            }

            if (oView.getModel().getProperty('/config/navigation_provider') == "LPD") {
                oUtils.displayLpdCustApplicationTypeFields(oConfigurationView);
            } else if (oView.getModel().getProperty('/config/navigation_provider') == "SAPUI5" || oView.getModel().getProperty('/config/navigation_provider') == '') {
                oApplicationType.setSelectedKey("SAPUI5");
                oUtils.displaySapui5ApplicationTypeFields(oConfigurationView);
            } else if (oView.getModel().getProperty('/config/navigation_provider') == "TR") {
                oUtils.displayTransactionApplicationTypeFields(oConfigurationView);
            } else if (oView.getModel().getProperty('/config/navigation_provider') == "WDA") {
                oUtils.displayWebDynproApplicationTypeFields(oConfigurationView);
            } else if (oView.getModel().getProperty('/config/navigation_provider') == "URL") {
                oUtils.displayURLApplicationTypeFields(oConfigurationView);
            }
        }
        return oConfigurationView;
    };

    oUtils._updateTilePropertiesTexts = function (oView, oTilePropertiesBag) {
        var aTilePropertiesTextNames = oTilePropertiesBag.getTextNames(),
            oModel = oView.getModel();

        aTilePropertiesTextNames.forEach(function (sPropertyText) {
            oModel.setProperty('/data/' + sPropertyText, oTilePropertiesBag.getText(sPropertyText));
            oModel.setProperty('/config/' + sPropertyText, oTilePropertiesBag.getText(sPropertyText));
        });
    };

    oUtils._updateTileConfiguration = function (oView, oTileConfigurationBag) {
        var oModel = oView.getModel();

        jQuery.each(JSON.parse(oTileConfigurationBag), function (sPropertyName, sPropertyValue) {
            oModel.setProperty('/data/' + sPropertyName, sPropertyValue);
            oModel.setProperty('/config/' + sPropertyName, sPropertyValue);
            if (sPropertyName === "navigation_target_url") {
                oModel.setProperty('/nav/' + sPropertyName, sPropertyValue);
            }
        });
    };

    /**
     * Captures/caches the names of semantic objects configured in the backend.
     */
    oUtils.aData = [];
    oUtils.aActionData = [];
    oUtils.aRoleData = [];
    oUtils.aAliasData = [];

    /**
     * Search function for the object selector dialog.
     */
    oUtils.objectSelectDoSearch = function (oEvent) {
        var filter = [], sVal = oEvent.getParameter("value"), itemsBinding, selectNameFilter, selectObjFilter;
        if (sVal !== undefined) {
            itemsBinding = oEvent.getParameter("itemsBinding");
            selectNameFilter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sVal);
            selectObjFilter = new sap.ui.model.Filter("obj", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectObjFilter);
            filter.push(selectNameFilter);
            itemsBinding.filter(new sap.ui.model.Filter(filter, false));
        }
    };

    /**
     * Search function for the action selector dialog.
     */
    oUtils.actionSelectDoSearch = function (oEvent) {
        var filter = [], sVal = oEvent.getParameter("value"), itemsBinding, selectActionFilter;
        if (sVal !== undefined) {
            itemsBinding = oEvent.getParameter("itemsBinding");
            selectActionFilter = new sap.ui.model.Filter("text", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectActionFilter);
            itemsBinding.filter(new sap.ui.model.Filter(filter, false));
        }
    };

    /**
     * Search function for the role selector dialog.
     */
    oUtils.roleSelectDoSearch = function (oEvent) {
        var filter = [], sVal = oEvent.getParameter("value"), itemsBinding, selectRoleFilter, selectInstanceFilter;
        if (sVal !== undefined) {
            itemsBinding = oEvent.getParameter("itemsBinding");
            selectRoleFilter = new sap.ui.model.Filter("role", sap.ui.model.FilterOperator.Contains, sVal);
            selectInstanceFilter = new sap.ui.model.Filter("instance", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectRoleFilter);
            filter.push(selectInstanceFilter);
            itemsBinding.filter(new sap.ui.model.Filter(filter, false));
        }
    };

    /**
     * Search function for the instance selector dialog.
     */
    oUtils.instanceSelectDoSearch = function (oEvent) {
        var filter = [], sVal = oEvent.getParameter("value"), customData, sRole, itemsBinding, selectRoleFilter, selectObjFilter;

        customData = oEvent.getSource().getCustomData();
        sRole = customData[0].getValue();

        if (sVal !== undefined) {
            itemsBinding = oEvent.getParameter("itemsBinding");
            if (sVal != "") {
                selectObjFilter = new sap.ui.model.Filter("instance", sap.ui.model.FilterOperator.Contains, sVal);
                filter.push(selectObjFilter);
            }
            if (sRole != "") {
                selectRoleFilter = new sap.ui.model.Filter("role", sap.ui.model.FilterOperator.EQ, sRole);
                filter.push(selectRoleFilter);
            }
            if (filter.length > 0) {
                itemsBinding.filter(new sap.ui.model.Filter(filter, true));
            }
        }
    };

    /**
     * Suggest function for the instance.
     */
    oUtils.instanceSuggest = function (oController, oEvent) {
        var oView = oController.getView(), filter = [], sVal = oEvent.getParameter("value"), oRoleSelector, sRole, suggestionsItemBinding, selectRoleFilter, selectObjFilter;

        oRoleSelector = oView.byId("navigation_provider_roleInput");
        sRole = oRoleSelector.getValue();
        sVal = oEvent.getParameter("suggestValue");

        if (sVal != "") {
            selectObjFilter = new sap.ui.model.Filter("instance", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectObjFilter);
        }
        if (sRole != "") {
            selectRoleFilter = new sap.ui.model.Filter("role", sap.ui.model.FilterOperator.EQ, sRole);
            filter.push(selectRoleFilter);
        }
        if (filter.length > 0) {
            suggestionsItemBinding = oEvent.oSource.getBinding("suggestionItems");
            suggestionsItemBinding.filter(new sap.ui.model.Filter(filter, true));
        }
    };

    /**
     * Suggest function for the alias.
     */
    oUtils.aliasSuggest = function (oController, oEvent) {
        var oView = oController.getView(), filter = [], sVal = oEvent.getParameter("value"), oInstanceSelector, sInstance, suggestionsItemBinding, selectInstanceFilter, selectAliasFilter;

        oInstanceSelector = oView.byId("navigation_provider_instanceInput");
        sInstance = oInstanceSelector.getValue();
        sVal = oEvent.getParameter("suggestValue");

        if (sVal != "") {
            selectAliasFilter = new sap.ui.model.Filter("alias", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectAliasFilter);
        }
        if (sInstance != "") {
            selectInstanceFilter = new sap.ui.model.Filter("instance", sap.ui.model.FilterOperator.EQ, sInstance);
            filter.push(selectInstanceFilter);
        }
        if (filter.length > 0) {
            suggestionsItemBinding = oEvent.oSource.getBinding("suggestionItems");
            suggestionsItemBinding.filter(new sap.ui.model.Filter(filter, true));
        }
    };

    /**
     * Search function for the alias selector dialog.
     */
    oUtils.aliasSelectDoSearch = function (oEvent) {
        var filter = [], sVal = oEvent.getParameter("value"), customData, sInstance, itemsBinding, selectNameFilter, selectObjFilter;

        customData = oEvent.getSource().getCustomData();
        sInstance = customData[0].getValue();

        if (sVal !== undefined) {
            itemsBinding = oEvent.getParameter("itemsBinding");
            selectNameFilter = new sap.ui.model.Filter("instance", sap.ui.model.FilterOperator.EQ, sInstance);
            if (sVal != "") {
                selectObjFilter = new sap.ui.model.Filter("alias", sap.ui.model.FilterOperator.Contains, sVal);
                filter.push(selectObjFilter);
            }
            filter.push(selectNameFilter);
            itemsBinding.filter(new sap.ui.model.Filter(filter, true));
        }
    };

    /**
     * Update function of the object selector dialog.
     */
    oUtils.objectSelectUpdateDialog = function (oSelectDialog, sVal) {
        var filter = [], itemsBinding = oSelectDialog.getBinding("items"), selectFilter;
        if (sVal !== undefined) {
            selectFilter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectFilter);
            itemsBinding.filter(filter);
        }
    };

    /**
     * Update function of the action selector dialog.
     */
    oUtils.actionSelectUpdateDialog = function (oSelectDialog, sVal) {
        var filter = [], itemsBinding = oSelectDialog.getBinding("items"), selectFilter;
        if (sVal !== undefined) {
            selectFilter = new sap.ui.model.Filter("text", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectFilter);
            itemsBinding.filter(filter);
        }
    };

    /**
     * Update function of the role selector dialog.
     */
    oUtils.roleSelectUpdateDialog = function (oSelectDialog, sVal) {
        var filter = [], itemsBinding = oSelectDialog.getBinding("items"), selectFilter;
        if (sVal !== undefined) {
            selectFilter = new sap.ui.model.Filter("role", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectFilter);
            itemsBinding.filter(filter);
        }
    };

    /**
     * Update function of the instance selector dialog.
     */
    oUtils.instanceSelectUpdateDialog = function (oSelectDialog, sVal) {
        var filter = [], customData, itemsBinding = oSelectDialog.getBinding("items"), selectFilter, sRole, selectNameFilter;

        customData = oSelectDialog.getCustomData();
        sRole = customData[0].getValue();

        if (sVal !== undefined) {
            selectFilter = new sap.ui.model.Filter("instance", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectFilter);
        }
        if (sRole !== "") {
            selectNameFilter = new sap.ui.model.Filter("role", sap.ui.model.FilterOperator.EQ, sRole);
            filter.push(selectNameFilter);
        }
        if (filter.length > 0) {
            itemsBinding.filter(filter, true);
        }
    };

    /**
     * Update function of the alias selector dialog.
     */
    oUtils.aliasSelectUpdateDialog = function (oSelectDialog, sVal) {
        var filter = [], customData, sInstance, itemsBinding = oSelectDialog.getBinding("items"), selectNameFilter, selectFilter;

        customData = oSelectDialog.getCustomData();
        sInstance = customData[0].getValue();

        if (sVal !== undefined) {
            selectFilter = new sap.ui.model.Filter("alias", sap.ui.model.FilterOperator.Contains, sVal);
            filter.push(selectFilter);
        }
        if (sInstance !== "") {
            selectNameFilter = new sap.ui.model.Filter("instance", sap.ui.model.FilterOperator.EQ, sInstance);
            filter.push(selectNameFilter);
        }
        if (filter.length > 0) {
            itemsBinding.filter(filter, true);
        }
    };

    // select/deselect colors for icon select dialog
    oUtils.sSelectedColor = (jQuery(".sapMStdTileIconDiv").css('color') || "#007cc0").split(" ").join("");
    oUtils.sDeselectedColor = (jQuery(".sapMLabel:not(.sapFioriDropZoneText )").css('color') || "#666666").split(" ").join("");

    /**
     * Visually select the given icon as indicated.
     *
     * @see sapMStdTileIconDiv
     */
    oUtils.iconSelect = function (oIcon, bSelected) {
        oIcon.setColor(bSelected ? oUtils.sSelectedColor : oUtils.sDeselectedColor);
        oIcon.setActiveColor(bSelected ? oUtils.sDeselectedColor : oUtils.sSelectedColor);
    };

    /**
     * Event handler for icon's "press" event in selection dialog.
     */
    oUtils.onSelectIcon = function (oController, isTileActions, oTileActionsIcon, oControlEvent) {
        var oModel = oController.getView().getModel(), oSelectedIcon;
        if (isTileActions) {
            oSelectedIcon = oModel.getProperty("/config/tile_actions_selected_icon");
        } else {
            oSelectedIcon = oModel.getProperty("/config/selected_icon");
        }

        if (oSelectedIcon) {
            oUtils.iconSelect(oSelectedIcon, false);
        }

        oSelectedIcon = oControlEvent.getSource();
        oUtils.iconSelect(oSelectedIcon, true);
        oModel.setProperty("/config/ok.enabled", true);
        if (isTileActions) {
            oModel.setProperty("/config/tile_actions_selected_icon", oSelectedIcon);
// oTileActionsIcon.setValue(oSelectedIcon.getSrc());
        } else {
            oModel.setProperty("/config/selected_icon", oSelectedIcon);
        }
        oController.byId("selectIconDialog").setTitle(oSelectedIcon.getSrc());
    };

    /**
     * Close handler for icon select dialog.
     */
    oUtils.onSelectIconClose = function (oView) {
        oView.byId("selectIconDialog").close();
    };

    /**
     * Confirm handler for icon select dialog.
     */
    oUtils.onSelectIconOk = function (oView, oTileActionsIcon) {
        var oSelectedIcon = oView.getModel().getProperty("/config/selected_icon");
        if (!oTileActionsIcon) {
            oView.getModel().setProperty("/config/display_icon_url", oSelectedIcon.getSrc());
            oView.byId("iconInput").setValueState(sap.ui.core.ValueState.None);
        } else {
            oSelectedIcon = oView.getModel().getProperty("/config/tile_actions_selected_icon");
            if (oSelectedIcon) {
                oTileActionsIcon.setValue(oSelectedIcon.getSrc());
                oTileActionsIcon.setValueState(sap.ui.core.ValueState.None);
            }
        }

        oUtils.onSelectIconClose(oView);
    };

    /**
     * Value help request for icon selection. Opens the icon selection dialog.
     */
    oUtils.iconSelectOnValueHelpRequest = function (oController, oEvent, isTileActions) {
        var oModel = oController.getView().getModel();
        var oResponsiveFlowLayout = oController.getView().byId("icons");
        var aCollectionNames = sap.ui.core.IconPool.getIconCollectionNames();
        var oDialog = oController.getView().byId("selectIconDialog");
        var oOK = oController.getView().byId("ok");

        // aContent = oResponsiveFlowLayout.getContent(),
        var aContent, sIcon, oTileActionsIcon, aIconNames, i, j, sUri, bBusinessSuiteInAppSymbolsContained = false;
        // Clear the content of icon layout, so that the content will be reloded everytime, with different press events for tile actions icon and
        // general icon.
        oResponsiveFlowLayout.destroyContent();

        // If the flag isTileActions is true, then it's tile actions icon field. read the value from event.
        if (isTileActions) {
            oTileActionsIcon = sap.ui.getCore().byId(oEvent.getParameter('id'));
            sIcon = oTileActionsIcon.getValue();
        } else {
            sIcon = oModel.getProperty("/config/display_icon_url");
        }

        oOK.attachEventOnce("press", function () {
            oUtils.onSelectIconOk(oController.getView(), oTileActionsIcon);
        });

        // commenting this beacuse press event has to be binded different for general icon and tile actions icon.
        // if (aContent.length === 0) {
        aCollectionNames.sort();
        // remove in-app symbols
        aCollectionNames = jQuery.grep(aCollectionNames, function (value) {
            if (value === "BusinessSuiteInAppSymbols") {
                bBusinessSuiteInAppSymbolsContained = true;
                return false;
            }
            return true;
        });
        // append at end of array, if available
        // Note: this could be removed if the launchpad icons are not to be used for apps
        if (bBusinessSuiteInAppSymbolsContained) {
            aCollectionNames.push("BusinessSuiteInAppSymbols");
        }
        for (i = 0; i < aCollectionNames.length; i += 1) {
            aIconNames = sap.ui.core.IconPool.getIconNames(aCollectionNames[i]);
            aIconNames.sort();
            for (j = 0; j < aIconNames.length; j += 1) {
                sUri = sap.ui.core.IconPool.getIconURI(aIconNames[j], aCollectionNames[i]);
                oResponsiveFlowLayout.addContent(new sap.ui.core.Icon({
                    height: "38px",
                    press: oUtils.onSelectIcon.bind(null, oController, isTileActions, oTileActionsIcon),
                    size: "2rem",
                    src: sUri,
                    tooltip: sUri,
                    width: "38px"
                }));
            }
        }
        aContent = oResponsiveFlowLayout.getContent();
        // }

        // initial state
        oModel.setProperty("/config/ok.enabled", false);
        oDialog.bindProperty("title", {
            model: "i18n",
            path: "configuration.select_icon"
        });

        // initial selection
        for (i = 0; i < aContent.length; i += 1) {
            if (aContent[i].getSrc() === sIcon) {
                // oController.oSelectedIcon = aContent[i];
                if (isTileActions) {
                    oModel.setProperty("/config/tile_actions_selected_icon", aContent[i]);
                } else {
                    oModel.setProperty("/config/selected_icon", aContent[i]);
                }
                oUtils.iconSelect(aContent[i], true);
                oModel.setProperty("/config/ok.enabled", true);
                oDialog.setTitle(sIcon);
            } else {
                oUtils.iconSelect(aContent[i], false);
            }
        }

        oDialog.open();
    };

    /**
     * Value help request for semantic object input. Opens the semantic object input dialog.
     */
    oUtils.objectSelectOnValueHelpRequest = function (oController, oEvent, isTileActions) {
        var oView = oController.getView(), sTitle = oUtils.getResourceBundleModel().getResourceBundle().getText("configuration.semantic_object"), oSemanticObjectSelector, sValue, oSelectorModel = new sap.ui.model.json.JSONModel(), oSelectDialog = new sap.m.SelectDialog("semantic_object_select_dialog", {
            title: sTitle,
            search: oUtils.objectSelectDoSearch,
            liveChange: oUtils.objectSelectDoSearch
        }), itemTemplate = new sap.m.StandardListItem({
            title: "{obj}"
        });

        if (isTileActions) {
            oSemanticObjectSelector = sap.ui.getCore().byId(oEvent.getParameter('id'));
        } else {
            // action tile uses 'semantic_objectInput', dynamic/static tile use 'navigation_semantic_objectInput'
            oSemanticObjectSelector = oView.byId("semantic_objectInput") || oView.byId("navigation_semantic_objectInput");
        }
        sValue = oSemanticObjectSelector.getValue();

        oSelectDialog.open(sValue);
        // controllers can have different default objects
        oSelectorModel.setData(oController.aDefaultObjects.concat(oUtils.aData));

        oSelectDialog.bindAggregation("items", "/", itemTemplate);
        oSelectDialog.setModel(oSelectorModel);

        oUtils.objectSelectUpdateDialog(oSelectDialog, sValue);

        // cancel handler
        oSelectDialog.attachCancel(function (evt) {
            oSemanticObjectSelector.setValue(sValue);
            if (!isTileActions) {
                oSemanticObjectSelector.fireChange();
            }
            oSelectDialog.destroy();
            oSelectDialog = null;
        });

        // confirm handler
        oSelectDialog.attachConfirm(function (evt) {
            var selectedItem = evt.getParameter("selectedItem");
            if (selectedItem) {
                oSemanticObjectSelector.setValue(selectedItem.getTitle());
                if (!isTileActions) {
                    oSemanticObjectSelector.fireChange();
                }
            }
            oSelectDialog.destroy();
            oSelectDialog = null;
        });
    };

    /**
     * Value help request for role input. Opens the role input dialog.
     */
    oUtils.actionSelectOnValueHelpRequest = function (oController, oEvent, isTileActions) {
        var oView = oController.getView(), sTitle = oUtils.getResourceBundleModel().getResourceBundle().getText("configuration.semantic_action"), oActionSelector, sValue, oSelectorModel = new sap.ui.model.json.JSONModel(), oSelectDialog = new sap.m.SelectDialog("semantic_action_select_dialog", {
            title: sTitle,
            search: oUtils.actionSelectDoSearch,
            liveChange: oUtils.actionSelectDoSearch
        }), itemTemplate = new sap.m.StandardListItem({
            title: "{text}"
        });

        if (isTileActions) {
            oActionSelector = sap.ui.getCore().byId(oEvent.getParameter('id'));
        } else {
            // action tile uses 'semantic_objectInput', dynamic/static tile use 'navigation_semantic_objectInput'
            oActionSelector = oView.byId("semantic_actionInput") || oView.byId("navigation_semantic_actionInput");
        }
        sValue = oActionSelector.getValue();

        oSelectDialog.open(sValue);
        // controllers can have different default objects
        oSelectorModel.setData(oUtils.aActionData);

        oSelectDialog.bindAggregation("items", "/items", itemTemplate);
        oSelectDialog.setModel(oSelectorModel);

        oUtils.actionSelectUpdateDialog(oSelectDialog, sValue);

        // cancel handler
        oSelectDialog.attachCancel(function (evt) {
            oActionSelector.setValue(sValue);
            if (!isTileActions) {
                oActionSelector.fireChange();
            }
            oSelectDialog.destroy();
            oSelectDialog = null;
        });

        // confirm handler
        oSelectDialog.attachConfirm(function (evt) {
            var selectedItem = evt.getParameter("selectedItem");
            if (selectedItem) {
                oActionSelector.setValue(selectedItem.getTitle());
                if (!isTileActions) {
                    oActionSelector.fireChange();
                    oActionSelector.fireLiveChange({
                        "newValue": selectedItem.getTitle()
                    });
                }
            }
            oSelectDialog.destroy();
            oSelectDialog = null;
        });
    };

    /**
     * Value help request for role input. Opens the role input dialog.
     */
    oUtils.roleSelectOnValueHelpRequest = function (oController, oEvent) {
        var oView = oController.getView(), sTitle = oUtils.getResourceBundleModel().getResourceBundle().getText("configuration.navigation_provider_role"), oRoleSelector, oInstanceSelector, sValue, oSelectorModel = new sap.ui.model.json.JSONModel(), oSelectDialog = new sap.m.TableSelectDialog("role_select_dialog", {
            title: sTitle,
            search: oUtils.roleSelectDoSearch,
            liveChange: oUtils.roleSelectDoSearch,
            columns: [
                new sap.m.Column({
                    header: [
                        new sap.m.Text({
                            text: oUtils.getResourceBundleModel().getResourceBundle().getText("configuration.navigation_provider_role")
                        })
                    ]
                }), new sap.m.Column({
                    header: [
                        new sap.m.Text({
                            text: oUtils.getResourceBundleModel().getResourceBundle().getText("configuration.navigation_provider_instance")
                        })
                    ]
                })
            ]
        }), itemTemplate = new sap.m.ColumnListItem({
            cells: [
                new sap.m.Text({
                    text: "{role}"
                }), new sap.m.Text({
                    text: "{instance}"
                })
            ]
        });

        oRoleSelector = oView.byId("navigation_provider_roleInput");
        oInstanceSelector = oView.byId("navigation_provider_instanceInput");

        sValue = oRoleSelector.getValue();

        oSelectDialog.open(sValue);
        // controllers can have different default objects
        oSelectorModel.setData(oController.aDefaultObjects.concat(oUtils.aRoleData));

        oSelectDialog.bindAggregation("items", "/", itemTemplate);
        oSelectDialog.setModel(oSelectorModel);

        oUtils.roleSelectUpdateDialog(oSelectDialog, sValue);

        // cancel handler
        oSelectDialog.attachCancel(function (evt) {
            oRoleSelector.setValue(sValue);
            oRoleSelector.fireChange();
            oSelectDialog.destroy();
            oSelectDialog = null;
        });

        // confirm handler
        oSelectDialog.attachConfirm(function (evt) {
            var selectedItem = evt.getParameter("selectedItem");
            if (selectedItem) {
                oRoleSelector.setValue(selectedItem.getCells()[0].getText());
                oInstanceSelector.setValue(selectedItem.getCells()[1].getText());
                oRoleSelector.fireChange();
                oInstanceSelector.fireChange();
            }
            oSelectDialog.destroy();
            oSelectDialog = null;
        });
    };

    /**
     * Value help request for instance input. Opens the instance input dialog.
     */
    oUtils.instanceSelectOnValueHelpRequest = function (oController, oEvent) {
        var oView = oController.getView(), sRole, sTitle = oUtils.getResourceBundleModel().getResourceBundle().getText("configuration.navigation_provider_instance"), oInstanceSelector, sValue, oSelectorModel = new sap.ui.model.json.JSONModel(), oSelectDialog = new sap.m.SelectDialog("instance_select_dialog", {
            title: sTitle,
            search: oUtils.instanceSelectDoSearch,
            liveChange: oUtils.instanceSelectDoSearch
        }), itemTemplate = new sap.m.StandardListItem({
            title: "{instance}"
        });

        oInstanceSelector = oView.byId("navigation_provider_instanceInput");

        sValue = oInstanceSelector.getValue();

        sRole = oView.byId("navigation_provider_roleInput").getValue();
        oSelectDialog.addCustomData(new sap.ui.core.CustomData({
            key: "role",
            value: sRole
        }));

        oSelectDialog.open(sValue);
        // controllers can have different default objects
        oSelectorModel.setData(oController.aDefaultObjects.concat(oUtils.aRoleData));

        oSelectDialog.bindAggregation("items", "/", itemTemplate);
        oSelectDialog.setModel(oSelectorModel);

        oUtils.instanceSelectUpdateDialog(oSelectDialog, sValue);

        // cancel handler
        oSelectDialog.attachCancel(function (evt) {
            oInstanceSelector.setValue(sValue);
            oInstanceSelector.fireChange();
            oSelectDialog.destroy();
            oSelectDialog = null;
        });

        // confirm handler
        oSelectDialog.attachConfirm(function (evt) {
            var selectedItem = evt.getParameter("selectedItem");
            if (selectedItem) {
                oInstanceSelector.setValue(selectedItem.getTitle());
                oInstanceSelector.fireChange();
            }
            oSelectDialog.destroy();
            oSelectDialog = null;
        });
    };

    /**
     * Value help request for alias input. Opens the alias input dialog.
     */
    oUtils.applicationAliasSelectOnValueHelpRequest = function (oController, oEvent) {

        var oView = oController.getView(), sTitle = oUtils.getResourceBundleModel().getResourceBundle().getText("configuration.target_application_alias"), oAliasSelector, sValue, sInstance, oSelectorModel = new sap.ui.model.json.JSONModel(), oSelectDialog = new sap.m.SelectDialog("alias_select_dialog", {
            title: sTitle,
            search: oUtils.aliasSelectDoSearch,
            liveChange: oUtils.aliasSelectDoSearch
        }), itemTemplate = new sap.m.StandardListItem({
            title: "{alias}"
        });

        oAliasSelector = oView.byId("target_application_aliasInput");

        sValue = oAliasSelector.getValue();

        sInstance = oView.byId("navigation_provider_instanceInput").getValue();
        oSelectDialog.addCustomData(new sap.ui.core.CustomData({
            key: "instance",
            value: sInstance
        }));

        oSelectDialog.open(sValue);
        // controllers can have different default objects
        oSelectorModel.setData(oController.aDefaultObjects.concat(oUtils.aAliasData));

        oSelectDialog.bindAggregation("items", "/", itemTemplate);
        oSelectDialog.setModel(oSelectorModel);

        oUtils.aliasSelectUpdateDialog(oSelectDialog, sValue);

        // cancel handler
        oSelectDialog.attachCancel(function (evt) {
            oAliasSelector.setValue(sValue);
            oAliasSelector.fireChange();
            oSelectDialog.destroy();
            oSelectDialog = null;
        });

        // confirm handler
        oSelectDialog.attachConfirm(function (evt) {
            var selectedItem = evt.getParameter("selectedItem");
            if (selectedItem) {
                oAliasSelector.setValue(selectedItem.getTitle());
                oAliasSelector.fireChange();
            }
            oSelectDialog.destroy();
            oSelectDialog = null;
        });
    };

    /**
     * This function applies table logic for the Action according to the Target Type. if Taregt Type is URL, then Action field should be disabled else
     * if it's Intent, then the Action field should be enabled.
     *
     * @param {object} oTargetTypeComboBox The target type field
     */
    oUtils.onTargetTypeChange = function (oTargetTypeComboBox) {
        var sId = oTargetTypeComboBox.getParameter('id');
        var aParentCells = sap.ui.getCore().byId(sId).getParent().getCells();

        var sTargetType = oTargetTypeComboBox.getSource().getSelectedKey(); // ('newValue');
        if (sTargetType == "INT") {
            aParentCells[3].setEnabled(true); // Action field
            aParentCells[2].setShowValueHelp(true); // shows value Help for the Navigation Target field.
            aParentCells[2].setValue("");
        } else {
            aParentCells[2].setShowValueHelp(false); // Hides value Help for the Navigation Target field.
            aParentCells[2].setValue("");
            aParentCells[3].setEnabled(false); // Action field
            aParentCells[3].setValue("");
        }
    };

    /**
     * This function adds new row in the tile actions table.
     *
     * @param {object} oConfigurationView The configuration view to add new row in the tile actions table.
     */
    oUtils.addTileActionsRow = function (oConfigurationView) {
        var oModel = oConfigurationView.getModel();
        var rows = oModel.getProperty('/config/tile_actions_rows');

        // Init a row template for adding new empty row to the tile actions table
        var newParamRow = this.getEmptyTileActionsRowObj();
        rows.push(newParamRow);
        oModel.setProperty('/config/tile_actions_rows', rows);
    };

    /**
     * This function delete rows in the tile actions table.
     *
     * @param {object} oConfigurationView The configuration view to delete rows from the tile actions table.
     */
    oUtils.deleteTileActionsRow = function (oConfigurationView) {
        var oModel = oConfigurationView.getModel();
        var rows = oModel.getProperty('/config/tile_actions_rows');

        var table = oConfigurationView.byId("tileActions");
        var aSelectedItemsIndexes = table.getSelectedIndices();
        var aSortedDescending = aSelectedItemsIndexes.sort(function (a, b) {
            return b - a;
        }).slice();

        for (var i = 0; i < aSortedDescending.length; i++) {
            table.removeSelectionInterval(aSortedDescending[i], aSortedDescending[i]);// Make sure to turn off the selection or it will pass to the
            // next row.
            rows.splice(aSortedDescending[i], 1); // There is a major assumption here that the index in the model is identical to the index in the
            // table !!!
        }
        oModel.setProperty('/config/tile_actions_rows', rows);
    };

    /**
     * Checks the input of given configuration View.
     *
     * @param {object} oConfigurationView The configuration view to check the input for.
     * @param {oControlEvent} The event that triggered the call to this function.
     */
    oUtils.checkInput = function (oConfigurationView, oControlEvent) {
        var oTranslationBundle = oUtils.getResourceBundleModel().getResourceBundle(), oIconURLInput = oConfigurationView.byId("iconInput"), oUseSemObjNav = oConfigurationView.byId("useLpdCheckbox"), oSemObjectInput = oConfigurationView.byId("navigation_semantic_objectInput") || oConfigurationView.byId("semantic_objectInput"), oSemActionInput = oConfigurationView.byId("navigation_semantic_actionInput") || oConfigurationView.byId("semantic_actionInput"), sNewValue = jQuery.trim(oControlEvent.getParameter("newValue")), oValueState = sap.ui.core.ValueState.None, oValueStateText = null;

        switch (oControlEvent.getSource()) {
            case oIconURLInput:
                if (sNewValue != "" && sNewValue.substring(0, 11) !== "sap-icon://") {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.display_icon_url.warning");
                }
                break;
            case oUseSemObjNav:
                if (!oUseSemObjNav.getSelected()) {
                    oSemActionInput.setValueState(sap.ui.core.ValueState.None);
                    oSemObjectInput.setValueState(sap.ui.core.ValueState.None);
                }
                break;
            case oSemObjectInput:
//                aItems = oSemObjectInput.getModel("suggest").getProperty("/items");
//                bFound = false;
//                for (j = 0; j < aItems.length; j = j + 1) {
//                    if (aItems[j].obj === sNewValue) {
//                        bFound = true;
//                        break;
//                    }
//                }
                if (/[\-#&? ]/.test(sNewValue)) {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.semantic_object.error_invalid_chars");
//                } else if (!bFound) {
//                    oValueState = sap.ui.core.ValueState.Warning;
//                    oValueStateText = oTranslationBundle.getText("configuration.semantic_object.warning");
                } else if (sNewValue == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                }
                break;
            case oSemActionInput:
                if (/[\-#&? ]/.test(sNewValue)) {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.semantic_action.error_invalid_chars");
                } else if (sNewValue == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                }
                break;
            default:
                break;
        }

        if (oValueState) {
            oControlEvent.getSource().setValueState(oValueState);
            if (oValueStateText !== null) {
                oControlEvent.getSource().setValueStateText(oValueStateText || "");
            }
        }
    };

    /**
     * Checks the input of given configuration View.
     *
     * @param {object} oConfigurationView The configuration view to check the input for.
     */
    oUtils.checkInputOnSaveConfig = function (oConfigurationView) {
        var oIconURLInput = oConfigurationView.byId("iconInput");
        var oSemObjectInput = oConfigurationView.byId("navigation_semantic_objectInput");
        var oSemActionInput = oConfigurationView.byId("navigation_semantic_actionInput");
        var oUseSemObjNav = oConfigurationView.byId("useLpdCheckbox");
        var oTranslationBundle = oUtils.getResourceBundleModel().getResourceBundle();
//       var aItems = oSemObjectInput.getModel("suggest").getProperty("/items");
        var bReject = false;
        // Icon input check
        if (oIconURLInput.getValue() != "" && !oUtils.isIconURIValid(oIconURLInput.getValue())) {
            oIconURLInput.setValueState(sap.ui.core.ValueState.Error);
            oIconURLInput.setValueStateText(oTranslationBundle.getText("configuration.display_icon_url.warning"));
            bReject = true;
        }
        // Semantic object input check
//        for (j = 0; j < aItems.length; j = j + 1) {
//            if (aItems[j].obj === oSemObjectInput.getValue()) {
//                bFound = true;
//                break;
//            }
//        }
        if (oUseSemObjNav.getSelected() && /[\-#&? ]/.test(oSemObjectInput.getValue())) {
            oSemObjectInput.setValueState(sap.ui.core.ValueState.Error);
            oSemObjectInput.setValueStateText(oTranslationBundle.getText("configuration.semantic_object.error_invalid_chars"));
            bReject = true;
//        } else if (oUseSemObjNav.getSelected() && !bFound) {
//            oSemObjectInput.setValueState(sap.ui.core.ValueState.Warning);
//            oSemObjectInput.setValueStateText(oTranslationBundle.getText("configuration.semantic_object.warning"));
        } else if (oUseSemObjNav.getSelected() && oSemObjectInput.getValue() == "") {
            oSemObjectInput.setValueState(sap.ui.core.ValueState.Error);
            bReject = true;
        }
        // Semantic action input check
        if (/[\-#&? ]/.test(oSemActionInput.getValue())) {
            oSemActionInput.setValueState(sap.ui.core.ValueState.Error);
            oSemActionInput.setValueStateText(oTranslationBundle.getText("configuration.semantic_action.error_invalid_chars"));
            bReject = true;
        } else if (oUseSemObjNav.getSelected() && oSemActionInput.getValue() == "") {
            oSemActionInput.setValueState(sap.ui.core.ValueState.Error);
            bReject = true;
        }
        return bReject;
    };

    oUtils.checkTileActions = function (oConfigurationView) {
        var aTableContent = oConfigurationView.getModel().getProperty("/config/tile_actions_rows");
        var oTranslationBundle = oUtils.getResourceBundleModel().getResourceBundle();
        var bReject = false;
        for (var i = 0; i < aTableContent.length; i++) {
            if (!aTableContent[i].menu_title && (aTableContent[i].navigation_target || aTableContent.length > 1)) {
                aTableContent[i].valueState = sap.ui.core.ValueState.Error;
                bReject = true;
            } else {
                aTableContent[i].valueState = sap.ui.core.ValueState.None;
            }
            // check icon
            if (aTableContent[i].icon) {
                if (!oUtils.isIconURIValid(aTableContent[i].icon)) {
                    aTableContent[i].iconValueState = sap.ui.core.ValueState.Error;
                    aTableContent[i].iconValueStateText = oTranslationBundle.getText("configuration.display_icon_url.warning");
                    bReject = true;
                }
            }
        }
        oConfigurationView.getModel().setProperty("/config/tile_actions_rows", aTableContent);

        return bReject;
    };

    /**
     * Checks if the given icon URI is valid and idenifies an icon from the IconPool.
     *
     * @param {string} sIconURI The icon URI to check
     */
    oUtils.isIconURIValid = function (sIconURI) {
        var aResult = [];
        var sCollection = "";
        var sIcon = "";
        var sValidIconURI = "";

        aResult = /sap-icon:\/\/(.+)\//.exec(sIconURI);
        if (aResult) {
            sCollection = aResult[1];

            aResult = /\/\/.+\/(.+)/.exec(sIconURI);
            aResult ? sIcon = aResult[1] : sIcon = "";

            sValidIconURI = sap.ui.core.IconPool.getIconURI(sIcon, sCollection);
            if (sValidIconURI != sIconURI) {
                return false;
            }
        } else {
            aResult = /sap-icon:\/\/(.+)/.exec(sIconURI);
            if (aResult) {
                sIcon = aResult[1];
                if (!sap.ui.core.IconPool.getIconInfo(sIcon)) {
                    return false;
                }
            } else {
                return false;
            }
        }

        return true;
    };

    /**
     * Checks the input of given Target mapping configuration View.
     *
     * @param {object} oConfigurationView The configuration view to check the input for.
     * @param {oControlEvent} The event that triggered the call to this function.
     */
    oUtils.checkTMInput = function (oConfigurationView, oControlEvent) {
        var oTranslationBundle = oUtils.getResourceBundleModel().getResourceBundle(), oSemObjectInput = oConfigurationView.byId("semantic_objectInput"), oSemActionInput = oConfigurationView.byId("semantic_actionInput"), oTargetAppTitleInput = oConfigurationView.byId("target_application_descriptionInput"), oTargetAppURLInput = oConfigurationView.byId("target_application_urlInput"), oTargetAppCompInput = oConfigurationView.byId("target_application_componentInput"), oNavProviderRoleInput = oConfigurationView.byId("navigation_provider_roleInput"), oNavProviderInstanceInput = oConfigurationView.byId("navigation_provider_instanceInput"), oTargetAppAliasInput = oConfigurationView.byId("target_application_aliasInput"), oTargetAppIdInput = oConfigurationView.byId("target_application_idInput"),
        // /*oTargetAppLpdCust =*/ oConfigurationView.byId("typeLpd_cust"),
        // /*oTargetAppSapui5 =*/ oConfigurationView.byId("typeSapui5"),
        sNewValue = jQuery.trim(oControlEvent.getParameter("newValue")), oValueState = sap.ui.core.ValueState.None, oValueStateText = null;

        switch (oControlEvent.getSource()) {
            case oSemObjectInput:
//                aItems = oSemObjectInput.getModel("suggest").getProperty("/items");
//                bFound = false;
//                for (j = 0; j < aItems.length; j = j + 1) {
//                    if (aItems[j].obj === sNewValue) {
//                        bFound = true;
//                        break;
//                    }
//                }
                if (/[\-#&? ]/.test(sNewValue)) {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.semantic_object.error_invalid_chars");
                } //else if (!bFound) {
//                    oValueState = sap.ui.core.ValueState.Warning;
//                    oValueStateText = oTranslationBundle.getText("configuration.semantic_object.warning");
//                }
                if (oSemActionInput.getValue() == "") {
                    oSemActionInput.setValueState(sap.ui.core.ValueState.Error);
                }
                break;
            case oSemActionInput:
                if (/[\-#&? ]/.test(sNewValue)) {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.semantic_action.error_invalid_chars");
                } else if (sNewValue == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                }
                break;
            case oTargetAppTitleInput:
                if (sNewValue == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                }
                break;
            case oTargetAppURLInput:
                if (sNewValue != "" && !(/^[-~+,;:?%&#=/.\w]+$/.test(sNewValue))) {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.url.error_invalid_chars");
                }
                break;
            case oTargetAppCompInput:
                if (sNewValue == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                } else if (sNewValue.substring(0, 17) == "SAPUI5.Component=") {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.component.error_invalid_input");
                }
                break;
            case oNavProviderRoleInput:
                if (sNewValue == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                } else if (!(/^[\w/]+$/.test(sNewValue))) {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.role.error_invalid_chars");
                }
                break;
            case oNavProviderInstanceInput:
                if (sNewValue == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                } else if (!(/^[\w/]+$/.test(sNewValue))) {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.instance.error_invalid_chars");
                }
                break;
            case oTargetAppAliasInput:
                if (sNewValue == "" && oTargetAppIdInput.getValue() == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.alias_id.warning");
                } else if (sNewValue != "" && oTargetAppIdInput.getValue() != "") {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.alias_id.warning");
                    oTargetAppIdInput.setValueState(oValueState);
                    oTargetAppIdInput.setValueStateText(oValueStateText);
                } else {
                    oTargetAppIdInput.setValueState(sap.ui.core.ValueState.None);
                }
                break;
            case oTargetAppIdInput:
                if (sNewValue == "" && oTargetAppAliasInput.getValue() == "") {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.alias_id.warning");
                } else if (sNewValue != "" && oTargetAppAliasInput.getValue() != "") {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.alias_id.warning");
                    oTargetAppAliasInput.setValueState(oValueState);
                    oTargetAppAliasInput.setValueStateText(oValueStateText);
                } else if (sNewValue != "" && !(/^[A-Fa-f0-9]+$/.test(sNewValue))) {
                    oValueState = sap.ui.core.ValueState.Error;
                    oValueStateText = oTranslationBundle.getText("configuration.target_application.alias_id.error_invalid_chars");
                } else {
                    oTargetAppAliasInput.setValueState(sap.ui.core.ValueState.None);
                }
                break;
            default:
                break;
        }

        if (oValueState) {
            oControlEvent.getSource().setValueState(oValueState);
            if (oValueStateText !== null) {
                oControlEvent.getSource().setValueStateText(oValueStateText || "");
            }
        }
    };

    /**
     * Checks the input of given configuration View.
     *
     * @param {object} oConfigurationView The configuration view to check the input for.
     */
    oUtils.checkTMInputOnSaveConfig = function (oConfigurationView) {
        var oTranslationBundle = oUtils.getResourceBundleModel().getResourceBundle();
        var oSemObjectInput = oConfigurationView.byId("semantic_objectInput");
        var oSemActionInput = oConfigurationView.byId("semantic_actionInput");
        var oTargetAppTitleInput = oConfigurationView.byId("target_application_descriptionInput");
        var oTargetAppURLInput = oConfigurationView.byId("target_application_urlInput");
        var oTargetAppCompInput = oConfigurationView.byId("target_application_componentInput");
        var oNavProviderRoleInput = oConfigurationView.byId("navigation_provider_roleInput");
        var oNavProviderInstanceInput = oConfigurationView.byId("navigation_provider_instanceInput");
        var oTargetAppAliasInput = oConfigurationView.byId("target_application_aliasInput");
        var oTargetAppIdInput = oConfigurationView.byId("target_application_idInput");
        var oNavigationProvider = oConfigurationView.byId("targetTypeInput");
        var oTransaction = oConfigurationView.byId("target_transactionInput");
        var oWDApplication = oConfigurationView.byId("target_web_dynpro_applicationInput");
        var oFormFactorDesktopInput = oConfigurationView.byId("desktopCB");
        var oFormFactorTabletInput = oConfigurationView.byId("tabletCB");
        var oFormFactorPhoneInput = oConfigurationView.byId("phoneCB");
//        var aItems = oSemObjectInput.getModel("suggest").getProperty("/items");
        var bReject = false;

        // Semantic object input check
        oSemObjectInput.setValue(oSemObjectInput.getValue().trim());
//        if (aItems != undefined) {
//            for (j = 0; j < aItems.length; j = j + 1) {
//                if (aItems[j].obj === oSemObjectInput.getValue()) {
//                    bFound = true;
//                    break;
//                }
//            }
//        }
        if (/[\-#&? ]/.test(oSemObjectInput.getValue())) {
            oSemObjectInput.setValueState(sap.ui.core.ValueState.Error);
            oSemObjectInput.setValueStateText(oTranslationBundle.getText("configuration.semantic_object.error_invalid_chars"));
            bReject = true;
        } //else if (!bFound) {
//            oSemObjectInput.setValueState(sap.ui.core.ValueState.Warning);
//            oSemObjectInput.setValueStateText(oTranslationBundle.getText("configuration.semantic_object.warning"));
//        }
        // Semantic Action input check
        oSemActionInput.setValue(oSemActionInput.getValue().trim());
        if (/[\-#&? ]/.test(oSemActionInput.getValue())) {
            oSemActionInput.setValueState(sap.ui.core.ValueState.Error);
            oSemActionInput.setValueStateText(oTranslationBundle.getText("configuration.semantic_action.error_invalid_chars"));
            bReject = true;
        } else if (oSemActionInput.getValue() == "") {
            oSemActionInput.setValueState(sap.ui.core.ValueState.Error);
            bReject = true;
        }

        var sNavProvider = oConfigurationView.getModel().getProperty("/config/navigation_provider");
        // SAPUI5 Fiori App radio is selected
        if (sNavProvider === "SAPUI5") {
            // Application title
            if (oTargetAppTitleInput.getValue() == "") {
                oTargetAppTitleInput.setValueState(sap.ui.core.ValueState.Error);
                bReject = true;
            }
            // Application URL
            if (oTargetAppURLInput.getValue() != "" && !(/^[-~+,;:?%&#=/.\w]+$/.test(oTargetAppURLInput.getValue()))) {
                oTargetAppURLInput.setValueState(sap.ui.core.ValueState.Error);
                oTargetAppURLInput.setValueStateText(oTranslationBundle.getText("configuration.target_application.url.error_invalid_chars"));
                bReject = true;
            }
            // Application component
            if (oTargetAppCompInput.getValue() == "") {
                oTargetAppCompInput.setValueState(sap.ui.core.ValueState.Error);
                bReject = true;
            } else if (oTargetAppCompInput.getValue().substring(0, 17) == "SAPUI5.Component=") {
                oTargetAppCompInput.setValueState(sap.ui.core.ValueState.Error);
                oTargetAppCompInput.setValueStateText(oTranslationBundle.getText("configuration.target_application.component.error_invalid_input"));
                bReject = true;
            }
        } else if (sNavProvider === "LPD") {
            // Launchpad Role
            if (oNavProviderRoleInput.getValue() == "") {
                oNavProviderRoleInput.setValueState(sap.ui.core.ValueState.Error);
                bReject = true;
            }
            if (!(/^[\w]+$/.test(oNavProviderRoleInput.getValue()))) {
                oNavProviderRoleInput.setValueState(sap.ui.core.ValueState.Error);
                var oValStateText = oTranslationBundle.getText("configuration.target_application.role.error_invalid_chars");
                oNavProviderRoleInput.setValueStateText(oValStateText);
                bReject = true;
            }
            // Launchpad instance
            if (oNavProviderInstanceInput.getValue() == "") {
                oNavProviderInstanceInput.setValueState(sap.ui.core.ValueState.Error);
                bReject = true;
            }
            if (!(/^[\w]+$/.test(oNavProviderInstanceInput.getValue()))) {
                oNavProviderInstanceInput.setValueState(sap.ui.core.ValueState.Error);
                var oValStateText = oTranslationBundle.getText("configuration.target_application.instance.error_invalid_chars");
                oNavProviderInstanceInput.setValueStateText(oValStateText);
                bReject = true;
            }
            // Application Alias and Application id
            if (oTargetAppAliasInput.getValue() == "" && oTargetAppIdInput.getValue() == "") {
                var oValStateText = oTranslationBundle.getText("configuration.target_application.alias_id.warning");
                oTargetAppAliasInput.setValueState(sap.ui.core.ValueState.Error);
                oTargetAppAliasInput.setValueStateText(oValStateText);
                oTargetAppIdInput.setValueState(sap.ui.core.ValueState.Error);
                oTargetAppIdInput.setValueStateText(oValStateText);
                bReject = true;
            }
            if (oTargetAppAliasInput.getValue() != "" && oTargetAppIdInput.getValue() != "") {
                var oValStateText = oTranslationBundle.getText("configuration.target_application.alias_id.warning");
                oTargetAppAliasInput.setValueState(sap.ui.core.ValueState.Error);
                oTargetAppAliasInput.setValueStateText(oValStateText);
                oTargetAppIdInput.setValueState(sap.ui.core.ValueState.Error);
                oTargetAppIdInput.setValueStateText(oValStateText);
                bReject = true;
            }
            // Application id
            if (oTargetAppIdInput.getValue() != "" && !(/^[A-Fa-f0-9]+$/.test(oTargetAppIdInput.getValue()))) {
                oTargetAppIdInput.setValueState(sap.ui.core.ValueState.Error);
                oTargetAppIdInput.setValueStateText(oTranslationBundle.getText("configuration.target_application.alias_id.error_invalid_chars"));
                bReject = true;
            }

        } else if (sNavProvider === "TR") {
            if (oTransaction.getValue() == "") {
                oTransaction.setValueState(sap.ui.core.ValueState.Error);
                bReject = true;
            }
        } else if (sNavProvider === "WDA") {
            if (oWDApplication.getValue() == "") {
                oWDApplication.setValueState(sap.ui.core.ValueState.Error);
                bReject = true;
            }
        } else if (sNavProvider === "URL") {
            if (oTargetAppURLInput.getValue() == "") {
                oTargetAppURLInput.setValueState(sap.ui.core.ValueState.Error);
                bReject = true;
            } else if (!(/^[-~+,;:?%&#=/.\w]+$/.test(oTargetAppURLInput.getValue()))) {
                oTargetAppURLInput.setValueState(sap.ui.core.ValueState.Error);
                oTargetAppURLInput.setValueStateText(oTranslationBundle.getText("configuration.target_application.url.error_invalid_chars"));
                bReject = true;
            }
        } else {
            oNavigationProvider.setValueState(sap.ui.core.ValueState.Error);
            oNavigationProvider.setValueStateText(oTranslationBundle.getText("configuration.navigation_provider.error_invalid_provider"));
            bReject = true;
        }

        if (!oFormFactorDesktopInput.getSelected() && !oFormFactorTabletInput.getSelected() && !oFormFactorPhoneInput.getSelected()) {
            var oValStateText = oTranslationBundle.getText("configuration.form_factor.warning");
            oFormFactorDesktopInput.setValueState(sap.ui.core.ValueState.Error);
            oFormFactorDesktopInput.setValueStateText(oValStateText);
            oFormFactorTabletInput.setValueState(sap.ui.core.ValueState.Error);
            oFormFactorTabletInput.setValueStateText(oValStateText);
            oFormFactorPhoneInput.setValueState(sap.ui.core.ValueState.Error);
            oFormFactorPhoneInput.setValueStateText(oValStateText);
            bReject = true;
        }
        return bReject;

    };

    oUtils.updateTooltipForDisabledProperties = function (oConfigurationView) {

        // change tooltip for all translatable properties in case userlocale != original Locale
        var oModel = oConfigurationView.getModel();
        var isLocaleSuitable = oModel.getProperty("/config/isLocaleSuitable");
        if (!isLocaleSuitable) {
            var rb = oUtils.getResourceBundleModel().getResourceBundle();
            var message = rb.getText("edit_configuration.original_locale_not_fit_tooltip", [
                oModel.getProperty("/config/userLocale"), oModel.getProperty("/config/orgLocale")
            ]);
            oConfigurationView.byId("titleInput").setTooltip(message);
            oConfigurationView.byId("subtitleInput").setTooltip(message);
            oConfigurationView.byId("keywordsInput").setTooltip(message);
            oConfigurationView.byId("infoInput").setTooltip(message);
        }
    };

    oUtils.updateMessageStripForOriginalLanguage = function (oConfigurationView) {
        var oModel = oConfigurationView.getModel();
        if (oModel.getProperty("/config/isLocaleSuitable") === false) {
            var sMessageText = oUtils.getResourceBundleModel().getResourceBundle().getText("edit_configuration.original_locale_not_fit_message", [
                oModel.getProperty("/config/orgLocale").toUpperCase(), oModel.getProperty("/config/userLocale").toUpperCase()
            ]);
            var oMessageStrip = oConfigurationView.byId("messageStrip");
            oMessageStrip.setVisible(true);
            oMessageStrip.setText(sMessageText);
            oMessageStrip.setType(sap.ui.core.MessageType.Warning);
        }
    };

    /**
     * Creates a model for the object selection list control. Loads all semantic objects and puts them into the cache as well as into the list of
     * suggested items.
     *
     * @param {object} oConfigController the configuration controller
     * @param {object} oSemanticObjectSelector the view of the selection control
     * @param {array} aDefaultValuesOverride if given, the default values that are in any case selectable ("*" and "") are overwritten. Must be in
     *        form <code>[{targetObject: "{semantic object id}", targetName: "{textual representation}"}]</code>
     * @private
     */
    oUtils.createSemanticObjectModel = function (oConfigController, oSemanticObjectSelector, aDefaultValuesOverride) {
        var oView = oConfigController.getView(),
        // the URI of the semantic objects OData Servicw
        sUri = "/sap/opu/odata/UI2/INTEROP/SemanticObjects",
        // default selections that are prepended to the results of the OData call.
        // Options: "" (no sem obj) or "*" (all sem objects)
        aDefaultValues = [
            {
                obj: "",
                name: ""
            }, {
                obj: "*",
                name: "*"
            }
        ],
        // Note: copy the arrays!
        aDefaultObjects = (aDefaultValuesOverride || aDefaultValues).slice(0),
        // set model first only to default values
        oSelectorModel = new sap.ui.model.json.JSONModel();
        // required to make the suggestion list show all entries
        // the default value for the size limit is 100!
        oSelectorModel.setSizeLimit(999999);

        oSelectorModel.setProperty("/value", "");
        oSelectorModel.setProperty("/enabled", true);

        oSemanticObjectSelector.bindAggregation("suggestionItems", "suggest>/items", new sap.ui.core.Item({
            text: "{suggest>obj}"
        }));
        oSemanticObjectSelector.setModel(oSelectorModel, "suggest");

        if (oUtils.aData.length > 0) {
            oSelectorModel.setData({
                items: aDefaultObjects.concat(oUtils.aData)
            }, true); // merge
            return;
        }

        // read semantic objects from interop service
        OData.read({
            requestUri: sUri,
            headers: {
                "Accept": "application/json"
            }
        },
        // sucess
        function (oData, oResponse) {
            var sId, sText, i;
            for (i = 0; i < oData.results.length; i = i + 1) {
                sId = oData.results[i].id;
                sText = oData.results[i].text;
                oUtils.aData.push({
                    obj: sId,
                    name: sText || sId
                });
            }
            oSelectorModel.setData({
                items: aDefaultObjects.concat(oUtils.aData)
            }, true); // merge
        },
        // fail
        function (oError) {
            var sMessage = oError && oError.message ? oError.message : oError;
            if (oError.response) {
                sMessage += " - " + oError.response.statusCode + " " + oError.response.statusText;
            }
            jQuery.sap.log.error("Could not fetch data: " + sUri + ": " + sMessage, null,
            // the source component of the error - needs to be set within the parent controller control
            (oView.getViewName() || "sap.ushell.components.tiles.utils"));
        });
    };

    oUtils.createRoleModel = function (oConfigController, oRoleSelector, oInstanceSelector) {
        var oView = oConfigController.getView(),
        // the URI of the semantic objects OData Servicw
        sUri = "/sap/opu/odata/UI2/INTEROP/GetLPDInstances",
        // set model first only to default values
        oSelectorModel = new sap.ui.model.json.JSONModel(), oInstanceSelectorModel = new sap.ui.model.json.JSONModel();
        // required to make the suggestion list show all entries
        // the default value for the size limit is 100!
        oSelectorModel.setSizeLimit(999999);
        oInstanceSelectorModel.setSizeLimit(999999);

        oSelectorModel.setProperty("/value", "");
        oSelectorModel.setProperty("/enabled", true);
        oInstanceSelectorModel.setProperty("/value", "");
        oInstanceSelectorModel.setProperty("/enabled", true);

        var itemTemplate = new sap.m.ColumnListItem({
            cells: [
                new sap.m.Label({
                    text: "{role}"
                }), new sap.m.Label({
                    text: "{instance}"
                })
            ]
        });

        oRoleSelector.bindAggregation("suggestionRows", "/items", itemTemplate);
        oInstanceSelector.bindAggregation("suggestionItems", "/items", new sap.ui.core.Item({
            text: "{instance}"
        }));
        oInstanceSelector.setModel(oInstanceSelectorModel);

        oRoleSelector.setModel(oSelectorModel);
        oRoleSelector.attachSuggestionItemSelected(function (evt) {
            oInstanceSelector.setValue(evt.getParameter("selectedRow").getCells()[1].getText());
            oInstanceSelector.fireChange();
        });

        if (oUtils.aRoleData.length > 0) {
            oSelectorModel.setData({
                items: oUtils.aRoleData
            }, false);
            oInstanceSelectorModel.setData({
                items: oUtils.aRoleData
            }, false);
            return;
        }

        // read semantic objects from interop service
        OData.read({
            requestUri: sUri,
            headers: {
                "Accept": "application/json"
            }
        },
        // sucess
        function (oData, oResponse) {
            var sRole, sInstance, i;
            for (i = 0; i < oData.results.length; i = i + 1) {
                sRole = oData.results[i].lpdRole;
                sInstance = oData.results[i].instance;
                oUtils.aRoleData.push({
                    role: sRole,
                    instance: sInstance
                });
            }
            oSelectorModel.setData({
                items: oUtils.aRoleData
            }, true); // merge
            oInstanceSelectorModel.setData({
                items: oUtils.aRoleData
            }, true); // merge
        },
        // fail
        function (oError) {
            var sMessage = oError && oError.message ? oError.message : oError;
            if (oError.response) {
                sMessage += " - " + oError.response.statusCode + " " + oError.response.statusText;
            }
            jQuery.sap.log.error("Could not fetch data: " + sUri + ": " + sMessage, null,
            // the source component of the error - needs to be set within the parent controller control
            (oView.getViewName() || "sap.ushell.components.tiles.utils"));
        });
    };

    oUtils.createAliasModel = function (oConfigController, oAliasSelector) {
        var oView = oConfigController.getView(), oConfiguration,
            // the URI of the semantic objects OData Servicw
            sUri = "/sap/opu/odata/UI2/INTEROP/GetLPDAppAlias",
            // set model first only to default values
            oSelectorModel = new sap.ui.model.json.JSONModel();

        var utilsRT = sap.ui.require("sap/ushell/components/tiles/utilsRT");

        // required to make the suggestion list show all entries
        // the default value for the size limit is 100!
        oSelectorModel.setSizeLimit(999999);

        oSelectorModel.setProperty("/value", "");
        oSelectorModel.setProperty("/enabled", true);

        oAliasSelector.bindAggregation("suggestionItems", "/items", new sap.ui.core.Item({
            text: "{alias}"
        }));
        oAliasSelector.setModel(oSelectorModel);

        oConfiguration = utilsRT.getConfiguration(oView.oViewData.chip, true, true);
        if (oConfiguration && oConfiguration.navigation_provider_role && oConfiguration.navigation_provider_instance) {
            if (oConfiguration.navigation_provider_role != "" && oConfiguration.navigation_provider_instance != "") {
                sUri = sUri + "?role='" + oConfiguration.navigation_provider_role + "'&instance='" + oConfiguration.navigation_provider_instance + "'";
            }
        }

        // read semantic objects from interop service
        OData.read({
            requestUri: sUri,
            headers: {
                "Accept": "application/json"
            }
        },
        // sucess
        function (oData, oResponse) {
            var sAlias, sRole, sInstance, i, oModelData;
            oUtils.aAliasData = [];
            for (i = 0; i < oData.results.length; i = i + 1) {
                sAlias = oData.results[i].lpdApplicationAlias;
                sRole = oData.results[i].lpdRole;
                sInstance = oData.results[i].lpdInstance;
                oUtils.aAliasData.push({
                    role: sRole,
                    instance: sInstance,
                    alias: sAlias
                });
            }
            oModelData = oSelectorModel.getData();
            if (oModelData) {
                oModelData.items = oUtils.aAliasData;
            } else {
                oModelData = {
                    items: oUtils.aAliasData
                };
            }
            oSelectorModel.setData(oModelData, false);
        },
        // fail
        function (oError) {
            var sMessage = oError && oError.message ? oError.message : oError;
            if (oError.response) {
                sMessage += " - " + oError.response.statusCode + " " + oError.response.statusText;
            }
            jQuery.sap.log.error("Could not fetch data: " + sUri + ": " + sMessage, null,
            // the source component of the error - needs to be set within the parent controller control
            (oView.getViewName() || "sap.ushell.components.tiles.utils"));
        });
    };

    oUtils.updateAliasModel = function (oView, oAliasSelector) {
        var sUri, sInstance, sRole, oSelectorModel = oAliasSelector.getModel();

        sInstance = oView.byId("navigation_provider_instanceInput").getValue();
        sRole = oView.byId("navigation_provider_roleInput").getValue();

        sUri = "/sap/opu/odata/UI2/INTEROP/GetLPDAppAlias?role='" + sRole + "'&instance='" + sInstance + "'";

        // read semantic objects from interop service
        OData.read({
            requestUri: sUri,
            headers: {
                "Accept": "application/json"
            }
        },
        // sucess
        function (oData, oResponse) {
            var sAlias, sRole, sInstance, i, oModelData;
            oUtils.aAliasData = [];
            for (i = 0; i < oData.results.length; i = i + 1) {
                sAlias = oData.results[i].lpdApplicationAlias;
                sRole = oData.results[i].lpdRole;
                sInstance = oData.results[i].lpdInstance;
                oUtils.aAliasData.push({
                    role: sRole,
                    instance: sInstance,
                    alias: sAlias
                });
            }
            oModelData = oSelectorModel.getData();
            if (oModelData) {
                oModelData.items = oUtils.aAliasData;
            } else {
                oModelData = {
                    items: oUtils.aAliasData
                };
            }
            oSelectorModel.setData(oModelData, false);
        },
        // fail
        function (oError) {
            var sMessage = oError && oError.message ? oError.message : oError;
            if (oError.response) {
                sMessage += " - " + oError.response.statusCode + " " + oError.response.statusText;
            }
            jQuery.sap.log.error("Could not fetch data: " + sUri + ": " + sMessage, null,
            // the source component of the error - needs to be set within the parent controller control
            (oView.getViewName() || "sap.ushell.components.tiles.utils"));
        });
    };

    oUtils.createActionModel = function (oConfigController, oActionSelector) {
        var oItemModel = new sap.ui.model.json.JSONModel();
        var oView = oConfigController.getView(), oConfiguration, sAction;
        var utilsRT = sap.ui.require("sap/ushell/components/tiles/utilsRT");

        oItemModel.setData({
            "items": [
                {
                    "text": "display"
                }, {
                    "text": "approve"
                }, {
                    "text": "displayFactSheet"
                }, {
                    "text": "manage"
                }, {
                    "text": "create"
                }, {
                    "text": "monitor"
                }, {
                    "text": "track"
                }, {
                    "text": "change"
                }, {
                    "text": "register"
                }, {
                    "text": "release"
                }, {
                    "text": "analyzeKPIDetails"
                }, {
                    "text": "lookup"
                }, {
                    "text": "manageLineItems"
                }
            ]
        });

        oUtils.aActionData = oItemModel.getData();

        oConfiguration = utilsRT.getConfiguration(oView.oViewData.chip, true, true);
        sAction = oConfiguration.navigation_semantic_action || oConfiguration.semantic_action;
        if (sAction) {
            if (!oItemModel.getData().items.some(function (oItem) {
                return oItem.text === sAction;
            })) {
                oItemModel.getData().items.push({
                    "text": sAction
                });
            }
        }

        oActionSelector.bindAggregation("suggestionItems", "items>/items", new sap.ui.core.Item({
            text: "{items>text}"
        }));

        oActionSelector.setModel(oItemModel, "items");
        oActionSelector.getBinding("suggestionItems").sort(new sap.ui.model.Sorter("text", false));
    };

    oUtils.createNavigationProviderModel = function (oConfigController, oTargetTypeSelector) {
        var oItemModel = new sap.ui.model.json.JSONModel();
        var oResourcesBundle = oUtils.getResourceBundleModel().getResourceBundle();

        oItemModel.setData({
            "items": [
                {
                    "key": "SAPUI5",
                    "text": oResourcesBundle.getText('configuration.target_application.sapui5')
                }, {
                    "key": "LPD",
                    "text": oResourcesBundle.getText('configuration.target_application.lpd_cust')
                }, {
                    "key": "TR",
                    "text": oResourcesBundle.getText('configuration.target_application.transaction')
                }, {
                    "key": "WDA",
                    "text": oResourcesBundle.getText('configuration.target_application.web_dynpro')
                }, {
                    "key": "URL",
                    "text": oResourcesBundle.getText('configuration.target_application.url')
                }
            ]
        });

        oTargetTypeSelector.bindItems("items>/items", new sap.ui.core.Item({
            key: "{items>key}",
            text: "{items>text}"
        }));
        oTargetTypeSelector.setModel(oItemModel, "items");
        oTargetTypeSelector.getBinding("items").sort(new sap.ui.model.Sorter("text", false));
    };

    /**
     * Displays the input fields relavent based on application type SAPUI5/LPD_CUST.
     *
     * @param {object} oConfigurationView The configuration view to check the input for.
     */
    oUtils.displayApplicationTypeFields = function (sApplicationType, oConfigurationView) {

        switch (sApplicationType) {

            case 'LPD':
                oUtils.displayLpdCustApplicationTypeFields(oConfigurationView);
                break;
            case 'SAPUI5':
                oUtils.displaySapui5ApplicationTypeFields(oConfigurationView);
                break;
            case 'TR':
                oUtils.displayTransactionApplicationTypeFields(oConfigurationView);
                break;
            case 'WDA':
                oUtils.displayWebDynproApplicationTypeFields(oConfigurationView);
                break;
            case 'URL':
                oUtils.displayURLApplicationTypeFields(oConfigurationView);
                break;
        }

    };

    /**
     * Displays the input fields relavent for application type SAPUI5.
     *
     * @param {object} oConfigurationView The configuration view to check the input for.
     */
    oUtils.displaySapui5ApplicationTypeFields = function (oConfigurationView) {

        oConfigurationView.byId('navigation_provider_role').setVisible(false);
        oConfigurationView.byId('navigation_provider_roleInput').setVisible(false);

        oConfigurationView.byId('navigation_provider_instance').setVisible(false);
        oConfigurationView.byId('navigation_provider_instanceInput').setVisible(false);

        oConfigurationView.byId('target_application_alias').setVisible(false);
        oConfigurationView.byId('target_application_aliasInput').setVisible(false);

        oConfigurationView.byId('target_application_id').setVisible(false);
        oConfigurationView.byId('target_application_idInput').setVisible(false);

        oConfigurationView.byId('application_description').setVisible(true);
        oConfigurationView.byId('target_application_descriptionInput').setVisible(true);

        oConfigurationView.byId('application_url').setVisible(true);
        oConfigurationView.byId('target_application_urlInput').setVisible(true);

        oConfigurationView.byId('application_component').setVisible(true);
        oConfigurationView.byId('target_application_componentInput').setVisible(true);

        oConfigurationView.byId('target_transaction').setVisible(false);
        oConfigurationView.byId('target_transactionInput').setVisible(false);

        oConfigurationView.byId('target_web_dynpro_application').setVisible(false);
        oConfigurationView.byId('target_web_dynpro_applicationInput').setVisible(false);

        oConfigurationView.byId('target_web_dynpro_configuration').setVisible(false);
        oConfigurationView.byId('target_web_dynpro_configurationInput').setVisible(false);

        oConfigurationView.byId('target_system_alias').setVisible(false);
        oConfigurationView.byId('target_system_aliasInput').setVisible(false);
    };

    /**
     * Displays the input fields relavent for application type LPD_CUST.
     *
     * @param {object} oConfigurationView The configuration view to check the input for.
     */
    oUtils.displayLpdCustApplicationTypeFields = function (oConfigurationView) {

        oConfigurationView.byId('application_description').setVisible(false);
        oConfigurationView.byId('target_application_descriptionInput').setVisible(false);

        oConfigurationView.byId('application_url').setVisible(false);
        oConfigurationView.byId('target_application_urlInput').setVisible(false);

        oConfigurationView.byId('application_component').setVisible(false);
        oConfigurationView.byId('target_application_componentInput').setVisible(false);

        oConfigurationView.byId('navigation_provider_role').setVisible(true);
        oConfigurationView.byId('navigation_provider_roleInput').setVisible(true);

        oConfigurationView.byId('navigation_provider_instance').setVisible(true);
        oConfigurationView.byId('navigation_provider_instanceInput').setVisible(true);

        oConfigurationView.byId('target_application_alias').setVisible(true);
        oConfigurationView.byId('target_application_aliasInput').setVisible(true);

        oConfigurationView.byId('target_application_id').setVisible(true);
        oConfigurationView.byId('target_application_idInput').setVisible(true);

        oConfigurationView.byId('target_transaction').setVisible(false);
        oConfigurationView.byId('target_transactionInput').setVisible(false);

        oConfigurationView.byId('target_web_dynpro_application').setVisible(false);
        oConfigurationView.byId('target_web_dynpro_applicationInput').setVisible(false);

        oConfigurationView.byId('target_web_dynpro_configuration').setVisible(false);
        oConfigurationView.byId('target_web_dynpro_configurationInput').setVisible(false);

        oConfigurationView.byId('target_system_alias').setVisible(false);
        oConfigurationView.byId('target_system_aliasInput').setVisible(false);
    };

    oUtils.displayTransactionApplicationTypeFields = function (oConfigurationView) {

        oConfigurationView.byId('application_description').setVisible(true);
        oConfigurationView.byId('target_application_descriptionInput').setVisible(true);

        oConfigurationView.byId('application_url').setVisible(false);
        oConfigurationView.byId('target_application_urlInput').setVisible(false);

        oConfigurationView.byId('application_component').setVisible(false);
        oConfigurationView.byId('target_application_componentInput').setVisible(false);

        oConfigurationView.byId('navigation_provider_role').setVisible(false);
        oConfigurationView.byId('navigation_provider_roleInput').setVisible(false);

        oConfigurationView.byId('navigation_provider_instance').setVisible(false);
        oConfigurationView.byId('navigation_provider_instanceInput').setVisible(false);

        oConfigurationView.byId('target_application_alias').setVisible(false);
        oConfigurationView.byId('target_application_aliasInput').setVisible(false);

        oConfigurationView.byId('target_application_id').setVisible(false);
        oConfigurationView.byId('target_application_idInput').setVisible(false);

        oConfigurationView.byId('target_transaction').setVisible(true);
        oConfigurationView.byId('target_transactionInput').setVisible(true);

        oConfigurationView.byId('target_web_dynpro_application').setVisible(false);
        oConfigurationView.byId('target_web_dynpro_applicationInput').setVisible(false);

        oConfigurationView.byId('target_web_dynpro_configuration').setVisible(false);
        oConfigurationView.byId('target_web_dynpro_configurationInput').setVisible(false);

        oConfigurationView.byId('target_system_alias').setVisible(true);
        oConfigurationView.byId('target_system_aliasInput').setVisible(true);
    };

    oUtils.displayWebDynproApplicationTypeFields = function (oConfigurationView) {

        oConfigurationView.byId('application_description').setVisible(true);
        oConfigurationView.byId('target_application_descriptionInput').setVisible(true);

        oConfigurationView.byId('application_url').setVisible(false);
        oConfigurationView.byId('target_application_urlInput').setVisible(false);

        oConfigurationView.byId('application_component').setVisible(false);
        oConfigurationView.byId('target_application_componentInput').setVisible(false);

        oConfigurationView.byId('navigation_provider_role').setVisible(false);
        oConfigurationView.byId('navigation_provider_roleInput').setVisible(false);

        oConfigurationView.byId('navigation_provider_instance').setVisible(false);
        oConfigurationView.byId('navigation_provider_instanceInput').setVisible(false);

        oConfigurationView.byId('target_application_alias').setVisible(false);
        oConfigurationView.byId('target_application_aliasInput').setVisible(false);

        oConfigurationView.byId('target_application_id').setVisible(false);
        oConfigurationView.byId('target_application_idInput').setVisible(false);

        oConfigurationView.byId('target_transaction').setVisible(false);
        oConfigurationView.byId('target_transactionInput').setVisible(false);

        oConfigurationView.byId('target_web_dynpro_application').setVisible(true);
        oConfigurationView.byId('target_web_dynpro_applicationInput').setVisible(true);

        oConfigurationView.byId('target_web_dynpro_configuration').setVisible(true);
        oConfigurationView.byId('target_web_dynpro_configurationInput').setVisible(true);

        oConfigurationView.byId('target_system_alias').setVisible(true);
        oConfigurationView.byId('target_system_aliasInput').setVisible(true);
    };

    /**
     * Displays the input fields relavent for application type SAPUI5.
     *
     * @param {object} oConfigurationView The configuration view to check the input for.
     */
    oUtils.displayURLApplicationTypeFields = function (oConfigurationView) {

        oConfigurationView.byId('navigation_provider_role').setVisible(false);
        oConfigurationView.byId('navigation_provider_roleInput').setVisible(false);

        oConfigurationView.byId('navigation_provider_instance').setVisible(false);
        oConfigurationView.byId('navigation_provider_instanceInput').setVisible(false);

        oConfigurationView.byId('target_application_alias').setVisible(false);
        oConfigurationView.byId('target_application_aliasInput').setVisible(false);

        oConfigurationView.byId('target_application_id').setVisible(false);
        oConfigurationView.byId('target_application_idInput').setVisible(false);

        oConfigurationView.byId('application_description').setVisible(true);
        oConfigurationView.byId('target_application_descriptionInput').setVisible(true);

        oConfigurationView.byId('application_url').setVisible(true);
        oConfigurationView.byId('target_application_urlInput').setVisible(true);

        oConfigurationView.byId('application_component').setVisible(false);
        oConfigurationView.byId('target_application_componentInput').setVisible(false);

        oConfigurationView.byId('target_transaction').setVisible(false);
        oConfigurationView.byId('target_transactionInput').setVisible(false);

        oConfigurationView.byId('target_web_dynpro_application').setVisible(false);
        oConfigurationView.byId('target_web_dynpro_applicationInput').setVisible(false);

        oConfigurationView.byId('target_web_dynpro_configuration').setVisible(false);
        oConfigurationView.byId('target_web_dynpro_configurationInput').setVisible(false);

        oConfigurationView.byId('target_system_alias').setVisible(true);
        oConfigurationView.byId('target_system_aliasInput').setVisible(true);
    };
    return oUtils;

}, true /* bExport */);