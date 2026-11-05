import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Water} from './vendor/Water.js';
import * as E from './engine.js';
import {createForest} from './foliage.js';

const $=q=>document.querySelector(q),canvas=$('#scene'),state=E.fresh();
document.body.classList.add('intro-open');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});}
catch(err){$('#fatal').classList.remove('hidden');$('#fatal').textContent='This scene needs WebGL 2. Please enable hardware acceleration or open it in a current Chrome, Safari, Firefox or Edge browser.';throw err;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x9fbac5,.0021);
const camera=new THREE.PerspectiveCamera(49,innerWidth/innerHeight,.2,1500);
camera.position.set(-49,24,55);camera.lookAt(0,4,-7);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,4,-7);controls.enableDamping=true;controls.dampingFactor=.07;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=6;controls.maxDistance=190;controls.enablePan=false;controls.enabled=false;
scene.add(new THREE.HemisphereLight(0xd6eaff,0x435534,2.0));
const sunDirection=new THREE.Vector3(-.6,.48,.55).normalize();
const sun=new THREE.DirectionalLight(0xffdeb0,3.8);sun.position.copy(sunDirection).multiplyScalar(110);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;sun.shadow.camera.near=1;sun.shadow.camera.far=300;sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;scene.add(sun,sun.target);

// Atmospheric sky: a high horizon, warm western glow and fine, layered clouds.
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{sun:{value:sunDirection}},vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
varying vec3 vDir;uniform vec3 sun;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 c=mix(vec3(.73,.79,.77),vec3(.15,.37,.61),pow(h,.42));float sd=max(dot(d,sun),0.);c+=vec3(.7,.28,.08)*pow(sd,12.)+vec3(3.,2.4,1.5)*pow(sd,1400.);vec2 uv=d.xz/max(.12,d.y)*1.9;float n=noise(uv)+.5*noise(uv*2.3)+.2*noise(uv*5.);float cloud=smoothstep(.94,1.25,n)*smoothstep(.03,.25,h);c=mix(c,vec3(.96,.88,.74),cloud*.65);gl_FragColor=vec4(c,1.);}`});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(900,32,16),skyMat));

// Live planar reflections and wave normals. No painted-background illusion.
const nc=document.createElement('canvas');nc.width=nc.height=256;const nctx=nc.getContext('2d'),ni=nctx.createImageData(256,256);
for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;ni.data[i]=128+36*Math.sin(x*.27+y*.14)+19*Math.sin(y*.61);ni.data[i+1]=128+32*Math.cos(y*.23+x*.18);ni.data[i+2]=235;ni.data[i+3]=255;}nctx.putImageData(ni,0,0);
const normals=new THREE.CanvasTexture(nc);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;
const water=new Water(new THREE.PlaneGeometry(1400,1400),{textureWidth:innerWidth<700?512:1024,textureHeight:innerWidth<700?512:1024,waterNormals:normals,sunDirection,sunColor:0xffd3a0,waterColor:0x124d58,distortionScale:2.1,fog:true});water.rotation.x=-Math.PI/2;water.position.y=0;scene.add(water);

// Lake terrain, paved scenic road and distant mountain basin are generated meshes.
function landHeight(x,z){const r=E.lakeRadius(x,z);if(r<1)return -2;const rr=E.roadRadius(x,z);if(rr<1.17)return E.terrainHeight(x,z);const rise=Math.max(0,rr-1.17);return 1+rise*28+Math.pow(rise,1.4)*18+Math.sin(x*.047)*Math.cos(z*.041)*Math.min(14,rise*16);}
function groundTexture(){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),d=ctx.createImageData(512,512);let seed=108;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<d.data.length;i+=4){const n=rand()*30;d.data[i]=95+n;d.data[i+1]=109+n;d.data[i+2]=58+n*.6;d.data[i+3]=255;}ctx.putImageData(d,0,0);for(let i=0;i<4500;i++){const x=rand()*512,y=rand()*512;ctx.strokeStyle=rand()>.5?'#85954f':'#3a512c';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*4,y-2-rand()*5);ctx.stroke();}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(65,65);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
const groundGeo=new THREE.PlaneGeometry(650,650,190,190);groundGeo.rotateX(-Math.PI/2);groundGeo.translate(0,0,62);const gp=groundGeo.attributes.position;const colors=[];const col=new THREE.Color();
for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i),y=landHeight(x,z);gp.setY(i,y);const r=E.lakeRadius(x,z);col.set(r<1.05?0xc5bb8e:y>52?0xb2b8b2:y>20?0x8d9689:0xffffff);colors.push(col.r,col.g,col.b);}
groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();
const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({map:groundTexture(),vertexColors:true,roughness:1,metalness:0}));ground.receiveShadow=true;scene.add(ground);
function ribbon(points,width,color,y=.025){const positions=[],uv=[],indices=[];for(let i=0;i<points.length;i++){const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz)||1;for(const side of [-1,1]){const x=p.x-dz/len*width/2*side,z=p.z+dx/len*width/2*side;positions.push(x,E.terrainHeight(x,z)+y,z);uv.push(side===-1?0:1,i/points.length*20);}if(i<points.length-1){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const o=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.95,side:THREE.DoubleSide}));o.receiveShadow=true;scene.add(o);return o;}
const roadPts=Array.from({length:193},(_,i)=>({x:94*Math.sin(i/192*Math.PI*2),z:62-94*Math.cos(i/192*Math.PI*2)}));ribbon(roadPts,7,0x363c3b,.065);ribbon([{x:-22,z:-29},{x:-23,z:-19},{x:-17,z:-9},{x:-18,z:3}],4.5,0x777762,.10);
for(let i=0;i<192;i+=3){const p=roadPts[i],n=roadPts[i+1];ribbon([p,n],.11,0xc9c3a1,.078);}
// Roadside posts make the finite drivable edge legible, not an invisible wall.
const postG=new THREE.CylinderGeometry(.065,.08,1,5),postM=new THREE.MeshStandardMaterial({color:0xd7cbb0});const posts=new THREE.InstancedMesh(postG,postM,96);const dummy=new THREE.Object3D();
for(let i=0;i<96;i++){const a=i/96*Math.PI*2,x=99*Math.sin(a),z=62-99*Math.cos(a);dummy.position.set(x,E.terrainHeight(x,z)+.5,z);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix);}scene.add(posts);
// Detailed needle cards and real trunks arranged around the mountain road.
scene.add(createForest(landHeight,E.roadRadius));
let seed=839;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);

let jeep,plane,propeller,ready=false,visual=0,mode='chase',orbitOffset=0,orbitLift=0,sound=false,audioCtx,osc,gain;
const keys=new Set(),held=new Map();let last=0,toastLife=0,updateClock=0;
function woodTexture(){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#bca98d';x.fillRect(0,0,512,128);for(let i=0;i<700;i++){const y=random()*128;x.strokeStyle=`rgba(65,38,15,${random()*.18})`;x.lineWidth=random()*1.4;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(160,y+random()*8-4,320,y+random()*8-4,512,y);x.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
const wood=woodTexture();
new GLTFLoader().load('./assets/northbound.glb',gltf=>{
 scene.add(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(/cedar|deck|timber/i.test(m.name)){m.map=wood;m.bumpMap=wood;m.bumpScale=.025;m.roughness=.7;m.needsUpdate=true;}if(/glazing/i.test(m.name)){m.roughness=.1;m.metalness=.35;}}if(/Meadow terrain|Gravel track/.test(o.name)||/Meadow|Interior shadow|Pine needles|Sunlit needles|Pine bark/.test(mats[0]?.name)||/Gravel road/.test(mats[0]?.name))o.visible=false;}
 });
 jeep=gltf.scene.getObjectByName('JeepRoot');plane=gltf.scene.getObjectByName('PlaneRoot');propeller=gltf.scene.getObjectByName('Propeller');
 if(!jeep||!plane)throw new Error('Scene is missing vehicle nodes.');
 ready=true;$('#start').disabled=false;$('#start').innerHTML='Take the mountain road <span>↗</span>';$('#fine').textContent='Drive freely · Switch to the floatplane anytime';
 window.__CABIN_READY__=true;
},p=>{$('#loading').textContent=p.total?Math.round(p.loaded/p.total*100)+'%':'Loading';},err=>{
 $('#fatal').classList.remove('hidden');$('#fatal').textContent='The 3D scene could not load. Serve this folder over HTTP (npm start), then reload. '+err.message;
});

function clearInput(){keys.clear();held.clear();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');toastLife=4;}
function start(){if(!ready)return;E.begin(state);mode='chase';controls.enabled=false;$('#camera').innerHTML='Chase <b>C</b>';orbitOffset=0;orbitLift=0;clearInput();$('#overlay').classList.add('hidden');document.body.classList.remove('intro-open');$('#pause').disabled=false;$('#pause').textContent='Ⅱ';$('#pause').setAttribute('aria-label','Pause game');canvas.focus();cameraSnap();sync();toast('Follow the shore road north. V switches to your floatplane.');}
function pause(){if(!['running','paused'].includes(state.status))return;E.togglePause(state);clearInput();if(state.status==='paused'){
  $('#title').innerHTML='Stay a<br>little longer.';$('#description').textContent='Your drive or flight is paused. The lake can wait.';$('#start').innerHTML='Back to the lake <span>↗</span>';$('#restart').classList.remove('hidden');$('#steps').classList.add('hidden');$('#overlay').classList.remove('hidden');document.body.classList.add('intro-open');$('#pause').textContent='▶';$('#pause').setAttribute('aria-label','Resume game');
 }else{$('#overlay').classList.add('hidden');document.body.classList.remove('intro-open');$('#pause').textContent='Ⅱ';$('#pause').setAttribute('aria-label','Pause game');canvas.focus();}}
function switchVehicle(){if(!ready||state.status!=='running')return;E.switchVehicle(state,state.phase==='jeep'?'plane':'jeep');clearInput();mode='chase';controls.enabled=false;$('#camera').innerHTML='Chase <b>C</b>';cameraSnap();sync();toast(state.phase==='plane'?'A / D steer · W climb · S descend · Space to moor near the dock.':'W / S throttle and reverse · A / D steer · Shift to accelerate.');}
function changeCamera(){if(!ready)return;mode=mode==='chase'?'orbit':mode==='orbit'?'cabin':'chase';controls.enabled=mode==='orbit';if(mode==='orbit'){controls.target.set(state.x,state.y+2,state.z);camera.position.set(state.x-12,state.y+9,state.z+13);}if(mode==='cabin'){camera.position.set(-49,24,55);camera.lookAt(0,4,-7);}$('#camera').innerHTML=(mode==='chase'?'Chase':mode==='orbit'?'Free look':'Cabin')+' <b>C</b>';}
function targetCamera(){const planeMode=state.phase==='plane',a=state.heading+orbitOffset,dist=planeMode?21:11;return new THREE.Vector3(state.x-Math.sin(a)*dist,state.y+(planeMode?8:6)+orbitLift,state.z+Math.cos(a)*dist);}
function cameraSnap(){camera.position.copy(targetCamera());camera.lookAt(state.x,state.y+2,state.z);}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0');}
function sync(){const flying=state.phase==='plane';$('#vehicle').textContent=flying?'YELLOW FLOATPLANE':'4 × 4 JEEP';$('#time').textContent=formatTime(state.elapsed);$('#metric-label').textContent=flying?'ALTITUDE':'SPEED';$('#metric').innerHTML=flying?Math.round(state.y)+' <small>m</small>':Math.round(Math.abs(state.speed)*3.6)+' <small>km/h</small>';$('#switch').innerHTML=(flying?'Drive jeep':'Fly plane')+' <b>V</b>';$('#chapter').textContent=flying?'02 / ABOVE THE LAKE':'01 / THE MOUNTAIN ROAD';$('#objective').innerHTML=flying?'Find your<br>way home.':'Take the long<br>way home.';$('#instructions').textContent=flying?'Fly toward the lakeside cabin. Climb and descend with W / S. Slow down near the dock and press Space to moor.':'Follow the road around the lake toward the cabin on the north shore. Take the gravel turnoff by the house.';$('#checklist').innerHTML=flying?'<div><span>↟</span> Destination <b>Cabin dock</b></div><div><span>↗</span> Safe altitude <b>2–42 m</b></div>':'<div><span>↟</span> Destination <b>North shore</b></div><div><span>↻</span> Scenic road <b>590 m</b></div>';$('#controls-copy').innerHTML=flying?'<b>W S</b> climb & descend <b>A D</b> steer <b>SHIFT</b> boost':'<b>W S</b> throttle & reverse <b>A D</b> steer <b>SHIFT</b> accelerate';$('#interact').classList.toggle('hidden',!state.actionReady&&!state.parked);$('#interact').innerHTML=(state.parked?'Take off again':flying?'Moor at the dock':'Park by the cabin')+' <span>SPACE</span>';$('#touch-action').textContent=state.parked?'TAKE OFF':flying?'MOOR':'PARK';$('#touch-action').disabled=!state.actionReady&&!state.parked;}
$('#start').addEventListener('click',()=>state.status==='paused'?pause():start());$('#restart').addEventListener('click',start);$('#pause').addEventListener('click',pause);$('#switch').addEventListener('click',switchVehicle);$('#camera').addEventListener('click',changeCamera);$('#interact').addEventListener('click',()=>E.action(state));$('#touch-action').addEventListener('click',()=>E.action(state));
$('#sound').addEventListener('click',()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(sound));if(sound&&!audioCtx){audioCtx=new AudioContext();osc=audioCtx.createOscillator();gain=audioCtx.createGain();osc.type='triangle';osc.connect(gain);gain.connect(audioCtx.destination);gain.gain.value=0;osc.start();}if(audioCtx)audioCtx.resume();});
const aliases={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',Shift:'boost',Control:'brake'};
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&[' ','Enter'].includes(e.key))return;const key=aliases[e.key]||aliases[e.key.toLowerCase()];if(key){e.preventDefault();keys.add(key);}if(!e.repeat){if(['p','P','Escape'].includes(e.key))pause();if(['v','V'].includes(e.key))switchVehicle();if(['c','C'].includes(e.key))changeCamera();if(e.key===' '){e.preventDefault();E.action(state);}}});window.addEventListener('keyup',e=>keys.delete(aliases[e.key]||aliases[e.key.toLowerCase()]));
window.addEventListener('blur',()=>{clearInput();if(state.status==='running')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(state.status==='running')pause();}});
document.querySelectorAll('[data-control]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.control);b.classList.add('pressed');});const end=e=>{held.delete(e.pointerId);b.classList.remove('pressed');};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,end);});
let dragging=false,px=0,py=0;canvas.addEventListener('pointerdown',e=>{if(mode!=='chase')return;dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!dragging||mode!=='chase')return;orbitOffset-=(e.clientX-px)*.005;orbitLift=E.clamp(orbitLift+(e.clientY-py)*.025,-3,13);px=e.clientX;py=e.clientY;});for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>dragging=false);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));});

// Public read-only diagnostics; optional QA commands exist only with ?qa=1.
window.cabinDiagnostics=()=>({ready,state:{...state,events:[...state.events]},cameraMode:mode,renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},model:!!jeep&&!!plane,webgl:renderer.capabilities.isWebGL2});
if(new URLSearchParams(location.search).has('qa'))window.cabinQA={state,start,pause,switchVehicle,action:()=>E.action(state),setMode:m=>{mode=m;controls.enabled=m==='orbit';if(m==='cabin'){camera.position.set(-49,24,55);camera.lookAt(0,4,-7);}},input:keys};

function frame(t){const dt=Math.min((t-last)/1000||0,.05);last=t;visual+=dt;const active=new Set([...keys,...held.values()]);const input=Object.fromEntries([...active].map(k=>[k,true]));E.update(state,input,dt);
 if(ready){
  if(state.status!=='ready'){
   const vehicle=state.phase==='jeep'?jeep:plane;vehicle.position.set(state.x,state.y,state.z);vehicle.rotation.set(state.phase==='plane'?state.pitch:0,-state.heading,state.roll,'YXZ');
   const parked=state.phase==='jeep'?plane:jeep;parked.position.set(...(state.phase==='jeep'?[-25,.15,14]:[-16,1.1,-9]));parked.rotation.set(0,state.phase==='jeep'?1.4:3.6,0);
   if(mode==='chase'){camera.position.lerp(targetCamera(),1-Math.exp(-dt*4));const forward=new THREE.Vector3(Math.sin(state.heading)*5,2,-Math.cos(state.heading)*5);camera.lookAt(state.x+forward.x,state.y+forward.y,state.z+forward.z);}else if(mode==='orbit')controls.update();
  }
  if(propeller)propeller.rotation.z+=dt*(state.phase==='plane'&&!state.parked?state.speed*5:1);
 }
 water.material.uniforms.time.value+=dt*.55;
 for(const ev of state.events.splice(0))toast(ev.text);toastLife-=dt;if(toastLife<=0)$('#toast').classList.remove('visible');
 updateClock+=dt;if(updateClock>.1){sync();updateClock=0;}
 const target=state.phase==='jeep'?E.HOME:E.DOCK,point=new THREE.Vector3(target.x,6,target.z).project(camera);const visible=point.z<1&&Math.abs(point.x)<.94&&Math.abs(point.y)<.92;$('#waypoint').style.opacity=visible?'1':'0';$('#waypoint').style.left=(point.x*.5+.5)*innerWidth+'px';$('#waypoint').style.top=(-point.y*.5+.5)*innerHeight+'px';$('#waypoint-label').textContent=state.phase==='jeep'?'The cabin':'Floatplane dock';$('#waypoint-distance').textContent=Math.round(Math.hypot(target.x-state.x,target.z-state.z))+' m';
 if(audioCtx){const running=sound&&state.status==='running'&&!state.parked;gain.gain.setTargetAtTime(running?.022:0,audioCtx.currentTime,.15);osc.frequency.setTargetAtTime(state.phase==='plane'?55+state.speed*3:35+Math.abs(state.speed)*8,audioCtx.currentTime,.1);}
 renderer.render(scene,camera);requestAnimationFrame(frame);
}requestAnimationFrame(frame);
