const fs = require('fs');
const path = require('path');

function computeGltfBounds(gltfPath) {
  const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf-8'));
  const accessors = gltf.accessors;
  
  // We need to compute world matrices for each node.
  // standard 4x4 matrix multiplication helper
  function multiply(a, b) {
    const out = new Array(16);
    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
    const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
    const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
    const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;

    a00 = a[4]; a01 = a[5]; a02 = a[6]; a03 = a[7];
    out[4] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out[5] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out[6] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out[7] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;

    a00 = a[8]; a01 = a[9]; a02 = a[10]; a03 = a[11];
    out[8] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out[9] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out[10] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out[11] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;

    a00 = a[12]; a01 = a[13]; a02 = a[14]; a03 = a[15];
    out[12] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out[13] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out[14] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out[15] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    return out;
  }

  function fromTranslationRotationScale(t, r, s) {
    const out = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    // We only need translation for simple bounds translation in y
    if (t) {
      out[12] = t[0];
      out[13] = t[1];
      out[14] = t[2];
    }
    // Simple scaling
    if (s) {
      out[0] *= s[0];
      out[5] *= s[1];
      out[10] *= s[2];
    }
    // We ignore rotation for simple y-offset approximation, but let's see if there is rotation.
    // If there is rotation, it could affect the y bounds.
    return out;
  }

  const nodeMatrices = new Array(gltf.nodes.length);
  
  // Initialize matrices
  gltf.nodes.forEach((node, i) => {
    if (node.matrix) {
      nodeMatrices[i] = node.matrix;
    } else {
      nodeMatrices[i] = fromTranslationRotationScale(node.translation, node.rotation, node.scale);
    }
  });

  // Simple scene traversal to compute world matrices
  const worldMatrices = new Array(gltf.nodes.length).fill(null);
  
  function traverse(nodeIdx, parentMatrix) {
    const localMatrix = nodeMatrices[nodeIdx];
    const worldMatrix = parentMatrix ? multiply(parentMatrix, localMatrix) : localMatrix;
    worldMatrices[nodeIdx] = worldMatrix;
    
    const node = gltf.nodes[nodeIdx];
    if (node.children) {
      node.children.forEach(childIdx => {
        traverse(childIdx, worldMatrix);
      });
    }
  }

  // Start traversal from roots in the active scene
  const scene = gltf.scenes[gltf.scene || 0];
  scene.nodes.forEach(rootIdx => {
    traverse(rootIdx, [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  });

  let globalMinY = Infinity;
  let globalMaxY = -Infinity;
  let lowestMesh = "";

  gltf.nodes.forEach((node, nodeIdx) => {
    if (node.mesh !== undefined) {
      const worldMatrix = worldMatrices[nodeIdx];
      const mesh = gltf.meshes[node.mesh];
      
      mesh.primitives.forEach(prim => {
        const posAccessorIdx = prim.attributes.POSITION;
        if (posAccessorIdx !== undefined) {
          const accessor = accessors[posAccessorIdx];
          const min = accessor.min;
          const max = accessor.max;
          
          // Transform min and max points to world space
          // A bounding box in local space is defined by 8 corners.
          // We transform all 8 corners and find the min/max in world space.
          const corners = [];
          for (let x of [min[0], max[0]]) {
            for (let y of [min[1], max[1]]) {
              for (let z of [min[2], max[2]]) {
                corners.push([x, y, z]);
              }
            }
          }
          
          corners.forEach(c => {
            // multiply vector by matrix
            const wx = c[0] * worldMatrix[0] + c[1] * worldMatrix[4] + c[2] * worldMatrix[8] + worldMatrix[12];
            const wy = c[0] * worldMatrix[1] + c[1] * worldMatrix[5] + c[2] * worldMatrix[9] + worldMatrix[13];
            const wz = c[0] * worldMatrix[2] + c[1] * worldMatrix[6] + c[2] * worldMatrix[10] + worldMatrix[14];
            
            if (wy < globalMinY) {
              globalMinY = wy;
              lowestMesh = mesh.name;
            }
            if (wy > globalMaxY) {
              globalMaxY = wy;
            }
          });
        }
      });
    }
  });

  console.log(`File: ${path.basename(gltfPath)}`);
  console.log(`Global Min Y (World): ${globalMinY}`);
  console.log(`Global Max Y (World): ${globalMaxY}`);
  console.log(`Lowest Mesh Name: ${lowestMesh}`);
}

computeGltfBounds(path.join(__dirname, '../public/3dmodels/58-tl-737/scene.gltf'));
computeGltfBounds(path.join(__dirname, '../public/3dmodels/hyundai_accent_tagaz_2004/scene.gltf'));
computeGltfBounds(path.join(__dirname, '../public/3dmodels/merdiven/scene.gltf'));
