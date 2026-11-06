import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyHeroMaterials} from '../hero-materials.js';
function mesh(name,parent){const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshPhysicalMaterial({name}));parent.add(m);return m;}
test('hero finishes retain roots and give glass physical transmission without alpha darkening',()=>{
 const root=new THREE.Group(),jeep=new THREE.Group();jeep.name='JeepRoot';root.add(jeep);
 const cabin=mesh('Lake blue glazing',root),glass=mesh('Lake blue glazing',jeep),paint=mesh('Graphite jeep paint',jeep);
 const before=jeep.children.slice();applyHeroMaterials(root);
 assert.equal(cabin.material.opacity,1);assert.equal(cabin.material.transparent,false);
 assert.ok(cabin.material.transmission>glass.material.transmission);
 assert.equal(paint.material.clearcoat,.92);assert.deepEqual(jeep.children,before);
});
test('cedar grain has distance filtering and metre-scaled elevation orientation',()=>{
 const root=new THREE.Group(),cedar=mesh('Honey cedar',root);applyHeroMaterials(root);
 const shader={vertexShader:'#include <common>\n#include <worldpos_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};
 cedar.material.onBeforeCompile(shader);
 assert.match(shader.vertexShader,/modelMatrix/);assert.match(shader.fragmentShader,/fwidth/);
 assert.match(shader.fragmentShader,/face.x>face.z/);assert.equal(cedar.material.bumpScale,.018);
});
test('wheel rubber remains matte and shared materials are cached without touching source',()=>{
 const root=new THREE.Group(),wheel=new THREE.Group();wheel.name='JeepWheelLeftFront';root.add(wheel);
 const a=mesh('Rubber and cabin trim',wheel),b=mesh('unused',wheel);b.material=a.material;
 const source=a.material;applyHeroMaterials(root);
 assert.equal(a.material,b.material);assert.notEqual(a.material,source);assert.equal(a.material.roughness,.94);
});
test('cabin practicals stay modest and create no extra shadow maps',()=>{
 const root=new THREE.Group();applyHeroMaterials(root);applyHeroMaterials(root);
 const lights=root.getObjectByName('Cabin practical lighting');
 assert.equal(root.children.filter(o=>o.name===lights.name).length,1);
 assert.equal(lights.children.length,3);
 for(const light of lights.children){assert.equal(light.castShadow,false);assert.equal(light.decay,2);assert.ok(light.intensity<=48);}
});
