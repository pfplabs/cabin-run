import {Object3D,Vector3,Quaternion} from 'three';

// Model contract: these anchors use Y-up / -Z-forward, in vehicle-root space.
// Model authors can supply either anchor; fallbacks keep older GLBs compatible.
export const COCKPIT_ANCHORS={
 jeep:{name:'JeepCockpitCamera',position:[-.5,1.96,-.25]},
 plane:{name:'PlaneCockpitCamera',position:[-.28,2.4,-.5]}
};
export class CockpitCamera {
 constructor(vehicles){
  this.anchors={};this.glass=[];this.active=null;this.position=new Vector3();this.quaternion=new Quaternion();
  for(const [phase,root] of Object.entries(vehicles)){
   const spec=COCKPIT_ANCHORS[phase];if(!root||!spec)continue;
   let anchor=root.getObjectByName(spec.name);
   if(!anchor){anchor=new Object3D();anchor.name=spec.name;anchor.position.fromArray(spec.position);root.add(anchor);}
   this.anchors[phase]=anchor;
   root.traverse(object=>{
    if(!object.isMesh)return;
    const materials=(Array.isArray(object.material)?object.material:[object.material]).map(material=>{
     if(!/glazing|glass/i.test(material.name))return material;
     const copy=material.clone();this.glass.push({phase,material:copy,opacity:copy.opacity,transmission:copy.transmission,transparent:copy.transparent,depthWrite:copy.depthWrite});return copy;
    });
    object.material=Array.isArray(object.material)?materials:materials[0];
   });
  }
 }
 setActive(phase){
  if(this.active===phase)return;this.active=phase;
  for(const entry of this.glass){
   const inside=phase===entry.phase;
   entry.material.opacity=inside?.06:entry.opacity;
   entry.material.transparent=inside?true:entry.transparent;entry.material.depthWrite=inside?false:entry.depthWrite;
   if(entry.transmission!==undefined)entry.material.transmission=inside?0:entry.transmission;
   entry.material.needsUpdate=true;
  }
 }
 apply(camera,state,active=true){
  this.setActive(active?state.phase:null);if(!active)return false;
  const anchor=this.anchors[state.phase];if(!anchor)return false;
  // Vehicle transforms are written immediately before CameraRig.update.
  anchor.updateWorldMatrix(true,false);
  anchor.getWorldPosition(this.position);anchor.getWorldQuaternion(this.quaternion);
  camera.position.copy(this.position);camera.quaternion.copy(this.quaternion);
  return true;
 }
}
