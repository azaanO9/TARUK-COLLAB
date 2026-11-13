import * as T from "three";
import type { BaseDefenseUnit } from "../../game/baseDefenses.ts";

export type BaseDefensesRendererHandle = {
  root: T.Group;
  update: (
    defenses: readonly BaseDefenseUnit[],
    heightAt: (x: number, z: number) => number,
    timeSec: number,
    visible: boolean,
  ) => void;
  dispose: () => void;
};

type DefenseMeshEntry = {
  group: T.Group;
  coil: T.Mesh;
  ring: T.Mesh;
  pulseWave: T.Mesh;
};

/** Renders deployed solar-powered Laser Grid pylons and EMP Emitters with pulse rings. */
export function createBaseDefensesRenderer(): BaseDefensesRendererHandle {
  const root = new T.Group();
  root.name = "OutpostBaseDefenses";

  const frameMat = new T.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.65,
    roughness: 0.38,
  });
  const laserEmitMat = new T.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const empEmitMat = new T.MeshStandardMaterial({
    color: 0xa3e635,
    emissive: 0x84cc16,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });

  const entries = new Map<string, DefenseMeshEntry>();

  function getOrBuild(unit: BaseDefenseUnit): DefenseMeshEntry {
    const existing = entries.get(unit.id);
    if (existing) return existing;

    const group = new T.Group();
    const base = new T.Mesh(new T.CylinderGeometry(0.45, 0.62, 0.35, 12), frameMat);
    base.position.y = 0.18;
    base.castShadow = true;
    group.add(base);

    const mast = new T.Mesh(new T.CylinderGeometry(0.14, 0.2, 2.2, 10), frameMat);
    mast.position.y = 1.3;
    mast.castShadow = true;
    group.add(mast);

    const isEmp = unit.kind === "emp_emitter";
    const coil = new T.Mesh(
      isEmp ? new T.TorusGeometry(0.38, 0.08, 8, 24) : new T.OctahedronGeometry(0.32, 0),
      isEmp ? empEmitMat : laserEmitMat,
    );
    coil.position.y = 2.45;
    if (isEmp) coil.rotation.x = Math.PI / 2;
    group.add(coil);

    // Perimeter containment boundary ring on the Mars soil
    const ringMat = new T.MeshBasicMaterial({
      color: isEmp ? 0xa3e635 : 0x22d3ee,
      transparent: true,
      opacity: 0.26,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const ring = new T.Mesh(new T.RingGeometry(unit.radius - 0.18, unit.radius, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);

    // Laser containment horizontal guard beams or EMP radial shockwave
    const waveMat = new T.MeshBasicMaterial({
      color: isEmp ? 0xbef264 : 0x67e8f9,
      transparent: true,
      opacity: 0,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const pulseWave = new T.Mesh(new T.RingGeometry(0.6, 1.15, 36), waveMat);
    pulseWave.rotation.x = -Math.PI / 2;
    pulseWave.position.y = 0.35;
    group.add(pulseWave);

    root.add(group);
    const entry = { group, coil, ring, pulseWave };
    entries.set(unit.id, entry);
    return entry;
  }

  return {
    root,
    update(defenses, heightAt, timeSec, visible) {
      root.visible = visible;
      if (!visible) return;
      const activeIds = new Set<string>();
      for (const unit of defenses) {
        activeIds.add(unit.id);
        const entry = getOrBuild(unit);
        entry.group.visible = true;
        entry.group.position.set(unit.x, heightAt(unit.x, unit.z), unit.z);
        entry.coil.rotation.z = timeSec * 1.6;
        (entry.ring.material as T.MeshBasicMaterial).opacity = unit.active
          ? 0.2 + Math.sin(timeSec * 3) * 0.07
          : 0.05;

        const sincePulse = timeSec - unit.lastPulseAt;
        const wMat = entry.pulseWave.material as T.MeshBasicMaterial;
        if (unit.active && sincePulse >= 0 && sincePulse < 1.2) {
          const t = sincePulse / 1.2;
          const sc = 1 + t * unit.radius;
          entry.pulseWave.scale.set(sc, sc, 1);
          wMat.opacity = (1 - t) * 0.72;
        } else {
          wMat.opacity = 0;
        }
      }
      for (const [id, entry] of entries) {
        if (!activeIds.has(id)) entry.group.visible = false;
      }
    },
    dispose() {
      frameMat.dispose();
      laserEmitMat.dispose();
      empEmitMat.dispose();
      for (const e of entries.values()) {
        e.group.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry?.dispose();
            if (!Array.isArray(o.material)) o.material?.dispose();
          }
        });
      }
      entries.clear();
    },
  };
}

