sap.ui.define(["sap/ovp/cards/generic/Component", "jquery.sap.global"],

    function (CardComponent, jQuery) {
        "use strict";

        return CardComponent.extend("sap.ovp.cards.map.Component", {
            // use inline declaration instead of component.json to save 1 round trip
            metadata: {
                properties: {
                    "contentFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.map.GeographicalMap"
                    },
                    "controllerName": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.map.GeographicalMap"
                    },
                    "geoLocationAnnotationPath": {
                        "type": "string",
                        "defaultValue": "com.sap.vocabularies.UI.v1.GeoLocation"
                    },
                    "annotationPath": {
                        "type": "string",
                        "defaultValue": "com.sap.vocabularies.UI.v1.Facets"
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