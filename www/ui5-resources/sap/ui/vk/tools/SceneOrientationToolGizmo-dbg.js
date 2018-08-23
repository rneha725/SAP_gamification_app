/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

// Provides control sap.ui.vk.tools.SceneOrientationToolGizmo
sap.ui.define([
	"jquery.sap.global", "./library", "./Gizmo", "sap/ui/unified/Menu", "sap/ui/unified/MenuItem"
], function(jQuery, library, Gizmo, Menu, MenuItem) {
	"use strict";

	sap.ui.require("sap.m.Menu");

	/**
	 * Constructor for a new SceneOrientationToolGizmo.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Provides drop-down list of predefined camera positions
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.56.12
	 *
	 * @constructor
	 * @public
	 * @alias sap.ui.vk.tools.SceneOrientationToolGizmo
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 * @experimental Since 1.50.0 This class is experimental and might be modified or removed in future versions.
	 */
	var SceneOrientationToolGizmo = Gizmo.extend("sap.ui.vk.tools.SceneOrientationToolGizmo", /** @lends sap.ui.vk.tools.SceneOrientationToolGizmo.prototype */ {
		metadata: {
			library: "sap.ui.vk.tools"
		}
	});

	function createGizmoAxis(dir, color) {
		var arrowLength = 64,
			lineRadius = 0.5,
			coneHeight = 15,
			coneRadius = 3,
			boxSize = 30;
		dir.multiplyScalar(1 / 80);
		var dirX = new THREE.Vector3(dir.y, dir.z, dir.x),
			dirY = new THREE.Vector3(dir.z, dir.x, dir.y);
		var arrowMaterial = new THREE.MeshBasicMaterial({ color: color }),
			boxMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

		var lineGeometry = new THREE.CylinderBufferGeometry(lineRadius, lineRadius, arrowLength - coneHeight, 4);
		var m = new THREE.Matrix4().makeBasis(dirX, dir, dirY).setPosition(dir.clone().multiplyScalar((arrowLength - coneHeight) * 0.5));
		lineGeometry.applyMatrix(m);
		var axisLine = new THREE.Mesh(lineGeometry, arrowMaterial);

		var coneGeometry = new THREE.CylinderBufferGeometry(0, coneRadius, coneHeight, 12, 1);
		m.setPosition(dir.clone().multiplyScalar(arrowLength - coneHeight * 0.5));
		coneGeometry.applyMatrix(m);
		axisLine.add(new THREE.Mesh(coneGeometry, arrowMaterial));

		var boxEdgeGeometry = new THREE.CylinderBufferGeometry(lineRadius, lineRadius, boxSize, 4);
		m.makeBasis(dir, dirY, dirX).setPosition(dirY.clone().multiplyScalar(0.5).add(dir).multiplyScalar(boxSize));
		boxEdgeGeometry.applyMatrix(m);
		axisLine.add(new THREE.Mesh(boxEdgeGeometry, boxMaterial));

		boxEdgeGeometry = new THREE.CylinderBufferGeometry(lineRadius, lineRadius, boxSize, 4);
		m.setPosition(dirY.clone().multiplyScalar(0.5).add(dir).add(dirX).multiplyScalar(boxSize));
		boxEdgeGeometry.applyMatrix(m);
		axisLine.add(new THREE.Mesh(boxEdgeGeometry, boxMaterial));

		boxEdgeGeometry = new THREE.CylinderBufferGeometry(lineRadius, lineRadius, boxSize, 4);
		m.makeBasis(dirY, dirX, dir).setPosition(dirX.clone().multiplyScalar(0.5).add(dir).multiplyScalar(boxSize));
		boxEdgeGeometry.applyMatrix(m);
		axisLine.add(new THREE.Mesh(boxEdgeGeometry, boxMaterial));

		return axisLine;
	}

	SceneOrientationToolGizmo.prototype.init = function() {
		if (Gizmo.prototype.init) {
			Gizmo.prototype.init.apply(this);
		}
		this._menu = null;
		this._viewport = null;
		this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this._renderer.setPixelRatio(window.devicePixelRatio);
		this._renderer.setSize(1, 1);
		this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
		this._scene = new THREE.Scene();
		this._scene.add(createGizmoAxis(new THREE.Vector3(1, 0, 0), 0xFF0000));
		this._scene.add(createGizmoAxis(new THREE.Vector3(0, 1, 0), 0x00FF00));
		this._scene.add(createGizmoAxis(new THREE.Vector3(0, 0, 1), 0x0000FF));
		this._scene.traverse(function(obj3D) {
			obj3D.matrixAutoUpdate = false;
		});
		this._axisTitles = this._createAxisTitles(32, 16);
		this._scene.add(this._axisTitles);

		// Detect click outside of menu in order to unpress menu button
		jQuery(document).click(function(e) {
			// If gizmo button exists
			 if (jQuery(".sapUiVizKitSceneOrientationGizmoButton").length) {
				var drpdownMenuBtn = jQuery(".sapUiVizKitSceneOrientationGizmoButton .sapUiIconMirrorInRTL");
				// If pressed element is anywhere but on the menu button we close the menu
				if (e.target !== drpdownMenuBtn[0]) {
					this._button.setPressed(false);
				}
			 }
		}.bind(this));

		// Menu for dropdown options
		this._button = new sap.m.ToggleButton({
			icon: "sap-icon://drop-down-list",
			tooltip: sap.ui.vk.getResourceBundle().getText("PREDEFINED_VIEW_MENUBUTTONTOOLTIP"),
			press: function(event) {
				if (!this._menu) {
					this.createMenu();
				}
				if (this._button.getPressed()) {
					var eDock = sap.ui.core.Popup.Dock;
					this._menu.open(
						false,
						this.getFocusDomRef(),
						eDock.RightCenter,
						eDock.RightBottom,
						this.getDomRef()
					);
				} else {
					this._menu.close();
				}
			}.bind(this)
		}).addStyleClass("sapUiVizKitSceneOrientationGizmoButton");

		this._button.addStyleClass("sapUiSizeCompact");
	};

	SceneOrientationToolGizmo.prototype.createMenu = function() {
		var timeInterval = 1000;
		var menu = this._menu = new Menu();

		if (this.oParent.getEnableInitialView()) {
			menu.addItem(new MenuItem({
				text: sap.ui.vk.getResourceBundle().getText("PREDEFINED_VIEW_INITIAL")
			}).attachSelect(function() {
				this.setView(sap.ui.vk.tools.PredefinedView.Initial, timeInterval);
				this._button.setPressed(false);
			}.bind(this)));
		}

		menu.addItem(new MenuItem({
			text: sap.ui.vk.getResourceBundle().getText("PREDEFINED_VIEW_FRONT"),
			startsSection: this.oParent.getEnableInitialView()
		}).attachSelect(function() {
			this.setView(sap.ui.vk.tools.PredefinedView.Front, timeInterval);
			this._button.setPressed(false);
		}.bind(this)));
		menu.addItem(new MenuItem({
			text: sap.ui.vk.getResourceBundle().getText("PREDEFINED_VIEW_BACK")
		}).attachSelect(function() {
			this.setView(sap.ui.vk.tools.PredefinedView.Back, timeInterval);
			this._button.setPressed(false);
		}.bind(this)));
		menu.addItem(new MenuItem({
			text: sap.ui.vk.getResourceBundle().getText("PREDEFINED_VIEW_LEFT")
		}).attachSelect(function() {
			this.setView(sap.ui.vk.tools.PredefinedView.Left, timeInterval);
			this._button.setPressed(false);
		}.bind(this)));
		menu.addItem(new MenuItem({
			text: sap.ui.vk.getResourceBundle().getText("PREDEFINED_VIEW_RIGHT")
		}).attachSelect(function() {
			this.setView(sap.ui.vk.tools.PredefinedView.Right, timeInterval);
			this._button.setPressed(false);
		}.bind(this)));
		menu.addItem(new MenuItem({
			text: sap.ui.vk.getResourceBundle().getText("PREDEFINED_VIEW_TOP")
		}).attachSelect(function() {
			this.setView(sap.ui.vk.tools.PredefinedView.Top, timeInterval);
			this._button.setPressed(false);
		}.bind(this)));
		menu.addItem(new MenuItem({
			text: sap.ui.vk.getResourceBundle().getText("PREDEFINED_VIEW_BOTTOM")
		}).attachSelect(function() {
			this.setView(sap.ui.vk.tools.PredefinedView.Bottom, timeInterval);
			this._button.setPressed(false);
		}.bind(this)));
	};

	SceneOrientationToolGizmo.prototype.setView = function(view, milliseconds) {
		var quaternion;
		switch (view) {
			case sap.ui.vk.tools.PredefinedView.Initial:
				quaternion = null;
				break;
			case sap.ui.vk.tools.PredefinedView.Front:
				quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
				break;
			case sap.ui.vk.tools.PredefinedView.Back:
				quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
				break;
			case sap.ui.vk.tools.PredefinedView.Left:
				quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
				break;
			case sap.ui.vk.tools.PredefinedView.Right:
				quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
				break;
			case sap.ui.vk.tools.PredefinedView.Top:
				quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
				break;
			case sap.ui.vk.tools.PredefinedView.Bottom:
				quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
				break;
			default:
				return this;
		}

		this._viewport._viewportGestureHandler.setView(quaternion, milliseconds || 0);
		return this;
	};

	SceneOrientationToolGizmo.prototype.render = function(viewport) {
		this._viewport = viewport;
		this._camera.quaternion.copy(viewport.getCamera().getCameraRef().quaternion);
		this._camera.position.set(0, 0, 1).applyQuaternion(this._camera.quaternion);
		var width = this._renderer.getSize().width;
		this._updateAxisTitles(this._axisTitles, this._scene, this._camera, width * 0.45, 2 / width);
		this._renderer.render(this._scene, this._camera);
	};

	SceneOrientationToolGizmo.prototype.onBeforeRendering = function() {
	};

	SceneOrientationToolGizmo.prototype.onAfterRendering = function() {
		var domRef = this.getDomRef();
		this._renderer.setSize(domRef.clientWidth, domRef.clientHeight);
		// domRef.insertBefore(this._renderer.domElement, this._button.getDomRef());
		domRef.appendChild(this._renderer.domElement);
		// domRef.style.display = this._viewport ? "block" : "none";
	};

	return SceneOrientationToolGizmo;

}, /* bExport= */ true);
