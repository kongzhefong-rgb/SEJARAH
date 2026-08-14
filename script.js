const PM_DATA = [
  {name:"Tunku Abdul Rahman", image:"assets/tokoh/pm-01.png"},
  {name:"Tun Abdul Razak", image:"assets/tokoh/pm-02.png"},
  {name:"Tun Hussein Onn", image:"assets/tokoh/pm-03.png"},
  {name:"Tun Dr. Mahathir Mohamad", image:"assets/tokoh/pm-04.png"},
  {name:"Tun Abdullah Ahmad Badawi", image:"assets/tokoh/pm-05.png"},
  {name:"Dato’ Sri Najib Razak", image:"assets/tokoh/pm-06.png"},
  {name:"Tan Sri Muhyiddin Yassin", image:"assets/tokoh/pm-07.png"},
  {name:"Dato’ Sri Ismail Sabri Yaakob", image:"assets/tokoh/pm-08.png"},
  {name:"Dato’ Seri Anwar Ibrahim", image:"assets/tokoh/pm-09.png"},
  {name:"Perdana Menteri 10", image:"assets/tokoh/pm-10.png"}
];

const video=document.getElementById("webcam"), canvas=document.getElementById("arCanvas"), ctx=canvas.getContext("2d");
const scoreEl=document.getElementById("score"), statusEl=document.getElementById("status"), start=document.getElementById("start"), win=document.getElementById("win"), toast=document.getElementById("toast");
let W=innerWidth,H=innerHeight, game=false, score=0, handsDetected=false,lastHand=0,mouseDown=false;
let cursor={x:W*.5,y:H*.5,pinch:false,prevPinch:false,grab:null};
let targets=[],names=[],particles=[],images=[];

function resize(){W=innerWidth;H=innerHeight;canvas.width=W*devicePixelRatio;canvas.height=H*devicePixelRatio;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);layout();}
addEventListener('resize',resize);
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function layout(){
  const photoW=clamp(W*.145,130,180), photoH=clamp(H*.30,190,250);
  const leftW=Math.min(W*.72,W-260), gap=clamp(W*.018,12,26);
  const cols=5, rows=2, total=cols*photoW+(cols-1)*gap, startX=Math.max(22,(leftW-total)/2);
  const top=H*.19, bottom=H*.93-photoH;
  targets=PM_DATA.map((pm,i)=>({id:i,x:startX+(i%5)*(photoW+gap),y:i<5?top:bottom,w:photoW,h:photoH,pm,filled:false}));
}

function makeNames(){
  const panelX=Math.min(W*.75,W-250), panelW=W-panelX-18;
  const shuffled=shuffle(PM_DATA.map((p,i)=>({id:i,name:p.name,x:panelX+panelW/2,y:0,w:panelW-20,h:48,r:36,grab:false,placed:false})));
  const top=H*.22, usable=H*.70, gap=Math.min(12,(usable-10*44)/9);
  shuffled.forEach((n,i)=>{n.x=panelX+panelW/2;n.y=top+i*(44+gap)+22;});
  names=shuffled;
}

function reset(){score=0;scoreEl.textContent='0';cursor.grab=null;cursor.pinch=false;cursor.prevPinch=false;particles=[];layout();makeNames();game=true;win.classList.add('hidden');showToast('Gerakkan jari ke nama, kemudian cubit 🤏');}
function showToast(t){toast.textContent=t;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1400)}
function beep(type){try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type='sine';const f=type===true?523:type===false?180:680;o.frequency.value=f;g.gain.value=.045;o.start();o.frequency.linearRampToValueAtTime(type===true?880:type===false?110:900,a.currentTime+.12);o.stop(a.currentTime+.15)}catch(e){}}
function addBurst(x,y){for(let i=0;i<30;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*6;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,a:1})}}

function pointInTarget(n,t){return n.x>t.x&&n.x<t.x+t.w&&n.y>t.y&&n.y<t.y+t.h}
function dropName(n){
  const t=targets[n.id];
  if(pointInTarget(n,t)&&!t.filled){
    t.filled=true;n.placed=true;n.x=t.x+t.w/2;n.y=t.y+t.h-24;score+=10;scoreEl.textContent=score;addBurst(n.x,n.y);beep(true);showToast('✓ Betul! +10 mata');
    if(targets.every(x=>x.filled)){game=false;document.getElementById('finalScore').textContent=score;win.classList.remove('hidden');}
  }else{n.x=clamp(n.homeX, n.w/2+8, W-n.w/2-8);n.y=n.homeY;beep(false);showToast('✕ Nama tidak sepadan, cuba lagi');}
}

