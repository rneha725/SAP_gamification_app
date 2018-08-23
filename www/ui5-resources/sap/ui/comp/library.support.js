/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
/**
 * Adds support rules of the sap.m library to the support infrastructure.
 */
sap.ui.define(["jquery.sap.global", "./rules/SmartForm.support"],
	function(jQuery, SmartFormSupport) {
	"use strict";

	return {
		name: "sap.ui.comp",
		niceName: "UI5 Smart Controls Library",
		ruleset: [
			SmartFormSupport
		]
	};

}, true);
