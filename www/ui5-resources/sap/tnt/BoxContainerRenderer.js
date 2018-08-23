/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/Device"],function(D){"use strict";var B={};B.render=function(r,c){r.write("<div ");r.writeControlData(c);r.addClass("sapTntBoxContainer");r.writeClasses();r.addStyle("width",c.getWidth());r.writeStyles();r.write(">");r.renderControl(c.getAggregation("_list"));r.write("</div>");};return B;},true);
