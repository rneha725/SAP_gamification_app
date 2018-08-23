/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/mdc/experimental/provider/adapter/base/ObjectAdapter", "sap/ui/mdc/experimental/provider/adapter/odata/v4/ODataBaseAdapter", "sap/ui/mdc/experimental/provider/adapter/AdapterFactory"
], function(ObjectAdapter, ODataBaseAdapter, Factory) {
	"use strict";

	function shiftPromise(oPromise, oWrapper) {
		oPromise.then(function(oAdapter) {
			oWrapper.field = oAdapter;
			delete oWrapper.fieldPromise;
		});
	}

	var ODataObjectAdapter = ObjectAdapter.extend("sap.ui.mdc.experimental.provider.adapter.odata.v4.ODataObjectAdapter", {
		_schemaCache: {

		},
		constructor: function(oModel, sModelName, sContextName) {
			ObjectAdapter.prototype.constructor.apply(this, [
				oModel, sModelName, sContextName, ODataBaseAdapter
			]);
		}
	});

	ODataObjectAdapter.prototype.keys = function() {
		var i, aKeyPromises = [], aKeys = [];
		var that = this;

		var oResolvedParentPromise = new Promise(function(resolve) {
			resolve(that);
		});

		function pushPromise(oPromise) {
			oPromise.then(function(oAdapter) {
				oAdapter._parentCache = {};
				oAdapter._parentCache[that.sMetaPath] = oResolvedParentPromise;
				aKeys.push(oAdapter);
			});
		}

		return new Promise(function(resolve, reject) {
			for (i = 0; i < that.schema.$Key.length; i++) {
				aKeyPromises.push(Factory.newAdapter("field", that.oModel, that.sModelName, that.sContextName, that.sMetaPath + that.schema.$Key[i], true));
			}

			Promise.all(aKeyPromises).then(function() {
				for (var i = 0; i < aKeyPromises.length; i++) {
					pushPromise(aKeyPromises[i]);
				}

				resolve(aKeys);
			}, function(vReason) {
				reject(vReason);
			});
		});
	};

	ODataObjectAdapter.prototype.fields = function() {
		var sKey, sFieldPath, oField, aFieldPromises = [], aFields = [];
		var that = this;

		var oResolvedParentPromise = new Promise(function(resolve) {
			resolve(that);
		});

		function pushPromise(oPromise) {
			oPromise.then(function(oAdapter) {
				oAdapter._parentCache = {};
				oAdapter._parentCache[that.sMetaPath] = oResolvedParentPromise;
				aFields.push(oAdapter);
			});
		}

		return new Promise(function(resolve, reject) {
			for (sKey in that.schema) {
				if (sKey[0] !== "$") {// no special annotation
					sFieldPath = that.sMetaPath + sKey;
					oField = that.oMetaModel.getProperty(sFieldPath);
					if (oField && oField.$kind && oField.$kind == "Property") {
						aFieldPromises.push(Factory.newAdapter("field", that.oModel, that.sModelName, that.sContextName, sFieldPath, true));
					}
				}
			}

			Promise.all(aFieldPromises).then(function() {
				for (var i = 0; i < aFieldPromises.length; i++) {
					pushPromise(aFieldPromises[i]);
				}

				resolve(aFields);
			}, function(vReason) {
				reject(vReason);
			});
		});
	};

	ODataObjectAdapter.prototype.relations = function() {
		var sKey, oRelationMap = ODataBaseAdapter.utils.getAnnotation("./$NavigationPropertyBinding", this), aRelationPromises = [], aRelations = [];
		var that = this;

		function pushPromise(oPromise) {
			oPromise.then(function(oAdapter) {
				aRelations.push(oAdapter);
			});
		}

		return new Promise(function(resolve, reject) {
			for (sKey in oRelationMap) {
				aRelationPromises.push(Factory.newAdapter("object", that.oModel, that.sModelName, that.sContextName, "/" + oRelationMap[sKey] + "/", true));
			}

			Promise.all(aRelationPromises).then(function() {
				for (var i = 0; i < aRelationPromises.length; i++) {
					pushPromise(aRelationPromises[i]);
				}

				resolve(aRelations);
			}, function(vReason) {
				reject(vReason);
			});

		});
	};

	ODataObjectAdapter.prototype.filterRestrictions = function() {
		var oFilterRestrictions = ODataBaseAdapter.utils.getAnnotation("./@" + ODataBaseAdapter.annotations.FILTER_RESTRICTIONS, this) || {};

		return {
			noFilter: ODataBaseAdapter.collectionToArray(oFilterRestrictions.NonFilterableProperties),
			requiredFilter: ODataBaseAdapter.collectionToArray(oFilterRestrictions.RequiredProperties),
			filterable: oFilterRestrictions.Filterable != null ? oFilterRestrictions.Filterable : true,
			requiresFilter: oFilterRestrictions.RequiresFilter != null ? oFilterRestrictions.RequiresFilter : false,
			maxLevels: oFilterRestrictions.MaxLevels || -1
		};

	};

	ODataObjectAdapter.prototype.sortRestrictions = function() {
		var oSortRestrictions = ODataBaseAdapter.utils.getAnnotation("./@" + ODataBaseAdapter.annotations.SORT_RESTRICTIONS, this) || {};

		return {
			sortable: oSortRestrictions.Sortable !== "false",
			noSort: ODataBaseAdapter.collectionToArray(oSortRestrictions.NonSortableProperties),
			ascOnly: ODataBaseAdapter.collectionToArray(oSortRestrictions.AscendingOnlyProperties),
			descOnly: ODataBaseAdapter.collectionToArray(oSortRestrictions.DescendingOnlyProperties)
		};

	};

	ODataObjectAdapter.prototype.determineNavigationRestrictions = function() {
		var oNavigationRestrictions = ODataBaseAdapter.utils.getAnnotation("./@" + ODataBaseAdapter.annotations.NAVIGATION_RESTRICTIONS, this) || {};

		return {
			type: oNavigationRestrictions.Navigability,
			restrictedProperties: ODataBaseAdapter.collectionToArray(oNavigationRestrictions.RestrictedProperties)
		};
	};

	ODataObjectAdapter.prototype.chartInfo = function(sQualifier) {
		var oChartAnno = ODataBaseAdapter.utils.getVisualAnno(ODataBaseAdapter.annotations.CHART, this, sQualifier);

		var that = this;

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

		return new Promise(function(resolve, reject) {

			if (oChartAnno) {
				var aDimeasurePromises = [], oChartInfo = {
					Title: oChartAnno.Title ? oChartAnno.Title : "",
					Dimensions: [],
					Measures: []
				};

				var j, sField;

				for (j = 0; j < oChartAnno.Dimensions.length; j++) {
					sField = oChartAnno.Dimensions[j].$PropertyPath;
					aDimeasurePromises.push(Factory.newAdapter("field", that.oModel, that.sModelName, that.sContextName, that.sMetaPath + "/" + sField, true));

					oChartInfo.Dimensions.push({
						name: sField,
						fieldPromise: aDimeasurePromises[aDimeasurePromises.length - 1],
						attributes: getAttribute(sField, true)
					});
				}

				for (j = 0; j < oChartAnno.Measures.length; j++) {
					sField = oChartAnno.Measures[j].$PropertyPath;
					aDimeasurePromises.push(Factory.newAdapter("field", that.oModel, that.sModelName, that.sContextName, that.sMetaPath + "/" + sField, true));
					oChartInfo.Measures.push({
						name: sField,
						fieldPromise: aDimeasurePromises[aDimeasurePromises.length - 1],
						attributes: getAttribute(sField, false)
					});
				}

				Promise.all(aDimeasurePromises).then(function() {
					for (var k = 0; k < aDimeasurePromises.length; k++) {
						var oDimeasure;

						if (k < oChartInfo.Dimensions.length) {
							oDimeasure = oChartInfo.Dimensions[k];
						} else {
							oDimeasure = oChartInfo.Measures[k - oChartInfo.Dimensions.length];
						}

						shiftPromise(aDimeasurePromises[k], oDimeasure);
					}

					resolve(oChartInfo);
				}, function(vReason) {
					reject(vReason);
				});

			} else {
				resolve(null);
			}
		});

	};

	ODataObjectAdapter.prototype.tableInfo = function(sQualifier) {
		var oTableAnno = ODataBaseAdapter.utils.getVisualAnno(ODataBaseAdapter.annotations.TABLE, this, sQualifier);

		var that = this;

		return new Promise(function(resolve, reject) {

			if (oTableAnno) {
				var i, oLineItem, aColumnPromises = [];
				var oTableInfo = {
					ModelName: that.sModelName,
					Set: "/" + that.name,
					Columns: [],
					Actions: []
				};

				for (i = 0; i < oTableAnno.length; i++) {
					oLineItem = oTableAnno[i];
					switch (oLineItem.$Type) {
						case ODataBaseAdapter.annotations.DATA_FIELD.FIELD:
							aColumnPromises.push(Factory.newAdapter("field", that.oModel, that.sModelName, that.sContextName, that.sMetaPath + "/" + oLineItem.Value.$Path, true));

							oTableInfo.Columns.push({
								label: oLineItem.Label,
								fieldPromise: aColumnPromises[aColumnPromises.length - 1],
								model: that.sModelName
							});
							break;
						case ODataBaseAdapter.annotations.DATA_FIELD.ACTION:
					}
				}

				Promise.all(aColumnPromises).then(function() {
					for (var k = 0; k < aColumnPromises.length; k++) {
						shiftPromise(aColumnPromises[k], oTableInfo.Columns[k]);
					}

					resolve(oTableInfo);
				}, function(vReason) {
					reject(vReason);
				});
			} else {
				resolve(null);
			}
		});
	};

	ODataObjectAdapter.prototype.contactInfo = function(sQualifier) {
	};
	
	ODataObjectAdapter.prototype.relation = function(sPath) {
	};

	return ODataObjectAdapter;
});
