import * as THREE from 'three';
import {LAKE,WORLD,terrainHeight,roadPoint,TUNNEL,PARKING} from './engine.js';

const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function landscapeHeight(x,z){
 const lake=Math.hypot(x/LAKE.rx,(z-LAKE.z)/LAKE.rz);
 if(lake<.97)return -3;
 if(lake<1.035)return THREE.MathUtils.lerp(-3,terrainHeight(x,z),smooth(.97,1.035,lake));
 const outer=Math.hypot(x/WORLD.roadRadius,(z-WORLD.centerZ)/WORLD.roadRadius);
 if(outer<1.17)return terrainHeight(x,z);
 const rise=outer-1.17;
 return Math.max(terrainHeight(x,z),1+rise*37+Math.pow(rise,1.35)*24+Math.sin(x*.028)*Math.cos(z*.025)*Math.min(23,rise*22));
}

/** Shore-focused annular topology keeps the water edge smooth without a huge grid. */
export function createLandscapeGeometry(){
 // Keep fine angular samples around the cabin; the distant shore needs half as many.
 const angles=[];for(let i=0;i<=640;i++){const a=i/640*Math.PI*2;if(i%2===0||a<.9||a>Math.PI*2-.9)angles.push(a);}
 const segments=angles.length-1,positions=[],uvs=[],colors=[],indices=[];
 const sections=[];
 for(const r of [0,.88,.94,.97,.985,1,1.015,1.035])sections.push({kind:'lake',r});
 // Resolve the carved driveway and parking apron rather than bridging them with long triangles.
 for(let i=1;i<=48;i++)sections.push({kind:'inland',t:i/48});
 for(const offset of [-4,-3.5,0,3.5,4,6])sections.push({kind:'road',offset});
 for(const r of [1.075,1.12,1.17,1.24,1.34,1.48,1.65,1.85,2.1,2.45,2.9,3.5])sections.push({kind:'outer',r});
 const c=new THREE.Color();
 for(let row=0;row<sections.length;row++){
  const section=sections[row];
  for(let i=0;i<=segments;i++){
   const a=angles[i],sa=Math.sin(a),ca=Math.cos(a),route=roadPoint(a),roadR=Math.hypot(route.x,route.z-WORLD.centerZ);
   let x,z;
   if(section.kind==='lake'){x=LAKE.rx*section.r*sa;z=LAKE.z-LAKE.rz*section.r*ca;}
   else if(section.kind==='inland'){x=THREE.MathUtils.lerp(LAKE.rx*1.035,roadR-6,section.t)*sa;z=THREE.MathUtils.lerp(LAKE.z-LAKE.rz*1.035*ca,WORLD.centerZ-(roadR-6)*ca,section.t);}
   else {const r=section.kind==='road'?roadR+section.offset:roadR*section.r;x=r*sa;z=WORLD.centerZ-r*ca;}
   const y=landscapeHeight(x,z),lr=Math.hypot(x/LAKE.rx,(z-LAKE.z)/LAKE.rz);
   positions.push(x,y,z);uvs.push((x+650)/1300,(z-WORLD.centerZ+650)/1300);
   c.set(lr<1.035?0xb8b196:y>66?0xc4c5c0:y>26?0x9ca393:0xffffff);colors.push(c.r,c.g,c.b);
   if(row<sections.length-1&&i<segments){const n=row*(segments+1)+i;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createAsphaltMaps(){
 let seed=61;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const c=document.createElement('canvas');c.width=c.height=512;const context=c.getContext('2d'),data=context.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const i=(y*512+x)*4,grain=random()*31,patch=Math.sin(x*.032+Math.sin(y*.027))*4;
  data.data[i]=39+grain+patch;data.data[i+1]=41+grain+patch;data.data[i+2]=40+grain+patch;data.data[i+3]=255;
 }
 context.putImageData(data,0,0);
 for(let i=0;i<3500;i++){context.fillStyle=random()>.5?'#84868055':'#101b1855';context.fillRect(random()*512,random()*512,1+random()*2,1+random()*2);}
 const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 const bump=texture.clone();bump.colorSpace=THREE.NoColorSpace;return {map:texture,bumpMap:bump,bumpScale:.018,roughness:.94};
}

/** Instanced natural edge detail stays outside the driving corridor. */
export function createLakeDetails(){
 const group=new THREE.Group();group.name='Shoreline detail';let seed=1986;
 const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const transform=new THREE.Object3D(),color=new THREE.Color();
 const rockGeometry=new THREE.IcosahedronGeometry(1,2),vertices=rockGeometry.attributes.position;
 for(let i=0;i<vertices.count;i++){
  const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),f=1+.11*Math.sin(x*8+z*4)*Math.cos(y*7);
  vertices.setXYZ(i,x*f,y*f,z*f);
 }rockGeometry.computeVertexNormals();
 const rocks=new THREE.InstancedMesh(rockGeometry,new THREE.MeshStandardMaterial({color:0x777d77,roughness:.87,metalness:0}),330);
 for(let i=0;i<330;i++){
  const a=random()*Math.PI*2,r=.997+random()*.035,x=LAKE.rx*r*Math.sin(a),z=LAKE.z-LAKE.rz*r*Math.cos(a),s=.24+random()**2*1.8;
  transform.position.set(x,Math.max(-.22,landscapeHeight(x,z))-.15,z);transform.rotation.set(random()*.5,random()*6.28,random()*.4);transform.scale.set(s*(1+random()*.7),s*.55,s*(.7+random()*.5));transform.updateMatrix();rocks.setMatrixAt(i,transform.matrix);
  color.setHSL(.11,.035+random()*.055,.22+random()*.2);rocks.setColorAt(i,color);
 }rocks.castShadow=rocks.receiveShadow=true;group.add(rocks);
 // Individual curved blades make reeds and grasses three-dimensional from any view.
 const p=[],ix=[];
 for(let blade=0;blade<7;blade++){
  const angle=blade/7*Math.PI*2,h=.65+random()*.5,w=.022+random()*.014,base=p.length/3;
  for(let j=0;j<4;j++){
   const t=j/3,bend=t*t*.28;
   for(const side of [-1,1])p.push(Math.cos(angle)*bend+Math.sin(angle)*w*(1-t)*side,t*h,Math.sin(angle)*bend-Math.cos(angle)*w*(1-t)*side);
   if(j<3){const n=base+j*2;ix.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
 }
 const blades=new THREE.BufferGeometry();blades.setAttribute('position',new THREE.Float32BufferAttribute(p,3));blades.setIndex(ix);blades.computeVertexNormals();
 const reeds=new THREE.InstancedMesh(blades,new THREE.MeshStandardMaterial({color:0x737e45,roughness:1,side:THREE.DoubleSide}),1800);
 for(let i=0;i<1800;i++){
  const a=random()*Math.PI*2,r=1.032+random()*.018,x=LAKE.rx*r*Math.sin(a),z=LAKE.z-LAKE.rz*r*Math.cos(a),s=.4+random()*.9;
  transform.position.set(x,landscapeHeight(x,z)-.04,z);transform.rotation.set(0,random()*6.28,0);transform.scale.set(s,s,s);transform.updateMatrix();reeds.setMatrixAt(i,transform.matrix);
  color.setHSL(.17+random()*.08,.17+random()*.2,.18+random()*.12);reeds.setColorAt(i,color);
 }reeds.receiveShadow=true;group.add(reeds);
 return group;
}

export function createSandbarGeometry(){
 const p=[],uv=[],colors=[],indices=[];const lengthSegments=72,widthSegments=18;
 for(let i=0;i<=lengthSegments;i++)for(let j=0;j<=widthSegments;j++){
  const u=i/lengthSegments,v=j/widthSegments*2-1,width=.25+5.4*Math.pow(Math.sin(u*Math.PI),.65);
  const x=35+u*27-v*width*.47,z=9+u*23+Math.sin(u*Math.PI)*2+v*width*.88;
  const h=.29*Math.sin(u*Math.PI)*(1-v*v)-.16*v*v;
  p.push(x,h,z);uv.push(u*5,(v+1)/2);const wet=smooth(-.06,.18,h);colors.push(.48+wet*.34,.46+wet*.32,.38+wet*.25);
  if(i<lengthSegments&&j<widthSegments){const n=i*(widthSegments+1)+j;indices.push(n,n+1,n+widthSegments+1,n+1,n+widthSegments+2,n+widthSegments+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createSandbar(){
 const material=new THREE.MeshStandardMaterial({color:0xf1e3bb,roughness:1,vertexColors:true,side:THREE.DoubleSide});
 material.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSand;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSand=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSand;').replace('#include <color_fragment>',`#include <color_fragment>
   float sandGrain=fract(sin(dot(floor(vSand.xz*95.),vec2(12.9898,78.233)))*43758.5453);
   float ripples=sin(vSand.x*7.5+vSand.z*4.1+sin(vSand.x*1.2));
   diffuseColor.rgb*=.88+sandGrain*.16+ripples*.025;
  `);
 };
 const sand=new THREE.Mesh(createSandbarGeometry(),material);sand.name='Rocky shore sandbar';sand.receiveShadow=true;return sand;
}

/** A continuous arched volume with an empty, open-ended interior. */
export function createMountainTunnel(){
 const group=new THREE.Group();group.name='North ridge traversable tunnel';
 const rings=32,arcSteps=24,inner=[],outer=[],uv=[],indices=[],portals=[];
 const cross=[{x:TUNNEL.innerHalfWidth,y:0}];
 for(let i=0;i<=arcSteps;i++){const a=i/arcSteps*Math.PI;cross.push({x:TUNNEL.innerHalfWidth*Math.cos(a),y:1.6+(TUNNEL.height-1.6)*Math.sin(a)});}
 cross.push({x:-TUNNEL.innerHalfWidth,y:0});
 const count=cross.length;
 for(let j=0;j<=rings;j++){
  const a=THREE.MathUtils.lerp(TUNNEL.startAngle,TUNNEL.endAngle,j/rings),c=roadPoint(a),prev=roadPoint(a-.001),next=roadPoint(a+.001),heading=Math.atan2(next.x-prev.x,prev.z-next.z),side=new THREE.Vector3(Math.sin(a),0,-Math.cos(a));
  for(let i=0;i<count;i++){
   const q=cross[i],height=q.y,outerX=q.x/TUNNEL.innerHalfWidth*TUNNEL.outerHalfWidth;
   const outerY=height<.1?-.8:1.6+(height-1.6)*2.05+.6*Math.sin(i*2.8+j*.9);
   inner.push(c.x+side.x*q.x,c.y+height,c.z+side.z*q.x);outer.push(c.x+side.x*outerX,c.y+outerY,c.z+side.z*outerX);uv.push(j*2/3,i*.4);
   if(j<rings&&i<count-1){const n=j*count+i;indices.push(n,n+1,n+count,n+1,n+count+1,n+count);}
  }
 }
 function shell(positions,material){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const o=new THREE.Mesh(g,material);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 const rock=new THREE.MeshStandardMaterial({color:0x858a80,roughness:.97,side:THREE.DoubleSide});
 rock.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRock;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRock=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRock;').replace('#include <color_fragment>',`#include <color_fragment>
  float grains=fract(sin(dot(floor(vRock*17.),vec3(12.9,78.2,37.7)))*43758.5);
  diffuseColor.rgb*=.80+.30*grains+.06*sin(vRock.x*2.1+vRock.y*3.8);
 `);};
 shell(inner,rock);shell(outer,rock);
 for(const j of [0,rings])for(let i=0;i<count-1;i++){
  const a=(j*count+i)*3,b=a+3;
  for(const p of [[inner,a],[inner,b],[outer,b],[inner,a],[outer,b],[outer,a]])portals.push(...p[0].slice(p[1],p[1]+3));
 }
 const capGeometry=new THREE.BufferGeometry();capGeometry.setAttribute('position',new THREE.Float32BufferAttribute(portals,3));capGeometry.computeVertexNormals();const caps=new THREE.Mesh(capGeometry,rock);caps.castShadow=caps.receiveShadow=true;group.add(caps);
 // Irregular rock shoulders join the shell into a ridge instead of a freestanding arch.
 const outcropGeometry=new THREE.IcosahedronGeometry(1,2),outcropPositions=outcropGeometry.attributes.position;
 for(let i=0;i<outcropPositions.count;i++){const x=outcropPositions.getX(i),y=outcropPositions.getY(i),z=outcropPositions.getZ(i),r=1+.08*Math.sin(x*7+y*3)*Math.cos(z*8);outcropPositions.setXYZ(i,x*r,y*r,z*r);}outcropGeometry.computeVertexNormals();
 const outcrops=new THREE.InstancedMesh(outcropGeometry,new THREE.MeshStandardMaterial({color:0x7c8177,roughness:1}),12),placement=new THREE.Object3D();
 for(let j=0;j<6;j++)for(let side of [-1,1]){
  const a=THREE.MathUtils.lerp(TUNNEL.startAngle,TUNNEL.endAngle,j/5),c=roadPoint(a),distance=17+Math.sin(j*2.4)*1.2;
  placement.position.set(c.x+Math.sin(a)*distance*side,c.y+1.7,c.z-Math.cos(a)*distance*side);placement.rotation.set(.12*Math.sin(j),-a,.1*side);placement.scale.set(9.8,8.8+Math.sin(j*1.7),12.5);placement.updateMatrix();outcrops.setMatrixAt(j*2+(side>0?1:0),placement.matrix);
 }outcrops.castShadow=outcrops.receiveShadow=true;group.add(outcrops);
 const lampMaterial=new THREE.MeshStandardMaterial({color:0xffecd0,emissive:0xffc88a,emissiveIntensity:2});
 for(let j=0;j<4;j++){
  const c=roadPoint(THREE.MathUtils.lerp(TUNNEL.startAngle,TUNNEL.endAngle,(j+.5)/4));
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(.8,.08,.22),lampMaterial);lamp.position.set(c.x,c.y+TUNNEL.height-.15,c.z);group.add(lamp);
  const light=new THREE.PointLight(0xffe3ba,30,19,2);light.position.copy(lamp.position).add(new THREE.Vector3(0,-.2,0));group.add(light);
 }
 return group;
}

export function createParkingLot(){
 const group=new THREE.Group();group.name='Cabin side-road parking';
 const ground=new THREE.PlaneGeometry(20.5,14.5,14,10);ground.rotateX(-Math.PI/2);ground.translate(-16,0,-10);
 const p=ground.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(p.getX(i),p.getZ(i))+.08);ground.computeVertexNormals();
 const gravel=new THREE.Mesh(ground,new THREE.MeshStandardMaterial({color:0x8c8f7d,roughness:1,bumpMap:createAsphaltMaps().bumpMap,bumpScale:.035}));gravel.receiveShadow=true;group.add(gravel);
 const paint=new THREE.MeshStandardMaterial({color:0xdedbc4,roughness:1,transparent:true,opacity:.82});
 for(const bay of PARKING){
  for(const side of [-1,1]){const x=bay.x+side*bay.width/2,line=new THREE.Mesh(new THREE.BoxGeometry(.09,.025,bay.length),paint);line.position.set(x,terrainHeight(x,bay.z)+.11,bay.z);group.add(line);}
  const back=new THREE.Mesh(new THREE.BoxGeometry(bay.width,.025,.09),paint);back.position.set(bay.x,terrainHeight(bay.x,bay.z-bay.length/2)+.11,bay.z-bay.length/2);group.add(back);
 }
 return group;
}
