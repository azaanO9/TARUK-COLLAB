import * as T from "three";
import {assetUrl} from '../../lib/assetUrl.ts';
import {MARS_LANDMARKS} from '../../content/marsLandmarks.ts';
import {REGION_WORLD_BOUNDS as B,isSurveyedRegion} from '../../game/marsRegion.ts';
import type { LidarScan } from "../../game/roverLidar";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getRoverGear, type RoverVehicle } from "../../game/roverVehicle.ts";
import { ROVER_WINDOW_CONTOURS } from "./roverWindowContours.ts";

export const ROVER_DRIVER_EYE = new T.Vector3(-.34, 2.03, -.73);

/** Outer edge of a planar frame, shared with the adjoining pressure wall. */
function windowSurround(points: number[][]) {
  const center = points.reduce((v, p) => v.add(new T.Vector3(...p as [number, number, number])), new T.Vector3()).divideScalar(points.length);
  const a = new T.Vector3(...points[0] as [number, number, number]);
  const normal = new T.Vector3(...points[Math.floor(points.length / 3)] as [number, number, number]).sub(a)
    .cross(new T.Vector3(...points[Math.floor(points.length * 2 / 3)] as [number, number, number]).sub(a)).normalize();
  return points.map(p => {
    const dx = p[0] - center.x, dy = p[1] - center.y, length = Math.hypot(dx, dy);
    const x = p[0] + dx / length * .026, y = p[1] + dy / length * .026;
    return [x, y, a.z - (normal.x * (x - a.x) + normal.y * (y - a.y)) / normal.z];
  });
}

/** Seven glazing contours measured in the exterior asset's coordinate system. */
export function createRoverWindowLining() {
  const outline = Array.from({ length: 64 }, (_, i) => new T.Vector2(1.11 * Math.cos(i * Math.PI / 32), 1.76 + .81 * Math.sin(i * Math.PI / 32)));
  const shape = new T.Shape(outline);
  const surrounds = ROVER_WINDOW_CONTOURS.map(windowSurround);
  for (const points of surrounds) shape.holes.push(new T.Path(points.map(p => new T.Vector2(p[0], p[1])).reverse()));
  const geometry = new T.ShapeGeometry(shape), position = geometry.attributes.position;
  const measured = surrounds.flat();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    const edge = measured.find(p => Math.abs(x - p[0]) < .00001 && Math.abs(y - p[1]) < .00001);
    position.setZ(i, edge ? edge[2] + .025 : -1.52);
  }
  geometry.computeVertexNormals(); return geometry;
}

