/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(['./FieldHelpBase'],function(F){"use strict";var C=F.extend("sap.ui.mdc.base.CustomFieldHelp",{metadata:{library:"sap.ui.mdc",properties:{},aggregations:{content:{type:"sap.ui.core.Control",multiple:false}},defaultAggregation:"content",events:{beforeOpen:{}}}});C.prototype._createPopover=function(){var p=F.prototype._createPopover.apply(this,arguments);if(p){p._getAllContent=function(){var f=this.getParent();if(f){var c=[];c.push(f.getContent());return c;}else{return this.getContent();}};}return p;};C.prototype.fireSelectEvent=function(v,a){this.close();this.fireSelect({value:v,additionalValue:a});};C.prototype.open=function(){this.fireBeforeOpen();F.prototype.open.apply(this,arguments);};return C;},true);
