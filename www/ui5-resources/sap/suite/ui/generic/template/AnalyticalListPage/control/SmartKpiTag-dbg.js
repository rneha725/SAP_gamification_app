sap.ui.define([
	"sap/ui/core/Control",
	"sap/suite/ui/generic/template/AnalyticalListPage/controller/KpiTagController",
	"sap/suite/ui/generic/template/AnalyticalListPage/util/KpiUtil",
	"sap/suite/ui/generic/template/AnalyticalListPage/util/KpiAnnotationHelper",
	"sap/suite/ui/generic/template/AnalyticalListPage/util/FilterUtil",
	"sap/suite/ui/generic/template/AnalyticalListPage/util/V4Terms",
	"sap/ui/comp/odata/ODataModelUtil",
	"sap/suite/ui/generic/template/AnalyticalListPage/control/KpiTag",
	"sap/suite/ui/generic/template/AnalyticalListPage/control/KpiProvider",
	"sap/ui/Device",
	"sap/ui/generic/app/navigation/service/SelectionVariant",
	"sap/ui/model/Filter", "sap/ui/model/json/JSONModel",
	"sap/ui/core/Locale", "sap/m/ResponsivePopover",
	"sap/m/Bar", "sap/m/Label", "sap/m/MessageStrip", 
	"sap/ui/core/format/NumberFormat", "sap/m/library", "sap/ui/core/library"
], function(Control, KpiTagController, KpiUtil, KpiAnnotationHelper, FilterUtil, V4Terms, ODataModelUtil, KpiTag, KpiProvider, Device, SelectionVariant, Filter, JSONModel, Locale, ResponsivePopover, Bar, Label, MessageStrip, NumberFormat, SapMLibrary, SapCoreLibrary) {
	"use strict";
	var TARGET = "Target",
		MAXIMIZE = "Maximize",
		MINIMIZE = "Minimize";
	return KpiTag.extend("sap.suite.ui.generic.template.AnalyticalListPage.control.SmartKpiTag", {
		metadata: {
			designTime: true,
			interfaces: ["sap.m.IOverflowToolbarContent"],
			properties: {
				entitySet: {
					type: "string",
					defaultValue: "",
					bindable: false
				},
				qualifier: {
					type: "string",
					defaultValue: "",
					bindable: false
				},
				modelName: {
					type: "string",
					defaultValue: undefined,
					bindable: false
				},
				smartFilterId: {
					type: "string",
					defaultValue: undefined,
					bindable: false
				}
			},
			events: {
				beforeRebindFilterableKPI: {}
			}
		},
		renderer: {
			render: KpiTag.render
		},
		_isPercent: false,
		_unScaledValue: "",
		_sUnitofMeasure: "",
		_relativeToProperties: [],
		init: function() {
			//by default the log level is set to ERROR and warning messages dont appear in the console.
			//setting warning level only for KPI
			jQuery.sap.log.setLevel(jQuery.sap.log.Level.WARNING, this);
		},
		propagateProperties: function() {
			Control.prototype.propagateProperties.apply(this, arguments);
			this._initialiseMetadata();
		},
		_initialiseMetadata: function() {
			ODataModelUtil.handleModelInit(this, this._onMetaDataInit);
		},
		_onMetaDataInit: function() {
			if (this.getModelName()) {
				this._oModel = this.getModel(this.getModelName());
				this._oModel.getMetaModel().loaded().then(function() {
					this.kpiProvider = new KpiProvider(this);
					if (!this.kpiProvider) {
						this._kpiErrorHandler({}, false);
						return;
					}
					this.kpiSettings = this.kpiProvider.getConfig();
					if (!this.kpiSettings) {
						jQuery.sap.log.error("KPI Error details: incorrect KPI configuration");
						return;
					}
					var sSmartFilterId = this.getSmartFilterId();
					if (sSmartFilterId) {
						if (sSmartFilterId && !this._oSmartFilter) {
							this._oSmartFilter = this._findControl(sSmartFilterId);
							this._oSmartFilter.attachSearch(this._createFilterableKpi, this);
							this._oSmartFilter.attachFilterChange(function(oEvent) {
								if (!this._oSmartFilter.isLiveMode() && !this._oSmartFilter.isDialogOpen()) {
									this.setEnabled(false);
								}
							}.bind(this));
							this._oSmartFilter.attachInitialized(this._createFilterableKpi, this);
						}
					} else {
						this._createGlobalKpi();
					}
				}.bind(this));

			}
		},
		_createFilterableKpi: function() {
			this.setBusy(true);
			//To show the Busy Indicator without any delay
			this.setBusyIndicatorDelay(0);
			//both the Entitysets are same then only check for mandatory fields
			if (this.getEntitySet() === this._oSmartFilter.getEntitySet()) {
				//to check all the mandatory fields are filled in SFB
				if (!this._checkSearchAllowed()) {
					this._kpiErrorHandler({},true);
					return;
				}
			} //need to handle else TBD
			var config = this.kpiSettings,
				aSelectOptions = config.selectOptions,
				aParameters = config.parameters,
				oUiState = this._oSmartFilter.getUiState(),
				oUiStateSV = oUiState.getProperty("selectionVariant"),
				aUiStateSVSelectOptions = oUiStateSV ? oUiStateSV.SelectOptions : undefined,
				aUIStateSVParams = oUiStateSV ? oUiStateSV.Parameters : undefined,
				oSFBAllFilterData = this._oSmartFilter.getFilterData(true),
				oSFBSV = new SelectionVariant(oUiStateSV),
				oFilterableKPISelectionVariant = new SelectionVariant(),
				aFilters = [], oSelectOption, sPropertyName, oSFBSelectOption, oRange, oFilter,
				oParameter, sPropertyValue,
				oMetaModel = this._oModel.getMetaModel(),
				oEntitySet = oMetaModel.getODataEntitySet(this.getEntitySet()),
				entityDef = oMetaModel.getODataEntityType(oEntitySet.entityType);
			// add the Selectioption to oFilterableKPISelectionVariant only if it present in KPI annotations
			// and also matches with SFB SelectOption
			if (aSelectOptions) {
				for (var i = 0; i < aSelectOptions.length; i++) {
					oSelectOption = aSelectOptions[i];
					sPropertyName = oSelectOption.PropertyName.PropertyPath;
					oSFBSelectOption = oSFBSV.getSelectOption(sPropertyName);
					var entityProperty 	= oMetaModel.getODataProperty(entityDef, sPropertyName),
					bisPropertyNonFilterable = entityProperty && FilterUtil.isPropertyNonFilterable(oEntitySet, entityProperty.name);
					//bIsFilterable = entityProperty && entityProperty['sap:filterable'];

					//ignore the filter form KPI Entityset if it marked as 'sap:filterable'="false"
					//if (bIsFilterable === "false") {
					if (bisPropertyNonFilterable) {
						continue;
					}
					if (oSFBSelectOption) {
						for (var j = 0; j < oSFBSelectOption.length; j++) {
							oRange = oSFBSelectOption[j];
							if (oRange.Sign === "I" || oRange.Sign === "E" ) {
								if (oRange.Low !== undefined) {
									oFilter = KpiUtil.getFilter(oRange, oSFBSelectOption, sPropertyName);
									oFilterableKPISelectionVariant.addSelectOption(oFilter.path, oFilter.sign, oFilter.operator, oFilter.value1, oFilter.value2);
								}
							}
						}
					} else {
						//If the property is present in the filter bar we should not do anything
						if (oSFBAllFilterData && oSFBAllFilterData[sPropertyName] === undefined) {
							// property does not exist in SFB entity set
							// then use annotation selection variant
							for (var j = 0; j < oSelectOption["Ranges"].length; j++) {
								oRange = oSelectOption["Ranges"][j];
								if (oRange.Sign.EnumMember === V4Terms.SelectionRangeSignType + "/I" || oRange.Sign.EnumMember === V4Terms.SelectionRangeSignType + "/E" ) {
									if (oRange.Low !== undefined) {
										oFilter = KpiUtil.getFilter(oRange, oSelectOption);
										oFilterableKPISelectionVariant.addSelectOption(oFilter.path, oFilter.sign, oFilter.operator, oFilter.value1, oFilter.value2);
									}
								}
							}
						}
					}
				}
			}

			// add the Parameter to oFilterableKPISelectionVariant only if it present in KPI annotations
			// and also matches with SFB Parameters
			if (aParameters) {
				for (var i = 0; i < aParameters.length; i++) {
					oParameter = aParameters[i];
					sPropertyName = oParameter.PropertyName && oParameter.PropertyName.PropertyPath;
					sPropertyValue = oSFBSV.getParameter(sPropertyName) || oParameter.PropertyValue.String;
					//If the parameter is present in the filter bar we should not do anything
					if (oSFBAllFilterData && oSFBAllFilterData["$Parameter." + sPropertyName] === undefined) {
						// parameter does not exist in SFB entityset
						// then use annotation selection variant
						if (sPropertyName && sPropertyValue && (sPropertyValue !== "")) {
							oFilterableKPISelectionVariant.addParameter(sPropertyName, sPropertyValue);
						}
					}
				}
			}

			//add the SelectOption of SFB only if it exist in KPI entityset
			if (aUIStateSVParams) {
				for (var i = 0; i < aUIStateSVParams.length; i++) {
					oParameter = aUIStateSVParams[i];
					sPropertyName = oParameter.PropertyName;
					sPropertyValue = oParameter.PropertyValue;
					if (sPropertyValue !== oFilterableKPISelectionVariant.getParameter(sPropertyName)) {
						if (sPropertyName && sPropertyValue && (sPropertyValue !== "")) {
							var bIsParam = KpiAnnotationHelper.checkParameterizedEntitySet(this._oModel, oEntitySet, sPropertyName);
							if (bIsParam) {
								oFilterableKPISelectionVariant.addParameter(sPropertyName, sPropertyValue);
							}
						}
					}
				}
			}
			// if filter bar has filters it should be added to SV from annotations
			if (aUiStateSVSelectOptions) {
				for (var i = 0; i < aUiStateSVSelectOptions.length; i++) {
					var oUiStateSVSelectOption = aUiStateSVSelectOptions[i],
					sUiStatePropertyPath = oUiStateSVSelectOption.PropertyName || undefined,
					// check if property exists in KPI entityset
					entityProperty 	= oMetaModel.getODataProperty(entityDef, sUiStatePropertyPath);
					bisPropertyNonFilterable = entityProperty && FilterUtil.isPropertyNonFilterable(oEntitySet, entityProperty.name);
					//bIsFilterable = entityProperty && entityProperty['sap:filterable'];
					//ignore the filter coming form SFB entityset, if it marked as
					//'sap:filterable'="false" in KPI entityset
					//if (entityProperty && (bIsFilterable !== false)) {
					if (entityProperty && !bisPropertyNonFilterable) {
						if (!oFilterableKPISelectionVariant.getSelectOption(sUiStatePropertyPath)) {
							for (var j = 0; j < oUiStateSVSelectOption["Ranges"].length; j++) {
								oRange = oUiStateSVSelectOption["Ranges"][j];
								if (oRange.Sign === "I" || oRange.Sign === "E" ) {
									if (oRange.Low !== undefined) {
										oFilter = KpiUtil.getFilter(oRange, oUiStateSVSelectOption, sUiStatePropertyPath);
										oFilterableKPISelectionVariant.addSelectOption(oFilter.path, oFilter.sign, oFilter.operator, oFilter.value1, oFilter.value2);
									}
								}
							}
						}
					}
				}
			}

			// fire event to enable user modification of certain binding options (Ex: Filters)
			this.fireBeforeRebindFilterableKPI({
				selectionVariant: oFilterableKPISelectionVariant,
				entityType: oEntitySet.entityType
			});

			//to create Filters after SV is modified by extensions
			var aPropertyNames = oFilterableKPISelectionVariant.getSelectOptionsPropertyNames();
			for (var i = 0; i < aPropertyNames.length; i++) {
				oSelectOption = oFilterableKPISelectionVariant.getSelectOption(aPropertyNames[i]);
				for (var j = 0; j < oSelectOption.length; j++) {
					oRange = oSelectOption[j];
					if (oRange.Sign === "I" || oRange.Sign === "E" ) {
						if (oRange.Low !== undefined) {
							oFilter = KpiUtil.getFilter(oRange, null, aPropertyNames[i]);
							aFilters.push(new Filter(oFilter));
						}
					}
				}
			}

			//to access in KPITagController.js
			this._filterableKPISelectionVariant = oFilterableKPISelectionVariant;
			var sPath = KpiAnnotationHelper.resolveParameterizedEntitySet(this._oModel, config.entitySet, oFilterableKPISelectionVariant);
			this._applyFiltersToKpi.apply(this, [oFilterableKPISelectionVariant, aFilters, sPath]);
		},
		_createGlobalKpi: function() {
			this.setBusy(true);
			//To show the Busy Indicator without any delay
			this.setBusyIndicatorDelay(0);
			var config = this.kpiSettings;
			var aSelectOptions = config.selectOptions,
			oSelectOption, oRange, aFilters = [];
			if (aSelectOptions) {
				for (var i = 0; i < aSelectOptions.length; i++) {
					oSelectOption = aSelectOptions[i];
					for (var j = 0; j < oSelectOption["Ranges"].length; j++) {
						oRange = oSelectOption["Ranges"][j];
						if (oRange.Low) {
							aFilters.push(new Filter(KpiUtil.getFilter(oRange, oSelectOption)));
						}
					}
				}
			}
			var sPath = KpiAnnotationHelper.resolveParameterizedEntitySet(this._oModel, config.entitySet, config.selectionVariant);
			this._applyFiltersToKpi.apply(this, [config.selectionVariant, aFilters, sPath]);
		},
		_applyFiltersToKpi: function(oSelectionVariant, aFilters, sPath) {
			this._relativeToProperties = [];
			var config = this.kpiSettings;
			var oDatapoint = config.dataPoint,
			aSelectFields;
			this._getCriticalityRefProperties(oDatapoint);
			this._oConfig = {
				path: sPath,
				filterable: this.getSmartFilterId() ? true : false,
				properties: {
					value: config.props.value,
					valueFormat: config.dataPoint.ValueFormat,
					title: config.props.title,
					unitOfMeasure: config.props.unitOfMeasure
				}
			};
			this._oConfig.properties.shortDescription = config.props.shortDescription;
			this._checkForPercent(this._oConfig.properties.unitOfMeasure);
			this._checkKpiCriticality();
			if (this._relativeToProperties.length !== 0) {
				aSelectFields = (this._relativeToProperties.indexOf(this._oConfig.properties.value) === -1) ? [this._oConfig.properties.value].concat(this._relativeToProperties).join(",") : this._relativeToProperties; 
			} else {
				aSelectFields = [this._oConfig.properties.value];
			}
			if (this._oConfig) {
				this._oModel.read(this._oConfig.path, {
					async: true,
					filters: aFilters,
					urlParameters: {
						"$select": aSelectFields,
						"$top": 1
					},
					success: this._kpiSuccessHandler.bind(this),
					error: this._kpiErrorHandler.bind(this)
				});
			}
		},

		_checkSearchAllowed: function() {
			var aAllFields = this._oSmartFilter.determineMandatoryFilterItems(),
			aFiltersWithValues = this._oSmartFilter.getFiltersWithValues(),
			bIsSearchAllowed = true, count = 0;
			//checking if mandatory params are filled only when they are present in the app
			if (aAllFields.length) {
				// when mandatory params exist and no values or some values are filled, search is not allowed
				if (!aFiltersWithValues.length || (aFiltersWithValues.length < aAllFields.length)) {
					bIsSearchAllowed = false;
				} else {
					//when mandatory params exist and values are filled, make sure that apt fields are provided with values and then make search allowed.
					for (var i = 0; i < aAllFields.length; i++) {
						for (var j = 0; j < aFiltersWithValues.length; j++) {
							if (aFiltersWithValues[j].getName() === aAllFields[i].getName()) {
								count++;
							}
						}
					}
					bIsSearchAllowed = (count === aAllFields.length);
				}
			}
			if (bIsSearchAllowed) {
				// if fields have values check whether they are valid or not
				// if all mandatory fields have data
				var oSearchAllowed = this._oSmartFilter.verifySearchAllowed.apply(this._oSmartFilter, arguments);
				if (oSearchAllowed.hasOwnProperty("error") || oSearchAllowed.hasOwnProperty("mandatory")) {
					bIsSearchAllowed = false;
				}
			}

			return bIsSearchAllowed;
		},
		_checkKpiCriticality: function() {
			var config = this.kpiSettings;
			var oDatapoint = config.dataPoint;
			var mCriticalityIndicator;
			if (config.criticality) {
				if (config.criticality.criticalityPath) {
					mCriticalityIndicator = config.criticality.criticalityPath;
					this._oConfig.criticality = {
						criticalityPath: config.criticality.criticalityPath
					};
				} else if (config.criticality.criticalityType) {
					// if criticality is provided as enum
					mCriticalityIndicator = this._getCriticalityFromEnum(config.criticality.criticalityType);
					this._oConfig.criticality = {
						criticalityType: config.criticality.criticalityType
					};
				}
			} else if (config.criticalityCalculation) {
				var sImproveDirection = config.criticalityCalculation.improveDirection,
				sToleranceHigh = config.criticalityCalculation.toleranceHigh,
				sToleranceLow = config.criticalityCalculation.toleranceLow,
				sDeviationLow = config.criticalityCalculation.deviationLow,
				sDeviationHigh = config.criticalityCalculation.deviationHigh;
				var IndicatorParts = [];
				if (this.getError() || (this.getSmartFilterId() && this._checkCriticalityCalculationForNumber(oDatapoint.CriticalityCalculation, sImproveDirection))) {
					this._mCriticalityIndicator = SapMLibrary.ValueColor.Neutral;
				} else {
					IndicatorParts.push(this._getPathForIndicatorParts(sToleranceHigh));
					IndicatorParts.push(this._getPathForIndicatorParts(sToleranceLow));
					IndicatorParts.push(this._getPathForIndicatorParts(sDeviationLow));
					IndicatorParts.push(this._getPathForIndicatorParts(sDeviationHigh));
					IndicatorParts.push({
						path: "/" + config.props.value
					});
					mCriticalityIndicator = {
						parts: IndicatorParts,
						formatter: function (sDataToleranceHigh, sDataToleranceLow, sDataDeviationLow, sDataDeviationHigh, sValue) {
							var toleranceLow = sDataToleranceLow ? sDataToleranceLow : sToleranceLow,
								toleranceHigh = sDataToleranceHigh ? sDataToleranceHigh : sToleranceHigh,
								deviationLow = sDataDeviationLow ? sDataDeviationLow : sDeviationLow,
								deviationHigh = sDataDeviationHigh ? sDataDeviationHigh : sDeviationHigh;
							toleranceLow = toleranceLow && Number(toleranceLow);
							toleranceHigh = toleranceHigh && Number(toleranceHigh);
							deviationLow = deviationLow && Number(deviationLow);
							deviationHigh = deviationHigh && Number(deviationHigh);
							sValue = sValue && Number(sValue);
							return this._getImproveDirection(toleranceLow, toleranceHigh, deviationLow, deviationHigh, sValue);
						}.bind(this)
					};
					this._oConfig.criticalityCalculation = {
						improveDirection: config.criticalityCalculation.improveDirection,
						toleranceLow: config.criticalityCalculation.toleranceLow,
						toleranceHigh: config.criticalityCalculation.toleranceHigh,
						deviationLow:config.criticalityCalculation.deviationLow,
						deviationHigh: config.criticalityCalculation.deviationHigh
					};
				}
			}
			this._oConfig.criticalityProps = {
				criticalityIndicator: mCriticalityIndicator,
				relativeProperties: this._relativeToProperties
			};
		},
		_getCriticalityRefProperties: function(oDataPoint) {
			var cCalc = oDataPoint.CriticalityCalculation;
			var crit = oDataPoint.Criticality;
			if (crit && crit.Path && this._relativeToProperties.indexOf(crit.Path) === -1) {
				this._relativeToProperties.push(crit.Path);
			} else if (cCalc) {
				if (cCalc.DeviationRangeLowValue && cCalc.DeviationRangeLowValue.Path && this._relativeToProperties.indexOf(cCalc.DeviationRangeLowValue.Path) === -1) {
					this._relativeToProperties.push(cCalc.DeviationRangeLowValue.Path);
				}
				if (cCalc.DeviationRangeHighValue && cCalc.DeviationRangeHighValue.Path && this._relativeToProperties.indexOf(cCalc.DeviationRangeHighValue.Path) === -1) {
					this._relativeToProperties.push(cCalc.DeviationRangeHighValue.Path);
				}
				if (cCalc.ToleranceRangeLowValue && cCalc.ToleranceRangeLowValue.Path && this._relativeToProperties.indexOf(cCalc.ToleranceRangeLowValue.Path) === -1) {
					this._relativeToProperties.push(cCalc.ToleranceRangeLowValue.Path);
				}
				if (cCalc.ToleranceRangeHighValue && cCalc.ToleranceRangeHighValue.Path && this._relativeToProperties.indexOf(cCalc.ToleranceRangeHighValue.Path) === -1) {
					this._relativeToProperties.push(cCalc.ToleranceRangeHighValue.Path);
				}
			}
		},
		_kpiSuccessHandler: function(data, response) {
			if ((this.kpiProvider.kpiConfig.bIsKpiAnnotaion && !this.kpiProvider.kpiConfig.hasOwnProperty("navigation")) || this.kpiProvider.kpiConfig.oDefaultPV === false) {
				this._kpiErrorHandler(response);
			}
			this.setBusy(false);
			this.setProperty('error', false);
			var oKpiTagModel = new JSONModel();
			oKpiTagModel.setData(data.results[0]);
			this.setModel(oKpiTagModel);
			this._setKpiName();
			this._setKpiValue();
			if (this._oConfig.properties.unitOfMeasure) {
				(this._oConfig.properties.unitOfMeasure.hasOwnProperty("Path")) ? this.bindProperty("unit", { path: "/" + this._oConfig.properties.unitOfMeasure.Path }) : this.setProperty("unit", this._oConfig.properties.unitOfMeasure.String || this._oConfig.properties.unitOfMeasure);
			}
			this._setKpiIndicator();
			//to enable KPITag
			if (!this.getEnabled()) {
				this.setEnabled(true);
			}
		},
		/*_kpiErrorHandler : this function is called when there is an authorization error or any other technical errors that caused the KPI not fit for rendering.
		This handles the cases mentioned in FIORITECHP1-6523
		parameters : error response.*/
		_kpiErrorHandler: function(response, bIsReqNotFilterPresent) {

			var oRb = this.getModel("i18n").getResourceBundle();
			//Hide the KPI id the it's authorization error
			if (response.statusCode === "401" || response.statusCode === "403" || response.authorizationError) {
				this.setProperty('visible', false);
				jQuery.sap.log.warning("KPI error details: " + oRb.getText("KPI_AUTHORIZATION_ISSUE"), "", this);
				return;
			}
			if (this.kpiProvider.kpiConfig.oDefaultPV === false) { //Hide KPI if the DefaultPV is not present
				this.setProperty('visible', false);
				jQuery.sap.log.warning("KPI error details: " + oRb.getText("KPI_DEFAULT_PV_ERROR_MESSAGE"), "", this);
				return;
			}
			if (this.kpiProvider.kpiConfig.bIsKpiAnnotaion && !this.kpiProvider.kpiConfig.hasOwnProperty("navigation")) {
				jQuery.sap.log.warning("KPI error details: " + oRb.getText("KPI_DRILLDOWN_NAVIGATION_MESSAGE"), "", this);
				return;
			}
			if (bIsReqNotFilterPresent) {
				this.setProperty('errorMessage', oRb.getText("KPI_MANDATORY_PARAMETER_MESSAGE"));
				jQuery.sap.log.error("KPI error details: " + oRb.getText("KPI_MANDATORY_PARAMETER_MESSAGE"));
			}
			this.setBusy(false);
			if (!bIsReqNotFilterPresent) {
				this.setProperty('errorMessage', oRb.getText("KPI_GENERIC_ERROR_MESSAGE"));
			}
			if (response && response.statusCode && response.message) {
				jQuery.sap.log.error("KPI error details: " + response.statusCode + " " + response.message);
			}
			this._setKpiName();
			//continue criticality calculation so that criticality from anno is picked.
			//if criticality calculation is provided and the kpi is in error state it is marked as neutral
			this._setKpiIndicator();
			this.setProperty('error', true);
			//to enable KPITag
			if (!this.getEnabled()) {
				this.setEnabled(true);
			}
		},
		_setKpiIndicator: function () {
			if (this._oConfig && this._oConfig.criticalityProps) {
				var criticalityIndicator = this._oConfig.criticalityProps.criticalityIndicator;
				if (typeof criticalityIndicator === "string") {
					this.setIndicator(criticalityIndicator);
				} else if (typeof criticalityIndicator === "object") {
					this.bindProperty("indicator", criticalityIndicator);
				}
			}
		},
		_setKpiValue: function() {

			this.bindProperty("value", {
				path: "/" + this._oConfig.properties.value,
				formatter: function (sValue) {
					this._isPercent = this._oConfig.properties.isPercent;
					this._unScaledValue = NumberFormat.getFloatInstance({
						maxFractionDigits: 2,
						groupingEnabled: true,
						showScale: false
						}, new Locale(sap.ui.getCore().getConfiguration().getLanguage())).format(sValue);
					return this._oConfig.properties.isPercent ? KpiUtil.formatNumberForPresentation(sValue, this._getNumberOfFractionalDigits(), true)  : KpiUtil.formatNumberForPresentation(sValue, this._getNumberOfFractionalDigits());
				}.bind(this)
			});
		},
		_checkCriticalityCalculationForNumber: function(criticalityAnno, sImproveDirection) {
			if (sImproveDirection === MAXIMIZE) {
				if ((criticalityAnno.DeviationRangeLowValue && !criticalityAnno.DeviationRangeLowValue.Path) || (criticalityAnno.ToleranceRangeLowValue && !criticalityAnno.ToleranceRangeLowValue.Path)) {
					return true;
				}
			} else if (sImproveDirection === MINIMIZE) {
				if ((criticalityAnno.DeviationRangeHighValue && !criticalityAnno.DeviationRangeHighValue.Path) || (criticalityAnno.ToleranceRangeHighValue && !criticalityAnno.ToleranceRangeHighValue.Path)) {
					return true;
				}
			} else if (sImproveDirection === TARGET) {
				if ((criticalityAnno.ToleranceRangeLowValue && !criticalityAnno.ToleranceRangeLowValue.Path) || (criticalityAnno.ToleranceRangeHighValue && !criticalityAnno.ToleranceRangeHighValue.Path)) {
					return true;
				}
			}
		},
		_setKpiName: function() {
			if (!this.kpiSettings || !this.kpiSettings.props || !this.kpiSettings.props.title) {
				return this.setProperty("shortDescription", "");
			}
			// get kpi title
			var nameFromPath = this.kpiSettings.props.title;
			//Handle cases where DataPoint.title may not be present
			if ( nameFromPath === undefined || typeof nameFromPath !== "string") {
				nameFromPath = "";
			}
			var sKpiDisplayName = this._oConfig && this._oConfig.properties.shortDescription ? this._oConfig.properties.shortDescription : nameFromPath; 
			if (sKpiDisplayName) {
				if (sKpiDisplayName.indexOf(">") > 0) {//to handle i18n strings
					this.bindProperty("shortDescription", {
						path: sKpiDisplayName,
						formatter: function(sValue) {
							return this._getKpiTagTitle(sValue);
						}.bind(this)
					});
				} else {
					this.setProperty("shortDescription", this._getKpiTagTitle(sKpiDisplayName));
				}
			}
		},
		_getPathForIndicatorParts: function(sValue) {
			//if the value is of number form (int/decimal) then add dummy paths so that
			//values can be set in formatter
			if (Number(sValue) || !sValue) {
				return {
					path: "/dummy"
				};
			}
			//already set to form {path: '/...'} in provider using kpiUtil
			return sValue;
		},
		_getKpiTagTitle: function(name) {
			return this.getShortDescription() ? this.getShortDescription() : this._getNameFromHeuristic(name);
		},
		_getCriticalityFromEnum: function(sCriticality) {
			return this.kpiProvider.getCriticalityFromEnum(sCriticality);
		},
		_getNumberOfFractionalDigits: function() {
			var decimalPoints = this._oConfig.properties.valueFormat && this._oConfig.properties.valueFormat.NumberOfFractionalDigits.Int;
			if (decimalPoints != 0 ) {
				decimalPoints = 1;
			}
			return decimalPoints;
		},
		_getImproveDirection: function(sDataToleranceLow, sDataToleranceHigh, sDataDeviationLow, sDataDeviationHigh, sValue) {
			return this.kpiProvider.getImproveDirection(sDataToleranceLow, sDataToleranceHigh, sDataDeviationLow, sDataDeviationHigh, sValue);
		},
		_onMouseClick: function(oEvent) {
			if (this.kpiSettings) {
				this._displayKpiErrorPopOverOrCard(oEvent);
			} else {
				jQuery.sap.log.error("KPI error details - Incorrect KPI configuration. Unable to open card");
			}
		},
		_displayKpiErrorPopOverOrCard: function(oEvent) {
			if (this.getError()) {
				if (this._oPopoverDialog) {
					this._oPopoverDialog.openBy(this);
				} else {
					this._oPopoverDialog = this._getResponsivePopOver(this.getErrorMessage());
					this._oPopoverDialog.openBy(this);
				}
			} else {
				KpiTagController.openKpiCard(oEvent);
			}
		},
		_getResponsivePopOver: function(text){
			if (this._oPopoverDialog) {
				return this._oPopoverDialog;
			}
			var oResponsivePopover = new ResponsivePopover({
				placement: SapMLibrary.PlacementType.Auto,
				customHeader:
				new Bar({
					contentLeft: new Label({ text: (this.kpiProvider.kpiConfig.props) ? this.kpiProvider.kpiConfig.props.title : "" })
					}),
				content: [
				new MessageStrip({
					text: text,
					showIcon : true,
					type: SapCoreLibrary.MessageType.Error
					})
				]
				}).addStyleClass("sapSmartTemplatesAnalyticalListPageErrorPopOver");
			var bShowHeader = Device.system.phone ? true : false;
			oResponsivePopover.setShowCloseButton(bShowHeader);
			return oResponsivePopover;
		},
		_onKeyPress: function(oEvent) {
			if (this.kpiSettings && oEvent.which === jQuery.sap.KeyCodes.ENTER || oEvent.which === jQuery.sap.KeyCodes.SPACE) {
				this._displayKpiErrorPopOverOrCard(oEvent);
			} else {
				jQuery.sap.log.error("KPI error details - Incorrect KPI configuration. Unable to open card");
			}
		},
		/**
		* @private
		* this Methods checks if the returned unit of Measure is a percent
		* @param  oEntityTypeProperty [Entity property which has the UoM]
		* @return                     [returns true/false ]
		*/
		_checkForPercent: function(sUnitofMeasure) {
			if (sUnitofMeasure && sUnitofMeasure.hasOwnProperty("String")) {
				this._oConfig.properties.unitOfMeasure = (sUnitofMeasure.String) ? sUnitofMeasure.String : "";
			}
			//Pushing path to this._relativeToProperties(), only if Currency is mentioned via path & sent to query.
			if (sUnitofMeasure && sUnitofMeasure.hasOwnProperty("Path") && this._relativeToProperties.indexOf(sUnitofMeasure.Path) === -1) {
				this._relativeToProperties.push(sUnitofMeasure.Path);
			}
			//This also checks for this._sUnitofMeasure === "%" which ideally should be coming as this._sUnitofMeasure.String but, waiting for confirmation.
			this._oConfig.properties.isPercent = (sUnitofMeasure && sUnitofMeasure.hasOwnProperty("String")) ? (sUnitofMeasure.String === "%") : false;
		},
		_getNameFromHeuristic: function(sentence) {
			var parts = sentence.split(/\s/);
			return parts.length === 1 ? this._getNameFromSingleWordHeuristic(sentence) : this._getNameFromMultiWordHeuristic(parts);
		},
		/**
		* [_getNameFromSingleWordHeuristic Extract logic for single word]
		* @param  {String} word which needs to be changed to short title
		* @return {String} KPI Short title
		*/
		_getNameFromSingleWordHeuristic: function(word) {
			return word.substr(0,3).toUpperCase();
		},
		_getNameFromMultiWordHeuristic: function(words) {
			var parts = [];
			parts.push(words[0].charAt(0));
			parts.push(words[1].charAt(0));
			if (words.length >= 3) {
				parts.push(words[2].charAt(0));
			}
			return parts.join("").toUpperCase();
		},
		getFilterableKPISelectionVariant: function() {
			return this._filterableKPISelectionVariant;
		},
		/**
		 * searches for a certain control by its ID
		 *
		 * @param {string} sId the control's ID
		 * @returns {sap.ui.core.Control} The control found by the given Id
		 * @private
		 */
		_findControl: function(sId) {
			var oResultControl, oView;
			if (sId) {
				// Try to get SmartFilter from Id
				oResultControl = sap.ui.getCore().byId(sId);

				// Try to get SmartFilter from parent View!
				if (!oResultControl) {
					oView = this._getView();

					if (oView) {
						oResultControl = oView.byId(sId);
					}
				}
			}

			return oResultControl;
		},
		/**
		 * searches for the controls view
		 *
		 * @returns {sap.ui.core.mvc.View} The found parental View
		 * @private
		 */
		_getView: function() {
			if (!this._oView) {
				var oObj = this.getParent();
				while (oObj) {
					if (oObj instanceof sap.ui.core.mvc.View) {
						this._oView = oObj;
						break;
					}
					oObj = oObj.getParent();
				}
			}
			return this._oView;
		},
		exit: function() {
			this._relativeToProperties = [];
		},
		onAfterRendering: function() {
			var oRb = this.getModel("i18n").getResourceBundle(),
			rightTooltip = (this._isPercent) ? this.getValue() + " " + this.getUnit() : this._unScaledValue + " " + this.getUnit(),
			KPITooltipKey;
			switch (this.getIndicator()) {
				case SapMLibrary.ValueColor.Error:
				KPITooltipKey = "KPI_TOOLTIP_ERROR";
				break;
				case SapMLibrary.ValueColor.Good:
				KPITooltipKey = "KPI_TOOLTIP_GOOD";
				break;
				case SapMLibrary.ValueColor.Critical:
				KPITooltipKey = "KPI_TOOLTIP_CRITICAL";
				break;
				default:
				KPITooltipKey = "KPI_TOOLTIP_NEUTRAL";
				break;
			}
			var nameFromPath;
			if (this.kpiSettings && this.kpiSettings.props) {
				nameFromPath = this.kpiSettings.props.title;
			}
			//if the datapoint title is an i18n string
			if (nameFromPath && nameFromPath.indexOf(">") > 0) {
				this.bindProperty("tooltip", {
					path: nameFromPath,
					formatter: function(value) {
						this._oConfig.properties.title = value;
						return value + " " + rightTooltip;
					}.bind(this)
				});
			} else {
				this.setTooltip(nameFromPath + " " + rightTooltip);
			}
			this._ariaLabel = oRb.getText(KPITooltipKey, [(this.kpiSettings && this.kpiSettings.props ? this.kpiSettings.props.title : ""), rightTooltip]);
			setTimeout(function() {
				this.detachBrowserEvent("click", this._onMouseClick).attachBrowserEvent("click", this._onMouseClick);
				this.detachBrowserEvent("keypress", this._onKeyPress).attachBrowserEvent("keypress", this._onKeyPress);
			}.bind(this), 1);
		},
		getSmartKpiConfig: function () {
			return this._oConfig;
		},
		getOverflowToolbarConfig: function () {
			return {
				canOverflow: true
			};
		},
		setShortDescription: function(value) {
			this.setProperty("shortDescription", this._getNameFromHeuristic(value));
		}
	});
}, true);