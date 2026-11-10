import * as T from "three";
import { ROVER_WHEEL_OUTER_RADIUS, type RoverVehicle } from "../../game/roverVehicle";

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

function createVolumetricBeamMaterial(): T.ShaderMaterial {
  return new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    uniforms: {
      uColor: { value: new T.Color(0xfff2cf) },
      uIntensity: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPosition.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        if (uIntensity <= 0.001) discard;
        vec3 viewDir = normalize(vViewPos);
        float ndotv = abs(dot(normalize(vNormalView), viewDir));
        float edgeSoft = pow(ndotv, 2.2);
        // vUv.y = 1 near lens (narrow end), 0 at far end of cone
        float distFade = pow(vUv.y, 1.85) * smoothstep(0.0, 0.14, vUv.y);
        float lensBoost = smoothstep(1.0, 0.85, vUv.y) * 0.6 + 0.4;
        float dust = 0.88 + 0.12 * sin(vUv.x * 24.0 + uTime * 1.4) * sin(vUv.y * 18.0 - uTime * 2.2);
        float alpha = edgeSoft * distFade * lensBoost * dust * uIntensity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

/**
 * Creates an imposing, high-fidelity 6-wheeled Mars Exploration Rover
 * with articulated rocker-bogie suspension, volumetric night headlights,
 * transparent cockpit, and seated astronaut driver.
 */
export function createBigRover(): BigRoverHandle {
  const root = new T.Group();
  root.name = "BigRover";

  // --- Materials ---
  const hullYellowGreen = new T.MeshStandardMaterial({
    color: 0x9acd32,
    roughness: 0.35,
    metalness: 0.15,
  });
  const commsWhite = new T.MeshStandardMaterial({
    color: 0xf0efe8,
    roughness: 0.4,
    metalness: 0.1,
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

  function strutBetween(
    p1: T.Vector3,
    p2: T.Vector3,
    radius: number,
    mat: T.Material,
    parent: T.Object3D,
  ): T.Mesh {
    const dir = new T.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const m = new T.Mesh(new T.CylinderGeometry(radius, radius, len, 10), mat);
    m.position.copy(p1).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // Chassis height offset (+0.11m over original) guarantees full tire-to-belly clearance on uneven craters
  const BODY_LIFT = 0.11;

  // ==========================================
  // 1. UNDERBODY CHASSIS & HEAVY SKID FRAME
  // ==========================================
  box(2.15, 0.28, 4.5, chassisDark, 0, 0.45 + BODY_LIFT, 0);
  box(2.0, 0.2, 4.4, hullYellowGreen, 0, 0.65 + BODY_LIFT, 0);

  // Differential cross-axle beam linking Left & Right rockers
  const diffBar = cylinder(0.06, 0.06, 2.36, 12, titaniumRim, 0, 0.72 + BODY_LIFT, -0.45);
  diffBar.rotation.z = Math.PI / 2;

  // Front bull-bar bumper & tow winches
  const frontBumper = box(2.4, 0.35, 0.35, chassisDark, 0, 0.55 + BODY_LIFT, -2.35);
  box(1.8, 0.08, 0.2, accentOrange, 0, 0.25, 0, frontBumper);
  cylinder(0.12, 0.12, 0.35, 16, titaniumRim, -0.6, 0, 0.1, frontBumper).rotation.z = Math.PI / 2;
  cylinder(0.12, 0.12, 0.35, 16, titaniumRim, 0.6, 0, 0.1, frontBumper).rotation.z = Math.PI / 2;

  // Rear heavy step bumper & hitch
  const rearBumper = box(2.4, 0.35, 0.35, chassisDark, 0, 0.55 + BODY_LIFT, 2.35);
  cylinder(0.08, 0.08, 0.25, 16, titaniumRim, 0, 0, 0.2, rearBumper).rotation.x = Math.PI / 2;

  // Rocker side rails and running boards
  box(0.2, 0.1, 3.4, chassisDark, -1.16, 0.48 + BODY_LIFT, 0);
  box(0.2, 0.1, 3.4, chassisDark, 1.16, 0.48 + BODY_LIFT, 0);
  box(0.15, 0.06, 1.2, accentOrange, -1.16, 0.55 + BODY_LIFT, -0.4);
  box(0.15, 0.06, 1.2, accentOrange, 1.16, 0.55 + BODY_LIFT, -0.4);

  // ==========================================
  // 2. ARTICULATED ROCKER-BOGIE SUSPENSION & 6 WHEELS
  // ==========================================
  const wheelRadius = 0.58;
  const wheelWidth = 0.44;
  const wheelRestY = ROVER_WHEEL_OUTER_RADIUS; // 0.63m exact flush ground contact

  type SideSuspension = {
    rockerPivot: T.Group;
    bogiePivot: T.Group;
    bogieBaseY: number;
  };
  const sideSuspensions: Record<"left" | "right", SideSuspension> = {} as Record<"left" | "right", SideSuspension>;

  for (const side of ["left", "right"] as const) {
    const s = side === "left" ? -1 : 1;
    const armX = s * 1.18;

    // Chassis pivot housing
    const hubBoss = cylinder(0.14, 0.14, 0.16, 14, titaniumRim, armX, 0.72 + BODY_LIFT, -0.45);
    hubBoss.rotation.z = Math.PI / 2;
    const hubCap = cylinder(0.08, 0.08, 0.19, 12, accentOrange, armX, 0.72 + BODY_LIFT, -0.45);
    hubCap.rotation.z = Math.PI / 2;

    // Rocker beam pivoting at chassis differential mount (z = -0.45)
    const rockerPivot = new T.Group();
    rockerPivot.position.set(armX, 0.72 + BODY_LIFT, -0.45);
    root.add(rockerPivot);

    // Forward rocker strut -> front wheel knuckle (z = -1.6 -> delta z = -1.15)
    strutBetween(
      new T.Vector3(0, 0, 0),
      new T.Vector3(s * 0.14, -0.14, -1.15),
      0.055,
      titaniumRim,
      rockerPivot,
    );
    // Secondary reinforcing truss
    strutBetween(
      new T.Vector3(0, 0.08, -0.1),
      new T.Vector3(s * 0.12, -0.08, -1.12),
      0.03,
      chassisDark,
      rockerPivot,
    );
    // Rearward rocker strut -> bogie joint (z = +0.80 -> delta z = +1.25)
    strutBetween(
      new T.Vector3(0, 0, 0),
      new T.Vector3(0, -0.08, 1.25),
      0.055,
      titaniumRim,
      rockerPivot,
    );

    // Bogie sub-frame pivoted between Mid (z = 0.0) and Rear (z = +1.6) at z = +0.80
    const bogieBaseY = 0.64 + BODY_LIFT;
    const bogiePivot = new T.Group();
    bogiePivot.position.set(armX, bogieBaseY, 0.80);
    root.add(bogiePivot);

    const bogieJoint = cylinder(0.11, 0.11, 0.15, 12, accentOrange, 0, 0, 0, bogiePivot);
    bogieJoint.rotation.z = Math.PI / 2;
    // Bogie forward arm -> Mid wheel (z = 0.0 -> delta z = -0.80)
    strutBetween(
      new T.Vector3(0, 0, 0),
      new T.Vector3(s * 0.14, -0.06, -0.80),
      0.048,
      titaniumRim,
      bogiePivot,
    );
    // Bogie rear arm -> Rear wheel (z = +1.6 -> delta z = +0.80)
    strutBetween(
      new T.Vector3(0, 0, 0),
      new T.Vector3(s * 0.14, -0.06, 0.80),
      0.048,
      titaniumRim,
      bogiePivot,
    );

    sideSuspensions[side] = { rockerPivot, bogiePivot, bogieBaseY };
  }

  type WheelAssembly = {
    pivot: T.Group;
    wheel: T.Group;
    shockPiston: T.Mesh;
    isFront: boolean;
  };
  const wheelAssemblies: WheelAssembly[] = [];

  const wheelPositions = [
    { x: -1.45, z: -1.6, isFront: true },  // 0: Front Left
    { x: 1.45, z: -1.6, isFront: true },   // 1: Front Right
    { x: -1.45, z: 0.0, isFront: false },  // 2: Mid Left
    { x: 1.45, z: 0.0, isFront: false },   // 3: Mid Right
    { x: -1.45, z: 1.6, isFront: false },  // 4: Rear Left
    { x: 1.45, z: 1.6, isFront: false },   // 5: Rear Right
  ];

  for (const pos of wheelPositions) {
    const pivot = new T.Group();
    pivot.position.set(pos.x, wheelRestY, pos.z);
    root.add(pivot);

    // Steering knuckle / telescoping hydraulic shock strut attached to wheel hub
    const sideDir = pos.x > 0 ? -1 : 1;
    // Horizontal hub axle stub
    const axleStub = cylinder(0.07, 0.07, 0.28, 10, chassisDark, sideDir * 0.16, 0, 0, pivot);
    axleStub.rotation.z = Math.PI / 2;

    // Vertical coil-over shock damper connecting hub up toward rocker/bogie arm
    const shockBody = cylinder(0.055, 0.055, 0.34, 10, chassisDark, sideDir * 0.22, 0.22, 0, pivot);
    shockBody.rotation.z = sideDir * 0.18;
    // Coil spring rings
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const coil = new T.Mesh(new T.TorusGeometry(0.068, 0.015, 6, 12), accentOrange);
      coil.position.set(0, -0.06 + sIdx * 0.065, 0);
      coil.rotation.x = Math.PI / 2;
      shockBody.add(coil);
    }
    // Telescoping titanium piston rod inside shock body
    const shockPiston = cylinder(0.032, 0.032, 0.32, 8, titaniumRim, 0, 0.18, 0, shockBody);

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
      tread.position.set(
        0,
        Math.sin(angle) * (wheelRadius + 0.02),
        Math.cos(angle) * (wheelRadius + 0.02),
      );
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

    wheelAssemblies.push({ pivot, wheel: wheelGroup, shockPiston, isFront: pos.isFront });
  }

  // ==========================================
  // 3. MAIN CABIN & PANORAMIC COCKPIT
  // ==========================================
  const cabin = new T.Group();
  cabin.position.set(0, 0.75 + BODY_LIFT, 0);
  root.add(cabin);

  // Main composite shell
  box(2.1, 0.85, 2.4, hullYellowGreen, 0, 0.45, -0.3, cabin);
  box(2.14, 0.12, 2.44, accentOrange, 0, 0.88, -0.3, cabin);

  // Cockpit glass canopy
  const windshield = new T.Mesh(new T.BoxGeometry(1.85, 0.82, 0.08), canopyGlass);
  windshield.position.set(0, 1.25, -1.35);
  windshield.rotation.x = 0.45;
  cabin.add(windshield);

  // Side cabin windows
  for (const sideX of [-1.02, 1.02]) {
    const sideGlass = new T.Mesh(new T.BoxGeometry(0.06, 0.65, 1.3), canopyGlass);
    sideGlass.position.set(sideX, 1.2, -0.5);
    cabin.add(sideGlass);
  }

  // Roof glass skylight
  const roofGlass = new T.Mesh(new T.BoxGeometry(1.5, 0.06, 1.2), canopyGlass);
  roofGlass.position.set(0, 1.58, -0.5);
  cabin.add(roofGlass);

  // Roof frame structure
  box(1.9, 0.1, 1.5, hullYellowGreen, 0, 1.62, -0.45, cabin);
  box(0.1, 0.75, 0.1, chassisDark, -0.92, 1.25, -1.2, cabin).rotation.x = 0.45;
  box(0.1, 0.75, 0.1, chassisDark, 0.92, 1.25, -1.2, cabin).rotation.x = 0.45;

  // Auxiliary solar panel on roof
  box(1.5, 0.05, 1.1, solarBlue, 0, 1.68, -0.45, cabin);
  box(1.54, 0.02, 1.14, titaniumRim, 0, 1.66, -0.45, cabin);

  // Roof LED off-road lightbar
  box(1.36, 0.1, 0.14, chassisDark, 0, 1.72, -1.15, cabin);
  const roofLightBarGlow = box(1.24, 0.06, 0.04, headlightGlow, 0, 1.72, -1.22, cabin);

  // ==========================================
  // 4. INTERIOR COCKPIT & DASHBOARD
  // ==========================================
  const interior = new T.Group();
  cabin.add(interior);

  const dash = box(1.8, 0.4, 0.5, chassisDark, 0, 0.95, -1.05, interior);
  dash.rotation.x = 0.25;

  const navScreen = new T.Mesh(new T.PlaneGeometry(0.48, 0.28), screenGlow);
  navScreen.position.set(0, 0.08, 0.26);
  navScreen.rotation.x = -0.25;
  dash.add(navScreen);

  const speedoScreen = new T.Mesh(new T.PlaneGeometry(0.36, 0.2), gaugeGlow);
  speedoScreen.position.set(-0.46, 0.08, 0.26);
  speedoScreen.rotation.x = -0.25;
  dash.add(speedoScreen);

  const passengerScreen = new T.Mesh(new T.PlaneGeometry(0.36, 0.2), screenGlow);
  passengerScreen.position.set(0.46, 0.08, 0.26);
  passengerScreen.rotation.x = -0.25;
  dash.add(passengerScreen);

  const yokeColumn = cylinder(0.04, 0.04, 0.4, 8, titaniumRim, -0.46, 0.92, -0.78, interior);
  yokeColumn.rotation.x = 0.45;
  const yokeHandle = box(0.32, 0.06, 0.04, accentOrange, 0, 0.2, 0, yokeColumn);
  box(0.05, 0.14, 0.04, chassisDark, -0.14, 0, 0, yokeHandle);
  box(0.05, 0.14, 0.04, chassisDark, 0.14, 0, 0, yokeHandle);

  for (const seatX of [-0.46, 0.46]) {
    box(0.52, 0.14, 0.55, chassisDark, seatX, 0.55, -0.45, interior);
    const back = box(0.5, 0.72, 0.12, chassisDark, seatX, 0.95, -0.18, interior);
    back.rotation.x = -0.15;
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

  const driverTorso = new T.Mesh(new T.BoxGeometry(0.44, 0.5, 0.28), suitMaterial);
  driverTorso.position.set(0, 0.38, 0.06);
  driverTorso.rotation.x = -0.12;
  seatedAstronaut.add(driverTorso);

  box(0.26, 0.24, 0.08, accentOrange, 0, 0.02, 0.16, driverTorso);
  box(0.34, 0.42, 0.16, chassisDark, 0, 0.02, -0.2, driverTorso);

  const driverHelmet = new T.Mesh(new T.SphereGeometry(0.21, 16, 14), suitMaterial);
  driverHelmet.position.set(0, 0.74, 0.04);
  seatedAstronaut.add(driverHelmet);
  const driverVisor = new T.Mesh(new T.SphereGeometry(0.17, 16, 14), visorMaterial);
  driverVisor.position.set(0, 0.74, -0.06);
  driverVisor.scale.set(0.9, 0.75, 0.65);
  seatedAstronaut.add(driverVisor);

  const leftArm = cylinder(0.07, 0.07, 0.38, 8, suitMaterial, -0.22, 0.42, -0.16, seatedAstronaut);
  leftArm.rotation.x = -Math.PI / 3;
  leftArm.rotation.z = 0.2;
  const rightArm = cylinder(0.07, 0.07, 0.38, 8, suitMaterial, 0.22, 0.42, -0.16, seatedAstronaut);
  rightArm.rotation.x = -Math.PI / 3;
  rightArm.rotation.z = -0.2;

  const leftLeg = cylinder(0.08, 0.08, 0.42, 8, suitMaterial, -0.14, 0.15, -0.18, seatedAstronaut);
  leftLeg.rotation.x = Math.PI / 4;
  const rightLeg = cylinder(0.08, 0.08, 0.42, 8, suitMaterial, 0.14, 0.15, -0.18, seatedAstronaut);
  rightLeg.rotation.x = Math.PI / 4;

  // ==========================================
  // 6. REAR CARGO BED & SCIENCE EQUIPMENT
  // ==========================================
  const cargoBed = new T.Group();
  cargoBed.position.set(0, 0.75 + BODY_LIFT, 1.25);
  root.add(cargoBed);

  box(2.0, 0.15, 1.8, chassisDark, 0, 0.08, 0, cargoBed);
  box(0.12, 0.5, 1.8, hullYellowGreen, -0.98, 0.35, 0, cargoBed);
  box(0.12, 0.5, 1.8, hullYellowGreen, 0.98, 0.35, 0, cargoBed);
  box(1.9, 0.5, 0.12, hullYellowGreen, 0, 0.35, 0.88, cargoBed);

  cylinder(0.18, 0.18, 1.2, 16, accentOrange, -0.55, 0.32, 0, cargoBed).rotation.x = Math.PI / 2;
  cylinder(0.18, 0.18, 1.2, 16, hullYellowGreen, 0.55, 0.32, 0, cargoBed).rotation.x = Math.PI / 2;

  box(0.65, 0.45, 0.7, titaniumRim, 0, 0.35, -0.3, cargoBed);
  box(0.55, 0.35, 0.6, accentOrange, 0, 0.35, 0.45, cargoBed);

  const commMast = cylinder(0.05, 0.05, 1.4, 8, titaniumRim, 0.82, 1.2, 0.75, cargoBed);
  const dishBowl = new T.Mesh(
    new T.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    commsWhite,
  );
  dishBowl.rotation.x = Math.PI / 3;
  dishBowl.position.set(0, 0.7, 0);
  commMast.add(dishBowl);

  // ==========================================
  // 7. VOLUMETRIC & SHADOW-CASTING NIGHT HEADLIGHTS
  // ==========================================
  const leftHeadlightMesh = new T.Mesh(new T.CircleGeometry(0.17, 16), headlightGlow);
  leftHeadlightMesh.position.set(-0.75, 0.75 + BODY_LIFT, -2.48);
  leftHeadlightMesh.rotation.y = Math.PI;
  root.add(leftHeadlightMesh);

  const rightHeadlightMesh = new T.Mesh(new T.CircleGeometry(0.17, 16), headlightGlow);
  rightHeadlightMesh.position.set(0.75, 0.75 + BODY_LIFT, -2.48);
  rightHeadlightMesh.rotation.y = Math.PI;
  root.add(rightHeadlightMesh);

  const configureSpot = (spot: T.SpotLight, x: number, y: number, z: number) => {
    spot.position.set(x, y, z);
    spot.target.position.set(x, -0.6, -26);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.camera.near = 0.8;
    spot.shadow.camera.far = 64;
    spot.shadow.camera.fov = 52;
    spot.shadow.bias = -0.0004;
    spot.shadow.normalBias = 0.04;
    root.add(spot);
    root.add(spot.target);
  };

  // High-intensity physically-decayed spotlights casting shadows across rocks & craters
  const headlightL = new T.SpotLight(0xfff4d4, 95, 64, Math.PI / 4.4, 0.52, 1.45);
  configureSpot(headlightL, -0.75, 0.86 + BODY_LIFT, -2.5);

  const headlightR = new T.SpotLight(0xfff4d4, 95, 64, Math.PI / 4.4, 0.52, 1.45);
  configureSpot(headlightR, 0.75, 0.86 + BODY_LIFT, -2.5);

  // Volumetric atmospheric beam cones (dual bumper beams + roof LED light bar beam)
  const beamMat = createVolumetricBeamMaterial();
  const beamGeo = new T.CylinderGeometry(0.16, 3.6, 22, 24, 1, true);
  beamGeo.translate(0, -11, 0);
  beamGeo.rotateX(Math.PI / 2); // now extends along -Z from lens at origin

  const beamL = new T.Mesh(beamGeo, beamMat);
  beamL.position.set(-0.75, 0.82 + BODY_LIFT, -2.5);
  beamL.rotation.x = 0.04;
  beamL.frustumCulled = false;
  root.add(beamL);

  const beamR = new T.Mesh(beamGeo, beamMat);
  beamR.position.set(0.75, 0.82 + BODY_LIFT, -2.5);
  beamR.rotation.x = 0.04;
  beamR.frustumCulled = false;
  root.add(beamR);

  const roofBeam = new T.Mesh(beamGeo, beamMat);
  roofBeam.position.set(0, 2.45 + BODY_LIFT, -1.2);
  roofBeam.scale.set(1.6, 0.85, 1.1);
  roofBeam.rotation.x = 0.11;
  roofBeam.frustumCulled = false;
  root.add(roofBeam);

  // Rear taillight / brake bars
  box(0.36, 0.1, 0.05, taillightMat, -0.85, 0.75 + BODY_LIFT, 2.45);
  box(0.36, 0.1, 0.05, taillightMat, 0.85, 0.75 + BODY_LIFT, 2.45);

  // Roof hazard amber flashing beacon
  const roofBeacon = cylinder(0.1, 0.1, 0.14, 12, gaugeGlow, 0, 2.52 + BODY_LIFT, -0.45);

  // ==========================================
  // 8. TIRE DUST & MUD SPRAY PARTICLES
  // ==========================================
  const dustCount = 64;
  const dustGeo = new T.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = new Float32Array(dustCount * 3);
  const dustLife = new Float32Array(dustCount);

  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = 0;
    dustPos[i * 3 + 1] = -100;
    dustPos[i * 3 + 2] = 0;
    dustLife[i] = 0;
  }
  dustGeo.setAttribute("position", new T.BufferAttribute(dustPos, 3));
  const dustMat = new T.PointsMaterial({
    color: 0xc87d4f,
    size: 0.30,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const dustSystem = new T.Points(dustGeo, dustMat);
  dustSystem.frustumCulled = false;
  root.add(dustSystem);

  let dustIndex = 0;
  let elapsedTime = 0;

  // ==========================================
  // UPDATE LOOP FUNCTION
  // ==========================================
  function update(
    rover: RoverVehicle,
    groundY: number,
    dt: number,
    isNight: boolean,
  ) {
    elapsedTime += dt;

    // 1. Clamp chassis position & orientation (zero terrain clipping / Z-fighting)
    root.position.set(rover.x, groundY, rover.z);
    root.rotation.set(rover.pitch, rover.yaw, rover.roll, "YXZ");

    // 2. Articulate Rocker-Bogie mechanical linkages
    sideSuspensions.left.rockerPivot.rotation.x = rover.leftRockerAngle;
    sideSuspensions.right.rockerPivot.rotation.x = rover.rightRockerAngle;

    const leftBogieLift = 0.5 * (rover.wheelCompression[2] + rover.wheelCompression[4]);
    const rightBogieLift = 0.5 * (rover.wheelCompression[3] + rover.wheelCompression[5]);
    sideSuspensions.left.bogiePivot.position.y = sideSuspensions.left.bogieBaseY + leftBogieLift;
    sideSuspensions.right.bogiePivot.position.y = sideSuspensions.right.bogieBaseY + rightBogieLift;
    sideSuspensions.left.bogiePivot.rotation.x = rover.leftBogieAngle;
    sideSuspensions.right.bogiePivot.rotation.x = rover.rightBogieAngle;

    // 3. Individual wheel suspension travel, front steering & rolling
    for (let i = 0; i < wheelAssemblies.length; i++) {
      const assembly = wheelAssemblies[i];
      const comp = rover.wheelCompression[i] ?? 0;
      assembly.pivot.position.y = wheelRestY + comp;
      assembly.shockPiston.position.y = 0.18 - comp * 0.45;
      if (assembly.isFront) {
        assembly.pivot.rotation.y = rover.steerAngle;
      }
      assembly.wheel.rotation.x = rover.wheelRoll;
    }

    // 4. Driver visibility & steering yoke feedback
    seatedAstronaut.visible = rover.driving;
    yokeHandle.rotation.z = -rover.steerAngle * 1.4;

    // 5. Headlights, volumetric beams, roof LED bar & brake/reverse lights
    const isBraking = rover.handbrake || (rover.speed > 0.5 && rover.handbrake);
    const isReversing = rover.speed < -0.15;
    taillightMat.emissiveIntensity = isBraking ? 2.8 : isReversing ? 1.8 : 0.75;
    (taillightMat.color as T.Color).setHex(isBraking ? 0xff2222 : isReversing ? 0xffaa44 : 0x991111);

    const headlightsOn = isNight || rover.driving;
    const spotIntensity = isNight ? (rover.driving ? 110 : 55) : rover.driving ? 16 : 0;
    headlightL.intensity = spotIntensity;
    headlightR.intensity = spotIntensity;

    const beamAlpha = isNight ? (rover.driving ? 0.34 : 0.16) : 0.0;
    beamMat.uniforms.uIntensity.value = beamAlpha;
    beamMat.uniforms.uTime.value = elapsedTime;
    beamL.visible = beamR.visible = roofBeam.visible = beamAlpha > 0.005;

    (roofLightBarGlow.material as T.MeshBasicMaterial).color.setHex(
      headlightsOn ? 0xfffae6 : 0x6b726e,
    );

    roofBeacon.rotation.y += dt * 4.0;

    // 6. Tire dust & soft-mud spray particles
    const moving = Math.abs(rover.speed) > 0.8;
    const mud = rover.mudDepth;
    dustMat.color.setHex(mud > 0.3 ? 0x6e4731 : 0xc87d4f);
    dustMat.size = 0.28 + mud * 0.18;

    if (moving && dt > 0) {
      const spawnCount = mud > 0.3 ? 3 : 2;
      for (let k = 0; k < spawnCount; k++) {
        const i = dustIndex;
        dustIndex = (dustIndex + 1) % dustCount;
        const side = k % 2 === 0 ? -1.42 : 1.42;
        const dirSign = rover.speed >= 0 ? 1 : -1;
        dustPos[i * 3] = side + (Math.random() - 0.5) * 0.3;
        dustPos[i * 3 + 1] = 0.12 + (rover.wheelCompression[k % 2 === 0 ? 4 : 5] ?? 0);
        dustPos[i * 3 + 2] = (dirSign > 0 ? 2.0 : -2.0) + Math.random() * 0.4 * dirSign;
        dustVel[i * 3] = (Math.random() - 0.5) * 1.1;
        dustVel[i * 3 + 1] = 0.5 + Math.random() * (0.7 + mud * 0.9);
        dustVel[i * 3 + 2] = dirSign * (1.2 + Math.random() * 1.6);
        dustLife[i] = 1.0;
      }
    }

    for (let i = 0; i < dustCount; i++) {
      if (dustLife[i] > 0) {
        dustLife[i] -= dt * 1.8;
        dustPos[i * 3] += dustVel[i * 3] * dt;
        dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
        dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
        dustVel[i * 3 + 1] -= 2.4 * dt; // subtle Martian gravity drop on mud clumps
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
