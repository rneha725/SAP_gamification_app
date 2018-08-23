sap.ui.define([
	"sap/ui/core/Control",
	"sap/suite/ui/generic/template/AnalyticalListPage/controller/KpiTagController"
], function(Control, KpiTagController) {
	"use strict";

	return Control.extend("sap.suite.ui.generic.template.AnalyticalListPage.control.KpiTag", {
		metadata: {
			properties: {
				value: {
					type: "string",
					defaultValue: "",
					bindable: "bindable"
				},
				shortDescription : {
					type: "string",
					defaultValue : "",
					bindable: "bindable"
				},
				unit: {
					type: "string",
					defaultValue: "",
					bindable: "bindable"
				},
				indicator: {
					type: "sap.m.ValueColor",
					defaultValue: undefined
				},
				enabled: {
					type : "boolean",
					defaultValue : true,
					bindable: false
				},
				error: {
					type : "boolean",
					defaultValue : false,
					bindable: false
				},
				errorMessage: {
					type: "string",
					defaultValue: "",
					bindable: "bindable"
				}

			},
			events: {
				press: {}
			}
		},
		renderer: {
			render: function(oRM, oControl) {
				oRM.write("<div");
				if (oControl.getProperty("enabled")) {
					oRM.writeAttributeEscaped("tabIndex", 0);
				} else {
					oRM.writeAttributeEscaped("tabIndex", -1);
				}
				oRM.writeControlData(oControl);
				oRM.addClass("sapSmartTemplatesAnalyticalListPageKpiTag sapSmartTemplatesAnalyticalListPageKpiTagCozy sapUiSmallMarginEnd");
				oControl._addColorClasses(oRM);
				oRM.writeClasses();
				oRM.writeAccessibilityState(oControl, {
					label: oControl._getAriaLabelText(oControl._ariaLabel)
				});
				oRM.writeAttributeEscaped("title", oControl.getTooltip());
				oRM.write(">");
				oRM.write("<div");
				oRM.addClass("sapSmartTemplatesAnalyticalListPageKpiTagName");
				oRM.writeClasses();
				oRM.write(">");
				oRM.writeEscaped(oControl.getShortDescription());
				oRM.write("</div>");
				if (oControl.getProperty("error")) {
					oRM.write("<div");
					oRM.addClass("sapSmartTemplatesAnalyticalListPageKPIErrorIcon");
					oRM.writeClasses();
					oRM.write(">");
					oRM.writeIcon("sap-icon://message-error");
				} else {
					oRM.write("<div");
					oRM.addClass("sapSmartTemplatesAnalyticalListPageKpiTagValue");
					oRM.writeClasses();
					oRM.write(">");
					oRM.writeEscaped(oControl.getValue() + (oControl.getUnit() && oControl.getUnit() !== " " ? " " + oControl.getUnit() : ""));
				}
				oRM.write("</div>");
				oRM.write("</div>");
			}
		},
		setEnabled: function(bValue) {
			this.setProperty("enabled", bValue, true);
			if (bValue) {
				this.removeStyleClass("sapSmartTemplatesAnalyticalListPageKpiTagDisable");
			} else {
				this.addStyleClass("sapSmartTemplatesAnalyticalListPageKpiTagDisable");
			}
		},
		_getAriaLabelText: function(kpitooltip) {
			var rb = this.getModel("i18n").getResourceBundle();
			return rb.getText("KPI_ARIALABEL_TAG", [kpitooltip]);
		},
		_addColorClasses:  function(rm) {
			switch (this.getIndicator()) {
				case sap.m.ValueColor.Neutral:
				rm.addClass("sapSmartTemplatesAnalyticalListPageKPINeutral");
				break;
				case sap.m.ValueColor.Error:
				rm.addClass("sapSmartTemplatesAnalyticalListPageKPINegative");
				break;
				case sap.m.ValueColor.Good:
				rm.addClass("sapSmartTemplatesAnalyticalListPageKPIPositive");
				break;
				case sap.m.ValueColor.Critical:
				rm.addClass("sapSmartTemplatesAnalyticalListPageKPICritical");
				break;
				default:
				rm.addClass("sapSmartTemplatesAnalyticalListPageKPINeutral");
				//rm.addClass("sapSmartTemplatesAnalyticalListPageKPIUndetermined");
				break;
			}
		}
	});
}, true);
