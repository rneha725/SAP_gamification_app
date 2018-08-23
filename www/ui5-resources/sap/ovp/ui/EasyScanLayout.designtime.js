/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2017 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ovp/ui/ComponentContainerDesigntimeMetadata"],function(C){"use strict";var r=sap.ui.getCore().getLibraryResourceBundle("sap.ovp");return{actions:{},aggregations:{content:{domRef:".sapUiComponentContainer",actions:{},propagateMetadata:function(e){var t=e.getMetadata().getName();if(t==="sap.ui.core.ComponentContainer"){return C;}else{return{actions:null};}},propagateRelevantContainer:false}},name:{singular:r&&r.getText("Card"),plural:r&&r.getText("Cards")}};},false);
