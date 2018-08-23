// Copyright (c) 2009-2017 SAP SE, All Rights Reserved
sap.ui.define(['sap/ushell/utils','sap/ushell/System','sap/ushell/Ui5ServiceFactory','sap/ui/core/service/ServiceFactoryRegistry','sap/ui/core/Control'],function(u,S,U,a,C){"use strict";var b="sap.ushell.services.Container",c="sap.ushell.Container.dirtyState.",o,p,f;function d(){close();}function r(){document.location="about:blank";}function g(P){if(p&&p[P]){return p[P];}return"sap.ushell.adapters."+P;}function h(s){return(o.services&&o.services[s])||{};}function j(n,s,P,A){var e=h(n).adapter||{},i=e.module||g(s.getPlatform())+"."+n+"Adapter";function m(){return new(jQuery.sap.getObject(i))(s,P,{config:e.config||{}});}if(A){return new Promise(function(q,t){var M=i.replace(/\./g,'/');sap.ui.require([M],function(){try{q(m());}catch(v){t(v);}});});}else{jQuery.sap.require(i);return m();}}function k(A){var E=new sap.ui.base.EventProvider(),m=false,R=[],n={},s="sap.ushell.Container."+A.getSystem().getPlatform()+".remoteSystem.",q={},G,t,L=u.getLocalStorage(),v=new u.Map(),w="sap.ushell.Container."+A.getSystem().getPlatform()+".sessionTermination",x=this;this.cancelLogon=function(){if(this.oFrameLogonManager){this.oFrameLogonManager.cancelXHRLogon();}};this.createRenderer=function(e,i){var B,D,F;jQuery.sap.measure.start("FLP:Container.InitLoading","Initial Loading","FLP");u.setPerformanceMark("FLP - renderer created");e=e||o.defaultRenderer;if(!e){throw new Error("Missing renderer name");}F=(o.renderers&&o.renderers[e])||{};D=F.module||(e.indexOf(".")<0?"sap.ushell.renderers."+e+".Renderer":e);if(F.componentData&&F.componentData.config){B={config:F.componentData.config};}function H(){var I=new(jQuery.sap.getObject(D))({componentData:B});var J;if(D==="sap.ushell.renderers.fiori2.Renderer"){J=I.getRootControl();}if(!J){J=I instanceof sap.ui.core.UIComponent?new sap.ui.core.ComponentContainer({component:I,height:"100%",width:"100%"}):I;}if(!(J instanceof sap.ui.core.Control)){throw new Error("Unsupported renderer type for name "+e);}J.placeAt=function(K,P){var M=K,N="canvas",O=document.body;if(K===O.id){M=document.createElement("div");M.setAttribute("id",N);M.classList.add("sapUShellFullHeight");switch(P){case"first":if(O.firstChild){O.insertBefore(M,O.firstChild);break;}case"only":O.innerHTML='';default:O.appendChild(M);}K=N;P='';}C.prototype.placeAt.call(this,K,P);};n[e]=I;E.fireEvent("rendererCreated",{renderer:I});return J;}if(i){return new Promise(function(I,J){var M=D.replace(/\./g,'/');sap.ui.require([M],function(){try{I(H());}catch(K){J(K);}});});}else{jQuery.sap.require(D);return H();}};this.getRenderer=function(e){var i,B;e=e||o.defaultRenderer;if(e){i=n[e];}else{B=Object.keys(n);if(B.length===1){i=n[B[0]];}else{jQuery.sap.log.warning("getRenderer() - cannot determine renderer, because no default renderer is configured and multiple instances exist.",undefined,b);}}if(i instanceof sap.ui.core.ComponentContainer){return i.getComponentInstance();}return i;};this.DirtyState={CLEAN:"CLEAN",DIRTY:"DIRTY",MAYBE_DIRTY:"MAYBE_DIRTY",PENDING:"PENDING",INITIAL:"INITIAL"};this.getGlobalDirty=function(){var i,D=new jQuery.Deferred(),B=jQuery.sap.uid(),F,P=0,H=this.DirtyState.CLEAN;function I(){if(P===0||H===x.DirtyState.DIRTY){D.resolve(H);jQuery.sap.log.debug("getGlobalDirty() Resolving: "+H,null,"sap.ushell.Container");}}function J(K){if(K.key.indexOf(c)===0&&K.newValue!==x.DirtyState.INITIAL&&K.newValue!==x.DirtyState.PENDING){jQuery.sap.log.debug("getGlobalDirty() Receiving event key: "+K.key+" value: "+K.newValue,null,"sap.ushell.Container");if(K.newValue===x.DirtyState.DIRTY||K.newValue===x.DirtyState.MAYBE_DIRTY){H=K.newValue;}P-=1;I();}}try{L.setItem(B,"CHECK");L.removeItem(B);}catch(e){jQuery.sap.log.warning("Error calling localStorage.setItem(): "+e,null,"sap.ushell.Container");return D.resolve(this.DirtyState.MAYBE_DIRTY).promise();}if(G){throw new Error("getGlobalDirty already called!");}G=D;window.addEventListener('storage',J);D.always(function(){window.removeEventListener('storage',J);G=undefined;});for(i=L.length-1;i>=0;i-=1){F=L.key(i);if(F.indexOf(c)===0){if(L.getItem(F)==='PENDING'){L.removeItem(F);jQuery.sap.log.debug("getGlobalDirty() Cleanup of unresolved 'PENDINGS':"+F,null,"sap.ushell.Container");}else{P+=1;u.localStorageSetItem(F,this.DirtyState.PENDING,true);jQuery.sap.log.debug("getGlobalDirty() Requesting status for: "+F,null,"sap.ushell.Container");}}}I();setTimeout(function(){if(D.state()!=="resolved"){D.resolve('MAYBE_DIRTY');jQuery.sap.log.debug("getGlobalDirty() Timeout reached, - resolved 'MAYBE_DIRTY'",null,"sap.ushell.Container");}},P*2000);return D.promise();};this.getLogonSystem=function(){return A.getSystem();};this.getUser=function(){return A.getUser();};this.getDirtyFlag=function(){for(var i=0;i<R.length;i++){m=m||R[i].call();}return m;};this.setDirtyFlag=function(i){m=i;};this.sessionKeepAlive=function(){if(A.sessionKeepAlive){A.sessionKeepAlive();}};this.registerDirtyStateProvider=function(D){if(typeof D!=="function"){throw new Error("fnDirty must be a function");}R.push(D);};this.getService=function(e,P,i){var B={},M,K,D,F,H,I;function J(Q){var T=new jQuery.Deferred();if(!Q){throw new Error("Missing system");}T.resolve(j(e,Q,P));sap.ushell.Container.addRemoteSystem(Q);return T.promise();}if(!e){throw new Error("Missing service name");}if(e.indexOf(".")>=0){throw new Error("Unsupported service name");}H=h(e);M=H.module||"sap.ushell.services."+e;K=M+"/"+(P||"");I={config:H.config||{}};function N(Q,F){B.createAdapter=J;return new Q(F,B,P,I);}function O(D,i){var Q;if(D.hasNoAdapter){Q=new D(B,P,I);}else{F=j(e,A.getSystem(),P,i);if(i){return F.then(function(T){var Q=N(D,T);v.put(K,Q);return Q;});}else{Q=N(D,F);}}v.put(K,Q);return i?Promise.resolve(Q):Q;}if(!v.containsKey(K)){if(i){return new Promise(function(Q){sap.ui.require([M.replace(/[.]/g,"/")],function(T){Q(O(T,true));});});}else{D=sap.ui.requireSync(M.replace(/[.]/g,"/"));return O(D);}}if(i){return Promise.resolve(v.get(K));}else{return v.get(K);}};this.getServiceAsync=function(e,P){return Promise.resolve(this.getService(e,P,true));};function y(){var B,D,i,K;for(i=L.length-1;i>=0;i-=1){K=L.key(i);if(K.indexOf(s)===0){try{B=K.substring(s.length);D=JSON.parse(L.getItem(K));q[B]=new S(D);}catch(e){L.removeItem(K);}}}return q;}function z(){if(typeof OData==='undefined'){return;}function e(i,B,F){jQuery.sap.log.warning(i,null,"sap.ushell.Container");if(F){setTimeout(F.bind(null,i),5000);}return{abort:function(){return;}};}OData.read=function(i,B,F){return e("OData.read('"+(i&&i.Uri?i.requestUri:i)+"') disabled during logout processing",B,F);};OData.request=function(i,B,F){return e("OData.request('"+(i?i.requestUri:"")+"') disabled during logout processing",B,F);};}this.addRemoteSystem=function(e){var i=e.getAlias(),O=q[i];if(O){if(O.toString()===e.toString()){return;}jQuery.sap.log.warning("Replacing "+O+" by "+e,null,"sap.ushell.Container");}else{jQuery.sap.log.debug("Added "+e,null,"sap.ushell.Container");}q[i]=e;u.localStorageSetItem(s+i,e);};this.addRemoteSystemForServiceUrl=function(e){var M,i={baseUrl:";o="};if(!e||e.charAt(0)!=='/'||e.indexOf('//')===0){return;}M=/^[^?]*;o=([^\/;?]*)/.exec(e);if(M&&M.length>=2){i.alias=M[1];}e=e.replace(/;[^\/?]*/g,"");if(/^\/sap\/(bi|hana|hba)\//.test(e)){i.platform="hana";i.alias=i.alias||"hana";}else if(/^\/sap\/opu\//.test(e)){i.platform="abap";}if(i.alias&&i.platform){this.addRemoteSystem(new S(i));}};this.attachLogoutEvent=function(F){E.attachEvent("Logout",F);};this.detachLogoutEvent=function(F){E.detachEvent("Logout",F);};this.attachRendererCreatedEvent=function(F){E.attachEvent("rendererCreated",F);};this.detachRendererCreatedEvent=function(F){E.detachEvent("rendererCreated",F);};this.logout=function(){var D=new jQuery.Deferred();function i(){A.logout(true).always(function(){L.removeItem(w);D.resolve();});}function B(){if(E.fireEvent("Logout",true)){i();}else{setTimeout(i,1000);}}function F(){var q,H=[];if(t){window.removeEventListener('storage',t);}u.localStorageSetItem(w,"pending");x._suppressOData();q=x._getRemoteSystems();Object.keys(q).forEach(function(I){try{H.push(j("Container",q[I]).logout(false));}catch(e){jQuery.sap.log.warning("Could not create adapter for "+I,e.toString(),"sap.ushell.Container");}L.removeItem(s+I);});jQuery.when.apply(jQuery,H).done(B);}if(typeof A.addFurtherRemoteSystems==='function'){A.addFurtherRemoteSystems().always(F);}else{F();}return D.promise();};this.setLogonFrameProvider=function(e){if(this.oFrameLogonManager){this.oFrameLogonManager.setLogonFrameProvider(e);}};this.setXhrLogonTimeout=function(P,T){if(this.oFrameLogonManager){this.oFrameLogonManager.setTimeout(P,T);}};this.getFLPUrl=function(){var e=u.getLocationHref(),H=e.indexOf(this.getService("URLParsing").getShellHash(e));if(H===-1){return e;}return e.substr(0,H-1);};this._closeWindow=d;this._redirectWindow=r;this._getRemoteSystems=y;this._suppressOData=z;sap.ui.getCore().getEventBus().subscribe("sap.ushell.Container","addRemoteSystemForServiceUrl",function(e,i,D){x.addRemoteSystemForServiceUrl(D);});if(typeof A.logoutRedirect==='function'){t=function(e){function i(){x._closeWindow();x._redirectWindow();}if(sap.ushell.Container!==x){return;}if(e.key.indexOf(s)===0&&e.newValue&&e.newValue!==L.getItem(e.key)){u.localStorageSetItem(e.key,e.newValue);}if(e.key===w){if(e.newValue==="pending"){x._suppressOData();if(E.fireEvent("Logout",true)){i();}else{setTimeout(i,1000);}}}};window.addEventListener('storage',t);}this._getFunctionsForUnitTest=function(){return{createAdapter:j};};}function l(s){s.forEach(function(e){var i=U.createServiceFactory(e);a.register("sap.ushell.ui5service."+e,i);});}sap.ushell.bootstrap=function(P,A){var e,E;jQuery.sap.initMobile();if(sap.ushell.Container!==undefined){E=new Error("Unified shell container is already initialized - cannot initialize twice.\nStacktrace of first initialization:"+f);jQuery.sap.log.error(E,E.stack,b);throw E;}sap.ushell.Container=null;f=(new Error()).stack;o=jQuery.extend({},true,window["sap-ushell-config"]||{});p=A;if(typeof window["sap.ushell.bootstrap.callback"]==="function"){setTimeout(window["sap.ushell.bootstrap.callback"]);}if(o.modulePaths){Object.keys(o.modulePaths).forEach(function(m){jQuery.sap.registerModulePath(m,o.modulePaths[m]);});}e=j("Container",new S({alias:"",platform:o.platform||P}));l(["Personalization","URLParsing","CrossApplicationNavigation"]);return e.load().then(function(){var i,m,n;var D,L;sap.ushell.Container=new k(e);m=sap.ushell.Container;L=(function(){var q,s;var t=window["sap-ushell-config"];if(!t||!t.services){return false;}q=t.services.PluginManager;s=q&&q.config;return s&&s.loadPluginsFromSite;})();if(L){i=m.getService("CommonDataModel");D=i.getPlugins();}else{D=jQuery.when({});}return D.then(function(q){var s=jQuery.extend(true,{},o.bootstrapPlugins,q);n=m.getService("PluginManager");n.registerPlugins(s);});});};});