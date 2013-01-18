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
                max_video_size: 600,
                modal_class: 'modal',
                use_native_modal: true,
                ondomcreated: function(html) { console.log(html);},
                onsnapshot: function(snapshot) {},
                use_crop: true,
                oncrop: function(cropped_url) {}
            },options),
            ui = 
                supplant(
                    "<div>" +
                        "<div><video autoplay title='{pause}'></div>" +
                        "<input type='button' name='snapshot' value='{snapshot}'/>" +
                        "<input type='button' name='cancel' value='{cancel}'/>" +
                    "</div>", {
                        pause: o.CLICK_TO_PAUSE, 
                        snapshot: o.TAKE_SNAPSHOT, 
                        cancel: o.CANCEL
                    });
            $ui = $(ui);

        //if (use_native_modal) {
            //var modal =
                    //supplant(
                        //"<div class='darken_bgr' style='display:none'>" +
                            //"<div class='{modal_class}' style='position:fixed;'>{ui}</div>" +
                        //"</div>", {modal_class: o.modal_class, ui: ui});

                //$modal = $(modal),
            //var $modal = $ui,
        //}

        var $video = $ui.find('video'),
            video = $video[0],
            $btn_snapshot = $ui.find('input[name=snapshot]'),
            $btn_cancel = $ui.find('input[name=cancel]');

        //$('body').append($modal);
        //o.ondomcreated($ui);

        $video.on('click', function() { video.paused ? video.play() : video.pause(); });

        $video.one('play', function() { //NB this is hack. I dont now how to detect when video is loaded 
            if (o.max_video_size && (video.videoWidth > o.max_video_size || video.videoHeight > o.max_video_size)) {
                video.videoWidth > video.videoHeight ?
                    $video.width(o.max_video_size) :
                    $video.height(o.max_video_size);
            }

            o.ondomcreated($ui);
            //toCenter($modal.find('.' + o.modal_class));
        });

        $btn_cancel.on('click', function() {
            stream.stop();
            $modal.hide();
        });

        $btn_snapshot.on('click', function() {
            var canvas = document.createElement('canvas');
            var width = $video.width();
            var height = $video.height();
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(video, 0, 0, width, height);
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
                //$modal.show();

            }, function() { alert(o.CAMERA_NOT_FOUND); });
        });

        return $this;
    };
})(jQuery);
