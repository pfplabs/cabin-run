import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';import {applyVehicleFidelity} from '../vehicle-fidelity.js';import {applyJeepBody} from '../jeep-body.js';import {applyPickupWheels,PICKUP_WHEEL} from '../pickup-wheels.js';
test('replacement tires preserve rotation axis, fit wheel arches, and reduce distant detail',async()=>{
 const b=fs.readFileSync(new URL('../assets/northbound.glb',import.meta.url));const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 applyVehicleFidelity(scene);applyJeepBody(scene);const jeep=scene.getObjectByName('JeepRoot');jeep.position.set(0,0,0);jeep.rotation.set(0,0,0);jeep.updateMatrixWorld(true);
 const stats=applyPickupWheels(jeep);assert.ok(stats.nearTrianglesPerWheel<12500);assert.ok(stats.farTrianglesPerWheel<1800);assert.ok(stats.farTrianglesPerWheel<stats.nearTrianglesPerWheel*.2);
 const roots=jeep.children.filter(o=>/^JeepWheel(Left|Right)(Front|Rear)$/.test(o.name));
 const body=jeep.children.filter(o=>o.isMesh&&o.visible&&o.material.name==='Jeep reference black enamel');
 let geometry;
 for(const wheel of roots){
  const lod=wheel.getObjectByName('Pickup wheel detail LOD');assert.equal(lod.levels.length,2);assert.equal(lod.levels[1].distance,PICKUP_WHEEL.lodDistance);
  const tire=lod.levels[0].object.children[0];if(geometry)assert.equal(tire.geometry,geometry);geometry=tire.geometry;
  const p=tire.geometry.attributes.position;let radius=0,width=0;for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getX(i)));radius=Math.max(radius,Math.hypot(p.getY(i),p.getZ(i)));width=Math.max(width,Math.abs(p.getX(i)));}
  assert.ok(radius>.585&&radius<.592);assert.ok(width*2<=.352);assert.equal(tire.material.metalness,0);
  // Casing + tread are circular through a full revolution and clear the upper
  // fender at straight-ahead, road steering and parking-lock angles.
  for(const steer of [-.78,-.55,0,.55,.78])for(const roll of [0,.7,2.1,4.3]){
   wheel.rotation.order='YXZ';wheel.rotation.set(roll,wheel.name.includes('Front')?steer:0,0);jeep.updateMatrixWorld(true);
   for(const offset of [-.11,0,.11]){
    const start=new THREE.Vector3(wheel.position.x+offset,wheel.position.y+radius,wheel.position.z);
    const ray=new THREE.Raycaster(start,new THREE.Vector3(0,1,0),0,.5);const hits=ray.intersectObjects(body,false);
    if(hits.length)assert.ok(hits[0].distance>.03,'tread must not touch the fender crown');
   }
  }
  wheel.rotation.set(0,0,0);
  const near=new THREE.PerspectiveCamera();near.position.copy(wheel.position).add(new THREE.Vector3(3,0,0));near.updateMatrixWorld();lod.update(near);assert.equal(lod.getCurrentLevel(),0);
  const far=new THREE.PerspectiveCamera();far.position.copy(wheel.position).add(new THREE.Vector3(50,0,0));far.updateMatrixWorld();lod.update(far);assert.equal(lod.getCurrentLevel(),1);
 }
 assert.equal(applyPickupWheels(jeep),stats);
});
