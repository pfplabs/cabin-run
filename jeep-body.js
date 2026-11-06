import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

// A complete two-door utility body, fitted to the existing wheelbase/pivots.
// Separate skin, glass and interior geometry leaves actual window openings.
function rounded(size,at,r=.035){
 const [w,h,d]=size,shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();
 return new THREE.ExtrudeGeometry(shape,{depth:Math.max(.001,d-2*r),bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r,curveSegments:3}).translate(at[0],at[1],at[2]-d/2+r);
}
function beam(a,b,r,segments=10){const v=new THREE.Vector3(...a),w=new THREE.Vector3(...b),d=w.clone().sub(v);return new THREE.CylinderGeometry(r,r,d.length(),segments).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())).translate(...v.add(w).multiplyScalar(.5).toArray());}
function pane(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return g;}
function sideSkin(x){
 // Sheet metal follows the wheel wells; no solid rectangular body behind tires.
 const shape=new THREE.Shape();shape.moveTo(-2.01,.76);shape.lineTo(-1.97,1.46);shape.lineTo(-.62,1.46);shape.lineTo(-.50,1.55);shape.lineTo(1.91,1.55);shape.lineTo(1.98,.76);shape.lineTo(1.91,.76);
 for(let i=0;i<=24;i++){const a=i*Math.PI/24;shape.lineTo(1.25+.66*Math.cos(a),.65+.66*Math.sin(a));}
 shape.lineTo(-.59,.76);
 for(let i=0;i<=24;i++){const a=i*Math.PI/24;shape.lineTo(-1.25+.66*Math.cos(a),.65+.66*Math.sin(a));}
 shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,steps:1});
 // Shape coordinates are (vehicle Z, vehicle Y); thickness runs along X.
 g.applyMatrix4(new THREE.Matrix4().set(0,0,1,x,0,1,0,0,1,0,0,0,0,0,0,1));
 // Reflection swaps winding. Convert once and reverse each triangle.
 const out=g.index?g.toNonIndexed():g.clone();for(const a of Object.values(out.attributes)){for(let i=0;i<a.count;i+=3)for(let k=0;k<a.itemSize;k++){const t=a.array[(i+1)*a.itemSize+k];a.array[(i+1)*a.itemSize+k]=a.array[(i+2)*a.itemSize+k];a.array[(i+2)*a.itemSize+k]=t;}}out.computeVertexNormals();g.dispose();return out;
}
function arch(x,z){const vertices=[],ids=[];for(let i=0;i<=32;i++){const a=i*Math.PI/32;for(const [xx,r] of [[x*.90,.65],[x*1.20,.65],[x*1.20,.73],[x*.90,.73]])vertices.push(xx,.65+Math.sin(a)*r,z+Math.cos(a)*r);}
 for(let i=0;i<32;i++)for(let k=0;k<4;k++){const a=i*4+k,b=i*4+(k+1)%4,c=b+4,d=a+4;ids.push(a,d,b,b,d,c);}ids.push(0,1,2,0,2,3,128,130,129,128,131,130);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(ids);const flat=g.toNonIndexed();flat.computeVertexNormals();return flat;}
