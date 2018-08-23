sap.ui.define([
	"jquery.sap.global",
	"./library",
	"sap/ui/core/Control",
	"./CalculationBuilderItem",
	"./CalculationBuilderExpression",
	"./CalculationBuilderInput",
	"./CalculationBuilderFunction",
	"sap/m/OverflowToolbar",
	"sap/m/OverflowToolbarToggleButton",
	"sap/m/OverflowToolbarButton",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"sap/m/ButtonType",
	"sap/ui/core/Popup",
	"sap/m/MessageBox"
], function (jQuery, library, Control, CalculationBuilderItem, CalculationBuilderExpression, CalculationBuilderInput, CalculationBuilderFunction, OverflowToolbar, OverflowToolbarToggleButton,
			 OverflowToolbarButton, ToolbarSpacer, Title, ButtonType, Popup, MessageBox) {
	"use strict";

	var Icons = Object.freeze({
		SHOW_EXPRESSION: "sap-icon://notification-2",
		EXPAND_VARIABLE: "sap-icon://disconnected",
		FULL_SCREEN: "sap-icon://full-screen",
		EXIT_FULL_SCREEN: "sap-icon://exit-full-screen"
	});

	var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.suite.ui.commons");

	var OperatorType = library.CalculationBuilderOperatorType,
		LogicalOperatorType = library.CalculationBuilderLogicalOperatorType,
		ComparisonOperatorType = library.CalculationBuilderComparisonOperatorType,
		ItemType = library.CalculationBuilderItemType,
		FunctionType = library.CalculationBuilderFunctionType,
		LayoutTypes = library.CalculationBuilderLayoutType;

	var FunctionsMap = {
		abs: {
			key: "ABS",
			title: "ABS - Absolute Value",
			allowed: true
		},
		round: {
			key: "Round",
			title: "Round",
			template: ["", ",", ""],
			allowed: true
		},
		roundup: {
			key: "RoundUp",
			title: "Round Up",
			template: ["", ",", ""],
			allowed: true
		},
		rounddown: {
			key: "RoundDown",
			title: "Round Down",
			template: ["", ",", ""],
			allowed: true
		},
		sqrt: {
			key: "SQRT",
			title: "SQRT",
			allowed: true
		},
		"case": {
			key: "Case",
			title: "Case",
			description: "CASE ( \"When\" Expression \"Then\" Expression \"Else\" Expression )",
			template: ["", ",", "", ",", ""]
		},
		ndiv0: {
			key: "NDIV0",
			title: "NDIV0"
		},
		nodim: {
			key: "NODIM",
			title: "NODIM",
			description: "NODIM ( Variable )"
		},
		sumct: {
			key: "SUMCT",
			title: "SUMCT",
			description: "SUMGT ( Variable )"
		},
		sumgt: {
			key: "SUMGT",
			title: "SUMGT",
			description: "SUMGT ( Variable )"
		},
		sumrt: {
			key: "SUMRT",
			title: "SUMRT",
			description: "SUMRT ( Variable )"
		}
	};

	/**
	 * Constructor for a new calculation builder.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Calculation Builder allows you to perform arithmetic calculations on constants and variables
	 * using standard arithmetic operators as well as most common logical operators and functions.<br>
	 * It also provides autocomplete suggestions for variables and checks the expression syntax, as you type.
	 *
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.56.5
	 * @since 1.56.0
	 *
	 * @constructor
	 * @public
	 *
	 * @alias sap.suite.ui.commons.CalculationBuilder
	 * @ui5-metamodel This control/element will also be described in the UI5 (legacy) design time metamodel.
	 */
	var CalculationBuilder = Control.extend("sap.suite.ui.commons.CalculationBuilder", {
		metadata: {
			library: "sap.suite.ui.commons",
			properties: {
				/**
				 * Holds the arithmetic expression.<br>
				 * Not usable for clearing. If you want to clear the whole expression, call the
				 * <code>removeAllItems</code> method.
				 */
				expression: {
					type: "string", group: "Misc", defaultValue: null
				},
				/**
				 * The title of the calculation builder element.
				 */
				title: {
					type: "string", group: "Misc", defaultValue: null
				},
				/**
				 * Defines whether the toolbar is visible.
				 */
				showToolbar: {
					type: "boolean", group: "Misc", defaultValue: true
				},
				/**
				 * Defines whether the expression should be wrapped inside the calculation builder field.<br>
				 * If set to <code>false</code>, the expression is rearranged into a single scrollable row.
				 */
				wrapItemsInExpression: {
					type: "boolean", group: "Misc", defaultValue: true
				},
				/**
				 * Defines the layout type used for the calculation builder.<br>
				 * The layout may include a visual editor, a text editor, or both. In addition, you can set the
				 * text editor to be read-only.
				 */
				layoutType: {
					type: "string", group: "Misc", defaultValue: "Default"
				},
				/**
				 * Defines whether the input toolbar is visible.<br>
				 * The input toolbar contains operators and functions that can be used
				 * in the expression.
				 */
				showInputToolbar: {
					type: "boolean", group: "Misc", defaultValue: true
				},
				/**
				 * Defines whether the control is read-only.
				 */
				readOnly: {
					type: "boolean", group: "Misc", defaultValue: false
				},
				/**
				 * Defines whether comparison operators (<, >, <=, >=, =, !=) are allowed.
				 */
				allowComparisonOperators: {
					type: "boolean", group: "Misc", defaultValue: true
				},
				/**
				 * Defines whether logical operators (AND, OR, XOR, NOT) are allowed.
				 */
				allowLogicalOperators: {
					type: "boolean", group: "Misc", defaultValue: true
				}
			},
			defaultAggregation: "items",
			aggregations: {
				/**
				 * Holds the items (operators and operands) to be displayed in the calculation builder.
				 */
				items: {
					type: "sap.suite.ui.commons.CalculationBuilderItem",
					multiple: true,
					singularName: "item",
					bindable: "bindable",
					forwarding: {
						idSuffix: "-expression",
						aggregation: "items"
					}
				},
				/**
				 * Holds the variables that can be used in the calculation builder.
				 */
				variables: {
					type: "sap.suite.ui.commons.CalculationBuilderVariable",
					multiple: true,
					singularName: "Variable",
					forwarding: {
						idSuffix: "-expression",
						aggregation: "variables"
					}
				},
				/**
				 * Holds the custom functions that can be used in the calculation builder.
				 */
				functions: {
					type: "sap.suite.ui.commons.CalculationBuilderFunction",
					multiple: true,
					singularName: "Function",
					forwarding: {
						idSuffix: "-expression",
						aggregation: "functions"
					}
				}
			},
			events: {
				/**
				 * This event is fired for every custom function included in the expression.<br>
				 * Custom functions can be defined using {@link sap.suite.ui.commons.CalculationBuilderFunction}
				 * and validated using {@link sap.suite.ui.commons.CalculationBuilderValidationResult}.
				 */
				validateFunction: {
					parameters: {
						definition: "object",
						customFunction: "object",
						result: "sap.suite.ui.commons.CalculationBuilderValidationResult"
					}
				},
				/**
				 * This event is fired when the order of items changes, or when some items are added or removed.
				 */
				change: {},
				/**
				 * This event is fired after the expression is validated.
				 */
				afterValidation: {}
			}
		},
		renderer: function (oRm, oCalculationBuilder) {
			var sWrapItemsClass = oCalculationBuilder.getWrapItemsInExpression() ? " sapCalculationBuilderWrapItems " : "",
				sDisplayInput = oCalculationBuilder._bShowInput ? "" : "style=\"display:none\"",
				bIsExpressionVisible = oCalculationBuilder._isExpressionVisible(),
				bIsInputVisible = oCalculationBuilder._isInputVisible(),
				bIsReadOnly = oCalculationBuilder.getReadOnly();

			oRm.write("<div");
			oRm.writeControlData(oCalculationBuilder);
			oRm.addClass("sapCalculationBuilder");
			oRm.writeClasses(oCalculationBuilder);
			oRm.write(">");

			if (oCalculationBuilder.getShowToolbar() && (oCalculationBuilder.getLayoutType() !== LayoutTypes.TextualOnly)) {
				oRm.renderControl(oCalculationBuilder.getToolbar());
			}

			if (bIsExpressionVisible) {
				oCalculationBuilder._oExpressionBuilder._bReadOnly = bIsReadOnly;
				oRm.write("<div class=\"sapCalculationBuilderInsideWrapper" + sWrapItemsClass + "\">");
				oRm.renderControl(oCalculationBuilder._oExpressionBuilder);
				oRm.write("</div>");
			}

			if (bIsExpressionVisible && bIsInputVisible) {
				oRm.write("<div class=\"sapCalculationBuilderDelimiterLine\"></div>");
			}

			if (bIsInputVisible) {
				oCalculationBuilder._oInput._bReadOnly = bIsReadOnly || oCalculationBuilder.getLayoutType() === LayoutTypes.VisualTextualReadOnly;

				oRm.write("<div class=\"sapCalculationBuilderInputOuterWrapper\"" + sDisplayInput + ">");
				oRm.renderControl(oCalculationBuilder._oInput);
				oRm.write("</div>");
			}

			oRm.write("</div>");
		}
	});

	CalculationBuilder.prototype.init = function () {
		// Indicates whether the input is visible
		this._bShowInput = true;

		// Container for full screen mode
		this._oFullScreenContainer = null;

		// Indicates whether the control is in full screen mode
		this._bIsFullScreen = false;

		this._oExpressionBuilder = new CalculationBuilderExpression(this.getId() + "-expression", {
			change: function () {
				var sPlainText = "";

				sPlainText = this._oInput._itemsToString({
					items: this._oExpressionBuilder.getItems(),
					errors: this._oExpressionBuilder._aErrors
				});

				this._oInput._displayError(this._oExpressionBuilder._aErrors.length !== 0);
				this._setExpression(sPlainText);
				this._enableOrDisableExpandAllButton();
				this.fireChange();
			}.bind(this)
		});
		this.addDependent(this._oExpressionBuilder);

		this._oInput = new CalculationBuilderInput(this.getId() + "-input", {
			change: function (oEvent) {
				var sText = oEvent.getParameter("value"),
					aItems = this._oInput._stringToItems(sText);

				this._oExpressionBuilder._setItems(aItems);

				this._oExpressionBuilder._aErrors = this._oExpressionBuilder._validateSyntax();
				this.fireAfterValidation();
				this._oInput._recreateText({
					text: sText,
					position: oEvent.getParameter("position"),
					errors: this._oExpressionBuilder._aErrors
				});
				this._oExpressionBuilder._printErrors();

				// after filling items by suggestion, no validation is done so we have to take this into consideration
				this._oInput._displayError(this._oExpressionBuilder._aErrors.length > 0);
				this._setExpression(this._oInput._getText());
				this._enableOrDisableExpandAllButton();
				this.fireChange();
			}.bind(this)
		});
		this.addDependent(this._oInput);
	};

	CalculationBuilder.prototype.onBeforeRendering = function () {
		this._createToolbar();

		this._oInput._aVariables = this.getVariables();

		if (this._sExpressionDirectValue) {
			this._oExpressionBuilder._setItems(this._oInput._stringToItems(this._sExpressionDirectValue));
		}
		this._sExpressionDirectValue = "";
	};

	CalculationBuilder.prototype.onAfterRendering = function () {
		this._oInput._itemsToString({
			items: this._oExpressionBuilder.getItems(),
			errors: this._oExpressionBuilder._aErrors
		});
	};

	/* =========================================================== */
	/* Public API												   */
	/* =========================================================== */

	/**
	 * Returns the toolbar of the calculation builder.
	 *
	 * @returns {Object} Toolbar
	 * @public
	 */
	CalculationBuilder.prototype.getToolbar = function () {
		return this._oToolbar;
	};

	/**
	 * Returns the input toolbar of the calculation builder.
	 *
	 * @returns {Object} Input toolbar
	 * @public
	 */
	CalculationBuilder.prototype.getInputToolbar = function () {
		return this._oInput && this._oInput._oInputToolbar;
	};

	/**
	 * Checks if the expression syntax is valid.
	 *
	 * @returns {Array} aErrors Array of errors found.
	 * @public
	 */
	CalculationBuilder.prototype.validateParts = function (mParameters) {
		mParameters = mParameters || {};

		return this._oExpressionBuilder._validateSyntax({
			items: mParameters.items,
			from: mParameters.from,
			to: mParameters.to
		});
	};

	/**
	 * Records a new error detected in the expression.
	 *
	 * @param {object} oError Error object with contains following properties:
	 * @param {object} [oError.index] Index of the item that contains errors
	 * @param {number} [oError.title] Title of the error
	 *
	 * @public
	 */
	CalculationBuilder.prototype.appendError = function (oError) {
		this._oExpressionBuilder._aErrors.push(oError);
	};

	/**
	 * Displays errors detected in the expression.
	 *
	 * @returns {Array} aErrors Array of errors detected in the expression.
	 * @public
	 */
	CalculationBuilder.prototype.getErrors = function () {
		return this._oExpressionBuilder._aErrors;
	};


	/**
	 * Checks if the function is visible to the user.
	 * @param {sap.suite.ui.commons.CalculationBuilderFunctionType } sFunction Name of the function
	 * @param {boolean} bAllow True if the function should be visible to the user
	 *
	 * @public
	 */
	CalculationBuilder.prototype.allowFunction = function (sFunction, bAllow) {
		if (!sFunction) {
			return;
		}

		var oFunction = FunctionsMap[sFunction.toLowerCase()];
		if (oFunction) {
			oFunction.allowed = bAllow;
		}
	};

	/* =========================================================== */
	/* Private API												   */
	/* =========================================================== */
	CalculationBuilder.prototype._findInArray = function (sKey, aItems, sProperty) {
		return aItems.some(function (oItem) {
			var sValue = sProperty ? oItem["get" + sProperty]() : oItem;
			return sValue.toLowerCase() === sKey;
		});
	};

	CalculationBuilder.prototype._getFunctionMap = function () {
		return FunctionsMap;
	};

	CalculationBuilder.prototype._getFunctionDefinition = function (sKey) {
		sKey = (sKey || "").toLowerCase();
		return FunctionsMap[sKey] || jQuery.grep(this.getFunctions(), function (oFunction) {
				return oFunction.getKey().toLowerCase() === sKey;
			})[0];
	};

	CalculationBuilder.prototype._getFunctionDescription = function (oFunction) {
		var sExpression;

		if (oFunction.description) {
			return oFunction.description;
		}
		sExpression = oResourceBundle.getText("CALCULATION_BUILDER_EXPRESSION_TITLE");

		if (oFunction.template) {
			var sDescription = (oFunction.key || "") + " ( ";
			oFunction.template.forEach(function (sKey) {
				sDescription += (sKey ? sKey : sExpression) + " ";
			});

			return sDescription + ")";
		}

		return (oFunction.key || "") + " ( " + sExpression + " )";
	};

	CalculationBuilder.prototype._getFunctionTemplateItems = function (oFunction) {
		if (!oFunction) {
			return [];
		}

		var sType = (oFunction instanceof CalculationBuilderFunction) ? ItemType.CustomFunction : ItemType.Function;

		return sType === ItemType.Function ? (oFunction.template || []) : this._convertToTemplate(oFunction.getItems());
	};

	CalculationBuilder.prototype._getFunctionAllowParametersCount = function (sKey) {
		var aTemplate = this._getFunctionTemplateItems(this._getFunctionDefinition(sKey)),
			sText = aTemplate.join("");

		return (sText.match(/,/g) || []).length + 1;
	};

	CalculationBuilder.prototype._convertToTemplate = function (aItems) {
		return aItems.map(function (oItem) {
			return oItem.getKey();
		});
	};

	CalculationBuilder.prototype._insertFunctionItems = function (aItems, iIndex) {
		if (aItems && aItems.length > 0) {
			aItems.forEach(function (sKey) {
				this.insertItem(new CalculationBuilderItem({
					key: sKey
				}), iIndex++);
			}.bind(this));
		} else {
			// no template just empty single parameter
			this.insertItem(new CalculationBuilderItem({
				key: ""
			}), iIndex++);
		}

		this.insertItem(new CalculationBuilderItem({
			key: ")"
		}), iIndex++);
	};

	CalculationBuilder.prototype._isOperator = function (sKey, bAllowLogicalOperator) {
		bAllowLogicalOperator = bAllowLogicalOperator !== false;

		sKey = (sKey || "").toLowerCase();

		return this._findInArray(sKey, Object.keys(OperatorType)) ||
			(bAllowLogicalOperator && this.getAllowLogicalOperators() && this._findInArray(sKey, Object.keys(LogicalOperatorType))) ||
			(this.getAllowComparisonOperators() && this._findInArray(sKey, Object.keys(ComparisonOperatorType)));
	};

	CalculationBuilder.prototype._getType = function (sKey) {
		sKey = (sKey || "").toLowerCase();

		if (!sKey) {
			return ItemType.Empty;
		}

		if (this._isOperator(sKey)) {
			return ItemType.Operator;
		}

		if (this._findInArray(sKey, this.getVariables(), "Key")) {
			return ItemType.Variable;
		}

		if (this._findInArray(sKey, Object.keys(FunctionType))) {
			return ItemType.Function;
		}

		if (this._findInArray(sKey, this.getFunctions(), "Key")) {
			return ItemType.CustomFunction;
		}

		if (!isNaN(sKey)) {
			return ItemType.Constant;
		}

		return ItemType.Error;
	};

	CalculationBuilder.prototype._createToolbar = function () {
		if (this._oToolbar) {
			this._oShowInputButton && this._oShowInputButton.setVisible(this._isInputVisible());

			return;
		}

		this._oToolbarTitle = new Title({
			text: this.getTitle(),
			visible: !!this.getTitle()
		});

		this._oToolbar = new OverflowToolbar(this.getId() + "-toolbar", {
			content: [this._oToolbarTitle, new ToolbarSpacer()]
		}).addStyleClass("sapCalculationBuilderToolbar");

		// "Expression Output" toggle button
		this._oShowInputButton = new OverflowToolbarToggleButton({
			type: ButtonType.Transparent,
			icon: Icons.SHOW_EXPRESSION,
			tooltip: oResourceBundle.getText("CALCULATION_BUILDER_TOGGLE_EXPRESSION_BUTTON"),
			pressed: true,
			press: function () {
				this.$().find(".sapCalculationBuilderInputOuterWrapper").toggle();
				this._bShowInput = !this._bShowInput;
			}.bind(this)
		});

		this._oToolbar.addContent(this._oShowInputButton);

		// "Expand All Variables" button
		this._oToolbar.addContent(this._getExpandAllVariablesButton());

		// Full screen mode button
		this._oToolbar.addContent(new OverflowToolbarToggleButton({
			type: ButtonType.Transparent,
			icon: Icons.FULL_SCREEN,
			tooltip: oResourceBundle.getText("CALCULATION_BUILDER_ENTER_FULL_SCREEN_BUTTON"),
			press: function (oEvent) {
				var oToggleButton = oEvent.getSource();

				this._toggleFullScreen();
				oToggleButton.setTooltip(this._bIsFullScreen ? oResourceBundle.getText("CALCULATION_BUILDER_EXIT_FULL_SCREEN_BUTTON") : oResourceBundle.getText("CALCULATION_BUILDER_ENTER_FULL_SCREEN_BUTTON"));
				oToggleButton.setIcon(this._bIsFullScreen ? Icons.EXIT_FULL_SCREEN : Icons.FULL_SCREEN);
				this.invalidate();
			}.bind(this)
		}));

		// Full screen mode - popup for Calculation builder content
		this._oFullScreenPopup = new Popup({
			modal: true,
			shadow: false,
			autoClose: false
		});

		this.addDependent(this._oToolbar);
	};

	CalculationBuilder.prototype._getExpandAllVariablesButton = function () {
		if (!this._oExpandAllVariablesButton) {
			this._oExpandAllVariablesButton = new OverflowToolbarButton({
				type: ButtonType.Transparent,
				icon: Icons.EXPAND_VARIABLE,
				tooltip: oResourceBundle.getText("CALCULATION_BUILDER_EXPAND_ALL_BUTTON"),
				press: function (oEvent) {
					MessageBox.show(
						oResourceBundle.getText("CALCULATION_BUILDER_EXPAND_ALL_MESSAGE_TEXT"), {
							icon: MessageBox.Icon.WARNING,
							title: oResourceBundle.getText("CALCULATION_BUILDER_EXPAND_ALL_MESSAGE_TITLE"),
							actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
							onClose: function (sAction) {
								if (sAction === MessageBox.Action.YES) {
									this._oExpressionBuilder._expandAllVariables();
								}
							}.bind(this)
						}
					);
				}.bind(this)
			});
		}
		return this._oExpandAllVariablesButton;
	};

	CalculationBuilder.prototype._enableOrDisableExpandAllButton = function () {
		var bIsReadOnly = this.getReadOnly() || this.getLayoutType() === LayoutTypes.VisualTextualReadOnly;

		this._getExpandAllVariablesButton().setEnabled(!bIsReadOnly && this.getItems().some(function (oItem) {
				return oItem._isVariable() && oItem.isExpandable();
			}));
	};

	CalculationBuilder.prototype.setExpression = function (sValue) {
		this.setProperty("expression", sValue);
		this._sExpressionDirectValue = sValue;
	};

	CalculationBuilder.prototype._setExpression = function (sValue) {
		this.setProperty("expression", sValue, true);
	};

	CalculationBuilder.prototype._toggleFullScreen = function () {
		var fnOpen = function () {
			this._oFullScreenContainer = {};
			this._oFullScreenContainer.$content = this.$();

			if (this._oFullScreenContainer.$content) {
				this._oFullScreenContainer.$tempNode = jQuery("<div></div>");
				this._oFullScreenContainer.$content.before(this._oFullScreenContainer.$tempNode);
				this._oFullScreenContainer.$overlay = jQuery("<div id='" + jQuery.sap.uid() + "'></div>");
				this._oFullScreenContainer.$overlay.addClass("sapCalculationBuilderOverlay");
				this._oFullScreenContainer.$overlay.append(this._oFullScreenContainer.$content);
				this._oFullScreenPopup.setContent(this._oFullScreenContainer.$overlay);
			}
			this._oFullScreenPopup.open(0, Popup.Dock.BeginTop, Popup.Dock.BeginTop, jQuery("body"));
		}.bind(this);

		var fnClose = function () {
			this._oFullScreenContainer.$tempNode.replaceWith(this.$());
			this._oFullScreenPopup.close();
			this._oFullScreenContainer.$overlay.remove();
		}.bind(this);

		this._bIsFullScreen ? fnClose() : fnOpen();
		this._bIsFullScreen = !this._bIsFullScreen;
	};

	CalculationBuilder.prototype._isExpressionVisible = function () {
		return this.getLayoutType() !== LayoutTypes.TextualOnly;
	};

	CalculationBuilder.prototype._isInputVisible = function () {
		return this.getLayoutType() !== LayoutTypes.VisualOnly;
	};

	CalculationBuilder.prototype._createFunctionObject = function (oFunction) {
		if (!oFunction) {
			return null;
		}

		return oFunction instanceof CalculationBuilderFunction ? {
			key: oFunction.getKey(),
			title: oFunction._getLabel(),
			description: this._getFunctionDescription({
				key: oFunction.getKey(),
				description: oFunction.getDescription(),
				template: this._convertToTemplate(oFunction.getItems())
			}),
			type: ItemType.CustomFunction,
			functionObject: oFunction
		} : {
			key: oFunction.key,
			title: oFunction.title,
			description: this._getFunctionDescription(oFunction),
			type: ItemType.Function,
			functionObject: oFunction
		};
	};

	CalculationBuilder.prototype._getAllFunctions = function () {
		var aFunctions = [];

		Object.keys(FunctionsMap).forEach(function (sKey) {
			if (FunctionsMap[sKey].allowed) {
				aFunctions.push(this._createFunctionObject(FunctionsMap[sKey]));
			}
		}.bind(this));

		this.getFunctions().forEach(function (oFunction) {
			aFunctions.push(this._createFunctionObject(oFunction));
		}.bind(this));

		return aFunctions.sort(function (o1, o2) {
			return o1.title > o2.title;
		});
	};

	return CalculationBuilder;

}, /* bExport= */ true);
