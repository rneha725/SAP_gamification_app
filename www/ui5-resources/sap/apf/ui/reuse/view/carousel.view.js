/*!
 * SAP APF Analysis Path Framework
 *
 * (c) Copyright 2012-2014 SAP AG. All rights reserved
 */
(function(){"use strict";sap.ui.jsview("sap.apf.ui.reuse.view.carousel",{getStepGallery:function(){var s=this.oController.stepGalleryView;return s;},getChartToolbar:function(){return this.oController.oStepToolbar;},carouselContent:function(c){jQuery.sap.require('sap.apf.ui.controls.draggableCarousel.DraggableCarousel');var s=this;this.oController=c;this.stepViews=[];var v=this.getViewData().oInject;var h=0;v.oCoreApi.getSmartFilterBarConfigurationAsPromise().done(function(k){if(k){h=105;}});s.oCoreApi=v.oCoreApi;s.oUiApi=v.uiApi;var a=new sap.ui.core.Icon({src:"sap-icon://arrow-bottom"}).addStyleClass('downArrow');var b=document.createElement('div');b.innerHTML=sap.ui.getCore().getRenderManager().getHTML(a);var d=new sap.ui.core.InvisibleText({id:c.createId("idOfAriaTextForCarouselBlock")});var e=document.createElement("div");e.setAttribute('id','contentOfAriaTextForDnD');document.body.appendChild(e);d.placeAt("contentOfAriaTextForDnD");var r=new sap.ui.core.Icon({src:"sap-icon://sys-cancel-2",size:"20px",tooltip:this.oCoreApi.getTextNotHtmlEncoded("deleteStep")}).addStyleClass('removeIcon');var f=document.createElement('div');f.innerHTML=sap.ui.getCore().getRenderManager().getHTML(r);var g=jQuery(window).height()-(sap.apf.ui.utils.CONSTANTS.carousel.SCROLLCONTAINER+h)+"px";var w="320px";window.onresize=function(){var g=jQuery(window).height()-(sap.apf.ui.utils.CONSTANTS.carousel.SCROLLCONTAINER+h)+"px";jQuery('.DnD-container').css({"height":jQuery(window).height()-(sap.apf.ui.utils.CONSTANTS.carousel.DNDBOX+h)+"px"});jQuery(".scrollContainerEle").css("height",g);};this.dndBox=new sap.apf.ui.controls.draggableCarousel.DraggableCarousel({containerHeight:jQuery(window).height()-(sap.apf.ui.utils.CONSTANTS.carousel.DNDBOX+h)+"px",containerWidth:w,blockHeight:sap.apf.ui.utils.CONSTANTS.thumbnailDimensions.STEP_HEIGHT,blockWidth:sap.apf.ui.utils.CONSTANTS.thumbnailDimensions.STEP_WIDTH,blockMargin:sap.apf.ui.utils.CONSTANTS.thumbnailDimensions.STEP_MARGIN,separatorHeight:sap.apf.ui.utils.CONSTANTS.thumbnailDimensions.SEPARATOR_HEIGHT,removeIconHeight:sap.apf.ui.utils.CONSTANTS.thumbnailDimensions.REMOVE_ICON_HEIGHT,separator:b,removeIcon:f,ariaTextForCarouselBlock:d.getId(),onBeforeDrag:function(k){return;},onAfterDrop:c.moveStep.bind(c),onAfterRemove:c.removeStep.bind(c),onAfterSelect:function(k){if(jQuery(this).attr("drag-state")==="true"){s.getStepView(k).oController.setActiveStep(k);}else{c.showStepGallery();}},setAriaTextWhenEnterPressOnBlock:function(t){return s.oCoreApi.getTextNotHtmlEncoded("aria-text-when-enter-press",[t]);},setAriaTextwhenDeleteKeyPressOnBlock:function(t){return s.oCoreApi.getTextNotHtmlEncoded("aria-text-when-del-press",[t]);},setAriaTextWhenFocusOnBlock:function(t){return s.oCoreApi.getTextNotHtmlEncoded("aria-text-when-path-selected",[t]);}});this.ariaTextForAddAnalysisStep=new sap.ui.core.InvisibleText({id:c.createId("idOfAriaTextForAddAnalysisStep"),text:s.oCoreApi.getTextNotHtmlEncoded("aria-text-for-add-analysis-step")});var i=document.createElement("div");i.setAttribute('id','contentOfAriaTextForAdd');document.body.appendChild(i);this.ariaTextForAddAnalysisStep.placeAt("contentOfAriaTextForAdd");var u=this.createId("dnd-Holder");this.oHtml=new sap.ui.core.HTML({content:"<div id = '"+jQuery.sap.encodeHTML(u)+"'></div>",sanitizeContent:true,afterRendering:function(){s.dndBox.placeAt(u);jQuery(s.dndBox.eleRefs.blocks[0]).height("30px");s.dndBox.eleRefs.blocks[0].onfocus=function(){this.setAttribute('aria-labelledby',s.ariaTextForAddAnalysisStep.getId());};}});var j;this.addButton=new sap.m.Button({id:c.createId("idAddAnalysisStepButton"),text:s.oCoreApi.getTextNotHtmlEncoded("add-step"),width:"100%",icon:"sap-icon://add",press:function(k){c.showStepGallery();}});j=document.createElement('div');j.setAttribute('class','addStepBtnHolder');jQuery(j).html(jQuery(sap.ui.getCore().getRenderManager().getHTML(this.addButton)).attr("tabindex",-1));this.dndBox.addBlock({blockElement:j,dragState:false,dropState:false,removable:false});this.up=new sap.m.Button({id:this.createId("idMoveStepUpButton"),icon:"sap-icon://arrow-top",tooltip:this.oCoreApi.getTextNotHtmlEncoded("moveStepUp"),press:function(){var k=s.oCoreApi.getSteps().indexOf(s.oCoreApi.getActiveStep());if(k!==0){var n=k-1;var l=s.oUiApi.getAnalysisPath().getCarousel().dndBox.swapBlocks(k,n);if(l){s.oUiApi.getAnalysisPath().getCarousel().getController().moveStep(k,n);}}}});this.down=new sap.m.Button({id:this.createId("idMoveStepDownButton"),icon:"sap-icon://arrow-bottom",tooltip:this.oCoreApi.getTextNotHtmlEncoded("moveStepDown"),press:function(){var k=s.oCoreApi.getSteps().indexOf(s.oCoreApi.getActiveStep());if(k!==(s.oCoreApi.getSteps().length-1)){var n=k+1;var l=s.oUiApi.getAnalysisPath().getCarousel().dndBox.swapBlocks(k,n);if(l){s.oUiApi.getAnalysisPath().getCarousel().getController().moveStep(k,n);}}}});this.oCarousel=new sap.m.ScrollContainer({content:this.oHtml,height:g,horizontal:false,vertical:true}).addStyleClass("scrollContainerEle");return this.oCarousel;},getControllerName:function(){return"sap.apf.ui.reuse.controller.carousel";},createContent:function(c){var a=this.carouselContent(c);return a;},getStepView:function(s){return this.stepViews[s];}});}());