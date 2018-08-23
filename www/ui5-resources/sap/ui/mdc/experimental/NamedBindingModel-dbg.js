/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

//Provides class sap.ui.mdc.experimental.NamedBindingModel
sap.ui.define([

], function () {
	"use strict";

	/**
	 * Register a named Binding
	 * @param {sap.ui.model.Binding} oBinding binding instance that should be registered in the model
	 * @private
	 */
	function registerNamedBinding(oBinding) {
		this._mNamedBindings = this._mNamedBindings || {};
		if (!this._mNamedBindings[oBinding.sId]) {
			this._mNamedBindings[oBinding.sId] = oBinding;
		} else if (this._mNamedBindings[oBinding.sId].promise) {
			/* In case a refrence binding was defined first we replace it with the real binding */
			var fnResolve = this._mNamedBindings[oBinding.sId].resolve;
			this._mNamedBindings[oBinding.sId] = oBinding;
			fnResolve(oBinding);
		} else {
			throw new Error('Duplicate ID for named binding: ' + oBinding.sId);
		}
	}

	/**
	 * Unregister a named Binding
	 * @param {sap.ui.model.Binding} oBinding binding instance that should be unregistered in the model
	 * @private
	 */
	function unregisterNamedBinding(oBinding){
		if (this._mNamedBindings && this._mNamedBindings[oBinding.sId]) {
			delete this._mNamedBindings[oBinding.sId];
		}
	}

	/**
	 * Access a named binding
	 *
	 * If a binding for a given sReferenceId is not yet registered the returned promise
	 * will resolve with the binding instance once it has been registered. This optimistic
	 * approach will never through an error, but maybe never resolve the promise
	 *
	 * @param {String} sReferenceId ID of a named binding
	 * @returns {Promise.<sap.ui.model.Binding>} Resolve function returns the binding instance
	 * @private
	 * @sap-restricted
	 * @static
	 */
	function getBindingForReference(sReferenceId) {
		this._mNamedBindings = this._mNamedBindings || {};
		if (typeof this._mNamedBindings[sReferenceId] === "undefined") {
			var fnResolve, promise = new Promise(function (resolve, reject) {
				fnResolve = resolve;
			});
			this._mNamedBindings[sReferenceId] = {
				promise: promise,
				resolve: fnResolve
			};
			return promise;

		} else if (this._mNamedBindings[sReferenceId].promise) {
			return this._mNamedBindings[sReferenceId].promise;
		} else {
			return Promise.resolve(this._mNamedBindings[sReferenceId]);
		}
	}

	/**
	 * Manage named list bindings
	 *
	 * @function
	 * @name sap.ui.mdc.experimental.NamedBindingModel#upgrade
	 * @param {sap.ui.model.odata.v4.ODataModel} oModel OData v4 model instance
	 * @return {Promise} Promise that resolves when the model has been upgraded
	 * @private
	 * @sap-restricted
	 * @static
	 */
	function upgrade(oModel) {
		var fnOriginal = {};

		oModel.registerNamedBinding = registerNamedBinding.bind(oModel);
		oModel.unregisterNamedBinding = unregisterNamedBinding.bind(oModel);
		oModel.getBindingForReference = getBindingForReference.bind(oModel);

		/* Overwrite bindList */
		fnOriginal.bindList = oModel.bindList;
		oModel.bindList = function (sPath, oContext, vSorters, vFilters, mParameters) {
			var sNamedBindingId = mParameters && mParameters.id, oListBinding;
			//delete the id from mParameters to avoid it being forwarded to the URL
			delete mParameters.id;
			oListBinding = fnOriginal.bindList.apply(this, arguments);
			if (sNamedBindingId) {
				oListBinding.sId = sNamedBindingId;
				this.registerNamedBinding(oListBinding);
			}
			return oListBinding;
		};

		return Promise.resolve();
	}
	/**
	 * @classdesc
	 * Static Model transformation for {@link sap.ui.model.odata.v4.ODataModel}
	 * to allow using named bindings
	 *
	 * @see {@link sap.ui.model.odata.v4.ODataModel}
	 * @namespace
	 * @alias sap.ui.mdc.experimental.NamedBindingModel
	 * @private
	 * @sap-restricted
	 * @experimental This module is only for experimental use! <br/><b>This is only a POC and maybe deleted</b>
	 * @since 1.49.0
	 */
	var NamedBindingModel = {
		upgrade: upgrade
	};

	return NamedBindingModel;

}, /* bExport= */true);
