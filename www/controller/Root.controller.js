sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], function(Controller, JSONModel) {
	"use strict";

	return Controller.extend("SAP_game.controller.Root", {
		onInit: function() {
			//connecting the tiles with this controller
			if(!this._summary) {
				this._summary = sap.ui.xmlfragment("SAP_game.view.fragment.summaryCard", this);
			}
			var oModel = new JSONModel(jQuery.sap.getModulePath("SAP_game.mockdata", "/products.json"));
			this.getView().setModel(oModel);
		},
		onPress: function() {
			console.log("working...!!");
		}
	});
});