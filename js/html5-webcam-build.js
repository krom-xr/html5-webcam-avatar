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


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/html5-crop.js",function(require,module,exports,__dirname,__filename,process,global){/*global detect, toCenter, supplant, alert,module , require */
var html5Crop;
var base_canvas,darken_canvas, f_canvas;

html5Crop = (function() {
    var utils = require('./common.js');

    var o, modal, $modal, $modal_blocker, $btn_crop, $btn_cancel, freeze_x, freeze_y, $ui;

    var setDot = function(dot_name, value) {
        var it = this;
        it[dot_name] = value;
        return function(value) {
            //if (freeze_x && $.inArray(dot_name, ['lt_x', 'lb_x', 'rt_x', 'rb_x']) != -1) { return it[dot_name]; }
            //if (freeze_y && $.inArray(dot_name, ['lt_y', 'lb_y', 'rt_y', 'rb_y']) != -1) { return it[dot_name]; }
            it[dot_name] = value !== undefined ? value : it[dot_name];
            return it[dot_name];
        };
    };

    var dots = {
        lt: {x: setDot('lt_x'),   y: setDot('lt_y')}, rt: {x: setDot('rt_x'), y: setDot('rt_y')},
        lb: {x: setDot('lb_x'),   y: setDot('lb_y')}, rb: {x: setDot('rb_x'), y: setDot('rb_y')}

    };

    var getDotInThisPosition = function(x, y) {
        return utils.detect(dots, function(dot) {
            return Boolean((dot.x() < x && x < (dot.x() + o.dot_side)) && (dot.y() < y && y < (dot.y() + o.dot_side)));
        });
    };

    var isPositionInArea = function(x, y) {
        return (dots.lt.x() < x && x < dots.rt.x() + o.dot_side || dots.rt.x() < x && x < dots.lt.x() + o.dot_side) &&
               (dots.lt.y() < y && y < dots.lb.y() + o.dot_side || dots.lb.y() < y && y < dots.lt.y() + o.dot_side );
    };

    var setActiveDot = function(dot) {
        $.each(dots, function(i, _dot) { _dot.active = _dot == dot; });
    };

    var getXLimit = function(dot, limit_size) {
        return dot == dots.lt || dot == dots.lb ?
            dots.rt.x() - limit_size : dots.lt.x() + limit_size;
    };

    var getYLimit= function(dot, limit_size) {
        return dot == dots.lt || dot == dots.rt ?
            dots.lb.y() - limit_size : dots.lt.y() + limit_size;
    };

    var getSideX = function(dot, x) {
        var x1 = x;
        var x2 = (dots.lt == dot || dots.lb == dot) ? dots.rt.x() : dots.lt.x();
        return Math.abs(x1-x2);
    };

    var getSideY = function(dot, y) {
        var y1 = y;
        var y2 = (dots.lt == dot || dots.rt == dot) ? dots.lb.y() : dots.lt.y();
        return Math.abs(y1-y2);
    };

    var checkXOutOfBorders = function() {
        var min_limit = - o.dot_side/2,
            max_limit = base_canvas.width - o.dot_side/2,
            dot = utils.detect(dots, function(dot) {
                return dot.x() <= min_limit || dot.x() > max_limit;
            });

        if (!dot) { return false; }
        var compass = dot.x() <= 0 ? 'west' : 'east',
            limit = compass == 'west' ? min_limit: max_limit;

        return {dot: dot, compass: compass , limit: limit};
    };

    var checkYOutOfBorders = function() {
        var min_limit = - o.dot_side/2,
            max_limit = base_canvas.height - o.dot_side/2,
            dot = utils.detect(dots, function(dot) {
                return dot.y() <= min_limit || dot.y() > max_limit;
            });

        if (!dot) { return false; }
        var compass = dot.y() <= 0 ? 'north' : 'south',
            limit = compass == 'north' ? min_limit: max_limit;

        return {dot: dot, compass: compass , limit: limit};
    };

    var setInitDotsValues = function(side, w, h) {
        var x = w/2 - side/2, y = h/2 - side/2;
        dots.lt.x(x); dots.lt.y(y); 
        dots.lb.x(x); dots.lb.y(y + side); 
        dots.rt.x(x + side); dots.rt.y(y); 
        dots.rb.x(x + side); dots.rb.y(y + side); 
    };

    var showNativeModal = function() {
        $modal_blocker.show();
        toCenter($modal);
    };

    var setUiToModal = function() {
        if (o.use_native_modal) {
            $modal.append($ui);
            showNativeModal();
        }
        o.onDomCreated($ui);
    };

    return {
        init: function(options) {
            o = $.extend({
                CROP_NAME: 'резать',
                CANCEL: 'отмена',
                MIN_IMG_SIDE_ERROR: 'Слишком маленькое изображение по ширине или выстоте',
                CANVAS_NOT_SUPPORTED: 'canvas not supported in this browser',
                square_mode: true,

                max_crop_side: 400,
                min_crop_side: 50,

                max_img_side: 600,
                min_img_side: 100,

                init_crop_side: 100,
                dot_side: 10,

                use_native_modal: true,
                use_native_button: true,

                onDomCreated: function($ui) {},
                oncancel: function() {},
                oncrop: function(cropped_url) {},
                alertFn: function(msg) { alert(msg); },

                modal_class: 'modal'
            }, options);

            $ui = $("<div>" +
                        "<div style='position: relative'>" +
                            "<canvas></canvas>" +
                            "<canvas style='position:absolute; top:0; left:0'></canvas>" +
                            "<canvas style='position:absolute; top:0; left:0'></canvas>" +
                        "</div>" +
                    "</div>");

            if (o.use_native_modal) {
                $modal_blocker = $(utils.supplant(
                    "<div class='darken_bgr' style='display:none'>" +
                        "<div class='{modal_class}' style='position:fixed;'>" +
                        "</div>" +
                    "</div>", {modal_class: o.modal_class}));

                $modal = $modal_blocker.find("." + o.modal_class);
            }
            if (o.use_native_button) {
                $btn_crop = 
                    $(utils.supplant("<input type='button' name='crop' value='{cropname}'/>", {cropname: o.CROP_NAME}));
                $btn_cancel = 
                    $(utils.supplant("<input type='button' name='cancel' value='{cancel}'/>", {cancel: o.CANCEL}));
                $ui.append($btn_crop).append($btn_cancel);
            }

            var $canvases = $ui.find('canvas');
            base_canvas   = $canvases[0];
            darken_canvas = $canvases[1];
            f_canvas      = $canvases[2];

            if (!base_canvas.getContext) {
                o.alertFn(o.CANVAS_NOT_SUPPORTED);
                return false;
            }

            this.setUrl(o.url);
            this.setButtonActions();

            $('body').append($modal_blocker);
        },
        setUrl: function(url) {
            var it = this;
            var img = document.createElement('img');
            //img.addEventListener('load', function() { 
            $(img).on('load', function() { 
                var width  = this.width; 
                var height = this.height;

                if (width > o.max_img_side || height > o.max_img_side) {
                    if (width > height) {
                        this.width = o.max_img_side;
                        this.height = height * this.width/width;
                    } else {
                        this.height = o.max_img_side;
                        this.width = width * this.height/height;
                    }
                    width = this.width;
                    height = this.height;
                }

                if (width < o.min_img_side || height < o.min_img_side) {
                    o.alertFn(o.MIN_IMG_SIDE_ERROR);
                    return false;
                }

                base_canvas.width = width;
                base_canvas.height = height;
                base_canvas.getContext('2d').drawImage(this, 0, 0, width, height);
                darken_canvas.width  = width;
                darken_canvas.height = height;
                f_canvas.width = width;
                f_canvas.height = height;

                setUiToModal();
                //o.onDomCreated($ui);
                //$modal_blocker.show();
                //toCenter($modal);
                setInitDotsValues(o.init_crop_side, width, height);
                it.setActionHandlers(f_canvas);
                it.draw();
            });
            img.src = o.url;
        },
        draw: function() {
            var f_ctx = f_canvas.getContext('2d');
            f_ctx.clearRect(0, 0, f_canvas.width, f_canvas.height);

            f_ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            f_ctx.strokeStyle = '#000';

            $.each(dots, function(i, dot) { 
                f_ctx.fillRect(dot.x(), dot.y(), o.dot_side, o.dot_side); 
                f_ctx.strokeRect(dot.x(), dot.y(), o.dot_side, o.dot_side); 
            });

            var d_ctx = darken_canvas.getContext('2d');
            d_ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            d_ctx.clearRect(0, 0, f_canvas.width, f_canvas.height);
            d_ctx.fillRect(0, 0, f_canvas.width, f_canvas.height);
            d_ctx.clearRect(dots.lt.x() + o.dot_side/2, dots.lt.y() + o.dot_side/2, dots.rt.x() - dots.lt.x(), dots.lb.y() - dots.lt.y());
        },
        moveArea: function(x, y, old_x, old_y) {
            var diff_x = old_x - x; 
            var diff_y = old_y - y;
            $.each(dots, function(i, dot) {
                dot.x(dot.x() - diff_x);
                dot.y(dot.y() - diff_y);
            });

            var out_x = checkXOutOfBorders();
            if (out_x) {
                var xside = getSideX(out_x.dot, out_x.dot.x());
                if (out_x.compass == 'west') { 
                    dots.lt.x(out_x.limit);         dots.lb.x(out_x.limit);
                    dots.rt.x(out_x.limit + xside); dots.rb.x(out_x.limit + xside);
                } else {
                    dots.rt.x(out_x.limit);         dots.rb.x(out_x.limit);
                    dots.lt.x(out_x.limit - xside); dots.lb.x(out_x.limit - xside);
                }
            }

            var out_y = checkYOutOfBorders();
            if (out_y) {
                var yside = getSideY(out_y.dot, out_y.dot.y());
                if (out_y.compass == 'north') { 
                    dots.lt.y(out_y.limit);         dots.rt.y(out_y.limit);
                    dots.lb.y(out_y.limit + yside); dots.rb.y(out_y.limit + yside);
                } else {
                    dots.lb.y(out_y.limit);         dots.rb.y(out_y.limit);
                    dots.lt.y(out_y.limit - yside); dots.rt.y(out_y.limit - yside);
                }
            }

            this.draw();
        },
        moveDot: function(x, y, old_x, old_y) {
            x = x - o.dot_side/2;
            y = y - o.dot_side/2;
            var dot = utils.detect(dots, function(_dot) { return _dot.active; }),
                sidex = getSideX(dot, x),
                sidey = getSideY(dot, y);
           
            dot.x(x); dot.y(y);

            var out_x = checkXOutOfBorders();
            if (out_x) {
                var xside = getSideX(out_x.dot, out_x.dot.x());
                if (out_x.compass == 'west') { 
                    dots.lt.x(out_x.limit);         dots.lb.x(out_x.limit);
                    dots.rt.x(out_x.limit + xside); dots.rb.x(out_x.limit + xside);
                } else {
                    dots.rt.x(out_x.limit);         dots.rb.x(out_x.limit);
                    dots.lt.x(out_x.limit - xside); dots.lb.x(out_x.limit - xside);
                }
            }

            var out_y = checkYOutOfBorders();
            if (out_y) {
                var yside = getSideY(out_y.dot, out_y.dot.y());
                if (out_y.compass == 'north') { 
                    dots.lt.y(out_y.limit);         dots.rt.y(out_y.limit);
                    dots.lb.y(out_y.limit + yside); dots.rb.y(out_y.limit + yside);
                } else {
                    dots.lb.y(out_y.limit);         dots.rb.y(out_y.limit);
                    dots.lt.y(out_y.limit - yside); dots.rt.y(out_y.limit - yside);
                }
            }

            if (o.max_crop_side) {
                sidex >= o.max_crop_side && dot.x(getXLimit(dot, o.max_crop_side));
                sidey >= o.max_crop_side && dot.y(getYLimit(dot, o.max_crop_side));
            }
            if (o.min_crop_side) {
                sidex <= o.min_crop_side && dot.x(getXLimit(dot, o.min_crop_side));
                sidey <= o.min_crop_side && dot.y(getYLimit(dot, o.min_crop_side));
            }

            if (o.square_mode) {
                sidex = getSideX(dot, dot.x());
                sidey = getSideY(dot, dot.y());
                if (sidex !== sidey) {
                    sidex < sidey ? dot.x(getXLimit(dot, sidey)) : dot.y(getYLimit(dot, sidex));
                }
            }

            if (dot == dots.lt) { dots.rt.y(dot.y()); dots.lb.x(dot.x()); } 
            if (dot == dots.rb) { dots.rt.x(dot.x()); dots.lb.y(dot.y()); } 
            if (dot == dots.rt) { dots.lt.y(dot.y()); dots.rb.x(dot.x()); } 
            if (dot == dots.lb) { dots.lt.x(dot.x()); dots.rb.y(dot.y()); } 

            this.draw();
        },
        setActionHandlers: function(canvas) {
            var it = this,
                target,
                drag_position,
                drag = false;

            $(canvas).on('mousedown', function(e) {
                target = it.getTarget(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY);
                if (target == 'dot') {
                    setActiveDot(getDotInThisPosition(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY));
                }
                drag_position = {x: e.offsetX || e.originalEvent.layerX, y: e.offsetY || e.originalEvent.layerY};
                drag = true;

            });
            $(canvas).on('mousemove', function(e) {
                if (drag) { 
                    if (target == 'dot') {
                        it.moveDot(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position.x, drag_position.y);
                    } else if (target == 'area') {
                        it.moveArea(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY, drag_position.x, drag_position.y);
                        drag_position = {x: e.offsetX || e.originalEvent.layerX, y: e.offsetY || e.originalEvent.layerY};
                    }
                } else {
                    it.setCursor(canvas, 
                        it.getTarget(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY),
                        getDotInThisPosition(e.offsetX || e.originalEvent.layerX, e.offsetY || e.originalEvent.layerY));
                }
            });
            $(canvas).on('mouseup', function() { 
                target = false; 
                drag = false;
            });
        },
        /* returns 'false', 'area', 'dot' */
        getTarget: function(x, y) {
            return getDotInThisPosition(x, y) ? 'dot' : isPositionInArea(x, y) ? "area" : false;
        },
        setCursor: function(canvas, target, dot) {
            if (target == 'dot') {
                if (dot == dots.lt) { $(canvas).css('cursor', 'nw-resize'); }
                if (dot == dots.rt) { $(canvas).css('cursor', 'ne-resize'); }
                if (dot == dots.rb) { $(canvas).css('cursor', 'se-resize'); }
                if (dot == dots.lb) { $(canvas).css('cursor', 'sw-resize'); }
            } else if (target == 'area') {
                $(canvas).css('cursor', 'pointer');
            } else {
                $(canvas).css('cursor', 'default');
            }
        },
        setButtonActions: function() {
            var it = this;
            if (o.use_native_button) {
                $btn_crop.on('click', function() { it.crop(); });
                $btn_cancel.on('click', function() { it.cancel(); });
            }
        },
        crop: function() {
            var im_data = base_canvas.getContext('2d').getImageData(dots.lt.x() + o.dot_side/2, dots.lt.y() + o.dot_side/2, dots.rt.x() - dots.lt.x(), dots.lb.y() - dots.lt.y());
            var canvas = document.createElement('canvas');
            canvas.width = Math.abs(dots.rt.x() - dots.lt.x());
            canvas.height = Math.abs(dots.lb.y() - dots.lt.y());
            canvas.getContext('2d').putImageData(im_data, 0, 0);

            var url = canvas.toDataURL();
            o.oncrop && o.oncrop(url);
            o.use_native_modal && $modal_blocker.hide();
        },
        cancel: function() { 
            o.use_native_modal && $modal_blocker.hide(); 
            o.oncancel();
        }
    };
})();
module.exports = {
    html5Crop: html5Crop
};

});

require.define("/common.js",function(require,module,exports,__dirname,__filename,process,global){/*global exports*/
/* позволяет делать всякие такие штуки - supplant("Hello {variable}", {variable: "World !"}) // return Hello World ! */
var supplant = function (str, o) {
    return str.replace(/\{([^{}]*)\}/g,
        function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};

/* Итерирует объект, и возвращает первое соответсвие заданному шаблону.
 * author - rmnxrc
 * использование:
       var item = sm.detect(['1', '2', '3', '4', '5'], function(value){
           return value > "3";
       });
       //item = 4
 */
var detect = function (iter_object, fn) {
    var result = false;
    $.each(iter_object, function (index, value) {
        if (fn(value)) {
            result = value;
            return false;
        }
    });
    return result;
};


var toCenter = function($el) {
    $el.css('left', $(window).width()/2)
       .css('margin-left', -$el.width()/2 + 'px');

};

module.exports = {
    supplant: supplant,
    detect: detect,
    toCenter: toCenter
};

});

require.define("/html5-webcam.js",function(require,module,exports,__dirname,__filename,process,global){/*global alert, require*/
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

});
require("/html5-webcam.js");
})();
