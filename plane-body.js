import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

const V=p=>new THREE.Vector3(...p);
function quad(a,b,c,d){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));g.computeVertexNormals();return g;}
function box(s,p){return new THREE.BoxGeometry(...s).translate(...p);}
function tube(a,b,r=.02,segments=10){const av=V(a),bv=V(b),d=bv.clone().sub(av);return new THREE.CylinderGeometry(r,r,d.length(),segments).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())).translate(...av.add(bv).multiplyScalar(.5).toArray());}
function loft(stations,n=40){
 const positions=[],indices=[];
 for(const [z,rx,ry,cy] of stations)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;positions.push(rx*Math.cos(a),cy+ry*Math.sin(a),z);}
 for(let j=0;j<stations.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;indices.push(a,b,a+n,b,b+n,a+n);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function remove(mesh,match){const g=mesh.geometry,p=g.attributes.position,index=g.index,kept=[];let removed=0;
 for(let i=0;i<(index?.count??p.count);i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);if(ids.every(j=>match(p.getX(j),p.getY(j),p.getZ(j))))removed++;else kept.push(...ids);}
 if(removed){mesh.geometry=g.clone();mesh.geometry.setIndex(kept);mesh.geometry.computeBoundingSphere();}return removed;
}

/** Rebuild the utility aircraft cabin as an actual glazed enclosure, not a
 * translucent ellipsoid laid on an opaque fuselage. Fixed wings and all moving
 * surface geometry stay untouched; this is intentionally independent of GLB export. */
