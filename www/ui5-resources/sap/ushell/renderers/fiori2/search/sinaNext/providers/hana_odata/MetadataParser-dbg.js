/* global Promise, sinaDefine, sinaRequire, sinaLog */
sinaDefine(['../../core/core', './typeConverter'], function (core, typeConverter) {
    "use strict";

    return core.defineClass({

        _init: function (provider) {
            this.provider = provider;
            this.sina = provider.sina;
            this.presentationUsageConversionMap = {
                TITLE: 'TITLE',
                SUMMARY: 'SUMMARY',
                DETAIL: 'DETAIL',
                IMAGE: 'IMAGE',
                THUMBNAIL: 'THUMBNAIL',
                HIDDEN: 'HIDDEN'
            };
            this.accessUsageConversionMap = {
                AUTO_FACET: 'AUTO_FACET',
                SUGGESTION: 'SUGGESTION'
            };
        },

        _getWindow: function () {
            if (typeof window === "undefined") {
                return new Promise(function (resolve, reject) {
                    sinaRequire(['jsdom', 'fs'], function (jsdom, fs) {
                        var jquery = fs.readFileSync("./node_modules/jquery/dist/jquery.js", "utf-8");

                        jsdom.env({
                            html: "<html><body></body></html>",
                            src: [jquery],
                            done: function (error, window) {
                                if (!error) {
                                    resolve(window);
                                } else {
                                    reject(error);
                                }
                            }
                        });
                    });
                });
            } else {
                return Promise.resolve(window);
            }
        },

        parseResponse: function (metaXML) {
            var that = this;
            // all in one metadata map
            var allInOneMap = {
                businessObjectMap: {}, // entity map with attributes and entityset name as key
                businessObjectList: [], // list of all entities for convenience
                dataSourceMap: {}, // datasource map with entityset name as key
                dataSourcesList: [] // list of all datasources for convenience
            };

            return this._getWindow().then(function (window) {
                window.$(metaXML).find('Schema').each(function () {
                    var $this = window.$(this);
                    var helperMap = that._parseEntityType($this, window);

                    that._parseEntityContainer($this, helperMap, allInOneMap, window);
                });
                return Promise.resolve(allInOneMap);
            });
        },
        //parse entityset and its attributes from EntityType
        _parseEntityType: function (schema, window) {
            var that = this;
            var helperMap = {};
            schema = window.$(schema);

            schema.find('EntityType').each(function () {
                var entityTypeName = window.$(this).attr('Name');
                var entitySet = {
                    schema: schema.attr('Namespace'),
                    keys: [],
                    attributeMap: {},
                    resourceBundle: '',
                    label: ''
                };
                helperMap[entityTypeName] = entitySet;

                //oData keys for accessing a entity
                window.$(this).find('Key>PropertyRef').each(function () {
                    entitySet.keys.push(window.$(this).attr('Name'));
                });
                window.$(this).find('Annotation').each(function () {
                    if (window.$(this).attr('Term') === 'EnterpriseSearchHana.uiResource.label.bundle') {
                        var resourceUrl = window.$(this).attr('String');
                        try {
                            entitySet.resourceBundle = jQuery.sap.resources({
                                url: resourceUrl,
                                language: sap.ui.getCore().getConfiguration().getLanguage()
                            });
                        } catch (e) {
                            sinaLog.error("Resource bundle of " + entityTypeName + " '" + resourceUrl + "' can't be found:" + e.toString());
                        }

                        //Get sibling annotation element of attr EnterpriseSearchHana.uiResource.label.key
                        window.$(this).siblings('Annotation').each(function () {
                            if (window.$(this).attr('Term') === 'EnterpriseSearchHana.uiResource.label.key') {
                                var sKey = window.$(this).attr('String');
                                if (sKey && entitySet.resourceBundle) {
                                    var sTranslatedText = entitySet.resourceBundle.getText(sKey);
                                    if (sTranslatedText) {
                                        entitySet.label = sTranslatedText;
                                    }
                                }
                            }
                        });
                    }
                });

                //Loop attributes
                window.$(this).find('Property').each(function (index) {

                    var attributeName = window.$(this).attr('Name');
                    var attribute = {
                        labelRaw: attributeName,
                        label: null,
                        type: window.$(this).attr('Type'),
                        presentationUsage: [],
                        // accessUsage: [],
                        isFacet: false,
                        isSortable: false,
                        supportsTextSearch: false,
                        displayOrder: index,
                        unknownAnnotation: []
                    };
                    entitySet.attributeMap[attributeName] = attribute;

                    window.$(this).find('Annotation').each(function () {
                        switch (window.$(this).attr('Term')) {
                        case 'SAP.Common.Label':
                            if (!attribute.label) {
                                attribute.label = window.$(this).attr('String');
                            }
                            break;
                        case 'EnterpriseSearchHana.uiResource.label.key':
                            var sKey = window.$(this).attr('String');
                            if (sKey && entitySet.resourceBundle) {
                                var sTranslatedText = entitySet.resourceBundle.getText(sKey);
                                if (sTranslatedText) {
                                    attribute.label = sTranslatedText;
                                }
                            }
                            break;
                        case 'EnterpriseSearch.key':
                            attribute.isKey = window.$(this).attr('Bool') == "true" ? true : false;
                            break;
                        case 'EnterpriseSearch.presentationMode':
                            window.$(this).find('Collection>String').each(function () {
                                var presentationUsage = window.$(this).text();
                                presentationUsage = that.presentationUsageConversionMap[presentationUsage];
                                if (presentationUsage) {
                                    attribute.presentationUsage.push(presentationUsage);
                                }
                            });
                            break;
                            // case 'EnterpriseSearch.usageMode': // No longer available in v5
                            //     window.$(this).find('Collection>String').each(function() {
                            //         var accessUsage = window.$(this).text();
                            //         accessUsage = that.accessUsageConversionMap[accessUsage];
                            //         if (accessUsage) {
                            //             attribute.accessUsage.push(accessUsage);
                            //         }
                            //     });
                            //     break;
                        case 'EnterpriseSearchHana.isSortable':
                            attribute.isSortable = window.$(this).attr('Bool') == "true" ? true : false;
                            break;
                        case 'EnterpriseSearchHana.supportsTextSearch':
                            attribute.supportsTextSearch = window.$(this).attr('Bool') == "true" ? true : false;
                            break;
                        case 'EnterpriseSearch.filteringFacet.default':
                            attribute.isFacet = window.$(this).attr('Bool') == "true" ? true : false;
                            break;
                        case 'EnterpriseSearch.displayOrder':
                            attribute.displayOrder = window.$(this).attr('Int');
                            break;
                            // case '@EnterpriseSearch.filteringFacet.numberOfValues':
                            //     attribute.numberOfFacetValues = window.$(this).attr('Int');
                            //     break;

                        default:
                            attribute.unknownAnnotation.push(window.$(this));
                        }
                    });
                });
            });

            return helperMap;
        },

        //parse datasources from EntityContainer
        _parseEntityContainer: function (schemaXML, helperMap, allInOneMap, window) {
            var that = this;
            schemaXML.find('EntityContainer>EntitySet').each(function () {
                if (window.$(this).attr('Name') && window.$(this).attr('EntityType')) {
                    var name = window.$(this).attr('Name');
                    var entityTypeFullQualified = window.$(this).attr('EntityType');

                    // var schema = entityTypeFullQualified.slice(0, entityTypeFullQualified.lastIndexOf('.'));
                    var entityType = entityTypeFullQualified.slice(entityTypeFullQualified.lastIndexOf('.') + 1);

                    var entitySet = helperMap[entityType];
                    if (entitySet === undefined) {
                        throw 'EntityType ' + entityType + ' has no corresponding meta data!';
                    }

                    var newDatasource = that.sina._createDataSource({
                        id: name,
                        label: entitySet.label || name,
                        labelPlural: entitySet.label || name,
                        type: that.sina.DataSourceType.BusinessObject,
                        attributesMetadata: [{
                            id: 'dummy'
                        }] // fill with dummy attribute
                    });

                    allInOneMap.dataSourceMap[newDatasource.id] = newDatasource;
                    allInOneMap.dataSourcesList.push(newDatasource);

                    //that.fillMetadataBuffer(newDatasource, entitySet);
                    entitySet.name = name;
                    entitySet.dataSource = newDatasource;
                    allInOneMap.businessObjectMap[name] = entitySet;
                    allInOneMap.businessObjectList.push(entitySet);
                }
            });
        },

        fillMetadataBuffer: function (dataSource, attributes) {
            if (dataSource.attributesMetadata[0].id !== 'dummy') { // check if buffer already filled
                return;
            }
            dataSource.attributesMetadata = [];
            dataSource.attributeMetadataMap = {};
            for (var attributeMetadata in attributes.attributeMap) {
                this.fillPublicMetadataBuffer(dataSource, attributes.attributeMap[attributeMetadata]);
            }
        },

        fillPublicMetadataBuffer: function (dataSource, attributeMetadata) {
            var displayOrderIndex = attributeMetadata.displayOrder;
            var type = this.parseAttributeType(attributeMetadata);
            if (type) {
                var publicAttributeMetadata = this.sina._createAttributeMetadata({
                    id: attributeMetadata.labelRaw,
                    label: attributeMetadata.label || attributeMetadata.labelRaw,
                    isKey: attributeMetadata.isKey || false,
                    isSortable: attributeMetadata.isSortable,
                    usage: this.parseUsage(attributeMetadata, displayOrderIndex) || {},
                    type: type,
                    matchingStrategy: this.parseMatchingStrategy(attributeMetadata)
                });

                publicAttributeMetadata.semanticObjectType = attributeMetadata.SemanticObjectTypeId;
                dataSource.attributesMetadata.push(publicAttributeMetadata);
                dataSource.attributeMetadataMap[publicAttributeMetadata.id] = publicAttributeMetadata;
            }

        },

        parseMatchingStrategy: function (attributeMetadata) {
            if (attributeMetadata.supportsTextSearch === true) {
                return this.sina.MatchingStrategy.Text;
            } else {
                return this.sina.MatchingStrategy.Exact;
            }
        },

        parseAttributeType: function (attributeMetadata) {

            for (var i = 0; i < attributeMetadata.presentationUsage.length; i++) {
                var presentationUsage = attributeMetadata.presentationUsage[i] || '';
                switch (presentationUsage.toUpperCase()) {
                case 'SUMMARY':
                    continue;
                case 'DETAIL':
                    continue;
                case 'TITLE':
                    continue;
                case 'HIDDEN':
                    continue;
                case 'FACTSHEET':
                    continue;
                case 'THUMBNAIL':
                case 'IMAGE':
                    return this.sina.AttributeType.ImageUrl;
                case 'LONGTEXT':
                    return this.sina.AttributeType.Longtext;
                default:
                    throw new core.Exception('Unknown presentation usage ' + presentationUsage);
                }
            }

            switch (attributeMetadata.type) {
            case 'Edm.String':
            case 'Edm.Binary':
            case 'Edm.Boolean':
            case 'Edm.Byte':
            case 'Edm.Guid':
                return this.sina.AttributeType.String;

            case 'Edm.Double':
            case 'Edm.Decimal':
            case 'Edm.Float':
                return this.sina.AttributeType.Double;

            case 'Edm.Int16':
            case 'Edm.Int32':
            case 'Edm.Int64':
                return this.sina.AttributeType.Integer;

            case 'Edm.Time':
                return this.sina.AttributeType.Time;

            case 'Edm.DateTime':
                if (attributeMetadata.TypeLength > 8) {
                    return this.sina.AttributeType.Timestamp;
                }
                return this.sina.AttributeType.Timestamp;
            case 'Collection(Edm.String)':
                return this.sina.AttributeType.String;
            case 'GeoJson':
                return this.sina.AttributeType.GeoJson;
            default:
                //throw new core.Exception('Unknown data type ' + attributeMetadata.type);
                //console.error('Unknown data type ' + attributeMetadata.type);
                return null;
            }
        },

        parseUsage: function (attributeMetadata, displayOrderIndex) {
            var usage = {};
            for (var i = 0; i < attributeMetadata.presentationUsage.length; i++) {
                var id = attributeMetadata.presentationUsage[i].toUpperCase() || '';
                if (id === "TITLE") {
                    usage.Title = {
                        displayOrder: displayOrderIndex
                    };
                }

                if (id === "SUMMARY" ||
                    id === "DETAIL" ||
                    id === "IMAGE" ||
                    id === "THUMBNAIL" ||
                    id === "LONGTEXT"
                    //||id === "#HIDDEN"
                ) {
                    usage.Detail = {
                        displayOrder: displayOrderIndex
                    };
                }
            }

            if (attributeMetadata.isFacet) {
                usage.AdvancedSearch = {
                    displayOrder: displayOrderIndex
                };
            }

            return usage;
        }

    });
});
