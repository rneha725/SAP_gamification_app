sap.ui.define(["sap/ovp/cards/generic/Component", "jquery.sap.global"],
    function (CardComponent, jQuery) {
        "use strict";

        return CardComponent.extend("sap.ovp.cards.stack.Component", {
            // use inline declaration instead of component.json to save 1 round trip
            metadata: {
                properties: {
                    "contentFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.stack.Stack"
                    },
                    "controllerName": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.stack.Stack"
                    },
                    "contentPosition": {
                        "type": "string",
                        "defaultValue": "Right"
                    },
                    "objectStreamCardsSettings": {
                        "type": "object",
                        "defaultValue": {}
                    },
                    "objectStreamCardsTemplate": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.quickview"
                    },
                    "objectStreamCardsNavigationProperty": {
                        "type": "string"
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
