sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/library", "sap/ui/model/odata/ODataUtils", "sap/ovp/cards/generic/Component",
        "sap/ui/generic/app/navigation/service/NavigationHandler", "sap/m/MessageBox", "sap/ovp/cards/CommonUtils",
        "sap/ovp/cards/PersonalizationUtils", "sap/ovp/cards/charts/VizAnnotationManager", "sap/m/BusyDialog",
        "sap/ui/model/Filter",
        "sap/ui/generic/app/navigation/service/SelectionVariant", "sap/ui/comp/state/UIState", "sap/m/ColumnListItem",
        "sap/m/Text", "sap/m/Switch", "sap/m/Table", "sap/m/Column", "sap/m/Button", "sap/m/Dialog",
        "sap/ui/model/json/JSONModel", "jquery.sap.global", "sap/ui/Device", "sap/ovp/ui/SmartphoneHeaderToggle",
        "sap/ui/model/odata/v2/ODataModel", "sap/ui/model/odata/ODataMetadata",
        "sap/ui/fl/FlexControllerFactory", "sap/ui/thirdparty/hasher",
        "sap/m/BackgroundDesign", "sap/m/ListSeparators", "sap/ui/core/TextAlign"],

    function (Controller, SapMLibrary, ODataUtils, Component, NavigationHandler, MessageBox, CommonUtils, PersonalizationUtils,
              VizAnnotationManager, BusyDialog, Filter,
              SelectionVariant, UIState, ColumnListItem, Text, Switch, Table, Column, Button,
              Dialog, JSONModel, jQuery, Device, SmartphoneHeaderToggle, ODataModel, ODataMetadata,
              FlexControllerFactory, hasher, BackgroundDesign, ListSeparators, TextAlign) {

        "use strict";

        return Controller.extend("sap.ovp.app.Main", {

            // Extensions (Implemented in Extension Controller)
            //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

            //Store custom data in oCustomData
            getCustomAppStateDataExtension: function (oCustomData) {
            },
            //Appstate will return the same oCustomData
            restoreCustomAppStateDataExtension: function (oCustomData) {
            },
            //Returns Filter object to be used in filtering
            getCustomFilters: function () {
            },
            //Returns Custom Action function
            onCustomActionPress: function (sCustomAction) {
            },
            //Returns Custom Parameters
            onCustomParams: function (sCustomParams) {
            },

            oRefreshTimer: null, // timer instance for auto refresh
            nRefreshInterval: 0, // auto refresh interval that is being set in the manifest
            filterItemInFocus: null,
            bFinishedCardsCreationProcess: false,

            // Delta Changes
            //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

            /**
             * Called by applyChange in flexibility.js of layout controls
             * dashboard or easyScan
             *
             * It is called for every change
             * So it will be called multiple times
             * The latest call will have the latest change
             *
             * Across all of main controller, making the incoming delta changes available
             */
            storeIncomingDeltaChanges: function (aCardsInfo) {
                this.deltaCardsInfo = aCardsInfo ? aCardsInfo : [];
            },

            appendIncomingDeltaChange: function (oChange) {
                this.deltaChanges.push(oChange);
            },

            // Standard Methods
            //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            onInit: function () {

                //ushell container comes from FLP, if an app is hosted without FLP
                //then container will not be available. In such case, all container related
                //functionality need to be skipped
                this.oContainer = sap.ushell.Container;

                //an array of card IDs used to keep track of the current error cards shown.
                this.aErrorCards = [];

                // This flag is set if user has delta changes available.
                this.bDeltaChangesEnabled = false;
                // Array to store incoming delta changes
                this.deltaChanges = [];
                this.oCardsModels = {};
                this.aFilters = [];
                /*For storing Batch Requests send status*/
                this.errorHandlingObject = {
                    atLeastOneRequestSuccess: false,
                    errorLoadingTimeout: {}
                };
                this.sPreviousEntityType = "";
                this.sCurrentEntityType = "";
                this.oLoadedComponents = {};
                this.bGlobalFilterLoaded = false;
                this.bGoButtonPressed = false;
                this.bSearchButtonPressed = false;
                jQuery.sap.measure.start("ovp:GlobalFilter", "Main Controller init -> Global Filter loaded", "ovp");
                jQuery.sap.measure.start("ovp:Personalization", "Main Controller init -> Personalization loaded", "ovp");
                this.isInitialLoading = true;
                var oUIModel = this.getUIModel();
                this.bDisableErrorPage = oUIModel && oUIModel.getProperty("/disableErrorPage");
                this.oNavigationHandler = this.oNavigationHandler || new NavigationHandler(this);
                // check if no delta changes and need of migration from variant->delta
                this._initFlexibilityPersonalization();

                this.getLayout().addStyleClass("ovpLayoutElement");
                /* Appstate*/
                this.oState = {};
                this.oState.oSmartFilterbar = this.byId("ovpGlobalFilter");
                /* Appstate */
                this._initGlobalFilter();
                // Set model for tile
                this._createModelForTile();
                // check jam authorization
                this._checkJamAuth();
                CommonUtils.enable(this, this.oNavigationHandler);
            },

            performRecreationOfCard: function (oCard) {
                this.createLoadingCard(oCard);
                oCard.settings.baseUrl = this._getBaseUrl();
                this._clearStoredEntities(); //Clear previously temporarily stored entity types
                this._initCardModel(oCard.model);
                oCard = this._getTemplateForChart(oCard);
                this._loadCardComponent(oCard.template);
                this._createModelViewMap(oCard);
                //this.createCard(oCard);
                jQuery.when(this.createCard(oCard)).then(function () {
                    if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                        var oDashboardUtil = this.getLayout().getDashboardLayoutUtil();
                        if (oDashboardUtil) {
                            var oDashBoardLayoutModel = oDashboardUtil.getDashboardLayoutModel();
                            var oDashboardCard = oDashBoardLayoutModel.getCardById(oCard.id);
                            oDashboardUtil._sizeCard(oDashboardCard);
                            oDashBoardLayoutModel.extractCurrentLayoutVariant();
                        }
                    }
                }.bind(this));
            },

            recreateCard: function (sCardProperties) {
                var oCard = this._getCardFromManifest(sCardProperties.cardId);
                if (oCard.template == "sap.ovp.cards.charts.analytical" || oCard.template == "sap.ovp.cards.charts.smart.chart") {
                    oCard.settings.chartAnnotationPath = sCardProperties.chartAnnotationPath;
                    oCard.settings.navigation = sCardProperties.navigation;
                }
                oCard.settings.annotationPath = sCardProperties.annotationPath;
                oCard.settings.dynamicSubtitleAnnotationPath = sCardProperties.dynamicSubtitleAnnotationPath;
                oCard.settings.presentationAnnotationPath = sCardProperties.presentationAnnotationPath;
                oCard.settings.selectionAnnotationPath = sCardProperties.selectionAnnotationPath;
                oCard.settings.selectionPresentationAnnotationPath = sCardProperties.selectionPresentationAnnotationPath;
                oCard.settings.kpiAnnotationPath = sCardProperties.kpiAnnotationPath;
                oCard.settings.dataPointAnnotationPath = sCardProperties.dataPointAnnotationPath;
                oCard.settings.identificationAnnotationPath = sCardProperties.identificationAnnotationPath;
                // headerAnnotationPath is a property added to the manifest.json for Qualifier support in HeaderInfo annotations.
                oCard.settings.headerAnnotationPath = sCardProperties.headerAnnotationPath;
                var sOldKey = oCard.settings.selectedKey;
                oCard.settings.selectedKey = sCardProperties.selectedKey;
                if (oCard) {
                    this.performRecreationOfCard(oCard);
                }
                var oChange = {
                    changeType: "viewSwitch",
                    content: {
                        cardId: sCardProperties.cardId,
                        selectedKey: sCardProperties.selectedKey,
                        oldKey: sOldKey
                    },
                    isUserDependent: true
                };
                this.savePersonalization(oChange);

            },

            recreateRTAClonedCard: function (oCardProperties) {
                var oCard = this._getCardFromManifest(oCardProperties.id);
                if (oCard) {
                    oCard.settings = oCardProperties.settings;
                    this.performRecreationOfCard(oCard);
                }
            },

            //clarify with UI5 Core: why can view models not be accessed in onInit?
            onBeforeRendering: function () {
            },

            getErrorCardsAsArray: function () {
                var key;
                var aErrorCards = [];
                for (key in this.aOrderedCards) {
                    if (this.aOrderedCards[key].visibility) {
                        var sCardId = this.aOrderedCards[key].id;
                        var oCardView = this.getView().byId(sCardId);
                        var oCardComponentInstance = oCardView && oCardView.getComponentInstance();
                        var oCardComponentData = oCardComponentInstance && oCardComponentInstance.getComponentData();
                        var sCardTemplate = oCardComponentData && oCardComponentData.settings && oCardComponentData.settings.template;
                        if (sCardTemplate === "sap.ovp.cards.error") {
                            aErrorCards.push(sCardId);
                        }
                    }
                }
                return aErrorCards;
            },

            verifyAndSetErrorCard: function (oReason) {
                var key;
                for (key in this.aOrderedCards) {
                    var oCardComponentContainer = this.getView().byId(this.aOrderedCards[key].id);
                    var oComponentInstance = oCardComponentContainer && oCardComponentContainer.getComponentInstance();
                    var oComponentData = oComponentInstance && oComponentInstance.getComponentData();
                    var oCardView = oComponentInstance && oComponentInstance.getRootControl();
                    var oCardController = oCardView && oCardView.getController();
                    var oCardItemsBinding = oCardController && oCardController.getCardItemsBinding();
                    if (oCardItemsBinding) {
                        var sModelUrl = oReason.getParameters().url;
                        var sCustomParams = oCardItemsBinding.sCustomParams;
                        var sFilterParams = oCardItemsBinding.sFilterParams;
                        var sPath = oCardItemsBinding.sPath.replace("/", "");
                        var sRangeParams = oCardItemsBinding.sRangeParams;
                        var bIsInlineMode = oCardItemsBinding.sCountMode && oCardItemsBinding.sCountMode.indexOf("Inline");
                        var sSortParams = oCardItemsBinding.sSortParams;
                        var sServiceUrl = oReason.getSource().sServiceUrl;
                        var oMetadata = oReason.oSource && oReason.oSource.oMetadata;
                        var oEntityType = oCardController.getEntityType();
                        var sFilterInUrl = sap.ui.model.odata.ODataUtils.createFilterParams(this.aFilters, oMetadata, oEntityType);
                        sModelUrl = sModelUrl.split(sPath).join("")
                            .split(sCustomParams).join("")
                            .split(sFilterParams).join("")
                            .split(sRangeParams).join("")
                            .split(sSortParams).join("")
                            .split(sServiceUrl).join("")
                            .split(sFilterInUrl).join("")
                            .split("?").join("")
                            .split("&").join("")
                            .split("/").join("");

                        if (!bIsInlineMode) {
                            sModelUrl = sModelUrl.split("$inlinecount=allpages").join("");
                        }
                        var sCardId = oComponentData && oComponentData.cardId;
                        var oManifestCard = this._getCardFromManifest(sCardId);
                        var aErrorCards = this.getErrorCardsAsArray();
                        if (oManifestCard && aErrorCards.indexOf(sCardId) == -1 && !sModelUrl) {
                            // if dashboardLayout, disable the resizing for error card
                            if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                                var oLayout = this.getLayout();
                                var oDashBoardLayoutModel = oLayout.getDashboardLayoutModel();
                                var oDashboardCard = oDashBoardLayoutModel.getCardById(oManifestCard.id);
                                oManifestCard = oDashboardCard;
                            }
                            this.createErrorCard(oManifestCard, oReason);
                        }
                    }

                }
            },

            onAfterRendering: function () {
                this.oModelViewMap = {};
                this.oAppStatePromise = null;
                // checking the refresh interval from the manifest and setting it in the global variable
                if (this.getView().getModel("ui").getProperty("/refreshIntervalInMinutes")) {
                    this.nRefreshInterval = this.getView().getModel("ui").getProperty("/refreshIntervalInMinutes");
                    /*
                     * if the refresh interval is less than 1 : setting it to 1
                     * else setting it as described in the manifest
                     * converting the minutes to milliseconds
                     */
                    this.nRefreshInterval = (this.nRefreshInterval <= 1 ? 1 : this.nRefreshInterval) * 60000;
                }

                // error cards
                var oCardsModels = this._getCardsModel();
                var aCardModelArray = [];
                var key;
                for (key in oCardsModels) {
                    if (aCardModelArray.indexOf(oCardsModels[key].model) == -1) {
                        aCardModelArray.push(oCardsModels[key].model);
                    }
                }
                var oOwnerComponent = this.getOwnerComponent();
                if (oOwnerComponent) {
                    for (key in aCardModelArray) {
                        var oCardModel = oOwnerComponent.getModel(aCardModelArray[key]);
                        if (oCardModel) {
                            oCardModel.attachRequestFailed(this.verifyAndSetErrorCard.bind(this));
                            oCardModel.attachRequestSent(this.destroyErrorCardsAndReplaceWithOriginal.bind(this));
                        }
                    }
                }
                // error cards

                //make sure we will not initialize more then ones
                if (this.initialized) {
                    return;
                }
                this.initialized = true;

                this.oFlexibilityPersonalizationPromise.then(function () {
                    jQuery.sap.measure.end("ovp:Personalization");
                    this.persistencyVariantLoaded = true;
                    var oCard;
                    var cardsIntentWithIndex = [], cardsIntent = [];
                    this.aManifestOrderedCards = this._getCardArrayAsVariantFormat(this.getLayout().getContent());
                    /**
                     * Order flow -
                     * 1. We fetch personalization in oVariant
                     * 2. Remove unauthorized cards from manifest-ordered cards
                     * 3. Merge personalization and get ordered cards
                     * 4. Remove unauthorized cards from ordered cards (only in case of full array delta change)
                     * 5. Organize cards
                     */
                    //Check For Authorization
                    for (var counter = 0; counter < this.aManifestOrderedCards.length; counter++) {
                        oCard = this._getCardFromManifest(this.aManifestOrderedCards[counter].id);
                        if (oCard && oCard.settings && oCard.settings.requireAppAuthorization) {
                            cardsIntentWithIndex.push({
                                id: oCard.id,
                                cardIntent: oCard.settings.requireAppAuthorization
                            });
                            cardsIntent.push(oCard.settings.requireAppAuthorization);
                        }
                    }

                    if (cardsIntent.length > 0) {
                        this._checkForAuthorization(cardsIntentWithIndex, cardsIntent);
                    } else {
                        //Merge LREP data
                        this.aOrderedCards = this._mergeLREPContent(this.aManifestOrderedCards);
                        this.organizeCards(this.aOrderedCards);
                    }
                }.bind(this), function (err) {
                    jQuery.sap.log.error("Could not load information from LREP Persistency");
                    jQuery.sap.log.error(err);
                });
                if (Device.system.phone) {
                    SmartphoneHeaderToggle.enable(this);
                }

                setTimeout(function () {
                    if (!this.persistencyVariantLoaded) {
                        this.busyDialog = new BusyDialog({
                            text: this._getLibraryResourceBundle().getText("loading_dialog_text")
                        });
                        this.busyDialog.open();
                        this.busyDialog.addStyleClass('sapOVPBusyDialog');
                    }
                }.bind(this), 500);
            },

            organizeCards: function (aOrderedCards) {

                var oCard;
                var aVisibleCards = [];
                this._updateLayoutWithOrderedCards();
                this._updateDashboardLayoutCards(aOrderedCards);
                if (this.isDragAndDropEnabled()) {
                    this._initShowHideCardsButton();
                }

                this._clearStoredEntities(); //Clear previously temporarily stored entity types

                for (var i = 0; i < this.aOrderedCards.length; i++) {
                    if (this.aOrderedCards[i].visibility) {
                        oCard = this._getCardFromManifest(this.aOrderedCards[i].id);
                        if (oCard) {
                            aVisibleCards.push(oCard);
                        }
                    }
                }

                for (var i = 0; i < aVisibleCards.length; i++) {
                    this._initCardModel(aVisibleCards[i].model);
                    this._loadCardComponent(aVisibleCards[i].template); 	//Load Card template files
                    this._createModelViewMap(aVisibleCards[i]);
                }

                jQuery.sap.measure.start("ovp:CreateLoadingCards", "Create Loading cards", "ovp");
                // First create the loading card
                for (var i = 0; i < aVisibleCards.length; i++) {
                    this.createLoadingCard(aVisibleCards[i]);
                }
                jQuery.sap.measure.end("ovp:CreateLoadingCards");

                // In order to add the below css class after second
                // layout rendering which caused by
                // this._updateLayoutWithOrderedCards()
                setTimeout(function () {
                    this.getLayout().addStyleClass(
                        "ovpLayoutElementShow");
                }.bind(this), 0);

                // Second load each card component and create the
                // card
                // We would like to wait for the loading cards
                // invocation
                setTimeout(
                    function () {
                        jQuery.sap.measure.start(
                            "ovp:CreateCards",
                            "Create cards loop", "ovp");
                        for (var i = 0, j = 0; j < aVisibleCards.length; i++, j++) {
                            // i --> index for ordered cards
                            // j --> index for visible cards

                            // If some cards are not visible, they will be missing in visible cards, but in same order
                            // This causes issue while setting selectedKey as the correct cards are not matched
                            // Hence, keep moving ahead by skipping through invisible cards in ordered cards until match is found
                            while (aVisibleCards[j].id !== aOrderedCards[i].id) {
                                i++;
                            }

                            oCard = aVisibleCards[j];

                            if (!oCard.settings.title) {
                                jQuery.sap.log
                                    .error("title is mandatory for card ID : "
                                    + oCard.id);
                            }
                            if (oCard.settings.tabs) {
                                var iIndex = 0;
                                if (this.aOrderedCards[i].selectedKey && oCard.settings.tabs.length >= this.aOrderedCards[i].selectedKey) {
                                    iIndex = this.aOrderedCards[i].selectedKey - 1;
                                }
                                this.initializeTabbedCard(
                                    oCard, iIndex);
                            }
                            oCard = this._getTemplateForChart(oCard);
                            this._loadCardComponent(oCard.template); 

                            oCard.settings.baseUrl = this._getBaseUrl();
                            //this._initCardModel(oCard.model);			//Loading shifted before for better performance
                            //this._loadCardComponent(oCard.template);	//Loading shifted before for better performance
                            this.createCard(oCard);
                        }
                        this.bFinishedCardsCreationProcess = true;
                        jQuery.sap.measure
                            .end("ovp:CreateCards");
                    }.bind(this), 10);

                if (this.busyDialog) {
                    this.busyDialog.close();
                }
            },

            /* Function to change the card template to sap.ovp.cards.charts.analytical if chart type is donut
             *  @param object
             *  @private
             * */
            _getTemplateForChart: function (oCard) {
                //All the chart cards will enter this function, only the donut card's template is changed to "sap.ovp.cards.charts.analytical", to use the vizFrame 
                if (oCard.template === "sap.ovp.cards.charts.smart.chart") {
                //After the introduction of the smart charts, only donut/time_series charts would continue to use vizFrame i.e, analytical card template 
                //Since smart charts do not support others section in donut as of now, we use our existing vizFrame implementation

                var oView = this.getView();
                var oModel = oView.getModel(oCard.model);
                var oMetaModel = oModel.getMetaModel();
                var oEntitySet = oMetaModel.getODataEntitySet(oCard.settings.entitySet);
                var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
                var oChartAnnotation;
                var chartTypeEnum;
                var oCardObject;
                var bTemplateUpdated = false;
                var sPresentationVariantPath;
                //TODO: Check if presentation variant has visualizations. If yes, only then proceed with further validation else directly set the template to analytical
                if (oCard && oCard.settings) {
                    //Priority 1 - Check for kpi annotation, if it has default presentation variant with visualizations, pick the chart anno from the visualizations
                    if (!bTemplateUpdated && oCard.settings.kpiAnnotationPath) {
                        var oKpiAnnotation = oEntityType[oCard.settings.kpiAnnotationPath];
                        sPresentationVariantPath = oKpiAnnotation.Detail.DefaultPresentationVariant && oKpiAnnotation.Detail.DefaultPresentationVariant.Path;
                        if (sPresentationVariantPath) {
                            oCardObject = this._getTemplateForChartFromVisualization(sPresentationVariantPath, oCard, oModel, oEntitySet, oEntityType);
                            bTemplateUpdated = oCardObject.bTemplateUpdated;
                            if (bTemplateUpdated){
                                //If the template has been updated in the _getTemplateForChartFromVisualization function, do not check for other conditions
                                oCard = oCardObject.oCard;
                                return oCard;
                            }
                        }
                    }
                    if (!bTemplateUpdated && oCard.settings.selectionPresentationAnnotationPath) {
                        //Priority 2 - Check for selectionpresentation annotation, if it has a presentation variant with visualizations, pick the chart anno from the visualizations
                        var oSelectionPresentationVariant = oEntityType[oCard.settings.selectionPresentationAnnotationPath];
                        if (oSelectionPresentationVariant) {
                            sPresentationVariantPath = oSelectionPresentationVariant.PresentationVariant && oSelectionPresentationVariant.PresentationVariant.Path;
                            if (sPresentationVariantPath) {
                                oCardObject = this._getTemplateForChartFromVisualization(sPresentationVariantPath, oCard, oModel, oEntitySet, oEntityType);
                                bTemplateUpdated = oCardObject.bTemplateUpdated;
                                if (bTemplateUpdated){
                                    //If the template has been updated in the _getTemplateForChartFromVisualization function, do not check for other conditions
                                    oCard = oCardObject.oCard;
                                    return oCard;
                                }
                            }
                        }
                    } //TODO if (!sTemplate && oCard.settings.presentationAnnotationPath){}
                    if (!bTemplateUpdated && oCard.settings.presentationAnnotationPath) {
                        sPresentationVariantPath = oCard.settings.presentationAnnotationPath;
                        oCardObject = this._getTemplateForChartFromVisualization(sPresentationVariantPath, oCard, oModel, oEntitySet, oEntityType);
                        bTemplateUpdated = oCardObject.bTemplateUpdated;
                        if (bTemplateUpdated){
                            //If the template has been updated in the _getTemplateForChartFromVisualization function, do not check for other conditions
                            oCard = oCardObject.oCard;
                            return oCard;
                        }
                    }
                    if (!bTemplateUpdated && oCard.settings.chartAnnotationPath) {
                        // If the card settings has chartAnnotationPath, get the annotation and check for the chartType directly.
                        oChartAnnotation = oEntityType[oCard.settings.chartAnnotationPath];
                        chartTypeEnum = oChartAnnotation && oChartAnnotation.ChartType && oChartAnnotation.ChartType.EnumMember;
                        if (chartTypeEnum && chartTypeEnum.split("/")[1] === "Donut") {
                            oCard.template = "sap.ovp.cards.charts.analytical";
                        } else {
                                oCard.template = "sap.ovp.cards.charts.smart.chart"; //For all the chart cards except donut and timeseries
                        }
                    }
                  }
                }
                return oCard;
            },

            /* Function to get the template of the card from visualizations
             *  @param object
             *  @private
             * */
            _getTemplateForChartFromVisualization: function (sPresentationVariantPath, oCard, oModel, oEntitySet, oEntityType) {
                // The path to the presentationVariant annotation might contain "@" in the beginning, if present remove it
                if (/^@/.test(sPresentationVariantPath)) {
                    sPresentationVariantPath = sPresentationVariantPath.slice(1);
                }
                oCard.settings.presentationAnnotationPath = sPresentationVariantPath;
                var aVisualizations = oEntityType[sPresentationVariantPath] && oEntityType[sPresentationVariantPath].Visualizations;
                var index;
                var oChartAnnotation;
                var chartTypeEnum;
                var bTemplateUpdated = false;

                /*
                 *   For chartAnnotationPath (Chart) in Visualizations
                 * */
                if (aVisualizations && aVisualizations.length > 0) {
                    for (index = 0; index < aVisualizations.length; index++) {
                        var sVisualizations = aVisualizations[index].AnnotationPath;
                        if (!sVisualizations) {
                            return {
                                oCard: oCard,
                                bTemplateUpdated : bTemplateUpdated
                            };
                        }
                        sVisualizations.trim(); //Removes spaces in the beginning and the end if any.
                        //The path to any annotation in visualizations might contain "@" in the beginning, if present remove it
                        if (sVisualizations.startsWith("@")) {
                            sVisualizations = sVisualizations.slice(1);
                        }
                        // Check if the annotation present in the visualizations is the chartAnnotation.
                        if (sVisualizations.indexOf("Chart") != -1) {
                            //Update the chartanno path in the card settings
                            oCard.settings.chartAnnotationPath = sVisualizations;
                            oChartAnnotation = oEntityType[sVisualizations];
                            chartTypeEnum = oChartAnnotation && oChartAnnotation.ChartType && oChartAnnotation.ChartType.EnumMember;
                            if (chartTypeEnum && chartTypeEnum.split("/")[1] === "Donut") {
                                oCard.template = "sap.ovp.cards.charts.analytical";
                            } else {
                                    oCard.template = "sap.ovp.cards.charts.smart.chart"; //For all the chart cards except donut and timeseries
                                
                            }
                        }
                        bTemplateUpdated = true; //To be used as a flag to indicate that the template has been updated
                    }
                }
                return {
                    oCard: oCard,
                    bTemplateUpdated : bTemplateUpdated
                };
            },

            /* Function to create a model vs view map
             *  @param object
             *  @private
             * */
            _createModelViewMap: function (oCard) {
                //Create model vs view map
                //Each model object contains view id as its property
                if (!oCard || !oCard.settings || !oCard.model) {
                    return;
                }
                //For cards with static content, model map is not required
                if (!oCard.settings.entitySet || oCard.settings.entitySet === "") {
                    return;
                }
                // For custom cards, model map is not required
                if (!(oCard.template.startsWith("sap.ovp.cards"))) {
                    return;
                }
                var sModelName = oCard.model;
                if (!this.oModelViewMap[sModelName]) {
                    this.oModelViewMap[sModelName] = {};
                }
                this.oModelViewMap[sModelName][oCard.id] = true;
            },

            initializeTabbedCard: function (oCard, iIndex) {
                if (oCard.template == "sap.ovp.cards.charts.analytical" || oCard.template == "sap.ovp.cards.charts.smart.chart") {
                    oCard.settings.chartAnnotationPath = oCard.settings.tabs[iIndex].chartAnnotationPath;
                    oCard.settings.navigation = oCard.settings.tabs[iIndex].navigation;
                }
                oCard.settings.annotationPath = oCard.settings.tabs[iIndex].annotationPath;
                oCard.settings.dynamicSubtitleAnnotationPath = oCard.settings.tabs[iIndex].dynamicSubtitleAnnotationPath;
                oCard.settings.presentationAnnotationPath = oCard.settings.tabs[iIndex].presentationAnnotationPath;
                oCard.settings.selectionAnnotationPath = oCard.settings.tabs[iIndex].selectionAnnotationPath;
                oCard.settings.selectionPresentationAnnotationPath = oCard.settings.tabs[iIndex].selectionPresentationAnnotationPath;
                oCard.settings.kpiAnnotationPath = oCard.settings.tabs[iIndex].kpiAnnotationPath;
                oCard.settings.dataPointAnnotationPath = oCard.settings.tabs[iIndex].dataPointAnnotationPath;
                oCard.settings.identificationAnnotationPath = oCard.settings.tabs[iIndex].identificationAnnotationPath;
                oCard.settings.params = oCard.settings.tabs[iIndex].params;
                oCard.settings.selectedKey = iIndex + 1;
            },

            _getLibraryResourceBundle: function () {
                if (!this.oLibraryResourceBundle) {
                    this.oLibraryResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ovp");
                }
                return this.oLibraryResourceBundle;
            },

            _getOvplibResourceBundle: function () {
                //Resource bundle is already set in owner component
                return this.getOwnerComponent()._getOvpLibResourceBundle();
            },

            _getCardsModel: function () {
                if (!this.oCards) {
                    var oUIModel = this.getUIModel();
                    this.oCards = oUIModel.getProperty("/cards");
                }
                return this.oCards;
            },

            _getBaseUrl: function () {
                var oUIModel = this.getUIModel();
                if (!this.sBaseUrl) {
                    this.sBaseUrl = oUIModel.getProperty("/baseUrl");
                }
                return this.sBaseUrl;
            },

            _getApplicationId: function () {
                var oUIModel = this.getUIModel();
                return oUIModel.getProperty("/applicationId");
            },

            _getCardFromManifest: function (sCardId) {
                var aCards = this._getCardsModel();
                for (var i = 0; i < aCards.length; i++) {
                    if (aCards[i].id === sCardId) {
                        return aCards[i];
                    }
                }

                return null;
            },

            _getCardArrayAsVariantFormat: function (aComponentContainerArray) {
                var aCards = [];

                for (var i = 0; i < aComponentContainerArray.length; i++) {
                    var sId = this._getCardId(aComponentContainerArray[i].getId());
                    aCards.push({
                        id: sId,
                        visibility: aComponentContainerArray[i].getVisible()
                    });
                    var iSelectedKey;
                    if (this.getView() && this.getView().byId) {
                        if (this.getView().byId(sId).getComponentInstance()) {
                            iSelectedKey = this.getView().byId(sId).getComponentInstance().getComponentData().settings.selectedKey;
                        }
                    }

                    if (iSelectedKey) {
                        aCards[aCards.length - 1].selectedKey = iSelectedKey;
                    }

                }
                return aCards;
            },

            // We have all the cards so we check with isIntentSupported
            // if the user has the app within it’s roles and only display the card in this case.
            _checkForAuthorization: function (cardsIntentWithIndex, cardsIntent) {

                //Navigation handler constructor uses ushell container to retrieve app
                //services, without container the instance creation will fall with error
                if (!this.oContainer) {
                    return;
                }
                var that = this;
                var unsupportedCards = [];
                var oNavigationHandler = CommonUtils.getNavigationHandler();
                if (oNavigationHandler && oNavigationHandler.oCrossAppNavService) {
                    oNavigationHandler.oCrossAppNavService.isIntentSupported(cardsIntent).done(function (oResponse) {
                        for (var i = 0; i < cardsIntentWithIndex.length; i++) {
                            if (oResponse[cardsIntentWithIndex[i].cardIntent].supported === false) {
                                unsupportedCards.push(cardsIntentWithIndex[i].id);
                                for (var j = 0; j < that.aManifestOrderedCards.length; j++) {
                                    if (cardsIntentWithIndex[i].id === that.aManifestOrderedCards[j].id) {
                                        that.aManifestOrderedCards.splice(j, 1);
                                        break;
                                    }
                                }
                            }
                        }
                        //Merge LREP data
                        that.aOrderedCards = that._mergeLREPContent(that.aManifestOrderedCards);

                        function removeUnsupportedCards(item, index, arr) {
                            if (item.id === unsupportedCards[this.unsupportedCardIndex]) {
                                arr.splice(index, 1);
                            }
                        }

                        // loop through the unsupported cards list and remove the card from the manifest ordered cards list
                        for (var k = 0; k < unsupportedCards.length; k++) {
                            for (var l = 0; l < that.aOrderedCards.length; l++) {
                                if (that.aOrderedCards[l].id == unsupportedCards[k]) {
                                    that.aOrderedCards.splice(l, 1);
                                    if (that.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                                        //If the card is not authorised remove from aCards of resizable layout
                                        that.getLayout().dashboardLayoutUtil.aCards.map(removeUnsupportedCards, {unsupportedCardIndex: k});
                                        //If the card is not authorised remove from the variant of resizable layout
                                        that.getLayout().dashboardLayoutUtil.dashboardLayoutModel.oLayoutVars.map(removeUnsupportedCards, {unsupportedCardIndex: k});
                                    }
                                    break;
                                }
                            }
                        }
                        that.organizeCards(that.aOrderedCards);

                    }).fail(function () {
                        jQuery.sap.log.error("Could not get authorization from isIntentSupported");
                        //Merge LREP data
                        that.aOrderedCards = that._mergeLREPContent(that.aOrderedCards);
                        that.organizeCards(that.aOrderedCards);
                    });
                }
            },

            /**
             * _mergeLREPContent is called once in first onAfterRendering
             */
            _mergeLREPContent: function (aLayoutCardsArray) {
                var aCards = [];
                var bDeltaArrayPresent = false;
                // if user has a full array of cards available as delta change, should be used instead
                if (this.bDeltaChangesEnabled && Array.isArray(this.deltaCardsInfo) && this.deltaCardsInfo.length > 0) {
                    // add cards to full array delta at the end which are missing from manifest cards
                    aLayoutCardsArray = PersonalizationUtils.addMissingCardsFromManifest(aLayoutCardsArray, this.deltaCardsInfo);
                    bDeltaArrayPresent = true;
                }
                // for dashboard/resizable, we do some extra things
                if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                    if (!bDeltaArrayPresent) {
                        aLayoutCardsArray = this.getLayout().getLayoutDataJSON();
                    }
                    aCards = PersonalizationUtils.mergeChanges(aLayoutCardsArray, this.deltaChanges);
                    this._bDashboardLayoutLrepActive = true;
                    //update dashboardLayoutModel layout
                    this.getLayout().getDashboardLayoutModel().setLayoutVars(aCards);
                } else {
                    aCards = PersonalizationUtils.mergeChanges(aLayoutCardsArray, this.deltaChanges);
                }
                return aCards ? aCards : [];
            },

            _updateLayoutWithOrderedCards: function () {
                var oLayout = this.getLayout();
                var aOrderedCards = this.aOrderedCards;
                oLayout.removeAllContent();
                var aCardsManifest, matchFound = false;
                if (this.getView().getModel("ui") && this.getView().getModel("ui").getProperty("/cards")) {
                    aCardsManifest = this.getView().getModel("ui").getProperty("/cards");
                    // Maybe this check could create issues once the RTA is enabled and Key User can Add and Remove cards
                    //if (aCardsManifest.length !== aOrderedCards.length) {
                    for (var i = 0; i < aCardsManifest.length; i++) {
                        matchFound = false;
                        for (var j = 0; j < aOrderedCards.length; j++) {
                            if (aCardsManifest[i].id == aOrderedCards[j].id) {
                                matchFound = true;
                                break;
                            }
                        }
                        /**In case there are cards in manifest but not displayed on UI due to missing authorization or other reasons then
                         their instance needs to be destroyed else they are recreated with same id's causing duplicate id issue.
                         Here we find such ComponentContainers which are present in manifest but not in displayed cards **/
                        if (!matchFound && this.getView().byId(aCardsManifest[i].id)) {
                            this.getView().byId(aCardsManifest[i].id).destroy();
                        }
                    }
                }

                for (var i = 0; i < aOrderedCards.length; i++) {
                    var oComponentContainer = this.getView().byId(aOrderedCards[i].id);
                    /**
                     * Check if component container exists first before setting visibility.
                     * If manifest cards have been changed after end users have saved personalization, it is possible there are extra cards
                     * in ordererd cards but less cards in manifest. In this case, component container is destroyed already above for mismatched cards.
                     */
                    if (oComponentContainer) {
                        oComponentContainer.setVisible(aOrderedCards[i].visibility);
                        oLayout.addContent(oComponentContainer);
                    }
                }
            },

            /**
             when a card is hidden, we will have to remove it from the error cards
             as it is no longer part of the displayed cards
             */
            _updateErrorCardsArray: function (aCards) {
                var index;
                for (index = 0; index < aCards.length; index++) {
                    var iCardIndex = this.aErrorCards.indexOf(aCards[index].id);
                    if ((iCardIndex > -1) && aCards[index].visibility == false) {
                        this.aErrorCards.splice(iCardIndex, 1);
                    }
                }
            },

            _updateDashboardLayoutCards: function (aCards) {
                if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                    if (this.getLayout().getDashboardLayoutUtil()) {
                        this.getLayout().getDashboardLayoutUtil().updateCardVisibility(aCards);
                    }
                }
            },

            _resetDashboardLayout: function () {
                if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                    if (this.getLayout().getDashboardLayoutUtil()) {
                        this.getLayout().getDashboardLayoutUtil().resetToManifest();
                    }
                    this.getLayout().rerender();
                }
            },

            //Method to extract variants of the card for the resizable layout
            _getCardArrayAsVariantFormatDashboard: function () {
                var aCards = [];
                var oLayout = this.getLayout();
                var aCardsArray = oLayout.dashboardLayoutUtil.aCards;
                oLayout.dashboardLayoutUtil.dashboardLayoutModel._sortCardsByRow(aCardsArray);
                aCardsArray.forEach(function (element) {
                    aCards.push({
                        id: element.id,
                        visibility: element.dashboardLayout.visible
                    });
                });
                return aCards;
            },

            verifyGlobalFilterLoaded: function () {
                //Call search method of SFB. The SFB search method takes care to throw error
                //when validation fails. Else it triggers the search event from SFB.
                //Do a manual validation of mandatory fields and accordingly send true to resolve
                //the global filter loaded promise. If false is returned, then promise not resolved.
                var oGlobalFilter = this.getGlobalFilter();
                if (oGlobalFilter.search()) {
                    if (oGlobalFilter.validateMandatoryFields()) {
                        return true;
                    }
                }
                this.getView().byId("ovpMain").setHeaderExpanded(true);
                return false;
            },

            /**
             * Register to the filterChange event of the filter bar in order to mark that
             * one or more of the filters were changed
             */
            onGlobalFilterChange: function () {
                this.filterChanged = true;
                //Make layout inactive only after global filter is loaded else this
                //interferes with initial application load during iappstate apply
                if (this.bGlobalFilterInitialized) {
                    // when the user enters a filter value and does not click on go
                    // there is an inconsistency between the filter values and data shown on
                    // the OVP cards, we have an overlay over the OVP cards to signify the same
                    var oGlobalFilter = this.getGlobalFilter();
                    var bLiveMode = oGlobalFilter.getLiveMode();
                    var oOvpLayout = this.getLayout();
                    if (!bLiveMode && oOvpLayout) {
                        oOvpLayout.setActive(false);
                    }
                }

                /* Appstate will be created only on filter search triger, so the
                 below piece of code is now commented
                 var oGlobalFilter = this.getGlobalFilter();
                 if (oGlobalFilter && !oGlobalFilter.isDialogOpen()) {
                 this._storeCurrentAppStateAndAdjustURL();
                 }*/
            },


            destroyErrorCardsAndReplaceWithOriginal: function () {

                // destroy error cards and replace with original only when
                // search is triggered from SFB or the model is automatically refreshed
                // using the refresh interval flag
                if (this.isModelRefreshTriggered || this.filterChanged || this.bGoButtonPressed || this.bSearchButtonPressed) {
                    var key;
                    var aErrorCards = this.getErrorCardsAsArray();
                    for (key in aErrorCards) {
                        var oCardComponentContainer = this.getView().byId(aErrorCards[key]);
                        var oComponentInstance = oCardComponentContainer && oCardComponentContainer.getComponentInstance();
                        var oComponentData = oComponentInstance && oComponentInstance.getComponentData();
                        var sCardId = oComponentData && oComponentData.cardId;
                        var oManifestCard = this._getCardFromManifest(sCardId);
                        oComponentInstance.destroy();
                        this.createCard(oManifestCard);
                    }
                    this.isModelRefreshTriggered = false;
                }
            },

            /**
             * Register to the search event of the filter bar in order to refresh all models
             * with the changes in the filter bar (if there are changes) when "go" is clicked
             */
            onGlobalFilterSearch: function () {

                //If GO button is pressed even without changing filter, then also trigger a search
                if (this.filterChanged || this.bGoButtonPressed || this.bSearchButtonPressed) {
                    var oGlobalFilter = this.getGlobalFilter();
                    // we do not have a check here to see if the style class is presen
                    // removestyleclass does not throw any errors if a given classname is not present
                    var aErrorCards = this.getErrorCardsAsArray();
                    if (aErrorCards.length > 0) {
                        // destroy all error cards and set to actual cards.
                        // since the error cards to not have a model associated with them
                        // when the global filter search is triggered, there is a chance the service might return valid data
                        // in this case we have to set the original card
                        this.destroyErrorCardsAndReplaceWithOriginal();
                    }
                    if (oGlobalFilter && !oGlobalFilter.isDialogOpen()) {
                        this._storeCurrentAppStateAndAdjustURL();
                    }
                    this._clearStoredEntities(); //Clear previously temporarily stored entity types

                    // find the list of all the controls in the smart filter bar
                    var items = [];
                    if (this.oGlobalFilter['_aFields'].length > 0) {
                        items = this.oGlobalFilter["_aFields"];
                    } else {
                        var itemList = this.oGlobalFilter['_aFilterBarViewMetadata'];
                        for (var i = 0; i < itemList.length; i++) {
                            var itemGroup = itemList[i];
                            for (var j = 0; j < itemGroup.fields.length; j++) {
                                items.push(itemGroup.fields[j]);
                            }
                        }
                    }

                    // store the reference to the last focus element inside the smart filter bar
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].control) {
                            var control = document.getElementById(items[i].control.sId);
                            if (jQuery(control).hasClass('sapMFocus')) {
                                this.filterItemInFocus = items[i].control;
                                break;
                            }
                        }
                    }

                    var sBatchGroupId = "ovp-" + new Date().getTime();
                    for (var modelKey in this.oCardsModels) {
                        if (this.oCardsModels.hasOwnProperty(modelKey)) {
                            try {
                                //bForceUpdate is set to true, so that it fetches fresh data with
                                //every filter change
                                this.oCardsModels[modelKey].refresh(false, false, sBatchGroupId);
                            } catch (err) {
                                jQuery.sap.log.warning(err);
                            }
                        }
                    }
                    this.filterChanged = false;
                    this.bGoButtonPressed = false;
                    this.bSearchButtonPressed = false;
                    this._clearStoredEntities(); //Clear previously temporarily stored entity types
                }
            },

            _clearStoredEntities: function () {

                if (this.sPreviousEntityType) {
                    this.sPreviousEntityType = "";
                }
                if (this.sCurrentEntityType) {
                    this.sCurrentEntityType = "";
                }
            },

            _processFilters: function () {

                this.aFilters = [];

                //Get filters from smart filter bar
                var oGlobalFilter = this.getGlobalFilter();

                //If Global filters not present, then skip processing
                if (!oGlobalFilter) {
                    return;
                }

                //Get filter data from smart filter bar
                var aFilters = oGlobalFilter.getFilters();

                //Start of Custom Filter Handling
                var oCustomFilter = this.getCustomFilters(); //Get filters from extension object
                if (oCustomFilter && (oCustomFilter instanceof Filter)) {

                    /* Remove the restriction that only SFB custom fields can come as value
                     of getCustomFilters
                     var aCustomFields = this.getVisibleCustomFields();

                     //Check which filters are valid respective to custom fields
                     //Mapping check not required, so send other fields as null
                     oCustomFilter = this._checkRelevantFiltersRecursive(aCustomFields, oCustomFilter, null, null, null, null);
                     */

                    if (oCustomFilter) {
                        var aCombinedFilters = [];

                        if (aFilters && aFilters.length > 0) {
                            aCombinedFilters.push(new Filter([aFilters[0], oCustomFilter], true));
                        } else {
                            aCombinedFilters.push(oCustomFilter);
                        }

                        if (aCombinedFilters.length > 0) {
                            aFilters = aCombinedFilters;
                        }
                    }
                }
                //End of Custom Filter Handling

                this.aFilters = aFilters;

            },

            /**
             *This function will create URL parameters from custom parameters
             * @returns string
             * @private
             */
            _processSearch: function () {

                var sCustomParams , aCustomQueryOptions;
                var oGlobalFilter = this.getGlobalFilter();

                //If Global filters not present, then skip processing
                if (!oGlobalFilter) {
                    return;
                }
                //Get search data from smart filter bar
                var oParameters = oGlobalFilter.getParameters();
                var aCustomQueryOptions = oParameters && oParameters["custom"];

                if (!aCustomQueryOptions) {
                    return;
                }
                for (var sName in aCustomQueryOptions) {
                    sCustomParams =  sName + "=" + jQuery.sap.encodeURL(aCustomQueryOptions[sName]);
                }
                return sCustomParams;
            },

            _initGlobalFilter: function () {
                var oGlobalFilter = this.getGlobalFilter();
                if (!oGlobalFilter) {

                    //When application does not have any global filter, then this flag should not
                    //stop any normal processing that wait for global filter to be loaded
                    this.bGlobalFilterLoaded = true;

                    this._parseNavigationVariant();
                    jQuery.sap.measure.end("ovp:GlobalFilter");
                    return;
                }
                //When filter dialog is closed, take all filters, create appstate and update url
                oGlobalFilter.attachFiltersDialogClosed(this._storeCurrentAppStateAndAdjustURL.bind(this));

                var oVariantManagement = oGlobalFilter.getVariantManagement();
                if (oVariantManagement) {
                    //Attach a function which will be triggered after variant is saved
                    oVariantManagement.attachAfterSave(function (oEvent) {
                        //Update the url appstate with new saved variant
                        this._storeCurrentAppStateAndAdjustURL();
                    }.bind(this));
                }
                this.oGlobalFilterLoadedPromise = new Promise(function (resolve, reject) {

                    //After global filter is initialized (fully initialized)
                    oGlobalFilter.attachInitialized(function () {
                        //Parse navigation variant from the URL (if exists)
                        this._parseNavigationVariant();

                        if (this.oParseNavigationPromise) {
                            this.oParseNavigationPromise.done(function (oAppData, oURLParameters, sNavType) {
                                if (oAppData) {
                                    this._setNavigationVariantToGlobalFilter(oAppData, oURLParameters, sNavType);

                                    //Setting the navigation variants trigger filter change event, we do not want the
                                    //flag to be updated unless a user explicitly changes a filter
                                    this.filterChanged = false;
                                }
                            }.bind(this));
                            this.oParseNavigationPromise.fail(function () {
                                jQuery.sap.log.error("Could not parse navigation variant from URL");
                            });
                            this.oParseNavigationPromise.always(function () {

                                this.bGlobalFilterInitialized = true;
                                if (oGlobalFilter && this.verifyGlobalFilterLoaded()) {
                                    resolve();
                                }
                            }.bind(this));
                        } else {
                            if (oGlobalFilter && this.verifyGlobalFilterLoaded()) {
                                resolve();
                            }
                        }
                    }, this);

                    oGlobalFilter.attachSearch(function () {
                        //If user pressed GO, it means that the required field varification
                        //was allredy done by the globalFilter, therefore we can resolve the promise.
                        //This is needed in case some required field was empty and therefore the promise
                        //object was not resolved in the initial flow, we have to do it now after user
                        //set the filter

                        if (!this.bGlobalFilterLoaded) {
                            resolve();
                            this.bGlobalFilterLoaded = true;
                            if (!oGlobalFilter.isDialogOpen()) {
                                this._storeCurrentAppStateAndAdjustURL();
                            }

                            var oOvpLayout = this.getLayout();
                            if (oOvpLayout) {
                                oOvpLayout.setActive(true);
                            }

                            //At this point, search need not be triggered as cards are not created
                            //because oGlobalFilterLoadedPromise is not resolved
                            return;
                        }
                        this.onGlobalFilterSearch();

                    }, this);
                    oGlobalFilter.attachFilterChange(this.onGlobalFilterChange, this);

                    //Currently private property is used
                    //TODO: Ask SFB to provide a way in search event that it is triggered from GO button
                    oGlobalFilter._oSearchButton && oGlobalFilter._oSearchButton.attachPress(function () {
                        this.bGoButtonPressed = true;
                        var oOvpLayout = this.getLayout();
                        if (oOvpLayout) {
                            oOvpLayout.setActive(true);
                        }
                    }.bind(this));
                }.bind(this));

                this.oGlobalFilterLoadedPromise.then(function (oVariant) {
                    this.bGlobalFilterLoaded = true;
                    jQuery.sap.measure.end("ovp:GlobalFilter");

                    //Currently private property is used
                    //TODO: Ask SFB to provide a way in search event that it is triggered from GO button
                    oGlobalFilter._oBasicSearchField && oGlobalFilter._oBasicSearchField.attachSearch(function () {
                        this.bSearchButtonPressed = true;
                    }.bind(this));
                }.bind(this));
            },

            /* Function to display a popover providing the following options on clicking of Action button in Smart Filter Bar:
             * 1. Send as Email (Share the whole page)
             * 2. Create Tile on FLP
             */
            onShareButtonPress: function (oEvent) {
                var oLibraryResourceBundle = this._getLibraryResourceBundle();
                var oUIModel = this.getUIModel();
                var sTitle = oUIModel && oUIModel.getProperty("/title");
                if (!this._oShareActionButton) {
                    this._oShareActionButton = sap.ui.xmlfragment(
                        "sap.ovp.app.SharePage", {
                            shareEmailPressed: function () {
                                //Trigger email when 'Send Email' is clicked
                                SapMLibrary.URLHelper.triggerEmail(null, oLibraryResourceBundle.getText("Email_Subject", [sTitle]), document.URL);
                            },
                            shareJamPressed: function () {
                                var oShareDialog = sap.ui.getCore().createComponent({
                                    name: "sap.collaboration.components.fiori.sharing.dialog",
                                    settings: {
                                        object: {
                                            id: document.URL,
                                            share: sTitle
                                        }
                                    }
                                });
                                oShareDialog.open();
                            }
                        });
                    this.getView().addDependent(this._oShareActionButton);
                }
                this._oShareActionButton.openBy(oEvent.getSource());
            },


            /**
             * This function checks if the current user has JAM group authorizations
             * and the share to jam button will be displayed accordingly
             */
            _checkJamAuth: function () {
                var fnGetUser = jQuery.sap.getObject("sap.ushell.Container.getUser");
                var oUIModel = this.getUIModel();
                if (oUIModel) {
                    oUIModel.setProperty("/jamVisible", !!fnGetUser && fnGetUser().isJamActive());
                }
            },

            /* Function to set tile information
             *  @private
             * */
            _createModelForTile: function () {
                var oUIModel = this.getUIModel();
                var sHash, sTitle = oUIModel && oUIModel.getProperty("/title");
                var oTileInfo = {
                    tileTitle: sTitle,            //Set the title of the tile
                    tileCustomURL: function () {  //Set the URL that the tile should point to
                        sHash = hasher.getHash();
                        return sHash ? ("#" + sHash) : window.location.href;
                    }
                };
                if (oUIModel) {
                    //Bind the information of the tile to the model
                    oUIModel.setProperty("/tileInfo", oTileInfo);
                }
            },

            _loadCardComponent: function (sComponentName) {
                if (!this.oLoadedComponents[sComponentName]) {
                    jQuery.sap.measure.start("ovp:CardComponentLoad:" + sComponentName, "Card Component load", "ovp");
                    this.oLoadedComponents[sComponentName] = sap.ui.component.load({
                        name: sComponentName,
                        url: jQuery.sap.getModulePath(sComponentName),
                        async: true
                    });
                    this.oLoadedComponents[sComponentName].then(function () {
                        jQuery.sap.measure.end("ovp:CardComponentLoad:" + sComponentName);
                    });
                }
            },

            _initCardModel: function (sCardModel) {
                var sendRelevantFiltersAsParameters = false;
                if (this.oCardsModels[sCardModel] || !sCardModel) {
                    return;
                }
                this.oCardsModels[sCardModel] = this.getView().getModel(sCardModel);
                if (!this.oCardsModels[sCardModel].bUseBatch) {
                    this.oCardsModels[sCardModel].setUseBatch(false);
                } else {
                    this.oCardsModels[sCardModel].setUseBatch(true);
                }
                if (this.getGlobalFilter()) {
                    sendRelevantFiltersAsParameters = true;
                }
                this._overrideCardModelRead(this.oCardsModels[sCardModel], sendRelevantFiltersAsParameters);
            },

            /**
             * This function checks for custom fields in the filter bar that are
             * currently visible to user
             * @returns {object}
             * @public
             */
            getVisibleCustomFields: function () {

                var oGlobalFilter = this.getGlobalFilter();

                var aFilterItems = oGlobalFilter.getAllFilterItems(true);
                var iLen, oItem, aVisibleFields = [];

                if (aFilterItems) {
                    iLen = aFilterItems.length;
                    //loop through all the visible filter items and get their names
                    while (iLen--) {
                        oItem = aFilterItems[iLen];
                        if (oItem && oItem.getVisibleInFilterBar()) {
                            aVisibleFields.push(oItem.getName());
                        }
                    }
                }

                var iGroupCount, iFieldCount, aFields, aFilterBarViewMetadata = oGlobalFilter.getFilterBarViewMetadata();
                var aCustomFields = [];

                //aFilterBarViewMetadata contains a set of arrays, each array pointing to a group
                //of fields

                if (aFilterBarViewMetadata) {

                    iGroupCount = aFilterBarViewMetadata.length;

                    //loop through the groups
                    while (iGroupCount--) {

                        aFields = aFilterBarViewMetadata[iGroupCount].fields;
                        if (aFields) {

                            iFieldCount = aFields.length;

                            //loop through the fields
                            while (iFieldCount--) {

                                //If custom control property is defined and field is visible in filter bar, then add this field
                                if (aFields[iFieldCount].isCustomFilterField && aVisibleFields.indexOf(aFields[iFieldCount].fieldName) > -1) {
                                    aCustomFields.push({
                                        name: aFields[iFieldCount].fieldName
                                    });
                                }
                            }
                        }
                    }
                }

                return aCustomFields;
            },

            /* Function to Show error page or Hide error Page based on the parameter
             *  show : true then show the Error Page
             *  show : false Hide the Error Page
             *  @param boolean
             *  @private
             * */
            _showErrorPage: function (show) {

                //Do not execute the function if manifest settings is set to disable
                //error page
                if (this.bDisableErrorPage) {
                    return;
                }
                var ovpErrorPage = this.getView().byId('ovpErrorPage');
                var ovpMainPage = this.getView().byId('ovpMain');
                if (show) {
                    ovpErrorPage.setVisible(true);
                    ovpMainPage.setVisible(false);
                    return;
                }
                ovpErrorPage.setVisible(false);
                ovpMainPage.setVisible(true);
            },

            /**
             * This function checks the value lists entity names from Smartfilterbar against the input entity name
             * @param oModel
             * @param sEntitySetName
             * @returns {boolean}
             * @private
             */
            _isValueHelpCall: function (oModel, sEntitySetName) {
                var oGlobalFilter = this.getGlobalFilter();
                if (!oModel || !oGlobalFilter || !oGlobalFilter._oFilterProvider) {
                   return false;
                }
                //If the call is not for same model as SFB, then ignore
                if (oModel.getId() !== oGlobalFilter.getModel().getId()) {
                    return false;
                }
                var oFilterProvider = oGlobalFilter._oFilterProvider;
                //Tha APIs getValueHelpProviderInfo() and getValueListProviderInfo() are not yet available and BLIs need
                //to be addressed to Smartfilterbar team, currently done using private attributes of SFb
                /*var aValueHelp = oGlobalFilter.getValueHelpProviderInfo().concat(oGlobalFilter.getValueListProviderInfo());
                for (var i = 0; i < aValueHelp.length; i++) {
                    if (aValueHelp[i].entitySetName === sEntitySetName) {
                        return true;
                    }
                }*/
                //Retrieve all value help entities currently associated with SFB
                var aValueProviders = oFilterProvider.getAssociatedValueHelpProviders().concat(
                    oFilterProvider.getAssociatedValueListProviders()
                );
                var oPrimaryValueListAnnotation;
                for (var i = 0; i < aValueProviders.length; i++) {
                    oPrimaryValueListAnnotation = aValueProviders[i] && aValueProviders[i].oPrimaryValueListAnnotation;
                    if (oPrimaryValueListAnnotation && oPrimaryValueListAnnotation.valueListEntitySetName === sEntitySetName) {
                        return true;
                    }
                }
                return false;
            },

            /**
             * This function is serving two Purpose
             * 1. If sendRelevantFiltersInUrl is true : Then Overriding the read function of the oDataModel with a function
             *    that will first find the relevant filters from the filter bar and then will call the original
             *    read function with the relevant filters as parameters.
             * 2. Providing Additional functionality to capture success and failure callback to show error page if non of
             *    the requests gets successful.
             * @param oModel
             * @param boolean
             * @private
             */
            _overrideCardModelRead: function (oModel, sendRelevantFiltersAsParameters) {
                var fOrigRead = oModel.read;
                var that = this;
                oModel.read = function () {
                    var oParameters = arguments[1];
                    if (!oParameters) {
                        oParameters = {};
                        Array.prototype.push.call(arguments, oParameters);
                    }
                    var oEntityType = that._getEntityTypeFromPath(oModel, arguments[0], oParameters.context, false);
                    var oEntitySet = that._getEntitySetFromEntityType(oModel, oEntityType);

                    //If the call is a value help call initiated from SFB, then call the original model read without
                    //modifying the request
                    if (that._isValueHelpCall(oModel, oEntitySet.name)) {
                        return fOrigRead.apply(oModel, arguments);
                    }

                    //If the call is for a card data, then modify the request to attach global filter data
                    if (sendRelevantFiltersAsParameters) {
                        //Process the filters from smart filter bar
                        that._processFilters();

                        var oGlobalFilter = that.getGlobalFilter();

                        if (!that.aFilters) {	//For initial load case
                            that.aFilters = [];
                        }
                        var bCheckEntity = false;

                      //Process the search from smart filter bar
                        var sCustomParams;
                        var oSearchRestrictions = oEntitySet["Org.OData.Capabilities.V1.SearchRestrictions"];
                        if (oEntitySet["sap:searchable"] === "true" || (oSearchRestrictions && oSearchRestrictions.Searchable && oSearchRestrictions.Searchable.Bool && oSearchRestrictions.Searchable.Bool === "true")){
                            sCustomParams = that._processSearch();
                        }

                        that.sCurrentEntityType = oEntityType.entityType;

                        //If previous call and current call are for same entity, then need not do the
                        //same calculation again
                        if (that.sPreviousEntityType !== that.sCurrentEntityType) {
                            that.sPreviousEntityType = that.sCurrentEntityType;
                            bCheckEntity = true;
                        }

                        if (!that.aRelevantFilters) {	//For initial load case
                            that.aRelevantFilters = [];
                            bCheckEntity = true;
                        }

                        //If recalculation is required
                        //Case when a new entityset is encountered or on initial load
                        if (bCheckEntity) {
                            that.aRelevantFilters = [];
                            if (oEntityType) {
                                that.aRelevantFilters = that._getEntityRelevantFilters(oEntityType, that.aFilters,
                                    oModel, oGlobalFilter.getModel());
                            }

                        }

                        var aUrlParams = oParameters.urlParameters;
                        if (that.aRelevantFilters && that.aRelevantFilters.length > 0) {
                            var foundIndex = -1;
                            if (aUrlParams) {
                                for (var index = 0; index < aUrlParams.length; index++) {
                                    // We use here lastIndexOf instead of startsWith because it doesn't work on safari (ios devices)
                                    if ((aUrlParams[index]).lastIndexOf("$filter=", 0) === 0) {
                                        foundIndex = index;
                                        break;
                                    }
                                }
                            }
                            if (foundIndex >= 0) {
                                aUrlParams[foundIndex] =
                                    aUrlParams[foundIndex] + "%20and%20" +
                                    ODataUtils.createFilterParams(that.aRelevantFilters, oModel.oMetadata, oEntityType).substr(8);
                            } else {
                                oParameters.filters = that.aRelevantFilters;
                            }
                        }
                        if (sCustomParams) {
                            aUrlParams[aUrlParams.length] = sCustomParams;
                        }

                        //Process parameters
                        if (oGlobalFilter && oGlobalFilter.getConsiderAnalyticalParameters()) {

                            var sGlobalAnalyticalPath = oGlobalFilter.getAnalyticBindingPath();
                            var iIndexOf, sOldEntityPath, sNewEntityPath;

                            if (sGlobalAnalyticalPath && sGlobalAnalyticalPath.length > 0) {

                                //For entity mapped to global filter
                                if (oEntityType.entityType === oGlobalFilter.getEntityType()) {

                                    //arguments[0] contains entity path where parameter values need to be updated
                                    sOldEntityPath = arguments[0];
                                    iIndexOf = arguments[0].indexOf('$');
                                    if (iIndexOf > 0) {
                                        sOldEntityPath = arguments[0].substring(0, iIndexOf - 1);
                                    }
                                    sNewEntityPath = sGlobalAnalyticalPath;

                                    //Update entity path
                                    if (sOldEntityPath !== sNewEntityPath) {
                                        arguments[0] = arguments[0].replace(sOldEntityPath, sNewEntityPath);
                                    }

                                } else { //For entities, not mapped to global filter

                                    //From the entity parameter path, extract the parameters and their values
                                    var aEntityParams = that._getParametersFromEntityPath(arguments[0]);
                                    var aGlobalParams = that._getParametersFromEntityPath(sGlobalAnalyticalPath);
                                    var sMappedParameter, sRegEx, sMatch;

                                    //If current entity has params
                                    if (aEntityParams && aEntityParams.length > 0) {

                                        var oParameterEntity = that._getEntityTypeFromPath(oModel, arguments[0], oParameters.context, true);

                                        //Loop around the global filter parameters
                                        for (var i = 0; i < aGlobalParams.length; i++) {

                                            //Get the corresponding parameter of entity that matches global parameter
                                            sMappedParameter = that._getPropertyMapping(aEntityParams, aGlobalParams[i].name,
                                                oParameterEntity.name, oGlobalFilter.getEntityType(), oModel, oGlobalFilter.getModel());

                                            if (sMappedParameter) {

                                                //Expression can be of form "..P1=V1,.." or "..P1=V1)"
                                                //.* denotes any data
                                                //? if for non-greedy shortest search
                                                sRegEx = sMappedParameter + "=.*?[,\)]";

                                                //slice(0,-1) is used to truncate the last character which is ',' or ')'
                                                sMatch = arguments[0].match(new RegExp(sRegEx));

                                                if (sMatch && sMatch.length > 0) {

                                                    sOldEntityPath = sMatch[0].slice(0, -1);
                                                    sNewEntityPath = sMappedParameter + "=" + aGlobalParams[i].sValue;

                                                    //Update entity path
                                                    if (sOldEntityPath !== sNewEntityPath) {
                                                        arguments[0] = arguments[0].replace(sOldEntityPath, sNewEntityPath);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    var oMetaModel = oModel.getMetaModel();
                    var oDataEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
                    aUrlParams = that._getExpandPropertiesForSmartCharts(aUrlParams, oMetaModel, oDataEntityType);

                    /*Storing old function in variable*/
                    var fOrigSuccess = arguments[1].success;
                    /*Appending success function with our custom code*/
                    /*Using IIFE to pass the context of function and the this(that) to the below function*/
                    arguments[1].success = (function (func, that) {
                        return function () {
                            /*Setting the variable to true if it was set to false*/
                            if (!that.errorHandlingObject.atLeastOneRequestSuccess) {
                                that.errorHandlingObject.atLeastOneRequestSuccess = true;
                                /*To Hide error page*/
                                that._showErrorPage(false);
                            }

                            // restoring the focus for the element that was in the focus when global filter was triggered
                            if (that.filterItemInFocus != null) {
                                that.filterItemInFocus.focus();
                                that.filterItemInFocus = null;
                            }

                            /*
                             * checking:
                             * if refresh interval is available and refresh timer is set
                             * resetting the timer and creating a new one with the refresh interval
                             * mentioned in the manifest
                             */

                            if (that.nRefreshInterval !== 0) {
                                if (that.oRefreshTimer !== null) {
                                    clearTimeout(that.oRefreshTimer);
                                }
                                that.attachRefreshInterval(that.nRefreshInterval);
                            }
                            return func.apply(this, arguments);
                        };
                    })(fOrigSuccess, that);

                    /*Storing old function in variable*/
                    var fOrigError = arguments[1].error;
                    /*Appending success function with our custom code*/
                    /*Using IIFE to pass the context of function and the this(that) to the below function*/
                    arguments[1].error = (function (func, that) {
                        return function () {
                            if (!that.errorHandlingObject.atLeastOneRequestSuccess) {
                                /*Clear earlier timeouts*/
                                clearTimeout(that.errorHandlingObject.errorLoadingTimeout);
                                /*Setting timeout as 9 sec after this request get failed,To find if all requests got failed*/
                                that.errorHandlingObject.errorLoadingTimeout = setTimeout(function () {
                                    if (!that.errorHandlingObject.atLeastOneRequestSuccess) {
                                        that._showErrorPage(true);
                                    }
                                }, 9000);
                            }
                            return func.apply(this, arguments);
                        };
                    })(fOrigError, that);
                    return fOrigRead.apply(oModel, arguments);
                };
            },

            /**
             * Function to fetch text properties coming from associated entity. It updates $select params and adds $expand with the association.
             * This function is intended for chart cards only.
             * @param aUrlParams
             * @param oMetaModel
             * @param oDataEntityType
             * @returns {object}
             * @private
             * */
            _getExpandPropertiesForSmartCharts: function (aUrlParams, oMetaModel, oDataEntityType) {
                var aSelectParams;
                var sProperty = "";
                var aParts;
                var oAssociationEnd;
                var tempStr;
                var sExpand = "$expand";
                var bExpandSet = false;
                var bHasSelect = false;
                var sDecodedSelect;
                var sOrigSelect;
                var sUpdatedSelect;
                var sTextKey = "com.sap.vocabularies.Common.v1.Text";
                var allProps = oDataEntityType && oDataEntityType.property;
                
                if (!aUrlParams || !(aUrlParams.length > 0)) {
                    return aUrlParams;
                }
                
                for (var l = 0; l < aUrlParams.length; l++) {
                    if (aUrlParams[l].indexOf("$expand") > -1) {
                        //If the aUrlParams contain $expand, the card is definitely not a chart card
                        return aUrlParams;
                    }
                }
                for (var selectPosition = 0; selectPosition < aUrlParams.length; selectPosition++) {
                    //Check for $select as all the data calls for CHARTS will have $select
                    if (aUrlParams[selectPosition].indexOf("$select") > -1) {
                        bHasSelect = true;
                        sOrigSelect = aUrlParams[selectPosition];//Make a copy of the $select
                        tempStr = aUrlParams[selectPosition].split("$select=");
                        if (tempStr && tempStr[1]) {
                            //Sometimes the URI can be encoded, decode the URI and edit it.
                            sDecodedSelect = decodeURIComponent(tempStr[1]);
                            aSelectParams = sDecodedSelect.split(",");//Split at , to seperate the properties
                            if (!aSelectParams || !(aSelectParams.length > 1)){
                                //For chart cards, aSelectParams.length should always be > 1. aSelectParams.length = 1 for KPI value call
                                return aUrlParams;
                            }
                        }
                        break;
                    }
                }

                if (!bHasSelect) {
                    return aUrlParams; 
                }

                if (!aSelectParams || !(aSelectParams.length > 0) || !allProps || !(allProps.length > 0)) {
                    return aUrlParams;
                }

                /*
                 * For every parameter in selectParams, loop through the properties in the metadata
                 * */
                for (var j = 0; j < aSelectParams.length; j++) {
                    for (var k = 0; k < allProps.length; k++) {
                        //For every property in $select loop over all the properties for sap:text or text association
                        if (aSelectParams[j] == (allProps[k] && allProps[k].name)) {
                            //This functionality is only for smart charts, hence check for aggregation role in metadata of the prop
                            if (allProps[k] && allProps[k]["sap:aggregation-role"] && allProps[k]["sap:aggregation-role"] == "dimension") {
                                if (!allProps[k][sTextKey] || !allProps[k][sTextKey].Path || !(allProps[k][sTextKey].Path.indexOf("/") > 0)) {
                                    break;
                                }
                                sProperty = allProps[k][sTextKey].Path;
                                aParts = sProperty.split("/"); //For Text coming from navigation property
                                if (!aParts.length) {
                                    break;
                                }
                                oAssociationEnd = oMetaModel.getODataAssociationEnd(oDataEntityType, aParts[0]); //Check if it's a valid association
                                if (!oAssociationEnd) {
                                    break;
                                }
                                if (!bExpandSet) {
                                    //No $expand in urlparam yet
                                    sExpand = sExpand + "=" + aParts[0];
                                    bExpandSet = true;
                                } else if (bExpandSet) {
                                    //$expand already exists in urlparam
                                    sExpand = sExpand + "," + aParts[0];
                                }
                                //Form the $select string
                                sUpdatedSelect = sOrigSelect + "," + sProperty;
                            }
                            break; //No need to check for other props
                        }
                    }
                }
                if (sUpdatedSelect && sExpand) {
                    //aUrlParams[i] will still have $select because we broke out of the loop on top
                    aUrlParams[selectPosition] = sUpdatedSelect; // $select=......&$expand=....
                    //aUrlParams[aUrlParams.length] = sExpand;
                    aUrlParams.push(sExpand);
                }
                return aUrlParams;
            },

            attachRefreshInterval: function (nRefreshInterval) {
                this.oRefreshTimer = setTimeout(function () {
                    var oLayout = this.getLayout();
                    if (oLayout && oLayout.getActive()) {
                        for (var modelKey in this.oCardsModels) {
                            //console.log("refreshing : " + modelKey);
                            this.isModelRefreshTriggered = true;
                            this.oCardsModels[modelKey].refresh(false, false);
                        }
                    }
                }.bind(this), nRefreshInterval);
            },

            /**
             * This is a temporary function used to retrieve the EntityType from a given path to an entity.
             * This function is required due to fact that the function _getEntityTypeByPath of the ODataMetadata is not public.
             * @param oModel
             * @param sPath
             * @param oContext
             * @returns {object}
             * @private
             */
            _getEntityTypeFromPath: function (oModel, sPath, oContext, bIsParameter) {
                //TODO need to request UI5 to have this a public API!!!!
                var sNormPath = ODataModel.prototype._normalizePath.apply(oModel, [sPath, oContext]);

                //For parameter entities,remove all parameters and then extract the actual
                //parameter entity name. If not done, then it will fetch result entity type
                if (bIsParameter) {
                    sNormPath = sPath.replace(/^\/|\/$/g, "").split("/")[0];
                    if (sNormPath.indexOf("(") != -1) {
                        sNormPath = sNormPath.substring(0, sNormPath.indexOf("("));
                    }
                }

                var oEntityType = ODataMetadata.prototype._getEntityTypeByPath.apply(oModel.oMetadata, [sNormPath]);
                return oEntityType;
            },

            /**
             * Function to pick the metamodel and return the entityset for a given
             * entitytype
             * @param oModel
             * @param oEntityType
             * @returns {object}
             * @private
             */
            _getEntitySetFromEntityType: function (oModel, oEntityType) {
                if (!oModel || !oEntityType) {
                    return;
                }
                var oMetaModel = oModel.getMetaModel();
                var oEntityContainer = oMetaModel && oMetaModel.getODataEntityContainer();
                var aEntitySet = oEntityContainer && oEntityContainer.entitySet;
                if (!aEntitySet || !jQuery.isArray(aEntitySet)) {
                    return;
                }
                //Loop through all entity sets and find matching for given entity type
                var iLen = aEntitySet.length;
                for (var i = 0; i < iLen; i++) {
                    if (aEntitySet[i].entityType === oEntityType.entityType) {
                        return aEntitySet[i];
                    }
                }
            },

            /**
             * This function takes a set of entity properties and tries to find a
             * match or a mapped property by comparing to a provided property name
             * @param aEntityProperties
             * @param sTargetProperty
             * @param sEntityname
             * @param sTargetEntityname
             * @param oEntityModel
             * @param oTargetModel
             * @returns {string}
             * @private
             */
            _getPropertyMapping: function (aEntityProperties, sTargetProperty, sEntityname, sTargetEntityname, oEntityModel, oTargetModel) {

                var i, sMappedProperty;

                //Check if entity property found with same name
                for (i = 0; i < aEntityProperties.length; i++) {
                    if (aEntityProperties[i].name === sTargetProperty) {
                        sMappedProperty = aEntityProperties[i].name;
                        return sMappedProperty;
                    }

                    //If direct match not found then check for fuzzy logic using "P_"
                    if ((("P_" + aEntityProperties[i].name) === sTargetProperty) ||
                        (aEntityProperties[i].name === ("P_" + sTargetProperty))) {
                        sMappedProperty = aEntityProperties[i].name;
                        return sMappedProperty;
                    }

                }

                //sEntityname, sTargetEntityname and oModel are optional, if not passed annotation mapping will not be considered
                if (!sEntityname || !sTargetEntityname || !oEntityModel || !oTargetModel) {
                    return;
                }

                //If direct property not found, then check for mapped property

                var oEntity = oEntityModel.oMetadata._getEntityTypeByName(sEntityname);
                var oTargetEntity = oTargetModel.oMetadata._getEntityTypeByName(sTargetEntityname);

                if (!oEntity || !oTargetEntity) {
                    return;
                }

                var s_semantic_object = "com.sap.vocabularies.Common.v1.SemanticObject";
                var s_semantic_map = "com.sap.vocabularies.Common.v1.SemanticObjectMapping";

                var oEntityModelAnnotations = oEntityModel.oAnnotations.getAnnotationsData();
                if (!oEntityModelAnnotations || !oEntityModelAnnotations.propertyAnnotations) {
                    return;
                }
                var oEntityPropAnnotations = oEntityModelAnnotations.propertyAnnotations[oEntity.namespace + "." + oEntity.name];

                var oTargetModelAnnotations = oTargetModel.oAnnotations.getAnnotationsData();
                if (!oTargetModelAnnotations || !oTargetModelAnnotations.propertyAnnotations) {
                    return;
                }
                var oTargetPropAnnotations = oTargetModelAnnotations.propertyAnnotations[oTargetEntity.namespace + "." + oTargetEntity.name]; //Global filter entity annotations
                var oTargetPropAnnotation = oTargetPropAnnotations && oTargetPropAnnotations[sTargetProperty];

                //If annotations present for sTargetProperty, then only search entity annotations for a mapping
                if (!oTargetPropAnnotation || !oTargetPropAnnotation[s_semantic_object]) {
                    return;
                }

                var sPropertyKey, oEntityPropAnnotation, aMappedAnnotation, iMapCount, sLocalProperty;

                //Loop through annotations for each property in entity
                for (sPropertyKey in oEntityPropAnnotations) {

                    oEntityPropAnnotation = oEntityPropAnnotations[sPropertyKey];

                    //If entity current property and filter property annotations contain same semantic object
                    if (oEntityPropAnnotation[s_semantic_object] &&
                        oEntityPropAnnotation[s_semantic_object].String === oTargetPropAnnotation[s_semantic_object].String) {

                        aMappedAnnotation = oEntityPropAnnotation[s_semantic_map];

                        //If mapping not present
                        if (!aMappedAnnotation) {
                            continue; //go to next loop
                        }

                        iMapCount = aMappedAnnotation.length;
                        sLocalProperty = "";

                        //Check all mappings for a match
                        while (iMapCount--) {
                            if (aMappedAnnotation[iMapCount].SemanticObjectProperty.String === sTargetProperty) {
                                sLocalProperty = aMappedAnnotation[iMapCount].LocalProperty.PropertyPath;
                                break; //Match found
                            }
                        }

                        //Local property found for entity
                        //Verify if property is present in entity before returning
                        if (sLocalProperty !== "") {
                            for (i = 0; i < aEntityProperties.length; i++) {
                                if (aEntityProperties[i].name === sLocalProperty) {
                                    sMappedProperty = aEntityProperties[i].name;
                                    return sMappedProperty;
                                }
                            }
                        }
                    }
                }

                return sMappedProperty;

            },

            /**
             * This function takes an entity path as input and breaks it into
             * parameters and values
             * @param sEntityPath
             * @returns {array}
             * @private
             */
            _getParametersFromEntityPath: function (sEntityPath) {

                //Remove any section like sorters,filters after ? sign
                //Check if some pattern present like "(parameterdata)" with atleast one = sign
                //Atleast one = sign means the parameter is of format P1 = V1
                //'('and ')' are used with escape characters.
                //'.*' means any data
                sEntityPath = sEntityPath.split("?")[0];
                var aMatch = sEntityPath.match(/\(.*=.*\)/);
                var aEntityParams = [];

                //If a matching substring is not found, then null is returned by match function
                if (!aMatch) {
                    return aEntityParams;
                }

                //Match returns an array, so take the first match from array
                //Replace start and end bracket using slice()
                //Remove any leading or lagging spaces
                //Split string whenever a '=' or a ',' is encountered
                //'=' separates params from values, and ',' separates two params
                var aParamsAndValues = aMatch[0].slice(1, -1).trim().split(/\=|\,/);

                //In aParamsAndValues, odd places contain param names and even places contain values
                for (var i = 0; i < aParamsAndValues.length; i = i + 2) {
                    aEntityParams.push({
                        name: aParamsAndValues[i],
                        sValue: aParamsAndValues[i + 1]  //This value is URI encoded as we take it from URI path
                    });
                }
                return aEntityParams;
            },

            /**
             * This function recursively checks the nested filters and returns the relevant filters
             * that match any of the entity properties.
             * @param aEntityProperties
             * @param oFilterDetails
             * @param sEntityname
             * @param sTargetEntityname
             * @param oEntityModel
             * @param oTargetModel
             * @returns {object}
             * @private
             */
            _checkRelevantFiltersRecursive: function (aEntityProperties, oFilterDetails, sEntityname, sTargetEntityname, oEntityModel, oTargetModel) {

                if (!oFilterDetails._bMultiFilter) {	//End point of recursion (base case)

                    oFilterDetails.sPath = oFilterDetails.sPath.split('/').pop();

                    //Get the mapping property. This would return the same property name in case a match is found
                    //or else a property that is mapped in annotations. If nothing is found, then it returns null
                    var sMappedProperty = this._getPropertyMapping(aEntityProperties, oFilterDetails.sPath, sEntityname
                        , sTargetEntityname, oEntityModel, oTargetModel);
                    if (sMappedProperty) {
                        oFilterDetails.sPath = sMappedProperty;
                        return oFilterDetails;
                    }

                } else {

                    //For multifilter cases, there are deep structures
                    var aDeepFilters = oFilterDetails.aFilters;
                    var oSelectedFilter, aSelectedFilters = [];

                    if (aDeepFilters) {

                        for (var i = 0; i < aDeepFilters.length; i++) {

                            //Get the relevant filter object for each internal filter
                            oSelectedFilter = this._checkRelevantFiltersRecursive(aEntityProperties, aDeepFilters[i], sEntityname
                                , sTargetEntityname, oEntityModel, oTargetModel);
                            if (oSelectedFilter) {
                                aSelectedFilters.push(oSelectedFilter);
                            }
                        }
                        if (aSelectedFilters.length > 0) {
                            return (new Filter(aSelectedFilters, oFilterDetails.bAnd));
                        }
                    }
                }
            },

            /**
             * This function goes over the provided list of filters and checks which filter appears as a field
             * in the EntityType provided. The fields that appears in both lists  (filters and EntityType fields)
             * will be returned in an array.
             * @param oEntityType
             * @param aFilters
             * @param oEntityModel
             * @param oFilterModel
             * @returns {array}
             * @private
             */
            _getEntityRelevantFilters: function (oEntityType, aFilters, oEntityModel, oFilterModel) {

                var oReturnFilterWrap = [];

                if (aFilters.length > 0 && oEntityType) {
                    var oReturnFilter = this._checkRelevantFiltersRecursive(oEntityType.property, aFilters[0],
                        oEntityType.name, this.getGlobalFilter().getEntityType(), oEntityModel, oFilterModel);

                    //Wrap the return filter in an array
                    if (oReturnFilter) {
                        oReturnFilterWrap.push(oReturnFilter);
                    }
                }
                return oReturnFilterWrap;
            },

            /*
             Check derived Card Component is implemented with respect to the below restrictions:

             Custom card must be instance of sap.ovp.cards.generic.Component. In other words, custom card must extend sap.ovp.cards.generic.Component.
             If sap.ovp.cards.generic.Card view is replaced by another custom View it means the custom card is not valid.
             [If the extended Component has customization (under the component metadata) and the sap.ovp.cards.generic.Card is replaced by another view (using sap.ui.viewReplacements)]
             If the extended Component overrides the createContent function of the base sap.ovp.cards.generic.Component class, the custom card is not valid.
             If the extended Component overrides the getPreprocessors function of the base sap.ovp.cards.generic.Component class, the custom card is not valid.

             */
            _checkIsCardValid: function (sCardTemplate) {
                var sComponentClassName = sCardTemplate + ".Component";
                var oComponentMetadata, oCustomizations;

                jQuery.sap.require(sComponentClassName);
                var oComponentClass = jQuery.sap.getObject(sComponentClassName);

                if (!oComponentClass) {
                    return false;
                }

                if ((oComponentClass !== Component) && !(oComponentClass.prototype instanceof Component)) {
                    return false;
                }

                if ((oComponentMetadata = oComponentClass.getMetadata()) && (oCustomizations = oComponentMetadata.getCustomizing())) {
                    //if OVP Card view was replaced
                    if (oCustomizations["sap.ui.viewReplacements"] && oCustomizations["sap.ui.viewReplacements"]["sap.ovp.cards.generic.Card"]) {
                        return false;
                    }
                }
                if (oComponentClass.prototype.createContent != Component.prototype.createContent) {
                    return false;
                }

                if (oComponentClass.prototype.getPreprocessors != Component.prototype.getPreprocessors) {
                    return false;
                }

                return true;
            },

            _createCardComponent: function (oView, oModel, card) {
                /**
                 * Tenperory change so that we can see the loading cards.
                 * Disabling creation of the original cards.
                 */
                //if (card.template && card.template !== "sap.ovp.cards.loading") {
                //    return;
                //}
                var sId = "ovp:CreateCard-" + card.template + ":" + card.id;
                jQuery.sap.measure.start(sId, "Create Card", "ovp");
                var oi18nModel = oView.getModel("@i18n");
                if (card.template && this._checkIsCardValid(card.template)) {
                    var oComponentConfig = {
                        async: true,
                        name: card.template,
                        componentData: {
                            model: oModel,
                            modelName: card.model,
                            i18n: oi18nModel,
                            cardId: card.id,
                            settings: card.settings,
                            appComponent: this.getOwnerComponent(),
                            mainComponent: this
                        }
                    };
                    var oGlobalFilter = this.getGlobalFilter();

                    if (card.errorReason) {
                        oComponentConfig.componentData.errorReason = card.errorReason;
                    }
                    if (oGlobalFilter) {
                        oComponentConfig.componentData.globalFilter = {
                            getUiState: oGlobalFilter.getUiState.bind(oGlobalFilter)
                        };
                    }

                    //Component creation will be done asynchronously
                    var oThatView = oView;
                    sap.ui.component(oComponentConfig).then(function (oComponent) {

                        var oComponentContainer = oThatView.byId(oComponent.getComponentData().cardId);
                        oComponentContainer.setPropagateModel(true);
                        var oOldCard = oComponentContainer.getComponentInstance();

                        //Add the card component to the container
                        oComponentContainer.setComponent(oComponent);

                        //Destroy any old card
                        if (oOldCard) {
                            //currently the old component is not destroyed when setting a different component
                            //so we need to do that in timeout to make sure that it will not be destroyed
                            //too early, before real card will be rendered on the screen.
                            setTimeout(function () {
                                oOldCard.destroy();
                            }, 0);
                        }

                    });
                } else {
                    // TODO: define the proper behavior indicating a card loading failure
                    jQuery.sap.log.error("Could not create Card from '" + card.template + "' template. Card is not valid.");
                }
                jQuery.sap.measure.end(sId);
            },

            createErrorCard: function (card, reason) {
                var errorCard = jQuery.extend(true, {}, card, {
                    template: "sap.ovp.cards.error"
                });
                errorCard.errorReason = jQuery.extend({}, reason);
                errorCard.settings.oldTemplate = card.template;
                errorCard.settings.template = "sap.ovp.cards.error";
                this._createCardComponent(this.getView(), undefined, errorCard);
            },

            createLoadingCard: function (card) {
                /*
                 * we have to make sure metadata and filter are loaded before we create the card
                 * so we first create loading card and once all promises will be resulved
                 * we will create the real card and replace the loading card
                 */
                var loadingCard = jQuery.extend(true, {}, card, {
                    template: "sap.ovp.cards.loading"
                });
                this._createCardComponent(this.getView(), undefined, loadingCard);
            },

            createCard: function (card) {
                var oView = this.getView();
                var oModel = oView.getModel(card.model);

                ///*
                // * we have to make sure metadata and filter are loaded before we create the card
                // * so we first create loading card and once all promises will be resulved
                // * we will create the real card and replace the loading card
                // */

                Promise.all([
                    oModel.getMetaModel().loaded(),
                    this.oGlobalFilterLoadedPromise,
                    this.oLoadedComponents[card.template]
                ]).then(
                    function () {
                        this._createCardComponent(oView, oModel, card);
                    }.bind(this),
                    function (reason) {
                        jQuery.sap.log.error("Can't load card with id:'" + card.id + "' and type:'" + card.template + "', reason:" + reason);
                    }
                );
            },

            /**
             * The function gets an UI5 generated id and returns the element original Id
             *
             * @param {string} generatedId - the UI5 generated id
             * @param {string} elementId - the element original  id
             */
            _getCardId: function (generatedId) {
                var appIdString = this.getView().getId() + "--";
                if (generatedId.indexOf(appIdString) != -1) {
                    var start = generatedId.indexOf(appIdString) + appIdString.length;
                    return generatedId.substr(start);
                }
                return generatedId;
            },

            _initFlexibilityPersonalization: function () {
                this.oFlexibilityPersonalizationPromise = new Promise(function (resolve, reject) {
                    var oLayout = this.getLayout();
                    this.oFlexController = FlexControllerFactory.createForControl(oLayout);
                    // ensure getting the changes and only then proceed forward
                    this.oFlexController.getComponentChanges().then(function (aChanges) {
                        if (aChanges.length > 0) {
                            this.bDeltaChangesEnabled = true;
                        }
                        resolve();
                    }.bind(this), function (oError) {
                        // No Lrep
                        // We resolve even in error scenario as the changes will be fetched from Vaiant
                        // TODO: Check from UX for error handling if message is to be shown on UI.
                        resolve();
                    });
                }.bind(this));
            },

            layoutChanged: function (oEvent) {
                // remove duplicate card entries, reduce number of changes, one change per affected card
                var aChanges = oEvent.getParameter("positionChanges");
                var aChangesForSave = [], aCheckedChanges = [];
                var oChange, sCardId;
                if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                    var iColCount = this.getLayout().dashboardLayoutUtil.dashboardLayoutModel.iColCount;
                    if (aChanges) {
                        for (var i = aChanges.length - 1; i >= 0; i--) {
                            oChange = aChanges[i];
                            sCardId = oChange.content.cardId;
                            if (oChange.content.dashboardLayout.oldRow && oChange.content.dashboardLayout.oldRow === oChange.content.dashboardLayout.row &&
                                oChange.content.dashboardLayout.oldColumn && oChange.content.dashboardLayout.oldColumn === oChange.content.dashboardLayout.column) {
                                continue;
                            }
                            if (aCheckedChanges[sCardId]) {
                                if (oChange.content.dashboardLayout.oldRow) {
                                    aCheckedChanges[sCardId].content.dashboardLayout.oldRow = oChange.content.dashboardLayout.oldRow;
                                }
                                continue;
                            }
                            aCheckedChanges[sCardId] = oChange;
                        }
                        Object.keys(aCheckedChanges).forEach(function (sKey) {
                            var oChange = aCheckedChanges[sKey];
                            if (oChange.content.dashboardLayout.oldRow && oChange.content.dashboardLayout.oldRow === oChange.content.dashboardLayout.row &&
                                oChange.content.dashboardLayout.oldColumn && oChange.content.dashboardLayout.oldColumn === oChange.content.dashboardLayout.column) {
                                return;
                            }
                            aChangesForSave.push(aCheckedChanges[sKey]);
                        });
                        // move the values to column level
                        aChangesForSave.forEach(function (oChange) {
                            var oTemp = oChange.content.dashboardLayout;
                            oChange.content.dashboardLayout = {};
                            oChange.content.dashboardLayout["C" + iColCount] = oTemp;
                        });
                    }
                } else {
                    // to maintain the restore/reset functionality in Manage Cards scenario, update the aOrderedCards
                    // TODO: enable/disable to restore/reset button can be improved with a flag updated on personalization save.
                    var aContent = this.getLayout().getContent();
                    this.aOrderedCards = this._getCardArrayAsVariantFormat(aContent);
                    aChangesForSave = aChanges;
                }
                this.savePersonalization(aChangesForSave);
            },

            /**
             * As of 1708,
             * the personalization will use savePersonalization.
             */
            saveVariant: function (oEvent) {
                var that = this;
                this.smartVariandManagement.getVariantsInfo(function (aVariants) {
                    var oPersonalisationVariantKey = null;
                    if (aVariants && aVariants.length > 0) {
                        oPersonalisationVariantKey = aVariants[0].key;
                    }
                    var bOverwrite = oPersonalisationVariantKey !== null;

                    var oParams = {
                        name: "Personalisation",
                        global: false,
                        overwrite: bOverwrite,
                        key: oPersonalisationVariantKey,
                        def: true
                    };
                    that.smartVariandManagement.fireSave(oParams);
                });
            },

            /**
             * delta changes
             *
             * Personalization is saved as flexibility delta changes from 1708
             * Includes - positioning, resizing, view switches and visibility
             */
            savePersonalization: function (oChange) {
                var oLayout = this.getLayout();
                if (oLayout) {
                    if (oChange) {
                        if (!Array.isArray(oChange)) {
                            this.oFlexController.createAndApplyChange(oChange, oLayout);
                        } else {
                            oChange.forEach(function (oOneChange) {
                                this.oFlexController.createAndApplyChange(oOneChange, oLayout);
                            }.bind(this));
                        }
                        this.oFlexController.saveAll();
                        return;
                    }
                    var aCardsInfo, sChangeType;
                    if (oLayout.getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                        aCardsInfo = {
                            cards: oLayout.getLayoutDataJSON()
                        };
                        sChangeType = "manageCardsForDashboardLayout";
                    } else {
                        aCardsInfo = this._getCardArrayAsVariantFormat(oLayout.getContent());
                        sChangeType = "manageCardsForEasyScanLayout";
                    }
                    /**
                     * This currently saves the complete array of cards as one change.
                     * In order to align with key user, we need to save at least visibility as individual card changes.
                     */
                    this.oFlexController.createAndApplyChange({
                        changeType: sChangeType,
                        content: aCardsInfo,
                        isUserDependent: true
                    }, oLayout);
                    this.oFlexController.saveAll();
                }
            },
            /**
             * end
             */

            getLayout: function () {
                return this.getView() ? this.getView().byId("ovpLayout") : null;
            },

            _initShowHideCardsButton: function () {
                // code changes based on the inputs from the FLP team - incident #1770148144
                var oRenderer = sap.ushell.Container.getRenderer("fiori2"),
                    manageCardsButton = {
                        controlType: "sap.ushell.ui.launchpad.ActionItem",
                        bCurrentState: false,
                        oControlProperties: {
                            icon: "sap-icon://dimension",
                            text: this._getLibraryResourceBundle().getText("hideCardsBtn_title"),
                            tooltip: this._getLibraryResourceBundle().getText("hideCardsBtn_tooltip"),
                            press: this._onCardMenuButtonPress.bind(this)
                        },
                        bIsVisible: true,
                        aStates: ["app"]
                    };
                oRenderer.addUserAction(manageCardsButton);
            },

            _onCardMenuButtonPress: function () {
                var oModel,
                    sLayoutName = this.getLayout().getMetadata().getName();

                // maintain array of changes to be saved as delta changes on OK
                this.visibilityChanges = [];

                function getCardIndexInArray(aCardsArr, cardId) {
                    for (var i = 0; i < aCardsArr.length; i++) {
                        if (aCardsArr[i].id == cardId) {
                            return i;
                        }
                    }
                    return -1;
                }

                function createOrDestroyCards(aOldContent, aNewContent, bResetInDashboardLayout) {
                    var oldIndex = -1;
                    for (var i = 0; i < aNewContent.length; i++) {
                        //In case the card position has been changed, we need to get the card index in the old array.
                        //Otherwise, the new and the old position are the same
                        if (aOldContent[i].id == aNewContent[i].id) {
                            oldIndex = i;
                        } else {
                            oldIndex = getCardIndexInArray(aOldContent, aNewContent[i].id);
                        }
                        var oOldComponentContainer = this.getView().byId(aNewContent[i].id);
                        var oOldCard = oOldComponentContainer.getComponentInstance();
                        if (bResetInDashboardLayout) {
                            if (oOldCard) {
                                oOldCard.destroy();
                            }
                        }

                        if (aNewContent[i].visibility != aOldContent[oldIndex].visibility || bResetInDashboardLayout) {
                            if (aNewContent[i].visibility === true) {
                                var oCard = this._getCardFromManifest(aNewContent[i].id);
                                if (oCard) {
                                    this.createLoadingCard(oCard);
                                    oCard.settings.baseUrl = this._getBaseUrl();
                                    this._clearStoredEntities(); //Clear previously temporarily stored entity types
                                    this._initCardModel(oCard.model);
                                    oCard = this._getTemplateForChart(oCard);
                                    this._loadCardComponent(oCard.template);
                                    this._createModelViewMap(oCard);
                                    if (oCard.settings.tabs) {
                                        var iIndex = 0;
                                        if (this.aOrderedCards[i].selectedKey && oCard.settings.tabs.length >= this.aOrderedCards[i].selectedKey) {
                                            iIndex = this.aOrderedCards[i].selectedKey - 1;
                                        }
                                        this.initializeTabbedCard(
                                            oCard, iIndex);
                                    }
                                    this.createCard(oCard);
                                }
                            } else {
                                if (oOldCard) {
                                    oOldCard.destroy();
                                }
                            }
                        }
                    }
                }

                function cardTitleFormatter(id) {
                    var oCard = this._getCardFromManifest(id);
                    if (oCard) {
                        var cardSettings = oCard.settings;
                        if (cardSettings.title) {
                            return cardSettings.title;
                        } else if (cardSettings.category) {
                            return (cardSettings.category);
                        } else if (cardSettings.subTitle) {
                            return cardSettings.subTitle;
                        }
                        return id;
                    } else {
                        jQuery.sap.log.error("Card id " + id + " is not available in the manifest");
                        return "";
                    }
                }

                var oCardsTableTemplate = new ColumnListItem({
                    cells: [
                        new Text({
                            text: {
                                path: "id",
                                formatter: cardTitleFormatter.bind(this)
                            }
                        }),
                        new Switch({
                            state: "{visibility}",
                            customTextOff: " ",
                            customTextOn: " ",
                            change: function (event) {
                                var parent = event.oSource.getParent();
                                parent.toggleStyleClass('sapOVPHideCardsTableItem');
                                parent.getCells()[0].toggleStyleClass('sapOVPHideCardsDisabledCell');
                                var oCard = event.getSource().getBindingContext().getObject();
                                var iIsCardChangedAgain = this.visibilityChanges.findIndex(function (oChange, iIndex, arr) {
                                    return oChange.content.cardId === oCard.id;
                                });
                                if (iIsCardChangedAgain > -1) {
                                    this.visibilityChanges.splice(iIsCardChangedAgain, 1);
                                } else {
                                    this.visibilityChanges.push({
                                        changeType: "visibility",
                                        content: {
                                            cardId: oCard.id,
                                            visibility: event.getParameter("state")
                                        },
                                        isUserDependent: true
                                    });
                                }
                            }.bind(this),
                            tooltip: this._getLibraryResourceBundle().getText("hideCards_switchTooltip")
                        })
                    ]
                });

                var oCardsTable = new Table("sapOVPHideCardsTable", {
                    backgroundDesign: BackgroundDesign.Transparent,
                    showSeparators: ListSeparators.Inner,
                    columns: [
                        new Column({
                            vAlign: "Middle"
                        }),
                        new Column({
                            hAlign: TextAlign.Right,
                            vAlign: "Middle",
                            width: "4.94rem"
                        })
                    ]
                });
                oCardsTable.addStyleClass('sapOVPHideCardsTable');
                oCardsTable.bindItems({
                    path: "/cards",
                    template: oCardsTableTemplate
                });

                var oOrigOnAfterRendering = oCardsTable.onAfterRendering;
                oCardsTable.onAfterRendering = function (event) {
                    oOrigOnAfterRendering.apply(oCardsTable, arguments);

                    var items = event.srcControl.mAggregations.items;
                    if (items) {
                        for (var i = 0; i < items.length; i++) {
                            if (!items[i].getCells()[1].getState()) {
                                items[i].addStyleClass('sapOVPHideCardsTableItem');
                                items[i].getCells()[0].addStyleClass('sapOVPHideCardsDisabledCell');
                            }
                        }
                    }
                    setTimeout(function () {
                        jQuery('.sapMListTblRow').first().focus();
                    }, 200);
                };

                var oSaveButton = new Button("manageCardsokBtn", {
                    text: this._getLibraryResourceBundle().getText("okBtn"),
                    type: "Emphasized",
                    press: function () {
                        var aDialogCards = this.oDialog.getModel().getProperty('/cards');
                        createOrDestroyCards.apply(this, [this.aOrderedCards, aDialogCards, false]);
                        this.aOrderedCards = aDialogCards;
                        this._updateDashboardLayoutCards(this.aOrderedCards);
                        this._updateLayoutWithOrderedCards();
                        this.savePersonalization(this.visibilityChanges);
                        this.oDialog.close();
                    }.bind(this)
                });

                var oCancelButton = new Button("manageCardsCancelBtn", {
                    text: this._getLibraryResourceBundle().getText("cancelBtn"),
                    press: function () {
                        this.oDialog.close();
                    }.bind(this)
                });

                var oResetButton = new Button("manageCardsResetBtn", {
                    text: this._getLibraryResourceBundle().getText("resetBtn"),
                    enabled: ((sLayoutName === "sap.ovp.ui.DashboardLayout") ? true : this.isValidForReset()),
                    press: function () {
                        MessageBox.show(this._getLibraryResourceBundle().getText("reset_cards_confirmation_msg"), {
                            id: "resetCardsConfirmation",
                            icon: MessageBox.Icon.QUESTION,
                            title: this._getLibraryResourceBundle().getText("reset_cards_confirmation_title"),
                            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    this.oDialog.setBusy(true);
                                    createOrDestroyCards.apply(this, [this.aOrderedCards, this.aManifestOrderedCards, (sLayoutName === "sap.ovp.ui.DashboardLayout") ? true : false]);
                                    this.aOrderedCards = this.aManifestOrderedCards;
                                    this._resetDashboardLayout();
                                    this._updateDashboardLayoutCards(this.aOrderedCards);
                                    this._updateLayoutWithOrderedCards();
                                    // All USER layer personalization will be discarded.
                                    // TODO: handle promise reject case for discarding changes
                                    this.oFlexController.discardChangesForId(this.getLayout().getId(), true).then(function (arg) {
                                        this.oDialog.setBusy(false);
                                        this.oDialog.close();
                                    }.bind(this));
                                }
                            }.bind(this)
                        });
                    }.bind(this)
                });

                this.oDialog = new Dialog({
                    title: this._getLibraryResourceBundle().getText("hideCardsBtn_title"),
                    contentWidth: "29.6rem",
                    contentHeight: "50%",
                    stretch: Device.system.phone,
                    content: oCardsTable,
                    buttons: [oSaveButton, oCancelButton, oResetButton],
                    afterClose: function () {
                        this.visibilityChanges = [];
                        this.oDialog.destroy();
                    }.bind(this)
                }).addStyleClass("sapOVPCardsVisibilityDialog");
                this.oDialog.setBusyIndicatorDelay(0);
                var oDialogCardsModel;
                if (sLayoutName === "sap.ovp.ui.DashboardLayout") {
                    oDialogCardsModel = jQuery.extend(true, [], this._getCardArrayAsVariantFormatDashboard());
                } else {
                    oDialogCardsModel = jQuery.extend(true, [], this.aOrderedCards);
                }

                oModel = new JSONModel({
                    cards: oDialogCardsModel
                });
                this.oDialog.setModel(oModel);

                this.oDialog.open();
            },

            isValidForReset: function () {
                for (var i = 0; i < this.aManifestOrderedCards.length; i++) {
                    if (this.aManifestOrderedCards[i].id !== this.aOrderedCards[i].id || this.aManifestOrderedCards[i].visibility !== this.aOrderedCards[i].visibility) {
                        return true;
                    }
                }
                return false;
            },

            isDragAndDropEnabled: function () {
                return !Device.system.phone;
            },

            getGlobalFilter: function () {
                if (!this.oGlobalFilter) {
                    this.oGlobalFilter = this.getView().byId("ovpGlobalFilter");
                }
                return this.oGlobalFilter;
            },

            getUIModel: function () {
                if (!this.oUIModel) {
                    var oOwnerComponent = this.getOwnerComponent();
                    this.oUIModel = oOwnerComponent && oOwnerComponent.getModel("ui");
                }
                return this.oUIModel;
            },

            _parseNavigationVariant: function () {

                //Navigation handler constructor uses ushell container to retrieve app
                //services, without container the instance creation will fall with error
                if (!this.oContainer) {
                    this.oParseNavigationPromise = jQuery.Deferred().resolve();
                    return;
                }
                this.oParseNavigationPromise = this.oNavigationHandler.parseNavigation();
            },

            /*
             Applies the filters when returning/navigating to OVP from an external application or
             when the filters are passed as URL parameters
             */
            _setNavigationVariantToGlobalFilter: function (oAppData, oURLParameters, sNavType) {

                var oGlobalFilter = this.getGlobalFilter();

                if (!oGlobalFilter) {
                    return;
                }

                //Based on navigation type, process the parameters
                switch (sNavType) {

                    //iAppState triggered on back navigation
                    case "iAppState":
                        //Non Custom data handling
                        if (oAppData.selectionVariant) {

                            var oCurrentVariant, oSelectionVariant, aSelectionVariantProperties, bMarkDirty = false;
                            var oUnsavedData, oSavedData, oUnsavedDataCustom, oSavedDataCustom;
                            var oUiState, oSavedUiState, oUnsavedUiState;

                            //Clear the global filter variant
                            oGlobalFilter.clearVariantSelection();

                            //Set the original variant by reading from application data, when the variant
                            //is set, the corresponding filters and models and data suite for that variant
                            //are automatically set
                            oCurrentVariant = JSON.parse(oAppData.selectionVariant);
                            oGlobalFilter.setCurrentVariantId(oCurrentVariant.SelectionVariantID);

                            //Get the data suite for the original variant, this was saved data of variant
                            oSavedUiState = oGlobalFilter.getUiState({
                                allFilters: false
                            });
                            oSavedData = oSavedUiState && JSON.stringify(oSavedUiState.getSelectionVariant());	//SAVED

                            //Get the custom data for the original variant, this was saved data of variant
                            oSavedDataCustom = oGlobalFilter.getFilterData()._CUSTOM;	//SAVED CUSTOM

                            oSavedDataCustom = ((typeof oSavedDataCustom == 'undefined') ? {} : oSavedDataCustom);

                            //Set the data suite again from app data so as to apply any unsaved changes
                            //to the variant
                            oUiState = new UIState({
                                selectionVariant: oAppData.oSelectionVariant.toJSONObject()
                            });
                            oGlobalFilter.setUiState(oUiState, {
                                replace: true,
                                strictMode: false
                            });

                            //Get the selection properties from the app data to be put in the filter bar
                            oSelectionVariant = new SelectionVariant(oAppData.selectionVariant);
                            aSelectionVariantProperties = oSelectionVariant.getParameterNames().concat(oSelectionVariant.getSelectOptionsPropertyNames());
                            for (var i = 0; i < aSelectionVariantProperties.length; i++) {
                                oGlobalFilter.addFieldToAdvancedArea(aSelectionVariantProperties[i]);
                            }

                            // getting unsaved data after additional filters have been added in the above loop
                            oUnsavedUiState = oGlobalFilter.getUiState({
                                allFilters: false
                            });
                            oUnsavedData = oUnsavedUiState && JSON.stringify(oUnsavedUiState.getSelectionVariant());	//UNSAVED

                            //Compare saved and unsaved data and mark the filter dirty accordingly
                            if (oSavedData !== oUnsavedData) {
                                bMarkDirty = true;
                            }

                            //Custom Data Handling
                            if (oAppData.customData && Object.keys(oAppData.customData).length > 0) {

                                var oUnsavedDataCustom = oAppData.customData;	//UNSAVED CUSTOM
                                this.restoreCustomAppStateDataExtension(oUnsavedDataCustom);

                                //Compare saved and unsaved for custom filters and mark the filter dirty accordingly
                                if (JSON.stringify(oSavedDataCustom) !== JSON.stringify(oUnsavedDataCustom)) {
                                    bMarkDirty = true;
                                }

                            }

                            oGlobalFilter.getSmartVariant().currentVariantSetModified(bMarkDirty);

                            //Though there are several public methods to update filter count, but to avoid any
                            //unnecessary processing, we are doing it directly
                            oGlobalFilter._updateToolbarText();
                        }
                        break; //from switch case

                    case "xAppState":
                    case "URLParams":

                        //oAppData.oSelectionVariant contains the navigation selection variant
                        //oAppData.selectionVariant is just the string of oAppData.oSelectionVariant
                        //oAppData.oDefaultedSelectionVariant contains default selection variant, that comes
                        //from FLP user settings

                        /****** START OF RULES (how variants will be applied) ****************************************
                         *
                         *  1.  If there is a navigation variant present (oAppData.bNavSelVarHasDefaultsOnly = FALSE),
                         *      then clear the global filter completely (including variant selection) ignoring all other
                         *      incoming variants and defaults                         *
                         *  2.  If (oAppData.bNavSelVarHasDefaultsOnly = TRUE), this means oAppData will contains only
                         *      FLP user settings defaults, then following rules apply:
                         *
                         *      a. Global Filter initialized with user default variant, then ignore all others
                         *      b. Global Filter initialized with standard variant, then Load oAppData.oDefaultedSelectionVariant
                         *
                         * For case 2->b, Global Filter initialized with standard variant can contain default values
                         * coming from metadata, in that case merge those already present default values with
                         * oAppData.oDefaultedSelectionVariant
                         *
                         * Display Currency parameter will get special attention : If after RULE 2a is
                         * executed and display currency parameter in filter bar remains empty, then populate display
                         * currency by first looking into oAppData.oDefaultedSelectionVariant and if not found, then
                         * from default metadata values
                         *
                         ******* END OF RULES ************************************************************************/

                        var oUiState, aSelVarProperties = [];

                        var oNavigationVariant = new SelectionVariant(oAppData.oSelectionVariant.toJSONObject());
                        var oDefaultVariant = new SelectionVariant(oAppData.oDefaultedSelectionVariant.toJSONObject());

                        //RULE 1 (Check table comment above)
                        if (!oAppData.bNavSelVarHasDefaultsOnly && !oNavigationVariant.isEmpty()) {
                            oUiState = new UIState({
                                selectionVariant: oNavigationVariant.toJSONObject()
                            });
                            //Reset existing filter bar completely
                            oGlobalFilter.clearVariantSelection();
                            oGlobalFilter.clear();
                            oGlobalFilter.setUiState(oUiState, {
                                replace: true,
                                strictMode: false
                            });
                            aSelVarProperties = aSelVarProperties.concat(oNavigationVariant.getParameterNames()
                                .concat(oNavigationVariant.getSelectOptionsPropertyNames()));
                        }

                        //RULE 2 (Check table comment above)
                        if (oAppData.bNavSelVarHasDefaultsOnly && !oDefaultVariant.isEmpty() && oGlobalFilter.getCurrentVariantId() === "") {
                            oUiState = new UIState({
                                selectionVariant: oDefaultVariant.toJSONObject()
                            });
                            //replace false means do not reset existing filter bar
                            oGlobalFilter.setUiState(oUiState, {
                                replace: false,
                                strictMode: false
                            });
                            aSelVarProperties = aSelVarProperties.concat(oDefaultVariant.getParameterNames()
                                .concat(oDefaultVariant.getSelectOptionsPropertyNames()));
                        }

                        var iLength;
                        if (aSelVarProperties && aSelVarProperties.length > 0) {
                            //Add field to visible filter bar
                            iLength = aSelVarProperties.length;
                            while (iLength--) {
                                oGlobalFilter.addFieldToAdvancedArea(aSelVarProperties[iLength]);
                            }
                        }
                        //Set DisplayCurrency Parameter if left empty for user variant (after RULE 2a)
                        if (oGlobalFilter.getCurrentVariantId() !== "") {
                            this._setDisplayCurrency(oDefaultVariant);
                        }
                        break; //from switch case
                }
            },

            /**
             * This function checks if DisplayCurrency parameter is left empty
             * If yes, it tries to set it first from user default settings then
             * from metadata defaults
             * @param oDefaultVariant
             * @private
             */
            _setDisplayCurrency: function (oDefaultVariant) {

                var oGlobalFilter = this.getGlobalFilter();
                if (!oGlobalFilter) {
                    return;
                }
                //Check if any analytical parameter present with name DisplayCurrency
                var iLength, oDisplayCurrency;
                var aParameters = oGlobalFilter.getAnalyticalParameters();
                if (aParameters && aParameters.length > 0) {
                    iLength = aParameters.length;
                    while (iLength--) {
                        if ((aParameters[iLength].name === "P_DisplayCurrency") || (aParameters[iLength].name === "DisplayCurrency")) {
                            oDisplayCurrency = aParameters[iLength];
                            break;
                        }
                    }
                }
                //There is no parameter for DisplayCurrency in filter bar
                if (!oDisplayCurrency) {
                    return;
                }
                //If DisplayCurrency present and already filled with value, then do nothing
                //oDisplayCurrency.fieldName looks like $Parameter.P_DisplayCurrency
                var aFilters = oGlobalFilter.getFilters([oDisplayCurrency.fieldName]);
                var sDefaultValue = aFilters && aFilters[0] && aFilters[0].oValue1;
                if (sDefaultValue && sDefaultValue !== " ") {
                    return;
                }
                //Read user settings defaults and try to populate DisplayCurrency Parameter
                //oDefaultVariant can contain the parameter value in SelectOption section as well, this
                //implementation is from navigation handler
                var sNameWithoutPrefix, sNameWithPrefix;
                if (oDisplayCurrency.name.indexOf("P_") === 0) {
                    sNameWithPrefix = oDisplayCurrency.name;
                    sNameWithoutPrefix = oDisplayCurrency.name.substr(2); // remove P_ prefix
                } else {
                    sNameWithPrefix = "P_" + oDisplayCurrency.name;
                    sNameWithoutPrefix = oDisplayCurrency.name;
                }
                if (oDefaultVariant && !oDefaultVariant.isEmpty()) {
                    var oSelectOption;
                    sDefaultValue = oDefaultVariant.getParameter(sNameWithoutPrefix);
                    if (!sDefaultValue || sDefaultValue === " ") {
                        sDefaultValue = oDefaultVariant.getParameter(sNameWithPrefix);
                    }
                    if (!sDefaultValue || sDefaultValue === " ") {
                        oSelectOption = oDefaultVariant.getSelectOption(sNameWithoutPrefix);
                        sDefaultValue = oSelectOption && oSelectOption[0] && oSelectOption[0].Low;
                    }
                    if (!sDefaultValue || sDefaultValue === " ") {
                        oSelectOption = oDefaultVariant.getSelectOption(sNameWithPrefix);
                        sDefaultValue = oSelectOption && oSelectOption[0] && oSelectOption[0].Low;
                    }
                }
                if (!sDefaultValue || sDefaultValue === " ") {
                    sDefaultValue = oDisplayCurrency.defaultPropertyValue; //metadata default
                }
                if (!sDefaultValue || sDefaultValue === " ") {
                    return; //not found at last
                }

                var oSelectionVariant = new SelectionVariant();
                oSelectionVariant.addParameter(oDisplayCurrency.name, sDefaultValue);
                var oUiState = new UIState({
                    selectionVariant: oSelectionVariant.toJSONObject()
                });
                //replace false means do not reset existing filter bar
                //There always be a match found for parameter in filter bar so this will be applied to parameter only
                oGlobalFilter.setUiState(oUiState, {
                    replace: false,
                    strictMode: false
                });
            },

            /**
             * This function takes a variant and modifies the parameters
             * using the new name
             * @param oVariant
             * @param sOldName
             * @param sNewName
             * @returns {object}
             * @private
             */
            _enhanceVariant: function (oVariant, sOldName, sNewName) {

                var oParameter = oVariant.getParameter(sOldName);
                var oSelectOption = oVariant.getSelectOption(sOldName);

                //If parameter is found in variant, then rename it to new name
                //Else check if a select option is found, then rename it and
                //then move from select-option section to parameter section

                if (oParameter) {
                    oVariant.renameParameter(sOldName, sNewName);

                } else if (oSelectOption) {

                    var sValue = oSelectOption[0] && oSelectOption[0].Low;
                    if (sValue && sValue !== "") {
                        sValue += ""; //Convert any type to string
                        oVariant.addParameter(sNewName, sValue);
                        oVariant.removeSelectOption(sOldName);
                    }
                }

                //Return is not required since objects are passed by reference but
                //here object is returned to support method chaining
                return oVariant;
            },

            /**
             * This function connects to application extension and retrieves the
             * custom appstate data
             * @returns {object}
             * @private
             */
            _getCustomAppState: function () {
                var oCustomData = {};

                //Application has the option to return custom data or set the custom data
                //in the empty object handle provided, return data will get priority
                var oCustomDataRet = this.getCustomAppStateDataExtension(oCustomData);
                if (oCustomDataRet) {
                    oCustomData = oCustomDataRet;
                }
                return oCustomData;
            },

            /**
             * Event handler before variant is saved
             */
            onBeforeSFBVariantSave: function () {
                //Before variant is saved, store the custom filter data
                this.getGlobalFilter().setFilterData({
                    _CUSTOM: this._getCustomAppState()
                });
            },

            /**
             * Event handler after variant is loaded
             */
            onAfterSFBVariantLoad: function () {
                var oData = this.getGlobalFilter().getFilterData();
                if (oData._CUSTOM) {
                    this.restoreCustomAppStateDataExtension(oData._CUSTOM);
                }
            },

            /**
             * Event handler to change the snapped header text when the filters change
             * @param oEvent
             */
            onAssignedFiltersChanged: function (oEvent) {
                if (oEvent.getSource() && this.getView().byId("ovpFilterText")) {
                    this.getView().byId("ovpFilterText").setText(oEvent.getSource().retrieveFiltersWithValuesAsText());
                }
            },

            /**
             * Gets current app state
             * @returns {object}
             * @private
             */
            _getCurrentAppState: function () {

                var oGlobalFilter = this.getGlobalFilter();
                // If there is no global filter, no appstate will be present
                if (!oGlobalFilter) {
                    return;
                }
                var oUiState = oGlobalFilter.getUiState({
                    allFilters: false
                });
                var oSelectionVariant = oUiState && oUiState.getSelectionVariant();

                //Do not store dirty variants, reset them
                if (oGlobalFilter.getSmartVariant().currentVariantGetModified()) {
                    oSelectionVariant.SelectionVariantID = "";
                }
                var sSelectionVariant = oSelectionVariant && JSON.stringify(oSelectionVariant);

                //Get data from standard filters
                var oNavigableSelectionVariant = new SelectionVariant(sSelectionVariant);
                //Get data from custom filters
                var oCustomData = this._getCustomAppState();

                return {
                    selectionVariant: oNavigableSelectionVariant.toJSONString(),
                    customData: oCustomData
                };
            },

            /**
             * Create an app state key using app state data and update url with iAppstate
             * @private
             */
            _storeCurrentAppStateAndAdjustURL: function (oEvent) {

                //Initially this.oAppStatePromise is not set, it is set only when a new promise is created
                //on global filter search, however, as soon as the promise is resolved/rejected, this.oAppStatePromise
                //is nullified
                //So, if this.oAppStatePromise exists means that the previous promise is still pending. In
                //such case, reject the previous promise as we will create a new one for new global filter
                //search

                if (oEvent && !oEvent.oSource._bDirtyViaDialog) {
                    return;
                }

                if (!this.bGlobalFilterLoaded) {
                    return;
                }

                //Without navigation handler instance, app state cannot be created
                if (!this.oNavigationHandler) {
                    return;
                }

                if (this.oAppStatePromise) {
                    //Parameter "skip" to denote that rejection as part of process and not
                    //because of actual error
                    this.rejectPreviousPromise && this.rejectPreviousPromise("skip");
                }

                this.oAppStatePromise = new Promise(function (resolve, reject) {
                    this.rejectPreviousPromise = reject;
                    var oAppInnerData = this._getCurrentAppState();
                    var oCurrentAppState = this.oNavigationHandler.storeInnerAppStateWithImmediateReturn(oAppInnerData);

                    //oCurrentAppState contains a promise object that resolves when appstate is created successfully
                    oCurrentAppState.promise.then(function (sAppStateKey) {
                        resolve(sAppStateKey);
                    }, function (sError) {
                        reject(sError.getErrorCode());
                    });
                }.bind(this));

                //Success handler for this.oAppStatePromise
                var fnFulfilled = function (sAppStateKey) {
                    this.oAppStatePromise = null; //Nullified so that we can find out later that this is not pending
                    if (sAppStateKey && sAppStateKey.length > 0) {
                        this.oNavigationHandler.replaceHash(sAppStateKey);
                        return;
                    }
                    throw "AppState key is empty";
                };

                //Failure handler for this.oAppStatePromise
                var fnRejected = function (sError) {
                    this.oAppStatePromise = null;
                    if (sError === "skip") {
                        throw sError; //"skip" means not actual error
                    }
                    throw ("Something went wrong while storing AppState - " + sError);
                };

                //this.oAppStatePromise.then itself returns a promise, any return from fnFulfilled or fnRejected
                //is propagated accordingly
                //catch is used just to process promise failure (promise success is not required)
                this.oAppStatePromise
                    .then(fnFulfilled.bind(this), fnRejected.bind(this))
                    //catch statement may be triggered even if there is failure in fnFulfilled
                    .catch(function (sError) {
                        if (sError === "skip") {
                            return; //"skip" means not actual error
                        }
                        jQuery.sap.log.error(sError);
                    });
            }
        });
    }
);
