/**
 * This class is used for dealing with the preparation of an explicit Save operation.
 * The following scenarios are covered:
 * - Save, while still validation messages are available -> Save not allowed
 * - Apply, while still validation messages are available -> tbd
 * - Save, while warnings or (non-validation) errors are available -> Depending on configuration the user is asked, whether he wants to proceed
 * 
 * Note that in FCL scenarios messages from more than one view might need to be aggregated.
 */
 
 sap.ui.define(["jquery.sap.global", "sap/ui/base/Object", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"
], function(jQuery, BaseObject, Filter, FilterOperator) {
	"use strict";
	
	// A Filter that filters for messages that are at least of severity warning
	var oAtLeastWarningFilter = new Filter({
		filters: [new Filter({
			path: "type",
			operator: FilterOperator.EQ,
			value1: sap.ui.core.MessageType.Warning
			}), new Filter({
			path: "type",
			operator: FilterOperator.EQ,
			value1: sap.ui.core.MessageType.Error
		})], 
		and: false
	});

	var sLocalModelName = "model";

	function getMethods(oTemplateContract, oController, oCommonUtils) {
		
		var fnYes, fnNo; // global functions which should be called when the user either accepts or rejects the operation
		var oItemBinding; // initialized on demand
		var bShowConfirmationOnDraftActivate = (function(){
			var oComponent = oController.getOwnerComponent();
			var oRegistryEntry = oTemplateContract.componentRegistry[oComponent.getId()];
			return !!(oRegistryEntry.methods.showConfirmationOnDraftActivate && oRegistryEntry.methods.showConfirmationOnDraftActivate());                         
		})();
		
		// iSituation: 1: Validations for activate, 2: Validation for Apply, 3: Warnings before activate
		function getConfiguredPopoverIfNeeded(iSituation){
			var oRet, oLocalModel, oMessageView;
			oRet = oCommonUtils.getDialogFragment("sap.suite.ui.generic.template.fragments.MessagesBeforeSave", {
				itemSelected: function(){
					oLocalModel.setProperty("/backbtnvisibility", true);
				},
				onBackButtonPress: function(){
					oMessageView.navigateBack();
					oLocalModel.setProperty("/backbtnvisibility", false);	
				},
				onAccept: function(){
					oRet.close();
					(fnYes || jQuery.noop)();	
				},
				onReject: function(){
					oRet.close();
					(fnNo || jQuery.noop)();	
				}
			}, sLocalModelName, function(oFragment){
				oMessageView = oFragment.getContent()[0];
				oFragment.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "msg");
				oItemBinding = oFragment.getContent()[0].getBinding("items");
			});
			oLocalModel = oRet.getModel(sLocalModelName);
			oLocalModel.setProperty("/situation", iSituation);
			oLocalModel.setProperty("/backbtnvisibility", false);
			var aFilters = [];
			var aActiveComponents = oTemplateContract.oNavigationControllerProxy.getActiveComponents();
			var bOnlyValidation = (iSituation < 3);
			for (var i = 0; i < aActiveComponents.length; i++){
				var sComponentId = aActiveComponents[i];
				var oRegistryEntry = oTemplateContract.componentRegistry[sComponentId];
				if (oRegistryEntry.oController === oController || iSituation !== 2){
					var aComponentFilters = (oRegistryEntry.methods.getMessageFilters || jQuery.noop)(bOnlyValidation);
					aFilters = aComponentFilters ? aFilters.concat(aComponentFilters) : aFilters;
				}	
			}
			if (aFilters.length === 0){
				return null;
			}
			var oOverallFilter = aFilters.length === 1 ? aFilters[0] : new Filter({
				 filters: aFilters, 
				 and: false 
			});
			if (iSituation === 3){
				oOverallFilter = new Filter({
					filters: [oOverallFilter, oAtLeastWarningFilter], // make sure that only messages that are at least warnings are shown
					and: true
				});
			}
			oItemBinding.filter(oOverallFilter);
			return oItemBinding.getLength() && oRet;
		}
		
		// Returns a Promise that is resolved, if the operation may be performed and rejected when the operation should be stopped
		// bIsActivation: true: Activate/Save action, false: Apply action
		// oController: the controller that actually has started the operation
		function fnBeforeOperation(bIsActivation){
			var oValidationPopup = getConfiguredPopoverIfNeeded(bIsActivation ? 1 : 2);
			if (oValidationPopup){
				oValidationPopup.open();
				return Promise.reject();
			}
			if (!(bIsActivation && bShowConfirmationOnDraftActivate)){
				return Promise.resolve();
			}
			oValidationPopup = getConfiguredPopoverIfNeeded(3);
			return oValidationPopup ? new Promise(function(fnResolve, fnReject){
				fnYes = fnResolve;
				fnNo = fnReject;
				oValidationPopup.open();
			}) : Promise.resolve();
		}
		
		// Performs an Activate/Save resp. Apply operation when all prerequisites are given
		function fnPrepareAndRunSaveOperation(bIsActivation, fnOperation){
			oTemplateContract.oApplicationProxy.performAfterSideEffectExecution(function(){
				if (!oTemplateContract.oBusyHelper.isBusy()){
					fnBeforeOperation(bIsActivation).then(fnOperation);
				}
			});
		}
		
		return {
			prepareAndRunSaveOperation: fnPrepareAndRunSaveOperation	
		};
	}

	return BaseObject.extend("sap.suite.ui.generic.template.lib.BeforeSaveHelper", {
		constructor: function(oTemplateContract, oController, oCommonUtils) {
			jQuery.extend(this, getMethods(oTemplateContract, oController, oCommonUtils));
		}
	});
});