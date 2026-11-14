import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

/** Composer sizes passes in physical pixels, including dynamic render scale. */
export class ResolutionFXAAPass extends ShaderPass {
  constructor() { super(FXAAShader); }
  override setSize(width:number,height:number) {
    this.uniforms.resolution.value.set(1/Math.max(1,width),1/Math.max(1,height));
  }
}
