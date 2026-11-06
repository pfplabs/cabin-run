import {Raycaster,Vector3,MathUtils} from 'three';
import {WORLD,TUNNEL,roadOffset} from './engine.js';

const UP=new Vector3(0,1,0);
const smooth=(a,b,x)=>{const t=MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

/** Resolves the render camera only. The user's orbit/zoom lives in CameraRig. */
export class CameraObstruction {
 constructor({heightAt=()=>-3,obstacles=[]}={}){
  this.heightAt=heightAt;this.obstacles=obstacles;this.ray=new Raycaster();
  this.result=new Vector3();this.lastDistance=null;this.phase=null;this.previousTarget=new Vector3();
  this.radius=.35;this.margin=.2;
 }
 tunnelWeight(state){
  if(state.phase!=='jeep')return 0;
  const a=Math.atan2(state.x,WORLD.centerZ-state.z);
  const gap=Math.max(TUNNEL.startAngle-a,a-TUNNEL.endAngle,0)*WORLD.roadRadius;
  return (1-smooth(0,16,gap))*(1-smooth(5,11,Math.abs(roadOffset(state.x,state.z))));
 }
 safeDistance(target,direction,distance){
  // Five rays approximate the near-plane footprint, not merely its center point.
  const right=new Vector3().crossVectors(direction,UP).normalize();
  if(right.lengthSq()<.1)right.set(1,0,0);
  const up=new Vector3().crossVectors(right,direction).normalize();
  const offsets=[new Vector3(),right.clone().multiplyScalar(this.radius),right.clone().multiplyScalar(-this.radius),up.clone().multiplyScalar(this.radius),up.clone().multiplyScalar(-this.radius)];
  let safe=distance;
  for(const offset of offsets){
   this.ray.set(target.clone().add(offset),direction);this.ray.near=.02;this.ray.far=distance+this.margin;
   const hit=this.ray.intersectObjects(this.obstacles,false)[0];
   if(hit)safe=Math.min(safe,Math.max(.35,hit.distance-this.radius-this.margin));
  }
  // Height-field terrain avoids expensive full landscape raycasts every frame.
  // Sample the complete view line, so a hillside cannot sit between jeep and camera.
  for(let d=.5;d<=safe;d+=.45){
   const p=target.clone().addScaledVector(direction,d),floor=this.heightAt(p.x,p.z)+this.radius;
   if(Number.isFinite(floor)&&p.y<Math.max(.35,floor)){safe=Math.max(.35,d-.55);break;}
  }
  return safe;
 }
 resolve({state,target,desiredPosition,desired,dt=0,mode='chase'}){
  const preferred=desiredPosition||desired;
  if(mode==='cabin')return this.result.copy(preferred);
  if(this.phase!==state.phase||this.previousTarget.distanceTo(target)>50)this.lastDistance=null;
  this.phase=state.phase;this.previousTarget.copy(target);
  const offset=preferred.clone().sub(target),tunnel=this.tunnelWeight(state);
  if(tunnel>0){
   // In the confined passage, duck and tuck directly behind the jeep. Manual
   // orbit and chosen zoom are restored outside, because preferred is untouched.
   const close=new Vector3(-Math.sin(state.heading)*8,1.1,Math.cos(state.heading)*8);
   offset.lerp(close,tunnel);
  }
  const wanted=Math.max(.35,offset.length()),direction=offset.normalize();
  let allowed=this.safeDistance(target,direction,wanted);
  if(this.lastDistance!==null&&allowed>this.lastDistance){
   allowed=this.lastDistance+(allowed-this.lastDistance)*(1-Math.exp(-5*Math.max(0,Math.min(dt,.1))));
  }
  this.lastDistance=allowed;
  this.result.copy(target).addScaledVector(direction,allowed);
  return this.result;
 }
}
