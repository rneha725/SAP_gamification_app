/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

sap.ui.define([
		"jquery.sap.global", "sap/ui/fl/Utils", "sap/ui/fl/changeHandler/Base"],
		function(jQuery, FlexUtils, Base) {
	"use strict";

	/**
	 * Change handler for combining smart form group elements (representing one or more fields).
	 *
	 * @alias sap.ui.comp.smartform.flexibility.changes.CombineFields
	 * @author SAP SE
	 * @version 1.56.5
	 * @experimental Since 1.46
	 */
	var CombineFields = { };

	CombineFields._evaluateElementForIndex = function(oModifier, aGroupElements) {
		var iMandatoryField = -1;
		var aSingleFields = [];

		var bMandatory = aGroupElements.some(function (oGroupElement) {
			aSingleFields = oModifier.getAggregation(oGroupElement, "fields");
			return aSingleFields.some(function (oSingleField) {
				iMandatoryField++;
				return oModifier.getProperty(oSingleField, "mandatory");
			});
		});

		if (bMandatory) {
			return iMandatoryField;
		}
		return -1;
	};

	CombineFields._collectRevertData = function(oModifier, aGroupElements){
		var mRevertData = {
			elementStates : []
		};

		aGroupElements.forEach(function(oElement){
			var aSingleFields = oModifier.getAggregation(oElement, "elements");
			var oParent = oModifier.getParent(oElement);
			var aFieldsLabels = [];
			var aFieldsIds = [];
			aSingleFields.forEach(function(oField){
				var sLabel = oModifier.getProperty(oField, "textLabel") || "";
				aFieldsLabels.push(sLabel);
				aFieldsIds.push(oModifier.getId(oField));
			});

			mRevertData.elementStates.push({
				groupElementId : oModifier.getId(oElement),
				parentId : oModifier.getId(oParent),
				groupElementIndex : oModifier.getAggregation(oParent, "groupElements").indexOf(oElement),
				fieldsIds : aFieldsIds,
				label: oModifier.getProperty(oElement, "label"),
				fieldsLabels: aFieldsLabels
			});
		});

		return mRevertData;
	};

	/**
	 * Combines content from other smart group elements into the selected group element
	 *
	 * @param {sap.ui.fl.Change} oChange change wrapper object with instructions to be applied on the control map
	 * @param {sap.ui.comp.smartform.SmartForm|Element} oControl smartform control that matches the change selector for applying the change
	 * @param {object} mPropertyBag - map of properties
	 * @param {sap.ui.core.util.reflection.BaseTreeModifier} mPropertyBag.modifier - modifier for the controls
	 * @param {sap.ui.core.UIComponent} mPropertyBag.appComponent - component in which the change should be applied
	 * @param {object} mPropertyBag.view - view object or xml element representing an ui5 view
	 * @return {boolean} true - if change could be applied
	 *
	 * @public
	 */
	CombineFields.applyChange = function(oChange, oControl, mPropertyBag) {
		var oChangeDefinition = oChange.getDefinition();
		var oModifier = mPropertyBag.modifier;
		var oAppComponent = mPropertyBag.appComponent;
		var oView =  mPropertyBag.view;
		var oSourceControl = oModifier.bySelector(oChangeDefinition.content.sourceSelector, oAppComponent, oView);
		var aLabelText = [];
		var sLabel;
		var sPreviousLabel;
		var oText;
		var oParent;

		var aSingleFields = [];

		var aGroupElements = oChangeDefinition.content.combineFieldSelectors.map(function (oCombineFieldSelector) {
			return oModifier.bySelector(oCombineFieldSelector, oAppComponent, oView);
		});

		oChange.setRevertData(this._collectRevertData(oModifier, aGroupElements));

		var iMandatoryFieldIndex = this._evaluateElementForIndex(oModifier, aGroupElements);
		if (iMandatoryFieldIndex > 0) {
			oModifier.setProperty(oSourceControl, "elementForLabel", iMandatoryFieldIndex);
		}
		var bIsRtl = sap.ui.getCore().getConfiguration().getRTL();

		for (var i = 0; i < aGroupElements.length; i++) {
			sLabel = "fieldLabel" + i.toString();
			oText = oChangeDefinition.texts[sLabel];
			if (oText && oText.value !== sPreviousLabel && oText.value.length > 0) {
				bIsRtl ? aLabelText.unshift(oText.value) : aLabelText.push(oText.value);
				sPreviousLabel = oText.value;
			}

			aSingleFields = oModifier.getAggregation(aGroupElements[i], "elements");

			if (aGroupElements[i] !== oSourceControl) {
				for (var k = 0, m = aSingleFields.length; k < m; k++) {
					oModifier.removeAggregation(aGroupElements[i], "elements", aSingleFields[k]);
					oModifier.insertAggregation(oSourceControl, "elements", aSingleFields[k], i + k, oView);
				}
				oParent = oModifier.getParent(aGroupElements[i]);
				oModifier.removeAggregation(oParent, "groupElements", aGroupElements[i]);
				// The removed GroupElement must be destroyed when the app is closed, therefore it must be
				// placed in another aggregation (the "dependents" aggregation is invisible)
				oModifier.insertAggregation(oParent, "dependents", aGroupElements[i], 0, oView);
			}
		}

		if (aLabelText.length > 0) {
			oModifier.setProperty(oSourceControl, "label", aLabelText.join("/"));
		}

		return true;

	};

	/**
	 * Reverts applied change
	 *
	 * @param {sap.ui.fl.Change} oChange change wrapper object with instructions to be applied on the control map
	 * @param {sap.ui.comp.smartform.SmartForm} oSmartForm - SmartForm that matches the change selector for applying the change
	 * @param {object} mPropertyBag - Property bag containing the modifier and the view
	 * @param {object} mPropertyBag.modifier - modifier for the controls
	 * @param {object} mPropertyBag.view - application view
	 * @return {boolean} True if successful
	 * @public
	 */
	CombineFields.revertChange = function(oChange, oSmartForm, mPropertyBag){
		var mRevertData = oChange.getRevertData();
		var oModifier = mPropertyBag.modifier;

		mRevertData.elementStates.forEach(function(oElementState) {
			var oParent = mPropertyBag.modifier.byId(oElementState.parentId);
			var oGroupElement = mPropertyBag.modifier.byId(oElementState.groupElementId);
			if (oModifier.getAggregation(oParent, "groupElements").indexOf(oGroupElement) === -1) {
				// Removed groups are placed in the "dependents" aggregation, so here they must be cleaned up
				oModifier.removeAggregation(oParent, "dependents", oGroupElement);
				oModifier.insertAggregation(oParent, "groupElements", oGroupElement, oElementState.groupElementIndex);
			} else {
				oModifier.removeAllAggregation(oGroupElement, "elements");
			}
		});
		mRevertData.elementStates.forEach(function(oElementState) {
			var oGroupElement = mPropertyBag.modifier.byId(oElementState.groupElementId);
			oElementState.fieldsIds.forEach(function(sFieldId, index) {
				var oField = mPropertyBag.modifier.byId(sFieldId);
				oModifier.insertAggregation(oGroupElement, "elements", oField, index);
				oModifier.setProperty(oField, "textLabel", oElementState.fieldsLabels[index]);
			});
			oModifier.setProperty(oGroupElement, "label", oElementState.label);
		});

		oChange.resetRevertData();

		return true;
	};

	/**
	 * Completes the change by adding change handler specific content
	 *
	 * @param {sap.ui.fl.Change} oChange change wrapper object to be completed
	 * @param {object} oSpecificChangeInfo - specific info object
	 * @param {object} oSpecificChangeInfo.combineFieldIds ids of selected fields
	 *                                                     to be combined
	 * @param {object} mPropertyBag - map of properties
	 * @param {object} mPropertyBag.modifier - modifier for the controls
	 *
	 * @public
	 */
	CombineFields.completeChangeContent = function(oChange, oSpecificChangeInfo, mPropertyBag) {
		var oModifier = mPropertyBag.modifier;
		var oAppComponent = mPropertyBag.appComponent;
		var oChangeDefinition = oChange.getDefinition();

		var aCombineFieldIds = oSpecificChangeInfo.combineFieldIds;
		if (aCombineFieldIds && aCombineFieldIds.length >= 2) {
			oChangeDefinition.content.combineFieldSelectors = aCombineFieldIds.map(function(sCombineFieldId) {
				return oModifier.getSelector(sCombineFieldId, oAppComponent);
			});
			oChange.addDependentControl(aCombineFieldIds, "combinedFields", mPropertyBag);
		} else {
			throw new Error("oSpecificChangeInfo.combineFieldIds attribute required");
		}

		if (oSpecificChangeInfo.sourceControlId) {
			oChangeDefinition.content.sourceSelector = oModifier.getSelector(oSpecificChangeInfo.sourceControlId, oAppComponent);
			oChange.addDependentControl(oSpecificChangeInfo.sourceControlId, "sourceControl", mPropertyBag);
		} else {
			throw new Error("oSpecificChangeInfo.sourceControlId attribute required");
		}

		var sText;
		var sFieldLabel;
		var oGroupElement;
		for (var i = 0; i < aCombineFieldIds.length; i++) {
			oGroupElement = oModifier.byId(aCombineFieldIds[i]);
			sText = oGroupElement.getLabelText();
			if (sText) {
				sFieldLabel = "fieldLabel" + i;
				Base.setTextInChange(oChangeDefinition, sFieldLabel, sText, "XFLD");
			}
		}
	};

	return CombineFields;
},
/* bExport= */true);
