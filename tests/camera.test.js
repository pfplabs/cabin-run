import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {CameraRig} from '../camera-rig.js';

class FakeTarget {
 constructor(){this.handlers=new Map();}
 addEventListener(type,fn){if(!this.handlers.has(type))this.handlers.set(type,new Set());this.handlers.get(type).add(fn);}
 removeEventListener(type,fn){this.handlers.get(type)?.delete(fn);}
 emit(type,props={}){for(const fn of [...(this.handlers.get(type)||[])])fn({type,preventDefault(){},...props});}
 get count(){return [...this.handlers.values()].reduce((n,set)=>n+set.size,0);}
}
function fixture(phase='jeep',heightAt=()=>-3){
 const doc=new FakeTarget(),canvas=new FakeTarget(),captures=new Set();
 Object.assign(canvas,{style:{touchAction:'pan-y',cursor:'auto'},clientHeight:800,ownerDocument:doc,
  getRootNode:()=>doc,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:800}),
  setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)});
 const camera=new PerspectiveCamera(49,1,.2,3000),rig=new CameraRig(camera,canvas,{heightAt});
 const state={phase,x:10,y:3,z:20,heading:.4};rig.reset(state);rig.setEnabled(true);
 return {doc,canvas,camera,rig,state,captures};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const pointer=(id,x,y)=>({pointerId:id,pointerType:'touch',pageX:x,pageY:y,clientX:x,clientY:y});

