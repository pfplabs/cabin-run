import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {applyPickupWheels} from './pickup-wheels.js';

// Reference-guided Tacoma-style pickup; legacy function/root names preserve controls.
// Separate skin, glass and interior geometry leaves actual window openings.
function rounded(size,at,r=.035){
 r=Math.min(r,...size.map(v=>v*.45));
 const [w,h,d]=size,shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();
 return new THREE.ExtrudeGeometry(shape,{depth:Math.max(.001,d-2*r),bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r,curveSegments:3}).translate(at[0],at[1],at[2]-d/2+r);
}
function beam(a,b,r,segments=10){const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),d=w.clone().sub(v);return new THREE.CylinderGeometry(r,r,d.length(),segments).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())).translate(...v.add(w).multiplyScalar(.5).toArray());}
function pane(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return g;}
const archProfile=[[.71,.70],[.71,1.00],...Array.from({length:9},(_,i)=>{const a=i/8*Math.PI/2;return [.40+.31*Math.cos(a),1.00+.38*Math.sin(a)];}),[-.40,1.38],...Array.from({length:9},(_,i)=>{const a=Math.PI/2+i/8*Math.PI/2;return [-.40+.31*Math.cos(a),1.00+.38*Math.sin(a)];}),[-.71,.70]];
function sideSkin(x){
 const shape=new THREE.Shape();shape.moveTo(-2.01,.70);shape.lineTo(-1.97,1.44);shape.lineTo(-.62,1.44);shape.lineTo(-.50,1.55);shape.lineTo(1.91,1.55);shape.lineTo(1.98,.70);
 for(const z of [1.25,-1.25])for(const [dz,y] of archProfile)shape.lineTo(z+dz,y);
 shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.014,bevelThickness:.012,bevelSegments:3,steps:1});
 g.applyMatrix4(new THREE.Matrix4().set(0,0,1,x,0,1,0,0,1,0,0,0,0,0,0,1));
 const out=g.index?g.toNonIndexed():g.clone();for(const a of Object.values(out.attributes)){for(let i=0;i<a.count;i+=3)for(let k=0;k<a.itemSize;k++){const t=a.array[(i+1)*a.itemSize+k];a.array[(i+1)*a.itemSize+k]=a.array[(i+2)*a.itemSize+k];a.array[(i+2)*a.itemSize+k]=t;}}out.computeVertexNormals();g.dispose();return out;
}
function arch(x,z){
 const vertices=[],ids=[],steps=48,profile=[[.97,.79],[1.03,.785],[1.11,.76],[1.19,.72],[1.24,.69],[1.245,.655],[1.22,.64]];
 for(let i=0;i<=steps;i++){
  const a=i/steps*Math.PI,c=Math.cos(a),sn=Math.sin(a);
  for(const [w,r] of profile)vertices.push(x*w,.65+r*Math.pow(sn,.70),z+r*Math.sign(c)*Math.pow(Math.abs(c),.70));
 }
 const n=profile.length;
 for(let i=0;i<steps;i++)for(let k=0;k<n-1;k++){const a=i*n+k,b=a+1,c=a+n,d=c+1;if(x>0)ids.push(a,b,c,b,d,c);else ids.push(a,c,b,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(ids);g.computeVertexNormals();return g;
}
function bentTube(points,r=.03){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),Math.min(64,Math.max(12,points.length*5)),r,10,false);}
function formedHood(){
 // Continuous rolled shoulders and shallow crown, rather than a second box on top.
 const zs=[-2.01,-1.96,-1.86,-.75,-.61],width=[.82,.87,.89,.90,.88],positions=[],ids=[],n=16;
 for(let j=0;j<zs.length;j++)for(let i=0;i<=n;i++){const t=i/n*2-1;positions.push(width[j]*t,1.52+.055*(1-t*t)-.13*Math.pow(Math.abs(t),12),zs[j]);}
 for(let j=0;j<zs.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,c=a+n+1;ids.push(a,c,b,b,c,c+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(ids);g.computeVertexNormals();return g;
}
function finishPaint(m){
 // Restrained lower-panel road film and micro-roughness in object space.
 // Detail follows the vehicle rather than swimming through world coordinates.
 m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBodyPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBodyPosition=position;');
 s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vBodyPosition;
 float bodyNoise(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
 `).replace('#include <color_fragment>',`#include <color_fragment>
 float film=(1.0-smoothstep(.65,1.35,vBodyPosition.y))*.13;
 float grain=bodyNoise(floor(vBodyPosition*180.0));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.095,.083,.065),film*(.65+grain*.35));
 `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+film*.65,.18,.65);');};
 m.customProgramCacheKey=()=> 'reference-jeep-finish-v1';
}
export function applyJeepBody(root){
 const jeep=root.getObjectByName('JeepRoot');if(!jeep)throw new Error('JeepRoot required');
 if(jeep.userData.bodyRebuild)return jeep.userData.bodyRebuild;
 // Preserve animated wheel nodes; retire the primitive body and SUV spare.
 let retiredTriangles=0;
 for(const o of jeep.children)if(o.isMesh){retiredTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;o.visible=false;}
 const palette={
  paint:new THREE.MeshPhysicalMaterial({name:'Jeep reference black enamel',color:0x141917,metalness:.20,roughness:.23,clearcoat:.92,clearcoatRoughness:.13}),
  trim:new THREE.MeshStandardMaterial({name:'Jeep textured polymer',color:0x121615,roughness:.73}),
  alloy:new THREE.MeshStandardMaterial({name:'Jeep satin metal',color:0x77817f,metalness:.88,roughness:.25}),
  seat:new THREE.MeshStandardMaterial({name:'Jeep saddle upholstery',color:0x393c38,roughness:.91}),
  glass:new THREE.MeshPhysicalMaterial({name:'Jeep clear window panes',color:0x677b77,roughness:.055,metalness:.28,transparent:true,opacity:.43,depthWrite:false,side:THREE.DoubleSide}),
  lamp:new THREE.MeshStandardMaterial({name:'Jeep lamp reflectors',color:0xdde4de,metalness:.65,roughness:.2,emissive:0xffe0a0,emissiveIntensity:.15}),
  red:new THREE.MeshStandardMaterial({name:'Jeep rear lamp lenses',color:0x8e1716,roughness:.23,metalness:.08}),
  amber:new THREE.MeshStandardMaterial({name:'Jeep amber markers',color:0xdc7522,roughness:.26}),
 };
 finishPaint(palette.paint);
 const parts=Object.fromEntries(Object.keys(palette).map(k=>[k,[]]));
 const box=(kind,size,at,r)=>parts[kind].push(rounded(size,at,r));
 const bar=(kind,a,b,r)=>parts[kind].push(beam(a,b,r));
 const glass=(points)=>parts.glass.push(pane(points));
 box('trim',[1.8,.18,3.95],[0,.54,0]);
 box('trim',[1.82,.12,2.35],[0,.91,.60]);
 // Hood has a raised centre pressing, rolled front lip and narrow cowl.
 parts.paint.push(formedHood());
 box('paint',[1.73,.14,1.35],[0,1.42,-1.30],.04);
 box('paint',[1.9,.18,.23],[0,1.52,-.55],.025);
 box('paint',[1.87,.14,1.14],[0,2.24,.28],.065);
 box('trim',[1.90,.035,1.16],[0,2.185,.28],.015);
 for(const x of [-.98,.98]){
  parts.paint.push(sideSkin(x));

  box('paint',[.07,.61,1.12],[x*1.035,1.21,.09],.025);
  box('trim',[.016,.011,1.12],[x*1.079,.91,.09],.004);
  for(const z of [-.47,.65])bar('trim',[x*1.077,.91,z],[x*1.077,1.5,z],.009);
  box('trim',[.22,.10,1.16],[x*1.08,.66,.08],.025);
  for(const z of [-1.25,1.25]){
   parts.paint.push(arch(x,z));

  }
  // Pickup bed has separate inner/outer panels and an exposed top rail.
  box('paint',[.11,.43,1.05],[x,1.26,1.34],.035);
  box('trim',[.13,.045,1.12],[x,1.49,1.34],.015);
  box('trim',[.29,.33,.90],[x*.83,1.14,1.30],.07);
  // A thick metal window surround, with recessed glass and an access-cab quarter pane.
  const outline=new THREE.Shape();outline.moveTo(-.52,1.55);outline.lineTo(-.12,2.20);outline.lineTo(.75,2.20);outline.lineTo(.79,1.55);outline.closePath();
  const opening=new THREE.Path();opening.moveTo(-.39,1.64);opening.lineTo(.59,1.64);opening.lineTo(.59,2.11);opening.lineTo(-.075,2.11);opening.closePath();outline.holes.push(opening);
  const rearOpening=new THREE.Path();rearOpening.moveTo(.685,1.67);rearOpening.lineTo(.745,1.67);rearOpening.lineTo(.735,2.10);rearOpening.lineTo(.685,2.10);rearOpening.closePath();outline.holes.push(rearOpening);
  const surround=new THREE.ExtrudeGeometry(outline,{depth:.05,bevelEnabled:true,bevelSize:.014,bevelThickness:.014,bevelSegments:3,steps:1});
  surround.rotateY(Math.PI/2);surround.translate(x,0,0); // XY outline maps -Z; correct the longitudinal sign below.
  const sp=surround.attributes.position;for(let i=0;i<sp.count;i++){sp.setZ(i,-sp.getZ(i));sp.setX(i,sp.getX(i)*(1-.105*Math.max(0,Math.min(1,(sp.getY(i)-1.55)/.65))));}
  // Reflection reverses triangle winding.
  for(const a of Object.values(surround.attributes))for(let i=0;i<a.count;i+=3)for(let k=0;k<a.itemSize;k++){const t=a.array[(i+1)*a.itemSize+k];a.array[(i+1)*a.itemSize+k]=a.array[(i+2)*a.itemSize+k];a.array[(i+2)*a.itemSize+k]=t;}surround.computeVertexNormals();parts.paint.push(surround);
  glass([[x,1.67,.685],[x,1.67,.745],[x*.96,2.10,.735],[x*.96,2.10,.685]]);
  // Raked A pillar, B pillar and tail corner surround individual flat panes.
  bar('paint',[x,1.55,-.52],[x*.89,2.19,-.12],.065);
  bar('trim',[x*.89,2.19,-.12],[x*.89,2.19,.72],.035);
  bar('paint',[x,1.52,.68],[x*.89,2.19,.68],.075);
  bar('trim',[x,1.52,.76],[x*.89,2.19,.72],.055);
  bar('paint',[x,1.55,-.51],[x,1.55,.72],.04);
  glass([[x*.98,1.60,-.44],[x*.98,1.60,.59],[x*.89,2.14,.59],[x*.89,2.14,-.10]]);
  box('trim',[.055,.05,.23],[x*1.095,1.43,.46],.015);
  box('paint',[.018,.018,1.04],[x*1.079,1.34,.08],.006);
  bar('trim',[x,1.53,-.40],[x*1.22,1.74,-.40],.024);
  box('trim',[.21,.25,.13],[x*1.22,1.78,-.40],.045);
  box('alloy',[.17,.20,.012],[x*1.22,1.78,-.323],.005);
  // Hood latches and moulded side vent openings.
  box('paint',[.035,.07,.38],[x*.96,1.39,-.91],.02);

 }
 glass([[-.92,1.60,-.54],[.92,1.60,-.54],[.82,2.14,-.145],[-.82,2.14,-.145]]);
 glass([[.81,1.68,.793],[-.81,1.68,.793],[-.79,2.14,.750],[.79,2.14,.750]]);
 bar('paint',[-.92,1.57,-.55],[.92,1.57,-.55],.045);bar('paint',[-.84,2.18,-.13],[.84,2.18,-.13],.055);
 bar('trim',[-.89,2.20,.74],[.89,2.20,.74],.045);
 box('paint',[1.94,.45,.13],[0,1.24,1.88],.035);
 box('trim',[2.18,.23,.25],[0,.62,2.03],.065);
 box('paint',[2.18,.28,.32],[0,.72,-2.075],.12);
 box('trim',[1.38,.14,.13],[0,.64,-2.235],.04);
 box('alloy',[.52,.12,.05],[0,.74,-2.235],.015);
 // Full-size pickup grille, with a wide chrome perimeter and inset radiator.
 box('trim',[1.20,.52,.08],[0,1.20,-2.045],.09);
 parts.alloy.push(bentTube([[-.59,1.42,-2.12],[-.53,1.46,-2.12],[.53,1.46,-2.12],[.59,1.42,-2.12],[.54,.97,-2.12],[.48,.94,-2.12],[-.48,.94,-2.12],[-.54,.97,-2.12],[-.59,1.42,-2.12]],.028));
 for(const y of [1.10,1.28])box('alloy',[1.05,.045,.06],[0,y,-2.113],.018);
 for(let i=-9;i<=9;i++)bar('trim',[i*.055,.99,-2.101],[i*.055,1.41,-2.101],.007);
 for(let i=0;i<7;i++)bar('trim',[-.51,1.01+i*.06,-2.10],[.51,1.01+i*.06,-2.10],.007);
 box('paint',[1.88,.08,.13],[0,1.49,-2.015],.035);
 for(const x of [-.75,.75]){
  box('paint',[.54,.54,.16],[x,1.22,-2.015],.09);
  box('trim',[.49,.34,.12],[x,1.32,-2.12],.07);
  box('alloy',[.43,.29,.03],[x,1.32,-2.19],.055);
  box('lamp',[.39,.25,.025],[x,1.32,-2.209],.05);
  for(const dx of [-.09,.08]){parts.alloy.push(new THREE.TorusGeometry(.075,.008,6,24).translate(x+dx,1.33,-2.23));parts.lamp.push(new THREE.SphereGeometry(.065,16,10).scale(1,1,.28).translate(x+dx,1.33,-2.232));}
  box('amber',[.075,.16,.03],[x+Math.sign(x)*.16,1.34,-2.215],.012);
  box('trim',[.24,.49,.095],[x,1.18,1.98],.04);box('red',[.205,.32,.035],[x,1.245,2.042],.032);box('lamp',[.19,.10,.035],[x,1.01,2.042],.017);
  parts.alloy.push(new THREE.TorusGeometry(.06,.016,6,16).translate(x,.57,-2.23));
 }
 // Two large front auxiliary lamps from the latest supplied accessory image; a
 // substantial wraparound bullbar, plus winch drum, cable and roller fairlead.
 parts.trim.push(bentTube([[-1.0,.80,-2.22],[-.94,1.03,-2.22],[-.63,1.18,-2.22],[-.45,1.54,-2.18],[.45,1.54,-2.18],[.63,1.18,-2.22],[.94,1.03,-2.22],[1.0,.80,-2.22]],.032));
 bar('trim',[-.94,.87,-2.27],[.94,.87,-2.27],.04);
 for(const x of [-.28,.28]){
  bar('trim',[x,1.03,-2.18],[x,1.28,-2.18],.028);
  parts.trim.push(new THREE.CylinderGeometry(.20,.18,.13,32).rotateX(Math.PI/2).translate(x,1.31,-2.21));
  parts.alloy.push(new THREE.TorusGeometry(.18,.014,8,32).translate(x,1.31,-2.282));
  parts.lamp.push(new THREE.SphereGeometry(.17,24,12).scale(1,1,.22).translate(x,1.31,-2.283));
  for(let k=-2;k<=2;k++){const xx=k*.044,dy=Math.sqrt(.14*.14-xx*xx);bar('alloy',[x+xx,1.31-dy,-2.317],[x+xx,1.31+dy,-2.317],.002);}
 }
 box('trim',[.63,.19,.25],[0,.91,-2.03],.025);
 bar('alloy',[-.26,.91,-2.06],[.26,.91,-2.06],.09);
 for(let i=0;i<16;i++)parts.trim.push(new THREE.TorusGeometry(.091,.006,5,16).rotateY(Math.PI/2).translate(-.23+i*.03,.91,-2.06));
 bar('alloy',[-.22,.80,-2.27],[.22,.80,-2.27],.018);bar('alloy',[-.22,.71,-2.27],[.22,.71,-2.27],.018);
 // Axles, differential housings, suspension links and brake disks are visible
 // through the wheel wells rather than an empty floating body.
 for(const z of [-1.25,1.25]){
  bar('trim',[-1.08,.61,z],[1.08,.61,z],.055);
  parts.trim.push(new THREE.SphereGeometry(.14,16,10).scale(1.1,1,.8).translate(0,.61,z));
  for(const x of [-.78,.78]){
   bar('alloy',[x,.62,z-.12],[x,.95,z+.10],.028);
   const points=[];for(let i=0;i<=80;i++){const t=i/80;points.push([x+.065*Math.cos(t*Math.PI*12),.65+t*.24,z+.065*Math.sin(t*Math.PI*12)]);}
   parts.trim.push(bentTube(points,.01));
  }
 }
 // Cabin interior remains visible through openings instead of solid paint.
 box('trim',[1.70,.25,.29],[0,1.49,-.29],.04);
 box('trim',[.27,.44,.82],[0,1.13,.30],.035);
 for(const x of [-.46,.46]){
  box('seat',[.60,.18,.61],[x,1.08,.29],.07);
  const back=rounded([.59,.68,.16],[x,1.46,.62],.06);back.rotateX(-.07);parts.seat.push(back);
  box('trim',[.30,.22,.12],[x,1.94,.65],.05);
  for(const dx of [-.22,.22])bar('seat',[x+dx,1.19,.55],[x+dx,1.74,.59],.035);
 }
 // Solid cab bulkhead below the rear window; open, ribbed cargo bed behind it.
 box('paint',[1.87,.63,.10],[0,1.23,.77],.025);
 box('trim',[1.84,.07,.13],[0,1.64,.78],.02);
 for(const x of [-.87,.87])box('trim',[.10,.59,.12],[x,1.94,.76],.025);
 box('trim',[1.76,.07,1.03],[0,1.045,1.34],.02);
 for(const x of [-.65,-.43,-.21,0,.21,.43,.65])box('trim',[.035,.018,.94],[x,1.087,1.34],.006);
 box('paint',[1.74,.32,.035],[0,1.24,1.96],.025);
 box('trim',[.28,.065,.025],[0,1.40,1.985],.01);
 for(const x of [-.72,.72]){box('alloy',[.14,.04,.04],[x,1.04,1.98],.01);parts.alloy.push(new THREE.TorusGeometry(.035,.008,5,16).rotateY(Math.PI/2).translate(x,1.39,1.73));}

 parts.trim.push(new THREE.TorusGeometry(.19,.022,8,32).rotateX(-.35).translate(-.46,1.62,-.02));
 bar('trim',[-.46,1.48,-.27],[-.46,1.62,-.02],.04);
 for(const x of [-.64,-.48,-.32])parts.alloy.push(new THREE.TorusGeometry(.044,.006,6,16).translate(x,1.57,-.128));
 bar('trim',[0,1.27,.19],[0,1.48,.13],.015);box('trim',[.06,.06,.07],[0,1.49,.13],.02);
 for(const x of [-.65,.12]){bar('trim',[x,1.59,-.58],[x+.26,1.65,-.52],.012);bar('trim',[x+.11,1.64,-.53],[x+.48,1.68,-.50],.014);}
 box('red',[.33,.05,.035],[0,2.175,.78],.012);
 // Heavy black twin-tube sport bar: curved upper hoop, rear stays,
 // rail-mounted feet and grab handles from the supplied rear-quarter photo.
 for(const x of [-.78,.78]){
  box('trim',[.23,.07,.74],[x,1.51,1.28],.025);
  parts.trim.push(bentTube([[x,1.54,.95],[x,2.11,.95],[x*.78,2.29,.95]],.065));
  parts.trim.push(bentTube([[x,1.54,1.69],[x,1.78,1.60],[x,2.24,1.10],[x*.78,2.29,.95]],.065));
  parts.trim.push(bentTube([[x*1.07,1.92,1.43],[x*1.07,2.04,1.40],[x*1.07,2.27,1.14],[x*1.07,2.25,1.04]],.025));
  box('trim',[.03,.12,.20],[x*1.08,1.99,1.32],.014);
  for(const z of [1.25,1.38])parts.alloy.push(new THREE.SphereGeometry(.012,8,6).translate(x*1.10,1.99,z));
 }
 bar('trim',[-.61,2.29,.95],[.61,2.29,.95],.065);
 bar('trim',[-.72,2.35,-.08],[.72,2.35,-.08],.028);
 // Four auxiliary roof lamps complement the front rally bar.
 for(const x of [-.55,-.18,.18,.55]){
  bar('trim',[x,2.32,-.09],[x,2.44,-.09],.023);
  parts.trim.push(new THREE.CylinderGeometry(.118,.11,.10,24).rotateX(Math.PI/2).translate(x,2.47,-.12));
  parts.alloy.push(new THREE.TorusGeometry(.106,.009,6,24).translate(x,2.47,-.177));
  parts.lamp.push(new THREE.SphereGeometry(.10,20,10).scale(1,1,.22).translate(x,2.47,-.18));
 }
 const pickupZ=z=>z<-.5?-.5+(z+.5)*1.12:z<=.65?-.5+(z+.5)*1.20:z<=.8?.88+(z-.65)*3.2:1.36+(z-.8)*1.20;
 for(const wheel of jeep.children.filter(o=>o.name.startsWith('JeepWheel')))wheel.position.z=pickupZ(wheel.position.z);
 const stats={retiredTriangles,triangles:0,draws:0,bodyStyle:'Tacoma-style pickup'};
 for(const [kind,items] of Object.entries(parts)){
  const clean=items.map(g=>{const a=g.index?g.toNonIndexed():g;a.deleteAttribute('uv');a.deleteAttribute('uv1');return a;});
  const g=mergeGeometries(clean),positions=g.attributes.position,normals=g.attributes.normal,n=new THREE.Vector3();
  for(let i=0;i<positions.count;i++){const z=positions.getZ(i),stretch=z<-.5?1.12:z<=.65?1.20:z<=.8?3.2:1.20;positions.setZ(i,pickupZ(z));n.fromBufferAttribute(normals,i);n.z/=stretch;n.normalize();normals.setXYZ(i,n.x,n.y,n.z);}const o=new THREE.Mesh(g,palette[kind]);o.name='Rebuilt Jeep '+kind;o.castShadow=kind!=='glass';o.receiveShadow=kind!=='glass';jeep.add(o);
  stats.triangles+=g.attributes.position.count/3;stats.draws++;for(const a of clean)a.dispose();for(const a of items)a.dispose();
 }
 const cockpitAnchor=new THREE.Object3D();cockpitAnchor.name='JeepCockpitCamera';cockpitAnchor.position.set(-.46,1.94,.38);jeep.add(cockpitAnchor);
 stats.wheels=applyPickupWheels(jeep);
 jeep.userData.bodyRebuild=stats;return stats;
}
