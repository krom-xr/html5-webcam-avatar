window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || navigator.msGetUserMedia;

(function($) {
    $.fn.html5WebCam = function(options) {
        var $this = $(this);
        if ($this.data("html5WebCam")) { 
            if (!typeof options === 'string') { return false; }
            return $this.data(options)();
        }

        $this.data("html5WebCam", true);

        var stream, $modal_blocker, $modal, $btn_snapshot, $btn_cancel,
            o = $.extend({
                NOT_SUPPORT_FEATURE: 'Этот браузер не поддерживает захват с камеры',
                CAMERA_NOT_FOUND: 'Камера не найдена на этом устройстве',
                CLICK_TO_PAUSE: 'Нажмите для воспроизведения/остановки',
                TAKE_SNAPSHOT: 'Сделать снимок',
                CANCEL: 'Отмена',
                max_video_size: 200,
                modal_class: 'modal',
                use_native_modal: true,
                use_native_button: true,
                onDomCreated: function($html) { },
                onsnapshot: function(snapshot) {},
                use_crop: true,
                oncrop: function(cropped_url) {}
            },options),
            ui = 
                supplant(
                    "<div>" +
                        "<div><video autoplay title='{pause}'></div>" +
                    "</div>", { pause: o.CLICK_TO_PAUSE });
            $ui = $(ui);

        $this.data('snapshot', function() {
            var canvas = document.createElement('canvas');
            var width = $video.width();
            var height = $video.height();
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(video, 0, 0, width, height);
            var data_url = canvas.toDataURL();
            stream.stop();
            o.use_native_modal && $modal_blocker.hide();

            o.onsnapshot(data_url);
            if (o.use_crop) { 
                //TODO receive options to html5Crop
                html5Crop.init({
                    url: data_url,
                    oncrop: function(cropped_url) {
                        o.oncrop(cropped_url);
                    }
                })
            }
        });

        $this.data('close', function() {
            stream.stop();
            o.use_native_modal && $modal_blocker.hide();
        });

        if (o.use_native_button) {
            $btn_snapshot =
                $(supplant("<input type='button' name='snapshot' value='{snapshot}'/>", {snapshot: o.TAKE_SNAPSHOT}));
            $btn_cancel = 
                $(supplant("<input type='button' name='cancel' value='{cancel}'/>", {cancel: o.CANCEL}));

            $ui.append($btn_snapshot).append($btn_cancel);

            $btn_snapshot.on('click', function() { $this.data('snapshot')(); });
            $btn_cancel  .on('click', function() { $this.data('close')(); });
        }

        if (o.use_native_modal) {
            $modal_blocker = $(supplant(
                            "<div class='darken_bgr' style='display:none'>" +
                                "<div class='{modal_class}' style='position:fixed;'></div>" +
                            "</div>", {modal_class: o.modal_class}));
            $modal = $modal_blocker.find("." + o.modal_class);
            $('body').append($modal_blocker);
        }

        var $video = $ui.find('video'),
            video = $video[0];

        var showNativeModal = function() {
            $modal_blocker.show();
            toCenter($modal);
        }

        var setUiToModal = function() {
            if (o.use_native_modal) {
                $modal.append($ui);
                showNativeModal();
            }
            o.onDomCreated($ui);
        }

        $video.on('click', function() { video.paused ? video.play() : video.pause(); });

        $video.one('play', function() { //NB this is hack. I dont now how to detect when video is loaded 
            if (o.max_video_size && (video.videoWidth > o.max_video_size || video.videoHeight > o.max_video_size)) {
                video.videoWidth > video.videoHeight ?
                    $video.width(o.max_video_size) :
                    $video.height(o.max_video_size);
            }
            setUiToModal();
        });


        $this.on('click', function() {
            if (!navigator.getUserMedia) { alert(o.NOT_SUPPORT_FEATURE); return false; }

            navigator.getUserMedia && navigator.getUserMedia({video: true, audio: true}, function(_stream) {
                stream = _stream;
                video.src = window.URL.createObjectURL(stream);
            }, function() { alert(o.CAMERA_NOT_FOUND); });
        });

        return $this;
    };
})(jQuery);
