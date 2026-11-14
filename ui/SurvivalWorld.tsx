"use client";
import { createStreamedMars } from "./world/streamedMars";
import { streamingBudget, STREAM_LIMIT } from "../game/terrainStreaming";
import { nightAmount, daylightPhase, daylightAngle } from "../game/daylightCycle";
import { safeLookDelta } from "../game/mouseLook";
import { assetUrl } from "../lib/assetUrl";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Mesh, MeshStandardMaterial, Object3D } from "three";
import { STATIONS as marsStations } from "../content/marsBase";
import { STATIONS as lunarStations } from "../content/survival";
import { scanRoverLidar, type LidarScan } from "../game/roverLidar";
import { stepMarsLocomotion } from "../game/marsLocomotion";
import { spawnWalker, stepWalker, stepJump, WALKER_RADIUS, type MoveAxes } from "../game/navigation";
import { boxObstacle } from "../game/collision";
import { isCoarsePointerDevice } from "./mobileDevice";
import { TouchControlsOverlay } from "./world/TouchControlsOverlay";
import { MarsTouchDeck } from "./world/MarsTouchDeck";
import { RoverTouchDeck } from "./world/RoverTouchDeck";
import { Settings2 } from "lucide-react";
import { createSageCompanion, createSageDock } from "./world/createSageCompanion";
import { SAGE_DOCK, sageDestination, stepSage } from "../game/sageCompanion";
import { createMarsSky, createMarsFootprints } from "./world/marsTerrain";
import { loadMarsSurfaceTextures, disposeMarsSurfaceTextures } from "./world/marsSurfaceTextures";
import { createRiggedAstronaut } from "./world/createRiggedAstronaut";
import { createBigRover } from "./world/createBigRover";
import { createCuriosityRover } from "./world/createCuriosityRover";
import {
  spawnCuriosityRover,
  stepCuriosityRover,
  curiosityFootprint,
  exportCuriositySave,
  type CuriosityRoverState,
} from "../game/curiosityRover";
import { CURIOSITY_SAVE_KEY, parseCuriositySave } from "../game/marsSave";
import { createMarsWindDust } from "./world/marsWindDust";
import { createSoftContactShadow } from "./world/contactShadow";
import { graphicsTier, startingProfile } from "./world/graphicsTiers";
import { createMarsEnvironment, MARS_SUN_DIRECTION } from "./world/marsAtmosphere";
import {
  spawnRoverVehicle,
  stepRoverVehicle,
  canEnterRover,
  enterRover,
  exitRover,
  roverFootprint,
  getRoverGear,
  type RoverAnalogInput,
  type RoverGear,
} from "../game/roverVehicle";
import type { Effect } from "../game/survivalTypes";
import {
  CAVE_BOUNDARY_RADIUS,
  CAVE_ENTRANCES,
  CAVE_EXIT_PORTAL,
  CAVE_PILLARS,
  caveHeightAt,
  nearestCaveEntrance,
  type CaveEntrance,
  type MineableNode,
} from "../game/marsCaveData";
import type { WeatherEventType } from "../game/marsWeather";
import { createCaveBiomeScene } from "./world/marsCaveBiome";
import { createShuttleLanding } from "./world/createShuttleLanding";
import { createDropPodIntro } from "./world/createDropPodIntro";

export type BiomeId = "surface" | "cave";

