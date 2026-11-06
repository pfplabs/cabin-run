import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
const step=(s,input={},seconds=1)=>{for(let t=0;t<seconds-1e-8;t+=.02)E.update(s,input,.02);return s;};
const running=(vehicle='jeep')=>{const s=E.fresh();E.begin(s,vehicle);return s;};
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('ready and paused states do not simulate; resume preserves position',()=>{
 const s=E.fresh(), initial=structuredClone(s);step(s,{up:true});assert.deepEqual(s,initial);
 E.begin(s);step(s,{up:true},.4);E.togglePause(s);const paused=structuredClone(s);step(s,{up:true},2);assert.deepEqual(s,paused);
 assert.equal(E.action(s),false);E.togglePause(s);step(s,{up:true},.1);assert.notEqual(s.x,paused.x);
});
test('jeep accelerates, brakes, reverses and steers in both directions',()=>{
 const s=running();step(s,{up:true},.5);assert.ok(s.speed>4);const speed=s.speed;step(s,{brake:true},.3);assert.ok(s.speed<speed*.1);
 step(s,{down:true},.6);assert.ok(s.speed<-4);const h=s.heading;step(s,{down:true,right:true},.1);assert.ok(s.heading<h);
 const forward=running();step(forward,{up:true},.5);const fh=forward.heading;step(forward,{up:true,right:true},.1);assert.ok(forward.heading>fh);
});
test('jeep cabin, shoreline and outer boundaries stop motion',()=>{
 for(const [x,z,heading] of [[-4.6,-10,Math.PI/2],[-E.LAKE.rx*1.035-.1,E.WORLD.centerZ,Math.PI/2],[-E.WORLD.roadRadius*1.14+.1,E.WORLD.centerZ,-Math.PI/2]]){
  const s=running();Object.assign(s,{x,z,heading,speed:14});E.update(s,{up:true},.05);near(s.x,x);near(s.z,z);assert.ok(s.speed<0);assert.equal(s.events.at(-1).type,'bump');
 }
});
test('collision notices are rate limited',()=>{
 const s=running();Object.assign(s,{x:-4.6,z:-10,heading:Math.PI/2,speed:14});E.update(s,{up:true},.05);s.speed=14;E.update(s,{up:true},.05);assert.equal(s.events.length,1);
});
test('plane accelerates on water before lifting, with smoothed pitch and bank',()=>{
 const s=running('plane');near(s.speed,0);near(s.y,E.FLIGHT.waterHeight);assert.equal(s.onWater,true);
 step(s,{up:true},2);near(s.speed,0);near(s.y,E.FLIGHT.waterHeight);
 E.update(s,{boost:true,up:true,right:true},.02);assert.ok(s.throttle>0&&s.throttle<.01);assert.ok(s.propRPM>E.FLIGHT.idleRPM);assert.ok(s.yawRate<.01);
 step(s,{boost:true,up:true},6);assert.ok(s.speed>10);assert.ok(s.y>E.FLIGHT.waterHeight+1);assert.equal(s.onWater,false);
 const before={pitch:s.pitch,vertical:s.verticalSpeed,heading:s.heading};E.update(s,{down:true,left:true},.02);
 assert.ok(Math.abs(s.pitch-before.pitch)<.03);assert.ok(Math.abs(s.verticalSpeed-before.vertical)<.6);assert.ok(Math.abs(s.heading-before.heading)<.02);
 s.x=0;s.z=E.WORLD.centerZ;s.y=E.WORLD.flightCeiling-.1;step(s,{up:true},1);near(s.y,E.WORLD.flightCeiling);
 s.x=0;s.z=E.WORLD.centerZ;s.y=.4;s.verticalSpeed=-2;s.pitch=-.3;step(s,{down:true},.3);near(s.y,E.FLIGHT.waterHeight);assert.equal(s.onWater,true);
});
test('plane avoids low shoreline and cabin terrain',()=>{
 const s=running('plane');Object.assign(s,{x:-E.LAKE.rx-12,z:E.WORLD.centerZ,y:1.7,takeoff:0});E.update(s,{},.02);assert.ok(s.y>=6);
 Object.assign(s,{x:0,z:-10,y:6,takeoff:0});E.update(s,{},.02);assert.ok(s.y>=14);
});
test('dock interaction moors, holds still, then takes off',()=>{
 const s=running('plane');assert.equal(E.action(s),false);Object.assign(s,{x:E.DOCK.x,z:E.DOCK.z,y:10,takeoff:0});E.update(s,{},.02);assert.equal(s.actionReady,true);
 assert.equal(E.action(s),true);assert.equal(s.parked,true);near(s.x,E.DOCK.x);near(s.z,E.DOCK.z);const pos=[s.x,s.y,s.z];step(s,{up:true,right:true},2);assert.deepEqual([s.x,s.y,s.z],pos);
 assert.equal(E.action(s),true);assert.equal(s.parked,false);near(s.speed,0);step(s,{},.5);near(s.y,pos[1]);step(s,{boost:true,up:true},6);assert.ok(s.y>pos[1]);
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

test('floatplane flies to cabin dock using throttle, pitch and steering inputs',()=>{
 const s=running('plane');let maxAltitude=0;
 for(let i=0;i<2500&&!s.actionReady;i++){
  const distance=Math.hypot(E.DOCK.x-s.x,E.DOCK.z-s.z),target=Math.atan2(E.DOCK.x-s.x,s.z-E.DOCK.z);
  const error=Math.atan2(Math.sin(target-s.heading-s.yawRate*.6),Math.cos(target-s.heading-s.yawRate*.6));
  const throttle=distance<60?.32:.7,predicted=s.y+s.verticalSpeed*.8;
  E.update(s,{boost:s.throttle<throttle-.01,brake:s.throttle>throttle+.01,up:predicted<7.5,down:predicted>8.5,left:error<-.025,right:error>.025},.02);
  maxAltitude=Math.max(maxAltitude,s.y);
 }
 assert.ok(maxAltitude>5,'Must actually take off rather than taxi the route');
 assert.equal(s.actionReady,true,JSON.stringify(s));assert.equal(s.events.length,0);assert.equal(E.action(s),true);assert.equal(s.parked,true);
});

test('expanded lake has four times the original area and preserves cabin landmarks',()=>{
 near((Math.PI*E.LAKE.rx*E.LAKE.rz)/(Math.PI*78*57),4);
 assert.deepEqual(E.HOME,{x:-16,z:-9});assert.deepEqual(E.DOCK,{x:-25,z:16});
 near(E.roadRadius(0,E.WORLD.centerZ-E.WORLD.roadRadius),1);
 const jeep=running(),plane=running('plane');assert.deepEqual([jeep.x,jeep.z],[E.roadPoint(-1.82).x,E.roadPoint(-1.82).z]);assert.deepEqual([plane.x,plane.z],[-40,218]);
});
test('larger world preserves jeep and floatplane speed limits',()=>{
 for(const [input,limit] of [[{up:true},14],[{up:true,boost:true},19],[{down:true},-6]]){
  const s=running();for(let i=0;i<1000;i++){s.x=-E.WORLD.roadRadius;s.z=E.WORLD.centerZ;E.update(s,input,.02);}
  near(s.speed,limit);
 }
 const plane=running('plane');
 for(let i=0;i<2500;i++){plane.x=0;plane.z=E.WORLD.centerZ;E.update(plane,{boost:true},.02);assert.ok(plane.speed<=27);}
 near(plane.speed,27,1e-6);near(plane.throttle,1);near(plane.propRPM,E.FLIGHT.maxRPM,1e-5);
 const throttle=plane.throttle;step(plane,{},.1);near(plane.throttle,throttle);
 for(let i=0;i<2500;i++){plane.x=0;plane.z=E.WORLD.centerZ;E.update(plane,{brake:true},.02);}
 near(plane.speed,0,1e-6);near(plane.throttle,0);near(plane.propRPM,E.FLIGHT.idleRPM,1e-5);
});

function follow(s,points){
 let n=0,maxY=s.y;
 for(let i=0;i<30000&&n<points.length;i++){
  const p=points[n];if(Math.hypot(p.x-s.x,p.z-s.z)<1.2){n++;continue;}
  const target=Math.atan2(p.x-s.x,s.z-p.z),error=Math.atan2(Math.sin(target-s.heading),Math.cos(target-s.heading));
  E.update(s,{up:s.speed<7,left:error<-.015,right:error>.015},.02);maxY=Math.max(maxY,s.y);
 }
 assert.equal(n,points.length,`Stuck ${n}/${points.length}: ${JSON.stringify(s)}`);return maxY;
}
test('winding road is continuous, elevated, and drivable for a complete loop through tunnel',()=>{
 const s=running(),points=[];
 for(let a=-1.82+.025;a<-1.82+Math.PI*2;a+=.025){
  const p=E.roadPoint(a);near(E.roadOffset(p.x,p.z),0);near(E.terrainHeight(p.x,p.z),p.y);
  assert.ok(E.roadRadius(p.x,p.z)<1.14);points.push(p);
 }
 const highest=follow(s,points);assert.ok(highest>34);assert.ok(s.y<3);assert.ok(!s.events.some(e=>e.type==='bump'));
});
test('tunnel walls block jeep and allow reversing back to road center',()=>{
 for(const side of [-1,1]){
  const a=.2,p=E.roadPoint(a),offset=side*(E.TUNNEL.innerHalfWidth-1.3);
  const s=running();Object.assign(s,{x:p.x+Math.sin(a)*offset,z:p.z-Math.cos(a)*offset,heading:side===1?a:a+Math.PI,speed:14});
  const x=s.x,z=s.z;E.update(s,{up:true},.05);near(s.x,x);near(s.z,z);assert.ok(s.speed<0);assert.match(s.events.at(-1).text,/Tunnel/);
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
 const a=.2,p=E.roadPoint(a);for(const offset of [-5,5])near(E.terrainHeight(p.x+Math.sin(a)*offset,p.z-Math.cos(a)*offset),p.y);
 const s=running();Object.assign(s,E.roadPoint(-.4),{heading:Math.atan2(E.roadPoint(-.399).x-E.roadPoint(-.4).x,E.roadPoint(-.4).z-E.roadPoint(-.399).z)});E.update(s,{},.02);assert.ok(s.pitch>.05);
});

test('plane boundary warns, permits manual return and resets countdown',()=>{
 const s=running('plane'),b=E.FLIGHT_BOUNDARY;
 Object.assign(s,{x:E.WORLD.roadRadius*(b.warningRadius+.01),z:E.WORLD.centerZ,y:30,onWater:false,heading:Math.PI/2,speed:16,throttle:.6});
 E.update(s,{},.02);assert.equal(s.boundaryStatus,'warning');
 s.x=E.WORLD.roadRadius*(b.normalRadius+.01);const heading=s.heading;step(s,{},.5);
 assert.equal(s.boundaryStatus,'outside');near(s.heading,heading);assert.ok(s.boundaryRemaining<b.returnSeconds);
 for(let i=0;i<700&&s.boundaryStatus==='outside';i++)E.update(s,{left:true},.02);
 assert.ok(['inside','warning'].includes(s.boundaryStatus),JSON.stringify(s));near(s.boundaryRemaining,b.returnSeconds);
});
test('plane boundary recovers gently after timeout or far excursion and stays bounded',()=>{
 const b=E.FLIGHT_BOUNDARY;
 for(const initial of [{x:E.WORLD.roadRadius*1.2,z:E.WORLD.centerZ,boundaryRemaining:.05},{x:E.WORLD.roadRadius*(b.graceRadius+.01),z:E.WORLD.centerZ},{x:0,z:b.graceNorth-1}]){
  const s=running('plane');Object.assign(s,{y:40,onWater:false,heading:Math.PI/2,throttle:.65,speed:16},initial);
  let recovered=false;
  for(let i=0;i<1600;i++){
   const heading=s.heading;E.update(s,{},.02);assert.ok(Math.abs(s.heading-heading)<=.65*.02+1e-9,'No forced 180-degree heading snap');
   assert.ok(E.roadRadius(s.x,s.z)<=b.hardRadius+1e-8);assert.ok(s.z>=b.hardNorth);assert.ok(s.y<=E.WORLD.flightCeiling);
   recovered ||= s.boundaryStatus==='recovering';
   if(recovered&&['inside','warning'].includes(s.boundaryStatus))break;
  }
  assert.ok(recovered);assert.ok(['inside','warning'].includes(s.boundaryStatus),JSON.stringify(s));
 }
});
test('flight dynamic state resets on switching, mooring and restart',()=>{
 const s=running('plane');step(s,{boost:true,up:true,right:true},5);assert.ok(s.throttle>0);E.switchVehicle(s,'jeep');
 for(const k of ['throttle','propRPM','verticalSpeed','yawRate'])near(s[k],0);
 E.switchVehicle(s,'plane');near(s.speed,0);assert.equal(s.onWater,true);near(s.throttle,0);
 Object.assign(s,{actionReady:true,throttle:.7,propRPM:2200,verticalSpeed:3,yawRate:.4});E.action(s);
 assert.equal(s.parked,true);for(const k of ['throttle','propRPM','verticalSpeed','yawRate'])near(s[k],0);
 E.begin(s,'plane');assert.equal(s.parked,false);assert.equal(s.boundaryStatus,'inside');near(s.throttle,0);
});
