/*
  I Love You So - cinematic scroll map configuration

  This version keeps "I" and "you" fixed on screen while the map camera moves
  toward the final heart-shaped island.

  Replace:
  - accessToken with your Mapbox public token.
  - heartIsland.coordinates if you want another final destination.
  - chapters[].location if you want a different camera journey.

  Mapbox coordinate order is always [longitude, latitude].
*/

window.config = {
  // Mapbox public token. Use a pk.* token, never an sk.* secret token.
  accessToken: "pk.eyJ1IjoieXV0b25namlhbmcwMTgiLCJhIjoiY21xYWhsd21oMDZkYzJzcTNuNG9rMDJlcyJ9.Hmgts8v749ewtxFUbGb8CA",

  // Satellite-streets is the stable Mapbox satellite style for this page.
  style: "mapbox://styles/mapbox/satellite-streets-v12",
  projection: "globe",

  // Keep the satellite imagery, but hide roads, labels, and boundaries on top.
  hideBasemapLabels: true,
  hideBasemapRoads: true,
  hideBasemapBoundaries: true,

  // Keep the first camera close to the visitor. If permission is denied,
  // the fallback China camera below is used.
  useCurrentLocationForCover: true,
  currentLocationZoom: 10.4,

  heartIsland: {
    name: "Galesnjak Heart Island",
    coordinates: [15.38365, 43.978122]
  },

  // Route data is kept in the project for later use, but the current visual
  // version hides the red line entirely.
  routeGeoJson: "data/route.geojson",
  routeFallback: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "I to heart island"
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [118.8, 32.05],
            [86.0, 43.8],
            [52.0, 42.0],
            [28.9, 41.0],
            [15.38365, 43.978122]
          ]
        }
      }
    ]
  },

  // Keep this empty to hide the heart marker/emoji. Add a marker later only
  // if you want a visible destination pin.
  markers: [],

  // Chapters are invisible scroll steps. They only control the map camera.
  chapters: [
    {
      id: "you-and-me",
      location: {
        center: [104.1954, 35.8617],
        zoom: 7.2,
        pitch: 0,
        bearing: 0
      },
      markerIds: [],
      showRoute: false,
      finalMode: false
    },
    {
      id: "pull-away",
      location: {
        center: [86.0, 42.0],
        zoom: 3.15,
        pitch: 14,
        bearing: -8
      },
      markerIds: [],
      showRoute: false,
      finalMode: false
    },
    {
      id: "crossing",
      location: {
        center: [54.0, 43.0],
        zoom: 2.75,
        pitch: 22,
        bearing: -18
      },
      markerIds: [],
      showRoute: false,
      finalMode: false
    },
    {
      id: "adriatic",
      location: {
        center: [18.2, 44.2],
        zoom: 6.1,
        pitch: 16,
        bearing: -18
      },
      markerIds: [],
      showRoute: false,
      finalMode: false
    },
    {
      id: "heart-island",
      location: {
        center: [15.38365, 43.97755],
        zoom: 14.7,
        pitch: 18,
        bearing: 0
      },
      markerIds: [],
      showRoute: false,
      finalMode: true
    }
  ]
};
