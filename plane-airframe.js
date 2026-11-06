import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

function beam(a,b,r){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);return new THREE.CylinderGeometry(r,r,d.length(),8).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())).translate(...p.add(q).multiplyScalar(.5).toArray());}
// Closed cambered airfoil endcaps follow the source wing instead of sitting
// on it as rectangular green boxes. No vertices cross the aileron hinge gap.
function tip(side){
 const vertices=[],indices=[],N=32;
 for(const x of [5.83,5.98,6.16,6.30,6.40]){
  const t=(x-5.376)/1.024,c=1.95*(1-.17*t),dy=.02+.1*t;
  const round=Math.sqrt(Math.max(.025,1-((x-5.83)/.59)**2));
  for(const sign of [1,-1])for(let i=0;i<=N;i++){
   const u=sign===1?i/N:1-i/N;
   const thick=.12*c*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)/.2;
   vertices.push(side*x,2.7+dy+.018*1.95*Math.sin(Math.PI*u)+sign*(Math.max(.004,thick)+.008),-.15+(u-.5)*c*round);
  }
 }
 const ring=2*(N+1);
 for(let j=0;j<4;j++)for(let i=0;i<ring;i++){const a=j*ring+i,b=j*ring+(i+1)%ring;indices.push(a,b,a+ring,b,b+ring,a+ring);}
 for(let i=1;i<ring-1;i++)indices.push(0,i+1,i,4*ring,4*ring+i,4*ring+i+1);
 if(side<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
/** Add manufactured airframe shapes while retaining every physics/animation node. */
export function applyPlaneAirframe(plane){
 if(plane.userData.airframeFidelity)return plane.userData.airframeFidelity;
 const stats={addedTriangles:0,addedBatches:0,retiredTriangles:0};
 const oldTips=plane.children.find(o=>o.isMesh&&o.material.name==='Pine needles');
 if(oldTips){oldTips.visible=false;stats.retiredTriangles=(oldTips.geometry.index?.count??oldTips.geometry.attributes.position.count)/3;}
 // Retire only the fixed outer tip skin; the moving ailerons are separate nodes.
 const wing=plane.children.find(o=>o.isMesh&&o.material.name==='Floatplane yellow');
 const source=wing.geometry,p=source.attributes.position,idx=source.index,kept=[];
 for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];
  if(ids.every(j=>Math.abs(p.getX(j))>=5.8299&&p.getY(j)>2.5&&p.getY(j)<3&&p.getZ(j)<1))stats.retiredTriangles++;
  else kept.push(...ids);
 }
 wing.geometry=source.clone();wing.geometry.setIndex(kept);wing.geometry.computeBoundingSphere();
 const paint=plane.children.find(o=>o.material?.name==='Aircraft enamel').material;
 const dark=new THREE.MeshStandardMaterial({name:'Airframe charcoal enamel',color:0x203834,roughness:.34,metalness:.18,side:THREE.DoubleSide});
 const metal=new THREE.MeshStandardMaterial({name:'Airframe satin aluminium',color:0x9daaa9,roughness:.32,metalness:.8});
 const rubber=new THREE.MeshStandardMaterial({name:'Airframe anti slip and seals',color:0x202727,roughness:.87});
 const red=new THREE.MeshStandardMaterial({name:'Port navigation lens',color:0x9d130a,emissive:0x7c1004,emissiveIntensity:.35,roughness:.23});
 const green=new THREE.MeshStandardMaterial({name:'Starboard navigation lens',color:0x127b46,emissive:0x09632d,emissiveIntensity:.35,roughness:.23});
 const groups=new Map([[paint,[]],[dark,[]],[metal,[]],[rubber,[]],[red,[]],[green,[]]]);
 const add=(m,g)=>groups.get(m).push(g);
 for(const side of [-1,1]){
  add(dark,tip(side));
  add(side<0?red:green,new THREE.SphereGeometry(.055,12,8).scale(.7,.65,1.6).translate(side*6.39,2.83,-.21));
  // Streamlined lift-strut jackets over structural tubes, flattened fore/aft.
  for(const [a,b] of [[[side*.60,1.35,-.9],[side*5.2,2.65,-.7]],[[side*.585,1.3,.5],[side*5.33,2.65,.2]]]){
   const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);
   add(paint,new THREE.CylinderGeometry(.072,.072,d.length(),12).scale(.62,1,1.85).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())).translate(...p.add(q).multiplyScalar(.5).toArray()));
  }
  // Float inspection hatches, raised seams, mounting shoes and mooring eyes.
  for(const z of [-2.15,-.7,.8,1.8]){
   add(metal,new THREE.CylinderGeometry(.105,.105,.012,20).translate(side*1.3,.473,z));
   add(rubber,new THREE.TorusGeometry(.11,.004,4,20).rotateX(Math.PI/2).translate(side*1.3,.478,z));
   for(const dx of [-.065,.065])add(dark,new THREE.CylinderGeometry(.008,.008,.006,6).translate(side*1.3+dx,.482,z));
  }
  for(const z of [-1.8,1.5])add(metal,new THREE.BoxGeometry(.23,.045,.24).translate(side*1.3,.48,z));
  for(const z of [-2.65,2.3])add(metal,new THREE.TorusGeometry(.055,.014,6,14).translate(side*1.3,.48,z));
  // Cowling cooling gills and countersunk fasteners; restrained at play distance.
  for(let i=0;i<5;i++)add(rubber,beam([side*.665,1.42,-2.84-i*.065],[side*.675,1.74,-2.84-i*.065],.009));
  for(const z of [-3.32,-2.77])for(let i=0;i<12;i++){const a=i*Math.PI*2/12;add(metal,new THREE.SphereGeometry(.009,6,4).translate(.714*Math.cos(a),1.6+.714*Math.sin(a),z));}
 }
 for(const [material,parts] of groups){if(!parts.length)continue;const prepared=parts.map(g=>{const p=g.index?g.toNonIndexed():g.clone();p.deleteAttribute('uv');return p;});const geometry=mergeGeometries(prepared);const mesh=new THREE.Mesh(geometry,material);mesh.name='Airframe '+material.name;mesh.castShadow=mesh.receiveShadow=true;plane.add(mesh);stats.addedBatches++;stats.addedTriangles+=geometry.attributes.position.count/3;parts.forEach(g=>g.dispose());prepared.forEach(g=>g.dispose());}
 plane.userData.airframeFidelity=stats;return stats;
}
