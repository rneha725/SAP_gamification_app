sap.ui.define([
	"../MicroChart.controller"
], function (MicroChartController) {
	"use strict";

	var DeltaMicroChartController = MicroChartController.extend("sap.fe.controls._MicroChart.deltaMicroChart.DeltaMicroChart.controller", {
		constructor: function (oMicroChart) {
			MicroChartController.apply(this, arguments);
			this.oMicroChart = oMicroChart;
		}
	});

	return DeltaMicroChartController;
});
