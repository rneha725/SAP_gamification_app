/**
 * @fileOverview Library to Manage rendering of Viz Charts.
 *
 * Any function that needs to be exported(used outside this file) via namespace should be defined as
 * a function and then added to the return statement at the end of this file
 */
sap.ui.define(["jquery.sap.global", "sap/ovp/cards/charts/Utils", "sap/ui/model/odata/CountMode",
        "sap/ovp/cards/charts/VizAnnotationManager", "sap/ovp/cards/AnnotationHelper",
        "sap/ui/core/format/NumberFormat", "sap/ui/core/format/DateFormat", "sap/viz/ui5/api/env/Format",
        "sap/viz/ui5/controls/VizTooltip"],
    function (jQuery, Utils, CountMode, VizAnnotationManager, CardAnnotationHelper, NumberFormat, DateFormat,
              VizFormat, VizTooltip) {
        "use strict";

        /* All constants feature here */
        var constants = {
            LABEL_KEY: "sap:label",
            LABEL_KEY_V4: "com.sap.vocabularies.Common.v1.Label", //as part of supporting V4 annotation
            TEXT_KEY: "sap:text",
            TEXT_KEY_V4: "com.sap.vocabularies.Common.v1.Text", //as part of supporting V4 annotation
            TYPE_KEY: "type",
            DISPLAY_FORMAT_KEY: "sap:display-format",
            SEMANTICS_KEY: "sap:semantics",
            UNIT_KEY: "sap:unit",
            UNIT_KEY_V4_ISOCurrency: "Org.OData.Measures.V1.ISOCurrency", //as part of supporting V4 annotation
            UNIT_KEY_V4_Unit: "Org.OData.Measures.V1.Unit", //as part of supporting V4 annotation
            CURRENCY_CODE: "currency-code",
            NAME_KEY: "name",
            NAME_CAP_KEY: "Name",
            EDM_TYPE: "type",
            EDM_INT32: "Edm.Int32",
            SCATTER_CHARTTYPE: "com.sap.vocabularies.UI.v1.ChartType/Scatter",
            BUBBLE_CHARTTYPE: "com.sap.vocabularies.UI.v1.ChartType/Bubble",
            LINE_CHARTTYPE: "com.sap.vocabularies.UI.v1.ChartType/Line"
        };

        /* All constants for error messages feature here */
        var errorMessages = {
            CARD_WARNING: "OVP-AC: Analytic card: Warning: ",
            CARD_ERROR: "OVP-AC: Analytic card Error: ",
            DATA_ANNO_ERROR: "OVP-AC: Analytic card Error:",
            CARD_ANNO_ERROR: "OVP-AC: Analytic card: Error ",
            CHART_ANNO_ERROR: "OVP-AC: Analytic card: Error ",
            INVALID_CHART_ANNO: "OVP-AC: Analytic Cards: Invalid Chart Annotation.",
            ANALYTICAL_CONFIG_ERROR: "Analytic card configuration error",
            CACHING_ERROR: "no model defined while caching OdataMetaData",
            INVALID_MAXITEMS: "maxItems is Invalid. ",
            NO_DATASET: "OVP-AC: Analytic Cards: Could not obtain dataset.",
            SORTORDER_WARNING: "SortOrder is present in PresentationVariant, but it is empty or not well formed.",
            BOOLEAN_ERROR: "Boolean value is not present in PresentationVariant.",
            IS_MANDATORY: "is mandatory.",
            IS_MISSING: "is missing.",
            NOT_WELL_FORMED: "is not found or not well formed)",
            MISSING_CHARTTYPE: "Missing ChartType in ",
            CHART_ANNO: "Chart Annotation.",
            DATA_ANNO: "Data Annotation",
            CARD_ANNO: "card annotation.",
            CARD_CONFIG: "card configuration.",
            CARD_CONFIG_ERROR: "Could not obtain configuration for ",
            CARD_CONTAINER_ERROR: "Could not obtain card container. ",
            DATA_UNAVAIALABLE: "No data available.",
            CONFIG_LOAD_ERROR: "Failed to load config.json. Reason: ",
            INVALID_CHARTTYPE: "Invalid ChartType given for ",
            INVALID_CONFIG: "No valid configuration given for ",
            CONFIG_JSON: "in config.json",
            ENTER_INTEGER: "Please enter an Integer.",
            NO_CARD_MODEL: "Could not obtain Cards model.",
            ANNO_REF: "com.sap.vocabularies.UI.v1 annotation.",
            INVALID_REDUNDANT: "Invalid/redundant role configured for ",
            CHART_IS: "chart is/are ",
            CARD_CONFIG_JSON: "card from config.json",
            ALLOWED_ROLES: "Allowed role(s) for ",
            DIMENSIONS_MANDATORY: "DimensionAttributes are mandatory.",
            MEASURES_MANDATORY: "MeasureAttributes are mandatory.",
            CARD_LEAST: "card: Enter at least ",
            CARD_MOST: "card: Enter at most ",
            FEEDS: "feed(s).",
            MIN_FEEDS: "Minimum number of feeds required for ",
            FEEDS_OBTAINED: "card is not configured. Obtained ",
            FEEDS_REQUIRED: "feed(s), Required: ",
            INVALID_SEMANTIC_MEASURES: "More than one measure is being semantically coloured",
            INVALID_IMPROVEMENT_DIR: "No Improvement Direction Found",
            INVALID_CRITICALITY: "Invalid criticality values",
            INVALID_DIMMEAS: "Invalid number of Measures or Dimensions",
            INVALID_FORECAST: "Invalid/Redundant Datapoint or Forecast measure",
            ERROR_MISSING_AXISSCALES: "Minimum and Maximum values are mandatory for AxisScale MinMax to work"
        };

        /*
         * Reads filters from annotation and prepares data binding path
         */
        function formatItems(iContext, oEntitySet, oSelectionVariant, oPresentationVariant, oDimensions, oMeasures, chartType) {
            var dataModel = iContext.getSetting("dataModel");
            var chartEnumArr;
            if (chartType && chartType.EnumMember) {
                chartEnumArr = chartType.EnumMember.split("/");
                if (chartEnumArr && ( chartEnumArr[1] != 'Donut' ) && (oDimensions === undefined)) {
                    return null;
                }
//			if (chartEnumArr && ( chartEnumArr[1] === 'Donut' ) ) {
                if (chartEnumArr) {
                    dataModel.setDefaultCountMode(CountMode.Inline);
                }
            }
            var ret = "{";
            var dimensionsList = [];
            var measuresList = [];
            var sorterList = [];
            var bFilter = oSelectionVariant && oSelectionVariant.SelectOptions;
            var bParams = oSelectionVariant && oSelectionVariant.Parameters;
            var bSorter = oPresentationVariant && oPresentationVariant.SortOrder;
            var maxItemTerm = oPresentationVariant && oPresentationVariant.MaxItems, maxItems = null;
            var aConfigFilters;
            var tmp;
            var entitySet = null;
            var textKey = constants.TEXT_KEY;
            var textKeyV4 = constants.TEXT_KEY_V4; //as part of supporting V4 annotation
            var unitKey = constants.UNIT_KEY;
            var unitKey_v4_isoCurrency = constants.UNIT_KEY_V4_ISOCurrency; //as part of supporting V4 annotation
            var unitKey_v4_unit = constants.UNIT_KEY_V4_Unit; //as part of supporting V4 annotation

            if (maxItemTerm) {
                maxItems = maxItemTerm.Int32 ? maxItemTerm.Int32 : maxItemTerm.Int;
            }

            if (maxItems) {
                if (maxItems == "0") {
                    jQuery.sap.log.error("OVP-AC: Analytic card Error: maxItems is configured as " +
                    maxItems);
                    ret += "}";
                    return ret;
                }
                if (!/^\d+$/.test(maxItems)) {
                    jQuery.sap.log.error("OVP-AC: Analytic card Error: maxItems is Invalid. " +
                    "Please enter an Integer.");
                    ret += "}";
                    return ret;
                }
            }

            var reference, config, dataStep,
                allConfig = getConfig(),
                ovpCardProperties = iContext.getSetting('ovpCardProperties');
            if (oDimensions) {
                for (var key in allConfig) {
                    if ((reference = allConfig[key].reference) &&
                        allConfig[reference]) {
                        var virtualEntry = jQuery.extend(true, {}, allConfig[reference]);
                        allConfig[key] = virtualEntry;
                    }
                    if (allConfig[key].default.type == chartEnumArr[1].toLowerCase() ||
                        (allConfig[key].time && allConfig[key].time.type == chartEnumArr[1].toLowerCase())) {
                        config = allConfig[key];
                        break;
                    }
                }

                var bSupportsTimeSemantics = VizAnnotationManager.hasTimeSemantics(oDimensions, config, dataModel, entitySet);
                if (bSupportsTimeSemantics) {
                    config = config.time;
                } else {
                    config = config.default;
                }
                dataStep = ovpCardProperties.getProperty('/dataStep');
                if (!dataStep) {
                    if (config.resize && config.resize.hasOwnProperty('dataStep')) {
                        dataStep = config.resize.dataStep;
                        ovpCardProperties.setProperty('/dataStep', dataStep);
                    }
                }
            }

            if (ovpCardProperties.getProperty('/layoutDetail') === 'resizable') {
                var colSpan = ovpCardProperties.getProperty('/cardLayout/colSpan');
                maxItems = +maxItems + +dataStep * (colSpan - 1);
            }

            var aParameters = ovpCardProperties.getProperty('/parameters');
            bParams = bParams || !!aParameters;

            if (bParams) {
                var path = CardAnnotationHelper.resolveParameterizedEntitySet(dataModel, oEntitySet, oSelectionVariant, aParameters);
                ret += "path: '" + path + "'";
            } else {
                ret += "path: '/" + oEntitySet.name + "'";
            }

            var filters = [];
            if (!iContext || !iContext.getSetting('ovpCardProperties')) {
                jQuery.sap.log.error(errorMessages.ANALYTICAL_CONFIG_ERROR);
                ret += "}";
                return ret;
            }
            entitySet = iContext.getSetting('ovpCardProperties').getProperty("/entitySet");
            if (!dataModel || !entitySet) {
                return ret;
            }
            var oMetadata = getMetadata(dataModel, entitySet);
            aConfigFilters = iContext.getSetting('ovpCardProperties').getProperty("/filters");

            if (bFilter) {
                jQuery.each(oSelectionVariant.SelectOptions, function () {
                    var prop = this.PropertyName.PropertyPath;
                    jQuery.each(this.Ranges, function () {
                        if (this.Sign.EnumMember === "com.sap.vocabularies.UI.v1.SelectionRangeSignType/I") {
                            var filtervalue = getPrimitiveValue(this.Low);
                            var filtervaueHigh = this.High && this.High.String;
                            //var formatByType = formatByType;
                            filtervalue = formatByType(oMetadata, prop, filtervalue);
                            var filter = {
                                path: prop,
                                operator: this.Option.EnumMember.split("/")[1],
                                value1: filtervalue
                            };
                            if (filtervaueHigh) {
                                filter.value2 = formatByType(oMetadata, prop, filtervaueHigh);
                            }
                            filters.push(filter);
                        }
                    });
                });
            }

            /*
             * code for ObjectStream
             */
            if (aConfigFilters && aConfigFilters.length > 0) {
                filters = filters.concat(aConfigFilters);
            }

            if (filters.length > 0) {
                ret += ", filters: " + JSON.stringify(filters);
            }

            if (bSorter) {
                var oSortAnnotationCollection = oPresentationVariant.SortOrder;
                if (!oSortAnnotationCollection.length) {
                    oSortAnnotationCollection = Utils.getSortAnnotationCollection(dataModel, oPresentationVariant, oEntitySet);
                }
                if (oSortAnnotationCollection.length < 1) {
                    jQuery.sap.log.warning(errorMessages.CARD_WARNING + errorMessages.SORTORDER_WARNING);
                } else {
                    var sSorterValue = "";
                    var oSortOrder;
                    var sSortOrder;
                    var sSortBy;
                    for (var i = 0; i < oSortAnnotationCollection.length; i++) {
                        oSortOrder = oSortAnnotationCollection[i];
                        sSortBy = oSortOrder.Property.PropertyPath;
                        sorterList.push(sSortBy);
                        if (typeof oSortOrder.Descending == "undefined") {
                            sSortOrder = 'true';
                        } else {
                            var checkFlag = oSortOrder.Descending.Bool || oSortOrder.Descending.Boolean;
                            if (!checkFlag) {
                                jQuery.sap.log.warning(errorMessages.CARD_WARNING + errorMessages.BOOLEAN_ERROR);
                                sSortOrder = 'true';
                            } else {
                                sSortOrder = checkFlag.toLowerCase() == 'true' ? 'true' : 'false';
                            }
                        }
                        sSorterValue = sSorterValue + "{path: '" + sSortBy + "',descending: " + sSortOrder + "},";
                    }
                    /* trim the last ',' */
                    ret += ", sorter: [" + sSorterValue.substring(0, sSorterValue.length - 1) + "]";
                }
            }

            var entityTypeObject = iContext.getSetting("ovpCardProperties").getProperty("/entityType");

            jQuery.each(oMeasures, function (i, m) {
                tmp = m.Measure.PropertyPath;
                if (m.DataPoint && m.DataPoint.AnnotationPath) {
                    var datapointAnnotationPath = entityTypeObject[m.DataPoint.AnnotationPath.substring(1)];
                    if (datapointAnnotationPath && datapointAnnotationPath.ForecastValue && datapointAnnotationPath.ForecastValue.PropertyPath) {
                        measuresList.push(datapointAnnotationPath.ForecastValue.PropertyPath);
                    }
                    if (datapointAnnotationPath && datapointAnnotationPath.TargetValue && datapointAnnotationPath.TargetValue.PropertyPath) {
                        measuresList.push(datapointAnnotationPath.TargetValue.PropertyPath);
                    }
                }
                measuresList.push(tmp);
                if (oMetadata && oMetadata[tmp]) {
                    if (oMetadata[tmp][textKeyV4]) { //as part of supporting V4 annotation
                        if (oMetadata[tmp][textKeyV4].String && tmp != oMetadata[tmp][textKeyV4].String) {
                            measuresList.push(oMetadata[tmp][textKeyV4].String ? oMetadata[tmp][textKeyV4].String : tmp);
                        } else if (oMetadata[tmp][textKeyV4].Path && tmp != oMetadata[tmp][textKeyV4].Path) {
                            measuresList.push(oMetadata[tmp][textKeyV4].Path ? oMetadata[tmp][textKeyV4].Path : tmp);
                        }
                    } else if (oMetadata[tmp][textKey] && tmp != oMetadata[tmp][textKey]) {
                        measuresList.push(oMetadata[tmp][textKey] ? oMetadata[tmp][textKey] : tmp);
                    }
                }

                if (oMetadata && oMetadata[tmp]) {
                    var unitCode;
                    if (oMetadata[tmp][unitKey_v4_isoCurrency]) { //as part of supporting V4 annotation
                        unitCode = oMetadata[tmp][unitKey_v4_isoCurrency].Path ? oMetadata[tmp][unitKey_v4_isoCurrency].Path : oMetadata[tmp][unitKey_v4_isoCurrency].String;
                    } else if (oMetadata[tmp][unitKey_v4_unit]) {
                        unitCode = oMetadata[tmp][unitKey_v4_unit].Path ? oMetadata[tmp][unitKey_v4_unit].Path : oMetadata[tmp][unitKey_v4_unit].String;
                    } else if (oMetadata[tmp][unitKey]) {
                        unitCode = oMetadata[tmp][unitKey];
                    }
                    if (unitCode) {
                        if (jQuery.inArray(unitCode, measuresList) === -1) {
                            measuresList.push(unitCode);
                        }
                    }
                }
            });
            jQuery.each(oDimensions, function (i, d) {
                tmp = d.Dimension.PropertyPath;
                dimensionsList.push(tmp);
                if (oMetadata && oMetadata[tmp]) {
                    if (oMetadata[tmp][textKeyV4]) { //as part of supporting V4 annotation
                        if (oMetadata[tmp][textKeyV4].String && tmp != oMetadata[tmp][textKeyV4].String) {
                            dimensionsList.push(oMetadata[tmp][textKeyV4].String ? oMetadata[tmp][textKeyV4].String : tmp);
                        } else if (oMetadata[tmp][textKeyV4].Path && tmp != oMetadata[tmp][textKeyV4].Path) {
                            dimensionsList.push(oMetadata[tmp][textKeyV4].Path ? oMetadata[tmp][textKeyV4].Path : tmp);
                        }
                    } else if (oMetadata[tmp][textKey] && tmp != oMetadata[tmp][textKey]) {
                        dimensionsList.push(oMetadata[tmp][textKey] ? oMetadata[tmp][textKey] : tmp);
                    }
                }
            });
            ret += ", parameters: {select:'" + [].concat(dimensionsList, measuresList).join(",");
            if (sorterList.length > 0) {
                ret += "," + sorterList.join(",");
            }
            ret += "'";

            var expandDim = [];

            jQuery.each(dimensionsList, function (i, d) {
                var index = d.indexOf("/");
                if (index > 0) {
//				if (!isExpand) {
//					ret += ", expand:'";
//					isExpand = true;
//				}

                    var dimArr = d.split("/");
                    dimArr.splice(-1, 1);
                    dimArr = dimArr.join("/");
                    expandDim.push(dimArr);
                }

            });

            if (expandDim.length > 0) {
                ret += ", expand:'" + expandDim.join(",") + "'";
            }

            /* close `parameters` */
            ret += "}";
            //ret += "'}";


            if (chartEnumArr && ( chartEnumArr[1] === 'Donut' ) && (oDimensions === undefined)) {
                ret += ", length: 1";
            } else if (chartEnumArr && ( chartEnumArr[1] === 'Donut' ) && (oDimensions) && maxItems) {
                ret += ", length: " + (parseInt(maxItems, 10) + 1);
            } else if (maxItems) {
                ret += ", length: " + maxItems;
            }
            ret += "}";
            return ret;
        }

        formatItems.requiresIContext = true;

        function formatChartAxes() {
            var customFormatter = {
                locale: function () {
                },
                format: function (value, pattern) {
                    var patternArr = "";
                    if (pattern) {
                        patternArr = pattern.split('/');
                    }
                    if (patternArr.length > 0) {
                        var minFractionDigits, shortRef;
                        if (patternArr.length == 3) {
                            minFractionDigits = Number(patternArr[1]);
                            shortRef = Number(patternArr[2]);
                            if (isNaN(minFractionDigits)) {
                                minFractionDigits = -1;
                            }
                            if (isNaN(shortRef)) {
                                shortRef = 0;
                            }
                        } else {
                            minFractionDigits = 2;
                            shortRef = 0;
                        }
                        if (patternArr[0] == "axisFormatter" || (patternArr[0] == "ShortFloat")) {
                            // if (pattern == "axisFormatter") {
                            var numberFormat;
                            numberFormat = NumberFormat.getFloatInstance(
                                {
                                    style: 'short',
//										shortRefNumber: shortRef, //FIORITECHP1-4935Reversal of Scale factor in Chart and Chart title.
//										showScale: false,
                                    minFractionDigits: minFractionDigits,
                                    maxFractionDigits: minFractionDigits
                                }
                            );
                            if (patternArr[0] == "ShortFloat") {
                                numberFormat = NumberFormat.getFloatInstance(
                                    {
                                        style: 'short',
                                        minFractionDigits: minFractionDigits,
                                        maxFractionDigits: minFractionDigits
                                    }
                                );
                            }
                            if (minFractionDigits === -1) {
                                numberFormat = NumberFormat.getFloatInstance(
                                    {style: 'short'}
                                );
                            }
                            return numberFormat.format(Number(value));
                        } else if (patternArr[0] === "tooltipNoScaleFormatter") {//Pattern for tooltip other than Date
                            var tooltipFormat = NumberFormat.getFloatInstance(
                                {
                                    style: 'short',
                                    currencyCode: false,
                                    shortRefNumber: shortRef,
                                    showScale: false,
                                    minFractionDigits: minFractionDigits,
                                    maxFractionDigits: minFractionDigits
                                }
                            );
                            if (minFractionDigits === -1) {
                                tooltipFormat = NumberFormat.getCurrencyInstance(
                                    {
                                        style: 'short',
                                        currencyCode: false
                                    }
                                );
                            }
                            return tooltipFormat.format(Number(value));
                        } else if (patternArr[0] == "CURR") {
                            var currencyFormat = NumberFormat.getCurrencyInstance(
                                {
                                    style: 'short',
                                    currencyCode: false,
//										shortRefNumber: shortRef, //FIORITECHP1-4935Reversal of Scale factor in Chart and Chart title.
//										showScale: false,
                                    minFractionDigits: minFractionDigits,
                                    maxFractionDigits: minFractionDigits
                                }
                            );
                            if (minFractionDigits === -1) {
                                currencyFormat = NumberFormat.getCurrencyInstance(
                                    {
                                        style: 'short',
                                        currencyCode: false
                                    }
                                );
                            }
                            return currencyFormat.format(Number(value));
                        } else if (patternArr[0].search("%") !== -1) {
                            //FIORITECHP1-5665 - Donut and Pie charts should be able to show numbers
                            var percentFormat = NumberFormat.getPercentInstance(
                                {
                                    style: 'short',
                                    minFractionDigits: minFractionDigits,
                                    maxFractionDigits: minFractionDigits
                                });
                            if (minFractionDigits === -1) {
                                percentFormat = NumberFormat.getPercentInstance(
                                    {
                                        style: 'short',
                                        minFractionDigits: 1,
                                        maxFractionDigits: 1
                                    });
                            }
                            value = percentFormat.format(Number(value));
                            return value;
                        }
                    }
                    if (value.constructor === Date) {
                        //var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({pattern: "dd-MMM"});
                        //Commented for FIORITECHP1-3963[DEV] OVP-AC – Remove the formatting of the Time Axis
                        var oDateFormat = DateFormat.getDateTimeInstance({pattern: pattern});
                        if (pattern === "YearMonthDay") {
                            oDateFormat = DateFormat.getDateInstance({style: "medium"});
                        }
                        value = oDateFormat.format(new Date(value));
                    }
                    return value;
                }
            };
            VizFormat.numericFormatter(customFormatter);
        }

        /*
         * Check if annotations exist vis-a-vis manifest
         * @param {String} term - Annotation with Qualifier
         * @param {Object} annotation - Annotation Data
         * @param {String} type - Type of Annotation
         * @param {Boolean} [bMandatory=false] - Whether the term is mandatory
         * @param {String} logViewId - Id of the view for log purposes
         * @param {String} contentFragment - To check whether we're dealing with
         * generic analytic card or legacy type.
         * @returns {Boolean}
         */
        function checkExists(term, annotation, type, bMandatory, logViewId, contentFragment) {
            bMandatory = typeof bMandatory === "undefined" ? false : bMandatory;
            var ret = false;
            var annoTerm;
            if (!term && bMandatory) {
                jQuery.sap.log.error(logViewId + errorMessages.CARD_ERROR + type + errorMessages.IS_MANDATORY);
                return ret;
            }
            if (!term) {
                /* Optional parameters can be blank */
                jQuery.sap.log.warning(logViewId + errorMessages.CARD_WARNING + type + errorMessages.IS_MISSING);
                ret = true;
                return ret;
            }
            annoTerm = annotation[term];
            if (!annoTerm || typeof annoTerm !== "object") {
                var logger = bMandatory ? jQuery.sap.log.error : jQuery.sap.log.warning;
                logger(logViewId + errorMessages.CARD_ERROR + "in " + type +
                ". (" + term + " " + errorMessages.NOT_WELL_FORMED);
                return ret;
            }
            /*
             * For new style generic analytical card, make a check chart annotation
             * has chart type.
             */
            if (contentFragment &&
                contentFragment == "sap.ovp.cards.charts.analytical.analyticalChart" &&
                type == "Chart Annotation" &&
                (!annoTerm.ChartType || !annoTerm.ChartType.EnumMember)) {
                jQuery.sap.log.error(logViewId + errorMessages.CARD_ERROR + errorMessages.MISSING_CHARTTYPE +
                errorMessages.CHART_ANNO);
                return ret;
            }
            ret = true;
            return ret;
        }

        /*
         * Check and log errors/warnings if any.
         */
        function validateCardConfiguration(oController) {
            var ret = false;
            if (!oController) {
                return ret;
            }
            var selVar;
            var chartAnno;
            var contentFragment;
            var preVar;
            var idAnno;
            var dPAnno;
            var entityTypeData;
            var logViewId = "";
            var oCardsModel;
            var oView = oController.getView();
            if (oView) {
                logViewId = "[" + oView.getId() + "] ";
            }

            if (!(oCardsModel = oController.getCardPropertiesModel())) {
                jQuery.sap.log.error(logViewId + errorMessages.CARD_ERROR + "in " + errorMessages.CARD_CONFIG +
                errorMessages.NO_CARD_MODEL);
                return ret;
            }

            entityTypeData = oCardsModel.getProperty("/entityType");
            if (!entityTypeData || jQuery.isEmptyObject(entityTypeData)) {
                jQuery.sap.log.error(logViewId + errorMessages.CARD_ERROR + "in " + errorMessages.CARD_ANNO);
                return ret;
            }

            selVar = oCardsModel.getProperty("/selectionAnnotationPath");
            chartAnno = oCardsModel.getProperty("/chartAnnotationPath");
            preVar = oCardsModel.getProperty("/presentationAnnotationPath");
            idAnno = oCardsModel.getProperty("/identificationAnnotationPath");
            dPAnno = oCardsModel.getProperty("/dataPointAnnotationPath");
            contentFragment = oCardsModel.getProperty("/contentFragment");

            ret = checkExists(selVar, entityTypeData, "Selection Variant", false, logViewId);
            ret = checkExists(chartAnno, entityTypeData, "Chart Annotation", true, logViewId, contentFragment) && ret;
            ret = checkExists(preVar, entityTypeData, "Presentation Variant", false, logViewId) && ret;
            ret = checkExists(idAnno, entityTypeData, "Identification Annotation", true, logViewId) && ret;
            ret = checkExists(dPAnno, entityTypeData, "Data Point", false, logViewId) && ret;
            return ret;
        }

        /*
         * @param {Object} [oChartType] - Chart Annotation Object
         * @returns {Object} - Get config object of a particular chart type from
         * configuration defined in config.json.
         * If the param is absent, return config of all charts.
         */
        function getConfig(oChartType) {
            return Utils.getConfig(oChartType);
        }

        /*
         * If there is exactly one dimension with time semantics (according to model metadata),
         * then instead time type shall be used.
         */
        function hasTimeSemantics(aDimensions, config, dataModel, entitySet) {
            var ret = false;
            var oMetadata;
            var dimensionName;
            var dimensionType;
            var displayFormat;
            var sapSemantics;
            var sapSemanticsV4; //as part of supporting V4 annotation
            if (!config.time || jQuery.isEmptyObject(config.time)) {
                return ret;
            }
            if (!aDimensions) {
                return ret;
            }
//		if (aDimensions.length != 1) {
//			return ret;
//		}
            if (!aDimensions[0].Dimension || !(dimensionName = aDimensions[0].Dimension.PropertyPath)) {
                return ret;
            }
            oMetadata = getMetadata(dataModel, entitySet);

            for (var i = 0; i < aDimensions.length; i++) {
                if (aDimensions[i] && aDimensions[i].Dimension && aDimensions[i].Dimension.PropertyPath) {
                    dimensionName = aDimensions[i].Dimension.PropertyPath;
                }
                if (oMetadata && oMetadata[dimensionName]) {
                    dimensionType = oMetadata[dimensionName][constants.TYPE_KEY];
                    displayFormat = oMetadata[dimensionName][constants.DISPLAY_FORMAT_KEY];
                    sapSemantics = oMetadata[dimensionName][constants.SEMANTICS_KEY];
                    sapSemanticsV4 = oMetadata[dimensionName]["com.sap.vocabularies.Common.v1.IsCalendarYear"]; //as part of supporting V4 annotation
                }
                if (dimensionType &&
                    displayFormat &&
                    dimensionType.lastIndexOf("Edm.Date", 0) === 0 &&
                    displayFormat.toLowerCase() == "date") {
                    ret = true;
                    return ret;
                } //as part of supporting V4 annotation
                if (dimensionType == "Edm.String" && (sapSemanticsV4 || sapSemantics && sapSemantics.lastIndexOf("year", 0) === 0)) {
                    ret = true;
                    return ret;
                }
            }
            return ret;
        }


        /*
         * Formatter for VizFrame type.
         * @param {Object} oChartType - Chart Annotation Object
         * @returns {String} Valid Enum for Vizframe type
         */
        function getChartType(iContext, oChartType, aDimensions) {
            var ret = "";
            var config = getConfig(oChartType);
            var dataModel, entitySet;
            if (!config) {
                return ret;
            }
            ret = config.default.type;
            dataModel = iContext.getSetting("dataModel");
            entitySet = iContext.getSetting('ovpCardProperties').getProperty("/entitySet");
            if (hasTimeSemantics(aDimensions, config, dataModel, entitySet)) {
                ret = config.time.type;
            }
            return ret;
        }

        getChartType.requiresIContext = true;

        function getPrimitiveValue(oValue) {
            var value;

            if (oValue) {
                if (oValue.String) {
                    value = oValue.String;
                } else if (oValue.Boolean || oValue.Bool) {
                    value = getBooleanValue(oValue);
                } else {
                    value = getNumberValue(oValue);
                }
            }
            return value;
        }

        function getBooleanValue(oValue, bDefault) {
            if (oValue && oValue.Boolean) {
                if (oValue.Boolean.toLowerCase() === "true") {
                    return true;
                } else if (oValue.Boolean.toLowerCase() === "false") {
                    return false;
                }
            } else if (oValue && oValue.Bool) {
                if (oValue.Bool.toLowerCase() === "true") {
                    return true;
                } else if (oValue.Bool.toLowerCase() === "false") {
                    return false;
                }
            }

            return bDefault;
        }

        function getNumberValue(oValue) {
            var value;

            if (oValue) {
                if (oValue.String) {
                    value = Number(oValue.String);
                } else if (oValue.Int) {
                    value = Number(oValue.Int);
                } else if (oValue.Decimal) {
                    value = Number(oValue.Decimal);
                } else if (oValue.Double) {
                    value = Number(oValue.Double);
                } else if (oValue.Single) {
                    value = Number(oValue.Single);
                }
            }
            return value;
        }

        /*
         * Get the (cached) OData metadata information.
         */
        function getMetadata(model, entitySet) {
            var map = Utils.cacheODataMetadata(model);
            if (!map) {
                return undefined;
            }
            return map[entitySet];
        }

        /*function setSmartFormattedChartTitle(measureArr, dimensionArr, smartChart) {
            var txt = "", measureStr = "", dimensionStr = "";
            if (smartChart) {
                txt = smartChart.getHeader();
            }

            if (measureArr && (measureArr.length > 1)) {
                for (var i = 0; i < measureArr.length - 1; i++) {
                    if (measureStr != "") {
                        measureStr += ", ";
                    }
                    measureStr += measureArr[i];
                }
                measureStr = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("MEAS_DIM_TITLE", [measureStr, measureArr[i]]);
            } else if (measureArr) {
                measureStr = measureArr[0];
            }

            if (dimensionArr && (dimensionArr.length > 1)) {
                for (var i = 0; i < dimensionArr.length - 1; i++) {
                    if (dimensionStr != "") {
                        dimensionStr += ", ";
                    }
                    dimensionStr += dimensionArr[i];
                }
                dimensionStr = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("MEAS_DIM_TITLE", [dimensionStr, dimensionArr[i]]);
            } else if (dimensionArr) {
                dimensionStr = dimensionArr[0];
            }

            if (smartChart && smartChart.getHeader() == "Dummy") {
                txt = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("NO_CHART_TITLE", [measureStr, dimensionStr]);
                smartChart.setHeader(txt);
                //smartChart.data("aria-label",txt,true);
            }

            return txt;
        }*/

        function getSelectedDataPoint(vizFrame, controller) {

            vizFrame.attachSelectData(function (oEvent) {

                var oCardsModel = vizFrame.getModel('ovpCardProperties');
                var dataModel = vizFrame.getModel();
                var entitySet = oCardsModel.getProperty("/entitySet");
                var oMetadata = getMetadata(dataModel, entitySet);
                var dimensionArrayNames = [], dimensions = [];
                var finalDimensions = {}, aCustomContext = {};
                var dimensionsArr = vizFrame.getDataset().getDimensions();
                var contextNumber;

                for (var i = 0; i < dimensionsArr.length; i++) {
                    dimensionArrayNames.push(dimensionsArr[i].getIdentity());
                }

                var allData = jQuery.map(vizFrame.getDataset()._getDataContexts(), function (x) {
                    return x.getObject();
                }); //_getDataContexts is a private function, try to find another way!

                if (oEvent.getParameter("data") && oEvent.getParameter("data")[0] && oEvent.getParameter("data")[0].data) {

                    contextNumber = oEvent.getParameter("data")[0].data._context_row_number;
                    if (allData[contextNumber].$isOthers && allData[contextNumber].$isOthers == true) {
                        var donutIntent = {$isOthers: true};
                        var payLoad = {
                            getObject: function () {
                                return donutIntent;
                            }
                        };
                        controller.doNavigation(payLoad);
                    } else {
                        dimensions = Object.keys(oEvent.getParameter("data")[0].data);

                        for (var j = 0; j < dimensionArrayNames.length; j++) {
                            for (var k = 0; k < dimensions.length; k++) {
                                if (dimensionArrayNames[j] == dimensions[k]) {
                                    finalDimensions[dimensionArrayNames[j]] = allData[contextNumber][dimensionArrayNames[j]];
                                }
                                for (var key in allData[contextNumber]) {
                                    if (oMetadata.hasOwnProperty(key)) {
                                        aCustomContext[key] = allData[contextNumber][key]; //aCustomContext will have all the data related to datapoint
                                    }
                                }
                            }
                        }
                        var payLoad = {
                            getObject: function () {
                                return finalDimensions;
                            },
                            //getAllData will allow the user to pass additional data using cutom navigation
                            getAllData: function () {
                                return aCustomContext;
                            }
                        };

                        controller.doNavigation(payLoad);
                    }
                }
            });
        }

        function checkBubbleChart(chartType) {
            if (chartType.EnumMember.endsWith("Bubble")) {
                return true;
            } else {
                return false;
            }
        }

        function dimensionAttrCheck(dimensions) {
            var ret = false;
            if (!dimensions ||
                dimensions.constructor != Array ||
                dimensions.length < 1 ||
                dimensions[0].constructor != Object || !dimensions[0].Dimension || !dimensions[0].Dimension.PropertyPath) {
                jQuery.sap.log.error(errorMessages.CHART_ANNO_ERROR + "in " + errorMessages.CHART_ANNO + " " +
                errorMessages.DIMENSIONS_MANDATORY);
                return ret;
            }
            ret = true;
            return ret;
        }

        function measureAttrCheck(measures) {
            var ret = false;
            if (!measures ||
                measures.constructor != Array ||
                measures.length < 1 ||
                measures[0].constructor != Object || !measures[0].Measure || !measures[0].Measure.PropertyPath) {
                jQuery.sap.log.error(errorMessages.CHART_ANNO_ERROR + "in " + errorMessages.CHART_ANNO + " " +
                errorMessages.MEASURES_MANDATORY);
                return ret;
            }
            ret = true;
            return ret;
        }

        function getEntitySet(oEntitySet) {
            return oEntitySet.name;
        }

        function getAnnotationQualifier(annotationPath) {
            if (annotationPath && annotationPath.indexOf("#") != -1) {
                var tokens = annotationPath.split("#");
                if (tokens.length > 1) {
                    return tokens[1];
                }
            }
            return "";
        }

        function buildSmartAttributes(smartChart, chartTitle, oContext) {
            /**
             * A function to take a string written in dot notation style, and use it to
             * find a nested object property inside of an object and also set the value
             *
             * @method {Private} getOrSetNestedProperty
             * @param {Object} object - The object to search
             * @param {String} path -  A dot notation style parameter reference (ie "name.firstName")
             * @param {String} valueToSet - (Optional) value to set
             *
             * @return {String} the value of the property
             */
            function getOrSetNestedProperty(object, path, valueToSet) {
                var pList = path.split('.');
                var key = pList.pop();
                var pointer = pList.reduce(function (accumulator, currentValue) {
                    if (accumulator[currentValue] === undefined) {
                        accumulator[currentValue] = {};
                    }
                    return accumulator[currentValue];
                }, object);
                if (valueToSet) {
                    pointer[key] = valueToSet;
                }
                return pointer[key];
            }

            var oCardsModel, entityTypeObject, chartAnno, chartContext;
            var chartType, allConfig, config, aDimensions, aMeasures, aQueuedMeasures, aQueuedDimensions;
            var bSupportsTimeSemantics;
            var reference;
            var oVizProperties;
            var measureArr = [], dimensionArr = [];
            var chart = smartChart.getChart();
            //var vizFrame = smartChart._getVizFrame();
            chartType = chart.getChartType();
            allConfig = getConfig();

            for (var key in allConfig) {
                if ((reference = allConfig[key].reference) &&
                    allConfig[reference]) {
                    var virtualEntry = jQuery.extend(true, {}, allConfig[reference]);
                    allConfig[key] = virtualEntry;
                }
                if (allConfig[key].default.type == chartType ||
                    (allConfig[key].time && allConfig[key].time.type == chartType)) {
                    config = allConfig[key];
                    break;
                }
            }


            if (!config) {
                jQuery.sap.log.error(errorMessages.CARD_ERROR + "in " + errorMessages.CARD_CONFIG +
                errorMessages.CARD_CONFIG_ERROR + chartType + " " + errorMessages.CARD_CONFIG_JSON);
                return;
            }

            if (!(oCardsModel = smartChart.getModel('ovpCardProperties'))) {
                jQuery.sap.log.error(errorMessages.CARD_ERROR + "in " + errorMessages.CARD_CONFIG +
                errorMessages.NO_CARD_MODEL);
                return;
            }
            var dataModel = smartChart.getModel();
            var entitySet = oCardsModel.getProperty("/entitySet");
            if (!dataModel || !entitySet) {
                return;
            }
            entityTypeObject = oCardsModel.getProperty("/entityType");
            if (!entityTypeObject) {
                jQuery.sap.log.error(errorMessages.CARD_ANNO_ERROR + "in " + errorMessages.CARD_ANNO);
                return;
            }

            var oMetadata = getMetadata(dataModel, entitySet);

            chartAnno = oCardsModel.getProperty("/chartAnnotationPath");
            if (!chartAnno || !(chartContext = entityTypeObject[chartAnno])) {
                jQuery.sap.log.error(errorMessages.CARD_ANNO_ERROR + "in " + errorMessages.CARD_ANNO);
                return;
            }

            if (!(aDimensions = chartContext.DimensionAttributes) || !aDimensions.length) {
                jQuery.sap.log.error(errorMessages.CHART_ANNO_ERROR + "in " + errorMessages.CHART_ANNO + " " +
                errorMessages.DIMENSIONS_MANDATORY);
                return;
            }

            //Added support for fractional digits
            var aNumberOfFractionalDigits;
            if (!(aMeasures = chartContext.MeasureAttributes) || !aMeasures.length) {
                jQuery.sap.log.error(errorMessages.CHART_ANNO_ERROR + "in " + errorMessages.CHART_ANNO + " " +
                errorMessages.MEASURES_MANDATORY);
                return;
            }else {
                var datapointAnnotationPath = aMeasures[0].DataPoint ? entityTypeObject[aMeasures[0].DataPoint.AnnotationPath.substring(1)] : null;
                var dpNumberOfFractionalDigits = datapointAnnotationPath && datapointAnnotationPath.NumberFormat && datapointAnnotationPath.NumberFormat.NumberOfFractionalDigits && datapointAnnotationPath.NumberFormat.NumberOfFractionalDigits.Int;
                aNumberOfFractionalDigits = dpNumberOfFractionalDigits ? dpNumberOfFractionalDigits : 0;
            }

            aQueuedDimensions = aDimensions.slice();
            aQueuedMeasures = aMeasures.slice();

            var property, labelDisplay;

            for (var i = 0; i < aQueuedDimensions.length; i++) {
                var dimObj = aQueuedDimensions[i];
                if (dimObj && dimObj.Dimension && dimObj.Dimension.PropertyPath) {
                    property = dimObj.Dimension.PropertyPath;
                    if (oMetadata && oMetadata[property]) {
                        if (oMetadata[property][constants.LABEL_KEY_V4]) { //as part of supporting V4 annotation
                            labelDisplay = oMetadata[property][constants.LABEL_KEY_V4].String ? oMetadata[property][constants.LABEL_KEY_V4].String : oMetadata[property][constants.LABEL_KEY_V4].Path;
                        } else if (oMetadata[property][constants.LABEL_KEY]) {
                            labelDisplay = oMetadata[property][constants.LABEL_KEY];
                        } else if (property) {
                            labelDisplay = property;
                        }
                        dimensionArr.push(labelDisplay);
                    }
                }
            }
            for (var j = 0; j < aQueuedMeasures.length; j++) {
                var measObj = aQueuedMeasures[j];
                if (measObj && measObj.Measure && measObj.Measure.PropertyPath) {
                    property = measObj.Measure.PropertyPath;
                    if (oMetadata && oMetadata[property]) {
                        if (oMetadata[property][constants.LABEL_KEY_V4]) { //as part of supporting V4 annotation
                            labelDisplay = oMetadata[property][constants.LABEL_KEY_V4].String ? oMetadata[property][constants.LABEL_KEY_V4].String : oMetadata[property][constants.LABEL_KEY_V4].Path;
                        } else if (oMetadata[property][constants.LABEL_KEY]) {
                            labelDisplay = oMetadata[property][constants.LABEL_KEY];
                        } else if (property) {
                            labelDisplay = property;
                        }
                        measureArr.push(labelDisplay);
                    }
                }
            }

            bSupportsTimeSemantics = hasTimeSemantics(aDimensions, config, dataModel, entitySet);
            if (bSupportsTimeSemantics) {
                config = config.time;
            } else {
                config = config.default;
            }

            var bErrors = false;
            var tooltipFormatString = aNumberOfFractionalDigits > 0 ? "tooltipNoScaleFormatter/" + aNumberOfFractionalDigits.toString() + "/" : 'tooltipNoScaleFormatter/-1/';
            var oTooltip = new VizTooltip({formatString: tooltipFormatString});
            oTooltip.connect(chart.getVizUid());

            if (chart) {
                var vizProperties = chart.getVizProperties();

                var bHideAxisTitle = true;

                if (config.properties && config.properties.hasOwnProperty("hideLabel") && !config.properties["hideLabel"]) {
                    bHideAxisTitle = false;
                }

//			var bDatapointNavigation = true;
//			var dNav = oCardsModel.getProperty("/navigation");
//			if (dNav == "chartNav") {
//				bDatapointNavigation = false;
//			}
                var bDonutChart = false;
                if (chartType == 'donut') {
                    bDonutChart = true;
                }

                if (vizProperties && vizProperties.plotArea && vizProperties.plotArea.dataLabel && vizProperties.plotArea.dataLabel.visible) {
                    vizProperties.plotArea.dataLabel.visible = bDonutChart;
                }
//			vizProperties.legend.isScrollable = false;
                vizProperties.title.visible = bHideAxisTitle ? false : true;
//			vizProperties.general.groupData = false;
//			vizProperties.general.showAsUTC = true;

                oVizProperties = {
                    legend: {
                        isScrollable: false
                    },
                    valueAxis: {
                        title: {
                            visible: bHideAxisTitle ? false : true
                        },
                        label: {
                            // added NumberOfFractionalDigits reserved for the DataPoint
                            formatString: vizProperties.valueAxis.label.formatString + (aNumberOfFractionalDigits ? "/" + aNumberOfFractionalDigits + "/" : "")
                        }
                    },
                    categoryAxis: {
                        title: {
                            visible: bHideAxisTitle ? false : true
                        }
                    },
                    plotArea: {
                        window: {
                            start: 'firstDataPoint',
                            end: 'lastDataPoint'
                        },
                        dataLabel: {
                            visible: bDonutChart,
                            type: 'value'
//							formatString: bDonutChart ? '0.0%' : vizProperties.plotArea.dataLabel.formatString
                        }
                    },
                    interaction: {
                        selectability: {
                            legendSelection: false,
                            axisLabelSelection: false,
                            mode: 'EXCLUSIVE',
                            plotLassoSelection: false,
                            plotStdSelection: true
                        },
                        zoom: {
                            enablement: 'disabled'
                        }
                    }
                };

                var aColorPalette = oCardsModel.getProperty("/colorPalette");
                var colorPaletteDimension;
                if (chartContext.ChartType.EnumMember === VizAnnotationManager.constants.COLUMNSTACKED_CHARTTYPE && aColorPalette && aColorPalette.length === 4) {
                    jQuery.each(aDimensions, function (i, oDimension) {
                        if (oDimension && oDimension.Role && oDimension.Role.EnumMember == "com.sap.vocabularies.UI.v1.ChartDimensionRoleType/Series") {
                            colorPaletteDimension = oDimension.Dimension && oDimension.Dimension.PropertyPath;
                            return;
                        }
                    });
                    var feedName;
                    if (colorPaletteDimension) {
                        var analyticalChart = smartChart.getChart();
                        if (colorPaletteDimension && !oContext.bSorterSetForCustomCharts) {
                            var chartData = analyticalChart.getBinding("data");
                            if (chartData) {
                                chartData.sort([new sap.ui.model.Sorter(colorPaletteDimension, true)]);
                                oContext.bSorterSetForCustomCharts = true;
                            }
                        }
                        if (oMetadata && oMetadata[colorPaletteDimension]) {
                            if (oMetadata[colorPaletteDimension][constants.LABEL_KEY_V4]) { //as part of supporting V4 annotation
                                feedName = oMetadata[colorPaletteDimension][constants.LABEL_KEY_V4].String ? oMetadata[colorPaletteDimension][constants.LABEL_KEY_V4].String : oMetadata[colorPaletteDimension][constants.LABEL_KEY_V4].Path;
                            } else if (oMetadata[colorPaletteDimension][constants.LABEL_KEY]) {
                                feedName = oMetadata[colorPaletteDimension][constants.LABEL_KEY];
                            } else if (colorPaletteDimension) {
                                feedName = colorPaletteDimension;
                            }
                        }
                        var aColorValues = aColorPalette.map(function (value) {
                            return value.color;
                        });
                        var aLegendTexts = aColorPalette.map(function (value) {
                            return value.legendText;
                        });

                        //put strings in resource bundle
                        var libResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ovp");
                        var othersCustomLegend = aLegendTexts[0] != undefined ? aLegendTexts[0] : libResourceBundle.getText("OTHERS");
                        var badCustomLegend = aLegendTexts[1] != undefined ? aLegendTexts[1] : libResourceBundle.getText("BAD");
                        var criticalCustomLegend = aLegendTexts[2] != undefined ? aLegendTexts[2] : libResourceBundle.getText("CRITICAL");
                        var goodCustomLegend = aLegendTexts[3] != undefined ? aLegendTexts[3] : libResourceBundle.getText("GOOD");

                        oVizProperties.plotArea.dataPointStyle = {
                            rules: [
                                {
                                    callback: function (oContext) {
                                        if ((oContext && (oContext[feedName] === "3" || oContext[feedName] === 3)) || (oContext && (oContext[colorPaletteDimension] === "3" || oContext[colorPaletteDimension] === 3))) {
                                            return true;
                                        }
                                    },
                                    properties: {
                                        color: aColorValues[3]
                                    },
                                    "displayName": goodCustomLegend
                                },
                                {
                                    callback: function (oContext) {
                                        if ((oContext && (oContext[feedName] === "2" || oContext[feedName] === 2)) || (oContext && (oContext[colorPaletteDimension] === "2" || oContext[colorPaletteDimension] === 2))) {
                                            return true;
                                        }
                                    },
                                    properties: {
                                        color: aColorValues[2]
                                    },
                                    "displayName": criticalCustomLegend
                                },
                                {
                                    callback: function (oContext) {
                                        if ((oContext && (oContext[feedName] === "1" || oContext[feedName] === 1)) || (oContext && (oContext[colorPaletteDimension] === "1" || oContext[colorPaletteDimension] === 1))) {
                                            return true;
                                        }
                                    },
                                    properties: {
                                        color: aColorValues[1]
                                    },
                                    "displayName": badCustomLegend
                                },
                                {
                                    callback: function (oContext) {
                                        if ((oContext && (oContext[feedName] === "0" || oContext[feedName] === 0)) || (oContext && (oContext[colorPaletteDimension] === "0" || oContext[colorPaletteDimension] === 0))) {
                                            return true;
                                        }
                                    },
                                    properties: {
                                        color: aColorValues[0]
                                    },
                                    "displayName": othersCustomLegend
                                }]
                        };
                    }
                }

                /*Check if the Config.json has scale properties set*/
                //var bConsiderAnnotationScales = false;

                if (chartContext.ChartType.EnumMember === constants.SCATTER_CHARTTYPE ||
                    chartContext.ChartType.EnumMember === constants.BUBBLE_CHARTTYPE ||
                    chartContext.ChartType.EnumMember === constants.LINE_CHARTTYPE) {
                    if (chartContext && chartContext.AxisScaling && chartContext.AxisScaling.EnumMember) {
                        var sScaleType = chartContext.AxisScaling.EnumMember.substring(chartContext.AxisScaling.EnumMember.lastIndexOf('/') + 1, chartContext.AxisScaling.EnumMember.length);
                        //bConsiderAnnotationScales are individually set for each case to make sure the scale values are set casewise
                        switch (sScaleType) {
                            case "AdjustToDataIncluding0":
                                oVizProperties.plotArea.adjustScale = false;
                                //bConsiderAnnotationScales = true;
                                break;
                            case "AdjustToData":
                                oVizProperties.plotArea.adjustScale = true;
                                //bConsiderAnnotationScales = true;
                                break;
                            case "MinMaxValues":
                                var aChartScales = [];
                                if (chartContext["MeasureAttributes"][0] &&
                                    chartContext["MeasureAttributes"][0].DataPoint &&
                                    chartContext["MeasureAttributes"][0].DataPoint.AnnotationPath) {
                                    var sDataPointAnnotationPath = chartContext["MeasureAttributes"][0].DataPoint.AnnotationPath;
                                    var sDataPointPath = sDataPointAnnotationPath.substring(sDataPointAnnotationPath.lastIndexOf('@') + 1, sDataPointAnnotationPath.length);
                                    if (entityTypeObject && entityTypeObject[sDataPointPath]) {
                                        var oMinMaxParams = entityTypeObject[sDataPointPath];
                                        if (oMinMaxParams && oMinMaxParams.MaximumValue && oMinMaxParams.MaximumValue.Decimal &&
                                            oMinMaxParams.MinimumValue && oMinMaxParams.MinimumValue.Decimal) {
                                            aChartScales.push({
                                                feed: "valueAxis",
                                                max: oMinMaxParams.MaximumValue.Decimal,
                                                min: oMinMaxParams.MinimumValue.Decimal
                                            });
                                            //bConsiderAnnotationScales = true;
                                        } else {
                                            jQuery.sap.log.error(errorMessages.ERROR_MISSING_AXISSCALES);
                                        }

                                    }

                                }
                                //LINE_CHARTTYPE donot have valueAxis2
                                if (chartContext.ChartType.EnumMember !== constants.LINE_CHARTTYPE &&
                                    chartContext["MeasureAttributes"][1] &&
                                    chartContext["MeasureAttributes"][1].DataPoint &&
                                    chartContext["MeasureAttributes"][1].DataPoint.AnnotationPath) {
                                    var sDataPointAnnotationPath = chartContext["MeasureAttributes"][1].DataPoint.AnnotationPath;
                                    var sDataPointPath = sDataPointAnnotationPath.substring(sDataPointAnnotationPath.lastIndexOf('@') + 1, sDataPointAnnotationPath.length);
                                    if (entityTypeObject && entityTypeObject[sDataPointPath]) {
                                        var oMinMaxParams = entityTypeObject[sDataPointPath];
                                        if (oMinMaxParams && oMinMaxParams.MaximumValue && oMinMaxParams.MaximumValue.Decimal &&
                                            oMinMaxParams.MinimumValue && oMinMaxParams.MinimumValue.Decimal) {
                                            aChartScales.push({
                                                feed: "valueAxis2",
                                                max: oMinMaxParams.MaximumValue.Decimal,
                                                min: oMinMaxParams.MinimumValue.Decimal
                                            });
                                            //bConsiderAnnotationScales = true;
                                        } else {
                                            jQuery.sap.log.error(errorMessages.ERROR_MISSING_AXISSCALES);
                                        }
                                    }

                                }
                                chart.setVizScales(aChartScales);
                                break;
                            default:
                                break;
                        }
                    }
                }
                var chartProps = oCardsModel.getProperty('/ChartProperties');
                if (config.hasOwnProperty('vizProperties')) {
                    var defaultConfigs = config.vizProperties;
                    for (var i = 0; i < defaultConfigs.length; i++) {
                        if (chartProps && defaultConfigs[i].hasOwnProperty('path')) {
                            var chartPropsValue = getOrSetNestedProperty(chartProps, defaultConfigs[i].path);
                            if (undefined !== chartPropsValue) {
                                getOrSetNestedProperty(oVizProperties, defaultConfigs[i].path, chartPropsValue);
                            }
                        }
                    }
                }

                chart.setVizProperties(oVizProperties);
            }
            /*
             * Check if given number of dimensions, measures
             * are valid acc to config's min and max requirements
             */
            [config.dimensions, config.measures].forEach(function (entry, i) {
                var oProperty = i ? aMeasures : aDimensions;
                var typeCue = i ? "measure(s)" : "dimension(s)";
                if (entry.min && oProperty.length < entry.min) {
                    jQuery.sap.log.error(errorMessages.CARD_ERROR + "in " + chartType +
                    " " + errorMessages.CARD_LEAST + entry.min + " " + typeCue);
                    bErrors = true;
                }
                if (entry.max && oProperty.length > entry.max) {
                    jQuery.sap.log.error(errorMessages.CARD_ERROR + "in " + chartType +
                    errorMessages.CARD_MOST + entry.max + " " + typeCue);
                    bErrors = true;
                }
            });

            if (bErrors) {
                return;
            }

            //setSmartFormattedChartTitle(measureArr, dimensionArr, smartChart);
            setFormattedChartTitle(measureArr, dimensionArr, chartTitle);

            if (smartChart) {
                if (smartChart._headerText) {
                    //smartChart._headerText.setMaxLines(1);
                    smartChart._headerText.setTooltip(smartChart.getHeader());
                    smartChart._headerText.addStyleClass("ovpChartTitle");
                }
                //smartChart.setHeader(headerTitle);
                /*smartChart._refreshHeaderText();
                 var toolbar = smartChart.getToolbar();
                 if (toolbar) {
                 toolbar.addStyleClass("smartChartToolBar");
                 }
                 if (smartChart._oDetailsButton) {
                 smartChart._oDetailsButton.addStyleClass("smartDetailsButton");
                 }*/
            }
        }
        
		function setFormattedChartTitle(measureArr,dimensionArr,chartTitle) {
			var txt = "", measureStr = "", dimensionStr = "";
			if (chartTitle) {
				txt = chartTitle.getText();
			}
		
			if (measureArr && (measureArr.length > 1)) {
				for (var i = 0; i < measureArr.length - 1; i++) {
					if (measureStr != "") {
						measureStr += ", ";
					}
					measureStr += measureArr[i];
				}
				measureStr = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("MEAS_DIM_TITLE",[measureStr, measureArr[i]]);
			} else if (measureArr) {
				measureStr = measureArr[0];
			}
		
			if (dimensionArr && (dimensionArr.length > 1) ) {
				for (var i = 0; i < dimensionArr.length - 1; i++) {
					if (dimensionStr != "") {
						dimensionStr += ", ";
					}
					dimensionStr += dimensionArr[i];
				}
				dimensionStr = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("MEAS_DIM_TITLE",[dimensionStr, dimensionArr[i]]);
			} else if (dimensionArr) {
				dimensionStr = dimensionArr[0];
			}
		
			if (chartTitle && (txt == "")) {
				txt = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("NO_CHART_TITLE",[measureStr,dimensionStr]); 
				chartTitle.setText(txt);
				chartTitle.data("aria-label",txt,true);
			}
		}

        function getSapLabel(aMeasure, oMetadata) {
            var value;
            jQuery.each(oMetadata, function (i, v) {
                if (v.name == aMeasure) {
                    if (v["com.sap.vocabularies.Common.v1.Label"]) { //as part of supporting V4 annotation
                        value = v["com.sap.vocabularies.Common.v1.Label"].String ? v["com.sap.vocabularies.Common.v1.Label"].String : v["com.sap.vocabularies.Common.v1.Label"].Path;
                    } else if (v["sap:label"]) {
                        value = v["sap:label"];
                    }
                    return false;
                }
            });
            return value;
        }

        function formatByType(oMetadata, sProp, sVal) {
            var typeKey = constants.TYPE_KEY;
            if (!oMetadata || !oMetadata[sProp] || !oMetadata[sProp][typeKey]) {
                return sVal;
            }
            var aNumberTypes = [
                "Edm.Int",
                "Edmt.Int16",
                "Edm.Int32",
                "Edm.Int64",
                "Edm.Decimal"
            ];
            var currentType = oMetadata[sProp][typeKey];
            if (jQuery.inArray(currentType, aNumberTypes) !== -1) {
                return Number(sVal);
            }
            return sVal;
        }

        /*
         * Method to calculate the initial items mentioned in presentation annotation and data step
         * @method getMaxItems
         * @param {Object} oSmartChart - smart chart object
         * @return {Object} object - object containing maxitems and data step
         */
        function getMaxItems(oSmartChart) {
            var oCardsModel = oSmartChart.getModel('ovpCardProperties'),
                entityTypeObject = oCardsModel.getProperty("/entityType"),
                presentationAnno = oCardsModel.getProperty("/presentationAnnotationPath"),
                presentationContext = entityTypeObject.hasOwnProperty(presentationAnno) && entityTypeObject[presentationAnno],
                maxItemTerm = presentationContext && presentationContext.MaxItems;
            //var entitySet = oCardsModel.getProperty("/entitySet");
            if (maxItemTerm) {
                return {
                    itemsLength: +(maxItemTerm.Int32 ? maxItemTerm.Int32 : maxItemTerm.Int),
                    dataStep: +oCardsModel.getProperty("/dataStep")
                };
            }
        }

        function attachDataReceived(oSmartChart, oContext) {
            oSmartChart.attachDataReceived(function (oEvent) {

                var chartTitle = oContext.getView().byId("ovpCT1");
                //var chartTitle = oSmartChart.getHeader();
                var vizFrame = oSmartChart._getVizFrame();
                //To set the bubble width text after the data is received
                var bubbleText = oContext.getView().byId("bubbleText");
                var bubbleSizeText = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("BUBBLESIZE");
                if (vizFrame) {
                    if (bubbleText != undefined) {
                        var feeds = vizFrame.getFeeds();
                        jQuery.each(feeds, function (i, v) {
                            if (feeds[i].getUid() == "bubbleWidth") {
                                var entitySetName = oContext.getEntitySet() && oContext.getEntitySet().name;
                                var dataModel = vizFrame.getModel();
                                var oMetadata = getMetadata(dataModel, entitySetName);
                                var feedName = feeds[i].getValues() && feeds[i].getValues()[0] && feeds[i].getValues()[0].getName();
                                var bubbleSizeValue = getSapLabel(feedName, oMetadata);
                                bubbleText.setText(bubbleSizeText + " " + bubbleSizeValue);
                            }
                        });
                    }
                }

                if (!oContext.isVizPropSet) {
                buildSmartAttributes(oSmartChart, chartTitle, oContext);
                    oContext.isVizPropSet = true;
                }

            });
        }

        //The returned attributes can be used outside this file using namespace sap.ovp.cards.charts.SmartAnnotationManager
        return {
            getSapLabel:getSapLabel,
            buildSmartAttributes:buildSmartAttributes,
            errorMessages: errorMessages,
            formatItems: formatItems,
            formatChartAxes: formatChartAxes,
            checkExists: checkExists,
            validateCardConfiguration: validateCardConfiguration,
            getConfig: getConfig,
            hasTimeSemantics: hasTimeSemantics,
            getChartType: getChartType,
            getPrimitiveValue: getPrimitiveValue,
            getMetadata: getMetadata,
            getSelectedDataPoint: getSelectedDataPoint,
            checkBubbleChart: checkBubbleChart,
            dimensionAttrCheck: dimensionAttrCheck,
            measureAttrCheck: measureAttrCheck,
            getEntitySet: getEntitySet,
            getAnnotationQualifier: getAnnotationQualifier,
            formatByType: formatByType,
            getMaxItems: getMaxItems,
            attachDataReceived: attachDataReceived
        };


    },
    /* bExport= */true);
