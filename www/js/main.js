var map;
var mapOptions = {
  zoom: 12,
    disableDefaultUI:true,
    zoomControl:true,
    zoomControlOptions:{
        position:google.maps.ControlPosition.LEFT_BOTTOM
    }  
};
var marker = null;
var infowindow = null;
var currentPosition = null;

function centerMap(position){
      currentPosition = new google.maps.LatLng(position.coords.latitude,
                                       position.coords.longitude);

      if(infowindow === null){
        infowindow = new google.maps.InfoWindow({
            map: map,
            content: 'Location found using HTML5.'
          });
      }
      if(marker === null){
          marker = new google.maps.Marker({
            map:map,
            title:"Position aquired with navigator.geolocation"
         });
      }
      
      infowindow.setPosition(currentPosition);
      marker.setPosition(currentPosition);
      centerToGeolocation();
};

function updateGeolocation()
{
  // Try HTML5 geolocation
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position){
        centerMap(position);
    }, function() {
      handleNoGeolocation(true);
    },
    {
        enableHighAccuracy:true,
        maximumAge:0,
        timeout:30000
    });
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
}

function initialize() {            
  map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);
  
  updateGeolocation();
  
  $(".button-reposition").on("click",updateGeolocation);
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