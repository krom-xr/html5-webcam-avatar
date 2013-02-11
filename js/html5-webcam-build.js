(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",Function(['require','module','exports','__dirname','__filename','process','global'],"function filter (xs, fn) {\n    var res = [];\n    for (var i = 0; i < xs.length; i++) {\n        if (fn(xs[i], i, xs)) res.push(xs[i]);\n    }\n    return res;\n}\n\n// resolves . and .. elements in a path array with directory names there\n// must be no slashes, empty elements, or device names (c:\\) in the array\n// (so also no leading and trailing slashes - it does not distinguish\n// relative and absolute paths)\nfunction normalizeArray(parts, allowAboveRoot) {\n  // if the path tries to go above the root, `up` ends up > 0\n  var up = 0;\n  for (var i = parts.length; i >= 0; i--) {\n    var last = parts[i];\n    if (last == '.') {\n      parts.splice(i, 1);\n    } else if (last === '..') {\n      parts.splice(i, 1);\n      up++;\n    } else if (up) {\n      parts.splice(i, 1);\n      up--;\n    }\n  }\n\n  // if the path is allowed to go above the root, restore leading ..s\n  if (allowAboveRoot) {\n    for (; up--; up) {\n      parts.unshift('..');\n    }\n  }\n\n  return parts;\n}\n\n// Regex to split a filename into [*, dir, basename, ext]\n// posix version\nvar splitPathRe = /^(.+\\/(?!$)|\\/)?((?:.+?)?(\\.[^.]*)?)$/;\n\n// path.resolve([from ...], to)\n// posix version\nexports.resolve = function() {\nvar resolvedPath = '',\n    resolvedAbsolute = false;\n\nfor (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {\n  var path = (i >= 0)\n      ? arguments[i]\n      : process.cwd();\n\n  // Skip empty and invalid entries\n  if (typeof path !== 'string' || !path) {\n    continue;\n  }\n\n  resolvedPath = path + '/' + resolvedPath;\n  resolvedAbsolute = path.charAt(0) === '/';\n}\n\n// At this point the path should be resolved to a full absolute path, but\n// handle relative paths to be safe (might happen when process.cwd() fails)\n\n// Normalize the path\nresolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {\n    return !!p;\n  }), !resolvedAbsolute).join('/');\n\n  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';\n};\n\n// path.normalize(path)\n// posix version\nexports.normalize = function(path) {\nvar isAbsolute = path.charAt(0) === '/',\n    trailingSlash = path.slice(-1) === '/';\n\n// Normalize the path\npath = normalizeArray(filter(path.split('/'), function(p) {\n    return !!p;\n  }), !isAbsolute).join('/');\n\n  if (!path && !isAbsolute) {\n    path = '.';\n  }\n  if (path && trailingSlash) {\n    path += '/';\n  }\n  \n  return (isAbsolute ? '/' : '') + path;\n};\n\n\n// posix version\nexports.join = function() {\n  var paths = Array.prototype.slice.call(arguments, 0);\n  return exports.normalize(filter(paths, function(p, index) {\n    return p && typeof p === 'string';\n  }).join('/'));\n};\n\n\nexports.dirname = function(path) {\n  var dir = splitPathRe.exec(path)[1] || '';\n  var isWindows = false;\n  if (!dir) {\n    // No dirname\n    return '.';\n  } else if (dir.length === 1 ||\n      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {\n    // It is just a slash or a drive letter with a slash\n    return dir;\n  } else {\n    // It is a full dirname, strip trailing slash\n    return dir.substring(0, dir.length - 1);\n  }\n};\n\n\nexports.basename = function(path, ext) {\n  var f = splitPathRe.exec(path)[2] || '';\n  // TODO: make this comparison case-insensitive on windows?\n  if (ext && f.substr(-1 * ext.length) === ext) {\n    f = f.substr(0, f.length - ext.length);\n  }\n  return f;\n};\n\n\nexports.extname = function(path) {\n  return splitPathRe.exec(path)[3] || '';\n};\n\nexports.relative = function(from, to) {\n  from = exports.resolve(from).substr(1);\n  to = exports.resolve(to).substr(1);\n\n  function trim(arr) {\n    var start = 0;\n    for (; start < arr.length; start++) {\n      if (arr[start] !== '') break;\n    }\n\n    var end = arr.length - 1;\n    for (; end >= 0; end--) {\n      if (arr[end] !== '') break;\n    }\n\n    if (start > end) return [];\n    return arr.slice(start, end - start + 1);\n  }\n\n  var fromParts = trim(from.split('/'));\n  var toParts = trim(to.split('/'));\n\n  var length = Math.min(fromParts.length, toParts.length);\n  var samePartsLength = length;\n  for (var i = 0; i < length; i++) {\n    if (fromParts[i] !== toParts[i]) {\n      samePartsLength = i;\n      break;\n    }\n  }\n\n  var outputParts = [];\n  for (var i = samePartsLength; i < fromParts.length; i++) {\n    outputParts.push('..');\n  }\n\n  outputParts = outputParts.concat(toParts.slice(samePartsLength));\n\n  return outputParts.join('/');\n};\n\n//@ sourceURL=path"
));

