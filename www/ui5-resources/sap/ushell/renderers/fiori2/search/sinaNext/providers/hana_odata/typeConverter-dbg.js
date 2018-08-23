/* global sinaDefine */
sinaDefine(['../../core/core', '../../sina/util', '../../sina/AttributeType'], function (core, sinaUtil, AttributeType) {
    "use strict";

    return {

        sina2Odata: function (attributeType, value, context) {
            switch (attributeType) {
            case AttributeType.Double:
                return value.toString();
            case AttributeType.Integer:
                return value.toString();
            case AttributeType.String:
                return this.sina2OdataString(value, context);
            case AttributeType.Longtext:
                return value;
            case AttributeType.ImageUrl:
                return value;
            case AttributeType.ImageBlob:
                throw new core.Exception('not implemented');
            case AttributeType.GeoJson:
                return value;
            case AttributeType.Date:
                return this.sina2OdataDate(value);
            case AttributeType.Time:
                return this.sina2OdataTime(value);
            case AttributeType.Timestamp:
                return this.sina2OdataTimestamp(value);
            default:
                throw new core.Exception('unknown attribute type ' + attributeType);
            }
        },

        sina2OdataString: function (value, context) {
            return sinaUtil.convertOperator2Wildcards(value, context.operator);
        },

        odata2Sina: function (attributeType, value) {
            switch (attributeType) {
            case AttributeType.Double:
                return parseFloat(value);
            case AttributeType.Integer:
                return parseInt(value, 10);
            case AttributeType.String:
                return value;
            case AttributeType.Longtext:
                return value;
            case AttributeType.ImageUrl:
                return value;
            case AttributeType.ImageBlob:
                throw new core.Exception('not implemented');
            case AttributeType.GeoJson:
                return value;
            case AttributeType.Date:
                return this.odata2SinaDate(value);
            case AttributeType.Time:
                return this.odata2SinaTime(value);
            case AttributeType.Timestamp:
                return this.odata2SinaTimestamp(value);
            default:
                throw new core.Exception('unknown attribute type ' + attributeType);
            }
        },

        odata2SinaTimestamp: function (value) {
            // odata:2017-12-31T23:59:59.0000000Z
            // sina: Date object

            value = value.trim();

            var year, month, day, hour, minute, seconds;
            year = parseInt(value.slice(0, 4), 10);
            month = parseInt(value.slice(5, 7), 10);
            day = parseInt(value.slice(8, 10), 10);
            hour = parseInt(value.slice(11, 13), 10);
            minute = parseInt(value.slice(14, 16), 10);
            seconds = parseInt(value.slice(17, 19), 10);

            return new Date(Date.UTC(year, month - 1, day, hour, minute, seconds));
        },


        sina2OdataTimestamp: function (value) {
            // odata:2017-12-31T23:59:59.0000000Z
            // sina: Date object
            var year = value.getUTCFullYear();
            var month = value.getUTCMonth() + 1;
            var day = value.getUTCDate();
            var hour = value.getUTCHours();
            var minute = value.getUTCMinutes();
            var seconds = value.getUTCSeconds();


            var result =
                this.addLeadingZeros(year.toString(), 4) + '-' +
                this.addLeadingZeros(month.toString(), 2) + '-' +
                this.addLeadingZeros(day.toString(), 2) + 'T' +
                this.addLeadingZeros(hour.toString(), 2) + ':' +
                this.addLeadingZeros(minute.toString(), 2) + ':' +
                this.addLeadingZeros(seconds.toString(), 2) + 'Z';
            // this.addLeadingZeros(microseconds.toString(), 7) + 'Z';

            return result;
        },

        odata2SinaTime: function (value) {
            // odata: hh:mm:ss
            // sina: hh:mm:ss
            value = value.trim();
            return value;
            //            if(value.indexOf(":") === 2){
            //                return value;
            //            }else{
            //                return value.slice(0, 2) + ':' + value.slice(2, 4) + ':' + value.slice(4, 6);
            //            }
        },

        sina2OdataTime: function (value) {
            // odata: hh:mm:ss
            // sina: hh:mm:ss
            return value;
            //            return value.slice(0, 2) + value.slice(3, 5) + value.slice(6, 8);
        },

        odata2SinaDate: function (value) {
            // odata: YYYY-MM-DD
            // sina: YYYY/MM/DD
            value = value.trim();
            return value.slice(0, 4) + '/' + value.slice(5, 7) + '/' + value.slice(8, 10);
            //return value.slice(0, 4) + '/' + value.slice(4, 6) + '/' + value.slice(6, 8);
        },

        sina2OdataDate: function (value) {
            // odata: YYYY-MM-DD
            // sina: YYYY/MM/DD
            return value.slice(0, 4) + '-' + value.slice(5, 7) + '-' + value.slice(8, 10);
            //return value.slice(0, 4) + value.slice(5, 7) + value.slice(8, 10);
        },

        addLeadingZeros: function (value, length) {
            return '00000000000000'.slice(0, length - value.length) + value;
        }

    };

});
