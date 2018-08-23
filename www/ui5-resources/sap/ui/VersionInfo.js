/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([],function(){"use strict";var V={};V.load=function(o){o=o||{};o.async=true;return V._load(o);};var v=null;V._load=function(o){if(typeof o!=="object"){o={library:o};}o.async=o.async===true;o.failOnError=o.failOnError!==false;if(!sap.ui.versioninfo){if(o.async&&v instanceof Promise){return v.then(function(){return sap.ui.getVersionInfo(o);});}var h=function(a){v=null;if(a===null){return undefined;}sap.ui.versioninfo=a;return sap.ui.getVersionInfo(o);};var H=function(e){v=null;throw e;};var r=jQuery.sap.loadResource("sap-ui-version.json",{async:o.async,failOnError:o.async||o.failOnError});if(r instanceof Promise){v=r;return r.then(h,H);}else{return h(r);}}else{var R;if(typeof o.library!=="undefined"){var L=sap.ui.versioninfo.libraries;if(L){for(var i=0,l=L.length;i<l;i++){if(L[i].name===o.library){R=L[i];break;}}}}else{R=sap.ui.versioninfo;}return o.async?Promise.resolve(R):R;}};return V;});
