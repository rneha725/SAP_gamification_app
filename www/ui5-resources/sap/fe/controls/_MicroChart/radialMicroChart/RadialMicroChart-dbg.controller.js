sap.ui.define([
	"../MicroChart.controller"
], function (MicroChartController) {
	"use strict";

	var RadialMicroChartController = MicroChartController.extend("sap.fe.controls._MicroChart.radialMicroChart.RadialMicroChart.controller", {
		constructor: function (oMicroChart) {
			MicroChartController.apply(this, arguments);
			this.oMicroChart = oMicroChart;
		}
	});

	return RadialMicroChartController;
});
