/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'sap/m/Button',
	'sap/m/library'
], function (Button, mLibrary) {
	"use strict";

	var ButtonType = mLibrary.ButtonType;

	var Button = Button.extend("sap.ui.mdc.experimental.Action", {
		metadata: {
			properties: {
				actionName: "string",
				emphasized: 'boolean',
				mode: 'string',           // TODO: create enum: Inline / Isolated / ChangeSet etc
				multiplicityFrom: {
					type: "int"
				},
				multiplicityTo: {
					type: "int"
				}

			},
			events: {
				"callAction": {}
			}
		},

		onBeforeRendering: function () {
			if (this.getEmphasized()) {
				this.setType(ButtonType.Emphasized);
			}
		},
		init: function() {
			this.attachPress(this.handleActionButtonPress, this);
		},
		handleActionButtonPress: function (evt) {
			this.fireCallAction({
				actionName: this.getActionName(),
				actionLabel: this.getText(),
				model: this.getModel()
			});
		},

		renderer: {}
	});

	return Button;

}, /* bExport= */true);
