sap.ui.define([
	"jquery.sap.global"
], function (jQuery) {
	"use strict";

	var D3;

	/**
	 * A wrapper over D3.
	 *
	 * @static
	 * @private
	 * @since 1.50
	 * @alias sap.suite.ui.commons.networkgraph.layout.D3ForceWrapper
	 */
	var D3ForceWrapper = {};

	D3ForceWrapper._d3Path = jQuery.sap.getModulePath("sap.ui.thirdparty", "/d3.js");

	D3ForceWrapper.run = function (oParameters, resolve) {
		var graph = oParameters.graph;
		var force = D3ForceWrapper.getD3().layout.force()
			.nodes(graph.nodes)
			.links(graph.links)
			.alpha(oParameters.alpha)
			.friction(oParameters.friction)
			.charge(oParameters.charge)
			.start();

		setTimeout(force.stop, oParameters.maximumDuration);

		force.on("end", function () {
			resolve(graph);
		});
	};

	D3ForceWrapper.layout = function (oParameters) {
		return new Promise(function (resolve, reject) {
			D3ForceWrapper.run(oParameters, resolve);
		});
	};

	D3ForceWrapper.getD3 = function() {
		if (!D3) {
			jQuery.sap.require("sap/ui/thirdparty/d3");
			D3 = sap.ui.require("sap/ui/thirdparty/d3");
		}
		return D3;
	};

	return D3ForceWrapper;
}, true);
