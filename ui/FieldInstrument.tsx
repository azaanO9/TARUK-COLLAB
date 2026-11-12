import {useState} from "react";

const checks:Record<string,{reading:string;prompt:string;choices:string[];answer:number;hint:string}>={
 relay:{reading:"Terrain map ready · Relay aligned · Reply pending",prompt:"Pack the item Earth needs to help plan the route.",choices:["Terrain map","Crew meal list"],answer:0,hint:"Earth needs a picture of the ground to check the route."},
 monitor:{reading:"Particle detector: elevated · Forecast: outdoor work advisory",prompt:"Flag the work that needs review.",choices:["Indoor plant checks","Outdoor loading"],answer:1,hint:"Look for the job that would take the crew outside shielding."},
 research:{reading:"Tray B · Ridge east · Dark grains · Scan 04",prompt:"Attach a field label to scan 04.",choices:["Dark grains, location unknown","Dark grains, east ridge"],answer:1,hint:"A scientist needs both the observation and the collection site."},
 battery:{reading:"Relay online · Field notebook ready · Status light green",prompt:"Load the science payload into the sender.",choices:["Field notebook","Status light reading"],answer:0,hint:"Earth needs the sample observations to read your report."}
};
export function FieldInstrument({station,recorded,onRecord}:{station:string;recorded:boolean;onRecord:()=>void}){
 const [feedback,setFeedback]=useState("");
 const check=checks[station];
 if(!check)return null;
 return <section className="field-instrument"><p><samp>{check.reading}</samp></p><p>{check.prompt}</p>{check.choices.map((choice,i)=><button key={choice} disabled={recorded} onClick={()=>{if(i===check.answer)onRecord();else setFeedback(check.hint)}}>{choice}</button>)}<p role="status">{recorded?"Evidence recorded.":feedback}</p></section>
}
