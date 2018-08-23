sap.ui.define(["sap/ovp/cards/generic/Card.controller","jquery.sap.global","sap/ovp/cards/LoadingUtils","sap/ovp/cards/loading/State"],function(C,q,L,a){"use strict";return C.extend("sap.ovp.cards.loading.Loading",{onInit:function(){C.prototype.onInit.apply(this,arguments);},onAfterRendering:function(){C.prototype.onAfterRendering.apply(this,arguments);var v=this.getView();v.addStyleClass("sapOvpLoadingCard");var s=this.getCardPropertiesModel().getProperty("/state");var t=this;if(L.bPageAndCardLoading){if(s!==a.ERROR){var c=v.byId("sapOvpLoadingCanvas").getDomRef();var p=c.parentNode;p.style.width='100%';p.style.position='absolute';p.style.top='0px';var d=v.byId("ovpCardContentContainer").getDomRef();d.style.position='absolute';d.style.zIndex='-3';L.aCanvas.push(c);setTimeout(function(){},6000);setTimeout(function(){L.bAnimationStop=true;t.setErrorState();},9000);}setTimeout(function(){if(!L.bAnimationStarted){L.startAnimation();L.bAnimationStarted=true;}},0);}else{var l=v.byId("ovpLoadingFooter");if(s===a.ERROR){l.setText(sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("cannotLoadCard"));}else{setTimeout(function(){l.setBusy(true);},6000);setTimeout(function(){l.setBusy(false);l.setText(sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("cannotLoadCard"));},9000);}}}});});