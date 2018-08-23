/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

// Provides control sap.ui.vk.tools.ScaleTool
sap.ui.define([
	"jquery.sap.global", "./library", "./Tool", "./ScaleToolHandler", "./ScaleToolGizmo"
], function(jQuery, library, Tool, ScaleToolHandler, ScaleToolGizmo) {
	"use strict";

	/**
	 * Constructor for a new ScaleTool.
	 *
	 * @class
	 * Tool to scale 3D objects

	 * @param {string} [sId] ID of the new content resource. <code>sId</code>is generated automatically if no non-empty ID is given.
	 *                       Note: this can be omitted, regardless of whether <code>mSettings</code> will be provided or not.
	 * @param {object} [mSettings] An optional map/JSON object with initial property values, aggregated objects etc. for the new tool instance.
	 * @public
	 * @author SAP SE
	 * @version 1.56.12
	 * @extends sap.ui.vk.tools.Tool
	 * @alias sap.ui.vk.tools.ScaleTool
	 * @experimental Since 1.50.0 This class is experimental and might be modified or removed in future versions.
	 */
	var ScaleTool = Tool.extend("sap.ui.vk.tools.ScaleTool", /** @lends sap.ui.vk.tools.ScaleTool.prototype */ {
		metadata: {
			events: {
				/**
				 * This event will be fired when scaling occurs.
				 */
				scaling: {
					parameters: {
						x: "float",
						y: "float",
						z: "float"
					}
				},
				/**
				 * This event will be fired when scaling finished.
				 */
				scaled: {
					parameters: {
						x: "float",
						y: "float",
						z: "float"
					}
				}
			}
		},

		constructor: function(sId, mSettings) {
			Tool.apply(this, arguments);

			// Configure dependencies
			this._viewport = null;
			this._handler = null;
			this._gizmo = null;
		}
	});

	ScaleTool.prototype.init = function() {
		if (Tool.prototype.init) {
			Tool.prototype.init.call(this);
		}

		// set footprint for tool
		this.setFootprint([ "sap.ui.vk.threejs.Viewport" ]);

		// this.setSupportedContentResourceSourceCategories([ContentResourceSourceCategory.3D]);
		this.setAggregation("gizmo", new ScaleToolGizmo());
	};

	// Checks if the current viewport is of a specified type
	ScaleTool.prototype.isViewportType = function(typeString) {
		if (this._viewport && this._viewport.getMetadata().getName() === typeString) {
			return true;
		}
		return false;
	};

	// Override the active property setter so that we execute activation / deactivation code at the same time
	ScaleTool.prototype.setActive = function(value, activeViewport, gizmoContainer) {
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

	ScaleTool.prototype._activateTool = function(activeViewport) {
		this._viewport = activeViewport;
		this._handler = new ScaleToolHandler(this);
		this._gizmo = this.getGizmo();
		if (this._gizmo) {
			this._gizmo.show(activeViewport, this);
		}

		// Prepare the tool to execute
		this._prepare();
	};

	ScaleTool.prototype._deactivateTool = function() {
		// Remove tool handler from loco stack for viewport so that the tool no longer handles input from user
		if (this._handler) {
			if (this._viewport._loco) {
				this._viewport._loco.removeHandler(this._handler);
			}
			this._handler = null;
		}

		if (this._gizmo) {
			this._gizmo.hide();
			this._gizmo = null;
		}
	};

	/*
	* Checks that the execution criteria for this tool are met before execution of tool commands
	*/
	ScaleTool.prototype._prepare = function() {
		var okToExec = false;

		if (this._viewport._loco) {
			// Add tool hander to loco stack for viewport so that the tool can handler input from user
			this._viewport._loco.addHandler(this._handler);
			okToExec = true;
		}

		return okToExec;
	};

	/** MOVE TO BASE
	 * Queues a command for execution during the rendering cycle. All gesture operations should be called using this method.
	 *
	 * @param {function} command The command to be executed.
	 * @returns {sap.ui.vk.tools.ScaleTool} <code>this</code> to allow method chaining.
	 * @public
	 */
	ScaleTool.prototype.queueCommand = function(command) {
		if (this._prepare()) {

			if (this.isViewportType("sap.ui.vk.threejs.Viewport")) {
				command();
			}
		}
		return this;
	};

	ScaleTool.prototype.destroy = function() {
		// Destroy tool resources
		Tool.prototype.destroy.call(this);

		this._viewport = null;
		this._handler = null;
	};

	/**
	 * Returns the true or false to indicated that the non-uniform scale is enabled or not.
	 *
	 * @returns {boolean} <code>true</code> if non-uniform scale is enabled.
	 * @public
	 */
	ScaleTool.prototype.getNonUniformScaleEnabled = function() {
		return this.getGizmo().getNonUniformScaleEnabled();
	};

	/**
	 * Enables or disables the non-uniform scale.
	 *
	 * @param {boolean} [value] If set to <code>true</code>, the the non-uniform scale will be enabled.
	 * @returns {sap.ui.vk.tools.ScaleTool} <code>this</code> to allow method chaining.
	 * @public
	 */
	ScaleTool.prototype.setNonUniformScaleEnabled = function(value) {
		this.getGizmo().setNonUniformScaleEnabled(value);
		if (this._viewport) {
			this._viewport.setShouldRenderFrame();
		}
		return this;
	};

	/**
	 * Gets the coordinate system of the tool.
	 *
	 * @returns {sap.ui.vk.tools.CoordinateSystem} Coordinate system.
	 * @public
	 */
	ScaleTool.prototype.getCoordinateSystem = function() {
		return this.getGizmo().getCoordinateSystem();
	};

	/**
	 * Sets the coordinate system of the tool.
	 *
	 * @param {sap.ui.vk.tools.CoordinateSystem} [value] Coordinate system.
	 * @returns {sap.ui.vk.tools.ScaleTool} <code>this</code> to allow method chaining.
	 * @public
	 */
	ScaleTool.prototype.setCoordinateSystem = function(value) {
		this.getGizmo().setCoordinateSystem(value);
		if (this._viewport) {
			this._viewport.setShouldRenderFrame();
		}
		return this;
	};

	/**
	 * Performs scaling of selected objects.
	 *
	 * @param {THREE.Vector3} [value] Scaling value.
	 * @returns {sap.ui.vk.tools.ScaleTool} <code>this</code> to allow method chaining.
	 * @public
	 */
	ScaleTool.prototype.scale = function(value) {
		if (this._gizmo) {
			this._gizmo.scale(value);
		}
		if (this._viewport) {
			this._viewport.setShouldRenderFrame();
		}
		return this;
	};

	return ScaleTool;
});
