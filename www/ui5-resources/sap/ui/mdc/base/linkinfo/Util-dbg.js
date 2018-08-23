/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'./Factory'
], function(Factory) {
	"use strict";

	/**
	 * Provides utility functions for the Link info
	 *
	 * @author SAP SE
	 * @version 1.56.5
	 * @private
	 * @since 1.54.0
	 * @alias sap.ui.mdc.base.linkinfo.Util
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var Util = {

		/**
		 * Returns available actions with key.
		 *
		 * @param {Object[]} aMAvailableActions Available actions
		 * @returns {Object[]} Available actions containing key
		 */
		getStorableAvailableActions: function(aMAvailableActions) {
			return aMAvailableActions.filter(function(oMAvailableAction) {
				return oMAvailableAction.key !== undefined;
			});
		},

		/**
		 * Sort the string array in alphabetical order.
		 *
		 * @param {String[]} aNames String array
		 */
		sortArrayAlphabetical: function(aNames) {
			var sLanguage;
			try {
				sLanguage = sap.ui.getCore().getConfiguration().getLocale().toString();
				if (typeof window.Intl !== 'undefined') {
					var oCollator = window.Intl.Collator(sLanguage, {
						numeric: true
					});
					aNames.sort(function(a, b) {
						return oCollator.compare(a, b);
					});
				} else {
					aNames.sort(function(a, b) {
						return a.localeCompare(b, sLanguage, {
							numeric: true
						});
					});
				}
			} catch (oException) {
				// this exception can happen if the configured language is not convertible to BCP47 -> getLocale will deliver an exception
			}
		},

		/**
		 * @param {string} sKeyName: property name for key
		 * @param {string} sKeyValue: kay value which is looking for
		 * @param {Array} aArray: array where the element with key value 'sKeyValue' is looking for
		 * @returns {int} Index of sKey or -1 if not found
		 */
		getIndexByKey: function(sKeyName, sKeyValue, aArray) {
			if (!aArray || !aArray.length) {
				return -1;
			}
			var iIndex = -1;
			aArray.some(function(oElement, i) {
				if (oElement[sKeyName] !== undefined && oElement[sKeyName] === sKeyValue) {
					iIndex = i;
					return true;
				}
			});
			return iIndex;
		},

		/**
		 * Reads navigation targets using CrossApplicationNavigation of the unified shell service.
		 *
		 * @param {string} sSemanticObjectDefault Default semantic object name
		 * @param {string[]} aAdditionalSemanticObjects String array of additional semantic objects
		 * @param {string} sAppStateKey Application state key
		 * @param {sap.ui.core.Component} oComponent Component
		 * @param {object} oSemanticAttributes Semantic attributes
		 * @returns {Promise} A <code>Promise</code> for asynchronous execution
		 */
		retrieveNavigationTargets: function(sSemanticObjectDefault, aAdditionalSemanticObjects, sAppStateKey, oComponent, oSemanticAttributes) {
			var oNavigationTargets = {
				mainNavigation: undefined,
				ownNavigation: undefined,
				availableActions: []
			};
			return new Promise(function(resolve) {
				var oXApplNavigation = Factory.getService("CrossApplicationNavigation");
				var oURLParsing = Factory.getService("URLParsing");
				if (!oXApplNavigation || !oURLParsing) {
					jQuery.sap.log.error("Service 'CrossApplicationNavigation' or 'URLParsing' could not be obtained");
					return resolve(oNavigationTargets);
				}
				// Put the default SemanticObject at index 0 and then additional SemanticObjects
				var aSemanticObjects = [
					sSemanticObjectDefault
				].concat(aAdditionalSemanticObjects);
				var aParams = aSemanticObjects.map(function(sSemanticObject) {
					return [
						{
							semanticObject: sSemanticObject,
							params: oSemanticAttributes ? oSemanticAttributes[sSemanticObject] : undefined,
							appStateKey: sAppStateKey,
							ui5Component: oComponent,
							sortResultsBy: "text" // since 1.50
						}
					];
				});

				oXApplNavigation.getLinks(aParams).then(function(aLinks) {
					if (!aLinks || !aLinks.length) {
						return resolve(oNavigationTargets);
					}
					var sCurrentHash = oXApplNavigation.hrefForExternal();
					if (sCurrentHash && sCurrentHash.indexOf("?") !== -1) {
						// sCurrentHash can contain query string, cut it off!
						sCurrentHash = sCurrentHash.split("?")[0];
					}
					if (sCurrentHash) {
						// BCP 1770315035: we have to set the end-point '?' of action in order to avoid matching of "#SalesOrder-manage" in "#SalesOrder-manageFulfillment"
						sCurrentHash += "?";
					}
					var fnGetDescription = function(sSubTitle, sShortTitle) {
						if (sSubTitle && !sShortTitle) {
							return sSubTitle;
						} else if (!sSubTitle && sShortTitle) {
							return sShortTitle;
						} else if (sSubTitle && sShortTitle) {
							return sSubTitle + " - " + sShortTitle;
						}
					};
					aLinks[0][0].forEach(function(oLink) {
						var oShellHash = oURLParsing.parseShellHash(oLink.intent);
						var sKey = (oShellHash.semanticObject && oShellHash.action) ? oShellHash.semanticObject + "-" + oShellHash.action : undefined;
						var isSuperiorAction = (oLink.tags && oLink.tags.indexOf("superiorAction") > -1);

						if (oLink.intent.indexOf(sCurrentHash) === 0) {
							// Prevent current app from being listed
							// NOTE: If the navigation target exists in
							// multiple contexts (~XXXX in hash) they will all be skipped
							oNavigationTargets.ownNavigation = {
								href: oLink.intent,
								text: oLink.text
							};
							return;
						}

						// Check if a FactSheet exists for this SemanticObject (to skip the first one found)
						if (oShellHash.action && (oShellHash.action === 'displayFactSheet')) {
							// Prevent FactSheet from being listed in 'Related Apps' section. Requirement: Link with action 'displayFactSheet' should
							// be shown in the 'Main Link' Section
							oNavigationTargets.mainNavigation = {
								key: sKey,
								href: oLink.intent,
								text: sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc").getText("linkinfo.POPOVER_FACTSHEET"),
								visible: true,
								isSuperiorAction: isSuperiorAction,
								description: fnGetDescription(oLink.subTitle, oLink.shortTitle),
								isMain: true,
								icon: oLink.icon
							};
							return;
						}
						oNavigationTargets.availableActions.push({
							key: sKey,
							href: oLink.intent,
							text: oLink.text,
							visible: true,
							isSuperiorAction: isSuperiorAction,
							description: fnGetDescription(oLink.subTitle, oLink.shortTitle),
							isMain: false,
							icon: oLink.icon
						});
					});

					// Collect links of additional SemanticObjects
					var aAvailableIntents = [];
					for (var i = 1; i < aSemanticObjects.length; i++) {
						aAvailableIntents = aAvailableIntents.concat(aLinks[i][0]);
					}
					aAvailableIntents.forEach(function(oLink) {
						var oShellHash = oURLParsing.parseShellHash(oLink.intent);
						oNavigationTargets.availableActions.push({
							key: (oShellHash.semanticObject && oShellHash.action) ? oShellHash.semanticObject + "-" + oShellHash.action : undefined,
							href: oLink.intent,
							text: oLink.text,
							visible: true,
							isSuperiorAction: (oLink.tags && oLink.tags.indexOf("superiorAction") > -1),
							description: fnGetDescription(oLink.subTitle, oLink.shortTitle),
							isMain: false,
							icon: oLink.icon
						});
					});

					return resolve(oNavigationTargets);
				}, function() {
					jQuery.sap.log.error("'retrieveNavigationTargets' failed");
					return resolve(oNavigationTargets);
				});
			});
		}
	};

	return Util;
}, /* bExport= */true);
