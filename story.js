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
    const travelZoom = 2.85;
    const finalZoom = finalLocation.zoom;
    const startPitch = startLocation.pitch || 0;
    const finalPitch = finalLocation.pitch || 0;
    const finalBearing = finalLocation.bearing || 0;

    // First: pull back from the user's location once. After this point the
    // zoom only increases toward the final destination, so route waypoints
    // cannot make the camera bounce between zooming in and zooming out.
    if (progress < zoomOutEnd) {
      const zoomOutProgress = smoothstep(progress / zoomOutEnd);

      return {
        center: startLocation.center,
        zoom: lerp(startLocation.zoom, travelZoom, zoomOutProgress),
        pitch: lerp(startPitch, 14, zoomOutProgress),
        bearing: lerp(startLocation.bearing || 0, -10, zoomOutProgress)
      };
    }

    const zoomInProgress = smoothstep((progress - zoomOutEnd) / (1 - zoomOutEnd));
    const zoom = lerp(travelZoom, finalZoom, zoomInProgress);
    const pitch = lerp(14, finalPitch, zoomInProgress);
    const bearing = lerp(-10, finalBearing, zoomInProgress);

    // Second: move toward the destination. Route waypoints control only the
    // center path; zoom, pitch, and bearing stay on the stable curve above.
    if (progress < arrivalProgress) {
      const travelProgress = smoothstep(
        (progress - zoomOutEnd) / (arrivalProgress - zoomOutEnd)
      );
      const routeTravelLocations = selectedHeartRoute.travelLocations || [];
      const travelLocations = [
        {
          center: startLocation.center
        },
        ...routeTravelLocations,
        {
          center: finalLocation.center
        }
      ];

      return {
        center: interpolateCenterPath(travelLocations, travelProgress),
        zoom,
        pitch,
        bearing
      };
    }

    // Final: keep the destination centered while the same zoom curve continues
    // into the close-up.
    return {
      center: finalLocation.center,
      zoom,
      pitch,
      bearing
    };
  }

  function interpolateCenterPath(locations, progress) {
    const scaled = progress * (locations.length - 1);
    const startIndex = Math.min(Math.floor(scaled), locations.length - 2);
    const endIndex = startIndex + 1;
    const t = scaled - startIndex;
    const start = locations[startIndex];
    const end = locations[endIndex];

    return [
      lerp(start.center[0], end.center[0], t),
      lerp(start.center[1], end.center[1], t)
    ];
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
