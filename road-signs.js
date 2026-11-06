import * as THREE from 'three';
import {cabinApproachWidth} from './cabin-turnoff.js';
import {roadPoint,TUNNEL,DRIVEWAY} from './engine.js';

// Keep posts off the driving surface and face the approaching lane in both directions.
export function roadSignPlacements(){
 const specs=[
  {angle:-.72,direction:1,title:'NORTHBOUND',subtitle:'CABIN  →',kind:'guide'},
  {angle:-.58,direction:-1,title:'NORTHBOUND',subtitle:'←  CABIN',kind:'guide'},
  {angle:TUNNEL.startAngle-.045,direction:1,title:'TUNNEL',subtitle:'LIGHTS ON',kind:'warning'},
  {angle:TUNNEL.endAngle+.045,direction:-1,title:'TUNNEL',subtitle:'LIGHTS ON',kind:'warning'},
  {angle:-1.25,direction:1,title:'25',subtitle:'SPEED LIMIT',kind:'speed'},
  {angle:1.2,direction:-1,title:'25',subtitle:'SPEED LIMIT',kind:'speed'},
  {angle:-2.2,direction:1,title:'DEER',subtitle:'CROSSING',kind:'wildlife'},
  {angle:-1.95,direction:-1,title:'DEER',subtitle:'CROSSING',kind:'wildlife'},
  {angle:2.6,direction:1,title:'25',subtitle:'SPEED LIMIT',kind:'speed'},
  {angle:-.49,direction:-1,title:'25',subtitle:'SPEED LIMIT',kind:'speed'}
 ];
 const signs=specs.map(s=>{
  const p=roadPoint(s.angle),q=roadPoint(s.angle+.001),dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz),tx=dx/len,tz=dz/len;
  return {...s,x:p.x-tz*7*s.direction,z:p.z+tx*7*s.direction,rotation:Math.atan2(-tx*s.direction,-tz*s.direction)};
 });
 return [...signs,turnoffStopPlacement(DRIVEWAY,'Cabin driveway',cabinApproachWidth(12)/2)];
}

