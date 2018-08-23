sap.ui.define([
        "jquery.sap.global",
        "sap/m/Dialog",
        "sap/m/Button",
        "sap/ovp/cards/PayLoadUtils",
        "sap/ovp/cards/OVPCardAsAPIUtils",
        "sap/ovp/cards/rta/SettingsDialogConstants",
        "sap/ui/Device",
        "sap/m/MessagePopover",
        "sap/m/MessagePopoverItem",
        "sap/m/Link",
        "sap/ovp/cards/AnnotationHelper",
        "sap/ui/core/mvc/ViewType",
        "sap/ui/model/json/JSONModel",
        "sap/ui/model/resource/ResourceModel"
    ], function (jQuery, Dialog, Button, PayLoadUtils, OVPCardAsAPIUtils, SettingsConstants,
                 Device, MessagePopover, MessagePopoverItem, Link, AnnotationHelper, ViewType,
                 JSONModel, ResourceModel) {
        "use strict";
        var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ovp");

        function addCardToView(oComponentContainer, oView, bNewStaticLinkListCardFlag) {
            var oComponent = oComponentContainer.getComponentInstance(),
                oComponentData = oComponent.getComponentData(),
                oAppComponent = oComponentData.appComponent,
                oMainComponent = oComponentData.mainComponent,
                sCardId = (bNewStaticLinkListCardFlag) ? "" : oComponentData.cardId,
                sManifestCardId = sCardId + "Dialog",
                sModelName = (bNewStaticLinkListCardFlag) ? "" : oComponentData.modelName,
                oModel = (!sModelName) ? undefined : oAppComponent.getModel(sModelName),
                oCardProperties = oView.getModel().getData(),
                oManifest = {
                    cards: {}
                };
            oManifest.cards[sManifestCardId] = {
                template: oCardProperties.template,
                settings: oCardProperties
            };
            // TODO: In case of error's show no preview card instead
            if (oModel && !!sModelName) {
                oManifest.cards[sManifestCardId].model = sModelName;
                oView.setModel(oModel, sModelName);
            }
            // For Smart Charts if Donut or time series then change template to analytical
            oManifest.cards[sManifestCardId] = oMainComponent._getTemplateForChart(oManifest.cards[sManifestCardId]);

            oView.getController()._oManifest = oManifest;
            OVPCardAsAPIUtils.createCardComponent(oView, oManifest, "dialogCard");
        }

        function getQualifier(sAnnotationPath) {
            if (sAnnotationPath.indexOf('#') !== -1) {
                return sAnnotationPath.split('#')[1];
            } else {
                return "Default";
            }
        }

        function checkForEmptyString(sValue, sLabel) {
            if (sValue) {
                return sValue;
            } else {
                return sLabel;
            }
        }

        function getLabelWithPropertyName(sKey, oEntityType, sPropertyName, sLabel) {
            if (oEntityType[sKey] && oEntityType[sKey][sPropertyName]) {
                return checkForEmptyString(oEntityType[sKey][sPropertyName].String, sLabel);
            } else {
                return sLabel;
            }
        }

        function getAnnotationLabel(oEntityType, sKey) {
            var sAnnotationQualifier = getQualifier(sKey),
                oOvpResourceBundle = _getOvpLibResourceBundle(),
                sLabel = oOvpResourceBundle && oOvpResourceBundle.getText("OVP_KEYUSER_LABEL_DEFAULT_LABEL_WITH_QUALIFIER",[sAnnotationQualifier]);
            sLabel = (sLabel) ? sLabel : sAnnotationQualifier;
            if (sKey.indexOf(",") !== -1) {
                sKey = sKey.split(",")[0];
            }
            if (sKey.indexOf(".Identification") !== -1) {
                if (oEntityType[sKey]) {
                    var aRecords = AnnotationHelper.sortCollectionByImportance(oEntityType[sKey]);
                    for (var index = 0; index < aRecords.length; index++) {
                        var oItem = aRecords[index];
                        if (oItem.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
                            if (oItem && oItem["Label"]) {
                                return checkForEmptyString(oItem["Label"].String, sLabel);
                            } else {
                                return oItem["SemanticObject"].String + "-" + oItem["Action"].String;
                            }
                        }
                        if (oItem.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") {
                            if (oItem && oItem["Label"]) {
                                return checkForEmptyString(oItem["Label"].String, sLabel);
                            } else {
                                return oItem["Url"].String;
                            }
                        }
                    }
                }
                return "No Navigation";
            } else if (sKey.indexOf(".HeaderInfo") !== -1) {
                if (oEntityType[sKey] && oEntityType[sKey]["Description"] && oEntityType[sKey]["Description"].Label) {
                    return checkForEmptyString(oEntityType[sKey]["Description"].Label.String, sLabel);
                } else {
                    return sLabel;
                }
            } else if (sKey.indexOf(".PresentationVariant") !== -1 || sKey.indexOf(".SelectionVariant") !== -1 ||
                sKey.indexOf(".SelectionPresentationVariant") !== -1) {
                return getLabelWithPropertyName(sKey, oEntityType, "Text", sLabel);
            } else if (sKey.indexOf(".DataPoint") !== -1) {
                return getLabelWithPropertyName(sKey, oEntityType, "Title", sLabel);
            } else if (sKey.indexOf(".Chart") !== -1) {
                return getLabelWithPropertyName(sKey, oEntityType, "Description", sLabel);
            } else if (sKey.indexOf(".FieldGroup") !== -1) {
                return getLabelWithPropertyName(sKey, oEntityType, "Label", sLabel);
            } else {
                var sLabelQualifier = "";
                if (sAnnotationQualifier !== "Default") {
                    sLabelQualifier = "#" + sAnnotationQualifier;
                }
                var sLabelName = "com.sap.vocabularies.Common.v1.Label" + sLabelQualifier;
                if (oEntityType[sKey] && oEntityType[sKey][sLabelName]) {
                    return checkForEmptyString(oEntityType[sKey][sLabelName].String, sLabel);
                } else {
                    return sLabel;
                }
            }
        }

        function checkIfCardTemplateHasProperty(sTemplate, sType) {
            switch (sType) {
                case "cardPreview":
                    return (OVPCardAsAPIUtils.getSupportedCardTypes().indexOf(sTemplate) !== -1);
                case "noOfRows":
                case "noOfColumns":
                case "stopResizing":
                    var aCardTypeWithNoResize = ["sap.ovp.cards.stack"];
                    return (aCardTypeWithNoResize.indexOf(sTemplate) === -1);
                case "listType":
                case "listFlavor":
                    var aCardTypeForListType = ["sap.ovp.cards.list"];
                    return (aCardTypeForListType.indexOf(sTemplate) !== -1);
                case "listFlavorForLinkList":
                    var aCardTypeForListFlavorForLinkList = ["sap.ovp.cards.linklist"];
                    return (aCardTypeForListFlavorForLinkList.indexOf(sTemplate) !== -1);
                case "isViewSwitchSupportedCard":
                case "kpiHeader":
                    var aCardTypeForKPI = ["sap.ovp.cards.list",
                        "sap.ovp.cards.table",
                        "sap.ovp.cards.charts.analytical",
                        "sap.ovp.cards.charts.smart.chart",
                        "sap.ovp.cards.charts.bubble",
                        "sap.ovp.cards.charts.donut",
                        "sap.ovp.cards.charts.line"];
                    return (aCardTypeForKPI.indexOf(sTemplate) !== -1);
                case "chart":
                    var aCardTypeForChart = ["sap.ovp.cards.charts.analytical",
                        "sap.ovp.cards.charts.smart.chart",
                        "sap.ovp.cards.charts.bubble",
                        "sap.ovp.cards.charts.donut",
                        "sap.ovp.cards.charts.line"];
                    return (aCardTypeForChart.indexOf(sTemplate) !== -1);
                case "sortOrder":
                case "sortBy":
                case "lineItem":
                    var aCardTypeForLineItem = ["sap.ovp.cards.list", "sap.ovp.cards.table"];
                    return (aCardTypeForLineItem.indexOf(sTemplate) !== -1);
                case "identification":
                    // Temporarily removing identification setting for stack cards
                    var aCardTypeForIdentification = ["sap.ovp.cards.stack"];
                    return (aCardTypeForIdentification.indexOf(sTemplate) !== -1);
                default :
                    break;
            }
        }

        function checkIfKPIAnnotation(oCardProperties) {
            return !!oCardProperties.kpiAnnotationPath;
        }

        function checkIfSPVAnnotation(oCardProperties) {
            return !!oCardProperties.selectionPresentationAnnotationPath;
        }

        function checkIfSPVOrKPIAnnotation(oCardProperties) {
            return checkIfSPVAnnotation(oCardProperties) || checkIfKPIAnnotation(oCardProperties);
        }

        function getVisibilityOfElement(oCardProperties, sElement, isViewSwitchEnabled, iIndex) {
            var showMainFields = true;
            var showSubFields = true;
            if (isViewSwitchEnabled) {
                if (oCardProperties.mainViewSelected) {
                    showSubFields = false;
                } else {
                    showMainFields = false;
                }
            }
            switch (sElement) {
                case "cardPreview":
                    return checkIfCardTemplateHasProperty(oCardProperties.template, "cardPreview");
                case "noOfRows":
                case "noOfColumns":
                case "stopResizing":
                    return showMainFields && checkIfCardTemplateHasProperty(oCardProperties.template, sElement);
                case "title":
                    return showMainFields;
                case "dynamicSwitchSubTitle":
                    return showMainFields && !!oCardProperties.dynamicSubTitle;
                case "dynamicSwitchStateSubTitle":
                    return !!oCardProperties.dynamicSubtitleAnnotationPath;
                case "subTitle":
                    if (!oCardProperties.subTitle) {
                        oCardProperties.subTitle = " ";
                        return true;
                    } else {
                        return showMainFields && !oCardProperties.dynamicSubtitleAnnotationPath;
                    }
                    break;
                case "dynamicSubTitle":
                    return showSubFields && !!oCardProperties.dynamicSubtitleAnnotationPath;
                case "valueSelectionInfo":
                    if (!oCardProperties.valueSelectionInfo) {
                        oCardProperties.valueSelectionInfo = " ";
                    }
                    return showMainFields && (checkIfCardTemplateHasProperty(oCardProperties.template, "kpiHeader") &&
                        !!oCardProperties.dataPointAnnotationPath);
                case "dataPoint":
                    return showSubFields && !checkIfKPIAnnotation(oCardProperties) &&
                        (checkIfCardTemplateHasProperty(oCardProperties.template, "kpiHeader") && !!oCardProperties.dataPointAnnotationPath);
                case "listType":
                case "listFlavor":
                case "listFlavorForLinkList":
                    return showMainFields && checkIfCardTemplateHasProperty(oCardProperties.template, sElement);
                case "sortOrder":
                    return showMainFields && (!oCardProperties.staticContent) && checkIfCardTemplateHasProperty(oCardProperties.template, sElement)
                        && !!oCardProperties.sortBy;
                case "sortBy":
                    return showMainFields && (!oCardProperties.staticContent) && checkIfCardTemplateHasProperty(oCardProperties.template, sElement);
                case "identification":
                    return showSubFields && !checkIfKPIAnnotation(oCardProperties) &&
                        (!oCardProperties.staticContent) && !checkIfCardTemplateHasProperty(oCardProperties.template, sElement);
                case "selectionPresentationVariant":
                    return showSubFields && checkIfSPVAnnotation(oCardProperties) &&
                        !checkIfKPIAnnotation(oCardProperties) && checkIfCardTemplateHasProperty(oCardProperties.template, "kpiHeader");
                case "presentationVariant":
                case "selectionVariant":
                    return showSubFields && !checkIfSPVOrKPIAnnotation(oCardProperties) &&
                        (!oCardProperties.staticContent) && checkIfCardTemplateHasProperty(oCardProperties.template, "kpiHeader");
                case "kpiHeader":
                    return showMainFields && !checkIfKPIAnnotation(oCardProperties) && checkIfCardTemplateHasProperty(oCardProperties.template, sElement);
                case "lineItem":
                case "chart":
                    return showSubFields && !checkIfSPVOrKPIAnnotation(oCardProperties) && checkIfCardTemplateHasProperty(oCardProperties.template, sElement);
                case "showViewName":
                    return isViewSwitchEnabled && showSubFields;
                case "showDefaultView":
                    if (isViewSwitchEnabled && showSubFields) {
                        if (oCardProperties.defaultViewSelected != oCardProperties.selectedKey) {
                            return true;
                        }
                    }
                    return false;
                case "showMore":
                case "removeVisual":
                case "lineItemSubTitle":
                case "lineItemTitle":
                case "staticLink":
                case "links":
                    var bFlag = (oCardProperties.template === "sap.ovp.cards.linklist" && !!oCardProperties.staticContent);
                    if (sElement === "staticLink") {
                        return (bFlag && !!oCardProperties.staticContent[iIndex].targetUri);
                    } else if (sElement === "links") {
                        return (bFlag && !!oCardProperties.staticContent[iIndex].semanticObject);
                    } else if (sElement === "removeVisual") {
                        return (bFlag && (!!oCardProperties.staticContent[iIndex].targetUri || !!oCardProperties.staticContent[iIndex].semanticObject));
                    } else {
                        return bFlag;
                    }
                    break;
                default :
                    break;
            }
        }

        function setVisibilityForFormElements(oCardProperties) {
            // setting Visibility for Form Elements in settingDialog
            var isViewSwitchEnabled = false;
            this.oVisibility.viewSwitchEnabled = false;
            this.oVisibility.showViewSwitch = false;
            if (checkIfCardTemplateHasProperty(oCardProperties.template, "isViewSwitchSupportedCard")) {
                if (oCardProperties.tabs && oCardProperties.tabs.length) {
                    isViewSwitchEnabled = true;
                    this.oVisibility.showViewSwitch = true;
                }
                this.oVisibility.viewSwitchEnabled = true;
            }

            this.oVisibility.cardPreview = getVisibilityOfElement(oCardProperties, "cardPreview");
            this.oVisibility.stopResizing = getVisibilityOfElement(oCardProperties, "stopResizing", isViewSwitchEnabled);
            this.oVisibility.noOfRows = getVisibilityOfElement(oCardProperties, "noOfRows", isViewSwitchEnabled);
            this.oVisibility.noOfColumns = getVisibilityOfElement(oCardProperties, "noOfColumns", isViewSwitchEnabled);
            this.oVisibility.title = getVisibilityOfElement(oCardProperties, "title", isViewSwitchEnabled);
            this.oVisibility.subTitle = getVisibilityOfElement(oCardProperties, "subTitle", isViewSwitchEnabled);
            this.oVisibility.valueSelectionInfo = getVisibilityOfElement(oCardProperties, "valueSelectionInfo", isViewSwitchEnabled);
            this.oVisibility.listType = getVisibilityOfElement(oCardProperties, "listType", isViewSwitchEnabled);
            this.oVisibility.listFlavor = getVisibilityOfElement(oCardProperties, "listFlavor", isViewSwitchEnabled);
            this.oVisibility.listFlavorForLinkList = getVisibilityOfElement(oCardProperties, "listFlavorForLinkList", isViewSwitchEnabled);
            this.oVisibility.sortOrder = getVisibilityOfElement(oCardProperties, "sortOrder", isViewSwitchEnabled);
            this.oVisibility.sortBy = getVisibilityOfElement(oCardProperties, "sortBy", isViewSwitchEnabled);
            if (oCardProperties.template === "sap.ovp.cards.linklist" && !!oCardProperties.staticContent) {
                var aStaticContent = oCardProperties.staticContent,
                    oVisibleStaticLink = {},
                    oVisibleLinks = {},
                    oVisibleRemoveVisual = {},
                    oVisibleShowMore = {};
                for (var index = 0; index < aStaticContent.length; index++) {
                    var sId = aStaticContent[index].index;
                    oVisibleStaticLink[sId] = getVisibilityOfElement(oCardProperties, "staticLink", null, index);
                    oVisibleLinks[sId] = getVisibilityOfElement(oCardProperties, "links", null, index);
                    oVisibleRemoveVisual[sId] = getVisibilityOfElement(oCardProperties, "removeVisual", null, index);
                    oVisibleShowMore[sId] = getVisibilityOfElement(oCardProperties, "showMore", null, index);
                }
                this.oVisibility.staticLink = oVisibleStaticLink;
                this.oVisibility.links = oVisibleLinks;
                this.oVisibility.removeVisual = oVisibleRemoveVisual;
                this.oVisibility.showMore = oVisibleShowMore;
            }
            this.oVisibility.lineItemTitle = getVisibilityOfElement(oCardProperties, "lineItemTitle");
            this.oVisibility.lineItemSubTitle = getVisibilityOfElement(oCardProperties, "lineItemSubTitle");
            this.oVisibility.showViewName = getVisibilityOfElement(oCardProperties, "showViewName", isViewSwitchEnabled);
            this.oVisibility.showDefaultView = getVisibilityOfElement(oCardProperties, "showDefaultView", isViewSwitchEnabled);
            this.aVariantNames.forEach(function (oVariantName) {
                this.oVisibility[oVariantName.sPath] = getVisibilityOfElement(oCardProperties, oVariantName.sPath, isViewSwitchEnabled)
                && !!oCardProperties[oVariantName.sPath] && !!oCardProperties[oVariantName.sPath].length;
            }.bind(this));
            this.oVisibility.kpiHeader = getVisibilityOfElement(oCardProperties, "kpiHeader", isViewSwitchEnabled)
            && !!oCardProperties["dataPoint"] && !!oCardProperties["dataPoint"].length;
            this.oVisibility.dynamicSwitchSubTitle = getVisibilityOfElement(oCardProperties, "dynamicSwitchSubTitle", isViewSwitchEnabled);
            this.oVisibility.dynamicSwitchStateSubTitle = getVisibilityOfElement(oCardProperties, "dynamicSwitchStateSubTitle", isViewSwitchEnabled);
            this.oVisibility.moveToTheTop = false;
            this.oVisibility.moveUp = false;
            this.oVisibility.moveDown = false;
            this.oVisibility.moveToTheBottom = false;
            this.oVisibility.delete = false;
        }

        function _getOvpLibResourceBundle() {
            if (oResourceBundle) {
                return oResourceBundle;
            }
            oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ovp");
            return oResourceBundle;
        }

        function setIndicesToStaticLinkList(oCardPropertiesModel) {
            var aStaticContent = oCardPropertiesModel.getProperty("/staticContent");
            for (var index = 0; index < aStaticContent.length; index++) {
                aStaticContent[index].index = "Index--" + (index + 1);
            }
            oCardPropertiesModel.setProperty("/staticContent", aStaticContent);
        }

        function getViewCounter(aViewNameParts) {
            var iIndex = 0;
            for (var i = aViewNameParts.length - 1; i >= 0; i--) {
                if (/^\d+$/.test(aViewNameParts[i])) {
                    iIndex = parseInt(aViewNameParts[i], 10);
                    break;
                }
            }
            return iIndex;
        }

        function addManifestSettings(oData) {
            if (oData.lineItem) {
                oData.lineItem.forEach(function (item) {
                    if (item.value === oData.annotationPath) {
                        oData.lineItemQualifier = item.name;
                    }
                });
            }

            if (oData.tabs && oData.tabs.length && oData.selectedKey) {
                oData.viewName = oData.tabs[oData.selectedKey - 1].value;
                oData.isDefaultView = false;
                if (oData.selectedKey === oData.defaultViewSelected) {
                    oData.isDefaultView = true;
                }
            }

            var sortOrder = oData.sortOrder;
            oData.sortOrder = "descending";
            if (sortOrder && sortOrder.toLowerCase() !== "descending") {
                oData.sortOrder = "ascending";
            }

            oData.isExtendedList = false;
            if (oData.listType === "extended") {
                oData.isExtendedList = true;
            }

            oData.isBarList = false;
            if (oData.listFlavor === "bar") {
                oData.isBarList = true;
            }

            oData.hasKPIHeader = false;
            if (oData.dataPointAnnotationPath) {
                oData.hasKPIHeader = true;
            }
            return oData;
        }

        function addSupportingObjects(oData) {
            /* Adding Supporting Objects for /lineItem, /dataPoint, /identification
             /presentationVariant, /selectionVariant, /chartAnnotation /dynamicSubtitleAnnotation*/
            var oEntityType = oData.entityType;
            this.aVariantNames.forEach(function (oVariantName) {
                var aVariants = [];

                for (var key in oEntityType) {
                    if (oEntityType.hasOwnProperty(key) && key.indexOf(oVariantName.sVariant) !== -1) {
                        if (oVariantName.sVariant === ".LineItem") {
                            var variant = {
                                name: getAnnotationLabel(oEntityType, key),
                                value: key,
                                fields: AnnotationHelper.sortCollectionByImportance(oEntityType[key])
                            };
                            aVariants.push(variant);
                        } else {
                            aVariants.push({name: getAnnotationLabel(oEntityType, key), value: key});
                        }
                    }
                }
                if (aVariants.length !== 0) {
                    ///*If Not a Mandatory Field than add Select Value Option*/
                    //if (!oVariantName.isMandatoryField) {
                    //    aVariants.unshift({
                    //        name: "Select Value",
                    //        value: ""
                    //    });
                    //}
                    oData[oVariantName.sPath] = aVariants;
                }
            });

            /*Adding Supporting Objects for /sortBy Property*/
            if (oData.entityType && oData.entityType.property) {
                oData["modelProperties"] = oData.entityType.property.map(function (property) {
                    return {
                        name: property.name,
                        value: property.name
                    };
                });
                //oData["modelProperties"].unshift({
                //    name: "Select Value",
                //    value: ""
                //});
            }


            /* Adding View Switch properties */
            if (!!oData.tabs && oData.tabs.length) {
                var hasDataPointAnnotation = false,
                    sLastViewName = oData.tabs[oData.tabs.length - 1].value,
                    aViewNameParts = sLastViewName.split(' ');
                oData.newViewCounter = getViewCounter(aViewNameParts);
                oData.defaultViewSelected = oData.selectedKey;
                oData.isViewResetEnabled = false;
                oData.aViews = [{
                    text: oResourceBundle && oResourceBundle.getText("OVP_KEYUSER_LABEL_MAIN_VIEW"),
                    key: 0,
                    isLaterAddedView: false,
                    isViewResetEnabled: false
                }];

                hasDataPointAnnotation = oData.tabs.some(function (tab) {
                    return tab.dataPointAnnotationPath;
                });
                oData.tabs.forEach(function (tab, index) {
                    var newText = tab.value;
                    if (hasDataPointAnnotation && !tab.dataPointAnnotationPath && tab.dataPoint && tab.dataPoint.length) {
                        tab.dataPointAnnotationPath = tab.dataPoint[0].value;
                    }
                    if (index + 1 === oData.selectedKey) {
                        newText = tab.value;
                        if (oResourceBundle) {
                            newText += " (" + oResourceBundle.getText("OVP_KEYUSER_LABEL_DEFAULT_VIEW") + ")";
                        } else {
                            newText += " (Default view)";
                        }
                    }
                    oData.aViews.push({
                        text: newText,
                        key: index + 1,
                        initialSelectedKey: index + 1,
                        isLaterAddedView: false,
                        isViewResetEnabled: false
                    });
                });
            } else if (checkIfCardTemplateHasProperty(oData.template, "isViewSwitchSupportedCard")) {
                oData.newViewCounter = 0;
                oData.aViews = [{
                    text: oResourceBundle.getText("OVP_KEYUSER_SHOWS_DIFFERENT_VIEWS"),
                    key: 0,
                    initialSelectedKey: 0,
                    isLaterAddedView: false,
                    isViewResetEnabled: false
                }];
            }
            return oData;
        }

        function getCrossAppNavigationLinks(oModel) {
            var oData = oModel.getData();
            sap.ushell.Container.getService("CrossApplicationNavigation").getLinks()
                .done(function (aLinks) {
                    var aAllIntents = [],
                        oLinkToTextMapping = {};
                    for (var i = 0; i < aLinks.length; i++) {
                        aAllIntents.push(aLinks[i].intent);
                        oLinkToTextMapping[aLinks[i].intent] = aLinks[i].text;
                    }
//	            this.oLinkToTextMapping = oLinkToTextMapping;
                    // Checks for the supported Intents for the user
                    sap.ushell.Container.getService("CrossApplicationNavigation").isIntentSupported(aAllIntents)
                        .done(function (oResponse) {
                            // Setting the model of Dialog Form with Semantic Objects and Actions
                            var aLinks = [];
                            for (var key in oResponse) {
                                if (oResponse.hasOwnProperty(key) && oResponse[key].supported === true && oLinkToTextMapping && oLinkToTextMapping[key]) {
                                    aLinks.push({name: oLinkToTextMapping[key], value: key});
                                }
                            }
                            var cardManifestSettings = oData;
                            if (aLinks.length !== 0 || aLinks.length !== 0) {
                                cardManifestSettings["links"] = aLinks;
                            }
                            oModel.refresh();
                        })
                        .fail(function (oError) {
                            jQuery.sap.log.error(oError);
                        });
                })
                .fail(function (oError) {
                    jQuery.sap.log.error(oError);
                });
        }

        function enableResetButton(bEnabled) {
            this.oResetButton.setEnabled(bEnabled);
        }

        function enableSaveButton(bEnabled) {
            this.oSaveButton.setEnabled(bEnabled);
            var oMessagesModel = this.oMessagePopOver.getModel(),
                iCounterError = oMessagesModel.getProperty("/Counter/Error");
            this.bError = (iCounterError > 0);
        }

        function validURL(str) {
            var pattern = new RegExp("((http|https)(:\/\/))?([a-zA-Z0-9]+[.]{1}){2}[a-zA-z0-9]+(\/{1}[a-zA-Z0-9]+)*\/?", "i");
            return pattern.test(str);
        }

        function catchInputFieldError(sValue, sFieldName) {
            if (sFieldName === "targetUri") {
                return !validURL(sValue) && (!!sValue || sValue === "");
            } else {
                return !(sValue.trim().length);
            }
        }

        function validateInputField(oEvent) {
            var sFieldName = oEvent.getParameter("path"), sTitle = "", aSplit,
                i, oMessagesModel, aMessages, iCounterAll, iCounterError;
            var oOvpResourceBundle = _getOvpLibResourceBundle();
            if (sFieldName === "/title" || sFieldName === "title" || sFieldName === "/viewName" || sFieldName === "targetUri" || sFieldName === "value") {
                var sNewValue = oEvent.getParameter("value"),
                    bErrorFlag = catchInputFieldError(sNewValue, sFieldName),
                    iSelectedKey,
                    oContext = oEvent.getParameter("context");

                // Error Message for View Name
                if (sFieldName === "/viewName") {
                    iSelectedKey = oEvent.getSource().getProperty("/selectedKey");
                    sTitle = oOvpResourceBundle && oOvpResourceBundle.getText("OVP_KEYUSER_INPUT_ERROR_VIEW_NAME");
                    sFieldName = "/tabs/" + (iSelectedKey - 1) + "/value";
                }
                // Error Message for View Name
                if (sFieldName === "value") {
                    sTitle = oOvpResourceBundle && oOvpResourceBundle.getText("OVP_KEYUSER_INPUT_ERROR_VIEW_NAME");
                    sFieldName = oContext.getPath() + "/" + sFieldName;
                }

                // Error Message for Card Title
                if (sFieldName.indexOf("/title") !== -1) {
                    sTitle = oOvpResourceBundle && oOvpResourceBundle.getText("OVP_KEYUSER_INPUT_ERROR");
                }
                // Error Message for Static LinkList Line item title and Static Link
                if (oContext && oContext.getPath().indexOf("staticContent") !== -1) {
                    aSplit = oContext.getPath().split("/");
                    if (sFieldName === "title") {
                        sTitle = oOvpResourceBundle.getText("OVP_KEYUSER_INPUT_ERROR_RECORD_TITLE") + (parseInt(aSplit[aSplit.length - 1], 10) + 1);
                    } else if (sFieldName === "targetUri") {
                        sTitle = oOvpResourceBundle.getText("OVP_KEYUSER_INPUT_ERROR_RECORD_URL") + " " +
                        (parseInt(aSplit[aSplit.length - 1], 10) + 1);
                    }
                    sFieldName = oContext.getPath() + "/" + sFieldName;
                }
                oMessagesModel = this.oMessagePopOver.getModel();
                aMessages = oMessagesModel.getProperty("/Messages");
                iCounterAll = oMessagesModel.getProperty("/Counter/All");
                iCounterError = oMessagesModel.getProperty("/Counter/Error");
                if (bErrorFlag) {
                    enableSaveButton.bind(this)(true);

                    for (i = 0; i < aMessages.length; i++) {
                        if (aMessages[i].fieldName === sFieldName) {
                            aMessages.splice(i, 1);
                            iCounterAll--;
                            iCounterError--;
                            i--;
                        }
                    }

                    aMessages.push({
                        "type": "Error",
                        "title": sTitle,
                        "fieldName": sFieldName,
                        "counter": iCounterError + 1
                    });
                    iCounterAll++;
                    iCounterError++;
                } else {
                    enableSaveButton.bind(this)(true);

                    for (i = 0; i < aMessages.length; i++) {
                        if (aMessages[i].fieldName === sFieldName) {
                            aMessages.splice(i, 1);
                            iCounterAll--;
                            iCounterError--;
                            i--;
                        }
                    }
                }
                oMessagesModel.setProperty("/Messages", aMessages);
                oMessagesModel.setProperty("/Counter/All", iCounterAll);
                oMessagesModel.setProperty("/Counter/Error", iCounterError);
                oMessagesModel.refresh(true);
            } else if (sFieldName === "/staticContent,title" || sFieldName === "/staticContent,targetUri" || sFieldName === "/tabs,value") {
                aSplit = sFieldName.split(",");
                oMessagesModel = this.oMessagePopOver.getModel();
                aMessages = oMessagesModel.getProperty("/Messages");
                iCounterAll = oMessagesModel.getProperty("/Counter/All");
                iCounterError = oMessagesModel.getProperty("/Counter/Error");

                enableSaveButton.bind(this)(true);

                for (i = 0; i < aMessages.length; i++) {
                    if (aMessages[i].fieldName.indexOf(aSplit[0]) !== -1 && aMessages[i].fieldName.indexOf(aSplit[1]) !== -1) {
                        aMessages.splice(i, 1);
                        iCounterAll--;
                        iCounterError--;
                        i--;
                    }
                }

                oMessagesModel.setProperty("/Messages", aMessages);
                oMessagesModel.setProperty("/Counter/All", iCounterAll);
                oMessagesModel.setProperty("/Counter/Error", iCounterError);
                oMessagesModel.refresh(true);
            }
        }

        function resetErrorHandling() {
            var oMessagesModel = this.oMessagePopOver.getModel();
            oMessagesModel.setProperty("/Messages", []);
            oMessagesModel.setProperty("/Counter/All", 0);
            oMessagesModel.setProperty("/Counter/Error", 0);
            oMessagesModel.setProperty("/Counter/Success", 0);
            oMessagesModel.setProperty("/Counter/Warning", 0);
            oMessagesModel.setProperty("/Counter/Information", 0);
            oMessagesModel.refresh(true);
        }

        function initializeErrorHandling() {
            // Messages Model
            var oLink = new Link({
                text: "Show more information",
                href: "",
                target: "_blank"
            });

            var oMessageTemplate = new MessagePopoverItem({
                type: "{type}",
                title: "{title}",
                description: "{description}",
                subtitle: "{subtitle}",
                counter: "{counter}",
                fieldName: "{fieldName}",
                link: oLink
            });

            this.oMessagePopOver = new MessagePopover({
                items: {
                    path: "/Messages",
                    template: oMessageTemplate
                }
            });

            var oMessages = {
                "Counter": {
                    "All": 0,
                    "Error": 0,
                    "Success": 0,
                    "Warning": 0,
                    "Information": 0
                },
                "Messages": []
            };

            var oMessagesModel = new JSONModel(oMessages);
            this.oMessagePopOver.setModel(oMessagesModel);
            this.oMessagePopOverButton.setModel(oMessagesModel);
        }

        function settingFormWidth(oView, sWidth) {
            var sapOvpSettingsForm = oView.byId("sapOvpSettingsForm");
            if (sapOvpSettingsForm) {
                var oSettingsFormDomRef = sapOvpSettingsForm.getDomRef();
                if (oSettingsFormDomRef) {
                    oSettingsFormDomRef.style.width = sWidth;
                }
            }
        }

        function sizeChanged(mParams) {
            var oView = this.dialogBox.getContent()[0],
                oCardPropertiesModel = oView.getModel(),
                oDeviceMediaPropertiesModel = oView.getModel("deviceMediaProperties");
            switch (mParams.name) {
                case "S":
                case "M":
                    oDeviceMediaPropertiesModel.setProperty("/deviceMedia", "Column");
                    settingFormWidth(oView, "100%");
                    break;
                case "L":
                case "XL":
                default :
                    oDeviceMediaPropertiesModel.setProperty("/deviceMedia", "Row");
                    settingFormWidth(oView, "calc(100% - " + (oCardPropertiesModel.getProperty("/dialogBoxWidth") + 1) + "rem)");
                    break;
            }
            oDeviceMediaPropertiesModel.refresh(true);
        }

        function detachWindowResizeHandler() {
            // De-register an event handler to changes of the screen size
            Device.media.detachHandler(sizeChanged.bind(this), null, "SettingsViewRangeSet");
            // Remove the Range set
            Device.media.removeRangeSet("SettingsViewRangeSet");
        }

        function attachWindowResizeHandler() {
            // Initialize the Range set
            Device.media.initRangeSet("SettingsViewRangeSet", [520, 760, 960], "px", ["S", "M", "L", "XL"]);
            // Register an event handler to changes of the screen size
            Device.media.attachHandler(sizeChanged.bind(this), null, "SettingsViewRangeSet");
            // Do some initialization work based on the current size
            sizeChanged.bind(this)(Device.media.getCurrentRange("SettingsViewRangeSet"));
        }

        var oSettingsUtils = {

            oOvpResourceBundle: _getOvpLibResourceBundle(),
            dialogBox: undefined,
            oSaveButton: undefined,
            oResetButton: undefined,
            oMessagePopOverButton: undefined,
            oMessagePopOver: undefined,
            oAppDescriptor: undefined,
            oOriginalAppDescriptor: undefined,
            oMainComponent: undefined,
            sApplicationId: "",
            iContentHeightForDialog: 38,
            iContentHeightForDialogWithViewSwitch: 33,
            aVariantNames: SettingsConstants.aVariantNames,
            attachWindowResizeHandler: attachWindowResizeHandler,
            detachWindowResizeHandler: detachWindowResizeHandler,
            settingFormWidth: settingFormWidth,
            addManifestSettings: addManifestSettings,
            setVisibilityForFormElements: setVisibilityForFormElements,
            getVisibilityOfElement: getVisibilityOfElement,
            enableResetButton: enableResetButton,
            enableSaveButton: enableSaveButton,
            resetErrorHandling: resetErrorHandling,
            getQualifier: getQualifier,
            oVisibility: SettingsConstants.oVisibility,
            bError: false,
            bNewStaticLinkListCardFlag: false,

            getDialogBox: function (oComponentContainer, bNewStaticLinkListCardFlag) {
                return new Promise(function (resolve, reject) {
                    if (!this.dialogBox) {
                        // settings dialog save button
                        // Attached this button to "this" scope to get it in setting controller and attach save
                        // function to it.
                        this.oSaveButton = new Button("settingsSaveBtn", {
                            text: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("save"),
                            type: "Emphasized"
                        });
                        // settings dialog close button
                        var oCancelButton = new Button("settingsCancelBtn", {
                            text: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("cancelBtn")
                        });
                        this.oResetButton = new Button("settingsResetBtn", {
                            text: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("resetCardBtn")
                        });
                        // Message PopOver Button
                        this.oMessagePopOverButton = new Button("settingsMessagePopOverBtn", {
                            text: "{/Counter/All}",
                            type: "Emphasized",
                            icon: "sap-icon://message-popup",
                            visible: "{= ${/Counter/All} === 0 ? false : true}"
                        }).addStyleClass("sapOvpSettingsMessagePopOverBtn");
                        // settings dialog
                        this.dialogBox = new Dialog("settingsDialog", {
                            title: this.oOvpResourceBundle && this.oOvpResourceBundle.getText("settingsDialogTitle"),
                            buttons: [this.oMessagePopOverButton, this.oSaveButton, oCancelButton, this.oResetButton],
                            // destroy the view on close of dialog (?)
                            // TODO: confirm if we can just destroy the card component, rest of the things can be updated via model data binding
                            afterClose: function (oEvent) {
                                var oSettingsView = this.dialogBox.getContent()[0],
                                    oSettingsLineItemTitle = oSettingsView.byId("sapOvpSettingsLineItemTitle"),
                                    oSettingsLineItemSubTitle = oSettingsView.byId("sapOvpSettingsLineItemSubTitle");
                                if (oSettingsLineItemTitle) {
                                    oSettingsLineItemTitle.destroy();
                                }
                                if (oSettingsLineItemSubTitle) {
                                    oSettingsLineItemSubTitle.destroy();
                                }
                                this.dialogBox.destroyContent();
                                this.detachWindowResizeHandler();
                            }.bind(this)
                        });
                        this.dialogBox.setBusyIndicatorDelay(0);
                        oCancelButton.attachPress(function (oEvent) {
                            this.dialogBox.close();
                        }.bind(this));
                    }

                    // Initializing Error Handling for the Settings Dialog Form
                    initializeErrorHandling.bind(this)();

                    this.bNewStaticLinkListCardFlag = !!bNewStaticLinkListCardFlag;

                    // card properties and model
                    var oComponentInstance = oComponentContainer.getComponentInstance(),
                        oSelectedCardPropertiesModel = oComponentInstance.getRootControl().getModel("ovpCardProperties"),
                        oOriginalCardProperties = (bNewStaticLinkListCardFlag) ? {
                            "title": "New Title",
                            "subTitle": "New Subtitle",
                            "staticContent": [],
                            "listFlavor": "standard",
                            "template": "sap.ovp.cards.linklist",
                            "layoutDetail": oSelectedCardPropertiesModel.getProperty("/layoutDetail")
                        } : oSelectedCardPropertiesModel.getData(),
                        oCardProperties = jQuery.extend(true, {}, oOriginalCardProperties);
                    oCardProperties = addSupportingObjects.call(this, oCardProperties);
                    oCardProperties = this.addManifestSettings(oCardProperties);
                    var oCardPropertiesModel = new JSONModel(oCardProperties),
                        componentContainerHeight = oComponentContainer.getDomRef().offsetHeight,
                        oDeviceSystemPropertiesModel = new JSONModel(Device.system),
                        oDeviceMediaPropertiesModel = new JSONModel({
                            "deviceMedia": "Row"
                        }),
                        oComponentData = oComponentInstance.getComponentData(),
                        oMainComponent = oComponentData.mainComponent,
                        oAppComponent = oComponentData.appComponent,
                        sCardId = (bNewStaticLinkListCardFlag) ? "" : oComponentData.cardId;
                    this.oAppDescriptor = oMainComponent._getCardFromManifest(sCardId);
                    this.sApplicationId = oMainComponent._getApplicationId();
                    this.oMainComponent = oMainComponent;
                    this.oOriginalAppDescriptor = oAppComponent._getOvpCardOriginalConfig(sCardId);
                    oDeviceSystemPropertiesModel.setDefaultBindingMode("OneWay");
                    oCardProperties.dialogBoxHeight = componentContainerHeight;
                    oCardProperties.dialogBoxWidth = 20;

                    if (oCardProperties.template === "sap.ovp.cards.linklist") {
                        oCardPropertiesModel.setProperty("/listFlavorName", this.oOvpResourceBundle && this.oOvpResourceBundle.getText("OVP_KEYUSER_CAROUSEL"));
                    } else {
                        oCardPropertiesModel.setProperty("/listFlavorName", this.oOvpResourceBundle && this.oOvpResourceBundle.getText("OVP_KEYUSER_BARLIST"));
                    }
                    if (oCardProperties.layoutDetail === "resizable") {
                        if (!oCardProperties.defaultSpan) {
                            oCardProperties.defaultSpan = {};
                            oCardPropertiesModel.setProperty("/defaultSpan/cols", oCardPropertiesModel.getProperty("/cardLayout/colSpan"));
                            oCardPropertiesModel.setProperty("/defaultSpan/rows",
                                oCardProperties.template === "sap.ovp.cards.list" || oCardProperties.template === "sap.ovp.cards.table" ? oCardPropertiesModel.getProperty("/cardLayout/noOfItems") : oCardPropertiesModel.getProperty("/cardLayout/rowSpan"));
                        } else {
                            if (!oCardProperties.defaultSpan.rows) {
                                oCardPropertiesModel.setProperty("/defaultSpan/rows",
                                    oCardProperties.template === "sap.ovp.cards.list" || oCardProperties.template === "sap.ovp.cards.table" ? oCardPropertiesModel.getProperty("/cardLayout/noOfItems") : oCardPropertiesModel.getProperty("/cardLayout/rowSpan"));

                            }
                            if (!oCardProperties.defaultSpan.cols) {
                                oCardPropertiesModel.setProperty("/defaultSpan/cols", oCardPropertiesModel.getProperty("/cardLayout/colSpan"));
                            }
                        }

                        // Setting drop down values for Number of Columns field
                        oCardProperties.NoOfColumns = [];
                        var iLowValue = 1, iHighValue = 6;
                        for (var q = iLowValue; q <= iHighValue; q++) {
                            oCardProperties.NoOfColumns.push({value: q});
                        }

                        if (checkIfCardTemplateHasProperty(oCardProperties.template, 'chart') || oCardProperties.template === 'sap.ovp.cards.linklist') {
                            var oMainController = oComponentContainer.getComponentInstance().getComponentData().mainComponent,
                                oMainLayout = oMainController.getLayout(),
                                oLayoutUtil = oMainLayout.getDashboardLayoutUtil(),
                                sSelectedCardId = oMainComponent._getCardId(oComponentContainer.getId()),
                                oCardDashProps = oLayoutUtil.calculateCardProperties(sSelectedCardId),
                                iBubbleTextHeight = oLayoutUtil._getCardController(sSelectedCardId).getView().byId('bubbleText') ? 43 : 0,
                                iHeightWithoutContent = oCardDashProps.headerHeight + oCardDashProps.dropDownHeight + iBubbleTextHeight + 50, //20px is the text height + 14px is the top padding + 16px is the chart top margin
                                iSmallNumberOfRows = Math.ceil(oCardDashProps.minCardHeight / oLayoutUtil.getRowHeightPx()) + 1;
                            // Setting drop down values for Number of Rows field
                            oCardProperties.NoOfRows = [];
                            oCardProperties.NoOfRows.push({
                                name: "None",
                                value: 0
                            });
                            oCardProperties.NoOfRows.push({
                                name: "Small",
                                value: iSmallNumberOfRows
                            });
                            oCardProperties.NoOfRows.push({
                                name: "Standard",
                                value: Math.ceil((iHeightWithoutContent + 480) / oLayoutUtil.getRowHeightPx()) + 1 // 480 is chart area height for standard
                            });

                            /**
                             *  Setting default value for number of columns to 1
                             *  and number of rows to miniContent height for new
                             *  static link list cards
                             */
                            if (bNewStaticLinkListCardFlag) {
                                oCardPropertiesModel.setProperty("/defaultSpan/cols", 1);
                                oCardPropertiesModel.setProperty("/defaultSpan/rows", iSmallNumberOfRows);
                            }
                        }
                    }

                    if (oCardProperties.template === "sap.ovp.cards.linklist" && oCardProperties.staticContent) {
                        var oExtraStaticCardProperties = {};
                        var oExtraStaticCardPropertiesModel = new JSONModel(oExtraStaticCardProperties);
                        getCrossAppNavigationLinks(oExtraStaticCardPropertiesModel);
                        setIndicesToStaticLinkList(oCardPropertiesModel);
                        oCardPropertiesModel.setProperty("/lineItemId", "linkListItem--1");
                        oCardPropertiesModel.setProperty("/lineItemIdCounter", oCardProperties.staticContent.length);
                    }

                    this.setVisibilityForFormElements(oCardProperties);
                    var oVisibilityModel = new JSONModel(this.oVisibility);
                    oCardPropertiesModel.attachPropertyChange(validateInputField.bind(this));

                    // settings view
                    var oSettingsView = new sap.ui.view("settingsView", {
                        viewName: "sap.ovp.cards.rta.SettingsDialog",
                        type: ViewType.XML,
                        preprocessors: {
                            xml: {
                                bindingContexts: {
                                    ovpCardProperties: oCardPropertiesModel.createBindingContext("/")
                                },
                                models: {
                                    ovpCardProperties: oCardPropertiesModel,
                                    deviceSystemProperties: oDeviceSystemPropertiesModel
                                }
                            }
                        }
                    });
                    if (oCardProperties.template === "sap.ovp.cards.linklist" && oCardProperties.staticContent) {
                        oSettingsView.setModel(oExtraStaticCardPropertiesModel, "staticCardProperties");
                    }
                    var oOvpResourceModel = this.oOvpResourceBundle ? new ResourceModel({
                        bundleUrl: this.oOvpResourceBundle.oUrlInfo.url
                    }) : null;
                    oSettingsView.setModel(oCardPropertiesModel);
                    oSettingsView.setModel(oOvpResourceModel, "ovpResourceModel");
                    oSettingsView.setModel(oDeviceMediaPropertiesModel, "deviceMediaProperties");
                    oSettingsView.setModel(oVisibilityModel, "visibility");
                    this.dialogBox.addContent(oSettingsView);
                    this.attachWindowResizeHandler();
                    oSettingsView.loaded().then(function (oView) {
                        // set the width of the component container for settings card
                        var dialogCard = oView.byId("dialogCard");
                        if (!dialogCard.getVisible()) {
                            dialogCard = oView.byId("dialogCardNoPreview");
                            var aSplitString = oSettingsView.getModel().getProperty("/template").split("."),
                                sCardType = aSplitString[aSplitString.length - 1],
                                sMessageText = this.oOvpResourceBundle && this.oOvpResourceBundle.getText("OVP_KEYUSER_NO_CARD_PREVIEW_MSG", [sCardType]);
                            dialogCard.setText(sMessageText);
                        } else {
                            dialogCard.setWidth(oCardProperties.dialogBoxWidth + "rem");
                        }
                        addCardToView(oComponentContainer, oView, bNewStaticLinkListCardFlag);

                        this.dialogBox.open();

                        // set the resolve for this promise to the controller which will resolve it when handling save
                        oView.getController().settingsResolve = resolve;
//            			resolve(this.dialogBox);
                    }.bind(this));
                }.bind(this));
            }

        };

        oSettingsUtils.fnEditCardHandler = function (oSelectedElement, fGetUnsavedChanges) {
            var oMainComponent = oSelectedElement.getComponentInstance().getComponentData().mainComponent,
                oMainLayout = oMainComponent.getLayout(),
                oUIModel = oMainComponent.getUIModel();
            return oSettingsUtils.getDialogBox(oSelectedElement).then(function (mChangeContent) {
                var aChangeSpecificData = [
                    {
                        // appDescriptorChange does not need a selector control
                        appComponent: oSelectedElement.getComponentInstance().getComponentData().appComponent,
                        changeSpecificData: {
                            appDescriptorChangeType: "appdescr_ovp_changeCard",
                            content: mChangeContent.appDescriptorChange
                        }
                    },
                    {
                        selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                        changeSpecificData: {
                            runtimeOnly: true, //UI change would be used only at runtime to modify the app; it will not be persisted
                            changeType: "editCardSettings",
                            content: mChangeContent.flexibilityChange//toUIChange(mChangeContent) // Allows for different parameters in runtime or descriptor change
                        }
                    }
                ];

                if (mChangeContent.viewSwitchChange) {
                    aChangeSpecificData.push({
                        selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                        changeSpecificData: {
                            changeType: "viewSwitch",
                            content: mChangeContent.viewSwitchChange
                        }
                    });
                }

                if (oUIModel.getProperty('/containerLayout') === 'resizable') {
                    var oLayoutModel = oMainLayout.getDashboardLayoutModel(),
                        oLayoutUtil = oMainLayout.getDashboardLayoutUtil(),
                        sSelectedCardId = oMainComponent._getCardId(oSelectedElement.getId()),
                        oSelectedCardObj = oLayoutModel.getCardById(sSelectedCardId),
                        oCardProps = oLayoutUtil.calculateCardProperties(sSelectedCardId),
                        iColumnCount = oLayoutModel.getColCount(),
                        sLayoutKey = 'C' + iColumnCount,
                        iNewCardSpan = mChangeContent.flexibilityChange.newAppDescriptor.settings.defaultSpan,
                        iNewCardRowSpan, affectedCards = [];

                    //If the card is in resizable layout and the person is doing resize operation then
                    if (iNewCardSpan && iNewCardSpan.cols) {
                        //Previous appDescriptor data to be modified to do the revert change properly
                        aChangeSpecificData.forEach(function (item) {
                            //Updating the previous change specific data appended for original card
                            if (item.changeSpecificData.changeType === 'editCardSettings') {
                                var oOldAppData = item.changeSpecificData.content.oldAppDescriptor;
                                //Set the rowSpan, ColSpan, showOnlyHeader property for revert operation in UI.
                                //Not modifying existing rows,cols because it is bound to the settings dialog in two-way binding
                                oOldAppData.settings.defaultSpan = {
                                    rowSpan: oSelectedCardObj.dashboardLayout.rowSpan,
                                    colSpan: oSelectedCardObj.dashboardLayout.colSpan,
                                    showOnlyHeader: oSelectedCardObj.dashboardLayout.showOnlyHeader
                                };
                            }
                        });
                        //If the card has new row value is 0(show only header card) then card to be resized till header height
                        // and autoSpan will be false else set autoSpan to true
                        if (iNewCardSpan.rows === 0) {
                            oSelectedCardObj.dashboardLayout.autoSpan = false;
                            iNewCardRowSpan = Math.ceil((oCardProps.headerHeight + 2 * oLayoutUtil.CARD_BORDER_PX) / oLayoutUtil.getRowHeightPx()); //new row value should be of header height / 16
                        } else {
                            oSelectedCardObj.dashboardLayout.autoSpan = true;
                            if (oSelectedCardObj.template === 'sap.ovp.cards.list' || oSelectedCardObj.template === 'sap.ovp.cards.table') {
                                oSelectedCardObj.dashboardLayout.noOfItems = iNewCardSpan.rows;
                            } else {
                                iNewCardRowSpan = iNewCardSpan.rows;
                            }
                        }
                        oLayoutModel._arrangeCards(oSelectedCardObj, {
                            row: iNewCardRowSpan,
                            column: iNewCardSpan.cols
                        }, 'resize', affectedCards);
                        oLayoutModel._removeSpaceBeforeCard(affectedCards);
                        //Create change specific data('dragOrResize') for all the affected cards
                        affectedCards.forEach(function (item) {
                            var obj = {};
                            obj.dashboardLayout = {};
                            obj.cardId = item.content.cardId;
                            obj.dashboardLayout[sLayoutKey] = item.content.dashboardLayout;
                            aChangeSpecificData.push({
                                selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                                changeSpecificData: {
                                    changeType: "dragOrResize",
                                    content: obj
                                }
                            });
                        });
                    }
                }

                return aChangeSpecificData;
            });
        };
        oSettingsUtils.fnCloneCardHandler = function (oSelectedElement, fGetUnsavedChanges) {
            return PayLoadUtils.getPayLoadForCloneCard(oSelectedElement).then(function (mChangeContent) {
                return [
                    {
                        // appDescriptorChange does not need a selector control
                        appComponent: oSelectedElement.getComponentInstance().getComponentData().appComponent,
                        changeSpecificData: {
                            appDescriptorChangeType: "appdescr_ovp_addNewCard",
                            content: mChangeContent.appDescriptorChange
                        }
                    },
                    {
                        selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                        changeSpecificData: {
                            runtimeOnly: true, //UI change would be used only at runtime to modify the app; it will not be persisted
                            changeType: "newCardSettings",
                            content: mChangeContent.flexibilityChange//toUIChange(mChangeContent) // Allows for different parameters in runtime or descriptor change
                        }
                    }
                ];
            });
        };
        oSettingsUtils.fnAddStaticLinkListCardHandler = function (oSelectedElement, fGetUnsavedChanges) {
            return oSettingsUtils.getDialogBox(oSelectedElement, true).then(function (mChangeContent) {
                return [
                    {
                        // appDescriptorChange does not need a selector control
                        appComponent: oSelectedElement.getComponentInstance().getComponentData().appComponent,
                        changeSpecificData: {
                            appDescriptorChangeType: "appdescr_ovp_addNewCard",
                            content: mChangeContent.appDescriptorChange
                        }
                    },
                    {
                        selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                        changeSpecificData: {
                            runtimeOnly: true, //UI change would be used only at runtime to modify the app; it will not be persisted
                            changeType: "newCardSettings",
                            content: mChangeContent.flexibilityChange//toUIChange(mChangeContent) // Allows for different parameters in runtime or descriptor change
                        }
                    }
                ];
            });
        };

        return oSettingsUtils;
    },
    /* bExport= */true);
