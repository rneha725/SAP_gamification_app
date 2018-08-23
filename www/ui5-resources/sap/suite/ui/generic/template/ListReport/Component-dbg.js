sap.ui.define(["sap/ui/core/mvc/OverrideExecution", "sap/suite/ui/generic/template/lib/TemplateAssembler",
	"sap/suite/ui/generic/template/ListReport/controller/ControllerImplementation"
], function(OverrideExecution, TemplateAssembler, ControllerImplementation) {
	"use strict";

	function getMethods(oComponent, oComponentUtils) {
		var oViewProxy = {};

		return {
			oControllerSpecification: {
				getMethods: ControllerImplementation.getMethods.bind(null, oViewProxy),
				oControllerDefinition: {
					getVisibleSelectionsWithDefaults: function() {
						// We need a list of all selection fields in the SmartFilterBar for which defaults are defined
						// (see method setSmartFilterBarDefaults) and which are currently visible.
						// This is needed by _getBackNavigationParameters in the NavigationController.
						var aVisibleFields = [];
							// if(this.oView.byId(this.sPrefix + ".DateKeyDate").getVisible()){
						// aVisibleFields.push("KeyDate");
						// }
						return aVisibleFields;
					},

					// ---------------------------------------------
					// Extensions
					// ---------------------------------------------
					onInitSmartFilterBarExtension: function(oEvent) {},
					getCustomAppStateDataExtension: function(oCustomData) {},
					restoreCustomAppStateDataExtension: function(oCustomData) {},
					onBeforeRebindTableExtension: function(oEvent) {},
					onBeforeRebindChartExtension: function(oEvent) {},
					adaptNavigationParameterExtension: function(oSelectionVariant, oObjectInfo) {},
					onListNavigationExtension: function(oEvent) {},
					getPredefinedValuesForCreateExtension: function(oSmartFilterBar){},
					adaptTransientMessageExtension: function(){},
					onSaveAsTileExtension: function(oShareInfo) {},
					beforeDeleteExtension: function(oBeforeDeleteProperties) {}
				},
				oControllerExtensionDefinition: { // callbacks for controller extensions
					metadata: {
						methods: {
							onInitSmartFilterBar: { "public": true, "final": false, overrideExecution: OverrideExecution.After},
							provideExtensionAppStateData: { "public": true, "final": false, overrideExecution: OverrideExecution.After},
							restoreExtensionAppStateData: { "public": true, "final": false, overrideExecution: OverrideExecution.After},
							ensureFieldsForSelect: { "public": true, "final": false, overrideExecution: OverrideExecution.After},
							addFilters: { "public": true, "final": false, overrideExecution: OverrideExecution.After}
						}
					},
					// will be called when the SmartFilterbar has been initialized
					onInitSmartFilterBar: function(oEvent) {},
					// allows extensions to strore their specific state. Therefore, the implementing controller extension must call fnSetAppStateData(oControllerExtension, oAppState).
					// oControllerExtension must be the ControllerExtension instance for which the state should be stored. oAppState is the state to be stored.
					// Note that the call is ignored if oAppState is faulty
					provideExtensionAppStateData: function(fnSetAppStateData){},
					// asks extensions to restore their state according to a state which was previously stored.
					// Therefore, the implementing controller extension can call fnGetAppStateData(oControllerExtension) in order to retrieve the state information which has been stored in the current state for this controller extension.
					// undefined will be returned by this function if no state or a faulty state was stored.
					restoreExtensionAppStateData: function(fnGetAppStateData){},
					// give extensions the possibility to make sure that certain fields will be contained in the select clause of the table binding. 
					// This should be used, when custom logic of the extension depends on these fields.
					// For each custom field the extension must call fnEnsureSelectionProperty(oControllerExtension, sFieldname).
					// oControllerExtension must be the ControllerExtension instance which ensures the field to be part of the select clause.
					// sFieldname must specify the field to be selected. Note that this must either be a field of the entity set itself or a field which can be reached via a :1 navigation property.
					// In the second case sFieldname must contain the relative path.
					ensureFieldsForSelect: function(fnEnsureSelectionProperty){},
					// allow extension to add filters. They will be combined via AND with all other filters
					// For each filter the extension must call fnAddFilter(oControllerExtension, oFilter)
					// oControllerExtension must be the ControllerExtension instance which adds the filter
					// oFilter must be an instance of sap.ui.model.Filter
					addFilters: function(fnAddFilter){}
				}	
			},
			init: function() {
				var oTemplatePrivate = oComponent.getModel("_templPriv");
				oTemplatePrivate.setProperty("/listReport", {}); // Note that component properties are not yet available here
			},
			onActivate: function() {
				oComponentUtils.setBackNavigation(undefined);
				oViewProxy.onComponentActivate();
			},
			refreshBinding: function(bUnconditional) {
				oViewProxy.refreshBinding();
			},
			getUrlParameterInfo: function() {
				return oViewProxy.getUrlParameterInfo();
			},
			getItems: function(){
				return oViewProxy.getItems();
			},
			displayNextObject: function(aOrderObjects){
				return oViewProxy.displayNextObject(aOrderObjects);
			}
		};
	}

	return TemplateAssembler.getTemplateComponent(getMethods,
		"sap.suite.ui.generic.template.ListReport", {
			metadata: {
				library: "sap.suite.ui.generic.template",
				properties: {
					"templateName": {
						"type": "string",
						"defaultValue": "sap.suite.ui.generic.template.ListReport.view.ListReport"
					},
					// hide chevron for unauthorized inline external navigation?
					"hideChevronForUnauthorizedExtNav": {
						"type": "boolean",
						"defaultValue": "false"
					},
					"treeTable": "boolean",
					"tableType": "string",
					"gridTable": "boolean",
					"createWithFilters": "object",
					"condensedTableLayout": "boolean",
					"multiSelect": "boolean",
					"smartVariantManagement": "boolean",      // true = one variant for filter bar and table, false = separate variants for filter and table
					"hideTableVariantManagement": "boolean",
					"variantManagementHidden": "boolean",
					"creationEntitySet": "string",
					"isWorklist": "boolean",
					"enableTableFilterInPageVariant":{
						"type": "boolean",
						"defaultValue": false
					},
					"multiContextActions": "object"
				},
				"manifest": "json"
			}
		});
});
