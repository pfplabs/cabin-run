import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
const step=(s,input={},seconds=1)=>{for(let t=0;t<seconds-1e-8;t+=.02)E.update(s,input,.02);return s;};
const running=(vehicle='jeep')=>{const s=E.fresh();E.begin(s,vehicle);return s;};
const startEngine=s=>{assert.equal(E.action(s),true);step(s,{},E.FLIGHT.startupSeconds);assert.equal(s.enginePhase,'running');return s;};
const onRoad=s=>{const p=E.roadPoint(-1.82),q=E.roadPoint(-1.819);Object.assign(s,{x:p.x,z:p.z,y:p.y,heading:Math.atan2(q.x-p.x,p.z-q.z)});return s;};
const startedPlane=()=>startEngine(running('plane'));
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('ready and paused states do not simulate; resume preserves position',()=>{
 const s=E.fresh(), initial=structuredClone(s);step(s,{up:true});assert.deepEqual(s,initial);
 E.begin(s);step(s,{up:true},.4);E.togglePause(s);const paused=structuredClone(s);step(s,{up:true},2);assert.deepEqual(s,paused);
 assert.equal(E.action(s),false);E.togglePause(s);step(s,{up:true},.1);assert.notEqual(s.x,paused.x);
});
test('jeep accelerates gradually, brakes, reverses and steers in both directions',()=>{
 const s=running();step(s,{up:true},.5);assert.ok(s.speed>1&&s.speed<2.5);const speed=s.speed;step(s,{brake:true},.5);near(s.speed,0);assert.ok(speed>0);
 step(s,{down:true},1.5);assert.ok(s.speed<-3);const h=s.heading;step(s,{down:true,right:true},.4);assert.ok(s.heading<h);
 const forward=running();step(forward,{up:true},1);const fh=forward.heading;E.update(forward,{up:true,right:true},.02);
 assert.ok(forward.steeringAngle>0&&forward.steeringAngle<.09);assert.ok(Math.abs(forward.heading-fh)<.005);
 step(forward,{up:true,right:true},.3);assert.ok(forward.heading>fh);
});
test('jeep cabin, shoreline and outer boundaries stop without bouncing and permit reverse',()=>{
 for(const [x,z,heading] of [[E.CABIN_BOUNDS.minX-.05,-10,Math.PI/2],[E.lakeBoundaryPoint(-Math.PI/2).x*(1+4/E.LAKE.rz)-.05,E.WORLD.centerZ,Math.PI/2],[E.roadPoint(-Math.PI/2).x-77.95,E.WORLD.centerZ,-Math.PI/2]]){
  const s=running();Object.assign(s,{x,z,heading,speed:14});E.update(s,{up:true},.05);assert.ok(Math.abs(s.speed)<.1);assert.equal(s.events.at(-1).type,'bump');
  step(s,{up:true},.5);assert.ok(s.speed<.15,'Holding throttle against wall must not bounce');
  const impact={x:s.x,z:s.z};step(s,{down:true},1);assert.ok(s.speed<0);assert.ok(Math.hypot(s.x-impact.x,s.z-impact.z)>.5);
 }
});
test('collision notices are rate limited',()=>{
 const s=running();Object.assign(s,{x:-4.6,z:-10,heading:Math.PI/2,speed:14});E.update(s,{up:true},.05);s.speed=14;E.update(s,{up:true},.05);assert.equal(s.events.length,1);
});
test('plane accelerates on water before lifting, with smoothed pitch and bank',()=>{
 const s=startedPlane();near(s.speed,0);near(s.y,E.FLIGHT.waterHeight);assert.equal(s.onWater,true);
 step(s,{up:true},2);near(s.speed,0);near(s.y,E.FLIGHT.waterHeight);
 E.update(s,{boost:true,up:true,right:true},.02);assert.ok(s.throttle>0&&s.throttle<.01);assert.ok(s.propRPM>E.FLIGHT.idleRPM);assert.ok(s.yawRate<.01);
 step(s,{boost:true,up:true},8);assert.ok(s.speed>10);assert.ok(s.y>E.FLIGHT.waterHeight+1);assert.equal(s.onWater,false);
 const before={pitch:s.pitch,vertical:s.verticalSpeed,heading:s.heading};E.update(s,{down:true,left:true},.02);
 assert.ok(Math.abs(s.pitch-before.pitch)<.03);assert.ok(Math.abs(s.verticalSpeed-before.vertical)<.6);assert.ok(Math.abs(s.heading-before.heading)<.02);
 s.x=0;s.z=E.WORLD.centerZ;s.y=E.WORLD.flightCeiling-.1;step(s,{up:true},1);near(s.y,E.WORLD.flightCeiling);
 s.x=0;s.z=E.WORLD.centerZ;s.y=.4;s.verticalSpeed=-2;s.pitch=-.3;step(s,{down:true},.3);near(s.y,E.FLIGHT.waterHeight);assert.equal(s.onWater,true);
});
test('plane avoids low shoreline and cabin terrain',()=>{
 const s=startedPlane();Object.assign(s,{x:-E.LAKE.rx-12,z:E.WORLD.centerZ,y:1.7,takeoff:0});E.update(s,{},.02);assert.ok(s.y>=6);
 Object.assign(s,{x:0,z:-10,y:6,takeoff:0});E.update(s,{},.02);assert.ok(s.y>=14);
});
test('dock mooring requires physical touchdown, nearby low speed and explicit action',()=>{
 const s=startedPlane();Object.assign(s,{x:E.DOCK.x,z:E.DOCK.z,y:10,onWater:false});E.update(s,{},.02);assert.equal(s.actionReady,false);assert.equal(E.action(s),false);
 Object.assign(s,{x:E.DOCK.x-2,z:E.DOCK.z+2,y:E.FLIGHT.waterHeight,onWater:true,verticalSpeed:0,speed:0});E.update(s,{},.02);assert.equal(s.actionReady,true);
 const pos=[s.x,s.y,s.z];assert.equal(E.action(s),true);assert.equal(s.parked,true);assert.deepEqual([s.x,s.y,s.z],pos);assert.equal(s.enginePhase,'off');
 step(s,{up:true,right:true},2);assert.deepEqual([s.x,s.y,s.z],pos);
 assert.equal(E.action(s),true);assert.equal(s.parked,false);near(s.speed,0);assert.equal(s.enginePhase,'off');step(s,{boost:true},.5);near(s.y,pos[1]);near(s.speed,0);
 startEngine(s);step(s,{boost:true,up:true},6);assert.ok(s.y>pos[1]);
});
test('switching resets vehicle-specific state and restart resets session',()=>{
 const s=running();step(s,{up:true},.5);s.arrived=true;assert.equal(E.switchVehicle(s,'plane'),true);assert.equal(s.phase,'plane');assert.equal(s.arrived,false);near(s.elapsed,.5);
 E.switchVehicle(s,'jeep');assert.equal(s.speed,0);assert.equal(s.pitch,0);assert.equal(s.takeoff,0);const saved=structuredClone(s);assert.equal(E.switchVehicle(s,'boat'),false);assert.deepEqual(s,saved);
 E.begin(s);assert.equal(s.elapsed,0);assert.deepEqual(s.events,[]);assert.equal(s.status,'running');
});
test('road and driveway are drivable continuously from spawn to cabin',()=>{
 const s=running(),points=[];
 for(let a=Math.atan2(s.x,E.WORLD.centerZ-s.z)+.08;a<-.65;a+=.08)points.push(E.roadPoint(a));
 points.push(...E.DRIVEWAY.slice(0,-1),{x:E.HOME.x,z:E.HOME.z});
 let n=0;
 for(let i=0;i<18000&&n<points.length;i++){
  const p=points[n];if(Math.hypot(p.x-s.x,p.z-s.z)<2.4){n++;continue;}
  const target=Math.atan2(p.x-s.x,s.z-p.z),error=Math.atan2(Math.sin(target-s.heading),Math.cos(target-s.heading));
  E.update(s,{up:s.speed<7,left:error<-.03,right:error>.03},.02);
 }
 assert.equal(n,points.length,`Stopped at waypoint ${n}/${points.length}, position ${s.x},${s.z}, events ${JSON.stringify(s.events)}`);
 assert.equal(s.arrived,true);assert.equal(s.actionReady,true);assert.equal(E.action(s),true);near(s.speed,0);
 assert.ok(!s.events.some(e=>e.type==='bump'),'Route should not require any collision');
});

