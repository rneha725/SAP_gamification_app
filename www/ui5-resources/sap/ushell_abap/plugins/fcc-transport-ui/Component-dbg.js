sap.ui
		.define(
				[ "sap/ui/core/Component", "sap/ui/Device", "./model/models",
						"sap/ui/fl/transport/TransportDialog" ],
				function(Component, Device, models, TransportDialog) {
					"use strict";

					var bInitialized = false;

					return sap.ui.core.Component
							.extend(
									"sap.ushell_abap.plugins.fcc-transport-ui.Component",
									{

										metadata: {
											manifest: "json"
										},

										/**
										 * The component is initialized by UI5
										 * automatically during the startup of
										 * the app and calls the init method
										 * once.
										 * 
										 * @public
										 * @override
										 */
										init: function() {
											// prevent duplicate instantiation
											if (bInitialized) {
												return;
											}
											bInitialized = true;

											// set the device model
											this.setModel(models
													.createDeviceModel(),
													"device");

											// Create a resource bundle for
											// language specific texts
											var oResourceModel = new sap.ui.model.resource.ResourceModel(
													{
														bundleName: "sap.ushell_abap.plugins.fcc-transport-ui.i18n.i18n"
													});

											// Assign the model object to the
											// SAPUI5 core using the name "i18n"
											sap.ui.getCore().setModel(
													oResourceModel, "i18n");

											// register this with FCC
											var eventBus = sap.ui.getCore()
													.getEventBus();
											eventBus
													.subscribe(
															"sap.fcc.services.siteService",
															"beforeSave",
															function(
																	sChannelId,
																	sEventId,
																	siteService) {
																siteService
																		.doBeforeSave(
																				this.onBeforeSave,
																				this);
															}.bind(this));

										},

										openDialog: function(aMetadata) {
											var def = jQuery.Deferred();
											var result = aMetadata;
											var initPackage = aMetadata.package;
											var initTransport = aMetadata.transport;
											// package label
											var oLabelPackage = new sap.m.Label(
													{
														text: "{i18n>LABEL_TITLE_PACKAGE}",
														layoutData: new sap.ui.layout.form.GridElementData(
																{
																	hCells: "2"
																})
													});
											// package input
											var oInputPackage = new sap.m.Input(
													{
														maxLength: 30,
														layoutData: new sap.ui.layout.form.GridElementData(
																{
																	hCells: "auto"
																}),
														change: function(oEvent) {
															// change package
															// name to uppercase
															aMetadata.package = oEvent
																	.getSource()
																	.getValue()
																	.toUpperCase();
															oEvent
																	.getSource()
																	.setValue(
																			aMetadata.package);

															if (aMetadata.package) {
																if (aMetadata.package === "$TMP") { // local
																	// object
																	aMetadata.transport = "";
																	oButtonOK
																			.setEnabled(false);
																	oComboTransport
																			.setEnabled(false);
																	oComboTransport
																			.setSelectedKey("");
																	return;
																} else { // not
																	// local
																	// object
																	// make
																	// startsWith
																	// work in
																	// IE
																	/*
																	 * eslint
																	 * no-extend-native:
																	 * ["error", {
																	 * "exceptions":
																	 * ["String"] }]
																	 */
																	if (!String.prototype.startsWith) {
																		String.prototype.startsWith = function(
																				searchString,
																				position) {
																			position = position || 0;
																			return this
																					.indexOf(
																							searchString,
																							position) === position;
																		};
																	}
//																	BCP msg: 1770320590: remove all namespace checks
//																 	if entity id has a namespace, package should also have the same namespace
//																	if (aMetadata.id.startsWith("/")) {
//																		var aId = aMetadata.id.split("/");
//																		if (aId.length == 3) {
//																			var sNamespace = "/" + aId[1].toUpperCase() + "/";
//																			if ( !aMetadata.package.startsWith( sNamespace ) ) {
//																				oInputPackage.setValueState(sap.ui.core.ValueState.Error);
//																		        oInputPackage.setValueStateText(sap.ui.getCore().getModel("i18n").getProperty("ERROR_WRONGNAMESPACE"));
//																		        oInputPackage.setEnabled(true);
//																		        oButtonOK.setEnabled(false);
//																		        return;
//																			} // else everything OK
//																			
//																		} else {
//																			//ID already wrong -> may never happen, FCC in charge
//																		}
//																	} else {
//																		// if entity id has no namespace also package must not have one
//																		if (aMetadata.package.indexOf("/") >= 0) {
//																			oInputPackage.setValueState(sap.ui.core.ValueState.Error);
//																	        oInputPackage.setValueStateText(sap.ui.getCore().getModel("i18n").getResourceBundle().getText("ERROR_NAMESPACENOTALLOWED", [aMetadata.id]));
//																	        oInputPackage.setEnabled(true);
//																	        oButtonOK.setEnabled(false);
//																	        return;
//																		}
//																	}	
																	var sRelativeUrl = "/sap/bc/ui2/cdm_fcc/vhtr";
																	var sMethod = "GET";
																	var options = "package="
																			+ aMetadata.package; // /UI2/CDM_DPS//sap-client=010&
																	var oLrepConnector = sap.ui.fl.LrepConnector
																			.createConnector();
																	oLrepConnector
																			.send(
																					sRelativeUrl,
																					sMethod,
																					options,
																					null)
																			.then(
																					function(
																							aMetadata) {
																						var aTransports = [];
																						if (Array
																								.isArray(aMetadata.response.transports)) {
																							for ( var j in aMetadata.response.transports) {
																								var item = aMetadata.response.transports[j];
																								aTransports
																										.push({
																											"transportId": item.transportid,
																											"description": item.description
																										});
																							}
																						} else {
																							var item = aMetadata.response.transports;
																							aTransports
																									.push({
																										"transportId": item.transportid,
																										"description": item.description
																									});
																						}
																						var oModel = new sap.ui.model.json.JSONModel();
																						oModel
																								.setData(aTransports);
																						sap.ui
																								.getCore()
																								.setModel(
																										oModel);
																						oComboTransport
																								.bindItems(
																										"/",
																										new sap.ui.core.ListItem(
																												{
																													key: "{transportId}",
																													text: "{transportId}",
																													additionalText: "{description}"
																												}));
																						aMetadata.transport = oComboTransport
																								.getFirstItem();
																						oComboTransport
																								.setSelectedItem(aMetadata.transport);
																						oComboTransport
																								.fireChangeEvent(aMetadata.transport);
																						oInputPackage
																								.setValueState(sap.ui.core.ValueState.None);
																						oButtonOK
																								.setEnabled(true);
																						oComboTransport
																								.setEnabled(true);
																					},
																					function(
																							error) {
																						jQuery.sap.log
																								.info(JSON
																										.stringify(error));
																						oInputPackage
																								.setEnabled(true);
																						oInputPackage
																								.setValueState(sap.ui.core.ValueState.Error);
																						if (error.code === 500){
																							oInputPackage
																					        .setValueStateText(sap.ui.getCore().getModel("i18n").getProperty("ERROR_HTTP500"));
																						} else if (error.code === 404){
																							oInputPackage
																					        .setValueStateText(sap.ui.getCore().getModel("i18n").getProperty("ERROR_HTTP404"));
																						} else {
																							oInputPackage
																					        .setValueStateText(sap.ui.getCore().getModel("i18n").getProperty("ERROR_REQUESTFAILED"));
																						}
																						oButtonOK
																								.setEnabled(false);
																						oComboTransport
																								.setEnabled(false);
																						oComboTransport
																								.setSelectedKey("");
																					});
																}
															} else { // null,
																// undefinied,
																// ...
																aMetadata.transport = "";
																oComboTransport
																		.setEnabled(false);
																oComboTransport
																		.setSelectedKey("");
															}
														} // input change
													// event handler
													}); // sap.m.input

											// Transport label
											var oLabelTransport = new sap.m.Label(
													{
														text: "{i18n>LABEL_TITLE_TRANSPORT}",
														layoutData: new sap.ui.layout.form.GridElementData(
																{
																	hCells: "2"
																})
													});
											// Transport combobox
											var oComboTransport = new sap.m.ComboBox(
													{
														layoutData: new sap.ui.layout.form.GridElementData(
																{
																	hCells: "auto"
																}),
														showSecondaryValues: true,
														enabled: false,
														items: {
															path: "/",
															template: new sap.ui.core.ListItem(
																	{
																		key: "{transportId}",
																		text: "{transportId}",
																		additionalText: "{description}"
																	})
														},
														change: function(oEvent) {
															aMetadata.transport = oEvent
																	.getSource()
																	.getValue();
															if (aMetadata.transport) {
																oButtonOK
																		.setEnabled(true);
															}
														}
													});

											// batch checkbox
											var oCheckbox = new sap.m.CheckBox(
													{
														selected: false,
														layoutData: new sap.ui.layout.form.GridElementData(
																{
																	hCells: "1"
																}),
														select: function() {
															if (oCheckbox
																	.getSelected()) {
																result.checkboxFlag = true;
															} else {
																result.checkboxFlag = false;
															}
														}
													});

											// checkbox text - used instead of
											// standard checkbox text to enable
											// text wrapping
											var oText = new sap.m.Text(
													{
														text: "{i18n>CHKBOX_TXT_BATCHOBJECTS}",
														tooltip: "{i18n>CHKBOX_TXT_BATCHOBJECTS}",
														wrapping: true,
														layoutData: new sap.ui.layout.form.GridElementData(
																{
																	hCells: "auto"
																})
													});

											var oButtonLO = new sap.m.Button({
												text: "{i18n>BTN_TITLE_LOCALOBJECT}",
												tooltip: "{i18n>BTN_TITLE_LOCALOBJECT}",
												press: function() {
													result.package = "$tmp";
													result.transport = "";
													oDialog.close();
												}
											});

											var oButtonOK = new sap.m.Button({
												text: "{i18n>BTN_TITLE_OK}",
												tooltip: "{i18n>BTN_TITLE_OK}",
												enabled: false,
												press: function() {
													oDialog.close();
												}
											});

											var oButtonCancel = new sap.m.Button(
													{
														text: "{i18n>BTN_TITLE_CANCEL}",
														tooltip: "{i18n>BTN_TITLE_CANCEL}",
														press: function() {
															result.package = initPackage;
															result.transport = initTransport;
															result.cancelClickedFlag = true;
															oDialog.close();
															if (result.operation === "CREATE") {
																var eventBus = sap.ui.getCore().getEventBus();
																eventBus.publish("sap.fcc.services.siteService", "onCancelCreation");
															}
														}
													});

											// fire change event if package
											// provided initially
											if (aMetadata.package) {
												oInputPackage
														.setValue(aMetadata.package);
												oInputPackage.setEnabled(false);
												oButtonLO.setEnabled(false);
												oInputPackage
														.fireChangeEvent(aMetadata.package);
											}

											// // fire change event if package
											// provided initially
											// if(aMetadata.id.startsWith("/"))
											// {
											// oButtonLO.setEnabled(false);
											// }
											// ;

											// Dialog title
											var sDialogTitle = "";
											if (aMetadata.id === ""
													|| aMetadata.type === "") {
												sDialogTitle = "{i18n>DLG_TITLE_DEFAULTNAME}";
											} else {
												// read msg from i18n model
												var oBundle = sap.ui.getCore()
														.getModel("i18n")
														.getResourceBundle();
												
												sDialogTitle = oBundle.getText("DLG_TITLE_" + aMetadata.type.toUpperCase(), [aMetadata.id]);
											}

											// transport dialog
											var oDialog = new sap.m.Dialog(
													{
														title: sDialogTitle,
														resizable: true,
														draggable: true,
														content: [ new sap.ui.layout.form.Form(
																{
																	width: "400px",
																	editable: true,
																	layout: new sap.ui.layout.form.GridLayout(
																			{
																				singleColumn: true
																			}),
																	formContainers: [ new sap.ui.layout.form.FormContainer(
																			{
																				formElements: [
																						new sap.ui.layout.form.FormElement(
																								{
																									label: oLabelPackage,
																									fields: [ oInputPackage ]
																								}),
																						new sap.ui.layout.form.FormElement(
																								{
																									label: oLabelTransport,
																									fields: [ oComboTransport ]
																								}),
																						new sap.ui.layout.form.FormElement(
																								{
																									fields: [
																											oCheckbox,
																											oText ]
																								}) ]
																			}) ]
																}) ], // end
														// of
														// dialog
														// content
														buttons: [ oButtonLO,
																oButtonOK,
																oButtonCancel ],
														afterClose: function() {
															oDialog.destroy();
															def.resolve(result);
														}
													});

											oDialog.open();
											return def.promise();
										},

										onBeforeSave: function(oContent) {

											var that = this;
											return new jQuery.Deferred(
													function(oDeferred) {
														try {
															var oResult = oContent;
															var aMetadata = [];
															// var flags = {
															// "openDialogFlag":
															// false,
															// "checkboxFlag":
															// false,
															// "cancelClickedFlag":false
															// };
															// loop through
															// items in the
															// BATCH array
															for ( var i in oContent.BATCH) {
																var item = oContent.BATCH[i];
																// jQuery.extend(flags,
																// item.metadata);
																aMetadata[i] = {
																	"operation": item.metadata.operation,
																	"id": item.metadata.id,
																	"type": item.metadata.entityType,
																	"package": item.metadata.package,
																	"transport": item.metadata.transportId,
																	"openDialogFlag": false,
																	"checkboxFlag": false,
																	"cancelClickedFlag": false
																};
															} // end of
															// Request
															// payload JSON
															// BATCH loop

															for (var i = 0; i < aMetadata.length; i++) {
																if (aMetadata[i].operation === "CREATE") { // if
																	// operation
																	// =
																	// create,
																	// open
																	// popup
																	// to
																	// get
																	// missing
																	// data
																	aMetadata[i].openDialogFlag = true;
																} else { // if
																	// operation
																	// =
																	// Update/Delete/...
																	if (!aMetadata[i].package) { // if
																		// package
																		// is
																		// empty,
																		// open
																		// transport
																		// popup
																		aMetadata[i].openDialogFlag = true;
																	} else if (aMetadata[i].package
																			.toUpperCase() === "$TMP") { // donot
																		// open
																		// popup
																		// in
																		// case
																		// of
																		// local
																		// object
																		aMetadata[i].openDialogFlag = false;
																	} else if (aMetadata[i].package
																			&& !aMetadata[i].transport) { // if
																		// package
																		// is
																		// not
																		// empty
																		// and
																		// transport
																		// ID
																		// is
																		// empty,
																		// search
																		// for
																		// same
																		// package
																		// name
																		for (var j = 0; j < aMetadata.length; j++) {
																			if (i != j
																					&& aMetadata[i].package === aMetadata[j].package
																					&& aMetadata[j].transport) { // compare
																				// package
																				// with
																				// all
																				// other
																				// packages
																				// in
																				// the
																				// batch,
																				// if
																				// match
																				// found
																				// then
																				// copy
																				// the
																				// corresponding
																				// transport
																				// id
																				aMetadata[i].transport = aMetadata[j].transport;
																				oResult.BATCH[i].metadata.transportId = aMetadata[j].transport;
																				break;
																			} else { // else
																				// open
																				// popup
																				// to
																				// get
																				// missing
																				// data
																				aMetadata[i].openDialogFlag = true;
																			}
																		}
																	} // no
																	// popup
																	// if
																	// both
																	// package
																	// and
																	// transport
																	// id
																	// are
																	// known
																}
															}
															that.processEntry(
																	that,
																	oResult,
																	oDeferred,
																	aMetadata,
																	0);
														} catch (err) {
															oDeferred
																	.reject(err);
														}
													}).promise();

										},
										processEntry: function(that, oResult,
												oDeferred, aMetadata, i) {
											var length = aMetadata.length;
											while (aMetadata[i].openDialogFlag === false) {
												if (i < length - 1) {
													i++;
												} else {
													break;
												}
											}

											if (aMetadata[i].openDialogFlag === true) { // if
												// openDialogFlag
												// is
												// true
												that
														.openDialog(
																aMetadata[i])
														.done(
																function(result) {
																	oResult.BATCH[i].metadata.package = result.package;
																	oResult.BATCH[i].metadata.transportId = result.transport;
																	if (result.checkboxFlag === true
																			&& result.package
																			&& result.cancelClickedFlag === false) { // if
																		// checkbox
																		// checked,
																		// package
																		// is
																		// not
																		// empty,
																		// and
																		// cancel
																		// button
																		// not
																		// clicked
																		if (result.operation === "CREATE"
																				&& result.package
																						.toUpperCase() !== "$TMP") { // if
																			// operation=create
																			// and
																			// package
																			// non
																			// $tmp,
																			// assign
																			// given
																			// package
																			// and
																			// transport
																			// ID
																			// to
																			// all
																			// following
																			// objects
																			// of
																			// same
																			// type
																			// (catalog,
																			// group,
																			// etc.)
																			for (var j = i + 1; j < aMetadata.length; j++) {
																				if (aMetadata[j].type === result.type) {
																					oResult.BATCH[j].metadata.package = result.package;
																					oResult.BATCH[j].metadata.transportId = result.transport;
																					aMetadata[j].openDialogFlag = false;
																				}
																			}
																		} else { // if
																			// operation=update/delete/...,
																			// apply
																			// transport
																			// ID
																			// to
																			// all
																			// objects
																			// in
																			// same
																			// package
																			for (var j = i + 1; j < aMetadata.length; j++) {
																				if (aMetadata[j].package === result.package) {
																					oResult.BATCH[j].metadata.transportId = result.transport;
																					aMetadata[j].openDialogFlag = false;
																				}
																			}
																		}
																	}
																	if (aMetadata[i].cancelClickedFlag === true
																			&& aMetadata.length === 1) {
																		oDeferred
																				.reject(sap.ui
																						.getCore()
																						.getModel(
																								"i18n")
																						.getProperty(
																								"MSG_SINGLECANCEL"));
																	} else if (++i < aMetadata.length) {
																		that
																				.processEntry(
																						that,
																						oResult,
																						oDeferred,
																						aMetadata,
																						i);
																	} else {
																		// fail
																		// promise
																		// in
																		// case
																		// all
																		// popups
																		// were
																		// cancelled
																		var cancelCounter = 0, dialogCounter = 0;
																		for (var j = 0; j < aMetadata.length; j++) {
																			if (aMetadata[j].openDialogFlag === true) {
																				dialogCounter++;
																			}
																			if (aMetadata[j].cancelClickedFlag === true) {
																				cancelCounter++;
																			}
																		}
																		if (dialogCounter === cancelCounter) {
																			oDeferred
																					.reject(sap.ui
																							.getCore()
																							.getModel(
																									"i18n")
																							.getProperty(
																									"MSG_ALLPOPUPSCANCELLED"));
																		} else {
																			oDeferred
																					.resolve(oResult);
																		}

																	}
																}).fail(
																function() {
																});
											}
										}
									});
				});