require.define("__browserify_process",Function(['require','module','exports','__dirname','__filename','process','global'],"var process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n        && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n        && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return function (f) { return window.setImmediate(f) };\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'browserify-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('browserify-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    if (name === 'evals') return (require)('vm')\n    else throw new Error('No such module. (Possibly not yet loaded)')\n};\n\n(function () {\n    var cwd = '/';\n    var path;\n    process.cwd = function () { return cwd };\n    process.chdir = function (dir) {\n        if (!path) path = require('path');\n        cwd = path.resolve(dir, cwd);\n    };\n})();\n\n//@ sourceURL=__browserify_process"
));

require.define("/html5-crop.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*global detect, toCenter, supplant, alert,module , require */\nvar html5Crop;\nvar base_canvas,darken_canvas, f_canvas;\n\nhtml5Crop = (function() {\n    var utils = require('./common.js');\n\n\n    var o, modal, $modal, $modal_blocker, $btn_crop, $btn_cancel, freeze_x, freeze_y, $ui;\n\n    var setDot = function(dot_name, value) {\n        var it = this;\n        it[dot_name] = value;\n        return function(value) {\n            //if (freeze_x && $.inArray(dot_name, ['lt_x', 'lb_x', 'rt_x', 'rb_x']) != -1) { return it[dot_name]; }\n            //if (freeze_y && $.inArray(dot_name, ['lt_y', 'lb_y', 'rt_y', 'rb_y']) != -1) { return it[dot_name]; }\n            it[dot_name] = value !== undefined ? value : it[dot_name];\n            return it[dot_name];\n        };\n    };\n\n    var dots = {\n        lt: {x: setDot('lt_x'),   y: setDot('lt_y')}, rt: {x: setDot('rt_x'), y: setDot('rt_y')},\n        lb: {x: setDot('lb_x'),   y: setDot('lb_y')}, rb: {x: setDot('rb_x'), y: setDot('rb_y')}\n\n    };\n\n    var getDotInThisPosition = function(x, y) {\n        return utils.detect(dots, function(dot) {\n            return Boolean((dot.x() < x && x < (dot.x() + o.dot_side)) && (dot.y() < y && y < (dot.y() + o.dot_side)));\n        });\n    };\n\n    var isPositionInArea = function(x, y) {\n        return (dots.lt.x() < x && x < dots.rt.x() + o.dot_side || dots.rt.x() < x && x < dots.lt.x() + o.dot_side) &&\n               (dots.lt.y() < y && y < dots.lb.y() + o.dot_side || dots.lb.y() < y && y < dots.lt.y() + o.dot_side );\n    };\n\n    var setActiveDot = function(dot) {\n        $.each(dots, function(i, _dot) { _dot.active = _dot == dot; });\n    };\n\n    var getXLimit = function(dot, limit_size) {\n        return dot == dots.lt || dot == dots.lb ?\n            dots.rt.x() - limit_size : dots.lt.x() + limit_size;\n    };\n\n    var getYLimit= function(dot, limit_size) {\n        return dot == dots.lt || dot == dots.rt ?\n            dots.lb.y() - limit_size : dots.lt.y() + limit_size;\n    };\n\n    var getSideX = function(dot, x) {\n        var x1 = x;\n        var x2 = (dots.lt == dot || dots.lb == dot) ? dots.rt.x() : dots.lt.x();\n        return Math.abs(x1-x2);\n    };\n\n    var getSideY = function(dot, y) {\n        var y1 = y;\n        var y2 = (dots.lt == dot || dots.rt == dot) ? dots.lb.y() : dots.lt.y();\n        return Math.abs(y1-y2);\n    };\n\n    var checkXOutOfBorders = function() {\n        var min_limit = - o.dot_side/2,\n            max_limit = base_canvas.width - o.dot_side/2,\n            dot = utils.detect(dots, function(dot) {\n                return dot.x() <= min_limit || dot.x() > max_limit;\n            });\n\n        if (!dot) { return false; }\n        var compass = dot.x() <= 0 ? 'west' : 'east',\n            limit = compass == 'west' ? min_limit: max_limit;\n\n        return {dot: dot, compass: compass , limit: limit};\n    };\n\n    var checkYOutOfBorders = function() {\n        var min_limit = - o.dot_side/2,\n            max_limit = base_canvas.height - o.dot_side/2,\n            dot = utils.detect(dots, function(dot) {\n                return dot.y() <= min_limit || dot.y() > max_limit;\n            });\n\n        if (!dot) { return false; }\n        var compass = dot.y() <= 0 ? 'north' : 'south',\n            limit = compass == 'north' ? min_limit: max_limit;\n\n        return {dot: dot, compass: compass , limit: limit};\n    };\n\n    var setInitDotsValues = function(side, w, h) {\n        var x = w/2 - side/2, y = h/2 - side/2;\n        dots.lt.x(x); dots.lt.y(y); \n        dots.lb.x(x); dots.lb.y(y + side); \n        dots.rt.x(x + side); dots.rt.y(y); \n        dots.rb.x(x + side); dots.rb.y(y + side); \n    };\n\n    var showNativeModal = function() {\n        $modal_blocker.show();\n        toCenter($modal);\n    };\n\n    var setUiToModal = function() {\n        if (o.use_native_modal) {\n            $modal.append($ui);\n            showNativeModal();\n        }\n        o.onDomCreated($ui);\n    };\n\n    return {\n        init: function(options) {\n            o = $.extend({\n                CROP_NAME: 'резать',\n                CANCEL: 'отмена',\n                MIN_IMG_SIDE_ERROR: 'Слишком маленькое изображение по ширине или выстоте',\n                CANVAS_NOT_SUPPORTED: 'canvas not supported in this browser',\n                square_mode: true,\n\n                max_crop_side: 400,\n                min_crop_side: 50,\n\n                max_img_side: 600,\n                min_img_side: 100,\n\n                init_crop_side: 100,\n                dot_side: 10,\n\n                use_native_modal: true,\n                use_native_button: true,\n\n                onDomCreated: function($ui) {},\n                oncancel: function() {},\n                oncrop: function(cropped_url) {},\n                alertFn: function(msg) { alert(msg); },\n\n                modal_class: 'modal'\n            }, options);\n\n            $ui = $(\"<div>\" +\n                        \"<div style='position: relative'>\" +\n                            \"<canvas></canvas>\" +\n                            \"<canvas style='position:absolute; top:0; left:0'></canvas>\" +\n                            \"<canvas style='position:absolute; top:0; left:0'></canvas>\" +\n                        \"</div>\" +\n                    \"</div>\");\n\n            if (o.use_native_modal) {\n                $modal_blocker = $(utils.supplant(\n                    \"<div class='darken_bgr' style='display:none'>\" +\n                        \"<div class='{modal_class}' style='position:fixed;'>\" +\n                        \"</div>\" +\n                    \"</div>\", {modal_class: o.modal_class}));\n\n                $modal = $modal_blocker.find(\".\" + o.modal_class);\n            }\n            if (o.use_native_button) {\n                $btn_crop = \n                    $(utils.supplant(\"<input type='button' name='crop' value='{cropname}'/>\", {cropname: o.CROP_NAME}));\n                $btn_cancel = \n                    $(utils.supplant(\"<input type='button' name='cancel' value='{cancel}'/>\", {cancel: o.CANCEL}));\n                $ui.append($btn_crop).append($btn_cancel);\n            }\n\n            var $canvases = $ui.find('canvas');\n            base_canvas   = $canvases[0];\n            darken_canvas = $canvases[1];\n            f_canvas      = $canvases[2];\n\n            if (!base_canvas.getContext) {\n                o.alertFn(o.CANVAS_NOT_SUPPORTED);\n                return false;\n            }\n\n            this.setUrl(o.url);\n            this.setButtonActions();\n\n            $('body').append($modal_blocker);\n        },\n        setUrl: function(url) {\n            var it = this;\n            var img = document.createElement('img');\n            //img.addEventListener('load', function() { \n            $(img).on('load', function() { \n                var width  = this.width; \n                var height = this.height;\n\n                if (width > o.max_img_side || height > o.max_img_side) {\n                    if (width > height) {\n                        this.width = o.max_img_side;\n                        this.height = height * this.width/width;\n                    } else {\n                        this.height = o.max_img_side;\n                        this.width = width * this.height/height;\n                    }\n                    width = this.width;\n                    height = this.height;\n                }\n\n                if (width < o.min_img_side || height < o.min_img_side) {\n                    o.alertFn(o.MIN_IMG_SIDE_ERROR);\n                    return false;\n                }\n\n                base_canvas.width = width;\n                base_canvas.height = height;\n                base_canvas.getContext('2d').drawImage(this, 0, 0, width, height);\n                darken_canvas.width  = width;\n                darken_canvas.height = height;\n                f_canvas.width = width;\n                f_canvas.height = height;\n\n                setUiToModal();\n                //o.onDomCreated($ui);\n                //$modal_blocker.show();\n                //toCenter($modal);\n                setInitDotsValues(o.init_crop_side, width, height);\n                it.setActionHandlers(f_canvas);\n                it.draw();\n            });\n            img.src = o.url;\n        },\n        draw: function() {\n            var f_ctx = f_canvas.getContext('2d');\n            f_ctx.clearRect(0, 0, f_canvas.width, f_canvas.height);\n\n            f_ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';\n            f_ctx.strokeStyle = '#000';\n\n            $.each(dots, function(i, dot) { \n                f_ctx.fillRect(dot.x(), dot.y(), o.dot_side, o.dot_side); \n                f_ctx.strokeRect(dot.x(), dot.y(), o.dot_side, o.dot_side); \n            });\n\n            var d_ctx = darken_canvas.getContext('2d');\n            d_ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';\n            d_ctx.clearRect(0, 0, f_canvas.width, f_canvas.height);\n            d_ctx.fillRect(0, 0, f_canvas.width, f_canvas.height);\n            d_ctx.clearRect(dots.lt.x() + o.dot_side/2, dots.lt.y() + o.dot_side/2, dots.rt.x() - dots.lt.x(), dots.lb.y() - dots.lt.y());\n        },\n        moveArea: function(x, y, old_x, old_y) {\n            var diff_x = old_x - x; \n            var diff_y = old_y - y;\n            $.each(dots, function(i, dot) {\n                dot.x(dot.x() - diff_x);\n                dot.y(dot.y() - diff_y);\n            });\n\n            var out_x = checkXOutOfBorders();\n            if (out_x) {\n                var xside = getSideX(out_x.dot, out_x.dot.x());\n                if (out_x.compass == 'west') { \n                    dots.lt.x(out_x.limit);         dots.lb.x(out_x.limit);\n                    dots.rt.x(out_x.limit + xside); dots.rb.x(out_x.limit + xside);\n                } else {\n                    dots.rt.x(out_x.limit);         dots.rb.x(out_x.limit);\n                    dots.lt.x(out_x.limit - xside); dots.lb.x(out_x.limit - xside);\n                }\n            }\n\n            var out_y = checkYOutOfBorders();\n            if (out_y) {\n                var yside = getSideY(out_y.dot, out_y.dot.y());\n                if (out_y.compass == 'north') { \n                    dots.lt.y(out_y.limit);         dots.rt.y(out_y.limit);\n                    dots.lb.y(out_y.limit + yside); dots.rb.y(out_y.limit + yside);\n                } else {\n                    dots.lb.y(out_y.limit);         dots.rb.y(out_y.limit);\n                    dots.lt.y(out_y.limit - yside); dots.rt.y(out_y.limit - yside);\n                }\n            }\n\n            this.draw();\n        },\n        moveDot: function(x, y, old_x, old_y) {\n            x = x - o.dot_side/2;\n            y = y - o.dot_side/2;\n            var dot = utils.detect(dots, function(_dot) { return _dot.active; }),\n                sidex = getSideX(dot, x),\n                sidey = getSideY(dot, y);\n           \n            dot.x(x); dot.y(y);\n\n            var out_x = checkXOutOfBorders();\n            if (out_x) {\n                var xside = getSideX(out_x.dot, out_x.dot.x());\n                if (out_x.compass == 'west') { \n                    dots.lt.x(out_x.limit);         dots.lb.x(out_x.limit);\n                    dots.rt.x(out_x.limit + xside); dots.rb.x(out_x.limit + xside);\n                } else {\n                    dots.rt.x(out_x.limit);         dots.rb.x(out_x.limit);\n                    dots.lt.x(out_x.limit - xside); dots.lb.x(out_x.limit - xside);\n                }\n            }\n\n            var out_y = checkYOutOfBorders();\n            if (out_y) {\n                var yside = getSideY(out_y.dot, out_y.dot.y());\n                if (out_y.compass == 'north') { \n                    dots.lt.y(out_y.limit);         dots.rt.y(out_y.limit);\n                    dots.lb.y(out_y.limit + yside); dots.rb.y(out_y.limit + yside);\n                } else {\n                    dots.lb.y(out_y.limit);         dots.rb.y(out_y.limit);\n                    dots.lt.y(out_y.limit - yside); dots.rt.y(out_y.limit - yside);\n                }\n            }\n\n            if (o.max_crop_side) {\n                sidex >= o.max_crop_side && dot.x(getXLimit(dot, o.max_crop_side));\n                sidey >= o.max_crop_side && dot.y(getYLimit(dot, o.max_crop_side));\n            }\n            if (o.min_crop_side) {\n                sidex <= o.min_crop_side && dot.x(getXLimit(dot, o.min_crop_side));\n                sidey <= o.min_crop_side && dot.y(getYLimit(dot, o.min_crop_side));\n            }\n\n            if (o.square_mode) {\n                sidex = getSideX(dot, dot.x());\n                sidey = getSideY(dot, dot.y());\n                if (sidex !== sidey) {\n                    sidex < sidey ? dot.x(getXLimit(dot, sidey)) : dot.y(getYLimit(dot, sidex));\n                }\n            }\n\n            if (dot == dots.lt) { dots.rt.y(dot.y()); dots.lb.x(dot.x()); } \n            if (dot == dots.rb) { dots.rt.x(dot.x()); dots.lb.y(dot.y()); } \n            if (dot == dots.rt) { dots.lt.y(dot.y()); dots.rb.x(dot.x()); } \n            if (dot == dots.lb) { dots.lt.x(dot.x()); dots.rb.y(dot.y()); } \n\n            this.draw();\n        },\n        setActionHandlers: function(canvas) {\n            var it = this,\n                target,\n                drag_position,\n                drag = false;\n\n            $(canvas).on('mousedown', function(e) {\n                target = it.getTarget(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY);\n                if (target == 'dot') {\n                    setActiveDot(getDotInThisPosition(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY));\n                }\n                drag_position = {x: e.offsetX || e.originalEvent.layerX, y: e.offsetY || e.originalEvent.layerY};\n                drag = true;\n\n            });\n            $(canvas).on('mousemove', function(e) {\n                if (drag) { \n                    if (target == 'dot') {\n                        it.moveDot(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position.x, drag_position.y);\n                    } else if (target == 'area') {\n                        it.moveArea(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position.x, drag_position.y);\n                        drag_position = {x: e.offsetX || e.originalEvent.layerX, y: e.offsetY || e.originalEvent.layerY};\n                    }\n                } else {\n                    it.setCursor(canvas, \n                        it.getTarget(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY),\n                        getDotInThisPosition(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY));\n                }\n            });\n            $(canvas).on('mouseup', function() { \n                target = false; \n                drag = false;\n            });\n        },\n        /* returns 'false', 'area', 'dot' */\n        getTarget: function(x, y) {\n            return getDotInThisPosition(x, y) ? 'dot' : isPositionInArea(x, y) ? \"area\" : false;\n        },\n        setCursor: function(canvas, target, dot) {\n            if (target == 'dot') {\n                if (dot == dots.lt) { $(canvas).css('cursor', 'nw-resize'); }\n                if (dot == dots.rt) { $(canvas).css('cursor', 'ne-resize'); }\n                if (dot == dots.rb) { $(canvas).css('cursor', 'se-resize'); }\n                if (dot == dots.lb) { $(canvas).css('cursor', 'sw-resize'); }\n            } else if (target == 'area') {\n                $(canvas).css('cursor', 'pointer');\n            } else {\n                $(canvas).css('cursor', 'default');\n            }\n        },\n        setButtonActions: function() {\n            var it = this;\n            if (o.use_native_button) {\n                $btn_crop.on('click', function() { it.crop(); });\n                $btn_cancel.on('click', function() { it.cancel(); });\n            }\n        },\n        crop: function() {\n            var im_data = base_canvas.getContext('2d').getImageData(dots.lt.x() + o.dot_side/2, dots.lt.y() + o.dot_side/2, dots.rt.x() - dots.lt.x(), dots.lb.y() - dots.lt.y());\n            var canvas = document.createElement('canvas');\n            canvas.width = Math.abs(dots.rt.x() - dots.lt.x());\n            canvas.height = Math.abs(dots.lb.y() - dots.lt.y());\n            canvas.getContext('2d').putImageData(im_data, 0, 0);\n\n            var url = canvas.toDataURL();\n            o.oncrop && o.oncrop(url);\n            o.use_native_modal && $modal_blocker.hide();\n        },\n        cancel: function() { \n            o.use_native_modal && $modal_blocker.hide(); \n            o.oncancel();\n        }\n    };\n})();\nmodule.exports = {\n    html5Crop: html5Crop\n};\n\n//@ sourceURL=/html5-crop.js"
));

