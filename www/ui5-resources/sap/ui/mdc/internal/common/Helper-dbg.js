/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
 sap.ui.define([
	"../../ResourceModel"
], function (ResourceModel) {
	"use strict";
	var Helper = {

		isPropertyFilterable: function (property, oInterface) {
			var sEntitySetPath,
				sProperty,
				bIsNotFilterable = false,
				oModel = oInterface.context.getModel(),
				sPropertyPath = oInterface.context.getPath();

			if (oModel.getObject(sPropertyPath + "@com.sap.vocabularies.UI.v1.Hidden")) {
				return false;
			}
			if (oModel.getObject(sPropertyPath + "@com.sap.vocabularies.UI.v1.HiddenFilter")) {
				return false;
			}

			sEntitySetPath = Helper._getEntitySetPath(oModel, sPropertyPath);
			if (typeof (property) === "string") {
				sProperty = property;
			} else {
				sProperty = oModel.getObject(sPropertyPath + "@sapui.name");
			}
			if (sProperty.indexOf("/") < 0) {
				bIsNotFilterable = Helper._isInNonFilterableProperties(oModel, sEntitySetPath, sProperty);
			} else {
				bIsNotFilterable = Helper._isContextPathFilterable(oModel, sEntitySetPath, sProperty);
			}

			return !bIsNotFilterable;
		},

		_isInNonFilterableProperties: function (oModel, sEntitySetPath, sContextPath) {
			var bIsNotFilterable = false;
			var oAnnotation = oModel.getObject(sEntitySetPath + "@Org.OData.Capabilities.V1.FilterRestrictions");
			if (oAnnotation && oAnnotation.NonFilterableProperties) {
				bIsNotFilterable = oAnnotation.NonFilterableProperties.some(function(property) {
					return property.$NavigationPropertyPath === sContextPath || property.$PropertyPath === sContextPath;
				});
			}
			return bIsNotFilterable;
		},

		_isContextPathFilterable: function (oModel, sEntitySetPath, sContexPath) {
			var aContext = sContexPath.split("/"),
				bIsNotFilterable = false,
				sContext = "";

			aContext.some(function(item, index, array) {
				if (sContext.length > 0) {
					sContext += "/" + item;
				} else {
					sContext = item;
				}
				if (index === array.length - 1) {
					//last path segment
					bIsNotFilterable = Helper._isInNonFilterableProperties(oModel, sEntitySetPath, sContext);
				} else if (oModel.getObject(sEntitySetPath + "/$NavigationPropertyBinding/" + item)) {
					//check existing context path and initialize it
					bIsNotFilterable = Helper._isInNonFilterableProperties(oModel, sEntitySetPath, sContext);
					sContext = "";
					//set the new EntitySet
					sEntitySetPath = "/" + oModel.getObject(sEntitySetPath + "/$NavigationPropertyBinding/" + item);
				}
				return bIsNotFilterable === true;
			});
			return bIsNotFilterable;
		},

		replaceSpecialCharsInId: function (sId) {
			if (sId.indexOf(" ") >= 0) {
				jQuery.sap.log.error("Annotation Helper: Spaces are not allowed in ID parts. Please check the annotations, probably something is wrong there.");
			}
			return sId.replace(/@/g, "").replace(/\//g, "::").replace(/#/g, "::");
		},

		formatDraftLockText : function (IsActiveEntity, HasDraftEntity, LockedBy) {
			if (!IsActiveEntity) {
				return sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc").getText("draft.DRAFT_OBJECT");
			} else if (HasDraftEntity) {
				if (LockedBy) {
					return ResourceModel.getText("draft.LOCKED_OBJECT");
				} else {
					return ResourceModel.getText("draft.UNSAVED_CHANGES");
				}
			} else {
				return ""; // not visible
			}
		},

		_getEntitySetPath: function (oModel, sPropertyPath) {
			var iLength;
			var sEntitySetPath = sPropertyPath.slice(0, sPropertyPath.indexOf("/", 1));
			if (oModel.getObject(sEntitySetPath + "/$kind") === "EntityContainer") {
				iLength = sEntitySetPath.length + 1;
				sEntitySetPath = sPropertyPath.slice(iLength, sPropertyPath.indexOf("/", iLength));
			}
			return sEntitySetPath;
		},

		_extendValueListMetadata: function (oMetaModel, sEntitySet, sPropertyPath, mValueListInfo) {
			var mParameters;

			var fnFilterExpressionRestriction = function(filterExpressionRestriction){
				return filterExpressionRestriction.Property.$PropertyPath === sPropertyPath;
			};

			var fnMapLocalDataToValueList = function(oParameter) {
				var sType = oParameter.$Type;
				if (sType === "com.sap.vocabularies.Common.v1.ValueListParameterInOut" || sType === "com.sap.vocabularies.Common.v1.ValueListParameterOut") {
					this.oLocalDataToValueListMap[oParameter.LocalDataProperty.$PropertyPath] = oParameter.ValueListProperty;
				}
			};

			// TODO: don't know why this is added here and not in the template / shouldn't be the selection mode a property of the filter field? to be discussed
			var sSelectionMode, aFilterExpressionRestrictions = oMetaModel.getObject("/" + sEntitySet + "@Org.OData.Capabilities.V1.FilterRestrictions");
			var oFilterExpressionRestriction = aFilterExpressionRestrictions && aFilterExpressionRestrictions.FilterExpressionRestrictions.filter(fnFilterExpressionRestriction) ;
			//Getting Label for the dialog -> same then above should be not done here but kept it for now
			//mValueListInfo[p].sTitle = oMetaModel.getObject("/" + sEntitySet + "/$Type/" + sPropertyPath + "@com.sap.vocabularies.Common.v1.Label");
			if (oFilterExpressionRestriction && (oFilterExpressionRestriction.length > 0) && (oFilterExpressionRestriction[0].AllowedExpressions.indexOf("SingleValue") > -1)) {
				sSelectionMode = "SingleSelectLeft";
				//mValueListInfo[p].sTitle = ResourceModel.getText("valuehelp.SINGLE_ITEM_SELECT") + mValueListInfo[p].sTitle; // ???
				//mValueListInfo[p].sTitle = Library.getText("valuehelp.SINGLE_ITEM_SELECT") + mValueListInfo[""].sTitle;
			} else {
				sSelectionMode = "MultiSelect";
			}

			for (var p in mValueListInfo) {
				// we store some additional information in an object called $mdc
				var oSearchRestrictions = mValueListInfo[p].$model.getMetaModel().getObject("/" + mValueListInfo[p].CollectionPath + "@Org.OData.Capabilities.V1.SearchRestrictions");
				mValueListInfo[p].$mdc = {};
				mValueListInfo[p].$mdc.qualifier = sEntitySet + '/' + sPropertyPath + '#' + (p || "default");
				mValueListInfo[p].$mdc.sSelectionMode = sSelectionMode;
				mValueListInfo[p].$mdc.bSearchable = (oSearchRestrictions && oSearchRestrictions.Searchable === false) ? oSearchRestrictions.Searchable : true;

				// determine key and description path and store it in the value list info
				mParameters = mValueListInfo[p].Parameters;
				var sLocalDataProperty = oMetaModel.getObject('/' + sEntitySet + '/' + sPropertyPath + "@sapui.name");

				// determine the key and the description path
				// TODO: how could we do this better?
				for (var i = 0; i < mParameters.length; i++) {
					if (mParameters[i].LocalDataProperty && mParameters[i].LocalDataProperty.$PropertyPath === sLocalDataProperty) {
						// we store this information into the value list info - we will set this information to the filter field in the future
						mValueListInfo[p].$mdc.keyPath =  mParameters[i].ValueListProperty;
						mValueListInfo[p].$mdc.descriptionPath = mValueListInfo[p].$model.getMetaModel().getObject("/" + mValueListInfo[p].CollectionPath + "/" + mParameters[i].ValueListProperty + "@com.sap.vocabularies.Common.v1.Text/$Path");

						// there should be always only one parameter with the property field path as output
						break;
					}
				}

				// Storing Value list out parameters mapping
				mValueListInfo[p].$mdc.oLocalDataToValueListMap = {};
				mValueListInfo[p].Parameters.forEach(fnMapLocalDataToValueList.bind(mValueListInfo[p].$mdc));

			}

			return mValueListInfo;

		}
	};

	Helper.isPropertyFilterable.requiresIContext = true;

	return Helper;
}, /* bExport= */ true);