/** Path begins at the main road and travels into a destination. */
export function turnoffStopPlacement(path,label='Turnoff',halfWidth=2.25){
 let remaining=12,p=path[0],q=path[1];
 for(let i=1;i<path.length;i++){q=path[i];const length=Math.hypot(q.x-p.x,q.z-p.z);if(length>=remaining)break;remaining-=length;p=q;}
 const length=Math.hypot(q.x-p.x,q.z-p.z),tx=(q.x-p.x)/length,tz=(q.z-p.z)/length;
 // Outbound traffic travels against the path; its right shoulder is (tz,-tx).
 return {kind:'stop',title:'STOP',subtitle:label,x:p.x+tx*remaining+tz*(halfWidth+1.6),z:p.z+tz*remaining-tx*(halfWidth+1.6),rotation:Math.atan2(tx,tz)};
}
function signMap(sign){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=sign.kind==='guide'||sign.kind==='warning'?384:768;
 const c=canvas.getContext('2d'),warning=sign.kind==='warning',speed=sign.kind==='speed',stop=sign.kind==='stop',wild=sign.kind==='wildlife';
 c.fillStyle=stop?'#b92521':warning||wild?'#f3c42f':speed?'#f3f2e9':'#234d40';c.fillRect(0,0,768,768);
 c.strokeStyle=stop?'#fff':warning||speed||wild?'#202622':'#f3f0db';c.lineWidth=18;
 if(stop||wild){c.beginPath();const count=stop?8:4,r=stop?359:356;for(let i=0;i<count;i++){const a=(stop?Math.PI/8:0)+i/count*Math.PI*2,x=384+Math.sin(a)*r,y=384-Math.cos(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();}
 else c.strokeRect(22,22,724,canvas.height-44);
 c.fillStyle=c.strokeStyle;c.textAlign='center';c.textBaseline='middle';
 if(speed){c.font='bold 103px Arial';c.fillText('SPEED',384,158);c.fillText('LIMIT',384,278);c.font='bold 300px Arial';c.fillText(sign.title,384,525);}
 else if(stop){c.font='bold 185px Arial';c.fillText('STOP',384,400);}
 else if(wild){
  // Vector deer silhouette: no font-dependent emoji or external asset.
  c.save();c.translate(384,380);c.lineCap='round';c.lineJoin='round';c.lineWidth=29;
  c.beginPath();c.ellipse(-20,0,110,48,-.1,0,Math.PI*2);c.fill();
  c.beginPath();c.moveTo(59,-10);c.lineTo(98,-100);c.lineTo(133,-120);c.lineTo(160,-108);c.lineTo(127,-86);c.lineTo(98,-3);c.closePath();c.fill();
  for(const leg of [[-94,20,-130,100,-168,122],[-48,28,-32,91,-73,137],[48,25,89,65,155,62],[71,12,131,33,168,0]]){c.beginPath();c.moveTo(leg[0],leg[1]);c.lineTo(leg[2],leg[3]);c.lineTo(leg[4],leg[5]);c.stroke();}
  c.lineWidth=10;for(const antler of [[113,-112,100,-156,75,-177],[103,-146,125,-170,123,-188],[100,-155,83,-150,64,-160]]){c.beginPath();c.moveTo(antler[0],antler[1]);c.lineTo(antler[2],antler[3]);c.lineTo(antler[4],antler[5]);c.stroke();}
  c.beginPath();c.moveTo(-112,-10);c.lineTo(-151,-44);c.lineTo(-128,15);c.fill();c.restore();
 }else{c.font='bold 72px Arial';c.fillText(sign.title,384,145);c.font='bold 55px Arial';c.fillText(sign.subtitle,384,280);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
export function signDimensions(kind){return kind==='speed'?{width:1.05,height:1.4}:kind==='stop'?{width:1.25,height:1.25}:kind==='wildlife'?{width:1.65,height:1.65}:{width:3.2,height:1.6};}
export function signFaceGeometry(kind){
 const {width,height}=signDimensions(kind);
 if(kind!=='stop'&&kind!=='wildlife')return new THREE.PlaneGeometry(width,height);
 const shape=new THREE.Shape(),n=kind==='stop'?8:4;
 for(let i=0;i<n;i++){const a=(kind==='stop'?Math.PI/8:0)+i/n*Math.PI*2,x=Math.sin(a)*width/2,y=Math.cos(a)*height/2;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();
 const geometry=new THREE.ShapeGeometry(shape),pos=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/width+.5,pos.getY(i)/height+.5);
 return geometry;
}
export function createRoadSigns(heightAt,extraSigns=[]){
 const group=new THREE.Group();group.name='Road wayfinding and US traffic signs';
 const metal=new THREE.MeshStandardMaterial({color:0x777f78,metalness:.65,roughness:.52});
 const backing=new THREE.MeshStandardMaterial({color:0x646d68,metalness:.5,roughness:.6,side:THREE.DoubleSide});
 for(const sign of [...roadSignPlacements(),...extraSigns]){
  const node=new THREE.Group();node.name=`Road sign: ${sign.title} ${sign.subtitle}`;node.userData.sign=sign;
  node.position.set(sign.x,heightAt(sign.x,sign.z),sign.z);node.rotation.y=sign.rotation;
  const {height}=signDimensions(sign.kind),center=2.1+height/2;
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,center+.15,8),metal);post.position.set(0,(center+.15)/2,-.075);
  const geometry=signFaceGeometry(sign.kind),board=new THREE.Mesh(geometry,backing);board.position.y=center;
  const face=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:signMap(sign),roughness:.65}));face.material.userData.keepColorMap=true;face.position.set(0,center,.012);
  node.add(post,board,face);post.castShadow=board.castShadow=true;group.add(node);
 }
 return group;
}
