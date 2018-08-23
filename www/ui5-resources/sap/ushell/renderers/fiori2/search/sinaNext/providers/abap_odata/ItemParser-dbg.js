/* global sinaDefine, Promise */
sinaDefine(['../../core/core', '../../core/util', './typeConverter', '../tools/fiori/FioriIntentsResolver', '../../sina/NavigationTarget'], function (core, util, typeConverter, IntentsResolver, NavigationTarget) {
    "use strict";

    return core.defineClass({

        _init: function (provider) {
            this.provider = provider;
            this.sina = provider.sina;
            this.intentsResolver = this.sina._createFioriIntentsResolver();
            this.suvNavTargetResolver = this.sina._createSuvNavTargetResolver();
        },

        parse: function (searchQuery, data) {
            if (data.ResultList.SearchResults === null) {
                return Promise.resolve([]);
            }
            var itemsData = data.ResultList.SearchResults.results;
            return this.parseItems(itemsData);
        },
        parseItems: function (itemsData) {
            var itemProms = [];
            for (var i = 0; i < itemsData.length; ++i) {
                var itemData = itemsData[i];
                var itemProm = this.parseItem(itemData);
                itemProms.push(itemProm);
            }
            return Promise.all(itemProms);
        },
        parseItem: function (itemData) {
            var allAttributes = {};
            var titleAttributes = [];
            var detailAttributes = [];
            var unitOfMeasureAttributes = {}; // includes currency attributes
            // var descriptionAttributes = {};
            var attributesLookingForTheirUomAttribute = [];
            var attributesLookingForTheirDescriptionAttribute = [];
            var suvAttributes = {};
            var whyFoundAttributes = [];
            var semanticObjectTypeAttributes = [];
            var fallbackDefaultNavigationTarget;
            var dataSource = this.sina.getDataSource(itemData.DataSourceId);
            var attributeData, metadata, attribute, semanticObjectType;

            for (var j = 0; j < itemData.Attributes.results.length; j++) {

                attributeData = itemData.Attributes.results[j];
                metadata = dataSource.getAttributeMetadata(attributeData.Id);

                attribute = this.sina._createSearchResultSetItemAttribute({
                    id: attributeData.Id,
                    label: metadata.label,
                    value: typeConverter.odata2Sina(metadata.type, attributeData.Value),
                    valueFormatted: attributeData.ValueFormatted || attributeData.Value,
                    valueHighlighted: attributeData.Snippet || attributeData.ValueFormatted || attributeData.Value,
                    isHighlighted: attributeData.Snippet.indexOf("<b>") > -1 && attributeData.Snippet.indexOf("</b>") > -1,
                    metadata: metadata
                });

                if (metadata.isUnitOfMeasure || metadata.isCurrency) {
                    unitOfMeasureAttributes[attributeData.Id] = attribute;
                    continue;
                }

                if (metadata.unitOfMeasureAttribute) {
                    var unitOfMeasureAttribute = unitOfMeasureAttributes[metadata.unitOfMeasureAttribute.id];
                    if (unitOfMeasureAttribute) {
                        attribute.unitOfMeasure = unitOfMeasureAttribute;
                    } else {
                        attributesLookingForTheirUomAttribute.push(attribute);
                    }
                }

                if (metadata.descriptionAttribute) {
                    var descriptionAttribute = allAttributes[metadata.descriptionAttribute.id];
                    if (descriptionAttribute) {
                        attribute.description = descriptionAttribute;
                    } else {
                        attributesLookingForTheirDescriptionAttribute.push(attribute);
                    }
                }

                if (metadata.suvUrlAttribute && metadata.suvMimeTypeAttribute) {
                    var suvUrlAttribute = allAttributes[metadata.suvUrlAttribute] || metadata.suvUrlAttribute.id;
                    var suvMimeTypeAttribute = allAttributes[metadata.suvMimeTypeAttribute] || metadata.suvMimeTypeAttribute.id;
                    suvAttributes[attributeData.Id] = {
                        suvThumbnailAttribute: attribute,
                        suvTargetUrlAttribute: suvUrlAttribute,
                        suvTargetMimeTypeAttribute: suvMimeTypeAttribute
                    };
                }

                //attribute = util.addPotentialNavTargetsToAttribute(this.sina, attribute); //find emails phone nrs etc and augment attribute if required

                if (metadata.usage.Title) {
                    titleAttributes.push(attribute);
                }
                if (metadata.usage.Detail) {
                    detailAttributes.push(attribute);
                }
                if (!metadata.usage.Title && !metadata.usage.Detail && !metadata.isDescription && (attribute.isHighlighted || (attribute.descriptionAttribute && attribute.descriptionAttribute.isHighlighted))) {
                    whyFoundAttributes.push(attribute);
                }
                if (metadata.usage.Navigation) {
                    if (metadata.usage.Navigation.mainNavigation) {
                        fallbackDefaultNavigationTarget = this.sina._createNavigationTarget({
                            label: attribute.value,
                            targetUrl: attribute.value
                        });
                    }
                }

                allAttributes[attribute.id] = attribute;

                semanticObjectType = dataSource.attributeMetadataMap[attribute.id].semanticObjectType;

                if (semanticObjectType.length > 0) {
                    semanticObjectTypeAttributes.push({
                        name: semanticObjectType,
                        value: attribute.value,
                        type: attribute.metadata.type
                    });
                }
            }

            for (var i = 0; i < attributesLookingForTheirUomAttribute.length; i++) {
                attribute = attributesLookingForTheirUomAttribute[i];
                metadata = dataSource.getAttributeMetadata(attribute.id);

                if (metadata.unitOfMeasureAttribute) {
                    var unitOfMeasureAttribute = unitOfMeasureAttributes[metadata.unitOfMeasureAttribute.id];
                    if (unitOfMeasureAttribute) {
                        attribute.unitOfMeasure = unitOfMeasureAttribute;
                    }
                }
            }

            for (var i = 0; i < attributesLookingForTheirDescriptionAttribute.length; i++) {
                attribute = attributesLookingForTheirDescriptionAttribute[i];
                metadata = dataSource.getAttributeMetadata(attribute.id);

                if (metadata.descriptionAttribute) {
                    var descriptionAttribute = allAttributes[metadata.descriptionAttribute.id];
                    if (descriptionAttribute) {
                        attribute.description = descriptionAttribute;
                    }
                }
            }

            for (var suvAttributeName in suvAttributes) {
                var suvAttribute = suvAttributes[suvAttributeName];
                if (typeof suvAttribute.suvTargetUrlAttribute == "string") {
                    suvAttribute.suvTargetUrlAttribute = allAttributes[suvAttribute.suvTargetUrlAttribute];
                }
                if (typeof suvAttribute.suvTargetMimeTypeAttribute == "string") {
                    suvAttribute.suvTargetMimeTypeAttribute = allAttributes[suvAttribute.suvTargetMimeTypeAttribute];
                }
                if (!(suvAttribute.suvTargetUrlAttribute || suvAttribute.suvTargetMimeTypeAttribute)) {
                    delete suvAttributes[suvAttributeName];
                }
            }
            this.suvNavTargetResolver.resolveSuvNavTargets(dataSource, suvAttributes);

            titleAttributes.sort(function (a1, a2) {
                return a1.metadata.usage.Title.displayOrder - a2.metadata.usage.Title.displayOrder;
            });

            detailAttributes.sort(function (a1, a2) {
                return a1.metadata.usage.Detail.displayOrder - a2.metadata.usage.Detail.displayOrder;
            });


            // parse HitAttributes
            if (itemData.HitAttributes !== null) {
                for (var k = 0; k < itemData.HitAttributes.results.length; k++) {

                    attributeData = itemData.HitAttributes.results[k];
                    metadata = dataSource.getAttributeMetadata(attributeData.Id);
                    attribute = this.sina._createSearchResultSetItemAttribute({
                        id: attributeData.Id,
                        label: metadata.label,
                        //TO DO: abap_odata2Sina
                        value: typeConverter.odata2Sina(metadata.type, util.filterString(attributeData.Snippet, ['<b>', '</b>'])),
                        valueFormatted: attributeData.Snippet,
                        valueHighlighted: attributeData.Snippet,
                        isHighlighted: attributeData.Snippet.indexOf("<b>") > -1 && attributeData.Snippet.indexOf("</b>") > -1,
                        metadata: metadata
                    });

                    whyFoundAttributes.push(attribute);
                }
            }

            // concatinate whyFound attributes to detail attributes
            detailAttributes = detailAttributes.concat(whyFoundAttributes);

            var title = [];
            var titleHighlighted = [];
            for (var m = 0; m < titleAttributes.length; m++) {
                var titleAttribute = titleAttributes[m];
                title.push(titleAttribute.valueFormatted);
                titleHighlighted.push(titleAttribute.valueHighlighted);
            }
            title = title.join(' ');
            titleHighlighted = titleHighlighted.join(' ');

            semanticObjectType = dataSource.sematicObjectType;
            var systemId = dataSource.system;
            var client = dataSource.client;
            //fallbackDefaultNavigationTarget = this.sina._createNavigationTarget({
            //    label: "",
            //    targetUrl: ""
            //});

            return this.intentsResolver.resolveIntents({
                semanticObjectType: semanticObjectType,
                semanticObjectTypeAttributes: semanticObjectTypeAttributes,
                systemId: systemId,
                client: client,
                fallbackDefaultNavigationTarget: fallbackDefaultNavigationTarget
            }).then(function (intents) {
                var defaultNavigationTarget = intents && intents.defaultNavigationTarget;
                var navigationTargets = intents && intents.navigationTargets;
                return this.sina._createSearchResultSetItem({
                    dataSource: dataSource,
                    title: title,
                    titleHighlighted: titleHighlighted,
                    titleAttributes: titleAttributes,
                    detailAttributes: detailAttributes,
                    defaultNavigationTarget: defaultNavigationTarget,
                    navigationTargets: navigationTargets
                });
            }.bind(this));
        }

    });

});
