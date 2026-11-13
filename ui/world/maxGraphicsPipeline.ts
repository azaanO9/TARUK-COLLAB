/** AAA "Max Graphics" Post-Processing Pipeline: SSAO/GTAO, UnrealBloom, Bokeh DoF, FXAA Anti-Aliasing, and Volumetric Light Shafts. */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { BoundedGTAOPass } from "./BoundedGTAOPass";

export type MaxGraphicsPipeline = {
  composer: EffectComposer;
  gtaoPass: BoundedGTAOPass;
  bloomPass: UnrealBloomPass;
  dofPass: BokehPass;
  fxaaPass: ShaderPass;
  volumetricGodRays: THREE.Mesh | null;
  setSize: (width: number, height: number, pixelRatio: number) => void;
  configure: (options: {
    tier: string;
    stormActive: boolean;
    dofActive: boolean;
    focusDistance?: number;
    reducedMotion?: boolean;
  }) => void;
  render: () => boolean;
  dispose: () => void;
};

export function createMaxGraphicsPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  sunLight: THREE.DirectionalLight,
): MaxGraphicsPipeline {
  const size = renderer.getSize(new THREE.Vector2());
  const pixelRatio = renderer.getPixelRatio();

  // High-dynamic-range target with HalfFloatType
  const renderTarget = new THREE.WebGLRenderTarget(
    Math.round(size.x * pixelRatio),
    Math.round(size.y * pixelRatio),
    {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      samples: 0, // Resolve handled by FXAA in post chain
    },
  );

  const composer = new EffectComposer(renderer, renderTarget);

  // 1. Scene Render Pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Grounded Screen-Space Ambient Occlusion (GTAO) - half-res optimized
  const gtaoPass = new BoundedGTAOPass(
    scene,
    camera,
    Math.round(size.x * 0.5),
    Math.round(size.y * 0.5),
  );
  gtaoPass.updateGtaoMaterial({
    radius: 0.52,
    thickness: 0.6,
    distanceFallOff: 1.2,
    samples: 12,
  });
  gtaoPass.updatePdMaterial({
    samples: 10,
    radius: 4.5,
    rings: 2,
  });
  gtaoPass.blendIntensity = 0.55;
  gtaoPass.enabled = true;
  composer.addPass(gtaoPass);

  // 3. UnrealBloomPass - glowing LEDs, lasers, headlights, habitat windows
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.round(size.x * 0.5), Math.round(size.y * 0.5)),
    0.35, // strength
    0.55, // radius
    0.85, // threshold
  );
  bloomPass.enabled = true;
  composer.addPass(bloomPass);

  // 4. Bokeh Depth of Field Pass (for cockpit, datapad inspection, and focus)
  const dofPass = new BokehPass(scene, camera, {
    focus: 12.0,
    aperture: 0.00018,
    maxblur: 0.012,
  });
  dofPass.enabled = false;
  composer.addPass(dofPass);

  // 5. FXAA Anti-Aliasing Pass
  const fxaaPass = new ShaderPass(FXAAShader);
  fxaaPass.material.uniforms["resolution"].value.set(
    1 / (size.x * pixelRatio),
    1 / (size.y * pixelRatio),
  );
  composer.addPass(fxaaPass);

  // 6. OutputPass (sRGB color conversion + ACES tone curve)
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // Volumetric Sun Shaft / God-Ray cone piercing through dust storms
  const rayGeom = new THREE.CylinderGeometry(1.2, 54.0, 110.0, 16, 1, true);
  rayGeom.rotateX(Math.PI / 2);
  const rayMat = new THREE.MeshBasicMaterial({
    color: 0xffbb7a,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const volumetricGodRays = new THREE.Mesh(rayGeom, rayMat);
  volumetricGodRays.name = "volumetric-storm-godrays";
  scene.add(volumetricGodRays);

  return {
    composer,
    gtaoPass,
    bloomPass,
    dofPass,
    fxaaPass,
    volumetricGodRays,

    setSize(width, height, ratio) {
      composer.setSize(width, height);
      composer.setPixelRatio(ratio);
      const w = width * ratio;
      const h = height * ratio;
      fxaaPass.material.uniforms["resolution"].value.set(1 / w, 1 / h);
      gtaoPass.setSize(Math.round(width * 0.5), Math.round(height * 0.5));
      bloomPass.setSize(Math.round(width * 0.5), Math.round(height * 0.5));
    },

    configure({ tier, stormActive, dofActive, focusDistance = 10, reducedMotion = false }) {
      const isMax = tier === "ultra" || tier === "high";
      const isPerf = tier === "performance";

      gtaoPass.enabled = isMax;
      bloomPass.enabled = (isMax || tier === "auto") && !reducedMotion;
      dofPass.enabled = isMax && dofActive && !reducedMotion;

      if (dofPass.enabled && dofPass.uniforms) {
        (dofPass.uniforms as Record<string, { value: unknown }>)["focus"].value = focusDistance;
      }

      // Volumetric god rays in dust storms
      if (volumetricGodRays) {
        volumetricGodRays.visible = !isPerf && stormActive;
        if (volumetricGodRays.visible) {
          volumetricGodRays.position.copy(camera.position).addScaledVector(sunLight.position.clone().normalize(), 35);
          volumetricGodRays.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), sunLight.position.clone().normalize().negate());
          rayMat.opacity = isMax ? 0.075 : 0.035;
        }
      }
    },

    render() {
      try {
        composer.render();
        return true;
      } catch {
        return false;
      }
    },

    dispose() {
      scene.remove(volumetricGodRays);
      rayGeom.dispose();
      rayMat.dispose();
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
      renderTarget.dispose();
    },
  };
}

