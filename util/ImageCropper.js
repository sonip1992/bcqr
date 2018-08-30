sap.ui.define([
    "sap/ui/core/Control"
], function (Control) {
	"use strict";

	return Control.extend("com.demo.qr_bc.DemoQR_BC.util.ImageCropper", {
		metadata: {
            properties: {
                "width": {type : "sap.ui.core.CSSSize", defaultValue : "735px"},
                "height": {type : "sap.ui.core.CSSSize", defaultValue : "414px"},
                "autoRotation": {type : "boolean", defaultValue : true},
                "image": "string"
            },
            publicMethods: []
            
		},

		init: function (e) {
            this.startX = 0;
            this.startY = 0;
            this.startMoveX = 0;
            this.startMoveY = 0;
            this.moveX = 0;
            this.moveY = 0;
            this.startscale = 1;
            this.lastscale = 1;
            this.scale = 1;
            this.startrotation = 0;
            this.lastrotation = 0;
            this.rotation = 0;
            this.currentTransform = {scale:1,translate:[0,0],rotate:0};
		},

        _updateTransformNow: function() {
            const c = this;
            var transform = "";

            //c.context.save();

            for (var prop in this.currentTransform) {
                var value = this.currentTransform[prop];

                if (prop == "rotate") {
                    transform += " " + prop + "(" + value + "deg)";
                    
                    continue;
                }
                if (prop == "translate") {
                    transform += " " + prop + "3d(" + value[0] + "px," + value[1] + "px,0)";
                    
                    continue;
                }
                if (prop == "scale") {
                    transform += " " + prop + "3d(" + value + "," + value + ",1)";
                    
                    continue;
                }
            }
            c.$img.css("transform", transform);
        },

        _updateTransform: function() {
            this._updateTransformNow();
            /*
            if (this.updating) {
                return;
            }
            const c = this;

            c.updating = true;
            setTimeout(function() {
                c.updating = false;
                c._updateTransformNow();
            }, 1);
            */
            
        },

        _scaleImage: function(newScale) {
            this.scale = Math.max(0.2, Math.min(5,newScale));
            this.currentTransform.scale = this.scale;
            this._updateTransform();
        },

        _rotateImage: function(deg) {
            this.rotation += deg;
            this.currentTransform.rotate = this.rotation;
            this._updateTransform();
        },

        _rotateImageAbs: function(deg) {
            this.rotation = deg;
            this.currentTransform.rotate = this.rotation;
            this._updateTransform();
        },

        _moveImage: function(x, y) {
            const c = this;
            c.moveX = c.startMoveX + x / c.scale;
            c.moveY = c.startMoveY + y / c.scale;
            c.currentTransform.translate = [c.moveX, c.moveY];
            c._updateTransform();
        },


        _addEventListeners: function() {
            const c = this;

           
            document.body.addEventListener("touchmove", function(event) {
                event.preventDefault();
            }, false);

            c.$img.on("mousewheel", function(e) {
                var delta = e.originalEvent.wheelDelta;
                if (e.shiftKey) {
                    c._rotateImage(delta / 120);
                }
                else {
                    c._scaleImage(c.scale + delta / 1200);
                }
            });

            
            var hammertime = new Hammer(c.img, {
                preventDefault: true
            });
            hammertime.get('pinch').set({ enable: true });
            hammertime.get('rotate').set({ enable: true });

            hammertime.on('panstart pan panend pinchstart pinch pinchend rotatestart rotate rotateend', function(ev) {

                switch (ev.type) {
                    case "rotatestart":
                        c.startrotation = ev.rotation;
                        break;

                    case "rotate":
                        c._rotateImageAbs(c.lastrotation-c.startrotation+ev.rotation);
                        break;

                    case "rotateend":
                        c.lastrotation = c.rotation;
                        break;

                    case "pinchstart":

                        c.startscale = ev.scale;
                        break;

                    case "pinch":
                        c._scaleImage(c.lastscale * ev.scale / c.startscale);
                        
                        break;

                    case "pinchend":
                        c.lastscale = c.scale;
                        break;

                    case "panstart":
                        c.startX = ev.deltaX;
                        c.startY = ev.deltaY;
                        break;

                    case "pan":
                        c._moveImage(ev.deltaX-c.startX, ev.deltaY-c.startY);
                        break;

                    case "panend":
                        c.startMoveX = c.moveX;
                        c.startMoveY = c.moveY;
                        break;
                    
                }
            });
            
        },

        resetCanvas: function() {
            const c = this;

            if (c.context) {
                //Reset any other transforms which were made to this context
                if (c.context.resetTransform) {
                    c.context.resetTransform();
                }
                //Fallback, Edge is not supporting resetTransform on Context2D
                else {
                    c.context.setTransform(1, 0, 0, 1, 0, 0);
                }

                //Clear the canvas
                c.context.clearRect(0,0,c.canvas.width,c.canvas.height);

                //Clear path
                c.context.beginPath();
            }
            
        },

        reset: function() {
            this.resetCanvas();
            this.startMoveX = 0;
            this.startMoveY = 0;
            this.moveX = 0;
            this.moveY = 0;
            this.scale = 1;
            this.rotation = 0;
            this.currentTransform = {scale:1,translate:[0,0],rotate:0};
        },

        moveTo: function(x, y) {
            this._moveImage(x,y);
        },

        rotate: function(degree) {
            this._rotateImage(degree);
        },

        rotateTo: function(degree) {
            this._rotateImage(this.rotation+degree);
        },

        scaleTo: function(scale) {
            this._scaleImage(scale);
        },

        center: function() {
            const c = this;
            var longSideImg = Math.max(c.img.width, c.img.height);
            var shortSideImg = Math.min(c.img.width, c.img.height);
            var longSideCanvas = Math.max(c.canvas.width, c.canvas.height);
            var shortSideCanvas = Math.min(c.canvas.width, c.canvas.height);
            
            var scale = longSideCanvas / longSideImg;
            this._scaleImage(scale*1.2);
            //

            if (c.getAutoRotation()) {
                if ((c.img.width > c.img.height && c.canvas.width < c.canvas.height) ||
                    (c.img.height > c.img.width && c.canvas.height < c.canvas.width)
                   ){
                    var moveX = c.canvas.width/2-c.img.height/2;
                    var moveY = c.canvas.height/2-c.img.width/2;
                    c._moveImage(moveX,moveY);
                    c.startMoveX = moveX;
                    c.startMoveY = moveY;
                    c._rotateImage(90);
                }
            }
            else {
                c._moveImage(longSideImg/2-longSideCanvas/2,shortSideImg/2-shortSideCanvas/2);
            }
        },

        crop: function() {
            const c = this;
            return new Promise(function(resolve, reject) {
                //Scaled sizes of the image
                const scaledWidth = c.img.width*c.scale;
                const scaledHeight = c.img.height*c.scale;

                //Destination coordinates, to the upper left corner of the scaled image
                const destX = c.moveX*c.scale+(c.img.width/2-scaledWidth/2);
                const destY = c.moveY*c.scale+(c.img.height/2-scaledHeight/2);

                //Translation coordinates, to the center of the scaled image
                const tX = destX + scaledWidth/2;
                const tY = destY + scaledHeight/2;


                c.resetCanvas();

                c.context.beginPath();
                c.context.rect(0,0,c.canvas.width,c.canvas.height);
                c.context.fillStyle="white";
                c.context.fill();
                c.context.beginPath();

                //Before we can rotate the image, first translate it to the rotation point (center of scaled image)
                c.context.translate(tX, tY);
                c.context.rotate(c.rotation * Math.PI / 180);
                c.context.translate(-tX, -tY);

                //Draw (and scale) the whole source image to the destination point
                c.context.drawImage(c.img, 0,0,c.img.naturalWidth, c.img.naturalHeight, destX, destY, scaledWidth, scaledHeight);


                var picture = {};
                picture.dataURL = c.canvas.toDataURL("image/jpeg");

                if (typeof c.canvas.toBlob !== "undefined") {
					c.canvas.toBlob(function(blob) {
                        picture.blob = blob;
                        resolve(picture);
					}, "image/jpeg", 1);
				}
				else if (typeof c.canvas.msToBlob !== "undefined") {
                    picture.blob = c.canvas.msToBlob();
                    resolve(picture);
				}
				else {
					reject("Canvas.toBlob is not supported in your browser", "browser");
				}
            });
            
        },
        

		renderer : function (oRM, oControl) {
            oRM.write("<div");
            oRM.writeControlData(oControl);

            oRM.addClass("sapIcnImageCropperContainer");

            oRM.writeClasses();
            oRM.write(">");

            oRM.write('<img src="" class="sapIcnImageCropperImage" />');
            oRM.write('<canvas class="sapIcnImageCropperCanvas" />');

            oRM.write("</div>");
		},

        onAfterRendering: function(oEvent) {
            const c = this;

            //if I need to do any post render actions, it will happen here
            if(sap.ui.core.Control.prototype.onAfterRendering) {
                 sap.ui.core.Control.prototype.onAfterRendering.apply(this,arguments); //run the super class's method first
            }


            const id = c.getId();

            c.container = $("#" + id + ".sapIcnImageCropperContainer");

            c.$canvas = $("#" + id + " canvas.sapIcnImageCropperCanvas");
            c.canvas = c.$canvas[0];
            c.canvas.width = parseInt(c.getWidth());
            c.canvas.height = parseInt(c.getHeight());
            c.context = c.canvas.getContext('2d');

            c.$img = $("#" + id + " img.sapIcnImageCropperImage");
            c.img = c.$img[0];

            c.img.src = this.getImage();

            function imageLoad() {
                c.img.removeEventListener("load", imageLoad, false);
            }

            c.img.addEventListener("load", imageLoad, false);

            c._addEventListeners(oEvent);
       },

        exit: function(e) {

        }
	});
});