sap.ui.define([
	"sap/ui/base/Object"
], function(BaseObject) {
	"use strict";

	var AbstractKnowlegdeBase = BaseObject.extend("sap.ui.mdc.experimental.provider.control.AbstractKnowlegdeBase", {
		constructor: function() {
			this.init();
		},
		init: function() {

		},
		getProvider: function(oControl) {
			throw new Error("sap.ui.mdc.experimental.provider.control.AbstractKnowlegdeBase:  method getPtovider must be redefined");
		},
		/**
		 * Returns the name of the class
		 * 
		 * @return {string} The name of the provider
		 */
		getName: function() {
			return Object.getPrototypeOf(this)._sName;
		}
	});

	return AbstractKnowlegdeBase;
});
