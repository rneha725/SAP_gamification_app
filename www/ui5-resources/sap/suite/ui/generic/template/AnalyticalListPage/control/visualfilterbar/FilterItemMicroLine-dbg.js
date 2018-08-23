sap.ui.define(["sap/suite/ui/microchart/InteractiveLineChart",
	"sap/suite/ui/microchart/InteractiveLineChartPoint",
	"sap/ui/model/json/JSONModel",
	"sap/suite/ui/generic/template/AnalyticalListPage/control/visualfilterbar/FilterItemMicroChart",
	"sap/suite/ui/generic/template/AnalyticalListPage/util/CriticalityUtil",
	"sap/suite/ui/generic/template/AnalyticalListPage/util/FilterUtil"],
	function(InteractiveLineChart, InteractiveLineChartPoint, JSONModel, FilterItemMicroChart, CriticalityUtil, FilterUtil) {
	"use strict";

	/* all visual filters should extend this class */
	var FilterItemMicroLine = FilterItemMicroChart.extend("sap.suite.ui.generic.template.AnalyticalListPage.control.visualfilterbar.FilterItemMicroLine", {
		metadata: {
			properties: {
				labelWidthPercent: { type: "float", group: "Misc", defaultValue: 1 / 3 },
				fixedCount: {type: "int", defaultValue: 6}
			},
			aggregations: {
				control: {type: "sap.suite.ui.microchart.InteractiveLineChart", multiple : false}
			}
		},
		renderer:{}
	});

	FilterItemMicroLine.prototype.init = function() {
		this._chart = new InteractiveLineChart({
			maxDisplayedPoints : 6,
			selectionEnabled : true,
			points : []
		});
		this.setControl(this._chart);
		this.setModel(new JSONModel(), '__alp_chartJSONModel');
		this._sorters = [];
		FilterItemMicroChart.prototype.init.apply(this, arguments);
	};

	FilterItemMicroLine.prototype._updateBinding = function() {
		//Ensuring not to continue for initial load and if this.getLazyLoadVisualFilter() == true
		//thus, ensuring the call gets only called when the user switches to visualFilter
		if (!this._bFirstTimeRender && this.getLazyLoadVisualFilter()){
			return;
		}
		this.applyOverlay();
		//To show the Busy Indicator immediately,
		//so that blank screen/chart is not shown
		this._chart.setBusyIndicatorDelay(0);
		// Set Chart to busy before rebinding
		this._chart.setBusy(true);
		this._chart.unbindPoints();
		// Make sure all binding are available
		var entityName = this.getEntitySet(),
		dimField = this.getDimensionField(),
		dimFieldDisplay = this.getDimensionFieldDisplay(),
		measureField = this.getMeasureField(),
		unitField = this.getUnitField(),
		filter = this.getDimensionFilterExternal(),
		aSortFields = [],
		aSortOrder = this.getSortOrder(),
		oModel = this.getModel(),
		oMetaModel = oModel.getMetaModel(),
		oSortObject = FilterItemMicroChart._getSorter(aSortOrder);
		this._sorters = oSortObject.sorter;
		aSortFields = oSortObject.sortFields;

		if (!entityName || !measureField || !dimField || !dimFieldDisplay) {// All fields must be present
			return;
		}
		var selectFields = [measureField, dimField],
		navProperty = FilterUtil.IsNavigationProperty(this.getModel(), entityName, dimFieldDisplay) ? dimFieldDisplay.split("/")[0] : null,
		aNavigationPropertyKeys = FilterUtil.getKeysForNavigationEntitySet(oMetaModel, this.getEntitySet(), navProperty),
		selectFields = FilterUtil.getVisualFilterSelectFields(measureField, dimField, dimFieldDisplay, unitField, aSortFields, aNavigationPropertyKeys);

		var filterList = [];
		if (filter && filter.aFilters && filter.aFilters.length > 0) {
			filterList = [filter];
		}

		var me = this;
		var count = this.getFixedCount();

		var oModel = this.getModel(),
		oVisualFilterModel = this.getModel("visualFilter") || oModel;
		var sBindingPath = "/" + entityName;

		// odata call to get top 4 data
		if (oModel) {
			var oDatapoint = CriticalityUtil.getDataPoint(oModel, this);
			if (oDatapoint) {
				(oDatapoint.ValueFormat && oDatapoint.ValueFormat.ScaleFactor) ? this.setScaleFactor(FilterUtil.getPrimitiveValue(oDatapoint.ValueFormat.ScaleFactor)) : this.setScaleFactor(null);
				(oDatapoint.ValueFormat && oDatapoint.ValueFormat.NumberOfFractionalDigits) ? this.setNumberOfFractionalDigits(FilterUtil.getPrimitiveValue(oDatapoint.ValueFormat.NumberOfFractionalDigits)) : this.setNumberOfFractionalDigits(null);
				var aRelativeToProperties = CriticalityUtil.getCriticalityRefProperties(oDatapoint);
			}
			sBindingPath = this._getPathForVisualFilter(oModel, entityName);
			if (!sBindingPath) {
				return;
			}
			//To abort the previous read requests before calling read() again
			if (this._oObject) {
				//jQuery.sap.log.info("abort() called in Line chart");
				this._oObject.abort();
			}
			var oUrlParameters = {
					"$select": aRelativeToProperties ? [aRelativeToProperties].concat(selectFields).join(",") : selectFields.join(","),
					"$top": count
				};
			if (navProperty) {
				jQuery.extend(oUrlParameters, {"$expand": navProperty});
			}

			this._oObject = oVisualFilterModel.read(sBindingPath, {
				async: true,
				filters: filterList,
				sorters: this._sorters,
				urlParameters: oUrlParameters,
				success: function(data, response) {
					me._oObject = null;
					data = oDatapoint ? CriticalityUtil.CalculateCriticality(oDatapoint, data, me.getMeasureField()) : data;
					me._onDataReceived(data);
				},
				error: function(oError) {
					jQuery.sap.log.error("Error reading URL:" + oError);
					if (oError && oError.statusCode !== 0 && oError.statusText !== "abort") {
						me.applyOverlay(me.technicalIssueMessage);
						me._oObject = null;
					}
				}
			});
		}
	};

	FilterItemMicroLine.prototype._onDataReceived = function(data) {
		if (!data || !data.results || !data.results.length) {
			this.applyOverlay(this.noDataIssueMessage);
			return;
		}

		var aData = this.getDimensionFieldIsDateTime() ? data.results.slice().reverse() : data.results;
		FilterItemMicroChart.prototype._onDataReceived.call(this, data.results);
		this.getModel('__alp_chartJSONModel').setData(aData);
		this._chart.setModel(this.getModel('__alp_chartJSONModel'));

		var count = this.getFixedCount(),
			dataBinding = {
			path: '/',
			template: new InteractiveLineChartPoint(this._getChartAggregationSettings()),
			startIndex: 0,
			length: count
		};

		this._chart.bindPoints(dataBinding);
		this._chart.setBusy(false);
	};
	return FilterItemMicroLine;

}, /* bExport= */ true);