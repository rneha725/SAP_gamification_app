/*
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

sap.ui.define([
	"jquery.sap.global",
	"sap/ui/comp/smartfield/type/TextArrangement",
	"sap/ui/comp/smartfield/type/Guid",
	"sap/ui/model/ValidateException"
], function(jQuery, TextArrangementType, GuidType, ValidateException) {
	"use strict";

	var TextArrangementGuid = TextArrangementType.extend("sap.ui.comp.smartfield.type.TextArrangementGuid", {
		constructor: function(oFormatOptions, oConstraints, oSettings) {
			TextArrangementType.apply(this, arguments);
		}
	});

	TextArrangementGuid.prototype.preParseDescriptionOnly = function(vValue, sSourceType, aCurrentValues, oFormatOptions) {
		var vParsedValue = GuidType.prototype.parseValue.call(this, vValue, sSourceType);

		if (isGuid(vParsedValue)) {
			return [vParsedValue, undefined];
		}

		return [vValue.trim(), undefined];
	};

	TextArrangementGuid.prototype.parseDescriptionOnly = function(vValue, sSourceType, aCurrentValues, oSettings) {

		if (isGuid(vValue)) {

			if (oSettings.data.length === 1) {
				this.sDescription = oSettings.data[0][oSettings.valueListAnnotation.descriptionField];
				return [vValue, undefined];
			}

			if (oSettings.data.length === 0) {
				throw new ValidateException(sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("SMARTFIELD_NOT_FOUND"));
			}

			jQuery.sap.assert(false, "Duplicate GUID");
		} else {
			return TextArrangementType.prototype.parseDescriptionOnly.apply(this, arguments);
		}
	};

	TextArrangementGuid.prototype.onBeforeValidateValue = function(vValue, oFormatOptions, aFilterFields) {

		if ((oFormatOptions.textArrangement === "descriptionOnly") && !isGuid(vValue)) {
			aFilterFields = ["descriptionField"];
		}

		this.oSettings.onBeforeValidateValue(vValue, aFilterFields);
	};

	TextArrangementGuid.prototype.getName = function() {
		return "sap.ui.comp.smartfield.type.TextArrangementGuid";
	};

	TextArrangementGuid.prototype.getPrimaryType = function() {
		return GuidType;
	};

	function isGuid(vValue) {
		var rGuid = /^[A-F0-9]{8}-([A-F0-9]{4}-){3}[A-F0-9]{12}$/i;
		return rGuid.test(vValue);
	}

	return TextArrangementGuid;
});
