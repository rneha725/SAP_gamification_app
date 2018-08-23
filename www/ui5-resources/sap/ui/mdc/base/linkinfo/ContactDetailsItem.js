/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(['sap/ui/core/Element'],function(E){"use strict";var C=E.extend("sap.ui.mdc.base.linkinfo.ContactDetailsItem",{metadata:{library:"sap.ui.mdc",properties:{sectionTitle:{type:"string",defaultValue:sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc").getText("linkinfo.POPOVER_CONTACT_SECTION_TITLE")},photo:{type:"string"},formattedName:{type:"string"},role:{type:"string"},title:{type:"string"},org:{type:"string"},parameters:{type:"object"}},defaultAggregation:"emails",aggregations:{emails:{type:"sap.ui.mdc.base.linkinfo.ContactDetailsEmailItem",multiple:true,singularName:"email"},phones:{type:"sap.ui.mdc.base.linkinfo.ContactDetailsPhoneItem",multiple:true,singularName:"phone"},addresses:{type:"sap.ui.mdc.base.linkinfo.ContactDetailsAddressItem",multiple:true,singularName:"address"}}}});return C;},true);
