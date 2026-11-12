import * as T from "three";
import { ROVER_WHEEL_OFFSETS, type RoverVehicle } from "../../game/roverVehicle";

/** A small world-space pool. Each quad faces the camera and expands as the
 * entrained grains slow and disperse. No texture fetch or offscreen pass. */
export function createRoverDust() {
  const count = 80;
  const geometry = new T.InstancedBufferGeometry();
  const quad = new T.PlaneGeometry(1, 1);
  geometry.setIndex(quad.index);
  geometry.setAttribute("position", quad.attributes.position);
  geometry.instanceCount = count;
  const centers = new T.InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(T.DynamicDrawUsage);
  const ages = new T.InstancedBufferAttribute(new Float32Array(count).fill(1), 1).setUsage(T.DynamicDrawUsage);
  const seeds = Float32Array.from({length:count}, () => Math.random());
  geometry.setAttribute("center", centers);
  geometry.setAttribute("age", ages);
  geometry.setAttribute("seed", new T.InstancedBufferAttribute(seeds, 1));
  const material = new T.ShaderMaterial({
    transparent:true, depthWrite:false,
    vertexShader:`
      attribute vec3 center;
      attribute float age, seed;
      varying vec2 p;
      varying float t, s;
      void main(){
        p=position.xy*2.; t=age; s=seed;
        vec4 eye=viewMatrix*vec4(center,1.);
        eye.xy+=position.xy*vec2(1.3,.85)*(.22+age*(1.3+seed));
        gl_Position=projectionMatrix*eye;
      }`,
    fragmentShader:`
      varying vec2 p;
      varying float t,s;
      void main(){
        vec2 q=p+.12*vec2(sin(5.*p.y+7.*s+t),cos(6.*p.x+9.*s-t));
        float haze=1.-smoothstep(.08,.84,length(q));
        float fade=smoothstep(0.,.12,t)*(1.-smoothstep(.18,1.,t));
        gl_FragColor=vec4(mix(vec3(.23,.11,.058),vec3(.43,.24,.13),s),.29*haze*fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const velocity = new Float32Array(count * 3);
  let next = 0, emission = 0, wheelSide = 0;
  function update(rover:RoverVehicle, dt:number) {
    if(dt<=0)return;
    const speed=Math.abs(rover.speed);
    const sin=Math.sin(rover.yaw), cos=Math.cos(rover.yaw);
    emission += speed * dt * 5 * (1 - .6 * rover.mudDepth);
    while(emission>=1){
      emission--;
      const i=next; next=(next+1)%count;
      const wheel=(rover.speed>=0 ? 4 : 0)+wheelSide;
      wheelSide=1-wheelSide;
      const [x,z]=ROVER_WHEEL_OFFSETS[wheel];
      centers.setXYZ(i,rover.x+x*cos+z*sin,rover.wheelContacts[wheel]+.12,rover.z-x*sin+z*cos);
      ages.setX(i,0);
      const kick=Math.sign(rover.speed)*(.45+.11*speed);
      const spread=Math.sign(x)*(.2+Math.random()*.55);
      velocity[i*3]=kick*sin+spread*cos;
      velocity[i*3+1]=.36+Math.random()*.55;
      velocity[i*3+2]=kick*cos-spread*sin;
    }
    let visible=false;
    const drag=1-Math.exp(-1.8*dt);
    for(let i=0;i<count;i++){
      if(ages.getX(i)>=1)continue;
      visible=true;
      ages.setX(i,Math.min(1,ages.getX(i)+dt/(1.05+.6*seeds[i])));
      const v=i*3;
      velocity[v]+=(.85-velocity[v])*drag;
      velocity[v+1]+=(.08-velocity[v+1])*drag;
      velocity[v+2]+=(.27-velocity[v+2])*drag;
      centers.setXYZ(i,centers.getX(i)+velocity[v]*dt,centers.getY(i)+velocity[v+1]*dt,centers.getZ(i)+velocity[v+2]*dt);
    }
    mesh.visible=visible;
    if(visible) centers.needsUpdate=ages.needsUpdate=true;
  }
  return {mesh,update,dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();quad.dispose()}};
}
