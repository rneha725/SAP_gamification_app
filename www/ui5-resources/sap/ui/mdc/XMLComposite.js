/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(['sap/ui/core/XMLComposite','./ResourceModel'],function(X,R){"use strict";var M=X.extend("sap.ui.mdc.XMLComposite",{metadata:{"abstract":true},defaultMetaModel:'sap.ui.mdc.metaModel',alias:"this"});M.prototype.init=function(){if(R){this.setModel(R.getModel(),"$i18n");}};return M;},true);
