http://wind.bom.us
In this example, I wanted to be able to visualize wind information (ie, speed and direction) as an assembly of vectors for a given day. The longer the path length, the higher the overall windspeed for that day. The path's direction would indicate the general wind direction. Displaying the information this way could lend some understanding to the overall stability/predictability of the wind for a given region.

The data for this example is retrieved from the Nation Weather Service's ASOS (Automated Surface Observing System) weather stations. Weather data is saved in 5 minute intervals.

http://www.ncdc.noaa.gov/data-access/land-based-station-data/land-based-datasets/automated-surface-observing-system-asos

The application consists of two parts: 1) A Node.js server, running on port 8080, which accepts the weather station callsign and month as parameters, downloads/caches the data file, parses the file, and sends the parsed data back to the client as JSON; 2) Frontend, which is served by apache and provides a simple UI to select the month and weather station. The request JSON data is used by d3.js to build the SVG diagram.

Environment: Linux CENTOS 6.5, running apache webserver (port 80) and node.js server (port 8080)

Setting up on your own server:
1) Install server dependancies (node, wget)
2) Clone the repository:
git clone http://git.bom.us/skyward.git
3) Configure your vhost if necessary (ie, DocumentRoot /var/www/html/skyward, ServerName my.local)
4) Run the node server:
node index.js
5) Visit your URL in the browser.
