export type PerformanceMeterMode = 'off' | 'fps' | 'detailed';
type Sample = {fps:number;calls:number;triangles:number;textures:number;scale:number;tier:string};

/** Format once per existing measurement window, never once per rendered frame. */
export function performanceReadout(mode:PerformanceMeterMode,sample:Sample):string {
  if(mode==='off')return '';
  if(!Number.isFinite(sample.fps)||sample.fps<=0)return 'Measuring FPS…';
  const fps=`${sample.fps.toFixed(0)} FPS`;
  if(mode==='fps')return fps;
  return `${fps} · ${(1000/sample.fps).toFixed(1)} ms\nDraw calls: ${sample.calls}\nTriangles: ${sample.triangles.toLocaleString('en-US')}\nTextures: ${sample.textures}\nRender scale: ${sample.scale.toFixed(2)}\nTier: ${sample.tier}`;
}
