/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'sap/ui/mdc/base/FieldInfoBase', 'sap/ui/mdc/base/linkinfo/Panel', 'sap/ui/mdc/base/linkinfo/PanelItem', 'sap/ui/mdc/base/linkinfo/ContactDetails', 'sap/m/Link', 'sap/ui/mdc/base/linkinfo/Util', 'sap/ui/model/json/JSONModel', 'sap/ui/core/InvisibleText', 'sap/m/ResponsivePopover', 'sap/ui/mdc/base/linkinfo/Factory'
], function(FieldInfoBase, Panel, PanelItem, ContactDetails, Link, Util, JSONModel, InvisibleText, ResponsivePopover, Factory) {
	"use strict";

	/**
	 * Constructor for a new FlpActionHandler.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class The <code>FlpActionHandler</code> control shows Fiori Launchpad actions and other additional information, for example, contact details. The <code>Field</code> control uses <code>FlpActionHandler</code>.
	 * @extends sap.ui.mdc.base.FieldInfoBase
	 * @version 1.56.5
	 * @constructor
	 * @private
	 * @since 1.54.0
	 * @alias sap.ui.mdc.FlpActionHandler
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var FlpActionHandler = FieldInfoBase.extend("sap.ui.mdc.FlpActionHandler", /** @lends sap.ui.mdc.FlpActionHandler.prototype */
	{
		metadata: {
			library: "sap.ui.mdc",
			specialSettings: {
				metadataContexts: {
					provider: "sap/ui/mdc/experimental/provider/control/FlpActionHandler"
				}
			},
			properties: {
				/**
				 * Name of semantic object which is used to determine navigation targets. </br>
				 * Is the property not set initially, the <code>semanticObject</code> is set automatically
				 * to the semantic object which is annotated in the metadata for the property assigned
				 * in <code>metadataContext</code>.
				 */
				semanticObject: {
					type: "string"
				},
				/**
				 * Names of additional semantic objects which are used to determine navigation targets. </br>
				 * Is the property not set initial, the <code>additionalSemanticObjects</code> is set automatically
				 * to the semantic objects which are annotated in the metadata for the property assigned
				 * in <code>metadataContext</code>.
				 */
				additionalSemanticObjects: {
					type: "string[]",
					defaultValue: []
				},
				/**
				 *
				 */
				semanticObjectMapping: {
					type: "object"
				},
				/**
				 * Determines whether the personalization button is shown inside the panel.
				 */
				enablePersonalization: {
					type: "boolean",
					defaultValue: true
				},
				/**
				 *
				 * @since 1.56.0
				 */
				title: {
					type: "string"
				},
				/**
				 *
				 * @since 1.56.0
				 */
				subTitle: {
					type: "string"
				}
			},
			aggregations: {
				/**
				 *
				 * @since 1.56.0
				 */
				contactDetailsItem: {
					type: "sap.ui.mdc.base.linkinfo.ContactDetailsItem",
					multiple: false
				}
			}
		}
	});

	FlpActionHandler.prototype.init = function() {

		var oModel = new JSONModel({
			popoverTitle: "",
			// Store internally the determined available actions
			availableActions: []
		});
		oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
		oModel.setSizeLimit(1000);
		this.setModel(oModel, "$sapuimdcFlpActionHandler");

		this._proxyOnModelContextChange = jQuery.proxy(this._onModelContextChange, this);
		this.attachModelContextChange(this._proxyOnModelContextChange);
	};

	FlpActionHandler.prototype.exit = function() {
		this.detachModelContextChange(this._proxyOnModelContextChange);
	};

	FlpActionHandler.prototype.setSemanticObject = function(sSemanticObject) {
		this.setProperty("semanticObject", sSemanticObject);
		this._retrieveNavigationTargets();
		return this;
	};

	FlpActionHandler.prototype.setContactDetailsItem = function(oItem) {
		this.setAggregation("contactDetailsItem", oItem);
		this.fireDataUpdate();
		return this;
	};

	// ----------------------- Implementation of abstract methods --------------------------------------------

	FlpActionHandler.prototype.isTriggerable = function() {
		// Extra content should be shown always
		if (this._hasExtraContent()) {
			return true;
		}
		// If only one action exists (independent whether it is visible or not), it should be triggerable.
		// Reason is that the visibility can be personalized. So e.g. if only one action is
		// visible the end user should be able to personalize the actions again. This can the end user
		// only do when the direct navigation is not executed.
		return this._getTriggerableActions().length > 0;
	};
	FlpActionHandler.prototype.getDirectLink = function() {
		// Extra content should be shown always, no direct navigation possible
		if (this._hasExtraContent()) {
			return null;
		}

		// If only one action exists (independent whether it is visible or not), direct navigation is
		// possible. Reason is that the visibility can be personalized. So e.g. if only one action is
		// visible the end user should be able to personalize the actions again. This can the end user
		// only do when the direct navigation is not executed.
		var aActionsTriggerable = this._getTriggerableActions();
		if (aActionsTriggerable.length !== 1) {
			return null;
		}
		return new Link({
			text: aActionsTriggerable[0].text,
			target: aActionsTriggerable[0].target,
			href: aActionsTriggerable[0].href
		});
	};
	FlpActionHandler.prototype.createPopover = function() {

		// var oMetadata = this.getParent().getModel().getMetaModel();
		// oMetadata.requestObject('/Z_FE_PRODUCTS/@com.sap.vocabularies.UI.v1.LineItem').then(function(r) {
		// 	window.console.log(r);
		// });
		// oMetadata.requestObject('/Z_FE_PRODUCTS/@com.sap.vocabularies.Communication.v1.Contact').then(function(r) {
		// 	window.console.log(r);
		// });



		var oModel = this._getInternalModel();
		var oInvisibleText = new InvisibleText({
			text: oModel.getProperty("/popoverTitle")
		});
		var that = this;

		return this.getPopoverContent().then(function(oPopoverContent) {

			return new ResponsivePopover({
				contentWidth: "380px",
				horizontalScrolling: false,
				showHeader: sap.ui.Device.system.phone,
				placement: sap.m.PlacementType.Auto,
				ariaLabelledBy: oInvisibleText,
				content: [
					oPopoverContent, oInvisibleText
				],
				beforeClose: function() {
					this.destroyContent();
				},
				afterClose: function() {
					var oPopover = that.getPopover();
					if (oPopover) {
						oPopover.destroy();
					}
				}
			});
		});
	};
	FlpActionHandler.prototype.getPopoverContent = function() {
		var sStableID = this._getNavigationContainerStableId();
		if (!sStableID) {
			jQuery.sap.log.error("FlpActionHandler: Due to undefined stable ID the button of action personalization is set to disabled");
		}

		var oContactDetails;
		if (this.getContactDetailsItem()) {
			var oContactDetailsItem = this.getContactDetailsItem();
			oContactDetails = new ContactDetails({
				items: oContactDetailsItem.clone()
			});
			oContactDetails.setModel(this.getModel());
			oContactDetails.bindElement({
				path: this.getBindingContext().getPath(),
				parameters: oContactDetailsItem.getParameters()
			// events: {
			// 	change: function() {
			// oContactDetails.invalidate();
			// var bvis = oContactDetails.getVisible();
			// 	}
			// }
			});
		}
		this._updateMainItemInformation();

		var oPanel = new Panel({
			items: {
				path: '$sapuimdcFlpActionHandler>/availableActions',
				templateShareable: false,
				template: new PanelItem({
					// key: "{$sapuimdcFlpActionHandler>key}",
					href: "{$sapuimdcFlpActionHandler>href}",
					text: "{$sapuimdcFlpActionHandler>text}",
					description: "{$sapuimdcFlpActionHandler>description}",
					target: "{$sapuimdcFlpActionHandler>target}",
					visible: "{$sapuimdcFlpActionHandler>visible}",
					icon: "{$sapuimdcFlpActionHandler>icon}",
					isMain: "{$sapuimdcFlpActionHandler>isMain}"
				})
			},
			extraContent: oContactDetails,
			enablePersonalization: this.getEnablePersonalization() && !!sStableID
		});

		// oNavigationContainer._getFlexHandler().setInitialSnapshot(FlexHandler.convertArrayToSnapshot("key", oModel.getProperty("/availableActions")));
		oPanel.setModel(this._getInternalModel(), "$sapuimdcFlpActionHandler");
		return Promise.resolve(oPanel);
	};

	// ----------------------- Private methods --------------------------------------------

	FlpActionHandler.prototype._onModelContextChange = function() {
		if (!this.getBindingContext()) {
			return;
		}

		this._retrieveNavigationTargets();

		// this._setBindingPath4ContactAnnotation();
	};

	FlpActionHandler.prototype._retrieveNavigationTargets = function() {
		var sSemanticObjectDefault = this.getSemanticObject();
		var aAdditionalSemanticObjects = this.getAdditionalSemanticObjects() || [];
		var sAppStateKey = "";
		var oControl = this.getControl();
		var oComponent = this._getAppComponentForControl(oControl);
		var oSemanticAttributes = this._calculateSemanticAttributes(sSemanticObjectDefault, aAdditionalSemanticObjects, this.getSemanticObjectMapping(), oControl && oControl.getBindingContext() || undefined);

		Util.retrieveNavigationTargets(sSemanticObjectDefault, aAdditionalSemanticObjects, sAppStateKey, oComponent, oSemanticAttributes).then(function(oNavigationTargets) {
			var oModel = this._getInternalModel();
			var aAvailableActions = oNavigationTargets.availableActions;
			if (oNavigationTargets.mainNavigation) {
				aAvailableActions.push(oNavigationTargets.mainNavigation);
				// oModel.setProperty("/popoverTitle", oNavigationTargets.mainNavigation.text);
			}
			oModel.setProperty("/availableActions", this._updateVisibilityOfAvailableActions(aAvailableActions));

			this.fireDataUpdate();
		}.bind(this));
	};

	FlpActionHandler.prototype._calculateSemanticAttributes = function(sSemanticObjectDefault, aAdditionalSemanticObjects, oSemanticObjectMapping, oBindingContext) {
		if (!oBindingContext || (!sSemanticObjectDefault && !(aAdditionalSemanticObjects && aAdditionalSemanticObjects.length))) {
			return {};
		}

		var oResults = {};
		var oContext = oBindingContext.getObject(oBindingContext.getPath());
		var aSemanticObjects = [
			sSemanticObjectDefault
		].concat(aAdditionalSemanticObjects);

		aSemanticObjects.forEach(function(sSemanticObject) {
			oResults[sSemanticObject] = {};
			for ( var sAttributeName in oContext) {
				// Ignore metadata
				if (sAttributeName === "__metadata") {
					continue;
				}
				// Ignore undefined and null values
				if (oContext[sAttributeName] === undefined || oContext[sAttributeName] === null) {
					continue;
				}
				// Ignore plain objects (BCP 1770496639)
				if (jQuery.isPlainObject(oContext[sAttributeName])) {
					continue;
				}
				// Ignore attribute which is not defined in semanticObjectMapping
				if (oSemanticObjectMapping && (!oSemanticObjectMapping[sSemanticObject] || !oSemanticObjectMapping[sSemanticObject][sAttributeName])) {
					continue;
				}

				// Map the attribute name only if 'semanticObjectMapping' is defined.
				// Note: under defined 'semanticObjectMapping' also empty annotation, annotation with empty record and so on is meant
				var sAttributeNameMapped = oSemanticObjectMapping ? oSemanticObjectMapping[sSemanticObject][sAttributeName] : sAttributeName;

				// If more then one local property maps to the same target property (clash situation)
				// we take the value of the last property and write an error log
				if (oResults[sSemanticObject][sAttributeNameMapped]) {
					jQuery.sap.log.error("During the mapping of the attribute " + sAttributeName + " a clash situation is occurred. This can lead to wrong navigation later on.");
				}

				// Copy the value replacing the attribute name by semantic object name
				oResults[sSemanticObject][sAttributeNameMapped] = oContext[sAttributeName];
			}
		});
		return oResults;
	};

	FlpActionHandler.prototype._onAvailableActionsPersonalizationPress = function(oEvent) {
		var that = this;
		var oPanel = oEvent.getSource();

		this.getPopover().setModal(true);
		oPanel.openSelectionDialog(false, true, undefined, true, undefined).then(function() {
			// Note: in the meantime the oPopover could be closed outside of FlpActionHandler, so we have to check if the instance still exists
			if (that.getPopover()) {
				that.getPopover().setModal(false);
			}
		});
	};

	FlpActionHandler.prototype._updateVisibilityOfAvailableActions = function(aMAvailableActions) {
		// TODO
		// if (!this._getEnabledAvailableActionsPersonalizationTotal()) {
		// 	return;
		// }

		// Update the 'visible' attribute only for storable (i.e. actions with filled 'key') availableActions.
		var aMValidAvailableActions = Util.getStorableAvailableActions(aMAvailableActions);
		var bHasSuperiorAction = aMValidAvailableActions.some(function(oMAvailableAction) {
			return !!oMAvailableAction.isSuperiorAction;
		});
		aMValidAvailableActions.forEach(function(oMAvailableAction, iIndex) {
			// Do not show actions as 'Related Apps' in case of many actions. Exception: the action without 'key' which should be shown always.
			if (aMAvailableActions.length > 10) {
				oMAvailableAction.visible = false;
			}
			// If at least one superiorAction exists, do not show other actions
			if (bHasSuperiorAction) {
				oMAvailableAction.visible = false;
			}
			// Show always superiorAction
			if (oMAvailableAction.isSuperiorAction) {
				oMAvailableAction.visible = true;
			}
		});
		return aMAvailableActions;
	};
	FlpActionHandler.prototype._getExtraContent = function() {
		var oContactDetailsItem = this.getContactDetailsItem();
		if (!oContactDetailsItem) {
			return null;
		}
		var oContactDetails = new ContactDetails({
			items: oContactDetailsItem.clone()
		});
		oContactDetails.setModel(this.getModel());
		oContactDetails.bindElement({
			path: this.getBindingContext().getPath(),
			parameters: oContactDetailsItem.getParameters()
		// events: {
		// 	change: function() {
		// oContactDetails.invalidate();
		// var bvis = oContactDetails.getVisible();
		// 	}
		// }
		});
	};
	FlpActionHandler.prototype._updateMainItemInformation = function() {
		var oModel = this._getInternalModel();
		var aAvailableActions = oModel.getProperty("/availableActions");
		var iIndexOfMainAction = Util.getIndexByKey("isMain", true, aAvailableActions);
		if (iIndexOfMainAction < 0) {
			iIndexOfMainAction = aAvailableActions.length;
			oModel.setProperty("/availableActions/" + iIndexOfMainAction + "/", {
				isMain: true
			});
		}
		// Value of the field has higher priority then 'text' coming from FLP action. And value of the
		// TextArrangement annotation has higher priority then the value of the field.
		oModel.setProperty("/availableActions/" + iIndexOfMainAction + "/text", this.getTitle());

		// Text of TextArrangement has higher priority as 'description' coming from FLP action
		if (this.getSubTitle()) {
			oModel.setProperty("/availableActions/" + iIndexOfMainAction + "/description", this.getSubTitle());
		}
	};
	FlpActionHandler.prototype._getNavigationContainerStableId = function() {
		var oControl = this.getControl();
		if (!oControl) {
			jQuery.sap.log.error("FlpActionHandler: Stable ID could not be determined because the control is undefined");
			return undefined;
		}
		var oAppComponent = this._getAppComponentForControl(oControl);
		if (!oAppComponent) {
			jQuery.sap.log.error("FlpActionHandler: Stable ID could not be determined because the app component is not defined for control '" + oControl.getId() + "'");
			return undefined;
		}
		var aSemanticObjects = [
			this.getSemanticObject()
		].concat(this.getAdditionalSemanticObjects());
		Util.sortArrayAlphabetical(aSemanticObjects);
		if (!aSemanticObjects.length) {
			jQuery.sap.log.error("FlpActionHandler: Stable ID could not be determined because the property 'persistencyKey' is not defined");
			return undefined;
		}
		return oAppComponent.createId("sapuimdcbaseactionActionHandler---" + aSemanticObjects.join("--"));
	};

	FlpActionHandler.prototype._getTriggerableActions = function() {
		var oModel = this._getInternalModel();
		return oModel.getProperty('/availableActions').filter(function(oAction) {
			return !!oAction.href;
		});
	};
	FlpActionHandler.prototype._hasExtraContent = function() {
		return !!this.getContactDetailsItem();
	};
	FlpActionHandler.prototype._getInternalModel = function() {
		return this.getModel("$sapuimdcFlpActionHandler");
	};
	FlpActionHandler.prototype._getAppComponentForControl = function(oControl) {
		return Factory.getService("FlUtils").getAppComponentForControl(oControl);
	};

	return FlpActionHandler;

}, /* bExport= */true);
