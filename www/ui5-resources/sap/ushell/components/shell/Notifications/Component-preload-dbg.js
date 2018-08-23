sap.ui.require.preload({
	"sap/ushell/components/shell/Notifications/Component.js":function(){// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define([
        'sap/ushell/resources',
        'sap/ui/core/UIComponent',
        'sap/ushell/components/flp/ComponentKeysHandler',
        'sap/ushell/utils',
        'sap/ushell/ui/shell/RightFloatingContainer',
        'sap/ushell/EventHub'
    ],
    function (resources, UIComponent, ComponentKeysHandler, utils, RightFloatingContainer, EventHub) {
        "use strict";

        return UIComponent.extend("sap.ushell.components.shell.Notifications.Component", {

            metadata: {
                version: "${version}",
                library: "sap.ushell.components.shell.Notifications",
                dependencies: {
                    libs: ["sap.m"]
                },
                config: {
                }
            },

            createContent: function () {
                this.oRenderer = sap.ushell.Container.getRenderer("fiori2");
                this.oDefConfig = {};
                this.bIsViewCreated = false;
                this.isNotificationPreviewLoaded = false;
                this.oNotificationsPreviewModel = undefined;

                var that = this;
                var showNotifications = fnHandleToggleNotificationsView.bind(this);

                var fnUpdateAggregation = function (sName) {
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

                this.oPreviewNotificationsContainerPlaceholder = new RightFloatingContainer({
                    id: 'notifications-preview-container-placeholder',
                    visible: {
                        path: '/enableNotificationsPreview',
                        formatter: function (bVisible) {
                            return that._handleNotificationsPreviewVisibility.apply(that, [bVisible]);
                        }
                    }
                }).addStyleClass('sapUshellPreviewNotificationsConainer');
                this.oPreviewNotificationsContainer = new RightFloatingContainer({
                    id: 'notifications-preview-container',
                    top: 4,
                    right: '1rem',
                    actAsPreviewContainer: true,
                    floatingContainerItems: {
                        path: "/previewNotificationItems",
                        factory: function (functionId, oContext) {
                            return sap.ui.getCore().byId(oContext.getObject().previewItemId);
                        }
                    },
                    insertItemsWithAnimation: {
                        path: '/animationMode',
                        formatter: function (sAnimationMode) {
                            return sAnimationMode !== 'minimal';
                        }
                    },
                    visible: {
                        path: '/enableNotificationsPreview',
                        formatter: this._handleNotificationsPreviewVisibility.bind(this)
                    }
                }).addStyleClass('sapContrastPlus')
                    .addStyleClass('sapContrast');
                this.oPreviewNotificationsContainer.updateAggregation = fnUpdateAggregation;

                sap.ui.getCore().getEventBus().subscribe("sap.ushell.services.Notifications", "onNewNotifications", this._handleAlerts, this);
                sap.ui.getCore().getEventBus().subscribe("sap.ushell.services.Notifications", "enablePreviewNotificationChanged", this._updateNotificationConfiguration, this);
                sap.ui.getCore().getEventBus().publish("shell", "notificationsPreviewContainerCreated", {
                    previewNotificationsContainerPlaceholder: this.oPreviewNotificationsContainerPlaceholder,
                    previewNotificationsContainer : this.oPreviewNotificationsContainer
                });
                this.oNotificationsPreviewModel = this.oPreviewNotificationsContainer.getModel();

                var oConfig = (this.getComponentData() ? this.getComponentData().config : {});
                //We should have a default oConfig
                this.oDefConfig = {
                    view: {
                        position: "right"
                    },
                    enableHeaderButton: true,
                    enablePreview: true
                };
                var oNotificationToggle,
                    origNotificationsToggleAfterRender;

                this._updateNotificationConfiguration();

                if (sap.ushell.Container.getService("Notifications").isEnabled() === true) {
                    sap.ushell.Container.getRenderer("fiori2").shellCtrl.getModel().setProperty("/enableNotifications", true);
                    sap.ushell.Container.getService("Notifications").init();
                    if (this.oRenderer.getShellConfig().enableNotificationsUI === true) {
                        sap.ushell.Container.getRenderer("fiori2").shellCtrl.getModel().setProperty("/enableNotificationsUI", true);
                        sap.ushell.Container.getService("Notifications").registerDependencyNotificationsUpdateCallback(this.notificationsCountUpdateCallback.bind(this), true);
                    }
                }

                //merge the configurtions.
                this.oDefConfig = jQuery.extend(this.oDefConfig, oConfig);

                oNotificationToggle = sap.ui.getCore().byId("NotificationsCountButton");
                oNotificationToggle.applySettings({
                    icon: sap.ui.core.IconPool.getIconURI("ui-notifications"),
                    floatingNumber: {
                        parts: ["/notificationsCount"],
                        formatter: function (notificationsCount) {
                            //set aria label
                            var jsButton = this.getDomRef(),
                                ariaLabelValue = "";

                                if (jsButton) {
                                    if (notificationsCount > 0) {
                                        ariaLabelValue = resources.i18n.getText("NotificationToggleButtonCollapsed", notificationsCount);
                                    } else {
                                        ariaLabelValue = resources.i18n.getText("NotificationToggleButtonCollapsedNoNotifications");
                                    }
                                    jsButton.setAttribute("aria-label", ariaLabelValue);
                                }
                                return notificationsCount;
                            }
                        },
                        visible: "{/enableNotifications}",
                        enabled: "{/enableNotifications}",
                        selected: {
                            path: "/currentViewPortState",
                            formatter: function (viewPortState) {
                                if (viewPortState === 'RightCenter') {
                                    return true;
                                }
                                return false;
                            }
                        },
                        press: function () {
                            showNotifications(this, !this.getSelected());
                        },
                        showSeparator: false,
                        tooltip: resources.i18n.getText("NotificationToggleButtonExpanded")
                    },
                    true,
                    true).removeStyleClass("sapUshellPlaceHolders");

                origNotificationsToggleAfterRender = oNotificationToggle.onAfterRendering;
                oNotificationToggle.onAfterRendering = function () {
                    if (origNotificationsToggleAfterRender) {
                        origNotificationsToggleAfterRender.apply(this, arguments);
                    }
                    jQuery(this.getDomRef()).attr("aria-pressed", that.oRenderer.getNotificationsSelected());
                    if (this.getDisplayFloatingNumber() > 0) {
                        jQuery(this.getDomRef()).attr("aria-label", resources.i18n.getText("NotificationToggleButtonCollapsed", this.getDisplayFloatingNumber()));
                    } else {
                        jQuery(this.getDomRef()).attr("aria-label", resources.i18n.getText("NotificationToggleButtonCollapsedNoNotifications"));
                    }
                };

                oNotificationToggle.addEventDelegate({
                    onsapskipforward: function (oEvent) {
                        that.oRenderer.AccessKeysHandler.bForwardNavigation = true;
                        oEvent.preventDefault();
                        jQuery("#sapUshellHeaderAccessibilityHelper").focus();
                    },
                    onsaptabnext: function (oEvent) {
                        that.oRenderer.AccessKeysHandler.bForwardNavigation = true;
                        oEvent.preventDefault();
                        jQuery("#sapUshellHeaderAccessibilityHelper").focus();
                    },
                    onsapskipback: function (oEvent) {
                        if (that.oRenderer.AccessKeysHandler.getAppKeysHandler()) {
                            oEvent.preventDefault();
                            that.oRenderer.AccessKeysHandler.bFocusOnShell = false;
                        }
                    }
                });
                this.oRenderer.addShellDanglingControl(oNotificationToggle);

                if (sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty("/enableNotificationsUI") === true) {
                    sap.ushell.Container.getRenderer("fiori2").oShellModel.addHeaderEndItem(["NotificationsCountButton"], false, ["home", "app", "minimal"], true);
                }

                if (sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD).name === "Phone") {
                    sap.ushell.Container.getRenderer("fiori2").getShellController().handleEndItemsOverflow({name: 'Phone', showOverFlowBtn: true});
                }

                // Show/Hide Notifications API. Usage: EventHub.emit('showNotifications', [true|false]);
                EventHub.on('showNotifications').do(function (bVisible) {
                    showNotifications(oNotificationToggle, bVisible);
                });

                sap.ui.getCore().getEventBus().publish("shell", "notificationsCompLoaded", {delay: 3000});
            },

            /**
             * Callback functions that is registered for notification update.
             * Queries notifications service for the updated notifications, and updates the model with the relevant/recent ones
             */
            _notificationsUpdateCallback: function () {
                var that = this,
                    iRequiredNotificationsNumber = 5,
                    iTempRequiredNotificationsNumber = 0,
                    aRecentNotificationsArray = this.oNotificationsPreviewModel.getProperty("/previewNotificationItems"),
                    aNewNotifications = [],
                    aNewNotificationsIds = [],
                    tRecentCreationTime,
                    tRecentCreationTimeFormatted,
                    tTempCreationTime,
                    tTempCreationTimeFormatted,
                    index,
                    i,
                    oNotificationItem,
                    bNotificationItemsRemoved = false,
                    iMissingPreviewNotificationCount = iRequiredNotificationsNumber - aRecentNotificationsArray.length - 1;

                sap.ushell.Container.getService("Notifications").getNotifications().done(function (aNotifications) {
                    if (!aNotifications) {
                        return;
                    }

                    var oNotificationsPreview = sap.ui.getCore().byId("notifications-preview-container"),
                        viewPortContainer;

                    if (!this.isNotificationPreviewLoaded) {
                        oNotificationsPreview.setEnableBounceAnimations(true);
                    }
                    // remove from the preview notifications panel notifications that the user dismissed in the notifications view
                    if (aRecentNotificationsArray && aRecentNotificationsArray.length) {
                        for (index = 0; index < aRecentNotificationsArray.length; index++) {
                            var sOriginalNotificationItemId = aRecentNotificationsArray[index].originalItemId,
                                bNotificationExists = false;

                            for (i = 0; i < aNotifications.length; i++) {
                                if (aNotifications[i].Id === sOriginalNotificationItemId) {
                                    bNotificationExists = true;
                                    break;
                                }
                                if (aRecentNotificationsArray[index].originalTimestamp > aNotifications[i].CreatedAt) {
                                    break;
                                }
                            }

                            if (!bNotificationExists) {
                                aRecentNotificationsArray.splice(index, 1);
                                bNotificationItemsRemoved = true;
                                index--;
                            }
                        }
                    }
                    // Getting the time stamp of the previous most recent notification in case of new notification
                    if (aRecentNotificationsArray && aRecentNotificationsArray.length > 0) {
                        tRecentCreationTime = aRecentNotificationsArray[0].originalTimestamp;
                        tRecentCreationTimeFormatted = sap.ushell.Container.getService("Notifications")._formatAsDate(tRecentCreationTime);
                    }

                    // From the given notifications - get the first five (up to five, actually) that:
                    // - Have CteatedAt time stamp higher (i.e. more recent) than the previous most recent one
                    for (index = 0; (index < aNotifications.length) && (iTempRequiredNotificationsNumber < iRequiredNotificationsNumber); index++) {
                        tTempCreationTime = aNotifications[index].CreatedAt;
                        tTempCreationTimeFormatted = sap.ushell.Container.getService("Notifications")._formatAsDate(tTempCreationTime);
                        if ((tRecentCreationTimeFormatted ? tTempCreationTimeFormatted > tRecentCreationTimeFormatted : true)) {
                            aNewNotifications[iTempRequiredNotificationsNumber] = aNotifications[index];
                            iTempRequiredNotificationsNumber++;
                        }
                    }

                    // case of dismiss notification need to bring "old" notification
                    var newNotificationsCount = aNewNotifications.length;
                    if (aRecentNotificationsArray && aRecentNotificationsArray.length > 0 && aRecentNotificationsArray.length < iRequiredNotificationsNumber && aNotifications.length > aRecentNotificationsArray.length) {
                        tRecentCreationTime = aRecentNotificationsArray[aRecentNotificationsArray.length - 1].originalTimestamp;
                        tRecentCreationTimeFormatted = sap.ushell.Container.getService("Notifications")._formatAsDate(tRecentCreationTime);
                        iTempRequiredNotificationsNumber = 0;
                        for (index = 0; (index < aNotifications.length) && (iTempRequiredNotificationsNumber <= iMissingPreviewNotificationCount); index++) {
                            tTempCreationTime = aNotifications[index].CreatedAt;
                            tTempCreationTimeFormatted = sap.ushell.Container.getService("Notifications")._formatAsDate(tTempCreationTime);
                            if ( tTempCreationTimeFormatted < tRecentCreationTimeFormatted ) {
                                aNewNotifications[newNotificationsCount + iTempRequiredNotificationsNumber] = aNotifications[index];
                                iTempRequiredNotificationsNumber++;
                            }
                        }
                    }
                    // Check if there are any new notification objects, if not - return
                    if (aNewNotifications.length === 0 && !bNotificationItemsRemoved) {
                        this._disableNotificationPreviewBouncingAnimation(oNotificationsPreview);
                        return;
                    }

                    // Create new notification items, and store only their Id
                    for (i = 0; i < aNewNotifications.length; i++) {
                        oNotificationItem = new sap.m.NotificationListItem ({
                            hideShowMoreButton: true,
                            title:  aNewNotifications[i].SensitiveText ? aNewNotifications[i].SensitiveText : aNewNotifications[i].Text,
                            description:aNewNotifications[i].SubTitle ,
                            datetime: utils.formatDate(aNewNotifications[i].CreatedAt),
                            priority: sap.ui.core.Priority[aNewNotifications[i].Priority.charAt(0) + aNewNotifications[i].Priority.substr(1).toLowerCase()],
                            press: function (oEvent) {
                                var sNotificationPathInModel = this.getBindingContext().getPath(),
                                    aPathParts = sNotificationPathInModel.split("/"),
                                    sPathToNotification = "/" + aPathParts[1] + "/" + aPathParts[2],
                                    oNotificationModelEntry = this.getModel().getProperty(sPathToNotification),
                                    sSemanticObject = oNotificationModelEntry.NavigationTargetObject,
                                    sAction = oNotificationModelEntry.NavigationTargetAction,
                                    aParameters = oNotificationModelEntry.NavigationTargetParams,
                                    sNotificationId = oNotificationModelEntry.originalItemId,
                                    oNotificationsService = sap.ushell.Container.getService("Notifications");
                                utils.toExternalWithParameters(sSemanticObject, sAction, aParameters);
                                var oPromise = oNotificationsService.markRead(sNotificationId);
                                oPromise.fail(function () {
                                    sap.ushell.Container.getService('Message').error(resources.i18n.getText('notificationsFailedMarkRead'));
                                });
                            },
                            close: function (oEvent) {
                                var sNotificationPathInModel = this.getBindingContext().getPath(),
                                    aPathParts = sNotificationPathInModel.split("/"),
                                    sPathToNotification = "/" + aPathParts[1] + "/" + aPathParts[2],
                                    oNotificationModelEntry = this.getModel().getProperty(sPathToNotification),
                                    sNotificationId = oNotificationModelEntry.originalItemId,
                                    aRecentNotificationsArray = that.oNotificationsPreviewModel.getProperty("/previewNotificationItems"),
                                    oNotificationsService = sap.ushell.Container.getService("Notifications"),
                                    oPromise = oNotificationsService.dismissNotification(sNotificationId);

                                oPromise.done(function () {
                                    //remove item from the notifications preview model
                                    var i;

                                    for (i = 0; i < aRecentNotificationsArray.length; i++) {
                                        if (aRecentNotificationsArray[i].originalItemId === sNotificationId) {
                                            break;
                                        }
                                    }
                                    aRecentNotificationsArray.splice(i, 1);
                                    that.oNotificationsPreviewModel.setProperty("/previewNotificationItems", aRecentNotificationsArray);
                                });

                                oPromise.fail(function () {
                                    sap.ushell.Container.getService('Message').error(resources.i18n.getText('notificationsFailedDismiss'));
                                    that.oNotificationsPreviewModel.setProperty("/previewNotificationItems", aRecentNotificationsArray);
                                });
                            }

                        }).addStyleClass("sapUshellNotificationsListItem");

                        aNewNotificationsIds.push({
                            previewItemId: oNotificationItem.getId(),
                            originalItemId: aNewNotifications[i].Id,
                            originalTimestamp: aNewNotifications[i].CreatedAt,
                            NavigationTargetObject: aNewNotifications[i].NavigationTargetObject,
                            NavigationTargetAction: aNewNotifications[i].NavigationTargetAction,
                            NavigationTargetParams: aNewNotifications[i].NavigationTargetParams
                        });

                        //don't show preview notification when notification view is active

                        viewPortContainer = sap.ui.getCore().byId('viewPortContainer');

                        if (viewPortContainer.getCurrentState() === "RightCenter") {
                            oNotificationItem.addStyleClass("sapUshellRightFloatingContainerItemBounceOut");
                        }
                    }

                    // Check if there were any notifications in the model's previewNotificationItems property,
                    // if not - simply assign the new ones
                    if (aRecentNotificationsArray.length === 0) {
                        that.oNotificationsPreviewModel.setProperty("/previewNotificationItems", aNewNotificationsIds);
                        this._disableNotificationPreviewBouncingAnimation(oNotificationsPreview);
                        return;
                    }

                    // For each new notification - remove an old one from the model (if there are already 5) and add the new one
                    // The For loop counts backwards since the aNewNotifications has the most recent object in index 0
                    //  and we would like to be the last that is put in previewNotificationItems
                    for (index = aNewNotificationsIds.length - 1; index > -1; index--) {

                        // there may be temporary situation where the recent-array size is larger then the max allowed number
                        // as the redundant notifications are popped out using time-out of one second
                        if (aRecentNotificationsArray.length >= iRequiredNotificationsNumber) {
                            setTimeout(function () {
                                aRecentNotificationsArray.pop();
                                that.oNotificationsPreviewModel.setProperty("/previewNotificationItems", aRecentNotificationsArray);
                            }, 1000);
                        }
                        if (aNewNotificationsIds[index].originalTimestamp > aRecentNotificationsArray[0].originalTimestamp) {
                            aRecentNotificationsArray.unshift(aNewNotificationsIds[index]);
                        } else {
                            aRecentNotificationsArray.push(aNewNotificationsIds[index]);
                        }
                    }
                    that.oNotificationsPreviewModel.setProperty("/previewNotificationItems", aRecentNotificationsArray);
                    this._disableNotificationPreviewBouncingAnimation(oNotificationsPreview);

                }.bind(this)).fail(function () {
                });
            },

            _disableNotificationPreviewBouncingAnimation: function (oNotificationsPreview) {
                if (!this.isNotificationPreviewLoaded) {
                    this.isNotificationPreviewLoaded = true;
                    oNotificationsPreview.setEnableBounceAnimations(false);
                }
            },

            _handleNotificationsPreviewVisibility: function (bEnableNotificationsPreview) {
                var sCurrentViewPortState = this.oRenderer.getCurrentViewportState(),
                    bIsCenter = sCurrentViewPortState === 'Center',
                    oNotificationSrvc = sap.ushell.Container.getService('Notifications');

                sap.ui.getCore().getEventBus().publish("shell", "setPlaceForNotificationsPreview", {EnableNotificationsPreview: bEnableNotificationsPreview});

                bEnableNotificationsPreview = bEnableNotificationsPreview && bIsCenter;
                if (bEnableNotificationsPreview) {
                    if (!this.bNotificationsRegistered) {
                        oNotificationSrvc.registerNotificationsUpdateCallback(this._notificationsUpdateCallback.bind(this));
                        this.bNotificationsRegistered = true;
                    }
                    // If the first Notifications read already happened, then this registration is too late and we missed the data of the first read
                    if (oNotificationSrvc.isFirstDataLoaded()) {
                        setTimeout(function () {
                            if (this.oController && this.oController._notificationsUpdateCallback) {
                                this.oController._notificationsUpdateCallback();
                            }
                        }.bind(this), 300);
                    }
                    if (!this.bSubscribedToViewportStateSwitch) {
                        this.bHeadsupNotificationsInitialyVisible = this.oRenderer.getRightFloatingContainerVisibility();
                        sap.ui.getCore().getEventBus().subscribe("launchpad", "afterSwitchState", this._handleViewportStateSwitch, this);
                        this.bSubscribedToViewportStateSwitch = true;
                    }
                    this._handleHeadsupNotificationsPresentation(sCurrentViewPortState);
                }

                return bEnableNotificationsPreview;
            },

            _handleViewportStateSwitch: function (sChannelId, sEventId, oData) {
                var sCurrentViewportState = oData.getParameter('to');
                //this._handleHeadsupNotificationsPresentation(sCurrentViewportState);

                if (sCurrentViewportState == 'Center') {
                    var oNotificationsPreviewContainer = sap.ui.getCore().byId("notifications-preview-container");
                    if (oNotificationsPreviewContainer && oNotificationsPreviewContainer.setFloatingContainerItemsVisiblity) {
                        oNotificationsPreviewContainer.setFloatingContainerItemsVisiblity(true);
                    }

                }
            },

            _handleHeadsupNotificationsPresentation : function (sCurrentViewPortState) {
                var bIsCenterViewportState = sCurrentViewPortState === 'Center',
                    oPreviewNotificationsContainerDomRef = this.oPreviewNotificationsContainer.getDomRef(),
                    oHeadsupNotificationsContainerBoundingRect = oPreviewNotificationsContainerDomRef && oPreviewNotificationsContainerDomRef.getBoundingClientRect(),
                    bPreviewContainerNotInViewport = oHeadsupNotificationsContainerBoundingRect ? oHeadsupNotificationsContainerBoundingRect.bottom < 0 : false,
                    bShowHeadsupNotificationsContainer = bIsCenterViewportState ? bPreviewContainerNotInViewport : this.bHeadsupNotificationsInitialyVisible;

                this.oRenderer.showRightFloatingContainer(bShowHeadsupNotificationsContainer);
            },

            /**
             *
             *
             */
            _handleAlerts: function (sChannelId, sEventId, aNewNotifications) {
                var iNotificationsIndex;

                //do not display notifications on Dashboard center view port (home and center) and on RightCenter Notification screen/ This is a hack untill the shell model will handle the viewport.
                if (this.oRenderer.getViewPortContainerCurrentState() !== 'RightCenter') {
                    for (iNotificationsIndex = 0; iNotificationsIndex < aNewNotifications.length; iNotificationsIndex++) {
                        this.handleNotification(aNewNotifications[iNotificationsIndex]);
                    }
                }
            },

            /**
             *
             *
             */
            handleNotification: function (oNotification) {
                //create an element of RightFloatingContainer
                var oAlertEntry = this.oRenderer.addRightFloatingContainerItem(
                    {
                        press: function (oEvent) {
                            var viewPortContainer = sap.ui.getCore().byId('viewPortContainer');

                            if (window.hasher.getHash() === oNotification.NavigationTargetObject + "-" + oNotification.NavigationTargetAction) {
                                viewPortContainer.switchState("Center");
                            } else {
                                utils.toExternalWithParameters(
                                    oNotification.NavigationTargetObject,
                                    oNotification.NavigationTargetAction,
                                    oNotification.NavigationTargetParams
                                );
                            }
                            sap.ushell.Container.getService("Notifications").markRead(oNotification.Id);
                        },
                        datetime: resources.i18n.getText("notification_arrival_time_now"),
                        title: oNotification.SensitiveText ? oNotification.SensitiveText : oNotification.Text,
                        description: oNotification.SubTitle,
                        unread: oNotification.IsRead,
                        priority: "High",
                        hideShowMoreButton: true
                    },
                    true,
                    true
                );

                setTimeout(function () {
                    this.oRenderer.removeRightFloatingContainerItem(oAlertEntry.getId(), true);
                }, 3500);
            },

            /**
             * Notifications count (badge) callback function for notifications update.
             * Called by Notifications service after fetching new notifications data.
             * The update of the badge number depends on the given oDependencyPromise only in case of RightCenter viewport,
             * because in this case we would like to synchronize between badge update and the notifications list
             *
             * @param oDependencyPromise deferred.promise object that can be used for waiting
             *  until some other relevant functionality finishes execution.
             */
            notificationsCountUpdateCallback: function (oDependencyPromise) {
                var that = this,
                    sViewPort = this.oRenderer.getViewPortContainerCurrentState(),
                    bIsRightCenterViewPort = sViewPort === "RightCenter" ? true : false;

                if ((oDependencyPromise === undefined) || (!bIsRightCenterViewPort)) {
                    this._updateBadge();
                } else {
                    // Update the badge only after the deferred object of oDependencyPromise is resolved.
                    // this way we sync between the (late) update of the list and the update of the badge
                    oDependencyPromise.done(function () {
                        that._updateBadge();
                    });
                }
            },

            _updateBadge : function () {
                var notificationsCounterValue;

                sap.ushell.Container.getService("Notifications").getUnseenNotificationsCount().done(function (iNumberOfNotifications) {
                    notificationsCounterValue = parseInt(iNumberOfNotifications, 10);
                    sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().setProperty('/notificationsCount', notificationsCounterValue);
                }).fail(function (data) {
                    jQuery.sap.log.error("Shell.controller - call to notificationsService.getCount failed: ", data, "sap.ushell.renderers.lean.Shell");
                });
            },

            /**
             *
             *
             */
            _switchToNotificationView: function (oSource) {
                this.oRenderer.ViewPortContainerNavTo('rightViewPort', "notificationsView", 'show');
                this.oRenderer.switchViewPortStateByControl(oSource, "RightCenter");
                sap.ui.getCore().getEventBus().publish("launchpad", "notificationViewOpened");
            },

            /**
             *
             *
             */
            _switchToNotificationViewWithPreview: function (oNotificationsPreviewContainer, sAnimationMode, oSource) {
                if (sAnimationMode === 'minimal') {
                    this._switchToNotificationView(oSource);
                } else {
                    var itemsCount = oNotificationsPreviewContainer.getFloatingContainerItems().length;

                    setTimeout(function () {
                        this._switchToNotificationView(oSource);
                    }.bind(this), 300 + (itemsCount * 100));
                }
            },

            _updateNotificationConfiguration: function (sChannelId, sEventId, oData) {
                var oRendererConfig = this.oRenderer.getModelConfiguration(),
                    oDevice = sap.ui.Device,
                    bEnableNotificationsUI = oRendererConfig.enableNotificationsUI,
                    bNotificationServiceEnabled = sap.ushell.Container.getService("Notifications").isEnabled(),
                    bNotificationSupportedAppState = oRendererConfig.appState !== "embedded" && oRendererConfig.appState !== "headerless" && oRendererConfig.appState !== "merged" && oRendererConfig.appState !== "standalone",
                    oDevice = sap.ui.Device,
                    bUserPreviewNotificationEnabled = true,
                    bPreviewNotificationEnabledConfig = true,
                    oNotificationUserFlagsPromise,
                    bEligibleDeviceForPreview = oDevice.system.desktop || sap.ui.Device.system.tablet || sap.ui.Device.system.combi,
                    oPreviewFlags = {};

                if (bNotificationServiceEnabled === true) {
                    // Getting user settings flags from Notifications service and settings the model with the preview (user) enabling flag
                    oNotificationUserFlagsPromise = sap.ushell.Container.getService("Notifications").getUserSettingsFlags();

                    oNotificationUserFlagsPromise.done(function (oNotificationUserFlags) {
                        bUserPreviewNotificationEnabled = oNotificationUserFlags.previewNotificationEnabled;

                        oPreviewFlags.bUserEnableNotificationsPreview = bUserPreviewNotificationEnabled;
                        oPreviewFlags.bConfigEnableNotificationsPreview = bPreviewNotificationEnabledConfig;
                        oPreviewFlags.bMainFlagExists = false;

                        if (bPreviewNotificationEnabledConfig && bEnableNotificationsUI && bNotificationServiceEnabled &&
                            bEligibleDeviceForPreview && bNotificationSupportedAppState) {
                            oPreviewFlags.bMainFlagExists = true;
                            oPreviewFlags.bEnableNotificationsPreview = bUserPreviewNotificationEnabled;
                        }

                        sap.ui.getCore().getEventBus().publish("shell", "changeNotificationPreview", oPreviewFlags);
                    });
                }
            },

            /**
             *
             *
             */
            exit : function () {
                sap.ui.getCore().getEventBus().unsubscribe("sap.ushell.services.Notifications", "onNewNotifications", this._handleAlerts, this);
                sap.ui.getCore().getEventBus().unsubscribe("sap.ushell.services.Notifications", "enablePreviewNotificationChanged", this._updateNotificationConfiguration, this);
                if (this.bSubscribedToViewportStateSwitch) {
                    sap.ui.getCore().getEventBus().unsubscribe("launchpad", "afterSwitchState", this._handleViewportStateSwitch, this);
                    this.bSubscribedToViewportStateSwitch = false;
                }
                if (sap.ushell.Container) {
                    if (sap.ushell.Container.getService("Notifications").isEnabled() === true) {
                        sap.ushell.Container.getService("Notifications").destroy();
                    }
                }

                this.oPreviewNotificationsContainerPlaceholder.destroy();
                this.oPreviewNotificationsContainer.destroy();
            }
        });

        function fnHandleToggleNotificationsView (oSource, bShow) {

            bShow = !!bShow;

            if (oSource.getSelected() === bShow) {
                return;
            }

            var oNotificationView,
                oNotificationsPreviewContainer = sap.ui.getCore().byId("notifications-preview-container"),
                sAnimationMode = sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().getProperty('/animationMode') || 'full';

            //add notification view
            if (this.oDefConfig.view && this.bIsViewCreated == false) {
                oNotificationView = sap.ui.view("notificationsView", {
                    viewName: "sap.ushell.components.shell.Notifications.Notifications",
                    type: 'JS',
                    viewData: {}
                });

                this.bIsViewCreated = true;

                if (this.oDefConfig.view.position === "right") {
                    this.oRenderer.addRightViewPort(oNotificationView);
                } else {
                    this.oRenderer.addLeftViewPort(oNotificationView);
                }
            }

            // Hide MeArea
            EventHub.emit('showMeArea', false);

            // If button is already selected (pressed)
            this.oRenderer.setNotificationsSelected(oSource.getSelected());
            if (this.oRenderer.getNotificationsSelected() === true) {
                this.oRenderer.switchViewPortStateByControl(oSource, "Center");
            } else {
                sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().setProperty("/notificationsCount", 0);
                //TODO : REMOVE THE CALL FOR THIS CONTROL FROM THE SHELL!!!! (oNotificationsPreviewContainer)
                if (oNotificationsPreviewContainer) {
                    oNotificationsPreviewContainer.setFloatingContainerItemsVisiblity(false);
                    this._switchToNotificationViewWithPreview(oNotificationsPreviewContainer, sAnimationMode, oSource);
                } else {
                    this._switchToNotificationView(oSource);
                }
            }

            this.oRenderer.setNotificationsSelected(!this.oRenderer.getNotificationsSelected());
            oSource.setSelected(this.oRenderer.getNotificationsSelected());

            sap.ushell.Container.getService("Notifications").notificationsSeen();
            sap.ushell.Container.getRenderer("fiori2").oShellModel.getModel().setProperty("/notificationsCount", 0);
            jQuery(oSource.getDomRef()).attr("aria-pressed", this.oRenderer.getNotificationsSelected());
            jQuery(oSource.getDomRef()).attr("aria-label", resources.i18n.getText("NotificationToggleButtonCollapsedNoNotifications"));
        }

    });
},
	"sap/ushell/components/shell/Notifications/Notifications.controller.js":function(){// ${copyright}

sap.ui.define(['sap/ushell/utils'],
	function(utils) {
	"use strict";

    /*global jQuery, sap, console, window, hasher*/
    /*jslint plusplus: true, nomen: true*/
    sap.ui.controller("sap.ushell.components.shell.Notifications.Notifications", {

        oPagingConfiguration: {
            MAX_NOTIFICATION_ITEMS_DESKTOP: 400,
            MAX_NOTIFICATION_ITEMS_MOBILE: 100,
            MIN_NOTIFICATION_ITEMS_PER_BUFFER: 15,
            // Approximate height of notification item according to the device
            NOTIFICATION_ITEM_HEIGHT: (sap.ui.Device.system.phone || sap.ui.Device.system.tablet) ? 130 : 100,
            // Approximate height of the area above the notifications list
            TAB_BAR_HEIGHT: 100
        },

        /**
         * Initializing Notifications view/controller with ByDate/descending tab in front
         *
         * Main steps:
         * 1. The model is filled with an entry (all properties are initially empty) for each sorting type
         * 2. Gets first buffer of notification items ByDate/descending
         * 3. Sets the first data buffer to the model
         */
        onInit: function () {
            var oInitialModelStructure = {};

            this.iMaxNotificationItemsForDevice = sap.ui.Device.system.desktop ? this.oPagingConfiguration.MAX_NOTIFICATION_ITEMS_DESKTOP : this.oPagingConfiguration.MAX_NOTIFICATION_ITEMS_MOBILE;

            this.oNotificationsService = sap.ushell.Container.getService("Notifications");
            this.oSortingType = this.oNotificationsService.getOperationEnum();

            oInitialModelStructure[this.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING] = this.getInitialSortingModelStructure();
            oInitialModelStructure[this.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING] = this.getInitialSortingModelStructure();
            oInitialModelStructure[this.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING] = this.getInitialSortingModelStructure();
            oInitialModelStructure[this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING] = {};

            this.sCurrentSorting = this.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING;

            //  For byType sorting: keeps the currently expended group/Notification type
            this.sCurrentExpandedType = undefined;

            var oModel = new sap.ui.model.json.JSONModel(oInitialModelStructure);
            oModel.setSizeLimit(1500);
            // Initializing the model with a branch for each sorting type
            this.getView().setModel(oModel);

            // Get the first buffer of notification items, byDate (descending)
            this.getNextBuffer();

            this._oTopNotificationData = undefined;
        },
        /*
         * check if the get next buffer should fetch more notifications
         */
        shouldFetchMoreNotifications: function () {
            var bHasMoreItemsInBackend = this.getView().getModel().getProperty("/" + this.sCurrentSorting + "/hasMoreItemsInBackend"),
                bListMaxReached = this.getView().getModel().getProperty("/" + this.sCurrentSorting + "/listMaxReached");
            return bHasMoreItemsInBackend && !bListMaxReached;
        },
        /**
         * Gets a buffer of notification items from notification service, according to the current sorting type
         */
        getNextBuffer: function () {
            var aCurrentItems = this.getItemsFromModel(this.sCurrentSorting),
                iNumberOfItemsInModel,
                oPromise,
                iNumberOfItemsToFetch;


            if (!this.shouldFetchMoreNotifications()) {
                return;
            }

            iNumberOfItemsToFetch = this.getNumberOfItemsToFetchOnScroll();
            if (iNumberOfItemsToFetch === 0) {
                this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/hasMoreItems", false);
                return;
            }

            if (aCurrentItems !== undefined) {
                iNumberOfItemsInModel = aCurrentItems.length;
            }

            if (iNumberOfItemsInModel === 0) {
                this.addBusyIndicatorToTabFilter(true);
            }

            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/inUpdate", true);

            // Fetch a buffer of notification items from notification service
            oPromise = this.oNotificationsService.getNotificationsBufferBySortingType(this.sCurrentSorting, iNumberOfItemsInModel, iNumberOfItemsToFetch);

            oPromise.done(function (oResult) {
                var dNotificationsUserSettingsAvalaibility = this.oNotificationsService._getNotificationSettingsAvalability();
                if (dNotificationsUserSettingsAvalaibility.state() == "pending"){
                    this.oNotificationsService._userSettingInitialization();
                }
                this.addBufferToModel(oResult);
            }.bind(this));

            oPromise.fail(function (oResult) {
                if (iNumberOfItemsInModel === 0) {
                    this.handleError();
                }
            }.bind(this));
        },
        /**
         * Gets a buffer of notification items of specific type from notification service
         */
        getNextBufferForType: function () {
            var selectedTypeId = this.sCurrentExpandedType,
                sSotringType = this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING,
                oGroup = this.getGroupFromModel(selectedTypeId),
                aCurrentItems = oGroup ? oGroup.aNotifications : undefined,
                iNumberOfItemsInModel = 0,
                oPromise,
                bHasMoreItems = oGroup.hasMoreItems;

            // If there are no more notification items (in the backend) for this sorting type - then return
            if (!bHasMoreItems) {
                return;
            }
            if (aCurrentItems !== undefined) {
                iNumberOfItemsInModel = aCurrentItems.length;
            }

            this.getView().getModel().setProperty("/" + sSotringType + "/inUpdate", true);

            // Fetch a buffer of notification items from notification service
            oPromise = this.oNotificationsService.getNotificationsBufferInGroup(selectedTypeId, iNumberOfItemsInModel, this.getBasicBufferSize());

            oPromise.done(function (oResult) {
                this.addTypeBufferToModel(selectedTypeId, oResult, false);
            }.bind(this));

            oPromise.fail(function (oResult) {
                this.getNextBufferFailHandler(sSotringType);
            }.bind(this));
        },
        addTypeHeadersToModel: function (oResult) {
            var aCurrentHeadersItems = this.getItemsFromModel(this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING),
                iCurrentNumberOfItems = aCurrentHeadersItems.length,
                oResultArr;

            this._oTopNotificationData = undefined;

            if (!oResult) {
                return;
            }
            oResultArr = JSON.parse(oResult).value;
            oResultArr.forEach(function (item, index) {
                item.hasMoreItems = true;
                item.aNotifications = [{"Id": "temp"}];
            });
            this.getView().getModel().setProperty("/" + this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING + "/aGroupHeaders", oResultArr);
            this.getView().getModel().setProperty("/" + this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING + "/inUpdate", false);

            // If this is the first time that items are fetched for this tab\sorting type (no old items) -
            // then the busy indicator was rendered and now needs to be removed
            if (iCurrentNumberOfItems === 0) {
                this.removeBusyIndicatorToTabFilter(false);
            }
        },

        /**
         * Adds a new buffer of notification items to the model in the correct model path according to the specific sorting type.
         * The hasMoreItems flag indicates whether the number of returned items is smaller than the size of the requested buffer,
         *  if so (i.e. oResultObj.value.length < getNumberOfItemsToFetchOnScroll) then there are no more items in the beckend for this sorting type.
         *
         * @param sSotringOption A string representing both the sorting type and the model path to which the new data should be inserted
         * @param oResult The data (notification items) to insert to the model
         */
        addBufferToModel: function (oResult) {
            var aCurrentItems = this.getItemsFromModel(this.sCurrentSorting),
                iCurrentNumberOfItems = aCurrentItems.length,
                mergedArrays,
                hasMoreItems = oResult.length >= this.getNumberOfItemsToFetchOnScroll();

            this._oTopNotificationData = undefined;

            if (!oResult) {
                this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/hasMoreItemsInBackend", false);
                return;
            }

            // If the number of returned items is smaller than the number that was requested -
            // it means that there is no more data (i.e. notification items) in the backend that needs to be fetched for this sorting type

            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/hasMoreItemsInBackend", hasMoreItems);

            mergedArrays = aCurrentItems.concat(oResult);
            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/aNotifications", mergedArrays);
            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/inUpdate", false);
            if (mergedArrays.length >= this.iMaxNotificationItemsForDevice) {
                this.handleMaxReached();
            }

            // If this is the first time that items are fetched for this tab\sorting type (no old items) -
            // then the busy indicator was rendered and now needs to be removed
            if (iCurrentNumberOfItems === 0) {
                this.removeBusyIndicatorToTabFilter(true);
            }
        },
        /**
         * Adds a new buffer of notification items to the model in the correct type and path according to the type.
         * The hasMoreItems flag indicates whether the number of returned items is smaller than the size of the requested buffer,
         *  if so (i.e. oResultObj.value.length < getBasicBufferSize()) then there are no more items in the beckend for this sorting type.
         *
         * @param sTypeId A string representing both the type Id
         * @param oResult The data (notification items) to insert to the type model
         */
        addTypeBufferToModel: function (sTypeId, oResult, bOverwrite) {
            var oGroup = this.getGroupFromModel(sTypeId),
                oGroupIndexInModel = this.getGroupIndexFromModel(sTypeId),
                aGroupHeaders = this.getView().getModel().getProperty("/" + this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING ),
                mergedArrays;

            if (!oResult) {
                return;
            }
            // If the number of returned items is smaller than the number that was requested -
            // it means that there is no more data (i.e. notification items) in the backend that needs to be fetched for this sorting type
            // if (oResultObj.value.length < this.getBasicBufferSize()) {
            if (oResult.length < this.getBasicBufferSize()) {
                oGroup.hasMoreItems = false;
            }
            //mergedArrays = aCurrentItems.concat(oResultObj.value);
            if (!oGroup.aNotifications || bOverwrite) {
                oGroup.aNotifications = [];
            }
            mergedArrays = oGroup.aNotifications.concat(oResult);
            aGroupHeaders[oGroupIndexInModel].aNotifications = mergedArrays;
            aGroupHeaders[oGroupIndexInModel].Busy = false;

            this.getView().getModel().setProperty("/" + this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING, aGroupHeaders);
            this.getView().getModel().setProperty("/" + this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING + "/inUpdate", false);

        },

        keydownHandler: function (keyup, bFocusPassedFirstTime) {
            var jqElement,
                nextElem,
                closeBtn;

            switch (keyup.keyCode) {
            case jQuery.sap.KeyCodes.DELETE: // Delete
                jqElement = jQuery(document.activeElement);
                if (jqElement.hasClass('sapUshellNotificationsListItem')) {
                    nextElem = jqElement.next();
                    closeBtn = jqElement.find(".sapMNLB-CloseButton")[0];
                    sap.ui.getCore().byId(closeBtn.id).firePress();

                    //set focus on the next list item.
                    if (nextElem) {
                        nextElem.focus();
                    }
                }
                break;
            }
        },

        /**
         * Called by notification service for handling notifications update
         *
         * - Registered as callback using a call to this.oNotificationsService.registerNotificationsUpdateCallback
         * - Called by Notifications service when updated notifications data is obtained
         * - Gets the updated notifications array and sets the model accordingly
         */
        notificationsUpdateCallback: function (oDependenciesDeferred) {
            var that = this,
                aCurrentItems,
                iNumberOfItemsInModel,
                iNumberOfItemsToFetch;

            if (this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING) {
                this.notificationsUpdateCallbackForType();

                // If there is any flow in any module that depends on this flow - release it
                // see notification service private API registerDependencyNotificationsUpdateCallback
                oDependenciesDeferred.resolve();
                return;
            }

            aCurrentItems = this.getItemsFromModel(this.sCurrentSorting);
            if (aCurrentItems !== undefined) {
                iNumberOfItemsInModel = aCurrentItems.length;
            }


            // On update, only the current tab/sorting should maintain its previous data, while other tabs (i.e. the model branch) should be emptied
            this.cleanModel();

            iNumberOfItemsToFetch = this.getNumberOfItemsToFetchOnUpdate(iNumberOfItemsInModel);

            this.oNotificationsService.getNotificationsBufferBySortingType(this.sCurrentSorting, 0, iNumberOfItemsToFetch).done(function (aNotifications) {

                if (!aNotifications) {
                    return;
                }

                // If there is any flow in any module that depends on this flow - release it
                // see notification service private API registerDependencyNotificationsUpdateCallback
                oDependenciesDeferred.resolve();

                // Updating the model with the updated array of notification objects
                that.replaceItemsInModel(aNotifications, iNumberOfItemsToFetch);

            }).fail(function (data) {
                jQuery.sap.log.error("Notifications control - call to notificationsService.getNotificationsBufferBySortingType failed: ",
                    data,
                    "sap.ushell.components.shell.Notifications.Notifications");
            });
        },
        getSelectedList: function () {
            var oSelectedList;
            if (this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING) {
                oSelectedList = this.getView().oNotificationsListPriority;
            } else {
                oSelectedList = this.getView().oNotificationsListDate;
            }
            return oSelectedList;
        },
        isMoreCircleExist: function () {
            var oSelectedList = this.getSelectedList(),
                iItemsLength = oSelectedList.getItems().length,
                oLastItem = oSelectedList.getItems()[iItemsLength-1];
            return !!iItemsLength && oLastItem.getMetadata().getName() === "sap.m.CustomListItem";
        },
        handleMaxReached: function () {
            var oSelectedList = this.getSelectedList(),
                iNotificationCount = Math.floor(this.oNotificationsService.getNotificationsCount()),
                iMoreNotificationsNumber = iNotificationCount - this.iMaxNotificationItemsForDevice,
                bIsMoreCircleExist = this.isMoreCircleExist();

            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/moreNotificationCount", iMoreNotificationsNumber);
            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/listMaxReached", iMoreNotificationsNumber >= 0);
            if (iMoreNotificationsNumber > 0 && !bIsMoreCircleExist) {
                oSelectedList.addItem(this.getView().getMoreCircle(this.sCurrentSorting));
            } else if (iMoreNotificationsNumber <= 0 && bIsMoreCircleExist) {
                oSelectedList.removeItem(this.getView().oMoreListItem);
            }

        },
        reAddFailedGroup: function (oGroupToAdd) {
            var oModel = this.getView().getModel(),
                aGroups = oModel.getProperty('/notificationsByTypeDescending');

            aGroups.splice(oGroupToAdd.removedGroupIndex, 0, oGroupToAdd.oGroup);
            oModel.setProperty('/notificationsByTypeDescending', aGroups);
        },

        removeGroupFromModel: function (oGroupToDelete) {
            var oModel = this.getView().getModel(),
                aGroups = oModel.getProperty('/notificationsByTypeDescending'),
                oRemovedGroup = {
                    oGroup: oGroupToDelete,
                    removedGroupIndex: undefined
                };

            aGroups.some(function (oGroup, iIndex) {
                if (oGroup.Id === oGroupToDelete.Id) {
                    oRemovedGroup.removedGroupIndex = iIndex;
                    aGroups.splice(iIndex, 1);
                    oModel.setProperty('/notificationsByTypeDescending', aGroups);

                    return true;
                }

                return false;
            });
            this.sCurrentExpandedType = undefined;
            return oRemovedGroup;

        },

        updateGroupHeaders :function () {
            var oPromise = this.oNotificationsService.getNotificationsGroupHeaders(),
                that = this,
                aGroups = that.getView().getModel().getProperty("/" + that.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING);
            oPromise.fail(function (data) {
                jQuery.sap.log.error("Notifications control - call to notificationsService.updateGroupHeaders failed: ",
                    data,
                    "sap.ushell.components.shell.Notifications.Notifications");
            });
            oPromise.done(function (notificationsByType) {
                var oJson = JSON.parse(notificationsByType),
                    arr = oJson.value;


                arr.forEach(function (item, index) {
                    var bFound = false;
                    aGroups.forEach(function (group, iIndex) {
                        if (group.Id === item.Id) {
                            aGroups[iIndex].GroupHeaderText = item.GroupHeaderText;
                            aGroups[iIndex].CreatedAt = item.CreatedAt;
                            bFound = true;
                        }
                    });
                    if (!bFound) {
                        aGroups.unshift(item);
                    }
                });
                that.getView().getModel().setProperty("/" + that.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING, aGroups);
            });
        },
        reloadGroupHeaders: function () {
            var oPromise = this.oNotificationsService.getNotificationsGroupHeaders(),
                that = this;
            oPromise.fail(function (data) {
                jQuery.sap.log.error("Notifications control - call to notificationsService.getNotificationsGroupHeaders failed: ",
                    data,
                    "sap.ushell.components.shell.Notifications.Notifications");
                that.replaceBusyIndicatorWithNotificationsList();
            });
            oPromise.done(function (notificationsByType) {
                var oJson = JSON.parse(notificationsByType),
                    arr = oJson.value,
                    result = [],
                    lastIndex = -1;
                arr.forEach(function (item, index) {
                    if (item.IsGroupHeader) {
                        item.Collapsed = true;
                        result.push(item);
                        lastIndex = lastIndex + 1;
                    } else {
                        if (result[lastIndex]) {
                            if (!result[lastIndex].notifications) {
                                result[lastIndex].notifications = [];
                            }
                            result[lastIndex].notifications.push(item);
                        }
                    }
                });
                that.getView().getModel().setProperty("/" + that.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING , result);
                that.replaceBusyIndicatorWithNotificationsList();
            });
        },

        markRead: function (sNotificationId) {
            var oPromise = this.oNotificationsService.markRead(sNotificationId),
                that = this;
            oPromise.fail(function () {
                sap.ushell.Container.getService('Message').error(sap.ushell.resources.i18n.getText('notificationsFailedMarkRead'));
                that.setMarkReadOnModel(sNotificationId, false);
            });
            this.setMarkReadOnModel(sNotificationId, true);
        },

        onExit: function () {
            this.getView().oBusyIndicator.destroy();
        },

        onBeforeRendering: function () {
            this.oNotificationsService.registerDependencyNotificationsUpdateCallback(this.notificationsUpdateCallback.bind(this), false);
        },

        //*********************************************************************************************************
        //************************************** Notification actions *********************************************

        executeAction: function (sNotificationId, sActionName) {
            return this.oNotificationsService.executeAction(sNotificationId, sActionName);
        },

        executeBulkAction: function (aNotificationIds, sActionName, sActionText, oGroup, sNotificationPathInModel, sPathToNotification) {
            var oThatGroup = oGroup,
                oPromise = this.oNotificationsService.executeBulkAction(oGroup.Id, sActionName),
                sMessage,
                sGroupActionText = sActionText,
                sNotificationTypeDesc = this.getView().getModel().getProperty(sPathToNotification + "/NotificationTypeDesc"),
                that = this;

            if (sNotificationTypeDesc === "") {
                sNotificationTypeDesc = this.getView().getModel().getProperty(sPathToNotification + "/NotificationTypeKey");
            }
            oPromise.fail(function (oResult) {
                this.getView().getModel().setProperty(sNotificationPathInModel + "/Busy", false);

                oThatGroup.notifications.forEach(function (item, index) {
                    //remove busy for the notification items.
                    this.getView().getModel().setProperty(sPathToNotification + "/Busy", false);
                }.bind(this));


                if (oResult && oResult.succededNotifications && oResult.succededNotifications.length) {
                    oResult.succededNotifications.forEach(function (sNotificationId, index) {
                        this.removeNotificationFromModel(sNotificationId);
                    }.bind(this));
                    //There is need to load again the other 2 tabs, therefore we need to "clean"  other models.
                    that.cleanModel();
                }

                if (oResult.succededNotifications.length === 1) {
                    sMessage = sap.ushell.resources.i18n.getText("notificationsPartialSuccessExecuteBulkAction", [
                        sGroupActionText, oResult.succededNotifications.length, oResult.failedNotifications.length + oResult.succededNotifications.length, sNotificationTypeDesc, oResult.failedNotifications.length
                    ]);
                    sap.m.MessageToast.show(sMessage, {duration: 4000});
                } else if (oResult.succededNotifications.length > 1) {
                    sMessage = sap.ushell.resources.i18n.getText("notificationsSingleSuccessExecuteBulkAction", [
                        sGroupActionText, oResult.succededNotifications.length, oResult.failedNotifications.length + oResult.succededNotifications.length, sNotificationTypeDesc, oResult.failedNotifications.length
                    ]);
                    sap.m.MessageToast.show(sMessage, {duration: 4000});
                } else {
                    sMessage = sap.ushell.resources.i18n.getText("notificationsFailedExecuteBulkAction");
                    sap.ushell.Container.getService('Message').error(sMessage);
                }

            }.bind(this));

            oPromise.done(function () {
                sMessage = sap.ushell.resources.i18n.getText("notificationsSuccessExecuteBulkAction", [
                    sGroupActionText, sNotificationTypeDesc
                ]);
                sap.m.MessageToast.show(sMessage, {duration: 4000});
                this.removeGroupFromModel(oThatGroup);
                //There is need to load again the other 2 tabs, therefore we need to "clean"  other models.
                this.cleanModel();
            }.bind(this));
        },

        dismissNotification: function (notificationId) {
            //if the service call is successful, we will get the updated model from the service
            //via the standard update.
            //if the operation fails, the model won't be changed, so we just need to call
            //"updateItems" on the list, since the model contains the dismissed notification.
            var that = this,
                oRemovedNotification = this.removeNotificationFromModel(notificationId),
                oPromise = this.oNotificationsService.dismissNotification(notificationId);
            //There is need to load again the other 2 tabs, therefore we need to "clean"  other models.
            this.cleanModel();
            oPromise.fail(function () {
                sap.ushell.Container.getService('Message').error(sap.ushell.resources.i18n.getText('notificationsFailedDismiss'));
                that.addNotificationToModel(oRemovedNotification.obj, oRemovedNotification.index);
            });
        },

        dismissBulkNotifications: function (aNotificationIds, oGroup) {
            var oRemovedGroup = this.removeGroupFromModel(oGroup),
                oPromise = this.oNotificationsService.dismissBulkNotifications(oGroup.Id);
            //There is need to load again the other 2 tabs, therefore we need to "clean"  other models.
            this.cleanModel();
            oPromise.fail(function () {
                sap.ushell.Container.getService('Message').error(sap.ushell.resources.i18n.getText('notificationsFailedExecuteBulkAction'));
                this.reAddFailedGroup(oRemovedGroup);
            }.bind(this));
        },

        onListItemPress: function (sNotificationId, sSemanticObject, sAction, aParameters) {
            var viewPortContainer = sap.ui.getCore().byId('viewPortContainer');

            if (hasher.getHash() === sSemanticObject + "-" + sAction) {
                viewPortContainer.switchState("Center");
            } else {
                utils.toExternalWithParameters(sSemanticObject, sAction, aParameters);
            }
            this.markRead(sNotificationId);
        },

        //*********************************************************************************************************
        //******************************************* Scrolling ***************************************************

        scrollToItem: function (oTopNotificationData) {
            var jqNotificationItems = this._getJqNotificationObjects(),
                jqNotificationContainerContent = jqNotificationItems[0],
                jqNotificationsContent = jqNotificationItems[1],
                jqNotificationsList = jqNotificationItems[2],
                jqNotificationItem = jqNotificationItems[3],
                itemHeight,
                notificationIndex,
                indexOffSet,
                containerPadding,
                notificationContainerOffSet;

            if (jqNotificationContainerContent.length > 0 && jqNotificationsContent.length > 0 && jqNotificationsList.length > 0 && jqNotificationItem.length > 0) {
                itemHeight = jqNotificationItem.outerHeight(true) - window.parseInt(jqNotificationItem.css("margin-top").replace("px", ""));
                notificationIndex = this.getIndexInModelByItemId(oTopNotificationData.topItemId);
                notificationIndex = notificationIndex ? notificationIndex : 0;
                indexOffSet = notificationIndex * itemHeight + window.parseInt(jqNotificationItem.css("margin-top").replace("px", ""));

                containerPadding = window.parseInt(jqNotificationsContent.css("padding-top").replace("px", "")) + window.parseInt(jqNotificationsList.css("padding-top").replace("px", ""));
                notificationContainerOffSet = jqNotificationContainerContent.offset().top;

                jqNotificationContainerContent.scrollTop(indexOffSet + containerPadding + notificationContainerOffSet - oTopNotificationData.offSetTop);
            }
            this._oTopNotificationData = undefined;
        },
        _getJqNotificationObjects: function () {
            var jqNotificationContainerContent = jQuery("#notificationIconTabBar-containerContent"),
                jqNotificationsContent = jqNotificationContainerContent.children(),
                jqNotificationsList = jqNotificationsContent.children(),
                jqNotificationItem = jqNotificationContainerContent.find("li").first();

            return [jqNotificationContainerContent, jqNotificationsContent, jqNotificationsList, jqNotificationItem];
        },
        getTopOffSet: function () {
            var topOffSet = 0,
                jqContainerContent = this._getJqNotificationObjects()[0];
            if (jqContainerContent.children().length > 0 && jqContainerContent.children().children().length > 0) {
                // Get the outer space/margin
                topOffSet += jqContainerContent.children().outerHeight() - jqContainerContent.children().height();
                // Get the inner space/margin
                topOffSet += jqContainerContent.children().children().outerHeight() - jqContainerContent.children().children().height();
            }
            return topOffSet;

        },
        /**
         * Returns the notification ID of the top notification item in the screen, and the actual offset of the element from the top
         */
        getTopItemOnTheScreen: function () {
            // The notifications list control including top offset (until the tabs bar) 
            var jqContainerContent = this._getJqNotificationObjects()[0],
                topOffSet = 0,
                sItemId,
                itemOffsetTop = 0,
                that = this;


            topOffSet = this.getTopOffSet();

            jqContainerContent.find("li").each(function () {
                // The distance between the top of an item from the top of the screen
                itemOffsetTop = jQuery(this).offset().top;
                // Check if this element is in the interested viewport, the first element whose itemOffsetTop is bigger then topOffSet -
                // is the highest visible element in the list
                if (itemOffsetTop >= topOffSet) {
                    sItemId = that.getItemNotificationId(this);
                    return false;
                }
            });
            return {topItemId: sItemId, offSetTop: itemOffsetTop};
        },

        //*********************************************************************************************************
        //***************************************** Error Handling ************************************************

        handleError: function () {
            this.removeBusyIndicatorToTabFilter(true);
            try {
                sap.ushell.Container.getService("Message").error(sap.ushell.resources.i18n.getText("errorOccurredMsg"));
            } catch (e) {
                jQuery.sap.log.error("Getting Message service failed.");
            }
        },

        //*********************************************************************************************************
        //****************************************** Busy Indicator ***********************************************

        addBusyIndicatorToTabFilter: function (bInitialLoading) {
            var oTabFilter = this.getSelectedTabFilter(),
                oIconTabBar = this.getView().oIconTabBar;
            if (bInitialLoading) {
                oIconTabBar.addStyleClass('sapUshellNotificationIconTabByTypeWithBusyIndicator');
                oTabFilter.removeAllContent();
                oTabFilter.addContent(this.getView().oBusyIndicator);
            }
        },
        removeBusyIndicatorToTabFilter: function (bInitialLoading) {
            var oTabFilter = this.getSelectedTabFilter(),
                selectedList;
            if (oTabFilter && bInitialLoading) {
                if (this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING) {
                    selectedList = this.getView().oNotificationsListPriority;
                } else {
                    selectedList = this.getView().oNotificationsListDate;
                }
                oTabFilter.removeContent(this.getView().oBusyIndicator);
                oTabFilter.addContent(selectedList);
            }
        },

        replaceBusyIndicatorWithNotificationsList: function () {
            var oView = this.getView(),
                oTypeTabFilter = oView.oIconTabBar.getItems()[1];
            if (oTypeTabFilter.getContent()[0] === oView.oBusyIndicator) {
                oTypeTabFilter.removeContent(oView.oBusyIndicator);
                oTypeTabFilter.addContent(oView.oNotificationsListType);
            }
        },

        //*********************************************************************************************************
        //***************************************** Model functions ***********************************************

        addNotificationToModel: function (oNotification, index) {
            var oModel = this.getView().getModel(),
                notifications = oModel.getProperty("/" + this.sCurrentSorting + "/aNotifications");
            notifications.splice(index, 0, oNotification);
            oModel.setProperty("/" + this.sCurrentSorting + "/aNotifications", notifications);
        },

        removeNotificationFromModel: function (notificationId) {
            var oModel = this.getView().getModel(),
                index,
                aGroups,
                notifications,
                sNotificationsModelPath,
                oRemovedNotification = {};

            if (this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING ||
                this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING || this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING) {
                sNotificationsModelPath = "/" + this.sCurrentSorting + "/aNotifications";
                notifications = oModel.getProperty(sNotificationsModelPath);
                notifications.some(function (notification, index, array) {
                    if (notification.Id && notification.Id === notificationId) {
                        oRemovedNotification.obj = array.splice(index, 1)[0];
                        oRemovedNotification.index = index;
                        return true;
                    }
                });
                oModel.setProperty(sNotificationsModelPath, notifications);
                return oRemovedNotification;
            }

            aGroups = oModel.getProperty("/notificationsByTypeDescending");
            for (index = 0; index < aGroups.length; index++) {
                notifications = aGroups[index].aNotifications;
                if (notifications) {
                    if (notifications.length === 1 && notifications[0].Id === notificationId) {
                        aGroups.splice(index, 1);
                    } else {
                        notifications.some(function (notification, index, array) {
                            if (notification.Id && notification.Id === notificationId) {
                                oRemovedNotification.obj = array.splice(index, 1)[0];
                                oRemovedNotification.index = index;
                                return true;
                            }
                        });
                        aGroups[index].aNotifications = notifications;
                    }
                }
            }
            //update the header
            this.updateGroupHeaders();
            oModel.setProperty("/notificationsByTypeDescending", aGroups);
            return oRemovedNotification;
        },

        /**
         * Gets notification Id and returns the index of that notification item in the model,
         * in the relevant array (sorting type) of notification
         */
        getIndexInModelByItemId: function (sNotificationId) {
            var aNotifications,
                index;

            if (this.notificationsByTypeDescending === this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING) {
                aNotifications = this.getView().getModel().getProperty("/" + this.sCurrentExpandedType + "/aNotifications");
            } else {
                aNotifications = this.getView().getModel().getProperty("/" + this.sCurrentSorting + "/aNotifications");
            }
            if (aNotifications === undefined || aNotifications.length === 0) {
                return 0;
            }
            for (index = 0; index < aNotifications.length; index++) {
                if (aNotifications[index].Id === sNotificationId) {
                    return index;
                }
            }
        },

        /**
         * Initializes (i.e. empties) the branched in the model of the tabs/sorting which are not the current one
         */
        cleanModel: function () {
            var that = this,
                oSortingTypesArray = this.getView().getModel().getProperty("/");

            if (this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING || this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING) {
                this.getView().oIconTabBar.getItems()[1].removeAllContent();
                this.getView().oIconTabBar.getItems()[2].removeAllContent();
            } else if (this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING) {
                this.getView().oIconTabBar.getItems()[0].removeAllContent();
                this.getView().oIconTabBar.getItems()[1].removeAllContent();
            } else {
                this.getView().oIconTabBar.getItems()[2].removeAllContent();
                this.getView().oIconTabBar.getItems()[0].removeAllContent();
            }

            jQuery.each(oSortingTypesArray, function (index, item) {
                if (index !== that.sCurrentSorting && index !== "notificationsByTypeDescending" ) {
                        oSortingTypesArray[index] = that.getInitialSortingModelStructure();
                    }
            });
            this.getView().getModel().setProperty("/", oSortingTypesArray);
        },

        replaceItemsInModel: function (oResult, iNumberOfItemsToFetch) {
            var aCurrentItems = this.getItemsFromModel(this.sCurrentSorting),
                iCurrentNumberOfItems = aCurrentItems.length,
                hasMoreItemsToFetch = oResult.length >= iNumberOfItemsToFetch;
            if (iCurrentNumberOfItems) {
                this._oTopNotificationData = this.getTopItemOnTheScreen();
            }

            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/hasMoreItemsInBackend", hasMoreItemsToFetch);

            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/aNotifications", oResult);

            this.getView().getModel().setProperty("/" + this.sCurrentSorting + "/inUpdate", false);
            this.handleMaxReached();
        },

        setMarkReadOnModel: function (notificationId, bIsRead) {
            var oModel = this.getView().getModel(),
                notifications = oModel.getProperty("/" + this.sCurrentSorting + "/aNotifications");
            notifications.some(function (notification, index, array) {
                if (notification.Id && notification.Id === notificationId) {
                    notification.IsRead = bIsRead;
                    return true;
                }
            });
            oModel.setProperty("/" + this.sCurrentSorting + "/aNotifications", notifications);
        },

        //*********************************************************************************************************
        //**************************************** Helper functions ***********************************************
        getNumberOfItemsInScreen: function () {
            var iItemsInScreen,
                iHeight = this.getWindowSize();

            iItemsInScreen = (iHeight - this.oPagingConfiguration.TAB_BAR_HEIGHT) / this.oPagingConfiguration.NOTIFICATION_ITEM_HEIGHT;
            return Math.ceil(iItemsInScreen);
        },

        getBasicBufferSize: function () {
            return Math.max(this.getNumberOfItemsInScreen() * 3, this.oPagingConfiguration.MIN_NOTIFICATION_ITEMS_PER_BUFFER);
            //return 300;
        },

        getWindowSize: function () {
            return jQuery(window).height();
        },

        /**
         * Calculates and returns the number of items that should be requested from notification service, as part of the paging policy.
         * The function performs the following:
         *  - Calculated the number of required buffer according to the device / screen size
         *  - If the model already holds the  maximum number of item (per this device) - return 0
         *  - If the number of items in the model plus buffer size is bigger that the maximum - return the biggest possible number of items to fetch
         *  - Regular use case - return buffer size
         */
        getNumberOfItemsToFetchOnScroll: function () {
            var iCurrentNumberOfItems = this.getItemsFromModel(this.sCurrentSorting).length,
                iBasicBufferSize = this.getBasicBufferSize();

            if (iCurrentNumberOfItems >= this.iMaxNotificationItemsForDevice) {
                return 0;
            }
            if (iCurrentNumberOfItems + iBasicBufferSize > this.iMaxNotificationItemsForDevice) {
                return this.iMaxNotificationItemsForDevice - iCurrentNumberOfItems;
            }
            return iBasicBufferSize;
        },

        /**
         * Calculated the number of items that should be required from the backend, according to:
         * - (parameter) The number of items that are already in the model for the relevant sorting type
         * - Basic buffer size
         * The number is rounded up to a product of basic buffer size
         * For example: if a basic buffer size is 50 and there are currently 24 items in the model - then 50 items (size of one basic buffer) are required.
         * @returns The smaller of the two following values:
         *  1. required number of items, which is the number of buffers * buffer size
         *  2. iMaxNotificationItemsForDevice
         */
        getNumberOfItemsToFetchOnUpdate: function (iNumberOfItemsInModel) {
            var iBasicBufferSize = this.getBasicBufferSize(),
                iNumberOfRequiredBasicBuffers = Math.ceil(iNumberOfItemsInModel / iBasicBufferSize),
                iReturnedValue;

            // If the number is less then one basic buffer - then one basic buffer is required
            iReturnedValue = iNumberOfRequiredBasicBuffers > 0 ? iNumberOfRequiredBasicBuffers * iBasicBufferSize : iBasicBufferSize;

            // Return no more then the maximum number of items for this device
            return iReturnedValue > this.iMaxNotificationItemsForDevice ? this.iMaxNotificationItemsForDevice : iReturnedValue;
        },

        getItemsFromModel: function (sortingType) {
            if (sortingType === undefined) {
                sortingType = this.sCurrentSorting;
            }
            return this.getView().getModel().getProperty("/" + sortingType + "/aNotifications");
        },
        getItemsOfTypeFromModel: function (sTypeHeader) {
            var oGroup = this.getGroupFromModel(sTypeHeader);
            if (oGroup) {
                return oGroup.aNotifications ? oGroup.aNotifications : [];
            }
            return [];
        },

        getGroupFromModel: function (sTypeHeader) {
            var aGroupHeaders = this.getView().getModel().getProperty("/" + this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING),
                oGroup;
            aGroupHeaders.some(function (group, index) {
                if (group.Id === sTypeHeader) {
                    oGroup = group;
                    return true;
                }
            });
            return oGroup;
        },
        getGroupIndexFromModel: function (sTypeHeader) {
            var aGroupHeaders = this.getView().getModel().getProperty("/" + this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING ),
                iIndex;
            aGroupHeaders.forEach(function (group, index) {
                if (group.Id === sTypeHeader) {
                    iIndex = index;
                    return true;
                }
            });
            return iIndex;
        },

        /**
         * Return the Notification Id of the given notification item
         */
        getItemNotificationId: function (elNotificationItem) {
            var sItemModelPath,
                sItemNotificationId;
            sItemModelPath = sap.ui.getCore().byId(elNotificationItem.getAttribute("Id")).getBindingContext().sPath;

            sItemNotificationId = this.getView().getModel().getProperty(sItemModelPath + "/Id");
            return sItemNotificationId;

        },

        getInitialSortingModelStructure: function () {
            return {
                hasMoreItemsInBackend: true,
                listMaxReached: false,
                aNotifications: [],
                inUpdate: false,
                moreNotificationCount: ""
            };
        },

        getSelectedTabFilter: function () {
            var oTabFilter;

            if (this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING || this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING) {
                oTabFilter = this.getView().oIconTabBar.getItems()[0];
            } else if (this.sCurrentSorting === this.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING) {
                oTabFilter = this.getView().oIconTabBar.getItems()[2];
            } else {
                oTabFilter = this.getView().oIconTabBar.getItems()[1];
            }

            return oTabFilter;
        },

        triggerRetrieveMoreDataForGroupNotifications: function () {
            if (!this.getModel().getProperty("/" + this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING + "/inUpdate")) {
                var notificationsInModel = this.getItemsOfTypeFromModel(this.sCurrentExpandedType),
                    numberOfNotificationsInModel = notificationsInModel ? notificationsInModel.length : 0,
                    bufferSize = numberOfNotificationsInModel ? this.getBasicBufferSize() : 0,
                    numberOfItemsInThreePages = bufferSize * 3 / 5,
                    indexOfElementInList = Math.floor(numberOfNotificationsInModel - numberOfItemsInThreePages),
                    listItem = this.getView().oNotificationsListDate.getItems()[indexOfElementInList],
                    topOffSet = this.getTopOffSet();

                if (jQuery(listItem.getDomRef()).offset().top <= topOffSet) {
                    this.getNextBufferForType();
                }
            }
        },
        onExpandGroup: function (groupElement) {
            var listItems = this.getView().oNotificationsListType.getItems(),
                groupElementId = groupElement.getId(),
                oGroup = this.getView().getModel().getProperty(groupElement.getBindingContextPath()),
                that = this;
            that.sCurrentExpandedType = oGroup.Id;
            that.getView().getModel().setProperty(groupElement.getBindingContextPath()+"/aNotifications",[]);
            that.getView().getModel().setProperty(groupElement.getBindingContextPath()+"/hasMoreItems",true);
            listItems.forEach(function (item, index) {
                if (item.getId() === groupElementId ) {
                    that.getNextBufferForType();
                } else if (item.getId() !== groupElementId && !item.getCollapsed()) {
                    item.setCollapsed(true);
                    that.getView().getModel().setProperty(item.getBindingContextPath()+"/hasMoreItems",true);

                }
            });
        },
        notificationsUpdateCallbackForType: function () {
            var selectedTypeId = this.sCurrentExpandedType,
                sSortingType = this.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING,
                oGroup = this.getGroupFromModel(selectedTypeId),
                aCurrentItems = oGroup ? oGroup.aNotifications : undefined,
                iNumberOfItemsInModel = 0,
                oPromise;


            if (aCurrentItems !== undefined) {
                iNumberOfItemsInModel = aCurrentItems.length;
            }

            this.getView().getModel().setProperty("/" + sSortingType + "/inUpdate", true);


            //First Fetch the Groups Headers

            this.updateGroupHeaders();

            // Fetch a buffer of notification items from notification service
            if (selectedTypeId) {
                oPromise = this.oNotificationsService.getNotificationsBufferInGroup(selectedTypeId, 0, this.getNumberOfItemsToFetchOnUpdate(iNumberOfItemsInModel));

                oPromise.done(function (oResult) {
                    this.addTypeBufferToModel(selectedTypeId, oResult, true);
                }.bind(this));

                oPromise.fail(function (oResult) {
                    this.getNextBufferFailHandler(oResult);
                }.bind(this));
            }

        },
        handleEmptyList: function () {
            var aItems = this.getItemsFromModel(this.sCurrentSorting);
            if (aItems) {
                this.getSelectedList().toggleStyleClass("sapContrast", !aItems.length);
                this.getSelectedList().toggleStyleClass("sapContrastPlus", !aItems.length);
            }
        }

    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/Notifications/Notifications.view.js":function(){// ${copyright}

/**
 * User notifications View.<br>
 * Located at the right pane of the ViewPortContainer.<br>
 * Includes the list of notifications that can be sorted according to different criteria.<br><br>
 *
 * The main UI controls in the view are:<br>
 *  sap.m.ScrollContainer {id: "notificationsScrollContainer"}<br>
 *  that includes sap.m.Panel {id: "notificationsSorter"} that contains the sorting header bar and the notifications list:<br>
 *    Panel header:  sap.m.Toolbar {id: "sortingToolbar"} that contains sap.m.Button objects, one for each sorting criterion.<br>
 *    Panel content: sap.m.List{id: "notificationsList"} that contains sap.m.NotificationListItem object for each notification object<br>
 */

sap.ui.define(['sap/m/NotificationListItem',
               'sap/m/BusyIndicator',
               'sap/m/Button',
               'sap/m/NotificationListGroup',
               'sap/m/List',
               'sap/m/IconTabFilter',
               'sap/m/IconTabBar',
               'sap/m/Text',
               'sap/m/VBox',
               'sap/m/CustomListItem'],
    function (NotificationListItem, BusyIndicator, Button, NotificationListGroup, List, IconTabFilter, IconTabBar, Text, VBox, CustomListItem) {
        "use strict";

        /*global jQuery, sap, document */
        /*jslint plusplus: true, nomen: true */

        sap.ui.jsview("sap.ushell.components.shell.Notifications.Notifications", {
            createContent: function (oController) {
                var that = this;
                this.oBusyIndicator = new BusyIndicator('notificationsByTypeBusyIndicator', {size: "1rem"});
                this.oPreviousTabKey = "sapUshellNotificationIconTabByDate";
                this.oPreviousByDateSorting = undefined;
                // Define notification action button template
                this.oActionListItemTemplate = new Button({
                    text: "{ActionText}",
                    type: {
                        parts: ["Nature"],
                        formatter: function (nature) {
                            switch (nature) {
                            case "POSITIVE":
                                return "Accept";
                            case "NEGATIVE":
                                return "Reject";
                            default:
                                return "Default";
                            }
                        }
                    },
                    press: function (oEvent) {
                        that.actionButtonPressHandler(oEvent);
                    }
                });

                this.actionButtonPressHandler = function (oEvent) {
                    var sNotificationPathInModel = oEvent.getSource().getBindingContext().getPath(),
                        oNotificationModelPart = this.getModel().getProperty(sNotificationPathInModel),
                        aPathParts = sNotificationPathInModel.split("/"),
                        oTabBarSelectedKey = that.oIconTabBar.getSelectedKey(),
                        sPathToNotification = oTabBarSelectedKey === 'sapUshellNotificationIconTabByType' ? "/" + aPathParts[1] + "/" + aPathParts[2] + "/" + aPathParts[3] + "/" + aPathParts[4] : "/" + aPathParts[1] + "/" + aPathParts[2] + "/" + aPathParts[3],
                        oNotificationModelEntry = this.getModel().getProperty(sPathToNotification),
                        sNotificationId = oNotificationModelEntry.Id;

                    this.oPressActionEventPath = sNotificationPathInModel;
                    this.getModel().setProperty(sPathToNotification + "/Busy", true);

                    oController.executeAction(sNotificationId, oNotificationModelPart.ActionId).done(function (responseAck) {
                        if (responseAck && responseAck.isSucessfull) {
                            sap.ui.require(['sap/m/MessageToast'], function (MessageToast) {
                                if (responseAck.message && responseAck.message.length) {
                                    MessageToast.show(responseAck.message, {duration: 4000});
                                } else {
                                    var sActionModelPath = this.oPressActionEventPath,
                                        oActionModelObject = this.getModel().getProperty(sActionModelPath),
                                        sActionText = oActionModelObject.ActionText;

                                    MessageToast.show(sap.ushell.resources.i18n.getText("ActionAppliedToNotification", sActionText), {duration: 4000});
                                }
                            }.bind(this));

                            // Notification should remain in the UI (after action executed) only if DeleteOnReturn flag exists, and equals false
                            if (responseAck.DeleteOnReturn !== false) {
                                oController.removeNotificationFromModel(sNotificationId);

                                //There is need to load again the other 2 tabs, therefore we need to "clean"  other models.
                                oController.cleanModel();
                            }
                        } else {
                            if (responseAck) {
                                sap.ushell.Container.getService('Message').error(responseAck.message);
                            } else {
                                sap.ushell.Container.getService('Message').error(sap.ushell.resources.i18n.getText('notificationsFailedExecuteAction'));
                            }

                        }
                        this.getModel().setProperty(sPathToNotification + "/Busy", false);
                    }.bind(this)).fail(function () {
                        this.getModel().setProperty(sPathToNotification + "/Busy", false);
                        sap.ushell.Container.getService('Message').error(sap.ushell.resources.i18n.getText('notificationsFailedExecuteAction'));
                    }.bind(this));
                };

                this.oActionGroupItemTemplate = new Button({
                    text: "{GroupActionText}",
                    type: {
                        parts: ["Nature"],
                        formatter: function (nature) {
                            switch (nature) {
                            case "POSITIVE":
                                return "Accept";
                            case "NEGATIVE":
                                return "Reject";
                            default:
                                return "Default";
                            }
                        }
                    },
                    press: function (oEvent) {
                        var sNotificationPathInModel = this.getBindingContext().getPath(),
                            oNotificationModelPart = this.getModel().getProperty(sNotificationPathInModel),
                            aPathParts = sNotificationPathInModel.split("/"),
                            sPathToNotification = "/" + aPathParts[1] + "/" + aPathParts[2],
                            oNotificationModelEntry = this.getModel().getProperty(sPathToNotification),
                            aNotificationIdsInGroup = [];

                        if (oNotificationModelEntry.aNotifications) {
                            oNotificationModelEntry.aNotifications.forEach(function (item, index) {
                                aNotificationIdsInGroup.push(item.Id);
                                //display busy for the notification items.
                                this.getModel().setProperty(sPathToNotification + "/Busy", true);
                            }.bind(this));
                        }

                        //mark the notification group as busy
                        this.getModel().setProperty(sNotificationPathInModel + "/Busy", true);
                        oController.executeBulkAction(aNotificationIdsInGroup, oNotificationModelPart.ActionId, this.getProperty("text"), oNotificationModelEntry, sNotificationPathInModel, sPathToNotification);
                    }
                });
                this.addStyleClass('sapUshellNotificationsView');

                // Define notification list item template
                this.oNotificationListItemTemplate = new NotificationListItem({
                    press: function (oEvent) {
                        var oBindingContext = this.getBindingContext(),
                            oModelPath = oBindingContext.sPath,
                            oModelPart = this.getModel().getProperty(oModelPath),
                            sSemanticObject = oModelPart.NavigationTargetObject,
                            sAction = oModelPart.NavigationTargetAction,
                            aParameters = oModelPart.NavigationTargetParams,
                            sNotificationId = oModelPart.Id;
                        oController.onListItemPress.call(oController, sNotificationId, sSemanticObject, sAction, aParameters);
                    },
                    datetime: {
                        path: "CreatedAt",
                        formatter: sap.ushell.utils.formatDate.bind(oController)
                    },
                    description: "{SubTitle}",
                    title: {
                        parts: ["SensitiveText", "Text"],
                        formatter: function (sensitiveText, text) {
                            return sensitiveText ? sensitiveText : text;
                        }
                    },
                    buttons: {
                        path: "Actions",
                        templateShareable: true,
                        sorter: new sap.ui.model.Sorter('Nature', true),
                        template: this.oActionListItemTemplate
                    },
                    unread: {
                        parts: ["IsRead"],
                        formatter: function (isRead) {
                            return !isRead;
                        }
                    },
                    close: function (oEvent) {
                        var sNotificationPathInModel = this.getBindingContext().getPath(),
                            oNotificationModelEntry = this.getModel().getProperty(sNotificationPathInModel),
                            sNotificationId = oNotificationModelEntry.Id;
                        oController.dismissNotification(sNotificationId);
                    },
                    busy: {
                        parts: ["Busy"],
                        formatter: function (busy) {
                            if (busy) {
                                return busy;
                            }

                            return false;
                        }
                    },
                    priority: {
                        parts: ["Priority"],
                        formatter: function (priority) {
                            if (priority) {
                                priority = priority.charAt(0) + priority.substr(1).toLowerCase();
                                return sap.ui.core.Priority[priority];
                            }
                        }
                    }
                }).addStyleClass("sapUshellNotificationsListItem").addStyleClass('sapContrastPlus').addStyleClass('sapContrast');

                this.oNotificationGroupTemplate = new NotificationListGroup({
                    title: "{GroupHeaderText}",
                    collapsed: "{Collapsed}",
                    showEmptyGroup: true,
                    enableCollapseButtonWhenEmpty: true,
                    datetime: {
                        path: "CreatedAt",
                        formatter: sap.ushell.utils.formatDate.bind(oController)
                    },
                    buttons: {
                        path: "Actions",
                        templateShareable: true,
                        sorter: new sap.ui.model.Sorter('Nature', true),
                        template: this.oActionGroupItemTemplate
                    },
                    items: {
                        path: "aNotifications",
                        template: this.oNotificationListItemTemplate,
                        templateShareable: true
                    },
                    onCollapse: function (oEvent) {
                        var group = oEvent.getSource(),
                            path = group.getBindingContext().getPath();
                        if (!group.getCollapsed()) {
                            that.getModel().setProperty(path + "/Busy", true);
                            that.expandedGroupIndex = path.substring(path.lastIndexOf("/") + 1);
                            oController.onExpandGroup(group);
                        }
                    },
                    close: function (oEvent) {
                        var sNotificationPathInModel = this.getBindingContext().getPath(),
                            aPathParts = sNotificationPathInModel.split("/"),
                            sPathToNotification = "/" + aPathParts[1] + "/" + aPathParts[2],
                            oNotificationModelEntry = this.getModel().getProperty(sPathToNotification),
                            aNotificationIdsInGroup = [];

                        oNotificationModelEntry.aNotifications.forEach(function (item, index) {
                            aNotificationIdsInGroup.push(item.Id);
                        });

                        oController.dismissBulkNotifications(aNotificationIdsInGroup, oNotificationModelEntry);
                    },
                    autoPriority: false,
                    priority: {
                        parts: ["Priority"],
                        formatter: function (priority) {
                            if (priority) {
                                priority = priority.charAt(0) + priority.substr(1).toLowerCase();
                                return sap.ui.core.Priority[priority];
                            }
                        }
                    },
                    busy: {
                        parts: ["Busy"],
                        formatter: function (busy) {
                            if (busy) {
                                return busy;
                            }

                            return false;
                        }
                    }
                });
                this.oNotificationsListDate = new List({
                    id: "sapUshellNotificationsListDate",
                    mode: sap.m.ListMode.None,
                    noDataText: sap.ushell.resources.i18n.getText('noNotificationsMsg'),
                    items: {
                        path: "/notificationsByDateDescending/aNotifications",
                        template: this.oNotificationListItemTemplate,
                        templateShareable: true
                    },
                    growing: true,
                    growingThreshold: 400,
                    growingScrollToLoad: true
                }).addStyleClass("sapUshellNotificationsList");

                this.oNotificationsListDate.onAfterRendering = function () {
                    oController.handleEmptyList();
                    this.oNotificationsListDate.$().parent().parent().scroll(this._triggerRetrieveMoreData.bind(that));

                    if (oController._oTopNotificationData) {
                        oController.scrollToItem(oController._oTopNotificationData);
                    }
                    this.oNotificationsListDate.addStyleClass('sapContrast sapContrastPlus');
                }.bind(this);




                this.oNotificationsListPriority = new List({
                    id: "sapUshellNotificationsListPriority",
                    mode: sap.m.ListMode.None,
                    noDataText: sap.ushell.resources.i18n.getText('noNotificationsMsg'),
                    items: {
                        path: "/notificationsByPriorityDescending/aNotifications",
                        template: this.oNotificationListItemTemplate,
                        templateShareable: true
                    },
                    growing: true,
                    growingThreshold: 400,
                    growingScrollToLoad: true
                }).addStyleClass("sapUshellNotificationsList");

                this.oNotificationsListPriority.onAfterRendering = function () {
                    oController.handleEmptyList();
                    this.oNotificationsListPriority.$().parent().parent().scroll(this._triggerRetrieveMoreData.bind(that));

                    if (oController._oTopNotificationData) {
                        oController.scrollToItem(oController._oTopNotificationData);
                    }
                    this.oNotificationsListPriority.addStyleClass('sapContrast sapContrastPlus');
                }.bind(this);


                /**
                 * Decides when to issue a request for more items (request next buffer) during scrolling.
                 *
                 * This function is called (repeatedly) during scroll, and calculated whether the top item on the screen
                 * is the item located two thirds of basicBuffer (meaning: two screens) from the end of the list.
                 * if so - then a request for the nect buffer is issued.
                 *
                 * @param path
                 */
                this.triggerRetrieveMoreData = function (path) {
                    if (!this.getModel().getProperty("/" + path + "/inUpdate")) {
                        var notificationsInModel = this.getController().getItemsFromModel(path),
                            numberOfNotificationsInModel = notificationsInModel ? notificationsInModel.length : 0,
                            bufferSize = numberOfNotificationsInModel ? this.getController().getBasicBufferSize() : 0,
                            numberOfItemsInTwoPage = bufferSize * 2 / 3,
                            indexOfElementInList = Math.floor(numberOfNotificationsInModel - numberOfItemsInTwoPage),
                            listItem = path === "notificationsByPriorityDescending" ? this.oNotificationsListPriority.getItems()[indexOfElementInList] : this.oNotificationsListDate.getItems()[indexOfElementInList],
                            topOffSet = this.getController().getTopOffSet();

                        if (listItem && listItem.getDomRef() && jQuery(listItem.getDomRef()).offset().top <= topOffSet) {
                            this.getController().getNextBuffer(path);
                        }
                    }
                };


                this.triggerRetrieveMoreDataForExpandedGroup = function () {
                    if (!this.getModel().getProperty("/notificationsByTypeDescending/inUpdate")) {
                        var
                            aGroupHeaders = this.getModel().getProperty("/notificationsByTypeDescending"),
                            iNumberOfGroupHeaders = aGroupHeaders.length,
                            iNumberOfItemsInOpenGroup = this.getModel().getProperty("/notificationsByTypeDescending")[this.expandedGroupIndex].aNotifications.length,
                            numberOfNotificationsInModel = iNumberOfItemsInOpenGroup + iNumberOfGroupHeaders,
                            bufferSize = numberOfNotificationsInModel ? this.getController().getBasicBufferSize() : 0,
                            numberOfItemsInTwoPage = bufferSize * 2 / 3,
                            indexOfElementInList = Math.floor(numberOfNotificationsInModel - numberOfItemsInTwoPage),
                            listItem = this.oNotificationsListType.getItems()[this.expandedGroupIndex].getItems()[indexOfElementInList],
                            topOffSet = this.getController().getTopOffSet();

                        if (listItem && listItem.getDomRef() && jQuery(listItem.getDomRef()).offset().top <= topOffSet) {
                            oController.getNextBufferForType();
                        }
                    }
                };


                this._triggerRetrieveMoreData = function () {
                    this.triggerRetrieveMoreData(oController.sCurrentSorting);
                };

                this.oNotificationsListType = new List({
                    id: "sapUshellNotificationsListType",
                    mode: sap.m.ListMode.SingleSelect,
                    noDataText: sap.ushell.resources.i18n.getText('noNotificationsMsg'),
                    items: {
                        path: "/notificationsByTypeDescending",
                        template: that.oNotificationGroupTemplate,
                        templateShareable: true
                    }
                }).addStyleClass("sapUshellNotificationsList")
                    .addStyleClass('sapContrastPlus')
                    .addStyleClass('sapContrast');

                this.oNotificationsListType.onAfterRendering = function () {
                    this.oNotificationsListType.$().parent().parent().scroll(this.triggerRetrieveMoreDataForExpandedGroup.bind(that));
                }.bind(this);

                var oIconTabFilterbByDate = new IconTabFilter({
                    id: "sapUshellNotificationIconTabByDate",
                    key: "sapUshellNotificationIconTabByDate",
                    text: sap.ushell.resources.i18n.getText('notificationsSortByDate'),
                    tooltip: sap.ushell.resources.i18n.getText('notificationsSortByDateDescendingTooltip')
                });

                var oIconTabFilterbByType = new IconTabFilter({
                    id: "sapUshellNotificationIconTabByType",
                    key: "sapUshellNotificationIconTabByType",
                    text: sap.ushell.resources.i18n.getText('notificationsSortByType'),
                    tooltip: sap.ushell.resources.i18n.getText('notificationsSortByTypeTooltip'),
                    content: this.oNotificationsListType
                });
                var oIconTabFilterbByPrio = new IconTabFilter({
                    id: "sapUshellNotificationIconTabByPrio",
                    key: "sapUshellNotificationIconTabByPrio",
                    text: sap.ushell.resources.i18n.getText('notificationsSortByPriority'),
                    tooltip: sap.ushell.resources.i18n.getText('notificationsSortByPriorityTooltip')
                });

                this.oIconTabBar = new IconTabBar('notificationIconTabBar', {
                    backgroundDesign: sap.m.BackgroundDesign.Transparent,
                    expandable: false,
                    selectedKey: "sapUshellNotificationIconTabByDate",
                    items: [
                        oIconTabFilterbByDate,
                        oIconTabFilterbByType,
                        oIconTabFilterbByPrio
                    ],
                    select: function (evt) {
                        var key = evt.getParameter("key"),
                            tabFilter = evt.getParameter("item");

                        if (key === "sapUshellNotificationIconTabByDate") {
                            // If the previous tab was ByDate descending
                            // or if the last time ByDate was visited (i.e. oPreviousTabKey is not ByDate) - it was ByDate ascending
                            // - then it should now be ascending
                            if (((that.oPreviousTabKey === "sapUshellNotificationIconTabByDate") && ((that.oPreviousByDateSorting === that.oController.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING) || that.oPreviousByDateSorting === undefined)) ||
                                    ((that.oPreviousTabKey !== "sapUshellNotificationIconTabByDate") && (that.oPreviousByDateSorting === that.oController.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING))) {
                                that.oController.sCurrentSorting = that.oController.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING;
                                tabFilter.setTooltip(sap.ushell.resources.i18n.getText('notificationsSortByDateAscendingTooltip'));
                                that.oNotificationsListDate.bindItems("/notificationsByDateAscending/aNotifications", that.oNotificationListItemTemplate);
                                if (oController.getItemsFromModel(oController.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING).length === 0) {
                                    oController.getNextBuffer(oController.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING);
                                }
                                that.oPreviousByDateSorting = that.oController.oSortingType.NOTIFICATIONS_BY_DATE_ASCENDING;
                            } else {
                                that.oController.sCurrentSorting = that.oController.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING;
                                tabFilter.setTooltip(sap.ushell.resources.i18n.getText('notificationsSortByDateDescendingTooltip'));
                                that.oNotificationsListDate.bindItems("/notificationsByDateDescending/aNotifications", that.oNotificationListItemTemplate);
                                if (oController.getItemsFromModel(oController.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING).length === 0) {
                                    oController.getNextBuffer(oController.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING);
                                }
                                that.oPreviousByDateSorting = that.oController.oSortingType.NOTIFICATIONS_BY_DATE_DESCENDING;
                            }
                            that.oPreviousTabKey = "sapUshellNotificationIconTabByDate";
                        } else if (key === "sapUshellNotificationIconTabByType" && that.oPreviousTabKey !== "sapUshellNotificationIconTabByType") {
                            that.oController.sCurrentSorting = that.oController.oSortingType.NOTIFICATIONS_BY_TYPE_DESCENDING;
                            that.getController().reloadGroupHeaders();
                            tabFilter.removeAllContent();
                            tabFilter.addContent(that.oBusyIndicator);
                            that.oIconTabBar.addStyleClass('sapUshellNotificationIconTabByTypeWithBusyIndicator');
                            that.oPreviousTabKey = "sapUshellNotificationIconTabByType";
                        } else { //by Priority
                            that.oController.sCurrentSorting = that.oController.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING;
                            if (oController.getItemsFromModel(oController.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING).length === 0) {
                                oController.getNextBuffer(oController.oSortingType.NOTIFICATIONS_BY_PRIORITY_DESCENDING);
                            }
                            that.oPreviousTabKey = "sapUshellNotificationIconTabByPrio";
                        }
                        that.oPreviousTabKey = key;
                    }
                }).addStyleClass('sapUshellNotificationTabBar');
                this.oIconTabBar.addEventDelegate({
                    onsaptabprevious: function (oEvent) {
                        var oOriginalElement = oEvent.originalEvent,
                            oSourceElement = oOriginalElement.srcElement,
                            aClassList = oSourceElement.classList,
                            bIncludesClass;

                        bIncludesClass = jQuery.inArray('sapMITBFilter', aClassList) > -1;
                        if (bIncludesClass === true) {
                            oEvent.preventDefault();
                            sap.ushell.renderers.fiori2.AccessKeysHandler.setIsFocusHandledByAnotherHandler(true);
                            sap.ushell.renderers.fiori2.AccessKeysHandler.sendFocusBackToShell(oEvent);
                        }
                    }
                });

                var origTabBarAfterRendering = this.oIconTabBar.onAfterRendering;
                this.oIconTabBar.onAfterRendering = function () {
                    if (origTabBarAfterRendering) {
                        origTabBarAfterRendering.apply(this, arguments);
                    }
                    var oTabBarHeader = sap.ui.getCore().byId('notificationIconTabBar--header');
                    if (oTabBarHeader) {
                        oTabBarHeader.addStyleClass('sapContrastPlus');
                        oTabBarHeader.addStyleClass('sapUshellTabBarHeader');
                    }
                };

                return [this.oIconTabBar];
            },
            getMoreCircle: function (sType) {
                var oMoreText = new Text({text: sap.ushell.resources.i18n.getText('moreNotifications')}),
                    oNotificationCountText = new Text({text: ""}).addStyleClass("sapUshellNotificationsMoreCircleCount"),
                    oMoreCircle = new VBox({
                        items: [oNotificationCountText, oMoreText],
                        alignItems: sap.m.FlexAlignItems.Center
                    }).addStyleClass("sapUshellNotificationsMoreCircle"),
                    oBelowCircleTextPart1 = new Text({
                        text: sap.ushell.resources.i18n.getText('moreNotificationsAvailable_message'),
                        textAlign: "Center"
                    }).addStyleClass("sapUshellNotificationsMoreHelpingText"),
                    oBelowCircleTextPart2 = new Text({
                        text: sap.ushell.resources.i18n.getText('processNotifications_message'),
                        textAlign: "Center"
                    }).addStyleClass("sapUshellNotificationsMoreHelpingText"),
                    oVBox = new VBox({
                        items: [oMoreCircle, oBelowCircleTextPart1, oBelowCircleTextPart2]
                    }).addStyleClass("sapUshellNotificationsMoreVBox"),
                    oListItem = new CustomListItem({
                        type: sap.m.ListType.Inactive,
                        content: oVBox
                    }).addStyleClass("sapUshellNotificationsMoreListItem").addStyleClass('sapContrastPlus');

                oNotificationCountText.setModel(this.getModel());
                oNotificationCountText.bindText("/" + sType + "/moreNotificationCount");
                this.oMoreListItem = oListItem;
                return oListItem;
            },
            getControllerName: function () {
                return "sap.ushell.components.shell.Notifications.Notifications";
            }
        });
    }, /* bExport= */ false);
},
	"sap/ushell/components/shell/Notifications/Settings.controller.js":function(){// ${copyright}
/**
 * Notification settings View Controller<br>
 */
sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, console, window*/
    /*jslint plusplus: true, nomen: true*/

    sap.ui.controller("sap.ushell.components.shell.Notifications.Settings", {

       /**
        * Main functionality:
        * - Getting the notification settings data from Notifications service
        * - Initializing rows data in the model
        * - In case of failure or no data - creating NoData UI
        * - Handling switch flags data initialization
        */
        onInit: function () {
            var that = this,
                oSettingsPromise = sap.ushell.Container.getService("Notifications").readSettings(),
                oModel = new sap.ui.model.json.JSONModel(),
                oView,
                oNoDataUI,
                oResponseData,
                aDeepCopyRows;

           oModel.setProperty("/aDitryRowsIndicator", []);
           oModel.setProperty("/rows", []);
           oModel.setProperty("/originalRows", []);
           oSettingsPromise.done(function (oResult) {
               oResponseData = JSON.parse(oResult);
               oModel.setProperty("/rows", oResponseData.value);
               aDeepCopyRows = JSON.parse(JSON.stringify(oResponseData.value));
               oModel.setProperty("/originalRows", aDeepCopyRows);
           });
            oSettingsPromise.fail(function () {
                // Getting notification types data failed. Creating the NoData UI and setting it as the View's content
                oNoDataUI = that.getView().getNoDataUI();
                that.getView().removeAllContent();
                that.getView().addContent(oNoDataUI);
            });

            this._handleSwitchFlagsDataInitialization(oModel);

            oView = this.getView();
            oView.setModel(oModel);
        },

        onExit: function () {
        },

        onBeforeRendering: function () {
        },

        /**
         * Initializing the copies of the data rows and the switch flags (i.e. originalRows and originalFlags).
         */
        onAfterRendering: function () {
            var oflags = this.getView().getModel().getProperty("/flags"),
                aRows = this.getView().getModel().getProperty("/rows"),
                aDeepCopyRows;

            // On the first time (after controller initialization) there might be a case in which the data rows still weren't fetched from the backend.
            // In this case aRows is undefined, hence we can't set /originalRows yet.
            // Setting "/originalRows" in this case occurs in the controller's onInit function, when the rows data arrives
            if (aRows !== undefined) {
                aDeepCopyRows = JSON.parse(JSON.stringify(aRows));
                this.getView().getModel().setProperty("/originalRows", aDeepCopyRows);
            }
            this.getView().getModel().setProperty("/originalFlags/previewNotificationEnabled", oflags.previewNotificationEnabled);
            this.getView().getModel().setProperty("/originalFlags/highPriorityBannerEnabled", oflags.highPriorityBannerEnabled);

            this.getView().getModel().setProperty("/aDitryRowsIndicator", []);
        },

        getContent: function () {
            var oDfd = jQuery.Deferred();
            oDfd.resolve(this.getView());
            return oDfd.promise();
        },

        getValue: function () {
            var oDfd = jQuery.Deferred();
            oDfd.resolve(" ");
            return oDfd.promise();
        },

        /**
         * Ignoring all the state changes done by the user, replacing them with the original state of the rows and the flags
         */
        onCancel: function () {
            var oOriginalFlags = this.getView().getModel().getProperty("/originalFlags"),
                oOriginalRows = this.getView().getModel().getProperty("/originalRows"),
                oDeepCopyOriginalRows = JSON.parse(JSON.stringify(oOriginalRows));

            this.getView().getModel().setProperty("/flags/previewNotificationEnabled", oOriginalFlags.previewNotificationEnabled);
            this.getView().getModel().setProperty("/flags/highPriorityBannerEnabled", oOriginalFlags.highPriorityBannerEnabled);
            this.getView().getModel().setProperty("/rows", oDeepCopyOriginalRows);

            this.getView().getModel().setProperty("/originalFlags", {});
            this.getView().getModel().setProperty("/originalRows", []);

            this.getView().getModel().setProperty("/aDitryRowsIndicator", []);

        },

        /**
         * - Saving switch flag value
         * - Saving rows (i.e. notification types) that were changed
         * - Emptying dirty flags array
         */
        onSave: function () {
            var oDfd = jQuery.Deferred(),
                aRows = this.getView().getModel().getProperty("/rows"),
                aOriginalRows = this.getView().getModel().getProperty("/originalRows"),
                oTempRow,
                oTempOriginalRow,
                iIndex,
                aDitryRowsIndicator = this.getView().getModel().getProperty("/aDitryRowsIndicator");

            oDfd.resolve();

            // Save the switch flags ("Show Alerts" and "Show Preview")
            this._handleSwitchFlagsSave();

            // Saving the rows that were changed (i.e. at least one of the flags was changed by the user)
            for (iIndex = 0; iIndex < aRows.length; iIndex++) {
                // Check the "dirty" flag if the current row
                if (aDitryRowsIndicator[iIndex] && aDitryRowsIndicator[iIndex] === true) {
                    oTempRow = aRows[iIndex];
                    oTempOriginalRow = aOriginalRows[iIndex];
                    // Check the current state of the row is different then the original state
                    if (!this._identicalRows(oTempRow, oTempOriginalRow)) {
                        sap.ushell.Container.getService("Notifications").saveSettingsEntry(oTempRow);
                    }
                }
            }
            this.getView().getModel().setProperty("/aDitryRowsIndicator", []);
            return oDfd.promise();
        },

        /**
         * Setting a "dirty flag" (to true) for a row, when the status of the row was changed by the user (e.g. a checkbox was checked/unchecked).
         * 
         * The array of "dirty flags" (each one represents a row in the notification types table) is in the model in "/aDitryRowsIndicator".
         * The index of the correct item in the array/model is the index of the row in the table and is extracted from this.getBindingContext().sPath   
         */
        setControlDirtyFlag : function () {
            var oContextPath = this.getBindingContext().sPath,
                iIndexInArray = oContextPath.substring(oContextPath.lastIndexOf("/") + 1, oContextPath.length),
                oObjectInModel = this.getModel().getProperty("/aDitryRowsIndicator");

            if (oObjectInModel !== undefined) {
                this.getModel().setProperty("/aDitryRowsIndicator/" + iIndexInArray, true);
            }
        },
        _handleSwitchFlagsDataInitialization : function (oModel) {
            var oSwitchBarDataPromise = sap.ushell.Container.getService("Notifications").getUserSettingsFlags(),
                bMobilePushEnabled = sap.ushell.Container.getService("Notifications")._getNotificationSettingsMobileSupport();

            oSwitchBarDataPromise.done(function (oSwitchBarData) {
                oModel.setProperty("/flags", {});
                oModel.setProperty("/flags/previewNotificationEnabled", oSwitchBarData.previewNotificationEnabled);
                oModel.setProperty("/flags/highPriorityBannerEnabled", oSwitchBarData.highPriorityBannerEnabled);
                oModel.setProperty("/flags/mobileNotificationsEnabled", bMobilePushEnabled);

                oModel.setProperty("/originalFlags", {});
                oModel.setProperty("/originalFlags/previewNotificationEnabled", oSwitchBarData.previewNotificationEnabled);
                oModel.setProperty("/originalFlags/highPriorityBannerEnabled", oSwitchBarData.highPriorityBannerEnabled);
            });
        },

        /**
         * Handle the saving of "Show Alerts" (i.e. enable banner) and "Show Preview" flags,
         * and update the original flags (in "/originalFlags") for the next time the settings UI is opened.
         */
        _handleSwitchFlagsSave : function () {
            var bPreviewNotificationEnabled = this.getView().getModel().getProperty("/flags/previewNotificationEnabled"),
                bHighPriorityBannerEnabled = this.getView().getModel().getProperty("/flags/highPriorityBannerEnabled"),
                bOriginalPreviewNotificationEnabled = this.getView().getModel().getProperty("/originalFlags/previewNotificationEnabled"),
                bOriginalHighPriorityBannerEnabled = this.getView().getModel().getProperty("/originalFlags/highPriorityBannerEnabled");

            if ((bOriginalPreviewNotificationEnabled !== bPreviewNotificationEnabled) || (bOriginalHighPriorityBannerEnabled !== bHighPriorityBannerEnabled)) {

                sap.ushell.Container.getService("Notifications").setUserSettingsFlags({
                    previewNotificationEnabled : bPreviewNotificationEnabled,
                    highPriorityBannerEnabled : bHighPriorityBannerEnabled
                });

                // If the user changed the enabling of preview notification - publish it
                if (bPreviewNotificationEnabled !== bOriginalPreviewNotificationEnabled) {
                    sap.ui.getCore().getEventBus().publish("sap.ushell.services.Notifications", "enablePreviewNotificationChanged", {bPreviewEnabled : bPreviewNotificationEnabled});
                }

                // Set the flags in "/originalFlags" with the values that were just saved
                // so the next time settings UI is opened - "/originalFlags" will contain the correct values
                this.getView().getModel().setProperty("/originalFlags/previewNotificationEnabled", bPreviewNotificationEnabled);
                this.getView().getModel().setProperty("/originalFlags/highPriorityBannerEnabled", bHighPriorityBannerEnabled);
            }
        },

        /**
         * Returning a boolean value indicating whether the two given rows (i.e. notification types) are identical or not,
         * The relevant properties that are being compared are the ID, and the flags that can be changed by the user
         */
        _identicalRows : function (row1, row2) {
            if ((row1.NotificationTypeId === row2.NotificationTypeId) &&
                    (row1.PriorityDefault === row2.PriorityDefault) &&
                    (row1.DoNotDeliver === row2.DoNotDeliver) &&
                    (row1.DoNotDeliverMob === row2.DoNotDeliverMob)) {
                return true;
            }
            return false;
        }
    });


}, /* bExport= */ false);
},
	"sap/ushell/components/shell/Notifications/Settings.view.js":function(){// ${copyright}

/**
 * Notification settings View.<br>
 * The View contains a sap.m.VBox, including:<br>
 *  - A header that includes two switch controls for the "DoNotDisturb" and "EnableNotificationsPreview" features<br>
 *  - A table of notification types, allowing the user to set presentation-related properties<br>
 */
sap.ui.define(function() {
	"use strict";

    /*global jQuery, sap, document */
    /*jslint plusplus: true, nomen: true */

    sap.ui.jsview("sap.ushell.components.shell.Notifications.Settings", {

        /**
         * The content of the View:
         * - Notification types settings table
         * - Switch buttons bar (i.e. the header)
         * Both controls are put in a sap.m.VBox
         */
        createContent: function (oController) {
            var that = this,
                oNotificationTypeTable,
                oTableRowTemplate,
                oSwitchButtonsBar,
                oVBox,
                oHeaderVBox,
                oResourceBundle = sap.ushell.resources.i18n;

            oNotificationTypeTable = new sap.m.Table("notificationSettingsTable", {
                backgroundDesign: sap.m.BackgroundDesign.Transparent,
                showSeparators: sap.m.ListSeparators.All,
                columns: [
                    new sap.m.Column({
                        header: new sap.m.Text({
                            text : oResourceBundle.getText("notificationType_column"),
                            tooltip: oResourceBundle.getText("notificationType_columnTooltip")
                        }),
                        vAlign : "Middle",
                        hAlign : "Left"
                    }),
                    new sap.m.Column({
                        header: new sap.m.Text({
                            text : oResourceBundle.getText("iOSNotification_column"),
                            tooltip : oResourceBundle.getText("iOSNotification_columnTooltip")
                        }),
                        visible: "{/flags/mobileNotificationsEnabled}",
                        // When the screen size is smaller than Tablet -
                        // the cells of this column should be placed under the cells of the previous column
                        minScreenWidth : "Tablet",
                        demandPopin : true,
                        vAlign : "Middle",
                        hAlign : "Left"
                    }),
                    new sap.m.Column({
                        header: new sap.m.Text({
                            text : oResourceBundle.getText("highNotificationsBanner_column"),
                            tooltip : oResourceBundle.getText("highNotificationsBanner_columnTooltip")
                        }),
                        // When the screen size is smaller than Tablet -
                        // the cells of this column should be placed under the cells of the previous column
                        minScreenWidth : "Tablet",
                        demandPopin : true,
                        hAlign : "Left"
                    }),
                    new sap.m.Column({
                        header: new sap.m.Text({
                            text : oResourceBundle.getText("Notifications_Settings_Show_Type_column"),
                            tooltip : oResourceBundle.getText("notificationTypeEnable_columnTooltip")
                        }),
                        vAlign : "Middle",
                        hAlign : "Left"
                    })
                ]
            });

            // Arrange the table columns according to the cells content width
            oNotificationTypeTable.setFixedLayout(false);

            oTableRowTemplate = new sap.m.ColumnListItem({
                cells : [
                    new sap.m.Label({
                        text : "{NotificationTypeDesc}"
                    }),
                    new sap.m.CheckBox({
                        selected: {
                            parts: ["DoNotDeliverMob"],
                            formatter : function (bDoNotDeliverMob) {
                                return !bDoNotDeliverMob;
                            }
                        },
                        select: function (oEvent) {
                            that.getController().setControlDirtyFlag.apply(this);
                            var sPath = oEvent.getSource().getBindingContext().sPath;
                            if (oEvent.mParameters.selected === true) {
                                that.getModel().setProperty(sPath + "/DoNotDeliverMob", false);
                            } else {
                                that.getModel().setProperty(sPath + "/DoNotDeliverMob", true);
                            }
                        }
                    }),
                    new sap.m.CheckBox({
                        // When the "High Priority" property is checked - the value in the model should be "40-HIGH".
                        // when it is unchecked - - the value in the model should be an empty string.
                        select: function (oEvent) {
                            that.getController().setControlDirtyFlag.apply(this);
                            var sPath = oEvent.getSource().getBindingContext().sPath;
                            if (oEvent.mParameters.selected === true) {
                                that.getModel().setProperty(sPath + "/PriorityDefault", "40-HIGH");
                            } else {
                                that.getModel().setProperty(sPath + "/PriorityDefault", "");
                            }
                        },
                        selected: {
                            parts: ["PriorityDefault"],
                            // The checkbox for PriorityDefault should be checked when the priority of the corresponding
                            // ...notification type is HIGH (i.e. the string "40-HIGH"), and unchecked otherwise
                            formatter : function (sPriorityDefault) {
                                that.getController().setControlDirtyFlag.apply(this);
                                if (sPriorityDefault === "40-HIGH") {
                                    return true;
                                }
                                return false;
                            }
                        }
                    }),
                    new sap.m.Switch({
                        state: {
                            parts: ["DoNotDeliver"],
                            formatter : function (bDoNotDeliver) {
                                return !bDoNotDeliver;
                            }
                        },
                        customTextOn: " ",
                        customTextOff: " ",
                        select: function (oEvent) {
                            that.getController().setControlDirtyFlag.apply(this);
                        },
                        change: function (oEvent) {
                            var bNewState = oEvent.getParameter("state"),
                                sPath = oEvent.getSource().getBindingContext().sPath;

                            that.getModel().setProperty(sPath + "/DoNotDeliver", !bNewState);
                            that.getController().setControlDirtyFlag.apply(this);
                        }
                    })
                ]
            });

            oNotificationTypeTable.bindAggregation("items", {
                path : "/rows",
                template: oTableRowTemplate,
                // Table rows (i.e. notification types) are sorted by type name, which is the NotificationTypeDesc field
                sorter: new sap.ui.model.Sorter("NotificationTypeDesc")
            });

            // The main container in the View.
            // Contains the header (switch flags) and the notification types table
            oVBox = new sap.m.VBox();

            // Create the header, which is a sap.m.Bar that contain two switch controls
            oSwitchButtonsBar = this.createSwitchControlBar();

            // Create wrapper to the switch button in order to support belize plus theme
            oHeaderVBox = new sap.m.VBox();
            oHeaderVBox.addStyleClass("sapContrastPlus");
            oHeaderVBox.addItem(oSwitchButtonsBar);

            oVBox.addItem(oHeaderVBox);
            oVBox.addItem(oNotificationTypeTable);

            return [oVBox];
        },

       /**
        * Creates and returns a UI control (sap.m.Bar)
        * that contains the DoNotDisturb and EnablePreview switch controls and labels.
        * The switch control for enabling/disabling notifications preview is created and added
        *  only when preview is configured as enabled and the device screen is wide enough for presenting the preview
        *
        * @returns sap.m.HBox containing the switch controls that appear at the top part of the settings UI
        */
        createSwitchControlBar : function () {
            var oDoNotDisturbSwitch,
                oDoNotDisturbLabel,
                oDoNotDisturbHBox,
                oPreviewSwitch,
                oEnablePreviewLabel,
                oEnablePreviewHBox,
                oSwitchButtonsBar,
                oResourceBundle = sap.ushell.resources.i18n,
                oDevice = sap.ui.Device.system,
                bEligibleDeviceForPreview = oDevice.desktop || oDevice.tablet || oDevice.combi,
                oNotificationsService = sap.ushell.Container.getService("Notifications");

           oSwitchButtonsBar = new sap.m.FlexBox('notificationSettingsSwitchBar');

            oDoNotDisturbSwitch = new sap.m.Switch("doNotDisturbSwitch", {
                tooltip: oResourceBundle.getText("showAlertsForHighNotifications_tooltip"),
                state: "{/flags/highPriorityBannerEnabled}",
                customTextOn : " ",
                customTextOff : " ",
                mode: sap.ui.model.BindingMode.TwoWay
            });

            oDoNotDisturbLabel = new sap.m.Label("doNotDisturbLabel", {
                text : oResourceBundle.getText("Show_High_Priority_Alerts_title")
            });

            oDoNotDisturbHBox = new sap.m.HBox("notificationDoNotDisturbHBox",{
                items: [
                   oDoNotDisturbSwitch,
                   oDoNotDisturbLabel
                ]
            });

            oSwitchButtonsBar.addItem(oDoNotDisturbHBox);

            if (bEligibleDeviceForPreview === true) {
                oPreviewSwitch = new sap.m.Switch("enablePreviewSwitch", {
                    tooltip: oResourceBundle.getText("showNotificationsPreview_tooltip"),
                    state: "{/flags/previewNotificationEnabled}",
                    customTextOn : " ",
                    customTextOff : " ",
                    mode: sap.ui.model.BindingMode.TwoWay
                });

                oEnablePreviewLabel = new sap.m.Label("enablePreviewLabel", {
                    text : oResourceBundle.getText("Show_Preview_in_Home_Page_title")
                });

                oEnablePreviewHBox = new sap.m.FlexBox({
                    items: [
                        oPreviewSwitch,
                        oEnablePreviewLabel
                    ]
                });
                oSwitchButtonsBar.addItem(oEnablePreviewHBox);
            }
            return oSwitchButtonsBar;
        },

        /**
         * Creates and returns the UI that is shown in the settings view in case that no Notification type rows are available.<br>
         * The UI consists of a sap.m.VBox, in which the is an icon, a message header (text), and the actual text message.   
         */
        getNoDataUI: function () {
            var oNoDataVBox,
                oNoDataIcon,
                oNoDataHeaderLabel,
                oNoDataLabel,
                oResourceBundle = sap.ushell.resources.i18n;

            if (oNoDataVBox === undefined) {

                oNoDataIcon = new sap.ui.core.Icon("notificationSettingsNoDataIcon", {
                    size: "5rem",
                    src: "sap-icon://message-information"
                });
                oNoDataHeaderLabel = new sap.m.Text("notificationSettingsNoDataTextHeader", {
                    text : oResourceBundle.getText("noNotificationTypesEnabledHeader_message")
                }).setTextAlign(sap.ui.core.TextAlign.Center);
                oNoDataLabel = new sap.m.Text("notificationSettingsNoDataText", {
                    text : oResourceBundle.getText("noNotificationTypesEnabled_message")
                }).setTextAlign(sap.ui.core.TextAlign.Center);

                oNoDataVBox = new sap.m.VBox("notificationSettingsNoDataInnerBox", {
                    items: [
                        oNoDataIcon,
                        oNoDataHeaderLabel,
                        oNoDataLabel
                    ]
                });
            }
            return oNoDataVBox;
        },
        getControllerName: function () {
            return "sap.ushell.components.shell.Notifications.Settings";
        }
    });


}, /* bExport= */ false);
}
},"Component-preload"
);
