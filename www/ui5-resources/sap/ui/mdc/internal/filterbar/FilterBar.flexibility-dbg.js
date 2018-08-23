sap.ui.define(["sap/ui/mdc/FilterField", "sap/ui/mdc/internal/common/Helper", "sap/ui/model/odata/v4/ODataModel"], function (FilterField, CommonHelper, v4ODataModel) {
	"use strict";

	function getInnerFilterBar(oFilterBar, oModifier){
		// this does not yet work as the _content is a hidden aggregation TODO to be discussed with FL/MDC
		//return oModifier.getAggregation(oFilterBar, "_content");
		return oFilterBar.get_content();
	}

	function fnAddFilter(sEntitySet, sPropertyPath, sLabel, oFilterBar, oModifier, oModel){
		var oMetaModel = oModel.getMetaModel(),
			oMetadataRequest = oMetaModel.requestObject('/' + sEntitySet + '/' + sPropertyPath);

		var oInnerFilterBar = getInnerFilterBar(oFilterBar, oModifier);

		return oMetadataRequest.then(function () {

			var oFilterField = FilterField.createInstance({
				entitySet : sEntitySet,
				propertyPath : sPropertyPath,
				metaModel : oMetaModel,
				parent : oFilterBar,
				withLabel : true
			});

			// FIXME: get rid of this workaround
			// the controls created through changes shall have the same prefix ID than the ones creates during the
			// initial template processing. If we set the same ID to the temp view which is created above the view
			// creation aborts due to duplicate IDs (although the view is never put into the DOM)
			// for a first test we directly update the generated ID

			oFilterField.sId = oFilterBar.getId() + '--template::FilterField::' + CommonHelper.replaceSpecialCharsInId(sPropertyPath);

			if (sLabel) {
				// overwrite the label of the filter field - as the filter field exists as JS object we don't need to use
				// the modifier for this - to be checked if this is correct
				oFilterField.get_content().getItems()[0].setText(sLabel);
			}

			//FIXME: Always adds filter at beginning
			oModifier.insertAggregation(oInnerFilterBar, "content", oFilterField, 1);

			return oFilterField;
		});
	}

	function fnRemoveFilter(sElementId, oFilterBar, oModifier){

		var oInnerFilterBar = getInnerFilterBar(oFilterBar, oModifier),
			aFilters = oModifier.getAggregation(oInnerFilterBar, "content"),
			mRevertData = {},
			oFilter;

		for (var i = 0; i < aFilters.length; i++) {
			if (oModifier.getId(aFilters[i]) === sElementId) {
				oFilter = aFilters[i];
				mRevertData.index = i;

				// TODO: use modifier for the next two lines, to be checked how we can do this
				mRevertData.entitySet = oFilter._getEntitySet();
				mRevertData.propertyPath = oFilter._getPropertyPath();

				oModifier.removeAggregation(oInnerFilterBar, "content", oFilter);

				return mRevertData;
			}
		}
	}

	function fnMoveFilter(sElementId, sTargetIndex, oFilterBar, oModifier){
		var oInnerFilterBar = getInnerFilterBar(oFilterBar, oModifier),
			aFilters = oModifier.getAggregation(oInnerFilterBar, "content");

		for (var i = 0; i < aFilters.length; i++) {
			if (oModifier.getId(aFilters[i]) === sElementId){
				oModifier.removeAggregation(oInnerFilterBar, "content", aFilters[i]);
				oModifier.insertAggregation(oInnerFilterBar, "content", aFilters[i], sTargetIndex);
			}
		}
	}

	return {
		"addFilter": {
			changeHandler: {
				applyChange: function (oChange, oFilterBar, mPropertyBag) {
					var oChangeDefinition = oChange.getDefinition(),
						sPropertyPath = oChangeDefinition.content.sFieldPath,
						sLabel = oChangeDefinition.content.label,
						oModifier = mPropertyBag.modifier,
						oModelContainer = mPropertyBag.appComponent || mPropertyBag.view,
						oModel = oModelContainer ? oModelContainer.getModel() : undefined,
						sEntitySet = oChangeDefinition.content.sEntitySet;
	
					if (!oModel instanceof v4ODataModel){
						jQuery.sap.log.error("Change can't be applied without a container having a Odata v4 model assigned");
						return false;
					}
	
					return fnAddFilter(sEntitySet, sPropertyPath, sLabel, oFilterBar, oModifier, oModel).then(function (oFilterField) {
						oChange.setRevertData({
							elementId: oModifier.getId(oFilterField)
						});
					});
	
				},
	
				completeChangeContent: function(oChange, oSpecificChangeInfo, mPropertyBag) {
					var oFilterBar = mPropertyBag.modifier.byId(oChange.getSelector().id);
					oChange.setContent({
						sFieldPath : oSpecificChangeInfo.content.columnKey,
						label : oSpecificChangeInfo.content.text,
						sEntitySet : oFilterBar._getEntitySet()
					});
				},
	
				revertChange: function (oChange, oFilterBar, mPropertyBag) {
					var mRevertData = oChange.getRevertData();
	
					if (mRevertData) {
						fnRemoveFilter(mRevertData.elementId, oFilterBar, mPropertyBag.modifier);
						oChange.resetRevertData();
					} else {
						jQuery.sap.log.error("Attempt to revert an unapplied change.");
						return false;
					}
	
					return true;
				}
			},
			layers: {
				"USER": true
			}
		},

		"moveFilters": {
			changeHandler: {
				applyChange: function (oChange, oFilterBar, mPropertyBag) {
					var oChangeDefinition = oChange.getDefinition(),
						aMovedElements = oChangeDefinition.content.movedElements;
	
					for (var x = 0; x < aMovedElements.length; x++) {
						fnMoveFilter(aMovedElements[x].id, aMovedElements[x].targetIndex, oFilterBar, mPropertyBag.modifier);
					}
	
					return true;
				},
	
				completeChangeContent: function(oChange, oSpecificChangeInfo, mPropertyBag) {
					oChange.setContent({
						movedElements: oSpecificChangeInfo.movedElements
					});
				},
	
				revertChange: function (oChange, oFilterBar, mPropertyBag) {
					var oChangeDefinition = oChange.getDefinition(),
						aMovedElements = oChangeDefinition.content.movedElements;
	
					for (var x = 0; x < aMovedElements.length; x++) {
						fnMoveFilter(aMovedElements[x].element, aMovedElements[x].sourceIndex, oFilterBar, mPropertyBag.modifier);
					}
	
					return true;
				}
			},
			layers: {
				"USER": true
			}
		},

		"removeFilter": {
			changeHandler: {
				applyChange: function (oChange, oFilterBar, mPropertyBag) {
					var oChangeDefinition = oChange.getDefinition(),
						mRevertData;
	
					mRevertData = fnRemoveFilter(oChangeDefinition.content.removedElement, oFilterBar, mPropertyBag.modifier);
	
					oChange.setRevertData(mRevertData);
	
					return true;
				},
	
				completeChangeContent: function(oChange, oSpecificChangeInfo, mPropertyBag) {
					oChange.setContent({
						removedElement: oSpecificChangeInfo.content.removedElement
					});
				},
	
				revertChange: function (oChange, oTable, mPropertyBag) {
					var mRevertData = oChange.getRevertData(),
						oModelContainer = mPropertyBag.appComponent || mPropertyBag.view,
						oModel = oModelContainer ? oModelContainer.getModel() : undefined;
	
					if (mRevertData) {
						return fnAddFilter(mRevertData.entitySet, mRevertData.propertyPath, mRevertData.index, mRevertData.label, oTable, mPropertyBag.modifier, oModel).then(function(){
							oChange.resetRevertData();
						});
					} else {
						jQuery.sap.log.error("Attempt to revert an unapplied change.");
						return false;
					}
				}
			},
			layers: {
				"USER": true
			}
		}
	};
}, /* bExport= */false);
