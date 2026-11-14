"use client";
import {useEffect, useRef} from "react";
import "./shuttleArrival.css";

/** Lightweight original vector animation; the WebGL scene mounts concurrently underneath. */
export default function ShuttleArrival({ready,onComplete}:{ready:boolean;onComplete:()=>void}) {
  const began=useRef(Date.now());
  useEffect(()=>{
    if(!ready)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const remaining=Math.max(0,(reduced?300:800)-(Date.now()-began.current));
    const timer=window.setTimeout(onComplete,remaining);
    return()=>window.clearTimeout(timer);
  },[ready,onComplete]);
  return <section className="shuttle-arrival" aria-label="Arriving at Mars" role="status">
    <div className="arrival-stars" aria-hidden="true"/>
    <div className="arrival-planet" aria-hidden="true"/>
    <svg className="arrival-craft" viewBox="0 0 600 320" aria-hidden="true">
      <defs><linearGradient id="arrival-hull" x2="0.3" y2="1"><stop stopColor="#fff6e7"/><stop offset=".5" stopColor="#b0bac3"/><stop offset="1" stopColor="#475c70"/></linearGradient><linearGradient id="arrival-exhaust"><stop stopColor="#7be4ff" stopOpacity="0"/><stop offset=".7" stopColor="#8feaff" stopOpacity=".6"/><stop offset="1" stopColor="#fff9dd"/></linearGradient></defs>
      <path d="M18 139L226 132L226 188L18 181Z" fill="url(#arrival-exhaust)"/>
      <path d="M210 139L152 42L224 65L335 139M210 181L152 278L224 255L335 181" fill="#596f82" stroke="#bbcccf" strokeWidth="3"/>
      <path d="M209 122Q354 88 510 160Q354 232 209 198Z" fill="url(#arrival-hull)" stroke="#ecede6" strokeWidth="2"/>
      <path d="M378 126Q429 132 466 154L409 154Z" fill="#173947" stroke="#82d8dc" strokeWidth="3"/>
      <path d="M231 122L231 198M265 116L265 204M332 116L332 204" fill="none" stroke="#607583" strokeWidth="2"/>
      <path d="M272 184L381 184" stroke="#df8b43" strokeWidth="9"/>
      <rect x="198" y="133" width="24" height="54" rx="7" fill="#314858" stroke="#93dae4" strokeWidth="3"/>
      <text x="276" y="158" fill="#203745" fontSize="17" fontFamily="system-ui" letterSpacing="3">TARUKH</text>
    </svg>
    <div className="arrival-caption"><p>TARUKH · MARS EXPLORATION</p><h1>Next stop: Mars</h1><p>{ready?"Surface ready. Preparing to land…":"Approaching the surface…"}</p><span>The world is preparing beneath your flight.</span></div>
  </section>;
}
