import { useState, useRef, useEffect, useCallback } from 'react';
import { NODES, EDGES, ZONES, CORRIDORS, WALLS, BEACONS, FIRE_ZONES } from './data/buildingData';
import { dijkstra, findNearestExit } from './pathfinding';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// ── BLE ───────────────────────────────────────────────────────
let NativeBle = null, nativeBleChecked = false;
async function getNativeBle() {
  if (nativeBleChecked) return NativeBle;
  nativeBleChecked = true;
  try { const m = await import('@capacitor-community/bluetooth-le'); NativeBle = m.BleClient; } catch (e) {}
  return NativeBle;
}

// ── COLORS ───────────────────────────────────────────────────
const NC = { exit:'#e02020', elevator:'#e8a800', stairs:'#d06000', refuge:'#20a840', ramp:'#3090d0', intersection:'#4a6070', door:'#606060' };

// ── VOICE ────────────────────────────────────────────────────
let NativeTTS = null, nativeTTSChecked = false;
async function getNativeTTS() {
  if (nativeTTSChecked) return NativeTTS;
  nativeTTSChecked = true;
  try { const m = await import('@capacitor-community/text-to-speech'); NativeTTS = m.TextToSpeech; } catch (e) {}
  return NativeTTS;
}
getNativeTTS();
let isSpeaking = false; const speakQueue = []; let speakTimeout = null;
function speak(text) { if (speakQueue.length >= 2) speakQueue.shift(); speakQueue.push(text); processQ(); }
function processQ() {
  if (isSpeaking || !speakQueue.length) return;
  isSpeaking = true; const text = speakQueue.shift();
  if (NativeTTS) {
    NativeTTS.speak({ text, lang:'en-US', rate:0.85, volume:1.0 })
      .then(() => { speakTimeout = setTimeout(() => { isSpeaking=false; processQ(); }, 800); })
      .catch(() => { isSpeaking=false; webSpeak(text); speakTimeout=setTimeout(()=>processQ(),800); });
    return;
  }
  webSpeak(text); speakTimeout = setTimeout(()=>{ isSpeaking=false; processQ(); }, Math.max(1500,text.length*80)+800);
}
function stopSpeaking() { speakQueue.length=0; isSpeaking=false; if(speakTimeout){clearTimeout(speakTimeout);speakTimeout=null;} window.speechSynthesis?.cancel(); if(NativeTTS)NativeTTS.stop().catch(()=>{}); }
function webSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.rate=0.95; u.pitch=1.0; u.volume=1.0;
  const vs = window.speechSynthesis.getVoices();
  const v = vs.find(v=>v.lang.startsWith('en')&&v.name.includes('Google'))||vs.find(v=>v.lang.startsWith('en'));
  if(v) u.voice=v; window.speechSynthesis.speak(u);
}

// ── VIBRATION ─────────────────────────────────────────────────
const VIB = { straight:[200], left:[200,350,200], right:[200,350,200,350,200], start:[200,350,200,350,200,350,200], special:[200,350,200,350,200,350,200,350,200], arrive:[800], emergency:[200,80,200,80,200,80,200,80,200,80,500] };
function vibrate(t) { if('vibrate' in navigator) navigator.vibrate(VIB[t]||VIB.straight); }
function vibrateEmergency() { if('vibrate' in navigator) navigator.vibrate([200,80,200,80,200,80,200,80,200,300,200,80,200,80,200,80,200,80,200,300,500,200,500]); }
function stopVibration() { if('vibrate' in navigator) navigator.vibrate(0); }

