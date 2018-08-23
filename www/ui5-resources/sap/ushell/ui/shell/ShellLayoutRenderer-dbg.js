/*!
 * Copyright (c) 2009-2017 SAP SE, All Rights Reserved
 */
/*global jQuery, sap*/
// Provides default renderer for control sap.ushell.ui.shell.ShellLayout
sap.ui.define([],
    function () {
        "use strict";

        /**
         * Shell Layout renderer.
         * @namespace
         */
        var ShellLayoutRenderer = {};

        /**
         * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
         * @param {sap.ui.core.RenderManager} rm the RenderManager that can be used for writing to the Render-Output-Buffer
         * @param {sap.ui.core.Control} oShell an object representation of the control that should be rendered
         */
        ShellLayoutRenderer.render = function (rm, oShell) {
            var id = oShell.getId(),
                sClassName,
                canvasWidth = (window.innerWidth > 0) ? window.innerWidth : screen.width,
                canvasHeight = (window.innerHeight > 0) ? window.innerHeight : screen.height,
                oFooter = oShell.getFooter();

            rm.write("<div");
            rm.writeControlData(oShell);
            rm.addClass("sapUshellShell");
            if (oShell.getShowAnimation()) {
                rm.addClass("sapUshellShellAnim");
            }
            if (!oShell.getHeaderVisible()) {
                rm.addClass("sapUshellShellNoHead");
            }
            rm.addClass("sapUshellShellHead" + (oShell._showHeader ? "Visible" : "Hidden"));
            if (oFooter) {
                rm.addClass("sapUshellShellFooterVisible");
            }
            rm.writeClasses();
            rm.write(">");

            //use the showBrandLine to tell if the background should be behind the header or not
            //in Fiori 1.0 the background should not be rendered behind the header
            if (!oShell.getShowBrandLine()) {
                rm.write("<div id='", id, "-strgbg' class='sapUshellShellBG sapContrastPlus" + (oShell._useStrongBG ? " sapUiStrongBackgroundColor" : "") + "'></div>");
                rm.write("<div class='sapUiShellBackgroundImage sapUiGlobalBackgroundImageForce sapUshellShellBG sapContrastPlus'></div>");
            }

            if (oShell.getEnableCanvasShapes()) {
                rm.write("<canvas id='", id, "-shapes' height='", canvasHeight, "'width='", canvasWidth,"' style='position: absolute;'>");
                rm.write("</canvas>");
            }
            if (oShell.getShowBrandLine()) {
                rm.write("<hr id='", id, "-brand' class='sapUshellShellBrand'/>");
            }

            //
            // Shell Header has been moved to a separate UI area and is not rendered here
            //

            if (oShell.getToolArea()) {
                rm.write("<aside>");
                rm.renderControl(oShell.getToolArea());
                rm.write("</aside>");
            }

            if (oShell.getRightFloatingContainer()) {
                rm.write("<aside>");
                rm.renderControl(oShell.getRightFloatingContainer());
                rm.write("</aside>");
            }

            sClassName = "sapUshellShellCntnt sapUshellShellCanvas";
            if (oShell.getBackgroundColorForce()) {
                sClassName += " sapUiShellBackground sapUiGlobalBackgroundColorForce";
            }
            rm.write("<div id='", id, "-cntnt' class='" + sClassName + "'>");

            //use the showBrandLine to tell if the background should be behind the header or not
            //in Fiori 1.0 the background should not be rendered behind the header
            if (oShell.getShowBrandLine()) {
                rm.write("<div id='", id, "-strgbg' class='sapUshellShellBG sapContrastPlus" + (oShell._useStrongBG ? " sapUiStrongBackgroundColor" : "") + "'></div>");
                rm.write("<div class='sapUiShellBackgroundImage sapUiGlobalBackgroundImageForce sapUshellShellBG sapContrastPlus'></div>");
            }
            rm.renderControl(oShell.getCanvasSplitContainer());

            rm.write("</div>");

            rm.write("<span id='", id, "-main-focusDummyOut' tabindex='-1'></span>");

            rm.renderControl(oShell.getFloatingActionsContainer());

            // Render the footer
            if (oFooter) {
                rm.write('<footer class="sapMPageFooter">');
                oFooter._applyContextClassFor && oFooter._applyContextClassFor("footer");
                rm.renderControl(oFooter);
                rm.write('</footer>');
            }

            rm.write("</div>");
        };

        return ShellLayoutRenderer;

    }, /* bExport= */ true);
