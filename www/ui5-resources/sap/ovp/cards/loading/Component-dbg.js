sap.ui.define(["sap/ovp/cards/generic/Component", "sap/ovp/cards/loading/State", "jquery.sap.global"],

    function (CardComponent, LoadingState, jQuery) {
        "use strict";

        var oLoadingComponent = CardComponent.extend("sap.ovp.cards.loading.Component", {
            // use inline declaration instead of component.json to save 1 round trip
            metadata: {
                properties: {
                    "footerFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.loading.LoadingFooter"
                    },
                    "state": {
                        "type": "string",
                        "defaultValue": LoadingState.LOADING
                    },
                    "controllerName": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.loading.Loading"
                    }
                },

                version: "1.56.5",
                library: "sap.ovp"

            }

        });

        return oLoadingComponent;
    });

