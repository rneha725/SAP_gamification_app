// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define(['sap/ushell/components/LifeCycleWrapper', 'sap/ushell/resources', 'sap/ui/core/UIComponent', 'sap/ushell/components/flp/ComponentKeysHandler'],
    function (LifeCycleWrapper, resources, UIComponent, ComponentKeysHandler) {
        "use strict";
        return UIComponent.extend("sap.ushell.components.shell.defaults.Component", {

            metadata: {

                version: "1.53.0-SNAPSHOT",

                library: "sap.ushell.components.shell.defaults",

                dependencies: {
                    libs: ["sap.m"]
                }
            },
            createContent: function () {

                var oConfig = this.getComponentData().config  || {};

                var aPluginsDefaultJson = [
                    {
                        name: "ShellElements",
                        launchData: {
                            on: [{
                                sender: "shell",
                                signal: "FLP-FMP"
                            }]
                        },
                        run: {
                            loadDefaultDependencies: false,
                            enabled: true,
                            ui5ComponentName: "sap.ushell.components.shell.ShellElements",
                            url: jQuery.sap.getResourcePath("sap/ushell/components/shell/ShellElements"),
                            applicationConfiguration: {
                                enabled: true
                            }
                        }
                    },
                    {
                        name: "Notifications",
                        launchData: {
                            excludedStates: ["lean", "lean-home"],
                            on: [{
                                sender: "shell",
                                signal: "loadNotificationsComponent"
                            }]
                        },
                        run: {
                            loadDefaultDependencies: false,
                            enabled: true,
                            ui5ComponentName: "sap.ushell.components.shell.Notifications",
                            url: jQuery.sap.getResourcePath("sap/ushell/components/shell/Notifications"),
                            applicationConfiguration: {
                                enabled: true
                            }
                        }
                    },
                    {
                        name: "MeArea",
                        launchData: {
                            delay: 60000,
                            on: [{
                                sender: "shell",
                                signal: "loadMeAreaComponent"
                            }]
                        },
                        run: {
                            loadDefaultDependencies: false,
                            enabled: true,
                            ui5ComponentName: "sap.ushell.components.shell.MeArea",
                            url: jQuery.sap.getResourcePath("sap/ushell/components/shell/MeArea"),
                            applicationConfiguration: {
                                enabled: true
                            }
                        }
                    },
                    {
                        name: "UserImage",
                        launchData: {
                            on: [{
                                sender: "shell",
                                signal: "loadUserImageComponent"
                            }]
                        },
                        run: {
                            loadDefaultDependencies: false,
                            enabled: true,
                            ui5ComponentName: "sap.ushell.components.shell.UserImage",
                            url: jQuery.sap.getResourcePath("sap/ushell/components/shell/UserImage"),
                            applicationConfiguration: {
                                enabled: true
                            }
                        }
                    },
                    {
                        name: "Search",
                        launchData: {
                            excludedStates: ["lean", "lean-home"],
                            on: [{
                                sender: "shell",
                                signal: "FLP-FMP"
                            }]
                        },
                        run: {
                            loadDefaultDependencies: false,
                            enabled: true,
                            ui5ComponentName: "sap.ushell.components.shell.Search",
                            url: jQuery.sap.getResourcePath("sap/ushell/components/shell/Search"),
                            applicationConfiguration: {
                                enabled: true
                            }
                        }
                    }
                ];

                aPluginsDefaultJson.forEach(function (oPlugin) {
                    if (oConfig[oPlugin.name]) {
                        var oRelatedConfiguration = oConfig[oPlugin.name],
                            oMergedConfig;

                        oMergedConfig = jQuery.extend(true, {}, oPlugin, oRelatedConfiguration);

                        if (oPlugin.run.applicationConfiguration.enabled) {
                            LifeCycleWrapper.createLifeCycleWrapperShell(oMergedConfig);
                        }
                    } else {
                        LifeCycleWrapper.createLifeCycleWrapperShell(oPlugin);
                    }
                });
            },

            exit : function () {
            }
        });

    });
