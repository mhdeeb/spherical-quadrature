import * as THREE from "./three.module.min.js";

export function createVertexPositions(func, count) {
  count += 1;
  const instancePositions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    let p = new THREE.Vector3(func(i / (count - 1)));
    instancePositions[i * 3 + 0] = p.x;
    instancePositions[i * 3 + 1] = p.y;
    instancePositions[i * 3 + 2] = p.z;
  }

  return instancePositions;
}

export function createEdgePositions(pointsArray) {
  const connectionPositions = [];
  for (let i = 0; i < pointsArray.length / 3; i++) {
    for (let j = i + 1; j < pointsArray.length / 3; j++) {
      connectionPositions.push(
        pointsArray[i * 3 + 0],
        pointsArray[i * 3 + 1],
        pointsArray[i * 3 + 2]
      );
      connectionPositions.push(
        pointsArray[j * 3 + 0],
        pointsArray[j * 3 + 1],
        pointsArray[j * 3 + 2]
      );
    }
  }

  return connectionPositions;
}

export function createInstancedGeometry(geometry, positions) {
  const instancedGeometry = new THREE.InstancedBufferGeometry();

  instancedGeometry.index = geometry.index;
  instancedGeometry.attributes.position = geometry.attributes.position;

  instancedGeometry.setAttribute(
    "instancePosition",
    new THREE.InstancedBufferAttribute(positions, 3)
  );

  return instancedGeometry;
}
