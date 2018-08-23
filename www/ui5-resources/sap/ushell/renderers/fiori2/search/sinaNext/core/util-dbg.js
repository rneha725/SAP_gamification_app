/* global sinaDefine */
sinaDefine(['./core'], function (core) {
    "use strict";

    var module = {};

    module.refuseOutdatedResponsesDecorator = function (originalFunction) {
        var maxRequestId = 0;
        var decoratedFunction = function () {
            var requestId = ++maxRequestId;
            return originalFunction.apply(this, arguments).then(function (response) {
                // success
                return new core.Promise(function (resolve, reject) {
                    if (requestId !== maxRequestId) {
                        return; // --> ignore
                    }
                    resolve(response); // --> forward
                });
            }, function (error) {
                // error
                return new core.Promise(function (resolve, reject) {
                    if (requestId !== maxRequestId) {
                        return; // --> ignore
                    }
                    reject(error); // --> forward
                });
            });
        };
        decoratedFunction.abort = function () {
            ++maxRequestId;
        };
        return decoratedFunction;
    };

    module.getUrlParameter = function (name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    };

    module.filterString = function (text, removeStrings) {
        for (var i = 0; i < removeStrings.length; ++i) {
            var removeString = removeStrings[i];
            var index = 0;
            while (index >= 0) {
                index = text.indexOf(removeString);
                if (index >= 0) {
                    text = text.slice(0, index) + text.slice(index + removeString.length);
                }
            }
        }
        return text;
    };

    module.generateTimestamp = function () {
        var pad = function pad(num, size) {
            var s = "000000000" + num;
            return s.substr(s.length - size);
        };
        var d = new Date();
        return '' +
            d.getUTCFullYear() +
            pad(d.getUTCMonth() + 1, 2) +
            pad(d.getUTCDate(), 2) +
            pad(d.getUTCHours(), 2) +
            pad(d.getUTCMinutes(), 2) +
            pad(d.getUTCSeconds(), 2) +
            pad(d.getUTCMilliseconds(), 3);
    };

    module.DelayedConsumer = core.defineClass({
        _init: function (properties) {
            properties = properties || {};
            this.timeDelay = properties.timeDelay || 1000;
            this.consumer = properties.consumer || function () {};
            this.consumerContext = properties.consumerContext || null;
            this.objects = [];
        },
        add: function (obj) {
            this.objects.push(obj);
            if (this.objects.length === 1) {
                setTimeout(this.consume.bind(this), this.timeDelay);
            }
        },
        consume: function () {
            this.consumer.apply(this.consumerContext, [this.objects]);
            this.objects = [];
        }
    });

    module.dateToJson = function (date) {
        return {
            type: 'Timestamp',
            value: date.toJSON()
        };
    };

    module.dateFromJson = function (jsonDate) {
        if (jsonDate.type !== 'Timestamp') {
            throw new core.Exception('Not a timestampe ' + jsonDate);
        }
        return new Date(jsonDate.value);
    };

    module.getBaseUrl = function (url) {
        url = url || '/sap/ushell/renderers/fiori2/search/container/';
        var baseUrl = '';
        var indexOfStandalonePath = window.location.pathname.indexOf(url);
        if (indexOfStandalonePath > -1) {
            baseUrl = window.location.pathname.slice(0, indexOfStandalonePath);
        }
        return baseUrl;
    };

    module.addPotentialNavTargetsToAttribute = function (resultSet) {
        if (resultSet.items) { //not avilable with sample provider
            var items = resultSet.items;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                item = this.addGeoDataIfAvailable(item);
                var attributes = item.detailAttributes;
                for (var j = 0; j < attributes.length; j++) {
                    var attribute = attributes[j];
                    var sina = attribute.sina;
                    var value = attribute.value;
                    var metadata = attribute.metadata;
                    if (typeof value === 'string' && attribute.metadata.type !== "ImageUrl") {
                        var fonenrs = value.match(/^(?!\d*$)(?=(?:[()\[\]+\-\/ ]*\d[()\[\]+\-\/ ]*){9,}$)\+?(?:\d+|\(\d+(?: \d+)*\)|\[\d+\]|[\/ ]|\d-\d)+$/g);
                        var emails = value.match(/[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)/g);
                        var url = value.match(/(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/[^"\r\n ]*)?/);
                        if (metadata.isEmailAddress) {
                            attribute.defaultNavigationTarget = sina._createNavigationTarget({
                                label: value,
                                targetUrl: 'mailto:' + value
                            });
                        } else if (metadata.isPhoneNr) {
                            attribute.defaultNavigationTarget = sina._createNavigationTarget({
                                label: value,
                                targetUrl: 'tel:' + value
                            });
                        } else if (emails !== null && emails.length === 1) {
                            attribute.defaultNavigationTarget = sina._createNavigationTarget({
                                label: emails[0],
                                targetUrl: 'mailto:' + emails[0]
                            });
                        } else if (fonenrs !== null && fonenrs[0].match(/\d\d\d/) !== null) {
                            attribute.defaultNavigationTarget = sina._createNavigationTarget({
                                label: fonenrs[0],
                                targetUrl: 'tel:' + fonenrs[0]
                            });
                        } else if (url !== null && url[0].match(/\w\w\w/) !== null) {
                            attribute.defaultNavigationTarget = sina._createNavigationTarget({
                                label: url[0],
                                targetUrl: url[0]
                            });
                        }
                    }
                }
            }
        }
        return resultSet;
    };

    module.addGeoDataIfAvailable = function (itemData) {
        //augment with new geodata attribute
        var attributes, lat, lon, name, val, dataSource, latIndex, lonIndex;
        attributes = itemData.detailAttributes;
        for (var i = 0; i < attributes.length; i++) {
            name = attributes[i].id;
            val = attributes[i].value;
            if (name.match(/latitude/i) !== null && !isNaN(val)) {
                lat = val;
                latIndex = i;
            } else if (name.match(/longitude/i) !== null && !isNaN(val)) {
                lon = val;
                lonIndex = i;
            } else if (name.match(/LOC_4326/)) {
                lonIndex = i;
                latIndex = i;
                var oLoc4326 = JSON.parse(val);
                var aCoordinates = oLoc4326.coordinates;
                if (aCoordinates && aCoordinates.length > 1) {
                    lon = aCoordinates[0];
                    lat = aCoordinates[1];
                }
            }
            if (lat && lon) {
                break;
            }
        }
        if (lat && lon) {

            //remove lat and long from searchRsultITems
            if (latIndex === lonIndex) {
                attributes.splice(latIndex, 1);
            } else if (latIndex > lonIndex) {
                attributes.splice(latIndex, 1);
                attributes.splice(lonIndex, 1);
            } else {
                attributes.splice(lonIndex, 1);
                attributes.splice(latIndex, 1);
            }

            var newMetadata = {
                sina: itemData.sina,
                type: "GeoJson",
                id: "LOC_4326",
                label: "LOC_4326",
                isCurrency: false,
                isEmailAddress: false,
                isPhoneNr: false,
                IsBoolean: false,
                IsKey: false,
                IsSortable: true,
                isUnitOfMeasure: false,
                semanticObjectType: [],
                isQuantity: "",
                usage: {
                    Detail: {
                        displayOrder: -1
                    }
                }
            };
            //creaate new attribute and check whtether geojson metadata exists
            var valStr = '{ "type": "Point", "coordinates": [' + lon + ', ' + lat + ', 0] }';
            var newAttribute = {
                id: "LOC_4326",
                label: "LOC_4326",
                isHighlighted: false,
                value: valStr,
                valueFormatted: valStr,
                valueHighlighted: itemData.sina,
                metadata: newMetadata,
                sina: itemData.sina
            };
            attributes.push(newAttribute);


            dataSource = itemData.sina.getDataSource(itemData.dataSource.id);
            if (!dataSource.attributeMetadataMap.LOC_4326) {
                dataSource.attributesMetadata.push(newMetadata);
                dataSource.attributeMetadataMap["LOC_4326"] = newMetadata;
            } else {
                dataSource.attributeMetadataMap.LOC_4326.type = "GeoJson";
            }
        }
        return itemData;
    };

    module.cacheDecorator = function (originalFunction) {
        var map = {};
        return function (id) {
            if (map.hasOwnProperty(id)) {
                return map[id];
            }
            var value = originalFunction.apply(this, [id]);
            map[id] = value;
            return value;
        };
    };

    module.escapeRegExp = function (str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    };

    module.evaluateTemplate = function (template, obj) {

        var placeholderRegExp = new RegExp('{{(.*)}}');
        var getProperty = function (template) {
            var match = placeholderRegExp.exec(template);
            if (!match) {
                return null;
            }
            return match[1];
        };

        var replaceProperty = function (template, property, value) {
            var propertyRegExp = new RegExp('{{' + module.escapeRegExp(property) + '}}', 'g');
            template = template.replace(propertyRegExp, value);
            return template;
        };

        var execute = function (template) {
            var property = getProperty(template);
            if (!property) {
                return template;
            }
            template = replaceProperty(template, property, obj[property]);
            return execute(template);
        };

        return execute(template);
    };

    return module;

});
