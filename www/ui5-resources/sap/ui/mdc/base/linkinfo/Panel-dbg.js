/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'jquery.sap.global', 'sap/ui/core/XMLComposite'
], function(jQuery, XMLComposite) {
	"use strict";

	/**
	 * Constructor for a new Panel.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class The Panel control is used to show <code>items</code>.
	 * @extends sap.ui.core.XMLComposite
	 * @author SAP SE
	 * @version 1.56.5
	 * @constructor
	 * @private
	 * @since 1.54.0
	 * @alias sap.ui.mdc.base.linkinfo.Panel
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var Panel = XMLComposite.extend("sap.ui.mdc.base.linkinfo.Panel", /** @lends sap.ui.mdc.base.linkinfo.Panel.prototype */
		{
			metadata: {
				library: "sap.ui.mdc",
				defaultAggregation: "items",
				properties: {
					/**
					 *  Determines whether the personalization button is shown inside the <code>Panel</code> control. Additionally the
					 *  personalization button is only then shown if something can be personalized.
					 */
					enablePersonalization: {
						type: "boolean",
						defaultValue: true
					}
				},
				aggregations: {
					/**
					 * Defines items.
					 */
					items: {
						type: "sap.ui.mdc.base.linkinfo.PanelItem",
						multiple: true,
						singularName: "item"
					},
					/**
					 * In addition to main item and items some additional content can be displayed in the panel.
					 */
					extraContent: {
						type: "sap.ui.core.Control",
						multiple: true,
						forwarding: {
							idSuffix: "--IDExtraContent",
							aggregation: "items"
						}
					}
				}
			}
		});

	Panel.prototype.init = function() {
		// Create a resource bundle for language specific texts
		this.setModel(new sap.ui.model.resource.ResourceModel({
			bundleUrl: sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc").oUrlInfo.url
		}), "i18n");
	};

	Panel.prototype.formatterIsMain = function(aItems) {
		return aItems.some(function(oItem) {
			return oItem.getIsMain() === true;
		});
	};
	Panel.prototype.mainItemFactory = function(sId, oBindingContext) {
		var oIcon = new sap.ui.core.Icon({
			visible: "{=${$this>icon} ? true:false}",
			src: "{$this>icon}",
			decorative: false
		});

		return new sap.m.HBox({
			items: [
				oIcon, new sap.m.VBox({
					items: [
						new sap.m.Link({
							visible: "{$this>visible}",
							enabled: "{=${$this>href} ? true:false}",
							text: "{$this>text}",
							href: "{$this>href}",
							target: "{$this>target}"
						}), new sap.m.Text({
							visible: "{=${$this>description} ? true:false}",
							text: "{$this>description}"
						})
					]
				})
			]
		});
	};
	Panel.prototype.itemsFactory = function(sId, oBindingContext) {
		var oLink = new sap.m.Link({
			visible: "{$this>visible}",
			text: "{$this>text}",
			href: "{$this>href}",
			target: "{$this>target}"
		});
		var bHasAtLeastOneIcon = this.getItems().some(function(oItem) {
			return oItem.getIsMain() !== true && !!oItem.getIcon();
		});
		var oIcon;
		if (bHasAtLeastOneIcon) {
			oIcon = new sap.ui.core.Icon({
				src: oBindingContext.getProperty("icon") ? oBindingContext.getProperty("icon") : "sap-icon://camera",
				decorative: false
			});
		}

		if (!oBindingContext.getProperty("description")) {
			oLink.addStyleClass("linkInfoPanelAvailableLinkWithoutGroup");
			return new sap.m.HBox({
				items: [
					oIcon, oLink
				]
			});
		}
		return new sap.m.HBox({
			layoutData: new sap.m.FlexItemData({
				styleClass: "linkInfoPanelAvailableLinkGroup"
			}),
			items: [
				oIcon, new sap.m.VBox({
					items: [
						oLink, new sap.m.Text({
							visible: "{$this>visible}",
							text: "{$this>description}"
						})
					]
				})
			]
		});
	};

	return Panel;

}, /* bExport= */true);
