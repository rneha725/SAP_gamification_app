sap.ui.define(["sap/ovp/cards/generic/Component", "jquery.sap.global"],
    function (CardComponent, jQuery) {

        return CardComponent.extend("sap.ovp.cards.table.Component", {
            // use inline declaration instead of component.json to save 1 round trip
            metadata: {
                properties: {
                    "contentFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.table.Table"
                    },
                    "controllerName": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.table.Table"
                    },
                    "annotationPath": {
                        "type": "string",
                        "defaultValue": "com.sap.vocabularies.UI.v1.LineItem"
                    },
                    "countHeaderFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.generic.CountHeader"
                    },
                    "headerExtensionFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.generic.KPIHeader"
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

