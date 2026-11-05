/** Pure simulation rules for a small bounded alpine lake. Distances are metres. */
export const LAKE={x:0,z:62,rx:78,rz:57};
export const DOCK={x:-25,z:16};
export const HOME={x:-16,z:-9};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const lakeRadius=(x,z)=>Math.hypot(x/LAKE.rx,(z-LAKE.z)/LAKE.rz);
export const roadRadius=(x,z)=>Math.hypot(x/94,(z-62)/94);
export function terrainHeight(x,z){return 1.1+.12*Math.sin(x*.15)*Math.cos(z*.12)}
export function fresh(){return {status:'ready',phase:'jeep',x:-16,y:terrainHeight(-16,-9),z:-9,heading:-.45,speed:0,pitch:0,roll:0,elapsed:0,cooldown:0,events:[],actionReady:false,takeoff:0,parked:false,arrived:false}}
export function begin(s,vehicle='jeep'){Object.assign(s,fresh(),{status:'running'});switchVehicle(s,vehicle);}
export function togglePause(s){if(s.status==='running')s.status='paused';else if(s.status==='paused')s.status='running';}
export function switchVehicle(s,vehicle){
 if(!['jeep','plane'].includes(vehicle))return false;
 s.phase=vehicle;s.speed=0;s.roll=0;s.pitch=0;s.actionReady=false;s.takeoff=0;s.parked=false;s.arrived=false;
 if(vehicle==='jeep'){s.x=-91;s.z=85;s.y=terrainHeight(s.x,s.z);s.heading=-.25;}
 else {s.x=-20;s.z=109;s.y=1.7;s.heading=0;s.speed=12;s.takeoff=3;}
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
  const hitBound=roadRadius(nx,nz)>1.14||nz<-46;
  if(hitCabin||hitShore||hitBound){
   if(Math.abs(s.speed)>1.5)bump(s,hitCabin?'Mind the cabin. Reverse to turn around.':hitShore?'Lake edge. Reverse back onto the road.':'The mountain pass ends here. Turn back toward the lake.');
   s.speed*=-.22;
  }else{s.x=nx;s.z=nz;}
  s.y=terrainHeight(s.x,s.z);s.roll=steer*s.speed*.008;
  s.actionReady=Math.hypot(s.x-HOME.x,s.z-HOME.z)<6;
  if(s.actionReady&&!s.arrived){s.arrived=true;s.events.push({type:'home',text:'You made it home. The lake is yours to explore.'});}
 }else if(!s.parked){
  s.heading+=steer*(input.boost?.6:.88)*dt;s.roll+=(-steer*.42-s.roll)*Math.min(1,dt*5);
  const pitch=(input.up?1:0)-(input.down?1:0);s.pitch+=(pitch*.3-s.pitch)*Math.min(1,dt*3);
  s.speed+=((input.boost?27:input.brake?9:17)-s.speed)*dt*2;
  s.x+=Math.sin(s.heading)*s.speed*dt;s.z-=Math.cos(s.heading)*s.speed*dt;
  if(s.takeoff>0){s.takeoff=Math.max(0,s.takeoff-dt);s.y+=3.5*dt;s.pitch=.12;}else s.y=clamp(s.y+pitch*7*dt,1.7,42);
  const out=roadRadius(s.x,s.z)>1.13||s.z<-45;
  if(out){
   bump(s,'Edge of the lake. Turning back into the valley.');s.heading=Math.atan2(-s.x,s.z-62);
   const r=roadRadius(s.x,s.z);if(r>1.14){s.x*=1.13/r;s.z=62+(s.z-62)*1.13/r;}s.z=Math.max(s.z,-44);
  }
  if(lakeRadius(s.x,s.z)>1&&s.y<6){bump(s,'Climbing clear of the shoreline.');s.y=6;}
  if(s.x>-6&&s.x<23&&s.z>-24&&s.z<0&&s.y<13){bump(s,'Pulling up over the cabin.');s.y=14;s.pitch=.3;}
  s.actionReady=Math.hypot(s.x-DOCK.x,s.z-DOCK.z)<20&&s.y<18;
 }
}
