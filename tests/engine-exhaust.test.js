import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EngineExhaust} from '../engine-exhaust.js';
const state=()=>({status:'running',phase:'plane',enginePhase:'starting',engineStartRemaining:3,propRPM:0,heading:0,speed:0,parked:false});
test('startup exhaust emits at transformed engine outlet, is bounded, and clears after ignition',()=>{
 const effect=new EngineExhaust(),plane=new THREE.Group(),s=state();plane.position.set(10,5,20);plane.rotation.y=.7;
 for(let i=0;i<180;i++){s.engineStartRemaining-=1/60;effect.update(s,1/60,plane);}
 assert.ok(effect.visible);assert.equal(effect.pool.length,96);assert.ok(effect.geometry.attributes.position.array.every(Number.isFinite));
 const origin=effect.outlet.clone().applyMatrix4(plane.matrixWorld);const youngest=effect.pool.filter(p=>p.age<p.life).sort((a,b)=>a.age-b.age)[0];assert.ok(Math.hypot(youngest.x-origin.x,youngest.y-origin.y,youngest.z-origin.z)<.2);
 s.enginePhase='running';for(let i=0;i<360;i++)effect.update(s,1/60,plane);assert.equal(effect.visible,false);assert.ok(effect.geometry.attributes.aAlpha.array.every(v=>v===0));effect.dispose();
});
test('exhaust freezes on pause and resets on vehicle switch or mooring',()=>{
 const effect=new EngineExhaust(),s=state(),plane=new THREE.Group();s.engineStartRemaining=1;
 effect.update(s,.05,plane);const ages=effect.pool.map(p=>p.age);s.status='paused';effect.update(s,.05,plane);assert.deepEqual(effect.pool.map(p=>p.age),ages);
 s.status='running';s.phase='jeep';effect.update(s,.05,plane);assert.equal(effect.visible,false);assert.equal(effect.previous,'off');assert.ok(effect.pool.every(p=>p.age>=p.life));effect.dispose();
});
