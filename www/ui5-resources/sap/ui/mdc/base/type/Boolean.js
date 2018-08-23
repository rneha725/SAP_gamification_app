/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(["jquery.sap.global","sap/ui/model/type/Boolean","sap/ui/model/FormatException","sap/ui/model/ParseException"],function(q,B,F,P){"use strict";var _=B.extend("sap.ui.mdc.base.type.Boolean",{constructor:function(f,c){sap.ui.model.type.Boolean.call(this,f,c);}});_.prototype.parseValue=function(v,i){switch(this.getPrimitiveType(i)){case"string":if(this.oFormatOptions&&v===""){return this.oFormatOptions.emptyString;}}return sap.ui.model.type.Boolean.prototype.parseValue.apply(this,arguments);};return _;});
