    /* позволяет делать всякие такие штуки - supplant("Hello {variable}", {variable: "World !"}) // return Hello World ! */
    var supplant = function (str, o) {
        return str.replace(/{([^{}]*)}/g,
            function (a, b) {
                var r = o[b];
                return typeof r === 'string' || typeof r === 'number' ? r : a;
            }
        );
    };

    var toCenter = function($el) {
        $el.css('left', $(window).width()/2)
           .css('margin-left', -$el.width()/2 + 'px');

    };

    //html5Crop = function(url, options) {
        //var o = $.extend({
                //CROP_NAME: 'обрезать',
                //CANCEL: 'отмена',
                //modal_class: 'modal'
            //}, options),
            //modal = supplant(
                //"<div class='{modal_class}' style='position:fixed; display:none'>" +
                    //"<div>" +
                        //"<canvas></canvas>" +
                        //"<canvas style='position:absolute; top:0; left:0'></canvas>" +
                    //"</div>" +
                    //"<input type='button' name='snapshot' value='{cropname}'/>" +
                    //"<input type='button' name='cancel' value='{cancel}'/>" +
                //"</div>", {
                    //modal_class: o.modal_class,
                    //cropname: o.CROP_NAME,
                    //cancel: o.CANCEL
                //}
            //),
            //$modal = $(modal),
            //$canvases = $modal.find('canvas'),
            //base_canvas = $canvases[0],
            //f_canvas    = $canvases[1],
            //$img = $(supplant("<img src='{url}' >", {url: url}));

        //$img.on('load', function() { 
            //base_canvas.width = this.width;
            //base_canvas.height = this.height;
            //base_canvas.getContext('2d').drawImage(this, 0, 0, this.width, this.height);
            //f_canvas.width = this.width;
            //f_canvas.height = this.height;
            //toCenter($modal);
            //$modal.show();
        //});

        //$('body').append($modal);
        //$(f_canvas).on('mousedown', function(e, data) {
        //});
    //};

var html5Crop = (function() {
    var o, modal, $modal, base_canvas, f_canvas;

    return {
        init: function(options) {
            o = $.extend({
                CROP_NAME: 'резать',
                CANCEL: 'отмена',
                dot_side: 10,
                modal_class: 'modal'
            }, options);
            modal = supplant(
                "<div class='{modal_class}' style='position:fixed; display:none'>" +
                    "<div>" +
                        "<canvas></canvas>" +
                        "<canvas style='position:absolute; top:0; left:0'></canvas>" +
                    "</div>" +
                    "<input type='button' name='snapshot' value='{cropname}'/>" +
                    "<input type='button' name='cancel' value='{cancel}'/>" +
                "</div>", {
                    modal_class: o.modal_class,
                    cropname: o.CROP_NAME,
                    cancel: o.CANCEL
                }
            );
            $modal = $(modal);

            var $canvases = $modal.find('canvas');
            base_canvas = $canvases[0];
            f_canvas    = $canvases[1];
            this.setUrl(o.url);

            $('body').append($modal);
        },
        setUrl: function(url) {
            var it = this;
            var $img = $(supplant("<img src='{url}' >", {url: o.url}));
            $img.on('load', function() { 
                base_canvas.width = this.width;
                base_canvas.height = this.height;
                //base_canvas.getContext('2d').drawImage(this, 0, 0, this.width, this.height);
                f_canvas.width = this.width;
                f_canvas.height = this.height;
                toCenter($modal);
                $modal.show();
                it.drawDots(f_canvas);
                it.setActionHandlers(f_canvas);
            });
        },
        dots: {
            lt: [0, 0],
            rt: [100, 0],
            rb: [100, 100],
            lb: [0, 100]
        },
        drawDots: function(canvas) {
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var dots = this.dots;
            $.each(this.dots, function(i, dot) { ctx.fillRect(dot[0], dot[1], o.dot_side, o.dot_side); });
        },
        moveArea: function(x, y, old_x, old_y) {
            console.log(x, y, old_x, old_y);

            var diff_x = old_x - x; 
            var diff_y = old_y - y;
            $.each(this.dots, function(i, dot) {
                dot[0] = dot[0] - diff_x;
                dot[1] = dot[1] - diff_y;
            });

            this.drawDots(f_canvas);
        },
        setActionHandlers: function(canvas) {
            var it = this,
                target,
                drag_position = [];

            $(canvas).on('mousedown', function(e) {
                target = it.getTarget(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY);
                drag_position = [e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY];

            });
            $(canvas).on('mousemove', function(e) {
                if (!target) { return false; }
                if (target == 'dot') {
                    it.moveDot();
                } else if (target == 'area') {
                    it.moveArea(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position[0], drag_position[1]);
                    drag_position = [e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY];
                }
            });
            $(canvas).on('mouseup', function() { 
                target = false; 
                drag_position = [0,0];
            });
        },
        moveDot: function() {},
        getTarget: function(x, y) {
            var it = this;
            var target = false; // false, 'dot', 'area'

            if (it.dots.lt[0] < x && x < it.dots.rt[0] + o.dot_side 
                && it.dots.lt[1] < y && y < it.dots.lb[1] + o.dot_side) {

                target = 'area';
            } else { 
                return false;
            }

            $.each(it.dots, function(i, dot) { 
                dot.active = Boolean((dot[0] < x && x < (dot[0] + o.dot_side)) && (dot[1] < y && y < (dot[1] + o.dot_side)));
                target = !dot.active ? target : 'dot';
            });

            return target;

        }
    }
})();
