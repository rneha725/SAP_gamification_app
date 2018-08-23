sap.ui.define([
	"./AbstractKnowlegdeBase", "sap/ui/mdc/experimental/provider/BaseControlProvider", "./Utils"
], function(AbstractKnowlegdeBase, BaseControlProvider, Utils) {
	"use strict";

	var DefaultProvider = BaseControlProvider.extend("sap.ui.mdc.experimental.provider.control.DefaultProvider", {
		driveWithMetadata: function(oControl, oAdapter) {
			var sClassName = oControl.getMetadata()._sClassName;
			var sContext = oAdapter.getContext();

			this.provideProperty(oControl, "visible", oAdapter.visible, "oAdapter.visible");
			this.provideProperty(oControl, "tooltip", oAdapter.tooltip, "oAdapter.tooltip");

			switch (sClassName) {
				case "sap.m.CheckBox":
					this.provideProperty(oControl, "enabled", oAdapter.enabled, "oAdapter.enabled");
					this.provideProperty(oControl, "editable", oAdapter.enabled, "oAdapter.enabled");
					this.provideProperty(oControl, "selected", oAdapter.value, "oAdapter.value");
					this.provideProperty(oControl, "text", oAdapter.label, "Adapter.label");
					break;
				case "sap.m.ComboBox":
				case "sap.m.Select":
					if (sContext == 'selected') {
						this._provideInputBase(oControl, oAdapter);
						this.provideProperty(oControl, "selectedKey", oAdapter.value, "oAdapter.value");
					} else if (sContext == 'selection') {
						var oKeys = oAdapter.keys;

						// take the first key
						var sKey = Object.keys(oKeys)[0];

						var oKeyAdapter = oKeys[sKey];
						var that = this;

						sap.ui.require([
							"sap/ui/core/Item"
						], function(Item) {

							var oItemTemplate = new Item({
								key: oKeyAdapter.value,
								text: oKeyAdapter.describedBy.value
							});

							that.provideAggregation(oControl, "items", oAdapter.collection, oItemTemplate, true);
						});
					}
					break;
				case "sap.m.DatePicker":
					this._provideInputBase(oControl, oAdapter);
					break;
				case "sap.m.Image":
					this.provideProperty(oControl, "src", oAdapter.value, "oAdapter.value");
					break;
				case "sap.m.InputBase":
					this._provideInputBase(oControl, oAdapter);
					break;
				case "sap.m.Input":
					this._provideInputBase(oControl, oAdapter);

					var type = this.convertToInputType(oAdapter);

					this.provideProperty(oControl, "type", type, "");
					this.provideProperty(oControl, "maxLength", oAdapter.maxLength, "oAdapter.maxLength");
					break;
				case "sap.m.Label":
					this.provideProperty(oControl, "text", oAdapter.label);
					break;
				case "sap.m.Link":
					// TODO: clarify if enabled should depend from property enabled....
					this.provideProperty(oControl, "enabled", oAdapter.enabled, "oAdapter.enabled");

					if (sContext == 'text') {
						this.provideProperty(oControl, "text", oAdapter.value, "oAdapter.value");
					} else if (sContext == 'href') {
						this.provideProperty(oControl, "href", oAdapter.value, "oAdapter.value");
					}
					break;
				case "sap.ui.mdc.base.FilterField":
					this.provideProperty(oControl, "required", oAdapter.required);
					this.provideProperty(oControl, "type", oAdapter.type);
					this.provideProperty(oControl, "fieldPath", oAdapter.path);
					this.provideAggregation(oControl, "conditions", oAdapter.conditions);
					this.providePrepareCloneFunction(oControl, "suggestion", oAdapter.suggestion.bind(oAdapter));
					break;
				case "sap.m.ObjectIdentifier":
					if (!sContext || sContext == 'title') {
						this.provideProperty(oControl, "title", oAdapter.value, "oAdapter.value");
						this.provideProperty(oControl, "titleActive", oAdapter.enabled, "oAdapter.enabled");
					} else if (sContext == 'text') {
						this.provideProperty(oControl, "text", oAdapter.value, "oAdapter.value");
					}
					// <- What to do here
					break;

				case "sap.m.ObjectNumber":
					this.provideProperty(oControl, "number", oAdapter.value, "oAdapter.value");
					this.provideProperty(oControl, "unit", oAdapter.unit, "oAdapter.unit");

					// TODO: make unit working, ValueState....
					break;

				case "sap.m.ObjectStatus":
					if (!sContext || sContext == 'text') {
						this.provideProperty(oControl, "text", oAdapter.value, "oAdapter.value");
					} else if (sContext == 'title') {
						this.provideProperty(oControl, "title", oAdapter.value, "oAdapter.value");
					}

					// TODO: make unit working, ValueState....
					break;

				case "sap.m.ProgressIndicator":
					this.provideProperty(oControl, "enabled", oAdapter.enabled, "oAdapter.enabled");
					this.provideProperty(oControl, "percentValue", oAdapter.value, "oAdapter.value");
					break;

				case "sap.m.RatingIndicator":
					this.provideProperty(oControl, "enabled", oAdapter.enabled, "oAdapter.enabled");
					this.provideProperty(oControl, "value", oAdapter.value, "oAdapter.value");
					// TODO: maxValue....
					break;
				case "sap.m.Slider":
					this.provideProperty(oControl, "enabled", oAdapter.enabled, "oAdapter.enabled");
					this.provideProperty(oControl, "value", oAdapter.value, "oAdapter.value");
					// TODO: min, max....
					break;
				case "sap.m.Text":
				case "sap.m.Title":
					this.provideProperty(oControl, "text", oAdapter.value, "oAdapter.value");
					break;
				case "sap.m.TextArea":
					this._provideInputBase(oControl, oAdapter);
					break;
			}
		},
		renderWithMetadata: function(oNode, oContextCallback, oAdapter) {
			var sClassName = Utils.className(oNode);

			var sId = oNode.getAttribute("id");
			oNode.removeAttribute("id");
			oNode.setAttribute("id", oAdapter.key + "---" + sId);

			var sLabelFor = oNode.getAttribute("labelFor");

			if (sLabelFor) {
				oNode.setAttribute("labelFor", oAdapter.key + "---" + sLabelFor);
			}

			switch (sClassName) {
				case "sap.m.Label":
					this.provideAttribute(oNode, "text", oAdapter.label);
					break;
				case "sap.ui.mdc.base.FilterField":
					this.provideAttribute(oNode, "required", oAdapter.required);
					this.provideAttribute(oNode, "type", oAdapter.type);
					this.provideAttribute(oNode, "fieldPath", oAdapter.path);
					break;
			}
		},
		_provideInputBase: function(oControl, oAdapter) {
			this.provideProperty(oControl, "value", oAdapter.value, "oAdapter.value");
			this.provideProperty(oControl, "editable", oAdapter.enabled, "oAdapter.enabled");
			this.provideProperty(oControl, "required", oAdapter.required, "oAdapter.required");

			var aLabels = oControl.getLabels();

			for (var i = 0; i < aLabels.length; i++) {
				if (this.canControlBeProvided(aLabels[i], oControl)) {
					this.getProvider(aLabels[i]).driveWithMetadata(aLabels[i], oAdapter);
				}
			}
		}
	});

	return DefaultProvider;
});