test('input-driven engine start, taxi, takeoff, corridor approach, touchdown and dock',()=>{
 const s=running('plane');Object.assign(s,{x:-40,z:591,heading:0});assert.equal(s.enginePhase,'off');startEngine(s);
 let maxAltitude=0,sawApproach=false,landed=false,sawTaxi=false;
 for(let i=0;i<7500&&!s.actionReady;i++){
  const distance=Math.hypot(E.DOCK.x-s.x,E.DOCK.z-s.z),target=Math.atan2(E.DOCK.x-s.x,s.z-E.DOCK.z);
  const error=Math.atan2(Math.sin(target-s.heading-s.yawRate*.6),Math.cos(target-s.heading-s.yawRate*.6));
  const approaching=s.z<E.LANDING_CORRIDOR.zStart,throttle=landed?(distance<25?.07:.22):approaching?.4:.7,predicted=s.y+s.verticalSpeed*.8;
  const previous={x:s.x,y:s.y,z:s.z};
  E.update(s,{boost:s.throttle<throttle-.01,brake:s.throttle>throttle+.01,up:!landed&&!approaching&&predicted<11.5,down:!landed&&(approaching||predicted>12.5),left:error<-.025,right:error>.025},.02);
  assert.ok(Math.hypot(s.x-previous.x,s.z-previous.z)<=27*.02+.001,'Flight and landing must not teleport');
  assert.ok(Math.abs(s.y-previous.y)<.5,'Touchdown must settle rather than snap from altitude');
  maxAltitude=Math.max(maxAltitude,s.y);sawApproach ||= s.landingStatus==='approach';sawTaxi ||= s.onWater&&s.speed>1;
  landed ||= s.events.some(e=>e.type==='touchdown');
 }
 assert.ok(sawTaxi&&maxAltitude>10&&sawApproach&&landed,JSON.stringify(s));
 assert.ok(s.events.some(e=>e.type==='touchdown'&&e.inCorridor));assert.equal(s.actionReady,true,JSON.stringify(s));assert.equal(s.onWater,true);assert.ok(s.speed<3);
 const pos=[s.x,s.y,s.z];assert.equal(E.action(s),true);assert.equal(s.parked,true);assert.deepEqual([s.x,s.y,s.z],pos);
});

