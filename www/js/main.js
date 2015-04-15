var directions = {};
var contactsWithAddress = [];
var contactAddresses = [];
var compassWatchId = -1;
var locationWatchId = -1;
var map_with_pos = {};
var previous_pos_marker = {};

$(document).ready(function() {
    document.addEventListener("deviceready", onDeviceReady, false);
    //for testing in Chrome browser uncomment
    //onDeviceReady();
});

function onDeviceReady() {
    console.log("Ready");
    $(window).bind('pageshow resize orientationchange', function(e) { // resize page if needed
        maxHeight();
    });
    $('#toggleswitch').change(function() { // toggle switch for FROM location
        var v = $(this).val();
        if (v === "on") {
            $("#fromfield").css("display", "none");
        } else {
            $("#fromfield").css("display", "block");
        }
    });

    $("#refreshMyLocationBt").click(function(e) { // refresh my location button
        e.stopImmediatePropagation();
        e.preventDefault();
        var app = new MyApplication();
        app.mylocation();
    });

    $("#cancelMyLocationBt").click(function(e) { // stop/resume watching my location button
        e.stopImmediatePropagation();
        e.preventDefault();
        var $icon = $($(this).find(".ui-icon")[0]);
        var oldClass = $icon.attr("class");
        if ($(this).text() === "Stop") {
            $($(this).find(".ui-btn-text")[0]).text("Resume");
            $icon.attr("class", oldClass.replace("delete", "star"));
            window.navigator.geolocation.clearWatch(locationWatchId);
        } else {
            $($(this).find(".ui-btn-text")[0]).text("Stop");
            $icon.attr("class", oldClass.replace("star", "delete"));
            var map = new MapCtrl();
            map.syncPositionWithMap();
        }
    });

    $("#refreshPhotoBt").click(function(e) { // refresh my photo button
        e.stopImmediatePropagation();
        e.preventDefault();
        var app = new MyApplication();
        app.photos();
    });
    $("#showPhoneStatus").click(function(e) { // show phone status information
        e.stopImmediatePropagation();
        e.preventDefault();
        var app = new MyApplication();
        app.showPhoneStatus();
    });

    maxHeight();
    var app = new MyApplication();
}

function maxHeight() {

    var w = $(window).height();
    var cs = $('div[data-role="content"]');
    for (var i = 0, max = cs.length; i < max; i++) {
        var c = $(cs[i]);
        var h = $($('div[data-role="header"]')[i]).outerHeight(true);
        var f = $($('div[data-role="footer"]')[i]).outerHeight(true);
        var c_h = c.height();
        var c_oh = c.outerHeight(true);
        var c_new = w - h - f - c_oh + c_h;
        var total = h + f + c_oh;
        if (c_h < c.get(0).scrollHeight) {
            c.height(c.get(0).scrollHeight);
        } else {
            c.height(c_new);
        }
    }

}

function showAlert(message, title) {
    if (window.navigator.notification) {
        window.navigator.notification.alert(message, null, title, 'OK');
    } else {
        alert(title ? (title + ": " + message) : message);
    }
}

