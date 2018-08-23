/*!
 * Copyright (c) 2009-2014 SAP SE, All Rights Reserved
 */

sap.ui.define([
        'jquery.sap.global',
        'sap/ovp/cards/rta/SettingsDialogConstants'
    ], function(jQuery, SettingsConstants) {
        "use strict";

        function generateId(sApplicationId, sCardId, sPath, sPropertyName) {
            return sApplicationId + "_sap.ovp.cards." + sCardId + "." + sPath + "." + sPropertyName;
        }

        function createTranslationTextObject(sValue) {
            return {
                "type": "XTIT",
                "maxLength": 40,
                "value": {
                    "": sValue
                }
            };
        }

        function createArrayPathForPayLoad(sPathPrefix, iIndex, sPathSuffix) {
            var sPath = sPathPrefix + "[" + iIndex + "]";
            if (sPathSuffix) {
                sPath += "/" + sPathSuffix;
            }
            return sPath;
        }

        function searchCardIdInManifest(cardId, oMainComponent) {
            var aCards = oMainComponent._getCardsModel();
            for (var i = 0; i < aCards.length; i++) {
                if (aCards[i].id === cardId) {
                    return true;
                }
            }
            return false;
        }

        function createEntityPropertyChangeObject(propertyPath, operation, propertyValue) {
            var oEntityPropertyChange = {
                "propertyPath": propertyPath,
                "operation": operation
            };

            if (propertyValue) {
                oEntityPropertyChange["propertyValue"] = propertyValue;
            }

            return oEntityPropertyChange;
        }

        /**
         * Deleting unnecessary Manifest settings
         */
        function formatManifestSettings(oCardManifest) {
            delete oCardManifest.id;
            delete oCardManifest.dashboardLayout;
            delete oCardManifest.settings.baseUrl;
            delete oCardManifest.settings.cloneCard;
            delete oCardManifest.settings.newCard;
            delete oCardManifest["customer.settings"];
            delete oCardManifest["vendor.settings"];
            if (oCardManifest.settings["staticContent"]) {
                for (var i = 0; i < oCardManifest.settings["staticContent"].length; i++) {
                    delete oCardManifest.settings["staticContent"][i].id;
                }
            }
        }

        function createOrUpdateVendorNameSpace(oCardManifest, oOriginalCardManifest, sNameSpace) {
            if (sNameSpace === "customer.settings" && oOriginalCardManifest) {
                oPayLoadUtils.aEntityPropertyChange.push(createEntityPropertyChangeObject("vendor.settings", "UPSERT", oOriginalCardManifest.settings));
                oCardManifest["vendor.settings"] = oOriginalCardManifest.settings;
            }
        }

        function createDeleteOperation(sNameSpace, sPath, oObjectToUpdate, sPropertyName) {
            /**
             *  If the property has to be updated on the object
             */
            if (oObjectToUpdate) {
                if (sNameSpace === "customer.settings") {
                    oObjectToUpdate[sPropertyName] = {
                        operation: "DELETE"
                    };
                }
            } else {
                /**
                 *  Else create an entity property change payLoad
                 */
                if (sNameSpace === "customer.settings") {
                    oPayLoadUtils.aEntityPropertyChange.push(createEntityPropertyChangeObject(sPath, "UPSERT", {
                        operation: "DELETE"
                    }));
                } else {
                    oPayLoadUtils.aEntityPropertyChange.push(createEntityPropertyChangeObject(sPath, "DELETE"));
                }
            }
        }

        /**
         *
         */
        function createCustomerSettingsChange(oCardManifest) {
            /**
             *  Push all changes in customer.settings object to change payLoad
             */
            oPayLoadUtils.aEntityPropertyChange.push(createEntityPropertyChangeObject("customer.settings", "UPSERT", oCardManifest["customer.settings"]));
        }

        /**
         *
         */
        function createTextPropertyChange(sIdPath, sPath, sPropertyName, sValue, oObjectToUpdate) {
            var sId = generateId(oPayLoadUtils.sApplicationId, oPayLoadUtils.sCardId, sIdPath, sPropertyName),
                sPropPath = sPath + "/" + sPropertyName;

            if (!oPayLoadUtils.oText) {
                oPayLoadUtils.oText = {};
            }

            oPayLoadUtils.oText[sId] = createTranslationTextObject(sValue);

            /**
             *  If the property has to be updated on the object
             */
            if (oObjectToUpdate) {
                oObjectToUpdate[sPropertyName] = "{{" + sId + "}}";
            } else {
                /**
                 *  Else create an entity property change payLoad
                 */
                oPayLoadUtils.aEntityPropertyChange.push(createEntityPropertyChangeObject(sPropPath, "UPSERT", "{{" + sId + "}}"));
            }
        }

        /**
         *
         */
        function createTextChangesForSimpleCard(sNameSpace, oCardManifest, aTexts, bObjectToUpdate) {
            var newSettings = this._oCardManifestSettings,
                oldSettings = this._oOriginalCardManifestSettings;
            /**
             *  Looping through all text properties to detect text change
             */
            for (var i = 0; i < aTexts.length; i++) {
                /**
                 *  Condition where a property inside newSettings does not exist inside oldSettings
                 *  It is a case where a new text property is added
                 *  "Add" operation
                 *
                 *  Condition where a property inside newSettings value is changed w.r.t oldSettings
                 *  It is a case where a text property is updated
                 *  "Update" operation
                 */
                if ((!oldSettings[aTexts[i]] && newSettings[aTexts[i]]) ||
                    (oldSettings[aTexts[i]] && newSettings[aTexts[i]] && (oldSettings[aTexts[i]] != newSettings[aTexts[i]]))) {
                    /**
                     *  If the property has to be updated on the object
                     */
                    if (bObjectToUpdate) {
                        createTextPropertyChange(sNameSpace, sNameSpace, aTexts[i], newSettings[aTexts[i]], oCardManifest[sNameSpace]);
                    } else {
                        /**
                         *  Else create an entity property change payLoad
                         */
                        createTextPropertyChange(sNameSpace, sNameSpace, aTexts[i], newSettings[aTexts[i]]);
                    }
                    oCardManifest.settings[aTexts[i]] = newSettings[aTexts[i]];
                } else if (!newSettings[aTexts[i]] && oldSettings[aTexts[i]]) {
                    /**
                     *  It is a case where an old text property is deleted
                     *  "Delete" operation
                     */
                    /**
                     *  If the property has to be updated on the object
                     */
                    if (bObjectToUpdate) {
                        createDeleteOperation(sNameSpace, sNameSpace + "/" + aTexts[i], oCardManifest[sNameSpace], aTexts[i]);
                    } else {
                        /**
                         *  Else create an entity property change payLoad
                         */
                        createDeleteOperation(sNameSpace, sNameSpace + "/" + aTexts[i]);
                    }
                    delete oCardManifest.settings[aTexts[i]];
                }
            }
        }

        /**
         *
         */
        function createPropertyChange(sPath, sPropertyName, sValue, oObjectToUpdate) {
            var sPropPath = sPath + "/" + sPropertyName;
            /**
             *  If the property has to be updated on the object
             */
            if (oObjectToUpdate) {
                oObjectToUpdate[sPropertyName] = sValue;
            } else {
                /**
                 *  Else create an entity property change payLoad
                 */
                oPayLoadUtils.aEntityPropertyChange.push(createEntityPropertyChangeObject(sPropPath, "UPSERT", sValue));
            }
        }

        /**
         *
         */
        function createPropChangesForSimpleCard(sNameSpace, oCardManifest, aSettings, bObjectToUpdate) {
            var newSettings = this._oCardManifestSettings,
                oldSettings = this._oOriginalCardManifestSettings;
            /**
             *  Looping through all the other properties to detect property change
             */
            for (var i = 0; i < aSettings.length; i++) {
                /**
                 *  Condition where a property inside newSettings does not exist inside oldSettings
                 *  It is a case where a new property is added
                 *  "Add" operation
                 *
                 *  Condition where a property inside newSettings value is changed w.r.t oldSettings
                 *  It is a case where a property is updated
                 *  "Update" operation
                 */
                if ((!oldSettings[aSettings[i]] && newSettings[aSettings[i]]) ||
                    (oldSettings[aSettings[i]] && newSettings[aSettings[i]] && (oldSettings[aSettings[i]] != newSettings[aSettings[i]]))) {
                    /**
                     *  If the property has to be updated on the object
                     */
                    if (bObjectToUpdate) {
                        createPropertyChange(sNameSpace, aSettings[i], newSettings[aSettings[i]], oCardManifest[sNameSpace]);
                    } else {
                        /**
                         *  Else create an entity property change payLoad
                         */
                        createPropertyChange(sNameSpace, aSettings[i], newSettings[aSettings[i]]);
                    }
                    oCardManifest.settings[aSettings[i]] = newSettings[aSettings[i]];
                } else if (!newSettings[aSettings[i]] && oldSettings[aSettings[i]]) {
                    /**
                     *  It is a case where an old property is deleted
                     *  "Delete" operation
                     */
                    /**
                     *  If the property has to be updated on the object
                     */
                    if (bObjectToUpdate) {
                        createDeleteOperation(sNameSpace, sNameSpace + "/" + aSettings[i], oCardManifest[sNameSpace], aSettings[i]);
                    } else {
                        /**
                         *  Else create an entity property change payLoad
                         */
                        createDeleteOperation(sNameSpace, sNameSpace + "/" + aSettings[i]);
                    }
                    delete oCardManifest.settings[aSettings[i]];
                }
            }
        }

        /**
         *
         */
        function createForSimpleCard(sNameSpace, oCardManifest) {
            var aSettings = SettingsConstants.cardSettings["settings"],
                aTexts = SettingsConstants.cardSettings["text"];
            /**
             *  For case where changes are made on top of cards delivered by vendor
             *  Updating of the properties for such cards is done in customer.settings
             *  Instead of settings
             */
            if (sNameSpace === "customer.settings") {
                /**
                 *  If there is customer.settings object inside card manifest
                 *  Example:-
                 *  "cardId" : {
                 *      "customer.settings": {...},
                 *      "settings": {...},
                 *      ...
                 *  }
                 */
                if (oCardManifest["customer.settings"]) {
                    /**
                     *  Settings containing text changes
                     */
                    createTextChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aTexts, false);

                    /**
                     *  Settings containing other changes
                     */
                    createPropChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aSettings, false);
                } else {
                    /**
                     *  There is no customer.settings object inside card manifest
                     *  Example:-
                     *  "cardId" : {
                     *      "settings": {...},
                     *      ...
                     *  }
                     */
                    oCardManifest["customer.settings"] = {};
                    /**
                     *  Settings containing text changes
                     */
                    createTextChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aTexts, true);

                    /**
                     *  Settings containing other changes
                     */
                    createPropChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aSettings, true);

                    createCustomerSettingsChange(oCardManifest);
                }
            } else {
                /**
                 *  For case where changes are made on top of cards delivered by customers
                 *  Updating of the properties for such cards is done in settings
                 */
                /**
                 *  Settings containing text changes
                 */
                createTextChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aTexts, false);

                /**
                 *  Settings containing other changes
                 */
                createPropChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aSettings, false);
            }
        }

        /**
         *
         */
        function createTextChangeForWholeArray(sNameSpace, oCardManifest, aNewArray, aTexts, sType, bObjectToUpdate) {
            var newSettings = this._oCardManifestSettings[sType];

            /**
             *  Looping through all the elements of the Array
             */
            for (var i = 0; i < newSettings.length; i++) {
                /**
                 *  Looping through all text properties to detect text change
                 */
                for (var j = 0; j < aTexts.length; j++) {
                    /**
                     *  If Property value is not undefined
                     */
                    if (newSettings[i][aTexts[j]]) {
                        var sPath = createArrayPathForPayLoad(sNameSpace + "/" + sType, i),
                            sIdPath = sNameSpace + "." + sType + "." + i;

                        /**
                         *  If the property has to be updated on the object
                         */
                        if (bObjectToUpdate) {
                            createTextPropertyChange(sIdPath, sPath, aTexts[j], newSettings[i][aTexts[j]], oCardManifest[sNameSpace][sType][i]);
                        } else {
                            /**
                             *  Else update property on temporary object aNewArray
                             */
                            createTextPropertyChange(sIdPath, sPath, aTexts[j], newSettings[i][aTexts[j]], aNewArray[i]);
                        }
                    }
                }
            }

            /**
             *  Create an entity property change payLoad
             */
            if (!bObjectToUpdate) {
                createPropertyChange(sNameSpace, sType, aNewArray);
            }
        }

        /**
         *
         */
        function checkIfOnlyTabLevelProp(sPropertyName, sType) {
            var aOnlyTabLevelProps = SettingsConstants.cardSettingsArrayLevel[sType]["onlyTabLevelProps"],
                bFlag = false;
            /**
             *  Looping through all the onlyTabLevelProps
             */
            for (var i = 0; aOnlyTabLevelProps && i < aOnlyTabLevelProps.length; i++) {
                /**
                 *  If it is only tab level property
                 *  Then return true
                 */
                if (aOnlyTabLevelProps[i] === sPropertyName) {
                    bFlag = true;
                    break;
                }
            }

            return bFlag;
        }

        /**
         *
         */
        function createChangeForRemovalOfArray(sNameSpace, oCardManifest, aTexts, aSettings, sType, bObjectToUpdate) {
            var newSettings = this._oCardManifestSettings, i;
            /**
             *  Text Changes
             */
            /**
             *  Looping through all text properties to detect text change
             */
            for (i = 0; i < aTexts.length; i++) {
                /**
                 *  If Property value is not undefined
                 */
                if (newSettings[aTexts[i]] && !checkIfOnlyTabLevelProp(aTexts[i], sType)) {
                    /**
                     *  If the property has to be updated on the object
                     */
                    if (bObjectToUpdate) {
                        createTextPropertyChange(sNameSpace, sNameSpace, aTexts[i], newSettings[aTexts[i]], oCardManifest[sNameSpace]);
                    } else {
                        /**
                         *  Else create an entity property change payLoad
                         */
                        createTextPropertyChange(sNameSpace, sNameSpace, aTexts[i], newSettings[aTexts[i]]);
                    }
                    oCardManifest.settings[aTexts[i]] = newSettings[aTexts[i]];
                }
            }

            /**
             *  Settings Changes
             */
            /**
             *  Looping through all the other properties to detect property change
             */
            for (i = 0; i < aSettings.length; i++) {
                /**
                 *  If Property value is not undefined
                 */
                if (newSettings[aSettings[i]] && !checkIfOnlyTabLevelProp(aSettings[i], sType)) {
                    /**
                     *  If the property has to be updated on the object
                     */
                    if (bObjectToUpdate) {
                        createPropertyChange(sNameSpace, aSettings[i], newSettings[aSettings[i]], oCardManifest[sNameSpace]);
                    } else {
                        /**
                         *  Else create an entity property change payLoad
                         */
                        createPropertyChange(sNameSpace, aSettings[i], newSettings[aSettings[i]]);
                    }
                    oCardManifest.settings[aSettings[i]] = newSettings[aSettings[i]];
                }
            }

            /**
             *  Remove whole Array
             */
            /**
             *  If the property has to be updated on the object
             */
            if (bObjectToUpdate) {
                createDeleteOperation(sNameSpace, sNameSpace + "/" + sType, oCardManifest[sNameSpace], sType);
            } else {
                /**
                 *  Else create an entity property change payLoad
                 */
                createDeleteOperation(sNameSpace, sNameSpace + "/" + sType);
            }
            delete oCardManifest.settings[sType];
        }

        /**
         *
         */
        function createChangeForRevealOfArray(sNameSpace, oCardManifest, newArray, aTexts, aSettings, sType, bObjectToUpdate) {
            var i;
            /**
             *  Text Changes
             */
            /**
             *  Looping through all text properties to detect text change
             */
            for (i = 0; i < aTexts.length; i++) {
                /**
                 *  If Property exists
                 */
                if (oCardManifest[sNameSpace][aTexts[i]]) {
                    /**
                     *  If the property has to be updated on the object
                     */
                    if (bObjectToUpdate) {
                        createDeleteOperation(sNameSpace, sNameSpace + "/" + aTexts[i], oCardManifest[sNameSpace], aTexts[i]);
                    } else {
                        /**
                         *  Else create an entity property change payLoad
                         */
                        createDeleteOperation(sNameSpace, sNameSpace + "/" + aTexts[i]);
                    }
                    delete oCardManifest.settings[aTexts[i]];
                }
            }

            /**
             *  Settings Changes
             */
            /**
             *  Looping through all the other properties to detect property change
             */
            for (i = 0; i < aSettings.length; i++) {
                /**
                 *  If Property exists
                 */
                if (oCardManifest[sNameSpace][aSettings[i]]) {
                    /**
                     *  If the property has to be updated on the object
                     */
                    if (bObjectToUpdate) {
                        createDeleteOperation(sNameSpace, sNameSpace + "/" + aSettings[i], oCardManifest[sNameSpace], aSettings[i]);
                    } else {
                        /**
                         *  Else create an entity property change payLoad
                         */
                        createDeleteOperation(sNameSpace, sNameSpace + "/" + aSettings[i]);
                    }
                    delete oCardManifest.settings[aSettings[i]];
                }
            }

            /**
             *  Reveal whole Array
             */
            createTextChangeForWholeArray.bind(this)(sNameSpace, oCardManifest, newArray, aTexts, sType, bObjectToUpdate);
        }

        /**
         *
         */
        function copyFormattedArrayWithoutReference(newArray, sType) {
            return jQuery.map(jQuery.extend(true, {}, newArray), function (value) {
                var aTexts = SettingsConstants.cardSettingsArrayLevel[sType]["text"], i,
                    aSettings = SettingsConstants.cardSettingsArrayLevel[sType]["settings"],
                    formattedValue = {};
                /**
                 *  Copy Text properties
                 */
                for (i = 0; i < aTexts.length; i++) {
                    /**
                     *  If property exists in value object
                     */
                    if (value[aTexts[i]]) {
                        formattedValue[aTexts[i]] = value[aTexts[i]];
                    }
                }

                /**
                 *  Copy Settings properties
                 */
                for (i = 0; i < aSettings.length; i++) {
                    /**
                     *  If property exists in value object
                     */
                    if (value[aSettings[i]]) {
                        formattedValue[aSettings[i]] = value[aSettings[i]];
                    }
                }

                return formattedValue;
            });
        }

        /**
         *
         */
        function createChangeForArray(sNameSpace, oCardManifest, newArray, oldArray, sType, bObjectToUpdate) {
            var aTexts = SettingsConstants.cardSettingsArrayLevel[sType]["text"],
                aSettings = SettingsConstants.cardSettingsArrayLevel[sType]["settings"],
                aCopyNewArray = copyFormattedArrayWithoutReference(newArray, sType);
            /**
             *  Condition where both arrays newArray and oldArray exist and
             *  Case where delete operation is done on newArray elements
             *  Array "Delete" operation
             *
             *  Condition where both arrays newArray and oldArray exist and
             *  Case where add operation is done on newArray elements
             *  Array "Add" operation
             *
             *  Condition where both arrays newArray and oldArray exist and
             *  Case where reorder operation is done on newArray elements
             *  Array "Reorder" operation
             *
             *  Condition where both arrays newArray and oldArray exist and
             *  Case where update operation is done on newArray elements
             *  Array "Update" operation
             */
            if (newArray && oldArray) {
                /**
                 *  Copying whole new array to oCardManifest
                 */
                oCardManifest.settings[sType] = copyFormattedArrayWithoutReference(newArray, sType);
                /**
                 *  Copying whole array to oCardManifest in customer.settings
                 */
                if (sNameSpace === "customer.settings") {
                    oCardManifest[sNameSpace][sType] = copyFormattedArrayWithoutReference(newArray, sType);
                }
                createTextChangeForWholeArray.bind(this)(sNameSpace, oCardManifest, aCopyNewArray, aTexts, sType, bObjectToUpdate);
            } else if (!newArray && oldArray) {
                /**
                 *  Condition where newArray is empty and oldArray exist
                 *  Case where remove operation is done on newArray
                 *  Array "Remove" operation
                 */
                createChangeForRemovalOfArray.bind(this)(sNameSpace, oCardManifest, aTexts, aSettings, sType, bObjectToUpdate);
            } else if (newArray && !oldArray) {
                /**
                 *  Condition where oldArray is empty and newArray exist
                 *  Case where reveal operation is done on newArray
                 *  Array "Reveal" operation
                 */
                /**
                 *  Copying whole new array to oCardManifest
                 */
                oCardManifest.settings[sType] = copyFormattedArrayWithoutReference(newArray, sType);
                /**
                 *  Copying whole array to oCardManifest in customer.settings
                 */
                if (sNameSpace === "customer.settings") {
                    oCardManifest[sNameSpace][sType] = copyFormattedArrayWithoutReference(newArray, sType);
                }
                createChangeForRevealOfArray.bind(this)(sNameSpace, oCardManifest, aCopyNewArray, aTexts, aSettings, sType, bObjectToUpdate);
            }
        }

        /**
         *
         */
        function createChangesForComplexCard(sNameSpace, oCardManifest, bObjectToUpdate) {
            var aStaticContent = this._oCardManifestSettings["staticContent"],
                aOriginalStaticContent = this._oOriginalCardManifestSettings["staticContent"],
                aTabs = this._oCardManifestSettings["tabs"],
                aOriginalTabs = this._oOriginalCardManifestSettings["tabs"];
            /**
             *  If the card contains static link list array
             */
            if (aStaticContent || aOriginalStaticContent) {
                createChangeForArray.bind(this)(sNameSpace, oCardManifest, aStaticContent, aOriginalStaticContent, "staticContent", bObjectToUpdate);
            } else if (aTabs || aOriginalTabs) {
                /**
                 *  If the card contains tabs array
                 */
                createChangeForArray.bind(this)(sNameSpace, oCardManifest, aTabs, aOriginalTabs, "tabs", bObjectToUpdate);
            }
        }

        /**
         *
         */
        function createForComplexCard(sNameSpace, oCardManifest) {
            var aSettings = SettingsConstants.cardSettingsForComplex["settings"],
                aTexts = SettingsConstants.cardSettingsForComplex["text"];
            /**
             *  For case where changes are made on top of cards delivered by vendor
             *  Updating of the properties for such cards is done in customer.settings
             *  Instead of settings
             */
            if (sNameSpace === "customer.settings") {
                /**
                 *  If there is customer.settings object inside card manifest
                 *  Example:-
                 *  "cardId" : {
                 *      "customer.settings": {...},
                 *      "settings": {...},
                 *      ...
                 *  }
                 */
                if (oCardManifest["customer.settings"]) {
                    /**
                     *  Settings containing text changes
                     *  For non Array level settings
                     */
                    createTextChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aTexts, false);

                    /**
                     *  Settings containing other changes
                     *  For non Array level settings
                     */
                    createPropChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aSettings, false);

                    /**
                     *  For Array level settings
                     */
                    createChangesForComplexCard.bind(this)(sNameSpace, oCardManifest, false);
                } else {
                    /**
                     *  There is no customer.settings object inside card manifest
                     *  Example:-
                     *  "cardId" : {
                     *      "settings": {...},
                     *      ...
                     *  }
                     */
                    oCardManifest["customer.settings"] = {};
                    /**
                     *  Settings containing text changes
                     *  For non Array level settings
                     */
                    createTextChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aTexts, true);

                    /**
                     *  Settings containing other changes
                     *  For non Array level settings
                     */
                    createPropChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aSettings, true);

                    /**
                     *  For Array level settings
                     */
                    createChangesForComplexCard.bind(this)(sNameSpace, oCardManifest, true);

                    createCustomerSettingsChange(oCardManifest);
                }
            } else {
                /**
                 *  For case where changes are made on top of cards delivered by customers
                 *  Updating of the properties for such cards is done in settings
                 */
                /**
                 *  Settings containing text changes
                 *  For non Array level settings
                 */
                createTextChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aTexts, false);

                /**
                 *  Settings containing other changes
                 *  For non Array level settings
                 */
                createPropChangesForSimpleCard.bind(this)(sNameSpace, oCardManifest, aSettings, false);

                /**
                 *  For Array level settings
                 */
                createChangesForComplexCard.bind(this)(sNameSpace, oCardManifest, false);
            }
        }

        /**
         *
         */
        function createSettingsChangeObjectForEditCard(sNameSpace, oCardManifest) {
            var aStaticContent = this._oCardManifestSettings["staticContent"],
                aOriginalStaticContent = this._oOriginalCardManifestSettings["staticContent"],
                aTabs = this._oCardManifestSettings["tabs"],
                aOriginalTabs = this._oOriginalCardManifestSettings["tabs"];

            /**
             *  Case where are is Array operations involved
             */
            if (aStaticContent || aOriginalStaticContent || aTabs || aOriginalTabs) {
                createForComplexCard.bind(this)(sNameSpace, oCardManifest);
            } else {
                /**
                 *  Case where no Array operations are needed
                 */
                createForSimpleCard.bind(this)(sNameSpace, oCardManifest);
            }
        }

        /**
         *
         */
        function createManifestForStaticLinkListCard() {
            var aStaticContent = this._oCardManifestSettings["staticContent"],
                aTexts = SettingsConstants.cardSettingsArrayLevel["staticContent"]["text"], i, j,
                aSettings = SettingsConstants.cardSettingsArrayLevel["staticContent"]["settings"],
                newSettings = this._oCardManifestSettings,
                aCardSetting = SettingsConstants.cardSettingsForStaticLinkListCard,
                oCardManifest = {
                    "template": "sap.ovp.cards.linklist",
                    "settings": {
                        "staticContent": []
                    }
                };

            /**
             *  Copying all the card level settings for static link list card
             */
            for (j = 0; j < aCardSetting.length; j++) {
                /**
                 *  If property exists in value object
                 */
                if (newSettings[aCardSetting[j]]) {
                    oCardManifest.settings[aCardSetting[j]] = newSettings[aCardSetting[j]];
                }
            }

            /**
             *  Copying all the staticContent properties to oCardManifest
             */
            for (j = 0; j < aStaticContent.length; j++) {
                /**
                 *  Pushing Empty Object for a new static link
                 */
                oCardManifest.settings["staticContent"].push({});
                /**
                 *  Copy Text properties
                 */
                for (i = 0; i < aTexts.length; i++) {
                    /**
                     *  If property exists in value object
                     */
                    if (aStaticContent[j][aTexts[i]]) {
                        oCardManifest.settings["staticContent"][j][aTexts[i]] = aStaticContent[j][aTexts[i]];
                    }
                }

                /**
                 *  Copy Settings properties
                 */
                for (i = 0; i < aSettings.length; i++) {
                    /**
                     *  If property exists in value object
                     */
                    if (aStaticContent[j][aSettings[i]]) {
                        oCardManifest.settings["staticContent"][j][aSettings[i]] = aStaticContent[j][aSettings[i]];
                    }
                }
            }

            return oCardManifest;
        }

        /**
         * Making an Object oText containing translation properties for Clone Card
         * type is "XTIT"
         * maxLength is 40
         */
        function createTextTranslationObjectForCloneCard(sApplicationId, sCardId, oCardManifest) {
            var oText, i, j, k, sPropertyName, aStaticContent = oCardManifest.settings["staticContent"],
                aTabs = oCardManifest.settings["tabs"];

            var aCardSettingsWithText = SettingsConstants.cardSettingsWithText;
            for (i = 0; i < aCardSettingsWithText.length; i++) {
                var sId;
                if (typeof aCardSettingsWithText[i] == "string") {
                    if (oCardManifest.settings[aCardSettingsWithText[i]]) {
                        if (!oText) {
                            oText = {};
                        }
                        sId = generateId(sApplicationId, sCardId, "settings", aCardSettingsWithText[i]);
                        oText[sId] = createTranslationTextObject(oCardManifest.settings[aCardSettingsWithText[i]]);
                        oCardManifest.settings[aCardSettingsWithText[i]] = "{{" + sId + "}}";
                    }
                } else if (typeof aCardSettingsWithText[i] == "object") {
                    if (aCardSettingsWithText[i].hasOwnProperty("staticContent")) {
                        if (aStaticContent) {
                            for (j = 0; j < aStaticContent.length; j++) {
                                for (k = 0; k < aCardSettingsWithText[i]["staticContent"].length; k++) {
                                    sPropertyName = aCardSettingsWithText[i]["staticContent"][k];
                                    if (aStaticContent[j][sPropertyName]) {
                                        if (!oText) {
                                            oText = {};
                                        }
                                        sId = generateId(sApplicationId, sCardId, "settings.staticContent." + j, sPropertyName);
                                        oText[sId] = createTranslationTextObject(aStaticContent[j][sPropertyName]);
                                        oCardManifest.settings["staticContent"][j][sPropertyName] = "{{" + sId + "}}";
                                    }
                                }
                            }
                        }
                    } else if (aCardSettingsWithText[i].hasOwnProperty("tabs")) {
                        if (aTabs) {
                            for (j = 0; j < aTabs.length; j++) {
                                for (k = 0; k < aCardSettingsWithText[i]["tabs"].length; k++) {
                                    sPropertyName = aCardSettingsWithText[i]["tabs"][k];
                                    if (aTabs[j][sPropertyName]) {
                                        if (!oText) {
                                            oText = {};
                                        }
                                        sId = generateId(sApplicationId, sCardId, "settings.tabs." + j, sPropertyName);
                                        oText[sId] = createTranslationTextObject(aTabs[j][sPropertyName]);
                                        oCardManifest.settings["tabs"][j][sPropertyName] = "{{" + sId + "}}";
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return oText;
        }

        function createFinalPayLoad(oParameters, oText, oFlexCardManifest, oOriginalCardManifest, oViewSwitchChange) {
            var payLoad = {};
            payLoad['appDescriptorChange'] = {
                'parameters': oParameters
            };
            if (oText) {
                payLoad['appDescriptorChange']['texts'] = oText;
            }

            if (oOriginalCardManifest) {
                payLoad['flexibilityChange'] = {
                    "newAppDescriptor": oFlexCardManifest,
                    "oldAppDescriptor": oOriginalCardManifest
                };
            } else {
                payLoad['flexibilityChange'] = oFlexCardManifest;
            }

            if (oViewSwitchChange) {
                payLoad['viewSwitchChange'] = oViewSwitchChange;
            }

            return payLoad;
        }

        var oPayLoadUtils = {

            sApplicationId: "",
            sCardId: "",
            aEntityPropertyChange: [],
            oText: undefined,

            getPayLoadForEditCard: function(settingsUtils) {
                var sCardId = settingsUtils.oAppDescriptor.id, oParameters = {
                    "cardId": sCardId
                }, oText, aEntityPropertyChange, oCardManifest = jQuery.extend(true, {}, settingsUtils.oAppDescriptor),
                    oOriginalCardManifest = jQuery.extend(true, {}, settingsUtils.oAppDescriptor),
                    sNameSpace, oViewSwitchChange;

                sNameSpace = (sCardId.lastIndexOf("customer.", 0) === 0) ? "settings" : "customer.settings";
                oPayLoadUtils.sApplicationId = settingsUtils.sApplicationId;
                oPayLoadUtils.sCardId = sCardId;
                oPayLoadUtils.aEntityPropertyChange = [];
                oPayLoadUtils.oText = undefined;

                createOrUpdateVendorNameSpace(oCardManifest, settingsUtils.oOriginalAppDescriptor, sNameSpace);

                createSettingsChangeObjectForEditCard.bind(this)(sNameSpace, oCardManifest);

                oText = jQuery.extend(true, {}, oPayLoadUtils.oText);
                aEntityPropertyChange = oPayLoadUtils.aEntityPropertyChange;

                if (aEntityPropertyChange.length === 1) {
                    oParameters["entityPropertyChange"] = aEntityPropertyChange[0];
                } else {
                    oParameters["entityPropertyChange"] = aEntityPropertyChange;
                }

                /**
                 *  If View Switch exists
                 *  Then also added the selectedKey to flex change
                 */
                if (this._oCardManifestSettings["tabs"]) {
                    var iSelectedKey = this._oCardManifestSettings.defaultViewSelected,
                        iOldKey = this._oOriginalCardManifestSettings.selectedKey;
                    // Changing oldKey to the previously selected tab
                    iOldKey = (iOldKey && iOldKey > 0) ? iOldKey : 1;
                    if (iSelectedKey && iSelectedKey > 0 && iSelectedKey !== iOldKey) {
                        oViewSwitchChange = {
                            cardId: sCardId,
                            selectedKey: iSelectedKey,
                            oldKey: iOldKey
                        };
                    }
                    oCardManifest.settings.selectedKey = iSelectedKey;
                }

                return createFinalPayLoad(oParameters, oText, oCardManifest, oOriginalCardManifest, oViewSwitchChange);
            },

            getPayLoadForCloneCard: function(oComponentContainer) {
                return new Promise(function (resolve, reject) {
                    var oParameters = {
                            card: {}
                        }, oText, oFlexCardManifest = {},
                        oComponentData = oComponentContainer.getComponentInstance().getComponentData(),
                        oMainComponent = oComponentData.mainComponent,
                        sApplicationId = oMainComponent._getApplicationId(),
                        oCardManifest = jQuery.extend(true, {}, oMainComponent._getCardFromManifest(oComponentData.cardId));

                    var cardId = "customer." + oCardManifest.id, i = 1;
                    while (searchCardIdInManifest(cardId + "_" + i, oMainComponent)) {
                        i++;
                    }
                    cardId = cardId + "_" + i;

                    formatManifestSettings(oCardManifest);

                    oFlexCardManifest = jQuery.extend(true, {}, oCardManifest);
                    oFlexCardManifest.id = cardId;
                    oFlexCardManifest.settings.title = oFlexCardManifest.settings.title + " " + i;
                    oCardManifest.settings.title = oCardManifest.settings.title + " " + i;
                    if (oCardManifest.settings.defaultSpan && oCardManifest.settings.defaultSpan.showOnlyHeader) {
                        oCardManifest.settings.defaultSpan.rows = 12;
                    }

                    oText = createTextTranslationObjectForCloneCard(sApplicationId, cardId, oCardManifest);

                    oParameters.card[cardId] = oCardManifest;

                    resolve(createFinalPayLoad(oParameters, oText, oFlexCardManifest));
                });
            },

            getPayLoadForNewStaticLinkListCard: function(settingsUtils) {
                var oParameters = {
                        card: {}
                    }, oText, oFlexCardManifest = {},
                    oMainComponent = settingsUtils.oMainComponent,
                    sApplicationId = oMainComponent._getApplicationId(),
                    oCardManifest = createManifestForStaticLinkListCard.bind(this)();

                var cardId = "customer.newStaticLinkListCard", i = 1;
                while (searchCardIdInManifest(cardId + "_" + i, oMainComponent)) {
                    i++;
                }
                cardId = cardId + "_" + i;

                formatManifestSettings(oCardManifest);

                oFlexCardManifest = jQuery.extend(true, {}, oCardManifest);
                oFlexCardManifest.id = cardId;

                oText = createTextTranslationObjectForCloneCard(sApplicationId, cardId, oCardManifest);

                oParameters.card[cardId] = oCardManifest;

                return createFinalPayLoad(oParameters, oText, oFlexCardManifest);
            }
        };

        return oPayLoadUtils;
    },
    /* bExport= */true);
