import {createExplorationScenery,explorationSigns} from '../exploration-scenery.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as E from '../engine.js';
import {createLandscapeGeometry} from '../environment.js';
import {grassAllowed} from '../forest-grass.js';
import {isGravel} from '../road-surfaces.js';

test('three shared spur corridors and turnarounds are dry, graded and clear of grass',()=>{
 for(const r of E.EXPLORATION_ROUTES){
  assert.deepEqual(r.points[0],E.roadPoint(r.angle));
  for(const [i,p] of r.points.entries()){
   assert.ok(E.lakeRadius(p.x,p.z)>1+4/E.LAKE.rz);assert.ok(E.roadOffset(p.x,p.z)<78);
   assert.equal(grassAllowed(p.x,p.z,E.terrainHeight),false);
   assert.ok(Math.abs(E.terrainHeight(p.x,p.z)-p.y)<.08);
   if(i){const a=r.points[i-1];assert.ok(Math.abs(p.y-a.y)/Math.hypot(p.x-a.x,p.z-a.z)<.06);}
  }
  for(let a=0;a<Math.PI*2;a+=.1){const x=r.end.x+Math.cos(a)*11,z=r.end.z+Math.sin(a)*11;assert.ok(E.lakeRadius(x,z)>1+4/E.LAKE.rz);assert.ok(Math.abs(E.terrainHeight(x,z)-r.end.y)<.001);assert.equal(isGravel(x,z),true);}
  for(const p of r.turnLane)assert.ok(Math.abs(E.terrainHeight(p.x,p.z)-E.roadSample(p.x,p.z).y)<.01,'turn lane must remain level');
 }
});

test('actual jeep dynamics can drive every spur both ways and discover stops once',()=>{
 for(const r of E.EXPLORATION_ROUTES){
  const s=E.fresh();E.begin(s);let targets=[...r.points.slice(1)];Object.assign(s,{...r.points[0],heading:Math.atan2(targets[0].x-r.points[0].x,r.points[0].z-targets[0].z)});
  function follow(points){let k=0;for(let frame=0;frame<18000&&k<points.length;frame++){
   const p=points[k],distance=Math.hypot(p.x-s.x,p.z-s.z);if(distance<3){k++;continue;}
   const error=Math.atan2(Math.sin(Math.atan2(p.x-s.x,s.z-p.z)-s.heading),Math.cos(Math.atan2(p.x-s.x,s.z-p.z)-s.heading));
   E.update(s,{up:s.speed<4,brake:s.speed>4.5,left:error<-.03,right:error>.03},1/60);
  }assert.equal(k,points.length,`route ${r.id} stalled`);}
  follow(targets);for(let i=0;i<180;i++)E.update(s,{brake:true},1/60);
  assert.ok(s.visitedStops.includes(r.id));assert.equal(s.events.filter(e=>e.type==='discovery').length,1);
  // A low-speed circle within the 24m apron supplies enough room to reverse direction.
  const initialHeading=s.heading;
  for(let i=0;i<1500&&s.heading-initialHeading<Math.PI;i++)E.update(s,{right:true,up:s.speed<2.5,brake:s.speed>3},1/60);
  assert.ok(s.heading-initialHeading>=Math.PI,'turnaround must fit a low-speed U-turn');
  for(let i=0;i<120;i++)E.update(s,{brake:true},1/60);
  follow([...r.points].reverse().slice(1));
  assert.equal(s.events.filter(e=>e.type==='bump').length,0);
 }
});

test('rendered terrain does not bury tyres along spurs or added turning pockets',()=>{
 const g=createLandscapeGeometry(),mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();const ray=new THREE.Raycaster();
 for(const r of E.EXPLORATION_ROUTES)for(const p of [...r.points,...r.turnLane]){
  ray.set(new THREE.Vector3(p.x,100,p.z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];assert.ok(hit);const error=hit.point.y-E.terrainHeight(p.x,p.z);assert.ok(error<.1&&error>-.18,`${r.id}: ground mismatch ${error}`);
 }
 g.dispose();mesh.material.dispose();
});


test('destination geometry and signs remain finite within a small static draw budget',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
 try{const road=Array.from({length:641},(_,i)=>E.roadPoint(i/640*Math.PI*2)),material=new THREE.MeshStandardMaterial(),scene=createExplorationScenery(road,material,material);let count=0;scene.traverse(o=>{if(o.isMesh){count++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});assert.ok(count<40,`scene has ${count} meshes`);
 const signs=explorationSigns();assert.equal(signs.length,9);assert.equal(signs.filter(s=>s.kind==='stop').length,3);for(const s of signs)assert.ok([s.x,s.z,s.rotation].every(Number.isFinite));
 }finally{globalThis.document=old;}
});
