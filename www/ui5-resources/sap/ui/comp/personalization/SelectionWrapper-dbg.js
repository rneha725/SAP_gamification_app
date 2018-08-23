/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2018 SAP SE. All rights reserved
	
 */

sap.ui.define([
	'jquery.sap.global', 'sap/ui/core/Element', './ColumnWrapper'
], function(jQuery, Element, ColumnWrapper) {
	"use strict";

	/**
	 * The SelectionWrapper can be used to wrap a chart.
	 *
	 * @class Selection Wrapper
	 * @extends sap.ui.core.Element
	 * @author SAP
	 * @version 1.46.0-SNAPSHOT
	 * @private
	 * @since 1.46.0
	 * @alias sap.ui.comp.personalization.SelectionWrapper
	 */
	var SelectionWrapper = Element.extend("sap.ui.comp.personalization.SelectionWrapper", /** @lends sap.ui.comp.personalization.SelectionWrapper */
	{
		constructor: function(sId, mSettings) {
			Element.apply(this, arguments);
		},
		metadata: {
			library: "sap.ui.comp",
			aggregations: {
				/**
				 * Defines columns.
				 */
				columns: {
					type: "sap.ui.comp.personalization.ColumnWrapper",
					multiple: true,
					singularName: "column"
				}
			}
		}
	});

	SelectionWrapper.createSelectionWrapper = function(aMAvailableActions, bForbidNavigation) {
		return new SelectionWrapper({
			columns: aMAvailableActions.map(function(oMAvailableAction) {
				var oColumn = new ColumnWrapper({
					label: oMAvailableAction.text,
					selected: oMAvailableAction.visible,
					href: bForbidNavigation ? undefined : oMAvailableAction.href,
					target: oMAvailableAction.target,
					press: oMAvailableAction.press,
					description: oMAvailableAction.description
				});
				oColumn.data("p13nData", {
					columnKey: oMAvailableAction.key
				});
				return oColumn;
			})
		});
	};
	return SelectionWrapper;

}, /* bExport= */true);
