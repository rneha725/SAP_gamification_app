/* global sinaDefine */

sinaDefine([
    '../../../sina/SinaObject'
], function (SinaObject) {
    "use strict";

    return SinaObject.derive({

        _init: function () {
            this.suvMimeType = "application/vnd.sap.universal-viewer+suv";
            this.suvViewerBasePath = "/sap/bc/ui5_ui5/ui2/ushell/resources/sap/fileviewer/viewer/web/viewer.html?file=";
        },

        resolveSuvNavTargets: function (dataSource, suvAttributes) {

            for (var suvAttributeName in suvAttributes) {
                var suvAttribute = suvAttributes[suvAttributeName];
                if (suvAttribute.suvTargetMimeTypeAttribute.value == this.suvMimeType) {
                    var thumbnailAttribute = suvAttribute.suvThumbnailAttribute;
                    var openSuvInFileViewerUrl = this.suvViewerBasePath + encodeURIComponent(suvAttribute.suvTargetUrlAttribute.value);
                    thumbnailAttribute.defaultNavigationTarget = this.sina._createNavigationTarget({
                        label: suvAttribute.suvTargetUrlAttribute.value,
                        targetUrl: openSuvInFileViewerUrl
                    });
                }
            }
        }
    });
});
