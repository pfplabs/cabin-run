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
