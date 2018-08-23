/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
sap.ui.define(["jquery.sap.global","sap/ui/comp/designtime/smartform/Group.designtime","sap/ui/fl/changeHandler/ChangeHandlerMediator"],function(q,G,C){"use strict";var m=q.extend(true,{},G);m.aggregations.formElements.actions.addODataProperty.changeType="addMultiEditField";return{aggregations:{layout:{ignore:false,propagateMetadata:function(i){if(i.getMetadata().getName()==="sap.ui.comp.smartform.Group"){return m;}}}}};},false);
