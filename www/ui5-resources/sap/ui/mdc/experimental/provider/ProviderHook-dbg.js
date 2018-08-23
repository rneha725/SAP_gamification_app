sap.ui.define([
	"sap/ui/base/ManagedObject", "sap/ui/mdc/experimental/provider/adapter/AdapterFactory", "sap/ui/mdc/experimental/provider/control/Utils", "sap/ui/mdc/experimental/provider/control/ControlRegistry", "sap/ui/core/XMLTemplateProcessor", "sap/ui/core/util/XMLPreprocessor"
], function(ManagedObject, AdapterFactory, Utils, ControlRegistry, XMLTemplateProcessor, XMLPreprocessor) {
	"use strict";

	/**
	 * @private
	 */
	var ProviderHook = {};

	/**
	 * Hook that defines Managed Object Hook Methods
	 */
	ProviderHook.apply = function() {
		if (XMLTemplateProcessor._preprocessMetadataContexts) {
			//do not overrule feature switch of adaper
			return;
		}
		XMLTemplateProcessor._preprocessMetadataContexts = function(sClassName, mSettings, oContext) {
			if (mSettings.metadataContexts) {
				for ( var key in mSettings.metadataContexts) {
					for (var i = 0; i < mSettings.metadataContexts[key].length; i++) {
						ProviderHook._resolveMetadataContextPath(mSettings.metadataContexts[key][i]);
					}
				}
			}
		};

		ProviderHook._resolveMetadataContextPath = function(oMetadataContext) {
			if (!oMetadataContext) {
				return;
			}

			oMetadataContext.path = oMetadataContext.path || '';// per default the path is empty

			oMetadataContext.relative = oMetadataContext.path[0] !== '/';

			if (oMetadataContext.model == '') {
				oMetadataContext.model = undefined;
			}

			if (!oMetadataContext.kind) {
				oMetadataContext.kind = 'field';// the bound contexts is in a field relation
			}

			oMetadataContext.name = oMetadataContext.name || oMetadataContext.model;
		};

		/**
		 * Process the metadataContexts special setting in order to let the control be driven by metadata
		 * 
		 * @param {object} oMetadatas Contexts The metadataContexts special setting
		 * @param {object} oSettings The ManagedObject settings
		 * @private
		 */
		ManagedObject.prototype._processMetadataContexts = function(oMetadataContexts, oSettings) {
			var aMetadataContexts, oMetadataContext, oKeyProviderData;
			this._oProviderData = {
				contexts: null,
				mProvidedProperties: {},
				mProvidedFunctions: {}
			};

			for ( var key in oMetadataContexts) {
				aMetadataContexts = oMetadataContexts[key];

				for (var i = 0; i < aMetadataContexts.length; i++) {
					oMetadataContext = aMetadataContexts[i];

					if (!ProviderHook._sanityChecks(oMetadataContext)) {
						continue;
					}

					oKeyProviderData = {};

					oKeyProviderData.metadata = oMetadataContext;
					oKeyProviderData.relative = oMetadataContext.relative;

					this._oProviderData.contexts = this._oProviderData.contexts || {};
					this._oProviderData.contexts[oMetadataContext.name] = oKeyProviderData;
				}
			}

			if (this._oProviderData.contexts) {
				this.attachModelContextChange(ProviderHook._handleModelContextChange, ProviderHook);
			}

		};
	};

	ProviderHook.registerVisitors = function(aAdapterClasses, aClasses) {
		var i = 0;

		for (i = 0; i < aClasses.length; i++) {
			ControlRegistry.visitControl(aClasses[i].getMetadata());
		}

		for (i = 0; i < aAdapterClasses.length; i++) {
			var sClassName = aAdapterClasses[i].replace(new RegExp("/", "g"), ".");
			jQuery.sap.require(sClassName);
			AdapterFactory.cacheAdapterClass(aAdapterClasses[i], jQuery.sap.getObject(sClassName));
		}

		ProviderHook.registerTemplating();
	};

	ProviderHook.registerTemplating = function() {
		var i, aNodes = ControlRegistry.getTemplateNodes();

		var fnPreprocess = function(oNode, oCallback) {
			var oMdCtxAttr = oNode.getAttribute("metadataContexts");

			if (oMdCtxAttr) {
				var aMetadataContexts, oMetadataContext, oMetadataContexts = XMLTemplateProcessor._calculatedModelMapping(oMdCtxAttr, null, true);
				for ( var key in oMetadataContexts) {
					aMetadataContexts = oMetadataContexts[key];

					for (var i = 0; i < aMetadataContexts.length; i++) {
						oMetadataContext = aMetadataContexts[i];
						var bRelative = ProviderHook._resolveMetadataContextPath(oMetadataContext);
						if (!bRelative && oMetadataContext.preprocessModel) {
							ProviderHook.resolveContexts(oNode, oCallback, oMetadataContext);
						}
					}
				}
			} 
			
			oCallback.visitAttributes(oNode);
		};

		for (i = 0; i < aNodes.length; i++) {
			var oNodeInfo = Utils.getNameSpaceInfo(aNodes[i]);

			XMLPreprocessor.plugIn(fnPreprocess, oNodeInfo.nameSpace, oNodeInfo.localName);
		}
	};

	ProviderHook.resolveContexts = function(oNode, oCallback, oMetadataContext) {
		var oContextCallback, oModel = oCallback.getSettings().models[oMetadataContext.preprocessModel];

		if (!oModel) {
			var oViewInfo = oCallback.getViewInfo();
			var oComponent = sap.ui.getCore().getComponent(oViewInfo.componentId);
			oModel = oComponent ? oComponent.oModels[oMetadataContext.preprocessModel] : null;
			var mVariables = {};
			mVariables[oMetadataContext.model] = oModel ? oModel.getContext("/") : null;
			// Add Model context
			oContextCallback = oCallback["with"](mVariables, false);
			// check if the is metadataContext for model
		} else {
			oContextCallback = oCallback;
		}

		if (oModel) {
			var sClassName = Utils.className(oNode);
			var oAdapter = AdapterFactory.getAdapter(oModel, oMetadataContext);
			var oProvider = ControlRegistry.getProvider(sClassName);

			if (oProvider && oAdapter) {
				oProvider.renderWithMetadata(oNode, oContextCallback, oAdapter);
			}
		}
	};

	/**
	 * Handler for model context change in order to provide the property
	 * 
	 * @param {object} oEvent The event
	 * @private
	 */
	ProviderHook._handleModelContextChange = function(oEvent) {
		var oControl = oEvent.getSource();

		for ( var key in oControl._oProviderData.contexts) {
			ProviderHook._driveWithMetadata(oControl._oProviderData.contexts[key], oControl);
		}
	};

	/**
	 * Actual metadata provisioning
	 * 
	 * @param {object} oProvider The provider data.
	 * @private
	 */
	ProviderHook._driveWithMetadata = function(oProviderData, oControl) {
		if (!oProviderData.model) {
			oProviderData.model = oControl.getModel(oProviderData.metadata.model);
		}

		if (!oProviderData.model) {
			// waiting for a context is only needed if no context was given and path is relative
			jQuery.sap.log.debug("Metadata context cannot be resolved yet");
			return;
		}

		if (oProviderData.relative) {
			var sCtx = oControl.getBindingContext(oProviderData.metadata.model);
			if (!sCtx) {
				// waiting for a context is only needed if no context was given and path is relative
				jQuery.sap.log.debug("Metadata context cannot be resolved yet");
				return;
			} else {
				oProviderData.metadata.path = sCtx + "/" + oProviderData.metadata.path;
				delete oProviderData.relative;
			}
		}

		// already loaded dive now
		var sClassName = oControl.getMetadata()._sClassName;
		ControlRegistry.requestProvider(sClassName).then(function(oProvider) {
			AdapterFactory.requestAdapter(oProviderData.model, oProviderData.metadata).then(function(oAdapter) {
				if (!oProvider.isProvided(oControl)) {
					oProvider.driveWithMetadata(oControl, oAdapter);
					oProvider.setProvided(oControl, true);
				}
			});
		});
	};

	/**
	 * @param {object} oMetadataContext The value for the special setting for metadata context
	 * @private
	 */
	ProviderHook._sanityChecks = function(oMetadataContext) {

		if (!oMetadataContext) {
			jQuery.sap.log.warning("No metadata context available");
			return false;
		}
		
		if (oMetadataContext.preprocessModel) {
			jQuery.sap.log.warning("Context is for preprocessing");
			return false;
		}

		// when is this ever a string? If there are good reasons to support string here, the contract with XMLTemplateProcessor can be
		// different.
		// XMLTemplateProcessor can then pass only a string and we do the parsing ourselves always.
		if (typeof oMetadataContext == "string") {
			oMetadataContext = ManagedObject.bindingParser(oMetadataContext);
		}
		if (!oMetadataContext.hasOwnProperty("path") || typeof oMetadataContext.path !== "string") {
			jQuery.sap.log.warning("Metadata context is missing a path or path is not a string");
			return false;
		}

		if (!oMetadataContext.hasOwnProperty("relative")) {
			oMetadataContext.relative = !oMetadataContext.hasOwnProperty("context");
		} else if (typeof oMetadataContext.relative !== "boolean") {
			jQuery.sap.log.warning("Metadata relative information must be a boolean");
			return false;
		}

		if (oMetadataContext.hasOwnProperty("context") && typeof oMetadataContext.context !== "string") {
			jQuery.sap.log.warning("Metadata context needs no context or a context path of type string");
			return false;
		}

		if (!oMetadataContext.hasOwnProperty("model")) {
			oMetadataContext.model = undefined;
			jQuery.sap.log.debug("Metadata context is missing a model, assuming undefined model");
		}

		if (!oMetadataContext.hasOwnProperty("name")) {
			oMetadataContext.name = oMetadataContext.model;
			jQuery.sap.log.debug("Metadata context is missing a contexts name, assuming the name of the model");
		}

		return true;
	};

	return ProviderHook;
});
