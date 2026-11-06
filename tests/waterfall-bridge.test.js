import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BRIDGE,roadPoint} from '../engine.js';
import {createWaterfallBridge,createBridgeDeckGeometry,bridgeStation,gorgeHeight,streamHeight,streamCenter} from '../waterfall-bridge.js';

test('curved deck follows road endpoints and stays below driving surface',()=>{
 const geometry=createBridgeDeckGeometry(),p=geometry.attributes.position;
 assert.ok(p.array.every(Number.isFinite));
 for(let i=0;i<=64;i++){
  const a=BRIDGE.angle-BRIDGE.halfAngle+2*BRIDGE.halfAngle*i/64,road=roadPoint(a);
  const left=new THREE.Vector3().fromBufferAttribute(p,i*4),right=new THREE.Vector3().fromBufferAttribute(p,i*4+1);
  assert.ok(Math.hypot((left.x+right.x)/2-road.x,(left.z+right.z)/2-road.z)<.001);
  assert.ok(Math.abs(left.y-road.y+.04)<.0001);
  assert.ok(Math.abs(left.distanceTo(right)-2*BRIDGE.halfWidth)<.001);
 }
});

test('bridge leaves the complete driver clearance envelope unobstructed',()=>{
 const group=createWaterfallBridge();group.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 // Rays traverse the height of a car, covering pavement and gravel shoulders.
 for(let i=0;i<=44;i++)for(const lateral of [-5.2,-4,0,4,5.2]){
  const a=BRIDGE.angle-BRIDGE.halfAngle+2*BRIDGE.halfAngle*i/44,p=bridgeStation(a,lateral);
  ray.set(new THREE.Vector3(p.x,p.y+.02,p.z),new THREE.Vector3(0,1,0));ray.far=3;
  const hits=ray.intersectObject(group,true);
  assert.equal(hits.length,0,`Driving envelope blocked at station ${i}, offset ${lateral}`);
 }
});

test('bridge scene finite geometry, bounded draw calls, and animation without allocation',()=>{
 const group=createWaterfallBridge();let draws=0,triangles=0;
 group.traverse(o=>{if(!o.isMesh)return;draws++;const g=o.geometry;for(const a of Object.values(g.attributes))assert.ok(a.array.every(Number.isFinite));triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);if(o.isInstancedMesh)assert.ok(o.instanceMatrix.array.every(Number.isFinite));});
 assert.ok(draws<=5,`${draws} draw calls`);assert.ok(triangles<16000,`${triangles} triangles`);
 const time=group.userData.time;group.update(12.5);assert.equal(time.value,12.5);group.update(NaN);assert.equal(time.value,12.5);assert.equal(group.userData.time,time);
});

test('gorge is narrowly localized, drains toward lake, and clears bridge underside',()=>{
 assert.equal(gorgeHeight(100,916,40),40);assert.equal(gorgeHeight(0,600,40),40);assert.equal(gorgeHeight(0,1100,40),40);
 for(let z=700;z<=1020;z+=2){assert.ok(streamHeight(z)>=streamHeight(z-2));assert.ok(gorgeHeight(streamCenter(z),z,80)<streamHeight(z));}
 const p=roadPoint(BRIDGE.angle);assert.ok(gorgeHeight(p.x,p.z,p.y)<p.y-8);
});
