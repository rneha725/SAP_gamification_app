// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define([
        'sap/ushell/resources',
        'sap/ui/core/UIComponent',
        'sap/ushell/components/flp/ComponentKeysHandler',
        'sap/ushell/utils',
        'sap/m/Dialog',
        'sap/m/Button',
        'sap/m/Text'],
    function (resources, UIComponent, ComponentKeysHandler, utils, Dialog, Button, Text) {
        "use strict";

        /**
         *
         *
         */
        return UIComponent.extend("sap.ushell.components.shell.Search.Component", {

            metadata: {
                version: "1.53.0-SNAPSHOT",
                library: "sap.ushell.components.shell.search",
                dependencies: {
                    libs: ["sap.m", "sap.ui.layout"]
                }
            },

            createContent: function () {
                var oShellCtrl = sap.ushell.Container.getRenderer("fiori2").getShellController(),
                    oShellView = oShellCtrl.getView(),
                    oShellConfig = (oShellView.getViewData() ? oShellView.getViewData().config : {}) || {};
                "use strict";

                var that = this;
                var bSearchEnable = (oShellConfig.enableSearch !== false);
                if (bSearchEnable) {
                    var _loadSearchShellHelper = function (init) {
                        if (!that._searchShellHelperDeferred) {
                            that._searchShellHelperDeferred = jQuery.Deferred();
                            sap.ui.require([
                                'sap/ushell/renderers/fiori2/search/SearchShellHelperAndModuleLoader'
                            ], function () {
                                var searchShellHelper = sap.ui.require('sap/ushell/renderers/fiori2/search/SearchShellHelper');
                                if (init) {
                                    searchShellHelper.init();
                                }
                                that._searchShellHelperDeferred.resolve(searchShellHelper);
                            });
                        }
                        return that._searchShellHelperDeferred;
                    };

                    //Search Icon
                    var oShellSearchBtn = sap.ushell.Container.getRenderer("fiori2").addHeaderEndItem("sap.ushell.ui.shell.ShellHeadItem",
                        {
                            id: "sf",
                            tooltip: "{i18n>searchbox_tooltip}",
                            text: "{i18n>searchBtn}",
                            ariaLabel: "{i18n>searchbox_tooltip}",
                            icon: sap.ui.core.IconPool.getIconURI("search"),
                            // visible: {path: "/searchAvailable"},
                            visible: true,
                            showSeparator: false,
                            press: function (event) {
                                _loadSearchShellHelper(false).done(function (searchShellHelper) {
                                    searchShellHelper.onShellSearchButtonPressed(event);
                                });
                            }
                        },
                        true,
                        false);

                    if (oShellConfig.openSearchAsDefault) {
                        _loadSearchShellHelper(true).done(function (searchShellHelper) {
                            searchShellHelper.setDefaultOpen(true);
                            //searchShellHelper.openSearch(false, false);
                        });
                    }

                    // track navigation
                    that.oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
                    that.oHashChanger.attachEvent("shellHashChanged", function (sShellHash) {
                        var hashChangeInfo = sShellHash.mParameters;
                        setTimeout(function () {
                            sap.ui.require(['sap/ushell/renderers/fiori2/search/HashChangeHandler'], function (HashChangeHandler) {
                                HashChangeHandler.handle(hashChangeInfo);
                            });
                        }, 6000);
                    });

                    oShellSearchBtn.addEventDelegate({
                        onsapskipforward: function (oEvent) {
                            oEvent.preventDefault();
                            jQuery("#sapUshellHeaderAccessibilityHelper").focus();
                        },
                        onsapskipback: function (oEvent) {
                            oEvent.preventDefault();
                            jQuery("#sapUshellHeaderAccessibilityHelper").focus();
                        },
                        onAfterRendering: function () {
                            jQuery("#sf").attr("aria-pressed", false);
                        }
                    });

                    oShellView.aDanglingControls.push(oShellSearchBtn);
                }


                sap.ui.getCore().getEventBus().publish("shell", "searchCompLoaded", {delay: 0});
            },
            /**
             *
             *
             */
            exit : function () {

            }
        });

    });
