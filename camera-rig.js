import {Vector3, Spherical, MOUSE, TOUCH} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// OrbitControls listens on ownerDocument during drags. Filter those listeners
// so a simultaneous finger on a driving button cannot move the camera.
class CanvasInput {
 constructor(canvas,onWheel) {
  this.onWheel=onWheel;
  this.canvas=canvas;this.style=canvas.style;this.pointers=new Set();this.listeners=[];
  this.ownerDocument=this.scope(canvas.ownerDocument,true);
  this.root=this.scope(canvas.getRootNode(),false);
 }
 scope(target,filter) {
  return {
   addEventListener:(type,fn,options)=>this.listen(target,type,fn,options,filter),
   removeEventListener:(type,fn)=>this.unlisten(target,type,fn)
  };
 }
 listen(target,type,fn,options,filter=false) {
  const wrapped=event=>{
   if(filter&&type.startsWith('pointer')&&!this.pointers.has(event.pointerId))return;
   if(type==='wheel'&&this.onWheel?.(event))return;
   if(type==='pointerdown')this.pointers.add(event.pointerId);
   fn(event);
   if(type==='pointerup'||type==='pointercancel')this.pointers.delete(event.pointerId);
  };
  this.listeners.push({target,type,fn,wrapped,options});target.addEventListener(type,wrapped,options);
 }
 unlisten(target,type,fn) {
  for(const entry of [...this.listeners])if(entry.target===target&&entry.type===type&&entry.fn===fn){
   target.removeEventListener(type,entry.wrapped,entry.options);this.listeners.splice(this.listeners.indexOf(entry),1);
  }
 }
 addEventListener(type,fn,options){this.listen(this.canvas,type,fn,options);}
 removeEventListener(type,fn){this.unlisten(this.canvas,type,fn);}
 getRootNode(){return this.root;}
 get clientHeight(){return this.canvas.clientHeight;}
 getBoundingClientRect(){return this.canvas.getBoundingClientRect();}
 setPointerCapture(id){this.canvas.setPointerCapture(id);}
 releasePointerCapture(id){if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);}
 clear(){
  for(const entry of this.listeners)entry.target.removeEventListener(entry.type,entry.wrapped,entry.options);
  this.listeners=[];
  for(const id of this.pointers)this.releasePointerCapture(id);
  this.pointers.clear();
 }
}

