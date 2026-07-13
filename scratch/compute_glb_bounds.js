const fs = require('fs');
const path = require('path');

function computeGlbWorldBounds(glbPath) {
  const buffer = fs.readFileSync(glbPath);
  
  // Read GLB header
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  if (magic !== 0x46546C67) {
    throw new Error('Invalid GLB file');
  }
  
  // Read JSON chunk
  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);
  
  if (chunkType !== 0x4E4F534A) {
    throw new Error('Expected JSON chunk');
  }
  
  const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
  const gltf = JSON.parse(jsonString);
  const accessors = gltf.accessors;

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
    if (t) {
      out[12] = t[0];
      out[13] = t[1];
      out[14] = t[2];
    }
    if (s) {
      out[0] *= s[0];
      out[5] *= s[1];
      out[10] *= s[2];
    }
    return out;
  }

  const nodeMatrices = new Array(gltf.nodes.length);
  
  gltf.nodes.forEach((node, i) => {
    if (node.matrix) {
      nodeMatrices[i] = node.matrix;
    } else {
      nodeMatrices[i] = fromTranslationRotationScale(node.translation, node.rotation, node.scale);
    }
  });

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

  const scene = gltf.scenes[gltf.scene || 0];
  scene.nodes.forEach(rootIdx => {
    traverse(rootIdx, [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  });

  const meshBounds = [];

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
          
          const corners = [];
          for (let x of [min[0], max[0]]) {
            for (let y of [min[1], max[1]]) {
              for (let z of [min[2], max[2]]) {
                corners.push([x, y, z]);
              }
            }
          }
          
          let minY = Infinity;
          let maxY = -Infinity;
          
          corners.forEach(c => {
            const wy = c[0] * worldMatrix[1] + c[1] * worldMatrix[5] + c[2] * worldMatrix[9] + worldMatrix[13];
            if (wy < minY) minY = wy;
            if (wy > maxY) maxY = wy;
          });
          
          meshBounds.push({
            name: mesh.name,
            minY,
            maxY
          });
        }
      });
    }
  });

  meshBounds.sort((a, b) => a.minY - b.minY);
  
  console.log(`\n--- Optimized GLB bounds for ${path.basename(glbPath)} ---`);
  meshBounds.slice(0, 10).forEach(mb => {
    console.log(`Mesh: ${mb.name}, minY: ${mb.minY}, maxY: ${mb.maxY}`);
  });
}

computeGlbWorldBounds(path.join(__dirname, '../public/3dmodels/58-tl-737/scene_optimized.glb'));
computeGlbWorldBounds(path.join(__dirname, '../public/3dmodels/hyundai_accent_tagaz_2004/scene_optimized.glb'));
