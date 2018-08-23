sap.ui.require.preload({
	"sap/makit/manifest.json":'{"_version":"1.9.0","sap.app":{"id":"sap.makit","type":"library","embeds":[],"applicationVersion":{"version":"1.56.5"},"title":"Mobile Chart controls based on the Sybase MAKIT charting lib.","description":"Mobile Chart controls based on the Sybase MAKIT charting lib.","resources":"resources.json","offline":true},"sap.ui":{"technology":"UI5","supportedThemes":["base","sap_bluecrystal"]},"sap.ui5":{"dependencies":{"minUI5Version":"1.56","libs":{"sap.ui.core":{"minVersion":"1.56.5"}}},"library":{"i18n":"messagebundle.properties"}}}',
/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
 * 
 * (c) Copyright 2009-2018 SAP SE. All rights reserved
 */
	"sap/makit/library.js":function(){jQuery.sap.declare("sap.makit.library");jQuery.sap.require("sap.ui.core.Core");jQuery.sap.require("sap.ui.core.library");sap.ui.getCore().initLibrary({name:"sap.makit",dependencies:["sap.ui.core"],types:["sap.makit.ChartType","sap.makit.LegendPosition","sap.makit.SortOrder","sap.makit.ValueBubblePosition","sap.makit.ValueBubbleStyle"],interfaces:[],controls:["sap.makit.Chart","sap.makit.CombinationChart"],elements:["sap.makit.Axis","sap.makit.Category","sap.makit.CategoryAxis","sap.makit.Column","sap.makit.Layer","sap.makit.MakitLib","sap.makit.Row","sap.makit.Series","sap.makit.Value","sap.makit.ValueAxis","sap.makit.ValueBubble"],version:"1.56.5"});jQuery.sap.declare("sap.makit.ChartType");sap.makit.ChartType={Column:"Column",Line:"Line",Bubble:"Bubble",Bar:"Bar",Pie:"Pie",Donut:"Donut",StackedColumn:"StackedColumn",HundredPercentStackedColumn:"HundredPercentStackedColumn",WaterfallColumn:"WaterfallColumn",WaterfallBar:"WaterfallBar"};jQuery.sap.declare("sap.makit.LegendPosition");sap.makit.LegendPosition={Top:"Top",Left:"Left",Bottom:"Bottom",Right:"Right",None:"None"};jQuery.sap.declare("sap.makit.SortOrder");sap.makit.SortOrder={Ascending:"Ascending",Descending:"Descending",Partial:"Partial",None:"None"};jQuery.sap.declare("sap.makit.ValueBubblePosition");sap.makit.ValueBubblePosition={Top:"Top",Side:"Side"};jQuery.sap.declare("sap.makit.ValueBubbleStyle");sap.makit.ValueBubbleStyle={Top:"Top",Float:"Float",FloatTop:"FloatTop"};
}
},"sap/makit/library-h2-preload"
);
sap.ui.loader.config({depCacheUI5:{
"sap/makit/Axis.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/Category.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/CategoryAxis.js":["sap/makit/Axis.js","sap/makit/library.js"],
"sap/makit/Chart.js":["sap/makit/MakitLib.js","sap/makit/library.js","sap/ui/core/Control.js"],
"sap/makit/Column.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/CombinationChart.js":["sap/makit/MakitLib.js","sap/makit/library.js","sap/ui/core/Control.js"],
"sap/makit/Layer.js":["sap/makit/MakitLib.js","sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/Row.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/Series.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/Value.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/ValueAxis.js":["sap/makit/Axis.js","sap/makit/library.js"],
"sap/makit/ValueBubble.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/library.js":["sap/ui/core/Core.js","sap/ui/core/library.js"]
}});
//# sourceMappingURL=library-h2-preload.js.map