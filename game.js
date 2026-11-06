import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CameraRig} from './camera-rig.js';
import {CameraObstruction} from './camera-collision.js';
import {createTerrainMaterial,createRockMaterial} from './landscape-materials.js';
import {createFlightBarrier,createPropellerBlur} from './flight-effects.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {Water} from './vendor/Water.js';
import * as E from './engine.js';
import {createForest} from './foliage.js';
import {landscapeHeight,createLandscapeGeometry,createAsphaltMaps,createLakeDetails,createSandbar,createMountainTunnel,createParkingLot} from './environment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const $=q=>document.querySelector(q),canvas=$('#scene'),state=E.fresh();
document.body.classList.add('intro-open');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});}
catch(err){$('#fatal').classList.remove('hidden');$('#fatal').textContent='This scene needs WebGL 2. Please enable hardware acceleration or open it in a current Chrome, Safari, Firefox or Edge browser.';throw err;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x9fbac5,.0021);
const camera=new THREE.PerspectiveCamera(49,innerWidth/innerHeight,.2,3000);
camera.position.set(-49,24,55);camera.lookAt(0,4,-7);
const cameraObstacles=[],cameraObstruction=new CameraObstruction({heightAt:landscapeHeight,obstacles:cameraObstacles});
const cameraRig=new CameraRig(camera,canvas,{heightAt:landscapeHeight,resolveCamera:options=>cameraObstruction.resolve(options)});cameraRig.setMode('cabin',state);
const ambient=new THREE.HemisphereLight(0xd6e4ec,0x44433b,.9);scene.add(ambient);
const sunDirection=new THREE.Vector3(-.6,.48,.55).normalize();
const sun=new THREE.DirectionalLight(0xffebd4,3.1);sun.position.copy(sunDirection).multiplyScalar(110);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;sun.shadow.camera.near=1;sun.shadow.camera.far=300;sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;scene.add(sun,sun.target);

