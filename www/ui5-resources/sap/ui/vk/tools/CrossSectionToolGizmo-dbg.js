/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

// Provides control sap.ui.vk.tools.CrossSectionToolGizmo
sap.ui.define([
	"jquery.sap.global", "./library", "./Gizmo"
], function(jQuery, library, Gizmo) {
	"use strict";

	/**
	 * Constructor for a new CrossSectionToolGizmo.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Provides handles for moving cross section tool
	 * @extends sap.ui.core.Control
	 *
	 * @author SAP SE
	 * @version 1.56.12
	 *
	 * @constructor
	 * @public
	 * @alias sap.ui.vk.tools.CrossSectionToolGizmo
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 * @experimental Since 1.52.0 This class is experimental and might be modified or removed in future versions.
	 */
	var CrossSectionToolGizmo = Gizmo.extend("sap.ui.vk.tools.CrossSectionToolGizmo", /** @lends sap.ui.vk.tools.CrossSectionToolGizmo.prototype */ {
		metadata: {
			library: "sap.ui.vk.tools"
		}
	});

	CrossSectionToolGizmo.prototype.init = function() {
		if (Gizmo.prototype.init) {
			Gizmo.prototype.init.apply(this);
		}

		this._viewport = null;
		this._tool = null;
		this._position = new THREE.Vector3(0, 0, 0);
		this._plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
		this._flip = false;
		this._matViewProj = new THREE.Matrix4();
		this._pos4 = new THREE.Vector4();
		this._gizmoSize = 144;

		this.setAxis(0);
	};

	CrossSectionToolGizmo.prototype.hasDomElement = function() {
		return false;
	};

	CrossSectionToolGizmo.prototype.show = function(viewport, tool) {
		this._viewport = viewport;
		this._tool = tool;
		var bbox = viewport._scene._computeBoundingBox();
		this._position.copy(bbox.getCenter());
		this._plane.constant = -this._plane.normal.dot(this._position);
		viewport.setClippingPlanes([ this._plane ]);
	};

	CrossSectionToolGizmo.prototype.hide = function() {
		if (this._viewport) {
			this._viewport.setClippingPlanes([]);
			this._viewport = null;
		}
		this._tool = null;
	};

	CrossSectionToolGizmo.prototype._getOffset = function() {
		return this._position.getComponent(this._axis);
	};

	CrossSectionToolGizmo.prototype.getAxis = function() {
		return this._axis;
	};

	CrossSectionToolGizmo.prototype.setAxis = function(i) {
		this._axis = i;
		var dir = new THREE.Vector3().setComponent(i, 1);
		this._plane.normal.set(0, 0, 0).setComponent(i, this._flip ? -1 : 1);
		this._plane.constant = -this._plane.normal.dot(this._position);

		var geometry = new THREE.BufferGeometry();
		var vertices = new Array(15);
		var dirX = new THREE.Vector3(dir.y, dir.z, dir.x),
			dirY = new THREE.Vector3(dir.z, dir.x, dir.y),
			p = new THREE.Vector3();
		p.sub(dirX).sub(dirY).multiplyScalar(0.5).toArray(vertices, 0);
		p.toArray(vertices, 12);
		p.add(dirX).toArray(vertices, 3);
		p.add(dirY).toArray(vertices, 6);
		p.sub(dirX).toArray(vertices, 9);
		geometry.addAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		this._gizmoPlane = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, linewidth: window.devicePixelRatio }));

		var arrowLength = 144,
			lineRadius = window.devicePixelRatio * 0.5,
			coneHeight = 32,
			coneRadius = 6,
			touchRadius = 48;
		dir = this._plane.normal.clone().multiplyScalar(1 / arrowLength);
		var color = 0xFF << (8 * (2 - i));
		var lineGeometry = new THREE.CylinderBufferGeometry(lineRadius, lineRadius, arrowLength - coneHeight, 4);
		var m = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir.y, dir.z, dir.x), dir, new THREE.Vector3(dir.z, dir.x, dir.y));
		m.setPosition(dir.clone().multiplyScalar((arrowLength - coneHeight) * 0.5));
		lineGeometry.applyMatrix(m);
		this._gizmoArrow = new THREE.Mesh(lineGeometry, new THREE.MeshBasicMaterial({ color: color }));
		this._gizmoArrow.userData.color = color;

		var coneGeometry = new THREE.CylinderBufferGeometry(0, coneRadius, coneHeight, 12, 1);
		m.setPosition(dir.clone().multiplyScalar(arrowLength - coneHeight * 0.5));
		coneGeometry.applyMatrix(m);
		var cone = new THREE.Mesh(coneGeometry, new THREE.MeshBasicMaterial({ color: color }));
		cone.matrixAutoUpdate = false;
		this._gizmoArrow.add(cone);

		var touchGeometry = new THREE.CylinderGeometry(touchRadius * 0.5, touchRadius * 0.5, arrowLength, 12, 1);
		m.setPosition(dir.clone().multiplyScalar(arrowLength * 0.5));
		touchGeometry.applyMatrix(m);
		this._touchMesh = new THREE.Mesh(touchGeometry, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
		this._gizmoArrow.add(this._touchMesh);

		if (this._viewport) {
			this._viewport.setShouldRenderFrame();
		}
		return this;
	};

	CrossSectionToolGizmo.prototype.setFlip = function(flip) {
		this._flip = !!flip;
		this.setAxis(this._axis);
		return this;
	};

	CrossSectionToolGizmo.prototype.getTouchObject = function() {
		return this._touchMesh;
	};

	CrossSectionToolGizmo.prototype._setOffset = function(offset) {
		var bbox = this._viewport._scene._computeBoundingBox();
		offset = THREE.Math.clamp(offset, bbox.min.getComponent(this._axis), bbox.max.getComponent(this._axis));
		this._position.setComponent(this._axis, offset);
		this._plane.constant = -this._plane.normal.dot(this._position);
		this._viewport.setShouldRenderFrame();
	};

	CrossSectionToolGizmo.prototype.highlightArrowHandle = function(highlight) {
		var color = highlight ? 0xFFFF00 : this._gizmoArrow.userData.color;
		this._gizmoArrow.material.color.setHex(color); // arrow line color
		this._gizmoArrow.children[ 0 ].material.color.setHex(color); // arrow cone color
	};

	CrossSectionToolGizmo.prototype._adjustBoundingBox = function(boundingBox) {
		var size = boundingBox.getSize();
		var delta = Math.max(size.x, size.y, size.z) * 0.2;
		boundingBox.expandByScalar(delta);
	};

	CrossSectionToolGizmo.prototype._updateGizmo = function(bbox) {
		var i = this._axis;
		var offset = THREE.Math.clamp(this._position.getComponent(i), bbox.min.getComponent(i), bbox.max.getComponent(i));
		this._position.setComponent(i, offset);
		this._plane.constant = -this._plane.normal.dot(this._position);

		this._adjustBoundingBox(bbox);

		this._gizmoPlane.position.copy(bbox.getCenter());
		this._gizmoPlane.position.setComponent(i, offset);
		this._gizmoPlane.scale.copy(bbox.getSize());
		this._gizmoPlane.updateMatrixWorld(true);

		var renderer = this._viewport.getRenderer(),
			camera = this._viewport.getCamera().getCameraRef();
		this._gizmoArrow.position.copy(this._gizmoPlane.position);
		this._matViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		this._pos4.copy(this._gizmoArrow.position).applyMatrix4(this._matViewProj);
		var scale = this._gizmoSize * this._pos4.w * renderer.getPixelRatio() / (renderer.getSize().width * camera.projectionMatrix.elements[ 0 ]);
		this._gizmoArrow.scale.setScalar(scale);
		this._gizmoArrow.updateMatrixWorld(true);
	};

	CrossSectionToolGizmo.prototype.expandBoundingBox = function(boundingBox) {
		if (this._viewport) {
			var sceneBoundingBox = this._viewport._scene._computeBoundingBox();
			this._updateGizmo(sceneBoundingBox);
			boundingBox.min.min(sceneBoundingBox.min);
			boundingBox.max.max(sceneBoundingBox.max);
			boundingBox.expandByPoint(this._plane.normal.clone().multiply(this._gizmoArrow.scale).add(this._gizmoArrow.position));
		}
	};

	CrossSectionToolGizmo.prototype.render = function() {
		jQuery.sap.assert(this._viewport && this._viewport.getMetadata().getName() === "sap.ui.vk.threejs.Viewport", "Can't render gizmo without sap.ui.vk.threejs.Viewport");

		var sceneBoundingBox = this._viewport._scene._computeBoundingBox();
		this._updateGizmo(sceneBoundingBox);

		var renderer = this._viewport.getRenderer(),
			camera = this._viewport.getCamera().getCameraRef();

		renderer.render(this._gizmoPlane, camera);
		renderer.clearDepth();
		renderer.render(this._gizmoArrow, camera);
	};

	CrossSectionToolGizmo.prototype.onBeforeRendering = function() {
		jQuery.sap.assert(false, "CrossSectionToolGizmo.onBeforeRendering");
	};

	CrossSectionToolGizmo.prototype.onAfterRendering = function() {
		jQuery.sap.assert(false, "CrossSectionToolGizmo.onAfterRendering");
	};

	return CrossSectionToolGizmo;

}, /* bExport= */ true);
