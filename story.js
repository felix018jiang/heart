/*
  Cinematic scroll map logic.

  The page keeps "I" and "you" fixed on screen. Scrolling drives a linear
  camera interpolation from the visitor's location toward the heart island.
*/

(function () {
  const TOKEN_PLACEHOLDER = "YOUR_MAPBOX_ACCESS_TOKEN_HERE";
  const routeColor = "#ff6b8a";

  if (!window.config) {
    showFatalMessage("Missing config.js. Make sure config.js loads before story.js.");
    return;
  }

  if (!config.accessToken || config.accessToken === TOKEN_PLACEHOLDER) {
    showFatalMessage(
      "Please add your Mapbox access token in config.js before viewing the map."
    );
    return;
  }

  mapboxgl.accessToken = config.accessToken;

  const story = document.getElementById("story");
  let map;
  let routeLoaded = false;
  let userLocation = null;
  let targetProgress = 0;
  let smoothedProgress = 0;
  let dampingFrame = null;

  createScrollChapters(config.chapters);
  initMap();

  async function initMap() {
    await applyCurrentLocationBeforeMapInit();

    const firstChapter = config.chapters[0];

    map = new mapboxgl.Map({
      container: "map",
      style: config.style,
      center: firstChapter.location.center,
      zoom: firstChapter.location.zoom,
      pitch: firstChapter.location.pitch || 0,
      bearing: firstChapter.location.bearing || 0,
      projection: config.projection || "globe",
      attributionControl: true
    });

    map.on("style.load", () => {
      if (config.projection) {
        map.setProjection(config.projection);
      }

      cleanBasemapOverlays();

      map.setFog({
        color: "rgb(8, 16, 36)",
        "high-color": "rgb(20, 44, 92)",
        "horizon-blend": 0.18,
        "space-color": "rgb(0, 0, 0)",
        "star-intensity": 0.55
      });
    });

    map.on("load", async () => {
      cleanBasemapOverlays();
      addUserLocationMarker();
      await addRouteSourceAndLayer();
      observeScrollProgress();
      updateCameraFromScroll();
    });
  }

  function createScrollChapters(chapters) {
    const fragment = document.createDocumentFragment();

    chapters.forEach((chapter, index) => {
      const section = document.createElement("article");
      section.id = chapter.id;
      section.dataset.chapterId = chapter.id;
      section.dataset.chapterIndex = String(index);
      section.className = "chapter";
      fragment.appendChild(section);
    });

    story.appendChild(fragment);
  }

  function cleanBasemapOverlays() {
    const style = map.getStyle();

    if (!style || !Array.isArray(style.layers)) {
      return;
    }

    style.layers.forEach((layer) => {
      if (!map.getLayer(layer.id)) {
        return;
      }

      if (config.hideBasemapLabels && layer.type === "symbol") {
        hideLayer(layer.id);
        return;
      }

      if (config.hideBasemapRoads && layer.type === "line" && isRoadLayer(layer)) {
        hideLayer(layer.id);
        return;
      }

      if (
        config.hideBasemapBoundaries &&
        layer.type === "line" &&
        isBoundaryLayer(layer)
      ) {
        hideLayer(layer.id);
      }
    });
  }

  function isRoadLayer(layer) {
    const searchable = [
      layer.id,
      layer.source,
      layer["source-layer"]
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return [
      "road",
      "street",
      "motorway",
      "highway",
      "bridge",
      "tunnel",
      "ferry",
      "path"
    ].some((keyword) => searchable.includes(keyword));
  }

  function isBoundaryLayer(layer) {
    const searchable = [
      layer.id,
      layer.source,
      layer["source-layer"]
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return [
      "admin",
      "boundary",
      "country",
      "state",
      "province",
      "region",
      "district",
      "disputed",
      "settlement-subdivision"
    ].some((keyword) => searchable.includes(keyword));
  }

  function hideLayer(layerId) {
    try {
      map.setLayoutProperty(layerId, "visibility", "none");
    } catch (error) {
      console.warn(`Could not hide basemap layer "${layerId}".`, error);
    }
  }

  function addUserLocationMarker() {
    if (!userLocation) {
      return;
    }

    const el = document.createElement("div");
    el.className = "user-location-marker";
    el.setAttribute("aria-label", "Your current location");

    new mapboxgl.Marker({
      element: el,
      anchor: "center"
    })
      .setLngLat(userLocation)
      .addTo(map);
  }

  async function addRouteSourceAndLayer() {
    const routeData = await loadRouteGeoJson();

    map.addSource("story-route", {
      type: "geojson",
      data: routeData
    });

    map.addLayer({
      id: "story-route-line",
      type: "line",
      source: "story-route",
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none"
      },
      paint: {
        "line-color": routeColor,
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 2.4, 7, 4, 14, 6],
        "line-opacity": 0.78
      }
    });

    routeLoaded = true;
  }

  async function loadRouteGeoJson() {
    try {
      const response = await fetch(config.routeGeoJson, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Route request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(
        "Could not load data/route.geojson. Falling back to config.routeFallback.",
        error
      );
      return config.routeFallback;
    }
  }

  async function applyCurrentLocationBeforeMapInit() {
    const firstChapter = config.chapters[0];

    if (!config.useCurrentLocationForCover || !navigator.geolocation) {
      return;
    }

    try {
      const position = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 60000
      });

      // Browser Geolocation returns latitude/longitude separately.
      // Mapbox needs [longitude, latitude].
      userLocation = [position.coords.longitude, position.coords.latitude];

      firstChapter.location = {
        ...firstChapter.location,
        center: userLocation,
        zoom: config.currentLocationZoom || firstChapter.location.zoom,
        pitch: 0,
        bearing: 0
      };
    } catch (error) {
      console.warn("Could not get current location. Keeping fallback camera.", error);
    }
  }

  function getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  function observeScrollProgress() {
    targetProgress = getScrollProgress();
    smoothedProgress = targetProgress;
    updateCameraForProgress(smoothedProgress);
    window.addEventListener("scroll", updateTargetProgress, { passive: true });
    window.addEventListener("resize", updateTargetProgress);
  }

  function updateTargetProgress() {
    targetProgress = getScrollProgress();
    startDampedCameraLoop();
  }

  function startDampedCameraLoop() {
    if (dampingFrame) {
      return;
    }

    dampingFrame = requestAnimationFrame(stepDampedCamera);
  }

  function stepDampedCamera() {
    const distance = targetProgress - smoothedProgress;
    const damping = 0.16;

    smoothedProgress += distance * damping;

    if (Math.abs(distance) < 0.0007) {
      smoothedProgress = targetProgress;
    }

    updateCameraForProgress(smoothedProgress);

    if (smoothedProgress !== targetProgress) {
      dampingFrame = requestAnimationFrame(stepDampedCamera);
      return;
    }

    dampingFrame = null;
  }

  function updateCameraForProgress(progress) {
    const camera = getInterpolatedCamera(progress);
    const activeChapter = getActiveChapter(progress);
    const progressBar = document.querySelector(".scroll-progress span");

    map.jumpTo(camera);

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress})`;
    }

    document.body.dataset.activeChapter = activeChapter.id;
    document.body.classList.toggle("final-mode", Boolean(activeChapter.finalMode));
    updateRoute(Boolean(activeChapter.showRoute));
  }

  function getScrollProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const rawProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    return clamp(rawProgress, 0, 1);
  }

  function getInterpolatedCamera(progress) {
    const chapters = config.chapters;
    const startLocation = chapters[0].location;
    const finalLocation = chapters[chapters.length - 1].location;
    const zoomOutEnd = 0.28;
    const arrivalProgress = 0.72;
    const travelZoom = 2.85;

    // First: stay at the user's location and zoom out. This makes the
    // movement feel like pulling back from the starting point before travel.
    if (progress < zoomOutEnd) {
      const zoomOutProgress = progress / zoomOutEnd;

      return {
        center: startLocation.center,
        zoom: lerp(startLocation.zoom, travelZoom, zoomOutProgress),
        pitch: lerp(startLocation.pitch || 0, 18, zoomOutProgress),
        bearing: lerp(startLocation.bearing || 0, -10, zoomOutProgress)
      };
    }

    // Second: move toward the heart island while staying zoomed out.
    if (progress < arrivalProgress) {
      const travelProgress = (progress - zoomOutEnd) / (arrivalProgress - zoomOutEnd);
      const travelLocations = [
        {
          ...chapters[1].location,
          center: startLocation.center,
          zoom: travelZoom,
          pitch: 18,
          bearing: -10
        },
        chapters[2].location,
        {
          ...chapters[3].location,
          center: finalLocation.center,
          zoom: 6.1,
          pitch: 18,
          bearing: finalLocation.bearing || 0
        }
      ];

      return interpolateCameraPath(travelLocations, travelProgress);
    }

    // Second: keep the map centered on the heart island and gradually zoom in.
    const zoomProgress = (progress - arrivalProgress) / (1 - arrivalProgress);
    const startZoom = 6.1;

    return {
      center: finalLocation.center,
      zoom: lerp(startZoom, finalLocation.zoom, zoomProgress),
      pitch: lerp(18, finalLocation.pitch || 0, zoomProgress),
      bearing: finalLocation.bearing || 0
    };
  }

  function interpolateCameraPath(locations, progress) {
    const scaled = progress * (locations.length - 1);
    const startIndex = Math.min(Math.floor(scaled), locations.length - 2);
    const endIndex = startIndex + 1;
    const t = scaled - startIndex;
    const start = locations[startIndex];
    const end = locations[endIndex];

    return {
      center: [
        lerp(start.center[0], end.center[0], t),
        lerp(start.center[1], end.center[1], t)
      ],
      zoom: lerp(start.zoom, end.zoom, t),
      pitch: lerp(start.pitch || 0, end.pitch || 0, t),
      bearing: lerp(start.bearing || 0, end.bearing || 0, t)
    };
  }

  function getActiveChapter(progress) {
    const chapters = config.chapters;
    const index = Math.min(
      Math.round(progress * (chapters.length - 1)),
      chapters.length - 1
    );

    return chapters[index];
  }

  function updateRoute(visible) {
    if (!routeLoaded || !map.getLayer("story-route-line")) {
      return;
    }

    map.setLayoutProperty(
      "story-route-line",
      "visibility",
      visible ? "visible" : "none"
    );
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showFatalMessage(message) {
    const storyRoot = document.getElementById("story");
    storyRoot.innerHTML = `
      <article class="chapter">
        <div class="fallback-card">
          <h1>I Love You So</h1>
          <p>${escapeHtml(message)}</p>
        </div>
      </article>
    `;
  }
})();
