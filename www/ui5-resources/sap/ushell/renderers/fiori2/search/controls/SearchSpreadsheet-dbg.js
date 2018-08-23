sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ushell/renderers/fiori2/search/SearchResultListFormatter',
    "sap/ui/export/Spreadsheet"
], function (Controller, SearchResultListFormatter, Spreadsheet) {
    "use strict";

    return Controller.extend("sap.ui.export.sample.table.Spreadsheet", {

        onExport: function () {
            var that = this;
            that.exportData = {
                columns: [],
                rows: []
            };

            if (that.table === undefined) {
                that.table = sap.ui.getCore().byId('ushell-search-result-table');
                that.model = that.table.getModel();
            }

            // set export columns
            that._parseColumns();

            if (that.exportData.columns.length === 0) {
                return;
            }

            sap.ui.getCore().byId('dataExportButton').setEnabled(false); // deactivate download button

            // search query
            var exportQuery = that.model.query.clone();
            exportQuery.setCalculateFacets(false);
            exportQuery.setTop(1000);

            // success handler
            var successHandler = function (searchResultSet) {
                var formatter = new SearchResultListFormatter();
                var newResults = formatter.format(searchResultSet, exportQuery.filter.searchTerm, {
                    suppressHighlightedValues: true
                });

                // set export rows
                that._parseRows(newResults);

                that._doExport();
            };

            // error handler
            var errorHandler = function (error) {
                that.model.normalSearchErrorHandling(error);
                sap.ui.getCore().byId('dataExportButton').setEnabled(true); // activate download button, when search fails
            };

            // fire search
            if (that.model.getProperty("/boCount") > 1000) {
                sap.m.MessageBox.information(sap.ushell.resources.i18n.getText("exportDataInfo"), {
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction == sap.m.MessageBox.Action.OK) {
                            exportQuery.getResultSetAsync().then(successHandler, errorHandler);
                        }
                        if (oAction == sap.m.MessageBox.Action.CANCEL) {
                            sap.ui.getCore().byId('dataExportButton').setEnabled(true); // activate download button, when download is canceled
                        }
                    }
                });
            } else {
                exportQuery.getResultSetAsync().then(successHandler, errorHandler);
            }
        },

        _parseColumns: function () {
            var that = this;
            var modelColumns = that.model.getProperty("/tableColumns");
            var exportColumns = [];

            // in table view -> export all visible table columns, excluding related app column
            // in other view -> export first 12 columns, excluding related app column
            if (that.model.getProperty("/resultToDisplay") === "searchResultTable") {
                // get visible columns of table
                var uiColumns = that.table.getColumns();
                // sort columns
                uiColumns.sort(function (a, b) {
                    if (a.getOrder() < b.getOrder())
                        return -1;
                    if (a.getOrder() > b.getOrder())
                        return 1;
                    return 0;
                });

                uiColumns.forEach(function (uiColumn) {
                    modelColumns.forEach(function (modelColumn) {
                        if (modelColumn.key === uiColumn.getId() && uiColumn.getVisible() && modelColumn.attributeId !== "SEARCH_APPS_AS_ID") {
                            exportColumns.push(
                                that._buildColumn(modelColumn)
                            );
                        }
                    });
                });

            } else {
                var i = 0;
                modelColumns.forEach(function (modelColumn) {
                    if (i <= 12 && modelColumn.attributeId !== "SEARCH_APPS_AS_ID") {
                        exportColumns.push(
                            that._buildColumn(modelColumn)
                        );
                        i++;
                    }
                });
            }
            that.exportData.columns = exportColumns;
        },

        _buildColumn: function (modelColumn) {
            var that = this;

            var column = {
                label: modelColumn.name,
                property: modelColumn.attributeId,
                type: 'string' // default type
            };

            if (modelColumn.attributeId === "SEARCH_DATASOURCE_AS_ID") {
                return column;
            }

            if (that.attributeMap == undefined) {
                that.attributeMap = that.model.sinaNext.dataSourceMap[that.model.getDataSource().id].attributeMetadataMap;
            }

            if (that.attributeMap[modelColumn.attributeId] !== undefined) {
                switch (that.attributeMap[modelColumn.attributeId].type) {
                    // case that.model.sinaNext.AttributeType.Timestamp:
                    //     column.type = 'timestamp';
                    //     break;
                    // case that.model.sinaNext.AttributeType.Date:
                    //     column.type = 'date';
                    //     break;
                    // case that.model.sinaNext.AttributeType.Time:
                    //     column.type = 'time';
                    //     break;
                case that.model.sinaNext.AttributeType.Double:
                    column.type = 'number';
                    column.scale = 2;
                    break;
                case that.model.sinaNext.AttributeType.Integer:
                    column.type = 'number';
                    column.scale = 0;
                    break;
                }
            }
            return column;
        },

        _parseRows: function (searchResults) {
            var that = this;
            var exportedRows = [];

            searchResults.forEach(function (row) {
                var attributes = row.itemattributes;
                var exportedRow = {};
                // set value for the title column
                exportedRow["SEARCH_DATASOURCE_AS_ID"] = row.title;
                // set value for the other attribte columns
                that.exportData.columns.forEach(function (column) {
                    attributes.forEach(function (attribute) {
                        if (attribute.key === column.property) {
                            exportedRow[column.property] = attribute.valueRaw;
                        }
                    });
                });
                exportedRows.push(exportedRow);
            });
            that.exportData.rows = exportedRows;
        },

        _doExport: function () {
            var that = this;
            var oSettings = {
                workbook: {
                    columns: that.exportData.columns
                },
                dataSource: that.exportData.rows
            };

            new Spreadsheet(oSettings).build().then(function () {
                sap.ui.getCore().byId('dataExportButton').setEnabled(true); // activate download button
            }, function () {
                sap.ui.getCore().byId('dataExportButton').setEnabled(true); // activate download button
            });
        }
    });
});