test('expanded lake is nine times the previous area and preserves cabin landmarks',()=>{
 near((Math.PI*E.LAKE.rx*E.LAKE.rz)/(Math.PI*156*114),9);near((Math.PI*E.LAKE.rx*E.LAKE.rz)/(Math.PI*78*57),36);
 assert.deepEqual(E.HOME,{x:-16,z:-9});assert.deepEqual(E.DOCK,{x:-23.7,z:30});
 near(E.roadRadius(0,E.WORLD.centerZ-E.WORLD.roadRadius),1);
 const jeep=running(),plane=running('plane');assert.deepEqual([jeep.x,jeep.z],[E.HOME.x,E.HOME.z]);assert.deepEqual([plane.x,plane.z],[E.PLANE_BERTH.x,E.PLANE_BERTH.z]);
});
test('jeep raised speed limits and floatplane limit are enforced',()=>{
 for(const [input,limit] of [[{up:true},22],[{up:true,boost:true},28],[{down:true},-6]]){
  const s=running();for(let i=0;i<1000;i++){s.x=-E.WORLD.roadRadius;s.z=E.WORLD.centerZ;E.update(s,input,.02);}
  near(s.speed,limit);
 }
 const plane=startedPlane();
 for(let i=0;i<2500;i++){plane.x=0;plane.z=E.WORLD.centerZ;E.update(plane,{boost:true},.02);assert.ok(plane.speed<=27);}
 near(plane.speed,27,1e-6);near(plane.throttle,1);near(plane.propRPM,E.FLIGHT.maxRPM,1e-5);
 const throttle=plane.throttle;step(plane,{},.1);near(plane.throttle,throttle);
 for(let i=0;i<2500;i++){plane.x=0;plane.z=E.WORLD.centerZ;E.update(plane,{brake:true},.02);}
 near(plane.speed,0,1e-6);near(plane.throttle,0);near(plane.propRPM,E.FLIGHT.idleRPM,1e-5);
});

