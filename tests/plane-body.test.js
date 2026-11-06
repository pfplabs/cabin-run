import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {applyVehicleFidelity} from '../vehicle-fidelity.js';
import {applyPlaneBody} from '../plane-body.js';

test('rebuilt aircraft has open cabin, preserved controls and bounded render cost',async()=>{
 const b=fs.readFileSync(new URL('../assets/northbound.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 applyVehicleFidelity(scene);
 const plane=scene.getObjectByName('PlaneRoot'),pivots=['Propeller','PlaneAileronLeft','PlaneAileronRight','PlaneElevatorLeft','PlaneElevatorRight','PlaneRudder'];
 const preserved=pivots.map(n=>{const p=scene.getObjectByName(n);return {p,position:p.position.clone(),quaternion:p.quaternion.clone(),children:[...p.children]};});
 const fixed=plane.children.find(o=>o.isMesh&&o.material.name==='Floatplane yellow'),original=fixed.geometry;
 const exteriorTriangles=g=>{const p=g.attributes.position,a=g.index,triples=[];for(let i=0;i<a.count;i+=3){const ids=[a.getX(i),a.getX(i+1),a.getX(i+2)];if(ids.some(j=>Math.abs(p.getX(j))>1.0&&p.getY(j)>2.5)&&!ids.every(j=>Math.abs(p.getX(j))>=5.8299&&p.getY(j)>2.5&&p.getY(j)<3&&p.getZ(j)<1))triples.push(ids.join(','));}return triples;};
 const wings=exteriorTriangles(original);
 const stats=applyPlaneBody(scene);
 assert.ok(stats.removedTriangles>1500);assert.ok(stats.addedTriangles<10000);assert.equal(stats.addedBatches,6);
 assert.deepEqual(exteriorTriangles(fixed.geometry),wings,'fixed wing triangles outside replacement tips survive');
 preserved.forEach(({p,position,quaternion,children},i)=>{assert.equal(scene.getObjectByName(pivots[i]),p);assert.deepEqual(p.position,position);assert.ok(p.quaternion.equals(quaternion));assert.deepEqual(p.children,children);});
 assert.equal(plane.getObjectByName('Cockpit_glass').visible,false);
 const glass=plane.children.find(o=>o.material?.name==='Aircraft individual glazing');assert.ok(glass);assert.equal(glass.material.transmission,0);assert.equal(glass.castShadow,false);
 // A transverse ray through the upper cabin passes through two real window
 // surfaces without hitting the old opaque fuselage underneath the glass.
 plane.position.set(0,0,0);plane.rotation.set(0,0,0);scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-2,2.32,-.6),new THREE.Vector3(1,0,0),0,4);
 const visible=[];plane.traverse(o=>{if(o.isMesh&&o.visible)visible.push(o);});
 const hits=ray.intersectObjects(visible,false);assert.ok(hits.length>=2);assert.ok(hits.every(h=>h.object===glass),'upper cabin is genuinely open between panes');
 const painted=plane.children.find(o=>o.material?.name==='Aircraft enamel');painted.geometry.computeBoundingBox();assert.ok(painted.geometry.boundingBox.min.z>=-3.81);assert.ok(painted.geometry.boundingBox.max.z<=3.71);
 plane.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),o.name);assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite),o.name);}});
 assert.equal(applyPlaneBody(scene),stats);
});
