/*global jQuery, sap, window */
// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview The Search adapter for the ABAP platform.
 *
 * @version 1.56.5
 */
sap.ui.define([], function () {
    "use strict";

    /**
     *
     * @param oSystem
     * @returns {sap.ushell_abap.adapters.abap.SearchAdapter}
     * @private
     */
    sap.ushell_abap.adapters.abap.SearchAdapter = function (oSystem) {
        //@deprecated
        this.getSina = function () {
            return {};
        };
    };
    return sap.ushell_abap.adapters.abap.SearchAdapter;
});