function follow(s,points,speed=7){
 let n=0,maxY=s.y;
 for(let i=0;i<50000&&n<points.length;i++){
  const p=points[n];if(Math.hypot(p.x-s.x,p.z-s.z)<1.2){n++;continue;}
  const target=Math.atan2(p.x-s.x,s.z-p.z),error=Math.atan2(Math.sin(target-s.heading),Math.cos(target-s.heading));
  E.update(s,{up:s.speed<speed,brake:s.speed>speed+.5,left:error<-.015,right:error>.015},.02);maxY=Math.max(maxY,s.y);
 }
 assert.equal(n,points.length,`Stuck ${n}/${points.length}: ${JSON.stringify(s)}`);return maxY;
}
test('winding road is continuous, elevated, and drivable for a complete loop through tunnel',()=>{
 const s=onRoad(running()),points=[];
 for(let a=-1.82+.025;a<-1.82+Math.PI*2;a+=.025){
  const p=E.roadPoint(a);near(E.roadOffset(p.x,p.z),0);near(E.terrainHeight(p.x,p.z),p.y);
  assert.ok(E.roadRadius(p.x,p.z)<2);points.push(p);
 }
 const highest=follow(s,points);assert.ok(highest>34);assert.ok(s.y<3);assert.ok(!s.events.some(e=>e.type==='bump'));
});
test('tunnel walls block jeep and allow reversing back to road center',()=>{
 for(const side of [-1,1]){
  const a=.2,p=E.roadPoint(a),offset=side*(E.TUNNEL.innerHalfWidth-1.3);
  const s=running();Object.assign(s,{x:p.x+Math.sin(a)*offset,z:p.z-Math.cos(a)*offset,heading:side===1?a:a+Math.PI,speed:14});
  const x=s.x,z=s.z;E.update(s,{up:true},.05);assert.ok(Math.hypot(s.x-x,s.z-z)<.11);assert.ok(Math.abs(s.speed)<.1);assert.match(s.events.at(-1).text,/Tunnel/);
  step(s,{down:true},.5);assert.ok(Math.abs(E.roadOffset(s.x,s.z))<Math.abs(offset));
 }
});
test('plane clears the elevated ridge and tunnel rock without exceeding ceiling',()=>{
 for(const a of [-.2,.2,.6]){
  const p=E.roadPoint(a),s=running('plane');Object.assign(s,{...p,y:2,takeoff:0});E.update(s,{},.02);
  assert.ok(s.y>=E.terrainHeight(s.x,s.z)+4);assert.ok(s.y<=E.WORLD.flightCeiling);
  if(a===.2)assert.ok(s.y>=p.y+E.TUNNEL.height+7);
 }
});
test('driveway levels and terrain road shoulder are continuous',()=>{
 for(const p of E.DRIVEWAY.slice(1))near(E.terrainHeight(p.x,p.z),p.y);
 const a=.2,p=E.roadPoint(a);for(const offset of [-6,6])near(E.terrainHeight(p.x+Math.sin(a)*offset,p.z-Math.cos(a)*offset),p.y);
 const s=running();Object.assign(s,E.roadPoint(-.4),{heading:Math.atan2(E.roadPoint(-.399).x-E.roadPoint(-.4).x,E.roadPoint(-.4).z-E.roadPoint(-.399).z)});E.update(s,{},.02);assert.ok(s.pitch<.05);step(s,{},.7);assert.ok(s.pitch>.01&&s.pitch<.04);
});

