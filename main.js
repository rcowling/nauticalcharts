/*var viewer = OpenSeadragon({
    id: "openseadragon1",        
    tileSources: "https://cdm17272.contentdm.oclc.org/digital/iiif/agdm/8832/"
});    */
       
  // Function to download the GeoJSON object from the REST API    
  function downloadGeoJson(text, name) {
    var a = document.createElement('a');
    var type = name.split(".").pop();
    a.href = URL.createObjectURL( new Blob([text], { type:`text/${type === "txt" ? "plain" : type}` }) );
    a.download = name;
    a.click();
  }    

  // AGOL API JS
  require([
    "esri/Map", 
    "esri/views/MapView",
    "esri/layers/FeatureLayer", 
    "esri/geometry/Extent",
    "esri/smartMapping/statistics/uniqueValues"
    ], function(Map, MapView, FeatureLayer, Extent, uniqueValues){
  // Create a style for the chartsLayer
  var renderer = {
  type: "simple",  // autocasts as new SimpleRenderer()
  symbol: {
    type: "simple-fill",  // autocasts as new SimpleFillSymbol()
    color: [ 255, 128, 0, 0.5 ],
    outline: {  // autocasts as new SimpleLineSymbol()
      width: 1,
      color: "white"
    }
  }
  };

  // Create a FeatureLayer
  var chartsLayer = new FeatureLayer({
    url: "https://webgis.uwm.edu/arcgisuwm/rest/services/AGSL/agsl_nautical/MapServer/0",
    outFields: ["*"], // Return all fields so it can be queried client-side
    renderer: renderer
  });

  // Create the Map and add the featureLayer defined above
  map = new Map({
    basemap: "oceans",
    layers: [chartsLayer]
  });

  // Create the MapView
  var view = new MapView({
    container: "viewDiv",
    map: map,
    center: [0,0],    
    zoom: 3
  });

  // setup the contraints of the map
  view.constraints = {
  geometry: {            // Constrain lateral movement to the entire globe with no repeat
    type: "extent",
    xmin: -90,
    ymin: -180,
    xmax: 90,
    ymax: 180
  },
  minZoom: 2,          
  rotationEnabled: false // Disables map rotation
  };

  // Create the dropdown menu for the select filter
  var selectFilter = document.createElement("select");
  selectFilter.setAttribute("class", "esri-widget esri-select");
  selectFilter.setAttribute(
    "style",
    "width: 275px; font-family: Avenir Next W00; font-size: 1em;"
  );
  selectFilter.id = 'setFilter';

  var disabledOpt = document.createElement("option");
  disabledOpt.textContent = 'Select chart a series';
  disabledOpt.disabled = true;
  disabledOpt.selected = true;

  selectFilter.appendChild(disabledOpt);

  view.ui.add(selectFilter, "top-right");

  // Run a query on the chartsLayer to get unique field values from 'setTitle'
  var query = chartsLayer.createQuery();
  query.where = "1=1";
  query.outFields = [ "setTitle" ];
  query.returnDistinctValues = true;
  query.returnGeometry = false;

  // Use the response of the query to auto-populate the dropdown menus
  // for the chartsLayer filter and series select dropdown
  chartsLayer.queryFeatures(query)
    .then(function(response){
      var seriesSelect = document.getElementById('series');
      var filterSelect = document.getElementById('setFilter');
      // returns the unique values from the setTitle field
      var features = response.toJSON().features;    
      Object.values(features).forEach(function(value) {
        // for the series options on the download modal
        var seriesVal = value.attributes.setTitle;
        var seriesOpt = document.createElement("option");
        seriesOpt.textContent = seriesVal;
        seriesOpt.value = seriesVal;
        seriesSelect.appendChild(seriesOpt);
        // for the series options on the main map filter
        var filterOpt = document.createElement("option");
        filterOpt.textContent = seriesVal;
        filterOpt.placeholder = 'Select a series';
        filterOpt.value = "setTitle = " + "'" + seriesVal + "'";
        filterSelect.appendChild(filterOpt);
      });         
    });

  // Create a template for the popup
  var template = {
  // autocasts as new PopupTemplate()
  title: "<font color='#008000'>{title}",
  content: [     
        {
      type: "media",
      mediaInfos: [
        {
          title: "",
          type: "image",
          value: {sourceURL: '{thumbURL}'}
        }
      ]          
        },{
      type: "fields",
      fieldInfos: [
        {
          fieldName: "label",
          label: "label"
        },
        {
          fieldName: "west",
          label: "West"
        },
        {
          fieldName: "east",
          label: "East"
        },
        {
          fieldName: "north",
          label: "North"
        },
        {
          fieldName: "south",
          label: "South"
        },
        {
          fieldName: "scale",
          label: "Scale"
        }
      ]
    }, 
  ]
};

// Set the popup template on the layer
chartsLayer.popupTemplate = template;

function setFeatureLayerFilter(expression) {
  chartsLayer.definitionExpression = expression;
}
// The filter for the page load map view
// Only show small scale series
setFeatureLayerFilter("Shape_Area >= 9463642202000" );

//setFeatureLayerFilter("scale < 698000" );
// Exclude map scales according to the zoom level
// Use 'Shape_Area' because scale information might be missing for some charts     
view.watch("zoom", function(newValue) {
  if (newValue <= 2) {    
    setFeatureLayerFilter("Shape_Area >= 9463642202000" ); 
  } else if (newValue >= 4) {
    setFeatureLayerFilter("Shape_Area <= 946364220200" );
  }

  console.log("scale property changed: ", newValue);
});

// filter the chartsLayer using the attributes in the dropdown. 
selectFilter.addEventListener('change', function (event) {
      setFeatureLayerFilter(event.target.value);
});

// Add element for the download button using Esri widgets
var downloadBtn = document.createElement('div');
downloadBtn.className = "esri-icon-download esri-widget--button esri-widget esri-interactive";
downloadBtn.addEventListener('click', function(event){
  // when the download button is clicked show the modal
  $('#dataModal').modal('show') 
})

view.ui.add(downloadBtn, "top-left");

var download = document.getElementById('download');


getDataBtn.addEventListener('click', function(event){ 
  var seriesVal = document.getElementById('series').value;
var dataFormat = document.getElementById('format').value;
  console.log(seriesVal, dataFormat);
  if (dataFormat == 'csv') {  
// Get the charts data from the ArcGIS REST API
// Use an HTTP get request
    $.ajax({
            dataType: 'json',
            url: 'http://webgis.uwm.edu/arcgisuwm/rest/services/AGSL/agsl_nautical/MapServer/0/query?where=setTitle+%3D+%27' + seriesVal + '%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&havingClause=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=pjson',
            type: "GET",    
            success: function(data) {            
              // The output fields for the CSV, if new ones are added must add here           
              var fields = [            
                {
                  label: 'label', 
                  value: 'attributes.label',
                  default: 'NULL' 
                },
                {
                  label: 'title', 
                  value: 'attributes.title',
                  default: 'NULL' 
                },
                {
                  label: 'datePub', 
                  value: 'attributes.datePub',
                  default: 'NULL' 
                },
                {
                  label: 'scale', 
                  value: 'attributes.scale',
                  default: 'NULL' 
                },
                {
                  label: 'primeMer', 
                  value: 'attributes.primeMer',
                  default: 'NULL' 
                },
                {
                  label: 'west', 
                  value: 'attributes.west',
                  default: 'NULL' 
                },
                {
                  label: 'east', 
                  value: 'attributes.east',
                  default: 'NULL' 
                },
                 {
                  label: 'north', 
                  value: 'attributes.north',
                  default: 'NULL' 
                },
                 {
                  label: 'south', 
                  value: 'attributes.south',
                  default: 'NULL' 
                },
                {
                  label: 'color', 
                  value: 'attributes.color',
                  default: 'NULL' 
                },
                 {
                  label: 'available', 
                  value: 'attributes.available',
                  default: 'NULL' 
                },
                 {
                  label: 'physHold', 
                  value: 'attributes.physHold',
                  default: 'NULL' 
                },
                {
                  label: 'edition', 
                  value: 'attributes.edition',
                  default: 'NULL' 
                },
                {
                  label: 'publisher', 
                  value: 'attributes.projection',
                  default: 'NULL' 
                },
                {
                  label: 'projection', 
                  value: 'attributes.projection',
                  default: 'NULL' 
                },
                {
                  label: 'location', 
                  value: 'attributes.location',
                  default: 'NULL' 
                },
                {
                  label: 'digHold', 
                  value: 'attributes.digHold',
                  default: 'NULL' 
                },
                {
                  label: 'bathInterv', 
                  value: 'attributes.bathInterv',
                  default: 'NULL' 
                },
                {
                  label: 'bathLines', 
                  value: 'attributes.bathLines',
                  default: 'NULL' 
                },
                {
                  label: 'note', 
                  value: 'attributes.note',
                  default: 'NULL' 
                },
                {
                  label: 'recId', 
                  value: 'attributes.recId',
                  default: 'NULL' 
                },
                {
                  label: 'iiifUrl', 
                  value: 'attributes.iiifURL',
                  default: 'NULL' 
                },
              ]             
              var parser = new json2csv.Parser({fields});            
              var csv = parser.parse(data.features);
              var element = document.createElement('a');
              element.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
              element.target = '_blank';
              element.download = 'chart_data.csv';
              element.click();            
            }
    });
  } else if (dataFormat == 'geojson') {
    $.ajax({
          dataType: 'json',
          url: 'http://webgis.uwm.edu/arcgisuwm/rest/services/AGSL/agsl_nautical/MapServer/0/query?where=setTitle+%3D+%27' + seriesVal + '%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&havingClause=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=geojson',
          type: "GET",    
          success: function(data) {            
            downloadGeoJson(JSON.stringify(data, undefined, 4), 'chart_data.geojson');           
          }
    });   
  }
})

})