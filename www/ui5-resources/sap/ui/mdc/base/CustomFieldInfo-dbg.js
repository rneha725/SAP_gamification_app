/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'./FieldInfoBase', 'sap/ui/core/Control', 'sap/ui/core/InvisibleText', 'sap/ui/base/ManagedObjectObserver'
], function(FieldInfoBase, Control, InvisibleText, ManagedObjectObserver) {
	"use strict";

	/**
	 * Constructor for a new CustomFieldInfo.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class A field help used in the <code>FieldInfo</code> aggregation in <code>Field</code> controls that allows to add custom content.
	 * @extends sap.ui.mdc.base.FieldInfoBase
	 * @version 1.56.5
	 * @constructor
	 * @private
	 * @since 1.54.0
	 * @alias sap.ui.mdc.base.CustomFieldInfo
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var CustomFieldInfo = FieldInfoBase.extend("sap.ui.mdc.base.CustomFieldInfo", /** @lends sap.ui.mdc.base.CustomFieldInfo.prototype */
	{
		metadata: {
			library: "sap.ui.mdc",
			properties: {
				},
			aggregations: {
				/**
				 * content of the Field info
				 */
				content: {
					type: "sap.ui.core.Control",
					multiple: false
				}
			},
			defaultAggregation: "content"
		}
	});

	CustomFieldInfo._oBox = undefined;

	CustomFieldInfo.prototype.init = function() {

		FieldInfoBase.prototype.init.apply(this, arguments);

		this._oObserver = new ManagedObjectObserver(_observeChanges.bind(this));

		this._oObserver.observe(this, {
			aggregations: ["content"]
		});

	};

	CustomFieldInfo.prototype.exit = function() {

		FieldInfoBase.prototype.exit.apply(this, arguments);

		if (this._oMyBox) {
			this._oMyBox.destroy();
			this._oMyBox = undefined;
		}

	};

	CustomFieldInfo.prototype.isTriggerable = function() {

		return !!this.getContent();

	};

	CustomFieldInfo.prototype.getDirectLink = function() {

		return null;

	};

	CustomFieldInfo.prototype.getPopoverTitle = function() {

		return "";

	};

	CustomFieldInfo.prototype.getPopoverContent = function() {

		if (!CustomFieldInfo._oBox) {
			CustomFieldInfo._oBox = Control.extend("sap.ui.mdc.base.CustomFieldInfoBox", {

				metadata : {
				},

				renderer : function(oRm, oBox) {

					var oContent = oBox._oInfo.getContent();

					oRm.write("<div");
					oRm.writeControlData(oBox);
					oRm.write(">");

					if (oContent) {
						oRm.renderControl(oContent);
					}

					oRm.write("</div>");
				}

			});
		}

		if (!this._oMyBox || this._oMyBox._bIsBeingDestroyed) {
			this._oMyBox = new CustomFieldInfo._oBox(this.getId() + "-box");
			this._oMyBox._oInfo = this;
		}

		return Promise.resolve(this._oMyBox);

	};

	function _observeChanges(oChanges) {

		if (oChanges.object == this) {
			// it's the FieldInfo
			if (oChanges.name == "content") {
				this.fireDataUpdate();
			}
		}

	}

	return CustomFieldInfo;

}, /* bExport= */true);
