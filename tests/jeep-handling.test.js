import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
const ready=speed=>{const s=E.fresh();E.begin(s);Object.assign(s,{x:-564,z:352,y:E.terrainHeight(-564,352),heading:0,speed});return s;};
function stop(speed,fps=120){const s=ready(speed);let distance=0,time=0;for(let i=0;i<fps*5&&Math.abs(s.speed)>1e-8;i++){const p={x:s.x,z:s.z};E.update(s,{brake:true},1/fps);assert.ok(speed*s.speed>=0,'Braking must not reverse direction');distance+=Math.hypot(s.x-p.x,s.z-p.z);time+=1/fps;}return {s,distance,time};}
function lock(speed,side=1){const s=ready(speed);for(let i=0;i<360;i++){s.x=-564;s.z=352;s.speed=speed;E.update(s,side>0?{right:true}:{left:true},1/120);}return s;}

test('stronger service brakes stop highway and boost speeds promptly without snapping or reversing',()=>{
 const first=ready(28);E.update(first,{brake:true},1/120);assert.ok(first.speed>27.95&&first.speed<28);
 const cruise=stop(22),boost=stop(28),reverse=stop(-6);
 assert.equal(cruise.s.speed,0);assert.ok(cruise.distance<23&&cruise.time<2);
 assert.equal(boost.s.speed,0);assert.ok(boost.distance<36&&boost.time<2.5);
 assert.equal(reverse.s.speed,0);assert.ok(reverse.distance<2&&reverse.time<.65);
 for(let i=0;i<120;i++)E.update(boost.s,{brake:true,up:true},1/120);assert.equal(boost.s.speed,0);
});
test('braking distance and outcome are consistent at 30, 60 and 120 fps',()=>{
 const reference=stop(28);for(const fps of [30,60]){const result=stop(28,fps);assert.ok(Math.abs(result.distance-reference.distance)<1e-8);assert.equal(result.s.speed,0);assert.ok(Math.abs(result.time-reference.time)<=1/fps);}
});
test('parking lock gives tight forward and reverse turns with symmetric steering',()=>{
 for(const speed of [2,4,-2,-4]){const right=lock(speed),left=lock(speed,-1);assert.ok(Math.abs(speed/right.yawRate)<3.3);assert.ok(right.steeringAngle>.7&&right.steeringAngle<E.JEEP.parkingSteeringAngle);assert.ok(Math.abs(right.yawRate+left.yawRate)<1e-10);assert.equal(Math.sign(right.yawRate),Math.sign(speed));}
 const idle=lock(0);assert.equal(idle.heading,0);assert.equal(idle.yawRate,0);
});
test('cruise steering response and lateral grip remain identical to the previous control law',()=>{
 for(const speed of [12,18,22,28]){const s=ready(speed);let expectedAngle=0,expectedYaw=0;
  for(let i=0;i<120;i++){s.x=-564;s.z=352;s.speed=speed;E.update(s,{right:true},1/120);
   const v=Math.abs(s.speed),limit=Math.min(.55/(1+(v/16)**2),Math.atan(9*2.8/Math.max(1,v*v)));
   expectedAngle+=(limit-expectedAngle)*(1-Math.exp(-5.5/120));
   const yaw=E.clamp(s.speed*Math.tan(expectedAngle)/2.8,-9/Math.max(v,1),9/Math.max(v,1));expectedYaw+=(yaw-expectedYaw)*(1-Math.exp(-9/120));
   assert.ok(Math.abs(s.steeringAngle-expectedAngle)<1e-12);assert.ok(Math.abs(s.yawRate-expectedYaw)<1e-12);assert.ok(Math.abs(s.yawRate*s.speed)<=9.001);
  }
 }
});
