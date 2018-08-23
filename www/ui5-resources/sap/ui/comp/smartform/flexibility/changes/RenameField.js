/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
sap.ui.define(['jquery.sap.global','sap/ui/fl/changeHandler/BaseRename',"sap/ui/fl/Utils"],function(q,B,U){"use strict";var P="label";var C="fieldLabel";var T="XFLD";var R=B.createRenameChangeHandler({changePropertyName:C,translationTextType:T});R.applyChange=function(c,o,p){var m=p.modifier;var a=c.getDefinition();var t=a.texts[C];var v=t.value;if(a.texts&&t&&typeof(v)==="string"){var s=this._setPropertyOnControl(o,v,m)||"$$Handled_Internally$$";c.setRevertData(s);return true;}else{U.log.error("Change does not contain sufficient information to be applied: ["+a.layer+"]"+a.namespace+"/"+a.fileName+"."+a.fileType);}};R.revertChange=function(c,o,p){var O=c.getRevertData();if(O||O===""){var m=p.modifier;if(O==="$$Handled_Internally$$"){O=undefined;}this._setPropertyOnControl(o,O,m);c.resetRevertData();return true;}else{U.log.error("Change doesn't contain sufficient information to be reverted. Most Likely the Change didn't go through applyChange.");}};R._setPropertyOnControl=function(c,v,m){var g="getProperty";var l=m[g](c,P);var s;var p;if(U.isBinding(v)){s="setPropertyBinding";g="getPropertyBinding";}else{s="setProperty";}if(l&&(typeof l!=="string")){p=m[g](l,"text");m[s](l,"text",v);}else{p=m[g](c,P);m[s](c,P,v);}return p;};return R;},true);
