/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define([
	'sap/ui/core/XMLComposite',
	"sap/ui/mdc/base/ConditionModel"
], function(XMLComposite, ConditionModel) {
	"use strict";

	var DefineConditionPanel = XMLComposite.extend("sap.ui.mdc.base.DefineConditionPanel", {
		metadata: {
			properties: {},
			events: {}

		},
		fragment: "sap.ui.mdc.base.DefineConditionPanel",

		init: function() {
			sap.ui.getCore().getMessageManager().registerObject(this, true);
		},

		exit: function() {
			sap.ui.getCore().getMessageManager().unregisterObject(this, true);
		},

		onBeforeRendering: function() {
			var oFilterField = this.getModel("cm").getFilterField();
			this.sFieldPath = oFilterField.getFieldPath();

			if (!this.oConditionModel) {
				// fetch the operators for the FilterField type
				var oOperatorConfig = oFilterField.getFilterOperatorConfig();
				// assert(oOperatorConfig == null, "oOperatorConfig does not exist - no operators for Select control can be added");
				var aOperators = (oOperatorConfig ? oOperatorConfig.getOperatorsForType(oFilterField.getDataType()) : []) || [];

				var aOperatorsData = [];
				aOperators.forEach(function(element) {
					var oOperator = oOperatorConfig.getOperator(element);
					if (oOperator.showInSuggest !== undefined && oOperator.showInSuggest == false) {
						return;
					}
					var sTxtKey = oOperator.textKey || "operators." + oOperator.name + ".longText";
					var sText = oOperator.getTypeText(sTxtKey, oFilterField._getDataType().getName().toLowerCase());
					if (sText === sTxtKey) {
						sText = oOperator.longText;
					}
					aOperatorsData.push({
						key: element,
						additionalText: sText
					});
				}, this);

				var operatorModel = new sap.ui.model.json.JSONModel();
				operatorModel.setData(aOperatorsData);
				this.setModel(operatorModel, "om");


				this.oConditionModel = this.getModel("cm");
				var oConditionChangeBinding = this.oConditionModel.bindProperty("/", this.oConditionModel.getContext("/"));
				oConditionChangeBinding.attachChange(function(oEvent) {
					// jQuery.sap.require('sap.m.MessageToast');
					// var n = oEvent.oSource.oValue.conditions.length;
					// sap.m.MessageToast.show("clone CM: " + n + "# conditions");

					// check if that least one dummy condition exist
					this.updateDefineConditions();
				}.bind(this));

				// check if that least one dummy condition exist
				this.updateDefineConditions();
			}
		},

		removeCondition: function(oEvent) {
			var oSource = oEvent.oSource;
			var oCondition = oSource.getBindingContext("cm").getObject();

			var oConditionModel = this.getModel("cm");
			oConditionModel.removeCondition(oCondition);
		},

		addCondition: function(oEvent) {
			var oSource = oEvent.oSource;
			var oCondition = oSource.getBindingContext("cm").getObject();

			var oConditionModel = this.getModel("cm");
			var index = oConditionModel.indexOf(oCondition);

			// create a new dummy condition for a new condition on the UI - must be removed later if not used or filled correct
			this.addDummyCondition(index + 1);
		},

		addDummyCondition: function(index) {
			var oConditionModel = this.getModel("cm");
			var oCondition = oConditionModel.createCondition(this.sFieldPath, "EQ", [null]);
			if (index !== undefined) {
				oConditionModel.insertCondition(index, oCondition, true);
			} else {
				oConditionModel.addCondition(oCondition, true);
			}
		},

		updateDefineConditions: function() {
			var aConditions = this.oConditionModel.getConditions().filter(function(oCondition) {
				return oCondition.operator !== "EEQ";
			});

			if (aConditions.length === 0) {
				this.addDummyCondition();
			}
		},

		// called via the conditionmodel binding and creates a value field for each condition
		valueCtrlFactory: function(sId, oContext) {
			var oCM = oContext.oModel;
			var sPath = oContext.sPath;
			var index = parseInt(sPath.split("/")[sPath.split("/").length - 1], 10);
			sPath = sPath.slice(0, sPath.lastIndexOf("/"));
			sPath = sPath.slice(0, sPath.lastIndexOf("/"));
			var oCondition = oCM.getProperty(sPath);
			var oOperator = oCM.getFilterOperatorConfig().getOperator(oCondition.operator);

			var oFilterField = oCM.getFilterField();
			var oDataType = oFilterField._getDataType();

			var oValueControl = sap.ui.mdc.base.FilterOperatorConfig.createControl(oDataType, oOperator, "cm>", index);
			oValueControl.addStyleClass("sapUiSmallPaddingBegin"); //TODO styleclass for boolean select control does not work!
			oValueControl.setLayoutData(new sap.m.FlexItemData({
				shrinkFactor: 0,
				growFactor: 1
			}));
			if (oValueControl.attachChange) {
				oValueControl.attachChange(this.onChange.bind(this));
				oValueControl.onpaste = this.onPaste.bind(this);
			}

			return oValueControl;
		},

		// called when the user has change the value of the condition field
		onChange: function(oEvent) {
			var oConditionModel = this.getModel("cm");
			oConditionModel._checkIsEmpty();
			oConditionModel._updateValues();

			//TODO why is refresh and checkUpdate required? Is this correct or do we have a better way to update the Tokenizer with the filter...
			// oConditionModel.refresh();
			// oConditionModel.checkUpdate(true, true);
		},

		onPaste: function(oEvent) {
			var sOriginalText, oSource = oEvent.srcControl;

			// for the purpose to copy from column in excel and paste in MultiInput/MultiComboBox
			if (window.clipboardData) {
				//IE
				sOriginalText = window.clipboardData.getData("Text");
			} else {
				// Chrome, Firefox, Safari
				sOriginalText = oEvent.originalEvent.clipboardData.getData('text/plain');
			}
			var aSeparatedText = sOriginalText.split(/\r\n|\r|\n/g);

			if (aSeparatedText && aSeparatedText.length > 1) {
				setTimeout(function() {
					var oConditionModel = this.getModel("cm");
					var oFF = oConditionModel.getFilterField();

					var oType = oFF._getDataType(),
						type = oType.getMetadata().getName();

					var iLength = aSeparatedText.length;
					for (var i = 0; i < iLength; i++) {
						if (aSeparatedText[i]) {
							var sValue = aSeparatedText[i];
							var aValues = sValue.split(/\t/g); // if two values exist, use it as Between
							var sOperator, oOperator;
							if (aValues.length == 2 && aValues[0] && aValues[1]) {
								sOperator = "BT";
								oOperator = oFF.getFilterOperatorConfig().getOperator(sOperator);
							} else {
								aValues = [sValue.trim()];
								sOperator = oFF.getFilterOperatorConfig().getDefaultOperator(type);
								oOperator = oFF.getFilterOperatorConfig().getOperator(sOperator);
							}
							sValue = oOperator ? oOperator.format(aValues) : aValues[0];

							if (oOperator) {
								var oCondition = oOperator.getCondition(sValue, oType);
								if (oCondition) {
									oCondition.fieldPath = oFF.getFieldPath();
									oConditionModel.addCondition(oCondition);
									oFF.fireChange({ value: oCondition, type: "added", valid: true });
								}
							}
						}
					}

					if (oSource instanceof sap.m.MultiInput) {
						oSource.setValue("");
					}

				}.bind(this), 0);
			}
		}

	});

	return DefineConditionPanel;

}, /* bExport= */ true);