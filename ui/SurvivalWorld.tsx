"use client";
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
  type CuriosityRoverState,
} from "../game/curiosityRover";
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

function shortestAngleDiff(from: number, to: number): number {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export type View = {
  x: number;
  z: number;
  yaw: number;
  target: string | null;
  distance: number;
  locked: boolean;
  jumpHeight: number;
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
  enabled: boolean;
  showTouchControls: boolean;
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
};
export type SurvivalWorldHandle = {
  captureMouse: () => void;
  toggleRover?: () => void;
};
const SurvivalWorld = forwardRef<SurvivalWorldHandle, Props>(function SurvivalWorld(props, ref) {
  const STATIONS = props.planet === "mars" ? marsStations : lunarStations;
  const host = useRef<HTMLDivElement>(null),
    current = useRef(props);
  const aim = useRef<HTMLDivElement>(null);
  const debugPanel = useRef<HTMLPreElement>(null);
  const [debug] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1");
  current.current = props;
  const controls = useRef(new Set<string>()),
    lockAction = useRef<() => void>(() => {});
  const toggleRoverAction = useRef<() => void>(() => {});
  const inspectAction = useRef<() => void>(() => {});
  const analogWalk = useRef<MoveAxes>({});
  const analogDrive = useRef<RoverAnalogInput>({});
  const [autoCoarse, setAutoCoarse] = useState(false);
  const [touchOverride, setTouchOverride] = useState<boolean | null>(null);
  const touchControlsActive = touchOverride ?? (props.showTouchControls || autoCoarse);
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
    [roverHandbrake, setRoverHandbrake] = useState(false);
  const TouchDeck = props.planet === "mars" ? (roverDriving ? RoverTouchDeck : MarsTouchDeck) : TouchControlsOverlay;
  useImperativeHandle(
    ref,
    () => ({
      captureMouse: () => lockAction.current(),
      toggleRover: () => toggleRoverAction.current(),
    }),
    [],
  );
  const [loadingStage, setLoadingStage] = useState("Loading mission equipment…"),
    [loadingProgress, setLoadingProgress] = useState(10),
    [loaded, setLoaded] = useState(false),
    [locked, setLocked] = useState(false),
    [message, setMessage] = useState(""),
    [thirdPerson, setThirdPerson] = useState(true),
    [sensitivity, setSensitivity] = useState(1),
    [quality, setQuality] = useState(props.initialQuality ?? (props.planet === "mars" ? "auto" : "high"));
  const [autoLabel,setAutoLabel]=useState("Detecting");
  const cameraSettings = useRef({ thirdPerson, sensitivity, quality });
  cameraSettings.current = { thirdPerson, sensitivity, quality };
  useEffect(() => {
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
      setLoadingStage("Building the outpost…");
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
        new T.TextureLoader().loadAsync(assetUrl("/art/mars-ivory-panel-original.webp")).catch(() => undefined),
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
      scene.background = new T.Color(0x090e18);
      scene.fog = new T.FogExp2(0x333b48, 0.0024);
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
      const model = createSurvivalOutpost(scene, props.planet, regolithSurface, panelSurface);
      const smallRocks = props.planet === "mars" ? model.root.getObjectByName("mars-small-rocks") as import("three").InstancedMesh | undefined : undefined;
      setLoadingStage("Preparing explorers and equipment…");
      setLoadingProgress(70);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      const beacon = props.planet === "mars" ? new T.Group() : null;
      if (beacon) {
        const beam = new T.Mesh(new T.CylinderGeometry(.12, .4, 8, 16, 1, true), new T.MeshBasicMaterial({color:0x8ef7e1, transparent:true, opacity:.3, depthWrite:false, side:T.DoubleSide}));
        beam.position.y = 4; beacon.add(beam);
        const marker = new T.Mesh(new T.OctahedronGeometry(.5), new T.MeshBasicMaterial({color:0xb0fff1})); marker.position.y=8; beacon.add(marker);
        scene.add(beacon);
      }
      const footprints = props.planet === "mars" ? createMarsFootprints(scene,model.heightAt) : null;
      const sage = props.planet === "mars" ? createSageCompanion() : null;
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
      let composer: import("three/examples/jsm/postprocessing/EffectComposer.js").EffectComposer | null = null;
      let occlusion: import("three/examples/jsm/postprocessing/GTAOPass.js").GTAOPass | null = null;
      let bloom: import("three/examples/jsm/postprocessing/UnrealBloomPass.js").UnrealBloomPass | null = null;
      let effectsLoading: Promise<void> | null = null;
      let autoOcclusion = true;
      const desiredCamera = new T.Vector3();
      let orbitInitialized = false;
      let lastLidarScan = -Infinity;
      let lidar: LidarScan | undefined;
      function disposeEffects() {
        if (composer) { for (const pass of composer.passes) pass.dispose(); composer.dispose(); }
        composer = null; occlusion = null; bloom = null;
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
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { BoundedGTAOPass }] = await Promise.all([
          import("three/examples/jsm/postprocessing/EffectComposer.js"),
          import("three/examples/jsm/postprocessing/RenderPass.js"),
          import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
          import("three/examples/jsm/postprocessing/OutputPass.js"),
          import("./world/BoundedGTAOPass"),
        ]);
        if (cancelled) return;
        const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: Math.min(2, renderer.capabilities.maxSamples) });
        composer = new EffectComposer(renderer, target);
        composer.addPass(new RenderPass(scene, camera));
        occlusion = new BoundedGTAOPass(scene, camera, 256, 256);
        occlusion.updateGtaoMaterial({ radius: .48, thickness: .55, distanceFallOff: 1, samples: 8 });
        occlusion.updatePdMaterial({ samples: 8, radius: 4, rings: 2 });
        occlusion.blendIntensity = .48; occlusion.enabled = false;
        composer.addPass(occlusion);
        bloom = new UnrealBloomPass(new T.Vector2(512, 512), .09, .45, 1.35);
        composer.addPass(bloom);
        composer.addPass(new OutputPass());
      })().catch(() => { disposeEffects(); });
      function configureEffects(render = false) {
        const preset = graphicsTier(effectiveQuality());
        if (occlusion) occlusion.enabled = preset.ssao && (cameraSettings.current.quality !== "auto" || autoOcclusion);
        if (bloom) bloom.enabled = preset.bloom && !reduced.matches;
        if (render && effectiveQuality() !== "performance") renderEffects();
      }
      if (props.planet === "mars" && !mobileMars && effectiveQuality() !== "performance") await prepareEffects();
      const keys = controls.current,
        mouse = new T.Vector2(0, 0),
        ray = new T.Raycaster();
      const spawnAtArrival = () => props.planet === "mars" ? {...spawnWalker(), x:-23, z:15} : spawnWalker();
      let walker = spawnAtArrival(),
        jump = { height: 0, velocity: 0 },
        rover = spawnRoverVehicle(17, 10, 0, model.roverHeightAt),
        curiosity: CuriosityRoverState | null = curiosityRover
          ? spawnCuriosityRover(model.obstacles, model.roverHeightAt)
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
        captureDenied = false,
        lastMouseMoveTime = 0;
      toggleRoverAction.current = () => {
        if (!current.current.enabled || current.current.planet !== "mars") return;
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
          const { rover: nextRover, exitPosition } = exitRover(rover, exitObstacles);
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
        if (current.current.enabled && !rover.driving && hover && range <= 5.5)
          current.current.onInspect(hover);
      };
      inspectAction.current = inspect;
      const down = (e: PointerEvent) => {
        if (
          (e.target as HTMLElement).closest(
            "button, input, select, summary, details, .flight-pad, .sv-touch-stick, .sv-touch-actions, .sv-rover-touch-pedals",
          )
        ) {
          return;
        }
        const rect = element.getBoundingClientRect();
        mouse.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        element.focus();
        if (!current.current.enabled) return;
        if (dragging) return;
        dragging = true;
        lookPointer = e.pointerId;
        px = e.clientX;
        py = e.clientY;
        if (e.pointerType === "mouse" && e.target === renderer.domElement && document.pointerLockElement !== element && !captureDenied) lockAction.current();
      };
      let discardCapturedMove = false;
      const move = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest?.(".sv-target")) return;
        lastMouseMoveTime = performance.now();
        const rect = element.getBoundingClientRect();
        mouse.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        if (!current.current.enabled) return;
        const isThird = cameraSettings.current.thirdPerson;
        const minPitch = isThird ? -1.1 : -1.35;
        const maxPitch = isThird ? 0.85 : 1.35;
        if (document.pointerLockElement === element) {
          if (discardCapturedMove) { discardCapturedMove = false; return; }
          cameraYaw -=
            Math.max(-180, Math.min(180, e.movementX)) * 0.0023 * cameraSettings.current.sensitivity;
          pitch = Math.max(
            minPitch,
            Math.min(
              maxPitch,
              pitch - Math.max(-180, Math.min(180, e.movementY)) * 0.0023 * cameraSettings.current.sensitivity,
            ),
          );
        } else if (
          current.current.enabled &&
          dragging && e.pointerId === lookPointer
        ) {
          cameraYaw -=
            (e.clientX - px) * 0.0023 * cameraSettings.current.sensitivity;
          pitch = Math.max(
            minPitch,
            Math.min(
              maxPitch,
              pitch - (e.clientY - py) * 0.0023 * cameraSettings.current.sensitivity,
            ),
          );
          px = e.clientX;
          py = e.clientY;
        }
      };
      const up = (e: PointerEvent) => {
        if (e.pointerId === lookPointer) { dragging = false; lookPointer = null; }
      };
      const keydown = (e: KeyboardEvent) => {
        if (!current.current.enabled || document.activeElement !== element)
          return;
        const k = e.key.toLowerCase();
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
        if (k === "e" || k === "enter") {
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
        if (k === "b" && !e.repeat && current.current.planet === "mars") {
          e.preventDefault(); current.current.onToggleSage?.();
        }
        if (k === "f" && !e.repeat && current.current.planet === "mars") {
          e.preventDefault();
          toggleRoverAction.current();
        }
        if (e.code === "Space" && !e.repeat) {
          e.preventDefault();
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
        keys.clear();
        dragging = false;
        lookPointer = null;
      };
      const lockChange = () => {
        dragging = false;
        lookPointer = null;
        const captured = document.pointerLockElement === element;
        discardCapturedMove = captured;
        setLocked(captured);
        if (captured) { captureDenied = false; setMessage(""); }
        keys.clear();
      };
      lockAction.current = () => {
        element.focus();
        if (document.pointerLockElement === element) {
          document.exitPointerLock();
          return;
        }
        if (!element.requestPointerLock) {
          captureDenied = true;
          setMessage("Drag the view to look around. WASD still works.");
          return;
        }
        try {
          const request = element.requestPointerLock();
          request?.catch(() => {
            captureDenied = true;
            setMessage("Mouse capture is unavailable here. Drag to look; use WASD to walk.");
          });
        } catch {
          captureDenied = true;
          setMessage("Drag to look; use WASD to walk.");
        }
      };
      const lost = (e: Event) => {
        e.preventDefault();
        current.current.onUnavailable();
      };
      element.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      element.addEventListener("keydown", keydown);
      window.addEventListener("keyup", keyup);
      window.addEventListener("blur", blur);
      element.addEventListener("blur", blur);
      document.addEventListener("pointerlockchange", lockChange);
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
        if (p.enabled) {
          // Small physics steps keep acceleration and jumping consistent across slower frames.
          const steps = Math.max(1, Math.ceil(dt / (1 / 120))), step = dt / steps;
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
              );
            }
            walker.x = rover.x;
            walker.z = rover.z;
            walker.yaw = rover.yaw;
            // Transfer vehicle turning delta to the orbit camera so relative angle is preserved
            const yawDelta = rover.yaw - prevRoverYaw;
            cameraYaw += yawDelta;
            characterYaw = rover.yaw;

            // GTA-style gentle auto-centering behind vehicle when cruising without mouse movement
            const isCruising = Math.abs(rover.speed) > 1.2;
            const timeSinceMouse = (performance.now() - lastMouseMoveTime) / 1000;
            if (isCruising && !dragging && timeSinceMouse > 0.8 && document.pointerLockElement !== element) {
              // Reverse chase view can look behind; the driver stays facing the windshield.
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
              );
            }
            // Travel is under one metre per frame. Cull distant obstacles once before the physics substeps.
            const dynamicObstacles = [
              ...model.obstacles.filter(o=>Math.abs(walker.x-o.x)<o.radius+3 && Math.abs(walker.z-o.z)<o.radius+3),
              ...(bigRover ? [roverFootprint(rover.x, rover.z, rover.yaw)] : []),
              ...(curiosity ? [curiosityFootprint(curiosity.x, curiosity.z, curiosity.yaw)] : []),
            ];
            walker.yaw = cameraYaw;
            for (let i = 0; i < steps; i++) {
              if (props.planet === "mars") {
                const next = stepMarsLocomotion(walker, jump, keys, step, model.heightAt, dynamicObstacles, analogWalk.current);
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
          if (curiosity) {
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
        if (rover.driving && time - lastLidarScan >= 125) {
          const lidarObstacles = curiosity
            ? [...model.obstacles, curiosityFootprint(curiosity.x, curiosity.z, curiosity.yaw)]
            : model.obstacles;
          lidar = scanRoverLidar(rover, lidarObstacles);
          lastLidarScan = time;
        }
        const eclipse = p.event === "eclipse" || p.event === "night";
        const activeTier = graphicsTier(lastQuality);
        if (bigRover) {
          const roverGround = rover.chassisY ?? model.heightAt(rover.x, rover.z);
          bigRover.update(
            rover,
            roverGround,
            dt,
            eclipse,
            model.heightAt,
            lidar,
            activeTier.shadows,
          );
          if (rover.driving || Math.abs(rover.speed) > 0.1) {
            model.stampRoverTracks?.(renderer, rover);
          }
        }
        if (curiosityRover && curiosity) {
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
        if (rover.driving) {
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
          const groundHeight = model.heightAt(walker.x, walker.z);
          astronaut.position.set(walker.x, groundHeight + jump.height, walker.z);
          if (astronautShadow) {
            astronautShadow.mesh.position.set(walker.x, groundHeight + 0.024, walker.z);
            astronautShadow.material.opacity = Math.max(0.12, (activeTier.shadows ? 0.18 : 0.46) - jump.height * 0.16) * (eclipse ? 0.45 : 1);
          }
          const speed = Math.hypot(walker.vx, walker.vz);

          // GTA 5 style controller:
          // In 1st person: character faces camera direction.
          // In 3rd person: character turns smoothly towards movement direction when walking/sprinting;
          // when stationary (idle), character remains in place while the mouse freely orbits the camera 360 degrees.
          const airborne = props.planet === "mars" && (jump.height > 0 || jump.velocity > 0);
          if (!airborne && !third) {
            characterYaw = cameraYaw;
          } else if (!airborne && speed > 0.15) {
            const moveHeading = Math.atan2(-walker.vx, -walker.vz);
            const diff = shortestAngleDiff(characterYaw, moveHeading);
            characterYaw += diff * (1 - Math.exp(-14 * dt));
          }
          astronaut.rotation.y = characterYaw;

          if (p.enabled) footprints?.(walker.x, walker.z, characterYaw, jump.height < .04);

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
          const back = props.planet === "mars" ? 5.2 : 4.3;
          const shoulder = props.planet === "mars" ? 0.28 : 0.6;
          if (airborne) cameraGround = groundHeight;
          else cameraGround += (groundHeight - cameraGround) * (1 - Math.exp(-14 * dt));
          if (third) {
            // GTA 5 style spherical camera boom:
            // Target pivot on astronaut upper chest/shoulders
            const targetY = cameraGround + jump.height + (props.planet === "mars" ? 1.45 : 1.55);
            const horizBack = Math.cos(pitch) * back;
            const vertBack = -Math.sin(pitch) * back;
            desiredCamera.set(
              walker.x + Math.sin(cameraYaw) * horizBack + Math.cos(cameraYaw) * shoulder,
              targetY + vertBack,
              walker.z + Math.cos(cameraYaw) * horizBack - Math.sin(cameraYaw) * shoulder,
            );
            const groundUnderCam = model.heightAt(desiredCamera.x, desiredCamera.z);
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
        light.intensity = eclipse ? .22 : props.planet === "mars" ? 3.4 : 3.5;
        ambient.intensity = eclipse ? (props.planet === "mars" ? .60 : .65) : props.planet === "mars" ? .65 : 1.65;
        if (props.planet === "mars") {
          ambient.color.setHex(eclipse ? 0x7f9dca : 0xc5ccd5);
          ambient.groundColor.setHex(eclipse ? 0x312a36 : 0x77543e);
          light.color.setHex(eclipse ? 0x9ab4dc : 0xffe5c7);
          scene.environmentIntensity = eclipse ? .15 : .85;
          const shadowStep = 68 / light.shadow.mapSize.x;
          const sx = Math.round((walker.x - Math.sin(cameraYaw) * 15) / shadowStep) * shadowStep;
          const sz = Math.round((walker.z - Math.cos(cameraYaw) * 15) / shadowStep) * shadowStep;
          light.target.position.set(sx, 0, sz);
          light.position.copy(MARS_SUN_DIRECTION).multiplyScalar(100).add(light.target.position);
          starField.visible = eclipse; earth.visible = eclipse;
        }
        if (props.planet === "mars" && lastMarsNight !== eclipse) {
          scene.background = new T.Color(eclipse ? 0x111824 : 0xe3b6a1);
          scene.fog = new T.FogExp2(eclipse ? 0x232638 : 0xb3866b, eclipse ? 0.003 : 0.0022);
          if (marsSky) marsSky.uniforms.night.value = eclipse ? 1 : 0;
          if (dust) (dust.material as import("three").ShaderMaterial).uniforms.opacity.value = reduced.matches ? .025 : eclipse ? .045 : .09;
          if (bigRover) {
            bigRover.headlightL.castShadow = activeTier.shadows && eclipse;
            bigRover.headlightR.castShadow = false;
          }
          lastMarsNight = eclipse;
        }
        sun.visible = props.planet !== "mars" || !eclipse;
        earth.position.set(
          eclipse ? -70 : 65,
          eclipse ? 65 : 40,
          eclipse ? -179 : -170,
        );
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
            } else {
              const station = STATIONS.find((s) => s.id === hover);
              if (station) range = Math.hypot(walker.x - station.x, walker.z - station.z);
            }
          }
        }
        // On Mars, nearby equipment remains operable even when the crosshair
        // falls just beside a narrow object, which helps young explorers.
        if (props.planet === "mars" && (!hover || range > 5.5)) {
          // Scan in place rather than allocating and sorting a fresh array during play.
          for (const station of STATIONS) {
            const distance = Math.hypot(walker.x - station.x, walker.z - station.z);
            if (distance <= 5.5 && distance < range) { hover = station.id; range = distance; }
          }
          if (curiosity) {
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
            if (curiosityRover) curiosity = spawnCuriosityRover(model.obstacles, model.roverHeightAt);
            setRoverDriving(false);
            setRoverGear("N");
          }
          previousDay = p.day;
          keys.clear();
        }
        if (time - lastReport > 90) {
          lastReport = time;
          current.current.onView({
            x: walker.x,
            z: walker.z,
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
        cancelAnimationFrame(frame);
        observer.disconnect();
        element.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        element.removeEventListener("keydown", keydown);
        window.removeEventListener("keyup", keyup);
        window.removeEventListener("blur", blur);
        element.removeEventListener("blur", blur);
        document.removeEventListener("pointerlockchange", lockChange);
        if (document.pointerLockElement === element) document.exitPointerLock();
        renderer.dispose();
        disposeEffects();
        environment?.dispose();
        bigRover?.dispose();
        curiosityRover?.dispose();
        marsAstronaut?.dispose();
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
      frame = requestAnimationFrame(animate);
      setLoadingStage("Launching exploration…");
      setLoadingProgress(100);
      setLoaded(true);
      element.dataset.loadMs = (performance.now()-loadStarted).toFixed(0);
    }
    mount().catch(() => {
      setMessage(
        "3D is unavailable. Open the field guide for the accessible station controls.",
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
      role="application"
      aria-label={`${props.planet === "mars" ? "Mars" : "Lunar"} outpost. ${touchControlsActive ? "Use the left thumbstick to move, drag the screen to look around, and tap the right buttons to jump or inspect." : "WASD to walk. Drag to look or capture the mouse; Q and R also turn. Space jumps. V switches view. E inspects."}`}
      tabIndex={0}
    >
      {debug && props.planet === "mars" && <pre ref={debugPanel} className="mars-debug" aria-label="Graphics performance diagnostics">Collecting graphics measurements…</pre>}
      {!loaded && (
        <div className="sv-loading" role="status">{loadingStage}<br/><progress aria-label="Scene preparation progress" max={100} value={loadingProgress}/><span> {loadingProgress}%</span></div>
      )}
      {props.enabled && (
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
                  {locked ? "Release mouse · Esc" : "Capture mouse for 360° look"}
                </button>
                <span>Drag to look, or capture the mouse · Q/R turn · V changes view</span>
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
            {props.planet === "mars" && <label>Graphics <select aria-label="Graphics quality" value={quality} onChange={e => setQuality(e.target.value)}>
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
      {message && <p className="sv-world-message" role="status">{message}</p>}
    </div>
  );
});
export default SurvivalWorld;
