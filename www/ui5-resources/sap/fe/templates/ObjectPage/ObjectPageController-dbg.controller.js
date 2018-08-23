/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/mvc/Controller"
], function (jQuery, Controller) {
	"use strict";

	return Controller.extend("sap.fe.templates.ObjectPage.ObjectPageController", {
		onBeforeBinding: function() {
			var oObjectPage = this.byId("objectPage");
			//Setting the context binding to inactive state for all object page components.
			oObjectPage.getHeaderTitle().setBindingContext(null);
			oObjectPage.getHeaderContent()[0].setBindingContext(null);//The 0 is used because header content will have only one content (FlexBox).
			oObjectPage.getSections().forEach(function(oSection){
				oSection.getSubSections().forEach(function(oSubSection){
					oSubSection.setBindingContext(null);
				});
			});
			//Attaching the event to make the subsection context binding active when it is visible.
			oObjectPage.attachEvent("subSectionEnteredViewPort", function(oEvent) {
				var oObjectPage = oEvent.getSource();
				var oSubSection = oEvent.getParameter("subSection");
				oObjectPage.getHeaderTitle().setBindingContext(undefined);
				oObjectPage.getHeaderContent()[0].setBindingContext(undefined);//The 0 is used because header content will have only one content (FlexBox).
				oSubSection.setBindingContext(undefined);
			});
		},
		handlers: {
			onItemPress: function (oEvent) {
				var sPath = oEvent.getParameters().listItem.getBindingContext().getPath();
				this.getOwnerComponent().getTemplateUtils().getHashChanger().setHash(sPath);
			}

		}
	});
});
