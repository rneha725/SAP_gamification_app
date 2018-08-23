sap.ui.define([
	'jquery.sap.global',
	'sap/ui/core/XMLComposite',
	'sap/ui/base/ManagedObject',
	'sap/ui/Device',
	'sap/fe/core/AnnotationHelper'
], function (jQuery, XMLComposite, ManagedObject, Device) {
	"use strict";
	var ViewSwitchContainer = XMLComposite.extend("sap.fe.ViewSwitchContainer", {
        metadata: {
			designTime: true,
			specialSettings: {
				metadataContexts: {
					defaultValue: "{ model: 'variant', path:'',  name: 'variant'}"
				}
			},
			properties: {},
			events: {},
			aggregations: {},
			publicMethods: []
		},
		alias: "this",
		fragment: "sap.fe.controls._ViewSwitchContainer.ViewSwitchContainer"
	});

	ViewSwitchContainer.prototype.init = function () {};
	ViewSwitchContainer._helper = {
		/**
		 * @param  {Object} oContext:Context of the control
		 * @param  {Object} sortOrder: Object for sort order in table
		 * @param  {Object} groupBy: group by object from presentation variant
		 * @param  {Object} oInterface: Interface of the view context
		 * @param  {String} sPath: Path of the navigation
		 * @returns {String} table binding path
		 */
		getPVNavigationPath:function(oContext,sortOrder,groupBy,oInterface,sPath){
			var sPVNavigationPath = null;
			var sNavigationPath = sap.ui.model.odata.v4.AnnotationHelper.getNavigationPath(sPath);
			var sortOrderPath = sortOrder ? sortOrder[0].Property.$PropertyPath : null;
			var groupByPath = groupByPath ? groupBy[0].$PropertyPath : null;
			if (sortOrderPath && sortOrderPath.split("/")[1]) {// The 1 is temporarily used and will changed for dynamic behaviour
				sortOrderPath = sortOrderPath.split("/")[1];
			}
			if (groupByPath && groupByPath.split("/")[1]) { // The 1 is temporarily used and will changed for dynamic behaviour
				sortOrderPath = sortOrderPath + "," + groupByPath.split("/")[1];
			}
			if (!sortOrderPath) {
				sPVNavigationPath = sNavigationPath;
			} else {
				sPVNavigationPath = "\\{path:'" + sNavigationPath + "',parameters:\\{$orderby:'" + sortOrderPath + "'\\}\\}";
			}
			return sPVNavigationPath;
		}
	};

	ViewSwitchContainer._helper.getPVNavigationPath.requiresIContext = true;

	return ViewSwitchContainer;

}, /* bExport= */true);