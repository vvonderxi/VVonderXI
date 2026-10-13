#!/usr/bin/env node
/*  EVERY CONTROL THAT IS VISIBLE MUST BE CLICKABLE (2026-10-13).
 *
 *    node scripts/check-controls.js                         every shipping page, 1440x900 and 390x844
 *    node scripts/check-controls.js index.html '[[1366,768]]'  one page, chosen sizes
 *
 *  WHY. On 2026-10-11 c80752c floated the homepage header to save 86px. The theme button and My
 *  Club kept rendering perfectly and stopped responding: `main.hero` sat on top of them at equal
 *  z-index. No check on the platform could see it, because every one of them asks whether a thing
 *  LOOKS right (contrast, overflow, figures, layout) and none asks whether a click on it ARRIVES.
 *
 *  WHAT IT DOES. Serves the repo on a private port, opens each page in headless Chrome, scrolls the
 *  whole length, and for every visible control (links, buttons, inputs, summaries, role=button)
 *  asks the browser what is actually under five points of it (elementFromPoint). A point counts as
 *  COVERED when the element there is neither the control nor inside it. Points the control has
 *  scrolled out of inside its own scrolling panel, disabled controls, and controls under a fixed bar
 *  while the page scrolls are not failures and are skipped. Exits 1 if anything is covered.
 *
 *  CONTROL (re-run when this file changes): copy this script into a checkout of a043e6d^ (the tree
 *  before the fix) and run it on index.html at 1440x900. It must FAIL naming #modeBtn and #burger
 *  covered by main.hero. Measured 2026-10-13: it does, and the fixed tree passes.
 *
 *  WHAT IT CANNOT SEE: a click that arrives and whose handler does nothing (that needs the page's
 *  own state read after a real click, which `scripts/` does per feature); states reached only by
 *  interaction (an open menu, a picked card, a verdict); and real-device quirks. It sees the page
 *  as loaded, at the sizes given, in Chrome.
 */
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os'),{spawn}=require('child_process');
const ROOT=path.join(__dirname,'..');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TY={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
const PAGES=(process.argv[2]||'index.html,rankings.html,card.html?id=130728,compare.html?a=143372&b=141999,compare.html,vvindex.html,playbook.html,iwonder.html,contact.html,preferences.html,myclub.html,privacy.html').split(',');const SIZES=JSON.parse(process.argv[3]||'[[1440,900],[390,844]]');let FAILS=0;
async function cdp(u){const ws=new WebSocket(u);let id=0;const w=new Map();await new Promise((a,b)=>{ws.onopen=a;ws.onerror=b});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&w.has(m.id)){const x=w.get(m.id);w.delete(m.id);m.error?x.rej(new Error(m.error.message)):x.res(m.result)}};const send=(m,p={})=>new Promise((res,rej)=>{const i=++id;w.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:m,params:p}))});const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text+JSON.stringify(r.exceptionDetails.exception&&r.exceptionDetails.exception.description));return r.result.value};return{send,ev}}
// every visible interactive element: is its centre (and 4 inset points) hit by itself or a descendant?
const PROBE=`(function(){var clipped=function(el,x,y){for(var a=el.parentElement;a&&a!==document.body&&a!==document.documentElement;a=a.parentElement){var c=getComputedStyle(a);if(c.overflowX!=='visible'||c.overflowY!=='visible'){var b=a.getBoundingClientRect();if(x<b.left||x>b.right||y<b.top||y>b.bottom)return true}}return false};var fixedOf=function(h){for(var a=h;a&&a.nodeType===1;a=a.parentElement){var p=getComputedStyle(a).position;if(p==='fixed'||p==='sticky')return true}return false};var sel='a[href],button,input,select,textarea,summary,[role=button],[onclick],[tabindex]:not([tabindex="-1"])';
var out=[],seen=0;[...document.querySelectorAll(sel)].forEach(function(el){var cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return;
var r=el.getBoundingClientRect();if(r.width<4||r.height<4)return;if(r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)return;
var o=1,a=el;while(a&&a.nodeType===1){o*=parseFloat(getComputedStyle(a).opacity);a=a.parentElement}if(o<0.05)return;seen++;
var pts=[[.5,.5],[.25,.5],[.75,.5],[.5,.25],[.5,.75]],miss=[];pts.forEach(function(p){var x=r.left+r.width*p[0],y=r.top+r.height*p[1];if(x<0||y<0||x>=innerWidth||y>=innerHeight)return;if(clipped(el,x,y))return;if(cs.pointerEvents==='none'||el.disabled)return;var h=document.elementFromPoint(x,y);if(!h||!(h===el||el.contains(h)||h.contains&&h.closest&&h.closest('label')&&h.closest('label').control===el))miss.push(h&&fixedOf(h)&&!fixedOf(el)?'FIXED':h?(h.tagName.toLowerCase()+(h.id?'#'+h.id:'')+(h.className&&typeof h.className==='string'?'.'+h.className.trim().split(/\\s+/).slice(0,2).join('.'):'')):'null')});
var real=miss.filter(function(m){return m!=='FIXED'});if(real.length)out.push({el:el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\\s+/).slice(0,2).join('.'):''),label:(el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,30),rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],blocked:real.length+'/5',by:[...new Set(real)].join(' , '),pe:cs.pointerEvents})});
return {checked:seen,covered:out}})()`;
(async()=>{const srv=await new Promise(r=>{const v=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';if(!path.extname(p)&&fs.existsSync(ROOT+p+'.html'))p+='.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':TY[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}).listen(0,'127.0.0.1',()=>r(v))});
const prof=fs.mkdtempSync(path.join(os.tmpdir(),'hit-'));const ch=spawn('/usr/bin/google-chrome',['--headless=new','--remote-debugging-port=0','--hide-scrollbars',`--user-data-dir=${prof}`,'about:blank'],{stdio:'ignore'});
try{let dp;for(let i=0;i<100&&!dp;i++){await sleep(100);const f=path.join(prof,'DevToolsActivePort');if(fs.existsSync(f))dp=fs.readFileSync(f,'utf8').split('\n')[0]}
const t=await(await fetch(`http://127.0.0.1:${dp}/json/new?about:blank`,{method:'PUT'})).json();const p=await cdp(t.webSocketDebuggerUrl);await p.send('Page.enable');
for(const pg of PAGES)for(const [W,H] of SIZES){await p.send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:W<=720});
await p.send('Page.navigate',{url:`http://127.0.0.1:${srv.address().port}/${pg}`});await sleep(3500);
const ok=await p.ev(`innerWidth+'x'+innerHeight+' '+document.readyState`);const sh=await p.ev('document.documentElement.scrollHeight');let tot=0;const cov=new Map();
for(let y=0;y<sh;y+=Math.round(H*0.8)){await p.ev(`window.scrollTo(0,${y});1`);await sleep(250);const r=await p.ev(PROBE);tot+=r.checked;r.covered.forEach(c=>{const k=c.el+'|'+c.label;if(!cov.has(k))cov.set(k,Object.assign({atScroll:y},c))})}
FAILS+=cov.size;console.log(`${cov.size?'FAIL':'ok  '}  ${pg} @${W}x${H}  page ${sh}px, ${tot} control readings, ${cov.size} covered`);[...cov.values()].forEach(c=>console.log('   ',JSON.stringify(c)));}}
finally{ch.kill();srv.close()}console.log(FAILS?`\nFAIL , ${FAILS} visible control(s) cannot be clicked.`:'\nOK , every visible control receives its clicks.');process.exit(FAILS?1:0)})().catch(e=>{console.error(e);process.exit(1)});
