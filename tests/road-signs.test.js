import test from 'node:test';
import assert from 'node:assert/strict';
import {roadSignPlacements,createRoadSigns,turnoffStopPlacement,signFaceGeometry} from '../road-signs.js';
import {roadPoint,DRIVEWAY,roadOffset} from '../engine.js';
test('road signs stay seven metres from road centre and face approaching traffic',()=>{
 const signs=roadSignPlacements();assert.equal(signs.length,11);
 for(const s of signs.filter(s=>s.kind!=='stop')){
  const p=roadPoint(s.angle),q=roadPoint(s.angle+.001),dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);
  assert.ok(Math.abs(Math.hypot(s.x-p.x,s.z-p.z)-7)<1e-8);
  assert.ok(Math.sin(s.rotation)*dx/len*s.direction+Math.cos(s.rotation)*dz/len*s.direction<-.999);
 }
 assert.equal(signs.filter(s=>s.kind==='warning').length,2);
});
test('signs have upright posts, readable front faces, and terrain-grounded bases',()=>{
 const old=globalThis.document;
 globalThis.document={createElement(){return {getContext(){return new Proxy({}, {get:()=>()=>{},set:()=>true});}};}};
 try{const signs=createRoadSigns(()=>23);assert.equal(signs.children.length,11);for(const s of signs.children){assert.equal(s.position.y,23);assert.equal(s.children.length,3);assert.ok(s.children[2].position.z>0);assert.ok(s.children[0].position.z<-.06);}}
 finally{globalThis.document=old;}
});

 test('stop controls outbound driveway traffic with clearance from both roads',()=>{
  const s=turnoffStopPlacement(DRIVEWAY),p=DRIVEWAY[0],q=DRIVEWAY[1],dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);
  assert.ok(Math.sin(s.rotation)*dx/len+Math.cos(s.rotation)*dz/len>.99);
  const offset=(s.x-p.x)*dz/len-(s.z-p.z)*dx/len;
  assert.ok(Math.abs(offset-3.85)<.01);assert.ok(Math.abs(roadOffset(s.x,s.z))>6);
 });
 test('US sign silhouettes have bounded geometry and normalized texture coordinates',()=>{
  for(const kind of ['stop','wildlife','speed']){const g=signFaceGeometry(kind);g.computeBoundingBox();assert.ok(g.boundingBox.max.y>0);for(const v of g.attributes.uv.array)assert.ok(v>=0&&v<=1);g.dispose();}
  const signs=roadSignPlacements();assert.equal(signs.filter(s=>s.kind==='wildlife').length,2);assert.equal(signs.filter(s=>s.kind==='speed').length,4);
 });
