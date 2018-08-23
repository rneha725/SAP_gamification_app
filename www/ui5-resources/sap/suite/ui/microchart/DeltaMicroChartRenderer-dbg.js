/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2018 SAP SE. All rights reserved
 */

sap.ui.define([ 'jquery.sap.global', './library'],
	function(jQuery, library) {
	"use strict";

	/**
	 * DeltaMicroChart renderer.
	 * @namespace
	 */
	var DeltaMicroChartRenderer = {};

	/**
	 * Renders the HTML for the given control, using the provided
	 * {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the Render-Output-Buffer
	 * @param {sap.ui.core.Control} oControl The control to be rendered
	 */
	DeltaMicroChartRenderer.render = function(oRm, oControl) {
		function getDir(bLeft) {
			return bLeft ? "sapSuiteDMCDirectionLeft" : "sapSuiteDMCDirectionRight";
		}

		if (oControl._hasData()) {
			if (!oControl._bThemeApplied) {
				return;
			}
			var sDv1 = oControl.getDisplayValue1();
			var sDv2 = oControl.getDisplayValue2();
			var fVal1 = oControl.getValue1();
			var fVal2 = oControl.getValue2();
			var sDdv = oControl.getDeltaDisplayValue();
			var sAdv1ToShow = sDv1 ? sDv1 : "" + fVal1;
			var sAdv2ToShow = sDv2 ? sDv2 : "" + fVal2;
			var sAddvToShow = sDdv ? sDdv : "" + Math.abs(fVal1 - fVal2).toFixed(Math.max(oControl._digitsAfterDecimalPoint(fVal1), oControl._digitsAfterDecimalPoint(fVal2)));
			var sColor = "sapSuiteDMCSemanticColor" + oControl.getColor();

			var sSize;
			if (oControl.getIsResponsive()) {
				sSize = "sapSuiteDMCResponsive";
			} else {
				sSize = "sapSuiteDMCSize" + oControl.getSize();
			}

			var bNoTitles = (!oControl.getTitle1() && !oControl.getTitle2());

			oRm.write("<div");
			this._writeMainProperties(oRm, oControl);

			oRm.writeClasses();
			oRm.writeStyles();

			oRm.write(">");

			oRm.write("<div");
			oRm.addClass("sapSuiteDMCVerticalAlignmentContainer");
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("<div");
			oRm.addClass("sapSuiteDMCCnt");
			oRm.addClass(sSize);
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("<div");
			oRm.writeAttribute("id", oControl.getId() + "-title1");
			oRm.addClass("sapSuiteDMCTitle");
			oRm.addClass("sapSuiteDMCPositionTop");
			oRm.writeClasses();
			oRm.write(">");
			oRm.writeEscaped(oControl.getTitle1());
			oRm.write("</div>");

			oRm.write("<div");
			oRm.addClass("sapSuiteDMCChart");
			oRm.addClass(sSize);
			if (bNoTitles){
				oRm.addClass("sapSuiteDMCNoTitles");
			}
			oRm.writeClasses();
			oRm.writeAttribute("id", oControl.getId() + "-dmc-chart");
			oRm.write(">");
			oRm.write("<div");
			oRm.addClass("sapSuiteDMCBar");
			oRm.addClass("sapSuiteDMCBar1");
			oRm.addClass(sSize);
			if (oControl._oChartData.delta.isMax) {
				oRm.addClass("sapSuiteDMCBarDeltaMaxDelta");
			}
			if (oControl._oChartData.bar1.isSmaller) {
				oRm.addClass("sapSuiteDMCBarSizeSmaller");
			}
			if (parseFloat(oControl._oChartData.bar1.width) === 0) {
				oRm.addClass("sapSuiteDMCBarZeroWidth");
			} else if (parseFloat(oControl._oChartData.bar2.width) === 0) {
				oRm.addClass("sapSuiteDMCBarUniqueNonzero");
			}
			oRm.addClass(jQuery.sap.encodeHTML(getDir(oControl._oChartData.bar1.left)));
			oRm.writeClasses();
			oRm.addStyle("width", jQuery.sap.encodeHTML(oControl._oChartData.bar1.width + "%"));
			oRm.writeStyles();
			oRm.writeAttribute("id", oControl.getId() + "-dmc-bar1");
			oRm.write(">");
			oRm.write("<div");
			oRm.addClass("sapSuiteDMCBarInternal");
			oRm.addClass(jQuery.sap.encodeHTML(getDir(oControl._oChartData.bar2.left)));
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("</div>");
			oRm.write("</div>");

			oRm.write("<div");
			oRm.addClass("sapSuiteDMCBar");
			oRm.addClass("sapSuiteDMCBar2");
			oRm.addClass(sSize);
			if (oControl._oChartData.delta.isMax) {
				oRm.addClass("sapSuiteDMCBarDeltaMaxDelta");
			}
			if (oControl._oChartData.bar2.isSmaller) {
				oRm.addClass("sapSuiteDMCBarSizeSmaller");
			}
			if (parseFloat(oControl._oChartData.bar2.width) === 0) {
				oRm.addClass("sapSuiteDMCBarZeroWidth");
			} else if (parseFloat(oControl._oChartData.bar1.width) === 0) {
				oRm.addClass("sapSuiteDMCBarUniqueNonzero");
			}
			oRm.addClass(jQuery.sap.encodeHTML(getDir(oControl._oChartData.bar2.left)));
			oRm.writeClasses();
			oRm.addStyle("width", jQuery.sap.encodeHTML(oControl._oChartData.bar2.width + "%"));
			oRm.writeStyles();
			oRm.writeAttribute("id", oControl.getId() + "-dmc-bar2");
			oRm.write(">");
			oRm.write("<div");
			oRm.addClass("sapSuiteDMCBarInternal");
			oRm.addClass(jQuery.sap.encodeHTML(getDir(oControl._oChartData.bar1.left)));
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("</div>");
			oRm.write("</div>");

			oRm.write("<div");
			oRm.addClass("sapSuiteDMCBar");
			oRm.addClass("sapSuiteDMCBarDelta");
			oRm.addClass(sSize);
			if (!oControl._oChartData.delta.isMax) {
				oRm.addClass("sapSuiteDMCBarDeltaNotMax");
			}
			if (oControl._oChartData.delta.isZero) {
				oRm.addClass("sapSuiteDMCBarDeltaZero");
			}
			if (oControl._oChartData.delta.isEqual) {
				oRm.addClass("sapSuiteDMCBarDeltaEqual");
			}
			oRm.addClass(jQuery.sap.encodeHTML(getDir(oControl._oChartData.delta.left)));
			oRm.writeClasses();
			oRm.addStyle("width", jQuery.sap.encodeHTML(oControl._oChartData.delta.width + "%"));
			oRm.writeStyles();
			oRm.writeAttribute("id", oControl.getId() + "-dmc-bar-delta");
			oRm.write(">");
			oRm.write("<div");
			oRm.addClass(sColor);
			oRm.addClass("sapSuiteDMCBarDeltaInt");
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("</div>");

			oRm.write("<div");
			oRm.addClass("sapSuiteDMCBarDeltaStripe");
			oRm.addClass(jQuery.sap.encodeHTML(getDir(true)));
			if (oControl._oChartData.delta.isEqual) {
				oRm.addClass("sapSuiteDMCBarDeltaEqual");
			}
			oRm.addClass("sapSuiteDMCBarDeltaFirstStripe" + (oControl._oChartData.delta.isFirstStripeUp ? "Up" : "Down"));
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("</div>");

			oRm.write("<div");
			oRm.addClass("sapSuiteDMCBarDeltaStripe");
			oRm.addClass(jQuery.sap.encodeHTML(getDir(false)));
			oRm.addClass("sapSuiteDMCBarDeltaFirstStripe" + (oControl._oChartData.delta.isFirstStripeUp ? "Down" : "Up"));
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("</div>");
			oRm.write("</div>");

			oRm.write("</div>");

			oRm.write("<div");
			oRm.writeAttribute("id", oControl.getId() + "-title2");
			oRm.addClass("sapSuiteDMCTitle");
			oRm.addClass("sapSuiteDMCPositionBtm");
			oRm.writeClasses();
			oRm.write(">");
			oRm.writeEscaped(oControl.getTitle2());
			oRm.write("</div>");
			oRm.write("</div>");

			oRm.write("<div");
			oRm.addClass("sapSuiteDMCLbls");
			oRm.addClass(sSize);
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("<div");
			oRm.writeAttribute("id", oControl.getId() + "-value1");
			oRm.addClass("sapSuiteDMCValue1");
			oRm.writeClasses();
			oRm.write(">");
			oRm.writeEscaped(sAdv1ToShow);
			oRm.write("</div>");

			oRm.write("<div");
			oRm.writeAttribute("id", oControl.getId() + "-delta");
			oRm.addClass("sapSuiteDMCDelta");
			oRm.addClass(sColor);
			oRm.writeClasses();
			oRm.write(">");
			oRm.writeEscaped(sAddvToShow);
			oRm.write("</div>");

			oRm.write("<div");
			oRm.writeAttribute("id", oControl.getId() + "-value2");
			oRm.addClass("sapSuiteDMCValue2");
			oRm.writeClasses();
			oRm.write(">");
			oRm.writeEscaped(sAdv2ToShow);
			oRm.write("</div>");
			oRm.write("</div>");

			oRm.write("<div");
			oRm.writeAttribute("id", oControl.getId() + "-calc");
			oRm.addClass("sapSuiteDMCCalc");
			oRm.writeClasses();
			oRm.write(">");
			oRm.write("<div");
			oRm.writeAttribute("id", oControl.getId() + "-calc1");
			oRm.addClass("sapSuiteDMCCalc1");
			oRm.writeClasses();
			oRm.write("></div>");
			oRm.write("<div");
			oRm.writeAttribute("id", oControl.getId() + "-calc2");
			oRm.addClass("sapSuiteDMCCalc2");
			oRm.writeClasses();
			oRm.write("></div>");
			oRm.write("</div>");
			oRm.write("</div>");
			oRm.write("</div>");
		} else {
			oRm.write("<div");
			this._writeMainProperties(oRm, oControl);
			oRm.writeClasses();
			oRm.write(">");

			library._renderNoData(oRm);

			oRm.write("</div>");
		}
	};

		/**
		 * Renders control data and prepares default classes and styles
		 *
		 * @param {object} oRm render manager
		 * @param {object} oControl AreaMicroChart control
		 * @private
		 */
		DeltaMicroChartRenderer._writeMainProperties = function(oRm, oControl) {
			var bIsActive = oControl.hasListeners("press");

			library._renderActiveProperties(oRm, oControl);

			var sAriaLabel = oControl.getAltText(bIsActive);
			oRm.writeAttribute("role", "img");
			oRm.writeAttributeEscaped("aria-label", sAriaLabel);

			oRm.writeControlData(oControl);
			oRm.addClass("sapSuiteDMC");
			oRm.addClass(oControl.getIsResponsive() ? "sapSuiteDMCResponsive" : "sapSuiteDMCSize" + oControl.getSize());
		};

	return DeltaMicroChartRenderer;

}, /* bExport= */ true);
