new (function ASOS_App () {
    
    var app = this;
    
    // Dependancies
    var fs = require ('fs');
    var path = require ('path');
    var http = require ('http');
    var url = require ('url');
    var mu = require ('mu2');
    
    this.limit = false; // Make false to get all records.
    
    this.req;
    this.res;
    this.data;
    
    
    // Date prototype for Julian. Used to compare days.
    Date.prototype.getJulian = function () {
        return Math.floor((this / 86400000) - (this.getTimezoneOffset()/1440) + 2440587.5);
    }
    
    /**
     * Initialize the server environment on port 8080.
     * @returns {undefined}
     */
    this.runServer = function () {
        
        http.createServer (function(req, res) {
            app.req = req;
            app.res = res;
            var query = url.parse (req.url, true).query;
            var file = path.join (__dirname+"/data/", '64010KORD2014'+query.m+'.dat');
            fs.readFile(file, {encoding:'utf-8'}, app.read);
            console.log (new Date()+' Request by '+req.connection.remoteAddress);
        })
        .listen(8080);
        console.log ('Listening on :8080.');
    };
    
    /**
     * Callback method for readFile.
     * @param {object} err
     * @param {string} str
     * @returns {array} array of ASOS_Record objects.
     */
    this.read = function (err,str) {
        
        
        // Clear app.data array.
        app.data = [];
        var lns = str.split ("\n");
        lns.pop(); // Last line is not a row.
        for (var i=0; i < (!app.limit ? lns.length : app.limit); i++) {
            
            app.data[i] = new ASOS_Record (i, lns[i]);
            app.data[i].next = i<lns.length-1 ? i+1 : false;
            app.data[i].prev = i>0 ? i-1 : false;
        }
        app.res.writeHead (200, {
            "Content-Type":"application/json",
            "Access-Control-Allow-Origin" : "*",
        });
        app.res.write (JSON.stringify(app.data));
        app.res.end();
        
        return app.data;
    }
    
    // Constructor.
    this.runServer ();
    
    
    
    /**
     * ASOS record of data, which is parsed and stored in this class.
     * @param {string} datarow from ASOS .dat line
     * @returns {ASOS_Record}
     */
    function ASOS_Record (id, datarow) {
        
        // Check if the object ID exists. If so, return that object. Why recreate the object?
        if (app.data[id]) return app.data[id];
        
        var record = this;
        
        // References to next/previous ASOS_Record object ids.
        // The graphic script will use these. 
        this.prev;
        this.next;

        /**
         * Parse a line and store properties..
         * @param {string} dat
         * @returns {ASOS_Record}
         */
        this.parse = function (dat) {
            
            var dat = dat.split(" ");
            if (dat < 3) return false;
            
            //this._data = dat;
            this.id = id;
            this.wban = dat[0].substr (0,5);
            this.callsign = dat[5];
            this.year = parseInt (dat[1].substr(3,4));
            this.month = parseInt (dat[1].substr(7,2));
            this.day = parseInt (dat[1].substr(9,2));

            var time = dat[2].split (":");
            this.hour = parseInt (time[0]);
            this.min = parseInt (time[1]);
            this.sec = parseInt (time[2]);
            this.date = new Date (this.year, this.month-1, this.day, this.hour, this.min, this.sec);
            this.julian = this.date.getJulian ();
            this.datestr = "_"+this.year+this.month+this.day;
            
            this.type = dat[4];
            this.utc = dat[6];
            dat[7] = dat[7].replace ("KT","");
            this.windDir = parseInt (dat[7].substr(0,3));
            this.windSpeed = parseInt (dat[7].substr(3,2));
            this.visiblity = dat[8].replace('SM',"");

            // Cleanup
            if (isNaN (this.windSpeed)) this.windSpeed = false;
            if (isNaN (this.windDir)) this.windDir = false;
            
            return this;
        }
        
        /**
         * Get the next/previous ASOS_Record objects.
         * @returns {ASOS_App.data|Boolean}
         */
        this.getNext = function () {
            return this.next ? app.data[this.next] : false;
        }
        this.getPrev = function () {
            return this.prev ? app.data[this.prev] : false;
        }
        
        return this.parse (datarow);
    }
})();



