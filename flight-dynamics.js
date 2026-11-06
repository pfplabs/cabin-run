/** Assisted, energy-based floatplane model. Metres, seconds, radians; tuned for
 * the compact game valley, not a certified aircraft or six-axis simulator. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const damp=(v,t,k,dt)=>v+(t-v)*(-Math.expm1(-k*dt));
export function advanceFlightDynamics(s,input,steer,dt,{flight,recovering,inward}){
 const ready=s.enginePhase==='running';
 const power=ready?clamp((s.propRPM-flight.idleRPM)/(flight.maxRPM-flight.idleRPM),0,1):0;
 // B is a dock-hand assist, not reverse propeller thrust. It cannot engage at speed.
 const push=s.onWater&&input.reverse&&!input.boost&&!input.brake&&s.throttle<.03&&Math.abs(s.speed)<2;
 const v=Math.max(0,s.speed),gamma=Math.atan2(s.verticalSpeed,Math.max(v,1));
 const aoa=clamp(s.pitch-gamma,-.6,.6);
 const stall=Math.abs(aoa)>.32?Math.max(.25,1-(Math.abs(aoa)-.32)*2.6):1;
 const lift=9.81*(v/14)**2*clamp(.6+4*aoa,-.8,1.88)*stall;
 let acceleration;
 if(push)acceleration=(-1.4-s.speed)*1.8;
 else if(s.onWater){
  const hullDrag=.07*Math.abs(s.speed)+.002*s.speed*s.speed+.65*Math.exp(-(((Math.abs(s.speed)-6)/3)**2));
  acceleration=4.2*power-Math.sign(s.speed)*hullDrag;
  if(s.speed<0)acceleration+=-s.speed*.65;
  if(input.brake)acceleration-=Math.sign(s.speed)*flight.waterBrake;
 }else{
  const drag=.004*v*v+.15*(lift/9.81)**2;
  acceleration=4.2*power/(1+v*.035)-drag-9.81*Math.sin(gamma);
 }
 const before=s.speed;
 s.speed=clamp(s.speed+acceleration*dt,s.onWater?-1.4:0,flight.maxSpeed);
 if(s.onWater&&!push&&before<=0&&s.speed>0&&!power)s.speed=0;
 if(s.onWater&&!push&&Math.abs(s.speed)<.025&&!power)s.speed=0;
 if(s.onWater&&input.brake&&Math.sign(before)!==Math.sign(s.speed))s.speed=0;
 const authority=clamp(v/12,0,1);
 let bank=-steer*.55*authority;
 if(recovering)bank=-clamp(inward*1.4,-1,1)*.55;
 s.roll=damp(s.roll,s.onWater?-steer*.035:bank,2.6,dt);
 // Coordinated turn: banking precedes yaw, and larger airspeed gives a wider turn.
 let yaw=s.onWater?steer*.65*clamp(s.speed/4,-.35,1):-9.81*Math.tan(s.roll)/Math.max(v,6);
 if(recovering&&s.onWater)yaw=clamp(inward*1.4,-.65,.65);
 s.yawRate=damp(s.yawRate,yaw,3,dt);s.heading+=s.yawRate*dt;
 const pitchInput=(input.up?1:0)-(input.down?1:0);
 s.elevatorAngle=damp(s.elevatorAngle,pitchInput*.22,6,dt);
 s.aileronAngle=damp(s.aileronAngle,steer*.25,6,dt);
 s.rudderAngle=damp(s.rudderAngle,steer*.22,6,dt);
 s.pitch=damp(s.pitch,pitchInput*(s.onWater&&v<flight.liftSpeed?.075:.3),2,dt);
 s.stallWarning=!s.onWater&&(v<flight.liftSpeed||Math.abs(aoa)>.32);
 // Rotation needs actual aerodynamic support; pulling up at zero speed cannot fly.
 if(s.onWater&&ready&&v>=flight.liftSpeed&&s.pitch>.05&&lift>9.81)s.onWater=false;
 if(s.onWater)s.verticalSpeed=0;
 else s.verticalSpeed=clamp(s.verticalSpeed+(lift*Math.cos(s.roll)-9.81)*dt,-12,10);
 return {lift,angleOfAttack:aoa,power};
}
