import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createRoadRibbonGeometry,createGravelMaterial,isGravel,clipRibbonOutsideRoad} from '../road-surfaces.js';
import {RoadDust} from '../road-dust.js';
import {createLandscapeGeometry} from '../environment.js';
import {DRIVEWAY,roadPoint,terrainHeight} from '../engine.js';

test('dense driveway ribbon stays above the actual land across the usable width',()=>{
 const material=new T.MeshBasicMaterial({side:T.DoubleSide}),land=new T.Mesh(createLandscapeGeometry(),material),road=new T.Mesh(createRoadRibbonGeometry(DRIVEWAY,4.5,{offset:.1}),material),ray=new T.Raycaster();land.updateMatrixWorld();road.updateMatrixWorld();
 let minimum=Infinity,samples=0;
 for(let i=1;i<DRIVEWAY.length;i++){
  const a=DRIVEWAY[i-1],b=DRIVEWAY[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  for(let d=1;d<length-1;d+=1)for(const offset of [-1.7,0,1.7]){
   const x=a.x+dx*d/length-dz/length*offset,z=a.z+dz*d/length+dx/length*offset;
   ray.set(new T.Vector3(x,100,z),new T.Vector3(0,-1,0));const surface=ray.intersectObject(road)[0],ground=ray.intersectObject(land)[0];
   assert.ok(surface&&ground,`Missing road/ground at ${x},${z}`);const clearance=surface.point.y-ground.point.y;minimum=Math.min(minimum,clearance);samples++;
   assert.ok(clearance>.025,`Driveway buried ${clearance.toFixed(3)}m at ${x},${z}`);
   assert.ok(clearance<.4,`Driveway excessively raised ${clearance.toFixed(3)}m at ${x},${z}`);
  }
 }
 assert.ok(samples>250);assert.ok(road.geometry.attributes.position.count>200);
});
test('road normals face upward and gravel has distinct original detail',()=>{
 const points=Array.from({length:60},(_,i)=>roadPoint(i/59*Math.PI*2)),g=createRoadRibbonGeometry(points,8.4);
 assert.ok(g.attributes.position.array.every(Number.isFinite));for(let i=0;i<g.attributes.normal.count;i++)assert.ok(g.attributes.normal.getY(i)>0);
 const material=createGravelMaterial();assert.ok(material.map.isDataTexture);assert.ok(material.bumpMap.isDataTexture);assert.ok(material.roughness>.9);
});
test('gravel classification distinguishes asphalt, shoulders and cabin driveway',()=>{
 const p=roadPoint(Math.PI/2);assert.equal(isGravel(p.x,p.z),false);assert.equal(isGravel(p.x+5,p.z),true);assert.equal(isGravel(-16,-9),false);assert.equal(isGravel(-23,-10),true);
});
test('dust starts on gravel at speed, stays bounded, stops on asphalt and dissipates',()=>{
 const dust=new RoadDust(),p=roadPoint(Math.PI/2),state={phase:'jeep',status:'running',x:p.x,z:p.z,y:p.y,heading:Math.PI,speed:18};
 for(let i=0;i<60;i++)dust.update(state,1/60);assert.equal(dust.pool.filter(p=>p.age<p.life).length,0);
 state.x+=5;for(let i=0;i<300;i++)dust.update(state,1/60);assert.ok(dust.pool.some(p=>p.age<p.life));assert.ok(dust.pool.length<=140);assert.ok(dust.geometry.attributes.position.array.every(Number.isFinite));
 state.speed=0;for(let i=0;i<180;i++)dust.update(state,1/60);assert.equal(dust.pool.filter(p=>p.age<p.life).length,0);
});

test('paved branch is clipped at main-road asphalt edge instead of stacking junction faces',()=>{
 const main=Array.from({length:641},(_,i)=>roadPoint(i/640*Math.PI*2)),source=createRoadRibbonGeometry(DRIVEWAY,4.5),clipped=clipRibbonOutsideRoad(source,main,4.2),p=clipped.attributes.position;
 assert.ok(p.count>0&&p.array.every(Number.isFinite));
 for(let i=0;i<p.count;i++){let distance=Infinity;const x=p.getX(i),z=p.getZ(i);for(let j=1;j<main.length;j++){const a=main[j-1],b=main[j],dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);distance=Math.min(distance,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}assert.ok(distance>4.19,`Branch overlaps main asphalt at ${distance}`);}
});
