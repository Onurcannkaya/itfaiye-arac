/**
 * Analyze 3D model bounding boxes for all vehicle types
 * Pure JSON parsing of GLTF files - no three.js needed
 */
const fs = require('fs');
const path = require('path');

const models = [
  { name: 'Doblo', dir: '2005-2007_fiat_doblo_mk1_uk-i4gas' },
  { name: 'Hyundai', dir: 'hyundai_accent_tagaz_2004' },
  { name: 'Sprinter', dir: '58-tl-737' },
  { name: 'Merdiven', dir: 'merdiven' },
  { name: 'Default Fire Truck', dir: '.' },
];

for (const model of models) {
  const gltfPath = path.join(__dirname, '..', 'public', '3dmodels', model.dir, 'scene.gltf');
  
  if (!fs.existsSync(gltfPath)) {
    console.log(`\n=== ${model.name} ===`);
    console.log(`  GLTF file not found: ${gltfPath}`);
    continue;
  }
  
  console.log(`\n=== ${model.name} (${model.dir}) ===`);
  
  const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));
  
  // Check root nodes
  const rootScene = gltf.scenes?.[gltf.scene || 0];
  const rootNodeIndices = rootScene?.nodes || [];
  
  console.log(`  Scene root nodes: [${rootNodeIndices.join(', ')}]`);
  
  for (const idx of rootNodeIndices) {
    const node = gltf.nodes[idx];
    console.log(`  Root Node [${idx}]: "${node.name || 'unnamed'}"`);
    if (node.matrix) console.log(`    Matrix: [${node.matrix.map(v => v.toFixed(6)).join(', ')}]`);
    if (node.rotation) console.log(`    Rotation: [${node.rotation.map(v => v.toFixed(6)).join(', ')}]`);
    if (node.scale) console.log(`    Scale: [${node.scale.map(v => v.toFixed(6)).join(', ')}]`);
    if (node.translation) console.log(`    Translation: [${node.translation.map(v => v.toFixed(6)).join(', ')}]`);
    
    // Check children recursively (first 2 levels)
    if (node.children) {
      for (const childIdx of node.children.slice(0, 5)) {
        const child = gltf.nodes[childIdx];
        console.log(`    Child [${childIdx}]: "${child.name || 'unnamed'}"`);
        if (child.matrix) console.log(`      Matrix: [${child.matrix.map(v => v.toFixed(4)).join(', ')}]`);
        if (child.rotation) console.log(`      Rotation: [${child.rotation.map(v => v.toFixed(6)).join(', ')}]`);
        if (child.scale) console.log(`      Scale: [${child.scale.map(v => v.toFixed(6)).join(', ')}]`);
        if (child.translation) console.log(`      Translation: [${child.translation.map(v => v.toFixed(6)).join(', ')}]`);
        if (child.mesh !== undefined) console.log(`      Has mesh: ${child.mesh}`);
      }
      if (node.children.length > 5) {
        console.log(`    ... and ${node.children.length - 5} more children`);
      }
    }
  }
  
  // Check meshes for any with extremely large bounding boxes
  let meshCount = 0;
  let overallMin = [Infinity, Infinity, Infinity];
  let overallMax = [-Infinity, -Infinity, -Infinity];
  let largeMeshes = [];
  
  for (let i = 0; i < (gltf.meshes?.length || 0); i++) {
    const mesh = gltf.meshes[i];
    meshCount++;
    for (const prim of mesh.primitives || []) {
      const posAccessorIdx = prim.attributes?.POSITION;
      if (posAccessorIdx !== undefined) {
        const accessor = gltf.accessors[posAccessorIdx];
        if (accessor.min && accessor.max) {
          const extentX = accessor.max[0] - accessor.min[0];
          const extentY = accessor.max[1] - accessor.min[1];
          const extentZ = accessor.max[2] - accessor.min[2];
          const maxExtent = Math.max(extentX, extentY, extentZ);
          
          for (let j = 0; j < 3; j++) {
            overallMin[j] = Math.min(overallMin[j], accessor.min[j]);
            overallMax[j] = Math.max(overallMax[j], accessor.max[j]);
          }
          
          if (maxExtent > 10) {
            largeMeshes.push({
              name: mesh.name || `mesh_${i}`,
              extent: [extentX, extentY, extentZ],
              min: accessor.min,
              max: accessor.max
            });
          }
        }
      }
    }
  }
  
  console.log(`  Total meshes: ${meshCount}`);
  
  if (largeMeshes.length > 0) {
    console.log(`  ⚠ LARGE MESHES (extent > 10):`);
    for (const lm of largeMeshes) {
      console.log(`    "${lm.name}" extent: ${lm.extent.map(v => v.toFixed(2)).join(' x ')}`);
      console.log(`      min: [${lm.min.map(v => v.toFixed(3)).join(', ')}], max: [${lm.max.map(v => v.toFixed(3)).join(', ')}]`);
    }
  }
  
  const sizeX = overallMax[0] - overallMin[0];
  const sizeY = overallMax[1] - overallMin[1];
  const sizeZ = overallMax[2] - overallMin[2];
  console.log(`  Raw LOCAL bounds (before root transform):`);
  console.log(`    Min: [${overallMin.map(v => v.toFixed(3)).join(', ')}]`);
  console.log(`    Max: [${overallMax.map(v => v.toFixed(3)).join(', ')}]`);
  console.log(`    Size: ${sizeX.toFixed(3)} x ${sizeY.toFixed(3)} x ${sizeZ.toFixed(3)}`);
  console.log(`    Longest axis: ${Math.max(sizeX, sizeY, sizeZ).toFixed(3)}`);
  
  // Check for root matrix with -90° X rotation
  if (rootNodeIndices.length > 0) {
    const rootNode = gltf.nodes[rootNodeIndices[0]];
    if (rootNode.matrix) {
      const m = rootNode.matrix;
      // -90° X rotation: Y → -Z, Z → Y
      // Matrix form: [1,0,0,0, 0,0,1,0, 0,-1,0,0, 0,0,0,1]
      const isNeg90X = Math.abs(m[0] - 1) < 0.01 && Math.abs(m[5]) < 0.01 && Math.abs(m[10]) < 0.01;
      
      if (isNeg90X) {
        console.log(`  ✓ Root has -90° X rotation (coordinate system conversion)`);
        // After -90° X rotation:
        // world X = local X
        // world Y = local Z * m[6] + local Y * m[5] ≈ local Z (if m[6]=1, m[5]=0)
        // world Z = local Z * m[10] + local Y * m[9] ≈ -local Y (if m[9]=-1, m[10]=0)
        
        // More precisely: world = M * local
        // For column-major matrix: newVec = M * oldVec
        const worldMin2 = [
          Math.min(overallMin[0], overallMax[0]),
          Math.min(overallMin[2] * m[6] + overallMin[1] * m[5], overallMax[2] * m[6] + overallMax[1] * m[5], overallMin[2] * m[6] + overallMax[1] * m[5], overallMax[2] * m[6] + overallMin[1] * m[5]),
          Math.min(overallMin[2] * m[10] + overallMin[1] * m[9], overallMax[2] * m[10] + overallMax[1] * m[9], overallMin[2] * m[10] + overallMax[1] * m[9], overallMax[2] * m[10] + overallMin[1] * m[9])
        ];
        const worldMax2 = [
          Math.max(overallMin[0], overallMax[0]),
          Math.max(overallMin[2] * m[6] + overallMin[1] * m[5], overallMax[2] * m[6] + overallMax[1] * m[5], overallMin[2] * m[6] + overallMax[1] * m[5], overallMax[2] * m[6] + overallMin[1] * m[5]),
          Math.max(overallMin[2] * m[10] + overallMin[1] * m[9], overallMax[2] * m[10] + overallMax[1] * m[9], overallMin[2] * m[10] + overallMax[1] * m[9], overallMax[2] * m[10] + overallMin[1] * m[9])
        ];
        const wSizeX = worldMax2[0] - worldMin2[0];
        const wSizeY = worldMax2[1] - worldMin2[1];
        const wSizeZ = worldMax2[2] - worldMin2[2];
        console.log(`  World bounds (after root -90°X):`);
        console.log(`    World Min: [${worldMin2.map(v => v.toFixed(3)).join(', ')}]`);
        console.log(`    World Max: [${worldMax2.map(v => v.toFixed(3)).join(', ')}]`);
        console.log(`    World Size: ${wSizeX.toFixed(3)} x ${wSizeY.toFixed(3)} x ${wSizeZ.toFixed(3)}`);
        console.log(`    World Longest axis: ${Math.max(wSizeX, wSizeY, wSizeZ).toFixed(3)}`);
        console.log(`    Ground level (world Y min): ${worldMin2[1].toFixed(3)}`);
      } else {
        console.log(`  Root matrix is NOT standard -90° X rotation`);
        console.log(`  m[0]=${m[0]}, m[5]=${m[5]}, m[6]=${m[6]}, m[9]=${m[9]}, m[10]=${m[10]}`);
      }
    } else if (rootNode.rotation) {
      console.log(`  Root has quaternion rotation: [${rootNode.rotation.map(v => v.toFixed(6)).join(', ')}]`);
    } else {
      console.log(`  Root has NO transform (identity)`);
    }
  }
  
  // Check if scene_optimized.glb exists
  const glbPath = path.join(__dirname, '..', 'public', '3dmodels', model.dir, 'scene_optimized.glb');
  console.log(`  scene_optimized.glb exists: ${fs.existsSync(glbPath)}`);
}
