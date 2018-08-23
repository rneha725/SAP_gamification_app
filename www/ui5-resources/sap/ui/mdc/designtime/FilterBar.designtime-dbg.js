/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/m/Dialog",
	"sap/m/Button",
	'sap/ui/mdc/base/ConditionModel',
	'sap/ui/mdc/experimental/P13nFilterPanel',
	'sap/ui/mdc/experimental/P13nFilterItem',
	"sap/ui/mdc/FilterField",
	"sap/ui/mdc/internal/common/Helper"],
	function (Dialog, Button, ConditionModel, P13nFilterPanel, P13nFilterItem, FilterField, CommonHelper) {
	"use strict";

	return {
		actions: {
			settings: function () {
				return {
					"addFilter": {
						name: "Add Filter", //TODO: Replace with i18n property
						isEnabled: function(oSelectedElement) {
							return true;
						},
						handler: function (oFilterBar) {
							return new Promise(function (fnResolve, fnReject) {
								var oConditionModel = oFilterBar.getModel(oFilterBar.getConditionModelName());
								var oConditionModelClone = oConditionModel.clone();
								var aFilters, aAllFilters, aFieldPaths, aHiddenFilters, oAdaptUIAddFiltersDialog, oAdaptFilterModel, aShownFieldPaths, aHiddenFieldPaths;

								var oP13nFilterPanel = new P13nFilterPanel();

								oFilterBar.oAdaptUIAddFiltersDialog = oAdaptUIAddFiltersDialog = new Dialog({
									title : "Add Filter", //TODO: Replace with i18n property
									contentHeight: "75%",
									content : oP13nFilterPanel,
									verticalScrolling: true,
									resizable : true,
									draggable : true,
									endButton: new Button({
										text: '{$i18n>filterbar.ADAPT_CANCEL}',
										press: function () {
											oAdaptUIAddFiltersDialog.close();
										}
									}),
									beginButton: new Button({
										text: '{$i18n>filterbar.ADAPT_OK}',
										type : 'Emphasized',
										press: function () {
											var aFilters = oAdaptFilterModel.getObject("/filters");
											var aItems = oP13nFilterPanel.getItems();
											var oSelectedItem, oSelectedFilter;
											aItems.forEach(function (oItem) {
												if (!!oItem.getSelected()) {
													oSelectedItem = oItem;
												}
											});
											aFilters.forEach(function (oFilter) {
												if (oSelectedItem.getColumnKey() === oFilter.columnKey) {
													oSelectedFilter = oFilter;
												}
											});
											oAdaptUIAddFiltersDialog.close();
											fnResolve(oSelectedFilter);
										}
									}),
									afterClose: function () {
										oAdaptUIAddFiltersDialog.getModel("p13n").destroy();
										oAdaptUIAddFiltersDialog.destroyContent();
										oAdaptUIAddFiltersDialog.destroy();
									}
								});

								aHiddenFieldPaths = [];
								aShownFieldPaths = [];
								aHiddenFilters = [];
								aFieldPaths = [];
								oAdaptFilterModel = oFilterBar._getAdaptFilterModel(oAdaptUIAddFiltersDialog);
								aAllFilters = oAdaptFilterModel.getObject("/filters");
								aAllFilters.forEach(function (oFilter) {
									aFieldPaths.push(oFilter.columnKey);
								});
								aFilters = oFilterBar._getFilterFieldControls();
								aFilters.forEach(function (oFilter) {
									aShownFieldPaths.push(oFilter.getFieldPath());
								});
								aFieldPaths.forEach(function (sFieldPath) {
									if (aShownFieldPaths.indexOf(sFieldPath) === -1) {
										aHiddenFieldPaths.push(sFieldPath);
									}
								});

								oAdaptUIAddFiltersDialog.setModel(oAdaptFilterModel, "p13n");
								oP13nFilterPanel.bindAggregation("items", {
									path: "/filters",
									model : "p13n",
									template: new P13nFilterItem({
										columnKey: "{p13n>columnKey}",
										text: "{p13n>text}",
										position: "{p13n>position}",
										tooltip: "{p13n>tooltip}",
										selected: "{p13n>selected}",
										control: "{p13n>control}",
										required: "{p13n>required}"
									})
								});

								for (var i = 0; i < aAllFilters.length; i++){
									if (aHiddenFieldPaths.indexOf(aAllFilters[i].columnKey) > -1) {
										aHiddenFilters.push(aAllFilters[i]);
									}
								}
								oAdaptFilterModel.setProperty("/filters", aHiddenFilters);

								oFilterBar.oAdaptUIAddFiltersDialog.setModel(oConditionModelClone, oFilterBar.getConditionModelName());
								oFilterBar.oAdaptUIAddFiltersDialog.open();
							}).then(
								function (oFilter) {
									return [{
										selectorControl : oFilterBar,
										changeSpecificData : {
											changeType : "addFilter",
											content : oFilter
										}
									}];
								}
							);
						}
					}
				};
			}
		},
		aggregations: {
			_content: {
				domRef: ":sap-domref",
				propagateMetadata: function (oElement) {
					var sType = oElement.getMetadata().getName();
					if (sType === "sap.ui.mdc.FilterField") {
						return {
							actions: {
								remove : {
									changeType: "removeFilter",
									changeOnRelevantContainer: true
								},
								reveal : {
									changeType: "addFilter",
									changeOnRelevantContainer: true
								}
							}
						};
					} else if (sType === "sap.ui.layout.AlignedFlowLayout") {
						return {
							aggregations : {
								content: {
									domRef: ":sap-domref",
									actions: {
										move : {
											changeType: "moveFilters",
											changeOnRelevantContainer: false
										}
									}
								}
							}
						};
					} else {
						return {
							actions: null
						};
					}
				},
				propagateRelevantContainer: function (oElement) {
					var sType = oElement.getMetadata().getName();
					if (sType === "sap.ui.layout.AlignedFlowLayout") {
						return oElement.getParent() ? oElement.getParent() : null;
					} else if (sType === "sap.ui.mdc.FilterBar") {
						return oElement;
					} else if (sType === "sap.ui.mdc.FilterField") {
						if (oElement.getParent() && oElement.getParent().getParent()) {
							return oElement.getParent().getParent();
						} else {
							return null;
						}
					} else {
						return null;
					}
				}
			}
		}
	};

}, /* bExport= */ false);
