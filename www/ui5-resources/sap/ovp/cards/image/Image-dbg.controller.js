sap.ui.define(["sap/ovp/cards/generic/Card.controller", "jquery.sap.global"],

    function (CardController, jQuery) {
        "use strict";
        /*global sap, jQuery */

        return CardController.extend("sap.ovp.cards.image.Image", {
            onInit: function () {
                //The base controller lifecycle methods are not called by default, so they have to be called
                //Take reference from function mixinControllerDefinition in sap/ui/core/mvc/Controller.js
                CardController.prototype.onInit.apply(this, arguments);
            },

            onImagePress: function (oEvent) {
                this.doNavigation(oEvent.getSource().getBindingContext());
            }

        });
    }
);
