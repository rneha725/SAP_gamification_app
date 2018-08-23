/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define([
	"jquery.sap.global", "sap/ui/mdc/experimental/provider/adapter/base/ColumnWrapper",
	"sap/ui/mdc/experimental/provider/adapter/odata/Annotations"
], function(jQuery, ColumnWrapper, Annotations) {
	"use strict";

	var ODataColumnWrapper = ColumnWrapper.extend("sap.ui.mdc.experimental.provider.adapter.odata.v2.ODataColumnWrapper", {
		/**
		 * A map containing all fields that are relevant for the current table
		 */
		mColumns: {

		},
		/**
		 * A column wrapper to translate the behavior of an Odata entity type property and navigation
		 * property and how it acts as a table column.
		 *
		 * @param {object} oField - The entity property or navigation property
		 * @param {object} oLineItemAnnotation - Surrounding line item annotation
		 */
		constructor: function(oField,oLineItemAnnotation) {
			this.setLineItems(oLineItemAnnotation);
			ColumnWrapper.prototype.constructor.apply(this,[oField]);
		},

		switchField: function(oField) {
			ColumnWrapper.prototype.switchField.apply(this,[oField]);

			//check for the data field
			var oDataField = this.mColumns[this.key] || oField.getAnnotation(Annotations.DATA_FIELD.DEFAULT);

			if (oDataField) {
				//get hidden annotation
				if (oDataField[Annotations.HIDDEN]) {
					this.visible = false;
				}

				if (oDataField.Label) {
					this.label = oDataField.Label.String;
				}

				this.iconURL = oDataField.IconUrl ? oDataField.IconUrl : "";
			}
		},

		setLineItems: function(oLineItemAnnotation) {
			var sName;

			if (!this.oLineItemAnnotation || (this.oLineItemAnnotation !== oLineItemAnnotation)) {
				this.oLineItemAnnotation = oLineItemAnnotation;
				this.mColumns = {};
				for (sName in this.oLineItemAnnotation) {
					var oLineItem = this.oLineItemAnnotation[sName];
					if (oLineItem.RecordType !== Annotations.DATA_FIELD.FIELD) {
						continue;
					}

					this.mColumns[oLineItem.Value.Path] = oLineItem;
				}

			}
		}
	});

	return ODataColumnWrapper;

});