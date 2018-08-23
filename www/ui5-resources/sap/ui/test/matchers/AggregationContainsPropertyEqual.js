/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['jquery.sap.global','./Matcher'],function($,M){"use strict";return M.extend("sap.ui.test.matchers.AggregationContainsPropertyEqual",{metadata:{publicMethods:["isMatching"],properties:{aggregationName:{type:"string"},propertyName:{type:"string"},propertyValue:{type:"any"}}},isMatching:function(c){var a=this.getAggregationName(),p=this.getPropertyName(),P=this.getPropertyValue(),A=c["get"+$.sap.charToUpperCase(a,0)];if(!A){this._oLogger.error("Control '"+c+"' does not have an aggregation called '"+a+"'");return false;}var v=A.call(c);var b=$.isArray(v)?v:[v];var m=b.some(function(d){var f=d["get"+$.sap.charToUpperCase(p,0)];if(!f){return false;}return f.call(d)===P;});if(!m){this._oLogger.debug("Control '"+c+"' has no property '"+p+"' with the value '"+P+"' in the aggregation '"+a+"'");}return m;}});},true);
