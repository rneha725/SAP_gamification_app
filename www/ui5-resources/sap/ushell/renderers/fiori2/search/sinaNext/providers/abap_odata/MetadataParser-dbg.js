/* global sinaDefine */
sinaDefine(['../../core/core', './typeConverter', '../tools/cds/CDSAnnotationsParser'], function (core, typeConverter, CDSAnnotationsParser) {
    "use strict";

    return core.defineClass({

        _init: function (provider) {
            this.provider = provider;
            this.sina = provider.sina;
            this.cdsAnnotationsParser = this.sina._createCDSAnnotationsParser();
        },

        fillMetadataBuffer: function (dataSource, attributes) {
            if (dataSource.attributesMetadata[0].id !== 'dummy') { // check if buffer already filled
                return;
            }
            dataSource.attributesMetadata = [];
            dataSource.attributeMetadataMap = {};
            var i;
            var titleAttributes = [];
            var detailAttributesPrio1 = [];
            var detailAttributesPrio2 = [];
            var detailAttributes = [];
            var publicAttributeMetadata;
            var attributeMetadata;
            var unitOfMeasureAttributes = {};

            var cdsAnnotations = {
                dataSourceAnnotations: {}, // Key-Value-Map for CDS annotations
                attributeAnnotations: {} // Key-Value-Map (keys: attribute names) of Key-Value-Maps (keys: annotation names) for CDS annotations
            };

            for (i = 0; i < dataSource.annotations.length; i++) {
                cdsAnnotations.dataSourceAnnotations[dataSource.annotations[i].Name] = dataSource.annotations[i].Value;
            }

            for (i = 0; i < attributes.length; i++) {
                attributeMetadata = attributes[i];

                publicAttributeMetadata = this.fillPublicMetadataBuffer(dataSource, attributeMetadata, unitOfMeasureAttributes);

                // Prepare annotations for being passed over to the CDS annotations parser
                var attributeAnnotations = cdsAnnotations.attributeAnnotations[publicAttributeMetadata.id] = {};
                var attributeAnnotationsSrc = attributeMetadata.Annotations && attributeMetadata.Annotations.results || [];

                // if this attribute has a Semantics property but no semantics annotation, create a new semantics annotation that corresponds to Semantics propery.
                var hasSemanticsAnnotation = false,
                    semanticsPrefix = "SEMANTICS.";
                for (var j = 0; j < attributeAnnotationsSrc.length; j++) {
                    attributeAnnotations[attributeAnnotationsSrc[j].Name] = attributeAnnotationsSrc[j].Value;
                    if (hasSemanticsAnnotation || attributeAnnotationsSrc[j].Name.substr(0, semanticsPrefix.length) == semanticsPrefix) {
                        hasSemanticsAnnotation = true;
                    }
                }
                if (attributeMetadata.Semantics && !hasSemanticsAnnotation) {
                    var semanticsValue;
                    switch (attributeMetadata.Semantics) {
                    case "EMAIL.ADDRESS":
                    case "TELEPHONE.TYPE":
                    case "CURRENCYCODE":
                    case "UNITOFMEASURE":
                        semanticsValue = "TRUE";
                        break;
                    case "QUANTITY.UNITOFMEASURE":
                    case "AMOUNT.CURRENCYCODE":
                        semanticsValue = attributeMetadata.UnitAttribute;
                        break;
                    }
                    if (semanticsValue) {
                        attributeAnnotations[semanticsPrefix + attributeMetadata.Semantics] = semanticsValue;
                    }
                }

                if (publicAttributeMetadata.temporaryUsage.Title !== undefined) {
                    titleAttributes.push(publicAttributeMetadata);
                }
                if (publicAttributeMetadata.temporaryUsage.Detail !== undefined) {
                    if (attributeMetadata.isSummary) {
                        detailAttributesPrio1.push(publicAttributeMetadata);
                    } else {
                        detailAttributesPrio2.push(publicAttributeMetadata);
                    }
                }
            }

            var parsingResult = this.cdsAnnotationsParser.parseCDSAnnotationsForDataSource(dataSource, cdsAnnotations);

            if (!parsingResult.dataSourceIsCdsBased) {
                // calculate title display order
                titleAttributes.sort(this._createSortFunction("Title"));
                for (i = 0; i < titleAttributes.length; ++i) {
                    var attributeId = titleAttributes[i].id;
                    attributeMetadata = dataSource.getAttributeMetadata(attributeId);
                    attributeMetadata.usage.Title = attributeMetadata.temporaryUsage.Title;
                    attributeMetadata.usage.Title.displayOrder = i;
                }

                // calculate attribute area display order
                var sortFunction = this._createSortFunction("Detail");
                detailAttributesPrio1.sort(sortFunction);
                detailAttributesPrio2.sort(sortFunction);
                detailAttributes.push.apply(detailAttributes, detailAttributesPrio1);
                detailAttributes.push.apply(detailAttributes, detailAttributesPrio2);
                for (i = 0; i < detailAttributes.length; ++i) {
                    detailAttributes[i].usage.Detail = detailAttributes[i].temporaryUsage.Detail;
                    detailAttributes[i].usage.Detail.displayOrder = i;
                }
            }

            for (i = 0; i < dataSource.attributesMetadata.length; i++) {
                attributeMetadata = dataSource.attributesMetadata[i];
                if (attributeMetadata.temporaryUsage) {
                    for (var usageName in attributeMetadata.temporaryUsage) {
                        if (usageName != "Title" && usageName != "Detail") {
                            attributeMetadata.usage[usageName] = attributeMetadata.temporaryUsage[usageName];
                        }
                    }
                    // delete attributeMetadata.temporaryUsage;
                }
            }
        },

        _createSortFunction: function (usagePropery) {
            return function (a1, a2) {
                if (a1.temporaryUsage[usagePropery].displayOrder < a2.temporaryUsage[usagePropery].displayOrder) {
                    return -1;
                } else if (a1.temporaryUsage[usagePropery].displayOrder > a2.temporaryUsage[usagePropery].displayOrder) {
                    return 1;
                } else {
                    return 0;
                }
            };
        },

        fillPublicMetadataBuffer: function (dataSource, attributeMetadata, unitOfMeasureAttributes) {
            var displayOrderIndex = attributeMetadata.Displayed && attributeMetadata.DisplayOrder ? attributeMetadata.DisplayOrder : -1; // oliver

            var publicAttributeMetadata = this.sina._createAttributeMetadata({
                id: attributeMetadata.Id,
                label: attributeMetadata.Name !== "" ? attributeMetadata.Name : attributeMetadata.Id,
                isKey: attributeMetadata.Key,
                isSortable: attributeMetadata.Sortable,
                usage: {}, //attributeMetadata.UIAreas ? this.parseUsage(attributeMetadata, displayOrderIndex) : {},
                type: this.parseAttributeType(attributeMetadata),
                matchingStrategy: this.parseMatchingStrategy(attributeMetadata)
            });

            publicAttributeMetadata.semanticObjectType = attributeMetadata.SemanticObjectTypeId;

            // temporaly store usage in this property.
            // we'll decide later whether we use this, or whether we use annotations for setting the usage.
            publicAttributeMetadata.temporaryUsage = attributeMetadata.UIAreas ? this.parseUsage(attributeMetadata, displayOrderIndex) : {};


            dataSource.attributesMetadata.push(publicAttributeMetadata);
            dataSource.attributeMetadataMap[publicAttributeMetadata.id] = publicAttributeMetadata;

            return publicAttributeMetadata;
        },

        parseMatchingStrategy: function (attributeMetadata) {
            if (attributeMetadata.TextIndexed) {
                return this.sina.MatchingStrategy.Text;
            } else {
                return this.sina.MatchingStrategy.Exact;
            }
        },

        parseAttributeType: function (attributeMetadata) {

            for (var i = 0; i < attributeMetadata.UIAreas.results.length; i++) {
                var presentationUsage = attributeMetadata.UIAreas.results[i];
                var id = presentationUsage.Id;
                switch (id) {
                case 'SUMMARY':
                    continue;
                case 'DETAILS':
                    continue;
                case 'TITLE':
                    continue;
                case '#HIDDEN':
                    continue;
                case 'FACTSHEET':
                    continue;
                case 'DETAILIMAGE':
                case 'PREVIEWIMAGE':
                    return this.sina.AttributeType.ImageUrl;
                case 'LONGTEXT':
                    return this.sina.AttributeType.Longtext;
                default:
                    throw new core.Exception('Unknown presentation usage ' + presentationUsage);
                }
            }

            switch (attributeMetadata.EDMType) {
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
                return this.sina.AttributeType.Date;
            case 'GeoJson':
                return this.sina.AttributeType.GeoJson;
            default:
                throw new core.Exception('Unknown data type ' + attributeMetadata.EDMType);
            }
        },

        parseUsage: function (attributeMetadata, displayOrderIndex) {
            var usagesInResponse = attributeMetadata.UIAreas.results;
            var advancedSearch = attributeMetadata.Facet;
            var usage = {};
            usagesInResponse.forEach(function (elem) {
                var id = elem.Id;
                if (id === "TITLE") {
                    usage.Title = {
                        displayOrder: displayOrderIndex
                    };
                }

                if (id === "SUMMARY" ||
                    id === "DETAILIMAGE" ||
                    id === "PREVIEWIMAGE"
                ) {
                    attributeMetadata.isSummary = true;
                    usage.Detail = {
                        displayOrder: displayOrderIndex
                    };
                }

                if (id === "DETAILS" ||
                    id === "LONGTEXT"
                    //||id === "#HIDDEN"
                ) {
                    usage.Detail = {
                        displayOrder: displayOrderIndex
                    };
                }
            });

            if (advancedSearch) {
                usage.AdvancedSearch = {
                    displayOrder: displayOrderIndex
                };
            }

            return usage;
        }

    });

});
