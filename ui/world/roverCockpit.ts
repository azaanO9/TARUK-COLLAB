import * as T from "three";
import { getRoverGear, type RoverVehicle } from "../../game/roverVehicle.ts";

export const ROVER_DRIVER_EYE = new T.Vector3(-0.43, 2.16, -0.45);

/** Interior lining in the same local coordinates as the measured MMSEV body. */
export function createRoverCockpit() {
  const root = new T.Group();
  root.name = "RoverCockpit";
  root.visible = false;
  const ivory = new T.MeshStandardMaterial({ color: 0xc9c8bf, roughness: .82 });
  const graphite = new T.MeshStandardMaterial({ color: 0x252e32, roughness: .68 });
  const upholstery = new T.MeshStandardMaterial({ color: 0x3f5259, roughness: .95 });
  const alloy = new T.MeshStandardMaterial({ color: 0x849496, metalness: .5, roughness: .4 });
  const amber = new T.MeshStandardMaterial({ color: 0xd88038, roughness: .6 });
  const glow = new T.MeshBasicMaterial({ color: 0xb9eee5 });

  function box(name: string, size: number[], position: number[], material: T.Material) {
    const mesh = new T.Mesh(new T.BoxGeometry(...size as [number, number, number]), material);
    mesh.name = name;
    mesh.position.set(...position as [number, number, number]);
    root.add(mesh);
    return mesh;
  }
  function rail(name: string, start: number[], end: number[], radius = .035) {
    const a = new T.Vector3(...start as [number, number, number]);
    const b = new T.Vector3(...end as [number, number, number]);
    const delta = b.clone().sub(a);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, delta.length(), 12), alloy);
    mesh.name = name;
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    root.add(mesh);
  }

  box("cabin-floor", [2.12, .12, 3.85], [0, 1.12, -.05], graphite);
  box("rear-bulkhead", [2.12, 1.8, .10], [0, 2.08, 1.82], ivory);
  box("roof-lining", [1.94, .10, 3.55], [0, 2.99, .08], ivory);
  box("rear-airlock", [.7, 1.45, .035], [0, 1.93, 1.75], graphite);
  box("airlock-inset", [.56, 1.25, .025], [0, 1.93, 1.72], alloy);
  box("door-handle", [.06, .24, .07], [.22, 1.93, 1.67], amber);
  for (const side of [-1, 1]) {
    box("lower-sidewall", [.10, .62, 3.75], [side * 1.06, 1.49, -.03], ivory);
    box("rear-sidewall", [.10, 1.18, 1.95], [side * 1.06, 2.38, .87], ivory);
    box("side-window-header", [.11, .12, 1.75], [side * 1.01, 2.86, -.98], graphite);
    // The windshield and side windows are actual openings between these rails.
    rail("windshield-pillar", [side * 1.02, 1.78, -2.06], [side * .93, 2.89, -1.72], .045);
    rail("side-window-pillar", [side * 1.04, 1.78, -.15], [side * .98, 2.89, -.15], .04);
    rail("grab-handle", [side * .92, 2.65, -.1], [side * .92, 2.65, .35], .025);
    box("ceiling-light", [.04, .02, 1.55], [side * .67, 2.925, .15], glow);
    box("seat-pedestal", [.40, .32, .48], [side * .43, 1.34, -.08], alloy);
    box("seat-cushion", [.53, .15, .59], [side * .43, 1.55, -.16], upholstery);
    box("seat-back", [.54, .76, .14], [side * .43, 1.94, .15], upholstery);
    box("seat-headrest", [.35, .23, .13], [side * .43, 2.41, .17], graphite);
    box("harness", [.06, .66, .025], [side * .43 + .15, 1.96, .065], amber);
    box("armrest", [.09, .08, .40], [side * .43 + side * .31, 1.81, -.1], graphite);
  }
  rail("windshield-center-mullion", [0, 1.78, -2.06], [0, 2.89, -1.72], .025);
  rail("windshield-header", [-.93, 2.89, -1.72], [.93, 2.89, -1.72], .045);
  rail("windshield-sill", [-1.02, 1.78, -2.06], [1.02, 1.78, -2.06], .045);
  box("dashboard", [1.98, .18, .56], [0, 1.62, -1.73], graphite);
  box("front-footwell", [1.96, .5, .10], [0, 1.38, -2.05], ivory);
  for (const x of [-.55, -.31]) box("pedal", [.13, .06, .24], [x, 1.23, -1.31], alloy);
  box("center-console", [.25, .42, .85], [0, 1.43, -.55], graphite);
  for (let i = 0; i < 5; i++) {
    box("console-switch", [.065, .025, .08], [0, 1.65, -.77 + i * .13], i === 4 ? amber : alloy);
  }
  const yoke = new T.Group();
  yoke.name = "steering-yoke";
  yoke.position.set(-.43, 1.69, -1.28);
  root.add(yoke);
  for (const side of [-1, 1]) {
    const grip = new T.Mesh(new T.CapsuleGeometry(.035, .17, 4, 10), graphite);
    grip.position.set(side * .18, .02, 0);
    yoke.add(grip);
  }
  const crossbar = new T.Mesh(new T.BoxGeometry(.39, .055, .06), alloy);
  yoke.add(crossbar);
  rail("steering-column", [-.43, 1.62, -1.65], [-.43, 1.69, -1.29], .035);

  const canvas = document.createElement("canvas");
  canvas.width = 768; canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const screenMaterial = new T.MeshBasicMaterial({ map: texture });
  const screen = new T.Mesh(new T.PlaneGeometry(1.14, .34), screenMaterial);
  screen.position.set(0, 1.90, -1.62);
  screen.rotation.x = -.48;
  root.add(screen);
  const cabinLight = new T.PointLight(0xc4e8ee, 2.4, 4, 2);
  cabinLight.position.set(0, 2.7, -.25);
  root.add(cabinLight);
  let lastReadout = "";
  function update(rover: RoverVehicle) {
    yoke.rotation.z = rover.steerAngle * 1.6;
    const speed = Math.round(Math.abs(rover.speed) * 3.6);
    const heading = T.MathUtils.euclideanModulo(Math.round(-rover.yaw * 180 / Math.PI), 360);
    const gear = getRoverGear(rover.speed);
    const readout = `${speed}/${heading}/${gear}/${rover.handbrake}`;
    if (lastReadout === readout) return;
    lastReadout = readout;
    context.fillStyle = "#071b22"; context.fillRect(0, 0, 768, 256);
    context.fillStyle = "#9cb9c0"; context.font = "22px monospace";
    context.fillText("TARUKH / SURFACE MOBILITY", 26, 38);
    context.fillStyle = "#cbfff4"; context.font = "bold 76px monospace";
    context.fillText(String(speed).padStart(2, "0"), 28, 133);
    context.font = "24px monospace"; context.fillText("KM/H", 145, 131);
    context.font = "bold 42px monospace"; context.fillText(gear, 325, 112);
    context.font = "24px monospace"; context.fillText(`HDG ${String(heading).padStart(3, "0")}`, 490, 110);
    context.fillStyle = rover.handbrake ? "#ffb56d" : "#82cebc";
    context.fillText(rover.handbrake ? "PARK BRAKE" : "DRIVE SYSTEM READY", 26, 204);
    context.fillStyle = "#48636c"; context.fillRect(26, 224, 716, 2);
    texture.needsUpdate = true;
  }
  return { root, update, texture };
}

/** Seat and look direction follow chassis pitch/roll as well as heading. */
export function positionRoverCockpitCamera(camera: T.Camera, roverRoot: T.Object3D, yaw: number, pitch: number) {
  roverRoot.updateWorldMatrix(true, false);
  camera.position.copy(ROVER_DRIVER_EYE);
  roverRoot.localToWorld(camera.position);
  camera.quaternion.setFromEuler(new T.Euler(T.MathUtils.clamp(pitch, -.7, .55), yaw, 0, "YXZ"));
  camera.quaternion.premultiply(roverRoot.getWorldQuaternion(new T.Quaternion()));
}
