import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {roadPoint,terrainHeight,mountainHeight,WORLD,TUNNEL} from '../engine.js';
import {landscapeHeight,createLandscapeGeometry} from '../environment.js';
import {createTerrainMaterial} from '../landscape-materials.js';

const point=(a,d)=>{const p=roadPoint(a);return {x:p.x+Math.sin(a)*d,z:p.z-Math.cos(a)*d};};
test('tunnel massif and its left shoulder rise continuously from road to summit',()=>{
 for(const a of [-.45,-.25,0,TUNNEL.startAngle,.2,TUNNEL.endAngle,.6]){
  let previous=roadPoint(a).y;
  for(let d=6;d<=706;d+=2){const p=point(a,d),h=landscapeHeight(p.x,p.z);assert.ok(h>=previous-.001,`Trough at angle ${a}, offset ${d}`);previous=h;}
 }
});
test('snow summit is the highest terrain, far above the tunnel',()=>{
 const peak=point(.2,706),height=landscapeHeight(peak.x,peak.z);
 assert.ok(height>880);assert.ok(height-roadPoint(.2).y>800);
 for(let a=-Math.PI;a<Math.PI;a+=.04)for(let d=7;d<1500;d+=20){const p=point(a,d);assert.ok(landscapeHeight(p.x,p.z)<=height+.001);}
 const g=createLandscapeGeometry();g.computeBoundingBox();assert.ok(g.boundingBox.max.y>870);assert.ok(g.index.count/3<180000);g.dispose();
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
 m.onBeforeCompile(s);assert.match(s.fragmentShader,/smoothstep\(530\.,650\./);assert.match(s.fragmentShader,/lmGround=mix\(lmGround,lmSnowColour,lmSnow\)/);
 assert.deepEqual(Object.keys(s.uniforms).sort(),['lmGrass','lmLake','lmRelief','lmSurface']);m.dispose();
});
