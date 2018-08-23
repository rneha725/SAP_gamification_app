sap.ui.define(["sap/ovp/cards/generic/Card.controller"],

    function (CardController) {
        "use strict";

        return CardController.extend("sap.ovp.cards.error.Error", {

            onInit: function () {
                //The base controller lifecycle methods are not called by default, so they have to be called
                //Take reference from function mixinControllerDefinition in sap/ui/core/mvc/Controller.js
                CardController.prototype.onInit.apply(this, arguments);
            },

            adjustCardSize: function () {
                var oCard = this.oDashboardLayoutUtil.dashboardLayoutModel.getCardById(this.cardId);
                if (oCard.template !== "sap.ovp.cards.stack") {
                    var oLayout = this.oMainComponent && this.oMainComponent.getLayout();
                    var oDashboardLayoutUtil = oLayout.getDashboardLayoutUtil();
                    var sCardDomId = oDashboardLayoutUtil.getCardDomId(this.sCardId);
                    var oDomCard = document.getElementById(sCardDomId);
                    var iHeaderHeight = this.getHeaderHeight();
                    oDomCard.getElementsByClassName("contentOfError")[0].style.height =
                        oDomCard.getElementsByClassName("sapOvpCardContentContainer")[0].style.height =
                            (oCard.dashboardLayout.rowSpan * this.oDashboardLayoutUtil.ROW_HEIGHT_PX) - (iHeaderHeight + 2 * this.oDashboardLayoutUtil.CARD_BORDER_PX) + "px";
                }
            },

            onAfterRendering: function () {
                if (this.oMainComponent.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                    CardController.prototype.onAfterRendering.apply(this, arguments);
                    this.adjustCardSize();
                }
            },

            /**
             * Method called upon card resize
             */
            resizeCard: function () {
                try {
                    this.adjustCardSize();
                } catch (error) {
                    jQuery.sap.log.warning("OVP resize: " + this.cardId + " catch " + error.toString());
                }
            }
        });
    });
