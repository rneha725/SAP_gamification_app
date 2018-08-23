sap.ui.define([
    "sap/ushell/EventHub",
    "sap/ushell/bootstrap/common/common.create.configcontract.core"
], function (EventHub, fnCreateCoreConfigContract) {
    "use strict";

    var oChannelContract = fnCreateCoreConfigContract(window["sap-ushell-config"]);
    var oFlpConfigChannel = EventHub.createChannel(oChannelContract);

    // expose about the same API as channel
    var oAPI = Object.keys(oFlpConfigChannel).reduce(function (oAPI, sMethod) {
        oAPI[sMethod] = function () {
            if (!oFlpConfigChannel) {
                oFlpConfigChannel = EventHub.createChannel(oChannelContract);
            }

            return oFlpConfigChannel[sMethod].apply(oFlpConfigChannel, arguments);
        };

        return oAPI;
    }, {
        // For testing only
        _reset: function () {
            oFlpConfigChannel = null;
        },
        // TODO: this is now more a replace configuration and must be changed
        // to implement the API from future concept.
        registerConfiguration: function (sOwnerName, oContract) {
            oChannelContract = oContract;
        }
    });

    return oAPI;
}, false);
