// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

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
