/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

/**
 * Export progress dialog
 * @private
 */
sap.ui.define([ 'sap/m/Dialog', 'sap/m/DialogType', 'sap/m/Button', 'sap/m/ProgressIndicator', 'sap/m/Text', 'sap/m/MessageBox', 'sap/ui/core/ValueState' ],
		function(Dialog, DialogType, Button, ProgressIndicator, Text, MessageBox, ValueState) {
	'use strict';

	/* Async call to resource bundle */
	var oResourceBundlePromise = sap.ui.getCore().getLibraryResourceBundle("sap.ui.export", true);

	/**
	 * The method returns a new Promise that results in a new
	 * progress dialog.
	 *
	 * @returns {Promise} - Promise for progress dialog
	 */
	function createProgressDialog() {
		return new Promise(function(fnResolve, fnReject) {
			var dialog;

			oResourceBundlePromise.then(function(oResourceBundleResolve) {
				var cancelButton = new Button({
					text : oResourceBundleResolve.getText("CANCEL_BUTTON"),
					press : function() {
						if (dialog && dialog.oncancel) {
							dialog.oncancel();
						}
						dialog.finish();
					}
				});

				var progressIndicator = new ProgressIndicator({
					showValue : false,
					height : "0.75rem"
				});
				progressIndicator.addStyleClass("sapUiMediumMarginTop");

				dialog = new Dialog({
					title : oResourceBundleResolve.getText("PROGRESS_TITLE"),
					type : DialogType.Message,
					contentWidth : "500px",
					content : [
						new Text({text : oResourceBundleResolve.getText("PROGRESS_FETCHING_MSG")}),
						progressIndicator
					],
					endButton : cancelButton
				});

				dialog.updateStatus = function(nValue) {
					progressIndicator.setPercentValue(nValue);
				};

				dialog.finish = function() {
					dialog.close();
					progressIndicator.setPercentValue(0);
				};

				fnResolve(dialog);

				/* Return the original Promise resolve value to avoid side effect for subsequent executions */
				return oResourceBundleResolve;
			});
		});
	}

	function showWarningDialog(mParams) {
		return new Promise(function(fnResolve, fnReject) {

			oResourceBundlePromise.then(function(oResourceBundleResolve) {
				var warningText = oResourceBundleResolve.getText("SIZE_WARNING_MSG", [mParams.rows, mParams.columns]);
				var bContinue = false;
				var warningDialog = new Dialog({
					title: oResourceBundleResolve.getText('PROGRESS_TITLE'),
					type: DialogType.Message,
					state: ValueState.Warning,
					content: new Text({
						text: warningText
					}),
					beginButton: new Button({
						text: oResourceBundleResolve.getText("CANCEL_BUTTON"),
						press: function () {
							warningDialog.close();
						}
					}),
					endButton: new Button({
						text: oResourceBundleResolve.getText("EXPORT_BUTTON"),
						press: function () {
							bContinue = true;
							warningDialog.close();
						}
					}),
					afterClose: function() {
						warningDialog.destroy();
						bContinue ? fnResolve() : fnReject();
					}
				});
				warningDialog.open();

				/* Return the original Promise resolve value to avoid side effect for subsequent executions */
				return oResourceBundleResolve;
			});

		});
	}

	function showErrorMessage(sMessage) {
		oResourceBundlePromise.then(function(oResourceBundleResolve) {
			MessageBox.error(oResourceBundleResolve.getText("PROGRESS_ERROR_MSG") + "\n" + sMessage, {
				title : oResourceBundleResolve.getText("PROGRESS_ERROR_TITLE")
			});

			/* Return the original Promise resolve value to avoid side effect for subsequent executions */
			return oResourceBundleResolve;
		});
	}

	return {
		getProgressDialog : createProgressDialog,
		showErrorMessage: showErrorMessage,
		showWarningDialog: showWarningDialog
	};

}, /* bExport= */true);
