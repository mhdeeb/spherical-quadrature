import * as THREE from "./three.module.min.js";

const uniforms = {
  type: { value: color_number },
  time: { value: 0 },
  normalize_parameters: { value: settings.normalize_parameters },
  min_point: { value: new THREE.Vector4(-1, -1, 0, 0) },
  volume: { value: new THREE.Vector4(2, 2, 0, t_limit) },
};

async function loadShaders() {
  return [
    await (await fetch("shader.vert")).text(),
    await (await fetch("shader.frag")).text(),
  ];
}

export async function getShaderMaterial() {
  const [vertexShader, fragmentShader] = loadShaders();

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
}
