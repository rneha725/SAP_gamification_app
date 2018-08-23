sap.ui.define([
	"jquery.sap.global",
	"sap/ui/base/ObjectPool"
], function (jQuery, ObjectPool) {
	"use strict";

	var sKlayModule = "sap.ui.thirdparty";

	function PoolableWorker() {
		var sPath = jQuery.sap.getModulePath(sKlayModule, "/klay.js");
		this._worker = new Worker(sPath);
	}

	PoolableWorker.prototype.getWorker = function () {
		return this._worker;
	};

	PoolableWorker.prototype.init = function () {
	};

	PoolableWorker.prototype.reset = function () {
		this._worker.onmessage = null;
		this._worker.onerror = null;
	};


	/**
	 * A wrapper over klayjs which tries to send the layout job to worker thread if available.
	 *
	 * @static
	 * @private
	 * @since 1.50
	 * @alias sap.suite.ui.commons.networkgraph.layout.KlayWrapper
	 */
	var KlayWrapper = {};

	KlayWrapper._pool = new ObjectPool(PoolableWorker);

	KlayWrapper.layout = function (oParameters) {
		if (typeof (Worker) !== "undefined") {
			try {
				var oPooledWorker = KlayWrapper._pool.borrowObject(),
					oWorker = oPooledWorker.getWorker();
				oWorker.postMessage({
					graph: oParameters.graph,
					options: oParameters.options
				});
				oWorker.onmessage = function (oData) {
					if (oData.data.stacktrace) {
						oParameters.error(oData.data);
					} else {
						oParameters.success(oData.data);
					}
					KlayWrapper._pool.returnObject(oPooledWorker);
				};
				oWorker.onerror = function () {
					KlayWrapper._pool.returnObject(oPooledWorker);
					//In most cases onerror happens because Worker fialed to initialize, so we should try it locally.
					KlayWrapper.run(oParameters);
				};
			} catch (e) {
				KlayWrapper.run(oParameters);
			}
		} else {
			KlayWrapper.run(oParameters);
		}
	};

	KlayWrapper.run = function(oParameters) {
		var oKlay = KlayWrapper.getKlay();
		oKlay.layout(oParameters);
	};

	KlayWrapper.getKlay = function() {
		if (typeof ($klay) === "undefined"){
			jQuery.sap.require(sKlayModule + ".klay");
		}

		return $klay; // eslint-disable-line no-undef
	};

	return KlayWrapper;
}, true);
