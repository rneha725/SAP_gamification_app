sap.ui.define(["jquery.sap.global", "sap/ui/core/Component", "sap/ui/core/mvc/Controller", "sap/ui/core/service/ServiceFactory", "sap/ui/core/service/ServiceFactoryRegistry", "./ShellUIService"], function (jQuery, Component, Controller, ServiceFactory, ServiceFactoryRegistry, ShellUIService) {
    "use strict";

    var ghostAppPath = jQuery.sap.getResourcePath("sap/ushell/plugins/ghostapp");

    var prerequireConfig = {
        "name": "sap.ushell.plugins.ghostapp",
        "manifest": true,
        "asyncHints": {
            "libs": [
            {
                "name": "sap.m"
            },
            {
                "name": "sap.ui.core"
            },
            {
                "name": "sap.f"
            },
            {
                "name": "sap.suite.ui.generic.template"
            },
            {
                "name": "sap.ui.comp"
            },
            {
                "name": "sap.ui.fl"
            },
            {
                "name": "sap.ui.generic.app"
            },
            {
                "name": "sap.ui.generic.template"
            },
            {
                "name": "sap.ui.table"
            },
            {
                "name": "sap.ui.unified"
            },
            {
                "name": "sap.uxap"
            },
            {
                "name": "sap.ui.layout"
            }
            ],
            // provide a cache key for metadata parsing, change when metadata changed
            "cacheTokens":{"dataSources":{"/ghostapp-c9f1f0bd-ff78-4660-9a1f-295814f00fe0/":"20180613155243"}},
            // tell flexibility there are no changes for this component
            "requests": [{
                "name": "sap.ui.fl.changes",
                "reference": "sap.ushell.plugins.ghostapp.Component"
            }],
            "waitFor": {}
        },
        "id": "sap.ushell.plugins.ghostapp",
        "componentData": {
            "startupParameters": {},
            "technicalParameters": {}
        },
        "async": true
    };

    var sComponentName = "sap.ushell.plugins.appwarmup.Component";
    return Component.extend(sComponentName, {

        metadata : {
            version: "1.56.5",
            library: "sap.ushell"
        },

        doWarmUp: function () {
            var aPromises = [];

            // substitute real metadata URL with app local metadata
            aPromises.push(new Promise(function (resolve, reject) {
                sap.ui.require(["sap/ui/model/odata/ODataMetadata"], function (ODataMetadata) {
                    var fnOrig = ODataMetadata.prototype._loadMetadata;
                    ODataMetadata.prototype._loadMetadata = function (sUrl, bSuppressEvents) {
                        if (this.sUrl && this.sUrl.startsWith("/ghostapp-c9f1f0bd-ff78-4660-9a1f-295814f00fe0/$metadata")) {
                            this.sUrl = ghostAppPath + "/metadata.xml";
                            // restore the original function
                            ODataMetadata.prototype._loadMetadata = fnOrig;
                        }
                        return fnOrig.call(this, sUrl, bSuppressEvents);
                    };
                    resolve();
                }, reject);
            }));

            Promise.all(aPromises).then(function () {
                ServiceFactoryRegistry.register("sap.ushell.plugins.appwarmup.ShellUIService", new ServiceFactory(ShellUIService));
                return Component.create(prerequireConfig);
            }).then(function (dummyComponent) {
                // add interrupt check here
                var hiddenPlaceholder = document.createElement("div");
                hiddenPlaceholder.style.visibility = "hidden";
                document.body.appendChild(hiddenPlaceholder);

                sap.ui.require(["sap/ui/core/ComponentContainer"], function (ComponentContainer) {
                   Controller.registerExtensionProvider();
                    var cc = new ComponentContainer();
                    cc.setComponent(dummyComponent);
                    cc.placeAt(hiddenPlaceholder);
                    cc.addEventDelegate({
                        onAfterRendering: function () {
                            setTimeout(function () {
                                dummyComponent.destroy();
                            }, 5000);
                        }
                    });
                });
            }).catch(function() {
                jQuery.sap.log.error("GhostApp component could not be created", null, this);
            });

        },

        init: function () {

            // only do the warmup if the user has opened the shell home
            var currentApplication = sap.ushell.Container.getService("AppLifeCycle").getCurrentApplication();

            if (currentApplication.homePage) {
                this.doWarmUp();
            }

        }

    });

});
