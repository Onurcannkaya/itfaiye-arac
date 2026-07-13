const fs = require('fs');
const path = require('path');

// We don't need Three.js to parse the gltf JSON and find meshes.
// We can just load the scene.gltf file (JSON) and inspect its nodes, meshes, and accessors.
// But wait, it's easier to just use Three.js in a node script since it's installed.
// Wait, GLTFLoader in Node requires a browser-like environment (document, window, etc.) or a polyfill.
// A simpler way is to just parse the scene.gltf JSON and look for any node names or mesh names that might be "shadow", "ground", "floor", "plane", "under", "bottom".

const gltfPath = path.join(__dirname, '../public/3dmodels/58-tl-737/scene.gltf');
const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf-8'));

console.log("Nodes:");
gltf.nodes.forEach((node, i) => {
  if (node.name) {
    console.log(`Node ${i}: ${node.name}`);
  }
});

console.log("\nMeshes:");
gltf.meshes.forEach((mesh, i) => {
  console.log(`Mesh ${i}: ${mesh.name}`);
});
