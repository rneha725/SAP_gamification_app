/* global Promise, sinaDefine */
sinaDefine(['../../core/core',
    '../../core/util',
    '../../core/lang',
    './ajax',
    './conditionSerializer',
    './dataSourceSerializer',
    './FacetParser',
    './ItemParser',
    './suggestionParser',
    './suggestionTermSplitter',
    // './LabelCalculator',
    // './UserEventLogger',
    './MetadataParser'
], function (
    core,
    util,
    lang,
    ajax,
    conditionSerializer,
    dataSourceSerializer,
    FacetParser,
    ItemParser,
    SuggestionParser,
    suggestionTermSplitter,
    // LabelCalculator,
    // UserEventLogger,
    MetadataParser
) {
    "use strict";

    return core.defineClass({

        id: 'hana_odata',

        _initAsync: function (configuration) {
            this.requestPrefix = util.getBaseUrl(configuration.url) + '/es/odata/callbuildin.xsjs';
            this.sina = configuration.sina;
            this.ajaxClient = ajax.createAjaxClient();
            this.metadataLoadPromises = {};
            this.internalMetadata = {};
            // this.labelCalculator = new LabelCalculator();
            // this.userEventLogger = new UserEventLogger(this);
            this.metadataParser = new MetadataParser(this);
            this.itemParser = new ItemParser(this);
            this.facetParser = new FacetParser(this);
            this.suggestionParser = new SuggestionParser(this);

            return this.loadServerInfo().then(function (serverInfo) {
                this.serverInfo = serverInfo;
                if (!this.supports('Search')) {
                    return Promise.reject(new core.Exception('Enterprise Search is not active'));
                }
                return this.loadBusinessObjectDataSources();
            }.bind(this)).then(function () {
                if (this.sina.dataSources.length === 0) {
                    return Promise.reject(new core.Exception('Enterprise Search is not active - no datasources'));
                }
                return {
                    capabilities: this.sina._createCapabilities({
                        fuzzy: false
                    })
                };
            }.bind(this));
        },

        supports: function (service, capability) {
            var supportedServices = this.serverInfo.services;
            for (var supportedService in supportedServices) {
                if (supportedService === service) {
                    if (!capability) {
                        return true;
                    }
                    var supportedCapabilities = supportedServices[supportedService].Capabilities;
                    for (var j = 0; j < supportedCapabilities.length; ++j) {
                        var checkCapability = supportedCapabilities[j];
                        if (checkCapability === capability) {
                            return true;
                        }
                    }
                }
            }

            return false;
        },

        loadServerInfo: function () {
            var simulatedHanaServerinfo = {
                rawServerInfo: {
                    Services: [{
                            Service: 'Search',
                            Capabilities: [{
                                Capability: 'SemanticObjectType'
                            }]
                        },
                        {
                            Service: 'Suggestions2',
                            Capabilities: [{
                                Capability: 'ScopeTypes'
                            }]
                        }
                    ]
                },
                services: {
                    Suggestions: {
                        suggestionTypes: ['objectdata']
                    },
                    Search: {
                        capabilities: ['SemanticObjectType']
                    }
                }
            };
            return Promise.resolve(simulatedHanaServerinfo);
        },

        loadBusinessObjectDataSources: function () {
            var that = this;
            var requestUrl = this.buildQueryUrl(this.requestPrefix, "/$metadata");
            return this.ajaxClient.getXML(requestUrl).then(function (response) {
                that.metadataParser.parseResponse(response).then(function (allMetaDataMap) {
                    for (var i = 0; i < allMetaDataMap.dataSourcesList.length; ++i) {
                        var dataSource = allMetaDataMap.dataSourcesList[i];
                        that.metadataParser.fillMetadataBuffer(dataSource, allMetaDataMap.businessObjectMap[dataSource.id]);
                    }
                });
            });
        },

        assembleOrderBy: function (query) {
            var result = [];
            for (var i = 0; i < query.sortOrder.length; ++i) {
                var sortKey = query.sortOrder[i];
                var sortOrder = (sortKey.order === this.sina.SortOrder.Descending) ? 'desc' : 'asc';
                result.push({
                    AttributeId: sortKey.id,
                    SortOrder: sortOrder
                });
            }
            return result;
        },

        executeSearchQuery: function (query) {
            // assemble json request
            var rootCondition = query.filter.rootCondition.clone();
            var filter = conditionSerializer.serialize(query.filter.dataSource, rootCondition);
            var searchTerms = query.filter.searchTerm;
            var dataSource = dataSourceSerializer.serialize(query.filter.dataSource);
            //var dataSource = query.filter.dataSource;
            var top = query.top || 10;
            var skip = query.skip || 0;
            var facetLimit = query.facetTop || 5;

            //construct search part of $apply
            var searchExpression = "Search.search(query='";
            if (query.filter.dataSource !== this.sina.getAllDataSource()) {
                searchExpression += "SCOPE:" + dataSource.Id + " ";
            }

            searchExpression += filter + " " + searchTerms + "')";



            var apply = 'filter(' + searchExpression + ')';

            var data = {
                $count: true,
                $top: top,
                $skip: skip,
                $apply: apply,
                whyfound: true
            };

            var url = this.buildQueryUrl(this.requestPrefix, '/$all');
            if (query.calculateFacets) {
                data.facets = 'all';
                data.facetlimit = facetLimit;
            }

            // fire request
            var items, response;
            return this.ajaxClient.getJson(url, data).then(function (inputResponse) {
                response = inputResponse;
                return this.itemParser.parse(query, response.data);
            }.bind(this)).then(function (inputItems) {
                items = inputItems;
                return this.facetParser.parse(query, response.data['@com.sap.vocabularies.Search.v1.Facets']);
            }.bind(this)).then(function (facets) {
                return this.sina._createSearchResultSet({
                    title: 'Search Result List',
                    query: query,
                    items: items,
                    totalCount: response.data['@odata.count'] || 0,
                    facets: facets
                });
            }.bind(this));
        },

        executeChartQuery: function (query) {
            var searchTerms = query.filter.searchTerm;
            var dataSource = dataSourceSerializer.serialize(query.filter.dataSource);
            var rootCondition = query.filter.rootCondition.clone();

            var facetTop = 15; // default value for numeric range/interval facets

            //In value help mode delete current condition from root and prepare to construct the value help part of query
            var resultDeletion = rootCondition.removeAttributeConditions(query.dimension);
            var isValueHelpMode = resultDeletion.deleted;

            var filter = conditionSerializer.serialize(query.filter.dataSource, rootCondition);

            var top = query.top || 5;
            // var skip = query.skip || 0;

            var searchExpression = "Search.search(query='";
            if (dataSource !== this.sina.getAllDataSource()) {
                searchExpression += "SCOPE:" + dataSource.Id + " ";
            }

            //construct search part of $apply
            if (isValueHelpMode === true) { //value help mode
                searchExpression += '(' + resultDeletion.attribute + ':EQ' + ':\\"' + resultDeletion.value + '*\\")' + ' ' + searchTerms;
            } else {
                searchExpression += filter + " " + searchTerms;
            }
            searchExpression += "')";

            var apply = 'filter(' + searchExpression + ')';

            var data = {
                $count: true,
                $top: 0,
                // $skip: skip,
                $apply: apply
            };

            var url = this.buildQueryUrl(this.requestPrefix, '/$all');

            var facetScope = 'all';


            data.facetlimit = top;
            if (query.dimension) {
                facetScope = query.dimension;
                var metadata = query.filter.dataSource.getAttributeMetadata(query.dimension);
                if ((metadata.type === 'Double' || metadata.type === 'Integer') && top >= 20) {
                    //facet limit decides number of intervals/ranges of numeric data types, but has no effect on date/time ranges
                    data.facetlimit = facetTop;
                }
            }

            //just require own chart facet in case that
            data.facets = facetScope;



            // fire request
            return this.ajaxClient.getJson(url, data).then(function (response) {
                // return this.facetParser.parse(query, response.data);
                var facets = this.facetParser.parse(query, response.data['@com.sap.vocabularies.Search.v1.Facets']);
                return facets;
            }.bind(this)).then(function (facets) {
                if (facets.length > 0) {
                    return facets[0];
                }
                return this.sina._createChartResultSet({
                    title: query.filter.dataSource.getAttributeMetadata(query.dimension).label,
                    items: [],
                    query: query
                });
            }.bind(this));

        },

        executeSuggestionQuery: function (query) {
            var sina2OdataConversion = {
                SearchTerm: {
                    Data: 'SuggestObjectData',
                    History: 'SuggestSearchHistory'
                },
                Object: {},
                DataSource: {
                    Data: 'SuggestDataSources'
                }
            };
            var suggestionTypes = query.types;
            var calculationModes = query.calculationModes;
            var blankPromise = core.Promise.resolve({
                items: []
            });
            for (var i = 0; i < suggestionTypes.length; i++) {
                var suggestionType = suggestionTypes[i];
                for (var j = 0; j < calculationModes.length; j++) {
                    var calculationMode = calculationModes[j];
                    var value = sina2OdataConversion[suggestionType][calculationMode];
                    switch (value) {
                    case "SuggestObjectData":
                        return this._fireSuggestionQuery(query);
                        // case "SuggestSearchHistory":
                        // case "SuggestDataSources":

                    default:
                        return blankPromise;
                    }
                }
            }
            // return this._fireSuggestionQuery(query);
        },

        _fireSuggestionQuery: function (query) {
            // split search term in query into (1) searchTerm (2) suggestionTerm
            var searchTerm = query.filter.searchTerm;
            var splittedTerm = suggestionTermSplitter.split(this, searchTerm);
            //var dataSource = dataSourceSerializer.serialize(query.filter.dataSource);

            // assemble request
            // var top = query.top || 5;
            // var skip = query.skip || 0;

            //construct search part of $apply
            var searchExpression = "GetSuggestion(term='";
            if (query.filter.dataSource !== this.sina.getAllDataSource()) {
                searchExpression += "SCOPE:" + query.filter.dataSource.id + " ";
            }
            searchExpression += searchTerm + "')";

            var data = {
                // $top: top,
                // $skip: skip
            };

            var url = this.buildQueryUrl(this.requestPrefix, '/$all/' + searchExpression);

            // fire request
            return this.ajaxClient.getJson(url, data).then(function (response) {
                var suggestions = [];
                if (response.data.value) {
                    suggestions = this.suggestionParser.parse(query, response.data.value);
                }
                suggestionTermSplitter.concatenate(this, splittedTerm, suggestions);
                return this.sina._createSuggestionResultSet({
                    title: 'Suggestions',
                    query: query,
                    items: suggestions
                });
            }.bind(this));
        },

        getFilterValueFromConditionTree: function (dimension, conditionTree) {
            if (conditionTree.ConditionAttribute && conditionTree.ConditionAttribute === dimension) {
                return conditionTree.ConditionValue;
            } else if (conditionTree.SubFilters) {
                var i;
                var result = null;
                for (i = 0; result === null && i < conditionTree.SubFilters.length; i++) {
                    result = this.getFilterValueFromConditionTree(dimension, conditionTree.SubFilters[i]);
                }
                return result;
            }
            return null;
        },

        logUserEvent: function (event) {
            //return this.userEventLogger.logUserEvent(event);
        },

        buildQueryUrl: function (queryPrefix, queryPostfix) {
            var requestUrl = queryPrefix + '/v5' + queryPostfix;
            return requestUrl;
        },

        getDebugInfo: function () {
            return ' SinaProvider :' + this.id;
        }

    });

});
