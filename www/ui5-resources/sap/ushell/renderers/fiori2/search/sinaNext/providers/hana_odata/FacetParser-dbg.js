/* global sinaDefine */
sinaDefine(['../../core/core', '../../sina/SearchQuery', './typeConverter'], function (core, SearchQuery, typeConverter) {
    "use strict";

    return core.defineClass({

        _init: function (provider) {
            this.provider = provider;
            this.sina = provider.sina;
        },

        parse: function (query, data) {

            var facets = [];

            if (!data) {
                return [];
            }

            for (var i = 0; i < data.length; i++) {
                var facetData = data[i];

                // var dimension = '';
                // if (query.dimension) {
                //     dimension = query.dimension;
                // } else if (facetData["@com.sap.vocabularies.Search.v1.Facet"] && facetData["@com.sap.vocabularies.Search.v1.Facet"].Dimensions && facetData["@com.sap.vocabularies.Search.v1.Facet"].Dimensions[0] && facetData["@com.sap.vocabularies.Search.v1.Facet"].Dimensions[0].PropertyName) {
                //     dimension = facetData["@com.sap.vocabularies.Search.v1.Facet"]["Dimensions"][0].PropertyName;
                // }

                if (query.filter.dataSource === query.sina.getAllDataSource()) {
                    facets.push(this.parseDataSourceFacet(query, facetData));
                } else {
                    if (query.filter.dataSource.type === query.sina.DataSourceType.Category) {
                        continue; // ignore common attributes facets
                    }
                    facets.push(this.parseChartFacet(query, facetData));
                }
            }
            return core.Promise.all(facets);
        },

        parseDataSourceFacet: function (query, facetData) {
            // for search query with datasource facet: create corresponding datasource query
            var dataSourceQuery = query;
            if (query instanceof SearchQuery) {
                dataSourceQuery = this.sina.createDataSourceQuery({
                    dataSource: query.filter.dataSource,
                    filter: query.filter.clone()
                });
            }

            // assemble results set items
            var items = [];
            for (var i = 0; i < facetData.Items.length; i++) {
                var cell = facetData.Items[i];

                // create filter (used when clicking on the item)
                var dataSource = this.sina.getDataSource(cell.scope);
                if (!dataSource) {
                    dataSource = this.sina._createDataSource({
                        type: this.sina.DataSourceType.Category,
                        id: cell.ValueLow,
                        label: cell.Description
                    });
                }

                // create item
                items.push(this.sina._createDataSourceResultSetItem({
                    dataSource: dataSource,
                    dimensionValueFormatted: dataSource.labelPlural,
                    measureValue: cell._Count,
                    measureValueFormatted: (cell._Count).toString()
                }));
            }

            // create result set
            var resultSet = this.sina._createDataSourceResultSet({
                title: query.filter.dataSource.label,
                items: items,
                query: dataSourceQuery
            });

            // init query with result set
            if (query instanceof SearchQuery) {
                return dataSourceQuery._setResultSet(resultSet);
            }

            return resultSet;
        },

        createAttributeFilterCondition: function (attributeId, metadata, cell) {
            if (typeof cell[attributeId] === 'object' && (cell[attributeId].hasOwnProperty('From') || cell[attributeId].hasOwnProperty('From'))) {
                // Range Condition
                var finalCondition = this.sina.createComplexCondition({
                    attributeLabel: metadata.label,
                    valueLabel: this.formatFacetValue(cell[attributeId], metadata),
                    operator: this.sina.LogicalOperator.And,
                    conditions: []
                });
                var lowBoundCondition, upperBoundCondition;
                if (!cell[attributeId].From) {
                    upperBoundCondition = this.sina.createSimpleCondition({
                        attribute: attributeId,
                        operator: this.sina.ComparisonOperator.Le,
                        value: typeConverter.odata2Sina(metadata.type, cell[attributeId].To)
                    });
                    finalCondition.conditions.push(upperBoundCondition);
                } else if (!cell[attributeId].To) {
                    lowBoundCondition = this.sina.createSimpleCondition({
                        attribute: attributeId,
                        operator: this.sina.ComparisonOperator.Ge,
                        value: typeConverter.odata2Sina(metadata.type, cell[attributeId].From)
                    });
                    finalCondition.conditions.push(lowBoundCondition);
                } else {
                    lowBoundCondition = this.sina.createSimpleCondition({
                        attribute: attributeId,
                        operator: this.sina.ComparisonOperator.Ge,
                        value: typeConverter.odata2Sina(metadata.type, cell[attributeId].From)
                    });
                    finalCondition.conditions.push(lowBoundCondition);
                    upperBoundCondition = this.sina.createSimpleCondition({
                        attribute: attributeId,
                        operator: this.sina.ComparisonOperator.Le,
                        value: typeConverter.odata2Sina(metadata.type, cell[attributeId].To)
                    });
                    finalCondition.conditions.push(upperBoundCondition);
                }
                return finalCondition;
            } else {
                // Single Condition
                return this.sina.createSimpleCondition({
                    attributeLabel: metadata.label,
                    attribute: attributeId,
                    value: cell[attributeId],
                    valueLabel: typeConverter.odata2Sina(metadata.type, cell[attributeId])
                });

            }
        },

        formatFacetValue: function (value, metadata) {
            var initialValue = '';
            // if (metadata.type === 'Double' || metadata.type === 'Integer') {
            //     initialValue = 0;
            // }

            if (value['@com.sap.vocabularies.Common.v1.Label']) {
                return value['@com.sap.vocabularies.Common.v1.Label'];
            }
            if (typeof value === 'object' && (value.hasOwnProperty('From') || value.hasOwnProperty('To'))) {
                value = (value.From || initialValue) + '...' + (value.To || initialValue);
            }
            return value;
        },

        parseChartFacet: function (query, facetData) {
            // var dataSource = this.sina.getDataSource(query.filter.dataSource.id);
            var dataSource = query.filter.dataSource;
            var attributeId = '';
            if (query.dimension) {
                attributeId = query.dimension;
            } else if (facetData["@com.sap.vocabularies.Search.v1.Facet"] && facetData["@com.sap.vocabularies.Search.v1.Facet"].Dimensions && facetData["@com.sap.vocabularies.Search.v1.Facet"].Dimensions[0] && facetData["@com.sap.vocabularies.Search.v1.Facet"].Dimensions[0].PropertyName) {
                attributeId = facetData["@com.sap.vocabularies.Search.v1.Facet"]["Dimensions"][0].PropertyName;
            }
            var metadata = dataSource.getAttributeMetadata(attributeId);

            var items = [];
            // for search query with attribute facet: create corresponding chart query
            var filter;
            var chartQuery = query;
            filter = query.filter.clone();
            filter.setDataSource(dataSource); // relevant only for common attribute facets
            filter.setRootCondition(query.filter.rootCondition.clone()); // changing ds removes condition
            chartQuery = this.sina.createChartQuery({
                filter: filter,
                dimension: attributeId
            });
            // create result set items
            for (var i = 0; i < facetData.Items.length; i++) {
                var cell = facetData.Items[i];
                items.push(this.sina._createChartResultSetItem({
                    filterCondition: this.createAttributeFilterCondition(attributeId, metadata, cell),
                    dimensionValueFormatted: this.formatFacetValue(cell[attributeId], metadata),
                    measureValue: cell['_Count'],
                    measureValueFormatted: cell['_Count']
                }));
            }

            // create result set
            var resultSet = this.sina._createChartResultSet({
                title: metadata.label,
                items: items,
                query: chartQuery
            });

            // init query with result set
            if (query instanceof SearchQuery) {
                return chartQuery._setResultSet(resultSet);
            }

            return resultSet;
        }
    });

});
