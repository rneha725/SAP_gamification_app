/*!
 * Copyright (c) 2009-2014 SAP SE, All Rights Reserved
 */

sap.ui.define([
        "jquery.sap.global"
    ], function (jQuery, JsControlTreeModifier) {
        "use strict";

        /**
         * Change handler for revealing(unhide) of a componentContainer control.
         * @alias sap.ui.fl.changeHandler.UnhideCardContainer
         * @author SAP SE
         * @version 1.56.5
         * @experimental Since 1.27.0
         */
        var UnhideCardContainer = {
            "changeHandler": {},
            "layers": {
                "CUSTOMER_BASE": true,
                "CUSTOMER": true,
                "USER": true
            }
        };

        /**
         * Unhides a componentContainer control.
         *
         * @param {sap.ui.fl.Change} oChange change object with instructions to be applied on the control map
         * @param {sap.ui.core.Control} oControl control that matches the change selector for applying the change
         * @param {object} mPropertyBag - map of properties
         * @returns {boolean} true - if change could be applied
         * @public
         */
        UnhideCardContainer.changeHandler.applyChange = function (oChange, oControl, mPropertyBag) {
            var oModifier = mPropertyBag.modifier,
                oMainView = mPropertyBag.appComponent.getRootControl(),
                oMainController = oMainView.getController(),
                oUIModel = oMainController.getUIModel(),
                oLayout = oMainController.getLayout(),
                sCardId = oChange.getContent().id,
                oCardControl = oModifier.byId(sCardId);
            oChange.setRevertData(sCardId); // Here the information is stored on the change
            oModifier.setVisible(oCardControl, true);
            if (oUIModel.getProperty('/containerLayout') === 'resizable') {
                var oLayoutUtil = oLayout.getDashboardLayoutUtil();
                if (oLayoutUtil.aCards) {
                    oLayoutUtil.updateCardVisibility([{
                        id: oLayoutUtil.getCardIdFromComponent(sCardId),
                        visibility: true
                    }]);
                }
                oMainController.appendIncomingDeltaChange(oChange);
            }
            var oCardView = oMainView.byId(sCardId);
            /**
             *  Scenario: If a card is hidden at Vendor or Customer Layer
             *  then no component is created on initial load of the application
             *
             *  Solution: We have to create the component for that card specifically
             *  for that we use "recreateRTAClonedCard" function from Main controller
             *  and check if we are not executing it on load of the application using
             *  flag "bFinishedCardsCreationProcess" in Main controller which is set to
             *  true only if all the cards have started the creation process. Since in
             *  RTA mode all cards have been created already this flag will be true.
             *  But on initial load it will be false.
             */
            if (!oCardView.getComponentInstance() && oMainController.bFinishedCardsCreationProcess) {
                var oCardManifest = oMainController._getCardFromManifest(oMainController._getCardId(sCardId));
                oMainController.recreateRTAClonedCard(oCardManifest);
            }
            oLayout.rerender();
            return true;
        };

        /**
         * Reverts unhiding of a componentContainer control.
         *
         * @param {sap.ui.fl.Change} oChange change object with instructions to be applied on the control map
         * @param {sap.ui.core.Control} oControl control that matches the change selector for applying the change
         * @param {object} mPropertyBag - map of properties
         * @returns {boolean} true - if change could be applied
         * @public
         */
        UnhideCardContainer.changeHandler.revertChange = function (oChange, oControl, mPropertyBag) {
            var oModifier = mPropertyBag.modifier,
                oMainView = mPropertyBag.appComponent.getRootControl(),
                oMainController = oMainView.getController(),
                oUIModel = oMainController.getUIModel(),
                oLayout = oMainController.getLayout(),
                sCardId = oChange.getRevertData(),
                oCardControl = oModifier.byId(sCardId);
            oModifier.setVisible(oCardControl, false);
            oChange.resetRevertData(); // Clear the revert data on the change
            if (oUIModel.getProperty('/containerLayout') === 'resizable') {
                var oLayoutUtil = oLayout.getDashboardLayoutUtil();
                oLayoutUtil.updateCardVisibility([{
                    id: oLayoutUtil.getCardIdFromComponent(sCardId),
                    visibility: false
                }]);
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
        UnhideCardContainer.changeHandler.completeChangeContent = function (oChange, oSpecificChangeInfo, mPropertyBag) {
            oChange.setContent({
                "id": oSpecificChangeInfo.revealedElementId
            });
        };

        return UnhideCardContainer;
    },
    /* bExport= */true);
