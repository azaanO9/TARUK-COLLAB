"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Mesh, MeshStandardMaterial, Object3D } from "three";
import { STATIONS } from "../content/survival";
import { spawnWalker, stepWalker, stepJump } from "../game/navigation";
import { MARS_PHYSICS } from "../game/marsConfig";
import { createSageCompanion } from "./world/createSageCompanion";
import { createMarsSky, createMarsFootprints, marsHeight } from "./world/marsTerrain";
import { createMarsAstronaut } from "./world/marsDetails";
import type { Effect } from "../game/survivalTypes";
export type View = {
  x: number;
  z: number;
  yaw: number;
  target: string | null;
  distance: number;
  locked: boolean;
  jumpHeight: number;
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
  onInspect: (id: string) => void;
  onView: (view: View) => void;
  onUnavailable: () => void;
};
export type SurvivalWorldHandle = { captureMouse: () => void };
const SurvivalWorld = forwardRef<SurvivalWorldHandle, Props>(function SurvivalWorld(props, ref) {
  const host = useRef<HTMLDivElement>(null),
    current = useRef(props);
  const aim = useRef<HTMLDivElement>(null);
  current.current = props;
  const controls = useRef(new Set<string>()),
    lockAction = useRef<() => void>(() => {});
  useImperativeHandle(ref, () => ({ captureMouse: () => lockAction.current() }), []);
  const [loaded, setLoaded] = useState(false),
    [locked, setLocked] = useState(false),
    [message, setMessage] = useState(""),
    [thirdPerson, setThirdPerson] = useState(true),
    [sensitivity, setSensitivity] = useState(1),
    [quality, setQuality] = useState(props.planet === "mars" ? "auto" : "high");
  const cameraSettings = useRef({ thirdPerson, sensitivity, quality });
  cameraSettings.current = { thirdPerson, sensitivity, quality };
  useEffect(() => {
    if (props.enabled) host.current?.focus({ preventScroll: true });
    else {
      controls.current.clear();
      if (document.pointerLockElement === host.current)
        document.exitPointerLock();
    }
  }, [props.enabled]);
  useEffect(() => {
    let cancelled = false,
      dispose = () => {};
    async function mount() {
      const [T, { createSurvivalOutpost }] = await Promise.all([
        import("three"),
        import("./world/createSurvivalOutpost"),
      ]);
      if (cancelled || !host.current) return;
      const element = host.current;
      const renderer = new T.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, props.planet === "mars" ? 1.25 : 1.7));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = props.planet === "mars" ? 1.05 : 1.15;
      renderer.info.autoReset = false;
      renderer.domElement.setAttribute("aria-hidden", "true");
      element.insertBefore(renderer.domElement, element.firstChild);
      const scene = new T.Scene();
      let environment: import("three").WebGLRenderTarget | null = null;
      if (props.planet === "mars") {
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        if (cancelled) { renderer.dispose(); renderer.domElement.remove(); return; }
        const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment();
        environment = pmrem.fromScene(room, .04);
        scene.environment = environment.texture; scene.environmentIntensity = .38;
        room.dispose(); pmrem.dispose();
      }
      scene.background = new T.Color(0x090e18);
      scene.fog = new T.FogExp2(0x333b48, 0.0024);
      const camera = new T.PerspectiveCamera(72, 1, 0.08, 500);
      camera.rotation.order = "YXZ";
      const light = new T.DirectionalLight(0xffe5c7, 3.5);
      light.position.set(-55, props.planet === "mars" ? 28 : 60, -80);
      light.castShadow = true;
      light.shadow.mapSize.set(props.planet === "mars" ? 1024 : 2048, props.planet === "mars" ? 1024 : 2048);
      Object.assign(light.shadow.camera, {
        left: -55,
        right: 55,
        top: 55,
        bottom: -55,
        near: 1,
        far: 220,
      });
      light.shadow.bias = -0.00015;
      light.shadow.normalBias = 0.035;
      scene.add(light);
      const ambient = new T.HemisphereLight(0xbccfe1, 0x55504c, 1.65);
      scene.add(ambient);
      const model = createSurvivalOutpost(scene, props.planet);
      const beacon = props.planet === "mars" ? new T.Group() : null;
      if (beacon) {
        const beam = new T.Mesh(new T.CylinderGeometry(.12, .4, 8, 16, 1, true), new T.MeshBasicMaterial({color:0x8ef7e1, transparent:true, opacity:.3, depthWrite:false, side:T.DoubleSide}));
        beam.position.y = 4; beacon.add(beam);
        const marker = new T.Mesh(new T.OctahedronGeometry(.5), new T.MeshBasicMaterial({color:0xb0fff1})); marker.position.y=8; beacon.add(marker);
        scene.add(beacon);
      }
      const footprints = props.planet === "mars" ? createMarsFootprints(scene) : null;
      const sage = props.planet === "mars" ? createSageCompanion() : null;
      if (sage) { sage.scale.setScalar(.78); sage.position.set(1.8, 0, 12.5); scene.add(sage); }
      const marsSky = props.planet === "mars" ? createMarsSky(scene) : null;
      let dust: import("three").Points | null = null;
      if (props.planet === "mars") {
        const dustPositions = new Float32Array(260 * 3);
        for (let i = 0; i < 260; i++) {
          dustPositions[i * 3] = ((i * 19.17) % 34) - 17;
          dustPositions[i * 3 + 1] = 0.12 + ((i * 7.91) % 5);
          dustPositions[i * 3 + 2] = ((i * 13.37) % 34) - 17;
        }
        const dustGeometry = new T.BufferGeometry();
        dustGeometry.setAttribute("position", new T.BufferAttribute(dustPositions, 3));
        const dustCanvas = document.createElement("canvas"); dustCanvas.width = dustCanvas.height = 32;
        const dc = dustCanvas.getContext("2d");
        if (dc) { const glow = dc.createRadialGradient(16, 16, 1, 16, 16, 16); glow.addColorStop(0, "rgba(255,255,255,.8)"); glow.addColorStop(1, "rgba(255,255,255,0)"); dc.fillStyle = glow; dc.fillRect(0, 0, 32, 32); }
        const dustTexture = new T.CanvasTexture(dustCanvas);
        dust = new T.Points(dustGeometry, new T.PointsMaterial({ map: dustTexture, color: 0xe3ae82, size: 0.11, transparent: true, opacity: 0.35, depthWrite: false, sizeAttenuation: true }));
        dust.frustumCulled = false;
        scene.add(dust);
      }
      const astronaut = new T.Group();
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
      const marsAstronaut = props.planet === "mars" ? createMarsAstronaut() : null;
      if (marsAstronaut) { astronaut.clear(); astronaut.add(marsAstronaut.root); }
      const sun = new T.Mesh(
        new T.SphereGeometry(4, 24, 16),
        new T.MeshBasicMaterial({ color: 0xfff1ce, fog: false, toneMapped: false }),
      );
      sun.position.set(-110, props.planet === "mars" ? 56 : 65, -160);
      scene.add(sun);
      const earth = new T.Mesh(
        new T.SphereGeometry(5, 28, 20),
        new T.MeshStandardMaterial({ color: 0x5b9fba, roughness: 1 }),
      );
      earth.position.set(65, 40, -170);
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
      if (props.planet === "mars") {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { GTAOPass }] = await Promise.all([
          import("three/examples/jsm/postprocessing/EffectComposer.js"),
          import("three/examples/jsm/postprocessing/RenderPass.js"),
          import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
          import("three/examples/jsm/postprocessing/OutputPass.js"),
          import("three/examples/jsm/postprocessing/GTAOPass.js"),
        ]);
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        occlusion = new GTAOPass(scene, camera, 512, 512);
        occlusion.updateGtaoMaterial({ radius: .55, thickness: .7, distanceFallOff: 1, samples: 8 });
        occlusion.blendIntensity = .65; occlusion.enabled = false;
        composer.addPass(occlusion);
        composer.addPass(new UnrealBloomPass(new T.Vector2(512, 512), .15, .5, 1.25));
        composer.addPass(new OutputPass());
      }
      const keys = controls.current,
        mouse = new T.Vector2(0, 0),
        ray = new T.Raycaster();
      let walker = spawnWalker(),
        jump = { height: 0, velocity: 0 },
        pitch = -0.04,
        dragging = false,
        px = 0,
        py = 0,
        frame = 0,
        last = 0,
        lastReport = 0,
        hover: string | null = null,
        range = Infinity,
        previousDay = -1,
        lastMarsNight: boolean | null = null,
        captureDenied = false;
      let lastQuality = cameraSettings.current.quality;
      let metricStart = 0, metricFrames = 0;
      let lastAimCheck = 0, resolutionScale = Math.min(devicePixelRatio, 1.25), qualityStart = 0;
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
        if (current.current.enabled && hover && range <= 5.5)
          current.current.onInspect(hover);
      };
      const down = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest("button")) return;
        const rect = element.getBoundingClientRect();
        mouse.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        element.focus();
        if (!current.current.enabled) return;
        dragging = true;
        px = e.clientX;
        py = e.clientY;
        if (e.pointerType === "mouse" && e.target === renderer.domElement && document.pointerLockElement !== element && !captureDenied) lockAction.current();
      };
      const move = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest?.(".sv-target")) return;
        const rect = element.getBoundingClientRect();
        mouse.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        if (!current.current.enabled) return;
        if (document.pointerLockElement === element) {
          walker.yaw -=
            e.movementX * 0.0023 * cameraSettings.current.sensitivity;
          pitch = Math.max(
            -1.2,
            Math.min(
              1.2,
              pitch - e.movementY * 0.0023 * cameraSettings.current.sensitivity,
            ),
          );
        } else if (
          current.current.enabled &&
          dragging
        ) {
          walker.yaw -=
            (e.clientX - px) * 0.0023 * cameraSettings.current.sensitivity;
          pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - py) * 0.0023 * cameraSettings.current.sensitivity));
          px = e.clientX;
          py = e.clientY;
        }
      };
      const up = () => {
        dragging = false;
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
        if (e.code === "Space" && !e.repeat) {
          e.preventDefault();
          keys.add("jump");
        }
      };
      const keyup = (e: KeyboardEvent) => {
        keys.delete(e.key.toLowerCase());
        if (e.key.toLowerCase() === "q") keys.delete("look-left");
        if (e.key.toLowerCase() === "r") keys.delete("look-right");
      };
      const blur = () => {
        keys.clear();
        dragging = false;
      };
      const lockChange = () => {
        const captured = document.pointerLockElement === element;
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
      element.addEventListener("keydown", keydown);
      window.addEventListener("keyup", keyup);
      window.addEventListener("blur", blur);
      element.addEventListener("blur", blur);
      document.addEventListener("pointerlockchange", lockChange);
      renderer.domElement.addEventListener("webglcontextlost", lost);
      function animate(time: number) {
        frame = requestAnimationFrame(animate);
        if (document.hidden) {
          last = time;
          keys.clear();
          return;
        }
        const dt = last ? Math.min((time - last) / 1000, 0.1) : 1 / 60;
        last = time;
        const p = current.current;
        if (beacon) { const destination = STATIONS.find(s => s.id === p.target); if (destination) beacon.position.set(destination.x, model.heightAt(destination.x,destination.z),destination.z); }
        if (cameraSettings.current.quality !== lastQuality) {
          lastQuality = cameraSettings.current.quality;
          resolutionScale = Math.min(devicePixelRatio, lastQuality === "ultra" ? 2 : lastQuality === "high" ? 1.5 : lastQuality === "auto" ? 1.25 : 1);
          renderer.setPixelRatio(resolutionScale);
          renderer.shadowMap.enabled = lastQuality !== "performance";
          if (occlusion) occlusion.enabled = lastQuality === "ultra";
          scene.traverse(o => { if (o instanceof T.Mesh) {
            for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true;
          } });
          resize();
          qualityStart = time;
        }
        if (p.enabled) {
          // Small physics steps keep acceleration and jumping consistent across slower frames.
          const steps = Math.max(1, Math.ceil(dt / (1 / 120))), step = dt / steps;
          for (let i = 0; i < steps; i++) {
            walker = stepWalker(walker, keys, step, model.obstacles, props.planet === "mars" && keys.has("shift") ? MARS_PHYSICS.sprintSpeed : undefined);
            jump = stepJump(jump, i === 0 && keys.has("jump"), step, props.planet === "mars" ? MARS_PHYSICS.gravity : undefined);
          }
          keys.delete("jump");
          if (keys.has("look-left")) walker.yaw += dt * 1.3;
          if (keys.has("look-right")) walker.yaw -= dt * 1.3;
        }
        const third = cameraSettings.current.thirdPerson;
        astronaut.visible = third;
        const groundHeight = model.heightAt(walker.x, walker.z);
        astronaut.position.set(walker.x, groundHeight + jump.height, walker.z);
        if (p.enabled) footprints?.(walker.x, walker.z, walker.yaw, jump.height < .04);
        astronaut.rotation.y = walker.yaw;
        if (sage) {
          const sx = walker.x + Math.cos(walker.yaw) * 1.8 + Math.sin(walker.yaw) * .5;
          const sz = walker.z - Math.sin(walker.yaw) * 1.8 + Math.cos(walker.yaw) * .5;
          const blend = 1 - Math.exp(-6 * dt);
          sage.position.x += (sx - sage.position.x) * blend;
          sage.position.z += (sz - sage.position.z) * blend;
          sage.rotation.y = walker.yaw + Math.PI;
          sage.position.y = model.heightAt(sage.position.x, sage.position.z);
        }
        if (dust) {
          dust.position.set(walker.x + (reduced.matches ? 0 : Math.sin(time * 0.00015) * 3), groundHeight, walker.z);
          dust.rotation.y = reduced.matches ? 0 : time * 0.000018;
        }
        const speed = Math.hypot(walker.vx, walker.vz);
        gaitPhase += speed * dt * 2.4;
        gaitBlend += ((speed > .3 && jump.height < .1 ? 1 : 0) - gaitBlend) * (1 - Math.exp(-12 * dt));
        const stride = reduced.matches ? 0 : Math.sin(gaitPhase) * .38 * gaitBlend;
        marsAstronaut?.animate(stride, jump.height > .1);
        leftLeg.rotation.x = stride;
        rightLeg.rotation.x = -stride;
        leftArm.rotation.x = -stride * 0.65;
        rightArm.rotation.x = stride * 0.65;
        const back = third ? 4.3 : 0;
        const shoulder = third ? 0.8 : 0;
        cameraGround += (groundHeight - cameraGround) * (1 - Math.exp(-14 * dt));
        camera.position.set(
          walker.x + Math.sin(walker.yaw) * back + Math.cos(walker.yaw) * shoulder,
          cameraGround + (third ? (props.planet === "mars" ? 2.8 : 3.1) : 1.7) + jump.height,
          walker.z + Math.cos(walker.yaw) * back - Math.sin(walker.yaw) * shoulder,
        );
        if (props.planet === "mars" && third) camera.position.y = Math.max(camera.position.y, marsHeight(camera.position.x, camera.position.z) + .45);
        camera.rotation.set(pitch, walker.yaw, 0, "YXZ");
        if (aim.current) {
          aim.current.style.left = "50%";
          aim.current.style.top = "50%";
        }
        const eclipse = p.event === "eclipse" || p.event === "night";
        light.intensity = eclipse ? .18 : props.planet === "mars" ? 3.4 : 3.5;
        ambient.intensity = eclipse ? (props.planet === "mars" ? .4 : .65) : props.planet === "mars" ? 1.2 : 1.65;
        if (props.planet === "mars") {
          ambient.color.setHex(eclipse ? 0x7f9dca : 0xd0bca0);
          ambient.groundColor.setHex(eclipse ? 0x312a36 : 0x77543e);
          light.color.setHex(eclipse ? 0x9ab4dc : 0xffe5c7);
          scene.environmentIntensity = eclipse ? .12 : .38;
          starField.visible = eclipse; earth.visible = false;
        }
        if (props.planet === "mars" && lastMarsNight !== eclipse) {
          scene.background = new T.Color(eclipse ? 0x111824 : 0xe3b6a1);
          scene.fog = new T.FogExp2(eclipse ? 0x23212a : 0xb28a70, eclipse ? 0.003 : 0.0038);
          if (marsSky) marsSky.uniforms.night.value = eclipse ? 1 : 0;
          if (dust) (dust.material as import("three").PointsMaterial).opacity = eclipse ? 0.12 : 0.35;
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
        const hit = ray.intersectObjects(model.targets, true)[0];
        hover = null;
        range = Infinity;
        if (hit && hit.distance < 65) {
          let o: Object3D | null = hit.object;
          while (o && !o.userData.station) o = o.parent;
          if (o) {
            hover = o.userData.station;
            const station = STATIONS.find((s) => s.id === hover)!;
            range = Math.hypot(walker.x - station.x, walker.z - station.z);
          }
        }
        // On Mars, nearby equipment remains operable even when the crosshair
        // falls just beside a narrow object, which helps young explorers.
        if (props.planet === "mars" && (!hover || range > 5.5)) {
          const nearest = STATIONS.map((station) => ({ station, distance: Math.hypot(walker.x - station.x, walker.z - station.z) })).sort((a, b) => a.distance - b.distance)[0];
          if (nearest.distance <= 5.5) { hover = nearest.station.id; range = nearest.distance; }
        }
        }
        const pulse =
          !reduced.matches && p.animating
            ? 0.4 + Math.sin(time * 0.006) * 0.2
            : 0.5;
        for (const station of STATIONS) {
          const m = model.indicators[station.id];
          const selected = station.id === p.target;
          m.color.setHex(selected ? 0xeeb975 : 0x72b8ac);
          m.emissive.setHex(selected ? 0x9f672b : 0x15594e);
          m.emissiveIntensity = selected ? 0.6 : 0.3;
        }
        const effect = p.failure ? p.effect : null;
        if (p.event === "flare" || p.event === "particles") {
          model.indicators.monitor.color.setHex(0xefad71);
          model.indicators.monitor.emissive.setHex(0x9a4d23);
          model.indicators.monitor.emissiveIntensity = 0.6;
        }
        for (const panel of model.panels)
          (panel.material as MeshStandardMaterial).color.setHex(
            effect === "dust" ? 0x555254 : p.day > 0 ? 0x255680 : 0x536071,
          );
        model.habitatWindow.emissiveIntensity =
          effect === "power" || effect === "dust" ? 0.05 : 0.7;
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
            walker = spawnWalker();
            jump = { height: 0, velocity: 0 };
            pitch = -0.04;
            mouse.set(0, 0);
          }
          previousDay = p.day;
          keys.clear();
        }
        if (time - lastReport > 90) {
          lastReport = time;
          current.current.onView({
            x: walker.x,
            z: walker.z,
            yaw: walker.yaw,
            target: hover,
            distance: range,
            locked: document.pointerLockElement === element,
            jumpHeight: jump.height,
          });
        }
        renderer.info.reset();
        if (composer && (lastQuality === "high" || lastQuality === "ultra")) composer.render();
        else renderer.render(scene, camera);
        metricFrames++;
        if (time - metricStart > 1000) {
          element.dataset.fps = (metricFrames * 1000 / (time - metricStart)).toFixed(1);
          element.dataset.renderCalls = String(renderer.info.render.calls);
          element.dataset.staticDrawCallsSaved = String(model.root.userData.staticDrawCallsSaved ?? 0);
          element.dataset.sageX = sage?.position.x.toFixed(2) ?? "";
          element.dataset.sageZ = sage?.position.z.toFixed(2) ?? "";
          element.dataset.sageScale = sage?.scale.x.toFixed(2) ?? "";
          element.dataset.resolutionScale = resolutionScale.toFixed(2);
          const fps = metricFrames * 1000 / (time - metricStart);
          if (lastQuality === "auto" && p.enabled && time - qualityStart > 3000) {
            const next = Math.max(.7, Math.min(devicePixelRatio, 1.25, resolutionScale + (fps < 48 ? -.15 : fps > 58 ? .05 : 0)));
            if (Math.abs(next - resolutionScale) > .01) { resolutionScale = next; renderer.setPixelRatio(next); resize(); }
            qualityStart = time;
          }
          metricStart = time; metricFrames = 0;
        }
      }
      frame = requestAnimationFrame(animate);
      setLoaded(true);
      dispose = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        element.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        element.removeEventListener("keydown", keydown);
        window.removeEventListener("keyup", keyup);
        window.removeEventListener("blur", blur);
        element.removeEventListener("blur", blur);
        document.removeEventListener("pointerlockchange", lockChange);
        if (document.pointerLockElement === element) document.exitPointerLock();
        renderer.dispose();
        if (composer) { for (const pass of composer.passes) pass.dispose(); composer.dispose(); }
        environment?.dispose();
        scene.traverse((o) => {
          const m = o as Mesh;
          m.geometry?.dispose();
          if (m.material) {
            for (const material of Array.isArray(m.material)
              ? m.material
              : [m.material])
              { const mapped = material as import("three").MeshStandardMaterial; mapped.map?.dispose(); mapped.bumpMap?.dispose(); material.dispose(); }
          }
        });
        renderer.domElement.remove();
      };
      if (cancelled) dispose();
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
  function touch(key: string, on: boolean) {
    if (on) {
      host.current?.focus();
      controls.current.add(key);
    } else controls.current.delete(key);
  }
  return (
    <div
      ref={host}
      className="sv-world"
      role="application"
      aria-label={`${props.planet === "mars" ? "Mars" : "Lunar"} outpost. WASD to walk. Move the mouse to look. Space jumps. V switches view. E inspects.`}
      tabIndex={0}
    >
      {!loaded && (
        <div className="sv-loading">PREPARING EXPEDITION…</div>
      )}
      {props.enabled && (
        <>
          <div ref={aim} className="sv-aim" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="sv-look-controls">
            <details open={props.planet !== "mars" ? true : undefined}>
            <summary>Camera &amp; graphics</summary>
            <button onClick={() => lockAction.current()}>
              {locked ? "Release mouse · Esc" : "Capture mouse for 360° look"}
            </button>
            <span>Move mouse to look · V changes view</span>
            <label>
              Mouse sensitivity{" "}
              <input
                aria-label="Mouse sensitivity"
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
              />
            </label>
            <button onClick={() => setThirdPerson((v) => !v)}>
              {thirdPerson ? "Third person · V" : "First person · V"}
            </button>
            {props.planet === "mars" && <label>Graphics <select aria-label="Graphics quality" value={quality} onChange={e => setQuality(e.target.value)}>
              <option value="auto">Auto · smoother</option><option value="performance">Performance</option><option value="high">High</option><option value="ultra">Ultra</option>
            </select></label>}
            </details>
          </div>
          {props.showTouchControls && <div className="sv-touch-controls" aria-label="Movement controls">
            {[
              ["w", "Walk forward", "↑"],
              ["a", "Walk left", "←"],
              ["s", "Walk backward", "↓"],
              ["d", "Walk right", "→"],
              ["look-left", "Look left", "↶"],
              ["look-right", "Look right", "↷"],
              ["jump", "Jump", "⤒"],
            ].map(([key, label, symbol]) => (
              <button
                key={key}
                aria-label={label}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  touch(key, true);
                }}
                onPointerUp={() => touch(key, false)}
                onPointerCancel={() => touch(key, false)}
                onLostPointerCapture={() => touch(key, false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") touch(key, true);
                }}
                onKeyUp={() => touch(key, false)}
                onBlur={() => touch(key, false)}
              >
                {symbol}
              </button>
            ))}
          </div>}
        </>
      )}
      {message && <p className="sv-world-message">{message}</p>}
    </div>
  );
});
export default SurvivalWorld;
