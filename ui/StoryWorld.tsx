"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ScanLine } from "lucide-react";
import type { Evidence, Place, StoryPhase } from "../game/storyTypes";

type Props = {
  chapter: number;
  phase: StoryPhase;
  place: Place;
  evidence: readonly Evidence[];
  found: string[];
  activeEvidence: string | null;
  completed: string[];
  orbit: number;
  onInspect: (id: string) => void;
  failedChoiceId?: string | null;
  isConsequenceAnimating?: boolean;
};
const cameraViews: Record<
  Place,
  { eye: [number, number, number]; look: [number, number, number] }
> = {
  solar: { eye: [11, 5.4, 17], look: [-0.8, 1, 0.8] },
  water: { eye: [11, 4.2, 11], look: [0.8, 1.3, -0.5] },
  airlock: { eye: [8, 3.8, 13], look: [0.2, 1.4, -0.4] },
  rover: { eye: [10, 3.8, 14], look: [1.1, 0.9, 1.5] },
  sample: { eye: [2, 4.3, 16], look: [-2.4, 1.1, -0.6] },
  antenna: { eye: [10, 4.4, 15], look: [-0.3, 1.8, -0.7] },
};

const consequenceCameraViews: Record<
  Place,
  { eye: [number, number, number]; look: [number, number, number] }
> = {
  solar: { eye: [1, 2.8, 7.5], look: [-2.2, 0.9, 2.3] },
  water: { eye: [7.5, 3.2, 8.5], look: [2.0, 1.1, -1.2] },
  airlock: { eye: [5.2, 2.4, 4.8], look: [1.7, 0.8, 0.5] },
  rover: { eye: [6.4, 2.2, 5.6], look: [3.4, 0.6, 2.4] },
  sample: { eye: [-0.8, 2.6, 2.8], look: [-3.8, 0.9, -1.8] },
  antenna: { eye: [5.8, 3.8, 7.2], look: [-0.7, 3.0, -0.8] },
};

