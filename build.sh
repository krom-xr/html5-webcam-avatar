#!/bin/sh
uglifyjs2 src/utils.js src/html5-crop.js src/html5-webcam.js -o js/html5-webcam-build.js -b
uglifyjs2 src/utils.js src/html5-crop.js src/html5-webcam.js -o js/html5-webcam-build.min.js 
uglifyjs2 src/utils.js src/html5-crop.js src/html5-webcam.js -o js/html5-croponly.js -b
uglifyjs2 src/utils.js src/html5-crop.js src/html5-webcam.js -o js/html5-croponly.min.js
