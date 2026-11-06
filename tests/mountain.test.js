import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {roadPoint,terrainHeight,mountainHeight,WORLD,TUNNEL} from '../engine.js';
import {landscapeHeight,createLandscapeGeometry} from '../environment.js';
import {createTerrainMaterial} from '../landscape-materials.js';

const point=(a,d)=>{const p=roadPoint(a);return {x:p.x+Math.sin(a)*d,z:p.z-Math.cos(a)*d};};
test('cabin has a low grassy setting and the main summit is on the distant east side',()=>{
 for(let x=-70;x<=50;x+=10)for(let z=-75;z<=-30;z+=5)assert.ok(landscapeHeight(x,z)<2,'Near-cabin ground must remain flat');
 for(let z=-700;z<=-150;z+=25)assert.ok(landscapeHeight(0,z)<45,'No tall north wall behind the cabin');
 const peak=point(1.65,506),height=landscapeHeight(peak.x,peak.z);
 assert.ok(height>275&&height<310);assert.ok(peak.x>1400);
 for(let a=-Math.PI;a<Math.PI;a+=.08)for(let d=7;d<1500;d+=40){const p=point(a,d);assert.ok(landscapeHeight(p.x,p.z)<320);}
 const g=createLandscapeGeometry();g.computeBoundingBox();assert.ok(g.boundingBox.max.y<320);assert.ok(g.index.count/3<240000);g.dispose();
});
test('low tunnel ridge still covers the uphill shoulder while preserving the bore',()=>{
 for(let a=TUNNEL.startAngle;a<=TUNNEL.endAngle;a+=.02){
  const p=point(a,11);assert.ok(landscapeHeight(p.x,p.z)>=roadPoint(a).y+9);
 }
});
test('pavement and lake-facing tunnel apertures retain their previous ground',()=>{
 for(let a=-Math.PI;a<Math.PI;a+=.025)for(const d of [-11,-5.2,0,5.2]){
  const p=point(a,d);assert.equal(mountainHeight(p.x,p.z),-Infinity);
  // Shore transition is separate; test the tunnel and uphill road pavement here.
  if(a>=TUNNEL.startAngle&&a<=TUNNEL.endAngle)assert.ok(Math.abs(landscapeHeight(p.x,p.z)-terrainHeight(p.x,p.z))<1e-8);
 }
});
test('summit snow uses existing surface fields without extra texture samplers',()=>{
 const m=createTerrainMaterial({grassMap:new THREE.Texture()}),s={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
 m.onBeforeCompile(s);assert.match(s.fragmentShader,/smoothstep\(210\.,275\./);assert.match(s.fragmentShader,/lmGround=mix\(lmGround,lmSnowColour,lmSnow\)/);
 assert.deepEqual(Object.keys(s.uniforms).sort(),['lmGrass','lmLake','lmRelief','lmSurface']);m.dispose();
});
