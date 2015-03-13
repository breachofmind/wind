/**
 * Source url for the JSON return data.
 * @package skyward
 */
var chart;
var cache = {};
var SOURCEURL = "http://"+window.location.host+":8080";

// Event callbacks.
var Event = {
    // When a user clicks a month.
    CLICK_MONTH: function (event) {
        event.preventDefault();
        var m = $(this).data('month');
        $('.months a').removeClass('active');
        $(this).addClass('active');
        var callsign = $('#callsign').val();
        
        // Get the data for the given month and callsign (AJAX)
        getData(m, callsign);
    },
    
    // When a user changes the weather station.
    CHANGE_STATION: function (event) {
        var m = $('.months a.active').data('month');
        var callsign = $(this).val();
        getData(m, callsign);
    }
}


$(document).ready (function () {
    
    // Event listeners.
    $('.months a').on ('click', Event.CLICK_MONTH);
    $('#callsign').on ('change', Event.CHANGE_STATION);
})



// Initial dataset is for January, Chicago O'hare.
getData(1, 'KORD');