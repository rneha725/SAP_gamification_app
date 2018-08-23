/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(["jquery.sap.global","sap/ui/core/library"],function(q,l){"use strict";sap.ui.getCore().initLibrary({name:"sap.fe",dependencies:["sap.ui.core"],types:[],interfaces:[],controls:[],elements:[],version:"1.56.1"});sap.ui.require(['sap/ui/core/XMLComposite','sap/ui/core/util/XMLPreprocessor'],function(X,a){function v(n,V){var b=n.getAttribute('metadataContexts');if(b){n.removeAttribute('metadataContexts');}V.visitAttributes(n);if(b){if(b.indexOf('sap.fe.deviceModel')<0){b+=",{model: 'sap.fe.deviceModel', path: '/', name: 'sap.fe.deviceModel'}";}n.setAttribute('metadataContexts',b);}}function r(n,V){v(n,V);X.initialTemplating(n,V,this);n.removeAttribute('metadataContexts');}a.plugIn(r.bind("sap.fe.Form"),"sap.fe","Form");a.plugIn(r.bind("sap.fe.MicroChart"),"sap.fe","MicroChart");a.plugIn(r.bind("sap.fe.ViewSwitchContainer"),"sap.fe","ViewSwitchContainer");});return sap.fe;},false);
