/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

/**
 * @namespace Provides validator functions for the personalization dialog
 * @name sap.ui.comp.personalization.Validator
 * @author SAP SE
 * @version 1.56.5
 * @private
 * @since 1.48.0
 */
sap.ui.define([
	'sap/m/library', 'sap/ui/core/MessageType'
], function(MLibrary, MessageType) {
	"use strict";
	var Validator = {

		/**
		 * Also if in case of the AnalyticalTable the inResult=true we have to show warning if the column is not visible.
		 */
		checkGroupAndColumns: function(sTableType, oSetting, oColumnKey2ColumnMap, oPersistentDataTotal, aResult) {
			if (sTableType !== sap.ui.comp.personalization.TableType.AnalyticalTable || !oSetting.group || !oSetting.columns) {
				return Promise.resolve(aResult);
			}
			for ( var sColumnKey in oColumnKey2ColumnMap) {
				var bColumnSelected = oSetting.columns.controller.isColumnSelected(oPersistentDataTotal.columns, sColumnKey);
				var bGroupSelected = oSetting.group.controller.isGroupSelected(oPersistentDataTotal.group, sColumnKey);
				if (bGroupSelected && !bColumnSelected) {
					aResult.push({
						columnKey: sColumnKey,
						panelTypes: [
							sap.m.P13nPanelType.group, sap.m.P13nPanelType.columns
						],
						messageType: MessageType.Warning,
						messageText: sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("PERSODIALOG_MSG_GROUPING_NOT_POSSIBLE_DESCRIPTION")
					});
				}
			}
			return Promise.resolve(aResult);
		},

		checkSaveChanges: function(sTableType, oSetting, oControlDataReduce, aResult) {
			if (sTableType !== sap.ui.comp.personalization.TableType.SelectionWrapper || !oSetting.selection || !oSetting.selection.payload || !oControlDataReduce || !oControlDataReduce.selection) {
				return Promise.resolve(aResult);
			}

			return oSetting.selection.payload.callbackSaveChanges(oControlDataReduce.selection.selectionItems).then(function(bSaved) {
				if (bSaved) {
					return aResult;
				}
				aResult.push({
					panelTypes: [
						sap.m.P13nPanelType.selection
					],
					messageType: MessageType.Error,
					messageText: sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("PERSODIALOG_MSG_CHANGES_SAVE_FAILED")
				});
				return aResult;
			});
		},

		checkChartConsistency: function(sTableType, oSetting, oControlDataReduce, aResult) {
			if (sTableType !== sap.ui.comp.personalization.TableType.ChartWrapper) {
				return Promise.resolve(aResult);
			}
			var bIsConsistent = oSetting.dimeasure.controller.isChartConsistent(oControlDataReduce);
			if (!bIsConsistent) {
				aResult.push({
					panelTypes: [
						sap.m.P13nPanelType.dimeasure
					],
					messageType: MessageType.Error,
					messageText: sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("PERSODIALOG_MSG_VALIDATION_CHARTTYPE")
				});
			}
			return Promise.resolve(aResult);
		}
	};
	return Validator;
}, /* bExport= */true);
