/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'./FieldHelpBase'
], function(FieldHelpBase) {
	"use strict";

	/**
	 * Constructor for a new CustomFieldHelp.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class A field help used in the <code>FieldHelp</code> association in <code>Field</code> controls that allows to add custom content.
	 * @extends sap.ui.mdc.base.FieldHelpBase
	 * @version 1.56.5
	 * @constructor
	 * @private
	 * @since 1.54.0
	 * @alias sap.ui.mdc.base.CustomFieldHelp
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var CustomFieldHelp = FieldHelpBase.extend("sap.ui.mdc.base.CustomFieldHelp", /** @lends sap.ui.mdc.base.CustomFieldHelp.prototype */
	{
		metadata: {
			library: "sap.ui.mdc",
			properties: {
				},
			aggregations: {
				/**
				 * content of the Field help
				 */
				content: {
					type: "sap.ui.core.Control",
					multiple: false
				}
			},
			defaultAggregation: "content",
			events: {
				/**
				 * This event is fired before the field help opens
				 */
				beforeOpen: {
				}
			}
		}
	});

	CustomFieldHelp.prototype._createPopover = function() {

		var oPopover = FieldHelpBase.prototype._createPopover.apply(this, arguments);

		if (oPopover) { // empty if loaded async
			// use FieldHelps content in Popover -> overwrite hook
			oPopover._getAllContent = function(){
				var oFieldHelp = this.getParent();
				if (oFieldHelp) {
					var aContent = [];
					aContent.push(oFieldHelp.getContent());
					return aContent;
				} else {
					return this.getContent();
				}
			};
		}

		return oPopover;

	};

	/**
	 * Close the fieldHelp and fires the <code>select</code> event of the field help
	 *
	 * @param {string} sValue selected value
	 * @param {string} sAdditionalValue selected additional value
	 * @public
	 * @ui5-metamodel This method also will be described in the UI5 (legacy) designtime metamodel
	 */
	CustomFieldHelp.prototype.fireSelectEvent = function(sValue, sAdditionalValue) {

		this.close();
		this.fireSelect({value: sValue, additionalValue: sAdditionalValue});

	};

	CustomFieldHelp.prototype.open = function() {

		this.fireBeforeOpen();
		FieldHelpBase.prototype.open.apply(this, arguments);

	};

	return CustomFieldHelp;

}, /* bExport= */true);
