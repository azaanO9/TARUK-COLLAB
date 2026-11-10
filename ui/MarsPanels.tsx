"use client";
import type { ReactNode, RefObject } from "react";
import type { Quiz } from "../content/marsQuizzes";
import {rank, type Mission} from "../game/juniorMission";
export function MarsHud({mission,onGuide,onLog}:{mission:Mission;onGuide:()=>void;onLog:()=>void}) {
 return <section className="junior-hud" aria-label="Mission resources"><b>MISSION RESOURCES</b>{Object.entries(mission.resources).map(([key,value])=><div key={key}><span>{key==="risk"?"Radiation risk":key}</span><strong>{value}</strong></div>)}<small>Illustrative game points</small><div className="junior-rank"><b>{rank(mission.xp,mission.found.length)}</b><span>{mission.xp} XP</span><progress max="1000" value={mission.xp}/></div><button onClick={onGuide}>FIELD GUIDE · {mission.found.length}/6</button><button onClick={onLog}>LOG</button></section>;
}
export function MissionDialogFrame({dialogRef,children}:{dialogRef:RefObject<HTMLElement|null>;children:ReactNode}) {
 return <section ref={dialogRef} tabIndex={-1} className="mars-dialog junior-dialog" role="dialog" aria-modal="true" aria-label="Mission activity">{children}</section>;
}

export function SolQuizDialog({quiz,sol,answer,onAnswer,onClose}:{quiz:Quiz;sol:number;answer:number|null;onAnswer:(index:number)=>void;onClose:()=>void}) {
 return <><p className="mars-kicker">NASA QUICK QUIZ · SOL {sol}</p><h2>{quiz.q}</h2>{answer===null?quiz.answers.map((text,index)=><button key={text} onClick={()=>onAnswer(index)}>{text}</button>):<><p>{answer===quiz.correct?"Correct! +50 XP, 3 power points and a sol patch.":"Good try!"} {quiz.explain} <a href={quiz.url} target="_blank" rel="noreferrer">NASA source ↗</a></p><button onClick={onClose}>Continue</button></>}</>;
}
