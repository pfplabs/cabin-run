import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLandscapeGeometry,createMountainTunnel,createSandbarGeometry,createLakeDetails} from '../environment.js';
import {roadPoint,terrainHeight,LAKE,WORLD,TUNNEL,PARKING,DRIVEWAY,lakeRadius,roadRadius} from '../engine.js';

test('expanded shoreline mesh faces upward and remains inside a modest triangle budget',()=>{
 const g=createLandscapeGeometry();assert.ok(g.index.count/3<65000);
 assert.ok(g.attributes.position.array.every(Number.isFinite));
 for(let i=0;i<g.attributes.normal.count;i++)assert.ok(g.attributes.normal.getY(i)>=-.001);
 g.computeBoundingBox();assert.ok(g.boundingBox.max.x>600&&g.boundingBox.min.x<-600);
 assert.ok(g.boundingBox.max.z>WORLD.centerZ+600);
});
test('tunnel has an open driving passage, solid side walls, and a roof',()=>{
 const group=createMountainTunnel();group.updateMatrixWorld(true);
 const meshes=[];group.traverse(o=>{if(o.isMesh)meshes.push(o);});
 for(let i=0;i<18;i++){
  const a=TUNNEL.startAngle+(TUNNEL.endAngle-TUNNEL.startAngle)*(i+.1)/18,b=TUNNEL.startAngle+(TUNNEL.endAngle-TUNNEL.startAngle)*(i+.9)/18;
  const p=roadPoint(a),q=roadPoint(b),start=new THREE.Vector3(p.x,p.y+1.2,p.z),end=new THREE.Vector3(q.x,q.y+1.2,q.z),d=end.clone().sub(start);
  const ray=new THREE.Raycaster(start,d.clone().normalize(),.01,d.length());assert.equal(ray.intersectObjects(meshes).length,0,`Passage obstructed at segment ${i}`);
 }
 const a=(TUNNEL.startAngle+TUNNEL.endAngle)/2,p=roadPoint(a),center=new THREE.Vector3(p.x,p.y+1.1,p.z);
 const side=new THREE.Raycaster(center,new THREE.Vector3(Math.sin(a),0,-Math.cos(a)),.01,8).intersectObjects(meshes);
 assert.ok(side.length&&side[0].distance>TUNNEL.innerHalfWidth-.3&&side[0].distance<TUNNEL.innerHalfWidth+.3,'Side wall must be real geometry');
 const roof=new THREE.Raycaster(center,new THREE.Vector3(0,1,0),.01,10).intersectObjects(meshes);
 assert.ok(roof.length&&roof[0].distance>5&&roof[0].distance<6,'Roof must cover the passage');
});
test('sandbar remains low among the north-shore rocks and clear of the dock approach',()=>{
 const g=createSandbarGeometry();g.computeBoundingBox();const b=g.boundingBox;
 assert.ok(b.min.x>25&&b.max.x<70);assert.ok(b.max.y<.35&&b.min.y<0);
 assert.ok(b.max.z<40);assert.ok(g.attributes.position.array.every(Number.isFinite));
});
test('parking bays and connecting cabin apron are on reachable land',()=>{
 assert.equal(PARKING.length,3);const entry=DRIVEWAY.at(-3);
 for(const bay of PARKING){
  assert.ok(bay.width>4&&bay.length>6);
  for(let t=0;t<=1;t+=.025){const x=entry.x+(bay.x-entry.x)*t,z=entry.z+(bay.z-entry.z)*t;assert.ok(lakeRadius(x,z)>1.035);assert.ok(roadRadius(x,z)<1.14);assert.ok(x<-4.5);assert.ok(Math.abs(terrainHeight(x,z)-1.1)<.25);}
 }
});
test('shore rocks and reed clusters are instanced and finite',()=>{
 const group=createLakeDetails();assert.equal(group.children.length,2);
 for(const mesh of group.children){assert.ok(mesh.isInstancedMesh);assert.ok(mesh.count>100);assert.ok(mesh.instanceMatrix.array.every(Number.isFinite));}
});

test('rendered ground matches driveway and parking height without burying the jeep',()=>{
 const geometry=createLandscapeGeometry(),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
 const ray=new THREE.Raycaster(),points=[];
 for(let i=0;i<180;i++){
  const t=i/180*(DRIVEWAY.length-1),n=Math.floor(t),a=DRIVEWAY[n],b=DRIVEWAY[n+1];
  points.push({x:a.x+(b.x-a.x)*(t-n),z:a.z+(b.z-a.z)*(t-n)});
 }
 for(const bay of PARKING)for(const dx of [-1,0,1])for(const dz of [-2,0,2])points.push({x:bay.x+dx,z:bay.z+dz});
 for(const p of points){
  ray.set(new THREE.Vector3(p.x,100,p.z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];
  assert.ok(hit,'Ground must exist under driveway and parking');
  const error=hit.point.y-terrainHeight(p.x,p.z);
  assert.ok(error<.06&&error>-.12,`Ground mismatch ${error.toFixed(3)} m at ${p.x},${p.z}`);
 }
 geometry.dispose();mesh.material.dispose();
});
