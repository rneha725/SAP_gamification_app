// Provides control sap.ui.vk.tools.CrossSectionToolHandler
sap.ui.define([
	"jquery.sap.global", "sap/ui/base/EventProvider"
], function(jQuery, EventProvider) {
	"use strict";

	var CrossSectionToolHandler = EventProvider.extend("sap.ui.vk.tools.CrossSectionToolHandler", {
		metadata: {
		},
		constructor: function(tool) {
			this._tool = tool;
			this._gizmo = tool.getGizmo();
			this._rect = null;
			this._mouse = new THREE.Vector2();
			this._rayCaster = new THREE.Raycaster();
			this._rayCaster.linePrecision = 0;
			this._gizmoOrigin = new THREE.Vector3();
			this._gizmoAxis = new THREE.Vector3();
		}
	});

	CrossSectionToolHandler.prototype.destroy = function() {
		this._tool = null;
		this._gizmo = null;
		this._rect = null;
		this._rayCaster = null;
		this._gizmoAxis = null;
		this._gizmoOrigin = null;
		this._mouse = null;
	};

	CrossSectionToolHandler.prototype._updateRayCaster = function(event) {
		var size = this.getViewport().getRenderer().getSize();
		this._mouse.x = ((event.x - this._rect.x) / size.width) * 2 - 1;
		this._mouse.y = ((event.y - this._rect.y) / size.height) * -2 + 1;
		this._rayCaster.setFromCamera(this._mouse, this.getViewport().getCamera().getCameraRef());
	};

	CrossSectionToolHandler.prototype._updateArrowHandle = function(event) {
		var touchObj = this._gizmo.getTouchObject();
		var intersects = this._rayCaster.intersectObject(touchObj, true);
		var axisIndex = intersects.length > 0 ? this._gizmo.getAxis() : -1;
		if (axisIndex !== this._axisIndex) {
			this._axisIndex = axisIndex;
			this._gizmo.highlightArrowHandle(axisIndex >= 0);
			if (axisIndex >= 0) {
				this._gizmoOrigin.setFromMatrixPosition(touchObj.matrixWorld);
				this._gizmoAxis.setScalar(0).setComponent(this._axisIndex, 1);
			}
			this.getViewport().setShouldRenderFrame();
		}
	};

	CrossSectionToolHandler.prototype._getAxisOffset = function() {
		var ray = this._rayCaster.ray;
		var dir = this._gizmoAxis.clone().cross(ray.direction).cross(ray.direction).normalize();
		var delta = ray.origin.clone().sub(this._gizmoOrigin);
		return dir.dot(delta) / dir.dot(this._gizmoAxis);
	};

	CrossSectionToolHandler.prototype.hover = function(event) {
		if (this._inside(event) && !this._gesture && event.n === 1) {
			this._updateRayCaster(event);
			this._updateArrowHandle(event);
		}
	};

	CrossSectionToolHandler.prototype.beginGesture = function(event) {
		if (this._inside(event) && !this._gesture && event.n === 1) {
			this._updateRayCaster(event);
			this._updateArrowHandle(event);

			if (this._axisIndex >= 0 && event.n === 1) {
				this._gesture = true;
				event.handled = true;
				this._dragOrigin = this._getAxisOffset() - this._gizmo._getOffset();
			}
		}
	};

	CrossSectionToolHandler.prototype.move = function(event) {
		if (this._gesture) {
			event.handled = true;
			this._updateRayCaster(event);

			if (!isNaN(this._dragOrigin)) {
				this._gizmo._setOffset(this._getAxisOffset() - this._dragOrigin);
			}
		}
	};

	CrossSectionToolHandler.prototype.endGesture = function(event) {
		if (this._gesture) {
			this._gesture = false;
			event.handled = true;
			this._updateRayCaster(event);
			this._updateArrowHandle(event);
		}
	};

	CrossSectionToolHandler.prototype.click = function(event) { };

	CrossSectionToolHandler.prototype.doubleClick = function(event) { };

	CrossSectionToolHandler.prototype.contextMenu = function(event) { };

	CrossSectionToolHandler.prototype.getViewport = function() {
		return this._tool._viewport;
	};

	// GENERALISE THIS FUNCTION
	CrossSectionToolHandler.prototype._getOffset = function(obj) {
		var rectangle = obj.getBoundingClientRect();
		var p = {
			x: rectangle.left + window.pageXOffset,
			y: rectangle.top + window.pageYOffset
		};
		return p;
	};

	// GENERALISE THIS FUNCTION
	CrossSectionToolHandler.prototype._inside = function(event) {
		if (this._rect === null || true) {
			var id = this._tool._viewport.getIdForLabel();
			var domobj = document.getElementById(id);

			if (domobj === null) {
				return false;
			}

			var o = this._getOffset(domobj);
			this._rect = {
				x: o.x,
				y: o.y,
				w: domobj.offsetWidth,
				h: domobj.offsetHeight
			};
		}

		return (event.x >= this._rect.x && event.x <= this._rect.x + this._rect.w && event.y >= this._rect.y && event.y <= this._rect.y + this._rect.h);
	};

	return CrossSectionToolHandler;
}, /* bExport= */ true);