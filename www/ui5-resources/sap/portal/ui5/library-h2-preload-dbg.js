sap.ui.require.preload({
	"sap/portal/ui5/manifest.json":'{"_version":"1.9.0","sap.app":{"id":"sap.portal.ui5","type":"library","embeds":["core"],"applicationVersion":{"version":"1.56.0"},"title":"SAP UI library: sap.portal.ui5","description":"SAP UI library: sap.portal.ui5","resources":"resources.json","offline":true},"sap.ui":{"technology":"UI5","supportedThemes":[]},"sap.ui5":{"dependencies":{"minUI5Version":"1.56","libs":{"sap.ui.core":{"minVersion":"1.56.0"}}},"library":{"i18n":false}}}',
/*!
 * SAP UI development toolkit for HTML5 (SAPUI5) (c) Copyright 2009-2013 SAP AG. All rights reserved
 */
	"sap/portal/ui5/library.js":function(){jQuery.sap.declare("sap.portal.ui5.library");jQuery.sap.require("sap.ui.core.Core");jQuery.sap.require("sap.ui.core.library");sap.ui.getCore().initLibrary({name:"sap.portal.ui5",dependencies:["sap.ui.core"],types:[],interfaces:[],controls:[],elements:[],noLibraryCSS:true,version:"1.56.0"});sap.ui.lazyRequire('sap.portal.ui5.core.PropertyObserver');sap.ui.lazyRequire('sap.portal.ui5.core.ObjectMetadata');sap.ui.lazyRequire('sap.portal.ui5.core.ObservablePropertiesMixin');sap.ui.lazyRequire('sap.portal.ui5.core.Object');sap.ui.lazyRequire('sap.portal.ui5.core.View');sap.ui.lazyRequire('sap.portal.ui5.core.DynamicView');sap.ui.lazyRequire('sap.portal.ui5.core.UI5ControlView');sap.ui.lazyRequire('sap.portal.ui5.core.LayoutInterface');sap.ui.lazyRequire('sap.portal.ui5.core.Collection');sap.ui.lazyRequire('sap.portal.ui5.core.ComponentCollection');sap.ui.lazyRequire('sap.portal.ui5.core.LayoutData');sap.ui.lazyRequire('sap.portal.ui5.core.ComponentManager');sap.ui.lazyRequire('sap.portal.ui5.core.Component');
}
},"sap/portal/ui5/library-h2-preload"
);
sap.ui.loader.config({depCacheUI5:{
"sap/portal/ui5/core/Collection.js":["sap/portal/ui5/core/Object.js","sap/portal/ui5/core/PropertyObserver.js"],
"sap/portal/ui5/core/Component.js":["sap/portal/ui5/core/ComponentManager.js","sap/portal/ui5/core/LayoutData.js","sap/portal/ui5/core/Object.js","sap/portal/ui5/core/PropertyObserver.js","sap/portal/ui5/core/View.js"],
"sap/portal/ui5/core/ComponentCollection.js":["sap/portal/ui5/core/Collection.js"],
"sap/portal/ui5/core/ComponentManager.js":["sap/portal/ui5/core/Object.js"],
"sap/portal/ui5/core/DynamicView.js":["sap/portal/ui5/core/View.js"],
"sap/portal/ui5/core/LayoutData.js":["sap/portal/ui5/core/Collection.js"],
"sap/portal/ui5/core/LayoutInterface.js":["sap/portal/ui5/core/Object.js"],
"sap/portal/ui5/core/Object.js":["sap/portal/ui5/core/ObjectMetadata.js","sap/ui/base/ManagedObject.js"],
"sap/portal/ui5/core/ObjectMetadata.js":["sap/portal/ui5/core/PropertyObserver.js","sap/ui/base/ManagedObjectMetadata.js"],
"sap/portal/ui5/core/ObservablePropertiesMixin.js":["sap/portal/ui5/externals/es3shims/objectgetprototypeof.js","sap/portal/ui5/externals/es5shims/arrayprototypeindexof.js","sap/portal/ui5/externals/es5shims/arrayprototypelastindexof.js","sap/portal/ui5/externals/es5shims/functionprototypebind.js","sap/portal/ui5/externals/es5shims/windowprototypegetcomputedstyle.js"],
"sap/portal/ui5/core/PropertyObserver.js":["sap/portal/ui5/externals/es3shims/objectgetprototypeof.js","sap/portal/ui5/externals/es5shims/arrayprototypeindexof.js","sap/portal/ui5/externals/es5shims/arrayprototypelastindexof.js","sap/portal/ui5/externals/es5shims/functionprototypebind.js","sap/portal/ui5/externals/es5shims/windowprototypegetcomputedstyle.js"],
"sap/portal/ui5/core/UI5ControlView.js":["sap/portal/ui5/core/View.js"],
"sap/portal/ui5/core/View.js":["sap/portal/ui5/core/Object.js"],
"sap/portal/ui5/library.js":["sap/ui/core/Core.js","sap/ui/core/library.js"]
}});
//# sourceMappingURL=library-h2-preload.js.map