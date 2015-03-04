/**
 * D3 source for Wind chart.
 * Loaded after <svg> tag.
 * 
 * @author Mike Adamczyk <mike@bom.us>
 * @package skyward
 */
Date.prototype.getMonthName = function () {
    var months = ["January","February","March","April","May","June","July","August","October","November","December"];
    return months[this.getMonth()];
}
$(document).ready (function () {
    $('.months a').on ('click', function(event) {
        event.preventDefault();
        var m = $(this).data('month');
        $('.months a').removeClass('active');
        $(this).addClass('active');
        console.log(m);
        getData(m);
    })
})


getData(1);



// Get the JSON data via AJAX.
function getData (month) {
    var m = month<10 ? "0"+month.toString() : month.toString();
    $('body').addClass('loading');
    $.ajax ({
        url:"http://breach.node:8080?m="+m,
        method:'GET', dataType:'JSON',
        success: init,
        error: function (xhr,error) { console.log (xhr,error); }

    });
}

function init (json) {
    var body = $('body');
    
    body.removeClass('loading');
    var chart = new ASOS_Chart (json);
}

/**
 * Charting function.
 * @returns {ASOS_Chart}
 */
function ASOS_Chart (json) {
    
    // Globals.
    var self = this;
    var container = d3.select ('#chart');
    container.select('svg').remove();
    var svg = container.append('svg');
    
    // Data arrays.
    this.julians = {};
    this.ids = [];
    this.lineOrigins = [];
    
    // Organize the JSON data.
    for (var i=0; i<json.length; i++) {
        var object = new ASOS_Data (json[i]);
        this.ids[object.id] = object;
        
        // Separate by Julian day, so we can make separate graphs per day.
        var datestr = object.datestr;
        if (!this.julians[datestr]) {
            this.julians[datestr] = new ASOS_DataArray();
        }
        this.julians[datestr].add (object);
    }
    var date = this.ids[1].date;
    var scale = 9;
    var spacing = 40;
    
    /**
     * The position of each point is projected from the previous point based on the windspeed and direction.
     * The direction is 0-360 degrees, and the distance is the vector length.
     */
    this.line = d3.svg.line()
        .x(function(d){ return d.x; })
        .y(function(d){ return d.y; })
        .interpolate('basis');
    
    /**
     * Main drawing method.
     * @returns {undefined}
     */
    this.draw = function () {
        var days=0;
        var groups={};
        svg.append ('text').text(date.getMonthName()).attr('x',80).attr('y',465).attr('dy','0.5em').attr('font-weight','700');
        for (var day in this.julians) {
            groups[day] = {};
            var data = this.julians[day];
            var xOrigin = days*spacing+100;
            data.resetOrigin(xOrigin, 500);
            var dindex = data.getIndex();
            
            //var color = '#'+Math.floor(Math.random()*16777215).toString(16);
            var color = rainbow (30, days);
            
            var group = svg.append ('g');
            
            group.append ("circle")
                    .attr("r",6)
                    .attr("cx", xOrigin)
                    .attr("cy", 500)
                    .attr("fill",color);

            group.append("text")
                    .attr('x', xOrigin)
                    .attr('y', 485)
                    .attr("dy", ".35em")
                    .attr("text-anchor","middle")
                    .text(dindex[0].day);


            // reset the origin.
            var path = group.append ("path")
                    .attr('id', day)
                    .attr("d", this.line(dindex))
                    .attr("stroke",color)
                    .attr('stroke-width',2)
                    .attr("fill","none")
            var len = path.node().getTotalLength();

            groups[day].group = group;
            groups[day].path = path;
            groups[day].data = dindex;
            groups[day].color = color;
            groups[day].length = len;
            groups[day].date = dindex[0].date;

            var drawCircleEnd = function() { 
                var day = d3.select(this).attr('id');
                var data = groups[day].data;
                var last = data[data.length-2];
                svg.append ('circle')
                    .attr ('cx', last.x)
                    .attr ('cy', last.y)
                    .attr ('r',6)
                    .attr ('fill', groups[day].color);
            }
            path.attr("stroke-dasharray", len+" "+len).attr("stroke-dashoffset", len)
                    .transition().duration(10*len).ease("quad-out").attr("stroke-dashoffset",0)
                    .each('end', drawCircleEnd);
            

            days++;
        };
        
    }

    this.draw();
    
    /**
     * ASOS Data object class.
     * @param {object} json
     * @returns {ASOS_Data}
     */
    function ASOS_Data (json) {
        // Setter.
        for (var x in json) { this[x] = json[x]; }
        this.x=100;
        this.y=500;
        this.date = new Date (this.date);
        
        /**
         * Determine the coordinates of this point.
         * @returns {Array}
         */
        this.setCoordinates = function () {
            if (this.prev) {
                var po = this.getPrev();
                var pt = projectPoint ([po.x, po.y], po.windSpeed/scale, po.windDir);
                this.setPt (pt[0],pt[1]);
            }
            return this.getPt();
        }
        
        /**
         * Return a x,y point array.
         * @returns {Array}
         */
        this.getPt = function () {
            return [this.x,this.y];
        }
        this.setPt = function (x,y) {
            this.x=x; this.y=y;
            return this.getPt();
        }
        this.getPrev = function () {
            if (this.prev) {
                return self.ids[this.prev]; // The previous data row determines this point.
            }
            return false;
        }
        
        return this;
    }
    
    /**
     * ASOS Data Array class.
     * Helps perform actions against arrays of data.
     * @param {array} array
     * @returns {ASOS_DataArray}
     */
    function ASOS_DataArray (array) {
        var index = array || [];
        
        /**
         * Reset the previous data objects line origin.
         * Preceeding data objects will build their line from the origin, like a snake.
         * @param {Number} x
         * @param {Number} y
         * @returns {Boolean}
         */
        this.resetOrigin = function (x,y) {
            self.lineOrigins.push ([x,y]);
            var po = index[0].getPrev();
            if (po) po.setPt (x,y);
            this.setCoordinates();
            return true;
        }
        
        this.setCoordinates = function () {
            for (var i=0; i<index.length; i++) {
                index[i].setCoordinates();
            }
        }
        
        this.add = function (data) {
            return index.push (data);
        }
        
        this.getIndex = function () {
            return index;
        }
        this.length = function () {
            return index.length;
        }
        return this;
    }
    

    
};


/**
 * Convert degrees to radians.
 * @param {float} deg
 * @returns {Number}
 */
function rad (deg) {
    return deg * (Math.PI / 180);
}
/**
 * Convert radians to degrees.
 * @param {float} rad
 * @returns {Number}
 */
function deg (rad) {
    return rad * (180 / Math.PI);
};


/**
 * Return the slope of a line given two points, [x,y]
 * @param {array} pt1
 * @param {array} pt2
 * @returns {float}
 */
function slope (pt1,pt2) {
    var x1 = pt1[0], x2 = pt2[0], y1 = pt1[1], y2 = pt2[1];
    var m = (y2-y1) / (x2-x1);
    return m;
}

/**
 * Projects a point from a point [x,y], given the direction and azimuth.
 * @param {array} sp start point [x,y]
 * @param {Number} d distance
 * @param {Number} az azimuth
 * @returns {Point}
 */
function projectPoint (sp, d, az) {
    az-=90; // Correction for coordinate plane. 0 & 360 are true north (up)
    var x1 = sp[0], y1 = sp[1];
    var x2 = x1 + Math.cos(rad(az)) * d;
    var y2 = y1 - Math.sin(rad(az)) * d;
    return [Math.round(x2*100)/100,Math.round(y2*100)/100];
}