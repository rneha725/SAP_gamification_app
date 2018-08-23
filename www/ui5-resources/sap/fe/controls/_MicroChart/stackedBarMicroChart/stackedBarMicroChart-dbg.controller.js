sap.ui.define([
	"../MicroChart.controller"
], function (MicroChartController) {
	"use strict";

	var StackedBarMicroChartController = MicroChartController.extend("sap.fe.controls._MicroChart.stackedBarMicroChart.StackedBarMicroChart.controller", {
		constructor: function (oMicroChart) {
			MicroChartController.apply(this, arguments);
			this.oMicroChart = oMicroChart;
		}
	});

	return StackedBarMicroChartController;
});
