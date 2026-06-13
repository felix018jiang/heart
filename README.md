# Heart - Scroll Map Story

A static Mapbox GL JS scroll story styled like a vertical map video.

`I` and `you` stay fixed on the screen while scrolling moves the globe toward a final heart-shaped island.

## File Structure

```text
.
├── index.html
├── config.js
├── style.css
├── story.js
├── data/
│   └── route.geojson
└── README.md
```

## Run Locally

Start the server from this project folder, not from your Home folder:

```bash
cd "/local_directory"
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

If you see `Directory listing for /` with folders like `.codex`, `.anaconda`, `Desktop`, and `Documents`, the server was started from the wrong folder. Stop it with `Control + C`, run the `cd` command above, then start the server again.

If port `8080` is busy:

```bash
cd "/local_directory"
python3 -m http.server 8090
```

Then open `http://localhost:8090`.

## Mapbox Token

Your Mapbox public token is set in `config.js`:

```js
accessToken: "pk.your_public_token_here",
```

Use a public `pk.*` token. Do not put a secret `sk.*` token in a static website.

## Current Location Start

The first scroll step tries to use the visitor's browser location before the map is initialized, so the opening camera starts directly from the visitor's location when permission is allowed:

```js
useCurrentLocationForCover: true,
currentLocationZoom: 10.4,
```

This works on `localhost` and HTTPS deployments. If the visitor denies permission, the map keeps the fallback China camera. When location is available, a blue pulsing location dot is shown on the first map view.

## Change The Final Heart Island

The final destination is selected randomly on every page load from `heartRoutes` in `config.js`:

```js
heartRoutes: [
  {
    id: "galesnjak",
    name: "Galesnjak Heart Island",
    kind: "island",
    coordinates: [15.38365, 43.978122],
    travelLocations: [...],
    finalLocation: {...}
  }
]
```

Current random destinations:

- `galesnjak`: heart-shaped island in Croatia
- `tavarua`: heart-shaped island in Fiji
- `lake-toyoni`: heart-shaped lake in Hokkaido, Japan
- `toyoni-lake-nissho`: Toyoni Lake / 豐似湖 in Erimo, Hokkaido, added from the Nissho Peninsula guide
- `trnovacko-lake`: heart-shaped glacial lake in the Montenegro / Bosnia border area
- `calvaresc`: heart-shaped alpine lake in Switzerland
- `etang-baker`: Etang Baker in Memphremagog Regional County Municipality, Quebec, Canada
- `lough-ouler`: Lough Ouler in Ireland
- `love-lake-al-qudra`: Love Lake / Al Qudra in Dubai, United Arab Emirates

`travelLocations` controls the route the map camera follows after zooming out from the user's location. `finalLocation` controls the final close-up frame, where the heart-shaped island/lake should sit between `I` and `you`.

Mapbox coordinates are always `[longitude, latitude]`.

When tuning one destination, add `?route=destination-id` to the URL. For example, `index.html?route=trnovacko-lake` forces that destination instead of choosing randomly.

The small button in the lower-right corner switches to the next destination in `heartRoutes` without reloading the map. It uses the current scroll position, so you can switch while staying on the ending view or anywhere in the journey.

## Change The Camera Journey

The `chapters` array in `config.js` is now a set of invisible scroll steps. Each step only moves the map camera:

```js
{
  id: "adriatic",
  location: {
    center: [18.2, 44.2],
    zoom: 5.35,
    pitch: 42,
    bearing: -22
  },
  markerIds: [],
  showRoute: true,
  finalMode: false
}
```

The final step uses:

```js
finalMode: true
```

That enables the pink final glow. The current version does not show a heart marker.

The map camera is scroll-driven. It first zooms out from the user's starting location, then follows the randomly selected route toward that page load's heart-shaped island/lake, then keeps the center on the selected destination and gradually zooms in. To make the journey slower or faster, adjust `.chapter` height in `style.css`:

```css
.chapter {
  min-height: 320vh;
  min-height: 320svh;
}
```

## Basemap Labels

The current basemap uses the stable satellite style:

```js
style: "mapbox://styles/mapbox/satellite-streets-v12"
```

Roads, labels, and administrative boundaries are hidden with these switches in `config.js`:

```js
hideBasemapLabels: true,
hideBasemapRoads: true,
hideBasemapBoundaries: true
```

`story.js` keeps the satellite imagery visible and only hides:

- `symbol` layers, which contain names and labels
- road-related `line` layers, such as roads, highways, bridges, tunnels, and ferries
- boundary-related `line` layers, such as country, state, province, district, disputed, and admin boundaries

## Change The Fixed Words

Edit `index.html`:

```html
<span class="love-word love-word-i">I</span>
<span class="love-word love-word-you">you</span>
```

The position and size are controlled in `style.css`:

- `.love-word`
- `.love-word-i`
- `.love-word-you`

## Modify The Route

Edit `data/route.geojson`.

The current version keeps the red route hidden by setting every chapter's
`showRoute` to `false` in `config.js`. Change a chapter to `showRoute: true`
only if you want the route line to appear again.

The route is a GeoJSON `LineString`:

```json
"coordinates": [
  [118.8, 32.05],
  [101.0, 39.0],
  [15.384624, 43.978725]
]
```

Use `[longitude, latitude]` coordinate order.

## Deploy

This is a static site. You can deploy it to GitHub Pages, Vercel, Netlify, or any static host. No build command is needed.

## Common Issues

### The page shows a directory listing

You started the local server from the wrong folder. Use:

```bash
cd "/local_directory"
python3 -m http.server 8080
```

### The map does not show

Check:

- `config.js` contains a real Mapbox public token.
- The token is active.
- Your browser has network access to Mapbox.
- The Mapbox script and CSS are loading.

### The map moves to the wrong place

Use `[longitude, latitude]`, not `[latitude, longitude]`.

### Current location does not work

Check:

- Browser location permission was allowed.
- The site is running on `localhost` or HTTPS.
- `useCurrentLocationForCover` is `true`.
- The device has location services enabled.
