sap.ui.define([
	"jquery.sap.global",
	"./library",
	"sap/ui/core/Control",
	"./CalculationBuilderItem",
	"sap/m/List",
	"sap/m/ListMode",
	"sap/m/StandardListItem",
	"sap/m/ResponsivePopover",
	"sap/m/PlacementType",
	"sap/m/Button",
	"sap/m/ButtonType",
	"sap/m/Menu",
	"sap/m/MenuButton",
	"sap/m/MenuItem",
	"sap/m/OverflowToolbar",
	"sap/m/ToolbarSeparator",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"sap/ui/core/CustomData",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel"
], function (jQuery, library, Control, CalculationBuilderItem, List, ListMode, StandardListItem, ResponsivePopover,
			 PlacementType, Button, ButtonType, Menu, MenuButton, MenuItem, OverflowToolbar, ToolbarSeparator,
			 ToolbarSpacer, Title, CustomData, Sorter, JSONModel) {
	"use strict";

	var EMPTY_STRING = "&nbsp;&nbsp;";
	var EMPTY_HASH = "┘┘";

	var ItemType = library.CalculationBuilderItemType;

	var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.suite.ui.commons");

	var fnIsCharacterKeyPress = function (e) {
		if (typeof e.which === "undefined") {
			// This is IE, which only fires keypress events for printable keys
			return true;
		} else if (typeof e.which === "number" && e.which > 0) {
			// In other browsers except old versions of WebKit, evt.which is
			// only greater than zero if the keypress is a printable key.
			// We need to filter out backspace and ctrl/alt/meta key combinations
			return !e.ctrlKey && !e.metaKey && !e.altKey && e.which !== 8;
		}
		return false;
	};

	/**
	 * Goes through each child of given element and returns all found text values
	 *
	 * @param {Object} oElem DOM element of jQuery object
	 * @return {string} final string
	 */
	var fnGetNodesText = function (oElem, bReplace) {
		var oNode, sRet = "", i = 0,
			sNodeType = oElem.nodeType;

		if (oElem instanceof jQuery) {
			oElem = oElem[0];
		}

		if (!sNodeType) {
			// If no nodeType, this is expected to be an array
			while ((oNode = oElem[i++])) {
				// Do not traverse comment nodes
				sRet += fnGetNodesText(oNode, bReplace);
			}
		} else if (sNodeType === 1 || sNodeType === 9 || sNodeType === 11) {
			for (oElem = oElem.firstChild; oElem; oElem = oElem.nextSibling) {
				sRet += fnGetNodesText(oElem, bReplace);
			}
		} else if (sNodeType === 3 || sNodeType === 4) {
			sRet += bReplace && jQuery(oElem).parent().hasClass("sapCalculationBuilderItemTextEmpty") && oElem.nodeValue === "  " ?
				"┘┘" : oElem.nodeValue;
		}

		return sRet;
	};

	var CalculationBuilderInput = Control.extend("sap.suite.ui.commons.CalculationBuilderInput", {
		metadata: {
			library: "sap.suite.ui.commons",
			events: {
				change: {
					parameters: {
						value: "String",
						position: "integer",
						validate: "boolean"
					}
				}
			}
		},
		renderer: function (oRm, oInput) {
			var sEditable = oInput._bReadOnly ? "" : "contenteditable=\"true\"";
			if (oInput.getParent().getShowInputToolbar() && !oInput._bReadOnly) {
				oRm.write("<div class=\"sapCalculationBuilderInputToolbarWrapper\">");
				oRm.renderControl(oInput._oInputToolbar);
				oRm.write("</div>");
			}

			oRm.write("<div");
			oRm.writeControlData(oInput);
			oRm.addClass("sapCalculationBuilderInputWrapper");
			oRm.writeClasses(oInput);
			oRm.write(">");

			oRm.write("<div spellcheck=\"false\"" + sEditable + " id=\"" + oInput.getId() + "-input\" class=\"sapCalculationBuilderInput\">");
			oRm.write("</div>");

			oRm.write("</div>");
		}
	});

	CalculationBuilderInput.prototype.init = function () {
		this._setupSuggestionList();

		this._sSuggestionText = "";
		this._aVariables = [];
		this._oInputToolbar = new OverflowToolbar(this.getId() + "-toolbar").addStyleClass("sapCalculationBuilderInputToolbar");
	};

	CalculationBuilderInput.prototype.onAfterRendering = function () {
		this._setupKeyPress();
		this._setupEvents();
	};

	CalculationBuilderInput.prototype.onBeforeRendering = function () {
		this._aFunctions = this.getParent()._getAllFunctions();
		this._fillInputToolbar();
	};

	CalculationBuilderInput.prototype.getFocusDomRef = function () {
		return this.getDomRef("input");
	};

	CalculationBuilderInput.prototype._setupEvents = function () {
		this.$("input").blur(function () {
			this._lastRangeSelection = this._getSelectionRange();
			this._lastRangeSelection.length = 0;
		}.bind(this));
	};

	CalculationBuilderInput.prototype._setupKeyPress = function () {
		var that = this;
		this.$("input").on('focus', function () {
			var $this = jQuery(this);
			$this.data('before', fnGetNodesText($this[0]));
		}).on('paste keyup', function (e) {
			var $this = jQuery(this),
				sLast = $this.data('before'),
				sChar = e.key,
				sCurrent = fnGetNodesText($this[0]);

			if (that._oPopup.isOpen() && sChar === "Enter") {
				return;
			}

			if (sLast !== sCurrent) {
				var iPosition = that._getCaretPosition();
				that._storeCurrent();

				that.fireChange({
					position: Math.max(0, iPosition)
				});

				that._checkSuggestions(iPosition, sCurrent, fnIsCharacterKeyPress(e));
				if (that._sSuggestionText.length > 0) {
					that._filterSuggestionList(that._sSuggestionText);

					if (that._oSuggestionList.getItems().length === 0) {
						that._oPopup.close();
					} else {
						that._findCurrentSpan();
						if (!that._oPopup.isOpen()) {
							var bIsRtl = sap.ui.getCore().getConfiguration().getRTL(),
								$span = jQuery(that._oCurrentSpan),
								iLeft = bIsRtl ? -($this.width() - $span.position().left - $span.width()) : $span.position().left;

							var iLeftPos = parseInt(iLeft, 10),
								iTopPos = that.$("input").outerHeight() - (parseInt(jQuery(that._oCurrentSpan).position().top, 10)
									+ jQuery(that._oCurrentSpan).height()) - 10/*OFFSET*/;

							that._iSuggestionSelectedIndex = -1;

							that._oPopup.setOffsetX(iLeftPos);
							that._oPopup.setOffsetY(-iTopPos);
							that._oPopup.openBy(that.getDomRef("input"));
						}
					}
				}
			}
		});
	};

	CalculationBuilderInput.prototype._createItemSpan = function (sKey, oError) {
		var fnGetItemClass = function () {
			if (!sKey) {
				return "sapCalculationBuilderItemTextEmpty";
			}

			if (oError) {
				return "sapCalculationBuilderItemTextError";
			}

			if (this._isOperator(sKey)) {
				return "sapCalculationBuilderItemTextOperator";
			}

			return "sapCalculationBuilderItemTextDefault";
		}.bind(this);

		var sFnName = sKey ? "text" : "html";

		var oNewItemSpan = jQuery('<span />', {
			title: oError ? oError.title : "",
			"class": fnGetItemClass()
		})[sFnName](sKey || EMPTY_STRING);

		return oNewItemSpan;
	};

	CalculationBuilderInput.prototype._findCurrentSpan = function () {
		var oSelectedObj;

		if (window.getSelection && window.getSelection().getRangeAt) {
			oSelectedObj = window.getSelection();
			this._oCurrentSpan = oSelectedObj.anchorNode.parentNode;
		}

		return this._oCurrentSpan;
	};

	/* =========================================================== */
	/* Auto-complete suggestion methods							   */
	/* =========================================================== */
	CalculationBuilderInput.prototype._setupSuggestionList = function () {
		var oSorter = new Sorter({
			path: "grouptitle",
			descending: false,
			group: function (oContext) {
				return oContext.getProperty("grouptitle");
			}
		});

		var fnAddItem = function (sKey) {
			var oNewItemSpan = this._createItemSpan(sKey);
			jQuery(this._oCurrentSpan).after(oNewItemSpan);
			return oNewItemSpan;
		}.bind(this);

		var fnCreateHighlightedText = function ($label) {
			var sTest = $label.innerText,
				sValue = this._sSuggestionText.toLowerCase(),
				nCount = sValue.length,
				sLowerText = sTest.toLowerCase(),
				sNewText = "",
				index = sLowerText.indexOf(sValue),
				sSubString;

			if (index > -1) {
				sNewText += sTest.substring(0, index);
				sSubString = sTest.substring(index, index + nCount);
				sNewText += "<span class=\"sapMInputHighlight\">" + sSubString + "</span>";
				sNewText += sTest.substring(index + nCount);
			} else {
				sNewText = sTest;
			}

			return sNewText;
		}.bind(this);

		this._oSuggestionList = new List({
			mode: ListMode.SingleSelectMaster,
			showNoData: false,
			enableBusyIndicator: false,
			rememberSelections: false,
			items: {
				path: "/data",
				factory: function (sId, oContext) {
					var oData = oContext.getProperty(oContext.oModel.sPath),
						oItemTemplate = new StandardListItem({
							title: oData.title,
							customData: [new CustomData({
								key: "key",
								value: oData.key
							})]
						});

					oItemTemplate.addStyleClass("sapCalculationBuilderSuggestionItem");

					return oItemTemplate;
				},
				sorter: oSorter
			},
			selectionChange: function (oEvent) {
				var oItem = oEvent.getParameter("listItem"),
					iItemsCount,
					oCaretSpan, oFunction, sKey, aItems;

				if (oItem) {
					sKey = oItem.getCustomData()[0].getValue();
					oFunction = this._getFunction(sKey);

					jQuery(this._oCurrentSpan).text(oFunction ? sKey + "(" : sKey + "");
					jQuery(this._oCurrentSpan).removeClass("sapCalculationBuilderItemTextError").addClass("sapCalculationBuilderItemTextDefault");

					// append additional spans based on the function definition
					if (oFunction) {
						aItems = this._getFunctionTemplateItems(oFunction);
						iItemsCount = aItems.length;

						if (iItemsCount > 0) {
							aItems.forEach(function (sKey, i) {
								this._oCurrentSpan = fnAddItem(sKey)[0];
								// set caret to first empty item
								if (!sKey && !oCaretSpan) {
									oCaretSpan = this._oCurrentSpan;
								}
								// don't add space to last non empty character
								if (sKey && i !== iItemsCount - 1) {
									this._oCurrentSpan = fnAddItem(" ");
								}
							}.bind(this));
						} else {
							oCaretSpan = this._oCurrentSpan = fnAddItem("")[0];
						}

						var oLastItem = fnAddItem(")");
						if (!oCaretSpan) {
							this._oCurrentSpan = oLastItem[0];
						}
					}

					this._storeCurrent();
					var oTargetSpan = oCaretSpan || this._oCurrentSpan;
					this.fireChange({
						position: this._getCaretPosition(oTargetSpan, oFunction ? 1 : oTargetSpan.textContent.length)
					});
				}

				this._oPopup.close();
			}.bind(this)
		});

		this._oSuggestionList.addEventDelegate({
			onAfterRendering: function () {
				this._oSuggestionList.$().find(".sapMDLILabel, .sapMSLITitleOnly, .sapMDLIValue").each(function () {
					this.innerHTML = fnCreateHighlightedText(this);
				});
			}.bind(this)
		});

		this._oPopup = new ResponsivePopover(this.getId() + "-popup", {
			contentWidth: "300px",
			showArrow: false,
			showHeader: false,
			placement: PlacementType.Vertical,
			horizontalScrolling: true,
			content: this._oSuggestionList
		}).attachAfterClose(function (oEvent) {
			this._clearSuggestion();
		}.bind(this));
	};

	CalculationBuilderInput.prototype._checkSuggestions = function (iPosition, sText, bIsPrintable) {
		var sChar = sText[Math.max(iPosition - 1, 0)];

		var fnIsDelimiter = function (sChar) {
			return this._isOperator(sChar) || this._isEmptySpace(sChar);
		}.bind(this);

		if (!sChar || fnIsDelimiter(sChar)) {
			this._clearSuggestion();
			return;
		}

		var sWord = bIsPrintable ? sChar : "",
			iOffset = bIsPrintable ? 2 : 1;

		iPosition = Math.max(iPosition, 0);
		for (var i = iPosition - iOffset; i >= 0; i--) {
			if (fnIsDelimiter(sText[i])) {
				break;
			}
			sWord = sText[i] + sWord;
		}

		for (i = iPosition; i < sText.length; i++) {
			if (fnIsDelimiter(sText[i])) {
				break;
			}
			sWord = sWord + sText[i];
		}

		if (!sWord) {
			this._clearSuggestion();
		}

		this._sSuggestionText = sWord || "";
	};

	CalculationBuilderInput.prototype._clearSuggestion = function () {
		// current suggestion text
		this._sSuggestionText = "";

		// span element with current caret position
		this._oCurrentSpan = {};

		this._oPopup.close();
	};

	CalculationBuilderInput.prototype._filterSuggestionList = function (sText) {
		var aData = [];
		var fnAddItems = function (sKey, sLabel, sType, groupTitle) {
			if (sKey.toLowerCase().indexOf(sText.toLowerCase()) !== -1) {
				aData.push({
					title: sLabel || sKey,
					key: sKey,
					type: sType,
					grouptitle: groupTitle
				});
			}
		};

		this._aVariables.forEach(function (oVariable) {
			fnAddItems(oVariable.getKey(), oVariable.getLabel(), ItemType.Variable, "Variable");
		});

		this._aFunctions.forEach(function (oItem) {
			fnAddItems(oItem.key, oItem.title, ItemType.Function, "Function");
		});

		aData.sort(function (o1, o2) {
			return o1.title.toUpperCase() < o2.title.toUpperCase() ? -1 : 1;
		});

		this._oSuggestionList.setModel(new JSONModel({
			"data": aData
		}));
	};

	/* =========================================================== */
	/* Caret functions											   */
	/* =========================================================== */
	CalculationBuilderInput.prototype._getCaretPosition = function (oItem, iStart) {
		var oRange, oSelectedObj, aChildNodes,
			iAncestorCount = 0;
		var fnCheckCurrent = function (oNode) {
			return (oItem && oNode === oItem) ||
				(!oItem && (oNode === oSelectedObj.anchorNode || oNode === oSelectedObj.anchorNode.parentNode));
		};

		var fnProcessNode = function (oNode) {
			var oChild;
			if (fnCheckCurrent(oNode)) {
				return false;
			}
			// we check whether the node is text node itself or it is another span
			// when pasting input span can contains another spans
			// <span>text<span>another text</span></span>
			if (oNode.nodeType === 3/*text node*/) {
				iAncestorCount += oNode.textContent.length;
			} else {
				for (var i = 0; i < oNode.childNodes.length; i++) {
					oChild = oNode.childNodes[i];
					if (fnCheckCurrent(oChild)) {
						return false;
					}

					iAncestorCount += oChild.textContent.length;
				}
			}

			return true;
		};

		if (window.getSelection && window.getSelection().getRangeAt) {
			oRange = window.getSelection().getRangeAt(0);
			oSelectedObj = window.getSelection();
			aChildNodes = this.$("input")[0].childNodes;
			// iterate through all child nodes (NOT CHILDREN)
			// if it is text itself add it if it is span (or more nested spans) iterate through them too
			// till we find selected object - may be span or text
			for (var i = 0; i < aChildNodes.length; i++) {
				if (!fnProcessNode(aChildNodes[i])) {
					break;
				}
			}
			return (iStart || oRange.startOffset) + iAncestorCount;
		}

		return 0;
	};

	CalculationBuilderInput.prototype._getSelectionRange = function () {
		var iStart,
			iEnd = 0,
			oStartElement,
			element = this.$("input")[0];

		if (typeof window.getSelection !== "undefined") {
			try {
				var oRange = window.getSelection().getRangeAt(0),
					oPreCaretRange = oRange.cloneRange();

				if (!jQuery.sap.containsOrEquals(element, oRange.startContainer)) {
					return this._lastRangeSelection;
				}

				oPreCaretRange.selectNodeContents(element);
				oPreCaretRange.setEnd(oRange.startContainer, oRange.startOffset);
				iStart = oPreCaretRange.toString().length;
				iEnd = iStart + oRange.toString().length;
				oStartElement = oRange.startContainer;
			} catch (e) {
				iStart = this.$("input").text().length;
			}
		}
		return {
			start: iStart,
			startElement: oStartElement || {},
			length: iEnd - iStart
		};
	};

	CalculationBuilderInput.prototype._setCaretPosition = function (oPosition) {
		var oSelection = window.getSelection(),
			oItem = oPosition.span,
			oContent, oRange, oFirstChild, iPosition;

		if (oPosition) {
			// find span we are setting caret to
			oContent = this.getDomRef("input");
			if (!oItem) {
				oItem = oContent && oContent.children && oContent.children.length > oPosition.spanIndex ?
					oContent.childNodes[oPosition.spanIndex] : null;
			}

			if (oItem) {
				oRange = document.createRange();
				// check if item is text itself or text's node
				oFirstChild = oItem.firstChild ? oItem.firstChild : oItem;
				iPosition = Math.min(oFirstChild.length, oPosition.position);

				oRange.setStart(oFirstChild, iPosition);
				oRange.collapse(true);
				oSelection.removeAllRanges();
				oSelection.addRange(oRange);
			}
		}
	};

	/* =========================================================== */
	/* Parsing functions										   */
	/* =========================================================== */
	CalculationBuilderInput.prototype._recreateText = function (mParameters) {
		var fnProcessItem = function (sProcessingText) {
			var oError;
			if (sProcessingText) {
				if (!this._isEmptySpace(sProcessingText)) {
					oError = jQuery.grep(mParameters.errors, function (oItem) {
						return oItem.index === iItemIndex;
					})[0];
				}

				// if there is "empty" item (represented by "┘┘") add empty span
				if (sProcessingText === "┘") {
					sProcessingText = "";
				}

				sHtml += this._createItemSpan(sProcessingText, oError)[0].outerHTML;

				if (!this._isEmptySpace(sProcessingText)) {
					iItemIndex++;
				}
				iSpanIndex++;
			}
		}.bind(this);

		var fnProcessFunction = function () {
			for (; i < sText.length; i++) {
				fnCaretSetPosition();
				if (!this._isEmptySpace(sText[i]) && sText[i] !== "(") {
					i--;
					break;
				}

				sWord += sText[i];
				if (sText[i] === "(") {
					break;
				}
			}

			fnProcessItem(sWord);
			sWord = "";
		}.bind(this);

		var fnCaretSetPosition = function (iPos) {
			if (!oPosition && mParameters.position === i) {
				oPosition = {
					spanIndex: iSpanIndex - (iPos || 0),
					position: iPos || sWord.length
				};
			}
		};

		var sHtml = "", sText,
			// index of every "item" (represented by one item in items aggregation). used for error calculations
			iItemIndex = 0,
			iSpanIndex = 0, oPosition = null, sWord = "", sChar;

		sText = mParameters.text || fnGetNodesText(this.$("input")[0], true);

		for (var i = 0; i < sText.length; i++) {
			sChar = sText[i];

			fnCaretSetPosition();

			if (sChar === "┘" || this._isEmptySpace(sChar) || this._isOperator(sChar)) {
				if (this._isFunction(sWord)) {
					fnProcessFunction();
				} else {
					fnProcessItem(sWord);
					fnProcessItem(sChar);
					sWord = "";
				}

				if (sChar === "┘") {
					i++;
					// if caret is to be set in "empty" item (represented by '┘┘')
					// we want to set it in the middle
					fnCaretSetPosition(1);
				}
			} else {
				sWord += sChar;
			}
		}

		fnProcessItem(sWord);
		this.$("input").html(sHtml);

		if (mParameters.position > 0) {
			this._setCaretPosition(oPosition || {
					spanIndex: iSpanIndex - 1,
					position: Number.MAX_SAFE_INTEGER
				});
		}
	};

	CalculationBuilderInput.prototype._stringToItems = function (sExpression) {
		var aItems = [], sChar = "", sItem = "", iChar = 0;

		var fnProcessItem = function () {
			var oFunction,
				sType = "";

			if (sItem) {

				// function handling - find first '(' and scroll to this char
				oFunction = this._getFunction(sItem);
				if (oFunction) {
					if (sExpression[iChar] !== "(") {
						sType = ItemType.Error;
						for (; iChar < sExpression.length; iChar++) {
							if (sExpression[iChar] === "(") {
								sType = "";
								break;
							}

							if (!this._isEmptySpace(sExpression[iChar])) {
								iChar--;
								break;
							}
						}
					}
				}

				var oItem = new CalculationBuilderItem({
					key: sItem
				});
				oItem._sType = sType;
				aItems.push(oItem);
			}

			sItem = "";
			return !!oFunction || !!sType;
		}.bind(this);

		if (!sExpression) {
			sExpression = fnGetNodesText(this.$("input")[0], true);
		}

		for (; iChar < sExpression.length; iChar++) {
			sChar = sExpression[iChar];

			if (sChar === "┘") {
				aItems.push(new CalculationBuilderItem());
				iChar++;
				continue;
			}

			if (this._isEmptySpace(sChar)) {
				if (sItem) {
					fnProcessItem();
				}
				continue;
			}

			// check for two char operator
			var sNext = sExpression[iChar + 1];
			if (sNext && this._isOperator(sChar + sNext, false)) {
				sChar += sNext;
				iChar++;
			}

			var bIsOperator = this._isOperator(sChar, false);
			if (bIsOperator) {
				// If we process function, don't add current operator
				if (fnProcessItem()) {
					continue;
				}

				aItems.push(new CalculationBuilderItem({
					key: sChar
				}));
			} else {
				sItem += sChar;
			}
		}
		fnProcessItem();
		return aItems;
	};

	CalculationBuilderInput.prototype._itemsToString = function (mParameters) {
		var aItems = mParameters.items,
			sPlainText = "", sText = "",
			bIsFunction, oError, sValue;

		var fnGetItemValue = function (oItem) {
			var sItem = "";
			if (oItem) {
				sItem = oItem.getKey();
				// bIsFunction = oItem._isFunction();
				bIsFunction = this._isFunction(sItem);

				if (bIsFunction) {
					sItem += "(";
				}
			}

			return sItem;
		}.bind(this);

		for (var i = 0; i < aItems.length; i++) {
			oError = jQuery.grep(mParameters.errors, function (oItem) { // eslint-disable-line
				return oItem.index === i;
			})[0];

			sValue = fnGetItemValue(aItems[i]);

			sText += this._createItemSpan(sValue, oError)[0].outerHTML;
			if (!bIsFunction && sValue !== "(" && fnGetItemValue(aItems[i + 1]) !== ")") {
				sText += this._createItemSpan(" ")[0].outerHTML;
			}

			sPlainText += sValue;
		}

		this.$("input").html(sText);

		return sPlainText;
	};

	/* =========================================================== */
	/* Suggestion keyboard handling								   */
	/* =========================================================== */
	CalculationBuilderInput.prototype.onsapfocusleave = function (oEvent) {
		if (oEvent.relatedControlId && jQuery.sap.containsOrEquals(this._oPopup.getDomRef(), sap.ui.getCore().byId(oEvent.relatedControlId).getFocusDomRef())) {
			this.focus();
		}
	};

	CalculationBuilderInput.prototype.onsappageup = function (oEvent) {
		this._suggestionListKeyHandling({
			event: oEvent,
			add: true,
			toEnd: true
		});
	};

	CalculationBuilderInput.prototype.onsappagedown = function (oEvent) {
		this._suggestionListKeyHandling({
			event: oEvent,
			add: false,
			toEnd: true
		});
	};

	CalculationBuilderInput.prototype.onsapdown = function (oEvent) {
		this._suggestionListKeyHandling({
			event: oEvent,
			add: true
		});
	};

	CalculationBuilderInput.prototype.onsapescape = function (oEvent) {
		if (this._oPopup.isOpen()) {
			this._oPopup.close();
		}
	};

	CalculationBuilderInput.prototype.onsapup = function (oEvent) {
		this._suggestionListKeyHandling({
			event: oEvent,
			add: false
		});
	};

	CalculationBuilderInput.prototype.onsapenter = function (oEvent) {
		if (this._oPopup.isOpen()) {
			this._oSuggestionList.fireSelectionChange({
				listItem: this._oSuggestionList.getSelectedItem()
			});
		}
		oEvent.preventDefault();
		oEvent.stopPropagation();
	};

	CalculationBuilderInput.prototype._suggestionListKeyHandling = function (mParameters) {
		var oEvent = mParameters.event,
			bAdd = mParameters.add,
			bToEnd = mParameters.toEnd,
			aItems, iMaxIndex;

		if (!this._oPopup.isOpen() || !oEvent) {
			return;
		}

		bAdd ? this._iSuggestionSelectedIndex++ : this._iSuggestionSelectedIndex--;
		aItems = this._oSuggestionList.$().find(".sapCalculationBuilderSuggestionItem");
		iMaxIndex = aItems.length;

		if ((this._iSuggestionSelectedIndex < 0) || (!bAdd && bToEnd)) {
			this._iSuggestionSelectedIndex = iMaxIndex - 1;
		} else if ((this._iSuggestionSelectedIndex >= iMaxIndex) || (bAdd && bToEnd)) {
			this._iSuggestionSelectedIndex = 0;
		}

		this._oSuggestionList.removeSelections(true);

		sap.ui.getCore().byId(aItems[this._iSuggestionSelectedIndex].id).setSelected(true).focus();

		oEvent.preventDefault();
		oEvent.stopPropagation();
	};

	CalculationBuilderInput.prototype._displayError = function (bShow) {
		this.$("input")[bShow ? "addClass" : "removeClass"]("sapCalculationBuilderInputError");
	};

	/* =========================================================== */
	/* Toolbar 													   */
	/* =========================================================== */
	CalculationBuilderInput.prototype._insertItemFromToolbar = function (sKey) {
		var $input = this.$("input"),
			sText, sNewText, oRange;

		var sNewExpression = " " + sKey + " ",
			oFunction = this._getFunction(sKey),
			iCaretPosition = sNewExpression.length, aItems;

		var fnGetDefaultRange = function () {
			return {
				start: $input.text().length,
				length: 0
			};
		};

		oRange = this._getSelectionRange() || fnGetDefaultRange();

		$input.focus();
		this._lastRangeSelection = {};
		sText = fnGetNodesText($input[0], true);

		// if we are to replace empty item remove special chars from text
		if (sText[oRange.start] === "┘" && sText[oRange.start - 1] === "┘" && oRange.length === 0) {
			oRange.start--;
			oRange.length += 2;
		}

		if (oFunction) {
			sNewExpression = " " + sKey + "(";
			aItems = this._getFunctionTemplateItems(oFunction);

			if (aItems.length > 0) {
				aItems.forEach(function (sKey) {
					sNewExpression += sKey ? sKey : EMPTY_HASH;
				});
			} else {
				sNewExpression += EMPTY_HASH;
			}
			sNewExpression += ") ";
			iCaretPosition = sNewExpression.indexOf(EMPTY_HASH) + 1;
		}

		sNewText = [sText.slice(0, oRange.start), sNewExpression, sText.slice(oRange.start + oRange.length)].join('');

		this.fireChange({
			value: sNewText,
			position: oRange.start + iCaretPosition
		});

		this._storeCurrent();
	};

	CalculationBuilderInput.prototype._fillInputToolbar = function () {
		var fnCreateButton = function (sLabel, sClass) {
			return new Button({
				type: ButtonType.Transparent,
				text: sLabel === "*" ? "x" : sLabel,
				press: this._insertItemFromToolbar.bind(this, sLabel)
			}).addStyleClass("sapCalculationBuilderInputToolbarButtons " + sClass);
		}.bind(this);

		var fnCreateMenuItemsFromArray = function (aItems) {
			return aItems.map(function (oItem) {
				return new MenuItem({
					key: oItem.getKey(),
					text: oItem._getLabel()
				});
			}).sort(function (o1, o2) {
				return o1.getText().localeCompare(o2.getText());
			});
		};

		var fnCreateMenuItems = function (aKeys) {
			return aKeys.map(function (sKey) {
				return new MenuItem({
					key: sKey,
					text: sKey
				});
			});
		};

		var fnCreateOperatorsMenu = function () {
			var bIsComparisonOperatorsAllow = this.getParent().getAllowComparisonOperators(),
				bIsLogicalOperatorsAllow = this.getParent().getAllowLogicalOperators();

			if (bIsComparisonOperatorsAllow && bIsLogicalOperatorsAllow) {
				return [
					new MenuItem({
						text: oResourceBundle.getText("CALCULATION_BUILDER_COMPARISON_TITLE"),
						items: fnCreateMenuItems(Object.keys(ComparisonOperatorType))
					}),
					new MenuItem({
						text: oResourceBundle.getText("CALCULATION_BUILDER_LOGICAL_TITLE"),
						items: fnCreateMenuItems(Object.keys(LogicalOperatorType))
					})
				];
			} else if (bIsComparisonOperatorsAllow) {
				return fnCreateMenuItems(Object.keys(ComparisonOperatorType));
			} else if (bIsLogicalOperatorsAllow) {
				return fnCreateMenuItems(Object.keys(LogicalOperatorType));
			}
			return [];
		}.bind(this);

		var OperatorType = library.CalculationBuilderOperatorType,
			ComparisonOperatorType = library.CalculationBuilderComparisonOperatorType,
			LogicalOperatorType = library.CalculationBuilderLogicalOperatorType,
			aOperatorsItems = fnCreateOperatorsMenu(),
			oParent = this.getParent(),
			bIsTitleVisible = !!oParent.getTitle() && (oParent.getLayoutType() === library.CalculationBuilderLayoutType.TextualOnly),
			aFunctionsItems;

		this._oInputToolbar.removeAllContent();

		this._oInputToolbar.addContent(new Title({
			text: oParent.getTitle(),
			visible: bIsTitleVisible
		}));
		this._oInputToolbar.addContent(new ToolbarSpacer());

		Object.keys(OperatorType).forEach(function (sKey) {
			this._oInputToolbar.addContent(fnCreateButton(OperatorType[sKey], ""));
		}.bind(this));

		this._oInputToolbar.addContent(new ToolbarSeparator().addStyleClass("sapUiSmallMarginBeginEnd"));
		if (aOperatorsItems.length > 0) {
			this._oInputToolbar.addContent(new MenuButton({
				text: oResourceBundle.getText("CALCULATION_BUILDER_OPERATORS_TITLE"),
				menu: new Menu({
					itemSelected: function (oEvent) {
						this._insertItemFromToolbar(oEvent.getParameters().item.getKey());
					}.bind(this),
					items: aOperatorsItems
				})
			}));
		}

		aFunctionsItems = this._aFunctions.map(function (oItem) {
			return new MenuItem({
				key: oItem.key,
				text: oItem.title
			});
		});

		this._oInputToolbar.addContent(new MenuButton({
			text: oResourceBundle.getText("CALCULATION_BUILDER_FUNCTIONS_AND_VARIABLES_TITLE"),
			menu: new Menu({
				itemSelected: function (oEvent) {
					this._insertItemFromToolbar(oEvent.getParameters().item.getKey());
				}.bind(this),
				items: [
					new MenuItem({
						text: oResourceBundle.getText("CALCULATION_BUILDER_FUNCTIONS_TITLE"),
						items: [aFunctionsItems]
					}),
					new MenuItem({
						text: oResourceBundle.getText("CALCULATION_BUILDER_VARIABLES_TITLE"),
						items: fnCreateMenuItemsFromArray(this.getParent().getVariables())
					})
				]
			})
		}).addStyleClass("sapUiSmallMarginBegin"));
	};

	/* =========================================================== */
	/* Helper functions									  	       */
	/* =========================================================== */
	CalculationBuilderInput.prototype._isOperator = function (sChar, bAllowLogicalOperator) {
		return this.getParent() && this.getParent()._isOperator(sChar, bAllowLogicalOperator);
	};

	CalculationBuilderInput.prototype._getFunctionTemplateItems = function (oFunction) {
		return this.getParent()._getFunctionTemplateItems(oFunction);
	};

	CalculationBuilderInput.prototype._isEmptySpace = function (sChar) {
		return sChar === String.fromCharCode(160) || sChar === " ";
	};

	CalculationBuilderInput.prototype._isEmptyItem = function (sText) {
		return sText === EMPTY_STRING;
	};

	CalculationBuilderInput.prototype._getText = function () {
		return this.$("input").text();
	};

	CalculationBuilderInput.prototype._isFunction = function (sKey) {
		return !!this._getFunction(sKey);
	};

	CalculationBuilderInput.prototype._getFunction = function (sKey) {
		return this.getParent()._getFunctionDefinition(sKey);
	};

	CalculationBuilderInput.prototype._storeCurrent = function (sValue) {
		var $input = this.$("input");
		$input.data('before', $input.text());
	};

	return CalculationBuilderInput;
}, /* bExport= */ true);
