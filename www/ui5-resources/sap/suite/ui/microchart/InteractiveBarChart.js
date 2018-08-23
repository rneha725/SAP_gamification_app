/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(['jquery.sap.global','./library','sap/m/library','sap/ui/core/Control','sap/ui/Device','sap/m/FlexBox','sap/ui/core/ResizeHandler'],function(q,l,M,C,D,F,R){"use strict";var I=C.extend("sap.suite.ui.microchart.InteractiveBarChart",{metadata:{library:"sap.suite.ui.microchart",properties:{displayedBars:{type:"int",group:"Appearance",defaultValue:3},labelWidth:{type:"sap.ui.core.Percentage",group:"Appearance",defaultValue:"40%"},selectionEnabled:{type:"boolean",group:"Behavior",defaultValue:true},min:{type:"float",group:"Appearance"},max:{type:"float",group:"Appearance"}},defaultAggregation:"bars",aggregations:{bars:{type:"sap.suite.ui.microchart.InteractiveBarChartBar",multiple:true,bindable:"bindable"}},events:{selectionChanged:{parameters:{selectedBars:{type:"sap.suite.ui.microchart.InteractiveBarChartBar[]"},bar:{type:"sap.suite.ui.microchart.InteractiveBarChartBar"},selected:{type:"boolean"}}},press:{}},associations:{ariaLabelledBy:{type:"sap.ui.core.Control",multiple:true,singularName:"ariaLabelledBy"}}}});I.MIN_BAR_WIDTH_IN_PX=1;I.BAR_VALUE_PADDING_LEFT_IN_PX=4;I.BAR_VALUE_PADDING_RIGHT_IN_PX=4;I.SELECTION_AREA_BORDER_IN_PX=1;I.DIVIDER_WIDTH_IN_PX=1;I.AREA_HEIGHT_MINVALUE=18;I.BAR_HEIGHT_FONT_SMALLER=22;I.BAR_HEIGHT_MINVALUE=6;I.BAR_HEIGHT_LABEL_HIDE=16;I.CHART_WIDTH_FONT_SMALLER=288;I.LABEL_WIDTH_MINVALUE=80;I.CHART_WIDTH_MINVALUE=130;I.AREA_HEIGHT_INTERACTIVE_MINVALUE=48;I.AREA_HEIGHT_INTERACTIVE_MINVALUE_COMPACT=32;I.AREA_HEIGHT_PADDING_STAGE1=34;I.AREA_HEIGHT_PADDING_STAGE1_COMPACT=32;I.AREA_HEIGHT_PADDING_STAGE2=28;I.AREA_HEIGHT_PADDING_STAGE2_COMPACT=31;I.prototype.init=function(){this._iVisibleBars=0;this._bInteractiveMode=true;this._bMinMaxValid=null;this._fDividerPositionRight=0;this._oRb=sap.ui.getCore().getLibraryResourceBundle("sap.suite.ui.microchart");this._fMin=null;this._fMax=null;this._bThemeApplied=true;if(!sap.ui.getCore().isInitialized()){this._bThemeApplied=false;sap.ui.getCore().attachInit(this._handleCoreInitialized.bind(this));}else{this._handleCoreInitialized();}};I.prototype._handleCoreInitialized=function(){this._bThemeApplied=sap.ui.getCore().isThemeApplied();sap.ui.getCore().attachThemeChanged(this._handleThemeApplied,this);};I.prototype.onBeforeRendering=function(){this._bCompact=this._isCompact();this._bInteractiveMode=true;this._setResponsivenessData();this._setInternalMinMax();this._bMinMaxValid=this._checkIfMinMaxValid();if(this.getAggregation("bars")&&this.getDisplayedBars()){this._iVisibleBars=Math.min(this.getAggregation("bars").length,this.getDisplayedBars());}if(!this.data("_parentRenderingContext")&&q.isFunction(this.getParent)){this.data("_parentRenderingContext",this.getParent());}this._deregisterResizeHandler();this._updateUseSemanticTooltip();};I.prototype.onAfterRendering=function(){this._adjustToParent();l._checkControlIsVisible(this,this._onControlIsVisible);};I.prototype._updateUseSemanticTooltip=function(){var b=this.getBars();this._bUseSemanticTooltip=false;for(var i=0;i<this._iVisibleBars;i++){if(b[i].getColor()!==M.ValueColor.Neutral){this._bUseSemanticTooltip=true;return;}}};I.prototype._onControlIsVisible=function(){this._sResizeHandlerId=R.register(this,this._onResize.bind(this));this._calcBarsWidth();this._onResize();};I.prototype.exit=function(){this._deregisterResizeHandler();};I.prototype.onclick=function(e){if(!this.getSelectionEnabled()){return;}if(this._bInteractiveMode){var i=q(e.target).attr("id")||q(e.target).parents(".sapSuiteIBCBarInteractionArea").attr("id"),f=this.$().find(".sapSuiteIBCBarInteractionArea"),a,h;if(i){a=i.substring(i.lastIndexOf("-")+1);if(isNaN(a)){return;}else{a=parseInt(a,10);}this._toggleSelected(a);h=f.index(this.$().find(".sapSuiteIBCBarInteractionArea[tabindex='0']"));this._switchTabindex(h,a,f);}}else{this.firePress();if(D.browser.msie){this.$().focus();e.preventDefault();}}};I.prototype.onsapenter=function(e){if(this._bInteractiveMode){var i=this.$().find(".sapSuiteIBCBarInteractionArea").index(e.target);if(i!==-1){this._toggleSelected(i);}e.preventDefault();e.stopImmediatePropagation();}else{this.firePress();}};I.prototype.onsapspace=I.prototype.onsapenter;I.prototype.onsapup=function(e){var f=this.$().find(".sapSuiteIBCBarInteractionArea");var i=f.index(e.target);if(f.length>0){this._switchTabindex(i,i-1,f);}e.preventDefault();e.stopImmediatePropagation();};I.prototype.onsapdown=function(e){var f=this.$().find(".sapSuiteIBCBarInteractionArea");var i=f.index(e.target);if(f.length>0){this._switchTabindex(i,i+1,f);}e.preventDefault();e.stopImmediatePropagation();};I.prototype.onsaphome=function(e){var f=this.$().find(".sapSuiteIBCBarInteractionArea");var i=f.index(e.target);if(i!==0&&f.length>0){this._switchTabindex(i,0,f);}e.preventDefault();e.stopImmediatePropagation();};I.prototype.onsapend=function(e){var f=this.$().find(".sapSuiteIBCBarInteractionArea"),i=f.index(e.target),L=f.length;if(i!==L-1&&L>0){this._switchTabindex(i,L-1,f);}e.preventDefault();e.stopImmediatePropagation();};I.prototype.onsapleft=I.prototype.onsapup;I.prototype.onsapright=I.prototype.onsapdown;I.prototype.getSelectedBars=function(){var b=this.getAggregation("bars"),s=[],i;for(i=0;i<b.length;i++){if(b[i].getSelected()){s.push(b[i]);}}return s;};I.prototype.setSelectedBars=function(s){var b=this.getAggregation("bars"),i,a;this._deselectAllSelectedBars();if(!s){return this;}if(s instanceof l.InteractiveBarChartBar){s=[s];}if(q.isArray(s)){for(i=0;i<s.length;i++){a=this.indexOfAggregation("bars",s[i]);if(a>=0){b[a].setProperty("selected",true,true);}else{q.sap.log.warning("setSelectedBars method called with invalid InteractiveBarChartBar element");}}}this.invalidate();return this;};I.prototype.getTooltip_AsString=function(){var t=this.getTooltip_Text();if(!t){t=this._createTooltipText();}else if(l._isTooltipSuppressed(t)){t=null;}return t;};I.prototype._isCompact=function(){return q("body").hasClass("sapUiSizeCompact")||this.$().is(".sapUiSizeCompact")||this.$().closest(".sapUiSizeCompact").length>0;};I.prototype._setResponsivenessData=function(){if(this._bCompact){this._iAreaHeightInteractiveMinValue=I.AREA_HEIGHT_INTERACTIVE_MINVALUE_COMPACT;this._iAreaHeightPaddingStage1=I.AREA_HEIGHT_PADDING_STAGE1_COMPACT;this._iAreaHeightPaddingStage2=I.AREA_HEIGHT_PADDING_STAGE2_COMPACT;}else{this._iAreaHeightInteractiveMinValue=I.AREA_HEIGHT_INTERACTIVE_MINVALUE;this._iAreaHeightPaddingStage1=I.AREA_HEIGHT_PADDING_STAGE1;this._iAreaHeightPaddingStage2=I.AREA_HEIGHT_PADDING_STAGE2;}};I.prototype._handleThemeApplied=function(){this._bThemeApplied=true;this._bCompact=this._isCompact();this.invalidate();};I.prototype._adjustToParent=function(){var $=this.$();if(this.data("_parentRenderingContext")&&this.data("_parentRenderingContext")instanceof F){var p=this.data("_parentRenderingContext").$();var P=p.width()-2;var i=p.height()-2;$.outerWidth(P);$.outerHeight(i);}};I.prototype._calcBarsWidth=function(){var $=this.$(),b=$.find(".sapSuiteIBCBarLabel"),d=I.DIVIDER_WIDTH_IN_PX,L=parseFloat(this.getLabelWidth()),B,t,f,a,c,e,v,E,g,h,r=sap.ui.getCore().getConfiguration().getRTL();if(!this._bMinMaxValid){return this;}if(this._bFullWidth){L=100;B=100;}else{B=100-L;}t=Math.abs(this._fMax-this._fMin);if(this._fMin>=0&&this._fMax>=0){f=0;a=1;}else if(this._fMin<0&&this._fMax<0){f=1;a=0;}else{f=Math.abs(this._fMin/t);a=Math.abs(this._fMax/t);}if(this._bFullWidth){if(a>=f){c=a*100;e=f*100;}else{c=f*100;e=0;}b.css("width",c+"%");b.css(r?"right":"left",e+"%");}else{b.css("width",L+"%");b.css(r?"right":"left","");}$.find(".sapSuiteIBCBarWrapper").css("width",B+"%");if(f>0){$.find(".sapSuiteIBCBarWrapperNegative").width("calc("+f*100+"% - "+d+"px)");}else{$.find(".sapSuiteIBCBarWrapperNegative").width("0%");}if(a>0){$.find(".sapSuiteIBCBarWrapperPositive").width("calc("+a*100+"% - "+d+"px)");}else{$.find(".sapSuiteIBCBarWrapperPositive").width("0%");}for(var i=0;i<this._iVisibleBars;i++){v=this.getBars()[i].getValue();g=this.$("bar-negative-"+i);h=this.$("bar-positive-"+i);if(this.getBars()[i]._bNullValue||v===0){h.add(g).css("min-width",0);}else if(!this.getBars()[i]._bNullValue){if(v>0){E=Math.min(Math.max(v,this._fMin),this._fMax);h.css({"width":this._calcPercent(E,t,Math.max(0,this._fMin),a),"min-width":1});g.css("min-width",0);}else{E=Math.max(Math.min(v,this._fMax),this._fMin);g.css({"width":this._calcPercent(E,t,Math.min(0,this._fMax),f),"min-width":1});h.css("min-width",0);}}}};I.prototype._calcPercent=function(v,t,s,a){return Math.abs((v-s)/(t*a)*100).toFixed(5)+"%";};I.prototype._deselectAllSelectedBars=function(){var b=this.getAggregation("bars"),B=b.length,i;for(i=0;i<B;i++){b[i].setProperty("selected",false,true);}};I.prototype._toggleSelected=function(i){var b=this.getAggregation("bars"),B=b[i];if(i<0||i>=b.length){return;}var $=this.$("interactionArea-"+i);if(B.getSelected()){$.removeClass("sapSuiteIBCBarSelected");B.setProperty("selected",false,true);}else{$.addClass("sapSuiteIBCBarSelected");B.setProperty("selected",true,true);}$.attr("aria-selected",B.getSelected());this.fireSelectionChanged({selectedBars:this.getSelectedBars(),bar:B,selected:B.getSelected()});};I.prototype._showValueOutsideBar=function(){var $=this.$(),b,v,B,f,a,c,d,e=this.$("bar-positive-0").parent().width(),g=this.$("bar-negative-0").parent().width(),r=sap.ui.getCore().getConfiguration().getRTL();b=$.find(".sapSuiteIBCBarValue");if(b.length===0){return;}for(var i=0;i<this._iVisibleBars;i++){B=(b.eq(i).width()+I.BAR_VALUE_PADDING_LEFT_IN_PX+I.BAR_VALUE_PADDING_RIGHT_IN_PX);f=this.$("bar-positive-"+i).width();a=this.$("bar-negative-"+i).width();c=e-f;d=g-a;if(this.getBars()[i].getValue()>=0||(this.getBars()[i]._bNullValue&&this._fMin+this._fMax>=0)){if(B>f&&B>c){b.eq(i).css("visibility","hidden");}else{b.eq(i).css("visibility","inherit");}if(B>f){v=(this.$("bar-positive-"+i).width()+I.BAR_VALUE_PADDING_LEFT_IN_PX)+"px";b.eq(i).addClass("sapSuiteIBCBarValueOutside");}else{v="";b.eq(i).removeClass("sapSuiteIBCBarValueOutside");}if(r){b.eq(i).css({"right":v});}else{b.eq(i).css({"left":v});}}else{if(B>a&&B>d){b.eq(i).css("visibility","hidden");}else{b.eq(i).css("visibility","inherit");}if(B>a){v=(this.$("bar-negative-"+i).width()+I.BAR_VALUE_PADDING_RIGHT_IN_PX)+"px";b.eq(i).addClass("sapSuiteIBCBarValueOutside");}else{v="";b.eq(i).removeClass("sapSuiteIBCBarValueOutside");}if(r){b.eq(i).css({"left":v});}else{b.eq(i).css({"right":v});}}}};I.prototype._checkIfMinMaxValid=function(){if(this._fMin>this._fMax){q.sap.log.warning("Min value for InteractiveBarChart is larger than Max value.");return false;}return true;};I.prototype._setInternalMinMax=function(){var m=null,f=null,b,B=this.getBars(),r=Math.min(this.getDisplayedBars(),B.length);for(var i=0;i<r;i++){if(!B[i]._bNullValue){b=B[i].getValue();m=Math.min(m,b);f=Math.max(f,b);}}this._fMin=this.getMin();this._fMax=this.getMax();if(!q.isNumeric(this._fMin)||!q.isNumeric(this._fMax)){if(m>=0&&f>=0){if(!q.isNumeric(this._fMin)){this._fMin=0;}if(!q.isNumeric(this._fMax)){this._fMax=f;}}else if(m<0&&f<0){if(!q.isNumeric(this._fMin)){this._fMin=m;}if(!q.isNumeric(this._fMax)){this._fMax=0;}}else{if(!q.isNumeric(this._fMin)){this._fMin=m;}if(!q.isNumeric(this._fMax)){this._fMax=f;}}}};I.prototype.validateProperty=function(p,v){if(p==="labelWidth"&&(v!==null||v!==undefined)){var V=parseFloat(v);if(V<0||V>100){q.sap.log.warning("LabelWidth for InteractiveBarChart is not between 0 and 100.");v=null;}}return C.prototype.validateProperty.apply(this,[p,v]);};I.prototype._switchTabindex=function(o,n,f){if(o>=0&&o<f.length&&n>=0&&n<f.length){f.eq(o).removeAttr("tabindex");f.eq(n).attr("tabindex","0");f.eq(n).focus();}};I.prototype._isChartEnabled=function(){return this.getSelectionEnabled()&&this._bInteractiveMode;};I.prototype._resizeVertically=function(f){var a,m,b,$=this.$(),s=false,S=$.find(".sapSuiteIBCBarInteractionArea"),c=$.height(),i=0,v=this._iVisibleBars;if(this._bInteractiveMode){i=1;}m=parseInt(S.css("margin-bottom"),10)+parseInt(S.css("margin-top"),10);a=((c-((m+2*I.SELECTION_AREA_BORDER_IN_PX)*v))/v);if(a+i<this._iAreaHeightInteractiveMinValue){if(this._bInteractiveMode){this._bInteractiveMode=false;s=true;$.addClass("sapSuiteIBCNonInteractive");if(this.getSelectionEnabled()){var A=this.$().find(".sapSuiteIBCBarInteractionArea[tabindex='0']");this._iActiveElement=S.index(A);A.removeAttr("tabindex");this.$().attr("tabindex","0");}this.$().attr({"role":"button","aria-multiselectable":"false","aria-disabled":!this._isChartEnabled()});}}else if(!this._bInteractiveMode){this._bInteractiveMode=true;s=true;$.removeClass("sapSuiteIBCNonInteractive");if(this.getSelectionEnabled()){this.$().removeAttr("tabindex");if(!this._iActiveElement||this._iActiveElement<0){this._iActiveElement=0;}S.eq(this._iActiveElement).attr("tabindex","0");}this.$().attr({"role":"listbox","aria-multiselectable":"true","aria-disabled":!this._isChartEnabled()});}if(s){if(this._isChartEnabled()){$.removeAttr("title");this._addInteractionAreaTooltip(S);}else{S.removeAttr("title");$.attr("title",this.getTooltip_AsString());}}S.height(a);if(a<=this._iAreaHeightPaddingStage2){$.addClass("sapSuiteIBCStage2");}else{$.removeClass("sapSuiteIBCStage2");if(a<=this._iAreaHeightPaddingStage1){$.addClass("sapSuiteIBCStage1");}else{$.removeClass("sapSuiteIBCStage1");}}var B=this.$().find(".sapSuiteIBCBar");if(B.length>0){b=B[0].getBoundingClientRect().height;}if(b<=I.BAR_HEIGHT_FONT_SMALLER){$.addClass("sapSuiteIBCSmallFont");}if(b<=I.BAR_HEIGHT_LABEL_HIDE){$.find(".sapSuiteIBCBarValue").css("visibility","hidden");f.labelsVisible=false;}else{$.find(".sapSuiteIBCBarValue").css("visibility","inherit");}if(a<I.AREA_HEIGHT_MINVALUE){$.css("visibility","hidden");f.labelsVisible=false;f.chartVisible=false;}};I.prototype._resizeHorizontally=function(f){if(!f.chartVisible){return;}var $=this.$(),s=$.find(".sapSuiteIBCBarInteractionArea"),b=$.find(".sapSuiteIBCBarLabel"),B=parseFloat(this.getLabelWidth())/100*s.eq(0).width(),a=0,c=$.width(),d,e=false;if(c<I.CHART_WIDTH_FONT_SMALLER){$.addClass("sapSuiteIBCSmallFont");B=parseFloat(this.getLabelWidth())/100*s.eq(0).width();}if(this._bFullWidth){a=6;}for(var i=0;i<b.length;i++){b.eq(i).css("width",B+"px");if(b.eq(i).children(".sapSuiteIBCBarLabelText").prop("clientWidth")<b.eq(i).children(".sapSuiteIBCBarLabelText").prop("scrollWidth")-a){e=true;}b.eq(i).css("width","100%");}if(B<I.LABEL_WIDTH_MINVALUE&&e){$.addClass("sapSuiteIBCFullWidth");this._bFullWidth=true;this._calcBarsWidth();}else{$.removeClass("sapSuiteIBCFullWidth");this._bFullWidth=false;this._calcBarsWidth();}var g=this.$().find(".sapSuiteIBCBar");if(g.length>0){d=g[0].getBoundingClientRect().height;}if(c<I.CHART_WIDTH_MINVALUE||d<I.BAR_HEIGHT_MINVALUE){$.css("visibility","hidden");f.labelsVisible=false;f.chartVisible=false;}else if(d<=I.BAR_HEIGHT_LABEL_HIDE){$.find(".sapSuiteIBCBarValue").css("visibility","hidden");f.labelsVisible=false;}};I.prototype._onResize=function(){var $=this.$(),f={chartVisible:true,labelsVisible:true};$.css("visibility","visible");$.removeClass("sapSuiteIBCSmallFont");this._resizeVertically(f);this._resizeHorizontally(f);if(f.labelsVisible){this._showValueOutsideBar();}};I.prototype._deregisterResizeHandler=function(){if(this._sResizeHandlerId){R.deregister(this._sResizeHandlerId);this._sResizeHandlerId=null;}};I.prototype._addInteractionAreaTooltip=function(s){var b=this.getBars(),e,S;s.each(function(i,a){e=q(a);S=parseInt(e.attr("data-sap-ui-ibc-selection-index"),10);e.attr("title",b[S].getTooltip_AsString());});};I.prototype._createTooltipText=function(){var b=true,B=this.getBars(),s,t="";for(var i=0;i<this._iVisibleBars;i++){s=B[i]._getBarTooltip(this._bUseSemanticTooltip);if(s){t+=(b?"":"\n")+s;b=false;}}return t;};return I;});