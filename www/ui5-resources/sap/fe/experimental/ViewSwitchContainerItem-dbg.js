/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define([
	"sap/ui/core/Control"
], function (Control) {
	"use strict";

	var ViewSwitchContainerItem = Control.extend("sap.fe.ViewSwitchContainerItem", {
		metadata: {
			designtime: "sap/ui/mdc/designtime/ViewSwitchContainerItem.designtime",
			properties: {
                iconurl: {
					type: "string"
				},
				toolbarId: {
					type: "string"
				}

			},
			events: {},
			aggregations: {
				content: {
					type: "sap.ui.core.Control",
					multiple: false,
					singularName: "content"
				}
			},
			publicMethods: []
		},
		renderer: {
			render: function(oRm,oControl){
                var oContentControl = oControl.getContent();
				oRm.write("<div");       
				oRm.writeControlData(oControl);
				oRm.write(">");
				oRm.renderControl(oContentControl);    
				oRm.write("</div>");
			}
		}
    });
    
	return ViewSwitchContainerItem;

}, /* bExport= */true);