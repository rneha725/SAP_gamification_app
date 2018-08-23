sap.ui.define("sap/fe/MicroChart", [
		'jquery.sap.global',
		'sap/ui/mdc/XMLComposite',
		'sap/ui/base/ManagedObject',
		'sap/ui/Device',
		'sap/fe/controls/_MicroChart/bulletMicroChart/BulletMicroChart.controller',
		'sap/fe/controls/_MicroChart/radialMicroChart/RadialMicroChart.controller',
		'sap/fe/controls/_MicroChart/harveyBallMicroChart/HarveyBallMicroChart.controller',
		'sap/fe/controls/_MicroChart/deltaMicroChart/DeltaMicroChart.controller',
		'sap/fe/controls/_MicroChart/stackedBarMicroChart/StackedBarMicroChart.controller',
		'sap/m/ValueColor'
	], function (jQuery, XMLComposite, ManagedObject, Device, BulletMicroChartController, RadialMicroChartController, HarveyBallMicroChartController, DeltaMicroChartController, StackedBarMicroChartController, ValueColor) {
		"use strict";
		var BulletMicroChartName = "sap.suite.ui.microchart.BulletMicroChart",
			RadialMicroChartName = "sap.suite.ui.microchart.RadialMicroChart",
			HarveyBallMicroChartName = "sap.suite.ui.microchart.HarveyBallMicroChart",
			DeltaMicroChartName = "sap.suite.ui.microchart.DeltaMicroChart",
			StackedBarMicroChartName = "sap.suite.ui.microchart.StackedBarMicroChart";

		var MicroChart = XMLComposite.extend("sap.fe.MicroChart", {
			metadata: {
				designTime: true,
				specialSettings: {
					metadataContexts: {
						defaultValue: "{ model: 'chartAnnotationModel', path:'',name: 'chartAnnotation'}"
					}
				},
				properties: {
					title: {
						type: "any",
						invalidate: "template"
					}
				},
				events: {},
				aggregations: {},
				publicMethods: []
			},
			alias: "this",
			fragment: "sap.fe.controls._MicroChart.MicroChart"
		});

		MicroChart.prototype.init = function () {
			XMLComposite.prototype.init.call(this);
			var oInnerChart = this.getInnerMicroChart(),
				sControlName = oInnerChart.getMetadata().getName();
			if ([BulletMicroChartName, RadialMicroChartName, HarveyBallMicroChartName, DeltaMicroChartName, StackedBarMicroChartName].join(" ").indexOf(sControlName) > -1) {
				if (sControlName === BulletMicroChartName) {
					this.oMicroChartController = new BulletMicroChartController(this);
				} else if (sControlName === RadialMicroChartName) {
					this.oMicroChartController = new RadialMicroChartController(this);
				} else if (sControlName === HarveyBallMicroChartName) {
					this.oMicroChartController = new HarveyBallMicroChartController(this);
				}else if (sControlName === DeltaMicroChartName) {
					this.oMicroChartController = new DeltaMicroChartController(this);
				} else if (sControlName === StackedBarMicroChartName) {
					this.oMicroChartController = new StackedBarMicroChartController(this);
				}
			}
		};
		MicroChart.prototype.getInnerMicroChart = function () {
			/*
			 get access to the rendered chart - currently it's the second one in the layout. whenever we change the
			 layout we need to adapt this coding. Going upwards to the the view and to access it via ID would take
			 much longer. Any other ideas are welcome
			 */
			return this.get_content();
		};
		MicroChart._helper = {
			/**
			 * Method to determine the criticality of the microchart
			 *
			 * @param {Object} [oDataPoint] Datapoint object read from the annotation
			 * @param {Object} [value] value object passed from fragment
			 * @returns {String} Returns criticality as expression binding
			 */
			getMicroChartColor: function(oDataPoint, value) {
				var sState = ValueColor.Neutral;
				if (oDataPoint) {
					if (oDataPoint.Criticality) {
						sState = MicroChart._helper._criticalityFromPath(oDataPoint, value);
					} else if (oDataPoint.CriticalityCalculation) {
						sState = MicroChart._helper._criticalityCalculation(oDataPoint, value);
					} else {
						jQuery.sap.log.warning("Returning the default value Neutral");
					}
				}
				return sState;
			},

			/**
			 * Method to do the calculation of criticality in case CriticalityCalculation present in the annotation
			 *
			 * The calculation is done by comparing a value to the threshold values relevant for the specified improvement direction.
			 * For improvement direction Target, the criticality is calculated using both low and high threshold values. It will be
			 * 
			 *	- Positive if the value is greater than or equal to AcceptanceRangeLowValue and lower than or equal to AcceptanceRangeHighValue
			 *	- Neutral if the value is greater than or equal to ToleranceRangeLowValue and lower than AcceptanceRangeLowValue OR greater than AcceptanceRangeHighValue and lower than or equal to ToleranceRangeHighValue
			 *	- Critical if the value is greater than or equal to DeviationRangeLowValue and lower than ToleranceRangeLowValue OR greater than ToleranceRangeHighValue and lower than or equal to DeviationRangeHighValue
			 *	- Negative if the value is lower than DeviationRangeLowValue or greater than DeviationRangeHighValue
			 * 
			 * For improvement direction Minimize, the criticality is calculated using the high threshold values. It is
			 * 	- Positive if the value is lower than or equal to AcceptanceRangeHighValue
			 * 	- Neutral if the value is greater than AcceptanceRangeHighValue and lower than or equal to ToleranceRangeHighValue
			 * 	- Critical if the value is greater than ToleranceRangeHighValue and lower than or equal to DeviationRangeHighValue
			 * 	- Negative if the value is greater than DeviationRangeHighValue
			 * 
			 * For improvement direction Maximize, the criticality is calculated using the low threshold values. It is
			 *
			 *	- Positive if the value is greater than or equal to AcceptanceRangeLowValue
			 *	- Neutral if the value is less than AcceptanceRangeLowValue and greater than or equal to ToleranceRangeLowValue
			 *	- Critical if the value is lower than ToleranceRangeLowValue and greater than or equal to DeviationRangeLowValue
			 *	- Negative if the value is lower than DeviationRangeLowValue
			 *
			 * Thresholds are optional. For unassigned values, defaults are determined in this order:
			 *
			 *	- For DeviationRange, an omitted LowValue translates into the smallest possible number (-INF), an omitted HighValue translates into the largest possible number (+INF)
			 *	- For ToleranceRange, an omitted LowValue will be initialized with DeviationRangeLowValue, an omitted HighValue will be initialized with DeviationRangeHighValue
			 *	- For AcceptanceRange, an omitted LowValue will be initialized with ToleranceRangeLowValue, an omitted HighValue will be initialized with ToleranceRangeHighValue
			 *
			 * @param {Object} [oDataPoint] Datapoint object read from the annotation
			 * @param {Object} [value] value object passed from fragment
			 * @returns {String} Returns criticality as expression binding
			 * @private
			 */
			_criticalityCalculation: function (oDataPoint, value) {
				var oCriticality = oDataPoint.CriticalityCalculation,
					sCriticalityDirection = oCriticality.ImprovementDirection && oCriticality.ImprovementDirection.$EnumMember,
					sToleranceHigh = typeof oCriticality.ToleranceRangeHighValue === 'object' ? +oCriticality.ToleranceRangeHighValue.$Decimal : oCriticality.ToleranceRangeHighValue,
					sToleranceLow = typeof oCriticality.ToleranceRangeLowValue === 'object' ? +oCriticality.ToleranceRangeLowValue.$Decimal : oCriticality.ToleranceRangeLowValue,
					sDeviationHigh = typeof oCriticality.DeviationRangeHighValue === 'object' ? +oCriticality.DeviationRangeHighValue.$Decimal : oCriticality.DeviationRangeHighValue,
					sDeviationLow = typeof oCriticality.DeviationRangeLowValue === 'object' ? +oCriticality.DeviationRangeLowValue.$Decimal : oCriticality.DeviationRangeLowValue,
					sAcceptanceHigh = typeof oCriticality.AcceptanceRangeHighValue === 'object' ? +oCriticality.AcceptanceRangeHighValue.$Decimal : oCriticality.AcceptanceRangeHighValue,
					sAcceptanceLow = typeof oCriticality.AcceptanceRangeLowValue === 'object' ? +oCriticality.AcceptanceRangeLowValue.$Decimal : oCriticality.AcceptanceRangeLowValue,
					sCriticalityExpression = ValueColor.Neutral;

				if (sCriticalityDirection === "com.sap.vocabularies.UI.v1.ImprovementDirectionType/Minimize") {
					if (typeof sAcceptanceHigh === 'number' && typeof sDeviationHigh === 'number' && typeof sToleranceHigh === 'number') {
						sCriticalityExpression = "{= %{" + value.$PropertyPath + "} <= " + sAcceptanceHigh + " ? '" + ValueColor.Good + "' : " +
							"(%{" + value.$PropertyPath + "} <= " + sDeviationHigh + " ? " +
							"(%{" + value.$PropertyPath + "} > " + sToleranceHigh + " ? '" + ValueColor.Critical + "' : '" + ValueColor.Neutral + "') : '" + ValueColor.Error + "') }";
					} else {
						if (typeof sAcceptanceHigh === 'number' && typeof sToleranceHigh === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} <= " + sAcceptanceHigh + " ? '" + ValueColor.Good + "' : " +
								"%{" + value.$PropertyPath + "}  <= " + sToleranceHigh + " ? '" + ValueColor.Neutral + "' : '" + ValueColor.Critical + "' }";
						} else if (typeof sAcceptanceHigh === 'number' && typeof sDeviationHigh === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} <= " + sAcceptanceHigh + " ? '" + ValueColor.Good + "' : " +
								"%{" + value.$PropertyPath + "}  <= " + sDeviationHigh + " ? '" + ValueColor.Neutral + "' : '" + ValueColor.Error + "' }";
						} else if (typeof sToleranceHigh === 'number' && typeof sDeviationHigh === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} <= " + sToleranceHigh + " ? '" + ValueColor.Good + "' : " +
								"%{" + value.$PropertyPath + "}  <= " + sDeviationHigh + " ? '" + ValueColor.Critical + "' : '" + ValueColor.Error + "' }";
						}
					}

				} else if (sCriticalityDirection === "com.sap.vocabularies.UI.v1.ImprovementDirectionType/Maximize") {
					if (typeof sDeviationLow === 'number' && typeof sAcceptanceLow === 'number' && typeof sToleranceLow === 'number') {
						sCriticalityExpression = "{= %{" + value.$PropertyPath + "} >= " + sAcceptanceLow + " ? '" + ValueColor.Good + "' : " +
							"(%{" + value.$PropertyPath + "} >= " + sDeviationLow + " ? " +
							"(%{" + value.$PropertyPath + "} >= " + sToleranceLow + " ? '" + ValueColor.Neutral + "' : '" + ValueColor.Critical + "') : '" + ValueColor.Error + "') }";
					} else {
						if (typeof sAcceptanceLow === 'number' && typeof sToleranceLow === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} >= " + sAcceptanceLow + " ? '" + ValueColor.Good + "' : " +
								"%{" + value.$PropertyPath + "}  >= " + sToleranceLow + " ? '" + ValueColor.Neutral + "' : '" + ValueColor.Critical + "' }";
						} else if (typeof sAcceptanceLow === 'number' && typeof sDeviationLow === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} >= " + sAcceptanceLow + " ? '" + ValueColor.Good + "' : " +
								"%{" + value.$PropertyPath + "}  >= " + sDeviationLow + " ? '" + ValueColor.Neutral + "' : '" + ValueColor.Error + "' }";
						} else if (typeof sToleranceLow === 'number' && typeof sDeviationLow === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} >= " + sToleranceLow + " ? '" + ValueColor.Good + "' : " +
								"%{" + value.$PropertyPath + "}  >= " + sDeviationLow + " ? '" + ValueColor.Critical + "' : '" + ValueColor.Error + "' }";
						}
					}

				} else if (sCriticalityDirection === 'com.sap.vocabularies.UI.v1.ImprovementDirectionType/Target') {
					if (typeof sDeviationLow === 'number' && typeof sDeviationHigh === 'number' && typeof sToleranceLow === 'number' && typeof sToleranceHigh === 'number' && typeof sAcceptanceLow === 'number' && typeof sAcceptanceHigh === 'number') {
						sCriticalityExpression = "{= %{" + value.$PropertyPath + "} < " + sDeviationLow + " ? '" + ValueColor.Error + "' : " +
							"(%{" + value.$PropertyPath + "} > " + sDeviationHigh + " ? '" + ValueColor.Error + "' : " +
							"(%{" + value.$PropertyPath + "} >= " + sToleranceLow + " && %{" + value.$PropertyPath + "} <= " + sToleranceHigh + " ? " +
							"(%{" + value.$PropertyPath + "} >= " + sAcceptanceLow + " && %{" + value.$PropertyPath + "} <= " + sAcceptanceHigh + " ? '" + ValueColor.Good + "' : '" + ValueColor.Neutral + "') : '" + ValueColor.Critical + "')) }";
					} else {
						if (typeof sToleranceLow === 'number' && typeof sToleranceHigh === 'number' && typeof sAcceptanceLow === 'number' && typeof sAcceptanceHigh === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} < " + sToleranceLow + " ? '" + ValueColor.Critical + "' : " +
								"(%{" + value.$PropertyPath + "} > " + sToleranceHigh + " ? '" + ValueColor.Critical + "' : " +
								"(%{" + value.$PropertyPath + "} >= " + sAcceptanceLow + " && %{" + value.$PropertyPath + "} <= " + sAcceptanceHigh + " ? '" + ValueColor.Good + "' : '" + ValueColor.Neutral + "')) }";
						}
						if (typeof sDeviationLow === 'number' && typeof sDeviationHigh === 'number' && typeof sAcceptanceLow === 'number' && typeof sAcceptanceHigh === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} < " + sDeviationLow + " ? '" + ValueColor.Error + "' : " +
								"(%{" + value.$PropertyPath + "} > " + sDeviationHigh + " ? '" + ValueColor.Error + "' : " +
								"(%{" + value.$PropertyPath + "} >= " + sAcceptanceLow + " && %{" + value.$PropertyPath + "} <= " + sAcceptanceHigh + " ? '" + ValueColor.Good + "' : '" + ValueColor.Neutral + "')) }";
						}
						if (typeof sDeviationLow === 'number' && typeof sDeviationHigh === 'number' && typeof sToleranceLow === 'number' && typeof sToleranceHigh === 'number') {
							sCriticalityExpression = "{= %{" + value.$PropertyPath + "} < " + sDeviationLow + " ? '" + ValueColor.Error + "' : " +
								"(%{" + value.$PropertyPath + "} > " + sDeviationHigh + " ? '" + ValueColor.Error + "' : " +
								"(%{" + value.$PropertyPath + "} >= " + sToleranceLow + " && %{" + value.$PropertyPath + "} <= " + sToleranceHigh + " ? '" + ValueColor.Good + "' : '" + ValueColor.Critical + "')) }";
						}
					}

				} else {
					jQuery.sap.log.warning("Case not supported, returning the default Value Neutral");
				}

				return sCriticalityExpression;
			},

			/**
			 * Method to do the calculation of criticality in case criticality is given in terms of constant/path
			 *
			 * @param {Object} [dataPoint] Datapoint object read from the annotation
			 * @param {Object} [value] value object passed from fragment
			 * @returns {String} Returns criticality as expression binding
			 * @private
			 */
			_criticalityFromPath: function(dataPoint, value) {
				var sFormatCriticalityExpression = ValueColor.Neutral;
				var sExpressionTemplate;
				var oCriticalityProperty = dataPoint.Criticality;
				if (oCriticalityProperty) {
					sExpressionTemplate = "'{'= ({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Negative'') || ({0} === ''Negative'') || ({0} === ''1'') || ({0} === 1) ? ''" + ValueColor.Error + "'' : " +
						"({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Critical'') || ({0} === ''Critical'') || ({0} === ''2'') || ({0} === 2) ? ''" + ValueColor.Critical + "'' : " +
						"({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Positive'') || ({0} === ''Positive'') || ({0} === ''3'') || ({0} === 3) ? ''" + ValueColor.Good + "'' : " + "''" + ValueColor.Neutral + "'' '}'";
					if (oCriticalityProperty.$Path) {
						var sCriticalitySimplePath = "${" + oCriticalityProperty.$Path + "}";
						sFormatCriticalityExpression = jQuery.sap.formatMessage(sExpressionTemplate, sCriticalitySimplePath);
					} else if (oCriticalityProperty.$EnumMember) {
						var sCriticality = "'" + oCriticalityProperty.$EnumMember + "'";
						sFormatCriticalityExpression = jQuery.sap.formatMessage(sExpressionTemplate, sCriticality);
					} else {
						jQuery.sap.log.warning("Case not supported, returning the default Value Neutral");
					}
				} else {
					jQuery.sap.log.warning("Case not supported, returning the default Value Neutral");
				}
				return sFormatCriticalityExpression;
			}
		};

		return MicroChart;

	}, /* bExport= */true
);