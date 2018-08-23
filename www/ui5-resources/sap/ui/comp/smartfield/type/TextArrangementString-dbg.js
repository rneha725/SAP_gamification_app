/*
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

sap.ui.define([
	"sap/ui/comp/smartfield/type/TextArrangement",
	"sap/ui/comp/smartfield/type/String"
], function(TextArrangementType, StringType) {
	"use strict";

	var TextArrangementString = TextArrangementType.extend("sap.ui.comp.smartfield.type.TextArrangementString", {
		constructor: function(oFormatOptions, oConstraints, oSettings) {
			TextArrangementType.apply(this, arguments);
		}
	});

	TextArrangementString.prototype.onBeforeValidateValue = function(vValue, oFormatOptions, aFilterFields) {
		this.oSettings.onBeforeValidateValue(vValue, aFilterFields);
	};

	TextArrangementString.prototype.getName = function() {
		return "sap.ui.comp.smartfield.type.TextArrangementString";
	};

	TextArrangementString.prototype.getPrimaryType = function() {
		return StringType;
	};

	return TextArrangementString;
});
