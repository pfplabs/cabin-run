/** Explicit presets. Photo retains the previous renderer's pixel cap and shadows. */
export const QUALITY_PRESETS=Object.freeze({
 fast:Object.freeze({pixelRatioCap:1,shadows:false,transmissionScale:.5}),
 balanced:Object.freeze({pixelRatioCap:1.35,shadows:true,transmissionScale:.75}),
 photo:Object.freeze({pixelRatioCap:1.6,shadows:true,transmissionScale:1}),
});
const MAP_SLOTS=['map','normalMap','bumpMap','roughnessMap','metalnessMap','aoMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap'];
export function isSettingsInput(target){return !!target?.closest?.('input,select,textarea,button,[contenteditable="true"],[data-render-settings]');}
export function createRenderQuality({renderer,scene,defaultPreset='balanced',devicePixelRatio=()=>globalThis.devicePixelRatio||1,onChange=()=>{}}){
 if(!QUALITY_PRESETS[defaultPreset])throw new RangeError('Unknown quality preset');
 let preset=defaultPreset,texturesEnabled=true;const originals=new Map();
 const slotsFor=m=>MAP_SLOTS.filter(k=>k!=='map'||!(m.alphaTest>0||m.transparent||m.alphaHash||m.userData?.keepColorMap));
 function applyMaterial(m,saved){let changed=false;for(const [slot,texture]of Object.entries(saved)){const next=texturesEnabled?texture:null;if(m[slot]!==next){m[slot]=next;changed=true;}}if(m.userData?.surfaceTexturesEnabled)m.userData.surfaceTexturesEnabled.value=texturesEnabled?1:0;if(changed)m.needsUpdate=true;}
 function register(root=scene){root.traverse(o=>{for(const m of(Array.isArray(o.material)?o.material:[o.material])){if(!m)continue;const saved=originals.get(m)||{};for(const slot of slotsFor(m))if(m[slot]?.isTexture)saved[slot]=m[slot];originals.set(m,saved);applyMaterial(m,saved);}});}
 function resize(){renderer.setPixelRatio(Math.min(Math.max(.5,devicePixelRatio()),QUALITY_PRESETS[preset].pixelRatioCap));}
 function settings(){return {preset,texturesEnabled,pixelRatio:renderer.getPixelRatio(),shadows:renderer.shadowMap.enabled,transmissionScale:renderer.transmissionResolutionScale,registeredMaterials:originals.size};}
 function setPreset(value){if(!QUALITY_PRESETS[value])throw new RangeError('Unknown quality preset');const config=QUALITY_PRESETS[value],changed=renderer.shadowMap.enabled!==config.shadows;preset=value;resize();renderer.shadowMap.enabled=config.shadows;renderer.shadowMap.needsUpdate=true;renderer.transmissionResolutionScale=config.transmissionScale;if(changed)for(const m of originals.keys())m.needsUpdate=true;onChange(settings());}
 function setTextures(value){texturesEnabled=Boolean(value);for(const [m,saved]of originals)applyMaterial(m,saved);onChange(settings());}
 function audit(){let slots=0,mismatches=0,customUniforms=0;for(const [m,saved]of originals){for(const [slot,original]of Object.entries(saved)){slots++;if(m[slot]!== (texturesEnabled?original:null))mismatches++;}if(m.userData?.surfaceTexturesEnabled){customUniforms++;if(m.userData.surfaceTexturesEnabled.value!==(texturesEnabled?1:0))mismatches++;}}return {slots,customUniforms,mismatches};}
 register();setPreset(preset);return {register,setPreset,setTextures,resize,settings,audit};
}