export function applyJeepBody(root){
 const jeep=root.getObjectByName('JeepRoot');if(!jeep)throw new Error('JeepRoot required');
 if(jeep.userData.bodyRebuild)return jeep.userData.bodyRebuild;
 // Keep all animated wheels and the new spare; retire the entire primitive body.
 let retiredTriangles=0;
 for(const o of jeep.children)if(o.isMesh&&!['Matching all terrain spare','Spare alloy wheel'].includes(o.name)){retiredTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;o.visible=false;}
 const palette={
  paint:new THREE.MeshPhysicalMaterial({name:'Jeep deep olive enamel',color:0x343e36,metalness:.10,roughness:.29,clearcoat:.85,clearcoatRoughness:.18}),
  trim:new THREE.MeshStandardMaterial({name:'Jeep textured polymer',color:0x171d1c,roughness:.77}),
  alloy:new THREE.MeshStandardMaterial({name:'Jeep satin metal',color:0x9da7aa,metalness:.85,roughness:.26}),
  seat:new THREE.MeshStandardMaterial({name:'Jeep saddle upholstery',color:0x51483b,roughness:.91}),
  glass:new THREE.MeshPhysicalMaterial({name:'Jeep clear window panes',color:0xb9d1cd,roughness:.09,metalness:.12,transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide}),
  lamp:new THREE.MeshStandardMaterial({name:'Jeep lamp reflectors',color:0xdde4de,metalness:.65,roughness:.2,emissive:0xffe0a0,emissiveIntensity:.15}),
  red:new THREE.MeshStandardMaterial({name:'Jeep rear lamp lenses',color:0x8e1716,roughness:.23,metalness:.08}),
  amber:new THREE.MeshStandardMaterial({name:'Jeep amber markers',color:0xdc7522,roughness:.26}),
 };
 const parts=Object.fromEntries(Object.keys(palette).map(k=>[k,[]]));
 const box=(kind,size,at,r)=>parts[kind].push(rounded(size,at,r));
 const bar=(kind,a,b,r)=>parts[kind].push(beam(a,b,r));
 const glass=(points)=>parts.glass.push(pane(points));
 box('trim',[1.8,.18,3.95],[0,.54,0]);
 box('trim',[1.82,.12,2.35],[0,.91,.60]);
 // Hood has a raised centre pressing, rolled front lip and narrow cowl.
 box('paint',[1.77,.16,1.38],[0,1.48,-1.29],.055);
 box('paint',[1.39,.045,1.09],[0,1.577,-1.27],.018);
 box('paint',[1.9,.18,.23],[0,1.52,-.55],.025);
 box('paint',[1.91,.11,2.19],[0,2.32,.73],.045);
 box('trim',[1.94,.045,2.22],[0,2.272,.73],.015);
 for(const x of [-.98,.98]){
  parts.paint.push(sideSkin(x));
  box('paint',[.07,.61,1.12],[x*1.035,1.21,.09],.025);
  box('trim',[.016,.011,1.12],[x*1.079,.91,.09],.004);
  for(const z of [-.47,.65])bar('trim',[x*1.077,.91,z],[x*1.077,1.5,z],.009);
  box('trim',[.22,.10,1.16],[x*1.08,.66,.08],.025);
  for(const z of [-1.25,1.25])parts.trim.push(arch(x,z));
  // Raked A pillar, B pillar and tail corner surround individual flat panes.
  bar('paint',[x,1.55,-.52],[x*.94,2.25,-.34],.045);
  bar('trim',[x*.94,2.25,-.34],[x*.94,2.25,1.76],.035);
  bar('paint',[x,1.52,.68],[x*.94,2.25,.68],.045);
  bar('paint',[x,1.52,1.79],[x*.94,2.25,1.76],.055);
  bar('paint',[x,1.55,-.51],[x,1.55,1.78],.04);
  glass([[x,1.60,-.44],[x,1.60,.61],[x*.94,2.21,.61],[x*.94,2.21,-.31]]);
  glass([[x,1.60,.75],[x,1.60,1.71],[x*.94,2.21,1.71],[x*.94,2.21,.75]]);
  box('trim',[.055,.05,.23],[x*1.095,1.43,.46],.015);
  for(const y of [1.01,1.37])box('paint',[.035,.06,.13],[x*1.095,y,-.43],.008);
  bar('trim',[x,1.53,-.40],[x*1.22,1.74,-.40],.024);
  box('trim',[.21,.25,.13],[x*1.22,1.78,-.40],.045);
  box('alloy',[.17,.20,.012],[x*1.22,1.78,-.323],.005);
  // Hood latches and moulded side vent openings.
  box('trim',[.035,.13,.06],[x*.94,1.42,-.79],.009);
  for(let i=0;i<5;i++)box('trim',[.02,.035,.07],[x*.94,1.5,-.53+i*.023],.006);
 }
 glass([[-.92,1.60,-.54],[.92,1.60,-.54],[.86,2.21,-.36],[-.86,2.21,-.36]]);
 glass([[.89,1.61,1.807],[-.89,1.61,1.807],[-.86,2.21,1.777],[.86,2.21,1.777]]);
 bar('paint',[-.92,1.57,-.55],[.92,1.57,-.55],.045);bar('paint',[-.87,2.24,-.35],[.87,2.24,-.35],.045);
 bar('trim',[-.86,2.23,1.78],[.86,2.23,1.78],.035);
 box('paint',[1.94,.67,.13],[0,1.18,1.88],.035);
 box('trim',[2.18,.23,.25],[0,.62,2.03],.065);
 box('trim',[2.20,.24,.26],[0,.65,-2.08],.06);
 box('alloy',[.52,.12,.05],[0,.74,-2.235],.015);
 // Seven real grille slots, inset radiator and separate round lamp housings.
 box('trim',[1.7,.58,.06],[0,1.17,-2.01],.025);
 box('paint',[1.82,.10,.13],[0,1.49,-2.015],.03);
 box('paint',[1.82,.10,.13],[0,.88,-2.015],.03);
 for(let i=0;i<8;i++)box('paint',[.064,.50,.12],[-.49+i*.14,1.19,-2.04],.025);
 for(const x of [-.75,.75]){
  box('paint',[.42,.55,.12],[x,1.20,-2.035],.05);
  parts.trim.push(new THREE.TorusGeometry(.176,.032,10,40).translate(x,1.25,-2.115));
  parts.lamp.push(new THREE.SphereGeometry(.165,24,12,0,Math.PI*2,0,Math.PI).scale(1,1,.28).translate(x,1.25,-2.13));
  parts.alloy.push(new THREE.TorusGeometry(.145,.009,6,32).translate(x,1.25,-2.18));
  for(let i=-2;i<=2;i++)bar('lamp',[x+i*.042,1.14,-2.18],[x+i*.042,1.36,-2.18],.004);
  box('amber',[.19,.07,.04],[x,.99,-2.115],.015);
  box('trim',[.25,.33,.095],[x,1.20,1.98],.04);box('red',[.20,.22,.035],[x,1.245,2.042],.023);box('lamp',[.19,.055,.035],[x,1.09,2.042],.01);
  parts.alloy.push(new THREE.TorusGeometry(.06,.016,6,16).translate(x,.57,-2.23));
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
 box('seat',[1.42,.18,.46],[0,1.12,1.35],.055);box('seat',[1.42,.48,.14],[0,1.43,1.62],.055);
 parts.trim.push(new THREE.TorusGeometry(.19,.022,8,32).rotateX(-.35).translate(-.46,1.62,-.02));
 bar('trim',[-.46,1.48,-.27],[-.46,1.62,-.02],.04);
 for(const x of [-.64,-.48,-.32])parts.alloy.push(new THREE.TorusGeometry(.044,.006,6,16).translate(x,1.57,-.128));
 bar('trim',[0,1.27,.19],[0,1.48,.13],.015);box('trim',[.06,.06,.07],[0,1.49,.13],.02);
 for(const x of [-.65,.25]){bar('trim',[x,1.59,-.58],[x+.23,1.84,-.51],.012);bar('trim',[x+.18,1.78,-.53],[x+.32,1.95,-.48],.014);}
 // Low-profile expedition rack with mounts and longitudinal slats.
 for(const x of [-.73,.73]){bar('trim',[x,2.43,-.16],[x,2.43,1.62],.027);for(const z of [-.08,1.53])bar('trim',[x,2.35,z],[x,2.43,z],.022);}
 for(const z of [-.10,.43,.96,1.57])bar('alloy',[-.74,2.43,z],[.74,2.43,z],.022);
 const stats={retiredTriangles,triangles:0,draws:0};
 for(const [kind,items] of Object.entries(parts)){
  const clean=items.map(g=>{const a=g.index?g.toNonIndexed():g;a.deleteAttribute('uv');a.deleteAttribute('uv1');return a;});
  const g=mergeGeometries(clean);const o=new THREE.Mesh(g,palette[kind]);o.name='Rebuilt Jeep '+kind;o.castShadow=kind!=='glass';o.receiveShadow=kind!=='glass';jeep.add(o);
  stats.triangles+=g.attributes.position.count/3;stats.draws++;for(const a of clean)a.dispose();for(const a of items)a.dispose();
 }
 jeep.userData.bodyRebuild=stats;return stats;
}
