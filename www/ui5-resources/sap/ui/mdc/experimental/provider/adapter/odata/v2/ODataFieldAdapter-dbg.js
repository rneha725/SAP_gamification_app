/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/mdc/experimental/provider/adapter/base/FieldAdapter", "sap/ui/mdc/experimental/provider/adapter/odata/v2/ODataBaseAdapter", "sap/ui/mdc/experimental/provider/adapter/AdapterFactory"
], function(FieldAdapter, ODataBaseAdapter, Factory) {
	"use strict";

	var ODataFieldAdapter = FieldAdapter.extend("sap.ui.mdc.experimental.provider.adapter.odata.v2.ODataFieldAdapter", {
		_parentCache: {

		},
		constructor: function(oModel, sModelName, sContextName) {
			FieldAdapter.prototype.constructor.apply(this, [
				oModel, sModelName, sContextName, ODataBaseAdapter
			]);
		}
	});

	ODataFieldAdapter.prototype.allowEmptyValue = function() {
		return true;
	};

	/**
	 * The default Value for the field
	 */
	ODataFieldAdapter.prototype.defaultValue = function() {
		switch (this.ui5Type) {
			case "sap.ui.model.odata.type.Boolean":
				return false;
			case "sap.ui.model.odata.type.Byte":
			case "sap.ui.model.odata.type.Decimal":
			case "sap.ui.model.odata.type.Double":
			case "sap.ui.model.odata.type.Guid":
			case "sap.ui.model.odata.type.Int16":
			case "sap.ui.model.odata.type.Int32":
			case "sap.ui.model.odata.type.Int64":
			case "sap.ui.model.odata.type.SByte":
			case "sap.ui.model.odata.type.Single":
				return 0;
			case "sap.ui.model.odata.type.Date":
			case "sap.ui.model.odata.type.DateTimeOffset":
			case "sap.ui.model.odata.type.TimeOfDay":
				return new Date();
			case "Edm.String":
				return "";
			default:
				return "";
		}
	};

	ODataFieldAdapter.prototype.precision = function() {
		return this["//"]["Precision"];
	};

	ODataFieldAdapter.prototype.scale = function() {
		return this["//"]["Scale"];
	};

	ODataFieldAdapter.prototype.maximum = function() {
		return 0;
	};

	ODataFieldAdapter.prototype.exclusiveMaximum = function() {
		return false;
	};

	ODataFieldAdapter.prototype.minimum = function() {
		return 0;
	};

	ODataFieldAdapter.prototype.exclusiveMinimum = function() {
		return false;
	};

	ODataFieldAdapter.prototype.maxLength = function() {
		var sMaxLength = this["//"]["maxLength"];
		return isNaN(sMaxLength) ? undefined : parseInt(sMaxLength, 10);
	};

	ODataFieldAdapter.prototype.minLength = function() {
		var sMinLength = this["//"]["minLength"];
		return isNaN(sMinLength) ? undefined : parseInt(sMinLength, 10);
	};

	ODataFieldAdapter.prototype.multipleOf = function() {
		return 1;
	};

	ODataFieldAdapter.prototype.pattern = function() {
		return "/.*?/"; // any pattern
	};

	ODataFieldAdapter.prototype.unit = function() {
		// var sUnitProperty = this["//"]["sap:unit"];
		// TODO: read unit property
	};

	ODataFieldAdapter.prototype.textAlign = function() {

	};

	ODataFieldAdapter.prototype.visible = function() {
		return ODataBaseAdapter.utils.visible(ODataBaseAdapter.annotations.HIDDEN, this);
	};

	ODataFieldAdapter.prototype.ui5Type = function() {

		if (this.oMetaModel.getUI5Type) {
			return this.oMetaModel.getUI5Type(this.sMetaPath);
		}

		switch (this.schema.type) {
			case "Edm.Boolean":
				return "sap.ui.model.odata.type.Boolean";
			case "Edm.Byte":
				return "sap.ui.model.odata.type.Byte";
			case "Edm.Date":
				return "sap.ui.model.odata.type.Date";
			case "Edm.DateTime":
				return "sap.ui.model.odata.type.DateTime";
			case "Edm.DateTimeOffset":
				return "sap.ui.model.odata.type.DateTimeOffset";
			case "Edm.Decimal":
				return "sap.ui.model.odata.type.Decimal";
			case "Edm.Double":
				return "sap.ui.model.odata.type.Double";
			case "Edm.Guid":
				return "sap.ui.model.odata.type.Guid";
			case "Edm.Int16":
				return "sap.ui.model.odata.type.Int16";
			case "Edm.Int32":
				return "sap.ui.model.odata.type.Int32";
			case "Edm.Int64":
				return "sap.ui.model.odata.type.Int64";
			case "Edm.SByte":
				return "sap.ui.model.odata.type.SByte";
			case "Edm.Single":
				return "sap.ui.model.odata.type.Single";
			case "Edm.String":
				return "sap.ui.model.odata.type.String";
			case "Edm.TimeOfDay":
				return "sap.ui.model.odata.type.TimeOfDay";
			default:
				if (this["//"]["sap:display-format"] == "Date") {
					return "sap.ui.model.odata.type.Date";
				}
				return "sap.ui.model.odata.type.String";
		}
	};

	ODataFieldAdapter.prototype.formatOptions = function() {
		var sFormatOptions = "";

		// TODO: How to translate

		switch (this.ui5Type) {
			case "sap.ui.model.odata.type.Boolean":
				break;
			case "sap.ui.model.odata.type.Byte":

				break;
			case "sap.ui.model.odata.type.Date":
				break;
			case "sap.ui.model.odata.type.DateTimeOffset":
				break;
			case "sap.ui.model.odata.type.Decimal":
				break;
			case "sap.ui.model.odata.type.Double":
				break;
			case "sap.ui.model.odata.type.Guid":
				break;
			case "sap.ui.model.odata.type.Int16":
				break;
			case "sap.ui.model.odata.type.Int32":
				break;
			case "sap.ui.model.odata.type.Int64":
				break;
			case "sap.ui.model.odata.type.SByte":
				break;
			case "sap.ui.model.odata.type.Single":
				break;
			case "sap.ui.model.odata.type.String":
				break;
			case "sap.ui.model.odata.type.TimeOfDay":
				break;
			default:
				break;
		}

		return sFormatOptions;
	};

	ODataFieldAdapter.prototype.semantics = function() {
		if (this.getAnnotation(this.annotations.SEMANTICS.PASSWORD) != null) {
			return FieldAdapter.Semantics.password;
		}

		if (this.getAnnotation(this.annotations.SEMANTICS.EMAIL) != null) {
			return FieldAdapter.Semantics.eMail;
		}

		if (this.getAnnotation(this.annotations.SEMANTICS.PHONE) != null) {
			return FieldAdapter.Semantics.phoneNumber;
		}

		if (this.getAnnotation(this.annotations.SEMANTICS.URL) != null) {
			return FieldAdapter.Semantics.url;
		}

		if (this.getAnnotation(this.annotations.SEMANTICS.CURRENCY) != null) {
			return FieldAdapter.Semantics.currency;
		}

		if (this.getAnnotation(this.annotations.SEMANTICS.UNIT) != null) {
			return FieldAdapter.Semantics.measure;
		}
		return FieldAdapter.Semantics.text;
	};

	ODataFieldAdapter.prototype.required = function() {
		return ODataBaseAdapter.utils.required("nullable", this);
	};

	ODataFieldAdapter.prototype.filterable = function() {
		return (this.filterRestrictions.NonFilterableProperties.indexOf(this.schema.name) === -1);

	};

	ODataFieldAdapter.prototype.requiredInFilter = function() {
		return (this.filterRestrictions.RequiredProperties.indexOf(this.schema.name) !== -1);
	};

	ODataFieldAdapter.prototype.sortable = function() {
		return true;
	};

	ODataFieldAdapter.prototype.valueHelp = function() {
		var oResult = null;

		var oValueList = this.getAnnotation(this.annotations.VALUE_LIST);

		if (oValueList) {
			oResult = {};

			var sEntitySet = "/" + oValueList.CollectionPath.String;

			oResult.valuesPath = this.asPath(sEntitySet);

			oResult.parameters = [];

			var oParam, i, sLocal, sValue;

			for (i = 0; i < oValueList.Parameters.length; i++) {
				oParam = oValueList.Parameters[i];

				sLocal = oParam.LocalDataProperty ? oParam.LocalDataProperty.PropertyPath : null;
				sValue = oParam.ValueListProperty.PropertyPath;

				var oValueAdapter = new ODataFieldAdapter(this.oModel, this.sModelName, this.sContextName);
				oValueAdapter.switchMetaContext(null, sEntitySet + "/" + sValue);

				oResult.parameters.push({
					targetProperty: sLocal,
					sourceAdapter: oValueAdapter
				});
			}
		}

		return oResult;
	};

	ODataFieldAdapter.prototype.describedBy = function() {
		var oTextAnno = this["//"][this.annotations.TEXT];

		if (!oTextAnno) {
			return this;
		}

		return this.resolveNavi(oTextAnno.Path, ODataFieldAdapter);

	};

	ODataFieldAdapter.prototype._collectAnnotations = function(sAnnotationName) {
		var oProperty = this["//"];
		var oQualifiers = {};
		for ( var sAttr in oProperty) {
			var sName = sAttr.split("#")[0];
			var sQualifierName = sAttr.split("#")[1] || ""; // as of specification the qualifier MUST have at least one character
			if (jQuery.sap.startsWith(sName, sAnnotationName) && jQuery.sap.endsWith(sName, sAnnotationName)) {
				oQualifiers[sQualifierName] = {
					annotation: oProperty[sAttr]
				};
			}
		}
		return oQualifiers;
	};

	/**
	 * Reads the annotation com.sap.vocabularies.Common.v1.SemanticObject with all qualifiers of current field. Note: the default value of
	 * 'defaultSemanticObject' and 'additionalSemanticObjects' should be equal to the appropriated default properties of control (e.g. compare with
	 * FlpActionHandler).
	 * 
	 * @returns {{defaultSemanticObject: undefined, additionalSemanticObjects: Array}}
	 */
	ODataFieldAdapter.prototype.semanticObject = function() {
		var oQualifiers = this._collectAnnotations(this.annotations.SEMANTIC_OBJECT);
		var aAdditionalSemanticObjects = Object.keys(oQualifiers).filter(function(sQualifierName) {
			return !!sQualifierName;
		}).map(function(sQualifierName) {
			return oQualifiers[sQualifierName].annotation["String"];
		});
		return {
			defaultSemanticObject: (oQualifiers[""] ? oQualifiers[""].annotation["String"] : undefined),
			additionalSemanticObjects: aAdditionalSemanticObjects
		};
	};

	/**
	 * Reads the annotation com.sap.vocabularies.Common.v1.SemanticObjectMapping with all qualifiers of current field. Note: the default of return
	 * value should be equal to the appropriated default property of control (e.g. compare with FlpActionHandler).
	 * 
	 * @returns {object} Object with semantic object name as key and SemanticObjectMapping annotation as value
	 */
	ODataFieldAdapter.prototype.semanticObjectMapping = function() {
		var fnGetMapping = function(aSemanticObjectMappings) {
			if (!jQuery.isArray(aSemanticObjectMappings)) {
				return {};
			}
			var oResult = {};
			aSemanticObjectMappings.forEach(function(oPair) {
				oResult[oPair.LocalProperty.PropertyPath] = oPair.SemanticObjectProperty.String;
			});
			return oResult;
		};
		// Collect semanticObject(s) with qualifier and semanticObjectMapping(s) with qualifier
		var oSemanticObjectQualifiers = this._collectAnnotations(this.annotations.SEMANTIC_OBJECT);
		if (jQuery.isEmptyObject(oSemanticObjectQualifiers)) {
			return {};
		}
		var oSemanticObjectMappingQualifiers = this._collectAnnotations(this.annotations.SEMANTIC_OBJECT_MAPPING);
		if (jQuery.isEmptyObject(oSemanticObjectMappingQualifiers)) {
			return {};
		}
		var oSemanticObjects = {};
		for ( var sQualifierName in oSemanticObjectQualifiers) {
			oSemanticObjects[oSemanticObjectQualifiers[sQualifierName].annotation["String"]] = fnGetMapping(oSemanticObjectMappingQualifiers[sQualifierName].annotation);
		}
		return oSemanticObjects;
	};

	ODataFieldAdapter.prototype.parent = function() {
		var sParentPath, aParts = this.sPath.split("/");
		if (aParts[0] !== "") {
			return null;
		}
		aParts[1] = ODataBaseAdapter.utils.stripKeyPredicate(aParts[1]);
		aParts.splice(-1, 1);
		sParentPath = aParts.join("/");

		if (!this._parentCache[sParentPath]) {
			this._parentCache[sParentPath] = Factory.newAdapter("object", this.oModel, this.sModelName, this.sContextName, sParentPath, true);
		}

		return this._parentCache[sParentPath];
	};

	return ODataFieldAdapter;
});
