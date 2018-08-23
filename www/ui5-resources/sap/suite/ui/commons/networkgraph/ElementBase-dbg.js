sap.ui.define([
	"jquery.sap.global",
	"sap/suite/ui/commons/library",
	"./SvgBase",
	"sap/ui/base/ManagedObject",
	"sap/ui/core/theming/Parameters"
], function (jQuery, library, SvgBase, ManagedObject, Parameters) {
	"use strict";

	var Status = library.networkgraph.ElementStatus;

	/**
	 * Constructor for a new ElementBase.
	 *
	 * @class
	 * ElementBase class
	 *
	 * @extends sap.suite.ui.commons.networkgraph.SvgBase
	 *
	 * @constructor
	 * @public
	 * @since 1.50
	 * @abstract
	 * @alias sap.suite.ui.commons.networkgraph.ElementBase
	 */
	var ElementBase = SvgBase.extend("sap.suite.ui.commons.networkgraph.ElementBase", {
		metadata: {
			properties: {
				/**
				 * A title associated with the element.
				 */
				title: {
					type: "string", group: "Misc", defaultValue: null
				},
				/**
				 * Description.
				 */
				description: {
					type: "string", group: "Misc", defaultValue: null
				},
				/**
				 * Status associated with this element. You can use any of the custom statuses defined by the <code>statuses</code>
				 * aggregation in the {@link sap.suite.ui.commons.networkgraph.Graph} or use the default statuses provided
				 * by {@link sap.suite.ui.commons.networkgraph.ElementStatus}.
				 */
				status: {
					type: "string",
					group: "Appearance",
					defaultValue: Status.Standard
				}
			},
			aggregations: {
				/**
				 * Attributes associated with the element.
				 */
				attributes: {
					type: "sap.suite.ui.commons.networkgraph.ElementAttribute",
					multiple: true,
					singularName: "attribute"
				}
			}
		},
		renderer: {}
	});

	/**
	 * Scrolls the view port to show this element
	 *
	 * @public
	 */
	ElementBase.prototype.scrollToElement = function() {
		var oParent = this.getParent();

		if (oParent) {
			oParent._scrollToElement(this);
		}
	};

	ElementBase.prototype._afterRenderingBase = function () {
		var $parent, oSvgElement;
		// due to the fact how render manager works (it parse html via doc. fragment) which doesn't
		// work with SVG elements we have to rerender it properly again in after rendering
		// to get this event triggered we still set some stuff to render manager in render function

		// for some browsers innerHTML is not working(so we have to convert parsed HTML to it's SVG representatives
		// and replace it manually
		if (this._cannotAppendInnerHtml()) {
			$parent = this.$().parent();
			oSvgElement = this._convertToSvg(jQuery.parseHTML(this._render()));

			$parent[0].replaceChild(oSvgElement, this.$()[0]);
		} else {
			this.$()[0].outerHTML = this._render();
		}

		this._afterRendering();
	};

	ElementBase.prototype._setFocus = function (bFocus) {
		var fnName = bFocus ? "addClass" : "removeClass";
		this.$()[fnName](this.FOCUS_CLASS);
	};

	ElementBase.prototype._useInLayout = function () {
		return true;
	};

	ElementBase.prototype._hasFocus = function () {
		return this.$().hasClass(this.FOCUS_CLASS);
	};

	ElementBase.prototype._hasCustomStatus = function (sStatus) {
		var sStatus = sStatus || this.getStatus();
		if (sStatus === Status.Standard || sStatus === Status.Error || sStatus === Status.Warning || sStatus === Status.Success) {
			return false;
		}

		return !!sStatus;
	};

	ElementBase.prototype._getElementId = function (sSuffix) {
		return sSuffix ? this.getId() + sSuffix : this.getId();
	};

	ElementBase.prototype._getColor = function (sType) {
		var sStatus = this.getStatus(),
			oParent = this.getParent(),
			sFnName, oStatus, sColor = "";

		if (!this._hasCustomStatus(sStatus)) {
			return "";
		}

		if (!oParent || !sType) {
			return "";
		}

		oStatus = oParent._oStatuses[sStatus];
		if (oStatus) {
			if (sType.indexOf("Focus") !== -1) {
				if (!oStatus.getUseFocusColorAsContentColor()) {
					return "";
				}

				sType = sType.replace("Focus", "Content");
			}

			sFnName = "get" + sType + "Color";
			if (oStatus[sFnName]) {
				sColor = Parameters.get(oStatus[sFnName]());
			}
		}

		return sColor ? sColor : "";
	};

	ElementBase.prototype._getColorStyle = function (oParameters) {
		var sStyle = "";
		Object.keys(oParameters).forEach(function (sKey) {
			var sColor = this._getColor(oParameters[sKey]);
			if (sColor) {
				if (sStyle) {
					sStyle += ";";
				}
				sStyle += sKey + ":" + sColor;
			}
		}, this);

		return sStyle;
	};

	ElementBase.prototype._checkForProcessData = function () {
		var oParent = this.getParent();
		if (oParent && oParent._bRequiresDataProcessing) {
			oParent._processData();
		}
	};

	/**
	 * Return all visible attributes
	 * @returns {array} return array with attributes with visible flag ON
	 */
	ElementBase.prototype.getVisibleAttributes = function () {
		return this.getAttributes().filter(function (oAttr) {
			return oAttr.getVisible();
		});
	};

	/**
	 * @param {string} sPropertyName Name of the property to set.
	 * @param {object} oValue Value to set the property to.
	 * @param {boolean} bSuppressInvalidate Whether to suppress resulting invalidation
	 */
	ElementBase.prototype.setProperty = function (sPropertyName, oValue, bSuppressInvalidate) {
		var aProcessRequiredProperties = Object.getPrototypeOf(this).aProcessRequiredProperties;

		ManagedObject.prototype.setProperty.call(this, sPropertyName, oValue, bSuppressInvalidate);
		if (aProcessRequiredProperties && (aProcessRequiredProperties.indexOf(sPropertyName) !== -1) && this.getParent()) {
			this.getParent()._bRequiresDataProcessing = true;
		}
	};

	ElementBase.prototype.toString = function () {
		return this.getMetadata()._sClassName + " - " + this.getTitle();
	};

	/* =========================================================== */
	/* Rendering (HTML output)*/
	/* =========================================================== */
	ElementBase.prototype._correctTitle = function (sClass) {
		if (this.getTitle()) {
			var $text = this.$().find("." + sClass);

			if ($text[0]) {
				var iTitleLength = $text[0].getBBox().width,
					iMaxWidth = parseInt($text.attr("maxwidth"), 10);

				if (iTitleLength > iMaxWidth) {
					this._createText($text[0], {
						text: this.getTitle(), // Doesn't need escaping as the text is set using textContent, which is not parsed as HTML.
						hCenter: true
					});
				}
			}
		}
	};

	ElementBase.prototype._renderTitle = function (mArguments) {
		// IE doesn't support dominant-baseline so we have to move it a bit for this browser
		var PSEUDO_HEIGHT = 10;

		var sHtml = this._renderControl("g", {
			"clip-path": "url(#" + this.getId() + "-title-clip)"
		}, false);

		sHtml += this._renderText({
			attributes: {
				"style": mArguments.style,
				"class": mArguments.class,
				x: mArguments.x,
				y: mArguments.y,
				maxWidth: mArguments.maxWidth
			},
			text: mArguments.title,
			height: PSEUDO_HEIGHT
		});
		sHtml += "</g>";

		return sHtml;
	};

	ElementBase.prototype._renderClipPath = function (mArguments) {
		var sHtml = this._renderControl("clipPath", {
			id: mArguments.id
		}, false);

		sHtml += this._renderControl("rect", {
			x: mArguments.x,
			y: mArguments.y,
			width: mArguments.width || this._iWidth,
			height: mArguments.height || this._iHeight
		});
		sHtml += "</clipPath>";

		return sHtml;
	};

	/* =========================================================== */
	/* Getters & setters*/
	/* =========================================================== */
	ElementBase.prototype.setVisible = function (bVisible) {
		var oGraph = this.getParent();

		this.setProperty("visible", bVisible);
		if (oGraph) {
			oGraph.setFocus(null);
			oGraph._setupKeyboardNavigation();
		}
		return this;
	};


	ElementBase.prototype.setStatus = function(sStatus) {
		var oGraph = this.getParent();

		this.setProperty("status", sStatus);

		if (oGraph) {
			oGraph.updateLegend();
		}

		return this;
	};

	ElementBase.ColorType = Object.freeze({
		Background: "Background",
		Border: "Border",
		Content: "Content",
		SelectedBorder: "SelectedBorder",
		SelectedBackground: "SelectedBackground",
		SelectedContent: "SelectedContent",
		HoverBackground: "HoverBackground",
		HoverBorder: "HoverBorder",
		HoverContent: "HoverContent",
		Focus: "Focus",
		HoverFocus: "HoverFocus",
		SelectedFocus: "SelectedFocus"
	});

	return ElementBase;
});
