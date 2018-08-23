/**
 * Test/Example for the FLP FloatingContainer feature.
 *
 * This is an implementation of a bootstrap plugin that addresses fiori2 renderer API
 * in order to set the floating container's content and set its visibility.
 *
 * Main functionality:
 *  - Adding an activation button to the shell header (A HeaderEndItem with id "FloatingContainerButton")
 *    that shows/hides the floating container using the renderer API function setFloatingContainerVisibility
 *  - Creating a sap.m.List (id: "ContentList") that contains the items displayed in the floating container
 *    (NotificationListItems, and a Button)
 *  - A sap.m.Page (id "ContentPage") that contains the list and is the actual UI control that is set as the floating container's content.
 *    and that contains the list.
 *  - The style class listCSSClass is added in order to give ContentPage a background that distinguishes it (visually) from the FLP canvas
 *
 */
sap.ui.define([], function () {
    "use strict";
    /*global jQuery, sap, localStorage, window */
    jQuery.sap.log.debug("PluginLifeCycleWrapper - module loaded");

});
