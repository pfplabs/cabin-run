import test from 'node:test';
import assert from 'node:assert/strict';
import {cabinApproachWidth,cabinApproachSample} from '../cabin-turnoff.js';
import {createCabinApproachGeometry,isGravel,cabinTurnoffOpening} from '../road-surfaces.js';
import {roadSignPlacements} from '../road-signs.js';
import {DRIVEWAY,terrainHeight} from '../engine.js';
test('cabin junction widens to a two-way apron and smoothly rejoins unchanged approach',()=>{
 assert.equal(cabinApproachWidth(0),12);assert.equal(cabinApproachWidth(32),4.5);assert.equal(cabinApproachWidth(60),4.5);
 for(let d=1;d<32;d++)assert.ok(cabinApproachWidth(d)<cabinApproachWidth(d-1));
 const g=createCabinApproachGeometry(4.5,{offset:.09}),p=g.attributes.position;
 for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-terrainHeight(p.getX(i),p.getZ(i))-.09)<.0001);
 assert.ok(Math.abs(Math.hypot(p.getX(0)-p.getX(1),p.getZ(0)-p.getZ(1))-12)<.0001);g.dispose();
});
test('flared cabin entrance opens the lake edge stripe and keeps paved tyre classification',()=>{
 const a=DRIVEWAY[0],b=DRIVEWAY[1],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),x=a.x+dx/l*8-dz/l*4,z=a.z+dz/l*8+dx/l*4;
 const s=cabinApproachSample(DRIVEWAY,x,z);assert.ok(s.distance<s.halfWidth);assert.equal(cabinTurnoffOpening(x,z),true);assert.equal(isGravel(x,z),false);
 assert.equal(cabinTurnoffOpening(DRIVEWAY.at(-1).x,DRIVEWAY.at(-1).z),false);
});

test("cabin STOP post clears widened pavement",()=>{const sign=roadSignPlacements().find(s=>s.kind==="stop"),sample=cabinApproachSample(DRIVEWAY,sign.x,sign.z);assert.ok(sample.distance>sample.halfWidth+1);});