function MyApplication() {
    var self = this;
    var connectionLess = ["undefinedAction", "about", "compass", "contacts", "addresses"];
    var forceConnectionCheck = ["search", "directions", "showAddress"];
    var states = {};
    states[Connection.UNKNOWN] = 'Unknown';
    states[Connection.ETHERNET] = 'Ethernet';
    states[Connection.WIFI] = 'WiFi';
    states[Connection.CELL_2G] = 'Mobile';
    states[Connection.CELL_3G] = 'Mobile';
    states[Connection.CELL_4G] = 'Mobile';
    states[Connection.NONE] = 'No network';

    function hasConnection() {
        if (window.navigator.connection.type === Connection.NONE) {
            return false;
        }
        return true;
    }

    this.showPhoneStatus = function() {
        showAlert(window.device.model + "(" + window.device.platform + " " + window.device.version + ")\nConnection: " + states[window.navigator.connection.type], "About");
    };

    /**
     * Calls method of MyApplication based on value of hash parameter
     * @returns {undefined}
     */
    this.route = function() {
        window.navigator.geolocation.clearWatch(locationWatchId);
        var _h = window.location.hash || "#undefinedAction";
        var stop = _h.length;
        if (_h.indexOf("?") > 0) {
            stop = _h.indexOf("?") - 1;
        }
        _h = _h.substr(1, stop);
        $("#map").html("");
        $("#addressMap").html("");

        if (!checkOK(_h)) {
            showAlert("Internet connection is required", "No internet connection");
            return;
        }

        if (typeof this[_h] === "function") {
            this[_h]();
        } else {
            window.console.log("action function not found: " + _h);
        }
    };

    function checkOK(page) {
        if (hasConnection()) {
            return true;
        }

        if (forceConnectionCheck.indexOf(page) > 0 && !hasConnection()) {
            return false;
        }
        if (!hasConnection() && (connectionLess.indexOf(page) < 0)) {
            return false;
        }
        return true;
    }

    this.photos = function() {
        $("#photosContent").html("");
        var mapHandler = new MapCtrl();
        mapHandler.loadPhoto(printPhoto);
    };

    function printPhoto(photo, name) {
        $("#photosContent").html("");
        if (typeof name !== "undefined") {
            $("#photosContent").append("<h4>" + name + "</h4>");
        }
        if (typeof photo !== "undefined") {
            $("#photosContent").append("<img style=\"width: 100%; \" src=\"" + photo + "\"/>");
        } else {
            showAlert("Photo not found", "Error");
        }
    }
    
    this.undefinedAction = function() {
        window.console.log("Action not defined");
    };

    this.mylocation = function() {
        resetStopButton();
        var mapHandler = new MapCtrl(function(error) {
            window.console.error(error.message);
        });
        mapHandler.headerID = "#header";
        mapHandler.locateMe();
    };

    function resetStopButton() {
        var $stopButton = $($("#cancelMyLocationBt")[0]);
        var $icon = $($stopButton.find(".ui-icon")[0]);
        var oldClass = $icon.attr("class");
        $($stopButton.find(".ui-btn-text")[0]).text("Stop");
        $icon.attr("class", oldClass.replace("star", "delete"));
    }

    function init() {
        self.route();
    }

    $(window).on('hashchange', function() {
        self.route();
    });

    init();
}

