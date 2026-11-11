import * as T from "three";

/** World-anchored wind streaks and suspended dust, bounded to one particle draw. */
export function createMarsWindDust() {
  const count = 260;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = ((i * 0.61803398875) % 1);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute("seed", new T.BufferAttribute(seeds, 1));
  const material = new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { opacity: { value: .09 } },
    vertexShader: `
      attribute float seed;
      varying float vSeed;
      varying float vFade;
      void main() {
        vSeed = seed;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        float distanceToEye = length(view.xyz);
        vFade = smoothstep(1.2, 4.0, distanceToEye) * (1.0 - smoothstep(18.0, 25.0, distanceToEye));
        float size = seed < .72 ? 1.4 + seed * 2.0 : .05;
        gl_PointSize = clamp(size * 420.0 / max(1.0, -view.z), 1.0, 180.0);
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      uniform float opacity;
      varying float vSeed;
      varying float vFade;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        p.y *= vSeed < .72 ? 2.8 : 1.0;
        float edge = max(0.0, 1.0 - dot(p, p));
        float curl = .7 + .3 * sin(p.x * 9.0 + vSeed * 30.0 + sin(p.y * 6.0));
        float alpha = edge * edge * curl * opacity * vFade;
        gl_FragColor = vec4(.48, .29, .16, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const points = new T.Points(geometry, material);
  points.frustumCulled = false;
  let drift = 0;
  let time = 0;
  return {
    points,
    update(dt: number, x: number, z: number, heightAt: (x: number, z: number) => number, reduced: boolean) {
      if (!reduced) {
        time += dt;
        drift += dt * (1.1 + .45 * Math.sin(time * .37));
      }
      for (let i = 0; i < count; i++) {
        const seed = seeds[i];
        const px = x + T.MathUtils.euclideanModulo(i * 19.17 + drift - x + 24, 48) - 24;
        const pz = z + T.MathUtils.euclideanModulo(i * 13.37 + drift * .32 - z + 24, 48) - 24;
        positions[i * 3] = px;
        positions[i * 3 + 1] = heightAt(px, pz) + .12 + seed * seed * 3.0 + .08 * Math.sin(time + i);
        positions[i * 3 + 2] = pz;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}
