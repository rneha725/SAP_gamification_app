/*!
 * Copyright (c) 2009-2014 SAP SE, All Rights Reserved
 */

sap.ui.define([
        "jquery.sap.global",
        "sap/ovp/cards/CommonUtils",
        "sap/ovp/cards/SettingsUtils",
        "sap/ui/dt/plugin/ElementMover",
        "sap/ui/dt/OverlayRegistry",
        'sap/ui/dt/OverlayUtil',
        'sap/ui/rta/plugin/Plugin',
        'sap/ui/rta/util/BindingsExtractor',
        'sap/ui/dt/MetadataPropagationUtil',
        'sap/ui/rta/Utils'
    ], function (jQuery, CommonUtils, SettingsUtils, ElementMover, OverlayRegistry, OverlayUtil, Plugin, BindingsExtractor,
                 MetadataPropagationUtil, Utils) {
        "use strict";
        var oAppMain = CommonUtils.getApp();
        var oResourceBundle = oAppMain && oAppMain._getLibraryResourceBundle();
        oResourceBundle = oResourceBundle || sap.ui.getCore().getLibraryResourceBundle("sap.ovp");
        var oElementMover = new ElementMover(),
            oDesignTime,
            _getTargetZoneAggregation = function(oTargetOverlay) {
                var aAggregationOverlays = oTargetOverlay.getAggregationOverlays();
                var aPossibleTargetZones = aAggregationOverlays.filter(function(oAggregationOverlay) {
                    return oAggregationOverlay.isTargetZone();
                });
                if (aPossibleTargetZones.length > 0) {
                    return aPossibleTargetZones[0];
                } else {
                    return null;
                }
            },
            _executePaste = function (oTargetOverlay) {
                var oCutOverlay = oElementMover.getMovedOverlay();
                if (!oCutOverlay) {
                    return false;
                }

                var bResult = false;
                if (!(oTargetOverlay.getElement() === oCutOverlay.getElement())) {
                    var oTargetZoneAggregation = _getTargetZoneAggregation(oTargetOverlay);
                    if (oTargetZoneAggregation) {
                        //oElementMover.insertInto(oCutOverlay, oTargetZoneAggregation);
                        bResult = true;
                    } else if (OverlayUtil.isInTargetZoneAggregation(oTargetOverlay)) {
                        //oElementMover.repositionOn(oCutOverlay, oTargetOverlay);
                        bResult = true;
                    }
                }

                if (bResult) {
                    oCutOverlay.setSelected(true);
                    setTimeout(function () {
                        oCutOverlay.focus();
                    }, 0);
                }

                return bResult;
            };

        // "checkTargetZone" function overriding
        var fCheckTargetZone = ElementMover.prototype.checkTargetZone;

        ElementMover.prototype.checkTargetZone = function (oAggregationOverlay, oOverlay, bOverlayNotInDom) {
            var oMovedOverlay = oOverlay ? oOverlay : this.getMovedOverlay();

            var bTargetZone = fCheckTargetZone.apply(this, arguments);
            if (!bTargetZone) {
                return false;
            }

            var oMovedElement = oMovedOverlay.getElement();
            var oTargetOverlay = oAggregationOverlay.getParent();
            var oMovedRelevantContainer = oMovedOverlay.getRelevantContainer();
            var oTargetElement = oTargetOverlay.getElement();
            var oAggregationDtMetadata = oAggregationOverlay.getDesignTimeMetadata();

            // determine target relevantContainer
            var vTargetRelevantContainerAfterMove = MetadataPropagationUtil.getRelevantContainerForPropagation(oAggregationDtMetadata.getData(), oMovedElement);
            vTargetRelevantContainerAfterMove = vTargetRelevantContainerAfterMove ? vTargetRelevantContainerAfterMove : oTargetElement;

            // check for same relevantContainer
            if (
                !oMovedRelevantContainer
                || !vTargetRelevantContainerAfterMove
                || !Plugin.prototype.hasStableId(oTargetOverlay)
                || oMovedRelevantContainer !== vTargetRelevantContainerAfterMove
            ) {
                return false;
            }

            // Binding context is not relevant if the element is being moved inside its parent
            if (oMovedOverlay.getParent().getElement() !== oTargetElement) {
                // check if binding context is the same
                var aBindings = BindingsExtractor.getBindings(oMovedElement, oMovedElement.getModel());
                if (Object.keys(aBindings).length > 0 && oMovedElement.getBindingContext() && oTargetElement.getBindingContext()) {
                    var sMovedElementBindingContext = Utils.getEntityTypeByPath(
                        oMovedElement.getModel(),
                        oMovedElement.getBindingContext().getPath()
                    );
                    var sTargetElementBindingContext = Utils.getEntityTypeByPath(
                        oTargetElement.getModel(),
                        oTargetElement.getBindingContext().getPath()
                    );
                    if (!(sMovedElementBindingContext === sTargetElementBindingContext)) {
                        return false;
                    }
                }
            }

            return true;
        };

        return {
            name: {
                singular: oResourceBundle.getText("Card"),
                plural: oResourceBundle.getText("Cards")
            },
            actions: {
                remove: {
                    name: oResourceBundle.getText("OVP_KEYUSER_MENU_HIDE_CARD") ,
                    changeType: "hideCardContainer",
                    changeOnRelevantContainer: true
                },
                reveal: {
                    changeType: "unhideCardContainer",
                    changeOnRelevantContainer: true,
                    getLabel: function (oControl) {
                        var sCardId = this._getCardId(oControl.getId()),
                            oComponentData = this._getCardFromManifest(sCardId);
                        if (oComponentData) {
                            var cardSettings = oComponentData.settings;
                            if (cardSettings.title) {
                                return cardSettings.title;
                            } else if (cardSettings.category) {
                                return (cardSettings.category);
                            } else if (cardSettings.subTitle) {
                                return cardSettings.subTitle;
                            }
                            return oComponentData.cardId;
                        } else {
                            jQuery.sap.log.error("Card id " + sCardId + " is not present in the manifest");
                            return "";
                        }
                    }.bind(oAppMain)
                },
                settings: function () {
                    return {
                        "Cut": {
                            icon: "sap-icon://scissors",
                            name: oResourceBundle.getText("OVP_KEYUSER_MENU_CUT_CARD"),
                            isEnabled: function (oSelectedElement) {
                                oDesignTime = this.getDesignTime();
                                return this.getSelectedOverlays().length === 1;
                            },
                            changeOnRelevantContainer: true,
                            handler: function (oSelectedElement, fGetUnsavedChanges) {
                                var oOverlay = OverlayRegistry.getOverlay(oSelectedElement),
                                    oCutOverlay = oElementMover.getMovedOverlay();
                                if (oCutOverlay) {
                                    oCutOverlay.removeStyleClass("sapUiDtOverlayCutted");
                                    oElementMover.setMovedOverlay(null);
                                    oElementMover.deactivateAllTargetZones(oDesignTime);
                                }

                                oElementMover.setMovedOverlay(oOverlay);
                                oOverlay.addStyleClass("sapUiDtOverlayCutted");

                                oElementMover.activateAllValidTargetZones(oDesignTime);
                                return Promise.resolve([]).then(function () {
                                    return [];
                                });
                            }
                        },
                        "Paste": {
                            icon: "sap-icon://paste",
                            name: oResourceBundle.getText("OVP_KEYUSER_MENU_PASTE_CARD"),
                            isEnabled: function (oSelectedElement) {
                                oDesignTime = this.getDesignTime();
                                var oOverlay = OverlayRegistry.getOverlay(oSelectedElement),
                                    oTargetZoneAggregation = _getTargetZoneAggregation(oOverlay);
                                return (oTargetZoneAggregation) || (OverlayUtil.isInTargetZoneAggregation(oOverlay));
                            },
                            changeOnRelevantContainer: true,
                            handler: function (oSelectedElement, fGetUnsavedChanges) {
                                var oOverlay = OverlayRegistry.getOverlay(oSelectedElement),
                                    oCutOverlay = oElementMover.getMovedOverlay();

                                if (oCutOverlay) {
                                    var oMovedElement = oCutOverlay.getElement(),
                                        oTargetElement = oOverlay.getElement(),
                                        oSource = OverlayUtil.getParentInformation(oCutOverlay),
                                        oTarget = OverlayUtil.getParentInformation(oOverlay),
                                        oMainComponent = oSelectedElement.getComponentInstance().getComponentData().mainComponent,
                                        oMainLayout = oMainComponent.getLayout(),
                                        oUIModel = oMainComponent.getUIModel(),
                                        oPayLoadData = {}, oUIData = {}, aChanges = [];

                                    if (oUIModel.getProperty('/containerLayout') === 'resizable') {
                                        var oLayoutModel = oMainLayout.getDashboardLayoutModel(),
                                            sSourceCardId = oMainComponent._getCardId(oMovedElement.getId()),
                                            sTargetCardId = oMainComponent._getCardId(oSelectedElement.getId()),
                                            oSourceCardObj = oLayoutModel.getCardById(sSourceCardId),
                                            oTargetCardObj = oLayoutModel.getCardById(sTargetCardId),
                                            iColumnCount = oLayoutModel.getColCount(),
                                            sLayoutKey = 'C' + iColumnCount,
                                            affectedCards = [];

                                        oPayLoadData.cardId = sSourceCardId;
                                        oPayLoadData.dashboardLayout = {};
                                        oPayLoadData.dashboardLayout[sLayoutKey] = {
                                            row: oTargetCardObj.dashboardLayout.row,
                                            oldRow: oSourceCardObj.dashboardLayout.row,
                                            column: oTargetCardObj.dashboardLayout.column,
                                            oldColumn: oSourceCardObj.dashboardLayout.column
                                        };
                                        //If the moved card can not be into the new position(going out of layout) then save the colSpan/rowSpan
                                        if (oTargetCardObj.dashboardLayout.column + oSourceCardObj.dashboardLayout.colSpan > iColumnCount + 1) {
                                            oPayLoadData.dashboardLayout[sLayoutKey].colSpan = oTargetCardObj.dashboardLayout.colSpan;
                                            oPayLoadData.dashboardLayout[sLayoutKey].oldColSpan = oSourceCardObj.dashboardLayout.colSpan;
                                            oPayLoadData.dashboardLayout[sLayoutKey].rowSpan = oSourceCardObj.dashboardLayout.rowSpan;
                                            oPayLoadData.dashboardLayout[sLayoutKey].oldRowSpan = oSourceCardObj.dashboardLayout.rowSpan;
                                        }
                                        aChanges.push({
                                            selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                                            changeSpecificData: {
                                                changeType: "dragOrResize",
                                                content: oPayLoadData
                                            }
                                        });
                                        aChanges.push({
                                            selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                                            changeSpecificData: {
                                                runtimeOnly: true, //UI change would be used only at runtime to modify the app; it will not be persisted
                                                changeType: "dragAndDropUI",
                                                content: oPayLoadData
                                            }
                                        });
                                        oLayoutModel._arrangeCards(oSourceCardObj, {
                                            row: oTargetCardObj.dashboardLayout.row,
                                            column: oTargetCardObj.dashboardLayout.column
                                        }, 'drag', affectedCards);
                                        oLayoutModel._removeSpaceBeforeCard(affectedCards);
                                        affectedCards.forEach(function (item) {
                                            var obj = {};
                                            obj.dashboardLayout = {};
                                            obj.cardId = item.content.cardId;
                                            obj.dashboardLayout[sLayoutKey] = item.content.dashboardLayout;
                                            aChanges.push({
                                                selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                                                changeSpecificData: {
                                                    changeType: "dragOrResize",
                                                    content: obj
                                                }
                                            });
                                        });
                                    } else {
                                        /**
                                         *  Only in case of Fixed Layout
                                         *  Removing all the hidden cards to get correct position
                                         *  and old position of the card being moved
                                         */
                                        var aVisibleContent = oTarget.parent.getContent().filter(function (oCard) {
                                            return oCard.getVisible();
                                        });
                                        oPayLoadData = {
                                            cardId: oMainComponent._getCardId(oMovedElement.getId()),
                                            position: aVisibleContent.indexOf(oTargetElement),
                                            oldPosition: aVisibleContent.indexOf(oMovedElement)
                                        };
                                        aChanges.push({
                                            selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                                            changeSpecificData: {
                                                changeType: "position",
                                                content: oPayLoadData
                                            }
                                        });

                                        /**
                                         *  Only in case of Fixed Layout
                                         *  For UI Changes we need to get index for position
                                         *  and old position from the array of cards including
                                         *  all the hidden cards
                                         */
                                        oUIData = {
                                            cardId: oMainComponent._getCardId(oMovedElement.getId()),
                                            position: oTarget.index,
                                            oldPosition: oSource.index
                                        };
                                        aChanges.push({
                                            selectorControl: oSelectedElement.getComponentInstance().getComponentData().appComponent.getRootControl().getController().getLayout(),
                                            changeSpecificData: {
                                                runtimeOnly: true, //UI change would be used only at runtime to modify the app; it will not be persisted
                                                changeType: "dragAndDropUI",
                                                content: oUIData
                                            }
                                        });
                                    }
                                }

                                _executePaste(oOverlay);

                                /*this.fireElementModified({
                                    "command" : this.getElementMover().buildMoveCommand()
                                });*/

                                if (oCutOverlay) {
                                    oCutOverlay.removeStyleClass("sapUiDtOverlayCutted");
                                    oElementMover.setMovedOverlay(null);
                                    oElementMover.deactivateAllTargetZones(oDesignTime);

                                    return Promise.resolve(aChanges).then(function (aLayoutChanges) {
                                        return aLayoutChanges;
                                    });
                                }
                            }
                        },
                        "EditCard": {
                            icon: "sap-icon://edit",
                            name: oResourceBundle.getText("OVP_KEYUSER_MENU_EDIT_CARD"),
                            isEnabled: function (oSelectedElement) {
                                return true;
                            },
                            changeOnRelevantContainer: true,
                            handler: SettingsUtils.fnEditCardHandler
                        },
                        "CloneCard": {
                            icon: "sap-icon://value-help",
                            name: oResourceBundle.getText("OVP_KEYUSER_MENU_CLONE_CARD"),
                            isEnabled: function (oSelectedElement) {
                                return true;
                            },
                            handler: SettingsUtils.fnCloneCardHandler
                        },
                        "AddStaticLinkListCard": {
                            icon: "sap-icon://form",
                            name: oResourceBundle.getText("OVP_KEYUSER_MENU_CREATE_LINK_LIST_CARD"),
                            isEnabled: function (oSelectedElement) {
                                return true;
                            },
                            handler: SettingsUtils.fnAddStaticLinkListCardHandler
                        }
                    };
                }
            }
        };
    },
    /* bExport= */true);