export class CameraRig {
 constructor(camera,canvas,{heightAt=()=>-3,resolveCamera=null}={}) {
  this.camera=camera;this.canvas=canvas;this.heightAt=heightAt;this.resolveCamera=resolveCamera;
  // Input owns this unconstrained pose. Collision correction only changes camera.
  this.desiredCamera=camera.clone();this.lastState=null;this.headingFollow=0;this.lastTrackpad=-Infinity;
  this.offset=new Vector3();this.up=new Vector3(0,1,0);this.spherical=new Spherical();
  this.mode='chase';this.enabled=false;this.phase=null;this.disposed=false;
  this.target=new Vector3();this.delta=new Vector3();this.initialized=false;
  this.originalTouchAction=canvas.style.touchAction;this.originalCursor=canvas.style.cursor;
  this._rebuild();
 }
 _rebuild(){
  if(this.controls)this.controls.dispose();
  if(this.input)this.input.clear();
  this.lastTrackpad=-Infinity;
  this.input=new CanvasInput(this.canvas,event=>this._wheel(event));
  this.controls=new OrbitControls(this.desiredCamera,this.input);
  Object.assign(this.controls,{enableDamping:true,dampingFactor:.09,enablePan:false,
   rotateSpeed:.65,zoomSpeed:.85,minPolarAngle:.08,maxPolarAngle:Math.PI*.48});
  this.controls.mouseButtons={LEFT:MOUSE.ROTATE,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.ROTATE};
  this.controls.touches={ONE:TOUCH.ROTATE,TWO:TOUCH.DOLLY_ROTATE};
  this.controls.target.copy(this.target);this._limits();
  this.controls.enabled=this.enabled&&this.mode!=='cabin';
  this.controls.update();
  this.controls.addEventListener('change',()=>{if(this.initialized&&!this.updating&&this.mode!=='cabin')this._render(0);});
 }
 _wheel(event){
  if(!this.enabled||this.mode==='cabin')return false;
  // Browsers expose wheel deltas, not reliable trackpad/mouse identification.
  // Horizontal pixel scrolling begins an orbit gesture; its vertical tail stays
  // orbit for 250 ms. Ctrl-wheel pinch and normal vertical wheel remain zoom.
  if(event.ctrlKey){this.lastTrackpad=-Infinity;return false;}
  const now=Number.isFinite(event.timeStamp)?event.timeStamp:Date.now();
  const horizontal=(event.deltaMode||0)===0&&Math.abs(event.deltaX||0)>1;
  const orbit=event.shiftKey||horizontal||((event.deltaMode||0)===0&&now-this.lastTrackpad<250);
  if(!orbit)return false;
  this.lastTrackpad=now;event.preventDefault();
  const scale=(event.deltaMode===1?16:1)*.004;
  this.offset.copy(this.desiredCamera.position).sub(this.target);
  this.spherical.setFromVector3(this.offset);
  this.spherical.theta-=(event.deltaX||(event.shiftKey?event.deltaY:0)||0)*scale;
  this.spherical.phi-=(event.shiftKey&&!event.deltaX?0:event.deltaY||0)*scale;
  this.spherical.phi=Math.max(this.controls.minPolarAngle,Math.min(this.controls.maxPolarAngle,this.spherical.phi));
  this.desiredCamera.position.copy(this.target).add(this.offset.setFromSpherical(this.spherical));
  this.updating=true;this.controls.update();this.updating=false;
  this._render(0);return true;
 }
 _limits(){
  this.controls.minDistance=this.phase==='plane'?9:4;
  this.controls.maxDistance=this.mode==='orbit'?200:this.phase==='plane'?100:50;
 }
 _target(state){return this.delta.set(state.x,state.y+(state.phase==='plane'?1.8:2),state.z);}
 _cabin(){this.camera.position.set(-49,24,55);this.camera.lookAt(0,4,-7);}
 _render(dt=0){
  this.camera.position.copy(this.desiredCamera.position);
  const p=this.camera.position,h=this.heightAt(p.x,p.z);
  if(Number.isFinite(h))p.y=Math.max(p.y,.6,h+1.2);
  // Resolver may duck the camera after terrain clearance. Its result is never
  // fed back into desiredCamera, so zoom returns after leaving an obstruction.
  const resolved=this.resolveCamera?.({target:this.target.clone(),desiredPosition:p.clone(),state:this.lastState,mode:this.mode,dt});
  if(resolved&&[resolved.x,resolved.y,resolved.z].every(Number.isFinite))p.copy(resolved);
  this.camera.lookAt(this.target);
 }
 reset(state){
  if(this.disposed)return;
  this.lastState=state;this.headingFollow=state.heading;this.phase=state.phase;this.initialized=true;this.target.copy(this._target(state));
  const distance=this.phase==='plane'?21:11,lift=this.phase==='plane'?6.2:4;
  // Preserve the requested actual radius, not just horizontal distance.
  const horizontal=Math.sqrt(distance*distance-lift*lift);
  this.desiredCamera.position.set(state.x-Math.sin(state.heading)*horizontal,this.target.y+lift,state.z+Math.cos(state.heading)*horizontal);
  this._rebuild();
  if(this.mode==='cabin')this._cabin();else this._render();
 }
 setMode(mode,state){
  if(!['chase','orbit','cabin'].includes(mode))throw new RangeError(`Unknown camera mode: ${mode}`);
  if(this.disposed)return;
  const previous=this.mode;this.mode=mode;
  if(!this.initialized||previous==='cabin'){this.reset(state);return;}
  this._rebuild();
  if(mode==='cabin')this._cabin();else this.update(state,0);
 }
 setEnabled(enabled){
  if(this.disposed||this.enabled===!!enabled)return;
  this.enabled=!!enabled;
  // Recreate to discard pending inertia, pointer state and document listeners.
  this._rebuild();if(this.mode==='cabin')this._cabin();else if(this.initialized)this._render();
 }
 update(state,dt){
  if(this.disposed)return;
  if(!this.initialized||state.phase!==this.phase)this.reset(state);
  if(this.mode==='cabin'){this._cabin();return;}
  this.lastState=state;
  this._target(state).sub(this.target);
  this.desiredCamera.position.add(this.delta);this.controls.target.add(this.delta);
  this.target.copy(this.controls.target);
  const step=Math.min(Math.max(dt||0,0),.1);
  if(this.enabled){
   if(this.mode==='chase'){
    const difference=Math.atan2(Math.sin(state.heading-this.headingFollow),Math.cos(state.heading-this.headingFollow));
    const turn=difference*(1-Math.exp(-5*step));this.headingFollow+=turn;
    this.offset.copy(this.desiredCamera.position).sub(this.target).applyAxisAngle(this.up,-turn);
    this.desiredCamera.position.copy(this.target).add(this.offset);
   }else this.headingFollow=state.heading;
   this.updating=true;
   this.controls.update(step);
   this.updating=false;
  }
  this._render(step);
 }
 dispose(){
  if(this.disposed)return;
  this.controls.dispose();this.input.clear();this.disposed=true;
  this.canvas.style.touchAction=this.originalTouchAction;this.canvas.style.cursor=this.originalCursor;
 }
}
