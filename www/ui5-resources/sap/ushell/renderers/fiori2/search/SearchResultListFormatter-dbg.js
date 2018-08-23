/* global jQuery,sap */
// iteration 0 ok

sap.ui.define([
    'sap/ushell/renderers/fiori2/search/SearchConfiguration',
    'sap/ushell/renderers/fiori2/search/SearchHelper',
    'sap/ushell/renderers/fiori2/search/SearchNavigationObject',
    'sap/ushell/renderers/fiori2/search/SearchNavigationObjectForSinaNavTarget'
], function (SearchConfiguration, SearchHelper, SearchNavigationObject, SearchNavigationObjectForSinaNavTarget) {
    "use strict";

    var module = sap.ushell.renderers.fiori2.search.SearchResultListFormatter = function () {
        this.init.apply(this, arguments);
    };

    module.prototype = {
        init: function () {},

        format: function (searchResultSet, terms, options) {
            options = options || {};
            options.suppressHighlightedValues = options.suppressHighlightedValues || false;

            var layoutCache = {};
            var formattedResultItems = [];

            var resultItems = searchResultSet.items;

            for (var i = 0; i < resultItems.length; i++) {
                var resultItem = resultItems[i];

                var formattedResultItem = {};

                var oItemAttribute = {};
                var aItemAttributes = [];
                for (var z = 0; z < resultItem.detailAttributes.length; z++) {
                    var detailAttribute = resultItem.detailAttributes[z];

                    switch (detailAttribute.metadata.type.toLowerCase()) {
                    case 'imageurl':
                        formattedResultItem.imageUrl = detailAttribute.value;
                        formattedResultItem.imageFormat = detailAttribute.metadata.format ? detailAttribute.metadata.format.toLowerCase() : undefined;
                        if (detailAttribute.defaultNavigationTarget) {
                            formattedResultItem.imageNavigation = new SearchNavigationObjectForSinaNavTarget(detailAttribute.defaultNavigationTarget);
                        }
                        break;
                    case 'geojson':
                        formattedResultItem.geoJson = {
                            value: detailAttribute.value,
                            label: resultItem.title
                        };
                        break;
                    case 'double':
                    case 'integer':
                    case 'string':
                    case 'longtext':
                    case 'date':
                    case 'time':
                    case 'timestamp':
                        oItemAttribute = {};
                        oItemAttribute.name = detailAttribute.label;
                        oItemAttribute.valueRaw = detailAttribute.value;
                        oItemAttribute.value = options.suppressHighlightedValues ? detailAttribute.valueFormatted : detailAttribute.valueHighlighted;
                        oItemAttribute.valueWithoutWhyfound = detailAttribute.valueFormatted; //result[propDisplay].valueWithoutWhyfound;
                        if (detailAttribute.unitOfMeasure) {
                            if (options.suppressHighlightedValues || !detailAttribute.unitOfMeasure.valueHighlighted) {
                                oItemAttribute.value += " " + detailAttribute.unitOfMeasure.valueFormatted;
                            } else {
                                oItemAttribute.value += " " + detailAttribute.unitOfMeasure.valueHighlighted;
                            }
                            oItemAttribute.valueWithoutWhyfound += " " + detailAttribute.unitOfMeasure.valueFormatted;
                        }
                        if (detailAttribute.description) {
                            if (options.suppressHighlightedValues || !detailAttribute.description.valueHighlighted) {
                                oItemAttribute.value = this._concatenateAttrValueAndDescriptionAccordingToArrangement(oItemAttribute.value, detailAttribute.description.valueFormatted, detailAttribute.metadata.descriptionTextArrangement);
                            } else {
                                oItemAttribute.value = this._concatenateAttrValueAndDescriptionAccordingToArrangement(oItemAttribute.value, detailAttribute.description.valueHighlighted, detailAttribute.metadata.descriptionTextArrangement);
                            }
                            oItemAttribute.valueWithoutWhyfound = this._concatenateAttrValueAndDescriptionAccordingToArrangement(oItemAttribute.valueWithoutWhyfound, detailAttribute.description.valueFormatted, detailAttribute.metadata.descriptionTextArrangement);
                        }

                        // if (detailAttribute.isHighlighted && detailAttribute.metadata.type.toLowerCase() === "longtext") {
                        //     // mix snippet into longtext values
                        //     var valueHighlighted = detailAttribute.valueHighlighted;
                        //     valueHighlighted = valueHighlighted.replace(/(^[.][.][.])|([.][.][.]$)/, "").trim();
                        //     var valueUnHighlighted = valueHighlighted.replace(/[<]([/])?b[>]/g, "");
                        //     oItemAttribute.value = detailAttribute.valueFormatted.replace(valueUnHighlighted, valueHighlighted);
                        // }

                        oItemAttribute.key = detailAttribute.id;
                        oItemAttribute.isTitle = false; // used in table view
                        oItemAttribute.isSortable = detailAttribute.metadata.isSortable; // used in table view
                        oItemAttribute.attributeIndex = z; // used in table view
                        oItemAttribute.displayOrder = detailAttribute.metadata.usage.Detail && detailAttribute.metadata.usage.Detail.displayOrder;
                        oItemAttribute.whyfound = detailAttribute.isHighlighted;
                        if (detailAttribute.defaultNavigationTarget) {
                            oItemAttribute.defaultNavigationTarget = new SearchNavigationObjectForSinaNavTarget(detailAttribute.defaultNavigationTarget);
                        }
                        // oItemAttribute.hidden = detailAttribute.metadata.hidden;
                        if (detailAttribute.metadata.type.toLowerCase() === 'longtext') {
                            oItemAttribute.longtext = detailAttribute.value;
                        }

                        if (detailAttribute.metadata.format && detailAttribute.metadata.format.toLowerCase() === "multilinetext") {
                            oItemAttribute.longtext = detailAttribute.value;
                            if (!formattedResultItem.descriptionAttribute) {
                                formattedResultItem.descriptionAttribute = oItemAttribute;
                            }
                        }

                        aItemAttributes.push(oItemAttribute);
                        break;
                    }
                }

                formattedResultItem.key = resultItem.key;
                formattedResultItem.keystatus = resultItem.keystatus;

                formattedResultItem.dataSource = resultItem.dataSource;
                formattedResultItem.dataSourceName = resultItem.dataSource.label;

                formattedResultItem.title = options.suppressHighlightedValues ? resultItem.title.trim() : resultItem.titleHighlighted.trim();
                if (resultItem.titleAttributes && resultItem.titleAttributes.length == 1 && resultItem.titleAttributes[0].description) {
                    var descriptionAttribute = resultItem.titleAttributes[0].description;
                    var descriptionValue = options.suppressHighlightedValues ? descriptionAttribute.valueFormatted.trim() : descriptionAttribute.valueHighlighted.trim();
                    formattedResultItem.title = this._concatenateAttrValueAndDescriptionAccordingToArrangement(formattedResultItem.title, descriptionValue, descriptionAttribute.metadata.descriptionTextArrangement);
                }

                formattedResultItem.titleDescription = resultItem.titleDescription ? resultItem.titleDescription.trim() : "";


                formattedResultItem.itemattributes = aItemAttributes;

                if (resultItem.defaultNavigationTarget) {
                    formattedResultItem.titleNavigation = new SearchNavigationObjectForSinaNavTarget(resultItem.defaultNavigationTarget);
                    if (!formattedResultItem.title || formattedResultItem.title.length == 0) {
                        formattedResultItem.title = resultItem.defaultNavigationTarget.label;
                    }
                }

                if (resultItem.navigationTargets && resultItem.navigationTargets.length > 0) {
                    formattedResultItem.navigationObjects = [];
                    for (var j = 0; j < resultItem.navigationTargets.length; j++) {
                        var navigationTarget = new SearchNavigationObjectForSinaNavTarget(resultItem.navigationTargets[j]);
                        navigationTarget.setLoggingType('RESULT_LIST_ITEM_NAVIGATE_CONTEXT');
                        formattedResultItem.navigationObjects.push(navigationTarget);
                    }
                }

                var layoutCacheForItemType = layoutCache[resultItem.dataSource.id] || {};
                layoutCache[resultItem.dataSource.id] = layoutCacheForItemType;
                formattedResultItem.layoutCache = layoutCacheForItemType;

                formattedResultItem.selected = formattedResultItem.selected || false;
                formattedResultItem.expanded = formattedResultItem.expanded || false;

                var additionalParameters = {};
                this._formatResultForDocuments(resultItem, additionalParameters);
                this._formatResultForNotes(resultItem, additionalParameters);
                formattedResultItem.additionalParameters = additionalParameters;

                formattedResultItem.positionInList = i;
                formattedResultItem.resultSetId = searchResultSet.id;

                formattedResultItems.push(formattedResultItem);
            }

            return formattedResultItems;
        },

        _concatenateAttrValueAndDescriptionAccordingToArrangement: function (attributeValue, descriptionText, arrangement) {
            switch (arrangement) {
            case 'TextFirst':
                return descriptionText + " " + attributeValue;
            case 'TextLast':
                return attributeValue + " " + descriptionText;
            case 'TextOnly':
                return descriptionText;
            default:
                return attributeValue + " " + descriptionText;
            }
        },

        _formatResultForDocuments: function (resultItem, additionalParameters) {
            var keyFields = '';
            additionalParameters.isDocumentConnector = false;

            var j, detailAttribute;
            for (j = 0; j < resultItem.detailAttributes.length; j++) {
                detailAttribute = resultItem.detailAttributes[j];

                if (detailAttribute.metadata.id === 'FILE_PROPERTY') {
                    additionalParameters.isDocumentConnector = true;
                }

                if (detailAttribute.metadata.isKey === true) {
                    if (keyFields.length > 0) {
                        keyFields += ';';
                    }
                    keyFields = keyFields + detailAttribute.metadata.id + '=' + detailAttribute.value; //encodeURIComponent(result[prop].valueRaw);
                }
            }

            //fileloader
            if (additionalParameters.isDocumentConnector === true) {
                var sidClient = ';o=sid(' + resultItem.dataSource.system + '.' + resultItem.dataSource.client + ')';

                var connectorName = resultItem.dataSource.id;
                additionalParameters.imageUrl = "/sap/opu/odata/SAP/ESH_SEARCH_SRV" + sidClient + "/FileLoaderFiles(ConnectorId='" + connectorName + "',FileType='ThumbNail',SelectionParameters='" + keyFields + "')/$value";
                additionalParameters.titleUrl = "/sap/opu/odata/SAP/ESH_SEARCH_SRV" + sidClient + "/FileLoaderFiles(ConnectorId='" + connectorName + "',FileType='BinaryContent',SelectionParameters='" + keyFields + "')/$value";
                // var suvlink = "/sap/opu/odata/SAP/ESH_SEARCH_SRV/FileLoaderFiles(ConnectorId='" + connectorName + "',FileType='SUVFile',SelectionParameters='PHIO_ID=" + resultItem.PHIO_ID.valueRaw + "')/$value?sap-client=" + client;
                // var suvlink = '/sap-pdfjs/web/viewer.html?file=' + encodeURIComponent(suvlink);
                var suvlink = "/sap/opu/odata/SAP/ESH_SEARCH_SRV" + sidClient + "/FileLoaderFiles(ConnectorId='" + connectorName + "',FileType='SUVFile',SelectionParameters='" + keyFields + "')/$value";
                additionalParameters.suvlink = '/sap/bc/ui5_ui5/ui2/ushell/resources/sap/fileviewer/viewer/web/viewer.html?file=' + encodeURIComponent(suvlink);

                if (!resultItem.navigationObjects) {
                    resultItem.navigationObjects = [];
                }
                var navigationTarget = new SearchNavigationObject({
                    text: "Show Document",
                    href: additionalParameters.suvlink,
                    target: "_blank"
                });
                resultItem.navigationObjects.push(navigationTarget);

                for (j = 0; j < resultItem.detailAttributes.length; j++) {
                    detailAttribute = resultItem.detailAttributes[j];
                    if (detailAttribute.id == 'PHIO_ID_THUMBNAIL' && detailAttribute.value) {
                        additionalParameters.containsThumbnail = true;
                    }
                    if (detailAttribute.id == 'PHIO_ID_SUV' && detailAttribute.value) {
                        additionalParameters.containsSuvFile = true;
                    }
                }
            }
        },

        _formatResultForNotes: function (resultItem, additionalParameters) {

        }
    };

    return module;
});
