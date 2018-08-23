sap.ui.define(["sap/ovp/cards/generic/Card.controller","jquery.sap.global","sap/ovp/cards/charts/VizAnnotationManager","sap/ui/comp/odata/MetadataAnalyser","sap/ovp/cards/charts/SmartAnnotationManager","sap/ui/model/Filter","sap/ovp/cards/AnnotationHelper","sap/ui/model/Sorter"],function(C,q,V,M,S,F,A,a){"use strict";return C.extend("sap.ovp.cards.charts.smart.chart.analyticalChart",{onInit:function(){C.prototype.onInit.apply(this,arguments);V.formatChartAxes();this.bFlag=true;var e=M.prototype._enrichChartAnnotation;var l,i,o;M.prototype._enrichChartAnnotation=function(b,c){if(c){if(!c.Measures){c.Measures=[];if(c.MeasureAttributes){l=c.MeasureAttributes.length;for(i=0;i<l;i++){o=c.MeasureAttributes[i];c.Measures.push({"PropertyPath":o.Measure.PropertyPath});}}}if(!c.Dimensions){c.Dimensions=[];if(c.DimensionAttributes){l=c.DimensionAttributes.length;for(i=0;i<l;i++){o=c.DimensionAttributes[i];c.Dimensions.push({"PropertyPath":o.Dimension.PropertyPath});}}}}e.apply(this,arguments);};},onBeforeRendering:function(){var s=this.getView().byId("analyticalChart2");var v=s&&s._getVizFrame();if(v){this.vizFrame=v;var b=this.getView().byId("vbLayout");this.vbLayout=b;this.isVizPropSet=false;var c=s.getChart();c.setProperty("enableScalingFactor",true);S.getSelectedDataPoint(v,this);S.attachDataReceived(s,this);}},getCardItemsBinding:function(){var s=this.getView().byId("analyticalChart2");var v=s&&s._getVizFrame();if(v&&v.getDataset()&&v.getDataset().getBinding("data")&&this.vbLayout){this.vbLayout.setBusy(false);}if(v&&v.getParent()){return v.getParent().getBinding("data");}return null;},onAfterRendering:function(){C.prototype.onAfterRendering.apply(this,arguments);var s=this.getView().byId("analyticalChart2");var c=s.getChart();var n=sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("noDataForSmartCharts");c.setCustomMessages({'NO_DATA':n});var o=this.getOwnerComponent().getComponentData();if(this.getCardPropertiesModel().getProperty("/layoutDetail")==="resizable"&&o.appComponent){var d=o.appComponent.getDashboardLayoutUtil();var b=d.getCardDomId(o.cardId);var e=d.dashboardLayoutModel.getCardById(o.cardId);var f=document.getElementById(b);f.getElementsByClassName('sapOvpWrapper')[0].style.height=e.dashboardLayout.rowSpan*d.ROW_HEIGHT_PX+1-(e.dashboardLayout.headerHeight+2*d.CARD_BORDER_PX)+"px";var g=Math.round((e.dashboardLayout.headerHeight+2*d.CARD_BORDER_PX)/d.ROW_HEIGHT_PX);if(e.dashboardLayout.rowSpan<=g){f.classList.add("sapOvpMinHeightContainer");}if(s){s._getVizFrame().setHeight(this._calculateVizFrameHeight()+"px");}}var h=s&&s.getChart();if(h){var v=s&&s._getVizFrame();var u=false;h.addEventDelegate({onAfterRendering:function(){var D="";if(v&&v._states()&&v._states()["dynamicScale"]&&!u){var i=this.getView().byId("ovpUoMTitle");var j=h.getScalingFactor();var k=j&&j.primaryValues&&j.primaryValues.scalingFactor;var U=j&&j.primaryValues&&j.primaryValues.unit;if(k&&U){D=sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("IN",[k,U]);}else if(k&&!U){D=sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("IN_NO_SCALE",[k]);}else if(!k&&U){D=sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("IN_NO_SCALE",[U]);}if(D!==""){i.setText(D);}u=true;}}.bind(this)});}},beforeRebindSmartChart:function(e){var c=this.getView().byId("analyticalChart2");c.attachBeforeRebindChart(q.proxy(this.beforeRebindSmartChart,this));var b=e.getParameter("bindingParams");this.dataLength=this.getChartBindingLength();b.length=this.dataLength;var f=b.filters;var s=b.sorter;var o=this.getCardPropertiesModel();var d=o.getData();var g=d.entityType[d.selectionAnnotationPath];var h=g&&g.SelectOptions;var i=this.getModel();var E=this.getEntitySet();var m=S.getMetadata(this.getModel(),d.entitySet);var p=d.entityType[d.presentationAnnotationPath];var j=p&&p.SortOrder;if(h){q.each(g.SelectOptions,function(){var l=this.PropertyName.PropertyPath;q.each(this.Ranges,function(){if(this.Sign.EnumMember==="com.sap.vocabularies.UI.v1.SelectionRangeSignType/I"){var n=S.getPrimitiveValue(this.Low);var r=this.High&&this.High.String;n=S.formatByType(m,l,n);var t={path:l,operator:this.Option.EnumMember.split("/")[1],value1:n};if(r){t.value2=S.formatByType(m,l,r);}f.push(new F(t));}});});}if(j){q.each(p.SortOrder,function(){var l=this.Property.PropertyPath;var n=this.Descending.Boolean||this.Descending.Bool;var r={sPath:l,bDescending:n=="true"?true:false};s.push(new a(l,r.bDescending));});}var k="";var P=o.getProperty('/parameters');var G=this.oMainComponent&&this.oMainComponent.getGlobalFilter();k=A.resolveParameterizedEntitySet(i,E,g,P,G);c.setChartBindingPath(k);},getChartBindingLength:function(){var c=this.getView().byId("analyticalChart2"),o=S.getMaxItems(c),b=+this.getCardPropertiesModel().getProperty("/cardLayout/colSpan")-1,l;if(o&&o.itemsLength&&o.dataStep&&this.getCardPropertiesModel().getProperty('/layoutDetail')==='resizable'){l=o.itemsLength+b*o.dataStep;}else if(o&&o.itemsLength&&this.getCardPropertiesModel().getProperty('/layoutDetail')!=='resizable'){l=o.itemsLength;}else{l=100;}return l;},resizeCard:function(n,$){var c=this.getCardPropertiesModel(),s=this.getView().byId("analyticalChart2"),o=this.getCardPropertiesModel().getProperty("/cardLayout"),O=this.getView().byId('ovpCardContentContainer').getDomRef();c.setProperty("/cardLayout/rowSpan",n.rowSpan);c.setProperty("/cardLayout/colSpan",n.colSpan);this.bSorterSetForCustomCharts=false;n.showOnlyHeader?O.classList.add('sapOvpContentHidden'):O.classList.remove('sapOvpContentHidden');q(this.getView().$()).find(".sapOvpWrapper").css({height:(n.rowSpan*o.iRowHeightPx)-(o.headerHeight+2*o.iCardBorderPx)+"px"});if(s){if(this.dataLength!==this.getChartBindingLength()||(n.showOnlyHeader===false&&(this.oldShowOnlyHeaderFlag===true||this.oldShowOnlyHeaderFlag===undefined))){s.rebindChart();}s._getVizFrame().setHeight(this._calculateVizFrameHeight()+"px");}this.oldShowOnlyHeaderFlag=n.showOnlyHeader;},_calculateVizFrameHeight:function(){var v,c=this.getCardPropertiesModel().getProperty("/cardLayout");if(c&&c.rowSpan){var g=this.getView().getController();var d=this.getItemHeight(g,'toolbar');var b=this.getView().byId("bubbleText");var i=this.getView().byId("ovpCT")?20:0;var B=b&&b.getVisible()?70:20;v=c.rowSpan*c.iRowHeightPx+1-(c.headerHeight+2*c.iCardBorderPx+d+i+B+30);}return v;}});});