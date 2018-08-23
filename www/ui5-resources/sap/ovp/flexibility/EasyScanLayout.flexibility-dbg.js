sap.ui.define([
    "sap/ovp/changeHandler/HideCardContainer",
    "sap/ovp/changeHandler/UnhideCardContainer",
    "sap/ovp/changeHandler/UnhideControl",
    "sap/ui/dt/OverlayRegistry",
    "sap/ui/core/ComponentContainer",
    "sap/m/MessageToast",
    "sap/ovp/cards/rta/SettingsDialogConstants"
], function (HideCardContainer, UnhideCardContainer, UnhideControl, OverlayRegistry,
             ComponentContainer, MessageToast, SettingsConstants) {
    "use strict";
    return {
        "moveControls": {
            "changeHandler": "default",
            "layers": {
                "CUSTOMER_BASE": true,
                "CUSTOMER": true,
                "USER": true
            }
        },
        "unhideControl": UnhideControl,
        "unhideCardContainer": UnhideCardContainer,
        "hideCardContainer": HideCardContainer,
        "editCardSettings": {
            changeHandler: {
                applyChange : function(oChange, oControl, mPropertyBag) {
                    var oMainView = mPropertyBag.appComponent.getRootControl(),
                        oMainController = oMainView.getController(),
                        oContent = oChange.getContent(),
                        oCardProperties = oContent.newAppDescriptor,
                        oCard = oMainView.byId(oCardProperties.id);

                    oChange.setRevertData(oContent.oldAppDescriptor); // Here the information is stored on the change

                    if (oCard) {
                        /**
                         *  If there is Default View changed
                         *  Then cardSettings will change
                         */
                        if (oCardProperties.settings.tabs) {
                            var iDefaultViewSelected = oCardProperties.settings.selectedKey;
                            if (!iDefaultViewSelected || iDefaultViewSelected < 1) {
                                iDefaultViewSelected = 1;
                            }
                            SettingsConstants.tabFields.forEach(function (field) {
                                // Delete field if it exists in oCardProperties
                                delete oCardProperties.settings[field];
                                var value = oCardProperties.settings.tabs[iDefaultViewSelected - 1][field];
                                if (value) {
                                    oCardProperties.settings[field] = value;
                                }
                            });
                        }
                        var oComponent = oCard.getComponentInstance();
                        oComponent.destroy();
                    }

                    oMainController.recreateRTAClonedCard(oCardProperties);

                    return true;
                },
                revertChange : function(oChange, oControl, mPropertyBag) {
                    var oMainView = mPropertyBag.appComponent.getRootControl(),
                        oMainController = oMainView.getController(),
                        oCardProperties = oChange.getRevertData(),
                        oCard = oMainView.byId(oCardProperties.id);

                    if (oCard) {
                        var oComponent = oCard.getComponentInstance();
                        oComponent.destroy();
                    }

                    oMainController.recreateRTAClonedCard(oCardProperties);

                    oChange.resetRevertData(); // Clear the revert data on the change

                    return true;
                },
                completeChangeContent : function(oChange, oSpecificChangeInfo, mPropertyBag) {
                    return;
                }
            },
            layers: {
                "CUSTOMER_BASE": true,
                "CUSTOMER": true,
                "USER": true
            }
        },
        "newCardSettings": {
            changeHandler: {
                applyChange : function(oChange, oControl, mPropertyBag){
                    var oMainView = mPropertyBag.appComponent.getRootControl(),
                        oMainController = oMainView.getController(),
                        oCardProperties = oChange.getContent();

                    oChange.setRevertData(oCardProperties.id); // Here the information is stored on the change

                    var oNewComponentContainer = new ComponentContainer(oMainView.getId() + "--" + oCardProperties.id),
                        oUIModel = oMainController.getUIModel(),
                        aCards = oUIModel.getProperty("/cards"),
                        oMainLayout = oMainController.getLayout(),
                        bNewStaticLinkListCard = (oCardProperties.id.indexOf("newStaticLinkListCard") !== -1);
                    oCardProperties.settings.baseUrl = oMainController._getBaseUrl();
                    if (bNewStaticLinkListCard) {
                        oCardProperties.settings.newCard = true;
                    } else {
                        oCardProperties.settings.cloneCard = true;
                    }
                    var iIndex = -1, i;
                    for (i = 0; i < aCards.length; i++) {
                        if (oCardProperties.id.lastIndexOf("customer." + aCards[i].id, 0) === 0) {
                            iIndex = i;
                            break;
                        }
                    }
                    aCards.splice(iIndex + 1, 0, oCardProperties);
                    oUIModel.setProperty("/cards", aCards);
                    oMainLayout.insertContent(oNewComponentContainer, iIndex + 1);
                    /**
                     *  Inside RTA Mode
                     *  Waiting for the component container to be created
                     *  Cloned card is selected and focused
                     *  Message Toast is shown when the card has been successfully cloned
                     */
                    setTimeout(function () {
                        var oOverLay = OverlayRegistry.getOverlay(oNewComponentContainer);
                        oOverLay.setSelected(true);
                        oOverLay.focus();
                        var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ovp"),
                            sMessage = (bNewStaticLinkListCard) ? oResourceBundle.getText("OVP_KEYUSER_TOAST_MESSAGE_FOR_NEW") :
                                oResourceBundle.getText("OVP_KEYUSER_TOAST_MESSAGE_FOR_CLONE");

                        MessageToast.show(sMessage, {
                            duration: 10000
                        });
                    }, 0);

                    oMainController.recreateRTAClonedCard(oCardProperties);

                    return true;
                },

                revertChange : function(oChange, oControl, mPropertyBag) {
                    var oMainView = mPropertyBag.appComponent.getRootControl(),
                        oMainController = oMainView.getController(),
                        sCardId = oChange.getRevertData();

                    var oCard = oMainView.byId(sCardId),
                        oUIModel = oMainController.getUIModel(),
                        aCards = oUIModel.getProperty("/cards"),
                        oMainLayout = oMainController.getLayout();

                    var iIndex = -1, i;
                    for (i = 0; i < aCards.length; i++) {
                        if (sCardId === aCards[i].id) {
                            iIndex = i;
                            break;
                        }
                    }
                    aCards.splice(iIndex, 1);
                    oUIModel.setProperty("/cards", aCards);
                    if (oCard) {
                        var oComponent = oCard.getComponentInstance();
                        oComponent.destroy();
                    }
                    oMainLayout.removeContent(iIndex);
                    oCard.destroy();

                    oChange.resetRevertData(); // Clear the revert data on the change

                    return true;
                },

                completeChangeContent : function(oChange, oSpecificChangeInfo, mPropertyBag) {
                    return;
                }
            },
            layers: {
                "CUSTOMER_BASE": true,
                "CUSTOMER": true,
                "USER": true
            }
        },
        "dragAndDropUI" : {
            changeHandler: {
                applyChange: function (oChange, oPanel, mPropertyBag) {
                    var oMainController = mPropertyBag.appComponent.getRootControl().getController(),
                        oContent = oChange.getContent(),
                        oCopyContent = jQuery.extend(true, {}, oContent),
                        oUIModel = oMainController.getUIModel(),
                        aCards = oUIModel.getProperty("/cards"),
                        oMainLayout = oMainController.getLayout(), val;

                    // Swapping position to create data for undo operation
                    val = oCopyContent.position;
                    oCopyContent.position = oCopyContent.oldPosition;
                    oCopyContent.oldPosition = val;
                    oChange.setRevertData(oCopyContent); // Here the information is stored on the change

                    // Swapping position of the cards array
                    val = aCards[oContent.position];
                    aCards[oContent.position] = aCards[oContent.oldPosition];
                    aCards[oContent.oldPosition] = val;
                    oUIModel.setProperty("/cards", aCards);

                    var oTargetComponentContainer = oMainLayout.getContent()[oContent.position],
                        oComponentContainer = oMainLayout.getContent()[oContent.oldPosition];

                    oMainLayout.removeContent(oComponentContainer);
                    oMainLayout.insertContent(oComponentContainer, oContent.position);

                    oMainLayout.removeContent(oTargetComponentContainer);
                    oMainLayout.insertContent(oTargetComponentContainer, oContent.oldPosition);

                    setTimeout(function () {
                        var oOverLay = OverlayRegistry.getOverlay(oComponentContainer);
                        oOverLay.setSelected(true);
                        oOverLay.focus();
                    }, 0);

                    return true;
                },
                revertChange : function(oChange, oControl, mPropertyBag) {
                    var oMainController = mPropertyBag.appComponent.getRootControl().getController(),
                        oContent = oChange.getRevertData(),
                        oUIModel = oMainController.getUIModel(),
                        aCards = oUIModel.getProperty("/cards"),
                        oMainLayout = oMainController.getLayout(), val;

                    // Swapping position of the cards array
                    val = aCards[oContent.position];
                    aCards[oContent.position] = aCards[oContent.oldPosition];
                    aCards[oContent.oldPosition] = val;
                    oUIModel.setProperty("/cards", aCards);

                    var oTargetComponentContainer = oMainLayout.getContent()[oContent.position],
                        oComponentContainer = oMainLayout.getContent()[oContent.oldPosition];

                    oMainLayout.removeContent(oComponentContainer);
                    oMainLayout.insertContent(oComponentContainer, oContent.position);

                    oMainLayout.removeContent(oTargetComponentContainer);
                    oMainLayout.insertContent(oTargetComponentContainer, oContent.oldPosition);

                    setTimeout(function () {
                        var oOverLay = OverlayRegistry.getOverlay(oComponentContainer);
                        oOverLay.setSelected(true);
                        oOverLay.focus();
                    }, 0);

                    oChange.resetRevertData(); // Clear the revert data on the change

                    return true;
                },
                completeChangeContent : function(oChange, oSpecificChangeInfo, mPropertyBag) {
                    return;
                }
            },
            layers: {
                "CUSTOMER_BASE": true,
                "CUSTOMER": true,
                "USER": true  // enables personalization which is by default disabled
            }
        },
        /**
         * Personalization change handlers
         */
        "manageCardsForEasyScanLayout": {
            changeHandler: {
                applyChange : function(oChange, oPanel, mPropertyBag){
                    //store the incoming change to the main controller for user before rendering
                    var oMainController = mPropertyBag.appComponent.getRootControl().getController();
                    oMainController.storeIncomingDeltaChanges(oChange.getContent());
                    return true;
                },
                completeChangeContent : function(oChange, oSpecificChangeInfo, mPropertyBag) {
                    oChange.setContent(oSpecificChangeInfo.content);
                    return;
                }
            },
            layers: {
                "USER": true  // enables personalization which is by default disabled
            }
        },
        "viewSwitch": {
            changeHandler: {
                applyChange: function (oChange, oPanel, mPropertyBag) {
                    var oMainController = mPropertyBag.appComponent.getRootControl().getController();
                    oMainController.appendIncomingDeltaChange(oChange);
                    return true;
                },
                completeChangeContent: function (oChange, oSpecificChangeInfo, mPropertyBag) {
                    return;
                }
            },
            layers: {
                "CUSTOMER_BASE": true,
                "CUSTOMER": true,
                "USER": true  // enables personalization which is by default disabled
            }
        },
        "visibility": {
            changeHandler: {
                applyChange: function (oChange, oPanel, mPropertyBag) {
                    var oMainController = mPropertyBag.appComponent.getRootControl().getController();
                    oMainController.appendIncomingDeltaChange(oChange);
                    return true;
                },
                completeChangeContent: function (oChange, oSpecificChangeInfo, mPropertyBag) {
                    return;
                }
            },
            layers: {
                "USER": true  // enables personalization which is by default disabled
            }
        },
        "position": {
            changeHandler: {
                applyChange: function (oChange, oPanel, mPropertyBag) {
                    var oMainController = mPropertyBag.appComponent.getRootControl().getController();
                    oMainController.appendIncomingDeltaChange(oChange);
                    return true;
                },
                completeChangeContent: function (oChange, oSpecificChangeInfo, mPropertyBag) {
                    return;
                }
            },
            layers: {
                "CUSTOMER_BASE": true,
                "CUSTOMER": true,
                "USER": true  // enables personalization which is by default disabled
            }
        }
    };
}, /* bExport= */true);