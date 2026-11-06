import test from 'node:test';
import assert from 'node:assert/strict';
import {createRiverWater,channelWidth} from '../river-water.js';
import {WATERCOURSE,streamCenter,streamHeight} from '../waterfall-bridge.js';
test('river remains inside carved gorge and retains each cascade break',()=>{
 const group=createRiverWater({...WATERCOURSE,center:streamCenter,height:streamHeight});
 const p=group.children[0].geometry.attributes.position,uv=group.children[0].geometry.attributes.uv;
 for(let z=698;z<=1020;z++){assert.ok(channelWidth(z)>2);assert.ok(channelWidth(z)<8);}
 const zs=new Set();for(let i=0;i<p.count;i++){const z=p.getZ(i);zs.add(z);assert.ok(Math.abs(p.getX(i)-streamCenter(z))<8);assert.ok(p.getY(i)>streamHeight(z));if(i>=17)assert.ok(uv.getY(i)>uv.getY(i-17));}
 for(const z of [974,986,992,1003])assert.ok(zs.has(z),`missing bed break ${z}`);
});
test('river animation retains geometry and GPU resources across repeated updates',()=>{
 const group=createRiverWater({...WATERCOURSE,center:streamCenter,height:streamHeight});const geometry=group.children[0].geometry,positions=geometry.attributes.position.array.slice(),spray=group.children[1],matrix=spray.instanceMatrix.array.slice();
 for(let i=0;i<600;i++)group.update(i/60);
 assert.equal(group.children[0].geometry,geometry);assert.deepEqual(geometry.attributes.position.array,positions);assert.deepEqual(spray.instanceMatrix.array,matrix);assert.equal(spray.count,64);assert.equal(group.children[0].material.isMeshStandardMaterial,true);
});
