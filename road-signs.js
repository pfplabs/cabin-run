import * as THREE from 'three';
import {roadPoint,TUNNEL} from './engine.js';

// Keep posts off the driving surface and face the approaching lane in both directions.
export function roadSignPlacements(){
 const specs=[
  {angle:-.72,direction:1,title:'NORTHBOUND',subtitle:'CABIN  →',kind:'guide'},
  {angle:-.58,direction:-1,title:'NORTHBOUND',subtitle:'←  CABIN',kind:'guide'},
  {angle:TUNNEL.startAngle-.045,direction:1,title:'TUNNEL',subtitle:'LIGHTS ON',kind:'warning'},
  {angle:TUNNEL.endAngle+.045,direction:-1,title:'TUNNEL',subtitle:'LIGHTS ON',kind:'warning'},
  {angle:-1.25,direction:1,title:'40',subtitle:'SLOW • CURVES',kind:'speed'},
  {angle:1.2,direction:-1,title:'40',subtitle:'SLOW • CURVES',kind:'speed'}
 ];
 return specs.map(s=>{
  const p=roadPoint(s.angle),q=roadPoint(s.angle+.001),dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz),tx=dx/len,tz=dz/len;
  return {...s,x:p.x-tz*7*s.direction,z:p.z+tx*7*s.direction,rotation:Math.atan2(-tx*s.direction,-tz*s.direction)};
 });
}
function signMap(sign){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
 const c=canvas.getContext('2d'),warning=sign.kind==='warning',speed=sign.kind==='speed';
 c.fillStyle=warning?'#e8be4d':speed?'#eeeee1':'#234d40';c.fillRect(0,0,768,384);
 c.strokeStyle=warning||speed?'#242d2b':'#f3f0db';c.lineWidth=12;c.strokeRect(15,15,738,354);
 c.fillStyle=c.strokeStyle;c.textAlign='center';c.textBaseline='middle';
 c.font=`bold ${speed?156:72}px sans-serif`;c.fillText(sign.title,384,145);
 c.font='bold 55px sans-serif';c.fillText(sign.subtitle,384,280);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
export function createRoadSigns(heightAt){
 const group=new THREE.Group();group.name='Road wayfinding and tunnel warnings';
 const metal=new THREE.MeshStandardMaterial({color:0x777f78,metalness:.65,roughness:.52});
 const backing=new THREE.MeshStandardMaterial({color:0x646d68,metalness:.5,roughness:.6});
 for(const sign of roadSignPlacements()){
  const node=new THREE.Group();node.name=`Road sign: ${sign.title} ${sign.subtitle}`;
  node.position.set(sign.x,heightAt(sign.x,sign.z),sign.z);node.rotation.y=sign.rotation;
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.065,.085,3.5,8),metal);post.position.y=1.75;
  const board=new THREE.Mesh(new THREE.BoxGeometry(3.2,1.6,.09),backing);board.position.y=3.1;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(3.08,1.48),new THREE.MeshStandardMaterial({map:signMap(sign),roughness:.65}));face.material.userData.keepColorMap=true;face.position.set(0,3.1,.051);
  node.add(post,board,face);post.castShadow=board.castShadow=true;group.add(node);
 }
 return group;
}
