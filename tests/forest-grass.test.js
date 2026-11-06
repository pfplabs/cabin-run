import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createForestGrass,grassAllowed,grassPlacements} from '../forest-grass.js';
import {roadPoint,DRIVEWAY,PARKING_APRON} from '../engine.js';
const height=()=>2,roots=new Float32Array([-40,2,-40,40,2,-45,60,2,-50]);
test('placement is deterministic and excludes driving surfaces and cabin',()=>{
 assert.deepEqual(grassPlacements(roots,height),grassPlacements(roots,height));
 assert.ok(grassPlacements(roots,height).length>20);
 for(let a=0;a<Math.PI*2;a+=.02){const p=roadPoint(a);assert.equal(grassAllowed(p.x,p.z,height),false);}
 for(const p of DRIVEWAY)assert.equal(grassAllowed(p.x,p.z,height),false);
 const p=PARKING_APRON;for(let x=p.x-p.width/2;x<=p.x+p.width/2;x++)for(let z=p.z-p.length/2;z<=p.z+p.length/2;z++)assert.equal(grassAllowed(x,z,height),false);
 assert.equal(grassAllowed(10,-12,height),false);assert.equal(grassAllowed(0,352,height),false);
 for(const p of grassPlacements(roots,height))assert.equal(grassAllowed(p.x,p.z,height),true);
});
test('instanced grass has finite bounds, density controls and distant culling',()=>{
 const grass=createForestGrass(roots,height);const near={...grass.update(1,new THREE.Vector3(-40,4,-40))};assert.ok(near.submittedTufts>0);
 for(const mesh of grass.children){assert.ok(mesh.isInstancedMesh);assert.equal(mesh.castShadow,false);assert.ok(Number.isFinite(mesh.boundingSphere.radius));assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));}
 grass.setDensity(.5);const half={...grass.update(2,new THREE.Vector3(-40,4,-40))};assert.ok(half.submittedTufts<=near.submittedTufts*.5);
 grass.setDensity(0);assert.equal(grass.update(3,new THREE.Vector3()).submittedTufts,0);
 grass.setDensity(1);assert.equal(grass.update(4,new THREE.Vector3(10000,1000,10000)).activeChunks,0);
 grass.dispose();
});
