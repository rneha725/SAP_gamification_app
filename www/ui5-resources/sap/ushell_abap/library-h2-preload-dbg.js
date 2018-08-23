/*!
 * Copyright (c) 2009-2017 SAP SE, All Rights Reserved
 */
sap.ui.predefine('sap/ushell_abap/library',[],function(){"use strict";sap.ui.getCore().initLibrary({name:"sap.ushell_abap",version:"1.56.5",dependencies:["sap.ui.core","sap.m"],noLibraryCSS:true,extensions:{"sap.ui.support":{diagnosticPlugins:["sap/ushell_abap/support/plugins/app-infra/AppInfraOnSapNetWeaverSupportPlugin"]}}});return sap.ushell_abap;},true);
sap.ui.require.preload({
	"sap/ushell_abap/manifest.json":'{"_version":"1.9.0","sap.app":{"id":"sap.ushell_abap","type":"library","embeds":["plugins/fcc-transport-ui"],"applicationVersion":{"version":"1.56.5"},"title":"SAP library: sap.ushell_abap","description":"SAP library: sap.ushell_abap","resources":"resources.json","offline":true},"sap.ui":{"technology":"UI5","supportedThemes":[]},"sap.ui5":{"dependencies":{"minUI5Version":"1.56","libs":{"sap.ui.core":{"minVersion":"1.56.0"}}},"library":{"i18n":false,"css":false}}}'
},"sap/ushell_abap/library-h2-preload"
);
sap.ui.loader.config({depCacheUI5:{
"sap/ui2/srvc/PageBuildingService.js":["sap/ui2/srvc/ODataService.js","sap/ui2/srvc/ODataWrapper.js","sap/ui2/srvc/utils.js"],
"sap/ui2/srvc/RemoteCatalogService.js":["sap/ui2/srvc/PageBuildingService.js"],
"sap/ushell_abap/adapters/abap/AppStateAdapter.js":["sap/ui2/srvc/ODataWrapper.js","sap/ushell/services/Personalization.js"],
"sap/ushell_abap/adapters/abap/ClientSideTargetResolutionAdapter.js":["sap/ui2/srvc/ODataWrapper.js","sap/ui2/srvc/utils.js"],
"sap/ushell_abap/adapters/abap/ContainerAdapter.js":["sap/ushell/System.js","sap/ushell/User.js","sap/ushell/utils.js"],
"sap/ushell_abap/adapters/abap/EndUserFeedbackAdapter.js":["sap/ui2/srvc/ODataService.js","sap/ui2/srvc/ODataWrapper.js"],
"sap/ushell_abap/adapters/abap/PageBuildingAdapter.js":["sap/ui2/srvc/factory.js","sap/ushell/System.js"],
"sap/ushell_abap/adapters/abap/PersonalizationAdapter.js":["sap/ushell/services/Personalization.js","sap/ushell/services/_Personalization/constants.js"],
"sap/ushell_abap/adapters/abap/SupportTicketAdapter.js":["sap/ui2/srvc/ODataService.js","sap/ui2/srvc/ODataWrapper.js"],
"sap/ushell_abap/adapters/abap/UserInfoAdapter.js":["sap/ui2/srvc/ODataService.js","sap/ui2/srvc/ODataWrapper.js"],
"sap/ushell_abap/adapters/hana/ContainerAdapter.js":["sap/ui2/srvc/utils.js","sap/ushell/System.js","sap/ushell/User.js"],
"sap/ushell_abap/plugins/fcc-transport-ui/Component.js":["sap/ui/Device.js","sap/ui/core/Component.js","sap/ui/fl/transport/TransportDialog.js","sap/ushell_abap/plugins/fcc-transport-ui/model/models.js"],
"sap/ushell_abap/plugins/fcc-transport-ui/model/models.js":["sap/ui/Device.js","sap/ui/model/json/JSONModel.js"],
"sap/ushell_abap/support/plugins/app-infra/AppInfraOnSapNetWeaverSupportPlugin.js":["jquery.sap.global.js","sap/m/Text.js","sap/ui/core/HTML.js","sap/ui/core/support/Plugin.js","sap/ui/core/support/Support.js","sap/ui/layout/VerticalLayout.js"]
}});
//# sourceMappingURL=library-h2-preload.js.map