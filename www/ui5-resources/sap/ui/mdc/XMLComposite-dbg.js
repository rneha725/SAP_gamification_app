/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'sap/ui/core/XMLComposite',
	'./ResourceModel'
], function (XMLComposite, ResourceModel) {
	"use strict";
	var MDCXMLComposite = XMLComposite.extend("sap.ui.mdc.XMLComposite", {
		metadata: {
			"abstract" : true
		},
		defaultMetaModel: 'sap.ui.mdc.metaModel',
		alias: "this"
	});

	MDCXMLComposite.prototype.init = function() {
		if (ResourceModel){
			this.setModel(ResourceModel.getModel(), "$i18n");
		}
	};

	return MDCXMLComposite;
}, true);
