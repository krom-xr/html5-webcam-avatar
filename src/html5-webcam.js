/*global alert, require*/
window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || navigator.msGetUserMedia;

var html5Crop = require("./html5-crop.js").html5Crop;
window.html5Crop = html5Crop; //make html5crop - global

(function($) {
    var utils = require("./common.js");

    $.fn.html5WebCam = function(options) {
        $(this).each(function(){
            var $this = $(this), it = this;

            if ($this.data("html5WebCam")) { 
                if (typeof options !== 'string') { return false; }
                return $this.data(options) ? $this.data(options)() : html5Crop.crop();
            }

            $this.data("html5WebCam", true);

            var stream, $modal_blocker, $modal, $btn_snapshot, $btn_cancel,
                o = $.extend({
                    NOT_SUPPORT_FEATURE: 'Этот браузер не поддерживает захват с камеры',
                    CAMERA_NOT_FOUND: 'Камера не найдена на этом устройстве',
                    CLICK_TO_PAUSE: 'Нажмите для воспроизведения/остановки',
                    TAKE_SNAPSHOT: 'Сделать снимок',
                    CANCEL: 'Отмена',
                    max_video_size: 600,
                    modal_class: 'modal',
                    use_native_modal: true,
                    use_native_button: true,
                    onDomCreated: function($html) { },
                    onsnapshot: function(snapshot) {},
                    use_crop: true,
                    oncrop: function(cropped_url) {},
                    oncancel: function() {},
                    alertFn: function(msg) { alert(msg); }
                    
                },options),
                ui = 
                    utils.supplant(
                        "<div>" +
                            "<div><video autoplay title='{pause}'></div>" +
                        "</div>", { pause: o.CLICK_TO_PAUSE }),
                $ui = $(ui);

            $this.data('snapshot', function() {
                var canvas = document.createElement('canvas');
                var width = $video.width();
                var height = $video.height();
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(video, 0, 0, width, height);
                var data_url = canvas.toDataURL();
                video.pause();
                try { stream.stop(); } catch (e) {}
                o.use_native_modal && $modal_blocker.hide();

                o.onsnapshot(data_url);
                if (o.use_crop) {
                    var o_clone = $.extend({}, o);
                    html5Crop.init($.extend(o_clone, {
                        url: data_url,
                        oncrop: function(cropped_url) {
                            o.oncrop.apply(it, [cropped_url]);
                            $modal_blocker.hide();

                        },
                        onDomCreated: function($html) {
                            if (o.use_native_modal) {
                                $modal.children().detach();
                                $modal.append($html);
                                showNativeModal();
                            }
                            o.onDomCreated.apply(it, [$html]);
                        }, 
                        use_native_modal: false,
                        oncancel: function() {
                            $this.data('cancel')();
                        }
                    }));
                }
            });

            $this.data('cancel', function() {
                video.pause();
                try { stream.stop(); } catch (e) {}
                o.use_native_modal && $modal_blocker.hide();
                o.oncancel();
            });

            if (o.use_native_button) {
                $btn_snapshot =
                    $(utils.supplant("<input type='button' name='snapshot' value='{snapshot}'/>", {snapshot: o.TAKE_SNAPSHOT}));
                $btn_cancel = 
                    $(utils.supplant("<input type='button' name='cancel' value='{cancel}'/>", {cancel: o.CANCEL}));

                $ui.append($btn_snapshot).append($btn_cancel);

                $btn_snapshot.on('click', function() { 
                    $this.data('snapshot')(); });
                $btn_cancel  .on('click', function() { $this.data('cancel')(); });
            }

            if (o.use_native_modal) {
                $modal_blocker = $(utils.supplant(
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
                utils.toCenter($modal);
            };

            var setUiToModal = function() {
                if (o.use_native_modal) {
                    $modal.children().detach();
                    $modal.append($ui);
                    showNativeModal();
                }
                o.onDomCreated($ui);
            };

            video.addEventListener('click', function() { video.paused ? video.play() : video.pause(); });

            video.addEventListener('loadedmetadata',function() {
                if (o.max_video_size && (video.videoWidth > o.max_video_size || video.videoHeight > o.max_video_size)) {
                    video.videoWidth > video.videoHeight ?
                        $video.width(o.max_video_size) :
                        $video.height(o.max_video_size);
                }
                setUiToModal();
                video.play();
            });

            $this.on('click', function() {
                if (!navigator.getUserMedia) { o.alertFn(o.NOT_SUPPORT_FEATURE); return false; }

                navigator.getUserMedia && navigator.getUserMedia({video: true, audio: true}, function(_stream) {
                    stream = _stream;
                    video.src = window.URL ? window.URL.createObjectURL(stream) : stream; // in opera stream dont must be converted to objectURL
                    //video.src = window.URL.createObjectURL(_stream); // in opera stream dont must be converted to objectURL

                }, function() { o.alertFn(o.CAMERA_NOT_FOUND); });
            });

        });
        return this;
    };
})(jQuery);