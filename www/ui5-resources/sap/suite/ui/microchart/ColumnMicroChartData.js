/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(['jquery.sap.global','./library','sap/ui/core/Element'],function(q,l,E){"use strict";var C=E.extend("sap.suite.ui.microchart.ColumnMicroChartData",{metadata:{library:"sap.suite.ui.microchart",properties:{color:{group:"Misc",type:"sap.m.ValueColor",defaultValue:"Neutral"},label:{type:"string",group:"Misc",defaultValue:""},value:{type:"float",group:"Misc"}},events:{press:{}}}});C.prototype.attachEvent=function(e,d,f,L){E.prototype.attachEvent.call(this,e,d,f,L);if(this.getParent()){this.getParent().setBarPressable(this.getParent().getColumns().indexOf(this),true);}return this;};C.prototype.detachEvent=function(e,f,L){E.prototype.detachEvent.call(this,e,f,L);if(this.getParent()){this.getParent().setBarPressable(this.getParent().getColumns().indexOf(this),false);}return this;};return C;});
