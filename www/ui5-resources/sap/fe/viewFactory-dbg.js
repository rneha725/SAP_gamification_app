
/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// Provides control sap.ui.core.mvc.View.
sap.ui.define(['jquery.sap.global', 'sap/ui/model/json/JSONModel', 'sap/ui/core/mvc/View'], function (jQuery, JSONModel, View) {
	"use strict";

	function create(mParameters) {
		var sViewName = mParameters.viewName,
			oAppComponent = mParameters.appComponent,
			sEntitySet = mParameters.entitySet,
			mViewData = mParameters.viewData,
			oModel = mParameters.model,
			oMetaModel = oModel.getMetaModel(),
			oDeviceModel = new JSONModel(sap.ui.Device),
			oManifestModel = new JSONModel(oAppComponent.getMetadata().getManifest()),
			oViewDataModel = new JSONModel(mViewData),
			sStableId = mParameters.viewId;

		oDeviceModel.setDefaultBindingMode("OneWay");

		return oMetaModel.requestObject("/").then(function() {
			// execute Pre-Templater if one exists for the given view/template
			var aPreTemplaterPromises = preTemplater[sViewName] && preTemplater[sViewName](oMetaModel, sEntitySet) || [],
			// Pre-Load libraries
				aPreLoadPromises =	loadLibraries(sViewName);

			//templating for our mdc controls requires that mdc/library.js is loaded before view is created
			aPreTemplaterPromises.push.apply(aPreTemplaterPromises, loadLibraries("loadFirst"));

			return Promise.all(aPreTemplaterPromises).then(function(){
				var checkTimeStamp = Date.now(),
					mCache = null,
					sCacheKey = "",
					mDataSourceETags = oMetaModel.getETags(),
					aUrls = Object.keys(mDataSourceETags).sort(),
					bETagsAreValid = false;

				// View Cache Handling
				bETagsAreValid = aUrls.every(function (sUrl) {
					if (mDataSourceETags[sUrl]) {
						if (mDataSourceETags[sUrl].getTime) {
							if (mDataSourceETags[sUrl].getTime() > checkTimeStamp - 60000) {
								//timestamp, but a new one -> not worth using it as cache key
								return false;
							} else {
								//timestamp, but an older one -> worth using it as cache key
								sCacheKey += sUrl + " " + mDataSourceETags[sUrl].getTime() + " ";
								return true;
							}
						} else {
							//ETag -> should be used as cache key
							sCacheKey += sUrl + " " + mDataSourceETags[sUrl] + " ";
							return true;
						}
					} else {
						//no ETag, no last-Modified -> no cache
						return false;
					}
				});
				if (sCacheKey && bETagsAreValid) {
					//cut the last " " from the cache key and hash it
					mCache = {keys: [jQuery.sap.hashCode(sCacheKey.slice(0, -1))]};
				}

				var oViewSettings = {
					type : "XML",
					async: true,
					preprocessors: {
						xml: {
							bindingContexts: {
								entitySet: sEntitySet ? oMetaModel.createBindingContext("/" + sEntitySet) : null
							},
							models: {
								entitySet: oMetaModel,
								'sap.ui.mdc.metaModel': oMetaModel,
								'sap.fe.deviceModel': oDeviceModel, // TODO: discuss names here
								'manifest' : oManifestModel,
								'viewData' : oViewDataModel
							}
						}
					},
					id: sStableId,
					viewName: sViewName,
					viewData : mViewData,
					cache: mCache,
					height: "100%"
				};

				return oAppComponent.runAsOwner(function () {
					var oView = sap.ui.view(oViewSettings);

					// wait for the resource bundle to be loaded
					var oResourceBundle = oAppComponent.getModel("sap.fe.i18n").getResourceBundle();
					aPreLoadPromises.push(Promise.resolve(oResourceBundle));

					return Promise.all(aPreLoadPromises).then(function () {
						// only render view once the resource bundle and all pre-loads are done
						return oView.loaded();
					});
				});
			});
		});

	}

	var libraryPreloads = {
		"loadFirst": ["sap.ui.mdc"], //All libraries that have XMLComposites using pre-processor plugins must be loaded first
		"sap.fe.templates.ListReport" : ["sap.ui.core", "sap.m", "sap.ushell", "sap.f", "sap.ui.fl"],
		"sap.fe.templates.ObjectPage" : ["sap.ui.core", "sap.m", "sap.f", "sap.uxap", "sap.ui.layout"]
	};

	function loadLibraries(sViewName){
		var aLoadPromises = [];
		var aLibraries = libraryPreloads[sViewName] || [];
		for (var i = 0; i < aLibraries.length; i++){
			aLoadPromises.push(sap.ui.getCore().loadLibrary(aLibraries[i], {async: true }));
		}
		return aLoadPromises;
	}

	var preTemplater = {
		"sap.fe.templates.ListReport" : function(oMetaModel, sEntitySet){
			var aSelectionFields = oMetaModel.getObject('/' + sEntitySet + "/@com.sap.vocabularies.UI.v1.SelectionFields");
			// TODO: the line item presentation logic is currently not used in sap.fe library, part of its logic is moved
			// to sap.ui5 runtime mdc project into the table control - this needs to be merged
			// as long as this is not done use the line items hard coded
			//var aLineItems = oMetaModel.getObject(AnnotationHelper.getLineItemPresentation(oParameterModel).getPath());
			var aLineItems = oMetaModel.getObject('/' + sEntitySet + "/@com.sap.vocabularies.UI.v1.LineItem");
			var oConcatPart = {};
			var aPromises = [];
			var oPathChecked = {},
				oAnnotationsChecked = {};
			var oLineItem = {}, oSelectionField = {};
			var aApplyParts, oLabeledElement, oApplyUriEncodeParts;
			var i, j;

			function checkContext(sContextPath) {
				var oContext = {},
					oNewContext;
				sContextPath = sContextPath.split("/").slice(0, -1).join("/");
				if (sContextPath.lastIndexOf("/") > 0) {
					oContext = checkContext(sContextPath);
				}
				oNewContext = oMetaModel.getObject(sContextPath);
				if (oNewContext.$kind === "NavigationProperty" && oNewContext.$Type) {
					oContext[oNewContext.$Type] = true;
				}
				return oContext;
			}
			function resolvePath(sContextPath) {
				if (!oPathChecked[sContextPath]) {
					jQuery.sap.log.debug("Requested: " + sContextPath, "PreTemplater");
					aPromises.push(oMetaModel.requestObject(sContextPath).then(function(context) {
						var oContext;
						//resolve annotations of the property
						resolveAnnotations(sContextPath);
						//determine types and namespaces that are part of the path
						oContext = checkContext(sContextPath);
						if (context.$kind === "NavigationProperty" && context.$Type) {
							oContext[context.$Type] = true;
						}
						return oContext;
					}));
					oPathChecked[sContextPath] = true;
				}
			}
			function resolveAnnotationPath(sContextAnnotationPath) {
				aPromises.push(oMetaModel.requestObject(sContextAnnotationPath).then(function(context) {
					if (context) {
						//resolve DataPoint properties
						if (context.Value && context.Value.$Path && context.Value.$Path.indexOf('/') > 0) {
							resolvePath(sContextAnnotationPath + context.Value.$Path);
						}
						if (context.TargetValue && context.TargetValue.$Path && context.TargetValue.$Path.indexOf('/') > 0) {
							resolvePath(sContextAnnotationPath + context.TargetValue.$Path);
						}
						//resolve Contact properties
						if (context.fn && context.fn.$Path && context.fn.$Path.indexOf('/') > 0) {
							resolvePath(sContextAnnotationPath + context.fn.$Path);
						}
						if (context.photo && context.photo.$Path && context.photo.$Path.indexOf('/') > 0) {
							resolvePath(sContextAnnotationPath + context.photo.$Path);
						}
						if (context.role && context.role.$Path && context.role.$Path.indexOf('/') > 0) {
							resolvePath(sContextAnnotationPath + context.role.$Path);
						}
						if (context.title && context.title.$Path && context.title.$Path.indexOf('/') > 0) {
							resolvePath(sContextAnnotationPath + context.title.$Path);
						}
						if (context.org && context.org.$Path && context.org.$Path.indexOf('/') > 0) {
							resolvePath(sContextAnnotationPath + context.org.$Path);
						}
					}
					return checkContext(sContextAnnotationPath);
				}));
			}
			function resolveAnnotations(sContextPath) {
				var oAnnotationMap, oAnnotation, annotation;
				var oConcatPart;
				var k;
				if (!oAnnotationsChecked[sContextPath]) {
					oAnnotationMap = oMetaModel.getObject(sContextPath + "@");
					for (annotation in oAnnotationMap) {
						oAnnotation = oAnnotationMap[annotation];
						if (oAnnotation.$Path && oAnnotation.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oAnnotation.$Path);
						} else if (oAnnotation.$Apply && oAnnotation.$Function === "odata.concat") {
							for (k = 0; k < oAnnotation.$Apply.length; k++) {
								oConcatPart = oAnnotation.$Apply[k];
								if (oConcatPart && oConcatPart.$Path && oConcatPart.$Path.indexOf('/') > 0) {
									resolvePath('/' + sEntitySet + '/' + oConcatPart.$Path);
								}
							}
						}
					}
					oAnnotationsChecked[sContextPath] = true;
				}
			}

			if (aSelectionFields) {
				for (i = 0; i < aSelectionFields.length; i++) {
					oSelectionField = aSelectionFields[i];
					if (oSelectionField.$PropertyPath && oSelectionField.$PropertyPath.indexOf('/') > 0) {
						// resolveSelectionField(oSelectionField);
						resolvePath('/' + sEntitySet + '/' + oSelectionField.$PropertyPath);
					}
				}
			}

			if (aLineItems) {
				for (i = 0; i < aLineItems.length; i++) {
					oLineItem = aLineItems[i];
					if (oLineItem.$Type === "com.sap.vocabularies.UI.v1.DataField") {
						//check Value
						if (oLineItem.Value.$Path && oLineItem.Value.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Value.$Path);
						} else if (oLineItem.Value.$Path) {
							resolveAnnotations('/' + sEntitySet + '/' + oLineItem.Value.$Path);
						} else if (oLineItem.Value.$Apply && oLineItem.Value.$Function === "odata.concat") {
							for (j = 0; j < oLineItem.Value.$Apply.length; j++) {
								oConcatPart = oLineItem.Value.$Apply[j];
								if (oConcatPart && oConcatPart.$Path && oConcatPart.$Path.indexOf('/') > 0) {
									resolvePath('/' + sEntitySet + '/' + oConcatPart.$Path);
								}
							}
						}
						//check Label
						if (oLineItem.Label && oLineItem.Label.$Path && oLineItem.Label.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Label.$Path);
						}
						//check Criticality & CriticalityRepresentation
						if (oLineItem.Criticality) {
							if (oLineItem.Criticality.$Path && oLineItem.Criticality.$Path.indexOf('/') > 0) {
								resolvePath('/' + sEntitySet + '/' + oLineItem.Criticality.$Path);
							}
							if (oLineItem.CriticalityRepresentation && oLineItem.CriticalityRepresentation.$Path && oLineItem.CriticalityRepresentation.$Path.indexOf('/') > 0) {
								resolvePath('/' + sEntitySet + '/' + oLineItem.CriticalityRepresentationType.$Path);
							}
						}
						//check IconUrl
						if (oLineItem.IconUrl && oLineItem.IconUrl.$Path && oLineItem.IconUrl.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.IconUrl.$Path);
						}
					} else if (oLineItem.$Type === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation") {
						//check SemanticObject
						if (oLineItem.SemanticObject.$Path && oLineItem.SemanticObject.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.SemanticObject.$Path);
						}
						//check Action
						if (oLineItem.Action && oLineItem.Action.$Path && oLineItem.Action.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Action.$Path);
						}
						//check Value
						if (oLineItem.Value.$Path && oLineItem.Value.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Value.$Path);
						} else if (oLineItem.Value.$Path) {
							resolveAnnotations('/' + sEntitySet + '/' + oLineItem.Value.$Path);
						} else if (oLineItem.Value.$Apply && oLineItem.Value.$Function === "odata.concat") {
							for (j = 0; j < oLineItem.Value.$Apply.length; j++) {
								oConcatPart = oLineItem.Value.$Apply[j];
								if (oConcatPart && oConcatPart.$Path && oConcatPart.$Path.indexOf('/') > 0) {
									resolvePath('/' + sEntitySet + '/' + oConcatPart.$Path);
								}
							}
						}
						//check Label
						if (oLineItem.Label && oLineItem.Label.$Path && oLineItem.Label.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Label.$Path);
						}
						//check Criticality & CriticalityRepresentation
						if (oLineItem.Criticality) {
							if (oLineItem.Criticality.$Path && oLineItem.Criticality.$Path.indexOf('/') > 0) {
								resolvePath('/' + sEntitySet + '/' + oLineItem.Criticality.$Path);
							}
							if (oLineItem.CriticalityRepresentation && oLineItem.CriticalityRepresentation.$Path && oLineItem.CriticalityRepresentation.$Path.indexOf('/') > 0) {
								resolvePath('/' + sEntitySet + '/' + oLineItem.CriticalityRepresentationType.$Path);
							}
						}
						//check IconUrl
						if (oLineItem.IconUrl && oLineItem.IconUrl.$Path && oLineItem.IconUrl.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.IconUrl.$Path);
						}
					} else if (oLineItem.$Type === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") {
						//check Value
						if (oLineItem.Value.$Path && oLineItem.Value.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Value.$Path);
						} else if (oLineItem.Value.$Path) {
							resolveAnnotations('/' + sEntitySet + '/' + oLineItem.Value.$Path);
						} else if (oLineItem.Value.$Apply && oLineItem.Value.$Function === "odata.concat") {
							for (j = 0; j < oLineItem.Value.$Apply.length; j++) {
								oConcatPart = oLineItem.Value.$Apply[j];
								if (oConcatPart && oConcatPart.$Path && oConcatPart.$Path.indexOf('/') > 0) {
									resolvePath('/' + sEntitySet + '/' + oConcatPart.$Path);
								}
							}
						}
						//check Label
						if (oLineItem.Label && oLineItem.Label.$Path && oLineItem.Label.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Label.$Path);
						}
						//check Url
						if (oLineItem.Url.$Path && oLineItem.Url.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Url.$Path);
						} else if (oLineItem.Url.$Apply) {
							aApplyParts = oLineItem.Url.$Apply;
							if (oLineItem.Url.$Function === "odata.fillUriTemplate") {
								if (aApplyParts[0].$Path && aApplyParts[0].$Path.indexOf('/') > 0) {
									resolvePath('/' + sEntitySet + '/' + aApplyParts[0].$Path);
								}
								for (j = 1; j < aApplyParts.length; j++) {
									oLabeledElement = aApplyParts[j].$LabeledElement;
									if (oLabeledElement && oLabeledElement.$Path && oLabeledElement.$Path.indexOf('/') > 0) {
										resolvePath('/' + sEntitySet + '/' + oLabeledElement.$Path);
									} else if (oLabeledElement && oLabeledElement.$Apply && oLabeledElement.$Function === "odata.uriEncode") {
										oApplyUriEncodeParts = oLabeledElement.$Apply[0];
										if (oApplyUriEncodeParts.$Path && oApplyUriEncodeParts.$Path.indexOf('/') > 0) {
											resolvePath('/' + sEntitySet + '/' + oApplyUriEncodeParts.$Path);
										}
									}
								}
							} else if (oLineItem.Url.$Function === "odata.concat") {
								for (j = 0; j < oLineItem.Value.$Apply.length; j++) {
									oConcatPart = oLineItem.Value.$Apply[j];
									if (oConcatPart && oConcatPart.$Path && oConcatPart.$Path.indexOf('/') > 0) {
										resolvePath('/' + sEntitySet + '/' + oConcatPart.$Path);
									}
								}
							}
						}
					} else if (oLineItem.$Type === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
						//check SemanticObject
						if (oLineItem.SemanticObject.$Path && oLineItem.SemanticObject.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.SemanticObject.$Path);
						}
						//check Action
						if (oLineItem.Action && oLineItem.Action.$Path && oLineItem.Action.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Action.$Path);
						}
						//check RequiresContext
						if (oLineItem.RequiresContext && oLineItem.RequiresContext.$Path && oLineItem.RequiresContext.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.RequiresContext.$Path);
						}
					} else if (oLineItem.$Type === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
						//check Target
						if (oLineItem.Target.$AnnotationPath && oLineItem.Target.$AnnotationPath.indexOf('/') > 0) {
							resolveAnnotationPath('/' + sEntitySet + '/' + oLineItem.Target.$AnnotationPath);
						}
						//check Label
						if (oLineItem.Label && oLineItem.Label.$Path && oLineItem.Label.$Path.indexOf('/') > 0) {
							resolvePath('/' + sEntitySet + '/' + oLineItem.Label.$Path);
						}
					}
				}
			}
			return aPromises;
		}
	};



	var viewFactory = {
		create: create
	};

	return viewFactory;
});



