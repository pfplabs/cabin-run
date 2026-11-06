import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

// Isolated runtime asset layer. The source glTF, scene work, animation pivots,
// collision envelopes and control-surface meshes remain independently editable.
function removeSurface(mesh, matches) {
 const source=mesh.geometry,p=source.attributes.position,index=source.index;
 const kept=[];let removed=0;
 for(let i=0;i<(index?.count??p.count);i+=3){
  const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
  if(ids.every(j=>matches(p.getX(j),p.getY(j),p.getZ(j))))removed++;
  else kept.push(...ids);
 }
 if(removed){mesh.geometry=source.clone();mesh.geometry.setIndex(kept);mesh.geometry.computeBoundingSphere();}
 return removed;
}
function batch(parent,name,parts,material){
 const geometry=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
 const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;
 parent.add(mesh);for(const g of parts)g.dispose();return mesh;
}
function box(size,position){return new THREE.BoxGeometry(...size).translate(...position);}
function tube(a,b,r=.014){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);return new THREE.CylinderGeometry(r,r,d.length(),8).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())).translate(...start.add(end).multiplyScalar(.5).toArray());}
function floatHull(x){
 // Hard chines, raised bow and an actual planing step replace balloon floats.
 // Dimensions retain the source pontoons' 6.4m length and .70m beam.
 const stations=[[-3.45,.025,.18,.24],[-3.05,.20,-.015,.41],[-2.3,.32,-.12,.46],[-.45,.35,-.16,.46],[.2,.34,-.16,.46],[.22,.34,-.035,.46],[1.6,.27,.02,.43],[2.55,.16,.12,.35],[2.95,.07,.20,.29]];
 const verts=[],indices=[];
 for(const [z,w,keel,deck] of stations)for(const [xx,y] of [[0,keel],[-w,keel+.11],[-w,deck-.065],[-w*.76,deck],[w*.76,deck],[w,deck-.065],[w,keel+.11]])verts.push(x+xx,y,z);
 const count=7;
 for(let j=0;j<stations.length-1;j++)for(let i=0;i<count;i++){const a=j*count+i,b=j*count+(i+1)%count,c=b+count,d=a+count;indices.push(a,d,b,b,d,c);}
 for(let i=1;i<count-1;i++){indices.push(0,i,i+1);const o=(stations.length-1)*count;indices.push(o,o+i+1,o+i);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);
 // Flat normal per chine; avoids smoothing the step back into an ellipsoid.
 const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();return flat;
}
export function applyVehicleFidelity(root){
 if(root.userData.vehicleFidelity)return root.userData.vehicleFidelity;
 const jeep=root.getObjectByName('JeepRoot'),plane=root.getObjectByName('PlaneRoot');
 if(!jeep||!plane)throw new Error('Vehicle fidelity requires JeepRoot and PlaneRoot');
 const stats={removedFloatTriangles:0,removedSpareTriangles:0,addedDraws:0,addedTriangles:0};
 const alloy=new THREE.MeshStandardMaterial({name:'Vehicle brushed alloy',color:0xaeb8b9,metalness:.82,roughness:.36});
 const rubber=new THREE.MeshStandardMaterial({name:'Vehicle moulded rubber',color:0x202321,roughness:.91});
 const trim=new THREE.MeshStandardMaterial({name:'Vehicle satin hardware',color:0x303a38,metalness:.65,roughness:.43});
 for(const vehicle of [jeep,plane])vehicle.traverse(o=>{
  if(!o.isMesh)return;
  const m=o.material;
  if(/jeep paint|Floatplane yellow/.test(m.name)){
   const paint=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(paint,m);
   paint.metalness=.12;paint.roughness=.3;paint.clearcoat=.8;paint.clearcoatRoughness=.19;o.material=paint;
  }
 });
 const planeMetal=plane.children.find(o=>o.isMesh&&o.material.name==='Aluminium');
 if(planeMetal)stats.removedFloatTriangles=removeSurface(planeMetal,(x,y,z)=>[-1.3,1.3].some(cx=>Math.abs(((x-cx)/.35)**2+((y-.16)/.32)**2+((z+.25)/3.2)**2-1)<.0001));
 // Only replace when the source signature matches. Unknown future assets retain
 // their original geometry instead of receiving overlapping replacement hulls.
 const add=(parent,name,parts,mat)=>{const o=batch(parent,name,parts,mat);stats.addedDraws++;stats.addedTriangles+=o.geometry.attributes.position.count/3;};
 if(stats.removedFloatTriangles){
  add(plane,'Chined aluminium float hulls',[-1.3,1.3].map(floatHull),alloy);
  const seams=[];
  for(const x of [-1.3,1.3]){
   for(const z of [-2.1,-1,.1,1.15,2.1])seams.push(tube([x-.25,.467,z],[x+.25,.467,z],.007));
   for(const z of [-2.2,1.9]){seams.push(box([.10,.025,.19],[x,.475,z]));seams.push(tube([x-.085,.50,z],[x+.085,.50,z],.016));}
  }
  add(plane,'Float deck seams and cleats',seams,trim);
 }
 const jeepRubber=jeep.children.find(o=>o.isMesh&&o.material.name==='Rubber and cabin trim');
 if(jeepRubber)stats.removedSpareTriangles=removeSurface(jeepRubber,(x,y,z)=>z>=2.0299&&z<=2.3401&&Math.abs(Math.hypot(x,y-1.1)-.55)<.0001);
 if(stats.removedSpareTriangles){
  const tire=new THREE.TorusGeometry(.415,.14,12,40).translate(0,1.1,2.19),treads=[tire];
  for(let i=0;i<40;i++){const a=i*Math.PI/20;treads.push(new THREE.BoxGeometry(.082,.038,.25).rotateZ(a).translate(-Math.sin(a)*.552,1.1+Math.cos(a)*.552,2.19));}
  add(jeep,'Matching all terrain spare',treads,rubber);
  const rim=[new THREE.TorusGeometry(.255,.026,8,32).translate(0,1.1,2.34),new THREE.CylinderGeometry(.09,.09,.1,16).rotateX(Math.PI/2).translate(0,1.1,2.35)];
  for(let i=0;i<6;i++){const a=i*Math.PI/3;rim.push(tube([Math.cos(a)*.08,1.1+Math.sin(a)*.08,2.34],[Math.cos(a)*.24,1.1+Math.sin(a)*.24,2.34],.027));}
  add(jeep,'Spare alloy wheel',rim,alloy);
 }
 // Body panel shut lines give the large uninterrupted door panels a real scale.
 const lines=[];
 for(const x of [-1.057,1.057]){
  for(const z of [-.73,.94])lines.push(tube([x,.92,z],[x,1.52,z],.009));
  lines.push(tube([x,.92,-.73],[x,.92,.94],.009));
 }
 add(jeep,'Door panel shut lines',lines,trim);
 root.userData.vehicleFidelity=stats;return stats;
}
