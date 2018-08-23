// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
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
                version: "1.56.5",
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
