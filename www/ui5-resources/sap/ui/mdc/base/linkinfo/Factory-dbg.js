/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'sap/ui/fl/Utils'
], function(Utils) {
	"use strict";

	/**
	 * @namespace Factory to access services outside of sap.ui.mdc library like for example <code>ushell</code> services.
	 * @name sap.ui.mdc.base.linkinfo.Factory
	 * @author SAP SE
	 * @version 1.56.5
	 * @private
	 * @since 1.54.0
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	return {
		getService: function(sServiceName) {
			switch (sServiceName) {
				case "CrossApplicationNavigation":
					return sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("CrossApplicationNavigation");
				case "URLParsing":
					return sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("URLParsing");
				case "FlUtils":
					return Utils;
					// case "FlexConnector":
					// 	return FlexConnector;
				default:
					return null;
			}
		}
	};
}, /* bExport= */true);
