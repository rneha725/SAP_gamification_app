/*
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
sap.ui.define(["jquery.sap.global","sap/ui/comp/smartfield/type/TextArrangement","sap/ui/comp/smartfield/type/Guid","sap/ui/model/ValidateException"],function(q,T,G,V){"use strict";var a=T.extend("sap.ui.comp.smartfield.type.TextArrangementGuid",{constructor:function(f,c,s){T.apply(this,arguments);}});a.prototype.preParseDescriptionOnly=function(v,s,c,f){var p=G.prototype.parseValue.call(this,v,s);if(i(p)){return[p,undefined];}return[v.trim(),undefined];};a.prototype.parseDescriptionOnly=function(v,s,c,S){if(i(v)){if(S.data.length===1){this.sDescription=S.data[0][S.valueListAnnotation.descriptionField];return[v,undefined];}if(S.data.length===0){throw new V(sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp").getText("SMARTFIELD_NOT_FOUND"));}}else{return T.prototype.parseDescriptionOnly.apply(this,arguments);}};a.prototype.onBeforeValidateValue=function(v,f,F){if((f.textArrangement==="descriptionOnly")&&!i(v)){F=["descriptionField"];}this.oSettings.onBeforeValidateValue(v,F);};a.prototype.getName=function(){return"sap.ui.comp.smartfield.type.TextArrangementGuid";};a.prototype.getPrimaryType=function(){return G;};function i(v){var r=/^[A-F0-9]{8}-([A-F0-9]{4}-){3}[A-F0-9]{12}$/i;return r.test(v);}return a;});