test('plane boundary warns, permits manual return and resets countdown',()=>{
 const s=startedPlane(),b=E.FLIGHT_BOUNDARY;
 Object.assign(s,{x:E.WORLD.roadRadius*(b.warningRadius+.01),z:E.WORLD.centerZ,y:30,onWater:false,heading:Math.PI/2,speed:16,throttle:.6});
 E.update(s,{},.02);assert.equal(s.boundaryStatus,'warning');
 s.x=E.WORLD.roadRadius*(b.normalRadius+.01);const heading=s.heading;step(s,{},.5);
 assert.equal(s.boundaryStatus,'outside');near(s.heading,heading);assert.ok(s.boundaryRemaining<b.returnSeconds);
 for(let i=0;i<700&&s.boundaryStatus==='outside';i++)E.update(s,{left:true},.02);
 assert.ok(['inside','warning'].includes(s.boundaryStatus),JSON.stringify(s));near(s.boundaryRemaining,b.returnSeconds);
});
test('plane boundary recovers gently after timeout or far excursion and stays bounded',()=>{
 const b=E.FLIGHT_BOUNDARY;
 for(const initial of [{x:E.WORLD.roadRadius*(b.normalRadius+.07),z:E.WORLD.centerZ,boundaryRemaining:.05},{x:E.WORLD.roadRadius*(b.graceRadius+.01),z:E.WORLD.centerZ},{x:0,z:b.graceNorth-1}]){
  const s=startedPlane();Object.assign(s,{y:40,onWater:false,heading:Math.PI/2,throttle:.65,speed:16},initial);
  let recovered=false;
  for(let i=0;i<3000;i++){
   const heading=s.heading;E.update(s,{},.02);assert.ok(Math.abs(s.heading-heading)<=.65*.02+1e-9,'No forced 180-degree heading snap');
   assert.ok(E.roadRadius(s.x,s.z)<=b.hardRadius+1e-8);assert.ok(s.z>=b.hardNorth);assert.ok(s.y<=E.WORLD.flightCeiling);
   recovered ||= s.boundaryStatus==='recovering';
   if(recovered&&['inside','warning'].includes(s.boundaryStatus))break;
  }
  assert.ok(recovered);assert.ok(['inside','warning'].includes(s.boundaryStatus),JSON.stringify(s));
 }
});
test('flight dynamic state resets on switching, mooring and restart',()=>{
 const s=startedPlane();step(s,{boost:true,up:true,right:true},5);assert.ok(s.throttle>0);E.switchVehicle(s,'jeep');
 for(const k of ['throttle','propRPM','verticalSpeed','yawRate'])near(s[k],0);
 E.switchVehicle(s,'plane');near(s.speed,0);assert.equal(s.onWater,true);near(s.throttle,0);
 Object.assign(s,{enginePhase:'running',actionReady:true,onWater:true,throttle:.7,propRPM:2200,verticalSpeed:3,yawRate:.4});E.action(s);
 assert.equal(s.parked,true);for(const k of ['throttle','propRPM','verticalSpeed','yawRate'])near(s[k],0);
 E.begin(s,'plane');assert.equal(s.parked,false);assert.equal(s.boundaryStatus,'inside');near(s.throttle,0);
});

