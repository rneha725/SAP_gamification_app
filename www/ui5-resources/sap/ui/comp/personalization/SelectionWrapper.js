/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
sap.ui.define(['jquery.sap.global','sap/ui/core/Element','./ColumnWrapper'],function(q,E,C){"use strict";var S=E.extend("sap.ui.comp.personalization.SelectionWrapper",{constructor:function(i,s){E.apply(this,arguments);},metadata:{library:"sap.ui.comp",aggregations:{columns:{type:"sap.ui.comp.personalization.ColumnWrapper",multiple:true,singularName:"column"}}}});S.createSelectionWrapper=function(m,f){return new S({columns:m.map(function(M){var c=new C({label:M.text,selected:M.visible,href:f?undefined:M.href,target:M.target,press:M.press,description:M.description});c.data("p13nData",{columnKey:M.key});return c;})});};return S;},true);
