import {EngineExhaust} from './engine-exhaust.js';
import * as THREE from 'three';
import {createFrameMetrics} from './frame-metrics.js';
import {createRenderQuality,isSettingsInput,isPauseShortcut} from './render-quality.js?v=pause-focus-1';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CockpitCamera} from './cockpit-camera.js?v=pickup-glass-1';
import {CameraRig} from './camera-rig.js';
import {CameraObstruction} from './camera-collision.js';
import {createTerrainMaterial,createRockMaterial} from './landscape-materials.js';
import {createFlightBarrier,createPropellerBlur,createLandingCorridor,WaterWake} from './flight-effects.js';
import {createRoadRibbonGeometry,createGravelMaterial,clipRibbonOutsideRoad} from './road-surfaces.js';
import {RoadDust} from './road-dust.js';
import {createSkyMaterial,daylightStateAt,applyDaylight} from './daylight-cycle.js';
import {createLakeWater} from './lake-water.js';
import * as E from './engine.js';
import {createWaterfallBridge} from './waterfall-bridge.js';
import {createMinimap} from './minimap.js';
import {applyHeroMaterials} from './hero-materials.js';
import {applyVehicleFidelity} from './vehicle-fidelity.js';
import {applyJeepBody} from './jeep-body.js?v=cockpit-anchor-1';
import {applyPlaneBody} from './plane-body.js';
import {createRoadSigns} from './road-signs.js';
import {createForest} from './foliage.js';
import {createForestGrass} from './forest-grass.js';
import {createCabinGrounding} from './cabin-grounding.js';
import {landscapeHeight,createLandscapeGeometry,createLandscapeTiles,createAsphaltMaps,createLakeDetails,createSandbar,createMountainTunnel,createParkingLot} from './environment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const $=q=>document.querySelector(q),canvas=$('#scene'),state=E.fresh();
document.body.classList.add('intro-open');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});}
catch(err){$('#fatal').classList.remove('hidden');$('#fatal').textContent='This scene needs WebGL 2. Please enable hardware acceleration or open it in a current Chrome, Safari, Firefox or Edge browser.';throw err;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const frameMetrics=createFrameMetrics(renderer);let benchmarkView=null;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x9fbac5,.00065);
const camera=new THREE.PerspectiveCamera(49,innerWidth/innerHeight,.2,6000);
camera.position.set(-49,24,55);camera.lookAt(0,4,-7);
const cameraObstacles=[],cameraObstruction=new CameraObstruction({heightAt:landscapeHeight,obstacles:cameraObstacles});
const cameraRig=new CameraRig(camera,canvas,{heightAt:landscapeHeight,resolveCamera:options=>cameraObstruction.resolve(options)});cameraRig.setMode('cabin',state);
const ambient=new THREE.HemisphereLight(0xd6e4ec,0x44433b,.9);scene.add(ambient);
const sunDirection=new THREE.Vector3(-.6,.48,.55).normalize();
const sun=new THREE.DirectionalLight(0xffebd4,3.1);sun.position.copy(sunDirection).multiplyScalar(110);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;sun.shadow.camera.near=1;sun.shadow.camera.far=300;sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;scene.add(sun,sun.target);

// The horizon is the actual valley terrain under a building-free moving sky.
const skyMat=createSkyMaterial(),skyGeometry=new THREE.SphereGeometry(1000,32,16);
const sky=new THREE.Mesh(skyGeometry,skyMat);sky.frustumCulled=false;scene.add(sky);scene.background=null;
const environmentScene=new THREE.Scene(),environmentSky=new THREE.Mesh(skyGeometry,skyMat);environmentSky.frustumCulled=false;environmentScene.add(environmentSky);
const pmrem=new THREE.PMREMGenerator(renderer);let environmentTarget=null,lastEnvironmentRefresh=-Infinity;const environmentMetrics={refreshes:0,lastCPUGenerationMs:null};
function refreshSkyEnvironment(){const started=performance.now();const next=pmrem.fromScene(environmentScene,.025,.1,6000);scene.environment=next.texture;environmentTarget?.dispose();environmentTarget=next;environmentMetrics.refreshes++;environmentMetrics.lastCPUGenerationMs=performance.now()-started;}
const textureLoader=new THREE.TextureLoader();
function surfaceMap(file,{color=false,repeat=[1,1],flipY=true}={}){
 const t=textureLoader.load('./assets/pbr/'+file);t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.repeat.set(...repeat);t.flipY=flipY;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 if(color)t.colorSpace=THREE.SRGBColorSpace;return t;
}

