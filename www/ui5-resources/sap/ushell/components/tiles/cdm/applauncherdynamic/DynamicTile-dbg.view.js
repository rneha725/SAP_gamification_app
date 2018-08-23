// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

sap.ui.define([
    'sap/m/GenericTile',
    'sap/m/TileContent',
    'sap/m/NumericContent'
    ], function(GenericTile, TileContent, NumericContent) {
	"use strict";

    sap.ui.jsview("sap.ushell.components.tiles.cdm.applauncherdynamic.DynamicTile", {
        getControllerName: function () {
            return "sap.ushell.components.tiles.cdm.applauncherdynamic.DynamicTile";
        },
        createContent: function (oController) {
            this.setHeight('100%');
            this.setWidth('100%');

            return new GenericTile({
                size:       'Auto',
                header:     '{/properties/title}',
                subheader:  '{/properties/subtitle}',
                tileContent: [new TileContent({
                    size: 'Auto',
                    footer: '{/properties/info}',
                    footerColor:  {
                        path: "/data/display_info_state",
                        formatter: function (sFootterColor){
                            if (!sap.m.ValueColor[sFootterColor]) {
                                sFootterColor = sap.m.ValueColor.Neutral;
                            }
                            return sFootterColor;
                        }
                    },
                    unit:   '{/properties/number_unit}',
                    sizeBehavior : '{/properties/sizeBehavior}',
                    content: [new NumericContent({
                        truncateValueTo: 5,//Otherwise, The default value is 4.
                        scale:      '{/properties/number_factor}',
                        value:      '{/properties/number_value}',
                        indicator:  '{/properties/number_state_arrow}',
                        valueColor: {
                            path: "/data/display_number_state",
                            formatter: function (sValueColor){
                                if (!sap.m.ValueColor[sValueColor]) {
                                    sValueColor = sap.m.ValueColor.Neutral;
                                }
                                return sValueColor;
                            }
                        },
                        icon:       '{/properties/icon}',
                        width: '100%'
                    })]
                })],
                press : [ oController.onPress, oController ]
            });
        }

    });


}, /* bExport= */ true);
