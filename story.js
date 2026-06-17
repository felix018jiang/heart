/*
  Cinematic scroll map logic.

  The page keeps "I" and "you" fixed on screen. Scrolling drives a linear
  camera interpolation from the visitor's location toward the heart island.
*/

(function () {
  const TOKEN_PLACEHOLDER = "YOUR_MAPBOX_ACCESS_TOKEN_HERE";
  const routeColor = "#ff6b8a";
  const destinationSwitchThreshold = 0.985;

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
  let isResettingStory = false;
  let selectedHeartRouteIndex = -1;
  let selectedHeartRoute = chooseHeartRoute();

  createScrollChapters(config.chapters);
  setupDestinationSwitch();
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

  function chooseHeartRoute() {
    const routes = config.heartRoutes || [];

    if (!routes.length) {
      return {
        id: "fallback-heart",
        name: "Heart Island",
        travelLocations: [],
        finalLocation: config.chapters[config.chapters.length - 1].location
      };
    }

    // Optional testing helper: open index.html?route=trnovacko-lake to force
    // one destination while tuning its final camera position.
    const routeIdFromUrl = new URLSearchParams(window.location.search).get("route");
    const forcedRouteIndex = routes.findIndex((item) => item.id === routeIdFromUrl);
    selectedHeartRouteIndex =
      forcedRouteIndex >= 0 ? forcedRouteIndex : Math.floor(Math.random() * routes.length);
    const route = routes[selectedHeartRouteIndex];
    document.body.dataset.selectedHeartRoute = route.id;
    return route;
  }

  function setupDestinationSwitch() {
    const button = document.getElementById("next-destination");

    if (!button) {
      return;
    }

    const routes = config.heartRoutes || [];

    if (routes.length < 2) {
      button.hidden = true;
      return;
    }

    updateDestinationButtonLabel(button);

    button.addEventListener("click", () => {
      selectedHeartRouteIndex = (selectedHeartRouteIndex + 1) % routes.length;
      selectedHeartRoute = routes[selectedHeartRouteIndex];
      document.body.dataset.selectedHeartRoute = selectedHeartRoute.id;
      updateDestinationButtonLabel(button);

      if (map) {
        resetStoryToStart();
      }
    });
  }

  function updateDestinationButtonLabel(button) {
    const nextRoute = getNextHeartRoute();
    const nextName = nextRoute ? nextRoute.name : "next destination";
    const label = `Switch to ${nextName}`;

    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function getNextHeartRoute() {
    const routes = config.heartRoutes || [];

    if (!routes.length) {
      return null;
    }

    return routes[(selectedHeartRouteIndex + 1) % routes.length];
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
    if (isResettingStory) {
      return;
    }

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

    map.jumpTo(camera);
    updateProgressState(progress);
  }

  function easeCameraForProgress(progress) {
    const camera = getInterpolatedCamera(progress);

    map.easeTo({
      ...camera,
      duration: 850,
      easing: smoothstep,
      essential: true
    });

    updateProgressState(progress);
  }

  function updateProgressState(progress) {
    const activeChapter = getActiveChapter(progress);
    const progressBar = document.querySelector(".scroll-progress span");

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress})`;
    }

    document.body.dataset.activeChapter = activeChapter.id;
    document.body.classList.toggle("final-mode", Boolean(activeChapter.finalMode));
    document.body.classList.toggle(
      "destination-switch-visible",
      progress >= destinationSwitchThreshold
    );
    updateRoute(Boolean(activeChapter.showRoute));
  }

  function resetStoryToStart() {
    if (dampingFrame) {
      cancelAnimationFrame(dampingFrame);
      dampingFrame = null;
    }

    isResettingStory = true;
    targetProgress = 0;
    smoothedProgress = 0;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });
    updateCameraForProgress(0);

    requestAnimationFrame(() => {
      isResettingStory = false;
    });
  }

  function getScrollProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const rawProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    return clamp(rawProgress, 0, 1);
  }

  function getInterpolatedCamera(progress) {
    const chapters = config.chapters;
    const startLocation = chapters[0].location;
    const finalLocation = selectedHeartRoute.finalLocation;
    const zoomOutEnd = 0.28;
    const arrivalProgress = 0.74;
    const travelZoom = 3.2;
    const travelPitch = 14;
    const travelBearing = -10;
    const finalZoom = finalLocation.zoom;
    const startPitch = startLocation.pitch || 0;
    const startBearing = startLocation.bearing || 0;
    const finalPitch = finalLocation.pitch || 0;
    const finalBearing = finalLocation.bearing || 0;

    // Phase 1 — pull back: rise straight up from the user's location to the
    // high travel altitude. The center stays put; only the zoom decreases.
    if (progress < zoomOutEnd) {
      const t = smoothstep(progress / zoomOutEnd);

      return {
        center: startLocation.center,
        zoom: lerp(startLocation.zoom, travelZoom, t),
        pitch: lerp(startPitch, travelPitch, t),
        bearing: lerp(startBearing, travelBearing, t)
      };
    }

    // Phase 2 — cruise: pan along the great-circle arc toward the destination
    // while holding the pulled-back altitude. Zoom/pitch/bearing stay constant,
    // so the camera only moves sideways and never zooms during the long flight.
    if (progress < arrivalProgress) {
      const t = smoothstep(
        (progress - zoomOutEnd) / (arrivalProgress - zoomOutEnd)
      );

      return {
        center: greatCircleInterpolate(
          startLocation.center,
          finalLocation.center,
          t
        ),
        zoom: travelZoom,
        pitch: travelPitch,
        bearing: travelBearing
      };
    }

    // Phase 3 — arrive: now centered over the destination, zoom in to the
    // close-up. Only here does the zoom increase again.
    const t = smoothstep((progress - arrivalProgress) / (1 - arrivalProgress));

    return {
      center: finalLocation.center,
      zoom: lerp(travelZoom, finalZoom, t),
      pitch: lerp(travelPitch, finalPitch, t),
      bearing: lerp(travelBearing, finalBearing, t)
    };
  }

  // Spherical-linear interpolation (slerp) between two [lng, lat] points along
  // the shortest great-circle arc. This is the smooth, monotonic "straight
  // line on a globe" path, so the camera moves directly from start to end with
  // no sideways doubling back.
  function greatCircleInterpolate(start, end, progress) {
    const t = clamp(progress, 0, 1);
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;

    const lon1 = start[0] * toRad;
    const lat1 = start[1] * toRad;
    const lon2 = end[0] * toRad;
    const lat2 = end[1] * toRad;

    // Project both endpoints onto the unit sphere.
    const x1 = Math.cos(lat1) * Math.cos(lon1);
    const y1 = Math.cos(lat1) * Math.sin(lon1);
    const z1 = Math.sin(lat1);
    const x2 = Math.cos(lat2) * Math.cos(lon2);
    const y2 = Math.cos(lat2) * Math.sin(lon2);
    const z2 = Math.sin(lat2);

    const omega = Math.acos(clamp(x1 * x2 + y1 * y2 + z1 * z2, -1, 1));

    // Endpoints coincide (or are antipodal): nothing meaningful to interpolate.
    if (omega < 1e-9) {
      return [start[0], start[1]];
    }

    const sinOmega = Math.sin(omega);
    const k1 = Math.sin((1 - t) * omega) / sinOmega;
    const k2 = Math.sin(t * omega) / sinOmega;

    const x = k1 * x1 + k2 * x2;
    const y = k1 * y1 + k2 * y2;
    const z = k1 * z1 + k2 * z2;

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    return [lon * toDeg, lat * toDeg];
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

  function smoothstep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
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
