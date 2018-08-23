/* global sinaDefine, Promise */
sinaDefine(['../../core/core', '../../core/util', './typeConverter', '../tools/fiori/FioriIntentsResolver', '../../sina/NavigationTarget'], function (core, util, typeConverter, IntentsResolver, NavigationTarget) {
    "use strict";

    return core.defineClass({

        _init: function (provider) {
            this.provider = provider;
            this.sina = provider.sina;
            this.intentsResolver = this.sina._createFioriIntentsResolver();
        },

        parse: function (searchQuery, data) {
            if (data.value === null) {
                return Promise.resolve([]);
            }
            var itemsData = data.value;
            var itemProms = [];
            for (var i = 0; i < itemsData.length; ++i) {
                var itemData = itemsData[i];
                var itemProm = this.parseItem(itemData);
                itemProms.push(itemProm);
            }
            return Promise.all(itemProms);
        },
        parseItem: function (itemData) {
            var titleAttributes = [];
            var detailAttributes = [];
            //var whyFoundAttributes = [];
            var semanticObjectTypeAttributes = {};

            var entitySetName = itemData['@odata.context'];
            var posOfSeparator = entitySetName.lastIndexOf('#');
            if (posOfSeparator > -1) {
                entitySetName = entitySetName.slice(posOfSeparator + 1);
            }
            var dataSource = this.sina.getDataSource(entitySetName);

            var whyFounds = itemData['@com.sap.vocabularies.Search.v1.WhyFound'] || {};
            var metadata = {};
            var semanticObjectType = '';

            // parse attributes

            for (var attributeName in itemData) {
                if (attributeName[0] === '@' || attributeName[0] === '_') {
                    continue;
                }

                metadata = dataSource.getAttributeMetadata(attributeName);

                if (metadata.id == "LOC_4326") { //required to get maps to frontend
                    metadata.usage = {
                        Detail: {
                            displayOrder: -1
                        }
                    };
                }

                var attrValue = typeConverter.odata2Sina(metadata.type, itemData[attributeName]);
                var attrWhyFound = "";

                //processing for whyfound
                for (var attributeNameWhyfound in whyFounds) {
                    if (attributeNameWhyfound === attributeName && whyFounds[attributeNameWhyfound][0]) {
                        // replace attribue value with whyfound value
                        attrWhyFound = whyFounds[attributeNameWhyfound][0];
                        delete whyFounds[attributeNameWhyfound];
                    }
                }
                var attribute = this.sina._createSearchResultSetItemAttribute({
                    id: metadata.id,
                    label: metadata.label,
                    value: attrValue,
                    valueFormatted: attrValue,
                    valueHighlighted: attrWhyFound || attrValue,
                    isHighlighted: attrWhyFound.length > 0 ? true : false,
                    metadata: metadata
                });


                if (metadata.usage.Title) {
                    titleAttributes.push(attribute);
                }
                if (metadata.usage.Detail) {
                    detailAttributes.push(attribute);
                }
                // if (!metadata.usage.Title && !metadata.usage.Detail && attribute.isHighlighted) {
                //     whyFoundAttributes.push(attribute);
                // }

                semanticObjectType = dataSource.attributeMetadataMap[metadata.id].semanticObjectType || '';
                if (semanticObjectType.length > 0) {
                    semanticObjectTypeAttributes[semanticObjectType] = attrValue;
                }
            }


            titleAttributes.sort(function (a1, a2) {
                return a1.metadata.usage.Title.displayOrder - a2.metadata.usage.Title.displayOrder;
            });

            detailAttributes.sort(function (a1, a2) {
                return a1.metadata.usage.Detail.displayOrder - a2.metadata.usage.Detail.displayOrder;
            });


            // parse HitAttributes
            // if (itemData.HitAttributes !== null) {
            //     for (var i = 0; i < itemData.HitAttributes.results.length; ++i) {
            //
            //         var attributeData = itemData.HitAttributes.results[i];
            //         var metadata = dataSource.getAttributeMetadata(attributeData.Id);
            //         var attribute = this.sina._createSearchResultSetItemAttribute({
            //             id: attributeData.Id,
            //             label: metadata.label,
            //             value: typeConverter.odata2Sina(metadata.type, util.filterString(attributeData.Snippet, ['<b>', '</b>'])),
            //             valueFormatted: attributeData.Snippet,
            //             valueHighlighted: attributeData.Snippet,
            //             isHighlighted: attributeData.Snippet.includes("<b>") && attributeData.Snippet.includes("</b>"),
            //             metadata: metadata
            //         });
            //
            //         whyFoundAttributes.push(attribute);
            //     }
            // }

            // concatinate whyFound attributes to detail attributes
            // whyFoundAttributes = whyFounds; //TODO convert format
            // detailAttributes = detailAttributes.concat(whyFoundAttributes);

            var title = [];
            var titleHighlighted = [];
            for (var i = 0; i < titleAttributes.length; ++i) {
                var titleAttribute = titleAttributes[i];
                title.push(titleAttribute.valueFormatted);
                titleHighlighted.push(titleAttribute.valueHighlighted);
            }
            title = title.join(' ');
            titleHighlighted = titleHighlighted.join(' ');

            semanticObjectType = dataSource.sematicObjectType || '';
            var systemId = dataSource.system || '';
            var client = dataSource.client || '';
            var fallbackDefaultNavigationTarget;
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
