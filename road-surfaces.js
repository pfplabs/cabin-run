import * as THREE from 'three';
import {terrainHeight,roadOffset,DRIVEWAY,onParkingApron} from './engine.js';

/** Dense stations make the road follow the same terrain used by the tyres. */
export function createRoadRibbonGeometry(points,width,{offset=.08,spacing=1,heightAt=terrainHeight}={}){
 const stations=[points[0]],positions=[],uv=[],indices=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/spacing));
  for(let j=1;j<=steps;j++){const t=j/steps;stations.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
 }
 let distance=0;
 for(let i=0;i<stations.length;i++){
  const p=stations[i],prev=stations[Math.max(0,i-1)],next=stations[Math.min(stations.length-1,i+1)],dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz)||1;
  if(i)distance+=Math.hypot(p.x-prev.x,p.z-prev.z);
  for(const side of [-1,1]){const x=p.x-dz/len*width/2*side,z=p.z+dx/len*width/2*side;positions.push(x,heightAt(x,z)+offset,z);uv.push(side===-1?0:width/2,distance/2);}
  if(i<stations.length-1){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export {createGravelMaterial} from './gravel-material.js';
export function isGravel(x,z){
 let driveDistance=Infinity;
 for(let i=1;i<DRIVEWAY.length;i++){const a=DRIVEWAY[i-1],b=DRIVEWAY[i],dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);driveDistance=Math.min(driveDistance,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}
 if(driveDistance<2.25)return false;
 if(driveDistance<3.7)return true;
 const d=Math.abs(roadOffset(x,z));if(d>=4.2&&d<7.5)return true;
 return onParkingApron(x,z);
}

/** Trim branch asphalt at the main-road edge, avoiding stacked junction faces. */
export function clipRibbonOutsideRoad(geometry,centerline,halfWidth){
 const position=geometry.attributes.position,uv=geometry.attributes.uv,index=geometry.index,positions=[],uvs=[];
 function distance(x,z){let best=Infinity;for(let i=1;i<centerline.length;i++){const a=centerline[i-1],b=centerline[i],dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return best-halfWidth;}
 const vertex=i=>({x:position.getX(i),y:position.getY(i),z:position.getZ(i),u:uv.getX(i),v:uv.getY(i),d:distance(position.getX(i),position.getZ(i))});
 for(let i=0;i<index.count;i+=3){const poly=[vertex(index.getX(i)),vertex(index.getX(i+1)),vertex(index.getX(i+2))],clipped=[];
  for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],insideA=a.d>=0,insideB=b.d>=0;if(insideA)clipped.push(a);if(insideA!==insideB){const t=a.d/(a.d-b.d),p={};for(const k of ['x','y','z','u','v'])p[k]=a[k]+(b[k]-a[k])*t;clipped.push(p);}}
  for(let j=1;j<clipped.length-1;j++)for(const p of [clipped[0],clipped[j],clipped[j+1]]){positions.push(p.x,p.y,p.z);uvs.push(p.u,p.v);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;
}

