sap.ui.define([ "jquery.sap.global", "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ovp/cards/OVPCardAsAPIUtils",
    "sap/ovp/cards/SettingsUtils", "sap/ovp/cards/PayLoadUtils",
    "sap/m/Text", "sap/ui/comp/valuehelpdialog/ValueHelpDialog", "sap/ovp/cards/rta/SettingsDialogConstants",
    "sap/m/MessageBox", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/ui/model/ChangeReason",
    "sap/m/Label", "sap/ui/core/Icon", "sap/m/Image", "sap/m/Column", "sap/m/ColumnListItem", "sap/m/Table",
    "sap/m/ListMode", "sap/m/ToolbarSpacer", "sap/m/SearchField", "sap/ovp/cards/linklist/AnnotationHelper",
    "sap/ovp/cards/AnnotationHelper", "sap/m/Toolbar", "sap/ui/core/IconPool", "sap/m/IconTabBar",
    "sap/m/IconTabFilter", "sap/ui/core/mvc/ViewType", "sap/m/Dialog", "sap/m/Button", "sap/ovp/cards/CommonUtils", "sap/ui/Device"],

    function(jQuery, Controller, JSONModel,
            OVPCardAsAPIUtils, settingsUtils, PayLoadUtils, Text, ValueHelpDialog, SettingsConstants,
            MessageBox, Filter, FilterOperator, ChangeReason, Label, Icon, Image, Column, ColumnListItem,
            Table, ListMode, ToolbarSpacer, SearchField, LinkAnnotationHelper, CardAnnotationHelper,
            Toolbar, IconPool, IconTabBar, IconTabFilter, ViewType, Dialog, Button, CommonUtils, Device) {
    "use strict";

    return Controller.extend("sap.ovp.cards.rta.SettingsDialog", {

        /* To store manifest setting of selected Card*/
        _oCardManifestSettings : {},
        /*To store the elements that do not require refresh when updated*/
        _aRefreshNotRequired : SettingsConstants._aRefreshNotRequired,
        _aRefreshRequired : SettingsConstants._aRefreshRequired,
        oOvpResourceBundle: sap.ui.getCore().getLibraryResourceBundle("sap.ovp"),

        onInit : function() {
            /*Attaching CreateAndSubmitChange button to oSaveButton*/
            settingsUtils.oSaveButton.attachPress(this.onSaveButtonPress,this);
            settingsUtils.oResetButton.attachPress(this.onResetButton,this);
            settingsUtils.oMessagePopOverButton.attachPress(this.handleMessagePopoverPress, this);
        },

        onAfterRendering : function() {
            settingsUtils.dialogBox.addStyleClass("sapOvpSettingsDialogBox");
            this.setEnablePropertyForResetAndSaveButton(false);
            this._oCardManifestSettings = this.getView().getModel().getData();
            this._oOriginalCardManifestSettings = jQuery.extend(true, {}, this._oCardManifestSettings);
            var oView = this.getView(),
                /*oVisibilityModel = oView.getModel("visibility"),*/
                oCardPropertiesModel = oView.getModel(),
                dialogCard = oView.byId("dialogCard");
            if (!dialogCard.getVisible()) {
                dialogCard = oView.byId("dialogCardNoPreview");
            }
            dialogCard.getDomRef().style.minHeight = this._oCardManifestSettings.dialogBoxHeight + "px";
            /*var oScrollContainerForForm = oView.byId("SettingsDialogScrollContainerForForm");
            if (oScrollContainerForForm) {
                oScrollContainerForForm.getDomRef().style.height =
                    (oVisibilityModel.getProperty("/viewSwitchEnabled")) ? this.getValueInRemString(settingsUtils.iContentHeightForDialogWithViewSwitch)
                        : this.getValueInRemString(settingsUtils.iContentHeightForDialog);
            }*/
            oView.byId("dialogCardOverlay").getDomRef().style.minHeight = this._oCardManifestSettings.dialogBoxHeight + "px";
            settingsUtils.settingFormWidth(oView, "calc(100% - " + (this._oCardManifestSettings.dialogBoxWidth + 1) + "rem)");
            setTimeout( function(){
                var dialogCard = this.getView().byId("dialogCard");
                if (dialogCard.getVisible()) {
                    dialogCard.setBusy(false);
                }
            }.bind(this), 2000);

            if (this._oCardManifestSettings.staticContent) {
                // Initial error checks for Link title and Static Link
                this.handleErrorHandling(oCardPropertiesModel, "title", "/staticContent");
                this.handleErrorHandling(oCardPropertiesModel, "targetUri", "/staticContent");
            }
        },

        validateInputField: function (oEvent) {
            var oSource = oEvent.getSource();
            var iLength = oSource.getValue().trim().length;
            if (!iLength) {
                oSource.setValue(oSource.getValue().trim());
            }
            this.updateCard(oEvent);
        },
        addView : function(oEvent) {
            //adding Mandatory field as is.
            this.setEnablePropertyForResetAndSaveButton(true);
            var defaultDataPointAnnotationPath,
                oCardManifestSettings = this._oCardManifestSettings,
                oCardPropertiesModel = this.getView().getModel();
            if (oCardManifestSettings.dataPointAnnotationPath && oCardManifestSettings.dataPoint &&
                oCardManifestSettings.dataPoint.length) {
                defaultDataPointAnnotationPath = oCardManifestSettings.dataPoint[0].value;
            }
            if (oCardManifestSettings.tabs && oCardManifestSettings.tabs.length) {
                oCardManifestSettings.newViewCounter++;

                if (oCardManifestSettings.template === "sap.ovp.cards.charts.analytical" || oCardManifestSettings.template === "sap.ovp.cards.charts.smart.chart") {
                    oCardManifestSettings.tabs.push({
                        chartAnnotationPath: oCardManifestSettings.chart[0].value,
                        dataPointAnnotationPath: defaultDataPointAnnotationPath,
                        value: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " " + oCardManifestSettings.newViewCounter)
                    });
                } else {
                    oCardManifestSettings.tabs.push({
                        annotationPath: oCardManifestSettings.lineItem[0].value,
                        dataPointAnnotationPath: defaultDataPointAnnotationPath,
                        value: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " " + oCardManifestSettings.newViewCounter)
                    });
                }
                var selectedKey = oCardManifestSettings.tabs.length;
                oCardManifestSettings.aViews.push({
                    text: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " " + oCardManifestSettings.newViewCounter),
                    key: selectedKey,
                    isLaterAddedView: true,
                    isViewResetEnabled: false
                });
                this.selectViewSwitch(oEvent, selectedKey);
            } else {
                oCardManifestSettings.tabs = [{}];
                SettingsConstants.tabFields.forEach(function (tabField) {
                    oCardManifestSettings.tabs[0][tabField] = oCardManifestSettings[tabField];
                });
                oCardManifestSettings.tabs[0].value = this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " 1");
                if (oCardManifestSettings.template === "sap.ovp.cards.charts.analytical" || oCardManifestSettings.template === "sap.ovp.cards.charts.smart.chart") {
                    oCardManifestSettings.tabs.push({
                        chartAnnotationPath: oCardManifestSettings.chart[0].value,
                        dataPointAnnotationPath: defaultDataPointAnnotationPath,
                        value: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " 2")
                    });
                } else {
                    oCardManifestSettings.tabs.push({
                        annotationPath: oCardManifestSettings.lineItem[0].value,
                        dataPointAnnotationPath: defaultDataPointAnnotationPath,
                        value: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " 2")
                    });
                }

                oCardManifestSettings.selectedKey = 1;
                oCardManifestSettings.defaultViewSelected = 1;
                oCardManifestSettings.aViews = [{
                    text: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_MAIN_VIEW"),
                    key: 0,
                    isLaterAddedView: false,
                    isViewResetEnabled: false
                }, {
                    text: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " 1 (" + this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_DEFAULT_VIEW") + ")"),
                    key: 1,
                    initialSelectedKey: 1,
                    isLaterAddedView: false,
                    isViewResetEnabled: false
                }, {
                    text: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " 2"),
                    key: 2,
                    isLaterAddedView: true,
                    isViewResetEnabled: false
                }];
                oCardManifestSettings.newViewCounter = 2;
                this.selectViewSwitch(oEvent, 1);
            }
            // Handling errors for Link title and Static Link
            this.handleErrorHandling(oCardPropertiesModel, "value", "/tabs");
        },
        deleteView: function(oEvent) {
            this.setEnablePropertyForResetAndSaveButton(true);
            var oCardManifestSettings = this._oCardManifestSettings,
                selectedKey = parseInt(oCardManifestSettings.selectedKey,10),
                oCardPropertiesModel = this.getView().getModel();
            oCardManifestSettings.tabs.splice(selectedKey - 1, 1);
            oCardManifestSettings.aViews.splice(selectedKey, 1);
            if (selectedKey === oCardManifestSettings.defaultViewSelected) {
                oCardManifestSettings.defaultViewSelected = 1;
                oCardManifestSettings.aViews[selectedKey].text = oCardManifestSettings.aViews[selectedKey].text + " (" + this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_DEFAULT_VIEW") + ")";
            }
            oCardManifestSettings.aViews.forEach(function(view,index) {
               if (index >= selectedKey) {
                   view.key--;
               }
            });

            // Handling errors for Link title and Static Link
            this.handleErrorHandling(oCardPropertiesModel, "value", "/tabs");

            if (oCardManifestSettings.tabs.length == 1) {
                SettingsConstants.tabFields.forEach(function (tabField) {
                    oCardManifestSettings[tabField] = oCardManifestSettings.tabs[0][tabField];
                });
                delete oCardManifestSettings.selectedKey;
                delete oCardManifestSettings.defaultViewSelected;
                delete oCardManifestSettings.tabs;
                delete oCardManifestSettings.aViews;
                oCardManifestSettings.aViews = [{
                    text: this.oOvpResourceBundle.getText("OVP_KEYUSER_SHOWS_DIFFERENT_VIEWS"),
                    key: 0,
                    initialSelectedKey: 0,
                    isLaterAddedView: false,
                    isViewResetEnabled: false
                }];
                settingsUtils.addManifestSettings(oCardManifestSettings);
                settingsUtils.setVisibilityForFormElements(oCardManifestSettings);
                this.getView().getModel("visibility").refresh();
                this.getView().getModel().refresh();
                this._fCardWithRefresh();
            } else {
                oCardManifestSettings.selectedKey = 1;
                this.selectViewSwitch(oEvent, oCardManifestSettings.selectedKey);
            }
        },
        resetView: function() {
            var oCardManifestSettings = this._oCardManifestSettings,
                oCardPropertiesModel = this.getView().getModel(),
                iSelectedKey = parseInt(oCardManifestSettings.selectedKey,10),
                oSelectedView = oCardManifestSettings.aViews[iSelectedKey],
                iDefaultViewSelected = oCardManifestSettings.defaultViewSelected;
            if (!oSelectedView.isLaterAddedView) {
                var kpiStateOfCurrentCard = oCardManifestSettings.dataPointAnnotationPath ? true : false,
                    kpiStateOfOriginalCard = this._oOriginalCardManifestSettings.dataPointAnnotationPath ? true : false;
                if (iSelectedKey) {
                    var initialSelectedKey = oCardManifestSettings.aViews[iSelectedKey].initialSelectedKey;
                    SettingsConstants.tabFields.forEach(function(field) {
                        if (field !== "dataPointAnnotationPath" || kpiStateOfCurrentCard) {
                            /* None of the field is of type object hence direct copy is fine.*/
                            if (this._oOriginalCardManifestSettings.tabs && this._oOriginalCardManifestSettings.tabs.length) {
                                oCardManifestSettings[field] = this._oOriginalCardManifestSettings.tabs[initialSelectedKey - 1][field];
                            } else {
                                oCardManifestSettings[field] = this._oOriginalCardManifestSettings[field];
                            }
                            oCardManifestSettings.tabs[iSelectedKey - 1][field] = oCardManifestSettings[field];
                        }
                    }.bind(this));
                    if (!this._oOriginalCardManifestSettings.tabs || !this._oOriginalCardManifestSettings.tabs.length) {
                        oCardManifestSettings.newViewCounter++;
                        oCardManifestSettings.tabs[iSelectedKey - 1].value = this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " " + oCardManifestSettings.newViewCounter);
                    }
                    if (iSelectedKey === oCardManifestSettings.defaultViewSelected) {
                        oCardManifestSettings.aViews[iSelectedKey].text = oCardManifestSettings.tabs[iSelectedKey - 1].value + " (" + this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_DEFAULT_VIEW") + ")";
                    } else {
                        oCardManifestSettings.aViews[iSelectedKey].text = oCardManifestSettings.tabs[iSelectedKey - 1].value;
                    }

                } else {
                    SettingsConstants.mainFields.forEach(function(field) {
                        /* None of the field is of type object hence direct copy is fine.*/
                        oCardManifestSettings[field] = this._oOriginalCardManifestSettings[field];
                    }.bind(this));
                    if (kpiStateOfCurrentCard !== kpiStateOfOriginalCard) {
                        if (kpiStateOfOriginalCard) {
                            oCardManifestSettings.tabs.forEach(function (tab) {
                               if (tab.prevDataPointAnnotationPath) {
                                   tab.dataPointAnnotationPath  = tab.prevDataPointAnnotationPath;
                               } else {
                                   tab.dataPointAnnotationPath = oCardManifestSettings.dataPoint[0].value;
                               }
                            });
                            oCardManifestSettings.dataPointAnnotationPath = oCardManifestSettings.tabs[iDefaultViewSelected].dataPointAnnotationPath;
                        } else {
                            oCardManifestSettings.tabs.forEach(function (tab) {
                                tab.prevDataPointAnnotationPath = tab.dataPointAnnotationPath;
                                tab.dataPointAnnotationPath = undefined;
                            });
                        }
                    }
                }
            } else {
                var dataPointAnnotationPath;
                if (oCardManifestSettings.dataPointAnnotationPath) {
                    dataPointAnnotationPath = oCardManifestSettings.dataPoint[0].value;
                }
                oCardManifestSettings.newViewCounter++;
                if (oCardManifestSettings.template === "sap.ovp.cards.charts.analytical" || oCardManifestSettings.template === "sap.ovp.cards.charts.smart.chart") {
                    oCardManifestSettings.tabs[iSelectedKey - 1] = {
                        chartAnnotationPath: oCardManifestSettings.chart[0].value,
                        dataPointAnnotationPath: dataPointAnnotationPath,
                        value: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " " + oCardManifestSettings.newViewCounter)
                    };
                } else {
                    oCardManifestSettings.tabs[iSelectedKey - 1] = {
                        annotationPath: oCardManifestSettings.lineItem[0].value,
                        dataPointAnnotationPath: dataPointAnnotationPath,
                        value: this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " " + oCardManifestSettings.newViewCounter)
                    };
                }
                if (iSelectedKey === oCardManifestSettings.defaultViewSelected) {
                    oCardManifestSettings.aViews[iSelectedKey].text = this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " " + oCardManifestSettings.newViewCounter + " (" + this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_DEFAULT_VIEW") + ")");
                } else {
                    oCardManifestSettings.aViews[iSelectedKey].text = this.oOvpResourceBundle && (this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_VIEW_NAME") + " " + oCardManifestSettings.newViewCounter);
                }
                SettingsConstants.tabFields.forEach(function(field) {
                    /* None of the field is of type object hence direct copy is fine.*/
                    oCardManifestSettings[field] = oCardManifestSettings.tabs[iSelectedKey - 1][field];
                });
            }

            // Handling errors for Link title and Static Link
            this.handleErrorHandling(oCardPropertiesModel, "value", "/tabs");

            oCardManifestSettings.isViewResetEnabled = false;
            oCardManifestSettings.aViews[iSelectedKey].isViewResetEnabled = false;
            settingsUtils.addManifestSettings(oCardManifestSettings);
            settingsUtils.setVisibilityForFormElements(oCardManifestSettings);
            this.getView().getModel("visibility").refresh();
            this.getView().getModel().refresh();
            this._fCardWithRefresh();
        },
        selectViewSwitch : function(oEvent, selectedKey) {
            var oCardManifestSettings = this._oCardManifestSettings,
                oCardPropertiesModel = this.getView().getModel();
            if (!selectedKey) {
                selectedKey = oEvent.getSource().getSelectedIndex();
            }
            if (this.defaultViewSwitch) {
                this.defaultViewSwitch.setEnabled(true);
            }
            this.setEnablePropertyForResetAndSaveButton(true);

            //If selectedkey is zero then showMain view else subView
            if (!selectedKey) {
                /*By Default value get set to string zero . Setting it to interger zero*/
                /*Show main veiw with properties of the default view selected*/
                var iDefaultViewSelected = oCardManifestSettings.defaultViewSelected;
                oCardManifestSettings.selectedKey = selectedKey;
                oCardManifestSettings.mainViewSelected = true;
                oCardManifestSettings.isViewResetEnabled = oCardManifestSettings.aViews[selectedKey].isViewResetEnabled;
                SettingsConstants.tabFields.forEach(function (field) {
                   oCardManifestSettings[field] = oCardManifestSettings.tabs[iDefaultViewSelected - 1][field];
                });

                // Handling errors for Link title and Static Link
                this.handleErrorHandling(oCardPropertiesModel, "value", "/tabs");

                settingsUtils.addManifestSettings(oCardManifestSettings);
                settingsUtils.setVisibilityForFormElements(oCardManifestSettings);
                this.getView().getModel("visibility").refresh();
                this.getView().getModel().refresh();
                this._fCardWithRefresh();
            } else {
                oCardManifestSettings.mainViewSelected = false;
                oCardManifestSettings.isViewResetEnabled = oCardManifestSettings.aViews[selectedKey].isViewResetEnabled;
                var dialogCard = this.getView().byId("dialogCard");
                if (dialogCard.getVisible()) {
                    var oRootControl = dialogCard.getComponentInstance().getRootControl();
                    var oController = oRootControl.getController();
                    /*this will set the selectedkey for the manifest settings*/
                    oController.changeSelection(selectedKey, true, oCardManifestSettings);

                    // Handling errors for Link title and Static Link
                    this.handleErrorHandling(oCardPropertiesModel, "value", "/tabs");

                    settingsUtils.addManifestSettings(oCardManifestSettings);
                    settingsUtils.setVisibilityForFormElements(oCardManifestSettings);
                    this.getView().getModel("visibility").refresh();
                    this.getView().getModel().refresh();
                }
            }
        },

        setCurrentActivePageForCarouselCard : function (iIndex) {
            var dialogCard = this.getView().byId("dialogCard");
            if (dialogCard.getVisible()) {
                var oComponent = dialogCard.getComponentInstance(),
                    oRootControl = oComponent.getRootControl(),
                    oCarousel = oRootControl.byId("pictureCarousel");
                if (oCarousel) {
                    var aPages = oCarousel.getPages(),
                        newActivePage = aPages[iIndex];
                    oCarousel.setActivePage(newActivePage);
                }
            }
        },

        onSelectionChange : function (oEvent) {
            var oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                aStaticContent = oModel.getData().staticContent,
                oSelectedItem = oSource.getSelectedItem(),
                oSelectedItemData = oSelectedItem.getBindingContext().getObject(),
                oVisibilityModel = oSource.getModel("visibility");
            for (var i = 0; i < aStaticContent.length; i++) {
                if (aStaticContent[i].id === oSelectedItemData.id) {
                    oVisibilityModel.setProperty("/moveToTheTop", !(aStaticContent.length === 1 || i === 0));
                    oVisibilityModel.setProperty("/moveUp", !(aStaticContent.length === 1 || i === 0));
                    oVisibilityModel.setProperty("/moveDown", !(aStaticContent.length === 1 || i === (aStaticContent.length - 1)));
                    oVisibilityModel.setProperty("/moveToTheBottom", !(aStaticContent.length === 1 || i === (aStaticContent.length - 1)));
                    oVisibilityModel.setProperty("/delete", true);
                    oModel.setProperty("/selectedItemIndex", i);
                    oVisibilityModel.refresh(true);

                    // Setting the Active Page in Case of Carousel Card
                    if (oEvent.getParameter("listItem")) {
                        this.setCurrentActivePageForCarouselCard(i);
                    }

                    break;
                }
            }
        },

        handleErrorForProperty : function (oCardPropertiesModel, sPath, sContextPath) {
            oCardPropertiesModel.firePropertyChange({
                context: oCardPropertiesModel.getContext(sContextPath ? sContextPath : "/"),
                path: sPath,
                value: oCardPropertiesModel.getProperty(sContextPath ? (sContextPath + "/" + sPath) : sPath),
                reason: ChangeReason.Change
            });
        },

        handleErrorHandling : function (oCardPropertiesModel, sPath, sContextPath) {
            var aProperty = oCardPropertiesModel.getProperty(sContextPath);

            // Clean up all the error"s for sPath before adding new one"s for the same sContextPath
            oCardPropertiesModel.firePropertyChange({
                context: oCardPropertiesModel.getContext(sContextPath),
                path: sContextPath + "," + sPath,
                value: oCardPropertiesModel.getProperty(sContextPath),
                reason: ChangeReason.Change
            });

            for (var i = 0; i < aProperty.length; i++) {
                var sCurrentContextPath = sContextPath + "/" + i;
                oCardPropertiesModel.firePropertyChange({
                    context: oCardPropertiesModel.getContext(sCurrentContextPath),
                    path: sPath,
                    value: oCardPropertiesModel.getProperty(sCurrentContextPath + "/" + sPath),
                    reason: ChangeReason.Change
                });
            }
        },

        setEnablePropertyForResetAndSaveButton : function (bEnabled) {
            settingsUtils.enableResetButton(bEnabled);
            settingsUtils.enableSaveButton(bEnabled);
        },

        getValueInRemString : function (iValue) {
            return iValue + "rem";
        },

        _getSelectedItemIndex : function (oModel) {
            return oModel.getProperty("/selectedItemIndex");
        },

        _getLastItemIndex : function (oModel) {
            return this._getStaticContentArray(oModel).length - 1;
        },

        _getStaticContentArray : function (oModel) {
            return oModel.getProperty("/staticContent");
        },

        _setStaticContentArray : function (oModel, aStaticContent) {
            oModel.setProperty("/staticContent", aStaticContent);
        },

        _setSelectedItemAndScrollToElement : function (iIndex, bHaveDelegate) {
            var oView = this.getView(),
                oList = oView.byId("sapOvpStaticLinkListLineItem"),
                oScrollContainer = oView.byId("scrollContainer"),
                oCardPropertiesModel = oView.getModel();

            // Handling errors for Link title and Static Link
            this.handleErrorHandling(oCardPropertiesModel, "title", "/staticContent");
            this.handleErrorHandling(oCardPropertiesModel, "targetUri", "/staticContent");

            var oItem = oList.getItems()[iIndex];
            if (bHaveDelegate) {
                this._oList = oList;
                this._oItem = oItem;
                this._oScrollContainer = oScrollContainer;
                var oDelegateOnAfter = {
                    onAfterRendering: function (oEvent) {
                        this._oList.removeEventDelegate(this._oDelegateOnAfter);
                        this._oScrollContainer.scrollToElement(this._oItem);
                        delete this._oDelegateOnAfter;
                        delete this._oList;
                        delete this._oScrollContainer;
                        delete this._oItem;
                    }
                };
                this._oDelegateOnAfter = oDelegateOnAfter;
                oList.addEventDelegate(oDelegateOnAfter, this);
            } else {
                oScrollContainer.scrollToElement(oItem);
            }
            oList.setSelectedItem(oItem);
            oList.fireSelectionChange();
        },

        _arrangeStaticContent : function (oModel, iFrom, iTo) {
            var aStaticContent = this._getStaticContentArray(oModel);
            // Change Position
            aStaticContent.splice(iTo, 0, aStaticContent.splice(iFrom, 1)[0]);
            this._setStaticContentArray(oModel, aStaticContent);
            this._setSelectedItemAndScrollToElement(iTo);
        },

        getIndexFromIdForStaticLinkList : function (sId) {
            var aSplitIds = sId.split("-");
            return aSplitIds[aSplitIds.length - 1];
        },

        _getImageData : function () {
            var aImageItemList = [];

            aImageItemList.push({
                "Name": "AW.png",
                "Image": LinkAnnotationHelper.formUrl(this.getView().getModel().getProperty("/baseUrl"), "img/AW.png")
            });

            return aImageItemList;
        },

        _getIconData : function (sIconUri) {
            var aIcons = IconPool.getIconNames(),
                aItemList = [];

            if (sIconUri) {
                var sName = sIconUri.split("://")[1],
                    iIndex = aIcons.indexOf(sName);
                aIcons.splice(iIndex, 1);
                aItemList.push({
                    "Name": sName,
                    "Icon": IconPool.getIconURI(sName)
                });
            }

            for (var i = 0; i < aIcons.length; i++) {
                aItemList.push({
                    "Name": aIcons[i],
                    "Icon": IconPool.getIconURI(aIcons[i])
                });
            }
            return aItemList;
        },

        _getLinkListItemId : function (oModel, iIndex) {
            return oModel.getProperty("/staticContent/" + iIndex + "/index");
        },

        _makeLinkListItemId : function (iIndex) {
            return "linkListItem--" + iIndex;
        },

        _makeLinkListItemIndex : function (iIndex) {
            return "Index--" + iIndex;
        },

        getIconAndImageDataModel : function (sIconUri) {
            /*Setting model to the table row*/
            var aIcons = this._getIconData(sIconUri),
                aImages = this._getImageData();

            return new JSONModel({
                "Icons": aIcons,
                "Images": aImages,
                "NoOfIcons": aIcons.length,
                "NoOfImages": aImages.length
            });
        },

        destroyTemplatesAndObjects : function () {
            var oView = this.getView();
            var oTableFilterImage = oView.byId("tableFilterImage");
            if (oTableFilterImage) {
                oTableFilterImage.destroy();
            }
            var oTableFilter = oView.byId("tableFilter");
            if (oTableFilter) {
                oTableFilter.destroy();
            }
            var oTableFilterLinks = oView.byId("tableFilterLinks");
            if (oTableFilterLinks) {
                oTableFilterLinks.destroy();
            }
            delete this._oEvent;
            delete this._iCurrentRow;
            delete this._oModel;
            delete this._oVisibilityModel;
            delete this._oIconsDialogContentView;
            delete this._oLinksDialogContentView;
            delete this._oLineItemDialogContentView;
        },

        onExternalUrlChange : function (oEvent) {
            this.setEnablePropertyForResetAndSaveButton(true);
        },

        onLinkSourceChange : function (oEvent) {
            var oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                oVisibilityModel = oSource.getModel("visibility"),
                iIndex = this.getIndexFromIdForStaticLinkList(oSource.getId()),
                iSelectedIndex = oEvent.getParameter("selectedIndex"),
                oStaticLink = oVisibilityModel.getProperty("/staticLink"),
                oLinks = oVisibilityModel.getProperty("/links"),
                sId = this._getLinkListItemId(oModel, parseInt(iIndex, 10));

            if (iSelectedIndex === 0) {
                oStaticLink[sId] = false;
                oLinks[sId] = true;
                oModel.setProperty("/staticContent/" + iIndex + "/targetUri", undefined);
            } else {
                oStaticLink[sId] = true;
                oLinks[sId] = false;
                oModel.setProperty("/staticContent/" + iIndex + "/semanticObject", undefined);
                oModel.setProperty("/staticContent/" + iIndex + "/action", undefined);
                oModel.setProperty("/staticContent/" + iIndex + "/targetUri", "");
            }
            oVisibilityModel.setProperty("/staticLink", oStaticLink);
            oVisibilityModel.setProperty("/links", oLinks);
            oVisibilityModel.refresh(true);
            oModel.refresh(true);
            this.handleErrorForProperty(oModel, "targetUri", "/staticContent/" + iIndex);
            this.setEnablePropertyForResetAndSaveButton(true);
        },

        onRemoveVisualPress : function (oEvent) {
            var oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                oVisibilityModel = oSource.getModel("visibility"),
                iIndex = this.getIndexFromIdForStaticLinkList(oSource.getId()),
                sId = this._getLinkListItemId(oModel, parseInt(iIndex, 10)),
                oRemoveVisual = oVisibilityModel.getProperty("/removeVisual");

            oRemoveVisual[sId] = false;
            oVisibilityModel.setProperty("/removeVisual", oRemoveVisual);
            oVisibilityModel.refresh(true);
            oModel.setProperty("/staticContent/" + iIndex + "/imageUri", undefined);
            oModel.refresh(true);
            this.updateCard(oEvent, "sapOvpSettingsStaticLinkListRemoveVisual");
        },

        createValueHelpDialogForInternalUrl : function (oEvent) {
            var oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                oExtraStaticCardPropertiesModel = oSource.getModel("staticCardProperties"),
                oVisibilityModel = oSource.getModel("visibility"),
                iIndex = this.getIndexFromIdForStaticLinkList(oSource.getId());

            this.attachBrowserHeightChangeHandler();

            this._oEvent = jQuery.extend({}, oEvent);
            this._iCurrentRow = iIndex;
            this._oModel = oModel;
            this._oVisibilityModel = oVisibilityModel;

            // links dialog close button
            var oCancelButton = new Button("linksCancelBtn", {
                text: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("cancelBtn")
            });

            // links dialog
            this.linksDialog = new Dialog({
                title: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("OVP_KEYUSER_SELECT_APPLICATION_DIALOG"),
                buttons: [oCancelButton]
            }).addStyleClass("sapOvpSettingsDialogBox");

            oExtraStaticCardPropertiesModel.setProperty("/densityStyle", this.getDensityStyle());

            oExtraStaticCardPropertiesModel.setProperty("/NoOfLinks", oExtraStaticCardPropertiesModel.getProperty("/links").length);

            // Links Dialog
            var oLinksDialogContent = new sap.ui.view("linksDialogContent", {
                viewName: "sap.ovp.cards.rta.SelectLinks",
                type: ViewType.XML,
                preprocessors: {
                    xml: {
                        bindingContexts: {
                            tableRows: oExtraStaticCardPropertiesModel.createBindingContext("/")
                        },
                        models: {
                            tableRows: oExtraStaticCardPropertiesModel
                        }
                    }
                }
            });

            oLinksDialogContent.setModel(oExtraStaticCardPropertiesModel);
            oLinksDialogContent.setModel(this.getView().getModel("ovpResourceModel"), "ovpResourceModel");

            this.linksDialog.addContent(oLinksDialogContent);

            oLinksDialogContent.loaded().then(function (oView) {
                this._oLinksDialogContentView = oView;
                /**
                 *  Don't remove the below implementation because
                 *  This function acts as a bridge between SettingsDialog and SelectLinks Controller
                 *
                 *  Adding new function "updateLinkPath" to SelectLinks controller with 'this' context
                 *  of SettingsDialog controller.
                 */
                oView.getController().updateLinkPath = function (sIntent) {
                    var aIntentParts = sIntent.slice(1).split("-"),
                        sSemanticObject = aIntentParts[0],
                        sAction = aIntentParts[1];

                    this._oModel.setProperty("/staticContent/" + this._iCurrentRow + "/semanticObject", sSemanticObject);
                    this._oModel.setProperty("/staticContent/" + this._iCurrentRow + "/action", sAction);
                    this._oModel.refresh(true);
                    this.setEnablePropertyForResetAndSaveButton(true);

                    this.cleanAndCloseDialog(oCancelButton);
                }.bind(this);

                oCancelButton.attachPress(function () {
                    this.cleanAndCloseDialog(oCancelButton);
                }.bind(this));

                this.linksDialog.open();

                /**
                 *  Set Links Dialog Height for the first time
                 *  This is inside setTimeout because height is not correctly calculated.
                 */
                setTimeout(function () {
                    this.browserHeightChange();
                }.bind(this), 0);
            }.bind(this));
        },

        onChangeVisualPress : function (oEvent) {
            var oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                oVisibilityModel = oSource.getModel("visibility"),
                iIndex = this.getIndexFromIdForStaticLinkList(oSource.getId()),
                sIconUri = oModel.getProperty("/staticContent/" + iIndex + "/imageUri"),
                bNotIcon = LinkAnnotationHelper.isImageUrlStaticData(sIconUri);

            this.attachBrowserHeightChangeHandler();

            this._oEvent = jQuery.extend({}, oEvent);
            this._iCurrentRow = iIndex;
            this._oModel = oModel;
            this._oVisibilityModel = oVisibilityModel;

            // icons dialog close button
            var oCancelButton = new Button("iconsCancelBtn", {
                text: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("cancelBtn")
            });

            // icons dialog
            this.iconsDialog = new Dialog({
                title: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("OVP_KEYUSER_SELECT_VISUAL_DIALOG"),
                buttons: [oCancelButton]
            }).addStyleClass("sapOvpSettingsDialogBox");

            /*Data to Show in Table*/
            /*Setting model to the table row*/
            var oRowsModel = (bNotIcon) ? this.getIconAndImageDataModel() : this.getIconAndImageDataModel(sIconUri);

            oRowsModel.setProperty("/densityStyle", this.getDensityStyle());

            // Icons Dialog
            var oIconsDialogContent = new sap.ui.view("iconsDialogContent", {
                viewName: "sap.ovp.cards.rta.SelectIcons",
                type: ViewType.XML,
                preprocessors: {
                    xml: {
                        bindingContexts: {
                            tableRows: oRowsModel.createBindingContext("/")
                        },
                        models: {
                            tableRows: oRowsModel
                        }
                    }
                }
            });

            // Initially setting Table Name to "IconTable"
            oRowsModel.setProperty("/tableName", "IconTable");

            oIconsDialogContent.setModel(oRowsModel);
            oIconsDialogContent.setModel(this.getView().getModel("ovpResourceModel"), "ovpResourceModel");

            this.iconsDialog.addContent(oIconsDialogContent);

            oIconsDialogContent.loaded().then(function (oView) {
                this._oIconsDialogContentView = oView;
                /**
                 *  Don't remove the below implementation because
                 *  This function acts as a bridge between SettingsDialog and SelectIcons Controller
                 *
                 *  Adding new function "updateIconPath" to SelectIcons controller with 'this' context
                 *  of SettingsDialog controller.
                 */
                oView.getController().updateIconPath = function (sUri) {
                    var sId = this._getLinkListItemId(this._oModel, parseInt(this._iCurrentRow, 10)),
                        oRemoveVisual = this._oVisibilityModel.getProperty("/removeVisual");

                    oRemoveVisual[sId] = true;
                    this._oVisibilityModel.setProperty("/removeVisual", oRemoveVisual);
                    this._oVisibilityModel.refresh(true);

                    this._oModel.setProperty("/staticContent/" + this._iCurrentRow + "/imageUri", sUri);
                    this._oModel.refresh(true);
                    this.updateCard(this._oEvent, "sapOvpSettingsStaticLinkListChangeVisual");

                    this.cleanAndCloseDialog(oCancelButton);
                }.bind(this);

                oCancelButton.attachPress(function () {
                    this.cleanAndCloseDialog(oCancelButton);
                }.bind(this));

                this.iconsDialog.open();

                /**
                 *  Set Icons Dialog Height for the first time
                 *  This is inside setTimeout because height is not correctly calculated.
                 */
                setTimeout(function () {
                    this.browserHeightChange();
                }.bind(this), 0);
            }.bind(this));

        },

        getDensityStyle : function () {
            if (!Device.support.touch) {
                return "compact";
            } else {
                return "cozy";
            }
        },

        cleanAndCloseDialog : function (oCancelButton) {
            if (this._oIconsDialogContentView) {
                this._oIconsDialogContentView.destroy();
            }
            if (this._oLinksDialogContentView) {
                this._oLinksDialogContentView.destroy();
            }
            if (this._oLineItemDialogContentView) {
                this._oLineItemDialogContentView.destroy();
            }
            this.destroyTemplatesAndObjects();
            if (this.iconsDialog) {
                this.iconsDialog.close();
            }
            if (this.linksDialog) {
                this.linksDialog.close();
            }
            if (this.lineItemDialog) {
                this.lineItemDialog.close();
            }
            oCancelButton.destroy();
            this.detachBrowserHeightChangeHandler();
        },

        attachBrowserHeightChangeHandler : function () {
            Device.resize.attachHandler(this.browserHeightChange, this);
        },

        detachBrowserHeightChangeHandler : function () {
            Device.resize.detachHandler(this.browserHeightChange, this);
        },

        browserHeightChange : function (iBrowser) {
            var oDialog, oDialogContent, sScrollContainerName;
            if (this.iconsDialog && this._oIconsDialogContentView) {
                oDialog = this.iconsDialog;
                oDialogContent = this._oIconsDialogContentView;
                sScrollContainerName = "iconsScrollContainer";
            } else if (this.linksDialog && this._oLinksDialogContentView) {
                oDialog = this.linksDialog;
                oDialogContent = this._oLinksDialogContentView;
                sScrollContainerName = "linksScrollContainer";
            } else if (this.lineItemDialog && this._oLineItemDialogContentView) {
                oDialog = this.lineItemDialog;
                oDialogContent = this._oLineItemDialogContentView;
                sScrollContainerName = "lineItemScrollContainer";
            }

            if (oDialog && oDialogContent && sScrollContainerName) {
                var oDomRef = oDialog.getDomRef(),
                    /**
                     *  Expected Height is coming from the following class
                     *  .sapMDialog:not(.sapMDialog-NoHeader):not(.sapMDialog-NoFooter):not(.sapMDialogWithSubHeader)
                     *  where max-height: calc(100% - 6rem - 7%) ---> roughly translates to 93% of iBrowserHeight
                     *  6rem is ignored because it represents the height of header and footer of the dialog combined
                     */
                    iDialogExpectedHeight = (iBrowser ? (iBrowser.height * 93) / 100 : settingsUtils.dialogBox.getDomRef()
                            .getBoundingClientRect().height),
                    iDialogActualHeight = oDomRef.getBoundingClientRect().height,
                    iHeight = Math.max(iDialogExpectedHeight, iDialogActualHeight) - (CommonUtils.getPixelPerRem() * 9),
                    oScrollContainer = oDialogContent.byId(sScrollContainerName);

                oScrollContainer.setHeight(iHeight + "px");
            }
        },

        handleMessagePopoverPress : function (oEvent) {
            settingsUtils.oMessagePopOver.openBy(oEvent.getSource());
        },

        onShowMorePress : function (oEvent) {
            var oSource = oEvent.getSource(),
                oModel = oSource.getModel(),
                oVisibilityModel = oSource.getModel("visibility"),
                iIndex = this.getIndexFromIdForStaticLinkList(oSource.getId()),
                sId = this._getLinkListItemId(oModel, parseInt(iIndex, 10)),
                bShowMore = oVisibilityModel.getProperty("/showMore/" + sId);

            if (bShowMore) {
                oVisibilityModel.setProperty("/showMore/" + sId, false);
            } else {
                oVisibilityModel.setProperty("/showMore/" + sId, true);
            }
            oVisibilityModel.refresh(true);
        },

        onPressDelete : function (oEvent) {
            this._oEvent = jQuery.extend({}, oEvent);
            MessageBox.confirm(
                "Do you want to delete the Line Item",
                {
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    icon: MessageBox.Icon.INFORMATION,
                    title: "Information",
                    initialFocus: MessageBox.Action.CANCEL,
                    onClose: function(sAction) {
                        if (sAction === "OK") {
                            var oSource = this._oEvent.getSource(),
                                oVisibilityModel = oSource.getModel("visibility"),
                                oModel = oSource.getModel(),
                                aStaticContent = this._getStaticContentArray(oModel),
                                iIndex = this._getSelectedItemIndex(oModel),
                                sId = this._getLinkListItemId(oModel, iIndex),
                                oStaticLink = oVisibilityModel.getProperty("/staticLink"),
                                oLinks = oVisibilityModel.getProperty("/links"),
                                oRemoveVisual = oVisibilityModel.getProperty("/removeVisual"),
                                oShowMore = oVisibilityModel.getProperty("/showMore");

                            delete oStaticLink[sId];
                            delete oLinks[sId];
                            delete oRemoveVisual[sId];
                            delete oShowMore[sId];
                            oVisibilityModel.setProperty("/staticLink", oStaticLink);
                            oVisibilityModel.setProperty("/links", oLinks);
                            oVisibilityModel.setProperty("/removeVisual", oRemoveVisual);
                            oVisibilityModel.setProperty("/showMore", oShowMore);
                            aStaticContent.splice(iIndex, 1);
                            this._setStaticContentArray(oModel, aStaticContent);
                            oModel.refresh(true);
                            if (aStaticContent.length > 0) {
                                this._setSelectedItemAndScrollToElement(Math.min(parseInt(iIndex, 10), aStaticContent.length - 1), true);
                            }
                            if (aStaticContent.length <= 1) {
                                oVisibilityModel.setProperty("/delete", false);
                            }
                            oVisibilityModel.refresh(true);
                            this.updateCard(this._oEvent, "sapOvpSettingsStaticLinkListDelete");
                        }
                        delete this._oEvent;
                    }.bind(this)
                }
            );
        },

        onPressAdd : function (oEvent) {
            var oSource = oEvent.getSource(),
                oVisibilityModel = oSource.getModel("visibility"),
                oModel = oSource.getModel(),
                aStaticContent = this._getStaticContentArray(oModel),
                iLineItemIdCounter = oModel.getProperty("/lineItemIdCounter"),
                sId = this._makeLinkListItemId(iLineItemIdCounter + 1),
                sIndex = this._makeLinkListItemIndex(iLineItemIdCounter + 1),
                oStaticLink = oVisibilityModel.getProperty("/staticLink"),
                oLinks = oVisibilityModel.getProperty("/links"),
                oRemoveVisual = oVisibilityModel.getProperty("/removeVisual"),
                oShowMore = oVisibilityModel.getProperty("/showMore");

            oModel.setProperty("/lineItemIdCounter", iLineItemIdCounter + 1);
            aStaticContent.unshift({
                "id": sId,
                "index": sIndex,
                "title": "Default Title",
                "subTitle": "Default SubTitle",
                "imageUri": "",
                "imageAltText": "",
                "targetUri": "",
                "openInNewWindow": ""
            });
            oStaticLink[sIndex] = true;
            oLinks[sIndex] = false;
            oRemoveVisual[sIndex] = false;
            oShowMore[sIndex] = false;
            oVisibilityModel.setProperty("/staticLink", oStaticLink);
            oVisibilityModel.setProperty("/links", oLinks);
            oVisibilityModel.setProperty("/removeVisual", oRemoveVisual);
            oVisibilityModel.setProperty("/showMore", oShowMore);
            oVisibilityModel.refresh(true);
            this._setStaticContentArray(oModel, aStaticContent);
            oModel.refresh(true);
            this._setSelectedItemAndScrollToElement(0);
            this.updateCard(oEvent, "sapOvpSettingsStaticLinkListAdd");
        },

        onPressMoveToTheTop : function (oEvent) {
            var oModel = oEvent.getSource().getModel();
            this._arrangeStaticContent(oModel, this._getSelectedItemIndex(oModel), 0);
            this.updateCard(oEvent, "sapOvpSettingsStaticLinkListSort");
        },

        onPressMoveUp : function (oEvent) {
            var oModel = oEvent.getSource().getModel(),
                iIndex = this._getSelectedItemIndex(oModel);
            this._arrangeStaticContent(oModel, iIndex, iIndex - 1);
            this.updateCard(oEvent, "sapOvpSettingsStaticLinkListSort");
        },

        onPressMoveDown : function (oEvent) {
            var oModel = oEvent.getSource().getModel(),
                iIndex = this._getSelectedItemIndex(oModel);
            this._arrangeStaticContent(oModel, iIndex, iIndex + 1);
            this.updateCard(oEvent, "sapOvpSettingsStaticLinkListSort");
        },

        onPressMoveToTheBottom : function (oEvent) {
            var oModel = oEvent.getSource().getModel(),
                iIndexFrom = this._getSelectedItemIndex(oModel),
                iIndexTo = this._getLastItemIndex(oModel);
            this._arrangeStaticContent(oModel, iIndexFrom, iIndexTo);
            this.updateCard(oEvent, "sapOvpSettingsStaticLinkListSort");
        },

        onResetButton : function () {
            this._oCardManifestSettings = jQuery.extend(true, {}, this._oOriginalCardManifestSettings);
            var oCardPropertiesModel = this.getView().getModel();
            oCardPropertiesModel.setProperty("/", this._oCardManifestSettings);
            settingsUtils.setVisibilityForFormElements(this._oCardManifestSettings);
            this.getView().getModel("visibility").refresh();
            if (this._oCardManifestSettings.layoutDetail === "resizable") {
                if (this._oCardManifestSettings.stopResizing) {
                    this.getView().byId("sapOvpSettingsStopResize").setState(false);
                } else if (!this._oCardManifestSettings.stopResizing) {
                    this.getView().byId("sapOvpSettingsStopResize").setState(true);
                }
            }

            // Resetting Error Handling
            settingsUtils.resetErrorHandling();

            this.setEnablePropertyForResetAndSaveButton(false);
            this._fCardWithRefresh();
        },

        onSaveButtonPress : function () {
            if (settingsUtils.bError) {
                settingsUtils.oMessagePopOverButton.firePress();
            } else {
                this.createAndSubmitChange.bind(this)();
            }
        },

        onResizingChange: function (oEvent) {
            var bStopResizing = oEvent.getParameter("state");
            this._oCardManifestSettings.stopResizing = !bStopResizing;
            this.updateCard(oEvent);
        },

        onNumberOfRowsChanged: function (oEvent) {
            var iRows = +this._oCardManifestSettings.defaultSpan.rows;
            this._oCardManifestSettings.defaultSpan.rows = iRows;
            this._oCardManifestSettings.defaultSpan.showOnlyHeader = (iRows === 0);
            this._oCardManifestSettings.cardLayout.showOnlyHeader = (iRows === 0);
            var aCardTypeForNoOfItem = ["sap.ovp.cards.list", "sap.ovp.cards.table"];
            if (aCardTypeForNoOfItem.indexOf(this._oCardManifestSettings.template) !== -1) {
                this._oCardManifestSettings.cardLayout.noOfItems = iRows;
            } else {
                this._oCardManifestSettings.cardLayout.rowSpan = iRows;
            }
            this.updateCard(oEvent);
        },

        onNumberOfColumnsChanged : function (oEvent) {
            this._oCardManifestSettings.defaultSpan.cols = +this._oCardManifestSettings.defaultSpan.cols;
            this.updateCard(oEvent);
        },

        setBusy : function (bBusy) {
            if (bBusy) {
//                this.getView().byId("dialogCard").addStyleClass("componentContainerBusy");
                this.getView().addStyleClass("dialogContainerOverlay");
                var dialogCard = this.getView().byId("dialogCard");
                if (dialogCard.getVisible()) {
                    dialogCard.getComponentInstance().getRootControl().setBusy(bBusy);
                }
            } else {
//                this.getView().byId("dialogCard").removeStyleClass("componentContainerBusy");
                this.getView().removeStyleClass("dialogContainerOverlay");
//                this.getView().byId("dialogCard").setBusy(bBusy);
                setTimeout( function(){
                    var dialogCard = this.getView().byId("dialogCard");
                    if (dialogCard.getVisible()) {
                        dialogCard.getComponentInstance().getRootControl().setBusy(bBusy);
                    }
                }.bind(this), 2000);
            }
            
//            this.getView().byId("dialogCard").setBusy(bBusy);

        },

        _fCardWithoutRefresh : function (oEvent, updatedElementProps) {
            var oView = this.getView(),
                oCardManifestSettings = this._oCardManifestSettings,
                oComponentInstance = oView.byId("dialogCard").getComponentInstance(),
                oRootControl = oComponentInstance.getRootControl(),
                oCardController = oRootControl.getController(),
                oCardPropertiesModel = oCardController.getCardPropertiesModel(),
                oElement, oManifestModel,
                isViewSwitchEnabled = false,
                iSelectedKey;
            if (oCardManifestSettings.tabs && oCardManifestSettings.tabs.length) {
                isViewSwitchEnabled = true;
                iSelectedKey = parseInt(oCardManifestSettings.selectedKey,10);
            }
            if (updatedElementProps.formElementId === "sapOvpSettingsLineItemTitle" ||
                updatedElementProps.formElementId === "sapOvpSettingsLineItemSubTitle") {
                oElement = oRootControl.byId(updatedElementProps.cardElementId + "--" + oView.getModel().getProperty("/lineItemId"));
            } else {
                oElement = oRootControl.byId(updatedElementProps.cardElementId);
                if (!oElement) {
                    this._fCardWithRefresh(oEvent, updatedElementProps.cardElementId);
                }
            }
            switch (updatedElementProps.formElementId) {
                case "sapOvpSettingsLineItemTitle":
                case "sapOvpSettingsLineItemSubTitle":
                case "sapOvpSettingsTitle" :
                case "sapOvpSettingsValueSelectionInfo" :
                    if (oElement) {
                        oElement.setText(oEvent.getSource().getValue());
                    }
                    break;
                case "sapOvpSettingsSubTitle" :
                    oCardPropertiesModel.setProperty("/subTitle", oEvent.getSource().getValue());
                    oCardController._setSubTitleWithUnitOfMeasure();
                    break;
                case "sapOvpSettingsViewName":
                    var viewName = oCardManifestSettings.viewName;
                    oManifestModel = oView.getModel();
                    oElement.getItems()[iSelectedKey - 1].setText(viewName);
                    oCardManifestSettings.tabs[iSelectedKey - 1].value = viewName;
                    if (oCardManifestSettings.defaultViewSelected === iSelectedKey) {
                        viewName = viewName + " (" + this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_DEFAULT_VIEW") + ")";
                    }
                    oCardManifestSettings.aViews[iSelectedKey].text = viewName;
                    oManifestModel.refresh();
                    break;
                case "sapOvpDefaultViewSwitch":
                    if (oEvent.getSource().getState()) {
                        var defaultSelectedKey = oCardManifestSettings.defaultViewSelected;
                        oManifestModel = oView.getModel();
                        oCardManifestSettings.defaultViewSelected = iSelectedKey;
                        oCardManifestSettings.aViews[defaultSelectedKey].text = oCardManifestSettings.tabs[defaultSelectedKey - 1].value;
                        oCardManifestSettings.aViews[iSelectedKey].text += " (" + this.oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_DEFAULT_VIEW") + ")";
                        oManifestModel.refresh();
                        this.defaultViewSwitch = oEvent.getSource();
                        this.defaultViewSwitch.setEnabled(false);
                    }
                    break;
                case "sapOvpSettingsIdentification" :
                    if (isViewSwitchEnabled) {
                        oCardManifestSettings.tabs[iSelectedKey - 1][updatedElementProps.updateProperty] = oCardManifestSettings[updatedElementProps.updateProperty];
                    }
                    break;
                case "sapOvpSettingsKPIHeaderSwitch" :
                    var oVisibilityModel = oView.getModel("visibility"),
                        oVisibilityData = oVisibilityModel.getData();
                    oVisibilityData.dataPoint = false;
                    oVisibilityData.valueSelectionInfo = false;
                    if (isViewSwitchEnabled) {
                        oCardManifestSettings.tabs.forEach(function(tab) {
                            tab.prevDataPointAnnotationPath = tab.dataPointAnnotationPath;
                            tab.dataPointAnnotationPath = undefined;
                        });
                    } else {
                        var sDataPointAnnotationPath = oCardManifestSettings.dataPointAnnotationPath;
                        if (sDataPointAnnotationPath) {
                            oCardManifestSettings.prevDataPointAnnotationPath = sDataPointAnnotationPath;
                        }
                        oCardManifestSettings.dataPointAnnotationPath = undefined;
                    }
                    oVisibilityModel.refresh(true);
                    oElement.destroy();
                    break;
                default :
                    break;
            }
        },

        _fCardWithRefresh : function (oEvent, updateProperty) {
            var sPrevDataPointAnnotationPath,defaultViewSelected,oView,oVisibilityModel,oVisibilityData,
                oCardManifestSettings = this._oCardManifestSettings,
                oSettingDialog = this.getView(),
                oComponentContainer = oSettingDialog.byId("dialogCard"),
                card = oComponentContainer.getComponentInstance().getComponentData(),
                sCardId = card.cardId,
                modelName = card.manifest.cards[sCardId].model,
                oManifest = {
                    cards: {}
                },
                isViewSwitchEnabled = false,
                iSelectedKey;
            if (oCardManifestSettings.tabs && oCardManifestSettings.tabs.length) {
                isViewSwitchEnabled = true;
                /*selectedKey gets set to string from UI select Box*/
                iSelectedKey = parseInt(oCardManifestSettings.selectedKey,10);
            }

            switch (updateProperty) {
                case "subTitleSwitch" :
                    oView = this.getView();
                    oVisibilityModel = oView.getModel("visibility");
                    if (oEvent.getSource().getState()) {
                        if (isViewSwitchEnabled) {
                            defaultViewSelected = oCardManifestSettings.defaultViewSelected;
                            oCardManifestSettings.tabs.forEach(function (tab) {
                                sPrevDataPointAnnotationPath = tab.prevDynamicSubtitleAnnotationPath;
                                if (sPrevDataPointAnnotationPath) {
                                    tab.dynamicSubtitleAnnotationPath = sPrevDataPointAnnotationPath;
                                } else {
                                    tab.dynamicSubtitleAnnotationPath = oCardManifestSettings.dynamicSubTitle[0].value;
                                }
                            });
                            oCardManifestSettings.dynamicSubtitleAnnotationPath = oCardManifestSettings.tabs[defaultViewSelected - 1].dynamicSubtitleAnnotationPath;
                        } else {
                            sPrevDataPointAnnotationPath = oCardManifestSettings.prevDynamicSubtitleAnnotationPath;
                            if (sPrevDataPointAnnotationPath) {
                                oCardManifestSettings.dynamicSubtitleAnnotationPath = sPrevDataPointAnnotationPath;
                            } else {
                                oCardManifestSettings.dynamicSubtitleAnnotationPath = oCardManifestSettings.dynamicSubTitle[0].value;
                            }
                        }
                        oSettingDialog.byId("sapOvpSettingsDynamicSubTitle").setSelectedKey(oCardManifestSettings.dynamicSubtitleAnnotationPath);
                    } else {
                        if (isViewSwitchEnabled) {
                            oCardManifestSettings.tabs.forEach(function(tab) {
                                tab.prevDynamicSubtitleAnnotationPath = tab.dynamicSubtitleAnnotationPath;
                                tab.dynamicSubtitleAnnotationPath = undefined;
                            });
                            oCardManifestSettings.dynamicSubtitleAnnotationPath = undefined;
                        } else {
                            var sDataPointAnnotationPath = oCardManifestSettings.dynamicSubtitleAnnotationPath;
                            if (sDataPointAnnotationPath) {
                                oCardManifestSettings.prevDynamicSubtitleAnnotationPath = sDataPointAnnotationPath;
                            }
                            oCardManifestSettings.dynamicSubtitleAnnotationPath = undefined;
                        }
                    }
                    oVisibilityModel.setProperty("/subTitle",
                        settingsUtils.getVisibilityOfElement(oCardManifestSettings, "subTitle", isViewSwitchEnabled));
                    oVisibilityModel.setProperty("/dynamicSubTitle",
                        settingsUtils.getVisibilityOfElement(oCardManifestSettings, "dynamicSubTitle", isViewSwitchEnabled)
                        && !!oCardManifestSettings["dynamicSubTitle"] && !!oCardManifestSettings["dynamicSubTitle"].length);
                    oVisibilityModel.refresh(true);
                    break;
                case "kpiHeader" :
                    oView = this.getView();
                    oVisibilityModel = oView.getModel("visibility");
                    oVisibilityData = oVisibilityModel.getData();
                    oVisibilityData.valueSelectionInfo = true;
                    oVisibilityData.dataPoint = true;
                    if (oCardManifestSettings.tabs && oCardManifestSettings.tabs.length ) {
                        oVisibilityData.dataPoint = settingsUtils.getVisibilityOfElement(oCardManifestSettings, "dataPoint", true);
                    }
                    if (!oCardManifestSettings.valueSelectionInfo) {
                        oCardManifestSettings.valueSelectionInfo = " ";
                    }
                    if (isViewSwitchEnabled) {
                        defaultViewSelected = oCardManifestSettings.defaultViewSelected;
                        oCardManifestSettings.tabs.forEach(function (tab) {
                            sPrevDataPointAnnotationPath = tab.prevDataPointAnnotationPath;
                            if (sPrevDataPointAnnotationPath) {
                                tab.dataPointAnnotationPath = sPrevDataPointAnnotationPath;
                            } else {
                                tab.dataPointAnnotationPath = oCardManifestSettings.dataPoint[0].value;
                            }
                        });
                        oCardManifestSettings.dataPointAnnotationPath = oCardManifestSettings.tabs[defaultViewSelected - 1].dataPointAnnotationPath;
                    } else {
                        sPrevDataPointAnnotationPath = oCardManifestSettings.prevDataPointAnnotationPath;
                        if (sPrevDataPointAnnotationPath) {
                            oCardManifestSettings.dataPointAnnotationPath = sPrevDataPointAnnotationPath;
                        } else {
                            oCardManifestSettings.dataPointAnnotationPath = oCardManifestSettings.dataPoint[0].value;
                        }
                    }
                    oVisibilityModel.refresh(true);
                    break;
                case "listType" :
                    oCardManifestSettings[updateProperty] = (oEvent.getSource().getState()) ? "extended" : "condensed";
                    break;
                case "listFlavor" :
                    oCardManifestSettings[updateProperty] = (oEvent.getSource().getState()) ? "bar" : "";
                    break;
                case "sortBy" :
                    oView = this.getView();
                    oVisibilityModel = oView.getModel("visibility");
                    oVisibilityData = oVisibilityModel.getData();
                    if (!!oCardManifestSettings.sortBy !== oVisibilityData.sortOrder ) {
                        oVisibilityData.sortOrder = !!oCardManifestSettings.sortBy;
                        oVisibilityModel.refresh();
                    }
                    break;
                case "listFlavorForLinkList":
                case "sortOrder":
                    break;
                case "annotationPath":
                case "chartAnnotationPath":
                case "presentationAnnotationPath":
                case "selectionAnnotationPath":
                case "selectionPresentationAnnotationPath":
                case "dynamicSubtitleAnnotationPath":
                case "dataPointAnnotationPath":
                    if (isViewSwitchEnabled) {
                        oCardManifestSettings.tabs[iSelectedKey - 1][updateProperty] = oCardManifestSettings[updateProperty];
                    }
                    break;
                case "noOfRows":
                case "ovpHeaderTitle":
                case "add":
                case "removeVisual":
                case "changeVisual":
                case "sort":
                case "delete":
                    break;
                default :
                    break;
            }
            oManifest.cards[sCardId] = {
                template: card.template,
                settings: oCardManifestSettings
            };

            if (!!modelName) {
                oManifest.cards[sCardId].model = modelName;
            }

            this.setBusy(true);
            var oPromise = OVPCardAsAPIUtils.createCardComponent(oSettingDialog, oManifest, "dialogCard");
            oPromise.then(function(){
                this.setBusy(false);

                var oList = this.getView().byId("sapOvpStaticLinkListLineItem");
                if (oList) {
                    var oItem = oList.getSelectedItem();
                    if (oItem) {
                        var sId = oItem.getId(),
                            iIndex = this.getIndexFromIdForStaticLinkList(sId);
                        // Setting the Active Page in Case of Carousel Card
                        this.setCurrentActivePageForCarouselCard(iIndex);
                    }
                }
            }.bind(this));
            oPromise.catch(function(){
                this.setBusy(false);
            }.bind(this));
        },

        updateCard : function(oEvent, sId) {
            /*Reset Card Level Button*/
            var oCardManifestSettings = this._oCardManifestSettings,
                dialogCard = this.getView().byId("dialogCard");
            this.setEnablePropertyForResetAndSaveButton(true);
            if (dialogCard.getVisible()) {
                /*Reset View Level Button*/
                if (oCardManifestSettings.tabs && oCardManifestSettings.tabs.length) {
                    /*selectedKey gets set to string from UI select Box*/
                    var iSelectedKey = parseInt(oCardManifestSettings.selectedKey, 10);
                    oCardManifestSettings.isViewResetEnabled = true;
                    oCardManifestSettings.aViews[iSelectedKey].isViewResetEnabled = true;
                }
                var oSource = oEvent.getSource(),
                    sourceElementId = (sId) ? sId : oSource.getId(),
                    bCardWithoutRefresh = false;
                if (sourceElementId.indexOf("sapOvpStaticLinkListLineItem") !== -1) {
                    var oCardPropertiesModel = oSource.getModel(),
                        aStaticContent = oCardPropertiesModel.getData().staticContent,
                        iIndex = this.getIndexFromIdForStaticLinkList(sourceElementId);

                    // Setting the Active Page in Case of Carousel Card
                    this.setCurrentActivePageForCarouselCard(iIndex);

                    oCardPropertiesModel.setProperty("/lineItemId", aStaticContent[iIndex].id);
                    if (sourceElementId.indexOf("sapOvpSettingsLineItemTitle") !== -1) {
                        sourceElementId = "sapOvpSettingsLineItemTitle";
                    } else if (sourceElementId.indexOf("sapOvpSettingsLineItemSubTitle") !== -1) {
                        sourceElementId = "sapOvpSettingsLineItemSubTitle";
                    }
                }
                for (var i = 0; i < this._aRefreshNotRequired.length; i++) {
                    if (sourceElementId.indexOf(this._aRefreshNotRequired[i].formElementId) > -1) {
                        if (this._aRefreshNotRequired[i].isKpiSwitch && oEvent.getSource().getState()) {
                            break;
                        }
                        this._fCardWithoutRefresh(oEvent, this._aRefreshNotRequired[i]);
                        bCardWithoutRefresh = true;
                        break;
                    }
                }
                if (!bCardWithoutRefresh) {
                    for (var j = 0; j < this._aRefreshRequired.length; j++) {
                        if (sourceElementId.indexOf(this._aRefreshRequired[j].formElementId) > -1) {
                            this.setBusy(true);
                            this._fCardWithRefresh(oEvent, this._aRefreshRequired[j].updateProperty);
                            break;
                        }
                    }
                }
            }
        },
        onExit: function () {
            settingsUtils.oSaveButton.detachPress(this.onSaveButtonPress,this);
            settingsUtils.oResetButton.detachPress(this.onResetButton,this);
            settingsUtils.oMessagePopOverButton.detachPress(this.handleMessagePopoverPress, this);
        },

        getListItems : function() {
            /*Getting the  iContext for sap.ovp.annotationHelper Function*/
            var aItemList = [],
                oCardManifestSettings = this._oCardManifestSettings,
                oSettingDialog = this.getView(),
                oComponentContainer = oSettingDialog.byId("dialogCard"),
                card = oComponentContainer.getComponentInstance().getComponentData(),
                lineItemBindingPath = oCardManifestSettings.entityType.$path + "/" + oCardManifestSettings.annotationPath,
                oModel = card.model.getMetaModel(),
                iContext = oModel.getContext(oModel.resolve(lineItemBindingPath, this.oView.getBindingContext()));

            /*Forming Visible Fields String*/
            ////For Condensed List
            var maxDataFields = 2,
                maxDataPoints = 1,
                noOfDataFieldsReplaceableByDataPoints = 0;
            if (oCardManifestSettings.listFlavor === "bar") {
                //For Condensed List  Bar Card :- Max Data Fields = 2 and Max DataPoints = 1 and Replaceable fields are 0
                maxDataFields = 1;
                maxDataPoints = 2;
            }

            if (oCardManifestSettings.listType && oCardManifestSettings.listType.toLowerCase() === "extended") {
                //For Extended List Card :- Max Data Fields = 6 and Max DataPoints =  and Replaceable fields are 0
                maxDataFields = 6;
                maxDataPoints = 3;
                noOfDataFieldsReplaceableByDataPoints = 3;
                if (oCardManifestSettings.listFlavor === "bar") {
                    //For Extended Bar List Card
                    maxDataFields = 5;
                }
            } else if (oCardManifestSettings.contentFragment === "sap.ovp.cards.table.Table") {
                //For Table Card Max Data :- Fields = 3 and Max DataPoints = 1 and Replaceable fields are 1
                maxDataFields = 3;
                maxDataPoints = 1;
                noOfDataFieldsReplaceableByDataPoints = 1;
            }
            oCardManifestSettings.lineItem.forEach(function (lineItem) {
                var aDataPointsObjects = CardAnnotationHelper.getSortedDataPoints(iContext,lineItem.fields),
                    aDataFieldsObjects = CardAnnotationHelper.getSortedDataFields(iContext,lineItem.fields),
                    dataFields = [],
                    dataPoints = [];
                aDataPointsObjects.forEach(function (fields) {
                    if (fields.Title) {
                        dataPoints.push(fields.Title.String);
                    }
                });
                aDataFieldsObjects.forEach(function (fields) {
                    if (fields.Label) {
                        dataFields.push(fields.Label.String);
                    }
                });
                var noOfDataPointsUsed = Math.min(dataPoints.length, maxDataPoints),
                    noOfDataPointsOccupyingDataFieldsSpace = Math.min(noOfDataFieldsReplaceableByDataPoints,noOfDataPointsUsed),
                    visibleField = dataFields.slice(0, maxDataFields - noOfDataPointsOccupyingDataFieldsSpace)
                        .concat(dataPoints.slice(0, noOfDataPointsUsed));
                visibleField.map(function(field){
                    return field.charAt(0).toUpperCase() + field.substr(1);
                });
                aItemList.push({
                    Value: lineItem.value,
                    Label: lineItem.name,
                    VisibleFields: visibleField.toString()
                });
            });
            return aItemList;
        },
        openLineItemValueHelpDialog: function(oEvent) {
            this.attachBrowserHeightChangeHandler();

            this._oEvent = jQuery.extend({}, oEvent);

            // lineItem dialog close button
            var oCancelButton = new Button("lineItemCancelBtn", {
                text: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("cancelBtn")
            });

            // lineItem dialog
            this.lineItemDialog = new Dialog({
                title: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("OVP_KEYUSER_LINEITEM_ANNO"),
                buttons: [oCancelButton]
            }).addStyleClass("sapOvpSettingsDialogBox");

            var oRowsModel = new JSONModel({
                "lineItem": this.getListItems()
            });

            oRowsModel.setProperty("/densityStyle", this.getDensityStyle());

            oRowsModel.setProperty("/NoOfLineItem", oRowsModel.getProperty("/lineItem").length);

            // LineItem Dialog
            var oLineItemDialogContent = new sap.ui.view("lineItemDialogContent", {
                viewName: "sap.ovp.cards.rta.SelectLineItem",
                type: ViewType.XML,
                preprocessors: {
                    xml: {
                        bindingContexts: {
                            tableRows: oRowsModel.createBindingContext("/")
                        },
                        models: {
                            tableRows: oRowsModel
                        }
                    }
                }
            });

            oLineItemDialogContent.setModel(oRowsModel);
            oLineItemDialogContent.setModel(this.getView().getModel("ovpResourceModel"), "ovpResourceModel");

            this.lineItemDialog.addContent(oLineItemDialogContent);

            oLineItemDialogContent.loaded().then(function (oView) {
                this._oLineItemDialogContentView = oView;
                /**
                 *  Don't remove the below implementation because
                 *  This function acts as a bridge between SettingsDialog and SelectLineItem Controller
                 *
                 *  Adding new function "updateLineItemPath" to SelectLineItem controller with 'this' context
                 *  of SettingsDialog controller.
                 */
                oView.getController().updateLineItemPath = function (oValue) {
                    /*Getting the Value from the value selection info dialog*/
                    var selectedItem = oValue.Value,
                        oCardManifestSettings = this._oCardManifestSettings,
                    /*selectedKey gets set to string from UI select Box*/
                        iSelectedKey;
                    if (oCardManifestSettings.tabs && oCardManifestSettings.tabs.length) {
                        iSelectedKey = parseInt(oCardManifestSettings.selectedKey,10);
                    }
                    /*Updating the selected values to the Model*/
                    oCardManifestSettings.lineItemQualifier = settingsUtils.getQualifier(selectedItem);
                    oCardManifestSettings.annotationPath = selectedItem;
                    if (oCardManifestSettings.tabs && oCardManifestSettings.tabs.length) {
                        oCardManifestSettings.tabs[iSelectedKey - 1].annotationPath =
                            oCardManifestSettings.annotationPath;
                    }
                    /*Updating the Value to lineItem Input*/
                    this.getView().byId("sapOvpSettingsLineItem").setValue(oValue.Label);

                    /*Updating the card view*/
                    this._fCardWithRefresh(this._oEvent, "annotationPath");
                    /*Reset Card Level Button*/
                    this.setEnablePropertyForResetAndSaveButton(true);
                    /*Reset View Level Button*/
                    if (oCardManifestSettings.tabs && oCardManifestSettings.tabs.length) {
                        oCardManifestSettings.isViewResetEnabled = true;
                        oCardManifestSettings.aViews[iSelectedKey].isViewResetEnabled = true;
                    }

                    this.cleanAndCloseDialog(oCancelButton);
                }.bind(this);

                oCancelButton.attachPress(function () {
                    this.cleanAndCloseDialog(oCancelButton);
                }.bind(this));

                this.lineItemDialog.open();

                /**
                 *  Set LineItem Dialog Height for the first time
                 *  This is inside setTimeout because height is not correctly calculated.
                 */
                setTimeout(function () {
                    this.browserHeightChange();
                }.bind(this), 0);
            }.bind(this));
        },

        createAndSubmitChange : function() {
            var oPayLoad;
            if (settingsUtils.bNewStaticLinkListCardFlag) {
                oPayLoad = PayLoadUtils.getPayLoadForNewStaticLinkListCard.bind(this)(settingsUtils);
            } else {
                oPayLoad = PayLoadUtils.getPayLoadForEditCard.bind(this)(settingsUtils);
            }
            this.settingsResolve(oPayLoad);
            settingsUtils.dialogBox.close();
        }

    });
});
