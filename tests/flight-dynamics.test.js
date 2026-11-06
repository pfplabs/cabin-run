import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
const run=(s,input,seconds,fps=120)=>{for(let i=0;i<Math.round(seconds*fps);i++)E.update(s,input,1/fps);};
function plane(){const s=E.fresh();E.begin(s,'plane');E.action(s);run(s,{},3);return s;}
test('identical control sequence stays consistent at 20, 30, 60 and 120 fps',()=>{
 const simulate=fps=>{const s=plane();for(const [input,t] of [[{boost:true,up:true},9],[{up:true,right:true},2],[{brake:true},2],[{down:true,left:true},1]])run(s,input,t,fps);return s;};
 const reference=simulate(120);
 for(const fps of [20,30,60]){const s=simulate(fps);for(const key of ['x','y','z','speed','heading','pitch','roll','propRPM'])assert.ok(Math.abs(s[key]-reference[key])<1e-7,`${fps} fps ${key}: ${s[key]} vs ${reference[key]}`);}
});
test('engine RPM limits initial acceleration and full power cannot lift a stationary floatplane',()=>{
 const slow=plane(),spooled=plane();for(const s of [slow,spooled])s.throttle=1;
 spooled.propRPM=E.FLIGHT.maxRPM;run(slow,{up:true},.1);run(spooled,{up:true},.1);
 assert.ok(spooled.speed>slow.speed*3);assert.equal(slow.onWater,true);assert.equal(spooled.onWater,true);
});
test('power-off aircraft glides and stalled aircraft descends despite held elevator',()=>{
 const glide=plane();Object.assign(glide,{y:150,onWater:false,speed:20,enginePhase:'off',verticalSpeed:0});run(glide,{},5);
 assert.ok(glide.y<149&&glide.speed>10,'engine-off flight must exchange height for forward speed');
 const stalled=plane();Object.assign(stalled,{y:150,onWater:false,speed:4,enginePhase:'off',pitch:.3});run(stalled,{up:true},1);
 assert.ok(stalled.y<147);assert.ok(stalled.verticalSpeed<0);assert.equal(stalled.stallWarning,true);
});
test('bank precedes turn and release rolls back toward level',()=>{
 const s=plane();Object.assign(s,{y:150,onWater:false,speed:20,throttle:.6,propRPM:1820});const h=s.heading;
 run(s,{right:true},.1);assert.ok(s.roll<0);assert.ok(s.heading>h&&s.heading-h<.02);
 run(s,{right:true},1);const bank=Math.abs(s.roll);run(s,{},1);assert.ok(Math.abs(s.roll)<bank*.1);
});