/** 3D input reports object IDs only. All discovery and outcome rules live in storyEngine. */
export default function StoryWorld(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = useRef(props);
  current.current = props;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    async function mount() {
      const [T, { createOutpost }] = await Promise.all([
        import("three"),
        import("./world/createOutpost"),
      ]);
      const element = host.current!;
      if (!element || cancelled) return;
      const renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.domElement.setAttribute("aria-hidden", "true");
      element.appendChild(renderer.domElement);
      const scene = new T.Scene();
      scene.fog = new T.FogExp2(0x121c2b, 0.012);
      const camera = new T.PerspectiveCamera(43, 1, 0.1, 250);
      const ambient = new T.HemisphereLight(0xd8e5ff, 0x4e4552, 2.0);
      const sun = new T.DirectionalLight(0xffe5bf, 4.0);
      sun.position.set(-9, 16, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, {
        left: -13,
        right: 13,
        top: 13,
        bottom: -13,
      });
      sun.shadow.bias = -0.0007;
      const rim = new T.DirectionalLight(0x99b9ef, 1.2);
      rim.position.set(5, 6, -9);
      scene.add(ambient, sun, rim);
      const model = createOutpost(scene);
      // An original, illustrative Earth and star field; no external assets required.
      const earth = new T.Mesh(
        new T.SphereGeometry(1.45, 40, 24),
        new T.MeshStandardMaterial({ color: 0x577f9d, roughness: 0.9 }),
      );
      earth.position.set(-8, 6, -33);
      scene.add(earth);
      for (let i = 0; i < 8; i++) {
        const land = new T.Mesh(
          new T.SphereGeometry(0.4 + (i % 3) * 0.08, 16, 12),
          new T.MeshStandardMaterial({
            color: i % 3 === 0 ? 0xe1e1d2 : 0x82a59b,
          }),
        );
        const a = i * 2.399;
        const y = -0.9 + i * 0.24;
        const r = Math.sqrt(Math.max(0, 1.9 - y * y));
        land.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
        land.scale.set(1, 0.55, 0.18);
        land.lookAt(0, 0, 0);
        earth.add(land);
      }
      const stars = new Float32Array(500 * 3);
      for (let i = 0; i < 500; i++) {
        stars[i * 3] = Math.sin(i * 32.7) * 110;
        stars[i * 3 + 1] = 7 + (Math.cos(i * 8.3) * 0.5 + 0.5) * 65;
        stars[i * 3 + 2] = -30 - (Math.sin(i * 7.1) * 0.5 + 0.5) * 100;
      }
      const starGeometry = new T.BufferGeometry();
      starGeometry.setAttribute("position", new T.BufferAttribute(stars, 3));
      const starField = new T.Points(
        starGeometry,
        new T.PointsMaterial({
          color: 0xc5d6e8,
          size: 0.12,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.75,
        }),
      );
      scene.add(starField);
      const ring = new T.Mesh(
        new T.RingGeometry(0.31, 0.36, 48),
        new T.MeshBasicMaterial({
          color: 0xf3bc79,
          side: T.DoubleSide,
          transparent: true,
          opacity: 0.8,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.025;
      scene.add(ring);
      const beacon = new T.PointLight(0xffa75b, 1.0, 5);
      beacon.position.set(1.7, 1.4, 0.8);
      scene.add(beacon);
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const look = new T.Vector3(0, 0.5, 0);
      const destination = new T.Vector3(...cameraViews.solar.eye);
      const lookTarget = new T.Vector3(...cameraViews.solar.look);
      camera.position.copy(destination);
      const walkerTarget = model.astronaut.position.clone();
      const scratch = new T.Vector3();
      let previousChapter = -1,
        previousEvidence: string | null = null,
        orbitVersion = props.orbit;
      let yaw = 0,
        targetYaw = 0,
        pitch = 0,
        frame = 0,
        last = 0,
        dragging = false,
        pointerX = 0,
        pointerY = 0;
      const pressed = new Set<string>();
      const resize = new ResizeObserver(() => {
        if (!element.clientWidth || !element.clientHeight) return;
        renderer.setSize(element.clientWidth, element.clientHeight);
        camera.aspect = element.clientWidth / element.clientHeight;
        camera.updateProjectionMatrix();
      });
      resize.observe(element);
      const down = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest("button")) return;
        dragging = true;
        pointerX = e.clientX;
        pointerY = e.clientY;
        element.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        targetYaw += (e.clientX - pointerX) * 0.004;
        pitch = Math.max(
          -0.15,
          Math.min(0.25, pitch + (e.clientY - pointerY) * 0.002),
        );
        pointerX = e.clientX;
        pointerY = e.clientY;
      };
      const up = () => {
        dragging = false;
      };
      const keydown = (e: KeyboardEvent) => {
        if (document.activeElement !== element) return;
        const key = e.key.toLowerCase();
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
          ].includes(key)
        ) {
          e.preventDefault();
          pressed.add(key);
        }
      };
      const keyup = (e: KeyboardEvent) => {
        pressed.delete(e.key.toLowerCase());
      };
      const blur = () => pressed.clear();
      const lost = (e: Event) => {
        e.preventDefault();
        setFailed(true);
      };
      element.addEventListener("pointerdown", down);
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", up);
      element.addEventListener("pointercancel", up);
      element.addEventListener("keydown", keydown);
      window.addEventListener("keyup", keyup);
      element.addEventListener("blur", blur);
      renderer.domElement.addEventListener("webglcontextlost", lost);
      function animate(time: number) {
        frame = requestAnimationFrame(animate);
        if (time - last < 30 || document.hidden) return;
        const dt = Math.min((time - last) / 1000, 0.06);
        last = time;
        const p = current.current;
        const isConsequence = p.phase === "failed";
        const view = isConsequence
          ? consequenceCameraViews[p.place] ?? cameraViews[p.place]
          : cameraViews[p.place];
        if (p.chapter !== previousChapter) {
          previousChapter = p.chapter;
          previousEvidence = null;
          walkerTarget.set(0.1, 0, 1.6);
          targetYaw = 0;
          pitch = 0;
        }
        if (p.orbit !== orbitVersion) {
          orbitVersion = p.orbit;
          targetYaw += 0.35;
        }
        const active = p.evidence.find((e) => e.id === p.activeEvidence);
        if (active && active.id !== previousEvidence) {
          previousEvidence = active.id;
          walkerTarget.set(
            active.position[0] + 0.5,
            0,
            active.position[2] + 0.7,
          );
        }
        const movingKeys = pressed.size > 0 && p.phase === "explore";
        if (movingKeys) {
          const x =
            Number(pressed.has("d") || pressed.has("arrowright")) -
            Number(pressed.has("a") || pressed.has("arrowleft"));
          const z =
            Number(pressed.has("s") || pressed.has("arrowdown")) -
            Number(pressed.has("w") || pressed.has("arrowup"));
          walkerTarget.x = Math.max(
            -5.8,
            Math.min(5.8, walkerTarget.x + x * dt * 2.4),
          );
          walkerTarget.z = Math.max(
            -4.8,
            Math.min(5.5, walkerTarget.z + z * dt * 2.4),
          );
        }
        const distance = model.astronaut.position.distanceTo(walkerTarget);
        if (distance > 0.04) {
          model.astronaut.rotation.y = Math.atan2(
            walkerTarget.x - model.astronaut.position.x,
            walkerTarget.z - model.astronaut.position.z,
          );
          model.astronaut.position.lerp(walkerTarget, reduced ? 1 : 0.075);
        }
        model.astronaut.position.y =
          !reduced && distance > 0.15
            ? Math.abs(Math.sin(time * 0.008)) * 0.08
            : 0;
        ring.position.set(walkerTarget.x, 0.025, walkerTarget.z);
        ring.visible =
          p.phase === "explore" && (active !== undefined || movingKeys);
        yaw = reduced ? targetYaw : yaw + (targetYaw - yaw) * 0.06;
        destination.set(...view.eye);
        // Portrait displays back the camera away to retain the whole playable outpost.
        if (camera.aspect < 1) {
          destination.multiplyScalar(isConsequence ? 1.2 : 1.4);
          destination.y += 1.2;
        }
        destination.applyAxisAngle(T.Object3D.DEFAULT_UP, yaw);
        destination.y += pitch * 14;
        lookTarget.set(...view.look);
        if (p.phase === "arrival") {
          destination.multiplyScalar(1.12);
          lookTarget.set(-3, 1, 0);
        }
        const blend = reduced ? 1 : 0.045;
        camera.position.lerp(destination, blend);
        look.lerp(lookTarget, blend);
        camera.lookAt(look);
        const night = p.chapter === 2 || p.chapter === 5;
        sun.intensity += ((night ? 1.8 : 4) - sun.intensity) * 0.03;
        ambient.intensity += ((night ? 1.35 : 2) - ambient.intensity) * 0.03;

        // --- Equipment consequence animations ---
        // 1. Solar array & power cable
        const isSolarFailed = isConsequence && p.place === "solar";
        if (isSolarFailed) {
          model.panelMaterial.color.setHex(0x424952); // dull grey dust blanket
          // Power cable pulse slows down to a sluggish crawl
          const slowT = (time * 0.00015) % 1;
          const pt = model.cablePath.getPoint(slowT);
          model.cablePulse.position.copy(pt);
          model.cablePulse.position.y += 0.025;
          model.cablePulse.scale.set(0.6, 0.6, 0.6);
          // Nonessential habitat interior light dims
          model.habitatInteriorLight.intensity += (0.35 - model.habitatInteriorLight.intensity) * 0.05;
        } else {
          model.panelMaterial.color.setHex(
            p.completed.includes("a-little-light") ? 0x3c648e : 0x545c66,
          );
          // Normal/healthy power pulse flow
          const normalT = (time * 0.0007) % 1;
          const pt = model.cablePath.getPoint(normalT);
          model.cablePulse.position.copy(pt);
          model.cablePulse.position.y += 0.025;
          model.cablePulse.scale.set(1, 1, 1);
          model.habitatInteriorLight.intensity += (1.8 - model.habitatInteriorLight.intensity) * 0.05;
        }

        // 2. Water loop
        const isWaterFailed = isConsequence && p.place === "water";
        model.water.emissive.setHex(
          isWaterFailed
            ? 0x3a2215 // discolored brownish flow / alert
            : p.completed.includes("every-drop")
              ? 0x173e3d
              : 0,
        );

        // 3. Airlock hatch & warning light
        const isAirlockFailed = isConsequence && p.place === "airlock";
        if (isAirlockFailed) {
          model.airlockHatchLight.color.setHex(0xff4422);
          model.airlockHatchLight.intensity = Math.sin(time * 0.01) * 0.7 + 1.2;
          model.door.position.z = 0.68; // slightly unsealed / ajar
        } else {
          model.airlockHatchLight.color.setHex(
            p.completed.includes("door-behind") ? 0x8fe7cf : 0xffa75b,
          );
          model.airlockHatchLight.intensity = 0.8;
          model.door.position.z = 0.63; // latched
        }

        // 4. Rover & stuck wheel
        const isRoverFailed = isConsequence && p.place === "rover";
        if (isRoverFailed) {
          // Straining motor vibration
          model.rover.position.y = 0.5 + (!reduced ? Math.sin(time * 0.04) * 0.012 : 0);
          model.stuckPebble.visible = true;
        } else {
          model.rover.position.y = 0.5;
          model.stuckPebble.visible = !p.completed.includes("mica");
        }

        // 5. Communications Dish
        const isCommsFailed = isConsequence && p.place === "antenna";
        if (isCommsFailed) {
          // Pointed into ridge
          model.dish.rotation.z = -0.15;
          model.dish.rotation.y = -1.1;
        } else if (p.completed.includes("hello-earth")) {
          // Pointed high into sky at orbital relay
          model.dish.rotation.z = -0.65;
          model.dish.rotation.y = 0.35;
        } else {
          model.dish.rotation.z = -0.5;
          model.dish.rotation.y = 0;
        }

        beacon.color.setHex(p.phase === "failed" ? 0xf1775f : 0x8fe7cf);
        model.rover.position.x +=
          (p.completed.includes("mica")
            ? 2.2 - model.rover.position.x
            : 3.1 - model.rover.position.x) * 0.04;
        for (const evidence of p.evidence) {
          const button = labels.current[evidence.id];
          if (!button) continue;
          scratch.set(...evidence.position).project(camera);
          const x = (scratch.x * 0.5 + 0.5) * element.clientWidth;
          const y = (-scratch.y * 0.5 + 0.5) * element.clientHeight;
          const safeX = Math.max(85, Math.min(element.clientWidth - 85, x));
          const safeY = Math.max(145, Math.min(element.clientHeight - 170, y));
          button.style.transform = `translate(${safeX}px, ${safeY}px) translate(-50%,-50%)`;
        }
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(animate);
      setLoaded(true);
      cleanup = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        element.removeEventListener("pointerdown", down);
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", up);
        element.removeEventListener("pointercancel", up);
        element.removeEventListener("keydown", keydown);
        window.removeEventListener("keyup", keyup);
        element.removeEventListener("blur", blur);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        scene.traverse((o) => {
          if (o instanceof T.Mesh || o instanceof T.Points) {
            o.geometry.dispose();
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(
              (m) => m.dispose(),
            );
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (cancelled) cleanup();
    }
    mount().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={host}
      tabIndex={0}
      className={`ss-world ${failed ? "ss-world-fallback" : ""}`}
      aria-label="3D lunar outpost. Drag to look around. Focus this area and use W A S D or arrow keys to move Scout. Select the labelled objects to investigate."
    >
      {!loaded && !failed && (
        <div className="ss-loading">
          <span />
          Establishing a view of Tranquility…
        </div>
      )}
      {failed && (
        <div className="ss-render-note">
          3D is unavailable on this device. You can still investigate using the
          labelled objects.
        </div>
      )}
      {props.phase === "explore" &&
        props.evidence.map((e, i) => (
          <button
            key={e.id}
            ref={(node) => {
              labels.current[e.id] = node;
            }}
            className={`ss-hotspot ${props.found.includes(e.id) ? "found" : ""} ${failed ? "ss-fallback-spot" : ""}`}
            style={failed ? { left: `${20 + i * 40}%`, top: "48%" } : undefined}
            onClick={(event) => {
              event.stopPropagation();
              props.onInspect(e.id);
            }}
          >
            <span className="ss-hotspot-pin">
              {props.found.includes(e.id) ? (
                <Check size={16} />
              ) : (
                <ScanLine size={17} />
              )}
            </span>
            <span>
              {e.label}
              <small>
                {props.found.includes(e.id) ? "REVISIT CLUE" : "INVESTIGATE"}
              </small>
            </span>
          </button>
        ))}
    </div>
  );
}