export function applyPlaneBody(root){
 const plane=root.getObjectByName('PlaneRoot');if(!plane)throw new Error('Missing PlaneRoot');
 if(plane.userData.bodyFidelity)return plane.userData.bodyFidelity;
 const stats={removedTriangles:0,addedTriangles:0,addedBatches:0};
 const yellow=plane.children.find(o=>o.isMesh&&o.material.name==='Floatplane yellow');
 if(!yellow)throw new Error('Missing fixed plane paint mesh');
 const stations=[[-2.9,.65,.63,1.6],[-1.3,.68,.68,1.6],[.5,.65,.66,1.6],[1.6,.42,.44,1.7],[3.3,.14,.17,1.9],[3.7,.08,.10,1.9]];
 const fuselage=(x,y,z)=>stations.some(([sz,rx,ry,cy])=>Math.abs(z-sz)<.0001&&Math.abs((x/rx)**2+((y-cy)/ry)**2-1)<.0001);
 const cowling=(x,y,z)=>z< -2.6499&&Math.hypot(x,y-1.6)<.7001;
 const oldCockpit=(x,y,z)=>Math.abs(x)<.70&&y>1.90&&y<2.66&&z> -1.68&&z<.51;
 stats.removedTriangles+=remove(yellow,(x,y,z)=>fuselage(x,y,z)||cowling(x,y,z)||oldCockpit(x,y,z));
 const black=plane.children.find(o=>o.isMesh&&o.material.name==='Rubber and cabin trim');
 if(black)stats.removedTriangles+=remove(black,(x,y,z)=>oldCockpit(x,y,z)||(z< -3.66&&z> -3.72&&Math.abs(x)<.7&&y>.9&&y<2.3));
 const upholstery=plane.children.find(o=>o.isMesh&&o.material.name==='Woven oatmeal upholstery');if(upholstery)upholstery.visible=false;
 const oldGlass=plane.getObjectByName('Cockpit_glass');if(oldGlass)oldGlass.visible=false;
 // The old red trim consists of round rods outside the skin; replace it with
 // flush, shaped striping on the cabin doors and tail.
 const oldRed=plane.children.find(o=>o.isMesh&&o.material.name==='Scarlet details');if(oldRed)oldRed.visible=false;
 const paint=new THREE.MeshPhysicalMaterial({name:'Aircraft enamel',color:0xe5b82f,metalness:.06,roughness:.32,clearcoat:.72,clearcoatRoughness:.22,side:THREE.DoubleSide});
 // Keep the rebuilt shell and retained wing/control skins in one livery.
 paint.color.copy(yellow.material.color);
 const dark=new THREE.MeshStandardMaterial({name:'Aircraft charcoal fittings',color:0x202a2a,roughness:.68,side:THREE.DoubleSide});
 const alloy=new THREE.MeshStandardMaterial({name:'Aircraft brushed hardware',color:0xb6bdbb,metalness:.83,roughness:.36});
 const fabric=new THREE.MeshStandardMaterial({name:'Aircraft saddle upholstery',color:0x5a4430,roughness:.88});
 const red=new THREE.MeshPhysicalMaterial({name:'Aircraft painted coachline',color:0x862e22,metalness:.04,roughness:.35,clearcoat:.5,side:THREE.DoubleSide});
 // Blended glass avoids a full-resolution transmission framebuffer and makes
 // the newly open cabin legible from both sides at gameplay distance.
 const glass=new THREE.MeshPhysicalMaterial({name:'Aircraft individual glazing',color:0x9bbfc9,metalness:.10,roughness:.08,clearcoat:1,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide});
 const batches=new Map([[paint,[]],[dark,[]],[alloy,[]],[fabric,[]],[red,[]],[glass,[]]]);
 const add=(m,g)=>batches.get(m).push(g);
 // Short, broad radial cowling with rounded shoulders and a genuinely recessed
 // engine intake rather than a closed yellow hemisphere.
 add(paint,loft([[-3.80,.55,.55,1.6],[-3.76,.65,.65,1.6],[-3.62,.70,.70,1.6],[-3.36,.71,.71,1.6],[-2.77,.66,.66,1.6],[-2.56,.60,.60,1.6]],56));
 add(dark,new THREE.CircleGeometry(.55,48).rotateY(Math.PI).translate(0,1.6,-3.785));
 add(alloy,new THREE.TorusGeometry(.565,.025,8,48).translate(0,1.6,-3.80));
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const x=.36*Math.cos(a),y=1.6+.36*Math.sin(a);add(dark,new THREE.CylinderGeometry(.105,.105,.25,10).rotateX(Math.PI/2).translate(x,y,-3.83));for(let k=0;k<4;k++)add(alloy,new THREE.TorusGeometry(.107,.007,4,12).translate(x,y,-3.74-k*.035));}
 for(const z of [-3.32,-2.76])add(dark,new THREE.TorusGeometry(z===-3.32?.712:.662,.007,5,48).translate(0,1.6,z));
 // Upper nose deck falls away from a split, raked windscreen.
 add(paint,loft([[-2.56,.60,.60,1.6],[-2.1,.62,.48,1.56],[-1.79,.64,.39,1.56]],40));
 // Open U-section beneath the cabin, with no opaque roof through its windows.
 const sections=[[-1.8,.64],[.65,.66],[1.1,.58]],profile=[[-1,1.95],[-1,1.35],[-.77,1.12],[0,1.02],[.77,1.12],[1,1.35],[1,1.95]];
 for(let j=0;j<sections.length-1;j++)for(let i=0;i<profile.length-1;i++){const [z,w]=sections[j],[zz,ww]=sections[j+1],[x,y]=profile[i],[xx,yy]=profile[i+1];add(paint,quad([x*w,y,z],[xx*w,yy,z],[xx*ww,yy,zz],[x*ww,y,zz]));}
 add(paint,loft([[1.1,.58,.63,1.65],[1.55,.48,.48,1.72],[2.3,.30,.31,1.81],[3.2,.15,.17,1.90],[3.7,.08,.10,1.90]],40));
 // Six separate flat panes, with slim seals around a purposeful utility cabin.
 const panes=[];
 for(const s of [-1,1]){
  const front=[[s*.64,1.95,-1.8],[0,1.95,-1.8],[0,2.62,-1.10],[s*.52,2.62,-1.10]];
  const pilot=[[s*.64,1.95,-1.8],[s*.52,2.62,-1.10],[s*.55,2.62,-.12],[s*.66,1.95,-.12]];
  const rear=[[s*.66,1.95,-.06],[s*.55,2.62,-.06],[s*.53,2.57,.66],[s*.58,1.95,1.1]];
  panes.push(front,pilot,rear);
  for(const points of [front,pilot,rear]){add(glass,quad(...points));for(let i=0;i<4;i++)add(dark,tube(points[i],points[(i+1)%4],.018));}
  add(paint,tube([s*.66,1.95,-.09],[s*.55,2.62,-.09],.028));
  // Door shuts, external pull, hinges and a boarding step.
  for(const z of [-1.72,-.08])add(dark,tube([s*.655,1.38,z],[s*.655,1.93,z],.008));
  add(alloy,tube([s*.68,1.80,-.30],[s*.68,1.80,-.50],.018));
  for(const y of [1.48,1.78])add(alloy,box([.04,.06,.11],[s*.66,y,-1.69]));
  add(dark,tube([s*.68,1.13,-.5],[s*.96,.83,-.5],.024));add(alloy,box([.30,.035,.27],[s*.95,.82,-.5]));
  add(red,quad([s*.666,1.67,-1.74],[s*.666,1.76,-1.74],[s*.666,1.76,.65],[s*.666,1.67,.65]));
  add(red,quad([s*.58,1.67,1.1],[s*.58,1.76,1.1],[s*.15,1.94,3.18],[s*.15,1.89,3.18]));
 }
 add(paint,quad([-.52,2.62,-1.10],[.52,2.62,-1.10],[.53,2.57,.66],[-.53,2.57,.66]));
 add(paint,quad([-.53,2.57,.66],[.53,2.57,.66],[.58,1.95,1.1],[-.58,1.95,1.1]));
 // Interior that is visible through the windows: footwell, panel, paired seats,
 // yokes, instrument bezels and controls, not a painted black window.
 add(dark,box([1.18,.07,2.5],[0,1.25,-.35]));add(dark,box([1.12,.31,.16],[0,1.88,-1.40]));
 for(const x of [-.31,.31]){
  add(fabric,box([.47,.13,.55],[x,1.44,-.53]));add(fabric,box([.47,.55,.13],[x,1.72,-.21]));add(fabric,box([.28,.20,.12],[x,2.08,-.21]));
  add(alloy,tube([x,1.47,-1.18],[x,1.87,-1.02],.018));add(dark,tube([x-.13,1.89,-1.0],[x+.13,1.89,-1.0],.02));
 }
 for(const x of [-.38,-.16,.06,.28]){add(alloy,new THREE.TorusGeometry(.065,.008,6,16).translate(x,1.93,-1.308));add(dark,new THREE.CircleGeometry(.058,16).translate(x,1.93,-1.305));}
 for(const [m,parts] of batches){const prepared=parts.map(g=>{const p=g.index?g.toNonIndexed():g.clone();p.deleteAttribute('uv');return p;});const geometry=mergeGeometries(prepared);const mesh=new THREE.Mesh(geometry,m);mesh.name='Aircraft rebuilt '+m.name;mesh.castShadow=m!==glass;mesh.receiveShadow=m!==glass;plane.add(mesh);stats.addedBatches++;stats.addedTriangles+=geometry.attributes.position.count/3;parts.forEach(g=>g.dispose());prepared.forEach(g=>g.dispose());}
 plane.userData.bodyFidelity=stats;return stats;
}