test('jeep simulation is consistent at 30, 60 and 120 fps',()=>{
 const simulate=fps=>{
  const s=running();
  for(const [seconds,input] of [[3,{up:true}],[.5,{up:true,right:true}],[2,{up:true}],[1,{brake:true}],[1,{down:true,left:true}]])for(let i=0;i<Math.round(seconds*fps);i++)E.update(s,input,1/fps);
  return s;
 };
 const reference=simulate(120);
 for(const fps of [30,60]){const s=simulate(fps);for(const k of ['x','y','z','speed','heading','steeringAngle','pitch','roll','suspensionVelocity'])near(s[k],reference[k],1e-8);}
});
test('high-speed steering respects grip and returns to center smoothly',()=>{
 const s=running();s.speed=22;const initial=s.heading;E.update(s,{right:true,up:true},1/60);
 assert.ok(s.steeringAngle>0&&s.steeringAngle<.02);assert.ok(s.heading-initial<.003);
 for(let i=0;i<120;i++){s.x=-E.WORLD.roadRadius;s.z=E.WORLD.centerZ;E.update(s,{right:true,up:true},1/120);assert.ok(Math.abs(s.yawRate*s.speed)<=E.JEEP.maxLateralAcceleration+.01);}
 const angle=s.steeringAngle;E.update(s,{up:true},1/120);assert.ok(s.steeringAngle<angle&&s.steeringAngle>angle*.8);
 for(let i=0;i<120;i++){s.x=-E.WORLD.roadRadius;s.z=E.WORLD.centerZ;E.update(s,{up:true},1/120);}assert.ok(Math.abs(s.steeringAngle)<.001);
});
test('braking from boosted speed is gradual and stops without unintended reverse',()=>{
 const s=running();Object.assign(s,{speed:28,acceleration:0});
 E.update(s,{brake:true},1/60);assert.ok(s.speed>27&&s.speed<28);
 for(let i=0;i<600;i++){s.x=-E.WORLD.roadRadius;s.z=E.WORLD.centerZ;E.update(s,{brake:true},1/120);assert.ok(s.speed>=0);}
 near(s.speed,0);step(s,{down:true},1);assert.ok(s.speed<0);
 const boost=running();boost.speed=28;E.update(boost,{up:true},.02);assert.ok(boost.speed>27.9,'Releasing boost must not instantly lose6 m/s');
});
test('new cabin foundation is flat and expanded footprint blocks jeep and protects plane',()=>{
 for(let x=-2.8;x<=23.8;x+=2)for(let z=-26.4;z<=-6.5;z+=2)near(E.terrainHeight(x,z),1.1);
 for(const p of E.DRIVEWAY.slice(1))near(E.terrainHeight(p.x,p.z),p.y);
 const s=running();Object.assign(s,{x:24,z:-28.05,heading:Math.PI,speed:10});E.update(s,{up:true},.05);assert.ok(s.z<=E.CABIN_BOUNDS.minZ);assert.ok(s.speed<.1);
 const plane=running('plane');Object.assign(plane,{x:24,z:-25,y:3,onWater:false});E.update(plane,{},.02);assert.ok(plane.y>=15);
});

