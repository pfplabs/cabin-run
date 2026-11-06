import * as THREE from 'three';
import {WORLD,DRIVEWAY,lakeRadius,roadOffset,TUNNEL} from './engine.js';

/** Static near/far instancing: distinct conifer silhouettes, not repeated cones.
 * Near trees keep layered radial branch cards and real trunks; distant stands
 * use crossed needle silhouettes. All randomness is seeded for stable scenery.
 */
export function createForest(heightAt,roadRadius){
  let seed=71;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.lineCap='round';
  const stroke=(a,b,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();};
  stroke([256,505],[256,8],'#87745a',6);
  for(let j=0;j<22;j++){
    const y=28+j*21,spread=18+j*9.2;
    for(const sign of [-1,1]){
      const end=[256+spread*sign,y-32-random()*15];stroke([256,y+14],end,'#668053',4);
      for(let k=1;k<25;k++){
        const t=k/25,x=256+(end[0]-256)*t,yy=y+14+(end[1]-y-14)*t;
        for(const d of [-1,1])stroke([x,yy],[x+sign*(13+random()*21),yy+d*(10+random()*16)-4],random()>.45?'#51774b':'#78975e',1.9+random()*1.5);
      }
    }
  }
  const needles=new THREE.CanvasTexture(c);needles.colorSpace=THREE.SRGBColorSpace;needles.anisotropy=4;
  const material=new THREE.MeshStandardMaterial({map:needles,alphaTest:.28,side:THREE.DoubleSide,roughness:.94,color:0xffffff});
  const bark=new THREE.MeshStandardMaterial({color:0x70624f,roughness:1});
  function geometry(distant,variant=0){
    const positions=[],uvs=[],indices=[];
    const quad=(points)=>{const base=positions.length/3;for(const p of points)positions.push(...p.toArray());uvs.push(0,1,1,1,1,0,0,0);indices.push(base,base+1,base+2,base,base+2,base+3);};
    if(distant){
      // Three full-height alpha silhouettes avoid the empty edge-on billboard.
      for(let i=0;i<3;i++){
        const a=i*Math.PI/3,dx=Math.cos(a)*.29,dz=Math.sin(a)*.29;
        quad([new THREE.Vector3(-dx,.07,-dz),new THREE.Vector3(dx,.07,dz),new THREE.Vector3(dx,1,dz),new THREE.Vector3(-dx,1,-dz)]);
      }
    }else{
      const tiers=11+variant,spread=[.30,.245,.34][variant];
      for(let level=0;level<tiers;level++){
        const t=level/(tiers-1),y=.14+t*.81,length=spread*Math.pow(1-t*.94,.78),branches=6+(level+variant)%3;
        for(let b=0;b<branches;b++){
          if(level<2&&random()<.13)continue; // occasional broken/lifted lower limbs
          const a=b/branches*Math.PI*2+level*2.39+random()*.28,r=length*(.78+random()*.39);
          const root=new THREE.Vector3(0,y,0),tip=new THREE.Vector3(Math.cos(a)*r,y+(.02-t*.01)+random()*.027,Math.sin(a)*r);
          const tangent=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
          for(const tilt of [0,1.05]){
            const side=tangent.clone().multiplyScalar(Math.cos(tilt)).add(new THREE.Vector3(0,Math.sin(tilt),0));
            quad([root.clone().addScaledVector(side,-r*.12),root.clone().addScaledVector(side,r*.12),tip.clone().addScaledVector(side,r*.65),tip.clone().addScaledVector(side,-r*.65)]);
          }
        }
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
  const occupied=new Set();
  function valid(x,z,spacing){
    const r=roadRadius(x,z);
    if(Math.abs(roadOffset(x,z))<14||lakeRadius(x,z)<1.075)return false;
    const angle=Math.atan2(x,WORLD.centerZ-z);if(angle>TUNNEL.startAngle-.04&&angle<TUNNEL.endAngle+.04&&Math.abs(roadOffset(x,z))<29)return false;
    // Cabin, terrace and apron remain clear. No stand blocks the access lane.
    if(x>-14&&x<34&&z>-34&&z<12)return false;
    if(DRIVEWAY.some((a,i)=>i&&segmentDistance(x,z,DRIVEWAY[i-1],a)<7.5))return false;
    if(!Number.isFinite(heightAt(x,z))||heightAt(x,z)<.1)return false;
    const gx=Math.floor(x/spacing),gz=Math.floor(z/spacing),key=`${spacing}:${gx}:${gz}`;
    if(occupied.has(key))return false;occupied.add(key);return true;
  }
  const near=[],far=[];
  function add(list,x,z,hero=false){if(!valid(x,z,hero?2.8:4))return;list.push({x,z,h:hero?7+random()*10:9+random()*15,w:.76+random()*.45,angle:random()*Math.PI*2,tint:random(),lean:(random()-.5)*.035});}
  // Irregular small groves behind the enlarged cabin, away from driveway.
  const groves=[[-4,-40],[21,-43],[37,-33],[-31,-29],[48,-46]];
  for(let i=0;i<1200&&near.length<95;i++){
    const [x,z]=groves[i%groves.length],a=random()*Math.PI*2,r=Math.sqrt(random())*11;
    add(near,x+Math.cos(a)*r,Math.max(-50,Math.min(-25,z+Math.sin(a)*r)),true);
  }
  const heroCount=near.length;
  // Clustered density varies around the valley, rather than a regular tree wall.
  for(let i=0;i<18000&&near.length<900;i++){
    const a=random()*Math.PI*2,r=WORLD.roadRadius*(1.09+Math.sqrt(random())*.66),x=Math.cos(a)*r,z=WORLD.centerZ+Math.sin(a)*r;
    const density=.7+.22*Math.sin(a*7)+.08*Math.cos(x*.09+z*.06);
    if(random()<density)add(near,x,z);
  }
  for(let i=0;i<26000&&far.length<2100;i++){
    const a=random()*Math.PI*2,r=WORLD.roadRadius*(1.73+Math.sqrt(random())*.86),x=Math.cos(a)*r,z=WORLD.centerZ+Math.sin(a)*r;
    if(random()<.8+.17*Math.sin(a*11))add(far,x,z);
  }
  const group=new THREE.Group();group.name='Layered alpine forest';const transform=new THREE.Object3D(),tint=new THREE.Color();let triangles=0;
  const trunkGeometry=new THREE.CylinderGeometry(.006,.019,.97,6,1).translate(0,.485,0);
  function stand(trees,g,name,shadow){
    const crowns=new THREE.InstancedMesh(g,material,trees.length),trunks=new THREE.InstancedMesh(trunkGeometry,bark,trees.length);crowns.name=name;trunks.name=name+' trunks';
    trees.forEach((tree,i)=>{
      transform.position.set(tree.x,heightAt(tree.x,tree.z)-.04,tree.z);transform.rotation.set(tree.lean,tree.angle,tree.lean*.6);transform.scale.set(tree.h*tree.w,tree.h,tree.h*tree.w);transform.updateMatrix();
      crowns.setMatrixAt(i,transform.matrix);trunks.setMatrixAt(i,transform.matrix);
      tint.setHSL(.245+tree.tint*.045,.14+tree.tint*.12,.62+tree.tint*.20);crowns.setColorAt(i,tint);
      tint.setHSL(.09,.12,.65+tree.tint*.18);trunks.setColorAt(i,tint);
    });
    crowns.castShadow=shadow;crowns.receiveShadow=true;trunks.castShadow=shadow;trunks.receiveShadow=true;
    crowns.instanceMatrix.needsUpdate=trunks.instanceMatrix.needsUpdate=true;
    crowns.computeBoundingSphere();trunks.computeBoundingSphere();group.add(crowns,trunks);
    triangles+=trees.length*(g.index.count+trunkGeometry.index.count)/3;
  }
  for(let v=0;v<3;v++)stand(near.filter((_,i)=>i%3===v),geometry(false,v),`Detailed conifers ${v+1}`,true);
  stand(far,geometry(true),'Distant needle silhouettes',false);
  group.userData.forest={detailedTrees:near.length,distantTrees:far.length,cabinGroveTrees:heroCount,triangles,worldScale:WORLD.scale};
  return group;
}
