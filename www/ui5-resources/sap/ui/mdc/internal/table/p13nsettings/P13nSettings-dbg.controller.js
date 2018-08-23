/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel"
], function (Controller, Sorter, JSONModel) {
	"use strict";
	return Controller.extend("sap.ui.mdc.internal.table.p13nsettings.P13nSettings", {
		//Event handler for Cancel button
		onCancel: function (oEvent) {
			oEvent.getSource().close();
			this.getView().destroy();
		},
		//Event handler for OK button
		onConfirm: function (oEvent) {
			var aPanels = oEvent.getSource().getPanels(),
				oOldSortItems = this.oTableController.oP13nSettingsPropertyModel.oData.p13nSortItems,
				oOldGroupItems = this.oTableController.oP13nSettingsPropertyModel.oData.p13nGroupItems,
				aCondition = [],
				aSorters = [],
				sPath,
				bDescending, isSorted = false, isGrouped = false,
				bChanged = false,
				iIndex;

			for (iIndex in aPanels) {
				var sPanelName = aPanels[iIndex].getMetadata().getName();
				if (sPanelName === "sap.m.P13nSortPanel") {
					aCondition.sortCondition = aPanels[iIndex]._getConditions();
				}
				if (sPanelName === "sap.m.P13nGroupPanel") {
					aCondition.groupCondition = aPanels[iIndex]._getConditions();
				}
			}

			var fnGroup = function (oContext) {
				sPath = (aCondition.groupCondition && aCondition.groupCondition[0].keyField);
				var sKey = oContext.getProperty(sPath);
				var sName = (aCondition.groupCondition[0] && aCondition.groupCondition[0].text);

				if (sName.indexOf(":") > 0) {
					sName = sName.substr(0, sName.indexOf(":"));
				}

				return {
					key: sKey,
					text: sName + " : " + sKey
				};
			};

			var fnConditionsChanged = function (oOldCondition, oNewCondition, sOperation) {
				//Did not choose any entry in both times
				if (oOldCondition.length === 0 && (!oNewCondition || oNewCondition.length === 0)) {
					return false;
				}

				if (oOldCondition && oNewCondition && oOldCondition.length !== oNewCondition.length) {
					return true;
				}
				//OldCondition present, new condition absent.
				//Happens in scenario when Sort was applied, grouping was just opened and closed and again sort dialog is opened
				//Condition was not changed, it just needs to be maintained
				if (oOldCondition && oNewCondition === undefined) {
					if (sOperation === "group") {
						aCondition.groupCondition = oOldCondition;
					}
					if (sOperation === "sort") {
						aCondition.sortCondition = oOldCondition;
					}
					return false;
				}

				if (oNewCondition) {
					for (iIndex in oOldCondition) {
						if (!(oOldCondition[iIndex].columnKey === oNewCondition[iIndex].keyField && oOldCondition[iIndex].operation === oNewCondition[iIndex].operation)) {
							bChanged = true;
							break;
						}
					}
				}
				return bChanged;
			};

			var bGroupingChanged = fnConditionsChanged(oOldGroupItems, aCondition.groupCondition, "group"),
				bSortingChanged = fnConditionsChanged(oOldSortItems, aCondition.sortCondition, "sort");

			//Perform operations only when the conditions are changed
			//grouping
			if (bGroupingChanged && aCondition.groupCondition && aCondition.groupCondition.length > 0) {
				sPath = aCondition.groupCondition[0] && (aCondition.groupCondition[0].keyField);
				bDescending = !!(aCondition[0] && aCondition[0].operation === "GroupDescending");
				var oGroupSorter = new Sorter(sPath, bDescending, fnGroup);
				aSorters.push(oGroupSorter);
				isGrouped = true;
			}

			//sorting
			if (bSortingChanged && aCondition.sortCondition) {
				for (iIndex in aCondition.sortCondition) {
					sPath = aCondition.sortCondition[iIndex].keyField;
					bDescending = !!(aCondition.sortCondition[iIndex].operation === "Descending");
					aSorters.push(new Sorter(sPath, bDescending));
					isSorted = true;
				}
			}

			//When a sort or group was previously applied and is now removed
			if ((bSortingChanged || bGroupingChanged) && aSorters.length === 0) {
				var aKeyAttr = this.oTableController.oP13nSettingsPropertyModel.getData().keyAttributes;
				for (iIndex in aKeyAttr) {
					aSorters.push(new Sorter(aKeyAttr[iIndex]));
				}
			}
			this._saveP13DialogState(aCondition, isGrouped, isSorted);

			this.oTableController.applyGroupAndSort(aSorters);
			oEvent.getSource().close();
			this.getView().destroy();
		},
		_saveP13DialogState: function (aCondition, isGrouped, isSorted) {
			var oP13SettingsModelData = this.oView.getModel().getData(),
				iIndex,
				_tempObj;

			//Sorting was saved only because it was not changed, but now grouping is applied
			//In case of multi tabs, both sort and group data are saved
			if (!oP13SettingsModelData.isMultiTab && isGrouped && aCondition.sortCondition && aCondition.sortCondition.length > 0) {
				aCondition.sortCondition = [];
			}
			//Grouping was saved only because it was not changed, but now sorting is applied
			//In case of multi tabs, both sort and group data are saved
			if (!oP13SettingsModelData.isMultiTab && isSorted && aCondition.groupCondition && aCondition.groupCondition.length > 0) {
				aCondition.groupCondition = [];
			}

			//Saving sorting panel state.
			var aP13nSortItems = [];
			for (iIndex in aCondition.sortCondition) {
				_tempObj = {
					"columnKey": aCondition.sortCondition[iIndex].keyField || aCondition.sortCondition[iIndex].columnKey,
					"operation": aCondition.sortCondition[iIndex].operation
				};
				aP13nSortItems.push(_tempObj);
			}
			oP13SettingsModelData.p13nSortItems = aP13nSortItems;

			//Saving grouping panel state
			var aP13nGroupItems = [];
			if (aCondition.groupCondition != undefined && aCondition.groupCondition != null) {
				for (iIndex in aCondition.groupCondition) {
					_tempObj = {
						"columnKey": aCondition.groupCondition[iIndex].keyField || aCondition.groupCondition[iIndex].columnKey,
						"operation": aCondition.groupCondition[iIndex].operation
					};
					aP13nGroupItems.push(_tempObj);
				}
			}
			oP13SettingsModelData.p13nGroupItems = aP13nGroupItems;

			// //Saving the column panel state
			// var aP13nColumnItemsKeys = [];
			// if (this.oView.byId("p13nDialog").getPanels().length === 3) {
			// 	aP13nColumnItemsKeys = this.oView.byId("p13nDialog").getPanels()[2].getOkPayload().selectedItems.map( function(selectedItem) {
			// 		return selectedItem.columnKey;
			// 	});
			// } else {
			// 	aP13nColumnItemsKeys = this.oView.byId("p13nDialog").getPanels()[1].getOkPayload().selectedItems.map( function(selectedItem) {
			// 		return selectedItem.columnKey;
			// 	});
			// }

			// var aP13nColumnItems = [];
			// for (var iIndex in oP13SettingsModelData.columnPanelItems) {
			// 	var _tempObject = JSON.parse(JSON.stringify(oP13SettingsModelData.columnPanelItems[iIndex]));
			// 	if (aP13nColumnItemsKeys.iIndexOf(oP13SettingsModelData.columnPanelItems[iIndex].columnKey) > -1) {
			// 		_tempObject.selected = true;
			// 		aP13nColumnItems.push(_tempObject);
			// 	} else {
			// 		_tempObject.selected = false;
			// 		aP13nColumnItems.push(_tempObject);
			// 	}
			// }
			// oP13SettingsModelData.columnPanelItems = aP13nColumnItems;


			this.oTableController.oP13nSettingsPropertyModel = new JSONModel(oP13SettingsModelData);
		}
	});
});
