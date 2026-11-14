/** Pure Martian diurnal temperature, severe weather forecast, and thermal/radio hazard simulation. */

export type WeatherEventType = "CLEAR" | "DUST_STORM" | "SOLAR_FLARE" | "CRYO_FREEZE";

export type WeatherTickerItem = {
  id: string;
  type: WeatherEventType;
  label: string;
  severity: "nominal" | "caution" | "severe";
  startSolPhase: number;
  endSolPhase: number;
  windMs: number;
  expectedMinTempC: number;
  advisory: string;
};

export type MarsEnvironmentSnapshot = {
  sol: number;
  solPhase: number; // 0 = midnight, 0.25 = dawn, 0.5 = midday, 0.75 = dusk
  tempC: number;
  weather: WeatherEventType;
  windMs: number;
  fogDensity: number;
  solarEfficiency: number;
  thermalDrainMultiplier: number;
  radioInterference: number; // 0 = crystal clear, 1 = complete storm static cutout
  radiationSpike: boolean;
  ticker: WeatherTickerItem[];
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Computes Mars Jezero Crater ambient temperature (-100 C deep night to -15 C midday).
 * Extreme drops below -70 C accelerate battery and oxygen suit heating draw.
 */
export function computeMarsTempC(solPhase: number, weather: WeatherEventType): number {
  const phase = ((solPhase % 1) + 1) % 1;
  // Cosine curve peaking at 0.54 (early Martian afternoon) and bottoming near midnight (0.04)
  const diurnal = -Math.cos((phase - 0.04) * Math.PI * 2); // -1 at night, +1 at day
  const baseTemp = -58 + diurnal * 42; // -100 C midnight to -16 C noon
  const weatherOffset =
    weather === "CRYO_FREEZE"
      ? -12
      : weather === "DUST_STORM"
        ? -6
        : weather === "SOLAR_FLARE"
          ? 7
          : 0;
  return Math.round(clamp(baseTemp + weatherOffset, -108, -8) * 10) / 10;
}

export function isNightPhase(solPhase: number): boolean {
  const phase = ((solPhase % 1) + 1) % 1;
  return phase < 0.23 || phase > 0.78;
}

export function buildWeatherTicker(sol: number, solPhase: number): WeatherTickerItem[] {
  const s = Math.max(1, Math.floor(sol));
  const seed = (s * 73 + 19) % 100;
  const items: WeatherTickerItem[] = [
    {
      id: `wx-${s}-1`,
      type: seed > 45 ? "DUST_STORM" : "SOLAR_FLARE",
      label: seed > 45 ? "JEZERO HABOOB DUST FRONT" : "CORONAL X-RAY FLARE WATCH",
      severity: "severe",
      startSolPhase: 0.34,
      endSolPhase: 0.56,
      windMs: seed > 45 ? 34 : 11,
      expectedMinTempC: seed > 45 ? -44 : -24,
      advisory:
        seed > 45
          ? "High atmospheric opacity (tau 2.8). Stow external instruments and secure rover hatches."
          : "Solar grid surges unstable; shield habitats and avoid open ridges.",
    },
    {
      id: `wx-${s}-2`,
      type: "CRYO_FREEZE",
      label: "DEEP CRATER NIGHT FREEZE (-100°C)",
      severity: "severe",
      startSolPhase: 0.8,
      endSolPhase: 0.18,
      windMs: 14,
      expectedMinTempC: -100,
      advisory: "Suit thermal draw 2.2x normal. Maintain Power & O2 or shelter indoors.",
    },
    {
      id: `wx-${s}-3`,
      type: "CLEAR",
      label: "POST-DAWN CALM WINDOW",
      severity: "nominal",
      startSolPhase: 0.22,
      endSolPhase: 0.34,
      windMs: 5,
      expectedMinTempC: -52,
      advisory: "Optimal solar recharge and long-range rover traverse window.",
    },
  ];
  // Put next upcoming / active item first
  const phase = ((solPhase % 1) + 1) % 1;
  return items.sort((a, b) => {
    const da = (a.startSolPhase - phase + 1) % 1;
    const db = (b.startSolPhase - phase + 1) % 1;
    return da - db;
  });
}

export function activeWeatherAt(sol: number, solPhase: number): WeatherEventType {
  const phase = ((solPhase % 1) + 1) % 1;
  const seed = (Math.max(1, Math.floor(sol)) * 73 + 19) % 100;
  if (phase >= 0.84 || phase <= 0.14) return "CRYO_FREEZE";
  if (phase >= 0.36 && phase <= 0.52) {
    return seed > 45 ? "DUST_STORM" : "SOLAR_FLARE";
  }
  return "CLEAR";
}

export function buildSolTemperatureCurve(
  sol: number,
  samples = 25,
): { phase: number; hourLabel: string; tempC: number; weather: WeatherEventType }[] {
  const pts: { phase: number; hourLabel: string; tempC: number; weather: WeatherEventType }[] = [];
  for (let i = 0; i < samples; i++) {
    const phase = i / (samples - 1);
    const weather = activeWeatherAt(sol, phase);
    const tempC = computeMarsTempC(phase, weather);
    const totalHours = Math.round(phase * 24.6 * 10) / 10;
    const h = Math.floor(totalHours) % 24;
    const m = Math.round((totalHours % 1) * 60) % 60;
    const hourLabel = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    pts.push({ phase, hourLabel, tempC, weather });
  }
  return pts;
}

export function evaluateMarsEnvironment(
  sol: number,
  solPhase: number,
  forcedWeather?: WeatherEventType | null,
): MarsEnvironmentSnapshot {
  const phase = ((solPhase % 1) + 1) % 1;
  const weather = forcedWeather ?? activeWeatherAt(sol, phase);
  const tempC = computeMarsTempC(phase, weather);

  const night = isNightPhase(phase);
  const windMs =
    weather === "DUST_STORM" ? 36 : weather === "CRYO_FREEZE" ? 16 : weather === "SOLAR_FLARE" ? 12 : 6;
  const fogDensity =
    weather === "DUST_STORM" ? 0.022 : night ? 0.0052 : 0.0022;
  const solarEfficiency =
    night ? 0.05 : weather === "DUST_STORM" ? 0.35 : weather === "SOLAR_FLARE" ? 1.15 : 1.0;

  // Cold stress (-70 C to -100 C) accelerates suit heater battery & O2 use
  const coldStress = clamp((-tempC - 50) / 50, 0, 1);
  const stormStress = weather === "DUST_STORM" ? 0.35 : weather === "SOLAR_FLARE" ? 0.25 : 0;
  const thermalDrainMultiplier = Math.round((1 + coldStress * 1.25 + stormStress) * 100) / 100;

  const radioInterference =
    weather === "DUST_STORM" ? 0.85 : weather === "SOLAR_FLARE" ? 0.58 : night ? 0.12 : 0.0;

  return {
    sol,
    solPhase: phase,
    tempC,
    weather,
    windMs,
    fogDensity,
    solarEfficiency,
    thermalDrainMultiplier,
    radioInterference,
    radiationSpike: weather === "SOLAR_FLARE",
    ticker: buildWeatherTicker(sol, phase),
  };
}

