import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightBarrier,createPropellerBlur} from '../flight-effects.js';
import {WORLD,FLIGHT_BOUNDARY} from '../engine.js';
test('flight barrier matches normal radius/north edge and starts hidden',()=>{
 const b=createFlightBarrier(),p=b.geometry.attributes.position;assert.equal(b.visible,false);assert.equal(b.material.depthWrite,false);
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);assert.ok(z>=FLIGHT_BOUNDARY.normalNorth-1e-4);assert.ok(Math.hypot(x,z-WORLD.centerZ)<=WORLD.roadRadius*FLIGHT_BOUNDARY.normalRadius+1e-4);}
 assert.ok(p.array.every(Number.isFinite));assert.equal(b.material.uniforms.strength.value,0);
});
test('propeller blur is a transparent disc normal to the spin axis',()=>{
 const b=createPropellerBlur(),p=b.geometry.attributes.position;assert.equal(b.material.transparent,true);assert.equal(b.material.depthWrite,false);assert.equal(b.material.uniforms.amount.value,0);
 for(let i=0;i<p.count;i++)assert.equal(p.getZ(i),0);assert.ok(p.array.every(Number.isFinite));
});

test('landing corridor uses real paired buoys along the exported water approach',async()=>{
 const {createLandingCorridor}=await import('../flight-effects.js');const {LANDING_CORRIDOR}=await import('../engine.js');const group=createLandingCorridor(LANDING_CORRIDOR);
 assert.equal(group.children.length,2);for(const mesh of group.children){assert.equal(mesh.count,28);assert.ok(mesh.instanceMatrix.array.every(Number.isFinite));}
});
test('water wake and touchdown spray are bounded and decay after physical contact',async()=>{
 const {WaterWake}=await import('../flight-effects.js');const wake=new WaterWake(),state={phase:'plane',status:'running',onWater:true,parked:false,x:-25,z:100,heading:0,speed:10,touchdownAge:-1};
 for(let i=0;i<30;i++)wake.update(state,1/60);assert.ok(wake.pool.some(p=>p.age<p.life));
 state.touchdownAge=0;wake.update(state,1/60);assert.ok(wake.pool.some(p=>p.vy>1));assert.equal(wake.pool.length,160);assert.ok(wake.geometry.attributes.position.array.every(Number.isFinite));
 state.speed=0;for(let i=0;i<240;i++){state.touchdownAge+=1/60;wake.update(state,1/60);}assert.equal(wake.pool.filter(p=>p.age<p.life).length,0);
});


test('physical landing triggers one visible paired foam splash, with no taxi retrigger',async()=>{
 const {WaterWake}=await import('../flight-effects.js');const wake=new WaterWake(),s={phase:'plane',status:'running',onWater:false,parked:false,x:0,z:200,heading:.3,speed:14,touchdownAge:-1};
 wake.update(s,.02);assert.ok(wake.foam.children.every(r=>!r.visible));
 s.onWater=true;s.touchdownAge=0;wake.update(s,.02);assert.equal(wake.pool.filter(p=>p.age<p.life&&p.alpha>.8).length,96);assert.ok(wake.foam.children.every(r=>r.visible));
 assert.ok(wake.pool.some(p=>p.size>.4&&p.vy>2));
 s.speed=0;for(let i=0;i<150;i++){s.touchdownAge+=.02;wake.update(s,.02);}assert.ok(wake.foam.children.every(r=>!r.visible));assert.equal(wake.pool.filter(p=>p.age<p.life).length,0);
});
