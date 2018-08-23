/*
 * Static helper class to provide methods for easier access to ODataModel
 */

sap.ui.define(["sap/suite/ui/generic/template/lib/testableHelper"], function(testableHelper) {
	"use strict";

	// add Indirection to paths
	function addIndirection(oProperty, sPathSegment){
		var aRelevantProperties = ["Path", "CollectionPath", "PropertyPath"]; 
		for (var i in aRelevantProperties){
			var sProperty = aRelevantProperties[i]; 
			if (oProperty[sProperty] && oProperty[sProperty][0] !== "/"){ 
				oProperty[sProperty] = sPathSegment + "/" + oProperty[sProperty];
			}
		}
		for (var property in oProperty){
			if (oProperty.hasOwnProperty(property) && typeof oProperty[property] === "object"){
				addIndirection(oProperty[property], sPathSegment);
			} 
		}
		return oProperty;
	}
	
	// getODataProperty-method from ODataMetaModel is not able to follow paths containing navigation properties
	function getODataProperty(oMetaModel, oEntityType, sPath) {
		function fnFollowPath(oEntityType, aPath) {
			if (aPath.length === 0) { return oEntityType; }
			var sNavigationProperty = aPath.shift();
			var oPropertyOrg = fnFollowPath(oMetaModel
					.getODataEntityType(oMetaModel.getODataAssociationEnd(oEntityType, sNavigationProperty).type), aPath);
			return addIndirection(oPropertyOrg, sNavigationProperty);
		}
		var aPath = sPath.split("/");
		var sProperty = aPath.pop();
		return oMetaModel.getODataProperty(fnFollowPath(oEntityType, aPath), sProperty);
	}

	/* eslint-disable */
	var addIndirection = testableHelper.testableStatic(addIndirection, "modelHelper_addIndirection");
	/* eslint-enable */
	
	
	return {
		getODataProperty: getODataProperty
	};
});