import * as THREE from 'three';

// Original periodic crushed-stone surface. One tile spans two metres.
// Shared immutable maps: 4 MiB including mip levels at 512px; no new geometry.
let cached;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=(x,y)=>{x=(x%40+40)%40;y=(y%40+40)%40;let h=Math.imul(x+83,374761393)^Math.imul(y+17,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
export function createGravelMaps(size=512){
 if(!Number.isInteger(size)||size<128||size>1024||(size&(size-1)))throw new RangeError('Gravel size must be a power of two from 128 to 1024');
 const height=new Float32Array(size*size),albedo=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=x/size*40,py=y/size*40,gx=Math.floor(px),gy=Math.floor(py);let best=99,stoneX=0,stoneY=0,lx=0,ly=0;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
   const a=gx+i,b=gy+j,dx=px-a-.2-.6*hash(a,b),dy=py-b-.2-.6*hash(b,a+5),angle=hash(a+9,b)*6.28,c=Math.cos(angle),s=Math.sin(angle),u=dx*c-dy*s,v=dx*s+dy*c;
   const d=Math.max(Math.abs(u)*(.85+hash(a+2,b)*.55),Math.abs(v)*1.15,(Math.abs(u)+Math.abs(v))*.72);
   if(d<best){best=d;stoneX=a;stoneY=b;lx=u;ly=v;}
  }
  const tint=hash(stoneX+19,stoneY),edge=clamp((.49-best)/.11),cap=clamp(1-best/.65),grain=hash(x*13,y*7),i=y*size+x,k=i*4;
  // Tilted, chipped caps, with narrow recessed joints and fine mineral grit.
  height[i]=edge*(.006+cap*.012+lx*.003*(tint-.5)+ly*.003*(hash(stoneX,stoneY+11)-.5))+(grain-.5)*.00045;
  const stone=104+tint*68,base=THREE.MathUtils.lerp(63,stone,edge)+(grain-.5)*15;
  albedo[k]=base*(1.02+tint*.035);albedo[k+1]=base;albedo[k+2]=base*(.93+tint*.045);albedo[k+3]=255;
  const r=clamp(.98-edge*(.12+.14*tint)+(grain-.5)*.04);
  rough[k]=rough[k+1]=rough[k+2]=Math.round(r*255);rough[k+3]=255;
 }
 const at=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(at(x+1,y)-at(x-1,y))*size/4,dy=(at(x,y+1)-at(x,y-1))*size/4,len=Math.hypot(dx,dy,1),k=(y*size+x)*4;
  normal[k]=Math.round((.5-dx/len*.5)*255);normal[k+1]=Math.round((.5-dy/len*.5)*255);normal[k+2]=Math.round((.5+.5/len)*255);normal[k+3]=255;
 }
 const texture=(data,name,colorSpace=THREE.NoColorSpace)=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);Object.assign(t,{name,wrapS:THREE.RepeatWrapping,wrapT:THREE.RepeatWrapping,magFilter:THREE.LinearFilter,minFilter:THREE.LinearMipmapLinearFilter,generateMipmaps:true,anisotropy:4,colorSpace});t.needsUpdate=true;return t;};
 return {map:texture(albedo,'Gravel mineral albedo',THREE.SRGBColorSpace),normalMap:texture(normal,'Gravel chipped stone normals'),roughnessMap:texture(rough,'Gravel mineral roughness')};
}
export function createGravelMaterial({detail=1}={}){
 const maps=cached??=createGravelMaps();
 const material=new THREE.MeshStandardMaterial({...maps,roughness:1,metalness:0,normalScale:new THREE.Vector2(detail,detail)});
 material.name='Crushed alpine gravel';
 material.customProgramCacheKey=()=> 'gravel-depth-v1';
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`vec3 gravelBaseNormal=normal;
#include <normal_fragment_maps>
// Fade close relief before it sparkles at driving distance; mipmaps filter color.
normal=normalize(mix(gravelBaseNormal,normal,1.-smoothstep(12.,45.,length(vViewPosition))));`);
 };
 material.userData.gravel={tileMetres:2,normalFadeMetres:[12,45],sharedMaps:true,addedTriangles:0};
 return material;
}
