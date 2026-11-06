/** Pure simulation rules for a small bounded alpine lake. Distances are metres. */
export const WORLD={scale:2,roadRadius:188,centerZ:124,northLimit:-92,flightNorthLimit:-90,flightCeiling:84};
export const JEEP={maxSpeed:22,boostSpeed:28,reverseSpeed:6,wheelbase:2.8,halfTrack:.95,maxSteeringAngle:.55,maxLateralAcceleration:9,acceleration:4.8,braking:8.5};
export const CABIN_BOUNDS={minX:-4.2,maxX:25.2,minZ:-28,maxZ:-.8,roofHeight:13};
const jeepState=()=>({steeringAngle:0,acceleration:0,suspensionVelocity:0,groundHeight:null});
export const FLIGHT={maxSpeed:27,waterHeight:.3,liftSpeed:10,throttleRate:.3,idleRPM:650,maxRPM:2600};
export const FLIGHT_BOUNDARY={warningRadius:1.02,normalRadius:1.13,graceRadius:1.5,hardRadius:1.65,warningNorth:-70,normalNorth:-90,graceNorth:-155,hardNorth:-180,returnSeconds:8};
const flightState=()=>({throttle:0,propRPM:0,verticalSpeed:0,yawRate:0,onWater:false,boundaryStatus:'inside',boundaryRemaining:FLIGHT_BOUNDARY.returnSeconds});
export const LAKE={x:0,z:124,rx:156,rz:114};
export const TUNNEL={startAngle:.08,endAngle:.36,innerHalfWidth:5.4,outerHalfWidth:11,height:6.4};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const routeRadius=a=>WORLD.roadRadius+12*Math.sin(3*a)+6*Math.sin(7*a);
const routeHeight=a=>1.1+34*Math.exp(-((wrap(a-.2)/.78)**2));
export function roadPoint(a){const r=routeRadius(a);return {x:r*Math.sin(a),y:routeHeight(a),z:WORLD.centerZ-r*Math.cos(a)};}
export function roadOffset(x,z){const a=Math.atan2(x,WORLD.centerZ-z);return Math.hypot(x,z-WORLD.centerZ)-routeRadius(a);}
export const DRIVEWAY=[roadPoint(-.65),{x:-83,z:-7,y:8},{x:-58,z:-14,y:5.5},{x:-37,z:-19,y:3},{x:-23,z:-15,y:1.1},{x:-16,z:-9,y:1.1},{x:-18,z:3,y:1.1}];
export const DOCK={x:-25,z:16};
export const HOME={x:-16,z:-9};
export const PARKING=[{x:-23,z:-11,width:4.6,length:7},{x:-16,z:-11,width:4.6,length:7},{x:-9,z:-11,width:4.6,length:7}];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const lakeRadius=(x,z)=>Math.hypot(x/LAKE.rx,(z-LAKE.z)/LAKE.rz);
export const roadRadius=(x,z)=>Math.hypot(x/WORLD.roadRadius,(z-WORLD.centerZ)/WORLD.roadRadius);
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function terrainHeight(x,z){
 const a=Math.atan2(x,WORLD.centerZ-z),offset=Math.abs(roadOffset(x,z));
 const base=1.1+.12*Math.sin(x*.15)*Math.cos(z*.12);
 const ridge=1-smooth((offset-6)/42);
 let height=base+(routeHeight(a)-base)*ridge;
 // Flatten the driveway center and softly blend its shoulders into the ridge.
 let distance=Infinity,driveHeight=height;
 for(let i=1;i<DRIVEWAY.length;i++){
  const p=DRIVEWAY[i-1],q=DRIVEWAY[i],dx=q.x-p.x,dz=q.z-p.z;
  const t=clamp(((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz),0,1);
  const d=Math.hypot(x-p.x-t*dx,z-p.z-t*dz);
  if(d<distance){distance=d;driveHeight=p.y+(q.y-p.y)*t;}
 }
 const blend=(1-smooth((distance-2.5)/7.5))*smooth((offset-6)/6);
 height+=(driveHeight-height)*blend;
 // The foundation is level; its narrow feather ends before the west driveway/parking.
 const foundationDistance=Math.hypot(Math.max(-2.8-x,0,x-23.8),Math.max(-26.4-z,0,z+6.5));
 return height+(1.1-height)*(1-smooth(foundationDistance/2.2));
}
export function fresh(){return {status:'ready',phase:'jeep',x:-16,y:terrainHeight(-16,-9),z:-9,heading:-.45,speed:0,pitch:0,roll:0,elapsed:0,cooldown:0,events:[],actionReady:false,takeoff:0,parked:false,arrived:false,...flightState(),...jeepState()}}
export function begin(s,vehicle='jeep'){Object.assign(s,fresh(),{status:'running'});switchVehicle(s,vehicle);}
export function togglePause(s){if(s.status==='running')s.status='paused';else if(s.status==='paused')s.status='running';}
export function switchVehicle(s,vehicle){
 if(!['jeep','plane'].includes(vehicle))return false;
 Object.assign(s,flightState(),jeepState());s.phase=vehicle;s.speed=0;s.roll=0;s.pitch=0;s.actionReady=false;s.takeoff=0;s.parked=false;s.arrived=false;
 if(vehicle==='jeep'){const p=roadPoint(-1.82),q=roadPoint(-1.819);s.x=p.x;s.z=p.z;s.y=terrainHeight(s.x,s.z);s.heading=Math.atan2(q.x-p.x,p.z-q.z);}
 else {s.x=-40;s.z=218;s.y=FLIGHT.waterHeight;s.heading=0;s.onWater=true;s.propRPM=FLIGHT.idleRPM;}
 return true;
}
export function action(s){
 if(s.status!=='running')return false;
 if(s.parked){Object.assign(s,flightState(),{parked:false,onWater:true,propRPM:FLIGHT.idleRPM,speed:0,pitch:0,roll:0,heading:Math.PI});s.events.push({type:'takeoff',text:'Ready on the water. Hold Shift to accelerate, then W to lift off.'});return true;}
 if(s.phase==='plane'&&s.actionReady){s.x=DOCK.x;s.z=DOCK.z;s.y=.3;s.speed=0;s.heading=-1.4;s.parked=true;s.actionReady=false;Object.assign(s,flightState(),{onWater:true});s.pitch=0;s.roll=0;s.events.push({type:'land',text:'Welcome home. Floatplane moored at the dock.'});return true;}
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
  updatePlane(s,input,steer,dt);
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
 s.acceleration=approach(s.acceleration,acceleration,input.brake||counter?12:7,dt);
 s.speed+=s.acceleration*dt;
 if((input.brake||counter||!throttle)&&oldSpeed*s.speed<=0){s.speed=0;s.acceleration=0;}
 if(throttle&&!counter&&!input.brake&&Math.abs(oldSpeed)<=limit)s.speed=clamp(s.speed,-JEEP.reverseSpeed,limit);
 s.speed=clamp(s.speed,-JEEP.reverseSpeed,input.boost?JEEP.boostSpeed:Math.max(JEEP.maxSpeed,oldSpeed));
 const speed=Math.abs(s.speed),gripAngle=Math.atan(JEEP.maxLateralAcceleration*JEEP.wheelbase/Math.max(1,speed*speed));
 const steeringLimit=Math.min(JEEP.maxSteeringAngle/(1+(speed/16)**2),gripAngle);
 s.steeringAngle=approach(s.steeringAngle,steer*steeringLimit,steer?5.5:7,dt);
 const yaw=clamp(s.speed*Math.tan(s.steeringAngle)/JEEP.wheelbase,-JEEP.maxLateralAcceleration/Math.max(speed,1),JEEP.maxLateralAcceleration/Math.max(speed,1));
 s.yawRate=approach(s.yawRate,yaw,9,dt);
 if(speed<.02)s.yawRate=0;
 s.heading+=s.yawRate*dt;
 const nx=s.x+Math.sin(s.heading)*s.speed*dt,nz=s.z-Math.cos(s.heading)*s.speed*dt;
 const c=CABIN_BOUNDS,hitCabin=nx>c.minX&&nx<c.maxX&&nz>c.minZ&&nz<c.maxZ;
 const hitShore=lakeRadius(nx,nz)<1.035,hitBound=roadRadius(nx,nz)>1.14||nz<WORLD.northLimit;
 const angle=Math.atan2(nx,WORLD.centerZ-nz),offset=Math.abs(roadOffset(nx,nz));
 const hitTunnel=angle>=TUNNEL.startAngle&&angle<=TUNNEL.endAngle&&offset>TUNNEL.innerHalfWidth-1.2&&offset<TUNNEL.outerHalfWidth+1.2;
 if(hitCabin||hitShore||hitBound||hitTunnel){
  if(Math.abs(s.speed)>1.5)bump(s,hitTunnel?'Tunnel wall. Reverse and steer back to the center.':hitCabin?'Mind the cabin. Reverse to turn around.':hitShore?'Lake edge. Reverse back onto the road.':'The mountain pass ends here. Turn back toward the lake.');
  // Absorb impact rather than bouncing repeatedly between forward and reverse.
  s.speed=0;s.acceleration=0;s.yawRate=0;
 }else{s.x=nx;s.z=nz;}
 dampSuspension(s,dt);
 s.actionReady=Math.hypot(s.x-HOME.x,s.z-HOME.z)<6;
 if(s.actionReady&&!s.arrived){s.arrived=true;s.events.push({type:'home',text:'You made it home. The lake is yours to explore.'});}
}
function flightGroundHeight(x,z){
 const outer=roadRadius(x,z),rise=Math.max(0,outer-1.17);
 return Math.max(terrainHeight(x,z),1+rise*37+Math.pow(rise,1.35)*24+Math.sin(x*.028)*Math.cos(z*.025)*Math.min(23,rise*22));
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
 const recovering=s.boundaryStatus==='recovering';
 s.throttle=clamp(s.throttle+((input.boost?1:0)-(input.brake?1:0))*FLIGHT.throttleRate*dt,0,1);
 s.propRPM=approach(s.propRPM,FLIGHT.idleRPM+(FLIGHT.maxRPM-FLIGHT.idleRPM)*s.throttle,2.2,dt);
 const targetSpeed=recovering?Math.min(16,Math.max(12,s.throttle*FLIGHT.maxSpeed)):s.throttle*FLIGHT.maxSpeed;
 const speedDelta=(targetSpeed-s.speed)*(1-Math.exp(-.65*dt));
 s.speed=clamp(s.speed+clamp(speedDelta,-3.8*dt,3.1*dt),0,FLIGHT.maxSpeed);
 const authority=clamp(s.speed/10,0,1);
 let targetYaw=steer*.65*authority;
 if(recovering){const inward=Math.atan2(-s.x,s.z-WORLD.centerZ);targetYaw=clamp(wrap(inward-s.heading)*1.4,-.65,.65);}
 s.yawRate=approach(s.yawRate,targetYaw,2.5,dt);s.heading+=s.yawRate*dt;
 s.roll=approach(s.roll,-s.yawRate/.65*(s.onWater?.055:.42),3,dt);
 const pitchInput=(input.up?1:0)-(input.down?1:0);
 s.pitch=approach(s.pitch,pitchInput*(s.onWater&&s.speed<FLIGHT.liftSpeed?.075:.3),2,dt);
 if(s.onWater&&s.speed>=FLIGHT.liftSpeed&&s.pitch>.05)s.onWater=false;
 // Neutral pitch levels the aircraft. Low throttle settles it gently instead of stalling.
 let climb=s.onWater?0:clamp(Math.sin(s.pitch)*s.speed,-7,7)-(s.speed<8?(8-s.speed)*.2:0);
 const ahead=Math.max(8,s.speed*1.25),forwardX=Math.sin(s.heading),forwardZ=-Math.cos(s.heading);
 const aheadX=s.x+forwardX*ahead,aheadZ=s.z+forwardZ*ahead;
 const aheadClearance=s.onWater&&lakeRadius(aheadX,aheadZ)<.99?FLIGHT.waterHeight:flightClearance(aheadX,aheadZ);
 if(aheadClearance>s.y)climb=Math.max(climb,clamp((aheadClearance-s.y)*1.6,0,10));
 s.verticalSpeed=approach(s.verticalSpeed,climb,2.2,dt);
 s.x+=forwardX*s.speed*dt;s.z+=forwardZ*s.speed*dt;
 const b=FLIGHT_BOUNDARY,r=roadRadius(s.x,s.z);
 // This distant safety boundary never snaps heading; the recovery turn remains gradual.
 if(r>b.hardRadius){s.x*=b.hardRadius/r;s.z=WORLD.centerZ+(s.z-WORLD.centerZ)*b.hardRadius/r;}
 s.z=Math.max(s.z,b.hardNorth);
 const clearance=s.onWater&&lakeRadius(s.x,s.z)<.99?FLIGHT.waterHeight:flightClearance(s.x,s.z);
 s.y=clamp(s.y+s.verticalSpeed*dt,clearance,WORLD.flightCeiling);
 if(s.y>=WORLD.flightCeiling&&s.verticalSpeed>0)s.verticalSpeed=0;
 if(s.y<=clearance&&s.verticalSpeed<0)s.verticalSpeed=0;
 s.onWater=s.y<=FLIGHT.waterHeight+.001&&lakeRadius(s.x,s.z)<1;
 if(s.onWater)s.verticalSpeed=0;
 s.actionReady=Math.hypot(s.x-DOCK.x,s.z-DOCK.z)<20&&s.y<18&&s.speed<13;
}
