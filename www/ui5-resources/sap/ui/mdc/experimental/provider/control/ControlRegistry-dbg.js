sap.ui.define([
	"./Utils", "sap/ui/mdc/experimental/provider/BaseControlProvider", "sap/ui/mdc/experimental/provider/control/DefaultKnowledgeBase"
], function(Utils, ControlProvider, DefaultKnowledgeBase) {
	"use strict";

	/**
	 * @public
	 */
	var ControlRegistry = {
		_DefaultProvider: "sap/ui/mdc/experimental/provider/control/DefaultProvider",
		ControlProvider: ControlProvider,
		Utils: Utils,
		_aTemplatingNodes: [
			"sap.m.Label", "sap.ui.mdc.base.FilterField"
		],
		mProviderCache: {},
		mProviderPromiseCache: {}
	};

	ControlRegistry.visitControl = function(oMetadata) {
		ControlRegistry._aTemplatingNodes.push(oMetadata._sClassName);

		var sProviderPath = ControlRegistry.getProviderPath(oMetadata);
		var sProviderClass = sProviderPath.replace(new RegExp("[/]", "g"), ".");

		jQuery.sap.require(sProviderClass);
		var Provider = jQuery.sap.getObject(sProviderClass);
		ControlRegistry.mProviderCache[oMetadata._sClassName] = Provider ? new Provider() : null;
	};

	ControlRegistry.getTemplateNodes = function() {
		return ControlRegistry._aTemplatingNodes;
	};

	ControlRegistry.setDefaultProvider = function(sDefaultProvider) {
		ControlRegistry._DefaultProvider = sDefaultProvider;
	};

	ControlRegistry.getProvider = function(sClassName) {
		return ControlRegistry.mProviderCache[sClassName];
	};

	ControlRegistry.requestProvider = function(sClassName) {
		if (!ControlRegistry.mProviderPromiseCache[sClassName]) {
			ControlRegistry.mProviderPromiseCache[sClassName] = new Promise(function(resolve, reject) {
				if (ControlRegistry.mProviderCache[sClassName]) {
					resolve(ControlRegistry.mProviderCache[sClassName]);
				} else {
					var sClassPath = sClassName.replace(new RegExp("[.]", "g"), "/");
					sap.ui.require([
						sClassPath
					], function(oClass) {
						var oMetadata = oClass.getMetadata(), sProviderPath = ControlRegistry.getProviderPath(oMetadata);

						sap.ui.require([
							sProviderPath
						], function(Provider) {
							ControlRegistry.mProviderCache[sClassName] = new Provider();
							resolve(ControlRegistry.mProviderCache[sClassName]);
						});
					});
				}
			});
		}

		return ControlRegistry.mProviderPromiseCache[sClassName];
	};

	ControlRegistry.getProviderPath = function(oMetadata) {
		var sProviderPath;

		if (oMetadata._mSpecialSettings.metadataContexts && oMetadata._mSpecialSettings.metadataContexts.appData && oMetadata._mSpecialSettings.metadataContexts.appData.provider) {
			sProviderPath = oMetadata._mSpecialSettings.metadataContexts.appData.provider;
		} else {
			sProviderPath = ControlRegistry._DefaultProvider;
		}

		return sProviderPath;
	};

	ControlRegistry.getTemplatingFunction = function(oNode) {
		var sName = "";
		if (typeof oNode === 'string') {
			sName = oNode;
		} else {
			sName = Utils.className(oNode);
		}

		var fnVisitor = ControlRegistry._mTemplatingFunctions[sName];

		if (fnVisitor != null) {
			return fnVisitor;
		} else {
			return ControlRegistry._mTemplatingFunctions["sap.ui.mdc.Base"];
		}
	};

	/**
	 * Cleans the registry of controls
	 * 
	 * @param {boolean} bProvider If set to true, then the provider functions are cleaned, defaultValue is true
	 * @param {boolean} bTemplating If set to true, then the templating functions are cleaned
	 */
	ControlRegistry.cleanRegistry = function(bProvider, bTemplating) {
		bProvider = (bProvider == null) ? true : bProvider;

		if (bProvider) {
			ControlRegistry._mProviderFunctions = {};
		}

		bTemplating = (bTemplating == null) ? true : bTemplating;

		if (bTemplating) {
			ControlRegistry._mTemplatingFunctions = {};
		}
	};

	ControlRegistry.resolveMetadataContextsDeep = function(oNode, oContextCallback, oAdapter, oMdCtxAttr) {
		var aChildren = oNode.children, i = 0;
		for (i = 0; i < aChildren.length; i++) {
			var sClassName = Utils.className(aChildren[i]);

			if (sClassName && !aChildren[i].getAttribute("metadataContexts") && ControlRegistry._mTemplatingFunctions[sClassName]) {
				aChildren[i].setAttribute("metadataContexts", oMdCtxAttr);
			} else {
				ControlRegistry.resolveMetadataContextsDeep(aChildren[i], oContextCallback, oAdapter, oMdCtxAttr);
			}
		}
	};

	ControlRegistry.determineWithModel = function(oNode) {
		var oParent = oNode;

		while (oParent && !oParent.hasAttribute("var")) {
			oParent = oParent.parentElement;
		}

		if (oParent) {
			return oParent.getAttribute("var");
		}
		return null;
	};

	return ControlRegistry;
});
