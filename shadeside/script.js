/* ShadeSide — sun-aware car seating
   Pure client-side: geolocation + Nominatim geocoding + solar position math.
   No login, no API keys, no paywall. */

(function () {
  const startInput = document.getElementById("start");
  const destInput = document.getElementById("destination");
  const whenInput = document.getElementById("when");
  const form = document.getElementById("trip-form");
  const btnUseLocation = document.getElementById("btn-use-location");
  const btnCheck = document.getElementById("btn-check");
  const resultCard = document.getElementById("result");
  const errorMsg = document.getElementById("error");

  const elSideWord = document.getElementById("side-word");
  const elSunPosWord = document.getElementById("sun-position-word");
  const elShadeSideWord = document.getElementById("shade-side-word");
  const elVerdictText = document.getElementById("verdict-text");
  const elGlareValue = document.getElementById("glare-value");
  const elSummaryFrom = document.getElementById("summary-from");
  const elSummaryTo = document.getElementById("summary-to");
  const elSummaryWhen = document.getElementById("summary-when");
  const elSummaryBearing = document.getElementById("summary-bearing");
  const travelArrow = document.getElementById("travel-arrow");
  const sunMarker = document.getElementById("sun-marker");

  // Default departure time: now
  function setDefaultTime() {
    const now = new Date();
    now.setSeconds(0, 0);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    whenInput.value = local.toISOString().slice(0, 16);
  }
  setDefaultTime();

  // Geolocation
  btnUseLocation.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showError("Geolocation not supported. Type your start location manually.");
      return;
    }
    btnUseLocation.textContent = "⏳";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        reverseGeocode(latitude, longitude).then((name) => {
          startInput.value = name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          btnUseLocation.textContent = "📍";
        }).catch(() => {
          startInput.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          btnUseLocation.textContent = "📍";
        });
      },
      () => {
        btnUseLocation.textContent = "📍";
        showError("Location access denied. Type your start location manually.");
      }
    );
  });

  // Forward geocode (place name -> lat/lng) using Nominatim (free, no key)
  async function geocode(query) {
    try {
      const res = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query),
        { headers: { "Accept": "application/json" } }
      );
      if (!res.ok) throw new Error("Geocode failed");
      const data = await res.json();
      if (!data || data.length === 0) return null;
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        name: data[0].display_name
      };
    } catch (err) {
      return null;
    }
  }

  // Reverse geocode (lat/lng -> place name)
  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon,
        { headers: { "Accept": "application/json" } }
      );
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();
      return data && data.display_name ? data.display_name : null;
    } catch (err) {
      return null;
    }
  }

  // Autocomplete dropdown for location inputs
  const suggestionsMap = {
    start: document.getElementById("start-suggestions"),
    dest: document.getElementById("dest-suggestions")
  };
  let activeField = null;
  let suggestions = [];
  let highlightedIndex = -1;
  let debounceTimer = null;

  function createSuggestionItem(item, index) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("aria-index", index);
    if (index === highlightedIndex) {
      li.setAttribute("aria-selected", "true");
      li.classList.add("highlighted");
    }
    const label = item.display_name || item.name;
    li.textContent = label;
    li.dataset.lat = item.lat;
    li.dataset.lon = item.lon;
    li.dataset.name = label;
    li.addEventListener("click", () => selectSuggestion(item));
    return li;
  }

  function renderSuggestions(fieldId, items) {
    const ul = suggestionsMap[fieldId];
    ul.innerHTML = "";
    highlightedIndex = -1;
    if (!items || items.length === 0) {
      ul.classList.remove("show");
      return;
    }
    items.forEach((item, i) => {
      ul.appendChild(createSuggestionItem(item, i));
    });
    ul.classList.add("show");
  }

  function selectSuggestion(item) {
    if (!activeField) return;
    document.getElementById(activeField).value = item.display_name || item.name;
    suggestionsMap[activeField].classList.remove("show");
    suggestions = [];
    highlightedIndex = -1;
  }

  function fetchSuggestions(query, fieldId) {
    if (query.length < 2) {
      suggestionsMap[fieldId].classList.remove("show");
      return;
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          "https://nominatim.openstreetmap.org/search?format=json&limit=8&viewbox=-180,-90,180,90&bounded=0&q=" +
          encodeURIComponent(query),
          { headers: { "Accept": "application/json" } }
        );
        if (!res.ok) throw new Error("Suggestions failed");
        const data = await res.json();
        suggestions = data || [];
        renderSuggestions(fieldId, suggestions);
      } catch (err) {
        suggestionsMap[fieldId].classList.remove("show");
      }
    }, 200);
  }

  function setupAutocomplete(fieldId) {
    const input = document.getElementById(fieldId);
    const ul = suggestionsMap[fieldId];

    input.addEventListener("input", (e) => {
      activeField = fieldId;
      fetchSuggestions(e.target.value, fieldId);
    });

    input.addEventListener("focus", () => {
      activeField = fieldId;
      if (suggestions.length > 0) ul.classList.add("show");
    });

    input.addEventListener("keydown", (e) => {
      if (!ul.classList.contains("show")) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, suggestions.length - 1);
        renderSuggestions(fieldId, suggestions);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, -1);
        renderSuggestions(fieldId, suggestions);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          selectSuggestion(suggestions[highlightedIndex]);
        }
      } else if (e.key === "Escape") {
        ul.classList.remove("show");
      }
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".field")) {
      suggestionsMap.start.classList.remove("show");
      suggestionsMap.dest.classList.remove("show");
    }
  });

  setupAutocomplete("start");
  setupAutocomplete("dest");

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove("hidden");
    resultCard.classList.add("hidden");
  }

  function hideError() {
    errorMsg.classList.add("hidden");
  }
  // Solar position: NOAA-style algorithm (simplified, accurate enough for glare guidance)
  // Returns { azimuth: 0-360 (0=N, 90=E, 180=S, 270=W), altitude: -90 to 90 degrees }
  function getSunPosition(lat, lon, date) {
    const rad = Math.PI / 180;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    const timezoneOffsetHours = -date.getTimezoneOffset() / 60;

    // Julian day
    const julianDay = (function () {
      const a = Math.floor((14 - month) / 12);
      const y = year + 4800 - a;
      const m = month + 12 * a - 3;
      const jd = day + Math.floor((153 * m + 2) / 5) + 365 * y +
        Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
      return jd - 0.5 + hours / 24;
    })();

    const julianCentury = (julianDay - 2451545.0) / 365250.0;

    // Geometric mean longitude of the sun (degrees)
    const gMeanLongitude = 280.46646 + julianCentury * (36000.76983 + 0.0003032 * julianCentury);
    // Geometric mean anomaly (degrees)
    const gMeanAnomaly = 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury);
    // Eccentricity of earth's orbit
    const eccentricity = 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
    // Sun's equation of the center
    const eqCenter =
      Math.sin(gMeanAnomaly * rad) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
      Math.sin(2 * gMeanAnomaly * rad) * (0.019993 - 0.000101 * julianCentury) +
      Math.sin(3 * gMeanAnomaly * rad) * 0.000289;
    // Sun's true longitude
    const sunTrueLongitude = gMeanLongitude + eqCenter;
    // Sun's true anomaly
    const sunTrueAnomaly = gMeanAnomaly + eqCenter;
    // Sun's radius vector (AU)
    const sunRadiusVector =
      (1.000001018 * (1 - eccentricity * eccentricity)) /
      (1 + eccentricity * Math.cos(sunTrueAnomaly * rad));
    // Apparent sun longitude
    const apparentSunLongitude = sunTrueLongitude - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * julianCentury) * rad);
    // Mean obliquity of ecliptic
    const meanObliquity =
      23.439291 -
      julianCentury * (0.013004167 - 0.0000001639 * julianCentury + 0.0000005036 * julianCentury * julianCentury);
    // Corrected obliquity
    const correctedObliquity =
      meanObliquity + 0.00256 * Math.cos((125.04 - 1934.136 * julianCentury) * rad);
    // Sun's right ascension
    const sunRightAscension =
      Math.atan(Math.cos(correctedObliquity * rad) * Math.tan(apparentSunLongitude * rad)) / rad;
    // Sun's declination
    const sunDeclination =
      Math.asin(Math.sin(correctedObliquity * rad) * Math.sin(apparentSunLongitude * rad)) / rad;

    // Local sidereal time
    const gmst = 280.46061837 +
      360.98564736629 * (julianDay - 2451545.0) +
      0.000387933 * julianCentury * julianCentury -
      julianCentury * julianCentury * julianCentury / 38710000.0;
    const lmst = gmst + lon + 180 * (hours / 24); // approximate hour angle offset
    const hourAngle = (((lmst - sunRightAscension + 540) % 360) - 180); // -180 to 180

    // Altitude
    const altitude = Math.asin(
      Math.sin(lat * rad) * Math.sin(sunDeclination * rad) +
      Math.cos(lat * rad) * Math.cos(sunDeclination * rad) * Math.cos(hourAngle * rad)
    ) / rad;

    // Azimuth (0 = North, clockwise)
    const azimuth =
      Math.atan(
        Math.sin(hourAngle * rad) /
        (Math.cos(hourAngle * rad) * Math.sin(lat * rad) -
          Math.tan(sunDeclination * rad) * Math.cos(lat * rad))
      ) / rad;
    let az = azimuth;
    if (az < 0) az += 360;
    // Adjust based on hemisphere and hour angle
    const latRad = lat * rad;
    const declRad = sunDeclination * rad;
    const haRad = hourAngle * rad;
    const x = Math.cos(declRad) * Math.sin(haRad);
    const y =
      Math.sin(declRad) * Math.cos(latRad) -
      Math.cos(declRad) * Math.sin(latRad) * Math.cos(haRad);
    let azRad = Math.atan2(x, y);
    az = (azRad / rad + 360) % 360;

    return { azimuth: Math.round(az), altitude: Math.round(altitude) };
  }

  // Normalize bearing to 0-360
  function norm360(deg) {
    return ((deg % 360) + 360) % 360;
  }

  // Bearing from point A to point B (degrees, 0=N, clockwise)
  function bearingFromTo(lat1, lon1, lat2, lon2) {
    const rad = Math.PI / 180;
    const p1 = lat1 * rad;
    const p2 = lat2 * rad;
    const dLon = (lon2 - lon1) * rad;
    const y = Math.sin(dLon) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLon);
    return norm360(Math.atan2(y, x) / rad);
  }

  // Cardinal direction name
  function cardinal(deg) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(((deg % 360) + 360) / 45) % 8];
  }
  // Determine which side of the car stays in shade.
  // travelBearing: direction of travel (0=N, 90=E, etc.)
  // sunAz: where the sun is (same convention)
  // sunAlt: sun elevation above horizon
  function getSideAdvice(travelBearing, sunAz, sunAlt) {
    const rel = norm360(sunAz - travelBearing); // sun relative to travel direction

    // If sun is very high overhead, side matters less
    const highSun = sunAlt > 60;

    let side; // "left" or "right" side of car to sit on
    let sunPosWord; // where sun is relative to passenger
    let glare;

    if (highSun) {
      side = "either";
      sunPosWord = "overhead";
      glare = sunAlt > 75 ? "Low" : "Medium";
    } else if (rel > 315 || rel < 45) {
      // Sun is ahead (windshield)
      side = "either";
      sunPosWord = "ahead of you (windshield)";
      glare = "High";
    } else if (rel >= 45 && rel <= 135) {
      // Sun is on the right side of the car
      side = "left";
      sunPosWord = "right side";
      glare = sunAlt < 25 ? "High" : sunAlt < 50 ? "Medium" : "Low";
    } else if (rel >= 135 && rel <= 225) {
      // Sun is behind (rear window)
      side = "either";
      sunPosWord = "behind you (rear window)";
      glare = "Low";
    } else {
      // rel 225-315: sun is on the left side of the car
      side = "right";
      sunPosWord = "left side";
      glare = sunAlt < 25 ? "High" : sunAlt < 50 ? "Medium" : "Low";
    }

    return { side, sunPosWord, glare, rel };
  }

  function formatDateTime(date) {
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    resultCard.classList.add("hidden");
    btnCheck.textContent = "Calculating…";
    btnCheck.disabled = true;

    const startQuery = startInput.value.trim();
    const destQuery = destInput.value.trim();
    const whenStr = whenInput.value;

    if (!destQuery) {
      showError("Please enter a destination.");
      btnCheck.textContent = "Find my shady side";
      btnCheck.disabled = false;
      return;
    }

    const when = whenStr ? new Date(whenStr + ":00") : new Date();

    try {
      // Resolve start
      let start;
      if (startQuery) {
        start = await geocode(startQuery);
        if (!start) {
          showError("Could not find starting location. Try a different name or use coordinates.");
          btnCheck.textContent = "Find my shady side";
          btnCheck.disabled = false;
          return;
        }
      } else {
        // Use current geolocation
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        const rname = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        start = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: rname || `Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`
        };
        startInput.value = start.name;
      }

      // Resolve destination
      const dest = await geocode(destQuery);
      if (!dest) {
        showError("Could not find destination. Try a different name.");
        btnCheck.textContent = "Find my shady side";
        btnCheck.disabled = false;
        return;
      }

      // Bearing from start to dest
      const travelBearing = bearingFromTo(start.lat, start.lon, dest.lat, dest.lon);

      // Sun position at midpoint of route (approx) at departure time
      const midLat = (start.lat + dest.lat) / 2;
      const midLon = (start.lon + dest.lon) / 2;
      const sun = getSunPosition(midLat, midLon, when);

      const advice = getSideAdvice(travelBearing, sun.azimuth, sun.altitude);

      // UI: compass rotations
      // Rotate travel arrow to point at travelBearing (arrow points down by default at 0deg rotation = N)
      // sun marker rotates relative to top based on sunAz
      travelArrow.style.setProperty("--travel-rot", `${travelBearing}deg`);
      sunMarker.style.setProperty("--sun-rot", `${sun.azimuth}deg`);

      // UI: verdict
      if (advice.side === "either") {
        elVerdictText.innerHTML = "Sun is <strong>" + advice.sunPosWord + "</strong> — side doesn't matter much.";
        elSideWord.textContent = "—";
        elSunPosWord.textContent = advice.sunPosWord;
        elShadeSideWord.textContent = "—";
      } else {
        const opposite = advice.side === "left" ? "right" : "left";
        elVerdictText.innerHTML = "Sit on the <strong>" + advice.side + "</strong> side.";
        elSideWord.textContent = advice.side;
        elSunPosWord.textContent = advice.sunPosWord;
        elShadeSideWord.textContent = advice.side;
      }
      elGlareValue.textContent = advice.glare;
      elGlareValue.className = "glare-value";
      if (advice.glare === "High") elGlareValue.style.color = "#e74c3c";
      else if (advice.glare === "Medium") elGlareValue.style.color = "#f1c40f";
      else elGlareValue.style.color = "#2ecc71";

      // Summary
      elSummaryFrom.textContent = start.name;
      elSummaryTo.textContent = dest.name;
      elSummaryWhen.textContent = formatDateTime(when);
      elSummaryBearing.textContent = cardinal(travelBearing) + " (" + travelBearing + "°)";

      resultCard.classList.remove("hidden");
    } catch (err) {
      showError("Something went wrong. Try again.");
      console.error(err);
    } finally {
      btnCheck.textContent = "Find my shady side";
      btnCheck.disabled = false;
    }
  });

  setDefaultTime();
})();
/* --- END --- */