// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
/**
 * @fileOverview The SupportTicket adapter for the ABAP platform.
 *
 * @version 1.56.5
 */
(function () {
    "use strict";
    /*global jQuery, sap */
    jQuery.sap.declare("sap.ushell_abap.adapters.abap.SupportTicketAdapter");
    jQuery.sap.require("sap.ui2.srvc.ODataWrapper");
    jQuery.sap.require("sap.ui2.srvc.ODataService");

    sap.ushell_abap.adapters.abap.SupportTicketAdapter = function (oSystem) {

        /**
         * Convert the clientContext JSON into a human-readable form
         *
         * @param {JSON} oJson
         * @return {string} Human-readable representation of the JSON object
         *
         * @since 1.19.1
         * @private
         */
        function convertToReadable(oJson) {
            var sConvertedJson;

            if (oJson && !jQuery.isEmptyObject(oJson)) {
                sConvertedJson = JSON.stringify(oJson);
                return sConvertedJson
                    .replace(/\{|\}|\\n|,/g, "\n");
            }
            return "";
        }

        /**
         * Create a support ticket in the backend system
         *
         * @param {JSON} JSON object containing the input fields required for
         *      the support ticket.
         *
         * @class The Unified Shell's Support Ticket adapter for the ABAP platform.
         *
         * @since 1.19.1
         * @private
         */
        this.createTicket = function (oSupportTicketData) {
            var oDeferred,
                sBaseUrl = "/sap/opu/odata/UI2/INTEROP/",
                sRelativeUrl = "Messages",
                sUrl,
                sHash,
                sCatalogId,
                oDataWrapper;

            // text is mandatory for ABAP backend OData service
            if (!oSupportTicketData.text) {
                throw new sap.ushell.utils.Error("Support Ticket data does not contain text member");
            }

            sUrl = jQuery.sap.getObject("clientContext.navigationData.applicationInformation.url", 0, oSupportTicketData);
            sHash = jQuery.sap.getObject("clientContext.navigationData.navigationHash", 0, oSupportTicketData);
            sCatalogId = jQuery.sap.getObject("clientContext.navigationData.tileDebugInfo", 0, oSupportTicketData);

            sUrl = typeof sUrl === "string" ? sUrl : "";
            sHash = typeof sHash === "string" ? sHash : "";
            sCatalogId = typeof sCatalogId === "string" ? JSON.parse(sCatalogId).catalogId || '' : "";

            oSupportTicketData.url = sUrl;
            oSupportTicketData.catalogId = sCatalogId;
            oSupportTicketData.hash = sHash;
            oSupportTicketData.clientContext = convertToReadable(oSupportTicketData.clientContext);

            oDeferred = new jQuery.Deferred();
            var oODataWrapperSettings = {
                baseUrl:     sBaseUrl,
                'sap-language': sap.ushell.Container.getUser().getLanguage(),
                'sap-client':   sap.ushell.Container.getLogonSystem().getClient()
            };
            oDataWrapper = new sap.ui2.srvc.createODataWrapper(oODataWrapperSettings);
            sap.ui2.srvc.ODataService.call(this, oDataWrapper, function () {
                return false;
            });

            oDataWrapper.create(sRelativeUrl, oSupportTicketData, function (response) {
                oDeferred.resolve(response.messageNumber);
            }, function (sErrorMessage) {
                oDeferred.reject(sErrorMessage);
            });

            return oDeferred.promise();
        };
    };
}());
