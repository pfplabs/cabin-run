import {advanceFlightDynamics} from './flight-dynamics.js';
import {shorelineScale} from './shoreline.js';
/** Pure simulation rules for a small bounded alpine lake. Distances are metres. */
export const WORLD={scale:6,roadRadius:564,centerZ:352,northLimit:-302,flightNorthLimit:-300,flightCeiling:1400};
export const JEEP={maxSpeed:22,boostSpeed:28,reverseSpeed:6,wheelbase:2.8,halfTrack:.95,maxSteeringAngle:.55,parkingSteeringAngle:.78,maxLateralAcceleration:9,acceleration:4.8,braking:12};
export const CABIN_BOUNDS={minX:-4.2,maxX:25.2,minZ:-28,maxZ:-.8,roofHeight:13};
const jeepState=()=>({steeringAngle:0,acceleration:0,suspensionVelocity:0,groundHeight:null});
export const FLIGHT={maxSpeed:27,waterHeight:.10,liftSpeed:10,throttleRate:.3,idleRPM:650,maxRPM:2600,startupSeconds:3,waterBrake:7};
export const LANDING_CORRIDOR={centerX:-25,zStart:250,zEnd:40,width:36,heading:0};
export const FLIGHT_BOUNDARY={warningRadius:2.3,normalRadius:2.5,graceRadius:2.9,hardRadius:3.2,warningNorth:WORLD.centerZ-WORLD.roadRadius*2.3,normalNorth:WORLD.centerZ-WORLD.roadRadius*2.5,graceNorth:WORLD.centerZ-WORLD.roadRadius*2.9,hardNorth:WORLD.centerZ-WORLD.roadRadius*3.2,returnSeconds:18};
const flightState=()=>({enginePhase:'off',engineStartRemaining:0,stallWarning:false,landingStatus:'taxi',landingAligned:false,touchdownAge:-1,elevatorAngle:0,aileronAngle:0,rudderAngle:0,throttle:0,propRPM:0,verticalSpeed:0,yawRate:0,onWater:false,boundaryStatus:'inside',boundaryRemaining:FLIGHT_BOUNDARY.returnSeconds});
export const LAKE={x:0,z:352,rx:468,rz:342};
export const BRIDGE={angle:Math.PI,halfAngle:.055,halfWidth:5.6};
export const TUNNEL={startAngle:.08,endAngle:.36,innerHalfWidth:5.4,outerHalfWidth:11,height:6.4};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const smoothRoute=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const highRoad=a=>{a=wrap(a);return smoothRoute((a-.38)/1.17)*(1-smoothRoute((a-1.55)/1.40));};
const routeRadius=a=>WORLD.roadRadius+36*Math.sin(3*a)+18*Math.sin(7*a)+highRoad(a)*(440+135*Math.sin((a-.38)*11));
// Grade follows travelled distance, not angle: S-bends lengthen the climb without steep spikes.
const passStart=.38,passPeak=1.55,passEnd=2.95,passSamples=2048,passDistances=new Float64Array(passSamples+1);
for(let i=1;i<=passSamples;i++){const a=passStart+(passEnd-passStart)*i/passSamples,b=passStart+(passEnd-passStart)*(i-1)/passSamples,ra=routeRadius(a),rb=routeRadius(b);passDistances[i]=passDistances[i-1]+Math.hypot(ra*Math.sin(a)-rb*Math.sin(b),ra*Math.cos(a)-rb*Math.cos(b));}
const passDistance=a=>{const f=Math.max(0,Math.min(passSamples,(a-passStart)/(passEnd-passStart)*passSamples)),i=Math.min(passSamples-1,Math.floor(f));return passDistances[i]+(passDistances[i+1]-passDistances[i])*(f-i);};
const climbLength=passDistance(passPeak),descentLength=passDistances[passSamples]-climbLength;
const passElevation=a=>{a=wrap(a);return a<=passPeak?85*smoothRoute(passDistance(a)/climbLength):85*(1-smoothRoute((passDistance(a)-climbLength)/descentLength));};
const routeHeight=a=>1.1+16*Math.exp(-((wrap(a-.2)/.78)**2))+passElevation(a)+22*Math.exp(-Math.pow(wrap(a-Math.PI)/.48,4));
export function roadPoint(a){const r=routeRadius(a);return {x:r*Math.sin(a),y:routeHeight(a),z:WORLD.centerZ-r*Math.cos(a)};}
/** Nearest curve station keeps steep S-bend cross-sections level and full-width. */
export function roadSample(x,z){
 let a=Math.atan2(x,WORLD.centerZ-z);
 if(a<=.38||a>=2.95)return {angle:a,y:routeHeight(a),offset:Math.hypot(x,z-WORLD.centerZ)-routeRadius(a)};
 for(let i=0;i<4;i++){const p=roadPoint(a),l=roadPoint(a-.0001),r=roadPoint(a+.0001),dx=(r.x-l.x)/.0002,dz=(r.z-l.z)/.0002;
  a+=Math.max(-.12,Math.min(.12,((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz)));
 }
 const p=roadPoint(a),l=roadPoint(a-.0001),r=roadPoint(a+.0001),side=(x-p.x)*(r.z-l.z)-(z-p.z)*(r.x-l.x);
 return {angle:wrap(a),y:p.y,offset:Math.sign(side)*Math.hypot(x-p.x,z-p.z)};
}
export function roadOffset(x,z){return roadSample(x,z).offset;}
// A gently graded approach enters a twelve-metre-radius turn into the bay aisle.
// Shared sampled centreline drives terrain, asphalt, forest clearance and map.
const drivewayStart=roadPoint(-.65);
export const DRIVEWAY=[];
for(let i=0;i<=24;i++){
 const t=i/24,u=1-t;
 DRIVEWAY.push({x:u*u*u*drivewayStart.x+3*u*u*t*-230+3*u*t*t*-90+t*t*t*-38,
  z:u*u*u*drivewayStart.z+3*u*u*t*-30+3*u*t*t*-30+t*t*t*-30,
  y:1.1+(drivewayStart.y-1.1)*(1-smoothRoute(t))});
}
for(let i=1;i<=12;i++){const a=i/12*Math.PI/2;DRIVEWAY.push({x:-38+12*Math.sin(a),z:-18-12*Math.cos(a),y:1.1});}
DRIVEWAY.push({x:-26,z:-9,y:1.1},{x:-26,z:.5,y:1.1});
export const DOCK={x:-23.7,z:30};
export const PLANE_BERTH=Object.freeze({x:-30,z:30,heading:Math.PI});
export const DOCK_BOUNDS={minX:-21.20,maxX:-14.925,minZ:2,maxZ:36,maxY:2.025};
export const HOME={x:-16,z:-9};
export const PARKING_APRON={x:-20,z:-9,width:17.5,length:25,cornerRadius:2};
export function onParkingApron(x,z){const p=PARKING_APRON,qx=Math.max(Math.abs(x-p.x)-(p.width/2-p.cornerRadius),0),qz=Math.max(Math.abs(z-p.z)-(p.length/2-p.cornerRadius),0);return Math.hypot(qx,qz)<=p.cornerRadius;}
export const PARKING=[{x:-16,z:-16,width:4.6,length:7},{x:-16,z:-9,width:4.6,length:7},{x:-16,z:-2,width:4.6,length:7}];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function lakeBoundaryPoint(a){const r=shorelineScale(a);return {x:LAKE.rx*r*Math.sin(a),z:LAKE.z-LAKE.rz*r*Math.cos(a)};}
export const lakeRadius=(x,z)=>Math.hypot(x/LAKE.rx,(z-LAKE.z)/LAKE.rz)/shorelineScale(Math.atan2(x/LAKE.rx,(LAKE.z-z)/LAKE.rz));
export const roadLength=()=>{let length=0,p=roadPoint(0);for(let i=1;i<=2048;i++){const q=roadPoint(i/2048*Math.PI*2);length+=Math.hypot(q.x-p.x,q.z-p.z,q.y-p.y);p=q;}return length;};
export const roadRadius=(x,z)=>Math.hypot(x/WORLD.roadRadius,(z-WORLD.centerZ)/WORLD.roadRadius);
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function terrainHeight(x,z){
 const station=roadSample(x,z),a=station.angle,offset=Math.abs(station.offset);
 const base=1.1+.12*Math.sin(x*.15)*Math.cos(z*.12);
 const ridge=1-smooth((offset-6)/(highRoad(a)>0?Math.max(42,routeHeight(a)*1.3):42));
 let height=base+(routeHeight(a)-base)*ridge;
 // Flatten the driveway center and softly blend its shoulders into the ridge.
 let distance=Infinity,driveHeight=height;
 for(let i=1;i<DRIVEWAY.length;i++){
  const p=DRIVEWAY[i-1],q=DRIVEWAY[i],dx=q.x-p.x,dz=q.z-p.z;
  const t=clamp(((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz),0,1);
  const d=Math.hypot(x-p.x-t*dx,z-p.z-t*dz);
  if(d<distance){distance=d;driveHeight=p.y+(q.y-p.y)*t;}
 }
 const blend=(1-smooth((distance-4)/7.5))*smooth((offset-6)/6);
 height+=(driveHeight-height)*blend;
 // A level forecourt joins the straight aisle and perpendicular parking bays.
 const apronDistance=Math.hypot(Math.max(-31-x,0,x+11),Math.max(-22-z,0,z-4));
 height+=(1.1-height)*(1-smooth(apronDistance/2));
 // The foundation is level; its narrow feather ends before the west driveway/parking.
 const foundationDistance=Math.hypot(Math.max(-2.8-x,0,x-23.8),Math.max(-26.4-z,0,z+6.5));
 return height+(1.1-height)*(1-smooth(foundationDistance/2.2));
}
/** The distant eastern massif rises above the forest pass, away from the cabin.
 * Shared by rendering and flight clearance; the paved corridor is unchanged. */
export function mountainHeight(x,z){
 const a=Math.atan2(x,WORLD.centerZ-z),d=Math.hypot(x,z-WORLD.centerZ)-routeRadius(a)-6;
 if(d<=0)return -Infinity;
 const angle=wrap(a-1.65),edge=1-smooth((Math.abs(angle)-.60)/.45);

 // Rounded eastern flanks retain small exposed peaks above the forest.
 const flank=Math.exp(-Math.pow(angle/.68,2))*(.96+.04*Math.cos(angle*18));
 const ascent=Math.pow(Math.sin(Math.min(d/500,1)*Math.PI/2),1.12);
 const back=1-smooth((d-500)/900);
 const massif=edge>0?(routeHeight(a)+210*ascent*flank)*edge*back:-Infinity;
 const portalBlend=smooth((a-(TUNNEL.startAngle-.06))/.06)*(1-smooth((a-TUNNEL.endAngle)/.06));
 // Uneven bedrock breaks the level crest without changing the flat cabin or
 // paved corridor. Keep this in the shared height field for flight clearance.
 const ridgeRelief=(3+1.7*Math.sin(a*31+d*.11)+1.1*Math.sin(a*67-d*.19))*smooth(d/12);
 // Hold the modest crest, then carry its rear shoulder into the foothills.
 // The former 25 m falloff made an isolated, steep-sided artificial mound.
 // Only uphill bedrock changes: d<=0 above keeps every paved/aperture sample.
 const cover=(routeHeight(a)+10*smooth(d/5)+Math.min(30,Math.max(0,d-5))*.8+ridgeRelief)*portalBlend*(1-smooth((d-35)/150));
 return Math.max(massif,portalBlend>0?cover:-Infinity);
}
// Low distant foothills preserve the reference's open sky behind the cabin.
export function backdropHeight(x,z){
 const rise=Math.max(0,roadRadius(x,z)-1.17);
 return .65*(1+rise*37+Math.pow(rise,1.35)*24+Math.sin(x*.028)*Math.cos(z*.025)*Math.min(23,rise*22));
}
export const waterfallHill=(x,z)=>62*Math.exp(-Math.pow(x/75,2)-Math.pow((z-1020)/80,2));
export function fresh(){return {status:'ready',phase:'jeep',x:-16,y:terrainHeight(-16,-9),z:-9,heading:-.45,speed:0,pitch:0,roll:0,elapsed:0,cooldown:0,events:[],actionReady:false,takeoff:0,parked:false,arrived:false,...flightState(),...jeepState()}}
export function begin(s,vehicle='jeep'){Object.assign(s,fresh(),{status:'running'});switchVehicle(s,vehicle);}
export function togglePause(s){if(s.status==='running')s.status='paused';else if(s.status==='paused')s.status='running';}
export function switchVehicle(s,vehicle){
 if(!['jeep','plane'].includes(vehicle))return false;
 Object.assign(s,flightState(),jeepState());s.phase=vehicle;s.speed=0;s.roll=0;s.pitch=0;s.actionReady=false;s.takeoff=0;s.parked=false;s.arrived=false;
 if(vehicle==='jeep'){s.x=HOME.x;s.z=HOME.z;s.y=terrainHeight(s.x,s.z);s.heading=-Math.PI/2;}
 else {s.x=PLANE_BERTH.x;s.z=PLANE_BERTH.z;s.y=FLIGHT.waterHeight;s.heading=PLANE_BERTH.heading;s.onWater=true;s.propRPM=0;}
 return true;
}
export function action(s){
 if(s.status!=='running')return false;
 if(s.parked){Object.assign(s,flightState(),{parked:false,onWater:true,speed:0,pitch:0,roll:0,heading:Math.PI});s.events.push({type:'unmoor',text:'Unmoored. Press Space to start the engine.'});return true;}
 if(s.phase==='plane'){
  if(s.enginePhase==='off'){s.enginePhase='starting';s.engineStartRemaining=FLIGHT.startupSeconds;s.throttle=0;s.events.push({type:'engine_start',text:'Starting engine. Wait for the propeller to settle at idle.'});return true;}
  if(s.enginePhase==='starting')return false;
  if(s.actionReady&&s.onWater&&s.speed<3){s.speed=0;s.parked=true;s.actionReady=false;Object.assign(s,flightState(),{onWater:true});s.events.push({type:'land',text:'Moored at the dock. Engine off.'});return true;}
  return false;
 }
 if(s.phase==='jeep'&&s.actionReady){s.speed=0;s.acceleration=0;s.yawRate=0;s.events.push({type:'home',text:'Home by the lake. Keep exploring or take the floatplane.'});return true;}
 return false;
}
function bump(s,text){if(s.cooldown<=0){s.cooldown=1.5;s.events.push({type:'bump',text});}}
export function update(s,input,dt){
 if(s.status!=='running')return;
 dt=clamp(dt,0,.05);s.elapsed+=dt;s.cooldown=Math.max(0,s.cooldown-dt);
 const steer=(input.right?1:0)-(input.left?1:0);
 if(s.phase==='jeep'){
  // Equal 120 Hz integration at 30/60/120 fps keeps steering, contact and damping stable.
  const steps=Math.max(1,Math.ceil(dt*120-1e-9)),h=dt/steps;
  for(let i=0;i<steps;i++)updateJeep(s,input,steer,h);
 }else if(!s.parked){
  const steps=Math.max(1,Math.ceil(dt*120-1e-9)),h=dt/steps;
  for(let i=0;i<steps;i++)updatePlane(s,input,steer,h);
 }
}

const approach=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*dt));
function dampSuspension(s,dt){
 const dx=Math.sin(s.heading)*JEEP.wheelbase/2,dz=-Math.cos(s.heading)*JEEP.wheelbase/2;
 const rx=Math.cos(s.heading)*JEEP.halfTrack,rz=Math.sin(s.heading)*JEEP.halfTrack;
 const fl=terrainHeight(s.x+dx-rx,s.z+dz-rz),fr=terrainHeight(s.x+dx+rx,s.z+dz+rz);
 const rl=terrainHeight(s.x-dx-rx,s.z-dz-rz),rr=terrainHeight(s.x-dx+rx,s.z-dz+rz);
 const ground=(fl+fr+rl+rr)/4,groundVelocity=s.groundHeight===null||dt===0?0:clamp((ground-s.groundHeight)/dt,-12,12);
 s.groundHeight=ground;
 const omega=14;
 s.suspensionVelocity+=(omega*omega*(ground-s.y)+2*omega*(groundVelocity-s.suspensionVelocity))*dt;
 s.y+=s.suspensionVelocity*dt;
 s.y=clamp(s.y,ground-.12,ground+.25);
 const slope=Math.atan2((fl+fr-rl-rr)/2,JEEP.wheelbase);
 const crossSlope=Math.atan2((fr+rr-fl-rl)/2,JEEP.halfTrack*2);
 s.pitch=approach(s.pitch,clamp(slope+s.acceleration*.003,-.5,.5),6,dt);
 s.roll=approach(s.roll,clamp(crossSlope+s.speed*s.yawRate*.006,-.2,.2),5,dt);
}
function updateJeep(s,input,steer,dt){
 const throttle=(input.up?1:0)-(input.down?1:0),oldSpeed=s.speed;
 const limit=throttle<0?JEEP.reverseSpeed:input.boost?JEEP.boostSpeed:JEEP.maxSpeed;
 const counter=throttle!==0&&s.speed*throttle<0;
 let acceleration;
 if(input.brake||counter)acceleration=-Math.sign(s.speed)*(input.brake?JEEP.braking:7.5);
 else if(!throttle)acceleration=-Math.sign(s.speed)*(.7+Math.abs(s.speed)*.018);
 else if(Math.abs(s.speed)>limit)acceleration=-Math.sign(s.speed)*2.5;
 else acceleration=throttle*(throttle<0?3.2:JEEP.acceleration)*(1-.4*Math.abs(s.speed)/limit);
 s.acceleration=approach(s.acceleration,acceleration,input.brake?18:counter?12:7,dt);
 s.speed+=s.acceleration*dt;
 if((input.brake||counter||!throttle)&&oldSpeed*s.speed<=0){s.speed=0;s.acceleration=0;}
 if(throttle&&!counter&&!input.brake&&Math.abs(oldSpeed)<=limit)s.speed=clamp(s.speed,-JEEP.reverseSpeed,limit);
 s.speed=clamp(s.speed,-JEEP.reverseSpeed,input.boost?JEEP.boostSpeed:Math.max(JEEP.maxSpeed,oldSpeed));
 const speed=Math.abs(s.speed),gripAngle=Math.atan(JEEP.maxLateralAcceleration*JEEP.wheelbase/Math.max(1,speed*speed));
 // Extra parking lock fades out by 10 m/s; cruise steering and grip stay unchanged.
 const parkingLock=(JEEP.parkingSteeringAngle-JEEP.maxSteeringAngle)*(1-smooth((speed-3)/7));
 const steeringLimit=Math.min(JEEP.maxSteeringAngle/(1+(speed/16)**2)+parkingLock,gripAngle);
 s.steeringAngle=approach(s.steeringAngle,steer*steeringLimit,steer?5.5:7,dt);
 const yaw=clamp(s.speed*Math.tan(s.steeringAngle)/JEEP.wheelbase,-JEEP.maxLateralAcceleration/Math.max(speed,1),JEEP.maxLateralAcceleration/Math.max(speed,1));
 s.yawRate=approach(s.yawRate,yaw,9,dt);
 if(speed<.02)s.yawRate=0;
 s.heading+=s.yawRate*dt;
 const nx=s.x+Math.sin(s.heading)*s.speed*dt,nz=s.z-Math.cos(s.heading)*s.speed*dt;
 const c=CABIN_BOUNDS,hitCabin=nx>c.minX&&nx<c.maxX&&nz>c.minZ&&nz<c.maxZ;
 const hitShore=lakeRadius(nx,nz)<1+4/LAKE.rz,hitBound=roadOffset(nx,nz)>78||(nz<WORLD.northLimit&&Math.abs(roadOffset(nx,nz))>78);
 const angle=Math.atan2(nx,WORLD.centerZ-nz),offset=Math.abs(roadOffset(nx,nz));
 const hitBridge=Math.abs(wrap(angle-BRIDGE.angle))<BRIDGE.halfAngle&&offset>BRIDGE.halfWidth-1.35;
 const hitTunnel=angle>=TUNNEL.startAngle&&angle<=TUNNEL.endAngle&&offset>TUNNEL.innerHalfWidth-1.2&&offset<TUNNEL.outerHalfWidth+1.2;
 if(hitCabin||hitShore||hitBound||hitTunnel||hitBridge){
  if(Math.abs(s.speed)>1.5)bump(s,hitBridge?'Bridge railing. Reverse and steer toward the center.':hitTunnel?'Tunnel wall. Reverse and steer back to the center.':hitCabin?'Mind the cabin. Reverse to turn around.':hitShore?'Lake edge. Reverse back onto the road.':'The mountain pass ends here. Turn back toward the lake.');
  // Absorb impact rather than bouncing repeatedly between forward and reverse.
  s.speed=0;s.acceleration=0;s.yawRate=0;
 }else{s.x=nx;s.z=nz;}
 dampSuspension(s,dt);
 s.actionReady=Math.hypot(s.x-HOME.x,s.z-HOME.z)<6;
 if(s.actionReady&&!s.arrived){s.arrived=true;s.events.push({type:'home',text:'You made it home. The lake is yours to explore.'});}
}
function flightGroundHeight(x,z){
 return Math.max(terrainHeight(x,z),mountainHeight(x,z),waterfallHill(x,z),backdropHeight(x,z));
}
function flightClearance(x,z){
 const angle=Math.atan2(x,WORLD.centerZ-z),offset=Math.abs(roadOffset(x,z));
 let clearance=FLIGHT.waterHeight;
 for(const [dx,dz] of [[0,0],[7,0],[-7,0],[0,7],[0,-7]])if(lakeRadius(x+dx,z+dz)>1)clearance=Math.max(clearance,6,flightGroundHeight(x+dx,z+dz)+4);
 if(angle>=TUNNEL.startAngle-.04&&angle<=TUNNEL.endAngle+.04&&offset<TUNNEL.outerHalfWidth+7)clearance=Math.max(clearance,routeHeight(angle)+TUNNEL.height+8);
 const c=CABIN_BOUNDS;if(x>c.minX-7&&x<c.maxX+7&&z>c.minZ-7&&z<c.maxZ+7)clearance=Math.max(clearance,15);
 return Math.min(clearance,WORLD.flightCeiling);
}
function updateBoundary(s,dt){
 const b=FLIGHT_BOUNDARY,r=roadRadius(s.x,s.z),outside=r>b.normalRadius||s.z<b.normalNorth;
 const previous=s.boundaryStatus;
 if(!outside){s.boundaryRemaining=b.returnSeconds;s.boundaryStatus=r>b.warningRadius||s.z<b.warningNorth?'warning':'inside';}
 else {
  s.boundaryRemaining=Math.max(0,s.boundaryRemaining-dt);
  s.boundaryStatus=previous==='recovering'||r>b.graceRadius||s.z<b.graceNorth||s.boundaryRemaining===0?'recovering':'outside';
 }
 if(s.boundaryStatus!==previous){
  if(s.boundaryStatus==='outside')s.events.push({type:'boundary',text:'Outside the valley. Turn back before the countdown ends.'});
  else if(s.boundaryStatus==='recovering')s.events.push({type:'boundary',text:'Helping you turn back toward the lake.'});
  else if(previous==='outside'||previous==='recovering')s.events.push({type:'boundary',text:'Back in the valley. You have control.'});
 }
}
function updatePlane(s,input,steer,dt){
 updateBoundary(s,dt);
 const wasOnWater=s.onWater&&s.y<=FLIGHT.waterHeight+.01;
 s.onWater=wasOnWater;
 if(s.touchdownAge>=0)s.touchdownAge+=dt;
 if(s.enginePhase==='starting'){
  s.engineStartRemaining=Math.max(0,s.engineStartRemaining-dt);
  s.throttle=0;
  const progress=1-s.engineStartRemaining/FLIGHT.startupSeconds;
  s.propRPM=FLIGHT.idleRPM*smooth(progress);
  if(s.engineStartRemaining<1e-8){s.engineStartRemaining=0;s.enginePhase='running';s.events.push({type:'engine_ready',text:'Engine ready. Shift adds power; W lifts off after the takeoff run.'});}
 }
 const engineReady=s.enginePhase==='running';
 if(engineReady){
  s.throttle=clamp(s.throttle+((input.boost?1:0)-(input.brake?1:0))*FLIGHT.throttleRate*dt,0,1);
  s.propRPM=approach(s.propRPM,FLIGHT.idleRPM+(FLIGHT.maxRPM-FLIGHT.idleRPM)*s.throttle,2.2,dt);
 }else if(s.enginePhase==='off'){s.throttle=0;s.propRPM=approach(s.propRPM,0,3,dt);}
 const recovering=s.boundaryStatus==='recovering';
 advanceFlightDynamics(s,input,steer,dt,{flight:FLIGHT,recovering,inward:wrap(Math.atan2(-s.x,s.z-WORLD.centerZ)-s.heading)});
 const ahead=(s.speed<0?-1:1)*Math.max(8,Math.abs(s.speed)*1.25),forwardX=Math.sin(s.heading),forwardZ=-Math.cos(s.heading);
 const aheadX=s.x+forwardX*ahead,aheadZ=s.z+forwardZ*ahead;
 const aheadClearance=s.onWater&&lakeRadius(aheadX,aheadZ)<.995?FLIGHT.waterHeight:flightClearance(aheadX,aheadZ);
 if(aheadClearance>s.y&&(!s.onWater||s.speed>FLIGHT.liftSpeed*.8))s.verticalSpeed=approach(s.verticalSpeed,Math.max(s.verticalSpeed,clamp((aheadClearance-s.y)*1.6,0,10)),2.2,dt);
 const nextX=s.x+forwardX*s.speed*dt,nextZ=s.z+forwardZ*s.speed*dt;
 const floatHalfX=Math.abs(Math.cos(s.heading))*1.7+Math.abs(Math.sin(s.heading))*3.3,floatHalfZ=Math.abs(Math.sin(s.heading))*1.7+Math.abs(Math.cos(s.heading))*3.3;
 const hitPier=s.onWater&&nextX+floatHalfX>DOCK_BOUNDS.minX&&nextX-floatHalfX<DOCK_BOUNDS.maxX&&nextZ+floatHalfZ>DOCK_BOUNDS.minZ&&nextZ-floatHalfZ<DOCK_BOUNDS.maxZ;
 if(hitPier){if(Math.abs(s.speed)>1)bump(s,'Pier ahead. Slow and steer away from the pilings.');s.speed=0;}else{s.x=nextX;s.z=nextZ;}
 const b=FLIGHT_BOUNDARY,r=roadRadius(s.x,s.z);
 if(r>b.hardRadius){s.x*=b.hardRadius/r;s.z=WORLD.centerZ+(s.z-WORLD.centerZ)*b.hardRadius/r;}
 s.z=Math.max(s.z,b.hardNorth);
 const clearance=s.onWater&&lakeRadius(s.x,s.z)<.995?FLIGHT.waterHeight:flightClearance(s.x,s.z);
 const contactSpeed=s.verticalSpeed;
 s.y=clamp(s.y+s.verticalSpeed*dt,clearance,WORLD.flightCeiling);
 if(s.y>=WORLD.flightCeiling&&s.verticalSpeed>0)s.verticalSpeed=0;
 if(s.y<=clearance&&s.verticalSpeed<0)s.verticalSpeed=0;
 s.onWater=s.y<=FLIGHT.waterHeight+.001&&lakeRadius(s.x,s.z)<1;
 const corridor=LANDING_CORRIDOR;
 const inCorridor=Math.abs(s.x-corridor.centerX)<=corridor.width/2&&s.z>=corridor.zEnd&&s.z<=corridor.zStart;
 s.landingAligned=inCorridor&&Math.abs(wrap(s.heading-corridor.heading))<Math.PI/7;
 if(s.onWater){
  s.verticalSpeed=0;
  if(!wasOnWater){s.touchdownAge=0;s.events.push({type:'touchdown',text:inCorridor?'Touchdown in the landing corridor. Hold Control to slow on the water.':'Touchdown. Hold Control to slow on the water.',speed:s.speed,verticalSpeed:contactSpeed,inCorridor});}
  s.landingStatus=s.touchdownAge>=0&&s.touchdownAge<2.5?'touchdown':'taxi';
 }else {
  if(wasOnWater){s.touchdownAge=-1;s.events.push({type:'takeoff',text:'Airborne. Reduce power with Control before your landing approach.'});}
  s.landingStatus=s.landingAligned&&s.y<25&&s.speed<21?'approach':'airborne';
 }
 s.actionReady=s.enginePhase==='running'&&s.onWater&&Math.hypot(s.x-DOCK.x,s.z-DOCK.z)<10&&Math.abs(s.speed)<3;
}

