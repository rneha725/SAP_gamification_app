/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"sap/ui/core/Control"
], function(Control) {
	"use strict";

	return {
		getNameSpaceInfo: function(sClassName) {
			var oNameSpaceInfo = {};

			oNameSpaceInfo.className = sClassName;
			var aModule = sClassName.split(".");
			oNameSpaceInfo.localName = aModule.pop();
			oNameSpaceInfo.nameSpace = aModule.join(".");

			return oNameSpaceInfo;
		},

		className: function(xmlNode) {
			// localName for standard browsers, baseName for IE, nodeName in the absence of namespaces
			var localName = xmlNode.localName || xmlNode.baseName || xmlNode.nodeName;

			if (!localName) {
				return undefined;
			}

			return xmlNode.namespaceURI + "." + localName;
		}
	};

});
