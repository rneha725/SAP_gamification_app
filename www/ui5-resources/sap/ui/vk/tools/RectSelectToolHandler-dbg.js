// Provides control sap.ve.js.LocoEventHandler.
sap.ui.define([
	"jquery.sap.global", "sap/ui/base/EventProvider"
], function(jQuery, EventProvider) {
	"use strict";

	var RectSelectToolHandler = EventProvider.extend("sap.ui.vk.tools.RectSelectToolHandler", {
		metadata: {
			publicMethods: [
				"beginGesture",
				"endGesture",
				"move",
				"click",
				"doubleClick",
				"contextMenu" ]
		},
		constructor: function(Tool) {
			this._tool = Tool;
			this._rect = null;
			this._gesture = false;
			this._nomenu = false;
			this._selectionRect = null;
		}
	});

	RectSelectToolHandler.prototype.destroy = function() {
		this._tool = null;
		this._rect = null;
		this._gesture = false;
	};

	RectSelectToolHandler.prototype.activate = function(viewport) {
		this._deactivate = false;
		if (viewport._loco) {
			this._viewport = viewport;
			viewport._loco.addHandler(this);
		}
	};

	RectSelectToolHandler.prototype.deactivate = function() {
		if (this._gesture) {
			this._deactivate = true;
		} else if (this._viewport) {
			this._deactivate = false;
			this._viewport._loco.removeHandler(this);
			this._viewport = null;
		}
	};

	// GENERALISE THIS FUNCTION
	RectSelectToolHandler.prototype._getOffset = function(obj) {
		var rectangle = obj.getBoundingClientRect();
		var p = {
			x: rectangle.left + window.pageXOffset,
			y: rectangle.top + window.pageYOffset
		};
		return p;
	};

	// GENERALISE THIS FUNCTION
	RectSelectToolHandler.prototype._inside = function(event) {
		var id = this._tool._viewport.getIdForLabel();
		var domobj = document.getElementById(id);

		if (domobj == null) {
			return false;
		}

		var o = this._getOffset(domobj);
		this._rect = {
			x: o.x,
			y: o.y,
			w: domobj.offsetWidth,
			h: domobj.offsetHeight
		};

		return (event.x >= this._rect.x && event.x <= this._rect.x + this._rect.w && event.y >= this._rect.y && event.y <= this._rect.y + this._rect.h);
	};

	RectSelectToolHandler.prototype.beginGesture = function(event) {
		if (this._inside(event) && !this._gesture) {
			this._gesture = true;
			event.handled = true;

			var x = event.x - this._rect.x,
				y = event.y - this._rect.y;

			this._selectionRect = { x1: x, y1: y, x2: x, y2: y };
			return;
		}
	};


	RectSelectToolHandler.prototype.move = function(event) {
		if (this._gesture) {
			event.handled = true;
			this._nomenu = true;

			var x = event.x - this._rect.x,
				y = event.y - this._rect.y;

			if (this._selectionRect) {
				this._selectionRect.x2 = x;
				this._selectionRect.y2 = y;
				if (this._viewport) {
					this._viewport.setSelectionRect(this._selectionRect);
				}
				return;
			}
		}
	};

	RectSelectToolHandler.prototype.click = function(event) { event.handled = false; };

	RectSelectToolHandler.prototype.doubleClick = function(event) { event.handled = false; };

	RectSelectToolHandler.prototype.contextMenu = function(event) { event.handled = false; };

	RectSelectToolHandler.prototype.endGesture = function(event) {
		if (this._gesture) {
			this._gesture = false;
			event.handled = true;

			var x = event.x - this._rect.x,
				y = event.y - this._rect.y;

			jQuery.sap.log.debug("Loco: endGesture: " + x + ", " + y);

			if (this._selectionRect) {
				this._selectionRect.x2 = x;
				this._selectionRect.y2 = y;
				this._executeRectSelect(this._selectionRect.x1, this._selectionRect.y1, this._selectionRect.x2, this._selectionRect.y2);
				if (this._viewport) {
					this._viewport.setSelectionRect(null);
				}
				this._selectionRect = null;
			}

			if (this._deactivate) {
				this.deactivate();
			}
		}
	};

	RectSelectToolHandler.prototype._executeRectSelect = function(x1, y1, x2, y2) {
		if (this._inside(event) && !this._gesture) {
			this._gesture = false;

			// for some reason x = event.x - this._rect.x, works differently for dvl...
			var x = event.x - this._rect.x,
				y = event.y - this._rect.y;

			// Show the tool gizmo
			this._gizmo = this._tool.getGizmo();
			if (this._gizmo) {
				this._gizmo.show(this._tool._viewport);

				// Move the gizmo to the mouse position
				this._gizmo.moveGizmo(x, y);
			}

			var scene = this._tool._viewport.getScene();
			var camera = this._tool._viewport.getCamera();

			this._tool.select(x1, y1, x2, y2, scene, camera);

			// Hide the tool gizmo
			if (this._gizmo) {
				this._gizmo.hide();
			}
		}
	};

	RectSelectToolHandler.prototype.getViewport = function() {
		return this._viewport;
	};

	return RectSelectToolHandler;
}, /* bExport= */ true);