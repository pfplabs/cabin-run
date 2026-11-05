import * as THREE from 'three';

/** Needle-textured branch cards arranged in 3D, rather than solid cone trees. */
export function createForest(heightAt,roadRadius){
  let seed=71;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  ctx.lineCap='round';
  const stroke=(a,b,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();};
  stroke([256,500],[256,12],'#76654b',6);
  for(let j=0;j<19;j++){
    const y=45+j*23,spread=28+j*9;
    for(const sign of [-1,1]){
      const end=[256+spread*sign,y-42];stroke([256,y+12],end,'#495c34',3);
      for(let k=1;k<20;k++){
        const t=k/20,x=256+(end[0]-256)*t,yy=y+12+(end[1]-y-12)*t;
        for(const d of [-1,1])stroke([x,yy],[x+sign*(14+random()*18),yy+d*(10+random()*12)-5],random()>.45?'#315e34':'#547748',1.6+random());
      }
    }
  }
  const needles=new THREE.CanvasTexture(c);needles.colorSpace=THREE.SRGBColorSpace;needles.anisotropy=4;
  const material=new THREE.MeshStandardMaterial({map:needles,alphaTest:.35,side:THREE.DoubleSide,roughness:1,color:0xffffff});
  const positions=[],uvs=[],indices=[];
  function card(root,tip,width,vertical){
    const dir=tip.clone().sub(root).normalize(),side=vertical?new THREE.Vector3(0,1,0):new THREE.Vector3(-dir.z,0,dir.x);
    const base=positions.length/3;
    for(const p of [root.clone().addScaledVector(side,-width*.1),root.clone().addScaledVector(side,width*.1),tip.clone().addScaledVector(side,width*.5),tip.clone().addScaledVector(side,-width*.5)])positions.push(...p.toArray());
    uvs.push(0,1,1,1,1,0,0,0);indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  for(let level=0;level<12;level++){
    const y=.12+level*.069,length=.28*(1-level/13);
    for(let branch=0;branch<9;branch++){
      const a=branch/9*Math.PI*2+level*.7,r=length*(.85+random()*.3),root=new THREE.Vector3(0,y,0),tip=new THREE.Vector3(Math.cos(a)*r,y+.035,Math.sin(a)*r);
      card(root,tip,r*.9,false);card(root,tip,r*.55,true);
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
  const foliage=new THREE.InstancedMesh(geo,material,800),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.022,.9,7).translate(0,.45,0),new THREE.MeshStandardMaterial({color:0x52422f,roughness:1}),800);
  const transform=new THREE.Object3D();let n=0;
  for(let i=0;i<1700&&n<800;i++){
    const x=(random()-.5)*400,z=(random()-.5)*400+62,r=roadRadius(x,z);
    if(r<1.22||r>2.1)continue;
    const h=6+random()*12;transform.position.set(x,heightAt(x,z),z);transform.rotation.y=random()*Math.PI*2;transform.scale.set(h,h,h);transform.updateMatrix();foliage.setMatrixAt(n,transform.matrix);trunks.setMatrixAt(n,transform.matrix);n++;
  }
  foliage.count=trunks.count=n;foliage.castShadow=foliage.receiveShadow=true;trunks.castShadow=true;
  const group=new THREE.Group();group.name='Needle-textured alpine conifers';group.add(foliage,trunks);return group;
}
