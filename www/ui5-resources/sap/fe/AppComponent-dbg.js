/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// ----------------------------------------------------------------------------------
// Provides base class sap.fe.AppComponent for all generic app components
// ----------------------------------------------------------------------------------
sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/UIComponent",
	"sap/m/NavContainer",
	"sap/fe/core/BusyHelper",
	"sap/ui/core/ComponentContainer",
	"sap/fe/core/internal/testableHelper",
	"sap/fe/model/DraftModel",
	"sap/fe/model/NamedBindingModel",
	"sap/fe/controller/NavigationController",
	"sap/fe/viewFactory",
	"sap/ui/model/resource/ResourceModel",
	"sap/fe/core/TemplateUtils"
], function (jQuery,
			 UIComponent,
			 NavContainer,
			 BusyHelper,
			 ComponentContainer,
			 testableHelper,
			 DraftModel,
			 NamedBindingModel,
			 NavigationController,
			viewFactory,
			ResourceModel,
TemplateUtils) {
	"use strict";

	testableHelper.testableStatic(function() {
	}, "suppressPageCreation");

	function getMethods(oAppComponent, oTemplateContract) {
		// template contract which is used for data interchange between framework classes
		var oTemplateContract = {
			oAppComponent: oAppComponent, // reference to this application component
			oBusyHelper: null, // instantiated in createContent
			oMessageUtils: null, // instantiated in templateUtils on demand
			oActionController: null, // instantiated in templateUtils on demand
			oCommonUtils: null, // instantiated in templateUtils on demand
			aAppStateChangedListener: [], // listeners to the app state changed event
			getNavigationController: function () {
				// in case anything happens before the templateUtils are created we need to allow access to the navigation controller
				return new NavigationController(oTemplateContract);
			}
		};

		// Just for test reasons - to be checked once we implement actions
		var oTemplateUtils = new TemplateUtils(oTemplateContract);

		function getText(sId) {
			var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe");
			return oResourceBundle.getText(sId);
		}

		function updateAppStateModel(oAppStateModel, oAppState) {
			var oData = oAppState.getData();

			if (oData && (JSON.stringify(oData) !== JSON.stringify(oAppStateModel.getProperty("/"))) && oAppStateModel) {
				oAppStateModel.setProperty("/", oData);
				return true;
			}
			return false;
		}

		return {
			init: function () {
				var oShellServiceFactory = sap.ui.core.service.ServiceFactoryRegistry.get("sap.ushell.ui5service.ShellUIService");
				oTemplateContract.oShellServicePromise = (oShellServiceFactory && oShellServiceFactory.createInstance()) || Promise.reject();
				oTemplateContract.oShellServicePromise.catch(function () {
					jQuery.sap.log.warning("No ShellService available");
				});

				/* as the cross app state is not yet defined and supported the crossappstate coding is kept but deactivated
				 oTemplateContract.oCrossAppStatePromise = new jQuery.Deferred(); // Done when startup CrossAppState has been transferred into the model
				 sap.ushell.Container.getService("CrossApplicationNavigation").getStartupAppState(oAppComponent).done(function (oStartupCrossAppState) {
				 updateAppStateModel(oTemplateContract.oAppStateModel, oStartupCrossAppState);
				 oTemplateContract.oCrossAppStatePromise.resolve();
				 });
				 */

				oTemplateContract.oInnerAppStatePromise = new jQuery.Deferred(); // Done when above and startup InnerAppState transferred into the model

				// create AppState Model
				oTemplateContract.oAppStateModel = new sap.ui.model.json.JSONModel();

				// as the cross app state is not yet defined and supported we skip this coding and resolve the promise immediately
				// sap.ushell.Container.getService("CrossApplicationNavigation").getStartupAppState(oAppComponent).done(function (oStartupCrossAppState) {
				// 	updateAppStateModel(oTemplateContract.oAppStateModel, oStartupCrossAppState);
				// 	oTemplateContract.oCrossAppStatePromise.resolve();
				// });

				var oModel = oAppComponent.getModel();
				if (oModel) {
					// upgrade the model to a named binding model
					NamedBindingModel.upgrade(oModel).then(function() {

						// we call the UIComponent init once we upgraded our model to a named binding model
						(UIComponent.prototype.init || jQuery.noop).apply(oAppComponent, arguments);

						oTemplateContract.oBusyHelper.setBusy(oTemplateContract.oShellServicePromise);
						oTemplateContract.oBusyHelper.setBusyReason("initAppComponent", false);

						// Test if draft Model
						DraftModel.isDraftModel(oModel).then(function (bIsDraft) {
							if (bIsDraft) {
								// service contains a draft entity therefore upgrade the model to a draft model
								DraftModel.upgrade(oModel).then(function () {
									oAppComponent.setModel(oModel.getDraftAccessModel(), "$draft");
								});
							}
						});
					});

					// Error handling for erroneous metadata request
					oModel.getMetaModel().requestObject("/$EntityContainer/").catch(function (oError) {
						oTemplateContract.getNavigationController().navigateToMessagePage({
							text: getText("SAPFE_APPSTART_TECHNICAL_ISSUES"),
							description: oError.message
						});
					});
				}

				var oI18nModel = new ResourceModel({
					bundleName: "sap/fe/messagebundle",
					async: true
				});

				oI18nModel.getResourceBundle().then(function(oResourceBundle){
					// once the library is loaded provide sync access
					oI18nModel.getResourceBundle = function(){
						return oResourceBundle;
					};
				});

				oAppComponent.setModel(oI18nModel, "sap.fe.i18n");


			},
			exit: function () {
				if (oTemplateContract.oNavContainer) {
					oTemplateContract.oNavContainer.destroy();
				}
			},
			createContent: function () {
				// Method must only be called once
				if (oTemplateContract.oNavContainer) {
					return "";
				}

				var oRouter = oAppComponent.getRouter();
				var oMeta = oAppComponent.getMetadata();
				var oUI5Config = oMeta.getManifestEntry("sap.ui5");
				var oTargets = oUI5Config && oUI5Config.routing && oUI5Config.routing.targets;
				var mViews = {},
					oRoute;

				// PoC only: we pimp up the routing here
				// that's the place where we create for each route a route with parameter
				for (var i = 0; i < oUI5Config.routing.routes.length; i++) {
					oRoute = oUI5Config.routing.routes[i];
					if (oRoute.pattern.indexOf("?") === -1) {
						oRouter.addRoute({
							name: oRoute.name + "$sap.fe.params",
							pattern: oRoute.pattern + "?{parameters}",
							target: oRoute.target
						});
					}
				}

				oRouter._oViews._getViewWithGlobalId = function (mParameters){
					if (mParameters.id.indexOf("---")){
						// currently the routing adds the ID of the component - as this is not what we want we remove this
						// one again - to be discussed with UI5 core / routing
						mParameters.id = mParameters.id.split("---")[1];
					}
					var mTarget;

					var fnCreateView = function() {
						if (!mViews[mParameters.id]){
							mViews[mParameters.id] = viewFactory.create({
								viewId : mParameters.id,
								viewName: mParameters.viewName,
								appComponent: oAppComponent,
								entitySet: mTarget.entitySet,
								viewData: mTarget.viewData,
								model: oAppComponent.getModel()
							});
						}
						return mViews[mParameters.id];

					};

					for (var p in oTargets){
						mTarget = oTargets[p];
						if (mTarget.viewId === mParameters.id) {
							return {
								loaded: fnCreateView
							};
						}
					}
				};

				oRouter.attachRouteMatched(function (oEvent) {
					var sElementBinding, fnOnBeforeBinding;
					if (oEvent.getParameters().name === "root") {
						// no inner app state used
						oTemplateContract.oInnerAppStatePromise.resolve();

						if (oTemplateContract.oAppState) {
							// the app had an app state but navigated back to the initial route, we need to clean up the appstate
							oTemplateContract.oAppState = null;
							oTemplateContract.oAppStateModel.setData({});
							// fire app state change event
							for (var i = 0; i < oTemplateContract.aAppStateChangedListener.length; i++) {
								oTemplateContract.aAppStateChangedListener[i]();
							}
						}


					} else if (oEvent.getParameters().name.endsWith("$sap.fe.params")) {
						var sParameters = oEvent.getParameters().arguments.parameters;
						var aParameters = sParameters.split("&"),
							sParameter, sInnerAppStateKey;

						for (var i = 0; i < aParameters.length; i++){
							sParameter = aParameters[i];

							if (sParameters.indexOf("iAppState=") === 0){
								// Inner-App-State handling
								sInnerAppStateKey = sParameter.replace("iAppState=", "");

								if (oTemplateContract.oAppState && sInnerAppStateKey === oTemplateContract.oAppState.getKey()) {
									// the app state was set by the app
									oTemplateContract.oInnerAppStatePromise.resolve();
									return;
								}
							}
						}

						if (sInnerAppStateKey){
							// we must apply the inner App State *after* treating CrossAppState (x-app-state), reset InnerAppStatePromise
							//oTemplateContract.oCrossAppStatePromise.done(function () { <- deactivated for now
							sap.ushell.Container.getService("CrossApplicationNavigation").getAppState(oAppComponent, sInnerAppStateKey).done(function (oStartupInnerAppState) {
								oTemplateContract.oAppState = oStartupInnerAppState;
								updateAppStateModel(oTemplateContract.oAppStateModel, oStartupInnerAppState);
								oTemplateContract.oInnerAppStatePromise.resolve();

								// fire app state change event
								for (var i = 0; i < oTemplateContract.aAppStateChangedListener.length; i++) {
									oTemplateContract.aAppStateChangedListener[i]();
								}
							});
							//});
						}

					} else {
						// just very dirty to test with the object page
						var mKeys = oEvent.getParameters().arguments,
							sTarget, oViewPromise;

						if (Object.keys(mKeys).length > 0){
							sTarget = "/" + oEvent.getParameters().config.pattern;

						for (var p in mKeys){
							sTarget = sTarget.replace('{' + p + '}', mKeys[p]);
						}

						// this works only with one target - more targets are anyway not yet supported
						oViewPromise = mViews[oUI5Config.routing.targets[oEvent.getParameter("config").target].viewId];
						if (oViewPromise) {
							oViewPromise.then(function (oView) {
								sElementBinding = oView.getElementBinding() && oView.getElementBinding().getPath();
								if (sElementBinding !== sTarget) {
									fnOnBeforeBinding = oView.getController() && oView.getController().onBeforeBinding.bind(oView.getController()) || jQuery.noop;
									Promise.resolve(fnOnBeforeBinding()).then(function () {
										oView.bindElement(sTarget);
									});
								}
							});
						}
						}

					}

				});

				oTemplateContract.oNavContainer = new NavContainer({
					//id: oAppComponent.getId() + "-appContent"
					// TODO: to be checked if and why we need to add the app component ID
					id: "appContent"
				});

				oTemplateContract.oBusyHelper = new BusyHelper(oTemplateContract);
				oTemplateContract.oBusyHelper.setBusyReason("initAppComponent", true, true);

				oRouter.initialize();

				return oTemplateContract.oNavContainer;
			},

			// Just for test reasons - to be checked once we implement actions
			getTemplateUtils : function(){
				return oTemplateUtils;
			}
		};
	}

	return UIComponent.extend("sap.fe.AppComponent", {
		metadata: {
			config: {
				fullWidth: true
			},
			routing: {
				"config": {
					"routerClass": "sap.m.routing.Router",
					"viewType": "XML",
					"viewPath": "sap.fe.templates",
					"controlId": "appContent",
					"controlAggregation": "pages",
					"async": true
				}
			},
			library: "sap.fe"
		},

		constructor: function () {
			var oAppId = testableHelper.startApp(); // suppress access to private methods in productive coding
			jQuery.extend(this, getMethods(this, oAppId));

			(UIComponent.prototype.constructor || jQuery.noop).apply(this, arguments);
		}
	});
});
