sap.ui.define([],function(){"use strict";function r(m){var s="meta[name^='"+m+"']:not([name=''])";var M=document.querySelectorAll(s);var S="sap/ushell/bootstrap/common/common.read.metatags";var i=[];Array.prototype.forEach.call(M,function(o){try{i.push(JSON.parse(o.content));}catch(e){jQuery.sap.log.error(e.message,e.stack,S);}});return i;}return{readMetaTags:r};});