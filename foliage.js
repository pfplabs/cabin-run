import * as THREE from 'three';
import {WORLD,LAKE,DRIVEWAY,lakeRadius,roadOffset,roadPoint,TUNNEL} from './engine.js';

export const FOREST_LOD=Object.freeze({chunkSize:384,detailStart:160,detailEnd:220,fadeStart:1400,cullDistance:1900});
const smoothStep=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
/** CPU counterpart of the complementary screen-door LOD transition. */
export function forestLODWeights(distance,detailed=true){
 const fade=1-smoothStep(FOREST_LOD.fadeStart,FOREST_LOD.cullDistance,distance);
 const blend=detailed?smoothStep(FOREST_LOD.detailStart,FOREST_LOD.detailEnd,distance):1;
 return {detail:(1-blend)*fade,card:blend*fade,total:fade};
}

/** Fixed seeded placement; camera-dependent geometry, spatial culling and fades.
 * Call forest.updateLOD(camera.position,camera) after camera movement each frame.
 * Passing the camera enables MAIN-VIEW DIAGNOSTICS only. Mesh frustum culling
 * runs independently for the main, reflection and shadow render cameras. The forest root must stay at its generated world transform.
 * updateLOD returns current main-pass submission estimates, NOT measured FPS.
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
  const needles=new THREE.CanvasTexture(c);needles.colorSpace=THREE.SRGBColorSpace;needles.anisotropy=8;
  // Crisp nearby needles; mipmapped coverage softens naturally into scene fog.
  needles.generateMipmaps=true;needles.minFilter=THREE.LinearMipmapLinearFilter;needles.magFilter=THREE.LinearFilter;
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
    if(Math.abs(roadOffset(x,z))<14||lakeRadius(x,z)<1+8.5/LAKE.rz)return false;
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
  for(let i=0;i<30000&&near.length<1500;i++){
    const a=random()*Math.PI*2,p=roadPoint(a),r=Math.hypot(p.x,p.z-WORLD.centerZ)+(random()>.5?1:-1)*(18+Math.sqrt(random())*70),x=Math.sin(a)*r,z=WORLD.centerZ-Math.cos(a)*r;
    const density=.7+.22*Math.sin(a*7)+.08*Math.cos(x*.09+z*.06);
    if(random()<density)add(near,x,z);
  }
  for(let i=0;i<80000&&far.length<8000;i++){
    const a=random()*Math.PI*2,r=WORLD.roadRadius*(1.15+Math.sqrt(random())*1.85),x=Math.cos(a)*r,z=WORLD.centerZ+Math.sin(a)*r;
    if(random()<.8+.17*Math.sin(a*11))add(far,x,z);
  }
  const group=new THREE.Group();group.name='Spatially chunked alpine forest';
  const lodCamera={value:new THREE.Vector3(0,20,0)};
  const ranges={value:new THREE.Vector4(FOREST_LOD.detailStart,FOREST_LOD.detailEnd,FOREST_LOD.fadeStart,FOREST_LOD.cullDistance)};
  function withFade(m,role){
    m.customProgramCacheKey=()=>`forest-distance-lod-v1-${role}`;
    m.onBeforeCompile=shader=>{
      shader.uniforms.forestCamera=lodCamera;shader.uniforms.forestRanges=ranges;
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
        uniform vec3 forestCamera;varying float vForestDistance;
        ${role==='card'?'attribute float lodEligible;varying float vLODEligible;':''}
      `).replace('#include <project_vertex>',`#include <project_vertex>
        vec4 forestCenter=vec4(0.,.45,0.,1.);
        #ifdef USE_INSTANCING
          forestCenter=instanceMatrix*forestCenter;
        #endif
        vForestDistance=distance((modelMatrix*forestCenter).xyz,forestCamera);
        ${role==='card'?'vLODEligible=lodEligible;':''}
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        uniform vec4 forestRanges;varying float vForestDistance;
        ${role==='card'?'varying float vLODEligible;':''}
      `).replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
        float forestBlend=smoothstep(forestRanges.x,forestRanges.y,vForestDistance);
        float forestFade=1.-smoothstep(forestRanges.z,forestRanges.w,vForestDistance);
        if(${role==='card'?'vLODEligible>.5 && forestBlend<1.':'forestBlend>0.'}){
          float forestNoise=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
          ${role==='card'?'if(forestNoise<1.-forestBlend)discard;':'if(forestNoise>=1.-forestBlend)discard;'}
        }
        if(forestFade<1.){
          float forestFarNoise=fract(sin(dot(floor(gl_FragCoord.xy)+vec2(73.,19.),vec2(39.346,11.135)))*47453.5453);
          if(forestFarNoise>=forestFade)discard;
        }
      `);
    };
    return m;
  }
  const detailMaterial=withFade(material,'detail'),cardMaterial=withFade(material.clone(),'card');
  const trunkMaterial=withFade(bark,'detail');
  // Shadows fade with the detailed crowns, rather than surviving their LOD swap.
  const crownDepth=withFade(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:needles,alphaTest:.28,side:THREE.DoubleSide}),'detail');
  const trunkDepth=withFade(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),'detail');
  const detailGeometry=[0,1,2].map(v=>geometry(false,v)),cardGeometry=geometry(true);
  const trunkGeometry=new THREE.CylinderGeometry(.006,.019,.97,6,1).translate(0,.485,0);
  const chunks=new Map(),transform=new THREE.Object3D(),tint=new THREE.Color(),locationData=new Float32Array((near.length+far.length)*3);
  [...near,...far].forEach((tree,id)=>{
    // Preserve the original world-space Float32 instance roots exactly.
    tree.id=id;tree.detailed=id<near.length;tree.variant=id%3;
    tree.y=Math.fround(heightAt(tree.x,tree.z)-.04);tree.x=Math.fround(tree.x);tree.z=Math.fround(tree.z);
    locationData.set([tree.x,tree.y,tree.z],id*3);
    const ix=Math.floor(tree.x/FOREST_LOD.chunkSize),iz=Math.floor(tree.z/FOREST_LOD.chunkSize),key=`${ix},${iz}`;
    if(!chunks.has(key)){
      const node=new THREE.Group();node.name=`Forest chunk ${key}`;node.position.set((ix+.5)*FOREST_LOD.chunkSize,0,(iz+.5)*FOREST_LOD.chunkSize);group.add(node);
      chunks.set(key,{node,trees:[],near:[],bounds:new THREE.Box3(),batches:[]});
    }
    const chunk=chunks.get(key);chunk.trees.push(tree);if(tree.detailed)chunk.near.push(tree);
    transform.position.set(tree.x-chunk.node.position.x,tree.y,tree.z-chunk.node.position.z);transform.rotation.set(tree.lean,tree.angle,tree.lean*.6);transform.scale.set(tree.h*tree.w,tree.h,tree.h*tree.w);transform.updateMatrix();tree.matrix=transform.matrix.clone();
    tree.center=new THREE.Vector3(tree.x,tree.y,tree.z).add(new THREE.Vector3(0,.45,0).applyMatrix4(tree.matrix).sub(transform.position));
    tint.setHSL(.245+tree.tint*.045,.14+tree.tint*.12,.62+tree.tint*.20);tree.color=tint.clone();
    tint.setHSL(.09,.12,.65+tree.tint*.18);tree.barkColor=tint.clone();
    const radius=tree.h*.65*Math.max(1,tree.w);
    chunk.bounds.expandByPoint(new THREE.Vector3(tree.x-radius,tree.y-1,tree.z-radius));
    chunk.bounds.expandByPoint(new THREE.Vector3(tree.x+radius,tree.y+tree.h*1.08,tree.z+radius));
  });
  function batch(chunk,g,m,capacity,role,depth){
    const mesh=new THREE.InstancedMesh(g,m,capacity);mesh.name=`${chunk.node.name} ${role}`;mesh.count=0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=role!=='cards';mesh.receiveShadow=role!=='cards';mesh.frustumCulled=true;
    mesh.boundingSphere=chunk.sphere.clone();mesh.boundingSphere.center.sub(chunk.node.position);
    if(depth)mesh.customDepthMaterial=depth;
    const result={mesh,role,ids:[],triangles:g.index.count/3};chunk.node.add(mesh);chunk.batches.push(result);return result;
  }
  for(const chunk of chunks.values()){
    chunk.sphere=chunk.bounds.getBoundingSphere(new THREE.Sphere());
    chunk.details=[0,1,2].map(v=>{
      const count=chunk.near.filter(t=>t.variant===v).length;
      return count?batch(chunk,detailGeometry[v],detailMaterial,count,`detail-${v}`,crownDepth):null;
    });
    chunk.trunks=chunk.near.length?batch(chunk,trunkGeometry,trunkMaterial,chunk.near.length,'trunks',trunkDepth):null;
    // No cylinder trunks are allocated for the 8,000 distant silhouettes.
    const cards=cardGeometry.clone();cards.setAttribute('lodEligible',new THREE.InstancedBufferAttribute(new Float32Array(chunk.trees.length),1).setUsage(THREE.DynamicDrawUsage));
    chunk.cards=batch(chunk,cards,cardMaterial,chunk.trees.length,'cards');
  }
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4();
  const stats=group.userData.forest={detailedTrees:near.length,distantTrees:far.length,cabinGroveTrees:heroCount,worldScale:WORLD.scale,totalChunks:chunks.size,totalTrees:near.length+far.length};
  function writeBatch(target,trees){
    if(!target)return;
    const mesh=target.mesh;mesh.visible=trees.length>0;
    if(target.ids.length===trees.length&&trees.every((tree,i)=>target.ids[i]===tree.id))return;
    target.ids=trees.map(t=>t.id);mesh.count=trees.length;
    trees.forEach((tree,i)=>{mesh.setMatrixAt(i,tree.matrix);mesh.setColorAt(i,target.role==='trunks'?tree.barkColor:tree.color);if(target.role==='cards')mesh.geometry.attributes.lodEligible.setX(i,tree.detailed?1:0);});
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    if(target.role==='cards')mesh.geometry.attributes.lodEligible.needsUpdate=true;
  }
  group.updateLOD=(position,camera=null)=>{
    lodCamera.value.copy(position);
    if(camera){camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);}
    Object.assign(stats,{activeChunks:0,mainViewChunks:0,distanceCulledChunks:0,mainViewRejectedChunks:0,emptyChunks:0,transitionTrees:0,detailInstances:0,trunkInstances:0,cardInstances:0,submittedTriangles:0,drawCallsEstimate:0,distanceActiveInstances:0,distanceEnabledTriangles:0});
    for(const chunk of chunks.values()){
      const distance=position.distanceTo(chunk.sphere.center)-chunk.sphere.radius;
      if(distance>=FOREST_LOD.cullDistance){chunk.node.visible=false;stats.distanceCulledChunks++;continue;}
      // Never hide by the main frustum: Water and shadows use other cameras.
      const inMainView=!camera||frustum.intersectsSphere(chunk.sphere);
      chunk.node.userData.mainViewVisible=inMainView;
      const details=[[],[],[]],trunks=[],cards=[];
      for(const tree of chunk.trees){
        const d=position.distanceTo(tree.center);
        if(d>=FOREST_LOD.cullDistance)continue;
        if(tree.detailed&&d<FOREST_LOD.detailEnd){details[tree.variant].push(tree);trunks.push(tree);if(inMainView&&d>FOREST_LOD.detailStart)stats.transitionTrees++;}
        if(!tree.detailed||d>FOREST_LOD.detailStart)cards.push(tree);
      }
      chunk.node.visible=cards.length+trunks.length>0;if(!chunk.node.visible){stats.emptyChunks++;continue;}
      stats.activeChunks++;if(inMainView)stats.mainViewChunks++;else stats.mainViewRejectedChunks++;
      for(let v=0;v<3;v++)writeBatch(chunk.details[v],details[v]);writeBatch(chunk.trunks,trunks);writeBatch(chunk.cards,cards);
      if(inMainView){stats.detailInstances+=trunks.length;stats.trunkInstances+=trunks.length;stats.cardInstances+=cards.length;}
      for(const b of chunk.batches)if(b.mesh.visible&&b.mesh.count){
        stats.distanceActiveInstances+=b.mesh.count;stats.distanceEnabledTriangles+=b.mesh.count*b.triangles;
        if(inMainView){stats.drawCallsEstimate++;stats.submittedTriangles+=b.mesh.count*b.triangles;}
      }
    }
    stats.activeInstances=stats.detailInstances+stats.trunkInstances+stats.cardInstances;
    stats.activeUniqueTrees=stats.detailInstances+stats.cardInstances-stats.transitionTrees;
    stats.triangles=stats.submittedTriangles;stats.reflectionEligibleChunks=stats.activeChunks;return stats;
  };
  group.userData.updateLOD=group.updateLOD;
  // Copies are returned only on request for deterministic placement QA, not per frame.
  group.getTreeLocations=()=>locationData.slice();
  group.updateLOD(new THREE.Vector3(-49,24,55));
  return group;
}
