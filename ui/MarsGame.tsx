"use client";
import {useCallback,useEffect,useMemo,useReducer,useRef,useState} from "react";
import {STATIONS} from "../content/marsBase";
import {rank,discoveryIds,forecast,isNight,type Mission,type Action} from "../game/juniorMission";
import SurvivalWorld,{type SurvivalWorldHandle,type View} from "./SurvivalWorld";
import { MarsHud, MissionDialogFrame, SolQuizDialog } from "./MarsPanels";
import { MarsRadarMinimap } from "./MarsPanels";
import { Pause, Navigation2, Battery, Wind, Shield, Mic, MicOff, CloudLightning, Wrench, Users, ArrowLeftRight } from "lucide-react";
import "./mobileCockpit.css";
import "./survival.css"; import "./mars.css"; import "./junior.css";
const initial:View={x:-23,z:15,yaw:0,target:null,distance:Infinity,locked:false,jumpHeight:0,biome:"surface"};
import { flightPlan, archives, stationNames as labels } from "../content/marsFlightPlan";
import { FieldInstrument } from "./FieldInstrument";
import {OutpostAtlas} from "./OutpostAtlas";
import {stationQuestions as questions, solQuestions, shuffledQuiz, type Quiz} from "../content/marsQuizzes";
import { RotateToLandscapeGate } from "./RotateToLandscapeGate";
import { evaluateMarsEnvironment, isNightPhase, type WeatherEventType } from "../game/marsWeather";
import { INITIAL_CAVE_NODES, type MineableNode } from "../game/marsCaveData";
import { createDefenseUnit, DEFENSE_RECIPES, canCraftDefense, type BaseDefenseUnit, type CraftInventory, type DefenseKind } from "../game/baseDefenses";
import { spawnInitialStalkers, stepStalkers, type StalkerEntity } from "../game/marsStalkers";
import type { RoomStateSnapshot, TradeResourceKind } from "../game/multiplayerTypes";
import {
  claimRoverSeat,
  deployBaseDefense,
  mineCaveNode,
  overrideRoomWeather,
  sendPlayerState,
  sendResourceTrade,
  sendRoverState,
  sendStationResupply,
  type CoopSocket,
} from "./multiplayer/socketClient";
import { ProximityVoiceController } from "./multiplayer/voiceChat";
import { WeatherTerminalModal } from "./WeatherTerminalModal";
import { DefenseCraftModal } from "./DefenseCraftModal";
import { TeamTradeModal } from "./TeamTradeModal";

type DialogState={modal:string|null;stage:"task"|"quiz"|"result";answer:number|null;progress:number;angle:number;drill:number;led:number;water:number;shield:number};
const initialDialog:DialogState={modal:null,stage:"task",answer:null,progress:0,angle:45,drill:40,led:25,water:30,shield:50};
type DialogAction = {[K in keyof DialogState]:{key:K;value:DialogState[K]}}[keyof DialogState] | {key:"updateProgress";value:(previous:number)=>number};
function dialogReducer(state:DialogState,action:DialogAction):DialogState{if(action.key==="updateProgress")return {...state,progress:action.value(state.progress)};return {...state,[action.key]:action.value};}


