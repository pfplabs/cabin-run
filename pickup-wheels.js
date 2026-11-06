import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

// Match the game's rolling divisor; tread tips, not the sidewall, define radius.
export const PICKUP_WHEEL={radius:.588,width:.35,rimRadius:.312,lodDistance:28};
const UP=new THREE.Vector3(0,1,0);
function ring(radius,tube,x,segments=64){return new THREE.TorusGeometry(radius,tube,5,segments).rotateY(Math.PI/2).translate(x,0,0);}
function cylinder(radius,depth,x,segments=48){return new THREE.CylinderGeometry(radius,radius,depth,segments).rotateZ(Math.PI/2).translate(x,0,0);}
function bar(a,b,r){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);return new THREE.CylinderGeometry(r,r,d.length(),8).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,d.normalize())).translate(...p.add(q).multiplyScalar(.5).toArray());}
function merge(parts){const prepared=parts.map(g=>{const p=g.index?g.toNonIndexed():g;p.deleteAttribute('uv');return p;});const result=mergeGeometries(prepared);for(const g of new Set([...parts,...prepared]))g.dispose();result.computeBoundingBox();result.computeBoundingSphere();return result;}
function casing(segments){
 // Bead -> flexing sidewall -> rounded shoulder -> broad, shallow tread crown.
 // Unlike a torus this holds almost constant radius across the contact width.
 const profile=[[-.143,.310],[-.158,.334],[-.173,.39],[-.175,.43],[-.161,.51],[-.137,.552],[-.108,.571],[0,.574],[.108,.571],[.137,.552],[.161,.51],[.175,.43],[.173,.39],[.158,.334],[.143,.310]];
 const points=profile.map(([x,r])=>new THREE.Vector2(r,x));const g=new THREE.LatheGeometry(points,segments);g.rotateZ(-Math.PI/2);return g;
}
function tread(){
 const parts=[];const pitches=44;
 for(let i=0;i<pitches;i++)for(let row=0;row<4;row++){
  const x=[-.125,-.043,.043,.125][row],shoulder=row===0||row===3;
  const a=(i+(row%2)*.47)/pitches*Math.PI*2;
  // Two staggered centre rows and alternating open shoulder slots. Each block
  // is split by a narrow sipe, not a broad painted stripe on smooth rubber.
  const width=shoulder?.061:.073,length=shoulder?.066:.064;
  for(const half of [-1,1]){
   const block=new THREE.BoxGeometry(width,.014,length/2-.002);
   block.translate(0,0,half*(length/4+.001));block.rotateY((row<2?1:-1)*(i%2?.22:.32));
   block.translate(x,.581,0);block.rotateX(a);parts.push(block);
  }
 }
 return parts;
}
function spoke(a){
 // Broad dished alloy spoke that forks near the rim, leaving real dark pockets.
 const parts=[];
 for(const branch of [-1,1]){
  const near=[.114,.075*Math.cos(a),.075*Math.sin(a)];
  const aa=a+branch*.085,far=[.169,.281*Math.cos(aa),.281*Math.sin(aa)];
  parts.push(bar(near,far,.032));
 }
 return parts;
}
function materials(){
 const rubber=new THREE.MeshStandardMaterial({name:'Pickup tire compound',color:0x2d2f2c,roughness:.87,metalness:0});
 rubber.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTireLocal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTireLocal=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTireLocal;')
   .replace('#include <color_fragment>',`#include <color_fragment>
    float tireGrain=fract(sin(dot(floor(vTireLocal*360.0),vec3(12.9898,78.233,37.719)))*43758.5453);
    float grainFade=1.0-smoothstep(.002,.012,length(fwidth(vTireLocal)));
    diffuseColor.rgb*=1.0+(tireGrain-.5)*.075*grainFade;
   `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    float treadFace=(1.0-smoothstep(.04,.11,abs(vTireLocal.x)));
    roughnessFactor=mix(.79,.94,treadFace);
   `);
 };
 rubber.customProgramCacheKey=()=> 'pickup-tire-compound-v1';
 return {rubber,graphite:new THREE.MeshStandardMaterial({name:'Pickup graphite alloy',color:0x59615d,metalness:.85,roughness:.34}),machined:new THREE.MeshStandardMaterial({name:'Pickup machined wheel edges',color:0xa1a5a2,metalness:.92,roughness:.3})};
}
export function applyPickupWheels(jeep){
 if(jeep.userData.pickupWheels)return jeep.userData.pickupWheels;
 const wheels=jeep.children.filter(o=>/^JeepWheel(Left|Right)(Front|Rear)$/.test(o.name));if(wheels.length!==4)throw new Error('Four animated wheel roots required');
 const m=materials(),rubberParts=[casing(64),...tread()];
 for(const sign of [-1,1])for(const [r,x] of [[.350,.164],[.498,.166]])rubberParts.push(ring(r,.003,sign*x,64));
 const rubberGeometry=merge(rubberParts);
 const darkParts=[cylinder(.307,.27,0),cylinder(.236,.018,.085),cylinder(.085,.065,.115)];
 // Cylinder barrel is opened by removing its flat end caps; spokes remain see-through.
 const barrel=darkParts[0],idx=barrel.index,groups=barrel.groups;barrel.setIndex(Array.from(idx.array).slice(groups[0].start,groups[0].start+groups[0].count));barrel.clearGroups();
 const metalParts=[ring(.305,.012,.177),ring(.289,.006,.174),cylinder(.066,.012,.155,24)];
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3;darkParts.push(...spoke(a));
  const y=.052*Math.cos(a),z=.052*Math.sin(a);
  metalParts.push(new THREE.CylinderGeometry(.013,.013,.025,6).rotateZ(Math.PI/2).translate(.168,y,z));
 }
 // Recessed ventilation details sit on the brake rotor behind the open spokes.
 for(let i=0;i<24;i++){const a=i*Math.PI/12;darkParts.push(new THREE.SphereGeometry(.008,6,4).scale(.3,1,1).translate(.096,.211*Math.cos(a),.211*Math.sin(a)));}
 darkParts.push(bar([.17,.245,0],[.20,.254,0],.007));
 const darkGeometry=merge(darkParts),metalGeometry=merge(metalParts);
 const lowRubber=merge([casing(32)]),lowRim=merge([cylinder(.307,.08,.13,24),ring(.300,.012,.177,32),...Array.from({length:6},(_,i)=>spoke(i*Math.PI/3)).flat()]);
 const geometries=[rubberGeometry,darkGeometry,metalGeometry,lowRubber,lowRim];
 const count=g=>(g.index?.count??g.attributes.position.count)/3;
 const stats={radius:PICKUP_WHEEL.radius,width:PICKUP_WHEEL.width,nearTrianglesPerWheel:geometries.slice(0,3).reduce((s,g)=>s+count(g),0),farTrianglesPerWheel:count(lowRubber)+count(lowRim),nearDraws:12,farDraws:8,retiredTriangles:0};
 for(const wheel of wheels){
  for(const o of wheel.children)if(o.isMesh&&o.visible){stats.retiredTriangles+=count(o.geometry);o.visible=false;}
  const sign=wheel.name.includes('Left')?-1:1,lod=new THREE.LOD();lod.name='Pickup wheel detail LOD';
  const level=items=>{const group=new THREE.Group();for(const [geometry,material] of items){const mesh=new THREE.Mesh(geometry,material);mesh.scale.x=sign;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}return group;};
  lod.addLevel(level([[rubberGeometry,m.rubber],[darkGeometry,m.graphite],[metalGeometry,m.machined]]),0);
  lod.addLevel(level([[lowRubber,m.rubber],[lowRim,m.graphite]]),PICKUP_WHEEL.lodDistance,.12);
  wheel.add(lod);
 }
 jeep.userData.pickupWheels=stats;return stats;
}
