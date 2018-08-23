/*
 * This module provides a collection of utility functions.
 */
sap.ui.define([], function () {
    "use strict";

    return Object.create(null, {
        deepFreeze: { value: deepFreeze },
        getLocationOrigin : {
                              value: getLocationOrigin,
                              writable : true // To enable stubs during testing
                            }
    });

    /**
     * The method will fail if the given object has a cyclic reference.
     *
     * @param {Object} o Object to deep freeze; it should not contain a cyclic reference anywhere in its tree.
     * @returns {Object} The given object which is no longer mutable.
     *
     * @private
     */
    function deepFreeze (o) {
        Object.keys(o)
            .filter(function (sProperty) {
                return typeof o[sProperty] === "object";
            })
            .forEach(function (sProperty) {
                o[sProperty] = deepFreeze(o[sProperty]);
            });

        return Object.freeze(o);
    }

    /**
     * Returns the location's origin URL.
     * This is equivalent to reading the value of location.origin
     * (Needed for compatibility reasons)
     *
     * @returns {String} A String containing the canonical form of the origin of the specific location.
     *
     * @private
     */
    function getLocationOrigin () {
        // location.origin might not be supported by all browsers
        return location.protocol + "//" + location.host;
    }
});