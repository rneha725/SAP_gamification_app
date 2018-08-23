sap.ui.define([
	"jquery.sap.global",
	"./library",
	"sap/ui/core/Control",
	"sap/m/MessageBox",
	"sap/ui/thirdparty/jqueryui/jquery-ui-core",
	"sap/ui/thirdparty/jqueryui/jquery-ui-widget",
	"sap/ui/thirdparty/jqueryui/jquery-ui-mouse",
	"sap/ui/thirdparty/jqueryui/jquery-ui-draggable"
], function (jQuery, library, Control, MessageBox) {
	"use strict";

	var ItemType = library.CalculationBuilderItemType,
		OperatorType = library.CalculationBuilderOperatorType,
		LogicalOperatorType = library.CalculationBuilderLogicalOperatorType;

	var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.suite.ui.commons");

	/**
	 * Constructor for a new item used in the expression.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Each of the items used as building blocks to create an arithmetic expression in the calculation builder.
	 *
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.56.5
	 * @since 1.56.0
	 *
	 * @constructor
	 * @public
	 * @alias sap.suite.ui.commons.CalculationBuilderItem
	 * @ui5-metamodel This control/element will also be described in the UI5 (legacy) design time metamodel.
	 */
	var CalculationBuilderItem = Control.extend("sap.suite.ui.commons.CalculationBuilderItem", /** @lends sap.suite.ui.commons.CalculationBuilderItem.prototype */ {
		constructor: function (sId, mSettings) {
			if (typeof sId !== "string" && sId !== undefined) {
				mSettings = sId;
			}

			if (mSettings && mSettings.key) {
				mSettings.key = this._sanitizeKey(mSettings.key);
			}

			Control.apply(this, arguments);
		},
		metadata: {
			library: "sap/suite/ui/commons",
			properties: {
				/**
				 * A key associated with the item. This property is mandatory.<br>
				 * The key is displayed in the text editor area of the calculation builder.
				 */
				key: {
					type: "string", group: "Misc", defaultValue: null
				}
			}
		},
		renderer: function (oRm, oItem) {
			oRm.write(oItem._render());
		}
	});

	/* =========================================================== */
	/* Rendering	    										   */
	/* =========================================================== */
	CalculationBuilderItem.prototype._innerRender = function () {
		var sHtml = "";

		var fnRenderFocus = function () {
			sHtml += "<div class=\"sapCalculationBuilderItemFocusWrapper\">";
			sHtml += "<div class=\"sapCalculationBuilderItemFocus\"></div>";
			sHtml += "</div>";
		};

		var fnRenderExpandButton = function () {
			sHtml += "<div class=\"sapCalculationBuilderItemExpandButtonWrapper\">";
			sHtml += "<div id=\"" + this.getId() + "-expandbutton\" class=\"sapCalculationBuilderItemExpandButton " + (this._bReadOnly ? "sapMBtnDisabled" : "") + "\" tabindex=\"-1\">";

			if (!this._bReadOnly) {
				sHtml += "<div class=\"sapCalculationBuilderItemExpandButtonFocus\"></div>";
			}

			fnRenderIcon("");
			sHtml += "</div></div>";
		}.bind(this);

		var fnRenderIcon = function (sIcon) {
			sHtml += "<span aria-hidden=\"true\" data-sap-ui-icon-content=\"" + sIcon + "\" class=\"sapCalculationBuilderEmptyItemIcon sapUiIcon sapUiIconMirrorInRTL\" style=\"font-family:'SAP-icons'\"></span>";
		};

		sHtml += "<div class=\"sapCalculationBuilderItemContentWrapper\">";

		fnRenderFocus();

		sHtml += "<div id=\"" + this.getId() + "-content\" class=\"sapCalculationBuilderItemContent\">";

		if (this._isEmpty()) {
			fnRenderIcon("");
			sHtml += "</div>";
		} else if (this._bIsNew) {
			fnRenderIcon("");
			sHtml += "</div>";
		} else if (this._isFunction()) {
			var oFunction = this._getFunction();

			sHtml += "<span class=\"sapCalculationBuilderItemLabel sapCalculationBuilderItemFunctionLabel\">";
			sHtml += jQuery.sap.encodeHTML(oFunction.title || this.getKey());
			sHtml += "</span>";
			sHtml += "<span class=\"sapCalculationBuilderItemLabel sapCalculationBuilderItemFunctionBracket\">";
			sHtml += "&nbsp;(";
			sHtml += "</span>";
			sHtml += "</div>";
		} else {
			sHtml += "<span class=\"sapCalculationBuilderItemLabel\">";
			sHtml += jQuery.sap.encodeHTML(this._getLabel());
			sHtml += "</span>";
			sHtml += "</div>";
		}

		if (this._isVariable() && this.isExpandable()) {
			fnRenderExpandButton();
		}

		sHtml += "</div>";

		return sHtml;
	};

	CalculationBuilderItem.prototype._getClass = function (bHasError) {
		var sClass = "",
			bIsEmpty = this._isEmpty();

		sClass += this._bIsNew ? "sapCalculationBuilderNewItem  sapCalculationBuilderCancelSelectable" : "sapCalculationBuilderItem";

		if (bIsEmpty) {
			sClass += " sapCalculationBuilderNewItem ";
		}

		if (!this._bIsNew && !bIsEmpty) {
			sClass += " sapCalculationBuilderFullItem ";
		}

		if (this._isBracket()) {
			sClass += " sapCalculationBuilderItemBracket ";
		} else if (this._isOperator()) {
			sClass += " sapCalculationBuilderItemOperator sapCalculationBuilderItemOperatorLength-" + this._getLabel().length + " ";
			if (this._isLogicalOperator()) {
				sClass += " sapCalculationBuilderItemLogicalOperator ";
			}
		} else if (this._isFunction()) {
			sClass += " sapCalculationBuilderItemFunction ";
		} else if (this._isConstant()) {
			sClass += " sapCalculationBuilderItemConstant ";
		} else if (this._isVariable()) {
			sClass += " sapCalculationBuilderItemColumn ";
			if (this.isExpandable()) {
				sClass += " sapCalculationBuilderItemColumnSeparator ";
			}
		} else {
			sClass += " sapCalculationBuilderUnknownItem ";
		}

		if (bHasError) {
			sClass += " sapCalculationBuilderItemErrorSyntax ";
		}

		return sClass;
	};

	CalculationBuilderItem.prototype._render = function () {
		var bIsItemInBuilder = this._hasCorrectParent(),
			oError = this._getItemError(),
			sHtml = "",
			sTitle = oError ? "title=\"" + oError.title + "\"" : "";

		sHtml += "<div " + sTitle + " class=\"" + this._getClass(!!oError) + "\" id=\"" + this.getId() + "\" tabindex=\"" + (bIsItemInBuilder ? "-1" : "0") + "\">";
		sHtml += this._innerRender();
		sHtml += "</div>";

		return sHtml;
	};

	/* =========================================================== */
	/* Init & events	   `									   */
	/* =========================================================== */
	CalculationBuilderItem.prototype.init = function () {
		// Indicates whether the item is NewItem
		this._bIsNew = false;
	};

	CalculationBuilderItem.prototype.onBeforeRendering = function () {
		this._oVariable = this.getVariable();
	};

	CalculationBuilderItem.prototype.onAfterRendering = function () {
		this._afterRendering();
	};

	CalculationBuilderItem.prototype._afterRendering = function () {
		var oParent = this.getParent();

		this._setEvents();

		if (!this._bIsNew && !this._bReadOnly) {
			this._setupDraggable();
		}

		if (this._hasCorrectParent(oParent)) {
			if (!oParent._bIsCalculationBuilderRendering) {
				oParent._setupKeyboard();
				oParent.getParent()._enableOrDisableExpandAllButton();
			}
		}
	};

	CalculationBuilderItem.prototype._setEvents = function () {
		if (this.isExpandable()) {
			this.$("expandbutton").click(this._expandButtonPress.bind(this));

			// Show correct focus after click on Expand Button
			this.$("expandbutton").mousedown(function (oEvent) {
				oEvent.stopPropagation();
			});
		}

		if (!this._bReadOnly) {
			this.$("content").click(this._buttonPress.bind(this));
		}

		if (this._isBracket() || this._isFunction()) {
			this._setBracketHover();
		}
	};

	CalculationBuilderItem.prototype._buttonPress = function (oEvent) {
		var oParent = this.getParent();

		if (this._hasCorrectParent(oParent) && !oParent._bDragging) {
			if (oEvent.ctrlKey) {
				oParent._selectItem(this.$());
			} else if (oEvent.shiftKey) {
				oParent._selectItemsTo(this.$());
			} else {
				oParent._deselect();
				oParent._openDialog({
					opener: this,
					currentItem: this
				});
			}
		}
	};

	CalculationBuilderItem.prototype._expandButtonPress = function (oEvent) {
		if (!this._bReadOnly) {
			this._openExpandConfirmMessageBox();
		}
	};

	/* =========================================================== */
	/* Public API 						   						   */
	/* =========================================================== */
	/**
	 * Checks if the item is expandable.
	 * @public
	 * @returns {true} True if the item is expandable.
	 */
	CalculationBuilderItem.prototype.isExpandable = function () {
		var oVariable = this._oVariable ? this._oVariable : this.getVariable();
		return oVariable && oVariable.getItems().length > 0;
	};

	/**
	 * Checks if there is a variable object related to this item.
	 * @public
	 * @returns {variable} Variable object paired with this item, if there is any.
	 */
	CalculationBuilderItem.prototype.getVariable = function () {
		var oParent = this.getParent();
		return this._hasCorrectParent(oParent) && oParent._getVariableByKey(this.getKey());
	};

	/**
	 * Returns the type of the item.<br>
	 * Available item types are defined in {@link sap.suite.ui.commons.CalculationBuilderItemType}.
	 * @public
	 * @returns {String} Type of the item
	 */
	CalculationBuilderItem.prototype.getType = function () {
		return this._getType();
	};


	/* =========================================================== */
	/* Setters & getters, helper methods 						   */
	/* =========================================================== */
	CalculationBuilderItem.prototype._setupDraggable = function () {
		var oParent = this.getParent();

		if (this._hasCorrectParent(oParent)) {
			this.$().draggable({
				revert: "invalid",
				axis: "x",
				delay: 100,
				scope: oParent.getId() + "-scope",
				// handle: ".sapCalculationBuilderDraggable",
				start: function () {
					// Remove bracket highlights when dragging
					oParent.$().find(".sapCalculationBuilderBracket").removeClass("sapCalculationBuilderBracket");
					jQuery(this).addClass("sapCalculationBuilderDragging");
					oParent._bDragging = true;

					// Deselect other items if the moved item isn't selected
					if (!jQuery(this).hasClass("ui-selected")) {
						oParent._deselect();
					}
				},
				stop: function () {
					jQuery(this).removeClass("sapCalculationBuilderDragging");
					oParent._bDragging = false;
				}
			});
		}
	};

	CalculationBuilderItem.prototype._setBracketHover = function () {
		var $content = this.$("content"),
			sBracket = this._isFunction() ? OperatorType["("] : this.getKey(),
			bIsEndingBracket = sBracket === OperatorType[")"],
			sTargetBracket = bIsEndingBracket ? OperatorType["("] : OperatorType[")"],
			oTargetItem;

		$content.mouseenter(function (oEvent) {
			var oItem, bFoundItem, iBracketCount = 0,
				aItems = (this._hasCorrectParent() && this.getParent().getItems()) || [],
				i = bIsEndingBracket ? aItems.length : 0;

			for (; bIsEndingBracket ? i >= 0 : i < aItems.length; (bIsEndingBracket ? i-- : i++)) {
				oItem = aItems[i];

				// Find starting bracket
				if (oItem === this) {
					bFoundItem = true;
				}

				// Find ending bracket
				if (bFoundItem) {
					if ((oItem.getKey() === sTargetBracket) || (oItem._isFunction() && bIsEndingBracket)) {
						iBracketCount--;
						if (iBracketCount === 0) {
							oTargetItem = oItem;
							break;
						}
					} else if ((oItem.getKey() === sBracket) || (oItem._isFunction() && !bIsEndingBracket)) {
						iBracketCount++;
					}
				}
			}
			if (oTargetItem) {
				this.$().addClass("sapCalculationBuilderBracket");
				oTargetItem.$().addClass("sapCalculationBuilderBracket");
			}
		}.bind(this));

		$content.mouseleave(function (oEvent) {
			this.$().removeClass("sapCalculationBuilderBracket");
			if (oTargetItem) {
				oTargetItem.$().removeClass("sapCalculationBuilderBracket");
			}
		}.bind(this));
	};

	CalculationBuilderItem.prototype._expandVariable = function (bFireChange) {
		var oParent = this.getParent(),
			iThisIndex, oVariable;

		if (oParent) {
			iThisIndex = oParent.getItems().indexOf(this);
			oVariable = oParent._getVariableByKey(this.getKey());

			oParent.insertItem(new CalculationBuilderItem({
				"key": "("
			}), iThisIndex++);
			oVariable.getItems().forEach(function (oItem) {
				oParent.insertItem(oItem._cloneItem(), iThisIndex++);
			});
			oParent.insertItem(new CalculationBuilderItem({
				"key": ")"
			}), iThisIndex++);
			oParent.removeItem(this);

			if (bFireChange) {
				oParent._aErrors = oParent._validateSyntax();
				oParent._fireChange();
			}
		}
	};

	CalculationBuilderItem.prototype._cloneItem = function () {
		return new CalculationBuilderItem({
			key: this.getKey()
		});
	};

	CalculationBuilderItem.prototype._openExpandConfirmMessageBox = function () {
		MessageBox.show(
			oResourceBundle.getText("CALCULATION_BUILDER_EXPAND_MESSAGE_TEXT", this._getLabel()), {
				icon: MessageBox.Icon.WARNING,
				title: oResourceBundle.getText("CALCULATION_BUILDER_EXPAND_MESSAGE_TITLE"),
				actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
				onClose: function (sAction) {
					var oParent;

					if (sAction === MessageBox.Action.YES) {
						this._expandVariable(true);
					} else {
						oParent = this.getParent();
						if (oParent) {
							// After close MassageBox set focus back to Expand Button
							oParent._setCorrectFocus();
						}
					}
				}.bind(this)
			}
		);
	};

	CalculationBuilderItem.prototype._getItemError = function () {
		var oParent = this.getParent(), oError;
		if (this._hasCorrectParent(oParent)) {
			oError = jQuery.grep(oParent._aErrors, function (oItem) {
				return oItem.index === this._iIndex;
			}.bind(this))[0];
		}

		return oError;
	};

	CalculationBuilderItem.prototype._getLabel = function () {
		var fnGetLabel = function (oItem) {
			if (this._isMultiplication()) {
				return "X";
			}

			// either custom function or variable
			var oItem = this._getVariable() || this._getFunction();
			if (!oItem) {
				return this.getKey();
			}

			return oItem.title ? oItem.title : oItem._getLabel();
		}.bind(this);

		if (!this._sLabel) {
			this._sLabel = fnGetLabel();

			if (this._isFunction()) {
				this._sLabel += " (";
			}
		}

		return this._sLabel;
	};

	CalculationBuilderItem.prototype._sanitizeKey = function (sKey) {
		if (!sKey || typeof sKey !== "string") {
			return sKey;
		}

		// manage '{' and '}'
		sKey = sKey.replace(/{/g, "&#125;");
		sKey = sKey.replace(/}/g, "&#123;");

		return sKey;
	};


	CalculationBuilderItem.prototype.setKey = function (sKey, bSuppressInvalidation) {
		this._sType = "";
		this._sLabel = "";
		this._oVariable = "";

		this.setProperty("key", this._sanitizeKey(sKey), bSuppressInvalidation);
	};

	CalculationBuilderItem.prototype.getKey = function () {
		var sKey = this.getProperty("key");

		sKey = sKey.replace(/&#125;/g, "{");
		sKey = sKey.replace(/&#123;/g, "}");


		return sKey;
	};


	CalculationBuilderItem.prototype._getType = function () {
		var oParent = this.getParent();
		if (!this._sType && oParent) {
			this._sType = oParent._getType(this.getKey());
		}

		return this._sType;
	};

	CalculationBuilderItem.prototype._isEmpty = function () {
		return !this._bIsNew && !this.getKey();
	};

	CalculationBuilderItem.prototype._isOperator = function () {
		return this._getType() === ItemType.Operator;
	};

	CalculationBuilderItem.prototype._isVariable = function () {
		return this._getType() === ItemType.Variable;
	};

	CalculationBuilderItem.prototype._isConstant = function () {
		return this._getType() === ItemType.Constant;
	};

	CalculationBuilderItem.prototype._isFunction = function () {
		var sType = this._getType();
		return sType === ItemType.Function || sType === ItemType.CustomFunction;
	};

	CalculationBuilderItem.prototype._getFunction = function () {
		var sType = this._getType();
		if (sType === ItemType.Function || sType === ItemType.CustomFunction) {
			var oBuilder = this.getParent().getParent();
			return oBuilder._createFunctionObject(oBuilder._getFunctionDefinition(this.getKey()));
		}

		return null;
	};

	CalculationBuilderItem.prototype._getVariable = function () {
		if (this._getType() === ItemType.Variable) {
			var sKey = this.getKey();

			return jQuery.grep(this.getParent().getVariables(), function (oItem) {
				return oItem.getKey().toLowerCase() === sKey.toLowerCase();
			})[0];
		}

		return null;
	};

	CalculationBuilderItem.prototype._getCustomFunction = function () {
		var bIsFunction = this._isFunction(),
			that = this,
			oParent = this.getParent();

		if (oParent && bIsFunction) {
			return jQuery.grep(oParent.getFunctions(), function (oFunction) {
				return oFunction.getKey().toLowerCase() === that.getKey().toLowerCase();
			})[0];
		}

		return null;
	};

	CalculationBuilderItem.prototype._isBracket = function () {
		return this._isOperator() && (this.getKey() === "(" || this.getKey() === ")");
	};

	CalculationBuilderItem.prototype._isAddition = function () {
		return this._isOperator() && this.getKey() === "+";
	};

	CalculationBuilderItem.prototype._isSubtraction = function () {
		return this._isOperator() && this.getKey() === "-";
	};

	CalculationBuilderItem.prototype._isDivision = function () {
		return this._isOperator() && this.getKey() === "/";
	};

	CalculationBuilderItem.prototype._isMultiplication = function () {
		return this._isOperator() && this.getKey() === "*";
	};

	CalculationBuilderItem.prototype._isComma = function () {
		return this._isOperator() && this.getKey() === ",";
	};

	CalculationBuilderItem.prototype._isLogicalOperator = function () {
		return this._isOperator() && !!LogicalOperatorType[this.getKey()];
	};

	CalculationBuilderItem.prototype._hasCorrectParent = function (oParent) {
		oParent = oParent || this.getParent();
		return oParent instanceof sap.suite.ui.commons.CalculationBuilderExpression;
	};

	return CalculationBuilderItem;

}, /* bExport= */ true);