// Atmospheric sky: a high horizon, warm western glow and fine, layered clouds.
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{sun:{value:sunDirection}},vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
varying vec3 vDir;uniform vec3 sun;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 c=mix(vec3(.73,.79,.77),vec3(.15,.37,.61),pow(h,.42));float sd=max(dot(d,sun),0.);c+=vec3(.7,.28,.08)*pow(sd,12.)+vec3(3.,2.4,1.5)*pow(sd,1400.);vec2 uv=d.xz/max(.12,d.y)*1.9;float n=noise(uv)+.5*noise(uv*2.3)+.2*noise(uv*5.);float cloud=smoothstep(.94,1.25,n)*smoothstep(.03,.25,h);c=mix(c,vec3(.96,.88,.74),cloud*.65);gl_FragColor=vec4(c,1.);}`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(2000,32,16),skyMat);scene.add(sky);
// HDR provides real sky luminance to glass, paint, metal and diffuse surfaces.
// The atmospheric shader remains available if the optional HDR cannot load.
new HDRLoader().load('./assets/pbr/blouberg_sunrise_2_1k.hdr',hdr=>{
 hdr.mapping=THREE.EquirectangularReflectionMapping;
 scene.environment=hdr;scene.environmentIntensity=.95;
 scene.background=hdr;scene.backgroundIntensity=1.05;scene.backgroundBlurriness=.035;
 scene.environmentRotation.y=scene.backgroundRotation.y=.65;
 sky.visible=false;ambient.intensity=.5;
},undefined,()=>console.warn('HDR unavailable; atmospheric fallback remains active.'));
const textureLoader=new THREE.TextureLoader();
function surfaceMap(file,{color=false,repeat=[1,1],flipY=true}={}){
 const t=textureLoader.load('./assets/pbr/'+file);t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.repeat.set(...repeat);t.flipY=flipY;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 if(color)t.colorSpace=THREE.SRGBColorSpace;return t;
}

// Live planar reflections and wave normals. No painted-background illusion.
const normals=surfaceMap('waternormals.jpg');
const water=new Water(new THREE.PlaneGeometry(2600,2600),{textureWidth:innerWidth<700?512:1024,textureHeight:innerWidth<700?512:1024,waterNormals:normals,sunDirection,sunColor:0xfff4e1,waterColor:0x155d75,distortionScale:2.1,fog:true});water.rotation.x=-Math.PI/2;water.position.y=0;scene.add(water);
// Softer sun sparkle and visible water-body colour avoid a polished-metal appearance.
water.material.uniforms.size.value=3.5;
water.material.fragmentShader=water.material.fragmentShader
 .replace('100.0, 2.0, 0.5','90.0, 0.65, 0.35')
 .replace('vec3( 1.5, 1.0, 1.5 )','vec3( 1.0, 1.0, 1.0 )')
 .replace('float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );','float reflectance = min(0.84, rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 ));')
 .replace('vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',`
  float lakeRadius=length(vec2(worldPosition.x/${E.LAKE.rx.toFixed(1)},(worldPosition.z-${E.LAKE.z.toFixed(1)})/${E.LAKE.rz.toFixed(1)}));
  vec3 lakeTint=mix(waterColor,vec3(.035,.17,.19),smoothstep(.91,1.025,lakeRadius));
  vec3 scatter=(.55+.45*max(0.0,dot(surfaceNormal,eyeDirection)))*lakeTint;
  reflectionSample*=vec3(.92,.99,1.05);
 `);


// Lake terrain, paved scenic road and distant mountain basin are generated meshes.
const landHeight=landscapeHeight;
const grass=surfaceMap('grasslight-big.jpg',{color:true,repeat:[180,180]});
const groundGeo=createLandscapeGeometry();
const terrainMaterial=createTerrainMaterial({grassMap:grass,lake:E.LAKE});
const ground=new THREE.Mesh(groundGeo,terrainMaterial);ground.receiveShadow=true;const tunnel=createMountainTunnel();scene.add(ground,createLakeDetails(),createSandbar(),tunnel,createParkingLot());
tunnel.updateMatrixWorld(true);tunnel.traverse(o=>{if(o.isMesh)cameraObstacles.push(o);});
const asphaltMaterial=new THREE.MeshStandardMaterial({...createAsphaltMaps(),color:0xffffff});
function ribbon(points,width,color,y=.025,material=null,add=true){
 const positions=[],uv=[],indices=[];let distance=0;
 for(let i=0;i<points.length;i++){
  const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz)||1;
  if(i)distance+=Math.hypot(p.x-prev.x,p.z-prev.z);
  for(const side of [-1,1]){const x=p.x-dz/len*width/2*side,z=p.z+dx/len*width/2*side;positions.push(x,E.terrainHeight(x,z)+y,z);uv.push(side===-1?0:1,distance/4);}
  if(i<points.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 const o=new THREE.Mesh(g,material||new THREE.MeshStandardMaterial({color,roughness:.95,side:THREE.DoubleSide}));o.receiveShadow=true;if(add)scene.add(o);return o;
}
const roadPts=Array.from({length:641},(_,i)=>E.roadPoint(i/640*Math.PI*2));
ribbon(roadPts,9,0x777a70,.018);ribbon(roadPts,7,0x363c3b,.065,asphaltMaterial);ribbon(E.DRIVEWAY,4.5,0x8b8b77,.10);
const roadMarks=[];
for(let i=0;i<640;i+=5)roadMarks.push(ribbon([roadPts[i],roadPts[i+1]],.11,0xdedbd0,.078,null,false).geometry);
const centerLine=new THREE.Mesh(mergeGeometries(roadMarks),new THREE.MeshStandardMaterial({color:0xdedbd0,roughness:.9,side:THREE.DoubleSide}));centerLine.receiveShadow=true;scene.add(centerLine);roadMarks.forEach(g=>g.dispose());
// Roadside posts make the finite drivable edge legible, not an invisible wall.
const postG=new THREE.CylinderGeometry(.065,.08,1,5),postM=new THREE.MeshStandardMaterial({color:0xd7cbb0});const posts=new THREE.InstancedMesh(postG,postM,192);const dummy=new THREE.Object3D();
for(let i=0;i<192;i++){const a=i/192*Math.PI*2,p=E.roadPoint(a),x=p.x+5*Math.sin(a),z=p.z-5*Math.cos(a);dummy.position.set(x,E.terrainHeight(x,z)+.5,z);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix);}scene.add(posts);
// Detailed needle cards and real trunks arranged around the mountain road.
scene.add(createForest(landHeight,E.roadRadius));
let seed=839;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);

const flightBarrier=createFlightBarrier();scene.add(flightBarrier);
let jeep,plane,propeller,propellerBlur,wheels=[],ready=false,visual=0,mode='chase',sound=false,audioCtx,osc,gain;
const keys=new Set(),held=new Map();let last=0,toastLife=0,updateClock=0;
const woodMaps={map:surfaceMap('hardwood2_diffuse.jpg',{color:true,flipY:false}),bumpMap:surfaceMap('hardwood2_bump.jpg',{flipY:false}),roughnessMap:surfaceMap('hardwood2_roughness.jpg',{flipY:false})};
new GLTFLoader().load('./assets/northbound.glb',gltf=>{
 scene.add(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(let i=0;i<mats.length;i++){let m=mats[i];if(/cedar|deck|timber/i.test(m.name)){Object.assign(m,woodMaps);m.color.set(/deck/i.test(m.name)?0x968575:0xd1b395);m.bumpScale=.045;m.roughness=.82;m.needsUpdate=true;}if(/glazing/i.test(m.name)){const glass=new THREE.MeshPhysicalMaterial({name:m.name,color:0xb3c4c3,roughness:.095,metalness:0,transmission:.30,thickness:.12,ior:1.5,transparent:true,opacity:.88,envMapIntensity:1.35,side:THREE.DoubleSide});mats[i]=glass;}if(/Granite/i.test(m.name)){const stone=createRockMaterial();stone.name=m.name;mats[i]=stone;}if(/jeep paint|Floatplane yellow/i.test(m.name)){const paint=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(paint,m);paint.clearcoat=.55;paint.clearcoatRoughness=.22;paint.roughness=.35;mats[i]=paint;}if(/Aluminium/i.test(m.name)){m.metalness=.92;m.roughness=.29;}}o.material=Array.isArray(o.material)?mats:mats[0];if(/Meadow terrain|Gravel track/.test(o.name)||/Meadow|Interior shadow|Pine needles|Sunlit needles|Pine bark/.test(mats[0]?.name)||/Gravel road/.test(mats[0]?.name))o.visible=false;}
 });
 jeep=gltf.scene.getObjectByName('JeepRoot');plane=gltf.scene.getObjectByName('PlaneRoot');propeller=gltf.scene.getObjectByName('Propeller');wheels=['LeftFront','LeftRear','RightFront','RightRear'].map(n=>gltf.scene.getObjectByName('JeepWheel'+n)).filter(Boolean);
 if(!jeep||!plane)throw new Error('Scene is missing vehicle nodes.');
 if(propeller){propellerBlur=createPropellerBlur();propeller.add(propellerBlur);}
 gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(!o.isMesh||!o.visible)return;let p=o;while(p){if(p===jeep||p===plane)return;p=p.parent;}cameraObstacles.push(o);});
 for(const x of [-.75,.75]){const lamp=new THREE.SpotLight(0xffedca,95,38,.43,.6,2);lamp.position.set(x,1.1,-2);const target=new THREE.Object3D();target.position.set(x,.4,-19);jeep.add(target,lamp);lamp.target=target;}

 ready=true;$('#start').disabled=false;$('#start').innerHTML='Take the mountain road <span>↗</span>';$('#fine').textContent='Drive freely · Switch to the floatplane anytime';
 window.__CABIN_READY__=true;
},p=>{$('#loading').textContent=p.total?Math.round(p.loaded/p.total*100)+'%':'Loading';},err=>{
 $('#fatal').classList.remove('hidden');$('#fatal').textContent='The 3D scene could not load. Serve this folder over HTTP (npm start), then reload. '+err.message;
});

function clearInput(){keys.clear();held.clear();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');toastLife=4;}
function start(){if(!ready)return;E.begin(state);mode='chase';$('#camera').innerHTML='Orbit <b>C</b>';clearInput();$('#overlay').classList.add('hidden');document.body.classList.remove('intro-open');$('#pause').disabled=false;$('#pause').textContent='Ⅱ';$('#pause').setAttribute('aria-label','Pause game');canvas.focus();cameraRig.setMode(mode,state);cameraRig.reset(state);cameraRig.setEnabled(true);sync();toast('Follow the shore road north. V switches to your floatplane.');}
function pause(){if(!['running','paused'].includes(state.status))return;E.togglePause(state);clearInput();cameraRig.setEnabled(state.status==='running');if(state.status==='paused'){
  $('#title').innerHTML='Stay a<br>little longer.';$('#description').textContent='Your drive or flight is paused. The lake can wait.';$('#start').innerHTML='Back to the lake <span>↗</span>';$('#restart').classList.remove('hidden');$('#steps').classList.add('hidden');$('#overlay').classList.remove('hidden');document.body.classList.add('intro-open');$('#pause').textContent='▶';$('#pause').setAttribute('aria-label','Resume game');
 }else{$('#overlay').classList.add('hidden');document.body.classList.remove('intro-open');$('#pause').textContent='Ⅱ';$('#pause').setAttribute('aria-label','Pause game');canvas.focus();}}
function switchVehicle(){if(!ready||state.status!=='running')return;E.switchVehicle(state,state.phase==='jeep'?'plane':'jeep');clearInput();mode='chase';$('#camera').innerHTML='Orbit <b>C</b>';cameraRig.setMode(mode,state);cameraRig.reset(state);cameraRig.setEnabled(true);sync();toast(state.phase==='plane'?'Hold Shift to add throttle, then W to lift off. Control lowers throttle; A / D turn.':'W / S throttle and reverse · A / D steer · Shift to accelerate.');}
function changeCamera(){if(!ready)return;mode=mode==='chase'?'orbit':mode==='orbit'?'cabin':'chase';cameraRig.setMode(mode,state);$('#camera').innerHTML=(mode==='chase'?'Orbit':mode==='orbit'?'Wide orbit':'Cabin')+' <b>C</b>';}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0');}
function sync(){const flying=state.phase==='plane';$('#vehicle').textContent=flying?'YELLOW FLOATPLANE':'4 × 4 JEEP';$('#time').textContent=formatTime(state.elapsed);$('#metric-label').textContent=flying?'ALTITUDE':'SPEED';$('#metric').innerHTML=flying?Math.round(state.y)+' <small>m</small>':Math.round(Math.abs(state.speed)*3.6)+' <small>km/h</small>';$('#switch').innerHTML=(flying?'Drive jeep':'Fly plane')+' <b>V</b>';$('#chapter').textContent=flying?'02 / ABOVE THE LAKE':'01 / THE MOUNTAIN ROAD';$('#objective').innerHTML=flying?'Find your<br>way home.':'Take the long<br>way home.';$('#instructions').textContent=flying?'Hold Shift to add throttle, then W to lift off. Release holds engine power. Control reduces throttle; W / S pitch and A / D bank. Slow below 47 km/h near the dock to moor.':'Follow the winding lakeside road over the ridge and through the tunnel. The gravel side road leads to three marked cabin parking bays.';$('#checklist').innerHTML=flying?'<div><span>↟</span> Airspeed <b>'+Math.round(state.speed*3.6)+' km/h</b></div><div><span>↗</span> Throttle <b>'+Math.round((state.throttle||0)*100)+'%</b></div><div><span>◉</span> Engine <b>'+Math.round(state.propRPM||0)+' RPM</b></div>':'<div><span>↟</span> Destination <b>North shore</b></div><div><span>↻</span> Scenic road <b>1.21 km</b></div>';$('#controls-copy').innerHTML=flying?'<b>W S</b> pitch <b>A D</b> bank <b>SHIFT / CTRL</b> throttle':'<b>W S</b> throttle & reverse <b>A D</b> steer <b>SHIFT</b> accelerate';$('#interact').classList.toggle('hidden',!state.actionReady&&!state.parked);$('#interact').innerHTML=(state.parked?'Take off again':flying?'Moor at the dock':'Park by the cabin')+' <span>SPACE</span>';$('#touch-action').textContent=state.parked?'TAKE OFF':flying?'MOOR':'PARK';$('#touch-action').disabled=!state.actionReady&&!state.parked;
 $('[data-control=boost]').textContent=flying?'THR +':'BOOST';$('[data-control=brake]').textContent=flying?'THR −':'BRAKE';
 const warning=flying&&state.status==='running'&&state.boundaryStatus!=='inside';$('#boundary-notice').classList.toggle('hidden',!warning);document.body.classList.toggle('flight-limit',warning);
 if(warning)$('#boundary-notice').textContent=state.boundaryStatus==='warning'?'Valley boundary ahead · Turn toward the lake':state.boundaryStatus==='outside'?'Outside the valley · Return in '+Math.ceil(state.boundaryRemaining)+'s':'Turning back toward the lake · Steering assist active';
}
$('#start').addEventListener('click',()=>state.status==='paused'?pause():start());$('#restart').addEventListener('click',start);$('#pause').addEventListener('click',pause);$('#switch').addEventListener('click',switchVehicle);$('#camera').addEventListener('click',changeCamera);$('#interact').addEventListener('click',()=>E.action(state));$('#touch-action').addEventListener('click',()=>E.action(state));
$('#sound').addEventListener('click',()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(sound));if(sound&&!audioCtx){audioCtx=new AudioContext();osc=audioCtx.createOscillator();gain=audioCtx.createGain();osc.type='triangle';osc.connect(gain);gain.connect(audioCtx.destination);gain.gain.value=0;osc.start();}if(audioCtx)audioCtx.resume();});
const aliases={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',Shift:'boost',Control:'brake'};
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&[' ','Enter'].includes(e.key))return;const key=aliases[e.key]||aliases[e.key.toLowerCase()];if(key){e.preventDefault();keys.add(key);}if(!e.repeat){if(['p','P','Escape'].includes(e.key))pause();if(['v','V'].includes(e.key))switchVehicle();if(['c','C'].includes(e.key))changeCamera();if(e.key===' '){e.preventDefault();E.action(state);}}});window.addEventListener('keyup',e=>keys.delete(aliases[e.key]||aliases[e.key.toLowerCase()]));
window.addEventListener('blur',()=>{clearInput();if(state.status==='running')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(state.status==='running')pause();}});
document.querySelectorAll('[data-control]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.control);b.classList.add('pressed');});const end=e=>{held.delete(e.pointerId);b.classList.remove('pressed');};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,end);});
window.addEventListener('pagehide',()=>cameraRig.dispose(),{once:true});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));});

// Public read-only diagnostics; optional QA commands exist only with ?qa=1.
window.cabinDiagnostics=()=>({ready,state:{...state,events:[...state.events]},cameraMode:mode,renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},model:!!jeep&&!!plane,webgl:renderer.capabilities.isWebGL2});
if(new URLSearchParams(location.search).has('qa'))window.cabinQA={state,start,pause,switchVehicle,action:()=>E.action(state),setMode:m=>{mode=m;cameraRig.setMode(mode,state);},input:keys};

function frame(t){const dt=Math.min((t-last)/1000||0,.05);last=t;visual+=dt;const active=new Set([...keys,...held.values()]);const input=Object.fromEntries([...active].map(k=>[k,true]));E.update(state,input,dt);
 if(ready){
  if(state.status!=='ready'){
   const vehicle=state.phase==='jeep'?jeep:plane;vehicle.position.set(state.x,state.y,state.z);vehicle.rotation.set(state.pitch,-state.heading,state.roll,'YXZ');
   const parked=state.phase==='jeep'?plane:jeep;parked.position.set(...(state.phase==='jeep'?[-25,.15,14]:[-16,1.1,-9]));parked.rotation.set(0,state.phase==='jeep'?1.4:3.6,0);
   cameraRig.setEnabled(state.status==='running');cameraRig.update(state,dt);
  }
  if(propeller){const rpm=state.phase==='plane'&&!state.parked?(state.propRPM||0):0;if(state.status==='running')propeller.rotation.z=(propeller.rotation.z+dt*rpm*Math.PI*2/60)%(Math.PI*2);if(propellerBlur){propellerBlur.material.uniforms.amount.value=THREE.MathUtils.clamp((rpm-700)/1500,0,1);propellerBlur.material.uniforms.phase.value=propeller.rotation.z*.27;}}
  if(state.phase==='jeep'&&state.status==='running')for(const wheel of wheels){wheel.rotation.order='YXZ';wheel.rotation.x-=state.speed*dt/.588;if(wheel.name.includes('Front'))wheel.rotation.y=-((input.right?1:0)-(input.left?1:0))*.28;}
 }
 water.material.uniforms.time.value+=dt*.55;
 flightBarrier.visible=state.phase==='plane'&&state.status==='running'&&state.boundaryStatus!=='inside';flightBarrier.material.uniforms.strength.value=state.boundaryStatus==='warning'?.7:1;flightBarrier.material.uniforms.outside.value=state.boundaryStatus==='warning'?0:1;flightBarrier.material.uniforms.time.value=visual;
 for(const ev of state.events.splice(0))toast(ev.text);toastLife-=dt;if(toastLife<=0)$('#toast').classList.remove('visible');
 updateClock+=dt;if(updateClock>.1){sync();updateClock=0;}
 const target=state.phase==='jeep'?E.HOME:E.DOCK,point=new THREE.Vector3(target.x,6,target.z).project(camera);const visible=point.z<1&&Math.abs(point.x)<.94&&Math.abs(point.y)<.92;$('#waypoint').style.opacity=visible?'1':'0';$('#waypoint').style.left=(point.x*.5+.5)*innerWidth+'px';$('#waypoint').style.top=(-point.y*.5+.5)*innerHeight+'px';$('#waypoint-label').textContent=state.phase==='jeep'?'The cabin':'Floatplane dock';$('#waypoint-distance').textContent=Math.round(Math.hypot(target.x-state.x,target.z-state.z))+' m';
 if(audioCtx){const running=sound&&state.status==='running'&&!state.parked;gain.gain.setTargetAtTime(running?.022:0,audioCtx.currentTime,.15);osc.frequency.setTargetAtTime(state.phase==='plane'?30+(state.propRPM||0)/18:35+Math.abs(state.speed)*8,audioCtx.currentTime,.1);}
 const lightTarget=state.status==='ready'||mode==='cabin'?new THREE.Vector3(0,2,-7):new THREE.Vector3(state.x,state.y,state.z);sun.target.position.lerp(lightTarget,Math.min(1,dt*2));sun.position.copy(sun.target.position).addScaledVector(sunDirection,110);
 renderer.render(scene,camera);requestAnimationFrame(frame);
}requestAnimationFrame(frame);
