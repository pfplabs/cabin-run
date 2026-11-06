import * as THREE from 'three';

// A whole spruce crown needs a different silhouette from an individual needle
// spray. Independent seed keeps the existing 9,500 world placements unchanged.
export function createCanopyTexture(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;
 const ctx=canvas.getContext('2d');ctx.lineCap='round';
 let seed=4201;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const line=(x,y,xx,yy,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();};
 line(256,1015,252,20,7,'#615746');
 // Irregular, drooping whorls with visible air between boughs. Layer back
 // branches first, then illuminated tips; avoid a solid triangular fill.
 for(let layer=0;layer<2;layer++)for(let tier=0;tier<34;tier++){
  const t=tier/33,y=30+t*900;
  const radius=(16+195*Math.pow(t,.79))*(1-.23*Math.max(0,(t-.78)/.22));
  for(const side of [-1,1]){
   const reach=radius*(.70+random()*.30),tipY=y+18+random()*30;
   line(254,y,254+side*reach,tipY,3,'#4a4936');
   for(let spray=0;spray<22;spray++){
    const along=spray/22,xx=254+side*reach*along,yy=y+(tipY-y)*along;
    const width=(8+18*(1-along))*(.5+random()*.5);
    const shade=layer===0?38+random()*18:52+random()*26;
    const color=`rgb(${Math.round(shade*.79)},${Math.round(shade*1.20)},${Math.round(shade*.83)})`;
    line(xx,yy,xx+side*(6+random()*19),yy+8+random()*23,width,color);
    if(layer)line(xx,yy-2,xx+side*(5+random()*12),yy+random()*8,Math.max(2,width*.32),'#748466');
   }
  }
 }
 const texture=new THREE.CanvasTexture(canvas);texture.name='Irregular spruce crown with shaded boughs';
 texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=8;
 return texture;
}
