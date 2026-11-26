/* Lunar Gardener — Day 1 (part 1) */
(function () {
  const REF_NEW_MOON = new Date("2024-01-11T11:57:00Z").getTime();
  const SYNODIC_MONTH = 29.530588853;

  const ADVICE = {
    "New Moon": {
      emoji: "🌑",
      action: "Rest & plan",
      detail: "A time for stillness. Sketch your garden layout, order seeds, and set intentions. Avoid planting today.",
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
      detail: "Strong growth phase. Great for transplanting seedlings and planting fruiting plants like tomatoes, peppers, and beans.",
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

  const moonEl = document.getElementById("moon");
  const shadowEl = document.getElementById("moon-shadow");
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
    const illumination = Math.round(phase < 0.5 ? phase * 2 : (1 - phase) * 2);
    const dayInCycle = Math.round(((phase % 1) + 1) % 1 * 29.53);
    return { phase, name, index, illumination, dayInCycle, advice: ADVICE[name] || ADVICE["New Moon"] };
  }

  function render(phaseData) {
    const { name, illumination, dayInCycle, advice } = phaseData;
    phaseNameEl.textContent = `${advice.emoji} ${name}`;
    illumValueEl.textContent = illumination;
    cycleDayEl.textContent = dayInCycle;
    adviceActionEl.textContent = advice.action;
    adviceDetailEl.textContent = advice.detail;
    adviceCardEl.style.setProperty("--data-color", advice.color);
    plantListEl.innerHTML = advice.plants.map((p) => `<li>${p}</li>`).join("");
    const shadowX = -(1 - illumination / 100) * 100;
    shadowEl.style.setProperty("--shadow-x", `${shadowX}%`);
    phaseNameEl.setAttribute("aria-live", "polite");
  }

  function updateLocalDate() {
    const now = new Date();
    localDateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "short", year: "numeric", month: "long", day: "numeric"
    });
  }
  function handleToday() {
    render(getMoonPhase(new Date()));
  }

  function handleRandom() {
    const randomDays = Math.floor(Math.random() * 365 * 4);
    const randomDate = new Date(Date.now() + randomDays * 24 * 60 * 60 * 1000 - (365 * 2 * 24 * 60 * 60 * 1000));
    render(getMoonPhase(randomDate));
  }

  async function handleShare() {
    const data = {
      title: "Lunar Gardener",
      text: `Today's moon phase: ${phaseNameEl.textContent}. Illumination: ${illumValueEl.textContent}%. ${adviceDetailEl.textContent}`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (err) { /* ignore cancel */ }
    }
    try {
      await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
      const btn = document.getElementById("btn-share");
      const old = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = old), 1500);
    } catch (err) { /* clipboard unavailable */ }
  }

  document.getElementById("btn-today").addEventListener("click", handleToday);
  document.getElementById("btn-random").addEventListener("click", handleRandom);
  document.getElementById("btn-share").addEventListener("click", handleShare);
  moonEl.addEventListener("click", handleToday);
  shadowEl.addEventListener("click", handleToday);

  updateLocalDate();
  handleToday();

  setInterval(updateLocalDate, 60 * 1000);
})();
/* --- END --- */