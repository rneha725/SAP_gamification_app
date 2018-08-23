/* global sinaDefine */

sinaDefine([
    '../../../sina/SinaObject'
], function (SinaObject) {
    "use strict";

    return SinaObject.derive({

        _init: function () {

        },

        parseCDSAnnotationsForDataSource: function (dataSource, cdsAnnotations) {

            var parsingResult = {
                dataSourceIsCdsBased: false,
                detailAttributesAreSorted: false,
                titleAttributesAreSorted: false
            };

            // CDS Annotations Object looks like:
            // cdsAnnotations = {
            //     dataSourceAnnotations: {}, // Key-Value-Map for CDS annotations
            //     attributeAnnotations: {} // Key-Value-Map (keys: attribute names) of Key-Value-Maps (keys: annotation names) for CDS annotations
            // };

            var i, annotationName, annotationValue, attribute, unitOfMeasureAttribute, descriptionAttribute;
            var unitOfMeasureAttributes = {};
            var descriptionAttributes = {};

            var detailAttributesPrioHigh = [];
            var detailAttributesPrioMedium = [];

            for (annotationName in cdsAnnotations.dataSourceAnnotations) {
                annotationValue = cdsAnnotations.dataSourceAnnotations[annotationName];
                switch (annotationName.toUpperCase()) {
                case "UI.HEADERINFO.TITLE.VALUE":
                    var titleAttribute = dataSource.attributeMetadataMap[annotationValue];
                    if (titleAttribute) {
                        titleAttribute.usage.Title = {
                            displayOrder: 1
                        };
                    }
                    break;
                case "UI.HEADERINFO.TITLE.URL":
                    var urlAttribute = dataSource.attributeMetadataMap[annotationValue];
                    if (urlAttribute) {
                        urlAttribute.usage.Navigation = {
                            mainNavigation: true
                        };
                    }
                    break;
                }
            }

            for (i = 0; i < dataSource.attributesMetadata.length; i++) {
                attribute = dataSource.attributesMetadata[i];
                var attributeAnnotations = cdsAnnotations.attributeAnnotations[attribute.id] || {};
                for (annotationName in attributeAnnotations) {
                    annotationValue = attributeAnnotations[annotationName];
                    switch (annotationName.toUpperCase()) {
                    case "UI.HIDDEN":
                        if (annotationValue.toLowerCase() == "true") {
                            // todo: hide this attribute on UI somehow
                        }
                        break;
                    case "UI.IDENTIFICATION.URL":
                        if (attributeAnnotations["SEMANTICS.IMAGEURL"] !== undefined) {

                            //var suvUrlAttribute = dataSource.attributeMetadataMap[annotationValue];
                            var urlAttributeAnnotations = cdsAnnotations.attributeAnnotations[annotationValue];
                            if (urlAttributeAnnotations && urlAttributeAnnotations["SEMANTICS.URL.MIMETYPE"]) {
                                var urlAttribute = dataSource.attributeMetadataMap[annotationValue];
                                var mimeTypeAttribute = dataSource.attributeMetadataMap[urlAttributeAnnotations["SEMANTICS.URL.MIMETYPE"]];

                                attribute.suvUrlAttribute = urlAttribute;
                                attribute.suvMimeTypeAttribute = mimeTypeAttribute;

                                attribute.format = this.sina.AttributeFormatType.DocumentThumbnail;
                            }
                        }
                        break;
                    case "UI.IDENTIFICATION.IMPORTANCE":
                        if (annotationValue == "HIGH" || annotationValue == "MEDIUM") {
                            var position = attributeAnnotations["UI.IDENTIFICATION.POSITION"];
                            if (typeof position === 'string') {
                                try {
                                    position = parseInt(position, 10);
                                } catch (e) {
                                    position = Number.MAX_VALUE;
                                }
                            } else if (typeof position !== 'number') {
                                position = Number.MAX_VALUE; // or use Number.POSITIVE_INFINITY ?
                            }
                            attribute.usage = attribute.usage || {};
                            attribute.usage.Detail = attribute.usage.Detail || {};
                            attribute.usage.Detail.displayOrder = position;
                            if (annotationValue == "HIGH") {
                                detailAttributesPrioHigh.push(attribute);
                            } else if (annotationValue == "MEDIUM") {
                                detailAttributesPrioMedium.push(attribute);
                            }
                        }
                        break;
                    case "SEMANTICS.CONTACT.PHOTO":
                        attribute.format = this.sina.AttributeFormatType.Round;
                        // falls through
                    case "SEMANTICS.IMAGEURL":
                        attribute.type = this.sina.AttributeType.ImageUrl;
                        break;
                    case "SEMANTICS.EMAIL.ADDRESS":
                        attribute.isEmailAddress = true;
                        break;
                    case "SEMANTICS.TELEPHONE.TYPE":
                        attribute.isPhoneNr = true;
                        break;
                    case "SEMANTICS.CURRENCYCODE":
                        attribute.isCurrency = true;
                        break;
                    case "SEMANTICS.UNITOFMEASURE":
                        attribute.isUnitOfMeasure = true;
                        break;
                    case "SEMANTICS.QUANTITY.UNITOFMEASURE":
                        attribute.isQuantity = true;
                        // falls through
                    case "SEMANTICS.AMOUNT.CURRENCYCODE":
                        annotationValue = annotationValue.toUpperCase(); // ToDo: Workaround! Talk to Frank about why the value is lower case in annotation value
                        unitOfMeasureAttribute = dataSource.attributeMetadataMap[annotationValue];
                        if (unitOfMeasureAttribute) {
                            if ((annotationName == "SEMANTICS.QUANTITY.UNITOFMEASURE" && unitOfMeasureAttribute.isUnitOfMeasure) || (annotationName == "SEMANTICS.AMOUNT.CURRENCYCODE" && unitOfMeasureAttribute.isCurrency)) {
                                attribute.unitOfMeasureAttribute = unitOfMeasureAttribute;
                            }
                        } else {
                            unitOfMeasureAttributes[annotationValue] = unitOfMeasureAttributes[annotationValue] || [];
                            unitOfMeasureAttributes[annotationValue].push({
                                attribute: attribute,
                                annotationName: annotationName
                            });
                        }
                        break;
                    case "OBJECTMODEL.TEXT.ELEMENT":
                        descriptionAttribute = dataSource.attributeMetadataMap[annotationValue];
                        if (descriptionAttribute) {
                            descriptionAttribute.isDescription = true;
                            attribute.descriptionAttribute = descriptionAttribute;
                        } else {
                            descriptionAttributes[annotationValue] = descriptionAttributes[annotationValue] || [];
                            descriptionAttributes[annotationValue].push(attribute);
                        }
                        var textArrangement = attributeAnnotations["UI.TEXTARRANGEMENT"];
                        if (textArrangement) {
                            switch (textArrangement.toUpperCase()) {
                            case "TEXT_FIRST":
                                attribute.descriptionTextArrangement = this.sina.AttributeDescriptionTextArrangement.TextFirst;
                                break;
                            case "TEXT_LAST":
                                attribute.descriptionTextArrangement = this.sina.AttributeDescriptionTextArrangement.TextLast;
                                break;
                            case "TEXT_ONLY":
                                attribute.descriptionTextArrangement = this.sina.AttributeDescriptionTextArrangement.TextOnly;
                                break;
                            case "TEXT_SEPARATE":
                                attribute.descriptionTextArrangement = this.sina.AttributeDescriptionTextArrangement.TextSeparate;
                                break;
                            }
                        }
                        break;
                    case "UI.MULTILINETEXT":
                        attribute.format = this.sina.AttributeFormatType.MultilineText;
                        break;
                    }
                }
            }

            if (detailAttributesPrioHigh.length > 0 || detailAttributesPrioMedium.length > 0) {
                if (detailAttributesPrioHigh.length > 0) {
                    parsingResult.dataSourceIsCdsBased = true;
                }
                var sortFunction = this._createSortFunction("Detail");
                detailAttributesPrioHigh.sort(sortFunction);
                detailAttributesPrioMedium.sort(sortFunction);
                var detailAttributes = detailAttributesPrioHigh.concat(detailAttributesPrioMedium);

                for (i = 0; i < detailAttributes.length; ++i) {
                    detailAttributes[i].usage.Detail.displayOrder = i;
                }

                parsingResult.detailAttributesAreSorted = true;
            }

            for (var unitOfMeasureAttributeName in unitOfMeasureAttributes) {
                unitOfMeasureAttribute = dataSource.attributeMetadataMap[unitOfMeasureAttributeName];
                if (unitOfMeasureAttribute) {
                    var attributesLookingForThisUomAttribute = unitOfMeasureAttributes[unitOfMeasureAttributeName];
                    for (i = 0; i < attributesLookingForThisUomAttribute.length; i++) {
                        attribute = attributesLookingForThisUomAttribute[i].attribute;
                        annotationName = attributesLookingForThisUomAttribute[i].annotationName;
                        if ((annotationName == "SEMANTICS.QUANTITY.UNITOFMEASURE" && unitOfMeasureAttribute.isUnitOfMeasure) || (annotationName == "SEMANTICS.AMOUNT.CURRENCYCODE" && unitOfMeasureAttribute.isCurrency)) {
                            attribute.unitOfMeasureAttribute = unitOfMeasureAttribute;
                        }
                    }
                }
            }

            for (var descriptionAttributeName in descriptionAttributes) {
                descriptionAttribute = dataSource.attributeMetadataMap[descriptionAttributeName];
                if (descriptionAttribute) {
                    descriptionAttribute.isDescription = true;
                    var attributesLookingForThisDescriptionAttribute = descriptionAttributes[descriptionAttributeName];
                    for (i = 0; i < attributesLookingForThisDescriptionAttribute.length; i++) {
                        attribute = attributesLookingForThisDescriptionAttribute[i];
                        attribute.descriptionAttribute = descriptionAttribute;
                    }
                }
            }

            return parsingResult;
        },

        _createSortFunction: function (usagePropery) {
            return function (a1, a2) {
                if (a1.usage[usagePropery].displayOrder < a2.usage[usagePropery].displayOrder) {
                    return -1;
                } else if (a1.usage[usagePropery].displayOrder > a2.usage[usagePropery].displayOrder) {
                    return 1;
                } else {
                    return 0;
                }
            };
        }
    });
});
