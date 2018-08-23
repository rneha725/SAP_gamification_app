sap.ui.require.preload({
	"sap/ushell/components/shell/MeArea/Component.js":function(){/*!
 * ${copyright}
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
            version: "${version}",
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
},
	"sap/ushell/components/shell/MeArea/DefaultParameters.controller.js":function(){// ${copyright}

sap.ui.define(["sap/ui/comp/smartform/SmartForm", "sap/ui/model/odata/ODataModel", "sap/ui/comp/smartfield/SmartField", "sap/ui/comp/valuehelpdialog/ValueHelpDialog"], function (SmartForm, ODataModel, SmartField, ValueHelpDialog) {
	"use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    sap.ui.controller("sap.ushell.components.shell.MeArea.DefaultParameters", {

        onInit: function () {
            this.oModelRecords = {}; // a map of models
            this.oChangedParameters = {}; // a Map of all parameters changed by the control
            this.oBlockedParameters = {}; // parmeters of odata models which are not yet filled with "our" value
            this.aDisplayedUserDefaults = []; // array of displayed parameters, in order
            this.DefaultParametersService = sap.ushell.Container.getService("UserDefaultParameters");
        },
        applyFocus: function () {
            var that = this;
            //Since each field is loaded separately, we have to check for focusable element
            //After each element is loaded in order to assure that the first element is focused
            //When the view is displayed for the first time.
            setTimeout(function () {
                if (!sap.ui.Device.phone) {
                    var elFirstToFocus = jQuery.sap.byId(that.getView().getId()).firstFocusableDomRef();

                    if (elFirstToFocus) {
                        jQuery.sap.focus(elFirstToFocus);
                    }
                }
            },1);
        },
        overrideOdataModelValue: function (oEvent) {
            var sUrl = oEvent.getParameter('url'),
                oModel = oEvent.getSource(),
                sFullPath,
                sFullOdataUrl,
                that = this;
            this.aDisplayedUserDefaults.forEach(function (oRecord) {
                if (oRecord.editorMetadata && oRecord.editorMetadata.editorInfo) {
                    sFullOdataUrl = oRecord.editorMetadata.editorInfo.odataURL + oRecord.editorMetadata.editorInfo.bindingPath;
                    //check if there is a parameter with the same oData URL as the completed request
                    if (sFullOdataUrl === sUrl) {
                        sFullPath = oRecord.editorMetadata.editorInfo.bindingPath + "/" + oRecord.editorMetadata.editorInfo.propertyName;
                        //if the property value in the model is not the same as the one we got from
                        //the service, change the property value accordingly
                        if (oModel.getProperty(sFullPath) !== oRecord.valueObject.value) {
                            oModel.setProperty(sFullPath, oRecord.valueObject.value);
                        }
                        that.oBlockedParameters[oRecord.parameterName] = false;
                    }
                }
            });

        },
        getOrCreateModelForODataService : function (sUrl) {
            if (!this.oModelRecords[sUrl]) {
                //In order to reduce the volume of the metadata response
                //We pass only relevant parameters to oDATaModel constructor .
                var oParameters = {
                    metadataUrlParams : {
                        "sap-documentation": "heading,quickinfo",
                        "sap-value-list": "none"
                    },
                    json: true
                };
                var oModel = new sap.ui.model.odata.ODataModel(sUrl, oParameters);
                oModel.setDefaultCountMode("None");
                oModel.setDefaultBindingMode("TwoWay");
                oModel.attachRequestCompleted(this.overrideOdataModelValue.bind(this));
                this.oModelRecords[sUrl] = oModel;
            }
            return this.oModelRecords[sUrl];
        },

        constructControlSet : function (oParameters) {
            // sort parameters and remove noneditable ones
            var oUserDefTmp = []; // use an empty array to be able to delete parameters
            //for each property name -> push all array elements into aUserDef
            for (var sParameter in oParameters) {
                //loop oUserDefTmp and search for an already existing parameter name
                for (var n = 0; n < oUserDefTmp.length; n++) {
                    if (oUserDefTmp[n].parameterName === sParameter) {
                        oUserDefTmp.splice(n, 1);
                    }
                }
                //copy the parameter name because we want to show it in the UI later
                oParameters[sParameter].parameterName = sParameter;
                oUserDefTmp.push(oParameters[sParameter]);
            }
            this.sortParametersByGroupIdParameterIndex(oUserDefTmp);

            this.aDisplayedUserDefaults = oUserDefTmp;
            this.sForm = new SmartForm( {
                editable: true
            }).addStyleClass("sapUshellShellDefaultValuesForm");

            this.getView().addContent(this.sForm);
        },

        getValue: function () {
            var deferred = jQuery.Deferred();

            var oHasRelevantMaintainableParameters = sap.ushell.Container.getService("UserDefaultParameters").hasRelevantMaintainableParameters();
            oHasRelevantMaintainableParameters.done(function (bHasRelevantParameters) {
                deferred.resolve({
                    value: bHasRelevantParameters ? 1 : 0,
                    displayText: " "
                });
            });

            oHasRelevantMaintainableParameters.fail(function (sErrorMessage) {
                deferred.reject(sErrorMessage);
            });

            return deferred.promise();
        },

        createPlainModel : function (grpel, oRecord) {
            oRecord.modelBind.model = this.oMdlParameter;
            oRecord.modelBind.extendedModel = this.oMdlParameter; // same model!
            grpel.setModel(oRecord.modelBind.model);
            var oModelPath = "/sUserDef_" + oRecord.nr + "_";
            oRecord.modelBind.sFullPropertyPath = oModelPath;
            oRecord.modelBind.sPropertyName =  "{" + oModelPath + "}";
            oRecord.modelBind.model.setProperty(oRecord.modelBind.sFullPropertyPath, oRecord.valueObject.value);
        },

        revertToPlainModelControls : function (grpel, oRecord) {
            jQuery.sap.log.error("Metadata loading for parameter " + oRecord.parameterName + " failed" + JSON.stringify(oRecord.editorMetadata));// metadata loading for the model intended for this control failed
            // -> instead display as plain
            // switch model binding:
            oRecord.modelBind.isOdata = false;
            this.createPlainModel(grpel, oRecord);
            // switch to create other controls
            this.createAppropriateControl(grpel, oRecord);
        },

        getContent: function () {
            var that = this;
            var deferred = new jQuery.Deferred();

            this.DefaultParametersService.editorGetParameters().done(function (oParameters) {
                // a json model for the "conventional" ( = non odata parameters)
                that.oMdlParameter = new sap.ui.model.json.JSONModel(oParameters);
                that.oMdlParameter.setDefaultBindingMode("TwoWay");
                that.getView().setModel(that.oMdlParameter, "MdlParameter");
                // take a deep copy of the original parameters
                that.oOriginalParameters = jQuery.extend(true, {}, oParameters);
                // that deep copy maintains the currently (within the editor) altered properties
                that.oCurrentParameters = jQuery.extend(true, {}, oParameters);
                that.constructControlSet(oParameters);

                var lastGroup = "nevermore";
                var grp; // the current group;
                that.aChangedParameters = [];
                that.oBindingContexts = {};

                that.setPropValue = function (oRecord) {
                    oRecord.modelBind.model.setProperty(oRecord.modelBind.sFullPropertyPath, oRecord.valueObject.value);
                    that.oBlockedParameters[oRecord.parameterName] = false;
                };
                that.oMdlParameter.setProperty("/sUser");
                for (var i = 0; i < that.aDisplayedUserDefaults.length; ++i) {
                    var oRecord = that.aDisplayedUserDefaults[i];
                    oRecord.nr = i;
                    oRecord.editorMetadata = oRecord.editorMetadata || {};
                    oRecord.valueObject = oRecord.valueObject || {value: ""};
                    var grpel = new sap.ui.comp.smartform.GroupElement({});

                    if (lastGroup != oRecord.editorMetadata.groupId) {
                        // generate a group on group change
                        //var groupTitle = oRecord.editorMetadata.groupTitle || sap.ushell.resources.i18n.getText("userDefaultsGeneralGroup");
                        var groupTitle = oRecord.editorMetadata.groupTitle || undefined;
                        grp = new sap.ui.comp.smartform.Group({ label : groupTitle, "editable" : true});
                        lastGroup = oRecord.editorMetadata.groupId;
                        that.sForm.addGroup(grp);
                    }
                    grp.addGroupElement(grpel);
                    oRecord.modelBind = {
                        model : undefined, // the model
                        sModelPath : undefined, // path into the model to the property value         "/sUserDef_<i>_/" or  "/UserDefaults('FIN')/CostCenter
                        sPropertyName : undefined, // the property binding statement , e.g. {xxxx} to attach to the control
                        sFullPropertyPath : undefined // path into the model to the property value
                    };

                    // normalize the value, in the editor, undefined is represented as "" for now,
                    // (check if we can make that better!
                    oRecord.valueObject.value = oRecord.valueObject.value || "";

                    if (oRecord.editorMetadata.editorInfo && oRecord.editorMetadata.editorInfo.propertyName) {
                        oRecord.modelBind.isOdata = true;
                        var sUrl = oRecord.editorMetadata.editorInfo.odataURL;
                        oRecord.modelBind.model = that.getOrCreateModelForODataService(sUrl);
                        grpel.setModel(oRecord.modelBind.model);
                        //in order to avoid OData requests to the same URL we try to reuse
                        //the BindingContext that was previously created for the same URL
                        //the call to bindElement creates a new BindingContext,
                        //and triggers an OData request
                        if (!that.oBindingContexts[sUrl]) {
                            grpel.bindElement(oRecord.editorMetadata.editorInfo.bindingPath);
                            that.oBindingContexts[sUrl] = oRecord.modelBind.model.getContext(oRecord.editorMetadata.editorInfo.bindingPath);
                        } else {
                            grpel.setBindingContext(that.oBindingContexts[sUrl]);
                        }
                        oRecord.modelBind.sPropertyName = "{" + oRecord.editorMetadata.editorInfo.propertyName + "}";
                        oRecord.modelBind.sFullPropertyPath = oRecord.editorMetadata.editorInfo.bindingPath + "/" + oRecord.editorMetadata.editorInfo.propertyName;

                        // for the extendedDefault we use the plain model for OData
                        oRecord.modelBind.extendedModel = that.oMdlParameter; // original model!
                    } else {
                        that.createPlainModel(grpel, oRecord);
                    }

                    oRecord.valueObject.value = oRecord.valueObject.value || "";
                    oRecord.modelBind.model.setProperty(oRecord.modelBind.sFullPropertyPath,oRecord.valueObject.value);
                    // before we have set "our" value, we do not want to listen/react on values
                    // within the control, thus we "block" the update
                    if (oRecord.modelBind.isOdata) {
                        that.oBlockedParameters[oRecord.parameterName] = true;
                        oRecord.modelBind.model.attachMetadataLoaded(that.createAppropriateControl.bind(that,grpel,oRecord));
                        oRecord.modelBind.model.attachMetadataFailed(that.revertToPlainModelControls.bind(that,grpel,oRecord));
                    } else {
                        that.createAppropriateControl(grpel, oRecord);
                    }
                    //oRecord.modelBind.model.setProperty(oRecord.modelBind.sFullPropertyPath,oRecord.valueObject.value);
                    oRecord.modelBind.model.bindTree(oRecord.modelBind.sFullPropertyPath).attachChange(that.storeChangedData.bind(that));
                }
                that.oMdlParameter.bindTree("/").attachChange(that.storeChangedData.bind(that));
                deferred.resolve(that.getView());
            });
            return deferred.promise();
        },

        createAppropriateControl : function (grpel, oRecord) {
            var sf, lbl, expButton, layout;
            //If oRecord supports extended values (ranges), we want to add an additional button to it
            //The style of the button depends on whether there are any ranges in the extendedValues object
            if (oRecord.editorMetadata.extendedUsage) {
                var that = this;
                expButton = new sap.m.Button({
                    text : sap.ushell.resources.i18n.getText("userDefaultsExtendedParametersTitle"),
                    tooltip: sap.ushell.resources.i18n.getText("userDefaultsExtendedParametersTooltip"),
                    type : {
                        parts: ['MdlParameter>/' + oRecord.parameterName + '/valueObject/extendedValue/Ranges'],
                        formatter: function (aRanges) {
                            return aRanges && aRanges.length ? sap.m.ButtonType.Emphasized : sap.m.ButtonType.Transparent;
                        }
                    },
                    press: function (oEvent) {
                        that.openExtendedValueDialog(oEvent, oRecord);
                    }
                }).addStyleClass('sapUshellExtendedDefaultParamsButton');
            }
            // grpel
            jQuery.sap.log.debug("Creating controls for parameter" + oRecord.parameterName + " type " + oRecord.modelBind.isOdata);
            var aElements = grpel.getElements().slice();
            aElements.forEach(function (oElement) {
                // at time or writing, the removeElement call was flawed
               grpel.removeElement(oElement);
            });
            var aFields = grpel.getFields().slice();
                aFields.forEach(function (oElement) {
                   grpel.removeField(oElement);
                });

            lbl = new sap.ui.comp.smartfield.SmartLabel({
                width: sap.ui.Device.system.phone ? "auto" : "12rem",
                textAlign: sap.ui.Device.system.phone ? 'Left' : 'Right'
            });
            if (oRecord.modelBind.isOdata && oRecord.editorMetadata.editorInfo) {
                sf = new SmartField({
                    value: oRecord.modelBind.sPropertyName,
                    name: oRecord.parameterName
                });
                sf.attachInnerControlsCreated({}, this.applyFocus, this);
                lbl.setLabelFor(sf);
            } else {
                sf = new sap.m.Input({ name: oRecord.parameterName, value : oRecord.modelBind.sPropertyName , type : "Text"});
                this.setPropValue(oRecord);
                lbl.setText((oRecord.editorMetadata.displayText || oRecord.parameterName) + ":");
                lbl.setTooltip(oRecord.editorMetadata.description || oRecord.parameterName);
            }

            sf.attachChange(this.storeChangedData.bind(this));
            sf.addStyleClass("sapUshellDefaultValuesSmartField");
            sf.setLayoutData(new sap.m.FlexItemData({shrinkFactor: 0}));
            var oInputBox = new sap.m.FlexBox({
               width: sap.ui.Device.system.phone ? '100%' : 'auto',
               direction: (sap.ui.Device.system.phone && !expButton) ? 'Column' : 'Row',
               items: [sf, expButton]
            });
            lbl.setLayoutData(new sap.m.FlexItemData({shrinkFactor: 0}));
            layout =  new sap.m.FlexBox({
                alignItems: sap.ui.Device.system.phone ? 'Start' : 'Center',
                direction: sap.ui.Device.system.phone ? 'Column' : 'Row',
                items: [lbl, oInputBox]
            });

            grpel.addElement(layout);
        },


        openExtendedValueDialog: function (oEvent, oData) {
            var that = this,
                sPathToTokens = '/' + oData.parameterName + '/valueObject/extendedValue/Ranges',
                oModel = oData.modelBind.extendedModel,
                aRanges = oModel.getProperty(sPathToTokens) || [],
                lblText,
                sNameSpace;

            if (oData.modelBind.isOdata) {
                sNameSpace = this._getMetadataNameSpace(oData.editorMetadata.editorInfo.odataURL);
                var oEntityType = oData.modelBind.model.getMetaModel().getODataEntityType(sNameSpace + "." + oData.editorMetadata.editorInfo.entityName);
                if (oEntityType) {
                    lblText = oData.modelBind.model.getMetaModel().getODataProperty(oEntityType, oData.editorMetadata.editorInfo.propertyName)["sap:label"];
                }
            }
            var oValueHelpDialog = new ValueHelpDialog({
                basicSearchText:  oData.editorMetadata.displayText || lblText || oData.parameterName,
                title: oData.editorMetadata.displayText || lblText || oData.parameterName,
                supportRanges: true,
                supportRangesOnly: true,
                key: oData.modelBind.sPropertyName,
                displayFormat: "UpperCase",
                descriptionKey: oData.editorMetadata.displayText || lblText || oData.parameterName,
                filterMode: true,
                stretch: sap.ui.Device.system.phone,
                ok: function (oControlEvent) {
                    that.saveExtendedValue(oControlEvent, oData, oModel, oValueHelpDialog);
                },
                cancel: function (oControlEvent) {
                    oValueHelpDialog.close();
                },
                afterClose: function () {
                    oValueHelpDialog.destroy();
                }
            });

            oValueHelpDialog.setIncludeRangeOperations(this.getListOfSupportedRangeOperations());
            this.addTokensToValueHelpDialog(oValueHelpDialog, aRanges, oData.parameterName);
            var keyFields = [];
            keyFields.push({label: oValueHelpDialog.getTitle(), key: oData.parameterName});
            oValueHelpDialog.setRangeKeyFields(keyFields);
            oValueHelpDialog.open();
        },

        saveExtendedValue: function (oControlEvent, oData, oModel, oValueHelpDialog) {
            this.aTokens = oControlEvent.getParameters().tokens;
            var aTokensData = [],
                sPathToTokens = '/' + oData.parameterName + '/valueObject/extendedValue/Ranges',
                aFormattedTokensData,
                valueObject = {
                    extendedValue : {
                        "Ranges": []
                    }
                };
            jQuery.extend(this.oCurrentParameters[oData.parameterName].valueObject, valueObject);
            for (var token in this.aTokens) {
                if (this.aTokens.hasOwnProperty(token)) {
                    aTokensData.push(this.aTokens[token].data("range"));
                }
            }
            //convert the Ranges that are coming from the dialog to the format
            //that should be persisted in the service and that applications can read
            aFormattedTokensData = aTokensData.map(function (token) {
                return {
                    Sign : token.exclude ? 'E' : 'I',
                    Option : token.operation !== "Contains" ? token.operation : "CP",
                    Low : token.value1,
                    High : token.value2 || null
                };
            });
            if (!oModel.getProperty('/' + oData.parameterName + '/valueObject/extendedValue')) {
                oModel.setProperty('/' + oData.parameterName + '/valueObject/extendedValue', {});
            }
            oModel.setProperty(sPathToTokens, aFormattedTokensData);
            this.oChangedParameters[oData.parameterName] = true;
            oValueHelpDialog.close();
        },

        getListOfSupportedRangeOperations: function () {
            //there is no representation of StartsWith and EndsWith on ABAP
            //so applications won't be able to get these operations
            var aSupportedOps =  Object.keys(sap.ui.comp.valuehelpdialog.ValueHelpRangeOperation);
            return aSupportedOps.filter(function (operation) {
                return operation !== "StartsWith" && operation !== 'EndsWith' && operation !== 'Initial';
            });
        },

        _getMetadataNameSpace : function (sServiceUrl) {
            var aSplit = sServiceUrl.split("/"),
                sNamespace;
            sNamespace = aSplit[aSplit.length - 1];
            return sNamespace;
        },

        addTokensToValueHelpDialog: function (oDialog, aRanges, sParameterName) {
            var tokens = [],
                oFormattedToken;
            aRanges.forEach(function (oRange) {
                if (oRange) {
                    //convert the Range format to the format that the value help dialog
                    //knows how to read
                    oFormattedToken = {};
                    oFormattedToken.exclude = oRange.Sign === 'E';
                    oFormattedToken.keyField = sParameterName;
                    oFormattedToken.operation = oRange.Option !== "CP" ? oRange.Option : "Contains";
                    oFormattedToken.value1 = oRange.Low;
                    oFormattedToken.value2 = oRange.High;
                    tokens.push(new sap.m.Token({}).data("range", oFormattedToken));
                }
            });
            oDialog.setTokens(tokens);
        },

        /**
         * Sorts the array parameter aUserDefTmp in situ
         * by respective criteria to achieve a display order
         * @param {array} aUserDefTmp list or parameters
         */
        sortParametersByGroupIdParameterIndex : function (aUserDefTmp) {
            // compare by groupId
            function compareByGroupId (oDefault1, oDefault2) {
                // handle default without metadata
                if (!(oDefault2.editorMetadata && oDefault2.editorMetadata.groupId)) {
                    return -1; // keep order
                }
                if (!(oDefault1.editorMetadata && oDefault1.editorMetadata.groupId)) {
                    return 1; // move oDefault1 to the end
                }

                if (oDefault1.editorMetadata.groupId < oDefault2.editorMetadata.groupId) { return -1; }
                if (oDefault1.editorMetadata.groupId > oDefault2.editorMetadata.groupId) { return 1; }

                return 0;
            }
            // compare by parameterIndex
            function compareByParameterIndex (oDefault1, oDefault2) {
                // handle default without metadata
                if (!(oDefault2.editorMetadata && oDefault2.editorMetadata.parameterIndex)) {
                    return -1; // keep order
                }
                if (!(oDefault1.editorMetadata && oDefault1.editorMetadata.parameterIndex)) {
                    return 1; // move oDefault1 to the end
                }
                return oDefault1.editorMetadata.parameterIndex - oDefault2.editorMetadata.parameterIndex;
            }

            // sort by groupid, parameterindex
            aUserDefTmp.sort(function (oDefault1, oDefault2) {
                //first by groupId
                var returnValueOfCompareByGroupId = compareByGroupId(oDefault1, oDefault2);
                if (returnValueOfCompareByGroupId === 0) {
                    //then by parameterIdx
                    return compareByParameterIndex(oDefault1, oDefault2);
                }
                return returnValueOfCompareByGroupId;
            });
        },

        // this function is invoked on any model data change
        // ( be it in an odata model or in the plain JSON fallback model
        // we always run over all parameters and record the ones with a delta
        // we change *relevant* deltas compared to the data when calling up the dialogue
        // note that the valueObject may contain other relevant metadata!
        // (which is *not* altered by the Editor Control),
        // thus it is important not to overwrite or recreate the valueObject, but only set the
        // value property
        storeChangedData: function () {
            var i = 0,
                that = this,
                arr = that.aDisplayedUserDefaults;

            // check for all changed parameters...
            for (i = 0; i < arr.length; ++i) {
                var pn = arr[i].parameterName;
                if (!that.oBlockedParameters[pn]) {
                    var oldValue = {
                        value: that.oCurrentParameters[pn].valueObject && that.oCurrentParameters[pn].valueObject.value,
                        extendedValue: that.oCurrentParameters[pn].valueObject && that.oCurrentParameters[pn].valueObject.extendedValue && that.oCurrentParameters[pn].valueObject.extendedValue
                    };
                    if (arr[i].modelBind && arr[i].modelBind.model) {
                        var oModel = arr[i].modelBind.model;
                        var oModelExtended = arr[i].modelBind.extendedModel;
                        var sPropValuePath = arr[i].modelBind.sFullPropertyPath;
                        var sActValue = oModel.getProperty(sPropValuePath);
                        var oNewValue = {
                            value: oModel.getProperty(sPropValuePath),
                            extendedValue: oModelExtended.getProperty('/' + pn + '/valueObject/extendedValue')
                        };
                        if (this.isValueDifferent(oNewValue, oldValue)) {
                            that.oCurrentParameters[pn].valueObject.value = sActValue;
                            if (oNewValue.extendedValue) {
                                jQuery.extend(that.oCurrentParameters[pn].valueObject.extendedValue, oNewValue.extendedValue);
                            }
                            that.oChangedParameters[pn] = true;
                        }
                    }
                }
            }
        },


        onCancel: function () {
            if (sap.ui.getCore().byId("saveButton")) {
                sap.ui.getCore().byId("saveButton").setEnabled(true);
            }
        },

        isValueDifferent : function (oValueObject1, oValueObject2) {
            var isEmptyValue = false,
                sValue1 = oValueObject1 ? JSON.stringify(oValueObject1) : oValueObject1,
                sValue2 = oValueObject2 ? JSON.stringify(oValueObject2) : oValueObject2,
                sExtendedValue1,
                sExtendedValue2;

            if (sValue1 === sValue2) {
                return false;
            }
            if (oValueObject1 === undefined ) {
                return false;
            }
            if (oValueObject2 === undefined ) {
                return false;
            }
            sExtendedValue1 = oValueObject1.extendedValue ? JSON.stringify(oValueObject1.extendedValue) : oValueObject1.extendedValue;
            sExtendedValue2 = oValueObject2.extendedValue ? JSON.stringify(oValueObject2.extendedValue) : oValueObject2.extendedValue;

            // for the editor, "" and undefined are the same!
            if ((oValueObject1.value === "" && oValueObject2.value === undefined) ||
                (oValueObject2.value === "" && oValueObject1.value === undefined)) {
                isEmptyValue = true;
            }
            if (isEmptyValue && (sExtendedValue1 === sExtendedValue2)) {
                return false;
            }
            return (!isEmptyValue && (oValueObject1.value !== oValueObject2.value)) ||
                (sExtendedValue1 !== sExtendedValue2);
        },

        onSave: function () {
            var that = this,
                deferred = new jQuery.Deferred(),
                i,
                aChangedParameterNames = Object.keys(this.oChangedParameters).sort(),
                oSetValuePromise,
                pn;
            // we change the effectively changed parameters, once, in alphabetic order
            for (i = 0; i < aChangedParameterNames.length; i++) {
                pn = aChangedParameterNames[i];
                //only if effectively changed:
                if ( this.isValueDifferent(this.oOriginalParameters[pn].valueObject, this.oCurrentParameters[pn].valueObject)) {
                    // as the editor does not distinguish empty string from deletion, and has no "reset" button
                    // we drop functionality to allow to set a value to an empty string (!in the editor!)
                    // and map an empty string to an effective delection!
                    // TODO: make sure all controls allow to enter an empty string as an "valid" value
                    if ((this.oCurrentParameters[pn].valueObject && this.oCurrentParameters[pn].valueObject.value === null) ||
                        (this.oCurrentParameters[pn].valueObject && this.oCurrentParameters[pn].valueObject.value === "")) {
                        this.oCurrentParameters[pn].valueObject.value = undefined;
                    }
                    // we rectify the extended value, as the editor produces empty object
                    if (this.oCurrentParameters[pn].valueObject &&
                        this.oCurrentParameters[pn].valueObject.extendedValue &&
                        jQuery.isArray(this.oCurrentParameters[pn].valueObject.extendedValue.Ranges) &&
                        (this.oCurrentParameters[pn].valueObject.extendedValue.Ranges.length === 0)) {
                        this.oCurrentParameters[pn].valueObject.extendedValue = undefined;
                    }
                    oSetValuePromise = sap.ushell.Container.getService("UserDefaultParameters").editorSetValue(pn, this.oCurrentParameters[pn].valueObject);
                    oSetValuePromise.done(function (sParameterName) {
                        that.oChangedParameters = {};
                        that.oOriginalParameters[sParameterName].valueObject.value = that.oCurrentParameters[sParameterName].valueObject.value;
                        deferred.resolve();
                    });
                    oSetValuePromise.fail(deferred.reject);
                }
            }
            return deferred.promise();
        }

    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/DefaultParameters.view.js":function(){sap.ui.define([],
    function () {
	"use strict";

    /*global jQuery, sap, document, self */
    /*jslint plusplus: true, nomen: true, vars: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.DefaultParameters", {

        createContent: function (oController) {

        },

        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.DefaultParameters";
        }


    });



}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/LanguageRegionSelector.controller.js":function(){// ${copyright}

sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    sap.ui.controller("sap.ushell.components.shell.MeArea.LanguageRegionSelector", {

        onInit: function () {
            try {
                this.userInfoService = sap.ushell.Container.getService("UserInfo");
                this.oUser = this.userInfoService.getUser();
            } catch (e) {
                jQuery.sap.log.error("Getting UserInfo service failed.");
                this.oUser = sap.ushell.Container.getUser();
            }
            this.bIsSetLanguage = sap.ushell.Container.getRenderer('fiori2').getModelConfiguration().enableSetLanguage;
            this.isLanguageChanged = false;
            this.isLanguagePersonalized = this.oUser.isLanguagePersonalized();
            this.sLanguage = this._getFormatedLanguage(this.oUser.getLanguage());
            this.aLanguageList = null;
            var oModel = new sap.ui.model.json.JSONModel();
            var modelData = {
                languageList: [{text: this.sLanguage, key: this.sLanguage}],
                selectedLanguage: this.sLanguage
            };
            var oLocale = sap.ui.getCore().getConfiguration().getFormatSettings().getFormatLocale();
            var oLocaleData = sap.ui.core.LocaleData.getInstance(oLocale);
            var sDatePattern = oLocaleData.getDatePattern("medium"),
                sTimePattern = oLocaleData.getTimePattern("medium"),
                sTimeFormat = (sTimePattern.indexOf("H") === -1) ? "12h" : "24h" ;

            modelData.datePatternList = [{text: sDatePattern, key: sDatePattern}];
            modelData.timeFormat = sTimeFormat;
            modelData.selectedDatePattern = sDatePattern;
            var hourButtons = this.oView.hourFormatSegmentedButton.getButtons();
            var selectedButton = (sTimeFormat==="12h") ? hourButtons[0] : hourButtons[1];
            this.oView.hourFormatSegmentedButton.setSelectedButton(selectedButton);
            oModel.setData(modelData);
            this.oView.setModel(oModel);
        },

        getContent: function () { 
            var oDfd = jQuery.Deferred();
            var that = this;
            // if feature - show drop down with all languages.
            // if feature isn't disable - show read only text with current user language
            // if platform didn't implement this feature - enableSetLanguage == undefined - act like disable
            if (this.bIsSetLanguage) {
                jQuery.sap.measure.start("FLP:LanguageRegionSelector.getContent", "getContent","FLP");
                var dfdLanguageList = this._getLanguagesList();
                dfdLanguageList.done(function (aLanguageList){
                    // check the response isn't empty   
                    if (aLanguageList) {
                        if (aLanguageList.length > 1) {
                            if (!that.isLanguagePersonalized) {
                                that.getView().getModel().setProperty("/selectedLanguage","default");
                            } else {
                                that.getView().getModel().setProperty("/selectedLanguage",that.oUser.getLanguage());
                            }
                            // by default of UI5 the size is limit to 100 , there can be more then that in our case
                            // so we adjust it to the platform support.
                            that.getView().getModel().setSizeLimit(aLanguageList.length);
                            that.getView().getModel().setProperty("/languageList",aLanguageList);
                            that.oView.inputLanguage.setVisible(false);
                            that.oView.selectLanguage.setVisible(true);
                            that.oView.helpingText.setVisible(true);
                            that.oView.helpingTextLabel.setVisible(true);
                        }
                    }
                    jQuery.sap.measure.end("FLP:LanguageRegionSelector.getContent");
                    oDfd.resolve(that.getView());
                });
                // in case of failure - - show read only text with current user language
                dfdLanguageList.fail(function (sErrorMessage) {
                    jQuery.sap.log.error(sErrorMessage);
                    oDfd.resolve(that.getView());
                });
            } else {
                oDfd.resolve(that.getView());
            }
            return oDfd.promise();
        },

        getValue: function () {
            var oDfd = jQuery.Deferred();
            var sSelectedLanguage = this.getView().getModel().getProperty("/selectedLanguage");
            var sUserLanguage = this.oUser.getLanguage();
            // if the language is default - we want to present the local instead of "DEFAULT"
            if (sSelectedLanguage == "default") {
                oDfd.resolve(this._getFormatedLanguage(sUserLanguage) +" | "+ sap.ushell.resources.i18n.getText("timeFormatFld")+ ": "+ this.getView().getModel().getProperty("/timeFormat"));
            } else {
                oDfd.resolve(this._getFormatedLanguage(sSelectedLanguage) +" | "+ sap.ushell.resources.i18n.getText("timeFormatFld")+ ": "+ this.getView().getModel().getProperty("/timeFormat"));
            }

            return oDfd.promise();
        },

        onCancel: function () {
            var oDfd = jQuery.Deferred();
            if (this.bIsSetLanguage) {
                this.isLanguageChanged = false;
                var sSelectedLanguage = this.getView().getModel().getProperty("/selectedLanguage");
                //only if there was a change
                if (!this.isLanguagePersonalized || this.oUser.getLanguage() != sSelectedLanguage) {
                    this._handleSelectChange(this.oUser.getLanguage(), "Cancel");
                    oDfd.resolve();
                } else {
                    oDfd.resolve();
                }
            } else {
                oDfd.resolve();
            }

            return oDfd.promise();
        },

        onSave: function () {
            var oDfd = jQuery.Deferred();
            var sOriginLanguage;
            var sSelectedLanguage = this.getView().getModel().getProperty("/selectedLanguage");

            //only if there was a change
            if (this.isLanguageChanged) {
                if (sSelectedLanguage) {
                    sOriginLanguage = this.oUser.getLanguage();
                    this.oUser.setLanguage(sSelectedLanguage);
                    this.userInfoService.updateUserPreferences(this.oUser)
                    .done(function () {
                        oDfd.resolve();
                        window.location.reload(); //refresh the page to apply changes.
                    }.bind(this))
                        // in case of failure - return to the original language
                    .fail(function (sErrorMessage) {
                            this.oUser.setLanguage(sOriginLanguage);
                            this._handleSelectChange(sOriginLanguage,"Cancel");
                            jQuery.sap.log.error(sErrorMessage);
                            oDfd.reject(sErrorMessage);
                        }.bind(this));
                }
            } else {
                oDfd.resolve();
            }
            return oDfd.promise();
        },

        _getFormatedLanguage: function (sLanguage) {
            //In case the language value is with region - for example 'en-us', the value would be 'EN (us)'. Otherwise, the value will be 'EN'.
            if (sLanguage && sLanguage.indexOf('-') > -1) {
                sLanguage = sLanguage.replace('-', ' (').concat(')').toUpperCase();
            } else if (sLanguage) {
                sLanguage = sLanguage.toUpperCase();
            }
            return sLanguage;
        },

        /**
         *  This method call handle the change in the selection language
         *  It call in two cases:
         *  Save - the language should be saved on model
         *  Cancel - the original selection(language) should be retrieve.
         * @param sLanguage
         * @param sMode - can be "Save" or "Cancel"
         * @private
         */
        _handleSelectChange : function(sLanguage, sMode){
            var oLocale = new sap.ui.core.Locale(sLanguage);
            var oLocaleData = sap.ui.core.LocaleData.getInstance(oLocale);
            var sDatePattern = oLocaleData.getDatePattern("medium"),
                sTimePattern = oLocaleData.getTimePattern("medium"),
                sTimeFormat = (sTimePattern.indexOf("H") === -1) ? "12h" : "24h" ;
            this.isLanguageChanged = true;
            if (sMode == "Cancel") {
                // if the user language isn't personalzied - need to reurtn browser language
                if (!this.isLanguagePersonalized) {
                    this.getView().selectLanguage.setSelectedKey("default");
                } else {
                    this.getView().selectLanguage.setSelectedKey(sLanguage);
                }
                this.isLanguageChanged = false;
            }
            this.getView().comboDate.setValue(sDatePattern);
            var hourButtons = this.getView().hourFormatSegmentedButton.getButtons();
            var selectedButton = (sTimeFormat==="12h") ? hourButtons[0] : hourButtons[1];
            this.getView().hourFormatSegmentedButton.setSelectedButton(selectedButton);

        },

        /**
         * Returns the language list from the platforms , triggered userInfoService API for it.
         * @returns {*}
         * @private
         */
        _getLanguagesList: function () {
            var oResultDeferred = jQuery.Deferred();
            // get the list only we haven't get it until now
            if (this.aLanguageList == null) {
                    jQuery.sap.measure.start("FLP:LanguageRegionSelector._getLanguagesList", "_getLanguagesList","FLP");
                    var getLanguagePromise = this.userInfoService.getLanguageList();
                    getLanguagePromise.done(function (oData) {
                        jQuery.sap.measure.end("FLP:LanguageRegionSelector._getLanguagesList");
                        oResultDeferred.resolve(oData);
                    });
                    getLanguagePromise.fail(function () {
                        oResultDeferred.reject("Failed to load language list.");
                    });
            } else {
                oResultDeferred.resolve(this.aLanguageList);
            }
            return oResultDeferred.promise();
        }
    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/LanguageRegionSelector.view.js":function(){// ${copyright}
sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, document, self */
    /*jslint plusplus: true, nomen: true, vars: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.LanguageRegionSelector", {
        createContent: function (oController) {
            var itemTemplate = new sap.ui.core.Item({
                text: "{text}",
                key: "{key}"
            });
            var i18n = sap.ushell.resources.i18n;
            var sFlexDirection = sap.ui.Device.system.phone ? 'Column' : 'Row';
            var sFlexAlignItems = sap.ui.Device.system.phone ? 'Stretch' : 'Center';
            var sTextAlign = sap.ui.Device.system.phone ? 'Left' : 'Right';
            var sLabelWidth = sap.ui.Device.system.phone ? "auto" : "12rem";
            var sLabelSelectLanguageWidth = sap.ui.Device.system.phone ? "auto" : "16rem";
            var sComboBoxWidth = sap.ui.Device.system.phone ? "100%" : undefined;

            var languageLabel = new sap.m.Label('languageSelectionLabel', {
                text: {
                    path: "/selectedLanguage",
                    formatter: function (sSelectedLanguage) {
                        sSelectedLanguage = oController._getFormatedLanguage(sSelectedLanguage);
                        //If the language value has region - for example 'en(us)', the label should be 'Language and Region'. Otherwise, it should be 'Language'.
                        return i18n.getText(sSelectedLanguage.indexOf('(') > -1 ? "languageAndRegionTit" : "languageRegionFld") + ':';
                    }
                },
                width: sLabelWidth,
                textAlign: sTextAlign
            });

           this.selectLanguage =  new sap.m.Select('languageSelectionSelect', {
                visible: false,
                width: sLabelSelectLanguageWidth,
                items: {
                    path: "/languageList",
                    template: itemTemplate
                },
                selectedKey: "{/selectedLanguage}",
                editable: true,
                   change: function (e) {
                      var sSelectedLanguage = e.getParameters().selectedItem.getKey();
                      oController._handleSelectChange(sSelectedLanguage);
                   }
            }).addAriaLabelledBy(languageLabel);

            this.inputLanguage =  new sap.m.Input('languageSelectionInput', {
                    visible: true,
                    value: "{/selectedLanguage}",
                    editable: false
                }).addAriaLabelledBy(languageLabel);


            var fboxLanguage = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    languageLabel,
                    this.selectLanguage,
                    this.inputLanguage
                ]
            });

            this.helpingTextLabel = new sap.m.Label({
                visible: false,
                text:"",
                width: sLabelWidth,
                textAlign: sTextAlign
            });

            this.helpingText = new sap.m.Text({
                visible: false,
                text: i18n.getText("LanguageAndRegionHelpingText"),
                width: sLabelSelectLanguageWidth,
                textAlign: "Begin"
            }).addStyleClass("sapUshellFlpSettingsLanguageRegionDescription");

            var fboxHelpingText = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    this.helpingTextLabel,
                    this.helpingText
                ]
            });

            var dateLabel = new sap.m.Label({
                text: i18n.getText("dateFormatFld") + ":",
                width: sLabelWidth,
                textAlign: sTextAlign
            });

            this.comboDate = new sap.m.ComboBox('dateFormatCombo',{
                width: sComboBoxWidth,
                items: {
                    path: "/datePatternList",
                    template: itemTemplate
                },
                selectedKey: "{/selectedDatePattern}",
                editable: false
            }).addAriaLabelledBy(dateLabel);

            var fboxDate = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    dateLabel,
                    this.comboDate
                ]
            });

            this.hourFormatSegmentedButton = new sap.m.SegmentedButton('hoursSegmentedButton',{
                enabled: false,
                width: "10rem",
                buttons: [
                    new sap.m.Button({
                        text: i18n.getText("btn12h")
                    }),
                    new sap.m.Button({
                        text: i18n.getText("btn24h")
                    })
                ]
            });

            var fboxTime = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    new sap.m.Label({
                        text: i18n.getText("timeFormatFld") + ":",
                        width: sLabelWidth,
                        textAlign: sTextAlign
                    }),
                    this.hourFormatSegmentedButton
                ]
            });

            fboxTime.addStyleClass("sapUshellFlpSettingsLanguageRegionHourFormatFBox");
            var vbox = new sap.m.VBox({
                items: [fboxLanguage, fboxHelpingText, fboxDate, fboxTime]
            });
            vbox.addStyleClass("sapUiSmallMargin");

            return vbox;
        },

        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.LanguageRegionSelector";
        }
    });



}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/MeArea.controller.js":function(){// ${copyright}
sap.ui.define(["sap/ushell/resources", "sap/m/Button", "sap/m/ButtonType"], function (resources, Button, ButtonType) {
    "use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    var oModel = new sap.ui.model.json.JSONModel({
        actions: [],
        userPreferences: {
            entries: []
        },
        apps: {
            recentActivities: [],
            frequentActivities: []
        }
    });

    sap.ui.controller("sap.ushell.components.shell.MeArea.MeArea", {
        onInit: function () {
            var oConfig = (this.getView().getViewData() ? this.getView().getViewData().config : {}) || {};
            this.aControlsWithPressHandler = [];
            this.getView().setModel(oModel, "meAreaModel");
            this._addActionItemToOverflowSupport();
            this.oResourceBundle = resources.i18n;

            if (oConfig.enableRecentActivity && sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty("/enableTrackingActivity")) {
                this.oUserRecentsSrvc = sap.ushell.Container.getService('UserRecents');
            }
            this.lastVisited = null;
        },

        onBeforeRendering: function () {
            if (this.oUserRecentsSrvc) {
                if (!oModel.getProperty('/apps/recentActivities') || !oModel.getProperty('/apps/recentActivities').length) {
                    this.refreshRecentActivities();
                }
            }
            if (!oModel.getProperty('/apps/frequentActivities') || !oModel.getProperty('/apps/frequentActivities').length) {
                this.refreshFrequentActivities();
            }
        },

        refreshRecentActivities: function () {
            if (this.oUserRecentsSrvc) {
                this.oUserRecentsSrvc.getRecentActivity().done(function (aActivity) {
                    aActivity.forEach(function (oItem) {
                        oItem.timestamp = sap.ushell.utils.formatDate(oItem.timestamp);
                    });
                    oModel.setProperty('/apps/recentActivities', aActivity);
                });
            }
        },

        refreshFrequentActivities: function () {
            if (this.oUserRecentsSrvc) {
                this.oUserRecentsSrvc.getFrequentActivity().done(function (aActivity) {
                    oModel.setProperty('/apps/frequentActivities', aActivity);
                });
            }
        },

        createViewByName: function (oEvent, sName, sViewId) {
            var oView = sViewId ? sap.ui.getCore().byId(sViewId) : null;
            if (!oView) {
                var oSrc = oEvent.getSource(),
                    oCtx = oSrc.getBindingContext(),
                    sPath = oCtx ? oCtx.getPath() : "",
                    sViewName = sName || oCtx.getModel().getProperty(sPath + "/viewName");

                sViewId = sViewId || oCtx.getModel().getProperty(sPath + "/id");
                oView = sap.ui.view(sViewId, {
                    viewName: sViewName,
                    type: 'JS',
                    viewData: {}
                });
            }

            return oView;
        },

        getSettingsDialogContent: function () {
            var oSettingView = sap.ui.getCore().byId("userSettings");
            if (!oSettingView) {
                oSettingView = sap.ui.view("userSettings", {
                    viewName: "sap.ushell.components.shell.MeArea.UserSettings",
                    type: 'JS',
                    viewData: this.getView().getViewData()
                });
            }
            oSettingView.setModel(this.getView().getModel());
            return oSettingView;
        },

        logout: function () {
            sap.ui.require(['sap/m/MessageBox'],
                function (MessageBox) {
                    var oLoading = new sap.ushell.ui.launchpad.LoadingDialog({text: ""}),
                        bShowLoadingScreen = true,
                        bIsLoadingScreenShown = false,
                        oLogoutDetails = {};

                    sap.ushell.Container.getGlobalDirty().done(function (dirtyState) {
                        bShowLoadingScreen = false;
                        if (bIsLoadingScreenShown === true) {
                            oLoading.exit();
                            oLoading = new sap.ushell.ui.launchpad.LoadingDialog({text: ""});
                        }

                        var _getLogoutDetails = function (dirtyState) {
                            var oLogoutDetails = {},
                                oResourceBundle = resources.i18n;

                            if (dirtyState === sap.ushell.Container.DirtyState.DIRTY) {
                                // show warning only if it is sure that there are unsaved changes
                                oLogoutDetails.message = oResourceBundle.getText('unsaved_data_warning_popup_message');
                                oLogoutDetails.icon = MessageBox.Icon.WARNING;
                                oLogoutDetails.messageTitle = oResourceBundle.getText("unsaved_data_warning_popup_title");
                            } else {
                                // show 'normal' logout confirmation in all other cases, also if dirty state could not be determined
                                oLogoutDetails.message = oResourceBundle.getText('signoutConfirmationMsg');
                                oLogoutDetails.icon = MessageBox.Icon.QUESTION;
                                oLogoutDetails.messageTitle = oResourceBundle.getText("signoutMsgTitle");
                            }

                            return oLogoutDetails;
                        };

                        oLogoutDetails = _getLogoutDetails(dirtyState);
                        MessageBox.show(oLogoutDetails.message, oLogoutDetails.icon,
                            oLogoutDetails.messageTitle, [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                            function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    oLoading.openLoadingScreen();
                                    oLoading.showAppInfo(resources.i18n.getText('beforeLogoutMsg'), null);
                                    sap.ushell.Container.logout();
                                }
                            }, sap.ui.core.ElementMetadata.uid("confirm"));
                    });
                    if (bShowLoadingScreen === true) {
                        oLoading.openLoadingScreen();
                        bIsLoadingScreenShown = true;
                    }
                });
        },

        _addPressHandlerToActions: function (oControl) {
            var that = this;
            if (this.aControlsWithPressHandler.indexOf(oControl.getId()) === -1) {
                this.aControlsWithPressHandler.push(oControl.getId());
                oControl.attachPress(function (oEvent) {
                    sap.ui.getCore().byId("viewPortContainer").switchState("Center");
                    if (oControl.getId() === "userSettingsBtn") {
                        var sHotkeysParam = oEvent.mParameters ? oEvent.mParameters.hotkeys: undefined ;
                        that.hotkeysParam = sHotkeysParam;
                        var oThat = that;
                            if (!oThat.getView().oSettingsDialog.getModel()) {
                                oThat.getView().oSettingsDialog.setModel(oThat.getView().getModel());
                            }
                            var fnOpenDialogAfterSwitchAnimation = function () {
                                oThat.getView().oSettingsDialog.open();
                                sap.ui.getCore().byId("viewPortContainer").detachAfterSwitchStateAnimationFinished(fnOpenDialogAfterSwitchAnimation);
                            };
                            if (oThat.hotkeysParam){
                                oThat.getView().oSettingsDialog.open();
                            } else {
                                var sCurrentShellState = oThat.oView.getModel().getProperty('/currentState/stateName');
                                if (sCurrentShellState === 'embedded' || sCurrentShellState === 'embedded-home' || sCurrentShellState === 'standalone' || sCurrentShellState === 'blank-home' || sCurrentShellState === 'blank') {
                                    oThat.getView().oSettingsDialog.open();
                                } else {
                                    sap.ui.getCore().byId("viewPortContainer").attachAfterSwitchStateAnimationFinished(fnOpenDialogAfterSwitchAnimation);
                                }
                            }
                    }
                });
            }
        },


        _getControlsWithPressHandler: function () {
            return this.aControlsWithPressHandler;
        },
        _addActionItemToOverflowSupport: function () {
            if (sap.m._overflowToolbarHelpers && sap.m._overflowToolbarHelpers.OverflowToolbarAssociativePopoverControls._mSupportedControls) {
                var mSupported = sap.m._overflowToolbarHelpers.OverflowToolbarAssociativePopoverControls._mSupportedControls;
                var oPrototypeToExtend = sap.m._overflowToolbarHelpers.OverflowToolbarAssociativePopoverControls.prototype;
                var aControlNamesToAdd = [
                    "sap.ushell.ui.launchpad.ActionItem",
                    "sap.ushell.ui.footerbar.AboutButton",
                    "sap.ushell.ui.footerbar.ContactSupportButton",
                    "sap.ushell.ui.footerbar.EndUserFeedback",
                    "sap.ushell.ui.footerbar.LogoutButton",
                    "sap.ushell.ui.footerbar.UserPreferencesButton",
                    "sap.m.Button"
                ];
                var fnCapitalize = function (sName) {
                    return sName.substring(0, 1).toUpperCase() + sName.substring(1);
                };
                var oSupports = {
                    canOverflow: true,
                    listenForEvents: ["press"],
                    noInvalidationProps: ["enabled", "type"]
                };
                var fnPreProcess = function (oControl) {
                    if (!oControl.mCustomStyleClassMap.sapUshellActionItem){
                        return;
                    }
                    if (oControl.setActionType) {
                        oControl.setActionType('standard');
                    }
                    var sType = oControl.getType();

                    if (sType !== ButtonType.Accept && sType !== ButtonType.Reject) {
                        oControl.setType(ButtonType.Transparent);
                    }

                    // when icon is available - need to indent it
                    if (oControl.getIcon()) {
                        oControl.addStyleClass("sapMOTAPButtonWithIcon");
                    } else {
                        oControl.addStyleClass("sapMOTAPButtonNoIcon");
                    }
                };

                var fnPostProcess = function (oControl) {
                    if (oControl.setActionType) {
                        oControl.setActionType('action');
                    }
                };
                aControlNamesToAdd.forEach(function (sName) {
                    mSupported[sName] = oSupports;
                    var sCap = sName.split(".").map(fnCapitalize).join("");
                    var sPreProcessPrefix = '_preProcess';
                    var sPostProcessPrefix = '_postProcess';
                    oPrototypeToExtend[sPreProcessPrefix + sCap] = fnPreProcess;
                    oPrototypeToExtend[sPostProcessPrefix + sCap] = fnPostProcess;
                });
            }
        },

        /**
         * Use to store the last visited url that was clicked form the TabBar control
         * @param {string} sUrl the url that was used in the navigation
         */
        setLastVisited: function (sUrl) {
            this.lastVisited = sUrl;
        },

        updateScrollBar: function (hash) {
            /**
             When navigating from one of the entries (recent or frequent apps) the TabBar remembers the last scroll
             position it was in.
             In case additional navigation took place (i.e the hash has changed) - we reset the TabBar control to point
             to the first entry in the Recent Activities Tab.
             */
            if (this.lastVisited && this.lastVisited != "#" + hash) {
                //Scroll to top:
                jQuery('.sapUshellViewPortLeft').scrollTop(0);

                // setting the Recent-Activity Tab as selected
                sap.ui.getCore().byId('meAreaIconTabBar').setSelectedKey("sapUshellIconTabBarrecentActivities");

                // setting first Recent-Activity item to set focus on first item again
                // otherwise every time me-area will opened there will be a scroll jump
                var oListRecent = sap.ui.getCore().byId('sapUshellActivityListrecentActivities'),
                    aListItems = oListRecent.getItems();
                if (aListItems && aListItems.length > 0) {
                    sap.ui.getCore().byId('sapUshellActivityListrecentActivities').setSelectedItem(aListItems[0], true);
                }

                // reset the lastVisited index
                this.lastVisited = null;
            }
        },

        _saveUserPrefEntries: function () {
            var aEntries = this.getView().getModel().getProperty("/userPreferences/entries");
            var resultDeferred = jQuery.Deferred();
            var whenPromise;
            var currentPromise;
            var totalPromisesCount = 0;
            var failureCount = 0;
            var successCount = 0;
            var promiseArray = [];
            var failureMsgArr = [];
            var currEntryTitle;
            var saveDoneFunc = function () {
                successCount++;
                resultDeferred.notify();
            };
            var saveFailFunc = function (err) {
                failureMsgArr.push({
                    entry: currEntryTitle,
                    message: err
                });
                failureCount++;
                resultDeferred.notify();
            };

            for (var i = 0; i < aEntries.length; i++) {
                if (aEntries[i] && aEntries[i].isDirty === true) {//only if the entry is dirty we would like to save it
                    currentPromise = aEntries[i].onSave();
                    currentPromise.done(saveDoneFunc);
                    currEntryTitle = aEntries[i].title;
                    currentPromise.fail(saveFailFunc);
                    promiseArray.push(currentPromise);//save function return jQuery Promise
                    totalPromisesCount++;
                }
            }

            whenPromise = jQuery.when.apply(null, promiseArray);

            whenPromise.done(function () {
                resultDeferred.resolve();
            });

            resultDeferred.progress(function () {
                if (failureCount > 0 && (failureCount + successCount === totalPromisesCount)) {
                    resultDeferred.reject(failureMsgArr);
                }
            });

            return resultDeferred.promise();
        },

        _saveButtonHandler: function () {
            var saveEntriesPromise;
            saveEntriesPromise = this._saveUserPrefEntries();
            var that = this;

            //in case the save button is pressed in the detailed entry mode, there is a need to update value result
            // in the model
            var isDetailedEntryMode = this.getView().getModel().getProperty("/userPreferences/isDetailedEntryMode");
            if (isDetailedEntryMode) {
                this.getView().getModel().setProperty("/userPreferences/activeEntryPath", null);
            }

            saveEntriesPromise.done(function () {
                that._showSaveMessageToast();
            });

            saveEntriesPromise.fail(function (failureMsgArr) {
                sap.ui.require(["sap/m/MessageBox"], function(MessageBox) {
                        var errMessageText;
                        var errMessageLog = "";
                        if (failureMsgArr.length === 1) {
                            errMessageText = that.translationBundle.getText("savingEntryError") + " ";
                        } else {
                            errMessageText = that.translationBundle.getText("savingEntriesError") + "\n";
                        }
                        failureMsgArr.forEach(function (errObject) {
                            errMessageText += errObject.entry + "\n";
                            errMessageLog += "Entry: " + errObject.entry + " - Error message: " + errObject.message + "\n";
                        });

                        MessageBox.show(
                            errMessageText, {
                                icon: MessageBox.Icon.ERROR,
                                title: that.translationBundle.getText("Error"),
                                actions: [MessageBox.Action.OK]
                            }
                        );

                        jQuery.sap.log.error(
                            "Failed to save the following entries",
                            errMessageLog,
                            "sap.ushell.ui.footerbar.UserPreferencesButton"
                        );
                    }
                );
            });
        },

        _showSaveMessageToast: function () {
            sap.ui.require(["sap/m/MessageToast"], function(MessageToast) {
                var message = resources.i18n.getText("savedChanges");

                MessageToast.show(message, {
                    duration: 3000,
                    width: "15em",
                    my: "center bottom",
                    at: "center bottom",
                    of: window,
                    offset: "0 -50",
                    collision: "fit fit"
                });
            });
        },

        createSaveButton: function () {
            var that = this;
            return new Button({
                id: "userSettingSaveButton",
                text: resources.i18n.getText("saveBtn"),
                press: function () {
                    that._saveButtonHandler();
                    that._handleSettingsDialogClose.apply(that);
                },
                visible: true
            });
        },

        _dialogCancelButtonHandler: function () {
            var aEntries = this.getView().getModel().getProperty("/userPreferences/entries");
            //Invoke onCancel function for each userPreferences entry
            for (var i = 0; i < aEntries.length; i++) {
                if (aEntries[i] && aEntries[i].onCancel) {
                    aEntries[i].onCancel();
                }
            }
        },

        _handleSettingsDialogClose: function () {
            var oView = this.getView(),
                oSettingsDialogContent = this.getSettingsDialogContent();
            oSettingsDialogContent.oMainApp.toMaster('userSettingMaster');
            //Fix - in phone the first selection (user account) wasn't responsive when this view was closed and re-opened because is was regarded as already selected entry in the splitApp control.
            oSettingsDialogContent.oController.oMasterEntryList.removeSelections(true);
            oView.oSettingsDialog.close();
        },

        createCancelButton: function () {
            var that = this;
            return new Button({
                id: "userSettingCancelButton",
                text: resources.i18n.getText("cancelBtn"),
                press: function () {
                    that._dialogCancelButtonHandler();
                    that._handleSettingsDialogClose.apply(that);
                },
                visible: true
            });
        },

        onExit: function () {
            this.getView().aDanglingControls.forEach(function (oControl) {
                if (oControl.destroyContent) {
                    oControl.destroyContent();
                }
                oControl.destroy();
            });
        }
    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/MeArea.view.js":function(){// ${copyright}
sap.ui.define([
    "sap/ushell/services/AppType",
    "sap/m/Button",
    "sap/m/List",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Image",
    "sap/m/Dialog",
    "sap/m/Popover",
    "sap/m/OverflowToolbar",
    "sap/m/ScrollContainer",
    "sap/ushell/resources",
    "sap/ushell/ui/launchpad/UserStatusItem",
    "sap/ushell/ui/launchpad/AccessibilityCustomData",
    "sap/m/ListSeparators"
], function (appType, Button, List, Text, VBox, HBox, Image, Dialog, Popover, OverflowToolbar, ScrollContainer, resources, UserStatusItem, AccessibilityCustomData, ListSeparators) {
    "use strict";

    /*global jQuery, sap, document, self, hasher*/
    /*jslint plusplus: true, nomen: true, vars: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.MeArea", {

        createContent: function (oController) {
            this.addStyleClass('sapUshellMeAreaView');
            this.aDanglingControls = [];

            var sUserName = sap.ushell.Container.getUser().getFullName(),
                oPopover,
                translationBundle = resources.i18n,
                oConfig = (this.getViewData() ? this.getViewData().config : {}) || {},
                sCurrentShellState = oConfig.appState,
                bCreateDetachedLogoutButton = (sCurrentShellState === 'embedded' || sCurrentShellState === 'embedded-home' || sCurrentShellState === 'standalone' || sCurrentShellState === 'blank-home'  || sCurrentShellState === 'blank'),
                aUserStatusItems,
                oService = sap.ui.core.service.ServiceFactoryRegistry.get("sap.ushell.ui5service.UserStatus");
            if (oService) {
                var oServiceInstance = oService.createInstance(),
                    fnStatusChangeHandle = function (newStatus) {
                        oServiceInstance.then(
                            function (oService) {
                                oService.setStatus(newStatus);
                                oPopover.close();
                            }
                        );
                    };
            }

            aUserStatusItems = [
                new UserStatusItem({
                    status: UserStatusItem.prototype.STATUS_ENUM.AVAILABLE,
                    id: "userStatusItem1",
                    isOpener: false,
                    press: function (oEvent) {
                        fnStatusChangeHandle(sap.ushell.ui5service.UserStatus.prototype.AvailableStatus.AVAILABLE);
                    }.bind(this)
                }).addStyleClass('sapUserStatusContainer'),
                new UserStatusItem({
                    status: UserStatusItem.prototype.STATUS_ENUM.AWAY,
                    id: "userStatusItem2",
                    isOpener: false,
                    press: function (oEvent) {
                        fnStatusChangeHandle(sap.ushell.ui5service.UserStatus.prototype.AvailableStatus.AWAY);
                    }.bind(this)
                }).addStyleClass('sapUserStatusContainer'),
                new UserStatusItem({
                    status: UserStatusItem.prototype.STATUS_ENUM.BUSY,
                    id: "userStatusItem3",
                    isOpener: false,
                    press: function (oEvent) {
                        fnStatusChangeHandle(sap.ushell.ui5service.UserStatus.prototype.AvailableStatus.BUSY);
                    }.bind(this)
                }).addStyleClass('sapUserStatusContainer'),
                new UserStatusItem({
                    status: UserStatusItem.prototype.STATUS_ENUM.APPEAR_OFFLINE,
                    id: "userStatusItem4",
                    isOpener: false,
                    press: function (oEvent) {
                        fnStatusChangeHandle(sap.ushell.ui5service.UserStatus.prototype.AvailableStatus.APPEAR_OFFLINE);
                    }.bind(this)
                }).addStyleClass('sapUserStatusContainer')

            ];

            if (!oConfig.disableSignOut) {
                aUserStatusItems.push(new UserStatusItem({
                    status: UserStatusItem.prototype.STATUS_ENUM.SIGNOUT,
                    id: "userStatusLogout",
                    isOpener: false,
                    press: [oController.logout, oController]
                }).addStyleClass('sapUserStatusSignOutContainer'));
            }

            var oUserStatusItemList = new List({
                id: "sapUshellUserStatusItemList",
                showSeparators: "None",
                items: aUserStatusItems
            });
            //"aria-labelledBy", cannot be added in the constructor
            oUserStatusItemList.addCustomData(new AccessibilityCustomData({
                key: "aria-labelledBy",
                value: "userStatusItem1",
                writeToDom: true
            }));

            oPopover = new Popover("statuses", {
                placement: sap.m.PlacementType.Bottom,
                showArrow: false,
                showHeader: false,
                content: oUserStatusItemList
            }).addStyleClass('sapUserStatusPopOver');
            oPopover.addStyleClass("sapContrastPlus");
            oPopover.setOffsetX(-3);

            aUserStatusItems = [
                new Text({text: sUserName}).addStyleClass('sapUshellMeAreaUserName')
            ];

            var statusOpener = new UserStatusItem({
                id: "userStatusOpener",
                visible: {
                    parts: ["/userStatusEnabled", "/userStatusUserEnabled"],
                    formatter: function (bStatusEnabled, bUserStatusEnabled) {
                        if (bStatusEnabled && bUserStatusEnabled) {
                            return true;
                        }
                        return false;
                    }.bind(this)
                },
                status: {
                    path: "/userStatus",
                    formatter: function (sUserStatus) {
                        return UserStatusItem.prototype.STATUS_ENUM[sUserStatus];
                    }.bind(this)
                },
                tooltip: translationBundle.getText("userStatus_tooltip"),
                image: sap.ui.core.IconPool.getIconURI("account"),
                press: function (oEvent) {
                    var oButton = sap.ui.getCore().byId(oEvent.mParameters.id);
                    if (oPopover.isOpen()) {
                        oPopover.close();
                    } else {
                        oPopover.openBy(oButton);
                    }
                }.bind(this),
                contentList: oPopover
            }).addStyleClass('sapUserStatusOpener');

            statusOpener.addCustomData(new AccessibilityCustomData({
                key: "tabindex",
                value: "0",
                writeToDom: true
            }));
            //"aria-label", cannot be added in the constructor
            statusOpener.addCustomData(new AccessibilityCustomData({
                key: "aria-label",
                value: resources.i18n.getText("OnlineStatus") + " " + translationBundle.getText("userStatus_tooltip"),
                writeToDom: true
            }));
            //"role", cannot be added in the constructor
            statusOpener.addCustomData(new AccessibilityCustomData({
                key: "role",
                value: "listbox",
                writeToDom: true
            }));
            var listStatusOpener = new List({
                items:[statusOpener],
                backgroundDesign: sap.m.BackgroundDesign.Transparent
            });
            aUserStatusItems.push(listStatusOpener);

            if (!oConfig.disableSignOut) {
                var oLogoutBtn;
                if (!bCreateDetachedLogoutButton) {
                    oLogoutBtn = new Button("logoutBtn", {
                        visible: {
                            parts: ["/userStatusEnabled", "/userStatusUserEnabled"],
                            formatter: function (bStatusEnabled, bUserStatusEnabled) {
                                if (bStatusEnabled && bUserStatusEnabled) {
                                    return false;
                                }
                                return true;
                            }.bind(this)
                        },
                        type: sap.m.ButtonType.Transparent,
                        icon: 'sap-icon://log',
                        text: resources.i18n.getText("signoutBtn_title"),
                        press: [oController.logout, oController]
                    });
                    aUserStatusItems.push(oLogoutBtn);
                } else {
                    oLogoutBtn = new sap.ushell.ui.launchpad.ActionItem("logoutBtn", {
                        visible: true,
                        type: sap.m.ButtonType.Transparent,
                        icon: 'sap-icon://log',
                        text: resources.i18n.getText("signoutBtn_title"),
                        press: [oController.logout, oController]
                    });
                }
            }

            var oUserName = new VBox({
                items: [aUserStatusItems]
            }).addStyleClass("sapUshellUserArea");

            var oUser = sap.ushell.Container.getUser(),
                userImage = oUser.getImage(),
                userBoxItem;

            if (!userImage) {
                userBoxItem = this.createPlaceHolderIcon();
            } else {
                userBoxItem = this.createNewImage();
            }

            userBoxItem.addStyleClass("sapUshellMeAreaUserImage");

            //Me Area Icon (big icon above recent activity)
            var oUserHBox = new HBox({
                items: [
                    userBoxItem,
                    oUserName
                ]
            });

            oUser.attachOnSetImage(this._updateUserImage.bind({
                origScope: this,
                oUserHBox: oUserHBox,
                userBoxItem: userBoxItem
            }));

            oUserHBox.addStyleClass('sapUshellMeAreaUserInfo');
            oUserHBox.addStyleClass('sapContrastPlus');
            var saveButton = oController.createSaveButton(),
                cancelButton = oController.createCancelButton();
            this.oSettingsDialog = new Dialog({
                id: "userSettingsDialog",
                showHeader: false,
                content: null,
                buttons: [saveButton, cancelButton],
                afterClose: function () {
                    sap.ushell.Container.getUser().resetChangedProperties();
                },
                stretch: sap.ui.Device.system.phone
            }).addStyleClass("sapUshellUserSetting");

            this.oSettingsDialog.addContent(oController.getSettingsDialogContent());
            // support for exit settings by pressing on ESC
            // in this case its equals to press cancel
            this.oSettingsDialog.addEventDelegate({
                onkeydown: function (oEvent) {
                    if (oEvent.keyCode === 27) {
                        if (oController &&  typeof oController._dialogCancelButtonHandler === "function"){
                            oController._dialogCancelButtonHandler();
                        }
                    }
                }.bind(this)
            });
            this.aDanglingControls.push(cancelButton, saveButton, this.oSettingsDialog);
            oUserHBox.addEventDelegate({
                onsapskipback: function (oEvent) {
                    oEvent.preventDefault();
                    sap.ushell.renderers.fiori2.AccessKeysHandler.setIsFocusHandledByAnotherHandler(true);
                    sap.ushell.renderers.fiori2.AccessKeysHandler.sendFocusBackToShell(oEvent);
                },
                onsaptabprevious: function (oEvent) {
                    oEvent.preventDefault();
                    sap.ushell.renderers.fiori2.AccessKeysHandler.setIsFocusHandledByAnotherHandler(true);
                    sap.ushell.renderers.fiori2.AccessKeysHandler.sendFocusBackToShell(oEvent);
                }
            });

            var oActionsHBox = new OverflowToolbar({
                id: "overflowActions",
                design: sap.m.ToolbarDesign.Transparent,
                content: {
                    path: "/currentState/actions",
                    factory: function (sId, oContext) {
                        var oCtrl = sap.ui.getCore().byId(oContext.getObject());
                        if (oCtrl) {
                            if (oCtrl.setActionType) {
                                oCtrl.setActionType("action");
                                oCtrl.addStyleClass('sapContrastPlus');
                            }
                            /*since the factory can be called many times,
                             we need to add the press handler only once.
                             the method below makes sure it is added only once per control
                             the press handler is attached to all actions, and switches the
                             viewport state to "Center" as requested by UX*/
                            oController._addPressHandlerToActions(oCtrl);
                        }
                        return oCtrl;
                    }
                }
            });

            //since we customized the control items, we need to override this priveate method, as suggested in
            //internal ticket #1670374902 by UI5 colleague Vladislav Tasev.
            oActionsHBox._getOverflowButtonSize = function () {
                // item width is 4.65rem + 0.25rem left margin + 0.25rem right margin => 5.15rem=82.4px
                return 82.4;
            };
            //"aria-label"
            oActionsHBox.addCustomData(new AccessibilityCustomData({
                key: "aria-label",
                value: resources.i18n.getText("overflowActions_AriaLabel"),
                writeToDom: true
            }));

            if (oActionsHBox._getOverflowButton) {
                var overflowButton = oActionsHBox._getOverflowButton();
                if (overflowButton) {
                    var orig = overflowButton.onAfterRendering;
                    overflowButton.onAfterRendering = function () {
                        if (orig) {
                            orig.apply(this, arguments);
                        }
                        this.addStyleClass('sapUshellActionItem').addStyleClass('sapContrastPlus');
                        this.setText(resources.i18n.getText('meAreaMoreActions'));
                    };
                }
            }

            oActionsHBox.updateAggregation = function (sName) {
                /*jslint nomen: true */
                var oBindingInfo = this.mBindingInfos[sName],
                    oAggregationInfo = this.getMetadata().getJSONKeys()[sName],
                    oClone;

                jQuery.each(this[oAggregationInfo._sGetter](), jQuery.proxy(function (i, v) {
                    this[oAggregationInfo._sRemoveMutator](v);
                }, this));
                jQuery.each(oBindingInfo.binding.getContexts(), jQuery.proxy(function (i, v) {
                    oClone = oBindingInfo.factory(this.getId() + "-" + i, v) ? oBindingInfo.factory(this.getId() + "-" + i, v).setBindingContext(v, oBindingInfo.model) : "";
                    this[oAggregationInfo._sMutator](oClone);
                }, this));
            };

            var oMeAreaContentVBox = new VBox("sapUshellMeAreaContent", {});
            this.actionBox = oActionsHBox;
            oMeAreaContentVBox.addItem(oUserHBox);
            oMeAreaContentVBox.addItem(oActionsHBox);

            if (oConfig.enableRecentActivity) {
                var bShowRecentActivity = sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty('/currentState/showRecentActivity');
                if (bShowRecentActivity === true) {
                    var oCreateIconTabBarPromise = this.createIconTabBar(oController);
                    oCreateIconTabBarPromise.done(function (oIconTabBar) {
                        oMeAreaContentVBox.addItem(oIconTabBar);
                        // if the user disable recent activities feature the container will be hidden.
                        var bIsEnableTrackingActivity = sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty("/enableTrackingActivity");
                        oIconTabBar.setVisible(bIsEnableTrackingActivity);
                        //this.handleAccessabilityWhenRecentActivitesChange(oActionsHBox,bIsEnableTrackingActivity);
                    });
                }
            }
            this.actionBox.addEventDelegate({
                onsaptabnext: function (oEvent) {
                    var oOriginalElement = oEvent.originalEvent,
                        oSourceElement = oOriginalElement.srcElement,
                        lastElementId = jQuery('.sapUshellActionItem:last')[0].id,
                        isLastElement,isIconTabBarVisible;
                    isIconTabBarVisible = sap.ui.getCore().byId('meAreaIconTabBar').getVisible();
                    // Check if the element currently in focus is the last action item, if yes go to top
                    isLastElement = lastElementId === oSourceElement.id;
                    // if the iconbar doesn't visible forward the focus
                    if (isLastElement === true && !isIconTabBarVisible) {
                        oEvent.preventDefault();
                        sap.ushell.renderers.fiori2.AccessKeysHandler.setIsFocusHandledByAnotherHandler(true);
                        sap.ushell.renderers.fiori2.AccessKeysHandler.sendFocusBackToShell(oEvent);
                    }
                },
                // When using F6 - the focus should go from the ActionsHBox's header straight to the MeArea header icon
                onsapskipforward: function (oEvent) {
                    var isIconTabBarVisible= sap.ui.getCore().byId('meAreaIconTabBar').getVisible();
                    // if the iconbar doesn't visible forward the focus
                    if (!isIconTabBarVisible) {
                        oEvent.preventDefault();
                        sap.ushell.renderers.fiori2.AccessKeysHandler.setIsFocusHandledByAnotherHandler(true);
                        sap.ushell.renderers.fiori2.AccessKeysHandler.sendFocusBackToShell(oEvent);
                    }
                }
            });


            return new ScrollContainer({
                vertical: true,
                horizontal: false,
                height: "100%",
                content: oMeAreaContentVBox
            });
        },

        createIconTabBar: function (oController) {
            var oResultDeferred = new jQuery.Deferred(),
                that = this,
                oIconTabBar,
                origTabBarAfterRendering,
                oTabBarHeader;

            sap.ui.require(['sap/m/IconTabBar',
                            'sap/m/CustomListItem',
                            'sap/m/IconTabFilter',
                            'sap/m/Text',
                            'sap/m/HBox'],
                function (IconTabBar, CustomListItem, IconTabFilter, Text, HBox) {

                    oIconTabBar = new IconTabBar('meAreaIconTabBar', {
                        backgroundDesign: sap.m.BackgroundDesign.Transparent,
                        expandable: false,
                        items: [that.createIconTab("recentActivities", true, oController, CustomListItem, IconTabFilter, Text, HBox), //Recent activities show timestamp in info property
                                that.createIconTab("frequentActivities", false, oController, CustomListItem, IconTabFilter, Text, HBox)] //Frequent activities have no info
                    }).addStyleClass('sapUshellMeAreaTabBar');

                    oIconTabBar.addEventDelegate({
                        onsaptabnext: function (oEvent) {
                            var oOriginalElement = oEvent.originalEvent,
                                oSourceElement = oOriginalElement.srcElement,
                                aClassList = oSourceElement.classList,
                                bIncludesClass;

                            // Check if the element currently in focus is an actual item in a list such as the Recently Used list
                            bIncludesClass = jQuery.inArray('sapUshellMeAreaActivityItem', aClassList) > -1;
                            if (bIncludesClass === true) {
                                oEvent.preventDefault();
                                sap.ushell.renderers.fiori2.AccessKeysHandler.setIsFocusHandledByAnotherHandler(true);
                                sap.ushell.renderers.fiori2.AccessKeysHandler.sendFocusBackToShell(oEvent);
                            }
                        },
                        // When using F6 - the focus should go from the IconTabBar's header (i.e. the "Recently Used" text) straight to the MeArea header icon
                        onsapskipforward: function (oEvent) {
                            oEvent.preventDefault();
                            sap.ushell.renderers.fiori2.AccessKeysHandler.setIsFocusHandledByAnotherHandler(true);
                            sap.ushell.renderers.fiori2.AccessKeysHandler.sendFocusBackToShell(oEvent);
                        }
                    });

                    origTabBarAfterRendering = oIconTabBar.onAfterRendering;
                    oIconTabBar.onAfterRendering = function () {
                        if (origTabBarAfterRendering) {
                            origTabBarAfterRendering.apply(that, arguments);
                        }
                        oTabBarHeader = sap.ui.getCore().byId('meAreaIconTabBar--header');
                        if (oTabBarHeader) {
                            oTabBarHeader.addStyleClass('sapContrastPlus');
                            oTabBarHeader.addStyleClass('sapUshellTabBarHeader');
                        }
                    };
                    oResultDeferred.resolve(oIconTabBar);
            });
            return oResultDeferred.promise();
        },

        //This function creates each tab in the IconTabBar.
        //The parameter iconTabName will be used for IDs, for the path in the model and to get the
        //strings from the resource bundle (both the tab and the no-data strings). So they all have to match.
        //showInfo will control if to use the info property to present timestamp.
        createIconTab: function (iconTabName, showInfo, oController, CustomListItem, IconTabFilter, Text, HBox) {
            var oActivityTemplateFunction,
                sIcon,
                sTitle,
                sDescription,
                oLi,
                oIconTabFilter,
                oActivityList,
                oModel,
                sPath,
                oViewPort;

            oActivityTemplateFunction = function (sId, oContext) {
                sIcon = oContext.getProperty("icon");
                sTitle = oContext.getProperty("title");

                sDescription = appType.getDisplayName(
                    oContext.getProperty("appType"));

                var oTitle = new Text ({
                        text: sTitle
                    }).addStyleClass('sapUshellMeAreaActivityItemTitle'),

                    oIcon = new sap.ui.core.Icon ({
                        src: sIcon
                    }).addStyleClass('sapUshellMeAreaActivityItemIcon'),

                    oDescription = new Text ({
                        text: sDescription
                    }).addStyleClass('sapUshellMeAreaActivityItemDescription'),

                    oInfo = new Text ({
                        text: showInfo ? oContext.getProperty("timestamp") : ""
                    }).addStyleClass('sapUshellMeAreaActivityItemInfo'),

                    oHBox = new HBox ({
                        items: sIcon ? [oIcon, oDescription] : [oDescription],
                        justifyContent: "SpaceBetween"
                    }),

                    oContainer = new HBox ({
                        items: showInfo ? [oHBox, oInfo] : [oHBox],
                        justifyContent: "SpaceBetween"
                    }).addStyleClass('sapUshellMeAreaActivityItemContainer');

                oLi = new CustomListItem({
                    content: [oTitle, oContainer],
                    type: sap.m.ListType.Active
                }).addStyleClass('sapUshellMeAreaActivityItem');

                //"aria-label", cannot be added in the constructor
                oLi.addCustomData(new AccessibilityCustomData({
                    key: "aria-describedby",
                    value: oIconTabFilter.getId(),
                    writeToDom: true
                }));

                return oLi;
            };

            oIconTabFilter = new IconTabFilter({
                id: "sapUshellIconTabBar" + iconTabName,
                text: resources.i18n.getText(iconTabName)
            });

            oActivityList = new List({
                id: "sapUshellActivityList" + iconTabName,
                showSeparators: ListSeparators.All,
                items: {
                    path: "meAreaModel>/apps/" + iconTabName,
                    factory: oActivityTemplateFunction.bind(this)
                },
                noDataText: resources.i18n.getText(iconTabName + 'NoDataText'),
                //mode: sap.m.ListMode.SingleSelectMaster,
                itemPress: function (oEvent) {
                    oModel = this.getModel('meAreaModel');
                    oViewPort = sap.ui.getCore().byId("viewPortContainer");

                    if (oViewPort) {//added in order to make loading dialog open after view switch
                        oViewPort.switchState("Center");
                    }

                    sPath = oEvent.getParameter('listItem').getBindingContextPath();
                    oController.setLastVisited(oModel.getProperty(sPath).url);
                    setTimeout(function () {//timeOut is needed in cases in which the app loads fast. This way we get smoother navigation
                        var oRecentEntry = {},
                            oRenderer = sap.ushell.Container.getRenderer("fiori2");
                        
                        if (oModel.getProperty(sPath).url[0] === '#') {
                            hasher.setHash(oModel.getProperty(sPath).url);
                        } else {
                            // add the URL to recent activity log (required to log URLs that are launched from the recent activity list)
                            oRecentEntry.title = oModel.getProperty(sPath).title;
                            oRecentEntry.appType = "App";
                            oRecentEntry.url = oModel.getProperty(sPath).url;
                            oRecentEntry.appId = oModel.getProperty(sPath).url;
                            oRenderer.logRecentActivity(oRecentEntry);

                            window.open(oModel.getProperty(sPath).url, '_blank');
                        }
                    }, 200);
                }
            });
            oIconTabFilter.addContent(oActivityList);
            return oIconTabFilter;
        },

        onViewStateShow: function () {
            this.getController().refreshRecentActivities();
            this.getController().refreshFrequentActivities();
            if (this.actionBox) {
                this.actionBox.updateAggregation("content");
            }
            this.getController().updateScrollBar(hasher.getHash());
        },

        createNewImage: function () {
            return  new Image({
                src: '{/userImage/personPlaceHolder}'
            });
        },

        createPlaceHolderIcon: function () {
            return  new sap.ui.core.Icon({
                src: '{/userImage/personPlaceHolder}',
                size: '4rem'
            });
        },

        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.MeArea";
        },

        _updateUserImage: function (oData) {
            var sUserImageUri = (typeof oData) === 'string' ? oData : oData.mParameters;
            this.oUserHBox.removeItem(this.userBoxItem);
            if ((typeof sUserImageUri ) === 'string'){
                this.userBoxItem = this.origScope.createNewImage();
            } else {
                this.userBoxItem = this.origScope.createPlaceHolderIcon();
            }
           if (this.oUserHBox){
               this.oUserHBox.insertItem( this.userBoxItem , 0);
               if (this.userBoxItem){
                   this.userBoxItem.addStyleClass("sapUshellMeAreaUserImage");
               }
           }
        }

    });

}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/ThemeSelector.controller.js":function(){// ${copyright}

