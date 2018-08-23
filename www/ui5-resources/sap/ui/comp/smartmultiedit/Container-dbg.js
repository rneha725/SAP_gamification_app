/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
sap.ui.define([
	"jquery.sap.global",
	".././library",
	"sap/ui/core/Control",
	"sap/ui/comp/smartmultiedit/Field"
], function (jQuery, library, Control, Field) {
	"use strict";

	/**
	 * Constructor for a new <code>sap.ui.comp.smartmultiedit.Container</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class The SmartMultiEdit.Container control provides a layout for the smart multi edit fields
	 * ({@link sap.ui.comp.smartmultiedit.Field}) it includes and enables them to access the updated binding contexts.
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.56.5
	 *
	 * @public
	 * @since 1.52.0
	 * @alias sap.ui.comp.smartmultiedit.Container
	 * @ui5-metamodel This control will also be described in the UI5 (legacy) design time meta model.
	 */
	var Container = Control.extend("sap.ui.comp.smartmultiedit.Container", /** @lends sap.ui.comp.smartmultiedit.Container.prototype **/ {
		metadata: {
			library: "sap.ui.comp",
			properties: {
				/**
				 * The entity set name to fetch metadata for.<br>
				 * Please note that this is not a dynamic SAP UI5 property: setting it twice will not result in an update of the property.
				 */
				entitySet: {
					type: "string",
					defaultValue: null
				},
				// sap.ui.model.Context is not a valid DataType for properties. Therefore, the core falls back to data type <code>any</code>.
				// We keep the sap.ui.model.Context as this is displayed correctly in the API documentation.
				/**
				 * The binding contexts relevant to this mass editing operation.
				 */
				contexts: {
					type: "sap.ui.model.Context[]",
					defaultValue: []
				}
			},
			defaultAggregation: "layout",
			aggregations: {
				/**
				 * The form that contains smart multi edit fields ({@link sap.ui.comp.smartmultiedit.Field} controls).
				 */
				layout: {
					type: "sap.ui.comp.smartform.SmartForm",
					multiple: false
				}
			},
			designTime: "sap/ui/comp/designtime/smartmultiedit/Container.designtime"
		},
		renderer: function (oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.addClass("sapUiCompSmartMultiEditContainer");
			oRm.writeClasses();
			oRm.write(">");
			if (oControl._bReadyToRender) {
				oRm.renderControl(oControl.getLayout());
			}
			oRm.write("</div>");
		}
	});

	Container.prototype.init = function () {
		this._bIsInitialized = false;
		this._bReadyToRender = false;
		this._aFields = null;
		this.attachEvent("modelContextChange", this._initializeMetadata, this);
	};

	/**
	 * Sets the entity set to read the properties from. Setting this value twice will not result in an update of the underlining components.
	 * @param {string} entitySet Entity set to use.
	 * @returns {sap.ui.comp.smartmultiedit.Container} Returns <code>this</code> to allow method chaining.
	 * @public
	 */
	Container.prototype.setEntitySet = function (entitySet) {
		if (entitySet !== this.getProperty("entitySet")) {
			this.setProperty("entitySet", entitySet, true);
			if (entitySet) {
				this._initializeMetadata();
			}
		}
		return this;
	};

	/**
	 * Sets the contexts to be updated. These contexts are required for offering possible values
	 * and are also used by the {@link sap.ui.comp.smartmultiedit.Container#getAllUpdatedContexts} method.
	 * @param {sap.ui.model.Context[]} contexts Contexts to be used. This property must be an array.
	 * @returns {sap.ui.comp.smartmultiedit.Container} Returns <code>this</code> to allow method chaining.
	 * @public
	 */
	Container.prototype.setContexts = function (contexts) {
		if (jQuery.isArray(contexts)) {
			var FnClass = sap.ui.require("sap/ui/model/Context");
			for (var i = 0; i < contexts.length; i++) {
				if (!(contexts[i] instanceof FnClass)) {
					return this;
				}
			}
			this.setProperty("contexts", contexts, true);
		} else {
			jQuery.sap.log.error("Parameter contexts is expected to be an array.");
		}
		return this;
	};

	/**
	 * Sets the layout to use.
	 * @param {sap.ui.comp.smartmultiedit.Field} oSmartForm Smart form with the layout.
	 * @returns {sap.ui.comp.smartmultiedit.Container} Returns <code>this</code> to allow method chaining.
	 * @public
	 */
	Container.prototype.setLayout = function (oSmartForm) {
		this.setAggregation("layout", oSmartForm, true);
		this._aFields = null; // Force refresh
		this._getFields();
		return this;
	};

	Container.prototype.addCustomData = function(oCustomData) {
		var oCustomDataClone;
		if (!oCustomData) {
			return this;
		}
		Control.prototype.addCustomData.apply(this, arguments);
		this._getFields().forEach(function (oField) {
			oCustomDataClone = oCustomData.clone();
			oField._oSmartField.addCustomData(oCustomDataClone);
		});
	};

	Container.prototype.insertCustomData = function(oCustomData, iIndex) {
		var oCustomDataClone;
		if (!oCustomData) {
			return this;
		}
		Control.prototype.insertCustomData.apply(this, arguments);
		this._getFields().forEach(function (oField) {
			oCustomDataClone = oCustomData.clone();
			oField._oSmartField.addCustomData(oCustomDataClone);
		});
	};

	Container.prototype.removeCustomData = function(vCustomData) {
		var oCustomData = Control.prototype.removeCustomData.apply(this, arguments);
		if (oCustomData) {
			this._getFields().forEach(function (oField) {
				oField._oSmartField.removeCustomData(oCustomData);
			});
		}
		return oCustomData;
	};

	Container.prototype.removeAllCustomData = function() {
		var aCustomData = Control.prototype.removeAllCustomData.apply(this, arguments);
		if (aCustomData.length > 0) {
			this._getFields().forEach(function (oField) {
				aCustomData.forEach(function (oCustomData) {
					oField._oSmartField.removeCustomData(oCustomData);
				});
			});
		}
		return aCustomData;
	};

	Container.prototype.destroyCustomData = function() {
		Control.prototype.destroyCustomData.apply(this, arguments);
		this._getFields().forEach(function (oField) {
			oField._oSmartField.destroyCustomData();
		});
		return this;
	};

	/**
	 * Provides updated objects, including the values of all {@link sap.ui.comp.smartmultiedit.Field} instances in the <code>layout</code> aggregation.<br><br>
	 * The function returns a Promise that is resolved when each {@link sap.ui.mode.Context} in the <code>contexts</code> property is copied and updated.
	 * The fulfilled function is called with an array that contains an object for each context in the <code>contexts</code> property.<br>
	 * Each object in this array contains:
	 * <ul>
	 *     <li>A <code>context</code> property that corresponds to the respective context.</li>
	 *     <li>A <code>data</code> property that contains the updated data object.</li>
	 * </ul>
	 *
	 * @public
	 * @param {boolean} [merge] If true, the returned data structure includes all entity set properties per context.
	 * @returns {Promise} A Promise that is resolved when all contexts ({@link sap.ui.model.Context}) are copied and updated.
	 */
	Container.prototype.getAllUpdatedContexts = function (merge) {
		var aContexts = this.getContexts(),
			aUpdatedContexts = [],
			that = this,
			iIndex = 0,
			iStep = 10;
		if (aContexts.length === 0) {
			return Promise.resolve(aUpdatedContexts);
		}
		return new Promise(function (resolve) {
			function getUpdatedContext(contexts, start, end) {
				for (iIndex = start; iIndex < Math.min(end, contexts.length); iIndex++) {
					aUpdatedContexts.push({
						context: contexts[iIndex],
						data: that._getUpdatedDataObject(contexts[iIndex].getObject(), merge)
					});
				}
				if (iIndex < contexts.length) {
					jQuery.sap.delayedCall(0, null, getUpdatedContext, [aContexts, iIndex, iIndex + iStep]);
				} else {
					resolve(aUpdatedContexts);
				}
			}

			getUpdatedContext(aContexts, iIndex, iIndex + iStep);
		});
	};

	/**
	 * Collects all fields that have currently client errors.
	 *
	 * @returns {sap.ui.comp.smartmultiedit.Field[]} An array of fields having client errors.
	 * @public
	 */
	Container.prototype.getErroneousFields = function () {
		return this._getFields().filter(function (oField) {
			oField._performValidation();
			return oField.hasClientError();
		});
	};

	/**
	 * Explicitly pushes the smart multi edit container's ({@link sap.ui.comp.smartmultiedit.Container}) custom data
	 * to the specified field ({@link sap.ui.comp.smartmultiedit.Field}).
	 * Can be useful when adding fields to a container after it has already been rendered.
	 *
	 * @public
	 * @param {Field} oField {@link sap.ui.comp.smartmultiedit.Field} to push the custom data to.
	 */
	Container.prototype.indexField = function (oField) {
		var oCustomDataClone;

		if (!(oField instanceof Field)) {
			jQuery.sap.log.error(
				"Container.indexField",
				"Element '" + JSON.stringify(oField) + "' must be of type sap.ui.comp.smartmultiedit.Field",
				"sap.ui.comp.smartmultiedit.Container");
			return;
		}

		this._aFields.push(oField);
		oField._setContainer(this);
		this.getCustomData().forEach(function (oCustomData) {
			if (oField.getSmartField()) {
				oCustomDataClone = oCustomData.clone();
				oField.getSmartField().addCustomData(oCustomDataClone);
			}
		});
	};

	/**
	 * Gets a context object ({@link sap.ui.model.Context}) that includes property names and their updated values.<br>
	 * If <code>merge</code> is true, the returned data structure includes all entity set properties of the context including their current values.<br>
	 * If <code>merge</code> is false, only the modified values of smart multi edit fields ({@link sap.ui.comp.smartmultiedit.Field}) and their entity set properties will be returned.
	 *
	 * @private
	 * @param {object} object Context data.
	 * @param {boolean} merge If true, all entity set properties with updated values are returned.
	 * @returns {object} A copy of a context data object with updated values.
	 */
	Container.prototype._getUpdatedDataObject = function (object, merge) {
		// We must use jQuery.extend, because object may contain primitive data types instead of JSON data
		var oData = merge ? jQuery.extend({}, object) : {},
			sPropertyName, sUomPropertyName, sTextPropertyName,
			oNewValue;

		this._getFields().forEach(function (oField) {
			sPropertyName = oField.getPropertyName();
			sUomPropertyName = oField.getUnitOfMeasurePropertyName();
			oNewValue = oField.getRawValue();
			// Only changed values will be saved or modified in the data object
			if (oNewValue.hasOwnProperty(sPropertyName)) {
				// Time is kind of a composite too
				if (oField.isTime()) {
					if (!oNewValue[sPropertyName]) {
						oData[sPropertyName] = null;
					} else if (!object[sPropertyName].ms) {
						jQuery.sap.log.error(
							"Container._getUpdatedDataObject",
							"Field " + sPropertyName + " has incompatible data and metadata, expected: Time, but found " + typeof oData[sPropertyName],
							"sap.ui.comp.smartmultiedit.Container");
						return;
					} else if (oNewValue[sPropertyName].ms !== object[sPropertyName].ms) {
						oData[sPropertyName] = {ms: oNewValue[sPropertyName].ms, __edmType: "Edm.Time"};
					}
				} else if (oField.isDate() || oField.isDateTime()) {
					if (!object[sPropertyName]) {
						if (oNewValue[sPropertyName]) {
							oData[sPropertyName] = oNewValue[sPropertyName];
						} // else branch is when both are null/undefined and we want to ignore that case
					} else if (!oNewValue[sPropertyName]) {
						oData[sPropertyName] = null;
					} else if (!object[sPropertyName].getTime) {
						jQuery.sap.log.error(
							"Container._getUpdatedDataObject",
							"Field " + sPropertyName + " has incompatible data and metadata, expected: Date/DateTime, but found " + typeof oData[sPropertyName],
							"sap.ui.comp.smartmultiedit.Container");
						return;
					} else if (oNewValue[sPropertyName].getTime() !== object[sPropertyName].getTime()) {
						oData[sPropertyName] = oNewValue[sPropertyName];
					}
				} else {
					if (oNewValue[sPropertyName] !== object[sPropertyName]) {
						oData[sPropertyName] = oNewValue[sPropertyName];
					}
				}
			}

			if (oField.isComposite() && oNewValue.hasOwnProperty(sUomPropertyName) && oNewValue[sUomPropertyName] !== object[sUomPropertyName]) {
				oData[sUomPropertyName] = oNewValue[sUomPropertyName];
			} else if (oField.isComboBox()) {
				sTextPropertyName = oField.getRecordTextPath();
				if (oNewValue.hasOwnProperty(sTextPropertyName) && oNewValue[sTextPropertyName] !== object[sTextPropertyName]) {
					oData[sTextPropertyName] = oNewValue[sTextPropertyName];
				}
			}
		});

		return oData;
	};

	/**
	 * Collects all instances of {@link sap.ui.comp.smartmultiedit.Field} scattered across the smart form ({@link sap.ui.comp.smartform.SmartForm}) layout.
	 *
	 * @returns {Array} An array of {@link sap.ui.comp.smartmultiedit.Field} fields.
	 * @private
	 */
	Container.prototype._getFields = function () {
		if (!this._aFields && this.getLayout()) {
			this._aFields = [];
			this.getLayout().getGroups().forEach(function (oGroup) {
				oGroup.getGroupElements().forEach(function (oGroupElement) {
					oGroupElement.getElements().forEach(function (oElement) {
						if (oElement instanceof Field) {
							this.indexField(oElement);
						}
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}

		return this._aFields || [];
	};

	/**
	 * Initializes the OData metadata.
	 *
	 * @private
	 */
	Container.prototype._initializeMetadata = function () {
		var oModel = this.getModel();
		if (!this._bIsInitialized && this.getEntitySet() && oModel
			&& (oModel.getMetadata().getName() === "sap.ui.model.odata.v2.ODataModel")) {
			if (!this.getBindingContext()) {
				var oContext = oModel.createEntry("/" + this.getEntitySet());
				this.setBindingContext(oContext);
				this.getModel().deleteCreatedEntry(oContext);
			}
			oModel.getMetaModel().loaded().then(this._onMetadataInitialized.bind(this));
		}
	};

	/**
	 * Called when the model metadata is available.
	 *
	 * @private
	 */
	Container.prototype._onMetadataInitialized = function () {
		if (this._bIsInitialized) {
			return;
		}

		this._bIsInitialized = true;
		this._bReadyToRender = true;
		this.invalidate();
	};

	return Container;
});
