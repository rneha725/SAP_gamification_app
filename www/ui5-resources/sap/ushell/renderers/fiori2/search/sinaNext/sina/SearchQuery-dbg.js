/* global sinaDefine */
sinaDefine(['../core/core', './Query'], function (core, Query) {
    "use strict";

    return Query.derive({

        _meta: {
            properties: {
                calculateFacets: {
                    required: false,
                    default: false,
                    setter: true
                },
                multiSelectFacets: {
                    required: false,
                    default: false,
                    setter: true
                },
                nlq: {
                    required: false,
                    default: false,
                    setter: true
                },
                facetTop: {
                    required: false,
                    default: 5,
                    setter: true
                }
            }
        },

        _initClone: function (other) {
            this.calculateFacets = other.calculateFacets;
            this.multiSelectFacets = other.multiSelectFacets;
            this.nlq = other.nlq;
            this.facetTop = other.facetTop;
        },

        _equals: function (other, mode) {
            // check nlq
            if (this.nlq !== other.nlq) {
                return false;
            }
            // check multiSelectFacets
            if (this.multiSelectFacets !== other.multiSelectFacets) {
                return false;
            }
            // check facetTop
            if (this.facetTop !== other.facetTop) {
                return false;
            }
            // special check for calculate Facets
            switch (mode) {
            case this.sina.EqualsMode.CheckFireQuery:
                if (other.calculateFacets && !this.calculateFacets) {
                    // if old query (other) was with facets and new is without
                    // -> we do not need to fire new query -> return true
                    return true;
                }
                return this.calculateFacets === other.calculateFacets;
            default:
                return this.calculateFacets === other.calculateFacets;
            }
        },

        _execute: function (query) {

            var filterAttributes;
            var chartQueries = [];

            // multi select facets: assemble chart queries for all facets with set filters
            // (The main search request typically does not inlcude facets if a filter is set for a facet,
            //  because the facet then is trivial. For multi select we need to display also facets with set
            // filters therefore a special chart query is assembled)
            if (this.multiSelectFacets) {
                // collect attribute for which filters are set
                filterAttributes = this._collectAttributesWithFilter(query);
                // create chart queries for filterAttribute
                chartQueries = this._createChartQueries(query, filterAttributes);
            }

            // fire all requests
            var requests = [];
            requests.push(this.sina.provider.executeSearchQuery(query));
            for (var i = 0; i < chartQueries.length; ++i) {
                var chartQuery = chartQueries[i];
                requests.push(chartQuery.getResultSetAsync());
            }

            // wait for all resultsets
            return Promise.all(requests).then(function (results) {
                var searchResult = results[0];
                var chartResultSets = results.slice(1);
                this._addChartResultSetsToSearchResultSet(searchResult, chartResultSets);
                return searchResult;
            }.bind(this));

        },

        _formatResultSetAsync: function (resultSet) {
            return core.executeSequentialAsync(this.sina.searchResultSetFormatters, function (formatter) {
                return formatter.formatAsync(resultSet);
            });
        },

        _collectAttributesWithFilter: function (query) {
            var attributeMap = {};
            this._doCollectAttributes(attributeMap, query.filter.rootCondition);
            return Object.keys(attributeMap);
        },

        _doCollectAttributes: function (attributeMap, condition) {
            switch (condition.type) {
            case this.sina.ConditionType.Simple:
                attributeMap[condition.attribute] = true;
                break;
            case this.sina.ConditionType.Complex:
                for (var i = 0; i < condition.conditions.length; ++i) {
                    var subCondition = condition.conditions[i];
                    this._doCollectAttributes(attributeMap, subCondition);
                }
                break;
            }
        },

        _createChartQuery: function (query, filterAttribute) {
            var chartQuery = this.sina.createChartQuery({
                dimension: filterAttribute,
                top: this.facetTop
            });
            chartQuery.setFilter(query.filter.clone());
            chartQuery.filter.rootCondition.removeAttributeConditions(filterAttribute);
            return chartQuery;
        },

        _createChartQueries: function (query, filterAttributes) {
            var chartQueries = [];
            for (var i = 0; i < filterAttributes.length; ++i) {
                var filterAttribute = filterAttributes[i];
                var chartQuery = this._createChartQuery(query, filterAttribute);
                chartQueries.push(chartQuery);
            }
            return chartQueries;
        },

        _addChartResultSetsToSearchResultSet: function (searchResultSet, chartResultSets) {
            for (var i = 0; i < chartResultSets.length; ++i) {
                var chartResultSet = chartResultSets[i];
                this._addChartResultSetToSearchResultSet(searchResultSet, chartResultSet);
            }
        },

        _addChartResultSetToSearchResultSet: function (searchResultSet, chartResultSet) {

            if (chartResultSet.items.length === 0) {
                return;
            }

            // check for matching facet in searchResultSet
            var dimension = chartResultSet.query.dimension;
            var matchFacet = null;
            var i;
            for (i = 0; i < searchResultSet.facets.length; ++i) {
                var facet = searchResultSet.facets[i];
                if (facet.query.dimension === dimension) {
                    matchFacet = facet;
                    break;
                }
            }

            if (matchFacet) {
                // replace facet
                searchResultSet.facets.splice(i, 1, chartResultSet);
            } else {
                // add facet
                searchResultSet.facets.push(chartResultSet);
            }
        }


    });



});
