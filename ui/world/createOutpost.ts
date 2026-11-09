import * as T from "three";
import type { BufferGeometry, Material } from "three";

/** Procedural illustration. Geometry and animation contain no game rules. */
export function createOutpost(scene: T.Scene) {
  const island = new T.Group();
  scene.add(island);
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
  const ground = material(0x7c7d87, { flatShading: true });
  const rockMaterial = material(0x656873, { flatShading: true });
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
    new T.CylinderGeometry(80, 80, 0.8, 100),
    material(0x54545f),
    island,
    0,
    -0.48,
    0,
  );
  const terrain = new T.CircleGeometry(80, 100);
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
  box(1.35, 0.43, 0.85, light, rover);
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
  const cableMaterial = material(0xdc8849, { emissive: 0x331a08 });
  const cableMesh = mesh(new T.TubeGeometry(cablePath, 30, 0.025, 6, false), cableMaterial);

  // Power flow pulse marker along cable
  const cablePulse = mesh(
    new T.SphereGeometry(0.065, 12, 8),
    material(0xffd588, { emissive: 0xffaa33, emissiveIntensity: 1.2 }),
    island,
    -2, 0.04, 2.7
  );

  // Habitat interior warm lighting (dims when power drops)
  const habitatInteriorLight = new T.PointLight(0xffdfb0, 1.8, 4.5);
  habitatInteriorLight.position.set(-0.4, 1.35, 0.1);
  island.add(habitatInteriorLight);

  // Airlock hatch status beacon
  const airlockHatchLight = new T.PointLight(0xffa75b, 0.8, 2.5);
  airlockHatchLight.position.set(1.7, 0.85, 0.7);
  island.add(airlockHatchLight);

  // Pebble trapped beside MICA's wheel
  const stuckPebble = mesh(
    new T.DodecahedronGeometry(0.12, 0),
    rockMaterial,
    island,
    3.7, 0.16, 2.7
  );

  // Sample bench: a real investigation location, rather than a menu illustration.
  box(1.5, 0.12, 0.8, light, island, -3.9, 0.72, -2.2);
  for (const x of [-4.5, -3.3])
    box(0.08, 0.7, 0.55, dark, island, x, 0.34, -2.2);
  for (const x of [-4.25, -3.65]) {
    cylinder(0.16, 0.25, water, island, x, 0.89, -2.2);
    cylinder(0.17, 0.06, orange, island, x, 1.05, -2.2);
  }
  box(0.55, 0.08, 0.42, orange, island, -4.7, 0.09, -0.8);
  box(0.65, 0.08, 0.5, glass, island, -2, 0.09, -3.4);
  for (let i = 0; i < 32; i++) {
    const z = 5 - i * 0.18;
    const x = 0.12 * Math.sin(i * 0.5);
    box(
      0.09,
      0.014,
      0.16,
      rockMaterial,
      island,
      x + (i % 2 ? 0.14 : -0.14),
      0.008,
      z,
    );
  }
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const hill = mesh(
      new T.ConeGeometry(3 + (i % 3), 2 + (i % 5) * 0.7, 5),
      rockMaterial,
      island,
      Math.cos(a) * 27,
      0.5,
      Math.sin(a) * 27,
    );
    hill.rotation.y = i;
    hill.scale.z = 1.5;
  }
  const seedling = new T.Group();
  seedling.position.set(-1, 1.75, 0.05);
  island.add(seedling);
  cylinder(0.13, 0.22, orange, seedling);
  cylinder(0.025, 0.3, material(0x95b778), seedling, 0, 0.22, 0);
  for (const direction of [-1, 1]) {
    const leaf = mesh(
      new T.SphereGeometry(0.12, 12, 8),
      material(0x95b778),
      seedling,
      direction * 0.08,
      0.3,
      0,
    );
    leaf.scale.set(1.3, 0.22, 0.6);
    leaf.rotation.z = direction * 0.6;
  }
  return {
    island,
    astronaut,
    rover,
    panelMaterial,
    water,
    door,
    seedling,
    cablePulse,
    cablePath,
    habitatInteriorLight,
    airlockHatchLight,
    stuckPebble,
    dish,
  };
}
