/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'sap/ui/core/Element'
], function(Element) {
	"use strict";

	/**
	 * Constructor for a new ContactDetailsAddressItem.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class Type for...
	 * @extends sap.ui.core.Element
	 * @version 1.56.5
	 * @constructor
	 * @private
	 * @since 1.56.0
	 * @alias sap.ui.mdc.base.linkinfo.ContactDetailsAddressItem
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var ContactDetailsAddressItem = Element.extend("sap.ui.mdc.base.linkinfo.ContactDetailsAddressItem", /** @lends sap.ui.mdc.base.linkinfo.ContactDetailsAddressItem.prototype */
		{
			metadata: {
				library: "sap.ui.mdc",
				properties: {
					street: {
						type: "string"
					},
					code: {
						type: "string"
					},
					locality: {
						type: "string"
					},
					region: {
						type: "string"
					},
					country: {
						type: "string"
					},
					/**
					 * Address types:  "work", "home", "preferred"
					 */
					types: {
						type: "string[]",
						defaultValue: []
					}
				}
			}
		});

	return ContactDetailsAddressItem;

}, /* bExport= */true);
