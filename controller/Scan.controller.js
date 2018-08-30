/* global Quagga:true */
/* global qrcode:true */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/demo/qr_bc/DemoQR_BC/libs/quagga",
	"com/demo/qr_bc/DemoQR_BC/js/grid",
	"com/demo/qr_bc/DemoQR_BC/js/version",
	"com/demo/qr_bc/DemoQR_BC/js/detector",
	"com/demo/qr_bc/DemoQR_BC/js/formatinf",
	"com/demo/qr_bc/DemoQR_BC/js/errorlevel",
	"com/demo/qr_bc/DemoQR_BC/js/bitmat",
	"com/demo/qr_bc/DemoQR_BC/js/datablock",
	"com/demo/qr_bc/DemoQR_BC/js/bmparser",
	"com/demo/qr_bc/DemoQR_BC/js/datamask",
	"com/demo/qr_bc/DemoQR_BC/js/rsdecoder",
	"com/demo/qr_bc/DemoQR_BC/js/gf256poly",
	"com/demo/qr_bc/DemoQR_BC/js/gf256",
	"com/demo/qr_bc/DemoQR_BC/js/decoder",
	"com/demo/qr_bc/DemoQR_BC/js/qrcode",
	"com/demo/qr_bc/DemoQR_BC/js/findpat",
	"com/demo/qr_bc/DemoQR_BC/js/alignpat",
	"com/demo/qr_bc/DemoQR_BC/js/databr",
	"com/demo/qr_bc/DemoQR_BC/util/WebcamPreview",
	"com/demo/qr_bc/DemoQR_BC/util/ImageCropper"
], function (Controller, quaggajs, grid, version, detector, formatinf, errorlevel, bitmat, datablock, bmparser, datamask, rsdecoder,
	gf256poly, gf256, decoder, qr, findpat, alignpat, databr, Webcam, ImageCropper) {
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
					this.getView().byId("scannedQRValue").setValue(data);
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
		},

		onScanForImage: function (oEvent) {
			var _ctrlSrc = oEvent.getSource();
			var _btnText = _ctrlSrc.getText();
			var c = this;

			if (_btnText === "Remove Image") {
				this.onReset(null);
				return;
			}

			var bar = new sap.m.Bar("imgTool", {
				visible: false,
				contentLeft: new sap.m.Button({
					text: "Retake",
					press: function (oEvent) {
						c.onRetake(oEvent);
					},
					icon: "sap-icon://reset"
				}),
				contentMiddle: [
					new sap.m.Button({
						text: "Rotate Left",
						press: function (oEvent) {
							c.onRotateLeft(oEvent);
						}
					}),
					new sap.m.Button({
						text: "Center",
						press: function (oEvent) {
							c.onCenter(oEvent);
						}
					}),
					new sap.m.Button({
						text: "Rotate Right",
						press: function (oEvent) {
							c.onRotateRight(oEvent);
						}
					})
				],
				contentRight: new sap.m.Button({
					text: "Save",
					press: function (oEvent) {
						c.onSavePicture(oEvent);
					},
					icon: "sap-icon://save"
				})
			});

			var webcam = this.getWebCamCtrl();

			this._dialog = new sap.m.Dialog({
				title: "Scan Window",
				content: [bar, webcam],
				beginButton: new sap.m.Button({
					text: 'Take Picture',
					type: "Accept",
					press: function (oEvent) {
						c.onTakePicture(oEvent);
					}
				}),
				endButton: new sap.m.Button({
					text: 'Cancel',
					press: function () {
						c._dialog.close();
					}
				}),
				afterClose: function () {
					c._dialog.destroy();
				}
			});

			this._dialog.open();
		},

		getWebCamCtrl: function () {
			return new Webcam("webcam", {
				webcamLoaded: function () {
					console.log("Webcam Started");
				},
				webcamError: function (oEvent) {
					console.log(oEvent.getParameter("error"));
				}
			})
		},

		onTakePicture: function () {
			var c = this;
			sap.ui.getCore().byId("webcam").snapshot().then(function (dataURL) {
				c._dialog.getBeginButton().setEnabled(false);
				c.picture = dataURL;
				c.switchToCrop();
			}).catch(function (error) {
				console.log(error);
			});
		},

		onRetake: function () {
			sap.ui.getCore().byId("imgTool").setVisible(false);
			this._dialog.getBeginButton().setEnabled(true);
			this._dialog.removeContent(1);
			sap.ui.getCore().byId("imageCropper").destroy();
			var webcam = this.getWebCamCtrl();
			this._dialog.addContent(webcam);
		},

		switchToCrop: function () {
			var c = this;
			sap.ui.getCore().byId("webcam").stop();
			sap.ui.getCore().byId("imgTool").setVisible(true);
			this._dialog.removeContent(1);
			sap.ui.getCore().byId("webcam").destroy();
			this._dialog.addContent(new ImageCropper("imageCropper", {
				image: c.picture
			}));
		},

		onSavePicture: function (event) {
			var c = this;
			sap.ui.getCore().byId("imageCropper").crop().then(function (picture) {
				c.croppedPicture = picture.dataURL;
				c._dialog.close();
				sap.ui.getCore().byId("imageCropper").destroy();
				c.byId("imgCtrl").setSrc(c.croppedPicture);
				c.byId("image").setText("Remove Image");
				c.byId("image").setType("Reject");
			});
		},

		onVerify: function () {

		},

		onReset: function (oEvent) {
			if (oEvent !== null) {
				this.byId("scannedValue").setValue("");
				this.byId("scannedQRValue").setValue("");
			}
			this.byId("imgCtrl").setSrc(null);
			this.byId("image").setText("Capture Image");
			this.byId("image").setType("Default");
			this.picture = "";
			this.croppedPicture = "";
		}

	});
});
