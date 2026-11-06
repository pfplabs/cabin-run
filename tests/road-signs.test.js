import test from 'node:test';
import assert from 'node:assert/strict';
import {roadSignPlacements,createRoadSigns} from '../road-signs.js';
import {roadPoint} from '../engine.js';
test('road signs stay seven metres from road centre and face approaching traffic',()=>{
 const signs=roadSignPlacements();assert.equal(signs.length,6);
 for(const s of signs){
  const p=roadPoint(s.angle),q=roadPoint(s.angle+.001),dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);
  assert.ok(Math.abs(Math.hypot(s.x-p.x,s.z-p.z)-7)<1e-8);
  assert.ok(Math.sin(s.rotation)*dx/len*s.direction+Math.cos(s.rotation)*dz/len*s.direction<-.999);
 }
 assert.equal(signs.filter(s=>s.kind==='warning').length,2);
});
test('signs have upright posts, readable front faces, and terrain-grounded bases',()=>{
 const old=globalThis.document;
 globalThis.document={createElement(){return {getContext(){return {fillRect(){},strokeRect(){},fillText(){}};}};}};
 try{const signs=createRoadSigns(()=>23);assert.equal(signs.children.length,6);for(const s of signs.children){assert.equal(s.position.y,23);assert.equal(s.children.length,3);assert.ok(s.children[2].position.z>0);}}
 finally{globalThis.document=old;}
});
