sap.ui.define([
	"../MicroChart.controller"
], function (MicroChartController) {
	"use strict";

	var HarveyBallMicroChartController = MicroChartController.extend("sap.fe.controls._MicroChart.harveyBallMicroChart.HarveyBallMicroChart.controller", {
		constructor: function (oMicroChart) {
			MicroChartController.apply(this, arguments);
			this.oMicroChart = oMicroChart;
		}
	});

	return HarveyBallMicroChartController;
});
