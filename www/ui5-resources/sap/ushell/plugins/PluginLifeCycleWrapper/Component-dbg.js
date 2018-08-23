// define a root UIComponent which exposes the main view
/*global jQuery, sap */
sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/model/json/JSONModel", "sap/ushell/components/LifeCycleWrapper"], function (UIComponent, JSONModel, LifeCycleWrapper) {
    "use strict";

    // new Component
    return UIComponent.extend("sap.ushell.plugins.PluginLifeCycleWrapper.Component", {

        oMainView : null,
        oCrossApplicationNavigationDeferred: new jQuery.Deferred(),
        oURLParsingDeferred: new jQuery.Deferred(),

        metadata : {
            "manifest": "json"
        },

        initModel: function () {
            var that = this; // eslint-disable-line no-unused-vars
            var oSOModel = new JSONModel(); // eslint-disable-line no-unused-vars
        },

        createContent : function () {
            this.initModel();

            //oModel = new sap.ui.model.json.JSONModel();
            /* *StartupParameters* (2)   */
            /* http://localhost:8080/ushell/test-resources/sap/ushell/shells/sandbox/fioriSandbox.html#Action-toPluginLifeCycleWrapper?AAA=BBB&DEF=HIJ */
            /* results in   { AAA : [ "BBB"], DEF: ["HIJ"] }  */
//            LifeCycleWrapper.init(this.getComponentData().config);
            var oConfig = this.getComponentData().config;
            var xxxx = LifeCycleWrapper.createLifeCycleWrapperShell(oConfig); // eslint-disable-line no-unused-vars

        },

        exit : function () {
            jQuery.sap.log.error("sap.ushell.plugins.PluginLifeCycleWrapper.Component: Component.js exit called : this.getId():" + this.getId());
            this.oMainView = null;
        }
    });
});