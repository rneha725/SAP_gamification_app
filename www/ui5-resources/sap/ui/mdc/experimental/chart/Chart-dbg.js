/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

/**
 /**
 * Constructor for a new Chart.
 *
 * @param {string} [sId] id for the new control, generated automatically if no id is given
 * @param {object} [mSettings] initial settings for the new control
 * @class The Chart control creates a chart based on metadata and the configuration specified.
 * @extends sap.ui.mdc.experimental.chart.Chart
 * @author SAP SE
 * @version 1.56.5
 * @constructor
 * @experimental
 * @private
 * @since 1.54.0
 * @alias sap.ui.mdc.experimental.chart.Chart
 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
 */
sap.ui.define([
	'jquery.sap.global', 'sap/m/library', 'sap/ui/core/XMLComposite', "sap/m/OverflowToolbar", 'sap/m/ToolbarDesign', "sap/m/FlexItemData"
], function(jQuery, MLibrary, XMLComposite, OverflowToolbar, ToolbarDesign, FlexItemData) {
	"use strict";

	var Chart = XMLComposite.extend("sap.ui.mdc.experimental.chart.Chart", /** @lends sap.ui.mdc.experimental.chart.Chart.prototype */
	{
		metadata: {
			/*"abstract": true,*/
			library: "sap.ui.mdc",
			defaultAggregation: "",
			properties: {
				/**
				 * The entity set name from which to fetch data and generate the columns.<br>
				 * <b>Note</b> This is not a dynamic property.
				 */
				entitySet: {
					type: "string",
					group: "Misc",
					defaultValue: null
				},
				/**
				 * Specifies the type of chart to be created by the SmartChart control.
				 */
				chartType: {
					type: "string",
					group: "Misc",
					defaultValue: null
				},
				/**
				 * Specifies header text that is shown in the chart.
				 */
				header: {
					type: "string",
					group: "Misc",
					defaultValue: null
				},
				/**
				 * Controls the visibility of the Details button. If set to <code>true</code>, the datapoint tooltip will be disabled as the
				 * information of selected datapoints will be found in the details popover. This will also set the drill-down button to invisible.
				 *
				 */
				showDetailsButton: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				/**
				 * Controls the visibility of the Breadcrumbs control for drilling up within the visible dimensions. If set to <code>true</code>,
				 * the toolbar header will be replaced by the Breadcrumbs control. This will also set the drill-up button to invisible.
				 *
				 */
				showDrillBreadcrumbs: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				/**
				 * Controls the visibility of the chart tooltip. If set to <code>true </code>, an instance of sap.viz.ui5.controls.VizTooltip will
				 * be created and shown when hovering over a data point.
				 *
				 */
				showChartTooltip: {
					type: "boolean",
					group: "Misc",
					defaultValue: true
				},
				/**
				 * Controls the visibility of the toolbar.
				 *
				 */
				showToolbar: {
					type: "boolean",
					group: "Misc",
					defaultValue: true
				}
			},
			aggregations: {
				/**
				 * A custom toolbar that can be specified by the user to define their own buttons, icons, etc. If this is added, the SmartChart
				 * control does not create its own toolbar, but uses this one instead. However, if default actions, such as showSemanticNavigation,
				 * showFullScreenButton etc. are set, these actions are added at the left-hand side of the toolbar.
				 */
				toolbar: {
					type: "sap.m.Toolbar",
					multiple: false
				},
				dimensions: {
					type: "sap.chart.data.Dimension",
					multiple: true,
					forwarding: {
						idSuffix: "--innerChart",
						aggregation: "dimensions"
					}
				},
				measures: {
					type: "sap.chart.data.Measure",
					multiple: true,
					forwarding: {
						idSuffix: "--innerChart",
						aggregation: "measures"
					}
				}
			}
		}
	});
	// ----------------------- Overwritten Methods -----------------
	Chart.prototype.init = function() {
		jQuery.sap.log.info("Chart init");

		sap.m.FlexBox.prototype.init.call(this);
		this.addStyleClass("sapUiMdcChart");
	};

	// ----------------------- Private Methods ------------------
	Chart.prototype._getChart = function() {
		return sap.ui.getCore().byId(this.getId() + "--innerChart") || null;
	};

	/*Chart.prototype._createChart = function(){
		var aContent = this.getItems();
		var iLen = aContent ? aContent.length : 0;
		var oChart;
	};*/

	/*Chart.prototype._getToolbar = function(){

	};

	Chart.prototype._createToolbar = function() {
		// If no toolbar exists --> create one
		if (!this._oToolbar) {
			this._oToolbar = new OverflowToolbar({
				design: ToolbarDesign.Transparent,
				height: "auto"
			});
			this._oToolbar.addStyleClass("sapUiCompSmartChartToolbar");
		}
		this._oToolbar.setLayoutData(new FlexItemData({
			shrinkFactor: 0
		}));
		this.insertItem(this._oToolbar, 0);
		this._oToolbar.setVisible(this.getShowToolbar());
		//this._oToolbar.setStyle(this.getToolbarStyle());
	};

	// ----------------------- Public Methods ------------------
	Chart.prototype.setToolbar = function(oToolbar) {
		if (this._oToolbar) {
			this.removeItem(this._oToolbar);
		}
		this._oToolbar = oToolbar;
		this._bUpdateToolbar = true;
		//adapt toolbar visibility
		this._oToolbar.setVisible(this.getShowToolbar());
		//this._oToolbar.setStyle(this.getToolbarStyle());
	};

	Chart.prototype.getToolbar = function() {
		return this._oToolbar;
	};*/

	return Chart;
}, /* bExport= */true);
