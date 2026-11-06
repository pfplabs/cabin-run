/** Pure shared routes. Junctions start on the loop; turnarounds stop inland of the shore. */
export function createExplorationRoutes(roadPoint,lakeBoundaryPoint){
 return [
  {id:'overlook',label:'LAKE OVERLOOK',mapLabel:'V',angle:-1.08,description:'Lake overlook — a quiet view across the alpine basin.'},
  {id:'cove',label:'CEDAR COVE',mapLabel:'C',angle:-1.85,description:'Cedar Cove — sheltered water beneath the western forest.'},
  {id:'picnic',label:'PINE CLEARING',mapLabel:'P',angle:-2.55,description:'Pine Clearing — a picnic stop on the south shore.'}
 ].map(spec=>{
  const start=roadPoint(spec.angle),shore=lakeBoundaryPoint(spec.angle),dx=shore.x-start.x,dz=shore.z-start.z,length=Math.hypot(dx,dz),nx=dx/length,nz=dz/length;
  const end={x:shore.x-nx*33,z:shore.z-nz*33,y:1.3};
  const points=Array.from({length:33},(_,i)=>{const t=i/32,s=t*t*(3-2*t),bend=Math.sin(t*Math.PI)**2*8;return {x:start.x+(end.x-start.x)*t-nz*bend,z:start.z+(end.z-start.z)*t+nx*bend,y:start.y+(end.y-start.y)*s};});
  const turnLane=Array.from({length:41},(_,i)=>{const t=i/40,a=spec.angle-.13+t*.17,p=roadPoint(a),q=roadPoint(a+.0001),dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz),offset=2.5+3.3*Math.min(1,t/.32,(1-t)/.24);return {x:p.x-dz/l*offset,z:p.z+dx/l*offset,y:p.y};});
  return {...spec,points,turnLane,end,nx,nz,width:6,turnRadius:12,bounds:{minX:Math.min(...points.map(p=>p.x))-24,maxX:Math.max(...points.map(p=>p.x))+24,minZ:Math.min(...points.map(p=>p.z))-24,maxZ:Math.max(...points.map(p=>p.z))+24}};
 });
}
/** Signed distance from drivable gravel, with cheap rejection for distant terrain samples. */
export function explorationSample(routes,x,z){
 let distance=Infinity,height=0,route=null;
 for(const r of routes){
  const b=r.bounds;if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)continue;
  let d=Math.hypot(x-r.end.x,z-r.end.z)-r.turnRadius,y=r.end.y;
  for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),candidate=Math.hypot(x-a.x-t*dx,z-a.z-t*dz)-r.width/2;
   if(candidate<d){d=candidate;y=a.y+(b.y-a.y)*t;}
  }
  if(Math.hypot(x-r.end.x,z-r.end.z)<=r.turnRadius)y=r.end.y;
  if(d<distance){distance=d;height=y;route=r;}
 }
 return {distance,height,route};
}
