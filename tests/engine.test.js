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
 for(const [x,z,heading] of [[-4.6,-10,Math.PI/2],[-81,62,Math.PI/2],[-106.9,62,-Math.PI/2]]){
  const s=running();Object.assign(s,{x,z,heading,speed:14});E.update(s,{up:true},.05);near(s.x,x);near(s.z,z);assert.ok(s.speed<0);assert.equal(s.events.at(-1).type,'bump');
 }
});
test('collision notices are rate limited',()=>{
 const s=running();Object.assign(s,{x:-4.6,z:-10,heading:Math.PI/2,speed:14});E.update(s,{up:true},.05);s.speed=14;E.update(s,{up:true},.05);assert.equal(s.events.length,1);
});
test('plane takes off, climbs, descends, banks, brakes and stays bounded',()=>{
 const s=running('plane');step(s,{},3.1);assert.ok(s.y>11);s.x=0;s.z=62;step(s,{up:true},1);assert.ok(s.y>17);
 s.x=0;s.z=62;s.y=41;step(s,{up:true},1);near(s.y,42);s.x=0;s.z=62;s.y=2;step(s,{down:true},.1);near(s.y,1.7);
 const heading=s.heading;step(s,{right:true,brake:true},.3);assert.ok(s.heading>heading);assert.ok(s.roll<0);assert.ok(s.speed<15);
 Object.assign(s,{x:106,z:62,y:20,heading:Math.PI/2,speed:27});step(s,{},1);assert.ok(E.roadRadius(s.x,s.z)<=1.14);assert.ok(s.x<106);
 Object.assign(s,{x:0,z:-44.9,heading:0,y:20});step(s,{},.1);assert.ok(s.z>=-45);
});
test('plane avoids low shoreline and cabin terrain',()=>{
 const s=running('plane');Object.assign(s,{x:-90,z:62,y:1.7,takeoff:0});E.update(s,{},.02);assert.ok(s.y>=6);
 Object.assign(s,{x:0,z:-10,y:6,takeoff:0});E.update(s,{},.02);assert.ok(s.y>=14);
});
test('dock interaction moors, holds still, then takes off',()=>{
 const s=running('plane');assert.equal(E.action(s),false);Object.assign(s,{x:E.DOCK.x,z:E.DOCK.z,y:10,takeoff:0});E.update(s,{},.02);assert.equal(s.actionReady,true);
 assert.equal(E.action(s),true);assert.equal(s.parked,true);near(s.x,E.DOCK.x);near(s.z,E.DOCK.z);const pos=[s.x,s.y,s.z];step(s,{up:true,right:true},2);assert.deepEqual([s.x,s.y,s.z],pos);
 assert.equal(E.action(s),true);assert.equal(s.parked,false);step(s,{},.5);assert.ok(s.y>pos[1]);
});
test('switching resets vehicle-specific state and restart resets session',()=>{
 const s=running();step(s,{up:true},.5);s.arrived=true;assert.equal(E.switchVehicle(s,'plane'),true);assert.equal(s.phase,'plane');assert.equal(s.arrived,false);near(s.elapsed,.5);
 E.switchVehicle(s,'jeep');assert.equal(s.speed,0);assert.equal(s.pitch,0);assert.equal(s.takeoff,0);const saved=structuredClone(s);assert.equal(E.switchVehicle(s,'boat'),false);assert.deepEqual(s,saved);
 E.begin(s);assert.equal(s.elapsed,0);assert.deepEqual(s.events,[]);assert.equal(s.status,'running');
});
test('road and driveway are drivable continuously from spawn to cabin',()=>{
 const s=running(),points=[];
 for(let a=Math.atan2(s.x,62-s.z)+.08;a<-.24;a+=.08)points.push({x:94*Math.sin(a),z:62-94*Math.cos(a)});
 points.push({x:-22,z:-29},{x:-23,z:-19},{x:E.HOME.x,z:E.HOME.z});
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

test('floatplane can fly from its launch point to the cabin dock',()=>{
 const s=running('plane');
 for(let i=0;i<1000&&!s.actionReady;i++){
  const target=Math.atan2(E.DOCK.x-s.x,s.z-E.DOCK.z),error=Math.atan2(Math.sin(target-s.heading),Math.cos(target-s.heading));
  E.update(s,{left:error<-.01,right:error>.01},.02);
 }
 assert.equal(s.actionReady,true);assert.equal(s.events.length,0);assert.equal(E.action(s),true);assert.equal(s.parked,true);
});
