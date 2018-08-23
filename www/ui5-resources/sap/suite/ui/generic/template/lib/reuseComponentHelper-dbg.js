sap.ui.define([],
	function() {
		"use strict";
		
		var mEmbeddedComponents = Object.create(null);  // Temporary map

		function fnEmbeddedComponentMixInto(oEmbeddedComponent, oProxy){
			mEmbeddedComponents[oEmbeddedComponent.getId()] = oProxy;	
		}
				
		function fnTransferEmbeddedComponentProxy(oComponentRegistryEntry, mReuseComponentProxies, sEmbeddedKey, oEmbeddedComponentMeta, oEmbeddedComponent){
			var sEmbeddedComponentId = oEmbeddedComponent.getId();
			var oProxy = mEmbeddedComponents[sEmbeddedComponentId];
			delete mEmbeddedComponents[sEmbeddedComponentId];
			oProxy.fnExtensionAPIAvailable(oEmbeddedComponentMeta.extensionAPI);
			delete oProxy.fnExtensionAPIAvailable;
			mReuseComponentProxies[sEmbeddedKey] = oProxy;
		}
		
		return {
			embeddedComponentMixInto: fnEmbeddedComponentMixInto,
			transferEmbeddedComponentProxy: fnTransferEmbeddedComponentProxy
		};
	});