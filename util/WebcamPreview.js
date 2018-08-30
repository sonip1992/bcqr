sap.ui.define([
    "sap/ui/core/Control"
], function (Control) {
	"use strict";

	return Control.extend("com.demo.qr_bc.DemoQR_BC.util.WebcamPreview", {
		metadata: {
            properties: {
                "autoStart": {type : "boolean", defaultValue : true}
            },
            publicMethods: [],
            events: {
                webcamLoaded: {
                    parameters: {
                        info: {type: "object"}
                    }
                },
                webcamError: {
                    parameters: {
                        error: {type: "string"}
                    }
                }
            }
            
		},

		init: function (e) {
            this.started = false;
            this.starting = false;
		},

        getInputWidth: function() {
            if (!this.started) throw new Error("You can't call getInputWidth without first starting the control.");
            return this.inputWidth;
        },

        getInputHeight: function() {
            if (!this.started) throw new Error("You can't call getInputHeight without first starting the control.");
            return this.inputHeight;
        },

        start: function() {
            const c = this;
            c.stop();
            c.starting = true;
            
            return new Promise(function(resolve, reject) {
                

                function hasGetUserMedia() {
                    return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia || navigator.msGetUserMedia);
                }

                var errorCallback = function(e) {
                    c.starting = false;
                    c.started = false;
                    reject("There has been an error while requesting the camera", e);
                    return;
                };

                if (hasGetUserMedia()) {
                    var constraint = {
                        video: {
                            width: {min: 1280, ideal:1920},
                            height: {min: 720, ideal:1080},
                            facingMode: "environment"
                        }, 
                        audio: false};
                    if (window.constraint) {
                        constraint = window.constraint;
                    }
                    
                    navigator.mediaDevices.getUserMedia(constraint)
                        .then(function(stream) {
                            c.video.src = window.URL.createObjectURL(stream);
                            c.mediaStream = stream;


                            var startTime = new Date().getTime();

                            function checkVideoSize() {
                                var time = new Date().getTime();
                                var diff = time - startTime;
                                //10sec Fallback
                                if (diff > 10000) {
                                    c.started = true;
                                    c.inputWidth = 1920;
                                    c.inputHeight = 1080;
                                    c.canvas.width = c.inputWidth;
                                    c.canvas.height = c.inputHeight;
                                    resolve({inputWidth:c.inputWidth, inputHeight:c.inputHeight,stream:stream});
                                }
                                else {
                                    if (c.video.videoWidth === 0) {
                                        setTimeout(checkVideoSize, 100);
                                    }
                                    else {
                                        c.started = true;
                                        c.inputWidth = c.video.videoWidth;
                                        c.inputHeight = c.video.videoHeight;
                                        c.canvas.width = c.inputWidth;
                                        c.canvas.height = c.inputHeight;
                                        resolve({inputWidth:c.inputWidth, inputHeight:c.inputHeight,stream:stream});
                                    }
                                }
                            }

                            function getVideoSize() {
                                c.video.removeEventListener('playing', getVideoSize, false);

                                checkVideoSize();
                            }

                            c.video.addEventListener('playing', getVideoSize, false);
                            
                        }).catch(errorCallback);
                    
                } else {
                    c.starting = false;
                    c.started = false;
                    reject("Navigator.getUserMedia is not supported in your browser");
                    return;
                }
            });
            
        },

        stop: function() {
            const c = this;

            if (c.mediaStream && c.mediaStream.getTracks) {
                var tracks = c.mediaStream.getTracks();
                for (var i = 0; i < tracks.length; i++) {
                    tracks[i].stop();
                }
            }
            c.mediaStream = null;
            c.starting = false;
            c.started = false;
        },

        snapshot: function() {
            if (!this.started) throw new Error("You can't call snapshot without first starting the control.");
            if (!this.mediaStream) throw new Error("No media stream found on control.");
            const c = this;
            
            return new Promise(function(resolve, reject) {
                c.context.drawImage(c.video, 0, 0);
                resolve(c.canvas.toDataURL('image/jpeg'));
                
            });
        },
        

		renderer : function (oRM, oControl) {
            oRM.write("<div");
            oRM.writeControlData(oControl);

            oRM.addClass("sapIcnWebcamPreviewContainer");

            oRM.writeClasses();
            oRM.write(">");

            oRM.write('<video class="sapIcnWebcamPreviewVideo" autoPlay="autoPlay" />');
            oRM.write('<canvas class="sapIcnWebcamPreviewCanvas" />');

            oRM.write("</div>");
		},

        onAfterRendering: function(oEvent) {
            const c = this;

            //if I need to do any post render actions, it will happen here
            if(sap.ui.core.Control.prototype.onAfterRendering) {
                 sap.ui.core.Control.prototype.onAfterRendering.apply(this,arguments); //run the super class's method first
            }


            const id = c.getId();

            c.$canvas = $("#" + id + " canvas.sapIcnWebcamPreviewCanvas");
            c.canvas = c.$canvas[0];
            c.context = c.canvas.getContext('2d');

            c.$video = $("#" + id + " video.sapIcnWebcamPreviewVideo");
            c.video = c.$video[0];

            if (c.getAutoStart() && !c.starting && !c.started) {
                c.start().then(function(webcam) {
                    c.fireEvent("webcamLoaded", {info:webcam});
                }).catch(function(error) {
                    c.fireEvent("webcamError", {error:error});
                });
            }
       },

        exit: function(e) {
            this.stop();
        }
	});
});