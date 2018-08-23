sap.ui.define(["sap/ovp/cards/generic/Component", "jquery.sap.global"],

    function (CardComponent, jQuery) {
        "use strict";

        var oErrorComponent = CardComponent.extend("sap.ovp.cards.error.Component", {
            // use inline declaration instead of component.json to save 1 round trip
            metadata: {
                properties: {
                    "contentFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.error.Error"
                    },
                    "state": {
                        "type": "string",
                        "defaultValue": "Error"
                    },
                    "controllerName": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.error.Error"
                    }
                },

                version: "1.56.5",
                library: "sap.ovp"

            }
        });

        return oErrorComponent;
    });

