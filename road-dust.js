import * as THREE from 'three';
import {terrainHeight} from './engine.js';
import {isGravel} from './road-surfaces.js';

export class RoadDust extends THREE.Points{
 constructor(){
  const count=140,geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(new Float32Array(count),1));geometry.setAttribute('aAlpha',new THREE.Float32BufferAttribute(new Float32Array(count),1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`attribute float aSize,aAlpha;varying float vAlpha;void main(){vAlpha=aAlpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(75.,aSize*400./max(2.,-p.z));gl_Position=projectionMatrix*p;}`,fragmentShader:`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r*r),2.)*vAlpha;gl_FragColor=vec4(.62,.56,.43,a);}`});
  super(geometry,material);this.name='Tyre gravel dust';this.frustumCulled=false;this.pool=Array.from({length:count},()=>({age:10,life:1}));this.next=0;this.accumulator=0;this.seed=57;
 }
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 update(state,dt){
  dt=Math.max(0,Math.min(dt,.05));
  if(state.status==='running'&&state.phase==='jeep'&&Math.abs(state.speed)>3){
   this.accumulator+=Math.abs(state.speed)*2.5*dt;
   while(this.accumulator>=1){
    this.accumulator--;const side=this.random()>.5?1:-1,back=1.25;
    const x=state.x-Math.sin(state.heading)*back+Math.cos(state.heading)*side,z=state.z+Math.cos(state.heading)*back+Math.sin(state.heading)*side;
    if(!isGravel(x,z))continue;
    const p=this.pool[this.next];this.next=(this.next+1)%this.pool.length;
    Object.assign(p,{x,y:terrainHeight(x,z)+.15,z,vx:-Math.sin(state.heading)*state.speed*.12+(this.random()-.5),vz:Math.cos(state.heading)*state.speed*.12+(this.random()-.5),vy:.5+this.random()*.5,age:0,life:1.1+this.random()*.8,size:.15+this.random()*.16});
   }
  }
  const g=this.geometry;
  for(let i=0;i<this.pool.length;i++){
   const p=this.pool[i];p.age+=dt;
   if(p.age>=p.life){g.attributes.aAlpha.setX(i,0);continue;}
   p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt);p.vz*=Math.exp(-dt);
   g.attributes.position.setXYZ(i,p.x,p.y,p.z);g.attributes.aSize.setX(i,p.size+p.age*.7);g.attributes.aAlpha.setX(i,.22*(1-p.age/p.life));
  }
  for(const a of Object.values(g.attributes))a.needsUpdate=true;
 }
}
