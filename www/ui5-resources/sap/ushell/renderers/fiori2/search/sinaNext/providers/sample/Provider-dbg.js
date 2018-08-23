/* global sinaDefine, $*/

sinaDefine(['../../core/core', '../../core/util', './template', '../../sina/NavigationTarget'], function (core, util, template, NavigationTarget) {
    "use strict";

    return core.defineClass({

        id: 'sample',

        _initAsync: function (properties) {
            var that = this;
            that.template = template;
            that.sina = properties.sina;
            that.NavigationTarget = NavigationTarget;
            var demoRoot = template(that);
            demoRoot._init(demoRoot);
            var res = core.Promise.resolve({
                capabilities: this.sina._createCapabilities({
                    fuzzy: false
                })
            });



            return res;
        },
        getSuggestionList: function (templateData) {
            var listAsString = this._stringify(templateData);
            var regexp = new RegExp("\"valueFormatted\"\:\"([^\"/]+?)\",", "g");
            var matches = [];
            listAsString.replace(regexp, function () {
                matches.push(arguments[1]);
            });
            var singleWords = matches.toString().split(' ');
            singleWords = singleWords.toString().split(',');
            matches = matches.concat(singleWords);
            matches = matches.filter(function (item, pos) {
                if (item !== '') {
                    return matches.indexOf(item) == pos;
                }
            });
            return matches;
        },
        _stringify: function (o) {
            var cache = [];
            var s = JSON.stringify(o, function (key, value) {
                if (typeof value === 'object' && value !== null) {
                    if (cache.indexOf(value) !== -1) {
                        // Circular reference found, discard key
                        return undefined;
                    }
                    // Store value in our collection
                    cache.push(value);
                }
                return value;
            });
            cache = null; // Enable garbage collection
            return s;
        },
        adjustImageViewing: function () {
            var clonePic, top, left;
            try { //try catch added for require issues  during unit testing per qUnit
                $(".sapUshellSearchResultListItem-Image").on('mouseenter', function () {
                    //var pos = $(this).offset();
                    clonePic = $(this).clone();
                    $('body').append(clonePic);

                    top = ($(window).height() - $(clonePic).outerHeight()) * 0.33;
                    left = ($(window).width() - $(clonePic).outerWidth()) * 0.33;

                    //var w = clonePic[0].width;
                    clonePic.css({
                        position: "absolute",
                        top: top + "px",
                        left: left + "px"
                    }).show();
                });

                $(".sapUshellSearchResultListItem-Image").on('mouseleave', function () {
                    clonePic.remove();
                });
            } catch (error) {
                //do nothing
            }
        },
        applyFilters: function (items, searchQuery) {
            var newItemsArray = [];
            if (!searchQuery.filter.rootCondition.conditions.length > 0 || !searchQuery.filter.rootCondition.conditions[0].conditions.length > 0) {
                return items;
            }
            var toBeDimensionValuePairsArray = [];
            var toBeDimensionsArray = [];
            for (var g = 0; g < searchQuery.filter.rootCondition.conditions.length; g++) {
                var conditions = searchQuery.filter.rootCondition.conditions[g].conditions;
                for (var h = 0; h < conditions.length; h++) {
                    //conditions[j].attribute; //eg LOCATION
                    //conditions[j].value; //eg Galapagos
                    toBeDimensionValuePairsArray.push([conditions[h].attribute, conditions[h].value]);
                    toBeDimensionsArray.push(conditions[h].attribute);
                }
            }
            var fits = false;
            for (var i = 0; i < items.length; i++) { //compare items with collected to-be-valid conditions
                var item = items[i];
                var fitsArray = [];
                for (var j = 0; j < toBeDimensionValuePairsArray.length; j++) {
                    fits = false;
                    for (var k = 0; k < item.detailAttributes.length; k++) { //loop thru all detailAttributes of item
                        var detailAttribute = item.detailAttributes[k];
                        if (detailAttribute.id === toBeDimensionValuePairsArray[j][0] && detailAttribute.value === toBeDimensionValuePairsArray[j][1]) {
                            fits = true;
                        }
                    }
                    for (var m = 0; m < item.titleAttributes.length; m++) { //loop thru all titleAttributes of item
                        var titleAttribute = item.titleAttributes[m];
                        if (titleAttribute.id === toBeDimensionValuePairsArray[j][0] && titleAttribute.value === toBeDimensionValuePairsArray[j][1]) {
                            fits = true;
                        }
                    }
                    toBeDimensionValuePairsArray[j][2] = fits;
                    fitsArray.push(fits);
                }
                if (fitsArray.toString().match(/false/) === null) {
                    newItemsArray.push(item);
                } else {
                    //see it there is one 'true' match for each unique dimension, if so we can still add item
                    var fitsArray2 = [];
                    var uniqueDimensionsArray = toBeDimensionsArray.filter(function (item, pos) {
                        return toBeDimensionsArray.indexOf(item) == pos;
                    });
                    for (var n = 0; n < uniqueDimensionsArray.length; n++) {
                        fits = false;
                        var dimension = uniqueDimensionsArray[n];
                        for (var p = 0; p < toBeDimensionValuePairsArray.length; p++) {
                            if (toBeDimensionValuePairsArray[p][0] === dimension && toBeDimensionValuePairsArray[p][2] === true) {
                                fits = true;
                                break;
                            }
                        }
                        fitsArray2.push(fits);
                    }
                    if (fitsArray2.toString().match(/false/) === null) {
                        newItemsArray.push(item);
                    }
                }

            }

            return newItemsArray;
        },
        adjustHighlights: function (items, searchTerm) {
            var newItemsArray = [];
            var attrMetadataType = "";
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var neverFound = true;
                attrMetadataType = "";
                item.titleHighlighted = this.addHighlight(item.title, searchTerm);

                if (item.titleHighlighted !== item.title) {
                    neverFound = false;
                }
                for (var j = 0; j < item.detailAttributes.length; j++) {
                    var detailAttr = item.detailAttributes[j];
                    attrMetadataType = detailAttr.metadata.type;
                    if (attrMetadataType === "String" || attrMetadataType === "Longtext" || attrMetadataType === "Integer") {
                        detailAttr.valueHighlighted = this.addHighlight(detailAttr.valueFormatted, searchTerm);
                        if (detailAttr.valueHighlighted !== detailAttr.valueFormatted) {
                            neverFound = false;
                        }
                    }
                }
                for (var k = 0; k < item.titleAttributes.length; k++) {
                    var titleAttr = item.titleAttributes[k];
                    attrMetadataType = titleAttr.metadata.type;
                    if (attrMetadataType === "String" || attrMetadataType === "Longtext" || attrMetadataType === "Integer") {
                        titleAttr.valueHighlighted = this.addHighlight(titleAttr.valueFormatted, searchTerm);
                        if (titleAttr.valueHighlighted !== titleAttr.valueFormatted) {
                            neverFound = false;
                        }
                    }
                }
                if (neverFound === false || searchTerm === "*") {
                    newItemsArray.push(item);
                }
            }
            return newItemsArray;
        },
        addHighlight: function (hText, searchTerm) {
            if (typeof hText != 'string' || typeof searchTerm != 'string') {
                return hText;
            }
            var pos1 = hText.toLowerCase().indexOf(searchTerm.toLowerCase());
            if (pos1 > -1) {
                var pos2 = pos1 + searchTerm.length;
                var newHText = hText.substring(0, pos1) + '<b>' + hText.substring(pos1, pos2) + '</b>' + hText.substring(pos2);
                return newHText;
            } else {
                return hText;
            }
        },

        augmentDetailAttributes: function (resultItemArray) {
            for (var i = 0; i < resultItemArray.length; i++) {
                var attributesArray = resultItemArray[i].detailAttributes;
                for (var j = 0; j < attributesArray.length; j++) {
                    var attribute = attributesArray[j];
                    attribute = util.addPotentialNavTargetsToAttribute(this.sina, attribute);
                }
            }
            return resultItemArray;
        },

        executeSearchQuery: function (searchQuery) {
            var that = this;
            that.searchQuery = searchQuery;
            return new core.Promise(function (resolve, reject) {
                var resultSet, searchTerm, dataSourceId;
                var itemsRoot = template(that);
                var items1 = itemsRoot.searchResultSetItemArray;
                items1 = that.augmentDetailAttributes(items1);
                var items2 = itemsRoot.searchResultSetItemArray2;
                items2 = that.augmentDetailAttributes(items2);
                var itemsAll = items1.concat(items2);


                that.searchQuery = searchQuery;
                searchTerm = searchQuery.filter.searchTerm;
                dataSourceId = searchQuery.filter.dataSource.id;
                var facets1 = that.generateFacets(searchQuery);

                var items;
                if (dataSourceId === "Scientists") {
                    items = that.adjustHighlights(items1, searchTerm);
                    items = that.applyFilters(items, searchQuery);
                    resultSet = that.sina._createSearchResultSet({
                        items: items,
                        facets: facets1,
                        type: "",
                        query: searchQuery,
                        title: "",
                        totalCount: items.length
                    });

                } else if (dataSourceId === "Mysterious_Sightings") {
                    items = that.adjustHighlights(items2, searchTerm);
                    items = that.applyFilters(items, searchQuery);
                    resultSet = that.sina._createSearchResultSet({
                        items: items,
                        facets: facets1,
                        type: "",
                        query: searchQuery,
                        title: "",
                        totalCount: items.length
                    });
                } else if (dataSourceId === "All") {
                    //calculate total counts for each sub branch of 'all'
                    items = that.adjustHighlights(items1, searchTerm);
                    items = that.applyFilters(items, searchQuery);
                    var totalCount1 = items.length;

                    items = that.adjustHighlights(items2, searchTerm);
                    items = that.applyFilters(items, searchQuery);
                    var totalCount2 = items.length;

                    facets1[0].items[0].measureValue = totalCount1; //scientists
                    facets1[0].items[0].measureValueFormatted = '' + totalCount1;

                    facets1[0].items[1].measureValue = totalCount2; //mysterious sightings
                    facets1[0].items[1].measureValueFormatted = '' + totalCount2;

                    //proceed to insert facets into resultSet
                    items = that.adjustHighlights(itemsAll, searchTerm);
                    items = that.applyFilters(items, searchQuery);

                    resultSet = that.sina._createSearchResultSet({
                        items: items,
                        facets: facets1,
                        type: "",
                        query: searchQuery,
                        title: "",
                        totalCount: items.length
                    });
                }


                // window.setTimeout(that.adjustImageViewing, 1000);

                resolve(resultSet);

            });

        },
        executeSuggestionQuery: function (query) {
            var that = this;
            var searchTerm = query.filter.searchTerm;
            this.template(this);
            var demoRoot = this.template(this);
            var searchAbleItems = demoRoot.searchResultSetItemArray.concat(demoRoot.searchResultSetItemArray2);
            var suggestionTerms = this.getSuggestionList(searchAbleItems); //"Sally Spring,Galapagos,Female,Robert Sarmast,Off East Cyprus,Male,Zecharia Sitchin,Baalbek, Lebanon,Alan F. Alford,Wycliffe Well"
            //to do: limit suggestion terms to what matches start of search term
            var suggestionsMatchingSearchterm = suggestionTerms.filter(function (s) {
                var regexp = new RegExp("^" + searchTerm, "gi");
                return s.match(regexp);
            });
            if (suggestionsMatchingSearchterm.length === 0) {
                suggestionsMatchingSearchterm = suggestionTerms;
            }
            var suggestions = [];

            var SuggestionItem = function (term) {
                var calculationMode = that.sina.SuggestionCalculationMode.Data;
                var filter = query.filter.clone();
                filter.setSearchTerm(term);
                return that.sina._createSearchTermSuggestion({
                    searchTerm: term,
                    calculationMode: calculationMode,
                    filter: filter,
                    label: term
                });
            };
            for (var i = 0; i < suggestionsMatchingSearchterm.length; i++) {
                suggestions.push(new SuggestionItem(suggestionsMatchingSearchterm[i]));
            }

            var resultSet = this.sina._createSuggestionResultSet({
                title: 'Suggestions',
                query: query,
                items: suggestions
            });

            return new core.Promise(function (resolve, reject) {

                resolve(resultSet);

            });
        },
        executeChartQuery: function (query) {

            var chartResultSetItems = this.generateFacets(query);
            var whichChart = 1; //scientists
            if (query.dimension === "LOCATION") {
                whichChart = 0;
            }
            return new core.Promise(function (resolve, reject) {
                resolve(chartResultSetItems[whichChart]);

            });

        },
        generateFacets: function (searchQuery) {
            var that = this;

            if (searchQuery.filter.dataSource.id === "All") {

                var dataSource = searchQuery.filter.sina.allDataSource;
                var dataSourceItems = [that.sina._createDataSourceResultSetItem({
                        dataSource: searchQuery.filter.sina.dataSources[1],
                        dimensionValueFormatted: dataSource.labelPlural,
                        measureValue: 4,
                        measureValueFormatted: '4' //4 scientists currently
                    }),
                    that.sina._createDataSourceResultSetItem({
                        dataSource: searchQuery.filter.sina.dataSources[2],
                        dimensionValueFormatted: dataSource.labelPlural,
                        measureValue: 5,
                        measureValueFormatted: '5' //5 sightings currently
                    })
                ];

                var dataSourceFacets = [that.sina._createDataSourceResultSet({
                    title: searchQuery.filter.dataSource.label,
                    titleHighlighted: searchQuery.filter.dataSource.label,
                    items: dataSourceItems,
                    query: searchQuery
                })];
                return dataSourceFacets;

            } else {
                var chartResultSetArray = [];
                var gen = this.template(this);

                var filter = that.sina.createFilter({
                    searchTerm: that.searchQuery.filter.searchTerm,
                    dataSource: that.searchQuery.filter.dataSource,
                    rootCondition: that.searchQuery.filter.rootCondition.clone()
                });
                var chartResultSetItems = [];
                var chartResultSetItem, chartResultSet, i, j, k, attrs;
                var resultSetItemsArray = gen.searchResultSetItemArray; //'scientists'

                if (searchQuery.filter.dataSource.id === "Mysterious_Sightings") {
                    resultSetItemsArray = gen.searchResultSetItemArray2;
                }
                /*
                 *
                 *     location facet
                 *
                 *
                 */
                var location;
                var locations = [];
                for (i = 0; i < resultSetItemsArray.length; i++) {
                    attrs = resultSetItemsArray[i].detailAttributes;
                    for (j = 0; j < attrs.length; j++) {

                        if (attrs[j].id === "LOCATION") {
                            location = attrs[j].value;
                            if (locations.indexOf(location) === -1) { //new location
                                locations.push(location);
                                chartResultSetItem = that.sina._createChartResultSetItem({
                                    filterCondition: that.sina.createSimpleCondition({
                                        attribute: "LOCATION",
                                        operator: that.sina.ComparisonOperator.Equals,
                                        value: location
                                    }),
                                    dimensionValueFormatted: location,
                                    measureValue: 1,
                                    measureValueFormatted: '1',
                                    dataSource: that.searchQuery.filter.dataSource
                                });

                                chartResultSetItems.push(chartResultSetItem);
                            } else {
                                //add to measureValue
                                for (k = 0; k < chartResultSetItems.length; k++) {
                                    if (chartResultSetItems[k].filterCondition.value === location) {
                                        chartResultSetItems[k].measureValue = chartResultSetItems[k].measureValue + 1;
                                        chartResultSetItems[k].measureValueFormatted = '' + chartResultSetItems[k].measureValue;
                                    }

                                }
                            }
                        }
                    }
                }

                chartResultSet = that.sina._createChartResultSet({
                    items: chartResultSetItems,
                    query: that.sina.createChartQuery({
                        filter: filter,
                        dimension: "LOCATION"
                    }),
                    title: "Locations",
                    type: ''
                });
                chartResultSetArray.push(chartResultSet);

                /*
                 *
                 *     scientists facet
                 *
                 *
                 */

                var scientist;
                var scientists = [];
                chartResultSetItems = [];
                for (i = 0; i < resultSetItemsArray.length; i++) {
                    attrs = resultSetItemsArray[i].titleAttributes;
                    if (searchQuery.filter.dataSource.id === "Mysterious_Sightings") {
                        attrs = resultSetItemsArray[i].detailAttributes;
                    }
                    for (j = 0; j < attrs.length; j++) {

                        if (attrs[j].id === "SCIENTIST") {
                            scientist = attrs[j].value;
                            if (scientists.indexOf(scientist) === -1) { //new location
                                scientists.push(scientist);
                                chartResultSetItem = that.sina._createChartResultSetItem({
                                    filterCondition: that.sina.createSimpleCondition({
                                        attribute: "SCIENTIST",
                                        operator: that.sina.ComparisonOperator.Equals,
                                        value: scientist
                                    }),
                                    dimensionValueFormatted: scientist,
                                    measureValue: 1,
                                    measureValueFormatted: '1',
                                    dataSource: that.searchQuery.filter.dataSource
                                });

                                chartResultSetItems.push(chartResultSetItem);
                            } else {
                                //add to measureValue
                                for (k = 0; k < chartResultSetItems.length; k++) {
                                    if (chartResultSetItems[k].filterCondition.value === scientist) {
                                        chartResultSetItems[k].measureValue = chartResultSetItems[k].measureValue + 1;
                                        chartResultSetItems[k].measureValueFormatted = '' + chartResultSetItems[k].measureValue;
                                    }

                                }
                            }
                        }
                    }
                }

                chartResultSet = that.sina._createChartResultSet({
                    items: chartResultSetItems,
                    query: that.sina.createChartQuery({
                        filter: filter,
                        dimension: "SCIENTIST"
                    }),
                    title: "Scientists",
                    type: ''
                });
                chartResultSetArray.push(chartResultSet);

                return chartResultSetArray;
            }
        }

    });

});
