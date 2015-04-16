var map;
var mapOptions = {
  zoom: 12,
    disableDefaultUI:true,
    zoomControl:true,
    zoomControlOptions:{
        position:google.maps.ControlPosition.LEFT_BOTTOM
    }  
};
var currentPosition = null;
function initialize() {            
  map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);

  // Try HTML5 geolocation
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      currentPosition = new google.maps.LatLng(position.coords.latitude,
                                       position.coords.longitude);

      var infowindow = new google.maps.InfoWindow({
        map: map,
        position: currentPosition,
        content: 'Location found using HTML5.'
      });
      var marker = new google.maps.Marker({
         map:map,
         position:currentPosition,
         title:"Position aquired with navigator.geolocation"
      });
      centerToGeolocation();
    }, function() {
      handleNoGeolocation(true);
    });
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
  
  $(".button-reposition").on("click",centerToGeolocation);
}
function centerToGeolocation(){
    map.setCenter(currentPosition);
}
function handleNoGeolocation(errorFlag) {
  if (errorFlag) {
    var content = 'Error: The Geolocation service failed.';
  } else {
    var content = 'Error: Your browser doesn\'t support geolocation.';
  }

  var options = {
    map: map,
    position: new google.maps.LatLng(60, 105),
    content: content
  };

  var infowindow = new google.maps.InfoWindow(options);
  map.setCenter(options.position);
}

google.maps.event.addDomListener(window, 'load', initialize);