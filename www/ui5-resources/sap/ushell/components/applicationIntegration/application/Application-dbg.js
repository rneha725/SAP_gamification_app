// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview handle all the resources for the different applications.
 * @version 1.56.5
 */
sap.ui.define([
    'sap/ushell/components/container/ApplicationContainer'
], function (ApplicationContainer) {
    "use strict";

    function Application () {
        this._createWaitForRendererCreatedPromise = function () {
            var oPromise,
                oRenderer;

            oRenderer = sap.ushell.Container.getRenderer();
            if (oRenderer) {
                // should always be the case except initial start; in this case, we return an empty array to avoid delays by an additional async operation
                jQuery.sap.log.debug("Shell controller._createWaitForRendererCreatedPromise: shell renderer already created, return empty array.");
                return [];
            } else {
                oPromise = new Promise(function (resolve, reject) {
                    var fnOnRendererCreated;

                    fnOnRendererCreated = function () {
                        jQuery.sap.log.info("Shell controller: resolving component waitFor promise after shell renderer created event fired.");
                        resolve();
                        sap.ushell.Container.detachRendererCreatedEvent(fnOnRendererCreated);
                    };
                    oRenderer = sap.ushell.Container.getRenderer();
                    if (oRenderer) {
                        // unlikely to happen, but be robust
                        jQuery.sap.log.debug("Shell controller: resolving component waitFor promise immediately (shell renderer already created");
                        resolve();
                    } else {
                        sap.ushell.Container.attachRendererCreatedEvent(fnOnRendererCreated);
                    }
                });
                return [oPromise];
            }
        };

        // FIXME: It would be better to call a function that simply
        // and intentionally loads the dependencies of the UI5
        // application, rather than creating a component and expecting
        // the dependencies to be loaded as a side effect.
        // Moreover, the comment reads "load ui5 component via shell service"
        // however that is 'not needed' since the loaded component
        // is not used. We should evaluate the possible performance
        // hit taken due to this implicit means to an end.
        this.createComponent = function (oResolvedHashFragment, oParsedShellHash) {
            return sap.ushell.Container.getService("Ui5ComponentLoader").createComponent(
                oResolvedHashFragment,
                oParsedShellHash,
                this._createWaitForRendererCreatedPromise()
            );
        };


        this.createApplicationContainer = function (sAppId, oResolvedNavigationTarget) {
            return new ApplicationContainer("application" + sAppId, oResolvedNavigationTarget);
        };
    }


    return new Application();
}, /* bExport= */ true);
