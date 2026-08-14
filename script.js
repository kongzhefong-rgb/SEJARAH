const PM_DATA = [
  {name:"东姑阿都拉曼", term:"第一任首相", label:"第一任首相\n东姑阿都拉曼", image:"assets/tokoh/pm-01.png"},
  {name:"敦阿都拉萨", term:"第二任首相", label:"第二任首相\n敦阿都拉萨", image:"assets/tokoh/pm-02.png"},
  {name:"敦胡先翁", term:"第三任首相", label:"第三任首相\n敦胡先翁", image:"assets/tokoh/pm-03.png"},
  {name:"敦马哈迪医生", term:"第四任首相", label:"第四任首相\n敦马哈迪医生", image:"assets/tokoh/pm-04.png"},
  {name:"敦阿都拉巴达威", term:"第五任首相", label:"第五任首相\n敦阿都拉巴达威", image:"assets/tokoh/pm-05.png"},
  {name:"拿督斯里纳吉", term:"第六任首相", label:"第六任首相\n拿督斯里纳吉", image:"assets/tokoh/pm-06.png"},
  {name:"敦马哈迪医生", term:"第七任首相", label:"第七任首相\n敦马哈迪医生", image:"assets/tokoh/pm-04.png"},
  {name:"丹斯里慕尤丁", term:"第八任首相", label:"第八任首相\n丹斯里慕尤丁", image:"assets/tokoh/pm-07.png"},
  {name:"拿督斯里依斯迈沙比里", term:"第九任首相", label:"第九任首相\n拿督斯里依斯迈沙比里", image:"assets/tokoh/pm-08.png"},
  {name:"拿督斯里安华·依布拉欣", term:"第十任首相", label:"第十任首相\n拿督斯里安华·依布拉欣", image:"assets/tokoh/pm-09.png"}
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
  // Landscape: photo area on the left, name area on the right.
  const panelW = clamp(W * 0.245, 270, 390);
  const leftW = W - panelW - 38;
  const gapX = clamp(W * 0.012, 8, 18);
  const gapY = clamp(H * 0.055, 10, 24);
  const cardW = clamp((leftW - 30 - gapX * 4) / 5, 90, 170);
  const cardH = clamp(H * 0.31, 135, 235);
  const totalW = cardW * 5 + gapX * 4;
  const startX = Math.max(12, (leftW - totalW) / 2);
  const topY = Math.max(112, H * 0.20);
  const bottomY = Math.min(H - cardH - 14, topY + cardH + gapY);

  targets = PM_DATA.map((pm,i)=>({
    id:i,
    x:startX+(i%5)*(cardW+gapX),
    y:i<5?topY:bottomY,
    w:cardW,h:cardH,pm,filled:false
  }));

  nameBoard={
    x:W-panelW-12,
    y:Math.max(112,H*.16),
    w:panelW,
    h:H-Math.max(126,H*.19)
  };
}

function makeNames(){
  const padX=12, top=42, bottom=12, gap=5;
  const availableH=nameBoard.h-top-bottom-gap*9;
  const rowH=clamp(availableH/10,36,52);
  const fontSize=clamp(rowH*.31,11,16);
  const shuffled=shuffle(PM_DATA.map((p,i)=>({
    id:i,name:p.name,label:p.label,w:nameBoard.w-padX*2,h:rowH,r:rowH*.62,
    x:nameBoard.x+nameBoard.w/2,y:0,
    homeX:0,homeY:0,grab:false,placed:false,fontSize
  })));

  shuffled.forEach((n,i)=>{
    n.x=nameBoard.x+nameBoard.w/2;
    n.y=nameBoard.y+top+i*(rowH+gap)+rowH/2;
    n.homeX=n.x;n.homeY=n.y;
  });
  names=shuffled;
}

function reset(){
  particles=[];cursor.grab=null;cursor.pinch=false;cursor.prevPinch=false;
  layout();makeNames();
  game=true;
  startTime=performance.now();
  endTime=0;
  elapsedMs=0;
  if(timerHandle) clearInterval(timerHandle);
  timerHandle=setInterval(updateTimer,100);
  updateTimer();
  win.classList.add("hidden");
}

