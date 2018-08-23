sap.ui.define(["sap/ui/core/Control", "jquery.sap.global",
        "sap/ui/Device", "sap/ui/core/ResizeHandler"],
    function (Control, jQuery, Device, ResizeHandler) {
        "use strict";

        var DashboardLayout = Control.extend("sap.ovp.ui.DashboardLayout", {

            metadata: {
                designTime: true,
                library: "sap.ovp",
                aggregations: {
                    content: {
                        type: "sap.ui.core.Control",
                        multiple: true,
                        singularName: "content"
                    }
                },
                defaultAggregation: "content",
                events: {
                    afterRendering: {},
                    afterDragEnds: {}
                },
                properties: {
                    dragAndDropRootSelector: {
                        group: "Misc",
                        type: "string"
                    },
                    dragAndDropEnabled: {
                        group: "Misc",
                        type: "boolean",
                        defaultValue: true
                    },
                    debounceTime: {
                        group: "Misc",
                        type: "int",
                        defaultValue: 150
                    }
                }
            },

            renderer: {

                render: function (oRm, oControl) {
                    // get viewport width depending layout data
                    var ctrlWidth = oControl.$().width();
                    var bRTL = sap.ui.getCore().getConfiguration().getRTL();
                    var oLayoutData = oControl.dashboardLayoutUtil.updateLayoutData(ctrlWidth ? ctrlWidth : jQuery(window).width());
                    var aCards = oControl.dashboardLayoutUtil.getCards(oLayoutData.colCount);

                    function filterVisibleCards(element) {
                        return element.getVisible();
                    }

                    function filterById(element) {
                        return element.id === this.getId().split("--")[1];
                    }

                    var filteredItems = oControl.getContent().filter(filterVisibleCards);
                    oRm.write("<div");
                    oRm.writeControlData(oControl);
                    oRm.addClass("sapUshellEasyScanLayout");
                    if (!Device.system.phone) {
                        oRm.addClass("sapOvpDashboardDragAndDrop");
                    }
                    oRm.addClass("sapOvpDashboard");
                    oRm.writeClasses();
                    bRTL ? oRm.addStyle("margin-right", oLayoutData.marginPx + "px") : oRm.addStyle("margin-left", oLayoutData.marginPx + "px");
                    oRm.writeStyles();
                    oRm.write(">");
                    oRm.write("<div class='sapUshellEasyScanLayoutInner'>");

                    if (aCards.length > 0) {
                        var card = {}, counter, iLength, bSideCard,
                            colCount = oControl.getDashboardLayoutModel().getColCount();

                        for (counter = 0, iLength = filteredItems.length; counter < iLength; counter++) {
                            var aStyleClasses = ['easyScanLayoutItemWrapper', 'sapOvpDashboardLayoutItem'];
                            card = aCards.filter(filterById.bind(filteredItems[counter]))[0];
                            //re-set css values for current card
                            oControl.dashboardLayoutUtil.setCardCssValues(card);
                            bSideCard = card.dashboardLayout.column + card.dashboardLayout.colSpan === colCount + 1;
                            if (bSideCard) {
                                card.dashboardLayout.colSpan === 1 ? aStyleClasses.push('sapOvpNotResizableLeftRight') : aStyleClasses.push('sapOvpNotResizableRight');
                            }
                            if (card.template === 'sap.ovp.cards.stack' || card.settings.stopResizing || !Device.system.desktop) {
                                aStyleClasses.push('sapOvpDashboardLayoutItemNoDragIcon');
                            }

                            oRm.write("<div id='" + oControl.dashboardLayoutUtil.getCardDomId(card.id) +
                            "' class='" + aStyleClasses.join(' ') + "' style='" +
                            "; transform:translate3d(" + card.dashboardLayout.left + " ," + card.dashboardLayout.top + " ,0px)" +
                            "; -ms-transform:translate3d(" + card.dashboardLayout.left + " ," + card.dashboardLayout.top + " ,0px)" +
                            "; -moz-transform:translate3d(" + card.dashboardLayout.left + " ," + card.dashboardLayout.top + " ,0px)" +
                            "; -webkit-transform:translate3d(" + card.dashboardLayout.left + " ," + card.dashboardLayout.top + " ,0px)" +
                            "; height:" + card.dashboardLayout.height + "; width:" + card.dashboardLayout.width + ";'" +
                            " tabindex='0'; aria-setsize=" + iLength + " aria-posinset=" + counter + ">");

                            oRm.renderControl(filteredItems[counter]);
                            oRm.write("</div>");
                        }
                    }

                    oRm.write("</div>");
                    // dummy after focusable area
                    oRm.write("<div class='after' tabindex='0'></div>");
                    oRm.write("</div>");
                }
            },

            init: function () {
                this.oColumnLayoutData = {};
                this.resizeHandlerId = this.initResizeHandler();

                var oComponent = sap.ui.getCore().getComponent(this._sOwnerId);
                this.dashboardLayoutUtil = oComponent.getDashboardLayoutUtil();
                this.dashboardLayoutUtil.setLayout(this);
            },

            exit: function () {
                //de-register event handler
                if (this.resizeHandlerId) {
                    ResizeHandler.deregister(this.resizeHandlerId);
                }
                //delete rearrange instance (incl. its ui actions)
                if (this.layoutDragAndDrop) {
                    this.layoutDragAndDrop.destroy();
                    delete this.layoutDragAndDrop;
                }
            },

            onBeforeRendering: function () {
            },

            onAfterRendering: function () {
                this.keyboardNavigation = new KeyboardNavigation(this);
                if (!this.getDragAndDropRootSelector()) {
                    this.setDragAndDropRootSelector("#" + this.getId());
                }
                if (this.layoutDragAndDrop) {
                    this.layoutDragAndDrop.destroy();
                }
                if (this.getDragAndDropEnabled()) {

                    this.layoutDragAndDrop = this.dashboardLayoutUtil.getRearrange({
                        rootSelector: this.getDragAndDropRootSelector(),
                        layout: this
                    });

                    this.fireAfterRendering();
                }
            },

            /**
             * get the DashboardLayout variants in JSON format
             * @method getLayoutVariantsJSON
             * @returns {Object} JSON containing the layout variants
             */
            getLayoutDataJSON: function () {
                //JSON.stringify(...?
                return this.dashboardLayoutUtil.getDashboardLayoutModel().getLayoutVariants4Pers();
            },

            filterVisibleCards: function (element) {
                return element.getVisible();
            },

            getDashboardLayoutUtil: function () {
                return this.dashboardLayoutUtil;
            },

            getDashboardLayoutModel: function () {
                return this.dashboardLayoutUtil.getDashboardLayoutModel();
            },

            getVisibleLayoutItems: function () {
                //layout items could be hidden, so we filter them and receive only visible
                var content = this.getContent();
                var filteredItems = content.filter(this.filterVisibleCards);
                return filteredItems;
            },

            initResizeHandler: function () {
                var resizeHandlerTimerId;
                var debounceTime = this.getDebounceTime();
                var resizeHandlerDebounce = function (evt) {
                    window.clearTimeout(resizeHandlerTimerId);
                    resizeHandlerTimerId = window.setTimeout(this.oControl.resizeHandler.bind(this, evt), debounceTime);
                };

                return ResizeHandler.register(this, resizeHandlerDebounce);
            },

            resizeHandler: function (evt) {
                this.oControl.dashboardLayoutUtil.resizeLayout(evt.size.width);
            },

            setActive: function (bSetActive) {
                if (bSetActive) {
                    this.removeStyleClass("ovpOverlay");
                } else {
                    this.addStyleClass("ovpOverlay");
                }
            },

            getActive: function () {
                return !this.hasStyleClass("ovpOverlay");
            }
        });

        var KeyboardNavigation = function (ovpLayout) {
            this.init(ovpLayout);
        };

        KeyboardNavigation.prototype.init = function (ovpLayout) {
            this.layoutUtil = ovpLayout.getDashboardLayoutUtil();
            this.layoutModel = ovpLayout.getDashboardLayoutModel();
            this.keyCodes = jQuery.sap.KeyCodes;
            this.jqElement = ovpLayout.$();
            this.bIgnoreSelfFocus = false;
            this.jqElement.on('keydown', this.keyDownHandler.bind(this));
        };

        KeyboardNavigation.prototype.ctrlArrowHandler = function (oCard, cardId) {
            var oOtherCard = this.layoutUtil.dashboardLayoutModel.getCardById(cardId),
                newRow = oOtherCard.dashboardLayout.row,
                newColumn = oOtherCard.dashboardLayout.column,
                affectedCards = [];
            affectedCards.push({
                changeType: 'dragOrResize',
                content: {
                    cardId: oCard.id,
                    dashboardLayout: {
                        row: newRow,
                        oldRow: oCard.dashboardLayout.row,
                        column: newColumn,
                        oldColumn: oCard.dashboardLayout.column
                    }
                },
                isUserDependent: true
            });

            this.layoutUtil.dashboardLayoutModel._arrangeCards(oCard, {
                row: newRow,
                column: newColumn
            }, 'drag', affectedCards);
            this.layoutUtil.dashboardLayoutModel._removeSpaceBeforeCard(affectedCards);
            this.layoutUtil._positionCards(this.layoutModel.aCards);
            this.layoutUtil.oLayoutCtrl.fireAfterDragEnds({positionChanges: affectedCards});
        };

        // Key Down Handler
        KeyboardNavigation.prototype.keyDownHandler = function (e) {
            var activeItem = document.activeElement,
                sCardId = this.layoutUtil.getCardId(activeItem.id),
                aCards = jQuery.extend([], this.layoutModel.aCards),
                oCard = this.layoutModel.getCardById(sCardId),
                columnCount = this.layoutModel.iColCount,
                tempCards = {}, column, colSpan, columnIndex, rowIndex, cardId, cardsLength, currentCard;
            this.layoutModel._sortCardsByRow(aCards);
            for (var i = 1; i <= columnCount; i++) {
                tempCards[i] = [];
            }
            for (var j = 0; j < aCards.length; j++) {
                column = aCards[j].dashboardLayout.column;
                colSpan = aCards[j].dashboardLayout.colSpan;
                if (colSpan === 1) {
                    tempCards[column].push(aCards[j]);
                } else {
                    for (var k = column; k < column + colSpan; k++) {
                        tempCards[k].push(aCards[j]);
                    }
                }
            }
            rowIndex = this.getCardPosition(sCardId, tempCards[oCard.dashboardLayout.column]);
            switch (e.keyCode) {
                case this.keyCodes.F6:
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.bIgnoreSelfFocus = true;
                        this.jqElement.find(".sapUshellEasyScanLayoutInner").focus();
                        jQuery.sap.handleF6GroupNavigation(e);
                    } else {
                        this.bIgnoreSelfFocus = true;
                        var beforeScrollLocation = this.jqElement.scrollTop();
                        this.jqElement.find(".after").focus();
                        jQuery.sap.handleF6GroupNavigation(e);
                        this.jqElement.scrollTop(beforeScrollLocation);
                    }
                    break;
                case this.keyCodes.F7:
                    e.preventDefault();
                    //If focus is on a Item, move focus to the control inside the Item. Default: first control in the tab chain inside the Item.
                    //If focus is on a control inside a Item, move focus to the Item.
                    var jqFocusedElement = jQuery(document.activeElement);
                    if (jqFocusedElement.hasClass("easyScanLayoutItemWrapper")) {
                        //focus on item we place on first element inside
                        jqFocusedElement.find(":sapTabbable").first().focus();
                    } else {
                        //focus inside item, we put it on item itself
                        jqFocusedElement.closest(".easyScanLayoutItemWrapper").focus();
                    }
                    break;
                case this.keyCodes.ARROW_UP:
                    e.preventDefault();
                    columnIndex = oCard.dashboardLayout.column;
                    rowIndex--;
                    cardId = tempCards[columnIndex][rowIndex] && tempCards[columnIndex][rowIndex].id;
                    if (e.ctrlKey) {
                        this.ctrlArrowHandler(oCard, cardId);
                        this.setFocusOnCard(sCardId);
                    } else {
                        this.setFocusOnCard(cardId);
                    }
                    break;
                case this.keyCodes.ARROW_DOWN:
                    e.preventDefault();
                    columnIndex = oCard.dashboardLayout.column;
                    rowIndex++;
                    cardId = tempCards[columnIndex][rowIndex] && tempCards[columnIndex][rowIndex].id;
                    if (e.ctrlKey) {
                        this.ctrlArrowHandler(oCard, cardId);
                        this.setFocusOnCard(sCardId);
                    } else {
                        this.setFocusOnCard(cardId);
                    }
                    break;
                case this.keyCodes.ARROW_LEFT:
                    e.preventDefault();
                    columnIndex = oCard.dashboardLayout.column;
                    columnIndex--;
                    if (!tempCards[columnIndex] || !tempCards[columnIndex][rowIndex]) {
                        do {
                            if (columnIndex === 0) {
                                columnIndex = columnCount;
                                rowIndex--;
                                break;
                            }
                            if (rowIndex < 0) {
                                break;
                            }
                            columnIndex--;
                        } while (!tempCards[columnIndex] || !tempCards[columnIndex][rowIndex])
                    }
                    cardId = tempCards[columnIndex][rowIndex] && tempCards[columnIndex][rowIndex].id;
                    if (e.ctrlKey) {
                        this.ctrlArrowHandler(oCard, cardId);
                        this.setFocusOnCard(sCardId);
                    } else {
                        this.setFocusOnCard(cardId);
                    }
                    break;
                case this.keyCodes.ARROW_RIGHT:
                    e.preventDefault();
                    columnIndex = oCard.dashboardLayout.column + oCard.dashboardLayout.colSpan;
                    if (!tempCards[columnIndex] || !tempCards[columnIndex][rowIndex]) {
                        do {
                            if (columnIndex > columnCount) {
                                columnIndex = 1;
                                rowIndex++;
                                break;
                            }
                            columnIndex++;
                        } while (!tempCards[columnIndex] || !tempCards[columnIndex][rowIndex])
                    }
                    cardId = tempCards[columnIndex][rowIndex] && tempCards[columnIndex][rowIndex].id;
                    if (e.ctrlKey) {
                        this.ctrlArrowHandler(oCard, cardId);
                        this.setFocusOnCard(sCardId);
                    } else {
                        this.setFocusOnCard(cardId);
                    }
                    break;
                case this.keyCodes.PAGE_UP:
                    e.preventDefault();
                    columnIndex = oCard.dashboardLayout.column;
                    if (e.altKey == true) {
                        (columnIndex === 1) ? rowIndex = 0 : columnIndex = 1;
                        cardId = tempCards[columnIndex][rowIndex] && tempCards[columnIndex][rowIndex].id;
                    } else {
                        cardsLength = tempCards[columnIndex].length - 1;
                        for (var i = cardsLength; i > 0; i--) {
                            currentCard = document.getElementById(this.layoutUtil.getCardDomId(tempCards[columnIndex][i].id));
                            if (currentCard.getBoundingClientRect().bottom < 0) {
                                cardId = tempCards[columnIndex][i].id;
                                break;
                            }
                        }
                        if (!cardId) {
                            cardId = tempCards[columnIndex][0].id;
                        }
                    }
                    this.setFocusOnCard(cardId);
                    break;
                case this.keyCodes.PAGE_DOWN:
                    e.preventDefault();
                    columnIndex = oCard.dashboardLayout.column;
                    if (e.altKey == true) {
                        cardId = (columnIndex + oCard.dashboardLayout.colSpan) > columnCount ? aCards[aCards.length - 1].id : tempCards[columnCount][rowIndex] && tempCards[columnCount][rowIndex].id;
                    } else {
                        var windowHeight = jQuery(window).height();
                        cardsLength = tempCards[columnIndex].length;
                        for (var i = 0; i < cardsLength; i++) {
                            currentCard = document.getElementById(this.layoutUtil.getCardDomId(tempCards[columnIndex][i].id));
                            if (currentCard.getBoundingClientRect().top > windowHeight) {
                                cardId = tempCards[columnIndex][i].id;
                                break;
                            }
                        }
                        if (!cardId) {
                            cardId = tempCards[columnIndex][cardsLength - 1].id;
                        }
                    }
                    this.setFocusOnCard(cardId);
                    break;
                case this.keyCodes.HOME:
                    e.preventDefault();
                    columnIndex = oCard.dashboardLayout.column;
                    if (e.ctrlKey == true) {
                        (rowIndex === 0) ? columnIndex = 1 : rowIndex = 0;
                    } else {
                        (columnIndex === 1) ? rowIndex = 0 : columnIndex = 1;
                    }
                    cardId = tempCards[columnIndex][rowIndex] && tempCards[columnIndex][rowIndex].id;
                    this.setFocusOnCard(cardId);
                    break;
                case this.keyCodes.END:
                    e.preventDefault();
                    columnIndex = oCard.dashboardLayout.column;
                    if (e.ctrlKey == true) {
                        var lastCardInColumn = tempCards[columnIndex].length - 1;
                        cardId = (lastCardInColumn === rowIndex) ? aCards[aCards.length - 1].id : tempCards[columnIndex][lastCardInColumn] && tempCards[columnIndex][lastCardInColumn].id;
                    } else {
                        cardId = (columnIndex + oCard.dashboardLayout.colSpan) > columnCount ? aCards[aCards.length - 1].id : tempCards[columnCount][rowIndex] && tempCards[columnCount][rowIndex].id;
                    }
                    this.setFocusOnCard(cardId);
                    break;
            }
        };

        /**
         * Method to set focus on card
         *
         * @method setFocusOnCard
         * @param {String} cardId - card id on which focus is to be set
         */
        KeyboardNavigation.prototype.setFocusOnCard = function (cardId) {
            if (cardId) {
                var card = document.getElementById(this.layoutUtil.getCardDomId(cardId));
                card && card.focus();
            }
        };

        /**
         * Method to calculate the card position in a array
         *
         * @method getCardPosition
         * @param {String} cardId - card id of card which position is to be determined
         * @param {Array} allCards - card array from which position to be determined
         * @return {Integer} i - position of card in the card array
         */
        KeyboardNavigation.prototype.getCardPosition = function (cardId, allCards) {
            for (var i = 0; i < allCards.length; i++) {
                if (allCards[i].id === cardId) {
                    break;
                }
            }
            return i;
        };

        return DashboardLayout;

    });