test('keyboard lane following remains controlled at raised speed through slopes and tunnel',()=>{
 const s=onRoad(running()),lane=1.9;let last=-1.82,progress=0,peak=0,maxGroundError=0;
 for(let i=0;i<40000&&progress<Math.PI*2;i++){
  const a=E.roadSample(s.x,s.z).angle,station=E.roadPoint(a),ahead=E.roadPoint(a+.001),stepAngle=Math.max(a>.38&&a<2.95?7:18,s.speed*.8)/Math.hypot(ahead.x-station.x,ahead.z-station.z)*.001,p=E.roadPoint(a+stepAngle),next=E.roadPoint(a+stepAngle+.0001),length=Math.hypot(next.x-p.x,next.z-p.z);
  const nx=(next.z-p.z)/length,nz=(next.x-p.x)/length;p.x+=nx*lane;p.z-=nz*lane;
  const target=Math.atan2(p.x-s.x,s.z-p.z),error=Math.atan2(Math.sin(target-s.heading-s.yawRate*.18),Math.cos(target-s.heading-s.yawRate*.18));
  const oldPitch=s.pitch,oldRoll=s.roll;
  const corner=a>.38&&a<2.95,targetSpeed=corner?8:22;
  E.update(s,{up:s.speed<targetSpeed,brake:s.speed>targetSpeed+1,left:error<-.01,right:error>.01},1/60);
  const angle=Math.atan2(s.x,E.WORLD.centerZ-s.z);progress+=Math.atan2(Math.sin(angle-last),Math.cos(angle-last));last=angle;
  if(progress>.15)assert.ok(Math.abs(E.roadOffset(s.x,s.z)-lane)<1.6,'Must remain in the selected lane corridor');
  assert.ok(Math.abs(s.pitch-oldPitch)<.025&&Math.abs(s.roll-oldRoll)<.025,'Suspension rotations must not jump');
  maxGroundError=Math.max(maxGroundError,Math.abs(s.y-E.terrainHeight(s.x,s.z)));peak=Math.max(peak,s.speed);
 }
 assert.ok(progress>=Math.PI*2);assert.ok(peak>21.9&&peak<=22);assert.ok(maxGroundError<.08);
 assert.ok(!s.events.some(e=>e.type==='bump'),'Raised-speed route must stay clear of tunnel walls and boundaries');
});

test('startup takes three seconds, ignores early power and respects pause/reset',()=>{
 const s=running('plane');step(s,{boost:true,up:true},2);near(s.speed,0);near(s.throttle,0);near(s.propRPM,0);assert.equal(s.enginePhase,'off');
 assert.equal(E.action(s),true);step(s,{boost:true},1.5);assert.equal(s.enginePhase,'starting');near(s.throttle,0);assert.ok(s.propRPM>0&&s.propRPM<E.FLIGHT.idleRPM);
 assert.equal(E.action(s),false,'Repeated Space must not restart the timer');
 E.togglePause(s);const paused=structuredClone(s);step(s,{boost:true},5);assert.deepEqual(s,paused);E.togglePause(s);
 step(s,{},1.5);assert.equal(s.enginePhase,'running');near(s.propRPM,E.FLIGHT.idleRPM);near(s.speed,0);
 E.switchVehicle(s,'jeep');E.switchVehicle(s,'plane');assert.equal(s.enginePhase,'off');near(s.propRPM,0);
 E.action(s);step(s,{},1);E.begin(s,'plane');assert.equal(s.enginePhase,'off');near(s.engineStartRemaining,0);
});
test('Control reduces throttle in air and brakes more strongly on water',()=>{
 const water=startedPlane(),air=startedPlane();
 Object.assign(water,{x:0,z:E.WORLD.centerZ,speed:12,throttle:.5,onWater:true});Object.assign(air,{x:0,z:E.WORLD.centerZ,speed:12,throttle:.5,y:25,onWater:false});
 step(water,{brake:true},.5);step(air,{brake:true},.5);assert.ok(water.throttle<.5&&air.throttle<.5);assert.ok(water.speed<air.speed-2.5);
 step(water,{brake:true},2);near(water.speed,0);assert.equal(water.onWater,true);
});
test('landing guidance and control surfaces track genuine input without auto-mooring',()=>{
 const s=startedPlane();Object.assign(s,{x:E.LANDING_CORRIDOR.centerX,z:150,y:12,onWater:false,speed:15,throttle:.5,heading:0});
 E.update(s,{down:true,right:true},.02);assert.equal(s.landingStatus,'approach');assert.equal(s.landingAligned,true);assert.ok(s.elevatorAngle<0&&s.aileronAngle>0&&s.rudderAngle>0);
 s.heading=Math.PI;E.update(s,{},.02);assert.equal(s.landingAligned,false);assert.equal(s.actionReady,false);
 Object.assign(s,{x:-25,z:130,y:.4,onWater:false,pitch:-.1,verticalSpeed:-.5,heading:0,speed:10});
 step(s,{down:true,brake:true},2);assert.equal(s.onWater,true);assert.ok(s.events.some(e=>e.type==='touchdown'));assert.equal(s.parked,false);assert.ok(s.touchdownAge>=0);
});