// Live planar reflections and wave normals. No painted-background illusion.
const normals=surfaceMap('waternormals.jpg');
const water=createLakeWater({normals,sunDirection,lake:E.LAKE,quality:innerWidth<700?'low':'high'});scene.add(water);
const reflectWater=water.onBeforeRender;let reflectionProbe=true;water.onBeforeRender=function(...args){if(reflectionProbe)reflectWater.apply(this,args);};

// Lake terrain, paved scenic road and distant mountain basin are generated meshes.
const landHeight=landscapeHeight;
const grass=surfaceMap('grasslight-big.jpg',{color:true,repeat:[180,180]});
const groundGeo=createLandscapeGeometry();
const terrainMaterial=createTerrainMaterial({grassMap:grass,lake:E.LAKE});
const ground=new THREE.Group();ground.name='Distance-adaptive valley terrain';for(const geometry of createLandscapeTiles(groundGeo)){const tile=new THREE.Mesh(geometry,terrainMaterial);tile.receiveShadow=true;ground.add(tile);}const tunnel=createMountainTunnel();scene.add(ground,createLakeDetails(),createSandbar(),tunnel,createParkingLot());
tunnel.updateMatrixWorld(true);tunnel.traverse(o=>{if(o.isMesh)cameraObstacles.push(o);});
const asphaltMaterial=new THREE.MeshStandardMaterial({...createAsphaltMaps(),color:0xffffff});
function ribbon(points,width,color,y=.025,material=null,add=true){
 const g=createRoadRibbonGeometry(points,width,{offset:y});
 const o=new THREE.Mesh(g,material||new THREE.MeshStandardMaterial({color,roughness:.95,side:THREE.DoubleSide}));o.receiveShadow=true;if(add)scene.add(o);return o;
}
const gravelMaterial=createGravelMaterial(),roadDust=new RoadDust();scene.add(roadDust);
const roadPts=Array.from({length:641},(_,i)=>E.roadPoint(i/640*Math.PI*2));
ribbon(roadPts,10.4,0x777a70,.06,gravelMaterial);ribbon(roadPts,8.4,0x363c3b,.09,asphaltMaterial);
for(const [width,y,material,clipWidth] of [[6.5,.06,gravelMaterial,5.2],[4.5,.09,asphaltMaterial,4.2]]){const source=createRoadRibbonGeometry(E.DRIVEWAY,width,{offset:y}),mesh=new THREE.Mesh(clipRibbonOutsideRoad(source,roadPts,clipWidth),material);source.dispose();mesh.receiveShadow=true;scene.add(mesh);}
const roadMarks=[];
for(let i=0;i<640;i+=5)roadMarks.push(ribbon([roadPts[i],roadPts[i+1]],.11,0xdedbd0,.106,null,false).geometry);
for(const side of [-1,1]){const edge=roadPts.map((p,i)=>{const prev=roadPts[(i+639)%640],next=roadPts[(i+1)%640],dx=next.x-prev.x,dz=next.z-prev.z,l=Math.hypot(dx,dz)||1;return {x:p.x-dz/l*3.9*side,z:p.z+dx/l*3.9*side};});roadMarks.push(ribbon(edge,.075,0xdedbd0,.106,null,false).geometry);}
const centerLine=new THREE.Mesh(mergeGeometries(roadMarks),new THREE.MeshStandardMaterial({color:0xdedbd0,roughness:.9,side:THREE.DoubleSide}));centerLine.receiveShadow=true;scene.add(centerLine);roadMarks.forEach(g=>g.dispose());
// Roadside posts make the finite drivable edge legible, not an invisible wall.
const postG=new THREE.CylinderGeometry(.065,.08,1,5),postM=new THREE.MeshStandardMaterial({color:0xd7cbb0});const posts=new THREE.InstancedMesh(postG,postM,192);const dummy=new THREE.Object3D();
for(let i=0;i<192;i++){const a=i/192*Math.PI*2,p=E.roadPoint(a),q=E.roadPoint(a+.0001),length=Math.hypot(q.x-p.x,q.z-p.z),x=p.x+6.3*(q.z-p.z)/length,z=p.z-6.3*(q.x-p.x)/length;dummy.position.set(x,E.terrainHeight(x,z)+.5,z);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix);}scene.add(posts);
// Detailed needle cards and real trunks arranged around the mountain road.
const forest=createForest(landHeight,E.roadRadius);scene.add(forest,createRoadSigns(landHeight),createCabinGrounding(landHeight));
const forestGrass=createForestGrass(forest.getTreeLocations(),landHeight,{density:matchMedia('(pointer: coarse)').matches?.5:1});scene.add(forestGrass);
let seed=839;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);

