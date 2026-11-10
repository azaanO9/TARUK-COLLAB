"use client";
import {useEffect,useReducer,useRef,useState} from "react";
import {STATIONS} from "../content/survival";
import {createMission,missionReducer,rank,discoveryIds,solEvents,isNight} from "../game/juniorMission";
import SurvivalWorld,{type SurvivalWorldHandle,type View} from "./SurvivalWorld";
import { MarsHud, MissionDialogFrame, SolQuizDialog } from "./MarsPanels";
import "./survival.css"; import "./mars.css"; import "./junior.css";
const initial:View={x:0,z:12,yaw:0,target:null,distance:Infinity,locked:false,jumpHeight:0};
const labels:Record<string,string>={solar:"Solar array",oxygen:"MOXIE oxygen unit",water:"Ice extractor",food:"Hydroponic lab",shelter:"Shielding bunker",rover:"Exploration rover"};
import {stationQuestions as questions, solQuestions, shuffledQuiz, type Quiz} from "../content/marsQuizzes";
type DialogState={modal:string|null;stage:"task"|"quiz"|"result";answer:number|null;progress:number;angle:number;drill:number;led:number;water:number;shield:number};
const initialDialog:DialogState={modal:null,stage:"task",answer:null,progress:0,angle:45,drill:40,led:50,water:50,shield:50};
type DialogAction = {[K in keyof DialogState]:{key:K;value:DialogState[K]}}[keyof DialogState] | {key:"updateProgress";value:(previous:number)=>number};
function dialogReducer(state:DialogState,action:DialogAction):DialogState{if(action.key==="updateProgress")return {...state,progress:action.value(state.progress)};return {...state,[action.key]:action.value};}


