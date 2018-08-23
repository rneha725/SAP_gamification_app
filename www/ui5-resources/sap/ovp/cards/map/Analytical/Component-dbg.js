sap.ui.define(["sap/ovp/cards/generic/Component", "jquery.sap.global"],

    function (CardComponent, jQuery) {
        "use strict";

        return CardComponent.extend("sap.ovp.cards.map.Analytical.Component", {
            // use inline declaration instead of component.json to save 1 round trip
            metadata: {
                properties: {
                    "contentFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.map.Analytical.AnalyticalMap"
                    },
                    "controllerName": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.map.Analytical.AnalyticalMap"
                    },
                    "dataPointAnnotationPath": {
                        "type": "string",
                        "defaultValue": "com.sap.vocabularies.UI.v1.DataPoint"
                    }
                },

                version: "1.56.5",

                library: "sap.ovp",

                includes: [],

                dependencies: {
                    libs: ["sap.ui.vbm"],
                    components: []
                },
                config: {}
            }
        });
    }
);