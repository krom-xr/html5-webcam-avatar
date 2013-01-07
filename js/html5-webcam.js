window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || navigator.msGetUserMedia;

(function($) {

    //TODO возможно лучше передалать в просто функцию
    /* позволяет делать всякие такие штуки - "Hello {variable}".supplant({variable: "World !"}) */
    String.prototype.supplant = function (o) {
        return this.replace(/{([^{}]*)}/g,
            function (a, b) {
                var r = o[b];
                return typeof r === 'string' || typeof r === 'number' ? r : a;
            }
        );
    };
    
    $.fn.html5WebCam = function(options) {
        var $this = $(this),
            stream,
            o = $.extend({
                NOT_SUPPORT_FEATURE: 'this browser does not support webcam capturing',
                CAMERA_NOT_FOUND: 'camera not found on this device',
                CLICK_TO_PAUSE: 'click to play/pause',
                TAKE_SNAPSHOT: 'take snapshot',
                CANCEL: 'cancel',
                modal_class: 'modal',
            },options),
            modal =
                "<div class='{modal_class}' style='position:fixed; display: none;'>" +
                    "<div><video autoplay title='{pause}'></div>" +
                    "<input type='button' name='snapshot' value='{snapshot}'/>" +
                    "<input type='button' name='cancel' value='{cancel}'/>" +
                "</div>",
            $modal = $(modal.supplant({
                pause: o.CLICK_TO_PAUSE, 
                snapshot: o.TAKE_SNAPSHOT, 
                cancel: o.CANCEL,
                modal_class: o.modal_class
            })),
            $video = $modal.find('video'),
            video = $video[0],
            $btn_snapshot = $modal.find('input[name=snapshot]'),
            $btn_cancel = $modal.find('input[name=cancel]');

        $('body').append($modal);

        $video.on('click', function() { video.paused ? video.play() : video.pause(); });
        $video.one('play', function() { 
            $modal
                .css('left', $(window).width()/2 + 'px')
                .css('margin-left', -$modal.width()/2 + 'px');
        });

        $btn_cancel.on('click', function() {
            stream.stop();
            $modal.hide();
        });

        $btn_snapshot.on('click', function() {
            var canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            $this.trigger('webcam_snapshot', canvas.toDataURL());
            stream.stop();
            $modal.hide();
        });

        $this.on('click', function() {
            if (!navigator.getUserMedia) { alert(o.NOT_SUPPORT_FEATURE); return false; }

            navigator.getUserMedia && navigator.getUserMedia({video: true, audio: true}, function(_stream) {
                stream = _stream;
                video.src = window.URL.createObjectURL(stream);
                $modal.show();
            }, function() { alert(o.CAMERA_NOT_FOUND); });
        });
    };
})(jQuery);

//$(document).on('click', 'button', function() {
    //var modal = $('.snapshot_block');
    //var video = modal.find('video.snapshot').get(0);

    //navigator.getUserMedia && navigator.getUserMedia({video: true, audio: true}, function(stream) {
        ////modal.modal();
        ////modal.data('modal_show')();
        ////modal.one('modal_cancel', function() { stream.stop(); })
        ////modal.one('modal_ok', function() { 
            ////var canvas = document.createElement('canvas');
            ////var wh = getScaledWH(video.videoWidth, video.videoHeight, MAX_SIDE);
            ////canvas.width = wh.w;
            ////canvas.height = wh.h;
            ////canvas.getContext('2d').drawImage(video, 0, 0, wh.w, wh.h);
            ////showUcrop(canvas.toDataURL());
            ////stream.stop(); 
            ////modal.data('modal_hide')();
        ////});
        ////video.src = window.URL.createObjectURL(stream);
    //}, function() { alert('you browser is shit'); });
//});
