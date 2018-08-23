sap.ui.define([
	"../MicroChart.controller"
], function (MicroChartController) {
	"use strict";

	var BulletMicroChartController = MicroChartController.extend("sap.fe.controls._MicroChart.BulletMicroChart.bulletMicroChart.controller", {
		constructor: function (oMicroChart) {
			MicroChartController.apply(this, arguments);
			this.oMicroChart = oMicroChart;
		}
	});
	return BulletMicroChartController;
});