require.define("/common.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*global module, require */\n\n/* позволяет делать всякие такие штуки - supplant(\"Hello {variable}\", {variable: \"World !\"}) // return Hello World ! */\nvar supplant = function (str, o) {\n    return str.replace(/\\{([^{}]*)\\}/g,\n        function (a, b) {\n            var r = o[b];\n            return typeof r === 'string' || typeof r === 'number' ? r : a;\n        }\n    );\n};\n\n/* Итерирует объект, и возвращает первое соответсвие заданному шаблону.\n * author - rmnxrc\n * использование:\n       var item = sm.detect(['1', '2', '3', '4', '5'], function(value){\n           return value > \"3\";\n       });\n       //item = 4\n */\nvar detect = function (iter_object, fn) {\n    var result = false;\n    $.each(iter_object, function (index, value) {\n        if (fn(value)) {\n            result = value;\n            return false;\n        }\n    });\n    return result;\n};\n\nvar toCenter = function($el) {\n    $el.css('left', $(window).width()/2)\n       .css('margin-left', -$el.width()/2 + 'px');\n\n};\n\nvar utils = {\n    supplant: supplant,\n    detect: detect,\n    toCenter: toCenter\n};\nmodule.exports = utils;\n\n//@ sourceURL=/common.js"
));

require.define("/html5-webcam.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*global alert, require*/\nwindow.URL = window.URL || window.webkitURL;\nnavigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||\n                          navigator.mozGetUserMedia || navigator.msGetUserMedia;\n\nvar html5Crop = require(\"./html5-crop.js\").html5Crop;\nwindow.html5Crop = html5Crop; //make html5crop - global\n\n(function($) {\n    var utils = require(\"./common.js\");\n\n    $.fn.html5WebCam = function(options) {\n        $(this).each(function(){\n            var $this = $(this), it = this;\n\n            if ($this.data(\"html5WebCam\")) { \n                if (typeof options !== 'string') { return false; }\n                return $this.data(options) ? $this.data(options)() : html5Crop.crop();\n            }\n\n            $this.data(\"html5WebCam\", true);\n\n            var stream, $modal_blocker, $modal, $btn_snapshot, $btn_cancel,\n                o = $.extend({\n                    NOT_SUPPORT_FEATURE: 'Этот браузер не поддерживает захват с камеры',\n                    CAMERA_NOT_FOUND: 'Камера не найдена на этом устройстве',\n                    CLICK_TO_PAUSE: 'Нажмите для воспроизведения/остановки',\n                    TAKE_SNAPSHOT: 'Сделать снимок',\n                    CANCEL: 'Отмена',\n                    max_video_size: 600,\n                    modal_class: 'modal',\n                    use_native_modal: true,\n                    use_native_button: true,\n                    onDomCreated: function($html) { },\n                    onsnapshot: function(snapshot) {},\n                    use_crop: true,\n                    oncrop: function(cropped_url) {},\n                    oncancel: function() {},\n                    alertFn: function(msg) { alert(msg); }\n                    \n                },options),\n                ui = \n                    utils.supplant(\n                        \"<div>\" +\n                            \"<div><video autoplay title='{pause}'></div>\" +\n                        \"</div>\", { pause: o.CLICK_TO_PAUSE }),\n                $ui = $(ui);\n\n            $this.data('snapshot', function() {\n                var canvas = document.createElement('canvas');\n                var width = $video.width();\n                var height = $video.height();\n                canvas.width = width;\n                canvas.height = height;\n                canvas.getContext('2d').drawImage(video, 0, 0, width, height);\n                var data_url = canvas.toDataURL();\n                video.pause();\n                try { stream.stop(); } catch (e) {}\n                o.use_native_modal && $modal_blocker.hide();\n\n                o.onsnapshot(data_url);\n                if (o.use_crop) {\n                    var o_clone = $.extend({}, o);\n                    html5Crop.init($.extend(o_clone, {\n                        url: data_url,\n                        oncrop: function(cropped_url) {\n                            o.oncrop.apply(it, [cropped_url]);\n                            $modal_blocker.hide();\n\n                        },\n                        onDomCreated: function($html) {\n                            if (o.use_native_modal) {\n                                $modal.children().detach();\n                                $modal.append($html);\n                                showNativeModal();\n                            }\n                            o.onDomCreated.apply(it, [$html]);\n                        }, \n                        use_native_modal: false,\n                        oncancel: function() {\n                            $this.data('cancel')();\n                        }\n                    }));\n                }\n            });\n\n            $this.data('cancel', function() {\n                video.pause();\n                try { stream.stop(); } catch (e) {}\n                o.use_native_modal && $modal_blocker.hide();\n                o.oncancel();\n            });\n\n            if (o.use_native_button) {\n                $btn_snapshot =\n                    $(utils.supplant(\"<input type='button' name='snapshot' value='{snapshot}'/>\", {snapshot: o.TAKE_SNAPSHOT}));\n                $btn_cancel = \n                    $(utils.supplant(\"<input type='button' name='cancel' value='{cancel}'/>\", {cancel: o.CANCEL}));\n\n                $ui.append($btn_snapshot).append($btn_cancel);\n\n                $btn_snapshot.on('click', function() { \n                    $this.data('snapshot')(); });\n                $btn_cancel  .on('click', function() { $this.data('cancel')(); });\n            }\n\n            if (o.use_native_modal) {\n                $modal_blocker = $(utils.supplant(\n                                \"<div class='darken_bgr' style='display:none'>\" +\n                                    \"<div class='{modal_class}' style='position:fixed;'></div>\" +\n                                \"</div>\", {modal_class: o.modal_class}));\n                $modal = $modal_blocker.find(\".\" + o.modal_class);\n                $('body').append($modal_blocker);\n            }\n\n            var $video = $ui.find('video'),\n                video = $video[0];\n\n            var showNativeModal = function() {\n                $modal_blocker.show();\n                utils.toCenter($modal);\n            };\n\n            var setUiToModal = function() {\n                if (o.use_native_modal) {\n                    $modal.children().detach();\n                    $modal.append($ui);\n                    showNativeModal();\n                }\n                o.onDomCreated($ui);\n            };\n\n            video.addEventListener('click', function() { video.paused ? video.play() : video.pause(); });\n\n            video.addEventListener('loadedmetadata',function() {\n                if (o.max_video_size && (video.videoWidth > o.max_video_size || video.videoHeight > o.max_video_size)) {\n                    video.videoWidth > video.videoHeight ?\n                        $video.width(o.max_video_size) :\n                        $video.height(o.max_video_size);\n                }\n                setUiToModal();\n                video.play();\n            });\n\n            $this.on('click', function() {\n                if (!navigator.getUserMedia) { o.alertFn(o.NOT_SUPPORT_FEATURE); return false; }\n\n                navigator.getUserMedia && navigator.getUserMedia({video: true, audio: true}, function(_stream) {\n                    stream = _stream;\n                    video.src = window.URL ? window.URL.createObjectURL(stream) : stream; // in opera stream dont must be converted to objectURL\n                    //video.src = window.URL.createObjectURL(_stream); // in opera stream dont must be converted to objectURL\n\n                }, function() { o.alertFn(o.CAMERA_NOT_FOUND); });\n            });\n\n        });\n        return this;\n    };\n})(jQuery);\n\n//@ sourceURL=/html5-webcam.js"
));
require("/html5-webcam.js");
})();
