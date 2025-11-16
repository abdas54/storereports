sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller) {
        "use strict";

        return Controller.extend("com.eros.storereports.controller.MainView", {
            onInit: function () {
                this.oModel = this.getOwnerComponent().getModel();
                this.oModel.setSizeLimit(1000);

            },
            fnPressDailyPaymentReport: function(){
              this.getOwnerComponent().getRouter().navTo("DailyReport");
            },
            fnPressCategorySalesReport: function(){
              this.getOwnerComponent().getRouter().navTo("CategoryReport");
            }
        });
    });
