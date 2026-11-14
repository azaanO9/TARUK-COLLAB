"use client";
import { lazy, Suspense } from "react";
const MarsFreeRoam = lazy(() => import("../ui/MarsFreeRoam"));
// Legacy mode query strings intentionally open the same free-exploration experience.
export default function Home() {
  return <Suspense fallback={<main role="status">Preparing Mars exploration…</main>}><MarsFreeRoam /></Suspense>;
}
