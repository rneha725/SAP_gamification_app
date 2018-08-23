/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
sap.ui.define([
	"jquery.sap.global",
	"../library",
	"sap/ui/core/Control",
	"sap/ui/core/Item",
	"sap/m/Select",
	"sap/ui/comp/smartfield/SmartField",
	"sap/ui/comp/smartfield/SmartLabel",
	"sap/ui/comp/smartfield/ODataControlFactory",
	"sap/ui/model/BindingMode",
	"sap/m/HBox",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/ValueState",
	"sap/m/CheckBox",
	"sap/m/Label",
	"sap/m/Input"
], function (jQuery, library, Control, Item, Select, SmartField, SmartLabel, ODataControlFactory, BindingMode, HBox,
			 NumberFormat, DateFormat, ValueState, CheckBox, Label, Input) {
	"use strict";

	var HackedControlFactory = ODataControlFactory.extend("sap.ui.comp.smartmultiedit.HackedControlFactory");

	HackedControlFactory.prototype.createAttributes = function (sAttribute, oTypeInfo, mNames, oEvent) {
		var mAttributes = ODataControlFactory.prototype.createAttributes.apply(this, arguments);
		if (sAttribute && mAttributes[sAttribute]) {
			mAttributes[sAttribute].mode = BindingMode.OneWay;
		}
		return mAttributes;
	};

	HackedControlFactory.prototype._createEdmUOMAttributes = function () {
		var mAttributes = ODataControlFactory.prototype._createEdmUOMAttributes.apply(this, arguments);
		if (mAttributes.value) {
			mAttributes.value.mode = BindingMode.OneWay;
		}
		return mAttributes;
	};

	HackedControlFactory.prototype._createEdmDateTime = function () {
		var mResult = ODataControlFactory.prototype._createEdmDateTime.apply(this);
		mResult.params.getValue = "getDateValue";
		return mResult;
	};

	HackedControlFactory.prototype._createEdmDateTimeOffset = function () {
		var mResult = ODataControlFactory.prototype._createEdmDateTimeOffset.apply(this);
		mResult.params.getValue = "getDateValue";
		return mResult;
	};

	HackedControlFactory.prototype._createEdmTime = function () {
		var mResult = ODataControlFactory.prototype._createEdmTime.apply(this);
		mResult.params.getValue = "getDateValue";
		return mResult;
	};

	HackedControlFactory.createFromFactory = function (oFactory) {
		if (!oFactory) {
			return null;
		}
		return new HackedControlFactory(oFactory._oModel, oFactory._oParent, oFactory._oMeta);
	};

	var CONTEXT_VALUES_ITEMS_LIMIT = 10;

	/**
	 * Constructor for a new <code>sap.ui.comp.smartmultiedit.Field</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class The SmartMultiEdit.Field control enables you to edit multiple homogeneous objects simultaneously.
	 * It allows you to select a predefined item from a combo box and apply your selection to all objects being edited.<br>
	 * In addition, SmartMultiEdit.Field can handle metadata for a specific OData property when you need to enable
	 * mass editing for multiple contexts. The contexts are handled by the {@link sap.ui.comp.smartmultiedit.Container} control.
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.56.5
	 *
	 * @public
	 * @since 1.52.0
	 * @alias sap.ui.comp.smartmultiedit.Field
	 */
	var Field = Control.extend("sap.ui.comp.smartmultiedit.Field", /** @lends sap.ui.comp.smartmultiedit.Field.prototype **/ {
		metadata: {
			library: "sap.ui.comp",
			designtime: "sap/ui/comp/designtime/smartmultiedit/Field.designtime",
			properties: {
				/**
				 * The OData property name to fetch metadata for.<br>
				 * Please note that this is not a dynamic SAP UI5 property: setting it twice will not result in a new binding.
				 */
				propertyName: {
					type: "string",
					defaultValue: null
				},
				/**
				 * Indicates whether to display applyToEmptyOnly flag.
				 */
				useApplyToEmptyOnly: {
					type: "boolean",
					defaultValue: false
				},
				/**
				 * Indicates whether to check for an existing value in the data model before applying the changes.<br>
				 * Please note that this property does not automatically update the model. It is up to you as the app developer to decide
				 * whether you want to consider this property when updating the model or not.
				 *
				 */
				applyToEmptyOnly: {
					type: "boolean",
					defaultValue: false
				},
				/**
				 * Optional description of the field.
				 */
				description: {
					type: "string",
					defaultValue: null
				}
			},
			aggregations: {
				/**
				 * Optional configuration for <code>SmartField</code>.
				 */
				configuration: {
					type: "sap.ui.comp.smartfield.Configuration",
					multiple: false
				}
			},
			associations: {},
			events: {
				/**
				 * This event is fired when the selection focus moves from one item in the combo box to another.
				 */
				change: {
					parameters: {
						/**
						 * The selected item.
						 */
						selectedItem: {
							type: "sap.ui.core.Item"
						}
					}
				}
			}
		},
		renderer: function (oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.addClass("sapUiCompSmartMultiEditField");
			oRm.writeClasses();
			oRm.write(">");
			oRm.renderControl(oControl._oSelect);

			oRm.write("<div");
			oRm.addClass("sapUiCompSmartMultiEditFieldSFWrapper");
			oRm.writeClasses();
			oRm.write(">");

			oRm.renderControl(oControl._oSmartField);
			oRm.write("</div>");

			if (oControl.getDescription()) {
				oRm.write("<div");
				oRm.addClass("sapUiCompSmartMultiEditSmartFieldDescription");
				oRm.writeClasses();
				oRm.write(">");
				oControl._oDescription.setText(oControl.getDescription());
				oRm.renderControl(oControl._oDescription);
				oRm.write("</div>");
			}

			if (oControl.getUseApplyToEmptyOnly()) {
				oRm.renderControl(oControl._oApplyToEmptyOnlyCheckBox);
			}

			oRm.write("</div>");
		}
	});

	Field.ACTION_ITEM_KEY = {
		KEEP: "keep",
		BLANK: "blank",
		NEW: "new",
		TRUE: "true",
		FALSE: "false"
	};

	Field.prototype.init = function () {
		this._createSelect();
		this._createSpecialSelectItems();
		this._createDescription();
		this._createApplyToEmptyOnlyCheckBox();

		this._oContainer = null;
		this._bNullable = true;
		this._bShowValueHelp = true;
		this._bClientError = null;
		this._oAnnotations = null;
		this._bComboBox = null;
		this._aDistinctValues = [];
		this._mRecordKeyTextMap = {};
	};

	Field.prototype.onBeforeRendering = function () {
		this._updateSpecialSelectItems();
	};

	/**
	 * Checks if the data type of the smart multi edit field is nullable as defined by its metadata.
	 * @public
	 * @returns {boolean} True if nullable, false otherwise.
	 */
	Field.prototype.getNullable = function () {
		return this._bNullable;
	};

	/**
	 * Checks if a {@link sap.ui.comp.smartfield.SmartField} is present, which provides a way to define an explicit value for the field.
	 * @public
	 * @returns {boolean} True if {@link sap.ui.comp.smartfield.SmartField} present, false otherwise.
	 */
	Field.prototype.getShowValueHelp = function () {
		return this._bShowValueHelp;
	};

	/**
	 * Returns the label associated with this field.
	 * @public
	 * @returns {sap.ui.m.Label | sap.ui.comp.smartfield.SmartLabel} An instance of {@link sap.ui.m.Label} or {@link sap.ui.comp.smartfield.SmartLabel} that displays read-only values.
	 */
	Field.prototype.getLabel = function () {
		if (this.getParent() && this.getParent().getLabel) {
			return this.getParent().getLabel();
		} else {
			return null;
		}
	};

	/**
	 * Returns the smart field that is used for selecting a new value.
	 * @public
	 * @returns {sap.ui.comp.smartfield.SmartField} An instance of {@link sap.ui.comp.smartfield.SmartField} that helps to define an explicit value.
	 */
	Field.prototype.getSmartField = function () {
		return this._oSmartField;
	};

	/**
	 * Returns the current value of the smart field.
	 * @public
	 * @returns {*} The current value of a {@link sap.ui.comp.smartfield.SmartField} instance.
	 */
	Field.prototype.getValue = function () {
		return this._oSmartField ? this._oSmartField.getValue() : null;
	};

	/**
	 * Returns the data type used by the smart field. This data type is determined from metadata.
	 * @public
	 * @returns {String} The EDM data type of the smart field as defined by its metadata.
	 */
	Field.prototype.getDataType = function () {
		if (!this._oSmartField) {
			return null;
		}
		try {
			return this._oSmartField.getDataType(); // When using RTA SmartField shamelessly fails in this method
		} catch (e) {
			return null;
		}
	};

	/**
	 * Checks if the data type of the smart field is unit of measurement (UOM).
	 * @public
	 * @returns {boolean} True if the field contains a value along with a unit of measure, false otherwise.
	 */
	Field.prototype.isComposite = function () {
		return !!this._oAnnotations.uom;
	};

	/**
	 * Checks if the data type of the smart field is some kind of a integer number.
	 * @public
	 * @returns {boolean} True if the smart field contains some kind of a integer number, false otherwise.
	 */
	Field.prototype.isInteger = function () {
		return this.getDataType() === "Edm.Byte"
			|| this.getDataType() === "Edm.Int16"
			|| this.getDataType() === "Edm.Int32"
			|| this.getDataType() === "Edm.Int64"
			|| this.getDataType() === "Edm.SByte";
	};

	/**
	 * Checks if the data type of the smart field is some kind of a float number.
	 * @public
	 * @returns {boolean} True if the smart field contains some kind of a float number, false otherwise.
	 */
	Field.prototype.isFloat = function () {
		return this.getDataType() === "Edm.Decimal"
			|| this.getDataType() === "Edm.Double"
			|| this.getDataType() === "Edm.Float"
			|| this.getDataType() === "Edm.Single";
	};

	/**
	 * Checks if the data type of the smart field is date.
	 * @public
	 * @returns {boolean} True if the smart field contains a date value, false otherwise.
	 */
	Field.prototype.isDate = function () {
		return this.getDataType() === "Edm.DateTime";
	};

	/**
	 * Checks if the data type of the smart field is date with time.
	 * @public
	 * @returns {boolean} True if the smart field contains some both date and time value, false otherwise.
	 */
	Field.prototype.isDateTime = function () {
		return this.getDataType() === "Edm.DateTimeOffset";
	};

	/**
	 * Checks if the data type of the smart field is time.
	 * @public
	 * @returns {boolean} True if the field contains some kind of a time value, false otherwise.
	 */
	Field.prototype.isTime = function () {
		return this.getDataType() === "Edm.Time";
	};

	/**
	 * Checks if the data type of the smart field is boolean.
	 * @public
	 * @returns {boolean} True if the field contains a boolean value, false otherwise.
	 */
	Field.prototype.isBoolean = function () {
		return this.getDataType() === "Edm.Boolean";
	};

	/**
	 * Checks if the field uses a combo box. This check doesn't rely on data type but rather a certain combination of annotations.
	 * @public
	 * @returns {boolean} True if the field uses some kind of a combo box, false otherwise.
	 */
	Field.prototype.isComboBox = function () {
		return this._bComboBox;
	};

	/**
	 * Returns the path to the text property used by the combo box.
	 * @public
	 * @returns {string | null} Path to the text property of the record.
	 */
	Field.prototype.getRecordTextPath = function () {
		return this._oAnnotations ? this._oAnnotations.text.path : null;
	};

	/**
	 * Returns the unit of measurement for the underlying smart field.
	 * @public
	 * @returns {string} Value of the unit of measurement of the parent component.
	 */
	Field.prototype.getUnitOfMeasure = function () {
		return this._oSmartField ? this._oSmartField.getUnitOfMeasure() : null;
	};

	/**
	 * Returns the name of the property used for the unit of measurement.
	 * @public
	 * @returns {string | null} Name of the property that defines the unit of measurement of the underlying component.
	 */
	Field.prototype.getUnitOfMeasurePropertyName = function () {
		return this._oAnnotations && this._oAnnotations.uom ? this._oAnnotations.uom.path : null;
	};

	/**
	 * Sets a new parent.
	 * @param {sap.ui.base.ManagedObject} oParent The object that becomes this objects's new parent.
	 * @param {string} sAggregationName The name of the parent objects's aggregation.
	 * @param {boolean} bSuppressInvalidate If set to <code>true</code>, this smart multi edit field (ManagedObject) is not marked as changed. The old parent, however, is marked as changed.
	 * @returns {sap.ui.comp.smartmultiedit.Field} Returns <code>this</code> to allow method chaining.
	 * @private
	 */
	Field.prototype.setParent = function (oParent, sAggregationName, bSuppressInvalidate) {
		Control.prototype.setParent.call(this, oParent, sAggregationName, bSuppressInvalidate);

		if (oParent && oParent.getLabel && !oParent.getLabel()) {
			this._oLabel = new SmartLabel(this.getId() + "-SmartLabel");
			this._oLabel.onFieldVisibilityChange = function () {};
			this._oLabel.setLabelFor(this._oSmartField.getId());
			oParent.setLabel(this._oLabel);
			// Set up main WAI-ARIA
			this._oSelect.addAriaLabelledBy(this._oLabel);
			if (this.getDescription()) {
				this._oSelect.addAriaLabelledBy(this._oDescription);
			}
		}
		return this;
	};

	Field.prototype.addCustomData = function(oCustomData) {
		var oCustomDataClone;
		if (!oCustomData) {
			return this;
		}
		Control.prototype.addCustomData.apply(this, arguments);
		oCustomDataClone = oCustomData.clone();
		this._oSmartField.addCustomData(oCustomDataClone);
	};

	Field.prototype.insertCustomData = function(oCustomData, iIndex) {
		var oCustomDataClone;
		if (!oCustomData) {
			return this;
		}
		Control.prototype.insertCustomData.apply(this, arguments);
		oCustomDataClone = oCustomData.clone();
		this._oSmartField.addCustomData(oCustomDataClone);
	};

	Field.prototype.removeCustomData = function(vCustomData) {
		var oCustomData = Control.prototype.removeCustomData.apply(this, arguments);
		if (oCustomData) {
			this._oSmartField.removeCustomData(oCustomData);
		}
		return oCustomData;
	};

	Field.prototype.removeAllCustomData = function() {
		var aCustomData = Control.prototype.removeAllCustomData.apply(this, arguments);
		if (aCustomData.length > 0) {
			aCustomData.forEach(function (oCustomData) {
				this._oSmartField.removeCustomData(oCustomData);
			});
		}
		return aCustomData;
	};

	Field.prototype.destroyCustomData = function() {
		Control.prototype.destroyCustomData.apply(this, arguments);
		this._oSmartField.destroyCustomData();
		return this;
	};

	/**
	 * Sets the name of the property to bind to.
	 * @param {string} sName Name of the property to bind to.
	 * @returns {sap.ui.comp.smartmultiedit.Field} Returns <code>this</code> to allow method chaining.
	 * @public
	 */
	Field.prototype.setPropertyName = function (sName) {
		this.setProperty("propertyName", sName, true);
		this._createSmartField();
		return this;
	};

	/**
	 * Sets the optional configuration aggregation.
	 * @param {sap.ui.comp.smartfield.Configuration} oConfig Optional configuration to set.
	 * @returns {sap.ui.comp.smartmultiedit.Field} Returns <code>this</code> to allow method chaining.
	 * @public
	 */
	Field.prototype.setConfiguration = function (oConfig) {
		var oClonedConfig;
		this.setAggregation("configuration", oConfig, true);
		if (this._oSmartField) {
			oClonedConfig = oConfig ? oConfig.clone() : null;
			this._oSmartField.setConfiguration(oClonedConfig);
		}
		return this;
	};

	/**
	 * Returns the item that was selected using the Select action.
	 * @returns {sap.ui.core.Item | null} The current target of the <code>selectedItem</code> association, or null.
	 * @public
	 */
	Field.prototype.getSelectedItem = function () {
		return this._oSelect.getSelectedItem();
	};

	/**
	 * Sets the item to be treated as selected in the <code>sap.m.Select</code> instance.
	 * @param {sap.ui.core.Item | null} oItem An {@link sap.ui.core.Item} instance or <code>null</code>.
	 * @returns {sap.ui.comp.smartmultiedit.Field} Returns <code>this</code> to allow method chaining.
	 * @public
	 */
	Field.prototype.setSelectedItem = function (oItem, bSuppress) {
		this._handleSelectionChange(oItem, bSuppress);
		return this;
	};

	/**
	 * Sets the item to be selected in the <code>sap.m.Select</code> instance, using its index.
	 * @param {number} iIndex An index of the item inside the Select action.
	 * @returns {sap.ui.comp.smartmultiedit.Field} Returns <code>this</code> to allow method chaining.
	 * @public
	 */
	Field.prototype.setSelectedIndex = function (iIndex) {
		this.setSelectedItem(this._oSelect.getItems()[iIndex]); // Some range check?
		return this;
	};

	Field.prototype.exit = function () {
		this._getKeep().destroy();
		this._getBlank().destroy();
		this._getValueHelp().destroy();
		this._getBoolTrueItem().destroy();
		this._getBoolFalseItem().destroy();
	};

	/**
	 * Checks if the 'Leave blank' item is selected.
	 * @public
	 * @returns {boolean} True if the 'Leave blank' item is selected.
	 */
	Field.prototype.isBlankSelected = function () {
		return this._oSelect.getSelectedItem() === this._getBlank();
	};

	/**
	 * Checks if the 'Keep existing value' item is selected.
	 * @public
	 * @returns {boolean} True if the 'Keep existing value' item is selected.
	 */
	Field.prototype.isKeepExistingSelected = function () {
		return this._oSelect.getSelectedItem() === this._getKeep();
	};

	/**
	 * Checks if the 'Use Value Help' item is selected.
	 * @public
	 * @returns {boolean} True if the 'Use Value Help' item is selected.
	 */
	Field.prototype.isValueHelpSelected = function () {
		return this._oSelect.getSelectedItem() === this._getValueHelp();
	};

	/**
	 * Returns the raw value for the OData property that is determined by the <code>propertyName</code> property.
	 * If the 'Keep existing value' item is selected, an empty plain object is returned.
	 *
	 * @returns {object} An object containing the property name and its raw (non-formatted) value.
	 * @public
	 */
	Field.prototype.getRawValue = function () {
		var oResult = {},
			vValue,
			oSelectedItem = this.getSelectedItem(),
			sPropertyName = this.getPropertyName();

		if (oSelectedItem === this._getBoolTrueItem()) {
			vValue = true;
		} else if (oSelectedItem === this._getBoolFalseItem()) {
			vValue = false;
		} else if (this.isBlankSelected()) {
			vValue = null;
		} else if (oSelectedItem === this._getValueHelp()) {
			if (this.isComposite()) {
				vValue = {
					value: NumberFormat.getFloatInstance().parse(this.getValue()),
					unit: this.getUnitOfMeasure()
				};
			} else if (this.isInteger()) {
				vValue = NumberFormat.getIntegerInstance().parse(this.getValue());
			} else if (this.isFloat()) {
				vValue = NumberFormat.getFloatInstance().parse(this.getValue());
			} else if (this.isTime()) {
				vValue = {ms: this.getValue().getTime()};
			} else {
				vValue = this.getValue();
			}
		} else if (oSelectedItem) {
			vValue = this._mContextItemsData[oSelectedItem.getKey()];
		}

		// We have to explicitly check undefined, as vValue can contain values that are evaluated to false
		if (!this.isKeepExistingSelected() && typeof vValue !== "undefined") {
			if (this.isComposite()) {
				if (vValue != null) {
					oResult[sPropertyName] = vValue.value;
					oResult[this.getUnitOfMeasurePropertyName()] = vValue.unit;
				} else {
					oResult[sPropertyName] = null;
					oResult[this.getUnitOfMeasurePropertyName()] = null;
				}
			} else {
				oResult[sPropertyName] = vValue;
				if (this.isComboBox()) {
					if (vValue != null) {
						oResult[this.getRecordTextPath()] = this._mRecordKeyTextMap[vValue];
					} else {
						oResult[this.getRecordTextPath()] = null;
					}
				}
			}
		}

		return oResult;
	};

	/**
	 * Returns true if there is a client error present, false otherwise.
	 *
	 * @returns {boolean} An indication of client error.
	 * @public
	 */
	Field.prototype.hasClientError = function () {
		return this._bClientError;
	};

	/**
	 * @private
	 */
	Field.prototype._setNullable = function (b) {
		if (b !== this._bNullable) {
			this._bNullable = b;
			this._updateSpecialSelectItems();
		}
		return this;
	};

	/**
	 * @private
	 */
	Field.prototype._setShowValueHelp = function (b) {
		if (b !== this._bShowValueHelp) {
			this._bShowValueHelp = b;
			this._updateSpecialSelectItems();
		}
		return this;
	};

	/**
	 * Checks if the given item is one of the three special items.
	 * @param {sap.ui.core.Item} item that is to be checked
	 * @private
	 * @returns {boolean} True if the given item is one of three special items.
	 */
	Field.prototype._isSpecialValueItem = function (item) {
		return item === this._getKeep() || item === this._getBlank() || item === this._getValueHelp();
	};

	/**
	 * @private
	 */
	Field.prototype._handleSelectionChangeEvent = function (oEvent) {
		var oItem = oEvent.getParameter("selectedItem");
		this._handleSelectionChange(oItem);
	};

	/**
	 * @private
	 */
	Field.prototype._handleSelectionChange = function (oItem, bSuppress) {
		this._oSelect.setSelectedItem(oItem);

		if (this.isKeepExistingSelected() || this.isBlankSelected()) {
			this.getSmartField().removeStyleClass("sapUiCompSmartMultiEditSmartField");
			this.getSmartField().addStyleClass("sapUiCompSmartMultiEditSmartFieldHidden");
		} else {
			this.getSmartField().addStyleClass("sapUiCompSmartMultiEditSmartField");
			this.getSmartField().removeStyleClass("sapUiCompSmartMultiEditSmartFieldHidden");
		}

		if (bSuppress) {
			return;
		}

		this.fireChange({selectedItem: oItem});

		var bUseSmartField = this.isValueHelpSelected();
		this._oSmartField.setContextEditable(bUseSmartField);
		this._oApplyToEmptyOnlyCheckBox.setVisible(bUseSmartField);
		this._bClientError = null;

		if (this._isSpecialValueItem(oItem)) {
			this._setSmartFieldDisplayText(null, null);
		} else {
			this._oApplyToEmptyOnlyCheckBox.setVisible(true);
			if (!this.isBoolean()) {
				this._oSmartField.setContextEditable(true);
			}

			var v = this._mContextItemsData[oItem.getKey()];
			if (this.isComposite()) {
				this._setSmartFieldDisplayText(
					this._formatCurrencyValue(NumberFormat.getFloatInstance().format(v.value), v.unit, true),
					v.unit
				);
			} else if (this.isBoolean()) {
				this._setSmartFieldDisplayText(oItem.getText());
			} else if (this.isDate()) {
				this._setSmartFieldDisplayText(DateFormat.getDateInstance().format(v));
			} else if (this.isDateTime()) {
				this._setSmartFieldDisplayText(DateFormat.getDateTimeInstance().format(v));
			} else if (this.isTime()) {
				this._setSmartFieldDisplayText(DateFormat.getTimeInstance().format(new Date(v.ms)));
			} else if (this.isInteger()) {
				this._setSmartFieldDisplayText(NumberFormat.getIntegerInstance().format(v));
			} else if (this.isFloat()) {
				this._setSmartFieldDisplayText(NumberFormat.getFloatInstance().format(v));
			} else {
				this._setSmartFieldDisplayText(v.toString()); // TODO: DateTime
			}

			if (!this.isBoolean()) {
				this.setSelectedItem(this._getValueHelp(), true);
			}

			this._performValidation();
		}

		this.invalidate();
	};

	/**
	 * @private
	 */
	Field.prototype._extractValueDisplayText = function (oValue) {
		var sText;

		if (oValue == null || oValue == undefined) {
			return null;
		}

		if (this.isComposite()) {
			sText = this._formatCurrencyValue(NumberFormat.getFloatInstance().format(oValue.value), oValue.unit);
		} else if (this.isBoolean()) {
			sText = oValue ? this._getBoolTrueItem().getText() : this._getBoolFalseItem().getText();
		} else if (this.isDate()) {
			sText = DateFormat.getDateInstance().format(oValue);
		} else if (this.isDateTime()) {
			sText = DateFormat.getDateTimeInstance().format(oValue);
		} else if (this.isTime()) {
			sText = new Date(oValue.ms).toTimeString().slice(0, 8); // Sadly TimePicker crashes when asked to _formatValue
		} else if (this.isInteger()) {
			sText = NumberFormat.getIntegerInstance().format(oValue);
		} else if (this.isFloat()) {
			sText = NumberFormat.getFloatInstance().format(oValue);
		} else {
			sText = String(oValue);
		}

		return sText;
	};

	/**
	 * @private
	 */
	Field.prototype._createSelect = function () {
		this._oSelect = new Select(this.getId() + "-select");
		this._oSelect.setWidth("100%");
		this._oSelect.attachChange(this._handleSelectionChangeEvent, this);
		this.addDependent(this._oSelect);
	};

	/**
	 * @private
	 */
	Field.prototype._getResourceBundle = function () {
		if (this._oRb == null) {
			this._oRb = sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp");
		}
		return this._oRb;
	};

	/**
	 * @private
	 */
	Field.prototype._createSpecialSelectItems = function () {
		this._oRb = sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp");
		this._getKeep = jQuery.sap.getter(new Item({
			key: Field.ACTION_ITEM_KEY.KEEP,
			text: "< " + this._getResourceBundle().getText("MULTI_EDIT_KEEP_TEXT") + " >"
		}));
		this._getBlank = jQuery.sap.getter(new Item({
			key: Field.ACTION_ITEM_KEY.BLANK,
			text: "< " + this._getResourceBundle().getText("MULTI_EDIT_BLANK_TEXT") + " >"
		}));
		this._getValueHelp = jQuery.sap.getter(new Item({
			key: Field.ACTION_ITEM_KEY.NEW,
			text: "< " + this._getResourceBundle().getText("MULTI_EDIT_NEW_TEXT") + " >"
		}));
		this._getBoolTrueItem = jQuery.sap.getter(new Item({
			key: Field.ACTION_ITEM_KEY.TRUE,
			text: this._oRb.getText("SMARTFIELD_CB_YES")
		}));
		this._getBoolFalseItem = jQuery.sap.getter(new Item({
			key: Field.ACTION_ITEM_KEY.FALSE,
			text: this._oRb.getText("SMARTFIELD_CB_NO")
		}));
	};

	/**
	 * @private
	 */
	Field.prototype._createDescription = function () {
		if (!this._oDescription) {
			this._oDescription = new Label();
			this.addDependent(this._oDescription);
		}
	};

	/**
	 * @private
	 */
	Field.prototype._createApplyToEmptyOnlyCheckBox = function () {
		this._oApplyToEmptyOnlyCheckBox = new CheckBox(this.getId() + "-ApplyToEmptyOnly");
		this._oApplyToEmptyOnlyCheckBox.setText(this._getResourceBundle().getText("MULTI_EDIT_APPLY_TO_EMPTY_ONLY"));
		this._oApplyToEmptyOnlyCheckBox.attachSelect(function (oEvent) {
			this.setApplyToEmptyOnly(oEvent.getSource().getSelected());
		}.bind(this));
		this.addDependent(this._oApplyToEmptyOnlyCheckBox);
	};

	/**
	 * @private
	 */
	Field.prototype._createSmartField = function () {
		if (this._oSmartField) {
			return;
		}
		this._oSmartField = new SmartField({
			id: this.getId() + "-SmartField",
			value: {path: this.getPropertyName(), mode: "OneWay"}
		});
		this._oSmartField.addStyleClass("sapUiCompSmartMultiEditSmartFieldHidden");
		this._oSmartField._createFactory = function () {
			var oFactory = SmartField.prototype._createFactory.apply(this, arguments);
			return HackedControlFactory.createFromFactory(oFactory);
		};
		this.addDependent(this._oSmartField);
		this._oSmartField.setValue = this._handleSmartFieldSetValue;
		this._oSmartField.attachInitialise(this._handleSmartFieldInitialized.bind(this), this);
		this._oSmartField.attachInnerControlsCreated(this._handleInnerControlsCreation.bind(this), this);

		if (this.getConfiguration()) {
			this._oSmartField.setConfiguration(this.getConfiguration().clone());
		}

		this._oSmartFieldValue = null;
	};

	Field.prototype._getCurrentValueControl = function () {
		return this._oSmartField ? this._oSmartField._oControl[this._oSmartField._oControl.current] : null;
	};

	/**
	 * @private
	 */
	Field.prototype._setSmartFieldDisplayText = function (sValue, sUomValue) {
		var oHBoxItem,
			oUomControl;

		this._oSmartFieldValue = sValue;
		this._oSmartField.setValue(sValue);

		var oControl = this._getCurrentValueControl();
		if (oControl) {
			if (this.isComboBox()) {
				oControl.setSelectedKey(sValue);
			} else if (this.isComposite() && oControl.getItems) {
				oHBoxItem = oControl.getItems()[0];
				if (oHBoxItem.setValue) {
					oHBoxItem.setValue(sValue);
				} else if (oHBoxItem.setText) {
					oHBoxItem.setText(sValue);
				} else if (oHBoxItem.setSelectedKey) {
					oHBoxItem.setSelectedKey(sValue);
				}
				oHBoxItem = oControl.getItems()[1];
				if (oHBoxItem._oControl.display) {
					oUomControl = oHBoxItem._oControl.display;
					if (oUomControl.setText) {
						oUomControl.setText(sUomValue);
					}
				} else if (oHBoxItem._oControl.edit) {
					oUomControl = oHBoxItem._oControl.edit;
					if (oUomControl.setValue) {
						oUomControl.setValue(sUomValue);
					} else if (oUomControl.setSelectedKey) {
						oUomControl.setSelectedKey(sUomValue);
					}
				}
			} else if (oControl.setText) {
				oControl.setText(sValue);
			} else if (oControl.setValue) {
				oControl.setValue(sValue);
			}
		}
	};

	/**
	 * So far used in unit tests.
	 * @private
	 */
	Field.prototype._getSmartFieldDisplayText = function () {
		var oDisplayCtrl = this._oSmartField._oControl.display,
			sText = "";
		if (oDisplayCtrl) {
			if (this.isComposite() && oDisplayCtrl.getItems) {
				if (oDisplayCtrl.getItems()[0].getText) {
					sText += oDisplayCtrl.getItems()[0].getText();
				}
				if (oDisplayCtrl.getItems()[1]._oControl.display.getText) {
					sText += oDisplayCtrl.getItems()[1]._oControl.display.getText();
				}
				return sText;
			} else if (this.isComboBox()) {
				return this._mRecordKeyTextMap[oDisplayCtrl.getSelectedKey()] || "";
			} else if (oDisplayCtrl.getText) {
				return oDisplayCtrl.getText();
			} else {
				return null;
			}
		} else {
			return null;
		}
	};

	/**
	 * @private
	 */
	Field.prototype._handleSmartFieldSetValue = function (sValue) {
		// We don't want unauthorized value change from some rogue binding :)
		if (sValue === this.getParent()._oSmartFieldValue) {
			SmartField.prototype.setValue.call(this.getParent()._oSmartField, sValue);
		}
	};

	/**
	 * @private
	 */
	Field.prototype._handleSmartFieldInitialized = function () {
		var oComboCheck = this._oSmartField._oFactory._oSelector.checkComboBox();
		this._bComboBox = oComboCheck.combobox;
		this._oAnnotations = this._oSmartField._oFactory._oMetaData.annotations;
		this._oSmartField.setContextEditable(false);
		this._updateContextItems();
		this._oApplyToEmptyOnlyCheckBox.setVisible(false);
	};

	/**
	 * @private
	 */
	Field.prototype._handleInnerControlsCreation = function (oEvent) {
		var bMandatory;

		oEvent.mParameters.forEach(function (oControl) {
			if (oControl.getParent() && oControl.getParent()._oControl) {
				if (oControl.getParent()._oControl.display === oControl) {
					if (oControl.mBindingInfos.text) {
						oControl.mBindingInfos.text.skipModelUpdate = true; // Handles broken hack for OneWay for display control
					}
				} else if (oControl.getParent()._oControl.edit === oControl) {
					if (oControl.mBindingInfos.value) {
						oControl.mBindingInfos.value.skipModelUpdate = true; // Handles broken hack for OneWay for edit control
						oControl.setValue(null); // Overrides value set from OneWay binding
					} else if (oControl.mBindingInfos.selected) { // CheckBox version
						oControl.mBindingInfos.selected.skipModelUpdate = true;
						oControl.setSelected(false);
					}
				}
			}

			// Don't bind display (read-only) inner controls
			if (oControl === this._oSmartField._oControl.display) {
				return;
			}

			// Validations entry point
			if (oControl.attachChange) {
				oControl.attachChange(this._performValidation, this);
				oControl.onfocusout = function (oEvent) {
					Input.prototype.onfocusout.apply(oControl, arguments);
					this._performValidation();
				}.bind(this);
			}

			if (oControl.getParent()
				&& oControl.getParent().getParent() instanceof SmartField
				&& oControl.getParent().getParent()._oControl.edit instanceof HBox
				&& this._oAnnotations && this._oAnnotations.uom
				&& this._oAnnotations.uom.property.property["sap:semantics"] == "currency-code") {
				var hBox = oControl.getParent().getParent()._oControl.edit;
				var aItems = hBox.getItems();
				aItems[0].attachChange(this._handleCompositeInputChange, this);

				if (aItems[1] && aItems[1]._oControl && aItems[1]._oControl.edit) {
					aItems[1]._oControl.edit.attachChange(this._handleCompositeInputChange, this);
				}
			}
		}.bind(this));

		// Arbitrary place where SmartField surely knows whether it is mandatory, there may be a better one, like hooking Mandatory setter
		// TODO: _handleSmartFieldInitialized?
		bMandatory = this._oSmartField.getMandatory();
		this._setNullable(!bMandatory);
		this.getParent().getLabel().setRequired(bMandatory);
	};

	/**
	 * @private
	 */
	Field.prototype._getInnerEdit = function () {
		return this._oSmartField._oControl.edit;
	};

	/**
	 * @private
	 */
	Field.prototype._getFirstInnerEdit = function () {
		return this._oSmartField._oControl.edit.getItems()[0];
	};

	/**
	 * @private
	 */
	Field.prototype._getSecondInnerEdit = function () {
		return this._oSmartField._oControl.edit.getItems()[1]._oControl.edit;
	};

	/**
	 * @private
	 */
	Field.prototype._performValidation = function () {
		// Manual reset, dunno why SmartField doesn't reset itself within checkClientError method
		var oErr = this._oSmartField._oError;
		oErr.bComplex = false;
		oErr.bFirst = false;
		oErr.bSecond = false;

		this._bClientError = this._oSmartField.checkClientError();

		if (this.isComposite()) {
			if (this._bClientError) {
				if (oErr.bFirst) {
					this._getFirstInnerEdit().setValueState(ValueState.Error);
				}
				if (oErr.bSecond) {
					this._getSecondInnerEdit().setValueState(ValueState.Error);
				}
			} else {
				this._getFirstInnerEdit().setValueState(ValueState.None);
				this._getSecondInnerEdit().setValueState(ValueState.None);
			}
		} else {
			if (this._bClientError) {
				this._getInnerEdit().setValueState(ValueState.Error);
			} else {
				this._getInnerEdit().setValueState(ValueState.None);
			}
		}
	};

	/**
	 * @private
	 */
	Field.prototype._handleCompositeInputChange = function (oEvent) {
		var	sFormattedValue = this._formatCurrencyValue(
			this._getFirstInnerEdit().getValue(),
			this._getSecondInnerEdit().getValue(),
			true);

		if (!this._oSmartField._oError.bFirst && !this._oSmartField._oError.bSecond) {
			this._setSmartFieldDisplayText(sFormattedValue, this._getSecondInnerEdit().getValue());
		}
	};

	/**
	 * @private
	 */
	Field.prototype._formatCurrencyValue = function (sValue, sCurrency, bCutCurrency) {
		var fValue = NumberFormat.getFloatInstance().parse(sValue),
			sFormatted = NumberFormat.getCurrencyInstance().format(fValue, sCurrency);
		if (bCutCurrency) {
			sFormatted = sFormatted.replace(sCurrency, "").trim();
		}

		return sFormatted;
	};

	/**
	 * @private
	 */
	Field.prototype._updateSpecialSelectItems = function () {
		// First remove them all
		this._oSelect.removeAggregation("items", this._getKeep(), true);
		this._oSelect.removeAggregation("items", this._getBlank(), true);
		this._oSelect.removeAggregation("items", this._getValueHelp(), true);

		// Then re-insert depending on metadata
		this._oSelect.insertAggregation("items", this._getKeep(), 0, true);
		if (this.getShowValueHelp()) {
			this._oSelect.insertAggregation("items", this._getValueHelp(), 1, true);
		}
		if (this.getNullable()) {
			this._oSelect.insertAggregation("items", this._getBlank(), this.getShowValueHelp() ? 2 : 1, true);
		}
		this.invalidate();
	};

	/**
	 * We need to know 2 things to go ahead with creating contextual values from records-to-be-changed.
	 * - Container providing access to records-to-be-changed themselves
	 * - Edm data type
	 * @private
	 */
	Field.prototype._updateContextItems = function () {
		var oValue, oUnit, oUomPair, aTemp;

		// Not ready yet
		if (!this._oContainer || !this.getDataType()) {
			return;
		}

		// For boolean stay simple ~ both values and no value help
		if (this.isBoolean()) {
			this._oSelect.addAggregation("items", this._getBoolTrueItem(), true);
			this._oSelect.addAggregation("items", this._getBoolFalseItem(), true);
			this._setShowValueHelp(false);
		}

		this._aDistinctValues = [];
		this._mContextItemsData = {};
		this._mValueOccurences = {};
		this._oContainer.getContexts().forEach(function (oContext) {
			oValue = this.getModel().getObject(oContext.getPath())[this.getPropertyName()];
			if (!oValue || (typeof oValue === "string" && !oValue.trim())) {
				return;
			}
			// Some data types need special serialization to compare
			if (this.isComposite()) {
				oUnit = this.getModel().getObject(oContext.getPath())[this.getUnitOfMeasurePropertyName()];
				oUomPair = {value: oValue, unit: oUnit};
				if (this._aDistinctValues.map(JSON.stringify).indexOf(JSON.stringify(oUomPair)) === -1) {
					this._aDistinctValues.push(oUomPair);
					this._mValueOccurences[oUomPair.unit + oUomPair.value] = {count: 1, value: oUomPair, context: oContext};
				} else {
					this._mValueOccurences[oUomPair.unit + oUomPair.value].count++;
				}
			} else if (this.isDate() || this.isDateTime()) {
				if (this._aDistinctValues.map(Number).indexOf(+oValue) === -1) {
					this._aDistinctValues.push(oValue);
					this._mValueOccurences[oValue] = {count: 1, value: oValue, context: oContext};
				} else {
					this._mValueOccurences[oValue].count++;
				}
			} else if (this.isTime()) {
				if (this._aDistinctValues.map(function (t) {
						return t.ms;
					}).indexOf(oValue.ms) === -1) {
					this._aDistinctValues.push(oValue);
					this._mValueOccurences[oValue] = {count: 1, value: oValue, context: oContext};
				} else {
					this._mValueOccurences[oValue].count++;
				}
			} else {
				if (this._aDistinctValues.indexOf(oValue) === -1) {
					this._aDistinctValues.push(oValue);
					this._mValueOccurences[oValue] = {count: 1, value: oValue, context: oContext};
				} else {
					this._mValueOccurences[oValue].count++;
				}
			}
		}.bind(this));

		// Sort occurences first, then slice just first 10
		aTemp = Object.keys(this._mValueOccurences).map(function(key) {
			return [key, this._mValueOccurences[key]];
		}.bind(this));
		aTemp.sort(function(first, second) {
			if (second[1].count !== first[1].count) {
				return second[1].count - first[1].count;
			} else {
				if (this.isComposite()) {
					return second[1].value.value - first[1].value.value;
				} else if (this.isInteger() || this.isFloat()) {
					return second[1].value - first[1].value;
				} else if (this.isDate() || this.isDateTime()) {
					return second[1].value.getTime() - first[1].value.getTime();
				} else if (first[1].value.localeCompare && second[1].value.localeCompare) {
					return first[1].value.localeCompare(second[1].value);
				} else {
					return 0;
				}
			}
		}.bind(this));
		aTemp = aTemp.slice(0, CONTEXT_VALUES_ITEMS_LIMIT);
		this._aDistinctValues = [];
		aTemp.forEach(function (oValuePair) {
			this._addInnerSelectItem(oValuePair[1].value, oValuePair[1].context);
			this._aDistinctValues.push(oValuePair[1].value);
		}.bind(this));

		// If there is only one distinct value pre-set it
		this._setSmartFieldDisplayText(null, null);
	};

	/**
	 * @private
	 */
	Field.prototype._addInnerSelectItem = function (oValue, oContext) {
		var sKey, sText;

		if (!oValue || this.isBoolean()) {
			return;
		}

		if (this.isComposite()) {
			sKey = JSON.stringify([oValue.value, oValue.unit]);
		} else if (this.isDate()) {
			sKey = DateFormat.getDateInstance().format(oValue);
		} else if (this.isDateTime()) {
			sKey = DateFormat.getDateTimeInstance().format(oValue);
		} else if (this.isTime()) {
			sKey = oValue.ms;
		} else {
			sKey = String(oValue);
		}

		if (this.isComboBox()) {
			sText = oContext.getObject(this.getRecordTextPath());
			this._mRecordKeyTextMap[sKey] = sText;
		} else {
			sText = this._extractValueDisplayText(oValue);
		}

		this._oSelect.addItem(new Item({
			key: sKey,
			text: sText
		}), true);
		this._mContextItemsData[sKey] = oValue;
	};

	/**
	 * @private
	 */
	Field.prototype._setContainer = function (oContainer) {
		this._oContainer = oContainer;
		this._updateContextItems();
	};

	return Field;
});
