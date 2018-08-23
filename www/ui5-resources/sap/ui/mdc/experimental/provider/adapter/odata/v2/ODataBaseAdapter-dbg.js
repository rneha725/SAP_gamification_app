/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/mdc/experimental/provider/adapter/base/BaseAdapter", "sap/ui/mdc/experimental/provider/adapter/odata/Annotations", "sap/ui/mdc/experimental/provider/adapter/odata/_ODataAdapterUtils"
], function(BaseAdapter, Annotations, Utils) {
	"use strict";

	var ODataBaseAdapter = BaseAdapter.extend("sap.ui.mdc.experimental.provider.adapter.odata.v2.ODataBaseAdapter", {
		_schemaCache: {

		},
		aExpand: [],
		annotations: Annotations,
		constructor: function(oModel, sModelName, sContextName) {
			BaseAdapter.prototype.constructor.apply(this, arguments);
		}
	});
	
	ODataBaseAdapter.annotations = Annotations;
	ODataBaseAdapter.utils = Utils;
	
	ODataBaseAdapter.prototype.ready = function() {
		if (this.oMetaModel.loaded) {
			return this.oMetaModel.loaded();
		}
	};

	ODataBaseAdapter.prototype.afterMetaContextSwitch = function() {
		this.sVersion = "2.0";
		Utils.buildSchemaCache(this);
		
		this.oEntitySet = this.calculateEntitySet(this.sPath);
	};
	
	ODataBaseAdapter.prototype.getQualifiers = function() {
		return Utils.getQualifiers(this);
	};

	ODataBaseAdapter.prototype.calculateEntitySet = function(sPath) {
		var oAssocationSetEnd, sNavigationPropertyName, oEntityType, sQualifiedName, oEntitySet, aParts = sPath.split("/");
		if (aParts[0] !== "") {
			return null;
		}
		aParts.shift();

		// from entity set to entity type
		oEntitySet = this.oMetaModel.getODataEntitySet(Utils.stripKeyPredicate(aParts[0]));
		if (!oEntitySet) {
			return null;
		}
		aParts.shift();

		// follow (navigation) properties
		while (aParts.length) {
			sQualifiedName = oEntitySet.entityType;
			oEntityType = this.oMetaModel.getODataEntityType(sQualifiedName);
			sNavigationPropertyName = Utils.stripKeyPredicate(aParts[0]);
			oAssocationSetEnd = this.oMetaModel.getODataAssociationSetEnd(oEntityType, sNavigationPropertyName);

			if (oAssocationSetEnd) {
				// navigation property
				oEntitySet = this.oMetaModel.getODataEntitySet(oAssocationSetEnd.entitySet);
			} else {
				break;
			}
			
			aParts.shift(-1);
		}

		return oEntitySet;

	};

	ODataBaseAdapter.prototype.resolveNavi = function(sNaviPath, TargetAdapter) {
		var aPath = sNaviPath.split("/"), oNaviEntitySet = this.oEntitySet, oAssocationSetEnd, oAssocationEnd, sMultiplicity, sNaviDeep;

		var that = this;
		function resolveSimplePath() {
			oAssocationEnd = that.oMetaModel.getODataAssociationEnd(that.schema, aPath[0]);
			if (!oAssocationEnd) {
				return;
			}
			
			oAssocationSetEnd = that.oMetaModel.getODataAssociationSetEnd(that.schema, aPath[0]);
			oNaviEntitySet = that.oMetaModel.getODataEntitySet(oAssocationSetEnd.entitySet);

			if (oAssocationEnd.multiplicity != BaseAdapter.Relation.one || !sMultiplicity) {
				sMultiplicity = oAssocationEnd.multiplicity;
			}

		}

		if (aPath.length == 1) {
			if (aPath[0] !== ".") {
				sNaviDeep = "/" + this.oEntitySet.name + "/" + aPath[0];
			} else {
				sNaviDeep = "/" + this.oEntitySet.name; 
			}
			resolveSimplePath();
		} else {
			var sExpand = "";
			while (aPath.length > 1) {
				sExpand = sExpand + "/" + aPath[0];
				resolveSimplePath();
				aPath.shift(-1);
			}
			
			sExpand = sExpand.substring(1);
			if (that.aExpand.indexOf(sExpand) == -1) {
				that.aExpand.push(sExpand);
			}
			
			sNaviDeep = "/" + oNaviEntitySet.name + "/" + aPath[0];
		}

		var oNavi = new TargetAdapter(this.oModel, this.sModelName, this.sContextName);
		oNavi.switchMetaContext(null,sNaviDeep);

		oNavi.oEntitySet = oNaviEntitySet;
		oNavi.navigationPath = this.navigationPath ? this.navigationPath + "/" + sNaviPath : sNaviPath;
		oNavi.multiplicity = sMultiplicity || "n";

		return oNavi;
	};

	ODataBaseAdapter.prototype.enabled = function() {
		return Utils.enabled(this);
	};

	ODataBaseAdapter.prototype.tooltip = function() {
		return this.getAnnotation(this.annotations.QUICKINFO + "/String");
	};
	
	ODataBaseAdapter.prototype.name = function() {
		return this.schema.name;
	};

	ODataBaseAdapter.prototype.label = function() {
		return this.getAnnotation(this.annotations.LABEL + "/String");
	};

	ODataBaseAdapter.prototype.navigationProperties = function() {
		var i, oNavi, aNavis = this.getAnnotation("navigationProperty"), aNaviMap = [];

		if (aNavis && aNavis.length) {
			for (i = 0; i < aNavis.length; i++) {
				oNavi = aNavis[i];

				aNaviMap[oNavi.name] = oNavi;
			}
		}

		return aNaviMap;
	};

	ODataBaseAdapter.prototype.expand = function() {
		return this.aExpand;
	};

	ODataBaseAdapter.prototype["//"] = function() {
		return this.schema;
	};

	ODataBaseAdapter.prototype.getAnnotation = function(sAnnotation, oAnnotation) {
		oAnnotation = oAnnotation || this.schema;
		var aParts = sAnnotation.split("/");
		var iIndex = 0;

		while (oAnnotation && aParts[iIndex]) {
			oAnnotation = oAnnotation[aParts[iIndex]];
			iIndex++;
		}

		return oAnnotation;
	};

	ODataBaseAdapter.prototype._isAnnotationBoolean = function(sAnnotation) {
		var oAnnotation = this.getAnnotation(sAnnotation);
		var isType = false;
		if (oAnnotation != null) {
			isType = oAnnotation.Bool ? (oAnnotation.Bool == "true") : true;
		}
		return isType;
	};

	ODataBaseAdapter.prototype._enrichFromEntitySet = function(oField, oEntitySet) {
		// take sortable, filterable, required in filter
		var i, oFilterRestrictions = this._getAnnotation(this.annotations.FILTER_RESTRICTIONS, oEntitySet);

		oField.filterable = true;
		oField.requiredInFilter = false;

		if (oFilterRestrictions) {
			for (i = 0; i < oFilterRestrictions.NonFilterableProperties; i++) {
				if (oField.name === oFilterRestrictions.NonFilterableProperties.PropertyPath) {
					oField.filterable = false;
				}
			}
		}

	};

	ODataBaseAdapter.prototype.metadataContextOfField = function(oField) {
		var index = Object.keys(this.fields).indexOf(oField.name);

		if (index > -1) {
			return this.sMetaPath + "/property/" + index;
		} else {
			return "";
		}
	};

	return ODataBaseAdapter;
});