/** Original fitted cabin. Static fittings are merged by material before rendering. */
export function createRoverCockpit() {
  const root = new T.Group(); root.name = "RoverCockpit"; root.visible = false;
  const ivory = new T.MeshStandardMaterial({ color: 0xd7dbd8, metalness: .22, roughness: .38, side: T.DoubleSide });
  const graphite = new T.MeshStandardMaterial({ color: 0x20292e, metalness: .35, roughness: .46, side: T.DoubleSide });
  const dark = new T.MeshStandardMaterial({ color: 0x0c141b, roughness: .7, side: T.DoubleSide });
  const upholstery = new T.MeshStandardMaterial({ color: 0x333d43, roughness: .92 });
  const alloy = new T.MeshStandardMaterial({ color: 0x899da5, metalness: .72, roughness: .28 });
  const amber = new T.MeshStandardMaterial({ color: 0xe58d48, roughness: .45 });
  const glow = new T.MeshBasicMaterial({ color: 0xa9e9ee });
  const white = new T.MeshBasicMaterial({ color: 0xe1f3ee });
  const staticMeshes: T.Mesh[] = [];
  function mesh(name: string, geometry: T.BufferGeometry, material: T.Material, position = [0, 0, 0]) {
    const object = new T.Mesh(geometry, material); object.name = name;
    object.position.set(...position as [number, number, number]); root.add(object); staticMeshes.push(object); return object;
  }
  function box(name: string, size: number[], position: number[], material: T.Material) {
    return mesh(name, new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(.018, ...size.map(v => v * .22))), material, position);
  }
  function rail(name: string, a: number[], b: number[], radius = .012, material: T.Material = alloy) {
    const start = new T.Vector3(...a as [number, number, number]), end = new T.Vector3(...b as [number, number, number]);
    const delta = end.clone().sub(start), object = mesh(name, new T.CylinderGeometry(radius, radius, delta.length(), 8), material);
    object.position.copy(start).add(end).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return object;
  }
  mesh("seven-window-pressure-lining", createRoverWindowLining(), graphite);
  for (const [index, points] of ROVER_WINDOW_CONTOURS.entries()) {
    const outer = windowSurround(points);
    const vertices: number[] = [], indices: number[] = [];
    // Seals extend outwards, preserving the measured opening rather than covering it.
    for (const [i, p] of points.entries()) {
      // The wall ends at this same outer edge; the frame cannot intersect it.
      vertices.push(p[0], p[1], p[2] + .026, outer[i][0], outer[i][1], outer[i][2] + .026);
    }
    for (let i = 0; i < points.length; i++) { const a = i * 2, b = (i + 1) % points.length * 2; indices.push(a, a + 1, b, b, a + 1, b + 1); }
    const seal = new T.BufferGeometry().setAttribute("position", new T.Float32BufferAttribute(vertices, 3)).setIndex(indices);
    seal.computeVertexNormals(); mesh(`window-${index + 1}-seal`, seal, alloy);
  }
  // An opaque barrel closes the side/rear view; only the seven front panes are open.
  const barrel = new T.CylinderGeometry(1, 1, 3.02, 48, 1, true);
  barrel.rotateX(Math.PI / 2); barrel.scale(1.11, .81, 1); barrel.translate(0, 1.76, -.01);
  mesh("curved-pressure-shell", barrel, graphite);
  box("floor", [1.66, .06, 2.92], [0, 1.12, -.01], dark);
  const rear = new T.CircleGeometry(1, 48); rear.scale(1.11, .81, 1);
  mesh("rear-bulkhead", rear, graphite, [0, 1.76, 1.50]);
  box("airlock-frame", [.72, 1.19, .045], [0, 1.75, 1.42], alloy);
  box("airlock", [.65, 1.11, .045], [0, 1.75, 1.39], dark);
  rail("airlock-handle", [.23, 1.6, 1.34], [.23, 1.84, 1.34], .018);
  for (const z of [-.65, .35, 1.3]) {
    const points = Array.from({ length: 33 }, (_, i) => new T.Vector3(Math.cos(i / 32 * Math.PI) * 1.09, 1.76 + Math.sin(i / 32 * Math.PI) * .79, z));
    mesh("cabin-rib", new T.TubeGeometry(new T.CatmullRomCurve3(points), 32, .014, 6, false), alloy);
  }
  for (const side of [-1, 1]) {
    rail("overhead-light", [side * .62, 2.40, -1.20], [side * .62, 2.40, 1.32], .009, white);
    box("seat-base", [.44, .21, .5], [side * .34, 1.26, -.73], graphite);
    box("seat-cushion", [.48, .12, .54], [side * .34, 1.43, -.78], upholstery);
    box("seat-back", [.48, .60, .12], [side * .34, 1.76, -.48], upholstery).rotation.x = -.13;
    box("headrest", [.30, .21, .13], [side * .34, 2.13, -.43], dark);
    for (const x of [-.14, .14]) box("seat-harness", [.035, .55, .015], [side * .34 + x, 1.77, -.57], alloy);
    box("console-body", [.35, .17, .83], [side * .77, 1.58, -1.06], dark).rotation.x = -.13;
    box("ivory-console-surround", [.37, .045, .86], [side * .77, 1.68, -1.07], ivory).rotation.x = -.13;
    box("recessed-control-panel", [.31, .021, .77], [side * .77, 1.707, -1.07], graphite).rotation.x = -.13;
    rail("console-light-strip", [side * .58, 1.71, -1.45], [side * .58, 1.61, -.66], .006, glow);
    for (let i = 0; i < 4; i++) {
      const x = side * .77 + (i % 2 ? .08 : -.08), z = -1.28 + Math.floor(i / 2) * .11;
      box("switch-socket", [.043, .014, .065], [x, 1.755, z], alloy);
      rail("toggle", [x, 1.77, z], [x, 1.80, z - .01], .009, i === 0 ? amber : dark);
    }
    rail("console-edge", [side * .98, 1.66, -1.44], [side * .98, 1.56, -.68], .013);
  }
  // A thin instrument band sits between the upper and lower glazing rows.
  box("dashboard-surround", [1.21, .12, .16], [0, 1.735, -1.91], ivory);
  box("instrument-recess", [1.13, .105, .026], [0, 1.75, -1.814], dark).rotation.x = -.18;
  rail("dashboard-light", [-.56, 1.805, -1.82], [.56, 1.805, -1.82], .005, glow);
  for (const x of [-.46, -.23]) box("pedal", [.12, .04, .20], [x, 1.19, -1.48], alloy).rotation.x = .27;
  const stick = new T.Group(); stick.name = "steering-stick"; stick.position.set(-.02, 1.49, -1.11); root.add(stick);
  box("stick-plinth", [.17, .12, .25], [-.02, 1.48, -1.11], ivory);
  const grip = new T.Mesh(new T.CapsuleGeometry(.028, .19, 4, 10), dark); grip.position.y = .17; grip.rotation.x = -.14; stick.add(grip);
  const button = new T.Mesh(new T.SphereGeometry(.014, 8, 6), amber); button.position.set(0, .28, .015); stick.add(button);
  rail("throttle", [-.78, 1.72, -.88], [-.78, 1.87, -.87], .018);
  box("throttle-grip", [.15, .045, .05], [-.78, 1.87, -.87], dark);

  const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext("2d")!;
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  const screenMaterial = new T.MeshBasicMaterial({ map: texture });
  function screen(name: string, width: number, height: number, position: number[], rotation: number[], region: number[]) {
    const geometry = new T.PlaneGeometry(width, height), uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, region[0] + uv.getX(i) * region[2], region[1] + uv.getY(i) * region[3]);
    const display = new T.Mesh(geometry, screenMaterial); display.name = name;
    display.position.set(...position as [number, number, number]); display.rotation.set(...rotation as [number, number, number]); root.add(display);
  }
  screen("driving-instruments", 1.06, .083, [0, 1.75, -1.795], [-.18, 0, 0], [0, .75, 1, .25]);
  for (const side of [-1, 1]) {
    box("side-display-bezel", [.32, .19, .035], [side * .77, 1.82, -1.52], alloy).rotation.set(-.28, side * -.28, 0);
    screen("side-multifunction-display", .29, .16, [side * .77, 1.825, -1.496], [-.28, side * -.28, 0], [side < 0 ? 0 : .5, 0, .5, .75]);
  }
  const buckets = new Map<T.Material, T.BufferGeometry[]>();
  for (const object of staticMeshes) {
    object.updateMatrix(); const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrix); geometry.deleteAttribute("uv");
    const material = object.material as T.Material;
    if (!buckets.has(material)) buckets.set(material, []); buckets.get(material)!.push(geometry);
    root.remove(object); object.geometry.dispose();
  }
  for (const [material, geometries] of buckets) {
    const batch = new T.Mesh(mergeGeometries(geometries), material); batch.name = "cabin-fittings"; root.add(batch);
    geometries.forEach(g => g.dispose());
  }
  // Keep the light outside the visibility-switched root to prevent shader stalls.
  const cabinLight = new T.PointLight(0xd9efff, 0, 4, 2); cabinLight.position.set(0, 2.30, -1.10);
  let lastReadout = "",lastPaint=-Infinity;
  const regionMap=typeof Image==='undefined'?null:new Image();
  if(regionMap)regionMap.src=assetUrl('art/mars-mola-overview.webp');
  let lastScan: LidarScan | undefined;
  function update(rover: RoverVehicle, scan?: LidarScan, curiosity?: { x: number; z: number; yaw?: number } | null) {
    stick.rotation.z = -rover.steerAngle * .65;
    // Bound the existing 1024 × 512 canvas upload to the LiDAR cadence.
    const now=performance.now();if(now-lastPaint<125)return;lastPaint=now;
    const speed = Math.round(Math.abs(rover.speed) * 3.6);
    const heading = T.MathUtils.euclideanModulo(Math.round(-rover.yaw * 180 / Math.PI), 360);
    const gear = getRoverGear(rover.speed);
    const posKey = `${Math.round(rover.x * 4)}/${Math.round(rover.z * 4)}`;
    const readout = `${speed}/${heading}/${gear}/${rover.handbrake}/${posKey}`;
    if (lastReadout === readout && lastScan === scan) return;
    lastReadout = readout; lastScan = scan;

    context.fillStyle = "#07131d"; context.fillRect(0, 0, 1024, 512);

    // TOP HORIZONTAL INSTRUMENT STRIP (driving-instruments UV region [0, 0.75, 1, 0.25])
    context.fillStyle = "#a8f0f3"; context.font = "bold 45px monospace";
    context.fillText(`${String(speed).padStart(2, "0")} KM/H`, 24, 70);
    context.fillText(gear, 380, 70); context.fillText(`HDG ${String(heading).padStart(3, "0")}`, 545, 70);
    context.fillStyle = rover.handbrake ? "#ffb86c" : "#8de3c2"; context.font = "21px monospace";
    context.fillText(rover.handbrake ? "PARK BRAKE" : scan?.threatDistance != null ? `OBSTACLE / ${scan.threatDistance.toFixed(1)} m` : "SURFACE MOBILITY / READY", 24, 111);

    // =========================================================================
    // LEFT MULTIFUNCTION DISPLAY: GTA V STYLE TOPOGRAPHIC RECTANGULAR MINIMAP
    // (Region: x: 12..500, y: 136..500)
    // =========================================================================
    context.fillStyle = "#08101a"; context.fillRect(12, 136, 488, 368);

    // 1. Top GPS Header
    context.fillStyle = "#38bdf8";
    context.beginPath(); context.arc(28, 156, 4.5, 0, Math.PI * 2); context.fill();
    context.font = "bold 16px monospace";
    context.fillText("LIDAR · 30M", 38, 162);
    context.fillStyle = "#f8fafc";
    context.fillText("ELYSIUM REGION", 340, 162);

    // Divider
    context.strokeStyle = "rgba(255, 255, 255, 0.12)";
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(16, 170); context.lineTo(496, 170); context.stroke();

    // 2. Rectangular Map Frame (clipped)
    const mapL = 16, mapT = 175, mapW = 480, mapH = 248;
    const mapCenterX = mapL + mapW / 2; // 256
    const mapCenterY = mapT + mapH / 2; // 299
    const mapScale = 4.0; // 30m * 4 = 120px radius

    context.save();
    context.beginPath();
    if (typeof (context as any).roundRect === "function") {
      (context as any).roundRect(mapL, mapT, mapW, mapH, 6);
    } else {
      context.rect(mapL, mapT, mapW, mapH);
    }
    context.fillStyle = "#0d1723";
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.22)";
    context.lineWidth = 1.6;
    context.stroke();
    context.clip();

    // Geographic registration matches the external field map; no decorative fake elevations.
    if(regionMap?.complete&&regionMap.naturalWidth){
      context.save();context.globalAlpha=.52;
      context.drawImage(regionMap,mapCenterX+(B.west-rover.x)*mapScale,mapCenterY+(B.north-rover.z)*mapScale,(B.east-B.west)*mapScale,(B.south-B.north)*mapScale);
      context.restore();
    }

    // Distance range rings (10m, 20m, 30m)
    context.strokeStyle = "rgba(56, 189, 248, 0.2)";
    context.lineWidth = 1;
    if (typeof context.setLineDash === "function") context.setLineDash([4, 4]);
    for (const radius of [10, 20]) {
      context.beginPath();
      context.arc(mapCenterX, mapCenterY, radius * mapScale, 0, Math.PI * 2);
      context.stroke();
    }
    if (typeof context.setLineDash === "function") context.setLineDash([]);
    context.beginPath();
    context.arc(mapCenterX, mapCenterY, 30 * mapScale, 0, Math.PI * 2);
    context.stroke();

    // Subtle GPS Crosshairs
    context.strokeStyle = "rgba(56, 189, 248, 0.15)";
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(mapCenterX, mapT); context.lineTo(mapCenterX, mapT + mapH);
    context.moveTo(mapL, mapCenterY); context.lineTo(mapL + mapW, mapCenterY);
    context.stroke();

    // North Indicator (GTA 5 Red 'N' at top of map)
    context.fillStyle = "#ef4444";
    context.beginPath();
    context.moveTo(mapCenterX, mapT + 4);
    context.lineTo(mapCenterX - 5, mapT + 12);
    context.lineTo(mapCenterX + 5, mapT + 12);
    context.closePath();
    context.fill();
    context.font = "bold 11px monospace";
    context.textAlign = "center";
    context.fillText("N", mapCenterX, mapT + 24);
    context.textAlign = "left";

    // LANDING SHUTTLE ICON (Home at x=0, z=12)
    const hx = mapCenterX + (0 - rover.x) * mapScale;
    const hy = mapCenterY + (12 - rover.z) * mapScale;
    if (hx >= mapL - 10 && hx <= mapL + mapW + 10 && hy >= mapT - 10 && hy <= mapT + mapH + 10) {
      context.fillStyle = "#f59e0b";
      context.beginPath(); context.arc(hx, hy, 7, 0, Math.PI * 2); context.fill();
      context.strokeStyle = "#fbbf24"; context.lineWidth = 1.2; context.stroke();
      context.fillStyle = "#ffffff";
      context.beginPath(); context.arc(hx, hy, 2.5, 0, Math.PI * 2); context.fill();
      context.font = "10px monospace"; context.fillStyle = "#fbbf24";
      context.fillText("LANDER", hx - 18, hy + 16);
    }

    // CURIOSITY ROVER ICON (If present)
    if (curiosity) {
      const cx = mapCenterX + (curiosity.x - rover.x) * mapScale;
      const cy = mapCenterY + (curiosity.z - rover.z) * mapScale;
      if (cx >= mapL - 10 && cx <= mapL + mapW + 10 && cy >= mapT - 10 && cy <= mapT + mapH + 10) {
        context.fillStyle = "#c084fc";
        context.beginPath(); context.arc(cx, cy, 6, 0, Math.PI * 2); context.fill();
        context.strokeStyle = "#e9d5ff"; context.lineWidth = 1; context.stroke();
        context.font = "10px monospace"; context.fillStyle = "#e9d5ff";
        context.fillText("CURIOSITY", cx - 26, cy + 15);
      }
    }

    // LiDAR Contacts & Hazards
    for (const contact of scan?.contacts ?? []) {
      const dx = contact.x - rover.x;
      const dz = contact.z - rover.z;
      const x = mapCenterX + dx * mapScale;
      const y = mapCenterY + dz * mapScale;

      if (contact.inPath) {
        // Red hazard diamond with '!'
        context.fillStyle = "#ef4444";
        context.beginPath();
        context.moveTo(x, y - 8); context.lineTo(x + 8, y); context.lineTo(x, y + 8); context.lineTo(x - 8, y);
        context.closePath();
        context.fill();
        context.strokeStyle = "#ffffff"; context.lineWidth = 1.2; context.stroke();
        context.fillStyle = "#ffffff"; context.font = "bold 9px monospace"; context.textAlign = "center";
        context.fillText("!", x, y + 3);
        context.textAlign = "left";
      } else {
        // Cyan sonar blip
        context.fillStyle = "#38bdf8";
        context.beginPath();
        context.arc(x, y, Math.max(3, Math.min(8, contact.radius * mapScale)), 0, Math.PI * 2);
        context.fill();
      }
    }

    // Center Player Arrow (GTA V White Arrow rotated to vehicle yaw)
    context.save();
    context.translate(mapCenterX, mapCenterY);
    context.rotate(-rover.yaw);
    // Cyan center beacon ring
    context.strokeStyle = "#38bdf8"; context.lineWidth = 1;
    context.beginPath(); context.arc(0, 0, 5, 0, Math.PI * 2); context.stroke();
    // Crisp GTA V white arrow with black outline
    context.beginPath();
    context.moveTo(0, -13);
    context.lineTo(7.5, 9);
    context.lineTo(0, 4.5);
    context.lineTo(-7.5, 9);
    context.closePath();
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = "#050a14";
    context.lineWidth = 2.2;
    context.stroke();
    context.restore();

    // Six named-feature bearings, clamped into the physical cockpit display.
    context.font='bold 17px monospace';context.textAlign='center';
    for(const place of MARS_LANDMARKS){
      const dx=(place.x-rover.x)*mapScale,dz=(place.z-rover.z)*mapScale;
      const scale=Math.min(1,(mapW/2-18)/Math.max(1e-9,Math.abs(dx)),(mapH/2-18)/Math.max(1e-9,Math.abs(dz)));
      const px=mapCenterX+dx*scale,py=mapCenterY+dz*scale;
      context.fillStyle='#ffedb1';context.beginPath();context.moveTo(px,py-12);context.lineTo(px+12,py);context.lineTo(px,py+12);context.lineTo(px-12,py);context.closePath();context.fill();
      context.fillStyle='#10212b';context.fillText(String(place.number),px,py+6);
    }
    context.textAlign='left';
    context.restore(); // End map clipping

    // 3. GTA 5 Tri-Bars directly underneath the map
    const barY = 431, barH = 6, barGap = 6;
    const barW = Math.floor((mapW - barGap * 2) / 3); // ~156px each

    // Bar 1: Clearance (Green -> Red when blocked)
    const isHazard = scan?.threatDistance != null;
    const threatDist = scan?.threatDistance ?? 20;
    const clearancePct = isHazard ? Math.min(1, Math.max(0.15, threatDist / 20)) : 1;
    context.fillStyle = "rgba(0, 0, 0, 0.65)";
    context.fillRect(mapL, barY, barW, barH);
    context.fillStyle = isHazard ? "#ffce84" : "#7dd3fc";
    context.fillRect(mapL, barY, barW * clearancePct, barH);

    // Bar 2: Sensor / LiDAR Link (Blue)
    context.fillStyle = "rgba(0, 0, 0, 0.65)";
    context.fillRect(mapL + barW + barGap, barY, barW, barH);
    context.fillStyle = "#38bdf8";
    context.fillRect(mapL + barW + barGap, barY, barW, barH);

    // Bar 3: inside the surveyed region (Yellow)
    context.fillStyle = "rgba(0, 0, 0, 0.65)";
    context.fillRect(mapL + (barW + barGap) * 2, barY, barW, barH);
    context.fillStyle = "#eab308";
    context.fillRect(mapL + (barW + barGap) * 2, barY, barW * (isSurveyedRegion(rover.x,rover.z)?1:0), barH);

    // 4. GTA 5 Street & Distance Telemetry
    context.fillStyle = isHazard ? "#ef4444" : "#f8fafc";
    context.font = "bold 15px monospace";
    context.fillText(isHazard ? "HAZARD DETECTED" : (isSurveyedRegion(rover.x,rover.z)?"ELYSIUM REGION · MARS":"PROCEDURAL FRONTIER"), mapL, 458);

    context.fillStyle = isHazard ? "#f87171" : "#7dd3fc";
    context.font = "14px monospace";
    const statusText = isHazard
      ? `OBSTACLE · ${threatDist.toFixed(1)} M`
      : scan
      ? "PATH CLEAR · 12 M"
      : "SCANNING…";
    context.fillText(statusText, mapL, 478);

    // =========================================================================
    // RIGHT MULTIFUNCTION DISPLAY: VEHICLE DIAGNOSTICS & SYSTEM STATUS
    // =========================================================================
    context.fillStyle = "#83b8c9"; context.font = "22px monospace";
    context.fillText("VEHICLE / STATUS", 540, 167);
    for (let i = 0; i < 6; i++) {
      context.fillStyle = "#83d6d2";
      context.fillRect(562 + (i % 2) * 48, 223 + Math.floor(i / 2) * 66, 29, 44);
    }
    context.fillStyle = "#b0d4da"; context.font = "22px monospace";
    context.fillText("6 WHEEL DRIVE", 708, 249);
    context.fillText("INDEPENDENT", 708, 301);
    context.fillText("SUSPENSION", 708, 334);
    context.fillStyle = rover.handbrake ? "#ffb86c" : "#8de3c2";
    context.fillText(rover.handbrake ? "BRAKE / SET" : "DRIVE / ACTIVE", 550, 451);

    texture.needsUpdate = true;
  }
  return { root, update, texture, cabinLight };
}

/** Seat and look direction follow chassis pitch/roll as well as heading. */
export function positionRoverCockpitCamera(camera: T.Camera, roverRoot: T.Object3D, yaw: number, pitch: number) {
  roverRoot.updateWorldMatrix(true, false); camera.position.copy(ROVER_DRIVER_EYE); roverRoot.localToWorld(camera.position);
  camera.quaternion.setFromEuler(new T.Euler(T.MathUtils.clamp(pitch, -.7, .55), yaw, 0, "YXZ"));
  camera.quaternion.premultiply(roverRoot.getWorldQuaternion(new T.Quaternion()));
}
