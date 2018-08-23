/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */
sap.ui.define(["jquery.sap.global","sap/ui/base/Object"],function(q,B){"use strict";var C=B.extend("sap.ui.mdc.experimental.provider.adapter.base.ColumnWrapper",{constructor:function(f){if(f){this.switchField(f);}},switchField:function(f){this.field=f;this.key=f.navigationPath||f.name;this.label=f.label;this.tooltip=f.tooltip;this.path=f.asPath(this.key);if(f.visible===false){this.visible=false;}else{this.visible=true;}}});return C;});
