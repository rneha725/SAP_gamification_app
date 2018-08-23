/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */
// Provides control sap.ui.vk.threejs.Viewport.
sap.ui.define([
	"jquery.sap.global", "../library", "../ViewportBase", "sap/ui/core/ResizeHandler", "../Loco",
	"./thirdparty/three", "../ContentConnector", "../ViewStateManager", "./ViewportGestureHandler",
	"./OrthographicCamera", "./PerspectiveCamera", "./NodesTransitionHelper", "../Messages"
], function(
	jQuery, library, ViewportBase, ResizeHandler, Loco,
	threeJs, ContentConnector, ViewStateManager, ViewportGestureHandler,
	OrthographicCamera, PerspectiveCamera, NodesTransitionHelper, Messages
) {
		"use strict";

		/**
		 *  Constructor for a new three js viewport.
		 *
		 * @class Provides a base class control for three js canvas.
		 *
		 * @public
		 * @author SAP SE
		 * @version 1.56.12
		 * @extends sap.ui.vk.ViewportBase
		 * @alias sap.ui.vk.threejs.Viewport
		 * @experimental Since 1.50.0 This class is experimental and might be modified or removed in future versions.
		 */
		var Viewport = ViewportBase.extend("sap.ui.vk.threejs.Viewport", /** @lends sap.ui.vk.threejs.Viewport.prototype  */ {
			metadata: {
				library: "sap.ui.vk",

				properties: {
					/**
					 * Viewport render mode
					 */
					renderMode: {
						type: "sap.ui.vk.RenderMode",
						defaultValue: "default"
					}
				},

				events: {
					cameraChanged: {
						parameters: {
							/**
							 * Returns a new camera position.
							 */
							position: "float[]",
							/**
							 * Returns a new camera rotation quaternion.
							 */
							quaternion: "float[]",
							/**
							 * Returns a new camera orthographic zoom factor.
							 */
							zoom: "float"
						},
						enableEventBubbling: true
					}
				}
			}
		});

		var basePrototype = Viewport.getMetadata().getParent().getClass().prototype;

		Viewport.prototype.init = function() {

			if (basePrototype.init) {
				basePrototype.init.call(this);
			}

			this._resizeListenerId = null;
			this._renderLoopRequestId = 0;
			this._renderLoopFunction = this._renderLoop.bind(this);
			this._shouldRenderFrame = true;
			this._clippingPlanes = [];

			this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
			this._renderer.setPixelRatio(window.devicePixelRatio);
			this._renderer.setSize(1, 1); // set dummy size, resize event will correct this later
			this._renderer.shadowMap.enabled = true;

			// this._camera = new sap.ui.vk.threejs.OrthographicCamera();
			this._camera = new sap.ui.vk.threejs.PerspectiveCamera();

			var backgroundVertexShader = [
				"varying float vPos;",
				"void main() {",
				"	gl_Position = vec4(position, 1.0);",
				"	vPos = position.y * -0.5 + 0.5;",
				"}"
			].join("\n");

			var backgroundFragmentShader = [
				"uniform vec4 topColor;",
				"uniform vec4 bottomColor;",
				"varying float vPos;",
				"void main() {",
				"	gl_FragColor = mix(topColor, bottomColor, vPos);",
				"}"
			].join("\n");

			var backgroundColorTop = new THREE.Vector4();
			var backgroundColorBottom = new THREE.Vector4();
			this._updateColor(backgroundColorTop, this.getBackgroundColorTop());
			this._updateColor(backgroundColorBottom, this.getBackgroundColorBottom());
			this._checkBackgroundColor();

			this._backgroundMaterial = new THREE.ShaderMaterial({
				uniforms: {
					topColor: { value: backgroundColorTop },
					bottomColor: { value: backgroundColorBottom }
				},
				vertexShader: backgroundVertexShader,
				fragmentShader: backgroundFragmentShader,
				side: THREE.DoubleSide,
				depthTest: false,
				depthWrite: false,
				blending: THREE.NoBlending
			});

			var backgroundGeometry = new THREE.Geometry();
			backgroundGeometry.vertices.push(
				new THREE.Vector3(-1, 1, 0),
				new THREE.Vector3(1, 1, 0),
				new THREE.Vector3(-1, -1, 0),
				new THREE.Vector3(1, -1, 0)
			);
			backgroundGeometry.faces.push(new THREE.Face3(0, 2, 1), new THREE.Face3(1, 2, 3));

			this._backgroundCamera = new THREE.Camera();
			this._backgroundScene = new THREE.Scene();
			this._backgroundScene.add(new THREE.Mesh(backgroundGeometry, this._backgroundMaterial));

			var xrayVertexShader = [
				"#include <clipping_planes_pars_vertex>",
				"varying vec3 vNormal;",
				"void main() {",
				"#include <begin_vertex>",
				"#include <project_vertex>",
				"#include <clipping_planes_vertex>",
				"#include <beginnormal_vertex>",
				"#include <defaultnormal_vertex>",
				"	vNormal = normalize( transformedNormal );",
				"}"
			].join("\n");

			var xrayFragmentShader = [
				"#include <clipping_planes_pars_fragment>",
				"uniform vec4 color1;",
				"uniform vec4 color2;",
				"varying vec3 vNormal;",
				"void main() {",
				"#include <clipping_planes_fragment>",
				"	gl_FragColor = mix(color1, color2, abs(normalize(vNormal).z));",
				"}"
			].join("\n");

			this._xrayColor1 = new THREE.Vector4(0, 0.75, 1, 0.45);
			this._xrayColor2 = new THREE.Vector4(0, 0, 1, 0);
			this._xrayMaterial = new THREE.ShaderMaterial({
				uniforms: {
					color1: { value: this._xrayColor1 },
					color2: { value: this._xrayColor2 }
				},
				vertexShader: xrayVertexShader,
				fragmentShader: xrayFragmentShader,
				side: THREE.DoubleSide,
				// depthTest: false,
				depthWrite: false,
				depthFunc: THREE.LessDepth,
				blending: THREE.NormalBlending,
				clipping: true,
				transparent: true
			});

			this._viewportGestureHandler = new ViewportGestureHandler(this);

			this._loco = new Loco();
			this._loco.addHandler(this._viewportGestureHandler);

			this._zoomedObject = null;
			this._nodesTransitionHelper = new NodesTransitionHelper();
			this._nodesTransitionHelper.setViewport(this);

			this._cdsLoader = null;

			this.attachCameraChanged(function(event) {
				this.setShouldRenderFrame();
			});
		};

		Viewport.prototype.exit = function() {
			this._loco.removeHandler(this._viewportGestureHandler);
			this._viewportGestureHandler.destroy();

			if (this._resizeListenerId) {
				ResizeHandler.deregister(this._resizeListenerId);
				this._resizeListenerId = null;
			}

			this._stopRenderLoop();

			this.setScene(null);
			this.setCamera(null);
			this._renderer = null;
			this._backgroundCamera = null;
			this._backgroundMaterial = null;
			this._backgroundScene = null;
			this._loco = null;
			this._viewportGestureHandler = null;

			if (this._cdsLoader) {
				this._cdsLoader.detachSceneUpdated(this._handleCdsSceneUpdate, this);
			}

			if (basePrototype.exit) {
				basePrototype.exit.call(this);
			}
		};

		/**
		 * Starts the render loop.
		 * @returns {sap.ui.vk.threejs.Viewport} <code>this</code> to allow method chaining.
		 * @private
		 */
		Viewport.prototype._startRenderLoop = function() {
			if (!this._renderLoopRequestId) {
				this._renderLoopRequestId = window.requestAnimationFrame(this._renderLoopFunction);
			}
			return this;
		};

		/**
		 * Stops the render loop.
		 * @returns {sap.ui.vk.threejs.Viewport} <code>this</code> to allow method chaining.
		 * @private
		 */
		Viewport.prototype._stopRenderLoop = function() {
			if (this._renderLoopRequestId) {
				window.cancelAnimationFrame(this._renderLoopRequestId);
				this._renderLoopRequestId = 0;
			}
			return this;
		};

		Viewport.prototype.setBackgroundColorTop = function(value) {
			basePrototype.setBackgroundColorTop.call(this, value);

			if (this._backgroundMaterial !== null){
				this._updateColor(this._backgroundMaterial.uniforms.topColor.value, value);
				this._checkBackgroundColor();
			}

			return this;
		};

		Viewport.prototype.setBackgroundColorBottom = function(value) {
			basePrototype.setBackgroundColorBottom.call(this, value);

			if (this._backgroundMaterial !== null){
				this._updateColor(this._backgroundMaterial.uniforms.bottomColor.value, value);
				this._checkBackgroundColor();
			}
			return this;
		};

		Viewport.prototype.setClippingPlanes = function(clippingPlanes) {
			this._clippingPlanes = clippingPlanes;
			return this;
		};

		Viewport.prototype.onBeforeRendering = function() {
			if (this._resizeListenerId) {
				ResizeHandler.deregister(this._resizeListenerId);
				this._resizeListenerId = null;
			}

			this._stopRenderLoop();
		};

		Viewport.prototype.onAfterRendering = function() {
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

		Viewport.prototype._handleResize = function(event) {

			if (!this._camera || !this._renderer) {
				// nothing to do
				return false;
			}

			var width = event.size.width;
			var height = event.size.height;

			if (this._camera) {
				this._camera.update(width, height);
			}

			this._renderer.setSize(width, height);

			this.fireResize({
				size: {
					width: width,
					height: height
				}
			});

			this.setShouldRenderFrame();

			return true;

		};

		/**
		* Attaches the scene to the Viewport for rendering.
		* @param {sap.ui.vk.threejs.Scene} scene The scene to attach to the Viewport.
		* @returns {sap.ui.vk.threejs.Viewport}<code>this</code> to allow method chaining.
		* @public
		*/
		Viewport.prototype.setScene = function(scene) {
			this._scene = scene;
			this._homeCamera = null; // remove previous home camera

			var nativeScene = this._scene ? this._scene.getSceneRef() : undefined;
			if (nativeScene) {

				// we create the scene and assume we have lights. Grab 1st one so we do 'CAD optimize light'
				// Basically light at your eye position
				var group;
				for (var i = 0; i < nativeScene.children.length; i++) {
					group = nativeScene.children[ i ];
					if (group.private && group.name === "DefaultLights" && group.children.length) {
						if (group.children[0] instanceof THREE.PointLight) {
							this._eyePointLight = group.children[0];
						}
					}
				}
			}

			this.setShouldRenderFrame();

			return this;
		};

		/**
		* Gets the Viewport Scene
		* @returns {sap.ui.vk.threejs.Scene} returns Scene
		* @public
		*/
		Viewport.prototype.getScene = function() {
			return this._scene;
		};

		/**
		* Sets the camera for the Viewport
		* @param {sap.ui.vk.Camera} camera parameter
		* @returns {sap.ui.vk.threejs.Viewport} <code>this</code> to allow method chaining.
		* @public
		*/
		Viewport.prototype.setCamera = function(camera) {

			if (basePrototype.setCamera) {
				basePrototype.setCamera.call(this, camera);
			}

			var cam = this.getCamera();
			if (cam && this._renderer) {
				var size = this._renderer.getSize();
				cam.update(size.width, size.height);

				if (!this._homeCamera && cam.getCameraRef()) {
					this._homeCamera = cam.getCameraRef().clone(); // set home camera
				}
			}

			this.setShouldRenderFrame();

			return this;
		};

		Viewport.prototype.getRenderer = function() {
			return this._renderer;
		};

		Viewport.prototype._getViewStateManagerThreeJS = function() {
			if (this._viewStateManager) {
				if (this._viewStateManager.constructor === sap.ui.vk.threejs.ViewStateManager) {
					return this._viewStateManager;
				}
				if (this._viewStateManager.constructor === sap.ui.vk.ViewStateManager &&
					this._viewStateManager._implementation.constructor === sap.ui.vk.threejs.ViewStateManager) {
					return this._viewStateManager._implementation;
				}
			}
			return null;
		};

		Viewport.prototype._updateBoundingBoxesIfNeeded = function() {
			var vsm = this._getViewStateManagerThreeJS();
			if (vsm) {
				vsm._updateBoundingBoxesIfNeeded();
			}
		};

		/**
		 * @param {THREE.Vector4} destColor The destination color object.
		 * @param {number} cssColor The sap.ui.core.CSSColor color to be decomposed into RGBA.
		 * @private
		 */
		Viewport.prototype._updateColor = function(destColor, cssColor) {
			var color = sap.ui.vk.cssColorToColor(cssColor);
			destColor.color = new THREE.Color(color.red / 255, color.green / 255, color.blue / 255);
			destColor.alpha = color.alpha;
			destColor.x = destColor.color.r * destColor.alpha;
			destColor.y = destColor.color.g * destColor.alpha;
			destColor.z = destColor.color.b * destColor.alpha;
			destColor.w = destColor.alpha;
		};

		Viewport.prototype._checkBackgroundColor = function() {
			var colorTop = this.getBackgroundColorTop();
			if (colorTop === this.getBackgroundColorBottom()) {
				if (this._backgroundColor === null) {
					this._backgroundColor = new THREE.Vector4();
				}

				this._updateColor(this._backgroundColor, colorTop);
			} else {
				this._backgroundColor = null;
			}

			this.setShouldRenderFrame();
		};

		Viewport.prototype._handleCdsSceneUpdate = function() {
			this.setShouldRenderFrame();
		};

		/**
		 * @returns {sap.ui.vk.threejs.Viewport} <code>this</code> to allow method chaining.
		 * @protected
		 */
		Viewport.prototype.setShouldRenderFrame = function() {
			this._shouldRenderFrame = true;
			return this;
		};

		/**
		 * @returns {bool} It returns <code>true</code> or <code>false</code> whether the frame should be rendered or not.
		 * @experimental
		*/
		Viewport.prototype.shouldRenderFrame = function() {
			return this._shouldRenderFrame;
		};

		/**
		* Performs a screen-space hit test and gets the hit node reference, it must be called between beginGesture() and endGesture()
		*
		* @param {int} x: x coordinate in viewport to perform hit test
		* @param {int} y: y coordinate in viewport to perform hit test
		* @returns {object} object under the viewport coordinates (x, y).
		* @experimental
		*/
		Viewport.prototype.hitTest = function(x, y) {
			var nativeScene = this._scene ? this._scene.getSceneRef() : undefined;
			var nativeCamera = this._camera ? this._camera.getCameraRef() : undefined;
			if (!nativeCamera || !nativeScene) {
				return null;
			}

			var element = this._renderer.domElement;
			var mouse = new THREE.Vector2((x  - element.clientLeft) / element.clientWidth * 2 - 1,
				(element.clientTop - y) / element.clientHeight * 2 + 1);
			var raycaster = new THREE.Raycaster();

			raycaster.setFromCamera(mouse, nativeCamera);

			if (this._clippingPlanes) {
				for (var i in this._clippingPlanes) {
					var plane = this._clippingPlanes[i];
					var dist = plane.distanceToPoint(raycaster.ray.origin),
						t = -dist / plane.normal.dot(raycaster.ray.direction);
					if (t > 0) {
						if (dist < 0) {
							raycaster.near = Math.max(raycaster.near, t);
						} else {
							raycaster.far = Math.min(raycaster.far, t);
						}
					} else if (dist < 0) {
						return null;
					}
				}
			}

			var intersects = raycaster.intersectObjects(nativeScene.children, true);

			if (intersects && intersects.length) {
				var result = intersects[ 0 ];
				if (!result.object.name && result.object.children.length === 0) {
					result.object = result.object.parent;
				}
				return result;
			}

			return null;
		};

		/**
		 * Executes a click or tap gesture.
		 *
		 * @param {int} x The tap gesture's x-coordinate.
		 * @param {int} y The tap gesture's y-coordinate.
		 * @param {boolean} isDoubleClick Indicates whether the tap gesture should be interpreted as a double-click. A value of <code>true</code> indicates a double-click gesture, and <code>false</code> indicates a single click gesture.
		 * @returns {sap.ui.vk.threejs.Viewport} this
		 */
		Viewport.prototype.tap = function(x, y, isDoubleClick) {

			if (!isDoubleClick) {
				if (this._viewStateManager) {
					var hit = this.hitTest(x, y); // NB: pass (x, y) in CSS pixels, hitTest will convert them to device pixels.

					var node = hit && hit.object;

					var parameters = {
						picked: node ? [ node ] : []
					};
					this.fireNodesPicked(parameters);

					if (this.getSelectionMode() === sap.ui.vk.SelectionMode.Exclusive) {
						this.exclusiveSelectionHandler(parameters.picked);
					} else if (this.getSelectionMode() === sap.ui.vk.SelectionMode.Sticky) {
						this.stickySelectionHandler(parameters.picked);
					}

					if (node !== null) {
						this.fireNodeClicked({ nodeRef: node, x: x, y: y }, true, true);
					}
				}
			} else {
				var hitForDB = this.hitTest(x, y);

				if (hitForDB && (this._zoomedObject === null || this._zoomedObject !== hitForDB.object)) {// doubleclick on new object
					this._zoomedObject = hitForDB.object;
					this._viewportGestureHandler.zoomObject(this._zoomedObject, true);
				} else { // doubleclick on previously doubleclicked object, or on empty space
					this._viewportGestureHandler.zoomObject(this._zoomedObject, false);
					this._zoomedObject = null;
				}
			}
			return this;
		};

		////////////////////////////////////////////////////////////////////////
		// Keyboard handling begins.

		var offscreenPosition = { x: -2, y: -2 };
		var rotateDelta = 2;
		var panDelta = 5;

		[
			{ key: "left", dx: -rotateDelta, dy: 0 },
			{ key: "right", dx: +rotateDelta, dy: 0 },
			{ key: "up", dx: 0, dy: -rotateDelta },
			{ key: "down", dx: 0, dy: +rotateDelta }
		].forEach(function(item) {
			Viewport.prototype[ "onsap" + item.key ] = function(event) {
				var cameraController = this._viewportGestureHandler._cameraController;
				cameraController.beginGesture(offscreenPosition.x, offscreenPosition.y);
				cameraController.rotate(item.dx, item.dy, true);
				cameraController.endGesture();
				this.setShouldRenderFrame();
				event.preventDefault();
				event.stopPropagation();
			};
		});

		[
			{ key: "left", dx: -panDelta, dy: 0 },
			{ key: "right", dx: +panDelta, dy: 0 },
			{ key: "up", dx: 0, dy: -panDelta },
			{ key: "down", dx: 0, dy: +panDelta }
		].forEach(function(item) {
			Viewport.prototype[ "onsap" + item.key + "modifiers" ] = function(event) {
				if (event.shiftKey && !(event.ctrlKey || event.altKey || event.metaKey)) {
					var cameraController = this._viewportGestureHandler._cameraController;
					cameraController.beginGesture(offscreenPosition.x, offscreenPosition.y);
					cameraController.pan(item.dx, item.dy);
					cameraController.endGesture();
					this.setShouldRenderFrame();
					event.preventDefault();
					event.stopPropagation();
				}
			};
		});

		[
			{ key: "minus", d: 0.98 },
			{ key: "plus", d: 1.02 }
		].forEach(function(item) {
			Viewport.prototype[ "onsap" + item.key ] = function(event) {
				var cameraController = this._viewportGestureHandler._cameraController;
				cameraController.beginGesture(this.$().width() / 2, this.$().height() / 2);
				cameraController.zoom(item.d);
				cameraController.endGesture();
				this.setShouldRenderFrame();
				event.preventDefault();
				event.stopPropagation();
			};
		});

		// Keyboard handling ends.
		////////////////////////////////////////////////////////////////////////

		Viewport.prototype._handleVisibilityChanged =
		Viewport.prototype._handleOpacityChanged =
		Viewport.prototype._handleTintColorChanged =
		Viewport.prototype._handleHighlightColorChanged =
			function(event) {
				this.setShouldRenderFrame();
			};

		Viewport.prototype._handleSelectionChanged =
			function(event) {
				var tools = this.getTools();
				for (var i = 0; i < tools.length; i++) { // loop over all oTools
					var tool = sap.ui.getCore().byId(tools[ i ]); // get control for associated control
					var gizmo = tool.getGizmoForContainer(this);
					if (gizmo && gizmo.handleSelectionChanged) {
						gizmo.handleSelectionChanged(event);
					}
				}
				this.setShouldRenderFrame();
			};

		Viewport.prototype.setSelectionRect = function(rect) {
			this.setShouldRenderFrame();

			if (!rect) {
				this._selectionRect = null;
				return;
			}

			var size = this._renderer.getSize();
			var x1 = (rect.x1 / size.width) * 2 - 1,
				y1 = (rect.y1 / size.height) * -2 + 1,
				x2 = (rect.x2 / size.width) * 2 - 1,
				y2 = (rect.y2 / size.height) * -2 + 1;

			if (!this._selectionRect) {
				var geom = new THREE.Geometry();
				geom.vertices.push(
					new THREE.Vector3(x1, y2, -1),
					new THREE.Vector3(x2, y2, -1),
					new THREE.Vector3(x2, y1, -1),
					new THREE.Vector3(x1, y1, -1)
				);
				this._selectionRect = new THREE.LineLoop(geom, new THREE.LineBasicMaterial({ color: 0xFFFF00, lineWidth: window.devicePixelRatio }));
			} else {
				var vertices = this._selectionRect.geometry.vertices;
				vertices[ 0 ].set(x1, y2, -1);
				vertices[ 1 ].set(x2, y2, -1);
				vertices[ 2 ].set(x2, y1, -1);
				vertices[ 3 ].set(x1, y1, -1);
				this._selectionRect.geometry.verticesNeedUpdate = true;
			}
		};

		Viewport.prototype._renderLoop = function() {
			if (!this._renderer || !this.getDomRef()) {// break render loop
				this._renderLoopRequestId = 0;
				return;
			}

			if (this._viewportGestureHandler) {
				this._viewportGestureHandler.animateCameraUpdate();
			}

			if (this._nodesTransitionHelper){
				this._nodesTransitionHelper.displayNodesMoving();
			}

			// move light to eye position
			var nativeCamera = this.getCamera() ? this.getCamera().getCameraRef() : undefined;
			if (this._eyePointLight && nativeCamera) {
				this._eyePointLight.position.copy(nativeCamera.position);
			}

			// onBefore Rendering callback?

			if (this._shouldRenderFrame) {
				this._shouldRenderFrame = false;
				this.render();
			}

			this._renderLoopRequestId = window.requestAnimationFrame(this._renderLoopFunction); // request next frame
		};

		Viewport.prototype.render = function() {
			var renderer = this._renderer;
			if (!renderer) {
				return;
			}

			renderer.autoClear = this._backgroundColor != null;
			if (renderer.autoClear) {
				renderer.setClearColor(this._backgroundColor.color, this._backgroundColor.alpha);
			} else {
				renderer.render(this._backgroundScene, this._backgroundCamera);
			}

			var nativeScene = this._scene ? this._scene.getSceneRef() : null;
			var nativeCamera = this._camera ? this._camera.getCameraRef() : null;

			if (!nativeScene || !nativeCamera) {
				return;
			}

			var tools = this.getTools();
			var i, tool, gizmo;

			if (this._camera.getUsingDefaultClipPlanes() || (nativeCamera.isOrthographicCamera && this._camera.getZoomNeedRecalculate())) {
				var boundingBox = this._scene._computeBoundingBox();
				if (!boundingBox.isEmpty()) {
					if (nativeCamera.isOrthographicCamera && this._camera.getZoomNeedRecalculate()) {
						this._camera.adjustZoom(boundingBox);
					}

					if (this._camera.getUsingDefaultClipPlanes()) {
						for (i = 0; i < tools.length; i++) { // loop over all oTools
							tool = sap.ui.getCore().byId(tools[ i ]); // get control for associated control
							gizmo = tool.getGizmoForContainer(this);
							if (gizmo && gizmo.expandBoundingBox) {
								gizmo.expandBoundingBox(boundingBox);
							}
						}

						this._camera.adjustClipPlanes(boundingBox);
					}
				}
			}

			var vsm = this._getViewStateManagerThreeJS();

			renderer.clippingPlanes = this._clippingPlanes;

			if (this.getRenderMode() === sap.ui.vk.RenderMode.XRay) {
				if (vsm) {
					var lightNode = nativeScene.children[ nativeScene.children.length - 1 ].clone();
					vsm._selectedNodes.forEach(function(node) {
						if (node.visible) {
							node.add(lightNode);
							renderer.render(node, nativeCamera);
							renderer.autoClear = false;
							node.remove(lightNode);
						}
					});
				}

				// this._xrayColor1.set(0, 0.75, 1, 0.45);
				// this._xrayColor2.set(0, 0, 1, 0);
				this._xrayColor1.w = 0.45;
				nativeScene.overrideMaterial = this._xrayMaterial;
			}

			renderer.render(nativeScene, nativeCamera);
			renderer.autoClear = false;
			renderer.clippingPlanes = [];
			nativeScene.overrideMaterial = null;

			if (vsm) {
				var boundingBoxesScene = vsm._boundingBoxesScene;
				if (boundingBoxesScene) {
					renderer.render(boundingBoxesScene, nativeCamera);
				}
			}

			for (i = 0; i < tools.length; i++) { // loop over all oTools
				tool = sap.ui.getCore().byId(tools[ i ]); // get control for associated control
				gizmo = tool.getGizmoForContainer(this);
				if (gizmo && gizmo.render) {
					gizmo.render(this);
				}
			}

			if (this._selectionRect) {
				renderer.render(this._selectionRect, this._backgroundCamera);
			}
		};

		/**
		 * Returns viewport content as an image of desired size.
		 *
		 * @param {int} width Requested image width in pixels. Allowed values are 8 to 2048, default is 16
		 * @param {int} height Requested image height in pixels. Allowed values are 8 to 2048, default is 16
		 * @param {string} topColor The sap.ui.core.CSSColor to be used for top background color
		 * @param {string} bottomColor The sap.ui.core.CSSColor to be used for bottom background color
		 * @returns {string} Base64 encoded PNG image
		 * @public
		 */
		Viewport.prototype.getImage = function(width, height, topColor, bottomColor) {
			if (this._scene === null) {
				return null;
			}

			width = width || 16;
			height = height || 16;

			if (width > 2048) {
				width = 2048;
			}

			if (height > 2048) {
				height = 2048;
			}

			var renderer = new THREE.WebGLRenderer({
				preserveDrawingBuffer: true
			});
			renderer.setSize(width, height);

			// Remember background colors
			var currentBKTop = this.getBackgroundColorTop();
			var currentBKBottom = this.getBackgroundColorBottom();

			if (topColor && !bottomColor) {
				// If only top color is provided use it as a solid color
				renderer.setClearColor(topColor, 1);
			} else if (!topColor && bottomColor) {
				// If only bottom color is provided use it as a solid color
				renderer.setClearColor(bottomColor, 1);
			} else {
				if (topColor && bottomColor) {
					this.setBackgroundColorTop(topColor);
					this.setBackgroundColorBottom(bottomColor);
				}

				renderer.render(this._backgroundScene, this._backgroundCamera);
				renderer.autoClear = false;
			}

			document.body.appendChild(renderer.domElement);

			// Don't mess with existing camera, create a clone
			var camera = this.getCamera().getCameraRef().clone();
			var aspect = width / height;
			if (camera.isOrthographicCamera) {
				var w = camera.right - camera.left;
				var h = camera.top - camera.bottom;
				if (w > h) {
					camera.top = w / aspect / 2;
					camera.bottom = -w / aspect / 2;
				} else {
					camera.left = -h * aspect / 2;
					camera.right = h * aspect / 2;
				}
			} else {
				// Calculate current horizontal FOV in degrees
				var hFovRad = 2 * Math.atan(camera.aspect * Math.tan(camera.fov * Math.PI / 360));

				// Compare horizontal with vertical FOV in degrees
				if (camera.fov < hFovRad * 180 / Math.PI) {
					// If horizontal FOV is greater then calculate new vertical FOV based on it and new aspect ratio
					camera.fov = 360 * Math.atan(Math.tan(hFovRad * 0.5) / aspect) / Math.PI;
				}
				camera.aspect = aspect;
			}
			camera.updateProjectionMatrix();

			// remove selection for snapshot
			var selectedNodes = [];
			var vsm = this._getViewStateManagerThreeJS();
			if (vsm !== null) {
				// make copy of current nodes selected
				vsm.enumerateSelection(function(node) {
					selectedNodes.push(node);
				});

				// unselect selected nodes
				vsm.setSelectionState(selectedNodes, false, false);
			}

			// capture snapshot
			renderer.render(this._scene.getSceneRef(), camera);
			var imageData = renderer.getContext().canvas.toDataURL();

			if (vsm !== null && selectedNodes.length > 0) {
				// add selection back for nodes that were originally selected
				vsm.setSelectionState(selectedNodes, true, false);
			}

			renderer.forceContextLoss();
			document.body.removeChild(renderer.domElement);

			if (currentBKBottom && topColor) {
				this.setBackgroundColorBottom(currentBKBottom);
			}
			if (currentBKTop && bottomColor) {
				this.setBackgroundColorTop(currentBKTop);
			}
			return imageData;
		};

		Viewport.prototype._setContent = function(content) {
			var scene;
			var camera;

			if (content) {
				scene = content;
				if (!(scene instanceof sap.ui.vk.threejs.Scene)) {
					scene = null;
				}
				camera = content.camera;
				if (!(camera instanceof sap.ui.vk.threejs.OrthographicCamera || camera instanceof sap.ui.vk.threejs.PerspectiveCamera)) {
					camera = null;
				}

				// if cds loaded this content, we need to attach some event for refreshing
				// this is because cds can update content after the scene is loaded
				// as cds streaming information from the server
				if (content.loaders) {
					for (var i = 0; i < content.loaders.length; i++) {
						if (content.loaders[i] instanceof sap.ui.vk.threejs.ContentDeliveryService) {
							this._cdsLoader = content.loaders[i]; // grab 1st one as we can only have one cds with scene atm
							this._cdsLoader.attachSceneUpdated(this._handleCdsSceneUpdate, this);
							break;
						}
					}
				}
			}

			this.setScene(scene);

			if (camera) { // camera is optional so only set it if exist
				this.setCamera(camera);
			}
		};

		Viewport.prototype._onAfterUpdateContentConnector = function() {
			this._setContent(this._contentConnector.getContent());

		};

		Viewport.prototype._onBeforeClearContentConnector = function() {

			if (basePrototype._onBeforeClearContentConnector) {
				basePrototype._onBeforeClearContentConnector.call(this);
			}
			this.setScene(null);
		};

		Viewport.prototype._handleContentReplaced = function(event) {
			var content = event.getParameter("newContent");
			this._setContent(content);

		};

		Viewport.prototype._onAfterUpdateViewStateManager = function() {
		};

		Viewport.prototype._onBeforeClearViewStateManager = function() {
		};

		ContentConnector.injectMethodsIntoClass(Viewport);
		ViewStateManager.injectMethodsIntoClass(Viewport);

		/**
		* Activates the view based on view object passed
		* @param {sap.ui.vk.View} view view object definition
		* @returns {sap.ui.vk.threejs.Viewport} returns this
		* @public
		* @since 1.52.0
		*/
		Viewport.prototype.activateView = function(view) {
			var camera = view.getCameraInfo();
			var newCamera;
			if (camera) {
				if (camera.type === "PerspectiveCamera") {
					newCamera = new sap.ui.vk.threejs.PerspectiveCamera();
					newCamera.setFov(camera.fov);
				}
				if (camera.type === "OrthographicCamera") {
					newCamera = new sap.ui.vk.threejs.OrthographicCamera();
					newCamera.setZoomFactor(camera.zoomFactor);
					if (camera.zoomNeedRecalculate){
						newCamera.setZoomNeedRecalculate(true);
					}
				}
				newCamera.setNearClipPlane(camera.nearClipPlane);
				newCamera.setFarClipPlane(camera.farClipPlane);
				newCamera.setUpDirection(camera.upDirection);
				newCamera.setPosition(camera.position);
				newCamera.setTargetDirection(camera.targetDirection);

				newCamera.setUsingDefaultClipPlanes(camera.usingDefaultClipPlanes);

				this._viewportGestureHandler.prepareForCameraUpdateAnimation(camera.type);
				this.setCamera(newCamera);
				this._viewportGestureHandler.startAnimatingCameraUpdate(500);
			}

			function arrayToMatrixThree(array) {
				return new THREE.Matrix4().set(array[0], array[1], array[2], array[3], array[4], array[5], array[6], array[7], array[8], array[9], array[10], array[11], 0, 0, 0, 1);
			}

			var nodeHierarchy = this._viewStateManager.getNodeHierarchy();

			var nodeInfo = view.getNodeInfos();



			if (nodeInfo) {
				this._nodesTransitionHelper.clear();
				nodeInfo.forEach(function(node) {
					if (node.target === null) {
						return;
					}

					function equalMatrices(matrix1, matrix2, error){
						for (var ei = 0; ei < matrix1.elements.length; ei++){
							if (Math.abs(matrix1.elements[ei] - matrix2.elements[ei]) > error){
								return false;
							}
						}
						return true;
					}

					if (node.transform) {
						var newMatrix = arrayToMatrixThree(node.transform);
						if (!equalMatrices(newMatrix, node.target.matrix, 1e-6)){
							var noteProxy = nodeHierarchy.createNodeProxy(node.target);
							this._nodesTransitionHelper.setNodeForDisplay(noteProxy);
							newMatrix.decompose(node.target.position, node.target.quaternion, node.target.scale);
							node.target.updateMatrix();
						}
					}



				}.bind(this));
				var nodeVisible = [];
				var nodeInvisible = [];

				for (var nfc = 0; nfc < nodeInfo.length; nfc++){

					if (nodeInfo[nfc].visible) {
						nodeVisible.push(nodeInfo[nfc].target);
					} else {
						nodeInvisible.push(nodeInfo[nfc].target);
					}
				}
				this._viewStateManager.setVisibilityState(nodeVisible, true, false);
				this._viewStateManager.setVisibilityState(nodeInvisible, false, false);

				var visibleNodeSet = new Set(nodeVisible);
				var allVisibleNodes = [];
				var nodeRef = nodeHierarchy.getSceneRef();
				var that = this;
				nodeRef.traverse(function collectChildNodes(node) {
									if (node.parent && that._viewStateManager.getVisibilityState(node.parent) === false) {
										return;
									}
									if (that._viewStateManager.getVisibilityState(node)) {
										if (node.userData && node.userData.treeNode) {
											allVisibleNodes.push(node);
										}
									}
								});

				var visibleNodesToChange = [];
				for (var nc = 0; nc < allVisibleNodes.length; nc++) {
					if (!visibleNodeSet.has(allVisibleNodes[nc])) {
						var isRealTopNode = true;
						var level = 0;
						var node = allVisibleNodes[nc];
						while (node && level < 4) {
							if (node.parent &&  node.parent.userData && node.parent.userData.treeNode) {
								isRealTopNode = false;
								break;
							} else {
								node = node.parent;
								level++;
							}
						}

						if (!isRealTopNode) {
							visibleNodesToChange.push(allVisibleNodes[nc]);
						}
					}
				}

				this._viewStateManager.setVisibilityState(visibleNodesToChange, false, false);

				this._nodesTransitionHelper.startDisplay(500);
			}

			return this;
		};

		/**
		 * Zooms the scene to a bounding box created from a particular set of nodes.
		 * @param {sap.ui.vk.ZoomTo|sap.ui.vk.ZoomTo[]} what What set of nodes to zoom to.
		 * @param {any} nodeRef Is used if what == (sap.ui.vk.ZoomTo.Node || sap.ui.vk.ZoomTo.NodeSetIsolation)
		 * @param {float} crossFadeSeconds Time to perform the "fly to" animation. Set to 0 to do this immediately.
		 * @param {float} margin Margin. Set to 0 to zoom to the entire screen.
		 * @returns {sap.ui.vk.Viewport} this
		 * @public
		 */
		Viewport.prototype.zoomTo = function(what, nodeRef, crossFadeSeconds, margin) {
			var nativeScene = this._scene ? this._scene.getSceneRef() : null;
			var nativeCamera = this._camera ? this._camera.getCameraRef() : null;
			if (!nativeCamera || !nativeScene) {
				return this;
			}

			margin = margin || 0;
			var boundingBox = new THREE.Box3();
			var quaternion = null;
			var node = null;
			(Array.isArray(what) ? what : [ what ]).forEach(function(what) {
				switch (what) {
					case sap.ui.vk.ZoomTo.All:
						boundingBox.expandByObject(nativeScene);
						break;
					case sap.ui.vk.ZoomTo.Visible:
						boundingBox = this._scene._computeBoundingBox(true);
						break;
					case sap.ui.vk.ZoomTo.Selected:
						var vsm = this._getViewStateManagerThreeJS();
						if (vsm) {
							vsm.enumerateSelection(function(nodeRef) {
								boundingBox.expandByObject(nodeRef);
							});
						}
						break;
					case sap.ui.vk.ZoomTo.Node:
						if (!nodeRef) {
							return this;
						}
						node = nodeRef;
						if (Array.isArray(nodeRef)) {
							nodeRef.forEach(function(nodeRef) {
								boundingBox.expandByObject(nodeRef);
							});
						} else {
							boundingBox.expandByObject(nodeRef);
						}
						break;
					case sap.ui.vk.ZoomTo.Restore:
						jQuery.sap.log.error("sap.ui.vk.ZoomTo.Restore is not implemented");
						return this;
					case sap.ui.vk.ZoomTo.NodeSetIsolation:
						jQuery.sap.log.error("sap.ui.vk.ZoomTo.NodeSetIsolation is not implemented");
						return this;
					case sap.ui.vk.ZoomTo.RestoreRemoveIsolation:
						jQuery.sap.log.error("sap.ui.vk.ZoomTo.RestoreRemoveIsolation is not implemented");
						return this;
					case sap.ui.vk.ZoomTo.ViewLeft:
						quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
						break;
					case sap.ui.vk.ZoomTo.ViewRight:
						quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
						break;
					case sap.ui.vk.ZoomTo.ViewTop:
						quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
						break;
					case sap.ui.vk.ZoomTo.ViewBottom:
						quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
						break;
					case sap.ui.vk.ZoomTo.ViewBack:
						quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
						break;
					case sap.ui.vk.ZoomTo.ViewFront:
						quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
						break;
					default:
						break;
				}
			}.bind(this));

			if (!boundingBox.isEmpty()) {
				this._viewportGestureHandler.zoomTo(boundingBox, quaternion, margin, crossFadeSeconds * 1000, node, node !== null);
			}
			return this;
		};

		/**
		 * Retrieves information about the current camera view in the scene, and saves the information in a JSON-like object.
		 * The information can then be used at a later time to restore the scene to the same camera view using the
		 * {@link sap.ui.vk.Viewport#setViewInfo setViewInfo} method.<br/>
		 * @param {object}         [query]                       Query object which indicates what information to be retrieved.
		 * @param {boolean|object} [query.camera=true]           Indicator to retrieve camera information.
		 * @param {boolean}        [query.camera.matrices=false] Indicator to retrieve camera view and projection matrices.
		 * @param {boolean}        [query.camera.useTransitionCamera=false] Indicator to retrieve the transition camera properties instead of regular one's.
		 * @param {boolean|object} [query.visibility=false]      Indicator to retrieve visibility information.
		 * @param {sap.ui.vk.VisibilityMode} [query.visibility.mode=sap.ui.vk.VisibilityMode.Complete]
		 *                                                       Indicator to retrieve the complete visibility definition or just the difference.
		 * @returns {object} JSON-like object which holds the current view information. See {@link sap.ui.vk.Viewport#setViewInfo setViewInfo}.
		 *                   In addition to properties defined in {@link sap.ui.vk.Viewport#setViewInfo setViewInfo} the output from
		 *                   {@link sap.ui.vk.Viewport#getViewInfo getViewInfo} contains camera view and projection matrices
		 * <pre>
		 *   {
		 *     ...
		 *     camera: {
		 *       ...
		 *       matrices: {
		 *         view:       [number, ...],
		 *         projection: [number, ...],
		 *       }
		 *       ...
		 *     },
		 *     ...
		 *   }
		 * </pre>
		 * @public
		 */
		Viewport.prototype.getViewInfo = function(query) {
			var viewInfo = {};

			var nativeCamera = this._camera ? this._camera.getCameraRef() : null;

			if (query.camera && nativeCamera) {
				var rotation = nativeCamera.rotation.clone();
				rotation.reorder("YXZ");

				viewInfo.camera = {
					rotation: {
						yaw:   THREE.Math.radToDeg(rotation.y),
						pitch: THREE.Math.radToDeg(rotation.x),
						roll:  THREE.Math.radToDeg(rotation.z)
					},
					position: {
						x: nativeCamera.position.x,
						y: nativeCamera.position.y,
						z: nativeCamera.position.z
					},
					projectionType: nativeCamera.isOrthographicCamera ? sap.ui.vk.CameraProjectionType.Orthographic : sap.ui.vk.CameraProjectionType.Perspective,
					bindingType: sap.ui.vk.CameraFOVBindingType.Vertical
				};

				if (viewInfo.camera.projectionType === sap.ui.vk.CameraProjectionType.Perspective) {
					viewInfo.camera.fieldOfView = nativeCamera.fov; // perspective camera defines Field of View
				} else if (viewInfo.camera.projectionType === sap.ui.vk.CameraProjectionType.Orthographic) {
					viewInfo.camera.zoomFactor = nativeCamera.zoom; // orthographic defines Zoom Factor
				}

				if (query.camera.matrices) {
					viewInfo.camera.matrices = {
						view: nativeCamera.matrixWorldInverse.elements.slice(),
						projection: nativeCamera.projectionMatrix.elements.slice()
					};
				}
			}

			if (query.visibility && this._viewStateManager) {
				viewInfo.visibility = {
					mode: query.visibility.mode
				};
				if (query.visibility.mode === sap.ui.vk.VisibilityMode.Complete) {
					var allVisibility = this._viewStateManager.getVisibilityComplete();
					viewInfo.visibility.visible = allVisibility.visible;
					viewInfo.visibility.hidden = allVisibility.hidden;
				} else if (this._viewStateManager.getShouldTrackVisibilityChanges()) {
					viewInfo.visibility.changes = this._viewStateManager.getVisibilityChanges();
				} else {
					jQuery.sap.log.warning(sap.ui.vk.getResourceBundle().getText(Messages.VIT32.summary), Messages.VIT32.code, "sap.ui.vk.dvl.Viewport");
				}
			}

			return viewInfo;
		};

		/**
		 * Sets the current scene to use the camera view information acquired from the {@link sap.ui.vk.Viewport#getViewInfo getViewInfo} method.<br/>
		 * Internally, the <code>setViewInfo</code> method activates certain steps at certain animation times,
		 * and then changes the camera position, rotation and field of view (FOV) / zoom factor.
		 * @param {object}   viewInfo                             A JSON-like object containing view information acquired using
		 *                                                        the {@link sap.ui.vk.Viewport#getViewInfo getViewInfo} method.<br/>
		 * @param {object}   [viewInfo.camera]                    A JSON-like object containing the camera information.
		 * @param {object}   viewInfo.camera.rotation             Rotation defined in {@link https://en.wikipedia.org/wiki/Aircraft_principal_axes Aircraft principal axes}.
		 * @param {float}    viewInfo.camera.rotation.yaw         Angle around the vertical axis in degrees.
		 * @param {float}    viewInfo.camera.rotation.pitch       Angle around the lateral axis in degrees.
		 * @param {float}    viewInfo.camera.rotation.roll        Angle around the longitudinal axis in degrees.
		 * @param {object}   viewInfo.camera.position             Position defined in 3-dimensional space.
		 * @param {float}    viewInfo.camera.position.x           X coordinate.
		 * @param {float}    viewInfo.camera.position.y           Y coordinate.
		 * @param {float}    viewInfo.camera.position.z           Z coordinate.
		 * @param {sap.ui.vk.CameraFOVBindingType} viewInfo.camera.bindingType Camera field of view binding type.
		 * @param {sap.ui.vk.CameraProjectionType} viewInfo.camera.projectionType Camera projection type.
		 * @param {float}    viewInfo.camera.fieldOfView          Camera field of view in degrees. Applicable only to perspective cameras.
		 * @param {float}    viewInfo.camera.zoomFactor           Camera zoom factor. Applicable only to orthographic cameras.
		 * @param {object}   [viewInfo.animation]                 A JSON-like object containing the animation information.
		 * @param {string}   [viewInfo.animation.stepVeId]        Step VE ID. If it is omitted then procedure and step indices are used.
		 * @param {int}      [viewInfo.animation.procedureIndex]  Procedure index in the list of procedures.
		 * @param {int}      [viewInfo.animation.stepIndex]       Step index in the list of steps in the procedure.
		 * @param {float}    [viewInfo.animation.animationTime=0] Time at which to activate the step.
		 * @param {object}   [viewInfo.visibility]                A JSON-like object containing the visibility information.
		 * @param {sap.ui.vk.VisibilityMode} viewInfo.visibility.mode If the mode equals to {@link sap.ui.vk.VisibilityMode.Complete complete}
		 *                                                        then the visible and hidden fields are defined. If the mode
		 *                                                        equals {@link sap.ui.vk.VisibilityMode.Differences differences} then
		 *                                                        the changes field is defined.
		 * @param {string[]} viewInfo.visibility.visible          List of Ids of visible nodes.
		 * @param {string[]} viewInfo.visibility.hidden           List of Ids of hidden nodes.
		 * @param {string[]} viewInfo.visibility.changes          List of Ids of nodes with inverted visibility.
		 * @param {float}    [flyToDuration=0]                    Fly-to animation duration in seconds.
		 * @returns {sap.ui.vk.Viewport} <code>this</code> to allow method chaining.
		 * @public
		 */
		Viewport.prototype.setViewInfo = function(viewInfo, flyToDuration) {
			var nativeCamera = this._camera ? this._camera.getCameraRef() : null;

			if (viewInfo.camera && nativeCamera) {
				var viCamera = viewInfo.camera;
				var newCamera = viCamera.projectionType === sap.ui.vk.CameraProjectionType.Orthographic ? new THREE.OrthographicCamera() : new THREE.PerspectiveCamera();
				newCamera.userData = nativeCamera.userData;
				newCamera.aspect = nativeCamera.aspect;
				newCamera.position.copy(viCamera.position);
				var rotation = viCamera.rotation;
				newCamera.quaternion.setFromEuler(new THREE.Euler(THREE.Math.degToRad(rotation.pitch), THREE.Math.degToRad(rotation.yaw), THREE.Math.degToRad(rotation.roll), "YXZ"));
				newCamera.fov = viCamera.fieldOfView || newCamera.fov;
				newCamera.zoom = viCamera.zoomFactor || newCamera.zoom;

				this._viewportGestureHandler._activateCamera(newCamera, (flyToDuration || 0) * 1000);
			}

			// restoring the visibility state
			if (viewInfo.visibility) {
				var nodeHierarchy = this._viewStateManager.getNodeHierarchy(),
					veIdToNodeRefMap = new Map(),
					allNodeRefs = nodeHierarchy.findNodesByName();

				allNodeRefs.forEach(function(nodeRef) {
					// create node proxy based on dynamic node reference
					var nodeProxy = nodeHierarchy.createNodeProxy(nodeRef);
					var veId = nodeProxy.getVeId();
					// destroy the node proxy
					nodeHierarchy.destroyNodeProxy(nodeProxy);
					if (veId) {
						// push the ve id to either visible/hidden array
						veIdToNodeRefMap.set(veId, nodeRef);
					}
				});

				switch (viewInfo.visibility.mode) {
					case sap.ui.vk.VisibilityMode.Complete:
						var visibleVeIds = viewInfo.visibility.visible,
							hiddenVeIds = viewInfo.visibility.hidden;

						visibleVeIds.forEach(function(veId) {
							this._viewStateManager.setVisibilityState(veIdToNodeRefMap.get(veId), true, false);
						}, this);

						hiddenVeIds.forEach(function(veId) {
							this._viewStateManager.setVisibilityState(veIdToNodeRefMap.get(veId), false, false);
						}, this);
						break;

					case sap.ui.vk.VisibilityMode.Differences:
						viewInfo.visibility.changes.forEach(function(veId) {
							var nodeRef = veIdToNodeRefMap.get(veId);
							// reverting the visibility for this particular node
							if (nodeRef) {
								this._viewStateManager.setVisibilityState(nodeRef, !this._viewStateManager.getVisibilityState(nodeRef), false);
							}
						}, this);
						break;

					default:
						jQuery.sap.log.error(sap.ui.vk.getResourceBundle().getText(Messages.VIT28.summary), Messages.VIT28.code, "sap.ui.vk.dvl.Viewport");
						break;
				}
			}

			return this;
		};

		/**
		 * Queues a command for execution during the rendering cycle. All gesture operations should be called using this method.
		 *
		 * @param {function} command The command to be executed.
		 * @returns {sap.ui.vk.threejs.Viewport} returns this
		 * @public
		 */
		Viewport.prototype.queueCommand = function(command) {
			if (this instanceof sap.ui.vk.threejs.Viewport) {
				command();
			}
			return this;
		};

		/**
		 * Gets position and size of the viewport square.
		 * The information can be used for making calculations when restoring Redlining elements.
		 * @returns {object} The information in this object:
		 *   <ul>
		 *     <li><b>left</b> - The x coordinate of the top-left corner of the square.</li>
		 *     <li><b>top</b> - The y coordinate of the top-left corner of the square.</li>
		 *     <li><b>sideLength</b> - The length of the square.</li>
		 *   </ul>
		 * @public
		 */
		Viewport.prototype.getOutputSize = function() {
			var boundingClientRect = this.getDomRef().getBoundingClientRect();
			var viewportWidth = boundingClientRect.width;
			var viewportHeight = boundingClientRect.height;
			var relevantDimension;

			relevantDimension = Math.min(viewportWidth, viewportHeight);

			return {
				 left: (viewportWidth - relevantDimension) / 2,
				 top: (viewportHeight - relevantDimension) / 2,
				 sideLength: relevantDimension
			};
		};

		return Viewport;
});
