import * as THREE from 'three';
import {Water} from './vendor/Water.js';
import {SHORELINE_GLSL} from './shoreline.js';

/** One reflection pass; no extra geometry, textures or simulation changes.
 * Low quality quarters reflection pixels while retaining per-frame camera response.
 * Shore depth is an analytical approximation of the existing sloping lake bed.
 */
export function createLakeWater({normals,sunDirection,lake,quality='high'}={}){
 const resolution=quality==='low'?512:1024;
 const water=new Water(new THREE.PlaneGeometry(2600,2600),{
  textureWidth:resolution,textureHeight:resolution,waterNormals:normals,
  sunDirection,sunColor:0xfff4e1,waterColor:0x24585d,distortionScale:1.35,fog:true
 });
 water.name='Alpine lake — depth and shore response';water.rotation.x=-Math.PI/2;
 water.userData.water={quality:quality==='low'?'low':'high',reflectionResolution:resolution,extraDrawCalls:0};
 water.material.uniforms.size.value=3.5;
 const replace=(source,from,to)=>{if(!source.includes(from))throw new Error('Water shader changed: '+from);return source.replace(from,to);};
 water.userData.surfaceTexturesNote='Ripple normal texture; reflection is preserved';
 water.material.userData.surfaceTexturesEnabled={value:1};
 water.material.uniforms.surfaceTexturesEnabled=water.material.userData.surfaceTexturesEnabled;
 let shader='uniform float surfaceTexturesEnabled;\n'+SHORELINE_GLSL+water.material.fragmentShader;
 shader=replace(shader,'vec4 getNoise( vec2 uv ) {','vec4 getNoise( vec2 uv ) { if(surfaceTexturesEnabled<.5)return vec4(0.,0.,1.,0.);');
 shader=replace(shader,'vec4 noise = getNoise( worldPosition.xz * size );',`
  vec2 shoreUV=vec2(worldPosition.x/${lake.rx.toFixed(1)},(worldPosition.z-${lake.z.toFixed(1)})/${lake.rz.toFixed(1)});
  float shoreRadius=length(shoreUV)/lakeShoreScale(atan(shoreUV.x,-shoreUV.y));
  float shoreMeters=(1.-shoreRadius)*${Math.min(lake.rx,lake.rz).toFixed(1)};
  float depth=3.*smoothstep(-1.1,3.4,shoreMeters);
  float viewDistance=length(eye-worldPosition.xyz);
  float detail=1.-smoothstep(100.,550.,viewDistance);
  vec4 noise = getNoise( worldPosition.xz * size );
  // Wind ripples calm in sheltered shallows and filter out in distant views.
  float ripple=mix(.26,.68,detail)*mix(.45,1.,smoothstep(0.,2.5,depth));
 `);
 shader=replace(shader,'vec3( 1.5, 1.0, 1.5 )','vec3( ripple, 1.0, ripple )');
 shader=replace(shader,'100.0, 2.0, 0.5','95.0, 0.55, 0.30');
 shader=replace(shader,'1.0 / distance','1.0 / max(distance,1.0)');
 shader=replace(shader,'vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',`
  // Beer-Lambert-style bed attenuation: warm stones become cool green with depth.
  vec3 transmission=exp(-vec3(.85,.38,.27)*depth);
  float bedVariation=.96+.04*sin(worldPosition.x*.71+sin(worldPosition.z*.43));
  vec3 bed=vec3(.24,.225,.17)*bedVariation;
  vec3 body=mix(waterColor*.82,bed,transmission);
  vec3 scatter=body*(.70+.30*max(0.,dot(surfaceNormal,eyeDirection)));
 `);
 water.material.fragmentShader=shader;
 return water;
}
