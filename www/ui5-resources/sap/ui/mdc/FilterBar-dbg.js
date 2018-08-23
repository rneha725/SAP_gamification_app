/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([
	"./ResourceModel",
	'sap/ui/mdc/XMLComposite',
	'sap/ui/base/ManagedObject',
	'sap/ui/Device',
	"sap/ui/mdc/internal/common/Helper",
	"sap/ui/mdc/FilterField",
	"sap/m/SearchField",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	'sap/ui/mdc/base/ConditionModel',
	'sap/ui/mdc/experimental/P13nFilterPanel',
	'sap/ui/mdc/experimental/P13nFilterItem',
	"sap/ui/fl/ControlPersonalizationAPI"
], function (ResourceModel, XMLComposite, ManagedObject, Device, CommonHelper, FilterField, SearchField, Dialog, Button, MessageToast, JSONModel, ConditionModel, P13nFilterPanel, P13nFilterItem, ControlPersonalizationAPI) {
	"use strict";
	var FilterBar = XMLComposite.extend("sap.ui.mdc.FilterBar", {
		metadata: {
			designtime: "sap/ui/mdc/designtime/FilterBar.designtime",
			specialSettings: {
				metadataContexts: {
					defaultValue: "{ model: 'entitySet', path:'',  name: 'entitySet'},{model: 'sap.fe.deviceModel', path: '/', name: 'sap.fe.deviceModel'},{model:'entitySet', path:'./@com.sap.vocabularies.UI.v1.SelectionFields', name:'selectionFields'}"
				}
			},
			properties: {
				liveUpdate: {
					type: "boolean",
					defaultValue: !Device.system.phone, // filtering should be via Go button on phone by default
					invalidate: "template"
				},
				searchOnStart: {
					type: "boolean",
					defaultValue: true,
					invalidate: "template"
				},
				filterSummary: {
					type: "string",
					defaultValue: "",
					invalidate: false
				},
				enabled: {
					type: "boolean",
					defaultValue: true,
					invalidate: false
				},
				conditionModelName: {
					type: "string",
					defaultValue: "sap.fe.cm",
					invalidate: false
				},
				// comma separated list of named binding ids, currently only one is supported
				listBindingNames: {
					type: "string[]",
					invalidate: false
				},
				// altough the service supports $search the basic search should not be shown
				hideBasicSearch : {
					type: "boolean",
					defaultValue: false,
					invalidate: "template"
				},
				enablePersonalization : {
					type: "boolean",
					defaultValue: true,
					invalidate: false
				}
			},
			events: {
				search: {},
				change: {}
			},
			aggregations: {},
			publicMethods: []
		},
		fragment: "sap.ui.mdc.internal.filterbar.FilterBar"
	});


	var fnSearch = function(oEvent){
		var oConditionModel = this._getConditionModel(),
			oModel = this.getModel(),
			aListBindingNames, sSearchString, bFilterWithoutErrors;

		bFilterWithoutErrors = oConditionModel.applyFilters();

		if (bFilterWithoutErrors && oModel.getBindingForReference){
			var oSearchControl = this._getSearchControl();
			if (oSearchControl){
				sSearchString = oSearchControl.getValue() || undefined;
				aListBindingNames = this.getListBindingNames();

				aListBindingNames.forEach(function(sListBindingName){
					oModel.getBindingForReference(sListBindingName).then(function(oListBinding){
						oListBinding.changeParameters({
							$search : sSearchString
						});
					});
				});
			}
		}
	};

	FilterBar.prototype.init = function () {
		XMLComposite.prototype.init.call(this);

		var that = this;
		this._bIsReady = false;
		this.attachSearch(fnSearch);

		this._requestConditionModel().then(function(oConditionModel){
			if (!that.bInitialized) {
				that.bInitialized = true;

				var oConditionChangeBinding = oConditionModel.bindProperty("/", oConditionModel.getContext("/"));
				oConditionChangeBinding.attachChange(that.handleChange.bind(that));

				if (that.getSearchOnStart() && that.getEnabled()) {
					that._bIsReady = true;
					that.fireSearch();
				}

				if (!that.getEnabled()) {
					that._getInnerFilterBar().setBusy(true);
				}
			}
		});

	};

	FilterBar.prototype.onBeforeRendering = function () {
		this._setFilterSummary();
	};

	FilterBar.prototype.setEnabled = function (bEnabled) {
		this._getInnerFilterBar().setBusy(!bEnabled);
		this.setProperty("enabled", bEnabled);

		if (bEnabled) {
			if (this.bInitialized && this.getSearchOnStart()) {
				this._bIsReady = true;
				this.fireSearch();
			}
		}
	};

	FilterBar.prototype.isReady = function () {
		/* tells the connected controls if the filter bar is ready
		 ready = table is set to immediately search / user clicked on GO
		 = the control and all filter items are instanced
		 = the app state is applied if existing
		 = the (default) variant is loaded if existing
		 better name for method is welcome :-)
		 */
		return this._bIsReady;
	};

	FilterBar.prototype.getAppState = function () {
		// TODO: this only works if the condition model is created
		//       we should think about using request condition model as well and convert this into async
		var oConditionModel = this._getConditionModel(),
			oDraftEditState = this._getDraftEditStateControl(),
			oSearch = this._getSearchControl(),
			oAppState = {};

		if (oConditionModel) {
			oAppState.conditionModel = oConditionModel.serialize();
		}

		if (oDraftEditState) {
			oAppState.draftEditState = oDraftEditState.getSelectedKey();
		}

		if (oSearch) {
			oAppState.search = oSearch.getValue();
		}

		return oAppState;
	};

	FilterBar.prototype.setAppState = function (oAppState) {
		var that = this;

		return this._requestConditionModel().then(function(oConditionModel){
			var oDraftEditState = that._getDraftEditStateControl(),
				oSearch = that._getSearchControl();

			if (oAppState.conditionModel) {
				if (oConditionModel) {
					oConditionModel.parse(oAppState.conditionModel);
				} else {
					throw ("app state contains condition model state but condition model not yet set");
				}
			}

			if (oAppState.draftEditState && oDraftEditState) {
				oDraftEditState.setSelectedKey(oAppState.draftEditState);
			}

			if (oAppState.search && oSearch) {
				oSearch.setValue(oAppState.search);
			}

			if (!that.getLiveUpdate()) {
				that.handleGo();
			}
		});
	};

	/********** EVENT HANDLER ***************************************/

	FilterBar.prototype.handleChange = function () {
		// this event is fired once the user changed any filter and the live update is set
		// also it's only fired if it's enabled - in case it's disabled changes can not be done by the user - for
		// example via setting the app state - and no event is expected
		if (this.getLiveUpdate() && this.getEnabled()) {
			this.fireSearch();
			this._setFilterSummary();
			this.fireChange();
		} else {
			this._bIsReady = false;
			this.fireChange();
		}
	};

	FilterBar.prototype.handleSearch = function (oEvent) {
		// this event is fired when the user clicks enter in the search field or on the search icon
		this.fireSearch();
		this._setFilterSummary();
		this.fireChange();
	};

	FilterBar.prototype.handleSearchChange = function (oEvent) {
		// the live search is triggered but only if the user didn't type for a given time frame (400ms)
		var that = this,
			iSearchCounter;

		if (that._iSearchCounter){
			that._iSearchCounter++;
		} else {
			that._iSearchCounter = 1;
		}

		iSearchCounter = that._iSearchCounter;

		if (this.getLiveUpdate()) {
			setTimeout(function(){
				if (iSearchCounter === that._iSearchCounter){
					that.fireSearch();
					that._setFilterSummary();
					that.fireChange();
					delete that._iSearchCounter;
				}
			}, 400);
		} else {
			this._bIsReady = false;
			this.fireChange();
		}
	};

	FilterBar.prototype.handleGo = function () {
		this._bIsReady = true;
		this.fireSearch();
		this._setFilterSummary();
		this.fireChange();
	};

	FilterBar.prototype.handleAdapt = function (oEvent) {
		var that = this;
		var oConditionModel = this.getModel(this.getConditionModelName());
		var oConditionModelClone = oConditionModel.clone();
		var aFilter, oAdaptDialog, oAdaptFilterModel;
		this.aSelectedFilter = [];

		if (this.oAdaptDialog) {
			oAdaptFilterModel = this.oAdaptDialog.getModel("p13n");
			this._updateAdaptFilterModel(oAdaptFilterModel);
		} else {
			var oP13nFilterPanel = new P13nFilterPanel();

			this.oAdaptDialog = oAdaptDialog = new Dialog({
				title : "Adapt Filters",
				contentWidth: "75%",
				contentHeight: "75%",
				content : oP13nFilterPanel,
				verticalScrolling: true,
				resizable : true,
				draggable : true,
				endButton: new Button({
					text: '{$i18n>filterbar.ADAPT_CANCEL}',
					press: function () {
						oAdaptDialog.close();
					}
				}),
				beginButton: new Button({
					text: '{$i18n>filterbar.ADAPT_OK}',
					type : 'Emphasized',
					press: function () {
						var aNewFilter = oAdaptFilterModel.getObject("/filters");
						var aAddFilter = [], aRemoveFilter = [];

						for (var i = 0; i < aNewFilter.length; i++) {
							if (aNewFilter[i].selected && that.aSelectedFilter.indexOf(aNewFilter[i]) === -1) {
								aAddFilter.push(aNewFilter[i]);

							} else if (!aNewFilter[i].selected && that.aSelectedFilter.indexOf(aNewFilter[i]) > -1) {
								aRemoveFilter.push(aNewFilter[i]);
							}
						}

						if (aAddFilter.length > 0 || aRemoveFilter.length > 0){
							that._adaptFilterBar(aAddFilter, aRemoveFilter);
						}
						oConditionModel.merge(undefined, this.getModel("sap.fe.cm"));
						oConditionModel.applyFilters();
						oAdaptDialog.close();
					}
				})
			});

			oAdaptFilterModel = this._getAdaptFilterModel(oAdaptDialog);
			oAdaptDialog.setModel(oAdaptFilterModel, "p13n");
			oP13nFilterPanel.bindAggregation("items", {
				path: "/filters",
				model: "p13n",
				factory: function(sId, oBindingContext) {
					var oModelFilterItem = oBindingContext.getObject(oBindingContext.getPath());
					return new P13nFilterItem({
						columnKey: {
							path: "p13n>" + oBindingContext.getPath() + "/columnKey"
						},
						text: {
							path: "p13n>" + oBindingContext.getPath() + "/text"
						},
						tooltip: {
							path: "p13n>" + oBindingContext.getPath() + "/tooltip"
						},
						position: {
							path: "p13n>" + oBindingContext.getPath() + "/position"
						},
						selected: {
							path: "p13n>" + oBindingContext.getPath() + "/selected"
						},
						required: {
							path: "p13n>" + oBindingContext.getPath() + "/required"
						},
						controls: [
							oModelFilterItem.control
						]
					});
				}
			});

			this.addDependent(oAdaptDialog);
		}

		// Store the selected filter before opening the dialog
		aFilter = oAdaptFilterModel.getObject("/filters");
		for (var i = 0; i < aFilter.length; i++){
			if (aFilter[i].selected){
				this.aSelectedFilter.push(aFilter[i]);
			}
		}

		this.oAdaptDialog.setModel(oConditionModelClone, "sap.fe.cm"); // TODO: rename
		this.oAdaptDialog.open();
	};

	/********** PRIVATE METHODS *************************/
	FilterBar.prototype._getEntitySet = function () {
		// workaround only - fix me
		return this.byId("template::Filterbar::Adapt").getCustomData()[0].getValue();
	};

	FilterBar.prototype._getInnerFilterBar = function () {
		return this.get_content();
	};

	FilterBar.prototype._setFilterSummary = function () {
		var oSearch = this._getSearchControl(),
			oDraftEditState = this._getDraftEditStateControl(),
			sSearch, sFilterSummary = "", aFilter = [], i;

		if (oSearch) {
			sSearch = oSearch.getValue();
		}

		if (sSearch) {
			sFilterSummary = ResourceModel.getText("filterbar.SEARCHBY") + ": " + sSearch + ((aFilter.length > 0) ? " | " : "");
		}

		if (oDraftEditState && oDraftEditState.getSelectedKey() !== '0') {
			aFilter.push(ResourceModel.getText("filterbar.EDITING_STATUS"));
		}

		var aFilterFields = this._getFilterFieldControls();

		for (i = 0; i < aFilterFields.length; i++) {
			if (aFilterFields[i].getConditions().length > 0) {
				// we park the title of the filter in the custom data - this will be changed with the next release
				aFilter.push(aFilterFields[i].getCustomData()[0].getValue());
			}
		}

		if (aFilter.length > 0) {
			sFilterSummary += ResourceModel.getText("filterbar.FILTERBY") + " (" + aFilter.length + "): ";
			for (i = 0; i < aFilter.length; i++) {
				sFilterSummary += ((i > 0) ? ', ' : '') + aFilter[i];
			}
		}

		if (!sFilterSummary) {
			sFilterSummary = ResourceModel.getText("filterbar.FILTERBYNONE");
		}

		this.setFilterSummary(sFilterSummary);

	};

	FilterBar.prototype._requestConditionModel = function () {
		var oConditionModel = this._getConditionModel(),
			that = this;

		if (oConditionModel) {
			return Promise.resolve(oConditionModel);
		} else {
			return new Promise(function (fnResolve) {
				// TODO: currently works with the unnamed model only
				var oModel = that.getModel();

				var fnCreateConditionModel = function(){
					var oModel = that.getModel(), oConditionModel, aNamedBindings;

					if (!oModel){
						// still no data model assigned
						return;
					}

					that.detachModelContextChange(fnCreateConditionModel);

					oConditionModel = that.getModel(that.getConditionModelName());
					if (oConditionModel){
						// possible that another thread already created the condition model
						return Promise.resolve(oConditionModel);
					} else {
						aNamedBindings = that.getListBindingNames();

						//create the condition model only if named bindings are available
						if (aNamedBindings && oModel.getBindingForReference) {
							aNamedBindings.forEach(function(sNamedListBinding) {
								oModel.getBindingForReference(sNamedListBinding).then(function(oListBinding){
									oConditionModel = that.getModel(that.getConditionModelName());
									if (!oConditionModel) {
										oConditionModel = ConditionModel.getFor(oListBinding);
										this.setModel(oConditionModel, this.getConditionModelName());
									}
									fnResolve(oConditionModel);
								}.bind(this));
							}.bind(that));
						}
					}
				};

				if (oModel){
					fnCreateConditionModel();
				} else {
					that.attachModelContextChange(fnCreateConditionModel);
				}
			});
		}
	};

	FilterBar.prototype._getConditionModel = function () {
		return this.getModel(this.getConditionModelName());
	};

	FilterBar.prototype._getDraftEditStateControl = function () {
		var aContent = this._getInnerFilterBar().getContent();
		var oFilterItem;

		for (var i = 0; i < aContent.length; i++) {
			if (!(aContent[i] instanceof FilterField) && aContent[i].getItems) {
				oFilterItem = aContent[i].getItems()[1];
				if (oFilterItem.getBinding("items") && oFilterItem.getBinding("items").getPath() === "/editStates" && oFilterItem.getBinding("items").getModel() === oFilterItem.getModel("$draft")) {
					return oFilterItem;
				}
			}
		}
	};

	FilterBar.prototype._getSearchControl = function () {
		if (!this.getHideBasicSearch()){
			var aContent = this._getInnerFilterBar().getContent();
			var oFilterItem;

			for (var i = 0; i < aContent.length; i++) {
				oFilterItem = aContent[i].getItems()[1];
				if (oFilterItem instanceof SearchField) {
					return oFilterItem;
				}
			}
		}
	};

	FilterBar.prototype._getFilterFieldControls = function () {
		// we should return the sap.fe.filterFields and provide the needed methods here so no other method is accessing
		// the mdc field directly
		var aContent = this._getInnerFilterBar().getContent();
		var oFilterField,
			aFilterFields = [];

		for (var i = 0; i < aContent.length; i++) {
			oFilterField = aContent[i];
			if (oFilterField instanceof FilterField) {
				aFilterFields.push(oFilterField.get_content().getItems()[1]);
			}
		}

		return aFilterFields;
	};

	FilterBar.prototype._getAdaptFilterModel = function (oParent) {
		var that = this;
		var aFilterFields = this._getFilterFieldControls();
		var sEntitySet = this._getEntitySet();

		var aFilter = [];
		var oMetaModel = this.getModel().getMetaModel();
		// currently we show only the properties of the same entity set - don't know which properties else to be shown
		// TODO: this needs to be discussed and defined
		var mProperties = oMetaModel.getObject("/" + sEntitySet + "/");
		var mAnnotations, oContext;

		function getFilterFieldControl(sPath){
			// just as a test we return the same control or a new input field
			// TODO: have to introduce a new filter field control and use this instead
			return FilterField.createInstance({
				entitySet: sEntitySet,
				propertyPath: sPath,
				metaModel : oMetaModel,
				parent : oParent
			});
		}

		function isSelected(sPath){
			return that._getFilterFieldControl(aFilterFields, sPath) !== undefined;
		}

		function getPosition(sPath){
			for (var i = 0; i < aFilterFields.length; i++){
				if (aFilterFields[i].getFieldPath() === sPath){
					return i;
				}
			}
		}

		for (var p in mProperties){
			if (mProperties[p].$kind && mProperties[p].$kind === "Property"){
				mAnnotations = oMetaModel.getObject("/" + sEntitySet + "/" + p + "@");
				oContext = oMetaModel.getContext("/" + sEntitySet + "/" + p);

				if (CommonHelper.isPropertyFilterable(p, { context : oContext})){
					aFilter.push({
						columnKey : p,
						text : mAnnotations['@com.sap.vocabularies.Common.v1.Label'] || p,
						position : getPosition(p),
						tooltip : mAnnotations['@com.sap.vocabularies.Common.v1.Label'] || p,
						selected : isSelected(p),
						control : getFilterFieldControl(p),
						required : FilterField._helper.isRequiredInFilter(p, { context : oContext})
					});
				}

			}
		}

		var oAdaptFilterModel = new JSONModel({
			"filters" : aFilter
		});

		return oAdaptFilterModel;
	};

	FilterBar.prototype._updateAdaptFilterModel = function (oAdaptFilterModel) {
		var aFilterFields = this._getFilterFieldControls();
		var aAllFilters = oAdaptFilterModel.getObject("/filters");
		for (var i = 0; i < aAllFilters.length; i++){
			aAllFilters[i].selected = this._getFilterFieldControl(aFilterFields, aAllFilters[i].columnKey) !== undefined;
		}

		oAdaptFilterModel.setProperty("/filters", aAllFilters);

	};

	FilterBar.prototype._getFilterFieldControl = function (aFilterFields, sPath) {
		for (var i = 0; i < aFilterFields.length; i++){
			if (aFilterFields[i].getFieldPath() === sPath){
				return aFilterFields[i];
			}
		}
	};

	FilterBar.prototype._adaptFilterBar = function (aAddFilter, aRemoveFilter) {
		var sAddFilter = "", sRemoveFilter = "", aChanges = [];

		aAddFilter.forEach(function(oFilter) {
			sAddFilter += oFilter.text + ", ";
			aChanges.push({
				selectorControl: this,
				changeSpecificData: {
					changeType: "addFilter",
					content: {
						columnKey: oFilter.columnKey,
						text: oFilter.text + ':'
					}
				}
			});
		}.bind(this));
		aRemoveFilter.forEach(function(oFilter) {
			sRemoveFilter += oFilter.text + ", ";
			aChanges.push({
				selectorControl: this,
				changeSpecificData: {
					changeType: "removeFilter",
					content: {
						removedElement: this._getFilterFieldControl(this._getFilterFieldControls(), oFilter.columnKey).getParent().getParent().getId()
					}
				}
			});
		}.bind(this));

		//ControlPersonalizationAPI can only be used to store delta variant changes in presence of a variant management reference
		if (ControlPersonalizationAPI.hasVariantManagement(this)) {
			ControlPersonalizationAPI.addPersonalizationChanges(aChanges);
		} else {
			MessageToast.show("Adapting the Filter Bar is not yet implemented. \n The following filters shall be added:" + sAddFilter + "The following filters shall be removed: " + sRemoveFilter);
		}

	};

	/********** STATIC HELPER FOR CONTROL TEMPLATE *************************/

	FilterBar._helper = {
		resolveSelectionField : function(oContext){
			// This helper checks if the context has a property path and if yes points to it's target
			var oProperty = oContext.getObject();
			if (oProperty.$PropertyPath){
				return oContext.getModel().createBindingContext(oContext.getPath() + "/$PropertyPath");
			} else {
				return oContext;
			}
		},

		isNavPropertyFilterable: function (oContext, navProperty) {
			// TODO: rewrite as computed annotation helper?
			var sEntitySetPath,
				sContext,
				bIsNotFilterable = false,
				sPropertyPath = oContext.getPath(),
				oModel = oContext.getModel();

			sEntitySetPath = CommonHelper._getEntitySetPath(oModel, sPropertyPath);
			sContext = sPropertyPath.slice(sEntitySetPath.length + 1);
			if (sContext.indexOf("/") < 0) {
				bIsNotFilterable = CommonHelper._isInNonFilterableProperties(oModel, sEntitySetPath, sContext);
			} else {
				bIsNotFilterable = CommonHelper._isContextPathFilterable(oModel, sEntitySetPath, sContext);
			}
			return !bIsNotFilterable;
		},

		replaceSpecialCharsInId : function(property, oInterface){
			var sProperty;
			if (typeof (property) === "string") {
				sProperty = property;
			} else {
				sProperty = oInterface.context.getModel().getObject(oInterface.context.getPath() + "@sapui.name");
			}
			return CommonHelper.replaceSpecialCharsInId(sProperty);
		}
	};

	FilterBar._helper.isNavPropertyFilterable.requiresIContext = true;

	return FilterBar;

}, /* bExport= */true);
