sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/support/Plugin",
	"sap/ui/core/support/Support",
	"sap/ui/core/format/DateFormat",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/suite/ui/generic/template/support/lib/CommonChecks",
	"sap/suite/ui/generic/template/support/lib/CommonMethods",
	"sap/suite/ui/generic/template/lib/testableHelper"
], function (jQuery, Plugin, Support, DateFormat, JSONModel, MessageToast, CommonChecks, CommonMethods, testableHelper) {
	"use strict";

	// ------------------------------------ Variables ------------------------------------
	var oPlugin,										// plugin reference
		oStub = Support.getStub(),						// support instance for event handling
		sPluginId = "sapUiSupportFioriElementsPlugin",	// plugin id
		sViewId = sPluginId + "-View",					// plugin view id
		aData = [],										// data to display at tool instance
		oEventBus = sap.ui.getCore().getEventBus(), 	// global event bus instance
		sManifestPath,									// relative path to manifest.json
		sAbsoluteManifestURL,							// absolute URL to manifest.json
		sRootPath,										// absolute URL to applications root path
		oManifest,										// current manifest
		oIntervalTrigger,								// interval trigger
		iTimeout = 10,									// time in seconds until tool will show warning when app did not finish rendering
		iTimeLeft;										// time left until warning is shown

	// ------------------------------------ Miscellaneous ------------------------------------
	/**
	 * Returns sPluginId of "SAP Fiori Elements" plugin
	 *
	 * @returns {string} sPluginId
	 */
	var fnGetId = function () {
		return sPluginId;
	};

	/**
	 * Converts date given with format YYYYMMddHHss to users local date format
	 *
	 * @param {string} sTimestamp as timestamp with format YYYYMMddHHss
	 * @returns {string} date converted to users local format
	 */
	var fnFormatDate = function (sTimestamp) {
		var oDateFormat = DateFormat.getDateInstance({
			source: {pattern: "YYYYMMdd"},
			style: "short"
		});
		return oDateFormat.format(oDateFormat.parse(String(sTimestamp).substring(0, 8)));
	};

	/**
	 * Returns absolute URL to manifest.json of current viewed component.
	 *
	 * @param {string} [sId] component id
	 * @returns {string} absolute manifest.json URL
	 */
	var fnGenerateAbsoluteManifestURL = function (sId) {
		var sOrigin = window.location.origin;
		var sPathname = window.location.pathname;
		// If component id is known, use the given ID. Otherwise try to load component ID from application structure.
		var sComponentId = sId || CommonChecks.getComponentIDByStructure();
		if (sComponentId) {
			sManifestPath = CommonChecks.getManifestPath(sComponentId);
			if (sManifestPath) {
				var sManifestURL = CommonChecks.getManifestURL(sOrigin, sPathname, sManifestPath);
				if (sManifestURL) {
					return sManifestURL;
				}
			}
		}
		return "";
	};

	/**
	 * Adds given parameter as object to aData.
	 *
	 * @param {string} sType type of data, "string" or "link" are valid
	 * @param {string} sName name to display
	 * @param {int} iSortOrder index for ascending order, 1 is highest
	 * @param {string} sValue value to display
	 * @param {string} sTarget if type is link, sTarget is the target of the link
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddToData = function (sType, sName, iSortOrder, sValue, sTarget) {
		if (sType === "string") {
			aData.push({order: iSortOrder, name: sName, type: sType, value: sValue});
			return true;
		} else if (sType === "link") {
			aData.push({order: iSortOrder, name: sName, type: sType, value: sValue, target: sTarget});
			return true;
		} else if (sType === "group") {
			aData.push({order: iSortOrder, name: sName, type: sType});
			return true;
		}
		return false;
	};

	/**
	 * Wrapper function for function fnAddToData with sType "string"
	 *
	 * @param {string} sName name to display
	 * @param {int} iSortOrder index for ascending order, 1 is highest
	 * @param {string} sValue value to display
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddStringToData = function (sName, iSortOrder, sValue) {
		return fnAddToData("string", sName, iSortOrder, sValue, "");
	};

	/**
	 * Wrapper function for function fnAddToData with sType "link"
	 *
	 * @param {string} sName name to display
	 * @param {int} iSortOrder index for ascending order, 1 is highest
	 * @param {string} sValue value to display
	 * @param {string} sTarget if type is link, sTarget is the target of the link
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddLinkToData = function (sName, iSortOrder, sValue, sTarget) {
		return fnAddToData("link", sName, iSortOrder, sValue, sTarget);
	};

	/**
	 * Wrapper function for function fnAddToData with sType "group"
	 *
	 * @param {string} sName name to display
	 * @param {int} iSortOrder index for ascending order, 1 is highest
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddGroupHeaderToData = function (sName, iSortOrder) {
		return fnAddToData("group", sName, iSortOrder, "", "");
	};

	/**
	 * Returns manifest read from given app component.
	 *
	 * @param {object} oComponent app component
	 * @returns {object} manifest
	 */
	var fnGetManifestFromAppComponent = function (oComponent) {
		if (!(oComponent && CommonMethods.hasObjectContent(oComponent))) {
			return undefined;
		}
		if (!(oComponent.getMetadata() && CommonMethods.hasObjectContent(oComponent.getMetadata()))) {
			return undefined;
		}
		var oMetadata = oComponent.getMetadata();
		if (!(oMetadata.getManifest() && CommonMethods.hasObjectContent(oMetadata.getManifest()))) {
			return undefined;
		}
		return oMetadata.getManifest();
	};

	/**
	 * Adds error message to aData as single value. All other values will be cleared!
	 *
	 * @param {string} sMessage error message to display
	 */
	var fnDisplayError = function (sMessage) {
		aData = [];
		fnAddStringToData("Error", 0, sMessage);
		fnTriggerSetData();
	};

	// ------------------------------------ Add Data to Model ------------------------------------
	/**
	 * Adds OpenUI5 version info to aData
	 *
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if some version info was added, otherwise false
	 */
	var fnAddVersionInfo = function (iSortOrder) {
		try {
			var oUI5Version = CommonChecks.getUI5VersionInfo();
			if (oUI5Version && CommonMethods.hasObjectContent(oUI5Version)) {
				fnAddStringToData("OpenUI5 Version", iSortOrder, oUI5Version.version + " (built at " + fnFormatDate(oUI5Version.buildTimestamp) + ")");
				return true;
			} else {
				fnAddStringToData("OpenUI5 Version", iSortOrder, "ERROR: OpenUI5 version is not available!");
				return false;
			}
		} catch (ex) {
			fnAddStringToData("OpenUI5 Version", iSortOrder, sap.ui.version + ", detailed UI5 version info is not available! Possible reason: missing file \"sap-ui-version.json\"");
			return true;
		}
	};

	/**
	 * Adds application name (#semanticObject-action) to aData.
	 *
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddApplicationName = function (iSortOrder) {
		var sApplicationName = CommonMethods.getApplicationName(window.location.href);
		if (sApplicationName) {
			fnAddLinkToData("Application URL", iSortOrder, "#" + sApplicationName, window.location.href);
			return true;
		} else {
			fnAddStringToData("Application URL", iSortOrder, "ERROR: Could not extract application name (#semanticObject-action) from URL!");
			return false;
		}
	};

	/**
	 * Adds manifest.json link to aData
	 *
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddManifestLink = function (iSortOrder) {
		if (sManifestPath && sAbsoluteManifestURL) {
			// shorten relative path
			var sShortenedPath = sManifestPath;
			if (sManifestPath.startsWith("./")) {
				sShortenedPath = sManifestPath.substring(2, sManifestPath.length);
			}
			fnAddLinkToData("Manifest", iSortOrder, sShortenedPath, sAbsoluteManifestURL);
			return true;
		} else {
			// can't load manifest.json URL => show error
			fnAddStringToData("Manifest", iSortOrder, "ERROR: Could not generate link to manifest.json! Possible reason: The application did not finish loading or is not a Fiori Elements application.");
			return false;
		}
	};

	/**
	 * Adds Fiori ID to aData.
	 *
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddFioriID = function (iSortOrder) {
		if (!(oManifest)) {
			return false;
		}

		var aFioriIDs = CommonChecks.getRegistrationIDsByManifest(oManifest);
		if (aFioriIDs && Array.isArray(aFioriIDs) && aFioriIDs.length > 0) {
			fnAddStringToData((aFioriIDs.length > 1 ? "Fiori IDs" : "Fiori ID"), iSortOrder, CommonMethods.concatStrings(aFioriIDs));
			return true;
		}
		// Notice: These cases should not appear in productive apps as they must have a Fiori ID. They may lead to
		// misunderstandings on test systems with demo apps, which don't have a Fiori ID.
		/*else if (aFioriIDs && Array.isArray(aFioriIDs) && aFioriIDs.length === 0) {
			fnAddStringToData("Fiori ID", iSortOrder, "ERROR: No Fiori ID found at /sap.fiori/registrationIds in manifest.json! Possible reason: Missing Fiori ID");
		} else {
			fnAddStringToData("Fiori ID", iSortOrder, "ERROR: Path /sap.fiori/registrationIds not found in manifest.json! Possible reason: Invalid manifest.json");
		}*/
		return false;
	};

	/**
	 * Adds application component to aData
	 *
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddApplicationComponent = function (iSortOrder) {
		var sApplicationComponent = CommonChecks.getApplicationComponentByManifest(oManifest);
		if (sApplicationComponent) {
			fnAddStringToData("Application Component (ACH)", iSortOrder, sApplicationComponent);
			return true;
		} else {
			fnAddStringToData("Application Component (ACH)", iSortOrder, "ERROR: Path /sap.app/ach not found in manifest.json! Possible reason: Invalid manifest.json");
			return false;
		}
	};

	/**
	 * Adds application ID to aData
	 *
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddApplicationID = function (iSortOrder) {
		var sApplicationID = CommonChecks.getApplicationIDByManifest(oManifest);
		if (sApplicationID) {
			fnAddStringToData("Application ID", iSortOrder, sApplicationID);
			return true;
		} else {
			fnAddStringToData("Application ID", iSortOrder, "ERROR: Path /sap.app/id not found in manifest.json! Possible reason: Invalid manifest.json");
			return false;
		}
	};

	/**
	 * Adds floorplan component of application to aData
	 *
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddFloorplanComponent = function (iSortOrder) {
		// Load floorplan directly from manifest if possible (better performance)
		if (oManifest) {
			var sFloorplan = CommonChecks.getFloorplanByManifest(oManifest);
		} else {
			sFloorplan = CommonChecks.getFloorplanByStructure();
		}

		if (!CommonChecks.isValidFloorplan(sFloorplan)) {
			sFloorplan = CommonChecks.mFloorplans.UNKNOWN;
		}

		if (sFloorplan === CommonChecks.mFloorplans.UNKNOWN) {
			fnAddStringToData("Floorplan Component (ACH)", iSortOrder, CommonChecks.getTicketComponentForFloorplan(sFloorplan) + " (ERROR: Unknown floorplan! Possible reason: Invalid manifest.json)");
			return false;
		} else {
			fnAddStringToData("Floorplan Component (ACH)", iSortOrder, CommonChecks.getTicketComponentForFloorplan(sFloorplan) + " (" + sFloorplan + ")");
			return true;
		}
	};

	/**
	 * Adds OData service metadata link to aData
	 *
	 * @param {string} sDataSourceName name of data source in manifest
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddODataServiceMetadataLink = function (sDataSourceName, iSortOrder) {
		if (!(oManifest && CommonMethods.hasObjectContent(oManifest))) {
			return false;
		}

		// data source not found in manifest
		if (!(oManifest["sap.app"]
			&& oManifest["sap.app"].dataSources
			&& oManifest["sap.app"].dataSources[sDataSourceName])) {
			fnAddStringToData("OData Service Metadata", iSortOrder, "ERROR: Data source " + sDataSourceName + " not found at /sap.app/dataSources/" + sDataSourceName + " in manifest.json! Possible reason: Invalid manifest.json");
			return false;
		}

		// invalid data source, missing uri
		if (!oManifest["sap.app"].dataSources[sDataSourceName].uri) {
			fnAddStringToData("OData Service Metadata", iSortOrder, "ERROR: Data source URI not found at /sap.app/dataSources/" + sDataSourceName + "/uri in manifest.json! Possible reason: Invalid manifest.json");
			return false;
		}

		// append $metadata to given uri and append link to aData
		var sODataUri = oManifest["sap.app"].dataSources[sDataSourceName].uri;
		if (!sODataUri.endsWith("/")) {
			sODataUri += "/";
		}
		sODataUri += "$metadata";
		fnAddLinkToData("OData Metadata", iSortOrder, sODataUri, window.location.origin + sODataUri);
		return true;
	};

	/**
	 * Adds annotation links to aData
	 *
	 * @param {string} sDataSourceName name of data source in manifest
	 * @param {int} iSortOrder Sorting order index
	 * @returns {boolean} true if successful, otherwise false
	 */
	var fnAddAnnotationsLinks = function (sDataSourceName, iSortOrder) {
		if (!(oManifest && CommonMethods.hasObjectContent(oManifest) && sRootPath)) {
			return false;
		}

		// data source not found in manifest
		if (!(oManifest["sap.app"]
			&& oManifest["sap.app"].dataSources
			&& oManifest["sap.app"].dataSources[sDataSourceName])) {
			fnAddStringToData("Annotations", iSortOrder, "ERROR: Data source " + sDataSourceName + " not found at /sap.app/dataSources/" + sDataSourceName + " in manifest.json! Possible reason: Invalid manifest.json");
			return false;
		}

		// invalid data source, missing annotations
		if (!(oManifest["sap.app"].dataSources[sDataSourceName].settings
			&& oManifest["sap.app"].dataSources[sDataSourceName].settings.annotations
			&& oManifest["sap.app"].dataSources[sDataSourceName].settings.annotations !== [])) {
			fnAddStringToData("Annotations", iSortOrder, "ERROR: Data source " + sDataSourceName + " has no annotations at /sap.app/dataSources/" + sDataSourceName + "/settings/annotations in manifest.json! Possible reason: Invalid manifest.json");
			return false;
		}

		var aDataSourceAnnotations = oManifest["sap.app"].dataSources[sDataSourceName].settings.annotations;
		// reverse array to have priority of annotations descending => Prio. 1 at top
		aDataSourceAnnotations = aDataSourceAnnotations.reverse();

		for (var iKey in aDataSourceAnnotations) {
			if (!aDataSourceAnnotations.hasOwnProperty(iKey)) {
				continue;
			}

			var sSourceName = aDataSourceAnnotations[iKey];
			if (oManifest["sap.app"].dataSources[sSourceName]) {
				var sUri = oManifest["sap.app"].dataSources[sSourceName].uri;

				// skip invalid annotations
				if (!sUri) {
					continue;
				}

				var sPrefix = "";
				var sName = "";
				if (sUri.startsWith("/")) {
					// backend annotations are host-relative
					sName = "Backend Annotation";
					sPrefix = window.location.origin;
				} else if (!sUri.startsWith("/")) {
					// local annotations are path-relative
					sName = "Local Annotation";
					sPrefix = sRootPath;
					if (!sPrefix.endsWith("/")) {
						sPrefix += "/";
					}
				}
				sName += " (Prio. " + parseInt(parseInt(iKey, 10) + 1, 10) + ")";
				fnAddLinkToData(sName, iSortOrder, oManifest["sap.app"].dataSources[sSourceName].uri, sPrefix + oManifest["sap.app"].dataSources[sSourceName].uri);
			}
		}
		return true;
	};

	/**
	 * Adds links to annotations and link to OData service metadata document to aData.
	 *
	 * @param {int} iSortOrder Sorting order index
	 */
	var fnAddDataSources = function (iSortOrder) {
		if (!(oManifest)) {
			return;
		}

		// allow more detailed sorting by doing smaller steps in sorting order
		var fSubSort = 0;
		// increase fSubSort by 0.01 => 99 sub sort steps possible
		// returns "main order" + "sub step"
		function increaseSubSort(iOrder) {
			fSubSort += 0.01;
			return iOrder + fSubSort;
		}

		// check if models are available
		if (!(oManifest["sap.ui5"]
			&& oManifest["sap.ui5"].models)) {
			fnAddStringToData("Data Sources", iSortOrder, "ERROR: Path /sap.ui5/models not found in manifest.json! Possible reason: Invalid manifest.json");
			return;
		}
		var oModels = oManifest["sap.ui5"].models;

		// load data sources
		var aDataSources = [];
		for (var sModelName in oModels) {
			if (!oModels.hasOwnProperty(sModelName)) {
				continue;
			}

			if (oModels[sModelName]
				&& oModels[sModelName].dataSource
				&& oModels[sModelName].dataSource !== "") {

				// check if dataSource is already part of aDataSources
				var bAlreadyContains = false;
				for (var iSourceIndex in aDataSources) {
					if (!aDataSources.hasOwnProperty(iSourceIndex)) {
						continue;
					}

					if (aDataSources[iSourceIndex].dataSource === oModels[sModelName].dataSource) {
						bAlreadyContains = true;
						break;
					}
				}

				// add support for unnamed model of ALP and LR
				var sFormattedName = (sModelName === "" ? "mainService" : sModelName);

				if (!bAlreadyContains) {
					aDataSources.push({models: [sFormattedName], dataSource: oModels[sModelName].dataSource});
				} else {
					// iSourceIndex contains index of last read data source as loop gets interrupted via break when
					// data source is duplicated.
					aDataSources[iSourceIndex].models.push(sFormattedName);
				}
			}
		}

		// check if data sources were found at all
		if (aDataSources.length === 0) {
			fnAddStringToData("Data Sources", iSortOrder, "ERROR: No models with data sources found in manifest.json! Possible reason: Invalid manifest.json");
			return;
		}

		// Loop through data sources, group by data source and add links to OData Service metadata and annotations
		// which are sorted by priority.
		for (var iGroupIndex in aDataSources) {
			if (!aDataSources.hasOwnProperty(iGroupIndex)) {
				continue;
			}

			// no data sources found at all
			if (!(oManifest["sap.app"]
				&& oManifest["sap.app"].dataSources)) {
				fnAddStringToData("Data Sources", iSortOrder, "ERROR: No data sources found at /sap.app/dataSources in manifest.json! Possible reason: Invalid manifest.json");
				return;
			}

			// specific data source not found
			if (!oManifest["sap.app"].dataSources[aDataSources[iGroupIndex].dataSource]) {
				fnAddStringToData("Data Sources", iSortOrder, "ERROR: Data source " + aDataSources[iGroupIndex].dataSource + " not found at /sap.app/dataSources/" + aDataSources[iGroupIndex].dataSource + " in manifest.json! Possible reason: Invalid manifest.json");
				return;
			}

			// add group header and links to data
			fnAddGroupHeaderToData(CommonMethods.concatStrings(aDataSources[iGroupIndex].models), increaseSubSort(iSortOrder));
			fnAddODataServiceMetadataLink(aDataSources[iGroupIndex].dataSource, increaseSubSort(iSortOrder));
			fnAddAnnotationsLinks(aDataSources[iGroupIndex].dataSource, increaseSubSort(iSortOrder));
		}
	};

	// ------------------------------------ Lifecycle & Rendering ------------------------------------
	/**
	 * Returns XML view object with the specified ID if it already exists in the document. Otherwise a new XML view
	 * will be created from XML view DiagnosticsTool for tool instance.
	 *
	 * @param {string} sId view id
	 * @returns {object} XML view
	 */
	var fnGetView = function (sId) {
		var oView = sap.ui.getCore().byId(sId);
		if (oView) {
			return oView;
		} else {
			return sap.ui.xmlview(sId, {
				viewName: "sap.suite.ui.generic.template.support.DiagnosticsTool.view.DiagnosticsTool",
				viewData: {
					plugin: oPlugin
				}
			});
		}
	};

	/**
	 * Creates XML view for tool instance, appends it to the DOM and binds new JSONModel to it.
	 */
	var fnRenderToolInstance = function () {
		var oView = fnGetView(sViewId);
		oView.placeAt(sPluginId);

		var oModel = new JSONModel();
		oView.setModel(oModel, "data");
	};

	/**
	 * Must only be used as workaround! Detects multiple instances of the plugin loaded by different libraries at the
	 * same time and resolves all conflicts by destroying first plugin instance and keeping second plugin instance.
	 *
	 * @param {boolean} bIsToolInstance true if plugin is tool instance
	 */
	function fnSolveConflictsForMultipleInstances(bIsToolInstance) {
		// As the short term solution of this plugin might be a copied version of it in the OVP library, there are
		// scenarios possible, where both libraries get loaded (e.g. ALP with Extension in Testsuite). Therefor it
		// needs to checked whether there is already an instance of this plugin loaded. If so the old instance needs
		// to be removed and every steps of initialisation needs to be reverted
		// => Step 1: reset UI on tool instance
		// => Step 2: remove event listeners
		// => Step 3: save new references

		if (bIsToolInstance) {
			// tool instance

			// Step 1: reset UI on tool instance
			// Plugin instances get initialised multiple times by Support class. That's why the DOM needs to be reset as
			// only one plugin would have been initialised (via DOM manipulation). Also the event listeners for action
			// "click" need to be removed and set again but only one time. Otherwise multiple listeners would be
			// registered and clicking on expand of the panel header would expand and collapse the panel directly afterwards.
			var $Wrapper = jQuery("#" + sPluginId + "-Panel #" + sPluginId + "-Panel");
			if ($Wrapper && $Wrapper.length && $Wrapper.length > 0) {
				var $PanelHeader = jQuery.sap.byId(sPluginId + "-PanelHeader");
				$PanelHeader.off("click");
				$PanelHeader.click(function () {
					var $Handle = $PanelHeader.find("#" + sPluginId + "-PanelHandle");
					var $Content = jQuery.sap.byId(sPluginId + "-PanelContent");
					if ($Handle.hasClass("sapUiSupportPnlHdrHdlClosed")) {
						$Handle.removeClass("sapUiSupportPnlHdrHdlClosed");
						$Content.removeClass("sapUiSupportHidden");
					} else {
						$Handle.addClass("sapUiSupportPnlHdrHdlClosed");
						$Content.addClass("sapUiSupportHidden");
					}
				});
				$Wrapper.replaceWith(jQuery.sap.byId(sPluginId));
			}

			// Step 2: remove event listeners
			// Call onExit function of the old tool instance (only if the function reference is available as global
			// variable) and reset all event listeners.
			if (jQuery.sap.fnExitFioriElementsToolInstance) {
				jQuery.sap.fnExitFioriElementsToolInstance();
			}
			// Step 3: save new references
			jQuery.sap.fnExitFioriElementsToolInstance = fnExit;
		} else {
			// window instance

			// Step 2: remove event listeners
			// Call onExit function of the old window instance (only if the function reference is available as global
			// variable) and reset all event listeners.
			if (jQuery.sap.fnExitFioriElementsWindowInstance) {
				jQuery.sap.fnExitFioriElementsWindowInstance();
			}
			// Step 3: save new references
			jQuery.sap.fnExitFioriElementsWindowInstance = fnExit;
			if (jQuery.sap.oCommonMethodsFioriElementsWindowInstance) {
				CommonMethods.setApplicationStatus(jQuery.sap.oCommonMethodsFioriElementsWindowInstance.getApplicationStatus());
				CommonMethods.setAppComponent(jQuery.sap.oCommonMethodsFioriElementsWindowInstance.getAppComponent());
			}
			jQuery.sap.oCommonMethodsFioriElementsWindowInstance = CommonMethods;
		}
	}

	/**
	 * Initializes the different plugin instances (tool instance & window instance) and triggers the first event
	 * to get corresponding data from window instance. In case of tool instance the view rendering gets started.
	 */
	var fnInit = function () {
		// WORKAROUND: Can be removed as soon as plugin is part of central library. This method solves conflicts when
		// multiple plugins use the same id caused by duplicated plugin loaded from different libraries.
		// TODO: Remove as soon as possible!
		fnSolveConflictsForMultipleInstances(oStub.isToolStub());

		if (oStub.isToolStub()) {
			// tool instance

			// attach event listener for communication between tool and window instance but only if this handler is not
			// already attached from a previous loaded instance of the tool instance.
			if (!oStub.hasListeners(sPluginId + "SetData")) {
				oStub.attachEvent(sPluginId + "SetData", fnOnSetData);
			}
			if (!oStub.hasListeners(sPluginId + "UpdateStatus")) {
				oStub.attachEvent(sPluginId + "UpdateStatus", fnOnUpdateStatus);
			}
			if (!oStub.hasListeners(sPluginId + "ShowDataRefreshed")) {
				oStub.attachEvent(sPluginId + "ShowDataRefreshed", fnOnShowDataRefreshed);
			}

			// make plugin id available to controller
			jQuery.sap.fioriElementsPluginID = sPluginId;

			// initial tool rendering at tool instance
			fnRenderToolInstance();
		} else {
			// window instance

			// attach event listener for communication between tool and window instance but only if this handler is not
			// already attached from a previous loaded instance of the tool instance.
			if (!oStub.hasListeners(sPluginId + "GetData")) {
				oStub.attachEvent(sPluginId + "GetData", fnOnGetData);
			}

			// In the class EventBus is no method available to check whether a function is already attached as event
			// handler like their is hasListeners() from Support class. As a workaround you can detach the event listener
			// before you attach it again. This is only important when the tool instance gets initialised for the second
			// or more time (e.g. after page refresh of tool instance) to avoid duplicate data requests.
			oEventBus.unsubscribe("elements", "ViewRendered", fnHandleBusyState);
			oEventBus.unsubscribe("elements", "ViewRenderingStarted", fnHandleBusyState);

			// attach event listeners for communication between Fiori Elements Framework and application
			oEventBus.subscribe("elements", "ViewRendered", fnHandleBusyState);
			oEventBus.subscribe("elements", "ViewRenderingStarted", fnHandleBusyState);

			// attach event listener for navigation outside of Fiori Elements applications (e.g. Fiori Launchpad)
			if ("onhashchange" in window) {
				jQuery(window).bind("hashchange", fnHandleHashChange);
			}
		}

		// initial data request
		fnOnGetData();
	};

	/**
	 * Deregisters event listeners to avoid duplicate entries.
	 *
	 * @param {object} oSupportStub instance of Support stub
	 */
	var fnExit = function (oSupportStub) {
		oSupportStub = oSupportStub || oStub;
		if (oSupportStub.isToolStub()) {
			// tool instance
			jQuery.sap.fnFEPluginToolInstanceExit = undefined;
			oSupportStub.detachEvent(sPluginId + "SetData", fnOnSetData);
			oSupportStub.detachEvent(sPluginId + "UpdateStatus", fnOnUpdateStatus);
			oSupportStub.detachEvent(sPluginId + "ShowDataRefreshed", fnOnShowDataRefreshed);
			fnGetView(sViewId).destroy();
		} else {
			// window instance
			jQuery.sap.fnFEPluginAppInstanceExit = undefined;
			oSupportStub.detachEvent(sPluginId + "GetData", fnOnGetData);
			oEventBus.unsubscribe("elements", "ViewRendered", fnHandleBusyState);
			oEventBus.unsubscribe("elements", "ViewRenderingStarted", fnHandleBusyState);
			if ("onhashchange" in window) {
				jQuery(window).unbind("hashchange", fnHandleHashChange);
			}
		}
	};

	// ------------------------------------ Event Handling ------------------------------------
	/**
	 * Triggers an event called {plugin id}GetData forcing data update at window instance.
	 */
	var fnTriggerGetData = function () {
		oStub.sendEvent(sPluginId + "GetData", {});
	};

	/**
	 * Triggers an event called {plugin id}SetData causing rerendering at tool instance.
	 */
	var fnTriggerSetData = function () {
		var oModel = new JSONModel();
		// sort aData by property order
		aData.sort(CommonMethods.getDynamicComparator("order"));

		// set time of retrieval
		var sTime = new Date().toLocaleTimeString([], {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		});

		// copy button enabled?
		var bCopyEnabled = true;
		if (!aData || aData.length === 0) {
			bCopyEnabled = false;
		}

		// show warning if application status equals FAILED
		var sApplicationStatus = CommonMethods.getApplicationStatus();
		if (!sApplicationStatus) {
			CommonMethods.setApplicationStatus(CommonMethods.mApplicationStatus.UNKNOWN);
			sApplicationStatus = CommonMethods.mApplicationStatus.UNKNOWN;
		}
		var sMessage = "";
		if (sApplicationStatus === CommonMethods.mApplicationStatus.FAILED) {
			sMessage = "The application did not finish loading or is no Fiori Elements application! The shown data below could be collected anyway. If the application finishes loading, the data will be updated automatically.";
		}

		// update properties for table and current URL/time of retrieval for copy button
		oModel.setData({
			properties: aData,
			url: window.location.href,
			origin: window.location.origin,
			retrieval: sTime,
			copyEnabled: bCopyEnabled,
			status: sApplicationStatus,
			statusMessage: sMessage
		});
		oStub.sendEvent(sPluginId + "SetData", oModel.getJSON());
	};

	/**
	 * Triggers an event called {plugin id}UpdateStatus causing tool instance to update timeout timer.
	 *
	 * @param {int} iTime time left until timeout is triggered
	 * @param {string} sStatus application status of application
	 */
	var fnTriggerUpdateStatus = function (iTime, sStatus) {
		oStub.sendEvent(sPluginId + "UpdateStatus", {timeLeft: iTime, status: sStatus});
	};

	/**
	 * Triggers an event called {plugin id}ShowDataRefreshed causing tool instance to show message toast.
	 */
	var fnTriggerShowDataRefreshed = function () {
		oStub.sendEvent(sPluginId + "ShowDataRefreshed", {});
	};

	/**
	 * Adds content to aData. Requires exact evaluation of current situation before => must only be called by fnOnGetData.
	 *
	 * @private
	 * @param {boolean} bRecoveryMode true if recovery mode is active, otherwise false
	 */
	function addContent(bRecoveryMode) {
		if (sAbsoluteManifestURL) {
			sRootPath = CommonChecks.getRootPath(sAbsoluteManifestURL);
		}

		// clear old data
		aData = [];
		fnTriggerSetData();

		// extract data from core and data about runtime environment
		fnAddVersionInfo(1);
		fnAddApplicationName(2);
		fnAddManifestLink(3);
		fnTriggerSetData();

		if (bRecoveryMode && oManifest && CommonMethods.hasObjectContent(oManifest)) {
			fnAddFioriID(3);
			fnAddApplicationComponent(4);
			fnAddFloorplanComponent(5);
			fnAddDataSources(6);
			fnTriggerSetData();
			fnTriggerShowDataRefreshed();
		} else if (sAbsoluteManifestURL) {
			jQuery.when(
				CommonMethods.getFileFromURI(sAbsoluteManifestURL)
			).done(function (oValue) {
				oManifest = oValue;
				fnAddFioriID(3);
				fnAddApplicationID(4);
				fnAddApplicationComponent(5);
				fnAddFloorplanComponent(6);
				fnAddDataSources(7);
			}).fail(function () {
				fnAddStringToData("Manifest", 3, "ERROR: Could not access manifest.json even though link could be generated! Possible reason: missing permission to access file.");
			}).always(function () {
				fnTriggerSetData();
				fnTriggerShowDataRefreshed();
			});
		}
	}

	/**
	 * Event handler for event {plugin id}GetData when running at window instance. Collects data from running
	 * application and formats it to display in tool instance. Triggers event {plugin id}SetData to render
	 * collected data in tool instance afterwards.
	 */
	var fnOnGetData = function () {
		oManifest = undefined;
		sAbsoluteManifestURL = undefined;
		sRootPath = undefined;
		var sApplicationStatus = CommonMethods.getApplicationStatus();
		var oAppComponent = CommonMethods.getAppComponent();
		var bRecoveryMode = false;

		// default application status is UNKNOWN
		if (!(sApplicationStatus && CommonMethods.isValidApplicationStatus(sApplicationStatus))) {
			sApplicationStatus = CommonMethods.mApplicationStatus.UNKNOWN;
		}

		if (sApplicationStatus === CommonMethods.mApplicationStatus.LOADING) {
			// Scenario: App is still loading => show busy indicator
			fnHandleBusyState();
			return;
		} else if (sApplicationStatus === CommonMethods.mApplicationStatus.FAILED) {
			// Scenario: App failed loading in time
			// app component & manifest are known => use recovery mode (load data from core instance)
			// app component is unknown => cancel data request
			var oResult = fnGetManifestFromAppComponent(oAppComponent);
			if (oResult && CommonMethods.hasObjectContent(oResult)) {
				oManifest = oResult;
				if (oManifest && oManifest["sap.app"] && oManifest["sap.app"].id) {
					sAbsoluteManifestURL = fnGenerateAbsoluteManifestURL(oManifest["sap.app"].id);
					if (!sAbsoluteManifestURL) {
						// Application did not finish loading! Some data could still be collected because corresponding component is known!
						bRecoveryMode = true;
					}
				} else {
					// Application did not finish loading! Some data can still be collected because corresponding component is known!
					bRecoveryMode = true;
				}
			} else {
				// Application did not finish loading! No application specific data can be collected because corresponding component is unknown!
				fnDisplayError("Could not load any data because manifest and component of current application are unknown!");
				fnTriggerShowDataRefreshed();
				return;
			}
		} else if (sApplicationStatus === CommonMethods.mApplicationStatus.RENDERED) {
			// Scenario: App loaded successfully
			// - manifest link is available => load data via AJAX from manifest
			// - manifest link is not available => try to generate link to manifest from manifest or use recovery mode (load data from core instance)
			sAbsoluteManifestURL = fnGenerateAbsoluteManifestURL();
			if (!sAbsoluteManifestURL) {
				oResult = fnGetManifestFromAppComponent(oAppComponent);
				if (oResult && CommonMethods.hasObjectContent(oResult)) {
					oManifest = oResult;
					if (oManifest && oManifest["sap.app"] && oManifest["sap.app"].id) {
						sAbsoluteManifestURL = fnGenerateAbsoluteManifestURL(oManifest["sap.app"].id);
						if (!sAbsoluteManifestURL) {
							// Application did finish loading, but the root path to the application is unknown! Some data could still be collected because corresponding component is known!
							bRecoveryMode = true;
						}
					} else {
						// Application did finish loading, but the root path to the application is unknown! Some data could still be collected because corresponding component is known!
						bRecoveryMode = true;
					}
				} else {
					// Application did not finish loading! No application specific data can be collected because corresponding component is unknown!
					fnDisplayError("Could not load any data because manifest and component of current application are unknown!");
					fnTriggerShowDataRefreshed();
					return;
				}
			}
		} else if (sApplicationStatus === CommonMethods.mApplicationStatus.UNKNOWN) {
			// Scenario: Application status is unknown (can have different reasons, e.g. plugin did not load correctly,
			// library does not trigger events at view rendering, ...)
			if (CommonChecks.getFloorplanByStructure() !== CommonChecks.mFloorplans.UNKNOWN) {
				oManifest = CommonChecks.getManifestByStructure();
				if (oManifest && CommonMethods.hasObjectContent(oManifest)) {
					if (oManifest && oManifest["sap.app"] && oManifest["sap.app"].id) {
						// application state is unknown, but manifest and app id are known. Most of the data can still be collected.
						sAbsoluteManifestURL = fnGenerateAbsoluteManifestURL(oManifest["sap.app"].id);
						if (!sAbsoluteManifestURL) {
							// Application state and link to manifest are unknown, but manifest content is known. Some data can still be collected.
							bRecoveryMode = true;
						}
					} else {
						// Application state is unknown, but manifest content is known. Some data can still be collected.
						bRecoveryMode = true;
					}
				}
			} else {
				// Application state is unknown! No application specific data can be collected because corresponding component is unknown!
				fnDisplayError("Could not load any data because manifest and component of current application are unknown!");
				fnTriggerShowDataRefreshed();
				return;
			}
		}

		addContent(bRecoveryMode);
	};

	/**
	 * Event handler for event {plugin id}SetData when running at tool instance. Updates model which is bound to
	 * tool instances to display data in tool instance. Must not be called directly, use event {plugin id}GetData
	 * instead to refresh data.
	 *
	 * @param {object} oEvent contains data for tool instance
	 */
	var fnOnSetData = function (oEvent) {
		var oModel = new JSONModel();
		oModel.setJSON(oEvent.getParameters());
		var oView = fnGetView(sViewId);
		oView.setModel(oModel, "data");
		// invalidate view to trigger rerendering and apply custom changes
		oView.invalidate();
	};

	/**
	 * Event handler for event {plugin id}UpdateStatus when running at tool instance. Updates time left until
	 * timeout and current application status.
	 *
	 * @param {object} oEvent contains status for tool instance
	 */
	var fnOnUpdateStatus = function (oEvent) {
		var mParameters = oEvent.getParameters();
		fnGetView(sViewId).getController().updateStatus(mParameters.timeLeft, mParameters.status);
	};

	/**
	 * Event handler for event {plugin id}ShowDataRefreshed when running at tool instance. Shows MessageToast to user
	 * which indicates updated data.
	 */
	var fnOnShowDataRefreshed = function () {
		var oView = fnGetView(sViewId);
		oView.getController().showDataRefreshed();
	};

	/**
	 * Interval handler. Manages application status and time left until timeout will be triggered. If still time is
	 * left, tool instance will be updated with new time left. If there is no time left, application status will be set
	 * to FAILED and the plugin will try to get as much data as possible from the app. At tool instance a hint will be
	 * shown that the app timed out.
	 */
	function fnHandleInterval() {
		var sCurrentState = CommonMethods.getApplicationStatus();
		if (iTimeLeft > 0) {
			fnTriggerUpdateStatus(iTimeLeft, sCurrentState);
		} else {
			iTimeLeft = iTimeout;
			CommonMethods.setApplicationStatus(CommonMethods.mApplicationStatus.FAILED);
			fnTriggerUpdateStatus(0, CommonMethods.mApplicationStatus.FAILED);
			oIntervalTrigger.removeListener(fnHandleInterval);
			// Destroying the IntervalTrigger via method .destroy() will lead to an error. Dereferencing is a simple
			// workaround which does work fine.
			oIntervalTrigger = undefined;
			fnOnGetData();
		}
		iTimeLeft--;
	}

	/**
	 * Event handler for handling busy status of tool instance.
	 *
	 * @param {string} sChannel channel the event got published on
	 * @param {string} sEventName name of published event
	 */
	var fnHandleBusyState = function (sChannel, sEventName) {
		// app started loading (triggered by framework) or app is already loading (triggered by plugin at initialisation)
		if (sEventName === "ViewRenderingStarted" || (!sEventName && CommonMethods.getApplicationStatus() === CommonMethods.mApplicationStatus.LOADING)) {
			CommonMethods.setApplicationStatus(CommonMethods.mApplicationStatus.LOADING);
			// Add new timer only if no timer already exists. This gets important if the tool instance becomes reloaded
			// during a running timeout countdown.
			if (!oIntervalTrigger) {
				iTimeLeft = iTimeout;
				oIntervalTrigger = new sap.ui.core.IntervalTrigger(1000);
				oIntervalTrigger.addListener(fnHandleInterval);
			}
		} else if (sEventName === "ViewRendered") {
			// app finished loading (triggered by framework)
			CommonMethods.setApplicationStatus(CommonMethods.mApplicationStatus.RENDERED);
			iTimeLeft = iTimeout;
			if (oIntervalTrigger) {
				oIntervalTrigger.removeListener(fnHandleInterval);
				// Destroying the IntervalTrigger via method .destroy() will lead to an error. Dereferencing is a simple
				// workaround which does work fine.
				oIntervalTrigger = undefined;
			}
			fnOnGetData();
		}
	};

	/**
	 * Event handler for handling hash change in browser window.
	 *
	 * @param {object} oEvent event parameters
	 */
	var fnHandleHashChange = function (oEvent) {

		function getFirstParameterDividingCharacter(sString) {
			for (var i = 0; i < sString.length; i++) {
				if (sString[i] === "/" || sString[i] === "&" || sString[i] === "?" || sString[i] === "~") {
					return i;
				}
			}
			return sString.length;
		}

		function equalsAppNameByHash(sShorterHash, sLongerHash) {
			if (!sShorterHash || !sLongerHash) {
				return false;
			}
			if (sShorterHash === sLongerHash) {
				return true;
			}
			var iShortDivider = getFirstParameterDividingCharacter(sShorterHash);
			var iLongDivider = getFirstParameterDividingCharacter(sLongerHash);
			if (iShortDivider !== iLongDivider) {
				// dividing character is at a different position in both hashes
				return false;
			} else if (sShorterHash.substr(0, iShortDivider) === sLongerHash.substr(0, iLongDivider)) {
				// dividing character is the same position and first parts in front of divider are equal
				return true;
			}
			// dividing character is the same position and first parts in front of divider are not equal
			return false;
		}

		var sOldHash = oEvent.originalEvent.oldURL.split("#")[1],
			sNewHash = oEvent.originalEvent.newURL.split("#")[1],
			bSameApp = false;

		if (sOldHash.length >= sNewHash.length) {
			bSameApp = equalsAppNameByHash(sNewHash, sOldHash);
		} else {
			bSameApp = equalsAppNameByHash(sOldHash, sNewHash);
		}

		if (!bSameApp) {
			CommonMethods.setApplicationStatus(CommonMethods.mApplicationStatus.LOADING);
			CommonMethods.setAppComponent(undefined);
			fnHandleBusyState();
			iTimeLeft = (iTimeout / 2);
		}
	};

	// ------------------------------------ Unit Tests ------------------------------------
	function fnGetSupportStub() {
		return oStub;
	}

	function fnGetData() {
		return aData;
	}

	function fnResetData() {
		aData = [];
	}

	function fnSetManifest(oNewManifest) {
		oManifest = oNewManifest;
	}

	function fnSetManifestURL(sURL) {
		sAbsoluteManifestURL = sURL;
	}

	function fnSetManifestPath(sPath) {
		sManifestPath = sPath;
	}

	function fnSetsRootPath(sPath) {
		sRootPath = sPath;
	}

	/* eslint-disable */
	// Provide access to private methods to helper class testableHelper for unit tests
	// static
	fnFormatDate = testableHelper.testableStatic(fnFormatDate, "DiagnosticsTool_fnFormatDate");
	fnGetManifestFromAppComponent = testableHelper.testableStatic(fnGetManifestFromAppComponent, "DiagnosticsTool_fnGetManifestFromAppComponent");

	// "instance"
	fnAddToData = testableHelper.testableStatic(fnAddToData, "DiagnosticsTool_fnAddToData");
	fnAddStringToData = testableHelper.testableStatic(fnAddStringToData, "DiagnosticsTool_fnAddStringToData");
	fnAddLinkToData = testableHelper.testableStatic(fnAddLinkToData, "DiagnosticsTool_fnAddLinkToData");
	fnAddGroupHeaderToData = testableHelper.testableStatic(fnAddGroupHeaderToData, "DiagnosticsTool_fnAddGroupHeaderToData");
	fnDisplayError = testableHelper.testableStatic(fnDisplayError, "DiagnosticsTool_fnDisplayError");

	fnAddVersionInfo = testableHelper.testableStatic(fnAddVersionInfo, "DiagnosticsTool_fnAddVersionInfo");
	fnAddManifestLink = testableHelper.testableStatic(fnAddManifestLink, "DiagnosticsTool_fnAddManifestLink");
	fnAddApplicationComponent = testableHelper.testableStatic(fnAddApplicationComponent, "DiagnosticsTool_fnAddApplicationComponent");
	fnAddFloorplanComponent = testableHelper.testableStatic(fnAddFloorplanComponent, "DiagnosticsTool_fnAddFloorplanComponent");
	fnAddODataServiceMetadataLink = testableHelper.testableStatic(fnAddODataServiceMetadataLink, "DiagnosticsTool_fnAddODataServiceMetadataLink");
	fnAddAnnotationsLinks = testableHelper.testableStatic(fnAddAnnotationsLinks, "DiagnosticsTool_fnAddAnnotationsLinks");
	fnAddDataSources = testableHelper.testableStatic(fnAddDataSources, "DiagnosticsTool_fnAddDataSources");
	fnAddFioriID = testableHelper.testableStatic(fnAddFioriID, "DiagnosticsTool_fnAddFioriID");
	fnAddApplicationID = testableHelper.testableStatic(fnAddApplicationID, "DiagnosticsTool_fnAddApplicationID");

	// Methods which are only created for unit tests
	fnGetSupportStub = testableHelper.testableStatic(fnGetSupportStub, "DiagnosticsTool_fnGetSupportStub");
	fnGetData = testableHelper.testableStatic(fnGetData, "DiagnosticsTool_fnGetData");
	fnResetData = testableHelper.testableStatic(fnResetData, "DiagnosticsTool_fnResetData");
	fnSetManifest = testableHelper.testableStatic(fnSetManifest, "DiagnosticsTool_fnSetManifest");
	fnSetManifestURL = testableHelper.testableStatic(fnSetManifestURL, "DiagnosticsTool_fnSetManifestURL");
	fnSetManifestPath = testableHelper.testableStatic(fnSetManifestPath, "DiagnosticsTool_fnSetManifestPath");
	fnSetsRootPath = testableHelper.testableStatic(fnSetsRootPath, "DiagnosticsTool_fnSetsRootPath");
	/* eslint-enable */

	// ------------------------------------ Registration ------------------------------------
	/**
	 * The plugin "SAP Fiori Elements" for UI5 Diagnostics Tool exposes ticket relevant information of the currently
	 * running Fiori Elements application to the user.
	 */
	return Plugin.extend("sap.suite.ui.generic.template.support.DiagnosticsTool.DiagnosticsTool", {
		constructor: function (oSupportStub) {
			Plugin.apply(this, [sPluginId, "SAP Fiori Elements", oSupportStub]);
		},
		init: function () {
			// reference needed for controller at tool instance.
			oPlugin = this;
			fnInit();
		},
		exit: fnExit,
		getId: fnGetId,
		onRefresh: fnTriggerGetData
	});
});
