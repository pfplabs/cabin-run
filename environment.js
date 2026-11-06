import {gorgeHeight} from './waterfall-bridge.js';
import {shorelineScale} from './shoreline.js';
import * as THREE from 'three';
import {createRockMaterial,createGraniteGeometry} from './landscape-materials.js';
import {clipRibbonOutsideRoad,createGravelMaterial} from './road-surfaces.js';
import {LAKE,WORLD,terrainHeight,mountainHeight,backdropHeight,waterfallHill,lakeRadius,roadOffset,roadPoint,TUNNEL,PARKING,PARKING_APRON,DRIVEWAY,EXPLORATION_ROUTES} from './engine.js';

const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function landscapeHeight(x,z){
 const lake=lakeRadius(x,z);
 const shoreInner=1-3.42/LAKE.rz,shoreOuter=1+3.99/LAKE.rz;
 if(lake<shoreInner)return -3;
 if(lake<shoreOuter)return THREE.MathUtils.lerp(-3,terrainHeight(x,z),smooth(shoreInner,shoreOuter,lake));
 const outer=Math.hypot(x/WORLD.roadRadius,(z-WORLD.centerZ)/WORLD.roadRadius);
 const roadGround=terrainHeight(x,z),backdrop=outer<1.17?-Infinity:backdropHeight(x,z);
 const natural=Math.max(roadGround,mountainHeight(x,z),waterfallHill(x,z),backdrop);
 // Keep the paved surface exact even where the pass traverses the outer hills.
 const blend=smooth(6,35,Math.abs(roadOffset(x,z))),height=THREE.MathUtils.lerp(roadGround,natural,blend);
 // Uphill tunnel bedrock begins just outside the clear driving envelope.
 const angle=Math.atan2(x,WORLD.centerZ-z);
 const covered=angle>=TUNNEL.startAngle-.06&&angle<=TUNNEL.endAngle+.06?Math.max(height,mountainHeight(x,z)):height;
 return gorgeHeight(x,z,covered);
}

