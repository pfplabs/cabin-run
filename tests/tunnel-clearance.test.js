import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMountainTunnel,createLandscapeGeometry,landscapeHeight} from '../environment.js';
import {CameraObstruction} from '../camera-collision.js';
import {roadPoint,roadOffset,TUNNEL,LAKE,WORLD} from '../engine.js';

const tunnel=createMountainTunnel();tunnel.updateMatrixWorld(true);
const meshes=[];tunnel.traverse(object=>{if(object.isMesh)meshes.push(object);});
const point=(a,offset=0,height=0)=>{const p=roadPoint(a);return new THREE.Vector3(p.x+Math.sin(a)*offset,p.y+height,p.z-Math.cos(a)*offset);};
const hits=(from,to,objects=meshes)=>{const direction=to.clone().sub(from);return new THREE.Raycaster(from,direction.clone().normalize(),.005,direction.length()).intersectObjects(objects,false);};
const radial=a=>new THREE.Vector3(Math.sin(a),0,-Math.cos(a));

// Cover a volume instead of the former center-only ray. The outer samples
// include a 2.3 m-wide jeep at either edge of the collision-safe driving lane.
test('complete 10.4 m-wide vehicle/head passage remains clear in both directions',()=>{
 for(const reverse of [false,true])for(let j=0;j<96;j++){
  const a=TUNNEL.startAngle-.008+(TUNNEL.endAngle-TUNNEL.startAngle+.016)*j/96;
  const b=a+(TUNNEL.endAngle-TUNNEL.startAngle+.016)/96;
  for(const offset of [-5.2,-4.2,-3,-1.15,0,1.15,3,4.2,5.2])for(const height of [.2,.8,1.6,2.3,3,3.5]){
   const from=point(reverse?b:a,offset,height),to=point(reverse?a:b,offset,height);
   assert.equal(hits(from,to).length,0,`Passage intrusion at angle=${a}, offset=${offset}, height=${height}, reverse=${reverse}`);
  }
 }
});

test('shoulder boulders remain outside the entire wall volume, including transformed extents',()=>{
 const shoulders=tunnel.getObjectByName('Exterior ridge shoulders'),matrix=new THREE.Matrix4(),v=new THREE.Vector3();
 let minimumOffset=Infinity;
 for(let i=0;i<shoulders.count;i++){
  shoulders.getMatrixAt(i,matrix);const position=shoulders.geometry.attributes.position;
  for(let j=0;j<position.count;j++){
   v.fromBufferAttribute(position,j).applyMatrix4(matrix);const offset=roadOffset(v.x,v.z);
   minimumOffset=Math.min(minimumOffset,Math.abs(offset));
   assert.ok(Math.abs(offset)>TUNNEL.outerHalfWidth+.5,`Rock instance ${i} intrudes to radial offset ${offset}`);
   if(i%2===0){const a=Math.atan2(v.x,WORLD.centerZ-v.z);assert.ok(v.y<roadPoint(a).y-5,'Lake-side boulder obstructs the elevated viewing band');}
  }
 }
 assert.ok(minimumOffset>12);
});

test('camera near-plane corners and complete target sight lines clear the passage in both directions',()=>{
 for(const reverse of [false,true])for(const lane of [-3.8,0,3.8]){
  const solver=new CameraObstruction({heightAt:landscapeHeight,obstacles:meshes});
  for(let j=0;j<=72;j++){
   const fraction=reverse?1-j/72:j/72,a=TUNNEL.startAngle-.025+(TUNNEL.endAngle-TUNNEL.startAngle+.05)*fraction;
   const p=point(a,lane),next=point(a+.001,lane),heading=Math.atan2(next.x-p.x,p.z-next.z)+(reverse?Math.PI:0);
   const state={phase:'jeep',x:p.x,y:p.y,z:p.z,heading},target=p.clone().add(new THREE.Vector3(0,2,0));
   const desired=target.clone().add(new THREE.Vector3(-Math.sin(heading)*18,8,Math.cos(heading)*18));
   const camera=solver.resolve({state,target,desired,dt:1/30}).clone();
   assert.ok(camera.toArray().every(Number.isFinite));assert.ok(camera.distanceTo(target)>2,'Camera should not be driven into the jeep');
   const direction=camera.clone().sub(target).normalize(),right=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0)).normalize();
   const up=new THREE.Vector3().crossVectors(right,direction).normalize();
   for(const x of [-.35,0,.35])for(const y of [-.35,0,.35]){
    const offset=right.clone().multiplyScalar(x).addScaledVector(up,y);
    assert.equal(hits(target.clone().add(offset),camera.clone().add(offset)).length,0,`Camera near-plane intrusion at ${a}, lane=${lane}, reverse=${reverse}`);
   }
  }
 }
});

