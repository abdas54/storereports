sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "com/eros/storereports/lib/epos-2.27.0"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, MessageBox, epson2) {
        "use strict";
        var that;
        return Controller.extend("com.eros.storereports.controller.CategoryReport", {
            onInit: function () {
                this.oModel = this.getOwnerComponent().getModel();
                that = this;
                this.validateLoggedInUser();

            },
            validateLoggedInUser: function () {
                var that = this;
                that.printerIP = [];
                this.oModel.read("/StoreIDSet", {
                    success: function (oData) {
                        that.storeID = oData.results[0] ? oData.results[0].Store : "";
                        that.plantID = oData.results[0] ? oData.results[0].Plant : "";
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp1 ? oData.results[0].PrinterIp1 : "" : "");
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp2 ? oData.results[0].PrinterIp2 : "" : "");
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp3 ? oData.results[0].PrinterIp3 : "" : "");
                        
                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    window.history.go(-1);
                                }
                            }
                        });
                    }
                });
            },
            fnClearSearch: function () {
                this.byId("trandate").setValue("");
                this.getView().byId("store").setValue("");
                if (document.getElementById("pdf-viewport")) {
                    document.getElementById("pdf-viewport").innerHTML = "";
                }

            },
            fnSearch: function () {
                var oDateRange = this.byId("trandate");
                var oFromDate = oDateRange.getDateValue();     // First Date
                var oToDate = oDateRange.getSecondDateValue(); // Second Date
                oFromDate = oFromDate ? this.resolveTimeDifference(oFromDate) : null;
                oToDate = oToDate ? this.resolveTimeDifference(oToDate) : null;


                var sStore = this.byId("store").getValue();


                // If all filters are empty → show message
                if (!oFromDate && !oToDate && !sStore) {
                    sap.m.MessageToast.show("Please enter at least one filter before searching.");
                    return;
                }

                this._loadData(oFromDate, oToDate, sStore);
            },
            _loadData: function (fromDate, toDate, store) {
                var oModel = this.getView().getModel();
                var aFilters = [];
                var that = this;

                if (store) aFilters.push(new sap.ui.model.Filter("Store", "EQ", store));
                if (fromDate) {
                    aFilters.push(new sap.ui.model.Filter("FromDate", "EQ", fromDate));
                }
                if (toDate) {
                    aFilters.push(new sap.ui.model.Filter("ToDate", "EQ", toDate)); // Less or Equal
                }
                aFilters.push(new sap.ui.model.Filter("Type", "EQ", "2"));
                this.oModel.read("/ReportPDFSet", {
                    filters: aFilters,

                    success: function (oData) {
                        console.log(oData);
                        if (oData.results[0] && oData.results[0].Value) {
                            that.pdfBase64 = oData.results[0].Value;
                            that.onShowPDFSEPP(that.pdfBase64);
                        }

                    }.bind(this),
                    error: function () {
                        sap.m.MessageToast.show("Error fetching data");
                    }
                });
            },
            onShowPDF: function (base64Content) {
                // Convert base64 → Blob
                var byteCharacters = atob(base64Content);
                var byteNumbers = new Array(byteCharacters.length);
                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                var blob = new Blob([byteArray], { type: "application/pdf" });

                // Create a fresh object URL
                if (this._pdfUrl) {
                    URL.revokeObjectURL(this._pdfUrl);
                }
                this._pdfUrl = URL.createObjectURL(blob);

                // Force refresh by recreating a new HTML control instance
                var oVBox = this.getView().byId("pdfContainer"); // <-- wrap HTML inside a VBox in your view
                oVBox.removeAllItems();

                var sHtml =
                    '<iframe src="' +
                    this._pdfUrl +
                    '" width="100%" height="600px" style="border:none;"></iframe>';

                var oHtml = new sap.ui.core.HTML({
                    content: sHtml
                });

                oVBox.addItem(oHtml);
            },



            _formatODataDate: function (oDate) {
                if (!oDate) return null;
                let year = oDate.getFullYear();
                let month = String(oDate.getMonth() + 1).padStart(2, '0');
                let day = String(oDate.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}T00:00:00`;
            },
            resolveTimeDifference: function (dateTime) {
                if (dateTime !== undefined && dateTime !== null && dateTime !== "") {
                    var offSet = dateTime.getTimezoneOffset();
                    var offSetVal = dateTime.getTimezoneOffset() / 60;
                    var h = Math.floor(Math.abs(offSetVal));
                    var m = Math.floor((Math.abs(offSetVal) * 60) % 60);
                    dateTime = new Date(dateTime.setHours(h, m, 0, 0));
                    return dateTime;

                }

                return null;

            },
            formatDateShort: function (value) {
                if (!value) return "";
                var oDate = new Date(value);
                var oFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MMM dd yyyy" });
                return oFormat.format(oDate);
            },
            formatTransactionType: function (value) {
                if (!value) return "";


                if (value === "1") {
                    return "Sales";
                } else if (value === "2") {
                    return "Sales Return";
                }
                else if (value === "3") {
                    return "Advance Receipt";
                }
                else if (value === "4") {
                    return "Advance Cancellation";
                }
                else if (value === "5") {
                    return "Sales Return with Refund";
                }



            },
            onProductRowPress: function (oEvent) {
                var that = this;
                var selIndexData = oEvent.getParameter("listItem").getBindingContext("TransModel").getObject();
                var oItemDetailModel = new sap.ui.model.json.JSONModel({});
                oItemDetailModel.setData({
                    "itemData": selIndexData.ToItemsList.results,
                    "TransactionType": selIndexData.TransactionType
                });

                if (!that._oDialogItemDetails) {
                    Fragment.load({
                        name: "com.eros.displaytransaction.fragment.itemDetail",
                        controller: that
                    }).then(function (oFragment) {
                        that._oDialogItemDetails = oFragment;
                        that.getView().addDependent(that._oDialogItemDetails);
                        sap.ui.getCore().setModel(oItemDetailModel, "itemDataModel");
                        that._oDialogItemDetails.setModel(oItemDetailModel, "itemDataModel");
                        that._oDialogItemDetails.open();
                    }.bind(that));
                } else {
                    that._oDialogItemDetails.setModel(oItemDetailModel, "itemDataModel");
                    sap.ui.getCore().setModel(oItemDetailModel, "itemDataModel");
                    that._oDialogItemDetails.open();
                }
            },
            onCloseItemDetail: function () {
                that._oDialogItemDetails.close();
            },
            onPrint: function () {
                //this.sendToEpsonPrinter(this.canvas, this.printerIp);
                var that = this;
                var aValidIPs = [].concat(that.printerIP || []).filter(ip => ip && ip.trim() !== "");

                if (aValidIPs.length === 0) {
                    sap.m.MessageToast.show("No valid printer IPs found.");
                    return;
                }

                var oIPModel = new sap.ui.model.json.JSONModel({
                    IPs: aValidIPs.map(function (ip) {
                        return { IP: ip };
                    })
                });

                this.printerIp = aValidIPs[0];
                this.sendToEpsonPrinter(this.canvasp, this.printerIp);
                // if (!this._oPrintDialog) {
                //     Fragment.load({
                //         name: "com.eros.storereports.fragment.printDialog",
                //         controller: this
                //     }).then(function (oDialog) {
                //         that._oPrintDialog = oDialog;
                //         that.getView().addDependent(oDialog);
                //         that._oPrintDialog.setModel(oIPModel, "IPModel");
                //         oDialog.open();
                //     });
                // } else {
                //     that._oPrintDialog.setModel(oIPModel, "IPModel");
                //     that._oPrintDialog.open();
                // }
            },
            onCancelPrint: function () {
               // that._oPrintDialog.close();
            },
             onPressIP: function (oEvent) {
                var that = this;
                var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
                var oVBox = oItem.getContent ? oItem.getContent()[0] : oItem.getAggregation("content")[0];
                var aItems = oVBox.getItems ? oVBox.getItems() : oVBox.getAggregation("items");
                this.printIP = aItems[0]?.getText();
                this._oPrintDialog.close();
                this.sendToEpsonPrinter(this.canvasp, this.printIP)
                


            },
            onloadPDF: async function (base64Content) {
                const oVBox = this.getView().byId("printBox");


                const oOldHtml = this.getView().byId("pdfCanvas");
                if (oVBox && oOldHtml) {
                    oVBox.removeItem(oOldHtml);
                    oOldHtml.destroy(true);
                }


                const uniqueId = "pdf-viewport-" + Date.now();


                const oNewHtml = new sap.ui.core.HTML({
                    id: this.createId("pdfCanvas"),
                    content: `<div id="${uniqueId}" style="width:100%;height:100%;overflow:auto;"></div>`
                });


                oVBox.addItem(oNewHtml);



                const byteCharacters = atob(base64Content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                // 👇 Append random query to ensure browser does NOT cache
                const pdfUrl = URL.createObjectURL(blob) + `#t=${Date.now()}`;
                //var printerIp = "192.168.10.75";
                // 🔹 Step 5: Wait until control renders, then load PDF
                try {
                    const canvas = await this.loadPdfToCanvas(pdfUrl, uniqueId);
                    this.canvasp = canvas;
                   // this.printerIP = printerIp;
                    console.log(" PDF loaded successfully:", uniqueId);
                    //this.sendToEpsonPrinter(canvas, printerIp);
                } catch (err) {
                    console.error("Error rendering PDF:", err);
                    sap.m.MessageBox.error("Error rendering PDF: " + err.message);
                }

            },
            onConfirmPrint: function () {
                var oCombo = sap.ui.getCore().byId("printType");
                var sType = oCombo.getSelectedKey();

                if (!sType) {
                    sap.m.MessageToast.show("Please select a print type.");
                    return;
                }

                this.getPDFBase64(sType)
                //this._oPrintDialog.close();
            },

            onCancelPrint: function () {
                that._oPrintDialog.close();
            },
            getPDFBase64: function (sType) {
                var that = this;
                var sPath = "/PrintPDFSet(TransactionId='" + that.sTransactionId + "',PDFType='" + sType + "')";
                this.oModel.read(sPath, {
                    urlParameters: { "$expand": "ToPDFList" },
                    success: function (oData) {
                        if (oData.ToPDFList.results[0] && oData.ToPDFList.results[0].Value) {
                            that.onShowPDFSEPP(oData.ToPDFList.results[0].Value);
                        }
                        else {
                            sap.m.MessageToast.show("Error fetching PDF.");
                        }
                    },
                    error: function () {
                        sap.m.MessageToast.show("Error fetching PDF.");
                    }
                });

            },
            onShowPDFSEPP: async function (base64Content) {
                var oPrintBox = this.getView().byId("printBox");
                oPrintBox.setVisible(true);
                var oHtmlControl = this.getView().byId("pdfCanvas");
                var iframeContent = '<div id="pdf-viewport"></div>';
                oHtmlControl.setContent(iframeContent);
                oHtmlControl.invalidate(); // force re-render
                sap.ui.getCore().applyChanges(); // immediately render changes
                oHtmlControl.setVisible(true);

                var byteCharacters = atob(base64Content);
                var byteNumbers = new Array(byteCharacters.length);

                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }

                var byteArray = new Uint8Array(byteNumbers);


                var blob = new Blob([byteArray], {
                    type: 'application/pdf'
                });


                var pdfUrl = URL.createObjectURL(blob);

               // var printerIp = "192.168.10.75"; // your Epson printer IP

                try {
                    const canvas = await this.loadPdfToCanvas(pdfUrl);
                    this.canvasp = canvas;
                    //this.printerIP = printerIp;


                } catch (err) {
                    MessageBox.error("Error rendering or printing PDF: " + err.message);
                }

            },
            isSingleColor: function (imageData) {
                const stride = 4;
                for (let offset = 0; offset < stride; offset++) {
                    const first = imageData[offset];
                    for (let i = offset; i < imageData.length; i += stride) {
                        if (first !== imageData[i]) {
                            return false;
                        }
                    }
                }
                return true;
            },
            loadPdfToCanvas: async function (pdfUrl) {
                await this.ensurePdfJsLib();

                try {
                    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
                    const printerWidth = 576;
                    const canvasArray = [];

                    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                        const page = await pdfDoc.getPage(pageNum);
                        const scale = printerWidth / page.getViewport({ scale: 1 }).width;
                        const viewport = page.getViewport({ scale });
                        const pdfContainer = document.getElementById("pdf-viewport");
                        const canvas = document.createElement("canvas");
                        // pdfContainer.appendChild(canvas);
                        const width = viewport.width;
                        const height = viewport.height;
                        canvas.height = height;
                        canvas.width = width;
                        canvas.style.width = Math.floor(width) + "px";
                        canvas.style.height = Math.floor(height) + "px";
                        canvas.setAttribute("willReadFrequently", "true");
                        // canvas.width = viewport.width;
                        // canvas.height = viewport.height;
                        const context = canvas.getContext("2d", { willReadFrequently: true });
                        context.clearRect(0, 0, width, height);

                        await page.render({
                            canvasContext: context,
                            viewport
                        }).promise;

                        let top = 0;
                        let bottom = height;
                        let left = 0;
                        let right = width;

                        while (top < bottom) {
                            const imageData = context.getImageData(
                                left,
                                top,
                                right - left,
                                1
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            top++;
                        }
                        while (top < bottom) {
                            const imageData = context.getImageData(
                                left,
                                bottom,
                                right - left,
                                1
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            bottom--;
                        }
                        while (left < right) {
                            const imageData = context.getImageData(
                                left,
                                top,
                                1,
                                bottom - top
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            left++;
                        }
                        while (left < right) {
                            const imageData = context.getImageData(
                                right,
                                top,
                                1,
                                bottom - top
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            right--;
                        }

                        context.clearRect(0, 0, width, height);
                        const adjustedScale = printerWidth / (right - left);
                        const adjustedWidth = (right - left) * adjustedScale;
                        const adjustedHeight = (bottom - top) * adjustedScale;

                        canvas.height = adjustedHeight + 10;
                        canvas.width = adjustedWidth;
                        canvas.style.width = `${adjustedWidth}px`;
                        canvas.style.height = `${adjustedHeight}px`;

                        pdfContainer.appendChild(canvas);
                        await page.render({
                            canvasContext: context,
                            viewport,
                        }).promise;

                        // Store each rendered canvas
                        canvasArray.push(canvas);
                    }

                    // Now return array of canvases or send to printer
                    return canvasArray;

                } catch (error) {
                    console.error("Error loading PDF:", error);
                    MessageToast.show("Failed to load PDF: " + error.message);
                }
            },
            ensurePdfJsLib: async function () {
                if (!window.pdfjsLib) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement("script");
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                        script.onload = () => {
                            window.pdfjsLib = window['pdfjs-dist/build/pdf'];
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                            resolve();
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
            },

            sendToEpsonPrinter: function (canvases, printerIp) {
                var ePosDev = new epson.ePOSDevice();

                //printerIp = this.printerIP;
                ePosDev.connect(printerIp, 8043, function (resultConnect) {
                    if (resultConnect === "OK" || resultConnect == "SSL_CONNECT_OK") {
                        ePosDev.createDevice("local_printer", ePosDev.DEVICE_TYPE_PRINTER,
                            { crypto: false, buffer: false },
                            function (deviceObj, resultCreate) {
                                if (resultCreate === "OK") {
                                    var printer = deviceObj;



                                    printer.brightness = 1.0;
                                    printer.halftone = printer.HALFTONE_ERROR_DIFFUSION;
                                    for (const canvas of canvases) {
                                        printer.addImage(canvas.getContext("2d", { willReadFrequently: true }), 0, 0, canvas.width, canvas.height, printer.COLOR_1, printer.MODE_MONO);
                                    }


                                    printer.addCut(printer.CUT_FEED);
                                    printer.send();

                                    window.location.reload(true);

                                    // printer.send(function (resultSend) {
                                    //     if (resultSend === "OK") {
                                    //         sap.m.MessageToast.show("Printed successfully!");
                                    //     } else {
                                    //         sap.m.MessageBox.error("Print failed: " + resultSend);
                                    //     }
                                    // });
                                } else {
                                    sap.m.MessageBox.error("Failed to create device: " + resultCreate);
                                }
                            }
                        );
                    } else {
                        //sap.m.MessageBox.error("Connection failed: " + resultConnect);
                        sap.m.MessageBox.error("Connection failed: " + resultConnect, {
                            title: "Error",
                            actions: [sap.m.MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === sap.m.MessageBox.Action.OK) {
                                    window.location.reload(true);
                                }
                            }.bind(this)
                        });
                    }
                });
            },

        });
    });
