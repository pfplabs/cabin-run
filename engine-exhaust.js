import * as THREE from 'three';
/** Local engine outlet, shared by original and replacement PlaneRoot models.
 * World-space particles remain behind as the aircraft moves. */
export class EngineExhaust extends THREE.Points {
 constructor({count=96,outlet=new THREE.Vector3(.64,.97,-2.85)}={}){
  const geometry=new THREE.BufferGeometry();
  for(const [name,size] of [['position',3],['aSize',1],['aAlpha',1]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(new Float32Array(count*size),size));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`attribute float aSize,aAlpha;varying float alpha;void main(){alpha=aAlpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(90.,aSize*500./max(1.,-p.z));gl_Position=projectionMatrix*p;}`,fragmentShader:`varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.70,.74,.78,alpha*pow(max(0.,1.-r*r),2.));}`});
  super(geometry,material);this.name='Engine startup exhaust';this.frustumCulled=false;
  this.pool=Array.from({length:count},()=>({age:10,life:1}));this.outlet=outlet;this.origin=new THREE.Vector3();this.direction=new THREE.Vector3();this.next=0;this.credit=0;this.seed=71;this.previous='off';this.afterStart=10;this.visible=false;
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 update(state,dt,plane){
  if(state.status!=='running'||dt<=0)return;
  dt=Math.min(dt,.05);
  if(state.phase!=='plane'||state.parked){this.reset();return;}
  if(this.previous==='starting'&&state.enginePhase==='running')this.afterStart=0;
  this.previous=state.enginePhase;this.afterStart+=dt;
  const progress=1-state.engineStartRemaining/3;
  const rate=state.enginePhase==='starting'&&progress>.18?26*(.65+.35*Math.sin(progress*43)**2):state.enginePhase==='running'?20*Math.max(0,1-this.afterStart/1.8):0;
  if(plane){
   plane.updateWorldMatrix(true,false);this.origin.copy(this.outlet).applyMatrix4(plane.matrixWorld);
   this.direction.set(.55,.1,1).transformDirection(plane.matrixWorld);
   this.credit+=rate*dt;
   while(this.credit>=1){
    this.credit--;const p=this.pool[this.next];this.next=(this.next+1)%this.pool.length;
    const slip=1.2+(state.propRPM||0)/900;
    Object.assign(p,{x:this.origin.x,y:this.origin.y,z:this.origin.z,vx:this.direction.x*slip+Math.sin(state.heading)*state.speed*.4,vz:this.direction.z*slip-Math.cos(state.heading)*state.speed*.4,vy:.25+this.random()*.3,age:0,life:1.6+this.random()*.8,size:.16+this.random()*.12});
   }
  }
  let alive=0;
  for(let i=0;i<this.pool.length;i++){
   const p=this.pool[i];p.age+=dt;
   if(p.age>=p.life){this.geometry.attributes.aAlpha.setX(i,0);continue;}
   alive++;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
   const drag=Math.exp(-.7*dt);p.vx*=drag;p.vz*=drag;
   this.geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);this.geometry.attributes.aSize.setX(i,p.size+p.age*.45);
   this.geometry.attributes.aAlpha.setX(i,.50*Math.min(1,p.age*12)*(1-p.age/p.life));
  }
  this.visible=alive>0;for(const a of Object.values(this.geometry.attributes))a.needsUpdate=true;
 }
 reset(){this.visible=false;this.credit=0;this.previous='off';this.afterStart=10;for(const p of this.pool)p.age=p.life;this.geometry.attributes.aAlpha.array.fill(0);this.geometry.attributes.aAlpha.needsUpdate=true;}
 dispose(){this.geometry.dispose();this.material.dispose();}
}
