import * as THREE from 'three';

// Object-space finish stays attached to the aircraft during flight. Derivative
// filtering removes subpixel grain and fasteners instead of letting them shimmer.
function finish(material,kind){
 const metal=kind==='alloy';
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAircraftSkin;').replace('#include <begin_vertex>','#include <begin_vertex>\nvAircraftSkin=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vAircraftSkin;
   float aircraftHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
   float aircraftNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(aircraftHash(i),aircraftHash(i+vec3(1,0,0)),f.x),mix(aircraftHash(i+vec3(0,1,0)),aircraftHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(aircraftHash(i+vec3(0,0,1)),aircraftHash(i+vec3(1,0,1)),f.x),mix(aircraftHash(i+vec3(0,1,1)),aircraftHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec3 skinP=vAircraftSkin;
   float grainFade=1.-smoothstep(.012,.045,length(fwidth(skinP)));
   float skinGrain=(aircraftNoise(skinP*95.)-.5)*grainFade;
   float skinBroad=aircraftNoise(skinP*vec3(3.,8.,4.))-.5;
   diffuseColor.rgb*=1.+skinBroad*${metal?'.065':'.032'}+skinGrain*${metal?'.06':'.018'};
   ${metal?`// Restrained oxidation near the float waterline; no world-space swimming.
   float floatMask=step(abs(abs(skinP.x)-1.3),.36)*(1.-step(.52,skinP.y));
   float waterline=(1.-smoothstep(.10,.33,skinP.y))*floatMask;
   diffuseColor.rgb*=1.-waterline*(.08+.045*skinBroad);`:''}
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor+skinGrain*${metal?'.16':'.07'}+skinBroad*.035,.15,.86);
  `);
 };
 material.customProgramCacheKey=()=>`aircraft-skin-v1-${kind}`;
 material.needsUpdate=true;
}
export function applyPlaneSkin(plane){
 if(plane.userData.skinFinish)return plane.userData.skinFinish;
 const cache=new Map(),stats={materials:0};
 plane.traverse(o=>{
  if(!o.isMesh)return;
  const original=o.material,name=original.name||'';
  const kind=/Aircraft enamel|Floatplane yellow/.test(name)?'paint':/Aluminium|aluminium|brushed alloy|brushed hardware/.test(name)?'alloy':null;
  if(!kind)return;
  if(!cache.has(original)){
   let m=original.clone();
   if(kind==='paint'){
    if(!m.isMeshPhysicalMaterial){m=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(m,original);}
    m.color.set(0xd8ac35);m.metalness=.035;m.roughness=.28;m.clearcoat=.7;m.clearcoatRoughness=.21;
   }else{m.roughness=.34;m.metalness=.78;}
   finish(m,kind);cache.set(original,m);stats.materials++;
  }
  o.material=cache.get(original);
 });
 plane.userData.skinFinish=stats;return stats;
}
