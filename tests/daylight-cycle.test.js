import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DAYLIGHT_CYCLE_SECONDS,DAYLIGHT_LIMITS,daylightStateAt,createSkyMaterial,applyDaylight} from '../daylight-cycle.js';
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function compare(a,b,tolerance=1e-8){for(const key of Object.keys(a)){if(Array.isArray(a[key]))a[key].forEach((v,i)=>near(v,b[key][i],tolerance));else near(a[key],b[key],tolerance);}}
test('cycle is deterministic and periodic including negative times',()=>{
 assert.equal(DAYLIGHT_CYCLE_SECONDS,600);
 for(const t of [-610,-12,0,42,599,2300])compare(daylightStateAt(t),daylightStateAt(t+600));
 assert.deepEqual(daylightStateAt(21),daylightStateAt(21));
 for(const t of [NaN,Infinity,-Infinity])assert.throws(()=>daylightStateAt(t),TypeError);
});
test('continuous cycle wrap has no lighting, cloud or direction jumps',()=>{
 compare(daylightStateAt(600-.0001),daylightStateAt(.0001),.0001);
 // The first derivatives also agree across the wrap.
 const before=daylightStateAt(599.99),start=daylightStateAt(0),after=daylightStateAt(.01);
 for(const key of Object.keys(start)){
  const a=[before[key]].flat(),b=[start[key]].flat(),c=[after[key]].flat();
  a.forEach((v,i)=>near((b[i]-v)/.01,(c[i]-b[i])/.01,.0001));
 }
});
test('sun never sets; all directions and colours stay finite and minimum light holds',()=>{
 let min=90,max=0;
 for(let t=0;t<600;t+=.25){
  const s=daylightStateAt(t);min=Math.min(min,s.elevationDegrees);max=Math.max(max,s.elevationDegrees);
  assert.ok(s.elevationDegrees>=11-1e-8&&s.elevationDegrees<=55+1e-8);
  near(Math.hypot(...s.sunDirection),1);assert.ok(s.sunDirection[1]>=Math.sin(11*Math.PI/180)-1e-8);
  assert.ok(s.ambientIntensity>=DAYLIGHT_LIMITS.minAmbient);assert.ok(s.exposure>=DAYLIGHT_LIMITS.minExposure);
  assert.ok(s.sunIntensity>=DAYLIGHT_LIMITS.minSunIntensity);assert.ok(s.environmentIntensity>=DAYLIGHT_LIMITS.minEnvironmentIntensity);
  for(const value of Object.values(s))for(const n of [value].flat())assert.ok(Number.isFinite(n));
  for(const key of ['horizon','zenith','cloudColor','ambientSky','fogColor'])assert.ok(s[key].every(n=>n>.08));
 }
 assert.ok(min<11.001&&max>54.999);
});
test('sky CPU construction contains only procedural content and far-depth projection',()=>{
 const m=createSkyMaterial();assert.ok(m.isShaderMaterial);assert.equal(m.depthWrite,false);assert.equal(m.side,THREE.BackSide);
 assert.match(m.vertexShader,/gl_Position=clip.xyww/);assert.match(m.fragmentShader,/#include <tonemapping_fragment>/);
 assert.match(m.fragmentShader,/#include <colorspace_fragment>/);assert.doesNotMatch(m.fragmentShader,/sampler|texture2D/);
 assert.ok(!Object.values(m.uniforms).some(u=>u.value?.isTexture));
});
test('apply keeps sky, direct light, water and ambient consistent without moving target',()=>{
 const skyMaterial=createSkyMaterial(),sun=new THREE.DirectionalLight(),ambient=new THREE.HemisphereLight(),scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xffffff,.0004);
 const sunDirection=new THREE.Vector3(),renderer={toneMappingExposure:0},water={material:{uniforms:{sunDirection:{value:new THREE.Vector3()},sunColor:{value:new THREE.Color()}}}};
 sun.target.position.set(400,12,-80);const target=sun.target.position.clone();const s=daylightStateAt(350);
 assert.equal(applyDaylight(s,{skyMaterial,sun,sunDirection,ambient,water,renderer,scene,sunDistance:180}),s);
 assert.deepEqual(sun.target.position,target);near(sun.position.distanceTo(target),180);
 assert.deepEqual(sunDirection.toArray(),s.sunDirection);assert.deepEqual(water.material.uniforms.sunDirection.value.toArray(),s.sunDirection);
 assert.deepEqual(skyMaterial.uniforms.sunDirection.value.toArray(),s.sunDirection);assert.deepEqual(sun.color.toArray(),s.sunColor);
 assert.deepEqual(water.material.uniforms.sunColor.value.toArray(),s.sunColor);assert.equal(ambient.intensity,s.ambientIntensity);
 assert.equal(renderer.toneMappingExposure,s.exposure);assert.equal(scene.environmentIntensity,s.environmentIntensity);assert.equal(scene.fog.density,.0004);
 assert.doesNotThrow(()=>applyDaylight(s));
});
