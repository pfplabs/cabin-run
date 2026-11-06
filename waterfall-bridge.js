import * as THREE from 'three';
import {BRIDGE,roadPoint} from './engine.js';
import {createRockMaterial,createGraniteGeometry} from './landscape-materials.js';

const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export const WATERCOURSE={mouthZ:698,headZ:1020,halfWidth:7};
export function streamCenter(z){return 5*Math.sin((z-916)*.028)*smooth((1020-z)/80);}
/** Bed is independent of the elevated roadway: no invisible land under the bridge. */
export function streamHeight(z){
 const knots=[[698,.12],[770,1.3],[916,5.5],[954,7],[974,11],[986,25],[992,48],[1003,55],[1020,58]];
 if(z<=knots[0][0])return knots[0][1];
 for(let i=1;i<knots.length;i++)if(z<=knots[i][0]){const a=knots[i-1],b=knots[i];return a[1]+(b[1]-a[1])*(z-a[0])/(b[0]-a[0]);}
 return 58;
}
export function gorgeHeight(x,z,baseHeight){
 if(z<688||z>1038)return baseHeight;
 const cross=1-smooth((Math.abs(x-streamCenter(z))-8)/19),ends=smooth((z-688)/12)*(1-smooth((z-1020)/18));
 return baseHeight+(Math.min(baseHeight,streamHeight(z)-1.3)-baseHeight)*cross*ends;
}
export function bridgeStation(a,offset=0){
 const p=roadPoint(a),p0=roadPoint(a-.0001),p1=roadPoint(a+.0001),dx=p1.x-p0.x,dz=p1.z-p0.z,len=Math.hypot(dx,dz);
 return {x:p.x-dz/len*offset,y:p.y,z:p.z+dx/len*offset};
}
/** A curved solid slab, rather than a straight box across a curved road. */
export function createBridgeDeckGeometry(segments=64){
 const positions=[],indices=[];
 for(let i=0;i<=segments;i++){
  const a=BRIDGE.angle-BRIDGE.halfAngle+2*BRIDGE.halfAngle*i/segments;
  for(const y of [-.04,-1.35])for(const side of [-1,1]){const p=bridgeStation(a,side*BRIDGE.halfWidth);positions.push(p.x,p.y+y,p.z);}
  if(i<segments){const k=i*4;indices.push(k,k+4,k+1,k+1,k+4,k+5,k+2,k+3,k+6,k+3,k+7,k+6,k,k+2,k+4,k+2,k+6,k+4,k+1,k+5,k+3,k+3,k+5,k+7);}
 }
 indices.push(0,1,2,1,3,2);const e=segments*4;indices.push(e,e+2,e+1,e+1,e+2,e+3);
 // The route tangent runs clockwise; reverse winding so the slab top faces up.
 for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function waterGeometry(){
 const p=[],uv=[],indices=[],rows=180,cols=16;
 for(let j=0;j<=rows;j++){
  const z=WATERCOURSE.mouthZ+(WATERCOURSE.headZ-WATERCOURSE.mouthZ)*j/rows,fall=smooth((z-960)/25),width=7-fall*2.1;
  for(let i=0;i<=cols;i++){const u=i/cols,edge=Math.abs(u*2-1),x=streamCenter(z)+(u*2-1)*width;p.push(x,streamHeight(z)+.10+.14*Math.sin(z*.8+x*1.7)*(1-edge),z);uv.push(u,(z-698)/9);if(j<rows&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function createWaterfallBridge(){
 const group=new THREE.Group();group.name='South shore granite bridge and waterfall';
 const slab=new THREE.Mesh(createBridgeDeckGeometry(),new THREE.MeshStandardMaterial({color:0x8b8980,roughness:.94}));slab.name='Curved bridge deck below asphalt';slab.castShadow=slab.receiveShadow=true;group.add(slab);
 const boxes=[],matrix=new THREE.Object3D();
 function beam(a,b,width,depth=width){const start=new THREE.Vector3(a.x,a.y,a.z),end=new THREE.Vector3(b.x,b.y,b.z),delta=end.clone().sub(start);matrix.position.copy(start.add(end).multiplyScalar(.5));matrix.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());matrix.scale.set(width,delta.length(),depth);matrix.updateMatrix();boxes.push(matrix.matrix.clone());}
 // Narrow granite posts and timber-toned horizontal rails leave the full shoulder clear.
 for(const side of [-1,1])for(let i=0;i<=24;i++){
  const a=BRIDGE.angle-BRIDGE.halfAngle+2*BRIDGE.halfAngle*i/24,p=bridgeStation(a,side*(BRIDGE.halfWidth-.05));
  beam({...p,y:p.y-.1},{...p,y:p.y+1.25},.24,.24);
  if(i<24){const q=bridgeStation(a+2*BRIDGE.halfAngle/24,side*(BRIDGE.halfWidth-.05));for(const h of [.5,1.18])beam({...p,y:p.y+h},{...q,y:q.y+h},.18,.18);}
 }
 // Paired pier bents stand on each bank, keeping the center channel open.
 for(const t of [-.72,.72]){
  const a=BRIDGE.angle+t*BRIDGE.halfAngle;
  for(const side of [-1,1]){const p=bridgeStation(a,side*4.3);beam({...p,y:streamHeight(p.z)-2},{...p,y:p.y-1.35},1.7,1.7);}
  const p=bridgeStation(a,-4.8),q=bridgeStation(a,4.8);beam({...p,y:p.y-2},{...q,y:q.y-2},1.2,1.2);
 }
 const structure=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x787567,roughness:.95}),boxes.length);structure.name='Bridge rails and bank piers';boxes.forEach((m,i)=>structure.setMatrixAt(i,m));structure.castShadow=structure.receiveShadow=true;group.add(structure);
 const rocks=new THREE.InstancedMesh(createGraniteGeometry({detail:1}),createRockMaterial({relief:.5}),44);rocks.name='Waterfall bedrock and river boulders';
 for(let i=0;i<44;i++){
  const z=i<16?977+(i%8)*6:710+(i-16)*9,side=i%2?1:-1,x=streamCenter(z)+side*(i<16?9:10+2*Math.sin(i*7)),size=i<16?6:1.2+1.2*(.5+.5*Math.sin(i*13));
  matrix.position.set(x,streamHeight(z)-size*.35,z);matrix.rotation.set(.15*Math.sin(i),i*2.4,.15*Math.cos(i));matrix.scale.set(size*.8,size*(i<16?1.25:.6),size*1.3);matrix.updateMatrix();rocks.setMatrixAt(i,matrix.matrix);
 }
 rocks.castShadow=rocks.receiveShadow=true;group.add(rocks);
 const time={value:0};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time},vertexShader:`varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float time;varying vec2 vUv;varying vec3 vWorld;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){
 float flow=vUv.y+time*1.8;
 float turbulence=noise(vec2(vUv.x*21.,flow*5.));
 float strands=noise(vec2(vUv.x*37.,flow*1.8));
 float falling=smoothstep(962.,984.,vWorld.z)*(1.-smoothstep(1000.,1014.,vWorld.z));
 float plume=exp(-pow((vWorld.z-975.)/9.,2.));
 float edges=smoothstep(0.,.10,vUv.x)*(1.-smoothstep(.90,1.,vUv.x));
 float foam=smoothstep(.50,.78,turbulence+falling*.30+plume*.27)*(.35+.65*strands);
 vec3 river=mix(vec3(.10,.25,.24),vec3(.33,.48,.43),turbulence);
 vec3 color=mix(river,vec3(.86,.91,.86),clamp(foam+falling*(.44+.20*strands),0.,1.));
 float breakup=mix(1.,smoothstep(.16,.42,strands),falling*.5);
 gl_FragColor=vec4(color,edges*(.86+falling*.12)*breakup);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const water=new THREE.Mesh(waterGeometry(),material);water.name='Animated broken cascade and lake tributary';water.renderOrder=2;group.add(water);
 group.update=elapsedSeconds=>{if(Number.isFinite(elapsedSeconds))time.value=elapsedSeconds;};
 group.userData.time=time;return group;
}