sap.ui.define(function () {
    "use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    sap.ui.controller("sap.ushell.components.shell.MeArea.ThemeSelector", {
        onInit: function () {
            try {
                this.userInfoService = sap.ushell.Container.getService("UserInfo");
                this.oUser = this.userInfoService.getUser();
            } catch (e) {
                jQuery.sap.log.error("Getting UserInfo service failed.");
                this.oUser = sap.ushell.Container.getUser();
            }


            this.currentThemeId = this.oUser.getTheme();
            this.origThemeId = this.currentThemeId;
            this.aThemeList = null;
            this.isContentLoaded = false;
            this.aSapThemeMap = {
                "base": "sapUshellBaseIconStyle",
                "sap_bluecrystal": "sapUshellBlueCrystalIconStyle",
                "sap_belize_hcb": "sapUshellHCBIconStyle",
                "sap_belize_hcw": "sapUshellHCWIconStyle",
                "sap_belize": "sapUshellBelizeIconStyle",
                "sap_belize_plus": "sapUshellPlusIconStyle"
            };
        },
        getConfigurationModel: function () {
            var oConfModel = new sap.ui.model.json.JSONModel({});
            var animationModeOnModel = this.getView().getModel() ? this.getView().getModel().getProperty("/animationMode") : undefined ;
            this.originalAnimationModeKey = animationModeOnModel ? animationModeOnModel : "full";
            this.currentAnimationModeKey = this.originalAnimationModeKey;

            oConfModel.setData({
                isRTL: sap.ui.getCore().getConfiguration().getRTL(),
                sapUiContentIconColor: sap.ui.core.theming.Parameters.get('sapUiContentIconColor'),
                isContentDensitySwitchEnable: this.isContentDensitySwitchEnable(),
                flexAlignItems: 'Center',
                textAlign: sap.ui.Device.system.phone ? 'Left' : 'Right',
                textDirection: 'Row',
                labelWidth: 'auto',
                isCozyContentMode: this.isCozyContentMode(),



                animationMode: this.currentAnimationModeKey
            });
            return oConfModel;
        },
        _getIsChangeThemePermitted: function () {
            return this.oUser.isSetThemePermitted();
        },
        onAfterRendering: function () {
            var oList = sap.ui.getCore().byId("userPrefThemeSelector--themeList"),
                items = oList.getItems(),
                oIcon,
                sThemeId,
                that = this;

            oList.toggleStyleClass("sapUshellThemeListDisabled", !this.isListActive());
            items.forEach(function (oListItem) {
                sThemeId = oListItem.getCustomData()[0].getValue();
                oIcon = oListItem.getContent()[0].getItems()[0].getItems()[0];
                if (!that.isListActive()) {
                    oListItem.isSelectable = function () {
                        return false;
                    };
                }
                if (sThemeId === that.currentThemeId) {
                    oListItem.setSelected(true);
                    if (!that.isListActive()) {
                        oListItem.toggleStyleClass("sapUshellThemeListItemSelected", true);
                    }
                } else {
                    oListItem.setSelected(false);
                }

                oIcon.addStyleClass(that.aSapThemeMap[sThemeId]);
                oIcon.toggleStyleClass("sapUshellHCBIconStyleOnHCB", sThemeId === that.currentThemeId && sThemeId === "sap_belize_hcb");
                oIcon.toggleStyleClass("sapUshellHCWIconStyleOnHCW", that.currentThemeId !== "sap_belize_hcb" && sThemeId === "sap_belize_hcw");
            });
            var contentDensitySwitch = sap.ui.getCore().byId("userPrefThemeSelector--contentDensitySwitch");
            if (contentDensitySwitch) {
                contentDensitySwitch.setState(this.currentContentDensity === "cozy");
                contentDensitySwitch.setEnabled(this.isContentDensitySwitchEnable());
            }
            //Add role 'list' to avoid screen-readres 'table' anouncment.
            jQuery('.sapUshellAppearanceTable > table').attr('role', 'list');
        },
        getContent: function () {
            var that = this;
            var deferred = jQuery.Deferred();
            var oResourceModel = sap.ushell.resources.getTranslationModel();
            this.getView().setModel(oResourceModel, "i18n");
            this.getView().setModel(this.getConfigurationModel(), "config");

            if (this.isContentDensitySwitchEnable()) {
                this.origContentDensity = this.currentContentDensity;
                if (this.oUser.getContentDensity()) {
                    this.currentContentDensity = this.oUser.getContentDensity();
                } else {
                    this.currentContentDensity = "cozy";
                }
            }
            if (this.isContentLoaded === true) {
                deferred.resolve(this.getView());
            } else {
                var dfdThemeList = this._getThemeList();
                dfdThemeList.done(function (aThemeList) {
                    if (aThemeList.length > 0) {
                        // Sort the array of themes according to theme name
                        aThemeList.sort(function (theme1, theme2) {
                            var theme1Name = theme1.name,
                                theme2Name = theme2.name;
                            if (theme1Name < theme2Name) { //sort string ascending
                                return -1;
                            }
                            if (theme1Name > theme2Name) {
                                return 1;
                            }
                            return 0; //default return value (no sorting)
                        });
                        //set theme selection
                        for (var i = 0; i < aThemeList.length; i++) {
                            if (aThemeList[i].id == that.currentThemeId) {
                                aThemeList[i].isSelected = true;
                            } else {
                                aThemeList[i].isSelected = false;
                            }
                        }
                        that.getView().getModel().setProperty("/options", aThemeList);
                        deferred.resolve(that.getView());
                    } else {
                        deferred.reject();
                    }
                });

                dfdThemeList.fail(function () {
                    deferred.reject();
                });
            }

            return deferred.promise();
        },

        getValue: function () {
            var deferred = jQuery.Deferred();
            var themeListPromise = this._getThemeList();
            var that = this;
            var themeName;

            themeListPromise.done(function (aThemeList) {
                that.aThemeList = aThemeList;
                themeName = that._getThemeNameById(that.currentThemeId);
                deferred.resolve(themeName);
            });

            themeListPromise.fail(function (sErrorMessage) {
                deferred.reject(sErrorMessage);
            });

            return deferred.promise();
        },

        onCancel: function () {
            this.currentThemeId = this.oUser.getTheme();
            if (this.isContentDensitySwitchEnable()) {
                this.currentContentDensity = this.oUser.getContentDensity();
            }
            this.currentAnimationModeKey = this.originalAnimationModeKey;
            var animationModeCombo = sap.ui.getCore().byId("userPrefThemeSelector--animationModeCombo");
            if (animationModeCombo) {
                animationModeCombo.setSelectedKey(this.originalAnimationModeKey);
            }
        },

        onSave: function () {
            var oResultDeferred = jQuery.Deferred(),
                oWhenPromise,
                aPromiseArray = [],
                iTotalPromisesCount = 0,
                iSuccessCount = 0,
                iFailureCount = 0,
                aFailureMsgArr = [],
                that= this,
                saveDoneFunc = function () {
                    iSuccessCount++;
                    oResultDeferred.notify();
                },
                saveDoneAnimationFunc = function () {
                    iSuccessCount++;
                    oResultDeferred.notify();
                    that.getView().getModel().setProperty("/animationMode", that.currentAnimationModeKey);
                    that.originalAnimationModeKey = that.currentAnimationModeKey;
                },
                saveFailFunc = function (err) {
                    aFailureMsgArr.push({
                        entry: "currEntryTitle",
                        message: err
                    });
                    iFailureCount++;
                    oResultDeferred.notify();
                };

            var oThmemePromise = this.onSaveThemes();
            oThmemePromise.done(saveDoneFunc);
            oThmemePromise.fail(saveFailFunc);
            aPromiseArray.push(oThmemePromise);

            if (this.currentAnimationModeKey !== this.originalAnimationModeKey) {
                var oAnimationModePromise = this.writeUserAnimationModeToPersonalization(this.currentAnimationModeKey);
                oAnimationModePromise.done(saveDoneAnimationFunc);
                oAnimationModePromise.fail(saveFailFunc);
                aPromiseArray.push(oAnimationModePromise);
            }
            if (this.isContentDensitySwitchEnable()) {
                var oContentDensityPromise = this.onSaveContentDensity();
                oContentDensityPromise.done(saveDoneFunc);
                oContentDensityPromise.fail(saveFailFunc);
                aPromiseArray.push(oContentDensityPromise);
            }

            oWhenPromise = jQuery.when.apply(null, aPromiseArray);

            oWhenPromise.done(function () {
                oResultDeferred.resolve();
            });

            oResultDeferred.progress(function () {
                if (iFailureCount > 0 && (iFailureCount + iSuccessCount === iTotalPromisesCount)) {
                    oResultDeferred.reject("At least one save action failed");
                }
            });

            return oResultDeferred.promise();
        },
        onSaveThemes: function () {
            var deferred = jQuery.Deferred();
            var oUserPreferencesPromise;

            if (this.oUser.getTheme() != this.currentThemeId && this.isListActive()) {//only if there was a change we would like to save it
                // Apply the selected theme
                if (this.currentThemeId) {
                    this.oUser.setTheme(this.currentThemeId);

                    oUserPreferencesPromise = this.userInfoService.updateUserPreferences(this.oUser);

                    oUserPreferencesPromise.done(function () {
                        this.origThemeId = this.currentThemeId;
                        this.oUser.resetChangedProperties();
                        deferred.resolve();
                    }.bind(this));

                    oUserPreferencesPromise.fail(function (sErrorMessage) {
                        // Apply the previous theme to the user
                        this.oUser.setTheme(this.origThemeId);
                        this.oUser.resetChangedProperties();
                        this.currentThemeId = this.origThemeId;

                        jQuery.sap.log.error(sErrorMessage);
                        deferred.reject(sErrorMessage);
                    }.bind(this));
                } else {
                    deferred.reject("Could not find theme: " + this.currentThemeId);
                }
            } else {
                deferred.resolve();//No theme change, do nothing
            }

            return deferred.promise();
        },

        _getThemeList: function () {
            var deferred = jQuery.Deferred(),
                that = this;

            if (!this.aThemeList) {
                var getThemesPromise = this.userInfoService.getThemeList();

                getThemesPromise.done(function (oData) {
                    that.aThemeList = oData.options;
                    if (that._getIsChangeThemePermitted() == false) {
                        that.aThemeList = [
                            {
                                id: that.currentThemeId,
                                name: that._getThemeNameById(that.currentThemeId)
                            }
                        ];
                    }

                    deferred.resolve(that.aThemeList);
                });

                getThemesPromise.fail(function () {
                    deferred.reject("Failed to load theme list.");
                });
            } else {
                deferred.resolve(this.aThemeList);
            }

            return deferred.promise();
        },

        getCurrentThemeId: function () {
            return this.currentThemeId;
        },

        setCurrentThemeId: function (newThemeId) {
            this.currentThemeId = newThemeId;
        },

        _getThemeNameById: function (themeId) {
            if (this.aThemeList) {
                for (var i = 0; i < this.aThemeList.length; i++) {
                    if (this.aThemeList[i].id == themeId) {
                        return this.aThemeList[i].name;
                    }
                }
            }
            //fallback in case relevant theme not found
            return themeId;
        },
        onSaveContentDensity: function () {
            var deferred = jQuery.Deferred();
            var oUserPreferencesPromise;

            if (this.oUser.getContentDensity() != this.currentContentDensity && this.isContentDensitySwitchEnable()) {//only if there was a change we would like to save it
                // Apply the selected mode
                if (this.currentContentDensity) {
                    this.oUser.setContentDensity(this.currentContentDensity);
                    oUserPreferencesPromise = this.userInfoService.updateUserPreferences(this.oUser);
                    oUserPreferencesPromise.done(function () {
                        this.oUser.resetChangedProperties();
                        this.origContentDensity = this.currentContentDensity;
                        sap.ui.getCore().getEventBus().publish("launchpad", "toggleContentDensity", {contentDensity: this.currentContentDensity});
                        deferred.resolve();
                    }.bind(this));

                    oUserPreferencesPromise.fail(function (sErrorMessage) {
                        // Apply the previous display density to the user
                        this.oUser.setContentDensity(this.origContentDensity);
                        this.oUser.resetChangedProperties();
                        this.currentContentDensity = this.origContentDensity;
                        jQuery.sap.log.error(sErrorMessage);

                        deferred.reject(sErrorMessage);
                    }.bind(this));
                } else {
                    deferred.reject("Could not find mode: " + this.currentContentDensity);
                }
            } else {
                deferred.resolve();//No mode change, do nothing
            }

            return deferred.promise();
        },

        getCurrentContentDensity: function () {
            return this.currentContentDensity;
        },

        isCozyContentMode: function () {
            return jQuery("body.sapUiSizeCozy").length ? true : false;

        },

        setCurrentContentDensity: function (e) {
            var newContentDensityId = e.getSource().getState() ? "cozy" : "compact";
            this.currentContentDensity = newContentDensityId;

        },
        setCurrentAnimationMode: function (e) {
            var newAnimationModeKey = e.getSource().getSelectedKey();
            this.currentAnimationModeKey = newAnimationModeKey;

        },
        getIconFormatter: function (themeId) {
            if (this.aSapThemeMap[themeId]) {
                return "";
            } else {
                return "sap-icon://palette";
            }
        },
        onSelectHandler: function (oEvent) {
            var oItem = oEvent.getParameters().listItem;
            this.setCurrentThemeId(oItem.getBindingContext().getProperty("id"));

        },
        isContentDensitySwitchEnable: function () {
            return (sap.ui.Device.system.combi && this.getView().getModel().getProperty("/contentDensity") && this.oUser.isSetContentDensityPermitted()) || false;
        },
        isListActive: function () {
            return this.getView().getModel().getProperty("/setTheme");
        },
        getUserStatusSetting: function () {
            var personalizer = this._getUserSettingsPersonalizer();
            return personalizer.getPersData();
        },
        writeUserAnimationModeToPersonalization: function (oUserAnimationMode) {
            var oDeferred,
                oPromise;

            try {
                oPromise = this.getPersonalizer().setPersData(oUserAnimationMode);
            } catch (err) {
                jQuery.sap.log.error("Personalization service does not work:");
                jQuery.sap.log.error(err.name + ": " + err.message);
                oDeferred = new jQuery.Deferred();
                oDeferred.reject(err);
                oPromise = oDeferred.promise();
            }
            return oPromise;
        },
        getPersonalizer: function () {
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
                container: "flp.launchpad.animation.mode",
                item: "animationMode"
            };

            this.oPersonalizer = oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);
            return this.oPersonalizer;
        }
    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/ThemeSelector.view.xml":'<View\r\n        controllerName="sap.ushell.components.shell.MeArea.ThemeSelector"\r\n        height="100%"\r\n        width="100%"\r\n        xmlns="sap.uxap"\r\n        xmlns:t="sap.ui.table"\r\n        xmlns:m="sap.m"\r\n        xmlns:core="sap.ui.core">\r\n\r\n    <ObjectPageLayout id="ObjectPageLayout" enableLazyLoading="false" subSectionLayout="3"\r\n                      useTwoColumnsForLargeScreen="false">\r\n        <sections>\r\n            <ObjectPageSection title="{i18n>AppearanceThemeMenu}">\r\n                <subSections>\r\n                    <ObjectPageSubSection title="{i18n>AppearanceThemeMenu}" class="sapUshellAppearanceSubSectionList">\r\n                        <blocks>\r\n                            <m:List items="{path: \'/options\'}"\r\n                                    includeItemInSelection="true"\r\n                                    mode="SingleSelectMaster"\r\n                                    selectionChange="onSelectHandler"\r\n                                    id="themeList"\r\n                            >\r\n\r\n                                <m:items>\r\n                                    <m:CustomListItem selected="{isSelected}" class="sapUshellAppearanceCustomListItem">\r\n                                        <m:customData>\r\n                                            <core:CustomData key="themeid" value="{id}" writeToDom="true"/>\r\n                                        </m:customData>\r\n                                        <m:HBox>\r\n                                            <m:HBox class="sapUshellAppearanceItemViewLeft">\r\n                                                <core:Icon src="{parts:[{path:\'id\'}], formatter:\'.getIconFormatter\'}"\r\n                                                           color="{config>/sapUiContentIconColor}"\r\n                                                           size="1.75rem"\r\n                                                           class="sapUshellAppearanceIcon"\r\n                                                >\r\n                                                </core:Icon>\r\n                                                <m:Text text="{name}" class="sapUshellAppearanceItemText">\r\n                                                    <m:layoutData>\r\n                                                        <m:FlexItemData styleClass="sapUshellAppearanceFlexItemText"/>\r\n                                                    </m:layoutData>\r\n                                                </m:Text>\r\n                                            </m:HBox>\r\n                                            <m:HBox class="sapUshellAppearanceItemViewRight">\r\n                                                <core:Icon src="sap-icon://sys-enter-2"\r\n                                                           visible="{isSelected}"\r\n                                                           color="{config>/sapUiContentIconColor}"\r\n                                                           size="1.375rem"/>\r\n                                            </m:HBox>\r\n\r\n                                        </m:HBox>\r\n                                    </m:CustomListItem>\r\n                                </m:items>\r\n                            </m:List>\r\n                        </blocks>\r\n                    </ObjectPageSubSection>\r\n                </subSections>\r\n            </ObjectPageSection>\r\n\r\n            <ObjectPageSection title="{i18n>AppearanceLayoutAndBehaviorMenu}"\r\n                               class="sapUshellAppearanceDisplaySettingSection">\r\n\r\n                <subSections>\r\n                    <ObjectPageSubSection title="{i18n>AppearanceLayoutAndBehaviorMenu}">\r\n                        <blocks>\r\n                            <m:Table class="sapUshellAppearanceTable" showSeparators="None">\r\n                              <m:columns>\r\n                                <m:Column hAlign="End" vAlign="Top"></m:Column>\r\n                                <m:Column></m:Column>\r\n                            </m:columns>\r\n                            <m:items>\r\n                               <m:ColumnListItem>\r\n                                   <m:cells>\r\n                                       <m:Label text="{i18n>AppearanceContentDensityLabel}:"\r\n                                                class="sapUshellAppearanceLabel"\r\n                                                width="{config>/labelWidth}"\r\n                                                textAlign="{config>/textAlign}">\r\n                                       </m:Label>\r\n                                       <m:VBox alignItems="baseline" class="sapUshellAppearanceContentDensityText">\r\n                                           <m:Switch type="sap.m.SwitchType.Default" id="contentDensitySwitch"\r\n                                                     class="sapUshellAppearanceSwitchButton"\r\n                                                     tooltip="{i18n>AppearanceContentDensityTooltip}"\r\n                                                     change="setCurrentContentDensity"\r\n                                                     state="{config>/isCozyContentMode}"\r\n                                                     enabled="{config>/isContentDensitySwitchEnable}"\r\n                                                     ariaLabelledBy="contentDensitySwitch"/>\r\n                                           <m:Text text="{i18n>appearanceCompactCozyDescriptionText}"\r\n                                                   class="sapUshellFlpSettingsDescription"/>\r\n                                       </m:VBox>\r\n                                   </m:cells>\r\n                               </m:ColumnListItem>\r\n                               <m:ColumnListItem>\r\n                                   <m:cells>\r\n                                       <m:Label text="{i18n>AppearanceAnimationLabel}:"\r\n                                                class="sapUshellAppearanceLabel"\r\n                                                width="{config>/labelWidth}"\r\n                                                textAlign="{config>/textAlign}"\r\n                                                id="sapUshellAppearanceAnimationLabel">\r\n                                       </m:Label>\r\n                                       <m:VBox class="sapUshellAppearanceAnimationText">\r\n                                           <m:Select type="sap.m.SwitchType.Default" id="animationModeCombo"\r\n                                                     class="sapUshellAppearanceComboBox"\r\n                                                     change="setCurrentAnimationMode"\r\n                                                     selectedKey="{config>/animationMode}"\r\n                                                     ariaLabelledBy="sapUshellAppearanceAnimationLabel">\r\n                                               <core:Item key="full" text="{i18n>AppearanceAnimationFull}"/>\r\n                                               <core:Item key="minimal" text="{i18n>AppearanceAnimationMinimal}"/>\r\n                                           </m:Select>\r\n                                           <m:Text text="{i18n>appearanceAnimationDescriptionText}"\r\n                                                   class="sapUshellFlpSettingsDescription"/>\r\n                                       </m:VBox>\r\n                                   </m:cells>\r\n                               </m:ColumnListItem>\r\n                            </m:items>\r\n                        </m:Table>\r\n                        </blocks>\r\n                    </ObjectPageSubSection>\r\n                </subSections>\r\n            </ObjectPageSection>\r\n        </sections>\r\n\r\n    </ObjectPageLayout>\r\n</View>\r\n',
	"sap/ushell/components/shell/MeArea/UsageAnalyticsSelector.controller.js":function(){// ${copyright}

sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap */
    sap.ui.controller("sap.ushell.components.shell.MeArea.UsageAnalyticsSelector", {

        onInit: function () {
            this.oUser = sap.ushell.Container.getUser();
            this.switchStateValue = this.oUser.getTrackUsageAnalytics();
            this.getView().oSwitchButton.setState(this.switchStateValue);

        },

        getContent: function () {
            var that = this,
                deferred = jQuery.Deferred();

            deferred.resolve(that.getView());
            return deferred.promise();
        },

        getValue: function () {
            var deferred = jQuery.Deferred(),
                i18n = sap.ushell.resources.i18n;
            deferred.resolve(this.switchStateValue ? i18n.getText("trackingEnabled") : i18n.getText("trackingDisabled"));
            return deferred.promise();
        },

        onSave: function () {
            var currentUserTracking = this.getView().oSwitchButton.getState();
            this.switchStateValue = currentUserTracking;
            return sap.ushell.Container.getService("UsageAnalytics").setTrackUsageAnalytics(currentUserTracking);
        },

        onCancel: function () {
            this.getView().oSwitchButton.setState(this.switchStateValue);
        }
    });


}, /* bExport= */ true);
},
	"sap/ushell/components/shell/MeArea/UsageAnalyticsSelector.view.js":function(){// ${copyright}

sap.ui.define(['sap/m/Label', 'sap/ushell/resources'],
    function (Label, resources) {
	"use strict";

    /*global jQuery, sap, document, self */
    /*jslint plusplus: true, nomen: true, vars: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.UsageAnalyticsSelector", {

        createContent: function (oController) {
            var sFBoxAlignItems = sap.ui.Device.system.phone ? 'Start' : 'Center',
                sFlexWrap = sap.ui.Device.system.phone ? 'Wrap' : 'NoWrap',
                sFBoxDirection = sap.ui.Device.system.phone ? 'Column' : 'Row',
                sTextAlign = sap.ui.Device.system.phone ? 'Left' : 'Right',
                sAllignSelf = sap.ui.Device.system.phone ? 'Baseline' : 'Auto',
                sWidth = sap.ui.Device.system.phone ? 'auto' : '11.75rem';

            this.oLabel = new Label({
                width: sWidth,
                textAlign: sTextAlign,
                text: resources.i18n.getText("allowTracking") + ":"
            }).addStyleClass('sapUshellUsageAnalyticsSelectorLabel');

            this.oSwitchButton = new sap.m.Switch("usageAnalyticsSwitchButton", {
                type: sap.m.SwitchType.Default
            }).addStyleClass('sapUshellUsageAnalyticsSelectorSwitchButton');

            this.oMessage = new sap.m.Text({
                text: sap.ushell.Container.getService("UsageAnalytics").getLegalText()
            }).addStyleClass('sapUshellUsageAnalyticsSelectorLegalTextMessage');

            this.fBox = new sap.m.HBox({
                alignItems: sFBoxAlignItems,
                wrap: sFlexWrap,
                direction: sFBoxDirection,
                height : "2rem",
                items: [
                    this.oLabel,
                    this.oSwitchButton
                ],
                layoutData : new sap.m.FlexItemData({alignSelf: sAllignSelf})
            });

            this.vBox = new sap.m.VBox({
                items: [this.fBox, this.oMessage]
            });

            return this.vBox;
        },

        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.UsageAnalyticsSelector";
        }
    });


}, /* bExport= */ true);
},
	"sap/ushell/components/shell/MeArea/UserProfiling.controller.js":function(){
sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    sap.ui.controller("sap.ushell.components.shell.MeArea.UserProfiling", {

        onInit: function () {
            this.isContentLoaded = true;
        },
        onCancel: function () {
            var aProfilingEntries = this.getView().getModel().getProperty("/userPreferences/profiling"),
                oProfilingEntry,
                index;

            for (index = 0; index < aProfilingEntries.length; index++) {
                oProfilingEntry = aProfilingEntries[index];
                if (oProfilingEntry.onCancel) {
                    oProfilingEntry.onCancel();
                }
            }
        },
        getValue : function () {
            var deferred = jQuery.Deferred();
            var profilingEntries = this.getView().getModel().getProperty("/userPreferences/profiling");
            //remove usage analytics entry if its not enabled
            profilingEntries.forEach(function (entry, index) {
                if (entry.entryHelpID === "usageAnalytics") {
                    if (!sap.ushell.Container.getService("UsageAnalytics").systemEnabled() ||
                        !sap.ushell.Container.getService("UsageAnalytics").isSetUsageAnalyticsPermitted()) {
                        profilingEntries.splice(index,1);
                    }
                }
            }, this);

            if (profilingEntries !== undefined && profilingEntries.length > 0) {
                deferred.resolve({
                    value: 1,
                    displayText: " "
                });
            } else {
                deferred.resolve({
                    value: 0,
                    displayText: " "
                });
            }
            return deferred.promise();
        },
        onSave: function () {
            var oResultDeferred = jQuery.Deferred(),
                aProfilingEntries = this.getView().getModel().getProperty("/userPreferences/profiling"),
                oWhenPromise,
                aPromiseArray = [],
                iTotalPromisesCount = 0,
                iSuccessCount = 0,
                iFailureCount = 0,
                aFailureMsgArr = [],
                oTempPromise,
                saveDoneFunc = function () {
                    iSuccessCount++;
                    oResultDeferred.notify();
                },
                saveFailFunc = function (err) {
                    aFailureMsgArr.push({
                        entry: "currEntryTitle",
                        message: err
                    });
                    iFailureCount++;
                    oResultDeferred.notify();
                };

            aProfilingEntries.forEach(function (item) {
                oTempPromise = item.onSave();
                oTempPromise.done(saveDoneFunc);
                oTempPromise.fail(saveFailFunc);
                aPromiseArray.push(oTempPromise);
                iTotalPromisesCount++;
            });

            oWhenPromise = jQuery.when.apply(null, aPromiseArray);

            oWhenPromise.done(function () {
                oResultDeferred.resolve();
            });

            oResultDeferred.progress(function () {
                if (iFailureCount > 0 && (iFailureCount + iSuccessCount === iTotalPromisesCount)) {
                    oResultDeferred.reject("At least one save action failed");
                }
            });

            return oResultDeferred.promise();
        },

        getContent: function () {
            var that = this,
                deferred = jQuery.Deferred(),
                aProfilingEntries = this.getView().getModel().getProperty("/userPreferences/profiling");

            aProfilingEntries.forEach(function (item) {
                var contentPromise = item.contentFunc();
                contentPromise.done(function (result) {
                    that.getView().profilingContent.addItem(result);
                });
            });

            deferred.resolve(that.getView());
            return deferred.promise();
        }

    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/UserProfiling.view.js":function(){/**
 * View for displaying the User Profiling entires such as Usageamalytice ans Personalized Search.
 * The View is launched when the UserProfiling option is chosen in the USerSettings UI.
 * Content is added to this View by adding an entry to the profilingEntries in shell.controller.
 */
sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, document */
    /*jslint plusplus: true, nomen: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.UserProfiling", {
        createContent: function (oController) {
            this.profilingContent = new sap.m.VBox().addStyleClass("sapUshellUserSettingDetailContent");
            return this.profilingContent;
        },
        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.UserProfiling";
        }
    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/UserSettings.controller.js":function(){sap.ui.define(['sap/ushell/ui/launchpad/AccessibilityCustomData'],
	function(AccessibilityCustomData) {
	"use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    sap.ui.controller("sap.ushell.components.shell.MeArea.UserSettings", {
        onInit: function () {
            var oView = this.getView(),
                that = this;
            this.navBackButton = new sap.m.ToggleButton({
                icon: sap.ui.Device.system.phone ? "sap-icon://nav-back" : "sap-icon://menu2",
                press: function (e) {
                    if (sap.ui.Device.system.phone) {
                        oView.getSplitApp().backDetail();
                        that._handleNavButton();
                        this.setPressed(false);

                    } else {
                        if (oView.getSplitApp().isMasterShown()) {
                            oView.getSplitApp().hideMaster();
                            this.setTooltip(sap.ushell.resources.i18n.getText("ToggleButtonShow"));
                            this.setPressed(false);
                        } else {
                            oView.getSplitApp().showMaster();
                            this.setTooltip(sap.ushell.resources.i18n.getText("ToggleButtonHide"));
                            this.setPressed(true);
                        }
                    }
                },
                tooltip: sap.ushell.resources.i18n.getText("ToggleButtonShow")
            });
            if (oView && oView.getSplitApp()) {
                oView.getSplitApp().attachAfterMasterClose(that, function () {
                    that._handleNavButton.apply(that);
                });
                oView.getSplitApp().attachAfterMasterOpen(that, function () {
                    that._handleNavButton.apply(that);
                });
            }
        },
        _handleNavButton: function () {
            var oView = this.getView();
            if (oView && oView.getSplitApp() && oView.getSplitApp().getCurrentDetailPage()) {
                if (!oView.getSplitApp().isMasterShown()) {
                    oView.splitAppHeaderBar.addContentLeft(this.navBackButton);
                } else {
                    if (sap.ui.Device.system.phone || sap.ui.Device.orientation.landscape) {
                        oView.splitAppHeaderBar.removeAllContentLeft();
                    }
                }
            }
        },
        getOriginalDialogContent: function () {
            if (!this.oInitialContent) {
                var oEntryList;
                oEntryList = this.getEntryListControl();
                //Master-Detail layout
                this.oInitialContent = new sap.ui.layout.VerticalLayout('userPreferencesLayout', {
                    content: [oEntryList]
                }).addStyleClass("sapUshellUserSettingLayout");
                this.aDanglingControls.push(this.oInitialContent);
            }
            return this.oInitialContent;
        },
        createDetailPage: function (entryId, entryPath, title, content) {
            var that = this,
                oView = that.getView(),
                oObjectHeader = new sap.m.ObjectHeader({
                    title: title,
                    backgroundDesign: sap.m.BackgroundDesign.Solid

                }).addStyleClass("sapUshellUserSettingDetailHeader");
            if (entryId === "userAccountEntry") {
                //user image in the detail page (in user account entry)
                var oUser = sap.ushell.Container.getUser(),
                    userImage = oUser.getImage();
                if (!userImage) {
                    oObjectHeader.setIcon(sap.ui.core.IconPool.getIconURI("sap-icon://person-placeholder"));
                } else {
                    oObjectHeader.setIcon(this.getView().getModel().getProperty('/userImage/personPlaceHolder'));
                }

                oUser.attachOnSetImage(this.updateUserImage.bind({
                    origScope: this,
                    oObjectHeader: oObjectHeader
                }));
                oObjectHeader.setTitle(sap.ushell.Container.getUser().getFullName());
            }
            var oPage = new sap.m.Page('detail' + content.getId(), {
                content: [oObjectHeader, content],
                showHeader: false
            });
            oPage.addStyleClass("sapUsheUserSettingDetaildPage");
            oPage.onAfterRendering = function () {
                that._handleNavButton();
            };

            oView.aDanglingControls.push(oPage);
            oView.getModel().setProperty(entryPath + "/contentResult", oPage);
            oView.getSplitApp().addDetailPage(oPage);
            that.navToDetail(oPage.getId());
        },

        updateUserImage: function (oData) {
            var sUserImageUri = (typeof oData) === 'string' ? oData : oData.mParameters;
            var isEmptyUrl = true;

            if ((typeof sUserImageUri) === 'string') {
                if (sUserImageUri) {
                    isEmptyUrl = false;
                }

            } else {
                if (!jQuery.isEmptyObject(sUserImageUri)){
                    isEmptyUrl = false;
                }
            }

            if (!isEmptyUrl) {
                this.oObjectHeader.setIcon(this.origScope.getView().getModel().getProperty('/userImage/personPlaceHolder'));
            } else {
                this.oObjectHeader.setIcon(sap.ui.core.IconPool.getIconURI("sap-icon://person-placeholder"));
            }
        },

        getListPressHandler: function (selectedItem, eventId) {
            var that = this,
                isContentValid = true,
                entryPath = selectedItem.getBindingContext().getPath(),
                oView = this.getView(),
                oContent = oView.getModel().getProperty(entryPath + "/contentResult"),
                oBusyIndicator = null,// oBusyIndicator is initialized only when bShowBusyIndicator === true
                bShowBusyIndicator = true,
                bIsBusyIndicatorShown = false,
                entry = oView.getModel().getProperty(entryPath),
                contentFunction = entry.contentFunc,
                oContentPromise,
                oKeyValueContent;

            // Clear selection from list.
            if (sap.ui.Device.system.phone) {
                selectedItem.setSelected(false);
            }

            if (oContent) {
                that.navToDetail(oContent.getId(), eventId);
                that._handleNavButton();
            } else {
                if (typeof contentFunction === "function") {
                    oView.getModel().setProperty(entryPath + "/isDirty", true);//Set isDirty = true to the entry. Relevant for saving flow.
                    oContentPromise = contentFunction();
                    oContentPromise.done(function (contentResult) {
                        bShowBusyIndicator = false;
                        if (bIsBusyIndicatorShown === true) {
                            // that.oDialog.removeAllContent();
                            oBusyIndicator.destroy();//oBusyIndicator is destroyed only when it is actually presented
                        }

                        if (contentResult instanceof sap.ui.core.Control) {
                            that.createDetailPage.apply(that, [entry.entryHelpID, entryPath, entry.title, contentResult]);
                        } else {
                            isContentValid = false;
                        }
                    });

                    oContentPromise.fail(function () {
                        bShowBusyIndicator = false;
                        if (bIsBusyIndicatorShown === true) {
                            //handle failure
                            oBusyIndicator.destroy();//oBusyIndicator is destroyed only when it is actually presented
                        }
                        isContentValid = false;
                    });

                    oContentPromise.always(function () {
                        if (isContentValid === false) {
                            var oErrorContent = new sap.m.FlexBox("userPrefErrorFlexBox", {
                                height: "5rem",
                                alignItems: sap.m.FlexAlignItems.Center,
                                justifyContent: sap.m.FlexJustifyContent.Center,
                                items: [new sap.m.Text("userPrefErrorText", {text: oView.translationBundle.getText("loadingErrorMessage")})]
                            });
                            oView.aDanglingControls.push(oErrorContent);
                            oView.getModel().setProperty(entryPath + "/contentResult", oErrorContent);
                            oView.getSplitApp().addDetailPage(oErrorContent);
                            that.navToDetail(oErrorContent.getId());
                        }
                    });
                    if (bShowBusyIndicator === true) {
                        oBusyIndicator = new sap.m.BusyIndicator('userPrefLoadingBusyIndicator', {size: "2rem"});
                        this.aDanglingControls.push(oBusyIndicator);
                        bIsBusyIndicatorShown = true;
                    }
                    // In case contentFunction if not of type "function", in this case the details part includes key/value
                } else {
                    entry.valueArgument().done(function (sValue) {
                        oKeyValueContent = that._getKeyValueContent(entry, sValue);
                        that.createDetailPage(entry.entryHelpID, entryPath, entry.title, oKeyValueContent);
                    }).fail(function (e) {
                        oKeyValueContent = that._getKeyValueContent(entry);
                        that.createDetailPage(entry.entryHelpID, entryPath, entry.title, oKeyValueContent);
                    });
                }
            }
        },
        /**
         * Creating UI for presenting Key/Value in the details area of the user settings UI
         */
        _getKeyValueContent: function (oEntry, sEntryValue) {
            var oKeyLabel,
                oValueLabel,
                oBox,
                sValue = sEntryValue ? sEntryValue : " ",
                sFBoxAlignItems = sap.ui.Device.system.phone ? 'Start' : 'Center',
                sFlexWrap = sap.ui.Device.system.phone ? 'Wrap' : 'NoWrap',
                sFBoxDirection = sap.ui.Device.system.phone ? 'Column' : 'Row';

            oKeyLabel = new sap.m.Label({
                text: oEntry.title + ":"
            }).addStyleClass('sapUshellUserSettingsDetailsKey');

            oValueLabel = new sap.m.Input({
                value: sValue,
                editable: false
            }).addStyleClass('sapUshellUserSettingsDetailsValue');

            oBox = new sap.m.FlexBox({
                alignItems: sFBoxAlignItems,
                wrap: sFlexWrap,
                direction: sFBoxDirection,
                items: [
                    oKeyLabel,
                    oValueLabel
                ]
            });
            return oBox;
        },

        createMasterPages: function () {
            var that = this,
                oEntryTemplate = that.getUserSettingsEntryTemplate();
            // temporary remove the search control for wave 1702
            /*this.oSearch = new sap.m.SearchField({
                enabled: false,
                liveChange: function (input) {
                    var val = input.getParameter("newValue");
                    that.oMasterEntryList.getBinding("items").filter([new sap.ui.model.Filter("title", sap.ui.model.FilterOperator.Contains, val), new sap.ui.model.Filter("visible", sap.ui.model.FilterOperator.EQ, true)]);
                }
            });*/
            this.aDanglingControls = this.getView().aDanglingControls;
            this.oMasterEntryList = new sap.m.List('userSettingEnteryList', {
                items: {
                    path: "/userPreferences/entries",
                    template: oEntryTemplate
                },
                mode: "SingleSelectMaster",
                select: function (ev) {
                    that.getListPressHandler(ev.getSource().getSelectedItem(), ev.getId());
                }
            });
            var origOnAfterRendering = this.oMasterEntryList.onAfterRendering;
            this.oMasterEntryList.onAfterRendering = function () {
                var aEntries = this.getItems();
                var entryPath;
                //Execute the genuine onAfterRendering logic of the list.
                origOnAfterRendering.apply(this, arguments);
                //for each item in the list we need to add XRay help id
                //for each item in the list we need to execute the relevant function to get the entry value
                for (var i = 0; i < aEntries.length; i++) {
                    entryPath = aEntries[i].getBindingContext().getPath();
                    that._setEntryValueResult(entryPath);
                    //if(aEntries[i].)
                }
                if (!sap.ui.Device.system.phone) {
                    this.setSelectedItem(this.getItems()[0]);
                    that.getListPressHandler(this.getSelectedItem());
                }
               /* setTimeout(function () {
                    that.oSearch.setEnabled(true);
                }, 0);*/
            };
            var oPage = new sap.m.Page("userSettingMaster", {
                showHeader: false,
                content: [/*this.oSearch,*/ this.oMasterEntryList]
            }).addStyleClass("sapUshellUserSettingMaster");
            that.aDanglingControls.push(/*this.oSearch,*/ this.oMasterEntryList, oPage);
            return oPage;
        },
        _setEntryValueResult: function (entryPath) {
            var oView = this.getView(),
                oModel = oView.getModel(),
                isEditable = oModel.getProperty(entryPath + "/editable"),
                valueArgument = oModel.getProperty(entryPath + "/valueArgument"),
                oValuePromise;

            if (typeof valueArgument === "function") {
                //Display "Loading..." and disable the entry until the value result is available
                oModel.setProperty(entryPath + "/valueResult", oView.translationBundle.getText("genericLoading"));
                oModel.setProperty(entryPath + "/editable", false);
                oValuePromise = valueArgument();
                if (oValuePromise) {
                    oValuePromise.done(function (valueResult) {
                        oModel.setProperty(entryPath + "/editable", isEditable);
                        var bVisible = true;
                        if (oModel.getProperty(entryPath + "/visible") !== undefined) {
                            bVisible = oModel.getProperty(entryPath + "/visible");
                        } else if (oModel.getProperty(entryPath + "/defaultVisibility") !== undefined) {
                            bVisible = oModel.getProperty(entryPath + "/defaultVisibility") ;
                        }
                        oModel.setProperty(entryPath + "/visible", typeof (valueResult) === 'object' ? !!valueResult.value : bVisible);
                        oModel.setProperty(entryPath + "/valueResult", typeof (valueResult) === 'object' ? valueResult.displayText : valueResult);
                    });
                    oValuePromise.fail(function () {
                        oModel.setProperty(entryPath + "/valueResult", oView.translationBundle.getText("loadingErrorMessage"));
                    });
                }
            } else if (!!valueArgument) {//if valueArgument is not null or undefined, we would like to present it
                oModel.setProperty(entryPath + "/valueResult", valueArgument);
                oModel.setProperty(entryPath + "/editable", isEditable);
            } else {//in any other case (valueArgument is not function \ String \ Number \ Boolean)
                oModel.setProperty(entryPath + "/valueResult", oView.translationBundle.getText("loadingErrorMessage"));
            }
        },
        getUserSettingsEntryTemplate: function () {
            var oItem = new sap.m.StandardListItem({
                    title: "{title}",
                    description: "{valueResult}",
                    icon: {
                        parts: ["icon", "/userImage/account"],
                        //user icon in the entry itself
                        formatter: function (entryIcon, oUserImage) {
                            if (entryIcon === "sap-icon://account") {
                                entryIcon = oUserImage;

                            }
                            return entryIcon ? entryIcon : "sap-icon://action-settings";
                        }
                    },
                    type: sap.ui.Device.system.phone ? "Navigation" : "Inactive",
                    visible: {
                        parts: [
                            {path: 'visible'},
                            {path: 'defaultVisibility'},
                            {path: '/userPreferences/profiling/length'}
                        ],
                        formatter: function (visible, defaultVisibility) {
                            if (this.getTitle() === sap.ushell.resources.i18n.getText("userProfiling")) {
                                var profilingEntries = this.getModel().getProperty("/userPreferences/profiling");
                                //remove usage analytics entry if its not enabled
                                profilingEntries.forEach(function (entry, index) {
                                    if (entry.entryHelpID === "usageAnalytics") {
                                        if (!sap.ushell.Container.getService("UsageAnalytics").systemEnabled() || !sap.ushell.Container.getService("UsageAnalytics").isSetUsageAnalyticsPermitted()) {
                                            profilingEntries.splice(index, 1);
                                        }
                                    }
                                }, this);
                                return (profilingEntries !== undefined && profilingEntries.length > 0);
                            } else {
                                if (visible !== undefined) {
                                    return visible;
                                } else {
                                    return (defaultVisibility !== undefined) ? defaultVisibility : true;
                                }
                            }
                        }
                    },
                    customData: new AccessibilityCustomData({
                        key: "aria-label",
                        value: {
                            parts: [
                                {path: 'title'},
                                {path: 'valueResult'}
                            ],
                            formatter: function (sTitle, sValue) {
                                sValue = sValue ? sValue : "";
                                return sTitle + " " + sValue;
                            }
                        },
                        writeToDom: true
                    })
                }).addStyleClass("sapUshellUserSettingMasterListItem");
            return oItem;
        },
        navToDetail: function(sId, eventId) {
            var view = this.getView(),
                splitApp= view.getSplitApp();

            splitApp.toDetail(sId);
            //Since we cannot use autofocus property of splitApp navcontainer, we have to implement it explicitly
            if (eventId === "select") {
                this.applyFocus(sId);
            }
            if (splitApp.getMode() === "ShowHideMode"){
                splitApp.hideMaster();
            }
        },
        applyFocus: function (sId) {
            if (!sap.ui.Device.system.phone) {
                var elFirstToFocus = jQuery.sap.byId(sId).firstFocusableDomRef();

                if (elFirstToFocus) {
                    jQuery.sap.focus(elFirstToFocus);
                }
            }
        },
        onExit: function () {
            this.getView().aDanglingControls.forEach(function (oControl) {
                if (oControl) {
                    if (oControl.destroyContent) {
                        oControl.destroyContent();
                    }
                    oControl.destroy();
                }
            });
        }
    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/UserSettings.view.js":function(){sap.ui.define(["sap/ushell/resources","sap/m/Page", "sap/m/Text", "sap/m/SplitApp", "sap/m/Bar"],
    function(resources, Page, Text, SplitApp, Bar) {
	"use strict";

    /*global jQuery, sap, document, self*/
    /*jslint plusplus: true, nomen: true, vars: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.UserSettings", {

        createContent: function (oController) {
            this.aDanglingControls = [];
            this.translationBundle = resources.i18n;
            return this.getMainControl(oController);
        },
        getMainControl: function (oController) {


            this.oMainApp = new SplitApp({
                id: "settingsApp",
                masterPages: oController.createMasterPages(),
                defaultTransitionNameDetail: "show"
            });
            this.splitAppHeaderBar = new Bar({contentMiddle: new Text({text: resources.i18n.getText("userSettings")})});
            var oPage = new Page({
                content: [this.oMainApp],
                customHeader: this.splitAppHeaderBar,
                showHeader: true
            }).addStyleClass('sapUshellSettingsPage');

            this.aDanglingControls.push(oPage);
            //This is a hack suggested as temporal solution in BCP ticket 1680226447
            //We have to set the autofocus property of internal SplitApp navcontainer in order to allow search through the views of the
            //Detail page and also to assure that we set focus on the first element in the view and not the one which appears earlier in case of dynamic content.
            //A feature request will be opened in order to allow this property to be set via official API.
            this.oMainApp._oDetailNav.setAutoFocus(false);
            return oPage;
        },
        getSplitApp: function () {
            return this.oMainApp;
        },
        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.UserSettings";
        }

    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/userAccount/UserAccountImgConsentSelector.fragment.xml":'<core:FragmentDefinition\n        height="100%"\n        width="100%"\n        xmlns="sap.uxap"\n        xmlns:m="sap.m"\n        xmlns:core="sap.ui.core">\n    <m:VBox>\n        <m:FlexBox alignItems="{config>/flexAlignItems}" direction="{config>/textDirection}"\n                   id="userImgConsentEnableFlexBox">\n            <m:Label text="{i18n>imgConsentMsg}:"\n                     class="sapUshellUserAccountLabel"/>\n        </m:FlexBox>\n        <m:FlexBox alignItems="{config>/flexAlignItems}" direction="{config>/textDirection}">\n            <m:Link text="{i18n>userImageConsentDialogShowTermsOfUse}" textAlign="{config>/textAlign}"\n                    class="sapUshellUserAccountLabel" press = "termsOfUserPress" id="termsOfUseLink"  />\n            <m:Label text="{i18n>userImageConsentText}:" visible="false" id="sapUshellUserImageConsentSwitchLabel"/>\n        </m:FlexBox>\n        <m:FlexBox direction="{config>/textDirection}" id="termsOfUseTextFlexBox"\n                   visible = "false">\n            <m:Text text="{i18n>userImageConsentDialogTermsOfUse}" class = "sapUshellUserConsentDialogTerms" />\n        </m:FlexBox>\n    </m:VBox>\n</core:FragmentDefinition>',
	"sap/ushell/components/shell/MeArea/userAccount/UserAccountSelector.controller.js":function(){// ${copyright}

sap.ui.define(['sap/ushell/ui5service/UserStatus', 'sap/ushell/ui/launchpad/AccessibilityCustomData'],
	function (UserStatus, AccessibilityCustomData) {
	"use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    sap.ui.controller("sap.ushell.components.shell.MeArea.userAccount.UserAccountSelector", {

        onInit: function () {
            var that = this;

            var oShellCtrl = sap.ushell.Container.getRenderer("fiori2").getShellController();
            var oShellView = oShellCtrl.getView();
            this.oShellConfig = (oShellView.getViewData() ? oShellView.getViewData().config : {}) || {};




            //determines whether the User Image consent feature is enabled
            this.imgConsentEnabled =  this.oShellConfig.enableUserImgConsent ? this.oShellConfig.enableUserImgConsent : false;
            //determines whether the User online status feature is enabled
            this.userStatusEnabled = this.oShellConfig.enableOnlineStatus && UserStatus.prototype.isEnabled;
            this.userStatusEnabled = this.userStatusEnabled ? this.userStatusEnabled : false;

            if (this.imgConsentEnabled) {
                try {
                    this.userInfoService = sap.ushell.Container.getService("UserInfo");
                    this.oUser = this.userInfoService.getUser();
                } catch (e) {
                    jQuery.sap.log.error("Getting UserInfo service failed.");
                    this.oUser = sap.ushell.Container.getUser();
                }

                this.currentUserImgConsent = this.oUser.getImageConsent();
                this.origUserImgConsent = this.currentUserImgConsent;

                this.addImgConsentEnableSwitch(this.currentUserImgConsent);
            }

            if (this.userStatusEnabled) {
                if (this.isServiceEnable()) {
                    this.originalEnableStatus = null;
                    this.originalUserStatus = null;
                    var oService = sap.ui.core.service.ServiceFactoryRegistry.get("sap.ushell.ui5service.UserStatus");
                    var oServiceInstance = oService.createInstance();
                    oServiceInstance.then(
                        function (oService) {
                            that.oUserStatusService = oService;
                            var promise = that._getUserStatusSetting();
                            promise.then(function (oUserStatusSetting) {
                                var bStatus = oUserStatusSetting && oUserStatusSetting.userStatusEnabled ? oUserStatusSetting.userStatusEnabled : false;
                                var sDefaultStatus = oUserStatusSetting && oUserStatusSetting.userStatusDefault ? oUserStatusSetting.userStatusDefault : undefined;

                                this.originalEnableStatus = bStatus;
                                this.originalUserStatus = sDefaultStatus;

                                that.userStatusButton = that._getOnlineStatusPopOver(this.originalUserStatus);
                                that.addUserStatusDropdown();
                                that.addUserEnableSwitch(bStatus);

                            }.bind(that));
                        },
                        function (oError) {

                        }
                    );
                }
            }

        },

        getContent: function () {
            var oDfd = jQuery.Deferred();
            var oResourceModel = sap.ushell.resources.getTranslationModel();
            this.getView().setModel(oResourceModel, "i18n");
            this.getView().setModel(this.getConfigurationModel(), "config");

            oDfd.resolve(this.getView());
            return oDfd.promise();
        },

        getValue: function () {
            var oDfd = jQuery.Deferred();
            oDfd.resolve(sap.ushell.Container.getUser().getFullName());
            return oDfd.promise();
        },

        onCancel: function () {
            if (this.userStatusEnabled) {
                if (this.isServiceEnable()) {
                    this.oUserEnableOnlineStatusSwitch.setState(this.originalEnableStatus);
                    this.userStatusButton.setStatus(sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM[this.originalUserStatus]);
                }
            }

            if (this.imgConsentEnabled) {
                this.currentUserImgConsent = this.oUser.getImageConsent();
                this.oUserEnableImgConsentSwitch.setState(this.currentUserImgConsent);
            }

        },

        onSave: function () {
            var oResultDeferred = jQuery.Deferred(),
                oWhenPromise,userStatusDeferred,usrConsentDeferred,
                aPromiseArray = [];

            if (this.userStatusEnabled) {
                userStatusDeferred = this.onSaveUserStatus();
                aPromiseArray.push(userStatusDeferred);
            }


            if (this.imgConsentEnabled) {
                usrConsentDeferred = this.onSaveUserImgConsent();
                aPromiseArray.push(usrConsentDeferred);
            }
            oWhenPromise = jQuery.when.apply(null, aPromiseArray);
            oWhenPromise.done(function () {
                oResultDeferred.resolve();
            });

            return oResultDeferred.promise();
        },

        onSaveUserImgConsent: function () {
            var deferred = jQuery.Deferred();
            var oUserPreferencesPromise;

            if (this.oUser.getImageConsent() !== this.currentUserImgConsent ) {//only if there was a change we would like to save it
                // set the user's image consent
                if (this.currentUserImgConsent != undefined) {
                    this.oUser.setImageConsent(this.currentUserImgConsent);
                    oUserPreferencesPromise = this.userInfoService.updateUserPreferences(this.oUser);

                    oUserPreferencesPromise.done(function () {
                        this.oUser.resetChangedProperties();
                        this.origUserImgConsent = this.currentUserImgConsent;
                        deferred.resolve();
                    }.bind(this));

                    oUserPreferencesPromise.fail(function (sErrorMessage) {
                        // Apply the previous display density to the user
                        this.oUser.setImageConsent(this.origUserImgConsent);
                        this.oUser.resetChangedProperties();
                        this.currentUserImgConsent = this.origUserImgConsent;
                        jQuery.sap.log.error(sErrorMessage);

                        deferred.reject(sErrorMessage);
                    }.bind(this));
                } else {
                    deferred.reject(this.currentUserImgConsent + "is undefined");
                }
            } else {
                deferred.resolve();//No mode change, do nothing
            }

            return deferred.promise();
        },

        onSaveUserStatus: function () {
            var oDfd = jQuery.Deferred(),
                userStatusDefault;
            if (this.isServiceEnable()) {
                if (this.originalEnableStatus !== this.oUserEnableOnlineStatusSwitch.getState() || this.originalUserStatus !== this.userStatusButton.getStatus().status) {
                    if (!this.oUserEnableOnlineStatusSwitch.getState()) {
                        userStatusDefault = null;
                        this.oUserStatusService.setStatus(null);
                    } else {
                        userStatusDefault = this.userStatusButton.getStatus() ? this.userStatusButton.getStatus().status : "AVAILABLE" ;

                    }

                    this._writeUserStatusSettingToPersonalization({
                        userStatusEnabled: this.oUserEnableOnlineStatusSwitch.getState(),
                        userStatusDefault: userStatusDefault
                    });

                    if ( !this.originalEnableStatus && this.oUserEnableOnlineStatusSwitch.getState()) {
                        this.oUserStatusService.setStatus(userStatusDefault);
                    }

                    this.originalEnableStatus = this.oUserEnableOnlineStatusSwitch.getState();
                    this.originalUserStatus = userStatusDefault;
                }
            }
            oDfd.resolve();
            return oDfd.promise();
        },

        addUserStatusDropdown: function () {
            var oUserStatusDropDownFlexBox = sap.ui.getCore().byId("UserAccountSelector--userStatusDropDownFlexBox");
            oUserStatusDropDownFlexBox.addItem(this.userStatusButton);
        },
        addUserEnableSwitch: function (bEnable) {
            var oUserStatusEnableFlexBox = sap.ui.getCore().byId("UserAccountSelector--userStatusEnableFlexBox");
            this.oUserEnableOnlineStatusSwitch = new sap.m.Switch({
                type: sap.m.SwitchType.Default,
                state: bEnable,
                change: function (oEvent) {
                    this.userStatusButton.setEnabled(oEvent.mParameters.state);
                    jQuery("#" + this.userStatusButton.getId()).attr("tabindex", oEvent.mParameters.state ? 0 : -1);
                }.bind(this)
            });
            //"aria-labelledBy", cannot be added in the constructor
            this.oUserEnableOnlineStatusSwitch.addCustomData(new AccessibilityCustomData({
                key: "aria-labelledBy",
                value: "UserAccountSelector--sapUshellEnableStatusLabel",
                writeToDom: true
            }));
            this.userStatusButton.setEnabled(bEnable);
            jQuery("#" + this.userStatusButton.getId()).attr("tabindex", bEnable ? 0 : -1);
            oUserStatusEnableFlexBox.addItem(this.oUserEnableOnlineStatusSwitch);
        },
        isServiceEnable: function () {
            return UserStatus ? UserStatus.prototype.isEnabled : false;
        },
        getConfigurationModel: function () {
            var oConfModel = new sap.ui.model.json.JSONModel({});
            var oUser = sap.ushell.Container.getUser();
            oConfModel.setData({
                isRTL: sap.ui.getCore().getConfiguration().getRTL(),
                sapUiContentIconColor: sap.ui.core.theming.Parameters.get('sapUiContentIconColor'),
                isStatusEnable: this.originalEnableStatus ? this.originalEnableStatus : false,
                flexAlignItems: sap.ui.Device.system.phone ? 'Stretch' : 'Center',
                textAlign: sap.ui.Device.system.phone ? 'Left' : 'Right',
                textDirection: sap.ui.Device.system.phone ? 'Column' : 'Row',
                labelWidth: sap.ui.Device.system.phone ? "auto" : "12rem",
                name: oUser.getFullName(),
                mail: oUser.getEmail(),
                server: window.location.host,
                imgConsentEnabled: this.imgConsentEnabled,
                isImageConsent: this.currentUserImgConsent,
                userStatusEnabled: this.userStatusEnabled
            });
            return oConfModel;
        },
        _getOnlineStatusPopOver: function (sUserStatus) {

            var oPopover = new sap.m.Popover({
                placement: sap.m.PlacementType.Bottom,
                showArrow: true,
                showHeader: false,
                content: [
                    new sap.ushell.ui.launchpad.UserStatusItem({
                        status: sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM.AVAILABLE,
                        isOpener: false,
                        press: function (oEvent) {
                            oUserStatusButton.setStatus(sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM.AVAILABLE);
                            oPopover.close();
                        }
                    }).addStyleClass('sapUserStatusContainer'),
                    new sap.ushell.ui.launchpad.UserStatusItem({
                        status: sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM.AWAY,
                        isOpener: false,
                        press: function (oEvent) {
                            oUserStatusButton.setStatus(sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM.AWAY);
                            oPopover.close();
                        }
                    }).addStyleClass('sapUserStatusContainer'),
                    new sap.ushell.ui.launchpad.UserStatusItem({
                        status: sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM.BUSY,
                        isOpener: false,
                        press: function (oEvent) {
                            oUserStatusButton.setStatus(sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM.BUSY);
                            oPopover.close();
                        }
                    }).addStyleClass('sapUserStatusContainer'),
                    new sap.ushell.ui.launchpad.UserStatusItem({
                        status: sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM.APPEAR_OFFLINE,
                        isOpener: false,
                        press: function (oEvent) {
                            oUserStatusButton.setStatus(sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM.APPEAR_OFFLINE);
                            oPopover.close();
                        }
                    }).addStyleClass('sapUserStatusContainer')
                ]
            });

            var oUserStatusButton = new sap.ushell.ui.launchpad.UserStatusItem({
                tooltip: "{i18n>headerActionsTooltip}",
                enabled: false,
                ariaLabel: sap.ushell.Container.getUser().getFullName(),
                image: sap.ui.core.IconPool.getIconURI("account"),
                status: sUserStatus ? sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM[sUserStatus] : sap.ushell.ui.launchpad.UserStatusItem.prototype.STATUS_ENUM["AVAILABLE"],
                press: function (oEvent) {
                    var oButton = sap.ui.getCore().byId(oEvent.mParameters.id);
                    oPopover.openBy(oButton);
                }.bind(this),
                contentList: oPopover
            }).addStyleClass('sapUserStatusOpener');

            return oUserStatusButton;
        } ,

        _writeUserStatusSettingToPersonalization: function (oUserStatusSetting) {
            var oDeferred,
                oPromise;

            try {
                oPromise = this._getUserSettingsPersonalizer().setPersData(oUserStatusSetting);
            } catch (err) {
                jQuery.sap.log.error("Personalization service does not work:");
                jQuery.sap.log.error(err.name + ": " + err.message);
                oDeferred = new jQuery.Deferred();
                oDeferred.reject(err);
                oPromise = oDeferred.promise();
            }
            return oPromise;
        },
        _getUserSettingsPersonalizer: function () {
            if (this.oUserPersonalizer === undefined) {
                this.oUserPersonalizer = this._createUserPersonalizer();
            }
            return this.oUserPersonalizer;
        },
        _createUserPersonalizer: function () {
            var oPersonalizationService = sap.ushell.Container.getService("Personalization"),
                oComponent,
                oScope = {
                    keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
                    writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
                    clientStorageAllowed: true
                },
                oPersId = {
                    container: "sap.ushell.services.UserStatus",
                    item: "userStatusData"
                },
                oPersonalizer = oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);

            return oPersonalizer;
        },
        _getUserStatusSetting: function () {
            var personalizer = this._getUserSettingsPersonalizer();
            return personalizer.getPersData();
        },

        /*
        * User Image Consent functions
        * */

        addImgConsentEnableSwitch: function (bEnable) {
            var oUserImgConsentEnableFlexBox = sap.ui.getCore().byId("UserAccountSelector--userImgConsentEnableFlexBox");
            this.oUserEnableImgConsentSwitch = new sap.m.Switch({
                customTextOff: sap.ushell.resources.i18n.getText("No"),
                customTextOn: sap.ushell.resources.i18n.getText("Yes"),
                type: sap.m.SwitchType.Default,
                state: bEnable,
                change: this.setCurrentUserImgConsent.bind(this)
            });
            //"aria-labelledBy", cannot be added in the constructor
            this.oUserEnableImgConsentSwitch.addCustomData(new AccessibilityCustomData({
                key: "aria-labelledBy",
                value: "UserAccountSelector--sapUshellUserImageConsentSwitchLabel",
                writeToDom: true
            }));
            oUserImgConsentEnableFlexBox.addItem(this.oUserEnableImgConsentSwitch);
        },

        setCurrentUserImgConsent: function (oEvent) {
            this.currentUserImgConsent = oEvent.mParameters.state;
        },

        termsOfUserPress: function (){
            var termsOfUseTextBox = sap.ui.getCore().byId("UserAccountSelector--termsOfUseTextFlexBox");
            var termsOfUseLink = sap.ui.getCore().byId("UserAccountSelector--termsOfUseLink");
            var isTermsOfUseVisible = termsOfUseTextBox.getVisible();
            if (isTermsOfUseVisible) {
                termsOfUseTextBox.setVisible(false);
                termsOfUseLink.setText(sap.ushell.resources.i18n.getText("userImageConsentDialogShowTermsOfUse"));
            } else {
                termsOfUseLink.setText(sap.ushell.resources.i18n.getText("userImageConsentDialogHideTermsOfUse"));
                termsOfUseTextBox.setVisible(true);
            }
        }
    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/userAccount/UserAccountSelector.view.js":function(){// ${copyright}

sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, document, self */
    /*jslint plusplus: true, nomen: true, vars: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.userAccount.UserAccountSelector", {
        createContent: function (oController) {
            var i18n = sap.ushell.resources.i18n;
            var sFlexDirection = sap.ui.Device.system.phone ? 'Column' : 'Row';
            var sFlexAlignItems = sap.ui.Device.system.phone ? 'Stretch' : 'Center';
            var sTextAlign = sap.ui.Device.system.phone ? 'Left' : 'Right';
            var sLabelWidth = sap.ui.Device.system.phone ? "auto" : "12rem";
            var nameLabel = new sap.m.Label({
                text: i18n.getText("UserAccountNameFld") + ":",
                width: sLabelWidth,
                textAlign: sTextAlign
            });
            var nameInput = new sap.m.Input("userAccountuserName", {
                value: "{/name}",
                editable: false
            }).addAriaLabelledBy(nameLabel);

            nameInput.addEventDelegate({
                onfocusin: function () {
                    jQuery("#userAccountuserName input").blur();
                }
            });

            var fboxName = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [nameLabel, nameInput]
            });
            var emailLabel = new sap.m.Label({
                text: i18n.getText("UserAccountEmailFld") + ":",
                width: sLabelWidth,
                textAlign: sTextAlign
            });
            var fboxMail = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    emailLabel,
                    new sap.m.Input({
                        value: "{/mail}",
                        editable: false
                    }).addAriaLabelledBy(emailLabel)
                ]
            });
            var serverLabel =  new sap.m.Label({
                text: i18n.getText("UserAccountServerFld") + ":",
                width: sLabelWidth,
                textAlign: sTextAlign
            });
            var fboxServer = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    serverLabel,
                    new sap.m.Input({
                        value: "{/server}",
                        editable: false
                    }).addAriaLabelledBy(serverLabel)
                ]
            });


            var vbox = new sap.m.VBox({
                items: [fboxName, fboxMail, fboxServer]
            });
            vbox.addStyleClass("sapUiSmallMargin");

            return vbox;
        },

        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.userAccount.UserAccountSelector";
        }
    });



}, /* bExport= */ true);
},
	"sap/ushell/components/shell/MeArea/userAccount/UserAccountSelector.view.xml":'<View\n        controllerName="sap.ushell.components.shell.MeArea.userAccount.UserAccountSelector"\n        height="100%"\n        width="100%"\n        xmlns="sap.uxap"\n        xmlns:m="sap.m"\n        xmlns:core="sap.ui.core">\n\n    <ObjectPageLayout id="UserAccountObjectPageLayout" enableLazyLoading="false">\n        <sections>\n            <ObjectPageSection title="{i18n>UserAccountFld}">\n                <subSections>\n                    <ObjectPageSubSection title="{i18n>UserAccountFld}">\n                        <blocks>\n                            <core:Fragment fragmentName="sap.ushell.components.shell.MeArea.userAccount.UserAccountSetting"\n                                           type="XML"></core:Fragment>\n                        </blocks>\n                    </ObjectPageSubSection>\n                </subSections>\n            </ObjectPageSection>\n            <ObjectPageSection title="{i18n>UserAccountOnlineStatusTitle}"\n                               class="sapUshellUserAccountSection">\n                <subSections>\n                    <ObjectPageSubSection visible = "{config>/userStatusEnabled}" title="{i18n>UserAccountOnlineStatusTitle}">\n                        <blocks>\n                            <core:Fragment fragmentName="sap.ushell.components.shell.MeArea.userAccount.UserAccountStatusSelector"\n                                           type="XML"></core:Fragment>\n                        </blocks>\n                    </ObjectPageSubSection>\n                </subSections>\n            </ObjectPageSection>\n            <ObjectPageSection title="{i18n>ProfileImgId}">\n                <subSections>\n                    <ObjectPageSubSection visible = "{config>/imgConsentEnabled}">\n                        <blocks>\n                            <core:Fragment fragmentName="sap.ushell.components.shell.MeArea.userAccount.UserAccountImgConsentSelector"\n                                           type="XML"></core:Fragment>\n                        </blocks>\n                    </ObjectPageSubSection>\n                </subSections>\n            </ObjectPageSection>\n        </sections>\n\n    </ObjectPageLayout>\n</View>',
	"sap/ushell/components/shell/MeArea/userAccount/UserAccountSetting.fragment.xml":'<core:FragmentDefinition\n                         height="100%"\n                         width="100%"\n                         xmlns="sap.uxap"\n                         xmlns:m="sap.m"\n                         xmlns:core="sap.ui.core">\n    <m:VBox class="sapUiSmallMargin">\n        <m:FlexBox alignItems="{config>/flexAlignItems}" direction="{config>/textDirection}">\n            <m:Label text="{i18n>UserAccountNameFld}:"\n                     class="sapUshellUserAccountLabel"\n                     width="{config>/labelWidth}"\n                     textAlign="{config>/textAlign}"\n                     id="userAccountuserNameLable"/>\n            <m:Input value="{config>/name}"\n                     id="userAccountuserName"\n                     class="sapUshellUserAccountInput"\n                     editable="false"\n                     ariaLabelledBy="userAccountuserNameLable"/>\n\n        </m:FlexBox>\n\n\n        <m:FlexBox alignItems="{config>/flexAlignItems}" direction="{config>/textDirection}">\n            <m:Label text="{i18n>UserAccountEmailFld}:"\n                     class="sapUshellUserAccountLabel"\n                     width="{config>/labelWidth}"\n                     textAlign="{config>/textAlign}"\n                     id="userAccountuserMailLabel"/>\n            <m:Input value="{config>/mail}"\n                     id="userAccountuserMail"\n                     class="sapUshellUserAccountInput"\n                     editable="false"\n                     ariaLabelledBy="userAccountuserMailLabel"/>\n\n        </m:FlexBox>\n\n        <m:FlexBox alignItems="{config>/flexAlignItems}" direction="{config>/textDirection}">\n            <m:Label text="{i18n>UserAccountServerFld}:"\n                     class="sapUshellUserAccountLabel"\n                     width="{config>/labelWidth}"\n                     textAlign="{config>/textAlign}"\n                     id="userAccountuserServerLabel"/>\n            <m:Input value="{config>/server}"\n                     id="userAccountuserServer"\n                     class="sapUshellUserAccountInput"\n                     editable="false"\n                     ariaLabelledBy="userAccountuserServerLabel"/>\n\n        </m:FlexBox>\n\n    </m:VBox>\n</core:FragmentDefinition>',
	"sap/ushell/components/shell/MeArea/userAccount/UserAccountSetting.view.xml":'<View\n        controllerName="sap.ushell.components.shell.MeArea.userAccount.UserAccountSelector"\n        xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc"\n        xmlns="sap.m">\n    <core:Fragment fragmentName="sap.ushell.components.shell.MeArea.userAccount.UserAccountSetting" type="XML"></core:Fragment>\n</View>',
	"sap/ushell/components/shell/MeArea/userAccount/UserAccountStatusSelector.fragment.xml":'<core:FragmentDefinition\n                         height="100%"\n                         width="100%"\n                         xmlns="sap.uxap"\n                         xmlns:m="sap.m"\n                         xmlns:core="sap.ui.core">\n    <m:VBox>\n        <m:FlexBox alignItems="{config>/flexAlignItems}" direction="{config>/textDirection}"\n                   id="userStatusEnableFlexBox">\n            <m:Label text="{i18n>enableStatusMessageBoxFld}:"\n                     class="sapUshellUserAccountLabel" id="sapUshellEnableStatusLabel"/>\n        </m:FlexBox>\n        <m:FlexBox direction="{config>/textDirection}" id="userStatusLegalMessageFlexBox1"\n                   class="ushellUserStatusLegalMessageFlexBox">\n            <m:Text text="{i18n>userStatusMessageBoxInfoTextLine1}"/>\n        </m:FlexBox>\n        <m:FlexBox alignItems="{config>/flexAlignItems}" direction="{config>/textDirection}"\n                   id="userStatusDropDownFlexBox" class="ushellUserStatusDropDownFlexBox">\n            <m:Label text="{i18n>userStatusSettingDropdownLabelFld}:"\n                     class="sapUshellUserAccountLabel"/>\n\n        </m:FlexBox>\n        <m:FlexBox direction="{config>/textDirection}" id="ushellDefaultStatusDescription"\n                   class="ushellUserStatusLegalMessageFlexBox">\n            <m:Text text="{i18n>userStatusDefaultStatusDescriptionLine1}"/>\n        </m:FlexBox>\n    </m:VBox>\n</core:FragmentDefinition>',
	"sap/ushell/components/shell/MeArea/userActivitiesHandler.controller.js":function(){// ${copyright}
sap.ui.define([
        'sap/ushell/components/applicationIntegration/AppLifeCycle'
    ],
    function(AppLifeCycle) {
	"use strict";

    /*global jQuery, sap, setTimeout, clearTimeout */
    /*jslint plusplus: true, nomen: true */
    sap.ui.controller("sap.ushell.components.shell.MeArea.userActivitiesHandler", {

        onInit: function () {
            this.oModel = AppLifeCycle.getElementsModel().getModel();
            this.isTrackingEnable = this.oModel.getProperty("/enableTrackingActivity")!= undefined ? this.oModel.getProperty("/enableTrackingActivity") : true;
            this.currentTrackingMode = this.isTrackingEnable;
            this.oView.trackUserActivitySwitch.setState(this.isTrackingEnable);
        },

        getContent: function () {
            var oDfd = jQuery.Deferred();
            oDfd.resolve(this.getView());
            return oDfd.promise();
        },

        getValue: function () {
            return jQuery.Deferred().resolve(" ");
        },

        onCancel: function () {
            var oDfd = jQuery.Deferred();
            if (this.currentTrackingMode != this.isTrackingEnable) {
                this.isTrackingEnable = !this.isTrackingEnable;
                this.oView.trackUserActivitySwitch.setState(this.isTrackingEnable);
            }
            oDfd.resolve();
            return oDfd.promise();
        },

        onSave: function () {
            var oDfd = jQuery.Deferred();
            if (this.currentTrackingMode != this.isTrackingEnable) {
                this.oModel.setProperty("/enableTrackingActivity", this.isTrackingEnable);
                this.writeUserActivityModeToPersonalization(this.isTrackingEnable);
                this.currentTrackingMode = this.isTrackingEnable;
                sap.ui.getCore().byId('meAreaIconTabBar').setVisible(this.isTrackingEnable);
                var meAreaView = sap.ui.getCore().byId('meArea');
                // tracking wasn't able - need to get content from server and update the container
                if (this.isTrackingEnable) {
                    var meAreaController = meAreaView.getController();
                    if (!meAreaController.oUserRecentsSrvc) {
                        meAreaController.oUserRecentsSrvc = sap.ushell.Container.getService('UserRecents');
                    }
                    meAreaController.refreshRecentActivities();
                    meAreaController.refreshFrequentActivities();
                    oDfd.resolve();
                } else {
                    oDfd.resolve();
                }
            } else {
                oDfd.resolve();
            }
            return oDfd.promise();
        },

        writeUserActivityModeToPersonalization: function (isTrackingEnable) {
            var oDeferred,
                oPromise;

            try {
                oPromise = this._getPersonalizer().setPersData(isTrackingEnable);
            } catch (err) {
                jQuery.sap.log.error("Personalization service does not work:");
                jQuery.sap.log.error(err.name + ": " + err.message);
                oDeferred = new jQuery.Deferred();
                oDeferred.reject(err);
                oPromise = oDeferred.promise();
            }
            return oPromise;
        },

        _getPersonalizer: function () {
            var oPersonalizationService = sap.ushell.Container.getService("Personalization");
            var oComponent = sap.ui.core.Component.getOwnerComponentFor(this);
            var oScope = {
                keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
                writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
                clientStorageAllowed: true
            };

            var oPersId = {
                container: "flp.settings.FlpSettings",
                item: "userActivitesTracking"
            };

            return oPersonalizationService.getPersonalizer(oPersId, oScope, oComponent);
        },


        _handleCleanHistory : function () {
            sap.ushell.Container.getServiceAsync("UserRecents").then( function(oService) {
                oService.clearRecentActivities();
                showSaveMessageToast();

                function showSaveMessageToast () {
                    sap.ui.require(['sap/m/MessageToast'],
                        function (MessageToast) {
                            var message = sap.ushell.resources.i18n.getText("savedChanges");

                            MessageToast.show(message, {
                                duration: 3000,
                                width: "15em",
                                my: "center bottom",
                                at: "center bottom",
                                of: window,
                                offset: "0 -50",
                                collision: "fit fit"
                            });
                        });
                };
            });
        },

        _handleTrackUserActivitySwitch : function (isVisible) {
            this.isTrackingEnable = isVisible;
        }
    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/MeArea/userActivitiesHandler.view.js":function(){// ${copyright}
sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, document, self */
    /*jslint plusplus: true, nomen: true, vars: true */

    sap.ui.jsview("sap.ushell.components.shell.MeArea.userActivitiesHandler", {
        createContent: function (oController) {
            var i18n = sap.ushell.resources.i18n;
            var sFlexDirection = sap.ui.Device.system.phone ? 'Column' : 'Row';
            var sFlexAlignItems = sap.ui.Device.system.phone ? 'Stretch' : 'Center';
            var sTextAlign = sap.ui.Device.system.phone ? 'Left' : 'Right';

            this.trackingLabel = new sap.m.Label('trackingLabel', {
                text: i18n.getText("trackingLabel") ,
                textAlign: sTextAlign
            }).addStyleClass("sapUshellCleanActivityLabel");


            this.trackUserActivitySwitch =   new sap.m.Switch("trackUserActivitySwitch", {
                type: sap.m.SwitchType.Default,
                customTextOn : i18n.getText("Yes") ,
                customTextOff : i18n.getText("No") ,
                change: function (oEvent) {
                    oController._handleTrackUserActivitySwitch(oEvent.getParameter("state"));
                }
            });

            var fTrackingSwitch = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    this.trackingLabel,
                    this.trackUserActivitySwitch
                ]
            });

            this.cleanActivityLabel = new sap.m.Label('cleanActivityLabel', {
                text: i18n.getText("cleanActivityLabel") ,
                textAlign: sTextAlign
            }).addStyleClass("sapUshellCleanActivityLabel");


            this.cleanActivityButton =new sap.m.Button({
                id: "cleanActivityButton",
                text: i18n.getText("cleanActivityButton"),
                press: oController._handleCleanHistory
            });

            var fcleanActivity = new sap.m.FlexBox({
                alignItems: sFlexAlignItems,
                direction: sFlexDirection,
                items: [
                    this.cleanActivityLabel,
                    this.cleanActivityButton
                ]
            });

            var vbox = new sap.m.VBox({
                items: [ fTrackingSwitch,fcleanActivity]
            });
            vbox.addStyleClass("sapUiSmallMargin");

            return vbox;
        },

        getControllerName: function () {
            return "sap.ushell.components.shell.MeArea.userActivitiesHandler";
        }
    });



}, /* bExport= */ false);
}
},"Component-preload"
);
