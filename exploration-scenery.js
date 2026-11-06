import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {turnoffStopPlacement} from './road-signs.js';
import * as THREE from 'three';
import {EXPLORATION_ROUTES,terrainHeight,roadPoint} from './engine.js';
import {createRoadRibbonGeometry,clipRibbonOutsideRoad} from './road-surfaces.js';

/** Small destinations reuse the road material; no lights or per-frame scene work. */
export function createExplorationScenery(roadPoints,gravel,asphalt){
 const group=new THREE.Group();group.name='Signed western lake exploration stops';
 const wood=new THREE.MeshStandardMaterial({color:0x89745b,roughness:.93}),metal=new THREE.MeshStandardMaterial({color:0x384b41,roughness:.8});
 const box=(parent,size,pos,mat=wood)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const paint=new THREE.MeshStandardMaterial({color:0xdedbd0,roughness:.9,side:THREE.DoubleSide});
 const stripes=[];const stripe=(points,width=.09)=>stripes.push(createRoadRibbonGeometry(points,width,{offset:.125}));
 for(const stop of EXPLORATION_ROUTES){
  for(const [width,mat,edge] of [[5,gravel,5.2],[3.4,asphalt,4.2]]){const source=createRoadRibbonGeometry(stop.turnLane,width,{offset:mat===asphalt?.09:.06}),g=clipRibbonOutsideRoad(source,roadPoints,edge);source.dispose();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;m.name=stop.label+' tapered turn lane';group.add(m);}
  const outer=stop.turnLane.map((p,i,a)=>{const prev=a[Math.max(0,i-1)],next=a[Math.min(a.length-1,i+1)],dx=next.x-prev.x,dz=next.z-prev.z,l=Math.hypot(dx,dz);return {x:p.x-dz/l*1.55,z:p.z+dx/l*1.55};});
  for(let i=1;i<outer.length;i++){if(Math.hypot(outer[i].x-stop.points[0].x,outer[i].z-stop.points[0].z)>7)stripe([outer[i-1],outer[i]]);}
  // Broken entry divider and right-turn arrow point into the lakeside branch.
  for(let i=14;i<32;i+=4){const p=stop.turnLane[i],q=stop.turnLane[i+2],dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz);stripe([{x:p.x+dz/l*1.6,z:p.z-dx/l*1.6},{x:q.x+dz/l*1.6,z:q.z-dx/l*1.6}]);}
  const p=stop.turnLane[28],q=stop.turnLane[29],dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz),tx=dx/l,tz=dz/l,rx=-tz,rz=tx;
  const arrow=(forward,right)=>({x:p.x+tx*forward+rx*right,z:p.z+tz*forward+rz*right});
  stripe([arrow(-3,0),arrow(1,0),arrow(1,1.2)],.23);stripe([arrow(.3,.6),arrow(1,1.2),arrow(1.7,.6)],.23);

  const control=turnoffStopPlacement(stop.points,stop.label,stop.width/2),outX=Math.cos(control.rotation),outZ=-Math.sin(control.rotation),a={x:control.x-outX*(stop.width/2+1.6),z:control.z-outZ*(stop.width/2+1.6)};
  stripe([{x:a.x,z:a.z},{x:a.x+outX*2.8,z:a.z+outZ*2.8}],.3);
  const ribbon=createRoadRibbonGeometry(stop.points,stop.width,{offset:.10}),trimmed=clipRibbonOutsideRoad(ribbon,roadPoints,4.25);ribbon.dispose();
  // Keep the complete strip and lift the apron 2 cm: tiny overlap, matching gravel grain.
  const mesh=new THREE.Mesh(trimmed,gravel);mesh.receiveShadow=true;mesh.name=stop.label+' access';group.add(mesh);
  const disc=new THREE.CircleGeometry(stop.turnRadius,64,0,Math.PI*2);disc.rotateX(-Math.PI/2);disc.translate(stop.end.x,0,stop.end.z);
  const positions=disc.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,terrainHeight(x,z)+.12);disc.attributes.uv.setXY(i,x/2,z/2);}disc.computeVertexNormals();
  const apron=new THREE.Mesh(disc,gravel);apron.receiveShadow=true;apron.name=stop.label+' turn-around';group.add(apron);
  // Furnishings sit beyond the full turning circle, facing the lake.
  const furniture=new THREE.Group(),x=stop.end.x+stop.nx*15,z=stop.end.z+stop.nz*15;furniture.position.set(x,terrainHeight(x,z),z);furniture.rotation.y=Math.atan2(stop.nx,stop.nz);group.add(furniture);
  if(stop.id==='picnic'){
   box(furniture,[2.5,.12,1.15],[0,.85,0]);for(const side of [-1,1]){box(furniture,[2.5,.1,.3],[0,.48,side*.9]);for(const end of [-1,1])box(furniture,[.12,.85,.12],[end*.9,.42,side*.42],metal);}
  }else{
   box(furniture,[2.8,.12,.5],[0,.52,0]);box(furniture,[2.8,.5,.1],[0,.94,-.24]);for(const side of [-1,1])box(furniture,[.13,.55,.45],[side*1.1,.26,0],metal);
  }
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#29483b';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#d7cfad';ctx.lineWidth=5;ctx.strokeRect(10,10,492,236);ctx.fillStyle='#f4ecd3';ctx.textAlign='center';ctx.font='bold 35px sans-serif';ctx.fillText(stop.label,256,78);ctx.font='25px sans-serif';ctx.fillText('SLOW TO DISCOVER',256,135);ctx.fillText('TURN AROUND • LAKE LOOP',256,192);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.9,side:THREE.DoubleSide});mat.userData.keepColorMap=true;
  const sign=new THREE.Group();sign.position.set(stop.end.x-stop.nz*14,terrainHeight(stop.end.x-stop.nz*14,stop.end.z+stop.nx*14),stop.end.z+stop.nx*14);sign.rotation.y=Math.atan2(-stop.nx,-stop.nz);box(sign,[.12,2.7,.12],[0,1.35,0]);const board=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.4),mat);board.position.y=2.2;sign.add(board);group.add(sign);
 }
 const markings=new THREE.Mesh(mergeGeometries(stripes),paint);markings.name='Turn-pocket arrows, dividers and stop bars';markings.receiveShadow=true;group.add(markings);stripes.forEach(g=>g.dispose());
 return group;
}

/** Extra signs use the integrator's US sign renderer, without replacing its sign set. */
export function explorationSigns(){
 return EXPLORATION_ROUTES.flatMap(r=>[
  ...[1,-1].map(direction=>{const angle=r.angle-direction*.10,p=roadPoint(angle),q=roadPoint(angle+.001),dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz),setback=direction===1?11:7;return {kind:'guide',title:r.label,subtitle:direction===1?'GRAVEL  →':'←  GRAVEL',x:p.x-dz/len*setback*direction,z:p.z+dx/len*setback*direction,rotation:Math.atan2(-dx*direction,-dz*direction)};}),
  turnoffStopPlacement(r.points,r.label,r.width/2)
 ]);
}
