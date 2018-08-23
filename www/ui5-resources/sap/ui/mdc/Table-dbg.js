/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"./ResourceModel",
	'sap/ui/mdc/XMLComposite',
	'sap/ui/mdc/internal/table/gridtable/GridTable.controller',
	'sap/ui/mdc/internal/table/responsivetable/ResponsiveTable.controller',
	'sap/ui/mdc/internal/field/Field.controller',
	"sap/m/ListMode",
	'sap/ui/mdc/Field'
], function (ResourceModel, XMLComposite, GridTableController, ResponsiveTableController, FieldController, ListMode) {
	"use strict";

	var GridTableName = "sap.ui.table.Table",
		ResponsiveTableName = 'sap.m.Table';

	var Table = XMLComposite.extend("sap.ui.mdc.Table", {
		metadata: {
			designtime: "sap/ui/mdc/designtime/Table.designtime",
			specialSettings: {
				metadataContexts: {
					defaultValue: "{ model: 'entitySet', path:'',  name: 'entitySet'},{model: 'sap.fe.deviceModel', path: '/', name: 'sap.fe.deviceModel'}, {model: 'entitySet', path:'./@com.sap.vocabularies.UI.v1.LineItem',  name: 'columns'}"
				}
			},
			properties: {
				tableBindingPath: {
					type: "string",
					invalidate: "template"
				},
				type: {
					type: "string",
					defaultValue: "ResponsiveTable",
					invalidate: "template"
				},
				interactionType: {
					type: "string",
					defaultValue: "Inactive",
					invalidate: "template"
				},
				enabled: {
					type: "boolean",
					defaultValue: true,
					invalidate: false
				},
				growingThreshold: {
					type: "string",
					defaultValue: "50",
					invalidate: "template"
				},
				growingScrollToLoad: {
					type: "boolean",
					defaultValue: true,
					invalidate: false
				},
				listBindingName: {
					type: "string",
					invalidate: false
				},
				/**
				 * The demandPopin attribute can be set to true or false depending on whether you want to display columns as popins on the responsive
				 * table
				 */
				demandPopin: {
					type: "boolean",
					group: "Misc",
					defaultValue: false
				},
				showToolbar : {
					type: "boolean",
					defaultValue: true
				},
				selectionMode : {
					type: "string",
					defaultValue: 'None'
				}
			},
			aggregations: {
				columns: {
					type: "sap.ui.mdc.Column",
					multiple: true,
					singularName: "column"
				}
			},
			events: {
				"itemPress": {},
				"callAction": {},
				"requestFailed": {},
				"selectionChange" : {}
			},
			publicMethods: []
		},
		fragment: "sap.ui.mdc.internal.table.Table",
		aggregationFragments: ["columns"]
	});

	var fnInitialize = function () {
		if (!this.bInitialized) {
			this.oTableController.setSelectionMode(this.getSelectionMode());
			this.oTableController.enableDisableActions();
			this.oTableController.bindTableCount();
			this.bInitialized = true;
			this.detachModelContextChange(fnInitialize);
		}
	};


	Table.prototype.init = function () {
		XMLComposite.prototype.init.call(this);

		var oInnerTable = this.getInnerTable(),
			sControlName = oInnerTable.getMetadata().getName();
		if ([GridTableName, ResponsiveTableName].join(" ").indexOf(sControlName) > -1) {
			if (sControlName === GridTableName) {
				this.oTableController = new GridTableController(this);
			} else {
				this.oTableController = new ResponsiveTableController(this);
			}
			this.oFieldController = new FieldController(null, this);
			this.attachModelContextChange(fnInitialize);

		}
	};

	Table.prototype.getInnerTable = function () {
		/*
		 get access to the rendered table - currently it's the second one in the layout. whenever we change the
		 layout we need to adapt this coding. Going upwards to the the view and to access it via ID would take
		 much longer. Any other ideas are welcome
		 */
		return this.get_content();
	};

	Table.prototype.handleDataRequested = function (oEvent) {
		this.oTableController.handleDataRequested(oEvent);
	};

	Table.prototype.handleDataReceived = function (oEvent) {
		this.oTableController.handleDataReceived(oEvent);
	};

	Table.prototype.handleSelectionChange = function (oEvent) {
		this.oTableController.enableDisableActions();

		// TODO: this just forwards the event, we should convert it into a table independent format
		this.fireSelectionChange(oEvent.getParameters());
	};

	Table.prototype.handleItemPress = function (oEvent) {
		this.fireItemPress({listItem: oEvent.getParameter("listItem")});
	};

	Table.prototype.handleCallAction = function (oEvent) {
		this.oTableController.handleCallAction(oEvent);
	};

	Table.prototype.getSelectedContexts = function () {
		var oInnerTable = this.getInnerTable();
		var aSelectedContext = [];
		if (oInnerTable.getMetadata().getName() === GridTableName) {
			var aSeletedIndices = oInnerTable.getSelectedIndices();
			for (var index in aSeletedIndices) {
				aSelectedContext.push(oInnerTable.getContextByIndex(index));
			}
		} else {
			aSelectedContext = oInnerTable.getSelectedContexts();
		}

		return aSelectedContext;
	};

	Table.prototype.getListBinding = function () {
		return this.oTableController.getListBinding();
	};

	Table.prototype.getListBindingInfo = function () {
		return this.oTableController.getListBindingInfo();
	};

	Table.prototype.setShowOverlay = function () {
		this.getInnerTable().setShowOverlay(true);
	};

	Table.prototype.onStandardActionClick = function (oEvent) {
		this.oTableController.onStandardActionClick(oEvent);
	};

	/* Delegate field events to the field controller */
	Table.prototype.onContactDetails = function (oEvent) {
		this.oFieldController.onContactDetails(oEvent);
	};
	Table.prototype.onDraftLinkPressed = function (oEvent) {
		this.oFieldController.onDraftLinkPressed(oEvent);
	};
	Table.prototype.onDataFieldWithIntentBasedNavigationPressed = function (oEvent) {
		this.oFieldController.onDataFieldWithIntentBasedNavigationPressed(oEvent);
	};
	Table.prototype._updateColumnsPopinFeature = function () {
		if (!this.getDemandPopin()) {
			return;
		}

		var aColumns = this.getInnerTable().getColumns();
		if (!aColumns) {
			return;
		}

		// get only visible columns
		aColumns = aColumns.filter(function (col) {
			return col.getVisible();
		});

		// sort columns according to their order property
		aColumns.sort(function (col1, col2) {
			return col1.getOrder() - col2.getOrder();
		});

		var oColumn, iLength = aColumns.length;

		for (var i = 0; i < iLength; i++) {
			oColumn = aColumns[i];
			if (i < 2) { // ensure always two columns
				oColumn.setDemandPopin(false);
				oColumn.setMinScreenWidth("1px");
			} else {
				oColumn.setDemandPopin(true);
				if (oColumn.getPopinDisplay() != "WithoutHeader") {
					oColumn.setPopinDisplay(sap.m.PopinDisplay.Inline);
				}
				oColumn.setMinScreenWidth((i + 1) * 10 + "rem");
			}
		}
	};

	Table.prototype._deactivateColumnsPopinFeature = function () {

		var aColumns = this._oTable.getColumns();
		if (!aColumns) {
			return;
		}

		var oColumn, iLength = aColumns.length;

		for (var i = 0; i < iLength; i++) {
			oColumn = aColumns[i];
			oColumn.setDemandPopin(false);
			oColumn.setMinScreenWidth("1px");
		}
	};

	Table.prototype.setDemandPopin = function (bDemandPopin) {
		var bOldValue = this.getDemandPopin();
		if (bOldValue === bDemandPopin) {
			return;
		}

		this.setProperty("demandPopin", bDemandPopin, true);

		if (this.getType() === "ResponsiveTable") {
			if (bDemandPopin) {
				this._updateColumnsPopinFeature();
			} else {
				this._deactivateColumnsPopinFeature();
			}
		}
	};

	// STATIC HELPER FOR CONTROL TEMPLATE//
	Table._helper = {
		getLineItemCollection: function (oContext, oMetaModel) {
			var sEntitySetPath, sAnnotationPath, oEntitySetContext, oColumnsContext,
				oPresentationVariant, oSelectionPresentationVariant, oWorkingContext;

			if (typeof oContext === "string") {
				// oContext is the (metamodel) path to the entity set
				// TODO: this is not yet implemented, let's finalize the API first
				throw new Error("Not yet implemented");
				//sEntitySet = oContext;
				//oWorkingContext = Table._helper._getWorkingContext(oMetaModel, sEntitySet, undefined);
				//return oMetaModel.getContext(oWorkingContext.lineItemPath);

			} else if (oContext.getModel()  instanceof sap.ui.model.json.JSONModel){
				// oContext model is JSON - we can't guess therefore just return the column context
				return oContext.getObject("/columns");

			} else {
				// oContext is metadataContexts
				oColumnsContext = oContext.getObject("/columns");
				if (oColumnsContext) { //using metadataContexts>annotation
					sAnnotationPath = oColumnsContext.getObject("./@sapui.name");
					oEntitySetContext = oContext.getObject("/entitySet");
					sEntitySetPath = oEntitySetContext.getPath() + "/";
					oColumnsContext = oEntitySetContext.oModel.getMetaContext(sEntitySetPath + sAnnotationPath); //using columnForAnnotations property
					if (sAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.LineItem") >= 0 || oColumnsContext.getObject("$kind") === "EntityType") {
						return oColumnsContext;
					} else if (sAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.PresentationVariant") >= 0) {
						oPresentationVariant = oColumnsContext.getObject();
						oWorkingContext = Table._helper._getVisualization(oPresentationVariant, sAnnotationPath);
						return oColumnsContext.oModel.getMetaContext(sEntitySetPath + oWorkingContext.lineItemPath);
					} else if (sAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.SelectionPresentationVariant") >= 0) {
						oSelectionPresentationVariant = oColumnsContext.getObject();
						oWorkingContext = Table._helper._getPresentationVariant(oSelectionPresentationVariant, sAnnotationPath);
						oPresentationVariant = oColumnsContext.getObject(sEntitySetPath + oWorkingContext.presentationVariantPath);
						oWorkingContext = Table._helper._getVisualization(oPresentationVariant, oWorkingContext.presentationVariantPath);
						return oColumnsContext.oModel.getContext(sEntitySetPath + oWorkingContext.lineItemPath);
					}
				} else {
					//column context is not provided
					oEntitySetContext = oContext.getObject("/entitySet");

					// TODO: this is not yet implemented, let's finalize the API first
					throw new Error("Not yet implemented");
					//sEntitySet = oEntitySetContext.getPath().substring(1);
					//oWorkingContext =  Table._helper._getWorkingContext(oEntitySetContext.oModel, sEntitySet, undefined); // ???
					//return oEntitySetContext.oModel.getContext(oWorkingContext.lineItemPath);
				}
			}
		},

		_resolveDataField : function(oContext){
			if (oContext.getObject("$Type").indexOf("com.sap.vocabularies.Common.v1.ValueListParameter") === 0){
				// context is a value list parameter - we need to jump to its value list model
				var oValueListModel = oContext.getModel();
				var oValueListData = oValueListModel.getObject("/");
				return oValueListData.$model.getMetaModel().createBindingContext('/' + oValueListData.CollectionPath + '/' + oContext.getObject("ValueListProperty"));
			}

			return oContext;
		},

		_getVisualization: function (oPresentationVariant, sAnnotationPath) {
			var oWorkingContext = {};
			if (oPresentationVariant && oPresentationVariant.Visualizations) {
				oPresentationVariant.Visualizations.forEach(function(visualization) {
					if (visualization.$AnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.LineItem") > -1) {
						oWorkingContext.lineItemPath = sAnnotationPath.slice(0, sAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.PresentationVariant")) + visualization.$AnnotationPath;
					}
					if (visualization.$AnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.Chart") > -1) {
						oWorkingContext.chartPath = sAnnotationPath.slice(0, sAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.PresentationVariant")) + visualization.$AnnotationPath;
					}
				});
			}
			return oWorkingContext;
		},
		_getPresentationVariant: function (oSelectionPresentationVariant, sAnnotationPath) {
			var oWorkingContext = {};
			if (oSelectionPresentationVariant && oSelectionPresentationVariant.PresentationVariant) {
				if (oSelectionPresentationVariant.PresentationVariant.$Path) {
					oWorkingContext.presentationVariantPath = sAnnotationPath.slice(0, sAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.SelectionPresentationVariant")) + oSelectionPresentationVariant.PresentationVariant.$Path;
				} else {
					oWorkingContext.presentationVariantPath = sAnnotationPath + "/PresentationVariant";
				}
			}
			return oWorkingContext;
		},

		createAggregationBinding: function (oInterface, oEntitySet, sTableBindingPath, sListBindingName) {
			if (sTableBindingPath) {
				return '{' + sTableBindingPath + '}';
			}

			var sExpand = '',
				oMetaContext = oInterface.getInterface(0),
				oMetaModel = oMetaContext.getModel(),
				sEntitySet = oMetaModel.getObject(oMetaContext.getPath() + "@sapui.name"),
				sNamedBinding = sListBindingName ? "id: '" + sListBindingName + "', " : '';

			if (oMetaContext.getModel().getObject(oMetaContext.getPath() + "@com.sap.vocabularies.Common.v1.DraftRoot")) {
				sExpand = "$expand : 'DraftAdministrativeData'";
			}

			return "{ path : '/" + sEntitySet + "', parameters : { " + sNamedBinding + " $count : true " + (sExpand ? ',' : '') + sExpand + "}, events : {dataRequested : '.handleDataRequested', dataReceived : '.handleDataReceived'} }";
		},

		getSelectionMode : function (oContext, oEntitySet, oWorkingContext) {
			oContext = oContext.getInterface(0);

			//var aLineItems = oContext.getModel().getObject(oWorkingContext['@com.sap.vocabularies.UI.v1.LineItem']) || [];
			var aLineItems = oWorkingContext['@com.sap.vocabularies.UI.v1.LineItem'];
			for (var i = 0; i < aLineItems.length; i++) {
				if (aLineItems[i].$Type === "com.sap.vocabularies.UI.v1.DataFieldForAction" && !aLineItems[i].Inline) {
					return sap.m.ListMode.MultiSelect;
				}
			}

			return ListMode.None;
		},

		getMetaContextPath: function (oContext) {
			return oContext.getPath();
		},
		/**
		 * @param  {Object} oCriticality
		 * This method is for getting the expression binding to set semantic row higlight color in sap.ui.mdc.table.
		 */
		getRowHighlightColor: function(oCriticality) {
			if (oCriticality && oCriticality.$Path) {
				return "{= (${" + oCriticality.$Path + "} === '3') ? 'Success' " +
						": (${" + oCriticality.$Path + "} === '2') ? 'Warning' " +
						": (${" + oCriticality.$Path + "} === '1') ? 'Error' " +
						": 'None' }";
			} else {
				return 'None';
			}
		}
	};

	Table._helper.getMetaContextPath.requiresIContext = true;
	Table._helper.createAggregationBinding.requiresIContext = true;
	Table._helper.getSelectionMode.requiresIContext = true;

	return Table;

}, /* bExport= */true);
