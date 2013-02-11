html5-webcam-avatar
===================

html5 webcam avatar for modern browsers 


    $(document).ready(function() {
        $("#create_snapshot").html5WebCam({
            oncrop: function(cropped_url) { 
                // cropped_url - base64 image 
                var $img = $("<img/>");
                $img.attr('src', cropped_url);
                $('body').append($img);
            },
        });
    });
    
[demo & docs](http://html5-xr.herokuapp.com)
