/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(['sap/ui/model/resource/ResourceModel'], function(ResourceModel) {
	"use strict";
	var oResourceModel = new ResourceModel({ bundleName: "sap.ui.mdc.messagebundle", async : true}),
		oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");

	return {
		/**
		 * Return the resource model for the library
		 * @private
		 * @returns {sap.ui.model.resource.ResourceModel} The resource model for this library
		 */
		getModel: function(){
			return oResourceModel;
		},
		/**
		 * Returns a text from the resource bundle of this library
		 * @borrows jQuery.sap.util.ResourceBundle.prototype.getText
		 */
		getText: function(sText, aParameter){
			return oResourceBundle.getText(sText, aParameter);
		}
	};
}, true);
