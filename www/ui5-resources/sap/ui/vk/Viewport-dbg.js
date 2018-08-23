/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

// Provides control sap.ui.vk.Viewport.
sap.ui.define([
	"jquery.sap.global", "./library", "./ViewportBase", "sap/ui/core/ResizeHandler", "./Loco", "./ViewportHandler",
	"./Smart2DHandler", "./Messages", "./ContentConnector", "./ViewStateManager"
], function(
	jQuery, library, ViewportBase, ResizeHandler, Loco, ViewportHandler,
	Smart2DHandler, Messages, ContentConnector, ViewStateManager
) {
	"use strict";

	/**
	 * Constructor for a new Viewport.
	 *
	 * @class
	 * Provides a rendering canvas for the 3D elements of a loaded scene.
	 *
	 * @param {string} [sId] ID for the new Viewport control. Generated automatically if no ID is given.
	 * @param {object} [mSettings] Initial settings for the new Viewport control.
	 * @public
	 * @author SAP SE
	 * @version 1.56.12
	 * @extends sap.ui.vk.ViewportBase
	 * @alias sap.ui.vk.Viewport
	 * @experimental Since 1.50.0 This class is experimental and might be modified or removed in future versions.
	 */
	var Viewport = ViewportBase.extend("sap.ui.vk.Viewport", /** @lends sap.ui.vk.Viewport.prototype */ {
		metadata: {
			library: "sap.ui.vk"
		}
	});

	var basePrototype = Viewport.getMetadata().getParent().getClass().prototype;

	Viewport.prototype.init = function() {
		if (basePrototype.init) {
			basePrototype.init.call(this);
		}

		this._implementation = null;
		this._deferred = {};              // properties/objects that are to be forwarded to _implementation when it is created.
	};

	Viewport.prototype.exit = function() {
		this._deferred = null;
		this._destroyImplementation();

		if (basePrototype.exit) {
			basePrototype.exit.call(this);
		}
	};

	Viewport.prototype.getImplementation = function() {
		return this._implementation;
	};

	Viewport.prototype._destroyImplementation = function() {
		if (this._implementation) {
			this._implementation.destroy();
			this._implementation = null;
		}
		return this;
	};

	////////////////////////////////////////////////////////////////////////
	// Propagate public properties to implementation

	Viewport.prototype.getShowDebugInfo = function() {
		if (this._implementation) {
			return this._implementation.getShowDebugInfo();
		}
		return basePrototype.getShowDebugInfo.call(this);
	};

	Viewport.prototype.setShowDebugInfo = function(value) {
		basePrototype.setShowDebugInfo.call(this, value);
		if (this._implementation) {
			this._implementation.setShowDebugInfo(value);
		}
		return this;
	};

	Viewport.prototype.getBackgroundColorTop = function() {
		if (this._implementation) {
			return this._implementation.getBackgroundColorTop();
		}
		return basePrototype.getBackgroundColorTop.call(this);
	};

	Viewport.prototype.setBackgroundColorTop = function(value) {
		basePrototype.setBackgroundColorTop.call(this, value);
		if (this._implementation) {
			this._implementation.setBackgroundColorTop(value);
		}
		return this;
	};

	Viewport.prototype.getBackgroundColorBottom = function() {
		if (this._implementation) {
			return this._implementation.getBackgroundColorBottom();
		}
		return basePrototype.getBackgroundColorBottom.call(this);
	};

	Viewport.prototype.setBackgroundColorBottom = function(value) {
		basePrototype.setBackgroundColorBottom.call(this, value);
		if (this._implementation) {
			this._implementation.setBackgroundColorBottom(value);
		}
		return this;
	};

	Viewport.prototype.setWidth = function(value) {
		basePrototype.setWidth.call(this, value);
		if (this._implementation) {
			this._implementation.setWidth(value);
		}
		return this;
	};

	Viewport.prototype.setHeight = function(value) {
		basePrototype.setHeight.call(this, value);
		if (this._implementation) {
			this._implementation.setHeight(value);
		}
		return this;
	};

	Viewport.prototype.setSelectionMode = function(value) {
		basePrototype.setSelectionMode.call(this, value);
		if (this._implementation) {
			this._implementation.setSelectionMode(value);
		}
		return this;
	};

	Viewport.prototype.getSelectionMode = function() {
		if (this._implementation) {
			return this._implementation.getSelectionMode();
		}
		return basePrototype.getSelectionMode.call(this);
	};

	Viewport.prototype.setCamera = function(value) {
		basePrototype.setCamera.call(this, value);
		if (this._implementation) {
			this._implementation.setCamera(value);
			return this;
		}

		return this;
	};

	Viewport.prototype.getCamera = function() {
		if (this._implementation) {
			return this._implementation.getCamera();
		}
		return basePrototype.getCamera.call(this);
	};

	Viewport.prototype.setShouldRenderFrame = function() {
		if (this._implementation) {
			this._implementation.setShouldRenderFrame();
		}
		return this;
	};

	Viewport.prototype.shouldRenderFrame = function() {
		if (this._implementation) {
			this._implementation.shouldRenderFrame();
		}
	};

	////////////////////////////////////////////////////////////////////////
	// Content connector handling begins.

	Viewport.prototype._setContent = function(content) {
		var scene = null;
		var camera = null;

		if (content) {
			scene = content;
			if (!(scene instanceof sap.ui.vk.Scene)) {
				scene = null;
			}
			camera = content.camera;
			if (!(camera instanceof sap.ui.vk.Camera)) {
				camera = null;
			}
		}

		this._setScene(scene);

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

		this._setScene(null);
	};

	Viewport.prototype._handleContentReplaced = function(event) {
		var content = event.getParameter("newContent");
		this._setContent(content);
	};

	Viewport.prototype._setScene = function(scene) {
		if (scene instanceof sap.ui.vk.Scene) {
			var sceneType = scene.getMetadata().getName(),
			    implementationType = this._implementation && this._implementation.getMetadata().getName(),
			    reuseImplemenation = sceneType === "sap.ui.vk.dvl.Scene" && implementationType === "sap.ui.vk.dvl.Viewport" ||
									 sceneType === "sap.ui.vk.threejs.Scene" && implementationType === "sap.ui.vk.threejs.Viewport";

			if (!reuseImplemenation) {
				this._destroyImplementation();
				var newImplementationType;
				var that = this;
				var camera = this.getCamera();

				if (sceneType === "sap.ui.vk.dvl.Scene") {
					newImplementationType = "sap.ui.vk.dvl.Viewport";
				} else if (sceneType === "sap.ui.vk.threejs.Scene") {
					newImplementationType = "sap.ui.vk.threejs.Viewport";
				}

				if (newImplementationType) {
					jQuery.sap.require(newImplementationType);
					this._implementation = new (jQuery.sap.getObject(newImplementationType))({
						viewStateManager: this.getViewStateManager(),
						urlClicked: function(event) {
							that.fireUrlClicked({
								nodeRef: event.getParameter("nodeRef"),
								url: event.getParameter("url")
							});
						},
						nodeClicked: function(event) {
							that.fireNodeClicked({
								nodeRef: event.getParameter("nodeRef"),
								x: event.getParameter("x"),
								y: event.getParameter("y")
							});
						},
						resize: function(event) {
							that.fireResize({
								size: event.getParameter("size")
							});
						},
						showDebugInfo: this.getShowDebugInfo(),
						width: this.getWidth(),
						height: this.getHeight(),
						backgroundColorTop: this.getBackgroundColorTop(),
						backgroundColorBottom: this.getBackgroundColorBottom(),
						selectionMode: this.getSelectionMode(),
						contentConnector: this.getContentConnector() // content connector must be the last parameter in the list!
					});

					// pass the camera, if we have one
					if (camera) {
						this._camera = null; // proxy no longer owns the camera
						this._implementation.setCamera(camera); // forward the camera to implementation
					}

					if ("graphicsCore" in this._deferred && this._implementation.setGraphicsCore) {
						this._implementation.setGraphicsCore(this._deferred.graphicsCore);
					}
					delete this._deferred.graphicsCore;

					if ("scene" in this._deferred && this._implementation.setScene) {
						this._implementation.setScene(this._deferred.scene);
					}
					delete this._deferred.scene;

					this._implementation.attachNodesPicked(function(event) {
						this.fireNodesPicked({
							picked: event.getParameter("picked")
						});
					}, this);

					this._implementation.attachNodeZoomed(function(event) {
						this.fireNodeZoomed({
							zoomed: event.getParameter("zoomed"),
							isZoomIn: event.getParameter("isZoomIn")
						});
					}, this);
				}

				this.invalidate();
			}
		} else {
			this._destroyImplementation();
			this.invalidate();
		}
		return this;
	};

	// Content connector handling ends.
	////////////////////////////////////////////////////////////////////////

	Viewport.prototype._onAfterUpdateViewStateManager = function() {
		if (this._implementation) {
			this._implementation.setViewStateManager(this._viewStateManager);
		}
	};

	Viewport.prototype._onBeforeClearViewStateManager = function() {
		if (this._implementation) {
			this._implementation.setViewStateManager(null);
		}
	};

	/**
	 * Calls activateView with view definition
	 *
	 * @param {sap.ui.vk.View} view object definition
	 * @returns {sap.ui.vk.Viewport} returns this
	 * @public
	 */
	Viewport.prototype.activateView = function(view) {
		if (this._implementation) {
			this._implementation.activateView(view);
			return this;
		} else {
			jQuery.sap.log.error("no implementation");
			return this;
		}
	};

	/**
	 * Zooms the scene to a bounding box created from a particular set of nodes.
	 *
	 * @param {sap.ui.vk.ZoomTo|sap.ui.vk.ZoomTo[]} what What set of nodes to zoom to.
	 * @param {any} nodeRef Is only used if what == sap.ui.vk.ZoomTo.Node.
	 * @param {float} crossFadeSeconds Time to perform the "fly to" animation. Set to 0 to do this immediately.
	 * @param {float} margin Margin. Set to 0 to zoom to the entire screen.
	 * @returns {sap.ui.vk.Viewport} this
	 * @public
	 */
	Viewport.prototype.zoomTo = function(what, nodeRef, crossFadeSeconds, margin) {
		if (this._implementation) {
			this._implementation.zoomTo(what, nodeRef, crossFadeSeconds, margin);
			return this;
		} else {
			jQuery.sap.log.error("no implementation");
			return this;
		}
	};

	var setDefaultQueryCamera = function(effectiveQuery) {
		effectiveQuery.camera = {};
	};

	var setDefaultQueryCameraMatrices = function(effectiveQuery) {
		if (typeof effectiveQuery.camera === "object" && effectiveQuery.camera !== null) {
			effectiveQuery.camera.matrices = false;
		}
	};

	var setDefaultQueryCameraUseTransitionCamera = function(effectiveQuery) {
		if (typeof effectiveQuery.camera === "object" && effectiveQuery.camera !== null) {
			effectiveQuery.camera.useTransitionCamera = false;
		}
	};

	var setDefaultQueryAnimation = function(effectiveQuery) {
		effectiveQuery.animation = true;
	};

	var setDefaultQueryVisibility = function(effectiveQuery) {
		effectiveQuery.visibility = false;
	};

	var setDefaultQueryVisibilityMode = function(effectiveQuery) {
		if (typeof effectiveQuery.visibility === "object" && effectiveQuery.visibility !== null) {
			effectiveQuery.visibility.mode = sap.ui.vk.VisibilityMode.Complete;
		}
	};

	/**
	 * Retrieves information about the current camera view in the scene, and saves the information in a JSON-like object.
	 * The information can then be used at a later time to restore the scene to the same camera view using the
	 * {@link sap.ui.vk.Viewport#setViewInfo setViewInfo} method.<br/>
	 * @param {object}         [query]                       Query object which indicates what information to be retrieved.
	 * @param {boolean|object} [query.camera=true]           Indicator to retrieve camera information.
	 * @param {boolean}        [query.camera.matrices=false] Indicator to retrieve camera view and projection matrices.
	 * @param {boolean}        [query.camera.useTransitionCamera=false] Indicator to retrieve the transition camera properties instead of regular one's.
	 * @param {boolean}        [query.animation=true]        Indicator to retrieve animation information.
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
		if (!this._implementation) {
			jQuery.sap.log.error("no implementation");
			return null;
		}

		var effectiveQuery = {};

		if (typeof query !== "object" || query === null) {
			setDefaultQueryCamera(effectiveQuery);
			setDefaultQueryCameraMatrices(effectiveQuery);
			setDefaultQueryCameraUseTransitionCamera(effectiveQuery);
			setDefaultQueryAnimation(effectiveQuery);
			setDefaultQueryVisibility(effectiveQuery);
			setDefaultQueryVisibilityMode(effectiveQuery);
		} else {
			if (typeof query.camera === "object" && query.camera !== null) {
				effectiveQuery.camera = {};
				if (typeof query.camera.matrices === "boolean") {
					effectiveQuery.camera.matrices = query.camera.matrices;
				} else if ("matrices" in query.camera) {
					// If camera.matrices is defined but not of type boolean, this is an error.
					effectiveQuery.camera.matrices = false;
				} else {
					// If camera.matrices is not defined, use default value.
					setDefaultQueryCameraMatrices(effectiveQuery);
				}
				if (typeof query.camera.useTransitionCamera === "boolean") {
					effectiveQuery.camera.useTransitionCamera = query.camera.useTransitionCamera;
				} else if ("useTransitionCamera" in query.camera) {
					// If camera.useTransitionCamera is defined but not of type boolean, this is an error.
					effectiveQuery.camera.useTransitionCamera = false;
				} else {
					// If camera.useTransitionCamera is not defined, use default value.
					setDefaultQueryCameraUseTransitionCamera(effectiveQuery);
				}
			} else if (typeof query.camera === "boolean") {
				if (query.camera === true) {
					effectiveQuery.camera = {};
					setDefaultQueryCameraMatrices(effectiveQuery);
					setDefaultQueryCameraUseTransitionCamera(effectiveQuery);
				} else {
					effectiveQuery.camera = false;
				}
			} else if ("camera" in query) {
				// If camera is defined but is not of type object or boolean, this is an error.
				effectiveQuery.camera = false;
			} else {
				// If camera is not defined at all, use default values.
				setDefaultQueryCamera(effectiveQuery);
				setDefaultQueryCameraMatrices(effectiveQuery);
				setDefaultQueryCameraUseTransitionCamera(effectiveQuery);
			}

			if (typeof query.animation === "boolean") {
				effectiveQuery.animation = query.animation;
			} else if ("animation" in query) {
				// If animation is defiend but is not of type boolean, this is an error.
				effectiveQuery.animation = false;
			} else {
				// If animation is not defined, use default value.
				setDefaultQueryAnimation(effectiveQuery);
			}

			if (typeof query.visibility === "object" && query.visibility !== null) {
				effectiveQuery.visibility = {};
				if (query.visibility.mode === sap.ui.vk.VisibilityMode.Complete || query.visibility.mode === sap.ui.vk.VisibilityMode.Differences) {
					effectiveQuery.visibility.mode = query.visibility.mode;
				} else {
					// If visibility.mode is not defined or does not equal "complete" or "differences", use default value.
					// This condition is different from camera.matrices because the mode property must have a valid string value.
					setDefaultQueryVisibilityMode(effectiveQuery);
				}
			} else if (typeof query.visibility === "boolean") {
				if (query.visibility === true) {
					effectiveQuery.visibility = {};
					setDefaultQueryVisibilityMode(effectiveQuery);
				} else {
					effectiveQuery.visibility = false;
				}
			} else if ("visibility" in query) {
				// If visibility is defined but is not of type object or boolean, this is an error.
				effectiveQuery.visibility = false;
			} else {
				// If visibility is not defined, use default values.
				setDefaultQueryVisibility(effectiveQuery);
				setDefaultQueryVisibilityMode(effectiveQuery);
			}
		}

		return this._implementation.getViewInfo(effectiveQuery);
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
		if (this._implementation) {
			this._implementation.setViewInfo(viewInfo, flyToDuration);
		} else {
			jQuery.sap.log.error("no implementation");
		}

		return this;
	};

	/**
	 * Returns viewport content as an image of desired size.
	 *
	 * @param {int} width Requested image width in pixels (allowed values 8 to 2048)
	 * @param {int} height Requested image height in pixels (allowed values 8 to 2048)
	 * @param {string} topColor The sap.ui.core.CSSColor to be used for top background color
	 * @param {string} bottomColor The sap.ui.core.CSSColor to be used for bottom background color
	 * @returns {string} Base64 encoded PNG image
	 * @public
	 */
	Viewport.prototype.getImage = function(width, height, topColor, bottomColor) {
		if (this._implementation && this._implementation.getImage) {
			return this._implementation.getImage(width, height, topColor, bottomColor);
		}

		return null;
	};

	ContentConnector.injectMethodsIntoClass(Viewport);
	ViewStateManager.injectMethodsIntoClass(Viewport);

	return Viewport;
});
