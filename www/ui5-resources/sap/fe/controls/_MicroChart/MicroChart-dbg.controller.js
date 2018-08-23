sap.ui.define([
	"sap/ui/base/Object"
], function (BaseObject) {
	"use strict";

	var MicroChartController = BaseObject.extend("sap.fe.controls._MicroChart.MicroChart.controller", {
		constructor: function (oMicroChart) {
			BaseObject.apply(this, arguments);
			this.oMicroChart = oMicroChart;
			this.oInnerMicroChart = oMicroChart.getInnerMicroChart();
		}
	});

	return MicroChartController;
});
