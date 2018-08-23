// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview handle all the resources for the different applications.
 * @version 1.56.5
 */
sap.ui.define([
    'sap/ushell/components/applicationIntegration/elements/model',
    'sap/ushell/components/container/ApplicationContainer',
    'sap/ushell/ui5service/ShellUIService',
    'sap/ushell/components/applicationIntegration/application/Application',
    'sap/ushell/components/applicationIntegration/configuration/AppMeta',
    'sap/ushell/services/AppConfiguration',
    'sap/ushell/utils',
    'sap/ushell/resources',
    'sap/ui/Device'
], function (oElementsModel, ApplicationContainer, ShellUIService, Application, AppMeta, AppConfiguration, utils, resources, Device) {
    "use strict";

    function AppLifeCycle () {
        var oViewPortContainer,
            isHierarchyChanged,
            isRelatedAppsChanged,
            isTitleChanged,
            sRootIntent,
            appState,
            oShellUIService,
        // key [appId], value
            oAppsCache = {},
        // key [type], value
            disableHomeAppCache = false,
            oCurrentApplication = {},
        //actual states convertion map
            oApplicationTypeToElementModelStateMap = {
                home: {
                    NWBC: {
                        headerless: "headerless",
                        default: "minimal"
                    }, TR: {
                        headerless: "minimal",
                        default: "minimal"
                    }, default: {
                        default: "home"
                    }
                }, app: {
                    NWBC: {
                        headerless: "headerless",
                        default: "minimal"
                    }, TR: {
                        headerless: "minimal",
                        default: "minimal"
                    }, default: {
                        default: "app"
                    }
                }
            },
            oActualElementsModelStateMap = {
                home: {
                    embedded: "embedded-home",
                    headerless: "headerless-home",
                    merged: "blank-home",
                    blank: "blank-home"
                }, app: {
                    minimal: "minimal",
                    app: "app",
                    standalone: "standalone",
                    embedded: "embedded",
                    headerless: "headerless",
                    merged: "merged",
                    home: "home",
                    blank: "blank",
                    lean: "lean"
                }

            },
            oStatefulApplicationContainer;

        this.calculateElementsState = function (sNav, sAppType, appState,isExplicit) {
            var oNav = !!oApplicationTypeToElementModelStateMap[sNav]? oApplicationTypeToElementModelStateMap[sNav]: oApplicationTypeToElementModelStateMap.default,
                oApp = !!oNav[isExplicit? undefined: sAppType]? oNav[sAppType]: oNav.default,
                oAppStt = !!oApp[appState]? oApp[appState]: oApp.default;

            return oAppStt;
        };

        this.isCurrentApp = function (appId) {
            return oCurrentApplication.appId === appId? true: false;
        };

        this.isAppInCache = function (appId) {
            return !!oAppsCache[appId];
        };

        this.normalizeAppId = function (sAppId) {
            var sCmp = "-component",
                isCmp = sAppId.endsWith(sCmp);

            if (isCmp) {
                return sAppId.substring(0, sAppId.length - sCmp.length);
            } else {
                return sAppId;
            }
        };

        this.onComponentCreated = function (oEvent, sChannel, oData) {
            var oApp = oData.component,
                sAppId = this.normalizeAppId(oApp.getId());

            if (this.isAppInCache(sAppId)) {
                oAppsCache[sAppId].app = oApp;
            } else {
                oCurrentApplication.app = oApp;
            }
        };

        //call lifecycle interface "setInitialConfiguration"
        this.onAfterNavigate = function (sFromId, oFrom, sToId) {
            var oApp;
            //destroy the application if not cached or marked for reuse.
            if (sFromId && oFrom && !this.isAppOfTypeCached(sFromId) &&
                !this.applicationIsStatefulType(oFrom.getApplicationType())) {
                //distroy the application and its resources
                this.removeControl(sFromId, true);
                oFrom.destroy();
            }

            // invoke the life cycle interface "setInitialConfiguration" for the restored application
            if (sToId) {
                if (oAppsCache[sToId]) {
                    oApp = oAppsCache[sToId].app;
                    if (oApp && oApp.setInitialConfiguration) {
                        oApp.setInitialConfiguration();
                    }
                } else {
                    //this application is not cached
                    // here we can place code that handles the starting of the application in the after navigation life cycle.
                }
            }
        };

        this.storeApp = function (appId, oContainer, oTarget) {
            if (!this.isAppInCache(appId)) {
                oAppsCache[appId] = {
                    appId: appId,
                    stt: 'loading',
                    container: oContainer,
                    meta: AppConfiguration.getMetadata(oTarget),
                    app: undefined
                };
                return true;
            }

            return false;
        };

        this.resoterApp = function (appId) {
            if (this.isAppInCache(appId)) {
                oCurrentApplication = oAppsCache[appId];

                //TODO restore meta
                //restore elements model
                // restore appState
                // restore all related application resources
            }
        };

        this.isAppOfTypeCached = function (appId) {
            //handle the root intent
            if (!disableHomeAppCache && appId === "application-" + sRootIntent) {
                return true;
            }
            //TODO add by configuratuin a list of persisted applications

            return false;
        };

        this.openApp = function (inAppId, oTarget) {
            var oContainer;

            //format appId
            var appId = "application" + inAppId;

            if (this.isAppOfTypeCached(appId)) {
                //is cached application
                if (!this.isAppInCache(appId)) {
                    oContainer = this.createApplicationContainer(inAppId, oTarget);
                    this.storeApp(appId, oContainer, oTarget);
                }

                this.resoterApp(appId);
            } else if (this.applicationIsStatefulType(oTarget.applicationType)) {
                //is cached application
                oContainer = this.getStatefulContainer(oTarget.applicationType);
                if (!oContainer) {
                    oContainer = this.createApplicationContainer(inAppId, oTarget);
                    this.setStatefulContainer(oTarget.applicationType, oContainer);
                    oContainer.setIsStateful(true);
                }

                //create application that is not persisted and not cashed
                oCurrentApplication = {
                    appId: appId,
                    stt: 'loading',
                    container: oContainer,
                    meta: AppConfiguration.getMetadata(oTarget),
                    app: undefined
                };

            } else {
                //application not cached
                oContainer = this.createApplicationContainer(inAppId, oTarget);
                //create application that is not persisted and not cashed
                oCurrentApplication = {
                    appId: appId,
                    stt: 'loading',
                    container: oContainer,
                    meta: AppConfiguration.getMetadata(oTarget),
                    app: undefined
                };
            }
        };

        this.getAppMeta = function () {
            return AppMeta;
        };

        this.init = function (inAppState, oInViewPortContainer, inSRootIntent, inDisableHomeAppCache, oShellUIServiceChange) {
            oShellUIService = new ShellUIService({
                scopeObject: oShellUIServiceChange.ownerComponent,
                scopeType: "component"
            });

            appState = inAppState;
            oViewPortContainer = oInViewPortContainer;
            sRootIntent = inSRootIntent;
            disableHomeAppCache = inDisableHomeAppCache;

            //TODO add unsubscribe
            sap.ui.getCore().getEventBus().subscribe("sap.ushell.components.container.ApplicationContainer", 'componentCreated', this.onComponentCreated, this);

        };

        this.addControl = function (oControl) {
            oViewPortContainer.addCenterViewPort(oControl);
        };

        this.removeControl = function (sId) {
            oViewPortContainer.removeCenterViewPort(sId, true);
        };

        this.removeApplication = function (sIntent) {
            var oInnerControl = this.getControl(sIntent);

            if (oInnerControl) {
                this.removeControl(oInnerControl.getId());
                oInnerControl.destroy();
            }
        };

        this.getControl = function (sIntent) {
            return oViewPortContainer
                && (oViewPortContainer.getViewPortControl('centerViewPort', "application" + '-' + sIntent)
                || oViewPortContainer.getViewPortControl('centerViewPort', "applicationShellPage" + '-' + sIntent));
        };

        this.getViewPortContainer = function () {
            return oViewPortContainer;
        };

        this.navTo = function (sId) {
            oViewPortContainer.navTo('centerViewPort', sId, 'show');
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
            return Application.createComponent(oResolvedHashFragment, oParsedShellHash);
        };

        this.getAppContainer = function (sAppId, oResolvedNavigationTarget, bIsColdStart) {
            oResolvedNavigationTarget.shellUIService = oShellUIService.getInterface();

            /*
             * The external navigation mode in the resolution result is calculated
             * statically, and indicates a future state. It currently answers the
             * question: "is the application going to be opened explace?".
             *
             * The target navigation mode, instead, answers the question: "was
             * the application opened explace?".
             *
             * We need to have this logic, because embedded applications do not
             * check the coldstart condition.
             */
            oResolvedNavigationTarget.targetNavigationMode = bIsColdStart? "explace" : "inplace";

            this.openApp(sAppId, oResolvedNavigationTarget);
            return oCurrentApplication.container;
        };

        this.getShellUIService = function () {
            return oShellUIService;
        };

        this.initShellUIService = function (oShellUIServiceChange) {
            oShellUIService._attachHierarchyChanged(this.onHierarchyChange.bind(this));
            oShellUIService._attachTitleChanged(this.onTitleChange.bind(this));
            oShellUIService._attachRelatedAppsChanged(this.onRelatedAppsChange.bind(this));
            oShellUIService._attachBackNavigationChanged(oShellUIServiceChange.fnOnBackNavigationChange.bind(this));
        };


        /* Start Statefull API*/

        /**
         * Reads and adjusts the user configuration related to stateful
         * application containers.
         *
         * @param {object} oStatefulApplicationContainer
         *
         * @return {object}
         * A configuration like: <code>{
         *   <applicationType>: null
         * }</code>
         *
         * Where null indicates that stateful containers are enabled for a
         * certain application type and container will be added at the time
         * the first application of that type is opened.
         */
        this.parseStatefulContainerConfiguration = function (oConfStatefulApplicationContainer) {
            var oStatefulApplicationContainerConsolidatedCopy = {};

            if (oConfStatefulApplicationContainer) {
                var oAllowedConfigurations = {
                    //"NWBC": true,
                    "GUI": true
                };

                Object.keys(oConfStatefulApplicationContainer)
                    .filter(function(sApplicationType) {
                        return true === oConfStatefulApplicationContainer[sApplicationType]
                            && oAllowedConfigurations[sApplicationType];
                    })
                    .map(function (sUserConfigurationKey) {
                        var sApplicationType = sUserConfigurationKey;
                        if (sApplicationType === "GUI") {
                            sApplicationType = "TR";
                        }

                        return sApplicationType;
                    })
                    .forEach(function(sApplicationType) {
                        oStatefulApplicationContainerConsolidatedCopy[sApplicationType] = null;
                    });

            }

            oStatefulApplicationContainer = oStatefulApplicationContainerConsolidatedCopy;
        };

        this.setStatefulApplicationContainer = function (inOStatefulApplicationContainer) {
            oStatefulApplicationContainer = inOStatefulApplicationContainer;
        };

        this.getStatefulApplicationContainer = function () {
            return oStatefulApplicationContainer;
        };

        this.applicationIsStatefulType = function (sApplicationType) {
            return oStatefulApplicationContainer.hasOwnProperty(sApplicationType);
        };

        this.getStatefulContainer = function (sApplicationType) {
            return oStatefulApplicationContainer[sApplicationType];
        };

        this.setStatefulContainer = function (sApplicationType, oApplicationContainer) {
            return oStatefulApplicationContainer[sApplicationType] = oApplicationContainer;
        };

        this.statefulContainerForTypeExists = function (sApplicationType) {
            return !!this.getStatefulContainer(sApplicationType);
        };

        /**
         * Finds and returns all existing application containers.
         *
         * @param {object} oStatefulApplicationContainer
         *  All stateful application containers
         *
         * @return {array}
         *  An array containing all the application container objects.
         */
        this.getAllApplicationContainers = function () {
            return Object.keys(oStatefulApplicationContainer).map(function (sKey) {
                return oStatefulApplicationContainer[sKey];
            }).filter(function (oApplicationContainer) {
                return !!oApplicationContainer;
            });
        };

        /* End Statefull API*/

        this.getElementsModel = function () {
            return oElementsModel;
        };


        /**
         * In the FLP, only one container at a time can be active. If we have
         * multiple ApplicationContainers, they may still be active in the
         * background, and still be able to send/receive postMessages (e.g.,
         * change the title while the user is on the FLP home).
         *
         * Also, we distinguish between visible containers and active
         * containers. As it is desirable that when a container is being opened
         * it starts setting the FLP title for example. It results in better
         * perceived performance.
         *
         * This method sets only one container as active and de-activates all
         * other application containers around.
         *
         * @param {object} oApplicationContainer
         *   The application container to activate. Pass <code>null</code> in
         *   case no application container must be activated.
         *
         * @param {array} aAllApplicationContainers
         *   All existing application containers
         *
         * @private
         */
        this.activeContainer = function (oApplicationContainer) {
            var aAllApplicationContainers = this.getAllApplicationContainers();

            // deactivate all
            aAllApplicationContainers.forEach(function (oApplicationContainerToDeactivate) {
                jQuery.sap.log.info("Deactivating container " + oApplicationContainerToDeactivate.getId());
                oApplicationContainerToDeactivate.setActive(false);
            });

            if (oApplicationContainer) {
                jQuery.sap.log.info("Activating container " + oApplicationContainer.getId());
                oApplicationContainer.setActive(true);
            }
        };

        this.reuseApplicationContainer = function (oApplicationContainer, applicationType, url) {
            var that = this;
            return oApplicationContainer
                .setNewApplicationContext(applicationType, url)
                .then(function () {
                    that.navTo(oApplicationContainer.getId());
                    oApplicationContainer.toggleStyleClass("hidden", false);
                    jQuery.sap.log.info("New application context opened successfully in an existing transaction UI session.");
                }, function (vError) {
                    jQuery.sap.log.error(vError && vError.message || vError);
                });
        };

        this.createApplicationContainer = function (sAppId, oResolvedNavigationTarget) {
            return Application.createApplicationContainer(sAppId, oResolvedNavigationTarget);
        };

        this.publishNavigationStateEvents = function (oAppContainer, oApplication, fnOnAfterRendering) {
            //after the app container is rendered, publish an event to notify
            //that an app was opened
            var origExit,
                sId = oAppContainer.getId ? oAppContainer.getId() : "",
                that = this;
            var appMetaData = AppConfiguration.getMetadata(),
                sIcon = appMetaData.icon,
                sTitle = appMetaData.title;

            //Attach an event handler which will be called onAfterRendering
            oAppContainer.addEventDelegate({onAfterRendering: fnOnAfterRendering});

            //after the app container exit, publish an event to notify
            //that an app was closed
            origExit = oAppContainer.exit;
            oAppContainer.exit = function () {
                if (origExit) {
                    origExit.apply(this, arguments);
                }
                //apply the original density settings
                that.getAppMeta()._applyContentDensityByPriority();

                //wrapped in setTimeout since "publish" is not async
                setTimeout(function () {
                    // TODO: do not mutate an internal structure (in a Timeout!),
                    // create a new object
                    var oEventData = jQuery.extend(true, {},oApplication);
                    delete oEventData.componentHandle;
                    oEventData["appId"] = sId;
                    oEventData["usageIcon"] = sIcon;
                    oEventData["usageTitle"] = sTitle;
                    sap.ui.getCore().getEventBus().publish("launchpad", "appClosed", oEventData);
                    jQuery.sap.log.info('app was closed');
                }, 0);

                // the former code leaked an *internal* data structure, making it part of a public API
                // restrict hte public api to the minimal set of precise documented properties which can be retained under
                // under future evolutions
                var oPublicEventData = that._publicEventDataFromResolutionResult(oApplication);
                //publish the event externally
                sap.ushell.renderers.fiori2.utils.publishExternalEvent("appClosed", oPublicEventData);
            };
        };

        /**
         * Creates a new object Expose a minimal set of values to public external stakeholders
         * only expose what you can guarantee under any evolution of the unified shell on all platforms
         * @param {object} oApplication an internal result of NavTargetResolution
         * @returns {object} an object exposing certain information to external stakeholders
         */
        this._publicEventDataFromResolutionResult = function (oApplication) {
            var oPublicEventData = {};
            if (!oApplication) {
                return oApplication;
            }
            ["applicationType","ui5ComponentName","url","additionalInformation","text"].forEach(function (sProp) {
                oPublicEventData[sProp] = oApplication[sProp];
            });
            Object.freeze(oPublicEventData);
            return oPublicEventData;
        };

        this.getIsTitleChanged= function () {
          return isTitleChanged;
        };

        this.onTitleChange = function (oEvent) {
            isTitleChanged = true;
            var sTitle = oEvent.getParameters().data,
                oCurrentState;

            if (!sTitle) {
                sTitle = AppMeta.getTitleDefaultValue();
            }
            oCurrentState = oElementsModel.getModel().getProperty("/currentState");
            if (oCurrentState && oCurrentState.stateName === "home") {
                oElementsModel.updateStateProperty("application/title", sTitle, false, ["home"]);
            }
            oElementsModel.updateStateProperty("application/title", sTitle, true);
            window.document.title = sTitle;
            utils.setPerformanceMark("FLP -- title change");
        };

        this.getHierarchyDefaultValue = function () {
            var oHierarchy = [],
                oCurrentState = oElementsModel.getModel().getProperty("/currentState");

            //If we navigate for a page with state == app add home to it
            if (oCurrentState && ((oCurrentState.stateName === "app" || oCurrentState.stateName === "embedded") /*|| oCurrentState.stateName === "home"*/)) {
                //add home entry to hierarchy
                oHierarchy = [
                    {
                        icon: "sap-icon://home",
                        title: resources.i18n.getText("actionHomePage"),
                        // Intent is set to root directly to avoid multiple hash changes.
                        intent: sRootIntent ? "#" + sRootIntent : "#"
                    }
                ];
            }
            return oHierarchy;
        };

        this.getIsHierarchyChanged = function () {
            return isHierarchyChanged;
        };

        this.onHierarchyChange = function (oEvent) {
            isHierarchyChanged = true;
            var aHierarchy = oEvent.getParameters().data,
                oHierarchyDefaultValue,
                aExtendedHierarchy = [],
                oCurrentState;

            if (!aHierarchy) {
                aHierarchy = [];
            }
            // we take the default value and save it with the data recived
            oHierarchyDefaultValue = this.getHierarchyDefaultValue();
            //We have to copy the passed array and its objects to prevent direct properties access.
            aHierarchy.forEach(function (oItem, index) {
                aExtendedHierarchy[index] = jQuery.extend({}, oItem);
            });
            aExtendedHierarchy = aExtendedHierarchy.concat(oHierarchyDefaultValue);

            oCurrentState = oElementsModel.getModel().getProperty("/currentState");
            if (oCurrentState && oCurrentState.stateName === "home") {
                oElementsModel.updateStateProperty("application/hierarchy", aExtendedHierarchy, false, ["home"]);
            }
            oElementsModel.updateStateProperty("application/hierarchy", aExtendedHierarchy, true);
        };

        this.getIsRelatedAppsChanged = function () {
            return isRelatedAppsChanged;
        };

        this.resetShellUIServiceHandlers = function () {
            isRelatedAppsChanged = false;
            isHierarchyChanged = false;
            isTitleChanged = false;
        };

        this.onRelatedAppsChange = function (oEvent) {
            isRelatedAppsChanged = true;
            var oRelatedApps = oEvent.getParameters().data,
                oCurrentState;

            if (!oRelatedApps) {
                oRelatedApps = [];
            }
            oCurrentState = oElementsModel.getModel().getProperty("/currentState");
            if (oCurrentState && oCurrentState.stateName === "home") {
                oElementsModel.updateStateProperty("application/relatedApps", oRelatedApps, false, ["home"]);
            }
            oElementsModel.updateStateProperty("application/relatedApps", oRelatedApps, true);
        };

        this.handleControl = function (sIntent, sAppId, oTarget, fnWrapper, fnRootControll) {
            var oInnerControl = this.getControl(sIntent),
                bReuseAnExistingAppSession = this.statefulContainerForTypeExists(oTarget.applicationType),
                oMetadata = AppConfiguration.getMetadata(oTarget),
                bLegacyApp = (oTarget.applicationType === "NWBC" || oTarget.applicationType === "TR"),
                bIsInCache = this.isAppOfTypeCached("application-" + sIntent);

            //this case this controler cant be reused and we need it to be embed, so delete it.
            if (!bReuseAnExistingAppSession && oInnerControl && !bIsInCache) {
                this.removeControl(oInnerControl.getId());
                oInnerControl.destroy();

                // The immediately following method call internally calls
                // `this.oViewPortContainer.addCenterViewPort(oAppContainer)`
                // when `bReuseAnExistingAppSession` is true, and in that case
                // `oInnerControl` will be the component control of an existing
                // session.
                oInnerControl = fnWrapper(
                    sIntent,
                    oMetadata,
                    oTarget,
                    sAppId,
                    oTarget.fullWidth || oMetadata.fullWidth || bLegacyApp
                );
            } else if (!oInnerControl) {
                // The immediately following method call internally calls
                // `this.oViewPortContainer.addCenterViewPort(oAppContainer)`
                // when `bReuseAnExistingAppSession` is true, and in that case
                // `oInnerControl` will be the component control of an existing
                // session.
                oInnerControl = fnWrapper(
                    sIntent,
                    oMetadata,
                    oTarget,
                    sAppId,
                    oTarget.fullWidth || oMetadata.fullWidth || bLegacyApp
                );
            } else if (sIntent === sRootIntent) {
                fnRootControll();  // close loading screen immediately
            }

            if (!bReuseAnExistingAppSession) {
                this.navTo(oInnerControl.getId());
            }

            oViewPortContainer.switchState("Center");
            utils.setPerformanceMark("FLP -- centerViewPort");
            // Activate container before showing it (start reacting to postMessage calls)
            this.activeContainer(oInnerControl);

            // Assuming a previously existing TR container existed and is now
            // going to be reused, we prompt the container to load the new
            // application context.
            if (bReuseAnExistingAppSession) {
                this.reuseApplicationContainer(oInnerControl, oTarget.applicationType, oTarget.url);
            }
        };

        this.switchViewState = function (sState, bSaveLastState) {
            var sActualState = sState;

            if (oActualElementsModelStateMap[sState] && oActualElementsModelStateMap[sState][appState]) {
                sActualState = oActualElementsModelStateMap[sState][appState];
            }

            var oState = oElementsModel.switchState(sActualState, bSaveLastState);

            if (sState === "searchResults") {
                this.getElementsModel().setProperty("/lastSearchScreen", '');
                if (!window.hasher.getHash().indexOf("Action-search") === 0) {
                    var searchModel = sap.ui.getCore().getModel("searchModel");
                    window.hasher.setHash("Action-search&/searchTerm=" + searchModel.getProperty("/uiFilter/searchTerms") + "&dataSource=" + JSON.stringify(searchModel.getProperty("/uiFilter/dataSource").getJson()));
                }
            }
            //We need to call _handleHomeAndBackButtonsVisibility for the case in which we navigate from 'Home' to 'App'.
            sap.ui.getCore().getEventBus().publish("launchpad", "shellViewStateChanged", oState);
        };
    }


    return new AppLifeCycle();
}, /* bExport= */ true);
