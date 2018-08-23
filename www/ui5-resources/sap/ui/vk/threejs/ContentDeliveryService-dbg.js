/*!
* SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
*/

/* global THREE, Totara */

// Provides control sap.ui.vk.threejs.ContentDeliveryService.
sap.ui.define([
	"jquery.sap.global", "sap/ui/base/ManagedObject", "./thirdparty/three", "sap/ui/vk/threejs/thirdparty/totara", "./PerspectiveCamera", "./OrthographicCamera", "sap/ui/vk/View"
], function(jQuery, ManagedObject, threeJs, totara, PerspectiveCamera, OrthographicCamera, View) {

	"use strict";

	/**
 	 *  Constructor for a new ContentDeliveryService.
 	 *
 	 * @class Provides a class to communicate with content delivery service.
 	 *
	 * @author SAP SE
	 * @version 1.56.12
	 * @extends sap.ui.core.ManagedObject
	 * @alias sap.ui.vk.threejs.ContentDeliveryService
	 * @experimental Since 1.50.0 This class is experimental and might be modified or removed in future versions.
	 */
	var ContentDeliveryService = ManagedObject.extend("sap.ui.vk.threejs.ContentDeliveryService", {
		metadata: {
			events: {
				cameraChanged: {
					parameters: {
						sceneId: {
							type: "string"
						},
						camera: {
							type: "any"
						}
					},
					enableEventBubbling: true
				},
				sceneUpdated: {
					parameters: {
					},
					enableEventBubbling: true
				},
				errorReported: {
					paramters: {
						error: {
							type: "any"
						}
					}
				}
			}
		}
	});

	var basePrototype = ContentDeliveryService.getMetadata().getParent().getClass().prototype;

	ContentDeliveryService.prototype.init = function() {
		if (basePrototype.init) {
			basePrototype.init.call(this);
		}
		this._loader = null;

		// note we keep transientRoot in the map for reference.
		// we do not increase reference counter for resources (e.g geometry)
		// as transient ones will be removed anyway
		// We keep the original tree with userData in '_transientSceneMap'. and give cloned ones
		// when requested.
		// For now, we will keep the transient scene reference for the life time of
		// contentDeliveryService (totara)
		this._transientSceneMap = new Map(); // keeps transient scene. Typically POIs and symbols.
	};

	/**
 	 * Sets url of content delivery service server.
 	 * @param {string} url Url of content delivery service. Protocols are http, https, ws, wss.
	 * @param {Object.<string, string>} httpHeaders Custom http request headers.
 	 * @returns {bool} returns false if initialization fails.
 	 */
	ContentDeliveryService.prototype.initUrl = function(url, httpHeaders) {
		var that = this;
		var connection;
		var connectionInitPromise;

		function notifyUpdate() {
			that.fireSceneUpdated({});
		}

		if (!that._loader) {
			this._loader = new Totara.Loader();
			var state = this._loader.getState();

			state.onErrorCallbacks.attach(this._reportError.bind(that));
			state.onMaterialFinishedCallbacks.attach(notifyUpdate);
			state.onImageFinishedCallbacks.attach(notifyUpdate);
			state.onSetGeometryCallbacks.attach(notifyUpdate);
		}

		var promiseList = [];
		if (jQuery.sap.startsWith(url, "ws")) {

			connection = new Totara.Loader.WebSocketConnection();
			connectionInitPromise = connection.init(url).then(function() {
				that._loader.init(connection);
			}).catch(function(error) {
				that._loader = null;
				throw error;
			});

			promiseList.push(connectionInitPromise);
		} else if (jQuery.sap.startsWith(url, "http")) {

			connection = new Totara.Loader.HttpConnection();
			connectionInitPromise = connection.init(url, httpHeaders).then(function() {
				that._loader.init(connection);
			});

			promiseList.push(connectionInitPromise);
		} else {
			that._loader = null;
			promiseList.push(Promise.reject("Content Delivery Service only allows http and websocket connection"));
		}
		return Promise.all(promiseList);
	};

	function createCameraWithThreeJsCamera(threeJsCamera) {
		if (!threeJsCamera) {
			return null;
		}

		// internally we create cameras directly.
		// in public API, users have to create camera from contentManager to be consistent with DVL
		var camera;
		if (threeJsCamera.isOrthographicCamera) {
			camera = new sap.ui.vk.threejs.OrthographicCamera();
		} else if (threeJsCamera.isPerspectiveCamera) {
			camera = new sap.ui.vk.threejs.PerspectiveCamera();
		}
		camera.setCameraRef(threeJsCamera);

		camera.setUsingDefaultClipPlanes(true); // always use auto as specific near far always cause trouble

		if (threeJsCamera.cameraInfo && threeJsCamera.cameraInfo.zoom === -1) {
			camera.setZoomNeedRecalculate(true);
		}

		return camera;
	}

	ContentDeliveryService.prototype._reportError = function(error) {
		this.fireErrorReported(error);
	};

	ContentDeliveryService.prototype._createLoadParam = function(resolve, reject, parentNode, contentResource) {
		var that = this;
		var initialCamera;
		var sceneLoaded = false;

		var contextParams = {
			root: parentNode,
			includeHidden: contentResource.getIncludeHidden(),
			pushPMI: contentResource.getPushPMI(),
			metadataFilter: contentResource.getMetadataFilter(),
			activateView: contentResource.getActivateView(),
			enableLogger: contentResource.getEnableLogger() === true,

			onActiveCamera: function(newCam) {
				var isInitialCam = false;
				var state = that._loader.getState();
				if (state) {
					var context = state.contextMap.get(contentResource.getVeid());
					if (context && context.phase < 2) { // 2 -> FinishedMesh
						// CDS is still getting the model
						initialCamera = createCameraWithThreeJsCamera(newCam);
						isInitialCam = true;
					}
				}

				if (!isInitialCam) {
					that.fireCameraChanged({
						sceneId: contentResource.getVeid(),
						camera: createCameraWithThreeJsCamera(newCam)
					});
				}
			},
			onInitialSceneFinished: function() {
				sceneLoaded = true;
				resolve({
					node: parentNode,
					camera: initialCamera,
					contentResource: contentResource,
					loader: that // passing cds as loader
				});
			}
		};

		var callback = function(info) {
			if (!sceneLoaded) {
				var context = info.getParameter("context");
				if (context && context.sceneId === contentResource.getVeid()) {
					that.detachErrorReported(callback);
					var reason;

					if (info.getParameter("error")) {
						reason = info.getParameter("error");
					} else if (info.getParameter("errorText")) {
						reason = info.getParameter("errorText");
					} else if (info.getParameter("reason")) {
						reason = info.getParameter("reason");
					} else {
						reason = "failed to load: unknown reason";
					}

					// error from server has some detailed info
					if (info.getParameter("events")) {
						reason = reason + "\n" + JSON.stringify(info.getParameter("events"));
					}

					// if error happend before initial scene finished, we reject
					reject(reason);
				}
			}
		};

		that.attachErrorReported(callback);

		return contextParams;
	};

	ContentDeliveryService.prototype.load = function(parentNode, contentResource) {
		var that = this;

		return new Promise(function(resolve, reject) {
			if (!contentResource.getSource() || !contentResource.getVeid()) {
				reject("url or veid not specified");
				return;
			}

			var requireInit = true;
			if (that._loader) {
				var connection = that._loader.getConnection();
				if (connection) {
					// we already have connection
					if (connection.getUrl() === contentResource.getSource()) {
						// connection already exist with same url.
						requireInit = false;
					} else {
						// currently we only have one connection to CDS as we only have one contentConnector
						// so close it and re-init the target server url
						// we want to have multiple loader if we allow multiple CDS in the future.
						connection.close();
					}
				}
			}

			var contextParams = that._createLoadParam(resolve, reject, parentNode, contentResource);
			if (requireInit) {
				that.initUrl(contentResource.getSource(), contentResource.getHttpHeaders()).then(function() {
					that._loader.request(contentResource.getVeid(), contextParams); // .request ends
				}).catch(function(reason) {
					reject(reason);
				}); // when we load from default loader we might not have initialised it yet
			} else {
				that._loader.request(contentResource.getVeid(), contextParams); // .request ends
			}

		}); // promise ends
	};

	ContentDeliveryService.prototype.getState = function() {
		if (this._loader) {
			return this._loader.getState();
		}
		return null;
	};

	// as threejs node which is a tree node can be dropped by nodeHierarchy.removeNode, we need to update it to cds
	ContentDeliveryService.prototype.decrementResouceCountersForDeletedTreeNode = function(sid) {
		var state = this.getState();
		if (state) {

			state.contextMap.forEach(function(value, key) {
				if (value.treeNodeMap.has(sid)) {
					Totara.decrementResouceCountersForDeletedTreeNode(state, value, sid);
				}
			});
		}
	};

	// We want to use this for light scene such as POIs and symbols
	// This is mainly used by authoring and whoever loaded transient scene should remove it when done with it.

	/**
	 * Add the transient scene to target parent.
	 * This method returns a promise which is resolves when we get all geometries for simplicity for now.
	 * @param {string} sceneVeId target scene id to update.
	 * @param {noderef} parentNodeRef parent nodeRef where this transient scene will be added
 	 * @returns {Promise} returns promise which gives nodeRef for transient scene.
 	 */
	ContentDeliveryService.prototype.loadTransientScene = function(sceneVeId, parentNodeRef) {
		var that = this;

		return new Promise(function(resolve, reject) {

			if (!sceneVeId || !parentNodeRef) {
				reject("invalid arguments");
				return;
			}

			if (that._transientSceneMap.has(sceneVeId)) {
				// if we already loaded this transientScene, just clone it
				var cloned = that._transientSceneMap.get(sceneVeId).clone(); // note this is cloned

				parentNodeRef.add(cloned);
				resolve({
					nodeRef: cloned
				});
				return;
			}

			if (!that._loader) { // check again
				reject("ContentDeliveryService is not initialised");
				return;
			}

			var transientRoot = new THREE.Object3D();
			transientRoot.name = "transient";

			var onSceneCompleted = function() {
				var context = that._loader.getState().getContext(sceneVeId);
				context.onSceneCompletedCallbacks.detach(onSceneCompleted); // clean up callback

				that._transientSceneMap.set(sceneVeId, transientRoot);

				var cloned = transientRoot.clone(); // note this is cloned.
				parentNodeRef.add(cloned);

				resolve({
					nodeRef: cloned
				});
			};

			var contextParams = {
				root: transientRoot,
				onSceneCompleted: onSceneCompleted
			};

			that._loader.request(sceneVeId, contextParams); // .request ends

		}); // promise ends
	};

	/**
 	 * Update contents from Content delivery service
	 * @param {string} sceneId target scene id to update.
	 * @param {string[]} sids target sids to update.
	 * @param {string} viewId optional. Associated view if exists
 	 * @returns {Promise} returns promise of content deliver service update
 	 */
	ContentDeliveryService.prototype.update = function(sceneId, sids, viewId) {
		if (!this._loader) {
			return Promise.reject("ContentDeliveryService is not initialised");
		} else {
			return Promise.resolve(this._loader.update(sceneId, sids, viewId));
		}
	};

	ContentDeliveryService.prototype.exit = function() {
		if (basePrototype.exit) {
			basePrototype.exit.call(this);
		}
		if (this._loader) {
			this._loader.dispose();
			this._loader = null;
		}

		this._transientSceneMap = null;
	};

	/**
 	 * Gets view object definition
	 * @param {string} sceneId target scene id
	 * @param {string} viewId view id
	 * @param {string} type type of view. (static or dynamic) - default static
 	 * @returns {sap.ui.vk.View} returns View object with definition
 	 */
	ContentDeliveryService.prototype.loadView = function(sceneId, viewId, type) {

		if (typeof type === "undefined") {
			type = "static";
		}

		return this._loader.requestView(sceneId, type, viewId).then(function(viewInfo) {



			var myView = new sap.ui.vk.View({
				name: viewInfo.name,
				nodeInfos: viewInfo.viewNodes
			});

			if (viewInfo.camera) {

				var defaultClipPlanes = true; // as explicit near far values cause more trouble than being efficient
				// we set it to true all the time.

				var recalculateZoom = false;
				if (viewInfo.camera.cameraInfo && viewInfo.camera.cameraInfo.zoom === -1) {
					recalculateZoom = true;
				}

				if (viewInfo.camera.type === "PerspectiveCamera") {
					myView.setCameraInfo({
						type: viewInfo.camera.type,
						fov: viewInfo.camera.cameraInfo.fov * 180 / Math.PI,
						position: viewInfo.camera.position.toArray(),
						nearClipPlane: viewInfo.camera.near,
						farClipPlane: viewInfo.camera.far,
						upDirection: viewInfo.camera.up.toArray(),
						targetDirection: viewInfo.camera.getWorldDirection().toArray(),
						usingDefaultClipPlanes: defaultClipPlanes
					});
				}

				if (viewInfo.camera.type === "OrthographicCamera") {
					myView.setCameraInfo({
						type: viewInfo.camera.type,
						zoomFactor: viewInfo.camera.zoom,
						position: viewInfo.camera.position.toArray(),
						nearClipPlane: viewInfo.camera.near,
						farClipPlane: viewInfo.camera.far,
						upDirection: viewInfo.camera.up.toArray(),
						targetDirection: viewInfo.camera.getWorldDirection().toArray(),
						usingDefaultClipPlanes: defaultClipPlanes,
						zoomNeedRecalculate: recalculateZoom
					});
				}
			}
			return myView;
		})
			.catch(function(error) {
				jQuery.sap.log.error(error);
				return null;
			});
	};


	/**
 	 * Assign material to an array of nodes, or to the nodes in the scene tree but not in the array of nodes, if a node is not a mesh node
	 * and has no material, the material is assigned to its descendent nodes.
	 * @param {string} sceneId target scene id
	 * @param {string} materialId material id
	 * @param {any[]} nodeRefs the array of node references.
	 * @param {boolean} assignToRestOfSceneTree if <code>false</code> or <code>undefined</code> assign metarial to the nodes in <code>nodeRefs</code>;
	 * 		  if <code>true</code> assign material to the nodes in the scene tree but not in <code>nodeRefs</code>
 	 * @returns {Promise} returns promise which gives <code>true</code> if material is successfully assigned, and <code>false</code> otherwise
 	 */
	ContentDeliveryService.prototype.assignMaterialToNodes = function(sceneId, materialId, nodeRefs, assignToRestOfSceneTree) {
		var that = this;
		return this._loader.requestMaterial(materialId).then(function(material) {

			function assignMaterial(material, nodeRef) {
				if (nodeRef === null || nodeRef === undefined) {
					return;
				}

				nodeRef.userData.materialId = materialId;
				if (nodeRef.userData.originalMaterial !== undefined && nodeRef.userData.originalMaterial !== material) {
					nodeRef.userData.originalMaterial = material;
					material.userData.materialUsed++;
				}

				if (nodeRef.material !== undefined && nodeRef.material !== material) {
					nodeRef.material = material;
					if (nodeRef.userData.originalMaterial !== undefined) {
						material.userData.materialUsed++;
					}
				}

				if (nodeRef.children === undefined || nodeRef.children === null) {
					return;
				}

				nodeRef.children.forEach(function(child) {
					assignMaterial(material, child);
				});
			}

			function assignMaterialToUnmarkedNode(material, nodeRef) {
				if (nodeRef.userData.markedForNotAssigningMaterial) {
					delete nodeRef.userData.markedForNotAssigningMaterial;
					return;
				}

				nodeRef.userData.materialId = materialId;
				if (nodeRef.userData.originalMaterial !== undefined && nodeRef.userData.originalMaterial !== material) {
					nodeRef.userData.originalMaterial = material;
					material.userData.materialUsed++;
				}

				if (nodeRef.material !== undefined && nodeRef.material !== material) {
					nodeRef.material = material;
					if (nodeRef.userData.originalMaterial !== undefined) {
						material.userData.materialUsed++;
					}
				}

				nodeRef.userData.materialId = materialId;
				if (nodeRef.userData.originalMaterial !== undefined && nodeRef.userData.originalMaterial !== material) {
					nodeRef.userData.originalMaterial = material;
					material.userData.materialUsed++;
				}

				if (nodeRef.children === undefined || nodeRef.children === null) {
					return;
				}

				nodeRef.children.forEach(function(child) {
					assignMaterialToUnmarkedNode(material, child);
				});
			}

			if (assignToRestOfSceneTree === undefined || !assignToRestOfSceneTree) {
				for (var i = 0; i < nodeRefs.length; i++) {
					assignMaterial(material, nodeRefs[ i ]);
				}
			} else {
				for (var j = 0; j < nodeRefs.length; j++) {
					nodeRefs[ j ].userData.markedForNotAssigningMaterial = true;
				}
				var context = that._loader.getState().contextMap.get(sceneId);
				var scene = context.root;
				assignMaterialToUnmarkedNode(material, scene);
			}

			that.fireSceneUpdated({});

			return true;
		})
			.catch(function(error) {
				jQuery.sap.log.error(error);
				return false;
			});
	};

	ContentDeliveryService.prototype.printLogTokens = function() {
		if (this._loader) {
			this._loader.printLogTokens();
			return true;
		} else {
			return false;
		}
	};

	return ContentDeliveryService;
});