function update(){
  const pinchStart=cursor.pinch&&!cursor.prevPinch, pinchEnd=!cursor.pinch&&cursor.prevPinch;
  if(game){
    if(pinchStart&&!cursor.grab){
      let best=null,bestD=Infinity;
      for(const n of names){if(n.placed)continue;const d=Math.hypot(cursor.x-n.x,cursor.y-n.y);if(d<n.r&&d<bestD){best=n;bestD=d}}
      if(best){cursor.grab=best;best.grab=true;beep('grab');showToast('🤏 Nama dipegang');}
    }
    if(cursor.grab&&cursor.pinch){const n=cursor.grab;n.x+=((cursor.x)-n.x)*.72;n.y+=((cursor.y)-n.y)*.72;}
    if(pinchEnd&&cursor.grab){const n=cursor.grab;n.grab=false;dropName(n);cursor.grab=null;}
  }
  cursor.prevPinch=cursor.pinch;
}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function draw(){
  ctx.clearRect(0,0,W,H);
  if(game){
    const panelX=Math.min(W*.75,W-250);
    ctx.save();ctx.fillStyle='rgba(4,18,32,.72)';rr(ctx,panelX-10,H*.16,W-panelX-5,H*.78,24);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.16)';ctx.stroke();
    ctx.fillStyle='#ffd34e';ctx.font='900 16px system-ui';ctx.textAlign='center';ctx.fillText('NAMA TOKOH',panelX+(W-panelX)/2,H*.20);ctx.restore();
    targets.forEach(t=>{
      ctx.save();rr(ctx,t.x,t.y,t.w,t.h,18);ctx.fillStyle=t.filled?'rgba(16,185,129,.55)':'rgba(7,24,41,.80)';ctx.fill();ctx.strokeStyle=t.filled?'#34d399':'rgba(255,255,255,.6)';ctx.lineWidth=3;ctx.stroke();
      const img=images[t.id];if(img?.complete)ctx.drawImage(img,t.x+6,t.y+6,t.w-12,t.h-50);
      ctx.fillStyle=t.filled?'#b7ffd9':'#fff';ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.filled?t.pm.name:'LETakkan NAMA DI SINI',t.x+t.w/2,t.y+t.h-22);ctx.restore();
    });
    names.forEach(n=>{if(n.placed)return;ctx.save();const x=n.x-n.w/2,y=n.y-n.h/2;const g=ctx.createLinearGradient(x,y,x+n.w,y+n.h);g.addColorStop(0,'#0ea5e9');g.addColorStop(1,'#6941d9');rr(ctx,x,y,n.w,n.h,15);ctx.fillStyle=g;ctx.shadowColor=n.grab?'#ffd34e':'#000';ctx.shadowBlur=n.grab?25:10;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=n.grab?'#ffd34e':'rgba(255,255,255,.65)';ctx.lineWidth=n.grab?4:2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.name,n.x,n.y);ctx.restore()});
  }
  particles.forEach((p,i)=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.a-=.025;if(p.a<=0){particles.splice(i,1);return}ctx.globalAlpha=p.a;ctx.fillStyle='#ffd34e';ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;
  ctx.save();ctx.strokeStyle=cursor.pinch?'#34d399':'#facc15';ctx.lineWidth=4;ctx.beginPath();ctx.arc(cursor.x,cursor.y,cursor.pinch?26:18,0,Math.PI*2);ctx.stroke();ctx.fillStyle=cursor.pinch?'#34d399':'#facc15';ctx.beginPath();ctx.arc(cursor.x,cursor.y,5,0,Math.PI*2);ctx.fill();ctx.restore();
  requestAnimationFrame(draw);
}

const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.60,minTrackingConfidence:.60});
hands.onResults(r=>{
  if(r.multiHandLandmarks?.length){
    handsDetected=true;lastHand=Date.now();const lm=r.multiHandLandmarks[0],idx=lm[8],thumb=lm[4],mcp=lm[5],wrist=lm[0];
    const nx=(1-idx.x)*W,ny=idx.y*H;cursor.x+=(nx-cursor.x)*.55;cursor.y+=(ny-cursor.y)*.55;
    // Scale pinch threshold by hand size so it works at different camera distances.
    const handSize=Math.hypot(mcp.x-wrist.x,mcp.y-wrist.y)*W;
    const pinchDistance=Math.hypot(thumb.x-idx.x,thumb.y-idx.y)*W;
    const threshold=clamp(handSize*.75,28,72);
    cursor.pinch=pinchDistance<threshold;
    statusEl.textContent=cursor.pinch?'● PINCH — sedang memegang':'● Tangan dikesan';statusEl.className='status ok';
  }else if(Date.now()-lastHand>700){handsDetected=false;statusEl.textContent='● Mencari tangan...';statusEl.className='status';}
});
const camera=new Camera(video,{onFrame:async()=>{try{await hands.send({image:video})}catch(e){}},width:1280,height:720});

addEventListener('mousemove',e=>{if(!handsDetected){cursor.x=e.clientX;cursor.y=e.clientY}});
addEventListener('mousedown',()=>{if(!handsDetected)cursor.pinch=true});addEventListener('mouseup',()=>{if(!handsDetected)cursor.pinch=false});
addEventListener('touchmove',e=>{if(!handsDetected&&e.touches[0]){cursor.x=e.touches[0].clientX;cursor.y=e.touches[0].clientY}},{passive:true});
addEventListener('touchstart',e=>{if(!handsDetected&&e.touches[0]){cursor.x=e.touches[0].clientX;cursor.y=e.touches[0].clientY;cursor.pinch=true}},{passive:true});
addEventListener('touchend',()=>{if(!handsDetected)cursor.pinch=false});

document.getElementById('startBtn').onclick=async()=>{try{await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});camera.start();start.classList.add('hidden');reset()}catch(e){alert('Sila benarkan akses kamera untuk menggunakan AR.')}};
document.getElementById('restartBtn').onclick=reset;
images=PM_DATA.map(p=>{const i=new Image();i.src=p.image;return i});
resize();draw();
