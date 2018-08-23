/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2016 SAP SE. All rights reserved
	
 */

// Provides control sap.rules.ui.
sap.ui.define([
		"jquery.sap.global",
		"sap/rules/ui/library",
		"sap/ui/core/Control",
		"sap/ui/layout/form/SimpleForm",
		"sap/m/Label",
		"sap/m/Switch",
		"sap/m/Select",
		"sap/m/MessageBox",
		"sap/m/Table",
		"sap/m/Column",
		"sap/m/Text",
		"sap/m/Input",
		"sap/m/Button",
		"sap/m/ComboBox",
		"sap/rules/ui/ExpressionAdvanced",
		"sap/ui/layout/VerticalLayout",
		"sap/rules/ui/type/Expression",
		"sap/rules/ui/ast/lib/AstYamlConverter",
		"sap/rules/ui/Constants"
	],
	function(jQuery, library, Control, SimpleForm, Label, Switch, Select, MessageBox, Table, Column, Text, Input, Button, ComboBox,
		ExpressionAdvanced, VerticalLayout, ExpressionType, AstYamlConverter, Constants) {
		"use strict";

		/**
		 * Constructor for a new TextRuleSettings Control. 
		 *
		 * @param {string} [sId] id for the new control, generated automatically if no id is given
		 * @param {object} [mSettings] initial settings for the new control
		 *
		 * @class 
		 * Some class description goes here.
		 * @extends  Control
		 *
		 * @author SAP SE
		 * @version 1.56.2
		 *
		 * @constructor
		 * @private
		 * @alias sap.rules.ui.TextRuleSettings
		 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
		 */
		var oTextRuleSettings = Control.extend("sap.rules.ui.TextRuleSettings", {
			metadata: {
				library: "sap.rules.ui",
				properties: {
					modelName: {
						type: "string",
						defaultValue: ""
					},
					newTextRule: {
						type: "boolean",
						defaultValue: false
					}
				},
				aggregations: {
					mainLayout: {
						type: "sap.ui.layout.form.SimpleForm",
						multiple: false
					}
				},
				defaultAggregation: "mainLayout",
				associations: {
					expressionLanguage: {
						type: "sap.rules.ui.services.ExpressionLanguage",
						multiple: false,
						singularName: "expressionLanguage"
					}
				}
			}
		});

		sap.rules.ui.TextRuleSettings.prototype._bindPredefinedTable = function(sPath, sKey) {
			var that = this;
			this.oPredefinedTable.destroyItems();
			var oModel = this.getModel("oDataModel");

			var callPredefindFactory = function(oAttributes) {
				if (oAttributes && oAttributes.length > 0) {
					that.oPredefinedTable.setBusy(true);
					for (var i = 0; i < oAttributes.length; i++) {
						var oHeaderKey;
						if (sKey === "/TextRuleResults") {
							oHeaderKey = {
								RuleId: oAttributes[i].RuleId,
								Id: oAttributes[i].Id,
								RuleVersion: oAttributes[i].RuleVersion
							};
						} else {
							oHeaderKey = {
								DataObjectId: oAttributes[i].DataObjectId,
								Id: oAttributes[i].Id,
								Version: oAttributes[i].Version
							};
						}
						var sBindingPath = oModel.createKey(sKey, oHeaderKey);
						var oContext = new sap.ui.model.Context(oModel, sBindingPath);

						that.oPredefinedTable.addItem(that._predefinedFactory("col-" + i, oContext));
					}
					that.oPredefinedTable.setBusy(false);
					that._internalModel.setProperty("/refreshButtonClicked", false);
				}
			};

			if (sKey === "/TextRuleResults") {
				var oTextRuleResults = this.getModel("TextRuleModel").getProperty("/textRuleResults");
				callPredefindFactory(oTextRuleResults);
			} else {
				oModel.read(sPath, {
					success: function(data) {
						callPredefindFactory(data.results);
					},
					error: function(oError) {
						MessageBox.error(
							oError.responseText, {
								title: messageBundle.getText("ERROR_DIALOG"),
								actions: [sap.m.MessageBox.Action.OK]

							}
						);
					}
				});
			}
		};

		//Function Import for refresh before Apply
		sap.rules.ui.TextRuleSettings.prototype._callRefreshResultsFunctionImport = function() {
			var that = this;
			var odataModel = this.getModel("oDataModel");
			var modelData = this.getModel("TextRuleModel").getData();
			var changesGroupID = {
				groupId: "changes"
			};
			odataModel.setDeferredGroups([changesGroupID.groupId]);
			var submitSuccess = function() {
				//create predefinedResults table with the refreshed attributes
				that._createPredefinedTable();
				//reset the status so that the call will not go once again when clicked on apply
				that._internalModel.setProperty("/needToRefresh",false);
			};

			var submitError = function(e) {
				sap.m.MessageToast.show(e);
			};

			var callRefreshFunctionImport = function() {
				var sRuleId = modelData.ruleId;
				odataModel.callFunction("/RefreshRuleResultDataObject", {
					method: "POST",
					groupId: changesGroupID.groupId,
					urlParameters: {
						RuleId: sRuleId
					}
				});
				odataModel.submitChanges({
					groupId: changesGroupID.groupId,
					success: submitSuccess,
					error: submitError
				});
			};

			if (this._internalModel.getProperty("/needToRefresh")) {
				callRefreshFunctionImport();
			}
		};

		//creates a message strip
		sap.rules.ui.TextRuleSettings.prototype._createInfoMessageStrip = function(textstr, elementID) {
			var oMsgStrip = new sap.m.MessageStrip({
				visible: true, // boolean		
				id: elementID,
				text: textstr, // string		
				type: sap.ui.core.MessageType.Information, // sap.ui.core.MessageType	
				showIcon: true, // boolean	
				showCloseButton: true
			}).addStyleClass("sapTextRuleSettingsMessageStrip");
			return oMsgStrip;
		};

		//Creates the formlayout inside the Settings dialog
		sap.rules.ui.TextRuleSettings.prototype._createLayout = function() {
			if (!this.oForm){
				this._destroyElements();
				this.oForm = new SimpleForm("_formLayout",{
					editable: true,
					layout: "ResponsiveGridLayout",
					maxContainerCols: 1,
					columnsL: 1,
					columnsM: 1,
					labelSpanM: 1,
					content: [
						new Label({
							text: this.oBundle.getText("output")
						}).setTooltip(this.oBundle.getText("output")),

						new sap.ui.layout.HorizontalLayout({
							content: [
								new Select("__resultSelect", {

									width: "220px",
									items: {
										path: "settingModel>/results/resultsEnumeration",
										template: new sap.ui.core.Item({
											key: "{settingModel>id}",
											text: "{settingModel>name}"
										})
									},
									selectedKey: "{/ResultDataObjectId}",
									change: function(oEvent) {
										//Enabling Apply button if disabled
										var oDialog = this.getParent();
										var oApplyButton = oDialog.getButtons()[0];
										oApplyButton.setEnabled(true);
										
										var oSelect = oEvent.getSource();
										//Update flag of result DO change
										var modelData = this.getModel().getData();
										if (modelData.ResultDataObjectStatus !== "C") {
											modelData.ResultDataObjectId = oSelect.getSelectedKey();
											modelData.ResultDataObjectName = oSelect._getSelectedItemText();
											modelData.ResultDataObjectStatus = "U";
											//If same ResultDataObject selected, no updates to refresh button
											if (modelData.ResultDataObjectId !== oSelect.getSelectedKey()) {
												this._updateRefreshFlags(false, false);
											}
										}
										this._internalModel.setProperty("/resultDataObjectChanged", true);
										if (this._internalModel.getProperty("/results/resultsEnumeration/0").id === "0") {
											this._internalModel.getProperty("/results/resultsEnumeration").splice(0, 1);
										}
										this._createPredefinedTable();								
									}.bind(this)
								}),
								
								this._createRefreshButton()
							]
						}),

						new Label(),

						this._createVerticalLayout()
					]
				}).addStyleClass("sapTextRuleSettingsForm");
			}			

			this.oForm.setBusyIndicatorDelay(0);

			return this.oForm;
		};

		//Creates predefined table in the settings dialog
		sap.rules.ui.TextRuleSettings.prototype._createPredefinedTable = function() {
			if (!this.oPredefinedTable) {
				this.oPredefinedTable = new Table("idPredefinedTable", {
					backgroundDesign: sap.m.BackgroundDesign.Solid,
					showSeparators: sap.m.ListSeparators.All,
					swipeDirection: sap.m.SwipeDirection.Both,
					layoutData: new sap.ui.layout.form.GridContainerData({
						halfGrid: false
					}),
					columns: [new Column({
						width: "45%",
						header: new sap.m.Label({
							text: this.oBundle.getText("PredefinedResultColumnHeaderText"),
							design: sap.m.LabelDesign.Bold
						})
					}), new Column({
						width: "25%",
						header: new sap.m.Label({
							text: this.oBundle.getText("PredefinedAccessColumnHeaderText"),
							design: sap.m.LabelDesign.Bold
						})
					}), new Column({
						width: "45%",
						header: new sap.m.Label({
							text: this.oBundle.getText("PredefinedValuesColumnHeaderText"),
							design: sap.m.LabelDesign.Bold
						})
					})]
				});
			}
			var bResultDataObjectChanged = this._internalModel.getProperty("/resultDataObjectChanged");
			var bResultDataObjectAttributesChanged = this._internalModel.getProperty("/refreshButtonClicked");
			var oModel = this.getModel("oDataModel");
			//For creating table when Result is not changed
			if (!bResultDataObjectChanged && !bResultDataObjectAttributesChanged) {
				this.oPredefinedTable.setModel(oModel);
				var bindingPath = [this.getModel("TextRuleModel").getProperty("/ruleBindingPath"), "/TextRule/TextRuleResults"].join("");
				this._bindPredefinedTable(bindingPath, "/TextRuleResults");
				this.oPredefinedTable.setBusyIndicatorDelay(0);
				return this.oPredefinedTable;
			} else {
				this._updatePredefinedTable(this.getModel().getData());
			}
			return null;
		};

		//Created Refresh button and handles press event
		sap.rules.ui.TextRuleSettings.prototype._createRefreshButton = function() {
			var _calcStatisticsMessage = function() { //returns null if no changes => we'll disable refresh button
				this._internalModel.setProperty("/refreshButtonEnabled", true, null, true);
				return this.oBundle.getText("textRuleRefreshWarning");
			}.bind(this);

			var _handleRefreshConfirmed = function() {
				this._updateRefreshFlags(true, false);
			}.bind(this);

			var calculatedStatisticsMessage = _calcStatisticsMessage();
			var _handleRefreshPress = function() {
				var dialogStatisticsMessage = calculatedStatisticsMessage;
				MessageBox.warning(
					dialogStatisticsMessage, {
						title: this.oBundle.getText("refeshResultWarningTitle"),
						actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
						onClose: function(oAction) {
							if (oAction === sap.m.MessageBox.Action.OK) {
								_handleRefreshConfirmed();
							}
						}
					});
			}.bind(this);

			var oRefreshButton = new Button({
				layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
					weight: 1
				}),
				icon: sap.ui.core.IconPool.getIconURI("synchronize"),
				width: "3rem",
				type: sap.m.ButtonType.Transparent,
				text: "",
				press: _handleRefreshPress,
				visible: true,
				enabled: "{settingModel>/refreshButtonEnabled}"
			}).setTooltip(this.oBundle.getText("refreshBtn"));
			this.refreshButton = oRefreshButton;
			return oRefreshButton;
		};
		
		sap.rules.ui.TextRuleSettings.prototype._createVerticalLayout = function(){
			var verticalLayout = new sap.ui.layout.VerticalLayout("verticalLayout",{
				content: [
					this._createInfoMessageStrip(this.oBundle.getText("TRPredefinedMessageStripHiddenAccessInfoText"), "id_HiddenAccessMessageStrip"),
					this._createInfoMessageStrip(this.oBundle.getText("TRPredefinedMessageStripEditableAccessInfoText"),
						"id_EditableAccessMessageStrip"),
					this._createPredefinedTable()
				]
			});
			return verticalLayout;
		};
		
		sap.rules.ui.TextRuleSettings.prototype._destroyElements = function(){
			if (sap.ui.getCore().byId("_formLayout")){
				sap.ui.getCore().byId("_formLayout").destroy();
			}
			if (sap.ui.getCore().byId("__elseCheckBox")){
				sap.ui.getCore().byId("__elseCheckBox").destroy();
			}
			if (sap.ui.getCore().byId("__resultSelect")){
				sap.ui.getCore().byId("__resultSelect").destroy();
			}
			if (sap.ui.getCore().byId("id_HiddenAccessMessageStrip")) {
				sap.ui.getCore().byId("id_HiddenAccessMessageStrip").destroy();
			}
			if (sap.ui.getCore().byId("id_EditableAccessMessageStrip")){
				sap.ui.getCore().byId("id_EditableAccessMessageStrip").destroy();
			}
			if (sap.ui.getCore().byId("idPredefinedTable")){
				sap.ui.getCore().byId("idPredefinedTable").destroy();
			}			
		};		

		//Returns the Access Modes
		sap.rules.ui.TextRuleSettings.prototype._getAccessOptions = function() {
			var oAccessOptions = {
				accessEnumration: [{
					key: Constants.KEY_EDITABLE,
					value: Constants.EDITABLE
				}, {
					key: Constants.KEY_HIDDEN,
					value: Constants.HIDDEN
				}]
			};
			return oAccessOptions;
		};

		//Reads the selected ResultDataObject from Rule
		sap.rules.ui.TextRuleSettings.prototype._getCurrentResult = function() {
			var modelData = this.getModel().getData();
			var textRuleModel = this.getModel("TextRuleModel").getData();
			var oHeaderKey = {
				Id: textRuleModel.ruleId,
				Version: textRuleModel.ruleVersion
			};
			var oDataModel = this.getModel("oDataModel");
			var sPath = oDataModel.createKey("/Rules", oHeaderKey);
			modelData.ResultDataObjectId = oDataModel.getProperty(sPath + "/ResultDataObjectId");
			modelData.ResultDataObjectName = oDataModel.getProperty(sPath + "/ResultDataObjectName");
			modelData.ResultDataObjectStatus = "A";

			//Removing the blank entry from result Select as it is not a new rule
			if (this._internalModel.getProperty("/results/resultsEnumeration/0").id === "0") {
				this._internalModel.getProperty("/results/resultsEnumeration").splice(0, 1);
			}
		};

		//Returns the expression advanced field
		// eslint-disable-next-line
		sap.rules.ui.TextRuleSettings.prototype._getPredefinedExpressionAdvanced = function(oContext, expressionID, expression, businessDataType) {
			var oExpressionLanguage = sap.ui.getCore().byId(this.getExpressionLanguage());
			var sbusinessDataType = businessDataType ? businessDataType : sap.rules.ui.ExpressionType.NonComparison;
            var that = this;
			return new ExpressionAdvanced({
				expressionLanguage: oExpressionLanguage,
				placeholder: this.oBundle.getText("expressionPlaceHolder"),
				validateOnLoad: true,
				id: expressionID,
				type: sbusinessDataType,
				value: expression,
				editable: true,
				change: function(oEvent) {
					var oSource = oEvent.getSource();
					oContext = oSource.getBindingContext();
					var oResult = that._getConvertedExpression(oSource.getValue(), true, oContext);
					var astString = "";
					
					if(oResult && oResult !== "") {
					   var parserResults = oResult.output.decisionTableData.DecisionTable.DecisionTableColumns.results["0"].Condition.parserResults;
					
					    if (parserResults && parserResults.status !== "Error") {
							that._astUtils.Id = 0;
							var sPath = oContext.getPath();
							var astOutput = parserResults.converted.ASTOutput;
							try {
								astString = JSON.stringify(that._astUtils.parseConditionStatement(astOutput));
								var aTextRuleConditionModelPropertyList = oContext.oModel.oMetadata.mEntityTypes["/TextRuleConditions"].property;
								var nASTMaxLength = 0;
								if (aTextRuleConditionModelPropertyList) {
									for (var nPropertyPos = 0; nPropertyPos < aTextRuleConditionModelPropertyList.length; nPropertyPos++) {
										if (aTextRuleConditionModelPropertyList[nPropertyPos].name === "AST") {
											nASTMaxLength = aTextRuleConditionModelPropertyList[nPropertyPos].maxLength;
										}
									}
									if (astString && astString.length > nASTMaxLength) {
										that._updateModelExpressionModelAst(sPath, oContext, astString);
									}
								}

							} catch (e) {
								console.log("Exception while converting ast for expression" + oSource.getValue() + " :" + e.message);
							}

					    }
					}
                    
                    this._internalModel.setProperty("/resultAttributeChanged", true);
					this._updateResultAttributeJSON(oContext, false, null, oSource.getValue(), astString);
				}.bind(this)
			}).setBindingContext(oContext);
		};
		
		sap.rules.ui.TextRuleSettings.prototype._getConvertedExpression = function(expression, isCodeText, oContext) {
			var oExpressionLanguage = sap.ui.getCore().byId(this.getExpressionLanguage());
			var oRuleData = this._formRuleData(oContext, expression);
			var oResult;
			if (isCodeText) {
				// Convert to code Text
				oResult = oExpressionLanguage.convertRuleToCodeValues(oRuleData);
			} else {
				// Convert to display Text
				oResult = oExpressionLanguage.convertRuleToDisplayValues(oRuleData);
			}
			return oResult;
		};
		
		// Add Decision table specific data for converting the data to code to display and viceVersa.
		sap.rules.ui.TextRuleSettings.prototype._formRuleData = function(oContext, expression) {
			var oRuleId = oContext.getProperty("RuleId");
			var oVersion = oContext.getProperty("Version");

			var oRuleData = jQuery.extend({}, this.getModel().oData);
			if (!oRuleData) {
				oRuleData = {};
			}
			// Add dummy tags
			if (!oRuleData.DecisionTable) {
				oRuleData.DecisionTable = {};
			}
			oRuleData.Type = "DT";

			oRuleData.DecisionTable.metadata = {};
			// HardCoding values to DT because rule body validator and tags expects these tags
			oRuleData.DecisionTable.RuleID = oRuleId;
			oRuleData.DecisionTable.version = oVersion;
			oRuleData.DecisionTable.HitPolicy = "FM";

			// Add dummy tags
			oRuleData.DecisionTable.DecisionTableColumns = {};
			oRuleData.DecisionTable.DecisionTableColumns.results = [];
			oRuleData.DecisionTable.DecisionTableColumns.results.push({
				"metadata": {},
				"RuleId": oRuleId,
				"Id": 1,
				"Version": oVersion,
				"Sequence": 1,
				"Type": "CONDITION",
				"Condition": {
					"metadata": {},
					"RuleId": oRuleId,
					"Id": 1,
					"Version": oVersion,
					"Expression": expression,
					"Description": null,
					"ValueOnly": false,
					"FixedOperator": null
				},
				"Result": null
			});

			oRuleData.DecisionTable.DecisionTableRows = {};
			oRuleData.DecisionTable.DecisionTableRows.results = [];

			oRuleData.DecisionTable.DecisionTableColumnsCondition = {};
			oRuleData.DecisionTable.DecisionTableColumnsCondition.results = [];

			oRuleData.DecisionTable.DecisionTableColumnsResult = {};
			oRuleData.DecisionTable.DecisionTableColumnsResult.results = [];

			return oRuleData;
		};

		//Returns the attribute's access mode
		sap.rules.ui.TextRuleSettings.prototype._getSelectedVisibilityStatus = function(sAccess) {
			if (sAccess === Constants.HIDDEN) {
				return Constants.KEY_HIDDEN;
			} else {
				return Constants.KEY_EDITABLE;
			}
		};

		//Initialises the settings model for TextRuleSettings
		sap.rules.ui.TextRuleSettings.prototype._initSettingsModel = function(oResultData) {
			var initialData = {};
			initialData.predefinedResults = [];
			initialData.results = oResultData;
			initialData.accessOptions = this._getAccessOptions();
			this._internalModel = new sap.ui.model.json.JSONModel(initialData);
			this.setModel(this._internalModel, "settingModel");
		};

		//Reads the DataObjects from vocabulary model for the result dropdown
		sap.rules.ui.TextRuleSettings.prototype._getResultsData = function(bnewRule) {
			var oExpressionLanguage = sap.ui.getCore().byId(this.getExpressionLanguage());
			var oResultsData = {
				resultsEnumeration: oExpressionLanguage.getResults()
			};
			oResultsData.resultsEnumeration.unshift({id:"0",name:""});
			this._initSettingsModel(oResultsData);
			if (bnewRule) {
				this._setDefaultResult();
			} else {
				this._getCurrentResult();
			}
			if (this.needCreateLayout) {
				var layout = this.getAggregation("mainLayout");
				if (layout) {
					layout.destroy();
				}
				layout = this._createLayout();
				this.setAggregation("mainLayout", layout);
				this.needCreateLayout = false;
			}
		};

		//Sets default Result if it is a new rule
		sap.rules.ui.TextRuleSettings.prototype._setDefaultResult = function() {
			var modelData = this.getModel().getData();
			var resultsEnumeration = this._internalModel.getProperty("/results/resultsEnumeration");
			if (resultsEnumeration.length > 0) {
				modelData.ResultDataObjectId = resultsEnumeration[0].Id;
				modelData.ResultDataObjectName = resultsEnumeration[0].Name;
				modelData.ResultDataObjectStatus = "A";
			}
			
			//Enabling Apply button if disabled
			var oDialog = this.getParent();
			var oApplyButton = oDialog.getButtons()[0];
			oApplyButton.setEnabled(false);
		};

		//Changes the AccessMode for attribute and value state of corresponding expression advanced
		sap.rules.ui.TextRuleSettings.prototype._setColumnAccessMode = function(oContext, oEvent) {
			var oSelect = oEvent.getSource();
			var expId = "exp" + oEvent.getSource().sId.split("select")[1];
			var expressionAdvanced = sap.ui.getCore().byId(expId);
			var sSelectedMode = oSelect.getSelectedKey();
			if (sSelectedMode === Constants.KEY_HIDDEN) {
				expressionAdvanced.setValue("");
				expressionAdvanced.setValueStateText(this.oBundle.getText("PredefinedResultsValueStateText"));
				this._updateResultAttributeJSON(oContext, false, Constants.HIDDEN, null, null);
			} else {
				expressionAdvanced.setValueStateText("");
				this._updateResultAttributeJSON(oContext, false, Constants.EDITABLE, null, null);
			}
            this._internalModel.setProperty("/resultAttributeChanged", true);
		};

		//Factory function for creating predefined table on first load
		sap.rules.ui.TextRuleSettings.prototype._predefinedFactory = function(sId, oContext) {
			var colId = sId.split("-")[1];
			var expressionID = "exp" + colId;
			var displayText = oContext.getProperty("DataObjectAttributeName") ? oContext.getProperty("DataObjectAttributeName") : oContext.getProperty(
				"Name");
			var attributeId = oContext.getProperty("DataObjectAttributeId") ? oContext.getProperty("DataObjectAttributeId") : oContext.getProperty(
				"Id");
			var expression;
			var ast;
			var businessDataType = oContext.getProperty("BusinessDataType");
			var sSelectedKey;
			var aAttributeList = this._internalModel.getProperty("/predefinedResults");
			if (this._internalModel.getProperty("/resultDataObjectChanged")) {
				this._updateResultAttributeJSON(oContext, true, Constants.EDITABLE, "", "");
				sSelectedKey = Constants.EDITABLE;
				expression = "";
				ast = "";
			} else if (this._internalModel.getProperty("/refreshButtonClicked")) {
				var predefinedAttributes = aAttributeList[attributeId];
				sSelectedKey = predefinedAttributes ? predefinedAttributes.AccessMode : Constants.EDITABLE;
				expression = predefinedAttributes ? predefinedAttributes.Expression : "";
				ast = predefinedAttributes ? predefinedAttributes.AST : "";
				this._updateResultAttributeJSON(oContext, false, sSelectedKey, expression, ast);
			} else {
				expression = oContext.getProperty("Expression");
				ast = oContext.getProperty("AST");
				sSelectedKey = oContext.getProperty("AccessMode");
				this._updateResultAttributeJSON(oContext, false, sSelectedKey, expression, ast);
			}
			
			var sAccessKey = this._getSelectedVisibilityStatus(sSelectedKey);

			return new sap.m.ColumnListItem({
				visible: true,
				cells: [
					new sap.m.Label({
						visible: true, // boolean
						design: sap.m.LabelDesign.Standard, // sap.m.LabelDesign
						text: displayText,
						textAlign: sap.ui.core.TextAlign.Begin, // sap.ui.core.TextAlign
						textDirection: sap.ui.core.TextDirection.Inherit // sap.ui.core.TextDirection
					}).setBindingContext(oContext),

					new sap.m.Select({
						width: "65%",
						id: "select" + colId,
						items: {
							path: "settingModel>/accessOptions/accessEnumration",
							template: new sap.ui.core.Item({
								key: "{settingModel>key}",
								text: "{settingModel>value}"
							})
						},
						selectedKey: sAccessKey,
						change: function(oEvent) {
							this._setColumnAccessMode(oContext, oEvent);
						}.bind(this)

					}).setBindingContext(oContext),

					this._getPredefinedExpressionAdvanced(oContext, expressionID, expression, businessDataType)
				]
			});
		};

		//Reads DataObjectAttributes from the model for the new result DO
		sap.rules.ui.TextRuleSettings.prototype._updatePredefinedTable = function(oResultData) {
			if (this._internalModel.getProperty("/resultDataObjectChanged")){
                this._internalModel.setProperty("/predefinedResults", []);
			}
			var oDataModel = this.getModel("oDataModel");
			var ruleData = this.getModel("TextRuleModel").getData();
			var oHeaderKey = {
				Id: ruleData.projectId,
				Version: ruleData.projectVersion
			};
			var sProjectPath = oDataModel.createKey("/Projects", oHeaderKey);

			oHeaderKey = {
				Id: oResultData.ResultDataObjectId,
				Version: ruleData.projectVersion
			};
			var sdataAttributesPath = [sProjectPath, oDataModel.createKey("/DataObjects", oHeaderKey), "/DataObjectAttributes"].join(
				"");

			this.oPredefinedTable.setModel(oDataModel);
			this._bindPredefinedTable(sdataAttributesPath, "/DataObjectAttributes");
			this.oPredefinedTable.setBusyIndicatorDelay(0);
			return this.oPredefinedTable;
		};

		sap.rules.ui.TextRuleSettings.prototype._updateRefreshFlags = function(needRefresh, isEnabled) {
			this._internalModel.setProperty("/needToRefresh", needRefresh);
			this._internalModel.setProperty("/refreshButtonEnabled", isEnabled, null, true);
			/////////////////// Non ABAP Requires Predefined results table. Hence, calling function import before Apply/////////
			this._internalModel.setProperty("/refreshButtonClicked", true);
			this._callRefreshResultsFunctionImport();

		};

		//Updates the array of DataObjectAttributes with properties when result/AccessMode/Expression is changed
		sap.rules.ui.TextRuleSettings.prototype._updateResultAttributeJSON = function(
			oContext, bResultChanged, sAccessMode, sExpression, sAst) {
			var isRefreshed = this._internalModel.getProperty("/refreshButtonClicked");
			var sAttributeId = oContext.getProperty("DataObjectAttributeId") ? oContext.getProperty("DataObjectAttributeId") : oContext.getProperty(
				"Id");
			if (this._internalModel.getProperty("/predefinedResults")) {
				if (this._internalModel.getProperty("/predefinedResults/" + sAttributeId)) {
					if (bResultChanged) {
                        this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/AccessMode", Constants.EDITABLE);
                        this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/Expression", "");
						this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/AST", "");
					}
					if (isRefreshed){
                        this._internalModel.setProperty("/predefinedResults/" + sAttributeId, oContext.getObject(oContext.sPath));
                        this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/isAttributeinBackend", true);
                        this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/AccessMode", sAccessMode);
                        this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/Expression", sExpression);
						this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/AST", sAst);
					}
					if (sAccessMode) {
                        this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/AccessMode", sAccessMode);
					} 
					if (sExpression || sExpression === "") {
                        this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/Expression", sExpression);
					}
					if (sAst || sAst === "") {
	                    this._internalModel.setProperty("/predefinedResults/" + sAttributeId + "/AST", sAst);	
					}	
					
				} else {
                    this._internalModel.setProperty("/predefinedResults/" +sAttributeId, oContext.getObject(oContext.sPath));
					if (bResultChanged){
                        this._internalModel.setProperty("/predefinedResults/" +sAttributeId + "/AccessMode", Constants.EDITABLE);
                        this._internalModel.setProperty("/predefinedResults/" +sAttributeId + "/Expression", "");
						this._internalModel.setProperty("/predefinedResults/" +sAttributeId + "/AST", "");
					}					
					if (isRefreshed){
                        this._internalModel.setProperty("/predefinedResults/" +sAttributeId + "/AccessMode", sAccessMode);
                        this._internalModel.setProperty("/predefinedResults/" +sAttributeId + "/Expression", sExpression);
						this._internalModel.setProperty("/predefinedResults/" +sAttributeId + "/AST", sAst);
                        this._internalModel.setProperty("/predefinedResults/" +sAttributeId + "/isAttributeinBackend", true);
					}						
				}
			}
		};

		//Returns the Buttons for the Settings Dialog
		sap.rules.ui.TextRuleSettings.prototype.getButtons = function(oDialog) {
			var aButtons = [];

			//Create cancel button
			var oCancelButton = new Button({
				text: this.oBundle.getText("cancelBtn")
			}).setTooltip(this.oBundle.getText("cancelBtn"));

			oCancelButton.attachPress(function() {
				oDialog.close();
			}, this);

			//Create apply button
			var oApplyBtn = new Button({
				text: this.oBundle.getText("applyChangesBtn")
			}).setTooltip(this.oBundle.getText("applyChangesBtn"));

			oApplyBtn.attachPress(function() {
				this._applySettingsModelChangesToOData(oDialog);
				//In case of successfull apply, the oDialog is closed from the success callback
			}, this);

			aButtons.push(oApplyBtn);
			aButtons.push(oCancelButton);

			return aButtons;
		};

		sap.rules.ui.TextRuleSettings.prototype.init = function() {
			this.oBundle = sap.ui.getCore().getLibraryResourceBundle("sap.rules.ui.i18n");
			this.needCreateLayout = true; //Checks if layout already exists
			this.firstLoad = true; //Checks if dialog has been opened before for the rule
			this.setBusyIndicatorDelay(0);
			this._astUtils = AstYamlConverter;
		};

		//Execution starts here (after init method)
		sap.rules.ui.TextRuleSettings.prototype.onBeforeRendering = function() {
			if (this.firstLoad) {
				var bnewRule = this.getProperty("newTextRule");
				this._getResultsData(bnewRule);
				this.firstLoad = false;
			}
		};

		////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		//////////////           Closure - this code is relevant only when pressing "apply"             ////////////////////
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		sap.rules.ui.TextRuleSettings.prototype._applySettingsModelChangesToOData = function(oDialog) {
			var _displayModel = this.getModel();
			var oDataModel = this.getModel("oDataModel");
			var oTextRuleModel = this.getModel("TextRuleModel");
			var oSettingModel = this._internalModel;
			var sRuleId = oTextRuleModel.getProperty("/ruleId");
			var sRuleVersion = oTextRuleModel.getProperty("/ruleVersion");
			var sResultObjectId = _displayModel.getProperty("/ResultDataObjectId");
			var bResultChanged = oSettingModel.getProperty("/resultDataObjectChanged");
			var bAttributeChanged = oSettingModel.getProperty("/resultAttributeChanged");
			var changesGroupID = {
				groupId: "changes"
			};
			var isNeedToSubmitChanges = false;
			var isNewTextRule = this.getProperty("newTextRule");
			
			//Success CallBack for model submit changes
			var submitSuccess = function() {
				oDialog.setBusy(false);
				oTextRuleModel.setProperty("/resultChanged",bResultChanged);
				oDialog.setState(sap.ui.core.ValueState.Success);
				oDialog.close();
			};			
			
			oDataModel.setDeferredGroups([changesGroupID.groupId]);
						
			//Deletes the Extra TextRuleResult and TextRuleResultExpressions entries after refresh for deleted attributes
			var _deleteExtraEntries = function(){
				var aAttributeList = oSettingModel.getProperty("/predefinedResults");
				for (var attribute in aAttributeList){
					if (!aAttributeList[attribute].isAttributeinBackend){
						var oTextRuleResultData = {
							RuleId: aAttributeList[attribute].RuleId,
							RuleVersion: aAttributeList[attribute].RuleVersion,
							Id: aAttributeList[attribute].Id
						};
						
						var sPath = oDataModel.createKey("/TextRuleResults", oTextRuleResultData);
						var oContext = new sap.ui.model.Context(oDataModel, sPath);
						oDataModel.deleteCreatedEntry(oContext);
						
						var aResultExpressions = oTextRuleModel.getProperty("/textRuleResultExpressions");
						for (var i=0; i < aResultExpressions.length; i++){
							if (aResultExpressions[i].ResultId === aAttributeList[attribute].Id){
								var oTextRuleResultExpression = {
										RuleId: aAttributeList[attribute].RuleId,
										RuleVersion: aAttributeList[attribute].RuleVersion,
										ResultId: aAttributeList[attribute].Id,
										ConditionId: aResultExpressions[i].ConditionId
									};									
									sPath = oDataModel.createKey("/TextRuleResultExpressions", oTextRuleResultExpression);
									oContext = new sap.ui.model.Context(oDataModel, sPath);
									oDataModel.deleteCreatedEntry(oContext);
							}
						}
					}
				}				
			};

			//Handles new TextRule creation
			var _createNewRuleODataEntries = function() {
				var mParameters = {};
				var oTextRule = {
						RuleId: sRuleId,
						RuleVersion: sRuleVersion
			    };
				var sTextRulePath = oDataModel.createKey("/TextRules", oTextRule);
				

				if (!oDataModel.getData(sTextRulePath)) {
					//CreateEntry TextRule   					
					mParameters.properties = oTextRule;
					oDataModel.createEntry("/TextRules", mParameters);					
				}	

				//Create TextRuleCondition If
				var oTextRuleConditon = {
					RuleId: sRuleId,
					RuleVersion: sRuleVersion,
					Sequence: 1
				};
				mParameters.properties = oTextRuleConditon;
				oDataModel.createEntry("/TextRuleBranches", mParameters);
				
			};
			
			//Called when Result Attributes properties are modified
			var _updateModelPredefinedResultAttributes = function() {
				var newResultJsonObjects = oSettingModel.getProperty("/predefinedResults");
				if (newResultJsonObjects) {
					var attribute;
					for (attribute in newResultJsonObjects) {
						var sAccessMode = newResultJsonObjects[attribute].AccessMode;
						var sExpression = newResultJsonObjects[attribute].Expression ? newResultJsonObjects[attribute].Expression : "";
						var sAst = newResultJsonObjects[attribute].AST ? newResultJsonObjects[attribute].AST : "";
						var updateURLPath = "/PredefinedResults(RuleId='"+sRuleId+"',DataObjectAttributeId='"+attribute+"')";
						var predefinedResultsBody = {
							AccessMode: sAccessMode,
							Expression: sExpression,
							AST: sAst
						};
						
						var mParameters = {
						  groupId: changesGroupID.groupId	
						};
						oDataModel.update(updateURLPath,predefinedResultsBody,mParameters);
					}
				}
			};
			
			//Called when Result DO is changed
			var _updateModelResultObject = function() {
				oDataModel.callFunction("/SetRuleResultDataObject", {
					method: "POST",
					groupId: changesGroupID.groupId,
					urlParameters: {
						RuleId: sRuleId,
						ResultDataObjectId: sResultObjectId
					}
				});
			};

			//If attributes of DO differ from existing column results, create or delete columns accordingly
			var _refreshRuleResultDataObject = function() {
				oDataModel.callFunction("/RefreshRuleResultDataObject", {
					method: "POST",
					groupId: changesGroupID.groupId,
					urlParameters: {
						RuleId: sRuleId
					}
				});
			};

			/////////////////////////////////////////////////////// Main Flow ////////////////////////////////////////////////////
			oDialog.setBusy(true);
			if (oSettingModel.getProperty("/refreshButtonClicked")){
				_deleteExtraEntries();
			}
			
			//When only Attributes are modified and Result DO is unchanged
			if (!bResultChanged && bAttributeChanged) {
				isNeedToSubmitChanges = true;
				_updateModelPredefinedResultAttributes();
			} else if (bResultChanged) { //Result DO is changed
				isNeedToSubmitChanges = true;
				_updateModelResultObject();
				_updateModelPredefinedResultAttributes();
			}

			var needToRefresh = oSettingModel.getProperty("/needToRefresh");
			if (needToRefresh) {
				isNeedToSubmitChanges = true;
				_refreshRuleResultDataObject();
			}		
			
			if (isNewTextRule) {
				isNeedToSubmitChanges = true;
				_createNewRuleODataEntries();
			}
			
			var mParameters = {};
			mParameters.success = submitSuccess;
			mParameters.groupId = changesGroupID.groupId;
			if (isNeedToSubmitChanges) {
				//Save changes to backend
				oDataModel.submitChanges(mParameters);
				return;
			}

			oDialog.setState(sap.ui.core.ValueState.Success);
			oDialog.setBusy(false);
			oDialog.close();
		};

		return oTextRuleSettings;

	}, /* bExport= */ true);
