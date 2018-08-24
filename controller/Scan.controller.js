/* global Quagga:true */
/* global qrcode:true */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/demo/qr_bc/DemoQR_BC/libs/quagga"
], function (Controller, quaggajs) {
	"use strict";

	return Controller.extend("com.demo.qr_bc.DemoQR_BC.controller.Scan", {
		onScanForBC: function (oEvent) {
			if (!this._oScanDialog) {
				this._oScanDialog = new sap.m.Dialog({
					title: "Scan barcode",
					contentWidth: "640px",
					contentHeight: "480px",
					horizontalScrolling: false,
					verticalScrolling: false,
					stretchOnPhone: true,
					content: [new sap.ui.core.HTML({
						id: this.createId("scanContainer"),
						content: "<div />"
					})],
					endButton: new sap.m.Button({
						text: "Cancel",
						press: function (oEvent) {
							this._oScanDialog.close();
						}.bind(this)
					}),
					afterOpen: function () {
						// TODO: Investigate why Quagga.init needs to be called every time...possibly because DOM 
						// element is destroyed each time dialog is closed
						this._initQuagga(this.getView().byId("scanContainer").getDomRef()).done(function () {
							// Initialisation done, start Quagga
							Quagga.start();
						}).fail(function (oError) {
							// Failed to initialise, show message and close dialog...this should not happen as we have
							// already checked for camera device ni /model/models.js and hidden the scan button if none detected
							MessageBox.error(oError.message.length ? oError.message : ("Failed to initialise Quagga with reason code " + oError.name), {
								onClose: function () {
									this._oScanDialog.close();
								}.bind(this)
							});
						}.bind(this));
					}.bind(this),
					afterClose: function () {
						// Dialog closed, stop Quagga
						Quagga.stop();
					}
				});

				this.getView().addDependent(this._oScanDialog);
			}

			this._oScanDialog.open();
		},

		_initQuagga: function (oTarget) {
			var oDeferred = jQuery.Deferred();

			// Initialise Quagga plugin - see https://serratus.github.io/quaggaJS/#configobject for details
			Quagga.init({
				inputStream: {
					type: "LiveStream",
					target: oTarget,
					constraints: {
						width: {
							min: 640
						},
						height: {
							min: 480
						},
						facingMode: "environment"
					}
				},
				locator: {
					patchSize: "medium",
					halfSample: true
				},
				numOfWorkers: 2,
				frequency: 10,
				decoder: {
					readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'code_39_vin_reader', 'codabar_reader',
						'upc_reader', 'upc_e_reader', 'i2of5_reader', '2of5_reader', 'code_93_reader'
					]
				},
				locate: true
			}, function (error) {
				if (error) {
					oDeferred.reject(error);
				} else {
					oDeferred.resolve();
				}
			});

			if (!this._bQuaggaEventHandlersAttached) {
				// Attach event handlers...

				Quagga.onProcessed(function (result) {
					var drawingCtx = Quagga.canvas.ctx.overlay,
						drawingCanvas = Quagga.canvas.dom.overlay;

					if (result) {
						// The following will attempt to draw boxes around detected barcodes
						if (result.boxes) {
							drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
							result.boxes.filter(function (box) {
								return box !== result.box;
							}).forEach(function (box) {
								Quagga.ImageDebug.drawPath(box, {
									x: 0,
									y: 1
								}, drawingCtx, {
									color: "green",
									lineWidth: 2
								});
							});
						}

						if (result.box) {
							Quagga.ImageDebug.drawPath(result.box, {
								x: 0,
								y: 1
							}, drawingCtx, {
								color: "#00F",
								lineWidth: 2
							});
						}

						if (result.codeResult && result.codeResult.code) {
							Quagga.ImageDebug.drawPath(result.line, {
								x: 'x',
								y: 'y'
							}, drawingCtx, {
								color: 'red',
								lineWidth: 3
							});
						}
					}
				}.bind(this));

				Quagga.onDetected(function (result) {
					// Barcode has been detected, value will be in result.codeResult.code. If requierd, validations can be done 
					// on result.codeResult.code to ensure the correct format/type of barcode value has been picked up

					// Set barcode value in input field
					this.getView().byId("scannedValue").setValue(result.codeResult.code);

					// Close dialog
					this._oScanDialog.close();
				}.bind(this));

				// Set flag so that event handlers are only attached once...
				this._bQuaggaEventHandlersAttached = true;
			}

			return oDeferred.promise();
		},

		onScanForQR: function (oEvent) {
			this.codeScanned = false;
			var container = new sap.m.VBox({
				"width": "512px",
				"height": "384px"
			});
			var button = new sap.m.Button("", {
				text: "Cancel",
				type: "Reject",
				press: function () {
					dialog.close();
				}
			});
			var dialog = new sap.m.Dialog({
				title: "Scan Window",
				content: [
					container,
					button
				]
			});
			dialog.open();
			var video = document.createElement("video");
			video.autoplay = true;
			var that = this;
			qrcode.callback = function (data) {
				if (data !== "error decoding QR Code") {
					this.codeScanned = true;
					that._oScannedInspLot = data;
					//sap.m.MessageBox.alert(data);//Message Pops up for scanned Value
					dialog.close();

				}
			}.bind(this);

			var canvas = document.createElement("canvas");
			canvas.width = 512;
			canvas.height = 384;
			navigator.mediaDevices.getUserMedia({
					audio: false,
					video: {
						facingMode: "environment",
						width: {
							ideal: 512
						},
						height: {
							ideal: 384
						}
					}
				})
				.then(function (stream) {
					video.srcObject = stream;
					var ctx = canvas.getContext('2d');
					var loop = (function () {
						if (this.codeScanned) {
							//video.stop();
							return;
						} else {
							ctx.drawImage(video, 0, 0);
							setTimeout(loop, 1000 / 30); // drawing at 30fps
							qrcode.decode(canvas.toDataURL());
						}
					}.bind(this));
					loop();
				}.bind(this))
				.catch(function (error) {
					sap.m.MessageBox.error("Unable to get Video Stream");
				});

			container.getDomRef().appendChild(canvas);
		}
	});
});