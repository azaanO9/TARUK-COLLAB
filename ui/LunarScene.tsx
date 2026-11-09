"use client";

import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Material } from "three";
import type { ResourceKey } from "../game/types";

type Props = {
  focus?: ResourceKey | "science";
  resolved: boolean;
  view: number;
};

/** Visual only: resource calculations and dispatch never belong in this component. */
export default function LunarScene({ focus, resolved, view }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef({ focus, resolved, view });
  const [failed, setFailed] = useState(false);
  latest.current = { focus, resolved, view };

  useEffect(() => {
    let cancelled = false;
    let teardown = () => {};
    async function mount() {
      const T = await import("three");
      const host = container.current;
      if (!host || cancelled) return;
      const renderer = new T.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(35, 1, 0.1, 120);
      const island = new T.Group();
      scene.add(island);
      const ambient = new T.HemisphereLight(0xcbd8ff, 0x32323a, 2.7);
      scene.add(ambient);
      const sun = new T.DirectionalLight(0xfff0d8, 4.5);
      sun.position.set(-5, 12, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, {
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
      });
      sun.shadow.bias = -0.001;
      scene.add(sun);
      const rim = new T.DirectionalLight(0x7aabed, 2.2);
      rim.position.set(5, 5, -6);
      scene.add(rim);

      const material = (color: number, extra = {}) =>
        new T.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
      const white = material(0xe3dfd2);
      const light = material(0xf8f3df);
      const dark = material(0x343d4c);
      const orange = material(0xdc8849);
      const glass = material(0x294453, { metalness: 0.45, roughness: 0.22 });
      const water = material(0x66c3cb, { metalness: 0.25 });
      const panelMaterial = material(0x284871, {
        metalness: 0.65,
        roughness: 0.35,
      });
      const scienceMaterial = material(0xe7c87b);
      const ground = material(0x939196, { flatShading: true });
      const rockMaterial = material(0x77777e, { flatShading: true });
      const mesh = (
        geometry: BufferGeometry,
        mat: Material,
        parent = island,
        x = 0,
        y = 0,
        z = 0,
      ) => {
        const object = new T.Mesh(geometry, mat);
        object.position.set(x, y, z);
        object.castShadow = true;
        object.receiveShadow = true;
        parent.add(object);
        return object;
      };
      const box = (
        w: number,
        h: number,
        d: number,
        mat = white,
        parent = island,
        x = 0,
        y = 0,
        z = 0,
      ) => mesh(new T.BoxGeometry(w, h, d), mat, parent, x, y, z);
      const cylinder = (
        r: number,
        h: number,
        mat = white,
        parent = island,
        x = 0,
        y = 0,
        z = 0,
      ) => mesh(new T.CylinderGeometry(r, r, h, 32), mat, parent, x, y, z);

      mesh(
        new T.CylinderGeometry(7.2, 6.95, 0.8, 80),
        material(0x54545f),
        island,
        0,
        -0.48,
        0,
      );
      const terrain = new T.CircleGeometry(7.2, 80, 8);
      terrain.rotateX(-Math.PI / 2);
      mesh(terrain, ground, island, 0, -0.06, 0);
      // Small craters and rocks are procedural illustration, not geographic data.
      const crater = (x: number, z: number, radius: number) => {
        const ring = mesh(
          new T.TorusGeometry(radius, radius * 0.12, 5, 32),
          rockMaterial,
          island,
          x,
          -0.02,
          z,
        );
        ring.rotation.x = -Math.PI / 2;
        const bowl = mesh(
          new T.CircleGeometry(radius * 0.92, 32),
          material(0x74747d),
          island,
          x,
          -0.045,
          z,
        );
        bowl.rotation.x = -Math.PI / 2;
      };
      crater(-4.5, 2.7, 0.65);
      crater(3.9, -3.1, 0.9);
      crater(3.7, 4.1, 0.45);
      crater(-1.9, -4.8, 0.5);
      for (let i = 0; i < 62; i++) {
        const a = i * 2.39996,
          radius = 4 + (Math.sin(i * 11.3) * 0.5 + 0.5) * 2.6;
        const size = 0.08 + (Math.cos(i * 8.7) * 0.5 + 0.5) * 0.24;
        const rock = mesh(
          new T.DodecahedronGeometry(size, 0),
          rockMaterial,
          island,
          Math.cos(a) * radius,
          size * 0.25,
          Math.sin(a) * radius,
        );
        rock.scale.set(1.3, 0.7, 1);
        rock.rotation.set(i, i * 0.7, 0);
      }

      // Habitat: insulated pressure vessel, ribs, portholes, and airlock.
      const habitat = new T.Group();
      habitat.position.set(-0.4, 1.15, -0.8);
      island.add(habitat);
      const body = cylinder(1.05, 3.6, white, habitat);
      body.rotation.z = Math.PI / 2;
      for (const x of [-1.8, 1.8]) {
        const cap = mesh(
          new T.SphereGeometry(1.05, 32, 24),
          white,
          habitat,
          x,
          0,
          0,
        );
        cap.scale.x = 0.35;
      }
      for (let x = -1.5; x <= 1.6; x += 0.5) {
        const rib = mesh(
          new T.TorusGeometry(1.065, 0.036, 8, 40),
          light,
          habitat,
          x,
          0,
          0,
        );
        rib.rotation.y = Math.PI / 2;
      }
      for (const x of [-1.05, 0.1, 1.05]) {
        const frame = cylinder(0.25, 0.08, dark, habitat, x, 0.23, 1.0);
        frame.rotation.x = Math.PI / 2;
        const window = cylinder(0.185, 0.09, glass, habitat, x, 0.23, 1.05);
        window.rotation.x = Math.PI / 2;
      }
      box(0.15, 0.8, 1.7, dark, island, -1.4, 0.3, -0.8);
      box(0.15, 0.8, 1.7, dark, island, 0.9, 0.3, -0.8);
      const airlock = cylinder(0.65, 1.0, light, island, 1.7, 0.75, 0.1);
      airlock.rotation.x = Math.PI / 2;
      const door = cylinder(0.48, 0.06, orange, island, 1.7, 0.75, 0.63);
      door.rotation.x = Math.PI / 2;
      box(0.62, 0.12, 0.6, dark, island, 1.7, 0.23, 1.1);
      box(0.65, 0.12, 0.45, white, island, 1.7, 0.1, 1.4);
      box(0.5, 0.1, 0.6, orange, island, -0.7, 2.23, -0.8);
      cylinder(0.035, 1.1, white, island, -0.7, 2.8, -0.8);
      const dish = mesh(
        new T.SphereGeometry(0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        light,
        island,
        -0.7,
        3.15,
        -0.8,
      );
      dish.rotation.z = -0.5;
      dish.scale.y = 0.25;
      // Two resource tanks next to the habitat.
      for (const x of [2.45, 3.2]) {
        cylinder(0.34, 1.3, white, island, x, 0.65, -1.7);
        cylinder(0.355, 0.38, water, island, x, 0.75, -1.7);
        const top = mesh(
          new T.SphereGeometry(0.34, 24, 12),
          white,
          island,
          x,
          1.3,
          -1.7,
        );
        top.scale.y = 0.45;
        box(0.4, 0.12, 0.4, dark, island, x, 0.03, -1.7);
      }
      // Solar cells with visible grid lines.
      for (const z of [1.4, 3.15]) {
        const array = new T.Group();
        array.position.set(-2.2, 0.85, z);
        array.rotation.z = -0.12;
        island.add(array);
        cylinder(0.065, 0.9, dark, island, -2.2, 0.4, z);
        box(3.3, 0.1, 1.35, light, array);
        box(3.15, 0.12, 1.2, panelMaterial, array, 0, 0.03, 0);
        for (let x = -1.5; x <= 1.6; x += 0.39)
          box(0.018, 0.012, 1.2, material(0x7292b1), array, x, 0.098, 0);
        for (const line of [-0.3, 0, 0.3])
          box(3.1, 0.012, 0.012, material(0x7292b1), array, 0, 0.098, line);
      }
      // Six-wheeled science rover.
      const rover = new T.Group();
      rover.position.set(3.1, 0.5, 2.3);
      rover.rotation.y = -0.4;
      island.add(rover);
      box(1.35, 0.43, 0.85, material(0x9acd32), rover);
      box(0.8, 0.07, 0.65, scienceMaterial, rover, 0, 0.26, 0);
      for (const x of [-0.5, 0, 0.5])
        for (const z of [-0.52, 0.52]) {
          const wheel = cylinder(0.235, 0.18, dark, rover, x, -0.2, z);
          wheel.rotation.x = Math.PI / 2;
        }
      cylinder(0.04, 0.85, white, rover, -0.35, 0.65, 0);
      box(0.35, 0.19, 0.26, dark, rover, -0.35, 1.1, 0);
      mesh(new T.SphereGeometry(0.055, 12, 8), water, rover, -0.35, 1.12, 0.14);
      // Astronaut next to the habitat, with a gold visor and orange backpack.
      const astronaut = new T.Group();
      astronaut.position.set(0.1, 0.0, 1.6);
      island.add(astronaut);
      cylinder(0.17, 0.38, white, astronaut, 0, 0.56, 0);
      mesh(new T.SphereGeometry(0.21, 24, 16), light, astronaut, 0, 0.9, 0);
      const visor = mesh(
        new T.SphereGeometry(0.17, 24, 16),
        material(0x9b682d, { metalness: 0.7, roughness: 0.2 }),
        astronaut,
        0.02,
        0.91,
        0.12,
      );
      visor.scale.set(0.86, 0.7, 0.65);
      box(0.23, 0.32, 0.16, orange, astronaut, 0, 0.56, -0.17);
      for (const x of [-0.12, 0.12]) {
        cylinder(0.075, 0.28, white, astronaut, x, 0.23, 0);
        box(0.16, 0.12, 0.28, dark, astronaut, x, 0.06, 0.05);
        const arm = cylinder(0.067, 0.32, white, astronaut, x * 1.9, 0.56, 0);
        arm.rotation.z = x < 0 ? -0.3 : 0.3;
      }
      // Cable linking the panels to the habitat.
      const cablePath = new T.CatmullRomCurve3([
        new T.Vector3(-2, 0.015, 2.7),
        new T.Vector3(-0.8, 0.015, 2.8),
        new T.Vector3(0.5, 0.015, 1),
        new T.Vector3(0.9, 0.1, -0.1),
      ]);
      mesh(new T.TubeGeometry(cablePath, 30, 0.025, 6, false), orange);

      let angle = 0,
        targetAngle = 0,
        dragX = 0,
        dragging = false,
        frame = 0,
        lastFrame = 0;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const resize = new ResizeObserver(() => {
        if (!host.clientWidth || !host.clientHeight) return;
        renderer.setSize(host.clientWidth, host.clientHeight);
        camera.aspect = host.clientWidth / host.clientHeight;
        const distance = camera.aspect < 1.2 ? 23 : 20;
        camera.position.set(distance * 0.58, distance * 0.58, distance * 0.78);
        camera.lookAt(0, 0.1, 0);
        camera.updateProjectionMatrix();
      });
      resize.observe(host);
      const down = (event: PointerEvent) => {
        dragging = true;
        dragX = event.clientX;
        host.setPointerCapture(event.pointerId);
      };
      const move = (event: PointerEvent) => {
        if (dragging) {
          targetAngle += (event.clientX - dragX) * 0.008;
          dragX = event.clientX;
        }
      };
      const up = () => {
        dragging = false;
      };
      const lost = (event: Event) => {
        event.preventDefault();
        setFailed(true);
      };
      host.addEventListener("pointerdown", down);
      host.addEventListener("pointermove", move);
      host.addEventListener("pointerup", up);
      host.addEventListener("pointercancel", up);
      renderer.domElement.addEventListener("webglcontextlost", lost);
      let previousView = latest.current.view;
      function animate(time: number) {
        frame = requestAnimationFrame(animate);
        if (time - lastFrame < 32 || document.hidden) return;
        lastFrame = time;
        if (latest.current.view !== previousView) {
          targetAngle += Math.PI / 5;
          previousView = latest.current.view;
        }
        angle = reducedMotion
          ? targetAngle
          : angle + (targetAngle - angle) * 0.09;
        island.rotation.y = angle;
        const active = latest.current.focus;
        panelMaterial.emissive.setHex(active === "power" ? 0x263e76 : 0x000000);
        panelMaterial.color.setHex(
          latest.current.resolved && active === "power" ? 0x4676a3 : 0x284871,
        );
        water.emissive.setHex(active === "water" ? 0x194949 : 0x000000);
        scienceMaterial.emissive.setHex(
          active === "science" ? 0x59421e : 0x000000,
        );
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(animate);
      teardown = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        host.removeEventListener("pointerdown", down);
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerup", up);
        host.removeEventListener("pointercancel", up);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        scene.traverse((object) => {
          if (object instanceof T.Mesh) {
            object.geometry.dispose();
            (Array.isArray(object.material)
              ? object.material
              : [object.material]
            ).forEach((mat) => mat.dispose());
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (cancelled) teardown();
    }
    mount().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  return (
    <div
      ref={container}
      className="lunar-canvas"
      role="img"
      aria-label="An illustrated 3D Moon base with a habitat, solar arrays, water tanks, an astronaut and a science rover. Drag to rotate, or use the rotate view button."
    >
      {failed && (
        <div className="scene-fallback">
          <span>☾</span>
          <p>Your outpost is ready.</p>
          <small>
            The 3D view is unavailable on this device.
            <br />
            All mission choices still work.
          </small>
        </div>
      )}
    </div>
  );
}
