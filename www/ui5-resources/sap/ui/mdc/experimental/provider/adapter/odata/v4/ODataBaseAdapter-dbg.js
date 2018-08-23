/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/mdc/experimental/provider/adapter/base/BaseAdapter", "sap/ui/mdc/experimental/provider/adapter/odata/Annotations", "sap/ui/mdc/experimental/provider/adapter/odata/_ODataAdapterUtils"
], function(BaseAdapter, Annotations, Utils) {
	"use strict";

	var ODataBaseAdapter = BaseAdapter.extend("sap.ui.mdc.experimental.provider.adapter.odata.v4.ODataBaseAdapter", {
		constructor: function(oModel, sModelName, sContextName) {

			BaseAdapter.prototype.constructor.apply(this, arguments);
		}
	});

	ODataBaseAdapter.annotations = Annotations;
	ODataBaseAdapter.utils = Utils;

	/*
	 * Strips the OData key predicate from a resource path segment. @param {string} sSegment @returns {string}
	 */
	ODataBaseAdapter.collectionToArray = function(oCollection) {
		var i, aArray = [];

		if (oCollection && oCollection.length) {
			for (i = 0; i < oCollection.length; i++) {
				aArray.push(oCollection[i].$PropertyPath);
			}
		}

		return aArray;
	};

	ODataBaseAdapter.prototype.ready = function() {
		if (!this.oMetaModel.oMetadataPromise) {
			this.oMetaModel.fetchEntityContainer();
		}
		return this.oMetaModel.oMetadataPromise;
	};

	ODataBaseAdapter.prototype.afterMetaContextSwitch = function() {
		this.sVersion = "4.0";
		Utils.buildSchemaCache(this);
	};
	
	ODataBaseAdapter.prototype.getQualifiers = function() {
		return Utils.getQualifiers(this);
	};

	ODataBaseAdapter.prototype.enabled = function() {
		return Utils.enabled(this);
	};

	ODataBaseAdapter.prototype.tooltip = function() {
		return Utils.getAnnotation("@" + Annotations.QUICKINFO, this);
	};

	ODataBaseAdapter.prototype.label = function() {
		return Utils.getAnnotation("@" + Annotations.LABEL, this);
	};

	ODataBaseAdapter.prototype["//"] = function() {
		return this.schema;
	};

	ODataBaseAdapter.prototype.name = function() {
		return Utils.getAnnotation("@sapui.name",this);
	};

	return ODataBaseAdapter;
});
