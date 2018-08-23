/*!
 * Copyright (c) 2009-2014 SAP SE, All Rights Reserved
 */

sap.ui.define([
        "jquery.sap.global"
    ], function (jQuery) {
        "use strict";

        /**
         * Change handler for hiding of a componentContainer control.
         * @alias sap.ui.fl.changeHandler.HideCardContainer
         * @author SAP SE
         * @version 1.56.5
         * @experimental Since 1.27.0
         */
        var HideCardContainer = {
            "changeHandler": {},
            "layers": {
                "CUSTOMER_BASE": true,
                "CUSTOMER": true,
                "USER": true
            }
        };

        /**
         * Hides a componentContainer control.
         *
         * @param {sap.ui.fl.Change} oChange change object with instructions to be applied on the control map
         * @param {sap.ui.core.Control} oControl control that matches the change selector for applying the change
         * @param {object} mPropertyBag - map of properties
         * @returns {boolean} true - if change could be applied
         * @public
         */
        HideCardContainer.changeHandler.applyChange = function (oChange, oControl, mPropertyBag) {
            var oModifier = mPropertyBag.modifier,
                oMainView = mPropertyBag.appComponent.getRootControl(),
                oMainController = oMainView.getController(),
                oUIModel = oMainController.getUIModel(),
                oLayout = oMainController.getLayout(),
                sCardId = oChange.getContent().id,
                oCardControl = oModifier.byId(sCardId);
            oChange.setRevertData(sCardId); // Here the information is stored on the change
            oModifier.setVisible(oCardControl, false);
            if (oUIModel.getProperty('/containerLayout') === 'resizable') {
                var oLayoutUtil = oLayout.getDashboardLayoutUtil();
                if (oLayoutUtil.aCards) {
                    oLayoutUtil.updateCardVisibility([{
                        id: oLayoutUtil.getCardIdFromComponent(sCardId),
                        visibility: false
                    }]);
                }
                oMainController.appendIncomingDeltaChange(oChange);
            }
            oLayout.rerender();
            return true;
        };

        /**
         * Reverts hiding of a componentContainer control.
         *
         * @param {sap.ui.fl.Change} oChange change object with instructions to be applied on the control map
         * @param {sap.ui.core.Control} oControl control that matches the change selector for applying the change
         * @param {object} mPropertyBag - map of properties
         * @returns {boolean} true - if change could be applied
         * @public
         */
        HideCardContainer.changeHandler.revertChange = function (oChange, oControl, mPropertyBag) {
            var oModifier = mPropertyBag.modifier,
                oMainView = mPropertyBag.appComponent.getRootControl(),
                oMainController = oMainView.getController(),
                oUIModel = oMainController.getUIModel(),
                oLayout = oMainController.getLayout(),
                sCardId = oChange.getRevertData(),
                oCardControl = oModifier.byId(sCardId);
            oModifier.setVisible(oCardControl, true);
            oChange.resetRevertData(); // Clear the revert data on the change
            if (oUIModel.getProperty('/containerLayout') === 'resizable') {
                var oLayoutUtil = oLayout.getDashboardLayoutUtil();
                oLayoutUtil.updateCardVisibility([{id: oLayoutUtil.getCardIdFromComponent(sCardId), visibility: true}]);
            }
            oLayout.rerender();
            return true;
        };

        /**
         * Completes the change by adding change handler specific content
         *
         * @param {sap.ui.fl.oChange} oChange change object to be completed
         * @param {object} oSpecificChangeInfo as an empty object since no additional attributes are required for this operation
         * @param {object} mPropertyBag - map of properties
         * @param {sap.ui.core.UiComponent} mPropertyBag.appComponent component in which the change should be applied
         * @public
         */
        HideCardContainer.changeHandler.completeChangeContent = function (oChange, oSpecificChangeInfo, mPropertyBag) {
            oChange.setContent(oSpecificChangeInfo.removedElement);
        };

        return HideCardContainer;
    },
    /* bExport= */true);
