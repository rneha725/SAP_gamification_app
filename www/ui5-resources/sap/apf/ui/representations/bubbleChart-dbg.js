/*!
 * SAP APF Analysis Path Framework
 * 
 * (c) Copyright 2012-2014 SAP SE. All rights reserved
 */
jQuery.sap.declare("sap.apf.ui.representations.bubbleChart");
jQuery.sap.require("sap.apf.core.constants");
jQuery.sap.require("sap.apf.ui.representations.BaseVizFrameChartRepresentation");
/**
 * @class columnChart constructor.
 * @param oParametersdefines parameters required for chart such as Dimension/Measures,tooltip, axis information.
 * @returns chart object
 */
(function() {
	"use strict";
	sap.apf.ui.representations.bubbleChart = function(oApi, oParameters) {
		sap.apf.ui.representations.BaseVizFrameChartRepresentation.apply(this, [ oApi, oParameters ]);
		this.type = sap.apf.ui.utils.CONSTANTS.representationTypes.BUBBLE_CHART;
		this.chartType = sap.apf.ui.utils.CONSTANTS.vizFrameChartTypes.BUBBLE;
		this._addDefaultKind();
	};
	sap.apf.ui.representations.bubbleChart.prototype = Object.create(sap.apf.ui.representations.BaseVizFrameChartRepresentation.prototype);
	//Set the "constructor" property to refer to bubbleChart
	sap.apf.ui.representations.bubbleChart.prototype.constructor = sap.apf.ui.representations.bubbleChart;
	/** 
	 * @private
	 * @method _addDefaultKind
	 * @description reads the oParameters for chart and modifies it by including a default kind
	 * in case the "kind" property is not defined in dimension/measures
	 */
	sap.apf.ui.representations.bubbleChart.prototype._addDefaultKind = function() {
		this.parameter.measures.forEach(function(measure, index) {
			if (measure.kind === undefined) {//handle the scenario where the kind is not available
				if (index === 0) {
					measure.kind = sap.apf.core.constants.representationMetadata.kind.XAXIS;
				} else if (index === 1) {
					measure.kind = sap.apf.core.constants.representationMetadata.kind.YAXIS;
				} else {
					measure.kind = sap.apf.core.constants.representationMetadata.kind.BUBBLEWIDTH;
				}
			}
		});
		this.parameter.dimensions.forEach(function(dimension, index) {
			if (dimension.kind === undefined) {//handle the scenario where the kind is not available
				dimension.kind = index === 0 ? sap.apf.core.constants.representationMetadata.kind.REGIONCOLOR : sap.apf.core.constants.representationMetadata.kind.REGIONSHAPE;
			}
		});
	};
	/** 
	 * @method setVizPropsForSpecificRepresentation
	 * @description sets the vizProperties specific to the representation on main chart.
	 */
	sap.apf.ui.representations.bubbleChart.prototype.setVizPropsForSpecificRepresentation = function() {
		var  oChartProps = sap.apf.ui.representations.BaseVizFrameChartRepresentation._setVizPropsForBubbleAndScatter(this.parameter.dimensions, true);
		this.chart.setVizProperties(oChartProps);
	};
	/** 
	* @method setVizPropsForSpecificRepresentation
	* @description sets the vizProperties specific to the representation on thumbnail chart
	*/
	sap.apf.ui.representations.bubbleChart.prototype.setVizPropsOfThumbnailForSpecificRepresentation = function() {
		var  oChartProps = sap.apf.ui.representations.BaseVizFrameChartRepresentation._setVizPropsForBubbleAndScatter(this.parameter.dimensions, false);
		this.thumbnailChart.setVizProperties(oChartProps);
	};
	sap.apf.ui.representations.bubbleChart.prototype.getAxisFeedItemId = function(sKind) {
		var oSupportedTypes = sap.apf.core.constants.representationMetadata.kind;
		var axisfeedItemId;
		switch (sKind) {
			case oSupportedTypes.REGIONCOLOR:
				axisfeedItemId = sap.apf.core.constants.vizFrame.feedItemTypes.COLOR;
				break;
			case oSupportedTypes.REGIONSHAPE:
				axisfeedItemId = sap.apf.core.constants.vizFrame.feedItemTypes.SHAPE;
				break;
			case oSupportedTypes.XAXIS:
				axisfeedItemId = sap.apf.core.constants.vizFrame.feedItemTypes.VALUEAXIS;
				break;
			case oSupportedTypes.YAXIS:
				axisfeedItemId = sap.apf.core.constants.vizFrame.feedItemTypes.VALUEAXIS2;
				break;
			case oSupportedTypes.BUBBLEWIDTH:
				axisfeedItemId = sap.apf.core.constants.vizFrame.feedItemTypes.BUBBLEWIDTH;
				break;
			default:
				break;
		}
		return axisfeedItemId;
	};
}());