/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/mdc/Field",
	"sap/m/OverflowToolbar",
	"sap/m/SegmentedButton",
	"sap/m/ToolbarSpacer",
	"sap/m/Label",
	"sap/m/SegmentedButtonItem",
	"sap/m/Table",
	"sap/ui/table/Table",
	"sap/ui/mdc/Table",
	"sap/m/Toolbar"
], function (Control, MdcField, OverflowToolbar, SegmentedButton, ToolbarSpacer, Label, SegmentedButtonItem, MTable, UITable, MDCTable, MToolbar) {
	"use strict";
	var ViewSwitchContainer = Control.extend("sap.fe.ViewSwitchContainer", {
		metadata: {
			designtime: "sap/ui/mdc/designtime/ViewSwitchContainer.designtime",
			properties: {
			},
			events: {},
			aggregations: {
				items: {
					type: "sap.fe.experimental.ViewSwitchContainerItem",
					multiple: true,
					singularName: "item"
				}
			},
			publicMethods: []
		},

		init:function(){
			this.selectedButtonIndex = 0;
			this.vscTBContents = [];
		},
		renderer: {
			render: function(oRm,oControl){
				var aItems = oControl.getItems();
				var aSegemntedButtonItems = aItems.map(function(vscItem, index){
					return new SegmentedButtonItem({
						key: index.toString(),
						icon: vscItem.getIconurl()
					});
				});
				
				var oVscSegmentedButton = new SegmentedButton(
					{	
						selectedKey: oControl.selectedButtonIndex.toString(),
						items: aSegemntedButtonItems,
						selectionChange: oControl.handleSegmentedButtonPress.bind(oControl)
					}
				);
				//To get the Toolbar for different tables.
				var getTableToolBar = function(oTable){
					var oToolBar = null;
					if (oTable instanceof MTable) {
						oToolBar = oTable.getHeaderToolbar();
					} else {
						var aTableExtensions = oTable.getExtension();
						for (var index in aTableExtensions) {
							if (aTableExtensions[index] instanceof MToolbar) {
								oToolBar = aTableExtensions[index];
								break;
							}
						}
					}
					return oToolBar;
				};
				//To get the toolbar content from toolbar and set toolbar to hide.
				var getToolBarContent = function(oToolBar){
					var _aTBContent = oToolBar.getContent();
					_aTBContent.push(oVscSegmentedButton);
					oToolBar.setVisible(false);
					return _aTBContent;
				};

				if (oControl.vscTBContents.length != aItems.length) {
					aItems.forEach(function(vscItem) {
						var aTBContent = [
							new Label({
								text: "View Switch container"
							}),
							new ToolbarSpacer(),
							oVscSegmentedButton
						];
						var vscItemContent = vscItem.getContent();
						var oToolBar = {};
						if (vscItem.getToolbarId() != null || vscItem.getToolbarId() != undefined) {
							oToolBar = sap.ui.getCore().byId(vscItem.getToolbarId());
							aTBContent = getToolBarContent(oToolBar); 
						} else if (vscItemContent instanceof MDCTable || vscItemContent instanceof MTable || vscItemContent instanceof UITable) {
							var oTable = vscItemContent instanceof MDCTable ? vscItemContent.getInnerTable() : vscItemContent;
							oToolBar = getTableToolBar(oTable);
							aTBContent = getToolBarContent(oToolBar);
						}
						oControl.vscTBContents.push(aTBContent);
					});
				}

				var oOverFlowtoolBar = new OverflowToolbar({
					content: oControl.vscTBContents[oControl.selectedButtonIndex]
				});
				oRm.write("<div");       
				oRm.writeControlData(oControl);
				oRm.write(">");
				oRm.renderControl(oOverFlowtoolBar);    
				for (var i = 0; i < aItems.length; i++ ) {	
					if ( i != oControl.selectedButtonIndex ) {
						aItems[i].setVisible(false);
					} else {
						aItems[i].setVisible(true);
					}
					oRm.renderControl(aItems[i]);  
				}
				oRm.write("</div>");
			}
		}
	});
	/**
	 * @param  {Object} oEvent 
	 * This function is to set the selected index when a segmented button is clicked and rerender the VSC.
	 */
	ViewSwitchContainer.prototype.handleSegmentedButtonPress = function(oEvent){
		this.selectedButtonIndex = +oEvent.getParameter("item").getKey();
		this.rerender();
	};

	return ViewSwitchContainer;

}, /* bExport= */true);