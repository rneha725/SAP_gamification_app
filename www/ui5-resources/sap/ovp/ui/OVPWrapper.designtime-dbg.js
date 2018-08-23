/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2017 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
        "sap/ovp/cards/AppSettingsUtils",
        "jquery.sap.global"
    ],
    function (AppSettingsUtils, jQuery) {
        "use strict";
        var oResourceBundle = AppSettingsUtils && AppSettingsUtils.oOvpResourceBundle;
        oResourceBundle = oResourceBundle || sap.ui.getCore().getLibraryResourceBundle("sap.ovp");
        return {
            actions: {
                /*settings: function () {
                    return {
                        isEnabled: false, //Disabled as of now
                        handler: function (oElement, fGetUnsavedChanges) {
                            AppSettingsUtils.getDialogBox(oElement).then(function (oDialogBox) {
                                oDialogBox.open();
                            });
                            return Promise.resolve([]);
                        }
                    };
                }*/
            },
            aggregations: {
                DynamicPage: {
                    domRef: ".sapUiComponentContainer",
                    actions: {
                        /*move: "moveControls",
                        changeOnRelevantContainer: true*/
                    },
                    propagateMetadata: function (oElement) {
                        var sType = oElement.getMetadata().getName();
                        if (sType !== "sap.ovp.ui.EasyScanLayout" && sType !== "sap.ui.core.ComponentContainer") {
                            return {
                                actions: null
                            };
                        }
                    },
                    propagateRelevantContainer: false
                }
            },
            name: {
                singular: oResourceBundle && oResourceBundle.getText("Card"),
                plural: oResourceBundle && oResourceBundle.getText("Cards")
            }
        };
    }, false);
