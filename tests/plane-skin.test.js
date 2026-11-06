import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {applyVehicleFidelity} from '../vehicle-fidelity.js';
import {applyPlaneBody} from '../plane-body.js';
import {applyPlaneSkin} from '../plane-skin.js';

test('aircraft finish is isolated from Jeep and keeps livery coherent across moving surfaces',async()=>{
 const b=fs.readFileSync(new URL('../assets/northbound.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 applyVehicleFidelity(scene);
 const jeep=[];scene.getObjectByName('JeepRoot').traverse(o=>{if(o.isMesh)jeep.push([o,o.material,o.material.color.clone()]);});
 const plane=scene.getObjectByName('PlaneRoot');applyPlaneBody(scene);
 for(const [o,m,c] of jeep){assert.equal(o.material,m);assert.ok(m.color.equals(c));}
 const paints=[];plane.traverse(o=>{if(o.isMesh&&/Aircraft enamel|Floatplane yellow/.test(o.material.name))paints.push(o.material);});
 assert.ok(paints.length>5);for(const m of paints){assert.equal(m.color.getHex(),0xd8ac35);assert.ok(m.isMeshPhysicalMaterial);assert.equal(m.customProgramCacheKey(),'aircraft-skin-v1-paint');}
 const count=plane.children.length;assert.equal(applyPlaneSkin(plane),plane.userData.skinFinish);assert.equal(plane.children.length,count);
 // The rounded belly must be a real curved enclosure, not just a shading overlay.
 plane.position.set(0,0,0);plane.rotation.set(0,0,0);scene.updateMatrixWorld(true);
 const enamel=plane.children.find(o=>o.material?.name==='Aircraft enamel');
 const hits=new THREE.Raycaster(new THREE.Vector3(-2,1.4,-.7),new THREE.Vector3(1,0,0),0,4).intersectObject(enamel);
 assert.ok(hits.length>=2);assert.ok(hits[0].point.x>-.57&&hits[0].point.x<-.50,'lower cabin curves inward below sill');
});
