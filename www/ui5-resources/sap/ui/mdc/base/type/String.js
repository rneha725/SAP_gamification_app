/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(["jquery.sap.global","sap/ui/model/type/String","sap/ui/model/FormatException","sap/ui/model/ParseException"],function(q,S,F,P){"use strict";var _=S.extend("sap.ui.mdc.base.type.String",{constructor:function(f,c){sap.ui.model.type.String.call(this,f,c);}});_.prototype.parseValue=function(v,i){if(this.oFormatOptions&&this.oFormatOptions.toUpperCase===true){v=v&&v.toUpperCase?v.toUpperCase():v;arguments[0]=v;}return sap.ui.model.type.String.prototype.parseValue.apply(this,arguments);};_.prototype.formatValue=function(v,t){if(this.oFormatOptions&&this.oFormatOptions.toUpperCase===true){v=v&&v.toUpperCase?v.toUpperCase():v;arguments[0]=v;}return sap.ui.model.type.String.prototype.formatValue.apply(this,arguments);};return _;});
