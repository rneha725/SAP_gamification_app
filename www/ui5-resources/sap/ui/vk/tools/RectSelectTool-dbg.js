/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

// Provides class sap.ui.vk.tools.HitTestTool control.
sap.ui.define([
	"jquery.sap.global", "./library", "./Tool", "./RectSelectToolHandler", "sap/ui/vk/Loco"
], function(jQuery, library, Tool, RectSelectToolHandler, Loco, RectSelectionToolGizmo) {
	"use strict";

	/**
	 * Constructor for a new RectSelectTool tool.
	 *
	 * @class
	 * This tool provides rectangular selection
	 * @param {string} [sId] ID of the new tool instance. <code>sId</code>is generated automatically if no non-empty ID is given.
	 *                       Note: this can be omitted, regardless of whether <code>mSettings</code> will be provided or not.
	 * @param {object} [mSettings] An optional map/JSON object with initial property values, aggregated objects etc. for the new tool instance.
	 * @public
	 * @author SAP SE
	 * @version 1.56.12
	 * @extends sap.ui.vk.tools.Tool
	 * @alias sap.ui.vk.tools.RectSelectionTool
	 * @experimental Since 1.54.0 This class is experimental and might be modified or removed in future versions.
	 */
	var RectSelectTool = Tool.extend("sap.ui.vk.tools.RectSelectTool", /** @lends sap.ui.vk.tools.RectSelectTool.prototype */ {
		metadata: {
		},

		constructor: function(sId, mSettings) {
			// Treat tool instantiation as singleton
			if (RectSelectTool._instance) {
				return RectSelectTool._instance;
			}

			// extend the properties of the base class
			Tool.apply(this, arguments);

			// Configure dependencies
			this._viewport = null;
			this._handler = new RectSelectToolHandler(this);
			this._loco = null;

			RectSelectTool._instance = this;
		}
	});

	RectSelectTool.prototype.init = function() {
		if (Tool.prototype.init) {
			Tool.prototype.init.call(this);
		}

		// set footprint for tool
		this.setFootprint([ "sap.ui.vk.threejs.Viewport" ]);
	};

	/*
    * Override the active property setter so that we execute activation / deactivation code at the same time
    */
	RectSelectTool.prototype.setActive = function(value, activeViewport, gizmoContainer) {
		if (Tool.prototype.setActive) {
			Tool.prototype.setActive.call(this, value, activeViewport, gizmoContainer);
		}

		if (value) {
			this._activateTool(activeViewport);
		} else {
			this._deactivateTool();
		}

		if (activeViewport) {
			activeViewport.setShouldRenderFrame();
		}

		return this;
	};

    /*
    * Adds loco handler, manages UI
    */
	RectSelectTool.prototype._activateTool = function(activeViewport) {
		// If target viewport supports dvl then...
		this._viewport = activeViewport;

		// Prepare the tool to execute
		if (this._prepare()) {
			this._handler.activate(activeViewport);
		}
	};

	/*
	* Removes/Hides tool UI, removes handler from the loco stack and performs any other cleanup
	*/
	RectSelectTool.prototype._deactivateTool = function() {
		// Remove tool hander from loco stack for viewport so that the tool no longer handles input from user
		this._handler.deactivate();
	};

    /*
    * Checks that the execution criteria for this tool are met before execution of tool commands
    */
	RectSelectTool.prototype._prepare = function() {
		return this.isViewportType("sap.ui.vk.threejs.Viewport") && this._viewport._scene && this._viewport._scene.getSceneRef();
	};

    /** MOVE TO BASE
	 * Queues a command for execution during the rendering cycle. All gesture operations should be called using this method.
	 *
	 * @param {function} command The command to be executed.
	 * @returns {sap.ui.vk.Viewport} this
	 * @public
	 */
	RectSelectTool.prototype.queueCommand = function(command) {
		if (this._prepare()) {
			if (this.isViewportType("sap.ui.vk.threejs.Viewport")) {
				command();
			}
		}
		return this;
	};

	function cropProjection(matProj, cropRect, viewportSize) {
		var m = matProj.elements;
		// calculate projection rectangle from projection matrix
		var isOrthographic = m[ 15 ] === 1;
		var rightMinusLeft = 2 / m[ 0 ];
		var topMinusBottom = 2 / m[ 5 ];
		var rightPlusLeft, topPlusBottom;
		if (isOrthographic) {
			rightPlusLeft = -m[ 12 ] * rightMinusLeft;
			topPlusBottom = -m[ 13 ] * topMinusBottom;
		} else {
			rightPlusLeft = m[ 8 ] * rightMinusLeft;
			topPlusBottom = m[ 9 ] * topMinusBottom;
		}

		var right = (rightMinusLeft + rightPlusLeft) * 0.5;
		var left = rightPlusLeft - right;
		var top = (topMinusBottom + topPlusBottom) * 0.5;
		var bottom = topPlusBottom - top;

		// crop projection rectangle
		var cropLeft = THREE.Math.lerp(left, right, Math.min(cropRect.x1, cropRect.x2) / viewportSize.width);
		var cropRight = THREE.Math.lerp(left, right, Math.max(cropRect.x1, cropRect.x2) / viewportSize.width);
		var cropTop = THREE.Math.lerp(top, bottom, Math.min(cropRect.y1, cropRect.y2) / viewportSize.height);
		var cropBottom = THREE.Math.lerp(top, bottom, Math.max(cropRect.y1, cropRect.y2) / viewportSize.height);

		// update projection matrix
		m[ 0 ] = 2 / (cropRight - cropLeft);
		m[ 5 ] = 2 / (cropTop - cropBottom);
		if (isOrthographic) {
			m[ 12 ] = -(cropRight + cropLeft) / (cropRight - cropLeft);
			m[ 13 ] = -(cropTop + cropBottom) / (cropTop - cropBottom);
		} else {
			m[ 8 ] = (cropRight + cropLeft) / (cropRight - cropLeft);
			m[ 9 ] = (cropTop + cropBottom) / (cropTop - cropBottom);
		}
	}

	/**
	* Figure out which helper is needed and execute hit test
	*
	* @param {int} x1 x coordinate of top-left/bottom-right corner of selection rectangle.
	* @param {int} y1 y coordinate of top-left/bottom-right corner of selection rectangle.
	* @param {int} x2 x coordinate of bottom-right/top-left corner of selection rectangle.
	* @param {int} y2 y coordinate of bottom-right/top-left corner of selection rectangle.
	* @param {sap.ui.vk.Scene} scene Scene object used in current viewport.
	* @param {sap.ui.vk.Camera} camera Current viewport's camera.
	* @returns {any[]} The array of node references that are selected.
	* @public
	*/
	RectSelectTool.prototype.select = function(x1, y1, x2, y2, scene, camera) {
		var nodes = [];
		if (this._prepare()) {

			var sceneRef = scene ? scene.getSceneRef() : undefined;
			var cameraRef = camera ? camera.getCameraRef() : undefined;
			var vsm = this._viewport._getViewStateManagerThreeJS();
			if (!cameraRef || !sceneRef || !vsm || x1 === x2 || y1 === y2) {
				return nodes;
			}

			var rect = { x1: x1, y1: y1, x2: x2, y2: y2 };

			var matProj = cameraRef.projectionMatrix.clone();
			cropProjection(matProj, rect, this._viewport._renderer.getSize());
			var matViewProj = new THREE.Matrix4().multiplyMatrices(matProj, cameraRef.matrixWorldInverse);
			var frustum = new THREE.Frustum().setFromMatrix(matViewProj);

			var v1 = new THREE.Vector3();
			sceneRef.traverseVisible(function(node) {
				var geometry = node.geometry;
				if (geometry !== undefined && frustum.intersectsObject(node)) {
					var i, l = 0;
					if (geometry.isGeometry) {
						var vertices = geometry.vertices;
						for (i = 0, l = vertices.length; i < l; i++) {
							v1.copy(vertices[ i ]).applyMatrix4(node.matrixWorld);
							if (!frustum.containsPoint(v1)) {
								break;
							}
						}
					} else if (geometry.isBufferGeometry) {
						var attribute = geometry.attributes.position;
						if (attribute !== undefined) {
							for (i = 0, l = attribute.count; i < l; i++) {
								v1.fromBufferAttribute(attribute, i).applyMatrix4(node.matrixWorld);
								if (!frustum.containsPoint(v1)) {
									break;
								}
							}
						}
					}
					if (l > 0 && i === l) {
						nodes.push(node);
					}
				}
			});

			if (nodes.length > 0) {
				var parameters = {
					picked: nodes
				};
				this._viewport.fireNodesPicked(parameters);
				if (this._viewport.getSelectionMode() === sap.ui.vk.SelectionMode.Exclusive) {
					this._viewport.exclusiveSelectionHandler(parameters.picked);
				} else if (this._viewport.getSelectionMode() === sap.ui.vk.SelectionMode.Sticky) {
					this._viewport.stickySelectionHandler(parameters.picked);
				}
			}
		}

		return nodes;
	};

	RectSelectTool.prototype.destroy = function() {
		// Destroy tool resources
		Tool.prototype.destroy.call(this);

		this._viewport = null;
		this._handler = null;
	};

	return RectSelectTool;
});
