import * as THREE from 'three';
import {WORLD,FLIGHT_BOUNDARY} from './engine.js';

/** Diegetic world edge, visible only while nearing the flight boundary. */
export function createFlightBarrier(){
 const positions=[],uv=[],indices=[],n=192,r=WORLD.roadRadius*FLIGHT_BOUNDARY.normalRadius;
 for(let i=0;i<=n;i++){
  const a=i/n*Math.PI*2,x=r*Math.sin(a),z=Math.max(FLIGHT_BOUNDARY.normalNorth,WORLD.centerZ-r*Math.cos(a));
  for(const y of [-2,WORLD.flightCeiling+35]){positions.push(x,y,z);uv.push(i/n,y);}
  if(i<n){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{strength:{value:0},outside:{value:0},time:{value:0}},vertexShader:`varying vec3 vEdge;void main(){vEdge=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float strength,outside,time;varying vec3 vEdge;
 void main(){
  float distanceToEdge=length(cameraPosition.xz-vEdge.xz);
  float nearEdge=1.-smoothstep(10.,65.,distanceToEdge);
  float stripe=1.-smoothstep(.02,.07,abs(fract(vEdge.y/9.-time*.04)-.5));
  float vertical=1.-smoothstep(.015,.055,abs(fract((vEdge.x+vEdge.z)/11.)-.5));
  vec3 color=mix(vec3(.25,.65,.72),vec3(.95,.48,.19),outside);
  gl_FragColor=vec4(color,strength*nearEdge*(.025+.14*max(stripe,vertical)));
 }`});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Flight world boundary';mesh.frustumCulled=false;mesh.visible=false;return mesh;
}

/** Actual spinning blades remain visible; this translucent disc suggests exposure blur. */
export function createPropellerBlur(){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{amount:{value:0},phase:{value:0}},vertexShader:`varying vec2 vProp;void main(){vProp=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float amount,phase;varying vec2 vProp;
 void main(){float r=length(vProp);float envelope=smoothstep(.12,.22,r)*(1.-smoothstep(.82,1.,r));
 float sweep=.6+.4*pow(abs(sin(atan(vProp.y,vProp.x)*2.+phase)),3.);
 gl_FragColor=vec4(vec3(.14,.17,.18),amount*envelope*sweep*.27);}`});
 const mesh=new THREE.Mesh(new THREE.CircleGeometry(1.48,48),material);mesh.name='Propeller exposure blur';mesh.position.z=-.015;mesh.renderOrder=1;return mesh;
}

/** Real floating markers outline the approach, without a scripted landing path. */
export function createLandingCorridor(corridor){
 const group=new THREE.Group();group.name='Buoy marked water landing corridor';
 const count=28,body=new THREE.InstancedMesh(new THREE.CylinderGeometry(.24,.38,.55,12),new THREE.MeshStandardMaterial({color:0xd7c572,roughness:.63}),count),stripe=new THREE.InstancedMesh(new THREE.CylinderGeometry(.245,.30,.16,12),new THREE.MeshStandardMaterial({color:0xf0f1e8,roughness:.6}),count),d=new THREE.Object3D();
 for(let i=0;i<14;i++)for(const side of [-1,1]){
  d.position.set(corridor.centerX+side*corridor.width/2,.17,corridor.zEnd+(corridor.zStart-corridor.zEnd)*i/13);d.updateMatrix();body.setMatrixAt(i*2+(side>0?1:0),d.matrix);
  d.position.y=.30;d.updateMatrix();stripe.setMatrixAt(i*2+(side>0?1:0),d.matrix);
 }
 body.castShadow=body.receiveShadow=true;group.add(body,stripe);return group;
}
export class WaterWake extends THREE.Points{
 constructor(){
  const count=160,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));g.setAttribute('aSize',new THREE.Float32BufferAttribute(new Float32Array(count),1));g.setAttribute('aAlpha',new THREE.Float32BufferAttribute(new Float32Array(count),1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`attribute float aSize,aAlpha;varying float vAlpha;void main(){vAlpha=aAlpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(55.,aSize*400./max(2.,-p.z));gl_Position=projectionMatrix*p;}`,fragmentShader:`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.83,.94,.97,pow(max(0.,1.-r*r),2.)*vAlpha);}`});
  super(g,m);this.name='Floatplane water wake and touchdown spray';this.frustumCulled=false;this.pool=Array.from({length:count},()=>({age:10,life:1}));this.next=0;this.emission=0;this.seed=43;this.lastTouchdown=-1;this.splashAge=10;
  this.foam=new THREE.Group();this.foam.name='Paired expanding float touchdown foam';
  for(let i=0;i<2;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.65,1,32),new THREE.MeshBasicMaterial({color:0xddeff0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.visible=false;this.foam.add(ring);}this.add(this.foam);
 }
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 emitParticle(state,burst){
  const side=this.random()>.5?1:-1,p=this.pool[this.next],forward=Math.sin(state.heading),north=Math.cos(state.heading),along=(this.random()-.5)*5.4;
  this.next=(this.next+1)%this.pool.length;
  const lateral=side*(burst?2.2+this.random()*2.8:.35),trail=-state.speed*(burst?.12:.1);
  Object.assign(p,{x:state.x+north*side*1.15+forward*along,z:state.z+forward*side*1.15-north*along,y:.12,
   vx:north*lateral+forward*trail,vz:forward*lateral-north*trail,vy:burst?2+this.random()*2:.15,
   age:0,life:burst?1.6:2.5,size:burst?.32+this.random()*.25:.3,alpha:burst?.82:.46});
 }

 update(state,dt){
  dt=Math.max(0,Math.min(dt,.05));const active=state.phase==='plane'&&state.status==='running';
  if(active&&state.onWater&&state.touchdownAge>=0&&(this.lastTouchdown<0||state.touchdownAge<this.lastTouchdown)){
   for(let i=0;i<96;i++)this.emitParticle(state,true);this.splashAge=0;
   this.foam.position.set(state.x,.065,state.z);this.foam.rotation.y=-state.heading;
  }
  this.splashAge+=dt;
  for(let i=0;i<2;i++){const ring=this.foam.children[i],age=this.splashAge;ring.visible=age<2.2;ring.position.x=i?1.15:-1.15;ring.scale.set(.6+age*2,1.8+age*3,1);ring.material.opacity=Math.max(0,.5*(1-age/2.2));}
  this.lastTouchdown=state.phase==='plane'?state.touchdownAge:-1;
  if(active&&state.onWater&&!state.parked&&Math.abs(state.speed)>.5){this.emission+=Math.abs(state.speed)*3*dt;while(this.emission>=1){this.emission--;this.emitParticle(state,false);}}
  for(let i=0;i<this.pool.length;i++){const p=this.pool[i];p.age+=dt;if(p.age>=p.life){this.geometry.attributes.aAlpha.setX(i,0);continue;}p.x+=p.vx*dt;p.z+=p.vz*dt;p.y=Math.max(.035,p.y+p.vy*dt);p.vy-=5*dt;this.geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);this.geometry.attributes.aSize.setX(i,p.size+p.age*.35);this.geometry.attributes.aAlpha.setX(i,p.alpha*(1-p.age/p.life));}
  for(const a of Object.values(this.geometry.attributes))a.needsUpdate=true;
 }
}

