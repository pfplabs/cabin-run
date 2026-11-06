/** Optional capture helper for a WebGL-capable desktop. Records the real browser frames.
 * Install Playwright separately, then: node scripts/record-gameplay.mjs
 * Start the static server first. OUTPUT and GAME_URL are optional environment vars.
 */
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import('playwright').catch(()=>{throw new Error('Capture only: install Playwright with npm install --no-save playwright, then run this on a desktop with Chrome and WebGL 2.');});
const out=path.resolve(process.env.OUTPUT||'artifacts/gameplay');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:false});
const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.GAME_URL||'http://localhost:4173/?qa=1');
await page.waitForFunction(()=>window.__CABIN_READY__===true,null,{timeout:45000});
await page.waitForTimeout(2000);await page.screenshot({path:path.join(out,'01-lake-intro.png')});
await page.locator('#start').click();
// An input-following demonstration, not a fake animation or substituted render.
const route=await page.evaluate(()=>{const s=cabinQA.state,p=[];for(let a=Math.atan2(s.x,62-s.z)+.08;a<-.24;a+=.08)p.push({x:94*Math.sin(a),z:62-94*Math.cos(a)});p.push({x:-22,z:-29},{x:-23,z:-19},{x:-16,z:-9});return p;});
let waypoint=0;const deadline=Date.now()+90000;
while(waypoint<route.length&&Date.now()<deadline){
 const result=await page.evaluate(p=>{const s=cabinQA.state;if(s.status!=='running')throw new Error('Capture lost focus and paused. Keep the browser active.');const d=Math.hypot(p.x-s.x,p.z-s.z),target=Math.atan2(p.x-s.x,s.z-p.z),error=Math.atan2(Math.sin(target-s.heading),Math.cos(target-s.heading));cabinQA.input.clear();if(s.speed<9)cabinQA.input.add('up');if(error<-.035)cabinQA.input.add('left');if(error>.035)cabinQA.input.add('right');return d;},route[waypoint]);
 if(result<2.5)waypoint++;await page.waitForTimeout(50);
}
await page.evaluate(()=>cabinQA.input.clear());if(waypoint<route.length)throw new Error('Road sequence did not reach the cabin. Inspect recorded gameplay instead of claiming success.');
await page.keyboard.press('Space');await page.screenshot({path:path.join(out,'02-jeep-at-cabin.png')});await page.waitForTimeout(1500);
await page.keyboard.press('v');const flightDeadline=Date.now()+20000;
while(Date.now()<flightDeadline){
 const ready=await page.evaluate(()=>{const s=cabinQA.state,p={x:-25,z:16},target=Math.atan2(p.x-s.x,s.z-p.z),error=Math.atan2(Math.sin(target-s.heading),Math.cos(target-s.heading));cabinQA.input.clear();if(error<-.015)cabinQA.input.add('left');if(error>.015)cabinQA.input.add('right');return s.actionReady;});
 if(ready)break;await page.waitForTimeout(50);
}
await page.evaluate(()=>cabinQA.input.clear());await page.screenshot({path:path.join(out,'03-plane-approach.png')});await page.keyboard.press('Space');
if(!(await page.evaluate(()=>cabinQA.state.parked)))throw new Error('Floatplane was not successfully moored.');
await page.keyboard.press('c');await page.keyboard.press('c');await page.waitForTimeout(3000);await page.screenshot({path:path.join(out,'04-home-at-the-dock.png')});
const diagnostics=await page.evaluate(()=>cabinDiagnostics());const video=page.video();await context.close();await video.saveAs(path.join(out,'northbound-real-gameplay.webm'));await browser.close();
console.log(JSON.stringify({output:out,errors,diagnostics,note:'Genuine browser gameplay driven by scripted controls. No frames replaced with Blender or generated renders.'},null,2));
if(errors.length)process.exitCode=1;
