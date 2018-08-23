sap.ui.define(["jquery.sap.global", "sap/ui/base/Object", "sap/ui/core/format/NumberFormat", "sap/ui/core/format/DateFormat", "sap/m/Select", "sap/m/MessageBox", "sap/m/MessageToast", "sap/m/Table",
	"sap/ui/model/Filter", "sap/ui/model/Sorter", "sap/ui/comp/smartfilterbar/SmartFilterBar", "sap/ui/model/odata/type/Time",
	"sap/suite/ui/generic/template/lib/testableHelper","sap/ui/model/json/JSONModel","sap/ui/core/mvc/ViewType", "sap/suite/ui/generic/template/js/AnnotationHelper", "sap/suite/ui/generic/template/lib/modelHelper", "sap/suite/ui/generic/template/lib/MessageUtils", "sap/ui/generic/app/navigation/service/SelectionVariant", "sap/ui/core/mvc/Controller"
], function(jQuery, BaseObject, NumberFormat, DateFormat, Select, MessageBox, MessageToast, Table, Filter, Sorter,
	SmartFilterBar, Time, testableHelper, JSONModel, ViewType, AnnotationHelper, modelHelper, MessageUtils, SelectionVariant, Controller) {

	"use strict";

	function getDecimalFormatter(oProperty, bIsCurrency) {
		var oFormat;

		if (bIsCurrency) {
			oFormat = NumberFormat.getCurrencyInstance({
				showMeasure: false
			});
		} else {
			oFormat = NumberFormat.getFloatInstance({
				precision: oProperty.precision,
				decimals: oProperty.scale
			});
		}

		return function (sPropertyValue, sUnitValue) {
			sPropertyValue = oFormat.format(sPropertyValue, sUnitValue);
			if (sUnitValue) {
				sPropertyValue += " " + sUnitValue;
			}
			return sPropertyValue;
		};
	}

	function getTypeMap(oContext, sPath, sColumnLabel) {
		var oMetaModel = oContext.getModel("entitySet").getMetaModel(),
			oMetaEntityType = oMetaModel.getObject(oMetaModel.getMetaContext(oContext.sPath).sPath),
			oProperty = oMetaModel.getObject(oMetaModel.getMetaContext(oContext.sPath + "/" + sPath).sPath),
			oTypeMap = {
				path: sPath,
				data: {
					type: oProperty.type,
					displayFormat: " ",
					label: sColumnLabel,
					textPath: sPath,
					textArrangement: AnnotationHelper.getTextArrangement(oMetaEntityType, oProperty),
					unit: null,
					fnDecimalFormatter: null
				}
			},
			sODataUnit = "Org.OData.Measures.V1.Unit",
			sODataISOCurrency = "Org.OData.Measures.V1.ISOCurrency",
			bIsCurrency = false,
			oPropertyExtensions, sTextProperty,	aSplitPath,	iLength;

		if (oProperty) {
			if (oProperty.extensions) {
				iLength = oProperty.extensions.length;
				for (var k = 0; k < iLength; k++) {
					oPropertyExtensions = oProperty.extensions[k];
					if (oPropertyExtensions.namespace === "http://www.sap.com/Protocols/SAPData") {
						switch (oPropertyExtensions.name) {
							case "display-format":
								oTypeMap.data.displayFormat = oPropertyExtensions.value;
								break;
							case "label":
								if (!oTypeMap.data.label) {	// If column label is undefined
									oTypeMap.data.label = oPropertyExtensions.value;
								}
								break;
							case "text":
								sTextProperty = oPropertyExtensions.value;
								aSplitPath = sPath.split("/");
								aSplitPath[aSplitPath.length - 1] = sTextProperty;
								oTypeMap.data.textPath = aSplitPath.join("/");
								break;
							default:
								break;
						}
					}
				}
			}
			if (oTypeMap.data.label === "" || oTypeMap.data.label === undefined) {
				oTypeMap.data.label = sPath;
			}

			if (oProperty.type === "Edm.Decimal") {
				if (oProperty[sODataISOCurrency]) {
					oTypeMap.data.unit = oProperty[sODataISOCurrency].Path;
					bIsCurrency = true;
				} else if (oProperty[sODataUnit]) {
					oTypeMap.data.unit = oProperty[sODataUnit].Path;
				}
				oTypeMap.data.fnDecimalFormatter = getDecimalFormatter(oProperty, bIsCurrency);
			}
		}
		return oTypeMap;
	}

	function fnGroupFunction(sPath, sColumnLabel) {
		// coding for finding the right key and label for the grouping row of a table
		// hope to replace this by core functionality soon
		var mTypeMap = {}; // buffer for subsequent calls

		return function(oContext) {
			var sPropertyValue = oContext.getProperty(sPath),
				sText = "",
				oTypeMap, sUnitValue, sAssociatedText, dateFormat, TZOffsetMs;

			// check for existing entry in buffer
			oTypeMap = mTypeMap[sPath];
			if (!oTypeMap) { // not in buffer
				oTypeMap = getTypeMap(oContext, sPath, sColumnLabel);
				mTypeMap[sPath] = oTypeMap;
			}

			if (oTypeMap.data.textPath && oTypeMap.data.textPath !== "") {
				sAssociatedText = oContext.getProperty(oTypeMap.data.textPath);
			}

			switch (oTypeMap.data.type) {
				case "Edm.DateTime":
					if (oTypeMap.data.displayFormat === "Date") {
						if (sPropertyValue && sPropertyValue !== "" && sPropertyValue.getTime){
							dateFormat = DateFormat.getDateInstance({style : "medium"}); //better than specifying with a pattern since the language can be considered
							TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
							sPropertyValue = dateFormat.format(new Date(sPropertyValue.getTime() + TZOffsetMs));
						}
					}
					break;
				case "Edm.Time":
					if (sPropertyValue && sPropertyValue !== ""){
						sPropertyValue = new Time().formatValue(sPropertyValue, "string");
					}
					break;
				case "Edm.Boolean":
					if (sPropertyValue === true) {
						sPropertyValue = "{i18n>YES}";
					} else if (sPropertyValue === false) {
						sPropertyValue = "{i18n>NO}";
					}
					break;
				case "Edm.Decimal":
					sUnitValue = (oTypeMap.data.unit) ? oContext.getProperty(oTypeMap.data.unit) : "";
					sPropertyValue = oTypeMap.data.fnDecimalFormatter(sPropertyValue, sUnitValue);
					break;
				default:
					break;
			}

			if (!sAssociatedText || oTypeMap.data.textPath === sPath) { // when there is no text property or text association is null or undefined
				sText = sPropertyValue ? sPropertyValue : "";
			} else { // when there is text property or text association
				switch (oTypeMap.data.textArrangement) {
					case "idAndDescription":											//TEXT_LAST
						sText = sPropertyValue + " (" +  sAssociatedText  + ")";
						break;
					case "idOnly":														//TEXT_SEPARATE
						sText = sPropertyValue;
						break;
					case "descriptionOnly":												//TEXT_ONLY
						sText = sAssociatedText;
						break;
					default: // e.g. "descriptionAndId"
						sText = sAssociatedText + (sPropertyValue ? " (" + sPropertyValue  + ")" : "");	//TEXT_FIRST
						break;
				}
			}

			return {
				key: sText ? sText : sPath,
				text: oTypeMap.data.label ? oTypeMap.data.label + ": " + sText : sText
			};
		};
	}

	function getMethods(oController, oComponentUtils, oServices, oCommonUtils) {

		function fnEvaluateParameters(oParameters){
			var result = {};
			for (var prop in oParameters){
				var oParameterValue = oParameters[prop];

				if (typeof oParameterValue === "string"){
					result[prop] = oParameterValue;
				} else if (typeof oParameterValue === "object"){
					if (oParameterValue.value){
						result[prop] = fnEvaluateParameters(oParameterValue).value;
					} else {
						result[prop] = oParameterValue;
					}
				}
			}
			return result;
		}

		// TODO: Check
		// Fix for BCP 1770053414 where error message is displayed instead of error code
		function fnHandleError(oError) {
			if (oError instanceof sap.ui.generic.app.navigation.service.NavError) {
				if (oError.getErrorCode() === "NavigationHandler.isIntentSupported.notSupported") {
					sap.m.MessageBox.show(oCommonUtils.getText("ST_NAV_ERROR_NOT_AUTHORIZED_DESC"), {
						title: oCommonUtils.getText("ST_GENERIC_ERROR_TITLE")
					});
				} else {
					sap.m.MessageBox.show(oError.getErrorCode(), {
						title: oCommonUtils.getText("ST_GENERIC_ERROR_TITLE")
					});
				}
			}
		}

		function getActiveSibling() {
			var oContext = oController.getView().getBindingContext();
			return oServices.oApplication.getDraftSiblingPromise(oContext);
		}

        function storeObjectPageNavigationRelatedInformation(oEventSource) {
			var oRow = oEventSource;
			var iIdx = -1;
			var oTable = oCommonUtils.getOwnerControl(oEventSource);


			if (oTable.getTable) {
				oTable = oTable.getTable();
			}


			var bIsAnalyticalTbl = oCommonUtils.isAnalyticalTable(oTable);
			var iViewLevel = oComponentUtils.getViewLevel();
			var oPaginatorInformation;

			if (!bIsAnalyticalTbl) { // up/down navigation is not enabled in the analytical table scenario

				// get the table list binding now
				var oTableBindingInfo = oCommonUtils.getTableBindingInfo(oTable);
				var oListBinding = oTableBindingInfo && oTableBindingInfo.binding;
				var aCurrContexts = null;

				if (oListBinding) {
					//Getting context for Tree Table.
					if (oCommonUtils.isTreeTable(oTable)) {
						var oContextsLenght = (oListBinding.getLength() > 0 ) ? oListBinding.getLength() : 0;
						if (oContextsLenght > 0) {
							aCurrContexts = [];
							for (var index = 0; index < oContextsLenght; index++) {
								aCurrContexts.push(oListBinding.getContextByIndex(index));
							}
						}
					} else	if (oCommonUtils.isUiTable(oTable)) {
						// possibly a bug in the UI5 framework itself .. getCurrentContexts() only returns the contexts of selected rows in the table
						aCurrContexts = oListBinding.getContexts();
					} else if (oTable instanceof Table) {
						aCurrContexts = oListBinding.getCurrentContexts();
					}
				}


				var oContext = null;
				var aSelectedContexts = oCommonUtils.getSelectedContexts(oTable);
				var sSelectedBindingPath = null;

				if (aSelectedContexts && aSelectedContexts.length > 0) {
					sSelectedBindingPath = aSelectedContexts[0].getPath();
				} else if (oRow) {
						// When a row not selected explicitly - navigation using (list tab)/(row action)
						sSelectedBindingPath = oRow.getBindingContext() ? oRow.getBindingContext().sPath : null;
				}

				// get index of selected item
				if (oListBinding && oListBinding.getContexts && sSelectedBindingPath) {
					for (var i = 0; i < aCurrContexts.length; i++) {
						oContext = aCurrContexts[i];
						if (oContext && oContext.getPath() === sSelectedBindingPath) {
							iIdx = i;
							break;
						}
					}
				}

				if (oTable && iIdx !== -1 && aCurrContexts.length > 0) {
					var iThreshold;

					if (oTable instanceof Table) {
						iThreshold = oTable.getGrowingThreshold();
					} else if (oCommonUtils.isUiTable(oTable)) {
						iThreshold = oTable.getThreshold();
					} // in all other cases a default value for the threshold will be determined by PaginatorButtonHelper on demand



		            // Get navigation property.. to be used in construction of new URL
					// check if it is to be navigation using a nav property
					var sNavigationProperty = iViewLevel > 0 ? oCommonUtils.getTableBindingInfo(oTable).path : null;

					var fnNavigitionInfoProvider = function(oCtx){
						return {
							context: oCtx,
							navigationData: {
								navigationProperty: sNavigationProperty
							}
						};
					};

					oPaginatorInformation = aCurrContexts && {
						listBinding: oListBinding,
						growingThreshold: iThreshold,
						selectedRelativeIndex: iIdx,
						objectPageNavigationContexts: aCurrContexts,
						navigitionInfoProvider: fnNavigitionInfoProvider
					};
				}
			}
			oComponentUtils.setPaginatorInfo(oPaginatorInformation, true);
		}

		function onSmartFieldUrlPressed(oEvent, oState) {
			var sUrl = oEvent.getSource().getUrl();
			oEvent.preventDefault();
			//determination if Url is pointing externally, and only then open in a new window - not yet implemented
			//only then the data loss popup is needed when replacing the existing page
			oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
				sap.m.URLHelper.redirect(sUrl, false);
				}, jQuery.noop, oState);
		}

		function onBreadCrumbUrlPressed(oEvent, oState) {
			oEvent.preventDefault();
			/*Lokal - oEvent.getSource().getHref() returns #/STTA_C_SO_SalesOrder_ND('500000011')
			  HCP   - oEvent.getSource().getHref() returns #EPMSalesOrderND-manage_sttasond&//STTA_C_SO_SalesOrder_ND('500000011')
			  Techn - oEvent.getSource().getHref() returns #EPMProduct-manage_stta&/STTA_C_MP_Product(ProductDraftUUID=guid'00000000-0000-0000-0000-000000000000',ActiveProduct='HT-1001')/to_ProductText(ProductTextDraftUUID=guid'00000000-0000-0000-0000-000000000000',ActiveProduct='HT-1001',ActiveLanguage='ZH')*/
			var sHref = oEvent.getSource().getHref(); //return the hash that has been set during fnBindBreadcrumbs in OP controller
			oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
				window.location.hash = sHref; //also updates the browser history
				}, jQuery.noop, oState);
		}

		/**
		 * Return an instance of the DeleteConfirmation fragment
		 *
		 * @param {sap.m.Table} table
		 * @return {sap.m.Dialog} - returns the Delete Confirmation Dialog
		 * @private
		 */
		function getDeleteDialog(smartTable) {
			var aDraftPathsToBeDeleted = [];  //contains target of draft only
			return oCommonUtils.getDialogFragment("sap.suite.ui.generic.template.ListReport.view.fragments.DeleteConfirmation", {
				onCancel: function(oEvent) {
					var oDialog = oEvent.getSource().getParent();
					oDialog.close();
				},
				onDelete: function(oEvent) {
					var oDialog = oEvent.getSource().getParent();
					var oDialogModel = oDialog.getModel("delete");
					var aSelectedItems = oDialogModel.getProperty("/items");
					var aPathsToBeDeletedActive = []; // contains only active entities whose draft does not exist
					var aPathsToBeDeletedDraftActive = [];  // contains selected Drafts and all Active entities for fallback
					var aPathsToBeDeletedDActive = []; // contains active of draft entities
					aDraftPathsToBeDeleted = [];
					// determine which items to delete
					for (var i = 0; i < aSelectedItems.length; i++) {
						if (!aSelectedItems[i].draftStatus.locked && aSelectedItems[i].deletable) {
							if (!aSelectedItems[i].draftStatus.draft) {
								if (aSelectedItems[i].draftStatus.draftActive) {
									aPathsToBeDeletedDActive.push(aSelectedItems[i].context.sPath);
								} else if (aSelectedItems.length === oDialogModel.getProperty("/unsavedChangesItemsCount") || !aSelectedItems[i].draftStatus.unsavedChanges ||
									oDialogModel.getProperty("/checkboxSelected")) {
									aPathsToBeDeletedActive.push(aSelectedItems[i].context.sPath);
								}
							} else {
								aPathsToBeDeletedDraftActive.push(aSelectedItems[i].context.sPath);
								aDraftPathsToBeDeleted.push(aSelectedItems[i].context.sPath);
							}
						}
					}

					aPathsToBeDeletedDraftActive =  aPathsToBeDeletedDraftActive.concat(aPathsToBeDeletedActive).concat(aPathsToBeDeletedDActive);

					// delete
					var oDeletePromise = oServices.oCRUDManager.deleteEntities(aPathsToBeDeletedDraftActive);
					oComponentUtils.getBusyHelper().setBusy(oDeletePromise);
					oDeletePromise.then(
						function(aFailedPath) {
							//BCP 1780101314
							var iCountDeletedDraftTargetMatch = 0;
							var aFailedTargetPath = [];
							for (var i = 0; i < aFailedPath.length; i++) {
								//when property like unit of measure is included in the target property i.e. /EntityType(key='')/PropertyName
								aFailedTargetPath.push("/" + aFailedPath[i].split('/')[1]);
								if (aDraftPathsToBeDeleted.indexOf(aFailedTargetPath[i]) !== -1) {
									iCountDeletedDraftTargetMatch = iCountDeletedDraftTargetMatch + 1;
								}
							}
							// remove selections from the table and set the delete button to disabled
							var oTable = smartTable.getTable();
							oTable.getModel("_templPriv").setProperty("/listReport/deleteEnabled", false);
							var iSuccessfullyDeleted = aPathsToBeDeletedDraftActive.length - aPathsToBeDeletedDActive.length - (aFailedPath.length - iCountDeletedDraftTargetMatch);

							if ((aFailedPath.length - iCountDeletedDraftTargetMatch) > 0) {
								var sErrorMessage = "";
								if (iSuccessfullyDeleted > 0) {

									// successful delete
									sErrorMessage += (iSuccessfullyDeleted > 1) ?
										oCommonUtils.getText("ST_GENERIC_DELETE_SUCCESS_PLURAL_WITH_COUNT", [iSuccessfullyDeleted]) :
										oCommonUtils.getText("ST_GENERIC_DELETE_SUCCESS_WITH_COUNT", [iSuccessfullyDeleted]);

									// failed deletes
									sErrorMessage += "\n";
									sErrorMessage += (aFailedPath.length > 1) ?
										oCommonUtils.getText("ST_GENERIC_DELETE_ERROR_PLURAL_WITH_COUNT", [aFailedPath.length]) :
										oCommonUtils.getText("ST_GENERIC_DELETE_ERROR_WITH_COUNT", [aFailedPath.length]);

								} else {
									sErrorMessage = (aFailedPath.length > 1) ?
										oCommonUtils.getText("ST_GENERIC_DELETE_ERROR_PLURAL") :
										oCommonUtils.getText("ST_GENERIC_DELETE_ERROR");
								}

								MessageBox.error(sErrorMessage);

							} else {
								var sSuccessMessage = "";
								sSuccessMessage = (iSuccessfullyDeleted > 1) ?
									oCommonUtils.getText("ST_GENERIC_DELETE_SUCCESS_PLURAL") :
									oCommonUtils.getText("ST_GENERIC_OBJECT_DELETED");

								oServices.oApplication.showMessageToast(sSuccessMessage);
							}

							oCommonUtils.refreshSmartTable(smartTable);
						},
						// this could be a different message b/c the batch request has failed here
						// currently, delete is only possible all or nothing - just let error handling be done by busyHelper
						jQuery.noop);
					oDialog.close();
				}
			}, "delete");
		}

		/**
		 * Return the promise containing draft's sibling entity
		 *
		 * @param {String} sPath - contains path of the entity
		 * @param {object} oModel - contains oDataModel
		 * @return Promise
		 * @private
		 */

		function createDraftSiblingPromise(sPath, oModel) {
		    return new Promise(function(fnResolve, fnReject) {
		        oModel.read(sPath + "/SiblingEntity", {
		            success: function(oResponseData) {
		                var sActive = "/" + oModel.getKey(oResponseData);
		                fnResolve(sActive);
		            },
		            error: function(oError) {
		                var sError = "Error";
		                fnResolve(sError);
		            }
		        });
		    });
		}

		/**
		 * Return the data necessary for the Delete Confirmation Dialog
		 *
		 * @param [sap.m.ListItemBase] selectedItems
		 * @return {map} JSON map containing the data for the Delete Confirmation Dialog
		 * @private
		 */
		function getDataForDeleteDialog(selectedItems) {
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oEntitySet = oMetaModel.getODataEntitySet(oController.getOwnerComponent().getEntitySet());
			var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"];
			var sDeletablePath = (oDeleteRestrictions && oDeleteRestrictions.Deletable &&  oDeleteRestrictions.Deletable.Path) ? oDeleteRestrictions.Deletable.Path : "";

			var mJSONData = {
				items: undefined,
				itemsCount: selectedItems.length,
				text: {
					title: undefined,
					text: undefined,
					unsavedChanges: undefined,
					longText: undefined,
					undeletableText: undefined
				},
				lockedItemsCount: 0,
				unsavedChangesItemsCount: 0,
				undeletableCount: 0,
				checkboxSelected: true
			};

			// Enhance the items with their context and draft status. Also keep track of the number of locked and unsaved items
			// + Enhance with undeletable status and track number of undeletable items
			var aItems = [];
			var aActiveArray = []; // This array contains active entities of draft
			var oEntity, mDraftStatus, mActive, bDeletable, oActiveEntity;
			var aPromise = [];

			for (var i = 0; i < selectedItems.length; i++) {
				oEntity = oModel.getObject(selectedItems[i].getPath());
				if (!oEntity.IsActiveEntity) { // if the entity is not an active entity, we can assume it is a draft
					if (oEntity.HasActiveEntity) {
						aPromise.push(
							createDraftSiblingPromise(selectedItems[i].getPath(), oModel)
						);
					}
				}
			}
			var iActiveIterator = 0;

			return new Promise(function(fnResolve, fnReject) {
				Promise.all(aPromise).then(function(aResponses) {
					for (var i = 0; i < selectedItems.length; i++) {
						oEntity = oModel.getObject(selectedItems[i].getPath());
						mDraftStatus = {};
						mActive = {};
						bDeletable = true;
						oActiveEntity = {};

						if (!oEntity.IsActiveEntity) { // if the entity is not an active entity, we can assume it is a draft
							mDraftStatus.draft = true;

							if (oEntity.HasActiveEntity) {
								mActive.draft = false;
								mActive.draftActive = true;

								if (aResponses[iActiveIterator] != "Error") {
								    oActiveEntity["oModel"] = selectedItems[0].getModel();
								    oActiveEntity["sPath"] = aResponses[iActiveIterator++];
								}
							}
						} else if (oEntity.HasDraftEntity) { // if the entity is an active entity AND has a draft entity, we can assume someone else has a draft of the entity
							// check if first and last name are provided. If not then take technical user name
							var sNameLockedBy = oModel.getProperty("DraftAdministrativeData/CreatedByUserDescription", selectedItems[i]);
							var sLockedBy = oModel.getProperty("DraftAdministrativeData/InProcessByUser", selectedItems[i]);

							if (sLockedBy) { // if sLockedBy = '' --> unsavedChanges otherwise locked!
								mDraftStatus.locked = true;
								mDraftStatus.user = sNameLockedBy;
								mJSONData.lockedItemsCount++;
							} else { // else the entity has unsaved changes
								mDraftStatus.unsavedChanges = true;
								mDraftStatus.user = sNameLockedBy;
								mJSONData.unsavedChangesItemsCount++;
							}
						}

						if (sDeletablePath && sDeletablePath !== "") {
							if (oModel.getProperty(sDeletablePath, selectedItems[i]) === false) {
								bDeletable = false;
								mJSONData.undeletableCount++;
							}
						}

						aItems.push({
							context: selectedItems[i],
							draftStatus: mDraftStatus,
							deletable: bDeletable
						});

						// Pushing Active entities of Draft
						if (!oEntity.IsActiveEntity && oEntity.HasActiveEntity) {
							aActiveArray.push({
								context : oActiveEntity,
								draftStatus : mActive,
								deletable : bDeletable
							});
						}
					}

					if (aActiveArray.length > 0) {
						aItems = aItems.concat(aActiveArray);
					}
					mJSONData.items = aItems;

					// determine Dialog title
					if (mJSONData.lockedItemsCount === mJSONData.itemsCount) {
						mJSONData.text.title = oCommonUtils.getText("ST_GENERIC_ERROR_TITLE");
					} else {
						mJSONData.text.title = (mJSONData.itemsCount > 1) ?
							oCommonUtils.getText("ST_GENERIC_DELETE_TITLE_WITH_COUNT", [mJSONData.itemsCount]) :
							oCommonUtils.getText("ST_GENERIC_DELETE_TITLE");
					}

					// determine unsavedChanges Checkbox text
					mJSONData.text.unsavedChanges = oCommonUtils.getText("ST_GENERIC_UNSAVED_CHANGES_CHECKBOX");

					// determine short text
					if (mJSONData.itemsCount > 1) {
						if (mJSONData.lockedItemsCount === mJSONData.itemsCount) {
							mJSONData.text.text = oCommonUtils.getText("ST_GENERIC_DELETE_LOCKED_PLURAL");
						} else if (mJSONData.unsavedChangesItemsCount === mJSONData.itemsCount) {
							mJSONData.text.text = oCommonUtils.getText("ST_GENERIC_DELETE_UNSAVED_CHANGES_PLURAL");
						} else if (mJSONData.lockedItemsCount > 0) {
							var iRemainingItems = mJSONData.itemsCount - mJSONData.lockedItemsCount;
							// 1st part of message
							mJSONData.text.text = (mJSONData.lockedItemsCount > 1) ?
								oCommonUtils.getText("ST_GENERIC_CURRENTLY_LOCKED_PLURAL", [mJSONData.lockedItemsCount, mJSONData.itemsCount]) :
								oCommonUtils.getText("ST_GENERIC_CURRENTLY_LOCKED", [mJSONData.itemsCount]);

							mJSONData.text.text += "\n";
							// 2nd part of message
							if (iRemainingItems === mJSONData.unsavedChangesItemsCount) {
								mJSONData.text.text += (iRemainingItems > 1) ?
									oCommonUtils.getText("ST_GENERIC_DELETE_REMAINING_UNSAVED_CHANGES_PLURAL") :
									oCommonUtils.getText("ST_GENERIC_DELETE_REMAINING_UNSAVED_CHANGES");
							} else {
								mJSONData.text.text += (iRemainingItems > 1) ?
									oCommonUtils.getText("ST_GENERIC_DELETE_REMAINING_PLURAL", [iRemainingItems]) :
									oCommonUtils.getText("ST_GENERIC_DELETE_REMAINING");
							}
						} else {
							mJSONData.text.text = oCommonUtils.getText("ST_GENERIC_DELETE_SELECTED_PLURAL");
						}

						mJSONData.text.undeletableText = oCommonUtils.getText("ST_GENERIC_DELETE_UNDELETABLE", [mJSONData.undeletableCount, mJSONData.itemsCount]);
					} else {
						if (mJSONData.lockedItemsCount > 0) {
							mJSONData.text.text = oCommonUtils.getText("ST_GENERIC_DELETE_LOCKED", [" ", mJSONData.items[0].draftStatus.user]);
						} else if (mJSONData.unsavedChangesItemsCount > 0) {
							mJSONData.text.text = oCommonUtils.getText("ST_GENERIC_DELETE_UNSAVED_CHANGES", [" ", mJSONData.items[0].draftStatus.user]);
						} else {
							mJSONData.text.text = oCommonUtils.getText("ST_GENERIC_DELETE_SELECTED");
						}
					}

					fnResolve(mJSONData);
				});
			});
		}

		function fnBuildSelectionVariantForNavigation(oOutbound, oLineContext, oPageContext, sFilterBarSelectionVariant){
			var oNavigationHandler = oCommonUtils.getNavigationHandler();
			var oOutboundParametersEmpty = {};
			var oOutboundParameters = {};
			for (var prop in oOutbound.parameters){
				if (jQuery.isEmptyObject(oOutbound.parameters[prop])){
					oOutboundParametersEmpty[prop] = oOutbound.parameters[prop];
				} else {
					oOutboundParameters[prop] = oOutbound.parameters[prop];
				}
			}
			oOutboundParameters = fnEvaluateParameters(oOutboundParameters);
			oNavigationHandler.mixAttributesAndSelectionVariant({}, sFilterBarSelectionVariant).getParameterNames().forEach(
					function(prop) {delete oOutboundParametersEmpty[prop];});
			var oPageContextObject = oPageContext && oPageContext.getObject();
			var oLineContextObject = oLineContext && oLineContext.getObject ? oLineContext.getObject() :  oLineContext && oLineContext[0];
			var oMixedContextObject = jQuery.extend({}, oOutboundParametersEmpty, oPageContextObject, oLineContextObject, oOutboundParameters);
			return oNavigationHandler.mixAttributesAndSelectionVariant(oMixedContextObject, sFilterBarSelectionVariant);
		}

		function fnNavigateIntent(oOutbound, oContext, oSmartFilterBar, oSmartControl) {
			var oNavigationHandler = oCommonUtils.getNavigationHandler();
			var sSelectionVariant;
			if (oSmartFilterBar) {
				sSelectionVariant = oSmartFilterBar.getUiState().getSelectionVariant();
				if (typeof sSelectionVariant !== "string"){
					sSelectionVariant = JSON.stringify(sSelectionVariant);
				}
				//sSelectionVariant = oSmartFilterBar.getDataSuiteFormat();
			}
			var oSelectionVariant = fnBuildSelectionVariantForNavigation(oOutbound, oContext, oController.getView().getBindingContext(), sSelectionVariant);
			var oObjectInfo = {
					semanticObject: oOutbound.semanticObject,
					action: oOutbound.action
			};
			oController.adaptNavigationParameterExtension(oSelectionVariant, oObjectInfo);
			oNavigationHandler.navigate(oOutbound.semanticObject, oOutbound.action, oSelectionVariant.toJSONString(),
					null, fnHandleError);
			//null object has to be passed to the NavigationHandler as an
			//indicator that the state should not be overwritten
		}

		function fnNavigateIntentSmartLink(oOutbound) {
			var oNavigationHandler = oCommonUtils.getNavigationHandler();
			var oObjectInfo = {
				semanticObject: oOutbound.semanticObject,
				action: oOutbound.action
			};
			var oSelectionVariant = oNavigationHandler.mixAttributesAndSelectionVariant(oOutbound.semanticAttributes);
			oController.adaptNavigationParameterExtension(oSelectionVariant, oObjectInfo);
			oNavigationHandler.navigate(oOutbound.semanticObject, oOutbound.action, oSelectionVariant.toJSONString(), null, fnHandleError);
		}

		function fnHideTitleArea(oSmLiContent,aContactTitleArea) {
			//get title data
			var oIcon = oSmLiContent.byId("icon");	// oIcon can be undefined, since the icon is optional
			var sIcon = oIcon && oIcon.getSrc();
			if (sIcon === ""){ // can be undefined - to make a later comparism easier set it to undefined if the value is ""
				sIcon = undefined;
			}
			var oTitle = oSmLiContent.byId("title");
			var sTitle = oTitle && oTitle.getText();//oTitle must always be there
			if (sTitle === ""){ // can be undefined - to make a later comparism easier set it to undefined if the value is ""
				sTitle = undefined;
			}
			var oDescription = oSmLiContent.byId("description");
			var sDescription = oDescription && oDescription.getText(); //oDescription must always be there
			if (sDescription === ""){ // can be undefined - to make a later comparism easier set it to undefined if the value is ""
				sDescription = undefined;
			}

			//check against contacts
			for (var j = 0; j < aContactTitleArea.length; j++) {
				var oContactTitleArea = aContactTitleArea[j];
				var sContactTitleAreaIdIcon  = AnnotationHelper.getStableIdPartFromFacet(oContactTitleArea) + "::contactTitleAreaIcon";
				var oContactTitleAreaIdIcon = oSmLiContent.byId(sContactTitleAreaIdIcon); 				// can be undefined
				var sContactTitleAreaIdTitle  = AnnotationHelper.getStableIdPartFromFacet(oContactTitleArea) + "::contactTitleAreaTitle";
				var oContactTitleAreaIdTitle = oSmLiContent.byId(sContactTitleAreaIdTitle); 			// can be undefined
				var sContactTitleAreaIdDescription  = AnnotationHelper.getStableIdPartFromFacet(oContactTitleArea) + "::contactTitleAreaDescription";
				var oContactTitleAreaIdDescription = oSmLiContent.byId(sContactTitleAreaIdDescription); // can be undefined

				var sContactTitleAreaIcon = oContactTitleAreaIdIcon && oContactTitleAreaIdIcon.getSrc();
				if (sContactTitleAreaIcon === ""){ // can be undefined - to make a later comparism easier set it to undefined if the value is ""
					sContactTitleAreaIcon = undefined;
				}
				var sContactTitleAreaTitle = oContactTitleAreaIdTitle && oContactTitleAreaIdTitle.getText();
				if (sContactTitleAreaTitle === ""){ // can be undefined - to make a later comparism easier set it to undefined if the value is ""
					sContactTitleAreaTitle = undefined;
				}
				var sContactTitleAreaDescription = oContactTitleAreaIdDescription && oContactTitleAreaIdDescription.getText();
				if (sContactTitleAreaDescription === ""){ // can be undefined - to make a later comparism easier set it to undefined if the value is ""
					sContactTitleAreaDescription = undefined;
				}

				//only hide the title area in case of filled fields - issue with timing of the hide check, therefore only checking if filled
				if ( sIcon 			&& sContactTitleAreaIcon &&
					 sTitle 		&& sContactTitleAreaTitle &&
					 sDescription 	&& sContactTitleAreaDescription) {

					if ((sIcon === sContactTitleAreaIcon || !sContactTitleAreaIcon) &&
						(sTitle === sContactTitleAreaTitle || !sContactTitleAreaTitle) &&
						(sDescription === sContactTitleAreaDescription || !sContactTitleAreaDescription)) {
						var sContactTitleAreaId = AnnotationHelper.getStableIdPartFromFacet(oContactTitleArea) + "::contactTitleArea";
						var oContactTitleAreaId = oSmLiContent.byId(sContactTitleAreaId);
						if (oContactTitleAreaId && oContactTitleAreaId.setVisible) {
							oContactTitleAreaId.setVisible(false);
						}
						//below is the old way of doing it:
						/*oContactQuickViewPage.setDescription("ccc") is not possible since of 2 way binding, also other entries are updated
                          the QuickViewPage does not have property to hide only the header
                        var sContactQuickViewPageQueryId = "#" + oContactQuickViewPage.getId();
                        var oContactQuickViewPageQuery = jQuery(sContactQuickViewPageQueryId);
                        var oContactQuickViewPageQueryFirstChild = oContactQuickViewPageQuery && oContactQuickViewPageQuery.children() && oContactQuickViewPageQuery.children().first();
                        if (oContactQuickViewPageQueryFirstChild && oContactQuickViewPageQueryFirstChild.remove) {
                            oContactQuickViewPageQueryFirstChild.remove();
                        }*/
					}
				}
			}
		}

		function fnNavigateIntentManifest(oEventSource, oContext, oSmartFilterBar, oSmartChart) {
			var oManifestEntry = oController.getOwnerComponent().getAppComponent().getManifestEntry("sap.app");
			var oOutbound = oManifestEntry.crossNavigation.outbounds[oEventSource.data("CrossNavigation")];
			var oSmartControl;
			if (oSmartFilterBar) {
				// To navigate from new showdetails item for chart
				if (oCommonUtils.isSmartChart(oEventSource)){
					oSmartControl = oCommonUtils.getOwnerControl(oSmartChart) || oCommonUtils.getOwnerControl(oEventSource);
				} else {
					oSmartControl = oCommonUtils.getOwnerControl(oEventSource).getParent();
				}
			}
			fnNavigateIntent(oOutbound, oContext, oSmartFilterBar, oSmartControl);
		}

		function fnSemanticObjectLinkPopoverLinkPressed (oEvent, oState){
			//TODO: check if we need it ??? my Answer is NO.
			/*oEvent.preventDefault();
			var oTempEvent = jQuery.extend(true, {}, oEvent);
			oCommonUtils.processDataLossConfirmationIfNonDraft(function(){
				//retrigger the navigation, but how?
			}, jQuery.noop, oState, jQuery.noop, true);
			*/
		}

		function fnOnSemanticObjectLinkNavigationPressed(oEventSource, oEventParameters){
			oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
				var sSemanticObject = oEventSource.data('SemanticObject');
				var sAction = oEventSource.data('Action');
				var sSemanticAttributes = oEventSource.data('SemanticAttributes');
				if (sSemanticObject && sAction){
					var oOutbound = {
							semanticObject: sSemanticObject,
							action: sAction
					};
					if (sSemanticAttributes) {
						sSemanticAttributes = "{" + sSemanticAttributes + "}";
						oOutbound.semanticAttributes = JSON.parse(sSemanticAttributes);
					}
					fnNavigateIntentSmartLink(oOutbound);
				}
			}, jQuery.noop);
		}

		function fnOnSemanticObjectLinkNavigationTargetObtained(oEventSource, oEventParameters, oState, sTitle, oMainNavigation) {

			var sSourceClickedField = "";

			//var oClickedFieldProperty;
			var proceedWithClickedField = function(oReferentialConstraint){

				var aPropertyRef = oReferentialConstraint.dependent.propertyRef;
				var sClickedFieldId = oEventParameters.originalId;

				//this works for fields on the object header which have a view relative id, but not in tables
				var oControl = oController.getView().byId(sClickedFieldId);
				if (oControl && oControl.mProperties.fieldName){
					for (var oProperty in aPropertyRef) {
						if (aPropertyRef[oProperty].name === oControl.mProperties.fieldName) {
							sSourceClickedField = oControl.mProperties.fieldName;
							return true;
						}
					}
				}

				//table fields get an absolute id "__link0-__clone34" - then jQuery is used to retrieve this absolut id (jQuery doesn't work with "::" as in ::Field-sl)
				if (!oControl ){
					var oElement = jQuery( "#" + sClickedFieldId.replace( /(:|\.|\[|\]|,|=)/g, "\\$1" ) );
					if (oElement){
						oControl = oElement.control(0);
						if (oControl && oControl.mProperties.fieldName){
							for (var oProperty in aPropertyRef) {
								if (aPropertyRef[oProperty].name === oControl.mProperties.fieldName) {
									sSourceClickedField = oControl.mProperties.fieldName;
									return true;
								}
							}
						}
					}
				}
				return false;
			};

			var getTargetAnnotation = function() {
				/*  1.	Loop over all Navigation properties
					2.	Look into corresponding association
					3.	Look into referential constraint
					4.	If dependent role PropertyRef = property ==> success QuickView Facets from this entity type can be retrieved
				*/
				var oTargetAnnotation, oMetaModel, oEntitySet, oEntityType, oNavProp, oAssociationEnd, oTargetEntityType;
				oMetaModel = oEventSource.getModel().getMetaModel();
				oEntitySet = oMetaModel.getODataEntitySet(oEventSource.getEntitySet());
				oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

				if (!oEntityType || !oEntityType.navigationProperty){
					return;
				}

				for (var i = 0; i < oEntityType.navigationProperty.length; i++) {

					oNavProp = oEntityType.navigationProperty[i];
					if (oNavProp.name === "SiblingEntity" ||  oNavProp.name === "DraftAdministrativeData"){
						continue;
					}

					var sQualifiedName = oNavProp.relationship;
					var iSeparatorPos = sQualifiedName.lastIndexOf(".");
					var sNamespace = sQualifiedName.slice(0, iSeparatorPos);
					var sName = sQualifiedName.slice(iSeparatorPos + 1);
					var aSchemas = oMetaModel.getObject("/dataServices/schema");
					var oSchema;

					for (var j in aSchemas) {
						if (aSchemas[j].namespace === sNamespace) {
							oSchema = aSchemas[j];
							break;
						}
					}

					var aArray = oSchema.association;
					var oAssociation;

					for (var j in aArray) {
						if (aArray[j].name === sName) {
							oAssociation = aArray[j];
							break;
						}
					}

					var oReferentialConstraint = oAssociation.referentialConstraint;
					if (oReferentialConstraint && oReferentialConstraint.dependent && oReferentialConstraint.dependent.propertyRef) {
						var bProceed = proceedWithClickedField(oReferentialConstraint);
						if (bProceed){
							oAssociationEnd = oMetaModel.getODataAssociationEnd(oEntityType, oNavProp.name); //to_Supplier
							oTargetEntityType = oMetaModel.getODataEntityType(oAssociationEnd.type);

							var oEntityContainer = oMetaModel.getODataEntityContainer();
							var sTargetEntitySet = "";
							var sTargetEntityType = "";
							var sHeaderInfoPath = "";
							for (var j = 0; j < oEntityContainer.entitySet.length; j++) {
								var sTargetEntityTypeTemp = oTargetEntityType.entityType;
								if (!sTargetEntityTypeTemp){
									sTargetEntityTypeTemp = oTargetEntityType.namespace + "." + oTargetEntityType.name;
								}
								if (oEntityContainer.entitySet[j].entityType === sTargetEntityTypeTemp) {
									sTargetEntitySet =  oEntityContainer.entitySet[j].name;
									sTargetEntityType = oEntityContainer.entitySet[j].entityType;
									break;
								}
							}

							oTargetAnnotation = {
								navigation: 	oNavProp.name,
								entitySet:  	sTargetEntitySet,
								entityType: 	sTargetEntityType
							};

							if (oTargetEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"] && sTargetEntityType) {
								var sHeaderInfoPath = oMetaModel.getODataEntityType(sTargetEntityType, true) + "/com.sap.vocabularies.UI.v1.HeaderInfo";
								oTargetAnnotation.headerInfoPath = sHeaderInfoPath;
							}

							if (oTargetEntityType["com.sap.vocabularies.UI.v1.QuickViewFacets"] && sTargetEntityType) {
								var sODataQuickViewFacetPath = oMetaModel.getODataEntityType(sTargetEntityType, true) + "/com.sap.vocabularies.UI.v1.QuickViewFacets";
								oTargetAnnotation.quickViewFacetODataPath = sODataQuickViewFacetPath; // e.g. /dataServices/schema/0/entityType/23/com.sap.vocabularies.UI.v1.QuickViewFacets/0/
							}

							return oTargetAnnotation;
						}
					}
				}
				return oTargetAnnotation;
			};

			var oTargetAnnotation = getTargetAnnotation();

			var bQuickViewFacetAvailable = false;
			var bFieldGroupAvailable = false;
			var bContactAvailable = false;
			var aContactTitleArea = [];
			var oComponent = oController.getOwnerComponent();
			var oModel = oComponent.getModel();
			var oMetaModel = oModel.getMetaModel();
			if (oTargetAnnotation){
				if (oTargetAnnotation.quickViewFacetODataPath){
					var oQuickViewFacetBindingContext = oMetaModel.createBindingContext(oTargetAnnotation.quickViewFacetODataPath, true);
					var aQuickViewFacet = oQuickViewFacetBindingContext && oQuickViewFacetBindingContext.getModel().getObject(oQuickViewFacetBindingContext.getPath());
					if (aQuickViewFacet){
						bQuickViewFacetAvailable = true;
						for (var j = 0; j < aQuickViewFacet.length; j++) {
							var oQuickViewFacet = aQuickViewFacet[j];
							if (oQuickViewFacet && oQuickViewFacet.Target && oQuickViewFacet.Target.AnnotationPath) {
								if (oQuickViewFacet.Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.FieldGroup") > -1 ){
									bFieldGroupAvailable = true;
								} else if (oQuickViewFacet.Target.AnnotationPath.indexOf("com.sap.vocabularies.Communication.v1.Contact") > -1 ){
									bContactAvailable = true;
									aContactTitleArea.push(oQuickViewFacet);
								}
							}
						}
					}
				}
			}

			//only if the QuickViewFacet is available we show it AND we take over the CMP title area and if available show the contact
			if (bQuickViewFacetAvailable ){

				var oSourceEntitySet, oSourceEntityType;
				oSourceEntitySet = oMetaModel.getODataEntitySet(oEventSource.getEntitySet());
				oSourceEntityType = oMetaModel.getODataEntityType(oSourceEntitySet.entityType);

				/* --- NEW title area preparation
				   header info is expected for each entity type, if this is not filled  */
				var oHeaderInfoBindingContext = oTargetAnnotation.headerInfoPath && oMetaModel.createBindingContext(oTargetAnnotation.headerInfoPath, true);
				// set header title link if displayFactSheet is available
				var oMainNavigation = oEventParameters.mainNavigation; //for testing ownNavigation can be used if set
				var sSemanticObject = oEventParameters.semanticObject;
				var sAction, oMainNavigationIntent;
				if (sSemanticObject && oMainNavigation){
					//set target
					var sTarget = oMainNavigation.getTarget && oMainNavigation.getTarget() || "";
					//set navigation info
					var sKey = oMainNavigation.getKey && oMainNavigation.getKey();
					if (sKey){ //sKey = "EPMProduct-displayFactSheet"
						var aAction =  sKey.split(sSemanticObject + "-");
						sAction = aAction && aAction[1];
						if (sSemanticObject && sAction){
							oMainNavigationIntent = {
								"Target" : sTarget,
								"SemanticObject": sSemanticObject,
								"Action": sAction
							};
						}
						if (oEventParameters.semanticAttributes){
							oMainNavigationIntent.SemanticAttributes = oEventParameters.semanticAttributes;
							//limit the parameters that are transferred
							for (var i in oEventParameters.semanticAttributes){
								var sSemanticAttribute = oEventParameters.semanticAttributes[i];
								if (sSemanticAttribute.indexOf("{\"__deferred\":") > -1) {
									delete oMainNavigationIntent.SemanticAttributes[i];
								}
								if (sSemanticAttribute.indexOf("{\"__ref\":") > -1) {
									delete oMainNavigationIntent.SemanticAttributes[i];
								}
							}
							if (oMainNavigationIntent.SemanticAttributes) {
								var sTemp = JSON.stringify(oMainNavigationIntent.SemanticAttributes);
								if (sTemp && sTemp.length > 1) {
									oMainNavigationIntent.SemanticAttributes = sTemp.substring(1, sTemp.length - 1); //if a JSON object is passed it gets removed
								}
							}
						}
					}
				}
				// used to determine the header title
				var oSourceClickedField = oMetaModel.getODataProperty(oSourceEntityType, sSourceClickedField);

				/* --- QuickView Content area preparation */
				var aIgnoredFields = oEventSource && oEventSource.mProperties && oEventSource.mProperties.fieldSemanticObjectMap;

				var oQuickViewModel = new JSONModel({sourceClickedField:	oSourceClickedField,
													 sourceEntityType: 		oSourceEntityType,
													 //showTitleArea: 		true, 		//will always be shown if this coding is reached
													 //showQuickViewContent:true,		//will be shown if there is 1 fieldgroup, but nothing is shown if there is 0 fieldgroup
													 showFieldGroup:		bFieldGroupAvailable,
													 showContact:			bContactAvailable,
													 ignoredFields:  		aIgnoredFields,
													 navigationPath: 		oTargetAnnotation.navigation,
													 mainNavigation:	    oMainNavigationIntent});
				oQuickViewModel.setDefaultBindingMode("OneWay");

				var oSmartFormSimpleViewController;
				var oSmartFormSimpleViewControllerClass = Controller.extend("", {
					oState: oState,
					_templateEventHandlers: {
						onSemanticObjectLinkNavigationPressed : oController._templateEventHandlers.onSemanticObjectLinkNavigationPressed.bind(oController._templateEventHandlers),
						onDataFieldWithIntentBasedNavigation  : oController._templateEventHandlers.onDataFieldWithIntentBasedNavigation.bind(oController._templateEventHandlers)
					},
					onInit : function() {},
					onExit : function() {},
					onAfterRendering : function() {
						//it will first be rendered if the batch is done
						//this is also called if a popover is repeatedly opened and no batch is needed
						var oSmartFormSimpleView = this.oView;
						var oNavContainer = oSmartFormSimpleView.getParent().getParent().getParent(); //set to sap.ui.comp.navpopover.NavigationPopover
						oNavContainer.setBusy(false);
					}
				});
				oSmartFormSimpleViewController = new oSmartFormSimpleViewControllerClass();
				oSmartFormSimpleViewControllerClass.connectToView = oController.connectToView.bind(oSmartFormSimpleViewController);

				var oSmartFormSimpleView = sap.ui.view({
					async: true,
					preprocessors: {
						xml: {
							bindingContexts: {
								sourceEntitySet: oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(oEventSource.getEntitySet(), true)),
								entitySet: oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(oTargetAnnotation.entitySet, true)),
								header: oHeaderInfoBindingContext,
								facetCollection: oQuickViewFacetBindingContext
							},
							models: {
								sourceEntitySet: oMetaModel,
								entitySet: oMetaModel,
								header: oMetaModel,
								facetCollection: oMetaModel,
								quickView: oQuickViewModel,
								parameter: oComponentUtils.getParameterModelForTemplating()
							}
						}
					},
					controller: oSmartFormSimpleViewController,
					type: ViewType.XML,
					viewName: "sap.suite.ui.generic.template.fragments.QuickViewSmartForm",
					height: "100%"
				});

				/*take over the image */
				/* sMainNavigationId: 	with "" the header is be surpressed,
				 * oMainNavigation: 	with null the main navigation object will be removed.
				 * This will still show the CMP title area if there is an text arrangement */
				//oEventParameters.show("", null, undefined, oSmartFormSimpleView);

				/* sMainNavigationId: 	with undefined, the description is calculated using the binding context of a given source object (for example SmartLink control)
				 * oMainNavigation: 	with undefined the old object will remain.
				 * This will still show the CMP title area - this is needed especially in slow systems, since then the CMP title area will be shown until the FE title area is available */
				oEventParameters.show(undefined, undefined, undefined, oSmartFormSimpleView);

				//set the navcontainer to busy until everything is evaluated
				var fnBusy = function(oEvent) {
					var oSmLiContent = oEvent.getSource(); //content of the smart link popover
					if (oSmLiContent){
						var oNavContainer = oSmLiContent.getParent().getParent().getParent(); //set to sap.ui.comp.navpopover.NavigationPopover
						oNavContainer.setBusy(true);
						/* small enough to not show busy indicator if no time delay is there
						 * but not too big to show the busy indicator to late
						 * throttling OFF  - when it was set to 0 busy was shown shortly ==> flickers
						 * throttling GPRS - when set to 100 data is shown already
						 * */
						oNavContainer.setBusyIndicatorDelay(10);
					}
				};
				oSmartFormSimpleView.attachBeforeRendering(fnBusy.bind(this));

				// post processing after the navcontainer is rendered
				var fnChange = function(oEvent) {
					var oSmLiContent = oEvent.getSource(); //content of the smart link popover
					if (oSmLiContent){
						//handler is called one without content
						var oNewTitleArea = oSmLiContent.byId("ownTitleArea");
						if (oNewTitleArea){
							//set old title area to invisible if available - needed since double registering/calling of navigationTargetObtained can't be avoided
							var oSemOController = oSmLiContent.getParent();
							if (oSemOController && oSemOController.getItems){
								var oPossibleOldTitleArea = oSemOController.getItems() && oSemOController.getItems()[0]; //could also be quickview, if no old title area has been built
								if (oPossibleOldTitleArea &&
									oPossibleOldTitleArea != oSmLiContent){
									oPossibleOldTitleArea.setVisible(false);
								}
							}
						}
						if (bContactAvailable && aContactTitleArea && oNewTitleArea){
							/*if the oNewTitleArea is similar to the info showing in the Contacts
								title, decription and icon are similar to
								contact fn,    role   	and photo
							  then remove them */
							fnHideTitleArea(oSmLiContent,aContactTitleArea);
						}
					}
				};
				oSmartFormSimpleView.attachAfterRendering(fnChange.bind(this));
			} else {
				oEventParameters.show(sTitle, oMainNavigation, undefined, undefined);
			}
		}
		// Returns the values of Semantic Keys/ Technical Keys for the current Object Page.
		function getObjectPageParameters(oController, appComponent){
			var oViewBindingContext = oController.getView && oController.getView().getBindingContext();
			var oEntity = oViewBindingContext.getObject();
			var oMetaModel = oController.getOwnerComponent().getModel().getMetaModel();
			var oEntitySet = oMetaModel.getODataEntitySet(oController.getOwnerComponent().getEntitySet());
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			var aSemKey = oEntityType["com.sap.vocabularies.Common.v1.SemanticKey"];
			var oParam = {};
			// Adding Semantic Keys as parameters
			if (aSemKey && aSemKey.length > 0) {
				for (var j = 0; j < aSemKey.length; j++) {
					var sSemKey = aSemKey[j].PropertyPath;
					if (!oParam[sSemKey]) {
						oParam[sSemKey] = [];
						oParam[sSemKey].push(oEntity[sSemKey]);
					}
				}
			} else {
				// Add technical keys if semantic keys are not defined.
				for (var k in oEntityType.key.propertyRef) {
					var sObjKey = oEntityType.key.propertyRef[k].name;
					if (!oParam[sObjKey]) {
						oParam[sObjKey] = [];
						oParam[sObjKey].push(oEntity[sObjKey]);
					}
				}
			}
			return oParam;
		}

		// Returns the inline external navigation target (defined in sap.app.crossNavigation.outbounds) for a given table entity set if hideChevronForUnauthorizedExtNav flag is set to true
		function findOutboundTarget(aPages, i, sTableEntitySet, sNavigationProperty){
			// if navigationProperty is defined.
			if (aPages[i].entitySet == sTableEntitySet && sNavigationProperty === aPages[i].navigationProperty && aPages[i].navigation && aPages[i].navigation["display"] && (aPages[i].component && aPages[i].component.settings && aPages[i].component.settings.hideChevronForUnauthorizedExtNav === true)) {
				return aPages[i].navigation.display.target;
			} else if (aPages[i].entitySet == sTableEntitySet && aPages[i].navigation && aPages[i].navigation["display"] && (aPages[i].component && aPages[i].component.settings && aPages[i].component.settings.hideChevronForUnauthorizedExtNav === true)) { //if navigationProperty is not defined.
				return aPages[i].navigation.display.target;
			} else if (aPages[i].pages) {
				for (var j = 0; j < (aPages[i].pages.length); j++) {
					var sOutboundTarget = findOutboundTarget(aPages[i].pages, j, sTableEntitySet, sNavigationProperty);
					if (sOutboundTarget !== undefined && sOutboundTarget !== null) {
						return sOutboundTarget;
					}
				}
			}
		}

		// This function updates the chevron binding for inline external navigation in templPriv model for the corresponding table.
		//The binding depends on the result whether the external navigation is supported or not.
		function displayChevronIfExtNavigationSupported(oEvent){
			var oTable = oEvent.getSource().getTable();
			var sTableEntitySet = oEvent.getSource().getEntitySet();
			var sNavigationProperty = oEvent.getSource().getTableBindingPath();

			// CrossApplicationNavigation checks whether external navigation is supported or not.
			var oXApplNavigation = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService && sap.ushell.Container.getService("CrossApplicationNavigation");

			// browse through the manifest pages to check if the corresponding table has inline external navigation defined and hideChevronForUnauthorizedExtNav flag is set to true.
			var aPages = oController.getOwnerComponent().getAppComponent().getConfig().pages;
			var sOutboundTarget = findOutboundTarget(aPages, 0, sTableEntitySet, sNavigationProperty); // 0 passed to enable traversing of pages from the top.

			if (sOutboundTarget !== undefined && sOutboundTarget !== null && oXApplNavigation) {
				var oCrossApp = oController.getOwnerComponent().getAppComponent().getManifestEntry("sap.app").crossNavigation.outbounds[sOutboundTarget];
				if (oCrossApp) {
					var sSemanticObj = oCrossApp.semanticObject;
					var sAction = oCrossApp.action;
					var oPrivModel = oController.getView().getModel("_templPriv");
					var oSupportedIntents = oPrivModel.getProperty("/generic/supportedIntents/");
					var sPath = (sNavigationProperty === "") ? sTableEntitySet : sTableEntitySet + "::" + sNavigationProperty; // unique path for corresponding table in the oPrivModel
					var oTablePathProp = oPrivModel.getProperty("/generic/supportedIntents/" + sSemanticObj + "/" + sAction + "/" + sPath);
					if (!oTablePathProp) {
						// No existing information in the model for corresponding table.
						var oOutboundParameters = {},oParam;
						var appComponent = oController.getOwnerComponent().getAppComponent();
						// Parameters defined in manifest for external navigation.
						for (var prop in oCrossApp.parameters) {
							if (!jQuery.isEmptyObject(oCrossApp.parameters[prop])){
								oOutboundParameters[prop] = oCrossApp.parameters[prop];
							}
						}
						// Get Semantic Key/ Technical Key values to be sent as parameters for external navigation check in case of an Object Page table.
						if (oController.getMetadata().getName() === 'sap.suite.ui.generic.template.ObjectPage.view.Details') {
							oParam = getObjectPageParameters(oController, appComponent);
						}

						var oTarget = {
								semanticObject : sSemanticObj,
								action: sAction
						};
						var oNavParams = jQuery.extend({}, oParam, oOutboundParameters);
						var oNavArguments = {
								target : oTarget,
								params : oNavParams
						};
						var oSupportedPromise = oXApplNavigation.isNavigationSupported([oNavArguments], appComponent);
						oSupportedPromise.done(function(oTargets){
							var oSemObjProp = oPrivModel.getProperty("/generic/supportedIntents/" + sSemanticObj);
							// Update model as per the result.
							if (!oSemObjProp) {
								oSupportedIntents[sSemanticObj] = {};
								oSupportedIntents[sSemanticObj][sAction] = {};
								oSupportedIntents[sSemanticObj][sAction][sPath] = {
										"supported": oTargets[0].supported
								};
							} else if (!oSemObjProp[sAction]) {
								oSemObjProp[sAction] = {};
								oSemObjProp[sAction][sPath] = {
										"supported": oTargets[0].supported
								};
							} else {
								oSemObjProp[sAction][sPath] = {
										"supported": oTargets[0].supported
								};
							}
							oPrivModel.updateBindings();
							// In case of UI Table, set chevron visibility to true if the outbound target is supported.
							// In case of Responsive table, this step is not required as visibility is automatically handled by model binding.
							if (oTargets[0].supported && oCommonUtils.isUiTable(oTable)) {
								var rowActionTemplate = oTable.getRowActionTemplate();
								rowActionTemplate.getItems()[0].setVisible(true);	//There is only "navigation" defined in the row action items.
								oTable.setRowActionTemplate(rowActionTemplate);
							}
						});
					}
				}
			}
		}
		function onDataReceived(oEvent){
			// whenever new data has been received for a table, we have to check the enablement of the buttons in the corresponding toolbar
			// this should be also done when the user clicks another tab (otherwise, delete button will not get updated correctly)
			oCommonUtils.setEnabledToolbarButtons(oEvent.getSource());

			// FooterButtons should not dependent on table content
			// however, if this would be needed it could be achieved like this:
//			var oSmartTable = oEvent.getSource();
//			if (oSmartTable instanceof SmartTable){
//				oCommonUtils.setEnabledFooterButtons(oSmartTable);
//			}
			// SmartTable would have to be define in sap.ui.define

			// update model binding for chevron display in table in case of inline external navigation.
			displayChevronIfExtNavigationSupported(oEvent);
		}

		// callback for the onBeforeRebindTable event of a smart table
		// oEvent is the original event
		// oCallbaclks is an optional object which contains additional callbacks to be called.
		// Properties supported so far:
		// - determineSortOrder: a function that can be called to provide a given sort order
		// - ensureExtensionFields: a function that is called to enable extensions the possibility to add additional fields which should be part of the select clause
		//   a function fnEnsureSelectionPropertyFromExtension(oControllerExtension, sProperty) will be passed to this function.
		//   extensions might call fnEnsureSelectionPropertyFromExtension, identifying themselves via oControllerExtension and passing the property sProperty to be added.
		function onBeforeRebindTable(oEvent, oCallbacks) {
			// For line item actions, popin display must not have a label
			var oSmartTable = oEvent.getSource();
			var oTable = oSmartTable.getTable();
			var	bIsMTable = oCommonUtils.isMTable(oTable);

			if (bIsMTable) {
				var oColumns = oTable.getColumns();
				for (var iColumn = 0; iColumn < oColumns.length; iColumn++) {
					if (oColumns[iColumn].getCustomData()[0].getValue() && oColumns[iColumn].getCustomData()[0].getValue()["actionButton"] === "true") {
						oColumns[iColumn].setPopinDisplay("WithoutHeader");
					}
				}
			}
			// still open
			var oBindingParams = oEvent.getParameter("bindingParams");
			oBindingParams.parameters = oBindingParams.parameters || {};

			// WorkListLight search and personalization
			if (oSmartTable.data().allowSearchWorkListLight) {
				oBindingParams.parameters["custom"] = {
					"search": oEvent.getSource().data().searchString
				};
				oSmartTable.data("allowSearchWorkListLight", false);
				if (oEvent.getSource().data().searchString) {
					oBindingParams.parameters["custom"] = {
						"search": oEvent.getSource().data().searchString
					};
				}
			}

			var oSmartFilterBar = oController.byId(oSmartTable.getSmartFilterId());

			// TABLE TABS ONLY
			if (!oSmartFilterBar && oController.getMetadata().getName() === 'sap.suite.ui.generic.template.ListReport.view.ListReport') {
				oSmartFilterBar = oController.byId("listReportFilter");
			// adding of filters from SmartFilterbar has been moved to MultipleViewsHandler.js
				var sSearchValue = oSmartFilterBar.getBasicSearchValue();
				if (sSearchValue) {
					oBindingParams.parameters["custom"] = {
						"search": sSearchValue
					};
				}
			}
			// (END) TABLE TABS ONLY
			
			oCallbacks = oCallbacks || Object.create(null);
			oCallbacks.setBindingPath = oSmartTable.setTableBindingPath.bind(oSmartTable);
			oCallbacks.addNecessaryFields = function(aSelects, fnEnsureSelectionProperty, sEntitySet){                  
				if (aSelects.length > 0) {
					var oMetaModel = oSmartTable.getModel().getMetaModel();
					var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
	
					//needed for activating field control for DataField Annotation & when using the setting to add new columns
					var oProperty = {};
					var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
					for (var index = 0; index < aSelects.length; index++) {
						var sSelect = aSelects[index];
						if (sSelect){
							var oProperty = oMetaModel.getODataProperty(oEntityType, sSelect);
							if (oProperty && oProperty["com.sap.vocabularies.Common.v1.FieldControl"] && oProperty["com.sap.vocabularies.Common.v1.FieldControl"].Path){
								var sPropertyFieldControl = oProperty["com.sap.vocabularies.Common.v1.FieldControl"].Path;
								if (sPropertyFieldControl !== " ") {
									fnEnsureSelectionProperty(sPropertyFieldControl);
								}
							}
						}
					}
	
					// Make sure sorter text property in select and expand list for grouping selection where column is not visible
					if (bIsMTable) {
						var oSorter = oBindingParams.sorter[0];
						// Check if sorter is for Grouping
						if (oSorter && oSorter.vGroup) {
							var oSorterObject = modelHelper.getODataProperty(oMetaModel, oEntityType, oSorter.sPath);
							var sSorterText = oSorterObject["com.sap.vocabularies.Common.v1.Text"] && oSorterObject["com.sap.vocabularies.Common.v1.Text"].Path;
							fnEnsureSelectionProperty(sSorterText);
						}
					}
	
					// add deletable-path property
					var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"];
					fnEnsureSelectionProperty(oDeleteRestrictions && oDeleteRestrictions.Deletable && oDeleteRestrictions.Deletable.Path);
	
					// add updatable-path property as fix for incident 1770320335
					var oUpdateRestrictions = oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"];
					fnEnsureSelectionProperty(oUpdateRestrictions && oUpdateRestrictions.Updatable && oUpdateRestrictions.Updatable.Path);
	
					// add applicable-path properties for annotated actions
					var sFunctionImport,
						oFunctionImport;
					var oLineItem = oEntityType["com.sap.vocabularies.UI.v1.LineItem"] || [];
	
					//adding the criticality field to aSelect and oBindingParams if the LineItemCriticality annotation is defined for lineItem with/without qualifier
					var oLineItemCriticality = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					//getting the Criticality object.
					var oCriticalityAnnotation = oEntityType["com.sap.vocabularies.UI.v1.LineItem@com.sap.vocabularies.UI.v1.Criticality"];
					var aTableCustomData = oSmartTable.getCustomData();
					for (var x = 0; x < aTableCustomData.length; x++) {
						if (aTableCustomData[x].getKey() && aTableCustomData[x].getKey() === "lineItemQualifier") {
							var slineItemQualifier = aTableCustomData[x].getValue();
							if (slineItemQualifier) {
								oLineItemCriticality = oEntityType["com.sap.vocabularies.UI.v1.LineItem#" + slineItemQualifier];
								oCriticalityAnnotation = oEntityType["com.sap.vocabularies.UI.v1.LineItem#" + slineItemQualifier + "@com.sap.vocabularies.UI.v1.Criticality#" + slineItemQualifier];
								break;
							}
						}
					}
					
					fnEnsureSelectionProperty(oLineItemCriticality  && oCriticalityAnnotation && oCriticalityAnnotation.Path);
	
					for (var index = 0; index < oLineItem.length; index++) {
						if (oLineItem[index].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
							sFunctionImport = oMetaModel.getODataFunctionImport(oLineItem[index].Action.String, true);
							if (sFunctionImport) {   //else: break-out action, no backend data needed
								oFunctionImport = oMetaModel.getObject(sFunctionImport);
								if (oFunctionImport["sap:action-for"] !== " " && oFunctionImport["sap:applicable-path"] !== " ") {
									fnEnsureSelectionProperty(oFunctionImport["sap:applicable-path"]);
								}
							}
						}
						if (oLineItem[index].RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation" || oLineItem[index].RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath") {
							var oLineItemProperty, sRequestField;
							if (oLineItem[index].Value && oLineItem[index].Value.Path) {
								oLineItemProperty = oMetaModel.getODataProperty(oEntityType, oLineItem[index].Value.Path);
								if (oLineItemProperty) {
									sRequestField = oLineItemProperty["sap:text"] || (oLineItemProperty["com.sap.vocabularies.Common.v1.Text"] || "").Path || "";
								}
								if (!sRequestField) {
									sRequestField = oLineItem[index].Value.Path;
								}
								fnEnsureSelectionProperty(sRequestField);
							}
						}
											//handles chart annotation if in same entity type
						if (oLineItem[index].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
							if (oLineItem[index].Target && oLineItem[index].Target.AnnotationPath) {
								var sAnnotationPath = oLineItem[index].Target.AnnotationPath;
								var sChartQualifier = sAnnotationPath.split("@")[1];
								var oRequiredData = oEntityType[sChartQualifier];
								// checks and adds MeasureAttributes properties
								if (oRequiredData && oRequiredData.MeasureAttributes) {
									if (oRequiredData.MeasureAttributes[0] && oRequiredData.MeasureAttributes[0].DataPoint &&
										oRequiredData.MeasureAttributes[0].DataPoint.AnnotationPath) {
										var sDataPointQualifier = oRequiredData.MeasureAttributes[0].DataPoint.AnnotationPath.split("@")[1];
										var oRequiredDataPoint = oEntityType[sDataPointQualifier];
										if (oRequiredDataPoint) {
											for (var sDataPointProperty in oRequiredDataPoint) {
												fnEnsureSelectionProperty(oRequiredDataPoint[sDataPointProperty] && oRequiredDataPoint[sDataPointProperty].Path);
												// handles criticality calculation annotation
												if (sDataPointProperty === "CriticalityCalculation" && oRequiredDataPoint.CriticalityCalculation) {
													for (var criticalityProperty in oRequiredDataPoint.CriticalityCalculation) {
														fnEnsureSelectionProperty(oRequiredDataPoint.CriticalityCalculation[criticalityProperty].Path);
													}
												}
											}
										}
									}
								}
								// checks and adds Measures property
								fnEnsureSelectionProperty(oRequiredData && oRequiredData.Measures && oRequiredData.Measures[0] && oRequiredData.Measures[0].PropertyPath);
							}
						}
					}
					// add applicablePath properties for breakout actions
					var oBreakoutActions = oCommonUtils.getBreakoutActions(oSmartTable);
					for (var sAction in oBreakoutActions) {
						fnEnsureSelectionProperty(oBreakoutActions[sAction].requiresSelection && oBreakoutActions[sAction].applicablePath);
					}
				}
	
				// sortOrder Annotation of presentation variant - only relevant for sap.m.Table
				var aCustomData = oSmartTable.getCustomData();
				var oCustomData = {};
				for (var k = 0; k < aCustomData.length; k++) {
					oCustomData[aCustomData[k].getKey()] = aCustomData[k].getValue();
				}
				var oVariant = oSmartTable.fetchVariant();
				if (!oCustomData.TemplateSortOrder && oCallbacks && oCallbacks.determineSortOrder) {
					// if no sort order could be derived directly, maybe it is provided by a callback
					oCustomData.TemplateSortOrder = oCallbacks.determineSortOrder();
				}
				if ((!oVariant || !oVariant.sort) && bIsMTable && oCustomData.TemplateSortOrder) {
					var aSortOrder = oCustomData.TemplateSortOrder.split(", ");
					for (var j = 0; j < aSortOrder.length; j++) {
						var aSort = aSortOrder[j].split(" ");
						if (aSort.length > 1) {
							oBindingParams.sorter.push(new Sorter(aSort[0], aSort[1] === "true"));
						} else {
							oBindingParams.sorter.push(new Sorter(aSort[0]));
						}
					}
				}
	
				if (bIsMTable) {
					// Define grouping (wiki: SmartTable FAQs)
					oSorter = oBindingParams.sorter[0];
					// Check if sorter is for Grouping
					if (oSorter && oSorter.vGroup) {
						// Find column label of the column whose leading property in p13nData is the oSorter.sPath
						var oColumn = null;
						for (var i = 0; i < oColumns.length; i++) {
							if (oColumns[i].data("p13nData").leadingProperty === oSorter.sPath) {
							oColumn = oColumns[i];
							break;
							}
						}
	
						if (oColumn) {
							var sColumnLabel = oColumn.getHeader().getProperty("text");
							// Replace the Group function
							oSorter.fnGroup = fnGroupFunction(oSorter.sPath, sColumnLabel);
	
							var sAdditionalProperty = oColumn.data("p13nData").additionalProperty;
							fnEnsureSelectionProperty(sAdditionalProperty);
						}
					}
				}
	
				// add Draft Admin Data to expand if entity is Draft and Draft Root and has Draft Admin Data
				var oDraftContext = oServices.oDraftController.getDraftContext();
				if (oDraftContext.isDraftEnabled(sEntitySet) && oDraftContext.isDraftRoot(sEntitySet) && oDraftContext.hasDraftAdministrativeData(sEntitySet)) {
					if (aSelects.length > 0) {
						fnEnsureSelectionProperty("DraftAdministrativeData");
					}
				}
			};
			oCommonUtils.onBeforeRebindTableOrChart(oEvent, oCallbacks, oSmartFilterBar);
		}

		/**
		 * Navigation from table
		 * @param {sap.ui.base.EventProvider} oEventSource - The source of the triggered event
		 * @param {object} oState
		 */
		function onListNavigate(oEventSource, oState, oBindingContext) {
			oBindingContext = oBindingContext || oEventSource.getBindingContext();
			oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
				if (oEventSource.data("CrossNavigation")) {
					// intent based navigation
					fnNavigateIntentManifest(oEventSource, oBindingContext, oState.oSmartFilterbar);
					return;
				}
				// Get parent table from the event source
				var oTable = oCommonUtils.getOwnerControl(oEventSource);
				storeObjectPageNavigationRelatedInformation(oEventSource);
				oCommonUtils.navigateFromListItem(oBindingContext, oTable);
			}, jQuery.noop, oState);
		}

		// This is called, when the number of selected items is incorrect
		function fnShowMessageForInvalidNumberOfSelects(iCount){
			oServices.oApplication.performAfterSideEffectExecution(function(){ // wait until side-effects are finished (otherwise the app might be still busy)
				if (oServices.oApplication.getBusyHelper().isBusy()) {
					jQuery.sap.log.info("Ignore incorrect selection, since app is busy anyway");
					return; // avoid sending messages while app is busy
				}
				var sTextId = iCount ? "ST_GENERIC_MULTIPLE_ITEMS_SELECTED" : "ST_GENERIC_NO_ITEM_SELECTED";
				MessageBox.error(oCommonUtils.getText(sTextId), {
					styleClass: oCommonUtils.getContentDensityClass()
				});
			});
		}

		function onShowDetails(oEventSource, oState) {
			var oTable = oEventSource.getParent().getParent().getTable();
			var aContexts = oCommonUtils.getSelectedContexts(oTable);
			if (aContexts.length === 1) {
				oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
					//processing allowed
					if (oEventSource.data("CrossNavigation")){
						// intent based navigation
						fnNavigateIntentManifest(oEventSource, aContexts[0], oState.oSmartFilterbar);
						return;
					}
					// internal navigation
					storeObjectPageNavigationRelatedInformation(oEventSource);
					oCommonUtils.navigateFromListItem(aContexts[0], oTable);
				}, jQuery.noop, oState);
			} else { // show details only possible if exactly one entry is selected
				fnShowMessageForInvalidNumberOfSelects(aContexts.length);
			}
		}

		function onDataFieldWithNavigationPath(oEvent) {
			var sNavProperty, i, ilength;
			var oComponent = oController.getOwnerComponent(),
				aCustomData = oEvent.getSource().getCustomData(),
				sContentWidth = "10rem";

			if (aCustomData.length === 0) {
				return;
			}
			for (i = 0, ilength = aCustomData.length; i < ilength; i++ ) {
				if (aCustomData[i].getProperty("key") === "Target") {
					sNavProperty = aCustomData[i].getProperty("value");
					break;
				}
			}
			if (!sNavProperty) {
				MessageBox.show(oCommonUtils.getText("ST_GENERIC_ERROR_IN_NAVIGATION"), {
					icon: MessageBox.Icon.ERROR,
					title: oCommonUtils.getText("ST_ERROR"),
					actions: [sap.m.MessageBox.Action.CLOSE],
					horizontalScrolling: true,
					contentWidth: sContentWidth,
					details: oCommonUtils.getText("ST_GENERIC_ERROR_IN_NAVIGATION_PROPERTY_MISSING", ["DataFieldWithNavigationPath"])
				});
				return;
			}
			var oModel = oComponent.getModel(),
					oMetaModel = oModel.getMetaModel();

			//Source
			var sNavPathSource = oEvent.getSource().getBindingContext().getPath(),
				sSourceEntitySet = sNavPathSource.slice(1, sNavPathSource.indexOf("(")),
				oSourceEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sSourceEntitySet).entityType),
				j, bNavPropertyFound = false,
				jLength = oSourceEntityType.navigationProperty.length;
			for (j = 0; j < jLength; j++) {
				if (oSourceEntityType.navigationProperty[j].name === sNavProperty) {
					bNavPropertyFound = true;
					break;
				}
			}
			if (!bNavPropertyFound) {
				MessageBox.show(oCommonUtils.getText("ST_GENERIC_ERROR_IN_NAVIGATION"), {
					icon: MessageBox.Icon.ERROR,
					title: oCommonUtils.getText("ST_ERROR"),
					actions: [sap.m.MessageBox.Action.CLOSE],
					horizontalScrolling: true,
					contentWidth: sContentWidth,
					details: oCommonUtils.getText("ST_GENERIC_ERROR_NAVIGATION_PROPERTY_NOT_CORRECT", [sNavProperty, "DataFieldWithNavigationPath"])
				});
				return;
			}

			//Target
			var oAssociationEnd = oMetaModel.getODataAssociationEnd(oSourceEntityType, sNavProperty),
				oTargetEntityType = oMetaModel.getODataEntityType(oAssociationEnd.type),
				sTargetEntityType,
				sTargetEntitySet;
			if (oTargetEntityType) {
				sTargetEntityType = oTargetEntityType.namespace + "." + oTargetEntityType.name;
			}
			var aEntitySetContainer = oMetaModel.getODataEntityContainer().entitySet;
			for (i = 0, ilength = aEntitySetContainer.length; i < ilength; i++  ) {
				if (aEntitySetContainer[i].entityType === sTargetEntityType) {
					sTargetEntitySet = aEntitySetContainer[i].name;
					break;
				}
			}

			if (!sTargetEntitySet) {
				var sTEntityset = sTargetEntityType.split(".")[1];
				sTEntityset = sTEntityset.slice(0, sTEntityset.length - 4);
				MessageBox.show(oCommonUtils.getText("ST_GENERIC_ERROR_IN_NAVIGATION"), {
					icon: MessageBox.Icon.ERROR,
					title: oCommonUtils.getText("ST_ERROR"),
					actions: [sap.m.MessageBox.Action.CLOSE],
					horizontalScrolling: true,
					contentWidth: sContentWidth,
					details: oCommonUtils.getText("ST_NAV_ERROR_TARGET_ENTITYSET_IS_MISSING",[sTEntityset])
				});
				return;
			}
			var aKeys = oCommonUtils.getNavigationKeyProperties(sTargetEntitySet),
				oNavigationController = oServices.oNavigationController,
				oUrlParameters = {
					"$expand": ""
				};

			if (oComponentUtils.isDraftEnabled()) {
				oUrlParameters = {
						"$expand": "DraftAdministrativeData"
				};
			}
