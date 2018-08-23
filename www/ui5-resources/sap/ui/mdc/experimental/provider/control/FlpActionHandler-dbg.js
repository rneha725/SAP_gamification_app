sap.ui.define([
	"sap/ui/mdc/experimental/provider/BaseControlProvider"
], function(BaseControlProvider) {
	"use strict";

	var FlpActionHandler = BaseControlProvider.extend("sap.ui.mdc.experimental.provider.control.FlpActionHandler", {
		driveWithMetadata: function(oControl, oAdapter) {
			// var that = this;
			// var sQualifier = this.getQualifier(oControl, oAdapter);

			this.provideProperty(oControl, "semanticObject", oAdapter.semanticObject.defaultSemanticObject);
			this.provideProperty(oControl, "additionalSemanticObjects", oAdapter.semanticObject.additionalSemanticObjects);
			this.provideProperty(oControl, "semanticObjectMapping", oAdapter.semanticObjectMapping);

			// var sAnnotationPath = oControl.getContactAnnotationPath();

			// if (sAnnotationPath) {
			// 	oAdapter.parent.then(function(oParent) {
			// 		var oContactObject = oParent.relation(sAnnotationPath);
            //
			// 		var fnContact = function(oControl, oContact) {
			// 			jQuery.sap.log.debug("Here has to happen something");
			// 		};
            //
			// 		if (oContactObject) {
			// 			var oContact = oContactObject.contactInfo;
			// 			that.provideObject(oControl, oContact, fnContact, "handle the contact annotation");
			// 		}
            //
			// 	});
            //
			// }
		}
	});

	return FlpActionHandler;
});
