/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(["sap/ui/core/Control"],function(C){"use strict";return{getNameSpaceInfo:function(c){var n={};n.className=c;var m=c.split(".");n.localName=m.pop();n.nameSpace=m.join(".");return n;},className:function(x){var l=x.localName||x.baseName||x.nodeName;if(!l){return undefined;}return x.namespaceURI+"."+l;}};});