// ── DIRECTIONS ────────────────────────────────────────────────
function genDirs(path, nodes) {
  if (!path||path.length<2) return [];
  const nm={}; nodes.forEach(n=>{nm[n.id]=n;});
  const dirs=[{text:'Route started. Follow the path.',nodeId:path[0],type:'start'}];
  let last='start';
  for (let i=1;i<path.length;i++) {
    const p=nm[path[i-1]],c=nm[path[i]],nx=i<path.length-1?nm[path[i+1]]:null;
    if(!p||!c) continue;
    const dx=c.x-p.x, dy=c.y-p.y, nt=c.type;
    const sp=nt==='elevator'?'Take the elevator.':nt==='stairs'?'Use the stairwell.':nt==='refuge'?'Proceed to the refuge area.':'';
    if(i===path.length-1){dirs.push({text:nt==='exit'?"You've reached the exit.":nt==='refuge'?"You've reached the refuge area.":`You have arrived at ${c.label||nt}.`,nodeId:path[i],type:'arrive'});continue;}
    if(nx){
      const dx2=nx.x-c.x,dy2=nx.y-c.y,cross=dx*dy2-dy*dx2,dot=dx*dx2+dy*dy2;
      if(Math.abs(cross)<0.5&&dot>0){if(sp){dirs.push({text:sp,nodeId:path[i],type:'special'});last='special';}else if(last==='left'||last==='right'){dirs.push({text:'Keep going straight.',nodeId:path[i],type:'straight'});last='straight';}}
      else if(cross>0.5){dirs.push({text:sp||'Turn left.',nodeId:path[i],type:'left'});last='left';}
      else if(cross<-0.5){dirs.push({text:sp||'Turn right.',nodeId:path[i],type:'right'});last='right';}
      else if(sp){dirs.push({text:sp,nodeId:path[i],type:'special'});last='special';}
    }
  }
  return dirs;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function MapView3D({ profile, mode='navigate', onLocationUpdate }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const viewRef = useRef({ offsetX:30, offsetY:30, scale:1.4 });
  const [tick, setTick] = useState(0);
  const redraw = () => setTick(t=>t+1);

  const isDrag = useRef(false);
  const drag0 = useRef({ x:0, y:0, ox:0, oy:0, moved:false });

  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [currentPath, setCurrentPath] = useState(null);
  const [pathInfo, setPathInfo] = useState(null);
  const [directions, setDirections] = useState([]);
  const [step, setStep] = useState(0);
  const [voice, setVoice] = useState(true);
  const [vib, setVib] = useState(profile?.disabilities?.hearingImpaired||false);
  const [showNodes, setShowNodes] = useState(true);
  const [emergency, setEmergency] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [bleOn, setBleOn] = useState(false);
  const [bleMsg, setBleMsg] = useState('');
  const [beaconNode, setBeaconNode] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [showVibGuide, setShowVibGuide] = useState(false);

  const wc = profile?.disabilities?.wheelchair||false;
  const hearing = profile?.disabilities?.hearingImpaired||false;

  const beaconRSSI = useRef({});
  const beaconSmooth = useRef({});
  const beaconRef = useRef(null);
  const adCount = useRef(0);
  const abortRef = useRef(null);
  const listenerRef = useRef(null);
  const lastSpeakT = useRef(0);
  const dotPos = useRef(null);

  // ── FIT ON MOUNT ────────────────────────────────────────
  useEffect(()=>{
    const fit=()=>{
      const c=containerRef.current; if(!c) return;
      const W=c.clientWidth, H=c.clientHeight;
      const scale=Math.min((W-40)/200,(H-40)/470);
      viewRef.current={offsetX:(W-scale*160)/2, offsetY:(H-scale*470)/2+scale*24, scale};
      redraw();
    };
    fit(); window.addEventListener('resize',fit); return()=>window.removeEventListener('resize',fit);
  },[]);

  // ── COORD HELPERS ──────────────────────────────────────
  const w2s=(wx,wy)=>{ const{offsetX,offsetY,scale}=viewRef.current; return{x:wx*scale+offsetX,y:wy*scale+offsetY}; };
  const s2w=(sx,sy)=>{ const{offsetX,offsetY,scale}=viewRef.current; return{x:(sx-offsetX)/scale,y:(sy-offsetY)/scale}; };

  // ── PATH ───────────────────────────────────────────────
  useEffect(()=>{
    if(mode==='view'||!selectedStart){setCurrentPath(null);setPathInfo(null);setDirections([]);setStep(0);return;}
    if(!selectedEnd) return;
    const res=dijkstra(selectedStart,selectedEnd,NODES,EDGES,wc,blocked);
    if(res){
      setCurrentPath(res.path);
      const t=NODES.find(n=>n.id===selectedEnd);
      setPathInfo({distance:res.distance.toFixed(1),destination:t?.label||selectedEnd});
      const d=genDirs(res.path,NODES); setDirections(d); setStep(0);
      if(voice&&d.length>0) setTimeout(()=>speak(d[0].text),300);
      if(vib&&d.length>0) setTimeout(()=>vibrate(d[0].type),300);
    } else {
      setCurrentPath(null); setPathInfo({error:wc?'No accessible path.':'No path available.'}); setDirections([]); setStep(0);
      if(voice) speak('No path available.');
    }
  },[selectedStart,selectedEnd,wc,mode,blocked]);

  // ── BEACON AUTO-ADVANCE ────────────────────────────────
  useEffect(()=>{
    if(!beaconNode||!directions.length) return;
    const now=Date.now(), cool=now-lastSpeakT.current>6000;
    for(let i=step+1;i<directions.length;i++){
      if(directions[i].nodeId===beaconNode){
        setStep(i); const t=directions[i].type;
        if(cool&&(t==='left'||t==='right'||t==='arrive'||t==='special')){ if(voice)speak(directions[i].text); if(vib)vibrate(t); lastSpeakT.current=now; } break;
      }
    }
  },[beaconNode]);

  // ── FIREBASE FIRE ──────────────────────────────────────
  useEffect(()=>{
    if(!db) return;
    try{
      const unsub=onSnapshot(doc(db,'fire_alerts','active'),snap=>{
        if(!snap.exists()) return;
        const d=snap.data();
        if(d.active&&d.zone&&!emergency){ const z=FIRE_ZONES?.[d.zone]; const fb=z?.blockedEdges||[]; setBlocked(fb); setEmergency(true); if(selectedStart){ const r=findNearestExit(selectedStart,NODES,EDGES,wc,fb); if(r){setCurrentPath(r.path);const t=NODES.find(n=>n.id===r.targetId);setPathInfo({distance:r.distance.toFixed(1),destination:t?.label||r.targetId});const dirs=genDirs(r.path,NODES);setDirections(dirs);setStep(0);if(voice)speak('Fire detected! Follow the path to safety.');}}}
        if(!d.active&&emergency) setEmergency(false);
      }); return()=>unsub();
    }catch(e){}
  },[emergency,selectedStart,voice,wc]);

  // ── DRAW ───────────────────────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current, cont=containerRef.current;
    if(!canvas||!cont) return;
    canvas.width=cont.clientWidth; canvas.height=cont.clientHeight;
    const ctx=canvas.getContext('2d');
    const sc=viewRef.current.scale;
    const S=v=>v*sc;

    // Background
    ctx.fillStyle='#0e1118'; ctx.fillRect(0,0,canvas.width,canvas.height);

    // Corridors
    ctx.fillStyle='rgba(220,210,150,0.2)';
    for(const c of CORRIDORS){ const p=w2s(c.x,c.y); ctx.fillRect(p.x,p.y,S(c.w),S(c.h)); }

    // Rooms
    for(const z of ZONES){
      const p=w2s(z.x,z.y);
      ctx.globalAlpha=0.55; ctx.fillStyle=z.color; ctx.fillRect(p.x,p.y,S(z.w),S(z.h));
      ctx.globalAlpha=0.6; ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.strokeRect(p.x,p.y,S(z.w),S(z.h));
      ctx.globalAlpha=1;
      if(sc>0.55){
        const cx=w2s(z.x+z.w/2,z.y+z.h/2);
        ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.font=`bold ${Math.max(6,Math.min(11,S(5.5)))}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        const words=z.name.split(' ');
        if(words.length>2&&S(z.w)<65){ const m=Math.ceil(words.length/2); ctx.fillText(words.slice(0,m).join(' '),cx.x,cx.y-S(3)); ctx.fillText(words.slice(m).join(' '),cx.x,cx.y+S(3)); }
        else ctx.fillText(z.name,cx.x,cx.y);
      }
    }

    // Walls
    ctx.strokeStyle='#b0bac8'; ctx.lineWidth=Math.max(1.5,S(0.55)); ctx.lineCap='square';
    for(const w of WALLS){ const p1=w2s(w.x1,w.y1),p2=w2s(w.x2,w.y2); ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); }

    // Edges
    if(showNodes){
      for(const e of EDGES){
        const n1=NODES.find(n=>n.id===e.from),n2=NODES.find(n=>n.id===e.to); if(!n1||!n2) continue;
        const isBlk=blocked.some(b=>(b.from===e.from&&b.to===e.to)||(b.from===e.to&&b.to===e.from));
        const p1=w2s(n1.x,n1.y),p2=w2s(n2.x,n2.y);
        if(isBlk){ctx.strokeStyle='#ff3030';ctx.lineWidth=2;ctx.setLineDash([5,3]);}
        else if(!e.accessible){ctx.strokeStyle='rgba(200,120,50,0.22)';ctx.lineWidth=1;ctx.setLineDash([4,4]);}
        else{ctx.strokeStyle='rgba(90,150,210,0.2)';ctx.lineWidth=1;ctx.setLineDash([]);}
        ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // Route path
    if(currentPath&&currentPath.length>1){
      const pts=currentPath.map(id=>{const n=NODES.find(x=>x.id===id);return n?w2s(n.x,n.y):null;}).filter(Boolean);
      ctx.strokeStyle='rgba(60,150,255,0.22)'; ctx.lineWidth=Math.max(9,S(4.5)); ctx.lineCap='round'; ctx.lineJoin='round';
      ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
      ctx.strokeStyle='#3388ff'; ctx.lineWidth=Math.max(3,S(2));
      ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)); ctx.stroke();
    }

    // Fire markers
    for(const b of blocked){ const n1=NODES.find(n=>n.id===b.from),n2=NODES.find(n=>n.id===b.to); if(!n1||!n2) continue; const m=w2s((n1.x+n2.x)/2,(n1.y+n2.y)/2); ctx.font=`${Math.max(12,S(7))}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🔥',m.x,m.y); }

    // Nodes
    if(showNodes){
      for(const node of NODES){
        const p=w2s(node.x,node.y);
        const sm=node.type==='intersection'||node.type==='door';
        const r=sm?Math.max(2,S(1.6)):Math.max(4.5,S(3));
        const isSt=node.id===selectedStart,isEn=node.id===selectedEnd,isHov=node.id===hovered,isPath=currentPath?.includes(node.id);
        ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
        if(isSt){ctx.fillStyle='#00e060';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
        else if(isEn){ctx.fillStyle='#ff4040';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
        else if(isPath){ctx.fillStyle='#5599ff';ctx.fill();}
        else{ctx.fillStyle=NC[node.type]||'#888';ctx.globalAlpha=isHov?1:0.75;ctx.fill();ctx.globalAlpha=1;if(isHov){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}}
        if(node.label&&sc>1.0){ const lp=w2s(node.x,node.y); ctx.fillStyle='#ddd'; ctx.font=`${Math.max(7,S(4))}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText(node.label,lp.x,lp.y-r-1); }
      }
    }

    // YOU / DEST
    if(selectedStart){ const n=NODES.find(x=>x.id===selectedStart); if(n){const p=w2s(n.x,n.y);ctx.fillStyle='#00e060';ctx.font=`bold ${Math.max(9,S(5))}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('YOU',p.x,p.y-Math.max(5,S(3))-2);}}
    if(selectedEnd&&!emergency){ const n=NODES.find(x=>x.id===selectedEnd); if(n){const p=w2s(n.x,n.y);ctx.fillStyle='#ff6060';ctx.font=`bold ${Math.max(9,S(5))}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('DEST',p.x,p.y-Math.max(5,S(3))-2);}}

    // Blue dot (BLE)
    if(dotPos.current){ const dp=w2s(dotPos.current.x,dotPos.current.y); ctx.beginPath();ctx.arc(dp.x,dp.y,Math.max(9,S(5)),0,Math.PI*2);ctx.fillStyle='rgba(50,160,255,0.15)';ctx.fill(); ctx.beginPath();ctx.arc(dp.x,dp.y,Math.max(5,S(2.8)),0,Math.PI*2);ctx.fillStyle='#2288ff';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke(); }

    // Exit signs
    for(const node of NODES.filter(n=>n.type==='exit')){ const p=w2s(node.x,node.y); ctx.fillStyle='#00cc44';ctx.font=`bold ${Math.max(8,S(4.5))}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('🚪EXIT',p.x,p.y+Math.max(4,S(2.5))+1); }

    // Floor label
    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='10px sans-serif';ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText('Ground Floor',8,canvas.height-5);
  },[tick,showNodes,currentPath,selectedStart,selectedEnd,hovered,blocked,emergency,mode]);

  // ── POINTER ───────────────────────────────────────────
  const hitNode=(sx,sy)=>{ const w=s2w(sx,sy),th=8/viewRef.current.scale; let best=null,bd=Infinity; for(const n of NODES){const d=Math.hypot(n.x-w.x,n.y-w.y);if(d<th&&d<bd){best=n;bd=d;}} return best; };

  const onDown=(e)=>{ const{clientX:x,clientY:y}=e.touches?e.touches[0]:e; isDrag.current=true; drag0.current={x,y,ox:viewRef.current.offsetX,oy:viewRef.current.offsetY,moved:false}; };
  const onMove=(e)=>{
    const{clientX:x,clientY:y}=e.touches?e.touches[0]:e;
    if(isDrag.current){ const dx=x-drag0.current.x,dy=y-drag0.current.y; if(Math.abs(dx)>3||Math.abs(dy)>3) drag0.current.moved=true; viewRef.current.offsetX=drag0.current.ox+dx; viewRef.current.offsetY=drag0.current.oy+dy; redraw(); }
    else{ const rect=canvasRef.current.getBoundingClientRect(); const n=hitNode(x-rect.left,y-rect.top); setHovered(n?.id||null); }
  };
  const onUp=(e)=>{
    if(!isDrag.current) return; isDrag.current=false;
    if(!drag0.current.moved&&mode==='navigate'){
      const{clientX:x,clientY:y}=e.changedTouches?e.changedTouches[0]:e;
      const rect=canvasRef.current.getBoundingClientRect(); const node=hitNode(x-rect.left,y-rect.top);
      if(node){
        if(!selectedStart){setSelectedStart(node.id);if(onLocationUpdate)onLocationUpdate(node.id);if(voice)speak('Starting point set.');}
        else if(!selectedEnd){if(node.id!==selectedStart)setSelectedEnd(node.id);}
        else{setSelectedStart(node.id);if(onLocationUpdate)onLocationUpdate(node.id);setSelectedEnd(null);setCurrentPath(null);setPathInfo(null);setDirections([]);setStep(0);if(voice)speak('New starting point set.');}
      }
    }
  };
  const onWheel=(e)=>{ e.preventDefault(); const rect=canvasRef.current.getBoundingClientRect(); const mx=e.clientX-rect.left,my=e.clientY-rect.top; const f=e.deltaY<0?1.12:0.88; const ns=Math.max(0.3,Math.min(8,viewRef.current.scale*f)); viewRef.current.offsetX=mx-(mx-viewRef.current.offsetX)*(ns/viewRef.current.scale); viewRef.current.offsetY=my-(my-viewRef.current.offsetY)*(ns/viewRef.current.scale); viewRef.current.scale=ns; redraw(); };
  const pinch=useRef(null);
  const onTouchMove=(e)=>{ e.preventDefault(); if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinch.current){const ns=Math.max(0.3,Math.min(8,viewRef.current.scale*(d/pinch.current)));viewRef.current.scale=ns;redraw();}pinch.current=d;}else{pinch.current=null;onMove(e);}};
  const onTouchEnd=(e)=>{pinch.current=null;onUp(e);};

  // ── STEP CONTROLS ────────────────────────────────────
  const nextStep=()=>{ if(step<directions.length-1){const n=step+1;setStep(n);if(voice)speak(directions[n].text);if(vib)vibrate(directions[n].type);const nd=NODES.find(x=>x.id===directions[n].nodeId);if(nd){dotPos.current={x:nd.x,y:nd.y};redraw();}}};
  const prevStep=()=>{ if(step>0){const n=step-1;setStep(n);if(voice)speak(directions[n].text);if(vib)vibrate(directions[n].type);const nd=NODES.find(x=>x.id===directions[n].nodeId);if(nd){dotPos.current={x:nd.x,y:nd.y};redraw();}}};

  // ── BLE ──────────────────────────────────────────────
  const BSEGS=[{from:'BEACON_1',to:'BEACON_3',wp:[{x:58,y:5},{x:96,y:5},{x:122,y:28},{x:122,y:90},{x:122,y:159}]},{from:'BEACON_3',to:'BEACON_2',wp:[{x:122,y:159},{x:122,y:220},{x:122,y:266},{x:86,y:266},{x:58,y:266}]}];
  const BORD=['BEACON_1','BEACON_3','BEACON_2'];
  const smRSSI=(id,r)=>{ const p=beaconSmooth.current[id]; if(p===undefined){beaconSmooth.current[id]=r;return r;} const a=(Math.abs(r-p)>12||r>-55)?0.4:0.25; beaconSmooth.current[id]=a*r+(1-a)*p; return beaconSmooth.current[id]; };
  const segPos=(seg,ratio)=>{ const r=Math.max(0,Math.min(1,ratio)),wp=seg.wp; const pos=r*(wp.length-1),idx=Math.min(Math.floor(pos),wp.length-2),frac=pos-idx; return{x:wp[idx].x+(wp[idx+1].x-wp[idx].x)*frac,y:wp[idx].y+(wp[idx+1].y-wp[idx].y)*frac}; };

  const updateDot=useCallback(()=>{
    const now=Date.now();
    const active=BORD.map(id=>{const d=beaconRSSI.current[id];return d&&now-d.timestamp<12000?{id,rssi:beaconSmooth.current[id]||d.rssi,nodeId:d.nodeId}:null;}).filter(Boolean).sort((a,b)=>b.rssi-a.rssi);
    if(!active.length) return;
    let pos;
    if(active.length===1){const n=NODES.find(x=>x.id===active[0].nodeId);if(n)pos={x:n.x,y:n.y};}
    else{const b1=active[0],b2=active[1];const seg=BSEGS.find(s=>(s.from===b1.id&&s.to===b2.id)||(s.from===b2.id&&s.to===b1.id));if(seg){const fr=seg.from===b1.id?b1:b2,to=seg.from===b1.id?b2:b1;pos=segPos(seg,Math.max(0,Math.min(1,0.5+(to.rssi-fr.rssi)/50)));}else{const n=NODES.find(x=>x.id===b1.nodeId);if(n)pos={x:n.x,y:n.y};}}
    if(pos){dotPos.current=pos;redraw();const nr=active[0];if(nr.nodeId!==beaconRef.current){beaconRef.current=nr.nodeId;setBeaconNode(nr.nodeId);if(!selectedStart&&onLocationUpdate)onLocationUpdate(nr.nodeId);}}
  },[selectedStart,onLocationUpdate]);

  const parseBeacon=(bytes,rssi)=>{
    if(!bytes||bytes.length<22) return;
    for(let i=0;i<=Math.min(bytes.length-22,10);i++){
      if(bytes[i]===0x02&&bytes[i+1]===0x15&&i+22<=bytes.length){
        const major=(bytes[i+18]<<8)|bytes[i+19],minor=(bytes[i+20]<<8)|bytes[i+21];
        const b=BEACONS.find(b=>b.minor===minor&&b.major===major);
        if(b){const sm=smRSSI(b.id,rssi);beaconRSSI.current[b.id]={rssi,smoothed:sm,nodeId:b.nodeId,label:b.label,timestamp:Date.now()};setBleMsg(`${b.label}: ${rssi}`);updateDot();}
        break;
      }
    }
  };

  const startScan=useCallback(async()=>{
    if(bleOn){stopScan();return;}
    try{
      setBleMsg('Starting...');
      const nb=await getNativeBle();
      if(nb){
        await nb.initialize({androidNeverForLocation:false}); try{await nb.requestPermissions();}catch(e){}
        await nb.requestLEScan({allowDuplicates:true,scanMode:2},result=>{
          adCount.current++;
          if(result.manufacturerData){for(const[,dv] of Object.entries(result.manufacturerData)){let bytes;try{if(dv instanceof DataView)bytes=new Uint8Array(dv.buffer,dv.byteOffset,dv.byteLength);else if(dv instanceof ArrayBuffer)bytes=new Uint8Array(dv);else if(typeof dv==='string'){const b=atob(dv);bytes=new Uint8Array(b.length).map((_,i)=>b.charCodeAt(i));}else if(dv?.buffer)bytes=new Uint8Array(dv.buffer);}catch(e){continue;}parseBeacon(bytes,result.rssi);}}
        });
        setBleOn(true);setBleMsg('Scanning...');speak('Scanning started.');return;
      }
      if(!navigator.bluetooth){setBleMsg('Bluetooth unavailable.');return;}
      if(navigator.bluetooth.requestLEScan){
        const ac=new AbortController();abortRef.current=ac;
        await navigator.bluetooth.requestLEScan({acceptAllAdvertisements:true,signal:ac.signal});
        const listener=(e)=>{ if(!e.manufacturerData) return; for(const[,dv] of e.manufacturerData){const bytes=new Uint8Array(dv.buffer,dv.byteOffset,dv.byteLength);parseBeacon(bytes,e.rssi);}};
        listenerRef.current=listener; navigator.bluetooth.addEventListener('advertisementreceived',listener);
        setBleOn(true);setBleMsg('Scanning...');speak('Scanning started.');
      } else setBleMsg('Enable Web Bluetooth in chrome://flags');
    }catch(err){setBleMsg('Error: '+(err?.message||err));setBleOn(false);}
  },[bleOn,updateDot]);

  const stopScan=useCallback(async()=>{
    try{const nb=await getNativeBle();if(nb)await nb.stopLEScan().catch(()=>{});}catch(e){}
    if(abortRef.current){abortRef.current.abort();abortRef.current=null;}
    if(listenerRef.current){navigator.bluetooth?.removeEventListener('advertisementreceived',listenerRef.current);listenerRef.current=null;}
    beaconRSSI.current={};beaconSmooth.current={};adCount.current=0;dotPos.current=null;
    setBleOn(false);setBeaconNode(null);setBleMsg('');speak('Scanning stopped.');redraw();
  },[]);

  const clearAll=()=>{setBlocked([]);setEmergency(false);setSelectedStart(null);setSelectedEnd(null);setCurrentPath(null);setPathInfo(null);setDirections([]);setStep(0);stopSpeaking();stopVibration();};

  const dir=directions[step];
  const dIcon=dir?.type==='left'?'⬅️':dir?.type==='right'?'➡️':dir?.type==='arrive'?'🏁':dir?.type==='start'?'📍':dir?.type==='special'?'⚡':'⬆️';

  const bS=(bg)=>({background:bg,color:'#fff',border:'none',borderRadius:20,padding:'5px 11px',fontSize:'0.72rem',cursor:'pointer'});
  const pB=(on)=>({background:on?'#1a73e8':'#333',color:'#fff',border:'none',borderRadius:12,padding:'3px 9px',fontSize:'0.7rem',cursor:'pointer'});
  const sB=(ok)=>({padding:'7px 16px',background:ok?'#2a3a5a':'#1a1d24',border:`1px solid ${ok?'#3b82f6':'#333'}`,color:ok?'#7bb8ff':'#444',borderRadius:8,cursor:ok?'pointer':'default',fontSize:'0.8rem',fontWeight:600});

  return(
    <div style={{position:'relative',display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>

      {/* NAV BAR */}
      {mode==='navigate'&&(
        <div style={{background:'linear-gradient(135deg,#1a73e8,#4fc3f7)',padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,boxShadow:'0 2px 10px rgba(0,0,0,0.3)'}}>
          <div style={{flex:1}}>
            {dir?(<div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:'1.4rem'}}>{dIcon}</span><div><div style={{color:'#fff',fontWeight:'bold',fontSize:'0.88rem'}}>{dir.text}</div>{pathInfo&&<div style={{color:'rgba(255,255,255,0.7)',fontSize:'0.68rem'}}>→ {pathInfo.destination} • {pathInfo.distance}m</div>}</div></div>)
            :(<div style={{color:'rgba(255,255,255,0.85)',fontSize:'0.8rem'}}>{bleOn?(beaconNode?'Tap destination':'📡 Scanning...'):'Tap a node to set your location'}</div>)}
          </div>
          <div style={{display:'flex',gap:6}}>
            {!bleOn?<button onClick={startScan} style={bS('rgba(255,255,255,0.2)')}>📡 Scan</button>:<button onClick={stopScan} style={bS('rgba(255,255,255,0.3)')}>■ Stop</button>}
            <button onClick={()=>{if(!selectedStart)return;const r=findNearestExit(selectedStart,NODES,EDGES,wc,blocked);if(r){setCurrentPath(r.path);const t=NODES.find(n=>n.id===r.targetId);setPathInfo({distance:r.distance.toFixed(1),destination:t?.label||r.targetId});const d=genDirs(r.path,NODES);setDirections(d);setStep(0);if(voice)speak('Evacuating. Follow the blue path.');}}} style={bS('rgba(200,40,40,0.85)')}>🚨 Exit</button>
            <button onClick={clearAll} style={bS('rgba(255,255,255,0.15)')}>↺</button>
          </div>
        </div>
      )}

      {mode==='view'&&(<div style={{background:'linear-gradient(135deg,#2c3e50,#34495e)',padding:'10px',textAlign:'center',color:'#fff',fontSize:'0.9rem',flexShrink:0}}>🏢 Building Overview</div>)}

      {emergency&&(<div style={{padding:'7px',background:'linear-gradient(90deg,#cc2020,#ff4040,#cc2020)',color:'#fff',textAlign:'center',fontWeight:'bold',fontSize:'0.82rem',flexShrink:0}}>🚨 FIRE DETECTED — EVACUATE NOW 🚨</div>)}
      {pathInfo?.error&&(<div style={{padding:'6px 14px',background:'rgba(200,30,30,0.9)',color:'#fff',fontSize:'0.78rem',textAlign:'center',flexShrink:0}}>❌ {pathInfo.error}</div>)}

      {mode==='navigate'&&(
        <div style={{display:'flex',gap:6,padding:'5px 10px',background:'rgba(10,12,18,0.92)',flexWrap:'wrap',flexShrink:0,alignItems:'center'}}>
          {wc&&<span style={{background:'#1a73e8',color:'#fff',borderRadius:12,padding:'3px 9px',fontSize:'0.7rem'}}>♿ Wheelchair</span>}
          <button onClick={()=>setShowNodes(s=>!s)} style={pB(showNodes)}>📍 Nodes</button>
          <button onClick={()=>setVoice(s=>!s)} style={pB(voice)}>{voice?'🔊':'🔇'} Voice</button>
          <button onClick={()=>setVib(s=>!s)} style={pB(vib)}>{vib?'📳':'📴'} Vibration</button>
          {hearing&&<button onClick={()=>setShowVibGuide(true)} style={pB(false)}>❓ Guide</button>}
          {bleMsg&&<span style={{fontSize:'0.62rem',color:'#7bb8ff',marginLeft:'auto'}}>{bleMsg}</span>}
        </div>
      )}

      {/* CANVAS */}
      <div ref={containerRef} style={{flex:1,position:'relative',overflow:'hidden',cursor:hovered?'pointer':'grab'}}>
        <canvas ref={canvasRef} style={{display:'block',width:'100%',height:'100%',touchAction:'none'}}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={()=>{isDrag.current=false;setHovered(null);}}
          onWheel={onWheel} onTouchStart={onDown} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}/>
      </div>

      {/* STEP CONTROLS */}
      {directions.length>0&&mode==='navigate'&&(
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#1a1d24',borderTop:'1px solid #2a2d36',flexShrink:0}}>
          <button onClick={prevStep} disabled={step===0} style={sB(step>0)}>◀ Prev</button>
          <span style={{color:'#6b7280',fontSize:'0.72rem',flex:1,textAlign:'center'}}>{step+1} / {directions.length}</span>
          <button onClick={nextStep} disabled={step===directions.length-1} style={sB(step<directions.length-1)}>Next ▶</button>
        </div>
      )}

      {/* LEGEND */}
      <div style={{display:'flex',gap:10,padding:'4px 12px',background:'#1a1d24',borderTop:'1px solid #2a2d36',flexShrink:0,flexWrap:'wrap',fontSize:'0.63rem'}}>
        {[['#e02020','Exit'],['#e8a800','Elevator'],['#d06000','Stairs'],['#20a840','Refuge'],['#2288ff','You'],['#3388ff','Path']].map(([c,l])=>(
          <span key={l} style={{display:'flex',alignItems:'center',gap:4,color:'#8892a4'}}><span style={{width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>{l}</span>
        ))}
      </div>

      {/* VIB GUIDE MODAL */}
      {showVibGuide&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}} onClick={()=>setShowVibGuide(false)}>
          <div style={{background:'#1a1d24',borderRadius:16,padding:24,maxWidth:400,width:'100%',maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h3 style={{color:'#fff',margin:0}}>📳 Vibration Guide</h3><button onClick={()=>setShowVibGuide(false)} style={{background:'none',border:'none',color:'#aaa',fontSize:'1.2rem',cursor:'pointer'}}>✕</button></div>
            {[['⬆️','Straight','1 buzz','straight'],['⬅️','Turn Left','2 buzzes','left'],['➡️','Turn Right','3 buzzes','right'],['📍','Route Start','4 buzzes','start'],['⚡','Elevator/Stairs','5 buzzes','special'],['🏁','Arrived','1 long buzz','arrive'],['🔥','Emergency','Rapid pulses','emergency']].map(([icon,label,desc,type])=>(
              <div key={type} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #2a2d36'}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}><span style={{fontSize:'1.3rem'}}>{icon}</span><div><div style={{color:'#fff',fontSize:'0.88rem'}}>{label}</div><div style={{color:'#6b7280',fontSize:'0.72rem'}}>{desc}</div></div></div>
                <button onClick={()=>{type==='emergency'?vibrateEmergency():vibrate(type);speak(label);}} style={{background:'#2a3a5a',border:'1px solid #3b82f6',color:'#7bb8ff',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:'0.75rem'}}>▶ Test</button>
              </div>
            ))}
            <button onClick={()=>setShowVibGuide(false)} style={{marginTop:16,width:'100%',padding:10,background:'#282c36',border:'1px solid #333',color:'#aaa',borderRadius:10,cursor:'pointer'}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