test('three lake apertures cut both shells and provide actual downhill line of sight to water',()=>{
 const openings=tunnel.userData.tunnel.openings;assert.equal(openings.length,3);
 const landscape=new THREE.Mesh(createLandscapeGeometry(),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));landscape.updateMatrixWorld();
 for(const opening of openings)for(const fraction of [.15,.5,.85]){
  const a=THREE.MathUtils.lerp(opening.startAngle,opening.endAngle,fraction),from=point(a,0,2.2);
  const water=new THREE.Vector3(LAKE.x??0,.3,LAKE.z);
  assert.equal(hits(from,water).length,0,`Lake view is blocked at ${a}`);
  assert.equal(hits(from,water,[landscape]).length,0,'Rendered terrain must not hide the lake behind an aperture');
  assert.equal(hits(from,point(a,-45,2.2)).length,0,'Both the inner and outer skin must have an aperture');
  const distance=from.distanceTo(water);
  for(let d=2;d<distance;d+=2){const sample=from.clone().lerp(water,d/distance);assert.ok(sample.y>landscapeHeight(sample.x,sample.z)+.05,'Terrain blocks the actual view to the lake');}
 }
 landscape.geometry.dispose();landscape.material.dispose();
});

test('apertures have solid splayed sills, headers and jambs rather than transparent window faces',()=>{
 const reveal=tunnel.getObjectByName('Lake opening stone jambs sills and headers');assert.ok(reveal?.isMesh);
 for(const opening of tunnel.userData.tunnel.openings){
  const a=(opening.startAngle+opening.endAngle)/2,center=point(a,-8,2.2);
  assert.ok(hits(center,center.clone().add(new THREE.Vector3(0,-4,0)),[reveal]).length,'Missing sill');
  assert.ok(hits(center,center.clone().add(new THREE.Vector3(0,4,0)),[reveal]).length,'Missing header');
  assert.ok(hits(center,point(opening.startAngle-.003,-8,2.2),[reveal]).length,'Missing first jamb');
  assert.ok(hits(center,point(opening.endAngle+.003,-8,2.2),[reveal]).length,'Missing second jamb');
  for(const height of [opening.sillHeight-.15,opening.headHeight+.15])assert.ok(hits(point(a,0,height),point(a,-15,height)).length,'Stone above/below the aperture must remain solid');
 }
 for(const object of meshes){assert.equal(object.material.transparent,false);assert.equal(object.material.opacity,1);}
});

test('the continuous roof and outward wall remain physical and all tunnel geometry is finite',()=>{
 for(let j=0;j<75;j++){
  const a=THREE.MathUtils.lerp(TUNNEL.startAngle,TUNNEL.endAngle,(j+.5)/75),from=point(a,0,2);
  const wall=hits(from,from.clone().addScaledVector(radial(a),10));assert.ok(wall.length);assert.ok(wall[0].distance>5.3&&wall[0].distance<5.5);
  const roof=hits(from,from.clone().add(new THREE.Vector3(0,10,0)));assert.ok(roof.length);assert.ok(roof[0].distance>4.1&&roof[0].distance<4.5);
 }
 for(const object of meshes){
  for(const attribute of Object.values(object.geometry.attributes))assert.ok(attribute.array.every(Number.isFinite),`${object.name} has non-finite geometry`);
  if(object.isInstancedMesh)assert.ok(object.instanceMatrix.array.every(Number.isFinite));
 }
});

test('stone shell is watertight around the portals and all aperture reveals',()=>{
 const edges=new Map();
 for(const name of ['Carved tunnel interior','Continuous ridge exterior','Open tunnel portal stone','Lake opening stone jambs sills and headers','Tunnel wall foundations']){
  const geometry=tunnel.getObjectByName(name).geometry,position=geometry.attributes.position,index=geometry.index;
  const key=i=>`${position.getX(i)},${position.getY(i)},${position.getZ(i)}`;
  for(let i=0;i<(index?.count??position.count);i+=3){
   const vertices=[0,1,2].map(j=>key(index?index.getX(i+j):i+j));
   for(let j=0;j<3;j++){const edge=[vertices[j],vertices[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}
  }
 }
 for(const [edge,count] of edges)assert.equal(count,2,`Unsealed or duplicated rock edge: ${edge}`);
});
