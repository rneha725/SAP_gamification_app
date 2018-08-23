// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define([
    'sap/ushell/ui5service/ShellUIService',
    'sap/ui/Device',
    'sap/ushell/CanvasShapesManager',
    './AccessKeysHandler',
    './History',
    './Lifecycle',
    'sap/ushell/components/applicationIntegration/AppLifeCycle',
    'sap/ushell/services/AppConfiguration',
    'sap/ushell/services/AppType',
    'sap/ushell/services/Message',
    'sap/ushell/services/ShellNavigation',
    'sap/ushell/ui/launchpad/Fiori2LoadingDialog',
    'sap/ushell/utils',
    'sap/ushell/resources',
    'sap/ushell/UserActivityLog',
    'sap/ushell/EventHub',
    'sap/ushell/Config'
], function (
    ShellUIService,
    Device,
    CanvasShapesManager,
    AccessKeysHandler,
    History,
    Lifecycle,
    AppLifeCycle,
    AppConfiguration,
    appType,
    Message,
    ShellNavigation,
    Fiori2LoadingDialog,
    utils,
    resources,
    UserActivityLog,
    EventHub,
    Config
) {
    "use strict";

    /* dont delay these cause they are needed for direct bookmarks */

    // create global model and add some demo data
    var closeAllDialogs = true,
        enableHashChange = true,
        bPreviousPageDirty = false,
        bBackGroundPainted = false,
        oShellModel,
        ShellModel = AppLifeCycle.getElementsModel(),
        oModel,
        oEpcmNavigationMode = {
            embedded: 0,
            newWindowThenEmbedded: 1,
            newWindow: 1,
            replace: 0
        },
        oNavigationMode = {
            embedded: "embedded",
            newWindowThenEmbedded: "newWindowThenEmbedded",
            newWindow: "newWindow",
            replace: "replace"
        },
        oConfig = {},
        fnBackNavigationHander;
    //noinspection JSClosureCompilerSyntax
    /**
     * @name sap.ushell.renderers.fiori2.Shell
     * @extends sap.ui.core.mvc.Controller
     * @public
     */
    sap.ui.controller("sap.ushell.renderers.fiori2.Shell", {

        /**
         * SAPUI5 lifecycle hook.
         * @public
         */
        onInit: function () {
            enableHashChange = true;
            bBackGroundPainted = false;
            closeAllDialogs = true;
            var oView = this.getView();
            var mediaQ = window.matchMedia("(min-width: 600px)"),
                handleMedia;
            var oConfig = (oView.getViewData() ? oView.getViewData().config : {}) || {};

            // The configuration is set by modifying the target `Shell-bootConfig`
            // in the respective system, such that if GUI applications (of type 'TR')
            // should reuse an existing container if any, then the parameter
            // `renderers/fiori2/componentData/config/statefulApplicationContainer/GUI`
            // must be set to `true`.
            AppLifeCycle.parseStatefulContainerConfiguration(oConfig.statefulApplicationContainer);

            this.bMeAreaSelected = false;
            this.bNotificationsSelected = false;

            this.oEndUserFeedbackConfiguration = {
                showAnonymous: true,
                anonymousByDefault: true,
                showLegalAgreement: true,
                showCustomUIContent: true,
                feedbackDialogTitle: true,
                textAreaPlaceholder: true,
                customUIContent: undefined
            };
            this.bMeAreaLoaded = false;
            oConfig["enableBackGroundShapes"] = oConfig.enableBackGroundShapes === undefined ? true : oConfig.enableBackGroundShapes;
            fnBackNavigationHander = this._historyBackNavigation;
            // Add global model to view
            this.initShellModel(oConfig);
            handleMedia = function (mq) {
                oModel.setProperty('/isPhoneWidth', !mq.matches);
            };
            if (mediaQ.addListener) {// Assure that mediaMatch is supported(Not supported on IE9).
                mediaQ.addListener(handleMedia);
                handleMedia(mediaQ);
            }
            oView.setModel(oModel);
            // Bind the translation model to this view
            oView.setModel(resources.i18nModel, "i18n");

            // Assign models to the Shell Header
            oView.oShellHeader.setModel(oModel);
            oView.oShellHeader.setModel(resources.i18nModel, "i18n");

            sap.ui.getCore().getEventBus().subscribe("externalSearch", this.externalSearchTriggered, this);
            // handling of configuration should is done before the code block below otherwise the doHashChange is
            // triggered before the personalization flag is disabled (URL may contain hash value which invokes navigation)
            this._setConfigurationToModel();
            if (oConfig.moveEditHomePageActionToShellHeader) {
                sap.ui.getCore().getEventBus().subscribe("showCatalog", this._hideEditButton, this);
            }
            sap.ui.getCore().getEventBus().subscribe("launchpad", "contentRendered", this._loadCoreExt, this);
            sap.ui.getCore().getEventBus().subscribe("sap.ushell.renderers.fiori2.Renderer", "appOpened", this.setBackGroundShapes, this);
            sap.ui.getCore().getEventBus().subscribe("sap.ushell", "coreResourcesFullyLoaded", this._postCoreExtActivities, this);
            sap.ui.getCore().getEventBus().subscribe("sap.ushell.renderers.fiori2.Renderer", "appOpened", this.delayedCloseLoadingScreen, this);
            sap.ui.getCore().getEventBus().subscribe("launchpad", "toggleContentDensity", this.toggleContentDensity, this);
            sap.ui.getCore().getEventBus().subscribe("sap.ushell.renderers.fiori2.Renderer", "appOpened", this._loadCoreExtNonUI5, this);
            sap.ui.getCore().getEventBus().subscribe("launchpad", "appClosed", this.logApplicationUsage, this);
            sap.ui.getCore().getEventBus().subscribe("launchpad", "shellFloatingContainerDockedIsResize", this._onResizeWithDocking, this);
            sap.ui.getCore().getEventBus().subscribe("launchpad", "launchpadCustomRouterRouteMatched", this._centerViewPort, this);

            // make sure service instance is alive early, no further action needed for now
            sap.ushell.Container.getServiceAsync("AppLifeCycle");

            oShellModel.addHeaderEndItem(["NotificationsCountButton"], false, ["home", "app", "minimal"], true);


            this.history = new History();
            this.oViewPortContainer = sap.ui.getCore().byId("viewPortContainer");
            AppLifeCycle.init(oConfig.appState, this.oViewPortContainer,  oConfig.rootIntent, oConfig.disableHomeAppCache, {
                ownerComponent: this.getOwnerComponent()
            });

            this.oNotificationsCountButton = sap.ui.getCore().byId("NotificationsCountButton");

            this.oFiori2LoadingDialog = sap.ui.getCore().byId("Fiori2LoadingDialog");

            this.oShellNavigation = sap.ushell.Container.getService("ShellNavigation");
            this.oShellNavigation.registerNavigationFilter(this._handleEmptyHash.bind(this));
            // must be after event registration (for synchronous navtarget resolver calls)
            this.oShellNavigation.init(this.doHashChange.bind(this));
            this.oShellNavigation.registerNavigationFilter(this.handleDataLoss.bind(this));

            sap.ushell.Container.getServiceAsync("Message").then(function (oMessageService) {
                oMessageService.init(this.doShowMessage.bind(this));
            }.bind(this));

            sap.ushell.Container.setLogonFrameProvider(this._getLogonFrameProvider()); // TODO: TBD??????????

            AccessKeysHandler.init(oModel);

            window.onbeforeunload = function () {
                if (sap.ushell.Container && sap.ushell.Container.getDirtyFlag()) {
                    if (!resources.browserI18n) {
                        resources.browserI18n = resources.getTranslationModel(window.navigator.language).getResourceBundle();
                    }
                    return resources.browserI18n.getText("dataLossExternalMessage");
                }
            };

            if (oModel.getProperty("/contentDensity")) {
                // do not call _applyContentDensity,
                // no promiss that the component-preload is fully loaded and _applyContentDensity loades the root application.
                // we only want to display the shell in its default state, once the root application will be loaded then the _applyContentDensity will be called with promiss that component-preload loaded.
                AppLifeCycle.getAppMeta()._applyContentDensityClass();
            }

            //in case meArea is on we need to listen to size changes to support
            //overflow behavior for end items in case there is not enough space
            //to show all in the header, and making sure that logo is displayed currectly
            Device.media.attachHandler(this.onScreenSizeChange.bind(this), null, Device.media.RANGESETS.SAP_STANDARD);
            this.onScreenSizeChange(Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD));

            this.initShellUIService();

            // we do this setModel here, as in the View, the shell-navigation-menu is used as an association member
            // of the ShellAppTitle object in which it does not inherit the Model from its parent
            if (this.getView().oShellNavigationMenu) {
                this.getView().oShellNavigationMenu.setModel(oModel);
            }

            sap.ui.getCore().attachThemeChanged(this.redrawBackGroundShapes);

            if (oConfig.sessionTimeoutIntervalInMinutes) {
                var iLazyCreationTime = 20000,
                    that = this;

                setTimeout(function () {
                    that._createSessionHandler(oConfig);
                }, iLazyCreationTime);
            }
        },

        initShellModel: function (oConfig) {
            oShellModel = ShellModel;
            oShellModel.init(oConfig);
            oModel = oShellModel.getModel();
        },

        redrawBackGroundShapes: function () {
            if (oConfig.enableBackGroundShapes) {
                CanvasShapesManager.drawShapes();
            }
        },

        setBackGroundShapes: function () {
            var oView = this.getView(),
                oModel = oView.getModel(),
                bEnableAnimationDrawing = oModel.getProperty('/animationMode') !== 'minimal';

            if (!bBackGroundPainted && oConfig.enableBackGroundShapes) {
                bBackGroundPainted = true;
                CanvasShapesManager.drawShapes();
                CanvasShapesManager.enableAnimationDrawing(bEnableAnimationDrawing);
            }
        },

        initShellUIService: function () {
            AppLifeCycle.initShellUIService({
                fnOnBackNavigationChange: this.onBackNavigationChange.bind(this)
            });

            if (oConfig.enableOnlineStatus) {
                sap.ui.require(["sap/ushell/ui5service/UserStatus"], function (UserStatus) {
                    this.oUserStatus = new UserStatus({
                        scopeObject: this.getOwnerComponent(),
                        scopeType: "component"
                    });


                    this.oUserStatus.attachEnabledStatusChanged(function (oEvent) {
                        this.getModel().setProperty("/userStatusEnabled", oEvent.mParameters.data);
                    }.bind(this));

                    this.oUserStatus.attachStatusChanged(function (oEvent) {
                        this.getModel().setProperty("/userStatus", oEvent.mParameters.data);
                        if (oEvent.mParameters.data == null) {
                            this.getModel().setProperty("/userStatusUserEnabled", false);
                        } else {
                            this.getModel().setProperty("/userStatusUserEnabled", true);
                        }
                    }.bind(this));
                }.bind(this));
            }
        },

        /*
         * This method change the back navigation handler with custom logic in
         * the shell header when the ShellUIService#setBackNavigation method is
         * called.
         * - this method currently assumes that the
         * application is displayed in the "minimal" state (no home button
         * present).
         */
        onBackNavigationChange: function (oEvent) {
            this.isBackNavigationChanged = true;
            var fnCallback = oEvent.getParameters().data,
                oModel = this.getModel(),
                oCurrentStateModel = oModel.getProperty('/currentState/');

            if (fnCallback){
                fnBackNavigationHander = fnCallback;
                if (oCurrentStateModel.stateName === 'minimal' || oCurrentStateModel.stateName === 'standalone' || oCurrentStateModel.stateName === 'embedded') {
                    sap.ushell.Container.getRenderer('fiori2').showHeaderItem('backBtn', true);
                }


            } else {
                //if no callback is provided we set the default handler: history back
                fnBackNavigationHander = this._historyBackNavigation;
            }

        },

        toggleContentDensity: function (sChannelId, sEventId, oData) {
            var isCompact = oData.contentDensity === "compact";
            AppLifeCycle.getAppMeta()._applyContentDensityByPriority(isCompact);
        },

        loadMeAreaView: function () {
            //TODO-PLUGINS
        },

        _handleEmptyHash: function (sHash) {
            sHash = (typeof sHash === "string") ? sHash : "";
            sHash = sHash.split("?")[0];
            if (sHash.length === 0) {
                var oViewData = this.getView() ? this.getView().getViewData() : {};
                oConfig = oViewData.config || {};
                //Migration support:  we have to set rootIntent empty
                //And continue navigation in order to check if  empty hash is resolved locally
                if (oConfig.migrationConfig) {
                    return this.oShellNavigation.NavigationFilterStatus.Continue;
                }
                if (oConfig.rootIntent) {
                    setTimeout(function () {
                        window.hasher.setHash(oConfig.rootIntent);
                    }, 0);
                    return this.oShellNavigation.NavigationFilterStatus.Abandon;
                }
            }
            return this.oShellNavigation.NavigationFilterStatus.Continue;
        },

        _setConfigurationToModel: function () {
            var oViewData = this.getView().getViewData(),
                stateEntryKey,
                curStates;

            if (oViewData) {
                oConfig = oViewData.config || {};
            }
            if (oConfig) {
                if (oConfig.states) {
                    curStates = oModel.getProperty('/states');
                    for (stateEntryKey in oConfig.states) {
                        if (oConfig.states.hasOwnProperty(stateEntryKey)) {
                            curStates[stateEntryKey] = oConfig.states[stateEntryKey];
                        }
                    }
                    oModel.setProperty('/states', curStates);
                }

                if (oConfig.appState === "headerless" || oConfig.appState === "merged" || oConfig.appState === "blank") {
                    // when appState is headerless we also remove the header in home state and disable the personalization.
                    // this is needed in case headerless mode will be used to navigate to the dashboard and not directly to an application.
                    // As 'home' is the official state for the dash board, we change the header visibility property of this state
                    oModel.setProperty("/personalization", false);
                    //update the configuration as well for the method "getModelConfiguration"
                    oConfig.enablePersonalization = false;
                } else if (oConfig.enablePersonalization !== undefined) {
                    oModel.setProperty("/personalization", oConfig.enablePersonalization);
                }

                //EU Feedback flexable configuration
                if (oConfig.changeEndUserFeedbackTitle !== undefined) {
                    this.oEndUserFeedbackConfiguration.feedbackDialogTitle = oConfig.changeEndUserFeedbackTitle;
                }

                if (oConfig.changeEndUserFeedbackPlaceholder !== undefined) {
                    this.oEndUserFeedbackConfiguration.textAreaPlaceholder = oConfig.changeEndUserFeedbackPlaceholder;
                }

                if (oConfig.showEndUserFeedbackAnonymousCheckbox !== undefined) {
                    this.oEndUserFeedbackConfiguration.showAnonymous = oConfig.showEndUserFeedbackAnonymousCheckbox;
                }

                if (oConfig.makeEndUserFeedbackAnonymousByDefault !== undefined) {
                    this.oEndUserFeedbackConfiguration.anonymousByDefault = oConfig.makeEndUserFeedbackAnonymousByDefault;
                }

                if (oConfig.showEndUserFeedbackLegalAgreement !== undefined) {
                    this.oEndUserFeedbackConfiguration.showLegalAgreement = oConfig.showEndUserFeedbackLegalAgreement;
                }
                //EU Feedback configuration end.
                if (oConfig.enableSetTheme !== undefined) {
                    oModel.setProperty("/setTheme", oConfig.enableSetTheme);
                }

                // Compact Cozy mode
                oModel.setProperty("/contentDensity", oConfig.enableContentDensity === undefined ? true : oConfig.enableContentDensity);

                // check for title
                if (oConfig.title) {
                    oModel.setProperty("/title", oConfig.title);
                }
                //Check if the configuration is passed by html of older version(1.28 and lower)
                if (oConfig.migrationConfig !== undefined) {
                    oModel.setProperty("/migrationConfig", oConfig.migrationConfig);
                }
                //User default parameters settings
                if (oConfig.enableUserDefaultParameters !== undefined) {
                    oModel.setProperty("/userDefaultParameters", oConfig.enableUserDefaultParameters);
                }

                if (oConfig.disableHomeAppCache !== undefined) {
                    oModel.setProperty("/disableHomeAppCache", oConfig.disableHomeAppCache);
                }
                // xRay enablement configuration
                oModel.setProperty("/enableHelp", !!oConfig.enableHelp);
                oModel.setProperty("/searchAvailable", (oConfig.enableSearch !== false));


                if (oConfig.sizeBehavior !== undefined) {
                    oModel.setProperty("/sizeBehavior", oConfig.sizeBehavior);
                } else {
                    oModel.setProperty("/sizeBehavior", "Responsive");
                }


                // enable/disable animations
                oModel.bindProperty('/animationMode').attachChange(this.handleAnimationModeChange.bind(this));
                oModel.setProperty("/animationMode", oConfig.animationMode);
                this._getPersonalizer({container:"flp.launchpad.animation.mode", item :"animationMode"}).getPersData().then(function (oUserAnimationMode){
                    oModel.setProperty("/animationMode", oUserAnimationMode ? oUserAnimationMode : oConfig.animationMode);
                    oConfig.animationMode = oUserAnimationMode ? oUserAnimationMode : oConfig.animationMode;
                }.bind(this));

                var oActivityPromise= this._getTrackingUserActivies() ;
                oActivityPromise.done(function (enableTrackingActivity) {
                    if (enableTrackingActivity !== undefined) {
                        oModel.setProperty("/enableTrackingActivity", enableTrackingActivity);
                    } else {
                        oModel.setProperty("/enableTrackingActivity", true);
                    }
                });
            }
        },

        _getTrackingUserActivies: function () {

            var dfdPers = this._getPersonalizer({container:"flp.settings.FlpSettings", item :"userActivitesTracking"}).getPersData();

            dfdPers.fail(function (error) {
                jQuery.sap.log.error(
                    "Failed to load anchor bar state from the personalization", error,
                    "sap.ushell.components.flp.settings.FlpSettings");
            });

            return dfdPers;
        },

        _hideEditButton: function (){
            var editButton = sap.ui.getCore().byId("ActionModeBtn");
            if (editButton) {
                editButton.setVisible(false);
            }
        },
        _getPreviousPageDirty: function () {
            return bPreviousPageDirty;
        },
        _setPreviousPageDirty: function ( bState) {
            bPreviousPageDirty = bState;
        },
        getModelConfiguration: function () {
            var oViewData = this.getView().getViewData(),
                oConfiguration,
                oShellConfig;

            if (oViewData) {
                oConfiguration = oViewData.config || {};
                oShellConfig = jQuery.extend({}, oConfiguration);
            }
            delete oShellConfig.applications;
            return oShellConfig;
        },
        /**
         * This method will be used by the Container service in order to create, show and destroy a Dialog control with an
         * inner iframe. The iframe will be used for rare scenarios in which additional authentication is required. This is
         * mainly related to SAML 2.0 flows.
         * The api sequence will be managed by UI2 services.
         * @returns {{create: Function, show: Function, destroy: Function}}
         * @private
         */
        _getLogonFrameProvider: function () {
            var oView = this.getView();

            return {
                /* @returns a DOM reference to a newly created iFrame. */
                create: function () {
                    return oView.createIFrameDialog();
                },

                /* make the current iFrame visible to user */
                show: function () {
                    oView.showIFrameDialog();
                },

                /* hide, close, and destroy the current iFrame */
                destroy: function () {
                    oView.destroyIFrameDialog();
                }
            };
        },

        onExit: function () {
            sap.ui.getCore().getEventBus().unsubscribe("launchpad", "contentRendered", this._loadCoreExt, this);
            sap.ui.getCore().getEventBus().unsubscribe("sap.ushell.renderers.fiori2.Renderer", "appOpened", this.setBackGroundShapes, this);
            sap.ui.getCore().getEventBus().unsubscribe("sap.ushell.renderers.fiori2.Renderer", "appOpened", this.delayedCloseLoadingScreen, this);
            sap.ui.getCore().getEventBus().unsubscribe("launchpad", "toggleContentDensity", this.toggleContentDensity, this);
            sap.ui.getCore().getEventBus().unsubscribe("sap.ushell.renderers.fiori2.Renderer", "appOpened", this._loadCoreExtNonUI5, this);
            sap.ui.getCore().getEventBus().unsubscribe("launchpad", "appClosed", this.logApplicationUsage, this);
            sap.ui.getCore().getEventBus().unsubscribe("sap.ushell", "coreResourcesFullyLoaded", this._postCoreExtActivities, this);
            sap.ui.getCore().getEventBus().unsubscribe("launchpad", "launchpadCustomRouterRouteMatched", this._centerViewPort, this);
            sap.ui.getCore().getEventBus().unsubscribe("externalSearch", this.externalSearchTriggered, this);
            sap.ui.getCore().getEventBus().unsubscribe("showCatalog", this._hideEditButton, this);
            Device.media.detachHandler(this.onScreenSizeChange.bind(this), null, Device.media.RANGESETS.SAP_STANDARD);

            this.oShellNavigation.hashChanger.destroy();
            this.getView().aDanglingControls.forEach(function (oControl) {
                if (oControl.destroyContent) {
                    oControl.destroyContent();
                }
                oControl.destroy();
            });

            var oShellHeader = this.getView().oShellHeader;
            if (oShellHeader) {
                oShellHeader.destroy();
            }

            UserActivityLog.deactivate(); // TODO:
            oShellModel.destroy();
            oShellModel = undefined;
        },

        handleAnimationModeChange: function () {
            var oView = this.getView(),
                oModel = oView.getModel(),
                sAnimationMode = oModel.getProperty('/animationMode'),
                bEnableAnimationDrawing = sAnimationMode !== 'minimal';

            CanvasShapesManager.enableAnimationDrawing(bEnableAnimationDrawing);
            sap.ui.getCore().getEventBus().publish("launchpad", "animationModeChange", sAnimationMode);

        },

        getAnimationType: function () {
            //return sap.ui.Device.os.android ? "show" : "fade";
            return "show";
        },

        onCurtainClose: function (oEvent) {
            jQuery.sap.log.warning("Closing Curtain", oEvent);


        },

        /**
         * Navigation Filter function registered with ShellNavigation service.
         * Triggered on each navigation.
         * Aborts navigation if there are unsaved data inside app(getDirtyFlag returns true).
         * @param {string} newHash new hash
         * @param {string} oldHash old hash
         * @private
         */
        handleDataLoss: function (newHash, oldHash) {
            if (!enableHashChange) {
                enableHashChange = true;
                this.closeLoadingScreen();
                return this.oShellNavigation.NavigationFilterStatus.Custom;
            }

            if (sap.ushell.Container.getDirtyFlag()) {
                if (!resources.browserI18n) {
                    resources.browserI18n = resources.getTranslationModel(window.navigator.language).getResourceBundle();
                }
                /*eslint-disable no-alert*/
                if (confirm(resources.browserI18n.getText("dataLossInternalMessage"))) {
                    /*eslint-enable no-alert*/
                    sap.ushell.Container.setDirtyFlag(false);
                    bPreviousPageDirty = true;
                    return this.oShellNavigation.NavigationFilterStatus.Continue;
                }
                //when browser back is performed the browser pops the hash from the history, we push it back.
                enableHashChange = false;

                //In case of canceling remove the last hash
                window.history.back();

                return this.oShellNavigation.NavigationFilterStatus.Custom;
            }

            return this.oShellNavigation.NavigationFilterStatus.Continue;
        },
        /**
         * Callback registered with Message service. Triggered on message show request.
         *
         * @private
         */
        doShowMessage: function (iType, sMessage, oParameters) {
            sap.ui.require(["sap/m/MessageToast", "sap/m/MessageBox"], function (MessageToast, MessageBox) {
                if (iType === Message.Type.ERROR) {
                    var bContactSupportEnabled = Config.last("/core/extension/SupportTicket");
                    //check that SupportTicket is enabled and verify that we are not in a flow in which Support ticket creation is failing,
                    // if this is the case we don't want to show the user the contact support button again
                    // Note: Renderer.qunit.js deletes sap.ushell.container before this code is called.
                    //       check if container is available
                    if (sap.ushell.Container && bContactSupportEnabled && sMessage !== resources.i18n.getText("supportTicketCreationFailed")) {
                        sap.ui.require(["sap/ushell/ui/launchpad/EmbeddedSupportErrorMessage"], function (EmbeddedSupportErrorMessage) {
                            try {
                                var errorMsg = new EmbeddedSupportErrorMessage("EmbeddedSupportErrorMessage", {
                                    title: oParameters.title || resources.i18n.getText("error"),
                                    content: new sap.m.Text({
                                        text: sMessage
                                    })
                                });
                                errorMsg.open();
                            } catch (e) {
                                MessageBox.show(sMessage, MessageBox.Icon.ERROR,
                                    oParameters.title || resources.i18n.getText("error"));
                            }
                        });
                    } else {
                        MessageBox.show(sMessage, MessageBox.Icon.ERROR,
                            oParameters.title || resources.i18n.getText("error"));
                    }
                } else if (iType === Message.Type.CONFIRM) {
                    if (oParameters.actions) {
                        MessageBox.show(sMessage, MessageBox.Icon.QUESTION, oParameters.title, oParameters.actions, oParameters.callback);
                    } else {
                        MessageBox.confirm(sMessage, oParameters.callback, oParameters.title);
                    }
                } else {
                    MessageToast.show(sMessage, {duration: oParameters.duration || 3000});
                }
            });
        },

        /**
         * Callback registered with NavService. Triggered on navigation requests
         *
         * A cold start state occurs whenever the user has previously opened the window.
         * - page is refreshed
         * - URL is pasted in an existing window
         * - user opens the page and pastes a URL
         *
         * @return {boolean} whether the application is in a cold start state
         */
        _isColdStart: function () {
            if (this.history.getHistoryLength() <= 1) {  // one navigation: coldstart!
                return true;
            }
            this._isColdStart = function () {
                return false;
            };
            return false;
        },

        _setEnableHashChange : function (bValue) {
            enableHashChange  = bValue;
        },

        _logRecentActivity: function (oRecentActivity) {
            if (this._getConfig() && oShellModel.getModel().getProperty("/enableTrackingActivity")) {
                // Triggering the app usage mechanism to log this openApp action.
                // Using setTimeout in order not to delay the openApp action
                setTimeout(function () {
                    if (sap.ushell.Container) {
                        AppConfiguration.addActivity(oRecentActivity);
                    }
                }, 1500);
            }
        },

        _logOpenAppAction: function (sFixedShellHash) {
            if (oConfig && oConfig.enableTilesOpacity && oConfig.enableRecentActivity && ShellModel.getModel().getProperty("/enableTrackingActivity")) {
                // Triggering the app usage mechanism to log this openApp action.
                // Using setTimeout in order not to delay the openApp action
                setTimeout(function () {
                    if (sap.ushell.Container) {
                        sap.ushell.Container.getServiceAsync("UserRecents").then(function (oUserRecentsService) {
                            oUserRecentsService.addAppUsage(sFixedShellHash);
                        });
                    }
                }, 1500);
            }
        },

        /**
         * Sets application container based on information in URL hash.
         *
         * This is a callback registered with NavService. It's triggered
         * whenever the url (or the hash fragment in the url) changes.
         *
         * NOTE: when this method is called, the new URL is already in the
         *       address bar of the browser. Therefore back navigation is used
         *       to restore the URL in case of wrong navigation or errors.
         *
         * @public
         */
        doHashChange: function (sShellHash, sAppPart, sOldShellHash, sOldAppPart, oParseError) {

            //Performance Debug
            jQuery.sap.measure.start("FLP:ShellController.doHashChange", "doHashChange", "FLP");
            utils.addTime("ShellControllerHashChange");

            return this
                ._doHashChange(this, sShellHash, sAppPart, sOldShellHash, sOldAppPart, oParseError)
                .then(function () {
                    jQuery.sap.measure.end("FLP:ShellController.doHashChange");
                }, function (vError) {
                    jQuery.sap.measure.end("FLP:ShellController.doHashChange");
                    // throw new Error(vError);
                });
        },

        _doHashChange: function (oShellController, sShellHash, sAppPart, sOldShellHash, sOldAppPart, oParseError) {
            var bIsInCache, iOriginalHistoryLength, sFixedShellHash;

            oShellController.lastApplicationFullHash = sOldAppPart ? sOldShellHash + sOldAppPart : sOldShellHash;

            if (!enableHashChange) {
                enableHashChange = true;
                oShellController.closeLoadingScreen();
                return jQuery.when();
            }

            if (oParseError) {
                oShellController.hashChangeFailure(oShellController.history.getHistoryLength(), oParseError.message, null, "sap.ushell.renderers.fiori2.Shell.controller", false);
                return jQuery.when();
            }

            if (sap.m.InstanceManager && closeAllDialogs) {
                sap.m.InstanceManager.closeAllDialogs();
                sap.m.InstanceManager.closeAllPopovers();
            }
            closeAllDialogs = true;

            // navigation begins
            oShellController.openLoadingScreen();

            if (utils.getParameterValueBoolean("sap-ushell-no-ls")) {
                oShellController.closeLoadingScreen();
            }

            // save current history length to handle errors (in case)
            iOriginalHistoryLength = oShellController.history.getHistoryLength();

            sFixedShellHash = oShellController.fixShellHash(sShellHash);

            // track hash change
            oShellController.history.hashChange(sFixedShellHash, sOldShellHash);

            // we save the current-application before resolving the next
            // navigation's fragment, as in cases of navigation in a new window
            // we need to set it back for the app-configuration to be consistent
            oShellController.currentAppBeforeNav = AppConfiguration.getCurrentApplication();

            jQuery.sap.flpmeasure.end(0, "Creating Shell");
            jQuery.sap.flpmeasure.start(0, "targetResolution", 1);

            return oShellController._resolveHashFragment(sFixedShellHash)
                .then(function (oResolvedHashFragment, oParsedShellHash) {
                    /*
                     * NOTE: AppConfiguration.setCurrentApplication was called
                     * with the currently resolved target.
                     */
                    jQuery.sap.flpmeasure.end(0, "targetResolution");
                    jQuery.sap.flpmeasure.start(0, "CreateComponent", 3);

                    var sIntent = oParsedShellHash ? oParsedShellHash.semanticObject + "-" + oParsedShellHash.action : "",
                        oConfig = oShellController._getConfig(),
                        bComponentLoaded = !!(oResolvedHashFragment && oResolvedHashFragment.componentHandle),
                        // for SAPUI5 apps, the application type is still "URL"
                        // due to backwards compatibility, but the
                        // NavTargetResolution service already extracts the
                        // component name, so this can directly be
                        // used as indicator
                        sTargetUi5ComponentName = oResolvedHashFragment && oResolvedHashFragment.ui5ComponentName;

                    // calculate effective Navigation Mode with resolution
                    // result and current Application, we will determine the
                    // next navigation mode.
                    oResolvedHashFragment = oShellController._calculateNavigationMode(oParsedShellHash, oResolvedHashFragment);
                    // if new window, open the window immediately
                    if (oResolvedHashFragment &&
                        (oResolvedHashFragment.navigationMode === oNavigationMode.newWindow ||
                            utils.isNativeWebGuiNavigation(oResolvedHashFragment))
                    ) {
                        // add the app to application usage log
                        if (oConfig && oConfig.enableRecentActivity) {
                            var oMetadata = AppConfiguration.getMetadata(oResolvedHashFragment);
                            var oRecentEntry = {};

                            oRecentEntry.title = oMetadata.title;
                            oRecentEntry.appType = oResolvedHashFragment.applicationType;
                            oRecentEntry.url = sFixedShellHash;
                            oRecentEntry.appId = sFixedShellHash;

                            oShellController._logRecentActivity(oRecentEntry);
                        }
                        oShellController._openAppInNewWindowAndRestore(oResolvedHashFragment);
                        return;
                    }

                    // In case of empty hash, if there is a resolved target, set
                    // the flag to false, from now on the rootIntent will be an
                    // empty hash. Otherwise, change hash to rootIntent to
                    // trigger normal resolution.
                    if (oShellController.getModel().getProperty("/migrationConfig")) {
                        oConfig.migrationConfig = false;
                        oShellController.getModel().setProperty("/migrationConfig", false);

                        if (oResolvedHashFragment && sFixedShellHash === '#') {
                            oConfig.rootIntent = "";
                        } else if (sFixedShellHash === '#') {
                            setTimeout(function () {
                                window.hasher.setHash(oConfig.rootIntent);
                            }, 0);
                            return;
                        }
                    }

                    // add application config to the application properties
                    if (oConfig && oConfig.applications && oConfig.applications[sIntent]) {
                        oResolvedHashFragment.applicationConfiguration = oConfig.applications[sIntent];
                    }

                    bIsInCache = AppLifeCycle.isAppInCache("application-" + sIntent);

                    if (bComponentLoaded || bIsInCache || !sTargetUi5ComponentName) {
                        oShellController._initiateApplication(oResolvedHashFragment, sFixedShellHash, oParsedShellHash, iOriginalHistoryLength);
                        return;
                    }

                    AppLifeCycle.removeApplication(sIntent);
                    AppConfiguration.setApplicationInInitMode();

                    // normal application:
                    // fire the _prior.newUI5ComponentInstantion event before creating the new component instance, so that
                    // the ApplicationContainer can stop the router of the current app (avoid inner-app hash change notifications)
                    // TODO: this dependency to the ApplicationContainer is not nice, but we need a fast fix now; we should refactor
                    // the ApplicationContainer code, because most of the logic has to be done by the shell controller; maybe rather introduce
                    // a utility module
                    sap.ui.getCore().getEventBus().publish("ApplicationContainer", "_prior.newUI5ComponentInstantion",
                        {
                            name: sTargetUi5ComponentName
                        }
                    );

                    //Performance Debug
                    jQuery.sap.measure.start("FLP:ShellController.UI5createComponent", "UI5 createComponent", "FLP");
                    // load ui5 component via shell service; core-ext-light will be loaded as part of the asyncHints

                    AppLifeCycle.createComponent(oResolvedHashFragment, oParsedShellHash).done(function (oResolutionResultWithComponentHandle) {
                        // `oResolutionResultWithComponentHandle` is unused.
                        // This is because oResolvedHashFragment contains the
                        // component handle already.
                        // See the preceeding 'fixme' in AppLifeCycle.createComponent.
                        jQuery.sap.measure.end("FLP:ShellController.UI5createComponent");
                        jQuery.sap.flpmeasure.end(0, "CreateComponent");
                        oShellController._initiateApplication(oResolvedHashFragment, sFixedShellHash, oParsedShellHash, iOriginalHistoryLength);
                    }).fail(function (vError) {
                        AppConfiguration.setCurrentApplication(oShellController.currentAppBeforeNav);

                        oShellController.hashChangeFailure(iOriginalHistoryLength, "Failed to load UI5 component for navigation intent " + sFixedShellHash,
                            vError, "sap.ushell.renderers.fiori2.Shell.controller", false);
                    });
                }, function (sMsg) {
                    var sErrorReason;

                    sErrorReason = "Failed to resolve navigation target: \"" + sFixedShellHash + "\""
                        + ". This is most likely caused by an incorrect SAP Fiori launchpad content configuration"
                        + " or by missing role assignment.";

                    oShellController.hashChangeFailure(iOriginalHistoryLength, sErrorReason,
                        sMsg, "sap.ushell.renderers.fiori2.Shell.controller", false);
                });
        },

        _initiateApplication: function (oResolvedHashFragment, sFixedShellHash, oParsedShellHash, iOriginalHistoryLength) {
            //Performance Debug
            jQuery.sap.measure.start("FLP:ShellController._initiateApplication", "_initiateApplication","FLP");
            var oMetadata = AppConfiguration.getMetadata(oResolvedHashFragment),
                bContactSupportEnabled = Config.last("/core/extension/SupportTicket");

            //the "if" should protect against undefined, empty string and null
            if (oMetadata.title) {
                window.document.title = oMetadata.title;
            } else {
                // FIXME: Remove title so that users don't think it's a bug
                jQuery.sap.log.debug("Shell controller._initiateApplication: the title of the window is not changed because most probably the application was resolved with undefined");
            }
            // the activation of user activity logging must be done after the app component is fully loaded
            // otherwise the module loading sequence causes race conditions on firefox
            if (bContactSupportEnabled) {
                setTimeout(function () {
                    sap.ushell.UserActivityLog.activate();
                }, 0);
            }
            this._logOpenAppAction(sFixedShellHash);

            try {
                this.navigate(oParsedShellHash, sFixedShellHash, oMetadata, oResolvedHashFragment);
            } catch (oExc) {
                if (oExc.stack) {
                    jQuery.sap.log.error("Application initialization (Intent: \n" + sFixedShellHash + "\n failed due to an Exception:\n" + oExc.stack);
                }
                this.hashChangeFailure(iOriginalHistoryLength, oExc.name, oExc.message, oMetadata ? oMetadata.title : "", false);
            } finally {
                // always load UI plug-ins after navigation, except when the core resources are not yet fully loaded
                // this flag is false or undefined if core-ext loading was explicitly switched off (homepage case)
                // or the resolved target is not a UI5 app; in that case, the plug-in loading is triggered by the AppOpened event

                if (oResolvedHashFragment && oResolvedHashFragment.coreResourcesFullyLoaded && !this._pluginLoadingTriggered) {
                    this._loadRendererExtensionPlugins();
                }
            }

            jQuery.sap.measure.end("FLP:ShellController._initiateApplication");
        },

        /**
         * Callback registered with NavService. Triggered on navigation requests
         *
         * @param {string} sShellHash
         *     the hash fragment to parse (must start with "#")
         *
         * @returns {jQuery.Deferred.promise}
         *     a promise resolved with an object containing the resolved hash
         *     fragment (i.e., the result of
         *     {@link sap.ushell.services.NavTargetResolution#resolveHashFragment}),
         *     the parsed shell hash obtained via
         *     {@link sap.ushell.services.URLParsing#parseShellHash},
         *     and a boolean value indicating whether application dependencies <b>and</b> core-ext-light were loaded earlier.
         *     The promise is rejected with an error message in case errors occur.
         */
        _resolveHashFragment: function (sShellHash) {
            //Performance Debug
            jQuery.sap.measure.start("FLP:ShellController._resolveHashFragment", "_resolveHashFragment","FLP");
            var oResolvedHashFragment,
                oParsedShellHashParams,
                oParsedShellHash = sap.ushell.Container.getService("URLParsing").parseShellHash(sShellHash),
                oDeferred = new jQuery.Deferred(),
                oConfig = this._getConfig(); // for testing

            /*
             * Optimization: reconstruct the result of resolveHashFragment if
             * navResCtx is found in the hash fragment.
             */
            oParsedShellHashParams = oParsedShellHash && oParsedShellHash.params || {};
            if (oParsedShellHash && oParsedShellHash.contextRaw && oParsedShellHash.contextRaw === "navResCtx"
                // be robust
                && oParsedShellHashParams
                && oParsedShellHashParams.additionalInformation && (oParsedShellHashParams.additionalInformation[0] || oParsedShellHashParams.additionalInformation[0] === "")
                && oParsedShellHashParams.applicationType && oParsedShellHashParams.applicationType[0]
                && oParsedShellHashParams.url && oParsedShellHashParams.url[0]
                && oParsedShellHashParams.navigationMode && (oParsedShellHashParams.navigationMode[0] || oParsedShellHashParams.additionalInformation[0] === "")
            //&& oParsedShellHashParams.title            && oParsedShellHashParams.title[0]
            ) {
                oParsedShellHashParams = oParsedShellHash.params || {};

                oResolvedHashFragment = {
                    additionalInformation: oParsedShellHashParams.additionalInformation[0],
                    applicationType: oParsedShellHashParams.applicationType[0],
                    url: oParsedShellHashParams.url[0],
                    navigationMode: oParsedShellHashParams.navigationMode[0]
                };

                if (oParsedShellHashParams.title) {
                    oResolvedHashFragment.text = oParsedShellHashParams.title[0];
                }

                oDeferred.resolve(oResolvedHashFragment, oParsedShellHash);
            } else {
                // Check and use resolved hash fragment from direct start promise if it's there
                if (window["sap-ushell-async-libs-promise-directstart"]) {
                    window["sap-ushell-async-libs-promise-directstart"]
                        .then(function (oDirectstartPromiseResult) {
                                oDeferred.resolve(
                                    oDirectstartPromiseResult.resolvedHashFragment,
                                    oParsedShellHash
                                );
                                delete window["sap-ushell-async-libs-promise-directstart"];
                            },
                            function (sMsg) {
                                oDeferred.reject(sMsg);
                                delete window["sap-ushell-async-libs-promise-directstart"];
                            });
                    return oDeferred.promise();
                }

                // Perform target resolution as normal...
                sap.ushell.Container.getService("NavTargetResolution").resolveHashFragment(sShellHash)
                    .done(function (oResolvedHashFragment) {
                        /*
                         * Override navigation mode for root intent.  Shell
                         * home should be opened in embedded mode to allow a
                         * new window to be opened from GUI applications.
                         */
                        if (oParsedShellHash && (oParsedShellHash.semanticObject + "-" + oParsedShellHash.action) === oConfig.rootIntent) {
                            oResolvedHashFragment.navigationMode = "embedded";
                        }
                        jQuery.sap.measure.end("FLP:ShellController._resolveHashFragment");

                        oDeferred.resolve(oResolvedHashFragment, oParsedShellHash);
                    })
                    .fail(function (sMsg) {
                        oDeferred.reject(sMsg);
                    });
            }
            return oDeferred.promise();
        },

        /**
         * Adjust Navigation mode
         * based on current state of the Shell and application and
         * the ResolveHashFragment bo be started
         *
         * This operation mutates oResolvedHashFragment
         *
         *
         * {@link #navigate}.
         *
         * @param {object} oParsedShellHash
         *     the parsed shell hash obtained via
         *     {@link sap.ushell.services.URLParsing} service
         * @param {object} oResolvedHashFragment
         *     the hash fragment resolved via
         *     {@link sap.ushell.services.NavTargetResolution#resolveHashFragment}
         *
         * @returns {object} a new, potentially altered resolution result
         * Note that url and navigation mode may have been changed!
         * For navigation in new window, the URL is replaced with the current location hash
         * TODO: refactor this; we should not have these implicit changes of the navigation target
         * @private
         */
        _calculateNavigationMode : function (oParsedShellHash, oResolvedHashFragment) {
            if (!oResolvedHashFragment) {
                return undefined; // happens in tests
            }
            var sNavigationMode = oResolvedHashFragment.navigationMode;

            if (sNavigationMode === oNavigationMode.newWindowThenEmbedded) {
                /*
                 * Implement newWindowThenEmbedded based on current state.
                 */
                if (this._isColdStart()
                    || (oParsedShellHash.contextRaw && oParsedShellHash.contextRaw === "navResCtx")
                    || this.history.backwards) {
                    /*
                     * coldstart -> always open in place because the new window
                     *              was opened by the user
                     *
                     * navResCtx -> url was generated by us and opened in a new
                     *              window or pasted in an existing window
                     *
                     * history.backwards -> url was was previously opened in
                     *              embedded mode (at any point in the
                     *              history), and we need to navigate back to
                     *              it in the same mode.
                     */
                    oResolvedHashFragment.navigationMode = oNavigationMode.embedded;
                } else {
                    oResolvedHashFragment.navigationMode = oNavigationMode.newWindow;
                    // if its a non-native navigation, we resolve the hash again in the new window
                    // we set the full current location hash as URL for the new window as it is
                    // for avoiding encoding issues and stripping off parameters or inner-app route
                    // see internal BCP 1770274241
                    if (!utils.isNativeWebGuiNavigation(oResolvedHashFragment)) {
                        oResolvedHashFragment.url = this._getCurrentLocationHash();
                    }
                }
                return oResolvedHashFragment;
            }

            if (sNavigationMode === oNavigationMode.newWindow && this._isColdStart()) {
                /*
                 * Replace the content of the current window if the user has
                 * already opened one.
                 */
                oResolvedHashFragment.navigationMode = oNavigationMode.replace;
                return oResolvedHashFragment;
            }
            return oResolvedHashFragment;
        },

        _usesNavigationRedirect : function (oComponentHandle) {
            if (!oComponentHandle) {
                return new jQuery.Deferred().reject().promise();
            }
            var that = this,
                oComponent = oComponentHandle.getInstance({});
            if (oComponent && typeof oComponent.navigationRedirect === "function") {
                // oComponent refers to a trampolin application
                var oDeferred = new jQuery.Deferred();
                var oNavRedirPromise = oComponent.navigationRedirect();
                if (oNavRedirPromise
                    && typeof oNavRedirPromise.then === "function" ) {
                    oNavRedirPromise.then(function (sNextHash) {
                        jQuery.sap.log.warning("Performing navigation redirect to hash " + sNextHash);
                        oComponent.destroy();
                        that.history.pop();
                        sap.ushell.Container.getService("ShellNavigation").toExternal( { target : { shellHash : sNextHash } }, undefined, false);
                        oDeferred.resolve(true);
                    }, function () {
                        oDeferred.reject();
                    });
                    return oDeferred.promise();
                }
            }
            return new jQuery.Deferred().reject().promise();
        },
        /**
         * Performs navigation based on the given resolved hash fragment.
         *
         * @param {object} oParsedShellHash
         *     the parsed shell hash obtained via
         *     {@link sap.ushell.services.URLParsing} service
         * @param {string} sFixedShellHash
         *     the hash fragment to navigate to. It must start with "#" (i.e., fixed).<br />
         * @param {object} oMetadata
         *     the metadata object obtained via
         *     {@link sap.ushell.services.AppConfiguration#parseShellHash}
         * @param {object} oResolvedHashFragment
         *     the hash fragment resolved via
         *     {@link sap.ushell.services.NavTargetResolution#resolveHashFragment}
         */
        navigate: function (oParsedShellHash, sFixedShellHash, oMetadata, oResolvedHashFragment) {
            //Performance Debug
            jQuery.sap.measure.start("FLP:ShellController.navigate", "navigate","FLP");
            var sNavigationMode = (jQuery.isPlainObject(oResolvedHashFragment) ? oResolvedHashFragment.navigationMode : null),
                that = this;

            /*
             * A null navigationMode is a no-op, it indicates no navigation
             * should occur. However, we need to restore the current hash to
             * the previous one. If coldstart happened (history has only one
             * entry), we go to the shell home.
             */
            if (sNavigationMode === null) {
                if (this._isColdStart()) {
                    window.hasher.setHash("");
                    return;
                }

                enableHashChange = false;
                this.history.pop();
                this._windowHistoryBack(1);
                return;
            }

            oResolvedHashFragment = this._calculateNavigationMode(oParsedShellHash, oResolvedHashFragment);
            sNavigationMode = (jQuery.isPlainObject(oResolvedHashFragment) ? oResolvedHashFragment.navigationMode : null);

            if (sNavigationMode === oNavigationMode.embedded) {
                var oDeferred = this._usesNavigationRedirect(oResolvedHashFragment.componentHandle);
                // When `oDeferred` succeeds, it implies the component references
                // a trampolin application. The trampolin application subsequently
                // gets destroyed after it's used to enable the redirection.
                // The failure is being used here as a means for branching in
                // the execution flow.
                oDeferred.then(null, function () {
                    that._handleEmbeddedNavMode(sFixedShellHash, oParsedShellHash, oMetadata, oResolvedHashFragment);
                    // maybe restore hash...
                    if (oParsedShellHash && oParsedShellHash.contextRaw === "navResCtx") {
                        jQuery.sap.log.error(" This path will no longer be supported in 1.40");
                        // historical invocation pattern no longer used which allowed
                        // injectiong foreign urls via url parameter
                        // -> prone to url injection
                        //
                        // invication via this mechanism is flawed as it does not resolve
                        // the target in the new window, thus leading to
                        // states which are not consistent (e.g. NavTargetResolution.getCurrentResolutionResult) is wrong.
                        //
                        // should be removed from product for security and complexity considerations
                        //
                        enableHashChange = false;
                        //replace tiny hash in window
                        // PLEASE don't only treat the sunny side of the beach:
                        // just use the intent X-Y~navResCtx without the fancy stuff and see how it crashes.
                        if (oParsedShellHash
                            && oParsedShellHash.params
                            && oParsedShellHash.params.original_intent
                            && oParsedShellHash.params.original_intent[0]) {
                            window. hasher.replaceHash(oParsedShellHash.params.original_intent[0]);
                            // replace tiny hash in our history model
                            that.history._history[0] = oParsedShellHash.params.original_intent[0];
                        }
                    }
                });
                jQuery.sap.measure.end("FLP:ShellController.navigate");
                return;
            }

            if (sNavigationMode === oNavigationMode.replace) {
                // restore hash
                enableHashChange = false;
                this._changeWindowLocation(oResolvedHashFragment.url);
                return;
            }

            if (sNavigationMode === oNavigationMode.newWindow) {
                this._openAppInNewWindowAndRestore(oResolvedHashFragment);
                return;
            }

            // the navigation mode doesn't match any valid one.
            // In this case an error message is logged and previous hash is fetched
            this.hashChangeFailure(this.history.getHistoryLength(), "Navigation mode is not recognized", null, "sap.ushell.renderers.fiori2.Shell.controller", false);
        },

        _openAppInNewWindowAndRestore : function (oResolvedHashFragment) {
            // restore hash
            enableHashChange = false;
            // if NWBC native application, start immediately
            if (utils.isNativeWebGuiNavigation(oResolvedHashFragment)) {
                try {
                    var sUrlWithSapUser = utils.appendUserIdToUrl("sap-user", oResolvedHashFragment.url);
                    var oEpcm =  utils.getPrivateEpcm();
                    var iEpcmNavigationMode = oEpcmNavigationMode[oResolvedHashFragment.navigationMode];
                    if (utils.hasNavigationModeCapability()) {
                        oEpcm.doNavigate(sUrlWithSapUser, iEpcmNavigationMode || oEpcmNavigationMode[oNavigationMode.embedded]);
                    } else {
                        oEpcm.doNavigate(sUrlWithSapUser);
                    }
                } catch (e) {
                    if (e.stack) {
                        jQuery.sap.log.error("Application initialization failed due to an Exception:\n" + e.stack);
                    }
                    this.hashChangeFailure(this.history.getHistoryLength(), e.name, e.message, oResolvedHashFragment.text, false);
                }
            } else {
                this._openAppNewWindow(oResolvedHashFragment.url);
            }
            this.history.pop();
            var oVarInstance = oResolvedHashFragment.componentHandle && oResolvedHashFragment.componentHandle.getInstance &&
                oResolvedHashFragment.componentHandle.getInstance({});
            if (oVarInstance) {
                oVarInstance.destroy();
            }
            this._windowHistoryBack(1);
            // set back the current application to be the one before this navigation occured as current application
            // is opened in a new window
            AppConfiguration.setCurrentApplication(this.currentAppBeforeNav);
            return;
        },

        _handleEmbeddedNavMode: function (sFixedShellHash, oParsedShellHash, oMetadata, oResolvedHashFragment) {
            //Performance Debug
            jQuery.sap.measure.start("FLP:ShellController._handleEmbeddedNavMode", "_handleEmbeddedNavMode", "FLP");
            var sAppId,
                bIsNavToHome,
                sIntent;

            this.resetShellUIServiceHandlers();

            AppLifeCycle.getAppMeta().setAppIcons(oMetadata);

            // obtain a unique id for the app (or the component)
            sAppId = '-' + oParsedShellHash.semanticObject + '-' + oParsedShellHash.action;

            bIsNavToHome = sFixedShellHash === "#" ||
                (oConfig.rootIntent && oConfig.rootIntent === oParsedShellHash.semanticObject + "-" + oParsedShellHash.action);

            //Support migration from version 1.28 or lower in case local resolution for empty hash was used
            sIntent = oParsedShellHash ? oParsedShellHash.semanticObject + "-" + oParsedShellHash.action : "";

            AppLifeCycle.switchViewState(
                AppLifeCycle.calculateElementsState(
                    bIsNavToHome? "home": "app",
                    oResolvedHashFragment.applicationType,
                    oConfig.appState,
                    oResolvedHashFragment.explicitNavMode
                )
            );

            if (bIsNavToHome) {
                AppLifeCycle.getShellUIService().setBackNavigation();
            }

            this._handleHomeAndBackButtonsVisibility();

            AppLifeCycle.handleControl(sIntent,
                sAppId,
                oResolvedHashFragment,
                this.getWrappedApplicationWithMoreStrictnessInIntention.bind(this),
                this.closeLoadingScreen.bind(this)
            );

            this.closeLoadingScreen();

            if (this.currentAppBeforeNav) {
                var oPreviousStatefulContainer = AppLifeCycle.getStatefulContainer(this.currentAppBeforeNav.applicationType);
                if (oPreviousStatefulContainer) {
                    oPreviousStatefulContainer.onApplicationOpened(oResolvedHashFragment.applicationType);
                }
            }

            jQuery.sap.measure.end("FLP:ShellController._handleEmbeddedNavMode");
        },

        _centerViewPort: function () {
            this.oViewPortContainer.switchState("Center");
        },

        _isShellHomeIntent: function (sIntent) {
            return sIntent === "#" || sIntent === oConfig.rootIntent;
        },


        // Please help improve the strictness of this method.
        getWrappedApplicationWithMoreStrictnessInIntention: function (sIntent, oMetadata, oResolvedNavigationTarget, sAppId, bFullWidth) {
            var oAppContainer, that = this;

            setTimeout(function () {

                setTimeout(function () {
                    //set the focus to shell

                    //If we navigate for a page with state == app set focus on shell app title, otherwise continue
                    // as default behavior
                    var arg;
                    if (oModel.getProperty("/currentState/stateName") === "app") {
                        arg = "shellAppTitle";
                    }

                    AccessKeysHandler.sendFocusBackToShell(arg);

                    setTimeout(function () {
                        //Screen reader: "Loading Complete"
                        that.readNavigationEnd();
                    }, 500);
                }, 100);

                sap.ui.getCore().getEventBus().publish("launchpad", "appOpening", oResolvedNavigationTarget);
                jQuery.sap.log.info('app is being opened');
            }, 0);
            if (oConfig.applications) {
                oResolvedNavigationTarget.applicationConfiguration = oConfig.applications[sIntent];
            }

            oAppContainer = AppLifeCycle.getAppContainer(sAppId, oResolvedNavigationTarget, this._isColdStart());

            // adding intent as this published application info is required for the contact-support scenario
            oResolvedNavigationTarget.sShellHash = sIntent;
            AppLifeCycle.publishNavigationStateEvents(oAppContainer, oResolvedNavigationTarget, this.onAppAfterRendering.bind(this, oResolvedNavigationTarget));


            oAppContainer.addStyleClass('sapUshellApplicationPage');

            if (!bFullWidth) {
                oAppContainer.addStyleClass("sapUShellApplicationContainerLimitedWidth");
            }

            if (this._isDock() && window.matchMedia('(min-width: 106.4rem)').matches) {
                oAppContainer.addStyleClass("sapUShellDockingContainer");
                oAppContainer.removeStyleClass("sapUShellApplicationContainerLimitedWidth");
            } else if (this._isDock()) {
                oAppContainer.removeStyleClass("sapUShellApplicationContainerLimitedWidth");
            }

            oAppContainer.toggleStyleClass('sapUshellDefaultBackground', !oMetadata.hideLightBackground);

            AppLifeCycle.getAppMeta()._applyContentDensityByPriority();

            oAppContainer.onfocusin = function () {
                //focus not in the shell
                AccessKeysHandler.bFocusOnShell = false;
                AccessKeysHandler.bFocusPassedToExternalHandlerFirstTime = false;
            };
            oAppContainer.onfocusout = function () {
                //focus in the shell
                AccessKeysHandler.bFocusOnShell = true;
                AccessKeysHandler.bFocusPassedToExternalHandlerFirstTime = true;
            };

            // Add inner control for next request
            AppLifeCycle.addControl(oAppContainer);

            setTimeout(function () {
                that.closeLoadingScreen();//In order to prevent unnecessary opening of the loading screen, we close it after the app rendered
            }, 0);

            jQuery.sap.measure.end("FLP:ShellController.getWrappedApplication");
            return oAppContainer;
        },

        //Set booleans to false which indicate whether shellUIService was called or not
        resetShellUIServiceHandlers: function () {
            AppLifeCycle.resetShellUIServiceHandlers();
            this.isBackNavigationChanged = false;
        },


        onAppAfterRendering: function (oApplication) {
            var oShellUIService = AppLifeCycle.getShellUIService();
            //wrapped in setTimeout since "pubilsh" is not async
            setTimeout(function () {
                sap.ui.getCore().getEventBus().publish("launchpad", "appOpened", oApplication);
                jQuery.sap.log.info('app was opened');
            }, 0);

            //publish the event externally
            // TODO: cloned, frozen object!
            var oAppOpenedEventData = AppLifeCycle._publicEventDataFromResolutionResult(oApplication);
            sap.ushell.renderers.fiori2.utils.publishExternalEvent("appOpened", oAppOpenedEventData);

            //Call setHierarchy, setTitle, setRelatedApps with default values in case handlers were not called yet
            if (oShellUIService) {
                if (!AppLifeCycle.getIsHierarchyChanged()) {
                    oShellUIService.setHierarchy();
                }
                if (!AppLifeCycle.getIsTitleChanged()) {
                    oShellUIService.setTitle();
                }
                if (!AppLifeCycle.getIsRelatedAppsChanged()) {
                    oShellUIService.setRelatedApps();
                }
                if (!this.isBackNavigationChanged) {
                    oShellUIService.setBackNavigation();
                }
            }
            oShellModel.updateStateProperty("application/icon", AppLifeCycle.getAppMeta().getAppIcon(), true);
            oShellModel.updateStateProperty("application/showNavMenuTitle", this.bNavMenuTitleVisible, true);
        },

        /**
         * adds a listener to the "componentCreated" Event that is published by the
         * "sap.ushell.components.container.ApplicationContainer".
         * once the "home app" Component is saved, the listener is removed, and this function
         * will not do anything.
         */
        _saveHomePageComponent: function () {
            if (this.oHomeApp) {
                return;
            }
            var that = this,
                sContainerNS = "sap.ushell.components.container.ApplicationContainer",
                fListener = function (oEvent, sChannel, oData) {
                    that.oHomeApp = oData.component;
                    sap.ui.getCore().getEventBus().unsubscribe(sContainerNS, 'componentCreated', fListener);
                };
            sap.ui.getCore().getEventBus().subscribe(sContainerNS, 'componentCreated', fListener);
        },

        /**
         * Shows an error message and navigates to the previous page.
         *
         * @param {number} iHistoryLength the length of the history
         *    <b>before</b> the navigation occurred.
         * @param {string} sMessage the error message
         * @param {string} sDetails the detailed error message
         * @param {string} sComponent the component that generated the error message
         */
        hashChangeFailure: function (iHistoryLength, sMessage, sDetails, sComponent, bEnableHashChange) {
            this.reportError(sMessage, sDetails, sComponent);
            this.closeLoadingScreen();
            //use timeout to avoid "MessageService not initialized.: error
            this.delayedMessageError(resources.i18n.getText("fail_to_start_app_try_later"));
            closeAllDialogs = false;

            if (iHistoryLength === 0) {
                // if started with an illegal shell hash (deep link), we just remove the hash
                window.hasher.setHash("");
            } else {
                // navigate to the previous URL since in this state the hash that has failed to load is in the URL.
                if (jQuery.sap.getUriParameters().get("bFallbackToShellHome")) {
                    // The previous url is not valid navigation
                    window.hasher.setHash("");
                } else {
                    enableHashChange = bEnableHashChange;
                    sap.ushell.Container.setDirtyFlag(bPreviousPageDirty);
                    this._windowHistoryBack(1);
                }
            }
        },

        reportError: function (sMessage, sDetails, sComponent) {
            jQuery.sap.log.error(sMessage, sDetails, sComponent);
        },

        delayedMessageError: function (sMsg) {
            setTimeout(function () {
                if (sap.ushell.Container !== undefined) {
                    sap.ushell.Container.getService("Message").error(sMsg);
                }
            }, 0);
        },

        fixShellHash: function (sShellHash) {
            if (!sShellHash) {
                sShellHash = '#';
            } else if (sShellHash.charAt(0) !== '#') {
                sShellHash = '#' + sShellHash;
            }
            return sShellHash;
        },

        _openAppNewWindow: function (sUrl) {
            var newWin = window.open(sUrl);

            if (!newWin) {
                var msg = resources.i18n.getText("fail_to_start_app_popup_blocker", [window.location.hostname]);
                this.delayedMessageError(msg);
            }
        },

        _windowHistoryBack: function (iStepsBack) {
            window.history.back(iStepsBack);
        },

        _changeWindowLocation: function (sUrl) {
            window.location.href = sUrl;
        },

        /**
         * sizeChange handler, trigger by the sap.ui.Device.media.attachHandler
         * to handle header end ites overflow scenario
         * @param oParams
         */
        handleEndItemsOverflow: function (oParams){
            var aEndItems = this.getModel().getProperty("/currentState/headEndItems");
            //if there are 2 items and one of them is Notifications or if there is only 1 item, we won't show overflow button
            if (aEndItems.length === 1 || (aEndItems.length === 2 && aEndItems.indexOf("NotificationsCountButton") != -1) ){
                return;
            }
            function removeOverFlowBtn () {
                oShellModel.removeHeaderEndItem(["endItemsOverflowBtn"], false, ["home", "app"]);
                var oPopover = sap.ui.getCore().byId('headEndItemsOverflow');
                if (oPopover) {
                    //we have to destroy the popover in order to make sure the enditems will
                    //be rendered currectly in the header and to avoid duplicate elements
                    //ids in the dom
                    oPopover.destroy();
                }
            }

            if (oParams.name === 'Phone' || oParams.name === 'Tablet') {
                if ( aEndItems.indexOf("endItemsOverflowBtn") === -1) {
                    //we need to add the endItemsOverflowBtn to the model in case we are
                    //not in desktop mode and in case it does not exists
                    oShellModel.addHeaderEndItem(["endItemsOverflowBtn"], false, ["home", "app"]);
                } else {
                    //this case is when the overflow button exists and we have switched between Tablet and Phone media causing header items
                    //to get in or out of the popover, hence we need to re-render the shell header.
                    removeOverFlowBtn();
                    oShellModel.addHeaderEndItem(["endItemsOverflowBtn"], false, ["home", "app"]);
                }
            } else if (oParams.name === "Desktop") {
                if (oParams.showOverFlowBtn) {
                    if (aEndItems.indexOf("endItemsOverflowBtn") === -1) {
                        oShellModel.addHeaderEndItem(["endItemsOverflowBtn"], false, ["home", "app"]);
                    }
                } else {
                    //we need to remove the endItemsOverflowBtn from the model in case we are
                    removeOverFlowBtn();
                }
            }
        },

        /**
         * returns true if we are in overflow mode
         * we enter the overflow mode in case:
         *  - meArea is on
         *  - current width of the screen is not desktop (as recived from the sap.ui.Device.media
         *  - we have 3 buttons in the header (exluding the endItemsOverflowBtn)
         * @returns {boolean} result
         */
        isHeadEndItemOverflow: function () {
            var nNumberOfVisibleElements = 0,
                oElement,
                aEndItems = this.getModel().getProperty("/currentState/headEndItems");

            if (aEndItems.indexOf("endItemsOverflowBtn") === -1) {
                return false;
            } else {
                var currentMediaType = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name;
                var numAllowedBtn = 3;
                if (currentMediaType === "Phone") {
                    numAllowedBtn = 1;
                }

                //calculate number nNumberOfVisibleElements
                for (var i = 0; i < aEndItems.length; i++) {
                    oElement = sap.ui.getCore().byId(aEndItems[i]);
                    if (oElement.getVisible()) {
                        nNumberOfVisibleElements++;
                    }
                }

                if (sap.ui.getCore().byId("endItemsOverflowBtn").getVisible()) {
                    return nNumberOfVisibleElements > numAllowedBtn + 1;
                } else {
                    return nNumberOfVisibleElements > numAllowedBtn;
                }
            }
        },

        /**
         * return true for buttons that should go in the overflow and not in the header
         * @param {string} sButtonNameInUpperCase button name
         * @returns {boolean} isHeadEndItemInOverflow
         */
        isHeadEndItemInOverflow: function (sButtonNameInUpperCase) {
            return sButtonNameInUpperCase !== "ENDITEMSOVERFLOWBTN" && !this.isHeadEndItemNotInOverflow(sButtonNameInUpperCase);
        },

        /**
         * return true for buttons that should be in the header and not in oveflow
         * In case overflow mode is on @see isHeadEndItemOverflow only the
         * NotificationsCountButton and the endItemsOverflowButtons should be in the header
         * in case overflow mode is off all buttons except endItemsOverflowButtons
         * should be in the header
         *
         * @param sButtonNameInUpperCase
         * @returns {boolean} isHeadEndItemNotInOverflow
         */
        isHeadEndItemNotInOverflow: function (sButtonNameInUpperCase) {
            if (this.isHeadEndItemOverflow()) {
                if (sButtonNameInUpperCase === "NOTIFICATIONSCOUNTBUTTON" || sButtonNameInUpperCase === "ENDITEMSOVERFLOWBTN") {
                    return true;
                } else {
                    var sSizeType = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name;
                    if (sSizeType === "Tablet") {
                        return sButtonNameInUpperCase === "SF" || sButtonNameInUpperCase === "FLOATINGCONTAINERBUTTON";
                    } else if (sSizeType === "Desktop") {
                        return sButtonNameInUpperCase === "SF" || sButtonNameInUpperCase === "FLOATINGCONTAINERBUTTON" || sButtonNameInUpperCase === "COPILOTBTN";
                    } else {
                        return sSizeType !== "Phone";
                    }
                }
            } else if (sButtonNameInUpperCase === "ENDITEMSOVERFLOWBTN") {
                return false;
            } else {
                return true;
            }
        },

        /**
         * in case the endItemsOverflowButtons was pressed we need to show
         * all overflow items in the action sheet
         * @param oEvent
         */
        pressEndItemsOverflow: function (oEvent) {
            var oPopover = sap.ui.getCore().byId('headEndItemsOverflow');

            function closePopover () {
                if (oPopover.isOpen()) {
                    oPopover.close();
                }
            }

            if (!oPopover) {
                var oFilter = new sap.ui.model.Filter('', 'EQ', 'a');
                oFilter.fnTest = this.isHeadEndItemInOverflow.bind(this);

                oPopover = new sap.m.Popover("headEndItemsOverflow", {
                    placement: sap.m.PlacementType.Bottom,
                    showHeader: false,
                    showArrow: false,
                    content: {
                        path: "/currentState/headEndItems",
                        filters: [oFilter],
                        factory: function (sId, oContext) {
                            var oCtrl = sap.ui.getCore().byId(oContext.getObject());
                            //we don't want to add the evnet listener more then once
                            oCtrl.detachPress(closePopover);
                            oCtrl.attachPress(closePopover);
                            return oCtrl;
                        }
                    }
                });
                oPopover.addStyleClass("sapUshellPopupContainer sapMPopoverheadEndItemsOverflow");
                oPopover.updateAggregation = this.getView().updateShellAggregation;
                oPopover.setModel(oModel);
                this.getView().aDanglingControls.push(oPopover);
            }
            if (oPopover.isOpen()) {
                oPopover.close();
            } else {
                oPopover.updateAggregation("content");
                oPopover.openBy(oEvent.getSource());
            }
        },

        externalSearchTriggered: function (sChannelId, sEventId, oData) {
            oModel.setProperty("/searchTerm", oData.searchTerm);
            oData.query = oData.searchTerm;
        },

        onAfterNavigate: function (oEvent) {
            var sToId = oEvent.mParameters? oEvent.mParameters.toId: undefined;
            this.closeLoadingScreen();

            utils.addTime("ShellController.onAfterNavigate");
            if (sToId === "application" + "-" + oConfig.rootIntent) {
                var btnConfig = sap.ui.getCore().byId("configBtn");
                if (btnConfig) {
                    btnConfig.focus();
                }
            }
            AppLifeCycle.onAfterNavigate(oEvent.getParameter("fromId"), oEvent.getParameter("from"), sToId);
        },

        logApplicationUsage: function (oEvent, oName, oApplication) {
            if (oConfig && oConfig.enableRecentActivity) {
                var sId = oApplication.appId,
                    sIntent = sId,
                    oRecentEntry = {};

                oRecentEntry.title =  oApplication.usageTitle;
                oRecentEntry.appType = appType.APP; // default app type the shell adds is 'Application'
                oRecentEntry.url = '#' + this.lastApplicationFullHash;

                if (sId.indexOf('-') > 0) {
                    sIntent = sId.substr(sId.indexOf('-') + 1);
                }

                oRecentEntry.appId = '#' + sIntent;

                // this is a special case for search - in case th intent opened was 'Action-search'
                // we know this is the search app and would set the appType accordingly
                if (sIntent === "Action-search") {
                    oRecentEntry.appType = appType.SEARCH;
                }

                this._logRecentActivity(oRecentEntry);
            }
        },

        openLoadingScreen: function () {
            //Performance Debug
            jQuery.sap.measure.start("FLP:ShellController.openLoadingScreen", "openLoadingScreen","FLP");

            if (this.oFiori2LoadingDialog){

                var sAnimationMode = oModel.getProperty('/animationMode');
                // in case not supplied by configuration (might happen) default is 'full' e.g. all animations as normal
                var sAnimationMode = sAnimationMode || 'full';

                this.oFiori2LoadingDialog.openLoadingScreen(sAnimationMode);
            }
            jQuery.sap.measure.end("FLP:ShellController.openLoadingScreen");
        },

        closeLoadingScreen: function () {
            if (this.oFiori2LoadingDialog) {
                this.oFiori2LoadingDialog.closeLoadingScreen();
            }
        },

        readNavigationEnd: function () {
            var oAccessibilityHelperLoadingComplete = document.getElementById("sapUshellLoadingAccessibilityHelper-loadingComplete");

            if (oAccessibilityHelperLoadingComplete) {
                oAccessibilityHelperLoadingComplete.setAttribute("aria-live","polite");
                oAccessibilityHelperLoadingComplete.innerHTML =  resources.i18n.getText("loadingComplete");
                setTimeout(function (){
                    oAccessibilityHelperLoadingComplete.setAttribute("aria-live","off");
                    oAccessibilityHelperLoadingComplete.innerHTML = "";
                },0);
            }
        },

        delayedCloseLoadingScreen: function () {
            setTimeout(function () {
                this.closeLoadingScreen();
            }.bind(this), 600);
        },

        togglePane: function (oEvent) {
            var oSource = oEvent.getSource(),
                bState = oSource.getSelected();

            sap.ui.getCore().getEventBus().publish("launchpad", "togglePane", {currentContent: oSource.getModel().getProperty("/currentState/paneContent")});

            if (oEvent.getParameter("id") === "categoriesBtn") {
                oSource.getModel().setProperty("/currentState/showCurtainPane", !bState);
            } else {
                oSource.getModel().setProperty("/currentState/showPane", !bState);
            }
        },

        /*
         * Switch the view port state.
         * To be used in a scenario where clicking on some control invokes the view-port switch state.
         * Currently in the toggle-Me-Area and toggle-Notifications-view scenario.
         *
         * This method disabled the control during the view-port state switch animtaion, and only when animation
         * is finished enabled it back
         */
        _switchViewPortStateByControl: function (oOpenByControl, sState) {

            var bControlValid = false, oViewPortContainer = this.oViewPortContainer;

            if (oOpenByControl && oOpenByControl.setEnabled && typeof oOpenByControl.setEnabled === "function") {
                bControlValid = true;
            }

            // in case we can - set the control as disabled
            if (bControlValid) {
                oOpenByControl.addStyleClass("sapUshellShellHeadItemOverrideDisableStyle");
                oOpenByControl.setEnabled(false);
            }

            // CB function which enabled back the control
            function fAfterAnimationFinishedCB () {
                oOpenByControl.setEnabled(true);
                oOpenByControl.removeStyleClass("sapUshellShellHeadItemOverrideDisableStyle");
                // detach the callback
                oViewPortContainer.detachAfterSwitchStateAnimationFinished(fAfterAnimationFinishedCB);
            }

            // attach the CB for after animations finished
            if (bControlValid) {
                oViewPortContainer.attachAfterSwitchStateAnimationFinished(fAfterAnimationFinishedCB);
            }
            // call to switch state
            oViewPortContainer.switchState(sState);
        },

        onScreenSizeChange: function (oParams) {
            this.validateShowLogo(oParams);
            this.handleNavMenuTitleVisibility(oParams);
            this._handleHomeAndBackButtonsVisibility(oParams);
            this.handleEndItemsOverflow(oParams);
        },

        /**
         * Home button should be invisible (in the shell header) in case of navigating to the MeArea on smart phone,
         * or in MeArea on other media, when opening the MeArea from the dashboard
         */
        _handleHomeAndBackButtonsVisibility: function (oParams) {
            var oModel = ShellModel.getModel(),
                isLsizeWidthDocking = jQuery("#mainShell").width() <1024 && jQuery(".sapUshellContainerDocked").length>0,
                bIsInCenterViewPort = oModel.getProperty('/currentViewPortState') === 'Center',
                deviceType = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name,
                oHomeBtn = sap.ui.getCore().byId("homeBtn"),
                oBackBtn = sap.ui.getCore().byId("backBtn"),
                bHomeBtnVisible = deviceType === "Desktop",
                bBackBtnVisible = deviceType !== "Phone" || bIsInCenterViewPort;

            if (isLsizeWidthDocking) {
                if (oHomeBtn) {
                    bHomeBtnVisible = false;
                }
            }

            if (oHomeBtn) {
                oHomeBtn.setVisible(bHomeBtnVisible);
            }
            if (oBackBtn) {
                oBackBtn.setVisible(bBackBtnVisible);
            }
        },

        validateShowLogo: function (oParams) {
            var deviceType;
            var sCurrentState = this.getModel().getProperty('/currentState/stateName');
            var bIsHeaderLessState = sCurrentState === 'merged' || sCurrentState === 'headerless';
            if (oParams) {
                deviceType = oParams.name;
            } else {
                deviceType = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name;
            }
            var bShellLogoVisible = true;
            if (deviceType === "Phone" && !this.bMeAreaSelected || bIsHeaderLessState) {
                bShellLogoVisible = false;
            }
            ///Last arg - bDoNotPropagate is truethy otherwise changes will redundantly apply also to other states (e.g. - headerless should always be presented without logo)
            oShellModel.updateStateProperty("showLogo", bShellLogoVisible, false, ["home", "app", "blank", "blank-home", "minimal", "lean"], true);
        },

        handleNavMenuTitleVisibility: function (oParams) {
            this.bNavMenuTitleVisible = false;

            if (oParams.name !== "Desktop") {
                this.bNavMenuTitleVisible = true;
            }
            oShellModel.updateStateProperty("application/showNavMenuTitle", this.bNavMenuTitleVisible, true);
        },

        /*
         * method used for navigation from items of the Shell-Application-Navigation-Menu.
         * this method makes sure the view-port is centered before triggering navigation
         * (as the notifications or me-area might be open, and in addition
         * fire an event to closes the popover which opens the navigation menu
         */
        navigateFromShellApplicationNavigationMenu: function (sIntent) {

            //if the target was not change, do nothing
            if (window.hasher.getHash() !== sIntent.substr(1)) {
                // we must make sure the view-port is centered before triggering navigation from shell-app-nav-menu
                this.oViewPortContainer.switchState("Center");

                // trigger the navigation
                window.hasher.setHash(sIntent);
            }

            // close the popover which holds the navigation menu
            var oShellAppTitle = sap.ui.getCore().byId("shellAppTitle");
            if (oShellAppTitle) {
                oShellAppTitle.close();
            }

        },

        //loadUserImage

        _loadCoreExtNonUI5: function (sSender, sEventName, oAppTarget) {
            if (oAppTarget && (oAppTarget.applicationType == "NWBC" || oAppTarget.applicationType == "TR")) {
                setTimeout(this._loadCoreExt.bind(this), 2000);
            }
        },
        _postCoreExtActivities: function () {
            sap.ushell.Container.getService("UsageAnalytics").init(resources.i18n.getText("usageAnalytics"),
                resources.i18n.getText("i_agree"),
                resources.i18n.getText("i_disagree"),
                resources.i18n.getText("remind_me_later"));

            this.getView().createPostCoreExtControls();
        },

        /**
         * RendererExtensions plugins are loaded after core-ext is loaded.
         * core-ext is loaded, either in first application load flow in case app is not FLP
         * or explicitly by the Renderer (in this file) after FLP is loaded.
         * In any case after we load the plugins, we also publish the event that all
         * Core resourses are loaded
         */
        _loadRendererExtensionPlugins: function () {
            var oViewData = this.getView() ? this.getView().getViewData() : {},
                oConfig = oViewData.config || {},
                bDelayPlugin = jQuery.sap.getUriParameters().get("sap-ushell-xx-pluginmode") === "delayed",
                that = this;
            if (!this._pluginLoadingTriggered) {
                this._pluginLoadingTriggered = true;

                // no initial shell setup configured, create invoke the default one.
                if (!sap.ushell.Container.getService( "PluginManager" ).getRegisteredPlugins().RendererExtensions.init) {
                    sap.ushell.Container.getService( "PluginManager" ).registerPlugins({
                        init: {
                            component: "sap.ushell.components.shell.defaults",
                            url: jQuery.sap.getResourcePath("sap/ushell/components/shell/defaults")
                        }
                    });
                }

                jQuery.sap.log.info("Triggering load of 'RendererExtension' plug-ins after loading core-ext module (after home page content rendered)",
                    null, "sap.ushell.renderers.fiori2.Shell");

                if (!oConfig.inHeaderLessOpt) {
                    if (bDelayPlugin) {
                        // delay loading by 5 sec.
                        setTimeout(function () {
                            sap.ushell.Container.getService("PluginManager").loadPlugins("RendererExtensions")
                                .always(function () {
                                    that._publishCoreExtLoadedEvent();
                                });
                        }, 5000);
                    } else {
                        sap.ushell.Container.getService("PluginManager").loadPlugins("RendererExtensions")
                            .always(function () {
                                that._publishCoreExtLoadedEvent();
                            });
                    }
                } else {
                    this._publishCoreExtLoadedEvent();
                }
            }
        },

        _loadCoreExt: function () {
            jQuery.sap.measure.end("FLP:Container.InitLoading");

            EventHub.once("CoreResourcesComplementLoaded")
                .do(this._loadRendererExtensionPlugins.bind(this));

            EventHub.emit("loadCoreResourcesComplement");
        },

        _publishCoreExtLoadedEvent: function () {
            setTimeout(function () {
                sap.ui.getCore().getEventBus().publish("launchpad", "coreExtLoaded");
            }, 0);

            setTimeout(function () {
                sap.ui.getCore().getEventBus().publish("shell", "FLP-FMP");
            },5000);
        },

        getCurrentViewportState: function () {
            var sViewPortState = oModel.getProperty('/currentViewPortState');
            return sViewPortState;
        },

        makeEndUserFeedbackAnonymousByDefault: function (bEndUserFeedbackAnonymousByDefault) {
            this.oEndUserFeedbackConfiguration.anonymousByDefault = bEndUserFeedbackAnonymousByDefault;
        },

        showEndUserFeedbackLegalAgreement: function (bShowEndUserFeedbackLegalAgreement) {
            this.oEndUserFeedbackConfiguration.showLegalAgreement = bShowEndUserFeedbackLegalAgreement;
        },

        _activateFloatingUIActions: function (iWindowWidth) {
            if (iWindowWidth < 417) {
                this.oFloatingUIActions.disable();
            } else {
                this.oFloatingUIActions.enable();
            }
        },

        setFloatingContainerDragSelector: function (sElementToCaptureSelector) {

            jQuery(sElementToCaptureSelector).addClass("sapUshellShellFloatingContainerSelector");

            //Fix for internal incident #1770519876 2017 - Avoiding crash of CoPilot after deleting an instance and using a property (in UIAction) of the deleted one
            sap.ui.require(["sap/ushell/UIActions"], function (UIActions) {
                if (!this.oFloatingUIActions) {
                    this.oFloatingUIActions = new sap.ushell.UIActions({
                        containerSelector: ".sapUiBody",
                        wrapperSelector: '.sapUshellShellFloatingContainerWrapper',
                        draggableSelector: '.sapUshellShellFloatingContainerWrapper',//the element that we drag
                        rootSelector: ".sapUiBody",
                        cloneClass: "sapUshellFloatingContainer-clone",
                        dragCallback: this._handleFloatingContainerUIStart.bind(this), //for hide the original item while dragging
                        endCallback: this._handleFloatingContainerDrop.bind(this),
                        moveTolerance: 3,
                        onDragStartUIHandler:this._onDragStartUI.bind(this),
                        onDragEndUIHandler: this._setFloatingContainerHeight.bind(this),
                        dragAndScrollCallback: this._doDock.bind(this),
                        switchModeDelay: 1000,
                        isLayoutEngine: false,
                        isTouch: false,//that.isTouch,
                        elementToCapture: sElementToCaptureSelector,
                        defaultMouseMoveHandler: function () {},
                        debug: jQuery.sap.debug()
                    });
                } else {
                    this.oFloatingUIActions.elementsToCapture = jQuery(sElementToCaptureSelector);
                }

                this._activateFloatingUIActions(jQuery(window).width());
                var timer;
                jQuery(window).bind("resize", function () {
                    clearTimeout(timer);
                    timer = setTimeout(this._activateFloatingUIActions(jQuery(window).width()), 300);
                }.bind(this));
            }.bind(this));
        },


        /**
         * This function called once start to drag the co-pilot element
         * It checks whether it reach 64px(4rem) to the right/left in order to open the docking area
         * Also it checks whether to close the docking area
         * @param oCfg
         * @private
         */
        _doDock: function (oCfg) {
            jQuery.sap.measure.start("FLP:Shell.controller._doDock", "dragging co-pilot element","FLP");
            // open dock option only if config is enable and screen size is L(desktop + tablet landsacpe)
            var sDwvice = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD);
            if (sDwvice.name =="Desktop") {
                var iWinWidth = jQuery(window).width();
                if (oCfg) {
                    oCfg.docked = {};
                    var oDockedProp = oCfg.docked;
                    //cfg.moveX get FloatingContainer courser x position.
                    // handle for opening the docking area for right and left
                    // in case that docking area open - close it
                    // in case canvas moved (because the docking ) close it
                    if (oCfg.moveX >= iWinWidth - 64) {
                        oDockedProp.dockPos = "right";
                        oDockedProp.setIsDockingAreaOpen = true;
                        this._openDockingArea(oCfg);
                    } else if (oCfg.moveX < 64) {
                        oDockedProp.dockPos = "left";
                        oDockedProp.setIsDockingAreaOpen = true;
                        this._openDockingArea(oCfg);
                    } else {
                        if (this._isDockingAreaOpen()) {
                            this._closeDockingArea(oCfg);
                        }
                        if (jQuery("#canvas").hasClass('sapUshellContainerDocked')) {
                            this._handleCloseCanvas(oCfg);
                        }
                    }
                }
            }
            jQuery.sap.measure.end("FLP:Shell.controller._doDock");
        },

        /**
         * This method handle the finish (after drop) for the docking
         * @param oDelta
         * @private
         */
        _finishDoDock:function (oDockedProp) {
            this._openDockingArea(false);
            // save the last state of the copilot
            var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local, "com.sap.ushell.adapters.local.CopilotLastState");
            oStorage.put("lastState" , "docked:"+oDockedProp.dockPos);
            this._handleOpenCanvas(oDockedProp);
            var oWrapperElement = jQuery('#sapUshellFloatingContainerWrapper');
            oWrapperElement.css("height","100%");
            jQuery("#shell-floatingContainer").addClass("sapUshellShellFloatingContainerFullHeight");
            //New event for co-pilot is docked.
            sap.ui.getCore().getEventBus().publish("launchpad", "shellFloatingContainerIsDocked", oDockedProp.dockPos);
            //handle ApplicationContainerLimitedWidth with docking
            if (jQuery(".sapUShellApplicationContainerLimitedWidth").length > 0) {
                jQuery('#application-Action-toappnavsample').removeClass("sapUShellApplicationContainerLimitedWidth");
                jQuery('#application-Action-toappnavsample').addClass("sapUShellDockingContainer");
            }

        },


        _onResizeWithDocking: function () {
            //Docking is similar to screen change
            this.onScreenSizeChange(Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD));
            //handle appFinder size changed
            //timeOut waiting for resize event is finish
            setTimeout(function () {
                sap.ui.getCore().getEventBus().publish("launchpad", "appFinderWithDocking");
            }, 300);
        },

        /**
         * This function happens when start to drag
         * In this case if we docked we need to remove animations and close canvas
         * @param oCfg
         * @private
         */
        _onDragStartUI:function (oCfg) {
            jQuery.sap.measure.start("FLP:Shell.controller._onDragStartUI", "start drag","FLP");
            if (this._isDock()) {
                // save the last state of the copilot
                var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local, "com.sap.ushell.adapters.local.CopilotLastState");
                oStorage.put("lastState", "floating");
                jQuery("#sapUshellFloatingContainerWrapper").removeClass('sapUshellContainerDocked');
                jQuery(".sapUshellShellFloatingContainerFullHeight").removeClass("sapUshellShellFloatingContainerFullHeight");
                //New event for co-pilot is unDock
                sap.ui.getCore().getEventBus().publish("launchpad", "shellFloatingContainerIsUnDocked" );
                jQuery("#sapUshellFloatingContainerWrapper").removeClass("sapUshellContainerDockedMinimizeCoPilot sapUshellContainerDockedExtendCoPilot");
                jQuery("#sapUshellFloatingContainerWrapper").addClass('sapUshellContainerDockedMinimizeCoPilot');
                jQuery(jQuery(".sapUshellContainerDockedMinimizeCoPilot")).on('webkitAnimationEnd oanimationend msAnimationEnd animationend',this._handleAnimations(false));
                this._handleCloseCanvas(oCfg);
            }
            jQuery.sap.measure.end("FLP:Shell.controller._onDragStartUI");
        },

        /**
         * This function handle the adding animations whnen dock/undock
         * @param bIsDock
         * @private
         */
        _handleAnimations : function (bIsDock,sDockingPosition){
            var oCanvasElement = jQuery('#canvas');
            var oWrapperElement = jQuery('#sapUshellFloatingContainerWrapper');
            if (bIsDock) {
                oCanvasElement.addClass("sapUshellContainerDockedLaunchpadTranisation");
                if (oCanvasElement.hasClass('sapUshellContainer-Narrow-Right') || sDockingPosition == "right") {
                    jQuery(".sapUshellContainerDockedLaunchpadTranisation").toggleClass("closeRight",true);
                } else {
                    jQuery(".sapUshellContainerDockedLaunchpadTranisation").toggleClass("closeLeft",true);
                }

                oWrapperElement.addClass(" sapUshellContainerDockedExtendCoPilot");
                setTimeout(
                    function (){
                        if (oCanvasElement.hasClass('sapUshellContainer-Narrow-Right') || sDockingPosition == "right") {
                            jQuery(".sapUshellContainerDockedLaunchpadTranisation").toggleClass("closeRight",false);
                            jQuery(".sapUshellContainerDockedLaunchpadTranisation").toggleClass("openRight",true);

                        } else if (oCanvasElement.hasClass('sapUshellContainer-Narrow-Left') || sDockingPosition == "left") {
                            jQuery(".sapUshellContainerDockedLaunchpadTranisation").toggleClass("closeLeft",false);
                            jQuery(".sapUshellContainerDockedLaunchpadTranisation").toggleClass("openLeft",true);
                        }
                    },300);
                this._onResizeWithDocking();
            } else {
                jQuery("#sapUshellFloatingContainerWrapper").addClass("sapUshellContainerDockedExtendCoPilot");
                if (oCanvasElement.hasClass('sapUshellContainer-Narrow-Right') || sDockingPosition == "right") {
                    jQuery(".sapUshellContainerDockedLaunchpadTranisation").toggleClass("openRight",false);
                } else {
                    jQuery(".sapUshellContainerDockedLaunchpadTranisation").toggleClass("openLeft",false);
                }
                setTimeout(
                    function (){
                        oCanvasElement.removeClass("sapUshellContainerDockedLaunchpadTranisation  closeLeft  openLeft closeRight openRight");
                    },550);

            }
            var oShellHeader = sap.ui.getCore().byId('shell-header');
            oShellHeader._handleResizeChange();
        },

        /**
         * This function opens docking area for copilot
         * @param oCfg
         * @private
         */
        _openDockingArea:function (oCfg) {
            var oDockProperties = oCfg?oCfg.docked:false;
            var bIsDock = oDockProperties?oDockProperties.setIsDockingAreaOpen:false;
            // check if need to open docking area and it doesn't exist already
            if (bIsDock && jQuery("#DockinaAreaDiv").length  == 0) {
                var bIsRTL = sap.ui.getCore().getConfiguration().getRTL();
                if ((oDockProperties.dockPos ==="right" && oCfg.clone && !bIsRTL) || (oDockProperties.dockPos === "left" && oCfg.clone && bIsRTL)) {
                    jQuery('<div id="DockinaAreaDiv"  class="sapUshellShellDisplayDockingAreaRight">').appendTo(oCfg.clone.parentElement);
                } else if ((oDockProperties.dockPos === "left" && oCfg.clone && !bIsRTL) || (oDockProperties.dockPos ==="right" && oCfg.clone && bIsRTL)) {
                    jQuery('<div id="DockinaAreaDiv"  class="sapUshellShellDisplayDockingAreaLeft">').appendTo(oCfg.clone.parentElement);
                }
                oCfg.clone.oDockedProp = {};
                oCfg.clone.oDockedProp.dockPos = oDockProperties.dockPos;
                // After drop the copilot - docking area should disappear
            } else if (!bIsDock) {
                this._closeDockingArea();
            }
        },

        /**
         * This function close docking area for copilot
         * @param oCfg
         * @private
         */
        _closeDockingArea:function (oCfg) {
            setTimeout(
                function (){
                    jQuery('.sapUshellShellDisplayDockingAreaRight').remove();
                    jQuery('.sapUshellShellDisplayDockingAreaLeft').remove();
                },150);
            var oShellHeader = sap.ui.getCore().byId('shell-header');
            if (oShellHeader) {
                oShellHeader._handleResizeChange();
            }
        },

        /**
         * This function return whether copilto is dock or not
         * @returns {boolean}
         * @private
         */
        _isDock : function (){
            return (jQuery('.sapUshellContainerDocked').size() != 0 );
        },

        /**
         * * This function return whethere the docking area open or not
         * @returns {boolean}
         * @private
         */
        _isDockingAreaOpen : function (){
            return (jQuery('.sapUshellShellDisplayDockingAreaRight').size() != 0 || jQuery('.sapUshellShellDisplayDockingAreaLeft').size() != 0);
        },

        /**
         * This function open the canvas so there will be place for the docking area
         * @param oDelta
         * @private
         */
        _handleOpenCanvas:function (oDockedProp) {
            var oCanvasElement = jQuery('#canvas');
            var oHeaderElement = jQuery('.sapUshellShellHead');
            var bIsRTL = sap.ui.getCore().getConfiguration().getRTL();
            if ((oDockedProp.dockPos==="right" && !bIsRTL)|| (oDockedProp.dockPos==="left" && bIsRTL)) {
                oCanvasElement.addClass('sapUshellContainer-Narrow-Right sapUshellContainerDocked ');
                oHeaderElement.addClass('sapUshellContainerDocked');
            }
            if ((oDockedProp.dockPos==="left" && !bIsRTL)|| (oDockedProp.dockPos==="right" && bIsRTL)) {
                oCanvasElement.addClass('sapUshellContainer-Narrow-Left sapUshellContainerDocked ');
                oHeaderElement.addClass('sapUshellContainerDocked');
            }
            var oViewPortContainer = sap.ui.getCore().byId("viewPortContainer");
            if (oViewPortContainer) {
                oViewPortContainer._handleSizeChange();
            }
        },

        /**
         * This function clsoe the canvas after docking area disappear
         * @param oDelta
         * @private
         */
        _handleCloseCanvas:function (oCfg) {
            var oCanvasElement = jQuery('#canvas');
            var oHeaderElement = jQuery('.sapUshellShellHead');
            if (oCfg) {
                oCfg.docked.setIsDockingAreaOpen  = false;
            }
            if (oCanvasElement.hasClass('sapUshellContainer-Narrow-Right')) {
                oCanvasElement.removeClass('sapUshellContainer-Narrow-Right sapUshellContainerDocked sapUshellMoveCanvasRight');
                oHeaderElement.removeClass('sapUshellContainerDocked');
                this._openDockingArea(oCfg);
                this._setFloatingContainerHeight();
            }
            if (oCanvasElement.hasClass('sapUshellContainer-Narrow-Left')) {
                oCanvasElement.removeClass('sapUshellContainer-Narrow-Left sapUshellContainerDocked sapUshellMoveCanvasLeft');
                oHeaderElement.removeClass('sapUshellContainerDocked');
                this._openDockingArea(oCfg);
                this._setFloatingContainerHeight();
            }
            //handle ApplicationContainerLimitedWidth with docking
            if (jQuery(".sapUShellDockingContainer").length > 0 ) {
                jQuery('#application-Action-toappnavsample').removeClass("sapUShellDockingContainer");
                jQuery('#application-Action-toappnavsample').addClass("sapUShellApplicationContainerLimitedWidth");
            }
            this._onResizeWithDocking();
            var oViewPortContainer = sap.ui.getCore().byId("viewPortContainer");
            if (oViewPortContainer) {
                oViewPortContainer._handleSizeChange();
            }
        },

        /**
         * This function handle the height of the copilot + add animations for ir
         * @param bIsDock
         * @param oCfg
         * @private
         */
        _setFloatingContainerHeight:function (oEvent) {
            // if movement X && Y is 0 its means there is no dragw was made only click
            var iWinWidth = jQuery(window).width();

            var oWrapperElement = jQuery('#sapUshellFloatingContainerWrapper');
            if (this._isDock() ){
                if (oEvent &&(oEvent.clientX >= iWinWidth-64 || oEvent.clientX < 64)) { // if less then 64 its just a click - no need to animate
                    oWrapperElement.addClass(' sapUshellContainerDocked');
                    oWrapperElement.addClass("sapUshellContainerDockedMinimizeCoPilot");
                    jQuery(oWrapperElement).on('webkitAnimationEnd oanimationend msAnimationEnd animationend',this._handleAnimations(true));
                }
            } else if (!this._isDock()) {
                jQuery("#sapUshellFloatingContainerWrapper").removeClass("sapUshellContainerDockedMinimizeCoPilot sapUshellContainerDockedExtendCoPilot");
            }

        },


        _handleFloatingContainerDrop: function (oEvent, floatingContainerWrapper, oDelta) {
            jQuery.sap.measure.start("FLP:Shell.controller._handleFloatingContainerDrop", "drop floating container","FLP");
            var oFloatingContainer = floatingContainerWrapper.firstChild ? sap.ui.getCore().byId(floatingContainerWrapper.firstChild.id) : undefined,
                storage = jQuery.sap.storage(jQuery.sap.storage.Type.local, "com.sap.ushell.adapters.local.FloatingContainer"),
                iWindowWidth = jQuery(window).width(),
                iWindowHeight = jQuery(window).height(),
                iPosLeft = oDelta.deltaX / iWindowWidth,
                iPosTop = oDelta.deltaY / iWindowHeight,
                sOrigContainerVisibility = floatingContainerWrapper.style.visibility,
                sOrigContainerDisplay = floatingContainerWrapper.style.display,
                iContainerLeft = parseFloat(floatingContainerWrapper.style.left.replace("%", "")),
                iContainerTop = parseFloat(floatingContainerWrapper.style.top.replace("%", ""));

            floatingContainerWrapper.style.visibility = 'hidden';
            floatingContainerWrapper.style.display = 'block';

            if (typeof (iContainerLeft) === 'number') {
                iPosLeft = iContainerLeft + 100 * oDelta.deltaX / iWindowWidth;
            }

            if (typeof (iContainerTop) === 'number') {
                iPosTop = iContainerTop + 100 * oDelta.deltaY / iWindowHeight;
            }

            // when docking area  is open - means the copilot should be on top of the screen
            if (this._isDockingAreaOpen()) {
                iPosTop = 0;
            }

            floatingContainerWrapper.setAttribute("style", "left:" + iPosLeft + "%;top:" + iPosTop + "%;position:absolute;");
            floatingContainerWrapper.visibility = sOrigContainerVisibility;
            floatingContainerWrapper.display = sOrigContainerDisplay;
            storage.put("floatingContainerStyle", floatingContainerWrapper.getAttribute("style"));
            //Call resizeHandler to adjust the size and position of the floating container in case it was droped out of the window size boundries.
            if (oFloatingContainer) {
                oFloatingContainer.handleDrop();
                // when docking area is open and the copilot drop inside - should handle it
                if (!!oDelta.clone.oDockedProp && this._isDockingAreaOpen()) {
                    this._finishDoDock(oDelta.clone.oDockedProp);
                }
            }
            jQuery.sap.measure.end("FLP:Shell.controller.handleFloatingContainerDrop");
        },

        /**
         * This function called after co-pilot start to be dragged
         * @param evt
         * @param ui
         * @private
         */
        _handleFloatingContainerUIStart: function (evt, ui) {
            jQuery.sap.measure.start("FLP:Shell.controller._handleFloatingContainerUIStart", "starts dragging floating container","FLP");
            var floatingContainer = ui;
            floatingContainer.style.display = "none";
            if (window.getSelection) {
                var selection = window.getSelection();
                // for IE
                try {
                    selection.removeAllRanges();
                } catch (e) {
                    // continue regardless of error
                }
            }
            jQuery.sap.measure.end("FLP:Shell.controller._handleFloatingContainerUIStart");
        },

        /**
         * This function open local storage and return the docked state:  docked or floating
         * @returns {*}
         */
        getFloatingContainerState : function (){
            var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local, "com.sap.ushell.adapters.local.CopilotLastState");
            var sLastState = "floating";
            if (oStorage != null) {
                sLastState = oStorage.get("lastState");
                if (sLastState == null) {
                    sLastState = "floating";
                }
            }
            return sLastState;
        },

        setFloatingContainerVisibility: function (bVisible) {
            var sLastState = this.getFloatingContainerState();
            if (sLastState) {
                if (sLastState == "floating") {
                    this.getView().getOUnifiedShell().setFloatingContainerVisible(bVisible);
                } else if (sLastState.indexOf("docked") != -1) {
                    if (bVisible == true) {
                        var sDevice = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD);
                        if (sDevice.name =="Desktop") {
                            var oWrapperElement = jQuery('#sapUshellFloatingContainerWrapper');
                            oWrapperElement.addClass("sapUshellContainerDocked");
                            jQuery("#canvas, .sapUshellShellHead").addClass("sapUshellContainerDocked");
                            oWrapperElement.css("height","100%");
                            sap.ui.getCore().byId("shell-floatingContainer").addStyleClass("sapUshellShellFloatingContainerFullHeight");
                            var oViewPortContainer = sap.ui.getCore().byId("viewPortContainer");
                            if (oViewPortContainer) {
                                oViewPortContainer._handleSizeChange();
                            }

                            // case : dock from button
                            if (sap.ui.getCore().getConfiguration().getRTL()) {
                                if (sLastState.indexOf("right") != -1) {
                                    jQuery("#canvas").addClass('sapUshellContainer-Narrow-Left');
                                    this._handleAnimations(true,"left");
                                } else {
                                    jQuery("#canvas").addClass('sapUshellContainer-Narrow-Right');
                                    this._handleAnimations(true,"right");
                                }
                            } else {
                                if (sLastState.indexOf("right") != -1) {
                                    jQuery("#canvas").addClass('sapUshellContainer-Narrow-Right');
                                    this._handleAnimations(true,"right");
                                } else {
                                    jQuery("#canvas").addClass('sapUshellContainer-Narrow-Left');
                                    this._handleAnimations(true,"left");
                                }
                            }
                            setTimeout(function () {
                                this.getView().getOUnifiedShell().setFloatingContainerVisible(bVisible);
                            }.bind(this),400);
                        } else {
                            jQuery.sap.storage(jQuery.sap.storage.Type.local, "com.sap.ushell.adapters.local.CopilotLastState").put("lastState", "floating");
                            this.getView().getOUnifiedShell().setFloatingContainerVisible(bVisible);
                        }

                        //handle ApplicationContainerLimitedWidth with docking
                        if (jQuery(".sapUShellApplicationContainerLimitedWidth").length > 0 ) {
                            jQuery('#application-Action-toappnavsample').removeClass("sapUShellApplicationContainerLimitedWidth");
                            jQuery('#application-Action-toappnavsample').addClass("sapUShellDockingContainer");
                        }

                    } else {
                        // case : undock from button
                        if (sap.ui.getCore().getConfiguration().getRTL()) {
                            if (sLastState.indexOf("right") != -1) {
                                this._handleAnimations(false,"left");
                            } else {
                                this._handleAnimations(false,"right");
                            }
                        } else {
                            if (sLastState.indexOf("right") != -1) {
                                this._handleAnimations(false,"right");
                            } else {
                                this._handleAnimations(false,"left");
                            }
                        }
                        var oViewPortContainer = sap.ui.getCore().byId("viewPortContainer");
                        if (oViewPortContainer) {
                            oViewPortContainer._handleSizeChange();
                        }
                        setTimeout(function () {
                            this.getView().getOUnifiedShell().setFloatingContainerVisible(bVisible);
                        }.bind(this),400);
                        //handle ApplicationContainerLimitedWidth with docking
                        if (jQuery(".sapUShellDockingContainer").length > 0 ) {
                            jQuery('#application-Action-toappnavsample').removeClass("sapUShellDockingContainer");
                            jQuery('#application-Action-toappnavsample').addClass("sapUShellApplicationContainerLimitedWidth");
                        }
                    }
                    jQuery("#sapUshellFloatingContainerWrapper").removeClass("sapUshellContainerDockedMinimizeCoPilot sapUshellContainerDockedExtendCoPilot");
                    this._onResizeWithDocking();
                    var oViewPortContainer = sap.ui.getCore().byId("viewPortContainer");
                    if (oViewPortContainer) {
                        oViewPortContainer._handleSizeChange();
                    }
                }
            }
        },

        getFloatingContainerVisibility: function () {
            return this.getView().getOUnifiedShell().getFloatingContainerVisible();
        },

        setFloatingContainerContent: function (sPropertyString, aIds, bCurrentState, aStates) {
            oShellModel.setFloatingContainerContent(sPropertyString, aIds, bCurrentState, aStates);
        },

        getRightFloatingContainerVisibility: function () {
            var oRightFloatingContainer = this.getView().getOUnifiedShell().getRightFloatingContainer(),
                bRightFloatingContainerVisible = oRightFloatingContainer && oRightFloatingContainer.getVisible();

            return bRightFloatingContainerVisible;
        },

        setHeaderTitle: function (sTitle, oInnerControl) {
            if (typeof sTitle !== "string") {
                throw new Error("sTitle type is invalid");
            }

            this.getView().getOUnifiedShell().getHeader().setTitleControl(sTitle, oInnerControl);
        },

        addEndUserFeedbackCustomUI: function (oCustomUIContent, bShowCustomUIContent) {
            if (oCustomUIContent) {
                this.oEndUserFeedbackConfiguration.customUIContent = oCustomUIContent;
            }
            if (bShowCustomUIContent === false) {
                this.oEndUserFeedbackConfiguration.showCustomUIContent = bShowCustomUIContent;
            }
        },

        setFooter: function (oFooter) {
            var oShellLayout = this.getView().getOUnifiedShell();
            if (typeof oFooter !== "object" || !oFooter.getId) {
                throw new Error("oFooter value is invalid");
            }
            if (oShellLayout.getFooter() !== null) { //there can be only 1 footer
                jQuery.sap.log.warning("You can only set one footer. Replacing existing footer: " + oShellLayout.getFooter().getId() + ", with the new footer: " + oFooter.getId() + ".");
            }
            oShellLayout.setFooter(oFooter);
        },

        removeFooter: function () {
            this.getView().getOUnifiedShell().setFooter(null);
        },

        addUserPreferencesEntry: function (entryObject) {
            this._validateUserPrefEntryConfiguration(entryObject);
            this._updateUserPrefModel(entryObject);
        },

        addUserProfilingEntry: function (entryObject) {
            this._validateUserPrefEntryConfiguration(entryObject);
            this._updateProfilingModel(entryObject);
        },

        _validateUserPrefEntryConfiguration: function (entryObject) {
            if ((!entryObject) || (typeof entryObject !== "object")) {
                throw new Error("object oConfig was not provided");
            }
            if (!entryObject.title) {
                throw new Error("title was not provided");
            }

            if (!entryObject.value) {
                throw new Error("value was not provided");
            }

            if (typeof entryObject.entryHelpID !== "undefined") {
                if (typeof entryObject.entryHelpID !== "string") {
                    throw new Error("entryHelpID type is invalid");
                } else if (entryObject.entryHelpID === "") {
                    throw new Error("entryHelpID type is invalid");
                }
                var oShellHeader = sap.ui.getCore().byId('shell-header');
                oShellHeader._handleResizeChange();
            }

            if (entryObject.title && typeof entryObject.title !== "string") {
                throw new Error("title type is invalid");
            }

            if (typeof entryObject.value !== "function" && typeof entryObject.value !== "string" && typeof entryObject.value !== "number") {
                throw new Error("value type is invalid");
            }

            if (entryObject.onSave && typeof entryObject.onSave !== "function") {
                throw new Error("onSave type is invalid");
            }

            if (entryObject.content && typeof entryObject.content !== "function") {
                throw new Error("content type is invalid");
            }

            if (entryObject.onCancel && typeof entryObject.onCancel !== "function") {
                throw new Error("onCancel type is invalid");
            }
        },

        _createSessionHandler: function (oConfig) {
            var that = this;

            sap.ui.require(["sap/ushell/SessionHandler"], function (SessionHandler) {
                that.oSessionHandler = new SessionHandler();
                that.oSessionHandler.init({
                    oModel: that.getModel(),
                    keepSessionAlivePopupText: oConfig.keepSessionAlivePopupText,
                    pageReloadPopupText: oConfig.pageReloadPopupText,
                    preloadLibrariesForRootIntent: oConfig.preloadLibrariesForRootIntent,
                    sessionTimeoutReminderInMinutes : oConfig.sessionTimeoutReminderInMinutes ,
                    sessionTimeoutIntervalInMinutes: oConfig.sessionTimeoutIntervalInMinutes,
                    enableAutomaticSignout : oConfig.enableAutomaticSignout
                });
            });
        },

        _getSessionHandler: function () {
            return this.oSessionHandler;
        },

        _navBack: function () {
            // set meAria as closed when navigating back
            this.bMeAreaSelected = false;
            fnBackNavigationHander();
        },

        _historyBackNavigation: function () {
            window.history.back();
        },

        _updateUserPrefModel: function (entryObject) {
            var newEntry = this._getModelEntryFromEntryObject(entryObject),
                userPreferencesEntryArray = oModel.getProperty("/userPreferences/entries");

            userPreferencesEntryArray.push(newEntry);
            // Re-order the entries array to have the Home Page entry right after the Appearance entry (if both exist)
            userPreferencesEntryArray = this._reorderUserPrefEntries(userPreferencesEntryArray);
            oModel.setProperty("/userPreferences/entries", userPreferencesEntryArray);
        },

        _updateProfilingModel: function (entryObject) {
            var newEntry = this._getModelEntryFromEntryObject(entryObject),
                userProfilingArray = oModel.getProperty("/userPreferences/profiling") || [];

            userProfilingArray.push(newEntry);
            oModel.setProperty("/userPreferences/profiling", userProfilingArray);
        },

        _getModelEntryFromEntryObject: function (entryObject) {
            return {
                "entryHelpID": entryObject.entryHelpID,
                "title": entryObject.title,
                "editable": entryObject.content ? true : false,
                "valueArgument": entryObject.value,
                "valueResult": null,
                "onSave": entryObject.onSave,
                "onCancel": entryObject.onCancel,
                "contentFunc": entryObject.content,
                "contentResult": null,
                "icon": entryObject.icon
            };
        },

        _reorderUserPrefEntries: function (aEntries) {
            var flpSettingsEntryIndex,
                themesEntryIndex;
            // Go through all entries to find the Home Page and the Appearance entries
            for (var i = 0; i < aEntries.length; i++) {
                if (aEntries[i].entryHelpID === "flpSettingsEntry") {
                    flpSettingsEntryIndex = i;
                } else if (aEntries[i].entryHelpID === "themes") {
                    themesEntryIndex = i;
                }
                // Only if both were found perform the change
                if (flpSettingsEntryIndex != undefined && themesEntryIndex != undefined) {
                    // Remove the flp setting (Home Page) entry from the array
                    // The flp settings entry is always located after the themes entry in the array
                    // so even after removing it, the themes entry index is still correct
                    var flpSettingsEntry = aEntries.splice(flpSettingsEntryIndex, 1);
                    // Add it back right after the themes (Appearance) entry
                    aEntries.splice(themesEntryIndex + 1, 0, flpSettingsEntry[0]);
                    break;
                }
            }
            return aEntries;
        },

        onAfterViewPortSwitchState: function (oEvent) {
            var toState = oEvent.getParameter("to");
            var oShellAppTitle = sap.ui.getCore().byId("shellAppTitle");
            oModel.setProperty("/currentViewPortState", toState);
            if (this.applicationKeyHandler) {
                AccessKeysHandler.registerAppKeysHandler(this.applicationKeyHandler);
                this.applicationKeyHandler = undefined;
            }
            //Propagate the event 'afterSwitchState' for launchpad consumers.
            sap.ui.getCore().getEventBus().publish("launchpad", "afterSwitchState", oEvent);
            if (toState === "Center") {
                oShellAppTitle.setVisible(true);

                // as this parameter is ONLY set on toggleMeArea method
                // there are many cases in which the me-area closes automatically
                // thus making this property inconsistent.
                // as going to Center (Or Right) we must reset this value for further consistency
                // (otherwise going Left - is only by the toggleMeArea method, so for 'Left' we keep normal behavior)
                this.bMeAreaSelected = false;
            } else {
                oShellAppTitle.setVisible(false);

                if (toState === "Right") {
                    // as this parameter is ONLY set on toggleMeArea method
                    // there are many cases in which the me-area closes automatically
                    // thus making this property inconsistent.
                    // as going to Center (Or Right) we must reset this value for further consistency
                    // (otherwise going Left - is only by the toggleMeArea method, so for 'Left' we keep normal behavior)
                    this.bMeAreaSelected = false;
                } else if (toState == "RightCenter") {
                    this.applicationKeyHandler = AccessKeysHandler.getAppKeysHandler();
                    AccessKeysHandler.bFocusOnShell = false;
                    if (sap.ui.getCore().byId("notificationsView")){
                        AccessKeysHandler.registerAppKeysHandler(sap.ui.getCore().byId("notificationsView").getController().keydownHandler.bind(sap.ui.getCore().byId("notificationsView")));
                    }
                }
            }
            this.validateShowLogo();
            this._handleHomeAndBackButtonsVisibility();
        },
        getModel: function () {
            return oModel;
        },

        _getConfig: function () {
            return oConfig ? oConfig : {};
        },

        _getPersonalizer: function (oPersId) {
            var oPersonalizationService = sap.ushell.Container.getService("Personalization");
            var oComponent = sap.ui.core.Component.getOwnerComponentFor(this.getView());
            var oScope = {
                keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
                writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
                clientStorageAllowed: true
            };
            return oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);
        },

        // encapsulate access to location so that we can stub it easly in tests
        _getCurrentLocationHash: function () {
            return window.location.hash;
        },

        setMeAreaSelected: function (bSelected){
            this.bMeAreaSelected = bSelected;
        },

        getMeAreaSelected: function (){
            return this.bMeAreaSelected;
        },

        setNotificationsSelected: function (bSelected){
            this.bNotificationsSelected = bSelected;
        },

        getNotificationsSelected: function (){
            return this.bNotificationsSelected;
        }
    });


}, /* bExport= */ false);
