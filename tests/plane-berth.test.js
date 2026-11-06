import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {applyVehicleFidelity} from '../vehicle-fidelity.js';
import {applyPlaneBody} from '../plane-body.js';
import {landscapeHeight} from '../environment.js';
import * as E from '../engine.js';
const step=(s,input,t)=>{for(let i=0;i<t*120;i++)E.update(s,input,1/120);};
test('complete visible airframe clears pier and floats have water below at berth',async()=>{
 const b=fs.readFileSync(new URL('../assets/northbound.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 applyVehicleFidelity(scene);applyPlaneBody(scene);const plane=scene.getObjectByName('PlaneRoot');
 plane.position.set(E.PLANE_BERTH.x,E.FLIGHT.waterHeight,E.PLANE_BERTH.z);plane.rotation.set(0,-E.PLANE_BERTH.heading,0);scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3();plane.traverseVisible(o=>{if(o.isMesh){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
 assert.ok(bounds.max.x<E.DOCK_BOUNDS.minX-.5,'Entire wing and hull envelope must stay beside pier');
 for(let x=bounds.min.x;x<=bounds.max.x;x+=1)for(let z=bounds.min.z;z<=bounds.max.z;z+=1){assert.ok(E.lakeRadius(x,z)<1);assert.ok(landscapeHeight(x,z)<bounds.min.y-1,'Bed stays below float bottoms');}
});
test('berth starts engine-off, supports short pushback, idle and forward lake departure',()=>{
 const s=E.fresh();E.begin(s,'plane');assert.equal(s.onWater,true);assert.equal(s.enginePhase,'off');assert.equal(s.speed,0);assert.equal(s.heading,E.PLANE_BERTH.heading);
 const z=s.z;step(s,{reverse:true},3);assert.ok(s.z<z-1);assert.equal(s.onWater,true);assert.ok(!s.events.some(e=>e.type==='bump'));
 step(s,{brake:true},1);assert.equal(s.speed,0);assert.equal(E.action(s),true);step(s,{},3);assert.equal(s.enginePhase,'running');assert.equal(s.speed,0);
 step(s,{boost:true},5);assert.ok(s.z>z+5);assert.equal(s.onWater,true);assert.ok(!s.events.some(e=>e.type==='bump'));step(s,{boost:true,up:true},7);assert.equal(s.onWater,false);assert.ok(s.y>8);
});
