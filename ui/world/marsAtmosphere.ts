import * as T from "three";

// One direction for the visible disk, atmospheric glow and direct shadows.
export const MARS_SUN_DIRECTION = new T.Vector3(-80, 46, -160).normalize();

export function createMarsSkyMaterial(environment = false) {
  return new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { night: { value: 0 }, sunDirection: { value: MARS_SUN_DIRECTION }, environment: { value: environment ? 1 : 0 } },
    vertexShader: `varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 direction; uniform float night; uniform float environment; uniform vec3 sunDirection;
      void main(){
        vec3 d=normalize(direction); float h=max(d.y,0.0);
        vec3 horizon=mix(vec3(.57,.32,.20),vec3(.62,.36,.23),environment);
        vec3 zenith=mix(vec3(.24,.18,.16),vec3(.30,.22,.19),environment);
        vec3 sky=mix(horizon,zenith,pow(h,.45));
        float mu=max(dot(d,sunDirection),0.0);
        // Keep the visible sky glow intact and focus the specular sun peak along sunDirection.
        float glarePower=mix(20.0,54.0,environment);
        float glareStrength=mix(1.0,0.45,environment);
        float sunPower=mix(170.0,360.0,environment);
        float sunStrength=mix(1.0,1.85,environment);
        sky+=vec3(.34,.29,.20)*glareStrength*pow(mu,glarePower)+vec3(.65,.57,.38)*sunStrength*pow(mu,sunPower);
        // The lower environment hemisphere reflects sunlit dusty regolith so shadow-facing surfaces stay readable.
        vec3 ground=mix(vec3(.26,.13,.068),vec3(.15,.080,.045),clamp(-d.y,0.0,1.0));
        sky=mix(sky,ground,environment*(1.0-smoothstep(-.12,.025,d.y)));
        vec3 dark=mix(vec3(.055,.040,.052),vec3(.006,.012,.028),pow(h,.45));
        gl_FragColor=vec4(mix(sky,dark,night),1.0);
        ${environment
          // PMREMGenerator captures linear radiance directly; skip double-tonemap and double-sRGB encoding.
          ? ""
          : "#include <tonemapping_fragment>\n        #include <colorspace_fragment>"}
      }`,
  });
}

/** Small one-time outdoor reflection capture; no HDR download or per-frame capture. */
export function createMarsEnvironment(renderer: T.WebGLRenderer) {
  const capture = new T.Scene(), geometry = new T.SphereGeometry(10, 24, 12), material = createMarsSkyMaterial(true);
  capture.add(new T.Mesh(geometry, material));
  const generator = new T.PMREMGenerator(renderer);
  const target = generator.fromScene(capture, .04, .1, 30, { size: 128 });
  geometry.dispose(); material.dispose(); generator.dispose();
  return target;
}
