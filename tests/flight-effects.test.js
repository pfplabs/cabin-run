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
