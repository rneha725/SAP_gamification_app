/*
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
sap.ui.define(["sap/ui/comp/smartfield/type/TextArrangement","sap/ui/comp/smartfield/type/String"],function(T,S){"use strict";var a=T.extend("sap.ui.comp.smartfield.type.TextArrangementString",{constructor:function(f,c,s){T.apply(this,arguments);}});a.prototype.onBeforeValidateValue=function(v,f,F){this.oSettings.onBeforeValidateValue(v,F);};a.prototype.getName=function(){return"sap.ui.comp.smartfield.type.TextArrangementString";};a.prototype.getPrimaryType=function(){return S;};return a;});
