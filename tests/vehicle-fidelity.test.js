import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {applyVehicleFidelity} from '../vehicle-fidelity.js';

test('vehicle replacement preserves animated pivots, envelopes, source assets and budget',async()=>{
 const bytes=fs.readFileSync(new URL('../assets/northbound.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const names=['JeepRoot','PlaneRoot','Propeller','PlaneAileronLeft','PlaneAileronRight','PlaneElevatorLeft','PlaneElevatorRight','PlaneRudder','JeepWheelLeftFront','JeepWheelRightRear'];
 const nodes=names.map(n=>scene.getObjectByName(n)),transforms=nodes.map(o=>o.matrix.clone());
 const geometry=new Map();scene.traverse(o=>{if(o.isMesh)geometry.set(o,o.geometry);});
 const stats=applyVehicleFidelity(scene);
 assert.equal(stats.removedFloatTriangles,1152);assert.equal(stats.removedSpareTriangles,60);
 assert.ok(stats.addedDraws<=5);assert.ok(stats.addedTriangles-stats.removedFloatTriangles-stats.removedSpareTriangles<2000);
 names.forEach((n,i)=>{assert.equal(scene.getObjectByName(n),nodes[i]);assert.deepEqual(nodes[i].matrix,transforms[i]);});
 for(const [o,g] of geometry)if(o.geometry!==g)assert.ok(g.index.count>o.geometry.index.count,'source geometry remains intact');
 scene.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));}});
 const hull=scene.getObjectByName('Chined aluminium float hulls');hull.geometry.computeBoundingBox();
 const bounds=hull.geometry.boundingBox;
 assert.ok(bounds.min.z>=-3.451&&bounds.max.z<=2.951);assert.ok(bounds.min.y>=-.161&&bounds.max.y<=.461);
 // Top hull facets face outwards, rather than disappearing under backface culling.
 const p=hull.geometry.attributes.position,n=hull.geometry.attributes.normal;
 let upwardDeck=0;for(let i=0;i<p.count;i++)if(p.getY(i)>.45&&n.getY(i)>.9)upwardDeck++;
 assert.ok(upwardDeck>12);
 const children=scene.getObjectByName('PlaneRoot').children.length;
 assert.equal(applyVehicleFidelity(scene),stats);assert.equal(scene.getObjectByName('PlaneRoot').children.length,children);
});