export default function MarsGame({callsign="Explorer",patch="✦",onHub,controlMode="pc"}:{callsign?:string;patch?:string;onHub?:()=>void;controlMode?:"mobile"|"pc"}) {
 const [mission,send]=useReducer(missionReducer,undefined,createMission);
 const [view,setView]=useState(initial), [voice,setVoice]=useState(false), [certificate,setCertificate]=useState(false), [quizSol,setQuizSol]=useState(0);
 const [dialog,dispatchDialog]=useReducer(dialogReducer, initialDialog);
 const {modal,stage,answer,progress,angle,drill,led,water,shield}=dialog;
 const setModal=(value:string|null)=>dispatchDialog({key:"modal",value});
 const setStage=(value:"task"|"quiz"|"result")=>dispatchDialog({key:"stage",value});
 const setAnswer=(value:number|null)=>dispatchDialog({key:"answer",value});
 const setProgress=(value:number|((previous:number)=>number))=>typeof value==="function" ? dispatchDialog({key:"updateProgress",value}) : dispatchDialog({key:"progress",value});
 const setAngle=(value:number)=>dispatchDialog({key:"angle",value});
 const setDrill=(value:number)=>dispatchDialog({key:"drill",value});
 const setLed=(value:number)=>dispatchDialog({key:"led",value});
 const setWater=(value:number)=>dispatchDialog({key:"water",value});
 const setShield=(value:number)=>dispatchDialog({key:"shield",value});
 const [activeQuiz,setActiveQuiz]=useState<Quiz|null>(null), [showControlHint,setShowControlHint]=useState(true);
 const [worldFailure,setWorldFailure]=useState(false), [worldAttempt,setWorldAttempt]=useState(0), [lowGraphics,setLowGraphics]=useState(false);
 const dialogRef=useRef<HTMLElement>(null);
 const activeDialog=Boolean(modal || ((mission.ended && modal!=="solQuiz") || certificate));
 useEffect(()=>{
   if(!activeDialog) return;
   const previous=document.activeElement as HTMLElement | null;
   const dialog=dialogRef.current;
   if(!dialog) return;
   const focusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]'));
   (focusable()[0] ?? dialog).focus();
   const keydown=(event:KeyboardEvent)=>{
     if(event.key === "Escape" && !mission.ended){ event.preventDefault(); setModal(null); setCertificate(false); }
     if(event.key !== "Tab") return;
     const items=focusable(); if(!items.length){event.preventDefault();dialog.focus();return;}
     const first=items[0],last=items[items.length-1];
     if(event.shiftKey && (document.activeElement===first || !dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
     else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
   };
   document.addEventListener("keydown",keydown);
   return ()=>{document.removeEventListener("keydown",keydown);previous?.focus();};
 },[activeDialog,mission.ended]);
 const world=useRef<SurvivalWorldHandle>(null); const dragging=useRef(false);
 const [sageFollowing,setSageFollowing]=useState(false);
 const night=isNight(mission.sol);
 const next=discoveryIds.find(id=>!mission.found.includes(id))??"rover", station=STATIONS.find(s=>s.id===next)!, current=STATIONS.find(s=>s.id===view.target), distance=Math.round(Math.hypot(view.x-station.x,view.z-station.z));
 const bearing=Math.atan2(station.x-view.x,-(station.z-view.z)); const relative=bearing+view.yaw; const dir=Math.sin(relative)>.35?"↗":Math.sin(relative)<-.35?"↖":"↑";
 const open=(id:string)=>{if(!discoveryIds.includes(id as typeof discoveryIds[number]))return;setProgress(0);setAngle(45);setDrill(40);setLed(50);setWater(50);setShield(50);setAnswer(null);setStage("task");setActiveQuiz(shuffledQuiz(questions[id]));setModal(id)};
 const complete=()=>{if(!modal)return;send({type:"TASK",id:modal});setStage("quiz")};
 const hint=`${callsign}, ${labels[next]} is ${distance} metres away ${dir}. ${mission.resources.power<35?"Power is low because our equipment and shifts use stored energy.":mission.resources.oxygen<35?"Oxygen is low because the crew uses air each shift.":"Inspect equipment to learn and earn mission patches."}`;
 const taskReady=modal==="solar"?progress>=8&&angle>=65:modal==="oxygen"?progress>=2:modal==="water"?drill>=55&&drill<=70:modal==="food"?led>=40&&led<=65&&water>=40&&water<=65:modal==="shelter"?shield>=65:progress>=1;
 return <main className="sv-root mars-root junior-root" data-controls={controlMode} data-phase="explore" data-player-x={view.x.toFixed(2)} data-player-z={view.z.toFixed(2)}>
 <SurvivalWorld solarClean={mission.found.includes("solar")} key={worldAttempt} ref={world} initialQuality={lowGraphics ? "performance" : "auto"} planet="mars" showTouchControls={controlMode === "mobile"} enabled={!modal&&!mission.ended} event={night?"night":"quiet"} day={0} target={next} effect={null} failure={false} stabilized={false} animating={false} sageFollowing={sageFollowing} onToggleSage={()=>setSageFollowing(value=>!value)} onInspect={open} onView={setView} onUnavailable={()=>setWorldFailure(true)} />
 {worldFailure&&<div className="mars-dialog-backdrop"><section className="mars-dialog junior-dialog" role="alert"><h2>We couldn’t start the 3D world</h2><p>Your browser may have lost its graphics connection. Try again, or choose the lighter graphics setting.</p><button onClick={()=>{setLowGraphics(false);setWorldFailure(false);setWorldAttempt(v=>v+1)}}>Retry</button><button onClick={()=>{setLowGraphics(true);setWorldFailure(false);setWorldAttempt(v=>v+1)}}>Retry with low graphics</button><button onClick={onHub}>Mission hub</button></section></div>}
 {showControlHint&&<div className="junior-hint" role="note"><strong>Ready, explorer?</strong> {controlMode === "mobile" ? "Use the on-screen buttons to move and interact. Drag the world to look around." : "Use WASD to walk, drag to look, Space to jump, E to inspect and V to change view."} <button onClick={()=>setShowControlHint(false)}>Got it</button></div>}
 <header className="junior-header"><b>TARUKH <span>· JUNIOR ASTRONAUT MISSION</span></b><strong>{patch} {callsign} · SOL {String(mission.sol).padStart(2,"0")} / 10 · {night?"NIGHT":"DAY"}</strong><button onClick={onHub}>Mission hub</button></header>
 <MarsHud mission={mission} onGuide={()=>setModal("guide")} onLog={()=>setModal("log")} />
 <div className="junior-compass">{dir} NEXT · {labels[next]} · {distance} m</div>
 {current&&<div className="mars-target"><strong>{labels[current.id]??current.name}</strong><span>{view.distance<=5.5?(current.id==="rover"?"Press E to inspect or F to drive": "Press E to inspect"):`${Math.round(view.distance)} m · move closer`}</span>{view.distance<=5.5&&labels[current.id]&&<button onClick={()=>open(current.id)}>Inspect</button>}{view.distance<=5.5&&current.id==="rover"&&<button onClick={()=>world.current?.toggleRover?.()}>Drive Rover · F</button>}</div>}
 <aside className="mars-sage"><b>SAGE / </b>{hint}<div className="sage-controls"><button type="button" className="sage-follow" aria-pressed={sageFollowing} onClick={()=>setSageFollowing(value=>!value)}>{sageFollowing?"Send Sage home":"Bring Sage along"} <span>· B</span></button><small aria-live="polite">{sageFollowing?"Follow mode on":"Home mode on"}</small><button onClick={()=>{setVoice(true);if("speechSynthesis" in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(hint))}}}>{voice?"Read again":"🔊 Read hint"}</button></div></aside>
 {mission.found.length === 6 && <button className="junior-certificate-button" onClick={()=>setCertificate(true)}>View certificate ✦</button>}
 <button className="junior-shift" disabled={!mission.activityDone} title={!mission.activityDone?"Complete an activity first":""} onClick={()=>setModal("shift")}>{mission.activityDone?"End sol · choose an event →":"Complete a station activity first"}</button>
 {modal&&<div className="mars-dialog-backdrop"><MissionDialogFrame dialogRef={dialogRef}>
 {modal==="solQuiz"&&activeQuiz?<SolQuizDialog quiz={activeQuiz} sol={quizSol} answer={answer} onAnswer={i=>{setAnswer(i);send({type:"SHIFT_QUIZ",sol:quizSol,correct:i===activeQuiz.correct})}} onClose={()=>setModal(null)}/>:
 modal==="guide"?<><p className="mars-kicker">STICKER & DISCOVERY CODEX</p><h2>{mission.found.length}/6 discoveries</h2><div className="junior-grid">{discoveryIds.map(id=><div key={id} className={mission.found.includes(id)?"unlocked":"locked"}><span>{mission.found.includes(id)?"✦":"?"}</span><b>{mission.found.includes(id)?labels[id]:"Undiscovered"}</b><small>{mission.patches.includes(id)?"Patch earned":"Patch locked"}</small></div>)}</div><p>Explore the outpost to reveal all six discoveries. <a href="https://science.nasa.gov/mars/facts/" target="_blank" rel="noreferrer">NASA Mars facts ↗</a></p><button onClick={()=>setModal(null)}>Back to mission</button></>:
 modal==="log"?<><p className="mars-kicker">MISSION LOG</p><h2>Your expedition</h2><ol>{mission.log.map((v,i)=><li key={i}>{v}</li>)}</ol><button onClick={()=>setModal(null)}>Close log</button></>:
 modal==="shift"?<><p className="mars-kicker">SOL {mission.sol} · EVENT</p><h2>{solEvents[mission.sol-1].title}</h2><p>Choose a response. Each sol uses 7 water, food and oxygen points. Repeat a station activity to restore supplies. These are game assumptions.</p><button onClick={()=>{setQuizSol(mission.sol);setAnswer(null);setActiveQuiz(shuffledQuiz(solQuestions[mission.sol-1]));send({type:"SHIFT",choice:"careful"});setModal("solQuiz")}}>{solEvents[mission.sol-1].careful} · power −6, risk steady</button><button onClick={()=>{setQuizSol(mission.sol);setAnswer(null);setActiveQuiz(shuffledQuiz(solQuestions[mission.sol-1]));send({type:"SHIFT",choice:"quick"});setModal("solQuiz")}}>{solEvents[mission.sol-1].quick} · power −4, {solEvents[mission.sol-1].resource} −10, risk +8</button><button onClick={()=>setModal(null)}>Keep exploring</button></>:
 stage==="quiz"||stage==="result"?<><p className="mars-kicker">NASA QUICK QUIZ · ✦</p><h2>{activeQuiz!.q}</h2>{activeQuiz!.answers.map((a,i)=><button key={a} disabled={stage==="result"} onClick={()=>{setAnswer(i);send({type:"QUIZ",id:modal,correct:i===activeQuiz!.correct});setStage("result")}}>{a}</button>)}{stage==="result"&&<><p><b>{answer===activeQuiz!.correct?"Correct! +50 XP and a mission patch.":"Good try! You can revisit this station and try again."}</b> {activeQuiz!.explain} <a href={activeQuiz!.url} target="_blank" rel="noreferrer">NASA source ↗</a></p><button onClick={()=>setModal(null)}>Continue exploring</button></>}</>:
 <><p className="mars-kicker">HANDS-ON SCIENCE · {labels[modal]}</p><h2>{labels[modal]}</h2>{mission.found.includes(modal)&&<p>You completed this activity already. You can try its quiz again.</p>}
 {modal==="solar"?<><p>Drag over the dusty panel to clean it, then tilt it toward the sun. You can also use the brush button.</p><div className="junior-panel" onPointerDown={e=>{dragging.current=true;e.currentTarget.setPointerCapture(e.pointerId);setProgress(v=>Math.min(10,v+1))}} onPointerMove={()=>{if(dragging.current)setProgress(v=>Math.min(10,v+1))}} onPointerUp={()=>dragging.current=false} style={{background:`linear-gradient(rgba(184,109,58,${Math.max(0, .85-progress*.085)}),rgba(23,61,93,.92))`}}>☀ SOLAR ARRAY · DUST {Math.max(0,10-progress)}/10</div><button onClick={()=>setProgress(v=>Math.min(10,v+1))}>Brush dust</button><label>Panel angle: {angle}° <input type="range" min="0" max="90" value={angle} onChange={e=>setAngle(+e.target.value)}/></label><small>Training target: 65–90°. Real optimal angles depend on location and time.</small></>:
 modal==="oxygen"?<><p>Collect two oxygen atoms from two CO₂ molecules, then combine them into O₂. CO is also produced.</p><button onClick={()=>setProgress(v=>Math.min(2,v+1))}>Split one CO₂ molecule · {progress}/2</button><p>CO₂ → CO + O · O + O → O₂</p></>:
 modal==="water"?<><p>Set the drill to the marked ice layer while keeping its temperature safe.</p><label>Training depth: {drill} <input type="range" min="0" max="100" value={drill} onChange={e=>setDrill(+e.target.value)}/></label><p>{drill>70?"Too deep: drill is overheating!":drill>=55?"Ice layer reached; temperature safe.":"Keep searching for the ice layer."}</p></>:
 modal==="food"?<><p>Balance the light and water for the training plants.</p><label>LED spectrum {led}<input type="range" min="0" max="100" value={led} onChange={e=>setLed(+e.target.value)}/></label><label>Water drip {water}<input type="range" min="0" max="100" value={water} onChange={e=>setWater(+e.target.value)}/></label><p>Training target: keep both between 40 and 65.</p></>:
 modal==="shelter"?<><p>A scripted solar particle alert is active. Add shielding before the crew takes shelter.</p><label>Shielding {shield}<input type="range" min="0" max="100" value={shield} onChange={e=>setShield(+e.target.value)}/></label><p>Training target: at least 65. This score is not a radiation dose.</p></>:<><p>Inspect drive systems and telemetry before taking the big rover out to explore the map.</p><button onClick={()=>setProgress(1)}>Check wheels, steering and signal</button></>}
 <button disabled={!taskReady} onClick={complete}>Complete activity →</button><button onClick={()=>setModal(null)}>Close</button></>}
 </MissionDialogFrame></div>}
 {((mission.ended && modal!=="solQuiz") || certificate)&&<div className="mars-dialog-backdrop"><section ref={dialogRef} tabIndex={-1} className="mars-dialog junior-certificate" role="dialog" aria-modal="true"><p className="mars-kicker">TARUKH · JUNIOR ASTRONAUT</p><h2>Junior Astronaut Mission Certificate</h2><div className="junior-patch">{patch}</div><p>Awarded to</p><h1>{callsign}</h1><p>{rank(mission.xp,mission.found.length)} · {mission.found.length}/6 discoveries · {mission.xp} XP</p><p>Resource score: {mission.resources.power+mission.resources.water+mission.resources.food+mission.resources.oxygen} / 400</p><button onClick={()=>window.print()}>Print certificate</button>{!mission.ended && <button onClick={()=>setCertificate(false)}>Continue exploring</button>}<button onClick={onHub}>Return to mission hub</button></section></div>}
 </main>
}
