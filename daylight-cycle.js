import * as THREE from 'three';

/** Art-directed endless daylight, not a real-world astronomical simulation.
 * Integration:
 * 1. Remove HDRLoader/background setup. Set scene.background = null.
 * 2. Add a back-facing sphere with createSkyMaterial(); frustumCulled = false.
 *    Its shader ignores translation and writes far depth, so it is an infinite
 *    natural sky even with a 6000 m world. No photographic skyline is used.
 * 3. Each frame call applyDaylight(daylightStateAt(visual), {skyMaterial, sun,
 *    sunDirection, ambient, water, renderer, scene}). Keep sun.target tracking
 *    the vehicle separately; this helper preserves that target.
 * 4. For indirect reflections, use PMREMGenerator.fromScene on a SEPARATE scene
 *    containing only another sphere sharing this sky material. Refresh at most
 *    every 10–20 seconds (not every frame), dispose the previous PMREM target,
 *    and assign its texture to scene.environment. Do not keep the urban HDR.
 *    Shadow cascades/map coverage and PMREM lifetime remain caller-owned.
 * No browser or GPU is needed to compute or test the daylight state.
 */
export const DAYLIGHT_CYCLE_SECONDS=600;
export const DAYLIGHT_LIMITS=Object.freeze({minElevation:11,maxElevation:55,minAmbient:1.0,minExposure:1.04,minSunIntensity:2.65,minEnvironmentIntensity:.85});
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
const colour=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
const smooth=t=>t*t*(3-2*t);
/** All returned colours are authored in linear RGB. Directions are unit length. */
export function daylightStateAt(seconds){
 if(!Number.isFinite(seconds))throw new TypeError('Daylight time must be finite seconds.');
 const time=((seconds%DAYLIGHT_CYCLE_SECONDS)+DAYLIGHT_CYCLE_SECONDS)%DAYLIGHT_CYCLE_SECONDS;
 const phase=TAU*time/DAYLIGHT_CYCLE_SECONDS;
 const elevation=33+22*Math.sin(phase-.3);
 const day=smooth((elevation-11)/44),golden=1-day;
 const azimuth=-.829+phase,altitude=elevation*Math.PI/180;
 return {
  elevationDegrees:elevation,
  sunDirection:[Math.sin(azimuth)*Math.cos(altitude),Math.sin(altitude),Math.cos(azimuth)*Math.cos(altitude)],
  sunColor:colour([1,.79,.53],[1,.96,.88],day),
  sunIntensity:lerp(2.65,3.2,day),
  ambientIntensity:lerp(1.08,1.0,day),
  ambientSky:colour([.70,.76,.82],[.67,.80,.96],day),
  ambientGround:colour([.31,.27,.21],[.29,.32,.26],day),
  exposure:lerp(1.13,1.04,day),
  environmentIntensity:lerp(.94,.85,day),
  horizon:colour([.78,.61,.45],[.56,.70,.82],day),
  zenith:colour([.13,.27,.46],[.105,.29,.56],day),
  belowHorizon:colour([.30,.29,.25],[.29,.34,.36],day),
  cloudColor:colour([.94,.77,.57],[.91,.94,.97],day),
  glowColor:colour([1,.46,.17],[.55,.60,.65],day),
  fogColor:colour([.62,.61,.56],[.57,.68,.75],day),
  golden,
  // Closed-loop advection avoids a texture jump when the lighting cycle wraps.
  cloudOffset:[Math.cos(phase)*.32,Math.sin(phase)*.23],
  cloudCoverage:lerp(.48,.43,day)
 };
}
export function createSkyMaterial(){
 const state=daylightStateAt(0);
 const material=new THREE.ShaderMaterial({
  name:'Natural endless-daylight sky',side:THREE.BackSide,depthWrite:false,depthTest:true,fog:false,toneMapped:true,
  uniforms:{
   sunDirection:{value:new THREE.Vector3()},horizon:{value:new THREE.Color()},zenith:{value:new THREE.Color()},
   belowHorizon:{value:new THREE.Color()},cloudColor:{value:new THREE.Color()},glowColor:{value:new THREE.Color()},
   sunColor:{value:new THREE.Color()},golden:{value:0},cloudOffset:{value:new THREE.Vector2()},cloudCoverage:{value:.45}
  },
  vertexShader:`
   varying vec3 vSkyDirection;
   void main(){
    vSkyDirection=mat3(modelMatrix)*position;
    vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*vSkyDirection,1.);
    gl_Position=clip.xyww;
   }
  `,
  fragmentShader:`
   precision highp float;
   varying vec3 vSkyDirection;
   uniform vec3 sunDirection,horizon,zenith,belowHorizon,cloudColor,glowColor,sunColor;
   uniform vec2 cloudOffset;
   uniform float golden,cloudCoverage;
   float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
   void main(){
    vec3 d=normalize(vSkyDirection);float height=max(d.y,0.);
    vec3 sky=mix(horizon,zenith,pow(height,.48));
    sky=mix(sky,belowHorizon,smoothstep(0.,.45,-d.y));
    float alignment=max(dot(d,sunDirection),0.);
    sky+=glowColor*pow(alignment,10.)*(.11+golden*.18);
    sky+=sunColor*pow(alignment,140.)*.16;
    // A small, antialiased solar disc, not a giant painted glow or flat sprite.
    float edge=max(fwidth(alignment)*1.2,.000006);
    float disk=smoothstep(.99994-edge,.99996+edge,alignment);
    // Sparse layered cloud fields use four value-noise samples, no texture assets.
    vec2 uv=d.xz/(height+.32)*2.6+cloudOffset;
    float cloud=noise(uv)*.57+noise(uv*2.07+vec2(5.2,1.3))*.27+noise(uv*4.13)*.12+noise(uv*8.3)*.04;
    float coverage=smoothstep(.56-cloudCoverage*.10,.77-cloudCoverage*.10,cloud);
    coverage*=smoothstep(.025,.20,height);
    vec3 cloudLight=cloudColor*(.83+.17*pow(alignment,4.));
    sky=mix(sky,cloudLight,coverage*.78);
    sky+=sunColor*disk*5.*(1.-coverage*.86);
    gl_FragColor=vec4(max(sky,vec3(.08)),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `
 });
 applyDaylight(state,{skyMaterial:material});return material;
}
/** Apply one coherent state. Optional targets allow independent integration/tests.
 * Does not create lights, alter fog density, move the shadow target or refresh
 * PMREM. sunDirection is the shared mutable vector used by existing game code.
 */
