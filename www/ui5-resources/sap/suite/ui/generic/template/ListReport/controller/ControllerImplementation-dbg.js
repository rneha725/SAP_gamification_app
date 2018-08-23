/* global hasher */
sap.ui.define([
	"jquery.sap.global",
	"sap/ui/model/json/JSONModel",
	"sap/m/ObjectIdentifier",
	"sap/m/Table",
	"sap/m/Text",
	"sap/ui/comp/smartfield/SmartField",
	"sap/ui/generic/app/navigation/service/SelectionVariant",
	"sap/suite/ui/generic/template/ListReport/extensionAPI/ExtensionAPI",
	"sap/m/MessageBox",
	"sap/suite/ui/generic/template/js/AnnotationHelper",
	"sap/suite/ui/generic/template/lib/MessageUtils",
	"sap/suite/ui/generic/template/listTemplates/listUtils",
	"sap/suite/ui/generic/template/ListReport/controller/IappStateHandler",
	"sap/suite/ui/generic/template/ListReport/controller/MultipleViewsHandler",
	"sap/suite/ui/generic/template/ListReport/controller/WorklistHandler",
	"sap/suite/ui/generic/template/lib/ShareUtils",
	"sap/ui/model/Filter",
	"sap/ui/comp/navpopover/LinkData"
], function(jQuery, JSONModel, ObjectIdentifier, Table, Text, SmartField, SelectionVariant, ExtensionAPI, MessageBox, AnnotationHelper, MessageUtils, listUtils, IappStateHandler, MultipleViewsHandler, WorklistHandler, ShareUtils) {
	"use strict";

	return {
		getMethods: function(oViewProxy, oTemplateUtils, oController) {
			/**
			 * contains instance attributes that are shared with helper classes:
			 * oSmartFilterbar, oSmartTable, oIappStateHandler, oMultipleViewsHandler, bLoadListAndFirstEntryOnStartup, oWorklistData, oWorklistHandler, sNavType
			 * and functions updateControlOnSelectionChange and (from oIappStateHandler) getCurrentAppState.
			 * Initialized in onInit.
			 */
			var oState = {};

			oState.oWorklistData = {}; //object which saves worklist related data
			oState.oWorklistData.bWorkListEnabled = false;
			oState.oWorklistData.bVariantDirty = true;
			var bIsStartingUp = true;
			var oFclProxy;

			var aWaitingForDisplayNextObjectInfo = null;

			// -- Begin of methods that are used in onInit only
			function fnSetIsLeaf() {
				var oComponent = oController.getOwnerComponent();
				var oTemplatePrivateModel = oTemplateUtils.oComponentUtils.getTemplatePrivateModel();
				oTemplatePrivateModel.setProperty("/listReport/isLeaf", oComponent.getIsLeaf());
			}

			function onSmartFilterBarInitialise(oEvent) {
				oController.onInitSmartFilterBarExtension(oEvent);
				oController.templateBaseExtension.onInitSmartFilterBar(oEvent);
				oState.oIappStateHandler.onSmartFilterBarInitialise();
			}

			function onSmartFilterBarInitialized() {
				var oAppStatePromise = oState.oIappStateHandler.parseUrlAndApplyAppState();
				oAppStatePromise.then(function() {
					bIsStartingUp = false;
				}, function(oError) {
					/* not clear how to reach this code
					 * at least an app state that cannot be retrieved (not persisted at all or no more available) is handled
					 * inside iAppStateHandler (oAppStatePromise will be resolved in that case)
					 */
					if (oError instanceof Error) {
						oError.showMessageBox(); // improve?
					}
				});
			}

			function onFilterChange() {
				if (!bIsStartingUp) {
					oState.oIappStateHandler.changeIappState(true, false);
				}
			}

			// oControl is either a SmartTable or a SmartChart
			function fnUpdateControlOnSelectionChange(oControl) {
				var oModel = oController.getOwnerComponent().getModel(),
					oTemplatePrivateModel = oTemplateUtils.oComponentUtils.getTemplatePrivateModel();
				var oMetaModel = oModel.getMetaModel();
				var sEntitySet = oTemplateUtils.oCommonUtils.getCurrentEntitySetName(oControl);
				var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
				var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"];
				var bDeleteEnabled = false;
				if (sap.suite.ui.generic.template.js.AnnotationHelper.areDeleteRestrictionsValid(oMetaModel, oEntitySet.entityType, oDeleteRestrictions)) {
					var sDeletablePath = oDeleteRestrictions && oDeleteRestrictions.Deletable && oDeleteRestrictions.Deletable.Path;
					var aContexts = oTemplateUtils.oCommonUtils.getSelectedContexts(oControl);
					// search for at least one deletable entry
					bDeleteEnabled = aContexts.some(function(oContext) {
						var oDraftAdministrativeData = oModel.getObject(oContext.getPath() + "/DraftAdministrativeData");
						var bIsObjectNotLocked = !(oDraftAdministrativeData && oDraftAdministrativeData.InProcessByUser && !oDraftAdministrativeData.DraftIsProcessedByMe);
						// The object is deletable if it is not locked and we do not have a deleteable path that disallows the deletion of that object
						return bIsObjectNotLocked && !(sDeletablePath && !oModel.getProperty(sDeletablePath, oContext));
					});
				}
				oTemplatePrivateModel.setProperty("/listReport/deleteEnabled", bDeleteEnabled);
				oTemplateUtils.oCommonUtils.setEnabledToolbarButtons(oControl);
				if (!oTemplateUtils.oCommonUtils.isSmartChart(oControl)) { //Chart does not have footer buttons
					oTemplateUtils.oCommonUtils.setEnabledFooterButtons(oControl);
				}
			}

			function fnOnSemanticObjectLinkNavigationPressed(oEvent) {
				var oEventParameters = oEvent.getParameters();
				var oEventSource = oEvent.getSource();
				oTemplateUtils.oCommonEventHandlers.onSemanticObjectLinkNavigationPressed(oEventSource, oEventParameters);
			}

			function fnOnSemanticObjectLinkNavigationTargetObtained(oEvent) {
				var oEventParameters, oEventSource;
				oEventParameters = oEvent.getParameters();
				oEventSource = oEvent.getSource();	//set on semanticObjectController
				oTemplateUtils.oCommonEventHandlers.onSemanticObjectLinkNavigationTargetObtained(oEventSource, oEventParameters, oState, undefined, undefined);
			}

			function fnOnSemanticObjectLinkNavigationTargetObtainedSmartLink(oEvent) {
				var oMainNavigation, sTitle, oCustomData, sDescription, oEventParameters, oEventSource;
				oMainNavigation = oEvent.getParameters().mainNavigation;
				oEventParameters = oEvent.getParameters();
				oEventSource = oEvent.getSource(); //set on smart link
				if (oMainNavigation) {
					sTitle = oEventSource.getText && oEventSource.getText();
					oCustomData = oTemplateUtils.oCommonUtils.getCustomData(oEvent);
					if (oCustomData && oCustomData["LinkDescr"]) {
						sDescription = oCustomData["LinkDescr"];
						oMainNavigation.setDescription(sDescription);
					}
				}
				oEventSource = oEventSource.getParent().getParent().getParent().getParent(); //set on smart table
				oTemplateUtils.oCommonEventHandlers.onSemanticObjectLinkNavigationTargetObtained(oEventSource, oEventParameters, oState, sTitle, oMainNavigation);
				//oEventParameters.show(sTitle, oMainNavigation, undefined, undefined);
			}

			function getItemInTable(sContextPath) {
				var aItems = oViewProxy.getItems();
				for (var i = 0; i < aItems.length; i++) {
					if (!sContextPath || aItems[i].getBindingContextPath() === sContextPath) {
						return aItems[i];
					}
				}
			}

			function addEntryImpl(oPredefinedValues, oEvent) {
				var oEventSource = oEvent.getSource();
				oTemplateUtils.oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
					oTemplateUtils.oCommonEventHandlers.addEntry(oEventSource, false, oState.oSmartFilterbar, oPredefinedValues);
				}, jQuery.noop, oState);
			}

			function addEntryWithFilters(oEvent) {
				var oCreateWithFilters = oController.getOwnerComponent().getCreateWithFilters();
				var sStrategy = oCreateWithFilters.strategy || "extension";
				var oPredefinedValues;
				switch (sStrategy) {
					case "extension":
						oPredefinedValues = oController.getPredefinedValuesForCreateExtension(oState.oSmartFilterbar);
						break;
					default:
						jQuery.sap.log.error(sStrategy + " is not a valid strategy to extract values from the SmartFilterBar");
						return;
				}
				addEntryImpl(oPredefinedValues, oEvent);
			}

			// Generation of Event Handlers
			return {
				onInit: function() {
					// check if worklist is enabled
					var oAppComponent = oController.getOwnerComponent().getAppComponent();
					var oManifestEntryGenricApp = oAppComponent.getConfig();
					oState.oWorklistData.bWorkListEnabled = !!oManifestEntryGenricApp.pages[0].component.settings && oManifestEntryGenricApp.pages[0].component.settings.isWorklist;
					oState.oSmartFilterbar = oController.byId("listReportFilter");
					oState.oSmartTable = oController.byId("listReport");
					// Make the fnUpdateControlOnSelectionChange function available for others via the oState object
					oState.updateControlOnSelectionChange = fnUpdateControlOnSelectionChange;
					oFclProxy = oTemplateUtils.oServices.oApplication.getFclProxyForView(0);
					oState.bLoadListAndFirstEntryOnStartup = oFclProxy && oFclProxy.isListAndFirstEntryLoadedOnStartup && oFclProxy.isListAndFirstEntryLoadedOnStartup();
					oState.oMultipleViewsHandler = new MultipleViewsHandler(oState, oController, oTemplateUtils);
					oState.oWorklistHandler = new WorklistHandler(oState, oController, oTemplateUtils);
					oState.oIappStateHandler = new IappStateHandler(oState, oController, oTemplateUtils);
					// gets the custom search field of worklist and saves it in oState.
					if (oState.oWorklistData.bWorkListEnabled) {
						oState.oWorklistHandler.fetchAndSaveWorklistSearchField();
					}
					var oTemplatePrivateModel = oTemplateUtils.oComponentUtils.getTemplatePrivateModel();
					oTemplatePrivateModel.setProperty("/generic/bDataAreShownInTable", false);

					// Initialise headerExpanded property to true as a fix for incident 1770402849. Text of toggle filter button depends on this value.
					oTemplatePrivateModel.setProperty("/listReport/isHeaderExpanded", true);

					// set property for enable/disable of the Delete button
					oTemplatePrivateModel.setProperty("/listReport/deleteEnabled", false);

					oTemplateUtils.oServices.oApplication.registerStateChanger({
						isStateChange: oState.oIappStateHandler.isStateChange
					});
					// Give component access to some methods
					oViewProxy.getUrlParameterInfo = oState.oIappStateHandler.getUrlParameterInfo;
					oViewProxy.getItems = function() {
						var oTable = oState.oSmartTable.getTable();
						if (oTemplateUtils.oCommonUtils.isUiTable(oTable)) {
							return oTable.getRows();
						}
						return oTable.getItems();
					};
					oViewProxy.displayNextObject = function(aOrderObjects) {
						return new Promise(function(resolve, reject) {
							aWaitingForDisplayNextObjectInfo = {
								aWaitingObjects: aOrderObjects,
								resolve: resolve,
								reject: reject
							};
						});
					};

					oViewProxy.onComponentActivate = function() {
						if (!bIsStartingUp) {
							oState.oIappStateHandler.parseUrlAndApplyAppState();
						}
					};
					oViewProxy.refreshBinding = function() {
						// refresh list, but only if the list is currently showing data
						if (oState.oIappStateHandler.areDataShownInTable()) {
							if (oState.oMultipleViewsHandler.getMode() === "multi") {
								var oImplementingHelper = oState.oMultipleViewsHandler.getImplementingHelper();
								var oTemplPrivGlobal = oState.oSmartTable.getModel("_templPrivGlobal");
								var sCurrentEntitySet = oTemplPrivGlobal.getProperty("/generic/multipleViews/objectPage/currentEntitySet");
								oImplementingHelper.setTablesToDirtyByEntitySet(sCurrentEntitySet, true);
								oTemplPrivGlobal.setProperty("/generic/multipleViews/objectPage/currentEntitySet", null);
							}
							oTemplateUtils.oCommonUtils.refreshSmartTable(oState.oSmartTable);
						}
					};

					fnSetIsLeaf();

					oController.byId("template::FilterText").attachBrowserEvent("click", function() {
						oController.byId("page").setHeaderExpanded(true);
					});
				},

				handlers: {
					addEntry: addEntryImpl.bind(null, undefined),
					addEntryWithFilters: addEntryWithFilters,
					deleteEntries: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.deleteEntries(oEvent);
					},
					updateTableTabCounts: function() {
						oState.oMultipleViewsHandler.fnUpdateTableTabCounts();
					},
					onSelectionChange: function(oEvent) {
						var oTable = oEvent.getSource();
						fnUpdateControlOnSelectionChange(oTable);
					},
					onChange: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onChange(oEvent);
					},
					onSmartFieldUrlPressed: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onSmartFieldUrlPressed(oEvent, oState);
					},
					onBreadCrumbUrlPressed: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onBreadCrumbUrlPressed(oEvent, oState);
					},
					onContactDetails: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onContactDetails(oEvent);
					},
					onSmartFilterBarInitialise: onSmartFilterBarInitialise,
					onSmartFilterBarInitialized: onSmartFilterBarInitialized,

					onBeforeSFBVariantFetch: function() {
						oState.oIappStateHandler.onBeforeSFBVariantFetch();
					},

					onAfterSFBVariantSave: function() {
						oState.oIappStateHandler.onAfterSFBVariantSave();
					},

					onAfterSFBVariantLoad: function(oEvent) {
						oState.oIappStateHandler.onAfterSFBVariantLoad(oEvent);
					},
					onDataRequested: function() {
						oState.oMultipleViewsHandler.onDataRequested();
					},
					onDataReceived: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onDataReceived(oEvent);
						var oImplementingHelper = oState.oMultipleViewsHandler.getImplementingHelper();
						if (oImplementingHelper && typeof oImplementingHelper.setTableDirty === "function") {
							oImplementingHelper.setTableDirty(oState.oSmartTable, false);
						}
						if (aWaitingForDisplayNextObjectInfo) {
							var oItem;
							var bSuccess = false;
							for (var i = 0; i < aWaitingForDisplayNextObjectInfo.aWaitingObjects.length && !bSuccess; i++) {
								oItem = getItemInTable(aWaitingForDisplayNextObjectInfo.aWaitingObjects[i]);
								if (oItem) {
									oTemplateUtils.oCommonEventHandlers.onListNavigate(oItem, oState);
									aWaitingForDisplayNextObjectInfo.resolve();
									bSuccess = true;
								}
							}
							if (!bSuccess) {
								oItem = getItemInTable();
								if (oItem) {
									oTemplateUtils.oCommonEventHandlers.onListNavigate(oItem, oState);
									aWaitingForDisplayNextObjectInfo.resolve();
								} else {
									aWaitingForDisplayNextObjectInfo.reject();
								}
							}
							aWaitingForDisplayNextObjectInfo = null;
							return;
						}

						var oTable = oEvent.getSource().getTable();
						oFclProxy.handleDataReceived(oTable, oState, oTemplateUtils);
					},
					// it is a workaround for the time being till SmartChart fired an Event DataRequested; then it has to be changed
					onSmartChartDataReceived: function() {
						oState.oMultipleViewsHandler.onDataRequested();
					},
					onBeforeRebindTable: function(oEvent) {
						//in table tabs case oEvent.bindingParams.filters do not contain the values from the SmartFilterbar so far but it will contain filters
						//which can be set directly on the table under 'settings'
						// we have to remember these filters in order to exclude them later for counts
						oState.oMultipleViewsHandler.aTableFilters = oEvent.getParameters() && oEvent.getParameters().bindingParams && jQuery.extend(true, {}, oEvent.getParameters().bindingParams.filters);
						oTemplateUtils.oCommonEventHandlers.onBeforeRebindTable(oEvent, {
							determineSortOrder: oState.oMultipleViewsHandler.determineSortOrder,
							ensureExtensionFields: oController.templateBaseExtension.ensureFieldsForSelect,
							addExtensionFilters: oController.templateBaseExtension.addFilters
						});
						oController.onBeforeRebindTableExtension(oEvent);
						oState.oMultipleViewsHandler.onRebindContentControl(oEvent);
						listUtils.handleErrorsOnTableOrChart(oTemplateUtils, oEvent);                         
					},
					onShowDetails: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onShowDetails(oEvent.getSource(), oState);
					},
					onListNavigate: function(oEvent) {
						if (!oController.onListNavigationExtension(oEvent)) {
							oTemplateUtils.oCommonEventHandlers.onListNavigate(oEvent.getSource(), oState);
						}
					},
					onCallActionFromToolBar: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onCallActionFromToolBar(oEvent, oState);
					},
					onDataFieldForIntentBasedNavigation: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onDataFieldForIntentBasedNavigation(oEvent, oState);
					},
					onDataFieldWithIntentBasedNavigation: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onDataFieldWithIntentBasedNavigation(oEvent, oState);
					},
					onBeforeSemanticObjectLinkPopoverOpens: function(oEvent) {

						var oEventParameters = oEvent.getParameters();

						oTemplateUtils.oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
							//Success function
							var sSelectionVariant = JSON.stringify(oState.oSmartFilterbar.getUiState().getSelectionVariant());
							oTemplateUtils.oCommonUtils.semanticObjectLinkNavigation(oEventParameters, sSelectionVariant, oController);
						}, jQuery.noop, oState, jQuery.noop);
					},
					onSemanticObjectLinkNavigationPressed: fnOnSemanticObjectLinkNavigationPressed,
					onSemanticObjectLinkNavigationTargetObtained: fnOnSemanticObjectLinkNavigationTargetObtained,
					onSemanticObjectLinkNavigationTargetObtainedSmartLink: fnOnSemanticObjectLinkNavigationTargetObtainedSmartLink,
					onDraftLinkPressed: function(oEvent) {
						var oButton = oEvent.getSource();
						var oBindingContext = oButton.getBindingContext();
						oTemplateUtils.oCommonUtils.showDraftPopover(oBindingContext, oButton);
					},
					onAssignedFiltersChanged: function(oEvent) {
						if (oEvent.getSource()) {
							oController.byId("template::FilterText").setText(oEvent.getSource().retrieveFiltersWithValuesAsText());
						}
					},
					onFilterChange: onFilterChange,
					onToggleFiltersPressed: function() {
						var oTemplatePrivateModel = oTemplateUtils.oComponentUtils.getTemplatePrivateModel();
						oTemplatePrivateModel.setProperty("/listReport/isHeaderExpanded", !oTemplatePrivateModel.getProperty("/listReport/isHeaderExpanded"));
					},

					// the search is automatically performed by the SmartTable
					// so we only need to
					// - ensure that all cached data for the object pages are refreshed, too
					// - update our internal state (data are shown in table)
					onSearchButtonPressed: function() {
						oTemplateUtils.oCommonUtils.refreshModel(oState.oSmartTable);
						oState.oIappStateHandler.changeIappState(false, true);
					},
					onSemanticObjectLinkPopoverLinkPressed: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onSemanticObjectLinkPopoverLinkPressed(oEvent, oState);
					},
					onAfterTableVariantSave: function() {
						oState.oIappStateHandler.onAfterTableVariantSave();
					},
					onAfterApplyTableVariant: function() {
						if (!bIsStartingUp) {
							oState.oIappStateHandler.onAfterApplyTableVariant();
						}
					},
					onAfterChartVariantSave: function(oEvent) {
						oState.oIappStateHandler.onAfterTableVariantSave();
					},
					onAfterApplyChartVariant: function(oEvent) {
						if (!bIsStartingUp) {
							oState.oIappStateHandler.onAfterApplyTableVariant();
						}
					},
					onBeforeRebindChart: function(oEvent) {
						//in table tabs case oEvent.bindingParams.filters do not contain the values from the SmartFilterbar so far but it will contain filters
						//which can be set directly on the table under 'settings'
						// we have to remember these filters in order to exclude them later for counts
						oState.oMultipleViewsHandler.aTableFilters = oEvent.getParameters() && oEvent.getParameters().bindingParams && jQuery.extend(true, {}, oEvent.getParameters().bindingParams.filters);

						
						var oSmartChart = oEvent.getSource();
						var oCallbacks = {
							setBindingPath: oSmartChart.setChartBindingPath.bind(oSmartChart),
							ensureExtensionFields: jQuery.noop, // needs further clarification
							addExtensionFilters: oController.templateBaseExtension.addFilters							
						};
						oTemplateUtils.oCommonUtils.onBeforeRebindTableOrChart(oEvent, oCallbacks, oState.oSmartFilterbar);
						
//							// add custom filters
						oController.onBeforeRebindChartExtension(oEvent);
						oState.oMultipleViewsHandler.onRebindContentControl(oEvent);
						listUtils.handleErrorsOnTableOrChart(oTemplateUtils, oEvent);
					},
					onChartInitialise: function(oEvent) {
						oState.oMultipleViewsHandler.fnRegisterToChartEvents(oEvent);
						//	oState.oMultipleViewsHandler.onChartInit(oEvent);
						oState.oMultipleViewsHandler.init(oEvent);
						oTemplateUtils.oCommonUtils.checkToolbarIntentsSupported(oEvent.getSource());
					},
					onSelectionDetailsActionPress: function(oEvent) {
						oState.oMultipleViewsHandler.onDetailsActionPress(oEvent);
					},

					// ---------------------------------------------
					// END store navigation context
					// ---------------------------------------------

					onShareListReportActionButtonPress: function(oEvent) {
						var oFragmentController = {
							shareEmailPressed: function() {
								var sSubject = oTemplateUtils.oCommonUtils.getText("EMAIL_HEADER", [ oTemplateUtils.oServices.oApplication.getAppTitle() ]);

								sap.m.URLHelper.triggerEmail(null, sSubject, document.URL);
							},

							shareJamPressed: function() {
								ShareUtils.openJamShareDialog(oTemplateUtils.oServices.oApplication.getAppTitle());
							},

							getDownloadUrl: function() {
								var oTable = oState.oSmartTable.getTable();
								var oBinding = oTable.getBinding("rows") || oTable.getBinding("items");

								return oBinding && oBinding.getDownloadUrl() || "";
							},

							getServiceUrl: function() {
								var sServiceUrl = oFragmentController.getDownloadUrl();
								if (sServiceUrl) {
									sServiceUrl += "&$top=0&$inlinecount=allpages";
								}

								var oShareInfo = {
									serviceUrl: sServiceUrl
								};

								if (oController.onSaveAsTileExtension) {
									oController.onSaveAsTileExtension(oShareInfo);
								}

								return oShareInfo.serviceUrl;
							},

							getCustomUrl: function() {
								var sHash = hasher.getHash();

								return sHash ? ("#" + sHash) : window.location.href;
							},

							getModelData: function() {
								var fnGetUser = jQuery.sap.getObject("sap.ushell.Container.getUser");
								var oOwnerComponent = oController.getOwnerComponent();
								var oAppComponent = oOwnerComponent.getAppComponent();
								var oMetadata = oAppComponent.getMetadata();

								var oUIManifest = oMetadata.getManifestEntry("sap.ui");
								var sIcon = (oUIManifest && oUIManifest.icons && oUIManifest.icons.icon) || "";
								var oAppManifest = oMetadata.getManifestEntry("sap.app");
								var sTitle = (oAppManifest && oAppManifest.title) || "";

								return {
									serviceUrl: oFragmentController.getServiceUrl,
									icon: sIcon,
									title: sTitle,
									isShareInJamActive: !!fnGetUser && fnGetUser().isJamActive(),
									customUrl: oFragmentController.getCustomUrl
								};
							}
						};

						ShareUtils.openSharePopup(oTemplateUtils.oCommonUtils, oEvent.getSource(), oFragmentController);

						// workaround for focus loss issue for AddBookmarkButton ("save as tile" button)
						var oShareButton = this.getView().byId("template::Share");
						var oBookmarkButton = this.getView().byId("bookmarkButton");
						oBookmarkButton.setBeforePressHandler(function() {
							// set the focus to share button
							oShareButton.focus();
						});
					},
					onInlineDataFieldForAction: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onInlineDataFieldForAction(oEvent, oState);
					},
					onInlineDataFieldForIntentBasedNavigation: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onInlineDataFieldForIntentBasedNavigation(oEvent.getSource(), oState);
					},
					onDeterminingDataFieldForAction: function(oEvent) {
						oTemplateUtils.oCommonEventHandlers.onDeterminingDataFieldForAction(oEvent, oState.oSmartTable);
					},
					onDeterminingDataFieldForIntentBasedNavigation: function(oEvent) {
						var oButton = oEvent.getSource();
						oTemplateUtils.oCommonEventHandlers.onDeterminingDataFieldForIntentBasedNavigation(oButton, oState.oSmartTable.getTable(), oState);
					},

					// Note: In the multiple view multi tables mode this will be called once for each SmartTable
					onTableInit: function(oEvent) {
						var oSmartTable = oEvent.getSource(); // do not use oState.oSmartTable, since this is not reliable in the multiple view multi tables mode
						oTemplateUtils.oCommonUtils.checkToolbarIntentsSupported(oSmartTable);
						oState.oMultipleViewsHandler.init(oEvent);
					},
					//search function called in worklist light version of LR
					onSearchWorkList: function(oEvent) {
						oState.oWorklistHandler.performWorklistSearch(oEvent);
					},
					// functions for sort, filter group in table header in worklist light
					onWorkListTableSettings: function(oEvent) {
						oState.oWorklistHandler.openWorklistPersonalisation(oEvent);
					}
				},
				formatters: {
					formatDraftType: function(oDraftAdministrativeData, bIsActiveEntity, bHasDraftEntity) {
						if (oDraftAdministrativeData && oDraftAdministrativeData.DraftUUID) {
							if (!bIsActiveEntity) {
								return sap.m.ObjectMarkerType.Draft;
							} else if (bHasDraftEntity) {
								return oDraftAdministrativeData.InProcessByUser ? sap.m.ObjectMarkerType.Locked : sap.m.ObjectMarkerType.Unsaved;
							}
						}
						return sap.m.ObjectMarkerType.Flagged;
					},

					formatDraftVisibility: function(oDraftAdministrativeData, bIsActiveEntity) {
						if (oDraftAdministrativeData && oDraftAdministrativeData.DraftUUID) {
							if (!bIsActiveEntity) {
								return sap.m.ObjectMarkerVisibility.TextOnly; //for Draft mode only the text will be shown
							}
						}
						return sap.m.ObjectMarkerVisibility.IconAndText; //Default text and icon
					},

					formatDraftLineItemVisible: function(oDraftAdministrativeData) {
						if (oDraftAdministrativeData && oDraftAdministrativeData.DraftUUID) {
							return true;
						}
						return false;
					},

					// Returns full user name or ID of owner of a draft with status "unsaved changes" or "locked" in the format "by full name" or "by UserId"
					// If the user names and IDs are not maintained we display for example "locked by another user"
					formatDraftOwner: function(oDraftAdministrativeData, bHasDraftEntity) {
						var sDraftOwnerDescription = "";
						if (oDraftAdministrativeData && oDraftAdministrativeData.DraftUUID && bHasDraftEntity) {
							var sUserDescription = oDraftAdministrativeData.InProcessByUserDescription || oDraftAdministrativeData.InProcessByUser || oDraftAdministrativeData.LastChangedByUserDescription || oDraftAdministrativeData.LastChangedByUser;
							if (sUserDescription) {
								sDraftOwnerDescription = oTemplateUtils.oCommonUtils.getText("ST_DRAFT_OWNER", [sUserDescription]);
							} else {
								sDraftOwnerDescription = oTemplateUtils.oCommonUtils.getText("ST_DRAFT_ANOTHER_USER");
							}
						}
						return sDraftOwnerDescription;
					},

					formatItemTextForMultipleView: function(oItem) {
						return oState.oMultipleViewsHandler ? oState.oMultipleViewsHandler.formatItemTextForMultipleView(oItem) : "";
					}
				},

				extensionAPI: new ExtensionAPI(oTemplateUtils, oController, oState)
			};
		}
	};

});