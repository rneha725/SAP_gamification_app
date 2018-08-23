/*!
 * Copyright (c) 2009-2017 SAP SE, All Rights Reserved
 */

/**
 * Initialization Code and shared classes of library sap.ushell.
 */
sap.ui.define([], function () {
	"use strict";

/**
 * SAP library: sap.ushell
 *
 * @namespace
 * @name sap.ushell
 * @public
 */


// library dependencies
// delegate further initialization of this library to the Core
sap.ui.getCore().initLibrary({
	name : "sap.ushell",
	dependencies : ["sap.ui.core","sap.m"],
	types: [
		"sap.ushell.ui.launchpad.ViewPortState",
		"sap.ushell.ui.tile.State",
		"sap.ushell.ui.tile.StateArrow",
		"sap.ushell.components.container.ApplicationType"
	],
	interfaces: [],
	controls: [
		"sap.ushell.components.factsheet.controls.PictureTile",
		"sap.ushell.components.factsheet.controls.PictureViewer",
		"sap.ushell.components.factsheet.controls.PictureViewerItem",
		"sap.ushell.ui.appfinder.AppBox",
		"sap.ushell.ui.footerbar.AboutButton",
		"sap.ushell.ui.footerbar.AddBookmarkButton",
		"sap.ushell.ui.footerbar.ContactSupportButton",
		"sap.ushell.ui.footerbar.EndUserFeedback",
		"sap.ushell.ui.footerbar.HideGroupsButton",
		"sap.ushell.ui.footerbar.JamDiscussButton",
		"sap.ushell.ui.footerbar.JamShareButton",
		"sap.ushell.ui.footerbar.LogoutButton",
		"sap.ushell.ui.footerbar.SettingsButton",
		"sap.ushell.ui.footerbar.UserPreferencesButton",
		"sap.ushell.ui.launchpad.ActionItem",
		"sap.ushell.ui.launchpad.AnchorItem",
		"sap.ushell.ui.launchpad.AnchorNavigationBar",
		"sap.ushell.ui.launchpad.DashboardGroupsContainer",
		"sap.ushell.ui.launchpad.EmbeddedSupportErrorMessage",
		"sap.ushell.ui.launchpad.Fiori2LoadingDialog",
		"sap.ushell.ui.launchpad.GroupHeaderActions",
		"sap.ushell.ui.launchpad.GroupListItem",
		"sap.ushell.ui.launchpad.HeaderTile",
		"sap.ushell.ui.launchpad.LinkTileWrapper",
		"sap.ushell.ui.launchpad.LoadingDialog",
		"sap.ushell.ui.launchpad.Panel",
		"sap.ushell.ui.launchpad.PlusTile",
		"sap.ushell.ui.launchpad.Tile",
		"sap.ushell.ui.launchpad.TileContainer",
		"sap.ushell.ui.launchpad.TileState",
		"sap.ushell.ui.launchpad.ViewPortContainer",
		"sap.ushell.ui.tile.DynamicTile",
		"sap.ushell.ui.tile.ImageTile",
		"sap.ushell.ui.tile.StaticTile",
		"sap.ushell.ui.tile.TileBase"
	],
	elements: [],
	version: "1.56.5",
	extensions: {
		"sap.ui.support" : {
			diagnosticPlugins: [
				"sap/ushell/support/plugins/flpConfig/FlpConfigurationPlugin"
			]
		}
	}
});

/**
 * Denotes states for control parts and translates into standard SAP color codes
 *
 * @enum {string}
 * @public
 * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
 */
sap.ushell.ui.launchpad.ViewPortState = {

	/**
	 * indicates state when only left content is in the viewport
	 * @public
	 */
	Left : "Left",

	/**
	 * Indicates a state that is neutral, e.g. for standard display (Grey color)
	 * @public
	 */
	Center : "Center",

	/**
	 * Alias for "Error"
	 * @public
	 */
	Right : "Right",

	/**
	 * Indicates a state that is negative, e.g. marking an element that has to get attention urgently or indicates negative values (Red color)
	 * @public
	 */
	LeftCenter : "LeftCenter",

	/**
	 * Alias for "Success"
	 * @public
	 */
	CenterLeft : "CenterLeft",

	/**
	 * Indicates a state that is positive, e.g. marking a task successfully executed or a state where all is good (Green color)
	 * @public
	 */
	RightCenter : "RightCenter",

	/**
	 * Alias for "Warning"
	 * @public
	 */
	CenterRight : "CenterRight"

};
/**
 * Denotes states for control parts and translates into standard SAP color codes
 *
 * @enum {string}
 * @public
 * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
 */
sap.ushell.ui.tile.State = {

	/**
	 * Alias for "None"
	 * @public
	 */
	Neutral : "Neutral",

	/**
	 * Indicates a state that is neutral, e.g. for standard display (Grey color)
	 * @public
	 */
	None : "None",

	/**
	 * Alias for "Error"
	 * @public
	 */
	Negative : "Negative",

	/**
	 * Indicates a state that is negative, e.g. marking an element that has to get attention urgently or indicates negative values (Red color)
	 * @public
	 */
	Error : "Error",

	/**
	 * Alias for "Success"
	 * @public
	 */
	Positive : "Positive",

	/**
	 * Indicates a state that is positive, e.g. marking a task successfully executed or a state where all is good (Green color)
	 * @public
	 */
	Success : "Success",

	/**
	 * Alias for "Warning"
	 * @public
	 */
	Critical : "Critical",

	/**
	 * Indicates a state that is critical, e.g. marking an element that needs attention (Orange color)
	 * @public
	 */
	Warning : "Warning"

};
/**
 * The state of an arrow as trend direction indicator, pointing either up or down
 * @private
 *
 * @enum {string}
 * @public
 * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
 */
sap.ushell.ui.tile.StateArrow = {

	/**
	 * The trend direction indicator is invisible
	 * @public
	 */
	None : "None",

	/**
	 * The trend direction indicator points up
	 * @public
	 */
	Up : "Up",

	/**
	 * The trend direction indicator points down
	 * @public
	 */
	Down : "Down"

};
// shared.js is automatically appended to library.js
//
// hiding (generated) types that are marked as @public by default
/**
 * @name sap.ushell.ui.tile.StateArrow
 * @private
 */
/**
 * @name sap.ushell.ui.tile.State
 * @private
 */

/**
 * The application types supported by the embedding container.
 *
 * @since 1.15.0
 * @enum {string}
 * @private
 */
sap.ushell.components.container.ApplicationType = {
	/**
	 * This type represents web applications identified by any uniform resource locator. They
	 * will be embedded into an <code>IFRAME</code>.
	 *
	 * @constant
	 * @default "URL"
	 * @name sap.ushell.components.container.ApplicationType.URL
	 * @since 1.15.0
	 * @type string
	 */
	URL: "URL",
	/**
	 * This type represents applications built with Web Dynpro for ABAP. The embedding
	 * container knows how to embed such applications in a smart way.
	 *
	 * @constant
	 * @default "WDA"
	 * @name sap.ushell.components.container.ApplicationType.WDA
	 * @since 1.15.0
	 * @type string
	 */
	WDA: "WDA",
	/**
	 * This type represents applications embedded via NetWeaver Business Client.
	 * The embedding container knows how to embed such applications in a smart way.
	 *
	 * @constant
	 * @default "NWBC"
	 * @name sap.ushell.components.container.ApplicationType.NWBC
	 * @since 1.19.0
	 * @type string
	 */
	NWBC: "NWBC",
	/**
	 * This type represents transaction applications.
	 * The embedding container knows how to embed such applications in a smart way.
	 *
	 * @constant
	 * @default "TR"
	 * @name sap.ushell.components.container.ApplicationType.TR
	 * @since 1.36.0
	 * @type string
	 */
	TR: "TR",
	/**
	 * This type represents applications embedded via Windows Communication Foundation.
	 * The embedding container knows how to embed such applications in a smart way.
	 *
	 * @constant
	 * @default "WCF"
	 * @name sap.ushell.components.container.ApplicationType.WCF
	 * @since 1.56.0
	 * @type string
	 */
	WCF: "WCF"
};

return sap.ushell;

}, /* bExport= */ true);