const scenicBridge=createWaterfallBridge();scene.add(scenicBridge);scenicBridge.updateMatrixWorld(true);scenicBridge.traverse(o=>{if(o.isMesh)cameraObstacles.push(o);});
const minimap=createMinimap();document.body.append(minimap.element);
const scenicRoadKm=(E.roadLength()/1000).toFixed(2);
const engineExhaust=new EngineExhaust();scene.add(engineExhaust);
const flightBarrier=createFlightBarrier(),waterWake=new WaterWake();scene.add(flightBarrier,createLandingCorridor(E.LANDING_CORRIDOR),waterWake);
let jeep,plane,propeller,propellerBlur,flightSurfaces={},wheels=[],ready=false,visual=0,mode='chase',selectedVehicle='jeep',sound=false,audioCtx,osc,gain;
const keys=new Set(),held=new Map(),frameTimes=[];let last=0,toastLife=0,updateClock=0;
const woodMaps={map:surfaceMap('hardwood2_diffuse.jpg',{color:true,flipY:false}),bumpMap:surfaceMap('hardwood2_bump.jpg',{flipY:false}),roughnessMap:surfaceMap('hardwood2_roughness.jpg',{flipY:false})};
const renderQuality=createRenderQuality({renderer,scene,onChange:settings=>{frameMetrics.reset();$('#quality-status').textContent=`${settings.preset[0].toUpperCase()+settings.preset.slice(1)} · textures ${settings.texturesEnabled?'on':'off'}`;}});
$('#quality-preset').addEventListener('change',event=>renderQuality.setPreset(event.target.value));
$('#surface-textures').addEventListener('change',event=>renderQuality.setTextures(event.target.checked));
$('#render-settings').addEventListener('focusin',clearInput);
new GLTFLoader().load('./assets/northbound.glb',gltf=>{
 scene.add(gltf.scene);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(let i=0;i<mats.length;i++){let m=mats[i];if(/cedar|deck|timber/i.test(m.name)){Object.assign(m,woodMaps);m.color.set(/deck/i.test(m.name)?0x968575:0xd1b395);m.bumpScale=.045;m.roughness=.82;m.needsUpdate=true;}if(/glazing/i.test(m.name)){const glass=new THREE.MeshPhysicalMaterial({name:m.name,color:0xb3c4c3,roughness:.095,metalness:0,transmission:.30,thickness:.12,ior:1.5,transparent:true,opacity:.88,envMapIntensity:1.35,side:THREE.DoubleSide});mats[i]=glass;}if(/Granite/i.test(m.name)){const stone=createRockMaterial();stone.name=m.name;mats[i]=stone;}if(/jeep paint|Floatplane yellow/i.test(m.name)){const paint=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(paint,m);paint.clearcoat=.55;paint.clearcoatRoughness=.22;paint.roughness=.35;mats[i]=paint;}if(/Aluminium/i.test(m.name)){m.metalness=.92;m.roughness=.29;}}o.material=Array.isArray(o.material)?mats:mats[0];if(/Meadow terrain|Gravel track/.test(o.name)||/Meadow|Interior shadow|Pine needles|Sunlit needles|Pine bark/.test(mats[0]?.name)||/Gravel road/.test(mats[0]?.name))o.visible=false;}
 });
 applyHeroMaterials(gltf.scene);
 applyVehicleFidelity(gltf.scene);
 applyJeepBody(gltf.scene);
 applyPlaneBody(gltf.scene);
 jeep=gltf.scene.getObjectByName('JeepRoot');plane=gltf.scene.getObjectByName('PlaneRoot');propeller=gltf.scene.getObjectByName('Propeller');wheels=['LeftFront','LeftRear','RightFront','RightRear'].map(n=>gltf.scene.getObjectByName('JeepWheel'+n)).filter(Boolean);
 if(!jeep||!plane)throw new Error('Scene is missing vehicle nodes.');
 const cockpitCamera=new CockpitCamera({jeep,plane});cameraRig.applyCockpit=(camera,state,active)=>cockpitCamera.apply(camera,state,active);
 renderQuality.register(gltf.scene);
 plane.position.set(E.DOCK.x,E.FLIGHT.waterHeight,E.DOCK.z);plane.rotation.set(0,Math.PI,0);
 if(propeller){propellerBlur=createPropellerBlur();propeller.add(propellerBlur);}
 for(const name of ['PlaneAileronLeft','PlaneAileronRight','PlaneElevatorLeft','PlaneElevatorRight','PlaneRudder'])flightSurfaces[name]=gltf.scene.getObjectByName(name);
 gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(!o.isMesh||!o.visible)return;let p=o;while(p){if(p===jeep||p===plane)return;p=p.parent;}cameraObstacles.push(o);});
 for(const x of [-.75,.75]){const lamp=new THREE.SpotLight(0xffedca,95,38,.43,.6,2);lamp.position.set(x,1.1,-2);const target=new THREE.Object3D();target.position.set(x,.4,-19);jeep.add(target,lamp);lamp.target=target;}

 ready=true;$('#drive').disabled=false;$('#fly').disabled=false;$('#start').disabled=false;$('#start').innerHTML='Drive from cabin parking <span>↗</span>';$('#fine').textContent='Drive Jeep starts at cabin parking · Fly Plane starts on the water · V switches';
 window.__CABIN_READY__=true;
},p=>{$('#loading').textContent=p.total?Math.round(p.loaded/p.total*100)+'%':'Loading';},err=>{
 $('#fatal').classList.remove('hidden');$('#fatal').textContent='The 3D scene could not load. Serve this folder over HTTP (npm start), then reload. '+err.message;
});

