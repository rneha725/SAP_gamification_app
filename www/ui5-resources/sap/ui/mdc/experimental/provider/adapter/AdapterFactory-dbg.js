sap.ui.define([
	"sap/ui/model/MetaModel"
], function(MetaModel) {
	"use strict";

	/**
	 * @public
	 */
	var Factory = {
		adapterCache: {},
		promiseCache: {},
		defaultAdapter: {
			v2: {
				"field": "sap/ui/mdc/experimental/provider/adapter/odata/v2/ODataFieldAdapter",
				"object": "sap/ui/mdc/experimental/provider/adapter/odata/v2/ODataObjectAdapter"
			},
			v4: {
				"field": "sap/ui/mdc/experimental/provider/adapter/odata/v4/ODataFieldAdapter",
				"object": "sap/ui/mdc/experimental/provider/adapter/odata/v4/ODataObjectAdapter"
			}
		},
		adapterClassCache: {
		}
	};

	/**
	 * Return a promise
	 */
	Factory.requestAdapter = function(oModel, oMetaContext) {
		var oKeyInfo = Factory._getKeyInfo(oModel, oMetaContext);
		
		function prepareAdapter(oAdapter,oMetaContext, resolve) {
			oAdapter.ready().then(function() {
				oAdapter.switchMetaContext(null,oMetaContext.path);
				Factory.adapterCache[oKeyInfo.key] = oAdapter;
				resolve(oAdapter);
			});
		}

		if (!oModel.getMetaModel()) {
			throw new Error("sap.ui.mdc.experimental.provider.model.ModelAdapterFactory: Only models with meta model are allowed");
		}

		if (!Factory.promiseCache[oKeyInfo.key]) {
			Factory.promiseCache[oKeyInfo.key] = new Promise(function(resolve, reject) {
				var oAdapter = Factory.getAdapter(oModel, oMetaContext, true); // do not switch the context
				if (oAdapter) {
					prepareAdapter(oAdapter, oMetaContext,resolve);
				} else {
					sap.ui.require([
						oMetaContext.adapter
					], function(Adapter) {
						Factory.cacheAdapterClass(oMetaContext.adapter, Adapter);
						var oAdapter = new Adapter(oModel, oMetaContext.model, oMetaContext.name);
						if (oAdapter) {
							prepareAdapter(oAdapter, oMetaContext,resolve);
						} else {
							reject("Invalid class");
						}
					});
				}
			});
		}

		return Factory.promiseCache[oKeyInfo.key];
	};
	
	Factory.newAdapter = function(sKind, oModel, sModelName, sContextName, sFieldPath) {
		var oMetaContext = {
			model: sModelName,
			name: sContextName,
			kind: sKind,
			path: sFieldPath
		};

		return this.requestAdapter(oModel, oMetaContext);
	};

	Factory.getAdapter = function(oModel, oMetaContext, bNoSwitch) {
		var oKeyInfo = Factory._getKeyInfo(oModel, oMetaContext);

		var oCachedAdapter = Factory.adapterClassCache[oKeyInfo.adapter];

		if (!oModel.getMetaModel()) {
			throw new Error("sap.ui.mdc.experimental.provider.model.ModelAdapterFactory: Only models with meta model are allowed");
		}

		if (Factory.adapterCache[oKeyInfo.key]) {
			return Factory.adapterCache[oKeyInfo.key];
		} else if (oCachedAdapter) {
			Factory.adapterCache[oKeyInfo.key] = new oCachedAdapter(oModel, oMetaContext.model, oMetaContext.name);
			if (!bNoSwitch) {
				Factory.adapterCache[oKeyInfo.key].switchMetaContext(oMetaContext.metaPath,oMetaContext.path);
			}
			return Factory.adapterCache[oKeyInfo.key];
		}

		return null;
	};

	Factory._getKeyInfo = function(oModel, oMetaContext) {
		if (!oMetaContext.adapter) {
			if (oModel.getMetadata()._sClassName == "sap.ui.model.odata.v4.ODataModel") {
				oMetaContext.adapter = Factory.defaultAdapter.v4[oMetaContext.kind];
			} else {
				oMetaContext.adapter = Factory.defaultAdapter.v2[oMetaContext.kind];
			}
		}

		var oKeyInfo = {
			adapter: oMetaContext.adapter,
			modelName: oMetaContext.model,
			context: oMetaContext.name,
			path: oMetaContext.path,
			key: oModel.getId() + ">" + oMetaContext.name + ">" + oMetaContext.path + ">" + oMetaContext.adapter
		};

		return oKeyInfo;
	};

	Factory.cacheAdapterClass = function(sAdapterClass, Adapter) {
		Factory.adapterClassCache[sAdapterClass] = Adapter;
	};

	return Factory;
});