test('both vehicles follow translation without losing orbit or zoom',()=>{
 for(const phase of ['jeep','plane']){
  const {rig,state,camera}=fixture(phase);
  near(camera.position.distanceTo(rig.target),phase==='plane'?21:11);
  const offset=camera.position.clone().sub(rig.target);
  Object.assign(state,{x:100,y:27,z:-44});rig.update(state,1/60);
  assert.ok(camera.position.clone().sub(rig.target).distanceTo(offset)<1e-8);
  near(rig.target.y,state.y+(phase==='plane'?1.8:2));rig.dispose();
 }
});
test('wheel zoom and bounds, orbit wider limit and phase reset',()=>{
 const {rig,state,canvas,camera}=fixture();
 const start=camera.position.distanceTo(rig.target);
 canvas.emit('wheel',{deltaY:-100,deltaMode:0,ctrlKey:false,clientX:500,clientY:400});
 assert.ok(camera.position.distanceTo(rig.target)<start);
 rig.desiredCamera.position.copy(rig.target).add(new Vector3(0,20,400));rig.update(state,.016);
 near(camera.position.distanceTo(rig.target),50);
 rig.setMode('orbit',state);assert.equal(rig.controls.maxDistance,200);
 state.phase='plane';rig.update(state,.016);near(camera.position.distanceTo(rig.target),21);
 assert.equal(rig.controls.minDistance,9);rig.dispose();
});
test('one finger orbits, pinch zooms, unrelated driving pointer is ignored',()=>{
 const {rig,canvas,doc,camera}=fixture();const initial=camera.position.clone();
 canvas.emit('pointerdown',pointer(1,100,100));doc.emit('pointermove',pointer(1,180,120));
 assert.ok(camera.position.distanceTo(initial)>.1);
 const before=camera.position.clone();doc.emit('pointermove',pointer(99,900,700));doc.emit('pointerup',pointer(99,900,700));
 assert.ok(camera.position.distanceTo(before)<1e-8);
 canvas.emit('pointerdown',pointer(2,280,120));const radius=camera.position.distanceTo(rig.target);
 doc.emit('pointermove',pointer(2,380,120));
 assert.ok(camera.position.distanceTo(rig.target)<radius);rig.dispose();
});
test('pause mid-drag clears capture, ignores gestures and resumes fresh',()=>{
 const {rig,canvas,doc,camera,state,captures}=fixture();
 canvas.emit('pointerdown',pointer(1,100,100));doc.emit('pointermove',pointer(1,180,120));
 rig.setEnabled(false);assert.equal(captures.size,0);const paused=camera.position.clone();
 doc.emit('pointermove',pointer(1,500,500));canvas.emit('wheel',{deltaY:100});rig.update(state,.016);
 assert.ok(camera.position.distanceTo(paused)<1e-8);
 rig.setEnabled(true);canvas.emit('pointerdown',pointer(2,100,100));doc.emit('pointermove',pointer(2,180,120));
 assert.ok(camera.position.distanceTo(paused)>.1);rig.dispose();
});
test('terrain clearance, cabin position, and complete listener cleanup',()=>{
 const {rig,camera,state,canvas,doc}=fixture('jeep',()=>12);
 assert.ok(camera.position.y>=13.2);
 rig.setMode('cabin',state);rig.update({...state,x:99},.016);
 assert.deepEqual(camera.position.toArray(),[-49,24,55]);
 assert.equal(rig.controls.enabled,false);
 rig.setMode('chase',state);assert.ok(camera.position.y>=13.2);
 doc.emit('keydown',{key:'Control'});rig.dispose();
 assert.equal(doc.count,0);assert.equal(canvas.count,0);assert.equal(canvas.style.touchAction,'pan-y');
});
test('mouse drag rotates and minimum radius and polar angle are enforced',()=>{
 const {rig,state,canvas,doc,camera}=fixture();const initial=camera.position.clone();
 canvas.emit('pointerdown',{...pointer(1,100,100),pointerType:'mouse',button:0});
 doc.emit('pointermove',{...pointer(1,200,150),pointerType:'mouse'});
 assert.ok(camera.position.distanceTo(initial)>.1);
 doc.emit('pointerup',{...pointer(1,200,150),pointerType:'mouse'});
 rig.setEnabled(false);rig.setEnabled(true);
 rig.desiredCamera.position.copy(rig.target).add(new Vector3(0,-.1,.1));rig.update(state,.016);
 near(camera.position.distanceTo(rig.target),4);
 assert.ok(rig.controls.getPolarAngle()<=Math.PI*.48+1e-8);rig.dispose();
});
const yaw=rig=>{const v=rig.desiredCamera.position.clone().sub(rig.target);return Math.atan2(-v.x,v.z);};
const wrapped=a=>Math.atan2(Math.sin(a),Math.cos(a));
test('chase eases steering while preserving user offset and zoom for both vehicles',()=>{
 for(const phase of ['jeep','plane']){
  const {rig,state}=fixture(phase);
  rig.desiredCamera.position.sub(rig.target).applyAxisAngle(new Vector3(0,1,0),-.7).add(rig.target);
  const radius=rig.desiredCamera.position.distanceTo(rig.target),start=yaw(rig);
  state.heading+=1;rig.update(state,.016);
  const first=wrapped(yaw(rig)-start);assert.ok(first>0&&first<.15);
  for(let n=0;n<180;n++)rig.update(state,1/60);
  assert.ok(Math.abs(wrapped(yaw(rig)-state.heading)-.7)<1e-5);
  near(rig.desiredCamera.position.distanceTo(rig.target),radius);
  rig.setEnabled(false);const paused=yaw(rig);state.heading+=1;rig.update(state,.1);near(yaw(rig),paused);
  rig.dispose();
 }
});
test('heading follow crosses wraparound on shortest arc, free look stays world-relative',()=>{
 const {rig,state}=fixture();state.heading=Math.PI-.03;rig.reset(state);
 const start=yaw(rig);state.heading=-Math.PI+.03;rig.update(state,.02);
 const turn=wrapped(yaw(rig)-start);assert.ok(turn>0&&turn<.02);
 rig.setMode('orbit',state);const free=yaw(rig);state.heading+=1;rig.update(state,.1);near(yaw(rig),free);rig.dispose();
});
test('trackpad diagonal and vertical tail orbit, pinch zooms, ordinary wheel zooms',()=>{
 const {rig,canvas}=fixture();const before=rig.desiredCamera.position.clone(),radius=rig.desiredCamera.position.distanceTo(rig.target);
 canvas.emit('wheel',{deltaX:40,deltaY:20,deltaMode:0,timeStamp:1000});
 assert.ok(rig.desiredCamera.position.distanceTo(before)>.1);near(rig.desiredCamera.position.distanceTo(rig.target),radius);
 const height=rig.desiredCamera.position.y;
 canvas.emit('wheel',{deltaX:0,deltaY:15,deltaMode:0,timeStamp:1030});
 assert.notEqual(rig.desiredCamera.position.y,height);near(rig.desiredCamera.position.distanceTo(rig.target),radius);
 canvas.emit('wheel',{deltaX:0,deltaY:-20,deltaMode:0,ctrlKey:true,timeStamp:1050});
 assert.ok(rig.desiredCamera.position.distanceTo(rig.target)<radius);
 const pinched=rig.desiredCamera.position.distanceTo(rig.target);
 canvas.emit('wheel',{deltaX:0,deltaY:50,deltaMode:0,timeStamp:1500});
 assert.ok(rig.desiredCamera.position.distanceTo(rig.target)>pinched);
 const beforeShift=yaw(rig),shiftRadius=rig.desiredCamera.position.distanceTo(rig.target);
 canvas.emit('wheel',{deltaX:0,deltaY:20,deltaMode:0,shiftKey:true,timeStamp:1900});
 assert.notEqual(yaw(rig),beforeShift);near(rig.desiredCamera.position.distanceTo(rig.target),shiftRadius);rig.dispose();
});
test('obstruction only changes rendered camera, and preferred zoom returns on release',()=>{
 const {rig,state,camera,canvas}=fixture();let blocked=true,calls=0;
 rig.resolveCamera=({target,desiredPosition:desired,state:s,dt})=>{
  assert.equal(s,state);assert.ok(dt>=0);calls++;
  return blocked?target.clone().lerp(desired,.3):desired;
 };
 const desired=rig.desiredCamera.position.clone();rig.update(state,.016);assert.equal(calls,1);
 assert.ok(camera.position.distanceTo(desired)>1);near(rig.desiredCamera.position.distanceTo(desired),0);
 canvas.emit('wheel',{deltaY:-50,deltaMode:0});const zoom=rig.desiredCamera.position.distanceTo(rig.target);
 assert.ok(zoom<11&&zoom>9);assert.ok(camera.position.distanceTo(rig.target)<4);
 blocked=false;rig.update(state,.016);near(camera.position.distanceTo(rig.target),zoom);rig.dispose();
});
test('active trackpad and pinch consume browser defaults; pause clears the trackpad latch',()=>{
 const {rig,canvas}=fixture();let prevented=0;
 const preventDefault=()=>prevented++;
 canvas.emit('wheel',{deltaX:30,deltaY:10,deltaMode:0,timeStamp:1000,preventDefault});
 canvas.emit('wheel',{deltaX:0,deltaY:-10,deltaMode:0,ctrlKey:true,timeStamp:1010,preventDefault});
 assert.equal(prevented,2);
 canvas.emit('wheel',{deltaX:30,deltaY:10,deltaMode:0,timeStamp:1020,preventDefault});
 rig.setEnabled(false);rig.setEnabled(true);
 const radius=rig.desiredCamera.position.distanceTo(rig.target);
 canvas.emit('wheel',{deltaX:0,deltaY:40,deltaMode:0,timeStamp:1030,preventDefault});
 assert.ok(rig.desiredCamera.position.distanceTo(rig.target)>radius);rig.dispose();
});
