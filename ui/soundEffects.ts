export type SoundCue =
  | "start"
  | "inspect"
  | "success"
  | "failure"
  | "retry"
  | "complete"
  | "equipment-warn"
  | "equipment-action"
  | "stabilize";

const melodies: Record<
  SoundCue,
  { notes: number[]; spacing: number; length: number; level: number }
> = {
  start: {
    notes: [261.63, 392, 523.25],
    spacing: 0.1,
    length: 0.22,
    level: 0.045,
  },
  inspect: { notes: [880], spacing: 0, length: 0.11, level: 0.025 },
  success: {
    notes: [523.25, 659.25, 783.99],
    spacing: 0.11,
    length: 0.28,
    level: 0.055,
  },
  failure: { notes: [220, 174.61], spacing: 0.17, length: 0.23, level: 0.05 },
  retry: { notes: [329.63, 440], spacing: 0.1, length: 0.2, level: 0.04 },
  complete: {
    notes: [523.25, 659.25, 783.99, 1046.5],
    spacing: 0.15,
    length: 0.4,
    level: 0.05,
  },
  "equipment-warn": {
    notes: [261.63, 233.08],
    spacing: 0.14,
    length: 0.26,
    level: 0.04,
  },
  "equipment-action": {
    notes: [392, 493.88],
    spacing: 0.08,
    length: 0.14,
    level: 0.035,
  },
  stabilize: {
    notes: [349.23, 440, 523.25],
    spacing: 0.09,
    length: 0.22,
    level: 0.045,
  },
};

/** Original synthesised cues. Lazy audio activation follows a player gesture. */
export function createSoundPlayer() {
  let context: AudioContext | null = null;
  let active: OscillatorNode[] = [];
  let enabled = true;
  function stop() {
    for (const oscillator of active) {
      try {
        oscillator.stop();
      } catch {}
    }
    active = [];
  }
  async function unlock() {
    if (!enabled) return "muted";
    try {
      if (!context && typeof window !== "undefined" && window.AudioContext)
        context = new window.AudioContext();
      if (context?.state === "suspended") await context.resume();
      return context?.state ?? "unavailable";
    } catch {
      return "unavailable";
    }
  }
  async function play(cue: SoundCue) {
    await unlock();
    if (!enabled) return "muted";
    if (!context || context.state !== "running") return "unavailable";
    stop();
    const melody = melodies[cue];
    const now = context.currentTime;
    melody.notes.forEach((frequency, i) => {
      const oscillator = context!.createOscillator();
      const envelope = context!.createGain();
      const when = now + i * melody.spacing;
      oscillator.type = cue === "failure" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, when);
      envelope.gain.setValueAtTime(0.0001, when);
      envelope.gain.exponentialRampToValueAtTime(melody.level, when + 0.018);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + melody.length);
      oscillator.connect(envelope);
      envelope.connect(context!.destination);
      oscillator.start(when);
      oscillator.stop(when + melody.length + 0.02);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
      active.push(oscillator);
    });
    return context.state;
  }
  function dispose() {
    stop();
    void context?.close();
    context = null;
  }
  function setEnabled(value: boolean) {
    enabled = value;
    if (!value) stop();
  }
  return { unlock, play, stop, dispose, setEnabled };
}
