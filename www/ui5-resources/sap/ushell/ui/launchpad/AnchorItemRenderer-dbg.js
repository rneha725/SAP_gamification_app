// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

sap.ui.define(function() {
	"use strict";

    /**
     * @name AnchorItem renderer.
     * @static
     * @private
     */
    var AnchorItemRenderer = {};

    AnchorItemRenderer.render = function (rm, oAnchorItem) {
        var oAnchorNavigationBar = oAnchorItem.getParent(),
            oAnchorItems = oAnchorNavigationBar.getGroups(),
            oAnchorVisibleItems = oAnchorItems.filter(function (oGroup) {
                return oGroup.getVisible();
            }),
            iCurrentItemIndex = oAnchorVisibleItems.indexOf(oAnchorItem) > -1 ? oAnchorVisibleItems.indexOf(oAnchorItem) + 1 : "",
            oDashboardGroupsModel = oAnchorItem.getModel(),
            sItemGroupModelPath = oAnchorItem.getBindingContext().getPath(),
            oItemGroupModelObject = oDashboardGroupsModel.getProperty(sItemGroupModelPath),
            sItemGroupId = oItemGroupModelObject.groupId;

        rm.write("<li");
        rm.writeControlData(oAnchorItem);
        rm.addClass("sapUshellAnchorItem");
        rm.writeAccessibilityState(oAnchorItem, {role: "option", posinset : iCurrentItemIndex, setsize : oAnchorVisibleItems.length});
        rm.writeAttribute("modelGroupId", sItemGroupId);
        rm.writeAttribute("tabindex", "-1");
        if (!oAnchorItem.getVisible()) {
            rm.addClass("sapUshellShellHidden");
        }
        rm.writeClasses();
        rm.write(">");
        rm.write("<div");
        rm.addClass("sapUshellAnchorItemInner");
        rm.writeClasses();
        rm.write(">");
        rm.writeEscaped(oAnchorItem.getTitle());
        rm.write("</div>");
        rm.write("</li>");
    };


    return AnchorItemRenderer;

}, /* bExport= */ true);