export default function MarsGame({
  callsign="Explorer",
  patch="✦",
  onHub,
  controlMode="pc",
  mission,
  sendMission,
  coopSocket=null,
  coopRoom=null,
  playDropPodIntro=true,
  onOpenLobby,
}:{
  callsign?:string;
  patch?:string;
  onHub?:()=>void;
  controlMode?:"mobile"|"pc";
  mission:Mission;
  sendMission:(action:Action)=>void;
  coopSocket?:CoopSocket|null;
  coopRoom?:RoomStateSnapshot|null;
  playDropPodIntro?:boolean;
  onOpenLobby?:()=>void;
}) {
 const send=sendMission;
 const [view,setView]=useState<View>(initial), [voice,setVoice]=useState(false), [quizSol,setQuizSol]=useState(0);
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
 const [touchMode,setTouchMode]=useState(()=>controlMode==="mobile");
 const [portraitBlocked,setPortraitBlocked]=useState(false);
 const [sageExpanded,setSageExpanded]=useState(false);
 const [worldFailure,setWorldFailure]=useState(false), [worldAttempt,setWorldAttempt]=useState(0), [lowGraphics,setLowGraphics]=useState(false);
 const [solPhase,setSolPhase]=useState(0.28);
 const [weatherOverride,setWeatherOverride]=useState<WeatherEventType|null>(null);
 const [soloMinerals,setSoloMinerals]=useState<MineableNode[]>(()=>INITIAL_CAVE_NODES.map(n=>({...n})));
 const [soloDefenses,setSoloDefenses]=useState<BaseDefenseUnit[]>([]);
 const [soloInventory,setSoloInventory]=useState<CraftInventory>({iceCores:1,titanium:2,powerCells:mission.resources.power});
 const [soloStalkers,setSoloStalkers]=useState<StalkerEntity[]>(()=>spawnInitialStalkers());
 const [soloMorale,setSoloMorale]=useState(96);
 const [stalkerAlert,setStalkerAlert]=useState<string|null>(null);
 const [micLive,setMicLive]=useState(false);
 const [micError,setMicError]=useState<string|null>(null);
 const voiceCtrlRef=useRef<ProximityVoiceController|null>(null);
 const alertTimerRef=useRef<number|null>(null);
 const viewRef=useRef(view);
 viewRef.current=view;

 const triggerStalkerAlert=useCallback((msg:string)=>{
  setStalkerAlert(msg);
  if(alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
  alertTimerRef.current=window.setTimeout(()=>setStalkerAlert(null),3200);
 },[]);

 useEffect(()=>()=>{
  if(alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
 },[]);

 const soloEnvironment=useMemo(
  ()=>evaluateMarsEnvironment(mission.sol,weatherOverride==="SOLAR_FLARE"?0.45:solPhase,weatherOverride),
  [mission.sol,solPhase,weatherOverride],
 );
 const activeEnvironment=coopRoom?.environment??soloEnvironment;
 const activeDefenses=coopRoom?.defenses??soloDefenses;
 const activeMinerals=coopRoom?.minerals??soloMinerals;
 const activeStalkers=coopRoom?.stalkers??soloStalkers;
 const selfCoopPlayer=useMemo(
  ()=>coopRoom?.players.find((pl)=>pl.id===coopSocket?.id)??null,
  [coopRoom,coopSocket],
 );
 const activeInventory:CraftInventory=selfCoopPlayer
  ? {iceCores:selfCoopPlayer.supplies.iceCores,titanium:selfCoopPlayer.supplies.titanium,powerCells:selfCoopPlayer.supplies.powerCells}
  : {...soloInventory,powerCells:mission.resources.power};

 // Solo-mode diurnal weather progression, cryo-drain & Martian Stalker AI loop
 useEffect(()=>{
  if(coopRoom||mission.ended||mission.failure) return;
  let lastTick=performance.now();
  const id=window.setInterval(()=>{
   const now=performance.now();
   const dt=Math.min(0.6,(now-lastTick)/1000);
   lastTick=now;
   setSolPhase((prev)=>(prev+dt/140)%1);
   const v=viewRef.current;
   const env=evaluateMarsEnvironment(mission.sol,weatherOverride==="SOLAR_FLARE"?0.45:solPhase,weatherOverride);
   setSoloStalkers((prev)=>{
    const res=stepStalkers(
     prev,
     [{
      id:"solo",
      x:v.x,
      z:v.z,
      biome:v.biome??"surface",
      inRover:Boolean(v.roverDriving),
      headlightYaw:v.roverYaw??v.yaw,
      headlightsOn:Boolean(v.roverDriving),
     }],
     activeDefenses,
     env.weather,
     env.tempC,
     mission.resources.power,
     dt,
     now/1000,
    );
    if(res.strikes.length>0){
     setSoloMorale((m)=>Math.max(12,m-7));
     triggerStalkerAlert("MARTIAN STALKER PROXIMITY BREACH — Deploy Laser/EMP defenses!");
    }
    return res.stalkers;
   });
  },250);
  return ()=>window.clearInterval(id);
 },[coopRoom,mission.ended,mission.failure,mission.sol,mission.resources.power,weatherOverride,solPhase,activeDefenses,triggerStalkerAlert]);

 // Co-op spatial voice chat controller & stalker socket notifications
 useEffect(()=>{
  if(!coopSocket){
   voiceCtrlRef.current?.dispose();
   voiceCtrlRef.current=null;
   setMicLive(false);
   return;
  }
  const vc=new ProximityVoiceController(coopSocket);
  voiceCtrlRef.current=vc;
  const onStrike=()=>{
   triggerStalkerAlert("MARTIAN STALKER STRIKE ON CREW!");
  };
  const onAlert=(msg:string)=>{
   triggerStalkerAlert(msg);
  };
  coopSocket.on("stalker:strike",onStrike);
  coopSocket.on("room:alert",onAlert);
  return ()=>{
   coopSocket.off("stalker:strike",onStrike);
   coopSocket.off("room:alert",onAlert);
   vc.dispose();
   voiceCtrlRef.current=null;
   setMicLive(false);
  };
 },[coopSocket,triggerStalkerAlert]);

 useEffect(()=>{
  const vc=voiceCtrlRef.current;
  if(!vc||!coopRoom) return;
  vc.syncPeersAndSpatialAudio(
   coopRoom.players,
   view.x,
   1.7,
   view.z,
   view.yaw,
   view.biome??"surface",
   activeEnvironment.radioInterference,
  );
 },[coopRoom,view.x,view.z,view.yaw,view.biome,activeEnvironment.radioInterference]);

 const toggleCoopMic=useCallback(async()=>{
  const vc=voiceCtrlRef.current;
  if(!vc) return;
  try{
   const live=await vc.toggleMicrophone();
   setMicLive(live);
   setMicError(null);
  }catch{
   setMicError("Mic access blocked or unavailable.");
  }
 },[]);

 // Global sci-fi shortcut keys: C = Base Defenses, T = Team Trade, M = Mic
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   const el=e.target as HTMLElement|null;
   if(el&&(el.tagName==="INPUT"||el.tagName==="TEXTAREA"||el.tagName==="SELECT")) return;
   if(mission.ended||mission.failure||modal) return;
   const k=e.key.toLowerCase();
   if(k==="c"){e.preventDefault();setModal("defenseCraft");}
   else if(k==="t"&&coopRoom){e.preventDefault();setModal("trade");}
   else if(k==="m"&&coopSocket){e.preventDefault();void toggleCoopMic();}
  };
  window.addEventListener("keydown",onKey);
  return ()=>window.removeEventListener("keydown",onKey);
 },[mission.ended,mission.failure,modal,coopRoom,coopSocket,toggleCoopMic]);

 const dialogRef=useRef<HTMLElement>(null);
 const activeDialog=Boolean(mission.failure || modal || ((mission.ended && modal!=="solQuiz"&&modal!=="debrief")));
 useEffect(()=>{
   if(!activeDialog) return;
   const previous=document.activeElement as HTMLElement | null;
   const dialog=dialogRef.current;
   if(!dialog) return;
   const focusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]'));
   (focusable()[0] ?? dialog).focus();
   const keydown=(event:KeyboardEvent)=>{
     if(event.key === "Escape" && !mission.ended){ event.preventDefault(); setModal(null);  }
     if(event.key !== "Tab") return;
     const items=focusable(); if(!items.length){event.preventDefault();dialog.focus();return;}
     const first=items[0],last=items[items.length-1];
     if(event.shiftKey && (document.activeElement===first || !dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
     else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
   };
   document.addEventListener("keydown",keydown);
   return ()=>{document.removeEventListener("keydown",keydown);previous?.focus();};
 },[activeDialog,mission.ended]);
 // The dialog remains mounted while its content changes, so focus the new step explicitly.
 useEffect(()=>{
   if (!modal || !dialogRef.current) return;
   const selector = modal === "solQuiz"
     ? (answer === null ? "[data-quiz-answer]" : "[data-dialog-continue]")
     : stage === "result" ? "[data-dialog-continue]" : stage === "quiz" ? "[data-quiz-answer]" : null;
   if (selector) dialogRef.current.querySelector<HTMLElement>(selector)?.focus();
 },[modal,stage,answer]);
 const [worldStarted,setWorldStarted]=useState(false);
 useEffect(()=>{if(!modal&&!mission.ended)setWorldStarted(true)},[modal,mission.ended]);
 const world=useRef<SurvivalWorldHandle>(null); const dragging=useRef(false);
 const [sageFollowing,setSageFollowing]=useState(false);
 const [mapTravel,setMapTravel]=useState(false);
 const [route,setRoute]=useState<{sol:number;id:string}|null>(null);
 const night=isNight(mission.sol);
 const next=flightPlan[mission.sol-1].station, destination=route?.sol===mission.sol?route.id:next, station=STATIONS.find(s=>s.id===destination)!, current=STATIONS.find(s=>s.id===view.target), curiosityTarget=view.target==="curiosity", distance=Math.round(Math.hypot(view.x-station.x,view.z-station.z));
 const bearing=Math.atan2(station.x-view.x,-(station.z-view.z)); const relative=bearing+view.yaw; const dir=Math.sin(relative)>.35?"↗":Math.sin(relative)<-.35?"↖":"↑";
 const handleMineNode=useCallback(async(nodeId:string)=>{
  if(coopSocket){
   const res=await mineCaveNode(coopSocket,nodeId);
   if(!res.ok&&res.error) triggerStalkerAlert(res.error);
   return;
  }
  const targetNode=soloMinerals.find(n=>n.id===nodeId&&!n.collected);
  if(!targetNode) return;
  setSoloMinerals(prev=>prev.map(n=>n.id===nodeId?{...n,collected:true}:n));
  setSoloInventory(inv=>targetNode.kind==="ice_core"?{...inv,iceCores:inv.iceCores+targetNode.yieldAmount}:{...inv,titanium:inv.titanium+targetNode.yieldAmount});
 },[coopSocket,soloMinerals,triggerStalkerAlert]);

 const handleDeployDefense=useCallback(async(kind:DefenseKind,x:number,z:number)=>{
  if(coopSocket){
   return deployBaseDefense(coopSocket,kind,x,z);
  }
  const recipe=DEFENSE_RECIPES[kind];
  const check=canCraftDefense(kind,activeInventory,mission.resources.power);
  if(!check.ok) return {ok:false,error:check.reason};
  const unit=createDefenseUnit(`solo-def-${Date.now()}`,kind,x,z,callsign,mission.resources.power);
  setSoloInventory(inv=>({...inv,iceCores:inv.iceCores-recipe.iceCoreCost,titanium:inv.titanium-recipe.titaniumCost}));
  setSoloDefenses(prev=>[...prev,unit]);
  return {ok:true};
 },[coopSocket,activeInventory,mission.resources.power,callsign]);

 const handleOverrideWeather=useCallback((w:WeatherEventType|null)=>{
  if(coopSocket){
   overrideRoomWeather(coopSocket,w);
  }else{
   setWeatherOverride(w);
  }
 },[coopSocket]);

 const open=(id:string)=>{if(mission.ended||mission.failure||view.roverDriving)return;if(id==="weather-terminal"){setModal("weatherTerminal");return;}if(id===next&&mission.activityDone){setModal("shift");return;}if(id==="curiosity"){setModal("curiosity");return;}if(!questions[id] && id!==next){if(labels[id])setModal("visit-"+id);return;}setProgress(0);setAngle(45);setDrill(40);setLed(25);setWater(30);setShield(50);setAnswer(null);setStage("task");setActiveQuiz(questions[id]?shuffledQuiz(questions[id]):null);setModal(id)};
 const complete=()=>{if(!modal)return;setRoute(null);if(coopSocket&&(modal==="oxygen"||modal==="water"||modal==="solar"||modal==="shelter")){sendStationResupply(coopSocket,modal==="solar"?"power":modal);}send({type:"TASK",id:modal});if(modal===next)setModal("shift");else setStage("quiz")};
 const hint=`${callsign}, ${labels[destination]} is ${distance} metres away ${dir}. ${mission.resources.power<35?"Power is low because our equipment and shifts use stored energy.":mission.resources.oxygen<35?"Oxygen is low because the crew uses air each shift.":"Follow the beacon. Interact with the equipment when you reach it."}`;
 const taskReady=modal==="solar"?progress>=8&&angle>=65:modal==="oxygen"?progress>=2:modal==="water"?drill>=55&&drill<=70:modal==="food"?led>=40&&led<=65&&water>=40&&water<=65:modal==="shelter"?shield>=65:progress>=1;
 return <main className="sv-root mars-root junior-root" data-controls={touchMode?"mobile":controlMode} data-phase="explore" data-player-x={view.x.toFixed(2)} data-player-z={view.z.toFixed(2)}>
 {worldStarted&&!mapTravel&&<SurvivalWorld
  solarClean={mission.found.includes("solar")}
  key={worldAttempt}
  ref={world}
  initialQuality={lowGraphics ? "performance" : "auto"}
  planet="mars"
  showTouchControls={controlMode === "mobile"}
  autoDetectTouch={false}
  onTouchControlsChange={setTouchMode}
  enabled={!modal&&!mission.ended&&!mission.failure&&!portraitBlocked}
  event={night||isNightPhase(activeEnvironment.solPhase)?"night":"quiet"}
  day={0}
  target={destination}
  effect={null}
  failure={false}
  stabilized={false}
  animating={false}
  sageFollowing={sageFollowing}
  onToggleSage={()=>setSageFollowing(value=>!value)}
  onInspect={open}
  onView={setView}
  onUnavailable={()=>setWorldFailure(true)}
  playDropPodIntro={playDropPodIntro}
  weather={activeEnvironment.weather}
  tempC={activeEnvironment.tempC}
  stalkers={activeStalkers}
  defenses={activeDefenses}
  minerals={activeMinerals}
  remotePlayers={coopRoom?.players}
  selfPlayerId={coopSocket?.id??null}
  sharedRover={coopRoom?.rover??null}
  onRoverClaim={(driving)=>{if(coopSocket) void claimRoverSeat(coopSocket,driving);}}
  onPlayerSync={(payload)=>{if(coopSocket) sendPlayerState(coopSocket,payload);}}
  onRoverSync={(payload)=>{if(coopSocket) sendRoverState(coopSocket,payload);}}
  onMineNode={(nodeId)=>{void handleMineNode(nodeId);}}
  onOpenWeatherTerminal={()=>setModal("weatherTerminal")}
  onOpenDefenseCraft={()=>setModal("defenseCraft")}
  onOpenTrade={()=>{if(coopRoom) setModal("trade");}}
 />}
 {!modal&&!mission.ended&&!mission.failure&&<RotateToLandscapeGate onBlockedChange={setPortraitBlocked} />}
 {worldFailure&&<div className="mars-dialog-backdrop"><section className="mars-dialog junior-dialog" role="alert"><h2>We couldn’t start the 3D world</h2><p>Your browser may have lost its graphics connection. Try again, or choose the lighter graphics setting.</p><button onClick={()=>{setLowGraphics(false);setWorldFailure(false);setWorldAttempt(v=>v+1)}}>Retry</button><button onClick={()=>{setLowGraphics(true);setWorldFailure(false);setWorldAttempt(v=>v+1)}}>Retry with low graphics</button><button onClick={()=>{setWorldFailure(false);setMapTravel(true);setModal("atlas")}}>Use base map</button><button onClick={onHub}>Mission hub</button></section></div>}
 {showControlHint&&!touchMode&&<div className="junior-hint" role="note"><strong>Ready, explorer?</strong> WASD walks, C opens Defense Fabrication, E interacts/mines/opens Weather Terminal, F drives rover, V switches camera.{coopRoom?" T trades supplies & M toggles proximity voice.":""} <button onClick={()=>{setShowControlHint(false);document.querySelector<HTMLElement>(".sv-world")?.focus()}}>Got it</button></div>}
 {stalkerAlert&&!activeDialog&&<div className="sci-stalker-alert" role="alert">{stalkerAlert}</div>}
 {!touchMode&&!activeDialog&&!portraitBlocked&&!worldFailure&&<div className="sci-action-dock" role="toolbar" aria-label="Tactical field systems">
  <button type="button" onClick={()=>setModal("weatherTerminal")}><CloudLightning size={14}/><span>Weather</span></button>
  <button type="button" onClick={()=>setModal("defenseCraft")}><Wrench size={14}/><span>Defenses · C</span></button>
  {coopRoom&&<button type="button" onClick={()=>setModal("trade")}><ArrowLeftRight size={14}/><span>Trade · T</span></button>}
  {coopSocket&&<button type="button" className={micLive?"is-live":""} onClick={()=>void toggleCoopMic()} title={micError??"Toggle proximity voice chat"}>{micLive?<Mic size={14}/>:<MicOff size={14}/>}<span>{micLive?"Mic Live":"Mic Muted"} · M</span></button>}
  {onOpenLobby&&<button type="button" onClick={onOpenLobby}><Users size={14}/><span>{coopRoom?`Co-op ${coopRoom.code} (${coopRoom.players.length}/4)`:"Co-op Lobby"}</span></button>}
 </div>}
 {touchMode ? !activeDialog && !portraitBlocked && !worldFailure && <div className="flight-mobile">
   <button className="flight-scope" aria-label="Open mission map" onClick={()=>setModal("atlas")}><MarsRadarMinimap view={view} found={mission.found} target={destination} defenses={activeDefenses} stalkers={activeStalkers} remotePlayers={coopRoom?.players} selfPlayerId={coopSocket?.id??null}/></button>
   <button className="flight-track" onClick={()=>setModal("atlas")} aria-label={`Track ${labels[destination]}, ${distance} metres`}><Navigation2 size={16} style={{transform:`rotate(${relative}rad)`}}/>{distance} m</button>
   <button className="flight-menu" onClick={()=>setModal("fieldMenu")} aria-label="Open expedition menu"><Pause size={20}/></button>
   <button className="flight-stores" onClick={()=>setModal("fieldMenu")} aria-label="View crew supplies">
     {[[Wind,mission.resources.oxygen],[Shield,100-mission.resources.risk],[Battery,mission.resources.power]].map(([Icon,value],i)=>{
       const Gauge=Icon as typeof Wind;
       return <span key={i}><Gauge size={13}/><meter min={0} max={100} value={Number(value)} /></span>;
     })}
   </button>
 </div> : <><header className="junior-header"><b>TARUKH <span>│ OUTPOST ALPHA</span></b><strong title={`${callsign} · ${activeEnvironment.tempC}°C`}>● ─ &nbsp; SOL {String(mission.sol).padStart(2,"0")} / 10 &nbsp; ─ ●</strong><button onClick={onHub}>Mission hub</button></header>
 <MarsHud mission={mission} view={view} target={destination} onGuide={()=>setModal("guide")} onLog={()=>setModal("log")} tempC={activeEnvironment.tempC} weather={activeEnvironment.weather} defenses={activeDefenses} stalkers={activeStalkers} remotePlayers={coopRoom?.players} selfPlayerId={coopSocket?.id??null} morale={selfCoopPlayer?.supplies.morale??soloMorale} inventory={activeInventory} />
 <button onClick={()=>setModal("atlas")} className="junior-compass">Map · {dir} {labels[destination]} · {distance} m</button>
 <aside className={`mars-sage${sageExpanded?" sage-open":" sage-collapsed"}`}><button type="button" className="mars-sage-toggle" aria-expanded={sageExpanded} onClick={()=>setSageExpanded(v=>!v)}><span className="sage-face" aria-hidden="true">⌒ ⌒</span> <b>SAGE</b> · {sageExpanded?"Hide ▴":"Hint ▾"}</button><div className="mars-sage-body"><div className="sage-comms"><span className="sage-face" aria-hidden="true">⌒ ⌒</span><p><b>SAGE:</b> {hint}</p></div><details className="sage-options"><summary>Sage &amp; audio controls</summary><div className="sage-controls"><button type="button" className="sage-follow" aria-pressed={sageFollowing} onClick={()=>setSageFollowing(value=>!value)}>{sageFollowing?"Send Sage home":"Bring Sage along"} {!touchMode&&<span>· B</span>}</button><small aria-live="polite">{sageFollowing?"Follow mode on":"Home mode on"}</small><button onClick={()=>{setVoice(true);if("speechSynthesis" in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(hint))}}}>{voice?"Read again":"🔊 Read hint"}</button></div></details></div></aside>
 {!modal&&!mission.ended&&!mission.failure&&<div className="junior-shift field-objective" role="status"><small>SOL {mission.sol} / FIELD ASSIGNMENT</small><strong>{flightPlan[mission.sol-1].title}</strong><span>{mission.activityDone?"Return to":"Reach"} {labels[next]} · {mission.activityDone?"choose your plan":"interact to begin"}</span></div>}
 </>}
 {!activeDialog && !portraitBlocked && !worldFailure && !view.roverDriving && (
   view.nearbyMineral && !view.nearbyMineral.collected ? (
     <div className="mars-target">
       <strong>{view.nearbyMineral.kind==="ice_core"?"Cryo-Ice Core Deposit":"Titanium Ore Vein"}</strong>
       <span>Press E to mine +{view.nearbyMineral.yieldAmount} {view.nearbyMineral.kind==="ice_core"?"Ice Core":"Titanium"}</span>
       <button onClick={()=>void handleMineNode(view.nearbyMineral!.id)}>Mine Deposit</button>
     </div>
   ) : view.nearCaveExit ? (
     <div className="mars-target">
       <strong>Cryo-Lift Extraction Shaft</strong>
       <span>Press E to ascend to Jezero Crater Surface</span>
       <button onClick={()=>world.current?.toggleBiome?.()}>Ascend to Surface</button>
     </div>
   ) : view.nearbyCaveEntrance ? (
     <div className="mars-target">
       <strong>{view.nearbyCaveEntrance.label}</strong>
       <span>Press E to descend into Sub-Surface Ice Cave</span>
       <button onClick={()=>world.current?.toggleBiome?.()}>Enter Ice Cave</button>
     </div>
   ) : view.target==="weather-terminal" && view.distance<=5.5 ? (
     <div className="mars-target">
       <strong>Atmospheric Forecasting Terminal</strong>
       <span>Press E to inspect Sol -100°C curve & storm alerts</span>
       <button onClick={()=>setModal("weatherTerminal")}>Open Terminal</button>
     </div>
   ) : (current || curiosityTarget) ? (
     <div className="mars-target"><strong>{curiosityTarget?"Curiosity science rover (Autonomous)":(labels[current!.id]??current!.name)}</strong><span>{view.distance<=5.5?(curiosityTarget?(view.curiosityPhase==="scanning"?(touchMode?"Scanning surface · Tap Inspect":"Scanning surface · Press E to inspect"):(touchMode?"Autonomous traverse · Tap Inspect":"Autonomous traverse · Press E to inspect")):current!.id===next?(touchMode?"Tap Start to begin":"Press E for your assignment"):current!.id==="rover"?(touchMode?"Tap Inspect or Drive":"Press E to inspect or F to drive"):(touchMode?"Tap Inspect":"Press E to inspect")):`${Math.round(view.distance)} m · move closer`}</span>{view.distance<=5.5&&(curiosityTarget||labels[current!.id])&&<button onClick={()=>open(curiosityTarget?"curiosity":current!.id)}>{current?.id===next?(mission.activityDone?"Resume decision":"Start mission"):"Inspect"}</button>}{!curiosityTarget&&view.distance<=5.5&&current?.id==="rover"&&<button onClick={()=>world.current?.toggleRover?.()}>Drive Rover{touchMode?"":" · F"}</button>}</div>
   ) : null
 )}
 {modal==="weatherTerminal"&&<WeatherTerminalModal environment={activeEnvironment} canOverride={!coopRoom||coopRoom.hostId===coopSocket?.id} onOverrideWeather={handleOverrideWeather} onClose={()=>setModal(null)}/>}
 {modal==="defenseCraft"&&<DefenseCraftModal inventory={activeInventory} teamPower={selfCoopPlayer?.supplies.powerCells??mission.resources.power} defenses={activeDefenses} playerX={view.x} playerZ={view.z} inCave={view.biome==="cave"} onDeploy={handleDeployDefense} onClose={()=>setModal(null)}/>}
 {modal==="trade"&&coopRoom&&selfCoopPlayer&&<TeamTradeModal selfPlayer={selfCoopPlayer} teammates={coopRoom.players.filter(pl=>pl.id!==selfCoopPlayer.id)} onTransfer={(toPlayerId,resource,amount)=>coopSocket?sendResourceTrade(coopSocket,{toPlayerId,resource,amount}):Promise.resolve({ok:false,error:"Not connected."})} onClose={()=>setModal(null)}/>}
 {(mission.failure||(modal&&modal!=="weatherTerminal"&&modal!=="defenseCraft"&&modal!=="trade"))&&(!mission.ended||modal==="solQuiz"||modal==="debrief")&&<div className="mars-dialog-backdrop"><MissionDialogFrame dialogRef={dialogRef}>
 {mission.failure?<><h2>Try another plan</h2><p>{mission.failure}</p><p>Your pre-decision supplies are ready for a retry.</p><button onClick={()=>{send({type:"RETRY"});setModal(mapTravel?"atlas":null)}}>Retry this sol</button></>:
 modal==="fieldMenu"?<section className="flight-sheet"><small>SOL {mission.sol} / 10</small><h2>{flightPlan[mission.sol-1].title}</h2><p>{hint}</p>
 <dl>{Object.entries(mission.resources).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
 <button onClick={()=>setModal(null)}>Resume expedition</button><div className="flight-menu-grid">
 <button onClick={()=>setModal("atlas")}>Map</button><button onClick={()=>setModal("log")}>Log</button><button onClick={()=>setModal("guide")}>Discoveries</button>
 <button onClick={()=>setSageFollowing(!sageFollowing)}>{sageFollowing?"Send Sage home":"Bring Sage along"}</button>
 <button onClick={()=>{if("speechSynthesis" in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(hint))}}}>Read hint</button><button onClick={onHub}>Mission hub</button></div>
 <p>Drag on the left to walk or sprint. Swipe on the right to look. In the rover, steer with the arrows and hold FWD, REV, or Brake.</p></section>:
 modal==="atlas"?<OutpostAtlas mission={mission} target={destination} position={view} mapTravel={mapTravel} onTrack={id=>{setRoute({sol:mission.sol,id});setModal(null)}} onTravel={(x,z)=>setView(v=>({...v,x,z}))} onInspect={open} onClose={()=>setModal(null)}/>:
 modal==="debrief"?<><p className="mars-kicker">SOL {quizSol} · MISSION COMPLETE</p><h2>{flightPlan[quizSol-1].title}</h2><p>{mission.log[mission.log.length-1]}</p><button onClick={()=>setModal(mapTravel&&!mission.ended?"atlas":null)}>{mission.ended?"Collect mission certificate":"Back to the outpost"}</button><button onClick={()=>setModal("solQuiz")}>Try the science question</button></>:
 modal==="solQuiz"&&activeQuiz?<><p>{[...mission.log].reverse().find(entry=>entry.startsWith("Sol "+quizSol+": ")&&!entry.includes("inspected"))}</p><SolQuizDialog quiz={activeQuiz} sol={quizSol} answer={answer} onAnswer={i=>{setAnswer(i);send({type:"SHIFT_QUIZ",sol:quizSol,correct:i===activeQuiz.correct})}} onClose={()=>setModal(mapTravel&&!mission.ended?"atlas":null)}/></>:
 modal?.startsWith("visit-")?<><h2>{labels[modal.slice(6)]}</h2><p>This station supports sol {flightPlan.findIndex(f=>f.station===modal.slice(6))+1}. Today’s assignment is at the {labels[next]}.</p><button onClick={()=>setModal("atlas")}>View base map</button></>:
 modal==="curiosity"?<><p className="mars-kicker">NASA MARS SCIENCE LABORATORY · AUTONOMOUS</p><h2>Curiosity rover telemetry</h2><p><b>Status:</b> {view.curiosityPhase==="scanning"?`Scanning surface (${view.curiosityScanStage==="laser"?"ChemCam LIBS laser active":view.curiosityScanStage==="deploy"?"Deploying robotic arm":"Stowing sample arm"})`:"Autonomous smooth-terrain traverse"}</p><p><b>Surface scans completed:</b> {view.curiosityScans??0}</p><p><b>Latest spectroscopy note:</b> {view.curiositySample??"Olivine-rich basalt pebble · Mg/Fe spectral peak detected"}</p><p>Curiosity autonomously plans safe paths across smooth Martian soil, steers around boulders and steep crater slopes, pauses to aim its ChemCam spectrometer laser and robotic arm, and yields whenever your astronaut or crew rover approaches. Its patrols are observational only and never use crew supplies.</p><p><a href="https://science.nasa.gov/mission/msl-curiosity/" target="_blank" rel="noreferrer">NASA Curiosity mission ↗</a></p><button onClick={()=>setModal(null)}>Back to mission</button></>:
 modal==="guide"?<><p className="mars-kicker">STICKER & DISCOVERY CODEX</p><h2>{mission.found.length}/6 discoveries</h2><div className="junior-grid">{discoveryIds.map(id=><div key={id} className={mission.found.includes(id)?"unlocked":"locked"}><span>{mission.found.includes(id)?"✦":"?"}</span><b>{mission.found.includes(id)?labels[id]:"Undiscovered"}</b><small>{mission.patches.includes(id)?"Patch earned":"Patch locked"}</small></div>)}</div><p>Explore the outpost to reveal all six discoveries. <a href="https://science.nasa.gov/mars/facts/" target="_blank" rel="noreferrer">NASA Mars facts ↗</a></p><button onClick={()=>setModal(null)}>Back to mission</button></>:
 modal==="log"?<><p className="mars-kicker">MISSION LOG</p><h2>Your expedition</h2><ol>{mission.log.map((v,i)=><li key={i}>{v}</li>)}</ol><button onClick={()=>setModal(null)}>Close log</button></>:
 modal==="shift"?<><p className="mars-kicker">SOL {mission.sol} · CREW DECISION</p><h2>{flightPlan[mission.sol-1].title}</h2><p>{flightPlan[mission.sol-1].clue}</p>{mission.sol===6&&<p className="archive-reading">{mission.log.filter(line=>line.startsWith("Earth reply")).slice(-1)[0]}</p>}<p>Current stores: {Object.entries(mission.resources).map(([k,v])=>k+" "+v).join(" · ")}</p><small>Projected stores include crew use. All values are training points.</small>{flightPlan[mission.sol-1].plans.map((plan,i)=><button key={plan.name} onClick={()=>{setQuizSol(mission.sol);setAnswer(null);setActiveQuiz(shuffledQuiz(solQuestions[mission.sol-1]));send({type:"SHIFT",choice:i===0?"careful":"quick"});setModal("debrief")}}>{plan.name}<span className="plan-forecast">{Object.entries(forecast(mission,i===0?0:1)).map(([k,v])=>k+" "+v).join(" · ")}</span></button>)}<button onClick={()=>setModal(mapTravel?"atlas":null)}>Return to fieldwork</button></>:
 stage==="quiz"||stage==="result"?<><p className="mars-kicker">NASA QUICK QUIZ · ✦</p><h2>{activeQuiz!.q}</h2>{activeQuiz!.answers.map((a,i)=><button key={a} data-quiz-answer disabled={stage==="result"} onClick={()=>{setAnswer(i);send({type:"QUIZ",id:modal??"",correct:i===activeQuiz!.correct});setStage("result")}}>{a}</button>)}{stage==="result"&&<><p><b>{answer===activeQuiz!.correct?"Correct! This station patch is in your notebook.":"Good try! You can revisit this station and try again."}</b> {activeQuiz!.explain} <a href={activeQuiz!.url} target="_blank" rel="noreferrer">NASA source ↗</a></p><button data-dialog-continue onClick={()=>setModal(mapTravel?"atlas":null)}>Continue mission</button></>}</>:
 <><p className="mars-kicker">{modal===next?"MISSION STARTED":"STATION SERVICE"} · {labels[modal??""]}</p><h2>{modal===next?flightPlan[mission.sol-1].title:labels[modal??""]}</h2>{modal===next&&<p><b>{flightPlan[mission.sol-1].instrument}.</b> {flightPlan[mission.sol-1].clue}</p>}{mission.dispatch&&modal===next&&<p className="archive-reading">Incoming update · Finish this inspection to receive it.</p>}{archives[modal??""]&&<p className="archive-reading"><b>{archives[modal!].label}</b><br/>{archives[modal!].text} <a href={archives[modal!].url} target="_blank" rel="noreferrer">NASA archive ↗</a></p>}{mission.found.includes(modal??"")&&<p>You completed this activity already. You can try its quiz again.</p>}
 {modal==="solar"?<><p>Drag over the dusty panel to clean it, then tilt it toward the sun. You can also use the brush button.</p><div className="junior-panel" onPointerDown={e=>{dragging.current=true;e.currentTarget.setPointerCapture(e.pointerId);setProgress(v=>Math.min(10,v+1))}} onPointerMove={()=>{if(dragging.current)setProgress(v=>Math.min(10,v+1))}} onPointerUp={()=>dragging.current=false} onPointerCancel={()=>dragging.current=false} onLostPointerCapture={()=>dragging.current=false} style={{background:`linear-gradient(rgba(184,109,58,${Math.max(0, .85-progress*.085)}),rgba(23,61,93,.92))`}}>☀ SOLAR ARRAY · DUST {Math.max(0,10-progress)}/10</div><button onClick={()=>setProgress(v=>Math.min(10,v+1))}>Brush dust</button><label>Panel angle: {angle}° <input type="range" min="0" max="90" value={angle} onChange={e=>setAngle(+e.target.value)}/></label><small>Training target: 65–90°. Real optimal angles depend on location and time.</small></>:
 modal==="oxygen"?<><p>Collect two oxygen atoms from two CO₂ molecules, then combine them into O₂. CO is also produced.</p><button onClick={()=>setProgress(v=>Math.min(2,v+1))}>Split one CO₂ molecule · {progress}/2</button><p>CO₂ → CO + O · O + O → O₂</p></>:
 modal==="water"?<><p>Set the drill to the marked ice layer while keeping its temperature safe.</p><label>Training depth: {drill} <input type="range" min="0" max="100" value={drill} onChange={e=>setDrill(+e.target.value)}/></label><p>{drill>70?"Too deep: drill is overheating!":drill>=55?"Ice layer reached; temperature safe.":"Keep searching for the ice layer."}</p></>:
 modal==="food"?<><p>Balance the light and water for the training plants.</p><label>LED spectrum {led}<input type="range" min="0" max="100" value={led} onChange={e=>setLed(+e.target.value)}/></label><label>Water drip {water}<input type="range" min="0" max="100" value={water} onChange={e=>setWater(+e.target.value)}/></label><p>Training target: keep both between 40 and 65.</p></>:
 modal==="shelter"?<><p>This shelter drill prepares the crew for a particle warning. Add shielding before the crew takes shelter.</p><label>Shielding {shield}<input type="range" min="0" max="100" value={shield} onChange={e=>setShield(+e.target.value)}/></label><p>Training target: at least 65. This score is not a radiation dose.</p></>:modal!=="rover"?<FieldInstrument station={modal??""} recorded={progress===1} onRecord={()=>setProgress(1)}/>:<><p>Inspect drive systems and telemetry before taking the big rover out to explore the map.</p><button onClick={()=>setProgress(1)}>Check wheels, steering and signal</button></>}
 <button disabled={!taskReady} onClick={complete}>Complete activity →</button><button onClick={()=>setModal(null)}>Close</button></>}
 </MissionDialogFrame></div>}
 {((mission.ended && modal!=="solQuiz"&&modal!=="debrief"))&&<div className="mars-dialog-backdrop"><section ref={dialogRef} tabIndex={-1} className="mars-dialog junior-certificate" role="dialog" aria-modal="true"><p className="mars-kicker">TARUKH · JUNIOR ASTRONAUT</p><h2>Junior Astronaut Mission Certificate</h2><div className="junior-patch">{patch}</div><p>Awarded to</p><h1>{callsign}</h1><p>{rank(mission.xp,mission.found.length)} · {mission.found.length}/6 discoveries · {mission.xp} XP</p><p>Resource score: {mission.resources.power+mission.resources.water+mission.resources.food+mission.resources.oxygen} / 400</p><button onClick={()=>window.print()}>Print certificate</button><button onClick={onHub}>Return to mission hub</button></section></div>}
 </main>
}
