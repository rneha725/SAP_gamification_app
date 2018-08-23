/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/mdc/Field"
], function (Control) {
	"use strict";

	var Column = Control.extend("sap.ui.mdc.Column", {
		metadata: {
			designtime: "sap/ui/mdc/designtime/Column.designtime",
			properties: {
				sortProperty: {
					type: "string"
				},
				label: {
					type: "string"
				},
				hAlign: {
					type: "sap.ui.core.TextAlign",
					defaultValue: sap.ui.core.TextAlign.Begin
				}
			},
			events: {},
			aggregations: {
				items: {
					type: "sap.ui.core.Control",
					multiple: true,
					singularName: "item"
				}
			},
			publicMethods: []
		}
	});
	return Column;

}, /* bExport= */true);