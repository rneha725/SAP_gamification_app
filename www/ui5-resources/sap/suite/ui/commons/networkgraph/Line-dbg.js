sap.ui.define([
	"sap/suite/ui/commons/library",
	"./ElementBase",
	"./layout/Geometry",
	"./Coordinate",
	"./Utils"
], function (library, ElementBase, Geometry, Coordinate, Utils) {
	"use strict";

	// enums
	var ArrowPosition = library.networkgraph.LineArrowPosition,
		LineType = library.networkgraph.LineType,
		ArrowOrientation = library.networkgraph.LineArrowOrientation,
		Orientation = library.networkgraph.Orientation;

	var LINE_OFFSET = 15, // Offset from line start(end) when absolute position is used
		BEND_RADIUS = 6, // Bezier 'radius' of smooth bends
		FOCUS_LANE_WIDTH = 5; // Distance of focus shadow line from the main line

	var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.suite.ui.commons");

	/**
	 * Constructor for a new Line.
	 *
	 * @class
	 * Holds information about one connector line.
	 *
	 * @extends sap.suite.ui.commons.networkgraph.ElementBase
	 *
	 * @constructor
	 * @public
	 * @since 1.50
	 * @alias sap.suite.ui.commons.networkgraph.Line
	 */
	var Line = ElementBase.extend("sap.suite.ui.commons.networkgraph.Line", {
		metadata: {
			library: "sap.suite.ui.commons",
			properties: {
				/**
				 * Shows if the line is selected. Once the line is selected, its appearance changes slightly
				 * to distinguish it from other lines.
				 */
				selected: {
					type: "boolean", group: "Misc", defaultValue: false
				},
				/**
				 * Key of the node where the line begins.
				 */
				from: {
					type: "string", group: "Misc", defaultValue: null
				},
				/**
				 * Key of the node the line leads to.
				 */
				to: {
					type: "string", group: "Misc", defaultValue: null
				},
				/**
				 * Defines the appearance of the line. Can be set to solid, dashed, or dotted.
				 */
				lineType: {
					type: "sap.suite.ui.commons.networkgraph.LineType",
					group: "Appearance",
					defaultValue: LineType.Solid
				},
				/**
				 * Position of the arrow on the line. Can be set to End, Middle, or Start.
				 */
				arrowPosition: {
					type: "sap.suite.ui.commons.networkgraph.LineArrowPosition",
					group: "Appearance",
					defaultValue: ArrowPosition.End
				},
				/**
				 * Orientation of the line that defines the direction of the arrow.
				 */
				arrowOrientation: {
					type: "sap.suite.ui.commons.networkgraph.LineArrowOrientation",
					group: "Appearance",
					defaultValue: ArrowOrientation.ParentOf
				}
			},
			aggregations: {
				/**
				 * A list of points the line goes through. After the layouting algorithm has finished arranging the graph,
				 * this aggregation contains the coordinates of at least two points: the starting point and the end point of
				 * the line. The rest of the points making up the line are treated as break points.
				 */
				coordinates: {
					type: "sap.suite.ui.commons.networkgraph.Coordinate", multiple: true, singularName: "coordinate"
				}
			},
			events: {
				/**
				 * This event is fired when the user moves the mouse pointer over the line.
				 */
				hover: {},
				/**
				 * This event is fired when the user clicks or taps the line.
				 */
				press: {
					parameters: {
						/**
						 * Coordinates of the cursor when pressed.
						 */
						point: "Object",
						/**
						 * Object you can pass to 'openBy' method for custom tooltip. Its important for lines where you want to
						 * display tooltip precisely where the cursor is.
						 */
						opener: "Object"
					}
				}
			}
		},
		renderer: function (oRM, oControl) {
			// NOTE: this render is considered to be called only for single item invalidation
			// whole graph has different render path
			oRM.write(oControl._render());
		},
		onAfterRendering: function () {
			this._afterRenderingBase();
		},
		init: function () {
			this._oFrom = null;
			this._oTo = null;

			this._bFocusRendered = false;
			this._sKey = "";

			this._bIsHidden = false;
		}
	});

	// sum of properties that if changed requires data reprocessing
	Line.prototype.aProcessRequiredProperties = ["from", "to"];

	/* =========================================================== */
	/* Events & pseudo events */
	/* =========================================================== */
	Line.prototype._afterRendering = function () {
		this._setupEvents();
		if (this.getFromNode()._bIsHidden || this.getToNode()._bIsHidden) {
			this.$().hide();
		}
	};

	/* =========================================================== */
	/* Rendering */
	/* =========================================================== */
	Line.prototype._render = function (mOptions) {
		var sLineHtml = "",
			sColor = this._getColor(ElementBase.ColorType.Border),
			sSelectedClass = this.getSelected() ? " " + this.SELECT_CLASS + " " : "",
			sId = this._getElementId(mOptions && mOptions.idSufix),
			sRoundedPath;

		var fnRenderPath = function (sClass, sId, bIsInvisible) {
			return this._renderControl("path", {
				d: sRoundedPath,
				"class": sClass || this._getLineClass(),
				style: !bIsInvisible && sColor ? "stroke:" + sColor : "",
				from: this.getFromNode().getKey(),
				to: this.getToNode().getKey(),
				id: sId ? this._getDomId(sId) : ""
			});
		}.bind(this);

		var fnRenderArrow = function () {
			var oArrowPos = this._getArrowPosition(),
				oArrowAttributes = {
					id: this.getId() + "-arrow",
					p1: oArrowPos.arrowFrom,
					p2: oArrowPos.arrowTo,
					"class": "sapSuiteUiCommonsNetworkLineArrow",
					style: this._getColorStyle({
						fill: ElementBase.ColorType.Background,
						stroke: ElementBase.ColorType.Border
					}),
					width: 12,
					height: 8,
					invert: this.getArrowOrientation() === ArrowOrientation.ChildOf,
					absolutePosition: LINE_OFFSET
				};

			if (this.getArrowPosition() === ArrowPosition.Middle) {
				oArrowAttributes.relativePosition = 0.5;
			}

			return this._renderControl("path", this._createArrow(oArrowAttributes));
		}.bind(this);

		this._bFocusRendered = false;

		if (this._isIgnored() || !this.getVisible()) {
			return "";
		}

		sRoundedPath = this._createPath();

		// wrapper
		sLineHtml += this._renderControl("g", {
			"class": "sapSuiteUiCommonsNetworkLine " + this._getStatusClass() + sSelectedClass,
			id: sId,
			"data-sap-ui": sId
		}, false);

		// invisible wrapper for better event handling
		sLineHtml += fnRenderPath("sapSuiteUiCommonsNetworkLineInvisibleWrapper", "invisibleWrapper", true);

		// path itself
		sLineHtml += fnRenderPath("", "path");

		if (this.getArrowOrientation() !== ArrowOrientation.None) {
			sLineHtml += fnRenderArrow();
		}
		sLineHtml += "</g>";

		return sLineHtml;
	};

	Line.prototype._renderFocusWrapper = function () {
		var fnAppendFocusLine = function (iShift) {
			var oPath = this._createElement("path", {
				d: this._createPath(iShift),
				"class": "sapSuiteUiCommonsNetworkLineFocus"
			});

			this.$()[0].appendChild(oPath);
		}.bind(this);

		if (!this._bFocusRendered) {
			fnAppendFocusLine(FOCUS_LANE_WIDTH);
			fnAppendFocusLine(-FOCUS_LANE_WIDTH);

			this._bFocusRendered = true;
		}
	};

	Line.prototype._createArrow = function (mArguments) {
		var fY = mArguments.p2.y - mArguments.p1.y,
			fX = mArguments.p2.x - mArguments.p1.x,
			fRadian = Math.atan2(fY, fX),
			fAngle = fRadian * 180 / Math.PI,
			fH2 = mArguments.height / 2,
			sTransform, oFrom, oStartPoint, oDiff, iRatio;

		var fnGetArcSizes = function (iSize) {
			return {
				x: iSize * Math.cos(fRadian),
				y: iSize * Math.sin(fRadian)
			};
		};

		var fnGetStartingPoint = function () {
			var oSize;
			if (!this.getParent()._isLayered()) {
				// force based has always circles then we can compute height from "FROM" even if the arrow position is end
				oSize = fnGetArcSizes(this.getFromNode()._iHeight / 2);
				return {
					x: oFrom.x + (oSize.x * iRatio),
					y: oFrom.y + (oSize.y * iRatio)
				};
			}

			return {
				x: oFrom.x,
				y: oFrom.y
			};
		}.bind(this);

		if (mArguments.invert) {
			fAngle += 180;
		}

		if (mArguments.relativePosition) {
			sTransform = "translate(" + (mArguments.p1.x + (fX * mArguments.relativePosition)) + " " + (mArguments.p1.y + fY * mArguments.relativePosition) + ")" +
				" rotate(" + fAngle + ")";
		} else {
			oFrom = this._isEndPosition() ? mArguments.p2 : mArguments.p1;
			iRatio = this._isEndPosition() ? -1 : 1;
			oStartPoint = fnGetStartingPoint();
			oDiff = fnGetArcSizes(mArguments.absolutePosition /*+ (this._isEndPosition() ? 0 : mArguments.width)*/);

			sTransform = "translate(" + (oStartPoint.x + (oDiff.x * iRatio)) + " " + (oStartPoint.y + (oDiff.y * iRatio)) + ")" +
				" rotate(" + fAngle + ")";
		}

		mArguments.d = "M " + mArguments.width / 2 + ",0" +
			" L " + (-1 * mArguments.width / 2) + "," + fH2 +
			" L " + (-1 * mArguments.width / 2) + "," + (-1 * fH2) +
			" Z";

		mArguments.transform = sTransform;

		return mArguments;
	};

	Line.prototype._createPath = function (iShift) {
		var aNodes = [{
				x: this.getSource().getX(),
				y: this.getSource().getY()
			}],
			sPath = "M" + this.getSource().getX() + "," + this.getSource().getY(),
			iLast, iNew,
			bIsTopBottom = this._isTopBottom(),
			sCoord = bIsTopBottom ? "x" : "y",
			sFnName = bIsTopBottom ? "getX" : "getY",
			aCoordinates = this.getBends().concat([this.getTarget()]);

		// this should prevent some small Y adjustments when line is almost on same Y but not quite
		for (var i = 0; i < aCoordinates.length; i++) {
			// check current - 2 to determine if current - 1 is in "almost" the same y(x)
			// in such case we ignore middle coordinate and create one single line
			// aNodes is one coordinate "before" so aNodes[i-1] is actually aCoordinates - 2
			iLast = aNodes[i - 1] ? aNodes[i - 1][sCoord] : NaN;
			iNew = aCoordinates[i][sFnName]();

			if (Math.abs(iLast - aCoordinates[i][sFnName]()) < 2) {
				aNodes.pop();
				iNew = iLast;
			}

			aNodes.push({
				x: bIsTopBottom ? iNew : aCoordinates[i].getX(),
				y: !bIsTopBottom ? iNew : aCoordinates[i].getY()
			});
		}


		for (var i = 1; i < aNodes.length; i++) {
			sPath += " L" + aNodes[i].x + "," + aNodes[i].y;
		}

		this._aFixedCoordinates = aNodes;

		return Geometry.getBezierPathCorners(sPath, BEND_RADIUS, iShift);
	};

	Line.prototype._getLineClass = function () {
		var fnGetLineTypeClass = function () {
			switch (this.getLineType()) {
				case LineType.Dashed:
					return "sapSuiteUiCommonsNetworkDashedLine";
				case LineType.Dotted:
					return "sapSuiteUiCommonsNetworkDottedLine";
				default:
					return "";
			}
		}.bind(this);

		return "sapSuiteUiCommonsNetworkLinePath " + fnGetLineTypeClass();
	};

	Line.prototype._getArrowPosition = function () {
		var fnFixCoordinate = function (oNode, oFirstCoord, oSecondCoord) {
			var sValue = this._isTopBottom() ? "y" : "x",
				sValueRevert = this._isTopBottom() ? "x" : "y",
				bMoveToStart;

			// we support this feature only for straight vertical(top bottom) or straight horizontal(left to right) lines
			if (oSecondCoord[sValueRevert] !== oFirstCoord[sValueRevert]) {
				return;
			}

			if (!oNode._isBox() && !(oNode._oGroup && oNode._oGroup.getCollapsed())) {
				bMoveToStart = oFirstCoord[sValue] > oSecondCoord[sValue];
				oFirstCoord[sValue] = bMoveToStart ? oNode._getCirclePosition()[sValue] : oNode._getCircleSize() + oNode._getCirclePosition()[sValue];
			}
		}.bind(this);

		if (this._aFixedCoordinates.length < 2) {
			return;
		}

		var oParent = this.getParent(),
			BEND_OFFSET = 5,
			oSource = {
				x: this._aFixedCoordinates[0].x,
				y: this._aFixedCoordinates[0].y
			},
			oTarget = {
				x: this._aFixedCoordinates[this._aFixedCoordinates.length - 1].x,
				y: this._aFixedCoordinates[this._aFixedCoordinates.length - 1].y
			},
			aBends = this.getBends();

		if (this._aFixedCoordinates.length > 2) {
			if (this._moveToEnd()) {
				oSource.x = this._aFixedCoordinates[this._aFixedCoordinates.length - 2].x + (this._isTopBottom() ? 0 : BEND_OFFSET);
				oSource.y = this._aFixedCoordinates[this._aFixedCoordinates.length - 2].y + (this._isTopBottom() ? BEND_OFFSET : 0);
			} else {
				oTarget.x = this._aFixedCoordinates[1].x + (this._isTopBottom() ? 0 : BEND_OFFSET);
				oTarget.y = this._aFixedCoordinates[1].y + (this._isTopBottom() ? BEND_OFFSET : 0);
			}
		}

		// fix circle arrow position for layered layout
		// the end of nodes may be in the center of the circle so we push them to the edge of the circle
		if (oParent && oParent._isLayered()) {
			if (aBends.length === 0) {
				// without bend we need to fix both (start and end) - because of the middle arrow position
				fnFixCoordinate(this._oTo, oTarget, oSource);
				fnFixCoordinate(this._oFrom, oSource, oTarget);
			} else if (this._moveToEnd()) { // for bend it sufficient to fix only the node close to the arrow
				fnFixCoordinate(this._oTo, oTarget, oSource);
			} else {
				fnFixCoordinate(this._oFrom, oSource, oTarget);
			}
		}

		return {
			arrowFrom: {
				x: oSource.x,
				y: oSource.y
			},
			arrowTo: {
				x: oTarget.x,
				y: oTarget.y
			}
		};
	};

	Line.prototype._getAccessibilityLabel = function () {
		return oResourceBundle.getText("NETWORK_GRAPH_ACCESSIBILITY_LINE_LABEL", [this.getFromNode().getTitle(), this.getToNode().getTitle()]) + " " + this.getTitle();
	};

	/* =========================================================== */
	/* Public methods */
	/* =========================================================== */
	/**
	 * Returns the node instance where the line starts.
	 * This method doesn't call invalidate on the object.
	 * @returns {object} Node instance where the line starts
	 * @public
	 */
	Line.prototype.getFromNode = function () {
		this._checkForProcessData();
		if (!this._oFrom && this.getParent()) {
			this._oFrom = this.getParent().getNodeByKey(this.getFrom());
		}
		return this._oFrom;
	};

	/**
	 * Returns the node instance where the line leads to.
	 * This method doesn't call invalidate on the object.
	 * @returns {object} Node instance where the line ends
	 * @public
	 */
	Line.prototype.getToNode = function () {
		this._checkForProcessData();
		if (!this._oTo && this.getParent()) {
			this._oTo = this.getParent().getNodeByKey(this.getTo());
		}
		return this._oTo;
	};

	/**
	 * Sets the starting point, or the source, for the line.
	 * This method doesn't call invalidate on the object.
	 * @param {object} mArguments mArguments.x mArguments.y X and Y coordinates of the starting point
	 * @public
	 */
	Line.prototype.setSource = function (mArguments) {
		var oCoordinate;
		if (this.getCoordinates().length === 0) {
			oCoordinate = new Coordinate();
			this.addAggregation("coordinates", oCoordinate, true);
		}

		oCoordinate = this.getCoordinates()[0];
		if (mArguments.x || mArguments.x === 0) {
			oCoordinate.setX(mArguments.x);
		}

		if (mArguments.y || mArguments.y === 0) {
			oCoordinate.setY(mArguments.y);
		}
	};

	/**
	 * Returns the coordinates of the line's starting point.
	 * This method doesn't call invalidate on the object.
	 * @returns {Coordinate} Coordinate object
	 * @public
	 */
	Line.prototype.getSource = function () {
		return this.getCoordinates()[0];
	};

	/**
	 * Returns the coordinates of the line's end point.
	 * This method doesn't call invalidate on the object.
	 * @returns {Coordinate} Coordinate object
	 * @public
	 */
	Line.prototype.getTarget = function () {
		// if there is only 1 node source == target
		return this.getCoordinates().length > 0 ? this.getCoordinates()[this.getCoordinates().length - 1] : null;
	};

	/**
	 * Sets the end point, or the target, for the line.
	 * This method doesn't call invalidate on the object.
	 * @param {object} mArguments mArguments.x mArguments.y X and Y coordinates of the end point
	 * @public
	 */
	Line.prototype.setTarget = function (mArguments) {
		var oCoordinate;

		if (this.getCoordinates().length < 2) {
			oCoordinate = new Coordinate();
			this.addAggregation("coordinates", oCoordinate, true);
		}
		oCoordinate = this.getCoordinates()[this.getCoordinates().length - 1];

		if (mArguments.x || mArguments.x === 0) {
			oCoordinate.setX(mArguments.x);
		}

		if (mArguments.y || mArguments.y === 0) {
			oCoordinate.setY(mArguments.y);
		}
	};

	/**
	 * Returns the coordinates of all points that define the shape of the line between its start and end points.
	 * This method doesn't call invalidate on the object.
	 * @returns {array} Coordinates of the points shaping the line
	 * @public
	 */
	Line.prototype.getBends = function () {
		return this.getCoordinates().filter(function (oCoord, iIndex) {
			return (iIndex > 0) && (iIndex < (this.getCoordinates().length - 1));
		}, this);
	};

	/**
	 * Removes all points that define the shape of the line between its start and end points.
	 * This method doesn't call invalidate on the object.
	 * @public
	 */
	Line.prototype.clearBends = function () {
		this.getBends().forEach(function (oBend) {
			this.removeAggregation("coordinates", oBend, true);
		}, this);
	};

	/**
	 * Adds coordinates for points that should define the shape of the line between its start and end points.
	 * This method doesn't call invalidate on the object.
	 * @param {Coordinate} oPoint oPoint.x mArguments.y X and Y coordinates
	 * @returns {Coordinate} Newly added coordinates object
	 * @public
	 */
	Line.prototype.addBend = function (oPoint) {
		var oNew = new Coordinate();
		oNew.setX(oPoint.x);
		oNew.setY(oPoint.y);
		this.insertAggregation("coordinates", oNew, this.getCoordinates().length - 1, true);

		return oNew;
	};

	Line.prototype.isHidden = function () {
		return this._bIsHidden;
	};

	Line.prototype.getKey = function () {
		return this._getLineId();
	};

	/* =========================================================== */
	/* Private methods */
	/* =========================================================== */
	Line.prototype._isIgnored = function () {
		var oFrom = this.getFromNode(),
			oTo = this.getToNode(),
			bInsideCollapsedGroup =
				oFrom._oGroup && oFrom._oGroup.getCollapsed()
				&& oTo._oGroup && oTo._oGroup.getCollapsed()
				&& oFrom._oGroup === oTo._oGroup,
			bGroupIgnored = (oFrom._oGroup && oFrom._oGroup._isIgnored()) || (oTo._oGroup && oTo._oGroup._isIgnored()),
			bNodesIgnored = !oFrom._useInLayout() || !oTo._useInLayout();

		return bGroupIgnored || !this._useInLayout || bInsideCollapsedGroup || this._isLoop() || bNodesIgnored;
	};

	Line.prototype._isLoop = function () {
		return this.getFromNode().getId() === this.getToNode().getId();
	};

	Line.prototype._getLineId = function () {
		return this._sKey ? this._sKey : "line_" + this.getFrom() + "-" + this.getTo();
	};

	Line.prototype._setupEvents = function () {
		var $line = this.$().find(".sapSuiteUiCommonsNetworkLineInvisibleWrapper");

		$line.click(function (oEvent) {
			this._click({
				ctrlKey: oEvent.ctrlKey,
				clientX: oEvent.clientX,
				clientY: oEvent.clientY
			});
		}.bind(this));

		$line.mouseover(function (oEvent) {
			this._mouseOver();
		}.bind(this));

		$line.mouseout(function (oEvent) {
			this._mouseOut();
		}.bind(this));
	};

	Line.prototype._mouseOut = function () {
		this.$().removeClass(this.HIGHLIGHT_CLASS);
		if (!this.getSelected()) {
			this._setStatusColors("");
		}
	};

	Line.prototype._mouseOver = function () {
		var bExecuteDefault = this.fireEvent("hover", {}, true);

		if (!this.getSelected() && bExecuteDefault) {
			this._setStatusColors("Hover");
			this.$().addClass(this.HIGHLIGHT_CLASS);
		}
	};

	Line.prototype._setStatusColors = function (sType) {
		var $arrow = this.$("arrow");

		$arrow.css("fill", this._getColor(ElementBase.ColorType[sType + "Background"]));
		$arrow.css("stroke", this._getColor(ElementBase.ColorType[sType + "Border"]));
		this.$("path").css("stroke", this._getColor(ElementBase.ColorType[sType + "Border"]));
	};

	Line.prototype._click = function (mArguments) {
		var oParent = this.getParent(),
			oPoint = oParent.getCorrectMousePosition({
				x: mArguments.clientX + 10,
				y: mArguments.clientY
			}),
			oOpener = oParent._tooltip._getOpener(this, oPoint), bExecuteDefault;

		oParent._selectLine({
			element: this,
			forceFocus: true,
			preventDeselect: mArguments.ctrlKey
		});

		bExecuteDefault = this.fireEvent("press", {
			opener: oOpener,
			point: oPoint
		}, true);

		if (this.getSelected() && bExecuteDefault) {
			oParent._tooltip.openDetail({
				item: this,
				opener: oOpener,
				point: oPoint
			});
		}
	};

	Line.prototype._setFocus = function (bFocus) {
		ElementBase.prototype._setFocus.call(this, bFocus);
		if (bFocus) {
			this._renderFocusWrapper();
		}
	};

	Line.prototype._isEndPosition = function () {
		return ((this.getArrowPosition() === ArrowPosition.End && this.getArrowOrientation() === ArrowOrientation.ParentOf) ||
		(this.getArrowPosition() === ArrowPosition.Start && this.getArrowOrientation() === ArrowOrientation.ChildOf));
	};

	Line.prototype._moveToEnd = function () {
		return this._isEndPosition() ||
			(this.getArrowPosition() === ArrowPosition.Middle && this.getArrowOrientation() === ArrowOrientation.ParentOf);
	};

	Line.prototype._hideShow = function (bCollapse) {
		if (bCollapse) {
			this.$().hide();
			this._bIsHidden = true;
		} else if (!this.getToNode()._bIsHidden && !this.getFromNode()._bIsHidden) {
			this.$().show();
			this._bIsHidden = false;
		}
	};

	Line.prototype._shift = function (oPoint) {
		this.getBends().forEach(function (b) {
			b.setX(b.getX() + oPoint.x);
			b.setY(b.getY() + oPoint.y);
		});

		if (this.getSource()) {
			this.setSource({
				x: this.getSource().getX() + oPoint.x,
				y: this.getSource().getY() + oPoint.y
			});
		}

		if (this.getTarget()) {
			this.setTarget({
				x: this.getTarget().getX() + oPoint.x,
				y: this.getTarget().getY() + oPoint.y
			});
		}
	};

	Line.prototype._normalizePath = function () {
		var oFromCenter, oToCenter;
		oFromCenter = this.getFromNode().getCenterPosition();
		this.setSource({
			x: oFromCenter.x,
			y: oFromCenter.y
		});
		oToCenter = this.getToNode().getCenterPosition();
		this.setTarget({
			x: oToCenter.x,
			y: oToCenter.y
		});
		this.clearBends();
	};

	Line.prototype._validateLayout = function () {
		return isFinite(this.getSource().getX()) && isFinite(this.getSource().getY())
			&& isFinite(this.getTarget().getX()) && isFinite(this.getTarget().getY())
			&& !this.getBends().some(function (oBend) {
				return !isFinite(oBend.getX()) || !isFinite(oBend.getY());
			});
	};

	/* =========================================================== */
	/* Getters, Setters & Private helper methods*/
	/* =========================================================== */
	Line.prototype.setSelected = function (bSelected) {
		var oParent = this.getParent(),
			sFnName = bSelected ? "addClass" : "removeClass";

		this._setStatusColors(bSelected ? "Selected" : "");

		this.setProperty("selected", bSelected, true);
		this.$()[sFnName](this.SELECT_CLASS);

		if (oParent) {
			if (bSelected) {
				oParent._mSelectedLines[this._getLineId()] = this;
			} else {
				delete oParent._mSelectedLines[this._getLineId()];
			}
		}

		return this;
	};

	Line.prototype.setFrom = function (sFrom) {
		var oParent = this.getParent();
		this.setProperty("from", sFrom, true);
		if (oParent) {
			oParent.invalidate();
		}
		return this;
	};

	Line.prototype.setTo = function (sTo) {
		var oParent = this.getParent();
		this.setProperty("to", sTo, true);
		if (oParent) {
			oParent.invalidate();
		}
		return this;
	};

	Line.prototype._isTopBottom = function () {
		var oParent = this.getParent();
		return oParent.getOrientation() === Orientation.TopBottom ||
			oParent.getOrientation() === Orientation.BottomTop;
	};

	Line.prototype._useAbsoluteArrowPosition = function () {
		return this.getArrowPosition() !== ArrowPosition.MIDDLE;
	};

	Line.prototype.getFocusDomRef = function () {
		return this.getDomRef("invisibleWrapper");
	};

	Line.prototype._createSuggestionHelpText = function () {
		var LINE_TITLE_LENGTH = 25;
		var sTitle = this.getTitle() ? (this.getTitle() + " ") : "";

		return sTitle + "(" + Utils.trimText(this.getFromNode().getTitle(), LINE_TITLE_LENGTH) + " -> "
			+ Utils.trimText(this.getToNode().getTitle(), LINE_TITLE_LENGTH) + ")";
	};

	Line.prototype._isInCollapsedGroup = function () {
		var oFrom = this.getFromNode(),
			oTo = this.getToNode();

		return (oFrom._oGroup === oTo._oGroup) && oFrom._isInCollapsedGroup();
	};

	return Line;
});
