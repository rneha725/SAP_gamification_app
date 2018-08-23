/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	'./FieldHelpBase', 'sap/ui/model/base/ManagedObjectModel',
	'sap/ui/base/ManagedObjectObserver', "sap/ui/model/Filter", "sap/ui/model/FilterOperator"

], function(FieldHelpBase, ManagedObjectModel, ManagedObjectObserver, Filter, FilterOperator) {
	"use strict";

	/**
	 * Constructor for a new TableFieldHelp.
	 *
	 * If a more complex value help is needed the application can put a complete table into this field help.
	 * As in this case only the application knows the content, the binding and so on, it must implement
	 * some events and functions.
	 *
	 * Only in the case the table has no paging, uses <code>ColumnListItem</code> as item and the first column
	 * holds the key and the second column the description, using a <code>Text</code> control, this can be handled automatically.
	 * For everything else the application has to implement the logic.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class A field help used in the <code>FieldFelp</code> aggregation in <code>Field</code> controls that shows a table
	 * @extends sap.ui.mdc.base.FieldHelpBase
	 * @version 1.56.5
	 * @constructor
	 * @private
	 * @since 1.54.0
	 * @alias sap.ui.mdc.base.TableFieldHelp
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var TableFieldHelp = FieldHelpBase.extend("sap.ui.mdc.base.TableFieldHelp", /** @lends sap.ui.mdc.base.TableFieldHelp.prototype */
	{
		metadata: {
			library: "sap.ui.mdc",
			properties: {
				/**
				 * function to determine text for key
				 *
				 * the function must have the parameter <code>sKey</code> of type <code>string</code> and
				 * return a text as <code>string</code>.
				 */
				getTextForKey: {
					type: "function",
					group: "Data"
				},

				/**
				 * function to determine key for text
				 *
				 * the function must have the parameter <code>sText</code> of type <code>string</code> and
				 * return a key as <code>string</code>.
				 */
				getKeyForText: {
					type: "function",
					group: "Data"
				},

				/**
				 * function to determine key from an Item
				 *
				 * the function must have the parameter <code>oItem</code> of type <code>sap.m.ListItemBase</code> and
				 * return a key as <code>string</code>.
				 */
				getKeyFromItem: {
					type: "function",
					group: "Data"
				},

				/**
				 * function to determine text from an Item
				 *
				 * the function must have the parameter <code>oItem</code> of type <code>sap.m.ListItemBase</code> and
				 * return a text as <code>string</code>.
				 */
				getTextFromItem: {
					type: "function",
					group: "Data"
				}
			},
			aggregations: {
				/**
				 * table of the Field help
				 *
				 * As the <code>TableFieldHelp</code> can not know the semantic of the items,
				 * the caller is responsible for the item handling.
				 * The items must be active to allow interaction and selection.
				 */
				table: {
					type: "sap.m.Table",
					multiple: false
				}
			},
			defaultAggregation: "table",
			events: {
				/**
				 * This event is fired when an item is selected in the table
				 *
				 * As the <code>TableFieldHelp</code> can not know the semantic of the item the calling application
				 * has to determine the key, text and additional text to transfer it to the <code>Field</code>.
				 * So the event handler has to fire the <code>select</code> event of the <code>TableFieldHelp</code>
				 * and fill the properties. In addition the <code>selectedKey</code> property of the <code>TableFieldHelp</code>
				 * must be set.
				 */
				itemSelect: {
					parameters: {

						/**
						 * The selected <code>item</code>.
						 */
						item: { type: "sap.m.ListItemBase" }
					}
				},
				/**
				 * This event is fired when the user wants to navigate via keyboard (arrow keys).
				 *
				 * As the <code>TableFieldHelp</code> not all items might be loaded the and not know the sematic
				 * of the items the application must handle this event. So loading of new items might be necessary.
				 *
				 * The application must set the <code>selected</code> property for the new item and remove it from the old one.
				 *
				 * The <code>navigate</code>event of the <code>TableFieldHelp</code> must be called and it's properties
				 * must be set.
				 *
				 * In addition the <code>selectedKey</code> property of the <code>TableFieldHelp</code>
				 * must be set.
				 */
				navigateToItem: {
					parameters: {

						/**
						 * The navigation step.
						 */
						step: { type: "int" },

						/**
						 * The currently selected <code>item</code>.
						 */
						selectedItem: { type: "sap.m.ListItemBase" }
					}
				},
				/**
				 * This event is fired when items should be filtered
				 *
				 * As the <code>TableFieldHelp</code> can not know the semantic of the item the calling application
				 * has to perform the filtering or set it on the used model.
				 */
				filterItems: {
					parameters: {

						/**
						 * The text to filter with.
						 */
						filterText: { type: "string" }
					}
				}
			}
		}
	});

	TableFieldHelp.prototype.init = function() {

		FieldHelpBase.prototype.init.apply(this, arguments);

		this._oObserver = new ManagedObjectObserver(_observeChanges.bind(this));

		this._oObserver.observe(this, {
			properties: ["selectedKey", "filterValue"],
			aggregations: ["table"]
		});

	};

	TableFieldHelp.prototype.exit = function() {

		FieldHelpBase.prototype.exit.apply(this, arguments);

		this._oObserver.disconnect();
		this._oObserver = undefined;

	};

	TableFieldHelp.prototype._createPopover = function() {

		var oPopover = FieldHelpBase.prototype._createPopover.apply(this, arguments);

		if (oPopover) { // empty if loaded async
			var oField = this._getField();
			if (oField) {
				oPopover.setInitialFocus(oField);
			}

			// use Table content in Popover -> overwrite hook
			oPopover._getAllContent = function() {
				var oParent = this.getParent();

				if (oParent) {
					var aContent = [];
					aContent.push(oParent.getTable());
					return aContent;
				} else {
					return this.getContent();
				}
			};

			if (this._bNavigate) {
				this._bNavigate = false;
				this.navigate(this._iStep);
				this._iStep = null;
			}
		}

		return oPopover;

	};

	TableFieldHelp.prototype._handleAfterOpen = function(oEvent) {

		FieldHelpBase.prototype._handleAfterOpen.apply(this, arguments);

		var oTable = this.getTable();
		var oSelectedItem = oTable.getSelectedItem();

		if (oSelectedItem) {
			oSelectedItem.getDomRef().scrollIntoView();
		}

	};

	TableFieldHelp.prototype.open = function() {

		// focus should stay on Field
		var oPopover = this.getAggregation("_popover");
		if (oPopover) {
			var oField = this._getField();
			oPopover.setInitialFocus(oField);
		}

		FieldHelpBase.prototype.open.apply(this, arguments);

		return this;

	};

	TableFieldHelp.prototype._handleAfterClose = function(oEvent) {

		FieldHelpBase.prototype._handleAfterClose.apply(this, arguments);

		if (this._bUpdateFilterAfterClose) {
			this._bUpdateFilterAfterClose = false;
			_filterTable.call(this, this._sFilterValueAfterClose);
			this._sFilterValueAfterClose = null;
		}

	};

	function _observeChanges(oChanges) {

		if (oChanges.name == "table") {
			this.fireDataUpdate();
			var oTable = oChanges.child;
			var oPopover = this.getAggregation("_popover");
			if (oChanges.mutation == "remove") {
				oTable.detachEvent("itemPress", _handleItemPress, this);
				oTable.detachEvent("updateFinished", _handleUpdateFinished, this);
			} else {
				oTable.setMode(sap.m.ListMode.SingleSelectMaster);
				oTable.setRememberSelections(false);
				oTable.attachEvent("itemPress", _handleItemPress, this);
				oTable.attachEvent("updateFinished", _handleUpdateFinished, this);
				_updateSelection.call(this, this.getSelectedKey());
			}
			if (oPopover) {
				oPopover.invalidate();
			}
		}


		if (oChanges.name == "selectedKey") {
			_updateSelection.call(this, oChanges.current);
		}

		if (oChanges.name == "filterValue") {
			if (this._bClosing) {
				this._bUpdateFilterAfterClose = true;
				this._sFilterValueAfterClose = oChanges.current;
			} else {
				_filterTable.call(this, oChanges.current);
			}
		}

	}

	TableFieldHelp.prototype.openByTyping = function() {

		return true;

	};

	TableFieldHelp.prototype.navigate = function(iStep) {

		var oPopover = this._getPopover();

		if (!oPopover) {
			// Popover not loaded right now
			this._bNavigate = true;
			this._iStep = iStep;
			return;
		}

		var oTable = this.getTable();
		var oSelectedItem = oTable.getSelectedItem();

		if (this.hasListeners("navigateToItem")) {
			// let the caller determine the key and value
			if (!oPopover.isOpen()) {
				this.open();
			}
			this.fireNavigateToItem({step: iStep, selectedItem: oSelectedItem});
		} else {
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
			} else if (iStep >= 0){
				iSelectedIndex = iStep - 1;
			} else {
				iSelectedIndex = iItems + iStep;
			}

			var oItem = aItems[iSelectedIndex];
			if (oItem && oItem !== oSelectedItem) {
				oItem.setSelected(true);
				var sKey = _getKeyFromItem.call(this, oItem);
				var sText = _getTextFromItem.call(this, oItem);
				this.setProperty("selectedKey", sKey, true); // do not invalidate while FieldHelp

				if (!oPopover.isOpen()) {
					this.open();
				} else {
					oItem.getDomRef().scrollIntoView();
				}

				this.fireNavigate({value: sText, key: sKey});
			}
		}

	};

	TableFieldHelp.prototype.getTextForKey = function(sKey) {

		var sText = "";
		var fnTextForKey = this.getGetTextForKey();
		if (fnTextForKey) {
			sText = fnTextForKey(sKey);
			if (typeof sText !== "string") {
				throw new Error("function getTextForKey must return a string");
			}
		} else {
			// if there are items the function is needed
			var oTable = this.getTable();
			var bNotSupported = false;
			if (oTable) {
				var aItems = oTable.getItems();
				if (aItems.length > 0) {
					for (var i = 0; i < aItems.length; i++) {
						var oItem = aItems[i];
						if (oItem.getCells) {
							var aCells = oItem.getCells();
							if (aCells.length > 1) {
								if (aCells[0].getText && aCells[1].getText) {
									if (aCells[0].getText() == sKey) {
										sText = aCells[1].getText();
										break;
									}
								} else {
									bNotSupported = true;
								}
							} else {
								bNotSupported = true;
							}
						} else {
							bNotSupported = true;
						}
					}
					if (bNotSupported) {
						throw new Error("function getTextForKey is missing");
					}
				}
			}
		}

		return sText;

	};

	TableFieldHelp.prototype.getKeyForText = function(sText) {

		var sKey = "";
		var fnKeyForText = this.getGetKeyForText();
		if (fnKeyForText) {
			sKey = fnKeyForText(sText);
			if (typeof sKey !== "string") {
				throw new Error("function getKeyForText must return a string");
			}
		} else {
			// if there are items the function is needed
			var oTable = this.getTable();
			var bNotSupported = false;
			if (oTable) {
				var aItems = oTable.getItems();
				if (aItems.length > 0) {
					for (var i = 0; i < aItems.length; i++) {
						var oItem = aItems[i];
						if (oItem.getCells) {
							var aCells = oItem.getCells();
							if (aCells.length > 1) {
								if (aCells[0].getText && aCells[1].getText) {
									if (aCells[1].getText() == sText) {
										sKey = aCells[0].getText();
										break;
									}
								} else {
									bNotSupported = true;
								}
							} else {
								bNotSupported = true;
							}
						} else {
							bNotSupported = true;
						}
					}
					if (bNotSupported) {
						throw new Error("function getKeyForText is missing");
					}
				}
			}
		}

		return sKey;

	};

	function _handleItemPress(oEvent) {

		var oItem = oEvent.getParameter("listItem");
		var bSelected = oItem.getSelected();

		if (bSelected) {
			if (this.hasListeners("itemSelect")) {
				// let the caller determine the key and value
				this.close();
				this.fireItemSelect({item: oItem});
			} else {
				var sKey = _getKeyFromItem.call(this, oItem);
				var sText = _getTextFromItem.call(this, oItem);
				this.setProperty("selectedKey", sKey, true); // do not invalidate while FieldHelp
				this.close();
				this.fireSelect({value: sText, key: sKey});
			}
		}

	}

	function _getKeyFromItem(oItem) {

		var sKey;
		var fnKeyFromItem = this.getGetKeyFromItem();
		if (fnKeyFromItem) {
			sKey = fnKeyFromItem(oItem);
			if (typeof sKey !== "string") {
				throw new Error("function getKeyFromItem must return a string");
			}
		} else {
			if (oItem.getCells) {
				var aCells = oItem.getCells();
				if (aCells.length > 0) {
					if (aCells[0].getText) {
						sKey = aCells[0].getText();
					}
				}
			}
			if (!sKey) {
				throw new Error("function getKeyFromItem is missing");
			}
		}

		return sKey;

	}

	function _getTextFromItem(oItem) {

		var sText;
		var fnTextFromItem = this.getGetTextFromItem();
		if (fnTextFromItem) {
			sText = fnTextFromItem(oItem);
			if (typeof sText !== "string") {
				throw new Error("function getTextFromItem must return a string");
			}
		} else {
			if (oItem.getCells) {
				var aCells = oItem.getCells();
				if (aCells.length > 1) {
					if (aCells[1].getText) {
						sText = aCells[1].getText();
					}
				}
			}
			if (!sText) {
				throw new Error("function getTextFromItem is missing");
			}
		}

		return sText;

	}

	function _handleUpdateFinished() {

		_updateSelection.call(this, this.getSelectedKey());
		this.fireDataUpdate();

	}

	function _updateSelection(sSelectedKey) {

		var oTable = this.getTable();
		if (oTable) {
			var aItems = oTable.getItems();
			for (var i = 0; i < aItems.length; i++) {
				var oItem = aItems[i];
				var sKey = _getKeyFromItem.call(this, oItem);
				if (sKey == sSelectedKey) {
					oItem.setSelected(true);
				} else {
					oItem.setSelected(false);
				}
			}
		}

	}

	function _filterTable(sFilterText) {

		if (this.hasListeners("filterItems")) {
			this.fireFilterItems({filterText: sFilterText});
		} else {
			var oTable = this.getTable();
			var bSupported = false;
			var oBinding = oTable.getBinding("items");
			if (oBinding) {
				var oBindingInfo = oTable.getBindingInfo("items");
				if (oBindingInfo && oBindingInfo.template.getCells && oBindingInfo.template.getCells().length > 1) {
					oBindingInfo = oBindingInfo.template.getCells()[1].getBindingInfo("text");
					if (oBindingInfo && oBindingInfo.parts && oBindingInfo.parts.length > 0) {
						var sPath = oBindingInfo.parts[0].path;
						var oFilter = new Filter(sPath, FilterOperator.StartsWith, sFilterText);
						oBinding.filter(oFilter);
						bSupported = true;
					}
				}
				if (!bSupported) {
					throw new Error("event filterItems must be implemented");
				}
			}
		}

	}

	return TableFieldHelp;

}, /* bExport= */true);
