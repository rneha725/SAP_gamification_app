// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define(function() {
    "use strict";


    /*global jQuery, sap, window */
    /*jslint nomen: true */
    var LifeCycleWrapper = function () {
        this.oInstanceManager = {};

        LifeCycleWrapper.prototype.Init();
    };

    LifeCycleWrapper.prototype.Init = function () {
        this.oManagedComponents = {};
    };

    LifeCycleWrapper.prototype.processDelay= function(sName, oConfiguration) {
        if (!oConfiguration || oConfiguration.delay === undefined) {
            return false;
        }

        var oManagedCompoenntEntry = this.oManagedComponents[sName];
        if (oConfiguration.delay === 0) {
            oManagedCompoenntEntry.fnRun();
            return true;
        } else {
            oManagedCompoenntEntry.oTimer = setTimeout(oManagedCompoenntEntry.fnRun, oConfiguration.delay);
            return false;
        }
    };

    LifeCycleWrapper.prototype.processOn= function(sName, oConfiguration) {
        var iOnEvents;

        if (oConfiguration.on ) {
            var oManagedCompoenntEntry = this.oManagedComponents[sName],
                oEventBus = sap.ui.getCore().getEventBus();

            for (iOnEvents = 0; iOnEvents < oConfiguration.on.length; iOnEvents++) {
                var oEvent = oConfiguration.on[iOnEvents];

                oEventBus.subscribe(oEvent.sender, oEvent.signal, oManagedCompoenntEntry.fnRun, this);
            }
        }
    };

    LifeCycleWrapper.prototype.processLaunchData = function (sName) {
        if (!this.oManagedComponents[sName]) {
            return;
        }

        var oConfiguration = this.oManagedComponents[sName].oConfiguration,
            oLaunchData = oConfiguration.launchData;

       if (!LifeCycleWrapper.prototype.processDelay(sName, oLaunchData)) {
           LifeCycleWrapper.prototype.processOn(sName, oLaunchData);
       }
    };

    LifeCycleWrapper.prototype.startComponent = function (name, fnRun, oConfiguration) {
        if (this.oManagedComponents[name]) {
            return;
        }

        this.oManagedComponents[name] = {
            sState: 'start',
            fnRun: fnRun,
            oConfiguration: oConfiguration,
            oTimer: undefined
        };
    };

    LifeCycleWrapper.prototype.componentCreated = function (sName) {
        if (!this.oManagedComponents[sName]) {
            return;
        }

        var oManagedComponentEntry =  this.oManagedComponents[sName],
            oConfiguration = this.oManagedComponents[sName].oConfiguration;

        if (oManagedComponentEntry.oTimer) {
            clearTimeout(oManagedComponentEntry.oTimer);
        }

        if (oConfiguration.launchData.on ) {
            var oManagedCompoenntEntry = this.oManagedComponents[sName],
                iOnEvents,
                oEventBus = sap.ui.getCore().getEventBus();

            for (iOnEvents = 0; iOnEvents < oConfiguration.launchData.on.length; iOnEvents++) {
                var oEvent = oConfiguration.launchData.on[iOnEvents];

                oEventBus.unsubscribe(oEvent.sender, oEvent.signal, oManagedCompoenntEntry.fnRun, this);
            }
        }

    };

    LifeCycleWrapper.prototype.createLifeCycleWrapperShell = function (oConfiguration) {
        var bCreate = true,
            oDeferred = jQuery.Deferred(),
            fnRunCb = function (sender, signal, oCallbackFn) {
                jQuery.sap.registerModulePath(oConfiguration.run.ui5ComponentName, oConfiguration.run.url + "/");
                sap.ushell.Container.getService("Ui5ComponentLoader").createComponent(oConfiguration.run)
                    .done(function (oLoadedComponent) {
                        //component running.
                        //Reset all launch data.
                        LifeCycleWrapper.prototype.componentCreated(oConfiguration.name);

                        //Perform On Create function
                        if (oCallbackFn && (typeof oCallbackFn === "function")) {
                            oCallbackFn();
                        }

                        oDeferred.resolve(oLoadedComponent);
                    })
                    .fail(function (oFO) {
                        oDeferred.reject(oFO);
                    });
            }.bind(this),
            excludedStates = oConfiguration.launchData.excludedStates,
            sCurrentStateName;


        if (excludedStates) {
            sCurrentStateName = sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty("/currentState/stateName");
            if (excludedStates.indexOf(sCurrentStateName) != -1) {
                bCreate = false;
            }
        }

        if (bCreate) {
            this.startComponent(oConfiguration.name, fnRunCb, oConfiguration);
            this.processLaunchData(oConfiguration.name);
        } else {
            oDeferred.reject();
        }

        return oDeferred;
    };


    return new LifeCycleWrapper();

}, /* bExport= */ true);