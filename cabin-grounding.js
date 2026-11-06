import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {createGravelMaterial} from './gravel-material.js';
import {PARKING,terrainHeight} from './engine.js';

/** Small built landscape around the existing level cabin and parking apron.
 * All driveable surfaces stay flush; raised details sit beyond the usable bays.
 * No height-field, collision, vehicle, asset or tree-location changes.
 */
export function createCabinGrounding(heightAt=terrainHeight){
 const group=new THREE.Group();group.name='Cabin foundation and arrival landscape';
 const batches={stone:[],timber:[],gravel:[],foliage:[]};
 const stone=new THREE.MeshStandardMaterial({color:0x777b70,roughness:.95,vertexColors:true});
 const timber=new THREE.MeshStandardMaterial({color:0x655548,roughness:.92,vertexColors:true});
 const gravel=createGravelMaterial();gravel.color.set(0x999b8e);
 const foliage=new THREE.MeshStandardMaterial({color:0x546045,roughness:1,vertexColors:true});
 const materials={stone,timber,gravel,foliage};
 let seed=427;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const paint=(g,tint)=>{const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i++)colors[i]=tint;g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g;};
 function box(kind,x,z,width,depth,height,base=heightAt(x,z),turn=0){
  const g=new THREE.BoxGeometry(width,height,depth);g.rotateY(turn);g.translate(x,base+height/2,z);
  paint(g,.88+random()*.24);batches[kind].push(g);
 }
 function bed(x0,x1,z0,z1){
  const nx=Math.ceil((x1-x0)/.7),nz=Math.ceil((z1-z0)/.7),g=new THREE.PlaneGeometry(x1-x0,z1-z0,nx,nz);g.rotateX(-Math.PI/2);g.translate((x0+x1)/2,0,(z0+z1)/2);
  const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,heightAt(x,z)+.022);uv.setXY(i,x/2,z/2);}
  g.computeVertexNormals();batches.gravel.push(g);
 }
 // Drip/drainage margins expose a deliberate junction between grass and plinth.
 bed(-3.8,-2.7,-26.6,-6.35);bed(23.8,25,-26.6,-6.35);bed(-3.8,25,-27.5,-26.4);
 // The front deck is supported, not a wafer floating just above the lawn.
 for(const x of [-2.8,5.3,12,23.7])box('stone',x,-4.22,.43,.43,.38,1.08);
 for(const [a,b]of[[-2.95,.25],[2.15,24]])box('timber',(a+b)/2,-2.53,b-a,.12,.30,1.14);
 // A dry stone ribbon links the parking-side pedestrian verge to the front stair.
 // Staggered joints, small colour variation and a gravel base replace a lawn gap.
 bed(-11.15,-8.85,-18.5,1.35);bed(-9.7,2.55,-.85,1.35);
 for(let row=0;row<23;row++)for(let col=0;col<2;col++){
  const x=-10.52+col*.87,z=-17.6+row*.78;
  box('stone',x,z,.82,.73,.035,heightAt(x,z)+.027);
 }
 for(let col=0;col<12;col++)for(let row=0;row<2;row++){
  const x=-8.85+col*.91,z=-.36+row*.79;
  box('stone',x,z,.86,.74,.035,heightAt(x,z)+.027);
 }
 // Entrance landing reaches the existing stair footprint without lifting it.
 box('stone',1.2,-.65,1.85,1.18,.045,heightAt(1.2,-.65)+.025);
 // Low timber bay-end restraints stay beyond the marked 7 m bay length.
 // The access aisle and full departure sweep retain their existing clear space.
 for(const bay of PARKING){
  const x=bay.x+bay.length/2+.38;
  box('timber',x,bay.z,.16,bay.width-.65,.15,heightAt(x,bay.z)+.075);
  for(const z of [bay.z-bay.width/2+.48,bay.z+bay.width/2-.48])box('stone',x,z,.25,.24,.12,heightAt(x,z)+.06);
 }
 // Set-back perimeter stones make the gravel apron feel constructed without
 // kerbing across its driveway, parking mouths, or pedestrian exit.
 for(const z of [-21.7,3.7])for(let i=0;i<9;i++)box('stone',-20.7+i*1.05,z,1,.22,.10,heightAt(-20.7+i*1.05,z)+.035);
 for(let i=0;i<21;i++)box('stone',-11.07,-20.4+i*.81,.20,.76,.075,heightAt(-11.07,-20.4+i*.81)+.025);
 // Low, open shrubs flank the arrival route. A few natural clumps give scale;
 // they never fill the parking aisle or turn the forecourt into dense forest.
 const plants=[[-6.1,-22],[-5.2,-13],[-5,-6.8],[25.6,-22],[25.7,-10],[-6.3,2.2],[5.1,-.4],[12.5,-.5],[22.5,-.6]];
 for(const [x,z]of plants){
  bed(x-.55,x+.55,z-.5,z+.5);
  for(let i=0;i<5;i++){
   const g=new THREE.IcosahedronGeometry(1,1),dx=(random()-.5)*.75,dz=(random()-.5)*.65,h=.28+random()*.30;
   g.scale(.30+random()*.13,h,.28+random()*.13);g.translate(x+dx,heightAt(x+dx,z+dz)+h*.6,z+dz);paint(g,.7+random()*.4);batches.foliage.push(g);
  }
 }
 for(const [kind,list]of Object.entries(batches)){
  const g=mergeGeometries(list);g.computeBoundingBox();g.computeBoundingSphere();
  const mesh=new THREE.Mesh(g,materials[kind]);mesh.name=`Cabin arrival ${kind}`;mesh.receiveShadow=true;mesh.castShadow=kind==='timber'||kind==='foliage';group.add(mesh);
  for(const source of list)source.dispose();
 }
 group.userData.grounding={drawCalls:group.children.length,triangles:group.children.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),parkingBays:PARKING.length,terrainChanged:false};
 return group;
}
