/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/base/Log','sap/base/util/getObject'],function(L,g){"use strict";function d(t,p,v){Object.defineProperty(t,p,{value:v,writable:true,configurable:true});}var l=function(t,p,c){var P={configurable:true,get:function(){d(t,p,undefined);var v=c();d(t,p,v);return v;},set:function(v){d(t,p,v);}};Object.defineProperty(t,p,P);};return l;});
