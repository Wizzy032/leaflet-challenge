// Wait for DOM to be fully loaded before executing
document.addEventListener('DOMContentLoaded', function() {
  // Initialize base maps
  const baseMaps = {
      // Standard street view
      "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }),

      // Topographic view showing terrain
      "Topographic Map": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }),

      // NASA's night light data view
      "Night View": L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/{time}/{tilematrixset}{maxZoom}/{z}/{y}/{x}.{format}', {
          attribution: 'NASA Earth Observatory',
          bounds: [[-85.0511287776, -179.999999975], [85.0511287776, 179.999999975]],
          minZoom: 1,
          maxZoom: 8,
          format: 'jpg',
          time: '',
          tilematrixset: 'GoogleMapsCompatible_Level'
      }),

      // Satellite imagery view
      "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP'
      })
  };

  // Initialize the map with default settings
  let map = L.map("map", {
      center: [40.7, -94.5], // Centers on US
      zoom: 3,               // Initial zoom level
      layers: [baseMaps["Street Map"]] // Default base map
  });

  // Create layer groups for toggleable data
  let earthquakes = new L.LayerGroup();
  let tectonicPlates = new L.LayerGroup();

  // Define overlay maps for layer control
  const overlayMaps = {
      "Earthquakes": earthquakes,
      "Tectonic Plates": tectonicPlates
  };

  // Add layer control to toggle different maps and data
  L.control.layers(baseMaps, overlayMaps, {
      collapsed: false // Keep control expanded
  }).addTo(map);

  // Style function for earthquake markers
  function styleInfo(feature) {
      return {
          opacity: 1,
          fillOpacity: 1,
          fillColor: getColor(feature.geometry.coordinates[2]), // Color based on depth
          color: "#000000",
          radius: getRadius(feature.properties.mag), // Size based on magnitude
          stroke: true,
          weight: 0.5
      };
  }

  // Determine marker color based on earthquake depth
  function getColor(depth) {
      // Returns increasingly darker colors for deeper earthquakes
      switch (true) {
          case depth > 90: return "#ea2c2c"; // Deep red for deepest
          case depth > 70: return "#ea822c"; // Orange-red
          case depth > 50: return "#ee9c00"; // Orange
          case depth > 30: return "#eecc00"; // Yellow-orange
          case depth > 10: return "#d4ee00"; // Light yellow-green
          default: return "#98ee00";         // Light green for shallowest
      }
  }

  // Calculate marker size based on earthquake magnitude
  function getRadius(magnitude) {
      return magnitude === 0 ? 1 : magnitude * 4;
  }

  // Format date for popup
  function formatDate(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
  }

  // Create popup content
  function createPopupContent(feature) {
      return `
          <h3>Location: ${feature.properties.place}</h3>
          <hr>
          <p>Magnitude: ${feature.properties.mag}</p>
          <p>Depth: ${feature.geometry.coordinates[2]} km</p>
          <p>Time: ${formatDate(feature.properties.time)}</p>
      `;
  }

  // Create and add the legend
  function createLegend() {
      let legend = L.control({ position: "bottomright" });

      legend.onAdd = function() {
          let div = L.DomUtil.create("div", "info legend");
          let grades = [-10, 10, 30, 50, 70, 90];
          let colors = [
              "#98ee00", "#d4ee00", "#eecc00",
              "#ee9c00", "#ea822c", "#ea2c2c"
          ];

          div.innerHTML = "<h4>Depth (km)</h4>";

          // Generate legend labels
          for (let i = 0; i < grades.length; i++) {
              div.innerHTML +=
                  '<i style="background: ' + colors[i] + '"></i> ' +
                  grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
          }

          return div;
      };

      return legend;
  }

  // Fetch and process earthquake data
  d3.json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson")
      .then(function(data) {
          // Add earthquake data to map
          L.geoJson(data, {
              pointToLayer: function(feature, latlng) {
                  return L.circleMarker(latlng);
              },
              style: styleInfo,
              onEachFeature: function(feature, layer) {
                  layer.bindPopup(createPopupContent(feature));
              }
          }).addTo(earthquakes);

          earthquakes.addTo(map);
          createLegend().addTo(map);
      })
      .catch(function(error) {
          console.error("Error fetching earthquake data:", error);
      });

  // Fetch and add tectonic plates data
  d3.json("https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json")
      .then(function(plateData) {
          L.geoJson(plateData, {
              color: "#ff6500",
              weight: 2
          }).addTo(tectonicPlates);

          tectonicPlates.addTo(map);
      })
      .catch(function(error) {
          console.error("Error fetching tectonic plates data:", error);
      });
});