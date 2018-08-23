sap.ui.define(["sap/ovp/cards/generic/Card.controller", "jquery.sap.global", "sap/ovp/cards/LoadingUtils",
        "sap/ovp/cards/loading/State"],

    function (CardController, jQuery, LoadingUtils, LoadingState) {
        "use strict";

        return CardController.extend("sap.ovp.cards.loading.Loading", {

            onInit: function () {
                //The base controller lifecycle methods are not called by default, so they have to be called
                //Take reference from function mixinControllerDefinition in sap/ui/core/mvc/Controller.js
                CardController.prototype.onInit.apply(this, arguments);
            },

            onAfterRendering: function () {
                CardController.prototype.onAfterRendering.apply(this, arguments);
                /*
                 *  If bPageAndCardLoading flag is set to true then it will
                 *  run the page and card loading
                 *  This will be removed in the next wave
                 */
                var oView = this.getView();
                oView.addStyleClass("sapOvpLoadingCard");
                var sState = this.getCardPropertiesModel().getProperty("/state");
                var that = this;
                if (LoadingUtils.bPageAndCardLoading) {
                    if (sState !== LoadingState.ERROR) {
                        var oCanvas = oView.byId("sapOvpLoadingCanvas").getDomRef();
                        var oParent = oCanvas.parentNode;
                        oParent.style.width = '100%';
                        oParent.style.position = 'absolute';
                        oParent.style.top = '0px';
                        var oDiv = oView.byId("ovpCardContentContainer").getDomRef();
                        oDiv.style.position = 'absolute';
                        oDiv.style.zIndex = '-3';

                        LoadingUtils.aCanvas.push(oCanvas);
                        setTimeout(function () {
                            /**
                             * Start of busy indicator earlier before loading cards were redesigned.
                             */
                        }, 6000);
                        setTimeout(function () {
                            LoadingUtils.bAnimationStop = true;
                            that.setErrorState();
                        }, 9000);
                    }
                    setTimeout(function () {
                        if (!LoadingUtils.bAnimationStarted) {
                            LoadingUtils.startAnimation();
                            LoadingUtils.bAnimationStarted = true;
                        }
                    }, 0);
                } else {
                    var loadingFooter = oView.byId("ovpLoadingFooter");
                    if (sState === LoadingState.ERROR) {
                        loadingFooter.setText(sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("cannotLoadCard"));
                    } else {
                        //sState === LoadingState.LOADING
                        setTimeout(function () {
                            loadingFooter.setBusy(true);
                        }, 6000);

                        setTimeout(function () {
                            loadingFooter.setBusy(false);
                            loadingFooter.setText(sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("cannotLoadCard"));
                        }, 9000);
                    }
                }
            }
        });
    });
