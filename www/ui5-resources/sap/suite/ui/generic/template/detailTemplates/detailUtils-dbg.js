sap.ui.define(["jquery.sap.global", "sap/ui/core/routing/HashChanger", "sap/suite/ui/generic/template/extensionAPI/NavigationController",
	"sap/suite/ui/generic/template/lib/MessageButtonHelper",  "sap/suite/ui/generic/template/lib/testableHelper", "sap/suite/ui/generic/template/detailTemplates/PaginatorButtonsHelper",
		"sap/suite/ui/generic/template/ObjectPage/extensionAPI/DraftTransactionController", "sap/suite/ui/generic/template/ObjectPage/extensionAPI/NonDraftTransactionController",	
	"sap/m/DraftIndicator"], 
	function(jQuery, HashChanger, NavigationController, MessageButtonHelper, testableHelper, PaginatorButtonsHelper, DraftTransactionController, NonDraftTransactionController) {
		"use strict";
		
		var DraftIndicatorState = sap.m.DraftIndicatorState; // namespace cannot be imported by sap.ui.define
		
		function getComponentBase(oComponent, oComponentUtils, oViewProxy){
			function init(){
				var oTemplatePrivateModel = oComponentUtils.getTemplatePrivateModel();
				oTemplatePrivateModel.setProperty("/objectPage", {
					displayMode: 0, // 0 = unknown, 1 = display, 2 = edit, 4 = add, 6 = change (edit or add)
					headerInfo: { // contains information about title and subtitle of the page
						objectTitle: "",
						objectSubtitle: ""
					}
				});
				oComponentUtils.setStatePreserverPromise(oViewProxy);
			}
			
			function onActivate(sBindingPath, bIsComponentCurrentlyActive) {
				// preliminary: in draft case maybe on first time property is not set
				var oUIModel = oComponent.getModel("ui");
				var oTemplatePrivateModel = oComponentUtils.getTemplatePrivateModel();
				if (oComponentUtils.getEditableNDC()) {
					oUIModel.setProperty("/editable", true);
					var bCreateMode = oComponentUtils.isNonDraftCreate();
					oUIModel.setProperty("/createMode", bCreateMode);
					oTemplatePrivateModel.setProperty("/objectPage/displayMode", bCreateMode ? 4 : 2);
				} else if (!oComponentUtils.isDraftEnabled()) {
					oUIModel.setProperty("/editable", false);
					oUIModel.setProperty("/createMode", false);
					oTemplatePrivateModel.setProperty("/objectPage/displayMode", 1);
				}
				(oViewProxy.onComponentActivate || jQuery.noop)(sBindingPath, bIsComponentCurrentlyActive);
			}
			
			// This method is called when a new binding context has been retrieved for this Component.
			// If the entity is draft enabled this happens whenever a different instance is displayed or the edit status changes.
			// If the entity is not draft enabled this only happens when a different instance is displayed.
			// It does not happen when changing to edit mode or creating a new instance. In this case the adjustment of the JSON models is already done in onActivate.
			function updateBindingContext() {

				var oBindingContext = oComponent.getBindingContext();
				var oContextInfo = oComponentUtils.registerContext(oBindingContext);
				// set draft status to blank according to UI decision
				var oTemplatePrivateGlobal = oComponent.getModel("_templPrivGlobal");
				oTemplatePrivateGlobal.setProperty("/generic/draftIndicatorState", DraftIndicatorState.Clear);
				
				(oViewProxy.getHeaderInfoTitleForNavigationMenue || jQuery.noop)();
				(oViewProxy.applyHeaderContextToSmartTablesDynamicColumnHide || jQuery.noop)(oBindingContext);
				
				var oActiveEntity = oBindingContext.getObject();
				var oUIModel = oComponent.getModel("ui");
				var bIsEditable;
				var oTemplatePrivateModel = oComponentUtils.getTemplatePrivateModel();
				if (oContextInfo.bIsDraft) {
					bIsEditable = true;
					oUIModel.setProperty("/enabled", true);
					oTemplatePrivateModel.setProperty("/objectPage/displayMode", oContextInfo.bIsCreate ? 4 : 2);
				} else {
					bIsEditable = oComponentUtils.getEditableNDC();
					oTemplatePrivateModel.setProperty("/objectPage/displayMode", bIsEditable ? 2 : 1);
					if (oActiveEntity.hasOwnProperty("HasDraftEntity") && oActiveEntity.HasDraftEntity) {
						// Up to now we know that we are currently looking at the active version of an object which possesses a draft.
						// This can have two reasons:
						// 1. The draft belongs to another user
						// 2. The draft belongs to the current user. This is actually only possible, when the user has
						//    navigated to the active version via a bookmark or by using the history. Any explicit navigation
						//    within the tool should automatically have forwarded him to the draft.
						// Case 1 is harmless, whereas in case 2 we have to deal with the draft.
						// Hence, we now read additional data in order to identify which situation is there.
						oUIModel.setProperty("/enabled", false);
						var oModel = oComponent.getModel();
						var oReadDraftInfoPromise = new Promise(function(fnResolve, fnReject) {
							oModel.read(
								oBindingContext.getPath(), {
									urlParameters: {
										"$expand": "SiblingEntity,DraftAdministrativeData"
									},
									success: fnResolve,
									error: fnReject
								});
						});
						var oBusyHelper = oComponentUtils.getBusyHelper();
						oBusyHelper.setBusy(oReadDraftInfoPromise);
						oReadDraftInfoPromise.then(
							function(oResponseData) {
								var oSiblingContext = oModel.getContext(
									"/" + oModel.getKey(oResponseData.SiblingEntity));
								if (oSiblingContext) {
									// Now the information is there. Forward the handling to the corresponding template specific handler.
									(oViewProxy.draftResume || jQuery.noop)(oSiblingContext, oActiveEntity,
										oResponseData.DraftAdministrativeData);
								}
								// enable the buttons
								oUIModel.setProperty("/enabled", true);
							},
							function(oError) {
								// open: error handling
							}
						);
					} else {
						// enable the buttons
						oUIModel.setProperty("/enabled", true);
					}
				}
				oUIModel.setProperty("/createMode", oContextInfo.bIsCreate);
				oUIModel.setProperty("/editable", bIsEditable);
			}
			
			// This method is called by the framework, when some saving action has been observed. In this case it returns the context path for the
			// current draft root (if we are in draft mode).  This will cause this draft to be marked as modified.
			function fnCurrentDraftModified(){
				return oComponentUtils.getDraftRootPath();
			}
			
			function fnNavigateUp(){
				oViewProxy.navigateUp();	
			}
			
			function getUrlParameterInfo(sPath) {
				return oViewProxy.oStatePreserverPromise.then(function(oStatePreserver){
					return oStatePreserver.getUrlParameterInfo(sPath);
				});
			}
			
			// checks whether this view has a reason to prevent saving. If yes a message is returned
			function getMessageFilters(bOnlyValidation){
				return 	oViewProxy.getMessageFilters(bOnlyValidation);
			}
			
			return {
				init: init,
				onActivate: onActivate,
				getTitle: oComponentUtils.getTitleFromTreeNode,
				updateBindingContext: updateBindingContext,
				currentDraftModified: fnCurrentDraftModified,
				navigateUp: fnNavigateUp,
				getUrlParameterInfo: getUrlParameterInfo,
				getMessageFilters: getMessageFilters
			};
		}
		
		function getControllerBase(oViewProxy, oTemplateUtils, oController){
			
			var oControllerBase;
			var aEntitySets; // initialized in onInit
			var sLinkUp;
			
			var oPaginatorButtonsHelper; // initialized in onInit, if needed
			
			var oHashChanger; // initialized on first use
			function fnGetHashChangerInstance() {
				return oHashChanger || HashChanger.getInstance();
			}
			
			function fnCreateBreadCrumbLinkHandler(j, oMyLink){
				return function(){
					oTemplateUtils.oServices.oApplication.subTitleForViewLevelChanged(j, oMyLink.getText());
				};
			}
			
			// this method is called, when the editablity status is changed
			function setEditable(bIsEditable) {
				var bIsNonDraft = !oTemplateUtils.oComponentUtils.isDraftEnabled();
				// Setting editable to false is done immidiately
				// Setting editable to true is (in draft case) postponed until the header data are read (method updateBindingContext).
				if (bIsNonDraft || !bIsEditable){
					var oUIModel = oController.getView().getModel("ui");
					oUIModel.setProperty("/editable", bIsEditable);
				}
				if (bIsNonDraft) {
					oTemplateUtils.oComponentUtils.setEditableNDC(bIsEditable);
				}
			}
			
			function fnOnBack() {
				oTemplateUtils.oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
					// only for Non-Draft the editable must be set to false
					var bIsDraft = oTemplateUtils.oComponentUtils.isDraftEnabled();
					if (!bIsDraft){
						setEditable(false);
					}
					oTemplateUtils.oServices.oNavigationController.navigateBack();
				}, jQuery.noop, oControllerBase.state);
			}
			
			function fnAdaptLinksToUpperLevels(){
				var oTemplatePrivateModel = oTemplateUtils.oComponentUtils.getTemplatePrivateModel();
				var iUpLinksCount = oTemplatePrivateModel.getProperty("/generic/viewLevel") - 1;
				var aSections = iUpLinksCount ? oTemplateUtils.oServices.oApplication.getHierarchySectionsFromCurrentHash() : [];
				// there's at least one section left - create / bind breadcrumbs
				var aBreadCrumbs = oViewProxy.aBreadCrumbs;
				oHashChanger = fnGetHashChangerInstance();

				sLinkUp = "";
				var sDelimiter = "";
				for (var i = 0; i < iUpLinksCount; i++) {
					var sSection = aSections[i];
					sLinkUp = sLinkUp + sDelimiter + sSection;
					sDelimiter = "/";
					/*
					 * we don't use the navigation path but the canonical URL. The reason for this is that there's no
					 * join done in the backend, therefore the GET-request is much faster in deeper breadcrumbs. Also
					 * the UI5 Odata model keeps track of already requested ressources, so if user navigates from the
					 * top level there's no additional request, if he uses a bookmark the request is only done once. We
					 * assume that the key of the navigation path is the same as the canonical URL. This is an
					 * assumption that does not fit to all ODATA services (but 99% of them) - BUT: Smart Templates and
					 * the navigation controller already takes this assumption. Once this is changed also this coding
					 * needs to be changed. Ideally with a configuration as most of the ODATA services have a big
					 * benefit through reading with the canonical URL
					 */
					var sEntitySet = aEntitySets[i];
					var aSubSections = sSection.split("(");
					if (aSubSections && aSubSections[1]) {
						var oLink = aBreadCrumbs && aBreadCrumbs[i];
						if (oLink){
							var sHash = oHashChanger.hrefForAppSpecificHash ? oHashChanger.hrefForAppSpecificHash(sLinkUp) : "#/" + sLinkUp;
							sHash = oTemplateUtils.oServices.oApplication.adaptBreadCrumbUrl(sHash, i + 1);
							var sCanonicalUrl = "/" + sEntitySet + "(" + aSubSections[1];
							oLink.setHref(sHash);
							var oTextBindingInfo = oLink.getBindingInfo("text") || {};
							oTextBindingInfo.events = {
								change: fnCreateBreadCrumbLinkHandler(i + 1, oLink)
							};
							oLink.bindElement({
								path: sCanonicalUrl
							});
						}
					}
				}
			}			
			
			function getApplyChangesPromise(oControl){
				var oContext = oControl.getBindingContext();
				var sHash = fnGetHashChangerInstance().getHash();
				return oTemplateUtils.oServices.oApplicationController.propertyChanged(sHash, oContext);
			}
			
			function fnNavigateUp(){
				if (sLinkUp){
					oTemplateUtils.oServices.oNavigationController.navigateToContext(sLinkUp, "", true);
				} else {
					oTemplateUtils.oServices.oNavigationController.navigateToRoot(true);
				}
			}
			
			// Event handler for the Apply button. Only visible in draft scenarios and not on the object root.
			function fnApplyAndUpImpl(oControl) {
				var oBusyHelper = oTemplateUtils.oServices.oApplication.getBusyHelper();
				var oUIModel = oController.getView().getModel("ui");
				var oTemplatePrivateGlobalModel = oController.getOwnerComponent().getModel("_templPrivGlobal");
				var oApplyPromise = getApplyChangesPromise(oControl).then(function(oReponse){
					if (!oControllerBase.fclInfo.isContainedInFCL || oTemplatePrivateGlobalModel.getProperty("/generic/FCL/isVisuallyFullScreen")){
						fnNavigateUp();
					}
					//the toast is shown independent of FCL
					//the next statement should not be deleted but a comment!!
//						oTemplateUtils.oServices.oApplication.showMessageToast(oTemplateUtils.oCommonUtils.getText("ST_CHANGES_APPLIED"));
				}, function(){
					oBusyHelper.getUnbusy().then(function(oReponse){
						if (!oControllerBase.fclInfo.isContainedInFCL || oTemplatePrivateGlobalModel.getProperty("/generic/FCL/isVisuallyFullScreen")) {
							oTemplateUtils.oCommonUtils.processDataLossTechnicalErrorConfirmation(function() {
								fnNavigateUp();
								oUIModel.setProperty("/enabled", true); //in case you leave the page set this
							}, jQuery.noop, oControllerBase.state);
						} else {
						//if the UI show FCL, one object next to the other, then another popup is needed						
						oTemplateUtils.oCommonUtils.processDataLossTechnicalErrorConfirmation(jQuery.noop, jQuery.noop, oControllerBase.state, "StayOnPage");
						}
					});
				});
				oBusyHelper.setBusy(oApplyPromise);
			}
			
			// Event handler for the Apply button. Only visible in draft scenarios and not on the object root.
			function fnApplyAndUp(oEvent) {
				var oControl = oEvent.getSource();
				oControllerBase.state.beforeSaveHelper.prepareAndRunSaveOperation(false, fnApplyAndUpImpl.bind(null, oControl));
			}
			
			function onShowMessages() {
				oControllerBase.state.messageButtonHelper.toggleMessagePopover();
			}
			
			function getMessageFilters(bOnlyValidation){
				return oControllerBase.state.messageButtonHelper && oControllerBase.state.messageButtonHelper.getMessageFilters(bOnlyValidation);
			}
			
			function getNavigationControllerFunction(){
				var oNavigationController;
				return function(){
					oNavigationController = oNavigationController || new NavigationController(oTemplateUtils, oController, oControllerBase.state);
					return oNavigationController;
				};
			}
			
			function getTransactionControllerFunction() {
				var oTransactionController;
				return function(){
					if (!oTransactionController) {
						var Class = oTemplateUtils.oComponentUtils.isDraftEnabled() ? DraftTransactionController : NonDraftTransactionController;
						oTransactionController = new Class(oTemplateUtils, oController, oControllerBase.state);
					}
					return oTransactionController;
				};
			}
			
			function handleShowNextObject(){
				oPaginatorButtonsHelper.handleShowNextObject();
			}
			
			function handleShowPrevObject(){
				oPaginatorButtonsHelper.handleShowPrevObject();
			}
			
			// Expose selected private functions to unit tests
			/* eslint-disable */
			var fnGetHashChangerInstance = testableHelper.testable(fnGetHashChangerInstance, "getHashChangerInstance");
			var fnAdaptLinksToUpperLevels = testableHelper.testable(fnAdaptLinksToUpperLevels, "adaptLinksToUpperLevels");
			/* eslint-enable */
			
			oControllerBase = {
				onInit: function(oRequiredControls){
					aEntitySets = oTemplateUtils.oServices.oApplication.getSections(oController.getOwnerComponent().getEntitySet(), true);
					if (!oRequiredControls || oRequiredControls.footerBar){
						var bIsODataBased = oTemplateUtils.oComponentUtils.isODataBased();
						var oMessageButtonHost = {
							controller: oController
						};
						oControllerBase.state.messageButtonHelper = new MessageButtonHelper(oTemplateUtils.oCommonUtils, oMessageButtonHost, bIsODataBased);
						oControllerBase.state.beforeSaveHelper = oTemplateUtils.oServices.oApplication.getBeforeSaveHelper(oController, oTemplateUtils.oCommonUtils);
						oTemplateUtils.oServices.oTemplateCapabilities.oMessageButtonHelper = oControllerBase.state.messageButtonHelper;
					}
					if (!oRequiredControls || oRequiredControls.paginatorButtons){
						oPaginatorButtonsHelper = new PaginatorButtonsHelper(oControllerBase, oController, oTemplateUtils);
					}
				},
				handlers: {
					handleShowNextObject: handleShowNextObject,
					handleShowPrevObject: handleShowPrevObject,
					onShowMessages: onShowMessages,
					applyAndUp: fnApplyAndUp,
					onBack: fnOnBack
				},
				extensionAPI: {
					getNavigationControllerFunction: getNavigationControllerFunction,
					getTransactionControllerFunction: getTransactionControllerFunction
				},
				fclInfo: {
					isContainedInFCL: false	
				},
				state: {},
				onComponentActivate: function(sBindingPath, bIsComponentCurrentlyActive){
					if (oControllerBase.state.messageButtonHelper){
						oControllerBase.state.messageButtonHelper.adaptToContext(sBindingPath);
					}
					oTemplateUtils.oComponentUtils.setBackNavigation(fnOnBack);
					fnAdaptLinksToUpperLevels();
					// set visibility of up/down buttons
					if (oPaginatorButtonsHelper){
                        oPaginatorButtonsHelper.computeAndSetVisibleParamsForNavigationBtns();
					}
					oViewProxy.oStatePreserverPromise.then(function(oStatePreserver){
						oStatePreserver.applyAppState(sBindingPath, bIsComponentCurrentlyActive);
					});
				}
			};
			
			oViewProxy.navigateUp = fnNavigateUp;
			oViewProxy.setEditable = setEditable;
			oViewProxy.getMessageFilters = getMessageFilters;
			
			var oTemplatePrivateModel = oTemplateUtils.oComponentUtils.getTemplatePrivateModel();
			var iViewLevel = oTemplatePrivateModel.getProperty("/generic/viewLevel");
			var oFclProxy = oTemplateUtils.oServices.oApplication.getFclProxyForView(iViewLevel);
			if (oFclProxy.oActionButtonHandlers){
				oControllerBase.handlers.fclActionButtonHandlers = oFclProxy.oActionButtonHandlers;
				oControllerBase.fclInfo.isContainedInFCL = true;
			}
			oControllerBase.fclInfo.navigateToDraft = oFclProxy.navigateToDraft;
			oControllerBase.stateChanged = function(){
				oViewProxy.oStatePreserverPromise.then(function(oStatePreserver){
					oStatePreserver.stateChanged();
				});
			};
			return oControllerBase;
		}
		
		return {
			getComponentBase: getComponentBase,
			getControllerBase: getControllerBase
		};
	});