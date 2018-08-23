/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(["jquery.sap.global", "sap/ui/base/Object", "sap/ui/mdc/base/TableFieldHelp"],
	function(jQuery, BaseObject, TableFieldHelp) {
		"use strict";

		/**
		 *
		 * @class OData Model based Suggest Provider for FilterField.
		 * @extends sap.ui.base.Object
		 *
		 * @author SAP SE
		 * @version 1.56.5
		 * @since 1.48.0
		 * @alias sap.ui.mdc.base.ODataSuggestProvider
		 *
		 * @private
		 * @experimental
		 * @sap-restricted
		 */
		var ODataSuggestProvider = BaseObject.extend("sap.ui.mdc.base.ODataSuggestProvider", /** @lends sap.ui.mdc.base.ODataSuggestProvider.prototype */ {

			constructor: function(mParameters) {
				BaseObject.apply(this);

				this._bShowHint = false;
				this._bFixedValues = false;

				if (mParameters) {
					this._fInit = mParameters.init;
					this._fSuggest = mParameters.suggest;
					this._fSelect = mParameters.select;
					this._bShowHint = mParameters.showHint !== undefined ? mParameters.showHint : false;
					this._bFixedValues = mParameters.fixedValues !== undefined ? mParameters.fixedValues : false;
					this._keyPath = mParameters.keyPath;
					this._descriptionPath = mParameters.descriptionPath;
					this._oLocalDataToValueListMap = mParameters.oLocalDataToValueListMap;
					if (mParameters.control) {
						this.associateFilterField(mParameters.control);
					}
				}

			}
		});

		ODataSuggestProvider.prototype.destroy = function() {
			this._oFilterField = null;
			this._oInput = null;
			this._oTable = null;
		};

		ODataSuggestProvider.prototype.getTable = function() {
			return this._oTable;
		};

		ODataSuggestProvider.prototype.setTable = function(oTable, mParams) {
			if (this._oTable) {
				this._oTable.destroy();
			}
			this._oTable = oTable;
			this._oFilterField.getFieldHelp().setTable(oTable);
			if (mParams && mParams.newValue) {
				this._fSuggest(this, { newValue: mParams.newValue });
			}
		};

		ODataSuggestProvider.prototype.setKeyPath = function(sKeyPath) {
			this._keyPath = sKeyPath;
		};

		ODataSuggestProvider.prototype.setDescriptionPath = function(sDescriptionPath) {
			this._descriptionPath = sDescriptionPath;
		};

		ODataSuggestProvider.prototype.setLocalDataToValueListMap = function(oLocalDataToValueListMap) {
			this._oLocalDataToValueListMap = oLocalDataToValueListMap;
		};

		ODataSuggestProvider.prototype.keyFromItem = function(oItem) {
			var bc = oItem.getBindingContext();
			var oDataModelRow = bc.getObject();
			return this._keyPath && oDataModelRow && oDataModelRow[this._keyPath] ? oDataModelRow[this._keyPath] : null;
		};

		ODataSuggestProvider.prototype.textFromItem = function(oItem) {
			var bc = oItem.getBindingContext();
			var oDataModelRow = bc.getObject();
			return this._descriptionPath && oDataModelRow[this._descriptionPath] ? oDataModelRow[this._descriptionPath] : null;
		};

		ODataSuggestProvider.prototype.handleTableItemSelect = function(oEvent) {
			var oFieldHelp = oEvent.oSource;
			var oItem = oEvent.getParameter("item");
			var bc = oItem.getBindingContext();
			var oDataModelRow = bc.getObject();

			var sKey = this._keyPath && oDataModelRow[this._keyPath] ? oDataModelRow[this._keyPath] : null;
			var sDescription = this._descriptionPath && oDataModelRow[this._descriptionPath] ? oDataModelRow[this._descriptionPath] : null;

			oFieldHelp.setProperty("selectedKey", sKey, true); // do not invalidate while FieldHelp
			oFieldHelp.fireSelect({ value: sDescription, key: sKey });

			if (this._fSelect) {
				if (this._fSelect(this, { suggestionObject: oItem })) {
					return null;
				}
			}

			// handle the selected item as EEQ with key
			var oSource = this._oInput;
			var oBinding = this._oFilterField.getBinding("conditions");
			var oType = this._oFilterField._getDataType();
			var sFieldPath = this._oFilterField.getFieldPath();
			var sValue = "==" + sKey;

			jQuery.sap.log.info("mdc:ODataSuggestProvider.handleTableItemSelect", " item: " + sValue);

			//OutParameters for conditions.
			var oOutParameters;
			if (this._oLocalDataToValueListMap) {
				oOutParameters = {};
				Object.keys(this._oLocalDataToValueListMap).forEach(function(sLocalDataProperty) {
					var sValueListProperty = this._oLocalDataToValueListMap[sLocalDataProperty];
					oOutParameters[sLocalDataProperty] = oDataModelRow[sValueListProperty];
				}.bind(this));
			}

			var oOperator = this._oFilterField.getFilterOperatorConfig().getOperator("EEQ");
			if (oOperator && oOperator.test(sValue, oType)) {
				//Insert condition to condition model
				var oConditionModel = oBinding.getModel();
				var oCondition = oConditionModel.createItemCondition(sFieldPath, sKey, sDescription);
				if (oOutParameters) {
					//Storing OutParameters
					oCondition.outParameters = oOutParameters;
				}
				oConditionModel.addCondition(oCondition);
				oSource.setValue("");
				this._oFilterField.fireChange({ value: oCondition, type: "added", valid: true });
			}
		};

		ODataSuggestProvider.prototype.handleTableNavigate = function(oEvent) {
			var oFieldHelp = oEvent.oSource;
			var oTable = oFieldHelp.getTable();
			var iStep = oEvent.getParameter("step");
			var oSelectedItem = oEvent.getParameter("selectedItem");
			var aItems = oTable.getItems();
			var iItems = aItems.length;
			var iSelectedIndex = 0;

			if (oSelectedItem) {
				iSelectedIndex = oTable.indexOfItem(oSelectedItem);
				iSelectedIndex = iSelectedIndex + iStep;
				if (iSelectedIndex < 0) {
					iSelectedIndex = 0;
				} else if (iSelectedIndex >= iItems - 1) {
					iSelectedIndex = iItems - 1;
				}
			} else if (iStep >= 0) {
				iSelectedIndex = iStep - 1;
			} else {
				iSelectedIndex = iItems + iStep;
			}

			var oItem = aItems[iSelectedIndex];
			if (oItem) {
				var bc = oItem.getBindingContext();
				var oDataModelRow = bc.getObject();
				var sKey = this._keyPath && oDataModelRow[this._keyPath] ? oDataModelRow[this._keyPath] : null;
				var sDescription = this._descriptionPath && oDataModelRow[this._descriptionPath] ? oDataModelRow[this._descriptionPath] : null;

				oItem.setSelected(true);
				oFieldHelp.setProperty("selectedKey", sKey, true); // do not invalidate while FieldHelp
				oFieldHelp.fireNavigate({ value: sDescription, key: sKey });
			}
		};

		ODataSuggestProvider.prototype.handleFilterItems = function(oEvent) {
			var oFieldHelp = oEvent.oSource;
			var oTable = oFieldHelp.getTable();
			var sFilterText = oEvent.getParameter("filterText");

			if (this._fInit && !oTable) {
				this._fInit(this, { newValue: sFilterText });
				return;
			}

			if (this._fSuggest) {
				oFieldHelp.setSelectedKey();

				if (this.iChangeTimer) {
					jQuery.sap.clearDelayedCall(this.iChangeTimer);
					delete this.iChangeTimer;
				}
				this.iChangeTimer = jQuery.sap.delayedCall(100, this, function() {
					this._fSuggest(this, { newValue: sFilterText });
				}.bind(this));
			}
		};

		ODataSuggestProvider.prototype.associateFilterField = function(oFilterField) {
			this._oFilterField = oFilterField;
			this._oInput = oFilterField.getAggregation("_input");

			if (!this._oInput) {
				var that = this;
				setTimeout(function() { that.associateFilterField(oFilterField); }, 100);
				return;
			}

			if (!(this._oInput instanceof sap.m.MultiInput)) {
				jQuery.sap.log.error("mdc:ODataSuggestProvider", "associateFilterField for " + (this._oInput ? this._oInput.getId() : "none") + " not possible!");
				return;
			}

			var oFH = new TableFieldHelp();
			oFH.setGetKeyFromItem(this.keyFromItem.bind(this));
			oFH.setGetTextFromItem(this.textFromItem.bind(this));

			oFH.attachItemSelect(this.handleTableItemSelect.bind(this));
			oFH.attachNavigateToItem(this.handleTableNavigate.bind(this));
			oFH.attachFilterItems(this.handleFilterItems.bind(this));
			this._oFilterField.setFieldHelp(oFH);

			//TODO workaround to change the valueHelpIcon
			if (this._bFixedValues) {
				this._oInput._getValueHelpIcon = function() {
					var _oValueHelpIcon = sap.m.MultiInput.prototype._getValueHelpIcon.apply(this, arguments);

					if (_oValueHelpIcon) {
						_oValueHelpIcon.setSrc(sap.ui.core.IconPool.getIconURI("slim-arrow-down"));
					}
					return _oValueHelpIcon;
				};
			}

			if (this._bShowHint) {
				this._oInput.setPlaceholder("press space to get help"); //TODO must be translated or removed!
			}

			this._oInput.attachChange(function(oEvent) {
				var sText = oEvent.getParameter("newValue").trim(),
					oSource = this._oInput,
					oBinding = this._oFilterField.getBinding("conditions"),
					oType = this._oFilterField._getDataType(),
					// type = oType.getMetadata().getName(),
					// oOperator, 
					oCondition,
					sFieldPath = this._oFilterField.getFieldPath();


				jQuery.sap.log.info("mdc:ODataSuggestProvider", "change text handled " + sText);

				// first try to check if the input match to an operator
				// var aOperators = this._oFilterField.getFilterOperatorConfig().getMatchingOperators(type, sText);

				// // use default operator if nothing found
				// if (aOperators.length !== 0) {
				// 	oOperator = aOperators[0];
				// 	oCondition = oOperator.getCondition(sText, oType);
				// 	if (oCondition) {
				// 		oCondition.fieldPath = sFieldPath;
				// 		oBinding.getModel().addCondition(oCondition);
				// 		oSource.setValue("");

				// 		this._oFilterField.fireChange({ value: oCondition, type: "added", valid: true });
				// 		return null;
				// 	}
				// }

				// handle the input as a full key value and EEQ
				if (this._oFilterField.getFieldHelp()._getPopover().isOpen() && this._oFilterField.getFieldHelp().getProperty("selectedKey")) {
					this._oFilterField.getFieldHelp().close();
					oSource.setValue("");
					jQuery.sap.delayedCall(100, this, function() {
						var sKey = this._oFilterField.getFieldHelp().getProperty("selectedKey");
						var sValue = "==" + sKey;

						jQuery.sap.log.info("mdc:ODataSuggestProvider", "validator EEQ text handling " + sValue);

						//TODO validation and description value loading is missing

						var oOperator = this._oFilterField.getFilterOperatorConfig().getOperator("EEQ");
						if (oOperator && oOperator.test(sValue, oType)) {
							oCondition = oBinding.getModel().addCondition(oBinding.getModel().createItemCondition(sFieldPath, sKey, sText));
							this._oFilterField.fireChange({ value: oCondition, type: "added", valid: true });
						}
					});
				}

				return null;
			}.bind(this));

		};

		return ODataSuggestProvider;
	},
	/* bExport= */
	true);