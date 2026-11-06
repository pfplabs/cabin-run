import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createForest,FOREST_LOD,forestLODWeights} from '../foliage.js';
import {roadRadius} from '../engine.js';
function makeForest(){
 const old=globalThis.document;
 globalThis.document={createElement(){return {getContext(){return {beginPath(){},moveTo(){},lineTo(){},stroke(){}};}};}};
 try{return createForest(()=>2,roadRadius);}finally{globalThis.document=old;}
}
const forest=makeForest();
function activeMeshes(){return forest.children.filter(c=>c.visible&&c.userData.mainViewVisible!==false).flatMap(c=>c.children.filter(m=>m.visible&&m.count));}
function containsTree(role,root){
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
 return forest.children.some(chunk=>chunk.visible&&chunk.children.some(mesh=>{
  if(!mesh.visible||!mesh.name.includes(role))return false;
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix).add(chunk.position);
   if(position.distanceTo(root)<.002)return true;
  }return false;
 }));
}
test('9500 seeded roots stay deterministic and geometry/bounds are finite',()=>{
 const locations=forest.getTreeLocations();assert.equal(locations.length,9500*3);
 assert.deepEqual(locations,makeForest().getTreeLocations());
 assert.ok(forest.children.length>20&&forest.children.length<120);
 for(const chunk of forest.children)for(const mesh of chunk.children){
  assert.ok(mesh.isInstancedMesh);assert.equal(mesh.frustumCulled,true);
  assert.ok(Number.isFinite(mesh.boundingSphere.radius)&&mesh.boundingSphere.radius>0);
  assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));
 }
 locations[0]=999999;assert.notEqual(forest.getTreeLocations()[0],999999);
});
test('same nearby tree gets detailed branches, then matching-position cards',()=>{
 const root=new THREE.Vector3().fromArray(forest.getTreeLocations(),0);
 forest.updateLOD(root.clone().add(new THREE.Vector3(0,10,0)));
 assert.equal(containsTree('detail-',root),true);assert.equal(containsTree('cards',root),false);
 forest.updateLOD(root.clone().add(new THREE.Vector3(310,10,0)));
 assert.equal(containsTree('detail-',root),false);assert.equal(containsTree('trunks',root),false);assert.equal(containsTree('cards',root),true);
});
test('crossfade conserves coverage and distant-only trees never gain detailed geometry',()=>{
 for(let d=0;d<=2000;d+=.25){
  const a=forestLODWeights(d),b=forestLODWeights(d,false);
  assert.ok(a.detail>=0&&a.card>=0&&a.total<=1);assert.ok(Math.abs(a.detail+a.card-a.total)<1e-10);
  assert.equal(b.detail,0);assert.equal(b.card,b.total);
 }
 assert.deepEqual(forestLODWeights(FOREST_LOD.detailStart),{detail:1,card:0,total:1});
 assert.deepEqual(forestLODWeights(190),{detail:.5,card:.5,total:1});
 assert.deepEqual(forestLODWeights(FOREST_LOD.cullDistance),{detail:0,card:0,total:0});
 for(const d of [FOREST_LOD.detailStart,FOREST_LOD.detailEnd,FOREST_LOD.fadeStart,FOREST_LOD.cullDistance]){
  const a=forestLODWeights(d-.0001),b=forestLODWeights(d+.0001);assert.ok(Math.abs(a.card-b.card)<.0001);
 }
});
test('far forest allocates no trunk cylinders; whole distant chunks are culled',()=>{
 const stats=forest.updateLOD(new THREE.Vector3(10000,100,10000));
 assert.equal(stats.activeChunks,0);assert.equal(stats.activeInstances,0);assert.equal(stats.submittedTriangles,0);
 assert.equal(stats.distanceCulledChunks,stats.totalChunks);
 let trunkCapacity=0;for(const chunk of forest.children)for(const mesh of chunk.children)if(mesh.name.endsWith('trunks'))trunkCapacity+=mesh.instanceMatrix.count;
 assert.equal(trunkCapacity,1500);
});
test('per-camera frustum culling rejects only main-view diagnostics, preserving reflections',()=>{
 const camera=new THREE.PerspectiveCamera(49,1.8,.2,6000);camera.position.set(-49,24,55);camera.lookAt(0,5,-7);
 const noFrustum={...forest.updateLOD(camera.position)};
 const stats=forest.updateLOD(camera.position,camera);assert.ok(stats.mainViewRejectedChunks>0);assert.ok(stats.mainViewChunks<noFrustum.activeChunks);assert.equal(stats.activeChunks,noFrustum.activeChunks);
 assert.ok(forest.children.some(c=>c.visible&&!c.userData.mainViewVisible&&c.children.some(m=>m.visible&&m.count)));
 for(const chunk of forest.children)for(const mesh of chunk.children)assert.equal(mesh.frustumCulled,true);
 let triangles=0,instances=0;for(const mesh of activeMeshes()){triangles+=mesh.count*mesh.geometry.index.count/3;instances+=mesh.count;}
 assert.equal(stats.submittedTriangles,triangles);assert.equal(stats.activeInstances,instances);assert.equal(stats.drawCallsEstimate,activeMeshes().length);
 assert.ok(stats.detailInstances<300);assert.ok(stats.drawCallsEstimate<55);
 assert.equal(stats.trunkInstances,stats.detailInstances);
 assert.equal(stats.activeChunks+stats.distanceCulledChunks+stats.emptyChunks,stats.totalChunks);
 assert.equal(stats.activeUniqueTrees,stats.detailInstances+stats.cardInstances-stats.transitionTrees);
 assert.equal(stats.mainViewChunks+stats.mainViewRejectedChunks,stats.activeChunks);
 assert.equal(stats.reflectionEligibleChunks,stats.activeChunks);
 assert.ok(stats.distanceActiveInstances>stats.activeInstances);
});
test('stationary membership does not upload instance buffers again',()=>{
 const p=new THREE.Vector3(-49,24,55);forest.updateLOD(p);
 const versions=activeMeshes().map(m=>[m,m.instanceMatrix.version]);forest.updateLOD(p);
 for(const [mesh,version]of versions)assert.equal(mesh.instanceMatrix.version,version);
 assert.equal(forest.userData.updateLOD,forest.updateLOD);
});
test('colour and shadow shaders use main-camera distance and complementary dithering',()=>{
 const meshes=forest.children.flatMap(c=>c.children),detail=meshes.find(m=>m.name.includes('detail-')),cards=meshes.find(m=>m.name.endsWith('cards'));
 function compileCPU(material,lib){const s={vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader,uniforms:{}};material.onBeforeCompile(s);return s;}
 const a=compileCPU(detail.material,THREE.ShaderLib.standard),b=compileCPU(cards.material,THREE.ShaderLib.standard),depth=compileCPU(detail.customDepthMaterial,THREE.ShaderLib.depth);
 for(const s of [a,b,depth]){assert.match(s.vertexShader,/instanceMatrix\*forestCenter/);assert.match(s.vertexShader,/forestCamera/);assert.match(s.fragmentShader,/forestFade/);assert.ok(s.uniforms.forestCamera.value.isVector3);}
 assert.match(a.fragmentShader,/forestNoise>=1.-forestBlend/);assert.match(b.fragmentShader,/forestNoise<1.-forestBlend/);
 assert.match(b.vertexShader,/attribute float lodEligible/);assert.equal(cards.castShadow,false);
 assert.equal(a.uniforms.forestCamera,b.uniforms.forestCamera);assert.equal(a.uniforms.forestCamera,depth.uniforms.forestCamera);
});


test('distant tree cards sample texture roots at bottom and apex at top',()=>{
 const cards=forest.children[0].children.find(m=>m.name.endsWith('cards'));
 const p=cards.geometry.attributes.position,uv=cards.geometry.attributes.uv;
 for(let i=0;i<p.count;i++)assert.equal(uv.getY(i),p.getY(i)<.5?0:1);
});
