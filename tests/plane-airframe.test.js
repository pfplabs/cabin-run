import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {applyVehicleFidelity} from '../vehicle-fidelity.js';
import {applyPlaneBody} from '../plane-body.js';
import {applyPlaneAirframe} from '../plane-airframe.js';

test('airframe has symmetric bounded tips, finite geometry and unchanged animated meshes',async()=>{
 const b=fs.readFileSync(new URL('../assets/northbound.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 applyVehicleFidelity(scene);
 const plane=scene.getObjectByName('PlaneRoot');
 const moving=[];for(const name of ['Propeller','PlaneAileronLeft','PlaneAileronRight','PlaneElevatorLeft','PlaneElevatorRight','PlaneRudder'])scene.getObjectByName(name).traverse(o=>{if(o.isMesh)moving.push([o,o.geometry,o.parent]);});
 applyPlaneBody(scene);
 const stats=plane.userData.airframeFidelity;
 assert.ok(stats.retiredTriangles>100);assert.ok(stats.addedTriangles<7500);assert.equal(stats.addedBatches,6);
 for(const [mesh,geometry,parent] of moving){assert.equal(mesh.geometry,geometry);assert.equal(mesh.parent,parent);}
 const parts=plane.children.filter(o=>o.name.startsWith('Airframe '));assert.equal(parts.length,6);
 for(const mesh of parts){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;assert.ok(b.min.x>=-6.44&&b.max.x<=6.44);assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));assert.ok(mesh.geometry.attributes.normal.array.every(Number.isFinite));}
 const cap=plane.getObjectByName('Airframe Airframe charcoal enamel');cap.geometry.computeBoundingBox();assert.ok(Math.abs(cap.geometry.boundingBox.max.x+cap.geometry.boundingBox.min.x)<.00001);
 assert.equal(plane.children.find(o=>o.material?.name==='Pine needles').visible,false);
 const count=plane.children.length;assert.equal(applyPlaneAirframe(plane),stats);assert.equal(plane.children.length,count);
 console.log('Airframe budget:',stats);
});
