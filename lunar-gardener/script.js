/* Lunar Gardener — plant by the moon cycle */
(function () {
  const REF_NEW_MOON = new Date("2024-01-11T11:57:00Z").getTime();
  const SYNODIC_MONTH = 29.530588853;

  const ADVICE = {
    "New Moon": {
      emoji: "🌑",
      action: "Rest & plan",
      detail: "Time for stillness. Sketch your garden layout, order seeds, and set intentions. Avoid planting today.",
      plants: ["—", "—", "—"],
      color: "#0f172a"
    },
    "Waxing Crescent": {
      emoji: "🌒",
      action: "Plant above-ground crops",
      detail: "Energy is rising. Ideal for sowing leafy greens and herbs that grow above the soil.",
      plants: ["Lettuce", "Spinach", "Basil", "Kale"],
      color: "#3b82f6"
    },
    "First Quarter": {
      emoji: "🌓",
      action: "Transplant & fruit",
      detail: "Strong growth phase. Great for transplanting seedlings and planting tomatoes, peppers, beans, and squash.",
      plants: ["Tomato", "Pepper", "Bean", "Squash"],
      color: "#22c55e"
    },
    "Waxing Gibbous": {
      emoji: "🌔",
      action: "Nurture & feed",
      detail: "Nearly full. Water deeply, apply organic fertilizer, stake tall plants, and harvest young greens.",
      plants: ["Herbs", "Chard", "Peas"],
      color: "#a3e635"
    },
    "Full Moon": {
      emoji: "🌕",
      action: "Harvest & root",
      detail: "Peak energy. Harvest herbs and vegetables. Traditionally a good time to plant root crops just after full moon.",
      plants: ["Carrot", "Beet", "Potato", "Radish"],
      color: "#fbbf24"
    },
    "Waning Gibbous": {
      emoji: "🌖",
      action: "Plant root crops",
      detail: "Energy turns inward. Plant root crops, divide perennials, and transplant shrubs.",
      plants: ["Onion", "Garlic", "Turnip", "Parsnip"],
      color: "#eab308"
    },
    "Last Quarter": {
      emoji: "🌗",
      action: "Prune & weed",
      detail: "Waning energy. Perfect for weeding, pruning, mowing lawns, and composting. Avoid planting.",
      plants: ["—", "—", "—"],
      color: "#64748b"
    },
    "Waning Crescent": {
      emoji: "🌘",
      action: "Soil & rest",
      detail: "Deep rest. Amend soil, mulch beds, and plan next season. Let the earth breathe.",
      plants: ["—", "—", "—"],
      color: "#475569"
    }
  };

  const PHASE_NAMES = [
    "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
    "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"
  ];

  const moonSvg = document.getElementById("moon-svg");
  const phaseNameEl = document.getElementById("phase-name");
  const illumValueEl = document.getElementById("illum-value");
  const cycleDayEl = document.getElementById("cycle-day");
  const adviceActionEl = document.getElementById("advice-action");
  const adviceDetailEl = document.getElementById("advice-detail");
  const plantListEl = document.getElementById("plant-list");
  const adviceCardEl = document.getElementById("advice-card");
  const localDateEl = document.getElementById("local-date");

  function getMoonPhase(date = new Date()) {
    const diffMs = date.getTime() - REF_NEW_MOON;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const cycles = diffDays / SYNODIC_MONTH;
    const phase = cycles - Math.floor(cycles);

    const index = Math.round(phase * (PHASE_NAMES.length - 1));
    const name = PHASE_NAMES[index];

    let illumination, waxing;
    if (phase <= 0.5) {
      illumination = phase / 0.5;
      waxing = true;
    } else {
      illumination = (1 - phase) / 0.5;
      waxing = false;
    }

    const illumPercent = Math.round(illumination * 100);
    const dayInCycle = Math.round(phase * 29.53);

    return {
      phase, name, index, illumination, illumPercent, dayInCycle, waxing,
      advice: ADVICE[name] || ADVICE["New Moon"]
    };
  }

  function getShadowPath(illumination, waxing) {
    const r = 90;
    const cx = 100;
    const cy = 100;

    let t;
    if (waxing) {
      t = 1 - 2 * illumination;
    } else {
      t = 2 * illumination - 1;
    }
    t = Math.max(-1, Math.min(1, t));

    const x = cx + t * r;
    const h = Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx)));
    const topY = cy - h;
    const bottomY = cy + h;

    let d;
    if (waxing) {
      const largeArc = t >= 0 ? 0 : 1;
      d = `M ${x} ${topY} A ${r} ${r} 0 ${largeArc} 0 ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${x} ${bottomY} L ${x} ${topY} Z`;
    } else {
      const largeArc = t <= 0 ? 0 : 1;
      d = `M ${x} ${topY} A ${r} ${r} 0 ${largeArc} 1 ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${x} ${bottomY} L ${x} ${topY} Z`;
    }
    return d;
  }

  function render(phaseData) {
    const { name, illumPercent, dayInCycle, waxing, illumination, advice } = phaseData;

    phaseNameEl.textContent = `${advice.emoji} ${name}`;
    illumValueEl.textContent = illumPercent;
    cycleDayEl.textContent = dayInCycle;

    adviceActionEl.textContent = advice.action;
    adviceDetailEl.textContent = advice.detail;
    adviceCardEl.style.setProperty("--data-color", advice.color);

    plantListEl.innerHTML = advice.plants.map((p) => `<li>${p}</li>`).join("");

    const shadowPath = getShadowPath(illumination, waxing);
    moonSvg.innerHTML = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name}">
        <circle cx="100" cy="100" r="90" class="lit" />
        <path d="${shadowPath}" class="shadow" />
      </svg>
    `;

    phaseNameEl.setAttribute("aria-live", "polite");
  }
  function updateLocalDate() {
    const now = new Date();
    localDateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function handleToday() {
    render(getMoonPhase(new Date()));
  }

  document.getElementById("btn-today").addEventListener("click", handleToday);

  updateLocalDate();
  handleToday();

  setInterval(updateLocalDate, 60 * 1000);
})();