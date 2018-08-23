/*!
 * Copyright (c) 2009-2017 SAP SE, All Rights Reserved
 */
sap.ui.define([
        'sap/ushell/resources',
        'sap/ui/core/UIComponent',
        'sap/ushell/components/applicationIntegration/AppLifeCycle',
        'sap/ushell/components/flp/ComponentKeysHandler',
        'sap/ushell/ui/footerbar/ContactSupportButton',
        'sap/ushell/ui/footerbar/EndUserFeedback',
        'sap/ushell/EventHub',
        'sap/ushell/Config'],
function (resources, UIComponent, AppLifeCycle, ComponentKeysHandler, ContactSupportButton, EndUserFeedback, EventHub, Config) {
    "use strict";

    return UIComponent.extend("sap.ushell.components.shell.MeArea.Component", {

        metadata: {
            version: "1.56.5",
            library: "sap.ushell.components.shell.MeArea",
            dependencies: {
                libs: ["sap.m", "sap.ui.layout"]
            }
        },

        createContent: function () {
            this.oRenderer = sap.ushell.Container.getRenderer("fiori2");
            this.oSearchPrefs = false;

            var that = this,
                oConfig = this.getComponentData().config,
                oMeAreaToggle;

            // Show/Hide MeArea
            function showMeArea (bShow) {
                that._createMeArea();
                that.toggleMeAreaView(oMeAreaToggle, bShow);
                that.oRenderer.addShellDanglingControl(oMeAreaToggle);
            }

            this.bIsMeAreaCreated = false;
            this.oDefConfig = {
                view: {
                    position: "left"
                }
            };
            this.oDefConfig = jQuery.extend(this.oDefConfig, oConfig);

            oMeAreaToggle = sap.ui.getCore().byId("meAreaHeaderButton");
            oMeAreaToggle.applySettings({
                tooltip: sap.ushell.Container.getUser().getFullName(),
                //Header Icon - icon on meArea toggle button
                icon: '{/userImage/personPlaceHolder}',
                selected: {
                    path: "/currentViewPortState",
                    formatter: function (viewPortState) {
                        if (viewPortState === 'LeftCenter') {
                            return true;
                        }
                        return false;
                    }
                },
                press: function () {
                    showMeArea(!this.getSelected());
                },
                visible: true,
                enabled: true,
                showSeparator: false,
                ariaLabel: "{i18n>MeAreaToggleButtonAria}"
            }).removeStyleClass("sapUshellPlaceHolders");

            var origMeAreaToggleAfterRender = oMeAreaToggle.onAfterRendering;
            oMeAreaToggle.onAfterRendering = function () {
                if (origMeAreaToggleAfterRender) {
                    origMeAreaToggleAfterRender.apply(this, arguments);
                }
                jQuery(this.getDomRef()).attr("aria-pressed", that.oRenderer.getMeAreaSelected());
            };

            oMeAreaToggle.addEventDelegate({
                onsapskipforward: function (oEvent) {
                    sap.ushell.renderers.fiori2.AccessKeysHandler.bForwardNavigation = true;
                    oEvent.preventDefault();
                    jQuery("#sapUshellHeaderAccessibilityHelper").focus();
                },
                onsaptabprevious: function (oEvent) {
                    var viewPort = sap.ui.getCore().byId('viewPortContainer'),
                        sCurrentState = viewPort.getCurrentState(),
                        oRecentItemsList;

                    switch (sCurrentState) {
                        case "LeftCenter":
                            oRecentItemsList = jQuery("#meAreaIconTabBar-content li:first");
                            if (oRecentItemsList.length > 0) {
                                oRecentItemsList[0].focus();
                            } else {
                                var oConfig = window["sap-ushell-config"],
                                    enableRecentActivity= jQuery.sap.getObject(
                                        "renderers.fiori2.componentData.config.enableRecentActivity",
                                        undefined,
                                        oConfig);
                                if (enableRecentActivity && AppLifeCycle.getElementsModel().getModel().getProperty("/enableTrackingActivity")) {
                                    jQuery("#meAreaIconTabBar .sapMITBText")[0].focus();
                                } else {
                                    oEvent.preventDefault();
                                    jQuery('.sapUshellActionItem:last')[0].focus();
                                }
                            }
                            break;
                        case "RightCenter":
                            // TODO
                            break;
                        case "Center":
                            if (sap.ushell.renderers.fiori2.AccessKeysHandler.getAppKeysHandler()) {
                                oEvent.preventDefault();
                                sap.ushell.renderers.fiori2.AccessKeysHandler.bFocusOnShell = false;
                            }
                            break;
                        default:
                            //do nothing
                    }
                },
                onsapskipback: function (oEvent) {

                    // When the focus is on the MeArea icon and MeArea is opened (i.e. case "LeftCenter") -
                    // SHIFT+F6 should move the focus to the Recently Used list

                    var viewPort = sap.ui.getCore().byId('viewPortContainer'),
                        sCurrentState = viewPort.getCurrentState(),
                        oNextElement;

                    switch (sCurrentState) {
                        case "LeftCenter":
                            oEvent.preventDefault();
                            oNextElement = jQuery("#meAreaIconTabBar .sapMITBSelected");
                            if (oNextElement.length === 0) {
                                oNextElement = jQuery(".sapUshellActionItem");
                            }
                            oNextElement[0].focus();
                            break;
                        case "RightCenter":
                            // TODO
                            break;
                        case "Center":
                            oEvent.preventDefault();
                            // if co-pilot exists and we came from tile - need to focus on copilot - otherwise - on mearea
                            if (jQuery("#sapUshellFloatingContainerWrapper:visible").length == 1 &&  (oEvent.originalEvent.srcElement.id) != "") {
                                sap.ui.getCore().getEventBus().publish("launchpad", "shellFloatingContainerIsAccessible");
                            } else if (sap.ushell.renderers.fiori2.AccessKeysHandler.getAppKeysHandler()) {
                                sap.ushell.renderers.fiori2.AccessKeysHandler.bFocusOnShell = false;
                            }
                            break;
                        default :
                            //do nothing
                    }
                }
            });

            //In state blank when no Action Items do not display MeArea.
            AppLifeCycle.getElementsModel().createInspection("actions", [{
                fnCondition: function(aItems, aIds, oThat) {
                    return true;
                }, fnAction: function(aItems, aIds, oThat) {
                    if ((aItems && aItems.length > 0) || (aIds && aIds.length > 0)) {
                        if (aIds.indexOf("meAreaHeaderButton") === -1) {
                            oThat.addHeaderItem(["meAreaHeaderButton"], true);
                        }
                    } else {
                        oThat.removeHeaderItem(["meAreaHeaderButton"], true);
                    }
                }
            }], false, ["blank-home", "blank"]);

            this._createMeArea();

            /* Show/Hide MeArea API. Usage: EventHub.emit('showMeArea', [true|false]);*/
          EventHub.on('showMeArea').do(showMeArea);

            sap.ui.getCore().getEventBus().publish("shell", "meAreaCompLoaded", {delay: 0});
        },

        _createMeArea: function () {
            if (this.bIsMeAreaCreated === true)
                return;
            this.bIsMeAreaCreated = true;


            this._createMeAreaProcess();
        },

        _createMeAreaProcess: function () {
            var that = this;

            //add notification view
            if (this.oDefConfig.view) {
                var oMeAreaView = sap.ui.view("meArea", {
                    viewName: "sap.ushell.components.shell.MeArea.MeArea",
                    type: 'JS',
                    viewData: this.oRenderer.getComponentData()
                });

                // create buttons & adjust model BEFORE the me area is added to the view-port
                // otherwise the first buttons of open-catalog and user-settings render
                // before rest of the actions are instantiated thus causing a glitch in the UI
                this._createActionButtons();
                this._setUserPrefModel();

                sap.ui.getCore().getEventBus().publish("launchpad", "Settings");

                if (this.oDefConfig.view.position === "right") {
                    this.oRenderer.addRightViewPort(oMeAreaView);
                } else {
                    this.oRenderer.addLeftViewPort(oMeAreaView);
                }
                this.oRenderer.ViewPortContainerNavTo('leftViewPort', oMeAreaView.getId());
                // load search data only after the meArea view is opened for the first time
                // so their request will not be fired every time an application will be
                // opened in a new tab (data is necessary for the settings dialog)
                this.oRenderer.ViewPortContainerAttachAfterSwitchStateAnimationFinished(function (oData) {
                    // Me Area opened
                    if (oData.getParameter("to") === "LeftCenter" && !that.oSearchPrefs) {
                        setTimeout(function () {
                            this._getSearchPrefs();
                        }.bind(this), 0);
                    }
                }.bind(this));
            }

            sap.ui.getCore().getEventBus().subscribe("shell", "meAreaButtonPress", function (sender, signal, oMeAreaToggle) {
                that._switchToMeAreaView(oMeAreaToggle);
                that.oRenderer.addShellDanglingControl(oMeAreaToggle);
            });
        },

        /**
         * OnClick handler of the me area header button
         *
         */
        toggleMeAreaView: function (oMeAreaToggle, bShow) {

            if (!oMeAreaToggle || !oMeAreaToggle.getDomRef()) {
                return; // do nothing if the MeArea toggle button is not rendered
            }
            if (oMeAreaToggle.getSelected() === !!bShow) {
                return; // no change
            }

            var oModel = AppLifeCycle.getElementsModel().getModel(),
                sCurrentShellState = oModel.getProperty('/currentState/stateName');

            this.oRenderer.setMeAreaSelected(!!bShow);
            if (sCurrentShellState === 'embedded' || sCurrentShellState === 'embedded-home' || sCurrentShellState === 'standalone' || sCurrentShellState === 'blank-home'  || sCurrentShellState === 'blank') {
                //Present Actions in a Popover.
                // If button is already selected (pressed)
                this._showActionsInPopOver(oMeAreaToggle);
            } else {
                //Present meArea view.
                this._switchToMeAreaView(oMeAreaToggle);
            }
            // disable notification toggle if active
            var oNotificationButton = sap.ui.getCore().byId("NotificationsCountButton");
            if (oNotificationButton && this.oRenderer.getNotificationsSelected()) {
                oNotificationButton.setSelected(false);
                jQuery(oNotificationButton.getDomRef()).attr("aria-pressed", "false");
            }
        },

        /**
         *
         *
         */
        _createActionButtons: function () {
            var that = this,
                oUserPrefButton = sap.ui.getCore().byId("userSettingsBtn"),
                oAboutButton = sap.ui.getCore().byId("aboutBtn") || new sap.ushell.ui.footerbar.AboutButton("aboutBtn");

            if (!oUserPrefButton) {
                var id = "userSettingsBtn",
                    text = resources.i18n.getText("userSettings"),
                    icon = 'sap-icon://action-settings';

                if (!this.oRenderer.getShellConfig().moveUserSettingsActionToShellHeader){
                    //in case the user setting button should move to the shell header, it was already created in shell.model.js
                    //otherwise, create it as an actionItem in the me area
                    oUserPrefButton = new sap.ushell.ui.launchpad.ActionItem("userSettingsBtn", {
                        id: id,
                        text: text,
                        icon: icon
                    });
                }
            }
            this.oRenderer.addShellDanglingControl(oUserPrefButton);

            // xRay enabled
            var oHelpEnabled = sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty("/enableHelp");

            var oSupportTicketDoable = Config.on("/core/extension/SupportTicket");
            oSupportTicketDoable
                .do(function (bConfigured) {
                    if (!bConfigured) {
                        return;
                    }
                    oSupportTicketDoable.off(); // do not execute again

                    var oContactSupport = sap.ui.getCore().byId("ContactSupportBtn");
                    if (!oContactSupport){
                        if (!that.oRenderer.getShellConfig().moveContactSupportActionToShellHeader){
                            //in case the contact support button should move to the shell header, it was already created in shell.model.js
                            //otherwise, create it as an actionItem in the me area
                            oContactSupport = new ContactSupportButton("ContactSupportBtn", {
                                visible: false
                            });

                            // react in case extension is shown/hidden
                            Config
                                .on("/core/extension/SupportTicket")
                                .do(function (bConfigured) {
                                    oContactSupport.setVisible(bConfigured);
                                });
                        }
                    }

                    if (oHelpEnabled) {
                        oContactSupport.addStyleClass('help-id-contactSupportBtn'); // xRay help ID
                    }

                    that.oRenderer.addShellDanglingControl(oContactSupport);
                });

            AppLifeCycle.getElementsModel().getModel().setProperty('/showEndUserFeedback', false);
            var oEndUserFeedbackDoable = Config.on("/core/extension/EndUserFeedback");
            oEndUserFeedbackDoable
                .do(function (bConfigured) {
                    if (!bConfigured) {
                        return;
                    }
                    oEndUserFeedbackDoable.off(); // call the code below only once

                    try {
                        sap.ushell.Container.getService("EndUserFeedback").isEnabled()
                            .done(function () {
                                AppLifeCycle.getElementsModel().getModel().setProperty('/showEndUserFeedback', true);
                            })
                            .fail(function () {
                                AppLifeCycle.getElementsModel().getModel().setProperty('/showEndUserFeedback', false);
                            })
                            .always(function () {
                                var oEndUserFeedback;
                                var bEnabled = sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty('/showEndUserFeedback');
                                if (bEnabled) {
                                    var endUserFeedbackConfiguration = that.oRenderer.getEndUserFeedbackConfiguration();

                                    if (that.oRenderer.getShellConfig().moveGiveFeedbackActionToShellHeader) {
                                        jQuery.sap.measure.start("FLP:Shell.controller._createActionButtons", "create give feedback as shell head end item", "FLP");
                                        //since the EndUserFeedback is not compatible type with shell header end item, creating here the button which will not be shown on the view and trigger its
                                        //press method by a shell header end item button that was created in shell.model.js - this is done below the creation of this button
                                        var tempBtn = sap.ui.getCore().byId("EndUserFeedbackHandlerBtn");

                                        tempBtn.setModel(sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel());
                                        tempBtn.setShowAnonymous(endUserFeedbackConfiguration.showAnonymous);
                                        tempBtn.setAnonymousByDefault(endUserFeedbackConfiguration.anonymousByDefault);
                                        tempBtn.setShowLegalAgreement(endUserFeedbackConfiguration.showLegalAgreement);
                                        tempBtn.setShowCustomUIContent(endUserFeedbackConfiguration.showCustomUIContent);
                                        tempBtn.setFeedbackDialogTitle(endUserFeedbackConfiguration.feedbackDialogTitle);
                                        tempBtn.setTextAreaPlaceholder(endUserFeedbackConfiguration.textAreaPlaceholder);
                                        tempBtn.setAggregation("customUIContent", endUserFeedbackConfiguration.customUIContent, false);

                                        var btnPress = function () {
                                            tempBtn.firePress();
                                        };
                                        oEndUserFeedback = sap.ui.getCore().byId("EndUserFeedbackBtn");
                                        oEndUserFeedback.setVisible(true);
                                        oEndUserFeedback.attachPress(btnPress);
                                        jQuery.sap.measure.end("FLP:Shell.controller._createActionButtons");

                                    } else {
                                        oEndUserFeedback = sap.ui.getCore().byId("EndUserFeedbackBtn") || new EndUserFeedback("EndUserFeedbackBtn", {
                                            showAnonymous: endUserFeedbackConfiguration.showAnonymous,
                                            anonymousByDefault: endUserFeedbackConfiguration.anonymousByDefault,
                                            showLegalAgreement: endUserFeedbackConfiguration.showLegalAgreement,
                                            showCustomUIContent: endUserFeedbackConfiguration.showCustomUIContent,
                                            feedbackDialogTitle: endUserFeedbackConfiguration.feedbackDialogTitle,
                                            textAreaPlaceholder: endUserFeedbackConfiguration.textAreaPlaceholder,
                                            customUIContent: endUserFeedbackConfiguration.customUIContent
                                        });
                                    }

                                    Config
                                        .on("/core/extension/EndUserFeedback")
                                        .do(function (bConfigured) {
                                            oEndUserFeedback.setVisible(bConfigured);
                                        });

                                    if (oHelpEnabled) {
                                        oEndUserFeedback.addStyleClass('help-id-EndUserFeedbackBtn'); // xRay help ID
                                    }

                                    that.oRenderer.addShellDanglingControl(oEndUserFeedback);
                                }
                            });
                    } catch (e) {
                        jQuery.sap.log.error("EndUserFeedback adapter is not found", e.message || e);
                        AppLifeCycle.getElementsModel().getModel().setProperty('/showEndUserFeedback', false);
                    }
                });

            // if xRay is enabled
            if (oHelpEnabled) {
                oUserPrefButton.addStyleClass('help-id-loginDetails');// xRay help ID
                oAboutButton.addStyleClass('help-id-aboutBtn');// xRay help ID
            }
            this.oRenderer.addShellDanglingControl(oAboutButton);
        },

        /**
         *
         *
         */
        _setUserPrefModel: function () {
            var userPreferencesEntryArray = sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty("/userPreferences/entries");
            var oDefaultUserPrefModel = this._getUserPrefDefaultModel();
            oDefaultUserPrefModel.entries = oDefaultUserPrefModel.entries.concat(userPreferencesEntryArray);
            // Re-order the entries array to have the Home Page entry right after the Appearance entry (if both exist)
            oDefaultUserPrefModel.entries = this.oRenderer.reorderUserPrefEntries(oDefaultUserPrefModel.entries);

            sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().setProperty("/userPreferences", oDefaultUserPrefModel);
        },

        /**
         *
         *
         */
        _getUserPrefDefaultModel: function () {
            var oModel = sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel(),
                oUser = sap.ushell.Container.getUser();

            // Create user preference entries for:
            // - themeSelector
            // - usageAnalytics
            // - DefaultParameters
            // - userProfiling
            // - CompactCozySelector

            var themeSelectorEntry = new GeneralEntry(
                "userPrefThemeSelector",
                "sap.ushell.components.shell.MeArea.ThemeSelector",
                "xml",
                "themes",
                resources.i18n.getText("Appearance"),
                function () {
                    var dfd = this.getView().getController().onSave();
                    dfd.done(function () {
                        // re-calculate tiles background color according to the selected theme
                        if (oModel.getProperty("/tilesOpacity") === true) {
                            sap.ushell.utils.utils.handleTilesOpacity();
                        }
                    });
                    return dfd;
                },
                undefined,
                undefined,
                undefined,
                function () {
                    if (oModel.getProperty("/setTheme") !== undefined) {
                        return oModel.getProperty("/setTheme") && oUser.isSetThemePermitted();
                    } else {
                        return oUser.isSetThemePermitted();
                    }
                },
                oModel,
                "sap-icon://palette"
            );

            var usageAnalyticsEntry = new GeneralEntry(
                "userPrefUsageAnalyticsSelector",
                "sap.ushell.components.shell.MeArea.UsageAnalyticsSelector",
                "js",
                "usageAnalytics",
                resources.i18n.getText("usageAnalytics"),
                undefined,
                undefined,
                undefined,
                undefined,
                sap.ushell.Container.getService("UsageAnalytics").isSetUsageAnalyticsPermitted()
            );

            var defaultParametersEntry = new GeneralEntry(
                "defaultParametersSelector",
                "sap.ushell.components.shell.MeArea.DefaultParameters",
                "js",
                undefined,
                resources.i18n.getText("defaultsValuesEntry"),
                undefined,
                undefined,
                undefined,
                undefined,
                true,
                undefined,
                undefined,
                false
            );

            var userProfilingEntry = new GeneralEntry(
                "userProfilingView",
                "sap.ushell.components.shell.MeArea.UserProfiling",
                "js",
                "userProfiling",
                resources.i18n.getText("userProfiling"),
                undefined,
                undefined,
                undefined,
                undefined,
                false,
                oModel,
                "sap-icon://user-settings",
                false
            );

            var entries =
                    [
                        new UserAccountEntry(this.oRenderer),
                        themeSelectorEntry,
                        new LanguageRegionEntry()
                    ],
                profilingEntries = [];
            profilingEntries.push(usageAnalyticsEntry);

            var oConfig = window["sap-ushell-config"],
                enableRecentActivity= jQuery.sap.getObject(
                    "renderers.fiori2.componentData.config.enableRecentActivity",
                    undefined,
                    oConfig);
            if (enableRecentActivity){
                entries.push(new UserActivitiesEntry());
            }
            entries.push(userProfilingEntry);

            // User setting entry for notification setting UI
            // Added only if both notifications AND notification settings are enabled
            if (oModel.getProperty("/enableNotifications") === true) {

                var oNotificationSettingsAvalabilityPromise = sap.ushell.Container.getService("Notifications")._getNotificationSettingsAvalability(),
                    notificationSettingsEntry;

                notificationSettingsEntry = new GeneralEntry(
                    "notificationSettings",
                    "sap.ushell.components.shell.Notifications.Settings",
                    "js",
                    undefined,
                    resources.i18n.getText("notificationSettingsEntry_title"),
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    true,
                    undefined,
                    "sap-icon://ui-notifications",
                    false
                );
                entries.push(notificationSettingsEntry);

                oNotificationSettingsAvalabilityPromise.done(function (oStatuses) {
                    if (oStatuses.settingsAvailable) {
                        notificationSettingsEntry.visible = true;// in case the notification entry did not enter already to the model, we should change the
                        oModel.getProperty("/userPreferences/entries").every(function (entry, index) {
                            if (entry.title === resources.i18n.getText("notificationSettingsEntry_title")) {
                                oModel.setProperty("/userPreferences/entries/" + index + "/visible", true);
                                return false;
                            }
                            return true;
                        });
                    }
                });
            }

            if (oModel.getProperty("/userDefaultParameters")) {
                entries.push(defaultParametersEntry);
            }

            return {
                dialogTitle: resources.i18n.getText("userSettings"),
                isDetailedEntryMode: false,
                activeEntryPath: null, //the entry that is currently modified
                entries: entries,
                profiling: profilingEntries
            };
        },

        /**
         *
         *
         */
        _showActionsInPopOver: function (oOpenByControl) {
            var oModel = AppLifeCycle.getElementsModel().getModel(),
                aCurrentStateActions = oModel.getProperty('/currentState/actions');
            if (!this.oActionsPopover) {
                this.oActionsLayout = new sap.ui.layout.VerticalLayout();
                this.oActionsPopover = new sap.m.Popover("sapUshellActionsPopover", {//here
                    showHeader: false,
                    placement: sap.m.PlacementType.Bottom,
                    content: this.oActionsLayout
                }).addStyleClass("sapUshellPopupContainer");

            }
            this.oActionsLayout.removeAllContent();
            this._createActionButtons();
            aCurrentStateActions.forEach(function (sActionId, iIndex) {
                var oAction = sap.ui.getCore().byId(sActionId);

                if (oAction && oAction.setActionType) {
                    /*since the factory can be called many times,
                     we need to add the press handler only once.
                     the method below makes sure it is added only once per control
                     the press handler is attached to all actions, and switches the
                     viewport state to "Center" as requested by UX*/
                    //TODO: COMPLETE THIS LOGIC!!
                    //oController._addPressHandlerToActions(oCtrl);
                    this.oActionsLayout.addContent(oAction);
                    oAction.setActionType('standard');
                    oAction.addStyleClass('sapUshellStandardActionItem');
                }
            }.bind(this));
            this.oActionsPopover.openBy(oOpenByControl);
            this.oActionsPopover.setModel(oModel);
        },

        /**
         *
         *
         */
        _switchToMeAreaView: function (oOpenByControl) {
            var bButtonSelected = oOpenByControl.getSelected();

                // If button is already selected (pressed)
                if (bButtonSelected) {
                    this.oRenderer.switchViewPortStateByControl(oOpenByControl, "Center");
                } else {
                    this.oRenderer.switchViewPortStateByControl(oOpenByControl, "LeftCenter");
                }
                // recalculate if their are items on mearea
                if (this.oRenderer.toggleOverFlowActions){
                    this.oRenderer.toggleOverFlowActions();
                }
            },

        /**
         *
         *
         */
        _getSearchPrefs: function () {
            var that = this;

            if (this._getIsSearchButtonEnabled()){
                // search preferences (user profiling, concept of me)
                // entry is added async only if search is active
                sap.ui.require(['sap/ushell/renderers/fiori2/search/userpref/SearchPrefs', 'sap/ushell/renderers/fiori2/search/SearchShellHelperAndModuleLoader'], function (SearchPrefs) {
                    that.oSearchPrefs = true;
                    var SearchPreferences = SearchPrefs;
                    var searchPreferencesEntry = SearchPreferences.getEntry();
                    searchPreferencesEntry.isSearchPrefsActive().done(function (isSearchPrefsActive) {
                        if (!isSearchPrefsActive) {
                            return;
                        }
                        // Add search as a profile entry
                        that.oRenderer.addUserProfilingEntry(searchPreferencesEntry);
                    }.bind(this));
                }.bind(this));
            }
        },

        /**
         *
         *
         */
        _getIsSearchButtonEnabled: function (){
            var oModel = AppLifeCycle.getElementsModel().getModel();
            try {
                var currentState = oModel.getProperty("/currentState/stateName");
                var oData = oModel.getData();
                var oStates = oData.states;
                if (oStates[currentState].headEndItems.indexOf("sf") != -1){
                    return true;
                } else {
                    return false;
                }
            } catch (err) {
                jQuery.sap.log.debug("Shell controller._createWaitForRendererCreatedPromise: search button is not visible.");
                return false;
            }
        },

        /**
         *
         *
         */
        _getPersonalizer: function (sItem) {
            if (this.oPersonalizer) {
                return this.oPersonalizer;
            }
            var oPersonalizationService = sap.ushell.Container.getService("Personalization");
            var oComponent = sap.ui.core.Component.getOwnerComponentFor(this);
            var oScope = {
                keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
                writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
                clientStorageAllowed: true
            };

            var oPersId = {
                container: this.PERS_KEY,
                item: sItem
            };

            this.oPersonalizer = oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);
            return this.oPersonalizer;
        },

        exit : function () {
        }
    });

    /**
     *
     *
     */
    function GeneralEntry (viewId, viewFullName, viewType, entryHelpID, title, onSaveFunc, onCancelFunc, getContentFunc, getValueFunc, isEditableFunc, oModel, entryIcon, defaultVisibility) {
        this.view = null;
        this.getView = function () {
            if (!this.view || !sap.ui.getCore().byId(viewId)) {
                if (viewType === "xml") {
                    this.view = sap.ui.xmlview(viewId, viewFullName);
                } else {
                    this.view = sap.ui.jsview(viewId, viewFullName);
                }
            }
            if (oModel) {
                this.view.setModel(oModel);
            }
            return this.view;
        };

        return {
            entryHelpID: entryHelpID,
            title: title,
            valueResult: null,
            onSave: onSaveFunc ? onSaveFunc.bind(this) : function () {
                if (this.getView().getController().onSave) {
                    return this.getView().getController().onSave();
                }
                return;
            }.bind(this),
            onCancel: onCancelFunc ? onCancelFunc.bind(this) : function () {
                if (this.getView().getController().onCancel) {
                    return this.getView().getController().onCancel();
                }
                return;
            }.bind(this),
            contentFunc: getContentFunc ? getContentFunc.bind(this) : function () {
                if (this.getView().getController().getContent) {
                    return this.getView().getController().getContent();
                }
                return;
            }.bind(this),
            valueArgument: getValueFunc ? getValueFunc.bind(this) : function () {
                var dfd = jQuery.Deferred(),
                    that = this;

                setTimeout(function () {
                    if (that.getView().getController().getValue) {
                        that.getView().getController().getValue().done(function (value) {
                            dfd.resolve(value);
                        });
                    }
                }, 0);

                return dfd.promise();
            }.bind(this),
            editable: typeof isEditableFunc === "function" ? isEditableFunc() : isEditableFunc,
            contentResult: null,
            icon: entryIcon,
            defaultVisibility : defaultVisibility
        };
    }

    /**
     *
     *
     */
    function LanguageRegionEntry () {
        this.view = null;

        this.getView = function getView () {
            if (!this.languageRegionSelector) {
                this.languageRegionSelector = sap.ui.jsview("languageRegionSelector", "sap.ushell.components.shell.MeArea.LanguageRegionSelector");
            }
            return this.languageRegionSelector;
        };

        var onSaveFunc = function () {
            var dfd = this.getView().getController().onSave();
            return dfd;
        }.bind(this);

        var onCancelFunc = function () {
            return this.getView().getController().onCancel();
        }.bind(this);

        var getContentFunc = function () {
            return this.getView().getController().getContent();
        }.bind(this);

        var getValueFunc = function () {
            return this.getView().getController().getValue();
        }.bind(this);

        return {
            entryHelpID: "language",
            title: resources.i18n.getText("languageRegionTit"),
            editable: true,
            valueArgument: getValueFunc,// the function which will be called to get the entry value
            valueResult: null,
            onSave: onSaveFunc,
            onCancel: onCancelFunc, // the function which will be called when canceling entry changes
            contentFunc: getContentFunc,// the function which will be called to get the content of the detailed entry
            contentResult: null,
            icon: "sap-icon://globe"
        };
    }

    /**
     *
     *
     */
    function UserActivitiesEntry () {
        this.view = null;

        this.getView = function getView () {
            if (!this.userActivitiesHandler) {
                this.userActivitiesHandler = sap.ui.jsview("userActivitiesHandler", "sap.ushell.components.shell.MeArea.userActivitiesHandler");
            }
            return this.userActivitiesHandler;
        };

        var onSaveFunc = function () {
            var dfd = this.getView().getController().onSave();
            return dfd;
        }.bind(this);

        var onCancelFunc = function () {
            return this.getView().getController().onCancel();
        }.bind(this);

        var getContentFunc = function () {
            return this.getView().getController().getContent();
        }.bind(this);

        var getValueFunc = function () {
            return this.getView().getController().getValue();
        }.bind(this);

        return {
            entryHelpID: "UserActivitiesEntry",
            title: resources.i18n.getText("userActivities"),
            editable: true,
            valueArgument: getValueFunc,// the function which will be called to get the entry value
            valueResult: null,
            onSave: onSaveFunc,
            onCancel: onCancelFunc, // the function which will be called when canceling entry changes
            contentFunc: getContentFunc,// the function which will be called to get the content of the detailed entry
            contentResult: null,
            icon: "sap-icon://laptop"
        };
    }

    /**
     *
     *
     */
    function UserAccountEntry (oRenderer) {
        this.view = null;
        this.oRenderer = oRenderer;

        this.getView = function getView () {
            if (!this.userAccountSelector) {
                if (( this.oRenderer.getShellConfig().enableOnlineStatus && sap.ushell.ui5service.UserStatus.prototype.isEnabled )
                || this.oRenderer.getShellConfig().enableUserImgConsent) {
                    this.userAccountSelector = sap.ui.xmlview("UserAccountSelector", "sap.ushell.components.shell.MeArea.userAccount.UserAccountSelector");
                } else {
                    this.userAccountSelector = sap.ui.xmlview("UserAccountSetting", "sap.ushell.components.shell.MeArea.userAccount.UserAccountSetting");
                }
            }
            return this.userAccountSelector;
        };

        var onSaveFunc = function () {
            var dfd = this.getView().getController().onSave();
            return dfd;
        }.bind(this);

        var onCancelFunc = function () {
            return this.getView().getController().onCancel();
        }.bind(this);

        var getContentFunc = function () {
            return this.getView().getController().getContent();
        }.bind(this);

        var getValueFunc = function () {
            return this.getView().getController().getValue();
        }.bind(this);

        return {
            entryHelpID: "userAccountEntry",
            title: resources.i18n.getText("UserAccountFld"),
            editable: true,
            valueArgument: getValueFunc,// the function which will be called to get the entry value
            valueResult: null,
            onSave: onSaveFunc,
            onCancel: onCancelFunc, // the function which will be called when canceling entry changes
            contentFunc: getContentFunc,// the function which will be called to get the content of the detailed entry
            contentResult: null,
            icon: "sap-icon://account"
        };
    }
});