test('expanded lake keeps the original physical shore margin and dock-side driveway reachable',()=>{
 const margin=1+4/E.LAKE.rz;
 for(const p of E.DRIVEWAY)assert.ok(E.lakeRadius(p.x,p.z)>margin);
 const s=running();Object.assign(s,{x:E.HOME.x,z:E.HOME.z,y:E.terrainHeight(E.HOME.x,E.HOME.z),heading:Math.PI});
 follow(s,[E.DRIVEWAY.at(-1)]);assert.ok(Math.hypot(s.x-E.DRIVEWAY.at(-1).x,s.z-E.DRIVEWAY.at(-1).z)<1.2);assert.ok(!s.events.some(e=>e.type==='bump'));
});

test('extended dock berth floats clear of pier and water taxi cannot pass through pilings',()=>{
 const s=running('plane');Object.assign(s,{enginePhase:'running',propRPM:650,onWater:true,x:E.DOCK.x,z:E.DOCK.z,y:E.FLIGHT.waterHeight,heading:0,speed:0});E.update(s,{},.02);assert.equal(s.actionReady,true);assert.equal(E.action(s),true);
 const taxi=running('plane');Object.assign(taxi,{enginePhase:'running',propRPM:1800,throttle:.5,onWater:true,x:-23.5,z:22,y:E.FLIGHT.waterHeight,heading:Math.PI/2,speed:4});const x=taxi.x;E.update(taxi,{},.02);assert.ok(taxi.x<=x+.1);assert.equal(taxi.speed,0);assert.match(taxi.events.at(-1).text,/Pier/);
});


test('floatplane pushback is slow, water-only, stops on release, and respects brake and mooring',()=>{
 const s=running('plane');Object.assign(s,{x:0,z:300,heading:0});const z=s.z;
 step(s,{reverse:true},4);assert.ok(s.speed<-.9&&s.speed>=-1.4);assert.ok(s.z>z+2);assert.equal(s.onWater,true);near(s.y,E.FLIGHT.waterHeight);
 step(s,{brake:true,reverse:true},1);near(s.speed,0);
 step(s,{reverse:true},2);step(s,{},8);near(s.speed,0,.02);
 Object.assign(s,{onWater:false,y:30,speed:0});step(s,{reverse:true},1);assert.ok(s.speed>=0);
 Object.assign(s,{parked:true,onWater:true,y:E.FLIGHT.waterHeight,speed:0});const pos=[s.x,s.z];step(s,{reverse:true},2);assert.deepEqual([s.x,s.z],pos);
});
test('plane can cruise far above the old ceiling and the mountain summit',()=>{
 assert.ok(E.WORLD.flightCeiling>=1200);
 const s=startedPlane();Object.assign(s,{x:0,z:300,y:950,onWater:false,speed:24,throttle:.9});step(s,{up:true},3);assert.ok(s.y>960);assert.ok(s.y<E.WORLD.flightCeiling);
});
test('Jeep starts in a marked cabin bay and can leave through the access aisle',()=>{
 const s=running(),bay=E.PARKING.find(p=>p.x===s.x&&p.z===s.z);assert.ok(bay);near(s.heading,-Math.PI/2);
 follow(s,[{x:-26,z:-9},{x:-26,z:-19},...E.DRIVEWAY.slice(0,-3).reverse()],3);
 assert.ok(!s.events.some(e=>e.type==='bump'));assert.ok(Math.abs(E.roadOffset(s.x,s.z))<4);
});
