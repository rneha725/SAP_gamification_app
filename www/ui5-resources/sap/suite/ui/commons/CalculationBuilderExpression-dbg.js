sap.ui.define([
	"jquery.sap.global",
	"./library",
	"./CalculationBuilderItem",
	"sap/ui/core/Control",
	"sap/ui/core/ValueState",
	"sap/ui/core/Popup",
	"sap/ui/core/TextAlign",
	"sap/ui/core/delegate/ItemNavigation",
	"sap/m/MessageBox",
	"sap/m/OverflowToolbar",
	"sap/m/OverflowToolbarToggleButton",
	"sap/m/OverflowToolbarButton",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"sap/m/ButtonType",
	"sap/m/Button",
	"sap/m/FlexBox",
	"sap/m/FlexRendertype",
	"sap/m/FlexAlignItems",
	"sap/m/FlexDirection",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/StepInput",
	"sap/m/Input",
	"sap/m/InputType",
	"sap/m/Page",
	"sap/m/List",
	"sap/m/ListMode",
	"sap/m/ListType",
	"sap/m/StandardListItem",
	"sap/m/NavContainer",
	"sap/m/SearchField",
	"sap/m/Label",
	"sap/m/Panel",
	"sap/m/ResponsivePopover",
	"sap/m/PlacementType",
	"sap/m/Toolbar",
	"./CalculationBuilderValidationResult",
	"sap/ui/thirdparty/jqueryui/jquery-ui-core",
	"sap/ui/thirdparty/jqueryui/jquery-ui-widget",
	"sap/ui/thirdparty/jqueryui/jquery-ui-mouse",
	"sap/ui/thirdparty/jqueryui/jquery-ui-draggable",
	"sap/ui/thirdparty/jqueryui/jquery-ui-droppable",
	"sap/ui/thirdparty/jqueryui/jquery-ui-selectable"
], function (jQuery, library, CalculationBuilderItem, Control, ValueState, Popup, TextAlign, ItemNavigation, MessageBox,
			 OverflowToolbar, OverflowToolbarToggleButton, OverflowToolbarButton, ToolbarSpacer, Title, ButtonType,
			 Button, FlexBox, FlexRendertype, FlexAlignItems, FlexDirection, SegmentedButton, SegmentedButtonItem,
			 StepInput, Input, InputType, Page, List, ListMode, ListType, StandardListItem, NavContainer, SearchField,
			 Label, Panel, ResponsivePopover, PlacementType, Toolbar, ValidationResult) {
	"use strict";

	var ItemType = library.CalculationBuilderItemType,
		OperatorType = library.CalculationBuilderOperatorType,
		ComparisonOperatorType = library.CalculationBuilderComparisonOperatorType,
		LogicalOperatorType = library.CalculationBuilderLogicalOperatorType;

	var Ids = Object.freeze({
		PAGE_MAIN: "-pagemain",
		PAGE_OPERATORS: "-pageoperators",
		PAGE_CONSTANT: "-pageconstant",
		PAGE_VARIABLE: "-pagevariable",
		PAGE_FUNCTIONS: "-pagefunctions"
	});

	var Icons = Object.freeze({
		OPERATORS_CATEGORY: "sap-icon://attachment-html",
		CONSTANTS_CATEGORY: "sap-icon://grid",
		VARIABLES_CATEGORY: "sap-icon://notes",
		FUNCTIONS_CATEGORY: "sap-icon://chalkboard",
		DELETE: "sap-icon://delete"
	});

	var Directions = Object.freeze({
		KEY_PREVIOUS: "previous",
		KEY_NEXT: "next",
		MOUSE: "mouse"
	});

	var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.suite.ui.commons");

	/**
	 * Constructor for a new expression.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * The expression entered into the calculation builder.
	 *
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.56.5
	 * @since 1.56.0
	 *
	 * @constructor
	 * @alias sap.suite.ui.commons.CalculationBuilderExpression
	 * @ui5-metamodel This control/element will also be described in the UI5 (legacy) design time metamodel.
	 */
	var CalculationBuilderExpression = Control.extend("sap.suite.ui.commons.CalculationBuilderExpression", /** @lends sap.suite.ui.commons.CalculationBuilder.prototype */ {
		metadata: {
			library: "sap.suite.ui.commons",
			defaultAggregation: "items",
			aggregations: {
				/**
				 * Holds the items included in the expression.
				 */
				items: {
					type: "sap.suite.ui.commons.CalculationBuilderItem",
					multiple: true,
					singularName: "item",
					bindable: "bindable"
				},
				/**
				 * Holds the variables used in the expression.
				 */
				variables: {
					type: "sap.suite.ui.commons.CalculationBuilderVariable",
					multiple: true,
					singularName: "Variable"
				},
				/**
				 * Holds the functions used in the expression.
				 */
				functions: {
					type: "sap.suite.ui.commons.CalculationBuilderFunction",
					multiple: true,
					singularName: "Function"
				}
			},
			events: {
				/**
				 * This event is fired when the order of items changes, or when some items are added or removed.
				 */
				change: {}
			}
		},
		renderer: function (oRm, oCalculationBuilderExpression) {
			oRm.write("<div");
			oRm.writeControlData(oCalculationBuilderExpression);
			oRm.addClass("sapCalculationBuilderInner");
			oRm.writeClasses(oCalculationBuilderExpression);
			oRm.write(">");

			oRm.write(oCalculationBuilderExpression._renderDelimiter(0));

			oCalculationBuilderExpression.getItems().forEach(function (oItem, i) {
				oItem._iIndex = i;
				oItem._bReadOnly = oCalculationBuilderExpression._bReadOnly;
				oRm.renderControl(oItem);
				oRm.write(oCalculationBuilderExpression._renderDelimiter(i + 1));
			}, this);

			if (!oCalculationBuilderExpression._bReadOnly) {
				oRm.renderControl(oCalculationBuilderExpression._getNewItem());
			}

			oRm.write("<div class=\"sapCalculationBuilderSelected\"></div>");
			oRm.write("</div>");
		}
	});

	/* =========================================================== */
	/* Init & events	    									   */
	/* =========================================================== */
	CalculationBuilderExpression.prototype.init = function () {
		// Indicates whether Calculation Builder is rendering
		this._bIsCalculationBuilderRendering = false;

		// collection of syntax errors
		this._aErrors = [];

		// Indicates whether selected items are deleting by Delete key
		this._bAreSelectedItemsDeleting = false;

		// dragging indicator
		this._bDragging = false;

		// indicates whether skip validation in 'onbeforerendering' - used when user add new item (via visual expression)
		// and it is already validated (for input purposes) we don't need to validate once again
		this._bSkipValidation = false;

		// indicator to check whether builder is just being rendered (prevents never empty loops)
		this._bIsCalculationBuilderRendering = false;
	};

	CalculationBuilderExpression.prototype._renderDelimiter = function (iIndex) {
		var sHtml = "";

		sHtml += "<div class=\"sapCalculationBuilderDelimiter sapCalculationBuilderDroppable\" index=\"" + iIndex + "\">";
		sHtml += "<div class=\"sapCalculationBuilderDelimiterNewButton\" index=\"" + iIndex + "\">";
		sHtml += "<span role=\"presentation\" aria-hidden=\"true\" data-sap-ui-icon-content=\"\"" +
			"class=\"sapUiIcon sapUiIconMirrorInRTL sapCalculationBuilderDelimiterNewButtonIcon\" style=\"font-family:'SAP-icons'\"></span>";

		sHtml += "</div>";
		sHtml += "</div>";

		return sHtml;
	};


	CalculationBuilderExpression.prototype.onBeforeRendering = function () {
		this._createPopup();

		this.getParent()._enableOrDisableExpandAllButton();
		if (!this._bSkipValidation) {
			this._aErrors = this._validateSyntax();
			this._fireAfterValidation();
		}
		this._bSkipValidation = false;
		this._bIsCalculationBuilderRendering = true;
	};

	CalculationBuilderExpression.prototype.onAfterRendering = function () {
		this._bIsCalculationBuilderRendering = false;
		if (!this._bReadOnly) {
			this._setupDroppable();
			this._setupSelectable();
			this._setupNewButtonEvents();
		}
		this._setupKeyboard();
	};

	CalculationBuilderExpression.prototype.onsapfocusleave = function () {
		if (!this._bAreSelectedItemsDeleting) {
			this._deselect();
		}
	};

	CalculationBuilderExpression.prototype.onsapenter = function (oEvent) {
		this._handleEnter(oEvent);
	};

	CalculationBuilderExpression.prototype.onsapspace = function (oEvent) {
		if (jQuery(oEvent.target).hasClass("sapCalculationBuilderItem")) {
			this._handleSpace(oEvent);
		}
	};

	CalculationBuilderExpression.prototype.onsappreviousmodifiers = function (oEvent) {
		if (oEvent.ctrlKey) {
			this._handleCtrlPrevious(oEvent);
		}
	};

	CalculationBuilderExpression.prototype.onsapnextmodifiers = function (oEvent) {
		if (oEvent.ctrlKey) {
			this._handleCtrlNext(oEvent);
		}
	};

	CalculationBuilderExpression.prototype.onsapdelete = function (oEvent) {
		this._handleDelete(oEvent);
	};

	CalculationBuilderExpression.prototype.exit = function () {
		if (this._oPopover) {
			this._oPopover.destroy();
		}

		if (this._oItemNavigation) {
			this.removeDelegate(this._oItemNavigation);
			this._oItemNavigation.destroy();
		}
	};

	/* =========================================================== */
	/* Controls initialization									   */
	/* =========================================================== */
	CalculationBuilderExpression.prototype._createPopup = function () {
		var oPopoverItems = {};

		if (this._oPopover) {
			return;
		}

		this._createPopoverLayout(oPopoverItems);
		this._createPopoverConstantsItems(oPopoverItems);
		this._createPopoverVariablesItems(oPopoverItems);
		this._createPopoverFunctionsItems(oPopoverItems);
		this._createPopoverOperatorsItems(oPopoverItems);
		this._createPopoverNavContainer(oPopoverItems);

		this._createPopover(oPopoverItems);
	};

	CalculationBuilderExpression.prototype._createPopoverLayout = function (oPopoverItems) {
		var fnCreateButton = function (sLabel) {
			return new Button({
				text: sLabel === "*" ? "x" : sLabel,
				press: this._updateOrCreateItem.bind(this, {
					type: ItemType.Operator,
					key: sLabel
				})
			}).addStyleClass("sapUiTinyMarginEnd");
		}.bind(this);

		var oLayout = new FlexBox({
			renderType: FlexRendertype.Div
		});

		oLayout.addStyleClass("sapCalculationBuilderItemPopupOperators");
		Object.keys(OperatorType).forEach(function (sKey) {
			oLayout.addItem(fnCreateButton(OperatorType[sKey]));
		});

		oPopoverItems.layout = oLayout;
	};

	CalculationBuilderExpression.prototype._createPopoverConstantsItems = function (oPopoverItems) {
		oPopoverItems.constantInput = new Input({
			type: InputType.Number,
			width: "100%",
			placeholder: oResourceBundle.getText("CALCULATION_BUILDER_ADD_CONSTANT_FIELD_PLACEHOLDER"),
			textAlign: TextAlign.Right,
			valueStateText: oResourceBundle.getText("CALCULATION_BUILDER_ADD_CONSTANT_FIELD_ERROR_TEXT"),
			submit: function (oEvent) {
				if (oPopoverItems.constantInput.getValue() !== "") {
					this._updateOrCreateItem({
						type: ItemType.Constant,
						key: oPopoverItems.constantInput.getValue()
					});
				}
			}.bind(this)
		});
	};

	CalculationBuilderExpression.prototype._createPopoverVariablesItems = function (oPopoverItems) {
		var aItems = [];
		this.getVariables().forEach(function (oItem) {
			var oListItem = new StandardListItem({
				title: oItem._getLabel()
			});
			oListItem._calculationBuilderKey = oItem.getKey();
			aItems.push(oListItem);
		}, this);

		aItems = aItems.sort(function (o1, o2) {
			return o1.getTitle().localeCompare(o2.getTitle());
		});

		oPopoverItems.variablesList = new List({
			mode: ListMode.SingleSelectMaster,
			selectionChange: function (oEvent) {
				this._updateOrCreateItem({
					type: ItemType.Variable,
					key: oEvent.getParameter("listItem")._calculationBuilderKey
				});
			}.bind(this),
			items: aItems
		});

		oPopoverItems.searchField = new SearchField({
			placeholder: oResourceBundle.getText("CALCULATION_BUILDER_SEARCH_VARIABLE"),
			liveChange: function (oEvent) {
				var sQuery = oEvent.getSource().getValue();

				if (sQuery || sQuery === "") {
					oPopoverItems.variablesList.removeAllItems();
					aItems.forEach(function (oItem) {
						if (oItem.getTitle().toLowerCase().indexOf(sQuery.toLowerCase()) !== -1) {
							oPopoverItems.variablesList.addItem(oItem);
						}
					});
				}
			}
		});
	};

	CalculationBuilderExpression.prototype._createPopoverFunctionsItems = function (oPopoverItems) {
		var that = this,
			oParent = this.getParent();

		var fnCreateItem = function (mParameters) {
			return new StandardListItem({
				title: mParameters.title,
				description: mParameters.description,
				type: ListType.Active,
				customData: [{
					key: "functionKey",
					value: mParameters.key
				}],
				press: mParameters.press
			});
		};

		oPopoverItems.functionList = new List({
			mode: ListMode.SingleSelectMaster,
			itemPress: function () {
				this.getSelectedItem().firePress();
			}
		});

		oParent._getAllFunctions().forEach(function (oItem) {
			oPopoverItems.functionList.addItem(fnCreateItem({
				key: oItem.key,
				title: oItem.title,
				description: oItem.description,
				press: that._updateOrCreateItem.bind(that, {
					key: oItem.key,
					type: oItem.type,
					functionObject: oItem.functionObject
				})
			}));
		});
	};

	CalculationBuilderExpression.prototype._createPopoverOperatorsItems = function (oPopoverItems) {
		var fnGetOperatorsButtons = function (oOperators) {
			var aButtons = [];

			Object.keys(oOperators).forEach(function (sKey) {
				aButtons.push(new Button({
					text: oOperators[sKey],
					press: this._updateOrCreateItem.bind(this, {
						type: ItemType.Operator,
						key: oOperators[sKey]
					})
				}).addStyleClass("sapCalculationBuilderPopoverOperatorsButton").addStyleClass("sapUiTinyMarginEnd"));
			}.bind(this));

			return aButtons;
		}.bind(this);

		var fnGetPanel = function (sTitle, oOperatorTypes) {
			return new Panel({
				content: [
					new Title({
						width: "100%",
						text: sTitle
					}),
					fnGetOperatorsButtons(oOperatorTypes)
				]
			});
		};

		oPopoverItems.operatorsItems = [];

		if (this.getParent().getAllowComparisonOperators()) {
			oPopoverItems.operatorsItems.push(fnGetPanel("Comparison operators:", ComparisonOperatorType));
		}

		if (this.getParent().getAllowLogicalOperators()) {
			oPopoverItems.operatorsItems.push(fnGetPanel("Logical operators:", LogicalOperatorType));
		}
	};

	CalculationBuilderExpression.prototype._createPopoverNavContainer = function (oPopoverItems) {
		var fnNavToPage = function (sId) {
			var oPage = oNavContainer.getPage(sId);
			oNavContainer.to(oPage);
		};

		var fnNavBack = function () {
			oNavContainer.back();
		};

		var aPages = [
			new StandardListItem({
				title: oResourceBundle.getText("CALCULATION_BUILDER_CONSTANTS_TITLE"),
				type: ListType.Active,
				description: oResourceBundle.getText("CALCULATION_BUILDER_CONSTANTS_CATEGORY_DESCRIPTION"),
				icon: Icons.CONSTANTS_CATEGORY,
				press: fnNavToPage.bind(this, this.getId() + Ids.PAGE_CONSTANT)
			}),
			new StandardListItem({
				title: oResourceBundle.getText("CALCULATION_BUILDER_VARIABLES_TITLE"),
				description: oResourceBundle.getText("CALCULATION_BUILDER_VARIABLES_CATEGORY_DESCRIPTION"),
				icon: Icons.VARIABLES_CATEGORY,
				press: fnNavToPage.bind(this, this.getId() + Ids.PAGE_VARIABLE),
				type: ListType.Active
			}),
			new StandardListItem({
				title: oResourceBundle.getText("CALCULATION_BUILDER_FUNCTIONS_TITLE"),
				type: ListType.Active,
				description: oResourceBundle.getText("CALCULATION_BUILDER_FUNCTIONS_CATEGORY_DESCRIPTION"),
				icon: Icons.FUNCTIONS_CATEGORY,
				press: fnNavToPage.bind(this, this.getId() + Ids.PAGE_FUNCTIONS)
			})];

		if (oPopoverItems.operatorsItems.length > 0) {
			aPages.unshift(new StandardListItem({
				title: oResourceBundle.getText("CALCULATION_BUILDER_OPERATORS_TITLE"),
				type: ListType.Active,
				description: oResourceBundle.getText("CALCULATION_BUILDER_OPERATORS_CATEGORY_DESCRIPTION"),
				icon: Icons.OPERATORS_CATEGORY,
				press: fnNavToPage.bind(this, this.getId() + Ids.PAGE_OPERATORS)
			}));
		}

		var oNavContainer = new NavContainer({
			defaultTransitionName: "show",
			navigate: function (oEvent) {
				var oActualPage = oEvent.getParameters().to;
				oActualPage.setFooter(this._getPageFooter(oActualPage.getId(), oPopoverItems));
			}.bind(this),
			pages: [
				new Page({
					id: this.getId() + Ids.PAGE_MAIN,
					showHeader: false,
					content: [
						oPopoverItems.layout,
						new FlexBox({
							direction: FlexDirection.Column,
							items: [new List({
								items: aPages
							})]
						}).addStyleClass("sapUiTinyMargin").addStyleClass("sapCalculationBuilderNavMainPage")
					]
				}),
				new Page({
					id: this.getId() + Ids.PAGE_OPERATORS,
					content: [
						new FlexBox({
							direction: FlexDirection.Column,
							items: [oPopoverItems.operatorsItems]
						}).addStyleClass("sapUiSmallMargin")
					],
					showNavButton: true,
					title: oResourceBundle.getText("CALCULATION_BUILDER_OPERATORS_PAGE_TITLE"),
					navButtonPress: fnNavBack
				}),
				new Page({
					id: this.getId() + Ids.PAGE_CONSTANT,
					content: [
						new FlexBox({
							direction: FlexDirection.Column,
							items: [oPopoverItems.constantInput]
						}).addStyleClass("sapUiSmallMargin")
					],
					showNavButton: true,
					title: oResourceBundle.getText("CALCULATION_BUILDER_CONSTANTS_PAGE_TITLE"),
					navButtonPress: fnNavBack
				}),
				new Page({
					id: this.getId() + Ids.PAGE_VARIABLE,
					content: [
						new FlexBox({
							direction: FlexDirection.Column,
							items: [
								oPopoverItems.searchField,
								oPopoverItems.variablesList
							]
						}).addStyleClass("sapUiTinyMargin")
					],
					showNavButton: true,
					title: oResourceBundle.getText("CALCULATION_BUILDER_VARIABLES_PAGE_TITLE"),
					navButtonPress: fnNavBack
				}),
				new Page({
					id: this.getId() + Ids.PAGE_FUNCTIONS,
					content: [
						new FlexBox({
							direction: FlexDirection.Column,
							items: [oPopoverItems.functionList]
						}).addStyleClass("sapUiTinyMargin")
					],
					showNavButton: true,
					title: oResourceBundle.getText("CALCULATION_BUILDER_FUNCTIONS_PAGE_TITLE"),
					navButtonPress: fnNavToPage.bind(this, this.getId() + Ids.PAGE_MAIN)
				})
			]
		});

		oPopoverItems.navContainer = oNavContainer;
	};

	CalculationBuilderExpression.prototype._createPopover = function (oPopoverItems) {
		var fnShowCorrectPage = function () {
			var oItem = this._oCurrentItem,
				sCurrentPageId = oPopoverItems.navContainer.getCurrentPage().getId(),
				oSelectedItemInVariablesList = oPopoverItems.variablesList.getSelectedItem(),
				oSelectedItemInFunctionList = oPopoverItems.functionList.getSelectedItem(),
				sShowPageId, aVariableListItems, aFunctionListItems, sFunctionKey;

			oPopoverItems.constantInput.setValue("");
			// Reset selected item in Variable List and Function List
			if (oSelectedItemInVariablesList) {
				oPopoverItems.variablesList.setSelectedItem(oSelectedItemInVariablesList, false);
			}
			if (oSelectedItemInFunctionList) {
				oPopoverItems.functionList.setSelectedItem(oSelectedItemInFunctionList, false);
			}

			if (!oItem) {
				sShowPageId = this.getId() + Ids.PAGE_MAIN;
			} else {
				if (oItem._isFunction()) {
					sFunctionKey = oItem.getKey();
					sShowPageId = this.getId() + Ids.PAGE_FUNCTIONS;

					// Setup selected item in Function List
					aFunctionListItems = oPopoverItems.functionList.getItems();
					for (var i = 0; i < aFunctionListItems.length; i++) {
						var sKey = aFunctionListItems[i].data("functionKey");

						if ((sKey && sKey.toLowerCase()) === sFunctionKey.toLowerCase()) {
							oPopoverItems.functionList.setSelectedItem(aFunctionListItems[i], true);
							break;
						}
					}
				} else if (oItem._isConstant()) {
					// Setup for Constants
					oPopoverItems.constantInput.setValue(oItem.getKey());
					sShowPageId = this.getId() + Ids.PAGE_CONSTANT;
				} else if (oItem._isVariable()) {
					// Setup selected item in Variables List
					aVariableListItems = oPopoverItems.variablesList.getItems();
					for (var i = 0; i < aVariableListItems.length; i++) {
						if (aVariableListItems[i].getTitle() === oItem.getKey()) {
							oPopoverItems.variablesList.setSelectedItem(aVariableListItems[i], true);
							break;
						}
					}
					sShowPageId = this.getId() + Ids.PAGE_VARIABLE;
				} else {
					sShowPageId = this.getId() + Ids.PAGE_MAIN;
				}
			}

			if (sShowPageId !== sCurrentPageId) {
				if (sShowPageId !== this.getId() + Ids.PAGE_MAIN) {
					// Set correct previous page
					oPopoverItems.navContainer.backToPage(this.getId() + Ids.PAGE_MAIN);
				}
				oPopoverItems.navContainer.to(oPopoverItems.navContainer.getPage(sShowPageId), "show");
			} else {
				// Set correct footer when navigation event of NavContainer is not triggered
				oPopoverItems.navContainer.getCurrentPage().setFooter(this._getPageFooter(sCurrentPageId, oPopoverItems));
			}
		}.bind(this);

		this._oPopover = new ResponsivePopover({
			showHeader: false,
			contentWidth: "370px",
			contentHeight: "400px",
			placement: PlacementType.Bottom,
			content: [oPopoverItems.navContainer],
			beforeOpen: fnShowCorrectPage,
			afterClose: function () {
				this._bDragging = false;
				this._clearNewButtonPositions();
			}.bind(this)
		});
	};

	CalculationBuilderExpression.prototype._getPageFooter = function (sPageId, oPopoverItems) {
		var bEnabledConfirm = false,
			bEnabledDelete = false,
			fnConfirm = function () {
			};

		if (this._oCurrentItem && !this._oCurrentItem._bIsNew) {
			bEnabledDelete = true;
		}

		if (sPageId === (this.getId() + Ids.PAGE_CONSTANT)) {
			bEnabledConfirm = true;
			fnConfirm = function () {
				if (oPopoverItems.constantInput.getValue() !== "") {
					this._updateOrCreateItem({
						type: ItemType.Constant,
						key: oPopoverItems.constantInput.getValue()
					});
					oPopoverItems.constantInput.setValueState(ValueState.None);
				} else {
					oPopoverItems.constantInput.setValueState(ValueState.Error);
				}
			}.bind(this);
		}

		return new Toolbar({
			content: [
				new Button({
					enabled: bEnabledDelete,
					text: oResourceBundle.getText("CALCULATION_BUILDER_DELETE_BUTTON"),
					press: this._deleteItem.bind(this)
				}),
				new ToolbarSpacer(),
				new Button({
					enabled: bEnabledConfirm,
					text: oResourceBundle.getText("CALCULATION_BUILDER_CONFIRM_BUTTON"),
					press: fnConfirm
				}),
				new Button({
					text: oResourceBundle.getText("CALCULATION_BUILDER_CLOSE_BUTTON"),
					press: this._instantClose.bind(this)
				})
			]
		});
	};

	/* =========================================================== */
	/* Private methods	    									   */
	/* =========================================================== */
	CalculationBuilderExpression.prototype._updateOrCreateItem = function (mArguments) {
		var bIsNewItem = !this._oCurrentItem || this._oCurrentItem._bIsNew,
			oParent = this.getParent(),
			oFunction = mArguments.functionObject,
			iItemIndex;

		if (bIsNewItem) {
			this._oCurrentItem = new CalculationBuilderItem({
				key: mArguments.key
			});

			iItemIndex = isNaN(this._iCurrentIndex) ? this.getItems().length : this._iCurrentIndex;
			this.insertItem(this._oCurrentItem, iItemIndex);

			if (oFunction) {
				var aItems = mArguments.type === ItemType.Function ? oFunction.template : oParent._convertToTemplate(oFunction.getItems());
				oParent._insertFunctionItems(aItems, iItemIndex + 1);
			}
		} else {
			this._oCurrentItem.setKey(mArguments.key);
			iItemIndex = this.getItems().indexOf(this._oCurrentItem);
		}

		if (mArguments.type) {
			this._oCurrentItem._sType = mArguments.type;
		}

		this._instantClose();
		this._aErrors = this._validateSyntax();
		this._fireAfterValidation();

		if (bIsNewItem) {
			this._bSkipValidation = true;
		}

		this._fireChange();
	};

	CalculationBuilderExpression.prototype._expandAllVariables = function () {
		this.getItems().forEach(function (oItem) {
			if (oItem.isExpandable()) {
				oItem._expandVariable(false);
			}
		});

		this._aErrors = this._validateSyntax();
		this._fireAfterValidation();
		this._fireChange();
	};

	CalculationBuilderExpression.prototype._handleDelete = function (oEvent) {
		if (this._isEmptySelected()) {
			return;
		}
		this._bAreSelectedItemsDeleting = true;

		MessageBox.show(oResourceBundle.getText("CALCULATION_BUILDER_DELETE_MESSAGE_TEXT"), {
				icon: MessageBox.Icon.WARNING,
				title: oResourceBundle.getText("CALCULATION_BUILDER_DELETE_MESSAGE_TITLE"),
				actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
				onClose: function (sAction) {
					var that = this;

					if (sAction === MessageBox.Action.YES) {
						this.$().find(".sapCalculationBuilderSelected .sapCalculationBuilderItem").each(function () {
							that.removeItem(sap.ui.getCore().byId(jQuery(this)[0].id));
						});
						this._fireChange();
					}
					this._bAreSelectedItemsDeleting = false;
				}.bind(this)
			}
		);
	};

	CalculationBuilderExpression.prototype._handleEnter = function (oEvent) {
		var $item = jQuery(oEvent.target),
			oItem;

		if (this._oItemNavigation && !this._bReadOnly) {
			if ($item.hasClass("sapCalculationBuilderNewItem")) {
				oItem = this._getNewItem();

				if (oItem) {
					oItem._buttonPress(oEvent);
				}
			} else if ($item.hasClass("sapCalculationBuilderItem")) {
				oItem = this._getItemById($item[0].id);

				if (oItem) {
					oItem._buttonPress(oEvent);
				}
			} else if ($item.hasClass("sapCalculationBuilderItemExpandButton")) {
				oItem = this._getItemById($item.closest(".sapCalculationBuilderItem")[0].id);

				if (oItem) {
					oItem._expandButtonPress(oEvent);
				}
			}
		}
	};

	CalculationBuilderExpression.prototype._handleSpace = function (oEvent) {
		this._selectItem(oEvent.target);
	};

	CalculationBuilderExpression.prototype._handleCtrlNext = function (oEvent) {
		this._moveItems(Directions.KEY_NEXT);
	};

	CalculationBuilderExpression.prototype._handleCtrlPrevious = function (oEvent) {
		this._moveItems(Directions.KEY_PREVIOUS);
	};

	CalculationBuilderExpression.prototype._getVariableByKey = function (sKey) {
		var aVariables = this.getVariables();

		if (!sKey) {
			return null;
		}

		sKey = sKey.toLowerCase();

		for (var i = 0; i < aVariables.length; i++) {
			if (aVariables[i].getKey().toLowerCase() === sKey) {
				return aVariables[i];
			}
		}

		return null;
	};

	/* =========================================================== */
	/* Setters & getters, helper methods 						   */
	/* =========================================================== */
	CalculationBuilderExpression.prototype.setTitle = function (sTitle) {
		var oTitle = this._oToolbarTitle;

		if (oTitle) {
			oTitle.setText(sTitle);
			oTitle.setVisible(!!sTitle);
		}
		this.setProperty("title", sTitle);
	};

	CalculationBuilderExpression.prototype._deleteItem = function () {
		this.removeItem(this._oCurrentItem);
		this._aErrors = this._validateSyntax();
		this._fireAfterValidation();
		this._instantClose();
		this._fireChange();
	};

	CalculationBuilderExpression.prototype._openDialog = function (mArguments) {
		this._oCurrentItem = mArguments.currentItem;
		this._iCurrentIndex = mArguments.index;
		this._oPopover.openBy(mArguments.opener);
	};

	CalculationBuilderExpression.prototype._setupDroppable = function (aItems) {
		var that = this;

		aItems = aItems || this.$().find(".sapCalculationBuilderDroppable");

		aItems.droppable({
			scope: that.getId() + "-scope",
			tolerance: "pointer",
			activeClass: "sapCalculationBuilderDroppableActive",
			hoverClass: "sapCalculationBuilderDroppableActive",
			drop: function (oEvent, ui) {
				if (!ui.draggable.hasClass("sapCalculationBuilderSelected")) {
					that._selectItem(ui.draggable[0]);
				}
				that._moveItems(Directions.MOUSE, parseInt(jQuery(this).attr("index"), 10));
				that._bDragging = false;
			},
			over: function (event, ui) {
				that._bDragging = true;
			}
		});
	};

	CalculationBuilderExpression.prototype._clearNewButtonPositions = function () {
		var $this = this.$();

		$this.find(".sapCalculationBuilderDelimiterNewButton").hide(200).css("opacity", 0.5);
		$this.find(".sapCalculationBuilderItem").animate({
			"left": 0
		}, 300);
	};

	CalculationBuilderExpression.prototype._setupNewButtonEvents = function () {
		var OFFSET = 13,
			TIMEOUT = 300;

		var aItems = this.$().find(".sapCalculationBuilderDelimiter[data-events!='bound']"),
			aButtons = this.$().find(".sapCalculationBuilderDelimiterNewButton[data-events!='bound']"),
			that = this,
			bExecute, oTimeout;

		var fnAnimate = function ($el, iOffset) {
			$el.prev().animate({
				"left": -iOffset
			}, TIMEOUT);
			$el.next().animate({
				"left": iOffset
			}, TIMEOUT);
		};

		aButtons.click(function (ev) {
			var $this = jQuery(this),
				iIndex = parseInt($this.attr("index"), 10);

			$this.css("opacity", 1);
			that._oCurrentItem = null;
			that._iCurrentIndex = iIndex;
			that._openDialog({
				opener: this,
				index: iIndex
			});
		});
		aButtons.attr("data-events", "bound");

		aItems.mouseover(function (ev) {
			var $this = jQuery(this);
			if (!that._bDragging && !that._oPopover.isOpen()) {

				bExecute = true;
				oTimeout = setTimeout(function () {
					if (bExecute) {
						bExecute = false;
						fnAnimate($this, OFFSET);
						$this.find(".sapCalculationBuilderDelimiterNewButton").show(200);
					}

				}, 700);
			}
		});

		aItems.mouseout(function (ev) {
			var $btn = jQuery(this).find(".sapCalculationBuilderDelimiterNewButton"),
				$this = jQuery(this);

			bExecute = false;
			clearTimeout(oTimeout);

			if (that._bDragging || that._oPopover.isOpen()) {
				return;
			}

			if (!$btn.is(':hover')) {
				fnAnimate($this, 0);
				$btn.hide(200).css("opacity", 0.5);
			}
		});

		aItems.attr("data-events", "bound");
	};

	CalculationBuilderExpression.prototype._setupSelectable = function () {
		this.$().selectable({
			cancel: ".sapCalculationBuilderCancelSelectable",
			distance: 5,
			start: function () {
				this._deselect();
				this._instantClose();
			}.bind(this),
			stop: function () {
				this._selectItems(this.$().find(".sapCalculationBuilderItem.ui-selected"));
			}.bind(this)
		});
	};

	CalculationBuilderExpression.prototype._selectItemsTo = function ($selectedItem) {
		var $selectedItemDelimiter = jQuery($selectedItem.next(".sapCalculationBuilderDelimiter")[0]),
			iSelectedIndex = $selectedItemDelimiter.attr("index") - 1,
			$this = this.$(),
			iFrom, iTo, aDomItems, $delimiterFrom, $delimiterTo;

		if ($selectedItem.parent().hasClass("sapCalculationBuilderSelected") || this._isEmptySelected()) {
			this._selectItem($selectedItem);
			return;
		}

		if (iSelectedIndex > this._iLastSelectedIndex) {
			iFrom = this._iFirstSelectedIndex;
			iTo = iSelectedIndex + 1;
		} else {
			iFrom = iSelectedIndex;
			iTo = this._iLastSelectedIndex + 1;
		}

		this._deselect();
		$delimiterFrom = $this.find(".sapCalculationBuilderDelimiter[index=\"" + iFrom + "\"]");
		$delimiterTo = $this.find(".sapCalculationBuilderDelimiter[index=\"" + iTo + "\"]");

		aDomItems = $delimiterFrom.nextUntil($delimiterTo, ".sapCalculationBuilderItem");
		this._selectItems(aDomItems);
	};

	CalculationBuilderExpression.prototype._selectItems = function (aDomSelectedItems) {
		for (var i = 0; i < aDomSelectedItems.length; i++) {
			this._selectItem(aDomSelectedItems[i]);
		}
	};

	CalculationBuilderExpression.prototype._selectItem = function (oDomSelectedItem) {
		var $selected = this.$().find(".sapCalculationBuilderSelected"),
			$selectedItem = jQuery(oDomSelectedItem),
			$selectedItemDelimiter = jQuery($selectedItem.next(".sapCalculationBuilderDelimiter")[0]),
			nSelectedLength = $selected[0].children.length,
			iSelectedIndex = $selectedItemDelimiter.attr("index") - 1,
			bAppToEnd = true;

		if (!this._oItemNavigation || !this._getItemById($selectedItem[0].id) || this._bReadOnly) {
			return;
		}

		if (nSelectedLength === 0) {
			this._iFirstSelectedIndex = iSelectedIndex;
			this._iLastSelectedIndex = iSelectedIndex;
		} else {
			if ($selectedItem.parent().hasClass("sapCalculationBuilderSelected")) {
				if (this._iFirstSelectedIndex === iSelectedIndex) {
					this._iFirstSelectedIndex++;
					this._deselectItem($selectedItem, false);
				} else if (this._iLastSelectedIndex === iSelectedIndex) {
					this._iLastSelectedIndex--;
					this._deselectItem($selectedItem, true);
				} else {
					this._deselect();
				}
				this._setCorrectFocus();
				return;
			}

			if ((this._iFirstSelectedIndex - iSelectedIndex) === 1) {
				// If next selected item is on left side
				this._iFirstSelectedIndex = iSelectedIndex;
				bAppToEnd = false;
			} else if ((iSelectedIndex - this._iLastSelectedIndex) === 1) {
				// If next selected item is on right side
				this._iLastSelectedIndex = iSelectedIndex;
				bAppToEnd = true;
			} else {
				this._iFirstSelectedIndex = iSelectedIndex;
				this._iLastSelectedIndex = iSelectedIndex;
				this._deselect();
			}
		}

		if (this._isEmptySelected()) {
			$selected.detach().insertBefore($selectedItem);
			$selected.draggable({
				revert: "invalid",
				axis: "x",
				scope: this.getId() + "-scope"
				// handle: ".sapCalculationBuilderDraggable"
			});
		}

		if (bAppToEnd) {
			$selectedItem.detach().appendTo($selected);
			$selectedItemDelimiter.detach().appendTo($selected);
		} else {
			$selectedItemDelimiter.detach().prependTo($selected);
			$selectedItem.detach().prependTo($selected);
		}

		if ($selectedItem.hasClass("sapCalculationBuilderItem")) {
			$selectedItem.draggable("disable");
			$selectedItem.addClass("ui-selected");
		}
		this._setCorrectFocus();
	};

	CalculationBuilderExpression.prototype._isEmptySelected = function () {
		var $selected = this.$().find(".sapCalculationBuilderSelected");

		if ($selected) {
			return $selected.is(":empty");
		}
		return true;
	};

	CalculationBuilderExpression.prototype._deselectItem = function ($item, bInsertAfter) {
		var $selected = this.$().find(".sapCalculationBuilderSelected"),
			$selectedItemDelimiter = jQuery($item.next(".sapCalculationBuilderDelimiter")[0]);

		if (!$item.hasClass("ui-selected")) {
			return;
		}

		if (bInsertAfter) {
			$selectedItemDelimiter.detach().insertAfter($selected);
			$item.detach().insertAfter($selected);
		} else {
			$item.detach().insertBefore($selected);
			$selectedItemDelimiter.detach().insertBefore($selected);
		}
		$item.draggable("enable");
		$item.removeClass("ui-selected");
	};

	CalculationBuilderExpression.prototype._deselect = function () {
		var $selected = this.$().find(".sapCalculationBuilderSelected");

		if (this._isEmptySelected()) {
			return;
		}

		this.$().find(".sapCalculationBuilderSelected .ui-selected").removeClass("ui-selected");
		$selected.children().each(function () {
			var $this = jQuery(this);

			if ($this.hasClass("sapCalculationBuilderItem")) {
				$this.draggable("enable");
			}
			$this.detach().insertBefore($selected);
		});
	};

	CalculationBuilderExpression.prototype._setupKeyboard = function () {
		var oFocusRef = this.getDomRef(),
			aDomRefs = [];

		this.getItems().forEach(function (oItem) {
			aDomRefs.push(oItem.getFocusDomRef());
			if (oItem.isExpandable()) {
				aDomRefs.push(oItem.$("expandbutton"));
			}
		});
		aDomRefs.push(this._getNewItem().getFocusDomRef());

		if (!this._oItemNavigation) {
			this._oItemNavigation = new ItemNavigation();
			this.addDelegate(this._oItemNavigation);
		}

		this._oItemNavigation.setRootDomRef(oFocusRef);
		this._oItemNavigation.setItemDomRefs(aDomRefs);
		this._oItemNavigation.setCycling(true);
		this._oItemNavigation.setPageSize(250);
	};

	CalculationBuilderExpression.prototype._setCorrectFocus = function () {
		jQuery(this._oItemNavigation.getFocusedDomRef()).focus();
	};

	CalculationBuilderExpression.prototype._getItemById = function (sId) {
		return this.getItems().filter(function (oItem) {
			return oItem.getId() === sId;
		})[0];
	};

	CalculationBuilderExpression.prototype._getNewItem = function () {
		if (!this._oNewItem) {
			this._oNewItem = new CalculationBuilderItem();
			this._oNewItem._bIsNew = true;
			this._oNewItem.setParent(this, null, true);
		}

		return this._oNewItem;
	};

	CalculationBuilderExpression.prototype._instantClose = function () {
		var oPopover = this._oPopover.getAggregation("_popup");
		if (oPopover && oPopover.oPopup && oPopover.oPopup.close) {
			oPopover.oPopup.close(0);

			// Set focus to correct item
			this._setCorrectFocus();
		}
	};

	CalculationBuilderExpression.prototype._printErrors = function () {
		this.getItems().forEach(function (oItem) {
			var oError = oItem._getItemError(),
				$this = oItem.$(),
				sFnName = !!oError ? "addClass" : "removeClass";

			$this[sFnName]("sapCalculationBuilderItemErrorSyntax");
			$this.attr("title", oError ? oError.title : "");
		});
	};

	CalculationBuilderExpression.prototype._validateSyntax = function (mParameters) {
		var fnValidateFirstSymbol = function () {
			var oFirst = this.getItems()[iFrom],
				sKey = oFirst.getKey();

			return !oFirst._isOperator() || sKey === "(" || sKey === "+" || sKey === "-" || sKey.toLowerCase() === "not";
		}.bind(this);

		var fnValidateLastSymbol = function () {
			var aItems = this.getItems(),
				oLast = aItems[iTo - 1];

			return !oLast._isOperator() || oLast.getKey() === ")";
		}.bind(this);

		var fnGetCode = function (oItem) {
			var sKey = oItem.getKey().toLowerCase();
			if (oItem._isOperator()) {
				return sKey === "not" || sKey === "(" || sKey === ")" ? sKey : "#op#";
			}

			return oItem._isFunction() ? "#fun#" : "#col#";
		};

		var fnCreateFunctionItem = function (oItem) {
			return {
				index: i,
				item: oItem,
				items: [],
				text: oItem.getKey() + (oItem._isFunction() ? "(" : "")
			};
		};

		var fnGetFunctionDefinition = function (oFunction) {
			var iBracketCount = 1,
				iFunctionIndex = i;

			i++;
			for (; i < aItems.length; i++) {
				var oItem = aItems[i],
					sKey = oItem.getKey(),
					oFunctionItem = fnCreateFunctionItem(oItem);

				oFunction.items.push(oFunctionItem);

				switch (sKey) {
					case ")":
						iBracketCount--;
						break;
					case "(":
						iBracketCount++;
						break;
					case ",":
						iBracketCount = 1;
						break;
				}

				if (oItem._isFunction()) {
					fnGetFunctionDefinition(oFunctionItem);
					oFunction.text += oFunctionItem.text;
				} else {
					oFunction.text += sKey;
				}

				if (iBracketCount === 0) {
					// End function
					return oFunction;
				}
			}

			aErrors.push({
				index: iFunctionIndex,
				title: oResourceBundle.getText("CALCULATION_BUILDER_CLOSING_BRACKET_ERROR_TEXT")
			});

			return oFunction;
		};

		var fnValidateFunctionParameters = function (oFunction) {
			var nAllowParametersCount = this.getParent()._getFunctionAllowParametersCount(oFunction.item.getKey()),
				aParameters = [], aParameterItems = [];

			// Split function to parameters
			oFunction.items.forEach(function (oItem) {
				if (oItem.item._isComma()) {
					aParameters.push(aParameterItems);
					aParameterItems = [];
				} else {
					aParameterItems.push(oItem);
				}
			});

			if (aParameterItems.length > 0 && aParameterItems[aParameterItems.length - 1].text === ")") {
				aParameterItems.pop();
			}

			aParameters.push(aParameterItems);

			if (aParameters.length !== nAllowParametersCount) {
				aErrors.push({
					index: oFunction.index,
					title: oResourceBundle.getText(aParameters.length < nAllowParametersCount ? "CALCULATION_BUILDER_TOO_LITTLE_PARAMETERS" : "CALCULATION_BUILDER_TOO_MANY_PARAMETERS")
				});
			}

			if (aParameters.length > 0) {
				aParameters.forEach(function (aPartGroup) {
					if (aPartGroup.length > 0) {
						jQuery.merge(aErrors, this._validateSyntax({
							from: aPartGroup[0].index,
							to: aPartGroup[aPartGroup.length - 1].index + 1
						}));
					} else {
						aErrors.push({
							index: oFunction.index,
							title: oResourceBundle.getText("CALCULATION_BUILDER_EMPTY_PARAMETER")
						});
					}
				}.bind(this));
			}
		}.bind(this);

		var oAllowed = {
			"#op#": ["(", "#col#", "#fun#", "not"],
			"(": ["(", "+", "-", "#col#", "#fun#", "not"],
			")": ["#op#", ")"],
			"#col#": ["#op#", ")"],
			"#fun#": ["(", "+", "-", "#col#", "#fun#"],
			"not": ["#col#", "#fun#", "not", "("]
		};

		mParameters = mParameters || {};

		var aItems = mParameters.items || this.getItems(),
			sCurrent, sNext, oItem, oNextItem, sNextKey,
			iFrom = mParameters.from || 0,
			iTo = mParameters.to || aItems.length,
			bIsRoot = (iFrom === 0 && iTo === aItems.length),
			aBrackets = [], aErrors = [];

		if (aItems.length > 0) {
			if (!fnValidateFirstSymbol()) {
				aErrors.push({
					index: iFrom,
					title: oResourceBundle.getText("CALCULATION_BUILDER_FIRST_CHAR_ERROR_TEXT")
				});
			}

			if (!fnValidateLastSymbol()) {
				aErrors.push({
					index: iTo - 1,
					title: oResourceBundle.getText("CALCULATION_BUILDER_LAST_CHAR_ERROR_TEXT")
				});
			}
		}

		for (var i = iFrom; i < iTo; i++) {
			oItem = aItems[i];

			if (oItem._getType() === ItemType.Error) {
				aErrors.push({
					index: i,
					title: oResourceBundle.getText("CALCULATION_BUILDER_SYNTAX_ERROR_TEXT")
				});
				continue;
			}

			if (!mParameters.skipCustomValidation && oItem._isFunction()) {
				var oCustomFunction = oItem._getCustomFunction(),
					oFunction = fnGetFunctionDefinition(fnCreateFunctionItem(oItem));

				if (oCustomFunction && !oCustomFunction.getUseDefaultValidation()) {
					var oResult = new ValidationResult();
					this.getParent().fireValidateFunction({
						definition: oFunction,
						customFunction: oCustomFunction,
						result: oResult
					});

					jQuery.merge(aErrors, oResult.getErrors());
				} else {
					fnValidateFunctionParameters(oFunction);
				}
			}

			if (i < iTo - 1) {
				oNextItem = aItems[i + 1];
				sCurrent = fnGetCode(aItems[i]);
				sNext = fnGetCode(oNextItem);
				sNextKey = oNextItem ? oNextItem.getKey().toLowerCase() : "";

				if (oAllowed[sCurrent].indexOf(sNext) === -1 &&
					oAllowed[sCurrent].indexOf(sNextKey) === -1) {
					var oData = {index: i + 1};

					if (oItem._isOperator() && oNextItem._isOperator()) {
						oData.title = oResourceBundle.getText("CALCULATION_BUILDER_BEFORE_OPERATOR_ERROR_TEXT", oNextItem.getKey());
					} else if (!oItem._isOperator() && !oNextItem._isOperator()) {
						oData.title = oResourceBundle.getText("CALCULATION_BUILDER_BETWEEN_NOT_OPERATORS_ERROR_TEXT", [oItem.getKey(), oNextItem.getKey()]);
					} else if (oItem.getKey() === ")" && !oNextItem._isOperator()) {
						oData.title = oResourceBundle.getText("CALCULATION_BUILDER_AFTER_CLOSING_BRACKET_ERROR_TEXT");
					} else if (!oItem._isOperator() && (oNextItem.getKey() === "(")) {
						oData.title = oResourceBundle.getText("CALCULATION_BUILDER_BEFORE_OPENING_BRACKET_ERROR_TEXT");
					} else {
						oData.title = oResourceBundle.getText("CALCULATION_BUILDER_CHAR_ERROR_TEXT");
					}
					aErrors.push(oData);
				}
			}

			if (oItem._isFunction()) {
				continue;
			}

			if (bIsRoot && oItem.getKey() === ",") {
				aErrors.push({
					index: i,
					title: oResourceBundle.getText("CALCULATION_BUILDER_WRONG_PARAMETER_MARK")
				});
			}

			if ((oItem._isOperator() && oItem.getKey() === "(") || oItem._isFunction()) {
				aBrackets.push(i);
			}

			if (oItem._isOperator() && oItem.getKey() === ")") {
				if (aBrackets.length === 0) {
					aErrors.push({
						index: i,
						title: oResourceBundle.getText("CALCULATION_BUILDER_OPENING_BRACKET_ERROR_TEXT")
					});
				} else {
					aBrackets.pop();
				}
			}
		}

		for (i = 0; i < aBrackets.length; i++) {
			aErrors.push({
				index: aBrackets[i],
				title: oResourceBundle.getText("CALCULATION_BUILDER_CLOSING_BRACKET_ERROR_TEXT")
			});
		}

		return aErrors;
	};

	CalculationBuilderExpression.prototype._getType = function (sKey) {
		return this.getParent() && this.getParent()._getType(sKey);
	};

	CalculationBuilderExpression.prototype._setItems = function (aItems) {
		this._smartRender(aItems);
	};

	CalculationBuilderExpression.prototype._moveItems = function (sDirection, iNewIndex) {
		var aNewItems = [],
			aItems = this.getItems(),
			$selected = this.$().find(".sapCalculationBuilderSelected"),
			$start, iIndex, oItem, $selectedItems;

		if (this._isEmptySelected()) {
			return;
		}

		$selectedItems = $selected.children();

		if (sDirection === Directions.KEY_PREVIOUS) {
			iIndex = this._iFirstSelectedIndex - 1;
		} else if (sDirection === Directions.KEY_NEXT) {
			iIndex = this._iLastSelectedIndex + 2;
		} else if (sDirection === Directions.MOUSE) {
			iIndex = iNewIndex;
		}

		if (iIndex < 0 || iIndex === (aItems.length + 1)) {
			return;
		}

		$start = this.$().find(".sapCalculationBuilderDelimiter[index=\"" + iIndex + "\"]");

		// Multi select dropping
		for (var i = 0; i < aItems.length + 1; i++) {
			oItem = aItems[i];

			// Indicating where put dragging items
			if (iIndex === i) {
				$selectedItems.each(function () { // eslint-disable-line
					var $this = jQuery(this),
						oItem;

					// Append only items not delimiters
					if ($this.hasClass("sapCalculationBuilderItem")) {
						oItem = sap.ui.getCore().byId(jQuery(this)[0].id);
						aNewItems.push(oItem);
						oItem._bMovingItem = true;
						$this.draggable("enable");

					}

					$this.css("left", 0);
					$this.detach().insertAfter($start).removeClass("");
					$start = $this;
				});
			}

			// Just copy items that are not dragging
			if (oItem && !oItem.$().parent().hasClass("sapCalculationBuilderSelected") && !oItem._bMovingItem) {
				aNewItems.push(oItem);
			}
		}

		$selected.css("left", "");

		jQuery(".sapCalculationBuilderDelimiter").each(function (i) {
			jQuery(this).attr("index", i);
		});

		this.removeAllAggregation("items", true);
		aNewItems.forEach(function (oItem, i) {
			oItem._bMovingItem = false;
			oItem._iIndex = i;
			this.addAggregation("items", oItem, true);
		}.bind(this));

		this._setupKeyboard();
		this._selectItems($selectedItems.filter(function (i, el) {
			return jQuery(el).hasClass("sapCalculationBuilderItem");
		}));

		this._aErrors = this._validateSyntax();
		this._fireAfterValidation();
		this._printErrors();
		this._fireChange();
	};

	CalculationBuilderExpression.prototype._fireAfterValidation = function () {
		this.getParent().fireAfterValidation();
	};

	CalculationBuilderExpression.prototype._smartRender = function (aNewItems) {
		var sHtml = "",
			$this = this.$(),
			aAddedItems = [],
			aItems = this.getItems(),
			iOriginalLength = aItems.length;

		if (!this.getParent()._isExpressionVisible()) {
			this.removeAllAggregation("items", true);
			(aNewItems || []).forEach(function (oItem) {
				this.addAggregation("items", oItem, true);
			}.bind(this));

			return;
		}

		this._bIsCalculationBuilderRendering = true;
		this._deselect();

		var fnAddNew = function (oNewItem) {
			this.addAggregation("items", oNewItem, true);
			oNewItem._iIndex = i;
			if ($this[0]) {
				sHtml += oNewItem._render();
				sHtml += this._renderDelimiter(i + 1);
			}
			aAddedItems.push(oNewItem);
		}.bind(this);

		for (var i = 0; i < aNewItems.length; i++) {
			var oItem = aItems[i];
			if (!oItem) {
				fnAddNew(aNewItems[i]);
			} else if (oItem.getKey() !== aNewItems[i].getKey() || oItem._getType() !== aNewItems[i]._getType()) {
				oItem.setKey(aNewItems[i].getKey(), true);

				oItem._sType = aNewItems[i]._getType();
				oItem.$()[0].innerHTML = oItem._innerRender();
				oItem.$().attr("class", oItem._getClass());
				oItem._setEvents();
			}
		}

		if (aNewItems.length < iOriginalLength) {
			for (var i = aNewItems.length; i < aItems.length; i++) {
				var $item = aItems[i].$();
				$item.next().remove();
				$item.remove();

				this.removeAggregation("items", aItems[i], true);
			}
		}

		if ($this[0] && aAddedItems.length > 0) {
			$this.find(".sapCalculationBuilderDelimiter").last().after(sHtml);

			aAddedItems.forEach(function (oItem) {
				oItem._afterRendering();
			});

			this._setupDroppable($this.find(".sapCalculationBuilderDroppable").filter(function () {
				return parseInt(jQuery(this).attr("index"), 10) > iOriginalLength;
			}));
		}

		this._setupKeyboard();
		this._setupNewButtonEvents();
		this._bIsCalculationBuilderRendering = false;
	};

	CalculationBuilderExpression.prototype._fireChange = function () {
		this.fireEvent("change");
	};

	return CalculationBuilderExpression;

}, /* bExport= */ true);