function clearInput(){keys.clear();held.clear();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');toastLife=4;}
function start(){if(!ready)return;benchmarkView=null;E.begin(state,selectedVehicle);mode='chase';$('#camera').innerHTML='Chase <b>C</b>';clearInput();$('#overlay').classList.add('hidden');document.body.classList.remove('intro-open');$('#pause').disabled=false;$('#pause').textContent='Ⅱ';$('#pause').setAttribute('aria-label','Pause game');canvas.focus();cameraRig.setMode(mode,state);cameraRig.reset(state);cameraRig.setEnabled(true);sync();toast(state.phase==='jeep'?'Leave your parking bay toward the access aisle. Drive Jeep / Fly Plane changes vehicle.':'Space starts the engine. Shift adds power. At idle, B pushes backward on water.');}
function pause(){if(!['running','paused'].includes(state.status))return;E.togglePause(state);clearInput();cameraRig.setEnabled(state.status==='running');if(state.status==='paused'){
  $('#title').innerHTML='Stay a<br>little longer.';$('#description').textContent='Your drive or flight is paused. The lake can wait.';$('#start').innerHTML='Back to the lake <span>↗</span>';$('#restart').classList.remove('hidden');$('#steps').classList.add('hidden');$('#overlay').classList.remove('hidden');document.body.classList.add('intro-open');$('#pause').textContent='▶';$('#pause').setAttribute('aria-label','Resume game');
 }else{$('#overlay').classList.add('hidden');document.body.classList.remove('intro-open');$('#pause').textContent='Ⅱ';$('#pause').setAttribute('aria-label','Pause game');canvas.focus();}}
function switchVehicle(vehicle){if(!ready)return;selectedVehicle=typeof vehicle==='string'?vehicle:(state.phase==='jeep'?'plane':'jeep');if(state.status!=='running'){start();return;}if(state.phase===selectedVehicle){canvas.focus();return;}E.switchVehicle(state,selectedVehicle);clearInput();mode='chase';$('#camera').innerHTML='Chase <b>C</b>';cameraRig.setMode(mode,state);cameraRig.reset(state);cameraRig.setEnabled(true);sync();toast(state.phase==='plane'?'Space starts the engine. Wait for idle, then Shift to accelerate and W to lift off.':'W / S throttle and reverse · A / D steer · Shift to accelerate.');}
function changeCamera(){if(!ready)return;mode=mode==='chase'?'orbit':mode==='orbit'?'cockpit':mode==='cockpit'?'cabin':'chase';cameraRig.setMode(mode,state);$('#camera').innerHTML=(mode==='chase'?'Chase':mode==='orbit'?'Orbit':mode==='cockpit'?'Cockpit':'Cabin')+' <b>C</b>';}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0');}
function sync(){
 const flying=state.phase==='plane',off=flying&&state.enginePhase==='off'&&!state.parked,starting=flying&&state.enginePhase==='starting';
 $('#vehicle').textContent=flying?'YELLOW FLOATPLANE':'4 × 4 JEEP';$('#time').textContent=formatTime(state.elapsed);$('#metric-label').textContent=flying?'ALTITUDE':'SPEED';$('#metric').innerHTML=flying?Math.round(state.y)+' <small>m</small>':Math.round(Math.abs(state.speed)*3.6)+' <small>km/h</small>';$('#drive').setAttribute('aria-pressed',String(!flying));$('#fly').setAttribute('aria-pressed',String(flying));$('#chapter').textContent=flying?'02 / ABOVE THE LAKE':'01 / THE MOUNTAIN ROAD';$('#objective').innerHTML=flying?'Find your<br>way home.':'Take the long<br>way home.';
 $('#instructions').textContent=!flying?'Follow the forest S-bends up the mountain, through the carved tunnel, and down to the waterfall bridge. The paved side road leads to three marked cabin parking bays.':state.parked?'Moored with the engine off. Space releases the mooring, then Space starts the engine.':off?'Press Space to start the engine. After the three-second startup, hold Shift to add power and W to lift off.':starting?'Engine starting. Wait for steady idle before adding throttle.':state.onWater?'Shift adds power; Control brakes. At idle, hold B to push backward on water. W lifts off above 36 km/h. Space moors beside the dock.':state.landingStatus==='approach'?'Aligned with the buoy corridor. Control reduces engine power in the air; it is not a wheel brake. Use S to descend. The floats settle onto the water, then Control slows your taxi.':'Shift adds power; Control reduces it gradually in the air. W / S pitch, A / D bank. Approach the cabin between the two buoy lines, slow and descend to land.';
 $('#checklist').innerHTML=flying?'<div><span>↟</span> Airspeed <b>'+Math.round(state.speed*3.6)+' km/h</b></div><div><span>↗</span> Throttle <b>'+Math.round((state.throttle||0)*100)+'%</b></div><div><span>◉</span> Engine <b>'+(off?'OFF':starting?'STARTING':Math.round(state.propRPM||0)+' RPM')+'</b></div>':'<div><span>↟</span> Destination <b>North shore</b></div><div><span>↻</span> Scenic road <b>'+scenicRoadKm+' km</b></div>';
 $('#controls-copy').innerHTML=flying?'<b>W S</b> pitch <b>A D</b> bank <b>SHIFT</b> throttle up <b>CTRL</b> '+(state.onWater?'water brake · <b>B</b> push backward':'throttle down'):'<b>W S</b> throttle & reverse <b>A D</b> steer <b>SHIFT</b> accelerate';
 const canAct=state.actionReady||state.parked||off||starting;$('#interact').classList.toggle('hidden',!canAct);$('#interact').disabled=starting;
 const actionText=state.parked?'Release mooring':off?'Start engine':starting?'Starting engine · '+Math.ceil(state.engineStartRemaining)+'s':flying?'Moor at the dock':'Park by the cabin';$('#interact').innerHTML=actionText+' <span>SPACE</span>';$('#touch-action').textContent=state.parked?'UNMOOR':off?'START':starting?'STARTING':flying?'MOOR':'PARK';$('#touch-action').disabled=!canAct||starting;
 $('[data-control=reverse]').classList.toggle('hidden',!flying||!state.onWater);$('[data-control=boost]').textContent=flying?'THR +':'BOOST';$('[data-control=brake]').textContent=flying?(state.onWater?'WATER BRAKE':'THR −'):'BRAKE';
 const warning=flying&&state.status==='running'&&state.boundaryStatus!=='inside';$('#boundary-notice').classList.toggle('hidden',!warning);document.body.classList.toggle('flight-limit',warning);
 if(warning)$('#boundary-notice').textContent=state.boundaryStatus==='warning'?'Valley boundary ahead · Turn toward the lake':state.boundaryStatus==='outside'?'Outside the valley · Return in '+Math.ceil(state.boundaryRemaining)+'s':'Turning back toward the lake · Steering assist active';
 $('#landing-guide').classList.toggle('hidden',!(flying&&state.status==='running'&&['approach','touchdown'].includes(state.landingStatus)));$('#landing-guide').textContent=state.landingStatus==='touchdown'?'Touchdown · Hold Control to slow on the water':'Water approach aligned · Reduce power and descend between the buoys';
}
$('#start').addEventListener('click',()=>state.status==='paused'?pause():start());$('#restart').addEventListener('click',start);$('#pause').addEventListener('click',pause);$('#drive').addEventListener('click',()=>switchVehicle('jeep'));$('#fly').addEventListener('click',()=>switchVehicle('plane'));$('#camera').addEventListener('click',changeCamera);$('#interact').addEventListener('click',()=>{E.action(state);canvas.focus();sync();});$('#touch-action').addEventListener('click',()=>{E.action(state);canvas.focus();sync();});
$('#sound').addEventListener('click',()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(sound));if(sound&&!audioCtx){audioCtx=new AudioContext();osc=audioCtx.createOscillator();gain=audioCtx.createGain();osc.type='triangle';osc.connect(gain);gain.connect(audioCtx.destination);gain.gain.value=0;osc.start();}if(audioCtx)audioCtx.resume();});
const aliases={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',Shift:'boost',Control:'brake',b:'reverse'};
window.addEventListener('keydown',e=>{if(isPauseShortcut(e)){e.preventDefault();pause();return;}if(isSettingsInput(e.target))return;const key=aliases[e.key]||aliases[e.key.toLowerCase()];if(key){e.preventDefault();keys.add(key);}if(!e.repeat){if(['v','V'].includes(e.key))switchVehicle();if(['c','C'].includes(e.key))changeCamera();if(e.key===' '){e.preventDefault();E.action(state);}}});window.addEventListener('keyup',e=>keys.delete(aliases[e.key]||aliases[e.key.toLowerCase()]));
window.addEventListener('blur',()=>{clearInput();if(state.status==='running')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(state.status==='running')pause();}});
document.querySelectorAll('[data-control]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.control);b.classList.add('pressed');});const end=e=>{held.delete(e.pointerId);b.classList.remove('pressed');};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,end);});
window.addEventListener('pagehide',()=>{cameraRig.dispose();engineExhaust.dispose();environmentTarget?.dispose();pmrem.dispose();},{once:true});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderQuality.resize();});

