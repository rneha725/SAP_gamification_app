/*
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

sap.ui.define([
	"jquery.sap.global",
	"sap/ui/model/CompositeType",
	"sap/ui/comp/util/FormatUtil",
	"sap/ui/model/ParseException",
	"sap/ui/model/ValidateException",
	"sap/ui/model/FormatException"
], function(jQuery, CompositeType, FormatUtil, ParseException, ValidateException, FormatException) {
	"use strict";

	var TextArrangement = CompositeType.extend("sap.ui.comp.smartfield.type.TextArrangement", {
		constructor: function(oFormatOptions, oConstraints, oSettings) {
			this.getPrimaryType().call(this, oFormatOptions, oConstraints);
			CompositeType.call(this, oFormatOptions, oConstraints);
			this.init(oFormatOptions, oConstraints, oSettings);
			jQuery.sap.assert(oSettings.valueListAnnotation.valueListEntitySetName, "Missing value for the valueListEntitySetName field in the value list annotation");
			jQuery.sap.assert(oSettings.valueListAnnotation.keyField, "Missing value for the keyField in the value list annotation");
			jQuery.sap.assert(oSettings.valueListAnnotation.descriptionField, "Missing value for the descriptionField in the value list annotation");
		}
	});

	TextArrangement.prototype.init = function(oFormatOptions, oConstraints, oSettings) {
		this.bParseWithValues = true;
		this.oSettings = jQuery.extend({
			data: [],
			valueListAnnotation: null,
			onBeforeValidateValue: jQuery.noop,
			onAfterValidateValue: jQuery.noop
		}, oSettings);
		this.oFormatOptions = jQuery.extend({
			textArrangement: "idOnly"
		}, oFormatOptions);
		this.fnPreParser = this.getValidator({
			textArrangement: this.oFormatOptions.textArrangement,
			prefix: "preParse"
		});
		this.fnParser = this.getValidator({
			textArrangement: this.oFormatOptions.textArrangement,
			prefix: "parse"
		});
		this.fnValidator = this.getValidator({
			textArrangement: this.oFormatOptions.textArrangement,
			prefix: "validate"
		});
		this.bNewDataLoaded = false;
		this.bRawValue = false;
		this.bValueValidated = false;
		this.vRawValue = "";
		this.vRawID = "";
		this.vRawDescription = "";
		this.sDescription = undefined;
	};

	TextArrangement.prototype.parseValue = function(vValue, sSourceType, aCurrentValues) {

		if (vValue === "") {
			return [this.getPrimaryType().prototype.parseValue.call(this, vValue, sSourceType), undefined];
		}

		var sTextArrangement = this.oFormatOptions.textArrangement;

		if (sTextArrangement === "idOnly") {
			return this.parseIDOnly(vValue, sSourceType);
		}

		this.vRawValue = vValue;

		if (!this.bNewDataLoaded) {

			if (typeof this.fnPreParser === "function") {
				var aRawValues = this.fnPreParser.call(this, vValue, sSourceType, aCurrentValues, this.oFormatOptions);
				this.vRawID = aRawValues[0];
				this.vRawDescription = aRawValues[1];
			} else {
				this.vRawID = vValue;
			}

			this.bRawValue = true;

			// return the undefined values to skip the model update
			return [undefined, undefined];
		}

		this.bNewDataLoaded = false;
		this.bRawValue = false;
		return this.fnParser(vValue, sSourceType, aCurrentValues, this.oSettings);
	};

	TextArrangement.prototype.parseIDOnly = function(vValue, sSourceType) {
		return [this.getPrimaryType().prototype.parseValue.call(this, vValue, sSourceType), undefined];
	};

	TextArrangement.prototype.preParseIDAndDescription = function(vValue, sSourceType, aCurrentValues, oFormatOptions) {
		var rTextArrangementFormat = /.*\s\(.*\)/i;

		// if the value format is "ID (description)" or "description (ID)"
		if (rTextArrangementFormat.test(vValue)) {
			var rSeparator = /\s\(/gi;

			// raise a parse exception if the delimiter used to separate the ID from the description is duplicated (delimiter collision problem)
			if (vValue.match(rSeparator).length > 1) {
				throw new ParseException(sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("SMARTFIELD_NOT_FOUND"));
			}

			var aValues = TextArrangement.splitIDAndDescription(vValue, {
				separator: rSeparator,
				textArrangement: oFormatOptions.textArrangement
			});

			aValues[0] = this.getPrimaryType().prototype.parseValue.call(this, aValues[0], sSourceType);
			return aValues;
		}

		vValue = this.getPrimaryType().prototype.parseValue.call(this, vValue, sSourceType);
		return [vValue, undefined];
	};

	TextArrangement.prototype.parseIDAndDescription = function(vValue, sSourceType, aCurrentValues, oSettings) {
		var rTextArrangementFormat = /.*\s\(.*\)/i;

		// if the value format is "ID (description)" or "description (ID)"
		if (rTextArrangementFormat.test(vValue)) {
			vValue = this.preParseIDAndDescription(vValue, sSourceType, this.oFormatOptions)[0];

		// if data loaded
		} else if (oSettings.data.length) {

			// filter for description given the ID
			var aDescription = filterValuesByKey(vValue, {
				key: oSettings.valueListAnnotation.keyField,
				value: oSettings.valueListAnnotation.descriptionField,
				data: oSettings.data
			});

			// if no description is found
			if (aDescription.length === 0) {
				throw new ValidateException(sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("SMARTFIELD_NOT_FOUND"));
			}

			// more descriptions were found for the same ID
			if (aDescription.length > 1) {
				throw new ValidateException(sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("SMARTFIELD_DUPLICATE_VALUES"));
			}

			this.sDescription = aDescription[0];
			return [vValue, undefined];

		} else if (vValue !== "") {
			throw new ValidateException(sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("SMARTFIELD_NOT_FOUND")); // invalid format or value
		}

		return [vValue, undefined];
	};

	TextArrangement.prototype.parseDescriptionOnly = function(vValue, sSourceType, aCurrentValues, oSettings) {
		var sID,
			sKeyField = oSettings.valueListAnnotation.keyField,
			sDescriptionField = oSettings.valueListAnnotation.descriptionField,
			oRB = sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp");

		// filtering in the text/description field first as the textArrangement format option is set to "descriptionOnly"
		var aIDs = filterValuesByKey(vValue, {
			key: sDescriptionField,
			value: sKeyField,
			data: oSettings.data
		});
		var aIDsLength = aIDs.length;

		if (aIDsLength === 1) {
			sID = this.getPrimaryType().prototype.parseValue.call(this, aIDs[0], sSourceType);
			this.sDescription = vValue;
			return [sID, undefined];
		}

		// if no IDs were found in the text/description field, filtering the key field
		if (aIDsLength === 0) {

			aIDs = filterValuesByKey(vValue, {
				key: sKeyField,
				value: sDescriptionField,
				data: oSettings.data
			});
			aIDsLength = aIDs.length;
		}

		if (aIDsLength === 0) {
			throw new ValidateException(oRB.getText("SMARTFIELD_NOT_FOUND"));
		}

		// duplicate IDs were found
		if (aIDsLength > 1) {
			throw new ValidateException(oRB.getText("SMARTFIELD_DUPLICATE_VALUES"));
		}

		sID = this.getPrimaryType().prototype.parseValue.call(this, vValue, sSourceType);
		this.sDescription = aIDs[0];
		return [sID, undefined];
	};

	TextArrangement.prototype.validateValue = function(vValues) {

		if (this.bRawValue) {
			this.bValueValidated = false;
			this.onBeforeValidateValue(this.vRawID, this.oFormatOptions, this.getFilterFields());

			// do not validate the old binding values twice
			return;
		}

		this.getPrimaryType().prototype.validateValue.call(this, vValues[0]);

		if (vValues[0] !== null) {
			this.fnValidator(vValues, this.oSettings);
		}

		this.bValueValidated = true;
		this.onAfterValidateValue(vValues[0]);
	};

	TextArrangement.prototype.validateIDOnly = function(vValues, oSettings) {};
	TextArrangement.prototype.validateIDAndDescription = function(vValues, oSettings) {};
	TextArrangement.prototype.validateDescriptionOnly = function(vValues, oSettings) {};

	TextArrangement.prototype.onAfterValidateValue = function(vValue) {
		this.oSettings.onAfterValidateValue(vValue);
	};

	TextArrangement.prototype.formatValue = function(vValues, sTargetType) {

		if (this.bRawValue) {
			return this.vRawValue;
		}

		var sKey = this.getPrimaryType().prototype.formatValue.call(this, vValues[0], sTargetType);

		if (sKey === "") {
			return sKey;
		}

		var sDescription = vValues[1];

		if (this.bValueValidated) {
			sDescription = (this.sDescription === undefined) ? vValues[1] : this.sDescription;
		} else {

			// if the binding context changes after the initial rendering or the .bindElement() method is called,
			// the description could be outdated, so a re-validation is need to fetch the newest description
			this.onBeforeValidateValue(sKey, this.oFormatOptions, this.getFilterFields());

			return "";
		}

		return FormatUtil.getFormattedExpressionFromDisplayBehaviour(this.oFormatOptions.textArrangement, sKey, sDescription);
	};

	TextArrangement.prototype.destroy = function() {
		this.oFormatOptions = null;
		this.oSettings = null;
		this.fnPreParser = null;
		this.fnParser = null;
		this.fnValidator = null;
		this.vRawValue = "";
		this.vRawID = "";
		this.vRawDescription = "";
		this.sDescription = "";
	};

	TextArrangement.prototype.getName = function() {
		return "sap.ui.comp.smartfield.type.TextArrangement";
	};

	/**
	 * Gets the primary type of this object.
	 *
	 * @returns {sap.ui.model.odata.type.ODataType} The data type used for parsing, validation and formatting
	 * @protected
	 * @abstract
	 */
	TextArrangement.prototype.getPrimaryType = function() {};

	TextArrangement.prototype.getValidator = function(mSettings) {

		switch (mSettings.textArrangement) {

			case "idAndDescription":
			case "descriptionAndId":
				return this[mSettings.prefix + "IDAndDescription"];

			case "descriptionOnly":
				return this[mSettings.prefix + "DescriptionOnly"];

			default:
				return this[mSettings.prefix + "IDOnly"];
		}
	};

	TextArrangement.prototype.getFilterFields = function() {
		return ["keyField", "descriptionField"];
	};

	function filterValuesByKey(sKey, mSettings) {
		var aValues = [];

		mSettings.data.forEach(function(mData, iIndex, aData) {
			if (mData[mSettings.key] === sKey) {
				aValues.push(mData[mSettings.value]);
			}
		});

		return aValues;
	}

	TextArrangement.splitIDAndDescription = function(vValue, mSettings) {
		var aValues = mSettings.separator.exec(vValue), // note: if the match fails, it returns null
			iIndex = aValues["index"];

		switch (mSettings.textArrangement) {

			case "idAndDescription":
				return [
					vValue.slice(0, iIndex /* index of the first separator */),
					vValue.slice(iIndex /* index of the first separator */ + 2, -1)
				];

			case "descriptionAndId":
				return [
					vValue.slice(iIndex /* index of the first separator */ + 2, -1),
					vValue.slice(0, iIndex /* index of the first separator */)
				];

			default:
				return ["", ""];
		}
	};

	return TextArrangement;
});
