/**
 * Source url for the JSON return data.
 * @package skyward
 */
var SOURCEURL = "http://"+window.location.host+":8080";

$(document).ready (function () {
    
    $('.months a').on ('click', function(event) {
        event.preventDefault();
        var m = $(this).data('month');
        $('.months a').removeClass('active');
        $(this).addClass('active');
        var callsign = $('#callsign').val();
        getData(m, callsign);
    })
})

getData(1);