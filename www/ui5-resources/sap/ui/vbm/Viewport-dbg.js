/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5) (c) Copyright 2009-2012 SAP AG. All rights reserved
 */

sap.ui.define([
	"sap/ui/core/Control",
	"jquery.sap.global",
	"sap/ui/core/ResizeHandler",
	"./adapter3d/thirdparty/three",
	"./adapter3d/thirdparty/OrbitControls",
	"./library"
], function (Control, jQuery, ResizeHandler, THREE, OrbitControls, library) {
	"use strict";

	/**
	 *  Constructor for a new three js viewport for Adapter3D.
	 *
	 * @class Provides a control for three js canvas.
	 *
	 * @public
	 * @author SAP SE
	 * @version 1.56.5
	 * @extends sap.ui.core.Control
	 * @alias sap.ui.vbm.Viewport
	 */
	var Viewport = Control.extend("sap.ui.vbm.Viewport", /** @lends sap.ui.vbm.Viewport.prototype **/ {
		metadata: {
			library: "sap.ui.vbm",

			properties: {
				/**
				 * Viewport width
				 */
				width: {
					type: "sap.ui.core.CSSSize",
					defaultValue: "100%"
				},

				/**
				 * Viewport height
				 */
				height: {
					type: "sap.ui.core.CSSSize",
					defaultValue: "100%"
				}
			}
		}
	});

	var basePrototype = Viewport.getMetadata().getParent().getClass().prototype;

	Viewport.prototype.init = function () {
		if (basePrototype.init) {
			basePrototype.init.call(this);
		}

		this._resizeListenerId = null;
		this._renderLoopRequestId = 0;
		this._renderLoopFunction = this._renderLoop.bind(this);

		this._renderer = new THREE.WebGLRenderer({antialias: true});
		this._renderer.setPixelRatio(window.devicePixelRatio);
		this._renderer.shadowMap.enabled = true;
		this._renderer.domElement.tabIndex = -1;
		this._renderer.domElement.id = this.getId() + "-canvas"; // give canvas Id so it can be found and used in custom app

		this._scene = new THREE.Scene();
		this._root = new THREE.Group();

		this._root.scale.set(-1, 1, 1); // mirror entire geometry along X to reflect differences between ActiveX coordinate system and ThreeJS coordinate system
		this._root.rotateX(THREE.Math.degToRad(90)); // and rotate also to make sure Y is up so OrbitControls is working fine
		this._scene.add(this._root);

		// Show scene axes, X - red, Y - green, Z - blue
		// this._scene.add(new THREE.AxisHelper(10));

		this._scene.background = new THREE.Color( 'white' ); // set background as in ActiveX version

		var ambientLight = new THREE.AmbientLight(0x202020, 1);
		this._scene.add(ambientLight);

		// CAD optimized, fixed light #1
		var light_1 = new THREE.DirectionalLight(0x333333, 1);
		light_1.position.set(0, 0, -1);
		this._scene.add(light_1);

		// CAD optimized, fixed light #2
		var light_2 = new THREE.DirectionalLight(0x51515b, 1);
		light_2.position.set(-2, -1.1, 2.5);
		this._scene.add(light_2);

		// CAD optimized, fixed light #3
		var light_3 = new THREE.DirectionalLight(0x5b5b5b, 2);
		light_3.position.set(2, 1.5, 0.5);
		this._scene.add(light_3);

		// light from camera
		this._light = new THREE.DirectionalLight(0xEEEEEE, 1);
		this._lightPos = new THREE.Vector3(0, 0, 0);
		this._scene.add(this._light);

		this._camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 2000);
		this._scene.add(this._camera);
		this._camera.position.set(0, 30, 30);
		this._camera.lookAt(new THREE.Vector3(0, 0, 0));

		this._cameraController = new OrbitControls(this._camera, this._renderer.domElement);
		this._cameraController.addEventListener("change", this._cameraHandler);
		this._cameraController.update();
	};

	Viewport.prototype.exit = function () {

		if (this._resizeListenerId) {
			ResizeHandler.deregister(this._resizeListenerId);
			this._resizeListenerId = null;
		}

		this._stopRenderLoop();

		this._scene = null;
		this._camera = null;
		this._renderer = null;

		if (basePrototype.exit) {
			basePrototype.exit.call(this);
		}
	};

	Viewport.prototype.getRoot = function() {
		return this._root;
	};

	Viewport.prototype.getScene = function() {
		return this._scene;
	};

	Viewport.prototype.getCamera = function() {
		return this._camera;
	};

	Viewport.prototype.getCameraController = function() {
		return this._cameraController;
	};

	// Three JS world coordinate to screen coordinate
	Viewport.prototype.worldToScreen = function(point) {
		var element = this.getDomRef();

		if (!element) { //no rendered yet -> cannot reproject
			return undefined;
		}
		var rect = element.getBoundingClientRect();
		var camera = this.getCamera();
		var matViewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, new THREE.Matrix4().getInverse(camera.matrixWorld));
		var sp = point.clone().applyMatrix4(matViewProj);
		var x = Math.floor((+sp.x * 0.5 + 0.5) * rect.width  + 0.5);
		var y = Math.floor((-sp.y * 0.5 + 0.5) * rect.height + 0.5);

		return new THREE.Vector2(x, y);
	};

	Viewport.prototype._cameraHandler = function (event) {
		// console.log(event.STATE);
	};

	Viewport.prototype._handleResize = function (event) {
		if (!this._camera || !this._renderer) {
			return false;
		}

		var width = event.size.width;
		var height = event.size.height;

		if (this._camera) {
			this._camera.aspect = width / height;
			this._camera.updateProjectionMatrix();
		}

		this._renderer.setSize(width, height, false);
	};

	Viewport.prototype._renderLoop = function () {
		this._cameraController.update();

		// update direction of light based on camera
		this._camera.getWorldDirection(this._lightPos);
		this._lightPos.negate();
		this._light.position.copy(this._lightPos);

		this._renderer.render(this._scene, this._camera);
		this._renderLoopRequestId = window.requestAnimationFrame(this._renderLoopFunction);
	};

	Viewport.prototype.onBeforeRendering = function() {
		if (this._resizeListenerId) {
			ResizeHandler.deregister(this._resizeListenerId);
			this._resizeListenerId = null;
		}

		this._stopRenderLoop();
	};

	Viewport.prototype.onAfterRendering = function () {
		var domRef = this.getDomRef();
		domRef.appendChild(this._renderer.domElement);

		this._resizeListenerId = ResizeHandler.register(this, this._handleResize.bind(this));

		this._handleResize({
			size: {
				width: domRef.clientWidth,
				height: domRef.clientHeight
			}
		});

		this._startRenderLoop();
	};

	Viewport.prototype._startRenderLoop = function () {
		if (!this._renderLoopRequestId) {
			this._renderLoopRequestId = window.requestAnimationFrame(this._renderLoopFunction);
		}
		return this;
	};

	Viewport.prototype._stopRenderLoop = function() {
		if (this._renderLoopRequestId) {
			window.cancelAnimationFrame(this._renderLoopRequestId);
			this._renderLoopRequestId = 0;
		}
		return this;
	};

	return Viewport;
});
