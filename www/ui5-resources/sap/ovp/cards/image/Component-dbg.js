sap.ui.define(["sap/ovp/cards/generic/Component", "jquery.sap.global"],

    function (CardComponent, jQuery) {
        "use strict";

        return CardComponent.extend("sap.ovp.cards.image.Component", {
            // use inline declaration instead of component.json to save 1 round trip
            metadata: {
                properties: {
                    "contentFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.image.Image"
                    },
                    "controllerName": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.image.Image"
                    }
                },

                version: "1.56.5",

                library: "sap.ovp",

                includes: [],

                dependencies: {
                    libs: [],
                    components: []
                },
                config: {}
            }
        });
    }
);