export function applyDaylight(state,{skyMaterial,sun,sunDirection,ambient,water,renderer,scene,sunDistance=110}={}){
 if(sunDirection)sunDirection.fromArray(state.sunDirection);
 if(skyMaterial){
  const u=skyMaterial.uniforms;u.sunDirection.value.fromArray(state.sunDirection);
  for(const name of ['horizon','zenith','belowHorizon','cloudColor','glowColor','sunColor'])u[name].value.fromArray(state[name]);
  u.golden.value=state.golden;u.cloudCoverage.value=state.cloudCoverage;u.cloudOffset.value.fromArray(state.cloudOffset);
 }
 if(sun){
  sun.color.fromArray(state.sunColor);sun.intensity=state.sunIntensity;
  sun.position.set(...state.sunDirection).multiplyScalar(sunDistance).add(sun.target.position);
 }
 if(ambient){ambient.color.fromArray(state.ambientSky);ambient.groundColor.fromArray(state.ambientGround);ambient.intensity=state.ambientIntensity;}
 const waterUniforms=water?.material?.uniforms;
 if(waterUniforms?.sunDirection)waterUniforms.sunDirection.value.fromArray(state.sunDirection);
 if(waterUniforms?.sunColor)waterUniforms.sunColor.value.fromArray(state.sunColor);
 if(renderer)renderer.toneMappingExposure=state.exposure;
 if(scene){if(scene.fog)scene.fog.color.fromArray(state.fogColor);scene.environmentIntensity=state.environmentIntensity;}
 return state;
}