// Public read-only diagnostics; optional QA commands exist only with ?qa=1.
window.cabinDiagnostics=()=>({environment:{...environmentMetrics},fullFrame:frameMetrics.snapshot(),quality:renderQuality.settings(),benchmarkView,cameraPosition:camera.position.toArray(),build:'large-lake-startup-landing',performance:{samples:frameTimes.length,averageFPS:frameTimes.length?1000/(frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length):null,p95FrameMs:frameTimes.length?[...frameTimes].sort((a,b)=>a-b)[Math.floor(frameTimes.length*.95)]:null},forest:{...forest.userData.forest},grass:{...forestGrass.userData.grass},terrainTiles:ground.children.length,ready,state:{...state,events:[...state.events]},cameraMode:mode,renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},model:!!jeep&&!!plane,webgl:renderer.capabilities.isWebGL2});
if(new URLSearchParams(location.search).has('qa'))window.cabinQA={benchmark:name=>{
 if(!['jeep','lake','cabin','waterfall'].includes(name))throw new RangeError('Unknown benchmark view');
 clearInput();cameraRig.setEnabled(false);E.begin(state,name==='lake'?'plane':'jeep');benchmarkView=name;visual=0;lastEnvironmentRefresh=-Infinity;
 const views={jeep:[[-32,7,-3],[-16,2,-9]],lake:[[-40,9,613],[-40,1,591]],cabin:[[-49,24,55],[0,4,-7]],waterfall:[[52,37,937],[0,29,991]]};
 camera.position.set(...views[name][0]);camera.lookAt(...views[name][1]);camera.updateMatrixWorld();
 $('#overlay').classList.add('hidden');document.body.classList.remove('intro-open');sync();frameMetrics.reset();
 },textureAudit:renderQuality.audit,setReflectionProbe:enabled=>{reflectionProbe=!!enabled;},setQuality:renderQuality.setPreset,setTextures:renderQuality.setTextures,resetMetrics:frameMetrics.reset,setGrassDensity:forestGrass.setDensity,setGrassWind:forestGrass.setWind,state,start,pause,switchVehicle,action:()=>E.action(state),setMode:m=>{mode=m;cameraRig.setMode(mode,state);},input:keys};

