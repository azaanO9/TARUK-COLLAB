import * as T from "three";
import type { BiomeId, NetworkPlayerState } from "../../game/multiplayerTypes.ts";

export type RemoteAstronautsHandle = {
  root: T.Group;
  update: (
    players: readonly NetworkPlayerState[],
    selfId: string | null,
    activeBiome: BiomeId,
    heightAt: (x: number, z: number) => number,
    dt: number,
  ) => void;
  dispose: () => void;
};

type RemoteRig = {
  group: T.Group;
  leftLeg: T.Mesh;
  rightLeg: T.Mesh;
  leftArm: T.Mesh;
  rightArm: T.Mesh;
  sprite: T.Sprite;
  labelCanvas: HTMLCanvasElement;
  labelCtx: CanvasRenderingContext2D;
  labelTex: T.CanvasTexture;
  lastTagKey: string;
  phase: number;
};

function drawNameTag(
  ctx: CanvasRenderingContext2D,
  callsign: string,
  suitIntegrity: number,
  talking: boolean,
  suitColor: string,
) {
  const w = 256;
  const h = 72;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "rgba(9, 17, 26, 0.84)";
  ctx.beginPath();
  ctx.roundRect(10, 8, w - 20, h - 16, 10);
  ctx.fill();

  ctx.strokeStyle = talking ? "#38bdf8" : "rgba(148, 163, 184, 0.5)";
  ctx.lineWidth = talking ? 3 : 1.5;
  ctx.stroke();

  // Color badge dot
  ctx.fillStyle = suitColor;
  ctx.beginPath();
  ctx.arc(30, 31, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(callsign.slice(0, 14), 44, 31);

  if (talking) {
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 14px monospace";
    ctx.fillText("MIC", w - 50, 31);
  }

  // Suit integrity bar
  const barX = 24;
  const barY = 50;
  const barW = w - 48;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(barX, barY, barW, 5);
  ctx.fillStyle = suitIntegrity > 45 ? "#4ade80" : "#f87171";
  ctx.fillRect(barX, barY, (barW * Math.max(0, Math.min(100, suitIntegrity))) / 100, 5);
}

/** Manages remote co-op astronaut rigs and floating 3D nameplates. */
export function createRemoteAstronautsManager(): RemoteAstronautsHandle {
  const root = new T.Group();
  root.name = "RemoteCoopAstronauts";

  const visorMat = new T.MeshStandardMaterial({ color: 0x263e50, metalness: 0.72, roughness: 0.25 });
  const trimMat = new T.MeshStandardMaterial({ color: 0x566b72, roughness: 0.6 });
  const rigs = new Map<string, RemoteRig>();

  function getOrBuildRig(player: NetworkPlayerState): RemoteRig {
    const existing = rigs.get(player.id);
    if (existing) return existing;

    const group = new T.Group();
    const suitMat = new T.MeshStandardMaterial({
      color: new T.Color(player.suitColor || "#f1ede3"),
      roughness: 0.68,
    });

    const addPart = (geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      group.add(m);
      return m;
    };

    const torso = addPart(new T.CapsuleGeometry(0.32, 0.26, 6, 14), suitMat, 0, 1.12, 0);
    torso.scale.z = 0.68;
    addPart(new T.BoxGeometry(0.58, 0.66, 0.22), trimMat, 0, 1.12, 0.26);
    addPart(new T.SphereGeometry(0.32, 16, 12), suitMat, 0, 1.78, 0);
    const visor = addPart(new T.SphereGeometry(0.25, 16, 12), visorMat, 0, 1.79, -0.15);
    visor.scale.set(1, 0.75, 0.5);

    const leftLeg = addPart(new T.CapsuleGeometry(0.12, 0.38, 5, 10), suitMat, -0.19, 0.35, 0);
    const rightLeg = addPart(new T.CapsuleGeometry(0.12, 0.38, 5, 10), suitMat, 0.19, 0.35, 0);
    const leftArm = addPart(new T.CapsuleGeometry(0.095, 0.36, 5, 10), suitMat, -0.42, 1.12, 0);
    const rightArm = addPart(new T.CapsuleGeometry(0.095, 0.36, 5, 10), suitMat, 0.42, 1.12, 0);

    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 72;
    const labelCtx = labelCanvas.getContext("2d")!;
    drawNameTag(labelCtx, player.callsign, player.supplies.suitIntegrity, player.talking, player.suitColor);

    const labelTex = new T.CanvasTexture(labelCanvas);
    labelTex.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
      }),
    );
    sprite.position.set(0, 2.55, 0);
    sprite.scale.set(2.15, 0.62, 1);
    group.add(sprite);

    root.add(group);
    const rig: RemoteRig = {
      group,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      sprite,
      labelCanvas,
      labelCtx,
      labelTex,
      lastTagKey: `${player.callsign}:${Math.round(player.supplies.suitIntegrity)}:${player.talking}`,
      phase: 0,
    };
    rigs.set(player.id, rig);
    return rig;
  }

  return {
    root,
    update(players, selfId, activeBiome, heightAt, dt) {
      const present = new Set<string>();
      for (const p of players) {
        if (p.id === selfId) continue;
        present.add(p.id);
        const rig = getOrBuildRig(p);
        const visible = p.biome === activeBiome && !p.inRover;
        rig.group.visible = visible;
        if (!visible) continue;

        const targetY = heightAt(p.x, p.z) + (p.jumpHeight || 0);
        const blend = 1 - Math.exp(-14 * Math.min(dt, 0.1));
        rig.group.position.x += (p.x - rig.group.position.x) * blend;
        rig.group.position.z += (p.z - rig.group.position.z) * blend;
        rig.group.position.y += (targetY - rig.group.position.y) * blend;
        rig.group.rotation.y = p.yaw;

        rig.phase += p.speed * dt * 2.4;
        const swing = p.speed > 0.25 ? Math.sin(rig.phase) * 0.42 : 0;
        rig.leftLeg.rotation.x = swing;
        rig.rightLeg.rotation.x = -swing;
        rig.leftArm.rotation.x = -swing * 0.65;
        rig.rightArm.rotation.x = swing * 0.65;

        const tagKey = `${p.callsign}:${Math.round(p.supplies.suitIntegrity)}:${p.talking}`;
        if (tagKey !== rig.lastTagKey) {
          rig.lastTagKey = tagKey;
          drawNameTag(rig.labelCtx, p.callsign, p.supplies.suitIntegrity, p.talking, p.suitColor);
          rig.labelTex.needsUpdate = true;
        }
      }

      for (const [id, rig] of rigs) {
        if (!present.has(id)) {
          root.remove(rig.group);
          rig.labelTex.dispose();
          rig.sprite.material.dispose();
          rigs.delete(id);
        }
      }
    },
    dispose() {
      visorMat.dispose();
      trimMat.dispose();
      for (const rig of rigs.values()) {
        rig.labelTex.dispose();
        rig.sprite.material.dispose();
        rig.group.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry?.dispose();
            if (!Array.isArray(o.material)) o.material?.dispose();
          }
        });
      }
      rigs.clear();
    },
  };
}

