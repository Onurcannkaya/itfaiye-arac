const fs = require('fs');
const path = require('path');

// We can parse the GLTF's accessors to find the min and max values of the POSITION attributes for each mesh!
// In GLTF, each mesh has primitives, which have attributes (e.g. POSITION).
// The POSITION attribute points to an accessor, which has min and max arrays!
// This is extremely simple and doesn't require loading Three.js!

function inspectGltfBounds(gltfPath) {
  const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf-8'));
  console.log(`\n--- Bounds for ${path.basename(gltfPath)} ---`);

  const accessors = gltf.accessors;
  
  gltf.meshes.forEach((mesh, meshIdx) => {
    console.log(`Mesh ${meshIdx}: ${mesh.name}`);
    mesh.primitives.forEach((prim, primIdx) => {
      const positionAccessorIdx = prim.attributes.POSITION;
      if (positionAccessorIdx !== undefined) {
        const accessor = accessors[positionAccessorIdx];
        console.log(`  Primitive ${primIdx}: min=${JSON.stringify(accessor.min)}, max=${JSON.stringify(accessor.max)}`);
      }
    });
  });
}

inspectGltfBounds(path.join(__dirname, '../public/3dmodels/58-tl-737/scene.gltf'));
inspectGltfBounds(path.join(__dirname, '../public/3dmodels/hyundai_accent_tagaz_2004/scene.gltf'));
inspectGltfBounds(path.join(__dirname, '../public/3dmodels/merdiven/scene.gltf'));
