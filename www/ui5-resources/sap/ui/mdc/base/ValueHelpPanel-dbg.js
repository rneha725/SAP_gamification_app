/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define([
	'jquery.sap.global',
	'sap/ui/core/XMLComposite',
	"sap/ui/model/json/JSONModel"
], function(jQuery, XMLComposite, JSONModel) {
	"use strict";

	var ValueHelpPanel = XMLComposite.extend("sap.ui.mdc.base.ValueHelpPanel", {
		metadata: {
			properties: {
				showTokenizer: {
					type: "boolean",
					group: "Data",
					defaultValue: true
				},
				showFilterbar: {
					type: "boolean",
					group: "Data",
					defaultValue: true
				}
			},
			events: {
				onBasicSearchChange: {
					parameters: {
						/**
						 * The new <code>value</code> of the <code>control</code>.
						 */
						value: { type: "string" }
					}
				},
				/**
				 * This event is fired when the colective search control is changed
				 */
				SearchTemplateChange: {
					parameters: {
						/**
						 * The new <code>key</code> of the selected Search variant.
						 */
						key: { type: "string" }
					}
				}
			}

		},
		fragment: "sap.ui.mdc.base.ValueHelpPanel",

		init: function() {
			if (!this._oTokenizer) {
				this._oTokenizer = this.byId("VHPTokenizer");
				this._oTokenizer.updateTokens = function() {
					this.updateAggregation("tokens");
				};
			}
		},

		initModel: function(oConditionModel) {
			var oFilterField = oConditionModel.getFilterField();
			this.sFieldPath = oFilterField.getFieldPath();

			this.setModel(oConditionModel, "cm");
		},

		updateModel: function(oConditionModel) {
			if (this.getModel("cm")) {
				this.getModel("cm").destroy();
				this.setModel(null, "cm");
			}

			var oCloneCM = oConditionModel.clone(this.sFieldPath);
			this.setModel(oCloneCM, "cm");
		},

		merge: function(oConditionModel) {
			oConditionModel.merge(this.sFieldPath, this.getModel("cm"));
		},

		exit: function() {
			if (this.getModel("cm")) {
				this.getModel("cm").destroy();
			}
			// if tokenizer is not part of the VHP content
			if (!this.getShowTokenizer()) {
				this._oTokenizerContainer.destroy();
			}
		},

		setFilterbar: function(oFilterbar) {
			var oSplitter = this.byId("filterbarSplitter");
			if (this._oFilterbar) {
				oSplitter.removeContentArea(this._oFilterbar);
			}
			this._oFilterbar = oFilterbar;

			if (oFilterbar) { //If a new Filterbar exist, set the layoutData and add it into the splitter
				oFilterbar.setLayoutData(new sap.ui.layout.SplitterLayoutData({
					size: "280px"
				}));
				this._updateFilterbarVisibility(this.getShowFilterbar());
				// oSplitter.insertContentArea(oFilterbar, 0);
			}

			//update the IconTabbar header visibility
			var oITBar = this.byId("iconTabBar");
			oITBar.getItems()[0].setVisible(oITBar.getItems()[0].getContent().length > 0);
			oITBar.setSelectedKey("selectFromList");
			this._updateITBHeaderVisiblity();
		},

		setTable: function(oTable) {
			var oSplitter = this.byId("filterbarSplitter");
			if (this._oTable) {
				oSplitter.removeContentArea(this._oTable);
			}
			this._oTable = oTable;

			if (oTable) { //If a new table exist, set the layoutData and add it into the splitter
				oTable.setLayoutData(new sap.ui.layout.SplitterLayoutData({
					size: "auto"
				}));

				oSplitter.insertContentArea(oTable, 1);
			}

			//update the IconTabbar header visibility
			var oITBar = this.byId("iconTabBar");
			oITBar.getItems()[0].setVisible(oITBar.getItems()[0].getContent().length > 0);
			oITBar.setSelectedKey("selectFromList");
			this._updateITBHeaderVisiblity();
		},

		getTable: function() {
			if (this._oTable) {
				return this._oTable;
			} else {
				return;
			}
		},

		setDefineConditions: function(oDefineConditionPanel) {
			var oITBar = this.byId("iconTabBar");
			if (this._oDefineConditionPanel) {
				oITBar.getItems()[1].removeContent(this._oDefineConditionPanel);
				this._oDefineConditionPanel.destroy();
			}
			this._oDefineConditionPanel = oDefineConditionPanel;

			if (oDefineConditionPanel) {
				oITBar.getItems()[1].addContent(oDefineConditionPanel);
			}

			//update the IconTabbar header visibility
			oITBar.getItems()[1].setVisible(oITBar.getItems()[1].getContent().length > 0);
			this._updateITBHeaderVisiblity();
		},

		_updateITBHeaderVisiblity: function() {
			var oITBar = this.byId("iconTabBar");
			if (oITBar.getItems()[0].getVisible() && oITBar.getItems()[1].getVisible()) {
				oITBar.removeStyleClass("sapMdcNoHeader");
			} else {
				oITBar.addStyleClass("sapMdcNoHeader");
			}
		},

		onBeforeRendering: function() {
			if (this.getModel("cm")) {
				var oFilterField = this.getModel("cm").getFilterField();
				this.sFieldPath = oFilterField.getFieldPath();

				if (!this.oConditionModel) {
					this.oConditionModel = this.getModel("cm");
					var oConditionChangeBinding = this.oConditionModel.bindProperty("/", this.oConditionModel.getContext("/"));
					oConditionChangeBinding.attachChange(function(oEvent) {
						//jQuery.sap.require('sap.m.MessageToast');
						//var n = oEvent.oSource.oValue.conditions.length;
						//sap.m.MessageToast.show("VHD clone CM: " + n + "# conditions");
					});
				}
			}
		},

		_formatTokenText: function(oCondition) {
			var sResult = "";
			if (oCondition) {
				var oCM = this.getModel("cm");
				var oOperator = oCM.getFilterOperatorConfig().getOperator(oCondition.operator);
				var oFilterField = oCM.getFilterField();
				var oDataType = oFilterField._getDataType();

				sResult = oOperator.format(oCondition.values, oCondition, oDataType);
			}
			return sResult;
		},

		_handleTokenUpdate: function(oEvent) {
			if (oEvent.getParameter("type") === "removed") {
				var aRemovedTokens = oEvent.getParameter("removedTokens");
				var oToken = aRemovedTokens[0];
				var oCondition = oToken.getBindingContext("cm").getObject();

				var oConditionModel = this.getModel("cm");
				oConditionModel.removeCondition(oCondition);
			}
		},

		_handleBasicSearch: function(oEvent) {
			this.fireOnBasicSearchChange({ "value": oEvent.getParameter("query") });
		},

		setShowFilterbar: function(bVisible) {
			var sOld = this.getShowFilterbar();
			this.setProperty("showFilterbar", bVisible);
			if (sOld !== this.getShowFilterbar()) {
				this._oAdvButton = this.byId("AdvancedFilter");
				this._oAdvButton.setPressed(bVisible);
				this._updateFilterbarVisibility(bVisible);
			}
			return this;
		},

		_handleToggleFilterVisibility: function(oEvent) {
			var bPressed = oEvent.getParameter("pressed");
			this._updateFilterbarVisibility(bPressed);
		},

		_updateFilterbarVisibility: function(bVisible) {
			if (!this._oFilterbar) {
				return;
			}

			var oSplitter = this.byId("filterbarSplitter");
			if (bVisible) {
				oSplitter.insertContentArea(this._oFilterbar, 0);
			} else {
				oSplitter.removeContentArea(this._oFilterbar);
			}
		},

		setShowTokenizer: function(bVisible) {
			var sOld = this.getShowTokenizer();
			this.setProperty("showTokenizer", bVisible);
			if (sOld !== this.getShowTokenizer()) {
				var oSplitter = this.byId("rootSplitter");
				if (!this._oTokenizerContainer) {
					this._oTokenizer = this.byId("VHPTokenizer");
					this._oTokenizerContainer = this._oTokenizer.getParent();
				}
				if (this.getShowTokenizer()) {
					oSplitter.insertContentArea(this._oTokenizerContainer, 1);
				} else {
					oSplitter.removeContentArea(this._oTokenizerContainer);
				}
			}
			return this;
		},

		setSearchTemplateModelData: function(oSearchTemplateData) {
			this._oVM = this.byId("VHPVariantManagementCtrl");
			this._oVM.setVisible(!!oSearchTemplateData);

			var oMessageBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");
			oSearchTemplateData.popoverTitle = oMessageBundle.getText("valuehelp.SEARCHTEMPLATE_POPOVERTITLE"); // "Select Search Template";

			this._oSearchTemplateModel = new JSONModel();
			var oData = {};
			oData[this._oVM.getId()] = oSearchTemplateData;
			this._oSearchTemplateModel.setData(oData);
			this._oVM.setModel(this._oSearchTemplateModel, "VHPSearchTemplates");

			var oCurrentVariantChangeBinding = this._oSearchTemplateModel.bindProperty("currentVariant", this._oVM.getBindingContext("VHPSearchTemplates"));
			oCurrentVariantChangeBinding.attachChange(function(oEvent) {
				this.fireSearchTemplateChange({ "key": oEvent.oSource.oValue });
			}.bind(this));
		},

		clearSearch: function () {
			var oSearchField = this.byId("SearchField");
			oSearchField.setValue("");
			oSearchField.fireSearch();
		}

	});

	return ValueHelpPanel;

}, /* bExport= */ true);