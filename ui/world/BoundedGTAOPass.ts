import * as T from "three";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";

export function occlusionSize(width: number, height: number) {
  const scale = Math.min(.5, 768 / Math.max(1, width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))] as const;
}

/** The composer resizes every pass; enforce the AO budget on every resize. */
export class BoundedGTAOPass extends GTAOPass {
  override setSize(width: number, height: number) { super.setSize(...occlusionSize(width, height)); }

  override render(renderer: T.WebGLRenderer, writeBuffer: T.WebGLRenderTarget, readBuffer: T.WebGLRenderTarget, deltaTime = 0, maskActive = false) {
    const autoUpdate = renderer.shadowMap.autoUpdate, needsUpdate = renderer.shadowMap.needsUpdate;
    const autoClear = renderer.autoClear, overrideMaterial = this.scene.overrideMaterial;
    const hidden: T.Object3D[] = [];
    this.scene.traverseVisible(object => {
      if (object instanceof T.Points || object instanceof T.Line || ("isLine2" in object && object.isLine2)) {
        hidden.push(object); return;
      }
      if (!(object instanceof T.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.every(material => material.transparent || !material.depthWrite)) hidden.push(object);
    });
    hidden.forEach(object => { object.visible = false; });
    // The preceding beauty pass already rendered shadows; don't draw them again for normals.
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;
    try { super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive); }
    finally {
      hidden.forEach(object => { object.visible = true; });
      renderer.shadowMap.autoUpdate = autoUpdate; renderer.shadowMap.needsUpdate = needsUpdate;
      renderer.autoClear = autoClear; this.scene.overrideMaterial = overrideMaterial;
    }
  }
}
