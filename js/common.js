/*global module*/
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

var utils = {
    supplant: supplant,
    detect: detect,
    toCenter: toCenter
};
if (typeof module !== 'undefined') { module.exports = utils; }
