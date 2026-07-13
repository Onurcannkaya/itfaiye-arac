const fs = require('fs');
const path = require('path');

const gltfPath = path.join(__dirname, '../public/3dmodels/hyundai_accent_tagaz_2004/scene.gltf');
const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf-8'));
const accessors = gltf.accessors;

gltf.meshes.forEach((mesh, meshIdx) => {
  mesh.primitives.forEach((prim, primIdx) => {
    const posAccessorIdx = prim.attributes.POSITION;
    if (posAccessorIdx !== undefined) {
      const accessor = accessors[posAccessorIdx];
      const min = accessor.min;
      const max = accessor.max;
      const sizeX = max[0] - min[0];
      const sizeY = max[1] - min[1];
      const sizeZ = max[2] - min[2];
      
      // If it's a very large mesh, print it!
      if (sizeX > 5 || sizeY > 5 || sizeZ > 5) {
        console.log(`Mesh ${meshIdx} (${mesh.name}): sizeX=${sizeX}, sizeY=${sizeY}, sizeZ=${sizeZ}, min=${JSON.stringify(min)}, max=${JSON.stringify(max)}`);
      }
    }
  });
});
