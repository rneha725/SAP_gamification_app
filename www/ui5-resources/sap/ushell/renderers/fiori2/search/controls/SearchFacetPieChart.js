sap.ui.define(['sap/ui/thirdparty/d3'],function(){"use strict";sap.ui.core.Control.extend('sap.ushell.renderers.fiori2.search.controls.SearchFacetPieChart',{setEshRole:function(r){},metadata:{properties:{oSearchFacetDialog:{}},aggregations:{items:{type:"sap.ushell.renderers.fiori2.search.FacetItem",multiple:true}}},renderer:function(R,C){R.write("<div");R.writeControlData(C);R.writeClasses();R.write('>');function f(){if(navigator.appName==='Microsoft Internet Explorer'){return true;}return false;}var P=function(){this.init.apply(this,arguments);};P.Labelposition=(function(){var a=function(){this.init.apply(this,arguments);};a.prototype={init:function(b,c,s,e,r,d,g,h,t,i){this.backgroundWidth=b;this.backgroundHeight=c;this.startAngle=s;this.endAngle=e;this.r=r;this.labelPaddingX=3;this.labelPaddingY=3;this.radiusPadding=4.24;this.labelWidth=d+2*this.labelPaddingX;this.labelHeight=g;this.outsetMin=0.3;this.outsetMax=1.2;this.outsetStep=0.025;this.apexAngle=e-s;this.startLabelWidth=this.labelWidth;this.d3centroid=h;this.text=t;this.svgBackground=i;this.debug=false;this.labelHeight=this.labelHeight+2*this.labelPaddingY;var x=Math.round(this.backgroundWidth/2);var y=Math.round(this.backgroundHeight/2);this.translateStr="translate("+x+","+y+")";},update:function(){var o=Math.max(this.outsetMin,Math.sin(this.apexAngle/2)/(this.apexAngle/2)*2/3);var p=true;var i=Math.max(100,this.labelWidth*2,1/this.outsetStep);var b=0;var c;do{p=true;c=this.calc(o,this.labelWidth,this.labelHeight);if(o>this.outsetMax||o<this.outsetMin){break;}if(this.labelWidth<0){break;}var d,e,g,h;if(b===0){d=this.calc(o+this.outsetStep,this.labelWidth,this.labelHeight);e=this.calc(o-this.outsetStep,this.labelWidth,this.labelHeight);g=this.value(d,c);h=this.value(e,c);if(g<h&&h>0.5){b=-1;o+=this.outsetStep*b;p=false;}else if(g>0.5||c.labelWidth<=0){b=1;o+=this.outsetStep*b;p=false;}}else{d=this.calc(o+this.outsetStep*b,this.labelWidth,this.labelHeight);g=this.value(d,c);if(g>0.5||c.labelWidth<=0){o+=this.outsetStep*b;p=false;}}i--;}while(!p&&i>0&&!isNaN(o));c=this.calc(o,this.labelWidth,this.labelHeight);this.labelWidth=c.labelWidth;var x=c.x;var y=c.y;this.svgBackground.select("circle.centroid").remove();if(this.debug){this.svgBackground.append("svg:circle").attr("class","centroid").attr("cx",c.centroidX).attr("cy",c.centroidY).attr("r",2).style("fill","blue");}this.svgBackground.selectAll("line.helper").remove();if(this.debug){this.svgBackground.append("svg:line").attr("class","helper helper2").attr("x1",-this.backgroundWidth/2).attr("x2",this.backgroundWidth/2).attr("y1",y-this.labelHeight/2).attr("y2",y-this.labelHeight/2);this.svgBackground.append("svg:line").attr("class","helper helper2").attr("x1",-this.backgroundWidth/2).attr("x2",this.backgroundWidth/2).attr("y1",y+this.labelHeight/2).attr("y2",y+this.labelHeight/2);this.svgBackground.append("svg:line").attr("class","helper").attr("x1",0).attr("y1",0).attr("x2",Math.sin(this.startAngle)*(this.r+this.radiusPadding)).attr("y2",-Math.cos(this.startAngle)*(this.r+this.radiusPadding));this.svgBackground.append("svg:line").attr("class","helper").attr("x1",0).attr("y1",0).attr("x2",Math.sin(this.endAngle)*(this.r+this.radiusPadding)).attr("y2",-Math.cos(this.endAngle)*(this.r+this.radiusPadding));this.svgBackground.append("svg:line").attr("class","helper").attr("x1",Math.sin(this.startAngle)*(this.r+this.radiusPadding)).attr("y1",-Math.cos(this.startAngle)*(this.r+this.radiusPadding)).attr("x2",this.isStartAngleOnRight()?this.backgroundWidth/2:-this.backgroundWidth/2).attr("y2",-Math.cos(this.startAngle)*(this.r+this.radiusPadding));this.svgBackground.append("svg:line").attr("class","helper").attr("x1",Math.sin(this.endAngle)*(this.r+this.radiusPadding)).attr("y1",-Math.cos(this.endAngle)*(this.r+this.radiusPadding)).attr("x2",this.isEndAngleOnRight()?this.backgroundWidth/2:-this.backgroundWidth/2).attr("y2",-Math.cos(this.endAngle)*(this.r+this.radiusPadding));}if(this.labelWidth<2*this.labelPaddingX){this.labelWidth=0;}else if(this.labelWidth<this.startLabelWidth){this.labelWidth=this.labelWidth-2*this.labelPaddingX;}this.x=(isNaN(x))?0:(x);this.y=(isNaN(x))?0:(y);},calc:function(o,b,c){var d,e,g,r,p,h;if(this.startAngle-this.endAngle+2*Math.PI<1e-9){d=0;e=0;r=this.backgroundWidth/2;g=-this.backgroundWidth/2;h=-this.r;p=this.r;}else{d=Math.sin(this.apexAngle/2)*this.r*o;e=Math.cos(this.apexAngle/2)*-this.r*o;var t=d*Math.cos(this.startAngle)-e*Math.sin(this.startAngle);e=d*Math.sin(this.startAngle)+e*Math.cos(this.startAngle);d=t;var u=e-this.labelHeight/2;var i=e+this.labelHeight/2;g=Math.max(this.calcLeftBorder(d,u),this.calcLeftBorder(d,i),-this.backgroundWidth/2);if(Math.abs(this.startAngle-this.endAngle%(2*Math.PI))>1e-9&&d>0&&u<=0&&i>=0){g=Math.max(g,0);}if(!this.doesFitHeight(g,u,i,(d<0),true)){g=this.backgroundWidth/2;}r=Math.min(this.calcRightBorder(d,u),this.calcRightBorder(d,i),this.backgroundWidth/2);if(Math.abs(this.startAngle-this.endAngle%(2*Math.PI))>1e-9&&d<0&&u<=0&&i>=0){r=Math.min(r,0);}if(!this.doesFitHeight(r,u,i,(d<0),false)){r=-this.backgroundWidth/2;}var j=this.calcPerimeterBorder(1,e-this.labelHeight/2);if(j<d){j=this.backgroundWidth/2;}var k=this.calcPerimeterBorder(1,e+this.labelHeight/2);if(k<d){k=this.backgroundWidth/2;}p=Math.min(j,k,r);var m=this.calcPerimeterBorder(-1,e-this.labelHeight/2);if(m>d){m=-this.backgroundWidth/2;}var n=this.calcPerimeterBorder(-1,e+this.labelHeight/2);if(n>d){n=-this.backgroundWidth/2;}h=Math.max(m,n,g);if(isNaN(p)){p=r;}if(isNaN(h)){h=g;}}this.svgBackground.select("line.left").remove();this.svgBackground.select("line.right").remove();this.svgBackground.select("line.perimeterLeft").remove();this.svgBackground.select("line.perimeterRight").remove();if(this.debug){this.svgBackground.append("svg:line").attr("class","left").attr("y1",-this.backgroundHeight/2).attr("y2",this.backgroundHeight/2).attr("x1",g).attr("x2",g);this.svgBackground.append("svg:line").attr("class","right").attr("y1",-this.backgroundHeight/2).attr("y2",this.backgroundHeight/2).attr("x1",r).attr("x2",r);this.svgBackground.append("svg:line").attr("class","perimeterLeft").attr("y1",-this.backgroundHeight/2).attr("y2",this.backgroundHeight/2).attr("x1",h).attr("x2",h);this.svgBackground.append("svg:line").attr("class","perimeterRight").attr("y1",-this.backgroundHeight/2).attr("y2",this.backgroundHeight/2).attr("x1",p).attr("x2",p);}var q=b;b=Math.min(b,Math.floor(r-g));var x=d;x=Math.max(x,h+b/2);x=Math.min(x,p-b/2);if(x-b/2<h-1e-9||x+b/2>p+1e-9){x=(h+p)/2;}if(d>=0){x=Math.max(x,g+b/2);x=Math.min(x,r-b/2);}else{x=Math.min(x,r-b/2);x=Math.max(x,g-b/2);}var y=e;return{x:x,y:y,labelWidth:b,labelShortened:(b!==q),xSpace:r-g,centroidX:d,centroidY:e,asymmetry:Math.abs(x-d)};},value:function(c,b){if(c.labelWidth<0){return-10000;}if(c.labelWidth<b.labelWidth){return-100;}if(c.labelWidth>b.labelWidth){return(c.labelWidth-b.labelWidth)*1000;}if(b.labelShortened&&c.labelWidth===b.labelWidth){return(c.xSpace-b.xSpace)*100;}return 0;},doesFitHeight:function(b,u,c,i,d){var y=-Math.cos(this.startAngle)*(this.r+this.radiusPadding);var e=-Math.cos(this.endAngle)*(this.r+this.radiusPadding);if(Math.abs(this.startAngle-this.endAngle%(2*Math.PI))<1e-9){y=-this.backgroundHeight/2;e=this.backgroundHeight/2;}else if(b===0){y=-this.backgroundHeight/2;e=this.backgroundHeight/2;}else if(b>0){if(!this.isStartAngleOnRight()){y=-this.backgroundHeight/2;}else if(b<=Math.sin(this.startAngle)*(this.r+this.radiusPadding)){y=b/-Math.tan(this.startAngle);}if(!this.isEndAngleOnRight()){e=this.backgroundHeight/2;}else if(b<=Math.sin(this.endAngle)*(this.r+this.radiusPadding)){e=b/-Math.tan(this.endAngle);}if(i&&!d&&y>=c){y=-this.backgroundHeight/2;}if(i&&!d&&e<=u){e=this.backgroundHeight/2;}}else{if(this.isStartAngleOnRight()){y=this.backgroundHeight/2;}else if(b>Math.sin(this.startAngle)*(this.r+this.radiusPadding)){y=b/-Math.tan(this.startAngle);}if(this.isEndAngleOnRight()){e=-this.backgroundHeight/2;}else if(b>Math.sin(this.endAngle)*(this.r+this.radiusPadding)){e=b/-Math.tan(this.endAngle);}if(!i&&d&&e>=c){e=-this.backgroundHeight/2;}if(!i&&d&&y<=u){y=this.backgroundHeight/2;}}if(!d){this.svgBackground.selectAll(".rightBorder").remove();if(this.debug){this.svgBackground.append("svg:rect").attr("class","rightBorder").attr("x",b-3).attr("y",y-3).attr("width",6).attr("height",6).style("fill","green");this.svgBackground.append("svg:circle").attr("class","rightBorder").attr("cx",b).attr("cy",e).attr("this.r",3).style("fill","green");}}else{this.svgBackground.selectAll(".leftBorder").remove();if(this.debug){this.svgBackground.append("svg:rect").attr("class","leftBorder").attr("x",b-3).attr("y",y-3).attr("width",6).attr("height",6).style("fill","red");this.svgBackground.append("svg:circle").attr("class","leftBorder").attr("cx",b).attr("cy",e).attr("this.r",3).style("fill","red");}}return(u>=Math.min(y,e)-1e-9&&c<=Math.max(y,e)+1e-9);},calcLeftBorder:function(x,y){var b=-this.backgroundWidth/2;if(Math.abs(this.startAngle-this.endAngle%(2*Math.PI))<1e-9){return b;}if(y<=0){if(y>-Math.cos(this.startAngle)*(this.r+this.radiusPadding)){b=Math.tan(this.startAngle)*-y;}}else if(y<-Math.cos(this.endAngle)*(this.r+this.radiusPadding)){b=Math.tan(this.endAngle)*-y;}return b;},calcRightBorder:function(x,y){var b=this.backgroundWidth/2;if(Math.abs(this.startAngle-this.endAngle%(2*Math.PI))<1e-9){return b;}if(y>=0){if(-y>Math.cos(this.startAngle)*(this.r+this.radiusPadding)){b=Math.tan(this.startAngle)*-y;}}else if(-y<Math.cos(this.endAngle)*(this.r+this.radiusPadding)){b=Math.tan(this.endAngle)*-y;}return b;},calcPerimeterBorder:function(x,y){var b=(x>0)?this.backgroundWidth/2:-this.backgroundWidth/2;b=Math.sqrt(this.r*this.r-y*y);if(x<0){b*=-1;}return b;},isStartAngleOnRight:function(){return this.startAngle>0&&this.startAngle<=2*Math.PI/360*180;},isEndAngleOnRight:function(){return this.endAngle%(2*Math.PI)<2*Math.PI/360*180;}};return a;})();P.Tweens=(function(){var T={};T.tweenGenSimple=function(d,i,a,b,o,s){var c={startAngle:d.oldArc.startAngle,endAngle:d.oldArc.endAngle,innerRadius:b,outerRadius:o};var e={startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:b,outerRadius:o};var j=d3.interpolate(c,e);return function(t){return s(j(t));};};T.tweenGenSimpleText=function(d,i,a,b,o,c,e){var g=" ";if((d.labelElement.childNodes[1])&&(d.labelElement.childNodes[1].childNodes[0])&&(d.labelElement.childNodes[1].childNodes[0].data)){g=d.labelElement.childNodes[1].childNodes[0].data;}var h=new P.Labelposition(c.options.width,c.options.height,d.oldArc.startAngle,d.oldArc.endAngle,c.options.outerRadius,d.labelElement.childNodes[1].getBBox().width,d.labelElement.childNodes[1].getBBox().height,c.svgArcGen(d).centroid(d),g,c.svg);h.update();var k=[h.x,h.y];var m=new P.Labelposition(c.options.width,c.options.height,d.startAngle,d.endAngle,c.options.outerRadius,d.labelElement.childNodes[1].getBBox().width,d.labelElement.childNodes[1].getBBox().height,c.svgArcGen(d).centroid(d),g,c.svg);m.update();if(m.labelWidth<d.labelElement.childNodes[1].getBBox().width){c.adjustLabelWidth(d.labelElement,m.labelWidth);}var n=[m.x,m.y];var j=d3.interpolateArray(k,n);var p=function(q){var t;if(e){t=T.translateStr4Padding(d.startAngle,d.endAngle,c.options.padding4click,q[0],q[1]);}else{t="translate("+q+")";}return t;};return function(t){return p(j(t));};};T.translateStr4Padding=function(s,e,p,x,y){var a=e-s;var b=p*Math.sin(a/2);var c=-(p*Math.cos(a/2));var t=b*Math.cos(s)-c*Math.sin(s);c=b*Math.sin(s)+c*Math.cos(s);b=t;var d="translate("+(x+b)+", "+(y+c)+")";return d;};T.tweenGenEcstasy=function(d,i,a,b,o,s){var c=Math.round((b+o)/2);var e;var g;if(i%2){e=o;g=c;}else{e=c;g=b;}var h={startAngle:d.oldArc.startAngle,endAngle:d.oldArc.endAngle,innerRadius:b,outerRadius:o};var j={startAngle:d.oldArc.startAngle,endAngle:d.oldArc.endAngle,innerRadius:g,outerRadius:e};var k=d3.interpolate(h,j);h={startAngle:d.oldArc.startAngle,endAngle:d.oldArc.endAngle,innerRadius:g,outerRadius:e};j={startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:g,outerRadius:e};var r=d3.interpolate(h,j);h={startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:g,outerRadius:e};j={startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:b,outerRadius:o};var u=d3.interpolate(h,j);return function(t){if(t<=0.25){return s(k(t*4));}if(t<=0.75){return s(r((t-0.25)*2));}return s(u((t-0.75)*4));};};T.tweenGenLSD=function(d,i,a,b,o,s){var c=Math.round((b+o)/2);var e;var g;if(i%2){e=o;g=c;}else{e=c;g=b;}var h={startAngle:d.oldArc.startAngle,endAngle:d.oldArc.endAngle,innerRadius:b,outerRadius:o};var j={startAngle:d.oldArc.startAngle,endAngle:d.oldArc.endAngle,innerRadius:g,outerRadius:e};var k=d3.interpolate(h,j);h={startAngle:d.oldArc.startAngle,endAngle:d.oldArc.endAngle,innerRadius:g,outerRadius:e};j={startAngle:d.startAngle,endAngle:d.startAngle+(d.oldArc.endAngle-d.oldArc.startAngle),innerRadius:g,outerRadius:e};var m=d3.interpolate(h,j);h={startAngle:d.startAngle,endAngle:d.startAngle+(d.oldArc.endAngle-d.oldArc.startAngle),innerRadius:g,outerRadius:e};j={startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:g,outerRadius:e};var r=d3.interpolate(h,j);h={startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:g,outerRadius:e};j={startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:b,outerRadius:o};var u=d3.interpolate(h,j);return function(t){if(t<=0.25){return s(k(t*4));}if(t<=0.5){return s(m((t-0.25)*4));}if(t<=0.75){return s(r((t-0.5)*4));}return s(u((t-0.75)*4));};};return T;})();var l={};l.debug=function(t){};P.prototype={init:function(p,o,a,m){this.application=a;this.parent=p;this.model=m;this.chartElements=[];var b=d3.select(p);var s=$(p).innerHeight();var c=$(p).innerWidth();if(o.height>s){s=o.height;}var r=(Math.min(c,s)/2);this.options={"dimension-pie":"YEAR",backgroundWidth:c,backgroundHeight:s,width:c,height:s,innerRadius:0,outerRadius:r*0.8,tweenGen:P.Tweens.tweenGenSimple,tweenGenText:P.Tweens.tweenGenSimpleText,arcCalculator:P.generateHistoricalArcCalculator(),animationduration:1500,labelHideThreshold:0.05,easing:"linear",pieChartClass:"sap-piechart",pieChartParentClass:"sapUshellSearchFacetPieChart",color:"blue",strokewidth:1,strokewidthHover:3,padding4click:7,multipleselectable:true,oSearchFacetDialog:null};if(o){for(var d in o){this.options[d]=o[d];}}this.createAttributeService(P,"innerRadius",function(){this.init();});this.createAttributeService(P,"outerRadius",function(){this.init();});this.createAttributeService(P,"tweenGen",function(){this.init();});this.createAttributeService(P,"tweenGenText",function(){this.init();});this.createAttributeService(P,"width",function(){this.init();});this.createAttributeService(P,"height",function(){this.init();});this.createAttributeService(P,"animationduration");this.createAttributeService(P,"labelHideThreshold");this.createAttributeService(P,"arcCalculator");var x=Math.round(this.options.width/2);var y=Math.round(this.options.height/2);this.svg=b.append("svg:svg").attr("width",c).attr("height",s).attr("id",p.id+"_svg").append("svg:g").attr("transform","translate("+x+","+y+")");this.svgArcs=this.svg.append("svg:g");this.svgLabels=this.svg.append("svg:g");this.svg.attr("class",this.options.pieChartClass);this.inittween();this.oldArcs=[];this.clickedSegment={};this.firstUpdate=true;},getParent:function(){return this.parent;},createAttributeService:function(c,a,i){c.prototype[a]=function(v){if(v===null){return this.options[a];}else{this.options[a]=v;if(i){i.call(this);}return this;}};},inittween:function(){var t=this;t.xOrigin=Math.round(t.options.width/2);t.yOrigin=Math.round(t.options.height/2);t.svg.attr("width",this.options.width).attr("height",this.options.height);this.tweenGenArc=function(d,i,a){return t.options.tweenGen(d,i,a,t.options.innerRadius,t.options.outerRadius,t.svgArcGen(d));};this.tweenGenText=function(d,i,a,b){return t.options.tweenGenText(d,i,a,t.options.innerRadius,t.options.outerRadius,t,b);};},update:function(d){this.notAnimatedUpdate(d);},notAnimatedUpdate:function(a){var t=this;var b=[];if(!a){return;}this.chartElements=a;t.svgArcs.selectAll("path").remove();t.svgLabels.selectAll("g").remove();var c=0;for(var i=0;i<a.length;++i){c+=a[i].value;}for(var j=0;j<a.length;++j){a[j].percentage=a[j].value/c;}b=this.options.arcCalculator.calculateNewArcsOnly(a);var s=this.svgArcs.selectAll("path").data(b,P.getIdOfArc);if(!s.exit().empty()){s.exit().remove();}if(!s.empty()){s.attr("d",function(d){var p=t.svgArcGen(d);return p(d);}).attr("transform",function(d){var e;if(d.data.selected){e=P.translateStr4Padding(d.startAngle,d.endAngle,t.options.padding4click,0,0);}else{e="translate(0,0)";}return e;}).style("stroke",function(d){var e;if(d.data.stroke==="none"){e=d.data.stroke;}else if(d.data.selected||d.data.hovered){e="#dadada";}else{e="white";}return e;}).style("stroke-width",function(d){var e;if(d.data.selected||d.data.hovered){e=t.options.strokewidthHover;}else{e=t.options.strokewidth;}return e;}).style("opacity",function(d){var o;if(d.data.selected||d.data.hovered){o="1";}else if(d.data.initial){o="0.75";}else{o="0.5";}return o;}).each(function(d,i){while(this.hasChildNodes()){this.removeChild(this.lastChild);}d3.select(this).append("svg:title").text(""+d.data.tooltip);});}s.enter().append("svg:path").attr("transform",function(d){var e;if(d.data.selected){t.clickedSegment[d.data.id]=this;e=P.translateStr4Padding(d.startAngle,d.endAngle,t.options.padding4click,0,0);}return e;}).attr("shape-rendering","geometricPrecision").attr("tabindex","0").style("stroke",function(d){var e;if(d.data.stroke==="none"){e=d.data.stroke;}else if(d.data.selected||d.data.hovered){e="#dadada";}else{e="white";}return e;}).style("stroke-width",function(d){var e;if(d.data.selected||d.data.hovered){e=t.options.strokewidthHover;}else{e=t.options.strokewidth;}return e;}).style("opacity",function(d){var o;if(d.data.selected||d.data.hovered){o="1";}else if(d.data.initial){o="0.75";}else{o="0.5";}return o;}).attr("fill",function(d,i){return d.data.fill;}).on("keydown",function(d,i){var e=d3.event;var h=e.keyCode||e.which;if(h==32){e.target.__onclick();}}).on("click",function(d,i){var e;var h=d.data.selected;if((d.data.click)&&(d.data.pieupdateuionly===false)){var r=d.data.click(d,i);if((!t.options.multipleselectable)&&(!r)){return;}}var k,m;var n;var o=t.getLabelElementtbyLabel(d.data.label);if(o){var p=" ";if((o.childNodes[1])&&(o.childNodes[1].childNodes[0])&&(o.childNodes[1].childNodes[0].data)){p=o.childNodes[1].childNodes[0].data;}n=new P.Labelposition(t.options.width,t.options.height,d.startAngle,d.endAngle,t.options.outerRadius,o.childNodes[1].getBoundingClientRect().width,o.childNodes[1].getBoundingClientRect().height,t.svgArcGen(d).centroid(d),p,t.svg);n.update();if(n.labelWidth<o.childNodes[1].getBoundingClientRect().width){t.adjustLabelWidth(o,n.labelWidth);}}if(h){if((!t.options.multipleselectable)&&(Object.keys(t.clickedSegment).length>0)){delete t.clickedSegment[d.data.id];}k="translate(0,0)";if(o){m="translate("+n.x+","+n.y+")";}d.data.selected=false;if(t.options.oSearchFacetDialog){e={};e.cnt=t.getNumberOfClickedSegments();e.dataObject=d.data;t.options.oSearchFacetDialog.onDetailPageSelectionChangeCharts(e);}else{t.model.removeFilterCondition(d.data.filterCondition,true);}}else{if(!t.options.multipleselectable){if(Object.keys(t.clickedSegment).length>0){for(var q in t.clickedSegment){var u=t.clickedSegment[q];if(typeof u.__onclick==="function"){u.__data__.data.pieupdateuionly=true;u.__onclick.apply(u);}delete t.clickedSegment[q];}}if(Object.keys(t.clickedSegment).length<1){t.clickedSegment[d.data.id]=(this);}}k=P.translateStr4Padding(d.startAngle,d.endAngle,t.options.padding4click,0,0);if(o){m=P.translateStr4Padding(d.startAngle,d.endAngle,t.options.padding4click,n.x,n.y);}d.data.selected=true;if(d.data.filterCondition){if(t.options.oSearchFacetDialog){e={};e.cnt=t.getNumberOfClickedSegments();e.dataObject=d.data;t.options.oSearchFacetDialog.onDetailPageSelectionChangeCharts(e);}else{t.model.addFilterCondition(d.data.filterCondition,true);}}}d3.select(this).transition().duration(1000).ease(d3.ease("elastic")).attr("transform",k).style("stroke",function(d){var w;if(d.data.stroke==="none"){w=d.data.stroke;}else if(d.data.selected){w="#dadada";}else{w="white";}return w;}).style("stroke-width",function(d){var w;if(d.data.selected){w=t.options.strokewidthHover;}else{w=t.options.strokewidth;}return w;}).style("opacity",function(d){var w;if(d.data.selected||d.data.hovered){w="1";}else if(d.data.initial){w="0.75";}else{w="0.5";}return w;});var v=t.getLabelElementtbyLabel(d.data.label);if(v){d3.select(v).transition().duration(1000).ease(d3.ease("elastic")).attr("transform",m);}}).on("mouseover",function(d,i){if((!t.options.multipleselectable)&&(Object.keys(t.clickedSegment).length>0)){return;}if(d.data.selected||d.data.hovered){return;}if(d.data.mouseover){var r=d.data.mouseover(d,i);if((!t.options.multipleselectable)&&(!r)){return;}}}).on("mouseout",function(d,i){if(d.data.selected){d3.select(this).style("opacity",1);}if((!t.options.multipleselectable)&&(Object.keys(t.clickedSegment).length>0)){return;}if(d.data.selected){return;}if(d.data.mouseout){var r=d.data.mouseout(d,i);if((!t.options.multipleselectable)&&(!r)){return;}}}).attr("d",function(d){var p=t.svgArcGen(d);return p(d);}).append("svg:title").text(function(d){return""+d.data.tooltip;});s=t.svgLabels.selectAll("g").data(b,P.getIdOfArc);if(!s.exit().empty()){s.exit().remove();}if(!s.empty()){s.style("opacity",function(d){if(d.removed||d.data.percentage<t.options.labelHideThreshold){return 0;}else{return 1;}}).attr("transform",function(d){var e;var h;if((this.childNodes[1])&&(this.childNodes[1].childNodes[0])){h=new P.Labelposition(t.options.width,t.options.height,d.startAngle,d.endAngle,t.options.outerRadius,this.getBoundingClientRect().width,this.getBoundingClientRect().height,t.svgArcGen(d).centroid(d),d.data.label,t.svg);}else{h=new P.Labelposition(t.options.width,t.options.height,d.startAngle,d.endAngle,t.options.outerRadius,this.getBoundingClientRect().width,this.getBoundingClientRect().height,t.svgArcGen(d).centroid(d)," ",t.svg);}h.update();if(h.labelWidth<this.childNodes[1].getBoundingClientRect().width){t.adjustLabelWidth(this,h.labelWidth);}if(d.data.selected){e=P.translateStr4Padding(d.startAngle,d.endAngle,t.options.padding4click,h.x,h.y);}else{e="translate("+h.x+","+h.y+")";}return e;});}if(!s.enter().empty()){var g=s.enter().append("svg:g").style("opacity",0);g.append("svg:text").attr("class","labelshadow").attr("text-anchor","middle").text(function(d){return""+d.data.label;}).style("pointer-events","none");g.append("svg:text").attr("class","label").attr("text-anchor","middle").text(function(d){return""+d.data.label;}).style("pointer-events","none");g.style("opacity",function(d){if(d.removed||d.data.percentage<t.options.labelHideThreshold){return 0;}else{return 1;}}).attr("transform",function(d){var e;var h=new P.Labelposition(t.options.width,t.options.height,d.startAngle,d.endAngle,t.options.outerRadius,this.getBoundingClientRect().width,this.getBoundingClientRect().height,t.svgArcGen(d).centroid(d),d.data.label,t.svg);h.update();if(h.labelWidth<this.childNodes[1].getBoundingClientRect().width){t.adjustLabelWidth(this,h.labelWidth);}if(d.data.selected){e=P.translateStr4Padding(d.startAngle,d.endAngle,t.options.padding4click,h.x,h.y);}else{e="translate("+h.x+","+h.y+")";}return e;});}t.oldArcs=P.removeDeletedArcs(b);},getNumberOfClickedSegments:function(){var c=0;var a=this.chartElements;for(var i=0;i<a.length;i++){if(a[i].selected===true){c++;}}return c;},adjustLabelWidth:function(e,t){var s=e.childNodes[0];var a=e.childNodes[1];if(t<=0){s.childNodes[0].data='';a.childNodes[0].data='';return;}var b=s.childNodes[0].data.length;s.childNodes[0].data+="...";var c="";while(s.getBBox().width>t){c=s.childNodes[0].data;c=c.substr(0,b-1)+c.substr(b,3);s.childNodes[0].data=c;b--;if(b<=0){s.childNodes[0].data='';break;}}a.childNodes[0].data=s.childNodes[0].data;},getArcsWithLabel:function(a){var t=this;var b=[];for(var i=0;i<a.length;++i){var c=a[i];if(c.data.percentage>t.options.labelHideThreshold){b.push(c);}}return b;},svgArcGen:function(d){var t=this;var a=d3.svg.arc().innerRadius(function(d){return t.options.innerRadius;}).outerRadius(function(d){return t.options.outerRadius;}).startAngle(function(d){return d.startAngle;}).endAngle(function(d){return d.endAngle;});return a;},getArcElementtbyLabel:function(a){var t=this;t.svgArcs.selectAll("g").each(function(d,i){if(d.data.label===a){t=this;}return;});return t;},getLabelElementtbyLabel:function(a){var t=this;t.svgLabels.selectAll("g").each(function(d,i){if(d.data.label===a){t=this;}});return t;}};P.removeDeletedArcs=function(a){var t=[];for(var i=0;i<a.length;++i){var b=a[i];if(!b.removed){t.push(b);}}return t;};P.createZeroArc=function(a,e){return{startAngle:a,endAngle:a,data:e,removed:true};};P.insertAfter=function(a,i,b){var n;if(i>=0){var c=a[i];n=P.createZeroArc(c.endAngle,b.data);}else{n=P.createZeroArc(0,b.data);}n.oldArc=b;a.splice(i+1,0,n);};P.getIdOfArc=function(a){return a.data.id;};P.arcsGen=d3.layout.pie().value(function(d){return d.value;}).sort(null);P.getIndexById=function(a,b){for(var i=0;i<a.length;++i){var c=a[i];if(P.getIdOfArc(c)===b){return i;}}return null;};P.add2arcSequence=function(d,a){if(f()){var b=function(x){a.getIndex(x.id);};d.forEach(b);}return d;};P.translateStr4Padding=function(s,e,p,x,y){var a=e-s;var b=p*Math.sin(a/2);var c=-(p*Math.cos(a/2));var t=b*Math.cos(s)-c*Math.sin(s);c=b*Math.sin(s)+c*Math.cos(s);b=t;var d="translate("+(x+b)+", "+(y+c)+")";return d;};P.Sequence=function(){this.init.apply(this,arguments);};P.Sequence.prototype={init:function(){this.maxIndex=0;this.objectMap={};},getIndex:function(o){var i=this.objectMap[o];if(typeof i!=='undefined'){return i;}i=this.maxIndex;this.maxIndex++;this.objectMap[o]=i;return i;}};P.generateDefaultArcCalculator=function(){return new P.DefaultArcCalculator();};P.DefaultArcCalculator=function(){this.init.apply(this,arguments);};P.DefaultArcCalculator.prototype={init:function(){this.arcSequence=new P.Sequence();},calculateNewArcsOnly:function(d){var t=this;d=d.slice();P.add2arcSequence(d,t.arcSequence);d.sort(function(a,b){return t.arcSequence.getIndex(a.id)-t.arcSequence.getIndex(b.id);});var n=P.arcsGen(d);return n;},calculateArcs:function(o,d){var n=P.arcsGen(d);this.insertMissingArcs(o,n,true);this.insertMissingArcs(n,o,false);return n;},insertMissingArcs:function(a,b,i){var c=-1;for(var d=0;d<b.length;++d){var e=b[d];var g=P.getIndexById(a,e.data.id);var h;if(g!==null){h=a[g];h.oldArc=e;c=g;continue;}else{if(i){c=this.determineInsertIndex(a,c,b,d);}var n;if(c>=0){var j=a[c];n=P.createZeroArc(j.endAngle,e.data);}else{n=P.createZeroArc(0,e.data);}n.oldArc=e;a.splice(c+1,0,n);c++;}}},determineInsertIndex:function(a,b,c,d){var e=c[d];var s=this.arcSequence.getIndex(e.data.id);var i;for(i=b+1;i<a.length;++i){var g=this.arcSequence.getIndex(a[i].data.id);if(g>s){break;}if(P.getIndexById(c,a[i].data.id)!==null){break;}}return i-1;}};P.generateHistoricalArcCalculator=function(){return new this.HistoricalArcCalculator();};P.HistoricalArcCalculator=function(){this.init.apply(this,arguments);};P.HistoricalArcCalculator.prototype={init:function(){this.arcSequence=new P.Sequence();},calculateNewArcsOnly:function(d){var t=this;d=d.slice();P.add2arcSequence(d,t.arcSequence);d.sort(function(a,b){return t.arcSequence.getIndex(a.id)-t.arcSequence.getIndex(b.id);});var n=P.arcsGen(d);return n;},calculateArcs:function(o,d){var t=this;d=d.slice();P.add2arcSequence(d,t.arcSequence);d.sort(function(a,b){return t.arcSequence.getIndex(a.id)-t.arcSequence.getIndex(b.id);});var n=P.arcsGen(d);this.insertMissingArcs(o,n);this.insertMissingArcs(n,o);return n;},insertMissingArcs:function(a,b){var t=this;var c=0;for(var d=0;d<b.length;++d){var e=b[d];var g=t.arcSequence.getIndex(e.data.id);var h;var i=false;for(;c<a.length;++c){h=a[c];var j=t.arcSequence.getIndex(h.data.id);if(j===g){i=true;break;}if(j>g){break;}}if(i){h.oldArc=e;}else{var n;if(c-1>=0&&c-1<a.length){var k=a[c-1];n=P.createZeroArc(k.endAngle,e.data);}else{n=P.createZeroArc(0,e.data);}a.splice(c,0,n);n.oldArc=e;}c++;}}};R.write("</div>");C.PieChart=P;},getFacetIndexById:function(c){var a=-1;var t=$("#"+c).parent().parent().parent().parent().parent()[0];var b=t.id;var d=$(".sapUshellSearchFacetIconTabBar");for(var i=0;i<d.length;i++){var e=d[i].id;if(e===b){a=i;break;}}return a;},getFacetIndexByIdForLargePieChart:function(c){var a=-1;var t=$("#"+c).parent().parent()[0];var b=t.id;var d=$(".searchFacetLargeChartContainer");for(var i=0;i<d.length;i++){var e=d[i].id;if(e===b){a=i;break;}}return a;},getPieChartIndexByFacetIndex:function(f){var s;var a=-1;var p=0;for(var i=0;i<f;i++){s=$($(".sapUshellSearchFacetIconTabBar")[i]).find(".sapMLIBContent")[1].firstChild.id;if(s.match(/pieChart/)!==null){p++;}}a=p;return a;},getSumSelected:function(d){var a;var b=0;if(d){for(var i=0;i<d.length;i++){if(d[i].facetType==="attribute"){for(var j=0;j<d[i].items.length;j++){a=d[i].items[j].value;if(a&&d[i].items[j].selected){b+=a;}}}}}return b;},getDataForPieChart:function(d,m,f){var r=[];var g=[];var a={};var b=0;var c=-1;var e="";var s=m.oData.count;var o=s;var p=0;this.iMissingCnt=0;for(var i=0;i<d.length;i++){if(d[i].facetType==="attribute"){c++;if(d[i].totalCount){o=d[i].totalCount;}g=[];p=0;for(var j=0;j<d[i].items.length;j++){a={};b=d[i].items[j].value;if(b){e=""+b;p+=b;a.filterCondition=d[i].items[j].filterCondition;a.dimension=d[i].items[j].facetTitle;a.label=d[i].items[j].label;a.selected=d[i].items[j].selected;a.filterLabel=d[i].items[j].label;a.id=d[i].items[j].label;a.value=b;a.valueLabel=d[i].items[j].valueLabel;if(e){a.tooltip=d[i].items[j].label+": "+b;}else{a.tooltip=d[i].items[j].label;}a.filtered=false;a.removed=false;a.fill="#007CAA";a.maxLabelLength=30;g.push(a);}else if(c===f){this.iMissingCnt++;}}var h=Math.round((p/o)*100);var k=(100-h);if(k>0){if(k===100){k=99;}var l=(18*p)/350;var n=""+k;a={};a.filterCondition=null;a.dimension="";a.label=n;a.id="perc_missing";a.value=l;a.valueLabel=n;a.tooltip=sap.ushell.resources.i18n.getText("facetPieChartOverflowText",[n]);a.filtered=false;a.removed=false;a.fill="transparent";a.stroke="none";a.maxLabelLength=30;g.push(a);}r.push(g);}}return r;},getDataForPieChartLarge:function(d,m){var g=[];var i={};var a=0;var p=0;g=[];p=0;for(var j=0;j<d.length;j++){a=d[j].value;if(a){i={};p+=a;i.filterCondition=d[j].filterCondition;i.dimension=d[j].facetAttribute;i.label=d[j].label;i.selected=d[j].selected;i.filterLabel=d[j].label;i.id=d[j].label;i.value=a;i.valueLabel=d[j].valueLabel;i.tooltip=d[j].label+"\t: "+a;i.filtered=false;i.removed=false;i.fill="#007CAA";i.maxLabelLength=30;g.push(i);}}return g;},directUpdate:function(d,p,m,o){var c,a,b;var f=[];var e=20;a=null;b=this.getModel();if(!b){b=this.oParent.getModel();}o.pieChartParentClass="sapUshellSearchFacetPieChartLarge";o.height=o.relevantContainerHeight;o.labelHideThreshold=0.000001;$(p).parent().parent().height(o.height);o.width=$(p).parent().parent().width();this.chartElements=this.getDataForPieChartLarge(d,m);c=new this.PieChart(p,o,a,b);for(var i=0;i<e;i++){if(this.chartElements[i]){f.push(this.chartElements[i]);}}c.update(f);},onAfterRendering:function(){var t=this;var d,c,a,m,b,p,f;var o={};b=null;m=this.getModel();if(!m){m=this.oParent.oModels.facets;}if(m){p=$("#"+this.sId)[0];if($(p).parent()[0].className==="sapMLIBContent"){o.pieChartParentClass="sapUshellSearchFacetPieChart";f=this.getFacetIndexById(this.sId);p.className=o.pieChartParentClass;d=this.getDataForPieChart(m.oData.facets,m,f);c=d[f];a=new this.PieChart(p,o,b,m);a.update(c);var i=$(this.getDomRef()).closest(".sapUshellSearchFacetIconTabBar").find(".sapUshellSearchFacetInfoZeile")[0];var I=sap.ui.getCore().byId(i.id);if(t.iMissingCnt>0){I.setVisible(true);var e=sap.ushell.resources.i18n.getText("infoZeileNumberMoreSelected",[t.iMissingCnt]);I.setText(e);}else{I.setVisible(false);}}else if($(p)[0].className==="largeChart2piechart"){$(p).attr("tabindex","0");}}}});});