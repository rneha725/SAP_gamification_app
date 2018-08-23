sap.ui.define(["jquery.sap.global", "sap/ui/base/Object", "sap/m/MessagePopover", "sap/m/MessagePopoverItem", "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator", "sap/suite/ui/generic/template/lib/MessageUtils", "sap/suite/ui/generic/template/lib/testableHelper"
], function(jQuery, BaseObject, MessagePopover, MessagePopoverItem, Filter, FilterOperator, MessageUtils, testableHelper) {
	"use strict";

	Filter = testableHelper.observableConstructor(Filter, true);

	var oPersistentFilter = new Filter({
		path: "persistent",
		operator: FilterOperator.EQ,
		value1: false
	}); // exclude all messages that are persistent for frontend (i.e. transient for backend)
	var oValidationFilter = new Filter({
		path: "validation",
		operator: FilterOperator.EQ,
		value1: true
	}); // include all validation messages (i.e. frontend-messages)

	var oImpossibleFilter = new Filter({
		filters: [oValidationFilter, new Filter({
			path: "validation",
			operator: FilterOperator.EQ,
			value1: false
		})],
		and: true
	});

/* temporarily replaced by the code below	
	function getCheckPlacementFilter(oView) {
		var fnTest = function(oValue) {
			if (!oValue) {
				return false;
			}
			var aParts = oValue.split("--");
			var sPrefix = aParts[0];
			var oCore = sap.ui.getCore();
			for (var oControl = oCore.byId(sPrefix); oControl; oControl = oControl.getParent()) {
				if (oControl === oView) {
					return true;
				}
			}
			return false;
		};
		return new Filter({
			path: "controlId",
			test: fnTest,
			caseSensitive: true
		});
	}
*/	
	
	function getCheckPlacementFilter(oView) {
		var fnTest = function(oValue) {
			if (!oValue) {
				return false;
			}
			var aParts = oValue.split("/");
			var sControlId = aParts[0];
			aParts = sControlId.split("--");
			var sPrefix = aParts[0];
			var oCore = sap.ui.getCore();
			for (var oControl = oCore.byId(sPrefix); oControl; oControl = oControl.getParent()) {
				if (oControl === oView) {
					return true;
				}
			}
			return false;
		};
		return new Filter({
			path: "target",
			test: fnTest,
			caseSensitive: true
		});
	}

	// oHost is an object representing the view that hosts the MessageButton
	function getMethods(oCommonUtils, oHost, bIsODataBased) {
		var oController = oHost.controller;
		var oScrollDelegate = oHost.scrollDelegate;
		var bActive = false; // Is this helper currently active

		var oMessageButton = oController.byId("showMessages");

		var oMessagePopover = oCommonUtils.getDialogFragment("sap.suite.ui.generic.template.fragments.MessagePopover", {
			itemSelected: jQuery.noop || MessageUtils.navigateFromMessageViewEvent.bind(null, oScrollDelegate)
		});
		// Add message model as an own model with name msg
		oMessagePopover.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "msg");
		var oItemBinding = oMessagePopover.getBinding("items");
		var oEntityFilter; // fixed filter for the entity set of the component this instance belongs to. Will be ORed with a filter for the current binding path, oValidationFilter, and external filters
		(function() {
			var oComponent = oController.getOwnerComponent();
			oEntityFilter = new Filter({
				path: "target",
				operator: FilterOperator.EQ,
				value1: "/" + oComponent.getEntitySet()
			});
			var oTemplatePrivate = oComponent.getModel("_templPriv");
			oTemplatePrivate.setProperty("/generic/messageCount", 0);
			var sMessageButtonTooltip = oCommonUtils.getText("MESSAGE_BUTTON_TOOLTIP_P", 0);
			oTemplatePrivate.setProperty("/generic/messageButtonTooltip", sMessageButtonTooltip);
			oItemBinding.attachChange(function() {
				var iCount = oItemBinding.getLength();
				oTemplatePrivate.setProperty("/generic/messageCount", iCount);
				sMessageButtonTooltip = oCommonUtils.getText(iCount === 1 ? "MESSAGE_BUTTON_TOOLTIP_S" : "MESSAGE_BUTTON_TOOLTIP_P", iCount);
				oTemplatePrivate.setProperty("/generic/messageButtonTooltip", sMessageButtonTooltip);
			});
		})();

		var oLocalValidationFilter = new Filter({
			filters: [oValidationFilter, getCheckPlacementFilter(oController.getView())],
			and: true
		});

		var aFilterProvider = []; //Callback functions registered by reuse components (or break-outs) that want to add their message filters
		var sCurrentBindingPath; // the binding path currently valid for the page this instance is responsible for
		var iCurrentCallCount = 0; // a counter which is increased each time sCurrentBinding path is changed
		var fnNewFilter; // function fnResolved (see below) with first parameter bound to iCurrentCallCount. Registered at Promises provided by external filter providers.
		var oCurrentFilter;
		var aCurrentFilters; // a list of filters currently set. They are combined by OR. The resulting filter will afterwards be ANDed with oPersistentFilter.
		// The result of this is used to filter the messages.

		// Adds an external filter definition
		// Returns whether filters have been changed synchronously
		function addAnExternalFilterDefinition(vFilterDefinition) {
			if (jQuery.isArray(vFilterDefinition)) {
				var bRet = false;
				for (var i = 0; i < vFilterDefinition.length; i++) {
					bRet = addAnExternalFilterDefinition(vFilterDefinition[i]) || bRet;
				}
				return bRet;
			}
			if (vFilterDefinition instanceof Promise) {
				vFilterDefinition.then(fnNewFilter);
				return false;
			}
			// vFilterDefinition must in fact be a filter
			aCurrentFilters.push(vFilterDefinition);
			return true;
		}
		
		function setCurrentFilter(oFilter){
			oCurrentFilter = oFilter;
			oItemBinding.filter(oCurrentFilter);
		}

		// Adapts the binding for the messages according to the current state of aCurrentFilters
		function fnAdaptBinding() {
			if (bActive) {
				var oContextFilter = new Filter({
					filters: aCurrentFilters, 
					and: false 
				});
				var oCurrentPersistentFilter = new Filter({ 
					filters: [oContextFilter, oPersistentFilter],
					and: true
				});
				setCurrentFilter(new Filter({
					filters: [oCurrentPersistentFilter, oLocalValidationFilter], 
					and: false
				}));
			}
		}

		// This method is called when a Promise that has been provided by a filter provider is resolved.
		// iCallCount is the value of iCurrentCallCount that was valid when the Promise was provided by the filter provider.
		// Note that the function does nothing when the iCurrentCallCount meanwhile has a different value (i.e. sCurrentBindingPath has meanwhile changed)
		// vFilterDefinition is the FilterDefinition the filter resolves to.
		function fnResolved(iCallCount, vFilterDefinition) {
			if (iCallCount === iCurrentCallCount && addAnExternalFilterDefinition(vFilterDefinition)) {
				fnAdaptBinding(); // adapt the binding after the set of filters has been adapted
			}
		}

		// fnProvider is a filter provider which has been registered via registerMessageFilterProvider.
		// At each time registerMessageFilterProvider must be able to provide a FilterDefinition.
		// A FilterDefinition is either
		// - a filter or
		// - an array of FilterDefinitions or
		// - or a Promise that resolves to a FilterDefinition
		// This function calls fnProvider and ensures that the filter(s) provided by this call are added to aCurrentFilters.
		// In case the filters are provided asynchronously, it is also ensured that the changed filters will be applied afterwards.
		// Returns whether the filters have been changed (synchronously) 
		function addFilterFromProviderToCurrentFilter(fnProvider) {
			var oFilterDefinition = fnProvider();
			return addAnExternalFilterDefinition(oFilterDefinition);
		}

		// Ensure that addFilterFromProviderToCurrentFilter is called for all registered filter providers
		function addExternalFiltersToCurrentFilter() {
			aFilterProvider.forEach(addFilterFromProviderToCurrentFilter);
		}

		// adapt the filters to a new binding path
		function adaptToContext(sBindingPath) {
			sCurrentBindingPath = sBindingPath;
			iCurrentCallCount++;
			fnNewFilter = fnResolved.bind(null, iCurrentCallCount);

			// Show messages for current context including all "property children" AND for
			// messages given for the entire entity set
			aCurrentFilters = bIsODataBased ? [
				new Filter({
					path: "target",
					operator: FilterOperator.StartsWith,
					value1: sCurrentBindingPath
				}),
				oEntityFilter
			] : [];
			addExternalFiltersToCurrentFilter(); //Check/add external filters
			fnAdaptBinding();
		}

		// register a new filter provider. In case a binding path alrerady has been set, the new provider is called immediately
		function registerMessageFilterProvider(fnProvider) {
			aFilterProvider.push(fnProvider);
			if (sCurrentBindingPath !== undefined && addFilterFromProviderToCurrentFilter(fnProvider)) {
				fnAdaptBinding();
			}
		}

		var fnShowMessagePopoverImpl;

		function fnShowMessagePopover() {
			fnShowMessagePopoverImpl = fnShowMessagePopoverImpl || function() {
				if (oItemBinding.getLength() > 0) {
					oMessagePopover.openBy(oMessageButton);
				}
			};
			// workaround to ensure that oMessageButton is rendered when openBy is called
			setTimeout(fnShowMessagePopoverImpl, 0);
		}

		function setEnabled(bIsActive) {
			bActive = bIsActive;
			if (bIsActive) {
				if (aCurrentFilters) { // adaptToContext has already been called
					fnAdaptBinding();
				}
			} else {
				aCurrentFilters = null;
				setCurrentFilter(oImpossibleFilter);
			}
		}
		
		function getMessageFilters(bOnlyValidation){
			return bOnlyValidation ? oLocalValidationFilter : oCurrentFilter;	
		}

		return {
			adaptToContext: adaptToContext,
			toggleMessagePopover: oMessagePopover.toggle.bind(oMessagePopover, oMessageButton),
			showMessagePopover: fnShowMessagePopover,
			registerMessageFilterProvider: registerMessageFilterProvider,
			setEnabled: setEnabled,
			getMessageFilters: getMessageFilters
		};
	}

	return BaseObject.extend("sap.suite.ui.generic.template.lib.MessageButtonHelper", {
		constructor: function(oCommonUtils, oHost, bIsODataBased) {
			jQuery.extend(this, (testableHelper.testableStatic(getMethods, "MessageButtonHelper"))(oCommonUtils, oHost, bIsODataBased));
		}
	});
});