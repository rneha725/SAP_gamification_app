/*global jQuery, sap, localStorage, window */

sap.ui.define(["sap/ushell/plugins/BaseRTAPluginStatus", "sap/ui/core/Component", "sap/m/MessageBox", "sap/ui/core/BusyIndicator"], function (PluginStatus, Component, MessageBox, BusyIndicator) {
	"use strict";

	var STATUS_STARTING = PluginStatus.STATUS_STARTING;
	var STATUS_STARTED = PluginStatus.STATUS_STARTED;
	var STATUS_STOPPING = PluginStatus.STATUS_STOPPING;
	var STATUS_STOPPED = PluginStatus.STATUS_STOPPED;

	var BaseRTAPlugin = Component.extend("sap.ushell.plugins.BaseRTAPlugin", {
		sStatus: STATUS_STOPPED,
		sType: null,
		oStartingPromise: null,
		oStoppingPromise: null,
		/**
		 * Returns the shell renderer instance in a reliable way,
		 * i.e. independent from the initialization time of the plug-in.
		 * This means that the current renderer is returned immediately, if it
		 * is already created (plug-in is loaded after renderer creation) or it
		 * listens to the &quot;rendererCreated&quot; event (plug-in is loaded
		 * before the renderer is created).
		 *
		 *  @returns {object}
		 *      a jQuery promise, resolved with the renderer instance, or
		 *      rejected with an error message.
		 */
		_getRenderer: function (oContainer) {
			var oDeferred = new jQuery.Deferred(),
				oRenderer;

			oRenderer = oContainer.getRenderer();
			if (oRenderer) {
				this.oRenderer = oRenderer;
				oDeferred.resolve(oRenderer);
			} else {
				// renderer not initialized yet, listen to rendererCreated event
				this._onRendererCreated = function (oEvent) {
					oRenderer = oEvent.getParameter("renderer");
					if (oRenderer) {
						this.oRenderer = oRenderer;
						oDeferred.resolve(oRenderer);
					} else {
						oDeferred.reject("Illegal state: shell renderer not available after recieving 'rendererCreated' event.");
					}
				};
				oContainer.attachRendererCreatedEvent(this._onRendererCreated, this);
			}
			return oDeferred.promise();
		},

		init: function (mConfig) {
			this.mConfig = mConfig;
			this.i18n = this.getModel("i18n").getResourceBundle();
			var oContainer = this._getContainer();
			var oAppLifeCycleService = oContainer.getService("AppLifeCycle");

			if (this._checkUI5App()) {
				this._checkRestartRTA();
			}

			oAppLifeCycleService.attachAppLoaded(this._onAppLoaded, this);

			this._getRenderer(oContainer).fail(function (sErrorMessage) {
				jQuery.sap.log.error(sErrorMessage, undefined, this.mConfig.sComponentName);
			}.bind(this))
			.done(function (oRenderer) {
				//Button will only be added once even when more instances of this component are created
				oRenderer.addActionButton("sap.ushell.ui.launchpad.ActionItem", {
					id: this.mConfig.id,
					text: this.i18n.getText(this.mConfig.text),
					icon: this.mConfig.icon,
					press: this._onAdapt.bind(this),
					visible: this.mConfig.visible && this._checkUI5App()
				}, true, false, [oRenderer.LaunchpadState.App]);
			}.bind(this));
		},

		exit: function () {
			var oContainer = this._getContainer();
			oContainer.getService("AppLifeCycle").detachAppLoaded(this._onAppLoaded, this);
			if (this._onRendererCreated) {
				oContainer.detachRendererCreatedEvent(this._onRendererCreated, this);
			}
		},

		_onAppLoaded: function () {
			if (this._checkUI5App()) {
				this._checkRestartRTA();
				this._adaptButtonVisilibity(this.mConfig.id, true);
			} else {
				this._adaptButtonVisilibity(this.mConfig.id, false);
			}
		},

		_getContainer: function () {
			var oContainer = jQuery.sap.getObject("sap.ushell.Container");
			if (!oContainer) {
				throw new Error("Illegal state: shell container not available; this component must be executed in a unified shell runtime context.");
			}
			return oContainer;
		},

		/**
		 * Event handler for the "Adapt" button of the RTA FLP Plugin
		 * Checks the supported browsers and starts the RTA
		 * @private
		 */
		_onAdapt: function () {
			var bSupportedBrowser = ((sap.ui.Device.browser.msie && sap.ui.Device.browser.version > 10) || sap.ui.Device.browser.webkit || sap.ui.Device.browser.firefox || sap.ui.Device.browser.edge);

			if (!bSupportedBrowser) {
				MessageBox.error(this.i18n.getText("MSG_UNSUPPORTED_BROWSER"), {
					title: this.i18n.getText("ERROR_TITLE"),
					onClose: null
				});
			} else {
				this._startRta();
			}
		},

		_adaptButtonVisilibity : function (vControl, bVisible) {
			if (typeof vControl === "string") {
				vControl = sap.ui.getCore().byId(vControl);
			}

			if (!vControl) {
				return;
			}
			vControl.setVisible(bVisible);
		},

		/**
		 * Check if we are in a SAPUI5 application
		 * @param {object} oCurrentApplication object with information about the current application
		 * @private
		 * @returns {Boolean} if we are in a SAPUI5 application
		 */
		_checkUI5App: function () {
			var oCurrentApplication = this._getCurrentRunningApplication();
			var bUI5App = oCurrentApplication && oCurrentApplication.applicationType === "UI5" && !oCurrentApplication.homePage;
			return bUI5App;
		},

		/**
		 * Checks if RTA needs to be restarted, e.g after 'Reset to default'
		 * @private
		 */
		_checkRestartRTA: function () {
			var bRestart = !!window.localStorage.getItem("sap.ui.rta.restart." + this.mConfig.layer);
			if (bRestart) {
				window.localStorage.removeItem("sap.ui.rta.restart." + this.mConfig.layer);
				this._startRta();
			}
		},

		/**
		 * Gets the current root application
		 * @private
		 * @returns {object} Returns the currently running application
		 */
		_getCurrentRunningApplication: function () {
			var oAppLifeCycleService = this._getContainer().getService("AppLifeCycle");
			var oApp = oAppLifeCycleService.getCurrentApplication();

			return oApp;
		},

		/**
		 * Leaves the RTA adaptation mode and destroys the RTA
		 * @private
		 */
		_switchToDefaultMode: function () {
			if (this._oRTA) {
				this._oRTA.destroy();
				this.sStatus = STATUS_STOPPED;
				this.oStartingPromise = null;
				this.oStoppingPromise = null;
				this._oRTA = null;
			}
			sap.ui.getCore().getEventBus().unsubscribe("sap.ushell.renderers.fiori2.Renderer", "appClosed", this._onAppClosed, this);
		},

		/**
		 * Turns on the adaption mode of the RTA FLP plugin
		 * @private
		 */
		_startRta: function () {
			var oCurrentRunningApp = this._getCurrentRunningApplication();
			var oRootControl = oCurrentRunningApp.componentInstance.getAggregation("rootControl");
			var sStatus = this.sStatus;

			switch (sStatus) {
				case STATUS_STARTING:
					this.oStartingPromise = this.oStartingPromise;
					break;
				case STATUS_STARTED:
					this.oStartingPromise = Promise.resolve();
					break;
				case STATUS_STOPPING:
					this.oStartingPromise = this.oStoppingPromise.then(function () {
						return this._triggerStartRta(oRootControl);
					}.bind(this));
					break;
				case STATUS_STOPPED:
					this.oStartingPromise = this._triggerStartRta(oRootControl);
					break;
			}

			if (sStatus !== STATUS_STARTING) {
				this.oStartingPromise.then(function () {
					this.oStartingPromise = null;
				}.bind(this));
			}

			return this.oStartingPromise;
		},

		_triggerStartRta: function (oRootControl) {
			this.sStatus = STATUS_STARTING;
			return new Promise(function (fnResolve) {
				sap.ui.getCore().getEventBus().subscribe("sap.ushell.renderers.fiori2.Renderer", "appClosed", this._onAppClosed, this);
				BusyIndicator.show(0);

				sap.ui.getCore().loadLibraries(["sap.ui.dt", "sap.ui.rta"], {async: true}).then(function (){
					sap.ui.require(["sap/ui/rta/RuntimeAuthoring"], function (RuntimeAuthoring) {
						this._oRTA = new RuntimeAuthoring({
							rootControl: oRootControl,
							flexSettings: {
								layer: this.mConfig.layer,
								developerMode: this.mConfig.developerMode
							}
						});

						this._oRTA.attachEvent('start', function (oEvent) {
							this._onStartHandler(oEvent);
						}, this);

						this._oRTA.attachEvent('failed', this._errorHandler, this);
						this._oRTA.attachEvent('stop', this._switchToDefaultMode, this);

						this._loadPlugins(this._oRTA).then(function () {
							return this._oRTA.start()
								.then(function () {
									BusyIndicator.hide();
									fnResolve();
								})
								.catch(this._errorHandler.bind(this));
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}.bind(this)).then(function () {
				this.sStatus = STATUS_STARTED;
			}.bind(this));
		},

		_stopRta: function () {
			var sStatus = this.sStatus;
			switch (sStatus) {
				case STATUS_STARTING:
					this.oStoppingPromise = this.oStartingPromise.then(function () {
						return this._triggerStopRta.apply(this, arguments);
					}.bind(this));
					break;
				case STATUS_STARTED:
					this.oStoppingPromise = this._triggerStopRta.apply(this, arguments);
					break;
				case STATUS_STOPPING:
					this.oStoppingPromise = this.oStoppingPromise;
					break;
				case STATUS_STOPPED:
					this.oStoppingPromise = Promise.resolve();
					break;
			}

			if (sStatus !== STATUS_STOPPING) {
				this.oStoppingPromise.then(function () {
					this.oStoppingPromise = null;
				}.bind(this));
			}

			return this.oStoppingPromise;
		},

		_triggerStopRta: function () {
			this.sStatus = STATUS_STOPPING;

			return this._oRTA.stop.apply(this._oRTA, arguments).then(function () {
				this._switchToDefaultMode();
			}.bind(this));
		},

		_errorHandler: function (oError) {
			BusyIndicator.hide();
			if (oError === "Reload triggered") {
				this.sStatus = STATUS_STOPPED;
			} else {
				this._switchToDefaultMode();
				jQuery.sap.log.error("exception occured while starting sap.ui.rta", oError.stack);
				MessageBox.error(this.i18n.getText("MSG_STARTUP_FAILED"), {
					title: this.i18n.getText("ERROR_TITLE"),
					onClose: null
				});
			}
		},

		/**
		 * This function is called when the start event of RTA was fired
		 *
		 * @private
		 */
		_onStartHandler: function () {},

		/**
		 * This function should be used when custom plugins are needed
		 *
		 * @private
		 * @returns {Promise}
		 */
		_loadPlugins: function () {
			return Promise.resolve();
		},

		_onAppClosed: function () {
			// If the app gets closed (or navigated away from), RTA should be stopped without saving changes
			// or checking personalization changes (as the app should not be reloaded in this case)
			this._stopRta(/*bDontSaveChanges = */true, /*bSkipCheckPersChanges = */true);
		}
	});
	return BaseRTAPlugin;

}, true /* bExport */);