function MapCtrl(onFail) {
    var map;
    var marker;
    var infoWindow;

    var self = this;
    self.mapPrinted = false;
    this.mapContainter = "map";
    this.headerID = "#noheader";
    /**
     * Address to show on map
     * @type String
     */
    this.address = "Prague";

    /**
     * Loads new map
     * @param {Function} callback function to be called when map is loaded
     * @returns {undefined}
     */
    function loadMap(mapContainer, callback, waitForPostion) {
        var latlng = new google.maps.LatLng(55.17, 23.76);
        var myOptions = {
            zoom: 6,
            center: latlng,
            streetViewControl: true,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoomControl: true
        };

        map = new google.maps.Map(document.getElementById(mapContainer), myOptions);
        self.map = map;
        google.maps.event.trigger(map, 'resize');

        google.maps.event.addListener(map, 'tilesloaded', function() {
            if (!self.mapPrinted) {
                self.mapPrinted = true;
                if (waitForPostion) {
                    window.navigator.geolocation.getCurrentPosition(callback, onFail, {maximumAge: 10000, timeout: 300000, enableHighAccuracy: true});
                } else {
                    callback();
                }
            }
        });
    }

    this.syncPositionWithMap = function() {
        locationWatchId = window.navigator.geolocation.watchPosition(function(position) {
            showOnMap(position, self.headerID);
        }, onFail, {maximumAge: 10000, timeout: 10000, enableHighAccuracy: true});
    };

    /**
     * Loads new map
     * @param {Function} callback function to be called when map is loaded
     * @returns {undefined}
     */
    function loadMapWatchLocation(mapContainer, callback) {
        var latlng = new google.maps.LatLng(55.17, 23.76);
        var myOptions = {
            zoom: 6,
            center: latlng,
            streetViewControl: true,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoomControl: true
        };

        map = new google.maps.Map(document.getElementById(mapContainer), myOptions);
        self.map = map;
        map_with_pos = map;
        google.maps.event.trigger(map, 'resize');

        google.maps.event.addListener(map, 'tilesloaded', function() {
            if (!self.mapPrinted) {
                self.mapPrinted = true;
                locationWatchId = window.navigator.geolocation.watchPosition(callback, onFail, {maximumAge: 10000, timeout: 10000, enableHighAccuracy: true});
            }
        });
    }

    this.loadPhoto = function(callback) {
        $.mobile.showPageLoadingMsg();
        google.load("maps", "3.8", {"callback": function() {
                navigator.geolocation.getCurrentPosition(function(position) {
                    requestPhotosFromMaps(position, callback);
                }, onFail, {maximumAge: 10000, timeout: 300000, enableHighAccuracy: true});
            }, other_params: "sensor=true&language=en&libraries=places"});
    };

    function requestPhotosFromMaps(position, callback) {
        var request = {
            location: new google.maps.LatLng(position.coords.latitude, position.coords.longitude),
            radius: 3000
        };

        var service = new google.maps.places.PlacesService(document.getElementById("photosContent"));
        service.nearbySearch(request, function(results, status) {
            pickRandomPhoto(results, status, callback);
        });

    }

    function pickRandomPhoto(results, status, callback) {
        if (results.length === 0 || status != google.maps.places.PlacesServiceStatus.OK) {
            callback();
        }
        var random = parseInt(1000 * Math.random()) % results.length;
        var notFound = true;
        var iteration = 0;
        while (notFound && iteration < results.length) {
            if (typeof results[random].photos !== "undefined") {
                notFound = false;
                var url = (!results[random].photos[0].raw_reference) ? results[random].photos[0].getUrl({maxHeight: 1200}) : results[random].photos[0].raw_reference.fife_url;
                callback(url, results[random].name);
            } else {
                random = parseInt(1000 * Math.random()) % results.length;
                iteration += 1;
            }
        }
        $.mobile.hidePageLoadingMsg();
        if (notFound) {
            callback();
        }
    }

    function geo_error(error) {
        if (typeof error === "function") {
            error.callback();
        } else {
            showAlert("Problem with retrieving location ", "Error");
        }
    }

    /**
     * Shows reader's position on map
     */
    function showOnMap(position, headerID) {
        $(headerID).html("You Are Here");
        $.mobile.hidePageLoadingMsg();
        self.map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
        self.map.setZoom(15);

        var info =
                ('Latitude: ' + position.coords.latitude + '<br>' +
                        'Longitude: ' + position.coords.longitude + '<br>' +
                        'Altitude: ' + position.coords.altitude + '<br>' +
                        'Accuracy: ' + position.coords.accuracy + '<br>' +
                        'Altitude Accuracy: ' + position.coords.altitudeAccuracy + '<br>' +
                        'Heading: ' + position.coords.heading + '<br>' +
                        'Speed: ' + position.coords.speed + '<br>' +
                        'Timestamp: ' + new Date(position.timestamp));

        var point = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        if (!marker) {
            marker = new google.maps.Marker({
                position: point,
                map: self.map
            });
        } else {
            marker.setPosition(point);
        }
        previous_pos_marker = marker;
        if (!infoWindow) {
            infoWindow = new google.maps.InfoWindow({
                content: info
            });
        } else {
            infoWindow.setContent(info);
        }
        google.maps.event.addListener(marker, 'click', function() {
            infoWindow.open(self.map, marker);
        });
    }



    this.locateMe = function() {
        $.mobile.showPageLoadingMsg();
        google.load("maps", "3.8", {"callback": function() {
                loadMapWatchLocation(self.mapContainter, function(position) {
                    showOnMap(position, self.headerID);
                });
            }, other_params: "sensor=true&language=en&libraries=places"});
    };
}
