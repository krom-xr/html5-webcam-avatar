window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || navigator.msGetUserMedia;

(function($) {
    $.fn.html5WebCam = function(options) {
        var o = $.extend({
            NOT_SUPPORT_FEATURE: 'this browser dont support this feature',
            CAMERA_NOT_FOUND: 'camera not found on this device'

        },options);

        return $(this).each(function() {
            var $this = $(this);
            $this.on('click', function() {
                if (!navigator.getUserMedia) { alert(o.NOT_SUPPORT_FEATURE); return false; }

                navigator.getUserMedia && navigator.getUserMedia({video: true, audio: true}, function(stream) {
                    //modal.modal();
                    //modal.data('modal_show')();
                    //modal.one('modal_cancel', function() { stream.stop(); })
                    //modal.one('modal_ok', function() { 
                        //var canvas = document.createElement('canvas');
                        //var wh = getScaledWH(video.videoWidth, video.videoHeight, MAX_SIDE);
                        //canvas.width = wh.w;
                        //canvas.height = wh.h;
                        //canvas.getContext('2d').drawImage(video, 0, 0, wh.w, wh.h);
                        //showUcrop(canvas.toDataURL());
                        //stream.stop(); 
                        //modal.data('modal_hide')();
                    //});
                    //video.src = window.URL.createObjectURL(stream);
                }, function() { alert(o.CAMERA_NOT_FOUND); });

            });
        });
    }
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
