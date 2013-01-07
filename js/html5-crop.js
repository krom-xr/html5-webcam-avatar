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

    html5Crop = function(url, options) {
        var o = $.extend({
                CROP_NAME: 'обрезать',
                CANCEL: 'отмена',
                modal_class: 'modal'
            }, options),
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
            ),
            $modal = $(modal),
            $canvases = $modal.find('canvas'),
            base_canvas = $canvases[0],
            f_canvas    = $canvases[1],
            $img = $(supplant("<img src='{url}' >", {url: url}));

        $img.on('load', function() { 
            base_canvas.width = this.width;
            base_canvas.height = this.height;
            base_canvas.getContext('2d').drawImage(this, 0, 0, this.width, this.height);
            f_canvas.width = this.width;
            f_canvas.height = this.height;
            toCenter($modal);
            $modal.show();
        });

        $('body').append($modal);
        $(f_canvas).on('mousedown', function(e, data) {
            console.log(e, data);
        });
    };
