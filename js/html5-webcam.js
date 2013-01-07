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
            o = $.extend({
                NOT_SUPPORT_FEATURE: 'this browser does not support webcam capturing',
                CAMERA_NOT_FOUND: 'camera not found on this device',
                CLICK_TO_PAUSE: 'click to play/pause',
                TAKE_SNAPSHOT: 'take snapshot',
                CANCEL: 'cancel',

            },options),
            $modal = $(
                "<div><div><video autoplay title='pause'></div> <input type='button' value='{snapshot}'/><input type='button' value='{cancel}'/></div>"
                .supplant({pause: o.CLICK_TO_PAUSE, snapshot: o.TAKE_SNAPSHOT, cancel: o.CANCEL })
            ),
            $video = $modal.find('video'),
            video = $video[0],
            $btns = $modal.find('input[type=button]'),
            $btn_snapshot = $($btns[0]),
            $btn_cancel = $($btns[1]);

        $('body').append($modal);

        $video.on('click', function() { video.paused ? video.play() : video.pause(); });

        $this.on('click', function() {
            if (!navigator.getUserMedia) { alert(o.NOT_SUPPORT_FEATURE); return false; }

            navigator.getUserMedia && navigator.getUserMedia({video: true, audio: true}, function(stream) {
                video.src = window.URL.createObjectURL(stream);
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
