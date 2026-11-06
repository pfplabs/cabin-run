import * as THREE from 'three';

// Material detail is evaluated in metres, so grain does not grow with a facade.
// Only existing hero geometry is changed: collision and animation roots survive.
function cedarFinish(material) {
  // The shared hardwood photograph contains dark flooring-sized patches. On
  // facade timbers those overwhelmed the real board joints and looked painted.
  // Use a restrained cedar albedo with grain in metres instead; no new textures
  // or draw calls, and no repeating floorboard photograph across the walls.
  material.map=null;material.bumpMap=null;material.roughnessMap=null;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTimberWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTimberWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vTimberWorld;
      float timberHash(float n){return fract(sin(n*127.1)*43758.5453);}
      float timberNoise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        float n=i.x+i.y*57.0;
        return mix(mix(timberHash(n),timberHash(n+1.0),f.x),
                   mix(timberHash(n+57.0),timberHash(n+58.0),f.x),f.y);
      }
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec3 p=vTimberWorld;
      float coursePosition=(p.y-1.675)/.33;
      float course=floor(coursePosition);
      float board=timberHash(course);
      vec3 face=abs(cross(dFdx(p),dFdy(p)));
      float along=face.x>face.z?p.z:p.x;
      // Low-frequency bending follows the length of each timber, rather than
      // painting broad mottling or a uniform sine stripe over the whole house.
      float bend=timberNoise(vec2(along*.38,course*2.3))*.045;
      float grainCoordinate=p.y+bend;
      float fine=timberNoise(vec2(along*.8+board*13.0,grainCoordinate*170.0));
      float broad=timberNoise(vec2(along*.22+board*7.0,grainCoordinate*36.0));
      float grainVisibility=1.0-smoothstep(.3,1.5,fwidth(grainCoordinate)*170.0);
      float cedarGrain=(fine-.5)*grainVisibility;
      float jointDistance=min(fract(coursePosition),1.0-fract(coursePosition));
      float seamWidth=max(.028,fwidth(coursePosition));
      float joint=1.0-.20*(1.0-smoothstep(0.0,seamWidth,jointDistance));
      diffuseColor.rgb*=mix(.91,1.07,board)*(1.0+cedarGrain*.16+(broad-.5)*.07)*joint;
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor+cedarGrain*.10,.65,.88);
    `);
  };
  material.customProgramCacheKey=()=> 'cedar-grain-v2';
  material.needsUpdate=true;
}

function isUnder(object,name){for(let p=object;p;p=p.parent)if(p.name===name)return true;return false;}

export function applyHeroMaterials(root) {
  const cache=new Map();const stats={timber:0,paint:0,glass:0,roof:0,rubber:0};
  root.traverse(object=>{
    if(!object.isMesh)return;
    const vehicle=isUnder(object,'JeepRoot')||isUnder(object,'PlaneRoot');
    const wheel=/JeepWheel/.test(object.parent?.name||'');
    const source=Array.isArray(object.material)?object.material:[object.material];
    const result=source.map(original=>{
      const name=original.name||'';
      const kind=/glazing/i.test(name)?'glass':/jeep paint/i.test(name)?'paint':/cedar/i.test(name)?'timber':/standing seam roof/i.test(name)?'roof':/Rubber and cabin trim/i.test(name)?'rubber':null;
      if(!kind)return original;
      const key=original.uuid+':'+kind+':'+vehicle+':'+wheel;
      if(cache.has(key))return cache.get(key);
      let m;
      if(kind==='glass'){
        // Transmission uses opacity=1: combining both darkened the view through
        // the windows twice and hid the carefully modelled lounge and seats.
        m=new THREE.MeshPhysicalMaterial({name,color:vehicle?0xd0dfdf:0xe5efea,
          roughness:vehicle?.075:.025,metalness:0,transmission:vehicle?.78:.98,
          thickness:vehicle?.035:.045,ior:1.5,opacity:1,transparent:false,
          envMapIntensity:1,side:vehicle?THREE.DoubleSide:THREE.FrontSide});
      }else{
        m=original.clone();
        if(kind==='paint'){
          m.color.set(0x303b36);m.metalness=.58;m.roughness=.24;
          m.clearcoat=.92;m.clearcoatRoughness=.12;m.envMapIntensity=1.15;
        }
        if(kind==='timber'){
          m.color.set(/Fresh/i.test(name)?0xd3ad7e:0xc49d73);
          m.roughness=.77;m.bumpScale=.018;
          if(/Honey cedar/i.test(name))cedarFinish(m);
        }
        if(kind==='roof'){
          m.color.set(0x34413f);m.roughness=.52;m.metalness=.62;
        }
        if(kind==='rubber'){
          m.color.set(wheel?0x252725:0x1b2422);m.roughness=wheel?.94:.67;m.metalness=0;
        }
      }
      stats[kind]++;cache.set(key,m);return m;
    });
    object.material=Array.isArray(object.material)?result:result[0];
    // Standard shadow maps treat transmissive panes as opaque shutters. Let
    // daylight reach the room; frames and mixed-material meshes still cast.
    if(result.every(m=>/glazing/i.test(m.name)))object.castShadow=false;
  });
  // Low-power, inverse-square practicals illuminate the actual interior, rather
  // than making the entire window emissive. No additional shadow-map passes.
  if(!root.getObjectByName('Cabin practical lighting')){
    const lighting=new THREE.Group();lighting.name='Cabin practical lighting';
    for(const [x,y,z,power] of [[20.8,3.35,-12.5,38],[20.8,3.35,-11.1,38],[16.7,3.55,-10.5,48]]){
      const light=new THREE.PointLight(0xffd19a,power,9,2);light.position.set(x,y,z);lighting.add(light);
    }
    root.add(lighting);
  }
  root.userData.heroMaterials=stats;
  return stats;
}