function update(){
  const pinchStart=cursor.pinch&&!cursor.prevPinch;
  const pinchEnd=!cursor.pinch&&cursor.prevPinch;

  if(game){
    if(pinchStart&&!cursor.grab){
      let best=null,bestD=Infinity;
      for(const n of names){
        if(n.placed)continue;
        const hitW=n.w/2+32, hitH=n.h/2+32;
        const dx=Math.abs(cursor.x-n.x),dy=Math.abs(cursor.y-n.y);
        if(dx<hitW && dy<hitH){
          const d=Math.hypot(dx,dy);
          if(d<bestD){best=n;bestD=d;}
        }
      }
      if(best){
        cursor.grab=best;
        best.grab=true;
        beep('grab');
        showToast('🤏 已抓住姓名，请移动到正确照片');
      }else{
        showToast('☝️ 请先把手指移到姓名上');
      }
    }

    if(cursor.grab&&cursor.pinch){
      const n=cursor.grab;
      n.x += (cursor.x-n.x)*0.78;
      n.y += (cursor.y-n.y)*0.78;
    }

    if(pinchEnd&&cursor.grab){
      const n=cursor.grab;
      n.grab=false;
      dropName(n);
      cursor.grab=null;
    }
  }
  cursor.prevPinch=cursor.pinch;
}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function draw(){
  ctx.clearRect(0,0,W,H);
  update();

  // Right-side name panel
  ctx.save();
  ctx.fillStyle='rgba(4,18,32,.80)';
  rr(ctx,nameBoard.x,nameBoard.y,nameBoard.w,nameBoard.h,24);
  ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.18)';
  ctx.lineWidth=2;ctx.stroke();

  ctx.fillStyle='#ffd34e';
  ctx.font=`900 ${clamp(W*.014,15,21)}px system-ui`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('首相姓名',nameBoard.x+nameBoard.w/2,nameBoard.y+22);
  ctx.restore();

  if(game){
    targets.forEach(t=>{
      ctx.save();
      rr(ctx,t.x,t.y,t.w,t.h,16);
      ctx.fillStyle=t.filled?'rgba(16,185,129,.55)':'rgba(7,24,41,.86)';
      ctx.fill();
      ctx.strokeStyle=t.filled?'#34d399':'rgba(255,255,255,.62)';
      ctx.lineWidth=3;ctx.stroke();

      const img=images[t.id];
      if(img?.complete){
        ctx.drawImage(img,t.x+6,t.y+6,t.w-12,t.h-50);
      }

      ctx.fillStyle=t.filled?'#b7ffd9':'#fff';
      ctx.font=`800 ${clamp(t.w*.075,10,15)}px system-ui`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(
        t.filled?t.pm.term:'把姓名放这里',
        t.x+t.w/2,t.y+t.h-21
      );
      ctx.restore();
    });

    names.forEach(n=>{
      if(n.placed)return;
      ctx.save();
      const x=n.x-n.w/2,y=n.y-n.h/2;
      const g=ctx.createLinearGradient(x,y,x+n.w,y+n.h);
      g.addColorStop(0,'#0ea5e9');g.addColorStop(1,'#6941d9');
      rr(ctx,x,y,n.w,n.h,14);
      ctx.fillStyle=g;
      ctx.shadowColor=n.grab?'#ffd34e':'rgba(0,0,0,.7)';
      ctx.shadowBlur=n.grab?26:10;
      ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle=n.grab?'#ffd34e':'rgba(255,255,255,.68)';
      ctx.lineWidth=n.grab?4:2;ctx.stroke();
      ctx.fillStyle='#fff';
      ctx.font=`900 ${n.fontSize}px system-ui`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(n.name,n.x,n.y);
      ctx.restore();
    });
  }

  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.a-=.025;
    if(p.a<=0){particles.splice(i,1);continue}
    ctx.save();ctx.globalAlpha=p.a;ctx.fillStyle='#ffd34e';
    ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle=cursor.pinch?'#34d399':'#facc15';
  ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(cursor.x,cursor.y,cursor.pinch?27:18,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=cursor.pinch?'#34d399':'#facc15';
  ctx.beginPath();ctx.arc(cursor.x,cursor.y,5,0,Math.PI*2);ctx.fill();
  ctx.restore();

  requestAnimationFrame(draw);
}
const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.60,minTrackingConfidence:.60});
hands.onResults(r=>{
  if(r.multiHandLandmarks?.length){
    handsDetected=true;lastHand=Date.now();
    const lm=r.multiHandLandmarks[0];
    const idx=lm[8],thumb=lm[4],mcp=lm[5],wrist=lm[0];

    const nx=(1-idx.x)*W,ny=idx.y*H;
    cursor.x+=(nx-cursor.x)*0.60;
    cursor.y+=(ny-cursor.y)*0.60;

    // Distance is normalized by palm size, so pinch works near/far from camera.
    const palm=Math.max(0.018,Math.hypot(mcp.x-wrist.x,mcp.y-wrist.y));
    const ratio=Math.hypot(thumb.x-idx.x,thumb.y-idx.y)/palm;

    // Hysteresis: easier to start, stable while holding.
    if(!cursor.pinch && ratio<0.78) cursor.pinch=true;
    else if(cursor.pinch && ratio>1.02) cursor.pinch=false;

    if(cursor.pinch){
      statusEl.textContent=cursor.grab
        ? '● 捏住中 — 正在抓取姓名'
        : '● 捏住 — 请对准姓名';
    }else{
      statusEl.textContent='● 已检测到手 — 请对准姓名';
    }
    statusEl.className='status ok';
  }else if(Date.now()-lastHand>700){
    handsDetected=false;
    statusEl.textContent='● 正在寻找手部';
    statusEl.className='status';
  }
});
let cameraStream=null;
let processing=false;
let cameraRunning=false;

