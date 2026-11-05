/* Portable deterministic game rules, shared by the browser and Node tests. */
(function(root){'use strict';
const W=1000,H=700,DOCK={x:452,y:431};
const CRATES=[{x:817,y:154,label:'Food provisions'},{x:542,y:270,label:'Repair tools'},{x:852,y:548,label:'Fuel canisters'}];
const RINGS=[{x:188,y:511},{x:144,y:245},{x:425,y:113},{x:798,y:253},{x:703,y:596}];
const ROCKS=[{x:570,y:520,r:20},{x:918,y:320,r:24},{x:710,y:237,r:18},{x:530,y:124,r:20},{x:925,y:590,r:17},{x:760,y:635,r:20},{x:588,y:611,r:15}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);const shore=y=>372+24*Math.sin(y/105)+14*Math.sin(y/42);
function angleDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function fresh(){return{status:'ready',phase:'jeep',x:710,y:458,vx:0,vy:0,angle:-Math.PI/2,speed:0,elapsed:0,penalty:0,collected:[false,false,false],ring:0,events:[],bumpCooldown:0,wake:[],actionReady:false}}
function begin(s){Object.assign(s,fresh());s.status='running';s.events.push({type:'start',text:'Collect the three glowing crates.'})}
function pause(s){if(s.status==='running')s.status='paused';else if(s.status==='paused')s.status='running'}
function action(s){if(s.status!=='running'||!s.actionReady)return false;if(s.phase==='jeep'){s.phase='plane';s.x=415;s.y=431;s.angle=Math.PI;s.speed=145;s.vx=s.vy=0;s.actionReady=false;s.events.push({type:'takeoff',text:'Airborne! Steer through the five markers in order.'});return true}if(s.phase==='plane'&&s.ring===5){s.status='won';s.events.push({type:'win',text:'Delivery complete. Welcome home.'});return true}return false}
function bump(s,text){if(s.bumpCooldown<=0){s.penalty+=3;s.bumpCooldown=1.5;s.events.push({type:'bump',text:text+' +3 seconds.'})}}
function update(s,input,dt){if(s.status!=='running')return;dt=clamp(dt,0,.05);s.elapsed+=dt;s.bumpCooldown-=dt;let oldX=s.x,oldY=s.y;
if(s.phase==='jeep'){let dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0),length=Math.hypot(dx,dy);if(length){dx/=length;dy/=length}let blend=1-Math.exp(-8*dt);s.vx+=(dx*146-s.vx)*blend;s.vy+=(dy*146-s.vy)*blend;s.x+=s.vx*dt;s.y+=s.vy*dt;s.speed=Math.hypot(s.vx,s.vy);if(s.speed>5)s.angle+=angleDiff(Math.atan2(s.vy,s.vx),s.angle)*Math.min(1,12*dt);s.x=clamp(s.x,shore(s.y)+24,W-30);s.y=clamp(s.y,65,H-35);
for(const rock of ROCKS){if(distance(s,rock)<rock.r+12){s.x=oldX;s.y=oldY;s.vx*=-.3;s.vy*=-.3;bump(s,'Mind the rocks!')}}
// The lodge is solid. The driveway runs just south of it.
if(s.x>610&&s.x<755&&s.y>314&&s.y<414){s.x=oldX;s.y=oldY;s.vx*=-.2;s.vy*=-.2;bump(s,'Easy around the cabin!')}
CRATES.forEach((c,i)=>{if(!s.collected[i]&&distance(s,c)<33){s.collected[i]=true;s.events.push({type:'pickup',text:c.label+' loaded.'})}});s.actionReady=s.collected.every(Boolean)&&distance(s,DOCK)<65;
}else{const target=input.up?210:input.down?95:153;s.speed+=(target-s.speed)*(1-Math.exp(-3*dt));s.angle+=((input.right?1:0)-(input.left?1:0))*2.3*dt;s.x+=Math.cos(s.angle)*s.speed*dt;s.y+=Math.sin(s.angle)*s.speed*dt;if(s.x<32||s.x>968||s.y<65||s.y>662){s.x=clamp(s.x,34,966);s.y=clamp(s.y,67,660);s.angle=Math.atan2(350-s.y,500-s.x);bump(s,'Leaving the valley!')}
if(s.ring<RINGS.length&&distance(s,RINGS[s.ring])<48){s.ring++;s.events.push({type:'ring',text:s.ring===RINGS.length?'All markers clear. Return to the dock!':'Marker '+s.ring+' / 5 cleared.'})}s.actionReady=s.ring===RINGS.length&&distance(s,DOCK)<85;
}return s}
const api={W,H,DOCK,CRATES,RINGS,ROCKS,clamp,distance,shore,fresh,begin,pause,action,update};if(typeof module==='object'&&module.exports)module.exports=api;else root.CabinEngine=api;
})(typeof window==='object'?window:globalThis);
