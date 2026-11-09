"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Mesh, MeshStandardMaterial, Object3D } from "three";
import { STATIONS } from "../content/survival";
import { spawnWalker, stepWalker, stepJump } from "../game/navigation";
import { MARS_PHYSICS } from "../game/marsConfig";
import { createSageCompanion } from "./world/createSageCompanion";
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
    [sensitivity, setSensitivity] = useState(1);
  const cameraSettings = useRef({ thirdPerson, sensitivity });
  cameraSettings.current = { thirdPerson, sensitivity };
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
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.setAttribute("aria-hidden", "true");
      element.insertBefore(renderer.domElement, element.firstChild);
      const scene = new T.Scene();
      scene.background = new T.Color(0x090e18);
      scene.fog = new T.FogExp2(0x333b48, 0.0024);
      const camera = new T.PerspectiveCamera(72, 1, 0.08, 500);
      camera.rotation.order = "YXZ";
      const light = new T.DirectionalLight(0xffe5c7, 3.5);
      light.position.set(-40, 60, -80);
      light.castShadow = true;
      light.shadow.mapSize.set(2048, 2048);
      Object.assign(light.shadow.camera, {
        left: -40,
        right: 40,
        top: 40,
        bottom: -40,
      });
      light.shadow.bias = -0.001;
      scene.add(light);
      const ambient = new T.HemisphereLight(0xbccfe1, 0x55504c, 1.65);
      scene.add(ambient);
      const model = createSurvivalOutpost(scene, props.planet);
      const sage = props.planet === "mars" ? createSageCompanion() : null;
      if (sage) { sage.position.set(-2.1, 0, 10.7); scene.add(sage); }
      let marsHorizon: import("three").Mesh | null = null;
      let dust: import("three").Points | null = null;
      if (props.planet === "mars") {
        const horizonTexture = new T.TextureLoader().load("/art/mars-horizon.png");
        horizonTexture.colorSpace = T.SRGBColorSpace;
        const horizonGeometry = new T.CylinderGeometry(125, 125, 100, 64, 1, true);
        marsHorizon = new T.Mesh(
          horizonGeometry,
          new T.MeshBasicMaterial({ map: horizonTexture, side: T.BackSide, fog: false }),
        );
        marsHorizon.position.y = 25;
        scene.add(marsHorizon);
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
      if (props.planet === "mars") {
        // Use NASA's downloadable model when available; retain the original as fallback.
        const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/loaders/DRACOLoader.js"),
        ]);
        const draco = new DRACOLoader();
        draco.setDecoderPath("/draco/");
        new GLTFLoader().setDRACOLoader(draco).load("/models/nasa-astronaut.glb", (gltf) => {
          if (cancelled) return;
          gltf.scene.rotation.y = Math.PI;
          gltf.scene.updateMatrixWorld(true);
          const bounds = new T.Box3().setFromObject(gltf.scene);
          const size = new T.Vector3(); bounds.getSize(size);
          if (!size.y) return;
          const scale = 1.85 / size.y;
          gltf.scene.scale.setScalar(scale);
          gltf.scene.position.set(-(bounds.min.x + bounds.max.x) * scale / 2, -bounds.min.y * scale, -(bounds.min.z + bounds.max.z) * scale / 2);
          astronaut.children.forEach((child) => { child.visible = false; });
          astronaut.add(gltf.scene);
          // The unrigged NASA model's backpack hides its small helmet from the chase camera.
          // A clear outer helmet silhouette keeps the player's head readable.
          part(new T.SphereGeometry(0.27, 24, 16), suit, 0, 1.76, 0);
          part(new T.SphereGeometry(0.22, 20, 14), visor, 0, 1.78, -0.19).scale.set(1, 0.72, 0.4);
          draco.dispose();
        }, undefined, () => { draco.dispose(); });
      }
      const sun = new T.Mesh(
        new T.SphereGeometry(4, 24, 16),
        new T.MeshBasicMaterial({ color: 0xffecc4 }),
      );
      sun.position.set(-70, 65, -180);
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
      scene.add(
        new T.Points(sg, new T.PointsMaterial({ size: 0.3, color: 0xdbe7ed })),
      );
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
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const resize = () => {
        camera.aspect = element.clientWidth / element.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(element.clientWidth, element.clientHeight);
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
            e.movementX * 0.0023 * cameraSettings.current.sensitivity;
          pitch = Math.max(
            -1.2,
            Math.min(
              1.2,
              pitch - e.movementY * 0.0023 * cameraSettings.current.sensitivity,
            ),
          );
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
        const dt = Math.min((time - last) / 1000, 0.05);
        last = time;
        const p = current.current;
        if (p.enabled) {
          walker = stepWalker(walker, keys, dt, model.obstacles, props.planet === "mars" && keys.has("shift") ? MARS_PHYSICS.sprintSpeed : undefined);
          jump = stepJump(jump, keys.has("jump"), dt, props.planet === "mars" ? MARS_PHYSICS.gravity : undefined);
          keys.delete("jump");
          if (keys.has("look-left")) walker.yaw += dt * 1.3;
          if (keys.has("look-right")) walker.yaw -= dt * 1.3;
        }
        const third = cameraSettings.current.thirdPerson;
        astronaut.visible = third;
        astronaut.position.set(walker.x, jump.height, walker.z);
        astronaut.rotation.y = walker.yaw;
        if (sage) {
          const sx = walker.x - Math.cos(walker.yaw) * 2.1 - Math.sin(walker.yaw) * 1.3;
          const sz = walker.z + Math.sin(walker.yaw) * 2.1 - Math.cos(walker.yaw) * 1.3;
          const blend = 1 - Math.exp(-2.5 * dt);
          sage.position.x += (sx - sage.position.x) * blend;
          sage.position.z += (sz - sage.position.z) * blend;
          sage.rotation.y = walker.yaw + Math.PI;
        }
        if (dust) {
          dust.position.set(walker.x + (reduced.matches ? 0 : Math.sin(time * 0.00015) * 3), 0, walker.z);
          dust.rotation.y = reduced.matches ? 0 : time * 0.000018;
        }
        const moving = Math.hypot(walker.vx, walker.vz) > 0.3;
        const stride =
          moving && !reduced.matches ? Math.sin(time * 0.012) * 0.38 : 0;
        leftLeg.rotation.x = stride;
        rightLeg.rotation.x = -stride;
        leftArm.rotation.x = -stride * 0.65;
        rightArm.rotation.x = stride * 0.65;
        const back = third ? 4.3 : 0;
        const shoulder = third ? 0.8 : 0;
        camera.position.set(
          walker.x + Math.sin(walker.yaw) * back + Math.cos(walker.yaw) * shoulder,
          (third ? 3.1 : 1.7) + jump.height,
          walker.z + Math.cos(walker.yaw) * back - Math.sin(walker.yaw) * shoulder,
        );
        camera.rotation.set(pitch, walker.yaw, 0, "YXZ");
        if (aim.current) {
          aim.current.style.left = "50%";
          aim.current.style.top = "50%";
        }
        const eclipse = p.event === "eclipse" || p.event === "night";
        light.intensity = eclipse ? 0.18 : 3.5;
        ambient.intensity = eclipse ? 0.65 : 1.65;
        if (props.planet === "mars" && lastMarsNight !== eclipse) {
          scene.background = new T.Color(eclipse ? 0x111824 : 0xe3b6a1);
          scene.fog = new T.FogExp2(eclipse ? 0x23212a : 0xa77359, eclipse ? 0.004 : 0.0045);
          if (marsHorizon) marsHorizon.visible = !eclipse;
          if (dust) (dust.material as import("three").PointsMaterial).opacity = eclipse ? 0.12 : 0.35;
          lastMarsNight = eclipse;
        }
        sun.visible = true;
        earth.position.set(
          eclipse ? -70 : 65,
          eclipse ? 65 : 40,
          eclipse ? -179 : -170,
        );
        ray.setFromCamera(new T.Vector2(0, 0), camera);
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
        renderer.render(scene, camera);
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
        scene.traverse((o) => {
          const m = o as Mesh;
          m.geometry?.dispose();
          if (m.material) {
            for (const material of Array.isArray(m.material)
              ? m.material
              : [m.material])
              { const mapped = material as import("three").MeshStandardMaterial; mapped.map?.dispose(); material.dispose(); }
          }
        });
        renderer.domElement.remove();
      };
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
        <div className="sv-loading">BUILDING TRANQUILITY OUTPOST…</div>
      )}
      {props.enabled && (
        <>
          <div ref={aim} className="sv-aim" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="sv-look-controls">
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
