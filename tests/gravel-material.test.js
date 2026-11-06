import test from 'node:test';
import assert from 'node:assert/strict';
import {createGravelMaps,createGravelMaterial} from '../gravel-material.js';
test('all gravel texels are populated and tangent normals remain normalized',()=>{
 const maps=createGravelMaps(128);
 for(const texture of Object.values(maps))for(let i=3;i<texture.image.data.length;i+=4)assert.equal(texture.image.data[i],255);
 const n=maps.normalMap.image.data;
 for(let i=0;i<n.length;i+=4){const length=Math.hypot(n[i]/127.5-1,n[i+1]/127.5-1,n[i+2]/127.5-1);assert.ok(Math.abs(length-1)<.015);assert.ok(n[i+2]>127);}
 const r=maps.roughnessMap.image.data;assert.ok(Math.max(...r.filter((_,i)=>i%4===1))-Math.min(...r.filter((_,i)=>i%4===1))>30);
});
test('shoulder and apron materials reuse maps without sharing material disposal',()=>{
 const a=createGravelMaterial(),b=createGravelMaterial();assert.notEqual(a,b);assert.equal(a.map,b.map);assert.equal(a.normalMap,b.normalMap);assert.equal(a.roughnessMap,b.roughnessMap);assert.equal(a.displacementMap,null);assert.equal(a.bumpMap,null);
});
