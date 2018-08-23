/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'sap/ui/core/Element', 'sap/m/ResponsivePopover'
], function(Element, ResponsivePopover) {
	"use strict";

	/**
	 * Constructor for a new FieldInfoBase.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class A <code>FieldInfoBase</code> element is a base class that shows any kind of information related to the <code>Field</code> control, for example, navigation targets or contact details.
	 * @extends sap.ui.core.Element
	 * @version 1.56.5
	 * @constructor
	 * @private
	 * @since 1.54.0
	 * @alias sap.ui.mdc.base.FieldInfoBase
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var FieldInfoBase = Element.extend("sap.ui.mdc.base.FieldInfoBase", /** @lends sap.ui.mdc.base.FieldInfoBase.prototype */
	{
		metadata: {
			library: "sap.ui.mdc",
			events: {
				dataUpdate: {}
			}
		}
	});

	FieldInfoBase.prototype.init = function() {
		this._oPopover = null;
	};


	FieldInfoBase.prototype.exit = function() {
		if (this._oPopover) {
			this._oPopover.destroy(); // as FieldInfo could be destroyed while Popover is open
			this._oPopover = null;
		}
	};

	// ----------------------- Field API --------------------------------------------

	/**
	 * Returns <code>true</code> if the control created by <code>Field</code> can be triggered.
	 * @returns {boolean} <code>true</code> if control can be triggered.
	 * @protected
	 */
	FieldInfoBase.prototype.isTriggerable = function() {
		throw new Error("sap.ui.mdc.base.FieldInfoBase: method isTriggerable must be redefined");
	};

	/**
	 * Returns href which defines the target navigation of the <code>Link</code> control created by <code>Field</code>.
	 * In case of direct navigation, href is returned. If the information panel contains more content than only one link, undefined is returned.
	 * @returns {string | undefined} Href of link
	 * @protected
	 */
	FieldInfoBase.prototype.getTriggerHref = function() {
		var oLink = this.getDirectLink();
		return oLink ? oLink.getHref() : undefined;
	};

	/**
	 * Opens the info panel in the control created by <code>Field</code>.
	 * @returns {Promise} Promise which is resolved once the popover has been created
	 * @protected
	 */
	FieldInfoBase.prototype.open = function() {
		var oControl = this.getParent();
		if (!oControl || !this.isTriggerable()) {
			jQuery.sap.log.error("FieldInfoBase: Control for which the popover should be opened is not assigned. So the popover can not be opened.");
			return Promise.resolve();
		}
		var that = this;
		return this.createPopover().then(function(oPopover) {
			that.setPopover(oPopover);

			oControl.addDependent(oPopover);

			oPopover.openBy(oControl);
		});
	};

	// ----------------------- Abstract methods --------------------------------------------

	/**
	 * Returns link for direct navigation if the popover has only one link with no other information.
	 * @returns {sap.m.Link | null}
	 * @protected
	 */
	FieldInfoBase.prototype.getDirectLink = function() {
		throw new Error("sap.ui.mdc.base.FieldInfoBase: method getDirectLink must be redefined");
	};
	/**
	 * Returns the content of the popover.
	 * @returns {Promise} Promise with a popover content of type sap.ui.Control as result
	 * @protected
	 */
	FieldInfoBase.prototype.getPopoverContent = function() {
		throw new Error("sap.ui.mdc.base.FieldInfoBase: method getPopoverContent must be redefined");
	};
	/**
	 * Returns the title of the popover.
	 * @returns {string} Popover title
	 * @protected
	 */
	FieldInfoBase.prototype.getPopoverTitle = function() {
		throw new Error("sap.ui.mdc.base.FieldInfoBase: method getPopoverTitle must be redefined");
	};

	// ----------------------- Protected methods --------------------------------------------

	/**
	 * @returns {sap.ui.core.Control} Control
	 * @protected
	 */
	FieldInfoBase.prototype.getControl = function() {
		return this.getParent();
	};

	/**
	 * Returns internal popover.
	 * @returns {sap.m.Popover} Popover
	 * @protected
	 */
	FieldInfoBase.prototype.getPopover = function() {
		return this._oPopover;
	};

	// ----------------------- Private methods --------------------------------------------

	/**
	 * Sets internal popover.
	 * @param {sap.m.Popover} oPopover Internal popover
	 * @private
	 */
	FieldInfoBase.prototype.setPopover = function(oPopover) {
		this._oPopover = oPopover;
	};

	/**
	 * Creates a default popover instance.
	 * @returns {Promise} Promise with a popover as result
	 * @private
	 */
	FieldInfoBase.prototype.createPopover = function() {
		var that = this;
		return this.getPopoverContent().then(function(oPopoverContent) {
			return new ResponsivePopover(that.getId() + "-popover", {
				title: that.getPopoverTitle(),
				contentWidth: "380px",
				horizontalScrolling: false,
				showHeader: sap.ui.Device.system.phone,
				placement: sap.m.PlacementType.Auto,
				content: [
					oPopoverContent
				],
				afterClose: function() {
					var oPopover = that.getPopover();
					if (oPopover) {
						oPopover.destroy();
					}
				}
			});
		});
	};

	return FieldInfoBase;

}, /* bExport= */true);
