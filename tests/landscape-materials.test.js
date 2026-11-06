import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createProceduralSurfaceTexture,createRockMaterial,createTerrainMaterial,createGraniteGeometry} from '../landscape-materials.js';

function shaderFor(material){
 const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader);return shader;
}
test('procedural packed surface is deterministic, mipmapped, linear and canvas-free',()=>{
 const a=createProceduralSurfaceTexture(64),b=createProceduralSurfaceTexture(64);
 assert.deepEqual(a.image.data,b.image.data);assert.equal(a.image.data.length,64*64*4);
 assert.equal(a.colorSpace,THREE.NoColorSpace);assert.equal(a.generateMipmaps,true);assert.equal(a.wrapS,THREE.RepeatWrapping);
 assert.ok(new Set(a.image.data).size>100);assert.throws(()=>createProceduralSurfaceTexture(63),RangeError);
});
test('rock shader patches standard chunks, supports instancing and varies roughness/normals',()=>{
 const m=createRockMaterial(),s=shaderFor(m);
 assert.equal(m.metalness,0);assert.equal(m.side,THREE.DoubleSide);
 assert.match(s.vertexShader,/instanceMatrix\*lmWorld/);assert.match(s.vertexShader,/inverseTransformDirection\(transformedNormal,viewMatrix\)/);
 assert.match(s.fragmentShader,/normal=lmBumpNormal/);assert.match(s.fragmentShader,/roughnessFactor\*lmRough/);
 assert.match(s.fragmentShader,/fwidth\(lmPhase\)/);assert.match(s.fragmentShader,/smoothstep\(22\.,100\./);
 assert.doesNotMatch(s.fragmentShader,/#include <map_fragment>/);
 assert.ok(s.uniforms.lmSurface.value.isDataTexture);
});
test('terrain uses world-scale layers, correct lake bounds and distinct program cache key',()=>{
 const grass=new THREE.Texture(),m=createTerrainMaterial({grassMap:grass,lake:{x:2,z:124,rx:156,rz:114}}),s=shaderFor(m);
 assert.deepEqual(s.uniforms.lmLake.value.toArray(),[2,124,156,114]);assert.equal(s.uniforms.lmGrass.value,grass);
 assert.equal(m.vertexColors,false);assert.match(s.fragmentShader,/lmRockMask/);assert.match(s.fragmentShader,/lmShore/);
 assert.match(s.fragmentShader,/vLMWorld.xz\/6\./);assert.equal(grass.wrapS,THREE.RepeatWrapping);
 assert.notEqual(m.customProgramCacheKey(),createRockMaterial().customProgramCacheKey());
 assert.throws(()=>createTerrainMaterial(),TypeError);
});
test('materials share packed source but keep independent uniforms',()=>{
 const a=shaderFor(createRockMaterial({relief:.2})),b=shaderFor(createRockMaterial({relief:.9}));
 assert.equal(a.uniforms.lmSurface.value,b.uniforms.lmSurface.value);
 assert.equal(a.uniforms.lmRelief.value,.2);assert.equal(b.uniforms.lmRelief.value,.9);
});
test('decorative granite geometry has welded smooth normals and bounded triangle count',()=>{
 const g=createGraniteGeometry(),a=g.attributes.position,n=g.attributes.normal;
 assert.equal(g.index.count/3,720);assert.ok(a.count<g.index.count/2);
 for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);
 assert.ok(g.boundingSphere.radius<1.12);assert.ok(g.boundingSphere.radius>.95);
 assert.deepEqual(g.attributes.position.array,createGraniteGeometry().attributes.position.array);
 assert.throws(()=>createGraniteGeometry({radius:0}),RangeError);
});
