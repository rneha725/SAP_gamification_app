/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.define(function () {
	"use strict";

	return function (oRta) {
		var oSelectionManager = oRta._oDesignTime.getSelectionManager();

		return {
			exports: {
				get: oSelectionManager.get.bind(oSelectionManager),
				set: oSelectionManager.set.bind(oSelectionManager),
				add: oSelectionManager.add.bind(oSelectionManager),
				remove: oSelectionManager.remove.bind(oSelectionManager)
			}
		};
	};
});