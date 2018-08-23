/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

/* global hasher */
sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/mvc/Controller"
], function (jQuery, Controller) {
	"use strict";

	/*
	 This coding is deactivated as the FLP does not yet support dynamic tiles for OData v4 - activate once
	 the FLP supports OData v4 as well
	 This coding needs to be adapted to the refactoring then for example ListBindingInfo shall be used
	 instead of the ListBinding

	 function fnCreateRequestUrl(oBinding, sPath, oContext, aUrlParams, bBatch){
	 // create the url for the service
	 var sNormalizedPath,
	 aAllUrlParameters = [],
	 sUrl = "";

	 if (sPath && sPath.indexOf('?') !== -1 ) {
	 sPath = sPath.substr(0, sPath.indexOf('?'));
	 }

	 if (!oContext && !jQuery.sap.startsWith(sPath,"/")) {
	 jQuery.sap.log.fatal(oBinding + " path " + sPath + " must be absolute if no Context is set");
	 }

	 sNormalizedPath = oBinding.getModel().resolve(sPath, oContext);

	 //An extra / is present at the end of the sServiceUrl, taking the normalized url from index 1
	 if (!bBatch) {
	 sUrl = oBinding.getModel().sServiceUrl + sNormalizedPath.substr(1);
	 } else {
	 sUrl = sNormalizedPath.substr(sNormalizedPath.indexOf('/') + 1);
	 }

	 if (aUrlParams) {
	 aAllUrlParameters = aAllUrlParameters.concat(aUrlParams);
	 }

	 if (aAllUrlParameters && aAllUrlParameters.length > 0) {
	 sUrl += "?" + aAllUrlParameters.join("&");
	 }
	 return sUrl;
	 }

	 function fnGetDownloadUrl(oBinding) {
	 var aParams = [];

	 if (oBinding.sFilterParams) {
	 aParams.push(oBinding.sFilterParams);
	 }

	 if (oBinding.sCustomParams) {
	 aParams.push(oBinding.sCustomParams);
	 }

	 if (oBinding.mParameters) {
	 if (oBinding.mParameters.$count) {
	 aParams.push("$count="+oBinding.mParameters.$count);
	 }

	 if (oBinding.mParameters.$filter) {
	 aParams.push("$filter=("+oBinding.mParameters.$filter.replace(/'/g,"%27").replace(/ /g,"%20")+")");
	 }

	 if (oBinding.mParameters.$select) {
	 aParams.push("$select="+oBinding.mParameters.$select.replace(/'/g,"%27").replace(/,/g,"%2c"));
	 }

	 // we can skip the $expand for now as the count shall be the same to avoid unnecessary read requests in the backend
	 // if (oBinding.mParameters.$expand) {
	 // 	aParams.push("$expand="+oBinding.mParameters.$expand.replace(/'/g,"%27").replace(/\//g,"%2f"));
	 // }

	 // we set $top to 0 to avoid that any data is requested - we are only interested in the count
	 aParams.push("$top=0");
	 }

	 var sPath = oBinding.getModel().resolve(oBinding.sPath,oBinding.oContext);

	 if (sPath) {
	 return fnCreateRequestUrl(oBinding,sPath, null, aParams);
	 }
	 }*/

	return Controller.extend("sap.fe.templates.ListReport.ListReportController", {

		onInit: function () {
			var that = this;
			this.oTable = this.byId("template::Table");
			this.oFilterBar = this.byId("template::FilterBar");

			// just for test reasons - to be checked once we implement the actions if we need such utils again
			this.oTemplateUtils = this.getOwnerComponent().getTemplateUtils();

			// set filter bar to disabled until app state is loaded
			// TODO: there seems to be a big in the filter layout - to be checked
			//this.oFilterBar.setEnabled(false);

			// disable for now - TODO: enable with actions again
			//this.setShareModel();

			// handle app state
			this.oTemplateUtils.getAppStateLoaded().then(function () {
					var oAppState = that.oTemplateUtils.getAppStateContainer(that.getView().getId());
				if (oAppState) {
					// an app state exists, apply it
					that.applyAppState(oAppState).then(function () {
						// enable filterbar once the app state is applied
						that.oFilterBar.setEnabled(true);
					});
				} else {
					that.oFilterBar.setEnabled(true);
				}

				// attach to further app state changed
				that.oTemplateUtils.attachAppStateChanged(that.applyAppState.bind(that));

			});
		},

		onBeforeRendering: function () {

		},

		createAppState: function () {
			var sFilterBarAppState = this.oFilterBar.getAppState();

			if (!sFilterBarAppState) {
				// no app state exists and filter bar does not have any app state relevant changes, there is
				// no need to generate an app state
				return;
			}

			var oAppState = {
				filterBar: sFilterBarAppState
			};

			this.oTemplateUtils.setAppStateContainer(this.getView().getId(), oAppState);
		},

		applyAppState: function (oAppState) {
			if (!oAppState) {
				oAppState = this.oTemplateUtils.getAppStateContainer(this.getView().getId());
			}

			if (oAppState) {
				return this.oFilterBar.setAppState(oAppState.filterBar);
			}
		},

		setShareModel: function () {
			// TODO: deactivated for now - currently there is no _templPriv anymore, to be discussed
			// this method is currently not called anymore from the init method

			var fnGetUser = jQuery.sap.getObject("sap.ushell.Container.getUser");
			//var oManifest = this.getOwnerComponent().getAppComponent().getMetadata().getManifestEntry("sap.ui");
			//var sBookmarkIcon = (oManifest && oManifest.icons && oManifest.icons.icon) || "";

			//shareModel: Holds all the sharing relevant information and info used in XML view
			var oShareInfo = {
				bookmarkTitle: document.title, //To name the bookmark according to the app title.
				bookmarkCustomUrl: function () {
					var sHash = hasher.getHash();
					return sHash ? ("#" + sHash) : window.location.href;
				},
				/*
				 To be activated once the FLP shows the count - see comment above
				 bookmarkServiceUrl: function() {
				 //var oTable = oTable.getInnerTable(); oTable is already the sap.fe table (but not the inner one)
				 // we should use table.getListBindingInfo instead of the binding
				 var oBinding = oTable.getBinding("rows") || oTable.getBinding("items");
				 return oBinding ? fnGetDownloadUrl(oBinding) : "";
				 },*/
				isShareInJamActive: !!fnGetUser && fnGetUser().isJamActive()
			};

			var oTemplatePrivateModel = this.getOwnerComponent().getModel("_templPriv");
			oTemplatePrivateModel.setProperty("/listReport/share", oShareInfo);
		},

		handlers: {
			onSearch: function () {
				if (this.oFilterBar.getLiveUpdate() === false) {
					/* we do not support the GO-Button in the first delivery although it's implemented in the table and filterBar.
					 one missing part is the app state - here we need to add the information that the GO button was pressed once
					 we officially support the Go button as well
					 */
					this.createAppState();
				}
			},
			onFilterBarChange: function () {
				if (this.oFilterBar.getLiveUpdate()) {
					this.createAppState();
				}
				if (!this.oFilterBar.isReady()) {
					this.oTable.setShowOverlay();
				}
			},
			onItemPress: function (oEvent) {
				// this should be one (or two) navigation actions

				var oDetailNavigation = this.getView().getViewData().navigation.detail,
					oManifest, sPath;

				if (oDetailNavigation.outbound){
					// Handling of navigating to another app
					oManifest = this.getOwnerComponent().getMetadata().getManifest();

					if (oManifest["sap.app"] && oManifest["sap.app"].crossNavigation && oManifest["sap.app"].crossNavigation.outbounds && oManifest["sap.app"].crossNavigation.outbounds[oDetailNavigation.outbound]) {
						var oDisplayOutbound = oManifest["sap.app"].crossNavigation.outbounds[oDetailNavigation.outbound];
						var oParameters = {};
						if (oDisplayOutbound.parameters) {
							var oBindingContext = oEvent.getParameters().listItem.getBindingContext();
							for (var sParameter in oDisplayOutbound.parameters) {
								if (oDisplayOutbound.parameters[sParameter].value.format === "binding") {
									oParameters[sParameter] = oBindingContext.getProperty(oDisplayOutbound.parameters[sParameter].value.value);
								}
							}
						}
						var oCrossAppNavigator = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("CrossApplicationNavigation");
						oCrossAppNavigator && oCrossAppNavigator.toExternal({
							target: {
								semanticObject: oDisplayOutbound.semanticObject,
								action: oDisplayOutbound.action
							},
							params: oParameters
						});

					} else {
						throw new Error("outbound target " + oDetailNavigation.outbound + " not found in cross navigation definition of manifest");
					}

				} else if (oDetailNavigation.route){
					// no validation yet, just set the hash to the canonical path and hope that there is a correct pattern
					// this needs to be discussed and improved
					sPath = oEvent.getParameters().listItem.getBindingContext().getPath();
					// remove extra '/' at the beginning of path
					while (sPath.indexOf('/') === 0) {
						sPath = sPath.substr(1);
					}
					this.oTemplateUtils.getHashChanger().setHash(sPath);
				}

			},

			callAction: function (oEvent) {
				this.oTemplateUtils.getActionController().callAction(oEvent);
			},

			showError: function (oEvent) {
				// handling error after onDataReceived by the table to show message box
				var oError = oEvent.getParameters("error");
				this.oTemplateUtils.getMessageUtils().handleRequestFailed(oError);
			},

			onShareListReportActionButtonPress: function (oEvent) {
				var localI18nRef = this.getView().getModel("sap.fe.i18n").getResourceBundle();
				if (!this._oShareActionButton) {
					this._oShareActionButton = sap.ui.xmlfragment(
						"sap.fe.templates.ListReport.ShareSheet", {
							shareEmailPressed: function () {
								sap.m.URLHelper.triggerEmail(null, localI18nRef.getText("SAPFE_EMAIL_SUBJECT", [document.title]), document.URL);
							},
							//TODO: JAM integration to be implemented
							shareJamPressed: function () {
							}
						});
					this.getView().addDependent(this._oShareActionButton);
				}
				this._oShareActionButton.openBy(oEvent.getSource());

			}

		}
	});
});
