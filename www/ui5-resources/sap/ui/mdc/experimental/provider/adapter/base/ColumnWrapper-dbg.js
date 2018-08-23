/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define([
	"jquery.sap.global", "sap/ui/base/Object"
], function(jQuery, BaseObject) {
	"use strict";

	var ColumnWrapper = BaseObject.extend("sap.ui.mdc.experimental.provider.adapter.base.ColumnWrapper", {

		constructor: function(oField) {
			if (oField) {
				this.switchField(oField);
			}
		},

		switchField: function(oField) {
			this.field = oField;

			//Forward the relevant field properties
			this.key = oField.navigationPath || oField.name;
			this.label = oField.label;
			this.tooltip = oField.tooltip;
			this.path = oField.asPath(this.key);

			if (oField.visible === false) {
				this.visible = false;
			} else {
				this.visible = true;
			}
		}
	});

	return ColumnWrapper;

});