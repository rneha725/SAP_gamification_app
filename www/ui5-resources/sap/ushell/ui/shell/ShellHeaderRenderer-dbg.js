/*!
 * Copyright (c) 2009-2017 SAP SE, All Rights Reserved
 */
sap.ui.define(['sap/ushell/resources'], function (resources) {
    "use strict";

    /**
     * @name ShellHeader renderer.
     * @static
     * @private
     */
    var ShellHeaderRenderer = {};

    /**
     * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
     * 
     * @param {sap.ui.core.RenderManager} rm the RenderManager that can be used for writing to the render output buffer
     * @param {sap.ui.core.Control} oHeader ShellHeader to be rendered
     */
    ShellHeaderRenderer.render = function (rm, oHeader) {
        var id = oHeader.getId();
        rm.write("<div");
        rm.writeControlData(oHeader);
        if (oHeader.getAriaLabel()) {
            rm.writeAccessibilityState({
                label: oHeader.getAriaLabel(),
                role: "banner"
            });
        }
        rm.addClass("sapUshellShellHeader");
        rm.addClass("sapUshellShellCntnt");
        rm.writeClasses();
        rm.write(">");
        rm.write("<div id='", id, "-hdr-begin' class='sapUshellShellHeadBegin'>");
        this.renderHeaderItems(rm, oHeader, true);
        rm.write("</div>");

        rm.write("<div id='", id, "-hdr-center' class='sapUshellShellHeadCenter' >");


        this.renderTitle(rm, oHeader);
        if (oHeader.getAppTitle()) {
            this.renderAppTitle(rm, oHeader);
        }
        this.renderSearch(rm, oHeader);
        rm.write("</div>");


        rm.write("<div id='", id, "-hdr-end' class='sapUshellShellHeadEnd'>");
        this.renderHeaderItems(rm, oHeader, false);
        rm.write("</div>");
        rm.write("<div tabindex='0' id='sapUshellHeaderAccessibilityHelper' style='position: absolute'></div>");
        rm.write("</div>");
    };

    ShellHeaderRenderer.renderSearch = function (rm, oHeader) {
        var oSearch = oHeader.getSearch();
        rm.write("<div id='", oHeader.getId(), "-hdr-search-container'");
        rm.writeAttribute("class", "sapUshellShellSearch");
        rm.addStyle("max-width", oHeader.getSearchMaxWidth() + "rem");

        rm.writeStyles();
        rm.write(">");
        if (oSearch) {
            rm.renderControl(oSearch);
        }
        rm.write("</div>");
    };

    ShellHeaderRenderer.renderTitle = function (rm, oHeader) {
        var sClassName = "sapUshellShellHeadTitle";
        if (oHeader.getAppTitle()) {
            sClassName = "sapUshellShellHeadSubtitle";
        }

        rm.write("<div id='", oHeader.getId(), "-hdr-title' class='" + sClassName + "'");
        rm.write(">");
        rm.renderControl(oHeader.getTitle());
        rm.write("</div>");
    };

    ShellHeaderRenderer.renderAppTitle = function (rm, oHeader) {
        rm.write("<div id='", oHeader.getId(), "-hdr-appTitle' class='sapUshellShellHeadTitle'>");
        rm.renderControl(oHeader.getAppTitle());
        rm.write("</div>");
    };

    ShellHeaderRenderer.renderHeaderItems = function (rm, oHeader, begin) {
        rm.write("<div class='sapUshellShellHeadContainer'>");
        var tooltip,
            oUser,
            sUserName,
            aItems = begin ? oHeader.getHeadItems() : oHeader.getHeadEndItems(),
            i;
        for (i = 0; i < aItems.length; i++) {
            aItems[i]._headerHideSeperators = !oHeader.getShowSeparators();
            rm.renderControl(aItems[i]);
        }

        oUser = oHeader.getUser();
        if (!begin && oUser) {
            rm.write("<a tabindex='0'");
            rm.writeElementData(oUser);
            rm.addClass("sapUshellShellHeadAction sapUshellShellHeadSeparator");
            rm.writeClasses();
            tooltip = oUser.getTooltip_AsString();
            if (tooltip) {
                rm.writeAttributeEscaped("title", tooltip);
            }
            if (oUser.getAriaLabel()) {
                //Handle Aria Label rendering
                rm.writeAccessibilityState({
                    label: oUser.getAriaLabel(),
                    haspopup: "true",
                    role: "button"
                });
            }
            rm.write("><span id='", oUser.getId(), "-img' class='sapUshellShellHeadActionImg'></span>");
            rm.write("<span id='" + oUser.getId() + "-name' class='sapUshellShellHeadActionName'");
            rm.write(">");
            sUserName = oUser.getUsername() || "";
            rm.writeEscaped(sUserName);
            rm.write("</span><span class='sapUshellShellHeadActionExp'></span></a>");
        }

        rm.write("</div>");
        if (begin) {
            this.renderLogo(rm, oHeader);
        }
    };

    ShellHeaderRenderer.renderLogo = function (rm, oHeader) {
        var sLogoTooltip = resources.i18n.getText("SHELL_LOGO_TOOLTIP"),
            sIco = oHeader._getLogo(),
            sClassName = "";
        if (!oHeader.getShowLogo()) {
            sClassName += "sapUshellShellHideIco";
        } else {
            sClassName += "sapUshellShellIco";
        }
        rm.write("<div class='" + sClassName + "'");
        rm.write(">");
        rm.write("<img id='", oHeader.getId(), "-icon'");
        rm.writeAttributeEscaped("alt", sLogoTooltip);
        rm.writeAttributeEscaped("title", sLogoTooltip);
        rm.write("src='");
        rm.writeEscaped(sIco);
        rm.write("' style='", sIco ? "" : "display:none;", "'></img>");
        rm.write("</div>");
    };

    return ShellHeaderRenderer;

}, /* bExport= */ true);
