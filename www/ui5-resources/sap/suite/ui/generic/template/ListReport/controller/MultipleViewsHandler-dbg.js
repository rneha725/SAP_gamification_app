sap.ui.define(["jquery.sap.global", "sap/ui/base/Object",
		"sap/suite/ui/generic/template/ListReport/controller/MultipleViewsSingleTableModeHelper",
		"sap/suite/ui/generic/template/ListReport/controller/MultipleViewsMultipleTablesModeHelper",
		"sap/suite/ui/generic/template/lib/BusyHelper", "sap/ui/model/Filter",
		"sap/suite/ui/generic/template/lib/testableHelper"
	],
	function(jQuery, BaseObject, MultiViewsSingleTableHelper, MultiViewsMultiTablesHelper, BusyHelper, Filter, testableHelper) {
		"use strict";

		/*
		 * This helper class handles multiple views in the List Report.
		 * It is a wrapper for MultipleViewsMultipleTablesModeHelper and MultipleViewSingleTableModeHelper
		 * this class is created in onInit of the ListReport controller.

		 *  That controller forwards all tasks
		 * connected to the single table mode of the multiple views feature to this instance.
		 * The mode can be switched on and configured via the quickVariantSelection.variants section in the manifest.
		 *
		 */

		// constants
		// This class uses a section in the template private model to transfer information between javascript and UI.
		// The following constants represent the pathes in the model that are used to access this information
		var PATH_TO_PROPERTIES = "/listReport/multipleViews"; // root path for all properties used for this feature
		var PATH_TO_SELECTED_KEY = PATH_TO_PROPERTIES + "/selectedKey"; // path to the key of the currently active view
		var PATH_TO_MODE = PATH_TO_PROPERTIES + "/mode";  // path to either "single" or "multiple"
		var PATH_TO_ITEMS = PATH_TO_PROPERTIES + "/items";
		// These data are needed by formatter formatItemTextForMultipleView to determine the text (including counts) for this item
		// Therefore, this map is only created when the showCounts property is set. In this case the item data contain the following properties:
		// text: The fixed text belonging to this item
		// count: Current count of this item
		// state: possible values are "" = count can be used, "busy" = count is currently being determined, "error" = error happened when determining the count

		// oState is used as a channel to transfer data to the controller and back.
		// oController is the controller of the enclosing ListReport
		// oTemplateUtils are the template utils as passed to the controller implementation
		function getMethods(oState, oController, oTemplateUtils) {
			// Begin: Instance variables
			var oImplementingHelper;
			var oQuickVariantSelectionEffective;
			var sMode;
			var bShowCounts;
			var oTemplatePrivateModel = oTemplateUtils.oComponentUtils.getTemplatePrivateModel(); // the template private model used to transfer data between javascript and UI
			// Variables representing the current state
			var mItemData; // maps the keys of the items onto metadata of the corresponding views used in this class. The metadata contains the following properties:
			// selectionVariantFilters: The filters valid for this item
			// templateSortOrder: the sort order used for this item
			// the following properties are only available when the showCounts property is set:
			// numberOfUpdates: a counter increased for each call request that is performed for updating the text for this item. Used to identify outdated requests.
			// updateStartFunction, updateSuccessFunction, errorFunction: functions to be called, when the update of counters is started, has entered successfully, has run into an error
			//         each of these function gets the value of numberOfUpdates valid when the update is started as first parameter
			//         updateSuccessFunction gets the count that was retrieved as second parameter

			var iDefaultDelayMs = oTemplateUtils.oServices.oApplication.getBusyHelper().getBusyDelay();
			// End: Instance variables

			// Begin private instance methods
			
			function getEnableAutoBinding(){
				return oQuickVariantSelectionEffective && oQuickVariantSelectionEffective.enableAutoBinding;
			}

			function fnRegisterToChartEvents() {
				if (oImplementingHelper && oImplementingHelper.fnRegisterToChartEvents) {
					return oImplementingHelper.fnRegisterToChartEvents.apply(null, arguments);
				}
			}

			function onDetailsActionPress() {
				if (oImplementingHelper && oImplementingHelper.onDetailsActionPress) {
					return oImplementingHelper.onDetailsActionPress.apply(null, arguments);
				}
			}

			// callback called in onBeforeRebindTable
			// called to provide sort order information of the smart table
			function fnDetermineSortOrder() {
				if (!oImplementingHelper) {
					return;
				}
				var oItemData = getCurrentItemData(); // get metadata of selected item
				return oItemData.templateSortOrder;
			}

			// formatter for the text on the items (only used when showCounts is switched on)
			// oItemDataModel: current data for the item as described in the comment for PATH_TO_ITEMS
			// returns the text to be used for the item
			function formatItemTextForMultipleView(oItemDataModel) {
				var sFormatedValue;
				if (!oItemDataModel) {
					return "";
				}
				if (oItemDataModel.state === "error") {
					return oTemplateUtils.oCommonUtils.getText("SEG_BUTTON_ERROR", oItemDataModel.text); // originally the text was for segmented button only but is now used for all texts with multiple views
				}
				if (oItemDataModel.state === "" || oItemDataModel.state === "busy") {
					var oIntegerInstance = sap.ui.core.format.NumberFormat.getIntegerInstance({
						groupingEnabled: true
					});
					sFormatedValue = oIntegerInstance.format(oItemDataModel.count);
				}
				return oTemplateUtils.oCommonUtils.getText("SEG_BUTTON_TEXT", [oItemDataModel.text, oItemDataModel.state === "busyLong" ? "..." : sFormatedValue]); // // originally the text was for segmented button only but is now used for all texts with multiple views
			}

			function getContentForIappState() {
				if (oImplementingHelper) {
					var sSelectedKey = oTemplatePrivateModel.getProperty(PATH_TO_SELECTED_KEY);
					var oTableState = oImplementingHelper.getContentForIappState(sSelectedKey);
					return {
						mode: sMode,
						state: oTableState
					};
				}
			}

			function fnRestoreFromIappState(oGenericData) {
				if (oImplementingHelper) {
					var sSelectedKey = oImplementingHelper.getSelectedKeyAndRestoreFromIappState(oGenericData);
					oTemplatePrivateModel.setProperty(PATH_TO_SELECTED_KEY, sSelectedKey);
				}
			}

			// get the key of the currently selected item
			function getVariantSelectionKey() {
				return oTemplatePrivateModel.getProperty(PATH_TO_SELECTED_KEY);
			}

			// Note: This method is called for each smart table/chart used to realize the feature when it is initialized.
			// In single mode this is exactly once, in multi mode it will be several times.
			function fnInit(oEvent) {
				if (!oImplementingHelper) {
					return;
				}
				var setModelDataForItem = function(sKey, oControl, oSelectionVariantFilters) {
					var oCustomData = oTemplateUtils.oCommonUtils.getElementCustomData(oControl); // retrieve custom data for this table
					// ImplementingHelper might already have initialized the item data for this key. In this case enhance them, otherwise create them.
					var oItemData = mItemData[sKey] || Object.create(null);
					oItemData.selectionVariantFilters = oSelectionVariantFilters;
					oItemData.templateSortOrder = oCustomData.TemplateSortOrder;
					oItemData.implementingControl = oControl;
					if (oImplementingHelper.getIsDifferentEntitySets && oImplementingHelper.getIsDifferentEntitySets()) { // different entitySets mode with table tabs
						oItemData.entitySet = oControl.getEntitySet && oControl.getEntitySet();
						oItemData.properties = getEntityTypeProperties(oControl);
					}
					mItemData[sKey] = oItemData;
					if (bShowCounts) {
						var sPathToTheItem = PATH_TO_ITEMS + "/" + sKey;
						// sState can be "busy" (start of determination of counts), "busyLong" (determination of counts lasts longer than 1000ms), "" (determination was finished successfully), "error" (determination failed)
						// iNumberOfUpdates is the identification of the backend call
						// iNewCount is the newly determined count (only valid when sState is "")
						var fnUpdateFunction = function(sState, iNumberOfUpdates, iNewCount) {
							if (oItemData.numberOfUpdates !== iNumberOfUpdates) { // this is the response for an outdated request
								return;
							}
							var oModelEntry = jQuery.extend({}, oTemplatePrivateModel.getProperty(sPathToTheItem)); // must create a new instance. Otherwise UI5 will not recognize the change
							if (!oModelEntry.state && sState == "busy") {
								setTimeout(function() {
									if (oTemplatePrivateModel.getProperty(sPathToTheItem).state === "busy") {
										oModelEntry = jQuery.extend({}, oTemplatePrivateModel.getProperty(sPathToTheItem)); // must create a new instance. Otherwise UI5 will not recognize the change
										oModelEntry.state = "busyLong";
										oTemplatePrivateModel.setProperty(sPathToTheItem, oModelEntry); // Note that this will trigger the call of formatItemTextForMultipleView
									}
								}, iDefaultDelayMs);
							}
							oModelEntry.state = sState; // update the state
							if (!sState) { // determination was successfull -> update the count
								oModelEntry.count = iNewCount;
							}
							oTemplatePrivateModel.setProperty(sPathToTheItem, oModelEntry); // Note that this will trigger the call of formatItemTextForMultipleView
						};
						oItemData.numberOfUpdates = 0;
						oItemData.updateStartFunction = fnUpdateFunction.bind(null, "busy");
						oItemData.updateSuccessFunction = fnUpdateFunction.bind(null, "");
						oItemData.errorFunction = fnUpdateFunction.bind(null, "error");
						var oModelEntry = {
							text: oCustomData.text,
							count: 0, // at initialization 0 will be displayed as counter everywhere
							state: ""
						};
						oTemplatePrivateModel.setProperty(sPathToTheItem, oModelEntry);
					}
				};
				oImplementingHelper.init(oEvent, setModelDataForItem);
			}

			function getMode() {
				return sMode;
			}

			// get metadata of the currently selected item
			function getCurrentItemData() {
				return mItemData[oTemplatePrivateModel.getProperty(PATH_TO_SELECTED_KEY)]; // return metadata of selected item
			}

			// callback called by onBeforeRebindTable of the smart table
			// add filters of the selected item to the search condition
			function onRebindContentControl(oEvent) {
				if (!oImplementingHelper) {
					return;
				}
				var oBindingParams = oEvent.getParameter("bindingParams");
				oState.oFiltersWithoutSmartFilterBar = jQuery.extend(true, {}, oBindingParams);
				// in Multi table mode we have to add the smartFilterbar values; for single table mode the values are set directly by SmartFilterbar so no need to add them here
				if (getMode() === "multi") {
					var aSmartFilterBarValues = oState.oSmartFilterbar.getFilters();
					// remember the custom filter without SmartFilterBar values, they will be used for updating counts in fnUpdateCounts
					oState.oFiltersForCounts = fnPrepareFiltersForCounts(oBindingParams);
					fnAdaptFilters(oState.oSmartTable, oBindingParams, aSmartFilterBarValues);
				} else if (getMode() === "single") {
					oState.oFiltersForCounts = jQuery.extend(true, {}, oBindingParams);
				}
				fnAddFiltersFromSelectionVariant(oBindingParams);
			}

			function fnAddFiltersFromSelectionVariant(oBindingParams) {
				var oItemData = getCurrentItemData(); // get metadata of selected item
				if (oItemData) {
					var aSelectionVariantFilters = oItemData.selectionVariantFilters;
					for (var i in aSelectionVariantFilters) { // add the filters of the selected item
						oBindingParams.filters.push(aSelectionVariantFilters[i]);
					}
				}
			}

			/* creates a deep copy of filters and removes those filters which were set directly on the table (via Settings/filters)
			 * as they should not be considered for the counts, also not for the currently visible tab ( according to the UX specification)
			 * oFilters should contain the custom filters( if any, they are set in oController.onBeforeRebindTableExtension) and values for the field "EditState" of the SmarFilterbar if set ( see setEditStateFilter in CommonEventHandler.js)
			 */
			function fnPrepareFiltersForCounts(oBindingParams){
				var oFilters = jQuery.extend(true, {}, oBindingParams);
				fnRemoveTableSettingsFromFilters(oFilters.filters, oState.oMultipleViewsHandler.aTableFilters);
				return oFilters;
			}

			/*
			 * relevant for different entity sets only
			 */
			function fnRemoveCustomFiltersNotSupported(oSmartControl, oBindingParams) {
				if (oImplementingHelper.getIsDifferentEntitySets && oImplementingHelper.getIsDifferentEntitySets()) {
					fnCheckIfFiltersSupported(oSmartControl, oBindingParams.filters);
				}
			}

			function fnRemoveTableSettingsFromFilters(aFiltersToBeRemovedFrom, aFiltersToBeRemoved) {
				for (var i in aFiltersToBeRemoved) {
					var oFilterToBeRemoved = aFiltersToBeRemoved[i];
					for (var j = aFiltersToBeRemovedFrom.length; j--; j >= 0) {
						if (JSON.stringify(aFiltersToBeRemovedFrom[j]) === JSON.stringify(oFilterToBeRemoved)) {
							aFiltersToBeRemovedFrom.splice(j, 1);
							break;
						}
					}
				}
			}

			/* Triggers update of the texts on all items
			 * oState.oFiltersForCounts contains editing status and custom filters if any
			 */
			function fnUpdateCounts() {
				var oModel = oState.oSmartTable.getModel();
				var aFilters = [], sTableEntitySet;
				var sSearchValue = oState.oSmartFilterbar.getBasicSearchValue();
				var oSearch = {};
				var aSmartFilterBarValues;
				if (sSearchValue) {
					oSearch = {
						search: sSearchValue
					};
				}
				var aFiltersTemp;
				for (var sKey in mItemData) { // loop over all items
					aFiltersTemp = jQuery.extend(true, {}, oState.oFiltersForCounts); // oState.oFiltersForCounts contains "editing status" and custom filters if any
				//	var aSmartFilterBarValuesCopy = jQuery.extend(true, [], aSmartFilterBarValues); // tried to avoid fetching filters each time but the deep copying here seems to have side effects so that aSmartFilterBarValues gets modified when aSmartFilterBarValuesCopy is modified
					aSmartFilterBarValues = oState.oSmartFilterbar.getFilters(); // get filters from SmartFilterbar;
					var oItemData = mItemData[sKey]; // get metadata for this item
					sTableEntitySet = oItemData.entitySet;
					if (!sTableEntitySet) {
						sTableEntitySet = oState.oSmartTable.getEntitySet();
					}
					oItemData.numberOfUpdates++; // start a new update call
					oItemData.updateStartFunction(oItemData.numberOfUpdates); // set counter busy
					if (getMode() === "multi") { // it is multiple views mode, both with one or several entity sets
						fnAdaptFilters(oItemData.implementingControl, aFiltersTemp, aSmartFilterBarValues);
					}
					if (oItemData.selectionVariantFilters && oItemData.selectionVariantFilters.length > 0) {
						aFilters = aFiltersTemp.filters.concat(oItemData.selectionVariantFilters); // note, that this does not modify the arrays which are concatenated
					} else {
						aFilters = aFiltersTemp.filters;
					}

					oModel.read("/" + sTableEntitySet + "/$count", {
						urlParameters: oSearch,
						filters: aFilters,
						groupId: "updateMultipleViewsItemsCounts", // send the requests for all count updates in one batch request
						success: oItemData.updateSuccessFunction.bind(null, oItemData.numberOfUpdates), // bind the success handler to the current request
						error: oItemData.errorFunction.bind(null, oItemData.numberOfUpdates) // bind the error handler to the current request
					});
				}
			}

			/*
			 * checks if "editing status" and custom filters contained in aFilters are supported by the entity set; it is only relevant for the different entity set case
			 * adds filters from aSmartFilterBarValues to aFilters, in case if different entity sets it is checked if the filters are supported by the entity set
			 * oSmartControl can be either a SmartTable or a SmartChart
			 * aFilters contains "editing status" filter and custom filters
			 * aSmartFilterBarValues contains filters to be added to aFilters
			 */
			function fnAdaptFilters(oSmartControl, aFilters, aSmartFilterBarValues) {
				// fnRemoveCustomFiltersNotSupported is only relevant for different entity sets mode
				fnRemoveCustomFiltersNotSupported(oSmartControl, aFilters);
				// add SmartFilterBar values if applicable for the entitySet
				fnAddFiltersFromSmartFilterbar(oSmartControl, aSmartFilterBarValues, aFilters);
			}

			function onDataRequested() {
				if (bShowCounts) {
					fnUpdateCounts();
				}
				if (getMode() === "multi") {
					oImplementingHelper.setTablesToDirtyExcept(oState.oSmartTable);
				}
			}

			function getShowCounts() {
				return bShowCounts;
			}

			function getImplementingHelper() {
				return oImplementingHelper;
			}

			function getMetaModelEntityType(oSmartControl) {
				var sEntitySet, oMetaModel, oEntitySet, oEntityType;
				sEntitySet = oSmartControl.getEntitySet();
				oMetaModel = oSmartControl.getModel().getMetaModel();
				oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
				oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				return oEntityType;
			}

			/*
			 * gets properties for the entityType of a oSmartControl
			 * oSmartControl can be either a SmartTable or a SmartChart
			 */
			function getEntityTypeProperties(oSmartControl) {
				var oEntityType = getMetaModelEntityType(oSmartControl);
				return oEntityType.property;
			}

			/*
			 * gets navigation properties for the entityType of a oSmartControl
			 * oSmartControl can be either a SmartTable or a SmartChart
			 */
			function getEntityTypeNavProperties(oSmartControl) {
				var oEntityType = getMetaModelEntityType(oSmartControl);
				return oEntityType.navigationProperty;
			}

			/*
			 * relevant for the case with multiple table tabs ( charts)
			 * adds values from the SmartFilterbar
			 * oSmartControl is either a SmartTable or a SmartChart
			 * aFilterValues are SmartFilterbar values, we make a deep copy inside the method so that aFilterValues is not changed
			 * oBindingParams is an object containing a property 'filters'. At the beginning it can contain the filter values form the editing status and custom filters.
			 *  it will get fields from the SmartFilterbar which are supported ( this check is only done in case of different entity sets
			 */
			function fnAddFiltersFromSmartFilterbar(oSmartControl, aFilterValues, oBindingParams) {
				var aFilters = [], aCombinedFilters = [], oFilter;
				if (aFilterValues.length < 1) {
					return;
				}

				if (oImplementingHelper.getIsDifferentEntitySets && oImplementingHelper.getIsDifferentEntitySets()) {
					aFilters = fnCheckIfFiltersSupported(oSmartControl, aFilterValues);
				} else {
					aFilters = aFilterValues;
				}

				aCombinedFilters = oBindingParams.filters && oBindingParams.filters.slice();

				aCombinedFilters = aCombinedFilters.concat(aFilters);
				oFilter = new Filter(aCombinedFilters, true);
				oBindingParams.filters = [oFilter];
			}

			/*
			 * function returns all entity set properties of the relevant control (oControl)
			 */
			function findEntityProperties(oControl) {
				var sKey;
				for (sKey in mItemData) {
					if (mItemData[sKey].implementingControl === oControl) {
						return mItemData[sKey].properties;
					}
				}
			}

			/*
			 * function returns all entity set properties to the given path
			 * the path can be just a property name, then the properties of the current entity set are returned
			 * the path can be a navigation property like navProp1/navProp2/navProp3/.../property
			 */
			function getEntityTypePropertiesOfPath(sPath, oSmartControl, oMetaModel, oEntityType, aNavProperties) {
				var aParts, sNavProperty, bFound, oAssociationEnd, aEntityProperties;
				if (sPath.indexOf("/") !== -1) { // sPath contains at least one navigation property
					aParts = sPath.split("/");
					for (var i = 0; i < aParts.length - 1; i++) { // loop over the navigation properties, the last element of the aParts is the property name so do not consider it
						sNavProperty = aParts[i];
						for (var i in aNavProperties) {
							if (aNavProperties[i].name === sNavProperty) {
								bFound = true;
								break;
							}
						}
						if (!bFound) {
							return false; // the navigation property is not present in the current entity type so no need to check further
						}
						oAssociationEnd = oMetaModel.getODataAssociationEnd(oEntityType, sNavProperty);
						oEntityType = oAssociationEnd && oMetaModel.getODataEntityType(oAssociationEnd.type);
						aNavProperties = oEntityType && oEntityType.navigationProperty;
					}
					aEntityProperties = oEntityType && oEntityType.property;
				} else {
					aEntityProperties = findEntityProperties(oSmartControl);
				}
				return aEntityProperties;
			}

			/*
			 * returns the property name of the path
			 * the path can be a simple one like 'adress' or contain navigation properties like 'adress/street'
			 */
			function getPropertyName(sPath) {
				var aParts, sPropertyName;
				if (sPath.indexOf("/") !== -1) { // sPath contains at least one navigation property
					aParts = sPath.split("/");
					sPropertyName = aParts.pop(); // the last one will be the property name
				} else {
					sPropertyName = sPath;
				}
				return sPropertyName;
			}

			/*
			 * it is relevant for the case with different entitySets only
			 * it returns a new array ( deep copy) containing only the filter values from the SmartFilterbar relevant for the entitytype of oSmartControl
			 */
			function fnCheckIfFiltersSupported(oSmartControl, aFilterValues) {
				var aEntityProperties, bFound, sFilterName, j, aPreparedFilters, aNavProperties, oMetaModel, oEntityType, aFilterValuesCopy, sFilterPropertyName, aFilterValuesCopy;
				if (!aFilterValues || aFilterValues.length < 1) {
					return;
				}
				oMetaModel = oSmartControl.getModel().getMetaModel();
				oEntityType = getMetaModelEntityType(oSmartControl);
				aNavProperties = getEntityTypeNavProperties(oSmartControl);

				aFilterValuesCopy = jQuery.extend(true, [], aFilterValues); // we make a copy so that we do not modify aFilterValues

				if (aFilterValuesCopy[0] && aFilterValuesCopy[0].aFilters instanceof Array) {
					aPreparedFilters = aFilterValuesCopy[0].aFilters;
				} else {
					aPreparedFilters = aFilterValuesCopy;
				}

				if (!aPreparedFilters) {
					return;
				}
				for (j = aPreparedFilters.length - 1; j >= 0; j--) {
					bFound = false;
					if (aPreparedFilters[j].aFilters instanceof Array) {
						sFilterName = aPreparedFilters[j].aFilters[0].sPath;
					} else {
						sFilterName = aPreparedFilters[j].sPath;
					}

					aEntityProperties = getEntityTypePropertiesOfPath(sFilterName, oSmartControl, oMetaModel, oEntityType, aNavProperties);
					if (!aEntityProperties) {
						aPreparedFilters.splice(j, 1);
						continue;
					}

					sFilterPropertyName = getPropertyName(sFilterName);


					/* eslint-disable no-loop-func */
					// check if the filter field is part of the entity type
					aEntityProperties.some(function(oProperty) {
						if (oProperty.name === sFilterPropertyName) {
							bFound = true;
							return bFound;
						}
					});

					// if the filter field is not part of the entity type delete it from the filter
					if (!bFound) {
						aPreparedFilters.splice(j, 1);
					}
				}
				// if aFilterValuesCopy is empty clear it up
				if (aFilterValuesCopy && aFilterValuesCopy[0] && aFilterValuesCopy[0].aFilters && aFilterValuesCopy[0].aFilters.length < 1) {
					aFilterValuesCopy = [];
				}
				return aFilterValuesCopy;
			}

			// End private instance methods

			(function() { // constructor coding encapsulated in order to reduce scope of helper variables
				var oConfig, oSettings, oQuickVariantSelectionX, oQuickVariantSelection;
				oConfig = oController.getOwnerComponent().getAppComponent().getConfig();
				oSettings = oConfig && oConfig.pages[0] && oConfig.pages[0].component && oConfig.pages[0].component.settings;
				if (!oSettings) {
					return;
				}
				oQuickVariantSelectionX = oSettings.quickVariantSelectionX;
				oQuickVariantSelection = oSettings.quickVariantSelection;
				if (oQuickVariantSelectionX && oQuickVariantSelection) {
					throw new Error("Defining both QuickVariantSelection and QuickVariantSelectionX in the manifest is not allowed.");
				}
				oQuickVariantSelectionEffective = oQuickVariantSelectionX || oQuickVariantSelection;
				if (!oQuickVariantSelectionEffective) {
					return;
				}
				bShowCounts = oQuickVariantSelectionEffective.showCounts;
				mItemData = Object.create(null);
				oTemplatePrivateModel.setProperty(PATH_TO_PROPERTIES, Object.create(null));
				oTemplatePrivateModel.setProperty(PATH_TO_ITEMS, Object.create(null));
				var oPageHeader = oController.byId("page");
				var fnSetInitialKey = function(sInitialKey){
					oTemplatePrivateModel.setProperty(PATH_TO_SELECTED_KEY, sInitialKey);
					// register on binding change after initial set of key
					var oBinding = oTemplatePrivateModel.bindProperty(PATH_TO_SELECTED_KEY);
					oBinding.attachChange(function(oChangeEvent) {
						// preserve the state of the LR header when switching the tabs
						if (oPageHeader) {
							oPageHeader.setPreserveHeaderStateOnScroll(true);
						}
						if (oImplementingHelper.onSelectedKeyChanged) {
							var sNewKey = oChangeEvent.getSource().getValue();
							oImplementingHelper.onSelectedKeyChanged(sNewKey);
						}
						var bSearchButtonPressed = oState.oIappStateHandler.areDataShownInTable();
						var bTableIsDirty = true;
						// check dirty state of current table (if not dirty, no refresh is required)
						// only relevant for multiple table mode
						if (typeof oImplementingHelper.isTableDirty === 'function') {
							bTableIsDirty = oImplementingHelper.isTableDirty(oState.oSmartTable);
						}
						if (oState.oWorklistData.bWorkListEnabled) {
							bSearchButtonPressed = true;
							bTableIsDirty = true;
						}
						if (bSearchButtonPressed && bTableIsDirty) {
							if (oTemplateUtils.oCommonUtils.isSmartChart(oState.oSmartTable)) {
								oState.oSmartTable.rebindChart();
								if (typeof oImplementingHelper.setTableDirty === 'function') {
									oImplementingHelper.setTableDirty(oState.oSmartTable, false);
								}
								//as a new variant is selected, we need both - rebind and refresh
							} else if (oTemplateUtils.oCommonUtils.isSmartTable(oState.oSmartTable)) {
								oState.oSmartTable.rebindTable();
								oTemplateUtils.oCommonUtils.refreshSmartTable(oState.oSmartTable);
								// moved to ControllerImplementation.onDataReceived
								/*
							if (typeof oImplementingHelper.setTableDirty === 'function') {
								oImplementingHelper.setTableDirty(oState.oSmartTable, false);
							}
								 */
							}
						} else {
							// need to update the toolbar button visibility here as the delete button would not be updated otherwise
							// see BCP:1770601204
							oTemplateUtils.oCommonUtils.setEnabledToolbarButtons(oState.oSmartTable);
						}
						oState.oIappStateHandler.changeIappState(true, bSearchButtonPressed);
						// reset the value of preserveHeaderStateonScroll
						if (oTemplateUtils.oCommonUtils.isSmartTable(oState.oSmartTable)) {
							if (oPageHeader && oPageHeader.getPreserveHeaderStateOnScroll()) {
								oPageHeader.setPreserveHeaderStateOnScroll(false);
							}
						}
					});
				};
				if (oQuickVariantSelection) {
					oImplementingHelper = new MultiViewsSingleTableHelper(oQuickVariantSelection, oState, oController, oTemplateUtils, fnSetInitialKey, mItemData);
					sMode = "single";
					jQuery.sap.log.info("This list supports multiple views with single table");
				} else {
					oImplementingHelper = new MultiViewsMultiTablesHelper(oQuickVariantSelectionX, oState, oController, oTemplateUtils, fnSetInitialKey, mItemData);
					sMode = "multi";
					jQuery.sap.log.info("This list supports multiple views with multiple tables/charts");
				}
				oTemplatePrivateModel.setProperty(PATH_TO_MODE, sMode);
			})();

			/* eslint-disable */
			var fnRemoveTableSettingsFromFilters = testableHelper.testable(fnRemoveTableSettingsFromFilters, "fnRemoveTableSettingsFromFilters");
			var fnCheckIfFiltersSupported = testableHelper.testable(fnCheckIfFiltersSupported, "fnCheckIfFiltersSupported");
			var findEntityProperties = testableHelper.testable(findEntityProperties, "findEntityProperties");
			var fnAddFiltersFromSmartFilterbar = testableHelper.testable(fnAddFiltersFromSmartFilterbar, "fnAddFiltersFromSmartFilterbar");
			/* eslint-enable */

			// public instance methods
			return {
				getEnableAutoBinding: getEnableAutoBinding,
				fnRegisterToChartEvents: fnRegisterToChartEvents,
				onDetailsActionPress: onDetailsActionPress,
				determineSortOrder: fnDetermineSortOrder,
				onDataRequested: onDataRequested,
				formatItemTextForMultipleView: formatItemTextForMultipleView,
				getContentForIappState: getContentForIappState,
				restoreFromIappState: fnRestoreFromIappState,
				getVariantSelectionKey: getVariantSelectionKey, // expose the selected key for extensionAPI
				init: fnInit,
				getMode: getMode,
				onRebindContentControl: onRebindContentControl,
				getShowCounts: getShowCounts,
				getImplementingHelper: getImplementingHelper
			};
		}

		return BaseObject.extend("sap.suite.ui.generic.template.ListReport.controller.MultipleViewsHandler", {
			constructor: function(oState, oController, oTemplateUtils) {
				jQuery.extend(this, getMethods(oState, oController, oTemplateUtils));
			}
		});
	});
