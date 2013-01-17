window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || navigator.msGetUserMedia;

(function($) {
    $.fn.html5WebCam = function(options) {
        var $this = $(this),
            stream,
            o = $.extend({
                NOT_SUPPORT_FEATURE: 'Этот браузер не поддерживает захват с камеры',
                CAMERA_NOT_FOUND: 'Камера не найдена на этом устройстве',
                CLICK_TO_PAUSE: 'Нажмите для воспроизведения/остановки',
                TAKE_SNAPSHOT: 'Сделать снимок',
                CANCEL: 'Отмена',
                modal_class: 'modal',
                onsnapshot: function(snapshot) {},
                use_crop: true,
                oncrop: function(cropped_url) {}
            },options),
            modal =
                "<div class='darken_bgr' style='display:none'>" +
                    "<div class='{modal_class}' style='position:fixed;'>" +
                        "<div><video autoplay title='{pause}'></div>" +
                        "<input type='button' name='snapshot' value='{snapshot}'/>" +
                        "<input type='button' name='cancel' value='{cancel}'/>" +
                    "</div>" +
                "</div>", 
            $modal = $(supplant(modal, {
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
            toCenter($modal.find('.' + o.modal_class));
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
            var data_url = canvas.toDataURL();
            stream.stop();
            $modal.hide();

            o.onsnapshot(data_url);
            if (o.use_crop) { 
                html5Crop.init({
                    url: data_url,
                    oncrop: function(cropped_url) {
                        o.oncrop(cropped_url);
                    }
                })
            }
        });

        $this.on('click', function() {
            if (!navigator.getUserMedia) { alert(o.NOT_SUPPORT_FEATURE); return false; }

            navigator.getUserMedia && navigator.getUserMedia({video: true, audio: true}, function(_stream) {
                stream = _stream;
                video.src = window.URL.createObjectURL(stream);
                $modal.show();
            }, function() { alert(o.CAMERA_NOT_FOUND); });
        });

        return $this;
    };
})(jQuery);
