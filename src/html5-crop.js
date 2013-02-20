/*global detect, toCenter, alert, module , require */
var html5Crop;
var base_canvas, darken_canvas, f_canvas;

html5Crop = (function() {
    var utils = require('./utils.js') || utils;

    var o, modal, $modal, $modal_blocker, $btn_crop, $btn_cancel, freeze_x, freeze_y, $ui;

    var setDot = function(dot_name, value) {
        var it = this;
        it[dot_name] = value;
        return function(value) {
            //if (freeze_x && $.inArray(dot_name, ['lt_x', 'lb_x', 'rt_x', 'rb_x']) != -1) { return it[dot_name]; }
            //if (freeze_y && $.inArray(dot_name, ['lt_y', 'lb_y', 'rt_y', 'rb_y']) != -1) { return it[dot_name]; }
            it[dot_name] = value !== undefined ? value : it[dot_name];
            return it[dot_name];
        };
    };

    var dots = {
        lt: {x: setDot('lt_x'),   y: setDot('lt_y')}, rt: {x: setDot('rt_x'), y: setDot('rt_y')},
        lb: {x: setDot('lb_x'),   y: setDot('lb_y')}, rb: {x: setDot('rb_x'), y: setDot('rb_y')}

    };

    var getDotInThisPosition = function(x, y) {
        return utils.detect(dots, function(dot) {
            return Boolean((dot.x() < x && x < (dot.x() + o.dot_side)) && (dot.y() < y && y < (dot.y() + o.dot_side)));
        });
    };

    var isPositionInArea = function(x, y) {
        return (dots.lt.x() < x && x < dots.rt.x() + o.dot_side || dots.rt.x() < x && x < dots.lt.x() + o.dot_side) &&
               (dots.lt.y() < y && y < dots.lb.y() + o.dot_side || dots.lb.y() < y && y < dots.lt.y() + o.dot_side );
    };

    var setActiveDot = function(dot) {
        $.each(dots, function(i, _dot) { _dot.active = _dot == dot; });
    };

    var getXLimit = function(dot, limit_size) {
        return dot == dots.lt || dot == dots.lb ?
            dots.rt.x() - limit_size : dots.lt.x() + limit_size;
    };

    var getYLimit= function(dot, limit_size) {
        return dot == dots.lt || dot == dots.rt ?
            dots.lb.y() - limit_size : dots.lt.y() + limit_size;
    };

    var getSideX = function(dot, x) {
        var x1 = x;
        var x2 = (dots.lt == dot || dots.lb == dot) ? dots.rt.x() : dots.lt.x();
        return Math.abs(x1-x2);
    };

    var getSideY = function(dot, y) {
        var y1 = y;
        var y2 = (dots.lt == dot || dots.rt == dot) ? dots.lb.y() : dots.lt.y();
        return Math.abs(y1-y2);
    };

    var checkXOutOfBorders = function() {
        var min_limit = - o.dot_side/2,
            max_limit = base_canvas.width - o.dot_side/2,
            dot = utils.detect(dots, function(dot) {
                return dot.x() <= min_limit || dot.x() > max_limit;
            });

        if (!dot) { return false; }
        var compass = dot.x() <= 0 ? 'west' : 'east',
            limit = compass == 'west' ? min_limit: max_limit;

        return {dot: dot, compass: compass , limit: limit};
    };

    var checkYOutOfBorders = function() {
        var min_limit = - o.dot_side/2,
            max_limit = base_canvas.height - o.dot_side/2,
            dot = utils.detect(dots, function(dot) {
                return dot.y() <= min_limit || dot.y() > max_limit;
            });

        if (!dot) { return false; }
        var compass = dot.y() <= 0 ? 'north' : 'south',
            limit = compass == 'north' ? min_limit: max_limit;

        return {dot: dot, compass: compass , limit: limit};
    };

    var setInitDotsValues = function(side, w, h) {
        var x = w/2 - side/2, y = h/2 - side/2;
        dots.lt.x(x); dots.lt.y(y); 
        dots.lb.x(x); dots.lb.y(y + side); 
        dots.rt.x(x + side); dots.rt.y(y); 
        dots.rb.x(x + side); dots.rb.y(y + side); 
    };

    var showNativeModal = function() {
        $modal_blocker.show();
        toCenter($modal);
    };

    var setUiToModal = function() {
        if (o.use_native_modal) {
            $modal.append($ui);
            showNativeModal();
        }
        o.onDomCreated($ui);
    };

    return {
        init: function(options) {
            o = $.extend({
                CROP_NAME: 'резать',
                CANCEL: 'отмена',
                MIN_IMG_SIDE_ERROR: 'Слишком маленькое изображение по ширине или выстоте',
                CANVAS_NOT_SUPPORTED: 'canvas not supported in this browser',
                square_mode: true,

                max_crop_side: 400,
                min_crop_side: 50,

                max_img_side: 600,
                min_img_side: 100,

                init_crop_side: 100,
                dot_side: 10,

                use_native_modal: true,
                use_native_button: true,

                onDomCreated: function($ui) {},
                oncancel: function() {},
                oncrop: function(cropped_url) {},
                alertFn: function(msg) { alert(msg); },

                modal_class: 'modal'
            }, options);

            $ui = $("<div>" +
                        "<div style='position: relative'>" +
                            "<canvas></canvas>" +
                            "<canvas style='position:absolute; top:0; left:0'></canvas>" +
                            "<canvas style='position:absolute; top:0; left:0'></canvas>" +
                        "</div>" +
                    "</div>");

            if (o.use_native_modal) {
                $modal_blocker = $(utils.supplant(
                    "<div class='darken_bgr' style='display:none'>" +
                        "<div class='{modal_class}' style='position:fixed;'>" +
                        "</div>" +
                    "</div>", {modal_class: o.modal_class}));

                $modal = $modal_blocker.find("." + o.modal_class);
            }
            if (o.use_native_button) {
                $btn_crop = 
                    $(utils.supplant("<input type='button' name='crop' value='{cropname}'/>", {cropname: o.CROP_NAME}));
                $btn_cancel = 
                    $(utils.supplant("<input type='button' name='cancel' value='{cancel}'/>", {cancel: o.CANCEL}));
                $ui.append($btn_crop).append($btn_cancel);
            }

            var $canvases = $ui.find('canvas');
            base_canvas   = $canvases[0];
            darken_canvas = $canvases[1];
            f_canvas      = $canvases[2];

            if (!base_canvas.getContext) {
                o.alertFn(o.CANVAS_NOT_SUPPORTED);
                return false;
            }

            this.setUrl(o.url);
            this.setButtonActions();

            $('body').append($modal_blocker);
        },
        setUrl: function(url) {
            var it = this;
            var img = document.createElement('img');
            //img.addEventListener('load', function() { 
            $(img).on('load', function() { 
                var width  = this.width; 
                var height = this.height;

                if (width > o.max_img_side || height > o.max_img_side) {
                    if (width > height) {
                        this.width = o.max_img_side;
                        this.height = height * this.width/width;
                    } else {
                        this.height = o.max_img_side;
                        this.width = width * this.height/height;
                    }
                    width = this.width;
                    height = this.height;
                }

                if (width < o.min_img_side || height < o.min_img_side) {
                    o.alertFn(o.MIN_IMG_SIDE_ERROR);
                    return false;
                }

                base_canvas.width = width;
                base_canvas.height = height;
                base_canvas.getContext('2d').drawImage(this, 0, 0, width, height);
                darken_canvas.width  = width;
                darken_canvas.height = height;
                f_canvas.width = width;
                f_canvas.height = height;

                setUiToModal();
                //o.onDomCreated($ui);
                //$modal_blocker.show();
                //toCenter($modal);
                setInitDotsValues(o.init_crop_side, width, height);
                it.setActionHandlers(f_canvas);
                it.draw();
            });
            img.src = o.url;
        },
        draw: function() {
            var f_ctx = f_canvas.getContext('2d');
            f_ctx.clearRect(0, 0, f_canvas.width, f_canvas.height);

            f_ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            f_ctx.strokeStyle = '#000';

            $.each(dots, function(i, dot) { 
                f_ctx.fillRect(dot.x(), dot.y(), o.dot_side, o.dot_side); 
                f_ctx.strokeRect(dot.x(), dot.y(), o.dot_side, o.dot_side); 
            });

            var d_ctx = darken_canvas.getContext('2d');
            d_ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            d_ctx.clearRect(0, 0, f_canvas.width, f_canvas.height);
            d_ctx.fillRect(0, 0, f_canvas.width, f_canvas.height);
            d_ctx.clearRect(dots.lt.x() + o.dot_side/2, dots.lt.y() + o.dot_side/2, dots.rt.x() - dots.lt.x(), dots.lb.y() - dots.lt.y());
        },
        moveArea: function(x, y, old_x, old_y) {
            var diff_x = old_x - x; 
            var diff_y = old_y - y;
            $.each(dots, function(i, dot) {
                dot.x(dot.x() - diff_x);
                dot.y(dot.y() - diff_y);
            });

            var out_x = checkXOutOfBorders();
            if (out_x) {
                var xside = getSideX(out_x.dot, out_x.dot.x());
                if (out_x.compass == 'west') { 
                    dots.lt.x(out_x.limit);         dots.lb.x(out_x.limit);
                    dots.rt.x(out_x.limit + xside); dots.rb.x(out_x.limit + xside);
                } else {
                    dots.rt.x(out_x.limit);         dots.rb.x(out_x.limit);
                    dots.lt.x(out_x.limit - xside); dots.lb.x(out_x.limit - xside);
                }
            }

            var out_y = checkYOutOfBorders();
            if (out_y) {
                var yside = getSideY(out_y.dot, out_y.dot.y());
                if (out_y.compass == 'north') { 
                    dots.lt.y(out_y.limit);         dots.rt.y(out_y.limit);
                    dots.lb.y(out_y.limit + yside); dots.rb.y(out_y.limit + yside);
                } else {
                    dots.lb.y(out_y.limit);         dots.rb.y(out_y.limit);
                    dots.lt.y(out_y.limit - yside); dots.rt.y(out_y.limit - yside);
                }
            }

            this.draw();
        },
        moveDot: function(x, y, old_x, old_y) {
            x = x - o.dot_side/2;
            y = y - o.dot_side/2;
            var dot = utils.detect(dots, function(_dot) { return _dot.active; }),
                sidex = getSideX(dot, x),
                sidey = getSideY(dot, y);
           
            dot.x(x); dot.y(y);

            var out_x = checkXOutOfBorders();
            if (out_x) {
                var xside = getSideX(out_x.dot, out_x.dot.x());
                if (out_x.compass == 'west') { 
                    dots.lt.x(out_x.limit);         dots.lb.x(out_x.limit);
                    dots.rt.x(out_x.limit + xside); dots.rb.x(out_x.limit + xside);
                } else {
                    dots.rt.x(out_x.limit);         dots.rb.x(out_x.limit);
                    dots.lt.x(out_x.limit - xside); dots.lb.x(out_x.limit - xside);
                }
            }

            var out_y = checkYOutOfBorders();
            if (out_y) {
                var yside = getSideY(out_y.dot, out_y.dot.y());
                if (out_y.compass == 'north') { 
                    dots.lt.y(out_y.limit);         dots.rt.y(out_y.limit);
                    dots.lb.y(out_y.limit + yside); dots.rb.y(out_y.limit + yside);
                } else {
                    dots.lb.y(out_y.limit);         dots.rb.y(out_y.limit);
                    dots.lt.y(out_y.limit - yside); dots.rt.y(out_y.limit - yside);
                }
            }

            if (o.max_crop_side) {
                sidex >= o.max_crop_side && dot.x(getXLimit(dot, o.max_crop_side));
                sidey >= o.max_crop_side && dot.y(getYLimit(dot, o.max_crop_side));
            }
            if (o.min_crop_side) {
                sidex <= o.min_crop_side && dot.x(getXLimit(dot, o.min_crop_side));
                sidey <= o.min_crop_side && dot.y(getYLimit(dot, o.min_crop_side));
            }

            if (o.square_mode) {
                sidex = getSideX(dot, dot.x());
                sidey = getSideY(dot, dot.y());
                if (sidex !== sidey) {
                    sidex < sidey ? dot.x(getXLimit(dot, sidey)) : dot.y(getYLimit(dot, sidex));
                }
            }

            if (dot == dots.lt) { dots.rt.y(dot.y()); dots.lb.x(dot.x()); } 
            if (dot == dots.rb) { dots.rt.x(dot.x()); dots.lb.y(dot.y()); } 
            if (dot == dots.rt) { dots.lt.y(dot.y()); dots.rb.x(dot.x()); } 
            if (dot == dots.lb) { dots.lt.x(dot.x()); dots.rb.y(dot.y()); } 

            this.draw();
        },
        setActionHandlers: function(canvas) {
            var it = this,
                target,
                drag_position,
                drag = false;

            $(canvas).on('mousedown', function(e) {
                target = it.getTarget(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY);
                if (target == 'dot') {
                    setActiveDot(getDotInThisPosition(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY));
                }
                drag_position = {x: e.offsetX || e.originalEvent.layerX, y: e.offsetY || e.originalEvent.layerY};
                drag = true;

            });
            $(canvas).on('mousemove', function(e) {
                if (drag) { 
                    if (target == 'dot') {
                        it.moveDot(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position.x, drag_position.y);
                    } else if (target == 'area') {
                        it.moveArea(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position.x, drag_position.y);
                        drag_position = {x: e.offsetX || e.originalEvent.layerX, y: e.offsetY || e.originalEvent.layerY};
                    }
                } else {
                    it.setCursor(canvas, 
                        it.getTarget(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY),
                        getDotInThisPosition(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY));
                }
            });
            $(canvas).on('mouseup', function() { 
                target = false; 
                drag = false;
            });
        },
        /* returns 'false', 'area', 'dot' */
        getTarget: function(x, y) {
            return getDotInThisPosition(x, y) ? 'dot' : isPositionInArea(x, y) ? "area" : false;
        },
        setCursor: function(canvas, target, dot) {
            if (target == 'dot') {
                if (dot == dots.lt) { $(canvas).css('cursor', 'nw-resize'); }
                if (dot == dots.rt) { $(canvas).css('cursor', 'ne-resize'); }
                if (dot == dots.rb) { $(canvas).css('cursor', 'se-resize'); }
                if (dot == dots.lb) { $(canvas).css('cursor', 'sw-resize'); }
            } else if (target == 'area') {
                $(canvas).css('cursor', 'pointer');
            } else {
                $(canvas).css('cursor', 'default');
            }
        },
        setButtonActions: function() {
            var it = this;
            if (o.use_native_button) {
                $btn_crop.on('click', function() { it.crop(); });
                $btn_cancel.on('click', function() { it.cancel(); });
            }
        },
        crop: function() {
            var im_data = base_canvas.getContext('2d').getImageData(dots.lt.x() + o.dot_side/2, dots.lt.y() + o.dot_side/2, dots.rt.x() - dots.lt.x(), dots.lb.y() - dots.lt.y());
            var canvas = document.createElement('canvas');
            canvas.width = Math.abs(dots.rt.x() - dots.lt.x());
            canvas.height = Math.abs(dots.lb.y() - dots.lt.y());
            canvas.getContext('2d').putImageData(im_data, 0, 0);

            var url = canvas.toDataURL();
            o.oncrop && o.oncrop(url);
            o.use_native_modal && $modal_blocker.hide();
        },
        cancel: function() { 
            o.use_native_modal && $modal_blocker.hide(); 
            o.oncancel();
        }
    };
})();
module.exports = {
    html5Crop: html5Crop
};
