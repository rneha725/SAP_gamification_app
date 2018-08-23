/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */
sap.ui.define(['jquery.sap.global','sap/ui/comp/library','sap/ui/core/Element'],function(q,l,E){"use strict";var C=E.extend("sap.ui.comp.smartform.ColumnLayout",{metadata:{interfaces:["sap.ui.comp.smartform.SmartFormLayout"],library:"sap.ui.comp",properties:{columnsXL:{type:"sap.ui.layout.form.ColumnsXL",group:"Appearance",defaultValue:2},columnsL:{type:"sap.ui.layout.form.ColumnsL",group:"Appearance",defaultValue:2},columnsM:{type:"sap.ui.layout.form.ColumnsM",group:"Appearance",defaultValue:1},labelCellsLarge:{type:"sap.ui.layout.form.ColumnCells",group:"Appearance",defaultValue:4},emptyCellsLarge:{type:"sap.ui.layout.form.EmptyCells",group:"Appearance",defaultValue:0}}}});return C;},true);
