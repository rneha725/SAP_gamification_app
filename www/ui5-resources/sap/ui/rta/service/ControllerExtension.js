/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/dt/Util','sap/ui/fl/Utils'],function(D,F){"use strict";return function(r){return{exports:{add:function(c,v){var f=r.getFlexSettings();if(!f.developerMode){throw D.createError("service.ControllerExtension#add","code extensions can only be created in developer mode","sap.ui.rta");}if(!c){throw D.createError("service.ControllerExtension#add","can't create controller extension without codeRef","sap.ui.rta");}if(!c.endsWith(".js")){throw D.createError("service.ControllerExtension#add","codeRef has to end with 'js'");}var o=r._getFlexController();var V=sap.ui.getCore().byId(v);var a=F.getAppComponentForControl(V);var C=V.getControllerName&&V.getControllerName()||V.getController()&&V.getController().getMetadata().getName();var b={content:{codeRef:c},selector:{controllerName:C},changeType:"codeExt",namespace:f.namespace};var p=o.createBaseChange(b,a);o.addPreparedChange(p,a);return p.getDefinition();}}};};});
