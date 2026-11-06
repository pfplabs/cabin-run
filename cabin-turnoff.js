/** The cabin mouth flares gently into the existing two-way paved approach. */
export const CABIN_TURNOFF_LENGTH=32;
export function cabinApproachWidth(distance,width=4.5){
 const t=Math.max(0,Math.min(1,distance/CABIN_TURNOFF_LENGTH)),blend=1-t*t*(3-2*t);
 return width+7.5*blend;
}
export function cabinApproachSample(points,x,z){
 let distance=Infinity,along=0,travel=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(length*length))),d=Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
  if(d<distance){distance=d;along=travel+t*length;}
  travel+=length;
 }
 return {distance,along,halfWidth:cabinApproachWidth(along)/2};
}
