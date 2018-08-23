/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/mdc/experimental/provider/adapter/base/FieldAdapter", "sap/ui/mdc/experimental/provider/adapter/odata/v4/ODataBaseAdapter", "sap/ui/mdc/experimental/provider/adapter/AdapterFactory"
], function(FieldAdapter, ODataBaseAdapter, Factory) {
	"use strict";

	var ODataFieldAdapter = FieldAdapter.extend("sap.ui.mdc.experimental.provider.adapter.odata.v4.ODataFieldAdapter", {
		_parentCache: {

		},
		_promiseCache: {

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

	ODataFieldAdapter.prototype.parent = function() {
		var sParentPath, aParts = this.sMetaPath.split("/");
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
		return this["//"]["$Precision"];
	};

	ODataFieldAdapter.prototype.scale = function() {
		return this["//"]["$Scale"];
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
		return ODataBaseAdapter.utils.visible("@" + ODataBaseAdapter.annotations.HIDDEN, this);
	};

	ODataFieldAdapter.prototype.ui5Type = function() {
		return this.oMetaModel.fetchUI5Type(this.sMetaPath);
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
		return ODataBaseAdapter.utils.asSemantics(this, FieldAdapter);
	};

	ODataFieldAdapter.prototype.required = function() {
		return ODataBaseAdapter.utils.required("./$Nullable", this);
	};

	ODataFieldAdapter.prototype.filterable = function() {
		var that = this;

		return new Promise(function(resolve, reject) {

			that.parent.then(function(oParent) {
				var oResult = oParent.filterRestrictions.filterable && oParent.filterRestrictions.noFilter.indexOf(that.name) === -1;

				resolve(oResult);
			}, function(reason) {
				reject(reason);
			});
		});
	};

	ODataFieldAdapter.prototype.requiredInFilter = function() {
		var that = this;

		return new Promise(function(resolve, reject) {

			that.parent.then(function(oParent) {
				var oResult = oParent.filterRestrictions.filterable && oParent.requiredFilter.noFilter.indexOf(that.name) === -1;

				resolve(oResult);
			}, function(reason) {
				reject(reason);
			});
		});
	};

	ODataFieldAdapter.prototype.sortDirection = function() {
		var bIsSortable = (this.parent.sortRestrictions.sortable && this.parent.sortRestrictions.noSort.indexOf(this.schema.name) === -1);

		if (!bIsSortable) {
			FieldAdapter.SortDirection.none;
		}

		if (this.parent.sortRestrictions.ascOnly.indexOf(this.schema.name) !== -1) {
			return FieldAdapter.SortDirection.asc;
		}

		if (this.parent.sortRestrictions.descOnly.indexOf(this.schema.name) !== -1) {
			return FieldAdapter.SortDirection.desc;
		}

		return FieldAdapter.SortDirection.both;
	};

	ODataFieldAdapter.prototype.valueHelp = function() {
		var that = this;

		function toAdapter(oParameter) {
			oParameter.fromPromise.then(function(oAdapter) {
				oParameter.from = oAdapter;
			});
		}

		function convertValueList(oMap) {
			return new Promise(function(resolve, reject) {
				var i, oValueHelp = {
					model: oMap.$model || that.oModel,
					modelName: (oMap.$model != null) ? "vl" : that.sModelName,
					items: "/" + oMap.CollectionPath,
					parameters: []
				};

				var aAdapterPromise = [];

				for (i = 0; i < oMap.Parameters.length; i++) {
					var sPath = oValueHelp.items + "/" + oMap.Parameters[i].ValueListProperty;

					oValueHelp.parameters.push({
						to: oMap.Parameters[i].LocalDataProperty ? oMap.Parameters[i].LocalDataProperty.$PropertyPath : null,
						type: ODataBaseAdapter.utils.getValueHelpParamterType(oMap.Parameters[i].$Type),
						fromPromise: Factory.newAdapter("field", oValueHelp.model, oValueHelp.modelName, oValueHelp.modelName, sPath)
					});

					aAdapterPromise.push(oValueHelp.parameters[i].fromPromise);

				}

				Promise.all(aAdapterPromise).then(function() {
					for (i = 0; i < oValueHelp.parameters.length; i++) {
						toAdapter(oValueHelp.parameters[i]);
					}
					resolve(oValueHelp);
				}, function(vReason) {
					reject(vReason);
				});
			});
		}

		var oValueList = ODataBaseAdapter.utils.getAnnotation("@" + ODataBaseAdapter.annotations.VALUE_LIST, that);
		if (oValueList) {
			return convertValueList(oValueList);
		} else {
			return new Promise(function(resolve, reject) {
				that.oMetaModel.requestValueListInfo(that.sMetaPath).then(function(oValueList) {
					convertValueList(oValueList[""]).then(function(oValueHelp) {
						resolve(oValueHelp);
					}, function(vReason) {
						reject(vReason);
					});
				}, function(vReason) {
					reject(vReason);
				});
			});
		}
	};

	ODataFieldAdapter.prototype.value = function() {
		return this.asPath(this.name, null, this.formatter);
	};

	ODataFieldAdapter.prototype.describedBy = function() {
		var oTextAnno = ODataBaseAdapter.utils.getAnnotation("@" + ODataBaseAdapter.annotations.TEXT, this);

		if (!oTextAnno) {
			return this.value;
		}

		return oTextAnno;

	};

	ODataFieldAdapter.prototype.semanticObject = function() {
		//TBI

		var oSemanticObjects = {
			defaultSemanticObject: undefined,
			additionalSemanticObjects: []
		};

		//var oDefaultSemanticObject = ODataBaseAdapter.utils.getAnnotation("@" + ODataBaseAdapter.annotations.SEMANTIC_OBJECT);
		//TBD
		//r. requestObject(".../@")
		return (oSemanticObjects.defaultSemanticObject || oSemanticObjects.additionalSemanticObjects.length > 0) ? oSemanticObjects : undefined;
	};

	ODataFieldAdapter.prototype.semanticObjectMapping = function() {
		// TBD
		return {};
	};

	return ODataFieldAdapter;
});
