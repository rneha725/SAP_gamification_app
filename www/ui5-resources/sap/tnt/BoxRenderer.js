/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/m/CustomListItemRenderer","sap/ui/core/Renderer","sap/ui/Device"],function(C,R,D){"use strict";var B=R.extend(C);B.renderLIAttributes=function(r,l){C.renderLIAttributes(r,l);r.addClass("sapTntBox");this.renderWidthStyle(r,l);};B.renderWidthStyle=function(r,l){var b=l.getList(),w;if(b&&b.getMetadata().getName()==="sap.tnt.BoxContainerList"){w=b.getBoxWidth();}if(D.browser.msie&&w){r.addStyle("width",w);}};return B;});
