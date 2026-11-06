import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';import {applyVehicleFidelity} from '../vehicle-fidelity.js';import {applyJeepBody} from '../jeep-body.js';
test('Jeep rebuild leaves clear glazing, wheel pivots and existing dimensions',async()=>{
 const b=fs.readFileSync(new URL('../assets/northbound.glb',import.meta.url));const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 applyVehicleFidelity(scene);const jeep=scene.getObjectByName('JeepRoot');jeep.position.set(0,0,0);jeep.rotation.set(0,0,0);
 const wheels=jeep.children.filter(o=>o.name.startsWith('JeepWheel')),saved=wheels.map(o=>({uuid:o.uuid,position:o.position.clone(),children:[...o.children]}));
 const stats=applyJeepBody(scene);assert.equal(stats.draws,8);assert.ok(stats.triangles<16000);
 wheels.forEach((o,i)=>{assert.equal(o.uuid,saved[i].uuid);assert.deepEqual(o.position,saved[i].position);assert.deepEqual(o.children,saved[i].children);assert.ok(o.visible);});
 jeep.updateMatrixWorld(true);const meshes=jeep.children.filter(o=>o.isMesh&&o.visible);
 for(const o of meshes){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));}
 const ray=new THREE.Raycaster(new THREE.Vector3(-3,2,.2),new THREE.Vector3(1,0,0));const hits=ray.intersectObjects(meshes,false);
 assert.ok(hits.length>=2);assert.ok(hits.every(h=>h.object.material.name==='Jeep clear window panes'),'actual side window openings');
 const bounds=new THREE.Box3();for(const o of meshes)bounds.expandByObject(o);assert.ok(bounds.min.x> -1.4&&bounds.max.x<1.4);assert.ok(bounds.min.z> -2.4&&bounds.max.z<2.5);assert.ok(bounds.max.y<2.7);
 assert.equal(jeep.getObjectByName('Rebuilt Jeep glass').material.transmission,0);
 assert.equal(applyJeepBody(scene),stats);
});
