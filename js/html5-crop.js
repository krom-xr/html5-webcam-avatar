var html5Crop = (function() {
    var o, modal, $modal, base_canvas, darken_canvas, f_canvas, $btn_crop, $btn_cancel, freeze_x, freeze_y;

    var setDot = function(dot_name, value) {
        var it = this;
        it[dot_name] = value;
        return function(value) {
            if (freeze_x && $.inArray(dot_name, ['lt_x', 'lb_x', 'rt_x', 'rb_x']) != -1) { return it[dot_name]; }
            if (freeze_y && $.inArray(dot_name, ['lt_y', 'lb_y', 'rt_y', 'rb_y']) != -1) { return it[dot_name]; }
            it[dot_name] = value ? value : it[dot_name];
            return it[dot_name];
        }
    }

    var dots = {
        lt: {x: setDot('lt_x', 0),   y: setDot('lt_y', 0)  }, rt: {x: setDot('rt_x', 100), y: setDot('rt_y', 0)  },
        lb: {x: setDot('lb_x', 0),   y: setDot('lb_y', 100)}, rb: {x: setDot('rb_x', 100), y: setDot('rb_y', 100)},

    };

    var getXLimit = function(dot, limit_size) {
        return dot == dots.lt || dot == dots.lb
            ? dots.rt.x() - limit_size : dots.lt.x() + limit_size;
    };

    var getYLimit= function(dot, limit_size) {
        return dot == dots.lt || dot == dots.rt
            ? dots.lb.y() - limit_size : dots.lt.y() + limit_size;
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

    return {
        init: function(options) {
            o = $.extend({
                CROP_NAME: 'резать',
                CANCEL: 'отмена',
                //square_mode: true,
                //max_side: 200,
                min_side: 50,
                dot_side: 10,
                modal_class: 'modal',
                oncrop: function(cropped_url) {}
            }, options);
            modal = supplant(
                "<div class='darken_bgr' style='display:none'>" +
                    "<div class='{modal_class}' style='position:fixed;'>" +
                        "<div style='position: relative'>" +
                            "<canvas></canvas>" +
                            "<canvas style='position:absolute; top:0; left:0'></canvas>" +
                            "<canvas style='position:absolute; top:0; left:0'></canvas>" +
                        "</div>" +
                        "<input type='button' name='crop' value='{cropname}'/>" +
                        "<input type='button' name='cancel' value='{cancel}'/>" +
                    "</div>" +
                "</div>", {
                    modal_class: o.modal_class,
                    cropname: o.CROP_NAME,
                    cancel: o.CANCEL
                }
            );
            $modal = $(modal);
            $btn_crop = $modal.find('input[name=crop]');
            $btn_cancel = $modal.find('input[name=cancel]');

            var $canvases = $modal.find('canvas');
            base_canvas   = $canvases[0];
            darken_canvas = $canvases[1];
            f_canvas      = $canvases[2];
            this.setUrl(o.url);
            this.setButtonActions();

            $('body').append($modal);
        },
        setUrl: function(url) {
            var it = this;
            var $img = $(supplant("<img src='{url}' >", {url: o.url}));
            $img.on('load', function() { 
                base_canvas.width = this.width;
                base_canvas.height = this.height;
                base_canvas.getContext('2d').drawImage(this, 0, 0, this.width, this.height);
                darken_canvas.width  = this.width;
                darken_canvas.height = this.height;
                f_canvas.width = this.width;
                f_canvas.height = this.height;

                $modal.show();
                toCenter($modal.find("." + o.modal_class));
                it.drawDots();
                it.setActionHandlers(f_canvas);
            });
        },
        drawDots: function() {
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

            this.drawDots();
        },
        moveDot: function(x, y, old_x, old_y) {
            x = x - o.dot_side/2;
            y = y - o.dot_side/2;
            var dot;
            $.each(dots, function(i, _dot) { if (_dot.active) { dot = _dot; return false; } });
            //if (o.square_mode) {
                //if (dot == dots.lt || dot == dots.rb) {
                    //if (Math.abs(x - old_x) > Math.abs(y - old_y)) { y = old_y - old_x + x; } else { x = y - old_y + old_x; }
                //} else {
                    //if (Math.abs(x - old_x) > Math.abs(y - old_y)) { y = old_y + old_x - x; } else { x = old_y + old_x - y; }
                //}
            //}

            dot.x(x); dot.y(y);

            o.max_side && getSideX(dot, x) >= o.max_side && dot.x(getXLimit(dot, o.max_side));
            o.max_side && getSideY(dot, y) >= o.max_side && dot.y(getYLimit(dot, o.max_side));
            o.min_side && getSideX(dot, x) <= o.min_side && dot.x(getXLimit(dot, o.min_side));
            o.min_side && getSideY(dot, y) <= o.min_side && dot.y(getYLimit(dot, o.min_side));


            if (dot == dots.lt) { dots.rt.y(dot.y()); dots.lb.x(dot.x()); } 
            if (dot == dots.rb) { dots.rt.x(dot.x()); dots.lb.y(dot.y()); } 
            if (dot == dots.rt) { dots.lt.y(dot.y()); dots.rb.x(dot.x()); } 
            if (dot == dots.lb) { dots.lt.x(dot.x()); dots.rb.y(dot.y()); } 

            //freeze_x = false;
            //freeze_y = false;

            this.drawDots();
        },
        setActionHandlers: function(canvas) {
            var it = this,
                target,
                drag_position;

            $(canvas).on('mousedown', function(e) {
                target = it.getTarget(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY);
                drag_position = {x: e.offsetX || e.originalEvent.layerX, y: e.offsetY || e.originalEvent.layerY};

            });
            $(canvas).on('mousemove', function(e) {
                if (!target) { return false; }
                if (target == 'dot') {
                    it.moveDot(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position.x, drag_position.y);
                } else if (target == 'area') {
                    it.moveArea(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position.x, drag_position.y);
                    drag_position = {x: e.offsetX || e.originalEvent.layerX, y: e.offsetY || e.originalEvent.layerY};
                }
            });
            $(canvas).on('mouseup', function() { 
                target = false; 
                freeze = false;
            });
        },
        getTarget: function(x, y) {
            var it = this;
            var target = false; // false, 'dot', 'area'

            if ((dots.lt.x() < x && x < dots.rt.x() + o.dot_side || dots.rt.x() < x && x < dots.lt.x() + o.dot_side)
                && (dots.lt.y() < y && y < dots.lb.y() + o.dot_side || dots.lb.y() < y && y < dots.lt.y() + o.dot_side )) {

                target = 'area';
            } else { 
                return false;
            }

            $.each(dots, function(i, dot) { 
                dot.active = Boolean((dot.x() < x && x < (dot.x() + o.dot_side)) && (dot.y() < y && y < (dot.y() + o.dot_side)));
                target = !dot.active ? target : 'dot';
            });

            return target;
        },
        setButtonActions: function() {
            $btn_crop.on('click', function() {
                var im_data = base_canvas.getContext('2d').getImageData(dots.lt.x() + o.dot_side/2, dots.lt.y() + o.dot_side/2, dots.rt.x() - dots.lt.x(), dots.lb.y() - dots.lt.y());
                var canvas = document.createElement('canvas');
                canvas.width = Math.abs(dots.rt.x() - dots.lt.x());
                canvas.height = Math.abs(dots.lb.y() - dots.lt.y());
                canvas.getContext('2d').putImageData(im_data, 0, 0);

                var url = canvas.toDataURL();
                o.oncrop && o.oncrop(url);
                $modal.hide();
            });
        }

    }
})();
