import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCabinGrounding} from '../cabin-grounding.js';
import {landscapeHeight} from '../environment.js';
import {PARKING,terrainHeight} from '../engine.js';
const root=createCabinGrounding(landscapeHeight);root.updateMatrixWorld(true);
const ray=new THREE.Raycaster();
function groundAt(x,z){ray.set(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(root,true);}
test('arrival landscape stays finite and batched without excessive geometry',()=>{
 assert.equal(root.children.length,4);assert.ok(root.userData.grounding.triangles<7000);
 for(const mesh of root.children){assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));assert.ok(mesh.geometry.boundingSphere.radius>0);assert.equal(mesh.receiveShadow,true);}
});
test('all parking bays and the paved aisle retain clear driving space',()=>{
 for(let z=-19;z<=1;z+=.5)for(const x of [-27,-26,-25,-24])assert.equal(groundAt(x,z).length,0,`Aisle blocked at ${x},${z}`);
 for(const bay of PARKING)for(let dx=-3.4;dx<=3.4;dx+=.5)for(let dz=-1.6;dz<=1.6;dz+=.5)assert.equal(groundAt(bay.x+dx,bay.z+dz).length,0,'Added geometry within usable parking bay');
});
test('arrival path is low and follows the ground from parking to entry',()=>{
 for(const [x,z]of[[-10,-16],[-10,-9],[-10,-2],[-7,0],[-4,0],[-1,0],[1.2,-.65]]){
  const hit=groundAt(x,z)[0];assert.ok(hit,`Missing path ${x},${z}`);
  assert.ok(hit.point.y-landscapeHeight(x,z)>.015);assert.ok(hit.point.y-landscapeHeight(x,z)<.08,'Path should not float or create a vehicle obstruction');
 }
 for(const bay of PARKING)assert.equal(terrainHeight(bay.x,bay.z),1.1);
});
