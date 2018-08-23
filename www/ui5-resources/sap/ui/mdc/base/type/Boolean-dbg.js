/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"jquery.sap.global",
	"sap/ui/model/type/Boolean",
	"sap/ui/model/FormatException",
	"sap/ui/model/ParseException"
], function(jQuery, Boolean, FormatException, ParseException) {
	"use strict";

	var _Boolean = Boolean.extend("sap.ui.mdc.base.type.Boolean", {
		constructor: function(oFormatOptions, oConstraints) {
			sap.ui.model.type.Boolean.call(this, oFormatOptions, oConstraints);
		}
	});

	_Boolean.prototype.parseValue = function(oValue, sInternalType) {
		switch (this.getPrimitiveType(sInternalType)) {
			case "string":
				if (this.oFormatOptions && oValue === "") {
					return this.oFormatOptions.emptyString;
				}
		}

		return sap.ui.model.type.Boolean.prototype.parseValue.apply(this, arguments);
	};

	return _Boolean;
});