import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {roadPoint,roadSample,terrainHeight,lakeBoundaryPoint,lakeRadius,roadLength,BRIDGE,begin,fresh,update,WORLD} from '../engine.js';
import {createLandscapeGeometry,landscapeHeight} from '../environment.js';
import {shorelineScale,SHORELINE_GLSL} from '../shoreline.js';

test('mountain pass climbs above 210 metres through real S-bends and descends to bridge',()=>{
 let high=0,maxGrade=0,turns=0,last=0;
 for(let a=.38;a<2.95;a+=.005){
  const p=roadPoint(a-.001),q=roadPoint(a),r=roadPoint(a+.001);
  high=Math.max(high,q.y);maxGrade=Math.max(maxGrade,Math.abs(r.y-q.y)/Math.hypot(r.x-q.x,r.z-q.z));
  const dx=(r.x-p.x)/.002,dz=(r.z-p.z)/.002,ddx=(r.x-2*q.x+p.x)/1e-6,ddz=(r.z-2*q.z+p.z)/1e-6,cross=dx*ddz-dz*ddx;
  if(Math.abs(cross)>1000){if(last&&Math.sign(cross)!==last)turns++;last=Math.sign(cross);}
 }
 assert.ok(high>210&&high<230);assert.ok(maxGrade<.24);assert.ok(turns>=6);assert.ok(roadLength()>4700&&roadLength()<4900);assert.ok(roadPoint(BRIDGE.angle).y>22&&roadPoint(BRIDGE.angle).y<25);
});
test('S-bend road cross-sections stay full-width and level rather than banking into terrain',()=>{
 for(let a=.4;a<2.9;a+=.02){const p=roadPoint(a),q=roadPoint(a+.0001),len=Math.hypot(q.x-p.x,q.z-p.z);
  for(const side of [-5.2,-4.2,0,4.2,5.2]){const x=p.x-(q.z-p.z)/len*side,z=p.z+(q.x-p.x)/len*side;
   assert.ok(Math.abs(terrainHeight(x,z)-p.y)<.015);assert.ok(Math.abs(Math.abs(roadSample(x,z).offset)-Math.abs(side))<.015);
  }
 }
});
test('new shore has distinct bays and headlands while preserving cabin and stream mouths',()=>{
 const radii=Array.from({length:720},(_,i)=>shorelineScale(i/720*Math.PI*2));assert.ok(Math.max(...radii)-Math.min(...radii)>.17);
 for(const a of [0,.1,-.1,Math.PI,Math.PI-.05])assert.equal(shorelineScale(a),1);
 for(let a=-Math.PI;a<Math.PI;a+=.025){const p=lakeBoundaryPoint(a);assert.ok(Math.abs(lakeRadius(p.x,p.z)-1)<1e-10);assert.ok(landscapeHeight(p.x,p.z)<1.1);}
 assert.match(SHORELINE_GLSL,/\.07\*sin\(3\.\*a\)/);
});
test('bridge guardrails block Jeep while the straight centre remains traversable',()=>{
 const s=fresh();begin(s);const p=roadPoint(BRIDGE.angle);Object.assign(s,p,{heading:0,speed:5});update(s,{up:true},.05);assert.ok(s.speed>0);
 Object.assign(s,p,{z:p.z+BRIDGE.halfWidth-1.3,heading:Math.PI,speed:5});update(s,{up:true},.05);assert.equal(s.speed,0);assert.match(s.events.at(-1).text,/Bridge railing/);
});
test('asphalt clearance over sampled rendered mountain road is not lost to coarse triangles',()=>{
 const g=createLandscapeGeometry(),m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster();m.updateMatrixWorld();
 for(let a=.42;a<2.90;a+=.07){const p=roadPoint(a),q=roadPoint(a+.0001),len=Math.hypot(q.x-p.x,q.z-p.z);for(const side of [-3.8,0,3.8]){
  const x=p.x-(q.z-p.z)/len*side,z=p.z+(q.x-p.x)/len*side;ray.set(new THREE.Vector3(x,500,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(m)[0];assert.ok(hit);assert.ok(hit.point.y<terrainHeight(x,z)+.075,`Buried asphalt at ${a},${side}: ${hit.point.y-terrainHeight(x,z)}`);
 }}g.dispose();m.material.dispose();
});
