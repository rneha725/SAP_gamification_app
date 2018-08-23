/*!
 * Copyright (c) 2009-2017 SAP SE, All Rights Reserved
 */
/*global jQuery, sap */
sap.ui.define([
        'jquery.sap.global',
        'sap/ui/core/Control',
        'sap/ui/core/theming/Parameters',
        'sap/ushell/library',
        'sap/ui/Device',
        'sap/ui/core/IconPool',
        './ShellTitle',
        './ShellAppTitle',
        './ShellHeaderRenderer'
    ], function (
        jQuery,
        Control,
        ThemingParameters,
        library,
        Device,
        IconPool,
        ShellTitle
    ) {
        "use strict";

        var iSearchMaxWidthValue = 0, iNextSearchMaxWidthValue = 0;
        var iLogoSize;
        var iLogoPaddingLeft;
        var iLogoPaddingRight;
        var iSearchPhoneStateThreshold;
        var sSearchOverlayCSS = "sapUshellShellShowSearchOverlay";

        var MIN_PADDING_REM_VALUE_LARGE = 3,
            MIN_PADDING_REM_VALUE_SMALL = 1,
            MIN_PADDING_REM_VALUE_SMALL_FOR_SEARCH = 0.5,
            MIN_REM_VALUE_FOR_SEARCH_CONTAINER_SIZE = 9,
            APP_TITLE_MIN_VALUE = 3,
            TITLE_MIN_VALUE = 3,
            TITLE_MAX_WIDTH_VALUE = 12;

        var ShellHeader = Control.extend("sap.ushell.ui.shell.ShellHeader", {
            /** @lends sap.ushell.ui.shell.ShellHeader.prototype */
            metadata: {
                properties: {
                    logo: {type: "sap.ui.core.URI", defaultValue: ""},
                    showLogo: {type: "boolean", defaultValue: true},
                    searchState: {type: "string", defaultValue: "COL"},
                    ariaLabel: {type: "string", defaultValue: undefined},
                    showSeparators: {type : "boolean", group : "Appearance", defaultValue : true}
                },
                aggregations: {
                    headItems: {type: "sap.ushell.ui.shell.ShellHeadItem", multiple: true},
                    headEndItems: {type: "sap.ushell.ui.shell.ShellHeadItem", multiple: true},
                    search: {type: "sap.ui.core.Control", multiple: false},
                    user: {type: "sap.ushell.ui.shell.ShellHeadUserItem", multiple: false},
                    title: {type: "sap.ushell.ui.shell.ShellTitle", multiple: false},
                    appTitle: {type: "sap.ushell.ui.shell.ShellAppTitle", multiple: false}
                },
                associations: {
                    shellLayout : {type : "sap.ui.base.ManagedObject", multiple : false}
                },
                events : {
                    searchSizeChanged : {}
                }
            }
        });

        ShellHeader.prototype.setVisible = function(bVisible) {
            bVisible = bVisible === undefined ? true : !!bVisible;
            jQuery(".sapUshellShellHead, .sapUshellShellHead > .sapUshellShellCntnt")
                .css("display", bVisible ? "" : "none");
            Control.prototype.setVisible.call(this, bVisible);
        };

        /**
         * @returns sap.ui.core.Control the related ShellLayout control
         * @private
         */
        ShellHeader.prototype.getShellLayoutControl = function () {
            return sap.ui.getCore().byId(this.getShellLayout());
        };

        /**
         * Create a separate UI Area and place the Shell Header therein
         * @param {string} [sId="canvas"] ID of the shell UI Area
         * @private
         */
        ShellHeader.prototype.createUIArea = function (sId) {
            var headerArea = document.getElementById('shell-hdrcntnt');
            var canvasId = sId || 'canvas';
            var canvas = document.getElementById(canvasId);
            if (canvas && !headerArea) {
                canvas.insertAdjacentHTML('beforebegin',
                    '<header id="shell-hdr" class="sapContrastPlus sapUshellShellHead">' +
                    '</header>');
                if (!this.getVisible()) {
                    this.setVisible(false); // force hide outer divs
                }
                this.placeAt('shell-hdr');
            }
        };

        /**
         * The search states that can be passed as a parameter to the setSearchState.
         * Values:
         * COL -
         * EXP -
         * EXP_S -
         */
        ShellHeader.prototype.SearchState = {
            COL: "COL",
            EXP: "EXP",
            EXP_S: "EXP_S"
        };

        ShellHeader.prototype.init = function () {
            this._rtl = sap.ui.getCore().getConfiguration().getRTL();

            this._handleMediaChange = function (mParams) {
                if (!this.getDomRef()) {
                    return;
                }
                if (this.getSearchState() != this.SearchState.COL) {
                    this._setMaxWidthForAppTitleAndTitle();
                    this._handleSearchSizeChanged();
                    return;
                }
                this._refresh();
            };
            Device.media.attachHandler(this._handleMediaChange, this, Device.media.RANGESETS.SAP_STANDARD);

            this._handleResizeChange = function () {
                if (!this.getDomRef()) {
                    return;
                }
                var oUser = this.getUser();
                if (this.getUser()) {
                    oUser._checkAndAdaptWidth(!this.$("hdr-search").hasClass("sapUshellShellHidden") && !!this.getSearch());
                }

                if (this.getSearchState() != this.SearchState.COL) {
                    this._setMaxWidthForAppTitleAndTitle();
                    this._handleSearchSizeChanged();
                    return;
                }

                this._refresh();
            };
            Device.resize.attachHandler(this._handleResizeChange, this);

            this.data("sap-ui-fastnavgroup", "true", true); // Define group for F6 handling

            this.oTitle = null;
        };

        /**
         * This hook is called before the shell header control is destroyed
         * @private
         */
        ShellHeader.prototype.exit = function () {
            Device.media.detachHandler(this._handleMediaChange, this, Device.media.RANGESETS.SAP_STANDARD);
            Device.resize.detachHandler(this._handleResizeChange, this);
            if (this.oTitle) {
                this.oTitle.destroy();
            }
            var shellHeader = document.getElementById('shell-hdr');
            if (shellHeader) {
                shellHeader.parentElement.removeChild(shellHeader);
            }
        };

        /**
         * Set Fiori 2 Access Key Handler
         * @param {object} AccessKeyHandler AccessKeyHandler
         * @private
         */
        ShellHeader.prototype.setAccessKeyHandler = function(AccessKeyHandler) {
            this._accessKeyHandler = AccessKeyHandler;
        };

        /**
         * Activate Fiori 2 Access Key Handler.
         * Handle keyboard navigation when different viewports are active.
         * @param {object} handler optional Access Key Handler
         * @private
         */
        ShellHeader.prototype.attachAccessKeyHander = function(handler) {
            if (!handler) {
                return; // ShellHeader in non-Fior2 scenarios
            }

            jQuery("#sapUshellHeaderAccessibilityHelper").focusin(function (oEvent) {
                var viewPort = sap.ui.getCore().byId('viewPortContainer'),
                    sCurrentState = viewPort.getCurrentState(),
                    nextFocusElement;

                // navigation direction is forward
                if (handler.bForwardNavigation) {
                    switch (sCurrentState) {
                        case "Center":
                            if (handler.getAppKeysHandler()) {
                                setTimeout(function () {
                                    handler.fnExternalKeysHandler(oEvent, handler.bFocusPassedToExternalHandlerFirstTime);
                                    handler.bFocusOnShell = false;
                                }, 0);
                            } else {
                                // set the focus on the next focusable element in the dom to avoid double tab clicks
                                // to get there
                                var jqAllFocusableElements = jQuery(":focusable").filter("[tabindex!='-1']"),
                                    iCurrentFocusIndex = jqAllFocusableElements.index(document.activeElement),
                                    nextFocusElement = jqAllFocusableElements.eq(iCurrentFocusIndex + 1);

                                //go to first focusable item
                                if (!nextFocusElement.length) {
                                    nextFocusElement = jqAllFocusableElements[0];
                                }
                            }
                            break;
                        case "LeftCenter":
                            // If the MeArea is opened, then the focus will be located either on the logout button,
                            // or on the status-opener button, since only one of those two button may exist
                            nextFocusElement = jQuery("#logoutBtn");
                            if (nextFocusElement.length === 0) {
                                nextFocusElement = jQuery("#userStatusOpener");
                            }
                            break;
                        case "RightCenter":
                            nextFocusElement = jQuery("#sapUshellNotificationIconTabByDate");
                            handler.bFocusOnShell = false;
                            break;
                    }
                    // navigation direction is backward
                } else {
                    var aHeaderEndItems = this.getHeadEndItems(),
                        oLastHeaderItem;
                    if (aHeaderEndItems.length > 0) {
                        oLastHeaderItem = aHeaderEndItems[aHeaderEndItems.length - 1];
                        nextFocusElement = oLastHeaderItem;
                    } else
                        nextFocusElement = this.getAppTitle();
                }
                setTimeout(function () {
                    // set the focus in timeout in order to support screen reader. Otherwise the screen reader
                    // will not read the target element
                    if (nextFocusElement) {
                        nextFocusElement.focus();
                    }
                }, 0);
            }.bind(this));
        };

        ShellHeader.prototype.onAfterRendering = function () {
            this._refresh();
            this.$("icon").one('load', this._refresh.bind(this));

            var shellLayout = this.getShellLayoutControl();
            if (shellLayout) {
                this.$("hdr-center").toggleClass("sapUshellShellAnim", shellLayout.getShowAnimation());
            }
            var oSearchContainerElement = this.$("hdr-search-container");
            if (iSearchMaxWidthValue != iNextSearchMaxWidthValue) {
                //we want to give the search-container display:none in order to prevent getting to the element in acc (in COL state)
                if (this.getSearchState() == this.SearchState.COL) {
                    oSearchContainerElement.one('transitionend', function (){
                        jQuery(this).addClass("sapUshellShellSearchHidden");
                    });
                }

                this._setSearchContainerMaxSize(iNextSearchMaxWidthValue, false);
                var searchSizeChangedData = {
                    remSize: this._convertPxToRem(this.getSearchContainerRect(iNextSearchMaxWidthValue).width),
                    isFullWidth: this.isPhoneState()
                };

                this.fireSearchSizeChanged(searchSizeChangedData);
            } else if (this.getSearchState() == this.SearchState.COL) {
                jQuery(oSearchContainerElement).addClass("sapUshellShellSearchHidden");
            }

            // if xRay is enabled
            var oModel = this.getModel();
            // some tests do not assign a Model, check if it is present first
            if (oModel && oModel.getProperty("/enableHelp")) {
                jQuery('#actionsBtn').addClass('help-id-actionsBtn'); // xRay help ID
                jQuery('#configBtn').addClass('help-id-configBtn'); // xRay help ID
                jQuery('#homeBtn').addClass('help-id-homeBtn'); // xRay help ID
            }

            // Optional Fiori 2 Access Key Handler
            this.attachAccessKeyHander(this._accessKeyHandler);
        };

        ShellHeader.prototype.onThemeChanged = function () {
            this.invalidate();
        };

        ShellHeader.prototype._getLogo = function () {
            return this.getLogo() || ThemingParameters._getThemeImage(null, true); // theme logo
        };

        ShellHeader.prototype._handleSearchSizeChanged = function () {
            var actualMaxRemSize;
            if (this.getSearchState() == this.SearchState.COL) {
                return;
            } else if (this.getSearchState() == this.SearchState.EXP) {
                actualMaxRemSize = iSearchMaxWidthValue;
                this._handleExpSearchState(actualMaxRemSize);
            } else if (this.getSearchState() == this.SearchState.EXP_S) {
                actualMaxRemSize = this._handleExpSSearchState();
                this._setSearchContainerMaxSize(actualMaxRemSize);
            }

            var searchSizeChangedData = {
                remSize: this._convertPxToRem(this.getSearchContainerRect(actualMaxRemSize).width),
                isFullWidth: this.isPhoneState()
            };

            this.fireSearchSizeChanged(searchSizeChangedData);

        };

        ShellHeader.prototype._refresh = function () {
            var oUser = this.getUser();

            if (oUser) {
                oUser._refreshImage();
                oUser._checkAndAdaptWidth(!!this.getSearch());
            }

            //we need to save the logo-icon width for the setSearchState since once we hide it we cannot know what is the width
            if (!this.hasStyleClass("sapUshellShellHideLogo")) {
                this._saveLogoWidth();
            }

            this._setMaxWidthForAppTitleAndTitle();
            if (this.getSearchState() != this.SearchState.COL) {
                this._adjustHeaderWithSearch();
            }
            this._saveSearchPhoneStateThreshold();
        };

        ShellHeader.prototype._saveLogoWidth = function () {
            var oLogoJQ = this.$("hdr-begin").find(".sapUshellShellIco");
            if (oLogoJQ) {
                iLogoPaddingLeft = parseInt(oLogoJQ.css("padding-left"),10);
                iLogoPaddingRight = parseInt(oLogoJQ.css("padding-right"),10);
                iLogoSize = this.$("icon")[0].getBoundingClientRect().width;
            }
        };

        ShellHeader.prototype._convertPxToRem = function (pxValue) {
            var remSize = parseFloat(ThemingParameters.get("sapUiFontSize"));
            return pxValue / remSize;
        };

        ShellHeader.prototype._convertRemToPx = function (remValue) {
            var remSize = parseFloat(ThemingParameters.get("sapUiFontSize"));
            return remValue * remSize;
        };

        /**
         * The max-width of the appTitle is calculated to be the maximum available space there is in the hdr-center.
         * In L size - since there could be title (secondary), if the appTile doesn't have the minimum width -> the title (secondary)
         * truncate and after reaching the minimum size it disappears
         * In M size - if the appTile doesn't have the minimum width title can shrink in font size.
         * @private
         */
        ShellHeader.prototype._setMaxWidthForAppTitleAndTitle = function () {
            this._setMaxWidthForAppTitle();
            if (this.isLSize()) {
                this._setMaxWidthForTitle();
            } else {
                this._setAppTitleFontSize();
            }
        };

        /**
         * The max-width of the appTitle is calculate to be the maximum space there is in the hdr-center.
         * @private
         */
        ShellHeader.prototype._setMaxWidthForAppTitle = function () {
            var jqAppTitle = this.$("hdr-appTitle");
            var jqAppTitleSpan = this.$("hdr-appTitle").find(".sapUshellHeadTitle");

            if (!jqAppTitle.length) {
                return;
            }

            //if the font size was change need to return to the default one for the calculation
            //if the max - width was changed need to remove it for the calculation
            jqAppTitleSpan.removeClass('sapUshellHeadTitleWithSmallerFontSize');
            jqAppTitle.css({'max-width': 'none'});

            var iCenterWidth = this._calcCenterWidth();

            var iTitleWidth = 0;

            //if it is L-size and there is a title (secondary) we need to remove the title width from the max-width
            if (this.isLSize()) {
                var jqTitle = this.$("hdr-title");
                if (jqTitle.length) {
                    iTitleWidth = jqTitle[0].getBoundingClientRect().width;
                }
            }
            var iPaddingValue = this.isSSize() ? MIN_PADDING_REM_VALUE_SMALL : MIN_PADDING_REM_VALUE_LARGE;
            var iWidthForAppTitle = this._convertPxToRem(iCenterWidth - iTitleWidth) - 2* iPaddingValue;

            //if there is navigation menu -> need to add it to the min width value of the appTitle (1rem icon + 0.5rem padding)
            var jqNavigationMenu = jqAppTitle.find('.sapUshellShellHeadAction');
            var iAppTitleMinWidthValue = jqNavigationMenu.length ? APP_TITLE_MIN_VALUE + 1.5 : APP_TITLE_MIN_VALUE;

            if (iWidthForAppTitle < iAppTitleMinWidthValue) {
                iWidthForAppTitle = iAppTitleMinWidthValue;
            }

            jqAppTitle.css({
                'max-width': iWidthForAppTitle + "rem"
            });
        };

        /**
         * The function make sure the appTitle is in the center and do not overlapping the hdr-begin or hdr-end.
         * If it is not overlapping the function returns the center width. If the appTitle is overlapping the hdr-begin
         * or hdr-end the function remove from the header-width the max(hdr-begin, hdr-end) from both side
         * @private
         */
        ShellHeader.prototype._calcCenterWidth = function () {
            var appTitle = this.$("hdr-appTitle")[0].getBoundingClientRect();
            var hdrBegin = this.$("hdr-begin")[0].getBoundingClientRect();
            var hdrEnd = this.$("hdr-end")[0].getBoundingClientRect();

            var iCenterWidth;

            if (this._isOverlapping(hdrBegin, appTitle) || this._isOverlapping(appTitle, hdrEnd)) {
                var hdrBeginWidth = hdrBegin.width;
                var hdrEndWidth = hdrEnd.width;
                var hdrWidth = this.$()[0].getBoundingClientRect().width;
                iCenterWidth = hdrWidth - 2 * Math.max(hdrBeginWidth, hdrEndWidth);
            } else {
                var jqCenter = this.$("hdr-center");
                var iCenterWidth = jqCenter[0].getBoundingClientRect().width;
            }

            return iCenterWidth;
        };

        /**
         * If the title is overlapping the apptitle we reduce the max-width of the title and if it too small we remove it
         * @private
         */
        ShellHeader.prototype._setMaxWidthForTitle = function () {
            var jqTitle = this.$("hdr-title");

            if (!jqTitle.length) {
                return;
            }
            jqTitle.css({
                'max-width': TITLE_MAX_WIDTH_VALUE + "rem",
                'opacity': 1
            });

            var jqAppTitle = this.$("hdr-appTitle");

            //in case there is no appTitle the max-width do not need to be change
            if (!jqAppTitle || !jqAppTitle[0]) {
                return;
            }

            var iRemoveFromTitle = this._isOverlapping(jqTitle[0].getBoundingClientRect(),jqAppTitle[0].getBoundingClientRect(),MIN_PADDING_REM_VALUE_LARGE, false);
            if (iRemoveFromTitle) {
                var iTitleWidth = jqTitle[0].getBoundingClientRect().width;
                var iTitleMaxWidth = this._convertPxToRem(iTitleWidth- iRemoveFromTitle);
                if (iTitleMaxWidth < TITLE_MIN_VALUE) {
                    jqTitle.css({'opacity': 0});
                } else {
                    jqTitle.css({'max-width': iTitleMaxWidth + "rem"});
                }
            }
        };

        /**
         * In case we are in M size -> if there is not enought space for the App title (i.e -> it is trunced)
         * The font size should be change to a smaller font size
         * @private
         */
        ShellHeader.prototype._setAppTitleFontSize = function () {
            var oAppTitleJQ = this.$("hdr-appTitle").find(".sapUshellHeadTitle");
            if (oAppTitleJQ && oAppTitleJQ[0]) {
                var iScrollWidth = oAppTitleJQ[0].scrollWidth;
                var iClientWidth = oAppTitleJQ[0].clientWidth;
                if (iScrollWidth > iClientWidth) {
                    oAppTitleJQ.addClass('sapUshellHeadTitleWithSmallerFontSize');
                }
            }
        };

        /**
         * When the search is open (EXP or EXP_S) need to check if the search is ovelapping the appTitle
         * and if so need to adjust the apptitle max-width
         * @param newMaxWidthProperty - if the function is called after updating the max-width of the search-container,
         * since the property is changing in animation need to pass the new max-width value. If the function is called from
         * the refresh() function no need to pass this value
         * @private
         */
        ShellHeader.prototype._adjustHeaderWithSearch = function (newMaxWidthProperty) {
            var jqAppTitle = this.$("hdr-appTitle");
            if (!jqAppTitle.length || jqAppTitle.css('opacity') == "0" || jqAppTitle.css('display') == "none") {
                return;
            }

            var appTitleRect = jqAppTitle[0].getBoundingClientRect();
            var searchContainerRect;
            /* since the search-container max-width property is changing in an animation the width might not be updated yet.
             therfore we are using a "temp" div that simulate the search-container after the animation is done */
            if (newMaxWidthProperty) {
                searchContainerRect = this.getSearchContainerRect(newMaxWidthProperty);
            } else {
                var jqSearchContainer = this.$("hdr-search-container");
                searchContainerRect = this.getSearchContainerRect(parseFloat(jqSearchContainer.get(0).style.maxWidth));
            }

            var iOverlappingSearchOnAppTitle = this._isOverlapping(appTitleRect, searchContainerRect, MIN_PADDING_REM_VALUE_SMALL_FOR_SEARCH, true);
            if (!iOverlappingSearchOnAppTitle) {
                return;
            } else if (iOverlappingSearchOnAppTitle) {
                var iAppTitleWidth = appTitleRect.width;
                jqAppTitle.css({
                    'max-width': this._convertPxToRem(iAppTitleWidth - iOverlappingSearchOnAppTitle) + "rem"
                });

            }
        };

        ShellHeader.prototype.setAppTitle = function (oAppTitle) {
            oAppTitle.attachTextChanged(this._handleAppTitleChange, this);
            this.setAggregation("appTitle", oAppTitle, true);
        };

        ShellHeader.prototype.removeAppTitle = function (oAppTitle) {
            oAppTitle.detachedTextChanged(this._handleAppTitleChange);
            this.removeAggregation("appTitle");
        };

        ShellHeader.prototype._handleAppTitleChange = function () {
            if (!this.getDomRef()) {
                return;
            }
            if (this.getSearchState() != this.SearchState.COL) {
                this._setMaxWidthForAppTitleAndTitle();
                this._handleSearchSizeChanged();
            }
        };

        ShellHeader.prototype.setTitleControl = function (sTitle, oInnerControl) {
            this.oTitle = this.oTitle || sap.ui.getCore().byId("shellTitle");
            if (this.oTitle) {
                this.oTitle.destroy();
            }
            this.oTitle = new ShellTitle("shellTitle", {
                text: sTitle,
                icon: IconPool.getIconURI("overflow")
            });
            this.oTitle.setInnerControl(oInnerControl);
            this.setTitle(this.oTitle);
        };

        ShellHeader.prototype.removeHeadItem = function (vItem) {
            if (typeof vItem === 'number') {
                vItem = this.getHeadItems()[vItem];
            }
            this.removeAggregation('headItems', vItem);
        };

        ShellHeader.prototype.addHeadItem = function (oItem) {
            this.addAggregation('headItems', oItem);
        };

        ShellHeader.prototype.isPhoneState = function () {
            var deviceType = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name;
            var bEnoughSpaceForSearch = true;
            var iHeaderWidth =  this.$().width();
            if (iHeaderWidth <= iSearchPhoneStateThreshold) {
                bEnoughSpaceForSearch = false;
            }
            return (Device.system.phone || deviceType == "Phone" || !bEnoughSpaceForSearch);
        };

        ShellHeader.prototype.isLSize = function () {
            var deviceRange = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name;
            return (deviceRange == "Desktop");
        };

        ShellHeader.prototype.isSSize = function () {
            var deviceRange = Device.media.getCurrentRange(Device.media.RANGESETS.SAP_STANDARD).name;
            return (Device.system.phone || deviceRange == "Phone");
        };

        ShellHeader.prototype.getSearchContainerRect = function (iMaxWidthRem) {
            //since the width is known only when the max-width animition ended we add a temporary div and get the width from it.
            var jqTempDiv = jQuery("<div> </div>").css("max-width", iMaxWidthRem + "rem");
            var jqTempWrapperDiv = jQuery("<div></div>").append(jqTempDiv).insertAfter(this.$("hdr-search-container"));
            jqTempDiv.addClass('sapUshellShellSearch');
            var tempDivRect = jqTempDiv[0].getBoundingClientRect();
            jqTempWrapperDiv.remove();
            return tempDivRect;
        };

        /**
         *
         * @param sStateName -
         * {ShellHeader.SearchState} [sStateName]
         *   The search state to be set.
         *   The validate values are - COL, EXP, EXP_S
         * @param {string} [maxRemSize]
         *  The required max width in rem
         *  @param {boolean} [bWithOverlay]
         *  If the state is EXP the overlay appears according to this parameter (the default is true)
         */
        ShellHeader.prototype.setSearchState = function (sStateName, maxRemSize, bWithOverlay) {
            if (typeof sStateName !== "string" || !this.SearchState.hasOwnProperty(sStateName)) {
                //throw exp
                return;
            }
            this.requiredRemSize = maxRemSize;
            this.setProperty('searchState', sStateName, false);
            var actualMaxRemSize;
            if (sStateName === this.SearchState.COL) {
                actualMaxRemSize = this._handleColSearchState(true);
            } else if (sStateName === this.SearchState.EXP) {
                this.bWithOverlay = (bWithOverlay === false) ? false : true;  // undefined -> true
                actualMaxRemSize = this._handleExpSearchState(maxRemSize, true);
            } else if (sStateName == this.SearchState.EXP_S) {
                this.bWithOverlay = (bWithOverlay === true) ? true : false;  // undefined -> false                
                actualMaxRemSize = this._handleExpSSearchState(maxRemSize, true);
            }

            this._setSearchContainerMaxSize(actualMaxRemSize, true);
        };

        /**
         * returns the current available size in the header without hiding any elements
         */
        ShellHeader.prototype.getSearchAvailableSize = function () {
            var availableSizeToAppTitle = this._convertPxToRem(this._getSizeToAppTitle());
            var searchAvailableSize = availableSizeToAppTitle - this._getMinPaddingRemSize();
            return (searchAvailableSize >= 0 ? searchAvailableSize : 0) ;
        };

        ShellHeader.prototype._getSizeToAppTitle = function () {
            var oCenterJQ = this.$("hdr-center");
            var oCenterElement = oCenterJQ[0];
            var oAppTitleJQ = this.$("hdr-appTitle").find(".sapUshellAppTitle");
            var oAppTitleElement = oAppTitleJQ[0];
            var iMaximumSizeToAppTitle;
            if (this._rtl) {
                iMaximumSizeToAppTitle = oAppTitleElement ? oAppTitleElement.getBoundingClientRect().left - oCenterElement.getBoundingClientRect().left : this._getSizeToTitle();
            } else {
                iMaximumSizeToAppTitle = oAppTitleElement ? oCenterElement.getBoundingClientRect().right - oAppTitleElement.getBoundingClientRect().right : this._getSizeToTitle();
            }

            return iMaximumSizeToAppTitle;
        };

        ShellHeader.prototype._getSizeToTitle = function () {
            var oCenterJQ = this.$("hdr-center");
            var oCenterElement = oCenterJQ[0];
            var oTitleJQ = this.$("hdr-title").find(".sapUshellHeadTitle");
            var oTitleElement = oTitleJQ[0];
            var iMaximumSizeToTitle;
            if (this._rtl) {
                iMaximumSizeToTitle = oTitleElement ? oTitleElement.getBoundingClientRect().left - oCenterElement.getBoundingClientRect().left : this._getSizeToLogo();
            } else {
                iMaximumSizeToTitle = oTitleElement ? oCenterElement.getBoundingClientRect().right - oTitleElement.getBoundingClientRect().right : this._getSizeToLogo();
            }
            return iMaximumSizeToTitle;
        };

        ShellHeader.prototype._getSizeToLogo = function () {
            var oCenterJQ = this.$("hdr-center");
            var oCenterElement = oCenterJQ[0];
            var oCenterElementWidth = oCenterElement.getBoundingClientRect().width + this._getSearchButtonWidth();
            var oLogoJQ = this.$("hdr-begin").find(".sapUshellShellIco");
            var oLogoElement = oLogoJQ[0];
            var bLogoHidden = false;
            if (this.hasStyleClass("sapUshellShellHideLogo")) {
                bLogoHidden = true;
            }
            //if the logo was already hidden (due to search opening) -> need to remove from the center width the logoWidth + the left padding
            if (oLogoElement && bLogoHidden) {
                var iLogoPadding = this._rtl ? iLogoPaddingRight : iLogoPaddingLeft;
                return oCenterElementWidth - iLogoSize - iLogoPadding;
            } else {
                //need to add the logo right padding since it is not part of the center
                var iLogoPadding = this._rtl ? iLogoPaddingLeft : iLogoPaddingRight;
                return oCenterElementWidth + iLogoPadding;
            }
        };

        ShellHeader.prototype._getMaxSize = function () {
            var oCenterJQ = this.$("hdr-center");
            var oCenterElement = oCenterJQ[0];
            var oLogoJQ = this.$("hdr-begin").find(".sapUshellShellIco");
            var oLogoElement = oLogoJQ[0];
            var bLogoHidden = false;
            if (this.hasStyleClass("sapUshellShellHideLogo")) {
                bLogoHidden = true;
            }
            var iSavedLogoSize;
            if (oLogoElement && !bLogoHidden) {
                var iLogoPadding = this._rtl ? iLogoPaddingLeft : iLogoPaddingRight;
                iSavedLogoSize = iLogoSize + iLogoPadding;
            } else {
                iSavedLogoSize = 0;
            }
            var iMaxSize = oCenterElement.getBoundingClientRect().width + this._getSearchButtonWidth() + iSavedLogoSize;
            return iMaxSize;
        };

        //if the search button is not yet invisible -> need to add the button width to the center container
        ShellHeader.prototype._getSearchButtonWidth = function () {
            var oSearchButtonElement = this.getHeadEndItems()[0];
            if (oSearchButtonElement && oSearchButtonElement.getVisible()) {
                var oSearchButtonElementDom = oSearchButtonElement.getDomRef();
                var iSearchButtonWidth = oSearchButtonElementDom.getBoundingClientRect().width;
                return iSearchButtonWidth;
            }
            return 0;
        };

        ShellHeader.prototype._handleColSearchState = function (stateChanged) {
            var shellLayout = this.getShellLayoutControl();
            if (shellLayout) {
                shellLayout.removeStyleClass(sSearchOverlayCSS);
            }

            this.removeStyleClass(sSearchOverlayCSS);
            this.removeStyleClass("sapUshellShellHideLogo");
            this.removeStyleClass("sapUshellShellHideSubtitle");
            this.removeStyleClass("sapUshellShellHideAppTitle");

            if (this.isPhoneState()) {
                return this._handleColSearchStatePhone();
            }

            return 0;
        };

        /* When we are in the EXP search state, there are some element in the header that should be hidden according to the search-container max-size.
         The appTitle is hidden if the distance of the search-container from the appTitle is smaller then MIN_PADDING_REM_VALUE.
         The title and the appTitle is hidden if the distance of the search-container from the title is smaller then MIN_PADDING_REM_VALUE.
         The logo, the title and the appTitle is hidden if the distance of the search-container from the logo is smaller then MIN_PADDING_REM_VALUE.
         Any other elements should not be hidden.
         If we are in small size (phone state) -> the search-container gets the size of the whole header (100%)

         The return value will be the actual size the search-container gets or the required size if we are in small size (phone state)
         */
        ShellHeader.prototype._handleExpSearchState = function (requiredMaxRemSize, stateChanged) {

            var shellLayout = this.getShellLayoutControl();
            if (shellLayout) {
                shellLayout.toggleStyleClass(sSearchOverlayCSS, this.bWithOverlay);
            }
            this.toggleStyleClass(sSearchOverlayCSS, this.bWithOverlay);            

            if (this.isPhoneState()) {
                this._handleExpAndExpSSearchStatePhone();
                return requiredMaxRemSize;
            } else {
                return this._handleExpSearchStateLargeScreen(requiredMaxRemSize, stateChanged);
            }
        };

        ShellHeader.prototype._handleExpSearchStateLargeScreen = function (requiredMaxRemSize, stateChanged) {
            var actualMaxRemSize;

            this.removeStyleClass("sapUshellShellHideForPhone");

            var iMaximumSizeInRem = this._convertPxToRem(this._getMaxSize());
            var iMaximumSizeToTileInRem = this._convertPxToRem(this._getSizeToTitle());
            var iMaximumSizeToAppTitleInRem = this._convertPxToRem(this._getSizeToAppTitle());
            var iMaximumSizeToLogoInRem = this._convertPxToRem(this._getSizeToLogo());

            if (requiredMaxRemSize > iMaximumSizeInRem) {
                this.addStyleClass("sapUshellShellHideLogo");
                this.addStyleClass("sapUshellShellHideSubtitle");
                this.addStyleClass("sapUshellShellHideAppTitle");
                actualMaxRemSize = iMaximumSizeInRem;
            } else if (requiredMaxRemSize > iMaximumSizeToLogoInRem - this._getMinPaddingRemSize()) {
                this.addStyleClass("sapUshellShellHideLogo");
                this.addStyleClass("sapUshellShellHideSubtitle");
                this.addStyleClass("sapUshellShellHideAppTitle");
                actualMaxRemSize = requiredMaxRemSize;

            } else if (requiredMaxRemSize > iMaximumSizeToTileInRem - this._getMinPaddingRemSize()) {
                this.addStyleClass("sapUshellShellHideSubtitle");
                this.addStyleClass("sapUshellShellHideAppTitle");
                this.removeStyleClass("sapUshellShellHideLogo");
                actualMaxRemSize = requiredMaxRemSize;
            } else if (requiredMaxRemSize > iMaximumSizeToAppTitleInRem - this._getMinPaddingRemSize()) {
                this.addStyleClass("sapUshellShellHideAppTitle");
                this.removeStyleClass("sapUshellShellHideSubtitle");
                this.removeStyleClass("sapUshellShellHideLogo");
                actualMaxRemSize = requiredMaxRemSize;
            } else {
                this.removeStyleClass("sapUshellShellHideAppTitle");
                this.removeStyleClass("sapUshellShellHideSubtitle");
                this.removeStyleClass("sapUshellShellHideLogo");
                actualMaxRemSize = requiredMaxRemSize;
            }
            return actualMaxRemSize;
        };

        /* When we are in the EXP_S search state, no element in the header should be hidden
         The search-container max-size is calculate according to the maximum space there is that will not hide the elements in the header
         */
        ShellHeader.prototype._handleExpSSearchState = function (requiredMaxRemSize, stateChanged) {
            var shellLayout = this.getShellLayoutControl();
            if (shellLayout) {
                shellLayout.toggleStyleClass(sSearchOverlayCSS, this.bWithOverlay);
            }
            this.toggleStyleClass(sSearchOverlayCSS, this.bWithOverlay);
            if (this.isPhoneState()) {
                this._handleExpAndExpSSearchStatePhone();
                return requiredMaxRemSize;
            } else {
                var actualMaxRemSize = this._handleExpSSearchStateLargeScreen(requiredMaxRemSize, stateChanged);
                if (actualMaxRemSize > this.requiredRemSize) {
                    actualMaxRemSize = this.requiredRemSize;
                }
                return actualMaxRemSize;
            }
        };

        ShellHeader.prototype._handleExpSSearchStateLargeScreen = function (requiredMaxRemSize, stateChanged) {
            var actualMaxRemSize;
            this.removeStyleClass("sapUshellShellHideForPhone");

            var iMaximumSizeInRem = this._convertPxToRem(this._getSizeToAppTitle());
            if (iMaximumSizeInRem - this._getMinPaddingRemSize() < MIN_REM_VALUE_FOR_SEARCH_CONTAINER_SIZE) {
                iMaximumSizeInRem = MIN_REM_VALUE_FOR_SEARCH_CONTAINER_SIZE  + this._getMinPaddingRemSize();
            }
            if (!requiredMaxRemSize) {
                requiredMaxRemSize = iMaximumSizeInRem;
            }

            if (requiredMaxRemSize > iMaximumSizeInRem -  this._getMinPaddingRemSize()) {
                actualMaxRemSize = iMaximumSizeInRem -  this._getMinPaddingRemSize();
            } else {
                actualMaxRemSize = requiredMaxRemSize;
            }

            this.removeStyleClass("sapUshellShellHideLogo");
            this.removeStyleClass("sapUshellShellHideSubtitle");
            this.removeStyleClass("sapUshellShellHideAppTitle");
            return actualMaxRemSize;
        };

        ShellHeader.prototype._handleExpAndExpSSearchStatePhone = function () {
            this.addStyleClass("sapUshellShellHideForPhone");
        };

        ShellHeader.prototype._handleColSearchStatePhone = function () {
            this.removeStyleClass("sapUshellShellHideForPhone");
            return 0;
        };

        ShellHeader.prototype._setSearchContainerMaxSize = function (actualMaxRemSize, stateChanged) {
            if (!stateChanged) {
                var oSearchContainerElement = this.$("hdr-search-container");
                oSearchContainerElement.css( "max-width", actualMaxRemSize + "rem" );

                iSearchMaxWidthValue = iNextSearchMaxWidthValue = actualMaxRemSize;
            } else {
                iNextSearchMaxWidthValue = actualMaxRemSize;
            }
            this._adjustHeaderWithSearch(actualMaxRemSize);
        };


        /*The function return the minimum distance we want to keep between the search container and the closet header element (title, appTitle or logo)
          If there is enough space (meaning the distance to the appTitle is at least 6rem, the return value will be 3rem, else the return value will be 0.5rem
         */
        ShellHeader.prototype._getMinPaddingRemSize = function () {
           if (this._convertPxToRem(this._getSizeToAppTitle()) < MIN_REM_VALUE_FOR_SEARCH_CONTAINER_SIZE) {
               return MIN_PADDING_REM_VALUE_SMALL_FOR_SEARCH;
           } else {
               return MIN_PADDING_REM_VALUE_LARGE;
           }
        };

        /*
        If there is no enough space for the search container (MIN_REM_VALUE_FOR_SEARCH_CONTAINER_SIZE) we will be at phone-state
        (no header elements except search-container).
        We need to save the phone-state threshold to indicate in resize if we need to exit this state
         */
        ShellHeader.prototype._saveSearchPhoneStateThreshold = function () {
            if (this.hasStyleClass("sapUshellShellHideForPhone")) {
                return;
            }
            var iSearchAvailableSize = this.getSearchAvailableSize();
            if (iSearchAvailableSize == 0) {
                iSearchAvailableSize = -MIN_PADDING_REM_VALUE_SMALL_FOR_SEARCH;
            }

            //check if we can truncate the appTitle (up to it minimum value)
            var iMaxRemToRemoveFromAppTitle = this._maxRemToRemoveFromAppTitle();
            if (iSearchAvailableSize + iMaxRemToRemoveFromAppTitle < MIN_REM_VALUE_FOR_SEARCH_CONTAINER_SIZE) {
                var iHeaderWidth =  this.$().width();
                iSearchPhoneStateThreshold = iHeaderWidth + this._convertRemToPx(MIN_REM_VALUE_FOR_SEARCH_CONTAINER_SIZE - iSearchAvailableSize - iMaxRemToRemoveFromAppTitle);
            }
            return iSearchPhoneStateThreshold;

        };

        /*
         return how much rem we can truncate from the appTitle in order to keep the minimum width value.
         */
        ShellHeader.prototype._maxRemToRemoveFromAppTitle = function () {
            var jqAppTitle = this.$("hdr-appTitle");
            var jqAppTitleSpan = jqAppTitle.find(".sapUshellHeadTitle");

            if (!jqAppTitle.length || !jqAppTitleSpan.length) {
                return 0;
            }

            var iAppTitleWidth = this._convertPxToRem(jqAppTitleSpan[0].getBoundingClientRect().width);
            var iMaxRemToRemove = (iAppTitleWidth - APP_TITLE_MIN_VALUE) > 0 ? (iAppTitleWidth - APP_TITLE_MIN_VALUE) : 0;
            return iMaxRemToRemove;
        };

        /**
         * The function checks if 2 header elements are overlapping. If the elements overlapping each other the function return
         * in how much px the elements overlapping each other. If not the function return 0
         * @param firstElementRect - the first element rect from the left (in rtl the first element from the right)
         * @param jqSecondElement - the second element rect from the left (in rtl the second element from the right)
         * @param iPaddingInRem - the padding value in rem, if there is s need to keep padding value between the elements
         * @param bPaddingAddToFirst - is set to true if the padding is added to the first element or the second one
         * @private
         */
        ShellHeader.prototype._isOverlapping = function (firstElementRect, secondElementRect, iPaddingInRem, bPaddingAddToFirst) {
            if (!iPaddingInRem) {
                iPaddingInRem = 0;
            }

            if (this._rtl) {
                var jqFirstElementLeft =  firstElementRect.left;
                var jqSecondElementRight = secondElementRect.right;
                if (bPaddingAddToFirst) {
                    //we want to add the padding to the first element and since we are in rtl -> the padding is removed from the left side of the first element
                    jqFirstElementLeft = jqFirstElementLeft - this._convertRemToPx(iPaddingInRem);
                } else {
                    jqSecondElementRight = jqSecondElementRight + this._convertRemToPx(iPaddingInRem);
                }
                if (jqFirstElementLeft < jqSecondElementRight) {
                    return jqSecondElementRight - jqFirstElementLeft;

                }
            } else {
                var jqFirstElementRight = firstElementRect.right;
                var jqSecondElementLeft = secondElementRect.left;
                if (bPaddingAddToFirst) {
                    jqFirstElementRight = jqFirstElementRight + this._convertRemToPx(iPaddingInRem);
                } else {
                    //we want to add the padding to the second element -> the padding is remove from the left side of the second element
                    jqSecondElementLeft = jqSecondElementLeft - this._convertRemToPx(iPaddingInRem);
                }
                if (jqSecondElementLeft < jqFirstElementRight) {
                    //check if also overlapping horizonall.


                    //this if is new, it also takes in considaration the top and buttom, that what this is missing in this function
                    if (firstElementRect.bottom > secondElementRect.top && firstElementRect.bottom < secondElementRect.bottom) {
                        return jqFirstElementRight - jqSecondElementLeft;
                    }
                }
            }
            return 0;
        };

        /**
         * get max width of the search field in rem
         * @private
         */
        ShellHeader.prototype.getSearchMaxWidth = function() {
            return iSearchMaxWidthValue;
        };

        return ShellHeader;

    }, true /* bExport */);
