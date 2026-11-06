import * as THREE from 'three';

/** Original procedural surfaces. World units are metres; no downloaded assets.
 * Integration: replace existing terrain/tunnel onBeforeCompile callbacks with
 * these materials. Pass the existing licensed grass texture to terrain.
 * Materials share one small immutable packed texture; do not dispose that
 * texture when disposing an individual material. No geometry displacement is
 * done in shaders, so tunnels, shadows and collision clearances stay unchanged.
 */
let sharedSurface;
const clamp=x=>Math.max(0,Math.min(1,x));
const fade=x=>x*x*(3-2*x);
function hash(x,y,period){
 x=((x%period)+period)%period;y=((y%period)+period)%period;
 let h=Math.imul(x+37,374761393)^Math.imul(y+101,668265263);
 h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;
}
function noise(x,y,period){
 const ix=Math.floor(x),iy=Math.floor(y),fx=fade(x-ix),fy=fade(y-iy);
 const a=THREE.MathUtils.lerp(hash(ix,iy,period),hash(ix+1,iy,period),fx);
 const b=THREE.MathUtils.lerp(hash(ix,iy+1,period),hash(ix+1,iy+1,period),fx);
 return THREE.MathUtils.lerp(a,b,fy);
}
export function createProceduralSurfaceTexture(size=256){
 if(!Number.isInteger(size)||size<16||size>1024||(size&(size-1)))throw new RangeError('Surface texture size must be a power of two between 16 and 1024.');
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size;
  const broad=noise(u*8,v*8,8),medium=noise(u*32+7,v*32+11,32),fine=noise(u*96,v*96,96);
  const values=[.7*broad+.3*medium,fine,.54*medium+.30*fine+.16*broad,.55*medium+.45*fine];
  for(let k=0;k<4;k++)data[(y*size+x)*4+k]=Math.round(clamp(values[k])*255);
 }
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.name='Original packed mineral fields';
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
 t.generateMipmaps=true;t.colorSpace=THREE.NoColorSpace;t.needsUpdate=true;return t;
}
const shared=()=>sharedSurface??=createProceduralSurfaceTexture();
const common=`
varying vec3 vLMWorld;
varying vec3 vLMWorldNormal;
uniform sampler2D lmSurface;
uniform float lmRelief;
vec4 lmTriplanar(vec3 p,vec3 w){
 return texture2D(lmSurface,p.yz)*w.x+texture2D(lmSurface,p.xz)*w.y+texture2D(lmSurface,p.xy)*w.z;
}
vec3 lmBumpNormal(vec3 n,float h){
 vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);
 vec3 r1=cross(dy,n),r2=cross(n,dx);
 float det=dot(dx,r1);
 vec3 gradient=sign(det)*(dFdx(h)*r1+dFdy(h)*r2);
 return normalize(max(abs(det),1e-8)*n-lmRelief*gradient);
}
`;
const fields=`
 vec3 lmWeights=pow(abs(normalize(vLMWorldNormal)),vec3(4.));
 lmWeights/=max(dot(lmWeights,vec3(1.)),.0001);
 // One 18 m tile for weathering, one 0.9 m tile for small mineral inclusions.
 vec4 lmLarge=lmTriplanar(vLMWorld/18.,lmWeights);
 vec4 lmFine=lmTriplanar(vLMWorld/.9+vec3(.19,.47,.73),lmWeights);
 float lmDistance=length(vViewPosition);
 float lmDetail=1.-smoothstep(22.,100.,lmDistance);
 float lmPhase=dot(vLMWorld,vec3(.21,2.7,.16))+(lmLarge.r-.5)*3.;
 float lmBand=sin(lmPhase)*(1.-smoothstep(.35,2.0,fwidth(lmPhase)));
 float lmWeather=smoothstep(.22,.73,lmLarge.r);
 vec3 lmRock=mix(vec3(.24,.255,.25),vec3(.38,.395,.38),lmWeather);
 lmRock*=1.+lmBand*.065+(lmFine.g-.5)*.12*lmDetail;
 float lmHeight=lmBand*.012+(lmLarge.b-.5)*.035+(lmFine.b-.5)*.006*lmDetail;
 float lmRough=clamp(.85+(lmLarge.a-.5)*.14+(lmFine.a-.5)*.08*lmDetail,.72,.97);
`;
function patch(material,{terrain=false,grassMap=null,lake={x:0,z:124,rx:156,rz:114},relief=1}={}){
 material.customProgramCacheKey=()=>`northbound-landscape-v2-${terrain?'terrain':'rock'}`;
 material.userData.landscapeSurface={kind:terrain?'terrain':'rock',worldUnits:'metres',externalTextures:grassMap?1:0};
 material.onBeforeCompile=shader=>{
  shader.uniforms.lmSurface={value:shared()};shader.uniforms.lmRelief={value:relief};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLMWorld;\nvarying vec3 vLMWorldNormal;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 lmWorld=vec4(transformed,1.);
   #ifdef USE_INSTANCING
    lmWorld=instanceMatrix*lmWorld;
   #endif
   vLMWorld=(modelMatrix*lmWorld).xyz;
   vLMWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+common+(terrain?'\nuniform sampler2D lmGrass;\nuniform vec4 lmLake;\n':''));
  let colour=fields+'\n diffuseColor.rgb*=lmRock;';
  if(terrain){
   shader.uniforms.lmGrass={value:grassMap};shader.uniforms.lmLake={value:new THREE.Vector4(lake.x??0,lake.z,lake.rx,lake.rz)};
   colour=fields+`
    // Blended rotated 6 m / 11 m ground sampling hides large repeated squares.
    vec2 lmUV=vLMWorld.xz/6.;
    vec3 lmGrassA=texture2D(lmGrass,lmUV).rgb;
    vec3 lmGrassB=texture2D(lmGrass,mat2(.8,-.6,.6,.8)*vLMWorld.xz/11.+vec2(.31,.67)).rgb;
    vec3 lmGrassColour=mix(lmGrassA,lmGrassB,.28)*mix(.93,1.08,lmLarge.r);
    // Texture-only grass detail remains subtle; mineral shader supplies relief.
    float lmSlope=1.-abs(normalize(vLMWorldNormal).y);
    float lmRockMask=smoothstep(.12,.46,lmSlope+(lmLarge.r-.5)*.14);
    float lmLakeRadius=length((vLMWorld.xz-lmLake.xy)/lmLake.zw);
    float lmShoreDistance=(lmLakeRadius-1.)*min(lmLake.z,lmLake.w);
    float lmShore=(1.-smoothstep(2.05,7.4,lmShoreDistance))*
      (1.-smoothstep(1.5,4.,vLMWorld.y));
    float lmSoil=smoothstep(.57,.78,lmLarge.r)*.28*(1.-lmRockMask);
    vec3 lmSoilColour=vec3(.25,.22,.165)*(1.+(lmFine.g-.5)*.1*lmDetail);
    vec3 lmSandColour=mix(vec3(.22,.215,.18),vec3(.43,.405,.32),smoothstep(-.05,.85,vLMWorld.y));
    vec3 lmGround=mix(lmGrassColour,lmSoilColour,lmSoil);
    lmGround=mix(lmGround,lmSandColour,lmShore);
    lmGround=mix(lmGround,lmRock,max(lmRockMask,smoothstep(260.,450.,vLMWorld.y)));
    // Snow gathers above the high snowline, with broken edges and exposed steep rock.
    float lmSnow=smoothstep(530.,650.,vLMWorld.y+(lmLarge.r-.5)*65.)*
      (1.-smoothstep(.45,.8,lmSlope));
    vec3 lmSnowColour=mix(vec3(.68,.75,.79),vec3(.91,.94,.95),lmLarge.r);
    lmGround=mix(lmGround,lmSnowColour,lmSnow);
    diffuseColor.rgb*=lmGround;
    lmHeight=mix((lmLarge.b-.5)*.012+(lmFine.b-.5)*.003*lmDetail,lmHeight,lmRockMask);
    lmRough=mix(.96,lmRough,lmRockMask);
    lmRough=mix(lmRough,.72,lmShore*(1.-smoothstep(-.1,.45,vLMWorld.y)));
    lmRough=mix(lmRough,.92,lmSnow);
    lmHeight*=1.-lmSnow*.75;
   `;
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',colour);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor*lmRough,.55,1.);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=lmBumpNormal(normal,lmHeight);');
 };
 return material;
}
/** Suitable for tunnel shell/portals and instanced shoulders or shoreline rocks.
 * Keep white tint initially: shader albedo is already in linear colour space.
 */
