import test from 'node:test';
import assert from 'node:assert/strict';
import {Object3D,PerspectiveCamera,Vector3,Quaternion,Mesh,BoxGeometry,MeshPhysicalMaterial} from 'three';
import {CockpitCamera,COCKPIT_ANCHORS} from '../cockpit-camera.js';

test('both fallback anchors follow full vehicle attitude and parent transforms',()=>{
 for(const phase of ['jeep','plane']){
  const parent=new Object3D(),root=new Object3D();parent.add(root);parent.position.set(12,5,-80);
  root.position.set(30,8,40);root.rotation.set(.22,-1.1,.3,'YXZ');
  const cockpit=new CockpitCamera({[phase]:root}),camera=new PerspectiveCamera();
  assert.equal(cockpit.apply(camera,{phase}),true);
  const expected=root.localToWorld(new Vector3().fromArray(COCKPIT_ANCHORS[phase].position));
  assert.ok(camera.position.distanceTo(expected)<1e-8);
  assert.ok(camera.quaternion.angleTo(root.getWorldQuaternion(new Quaternion()))<1e-7);
  assert.equal(root.children.length,1);
 }
});
test('authored nested anchors take precedence and glass is isolated and restored',()=>{
 const root=new Object3D(),mount=new Object3D(),anchor=new Object3D();root.add(mount);mount.add(anchor);
 anchor.name='PlaneCockpitCamera';anchor.position.set(.1,3,-1);anchor.rotation.y=.2;
 const original=new MeshPhysicalMaterial({name:'Lake blue glazing',transparent:false,opacity:.88,transmission:.3});
 const mesh=new Mesh(new BoxGeometry(),original);root.add(mesh);
 const cockpit=new CockpitCamera({plane:root}),camera=new PerspectiveCamera();
 assert.equal(cockpit.anchors.plane,anchor);cockpit.apply(camera,{phase:'plane'});
 assert.equal(mesh.material.opacity,.06);assert.equal(original.opacity,.88);
 assert.equal(mesh.material.transmission,0);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.depthWrite,false);
 cockpit.apply(camera,{phase:'plane'},false);assert.equal(mesh.material.opacity,.88);assert.equal(mesh.material.transmission,.3);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.depthWrite,true);
 assert.equal(cockpit.apply(camera,{phase:'missing'}),false);
});

test('rebuilt pickup window panes receive reversible cockpit transparency',()=>{
 const root=new Object3D(),original=new MeshPhysicalMaterial({name:'Jeep clear window panes',transparent:true,opacity:.43});
 const mesh=new Mesh(new BoxGeometry(),original);root.add(mesh);const cockpit=new CockpitCamera({jeep:root});
 cockpit.setActive('jeep');assert.equal(mesh.material.opacity,.06);assert.equal(original.opacity,.43);
 cockpit.setActive(null);assert.equal(mesh.material.opacity,.43);
});
