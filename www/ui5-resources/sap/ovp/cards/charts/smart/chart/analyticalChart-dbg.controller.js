sap.ui.define(["sap/ovp/cards/generic/Card.controller", "jquery.sap.global",
        "sap/ovp/cards/charts/VizAnnotationManager", "sap/ui/comp/odata/MetadataAnalyser",
        "sap/ovp/cards/charts/SmartAnnotationManager", "sap/ui/model/Filter",
        "sap/ovp/cards/AnnotationHelper", "sap/ui/model/Sorter"],

    function (CardController, jQuery, VizAnnotationManager, MetadataAnalyser, SmartAnnotationManager, Filter,
              AnnotationHelper, Sorter) {
        "use strict";
        /*global sap, jQuery */

        return CardController.extend("sap.ovp.cards.charts.smart.chart.analyticalChart", {
            onInit: function () {
                //The base controller lifecycle methods are not called by default, so they have to be called
                //Take reference from function mixinControllerDefinition in sap/ui/core/mvc/Controller.js
                CardController.prototype.onInit.apply(this, arguments);

                VizAnnotationManager.formatChartAxes();
                this.bFlag = true;

                /*var smartChart = this.getView().byId("analyticalChart2");
                if (smartChart) {
                     smartChart.setShowDrillButtons(false);
                     //smartChart.setShowDrillBreadcrumbs(false);
                     smartChart.setShowDetailsButton(true);
                     smartChart.setShowZoomButtons(false);
                     smartChart.setShowLegendButton(false);
                     smartChart.setShowFullScreenButton(false);
                     smartChart.setShowSemanticNavigationButton(false);
                     smartChart.setUseChartPersonalisation(false);
                     smartChart.setUseListForChartTypeSelection(false);
                     smartChart.setShowChartTypeSelectionButton(false);

                    if (smartChart.getHeader() === "") {
                        smartChart.setHeader("Dummy");
                    }
                }*/

                var enrichChartAnnotation = MetadataAnalyser.prototype._enrichChartAnnotation;
                var iLen, i, oObj;
                MetadataAnalyser.prototype._enrichChartAnnotation = function (oAnnotation, oAnnotationData) {
                    if (oAnnotationData) {

                        if (!oAnnotationData.Measures) {
                            oAnnotationData.Measures = [];
                            if (oAnnotationData.MeasureAttributes) {
                                iLen = oAnnotationData.MeasureAttributes.length;
                                for (i = 0; i < iLen; i++) {
                                    oObj = oAnnotationData.MeasureAttributes[i];
                                    oAnnotationData.Measures.push({"PropertyPath": oObj.Measure.PropertyPath});
                                }
                            }
                        }

                        if (!oAnnotationData.Dimensions) {
                            oAnnotationData.Dimensions = [];
                            if (oAnnotationData.DimensionAttributes) {
                                iLen = oAnnotationData.DimensionAttributes.length;
                                for (i = 0; i < iLen; i++) {
                                    oObj = oAnnotationData.DimensionAttributes[i];
                                    oAnnotationData.Dimensions.push({"PropertyPath": oObj.Dimension.PropertyPath});
                                }
                            }
                        }

                    }

                    enrichChartAnnotation.apply(this, arguments);
                };
            },
            onBeforeRendering: function () {
                var smartChart = this.getView().byId("analyticalChart2");
                var vizFrame = smartChart && smartChart._getVizFrame();
                if (vizFrame) {
                    //var chartTitle = this.getView().byId("ovpCT1");
                    this.vizFrame = vizFrame;
                    var vbLayout = this.getView().byId("vbLayout");
                    this.vbLayout = vbLayout;
                    this.isVizPropSet = false;
                    
                    var analyticalChart = smartChart.getChart();
                    analyticalChart.setProperty("enableScalingFactor", true);
                    //var config = this.getConfig();
                    //sap.ovp.cards.charts.SmartAnnotationManager.buildSmartAttributes(smartChart,chartTitle);//,config);
                    SmartAnnotationManager.getSelectedDataPoint(vizFrame, this);
                    SmartAnnotationManager.attachDataReceived(smartChart, this);
                }
            },

            getCardItemsBinding: function () {
                var smartChart = this.getView().byId("analyticalChart2");
                var vizFrame = smartChart && smartChart._getVizFrame();
                if (vizFrame && vizFrame.getDataset() && vizFrame.getDataset().getBinding("data") && this.vbLayout) {
                    this.vbLayout.setBusy(false);
                }

                if (vizFrame && vizFrame.getParent()) {
                    return vizFrame.getParent().getBinding("data");
                }

                return null;
            },

            onAfterRendering: function () {
                CardController.prototype.onAfterRendering.apply(this, arguments);
                /* var smartChart = this.getView().byId("analyticalChart2");
                 var smartChartViz = smartChart._getVizFrame();
                 smartChartViz.setHeight("400px");*/
                //Setting the height of viz container
                //Since we do not want the toolbar, we remove it using jQuery
                /*var aToolbar = jQuery(".ovpSmartChart").find(".sapUiCompSmartChartToolbar");
                 aToolbar.remove();*/

                var smartChart = this.getView().byId("analyticalChart2");
                var oChart = smartChart.getChart();
                //Place holder text for no data scenarios in chart
                var sNoData = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("noDataForSmartCharts");
                oChart.setCustomMessages({'NO_DATA': sNoData});
                var oCompData = this.getOwnerComponent().getComponentData();
                if (this.getCardPropertiesModel().getProperty("/layoutDetail") === "resizable" && oCompData.appComponent) {
                    var oDashboardLayoutUtil = oCompData.appComponent.getDashboardLayoutUtil();
                    var sCardId = oDashboardLayoutUtil.getCardDomId(oCompData.cardId);
                    var oCard = oDashboardLayoutUtil.dashboardLayoutModel.getCardById(oCompData.cardId);
                    var element = document.getElementById(sCardId);
                    //.sapOvpCardContentContainer where border-top is 1px
                    element.getElementsByClassName('sapOvpWrapper')[0].style.height =
                        oCard.dashboardLayout.rowSpan * oDashboardLayoutUtil.ROW_HEIGHT_PX + 1 - (oCard.dashboardLayout.headerHeight + 2 * oDashboardLayoutUtil.CARD_BORDER_PX) + "px";
                    var cardSpan = Math.round((oCard.dashboardLayout.headerHeight + 2 * oDashboardLayoutUtil.CARD_BORDER_PX) / oDashboardLayoutUtil.ROW_HEIGHT_PX);
                    if (oCard.dashboardLayout.rowSpan <= cardSpan) {
                        element.classList.add("sapOvpMinHeightContainer");
                    }
                    if (smartChart) {
                        smartChart._getVizFrame().setHeight(this._calculateVizFrameHeight() + "px");
                    }
                }

                var analyticalChart = smartChart && smartChart.getChart();
                if (analyticalChart){
                    var oVizFrame = smartChart && smartChart._getVizFrame();
                    var bUOMSet = false;
                    analyticalChart.addEventDelegate({
                        onAfterRendering: function () {
                            var sDisplayText = "";
                            if (oVizFrame && oVizFrame._states() && oVizFrame._states()["dynamicScale"] && !bUOMSet) {
                                var dynamicScaleFactorText = this.getView().byId("ovpUoMTitle");
                                var oScalingFactor = analyticalChart.getScalingFactor();
                                var sScale = oScalingFactor && oScalingFactor.primaryValues && oScalingFactor.primaryValues.scalingFactor;
                                var sUnit = oScalingFactor && oScalingFactor.primaryValues && oScalingFactor.primaryValues.unit;
                                if (sScale && sUnit) {
                                    sDisplayText = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("IN", [sScale, sUnit]);
                                } else if (sScale && !sUnit) {
                                    sDisplayText = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("IN_NO_SCALE", [sScale]);
                                } else  if (!sScale && sUnit) {
                                    sDisplayText = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("IN_NO_SCALE", [sUnit]);
                                }
                                if (sDisplayText !== "") {
                                    /*var headerText = smartChart.getHeader();
                                    headerText = headerText + " " + sDisplayText;
                                    smartChart.setHeader(headerText);*/
                                    dynamicScaleFactorText.setText(sDisplayText);
                                }
                                bUOMSet = true;
                            }
                        }.bind(this)
                    });
                }

            },

            beforeRebindSmartChart: function (oEvent) {
                var chart = this.getView().byId("analyticalChart2");
                chart.attachBeforeRebindChart(jQuery.proxy(this.beforeRebindSmartChart, this));
                var mBindingParams = oEvent.getParameter("bindingParams");
                this.dataLength = this.getChartBindingLength();
                mBindingParams.length = this.dataLength;
                var aFilters = mBindingParams.filters;
                var aSorters = mBindingParams.sorter;
                //var f = new sap.ui.model.Filter({ "path" : "Country" , "operator" : sap.ui.model.FilterOperator.EQ , "value1" : "IN" });
                //aFilters.push(f);
//            mBindingParams.parameters.custom = { "top" : 3};

                var oCardPropertiesModel = this.getCardPropertiesModel();
                var cardData = oCardPropertiesModel.getData();
                var oSelectionVariant = cardData.entityType[cardData.selectionAnnotationPath];
                var bFilter = oSelectionVariant && oSelectionVariant.SelectOptions;
                var dataModel = this.getModel();
                var oEntitySet = this.getEntitySet();
                var oMetadata = SmartAnnotationManager.getMetadata(this.getModel(), cardData.entitySet);
                var oPresentationVariant = cardData.entityType[cardData.presentationAnnotationPath];
                var bSorter = oPresentationVariant && oPresentationVariant.SortOrder;

                if (bFilter) {
                    jQuery.each(oSelectionVariant.SelectOptions, function () {
                        var prop = this.PropertyName.PropertyPath;
                        jQuery.each(this.Ranges, function () {
                            if (this.Sign.EnumMember === "com.sap.vocabularies.UI.v1.SelectionRangeSignType/I") {
                                var filtervalue = SmartAnnotationManager.getPrimitiveValue(this.Low);
                                var filtervaueHigh = this.High && this.High.String;
                                filtervalue = SmartAnnotationManager.formatByType(oMetadata, prop, filtervalue);
                                var filter = {
                                    path: prop,
                                    operator: this.Option.EnumMember.split("/")[1],
                                    value1: filtervalue
                                };
                                if (filtervaueHigh) {
                                    filter.value2 = SmartAnnotationManager.formatByType(oMetadata, prop, filtervaueHigh);
                                }
                                aFilters.push(new Filter(filter));
                            }
                        });
                    });
                }
                
                if (bSorter) {
                    jQuery.each(oPresentationVariant.SortOrder, function () {
                        var prop = this.Property.PropertyPath;
                        var checkFlag = this.Descending.Boolean || this.Descending.Bool;
                        var sorter = {
                            sPath: prop,
                            bDescending: checkFlag == "true" ? true : false
                        };
                        aSorters.push(new Sorter(prop, sorter.bDescending));
                    });
                }

                var chartPath = "";//"/SalesOrderParameters(P_Currency=%27USD%27,P_CountryCode=%27US%27)/Results";
                var aParameters = oCardPropertiesModel.getProperty('/parameters');
                var oGlobalFilter = this.oMainComponent && this.oMainComponent.getGlobalFilter();
                //Resolve the chart path(updates if it has parameters)
                chartPath = AnnotationHelper.resolveParameterizedEntitySet(dataModel, oEntitySet, oSelectionVariant, aParameters, oGlobalFilter);

                //Strictly use OneWay binding mode for smart charts
                chart.setChartBindingPath(chartPath);
            },

            getChartBindingLength: function () {
                var chart = this.getView().byId("analyticalChart2"),
                    oChartObj = SmartAnnotationManager.getMaxItems(chart),
                    colSpanOffset = +this.getCardPropertiesModel().getProperty("/cardLayout/colSpan") - 1,
                    iLength;
                if (oChartObj && oChartObj.itemsLength && oChartObj.dataStep && this.getCardPropertiesModel().getProperty('/layoutDetail') === 'resizable') {
                    iLength = oChartObj.itemsLength + colSpanOffset * oChartObj.dataStep;
                } else if (oChartObj && oChartObj.itemsLength && this.getCardPropertiesModel().getProperty('/layoutDetail') !== 'resizable') {
                    iLength = oChartObj.itemsLength;
                } else {
                    iLength = 100;
                }
                return iLength;
            },

            resizeCard: function (newCardLayout, $card) {
                var oCardPropertiesModel = this.getCardPropertiesModel(),
                    oSmartChart = this.getView().byId("analyticalChart2"),
                    oCardLayout = this.getCardPropertiesModel().getProperty("/cardLayout"),
                    oOvpContent = this.getView().byId('ovpCardContentContainer').getDomRef();
                oCardPropertiesModel.setProperty("/cardLayout/rowSpan", newCardLayout.rowSpan);
                oCardPropertiesModel.setProperty("/cardLayout/colSpan", newCardLayout.colSpan);
                this.bSorterSetForCustomCharts = false;
                newCardLayout.showOnlyHeader ? oOvpContent.classList.add('sapOvpContentHidden') : oOvpContent.classList.remove('sapOvpContentHidden');
                jQuery(this.getView().$()).find(".sapOvpWrapper").css({
                    height: (newCardLayout.rowSpan * oCardLayout.iRowHeightPx) - (oCardLayout.headerHeight + 2 * oCardLayout.iCardBorderPx) + "px"
                });
                if (oSmartChart) {
                    if (this.dataLength !== this.getChartBindingLength() || (newCardLayout.showOnlyHeader === false && (this.oldShowOnlyHeaderFlag === true || this.oldShowOnlyHeaderFlag === undefined))) {
                        oSmartChart.rebindChart();
                    }
                    oSmartChart._getVizFrame().setHeight(this._calculateVizFrameHeight() + "px");
                }
                this.oldShowOnlyHeaderFlag = newCardLayout.showOnlyHeader;
            },
            /**
             * Method to calculate viz frame height
             *
             * @method _calculateVizFrameHeight
             * @return {Integer} iVizFrameHeight - Calculated height of the viz frame
             *                                      For Fixed layout - 480 px
             *                                      For resizable layout - Calculated according to the rowspan
             */
            _calculateVizFrameHeight: function () {
                var iVizFrameHeight,
                    oCardLayout = this.getCardPropertiesModel().getProperty("/cardLayout");
                //For resizable layout calculate height of vizframe
                if (oCardLayout && oCardLayout.rowSpan) {
                    var oGenCardCtrl = this.getView().getController();
                    var iDropDownHeight = this.getItemHeight(oGenCardCtrl, 'toolbar');
                    var bubbleText = this.getView().byId("bubbleText");
                    var iChartTextHeight = this.getView().byId("ovpCT") ? 20 : 0;
                    var iBubbleTextHeight = bubbleText && bubbleText.getVisible() ? 70 : 20;
                    //Viz container height = Card Container height + Border top of OvpCardContainer[1px--.sapOvpCardContentContainer] - (Header height + Card padding top and bottom{16px} +
                    //                          View switch toolbar height + Height of the Chart text(if present) + Height of bubble chart text +
                    //                          Padding top to  the card container[0.875rem -- .ovpChartTitleVBox] + Margin top to viz frame[1rem .ovpViz])
                    iVizFrameHeight = oCardLayout.rowSpan * oCardLayout.iRowHeightPx + 1 - (oCardLayout.headerHeight + 2 * oCardLayout.iCardBorderPx + iDropDownHeight + iChartTextHeight + iBubbleTextHeight + 30);
                }
                return iVizFrameHeight;
            }
        });
    });
