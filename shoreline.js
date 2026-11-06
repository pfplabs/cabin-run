/** Shared irregular shore model; preserve the cabin cove and tributary mouth. */
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function shorelineScale(angle){
 const a=Math.atan2(Math.sin(angle),Math.cos(angle)),away=smooth((Math.abs(a)-.42)/.30)*smooth((Math.PI-Math.abs(a)-.13)/.22);
 const shape=Math.max(.77,Math.min(1.02,.91+.07*Math.sin(3*a)+.04*Math.sin(7*a)-.025*Math.cos(5*a)));
 return 1+(shape-1)*away;
}
export const SHORELINE_GLSL=`
float lakeShoreScale(float a){
 float away=smoothstep(.42,.72,abs(a))*smoothstep(.13,.35,3.14159265359-abs(a));
 float shape=clamp(.91+.07*sin(3.*a)+.04*sin(7.*a)-.025*cos(5.*a),.77,1.02);
 return mix(1.,shape,away);
}`;
