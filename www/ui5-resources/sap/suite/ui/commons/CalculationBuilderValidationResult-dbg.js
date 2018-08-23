sap.ui.define([
	"jquery.sap.global",
	"./library",
	"sap/ui/core/Control",
	"sap/ui/base/Object"
], function (jQuery, library, Control, BaseObject) {
	"use strict";

	/**
	 * Constructor for a new validation result.
	 *
	 * @class
	 * This control can be used for creating your own validation algorithm for custom functions.<br>
	 * Custom functions can be defined using {@link sap.suite.ui.commons.CalculationBuilderFunction}.
	 *
	 * @extends sap.ui.base.Object
	 *
	 * @author SAP SE
	 * @version 1.56.5
	 * @since 1.56.0
	 *
	 * @constructor
	 * @param {function} function A function to be called on the custom function.
	 * @public
	 *
	 * @alias sap.suite.ui.commons.CalculationBuilderValidationResult
	 */

	var CalculationBuilderValidationResult = BaseObject.extend("sap.suite.ui.commons.CalculationBuilderValidationResult", {
		constructor: function () {
			BaseObject.prototype.constructor.apply(this, arguments);
			this._aErrors = [];
		}
	});

	CalculationBuilderValidationResult.prototype.addError = function (oError) {
		this._aErrors.push(oError);
	};

	CalculationBuilderValidationResult.prototype.addErrors = function (aErrors) {
		jQuery.merge(this._aErrors, aErrors);
	};

	CalculationBuilderValidationResult.prototype.getErrors = function () {
		return this._aErrors;
	};

	return CalculationBuilderValidationResult;
});
