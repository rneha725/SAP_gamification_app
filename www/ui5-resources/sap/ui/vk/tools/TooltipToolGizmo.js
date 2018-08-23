/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */
sap.ui.define(["jquery.sap.global","./library","./Gizmo"],function(q,l,G){"use strict";var T=G.extend("sap.ui.vk.tools.TooltipToolGizmo",{metadata:{library:"sap.ui.vk.tools"}});T.prototype.init=function(){if(G.prototype.init){G.prototype.init.apply(this);}this._viewport=null;this._tool=null;};T.prototype.show=function(v,t){this._viewport=v;this._tool=t;var a=this.getDomRef();if(a){a.style.display="none";}};T.prototype.hide=function(){this._tool=null;var t=this.getDomRef();if(t){t.style.display="none";}};T.prototype.setTitle=function(t){var a=this.getDomRef();if(a){a.style.display=t?"block":"none";a.innerText=t;}};T.prototype.update=function(x,y,a,b,n){if(this._tool.fireEvent("hover",{x:x,y:y,nodeRef:n},true)){var t=this.getDomRef();if(t){var o=t.offsetParent;while(o){a-=o.offsetLeft||0;b-=o.offsetTop||0;o=o.offsetParent;}a+=10;b+=15;t.style.left=Math.round(a)+"px";t.style.top=Math.round(b)+"px";var v=this._viewport.getDomRef().getBoundingClientRect();var c=t.getBoundingClientRect();if(c.right>v.right){t.style.left=Math.round(a+v.right-c.right)+"px";}if(c.bottom>v.bottom){t.style.top=Math.round(b+v.bottom-c.bottom)+"px";}}}};T.prototype.onBeforeRendering=function(){};T.prototype.onAfterRendering=function(){};return T;},true);
