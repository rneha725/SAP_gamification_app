sap.ui.define(["sap/ovp/cards/generic/Component", "jquery.sap.global", "sap/ovp/cards/charts/SmartAnnotationManager"],

    function (CardComponent, jQuery, SmartAnnotationManager) {
        "use strict";
        /*global jQuery, sap */

        return CardComponent.extend("sap.ovp.cards.charts.smart.chart.Component", {
            // use inline declaration instead of component.json to save 1 round trip
            metadata: {
                properties: {
                    "headerExtensionFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.generic.KPIHeader"
                    },
                    "contentFragment": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.charts.smart.chart.analyticalChart"
                    },
                    "controllerName": {
                        "type": "string",
                        "defaultValue": "sap.ovp.cards.charts.smart.chart.analyticalChart"
                    }
                },

                version: "@version@",

                library: "sap.ovp",

                includes: [],

                dependencies: {
                    libs: ["sap.m", "sap.viz", "sap.ui.comp"],
                    components: []
                },
                config: {}
            },

            onAfterRendering: function () {
                jQuery(".tabindex0").attr("tabindex", 0);
                jQuery(".tabindex-1").attr("tabindex", -1);
            }
        });
    }
);
