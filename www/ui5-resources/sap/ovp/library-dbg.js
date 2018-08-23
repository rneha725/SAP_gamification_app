/*!
 * Copyright (c) 2009-2014 SAP SE, All Rights Reserved
 */

/**
 * Initialization Code and shared classes of library sap.ovp (1.56.5)
 */
sap.ui.define(["jquery.sap.global", "sap/ui/Device", "sap/ui/core/Core"],
    function(jQuery, Device, Core) {

	/**
	 * SAP library: sap.ovp
	 *
	 * @namespace
	 * @alias sap.ovp
	 * @public
	 */
	var thisLibrary = sap.ui.getCore().initLibrary({
		name : "sap.ovp",
		dependencies: ["sap.ui.core","sap.ui.layout","sap.ui.generic.app",
			"sap.m", "sap.f", "sap.ui.comp", "sap.ui.rta"],
		types: [],
		interfaces: [],
		controls: [],
		elements: [],
		version: "1.56.5",
		extensions: {
			flChangeHandlers: {
				"sap.ovp.ui.EasyScanLayout" : "sap/ovp/flexibility/EasyScanLayout",
				"sap.ovp.ui.DashboardLayout" : "sap/ovp/flexibility/DashboardLayout"
			}
		}
	});

	// TODO there's now a workaround for the Firefox SyncXHR issue integrated in the ui5 module loading. Fix should no longer be necessary
	if (Device.browser.firefox) {
		jQuery.sap.log.warning("Loading library 'sap.viz' and 'sap.suite.ui.microchart' to avoid issues with Firefox sync XHR support");
		sap.ui.getCore().loadLibrary("sap.viz");
		sap.ui.getCore().loadLibrary("sap.suite.ui.microchart");
	}

	return thisLibrary;

});