export function createRockMaterial({color=0xffffff,side=THREE.DoubleSide,relief=1}={}){
 return patch(new THREE.MeshStandardMaterial({color,side,roughness:1,metalness:0}),{relief});
}
/** Replaces (does not layer over) game.js's current terrain material/shader.
 * Existing vertex colours intentionally disabled: they duplicate biome tinting.
 * The grass texture's repeat property is ignored; sampling is world-space.
 */
export function createTerrainMaterial({grassMap,lake,relief=.7}={}){
 if(!grassMap?.isTexture)throw new TypeError('createTerrainMaterial requires the existing grass Texture.');
 grassMap.wrapS=grassMap.wrapT=THREE.RepeatWrapping;
 return patch(new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0}),{terrain:true,grassMap,lake,relief});
}
/** Optional smoother shoulder/shore boulders: no texture seams or faceted normals.
 * Only use for decorative rocks, not the open tunnel shell or collision mesh.
 * detail=5 is 720 triangles; detail=3 is 320 triangles in this Three.js version.
 */
export function createGraniteGeometry({radius=1,detail=5}={}){
 if(!(radius>0)||!Number.isInteger(detail)||detail<1||detail>6)throw new RangeError('Positive radius and integer detail 1–6 required.');
 const source=new THREE.IcosahedronGeometry(radius,detail),a=source.attributes.position,positions=[],indices=[],lookup=new Map();
 for(let i=0;i<a.count;i++){
  const x=a.getX(i)/radius,y=a.getY(i)/radius,z=a.getZ(i)/radius;
  const swell=1+.055*Math.sin(x*3.1+y*1.2)*Math.cos(z*2.7)+.028*Math.sin(y*5.1-z*2.3);
  const p=[x*swell*radius,y*swell*radius,z*swell*radius],key=p.map(n=>Math.round(n/radius*100000)).join(',');
  if(!lookup.has(key)){lookup.set(key,positions.length/3);positions.push(...p);}indices.push(lookup.get(key));
 }
 source.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

