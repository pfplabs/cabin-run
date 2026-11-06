/** Full-frame totals include reflections/transmission. CPU timing is not GPU time. */
export function createFrameMetrics(renderer,{capacity=180,now=()=>performance.now()}={}){
 if(!Number.isInteger(capacity)||capacity<1)throw new RangeError('Invalid capacity');
 const samples=[];let started=0,lastRAF=null;const originalAutoReset=renderer.info.autoReset;renderer.info.autoReset=false;
 function begin(t){renderer.info.reset();started=now();const delta=lastRAF===null?null:t-lastRAF;lastRAF=t;return delta;}
 function end(frameMs){const sample={frameMs,submissionMs:now()-started,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};if(Number.isFinite(frameMs)&&frameMs>0&&frameMs<1000){samples.push(sample);if(samples.length>capacity)samples.shift();}return sample;}
 function snapshot(){const sorted=samples.map(s=>s.frameMs).sort((a,b)=>a-b),mean=k=>samples.length?samples.reduce((sum,s)=>sum+s[k],0)/samples.length:null,avg=mean('frameMs');return {sampleCount:samples.length,averageFrameMs:avg,estimatedFPS:avg?1000/avg:null,p95FrameMs:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:null,averageSubmissionMs:mean('submissionMs'),averageCPUFrameMs:mean('submissionMs'),averageCalls:mean('calls'),averageTriangles:mean('triangles'),textures:renderer.info.memory?.textures??null,programs:renderer.info.programs?.length??null,gpuTimeMs:null,timingNote:'RAF cadence and CPU frame work including render submission; not GPU execution time'};}
 function reset(){samples.length=0;lastRAF=null;}
 return {begin,end,snapshot,reset,dispose(){renderer.info.autoReset=originalAutoReset;}};
}
