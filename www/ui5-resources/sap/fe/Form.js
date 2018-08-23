/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(['jquery.sap.global','sap/ui/core/XMLComposite','sap/ui/base/ManagedObject','sap/ui/Device','sap/fe/core/AnnotationHelper'],function(q,X,M,D){"use strict";var F=X.extend("sap.fe.Form",{metadata:{designTime:true,specialSettings:{metadataContexts:{defaultValue:"{ model: 'dataFieldCollectionModel', path:'',  name: 'dataFieldCollection'}"}},properties:{formElementsContextPath:{type:"any",invalidate:"template"},formTitle:{type:"string",invalidate:"template"}},events:{},aggregations:{},publicMethods:[]},alias:"this",fragment:"sap.fe.controls._Form.Form"});F.prototype.init=function(){};return F;},true);
