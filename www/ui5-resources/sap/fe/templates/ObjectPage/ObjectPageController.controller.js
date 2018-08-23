/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(["jquery.sap.global","sap/ui/core/mvc/Controller"],function(q,C){"use strict";return C.extend("sap.fe.templates.ObjectPage.ObjectPageController",{onBeforeBinding:function(){var o=this.byId("objectPage");o.getHeaderTitle().setBindingContext(null);o.getHeaderContent()[0].setBindingContext(null);o.getSections().forEach(function(s){s.getSubSections().forEach(function(S){S.setBindingContext(null);});});o.attachEvent("subSectionEnteredViewPort",function(e){var o=e.getSource();var s=e.getParameter("subSection");o.getHeaderTitle().setBindingContext(undefined);o.getHeaderContent()[0].setBindingContext(undefined);s.setBindingContext(undefined);});},handlers:{onItemPress:function(e){var p=e.getParameters().listItem.getBindingContext().getPath();this.getOwnerComponent().getTemplateUtils().getHashChanger().setHash(p);}}});});
