/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define([
	"jquery.sap.global",
	"sap/ui/base/Object",
	"sap/fe/controller/ActionController",
	"sap/fe/controller/NavigationController",
	"sap/fe/core/MessageUtils",
	"sap/fe/core/CommonUtils",
	"sap/ui/core/routing/HashChanger"
], function (jQuery, BaseObject, ActionController, NavigationController, MessageUtils, CommonUtils, HashChanger) {
	"use strict";

	function getMethods(oTemplateContract) {

		function getMessageUtils() {
			if (!oTemplateContract.oMessageUtils) {
				oTemplateContract.oMessageUtils = new MessageUtils(this);
			}

			return oTemplateContract.oMessageUtils;
		}

		function getActionController() {
			if (!oTemplateContract.oActionController) {
				oTemplateContract.oActionController = new ActionController(this);
			}

			return oTemplateContract.oActionController;
		}

		function getNavigationController() {
			if (!oTemplateContract.oNavigationController) {
				oTemplateContract.oNavigationController = new NavigationController(oTemplateContract, this);
			}

			return oTemplateContract.oNavigationController;
		}

		function getCommonUtils() {
			if (!oTemplateContract.oCommonUtils) {
				oTemplateContract.oCommonUtils = new CommonUtils(this);
			}

			return oTemplateContract.oCommonUtils;
		}

		function getText(sTextId, parameters) {
			var aReplacementParameters;
			if (parameters){
				aReplacementParameters = parameters.constructor === Array ? parameters : [parameters];
			}

			var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe");
			return oResourceBundle.getText(sTextId, aReplacementParameters);
		}

		/* App State methods might be moved to an AppStateController */
		function getAppStateContainer(sId) {
				var sContainer = oTemplateContract.oAppStateModel.getProperty("/" + sId);

			if (sContainer) {
				return JSON.parse(sContainer);
			}
		}

		function setAppStateContainer(sId, oData) {
			oTemplateContract.oAppStateModel.setProperty("/" + sId, JSON.stringify(oData));

			var oAppStateData = oTemplateContract.oAppStateModel.getProperty("/");
			oTemplateContract.oAppState = sap.ushell.Container.getService("CrossApplicationNavigation").createEmptyAppState(oTemplateContract.oAppComponent);
			var oHashChanger = getHashChanger();

			// for now we anyway have only the iAppState in the hash parameters so keep it simple - at a later point of
			// time we should provide an util to set/remove only specific parameters without touching the others
			var sCurrentHash = oHashChanger.getAppHash();
			var aParts = sCurrentHash.split("?");
			var sAppHash = aParts[0];
			sAppHash += "?iAppState=" + oTemplateContract.oAppState.getKey();
			oHashChanger.replaceHash(sAppHash);

			oTemplateContract.oAppState.setData(oAppStateData);
			oTemplateContract.oAppState.save().fail(function () {
				// what shall we do now?
			});
		}

		function attachAppStateChanged(fn) {
			oTemplateContract.aAppStateChangedListener.push(fn);
		}

		function detachAppStateChanged(fn) {
			for (var i = 0; i < oTemplateContract.aAppStateChangedListener.length; i++){
				if (oTemplateContract.aAppStateChangedListener[i] === fn){
					oTemplateContract.aAppStateChangedListener.splice(i, 1);
				}
			}
		}

		function getHashChanger(){
			if (!oTemplateContract.oHashChanger){
				oTemplateContract.oHashChanger = HashChanger.getInstance();
			}

			return oTemplateContract.oHashChanger;
		}

		return {
			getText: getText,
			getActionController: getActionController,
			getNavigationController: getNavigationController,
			getMessageUtils: getMessageUtils,
			getCommonUtils: getCommonUtils,
			getBusyHelper: function () {
				return oTemplateContract.oBusyHelper;
			},
			getAppStateContainer: getAppStateContainer,
			setAppStateContainer: setAppStateContainer,
			attachAppStateChanged: attachAppStateChanged,
			detachAppStateChanged: detachAppStateChanged,
			getAppStateLoaded: function () {
				return oTemplateContract.oInnerAppStatePromise;
			},
			getHashChanger : getHashChanger
		};
	}

	return BaseObject.extend("sap.fe.core.TemplateUtils.js", {
		constructor: function (oTemplateContract) {
			jQuery.extend(this, getMethods( oTemplateContract));
		}
	});
});
