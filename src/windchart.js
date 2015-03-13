/**
 * D3 source for Wind chart.
 * Refer to init.js for instantiation.
 * 
 * @author Mike Adamczyk <mike@bom.us>
 * @package skyward
 */
Date.prototype.getMonthName = function () {
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[this.getMonth()];
}

// Get the JSON data via AJAX.
function getData (month,callsign) {
    var m = month<10 ? "0"+month.toString() : month.toString();
    
    // Cache the JSON results for client, so client doesn't have to request again.
    if (cache[callsign+month]) {
        return init(cache[callsign+month]);
    }
    $('body').addClass('loading');
    $.ajax ({
        url:SOURCEURL, // Node.js server, see index.js
        data:{m:m, callsign:callsign},
        method:'GET', dataType:'JSON',
        success: init,
        error: function (xhr,error) { console.log (xhr,error); }

    });
}

/**
 * Draw the chart with the given JSON data.
 * @param {type} json
 * @returns {undefined}
 */
function init (json) {
    
    var body = $('body');
    body.removeClass('loading');
    var key = json[0].callsign+json[0].month;
    
    // Store in cache object.
    cache[key] = json;
    chart = new ASOS_Chart (json);
}

/**
 * Charting function.
 * @returns {ASOS_Chart}
 */
function ASOS_Chart (json) {
    
    // Globals.
    var self = this;
    var $chart = $('#chart');
    var container = d3.select ('#chart');
    
    // Settings.
    var vectorScale = 9; // Vector paths can be long, so scale them back.
    
    // Max/Min value ranges for coordinates.
    var xMax=0;
    var yMax=0;
    var xMin=0;
    var yMin=0; 
    
    // Viewport
    this.vpW=$chart.width();
    this.vpH=$chart.height();
    
    var xOrigin = this.vpW*0.1;
    var yOrigin = this.vpH/2;
    var spacing = (this.vpW-(xOrigin*2)) / 30;
    
    // We'll set up the domains after.
    var xScale = d3.scale.linear().range([0,this.vpW]);
    var yScale = d3.scale.linear().range([0,this.vpH]);    
    
    this.date;
    
    /**
     * Return the Max or Min value points.
     * @returns {Array}
     */
    this.getMax = function () {
        return [xMax,yMax];
    }
    this.getMin = function () {
        return [xMin,yMin];
    }
    
    /**
     * Clears the drawing canvas.
     * @returns {Boolean}
     */
    this.clear = function () {
        container.select('svg').remove();
        return true;
    }
    
    // Data arrays.
    this.julians = {};
    this.ids = [];
    
    
    // Organize the JSON data.
    function sortData (json) {
        
        for (var i=0; i<json.length; i++) {
            var object = new ASOS_Data (json[i]);
            self.ids[object.id] = object;

            // Separate by Julian day, so we can make separate graphs per day.
            var datestr = object.datestr;
            if (!self.julians[datestr]) {
                self.julians[datestr] = new ASOS_DataArray();
            }
            self.julians[datestr].add (object);
        }
        self.date = self.ids[1].date;
    }
    


    
    /**
     * The position of each point is projected from the previous point based on the windspeed and direction.
     * The direction is 0-360 degrees, and the distance is the vector length.
     */
    this.line = d3.svg.line()
        .x(function(d){ return d.x; })
        .y(function(d){ return d.y; })
        .interpolate('basis');
    
    /**
     * Pull out important data by day, and scale according to the viewport.
     * @returns {object} of data to use in draw method
     */
    this.mapData = function () {
        
        // First, go through each day of data, assign a color, and project the points.
        var objects = {};
        var days = 0;
        for (var julian in this.julians) {
            var data = this.julians[julian]; // ASOS_DataArray
            var origin = [days*spacing+xOrigin, yOrigin]; // Shift start of day to a new column, on same horizontal line.
            
            // calls setCoordinates() for the dataset, starting from given base point.
            data.resetOrigin (origin);
            objects[julian] = {
                day:    days,
                color:  rainbow (31, days),
                origin: origin,
                data:   data,
            }
            days++;
        }

        return objects;
    }
    
    /**
     * Main drawing method.
     * @returns {undefined}
     */
    this.draw = function (objects) {
        
        this.clear ();
        var svg = container.append('svg');
        
        // Adds a dot end to line when drawing is complete.
        var drawCircleEnd = function () { 
            var julian = d3.select(this).attr('id');
            var last = objects[julian].data.getLast();
            svg.append ('circle')
                .attr ('cx', last.x)
                .attr ('cy', last.y)
                .attr ('r',6)
                .attr ('fill', objects[julian].color);
        }
            
        // Display month name.
        svg.append ('text')
                .text(self.date.getMonthName())
                .attr('x',xOrigin-15).attr('y',yOrigin-35)
                .attr('dy','0.5em').attr('fill','white')
                .attr('font-weight','700');
        Line (svg,[xOrigin,yOrigin],[xOrigin+(30*spacing),yOrigin],'gray' ,1);
        
        for (var julian in objects) {
            var resource = objects[julian];
            var group = svg.append ('g');
            
            // Wind vector path.
            var path = group.append ("path")
                    .attr('id', julian)
                    .attr("d", this.line(resource.data.getIndex()))
                    .attr("stroke",resource.color)
                    .attr('stroke-width',2)
                    .attr("fill","none");
            
            var len = path.node().getTotalLength();
            
            // Line drawing animation
            path.attr("stroke-dasharray", len+" "+len)
                    .attr("stroke-dashoffset", len)
                    .transition().duration(10*len).ease("quad-out")
                    .attr("stroke-dashoffset",0)
                    .each('end', drawCircleEnd);
            
            // Origin circle.
            group.append ("circle")
                    .attr("r",12)
                    .attr("cx", resource.origin[0])
                    .attr("cy", resource.origin[1])
                    .attr("fill",resource.color);
            
            // Day number.
            group.append("text")
                    .attr('x', resource.origin[0])
                    .attr('y', resource.origin[1]+3)
                    .attr("font-size", 10)
                    .attr("fill","black")
                    .attr("text-anchor","middle")
                    .text(resource.day+1);
            
            resource.length = len;
            
            // End of drawing a day.
        }
        
        // Finished drawing.
        return objects;
    }


    sortData (json);
    this.draw ( this.mapData() );
    
    /**
     * ASOS Data object class.
     * @param {object} json
     * @returns {ASOS_Data}
     */
    function ASOS_Data (json) {
        
        // Setter.
        for (var x in json) { this[x] = json[x]; }
        this.x=xOrigin;
        this.y=yOrigin;
        this.date = new Date (this.date);
        
        /**
         * Determine the coordinates of this point.
         * @returns {Array}
         */
        this.setCoordinates = function () {
            if (this.prev) {
                var po = this.getPrev();
                var pt = projectPoint ([po.x, po.y], po.windSpeed/vectorScale, po.windDir);
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
        
        /**
         * Set this objects x,y point and advance the max/min ranges.
         * @param {type} x
         * @param {type} y
         * @returns {Array}
         */
        this.setPt = function (x,y) {
            this.x=x; this.y=y;
            if (y>yMax) yMax=y;
            if (x>xMax) xMax=x;
            if (y<yMin) yMin=y;
            if (x<xMin) xMin=x;
            return this.getPt();
        }
        
        /**
         * Get the previous data point.
         * The previous data row determines this point using projectPoint().
         * @returns {Array|Boolean}
         */
        this.getPrev = function () {
            if (this.prev) {
                return self.ids[this.prev];
            }
            return false;
        }
        
        /**
         * Scale data functions. See d3.scale.linear()
         * @param {type} scale
         * @returns {ASOS_Chart.ASOS_Data@pro;x@call;scale}
         */
        this.scaleX = function (scale) {
            return this.x = scale (this.x);
        }
        this.scaleY = function (scale) {
            return this.y = scale (this.y);
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
         * @param {Array} [x,y]
         * @returns {Boolean}
         */
        this.resetOrigin = function (pt) {
            
            var po = index[0].getPrev();
            if (po) po.setPt (pt[0],pt[1]);
            this.setCoordinates();
            index.pop(); // Last one is the first of the next day.
            return true;
        }
        
        this.setCoordinates = function () {
            for (var i=0; i<index.length; i++) {
                index[i].setCoordinates();
            }
        }
        
        this.scaleData = function (xScale,yScale) {
            for (var i=0; i<index.length; i++) {
                index[i].scaleX (xScale);
                index[i].scaleY (yScale);
            }
        }
        
        this.getDate = function () {
            return index[0].date;
        }
        
        this.getLast = function () {
            return index[index.length-2];
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


function Line (object,pt1,pt2,stroke,width) {
    object.append ('line')
            .attr('x1',pt1[0]).attr('y1',pt1[1])
            .attr('x2',pt2[0]).attr('y2',pt2[1])
            .attr('stroke', stroke?stroke:'black')
            .attr('stroke-width',width?width:1);
}

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
    az+=90; // Correction for coordinate plane. 0 & 360 are true north (up)
    var x1 = sp[0], y1 = sp[1];
    var x2 = x1 - Math.cos(rad(az)) * d;
    var y2 = y1 - Math.sin(rad(az)) * d;
    return [Math.round(x2*100)/100,Math.round(y2*100)/100];
}