async function startCamera(){
  statusEl.textContent='● 正在请求摄像头权限';
  statusEl.className='status';
  try{
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      throw new Error('getUserMedia tidak disokong. Pastikan laman dibuka melalui HTTPS.');
    }

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:'user'},
        width:{ideal:1280},
        height:{ideal:720}
      },
      audio:false
    });

    // IMPORTANT: attach the SAME stream to the visible video element.
    video.srcObject = cameraStream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    cameraRunning=true;
    statusEl.textContent='● 摄像头已开启 — 正在寻找手部';
    statusEl.className='status ok';

    processCameraFrames();
  }catch(err){
    console.error('Camera error:',err);
    cameraRunning=false;
    statusEl.textContent='● 摄像头无法开启';
    statusEl.className='status err';
    alert(
      '摄像头无法打开。\n\n' +
      '1. 请确认使用 GitHub Pages（HTTPS）。\n' +
      '2. 点击浏览器地址栏旁的摄像头图标，并选择“允许”。\n' +
      '3. 确认 Chrome 没有被其他程序占用摄像头。\n\n' +
      '错误代码：' + (err.name || 'Unknown')
    );
  }
}

async function processCameraFrames(){
  if(!cameraRunning || !video.srcObject) return;
  if(video.readyState >= 2 && !processing){
    processing=true;
    try{ await hands.send({image:video}); }catch(err){ console.warn('MediaPipe frame:',err); }
    processing=false;
  }
  requestAnimationFrame(processCameraFrames);
}

function stopCamera(){
  cameraRunning=false;
  if(cameraStream){
    cameraStream.getTracks().forEach(t=>t.stop());
    cameraStream=null;
  }
  video.srcObject=null;
}

addEventListener('mousemove',e=>{if(!handsDetected){cursor.x=e.clientX;cursor.y=e.clientY}});
addEventListener('mousedown',()=>{if(!handsDetected)cursor.pinch=true});
addEventListener('mouseup',()=>{if(!handsDetected)cursor.pinch=false});
addEventListener('touchmove',e=>{if(!handsDetected&&e.touches[0]){cursor.x=e.touches[0].clientX;cursor.y=e.touches[0].clientY}},{passive:true});
addEventListener('touchstart',e=>{if(!handsDetected&&e.touches[0]){cursor.x=e.touches[0].clientX;cursor.y=e.touches[0].clientY;cursor.pinch=true}},{passive:true});
addEventListener('touchend',()=>{if(!handsDetected)cursor.pinch=false});

document.getElementById('startBtn').onclick=async()=>{
  await startCamera();
  if(cameraRunning){
    start.classList.add('hidden');
    reset();
  }
};

document.getElementById('restartBtn').onclick=async()=>{
  reset();
  if(!cameraRunning) await startCamera();
};

images=PM_DATA.map(p=>{const i=new Image();i.src=p.image;return i});
resize();draw();
