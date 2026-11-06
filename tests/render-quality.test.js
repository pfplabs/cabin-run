import test from 'node:test';import assert from 'node:assert/strict';
import {createRenderQuality,isSettingsInput,isPauseShortcut} from '../render-quality.js';
import {createFrameMetrics} from '../frame-metrics.js';
const texture=()=>({isTexture:true});
function setup(materials){const renderer={ratio:1,setPixelRatio(v){this.ratio=v;},getPixelRatio(){return this.ratio;},shadowMap:{enabled:true}};const scene={traverse(fn){materials.forEach(material=>fn({material}));}};return {renderer,scene};}
test('surface switch restores exact maps and preserves semantic/alpha/emissive/environment/displacement maps',()=>{
 const map=texture(),normalMap=texture(),alphaMap=texture(),displacementMap=texture(),envMap=texture(),emissiveMap=texture();
 const opaque={map,normalMap,displacementMap,envMap,emissiveMap},leaf={map,alphaMap,alphaTest:.4},sign={map,userData:{keepColorMap:true}},glass={map,transparent:true};
 const q=createRenderQuality(setup([opaque,leaf,sign,glass]));for(let i=0;i<4;i++){q.setTextures(false);assert.equal(opaque.map,null);assert.equal(opaque.normalMap,null);for(const m of[leaf,sign,glass])assert.equal(m.map,map);assert.equal(leaf.alphaMap,alphaMap);assert.equal(opaque.displacementMap,displacementMap);assert.equal(opaque.envMap,envMap);assert.equal(opaque.emissiveMap,emissiveMap);q.setTextures(true);assert.equal(opaque.map,map);assert.equal(opaque.normalMap,normalMap);}
});
test('late and asynchronously refined maps respect current setting and retain identity',()=>{
 const list=[],q=createRenderQuality(setup(list));q.setTextures(false);const map=texture(),m={map};list.push(m);q.register();q.register();assert.equal(m.map,null);const normalMap=texture();m.normalMap=normalMap;q.register();q.setTextures(true);assert.equal(m.map,map);assert.equal(m.normalMap,normalMap);
});
test('custom shader surface uniforms stay registered before and after shader compilation',()=>{
 const uniform={value:1},m={userData:{surfaceTexturesEnabled:uniform}};const q=createRenderQuality(setup([m]));q.setTextures(false);assert.equal(uniform.value,0);q.register();assert.equal(uniform.value,0);q.setTextures(true);assert.equal(uniform.value,1);
});
test('selected pixel cap survives resize and Photo restores baseline settings',()=>{
 const s=setup([]);let dpr=2;const q=createRenderQuality({...s,devicePixelRatio:()=>dpr});assert.equal(s.renderer.ratio,1.35);q.setPreset('fast');assert.equal(s.renderer.ratio,1);assert.equal(s.renderer.shadowMap.enabled,false);dpr=3;q.resize();assert.equal(s.renderer.ratio,1);q.setPreset('photo');assert.equal(s.renderer.ratio,1.6);assert.equal(s.renderer.transmissionResolutionScale,1);assert.equal(s.renderer.shadowMap.enabled,true);assert.throws(()=>q.setPreset('ultra'),RangeError);
});
test('settings input classification excludes gameplay hotkeys in editable controls',()=>{
 assert.equal(isSettingsInput({closest:s=>s.includes('select')}),true);assert.equal(isSettingsInput({closest:()=>null}),false);assert.equal(isSettingsInput(null),false);
});
test('full frame metrics retain nested passes, CPU timing, slow active frames and reject resume gaps',()=>{
 let clock=0;const info={autoReset:true,render:{calls:0,triangles:0},reset(){this.render.calls=0;this.render.triangles=0;}};
 const m=createFrameMetrics({info},{now:()=>clock,capacity:2});assert.equal(info.autoReset,false);let dt=m.begin(0);clock=2;m.end(dt);dt=m.begin(16);info.render.calls+=5;info.render.calls+=3;clock=5;m.end(dt);assert.equal(m.snapshot().averageCalls,8);assert.equal(m.snapshot().averageSubmissionMs,3);assert.equal(m.snapshot().estimatedFPS,62.5);assert.equal(m.snapshot().gpuTimeMs,null);dt=m.begin(5000);m.end(dt);assert.equal(m.snapshot().sampleCount,1);dt=m.begin(5200);m.end(dt);assert.equal(m.snapshot().sampleCount,2);m.reset();assert.equal(m.snapshot().sampleCount,0);m.dispose();assert.equal(info.autoReset,true);
});

test('P pauses from settings without stealing text entry, native Escape or modified shortcuts',()=>{
 const select={closest:s=>s.startsWith('textarea')?null:{}};
 for(const key of ['p','P'])assert.equal(isPauseShortcut({key,target:select}),true);
 assert.equal(isPauseShortcut({key:'Escape',target:select}),false);
 assert.equal(isPauseShortcut({key:'Escape',target:{closest:()=>null}}),true);
 for(const flag of ['repeat','isComposing','defaultPrevented','ctrlKey','metaKey','altKey'])assert.equal(isPauseShortcut({key:'p',target:select,[flag]:true}),false);
 assert.equal(isPauseShortcut({key:'p',target:{closest:()=>({})}}),false);
 for(const key of ['w','ArrowUp',' ','c','v'])assert.equal(isPauseShortcut({key,target:select}),false);
});
