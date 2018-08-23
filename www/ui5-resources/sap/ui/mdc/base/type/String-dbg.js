/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"jquery.sap.global",
	"sap/ui/model/type/String",
	"sap/ui/model/FormatException",
	"sap/ui/model/ParseException"
], function(jQuery, String, FormatException, ParseException) {
	"use strict";

	var _String = String.extend("sap.ui.mdc.base.type.String", {
		constructor: function(oFormatOptions, oConstraints) {
			sap.ui.model.type.String.call(this, oFormatOptions, oConstraints);
		}
	});

	_String.prototype.parseValue = function(oValue, sInternalType) {
		if (this.oFormatOptions && this.oFormatOptions.toUpperCase === true) {
			oValue = oValue && oValue.toUpperCase ? oValue.toUpperCase() : oValue;
			arguments[0] = oValue;
		}
		return sap.ui.model.type.String.prototype.parseValue.apply(this, arguments);
	};

	_String.prototype.formatValue = function(sValue, sTargetType) {
		if (this.oFormatOptions && this.oFormatOptions.toUpperCase === true) {
			sValue = sValue && sValue.toUpperCase ? sValue.toUpperCase() : sValue;
			arguments[0] = sValue;
		}
		return sap.ui.model.type.String.prototype.formatValue.apply(this, arguments);
	};

	return _String;
});