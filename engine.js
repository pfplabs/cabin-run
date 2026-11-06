/** Pure simulation rules for a small bounded alpine lake. Distances are metres. */
export const WORLD={scale:2,roadRadius:188,centerZ:124,northLimit:-92,flightNorthLimit:-90,flightCeiling:84};
export const LAKE={x:0,z:124,rx:156,rz:114};
export const TUNNEL={startAngle:.08,endAngle:.36,innerHalfWidth:4.8,outerHalfWidth:11,height:6.4};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const routeRadius=a=>WORLD.roadRadius+12*Math.sin(3*a)+6*Math.sin(7*a);
const routeHeight=a=>1.1+34*Math.exp(-((wrap(a-.2)/.78)**2));
export function roadPoint(a){const r=routeRadius(a);return {x:r*Math.sin(a),y:routeHeight(a),z:WORLD.centerZ-r*Math.cos(a)};}
export function roadOffset(x,z){const a=Math.atan2(x,WORLD.centerZ-z);return Math.hypot(x,z-WORLD.centerZ)-routeRadius(a);}
export const DRIVEWAY=[roadPoint(-.65),{x:-83,z:-7,y:8},{x:-58,z:-14,y:5.5},{x:-37,z:-19,y:3},{x:-23,z:-15,y:1.1},{x:-16,z:-9,y:1.1},{x:-18,z:3,y:1.1}];
export const DOCK={x:-25,z:16};
export const HOME={x:-16,z:-9};
export const PARKING=[{x:-23,z:-11,width:4.6,length:7},{x:-16,z:-11,width:4.6,length:7},{x:-9,z:-11,width:4.6,length:7}];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const lakeRadius=(x,z)=>Math.hypot(x/LAKE.rx,(z-LAKE.z)/LAKE.rz);
export const roadRadius=(x,z)=>Math.hypot(x/WORLD.roadRadius,(z-WORLD.centerZ)/WORLD.roadRadius);
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function terrainHeight(x,z){
 const a=Math.atan2(x,WORLD.centerZ-z),offset=Math.abs(roadOffset(x,z));
 const base=1.1+.12*Math.sin(x*.15)*Math.cos(z*.12);
 const ridge=1-smooth((offset-5)/43);
 let height=base+(routeHeight(a)-base)*ridge;
 // Flatten the driveway center and softly blend its shoulders into the ridge.
 let distance=Infinity,driveHeight=height;
 for(let i=1;i<DRIVEWAY.length;i++){
  const p=DRIVEWAY[i-1],q=DRIVEWAY[i],dx=q.x-p.x,dz=q.z-p.z;
  const t=clamp(((x-p.x)*dx+(z-p.z)*dz)/(dx*dx+dz*dz),0,1);
  const d=Math.hypot(x-p.x-t*dx,z-p.z-t*dz);
  if(d<distance){distance=d;driveHeight=p.y+(q.y-p.y)*t;}
 }
 const blend=(1-smooth((distance-2.5)/7.5))*smooth((offset-5)/6);
 return height+(driveHeight-height)*blend;
}
export function fresh(){return {status:'ready',phase:'jeep',x:-16,y:terrainHeight(-16,-9),z:-9,heading:-.45,speed:0,pitch:0,roll:0,elapsed:0,cooldown:0,events:[],actionReady:false,takeoff:0,parked:false,arrived:false}}
export function begin(s,vehicle='jeep'){Object.assign(s,fresh(),{status:'running'});switchVehicle(s,vehicle);}
export function togglePause(s){if(s.status==='running')s.status='paused';else if(s.status==='paused')s.status='running';}
export function switchVehicle(s,vehicle){
 if(!['jeep','plane'].includes(vehicle))return false;
 s.phase=vehicle;s.speed=0;s.roll=0;s.pitch=0;s.actionReady=false;s.takeoff=0;s.parked=false;s.arrived=false;
 if(vehicle==='jeep'){const p=roadPoint(-1.82),q=roadPoint(-1.819);s.x=p.x;s.z=p.z;s.y=terrainHeight(s.x,s.z);s.heading=Math.atan2(q.x-p.x,p.z-q.z);}
 else {s.x=-40;s.z=218;s.y=1.7;s.heading=0;s.speed=12;s.takeoff=3;}
 return true;
}
export function action(s){
 if(s.status!=='running')return false;
 if(s.parked){s.parked=false;s.takeoff=3;s.speed=10;s.heading=-2;s.events.push({type:'takeoff',text:'Back to the sky.'});return true;}
 if(s.phase==='plane'&&s.actionReady){s.x=DOCK.x;s.z=DOCK.z;s.y=.3;s.speed=0;s.heading=-1.4;s.parked=true;s.actionReady=false;s.events.push({type:'land',text:'Welcome home. Floatplane moored at the dock.'});return true;}
 if(s.phase==='jeep'&&s.actionReady){s.speed=0;s.events.push({type:'home',text:'Home by the lake. Keep exploring or take the floatplane.'});return true;}
 return false;
}
function bump(s,text){if(s.cooldown<=0){s.cooldown=1.5;s.events.push({type:'bump',text});}}
export function update(s,input,dt){
 if(s.status!=='running')return;
 dt=clamp(dt,0,.05);s.elapsed+=dt;s.cooldown=Math.max(0,s.cooldown-dt);
 const steer=(input.right?1:0)-(input.left?1:0);
 if(s.phase==='jeep'){
  const throttle=(input.up?1:0)-(input.down?1:0);
  s.speed+=throttle*12*dt;s.speed*=Math.exp(-(throttle?.45:2.8)*dt);s.speed=clamp(s.speed,-6,input.boost?19:14);
  if(input.brake)s.speed*=Math.exp(-9*dt);
  s.heading+=steer*1.4*dt*clamp(s.speed/5,-1,1);
  const nx=s.x+Math.sin(s.heading)*s.speed*dt,nz=s.z-Math.cos(s.heading)*s.speed*dt;
  const hitCabin=nx>-4.5&&nx<21&&nz>-22&&nz<-1;
  const hitShore=lakeRadius(nx,nz)<1.035;
  const hitBound=roadRadius(nx,nz)>1.14||nz<WORLD.northLimit;
  const angle=Math.atan2(nx,WORLD.centerZ-nz),offset=Math.abs(roadOffset(nx,nz));
  const hitTunnel=angle>=TUNNEL.startAngle&&angle<=TUNNEL.endAngle&&offset>TUNNEL.innerHalfWidth-1.2&&offset<TUNNEL.outerHalfWidth+1.2;
  if(hitCabin||hitShore||hitBound||hitTunnel){
   if(Math.abs(s.speed)>1.5)bump(s,hitTunnel?'Tunnel wall. Reverse and steer back to the center.':hitCabin?'Mind the cabin. Reverse to turn around.':hitShore?'Lake edge. Reverse back onto the road.':'The mountain pass ends here. Turn back toward the lake.');
   s.speed*=-.22;
  }else{s.x=nx;s.z=nz;}
  s.y=terrainHeight(s.x,s.z);s.roll=steer*s.speed*.008;
  const dx=Math.sin(s.heading)*1.5,dz=-Math.cos(s.heading)*1.5;
  s.pitch=Math.atan2(terrainHeight(s.x+dx,s.z+dz)-terrainHeight(s.x-dx,s.z-dz),3);
  s.actionReady=Math.hypot(s.x-HOME.x,s.z-HOME.z)<6;
  if(s.actionReady&&!s.arrived){s.arrived=true;s.events.push({type:'home',text:'You made it home. The lake is yours to explore.'});}
 }else if(!s.parked){
  s.heading+=steer*(input.boost?.6:.88)*dt;s.roll+=(-steer*.42-s.roll)*Math.min(1,dt*5);
  const pitch=(input.up?1:0)-(input.down?1:0);s.pitch+=(pitch*.3-s.pitch)*Math.min(1,dt*3);
  s.speed+=((input.boost?27:input.brake?9:17)-s.speed)*dt*2;
  s.x+=Math.sin(s.heading)*s.speed*dt;s.z-=Math.cos(s.heading)*s.speed*dt;
  if(s.takeoff>0){s.takeoff=Math.max(0,s.takeoff-dt);s.y+=3.5*dt;s.pitch=.12;}else s.y=clamp(s.y+pitch*7*dt,1.7,WORLD.flightCeiling);
  const out=roadRadius(s.x,s.z)>1.13||s.z<WORLD.flightNorthLimit;
  if(out){
   bump(s,'Edge of the lake. Turning back into the valley.');s.heading=Math.atan2(-s.x,s.z-WORLD.centerZ);
   const r=roadRadius(s.x,s.z);if(r>1.14){s.x*=1.13/r;s.z=WORLD.centerZ+(s.z-WORLD.centerZ)*1.13/r;}s.z=Math.max(s.z,WORLD.flightNorthLimit+WORLD.scale);
  }
  const angle=Math.atan2(s.x,WORLD.centerZ-s.z),offset=Math.abs(roadOffset(s.x,s.z));
  let clearance=1.7;
  // Sample the aircraft footprint as well as its center so wings clear sloping ground.
  for(const [dx,dz] of [[0,0],[7,0],[-7,0],[0,7],[0,-7]]){
   const x=s.x+dx,z=s.z+dz;
   if(lakeRadius(x,z)>1)clearance=Math.max(clearance,6,terrainHeight(x,z)+4);
  }
  // Wing-span margin keeps the complete aircraft above the tunnel's rock shell.
  if(angle>=TUNNEL.startAngle-.04&&angle<=TUNNEL.endAngle+.04&&offset<TUNNEL.outerHalfWidth+7)clearance=Math.max(clearance,routeHeight(angle)+TUNNEL.height+8);
  if(s.y<clearance){bump(s,'Climbing clear of the terrain.');s.y=Math.min(WORLD.flightCeiling,clearance);}
  if(s.x>-6&&s.x<23&&s.z>-24&&s.z<0&&s.y<13){bump(s,'Pulling up over the cabin.');s.y=14;s.pitch=.3;}
  s.actionReady=Math.hypot(s.x-DOCK.x,s.z-DOCK.z)<20&&s.y<18;
 }
}
