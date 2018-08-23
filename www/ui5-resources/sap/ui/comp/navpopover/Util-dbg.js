/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

/**
 * Provides utility functions for the personalization dialog
 *
 * @author SAP SE
 * @version 1.56.5
 * @private
 * @since 1.25.0
 * @alias sap.ui.comp.personalization.Util
 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
 */
sap.ui.define([
	'sap/ui/comp/library', './Factory', './LinkData'
], function(CompLibrary, Factory, LinkData) {
	"use strict";

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
		 * Reads navigation targets using CrossApplicationNavigation of the unified shell service.
		 *
		 * @param {string} sSemanticObjectDefault Default semantic object name
		 * @param {string[]} aAdditionalSemanticObjects String array of additional semantic objects
		 * @param {string} sAppStateKey Application state key
		 * @param {sap.ui.core.Component} oComponent Component
		 * @param {object} oSemanticAttributes Semantic attributes
		 * @param {string} sMainNavigationId Main navigation id
		 * @returns {Promise} A <code>Promise</code> for asynchronous execution
		 */
		retrieveNavigationTargets: function(sSemanticObjectDefault, aAdditionalSemanticObjects, sAppStateKey, oComponent, oSemanticAttributes, sMainNavigationId) {
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

					aLinks[0][0].forEach(function(oLink) {
						var oShellHash = oURLParsing.parseShellHash(oLink.intent);
						var sKey = (oShellHash.semanticObject && oShellHash.action) ? oShellHash.semanticObject + "-" + oShellHash.action : undefined;
						var isSuperiorAction = (oLink.tags && oLink.tags.indexOf("superiorAction") > -1);
						// var sDescription;
						// if (oLink.subTitle && !oLink.shortTitle) {
						// 	sDescription = oLink.subTitle;
						// } else if (!oLink.subTitle && oLink.shortTitle) {
						// 	sDescription = oLink.shortTitle;
						// } else if (oLink.subTitle && oLink.shortTitle) {
						// 	sDescription = oLink.subTitle + " - " + oLink.shortTitle;
						// }

						if (oLink.intent.indexOf(sCurrentHash) === 0) {
							// Prevent current app from being listed
							// NOTE: If the navigation target exists in
							// multiple contexts (~XXXX in hash) they will all be skipped
							oNavigationTargets.ownNavigation = new LinkData({
								key: sKey,
								href: oLink.intent,
								text: oLink.text,
								visible: true,
								isSuperiorAction: isSuperiorAction
								// ,
								// description: sDescription
							});
							return;
						}

						// Check if a FactSheet exists for this SemanticObject (to skip the first one found)
						if (oShellHash.action && (oShellHash.action === 'displayFactSheet')) {
							// Prevent FactSheet from being listed in 'Related Apps' section. Requirement: Link with action 'displayFactSheet' should
							// be shown in the 'Main Link' Section
							oNavigationTargets.mainNavigation = new LinkData({
								key: sKey,
								href: oLink.intent,
								text: sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("POPOVER_FACTSHEET"),
								visible: true,
								isSuperiorAction: isSuperiorAction
								// ,
								// description: sDescription
							});
							return;
						}
						oNavigationTargets.availableActions.push(new LinkData({
							key: sKey,
							href: oLink.intent,
							text: oLink.text,
							visible: true,
							isSuperiorAction: isSuperiorAction
							// ,
							// description: sDescription
						}));
					});

					// Main navigation could not be resolved, so only set link text as MainNavigation
					if (!oNavigationTargets.mainNavigation && typeof sMainNavigationId === "string") {
						oNavigationTargets.mainNavigation = new LinkData({
							text: sMainNavigationId,
							visible: true
						});
					}

					// Collect links of additional SemanticObjects
					var aAvailableIntents = [];
					for (var i = 1; i < aSemanticObjects.length; i++) {
						aAvailableIntents = aAvailableIntents.concat(aLinks[i][0]);
					}
					aAvailableIntents.forEach(function(oLink) {
						var oShellHash = oURLParsing.parseShellHash(oLink.intent);
						var isSuperiorAction = (oLink.tags && oLink.tags.indexOf("superiorAction") > -1);
						// var sDescription = oLink.subTitle;
						// if (!sDescription) {
						// 	sDescription = oLink.shortTitle;
						// } else {
						// 	sDescription = sDescription + " - " + oLink.shortTitle;
						// }
						oNavigationTargets.availableActions.push(new LinkData({
							key: (oShellHash.semanticObject && oShellHash.action) ? oShellHash.semanticObject + "-" + oShellHash.action : undefined,
							href: oLink.intent,
							text: oLink.text,
							visible: true,
							isSuperiorAction: isSuperiorAction
							// ,
							// description: sDescription

						}));
					});

					return resolve(oNavigationTargets);
				}, function() {
					jQuery.sap.log.error("'retrieveNavigationTargets' failed");
					return resolve(oNavigationTargets);
				});
			});
		},

		/**
		 * Retrieves SemanticObjectMapping annotation.
		 *
		 * @param {string} sPropertyName Name of property
		 * @param {sap.ui.model.odata.ODataModel} oODataModel OData model
		 * @param {string} sBindingPath Qualified name with namespace of current EntityType
		 * @returns {object|null} SemanticObjectMapping  annotation
		 * @private
		 */
		retrieveSemanticObjectMapping: function(sPropertyName, oODataModel, sBindingPath) {
			if (!sPropertyName) {
				return Promise.resolve(null);
			}
			// ODataModel returns MetaModel, JSONModel returns undefined
			if (!oODataModel || !oODataModel.getMetaModel()) {
				return Promise.resolve(null);
			}
			var that = this;
			var oMetaModel = oODataModel.getMetaModel();
			return new Promise(function(resolve) {
				oMetaModel.loaded().then(function() {
					var oMetaContext;

					try {
						oMetaContext = oMetaModel.getMetaContext(sBindingPath);
					} catch (oError) {
						jQuery.sap.log.error("sap.ui.comp.navpopover.Util.retrieveSemanticObjectMapping: binding path '" + sBindingPath + "' is not valid. Error has been caught: " + oError);
						return resolve(null);
					}
					if (!oMetaContext) {
						return resolve(null);
					}
					var oEntityType = oMetaContext.getProperty(oMetaContext.getPath());
					if (!oEntityType.property) {
						return resolve(null);
					}
					var aProperties = oEntityType.property.filter(function(oProperty) {
						return oProperty.name === sPropertyName;
					});
					if (aProperties.length !== 1) {
						return resolve(null);
					}
					if (!aProperties[0]["com.sap.vocabularies.Common.v1.SemanticObjectMapping"]) {
						return resolve(null);
					}
					var oSemanticObjectQualifiers = that._getSemanticObjectMappingsOfProperty(aProperties[0], that._getSemanticObjectsOfProperty(aProperties[0]));
					var oSemanticObjects = {};
					for ( var sQualifier in oSemanticObjectQualifiers) {
						oSemanticObjects[oSemanticObjectQualifiers[sQualifier].name] = oSemanticObjectQualifiers[sQualifier].mapping;
					}

					return resolve(oSemanticObjects);
				});
			});
		},

		_getSemanticObjectsOfProperty: function(oProperty) {
			var oSemanticObjects = {};
			for ( var sAttr in oProperty) {
				var sAnnotationName = sAttr.split("#")[0];
				var sQualifierName = sAttr.split("#")[1] || ""; // as of specification the qualifier MUST have at least one character
				if (jQuery.sap.startsWith(sAnnotationName, "com.sap.vocabularies.Common.v1.SemanticObject") && jQuery.sap.endsWith(sAnnotationName, "com.sap.vocabularies.Common.v1.SemanticObject")) {
					oSemanticObjects[sQualifierName] = {
						name: oProperty[sAttr]["String"],
						mapping: undefined
					};
				}
			}
			return oSemanticObjects;
		},

		_getSemanticObjectMappingsOfProperty: function(oProperty, oSemanticObjects) {
			var fGetMapping = function(oSemanticObjectMappingAnnotation) {
				var oMapping = {};
				if (jQuery.isArray(oSemanticObjectMappingAnnotation)) {
					oSemanticObjectMappingAnnotation.forEach(function(oPair) {
						oMapping[oPair.LocalProperty.PropertyPath] = oPair.SemanticObjectProperty.String;
					});
				}
				return oMapping;
			};
			for ( var sAttr in oProperty) {
				var sAnnotationName = sAttr.split("#")[0];
				var sQualifierName = sAttr.split("#")[1] || ""; // as of specification the qualifier MUST have at least one character
				if (jQuery.sap.startsWith(sAnnotationName, "com.sap.vocabularies.Common.v1.SemanticObjectMapping") && jQuery.sap.endsWith(sAnnotationName, "com.sap.vocabularies.Common.v1.SemanticObjectMapping")) {
					if (oSemanticObjects[sQualifierName]) {
						oSemanticObjects[sQualifierName].mapping = fGetMapping(oProperty[sAttr]);
					}
				}
			}
			return oSemanticObjects;
		}
	};

	return Util;
}, /* bExport= */true);
