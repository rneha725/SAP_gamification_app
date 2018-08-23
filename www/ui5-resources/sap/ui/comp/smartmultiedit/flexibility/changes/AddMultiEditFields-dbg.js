/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

sap.ui.define([
		"jquery.sap.global",
		"sap/ui/fl/Utils",
		"sap/ui/fl/changeHandler/Base",
		"sap/ui/core/util/reflection/JsControlTreeModifier",
		"sap/ui/comp/smartmultiedit/Container"
	], function (jQuery, Utils, Base, JsControlTreeModifier, Container) {
		"use strict";

		/**
		 * Change handler for adding a smart form group element (representing one or more fields).
		 *
		 * @alias sap.ui.fl.changeHandler.AddFields
		 * @author SAP SE
		 * @version 1.56.5
		 */
		var AddMultiEditFields = {};

		/**
		 * Adds a smart form group element incl. one or more value controls.
		 *
		 * @param {sap.ui.fl.Change} oChange change wrapper object with instructions to be applied on the control map
		 * @param {sap.ui.comp.smartform.Group|Element} oGroup group control or xml element that matches the change selector for applying the change
		 * @param {object} mPropertyBag - property bag
		 * @param {sap.ui.core.util.reflection.BaseTreeModifier} mPropertyBag.modifier - modifier for the controls
		 * @param {sap.ui.core.UIComponent} mPropertyBag.appComponent - component in which the change should be applied
		 * @param {object} mPropertyBag.view - view object or xml element representing an ui5 view
		 * @return {boolean} true if successfully added
		 * @public
		 */
		AddMultiEditFields.applyChange = function (oChange, oGroup, mPropertyBag) {
			var oChangeDefinition = oChange.getDefinition(),
				oModifier = mPropertyBag.modifier,
				oView = mPropertyBag.view,
				oField, oContainer,
				fnCheckChangeDefinition = function (oChangeDefinition) {
					var bContentPresent = oChangeDefinition.content,
						bMandatoryContentPresent = false;

					if (bContentPresent) {
						bMandatoryContentPresent = oChangeDefinition.content.field
							&& (oChangeDefinition.content.field.selector || oChangeDefinition.content.field.id)
							&& oChangeDefinition.content.field.jsType
							&& oChangeDefinition.content.field.propertyName;
					}

					return bContentPresent && bMandatoryContentPresent;
				};

			if (fnCheckChangeDefinition(oChangeDefinition)) {
				var oFieldSelector = oChangeDefinition.content.field.selector;
				var sFieldId = oChangeDefinition.content.field.id;

				var insertIndex = oChangeDefinition.content.field.index;
				var oGroupElement = oModifier.createControl("sap.ui.comp.smartform.GroupElement", mPropertyBag.appComponent, oView, oFieldSelector || sFieldId);

				var sJsType = oChangeDefinition.content.field.jsType;
				var sPropertyName = oChangeDefinition.content.field.propertyName;
				var oEntitySet = oChangeDefinition.content.field.entitySet;

				oField = this.addElementIntoGroupElement(oModifier, oView, oGroupElement, sJsType, sPropertyName, oEntitySet, mPropertyBag.appComponent);
				oModifier.insertAggregation(oGroup, "groupElements", oGroupElement, insertIndex);

				// Index the new sap.ui.comp.smartmultiedit.Field in it's sap.ui.comp.smartmultiedit.Container
				if (oGroup && oGroup.getParent() && oGroup.getParent().getParent() && oGroup.getParent().getParent().getParent()) {
					oContainer = oGroup.getParent().getParent().getParent();
					if (oContainer instanceof Container) {
						oContainer.indexField(oField);
					}
				}

				return true;
			} else {
				Utils.log.error("Change does not contain sufficient information to be applied: [" + oChangeDefinition.layer + "]"
					+ oChangeDefinition.namespace + "/" + oChangeDefinition.fileName + "." + oChangeDefinition.fileType);
				// however subsequent changes should be applied
			}
		};

		AddMultiEditFields.addElementIntoGroupElement = function (oModifier, oView, oGroupElement, sJsType, sPropertyName, sEntitySet, oAppComponent) {
			var oValueControl = oModifier.createControl(sJsType, oAppComponent, oView);
			oModifier.setProperty(oValueControl, "propertyName", sPropertyName);
			oModifier.insertAggregation(oGroupElement, "elements", oValueControl, 0, oView, true);
			if (sEntitySet) {
				oModifier.setProperty(oValueControl, "entitySet", sEntitySet);
			}

			return oValueControl;
		};

		/**
		 * Completes the change by adding change handler specific content.
		 *
		 * @param {sap.ui.fl.Change} oChange Change wrapper object to be completed.
		 * @param {object} oSpecificChangeInfo Specific change info with attributes "fieldLabel", the field label to be included in the change,
		 * "fieldValue", the value for the control that displays the value, "valueProperty", the control property
		 * that holds the field value, "newControlId", the control ID for the control to be added and "jsType", the
		 * JavaScript control for the field value. Alternative new format is index, label, newControlId and bindingPath,
		 * which will result in a new SmartField being added and bound.
		 *
		 * @public
		 */
		AddMultiEditFields.completeChangeContent = function (oChange, oSpecificChangeInfo, mPropertyBag) {
			var oAppComponent = mPropertyBag.appComponent;
			var oChangeDefinition = oChange.getDefinition();

			if (!oChangeDefinition.content) {
				oChangeDefinition.content = {};
			}
			if (!oChangeDefinition.content.field) {
				oChangeDefinition.content.field = {};
			}
			if (oSpecificChangeInfo.bindingPath) {
				oChangeDefinition.content.field.propertyName = oSpecificChangeInfo.bindingPath;
			} else {
				throw new Error("oSpecificChangeInfo.bindingPath or bindingPath attribute required");
			}
			if (oSpecificChangeInfo.newControlId) {
				oChangeDefinition.content.field.selector = JsControlTreeModifier.getSelector(oSpecificChangeInfo.newControlId, oAppComponent);
			} else {
				throw new Error("oSpecificChangeInfo.newControlId attribute required");
			}
			if (oSpecificChangeInfo.jsTypes) {
				oChangeDefinition.content.field.jsType = oSpecificChangeInfo.jsType;
			} else if (oSpecificChangeInfo.bindingPath) {
				oChangeDefinition.content.field.jsType = "sap.ui.comp.smartmultiedit.Field";
			} else {
				throw new Error("oSpecificChangeInfo.jsTypes or bindingPath attribute required");
			}
			if (oSpecificChangeInfo.index === undefined) {
				throw new Error("oSpecificChangeInfo.index attribute required");
			} else {
				oChangeDefinition.content.field.index = oSpecificChangeInfo.index;
			}
			if (oSpecificChangeInfo.entitySet) {
				// an optional entity set can be configured
				oChangeDefinition.content.field.entitySet = oSpecificChangeInfo.entitySet;
			}

		};

		return AddMultiEditFields;
	},
	true);
