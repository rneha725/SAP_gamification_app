/* global sinaDefine */
sinaDefine(['../../core/core', '../../sina/sinaFactory'], function (core, sinaFactory) {
    "use strict";

    return core.defineClass({
        id: 'multi',
        _initAsync: function (properties) {

            this.sina = properties.sina;
            this.multiSina = [];
            this.multiDataSourceMap = {};
            this.sina.dataSourceMap[this.sina.allDataSource.id] = this.sina.allDataSource;

            var doCreate = function (index) {

                if (index >= properties.subProviders.length) {
                    if (this.multiSina.length < 1) {
                        return core.Promise.reject(new core.Exception('sina creation by trial failed'));
                    } else {
                        return undefined;
                    }
                }

                var configuration = properties.subProviders[index];
                return sinaFactory.createAsync(configuration).then(function (childSina) {

                    for (var i = 0; i < childSina.dataSources.length; i++) {
                        var childDataSource = childSina.dataSources[i];
                        var multiId = this.updateId(childDataSource.id, childSina.provider.id);
                        this.sina._createDataSource({
                            id: multiId,
                            label: this.updateLabel(childDataSource.label, childSina.provider.id),
                            labelPlural: this.updateLabel(childDataSource.labelPlural, childSina.provider.id),
                            type: childDataSource.type,
                            hidden: childDataSource.hidden,
                            attributesMetadata: childDataSource.attributesMetadata
                        });
                        this.multiDataSourceMap[multiId] = childDataSource;
                    }

                    this.multiSina.push(childSina);
                    return doCreate(index + 1);

                }.bind(this), function () {
                    return doCreate(index + 1);
                }.bind(this));
            }.bind(this);
            return doCreate(0);

        },

        executeSearchQuery: function (query) {

            var that = this;
            that.searchResultSet = this.sina._createSearchResultSet({
                title: 'Search Multi Result List',
                query: query,
                items: [],
                totalCount: 0,
                facets: []
            });

            if (query.filter.dataSource === this.sina.allDataSource) {

                var mergeIndex = 1;
                that.searchResultSet.title = 'Search Multi Result List';
                that.searchResultSet.facets.push(this.sina._createDataSourceResultSet({
                    title: query.filter.dataSource.label,
                    items: [],
                    query: query
                }));

                var doCall = function (index) {
                    if (index >= that.multiSina.length) {
                        that.searchResultSet.items = that.searchResultSet.items.slice(0, query.top);
                        return that.searchResultSet;
                    }
                    var childQuery = that.multiSina[index].createSearchQuery({
                        dataSource: that.multiSina[index].allDataSource,
                        searchTerm: query.getSearchTerm(),
                        top: query.top
                    });
                    return childQuery.getResultSetAsync().then(function (searchResultSet) {
                        that.searchResultSet.items = that.mergeMultiResults(that.searchResultSet.items, searchResultSet.items, mergeIndex);
                        that.searchResultSet.totalCount += searchResultSet.totalCount;
                        var childDataSource = that.sina.getDataSource(that.updateId(searchResultSet.query.filter.dataSource.id, searchResultSet.sina.provider.id));
                        that.searchResultSet.facets[0].items.push(that.sina._createDataSourceResultSetItem({
                            dataSource: childDataSource,
                            dimensionValueFormatted: that.updateLabel(searchResultSet.query.filter.dataSource.label, searchResultSet.sina.provider.id),
                            measureValue: searchResultSet.totalCount,
                            measureValueFormatted: searchResultSet.totalCount
                        }));
                        mergeIndex++;
                        return doCall(index + 1);
                    });
                };

                return doCall(0);

            } else {

                var childDataSource = that.multiDataSourceMap[query.filter.dataSource.id];
                var childQuery = childDataSource.sina.createSearchQuery({
                    calculateFacets: query.calculateFacets,
                    multiSelectFacets: query.multiSelectFacets,
                    dataSource: childDataSource,
                    searchTerm: query.getSearchTerm(),
                    rootCondition: query.getRootCondition(),
                    top: query.top,
                    skip: query.skip,
                    sortOrder: query.sortOrder
                });
                return childQuery.getResultSetAsync().then(function (searchResultSet) {
                    that.searchResultSet.items = searchResultSet.items;
                    that.searchResultSet.totalCount = searchResultSet.totalCount;
                    //                    that.searchResultSet.facets = searchResultSet.facets;

                    for (var i = 0; i < that.searchResultSet.items.length; i++) {
                        var resultItem = that.searchResultSet.items[i];
                        var resultItemMultiId = that.updateId(resultItem.dataSource.id, resultItem.sina.provider.id);
                        //update attributes metadata
                        that.updateAttributesMetadata(resultItem.dataSource, that.sina.dataSourceMap[resultItemMultiId]);
                        //set the facet result item dataSource as multi provider dataSource
                        resultItem.dataSource = that.sina.dataSourceMap[resultItemMultiId];
                    }

                    var multiFacets = [];
                    //dataSource facet
                    if (searchResultSet.facets.length === 1 && searchResultSet.facets[0].items[0].dataSource) {
                        multiFacets = searchResultSet.facets;
                        for (var j = 0; j < searchResultSet.facets[0].items.length; j++) {
                            var facetItem = searchResultSet.facets[0].items[j];
                            if (facetItem.dataSource) {
                                var facetItemMultiId = that.updateId(facetItem.dataSource.id, facetItem.sina.provider.id);
                                //new Category, should be insert to multi provider
                                if (!that.multiDataSourceMap[facetItemMultiId]) {
                                    that.sina._createDataSource({
                                        id: facetItemMultiId,
                                        label: that.updateLabel(facetItem.dataSource.label, facetItem.sina.provider.id),
                                        labelPlural: that.updateLabel(facetItem.dataSource.labelPlural, facetItem.sina.provider.id),
                                        type: facetItem.dataSource.type,
                                        hidden: facetItem.dataSource.hidden,
                                        attributesMetadata: facetItem.dataSource.attributesMetadata
                                    });
                                    that.multiDataSourceMap[facetItemMultiId] = facetItem.dataSource;
                                }
                                //set the facet result item dataSource as multi provider dataSource
                                facetItem.dataSource = that.sina.dataSourceMap[facetItemMultiId];
                                multiFacets[0].title = that.updateLabel(searchResultSet.facets[0].title, searchResultSet.facets[0].sina.provider.id);
                            }
                        }
                    } else { //chart facet
                        multiFacets = [];
                        for (var k = 0; k < searchResultSet.facets.length; k++) {
                            var chartResultSet = searchResultSet.facets[k];
                            multiFacets.push(that._createMultiChartResultSet(chartResultSet));
                        }
                    }
                    that.searchResultSet.facets = multiFacets;

                    return that.searchResultSet;
                });
            }
        },

        executeChartQuery: function (query) {

            var that = this;
            var childDataSource = that.multiDataSourceMap[query.filter.dataSource.id];
            // check (todo): double chart request,
            var childQuery = childDataSource.sina.createChartQuery({
                dimension: query.dimension,
                dataSource: childDataSource,
                searchTerm: query.getSearchTerm(),
                rootCondition: query.getRootCondition(),
                top: query.top,
                skip: query.skip,
                sortOrder: query.sortOrder
            });
            return childQuery.getResultSetAsync().then(function (chartResultSet) {
                return that._createMultiChartResultSet(chartResultSet);
            });
        },

        mergeMultiResults: function (firstResults, secondResults, mergeIndex) {
            if (mergeIndex < 1) {
                return [];
            }
            if (mergeIndex === 1) {
                return secondResults;
            }
            var firstLength = firstResults.length;
            var secondLength = secondResults.length;
            for (var i = 0; i < firstLength; i++) {
                if (i >= secondLength) {
                    break;
                }
                firstResults.splice(mergeIndex * (i + 1) - 1, 0, secondResults[i]);
            }
            if (secondLength > firstLength) {
                firstResults = firstResults.concat(secondResults.slice(firstLength - secondLength));
            }
            return firstResults;
        },

        updateLabel: function (label, identify) {
            return label + ' (' + identify + ')';
        },

        updateId: function (id, identify) {
            return identify + '_' + id;
        },

        updateAttributesMetadata: function (dataSourceWithMetadata, dataSource) {
            dataSource.attributesMetadata = dataSourceWithMetadata.attributesMetadata;
            dataSource.attributeMetadataMap = dataSourceWithMetadata.attributeMetadataMap;
        },

        _createMultiChartResultSet: function (chartResultSet) {
            var that = this;
            var multiChartResultSet = that.sina._createChartResultSet({
                id: chartResultSet.id,
                items: [],
                query: chartResultSet.query,
                title: chartResultSet.title
            });
            for (var i = 0; i < chartResultSet.items.length; i++) {
                var childChartResultSetItem = chartResultSet.items[i];
                var childFilterCondition = that.sina.parseConditionFromJson(childChartResultSetItem.filterCondition.toJson());
                multiChartResultSet.items.push(that.sina._createChartResultSetItem({
                    filterCondition: childFilterCondition,
                    dimensionValueFormatted: childChartResultSetItem.dimensionValueFormatted,
                    measureValue: childChartResultSetItem.measureValue,
                    measureValueFormatted: childChartResultSetItem.measureValueFormatted
                }));
            }
            return multiChartResultSet;
        }
    });

});
