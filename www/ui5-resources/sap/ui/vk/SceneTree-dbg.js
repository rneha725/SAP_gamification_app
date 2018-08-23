/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

// Provides control sap.ui.vk.SceneTree.
sap.ui.define([
	"jquery.sap.global", "./library", "sap/ui/core/Control", "sap/ui/table/TreeTable", "sap/ui/table/Column", "sap/ui/model/json/JSONModel", "sap/ui/core/ResizeHandler",
	"sap/m/Title", "sap/m/SearchField", "sap/m/Toolbar", "sap/m/ToolbarLayoutData", "sap/m/ToolbarSpacer", "./CheckEye", "./ContentConnector", "./ViewStateManager"
], function(jQuery, library, Control, TreeTable, Column, JSONModel, ResizeHandler,
		Title, SearchField, Toolbar, ToolbarLayoutData, ToolbarSpacer, CheckEye, ContentConnector, ViewStateManager) {
	"use strict";

	/**
	 * Constructor for a new SceneTree.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class Provides a hierarchical view of all the nodes in a given scene in table format.
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.56.12
	 *
	 * @constructor
	 * @public
	 * @alias sap.ui.vk.SceneTree
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 * @experimental Since 1.32.0 This class is experimental and might be modified or removed in future versions.
	 */
	var SceneTree = Control.extend("sap.ui.vk.SceneTree", /** @lends sap.ui.vk.SceneTree.prototype */ {
		metadata: {
			library: "sap.ui.vk",
			aggregations: {
				_tree: {
					type: "sap.ui.table.TreeTable",
					multiple: false,
					visibility: "hidden"
				}
			},
			associations: {
				/**
				 * An association to the <code>ContentConnector</code> instance that manages content resources.
				 */
				contentConnector: {
					type: "sap.ui.vk.ContentConnector",
					multiple: false
				},

				/**
				 * An association to the <code>ViewStateManager</code> instance.
				 */
				viewStateManager: {
					type: "sap.ui.vk.ViewStateManager",
					multiple: false
				}
			}
		}
	});

	var getCheckEyeTooltip = function(isVisible, sceneTree) {
		return sap.ui.vk.getResourceBundle().getText(isVisible ? "SCENETREE_VISIBILITYSTATEVISIBLE" : "SCENETREE_VISIBILITYSTATEHIDDEN");
	};

	SceneTree.prototype._createNodeForSceneTree = function(nodeName, nodeRef, viewStateManager) {
		var nodeVisibility = viewStateManager.getVisibilityState(nodeRef);
		return {
			name: nodeName,
			id: nodeRef,
			visible: nodeVisibility,
			checkEyeTooltip: getCheckEyeTooltip(nodeVisibility, this)
		};
	};

	// This methods is kept here for backward compatibility.
	SceneTree.prototype.setScene = function(scene, viewStateManager) {
		this.setViewStateManager(viewStateManager);
		this._setScene(scene);
	};

	SceneTree.prototype._setScene = function(scene) {
		this._scene = scene;
		this.refresh();
	};

	SceneTree.prototype.init = function() {
		if (Control.prototype.init) {
			Control.prototype.init.apply(this);
		}

		var _title = new Title({
			text: sap.ui.vk.getResourceBundle().getText("SCENETREE_TITLE"),
			tooltip: sap.ui.vk.getResourceBundle().getText("SCENETREE_TITLE")
		});

		_title.onAfterRendering = function() {
			var $this = this.$();
			$this.addClass("sapUiVkTitle");
		};

		var that = this;

		var searchField = new SearchField({
			layoutData: new ToolbarLayoutData({
				shrinkable: true,
				maxWidth: "400px"
			}),
			search: function(event) {
				var query = event.getParameter("query"),
					nodeHierarchy = that._scene.getDefaultNodeHierarchy(),
					vsm = that._viewStateManager;
				if (nodeHierarchy && vsm) {
					var selected = !query ? [] : nodeHierarchy.findNodesByName({
						value: query,
						predicate: "contains"
					});
					var newSelection = new Set(selected);
					var unselected = [];
					vsm.enumerateSelection(function(nodeRef) {
						if (!newSelection.has(nodeRef)) {
							unselected.push(nodeRef);
						}
					});
					vsm.setSelectionState(unselected, false, false);
					vsm.setSelectionState(selected, true, false);
				}
			}
		});

		var toolbar = new Toolbar({
			content: [
				_title,
				new ToolbarSpacer(),
				searchField
			]
		});

		this._visibilityColumnHeader = new CheckEye({
			checked: true,
			tooltip: getCheckEyeTooltip(true, this),
			change: function(event) {
				var isVisible = this.getChecked();
				this.setTooltip(getCheckEyeTooltip(isVisible, that));
				that._toggleVisibilityForAllChildren(that._model.getData(), isVisible);
			}
		});

		this._tree = new TreeTable({
			title: toolbar,
			columnHeaderHeight: 32,
			columns: [
				new Column({
					label: sap.ui.vk.getResourceBundle().getText("SCENETREE_NAME"),
					tooltip: sap.ui.vk.getResourceBundle().getText("SCENETREE_NAME"),
					template: new sap.m.Text({
						text: "{name}",
						maxLines: 1,
						tooltip: "{name}"
					}),
					resizable: false
				}),
				new Column({
					label: this._visibilityColumnHeader,
					template: new CheckEye({
						checked: "{visible}",
						tooltip: "{checkEyeTooltip}",
						change: function(event) {
							var nodeRef = that._indexToNodeRef(this.getParent().getIndex());
							that._viewStateManager.setVisibilityState(nodeRef, this.getChecked(), true);
						}
					}),
					width: "2.7em",
					resizable: false,
					hAlign: "Center"
				})
			],
			enableSelectAll: false,
			selectionMode: "MultiToggle",
			selectionBehavior: "RowSelector",
			visibleRowCountMode: "Fixed",
			expandFirstLevel: false,
			collapseRecursive: true,
			rowHeight: 32
		});

		this.setAggregation("_tree", this._tree, true);

		this._scene = null;
		this._syncing = false;
		this._updateSelectionTimer = 0;
		this._updateVisibilityTimer = 0;

		this._model = new JSONModel();
		this._tree.setModel(this._model);
		this._tree.bindRows({
			path: "/"
		});
		this._tree.attachRowSelectionChange(this._handleRowSelectionChange.bind(this));
		this._tree.attachFirstVisibleRowChanged(this._updateSelection.bind(this));
		this._tree.getBinding("rows").attachChange(this._dataChange.bind(this));
	};

	SceneTree.prototype.onBeforeRendering = function() {
		this._tree.setVisible(true);
		if (!this._resizeListenerId) {
			this._resizeListenerId = ResizeHandler.register(this, this._handleResize.bind(this));
		}
	};

	SceneTree.prototype._indexToNodeRef = function(index) {
		var context = this._tree.getContextByIndex(index);
		return context ? context.getObject().id : null;
	};

	SceneTree.prototype._handleRowSelectionChange = function(event) {
		if (this._syncing ||
			this._tree.getBinding("rows")._aSelectedContexts != undefined /* if we hit this, it means TreeTable is trying to restore selection, ignore it */) {
			return;
		}

		var selected = [];
		var deselected = [];
		var rowIndices = event.getParameter("rowIndices");
		for (var i in rowIndices) {
			var index = rowIndices[i];
			var nodeRef = this._indexToNodeRef(index);
			if (nodeRef) {
				(this._tree.isIndexSelected(index) ? selected : deselected).push(nodeRef);
			}
		}

		if (deselected.length > 0) {
			this._viewStateManager.setSelectionState(deselected, false);
		}

		if (selected.length > 0) {
			this._viewStateManager.setSelectionState(selected, true);
		}
	};

	SceneTree.prototype._handleSelectionChanged = function(event) {
		if (this._syncing) {
			return;
		}

		function isTreeNodeVisible(tree, nodeRef) {
			var rows = tree.getBinding("rows");
			if (rows) {
				for (var i = tree.getFirstVisibleRow(), l = Math.min(i + tree.getVisibleRowCount(), rows.getLength()); i < l; i++) {
					var context = rows.getContextByIndex(i);
					if (context && context.getObject().id === nodeRef) {
						return true;
					}
				}
			}
			return false;
		}

		var selected = event.getParameter("selected");
		if (selected.length === 1 && !isTreeNodeVisible(this._tree, selected[0])) {
			if (this._updateSelectionTimer > 0) {
				clearTimeout(this._updateSelectionTimer);
				this._updateSelectionTimer = 0;
			}
			this._expandToNode(selected[0], this._updateSelection.bind(this));
		} else if (this._updateSelectionTimer === 0) {
			this._updateSelectionTimer = setTimeout(this._updateSelection.bind(this), 0);
		}
	};

	// Updates TreeTable visible rows selection
	SceneTree.prototype._updateSelection = function() {
		this._updateSelectionTimer = 0;

		if (this._syncing) {
			return;
		}

		this._syncing = true;

		var vsm = this._viewStateManager,
			tree = this._tree,
			rows = tree.getBinding("rows");
		if (vsm && rows) {
			for (var i = tree.getFirstVisibleRow(), l = Math.min(i + tree.getVisibleRowCount(), rows.getLength()); i < l; i++) {
				var context = rows.getContextByIndex(i);
				if (context) {
					var nodeRef = context.getObject().id;
					if (nodeRef) {
						var selected = vsm.getSelectionState(nodeRef);
						if (selected != tree.isIndexSelected(i)) {
							tree[selected ? "addSelectionInterval" : "removeSelectionInterval"](i, i);
						}
					}
				}
			}
		}

		this._syncing = false;
	};

	SceneTree.prototype._expandToNode = function(nodeRef, callback) {
		var context = {
			tree: this._tree,
			rows: this._tree.getBinding("rows"),
			index: 0,
			nodeRef: nodeRef,
			ancestors: new Set(this._scene.getDefaultNodeHierarchy().getAncestors(nodeRef)),
			callback: callback
		};

		function scrollToRow(tree, index, totalRowCount) {
			var firstRow = tree.getFirstVisibleRow(),
				rowCount = tree.getVisibleRowCount();
			if ((index < firstRow) || (index >= (firstRow + rowCount))) {
				firstRow = Math.min(Math.max(index - (rowCount >> 1), 0), totalRowCount - rowCount);
				setTimeout(function() {
					tree.setFirstVisibleRow(firstRow);
				}, 0); // we have to wait until the tree opens up
			}
		}

		function expandRows(context, event) {
			if (event && event.getParameter("reason") !== "expand") {
				return;
			}

			var totalRowCount = context.rows.getLength();
			while (context.index < totalRowCount) {
				var rowContext = context.rows.getContextByIndex(context.index);
				if (!rowContext) {
					break;
				}

				var nodeRef = rowContext.getObject().id;
				if (nodeRef === context.nodeRef) {
					scrollToRow(context.tree, context.index, totalRowCount);
					break;
				}

				if (context.ancestors.has(nodeRef) && !context.tree.isExpanded(context.index)) {
					context.tree.expand(context.index++);
					return;
				}

				context.index++;
			}

			context.rows.detachChange(context.expandHandlerProxy);
			context.callback();
		}

		context.expandHandlerProxy = expandRows.bind(this, context);
		context.rows.attachChange(context.expandHandlerProxy);
		expandRows(context);
	};

	SceneTree.prototype._dataChange = function(event) {
		var reason = event.getParameter("reason");
		if ((reason === "expand" || reason === "collapse") && this._updateSelectionTimer === 0) {
			this._updateSelectionTimer = setTimeout(this._updateSelection.bind(this), 0);
		}
	};

	SceneTree.prototype._toggleVisibilityForAllChildren = function(node, isVisible) {
		var children = node.hasOwnProperty("children") ? node.children : node;
		for (var i = 0; children[i] != null; i++) {
			this._viewStateManager.setVisibilityState(children[i].id, isVisible, true);
		}
	};

	SceneTree.prototype._handleVisibilityChanged = function(event) {
		if (this._updateVisibilityTimer === 0) {
			this._updateVisibilityTimer = setTimeout(this._updateVisibility.bind(this), 0);
		}
	};

	SceneTree.prototype._updateVisibility = function() {
		this._updateVisibilityTimer = 0;
		this._getNodeVisibilityRecursive(this._model.getData());
		this._tree.getModel().refresh(true);
	};

	SceneTree.prototype._getNodeVisibilityRecursive = function(node) {
		if (node.id != null) {
			node.visible = this._viewStateManager.getVisibilityState(node.id);
			// Updating the tooltip for each node
			node.checkEyeTooltip = getCheckEyeTooltip(node.visible, this);
		}

		var children = node.hasOwnProperty("children") ? node.children : node;
		for (var i = 0; children[i] != null; i++) {
			this._getNodeVisibilityRecursive(children[i]);
		}
	};

	SceneTree.prototype._handleResize = function(event) {
		this._tree.setVisibleRowCount(Math.max(Math.floor(event.size.height / this._tree.getRowHeight() - 2.2), 0));
		this._updateSelection();
	};

	SceneTree.prototype.refresh = function() {
		if (!this._scene || !this._viewStateManager || !this._viewStateManager.getNodeHierarchy()) {
			this._model.setData([]);
			return;
		}

		var nodeHierarchy = this._scene.getDefaultNodeHierarchy();

		// building the tree model which is going to be passed to the TreeTable control.
		var tree = [];
		var getChildrenRecursively = function(tree, nodeRefs) {
			nodeRefs.forEach(function(nodeRef, index) {
				var node = nodeHierarchy.createNodeProxy(nodeRef);
				var treeNode = this._createNodeForSceneTree(node.getName(), node.getNodeRef(), this._viewStateManager);
				tree[index] = treeNode;
				nodeHierarchy.destroyNodeProxy(node);
				treeNode.children = [];
				getChildrenRecursively.bind(this)(treeNode.children, nodeHierarchy.getChildren(nodeRef));
			}.bind(this));
		};
		getChildrenRecursively.bind(this)(tree, nodeHierarchy.getChildren());

		// set the object that we've just built as data model for the TreeTable control
		this._model.setData(tree);
		this._tree.setModel(this._model);
		this._tree.bindRows({
			path: "/",
			parameters: {
				arrayNames: [ "children" ]
			}
		});
		this._tree.getBinding("rows").attachChange(this._dataChange.bind(this));
		this._visibilityColumnHeader.setChecked(true);
		this._visibilityColumnHeader.setTooltip(getCheckEyeTooltip(true, this));
	};

	////////////////////////////////////////////////////////////////////////
	// Content connector and view state manager handling begins.

	SceneTree.prototype._onBeforeClearContentConnector =
	SceneTree.prototype._onBeforeClearViewStateManager = function() {
		this._setScene(null);
	};

	SceneTree.prototype._onAfterUpdateContentConnector =
	SceneTree.prototype._onAfterUpdateViewStateManager = function() {
		if (this._contentConnector) {
			this._setContent(this._contentConnector.getContent());
		}
	};

	// Content connector and view state manager handling ends.
	////////////////////////////////////////////////////////////////////////

	////////////////////////////////////////////////////////////////////////
	// Scene handling begins.
	SceneTree.prototype._setContent = function(content) {
		this._setScene(content);
	};

	SceneTree.prototype._handleContentReplaced = function(event) {
		this._setContent(event.getParameter("newContent"));
	};

	SceneTree.prototype._handleNodeHierarchyReplaced = function(event) {
		this._setScene(this._scene);
	};

	SceneTree.prototype._handleContentChangesFinished = function(event) {
		this.refresh();
	};

	// Scene handling ends.
	////////////////////////////////////////////////////////////////////////

	// This mixin adds and maintains private property _contentConnector.
	ContentConnector.injectMethodsIntoClass(SceneTree);

	// This mixin adds and maintains private property _viewStateManager.
	ViewStateManager.injectMethodsIntoClass(SceneTree);

	return SceneTree;

}, /* bExport= */ true);
