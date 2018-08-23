/*
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

/**
 * Factory class to create controls that are hosted by <code>sap.ui.comp.smartfield.SmartField</code>.
 *
 * @name sap.ui.comp.smartfield.ODataControlFactory
 * @author SAP SE
 * @version 1.56.5
 * @private
 * @since 1.28.0
 */
sap.ui.define([
	"jquery.sap.global",
	"sap/ui/comp/library",
	"sap/m/TextArea",
	"sap/m/Link",
	"sap/m/CheckBox",
	"sap/m/ComboBox",
	"sap/m/DatePicker",
	"sap/m/DateTimePicker",
	"sap/m/FlexItemData",
	"sap/m/FlexJustifyContent",
	"sap/m/HBox",
	"sap/m/Input",
	"sap/m/InputType",
	"sap/m/Select",
	"sap/m/Text",
	"sap/ui/core/Renderer",
	"sap/ui/core/TextAlign",
	"sap/ui/comp/navpopover/SmartLink",
	"./ControlFactoryBase",
	"./FieldControl",
	"./ODataControlSelector",
	"./ODataHelper",
	"./ODataTypes",
	"sap/m/ObjectNumber",
	"sap/m/ObjectIdentifier",
	"sap/m/ObjectStatus",
	"sap/ui/core/ValueState",
	"sap/m/TimePicker",
	"sap/ui/comp/navpopover/SemanticObjectController",
	"sap/ui/comp/util/FormatUtil",
	"sap/ui/comp/smartfield/type/TextArrangementString",
	"sap/ui/comp/odata/MetadataAnalyser",
	"sap/ui/comp/navpopover/NavigationPopoverHandler",
	"sap/ui/core/InvisibleText"
], function(jQuery, library, TextArea, Link, CheckBox, ComboBox, DatePicker, DateTimePicker, FlexItemData, FlexJustifyContent, HBox, Input, InputType, Select, Text, Renderer, TextAlign, SmartLink, ControlFactoryBase, FieldControl, ODataControlSelector, ODataHelper, ODataTypes, ObjectNumber, ObjectIdentifier, ObjectStatus, ValueState, TimePicker, SemanticObjectController, FormatUtil, TextArrangementString, MetadataAnalyser, NavigationPopoverHandler, InvisibleText) {
	"use strict";

	var TextInEditModeSource = library.smartfield.TextInEditModeSource;

	/**
	 * @private
	 * @constructor
	 * @param {sap.ui.model.odata.ODataModel} oModel the OData model currently used
	 * @param {sap.ui.core.Control} oParent the parent control
	 * @param {object} oMetaData the meta data used to initialize the factory
	 * @param {string} oMetaData.entitySet the name of the OData entity set
	 * @param {string} oMetaData.model the name of the model
	 * @param {string} oMetaData.path the path identifying the OData property
	 */
	var ODataControlFactory = ControlFactoryBase.extend("sap.ui.comp.smartfield.ODataControlFactory", {
		constructor: function(oModel, oParent, oMetaData) {
			ControlFactoryBase.call(this, oModel, oParent);
			this.sName = "ODataControlFactory";
			this._oMetaData = {
				annotations: {}
			};

			this._oMeta = oMetaData;
			this._oHelper = new ODataHelper(oModel, this._oBinding);
			this._oFieldControl = new FieldControl(oParent, this._oHelper);
			this._oTypes = new ODataTypes(oParent);
			this._oSelector = new ODataControlSelector(this._oMetaData, oParent, this._oTypes);
			this._bInitialized = false;
			this.bPending = false;
		}
	});

	/**
	 * Initializes the meta data.
	 *
	 * @param {object} oMetaData the meta data used to initialize the factory
	 * @param {string} oMetaData.entitySet the name of the OData entity set
	 * @param {string} oMetaData.entityType the name of the OData entity type
	 * @param {string} oMetaData.property the name of the OData property
	 * @param {string} oMetaData.model the name of the model
	 * @param {string} oMetaData.path the path identifying the OData property
	 * @private
	 */
	ODataControlFactory.prototype._init = function(oMetaData) {

		// set the name of the model used, binding path of the property (complex or simple), entity set and entity type.
		this._oMetaData.model = oMetaData.model;
		this._oMetaData.path = oMetaData.path;
		this._oMetaData.entitySet = oMetaData.entitySetObject || this._oHelper.oMeta.getODataEntitySet(oMetaData.entitySet);
		this._oMetaData.entityType = oMetaData.entityType || this._oHelper.oMeta.getODataEntityType(this._oMetaData.entitySet.entityType);
		this._oMetaData.navigationPath = oMetaData.navigationPath || null;

		if (this._oModel) {

			// get the property, considering navigation properties and complex types.
			this._oHelper.checkNavigationProperty(this._oMetaData, this._oParent);
			this._oHelper.getProperty(this._oMetaData);

			// make sure that no exceptions occur, if the property is not valid
			// => necessary for extensibility use cases, if an extension field has been deleted and the UI has not yet been adapted.
			var oMetadataProperty = this.getEdmProperty();

			if (oMetadataProperty) {
				if (this._oParent && this._oParent.getExpandNavigationProperties()) {
					var oContext = this._oParent.getBindingContext();
					var bCreated = oContext.getObject().__metadata.created;

					if (!bCreated) {

						// only auto expand when entity is persited on the server
						var sAutoExpand = this._oHelper.getAutoExpandProperties(oMetadataProperty);

						if (sAutoExpand.length > 0) {
							this._oParent.bindElement({
								path: "",
								parameters: {
									expand: sAutoExpand,

									// select the data that is needed, not all properties of the entity which may have many
									select: sAutoExpand
								}
							});
						}
					}
				}

				// now get the remaining annotations, text, unit of measure and value list.
				this._oMetaData.annotations.text = this._oHelper.getTextProperty2(this._oMetaData);
				this._oMetaData.annotations.uom = this._oHelper.getUnitOfMeasure2(this._oMetaData);
				this._oHelper.getValueListData(this._oMetaData);
				this._oMetaData.annotations.lineitem = this._oHelper.getAnalyzer().getLineItemAnnotation(this._oMetaData.entitySet.entityType);
				this._oHelper.getUOMValueListAnnotationPath(this._oMetaData);
				this._oMetaData.annotations.semantic = MetadataAnalyser.getSemanticObjectsFromProperty(oMetadataProperty);
				this._oMetaData.annotations.semanticKeys = this._oHelper.getAnalyzer().getSemanticKeyAnnotation(this._oMetaData.entitySet.entityType);

				if (this._oMetaData.annotations.uom) {
					this._oMetaData.annotations.uom.annotations = {};
					this._oHelper.getValueListData(this._oMetaData.annotations.uom);
				}

				// check for a possibly existing text annotation for the unit in unit of measure.
				this._oHelper.getUOMTextAnnotation(this._oMetaData);
			} else {
				jQuery.sap.log.warning("SmartField: Property " + oMetaData.path + " does not exist", "SmartField: Property " + oMetaData.path + " does not exist", "sap.ui.comp.smartfield.ODataControlFactory");
			}
		} else {
			this._oMetaData.modelObject = oMetaData.modelObject;
			this._oMetaData.property = oMetaData.property;
			this._oMetaData.property.valueListAnnotation = null;
			this._oMetaData.property.valueListKeyProperty = null;
			this._oMetaData.property.valueListEntitySet = null;
			this._oMetaData.property.valueListEntityType = null;
			this._oMetaData.annotations.text = oMetaData.annotations.text;
			this._oMetaData.annotations.uom = oMetaData.annotations.uom;

			if (this._oMetaData.annotations.uom && !this._oMetaData.annotations.uom.annotations) {
				this._oMetaData.annotations.uom.annotations = {};
			}

			this._oMetaData.annotations.valuelist = oMetaData.annotations.valuelist;
			this._oMetaData.annotations.valuelistType = oMetaData.annotations.valuelistType;
			this._oMetaData.annotations.lineitem = oMetaData.annotations.lineitem;
			this._oMetaData.annotations.semantic = oMetaData.annotations.semantic;
			this._oMetaData.annotations.valuelistuom = oMetaData.annotations.valuelistuom;
		}
	};

	ODataControlFactory.prototype._initValueList = function(oValueListAnnotations) {

		if (!oValueListAnnotations) {
			return null;
		}

		var oMetadataProperty = this._oMetaData.property,
			oValueListAnnotation = oValueListAnnotations.primaryValueListAnnotation;

		this._oMetaData.annotations.valueListData = oValueListAnnotation;
		oMetadataProperty.valueListAnnotation = oValueListAnnotation;
		oMetadataProperty.valueListKeyProperty = this._oHelper.getODataValueListKeyProperty(oValueListAnnotation);
		oMetadataProperty.valueListEntitySet = this._oHelper.oMeta.getODataEntitySet(oValueListAnnotation.valueListEntitySetName);
		oMetadataProperty.valueListEntityType = this._oHelper.oMeta.getODataEntityType(this._oHelper.oMeta.getODataEntitySet(oValueListAnnotation.valueListEntitySetName).entityType);
	};

	/**
	 * Creates a control instance based on OData meta data for display-only use cases.
	 *
	 * @return {sap.ui.core.Control} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmDisplay = function() {
		var oInnerControl,
			bMasked,
			bObjectIdentifier,
			vTextAnnotationPath,
			that = this,
			mNames = {
				width: true,
				textAlign: true
			},
			oEdmProperty = this.getEdmProperty();

		if (oEdmProperty) {
			vTextAnnotationPath = this._oHelper.oAnnotation.getText(oEdmProperty);
		}

		var oConfig = this._oParent.data("configdata"); // optional call-back to layout the text as unit for unit of measure
		var bIgnoreComboBox = ((oConfig && (oConfig.isInnerControl !== true)) || this._oParent.isContextTable());
		var oControlSelectorConfig = this._oSelector.checkComboBox(bIgnoreComboBox);

		if (oControlSelectorConfig.combobox && (this._oParent.getFetchValueListReadOnly() || (vTextAnnotationPath === undefined))) {
			return this._createComboBox({
				valueHelp: {
					annotation: oControlSelectorConfig.annotation,
					noDialog: true,
					noTypeAhead: true
				},
				edit: false
			});
		}

		if (this._checkLink() && !this._oSelector.useObjectIdentifier()) {
			return this._createLink();
		}

		var mAttributes = this.createAttributes(null, this._oMetaData.property, mNames);
		var bDatePicker = this._oSelector.checkDatePicker() || ( (this._oMetaData.property && this._oMetaData.property.property) ? this._oMetaData.property.property.type.startsWith("Edm.Date") : false);

		if (bDatePicker) {
			var mOptions = this.getFormatSettings("dateFormatSettings");
			mAttributes.text = {
				model: this._oMetaData.model,
				path: this._oMetaData.path,
				type: this._oTypes.getType(this._oMetaData.property, mOptions, {
					displayFormat: "Date"
				})
			};
		} else {
			mAttributes.text = {
				model: this._oMetaData.model,
				path: this._oHelper.getEdmDisplayPath(this._oMetaData),
				type: this._oTypes.getType(this._oMetaData.property)
			};
		}

		if (oEdmProperty) {

			// password handling
			bMasked = this._oHelper.oAnnotation.isMasked(oEdmProperty);

			if (bMasked) {
				mAttributes.text.formatter = ODataTypes.maskValue;
			}

			if (vTextAnnotationPath) {
				bObjectIdentifier = this._oSelector.useObjectIdentifier(bDatePicker, bMasked);

				if (bObjectIdentifier) {
					delete mAttributes.width;
					delete mAttributes.textAlign;
					mAttributes.text = {
						path: this._oMetaData.path
					};
					mAttributes.title = {
						path: this._oHelper.getEdmDisplayPath(this._oMetaData)
					};

					if (this._oParent.hasListeners("press")) {
						mAttributes.titleActive = true;
						mAttributes.titlePress = function(oEvent) {
							that._oParent.firePress(oEvent);
						};
					} else if (this._oMetaData.annotations.semantic && this._oMetaData.annotations.semantic.defaultSemanticObject) {
						var bTitleActive;
						var oLinkHandler;

						SemanticObjectController.getDistinctSemanticObjects().then(function(oSemanticObjects) {
							bTitleActive = SemanticObjectController.hasDistinctSemanticObject(that._oMetaData.annotations.semantic.defaultSemanticObject, oSemanticObjects);

							if (bTitleActive) {
								var oInfo = that._oParent.getBindingInfo("value");
								var sPath = oInfo.parts[0].path;
								var sLabel = that._oHelper.oAnnotation.getLabel(that._oMetaData.property.property);

								if (that._oMetaData.annotations.lineitem && that._oMetaData.annotations.lineitem.labels && that._oMetaData.annotations.lineitem.labels[sPath]) {
									sLabel = that._oMetaData.annotations.lineitem.labels[sPath];
								}

								oLinkHandler = new NavigationPopoverHandler({
									semanticObject: that._oMetaData.annotations.semantic.defaultSemanticObject,
									additionalSemanticObjects: that._oMetaData.annotations.semantic.additionalSemanticObjects,
									semanticObjectLabel: sLabel,
									fieldName: sPath,
									navigationTargetsObtained: function(oEvent) {
										var oObjectIdentifier = sap.ui.getCore().byId(oEvent.getSource().getControl());
										var oMainNavigation = oEvent.getParameters().mainNavigation;

										// 'mainNavigation' might be undefined
										if (oMainNavigation) {
											oMainNavigation.setDescription(oObjectIdentifier.getText());
										}

										oEvent.getParameters().show(oObjectIdentifier.getTitle(), oMainNavigation, undefined, undefined);
									}
								});
							}
						});
						mAttributes.titleActive = {
							path: "$sapuicompsmartfield_distinctSO>/distinctSemanticObjects/" + this._oMetaData.annotations.semantic.defaultSemanticObject,
							formatter: function(oValue) {
								return !!oValue;
							}
						};
						mAttributes.titlePress = function(oEvent) {

							if (bTitleActive && oLinkHandler) {
								oLinkHandler.setControl(oEvent.getSource(oEvent.getParameter("domRef")));
								oLinkHandler.openPopover();
							}
						};
					}
				} else if (!(oConfig && (oConfig.isInnerControl === true))) {
					mAttributes.text = {};
					mAttributes.text.parts = [];
					mAttributes.text.parts.push(this._oMetaData.path);
					mAttributes.text.parts.push(this._oHelper.getEdmDisplayPath(this._oMetaData));
					mAttributes.text.formatter = function(sId, sDescription) {

						if (oControlSelectorConfig.combobox) {
							return that._formatDisplayBehaviour("defaultComboBoxReadOnlyDisplayBehaviour", sId, sDescription);
						}

						return that._formatDisplayBehaviour("defaultInputFieldDisplayBehaviour", sId, sDescription);
					};
				}
			} else if (this._oSelector.checkCheckBox()) {
				mAttributes.text.formatter = function(sValue) {
					return that._formatDisplayBehaviour("defaultCheckBoxDisplayBehaviour", sValue);
				};
			}
		}

		if (bObjectIdentifier) {
			oInnerControl = new ObjectIdentifier(this._oParent.getId() + "-objIdentifier", mAttributes);

			if (this._oMetaData.annotations.semantic) {
				oInnerControl.setModel(SemanticObjectController.getJSONModel(), "$sapuicompsmartfield_distinctSO");
			}
		} else {

			// do not wrap for dates. Incident ID : 1570841150
			if (mAttributes.text.type && (mAttributes.text.type instanceof sap.ui.comp.smartfield.type.DateTime) && mAttributes.text.type.oConstraints && mAttributes.text.type.oConstraints.isDateOnly) {
				mAttributes.wrapping = false;
			}

			if (this._oParent.isContextTable() && sap.ui.getCore().getConfiguration().getRTL()) {
				mAttributes.textDirection = "LTR";
			}

			oInnerControl = new Text(this._oParent.getId() + "-text", mAttributes);
		}

		// optional call-back to layout the text as unit for unit of measure.
		// moved to the beginning of this function
		// oConfig = this._oParent.data("configdata");
		if (!bObjectIdentifier && oConfig && oConfig.configdata && oConfig.configdata.onText) {
			oConfig.configdata.onText(oInnerControl);
		}

		// create a text box.
		return {
			control: oInnerControl,
			onCreate: "_onCreate",
			params: {
				noValidations: true
			}
		};
	};

	/**
	 * Creates a control instance based on OData meta data.
	 *
	 * @return {sap.ui.core.Control} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmTime = function() {
		var mNames = {
			width: true,
			placeholder: true,
			valueState: true,
			valueStateText: true
		};

		var mAttributes = this.createAttributes("value", this._oMetaData.property, mNames, {
			event: "change"
		});

		// BCP: 1580232741
		mAttributes.valueFormat = "HH:mm:ss";

		// normalise default width
		if (mAttributes.width === "") {
			mAttributes.width = "100%";
		}

		var oControl = new TimePicker(this._oParent.getId() + "-timePicker", mAttributes);

		return {
			control: oControl,
			onCreate: "_onCreate",
			params: {
				getValue: "getValue",
				type: {
					type: mAttributes.value.type,
					property: this._oMetaData.property
				}
			}
		};
	};

	/**
	 * Creates a <code>sap.m.ObjectStatus</code> instance.
	 *
	 * @returns {sap.m.ObjectStatus} the new control instance
	 * @private
	 * @since 1.34.0
	 */
	ODataControlFactory.prototype._createObjectStatus = function() {
		var mAttributes = this.createAttributes(null, this._oMetaData.property, null),
			oTextAnnotation = this._oHelper.oAnnotation.getText(this.getEdmProperty());

		if (oTextAnnotation) {
			mAttributes.text = {
				parts: [
					this._oHelper.getEdmDisplayPath(this._oMetaData)
				]
			};
		} else {
			mAttributes.text = {
				model: this._oMetaData.model,
				path: this._oMetaData.path,
				type: this._oTypes.getType(this._oMetaData.property)
			};
		}

		this._addObjectStatusAttributes(mAttributes);
		var oInnerControl = new ObjectStatus(this._oParent.getId() + "-objStatus", mAttributes);

		return {
			control: oInnerControl,
			onCreate: "_onCreate",
			params: {
				getValue: "getText",
				noValidation: true
			}
		};
	};

	/**
	 * Adds the attributes and properties for object status to the overall attributes for control construction.
	 *
	 * @param {map} mAttributes The overall attributes for control construction
	 * @private
	 */
	ODataControlFactory.prototype._addObjectStatusAttributes = function(mAttributes) {
		var oInfo,

			// check the state and place an icon, if necessary.
			oProposal = this._oParent.getControlProposal(),
			oStatus = oProposal.getObjectStatus();

		if (oStatus) {
			oInfo = oStatus.getBindingInfo("criticality");
		}

		var fCriticality = function(vCriticality) {
			var mStatesInt = {
				0: ValueState.None,
				1: ValueState.Error,
				2: ValueState.Warning,
				3: ValueState.Success
			};
			var mStatesString = {
				"com.sap.vocabularies.UI.v1.CriticalityType/Neutral": ValueState.Neutral,
				"com.sap.vocabularies.UI.v1.CriticalityType/Negative": ValueState.Warning,
				"com.sap.vocabularies.UI.v1.CriticalityType/Critical": ValueState.Error,
				"com.sap.vocabularies.UI.v1.CriticalityType/Positive": ValueState.Success
			};

			return mStatesString[vCriticality] || mStatesInt[vCriticality] || ValueState.None;
		};

		var fIcon = function() {
			var vCriticality,
				mIcons = {
				"Error": "sap-icon://status-negative",
				"Warning": "sap-icon://status-critical",
				"Success": "sap-icon://status-positive",
				"None": "sap-icon://status-inactive"
			};

			if (oInfo) {
				if (oInfo.formatter) {
					vCriticality = oInfo.formatter.apply(null, arguments);
				} else {
					vCriticality = arguments[0];
				}
			} else {
				vCriticality = oStatus.getCriticality();
			}

			if ((vCriticality === undefined) || (vCriticality === null)) {
				return null;
			}

			return mIcons[fCriticality(vCriticality)];
		};

		if (oInfo) {
			mAttributes.state = {
				formatter: function() {
					var oCriticality;

					if (oInfo.formatter) {
						oCriticality = oInfo.formatter.apply(null, arguments);
					} else {
						oCriticality = arguments[0];
					}

					return fCriticality(oCriticality);
				},
				parts: oInfo.parts
			};

			if (oStatus.getCriticalityRepresentationType() !== sap.ui.comp.smartfield.CriticalityRepresentationType.WithoutIcon) {
				mAttributes.icon = {
					formatter: fIcon,
					parts: oInfo.parts
				};
			}
		} else {

			if (oStatus) {
				mAttributes.state = fCriticality(oStatus.getCriticality());

				if (oStatus.getCriticalityRepresentationType() !== sap.ui.comp.smartfield.CriticalityRepresentationType.WithoutIcon) {
					mAttributes.icon = fIcon();
				}
			} else {
				mAttributes.icon = fIcon();
			}
		}
	};

	/**
	 * Creates a control instance based on OData meta data to edit a model property of type <code>Edm.String</code>.
	 * Either <code>sap.m.Input</code> is returned or <code>sap.m.Combobox</code> depending on configuration.
	 *
	 * @return {sap.ui.core.Control} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmString = function() {
		var mAttributes,
			mNames = {
				width: true,
				textAlign: true,
				placeholder: true,
				tooltip: true,
				name: true,
				valueState: true,
				valueStateText: true
			};

		if (this._oSelector.checkCheckBox()) {
			return this._createCheckBox();
		}

		var oCheck = this._oSelector.checkSelection();

		if (oCheck.selection) {
			return this._createSelect({
				annotation: oCheck.annotation,
				noDialog: true,
				noTypeAhead: true
			});
		}

		oCheck = this._oSelector.checkComboBox();

		if (oCheck.combobox) {
			return this._createComboBox({
				valueHelp: {
					annotation: oCheck.annotation,
					noDialog: true,
					noTypeAhead: true
				},
				edit: true
			});
		}

		var oEdmProperty = this.getEdmProperty();

		if (oEdmProperty) {

			if (this._oHelper.oAnnotation.isMultiLineText(oEdmProperty)) {
				delete mNames["width"];
				return this._createMultiLineText(mNames);
			}
		}

		var bTextInEditModeSourceValid = this._oParent.isTextInEditModeSourceValid();

		if (bTextInEditModeSourceValid) {
			jQuery.sap.assert(/Edm.String|Edm.Guid/.test(oEdmProperty.type), "The ValueList and NavigationProperty" +
				"members of the sap.ui.comp.smartfield.TextInEditModeSource enumeration are only supported for OData" +
				"entity data model properties typed as Edm.String or Edm.Guid");
		}

		if (bTextInEditModeSourceValid && (/Edm.String|Edm.Guid/.test(oEdmProperty.type))) {
			mAttributes = this.createAttributes("", this._oMetaData.property, mNames);
			mAttributes.value = this._getTextArrangementBindingInfo();
		} else {
			mAttributes = this.createAttributes("value", this._oMetaData.property, mNames);
		}

		var oControl = new Input(this._oParent.getId() + "-input", mAttributes);

		if (oEdmProperty) {

			// password entry
			if (this._oHelper.oAnnotation.isMasked(oEdmProperty)) {
				oControl.setType(InputType.Password);
			}

			// add optional upper case conversion.
			this._handleEventingForEdmString(oControl, this._oMetaData.property);
		}

		// optional call-back to layout the text as unit for unit of measure.
		var oConfig = this._oParent.data("configdata");

		if (oConfig && oConfig.configdata && oConfig.configdata.onInput) {
			oConfig.configdata.onInput(oControl);
		}

		return {
			control: oControl,
			onCreate: "_onCreate",
			params: {
				valuehelp: {
					annotation: oCheck.annotation,
					noDialog: !this._oParent.getShowValueHelp(),
					noTypeAhead: !this._oParent.getShowSuggestion(),
					aggregation: "suggestionRows"
				},
				getValue: "getValue",
				type: {
					type: mAttributes.value.type,
					property: this._oMetaData.property
				}
			}
		};
	};

	ODataControlFactory.prototype._getTextArrangementBindingInfo = function() {
		var oBindingInfo = this._oParent.getBindingInfo("value"),
			oType = (oBindingInfo && oBindingInfo.type) || {};

		return {
			model: this._oMetaData.model,
			type: this._oTypes.getType(this._oMetaData.property, oType.oFormatOptions, oType.oConstraints, {
				composite: true
			}),
			parts: [
				{
					path: this._oMetaData.path
				},
				{
					path: this._getTextAnnotationPropertyPath()
				}
			]
		};
	};

	ODataControlFactory.prototype._getTextAnnotationPropertyPath = function() {

		switch (this._oParent.getTextInEditModeSource()) {
			case TextInEditModeSource.NavigationProperty:
				return this._oHelper.getEdmDisplayPath(this._oMetaData);

			case TextInEditModeSource.ValueList:
				return this._oHelper.getTextPathFromValueList(this._oMetaData);

			case TextInEditModeSource.None:
				return "";

			// no default
		}
	};

	/**
	 * Gets the maximum length respecting type constraints and parent settings.
	 *
	 * @private
	 */
	ODataControlFactory.prototype._getMaxLength = function() {
		return this._oTypes.getMaxLength(this._oMetaData.property, this._oParent.getBindingInfo("value"));
	};

	ODataControlFactory.prototype._addAriaLabelledBy = function(oControl) {
		var oInvisibleText,
			oTargetControl,
			oConfigData;

		if ((this._oParent.getControlContext() === sap.ui.comp.smartfield.ControlContextType.None) || (this._oParent.getControlContext() === sap.ui.comp.smartfield.ControlContextType.Form) || (this._oParent.getControlContext() === sap.ui.comp.smartfield.ControlContextType.SmartFormGrid)) {
			ControlFactoryBase.prototype._addAriaLabelledBy.apply(this, arguments);

			// only add label from meta data if we use SmartField inside SmartField
			oConfigData = this._oParent.data("configdata");

			if (oConfigData && oConfigData.configdata.isInnerControl && oConfigData.configdata.isUOM) {

				if (oControl) {
					oTargetControl = oControl.control;
					if (oTargetControl instanceof HBox) {
						if (oTargetControl.getItems().length > 0) {
							oTargetControl = oTargetControl.getItems()[0];
						}
					}
				}

				if (oTargetControl && oTargetControl.getAriaLabelledBy && oTargetControl.getAriaLabelledBy().length === 0) {
					var oEdmProperty = this.getEdmProperty();

					if (this._oHelper.oAnnotation.getLabel(oEdmProperty)) {
						oInvisibleText = new InvisibleText({
							text: this._oHelper.oAnnotation.getLabel(oEdmProperty)
						});
						oTargetControl.addAriaLabelledBy(oInvisibleText);
						this._oParent.addAggregation("_ariaLabelInvisibleText", oInvisibleText);
					}
				}
			}
		}
	};

	/**
	 * Event handler for live changes/changes on the input control. The live-change event handler ensures the value is always in upper case
	 *
	 * @param {object} oControl attached either to liveChange or change event
	 * @param {object} oProperty the property for which to attach the events
	 * @private
	 */
	ODataControlFactory.prototype._handleEventingForEdmString = function(oControl, oProperty) {

		if (!oControl) {
			return;
		}

		var bUpperCase = this._oHelper.oAnnotation.isUpperCase(oProperty.property),
			that = this;

		oControl.attachChange(function onTextInputFieldChange(oControlEvent) {
			var oNewEvent = {},
				mParameters = oControlEvent && oControlEvent.getParameters();

			if (mParameters) {

				var sValue = mParameters.value;

				if (bUpperCase && sValue) {
					sValue = sValue.toUpperCase();
					oControl.setValue(sValue);
				}

				oNewEvent.value = sValue;
				oNewEvent.newValue = sValue;

				if (mParameters.validated) {
					oNewEvent.validated = mParameters.validated;
				}

				if (oControl._oSuggestionPopup && oControl._oSuggestionPopup.isOpen()) {

					if (!mParameters.validated) {

						if (oControl._iPopupListSelectedIndex >= 0) {
							return; // ignore that one; change via valuelistprovider will follow as next
						}
					}
				}

				try {
					var oParent = that._oParent;

					// fire the change event async after the value is validated
					if (oParent.isTextInEditModeSourceValid()) {
						var oBinding = oParent.getBinding("value");
						oParent.bWaitingForValueValidation = oBinding && (sValue !== oBinding.getValue());

						// otherwise fire it sync
					} else {
						oParent.fireChange(oNewEvent);
					}
				} catch (oException) {
					jQuery.sap.log.error(oException);
				}
			}
		});
	};

	/**
	 * Creates an instance of <code>sap.m.Combobox</code> based on OData meta data.
	 *
	 * @param {object} mSettings The settings
	 * @param {object} mSettings.valueHelp The value help configuration
	 * @param {object} mSettings.valueHelp.annotation The value help annotation
	 * @param {boolean} mSettings.valueHelp.noDialog Whether or not the value help dialog is created
	 * @param {boolean} mSettings.valueHelp.noTypeAhead Whether or not the type ahead functionality is required
	 * @param {boolean} mSettings.edit If set to <code>false</code>, the combo box will be rendered as static text
	 * @return {sap.m.ComboBox} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createComboBox = function(mSettings) {
		var oControl = null,
			oConfig = this._oParent.data("configdata"), // optional call-back to layout the text as unit for unit of measure
			mNames = {
				width: true,
				textAlign: true,
				placeholder: true,
				tooltip: true,
				name: true
			},
			mAttributes = this.createAttributes("selectedKey", this._oMetaData.property, mNames);

		mAttributes.selectionChange = this._oHelper.getSelectionChangeHandler(this._oParent);
		mAttributes.change = function(oEvent) {

			if (oEvent.getParameter("itemPressed")) {
				return;
			}

			var sValue = oEvent.getSource().getSelectedKey();

			this._oParent.fireChange({
				value: sValue,
				newValue: sValue
			});
		}.bind(this);

		// ensure that combo box always takes maximum width.
		if (mAttributes.width === "") {
			mAttributes.width = "100%";
		}

		if (mSettings.edit) {
			oControl = new ComboBox(this._oParent.getId() + "-comboBoxEdit", mAttributes);
		} else {
			oControl = this._createDisplayedComboBox(mAttributes);
		}

		if (oConfig && oConfig.configdata && oConfig.configdata.onText) {
			oConfig.configdata.onText(oControl);
		}

		return {
			control: oControl,
			onCreate: "_onCreate",
			params: {
				valuehelp: {
					annotation: mSettings.valueHelp.annotation,
					aggregation: "items",
					noDialog: mSettings.valueHelp.noDialog,
					noTypeAhead: mSettings.valueHelp.noTypeAhead
				},
				getValue: "getSelectedKey",
				type: {
					type: mAttributes.selectedKey.type,
					property: this._oMetaData.property
				}
			}
		};
	};

	/**
	 * Creates an instance of <code>sap.ui.comp.smartfield.DisplayComboBox</code> but with an adapted <code>sap.m.Text</code>
	 * renderer. The rendered is basically taken over and adapted from <code>sap.m.TextRenderer</code>.
	 *
	 * @param {map} mAttributes control specific attributes
	 * @returns {sap.ui.comp.smartfield.DisplayComboBox} The new control instance
	 * @private
	 */
	ODataControlFactory.prototype._createDisplayedComboBox = function(mAttributes) {

		var DisplayComboBox = ComboBox.extend("sap.ui.comp.smartfield.DisplayComboBox", {
			metadata: {
				library: "sap.ui.comp"
			},
			renderer: function(oRm, oControl) {

				// coding adapted from sap.m.Text renderer
				var sWidth = oControl.getWidth(), sText = oControl.getValue(), sTextDir = oControl.getTextDirection(), sTextAlign = oControl.getTextAlign();

				sText.replace(/\r\n/g, "\n"); // normalize text

				// start writing html
				oRm.write("<span");
				oRm.writeControlData(oControl);
				oRm.addClass("sapMText");
				oRm.addClass("sapUiSelectable");

				// write style and attributes
				if (sWidth) {
					oRm.addStyle("width", sWidth);
				} else {
					oRm.addClass("sapMTextMaxWidth");
				}

				if (sTextDir !== sap.ui.core.TextDirection.Inherit) {
					oRm.writeAttribute("dir", sTextDir.toLowerCase());
				}

				if (sTextAlign) {
					sTextAlign = Renderer.getTextAlign(sTextAlign, sTextDir);
					if (sTextAlign) {
						oRm.addStyle("text-align", sTextAlign);
					}
				}

				// finish writing html
				oRm.writeClasses();
				oRm.writeStyles();
				oRm.write(">");

				oRm.writeEscaped(sText);

				// finalize
				oRm.write("</span>");
			},
			updateDomValue: function(sValue) {

				if (!this.isActive()) {
					return this;
				}

				// respect to max length
				sValue = this._getInputValue(sValue);

				// update the DOM value when necessary
				// otherwise cursor can goto end of text unnecessarily
				if (this.$().text() !== sValue) {
					this.$().text(sValue);

					// dom value updated other than value property
					this._bCheckDomValue = true;
				}

				return this;
			},
			getValue: function() {
				return this.getProperty("value");
			},
			getFocusDomRef: function() {
				return this.getDomRef();
			},
			getEditable: function() {
				return false;
			}
		});

		return new DisplayComboBox(this._oParent.getId() + "-comboBoxDisp", mAttributes);
	};

	/**
	 * Creates an instance of <code>sap.m.Select</code> based on OData meta data.
	 *
	 * @param {object} oValueHelp the value help configuration
	 * @param {object} oValueHelp.annotation the value help annotation
	 * @param {boolean} oValueHelp.noDialog if set to <code>true</code> the creation of a value help dialog is omitted
	 * @param {boolean} oValueHelp.noTypeAhead if set to <code>true</code> the type ahead functionality is omitted
	 * @return {sap.m.Select} the new control instance
	 * @private
	 */
	ODataControlFactory.prototype._createSelect = function(oValueHelp) {
		var mNames = {
			width: true,
			name: true
		},
		mAttributes = this.createAttributes("selectedKey", this._oMetaData.property, mNames);
		mAttributes.change = this._oHelper.getSelectionChangeHandler(this._oParent);

		// BCP: 1680012515
		mAttributes.forceSelection = false;

		if (mAttributes.width === "") {
			mAttributes.width = "100%";
		}

		return {
			control: new Select(this._oParent.getId() + "-select", mAttributes),
			onCreate: "_onCreate",
			params: {
				valuehelp: {
					annotation: oValueHelp.annotation,
					aggregation: "items",
					noDialog: oValueHelp.noDialog,
					noTypeAhead: oValueHelp.noTypeAhead
				},
				getValue: "getSelectedKey",
				type: {
					type: mAttributes.selectedKey.type,
					property: this._oMetaData.property
				}
			}
		};
	};

	/**
	 * Creates an instance of <code>sap.m.CheckBox</code> based on OData meta data. The Edm.Type of the property is <code>Edm.String</code> with
	 * <code>maxLength</code> <code>1</code>.
	 *
	 * @return {sap.m.CheckBox} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createCheckBox = function() {
		var mAttributes = this.createAttributes("selected", null, {}, {
			event: "select",
			parameter: "selected"
		});
		mAttributes.editable = (this._oParent.getEditable() && this._oParent.getEnabled() && this._oParent.getContextEditable());
		mAttributes.selected.type = this._oTypes.getAbapBoolean();

		return {
			control: new CheckBox(this._oParent.getId() + "-cBox", mAttributes),
			onCreate: "_onCreate",
			params: {
				getValue: "getSelected"
			}
		};
	};

	/**
	 * Creates a control instance based on OData meta data to edit a model property of type <code>Edm.DateTime</code>. Either an instance of
	 * <code>sap.m.DateTimePicker</code> is returned or <code>sap.m.DatePicker</code>, if the attribute <code>display-format</code> of the
	 * OData property the control is bound to has the value <code>Date</code> or the control configuration is accordingly.
	 *
	 * @return {sap.ui.core.Control} The new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmDateTime = function() {
		var mNames = {
				width: true,
				textAlign: true,
				placeholder: true,
				name: true
			},
			mAttributes = this.createAttributes(null, this._oMetaData.property, mNames, {
				event: "change",
				parameter: "value"
			}),
			mOptions = this.getFormatSettings("dateFormatSettings");

		// check whether a date picker has been configured.
		if (this._oSelector.checkDatePicker()) {
			mAttributes.value = {
				path: this._oMetaData.path,
				type: this._oTypes.getType(this._oMetaData.property, mOptions, {
					displayFormat: "Date"
				}),
				model: this._oMetaData.model
			};

			// set display format to keep data type and date picker control "in sync".
			if (mOptions && mOptions.style) {
				mAttributes.displayFormat = mOptions.style;
			}

			return {
				control: new DatePicker(this._oParent.getId() + "-datePicker", mAttributes),
				onCreate: "_onCreate",
				params: {
					getValue: "getValue",
					type: {
						type: mAttributes.value.type,
						property: this._oMetaData.property
					}
				}
			};
		}

		mAttributes.value = {
			path: this._oMetaData.path,
			model: this._oMetaData.model,
			type: this._oTypes.getType(this._oMetaData.property, mOptions)
		};

		return {
			control: new DateTimePicker(this._oParent.getId() + "-input", mAttributes),
			onCreate: "_onCreate",
			params: {
				getValue: "getValue",
				type: {
					type: mAttributes.value.type,
					property: this._oMetaData.property
				}
			}
		};
	};

	/**
	 * Creates a control instance based on OData meta data to edit a model property of type <code>Edm.DateTimeOffset</code>.
	 *
	 * @return {sap.m.DateTimePicker} The new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmDateTimeOffset = function() {
		var mOptions = this.getFormatSettings("dateFormatSettings");

		// The UTC format option of the DateTimeOffset data type class should always be set to false for properties
		// typed as Edm.DateTimeOffset, as the time zone should be always UTC.
		// If the UTC setting provided by the application through custom data is set to true, it should NOT be passed to
		// the DateTimeOffset data type class as format option, because the date should be parsed and formatted as local
		// time zone instead of UTC.
		if (mOptions) {
			mOptions.UTC = false;
		}

		var mNames = {
			width: true,
			textAlign: true,
			placeholder: true,
			name: true
		};
		var mAttributes = this.createAttributes(null, this._oMetaData.property, mNames, {
			event: "change",
			parameter: "value"
		});
		mAttributes.value = {
			model: this._oMetaData.model,
			path: this._oMetaData.path,
			type: this._oTypes.getType(this._oMetaData.property, mOptions)
		};

		return {
			control: new DateTimePicker(this._oParent.getId() + "-input", mAttributes),
			onCreate: "_onCreate",
			params: {
				getValue: "getValue",
				type: {
					type: mAttributes.value.type,
					property: this._oMetaData.property
				}
			}
		};
	};

	/**
	 * Creates a control instance based on OData meta data to edit a model property that is of a numeric <code>Edm type</code>.
	 *
	 * @return {sap.m.Input} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmNumeric = function() {
		var mNames = {
			width: true,
			textAlign: true,
			placeholder: true,
			name: true
		},
		mAttributes = this.createAttributes("value", this._oMetaData.property, mNames, {
			event: "change",
			parameter: "value"
		});

		if (this._oParent.isContextTable() && sap.ui.getCore().getConfiguration().getRTL()) {
			mAttributes.textDirection = "LTR";
		}

		return {
			control: new Input(this._oParent.getId() + "-input", mAttributes),
			onCreate: "_onCreate",
			params: {
				getValue: "getValue",
				type: {
					type: mAttributes.value.type,
					property: this._oMetaData.property
				}
			}
		};
	};

	/**
	 * Creates a control instance based on OData meta data to edit a model property that represents a unit of measure.
	 *
	 * @return {sap.m.Input} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmUOM = function() {
		var mAttributes = this._createEdmUOMAttributes(), // create the text input field for the amount
			oObject = this._oParent.getObjectBinding(this._oMetaData.model),
			bRTL = sap.ui.getCore().getConfiguration().getRTL(),
			bRTLInTable = bRTL && this._oParent.isContextTable(),
			sSmartFieldID = this._oParent.getId(),
			oType;

		this.addObjectBinding(mAttributes, oObject);

		if (bRTLInTable) {
			mAttributes.textDirection = "LTR";
		}

		var oInput = new Input(sSmartFieldID + "-input", mAttributes);

		// if the unit is not to be displayed, just return the input for the amount.
		if (this._oParent.data("suppressUnit") === "true") {
			var mParams = {
				getValue: "getValue"
			};

			// if not currency-code, the type has to be completed.
			if (!this._oHelper.oAnnotation.isCurrency(this._oMetaData.annotations.uom.property.property)) {
				mParams.type = {
					type: mAttributes.value.type,
					property: this._oMetaData.property
				};
			}

			return {
				control: oInput,
				onCreate: "_onCreate",
				params: mParams
			};
		}

		// if not currency-code, the type has to be completed.
		if (!this._oHelper.oAnnotation.isCurrency(this._oMetaData.annotations.uom.property.property)) {
			oType = {
				type: mAttributes.value.type,
				property: this._oMetaData.property
			};
		}

		// create the unit control as smart field.
		var sPath = this._oHelper.getUOMPath(this._oMetaData);
		mAttributes = {
			value: {
				model: this._oMetaData.model,
				path: sPath
			},
			change: this._oHelper.getUOMChangeHandler(this._oParent, true),
			textAlign: this._getEdmUOMTextAlignment()
		};
		this.addObjectBinding(mAttributes, oObject);
		this.mapBindings(mAttributes, {
			"uomEditable": "editable",
			"uomEnabled": "enabled",
			"uomVisible": "visible",
			"mandatory": "mandatory",
			"contextEditable": "contextEditable"
		});

		if (this._oParent.getConfiguration()) {
			mAttributes.configuration = new sap.ui.comp.smartfield.Configuration({
				preventInitialDataFetchInValueHelpDialog: this._getPreventInitialDataFetchInVHDialog()
			});
		}

		var oSmartFieldText = new sap.ui.comp.smartfield.SmartField(sSmartFieldID + "-sfEdit", mAttributes);
		oSmartFieldText.data("configdata", {
			"configdata": {
				isInnerControl: true,
				isUOM: !this._oParent.data("configdata"),
				model: this._oMetaData.model,
				navigationPath: this._oMetaData.annotations.uom.navigationPath || null,
				path: sPath,
				entitySetObject: this._oMetaData.annotations.uom.entitySet,
				entityType: this._oMetaData.annotations.uom.entityType,
				property: this._oMetaData.annotations.uom.property,
				annotations: {
					valuelist: this._oMetaData.annotations.valuelistuom,
					valuelistType: this._oMetaData.annotations.uom.annotations.valuelistType,
					text: this._oMetaData.annotations.textuom
				},
				modelObject: this._oMetaData.modelObject || this._oModel,
				onText: function(oInnerControl) {
					oInput.setLayoutData(new FlexItemData({
						growFactor: 1
					}));
					oSmartFieldText.setLayoutData(new FlexItemData({
						shrinkFactor: 0,
						styleClass: "sapUiCompSmartFieldFlexItemUnitDisplay"
					}));

					// mark the unit.
					if (oInnerControl) {

						if (bRTLInTable && (typeof oInnerControl.setTextDirection === "function")) {
							oInnerControl.setTextDirection("LTR");
						}

						oInnerControl.addStyleClass("sapUiCompSmartFieldUnit");
					}
				},
				onInput: function(oInnerControl) {
					oInput.setLayoutData(new FlexItemData({
						growFactor: 1
					}));
					oSmartFieldText.setLayoutData(new FlexItemData({
						growFactor: 0,
						styleClass: "sapUiCompSmartFieldFlexItemUnitEdit"
					}));

					// mark the unit.
					if (oInnerControl) {

						if (bRTLInTable && (typeof oInnerControl.setTextDirection === "function")) {
							oInnerControl.setTextDirection("LTR");
						}

						oInnerControl.addStyleClass("sapUiCompSmartFieldUnit");
					}
				}
			}
		});

		oSmartFieldText.data("errorCheck", "setComplexClientErrorSecondOperandNested");
		oInput.addAriaLabelledBy(oSmartFieldText);
		oInput.addStyleClass("smartFieldPaddingRight");
		oInput.addStyleClass("sapUiCompSmartFieldValue");

		var oHBox = new HBox({
			justifyContent: FlexJustifyContent.End,
			items: [oInput, oSmartFieldText],
			fitContainer: true,
			width: this._oParent.getWidth()
		});

		// add style for nested smart field, especially display case (text box).
		oHBox.addStyleClass("sapUiCompUOM");
		oHBox.enhanceAccessibilityState = function(oElement, mAriaProps) {this._oParent.enhanceAccessibilityState(oElement, mAriaProps); }.bind(this);

		if (this._oParent.isContextTable()) {

			if (bRTLInTable) {
				oHBox.addStyleClass("sapUiCompDirectionLTR");
			}

			oHBox.addStyleClass("sapUiCompUOMInTable");

			if (this._oParent.getMode() !== "edit") {
				oHBox.addStyleClass("sapUiCompUOMInTableDisplay");
			}
		}

		return {
			control: oHBox,
			onCreate: "_onCreateUOM",
			params: {
				getValue: true,
				valuehelp: true,
				type: oType
			}
		};
	};

	/**
	 * Creates the arguments for construction call for the unit of measure.
	 *
	 * @return {map} the arguments for construction call for the unit of measure.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmUOMAttributes = function() {
		var mAttributes = {
			textAlign: this._getEdmUOMTextAlignment(),
			placeholder: this.getAttribute("placeholder"),
			name: this.getAttribute("name"),
			change: this._oHelper.getUOMChangeHandler(this._oParent)
		};

		if (this._oMetaData.annotations.uom && this._oHelper.oAnnotation.isCurrency(this._oMetaData.annotations.uom.property.property)) {
			mAttributes.value = {
				parts: [
					{
						path: this._oMetaData.path
					}, {
						path: this._oHelper.getUOMPath(this._oMetaData)
					}
				],
				model: this._oMetaData.model,
				type: this._oTypes.getCurrencyType(this._oMetaData.property)
			};
		} else {
			mAttributes.value = {
				model: this._oMetaData.model,
				path: this._oMetaData.path,
				type: this._oTypes.getType(this._oMetaData.property)
			};
		}

		return mAttributes;
	};

	/**
	 * Creates the <code>textAlignment</code> attribute value for unit of measure use cases.
	 *
	 * @returns {string} <code>textAlignment</code> attribute value for unit of measure use cases.
	 * @private
	 */
	ODataControlFactory.prototype._getEdmUOMTextAlignment = function() {
		var sAlignment = this.getAttribute("textAlign");

		if (!sAlignment) {
			sAlignment = TextAlign.Initial;
		}

		if (sAlignment === TextAlign.Initial) {

			if (this._oParent.isContextTable()) {
				return TextAlign.End;
			}

			return TextAlign.Begin;
		}

		return sAlignment;
	};

	/**
	 * Creates a control instance based on OData meta data to display a model property that represents a unit of measure.
	 *
	 * @return {sap.m.Input} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmUOMDisplay = function() {
		var that = this,
			sPath = this._oHelper.getUOMPath(this._oMetaData),
			sAlign = this._getEdmUOMTextAlignment(),
			oSmartFieldText = null,
			oEdmProperty = this.getEdmProperty(),
			bRTLInTable = this._oParent.isContextTable() && sap.ui.getCore().getConfiguration().getRTL();

		var mAttributes = {
			text: {
				parts: [
					{
						path: this._oMetaData.path,
						type: this._oTypes.getType(this._oMetaData.property)
					}, {
						path: sPath
					}
				],
				model: this._oMetaData.model,
				formatter: this._oTypes.getDisplayFormatter(oEdmProperty, {
					currency: this._oHelper.oAnnotation.isCurrency(oEdmProperty),
					mask: this._oHelper.oAnnotation.isMasked(oEdmProperty)
				}),
				useRawValues: true
			},
			textAlign: sAlign
		};

		if (bRTLInTable) {
			mAttributes.textDirection = "LTR";
		}

		var oObject = this._oParent.getObjectBinding(this._oMetaData.model);
		this.addObjectBinding(mAttributes, oObject);
		var oText = new Text(this._oParent.getId() + "-text", mAttributes);
		sPath = this._oHelper.getUOMPath(this._oMetaData);
		mAttributes = {
			value: {
				model: this._oMetaData.model,
				path: sPath
			},
			change: this._oHelper.getUOMChangeHandler(this._oParent, true),
			textAlign: this._getEdmUOMTextAlignment()
		};
		this.addObjectBinding(mAttributes, oObject);
		this.mapBindings(mAttributes, {
			"uomEditable": "editable",
			"uomEnabled": "enabled",
			"uomVisible": "visible",
			"mandatory": "mandatory",
			"contextEditable": "contextEditable"
		});
		oText.addStyleClass("smartFieldPaddingRight");
		oText.addStyleClass("sapUiCompSmartFieldValue");

		if (!this._checkSuppressUnit()) {
			oSmartFieldText = new sap.ui.comp.smartfield.SmartField(this._oParent.getId() + "-sfDisp", mAttributes);
			oSmartFieldText.data("configdata", {
				"configdata": {
					isInnerControl: true,
					isUOM: !this._oParent.data("configdata"),
					model: this._oMetaData.model,
					navigationPath: this._oMetaData.annotations.uom.navigationPath || null,
					path: sPath,
					entitySetObject: this._oMetaData.annotations.uom.entitySet,
					entityType: this._oMetaData.annotations.uom.entityType,
					property: this._oMetaData.annotations.uom.property,
					annotations: {
						valuelist: this._oMetaData.annotations.valuelistuom,
						text: this._oMetaData.annotations.textuom
					},
					modelObject: this._oMetaData.modelObject || this._oModel,
					onText: function(oInnerControl) {

						// mark the unit.
						if (oInnerControl) {

							// do not wrap for UoM. Incident ID : 1570841150
							if (oInnerControl.setWrapping) {
								oInnerControl.setWrapping(false);
							}

							if (bRTLInTable && (typeof oInnerControl.setTextDirection === "function")) {
								oInnerControl.setTextDirection("LTR");
							}

							oInnerControl.addStyleClass("sapUiCompSmartFieldUnit");
						}
					},
					onInput: function(oInnerControl) {
						oText.setLayoutData(new FlexItemData({
							growFactor: 0
						}));
						oSmartFieldText.setLayoutData(new FlexItemData({
							growFactor: 0
						}));

						// mark the unit.
						if (oInnerControl) {

							if (bRTLInTable && (typeof oInnerControl.setTextDirection === "function")) {
								oInnerControl.setTextDirection("LTR");
							}

							oInnerControl.addStyleClass("sapUiCompSmartFieldUnit");
						}
					},
					getContextEditable: function() {
						return that._oParent.getContextEditable();
					}
				}
			});

			oSmartFieldText.data("errorCheck", "setComplexClientErrorSecondOperandNested");
			var oHBox = new HBox({
				items: [
					oText, oSmartFieldText
				],
				fitContainer: true,
				width: this._oParent.getWidth()
			});
			oHBox.enhanceAccessibilityState = function(oElement, mAriaProps) {this._oParent.enhanceAccessibilityState(oElement, mAriaProps); }.bind(this);

			if (this._oParent.isContextTable()) {
				oHBox.setJustifyContent("End");
				this._oParent.addStyleClass("sapUiCompUOMInTable");

				if (bRTLInTable) {
					oHBox.addStyleClass("sapUiCompDirectionLTR");
				}

				oHBox.addStyleClass("sapUiCompUOMInTable");
			}

			return {
				control: oHBox
			};
		}

		return {
			control: oText
		};
	};

	/**
	 * Checks whether the unit in unit of measure has to be suppressed in display.
	 *
	 * @returns {boolean} <code>true</code>, if the unit in unit of measure has to be suppressed in display, <code>false</code> otherwise
	 * @private
	 */
	ODataControlFactory.prototype._checkSuppressUnit = function() {

		if (this._oParent.data("suppressUnit") === "true") {
			return true;
		}

		var oInfo = this._oParent.getBindingInfo("uomVisible");
		return (!oInfo && !this._oParent.getUomVisible());
	};

	/**
	 * Creates a control instance based on OData meta data to display a model property that represents a unit of measure.
	 *
	 * @return {sap.m.Input} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmUOMObjectStatus = function() {
		var oObject,
			oObjectStatus,
			oEdmProperty = this.getEdmProperty(),
			fFormat = this._oTypes.getDisplayFormatter(oEdmProperty, {
				currency: this._oHelper.oAnnotation.isCurrency(oEdmProperty)
			}),
			sPath = this._oHelper.getUOMPath(this._oMetaData),
			mAttributes = {
				text: {
					parts: [
						{
							path: this._oMetaData.path,
							type: this._oTypes.getType(this._oMetaData.property)
						}, {
							path: sPath
						}
					],
					formatter: function() {
						var sResult = fFormat.apply(this, arguments);
						return sResult + arguments[1];
					},
					useRawValues: true
				}
			};

		this._addObjectStatusAttributes(mAttributes);

		oObject = this._oParent.getObjectBinding(this._oMetaData.model);
		this.addObjectBinding(mAttributes, oObject);
		oObjectStatus = new ObjectStatus(this._oParent.getId() + "-objStatus", mAttributes);

		// add style for nested smart field, especially display case (text box).
		oObjectStatus.addStyleClass("sapUiCompUOM");

		return {
			control: oObjectStatus
		};
	};

	/**
	 * Creates a control instance based on OData meta data to display a model property that represents a unit of measure.
	 *
	 * @return {sap.m.Input} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmUOMObjectNumber = function() {
		var mAttributes,
			oObject,
			oObjectNumber,
			sAlign = this._getEdmUOMTextAlignment();

		// create the attributes for the currency.
		if (this._oMetaData.annotations.uom && this._oHelper.oAnnotation.isCurrency(this._oMetaData.annotations.uom.property.property)) {
			mAttributes = {
				number: {
					parts: [
						{
							path: this._oMetaData.path
						}, {
							path: this._oHelper.getUOMPath(this._oMetaData)
						}
					],
					type: this._oTypes.getCurrencyType(this._oMetaData.property)
				},
				unit: {
					path: this._oHelper.getUOMPath(this._oMetaData)
				},
				model: this._oMetaData.model,
				textAlign: sAlign
			};
		} else {
			mAttributes = {
				model: this._oMetaData.model,
				number: {
					path: this._oMetaData.path,
					type: this._oTypes.getType(this._oMetaData.property)
				},
				unit: {
					path: this._oHelper.getUOMPath(this._oMetaData)
				},
				textAlign: sAlign
			};
		}

		oObject = this._oParent.getObjectBinding(this._oMetaData.model);
		this.addObjectBinding(mAttributes, oObject);
		oObjectNumber = new ObjectNumber(this._oParent.getId() + "-objNumber", mAttributes);

		// add style for nested smart field, especially display case (text box).
		oObjectNumber.addStyleClass("sapUiCompUOM");

		return {
			control: oObjectNumber
		};
	};

	/**
	 * Creates a control instance based on OData meta data.
	 *
	 * @return {sap.ui.core.Control} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmSemantic = function() {
		var mAttributes,
			oTextAnnotation,
			sUoMPath,
			that = this,
			oInfo = this._oParent.getBindingInfo("value"),
			sPath = oInfo.parts[0].path,
			oEdmProperty = this.getEdmProperty(),
			sLabel = this._oHelper.oAnnotation.getLabel(oEdmProperty);

		if (this._oMetaData.annotations.lineitem && this._oMetaData.annotations.lineitem.labels && this._oMetaData.annotations.lineitem.labels[sPath]) {
			sLabel = this._oMetaData.annotations.lineitem.labels[sPath];
		}

		mAttributes = {
			semanticObject: this._oMetaData.annotations.semantic.defaultSemanticObject,
			additionalSemanticObjects: this._oMetaData.annotations.semantic.additionalSemanticObjects,
			semanticObjectLabel: sLabel,
			fieldName: sPath,
			width: this.getAttribute("width"),
			createControlCallback: function() {
				var oControl = this.createControl(true);

				if (oControl) {
					return oControl.control;
				}
				return null;
			}.bind(this)
		};

		oTextAnnotation = this._oHelper.oAnnotation.getText(oEdmProperty);

		if (oTextAnnotation) {
			mAttributes.text = {
				parts: [
					this._oMetaData.path, this._oHelper.getEdmDisplayPath(this._oMetaData)
				],
				model: this._oMetaData.model,
				formatter: function(sId, sDescription) {
					if (sId && sDescription) {
						return that._formatDisplayBehaviour("defaultInputFieldDisplayBehaviour", sId, sDescription);
					}

					return sId ? sId : "";
				}
			};
			mAttributes.navigationTargetsObtained = function(oEvent) {
				var oBinding = this.getBinding("text");

				if (!jQuery.isArray(oBinding.getValue())) {
					oEvent.getParameters().show();
					return;
				}

				var aValues = oBinding.getValue();
				var sDisplay = that._getDisplayBehaviourConfiguration("defaultInputFieldDisplayBehaviour") || "idOnly";
				var oTexts = FormatUtil.getTextsFromDisplayBehaviour(sDisplay, aValues[0], aValues[1]);
				var oMainNavigation = oEvent.getParameters().mainNavigation;

				// 'mainNavigation' might be undefined
				if (oMainNavigation) {
					oMainNavigation.setDescription(oTexts.secondText);
				}

				oEvent.getParameters().show(oTexts.firstText, oMainNavigation, undefined, undefined);
			};
		} else {
			sUoMPath = this._oHelper.getUOMPath(this._oMetaData);

			if (sUoMPath) {
				mAttributes.text = {
					parts: [
						{
							path: sPath
						}, {
							path: sUoMPath
						}
					],
					model: this._oMetaData.model,
					formatter: this._oHelper.oAnnotation.isCurrency(this._oMetaData.annotations.uom.property.property) ? FormatUtil.getAmountCurrencyFormatter() : FormatUtil.getMeasureUnitFormatter(),
					useRawValues: true
				};
				mAttributes.uom = {
					path: sUoMPath
				};
			} else {
				mAttributes.text = {
					path: sPath,
					model: this._oMetaData.model
				};
			}
		}

		return {
			control: new SmartLink(this._oParent.getId() + "-sl", mAttributes),
			onCreate: "_onCreate",
			params: {
				getValue: "getInnerControlValue"
			}
		};
	};

	/**
	 * Creates a control instance based on OData meta data.
	 *
	 * @param {map} mNames map of bind-able attributes
	 * @return {sap.ui.core.Control} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createMultiLineText = function(mNames) {
		var mAttributes = this.createAttributes("value", this._oMetaData.property, mNames);
		var mOptions = this.getFormatSettings("multiLineSettings");
		mAttributes = jQuery.extend(true, mAttributes, mOptions);

		if (this._oParent.isContextTable()) {
			mAttributes.width = "100%";
		}

		var oControl = new TextArea(this._oParent.getId() + "-textArea", mAttributes);

		// add optional upper case conversion.
		this._handleEventingForEdmString(oControl, this._oMetaData.property);

		return {
			control: oControl,
			onCreate: "_onCreate",
			params: {
				type: {
					type: mAttributes.value.type,
					property: this._oMetaData.property
				},
				getValue: "getValue"
			}
		};

	};

	/*
	 * Gets the metadata property.
	 *
	 * @returns {object} The metadata property
	 * @protected
	 * @since 1.48
	 */
	ODataControlFactory.prototype.getEdmProperty = function() {
		var oHelper = this._oHelper;

		if (oHelper) {
			return oHelper.getEdmProperty(this._oMetaData);
		}

		return null;
	};

	ODataControlFactory.prototype.getEntityType = function() {

		if (this._oMetaData) {
			return this._oMetaData.entityType;
		}

		return null;
	};

	/**
	 * Checks whether a link needs to be created.
	 *
	 * @returns {boolean} <code>true</code>, if a link needs to be created, <code>false</code> otherwise.
	 * @private
	 */
	ODataControlFactory.prototype._checkLink = function() {
		var oInfo = this._oParent.getBindingInfo("url"),
			oProperty = this.getEdmProperty();

		if (oInfo || this._oParent.getUrl() || ODataControlFactory.isSpecialLink(oProperty)) {
			return true;
		}

		return this._oParent.hasListeners("press");
	};

	/**
	 * Creates a control instance based on OData meta data.
	 *
	 * @return {sap.ui.core.Control} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createLink = function() {
		var that = this;
		var mAttributes = {
			text: "",
			href: ""
		},
		oParent = this._oParent,
		oBindingInfo = oParent.getBindingInfo("url");

		if (oBindingInfo) {
			mAttributes.href = this._oBinding.toBinding(oBindingInfo);
		} else {
			mAttributes.href = oParent.getUrl();
		}

		if (oParent.hasListeners("press")) {
			mAttributes.press = function(oEvent) {

				// block href default handling
				oEvent.preventDefault();
				oParent.firePress(oEvent);
			};
		}

		oBindingInfo = oParent.getBindingInfo("value");

		if (oBindingInfo) {
			var oMetaData = this._oMetaData, sPath = oMetaData.path, oProperty = oMetaData.property.property;

			// text may be Edm.String and may have a text annotation
			if (oMetaData.annotations.text && (oProperty.type === "Edm.String")) {
				mAttributes.text = {
					parts: [
						oMetaData.path,
						this._oHelper.getEdmDisplayPath(oMetaData)
					],
					formatter: this._formatText.bind(that)
				};
			} else if (ODataControlFactory.isSpecialLink(oProperty)) {
				var fnFormatter = ODataControlFactory[ODataControlFactory._getLinkFormatterFunctionName(oProperty)];

				mAttributes.text = {
					path: sPath
				};

				mAttributes.href = {
					path: sPath,
					formatter: null
				};

				if (typeof fnFormatter === "function") {
					mAttributes.href.formatter = fnFormatter;
				}
			} else {
				mAttributes.text = this._oBinding.toBinding(oBindingInfo);
			}
		} else {
			mAttributes.text = oParent.getValue();
		}

		return {
			control: new Link(oParent.getId() + "-link", mAttributes),
			onCreate: "_onCreate",
			params: {
				noValidation: true
			}
		};
	};

	ODataControlFactory.isSpecialLink = function(oProperty) {
		return MetadataAnalyser.isEmailAddress(oProperty) || MetadataAnalyser.isPhoneNumber(oProperty) || MetadataAnalyser.isURL(oProperty);
	};

	ODataControlFactory._getLinkFormatterFunctionName = function(oProperty) {
		return "_format" + MetadataAnalyser.getLinkDisplayFormat(oProperty);
	};

	ODataControlFactory._formatEmailAddress = function(sEmail) {
		return "mailto:" + sEmail;
	};

	ODataControlFactory._formatPhoneNumber = function(sPhone) {
		return "tel:" + sPhone;
	};

	ODataControlFactory._formatURL = function(sURL) {
		return jQuery.sap.validateUrl(sURL) ? sURL : "";
	};

	ODataControlFactory.prototype._formatText = function(sId, sDescription) {

		if (sId && sDescription) {
			return this._formatDisplayBehaviour("defaultInputFieldDisplayBehaviour", sId, sDescription);
		}

		return sId || "";
	};

	/**
	 * Creates a control instance based on OData meta data to edit a model property that is of type <code>Edm.Boolean</code>
	 *
	 * @return {sap.m.CheckBox} the new control instance.
	 * @private
	 */
	ODataControlFactory.prototype._createEdmBoolean = function() {
		var oControlSelector = this._oSelector.checkComboBox(),
			bEditable = this._oParent.getEditable() && this._oParent.getEnabled() && this._oParent.getContextEditable(),
			that = this,
			mParams = null,
			mAttributes,
			oControl;

		if (oControlSelector.combobox) {

			if (bEditable || this._oParent.getFetchValueListReadOnly()) {
				return this._createComboBox({
					valueHelp: {
						annotation: oControlSelector.annotation,
						noDialog: true,
						noTypeAhead: true
					},
					edit: bEditable
				});
			}
		}

		if (bEditable) {

			mAttributes = this.createAttributes("selected", this._oMetaData.property, {}, {
				event: "select",
				parameter: "selected"
			});

			oControl = new CheckBox(this._oParent.getId() + "-cBoxBool", mAttributes);
			mParams = {
				getValue: "getSelected"
			};

		} else {

			mAttributes = this.createAttributes("text", this._oMetaData.property, {
				width: true,
				textAlign: true
			});

			mAttributes.text = {
				model: this._oMetaData.model,
				path: this._oMetaData.path,
				formatter: function(bValue) {
					return that._formatDisplayBehaviour("defaultCheckBoxDisplayBehaviour", bValue);
				}
			};

			oControl = new Text(this._oParent.getId() + "-text", mAttributes);
		}

		return {
			control: oControl,
			onCreate: "_onCreate",
			params: mParams
		};
	};

	/**
	 * Returns the name of a method to create a control.
	 *
	 * @param {boolean} bBlockSmartLinkCreation if true, SmartLink will not be created
	 * @return {string} the name of the factory method to create the control.
	 * @private
	 */
	ODataControlFactory.prototype._getCreator = function(bBlockSmartLinkCreation) {

		// make sure that no exceptions occur, if the property is not valid
		// => necessary for extensibility use cases, if an extension field has been deleted and the UI has not yet been adapted.
		return this._oSelector.getCreator(bBlockSmartLinkCreation);
	};

	/**
	 * Event handler, that is invoked after successful creation of a nested control.
	 *
	 * @param {sap.ui.core.Control} oControl the new control
	 * @param {map} mParams parameters to further define the behavior of the event handler
	 * @param {function} mParams.getValue optional call-back to get the current value from the current control
	 * @param {boolean} mParams.valuehelp if set to <code>true</code> a possibly existing value help is attached to the new control
	 * @private
	 */
	ODataControlFactory.prototype._onCreate = function(oControl, mParams) {
		var sGetValue,
			fControl,
			bValidations = true,
			that = this;

		if (mParams) {

			// check for validation.
			if (mParams.noValidation) {
				bValidations = false;
			}

			// add optional value help.
			if (mParams.valuehelp && this.shouldCreateValueHelpForControl(oControl)) {
				this._getValueHelpDialogTitle(mParams.valuehelp);
				mParams.valuehelp["analyser"] = this._oHelper.getAnalyzer(this._oModel || this._oMetaData.modelObject);
				this.createValueHelp(oControl, this.getEdmProperty(), mParams.valuehelp, this._oModel || this._oMetaData.modelObject, function(oEvent) {
					that._oParent.fireValueListChanged({
						"changes": oEvent.mParameters.changes
					});
				});
			}

			// add optional getValue call-back.
			if (mParams.getValue) {
				sGetValue = mParams.getValue;
				mParams.getValue = function() {
					return oControl[sGetValue]();
				};
			}

			// complete the data: add field-control.
			if (mParams.type) {
				fControl = this._oFieldControl.getMandatoryCheck(mParams.type.property);

				if (fControl) {
					mParams.type.type.oFieldControl = fControl;
				}
			}
		}

		// add optional validations.
		if (bValidations) {

			// if the field is a unit in unit of measure, the error check configuration is set.
			// otherwise apply the default.
			this.addValidations(oControl, this._oParent.data("errorCheck") || "setSimpleClientError");

			// add static mandatory check
			if (this._oParent.getMode() !== "display") {
				oControl.attachValidationSuccess(function(oEvent) {
					if (!that._oParent.getValue()) {
						if (that._oMetaData.property && that._oMetaData.property.property && that._oHelper.oAnnotation.isStaticMandatory(that._oMetaData.property.property)) {
							if (oControl.setValueStateText) {
								oControl.setValueStateText(that._oRb.getText("VALUEHELPVALDLG_FIELDMESSAGE"));
								oControl.setValueState(sap.ui.core.ValueState.Error);
								that._oParent.setSimpleClientError(true);
							}
						}
					}
				});
			}
		}

		if (!this._checkUOM()) {
			oControl.addStyleClass("sapUiCompSmartFieldValue");
		}
	};

	/**
	 * Add type-ahead and value help on request.
	 *
	 * @private
	 */
	ODataControlFactory.prototype._createValueHelp = function() {
		var oControl = this._oParent.getContent();

		if (!oControl) {
			return;
		}

		var oValueHelp = {
			annotation: this._oMetaData.annotations.valuelist,
			noDialog: !this._oParent.getShowValueHelp(),
			noTypeAhead: !this._oParent.getShowSuggestion(),
			aggregation: "suggestionRows"
		};

		this._getValueHelpDialogTitle(oValueHelp);
		oValueHelp["analyser"] = this._oHelper.getAnalyzer(this._oModel || this._oMetaData.modelObject);
		this.createValueHelp(oControl, this.getEdmProperty(), oValueHelp, this._oModel || this._oMetaData.modelObject, function(oEvent) {
			this._oParent.fireValueListChanged({
				"changes": oEvent.mParameters.changes
			});
		}.bind(this));
	};

	/**
	 * Checks whether the control was created as unit in unit of measure.
	 *
	 * @returns {boolean} <code>true</code>, if the control was created as unit in unit of measure, <code>false</code> otherwise.
	 * @private
	 */
	ODataControlFactory.prototype._checkUOM = function() {
		var oConfig = this._oParent.data("configdata");

		if (oConfig && oConfig.configdata) {
			if (oConfig.configdata.onInput || oConfig.configdata.onText) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Calculates the title for the value help dialog.
	 *
	 * @param {object} oValueHelp the value help configuration
	 * @param {object} oValueHelp.annotation the value help annotation
	 * @param {string} oValueHelp.aggregation the aggregation to attach the value list to
	 * @param {boolean} oValueHelp.noDialog if set to <code>true</code> the creation of a value help dialog is omitted
	 * @param {boolean} oValueHelp.noTypeAhead if set to <code>true</code> the type ahead functionality is omitted
	 * @param {string} oValueHelp.dialogtitle title for the value help dialog
	 * @private
	 */
	ODataControlFactory.prototype._getValueHelpDialogTitle = function(oValueHelp) {
		oValueHelp.dialogtitle = this._oParent.getTextLabel();

		if (!oValueHelp.dialogtitle) {
			var oEdmProperty = this.getEdmProperty();
			oValueHelp.dialogtitle = this._oHelper.oAnnotation.getLabel(oEdmProperty) || oEdmProperty.name;
		}
	};

	/**
	 * Event handler, that is invoked after successful creation of a nested control.
	 *
	 * @param {sap.ui.core.Control} oControl the new control
	 * @param {map} mParams parameters to further define the behavior of the event handler
	 * @param {function} mParams.getValue optional call-back to get the current value from the current control
	 * @param {boolean} mParams.valuehelp if set to <code>true</code> a possibly existing value help is attached to the new control
	 * @private
	 */
	ODataControlFactory.prototype._onCreateUOM = function(oControl, mParams) {
		var aItems = oControl.getItems(),
			fControl,
			that = this;

		// add validation to amount only.
		this.addValidations(aItems[0], "setComplexClientErrorFirstOperand");

		// add static mandatory check
		if (this._oParent.getMode() !== "display") {
			aItems[0].attachValidationSuccess(function(oEvent) {
				if (!that._oParent.getValue()) {
					if (that._oMetaData.property && that._oMetaData.property.property && that._oHelper.oAnnotation.isStaticMandatory(that._oMetaData.property.property)) {
						if (aItems[0].setValueStateText) {
							aItems[0].setValueStateText(that._oRb.getText("VALUEHELPVALDLG_FIELDMESSAGE"));
							aItems[0].setValueState(sap.ui.core.ValueState.Error);
							that._oParent.setComplexClientErrorFirstOperand(true);
						}
					}
				}
			});
		}

		// add optional value call-back.
		if (mParams && mParams.getValue) {
			mParams.getValue = function() {
				return aItems[0].getValue();
			};
		}

		// add optional unit of measure call-back.
		mParams.uom = function() {
			return aItems[1].getValue();
		};

		mParams.uomset = function(sValue) {
			aItems[1].setValue(sValue);
		};

		// complete the data: add field-control.
		// mind that this is done explicitly only for non currency use-cases.
		if (mParams.type) {
			fControl = this._oFieldControl.getMandatoryCheck(mParams.type.property);

			if (fControl) {
				mParams.type.type.oFieldControl = fControl;
			}
		}
	};

	/**
	 * Binds the properties of the control to formatter functions.
	 *
	 */
	ODataControlFactory.prototype.bind = function() {
		var sComponent = this.getMetadata().getName();
		var fnInit = function(oMetaData, aProperties) {
			try {
				this._init(oMetaData);
				this._setUOMEditState();
				this._bind(aProperties);
			} catch (oError) {
				jQuery.sap.log.error(oError, null, sComponent + ".bind.fnInit");
			}
		}.bind(this);

		if (!this._bInitialized && !this.bPending) {
			this._bInitialized = true;
			var aNames = this._oFieldControl.getBindableAttributes(),
				oConfig = this._oParent.data("configdata");

			if (oConfig && oConfig.configdata) {
				fnInit(this._oMeta, aNames);
			} else if (this._oModel) {
				this.bPending = true;
				var bTextInEditModeSourceValid = this._oParent && this._oParent.isTextInEditModeSourceValid();
				var oPromise = this._oModel.getMetaModel().loaded().then(function onMetaModelLoaded() {

					if (bTextInEditModeSourceValid) {
						this._init(this._oMeta);

						// return a promise to suspend the execution of the next .then() handler function until
						// the value list annotation is loaded
						return this._oHelper.loadValueListAnnotation(this._oMetaData.annotations.valuelist);
					}

					this.bPending = false;
					fnInit(this._oMeta, aNames);
				}.bind(this))
				.catch(function(oError) {
					jQuery.sap.log.error(oError, null, sComponent + ".onMetaModelLoaded");
				});

				if (bTextInEditModeSourceValid) {
					return oPromise.then(function(oValueListAnnotations) {
										this.bPending = false;

										// pass the list annotation to the next .then() handler
										return oValueListAnnotations;
									}.bind(this))
									.then(this._initValueList.bind(this))
									.then(function() {
										this._setUOMEditState();
										this._bind(aNames);
									}.bind(this))
									.catch(function(oError) {
										jQuery.sap.log.error(oError, null, sComponent + ".bind");
									});
				}

				return oPromise;
			}
		}
	};

	/**
	 * Replaces the given bindings by formatter functions.
	 *
	 * @param {array} aBindings current bindings on <code>SmartField</code>
	 * @private
	 */
	ODataControlFactory.prototype._bind = function(aBindings) {
		var mBind,

			// make sure that no exceptions occur, if the property is not valid
			// => necessary for extensibility use cases, if an extension field has been deleted and the UI has not yet been adapted.
			// and if the smart field's value property is not bound, but a URL has to be displayed.
			mFormatters = this._oFieldControl.getControlProperties(this._oMetaData, aBindings);

		for (var n in mFormatters) {
			mBind = this._oBinding.fromFormatter(this._oMetaData.model, mFormatters[n]);
			this._oParent.bindProperty(n, mBind);
		}

		this._addLabelAndQuickInfo();

		// notify that the meta data is available.
		this._oParent.fireInitialise();
	};

	/**
	 * Insert the label and quick-info from meta data
	 */
	ODataControlFactory.prototype._addLabelAndQuickInfo = function() {
		var oProperty = this.getDataProperty();

		oProperty = oProperty.property;//data property contains typePath and property

		var sLabel     = this._oHelper.oAnnotation.getLabel(oProperty);
		var sQuickInfo = this._oHelper.oAnnotation.getQuickInfo(oProperty);

		if (sLabel && this._oParent.isPropertyInitial("textLabel")) {
			this._oParent.setTextLabel(sLabel);
		}

		if (sQuickInfo && this._oParent.isPropertyInitial("tooltipLabel")) {
			this._oParent.setTooltipLabel(sQuickInfo);
		}
	};

	/**
	 * Rebinds properties on this smart field, if the entity instance the smart field is associated with changes its state from existing in main
	 * memory to persistent on data base.
	 *
	 * @private
	 */
	ODataControlFactory.prototype.rebindOnCreated = function() {
		var mBind,

			// make sure that no exceptions occur, if the property is not valid
			// => necessary for extensibility use cases, if an extension field has been deleted and the UI has not yet been adapted.
			// and if the smart field's value property is not bound, but a URL has to be displayed.
			mFormatters = this._oFieldControl.getControlProperties(this._oMetaData, [
				"editable"
			]);

		for (var n in mFormatters) {
			mBind = this._oBinding.fromFormatter(this._oMetaData.model, mFormatters[n]);
			this._oParent.bindProperty(n, mBind);
		}
	};

	/**
	 * Optionally sets a formatter for the uomEditState property.
	 *
	 * @private
	 */
	ODataControlFactory.prototype._setUOMEditState = function() {

		if (this._oFieldControl.hasUomEditState(this._oMetaData)) {
			var oFormatter = this._oFieldControl.getUOMEditState(this._oMetaData);

			if (oFormatter) {
				var mBind = this._oBinding.fromFormatter(this._oMetaData.model, oFormatter);
				this._oParent.bindProperty("uomEditState", mBind);
			}
		}
	};

	/**
	 * Returns the property of the oData
	 *
	 * @return {object} the oData property
	 * @public
	 */
	ODataControlFactory.prototype.getDataProperty = function() {
		return this._oMetaData.property;
	};

	ODataControlFactory.prototype.getDropdownItemKeyType = function(oControl) {
		var sControlMetadataName = oControl.getMetadata().getName();

		if ((sControlMetadataName === "sap.ui.comp.smartfield.DisplayComboBox") ||
			(sControlMetadataName === "sap.m.ComboBox") ||
			(sControlMetadataName === "sap.m.Select")) {

			var oBindingInfo = this._oParent && this._oParent.getBindingInfo("value");
			return (oBindingInfo && oBindingInfo.type) || null;
		}

		return null;
	};

	/**
	 * Returns the currently available meta data.
	 *
	 * @returns {object} the currently available meta data
	 * @public
	 */
	ODataControlFactory.prototype.getMetaData = function() {
		return this._oMetaData;
	};

	/**
	 * Gets the OData helper instance.
	 *
	 * @returns {object} The OData helper instance
	 * @protected
	 */
	ODataControlFactory.prototype.getODataHelper = function() {
		return this._oHelper;
	};

	ODataControlFactory.prototype.destroy = function() {

		if (this._oFieldControl) {
			this._oFieldControl.destroy();
		}

		if (this._oSelector) {
			this._oSelector.destroy();
		}

		if (this._oTypes) {
			this._oTypes.destroy();
		}

		if (this._oHelper) {
			this._oHelper.destroy();
		}

		this._oHelper = null;
		this._oFieldControl = null;
		this._oTypes = null;
		this._oSelector = null;
		this._oMetaData = null;
		ControlFactoryBase.prototype.destroy.apply(this, arguments);
	};

	return ODataControlFactory;
}, true);
