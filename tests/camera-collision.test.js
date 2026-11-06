import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Mesh,BoxGeometry,MeshBasicMaterial,DoubleSide,Raycaster} from 'three';
import {CameraObstruction} from '../camera-collision.js';
import {createMountainTunnel,landscapeHeight} from '../environment.js';
import {roadPoint,roadOffset,TUNNEL} from '../engine.js';

const pose=a=>{const p=roadPoint(a),q=roadPoint(a+.001);return {...p,phase:'jeep',heading:Math.atan2(q.x-p.x,p.z-q.z)};};
test('camera retracts before obstruction and restores preferred zoom gradually',()=>{
 const wall=new Mesh(new BoxGeometry(10,10,.5),new MeshBasicMaterial({side:DoubleSide}));wall.position.set(0,3,6);wall.updateMatrixWorld();
 const solver=new CameraObstruction({obstacles:[wall]}),state={phase:'plane',x:0,y:2,z:0,heading:0},target=new Vector3(0,3,0),desired=new Vector3(0,5,15);
 const actual=solver.resolve({state,target,desired,dt:1/60}).clone();assert.ok(actual.z<5.5);assert.deepEqual(desired.toArray(),[0,5,15]);
 solver.obstacles=[];const first=solver.resolve({state,target,desired,dt:1/60}).clone();assert.ok(first.z>actual.z&&first.z<10);
 for(let i=0;i<100;i++)solver.resolve({state,target,desired,dt:1/60});assert.ok(solver.result.distanceTo(desired)<.01);
});
test('terrain in the sight line pulls camera forward instead of leaving hillside in view',()=>{
 const solver=new CameraObstruction({heightAt:(_,z)=>z>4&&z<7?8:0});
 const p=solver.resolve({state:{phase:'plane',x:0,y:2,z:0,heading:0},target:new Vector3(0,3,0),desired:new Vector3(0,5,15),dt:.016});assert.ok(p.z<4);
});
test('jeep stays visible throughout tunnel in either direction, including portals',()=>{
 const tunnel=createMountainTunnel();tunnel.updateMatrixWorld(true);const obstacles=[];tunnel.traverse(o=>{if(o.isMesh)obstacles.push(o);});
 for(const reverse of [false,true])for(const orbit of [-1.5,0,1.5]){
  const solver=new CameraObstruction({heightAt:landscapeHeight,obstacles});
  for(let i=0;i<=150;i++){
   const a=TUNNEL.startAngle-.09+(TUNNEL.endAngle-TUNNEL.startAngle+.18)*(reverse?1-i/150:i/150),state=pose(a);if(reverse)state.heading+=Math.PI;
   const target=new Vector3(state.x,state.y+2,state.z),desired=target.clone().add(new Vector3(-Math.sin(state.heading+orbit)*18,8,Math.cos(state.heading+orbit)*18));
   const actual=solver.resolve({state,target,desired,dt:1/30}).clone(),line=actual.clone().sub(target),distance=line.length();
   assert.ok(distance>3,`Camera too close at ${a}: ${distance}`);
   const ray=new Raycaster(target,line.normalize(),.01,distance+.1);assert.equal(ray.intersectObjects(obstacles,false).length,0,`Obstructed at ${a}`);
   if(a>TUNNEL.startAngle+.05&&a<TUNNEL.endAngle-.05){assert.ok(Math.abs(roadOffset(actual.x,actual.z))<TUNNEL.innerHalfWidth-.4);assert.ok(actual.y<state.y+4);}
  }
 }
});
