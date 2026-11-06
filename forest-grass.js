import * as THREE from 'three';
import {LAKE, DRIVEWAY, CABIN_BOUNDS, PARKING_APRON, lakeRadius, roadOffset} from './engine.js';
import {WATERCOURSE, streamCenter} from './waterfall-bridge.js';

export const GRASS = Object.freeze({chunkSize:32, fadeStart:38, distance:85, tuftsPerTree:28, treeLimit:1500});
const segmentDistance=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z;const t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);};
// Include blade width and maximum wind displacement in clearance margins.
export function grassAllowed(x,z,heightAt){
 if(Math.abs(roadOffset(x,z))<10 || lakeRadius(x,z)<1+3/LAKE.rz)return false;
 if(DRIVEWAY.some((b,i)=>i&&segmentDistance(x,z,DRIVEWAY[i-1],b)<6))return false;
 const p=PARKING_APRON,c=CABIN_BOUNDS;
 if(Math.abs(x-p.x)<p.width/2+2&&Math.abs(z-p.z)<p.length/2+2)return false;
 if(x>c.minX-3&&x<c.maxX+4&&z>c.minZ-3&&z<c.maxZ+5)return false;
 if(z>WATERCOURSE.mouthZ-4&&z<WATERCOURSE.headZ+14&&Math.abs(x-streamCenter(z))<16)return false;
 const y=heightAt(x,z);
 return Number.isFinite(y)&&y>.2&&y<500&&Math.abs(heightAt(x+1,z)-y)<.7&&Math.abs(heightAt(x,z+1)-y)<.7;
}
export function grassPlacements(treeLocations,heightAt){
 let seed=931;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const tufts=[];
 for(let t=0;t<Math.min(treeLocations.length/3,GRASS.treeLimit);t++){
  const tx=treeLocations[t*3],tz=treeLocations[t*3+2];
  for(let i=0;i<GRASS.tuftsPerTree;i++){
   const a=random()*Math.PI*2,r=1.2+Math.sqrt(random())*7,x=tx+Math.cos(a)*r,z=tz+Math.sin(a)*r;
   const h=.23+random()*.35,angle=random()*Math.PI*2,tint=random();
   if(grassAllowed(x,z,heightAt))tufts.push({x,y:heightAt(x,z)-.025,z,h,angle,tint});
  }
 }
 return tufts;
}
function bladeGeometry(){
 const positions=[],colors=[],indices=[];
 for(let blade=0;blade<4;blade++){
  const a=blade*2.399,dx=Math.cos(a),dz=Math.sin(a),base=positions.length/3;
  for(const [y,width,bend] of [[0,.045,0],[.55,.026,.07],[1,0,.18]]){
   for(const side of [-1,1]){positions.push(dx*width*side-dz*bend,y,dz*width*side+dx*bend);colors.push(...(y===0?[.28,.34,.14]:y<1?[.62,.70,.34]:[.83,.82,.48]));}
  }
  indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
/** Static instances; only time/camera uniforms change per frame. No shadow pass. */
export function createForestGrass(treeLocations,heightAt,{density=1}={}){
 const group=new THREE.Group();group.name='Wind grass';
 const uniforms={grassTime:{value:0},grassEye:{value:new THREE.Vector3()},grassRange:{value:new THREE.Vector2(GRASS.fadeStart,GRASS.distance)},grassWind:{value:1}};
 const material=new THREE.MeshStandardMaterial({color:0xa4ad86,vertexColors:true,roughness:1,side:THREE.DoubleSide});
 material.customProgramCacheKey=()=> 'forest-wind-grass-v1';
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   uniform float grassTime;uniform float grassWind;uniform vec3 grassEye;uniform vec2 grassRange;
  `).replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 root=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
   float lod=1.-smoothstep(grassRange.x,grassRange.y,distance(root,grassEye));
   float gust=.55+.3*sin(grassTime*1.15-root.x*.075-root.z*.048)+.15*sin(grassTime*2.6+root.z*.23);
   float bend=position.y*position.y*gust*grassWind;
   // Convert a shared world wind direction to instance local space, preserving roots.
   vec3 windLocal=normalize(transpose(mat3(instanceMatrix))*vec3(.85,0.,.52));
   transformed.xz+=windLocal.xz*bend*.32;
   transformed.y-=bend*.065;
   transformed*=lod;
  `);
 };
 const geometry=bladeGeometry(),chunks=new Map(),dummy=new THREE.Object3D(),color=new THREE.Color();
 const tufts=grassPlacements(treeLocations,heightAt);
 for(const tuft of tufts){const key=`${Math.floor(tuft.x/GRASS.chunkSize)},${Math.floor(tuft.z/GRASS.chunkSize)}`;if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(tuft);}
 for(const [key,list] of chunks){
  const mesh=new THREE.InstancedMesh(geometry,material,list.length);mesh.name=`Grass ${key}`;
  const [ix,iz]=key.split(',').map(Number);mesh.position.set((ix+.5)*GRASS.chunkSize,0,(iz+.5)*GRASS.chunkSize);
  list.forEach((p,i)=>{dummy.position.set(p.x-mesh.position.x,p.y,p.z-mesh.position.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.h);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.setHSL(.21+p.tint*.035,.22,.65+p.tint*.18);mesh.setColorAt(i,color);});
  mesh.computeBoundingSphere();mesh.boundingSphere.radius+=1;mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.capacity=list.length;group.add(mesh);
 }
 const stats=group.userData.grass={totalTufts:tufts.length,totalChunks:chunks.size,density:0,activeChunks:0,submittedTufts:0,triangles:0};
 group.setDensity=value=>{stats.density=Number.isFinite(value)?THREE.MathUtils.clamp(value,0,1):1;for(const m of group.children)m.count=Math.floor(m.userData.capacity*stats.density);};
 group.setWind=value=>{uniforms.grassWind.value=Number.isFinite(value)?THREE.MathUtils.clamp(value,0,2):1;};
 const center=new THREE.Vector3();
 group.update=(time,eye)=>{
  uniforms.grassTime.value=time;uniforms.grassEye.value.copy(eye);stats.activeChunks=stats.submittedTufts=0;
  for(const m of group.children){center.copy(m.boundingSphere.center).add(m.position);m.visible=m.count>0&&eye.distanceTo(center)-m.boundingSphere.radius<GRASS.distance;if(m.visible){stats.activeChunks++;stats.submittedTufts+=m.count;}}
  stats.triangles=stats.submittedTufts*12;return stats;
 };
 group.dispose=()=>{geometry.dispose();material.dispose();for(const m of group.children)m.dispose();};
 group.setDensity(density);return group;
}