function shortestAngleDiff(from: number, to: number): number {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export type View = {
  lightPhase?: string;
  mapRocks?: readonly {x:number;z:number;radius:number}[];
  x: number;
  z: number;
  yaw: number;
  target: string | null;
  distance: number;
  locked: boolean;
  jumpHeight: number;
  biome?: BiomeId;
  nearbyCaveEntrance?: CaveEntrance | null;
  nearCaveExit?: boolean;
  nearbyMineral?: MineableNode | null;
  minerals?: readonly MineableNode[];
  roverX?: number;
  roverZ?: number;
  roverYaw?: number;
  roverDriving?: boolean;
  roverSpeed?: number;
  roverGear?: RoverGear;
  mudDepth?: number;
  curiosityX?: number;
  curiosityZ?: number;
  curiosityYaw?: number;
  curiosityPhase?: "driving" | "scanning";
  curiosityScanStage?: "none" | "deploy" | "laser" | "stow";
  curiosityScans?: number;
  curiositySample?: string;
  lidar?: LidarScan;
};
type Props = {
  freeRoam?: boolean;
  onReady?: () => void;
  onTerrainMode?: (enabled:boolean) => void;
  enabled: boolean;
  showTouchControls: boolean;
  autoDetectTouch?: boolean;
  planet?: "moon" | "mars";
  event: string;
  day: number;
  target: string;
  effect: Effect | null;
  failure: boolean;
  stabilized: boolean;
  animating: boolean;
  sageFollowing?: boolean;
  onToggleSage?: () => void;
  onInspect: (id: string) => void;
  onView: (view: View) => void;
  onUnavailable: () => void;
  solarClean?: boolean;
  initialQuality?: "auto" | "performance";
  onTouchControlsChange?: (active: boolean) => void;
  playDropPodIntro?: boolean;
  biome?: BiomeId;
  onBiomeChange?: (biome: BiomeId) => void;
  weather?: WeatherEventType;
  tempC?: number;
  minerals?: readonly MineableNode[];
  onMineNode?: (nodeId: string) => void;
  onOpenWeatherTerminal?: () => void;
};
export type SurvivalWorldHandle = {
  captureMouse: () => void;
  toggleRover?: () => void;
  toggleBiome?: () => void;
  skipIntro?: () => void;
};
const SurvivalWorld = forwardRef<SurvivalWorldHandle, Props>(function SurvivalWorld(props, ref) {
  const STATIONS = props.freeRoam ? [] : props.planet === "mars" ? marsStations : lunarStations;
  const host = useRef<HTMLDivElement>(null),
    current = useRef(props);
  const aim = useRef<HTMLDivElement>(null);
  const debugPanel = useRef<HTMLPreElement>(null);
  const [debug] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1");
  current.current = props;
  const controls = useRef(new Set<string>()),
    lockAction = useRef<() => void>(() => {});
  const toggleRoverAction = useRef<() => void>(() => {});
  const toggleBiomeAction = useRef<() => void>(() => {});
  const skipIntroAction = useRef<() => void>(() => {});
  const inspectAction = useRef<() => void>(() => {});
  const analogWalk = useRef<MoveAxes>({});
  const analogDrive = useRef<RoverAnalogInput>({});
  const [autoCoarse, setAutoCoarse] = useState(false);
  const [touchOverride, setTouchOverride] = useState<boolean | null>(null);
  const touchControlsActive = touchOverride ?? (props.showTouchControls || (props.autoDetectTouch !== false && autoCoarse));
  useEffect(() => {
    const syncCoarse = () => setAutoCoarse(isCoarsePointerDevice());
    syncCoarse();
    const media = window.matchMedia?.("(pointer: coarse)");
    media?.addEventListener?.("change", syncCoarse);
    return () => media?.removeEventListener?.("change", syncCoarse);
  }, []);
  useEffect(() => {
    props.onTouchControlsChange?.(touchControlsActive);
  }, [touchControlsActive, props.onTouchControlsChange]);
  const [roverDriving, setRoverDriving] = useState(false),
    [roverNear, setRoverNear] = useState(false),
    [canInspect, setCanInspect] = useState(false),
    [roverSpeed, setRoverSpeed] = useState(0),
    [roverGear, setRoverGear] = useState<RoverGear>("N"),
    [roverMud, setRoverMud] = useState(false),
    [roverHandbrake, setRoverHandbrake] = useState(false),
    [introActive, setIntroActive] = useState(Boolean(props.playDropPodIntro)),
    [introTelemetry, setIntroTelemetry] = useState({ alt: 52, speed: 48 });
  const TouchDeck = props.planet === "mars" ? (roverDriving ? RoverTouchDeck : MarsTouchDeck) : TouchControlsOverlay;
  useImperativeHandle(
    ref,
    () => ({
      captureMouse: () => lockAction.current(),
      toggleRover: () => toggleRoverAction.current(),
      toggleBiome: () => toggleBiomeAction.current(),
      skipIntro: () => skipIntroAction.current(),
    }),
    [],
  );
  const [loadingStage, setLoadingStage] = useState(props.freeRoam ? "Loading explorers and rovers…" : "Loading mission equipment…"),
    [loadingProgress, setLoadingProgress] = useState(10),
    [loaded, setLoaded] = useState(false),
    [locked, setLocked] = useState(false),
    [cursorFree, setCursorFree] = useState(false),
    [message, setMessage] = useState(""),
    [thirdPerson, setThirdPerson] = useState(true),
    [sensitivity, setSensitivity] = useState(1),
    [quality, setQuality] = useState(props.initialQuality ?? (props.planet === "mars" ? "auto" : "high"));
  const [autoLabel,setAutoLabel]=useState("Detecting");
  const cursorReleased = useRef(false);
  const cameraSettings = useRef({ thirdPerson, sensitivity, quality, touchControlsActive });
  cameraSettings.current = { thirdPerson, sensitivity, quality, touchControlsActive };
  useEffect(() => {
    cursorReleased.current = false;
    setCursorFree(false);
    if (props.enabled) host.current?.focus({ preventScroll: true });
    else {
      controls.current.clear();
      analogWalk.current = {};
      analogDrive.current = {};
      if (document.pointerLockElement === host.current)
        document.exitPointerLock();
    }
  }, [props.enabled]);
  useEffect(() => {
    let cancelled = false,
      dispose = () => {};
    async function mount() {
      const loadStarted = performance.now();
      const [T, { createSurvivalOutpost }] = await Promise.all([
        import("three"),
        import("./world/createSurvivalOutpost"),
      ]);
      if (cancelled || !host.current) return;
      setLoadingStage(props.freeRoam ? "Preparing Mars terrain…" : "Building the outpost…");
      setLoadingProgress(35);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (cancelled || !host.current) return;
      const element = host.current;
      const mobileMars = props.planet === "mars" && isCoarsePointerDevice();
      // Keep phone frames in the default framebuffer. Multisampled HDR post
      // targets add several full-screen resolves on tile-based mobile GPUs.
      const displayRatio = Math.min(devicePixelRatio, mobileMars ? 1.25 : Infinity);
      const renderer = new T.WebGLRenderer({
        antialias: !mobileMars && props.initialQuality !== "performance",
        powerPreference: "high-performance",
      });
      const gl = renderer.getContext();
      const gpuInfo = gl.getExtension("WEBGL_debug_renderer_info");
      const gpuName = gpuInfo ? String(gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL)) : "";
      let autoProfile = startingProfile(gpuName, navigator.hardwareConcurrency, (navigator as Navigator & {deviceMemory?:number}).deviceMemory);
      const terrainBudget = streamingBudget(gpuName,navigator.hardwareConcurrency,(navigator as Navigator & {deviceMemory?:number}).deviceMemory,mobileMars,props.initialQuality ?? "auto");
      const effectiveQuality = () => cameraSettings.current.quality === "auto" ? autoProfile : cameraSettings.current.quality;
      const profileLabel = () => autoProfile === "auto" ? "Balanced" : autoProfile === "high" ? "High" : "Performance";
      setAutoLabel(profileLabel());
      const initialPreset = graphicsTier(effectiveQuality());
      renderer.setPixelRatio(Math.min(displayRatio, props.planet === "mars" ? initialPreset.resolutionCap : 1.7));
      renderer.shadowMap.enabled = props.planet !== "mars" || initialPreset.shadows;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = props.planet === "mars" ? 1.1 : 1.15;
      renderer.info.autoReset = false;
      renderer.domElement.setAttribute("aria-hidden", "true");
      element.insertBefore(renderer.domElement, element.firstChild);
      const scene = new T.Scene();
      // Start model and texture downloads together, before terrain construction.
      const bigRover = props.planet === "mars" ? createBigRover() : null;
      const curiosityRover = props.planet === "mars" ? createCuriosityRover() : null;
      const marsAstronaut = props.planet === "mars" ? createRiggedAstronaut(assetUrl("/models/astronaut.glb")) : null;
      const surfacePromise = props.planet === "mars" ? Promise.all([
        loadMarsSurfaceTextures(),
        props.freeRoam ? Promise.resolve(undefined) : new T.TextureLoader().loadAsync(assetUrl("/art/mars-ivory-panel-original.webp")).catch(() => undefined),
      ]) : Promise.resolve([undefined,undefined] as const);
      if (bigRover) scene.add(bigRover.root, bigRover.dust);
      if (curiosityRover) scene.add(curiosityRover.root);
      // Covers leaving the mission while imports/downloads are still pending.
      dispose = () => {
        bigRover?.dispose(); curiosityRover?.dispose(); marsAstronaut?.dispose();
        void surfacePromise.then(([surface,panel]) => { disposeMarsSurfaceTextures(surface); panel?.dispose(); });
        renderer.dispose(); renderer.domElement.remove(); environment?.dispose();
      };
      let environment: import("three").WebGLRenderTarget | null = null;
      if (props.planet === "mars") {
        environment = createMarsEnvironment(renderer);
        scene.environment = environment.texture; scene.environmentIntensity = .85;
      }
      scene.background = new T.Color(props.planet === "mars" ? 0xe3b6a1 : 0x090e18);
      scene.fog = new T.FogExp2(props.planet === "mars" ? 0xb3866b : 0x333b48, props.planet === "mars" ? 0.0022 : 0.0024);
      const camera = new T.PerspectiveCamera(props.planet === "mars" ? 58 : 72, 1, 0.08, props.planet === "mars" ? 1100 : 500);
      camera.rotation.order = "YXZ";
      const light = new T.DirectionalLight(0xffe5c7, 3.5);
      light.position.set(-55, props.planet === "mars" ? 28 : 60, -80);
      light.castShadow = true;
      const shadowSize = props.planet === "mars" ? graphicsTier(effectiveQuality()).shadowSize : 2048;
      light.shadow.mapSize.set(shadowSize, shadowSize);
      Object.assign(light.shadow.camera, {
        left: props.planet === "mars" ? -34 : -55,
        right: props.planet === "mars" ? 34 : 55,
        top: props.planet === "mars" ? 34 : 55,
        bottom: props.planet === "mars" ? -34 : -55,
        near: 1,
        far: 220,
      });
      light.shadow.bias = -0.00015;
      light.shadow.normalBias = props.planet === "mars" ? 0.022 : 0.035;
      scene.add(light);
      if (props.planet === "mars") scene.add(light.target);
      const ambient = new T.HemisphereLight(0xbccfe1, 0x55504c, 1.65);
      scene.add(ambient);
      const [regolithSurface,panelSurface] = await surfacePromise;
      if (cancelled) {bigRover?.dispose();curiosityRover?.dispose();marsAstronaut?.dispose();disposeMarsSurfaceTextures(regolithSurface);panelSurface?.dispose();renderer.dispose();renderer.domElement.remove();environment?.dispose();return;}
      const model = createSurvivalOutpost(scene, props.planet, regolithSurface, panelSurface, props.freeRoam);
      let streaming: ReturnType<typeof createStreamedMars> | null = null;
      const streamOptions = {worldLimit:STREAM_LIMIT};
      const baseHeight = model.heightAt;
      const baseRoverHeight = model.roverHeightAt;
      // Stable callbacks also keep footprints and suspension aligned after streaming activates.
      model.heightAt = (x,z) => streaming ? streaming.heightAt(x,z) : baseHeight(x,z);
      model.roverHeightAt = (x,z) => streaming && (Math.abs(x)>210 || Math.abs(z)>210) ? streaming.roverHeightAt(x,z) : baseRoverHeight(x,z);
      const smallRocks = props.planet === "mars" ? model.root.getObjectByName("mars-small-rocks") as import("three").InstancedMesh | undefined : undefined;
      // Mars systems: Subterranean Ice Cave biome, Weather Terminal podium, Drop-Pod Intro
      const caveBiome = props.planet === "mars" && !props.freeRoam ? createCaveBiomeScene(model.heightAt) : null;
      if (caveBiome) {
        scene.add(caveBiome.surfacePortals, caveBiome.root);
      }
      const dropPodIntro = props.planet === "mars" ? (props.freeRoam ? createShuttleLanding(model.heightAt,window.matchMedia("(prefers-reduced-motion: reduce)").matches) : createDropPodIntro()) : null;
      if(props.freeRoam) model.obstacles.push(boxObstacle(0,12,4.5,3.5,"arrival-shuttle"));
      if (dropPodIntro) {
        scene.add(dropPodIntro.root);
        if (current.current.playDropPodIntro) {
          dropPodIntro.start();
        }
      }
      // Helmet SpotLight for subterranean Ice Caves and extreme night shadows
      const helmetLamp = props.planet === "mars" ? new T.SpotLight(0xdbeafe, 0, 32, 0.58, 0.55, 1.3) : null;
      const helmetTarget = helmetLamp ? new T.Object3D() : null;
      if (helmetLamp && helmetTarget) {
        helmetLamp.castShadow = initialPreset.shadows;
        helmetLamp.shadow.mapSize.set(512, 512);
        helmetLamp.shadow.bias = -0.0006;
        helmetLamp.target = helmetTarget;
        scene.add(helmetLamp, helmetTarget);
      }
      // Outpost Alpha Habitat Weather Terminal console outside airlock stairs
      const WEATHER_TERM_POS = { x: -5.4, z: -18.5 };
      if (props.planet === "mars" && !props.freeRoam) {
        const wtGroup = new T.Group();
        const wy = model.heightAt(WEATHER_TERM_POS.x, WEATHER_TERM_POS.z);
        wtGroup.position.set(WEATHER_TERM_POS.x, wy, WEATHER_TERM_POS.z);
        wtGroup.userData.station = "weather-terminal";
        const wtPost = new T.Mesh(
          new T.BoxGeometry(0.62, 1.45, 0.42),
          new T.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.35 }),
        );
        wtPost.position.y = 0.72;
        wtPost.castShadow = true;
        const wtScreen = new T.Mesh(
          new T.BoxGeometry(0.54, 0.38, 0.04),
          new T.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.3 }),
        );
        wtScreen.position.set(0, 1.24, 0.21);
        wtScreen.rotation.x = -0.22;
        wtGroup.add(wtPost, wtScreen);
        model.root.add(wtGroup);
        model.targets.push(wtGroup);
        model.obstacles.push(boxObstacle(WEATHER_TERM_POS.x, WEATHER_TERM_POS.z, 0.45, 0.35));
      }
      setLoadingStage("Preparing explorers and equipment…");
      setLoadingProgress(70);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      const beacon = props.planet === "mars" && !props.freeRoam ? new T.Group() : null;
      if (beacon) {
        const beam = new T.Mesh(new T.CylinderGeometry(.12, .4, 8, 16, 1, true), new T.MeshBasicMaterial({color:0x8ef7e1, transparent:true, opacity:.3, depthWrite:false, side:T.DoubleSide}));
        beam.position.y = 4; beacon.add(beam);
        const marker = new T.Mesh(new T.OctahedronGeometry(.5), new T.MeshBasicMaterial({color:0xb0fff1})); marker.position.y=8; beacon.add(marker);
        scene.add(beacon);
      }
      const footprints = props.planet === "mars" ? createMarsFootprints(scene,model.heightAt) : null;
      const sage = props.planet === "mars" && !props.freeRoam ? createSageCompanion() : null;
      const sageShadow = sage ? createSoftContactShadow({ width: 1.05, depth: 1.05, y: 0.024, opacity: 0.44 }) : null;
      if (sage) {
        const dock = createSageDock(panelSurface); scene.add(dock);
        sage.scale.setScalar(.78);
        sage.userData.groundOffset=-new T.Box3().setFromObject(sage).min.y;
        sage.position.set(SAGE_DOCK.x, model.heightAt(SAGE_DOCK.x,SAGE_DOCK.z)+sage.userData.groundOffset, SAGE_DOCK.z); scene.add(sage);
        if (sageShadow) {
          sageShadow.mesh.position.set(SAGE_DOCK.x, model.heightAt(SAGE_DOCK.x, SAGE_DOCK.z) + 0.024, SAGE_DOCK.z);
          scene.add(sageShadow.mesh);
        }
        for (const x of [-1.65, 1.65]) model.obstacles.push(boxObstacle(SAGE_DOCK.x+x,SAGE_DOCK.z,.15,1.55));
        model.obstacles.push(boxObstacle(SAGE_DOCK.x,SAGE_DOCK.z-1.4,1.65,.1));
      }
      const marsSky = props.planet === "mars" ? createMarsSky(scene) : null;
      const skyMesh=scene.getObjectByName("mars-sky");
      const windDust = props.planet === "mars" ? createMarsWindDust() : null;
      const dust = windDust?.points ?? null;
      if (dust) scene.add(dust);
      const astronaut = new T.Group();
      const astronautShadow = props.planet === "mars" ? createSoftContactShadow({ width: 1.15, depth: 1.15, y: 0.024, opacity: 0.46 }) : null;
      if (astronautShadow) scene.add(astronautShadow.mesh);
      const suit = new T.MeshStandardMaterial({
        color: 0xe7e2d5,
        roughness: 0.7,
      });
      const visor = new T.MeshStandardMaterial({
        color: 0x263e50,
        metalness: 0.7,
        roughness: 0.25,
      });
      const part = (
        geometry: import("three").BufferGeometry,
        material: import("three").Material,
        x: number,
        y: number,
        z: number,
      ) => {
        const m = new T.Mesh(geometry, material);
        m.position.set(x, y, z);
        m.castShadow = true;
        astronaut.add(m);
        return m;
      };
      part(new T.CapsuleGeometry(0.34, 0.25, 6, 16), suit, 0, 1.12, 0).scale.z = 0.68;
      part(new T.BoxGeometry(0.62, 0.7, 0.22), suit, 0, 1.12, 0.28);
      const accent = new T.MeshStandardMaterial({
        color: 0xdb8a47,
        roughness: 0.6,
      });
      const trim = new T.MeshStandardMaterial({
        color: 0x566b72,
        roughness: 0.6,
      });
      part(new T.BoxGeometry(0.66, 0.08, 0.42), accent, 0, 1.36, 0.02);
      part(new T.BoxGeometry(0.48, 0.25, 0.04), trim, 0, 1.12, -0.21);
      part(new T.BoxGeometry(0.18, 0.06, 0.05), accent, -0.1, 1.16, -0.24);
      part(new T.BoxGeometry(0.15, 0.06, 0.05), visor, 0.12, 1.16, -0.24);
      part(new T.BoxGeometry(0.54, 0.1, 0.25), accent, 0, 1.43, 0.29);
      part(new T.BoxGeometry(0.08, 0.45, 0.08), trim, 0.23, 1.66, 0.31);
      part(new T.SphereGeometry(0.34, 20, 14), suit, 0, 1.78, 0);
      part(new T.SphereGeometry(0.27, 20, 14), visor, 0, 1.79, -0.16).scale.set(
        1,
        0.75,
        0.5,
      );
      const leftLeg = part(
          new T.CapsuleGeometry(0.125, 0.4, 6, 12),
          suit,
          -0.2,
          0.35,
          0,
        ),
        rightLeg = part(
          new T.CapsuleGeometry(0.125, 0.4, 6, 12),
          suit,
          0.2,
          0.35,
          0,
        );
      const leftArm = part(
          new T.CapsuleGeometry(0.11, 0.46, 6, 12),
          suit,
          -0.5,
          1.1,
          0,
        ),
        rightArm = part(new T.CapsuleGeometry(0.11, 0.46, 6, 12), suit, 0.5, 1.1, 0);
      part(new T.BoxGeometry(0.3, 0.12, 0.43), trim, -0.2, 0.08, -0.06);
      part(new T.BoxGeometry(0.3, 0.12, 0.43), trim, 0.2, 0.08, -0.06);
      part(new T.BoxGeometry(0.24, 0.1, 0.26), accent, -0.5, 1.23, 0);
      part(new T.BoxGeometry(0.24, 0.1, 0.26), accent, 0.5, 1.23, 0);
      scene.add(astronaut);
      if (marsAstronaut) { astronaut.clear(); astronaut.add(marsAstronaut.root); }
      const sun = new T.Mesh(
        new T.SphereGeometry(4, 24, 16),
        new T.MeshBasicMaterial({ color: props.planet === "mars" ? new T.Color(7, 5, 2.8) : 0xfff1ce, fog: false, toneMapped: props.planet === "mars" }),
      );
      sun.position.set(props.planet === "mars" ? -80 : -110, props.planet === "mars" ? 46 : 65, -160);
      if (props.planet === "mars") sun.position.copy(MARS_SUN_DIRECTION).multiplyScalar(185);
      scene.add(sun);
      const earth = new T.Mesh(
        new T.SphereGeometry(5, 28, 20),
        new T.MeshStandardMaterial({ color: 0x5b9fba, roughness: 1 }),
      );
      earth.position.set(65, 40, -170);
      if (props.planet === "mars") { earth.scale.setScalar(.16); (earth.material as import("three").MeshStandardMaterial).emissive.setHex(0x286c9a); }
      scene.add(earth);
      const stars = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) {
        const a = i * 2.399,
          r = 180 + (i % 19) * 4;
        stars[i * 3] = Math.sin(a) * r;
        stars[i * 3 + 1] = 25 + (i % 33) * 5;
        stars[i * 3 + 2] = Math.cos(a) * r;
      }
      const sg = new T.BufferGeometry();
      sg.setAttribute("position", new T.BufferAttribute(stars, 3));
      const starField = new T.Points(sg, new T.PointsMaterial({ size: 0.3, color: 0xdbe7ed }));
      scene.add(starField);
      let daylightElapsed=0;
      const daySky=new T.Color(0xe3b6a1),nightSky=new T.Color(0x111824),dayFog=new T.Color(0xb3866b),nightFog=new T.Color(0x232638);
      const dayAmbient=new T.Color(0xc5ccd5),nightAmbient=new T.Color(0x7f9dca),dayGround=new T.Color(0x77543e),nightGround=new T.Color(0x312a36);
      const dayLight=new T.Color(0xffe5c7),nightLight=new T.Color(0x9ab4dc),sunsetLight=new T.Color(0xf2b18a),sunDirection=MARS_SUN_DIRECTION.clone();
      if(props.freeRoam){sun.material.transparent=true;sun.material.depthWrite=false;earth.material.transparent=true;earth.material.depthWrite=false;starField.material.transparent=true;starField.material.depthWrite=false;}
      let composer: import("three/examples/jsm/postprocessing/EffectComposer.js").EffectComposer | null = null;
      let occlusion: import("three/examples/jsm/postprocessing/GTAOPass.js").GTAOPass | null = null;
      let bloom: import("three/examples/jsm/postprocessing/UnrealBloomPass.js").UnrealBloomPass | null = null;
      let fxaaPass: import("three/examples/jsm/postprocessing/ShaderPass.js").ShaderPass | null = null;
      let stormGodRays: import("three").Mesh | null = null;
      let effectsLoading: Promise<void> | null = null;
      let autoOcclusion = true;
      const desiredCamera = new T.Vector3();
      let orbitInitialized = false;
      let lastLidarScan = -Infinity;
      let lidar: LidarScan | undefined;
      function disposeEffects() {
        if (stormGodRays) { scene.remove(stormGodRays); stormGodRays.geometry?.dispose(); }
        stormGodRays = null;
        if (composer) { for (const pass of composer.passes) pass.dispose(); composer.dispose(); }
        composer = null; occlusion = null; bloom = null; fxaaPass = null;
      }
      function renderEffects() {
        if (!composer || (!occlusion?.enabled && !bloom?.enabled)) return false;
        try { composer.render(); return true; }
        catch {
          // Optional effects must not take the mission down on unsupported GPUs.
          scene.overrideMaterial = null; renderer.setRenderTarget(null);
          disposeEffects();
          return false;
        }
      }
      const prepareEffects = () => effectsLoading ??= (async () => {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { BoundedGTAOPass }, { ResolutionFXAAPass }] = await Promise.all([
          import("three/examples/jsm/postprocessing/EffectComposer.js"),
          import("three/examples/jsm/postprocessing/RenderPass.js"),
          import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
          import("three/examples/jsm/postprocessing/OutputPass.js"),
          import("./world/BoundedGTAOPass"),
          import("./world/ResolutionFXAAPass"),
        ]);
        if (cancelled) return;
        // HDR resolves with HalfFloatType
        const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 0 });
        composer = new EffectComposer(renderer, target);
        composer.addPass(new RenderPass(scene, camera));
        occlusion = new BoundedGTAOPass(scene, camera, 256, 256);
        occlusion.updateGtaoMaterial({ radius: .52, thickness: .55, distanceFallOff: 1.2, samples: 10 });
        occlusion.updatePdMaterial({ samples: 8, radius: 4, rings: 2 });
        occlusion.blendIntensity = .52; occlusion.enabled = false;
        composer.addPass(occlusion);
        bloom = new UnrealBloomPass(new T.Vector2(512, 512), .28, .55, .88);
        composer.addPass(bloom);
        // Detect edges after tone mapping, using display-space contrast.
        composer.addPass(new OutputPass());
        fxaaPass = new ResolutionFXAAPass();
        composer.addPass(fxaaPass);

        const rayGeom = new T.CylinderGeometry(1.2, 54.0, 110.0, 16, 1, true);
        rayGeom.rotateX(Math.PI / 2);
        const rayMat = new T.MeshBasicMaterial({ color: 0xffbb7a, transparent: true, opacity: 0.0, blending: T.AdditiveBlending, side: T.BackSide, depthWrite: false });
        stormGodRays = new T.Mesh(rayGeom, rayMat);
        stormGodRays.visible = false;
        scene.add(stormGodRays);
      })().catch(() => { disposeEffects(); });
      function configureEffects(render = false) {
        const preset = graphicsTier(effectiveQuality());
        if (occlusion) occlusion.enabled = preset.ssao && (cameraSettings.current.quality !== "auto" || autoOcclusion);
        if (bloom) bloom.enabled = preset.bloom && !reduced.matches;
        if (stormGodRays) {
          const stormActive = current.current.weather === "DUST_STORM";
          stormGodRays.visible = stormActive && effectiveQuality() !== "performance";
          if (stormGodRays.visible) {
            stormGodRays.position.copy(camera.position).addScaledVector(MARS_SUN_DIRECTION, 40);
            stormGodRays.quaternion.setFromUnitVectors(new T.Vector3(0, 0, -1), MARS_SUN_DIRECTION.clone().negate());
            (stormGodRays.material as import("three").MeshBasicMaterial).opacity = effectiveQuality() === "ultra" ? 0.075 : 0.038;
          }
        }
        if (render && effectiveQuality() !== "performance") renderEffects();
      }
      if (props.planet === "mars" && !mobileMars && effectiveQuality() !== "performance") await prepareEffects();
      const keys = controls.current,
        mouse = new T.Vector2(0, 0),
        ray = new T.Raycaster();
      const spawnAtArrival = () => props.planet === "mars" ? {...spawnWalker(), x:props.freeRoam ? 12 : -23, z:props.freeRoam ? 22 : 15} : spawnWalker();
      let walker = spawnAtArrival(),
        jump = { height: 0, velocity: 0 },
        rover = spawnRoverVehicle(17, 10, 0, model.roverHeightAt);
      let savedCuriosity = null;
      if (curiosityRover) {
        try {
          savedCuriosity = parseCuriositySave(window.localStorage.getItem(CURIOSITY_SAVE_KEY));
        } catch {
          savedCuriosity = null;
        }
      }
      const curiositySeed = (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
      const curiosityInitialObstacles = [
        ...model.obstacles,
        ...(bigRover ? [roverFootprint(rover.x, rover.z, rover.yaw)] : []),
        { x: walker.x, z: walker.z, radius: WALKER_RADIUS, id: "walker" },
      ];
      let curiosity: CuriosityRoverState | null = curiosityRover
          ? spawnCuriosityRover(curiosityInitialObstacles, model.roverHeightAt, {
              seed: curiositySeed,
              allowColonyTargets: !props.freeRoam,
              saved: savedCuriosity,
            })
          : null,
        lastRoverNear = false,
        wasCockpit = false,
        lastRoverSpeed = 0,
        cameraYaw = 0,
        characterYaw = 0,
        lastRoverGear: RoverGear = "N",
        lastRoverMud = false,
        lastRoverHandbrake = false,
        pitch = -0.04,
        dragging = false,
        lookPointer: number | null = null,
        px = 0,
        py = 0,
        frame = 0,
        last = 0,
        lastReport = 0,
        hover: string | null = null,
        range = Infinity,
        previousDay = -1,
        lastMarsNight: boolean | null = null,
        captureUnsupported = false,
        captureFailureCount = 0,
        lockInFlight = false,
        lastLockReleaseAt = 0,
        lastMouseMoveTime = 0,
        hoverPx: number | null = null,
        hoverPy: number | null = null,
        activeBiome: BiomeId = current.current.biome ?? "surface",
        lastEnvWeather: WeatherEventType | undefined = undefined,
        lastEnvBiome: BiomeId | undefined = undefined,
        lastNetSync = 0,
        lastDropUiUpdate = 0,
        nearCaveEntrance: CaveEntrance | null = null,
        nearCaveExit = false,
        nearMineral: MineableNode | null = null;
      const enterBiome = (targetBiome: BiomeId) => {
        if (props.planet !== "mars" || targetBiome === activeBiome) return;
        activeBiome = targetBiome;
        if (targetBiome === "cave") {
          const portal = nearestCaveEntrance(walker.x, walker.z).entrance;
          walker.x = portal.caveSpawnX;
          walker.z = portal.caveSpawnZ;
          walker.vx = 0;
          walker.vz = 0;
          jump = { height: 0, velocity: 0 };
          showTransientNotice("Descending into Jezero Sub-Surface Ice Cave.", "Descending into");
        } else {
          const ent = CAVE_ENTRANCES[0];
          walker.x = ent.surfaceX;
          walker.z = ent.surfaceZ + 4.8;
          walker.vx = 0;
          walker.vz = 0;
          jump = { height: 0, velocity: 0 };
          showTransientNotice("Ascended to Jezero Crater Surface.", "Ascended to");
        }
        current.current.onBiomeChange?.(activeBiome);
      };
      toggleBiomeAction.current = () => {
        if (!caveBiome) return;
        if (rover.driving) {
          showTransientNotice("Exit rover [F] before entering cavern shaft.", "Exit rover");
          return;
        }
        if (activeBiome === "surface") {
          const nearest = nearestCaveEntrance(walker.x, walker.z);
          if (nearest.distance <= 5.2) enterBiome("cave");
        } else if (Math.hypot(walker.x - CAVE_EXIT_PORTAL.x, walker.z - CAVE_EXIT_PORTAL.z) <= 5.2) {
          enterBiome("surface");
        }
      };
      skipIntroAction.current = () => {
        if (dropPodIntro?.isActive()) {
          dropPodIntro.skip();
          setIntroActive(false);
        }
      };
      toggleRoverAction.current = () => {
        if (!current.current.enabled || dropPodIntro?.isActive() || current.current.planet !== "mars" || activeBiome !== "surface") return;
        if (!rover.driving) {
          if (canEnterRover(walker, rover)) {
            rover = enterRover(rover);
            keys.clear();
            setRoverDriving(true);
            setRoverNear(false);
            cameraYaw = rover.yaw;
            characterYaw = rover.yaw;
            lastMouseMoveTime = performance.now();
          }
        } else {
          const exitObstacles = curiosity
            ? [...model.obstacles, curiosityFootprint(curiosity.x, curiosity.z, curiosity.yaw)]
            : model.obstacles;
          const { rover: nextRover, exitPosition } = exitRover(rover, exitObstacles, streaming ? STREAM_LIMIT : undefined);
          if (!exitPosition) { setMessage("There isn't room to exit here. Move the rover to an open area."); return; }
          rover = nextRover;
          walker.x = exitPosition.x;
          walker.z = exitPosition.z;
          walker.yaw = cameraYaw;
          cameraYaw = rover.yaw;
          characterYaw = rover.yaw;
          walker.vx = 0;
          walker.vz = 0;
          keys.clear();
          setRoverDriving(false);
        }
      };
      let lastQuality = "", lastSelection = cameraSettings.current.quality;
      let metricStart = 0, metricFrames = 0;
      let slowWindows = 0, fastWindows = 0;
      let lastMapReport=0;
      let mapRocks: {x:number;z:number;radius:number}[]=[];
      let lastAimCheck = 0, lastCanInspect = false, resolutionScale = Math.min(devicePixelRatio, 1.25), qualityStart = 0;
      let gaitPhase = 0, gaitBlend = 0, cameraGround = 0;
      const center = new T.Vector2(0, 0);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const resize = () => {
        camera.aspect = element.clientWidth / element.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(element.clientWidth, element.clientHeight);
        if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(element.clientWidth, element.clientHeight); }
      };
      const observer = new ResizeObserver(resize);
      observer.observe(element);
      resize();
      const inspect = () => {
        if (!current.current.enabled) return;
        if (rover.driving) return;
        if (props.planet === "mars") {
          if (activeBiome === "surface" && nearCaveEntrance) {
            enterBiome("cave");
            return;
          }
          if (activeBiome === "cave" && nearCaveExit) {
            enterBiome("surface");
            return;
          }
          if (activeBiome === "cave" && nearMineral && !nearMineral.collected) {
            current.current.onMineNode?.(nearMineral.id);
            return;
          }
          if (activeBiome === "surface" && hover === "weather-terminal" && range <= 5.5) {
            current.current.onOpenWeatherTerminal?.();
            return;
          }
        }
        if (hover && range <= 5.5)
          current.current.onInspect(hover);
      };
      inspectAction.current = inspect;
      let discardCapturedMove = false,
        wasCaptured = document.pointerLockElement === element,
        releaseMsgTimer: number | null = null;
      const UI_CONTROL_SELECTOR =
        "button, input, select, summary, details, a, dialog, [role='dialog'], .flight-pad, .sv-touch-stick, .sv-touch-actions, .sv-rover-touch-pedals, .sv-rover-touch-controls, .sv-look-controls, .sv-rover-hud, .sv-rover-prompt, .junior-hud, .junior-panel, .junior-top-bar, .mars-target, .sv-hud, .sv-status, .sv-target";
      const isUiControlTarget = (el: HTMLElement | null) =>
        Boolean(el?.closest?.(UI_CONTROL_SELECTOR));
      const isSceneTarget = (el: HTMLElement | null) =>
        el !== null && !isUiControlTarget(el) && (el === renderer.domElement || element.contains(el));
      const resetHover = () => {
        hoverPx = null;
        hoverPy = null;
      };
      const clearNoticeTimer = () => {
        if (releaseMsgTimer !== null) {
          window.clearTimeout(releaseMsgTimer);
          releaseMsgTimer = null;
        }
      };
      const showTransientNotice = (text: string, prefix: string, ms = 2600) => {
        clearNoticeTimer();
        setMessage(text);
        releaseMsgTimer = window.setTimeout(() => {
          setMessage((prev) => (prev.startsWith(prefix) ? "" : prev));
          releaseMsgTimer = null;
        }, ms);
      };
      const setCursorMode = (free: boolean, notify = false) => {
        cursorReleased.current = free;
        setCursorFree(free);
        clearNoticeTimer();
        if (free) {
          resetHover();
          // Exiting via Esc or releasing cursor resets prior capture blocks so the next scene click retries.
          captureFailureCount = 0;
          if (notify) {
            showTransientNotice(
              "Cursor free for UI — click the 3D view to resume mouse look.",
              "Cursor free for UI",
            );
          }
        } else {
          setMessage((prev) =>
            prev.startsWith("Cursor free for UI") || prev.startsWith("Click the 3D view once more")
              ? ""
              : prev,
          );
        }
      };
      const requestLockCapture = (options?: { silent?: boolean; forceRetry?: boolean }) => {
        element.focus({ preventScroll: true });
        if (document.pointerLockElement === element || captureUnsupported) return;
        if (options?.forceRetry) captureFailureCount = 0;
        if (lockInFlight) return;
        if (!element.requestPointerLock) {
          captureUnsupported = true;
          if (!options?.silent) {
            showTransientNotice("Drag the view to look around. WASD still works.", "Drag the view");
          }
          return;
        }
        lockInFlight = true;
        const onLockRejected = (err?: unknown) => {
          lockInFlight = false;
          const errName = err instanceof DOMException ? err.name : "";
          if (errName === "NotSupportedError") {
            captureUnsupported = true;
            if (!options?.silent) {
              showTransientNotice("Drag the view to look around. WASD still works.", "Drag the view");
            }
            return;
          }
          const duringCooldown = lastLockReleaseAt > 0 && performance.now() - lastLockReleaseAt < 1550;
          if (duringCooldown) {
            // Browsers enforce a ~1.3s cooldown after Esc releases Pointer Lock; keep look active and invite one more click.
            if (!options?.silent) {
              showTransientNotice(
                "Click the 3D view once more to lock the cursor — mouse look active.",
                "Click the 3D view once more",
              );
            }
            return;
          }
          captureFailureCount += 1;
          if (!options?.silent && captureFailureCount === 1) {
            showTransientNotice(
              "Mouse capture is unavailable here. Drag to look; WASD walks.",
              "Mouse capture is unavailable",
            );
          }
        };
        try {
          const request = element.requestPointerLock();
          if (request && typeof request.then === "function") {
            void request.then(
              () => { lockInFlight = false; },
              (err) => { onLockRejected(err); },
            );
          } else {
            lockInFlight = false;
          }
        } catch (err) {
          onLockRejected(err);
        }
      };
      const down = (e: PointerEvent) => {
        const targetEl = e.target as HTMLElement | null;
        if (isUiControlTarget(targetEl)) {
          return;
        }
        const rect = element.getBoundingClientRect();
        mouse.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        element.focus({ preventScroll: true });
        if (!current.current.enabled) return;
        const onScene = isSceneTarget(targetEl);
        const resuming = cursorReleased.current;
        if (e.pointerType === "mouse" && onScene) {
          setCursorMode(false);
        }
        if (dragging) return;
        dragging = true;
        lookPointer = e.pointerId;
        px = e.clientX;
        py = e.clientY;
        if (
          e.pointerType === "mouse" &&
          !cameraSettings.current.touchControlsActive &&
          onScene &&
          document.pointerLockElement !== element
        ) {
          requestLockCapture({ forceRetry: resuming });
        }
      };
      const sceneClick = (e: MouseEvent) => {
        if (!current.current.enabled || cameraSettings.current.touchControlsActive) return;
        // Ignore synthetic Enter/Space clicks while still handling real pointer clicks after Esc or cooldown.
        if (e.detail === 0) return;
        const targetEl = e.target as HTMLElement | null;
        if (!isSceneTarget(targetEl)) return;
        const resuming = cursorReleased.current;
        setCursorMode(false);
        if (document.pointerLockElement !== element) {
          requestLockCapture({ forceRetry: resuming, silent: true });
        }
      };
      const move = (e: PointerEvent) => {
        const targetEl = e.target as HTMLElement | null;
        if (targetEl?.closest?.(".sv-target")) {
          resetHover();
          return;
        }
        if (dragging || document.pointerLockElement === element) {
          lastMouseMoveTime = performance.now();
        }
        const rect = element.getBoundingClientRect();
        mouse.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        if (!current.current.enabled || dropPodIntro?.isActive()) {
          resetHover();
          return;
        }
        const isThird = cameraSettings.current.thirdPerson;
        const minPitch = isThird ? -1.1 : -1.35;
        const maxPitch = isThird ? 0.85 : 1.35;
        if (document.pointerLockElement === element) {
          resetHover();
          if (discardCapturedMove) { discardCapturedMove = false; return; }
          cameraYaw -=
            safeLookDelta(e.movementX) * 0.0023 * cameraSettings.current.sensitivity;
          pitch = Math.max(
            minPitch,
            Math.min(
              maxPitch,
              pitch - safeLookDelta(e.movementY) * 0.0023 * cameraSettings.current.sensitivity,
            ),
          );
        } else if (
          current.current.enabled &&
          dragging && e.pointerId === lookPointer
        ) {
          cameraYaw -=
            safeLookDelta(e.clientX - px) * 0.0023 * cameraSettings.current.sensitivity;
          pitch = Math.max(
            minPitch,
            Math.min(
              maxPitch,
              pitch - safeLookDelta(e.clientY - py) * 0.0023 * cameraSettings.current.sensitivity,
            ),
          );
          px = e.clientX;
          py = e.clientY;
          hoverPx = e.clientX;
          hoverPy = e.clientY;
        } else if (!props.freeRoam && e.pointerType === "mouse" && !cameraSettings.current.touchControlsActive && !cursorReleased.current) {
          const overScene = isSceneTarget(targetEl);
          if (!overScene) {
            resetHover();
          } else if (hoverPx === null || hoverPy === null) {
            hoverPx = e.clientX;
            hoverPy = e.clientY;
          } else {
            const dx = Math.max(-120, Math.min(120, e.clientX - hoverPx));
            const dy = Math.max(-120, Math.min(120, e.clientY - hoverPy));
            hoverPx = e.clientX;
            hoverPy = e.clientY;
            if (dx !== 0 || dy !== 0) {
              lastMouseMoveTime = performance.now();
              cameraYaw -= dx * 0.0023 * cameraSettings.current.sensitivity;
              pitch = Math.max(
                minPitch,
                Math.min(
                  maxPitch,
                  pitch - dy * 0.0023 * cameraSettings.current.sensitivity,
                ),
              );
            }
          }
        } else if (e.pointerType === "mouse") {
          resetHover();
        }
      };
      const up = (e: PointerEvent) => {
        if (e.pointerId === lookPointer) { dragging = false; lookPointer = null; }
      };
      const keydown = (e: KeyboardEvent) => {
        if (!current.current.enabled) return;
        const active = document.activeElement as HTMLElement | null;
        const tag = active?.tagName;
        if (active?.closest?.("dialog, [role='dialog']")) return;
        if (e.key === "Escape" && !e.repeat) {
          e.preventDefault();
          if (document.pointerLockElement === element) {
            document.exitPointerLock();
          } else {
            setCursorMode(true, true);
          }
          keys.clear();
          return;
        }
        if (tag === "TEXTAREA" || tag === "SELECT" || active?.isContentEditable) return;
        if (
          tag === "INPUT" &&
          !["range", "checkbox", "radio", "button"].includes(
            (active as HTMLInputElement).type,
          )
        )
          return;
        const onInteractive = tag === "BUTTON" || tag === "SUMMARY" || tag === "A";
        const k = e.key.toLowerCase();
        if(dropPodIntro?.isActive()){
          if(e.code==="Space"&&!onInteractive){e.preventDefault();skipIntroAction.current();}
          return;
        }
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
          ].includes(k)
        ) {
          e.preventDefault();
          keys.add(k);
        }
        if (k === "e" || (k === "enter" && !onInteractive)) {
          e.preventDefault();
          inspect();
        }
        if (k === "q") keys.add("look-left");
        if (k === "shift") keys.add("shift");
        if (k === "r") keys.add("look-right");
        if (k === "v" && !e.repeat) {
          e.preventDefault();
          setThirdPerson((v) => !v);
        }
        if ((k === "b" || k === "g") && !e.repeat && current.current.planet === "mars") {
          e.preventDefault();
          current.current.onToggleSage?.();
        }
        if (k === "f" && !e.repeat && current.current.planet === "mars") {
          e.preventDefault();
          toggleRoverAction.current();
        }
        if (e.code === "Space" && !e.repeat && !onInteractive) {
          e.preventDefault();
          if (dropPodIntro?.isActive()) {
            skipIntroAction.current();
            return;
          }
          keys.add("jump");
          keys.add("handbrake");
        }
      };
      const keyup = (e: KeyboardEvent) => {
        keys.delete(e.key.toLowerCase());
        if (e.code === "Space") {
          keys.delete("jump");
          keys.delete("handbrake");
        }
        if (e.key.toLowerCase() === "q") keys.delete("look-left");
        if (e.key.toLowerCase() === "r") keys.delete("look-right");
      };
      const blur = () => {
        lockInFlight = false;
        keys.clear();
        dragging = false;
        lookPointer = null;
        resetHover();
      };
      const lockChange = () => {
        lockInFlight = false;
        dragging = false;
        lookPointer = null;
        resetHover();
        const captured = document.pointerLockElement === element;
        const releasedFromLock = wasCaptured && !captured;
        wasCaptured = captured;
        discardCapturedMove = captured;
        setLocked(captured);
        if (captured) {
          captureFailureCount = 0;
          setCursorMode(false);
          setMessage("");
        } else if (releasedFromLock) {
          lastLockReleaseAt = performance.now();
          if (current.current.enabled) setCursorMode(true, true);
        }
        keys.clear();
      };
      const lockError = () => {
        lockInFlight = false;
      };
      lockAction.current = () => {
        element.focus({ preventScroll: true });
        if (document.pointerLockElement === element) {
          lastLockReleaseAt = performance.now();
          setCursorMode(true, true);
          document.exitPointerLock();
          return;
        }
        setCursorMode(false);
        requestLockCapture({ forceRetry: true });
      };
      const lost = (e: Event) => {
        e.preventDefault();
        current.current.onUnavailable();
      };
      let lastCuriositySave = 0;
      const saveCuriosityNow = () => {
        if (!curiosity || current.current.planet !== "mars") return;
        try {
          window.localStorage.setItem(
            CURIOSITY_SAVE_KEY,
            JSON.stringify(exportCuriositySave(curiosity)),
          );
        } catch {
          // Ignore storage quota or private browsing errors.
        }
      };
      const saveOnHide = () => {
        if (document.hidden) saveCuriosityNow();
      };
      element.addEventListener("pointerdown", down);
      element.addEventListener("click", sceneClick);
      element.addEventListener("pointerleave", resetHover);
      document.addEventListener("mouseleave", resetHover);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      window.addEventListener("keydown", keydown);
      window.addEventListener("keyup", keyup);
      window.addEventListener("blur", blur);
      element.addEventListener("blur", blur);
      document.addEventListener("pointerlockchange", lockChange);
      document.addEventListener("pointerlockerror", lockError);
      window.addEventListener("pagehide", saveCuriosityNow);
      window.addEventListener("beforeunload", saveCuriosityNow);
      document.addEventListener("visibilitychange", saveOnHide);
      renderer.domElement.addEventListener("webglcontextlost", lost);
      function animate(time: number) {
        const frameStarted = performance.now();
        frame = requestAnimationFrame(animate);
        if (document.hidden) {
          last = time;
          keys.clear();
          return;
        }
        // A stationary view behind a dialog needs only occasional refreshes.
        if (props.planet==="mars" && !current.current.enabled && time-last<100) return;
        const dt = last ? Math.min((time - last) / 1000, 0.1) : 1 / 60;
        last = time;
        const p = current.current;
        if(streaming){
          streaming.update(walker.x,walker.z,lastQuality==="performance" ? .7 : terrainBudget.generationMs);
          skyMesh?.position.set(walker.x,0,walker.z);
          starField.position.set(walker.x,0,walker.z);
        }
        const cameraChanged = (rover.driving && !cameraSettings.current.thirdPerson) !== wasCockpit;
        const programsBefore = renderer.info.programs?.length ?? 0;
        if (beacon && beacon.userData.target !== p.target) { beacon.userData.target=p.target; const destination = STATIONS.find(s => s.id === p.target); if (destination) beacon.position.set(destination.x, model.heightAt(destination.x,destination.z),destination.z); }
        if (effectiveQuality() !== lastQuality || lastSelection !== cameraSettings.current.quality) {
          lastSelection = cameraSettings.current.quality;
          lastQuality = effectiveQuality();
          const tier = graphicsTier(lastQuality);
          model.setLightSurfaces?.(lastQuality==="performance");
          resolutionScale = Math.min(displayRatio, props.planet === "mars" ? tier.resolutionCap : 1.5);
          renderer.setPixelRatio(resolutionScale);
          renderer.shadowMap.enabled = props.planet === "mars" ? tier.shadows : true;
          autoOcclusion = true;
          if (props.planet === "mars" && light.shadow.mapSize.x !== tier.shadowSize) {
            light.shadow.mapSize.set(tier.shadowSize, tier.shadowSize);
            light.shadow.map?.dispose(); light.shadow.map = null;
          }
          if (bigRover) {
            bigRover.headlightL.castShadow = tier.shadows && lastMarsNight === true;
            bigRover.headlightR.castShadow = false;
          }
          if (occlusion) occlusion.enabled = tier.ssao;
          if (bloom) bloom.enabled = tier.bloom && !reduced.matches;
          if (smallRocks) smallRocks.count = tier.smallRocks;
          if (dust) dust.geometry.setDrawRange(0, tier.particles);
          if (props.planet === "mars" && !mobileMars && lastQuality !== "performance" && !composer) {
            void prepareEffects().then(() => { if (!cancelled) {
              if (occlusion) occlusion.enabled = graphicsTier(effectiveQuality()).ssao;
              if (bloom) bloom.enabled = graphicsTier(effectiveQuality()).bloom && !reduced.matches;
              resize();
            } });
          }
          resize();
          qualityStart = time;
        }
        const activeHeightAt = activeBiome === "cave" ? caveHeightAt : model.heightAt;
        const activeTier = graphicsTier(lastQuality);
        const dropRunning = Boolean(dropPodIntro?.isActive() && activeBiome === "surface" && p.enabled);

        if (p.enabled && !dropRunning) {
          // Small physics steps keep acceleration and jumping consistent across slower frames.
          const steps = Math.max(1, Math.ceil(dt / (1 / 120))), step = dt / steps;
          if (activeBiome === "surface") {
            const sevObstacles = curiosity
              ? [...model.obstacles, curiosityFootprint(curiosity.x, curiosity.z, curiosity.yaw)]
              : model.obstacles;
            if (rover.driving) {
              const prevRoverYaw = rover.yaw;
              for (let i = 0; i < steps; i++) {
                rover = stepRoverVehicle(
                  rover,
                  keys,
                  step,
                  sevObstacles,
                  model.roverHeightAt,
                  model.mudAt,
                  analogDrive.current,
                  streaming ? streamOptions : undefined,
                );
              }
              walker.x = rover.x;
              walker.z = rover.z;
              walker.yaw = rover.yaw;
              const yawDelta = rover.yaw - prevRoverYaw;
              cameraYaw += yawDelta;
              characterYaw = rover.yaw;

              const isCruising = Math.abs(rover.speed) > 1.2;
              const timeSinceMouse = (performance.now() - lastMouseMoveTime) / 1000;
              if (isCruising && !dragging && timeSinceMouse > 0.8 && document.pointerLockElement !== element) {
                const targetYaw = rover.speed < 0 && cameraSettings.current.thirdPerson
                  ? rover.yaw + Math.PI : rover.yaw;
                const diff = shortestAngleDiff(cameraYaw, targetYaw);
                cameraYaw += diff * (1 - Math.exp(-2.2 * dt));
              }
            } else {
              if (bigRover && Math.abs(rover.speed) > 0.01) {
                rover = stepRoverVehicle(
                  rover,
                  keys,
                  dt,
                  sevObstacles,
                  model.roverHeightAt,
                  model.mudAt,
                  undefined, streaming ? streamOptions : undefined,
                );
              }
              const dynamicObstacles = [
                ...model.obstacles.filter(o=>Math.abs(walker.x-o.x)<o.radius+3 && Math.abs(walker.z-o.z)<o.radius+3),
                ...(bigRover ? [roverFootprint(rover.x, rover.z, rover.yaw)] : []),
                ...(curiosity ? [curiosityFootprint(curiosity.x, curiosity.z, curiosity.yaw)] : []),
              ];
              walker.yaw = cameraYaw;
              for (let i = 0; i < steps; i++) {
                if (props.planet === "mars") {
                  const next = stepMarsLocomotion(walker, jump, keys, step, model.heightAt, dynamicObstacles, analogWalk.current, streaming ? STREAM_LIMIT : undefined);
                  walker = next.walker;
                  jump = next.jump;
                  keys.delete("jump");
                } else {
                  walker = stepWalker(walker, keys, step, dynamicObstacles, undefined, true, analogWalk.current);
                  jump = stepJump(jump, i === 0 && keys.has("jump"), step);
                }
              }
              keys.delete("jump");
            }
          } else {
            // Subterranean Ice Cave biome locomotion & boundary clamping
            const caveObs = [...CAVE_PILLARS];
            walker.yaw = cameraYaw;
            for (let i = 0; i < steps; i++) {
              const next = stepMarsLocomotion(walker, jump, keys, step, caveHeightAt, caveObs, analogWalk.current);
              walker = next.walker;
              jump = next.jump;
              keys.delete("jump");
              const rad = Math.hypot(walker.x, walker.z);
              if (rad > CAVE_BOUNDARY_RADIUS - 1.5) {
                const scale = (CAVE_BOUNDARY_RADIUS - 1.5) / rad;
                walker.x *= scale;
                walker.z *= scale;
              }
            }
            keys.delete("jump");
          }
          if (curiosity && activeBiome === "surface") {
            const curiosityObstacles = [
              ...model.obstacles,
              ...(bigRover ? [roverFootprint(rover.x, rover.z, rover.yaw)] : []),
              { x: walker.x, z: walker.z, radius: WALKER_RADIUS, id: "walker" },
            ];
            curiosity = stepCuriosityRover(curiosity, dt, curiosityObstacles, model.roverHeightAt);
          }
          if (keys.has("look-left")) {
            cameraYaw += dt * 1.3;
            lastMouseMoveTime = performance.now();
          }
          if (keys.has("look-right")) {
            cameraYaw -= dt * 1.3;
            lastMouseMoveTime = performance.now();
          }
        }
        if (rover.driving && activeBiome === "surface" && time - lastLidarScan >= 125) {
          const lidarObstacles = curiosity
            ? [...model.obstacles, curiosityFootprint(curiosity.x, curiosity.z, curiosity.yaw)]
            : model.obstacles;
          lidar = scanRoverLidar(rover, lidarObstacles);
          lastLidarScan = time;
        }
        if(props.freeRoam && p.enabled && !dropRunning) daylightElapsed+=dt;
        const nightBlend=props.freeRoam ? nightAmount(daylightElapsed) : 0;
        const eclipse = p.event === "eclipse" || p.event === "night" || p.weather === "CRYO_FREEZE";
        const storm = p.weather === "DUST_STORM";
        const flare = p.weather === "SOLAR_FLARE";
        const inCave = activeBiome === "cave";
        if (props.planet === "mars") {
          model.root.visible = !inCave;
          if (bigRover) {
            bigRover.root.visible = !inCave;
            bigRover.dust.visible = !inCave;
          }
          if (curiosityRover) curiosityRover.root.visible = !inCave;
          if (beacon) beacon.visible = !inCave;
          if (sage) sage.visible = !inCave;
          if (sageShadow) sageShadow.mesh.visible = !inCave;
          if (dust) dust.visible = !inCave;
        }
        if (bigRover && !inCave) {
          const roverGround = rover.chassisY ?? model.heightAt(rover.x, rover.z);
          bigRover.update(
            rover,
            roverGround,
            dt,
            eclipse || storm,
            model.heightAt,
            lidar,
            activeTier.shadows,
          );
          if (rover.driving || Math.abs(rover.speed) > 0.1) {
            model.stampRoverTracks?.(renderer, rover);
          }
        }
        if (curiosityRover && curiosity && !inCave) {
          curiosityRover.update(
            curiosity,
            dt,
            eclipse,
            reduced.matches,
            activeTier.shadows,
          );
          if (Math.abs(curiosity.speed) > 0.05) {
            model.stampCuriosityTracks?.(renderer, curiosity);
          }
        }
        if (props.planet === "mars") {
          const timeSec = time * 0.001;
          caveBiome?.update(timeSec, p.minerals ?? [], inCave);

          // Proximity to cave portals or mineable ore veins
          if (!inCave) {
            const cNear = nearestCaveEntrance(walker.x, walker.z);
            nearCaveEntrance = caveBiome && cNear.distance <= 4.4 ? cNear.entrance : null;
            nearCaveExit = false;
            nearMineral = null;
          } else {
            nearCaveEntrance = null;
            nearCaveExit = Math.hypot(walker.x - CAVE_EXIT_PORTAL.x, walker.z - CAVE_EXIT_PORTAL.z) <= 4.2;
            nearMineral = null;
            let bestMinDist = 3.8;
            for (const m of p.minerals ?? []) {
              if (m.collected) continue;
              const md = Math.hypot(walker.x - m.x, walker.z - m.z);
              if (md < bestMinDist) {
                bestMinDist = md;
                nearMineral = m;
              }
            }
          }
        }
        if (props.planet === "mars") {
          const nearNow = !rover.driving && canEnterRover(walker, rover);
          if (nearNow !== lastRoverNear) {
            lastRoverNear = nearNow;
            setRoverNear(nearNow);
          }
          if (rover.driving) {
            const spd = Math.round(Math.abs(rover.speed) * 3.6);
            if (spd !== lastRoverSpeed) {
              lastRoverSpeed = spd;
              setRoverSpeed(spd);
            }
            const gearNow = getRoverGear(rover.speed);
            if (gearNow !== lastRoverGear) {
              lastRoverGear = gearNow;
              setRoverGear(gearNow);
            }
            const mudNow = rover.mudDepth > 0.32;
            if (mudNow !== lastRoverMud) {
              lastRoverMud = mudNow;
              setRoverMud(mudNow);
            }
            if (rover.handbrake !== lastRoverHandbrake) {
              lastRoverHandbrake = rover.handbrake;
              setRoverHandbrake(rover.handbrake);
            }
          }
        }
        const third = cameraSettings.current.thirdPerson;
        const cockpitView = rover.driving && !third;
        if (cockpitView && !wasCockpit) {
          cameraYaw = rover.yaw;
          pitch = -.14;
        }
        wasCockpit = cockpitView;
        bigRover?.setCockpitView(cockpitView);
        if (astronautShadow) astronautShadow.mesh.visible = !rover.driving && third;
        if (dropPodIntro?.isActive() && activeBiome === "surface") {
          astronaut.visible = true;
          const groundHeight = model.heightAt(walker.x, walker.z);
          astronaut.position.set(walker.x, groundHeight, walker.z);
          const podState = dropPodIntro.update(p.enabled ? dt : 0, camera, {
            x: walker.x,
            y: groundHeight,
            z: walker.z,
          });
          if (time - lastDropUiUpdate > 80) {
            lastDropUiUpdate = time;
            setIntroTelemetry({ alt: podState.altitudeMeters, speed: podState.speedMs });
          }
          if (!podState.active) {
            cameraYaw=0;pitch=-.04;cameraGround=groundHeight;keys.clear();
            setIntroActive(false);
          }
        } else if (rover.driving && !inCave) {
          orbitInitialized = false;
          astronaut.visible = false;
          const roverGround = rover.chassisY ?? model.heightAt(rover.x, rover.z);
          cameraGround += (roverGround - cameraGround) * (1 - Math.exp(-14 * dt));
          if (third) {
            // GTA-style vehicle chase camera orbiting around vehicle center with full mouse look
            const vehicleBack = 7.4;
            const roverTargetY = cameraGround + 1.95;
            const horizBack = Math.cos(pitch) * vehicleBack;
            const vertBack = -Math.sin(pitch) * vehicleBack;
            camera.position.set(
              rover.x + Math.sin(cameraYaw) * horizBack,
              roverTargetY + vertBack,
              rover.z + Math.cos(cameraYaw) * horizBack,
            );
            const groundUnderCam = model.heightAt(camera.position.x, camera.position.z);
            camera.position.y = Math.max(camera.position.y, groundUnderCam + 0.6);
            camera.rotation.set(pitch, cameraYaw, 0, "YXZ");
          } else {
            bigRover?.positionCockpitCamera(camera, cameraYaw - rover.yaw, pitch);
          }
        } else {
          astronaut.visible = third;
          const groundHeight = activeHeightAt(walker.x, walker.z);
          astronaut.position.set(walker.x, groundHeight + jump.height, walker.z);
          if (astronautShadow) {
            astronautShadow.mesh.position.set(walker.x, groundHeight + 0.024, walker.z);
            astronautShadow.material.opacity = Math.max(0.12, (activeTier.shadows ? 0.18 : 0.46) - jump.height * 0.16) * (eclipse ? 0.45 : 1);
          }
          const speed = Math.hypot(walker.vx, walker.vz);

          const airborne = props.planet === "mars" && (jump.height > 0 || jump.velocity > 0);
          if (!airborne && !third) {
            characterYaw = cameraYaw;
          } else if (!airborne && speed > 0.15) {
            const moveHeading = Math.atan2(-walker.vx, -walker.vz);
            const diff = shortestAngleDiff(characterYaw, moveHeading);
            characterYaw += diff * (1 - Math.exp(-14 * dt));
          }
          astronaut.rotation.y = characterYaw;

          if (p.enabled && !inCave) footprints?.(walker.x, walker.z, characterYaw, jump.height < .04);

          gaitPhase += speed * dt * 2.4;
          gaitBlend += ((speed > .3 && jump.height < .1 ? 1 : 0) - gaitBlend) * (1 - Math.exp(-12 * dt));
          const stride = reduced.matches ? 0 : Math.sin(gaitPhase) * .38 * gaitBlend;
          if (marsAstronaut) {
            marsAstronaut.update(
              dt,
              speed,
              jump.height > 0 || jump.velocity > 0,
              jump.height,
              jump.velocity,
            );
          } else {
            leftLeg.rotation.x = stride;
            rightLeg.rotation.x = -stride;
            leftArm.rotation.x = -stride * 0.65;
            rightArm.rotation.x = stride * 0.65;
          }
          const back = props.planet === "mars" ? (inCave ? 4.1 : 5.2) : 4.3;
          const shoulder = props.planet === "mars" ? 0.28 : 0.6;
          if (airborne) cameraGround = groundHeight;
          else cameraGround += (groundHeight - cameraGround) * (1 - Math.exp(-14 * dt));
          if (third) {
            const targetY = cameraGround + jump.height + (props.planet === "mars" ? 1.45 : 1.55);
            const horizBack = Math.cos(pitch) * back;
            const vertBack = -Math.sin(pitch) * back;
            desiredCamera.set(
              walker.x + Math.sin(cameraYaw) * horizBack + Math.cos(cameraYaw) * shoulder,
              targetY + vertBack,
              walker.z + Math.cos(cameraYaw) * horizBack - Math.sin(cameraYaw) * shoulder,
            );
            const groundUnderCam = activeHeightAt(desiredCamera.x, desiredCamera.z);
            desiredCamera.y = Math.max(desiredCamera.y, groundUnderCam + 0.45);
            if (!orbitInitialized || props.planet !== "mars") camera.position.copy(desiredCamera);
            camera.position.lerp(desiredCamera, 1 - Math.exp(-18 * dt));
            orbitInitialized = true;
          } else {
            camera.position.set(
              walker.x,
              cameraGround + 1.7 + jump.height,
              walker.z,
            );
          }
          if (third && props.planet === "mars") {
            camera.lookAt(walker.x + Math.cos(cameraYaw) * shoulder, cameraGround + jump.height + (props.planet === "mars" ? 1.45 : 1.55), walker.z - Math.sin(cameraYaw) * shoulder);
          } else {
            orbitInitialized = false;
            camera.rotation.set(pitch, cameraYaw, 0, "YXZ");
          }
        }
        if (helmetLamp && helmetTarget) {
          const lampActive = inCave || storm || eclipse || props.freeRoam;
          helmetLamp.intensity = inCave ? 7.2 : (storm || eclipse) && !rover.driving ? 2.6 : 0;
          if (lampActive) {
            const hy = activeHeightAt(walker.x, walker.z) + 1.75 + jump.height;
            helmetLamp.position.set(walker.x, hy, walker.z);
            helmetTarget.position.set(
              walker.x - Math.sin(cameraYaw) * 12,
              hy + Math.sin(pitch) * 6 - 0.8,
              walker.z - Math.cos(cameraYaw) * 12,
            );
          }
        }
        if (sage) {
          const following = current.current.sageFollowing ?? false;
          const targetEntity = rover.driving ? rover : walker;
          const next = stepSage(sage.position, sageDestination(following, targetEntity), dt);
          const sageGround = model.heightAt(next.x, next.z);
          sage.position.x = next.x; sage.position.z = next.z;
          sage.rotation.y = following ? targetEntity.yaw + Math.PI : Math.PI;
          sage.position.y = sageGround + sage.userData.groundOffset;
          if (sageShadow) {
            sageShadow.mesh.position.set(next.x, sageGround + 0.024, next.z);
            sageShadow.material.opacity = (activeTier.shadows ? 0.18 : 0.44) * (eclipse ? 0.45 : 1);
          }
        }
        windDust?.update(dt, walker.x, walker.z, model.heightAt, reduced.matches, activeTier.particles);

        if (aim.current) {
          aim.current.style.left = "50%";
          aim.current.style.top = "50%";
        }
        light.intensity = inCave ? 0.02 : eclipse ? .22 : flare ? 4.3 : storm ? 1.4 : props.planet === "mars" ? 3.4 : 3.5;
        ambient.intensity = inCave ? 0.14 : eclipse ? (props.planet === "mars" ? .60 : .65) : props.planet === "mars" ? .65 : 1.65;
        if (props.planet === "mars") {
          ambient.color.setHex(inCave ? 0x162a3d : eclipse ? 0x7f9dca : 0xc5ccd5);
          ambient.groundColor.setHex(inCave ? 0x050911 : eclipse ? 0x312a36 : 0x77543e);
          light.color.setHex(eclipse ? 0x9ab4dc : flare ? 0xffbb7a : 0xffe5c7);
          scene.environmentIntensity = inCave ? 0.06 : eclipse ? .15 : .85;
          const shadowStep = 68 / light.shadow.mapSize.x;
          const sx = Math.round((walker.x - Math.sin(cameraYaw) * 15) / shadowStep) * shadowStep;
          const sz = Math.round((walker.z - Math.cos(cameraYaw) * 15) / shadowStep) * shadowStep;
          light.target.position.set(sx, 0, sz);
          light.position.copy(MARS_SUN_DIRECTION).multiplyScalar(100).add(light.target.position);
          starField.visible = !inCave && eclipse;
          earth.visible = !inCave && eclipse;
        }
        if (props.planet === "mars" && (lastMarsNight !== eclipse || lastEnvWeather !== p.weather || lastEnvBiome !== activeBiome)) {
          let targetBg = eclipse ? 0x111824 : 0xe3b6a1;
          let targetFog = eclipse ? 0x232638 : 0xb3866b;
          let targetDensity = eclipse ? 0.0038 : 0.0022;

          if (inCave) {
            targetBg = 0x03070d;
            targetFog = 0x040b14;
            targetDensity = 0.052;
          } else if (storm) {
            targetBg = eclipse ? 0x261a18 : 0x9c5a3c;
            targetFog = eclipse ? 0x2c1d18 : 0x9e5938;
            targetDensity = 0.024;
          }

          if (scene.background && "setHex" in (scene.background as object)) {
            (scene.background as import("three").Color).setHex(targetBg);
          }
          if (scene.fog && "color" in scene.fog) {
            const f = scene.fog as import("three").FogExp2;
            f.color.setHex(targetFog);
            f.density = streaming ? Math.max(terrainBudget.fog,targetDensity) : targetDensity;
          }

          if (marsSky) marsSky.uniforms.night.value = eclipse ? 1 : 0;
          if (dust) (dust.material as import("three").ShaderMaterial).uniforms.opacity.value = reduced.matches ? .025 : storm ? .26 : eclipse ? .045 : .09;
          if (bigRover) {
            const lightLevel = (eclipse || storm) ? 3.5 : 0;
            bigRover.headlightL.intensity = lightLevel;
            bigRover.headlightR.intensity = lightLevel;
          }
          lastMarsNight = eclipse;
          lastEnvWeather = p.weather;
          lastEnvBiome = activeBiome;
        }
        sun.visible = !inCave && (props.planet !== "mars" || !eclipse);
        earth.visible = !inCave && earth.visible;
        earth.position.set(
          eclipse ? -70 : 65,
          eclipse ? 65 : 40,
          eclipse ? -179 : -170,
        );
        if(props.freeRoam && !inCave){
          const n=nightBlend,twilight=4*n*(1-n);
          light.intensity=T.MathUtils.lerp(3.4,.22,n);
          ambient.intensity=T.MathUtils.lerp(.65,.60,n);
          ambient.color.copy(dayAmbient).lerp(nightAmbient,n);ambient.groundColor.copy(dayGround).lerp(nightGround,n);
          light.color.copy(dayLight).lerp(sunsetLight,twilight*.55).lerp(nightLight,n);
          scene.environmentIntensity=T.MathUtils.lerp(.85,.15,n);
          const sunAngle=daylightAngle(daylightElapsed),sunSin=Math.sin(sunAngle),sunCos=Math.cos(sunAngle);
          sunDirection.set(MARS_SUN_DIRECTION.x*sunCos+MARS_SUN_DIRECTION.z*sunSin,.25*sunCos,MARS_SUN_DIRECTION.z*sunCos-MARS_SUN_DIRECTION.x*sunSin).normalize();
          if(marsSky){marsSky.uniforms.night.value=n;marsSky.uniforms.sunDirection.value.copy(sunDirection);}
          light.position.set(sunDirection.x*100+light.target.position.x,Math.max(.18,sunDirection.y)*100,sunDirection.z*100+light.target.position.z);
          sun.visible=true;sun.position.copy(sunDirection).multiplyScalar(185);sun.position.x+=walker.x;sun.position.z+=walker.z;sun.material.opacity=1-n;
          starField.visible=true;starField.material.opacity=n*n;earth.visible=true;earth.material.opacity=n*n;earth.position.set(walker.x-70,65,walker.z-179);
          (scene.background as import("three").Color).copy(daySky).lerp(nightSky,n);
          const fog=scene.fog as import("three").FogExp2;fog.color.copy(dayFog).lerp(nightFog,n);fog.density=terrainBudget.fog;
          if(dust)(dust.material as import("three").ShaderMaterial).uniforms.opacity.value=reduced.matches?.025:T.MathUtils.lerp(.09,.045,n);
          if(helmetLamp)helmetLamp.intensity=rover.driving?0:2.6*n;
          if(astronautShadow)astronautShadow.material.opacity=Math.max(.12,(activeTier.shadows?.18:.44)-jump.height*.16)*T.MathUtils.lerp(1,.45,n);
          if(bigRover){const intensity=T.MathUtils.lerp(rover.driving?1.4:0,8.5,n);bigRover.headlightL.intensity=intensity;bigRover.headlightR.intensity=intensity;}
        }
        if (time - lastAimCheck >= 80) {
        lastAimCheck = time;
        ray.setFromCamera(center, camera);
        const rayTargets = curiosityRover ? [...model.targets, curiosityRover.hitTarget] : model.targets;
        const hit = ray.intersectObjects(rayTargets, true)[0];
        hover = null;
        range = Infinity;
        if (hit && hit.distance < 65) {
          let o: Object3D | null = hit.object;
          while (o && !o.userData.station) o = o.parent;
          if (o) {
            hover = o.userData.station;
            if (hover === "curiosity" && curiosity) {
              range = Math.hypot(walker.x - curiosity.x, walker.z - curiosity.z);
            } else if (hover === "weather-terminal") {
              range = Math.hypot(walker.x - WEATHER_TERM_POS.x, walker.z - WEATHER_TERM_POS.z);
            } else {
              const station = STATIONS.find((s) => s.id === hover);
              if (station) range = Math.hypot(walker.x - station.x, walker.z - station.z);
            }
          }
        }
        // Keep nearby equipment operable even when the crosshair falls just beside a narrow object.
        if (!hover || range > 5.5) {
          // Scan in place rather than allocating and sorting a fresh array during play.
          for (const station of STATIONS) {
            const distance = Math.hypot(walker.x - station.x, walker.z - station.z);
            if (distance <= 5.5 && distance < range) { hover = station.id; range = distance; }
          }
          if (props.planet === "mars" && !props.freeRoam && !inCave) {
            const wtDist = Math.hypot(walker.x - WEATHER_TERM_POS.x, walker.z - WEATHER_TERM_POS.z);
            if (wtDist <= 4.5 && wtDist < range) { hover = "weather-terminal"; range = wtDist; }
          }
          if (curiosity && !inCave) {
            const cDist = Math.hypot(walker.x - curiosity.x, walker.z - curiosity.z);
            if (cDist <= 5.5 && cDist < range) { hover = "curiosity"; range = cDist; }
          }
        }
        const inspectReady = Boolean(p.enabled && !rover.driving && hover && range <= 5.5);
        if (inspectReady !== lastCanInspect) {
          lastCanInspect = inspectReady;
          setCanInspect(inspectReady);
        }
        }
        const pulse =
          !reduced.matches && p.animating
            ? 0.4 + Math.sin(time * 0.006) * 0.2
            : 0.5;
        for (const station of STATIONS) {
          const m = model.indicators[station.id];
          const selected = station.id === p.target;
          const nearby = props.planet === "mars" && station.id === hover && range <= 5.5;
          m.color.setHex(nearby ? 0xffe2a4 : selected ? 0xeeb975 : 0x72b8ac);
          m.emissive.setHex(nearby ? 0xb87f39 : selected ? 0x9f672b : 0x15594e);
          m.emissiveIntensity = nearby ? 1 : selected ? 0.6 : 0.3;
        }
        const effect = p.failure ? p.effect : null;
        if (p.event === "flare" || p.event === "particles") {
          model.indicators.monitor.color.setHex(0xefad71);
          model.indicators.monitor.emissive.setHex(0x9a4d23);
          model.indicators.monitor.emissiveIntensity = 0.6;
        }
        for (const panel of model.panels)
          (panel.material as MeshStandardMaterial).color.setHex(
            props.planet === "mars"
              ? effect === "dust" ? 0x8a7560 : p.solarClean ? 0xffffff : 0xc3aa87
              : effect === "dust" ? 0x555254 : p.day > 0 ? 0x255680 : 0x536071,
          );
        model.habitatWindow.emissiveIntensity =
          effect === "power" || effect === "dust" ? 0.05 : props.planet === "mars" && eclipse ? 1.1 : 0.7;
        for (const tank of model.tanks)
          (tank.material as MeshStandardMaterial).emissive.setHex(
            effect === "water" && tank.userData.system === "water"
              ? 0x794226
              : effect === "oxygen" && tank.userData.system === "oxygen"
                ? 0x613623
                : 0x000000,
          );
        for (const pack of model.foods)
          pack.visible = effect !== "food" || pack.position.x < 0;
        for (const wheel of model.wheelMeshes)
          wheel.rotation.x =
            effect === "rover" && p.animating && !reduced.matches
              ? Math.sin(time * 0.02) * 0.1
              : 0;
        if (model.dish) {
          model.dish.rotation.z = effect === "signal" ? -0.65 : 0;
        }
        if (p.effect && p.failure) {
          const m = model.indicators[p.target];
          m.color.setHex(p.stabilized ? 0xb7c8a9 : 0xe98b60);
          m.emissive.setHex(p.stabilized ? 0x456246 : 0x983f22);
          m.emissiveIntensity = p.stabilized ? 0.45 : pulse;
        }
        if (previousDay !== p.day) {
          if (previousDay > p.day) {
            walker = spawnAtArrival();
            jump = { height: 0, velocity: 0 };
            pitch = -0.04;
            cameraYaw = 0;
            characterYaw = 0;
            mouse.set(0, 0);
            rover = spawnRoverVehicle(17, 10, 0, model.roverHeightAt);
            if (curiosityRover) {
              curiosity = spawnCuriosityRover(model.obstacles, model.roverHeightAt, {
                seed: (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0,
                allowColonyTargets: !props.freeRoam,
              });
            }
            setRoverDriving(false);
            setRoverGear("N");
          }
          previousDay = p.day;
          keys.clear();
        }
        if (curiosity && time - lastCuriositySave >= 1500) {
          lastCuriositySave = time;
          saveCuriosityNow();
        }
        if (time - lastReport > 90) {
          lastReport = time;
          if(props.freeRoam && time-lastMapReport>500){
            lastMapReport=time;
            mapRocks=model.obstacles.filter(o=>o.topY!==undefined && Math.hypot(o.x-walker.x,o.z-walker.z)<80)
              .sort((a,b)=>Math.hypot(a.x-walker.x,a.z-walker.z)-Math.hypot(b.x-walker.x,b.z-walker.z))
              .slice(0,48).map(o=>({x:o.x,z:o.z,radius:o.radius}));
          }
          current.current.onView({
            mapRocks:props.freeRoam?mapRocks:undefined,
            x: walker.x,
            z: walker.z,
            lightPhase:props.freeRoam ? daylightPhase(daylightElapsed) : undefined,
            yaw: cameraYaw,
            target: hover,
            distance: range,
            locked: document.pointerLockElement === element,
            jumpHeight: jump.height,
            roverX: rover.x,
            roverZ: rover.z,
            roverYaw: rover.yaw,
            roverDriving: rover.driving,
            roverSpeed: Math.round(Math.abs(rover.speed) * 3.6),
            roverGear: getRoverGear(rover.speed),
            mudDepth: rover.mudDepth,
            curiosityX: curiosity?.x,
            curiosityZ: curiosity?.z,
            curiosityYaw: curiosity?.yaw,
            curiosityPhase: curiosity?.phase,
            curiosityScanStage: curiosity?.scanStage,
            curiosityScans: curiosity?.scanCount,
            curiositySample: curiosity?.lastScanSample,
            lidar: rover.driving ? lidar : undefined,
            nearbyMineral: nearMineral,
          });
        }
        renderer.info.reset();
        if (lastQuality === "performance" || !renderEffects()) renderer.render(scene, camera);
        if (cameraChanged) {
          element.dataset.cameraSwitchMs = (performance.now()-frameStarted).toFixed(1);
          element.dataset.cameraSwitchPrograms = String((renderer.info.programs?.length ?? 0)-programsBefore);
        }
        metricFrames++;
        if (time - metricStart > 1000) {
          element.dataset.cameraFov = String(camera.fov);
          element.dataset.daylightPhase=daylightPhase(daylightElapsed);
          element.dataset.nightBlend=nightBlend.toFixed(4);
          element.dataset.worldX = walker.x.toFixed(2);
          element.dataset.worldZ = walker.z.toFixed(2);
          element.dataset.terrainChunks = String(streaming?.count() ?? 0);
          element.dataset.fps = (metricFrames * 1000 / (time - metricStart)).toFixed(1);
          element.dataset.renderCalls = String(renderer.info.render.calls);
          element.dataset.shaderPrograms = String(renderer.info.programs?.length ?? 0);
          element.dataset.staticDrawCallsSaved = String(model.root.userData.staticDrawCallsSaved ?? 0);
          element.dataset.sageX = sage?.position.x.toFixed(2) ?? "";
          element.dataset.sageZ = sage?.position.z.toFixed(2) ?? "";
          element.dataset.sageScale = sage?.scale.x.toFixed(2) ?? "";
          element.dataset.sageFollowing = String(current.current.sageFollowing ?? false);
          element.dataset.curiosityX = curiosity?.x.toFixed(2) ?? "";
          element.dataset.curiosityZ = curiosity?.z.toFixed(2) ?? "";
          element.dataset.curiosityPhase = curiosity?.phase ?? "";
          element.dataset.curiosityScans = String(curiosity?.scanCount ?? 0);
          element.dataset.resolutionScale = resolutionScale.toFixed(2);
          element.dataset.contactShading = String(occlusion?.enabled ?? false);
          element.dataset.antialiasing = composer && (occlusion?.enabled || bloom?.enabled) ? "fxaa" : renderer.getContext().getContextAttributes()?.antialias ? "native" : "off";
          element.dataset.aaTexel = fxaaPass ? `${fxaaPass.uniforms.resolution.value.x},${fxaaPass.uniforms.resolution.value.y}` : "";
          const fps = metricFrames * 1000 / (time - metricStart);
          if (debugPanel.current) debugPanel.current.textContent = `Frame: ${(1000 / fps).toFixed(1)} ms (${fps.toFixed(1)} fps)\nDraw calls: ${renderer.info.render.calls}\nTriangles: ${renderer.info.render.triangles}\nTextures: ${renderer.info.memory.textures}\nRender scale: ${resolutionScale.toFixed(2)}\nTier: ${lastQuality}`;
          element.dataset.graphicsProfile = lastQuality;
          slowWindows = p.enabled && fps < 44 ? slowWindows + 1 : 0;
          fastWindows = p.enabled && fps > 57 ? fastWindows + 1 : 0;
          if (cameraSettings.current.quality === "auto" && p.enabled && time - qualityStart > 5000 && (slowWindows >= 2 || fastWindows >= 8)) {
            // Shed full-screen SSAO and heavy shadows/terrain before blurring pixels on iGPUs.
            if (slowWindows >= 2 && occlusion?.enabled) {
              autoOcclusion = false; occlusion.enabled = false;
            } else if (slowWindows >= 2 && (fps < 34 || resolutionScale <= .92)) {
              autoProfile = autoProfile === "high" ? "auto" : "performance";
              setAutoLabel(profileLabel());
            }
            const cap = Math.min(displayRatio, graphicsTier(autoProfile).resolutionCap);
            const step = slowWindows >= 2 ? (!autoOcclusion && autoProfile !== "performance" ? 0 : -.1) : .1;
            const next = Math.max(.85, Math.min(devicePixelRatio, cap, resolutionScale + step));
            if (Math.abs(next - resolutionScale) > .01) { resolutionScale = next; renderer.setPixelRatio(next); resize(); }
            qualityStart = time; slowWindows = fastWindows = 0;
          }
          metricStart = time; metricFrames = 0;
        }
      }
      dispose = () => {
        saveCuriosityNow();
        clearNoticeTimer();
        cancelAnimationFrame(frame);
        observer.disconnect();
        element.removeEventListener("pointerdown", down);
        element.removeEventListener("click", sceneClick);
        element.removeEventListener("pointerleave", resetHover);
        document.removeEventListener("mouseleave", resetHover);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        window.removeEventListener("keydown", keydown);
        window.removeEventListener("keyup", keyup);
        window.removeEventListener("blur", blur);
        element.removeEventListener("blur", blur);
        document.removeEventListener("pointerlockchange", lockChange);
        document.removeEventListener("pointerlockerror", lockError);
        window.removeEventListener("pagehide", saveCuriosityNow);
        window.removeEventListener("beforeunload", saveCuriosityNow);
        document.removeEventListener("visibilitychange", saveOnHide);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        if (document.pointerLockElement === element) document.exitPointerLock();
        renderer.dispose();
        disposeEffects();
        environment?.dispose();
        bigRover?.dispose();
        curiosityRover?.dispose();
        marsAstronaut?.dispose();
        if(props.freeRoam && dropPodIntro) {
          dropPodIntro.root.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}});
        }
        streaming?.dispose();
        model.disposeTracks?.();
        disposeMarsSurfaceTextures(regolithSurface);
        scene.traverse((o) => {
          const m = o as Mesh;
          m.geometry?.dispose();
          if (m.material) {
            for (const material of Array.isArray(m.material)
              ? m.material
              : [m.material])
              { const mapped = material as import("three").MeshStandardMaterial; mapped.map?.dispose(); mapped.bumpMap?.dispose(); mapped.normalMap?.dispose(); mapped.roughnessMap?.dispose(); mapped.metalnessMap?.dispose(); mapped.emissiveMap?.dispose(); mapped.alphaMap?.dispose(); material.dispose(); }
          }
        });
        renderer.domElement.remove();
      };
      // Finish async models before warmup, so geometry and textures never pop in during play.
      if (props.planet === "mars") {
        setLoadingStage("Preparing rover and explorer…"); setLoadingProgress(80);
        await Promise.all([bigRover?.ready,curiosityRover?.ready,marsAstronaut?.ready]);
        if (cancelled) return;
        setLoadingStage("Preparing materials and light…"); setLoadingProgress(88);
        camera.position.set(.22,2.8,17.8); camera.rotation.set(pitch,0,0,"YXZ"); astronaut.position.set(0,0,12);
        try {
          const preset=graphicsTier(effectiveQuality());
          lastQuality=effectiveQuality();
          model.setLightSurfaces?.(lastQuality==="performance");
          resolutionScale=Math.min(displayRatio,preset.resolutionCap);
          renderer.setPixelRatio(resolutionScale); resize();
          renderer.shadowMap.enabled=preset.shadows;
          const nightShadow = preset.shadows && (current.current.event === "eclipse" || current.current.event === "night");
          if (bigRover) { bigRover.headlightL.castShadow=nightShadow; bigRover.headlightR.castShadow=false; bigRover.update(rover,rover.chassisY,0,false,model.roverHeightAt,undefined,preset.shadows); }
          if (curiosityRover && curiosity) { curiosityRover.update(curiosity,0,false,reduced.matches,preset.shadows); }
          if (smallRocks) smallRocks.count=preset.smallRocks;
          if (dust) dust.geometry.setDrawRange(0,preset.particles);
          // Upload maps not yet visible (cockpit, rear surfaces and custom soil uniforms).
          const textures=new Set<import("three").Texture>();
          scene.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);});
          if(regolithSurface)for(const surface of Object.values(regolithSurface)){textures.add(surface.color);textures.add(surface.relief);}
          for (const texture of textures) renderer.initTexture(texture);
          await renderer.compileAsync(scene,camera); if(cancelled)return;
          // Upload both camera views while the loading screen is still covering them.
          if(lastQuality!=="performance"){
          bigRover?.setCockpitView(true);bigRover?.update(rover,rover.chassisY,0,false,model.roverHeightAt);
          bigRover?.positionCockpitCamera(camera,0,-.04);renderer.render(scene,camera);configureEffects(true);
          bigRover?.setCockpitView(false);
          camera.position.set(rover.x,rover.chassisY+4,rover.z+8);camera.lookAt(rover.x,rover.chassisY+1.8,rover.z);renderer.render(scene,camera);configureEffects(true);
          }
          camera.position.set(.22,2.8,17.8);camera.rotation.set(pitch,0,0,"YXZ");renderer.render(scene,camera);
          configureEffects(true);
        }catch{/* A missing optional GPU feature must not prevent the basic scene from rendering. */}
        finally {
          scene.overrideMaterial = null;
          renderer.setRenderTarget(null);
        }
      }
      if (cancelled) return;
      if(props.freeRoam && props.planet==="mars") {
        setLoadingStage("Preparing the expanding Mars landscape…");
        const ground=model.root.getObjectByName("mars-ground") as import("three").Mesh;
        streaming=createStreamedMars(model.root,ground,baseHeight,{...terrainBudget,obstacles:model.obstacles});
        streaming.update(walker.x,walker.z,terrainBudget.generationMs);
        while(streaming.pending()){
          await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
          if(cancelled)return;
          streaming.update(walker.x,walker.z,terrainBudget.generationMs);
        }
        const backdrop=model.root.getObjectByName("mars-backdrop");if(backdrop)backdrop.visible=false;
        (scene.fog as import("three").FogExp2).density=terrainBudget.fog;
        await renderer.compileAsync(scene,camera);
        renderer.render(scene,camera);configureEffects(true);
      }
      if(cancelled)return;
      current.current.onTerrainMode?.(!!streaming);
      element.dataset.terrainMode=streaming ? "streamed" : "finite";
      frame = requestAnimationFrame(animate);
      setLoadingStage("Launching exploration…");
      setLoadingProgress(100);
      setLoaded(true);
      current.current.onReady?.();
      element.dataset.loadMs = (performance.now()-loadStarted).toFixed(0);
    }
    mount().catch(() => {
      setMessage(
        props.freeRoam ? "3D is unavailable. Retry with Performance graphics." : "3D is unavailable. Open the field guide for the accessible station controls.",
      );
      current.current.onUnavailable();
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, []);
  const touch = useCallback((key: string, on: boolean) => {
    if (key === "f") {
      if (on) toggleRoverAction.current();
      return;
    }
    if (on) {
      host.current?.focus();
      controls.current.add(key);
    } else controls.current.delete(key);
  }, []);
  const handleWalkAxes = useCallback((axes: MoveAxes) => {
    analogWalk.current = axes;
  }, []);
  const handleDriveAxes = useCallback((axes: RoverAnalogInput) => {
    analogDrive.current = axes;
  }, []);
  const handleToggleView = useCallback(() => setThirdPerson((v) => !v), []);
  const handleToggleRover = useCallback(() => toggleRoverAction.current(), []);
  const handleInspectNearby = useCallback(() => inspectAction.current(), []);
  return (
    <div
      ref={host}
      className="sv-world"
      data-cursor-free={cursorFree ? "true" : "false"}
      role="application"
      aria-label={`${props.planet === "mars" ? "Mars" : "Lunar"} ${props.freeRoam ? "open world" : "outpost"}. ${touchControlsActive ? "Use the left thumbstick to move, drag the screen to look around, and tap the right buttons to jump or inspect." : "WASD to walk. Drag to look or capture the mouse; Q and R also turn. Space jumps. V switches view. E inspects."}`}
      tabIndex={0}
    >
      {debug && props.planet === "mars" && <pre ref={debugPanel} className="mars-debug" aria-label="Graphics performance diagnostics">Collecting graphics measurements…</pre>}
      {!loaded && (
        <div className="sv-loading" role="status">{loadingStage}<br/><progress aria-label="Scene preparation progress" max={100} value={loadingProgress}/><span> {loadingProgress}%</span></div>
      )}
      {props.enabled && !introActive && (
        <>
          <div ref={aim} className="sv-aim" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="sv-look-controls">
            <details open={props.planet !== "mars" && !touchControlsActive ? true : undefined}>
            <summary aria-label="Camera and graphics">{touchControlsActive && props.planet==="mars" ? <Settings2 size={19}/> : "Camera & graphics"}</summary>
            {!touchControlsActive && (
              <>
                <button onClick={() => lockAction.current()}>
                  {locked ? "Release mouse · Esc" : cursorFree ? "Resume mouse look" : "Capture mouse for 360° look"}
                </button>
                <span>{cursorFree ? "Cursor free for UI · click the 3D view to resume look" : "Drag to look, or click view for 360° capture · Esc frees cursor · Q/R turn · V changes view"}</span>
              </>
            )}
            <label>
              {touchControlsActive ? "Look sensitivity" : "Mouse sensitivity"}{" "}
              <input
                aria-label="Look sensitivity"
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
              />
            </label>
            <button onClick={() => setThirdPerson((v) => !v)}>
              {thirdPerson ? (touchControlsActive ? "Third person view" : "Third person · V") : (touchControlsActive ? "First person view" : "First person · V")}
            </button>
            <button
              type="button"
              aria-pressed={touchControlsActive}
              onClick={() => setTouchOverride(!touchControlsActive)}
            >
              Touch controls · {touchControlsActive ? "On" : "Off"}
            </button>
            {props.planet === "mars" && <label>Graphics <select aria-label="Graphics quality" value={quality} onChange={e => { setQuality(e.target.value); e.currentTarget.blur(); host.current?.focus({ preventScroll: true }); }}>
              <option value="auto">Auto · {autoLabel}</option><option value="performance">Performance</option><option value="high">High</option><option value="ultra">Ultra</option>
            </select></label>}
            </details>
          </div>
          {roverNear && !roverDriving && !touchControlsActive && (
            <div className="sv-rover-prompt">
              <button
                type="button"
                className="sv-rover-prompt-btn"
                onClick={() => toggleRoverAction.current()}
              >
                <span className="sv-key-badge">F</span> Drive Exploration Rover
              </button>
            </div>
          )}
          {roverDriving && (
            <div className={`sv-rover-hud${!thirdPerson ? " sv-rover-hud-cockpit" : ""}`} role="region" aria-label="Rover Vehicle HUD">
              <div className="sv-rover-gearbox" data-gear={roverGear} aria-label={`Transmission gear ${roverGear}`}>
                <div className="sv-gear-rail" aria-hidden="true">
                  {(["R", "N", "D"] as const).map((g) => (
                    <span key={g} className={roverGear === g ? "active" : ""}>{g}</span>
                  ))}
                </div>
                <strong className="sv-gear-active">{roverGear}</strong>
                <small>{roverGear === "D" ? "DRIVE" : roverGear === "R" ? "REVERSE" : "NEUTRAL"}</small>
              </div>
              <div className="sv-rover-speedometer">
                <strong>{roverSpeed}</strong>
                <span>KM/H</span>
                <small className={roverMud ? "mud-alert" : ""}>
                  {roverHandbrake ? "PARK BRAKE" : roverMud ? "SOFT MUD · TRACKS" : "6x6 INDEPENDENT"}
                </small>
              </div>
              {!touchControlsActive && (
                <div className="sv-rover-hints">
                  <span><b>W / S</b> Drive / Reverse</span>
                  <span><b>A / D</b> Steer</span>
                  <span><b>Space</b> Handbrake</span>
                  <span><b>V</b> Camera</span>
                </div>
              )}
              <button
                type="button"
                className="sv-rover-exit-btn"
                onClick={() => toggleRoverAction.current()}
              >
                <span className="sv-key-badge">F</span> Exit Rover
              </button>
            </div>
          )}
          {touchControlsActive && (
            <TouchDeck
              enabled={props.enabled}
              roverDriving={roverDriving}
              roverNear={roverNear}
              canInspect={canInspect}
              thirdPerson={thirdPerson}
              onWalkAxes={handleWalkAxes}
              onDriveAxes={handleDriveAxes}
              onHoldKey={touch}
              onToggleView={handleToggleView}
              onToggleRover={handleToggleRover}
              onInspectNearby={handleInspectNearby}
            />
          )}
        </>
      )}
      {loaded && introActive && props.enabled && <div className="landing-caption" role="status"><b>{introTelemetry.alt>0.1?"Powered descent":"Touchdown · settling on Mars"}</b><span>{introTelemetry.alt.toFixed(1)} m above landing surface</span><button onClick={()=>skipIntroAction.current()}>Skip landing</button></div>}
      {message && <p className="sv-world-message" role="status">{message}</p>}
    </div>
  );
});
export default SurvivalWorld;