//			function fnReadNavigationSource(sNavPathSource, sNavProperty, oUrlParameters, oNavigationController, aKeys, iLevel) {
			var oPromise = new Promise(function(fnResolve, fnReject) {
					oModel.read(sNavPathSource + "/" + sNavProperty , {
						urlParameters: oUrlParameters,
						success: function(oResponse) {
							fnResolve(oResponse);
							oServices.oApplication.invalidatePaginatorInfo();
							var sRoute = oCommonUtils.mergeNavigationKeyPropertiesWithValues(aKeys, oResponse);
							oServices.oApplication.setStoredTargetLayoutToFullscreen(1);
							oNavigationController.navigateToContext(sRoute, null, false);
						},
						error: function(oReject) {
							fnReject(oReject);
						}
					});

				});
//			}
			oComponentUtils.getBusyHelper().setBusy(oPromise);
		}

		/*
		 * Intent based navigation triggered from table toolbar
		 * This handles multi context and single context navigation.
		 * 1. Single Context navigation: navigates directly with the single context.
		 * 2. Multi Context navigation:
		 *    a) The intent shall have "multivaue" as one of its sap-tags, to support multi context navigation.
		 *       Multiselect navigation support by target application is found by using
		 *       sap.ushell.Container.getService("CrossApplicationNavigation").getLinks(), then tags can be extracted from returned value.
		 *    b) When navigation with multiple selections in the table is done, the multiple contexts are merged to single selection variant
		 *       navigation is done.
		 * @param {sap.ui.base.Event} oEvent - The triggered event with parameters
		 * @param {object} oState
		 */
		function onDataFieldForIntentBasedNavigation(oEvent, oState) {
			var oEventSource = oEvent.getSource();
			var sAction = oEventSource.data("Action"), sSemanticObject = oEventSource.data("SemanticObject");
			var oControl = oCommonUtils.getOwnerControl(oEventSource);
			var aContexts = oCommonUtils.getSelectedContexts(oControl);

			var oOutbound = {
					action: sAction,
					semanticObject:	sSemanticObject
			};
			if (aContexts.length <= 1) {
				// Single context navigation
				oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
					fnNavigateIntent(oOutbound, aContexts[0], oState.oSmartFilterbar || undefined, oState.oSmartTable || undefined);
				}, jQuery.noop, oState);
			} else {
				// Multiple Context navigation
				var oNavigationHandler = oCommonUtils.getNavigationHandler();
				var bMultiSelect = oEventSource.data("fe_multiValue");

				// Navigate with multiContext
				var fnHandleMultiContextIBN = function() {
					var oSmartFilterbarVariant = oState.oSmartFilterbar.getUiState().getSelectionVariant();
					var oMultiContext = fnMergeContextObjects(aContexts, oSmartFilterbarVariant);
					oNavigationHandler.navigate(oOutbound.semanticObject, oOutbound.action, oMultiContext.toJSONString(),
						null, fnHandleError);
					return;
				};

				if (bMultiSelect === null) {
					// Check if multi context is supported
					var oXApplNavigation = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService && sap.ushell.Container.getService("CrossApplicationNavigation");
					oOutbound.tags = ["fe_multiValue"];
					oXApplNavigation.getLinks(oOutbound).then(function(aIntents) {
						// To extract Intent
						var oIntent = aIntents[0];
						if (oIntent) {
							oEventSource.data("fe_multiValue", true);
							oCommonUtils.processDataLossConfirmationIfNonDraft(fnHandleMultiContextIBN, jQuery.noop, oState);
						} else {
							oEventSource.data("fe_multiValue", false);
							fnShowMessageForInvalidNumberOfSelects(aContexts.length);
						}
					});
				} else if (bMultiSelect === true) {
					// Navigate with multiContext
					oCommonUtils.processDataLossConfirmationIfNonDraft(fnHandleMultiContextIBN, jQuery.noop, oState);
				} else {
					// When multi context not supported throw pop-up
					fnShowMessageForInvalidNumberOfSelects(aContexts.length);
				}
			}
		}

		// this function adds all the visible fields of the selected rows to the selection variant
		function fnMergeContextObjects(aContexts, oSmartFilterbarVariant) {
			var oSelectionVariant = new SelectionVariant(oSmartFilterbarVariant);
			for (var index in aContexts) {
				var oContext = aContexts[index].getObject(aContexts[index].sPath);
				for (var count in oContext) {
					if (oContext[count]) {
						if (typeof oContext[count] !== "object") {
							oSelectionVariant.addSelectOption(count, "I", "EQ", oContext[count].toString());
						} else {
							oSelectionVariant.addSelectOption(count, "I", "EQ", JSON.stringify(oContext[count]));
						}
					}
				}
			}
			return oSelectionVariant;
		}

		function onDataFieldWithIntentBasedNavigation(oEvent, oState) {
			var oEventSource = oEvent.getSource();
			var oContext = oEventSource.getParent().getBindingContext();
			var sSemanticObject = oEventSource.data("SemanticObject");
			var sAction = oEventSource.data("Action");

			oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
				var oOutbound = {
						action: sAction,
						semanticObject:	sSemanticObject
				};
				fnNavigateIntent(oOutbound, oContext, oState.oSmartFilterbar || undefined, oState.oSmartTable || undefined);
			}, jQuery.noop, oState);
		}

		function onDataFieldForIntentBasedNavigationSelectedContext(oContext, oCustomData, oState) {
			oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
				var oOutbound = {
						action: oCustomData.Action,
						semanticObject:	oCustomData.SemanticObject
				};
				fnNavigateIntent(oOutbound, oContext, oState.oSmartFilterbar, oState.oSmartTable);
			}, jQuery.noop, oState);
		}

		/**
		 * Called from Determining Button belonging to Table and Chart Annotation of type DataFieldForIntentBasedNavigation
		 * @param {object} oButton the button the event was called on
		 * @param {object} oContextContainer the control hosting the selected contexts
		 * @param {object} oState additional state object
		 */
		function onDeterminingDataFieldForIntentBasedNavigation(oButton, oContextContainer, oState) {
			var oCustomData = oCommonUtils.getElementCustomData(oButton);
			var aContexts = oCommonUtils.getSelectedContexts(oContextContainer);
			var bRequiresContext = !(oCustomData.RequiresContext && oCustomData.RequiresContext === "false");
			if (bRequiresContext && aContexts.length !== 1){ // not consistent, since exactly one context must be given
				fnShowMessageForInvalidNumberOfSelects(aContexts.length);
			} else {
				var oContext = bRequiresContext ? aContexts[0] : null;
				onDataFieldForIntentBasedNavigationSelectedContext(oContext, oCustomData, oState);
			}
		}

		function onInlineDataFieldForIntentBasedNavigation(oEventSource, oState){
			oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
				var oOutbound = {
						semanticObject: oEventSource.data("SemanticObject"),
						action: oEventSource.data("Action")
				};
				var oContext = oEventSource.getParent().getBindingContext();
				fnNavigateIntent(oOutbound, oContext, oState.oSmartFilterbar, oState.oSmartTable);
			}, jQuery.noop, oState);
		}

		function onInlineDataFieldForAction(oEvent, oState) {
			var oEventSource = oEvent.getSource();
			var oTable = oCommonUtils.getOwnerControl(oEventSource).getParent();
			var aContexts = [oEventSource.getBindingContext()];
			var oCustomData = oCommonUtils.getElementCustomData(oEventSource);
			var sTableBindingPath = oTable.getTableBindingPath();
			oCommonUtils.triggerAction(aContexts, sTableBindingPath, oCustomData, oTable, oState);
		}

		/* Called from Determining Button belonging to Table's Annotation of type DataFieldForAction
		 * @param {object} oEvent
		 * @param {object} optional: the table the determining action belongs to. If not set, the whole view is taken.
		 */
		function onDeterminingDataFieldForAction(oEvent, oTable) {
			var oView = oController.getView();
			var aContexts = oTable ? oCommonUtils.getSelectedContexts(oTable) : [oView.getBindingContext()];
			if (aContexts.length === 0) { // determining actions must always have something to refer to
				fnShowMessageForInvalidNumberOfSelects(aContexts.length);
			} else {
				var oEventSource = oEvent.getSource();
				var oCustomData = oCommonUtils.getElementCustomData(oEventSource);
				var sTableBindingPath = oTable ? oTable.getTableBindingPath() : oView.getBindingPath();
				oCommonUtils.triggerAction(aContexts, sTableBindingPath, oCustomData, oTable);
			}
		}

		/**
		 * Action triggered from Control's toolbar
		 * @param {sap.ui.base.Event} oEvent - the triggered event (most likely a 'click')
		 * @param {object} oState
		 */
		function onCallActionFromToolBar(oEvent, oState) {
			var oSourceControl, sBindingPath = "";
			var oControl = oCommonUtils.getOwnerControl(oEvent.getSource());
			var oCustomData = oEvent.getSource().data();
			var aContexts = oCommonUtils.getSelectedContexts(oControl);

			if (oCommonUtils.isSmartTable(oControl)) {
				oSourceControl = oControl.getTable();
				sBindingPath = oControl.getTableBindingPath();

			} else if (oCommonUtils.isSmartChart(oControl)) {
				oSourceControl = oControl.getChart();
				sBindingPath = oControl.getChartBindingPath();
			}

			var mJSONData = getDataforActionDialog(aContexts,oCustomData);
			//when Table is Multi Select and few of the selected items are not applicable for action
			if (mJSONData.inApplicableCount > 0 && (oCommonUtils.isSmartTable(oControl) && ((oSourceControl.getMode && oSourceControl.getMode() === "MultiSelect") ||
					(oSourceControl.getSelectionMode && oSourceControl.getSelectionMode() === "MultiToggle")))) {
				var warningText = oCommonUtils.getText("ST_GENERIC_WARNING_TEXT", [mJSONData.inApplicableCount]);
				mJSONData.warningText = warningText;
				var mJSONActionData = {
						functionImportPath: oCustomData.Action,
						contexts: mJSONData.aApplicableContexts,
						sourceControl: oSourceControl,
						label: oCustomData.Label,
						operationGrouping: oCustomData.InvocationGrouping,
						navigationProperty: "",
						sBindingPath: sBindingPath,
						oState: oState
				};
				var oActionDialog = getActionDialog(oControl);
				var oActionDialogModel = oActionDialog.getModel("Action");
				oActionDialogModel.setData(mJSONActionData);

				var oListModel = new sap.ui.model.json.JSONModel(mJSONData);
				oActionDialog.setModel(oListModel, "list");

				var oActionDialogListModel = oActionDialog.getModel("list");
				oActionDialogListModel.setData(mJSONData);

				oActionDialog.open();
			} else {
				//When all the selected items are applicable for action
				CRUDManagerCallAction({
					functionImportPath: oCustomData.Action,
					contexts: aContexts,
					sourceControl: oSourceControl,
					label: oCustomData.Label,
					operationGrouping: oCustomData.InvocationGrouping,
					navigationProperty: ""
				}, oState, sBindingPath);
			}
		}

		/**
		 * Return an instance of the ActionConfirmation fragment
		 *
		 * @param {sap.m.Table} table
		 * @return {sap.m.Dialog} - returns the Delete Confirmation Dialog
		 * @private
		 */
		function getActionDialog(oControl){
			return oCommonUtils.getDialogFragment("sap.suite.ui.generic.template.fragments.ActionConfirmation", {
				onCancel: function(oEvent) {
					var oDialog = oEvent.getSource().getParent();
					oDialog.close();
				},
				onContinue: function(oEvent){
					var oDialog = oEvent.getSource().getParent();
					var jsonActionData = oEvent.getSource().getParent().getModel("Action").getData();

					CRUDManagerCallAction({
						functionImportPath: jsonActionData.functionImportPath,
						contexts: jsonActionData.contexts,
						sourceControl: jsonActionData.sourceControl,
						label: jsonActionData.label,
						operationGrouping: jsonActionData.operationGrouping,
						navigationProperty: jsonActionData.navigationProperty
					}, jsonActionData.oState, jsonActionData.sBindingPath);
					oDialog.close();
				}
			}, "Action" );
		}

		/**
		 * Return the data necessary for the Action Confirmation Dialog
		 *
		 * @param [array] aContexts - Array of selected Items
		 * @param {object} oCustomData - Object containing the information about the action like label and action information
		 * @return {map} JSON map containing the data for the Action Confirmation Dialog
		 * @private
		 */

		function getDataforActionDialog(aContexts, oCustomData) {
			var oEntity, bActionName, sEntitySet, isValidEntitySet;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			if (aContexts && aContexts.length > 0) {
				sEntitySet = aContexts[0].sPath.substring(1, aContexts[0].sPath.indexOf('('));
				isValidEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
			}
			if (isValidEntitySet){
				var aFunctionImport = oCustomData.Action.split("/")[1]; //getting the Function Import name
				var aItems = [], aValidContexts = [];
				var mJSONData = {
						aInApplicableItems: undefined,
						inApplicableCount: 0,
						dialogTitle: oCustomData.Label,
						warningText: undefined,
						aApplicableContexts: undefined
					};
				if (aFunctionImport) {
					//getting action property name as it is in Entity Type in metadata
					bActionName = oMetaModel.getODataFunctionImport(aFunctionImport)["sap:applicable-path"];
				}
				for (var i = 0; i < aContexts.length; i++) {
					oEntity = oModel.getObject(aContexts[i].getPath());
					if (!oEntity[bActionName]) {
						mJSONData.inApplicableCount++;
						//getting HeaderInfo Title value
						var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
						var title = oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path;
						aItems.push({
							sKey: oEntity[title]
						});
					} else {
						aValidContexts.push(aContexts[i]);
					}
				}
				mJSONData.aInApplicableItems = aItems;
				mJSONData.aApplicableContexts = aValidContexts;
			}
			return mJSONData;
		}

		/**
		 * Call the CRUDManager callAction method
		 * @param {map} mParams - a map containing the parameters for the CRUDManager callAction method
		 * @param {object} oState
		 * @param {string} sBindingPath - the control's binding path
		 * @private
		 */
		function CRUDManagerCallAction(mParams, oState, sBindingPath) {
			var oResponse;

			// only for oCustomData.Type === "com.sap.vocabularies.UI.v1.DataFieldForAction"
			// DataFieldForIntentBasedNavigation separated within ToolbarButton.fragment, uses other event handler
			// NO ITEM SELECTED: supported - if selection is required then button will be disabled via applicable-path otherwise the button will always be enabled
			// ONE ITEM SELECTED: supported
			// MULTIPLE ITEMS SELECTED: supported
			oCommonUtils.processDataLossConfirmationIfNonDraft(function() {
				//processing allowed
				// TODO check Denver implementation
				oServices.oCRUDManager.callAction({
					functionImportPath: mParams.functionImportPath,
					contexts: mParams.contexts,
					sourceControl: mParams.sourceControl,
					label: mParams.label,
					operationGrouping: mParams.operationGrouping,
					navigationProperty: mParams.navigationProperty
				}, oState).then(function(aResponses) {
					if (aResponses && aResponses.length && aResponses.length === 1) {
						oResponse = aResponses[0];

						if (oResponse.response && oResponse.response.context && (!oResponse.actionContext || oResponse.actionContext && oResponse.response
								.context.getPath() !== oResponse.actionContext.getPath())) {
							//Delaying the content call of the component that triggered the action as it is not needed immediately as we have already navigated to the other component.
							//We set the calling component to dirty which will trigger the refresh of the content once it is activated again.
							oServices.oApplication.getBusyHelper().getUnbusy().then(oServices.oViewDependencyHelper.setMeToDirty.bind(null, oController.getOwnerComponent(), sBindingPath));
						}
					}
				});
			}, jQuery.noop, oState, "Proceed");
		}

		var bIsDiscardDraftPopoverActive; // This variable (and its use) is necessary until BLI 3459 is solved
        var fnCurrentDiscardDraft; // Needed to store fnDiscardDraft in a global variable
		function getDiscardDraftPopover(fnDiscardDraft) {
			bIsDiscardDraftPopoverActive = true;
			fnCurrentDiscardDraft = fnDiscardDraft; // move variable to more global scope
			var oDraftPopover = oCommonUtils.getDialogFragment("sap.suite.ui.generic.template.fragments.DiscardDraftPopover", {
				onDiscardConfirm: function() {
					jQuery.sap.log.info("Draft cancellation confirmed");
					if (!bIsDiscardDraftPopoverActive) {
						jQuery.sap.log.info("Draft popover no longer active -> Ignore.");
						return;
					}
					fnCurrentDiscardDraft();
				}
			}, "discard");
			return oDraftPopover;
		}

		function fnDiscardDraftImpl(oActiveSiblingPromise, fnFinally){
			var oPromise = new Promise(function(fnResolve, fnReject){
				oActiveSiblingPromise.then(function(oActive) {
					jQuery.sap.log.info("Active information for current draft has been read. Start discarding the draft");
					var oActiveObject = oActive && oActive.getObject();
					var bIsActiveEntity = oActiveObject && oActiveObject.IsActiveEntity;
					var oTargetPromise = bIsActiveEntity ? oServices.oApplication.getTargetAfterCancelPromise(oActive) : Promise.resolve();
					oTargetPromise.then(function(vTarget){ // vTarget will be undefined when create draft is discarded; either a context or context path
						var oDiscardPromise = oServices.oCRUDManager.deleteEntity(false, true);
						if (!vTarget){ // create Draft case
							oServices.oApplication.prepareDeletionOfCreateDraft(oDiscardPromise);
						}
						oDiscardPromise.then(function() {
							jQuery.sap.log.info("Draft was discarded successfully");
							fnFinally();
							oServices.oViewDependencyHelper.setRootPageToDirty();
							oServices.oViewDependencyHelper.unbindChildren(oController.getOwnerComponent());
							// Draft discard is a kind of cross navigation -> invalidate paginator info
							oServices.oApplication.invalidatePaginatorInfo();
							if (vTarget) {
								jQuery.sap.log.info("Navigate to active entityy");
								oServices.oNavigationController.navigateToContext(vTarget, null, true, 1);
							}
							fnResolve();
						}, fnReject);
					}, fnReject);
				}, fnReject);
			});
			var oEvent = {
				discardPromise: oPromise
			};
			oComponentUtils.fire(oController, "AfterCancel", oEvent);
			oServices.oApplication.getBusyHelper().setBusy(oPromise);
			oPromise.catch(fnFinally);
			return oPromise;
		}

		function onDiscardDraft(oEvent) {
			var oActiveSiblingPromise = getActiveSibling();
			oServices.oApplication.performAfterSideEffectExecution(function(){
				if (oServices.oApplication.getBusyHelper().isBusy()) {
					jQuery.sap.log.info("Ignore discarding confirmation as app is already busy");
					return; // avoid firing the AfterCancel-event in this case
				}
				var oContext = oController.getView().getBindingContext();
				var oEntity = oContext.getObject();
				var bIsCreateDraft = oEntity.hasOwnProperty("HasActiveEntity") && !oContext.getProperty("IsActiveEntity") && !oContext.getProperty(
					"HasActiveEntity");
				var sPath = oContext && oContext.getPath();

				var bIsDraftModified = oServices.oApplication.getIsDraftModified(sPath);
				if (bIsDraftModified){ // if the user has done any changes to the draft, a confirmation popover is displayed
					var oSource = oEvent.getSource();
					var oDiscardPopover;
					var fnFinally = function(){
						bIsDiscardDraftPopoverActive = false;
						oDiscardPopover.close();
						jQuery.sap.log.info("Draft popover closed");
					};
					oDiscardPopover = getDiscardDraftPopover(fnDiscardDraftImpl.bind(null, oActiveSiblingPromise, fnFinally));
					var oDiscardModel = oDiscardPopover.getModel("discard");
					oDiscardModel.setProperty("/placement", sap.m.PlacementType.Top);
					oDiscardModel.setProperty("/isCreateDraft", bIsCreateDraft);
					oDiscardPopover.openBy(oSource); // further execution will be performed by the event handler of this popover
				} else { // the user wants to cancel a draft he has not edited at all -> execute immeadiately (no confirmation required)
					fnDiscardDraftImpl(oActiveSiblingPromise, jQuery.noop);
				}
			});
		}

		// Performs a draft discard without asking the user. This is exposed via extensionAPI.
		function fnDiscardDraftWithoutDialog(){
			if (oComponentUtils.getViewLevel() !== 1 || !oComponentUtils.isDraftEnabled()){
				jQuery.sap.log.warning("Discard draft only possible on root level of draft enabled entities");
				return Promise.reject();
			}
			var oComponent = oController.getOwnerComponent();
			if (!(oComponentUtils.isComponentActive() && oComponent.getModel("ui").getProperty("/editable"))){
				jQuery.sap.log.warning("Discard draft only possible in edit mode");
				return Promise.reject();
			}
			var oActiveSiblingPromise = getActiveSibling();
			return fnDiscardDraftImpl(oActiveSiblingPromise, jQuery.noop);
		}

		function addEntry(oEventSource, bSuppressNavigation, oSmartFilterBar, oPredefinedValues) {
			if (oEventSource.data("CrossNavigation")) {
				// intent based navigation
				fnNavigateIntentManifest(oEventSource, oEventSource.getBindingContext(), oSmartFilterBar);
				return new Promise(function(resolve) {
					resolve();
				});
			}

			var oTable = oCommonUtils.getOwnerControl(oEventSource);
			var sTablePath = oTable.getTableBindingPath();
			var oComponent = oController.getOwnerComponent();

			var fnCRUDManagerCall = function(oPredefined){
				var oRet = oServices.oCRUDManager.addEntry(oTable, oPredefined).then(
					function(oTargetInfo) {
						if (!bSuppressNavigation) {
							oServices.oNavigationController.navigateToContext(oTargetInfo.newContext,
									oTargetInfo.tableBindingPath, false, 4);
							// We expect that the content of the table we are navigating away from will be changed by the actions taking place on the follow-up page.
							// Therefore, we set it to dirty in advance. However, we have to postpone this until the table is no longer visible, since otherwise the
							// refresh of the table would be triggered immediately, which means before potential save actions being performed on the follow-up page.
							// In order to achieve this, setting this page to dirty is postponed until the busy session is finished (which means in particular, that
							// the navigation to the follow-up page has happened).
							oServices.oApplication.getBusyHelper().getUnbusy().then(oServices.oViewDependencyHelper.setMeToDirty.bind(null, oComponent, sTablePath));
						} else {
							oCommonUtils.refreshSmartTable(oTable);
							//execute side effects for inline create
							oServices.oApplicationController.executeSideEffects(oComponent.getBindingContext(), [], [sTablePath]);
						}
					});

				oRet.catch(jQuery.noop);
				return oRet;
			};

			if (oPredefinedValues instanceof Promise){
				return oPredefinedValues.then(fnCRUDManagerCall);
			} else {
				return fnCRUDManagerCall(oPredefinedValues);
			}
		}

		/**
		 * Event handler for Delete on the List Report
		 * @param {sap.ui.base.Event} oEvent
		 * @public
		 */
		function deleteEntries(oEvent) {
			var oSmartTable = oCommonUtils.getOwnerControl(oEvent.getSource());
			var aSelectedItems = oCommonUtils.getSelectedContexts(oSmartTable);

			if (aSelectedItems && aSelectedItems.length > 0) {
				var oDialogParameterPromise = getDataForDeleteDialog(aSelectedItems);
				// ensure to have a Promise (even if extension returns sth. different)
				var oBeforeDeleteExtensionPromise = Promise.resolve(oController.beforeDeleteExtension({aContexts: aSelectedItems}));
				oBeforeDeleteExtensionPromise.then(function(oExtensionResult){
					var oBusyHelper = oServices.oApplication.getBusyHelper();
					oBusyHelper.setBusy(oDialogParameterPromise);
					oDialogParameterPromise.then(function(oDialogParameter){
						jQuery.extend(oDialogParameter.text, oExtensionResult);
						var oDeleteDialog = getDeleteDialog(oSmartTable);
						var oDeleteDialogModel = oDeleteDialog.getModel("delete");
						oDeleteDialogModel.setData(oDialogParameter);
						oDeleteDialog.open();
					},
					/*
					 * In case the Promise returned from extension is rejected, don't show a popup and don't execute deletion. If
					 * extension needs an asynchronous step (e.g. backend request) to determine special text that could fail, it
					 * should use securedExecution. Then error messages from backend are shown by busyHelper automatically.
					 */
					jQuery.noop
					);
				});
			} else {
				MessageBox.error(oCommonUtils.getText("ST_GENERIC_NO_ITEM_SELECTED"), {
					styleClass: oCommonUtils.getContentDensityClass()
				});
			}
		}

		function onContactDetails(oEvent) {
			var oPopover;
			if (oEvent.getSource().data("Location") === "Header") {
				oPopover = oEvent.getSource().getParent().getAggregation("items")[0];
			} else if (oEvent.getSource().data("Location") === "Section") {		//ContactPopUpover in Section
				// the order in SmartForDataField changed due to layout problems and BCP
				oPopover = oEvent.getSource().getParent().getElements()[1];
			} else if (oEvent.getSource().data("Location") === "SmartTable") {	//ContactPopUpOver in SmartTable
				oPopover = oEvent.getSource().getParent().getAggregation("items")[0];
			} else {
				oPopover = oEvent.getSource().getParent().getParent().getParent().getParent().getParent().getAggregation(
						"items")[1];
			}
			oPopover.bindElement(oEvent.getSource().getBindingContext().getPath());
			oPopover.openBy(oEvent.getSource());
		}


		/* eslint-disable */
		var fnBuildSelectionVariantForNavigation = testableHelper.testable(fnBuildSelectionVariantForNavigation, "fnBuildSelectionVariantForNavigation");
		var fnEvaluateParameters = testableHelper.testable(fnEvaluateParameters, "fnEvaluateParameters");
		var fnNavigateIntent = testableHelper.testable(fnNavigateIntent, "fnNavigateIntent");
		var fnHideTitleArea = testableHelper.testable(fnHideTitleArea, "fnHideTitleArea");
		/* eslint-enable */

		return {
			onDataReceived: onDataReceived,
			onBeforeRebindTable: onBeforeRebindTable,
			onListNavigate: onListNavigate,
			onShowDetails: onShowDetails,
			onEditNavigateIntent: fnNavigateIntentManifest,
			onSemanticObjectLinkPopoverLinkPressed: fnSemanticObjectLinkPopoverLinkPressed,
			onDataFieldWithNavigationPath: onDataFieldWithNavigationPath,
			onDataFieldForIntentBasedNavigation: onDataFieldForIntentBasedNavigation,
			onDeterminingDataFieldForIntentBasedNavigation: onDeterminingDataFieldForIntentBasedNavigation,
			onDeterminingDataFieldForAction: onDeterminingDataFieldForAction,
			onInlineDataFieldForIntentBasedNavigation: onInlineDataFieldForIntentBasedNavigation,
			onDataFieldWithIntentBasedNavigation: onDataFieldWithIntentBasedNavigation,
			onInlineDataFieldForAction: onInlineDataFieldForAction,
			onSmartFieldUrlPressed: onSmartFieldUrlPressed,
			onBreadCrumbUrlPressed: onBreadCrumbUrlPressed,
			onCallActionFromToolBar: onCallActionFromToolBar,
			onDiscardDraft: onDiscardDraft,
			discardDraftWithoutDialog: fnDiscardDraftWithoutDialog,
			addEntry: addEntry,
			deleteEntries: deleteEntries,
			onContactDetails: onContactDetails,
			onSemanticObjectLinkNavigationTargetObtained: fnOnSemanticObjectLinkNavigationTargetObtained,
			onSemanticObjectLinkNavigationPressed: fnOnSemanticObjectLinkNavigationPressed
		};
	}

	return BaseObject.extend("sap.suite.ui.generic.template.lib.CommonEventHandlers", {
		constructor: function(oController, oComponentUtils, oServices, oCommonUtils) {
			jQuery.extend(this, getMethods(oController, oComponentUtils, oServices, oCommonUtils));
		}
	});
});
