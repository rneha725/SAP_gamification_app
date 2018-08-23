/*
 * Reads Metatags based on the provided Prefix.
 */
sap.ui.define([], function () {
    "use strict";

    function fnReadMetaTags(sMetaPrefix) {
        var sSelector = "meta[name^='" + sMetaPrefix + "']:not([name=''])";
        var oMetaNodeList = document.querySelectorAll(sSelector);
        var S_COMPONENT = "sap/ushell/bootstrap/common/common.read.metatags";

        var aItems = [];

        Array.prototype.forEach.call(oMetaNodeList, function (oMetaNode) {
            try {
                aItems.push(JSON.parse(oMetaNode.content));
            } catch (e) {
                jQuery.sap.log.error(e.message, e.stack, S_COMPONENT);
            }
        });

        return aItems;
    }

    return { readMetaTags: fnReadMetaTags };
});