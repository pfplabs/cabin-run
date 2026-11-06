import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLakeWater} from '../lake-water.js';
import {LAKE,lakeRadius,lakeBoundaryPoint} from '../engine.js';
test('lake reflection quality is bounded and shader preserves daylight and animated normals',()=>{
 for(const [quality,resolution] of [['low',512],['high',1024]]){
  const water=createLakeWater({normals:new THREE.Texture(),sunDirection:new THREE.Vector3(0,1,0),lake:LAKE,quality});
  assert.equal(water.material.uniforms.mirrorSampler.value.image.width,resolution);
  assert.equal(water.geometry.index.count,6);
  assert.equal(water.position.y,0);
  assert.ok(water.material.fragmentShader.includes('float lakeShoreScale'));
  assert.ok(water.material.fragmentShader.includes('float ripple='));
  assert.ok(water.material.uniforms.time);
  assert.ok(water.material.uniforms.sunColor);
 }
});
test('irregular shared shoreline stays coincident with flight boundary',()=>{
 for(let a=-Math.PI;a<Math.PI;a+=.03){const p=lakeBoundaryPoint(a);assert.ok(Math.abs(lakeRadius(p.x,p.z)-1)<1e-10);}
});
