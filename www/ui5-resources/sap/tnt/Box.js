/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/m/CustomListItem","./BoxRenderer"],function(C,B){"use strict";var a=C.extend("sap.tnt.Box",{metadata:{library:"sap.tnt",properties:{"type":{type:"sap.m.ListType",defaultValue:sap.m.ListType.Active}}},renderer:B});return a;});
