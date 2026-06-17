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
  accessToken: "pk.eyJ1IjoieXV0b25namlhbmcwMTgiLCJhIjoiY21xY2Qya3p4MG5qeDJycXMzdGE2c3RsdyJ9.HUl23qR7BtDyBfr-57wkxw",

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

  // One route is chosen randomly on every page load. Each final location is
  // framed so the heart-shaped island/lake sits between "I" and "you".
  heartRoutes: [
    {
      id: "galesnjak",
      name: "Galesnjak Heart Island",
      kind: "island",
      coordinates: [15.38365, 43.978122],
      travelLocations: [
        {
          center: [54.0, 43.0],
          zoom: 2.75,
          pitch: 22,
          bearing: -18
        },
        {
          center: [18.2, 44.2],
          zoom: 6.1,
          pitch: 18,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [15.38365, 43.97755],
        zoom: 14.7,
        pitch: 18,
        bearing: 0
      }
    },
    {
      id: "tavarua",
      name: "Tavarua Island",
      kind: "island",
      coordinates: [177.201791, -17.857702],
      travelLocations: [
        {
          center: [118.0, 8.0],
          zoom: 2.6,
          pitch: 20,
          bearing: 12
        },
        {
          center: [166.0, -13.0],
          zoom: 5.4,
          pitch: 16,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [177.201791, -17.85805],
        zoom: 15.1,
        pitch: 12,
        bearing: 0
      }
    },
    {
      id: "lake-toyoni",
      name: "Lake Toyoni",
      kind: "lake",
      coordinates: [143.271675, 42.089445],
      travelLocations: [
        {
          center: [122.0, 44.0],
          zoom: 2.7,
          pitch: 20,
          bearing: 8
        },
        {
          center: [142.0, 42.2],
          zoom: 6.0,
          pitch: 16,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [143.271675, 42.08905],
        zoom: 14.65,
        pitch: 14,
        bearing: 0
      }
    },
    {
      // Added from the Nissho Peninsula post about 豐似湖 / 豊似湖.
      // The article describes it as a heart-shaped emerald lake in Erimo,
      // Hokkaido. Coordinates are [longitude, latitude].
      id: "toyoni-lake-nissho",
      name: "Toyoni Lake",
      kind: "lake",
      coordinates: [143.271675, 42.089445],
      travelLocations: [
        {
          center: [128.0, 44.0],
          zoom: 2.65,
          pitch: 20,
          bearing: 6
        },
        {
          center: [139.2, 42.8],
          zoom: 5.4,
          pitch: 16,
          bearing: 4
        },
        {
          center: [143.05, 42.05],
          zoom: 8.7,
          pitch: 14,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [143.271675, 42.08905],
        zoom: 14.65,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "trnovacko-lake",
      name: "Trnovacko Lake",
      kind: "lake",
      coordinates: [18.7211664, 43.2523773],
      travelLocations: [
        {
          center: [60.0, 35.0],
          zoom: 2.5,
          pitch: 20,
          bearing: -8
        },
        {
          center: [20.0, 43.0],
          zoom: 5.6,
          pitch: 16,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [18.7268, 43.25205],
        zoom: 14.8,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "calvaresc",
      name: "Lagh de Calvaresc",
      kind: "lake",
      coordinates: [9.1582239, 46.3657122],
      travelLocations: [
        {
          center: [58.0, 45.0],
          zoom: 2.55,
          pitch: 20,
          bearing: -8
        },
        {
          center: [12.0, 46.0],
          zoom: 5.8,
          pitch: 16,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [9.1582239, 46.36545],
        zoom: 15.0,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "etang-baker",
      name: "Etang Baker",
      kind: "lake",
      coordinates: [-72.39294, 45.20764],
      travelLocations: [
        {
          center: [-125.0, 48.0],
          zoom: 2.45,
          pitch: 20,
          bearing: 12
        },
        {
          center: [-86.0, 47.0],
          zoom: 4.4,
          pitch: 16,
          bearing: 6
        },
        {
          center: [-73.5, 45.45],
          zoom: 7.7,
          pitch: 14,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [-72.39294, 45.20764],
        zoom: 15.0,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "lough-ouler",
      name: "Lough Ouler",
      kind: "lake",
      coordinates: [-6.378056, 53.064167],
      travelLocations: [
        {
          center: [-35.0, 51.0],
          zoom: 2.55,
          pitch: 20,
          bearing: -8
        },
        {
          center: [-10.0, 53.0],
          zoom: 5.3,
          pitch: 16,
          bearing: -4
        },
        {
          center: [-6.45, 53.12],
          zoom: 8.5,
          pitch: 14,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [-6.373708, 53.05963],
        zoom: 14.75,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "love-lake-al-qudra",
      name: "Love Lake Al Qudra",
      kind: "lake",
      coordinates: [55.407222, 24.838333],
      travelLocations: [
        {
          center: [92.0, 31.0],
          zoom: 2.5,
          pitch: 20,
          bearing: 10
        },
        {
          center: [62.0, 26.0],
          zoom: 5.2,
          pitch: 16,
          bearing: 4
        },
        {
          center: [55.8, 24.9],
          zoom: 8.4,
          pitch: 14,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [55.407222, 24.838333],
        zoom: 14.25,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "new-caledonia-destination",
      name: "New Caledonia Destination",
      kind: "lake",
      coordinates: [164.65847015554456, -20.937603854169495],
      travelLocations: [
        {
          center: [118.0, -7.0],
          zoom: 2.5,
          pitch: 20,
          bearing: 10
        },
        {
          center: [152.0, -18.0],
          zoom: 5.0,
          pitch: 16,
          bearing: 4
        },
        {
          center: [164.2, -20.8],
          zoom: 8.2,
          pitch: 14,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [164.65847015554456, -20.937603854169495],
        zoom: 15.35,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "caucasus-destination",
      name: "Caucasus Destination",
      kind: "lake",
      coordinates: [41.20100197337855, 40.93641908838831],
      travelLocations: [
        {
          center: [82.0, 39.0],
          zoom: 2.55,
          pitch: 20,
          bearing: -8
        },
        {
          center: [55.0, 41.0],
          zoom: 5.1,
          pitch: 16,
          bearing: -4
        },
        {
          center: [42.0, 40.9],
          zoom: 8.3,
          pitch: 14,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [41.20100197337855, 40.93641908838831],
        zoom: 15.35,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "patagonia-destination",
      name: "Patagonia Destination",
      kind: "lake",
      coordinates: [-71.86852615073488, -39.777098887596196],
      travelLocations: [
        {
          center: [-118.0, -18.0],
          zoom: 2.45,
          pitch: 20,
          bearing: -8
        },
        {
          center: [-86.0, -34.0],
          zoom: 4.7,
          pitch: 16,
          bearing: -4
        },
        {
          center: [-72.6, -39.3],
          zoom: 8.2,
          pitch: 14,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [-71.8668, -39.777098887596196],
        zoom: 15.35,
        pitch: 14,
        bearing: 0
      }
    },
    {
      id: "korea-destination",
      name: "Korea Destination",
      kind: "lake",
      coordinates: [127.5575446478488, 34.7819711349546],
      travelLocations: [
        {
          center: [108.0, 36.0],
          zoom: 2.65,
          pitch: 20,
          bearing: 8
        },
        {
          center: [122.0, 35.5],
          zoom: 5.1,
          pitch: 16,
          bearing: 4
        },
        {
          center: [127.0, 34.85],
          zoom: 8.4,
          pitch: 14,
          bearing: 0
        }
      ],
      finalLocation: {
        center: [127.5575446478488, 34.7819711349546],
        zoom: 15.35,
        pitch: 14,
        bearing: 0
      }
    }
  ],

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
