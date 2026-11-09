import * as T from "three";
import { STATIONS } from "../../content/survival";
import { dressMarsOutpost } from "./marsDetails";
import { batchStaticMeshes } from "./batchStaticMeshes";
import { createMarsTerrain } from "./marsTerrain";
/** All dimensions are illustrative. This module only builds presentation assets. */
export function createSurvivalOutpost(scene: T.Scene, planet: "moon" | "mars" = "moon") {
  const mat = (color: number, extra = {}) =>
    new T.MeshStandardMaterial({ color, roughness: 0.78, ...extra });
  const ivory = mat(0xc8c6b9),
    dark = mat(0x293540),
    orange = mat(0xd88c4b),
    rock = mat(0x797c83),
    blue = mat(0x184d72, { metalness: 0.5 }),
    cyan = mat(0x58a4ae),
    green = mat(0x73c2a1);
  const root = new T.Group();
  scene.add(root);
  const terrain = planet === "mars" ? createMarsTerrain(root) : null;
  const heightAt = terrain?.heightAt ?? (() => 0);
  function mesh(
    g: T.BufferGeometry,
    m: T.Material,
    p: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    p.add(o);
    return o;
  }
  const box = (
    p: T.Object3D,
    w: number,
    h: number,
    d: number,
    m: T.Material,
    x = 0,
    y = h / 2,
    z = 0,
  ) => mesh(new T.BoxGeometry(w, h, d), m, p, x, y, z);
  const cylinder = (
    p: T.Object3D,
    r: number,
    h: number,
    m: T.Material,
    x = 0,
    y = h / 2,
    z = 0,
  ) => mesh(new T.CylinderGeometry(r, r, h, 16), m, p, x, y, z);
  // A deterministic, original regolith texture; no network asset required.
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#8c8986";
    ctx.fillRect(0, 0, 512, 512);
    // Overlapping, translucent patches give the regolith a soft mottled surface.
    for (let i = 0; i < 1400; i++) {
      const x = (((Math.sin(i * 12.989) * 43758.5453) % 1 + 1) % 1) * 512;
      const y = (((Math.sin(i * 78.233) * 24634.6345) % 1 + 1) % 1) * 512;
      const radius = 2 + (i % 13);
      ctx.fillStyle = i % 2 ? "rgba(42,39,41,.035)" : "rgba(236,222,202,.035)";
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.5, radius, i, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 6500; i++) {
      const x = ((((Math.sin(i * 42.93) * 43758.54) % 1) + 1) % 1) * 512,
        y = ((((Math.sin(i * 15.71) * 24634.63) % 1) + 1) % 1) * 512;
      const size = 0.4 + (i % 7) * 0.24;
      ctx.fillStyle =
        i % 4 === 0 ? "rgba(35,34,37,.16)" : "rgba(235,231,220,.12)";
      ctx.fillRect(x, y, size, size);
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(22, 22);
  texture.colorSpace = T.SRGBColorSpace;
  if (planet !== "mars") {
  const ground = mesh(
    new T.PlaneGeometry(260, 260, 1, 1),
    mat(0xb3ada6, { map: texture }),
    root,
  );
  ground.rotation.x = -Math.PI / 2;
  const pad = mesh(
    new T.CircleGeometry(37, 64),
    mat(0xb7b1aa, { map: texture, roughness: 1 }),
    root,
    0,
    0.009,
    -5,
  );
  pad.rotation.x = -Math.PI / 2;
  // Fine scattered stones are instanced to keep the richer ground inexpensive.
  const pebbles = new T.InstancedMesh(new T.DodecahedronGeometry(1, 1), rock, 900);
  const pebbleTransform = new T.Object3D();
  for (let i = 0; i < 900; i++) {
    const a = i * 2.39996, r = 8 + ((i * 37) % 820) / 10;
    const size = 0.04 + (i % 8) * 0.025;
    pebbleTransform.position.set(Math.sin(a) * r, size * 0.24, Math.cos(a) * r);
    pebbleTransform.scale.set(size * 1.6, size * 0.65, size);
    pebbleTransform.rotation.set(i * 0.1, i, i * 0.2);
    pebbleTransform.updateMatrix();
    pebbles.setMatrixAt(i, pebbleTransform.matrix);
  }
  pebbles.receiveShadow = true;
  root.add(pebbles);
  const mountainGeometry = new T.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 38; i++) {
    const angle = i * 2.399,
      r = 103 + (i % 4) * 10;
    const mountain = mesh(
      mountainGeometry,
      rock,
      root,
      Math.sin(angle) * r,
      0,
      Math.cos(angle) * r,
    );
    mountain.scale.set(10 + (i % 4) * 3, 5 + (i % 5) * 2, 10 + (i % 3) * 4);
    mountain.position.y = -mountain.scale.y * 0.35;
    mountain.castShadow = false;
  }
  // Distant terrain stays finite. No repeating or endlessly generated mission area.
  for (let i = 0; i < 140; i++) {
    const a = i * 2.3999,
      r = 38 + (i % 19) * 2.7;
    const o = mesh(
      new T.DodecahedronGeometry(0.6 + (i % 7) * 0.24, 0),
      rock,
      root,
      Math.sin(a) * r,
      0.2,
      Math.cos(a) * r,
    );
    o.scale.set(1, 0.5 + (i % 3) * 0.2, 1);
    o.rotation.set(i, 0.4 * i, 0.1 * i);
  }
  for (let i = 0; i < 36; i++) {
    const a = (i * Math.PI * 2) / 36;
    const post = cylinder(
      root,
      0.09,
      1.1,
      orange,
      Math.sin(a) * 88,
      0.55,
      Math.cos(a) * 88,
    );
    post.castShadow = false;
  }
  // An illustrative crater field gives the remote research route a clear landmark.
  for (const [x, z, r] of [
    [24, -29, 5],
    [35, -42, 7],
    [53, -27, 6],
    [62, -51, 8],
  ]) {
    const rim = mesh(
      new T.RingGeometry(r * 0.72, r, 40),
      mat(0x656871),
      root,
      x,
      0.025,
      z,
    );
    rim.rotation.x = -Math.PI / 2;
    const centre = mesh(
      new T.CircleGeometry(r * 0.72, 40),
      mat(0x7a7d83),
      root,
      x,
      0.02,
      z,
    );
    centre.rotation.x = -Math.PI / 2;
  }
  }
  if (planet === "mars") rock.color.setHex(0x976b52);
  // Habitat and a visible pedestrian approach.
  const habitatWindow = mat(0x50776c, {
    emissive: 0x77b799,
    emissiveIntensity: 0.7,
  });
  box(root, 9, 4.8, 8, ivory, -2, 2.4, -30);
  // Raised roof, seams, rails and lights make the habitat read as a working base.
  const roof = mesh(new T.CylinderGeometry(4.5, 4.5, 8, 32, 1, false, Math.PI / 2, Math.PI), ivory, root, -2, 4.8, -30);
  roof.rotation.x = Math.PI / 2;
  if (planet === "mars") roof.scale.z = .35;
  box(root, 9.25, 0.3, 8.25, dark, -2, 0.3, -30);
  box(root, 9.2, 0.12, 8.2, orange, -2, 4.58, -30);
  for (const x of [-6.25, -4.8, 0.8, 2.25]) {
    box(root, 0.12, 4.15, 0.12, dark, x, 2.2, -25.89);
  }
  for (const x of [-5.9, 1.9]) {
    box(root, 0.55, 0.13, 0.18, habitatWindow, x, 4.13, -25.8);
    box(root, 0.18, 2.8, 0.18, dark, x, 1.45, -25.74);
  }
  box(root, 7, 1.4, 0.1, habitatWindow, -2, 2.7, -25.94);
  for (const x of [-5.3, -4, 0, 1.3]) box(root, 0.07, 1.4, 0.14, dark, x, 2.7, -25.86);
  box(root, 2, 3, 0.15, orange, -2, 1.5, -25.85);
  box(root, 1.5, 2.6, 0.18, dark, -2, 1.3, -25.72);
  for (let i = 0; i < 10; i++)
    box(root, 0.11, 0.015, 2.5, ivory, -1, 0.025, 7 - i * 3);
  const targets: T.Group[] = [],
    indicators: Record<string, T.MeshStandardMaterial> = {},
    panels: T.Mesh[] = [],
    tanks: T.Mesh[] = [],
    foods: T.Mesh[] = [],
    wheelMeshes: T.Mesh[] = [];
  let dish: T.Object3D | null = null;
  for (const station of STATIONS) {
    const group = new T.Group();
    group.position.set(station.x, 0, station.z);
    group.userData.station = station.id;
    root.add(group);
    targets.push(group);
    const lamp = mat(0x71d9c5, { emissive: 0x2c8f7c, emissiveIntensity: 0.6 });
    indicators[station.id] = lamp;
    const ring = mesh(
      new T.RingGeometry(2.3, 2.36, 40),
      mat(0xb6c1b9),
      group,
      0,
      0.022,
      0,
    );
    ring.rotation.x = -Math.PI / 2;
    if (station.id === "research") {
      box(group, 5, 3, 4, ivory, 0, 1.5, 0);
      box(group, 3, 0.8, 0.1, cyan, 0, 2, 0.05 + 2);
      cylinder(group, 0.1, 5, orange, 2.7, 2.5, 0);
      cylinder(group, 0.35, 0.35, lamp, 2.7, 5.1, 0);
    } else if (station.id === "solar") {
      for (let i = -1; i <= 1; i++) {
        box(group, 0.14, 1.2, 0.14, dark, i * 2, 0.6, 0);
        const panel = box(group, 1.85, 0.12, 2.7, blue.clone(), i * 2, 1.3, 0);
        panel.rotation.x = 0.25;
        panels.push(panel);
        for (const x of [-0.92, 0.92]) box(panel, 0.06, 0.08, 2.7, dark, x, 0.06, 0);
        for (const z of [-1.32, 1.32]) box(panel, 1.85, 0.08, 0.06, dark, 0, 0.06, z);
        for (let k = 0; k < 4; k++)
          box(panel, 1.72, 0.02, 0.025, ivory, 0, 0.09, -0.9 + k * 0.6);
        for (const x of [-0.55, 0, 0.55]) box(panel, 0.018, 0.025, 2.55, ivory, x, 0.09, 0);
      }
    } else if (station.id === "oxygen" || station.id === "water") {
      const tankMat = station.id === "water" ? cyan : ivory;
      for (let i = -1; i <= 1; i += 2) {
        const tank = cylinder(group, 0.5, 2.7, tankMat.clone(), i * 0.62, 1.45);
        tanks.push(tank);
        tank.userData.system = station.id;
        mesh(new T.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), tank.material, group, i * 0.62, 2.8, 0);
        cylinder(
          group,
          0.52,
          0.18,
          station.id === "water" ? blue : green,
          i * 0.62,
          0.65,
        );
        cylinder(group, 0.12, 0.3, orange, i * 0.62, 2.95);
      }
      box(group, 2.6, 0.18, 1.4, dark, 0, 0.15);
      box(group, 0.35, 0.45, 0.1, lamp, 0, 1.2, 0.65);
    } else if (station.id === "shelter") {
      box(group, 0.6, 3.8, 6, ivory, -3, 1.9, -1);
      box(group, 0.6, 3.8, 6, ivory, 3, 1.9, -1);
      box(group, 6, 3.8, 0.6, ivory, 0, 1.9, -4);
      box(group, 6.6, 0.8, 6.8, rock, 0, 4, -0.9);
      box(group, 5.4, 0.06, 5.5, dark, 0, 0.04, -1);
      box(group, 1.8, 1, 0.15, cyan, 0, 1.5, -3.6);
      box(group, 0.8, 0.2, 0.2, lamp, 2.5, 3, 2.1);
    } else if (station.id === "rover") {
      if (planet === "mars") {
        // High-tech Rover Service & Launch Bay on Mars
        box(group, 4.2, 0.1, 6.2, dark, 0, 0.05, 0);
        box(group, 3.8, 0.04, 5.8, ivory, 0, 0.11, 0);
        cylinder(group, 0.08, 2.4, ivory, 2.1, 1.2, -1.5);
        box(group, 0.7, 0.45, 0.3, dark, 2.1, 1.35, -1.5);
        box(group, 0.25, 0.18, 0.08, lamp, 2.1, 1.5, -1.36);
        box(group, 0.35, 0.25, 0.5, orange, 2.1, 0.3, -1.0);
      } else {
        box(group, 2.7, 0.85, 3, ivory, 0, 1);
        box(group, 1.4, 0.7, 1.2, dark, 0, 1.65, -0.7);
        cylinder(group, 0.22, 0.1, lamp, 0, 2.05, -0.9);
        for (const x of [-1.5, 1.5])
          for (const z of [-1, 1]) {
            const w = cylinder(group, 0.48, 0.35, dark, x, 0.5, z);
            w.rotation.z = Math.PI / 2;
            wheelMeshes.push(w);
          }
        box(group, 1.1, 0.65, 0.9, orange, 0.5, 1.8, 1);
        mesh(new T.DodecahedronGeometry(0.25), rock, group, 1.6, 0.22, 1);
      }
    } else if (station.id === "relay") {
      cylinder(group, 0.12, 7.5, ivory);
      dish = new T.Group();
      dish.position.y = 6;
      group.add(dish);
      const bowl = mesh(
        new T.SphereGeometry(1.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        ivory,
        dish,
      );
      bowl.rotation.x = Math.PI / 2;
      box(group, 0.7, 0.4, 0.3, lamp, 0, 1, 0.4);
    } else if (station.id === "food" || station.id === "cache") {
      box(group, 2.8, 2.4, 1.5, ivory);
      box(group, 2.5, 2, 0.15, dark, 0, 1.25, 0.78);
      for (let i = 0; i < 6; i++) {
        const pack = box(
          group,
          0.65,
          0.45,
          0.3,
          orange.clone(),
          -0.8 + (i % 3) * 0.8,
          0.7 + Math.floor(i / 3) * 0.7,
          0.9,
        );
        foods.push(pack);
      }
      box(group, 0.4, 0.15, 0.15, lamp, 0, 2.5, 0.4);
    } else if (station.id === "battery") {
      for (let i = 0; i < 3; i++) {
        box(group, 0.8, 1.6, 1.1, dark, (i - 1) * 1, 0.8);
        box(group, 0.55, 0.9, 0.1, lamp, (i - 1) * 1, 1, 0.6);
      }
    } else if (station.id === "lookout") {
      cylinder(group, 0.07, 3, orange);
      box(group, 1.7, 0.7, 0.1, ivory, 0, 2.4);
      box(group, 1.1, 0.12, 0.12, dark, 0, 2.4, 0.1);
    } else {
      box(group, 2, 0.12, 1.2, ivory, 0, 1.15);
      box(group, 0.15, 1.1, 0.15, dark, -0.8, 0.55);
      box(group, 0.15, 1.1, 0.15, dark, 0.8, 0.55);
      box(group, 1.5, 0.9, 0.12, dark, 0, 1.65, -0.3);
      box(group, 1.25, 0.58, 0.13, lamp, 0, 1.65, -0.22);
      if (station.id === "science")
        for (let i = 0; i < 3; i++)
          cylinder(group, 0.17, 0.3, orange, (i - 1) * 0.45, 1.36, 0.3);
    }
  }
  if (planet === "mars") dressMarsOutpost(root, targets);
  if (planet === "mars") {
    const animated = new Set<T.Object3D>([...panels, ...tanks, ...foods, ...wheelMeshes]);
    if (dish) animated.add(dish);
    const changingMaterials = new Set<T.Material>([habitatWindow, ...Object.values(indicators)]);
    root.traverse(o => { if (o instanceof T.Mesh && changingMaterials.has(o.material)) animated.add(o); });
    let saved = 0;
    for (const station of targets) saved += batchStaticMeshes(station, animated);
    saved += batchStaticMeshes(root, new Set([...animated, ...targets]));
    root.userData.staticDrawCallsSaved = saved;
    root.traverse(o => { if (o instanceof T.Mesh && !animated.has(o)) o.updateMatrix(); });
  }
  const shelter = STATIONS.find((s) => s.id === "shelter")!;
  const obstacles = STATIONS.filter(
    (s) => s.id !== "shelter" && s.id !== "lookout",
  ).map((s) => ({
    x: s.x,
    z: s.z,
    radius: s.id === "solar" ? 2.2 : s.id === "rover" ? 2 : 1.4,
  }));
  obstacles.push(
    { x: -2, z: -30, radius: 5.3 },
    { x: shelter.x - 3, z: shelter.z - 1, radius: 1.2 },
    { x: shelter.x + 3, z: shelter.z - 1, radius: 1.2 },
  );
  if (terrain) obstacles.push(...terrain.obstacles);
  return {
    root,
    targets,
    indicators,
    panels,
    tanks,
    foods,
    wheelMeshes,
    dish,
    obstacles,
    habitatWindow,
    heightAt,
  };
}