function frame(t){const measuredDelta=frameMetrics.begin(t);if(last&&state.status==='running'){frameTimes.push(t-last);if(frameTimes.length>240)frameTimes.shift();}const dt=benchmarkView?0:Math.min((t-last)/1000||0,.05);last=t;visual+=dt;const active=new Set([...keys,...held.values()]);const input=Object.fromEntries([...active].map(k=>[k,true]));E.update(state,input,dt);
 if(ready){
  if(state.status!=='ready'){
   const vehicle=state.phase==='jeep'?jeep:plane;vehicle.position.set(state.x,state.y,state.z);vehicle.rotation.set(state.pitch,-state.heading,state.roll,'YXZ');
   const parked=state.phase==='jeep'?plane:jeep;parked.position.set(...(state.phase==='jeep'?[E.DOCK.x,E.FLIGHT.waterHeight,E.DOCK.z]:[E.HOME.x,E.terrainHeight(E.HOME.x,E.HOME.z),E.HOME.z]));parked.rotation.set(0,state.phase==='jeep'?Math.PI:Math.PI/2,0);
   if(!benchmarkView){cameraRig.setEnabled(state.status==='running');cameraRig.update(state,dt);}
  }
  if(propeller){const rpm=state.phase==='plane'&&!state.parked?(state.propRPM||0):0;if(state.status==='running')propeller.rotation.z=(propeller.rotation.z+dt*rpm*Math.PI*2/60)%(Math.PI*2);if(propellerBlur){propellerBlur.material.uniforms.amount.value=THREE.MathUtils.clamp((rpm-700)/1500,0,1);propellerBlur.material.uniforms.phase.value=propeller.rotation.z*.27;}}
  for(const [name,angle] of [['PlaneAileronLeft',state.aileronAngle||0],['PlaneAileronRight',-(state.aileronAngle||0)],['PlaneElevatorLeft',-(state.elevatorAngle||0)],['PlaneElevatorRight',-(state.elevatorAngle||0)],['PlaneRudder',state.rudderAngle||0]]){const node=flightSurfaces[name];if(node)node.rotation[name==='PlaneRudder'?'y':'x']=THREE.MathUtils.clamp(angle,-.349,.349);}
  if(state.phase==='jeep'&&state.status==='running')for(const wheel of wheels){wheel.rotation.order='YXZ';wheel.rotation.x-=state.speed*dt/.588;if(wheel.name.includes('Front'))wheel.rotation.y=-(state.steeringAngle||0);}
 }
 engineExhaust.update(state,state.status==='running'?dt:0,plane);
 roadDust.update(state,state.status==='running'?dt:0);waterWake.update(state,state.status==='running'?dt:0);
 water.material.uniforms.time.value+=dt*.55;scenicBridge.update(visual);minimap.update(state);
 applyDaylight(daylightStateAt(visual),{skyMaterial:skyMat,sun,sunDirection,ambient,water,renderer,scene});
 if(ready&&visual-lastEnvironmentRefresh>20){refreshSkyEnvironment();lastEnvironmentRefresh=visual;}
 flightBarrier.visible=state.phase==='plane'&&state.status==='running'&&state.boundaryStatus!=='inside';flightBarrier.material.uniforms.strength.value=state.boundaryStatus==='warning'?.7:1;flightBarrier.material.uniforms.outside.value=state.boundaryStatus==='warning'?0:1;flightBarrier.material.uniforms.time.value=visual;
 for(const ev of state.events.splice(0))toast(ev.text);toastLife-=dt;if(toastLife<=0)$('#toast').classList.remove('visible');
 updateClock+=dt;if(updateClock>.1){sync();updateClock=0;}
 const target=state.phase==='jeep'?E.HOME:E.DOCK,point=new THREE.Vector3(target.x,6,target.z).project(camera);const visible=point.z<1&&Math.abs(point.x)<.94&&Math.abs(point.y)<.92;$('#waypoint').style.opacity=visible?'1':'0';$('#waypoint').style.left=(point.x*.5+.5)*innerWidth+'px';$('#waypoint').style.top=(-point.y*.5+.5)*innerHeight+'px';$('#waypoint-label').textContent=state.phase==='jeep'?'The cabin':'Floatplane dock';$('#waypoint-distance').textContent=Math.round(Math.hypot(target.x-state.x,target.z-state.z))+' m';
 if(audioCtx){const running=sound&&state.status==='running'&&!state.parked&&(state.phase!=='plane'||state.enginePhase!=='off');gain.gain.setTargetAtTime(running?.022:0,audioCtx.currentTime,.15);osc.frequency.setTargetAtTime(state.phase==='plane'?30+(state.propRPM||0)/18:35+Math.abs(state.speed)*8,audioCtx.currentTime,.1);}
 const lightTarget=state.status==='ready'||mode==='cabin'?new THREE.Vector3(0,2,-7):new THREE.Vector3(state.x,state.y,state.z);sun.target.position.lerp(lightTarget,Math.min(1,dt*2));sun.position.copy(sun.target.position).addScaledVector(sunDirection,110);
 forest.updateLOD(camera.position,camera);forestGrass.update(visual,camera.position);
 renderer.render(scene,camera);frameMetrics.end(document.hidden?null:measuredDelta);requestAnimationFrame(frame);
}requestAnimationFrame(frame);

