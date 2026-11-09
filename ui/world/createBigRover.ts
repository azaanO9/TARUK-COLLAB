import * as T from "three";
import type { RoverVehicle } from "../../game/roverVehicle";

export type BigRoverHandle = {
  root: T.Group;
  headlightL: T.SpotLight;
  headlightR: T.SpotLight;
  update: (
    rover: RoverVehicle,
    groundY: number,
    dt: number,
    isNight: boolean,
  ) => void;
  dispose: () => void;
};

/**
 * Creates an imposing, high-fidelity 6-wheeled Mars Exploration Rover
 * with a transparent cockpit, detailed interior, bucket seats, and
 * a seated astronaut driver holding the steering yoke (GTA 5 style).
 */
export function createBigRover(): BigRoverHandle {
  const root = new T.Group();
  root.name = "BigRover";

  // --- Materials ---
  const hullWhite = new T.MeshStandardMaterial({
    color: 0xf0efe8,
    roughness: 0.35,
    metalness: 0.15,
  });
  const chassisDark = new T.MeshStandardMaterial({
    color: 0x22262c,
    roughness: 0.75,
    metalness: 0.65,
  });
  const accentOrange = new T.MeshStandardMaterial({
    color: 0xdf6c20,
    roughness: 0.45,
    metalness: 0.25,
  });
  const tireRubber = new T.MeshStandardMaterial({
    color: 0x1a1a1c,
    roughness: 0.9,
    metalness: 0.05,
  });
  const titaniumRim = new T.MeshStandardMaterial({
    color: 0x9ba2a8,
    roughness: 0.3,
    metalness: 0.8,
  });
  const canopyGlass = new T.MeshPhysicalMaterial({
    color: 0x486b7a,
    metalness: 0.2,
    roughness: 0.1,
    transmission: 0.7,
    transparent: true,
    opacity: 0.55,
    reflectivity: 0.85,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const screenGlow = new T.MeshBasicMaterial({ color: 0x38e5d0 });
  const gaugeGlow = new T.MeshBasicMaterial({ color: 0xffaa33 });
  const headlightGlow = new T.MeshBasicMaterial({ color: 0xfffae6 });
  const taillightMat = new T.MeshStandardMaterial({
    color: 0x991111,
    emissive: 0x880000,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const solarBlue = new T.MeshStandardMaterial({
    color: 0x1b3558,
    roughness: 0.25,
    metalness: 0.5,
  });

  // --- Helper builders ---
  function box(
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    x = 0,
    y = 0,
    z = 0,
    parent: T.Object3D = root,
  ): T.Mesh {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function cylinder(
    rTop: number,
    rBot: number,
    h: number,
    seg: number,
    mat: T.Material,
    x = 0,
    y = 0,
    z = 0,
    parent: T.Object3D = root,
  ): T.Mesh {
    const m = new T.Mesh(new T.CylinderGeometry(rTop, rBot, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // ==========================================
  // 1. UNDERBODY CHASSIS & HEAVY SUSPENSION
  // ==========================================
  // Main reinforced skid frame
  box(2.2, 0.3, 4.6, chassisDark, 0, 0.45, 0);
  box(2.0, 0.2, 4.4, hullWhite, 0, 0.65, 0);

  // Front bull-bar bumper & tow winches
  const frontBumper = box(2.4, 0.35, 0.35, chassisDark, 0, 0.55, -2.35);
  box(1.8, 0.08, 0.2, accentOrange, 0, 0.25, 0, frontBumper);
  cylinder(0.12, 0.12, 0.35, 16, titaniumRim, -0.6, 0, 0.1, frontBumper).rotation.z = Math.PI / 2;
  cylinder(0.12, 0.12, 0.35, 16, titaniumRim, 0.6, 0, 0.1, frontBumper).rotation.z = Math.PI / 2;

  // Rear heavy step bumper & hitch
  const rearBumper = box(2.4, 0.35, 0.35, chassisDark, 0, 0.55, 2.35);
  cylinder(0.08, 0.08, 0.25, 16, titaniumRim, 0, 0, 0.2, rearBumper).rotation.x = Math.PI / 2;

  // Rocker side rails and running boards
  box(0.2, 0.1, 3.4, chassisDark, -1.25, 0.45, 0);
  box(0.2, 0.1, 3.4, chassisDark, 1.25, 0.45, 0);
  box(0.15, 0.06, 1.2, accentOrange, -1.25, 0.52, -0.4);
  box(0.15, 0.06, 1.2, accentOrange, 1.25, 0.52, -0.4);

  // ==========================================
  // 2. SIX HEAVY ALL-TERRAIN WHEELS
  // ==========================================
  const wheelRadius = 0.58;
  const wheelWidth = 0.44;

  type WheelAssembly = {
    pivot: T.Group;
    wheel: T.Group;
    isFront: boolean;
  };
  const wheelAssemblies: WheelAssembly[] = [];

  const wheelPositions = [
    { x: -1.45, z: -1.6, isFront: true },  // Front Left
    { x: 1.45, z: -1.6, isFront: true },   // Front Right
    { x: -1.45, z: 0.0, isFront: false },  // Mid Left
    { x: 1.45, z: 0.0, isFront: false },   // Mid Right
    { x: -1.45, z: 1.6, isFront: false },  // Rear Left
    { x: 1.45, z: 1.6, isFront: false },   // Rear Right
  ];

  for (const pos of wheelPositions) {
    const pivot = new T.Group();
    pivot.position.set(pos.x, 0.55, pos.z);
    root.add(pivot);

    // Suspension swing-arm connecting from chassis to wheel pivot
    const armX = pos.x > 0 ? -0.25 : 0.25;
    const arm = box(0.35, 0.15, 0.2, chassisDark, armX, 0, 0, pivot);
    arm.rotation.z = pos.x > 0 ? -0.2 : 0.2;

    // Wheel rotating group (rotates around X axle)
    const wheelGroup = new T.Group();
    pivot.add(wheelGroup);

    // Outer tire (cylinder aligned sideways along X axis)
    const tire = new T.Mesh(
      new T.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24),
      tireRubber,
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;
    wheelGroup.add(tire);

    // Tread ribs around circumference
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      const tread = new T.Mesh(
        new T.BoxGeometry(wheelWidth * 0.95, 0.06, 0.12),
        chassisDark,
      );
      tread.position.set(0, Math.sin(angle) * (wheelRadius + 0.02), Math.cos(angle) * (wheelRadius + 0.02));
      tread.rotation.x = -angle;
      wheelGroup.add(tread);
    }

    // Heavy titanium alloy center rim hub
    const rim = new T.Mesh(
      new T.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, wheelWidth + 0.03, 16),
      titaniumRim,
    );
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Planetary gear wheel cap & lugs
    const cap = new T.Mesh(
      new T.CylinderGeometry(wheelRadius * 0.25, wheelRadius * 0.25, wheelWidth + 0.06, 12),
      accentOrange,
    );
    cap.rotation.z = Math.PI / 2;
    wheelGroup.add(cap);

    wheelAssemblies.push({ pivot, wheel: wheelGroup, isFront: pos.isFront });
  }

  // ==========================================
  // 3. MAIN CABIN & PANORAMIC COCKPIT
  // ==========================================
  const cabin = new T.Group();
  cabin.position.set(0, 0.75, 0);
  root.add(cabin);

  // Main composite shell
  box(2.1, 0.85, 2.4, hullWhite, 0, 0.45, -0.3, cabin);
  box(2.14, 0.12, 2.44, accentOrange, 0, 0.88, -0.3, cabin);

  // Cockpit glass canopy
  const windshield = new T.Mesh(
    new T.BoxGeometry(1.85, 0.82, 0.08),
    canopyGlass,
  );
  windshield.position.set(0, 1.25, -1.35);
  windshield.rotation.x = 0.45;
  cabin.add(windshield);

  // Side cabin windows
  for (const sideX of [-1.02, 1.02]) {
    const sideGlass = new T.Mesh(
      new T.BoxGeometry(0.06, 0.65, 1.3),
      canopyGlass,
    );
    sideGlass.position.set(sideX, 1.2, -0.5);
    cabin.add(sideGlass);
  }

  // Roof glass skylight
  const roofGlass = new T.Mesh(
    new T.BoxGeometry(1.5, 0.06, 1.2),
    canopyGlass,
  );
  roofGlass.position.set(0, 1.58, -0.5);
  cabin.add(roofGlass);

  // Roof frame structure
  box(1.9, 0.1, 1.5, hullWhite, 0, 1.62, -0.45, cabin);
  box(0.1, 0.75, 0.1, chassisDark, -0.92, 1.25, -1.2, cabin).rotation.x = 0.45;
  box(0.1, 0.75, 0.1, chassisDark, 0.92, 1.25, -1.2, cabin).rotation.x = 0.45;

  // Auxiliary solar panel on roof
  box(1.5, 0.05, 1.1, solarBlue, 0, 1.68, -0.45, cabin);
  box(1.54, 0.02, 1.14, titaniumRim, 0, 1.66, -0.45, cabin);

  // ==========================================
  // 4. INTERIOR COCKPIT & DASHBOARD
  // ==========================================
  const interior = new T.Group();
  cabin.add(interior);

  // Dashboard console
  const dash = box(1.8, 0.4, 0.5, chassisDark, 0, 0.95, -1.05, interior);
  dash.rotation.x = 0.25;

  // Center primary navigation & tactical MFD screen
  const navScreen = new T.Mesh(new T.PlaneGeometry(0.48, 0.28), screenGlow);
  navScreen.position.set(0, 0.08, 0.26);
  navScreen.rotation.x = -0.25;
  dash.add(navScreen);

  // Driver digital instrument cluster
  const speedoScreen = new T.Mesh(new T.PlaneGeometry(0.36, 0.2), gaugeGlow);
  speedoScreen.position.set(-0.46, 0.08, 0.26);
  speedoScreen.rotation.x = -0.25;
  dash.add(speedoScreen);

  // Passenger telemetry screen
  const passengerScreen = new T.Mesh(new T.PlaneGeometry(0.36, 0.2), screenGlow);
  passengerScreen.position.set(0.46, 0.08, 0.26);
  passengerScreen.rotation.x = -0.25;
  dash.add(passengerScreen);

  // Steering yoke / flight sticks in front of driver
  const yokeColumn = cylinder(0.04, 0.04, 0.4, 8, titaniumRim, -0.46, 0.92, -0.78, interior);
  yokeColumn.rotation.x = 0.45;
  const yokeHandle = box(0.32, 0.06, 0.04, accentOrange, 0, 0.2, 0, yokeColumn);
  box(0.05, 0.14, 0.04, chassisDark, -0.14, 0, 0, yokeHandle);
  box(0.05, 0.14, 0.04, chassisDark, 0.14, 0, 0, yokeHandle);

  // Driver & Passenger bucket seats
  for (const seatX of [-0.46, 0.46]) {
    // Seat cushion
    box(0.52, 0.14, 0.55, chassisDark, seatX, 0.55, -0.45, interior);
    // Backrest
    const back = box(0.5, 0.72, 0.12, chassisDark, seatX, 0.95, -0.18, interior);
    back.rotation.x = -0.15;
    // Headrest
    box(0.28, 0.2, 0.1, accentOrange, 0, 0.42, 0, back);
  }

  // ==========================================
  // 5. SEATED ASTRONAUT IN DRIVER'S SEAT
  // ==========================================
  const seatedAstronaut = new T.Group();
  seatedAstronaut.position.set(-0.46, 0.55, -0.45);
  interior.add(seatedAstronaut);

  const suitMaterial = new T.MeshStandardMaterial({
    color: 0xedebe4,
    roughness: 0.6,
    metalness: 0.1,
  });
  const visorMaterial = new T.MeshPhysicalMaterial({
    color: 0xd47a24,
    metalness: 0.85,
    roughness: 0.15,
    clearcoat: 1.0,
  });

  // Torso
  const driverTorso = new T.Mesh(new T.BoxGeometry(0.44, 0.5, 0.28), suitMaterial);
  driverTorso.position.set(0, 0.38, 0.06);
  driverTorso.rotation.x = -0.12;
  seatedAstronaut.add(driverTorso);

  // Life support chest pack and patches
  box(0.26, 0.24, 0.08, accentOrange, 0, 0.02, 0.16, driverTorso);
  box(0.34, 0.42, 0.16, chassisDark, 0, 0.02, -0.2, driverTorso);

  // Helmet with amber/gold visor
  const driverHelmet = new T.Mesh(new T.SphereGeometry(0.21, 16, 14), suitMaterial);
  driverHelmet.position.set(0, 0.74, 0.04);
  seatedAstronaut.add(driverHelmet);
  const driverVisor = new T.Mesh(new T.SphereGeometry(0.17, 16, 14), visorMaterial);
  driverVisor.position.set(0, 0.74, -0.06);
  driverVisor.scale.set(0.9, 0.75, 0.65);
  seatedAstronaut.add(driverVisor);

  // Arms reaching to steering yoke
  const leftArm = cylinder(0.07, 0.07, 0.38, 8, suitMaterial, -0.22, 0.42, -0.16, seatedAstronaut);
  leftArm.rotation.x = -Math.PI / 3;
  leftArm.rotation.z = 0.2;
  const rightArm = cylinder(0.07, 0.07, 0.38, 8, suitMaterial, 0.22, 0.42, -0.16, seatedAstronaut);
  rightArm.rotation.x = -Math.PI / 3;
  rightArm.rotation.z = -0.2;

  // Legs bent forward in footwell
  const leftLeg = cylinder(0.08, 0.08, 0.42, 8, suitMaterial, -0.14, 0.15, -0.18, seatedAstronaut);
  leftLeg.rotation.x = Math.PI / 4;
  const rightLeg = cylinder(0.08, 0.08, 0.42, 8, suitMaterial, 0.14, 0.15, -0.18, seatedAstronaut);
  rightLeg.rotation.x = Math.PI / 4;

  // ==========================================
  // 6. REAR CARGO BED & SCIENCE EQUIPMENT
  // ==========================================
  const cargoBed = new T.Group();
  cargoBed.position.set(0, 0.75, 1.25);
  root.add(cargoBed);

  // Flatbed deck & side walls
  box(2.0, 0.15, 1.8, chassisDark, 0, 0.08, 0, cargoBed);
  box(0.12, 0.5, 1.8, hullWhite, -0.98, 0.35, 0, cargoBed);
  box(0.12, 0.5, 1.8, hullWhite, 0.98, 0.35, 0, cargoBed);
  box(1.9, 0.5, 0.12, hullWhite, 0, 0.35, 0.88, cargoBed);

  // High-pressure science / gas tanks
  cylinder(0.18, 0.18, 1.2, 16, accentOrange, -0.55, 0.32, 0, cargoBed).rotation.x = Math.PI / 2;
  cylinder(0.18, 0.18, 1.2, 16, hullWhite, 0.55, 0.32, 0, cargoBed).rotation.x = Math.PI / 2;

  // Geological sample container crates
  box(0.65, 0.45, 0.7, titaniumRim, 0, 0.35, -0.3, cargoBed);
  box(0.55, 0.35, 0.6, accentOrange, 0, 0.35, 0.45, cargoBed);

  // High-gain comms dish on rear corner
  const commMast = cylinder(0.05, 0.05, 1.4, 8, titaniumRim, 0.82, 1.2, 0.75, cargoBed);
  const dishBowl = new T.Mesh(
    new T.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    hullWhite,
  );
  dishBowl.rotation.x = Math.PI / 3;
  dishBowl.position.set(0, 0.7, 0);
  commMast.add(dishBowl);

  // ==========================================
  // 7. LIGHTING & EMISSIVE FIXTURES
  // ==========================================
  // Dual LED Headlights on front bumper
  const leftHeadlightMesh = new T.Mesh(new T.CircleGeometry(0.16, 16), headlightGlow);
  leftHeadlightMesh.position.set(-0.75, 0.75, -2.48);
  leftHeadlightMesh.rotation.y = Math.PI;
  root.add(leftHeadlightMesh);

  const rightHeadlightMesh = new T.Mesh(new T.CircleGeometry(0.16, 16), headlightGlow);
  rightHeadlightMesh.position.set(0.75, 0.75, -2.48);
  rightHeadlightMesh.rotation.y = Math.PI;
  root.add(rightHeadlightMesh);

  // Three.js high-intensity SpotLights for nighttime exploration
  const headlightL = new T.SpotLight(0xfffae6, 5.0, 42, Math.PI / 5, 0.45, 1.2);
  headlightL.position.set(-0.75, 0.85, -2.5);
  headlightL.target.position.set(-0.75, 0, -22);
  headlightL.castShadow = true;
  root.add(headlightL);
  root.add(headlightL.target);

  const headlightR = new T.SpotLight(0xfffae6, 5.0, 42, Math.PI / 5, 0.45, 1.2);
  headlightR.position.set(0.75, 0.85, -2.5);
  headlightR.target.position.set(0.75, 0, -22);
  headlightR.castShadow = true;
  root.add(headlightR);
  root.add(headlightR.target);

  // Rear taillight / brake bars
  const leftTaillight = box(0.36, 0.1, 0.05, taillightMat, -0.85, 0.75, 2.45);
  const rightTaillight = box(0.36, 0.1, 0.05, taillightMat, 0.85, 0.75, 2.45);

  // Roof hazard amber flashing beacon
  const roofBeacon = cylinder(0.1, 0.1, 0.14, 12, gaugeGlow, 0, 2.52, -0.45);

  // ==========================================
  // 8. TIRE DUST TRAIL PARTICLES
  // ==========================================
  const dustCount = 48;
  const dustGeo = new T.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = new Float32Array(dustCount * 3);
  const dustLife = new Float32Array(dustCount);

  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = 0;
    dustPos[i * 3 + 1] = -100; // initially hidden
    dustPos[i * 3 + 2] = 0;
    dustLife[i] = 0;
  }
  dustGeo.setAttribute("position", new T.BufferAttribute(dustPos, 3));
  const dustMat = new T.PointsMaterial({
    color: 0xc87d4f,
    size: 0.28,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const dustSystem = new T.Points(dustGeo, dustMat);
  dustSystem.frustumCulled = false;
  root.add(dustSystem);

  let dustIndex = 0;

  // ==========================================
  // UPDATE LOOP FUNCTION
  // ==========================================
  function update(
    rover: RoverVehicle,
    groundY: number,
    dt: number,
    isNight: boolean,
  ) {
    // 1. Position & orientation of chassis
    root.position.set(rover.x, groundY, rover.z);
    root.rotation.set(rover.pitch, rover.yaw, rover.roll, "YXZ");

    // 2. Wheels: steering on front wheels, rolling on all wheels
    for (const assembly of wheelAssemblies) {
      if (assembly.isFront) {
        assembly.pivot.rotation.y = rover.steerAngle;
      }
      assembly.wheel.rotation.x = rover.wheelRoll;
    }

    // 3. Driver visibility (astronaut is seated inside when driving!)
    seatedAstronaut.visible = rover.driving;

    // 4. Headlights & taillights intensity
    const isBraking = rover.handbrake || (rover.speed > 0.5 && rover.handbrake);
    taillightMat.emissiveIntensity = isBraking ? 2.5 : 0.7;
    (taillightMat.color as T.Color).setHex(isBraking ? 0xff2222 : 0x991111);

    const lightLevel = isNight ? 7.5 : 2.5;
    headlightL.intensity = lightLevel;
    headlightR.intensity = lightLevel;

    roofBeacon.rotation.y += dt * 4.0;

    // 5. Tire dust spray behind rear wheels when driving
    const moving = Math.abs(rover.speed) > 0.8;
    if (moving && dt > 0) {
      for (let k = 0; k < 2; k++) {
        const i = dustIndex;
        dustIndex = (dustIndex + 1) % dustCount;
        const side = k === 0 ? -1.35 : 1.35;
        dustPos[i * 3] = side + (Math.random() - 0.5) * 0.3;
        dustPos[i * 3 + 1] = 0.15;
        dustPos[i * 3 + 2] = 2.1 + Math.random() * 0.4;
        dustVel[i * 3] = (Math.random() - 0.5) * 0.8;
        dustVel[i * 3 + 1] = 0.4 + Math.random() * 0.6;
        dustVel[i * 3 + 2] = 1.0 + Math.random() * 1.5;
        dustLife[i] = 1.0;
      }
    }

    for (let i = 0; i < dustCount; i++) {
      if (dustLife[i] > 0) {
        dustLife[i] -= dt * 1.8;
        dustPos[i * 3] += dustVel[i * 3] * dt;
        dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
        dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
        if (dustLife[i] <= 0) {
          dustPos[i * 3 + 1] = -100;
        }
      }
    }
    dustGeo.attributes.position.needsUpdate = true;
  }

  function dispose() {
    root.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Points) {
        o.geometry?.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) {
            o.material.forEach((m) => m.dispose());
          } else {
            o.material.dispose();
          }
        }
      }
    });
  }

  return { root, headlightL, headlightR, update, dispose };
}
