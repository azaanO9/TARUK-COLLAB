"use client";

import { buildSolTemperatureCurve, type MarsEnvironmentSnapshot, type WeatherEventType } from "../game/marsWeather";

type Props = {
  environment: MarsEnvironmentSnapshot;
  canOverride: boolean;
  onOverrideWeather: (weather: WeatherEventType | null) => void;
  onClose: () => void;
};

export function WeatherTerminalModal({ environment, canOverride, onOverrideWeather, onClose }: Props) {
  const curve = buildSolTemperatureCurve(environment.sol, 25);
  const w = 520;
  const h = 160;
  const padX = 28;
  const padY = 18;

  const toX = (phase: number) => padX + phase * (w - padX * 2);
  const toY = (tempC: number) => {
    const norm = Math.max(0, Math.min(1, (tempC - -110) / (0 - -110)));
    return h - padY - norm * (h - padY * 2);
  };

  const pathD = curve
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${toX(pt.phase).toFixed(1)} ${toY(pt.tempC).toFixed(1)}`)
    .join(" ");

  const nowX = toX(environment.solPhase);
  const nowY = toY(environment.tempC);

  return (
    <div className="mars-dialog-backdrop sci-backdrop">
      <section className="mars-dialog sci-modal sci-weather-modal" role="dialog" aria-modal="true" aria-label="Outpost Alpha Weather Forecasting Terminal">
        <header className="sci-modal-head">
          <div>
            <p className="mars-kicker">HABITAT ATMOSPHERIC TELEMETRY · SOL {environment.sol}</p>
            <h2>Jezero Weather Forecasting Terminal</h2>
          </div>
          <button type="button" className="sci-close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="sci-wx-kpis">
          <div>
            <small>SURFACE TEMP</small>
            <strong className={environment.tempC <= -70 ? "is-cryo" : ""}>{environment.tempC.toFixed(1)}°C</strong>
          </div>
          <div>
            <small>ACTIVE REGIME</small>
            <strong>{environment.weather}</strong>
          </div>
          <div>
            <small>WIND / DRAIN</small>
            <strong>{environment.windMs} m/s · {environment.thermalDrainMultiplier.toFixed(2)}×</strong>
          </div>
          <div>
            <small>COMMS STATIC</small>
            <strong>{Math.round(environment.radioInterference * 100)}%</strong>
          </div>
        </div>

        <div className="sci-wx-chart">
          <svg viewBox={`0 0 ${w} ${h}`} aria-label="24-hour Martian Sol temperature forecast curve">
            <line x1={padX} y1={toY(-100)} x2={w - padX} y2={toY(-100)} stroke="#38bdf844" strokeDasharray="4 4" />
            <text x={padX} y={toY(-100) - 4} fill="#7dd3fc" fontSize="9" fontFamily="monospace">-100°C CRYO THRESHOLD</text>
            <line x1={padX} y1={toY(-20)} x2={w - padX} y2={toY(-20)} stroke="#f59e0b33" strokeDasharray="4 4" />
            <text x={padX} y={toY(-20) - 4} fill="#fcd34d" fontSize="9" fontFamily="monospace">-20°C</text>

            <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1={nowX} y1={padY} x2={nowX} y2={h - padY} stroke="#facc15aa" strokeWidth="1.5" />
            <circle cx={nowX} cy={nowY} r="5" fill="#facc15" stroke="#09131d" strokeWidth="2" />
          </svg>
        </div>

        <div className="sci-wx-ticker">
          <h3>UPCOMING ATMOSPHERIC EVENTS</h3>
          {environment.ticker.map((item) => (
            <div key={item.id} className={`sci-ticker-row sev-${item.severity}`}>
              <div>
                <b>{item.type}</b>
                <span>{item.label}</span>
                <small>{item.advisory}</small>
              </div>
              <div className="sci-ticker-meta">
                <span>Wind {item.windMs} m/s</span>
                <span>Min {item.expectedMinTempC}°C</span>
              </div>
            </div>
          ))}
        </div>

        {canOverride && (
          <div className="sci-wx-controls">
            <span>SIMULATION WEATHER OVERRIDE:</span>
            <button type="button" onClick={() => onOverrideWeather(null)}>Natural Cycle</button>
            <button type="button" onClick={() => onOverrideWeather("CLEAR")}>Clear Day</button>
            <button type="button" onClick={() => onOverrideWeather("DUST_STORM")}>Trigger DUST_STORM</button>
            <button type="button" onClick={() => onOverrideWeather("SOLAR_FLARE")}>Trigger SOLAR_FLARE</button>
            <button type="button" onClick={() => onOverrideWeather("CRYO_FREEZE")}>Trigger -100°C FREEZE</button>
          </div>
        )}
      </section>
    </div>
  );
}

