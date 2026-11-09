import {
  DAYS,
  DAILY_USE,
  INITIAL_RESERVES,
  QUICK_RESPONSES,
  STATIONS,
} from "../content/survival.ts";
import type {
  Reserves,
  SurvivalAction,
  SurvivalState,
} from "./survivalTypes.ts";
export const clamp = (v: number) => Math.max(0, Math.min(100, v));
export function changeReserves(r: Reserves, d: Reserves): Reserves {
  return Object.fromEntries(
    Object.keys(r).map((k) => [
      k,
      clamp(r[k as keyof Reserves] + d[k as keyof Reserves]),
    ]),
  ) as Reserves;
}
export const createSurvival = (): SurvivalState => ({
  phase: "arrival",
  day: 0,
  reserves: { ...INITIAL_RESERVES },
  checkpoint: { ...INITIAL_RESERVES },
  risk: DAYS[0].risk,
  found: [],
  attempts: [],
  result: null,
  response: null,
  science: 0,
  seed: 0,
});
export const currentDay = (s: SurvivalState) => DAYS[s.day];
export const readyToPlan = (s: SurvivalState) =>
  currentDay(s).clues.every((id) => s.found.includes(id));
export function offeredPlans(s: SurvivalState) {
  const retries = s.attempts.filter(
    (a) => a.day === s.day && !a.plan.good,
  ).length;
  const source = currentDay(s).plans[retries % 3];
  const good = source.find((p) => p.good)!,
    bad = source.filter((p) => !p.good);
  const slot = (s.seed + s.day + retries) % 3;
  const result = [...bad];
  result.splice(slot, 0, good);
  return result;
}
export function survivalReducer(
  s: SurvivalState,
  a: SurvivalAction,
): SurvivalState {
  if (a.type === "RESTART") return createSurvival();
  if (a.type === "BEGIN" && s.phase === "arrival")
    return {
      ...s,
      phase: "explore",
      seed: Number.isSafeInteger(a.seed) ? Math.abs(a.seed!) % 100000 : 0,
    };
  if (
    a.type === "INSPECT" &&
    s.phase === "explore" &&
    STATIONS.some((o) => o.id === a.id)
  )
    return s.found.includes(a.id) ? s : { ...s, found: [...s.found, a.id] };
  if (a.type === "CHOOSE" && s.phase === "explore" && readyToPlan(s)) {
    const plan = offeredPlans(s).find((p) => p.id === a.id);
    if (!plan) return s;
    const after = changeReserves(s.reserves, plan.delta),
      risk = clamp(s.risk + plan.risk);
    const attempt = {
      day: s.day,
      plan,
      before: { ...s.reserves },
      after,
      risk,
    };
    return {
      ...s,
      phase: plan.good ? "result" : "failed",
      reserves: after,
      risk,
      result: attempt,
      response: null,
      attempts: [...s.attempts, attempt],
    };
  }
  if (
    a.type === "RESPOND" &&
    s.phase === "failed" &&
    !s.response &&
    QUICK_RESPONSES.some((q) => q.id === a.id)
  ) {
    return {
      ...s,
      response: a.id,
      attempts: s.attempts.map((v, i) =>
        i === s.attempts.length - 1 ? { ...v, response: a.id } : v,
      ),
    };
  }
  if (a.type === "RETRY" && s.phase === "failed")
    return {
      ...s,
      phase: "explore",
      reserves: { ...s.checkpoint },
      risk: currentDay(s).risk,
      result: null,
      response: null,
    };
  if (a.type === "END_DAY" && s.phase === "result") {
    const after = changeReserves(s.reserves, DAILY_USE);
    if (Object.values(after).some((n) => n <= 0) || s.risk >= 80)
      return { ...s, phase: "failed", reserves: after };
    const science = s.science + currentDay(s).science;
    if (s.day === DAYS.length - 1)
      return { ...s, phase: "ending", reserves: after, science };
    return {
      ...s,
      phase: "explore",
      day: s.day + 1,
      reserves: after,
      checkpoint: { ...after },
      risk: DAYS[s.day + 1].risk,
      found: [],
      result: null,
      response: null,
      science,
    };
  }
  return s;
}
