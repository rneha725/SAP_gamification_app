sap.ui.define([
	"./AbstractKnowlegdeBase", "sap/ui/mdc/experimental/provider/BaseControlProvider"
], function(AbstractKnowlegdeBase, BaseControlProvider) {
	"use strict";

	var DefaultKnowLedgeBase = AbstractKnowlegdeBase.extend("sap.ui.mdc.experimental.provider.control.DefaultKnowlegdeBase", {
		_mProviders: {
			"sap.ui.mdc.Base": BaseControlProvider.extend("sap.ui.mdc.experimental.provider.control.BaseProvider", {
				driveWithMetadata: function(oControl, oAdapter) {
					this.provideProperty(oControl, "visible", oAdapter.visible);
					this.provideProperty(oControl, "tooltip", oAdapter.tooltip);
				}
			}),
			"sap.m.InputBase": BaseControlProvider.extend("sap.ui.mdc.experimental.provider.control.InputBaseProvider", {
				driveWithMetadata: function(oControl, oAdapter) {
					this._mProviders["sap.ui.mdc.Base"].driveWithMetadata(oControl, oAdapter);

					this.provideProperty(oControl, "editable", oAdapter.enabled);
					this.provideProperty(oControl, "required", oAdapter.required);

					var aLabels = oControl.getLabels();

					for (var i = 0; i < aLabels.length; i++) {
						if (this.canControlBeProvided(aLabels[i], oControl)) {
							this.getProvider(aLabels[i]).driveWithMetadata(aLabels[i], oAdapter);
						}
					}
				}
			}),
			"sap.m.Input": BaseControlProvider.extend("sap.ui.mdc.experimental.provider.control.InputProvider", {
				driveWithMetadata: function(oControl, oAdapter) {
					this._mProviders["sap.m.InputBase"].driveWithMetadata(oControl, oAdapter);

					var type = this.convertToInputType(oAdapter);

					this.provideProperty(oControl, "type", type);

				}
			}),
			"sap.m.Label": BaseControlProvider.extend("sap.ui.mdc.experimental.provider.control.Label", {
				driveWithMetadata: function(oControl, oAdapter) {
					this._mProviders["sap.ui.mdc.Base"].driveWithMetadata(oControl, oAdapter);

					this.provideProperty(oControl, "text", oAdapter.label);
				}
			}),
			"sap.ui.mdc.base.FilterField": BaseControlProvider.extend("sap.ui.mdc.experimental.provider.control.FilterField", {
				driveWithMetadata: function(oControl, oAdapter) {
					this.provideProperty(oControl, "required", oAdapter.required);
					this.provideProperty(oControl, "type", oAdapter.type);
					this.provideProperty(oControl, "fieldPath", oAdapter.path);
					this.provideAggregation(oControl, "conditions", oAdapter.conditions);
					this.providePrepareCloneFunction(oControl, "suggestion", oAdapter.suggestion.bind(oAdapter));
				}
			}),
			"sap.ui.mdc.FlpActionHandler": BaseControlProvider.extend("sap.ui.mdc.experimental.provider.control.FlpActionHandler", {
				driveWithMetadata: function(oControl, oAdapter) {
					var that = this;
					//var sQualifier = this.getQualifier(oControl, oAdapter);
					
					this.provideProperty(oControl, "semanticObject", oAdapter.semanticObject.defaultSemanticObject);
					this.provideProperty(oControl, "additionalSemanticObjects", oAdapter.semanticObject.additionalSemanticObjects);
					this.provideProperty(oControl, "semanticObjectMapping", oAdapter.semanticObjectMapping);

					var sAnnotationPath = oControl.getContactAnnotationPath();
					
					if (sAnnotationPath) {
						oAdapter.parent.then(function(oParent) {
							var oContactObject = oParent.relation(sAnnotationPath);
							
							var fnContact = function(oControl,oContact) {
								jQuery.sap.log.debug("Here has to happen something");
							};
							
							if (oContactObject) {
								var oContact = oContactObject.contactInfo;
								that.provideObject(oControl, oContact, fnContact, "handle the contact annotation");
							}
							
							
						});
						
					}
				}
			})
		}
	});

	DefaultKnowLedgeBase.prototype.getProvider = function(oControl) {
		var sName = oControl.getMetadata().getName();

		return this._mProviders[sName];
	};

	return DefaultKnowLedgeBase;
});