/** Shore-focused annular topology keeps the water edge smooth without a huge grid. */
export function createLandscapeGeometry(){
 // Keep fine angular samples around the cabin; the distant shore needs half as many.
 const angularSteps=1920,angles=[];for(let i=0;i<=angularSteps;i++){const a=i/angularSteps*Math.PI*2,wrapped=Math.atan2(Math.sin(a),Math.cos(a));if((i%3===0&&EXPLORATION_ROUTES.some(r=>Math.abs(wrapped-r.angle)<.045))||i%6===0||(wrapped>-.8&&wrapped<.16)||(wrapped>.38&&wrapped<2.95&&i%3===0))angles.push(a);}
 const segments=angles.length-1,positions=[],uvs=[],colors=[],indices=[];
 const sections=[],shoreOuter=1+3.99/LAKE.rz;
 for(const r of [0,.88,.94,1-3.42/LAKE.rz,1-1.71/LAKE.rz,1,1+1.71/LAKE.rz,shoreOuter])sections.push({kind:'lake',r});
 // Resolve the carved driveway and parking apron rather than bridging them with long triangles.
 for(let i=1;i<=128;i++)sections.push({kind:'inland',t:i/128});
 for(const offset of [-40,-30,-24,-20,-18,-16,-14,-12,-10,-8,-6.5,-5.2,-4.2,0,4.2,5.2,6.5,10,16,25,40])sections.push({kind:'road',offset});
 for(const r of [1.075,1.12,1.17,1.24,1.34,1.48,1.65,1.85,2.1,2.25,2.45,2.9,3.5])sections.push({kind:'outer',r});
 const c=new THREE.Color();
 for(let row=0;row<sections.length;row++){
  const section=sections[row];
  for(let i=0;i<=segments;i++){
   const a=angles[i],shore=shorelineScale(a),sa=Math.sin(a),ca=Math.cos(a),route=roadPoint(a),roadR=Math.hypot(route.x,route.z-WORLD.centerZ);
   let x,z;
   if(section.kind==='lake'){x=LAKE.rx*shore*section.r*sa;z=LAKE.z-LAKE.rz*shore*section.r*ca;}
   else if(section.kind==='inland'){x=THREE.MathUtils.lerp(LAKE.rx*shore*shoreOuter,roadR-40,section.t)*sa;z=THREE.MathUtils.lerp(LAKE.z-LAKE.rz*shore*shoreOuter*ca,WORLD.centerZ-(roadR-40)*ca,section.t);}
   else {const r=section.kind==='road'?roadR+section.offset:roadR+(section.r-1)*WORLD.roadRadius;x=r*sa;z=WORLD.centerZ-r*ca;}
   const y=landscapeHeight(x,z),lr=lakeRadius(x,z);
   positions.push(x,y,z);uvs.push((x+650)/1300,(z-WORLD.centerZ+650)/1300);
   c.set(lr<shoreOuter?0xb8b196:y>66?0xc4c5c0:y>26?0x9ca393:0xffffff);colors.push(c.r,c.g,c.b);
   if(row<sections.length-1&&i<segments){const n=row*(segments+1)+i;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.userData.gridColumns=segments+1;g.userData.gridRows=sections.length;g.userData.tileBands=[0,...['lake','inland','road'].map(kind=>sections.findLastIndex(s=>s.kind===kind)),sections.length-7,sections.length-1];return g;
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
 const rockGeometry=createGraniteGeometry({detail:3});
 const rocks=new THREE.InstancedMesh(rockGeometry,createRockMaterial(),700);
 for(let i=0;i<700;i++){
  const a=random()*Math.PI*2,r=1+(-.34+random()*4)/LAKE.rz,x=LAKE.rx*shorelineScale(a)*r*Math.sin(a),z=LAKE.z-LAKE.rz*shorelineScale(a)*r*Math.cos(a),s=.24+random()**2*1.8;
  transform.position.set(x,Math.max(-.22,landscapeHeight(x,z))-.15,z);transform.rotation.set(random()*.5,random()*6.28,random()*.4);transform.scale.set(s*(1+random()*.7),s*.55,s*(.7+random()*.5));transform.updateMatrix();rocks.setMatrixAt(i,transform.matrix);
  color.setHSL(.11,.018+random()*.025,.80+random()*.16);rocks.setColorAt(i,color);
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
 const reeds=new THREE.InstancedMesh(blades,new THREE.MeshStandardMaterial({color:0x737e45,roughness:1,side:THREE.DoubleSide}),3000);
 for(let i=0;i<3000;i++){
  const a=random()*Math.PI*2,r=1+(3.65+random()*2.05)/LAKE.rz,x=LAKE.rx*shorelineScale(a)*r*Math.sin(a),z=LAKE.z-LAKE.rz*shorelineScale(a)*r*Math.cos(a),s=.4+random()*.9;
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

/** Carved stone vault with a clear driving envelope and real lake-view apertures. */
export function createMountainTunnel(){
 const group=new THREE.Group();group.name='North ridge traversable tunnel';
 const rings=72,arcSteps=24,springHeight=3.8,sillHeight=.85,openingHeight=3.55;
 const windows=[[12,20],[32,40],[52,60]],inner=[],outer=[],uv=[],indices=[],portals=[],reveals=[],feet=[];
 // Vertical walls keep the full jeep/head/camera envelope clear. Only the vault
 // above 3.8 m curves inward; surface relief never displaces this geometry.
 const cross=[{x:TUNNEL.innerHalfWidth,y:-.35,outerY:-1.2},{x:TUNNEL.innerHalfWidth,y:sillHeight,outerY:-.3},{x:TUNNEL.innerHalfWidth,y:openingHeight,outerY:4.4}];
 for(let i=0;i<=arcSteps;i++){
  const a=i/arcSteps*Math.PI;
  cross.push({x:TUNNEL.innerHalfWidth*Math.cos(a),y:springHeight+(TUNNEL.height-springHeight)*Math.sin(a),outerY:5+5.9*Math.sin(a)});
 }
 cross.push({x:-TUNNEL.innerHalfWidth,y:openingHeight,outerY:4.4},{x:-TUNNEL.innerHalfWidth,y:sillHeight,outerY:-.3},{x:-TUNNEL.innerHalfWidth,y:-.35,outerY:-1.2});
 const count=cross.length,lakeBand=count-3,angleAt=j=>THREE.MathUtils.lerp(TUNNEL.startAngle,TUNNEL.endAngle,j/rings);
 for(let j=0;j<=rings;j++){
  const a=angleAt(j),c=roadPoint(a),sx=Math.sin(a),sz=-Math.cos(a);
  for(let i=0;i<count;i++){
   const q=cross[i],outerX=q.x/TUNNEL.innerHalfWidth*TUNNEL.outerHalfWidth;
   // Break the extruded arch silhouette with broad weathered rock shoulders.
   // Relief fades to zero at the walls, preserving the measured aperture edges
   // and the full inner bore. Reuse these vertices for every closing face.
   const crown=i>=3&&i<=arcSteps+3?Math.sin((i-3)/arcSteps*Math.PI)**2:0;
   const relief=crown*(1.8+1.1*Math.sin(j*.31+i*.23)+.55*Math.sin(j*.83-i*.37));
   inner.push(c.x+sx*q.x,c.y+q.y,c.z+sz*q.x);outer.push(c.x+sx*outerX,Math.max(c.y+q.outerY+relief,q.x>0&&i>=3&&i<=arcSteps+3?landscapeHeight(c.x+sx*outerX,c.z+sz*outerX):-Infinity),c.z+sz*outerX);uv.push(j*.85,i*.35);
   // Remove both stone skins, rather than drawing a transparent window over a wall.
   const aperture=i===lakeBand&&windows.some(([start,end])=>j>=start&&j<end);
   if(j<rings&&i<count-1&&!aperture){const n=j*count+i;indices.push(n,n+1,n+count,n+1,n+count+1,n+count);}
  }
 }
 const rock=createRockMaterial({relief:.85}),carvedRock=createRockMaterial({color:0xf1f0e8,relief:.22});
 function mesh(positions,material,name,index=null,textureUV=null){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(textureUV)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(textureUV,2));if(index)geometry.setIndex(index);
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const object=new THREE.Mesh(geometry,material);object.name=name;object.castShadow=object.receiveShadow=true;group.add(object);return object;
 }
 mesh(inner,carvedRock,'Carved tunnel interior',indices,uv);mesh(outer,rock,'Continuous ridge exterior',indices,uv);
 const vertex=(positions,j,i)=>positions.slice((j*count+i)*3,(j*count+i)*3+3);
 const quad=(positions,a,b,c,d)=>positions.push(...a,...b,...c,...a,...c,...d);
 for(const j of [0,rings])for(let i=0;i<count-1;i++)quad(portals,vertex(inner,j,i),vertex(inner,j,i+1),vertex(outer,j,i+1),vertex(outer,j,i));
 mesh(portals,carvedRock,'Open tunnel portal stone');
 for(const [start,end] of windows){
  // Real 5.6 m-deep jambs plus splayed sill/header reveal the wall thickness.
  // The exterior sill drops below road level, preserving the downhill lake view.
  for(const j of [start,end])quad(reveals,vertex(inner,j,lakeBand),vertex(inner,j,lakeBand+1),vertex(outer,j,lakeBand+1),vertex(outer,j,lakeBand));
  for(let j=start;j<end;j++)for(const i of [lakeBand,lakeBand+1])quad(reveals,vertex(inner,j,i),vertex(outer,j,i),vertex(outer,j+1,i),vertex(inner,j+1,i));
 }
 mesh(reveals,carvedRock,'Lake opening stone jambs sills and headers');
 for(let j=0;j<rings;j++)for(const i of [0,count-1])quad(feet,vertex(inner,j,i),vertex(outer,j,i),vertex(outer,j+1,i),vertex(inner,j+1,i));
 mesh(feet,rock,'Tunnel wall foundations');
 // Shoulder rocks are decoration outside the entire vault, never part of its
 // interior. Avoid pitch/roll and keep their full radial extent well clear.
 const outcropGeometry=createGraniteGeometry(),outcrops=new THREE.InstancedMesh(outcropGeometry,rock,12),placement=new THREE.Object3D();
 outcrops.name='Exterior ridge shoulders';
 for(let j=0;j<6;j++)for(const side of [-1,1]){
  const a=angleAt(j*rings/5),c=roadPoint(a),distance=27+Math.sin(j*2.4)*1.2;
  const x=c.x+Math.sin(a)*distance*side,z=c.z-Math.cos(a)*distance*side;
  // Low lake-side stone follows the descending terrain instead of forming a
  // second opaque wall in front of the viewing apertures.
  placement.position.set(x,side<0?landscapeHeight(x,z)+.15:c.y-20,z);placement.rotation.set(0,-a,0);
  // Tall outward bedrock is buried into the ridge, not suspended above its slope.
  placement.scale.set(side<0?10.5:12.5,side<0?1.6:28+Math.sin(j*1.7),side<0?4:9);
  placement.updateMatrix();outcrops.setMatrixAt(j*2+(side>0?1:0),placement.matrix);
 }
 outcrops.castShadow=outcrops.receiveShadow=true;group.add(outcrops);
 group.userData.tunnel={clearHalfWidth:TUNNEL.innerHalfWidth,verticalClearance:springHeight,roofHeight:TUNNEL.height,openings:windows.map(([start,end])=>({startAngle:angleAt(start),endAngle:angleAt(end),innerOffset:-TUNNEL.innerHalfWidth,outerOffset:-TUNNEL.outerHalfWidth,sillHeight,headHeight:openingHeight,outerSillHeight:-.3,outerHeadHeight:4.4}))};
 const lampMaterial=new THREE.MeshStandardMaterial({color:0xffecd0,emissive:0xffc88a,emissiveIntensity:2});
 for(let j=0;j<4;j++){
  const a=THREE.MathUtils.lerp(TUNNEL.startAngle,TUNNEL.endAngle,(j+.5)/4),c=roadPoint(a);
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(.8,.08,.22),lampMaterial);lamp.name='Tunnel ceiling lamp';lamp.rotation.y=-a;lamp.position.set(c.x,c.y+TUNNEL.height-.15,c.z);group.add(lamp);
  const light=new THREE.PointLight(0xffe3ba,30,19,2);light.position.copy(lamp.position).add(new THREE.Vector3(0,-.2,0));group.add(light);
 }
 return group;
}
export function createParkingLot(){
 const group=new THREE.Group();group.name='Cabin side-road parking';
 const apron=PARKING_APRON,ground=new THREE.PlaneGeometry(apron.width,apron.length,18,26);ground.rotateX(-Math.PI/2);ground.translate(apron.x,0,apron.z);
 const p=ground.attributes.position,uv=ground.attributes.uv;
 for(let i=0;i<p.count;i++){
  // Rounded gravel corners and the same two-metre texture repeat as shoulders.
  let x=p.getX(i),z=p.getZ(i),dx=x-apron.x,dz=z-apron.z;
  const qx=Math.max(Math.abs(dx)-(apron.width/2-apron.cornerRadius),0),qz=Math.max(Math.abs(dz)-(apron.length/2-apron.cornerRadius),0),r=Math.hypot(qx,qz);
  if(r>apron.cornerRadius){x-=Math.sign(dx)*qx*(1-apron.cornerRadius/r);z-=Math.sign(dz)*qz*(1-apron.cornerRadius/r);}
  p.setXYZ(i,x,terrainHeight(x,z)+.08,z);uv.setXY(i,x/2,z/2);
 }
 ground.computeVertexNormals();
 const gravel=new THREE.Mesh(clipRibbonOutsideRoad(ground,DRIVEWAY,2.25),createGravelMaterial());ground.dispose();gravel.receiveShadow=true;group.add(gravel);
 const paint=new THREE.MeshStandardMaterial({color:0xdedbc4,roughness:1,transparent:true,opacity:.82});
 for(const bay of PARKING){
  // Bays face the straight north/south access aisle, never across the asphalt.
  for(const side of [-1,1]){const z=bay.z+side*bay.width/2,line=new THREE.Mesh(new THREE.BoxGeometry(bay.length,.025,.09),paint);line.position.set(bay.x,terrainHeight(bay.x,z)+.11,z);group.add(line);}
  const back=new THREE.Mesh(new THREE.BoxGeometry(.09,.025,bay.width),paint);back.position.set(bay.x+bay.length/2,terrainHeight(bay.x+bay.length/2,bay.z)+.11,bay.z);group.add(back);
 }
 return group;
}

/** Adaptive terrain tiles share vertex buffers and cull separately in every render pass. */
export function createLandscapeTiles(source){
 const columns=source.userData.gridColumns,rows=source.userData.gridRows;
 if(!columns||!rows)throw new TypeError('Expected landscape grid geometry');
 const bands=(source.userData.tileBands||[0,7,135,150,156,rows-1]).filter((v,i,a)=>v<rows&&(i===0||v>a[i-1])),tiles=[],point=new THREE.Vector3();
 for(let col=0;col<columns-1;col+=64)for(let band=1;band<bands.length;band++){
  const index=[],box=new THREE.Box3();
  for(let row=bands[band-1];row<bands[band];row++)for(let c=col;c<Math.min(columns-1,col+64);c++){
   const start=(row*(columns-1)+c)*6;
   for(let k=0;k<6;k++){const vertex=source.index.getX(start+k);index.push(vertex);point.fromBufferAttribute(source.attributes.position,vertex);box.expandByPoint(point);}
  }
  if(!index.length)continue;
  const g=new THREE.BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes))g.setAttribute(name,attribute);g.setIndex(index);g.boundingBox=box;g.boundingSphere=box.getBoundingSphere(new THREE.Sphere());tiles.push(g);
 }
 return tiles;
}

