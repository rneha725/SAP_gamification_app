/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'sap/ui/core/Element'
], function(Element) {
	"use strict";

	/**
	 * Constructor for a new ContactDetailsItem.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class Type for...
	 * @extends sap.ui.core.Element
	 * @version 1.56.5
	 * @constructor
	 * @private
	 * @since 1.56.0
	 * @alias sap.ui.mdc.base.linkinfo.ContactDetailsItem
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var ContactDetailsItem = Element.extend("sap.ui.mdc.base.linkinfo.ContactDetailsItem", /** @lends sap.ui.mdc.base.linkinfo.ContactDetailsItem.prototype */
		{
			metadata: {
				library: "sap.ui.mdc",
				properties: {
					sectionTitle: {
						type: "string",
						defaultValue: sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc").getText("linkinfo.POPOVER_CONTACT_SECTION_TITLE")
					},
					photo: {
						type: "string"
					},
					formattedName: {
						type: "string"
					},
					role: {
						type: "string"
					},
					title: {
						type: "string"
					},
					org: {
						type: "string"
					},
					parameters: {
						type: "object"
					}
				},
				defaultAggregation: "emails",
				aggregations: {
					emails: {
						type: "sap.ui.mdc.base.linkinfo.ContactDetailsEmailItem",
						multiple: true,
						singularName: "email"
					},
					phones: {
						type: "sap.ui.mdc.base.linkinfo.ContactDetailsPhoneItem",
						multiple: true,
						singularName: "phone"
					},
					addresses: {
						type: "sap.ui.mdc.base.linkinfo.ContactDetailsAddressItem",
						multiple: true,
						singularName: "address"
					}
				}
			}
		});

	return ContactDetailsItem;

}, /* bExport= */true);
