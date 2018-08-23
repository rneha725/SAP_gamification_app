/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/mdc/experimental/provider/adapter/base/ObjectAdapter", "sap/ui/mdc/experimental/provider/adapter/odata/v2/ODataBaseAdapter", "sap/ui/mdc/experimental/provider/adapter/odata/v2/ODataFieldAdapter", "sap/ui/mdc/experimental/provider/adapter/base/ColumnWrapper"
], function(ObjectAdapter, ODataBaseAdapter, ODataFieldAdapter, ODataColumnWrapper) {
	"use strict";

	var ODataObjectAdapter = ObjectAdapter.extend("sap.ui.mdc.experimental.provider.adapter.odata.v2.ODataObjectAdapter", {
		_schemaCache: {

		},
		constructor: function(oModel, sModelName, sContextName) {
			ObjectAdapter.prototype.constructor.apply(this, [
				oModel, sModelName, sContextName, ODataBaseAdapter
			]);
		}
	});

	ODataObjectAdapter.prototype.collection = function() {
		return this.asPath("/" + this.oEntitySet.name);
	};

	ODataObjectAdapter.prototype.keys = function() {
		var i, aKeys = this["//"]["key"]["propertyRef"], oKeyMap = {};

		for (i = 0; i < aKeys.length; i++) {
			oKeyMap[aKeys[i].name] = this.fields[aKeys[i].name];
		}

		return oKeyMap;
	};

	ODataObjectAdapter.prototype.fields = function() {
		var i, oField, aFields = this["//"]["property"], oFieldMap = {};

		for (i = 0; i < aFields.length; i++) {
			oField = aFields[i];

			oFieldMap[oField.name] = new ODataFieldAdapter(this.oModel, this.sModelName, this.sContextName);
			oFieldMap[oField.name].switchMetaContext(this.sMetaPath + "/property/" + i, this.sPath + "/" + oField.name);
			oFieldMap[oField.name].oEntitySet = this.oEntitySet;

			// propagate navigation path
			if (this.navigationPath) {
				oFieldMap[oField.name].navigationPath = this.navigationPath + "/" + oField.name;
			}
		}

		return oFieldMap;
	};

	ODataObjectAdapter.prototype.relations = function() {
		var sName, mNaviProperties = this.navigationProperties(), mRelations = {};

		for (sName in mNaviProperties) {
			mRelations[sName] = this.resolveNavi(sName, ODataObjectAdapter);
		}

		return mRelations;
	};

	ODataObjectAdapter.prototype.chartInfo = function(sQualifier) {
		var oChartAnno = ODataBaseAdapter.utils.getVisualAnno(ODataBaseAdapter.annotations.CHART, this, sQualifier), oChartInfo;

		function getAttribute(sDimeasure, bDimension) {
			var oAttributes = bDimension ? oChartAnno.DimensionAttributes : oChartAnno.MeasureAttributes;
			var oRoles = bDimension ? ODataBaseAdapter.annotations.DIMENSION_ROLES : ODataBaseAdapter.annotations.MEASURE_ROLES;
			var sKey = bDimension ? "Dimension" : "Measure";

			var oAttribute = {
				Role: oRoles[""]
			};

			if (oAttributes) {
				for (var l = 0; l < oAttributes.length; l++) {
					if (oAttributes[l][sKey].$PropertyPath == sDimeasure) {
						oAttribute = {
							Role: oRoles[oAttributes[l].Role.$EnumMember]
						};
						break;
					}
				}
			}

			return oAttribute;
		}

		if (oChartAnno) {
			var oField, oDimension, oMeasure;

			oChartInfo = {
				Title: oChartAnno.Title ? oChartAnno.Title : "",
				Dimensions: [],
				Measures: []
			};

			var j;

			for (j = 0; j < oChartAnno.Dimensions.length; j++) {
				oDimension = oChartAnno.Dimensions[j];
				oField = this.fields[oDimension.PropertyPath] || this.resolveNavi(oDimension.PropertyPath, ODataFieldAdapter);

				oChartInfo.Dimensions.push({
					name: oDimension.PropertyPath,
					field: oField,
					attributes: getAttribute(oDimension.PropertyPath, true)
				});
			}

			for (j = 0; j < oChartAnno.Measures.length; j++) {
				oMeasure = oChartAnno.Measures[j];
				oField = this.fields[oMeasure.PropertyPath] || this.resolveNavi(oMeasure.PropertyPath, ODataFieldAdapter);

				oChartInfo.Measures.push({
					name: oMeasure.PropertyPath,
					field: oField,
					attributes: getAttribute(oMeasure.PropertyPath, false)
				});
			}
		}

		return oChartInfo;
	};

	ODataObjectAdapter.prototype.tableInfo = function(sQualifier) {
		var oTableAnno = ODataBaseAdapter.utils.getVisualAnno(ODataBaseAdapter.annotations.TABLE, this, sQualifier);

		var oTableInfo = {
			ModelName: this.sModelName,
			Set: this.sPath,
			Columns: [],
			Actions: []
		};

		if (oTableAnno) {
			var i, oLineItem, oAction, oField;

			var oODataColumnWrapper = new ODataColumnWrapper(null, oTableAnno);

			var fnPress = function() {
				sap.m.MessageToast.show("Function Import: " + this.oFunctionImport.name);
			};

			for (i = 0; i < oTableAnno.length; i++) {
				oLineItem = oTableAnno[i];
				switch (oLineItem.RecordType) {
					case ODataBaseAdapter.annotations.DATA_FIELD.FIELD:
						oField = this.fields[oLineItem.Value.Path] || this.resolveNavi(oLineItem.Value.Path, ODataFieldAdapter);
						oODataColumnWrapper.switchField(oField);

						oTableInfo.Columns.push({
							label: oODataColumnWrapper.label,
							field: oField,
							model: this.sModelName
						});
						break;
					case ODataBaseAdapter.annotations.DATA_FIELD.ACTION:
						oAction = {};
						oAction.label = this.getAnnotation("Label/String", oLineItem);
						oAction.selection = !oLineItem.Inline;
						var sFunctionImport = this.getAnnotation("Action/String", oLineItem);
						oAction.id = sFunctionImport.replace("/", "--");

						oAction.oFunctionImport = this.oMetaModel.getODataFunctionImport(sFunctionImport);

						oAction.press = fnPress;

						oAction.enabled = true;

						oTableInfo.Actions.push(oAction);
				}
			}
		}

		return oTableInfo;

	};

	ODataObjectAdapter.prototype.contactInfo = function(sQualifier) {
		var oContact = ODataBaseAdapter.utils.getAnnotation(ODataBaseAdapter.annotations.CONTACT, this, sQualifier);
		
		return oContact;
	};
	
	ODataObjectAdapter.prototype.relation = function(sPath) {
		return this.resolveNavi(sPath, ODataObjectAdapter);
	};

	return ODataObjectAdapter;
});
