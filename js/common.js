/* позволяет делать всякие такие штуки - supplant("Hello {variable}", {variable: "World !"}) // return Hello World ! */
var supplant = function (str, o) {
    return str.replace(/{([^{}]*)}/g,
        function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};

var toCenter = function($el) {
    $el.css('left', $(window).width()/2)
       .css('margin-left', -$el.width()/2 + 'px');

};

