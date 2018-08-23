/*!
 * Copyright (c) 2009-2017 SAP SE, All Rights Reserved
 */
// Provides control sap.ushell.ui.shell.ShellLayout.

sap.ui.define(['jquery.sap.global', 'sap/ui/Device', 'sap/ui/core/Control', 'sap/ushell/library', './ToolArea', './ShellLayoutRenderer'], function (jQuery, Device, Control, ShellHeader) {
        "use strict";

    /**
     * Constructor for a new ShellLayout.
     *
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The shell layout is the base for the shell control which is meant as root control (full-screen) of an application.
     * It was build as root control of the Fiori Launchpad application and provides the basic capabilities
     * for this purpose. Do not use this control within applications which run inside the Fiori Lauchpad and
     * do not use it for other scenarios than the root control usecase.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.56.5
     *
     * @constructor
     * @private
     * @since 1.25.0
     * @alias sap.ushell.ui.shell.ShellLayout
     * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
     */
        var ShellLayout = Control.extend("sap.ushell.ui.shell.ShellLayout", /** @lends sap.ushell.ui.shell.ShellLayout.prototype */ { metadata : {

            properties : {
                /**
                 * Whether the header can be hidden (manually or automatically). This feature is only available when touch events are supported.
                 * @deprecated Since version 1.56, this setting always defaults to false.
                 */
                headerHiding : {type : "boolean", group : "Appearance", defaultValue : false},

                /**
                 * If set to false, no header (and no items, search, ...) is shown.
                 */
                headerVisible : {type : "boolean", group : "Appearance", defaultValue : true},

                toolAreaVisible: {type : "boolean", group : "Appearance", defaultValue : false},

                floatingContainerVisible: {type : "boolean", group : "Appearance", defaultValue : false},

                backgroundColorForce: {type : "boolean", group : "Appearance", defaultValue : true},

                showBrandLine: {type : "boolean", group : "Appearance", defaultValue : true},

                showAnimation: {type : "boolean", group : "Appearance", defaultValue : true},

                enableCanvasShapes: {type : "boolean", group : "Appearance", defaultValue : false}
            },
            aggregations : {
                /**
                 * The control to appear in the sidebar (left) area.
                 */
                toolArea : {type : "sap.ushell.ui.shell.ToolArea", multiple : false},

                /**
                 * The control to appear in the (right) area for the alerts.
                 */
                rightFloatingContainer : {type : "sap.ushell.ui.shell.RightFloatingContainer", multiple : false},

                /**
                 * Private storage for the internal split container for the canvas.
                 */
                canvasSplitContainer : {type : "sap.ushell.ui.shell.SplitContainer", multiple : false},

                /**
                 * The action button which is rendered floating in the shell content area. If a custom header is set this aggregation has no effect.
                 */
                floatingActionsContainer : {type : "sap.ushell.ui.shell.ShellFloatingActions", multiple : false},

                /**
                 * Optional shell footer
                 * @since 1.56
                 * @private
                 */
                footer : {type: "sap.ui.core.Control", multiple : false}
            },
            associations : {
                /**
                 * The shell header control.
                 */
                header : {type : "sap.ushell.ui.shell.ShellHeader", multiple : false},
                floatingContainer : {type : "sap.ushell.ui.shell.FloatingContainer", multiple : false}
            }
        }});

        ShellLayout._SIDEPANE_WIDTH_PHONE = 13;
        ShellLayout._SIDEPANE_WIDTH_TABLET = 13;
        ShellLayout._SIDEPANE_WIDTH_DESKTOP = 15;

        ShellLayout.prototype.getHeader = function () {
            return sap.ui.getCore().byId(this.getAssociation("header"));
        };

        ShellLayout.prototype.init = function () {
            this._rtl = sap.ui.getCore().getConfiguration().getRTL();
            this._showHeader = true;
            this._useStrongBG = false;

            Device.media.attachHandler(this._handleMediaChange, this, Device.media.RANGESETS.SAP_STANDARD);
        };

        ShellLayout.prototype.exit = function () {
            Device.media.detachHandler(this._handleMediaChange, this, Device.media.RANGESETS.SAP_STANDARD);
        };

        ShellLayout.prototype.onAfterRendering = function () {
            this.getCanvasSplitContainer()._applySecondaryContentSize();
            this._setSidePaneWidth();
        };

        ShellLayout.prototype.renderFloatingContainerWrapper = function () {
            var floatingContainerWrapper = document.getElementById("sapUshellFloatingContainerWrapper"),
                body = document.getElementsByTagName('body'),
                storage = jQuery.sap.storage ? jQuery.sap.storage(jQuery.sap.storage.Type.local, "com.sap.ushell.adapters.local.FloatingContainer") : undefined;

            if (!floatingContainerWrapper){
                floatingContainerWrapper = document.createElement("DIV");
                floatingContainerWrapper.setAttribute("id", 'sapUshellFloatingContainerWrapper');
                floatingContainerWrapper.setAttribute("class", 'sapUshellShellFloatingContainerWrapper sapUshellShellHidden');
                body[0].appendChild(floatingContainerWrapper);
            }

            if (storage && storage.get("floatingContainerStyle")) {
                floatingContainerWrapper.setAttribute("style", storage.get("floatingContainerStyle"));
            }
        };

        ShellLayout.prototype.renderFloatingContainer = function (oFloatingContainer) {
            this.renderFloatingContainerWrapper();

            if (oFloatingContainer && !oFloatingContainer.getDomRef()) {
                jQuery('#sapUshellFloatingContainerWrapper').toggleClass("sapUshellShellHidden", true);
                oFloatingContainer.placeAt("sapUshellFloatingContainerWrapper");
            }
        };

        ShellLayout.prototype.onThemeChanged = function () {
            return !!this.getDomRef();
        };

        //***************** API / Overridden generated API *****************

        ShellLayout.prototype.setToolAreaVisible = function (bVisible) {
            this.setProperty("toolAreaVisible", !!bVisible, true);
            this.getToolArea().$().toggleClass("sapUshellShellHidden", !bVisible);
            this.getCanvasSplitContainer()._applySecondaryContentSize();
            return this;
        };

        ShellLayout.prototype.setFloatingContainer = function (oContainer) {
            this.setAssociation('floatingContainer', oContainer, true);
            this.renderFloatingContainer(oContainer);
        };

        ShellLayout.prototype.setFloatingContainerVisible = function (bVisible) {
            // setting the actual ShellLayout property
            this.setProperty("floatingContainerVisible", !!bVisible, true);
            if (this.getDomRef()) {
                var storage = jQuery.sap.storage ? jQuery.sap.storage(jQuery.sap.storage.Type.local, "com.sap.ushell.adapters.local.FloatingContainer") : undefined,
                    floatingContainerWrapper = document.getElementById("sapUshellFloatingContainerWrapper");
                // Only in case this is first time the container is opened and there is no style for it in local storage
                if (bVisible && storage && !storage.get("floatingContainerStyle")) {
                    var emSize = jQuery(".sapUshellShellHeadItm").position() ? jQuery(".sapUshellShellHeadItm").position().left : 0;
                    var iLeftPos = (jQuery(window).width() - jQuery("#shell-floatingContainer").width() - emSize) * 100 / jQuery(window).width();
                    var iTopPos = jQuery(".sapUshellShellHeadContainer").height() * 100 / jQuery(window).height();
                    floatingContainerWrapper.setAttribute("style", "left:" + iLeftPos + "%;" + "top:" + iTopPos + "%;position:absolute;");
                    storage.put("floatingContainerStyle", floatingContainerWrapper.getAttribute("style"));
                }
                jQuery('.sapUshellShellFloatingContainerWrapper').toggleClass("sapUshellShellHidden", !bVisible);

            }
            return this;
        };

        ShellLayout.prototype.setFloatingActionsContainer = function (oContainer) {
            this.setAggregation('floatingActionsContainer', oContainer, true);
        };

        ShellLayout.prototype.setHeaderVisible = function (bHeaderVisible) {
            this.setProperty("headerVisible", !!bHeaderVisible, true);
            this.$().toggleClass("sapUshellShellNoHead", !bHeaderVisible);
            return this;
        };

        /*Restricted API for Launchpad to set a Strong BG style*/
        ShellLayout.prototype._setStrongBackground = function (bUseStongBG) {
            this._useStrongBG = !!bUseStongBG;
            this.$("strgbg").toggleClass("sapUiStrongBackgroundColor", this._useStrongBG);
        };

        //***************** Private Helpers *****************

        ShellLayout.prototype._setSidePaneWidth = function (sRange) {
            var oSplitContainer = this.getCanvasSplitContainer();
            if (oSplitContainer) {
                if (!sRange) {
                    sRange = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name;
                }

                var w = ShellLayout["_SIDEPANE_WIDTH_" + sRange.toUpperCase()] + "rem";
                oSplitContainer.setSecondaryContentSize(w);
            }
        };

        ShellLayout.prototype._handleMediaChange = function (mParams) {
            if (!this.getDomRef()) {
                return false;
            }
            this._setSidePaneWidth(mParams.name);
            this.getCanvasSplitContainer()._applySecondaryContentSize();
        };

        return ShellLayout;

    }, true /* bExport */);
