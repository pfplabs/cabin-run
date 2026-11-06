import * as THREE from 'three';

const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function channelWidth(z){
 // Keep inside the existing carved gorge; expand into the lake and plunge pool.
 return 5.7+.7*Math.sin(z*.047)+.35*Math.sin(z*.113)+1.1*Math.exp(-(((z-972)/10)**2))-1.7*smooth(980,992,z);
}
export function createRiverWater({mouthZ,headZ,center,height}){
 const group=new THREE.Group(),time={value:0},p=[],uv=[],indices=[];
 // Extra stations at each bed break keep the falling sheet attached to the lip.
 const stations=[...new Set([...Array.from({length:181},(_,i)=>mouthZ+(headZ-mouthZ)*i/180),770,916,954,974,986,992,1003])].sort((a,b)=>a-b),cols=16;
 let travel=0;
 stations.forEach((z,j)=>{
  if(j)travel+=Math.hypot(z-stations[j-1],height(z)-height(stations[j-1]));
  for(let i=0;i<=cols;i++){
   const u=i/cols,edge=u*2-1,x=center(z)+edge*channelWidth(z);
   p.push(x,height(z)+.08+.035*Math.sin(z*.8+x*1.7)*(1-edge*edge),z);uv.push(u,travel/9);
   if(j<stations.length-1&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
  }
 });
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.28,roughness:.24,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 material.customProgramCacheKey=()=> 'river-cascade-v2';
 material.onBeforeCompile=shader=>{
  shader.uniforms.riverTime=time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   varying vec2 riverUv; varying vec3 riverWorld;`).replace('#include <begin_vertex>',`#include <begin_vertex>
   riverUv=uv;riverWorld=(modelMatrix*vec4(position,1.)).xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   uniform float riverTime;varying vec2 riverUv;varying vec3 riverWorld;
   float riverHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float riverNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(riverHash(i),riverHash(i+vec2(1.,0.)),f.x),mix(riverHash(i+vec2(0.,1.)),riverHash(i+vec2(1.)),f.x),f.y);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   float falling=smoothstep(976.,987.,riverWorld.z)*(1.-smoothstep(996.,1005.,riverWorld.z));
   float flow=riverUv.y+riverTime*(.38+falling*1.45);
   float broad=riverNoise(vec2(riverUv.x*12.,flow*3.));
   float fine=riverNoise(vec2(riverUv.x*53.,flow*7.));
   float strands=riverNoise(vec2(riverUv.x*38.,flow*.8));
   float impact=exp(-pow((riverWorld.z-975.)/6.,2.));
   float bank=pow(abs(riverUv.x*2.-1.),7.);
   float foam=smoothstep(.58,.85,broad*.65+fine*.35+impact*.42+falling*.3+bank*.12);
   foam=max(foam,falling*(.28+smoothstep(.25,.85,strands)*.45));
   vec3 deep=mix(vec3(.025,.115,.12),vec3(.25,.39,.37),falling),shallow=vec3(.12,.24,.20);
   diffuseColor.rgb=mix(mix(deep,shallow,bank*.7+broad*.22),vec3(.78,.86,.82),foam);
   float edge=smoothstep(0.,.055,riverUv.x)*(1.-smoothstep(.945,1.,riverUv.x));
   float mouth=smoothstep(${mouthZ.toFixed(1)},${(mouthZ+12).toFixed(1)},riverWorld.z);
   diffuseColor.a=edge*mouth*mix(.9,1.,falling);
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(.19,.72,foam);`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   // Surface ripples use the existing normal: no extra reflection or refraction pass.
   normal=normalize(normal+vec3(sin(riverUv.x*85.+flow*13.)*.055,0.,cos(flow*23.+riverUv.x*31.)*.045)*(1.-foam*.75));`);
 };
 const water=new THREE.Mesh(geometry,material);water.name='Lit river channel and accelerating cascade';water.renderOrder=2;group.add(water);
 // A single instanced draw creates short ballistic droplets at the impact shelf.
 const spray=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.045,0),new THREE.MeshStandardMaterial({color:0xcbdcda,roughness:.6}),64);
 const sprayMaterial=spray.material;
 sprayMaterial.onBeforeCompile=shader=>{
  shader.uniforms.riverTime=time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nuniform float riverTime;`).replace('#include <begin_vertex>',`#include <begin_vertex>
   float seed=instanceMatrix[3].x*13.7+instanceMatrix[3].z*3.1;
   float age=fract(riverTime*.65+seed);
   transformed.y+=4.*age*(1.-age);
   transformed.z-=age*2.4;
   transformed*=smoothstep(0.,.12,age)*(1.-smoothstep(.7,1.,age));`);
 };
 sprayMaterial.customProgramCacheKey=()=> 'river-impact-droplets-v1';
 const dummy=new THREE.Object3D();
 for(let i=0;i<64;i++){const z=972+(i%8)*.5;dummy.position.set(center(z)+Math.sin(i*2.4)*3.8,height(z)+.15,z);dummy.scale.set(1+(i%3)*.3,1.5,1);dummy.updateMatrix();spray.setMatrixAt(i,dummy.matrix);}
 spray.computeBoundingSphere();spray.boundingSphere.radius+=4;spray.name='Cascade impact spray';group.add(spray);
 group.userData.time=time;group.update=t=>{if(Number.isFinite(t))time.value=t;};return group;
}
