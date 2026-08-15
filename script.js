
const PM_DATA = [
  {id:"PM-01",name:"东姑阿都拉曼",image:"assets/tokoh/pm-01.png"},
  {id:"PM-02",name:"敦阿都拉萨",image:"assets/tokoh/pm-02.png"},
  {id:"PM-03",name:"敦胡先翁",image:"assets/tokoh/pm-03.png"},
  {id:"PM-04",name:"敦马哈迪医生",image:"assets/tokoh/pm-04.png"},
  {id:"PM-05",name:"敦阿都拉巴达威",image:"assets/tokoh/pm-05.png"},
  {id:"PM-06",name:"拿督斯里纳吉",image:"assets/tokoh/pm-06.png"},
  {id:"PM-07",name:"敦马哈迪医生",image:"assets/tokoh/pm-07.png"},
  {id:"PM-08",name:"丹斯里慕尤丁",image:"assets/tokoh/pm-08.png"},
  {id:"PM-09",name:"拿督斯里依斯迈沙比里",image:"assets/tokoh/pm-09.png"},
  {id:"PM-10",name:"拿督斯里安华·依布拉欣",image:"assets/tokoh/pm-10.png"}
];

const PATRIOTIC_SONGS = [
  {file:"assets/lagu/negaraku.mp3", answer:"NEGARAKU"},
  {file:"assets/lagu/jalur-gemilang.mp3", answer:"JALUR GEMILANG"},
  {file:"assets/lagu/tanggal-31.mp3", answer:"TANGGAL 31"},
  {file:"assets/lagu/aku-berjanji.mp3", answer:"AKU BERJANJI"},
  {file:"assets/lagu/ibu-pertiwiku.mp3", answer:"IBU PERTIWIKU"}
];

const video=document.getElementById("webcam"), canvas=document.getElementById("arCanvas"), ctx=canvas.getContext("2d");
const scoreEl=document.getElementById("score"), statusEl=document.getElementById("status"), start=document.getElementById("start"), win=document.getElementById("win"), toast=document.getElementById("toast");
let W=innerWidth,H=innerHeight,game=false,handsDetected=false,lastHand=0;
let startTime=0,endTime=0,elapsedMs=0,timerHandle=null;
let cursor={
  x:W*.5,y:H*.5,
  pinch:false,prevPinch:false,
  state:'normal',
  grabbedName:null,grabDX:0,grabDY:0,
  hoveredName:null,hoverLockUntil:0,
  pinchReleaseSince:0
};
let targets=[],names=[],particles=[],images=[];
const timerEl=document.getElementById("timer");
const station2=document.getElementById("station2");
const s2TimerEl=document.getElementById("s2Timer");
const playSongBtn=document.getElementById("playSongBtn");
const submitSongBtn=document.getElementById("submitSongBtn");
const songAnswerEl=document.getElementById("songAnswer");
const songFeedback=document.getElementById("songFeedback");
const playHint=document.getElementById("playHint");
const playCountEl=document.getElementById("playCount");
const musicIcon=document.getElementById("musicIcon");
const s2ScoreEl=document.getElementById("s2Score");
const s2AnswerSlot=document.getElementById("s2AnswerSlot");
const songQuestion=document.getElementById("songQuestion");
let station2Song=null,station2Audio=null,station2Plays=0,station2Start=0,station2TimerHandle=null;
let station2Score=100,station2Songs=[],station2Options=[],station2Grabbed=null,station2Round=0,station2Used=new Set();


// Small feedback helpers. These must exist because the grab/release loop calls them.
let toastTimer=null;
function showToast(msg){
  if(!toast) return;
  toast.textContent=msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),900);
}

let audioCtx=null;
function beep(ok){
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
    osc.type=ok?'sine':'square';
    osc.frequency.value=ok?720:180;
    gain.gain.setValueAtTime(.07,audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.12);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime+.12);
  }catch(e){}
}
function addBurst(x,y){
  for(let i=0;i<22;i++){
    const a=Math.random()*Math.PI*2, sp=2+Math.random()*5;
    particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.5,a:1});
  }
}

function formatTime(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const min=Math.floor(total/60), sec=total%60, tenth=Math.floor((ms%1000)/100);
  return `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}.${tenth}`;
}
function updateTimer(){
  if(game) elapsedMs=performance.now()-startTime;
  if(timerEl) timerEl.textContent=formatTime(elapsedMs);
}

function normalizeSongAnswer(v){
  return v.trim().toLowerCase().replace(/[’‘`´]/g,"'").replace(/\s+/g," ");
}
function formatSongTime(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const min=Math.floor(total/60),sec=total%60,tenth=Math.floor((ms%1000)/100);
  return `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}.${tenth}`;
}
function updateStation2Timer(){
  if(station2.classList.contains('hidden')) return;
  s2TimerEl.textContent=formatSongTime(performance.now()-station2Start);
}
function startStation2(){
  // Keep the camera alive so the real classroom remains visible behind the game.
  game=false;
  win.classList.add('hidden');
  station2.classList.remove('hidden');
  station2Start=performance.now();
  station2Score=100;
  station2Used.clear();
  station2Songs=shuffle(PATRIOTIC_SONGS);
  station2Round=0;
  station2Options=[];
  station2Grabbed=null;
  s2ScoreEl.textContent='⭐ 100';
  if(station2TimerHandle) clearInterval(station2TimerHandle);
  station2TimerHandle=setInterval(updateStation2Timer,100);
  updateStation2Timer();
  prepareStation2Round();
}
function prepareStation2Round(){
  if(station2Round>=station2Songs.length){finishStation2();return;}
  station2Song=station2Songs[station2Round];
  station2Plays=0;
  if(station2Audio){station2Audio.pause();station2Audio.currentTime=0;}
  station2Audio=new Audio();
  station2Audio.preload='auto';
  station2Audio.src=station2Song.file;
  station2Audio.load();
  station2Audio.addEventListener('canplay',()=>{
    playSongBtn.disabled=false;
    playHint.textContent='歌曲已准备好，可以按“播放歌曲”。';
  }, {once:true});
  station2Audio.addEventListener('error',()=>{
    playSongBtn.disabled=false;
    playHint.textContent='⚠️ 找不到歌曲文件，请确认 GitHub 的 assets/lagu 文件夹完整上传。';
    console.error('Station 2 audio error:', station2Song.file, station2Audio.error);
  });
  station2Audio.addEventListener('play',()=>{
    musicIcon.classList.add('playing');
    playHint.textContent='🔊 正在播放，请认真聆听……';
  });
  station2Audio.addEventListener('ended',()=>{
    musicIcon.classList.remove('playing');
    playHint.textContent='歌曲播放结束。请把正确的歌曲名称拖进答案格。';
    if(station2Plays<2) playSongBtn.textContent='🔁 再听一次';
  });
  playSongBtn.disabled=false;
  playSongBtn.textContent='▶ 播放歌曲';
  playCountEl.textContent='本题可播放 2 次';
  songQuestion.textContent=`第 ${station2Round+1} 首歌曲`;
  songFeedback.textContent='';
  songFeedback.className='song-feedback';
  s2AnswerSlot.classList.remove('correct','wrong');
  s2AnswerSlot.innerHTML='<span>把正确的歌曲名称放到这里</span>';
  station2Options=shuffle(station2Songs.map((song,i)=>({
    id:i, name:song.answer, w:clamp(W*.16,150,220), h:58,
    x:0,y:0,homeX:0,homeY:0,grab:false,placed:false
  }))).filter(o=>!station2Used.has(o.name));
  layoutStation2Options();
  cursor.grabbedName=null;
  cursor.hoveredName=null;
  cursor.pinchReleaseSince=0;
}
function layoutStation2Options(){
  const areaLeft=Math.max(18,W*.025), areaRight=Math.min(W*.975,W*.98);
  const top=105, bottom=Math.max(top+180,H*.86);
  const cols=W>=1000?3:2;
  const gapX=18,gapY=16;
  const colW=Math.min(230,(areaRight-areaLeft-gapX*(cols-1))/cols);
  station2Options.forEach((n,i)=>{
    n.w=colW;
    const col=i%cols,row=Math.floor(i/cols);
    const rows=Math.ceil(station2Options.length/cols);
    const rowH=Math.min(64,(bottom-top-gapY*(rows-1))/rows);
    n.h=Math.max(52,rowH);
    n.x=areaLeft+col*(colW+gapX)+colW/2;
    n.y=top+row*(n.h+gapY)+n.h/2;
    n.homeX=n.x;n.homeY=n.y;
  });
}
function playStation2Song(){
  if(!station2Audio){
    playHint.textContent='请稍候，正在准备歌曲……';
    return;
  }
  if(station2Audio.paused){
    if(station2Plays>=2){playHint.textContent='已达到 2 次播放次数。';return;}
    station2Plays++;
    playCountEl.textContent=`已播放 ${station2Plays} / 2 次`;
    station2Audio.currentTime=0;
    const playPromise=station2Audio.play();
    if(playPromise && typeof playPromise.catch==='function'){
      playPromise.catch(err=>{
        console.error('Audio play failed:',err);
        playHint.textContent='无法播放歌曲。请再按一次播放，并确认浏览器允许声音。';
        station2Plays=Math.max(0,station2Plays-1);
        playCountEl.textContent=`已播放 ${station2Plays} / 2 次`;
      });
    }
  }else{
    station2Audio.pause();
  }
}
function stopStation2Song(){
  if(station2Audio){
    station2Audio.pause();
    station2Audio.currentTime=0;
  }
  if(musicIcon) musicIcon.classList.remove('playing');
  if(playHint) playHint.textContent='歌曲已停止。';
}

function station2PointInSlot(n){
  const r=s2AnswerSlot.getBoundingClientRect();
  return n.x>=r.left && n.x<=r.right && n.y>=r.top && n.y<=r.bottom;
}
function dropStation2Song(n){
  const correct=n.name===station2Song.answer;
  if(correct){
    station2Used.add(n.name);
    n.placed=true;
    station2Grabbed=null;
    s2AnswerSlot.classList.add('correct');
    s2AnswerSlot.innerHTML=`<b>✓ ${n.name}</b>`;
    songFeedback.textContent='🎉 配对正确！';
    songFeedback.className='song-feedback correct';
    beep(true);
    if(station2Audio) station2Audio.pause();
    station2Round++;
    setTimeout(prepareStation2Round,900);
  }else{
    station2Score=Math.max(0,station2Score-10);
    s2ScoreEl.textContent=`⭐ ${station2Score}`;
    n.x=n.homeX;n.y=n.homeY;n.grab=false;
    station2Grabbed=null;
    s2AnswerSlot.classList.add('wrong');
    songFeedback.textContent='❌ 配对错误！扣 10 分，请再听一次。';
    songFeedback.className='song-feedback wrong';
    beep(false);
    setTimeout(()=>s2AnswerSlot.classList.remove('wrong'),450);
  }
}
function updateStation2Interaction(){
  const now=performance.now();
  const pinchStarted=cursor.pinch&&!cursor.prevPinch;
  let hover=null,best=Infinity;
  if(!station2Grabbed){
    for(const n of station2Options){
      if(n.placed) continue;
      const hw=n.w/2+55,hh=n.h/2+32;
      const dx=Math.abs(cursor.x-n.x),dy=Math.abs(cursor.y-n.y);
      if(dx<=hw&&dy<=hh){const d=(dx/hw)**2+(dy/hh)**2;if(d<best){best=d;hover=n;}}
    }
  }
  cursor.hoveredName=hover;
  if(pinchStarted&&hover&&!station2Grabbed){
    station2Grabbed=hover; hover.grab=true; cursor.grabbedName=hover;
    cursor.grabDX=hover.x-cursor.x;cursor.grabDY=hover.y-cursor.y;
    cursor.state='grab';
  }
  if(station2Grabbed){
    if(cursor.pinch){
      station2Grabbed.x=cursor.x+cursor.grabDX;
      station2Grabbed.y=cursor.y+cursor.grabDY-45;
      station2Grabbed.x=clamp(station2Grabbed.x,station2Grabbed.w/2+4,W-station2Grabbed.w/2-4);
      station2Grabbed.y=clamp(station2Grabbed.y,station2Grabbed.h/2+85,H-station2Grabbed.h/2-12);
      station2Grabbed.grab=true;cursor.state='grab';
    }else{
      if(!cursor.pinchReleaseSince) cursor.pinchReleaseSince=now;
      if(now-cursor.pinchReleaseSince>=140){
        const n=station2Grabbed;n.grab=false;
        if(station2PointInSlot(n)) dropStation2Song(n); else {n.x=n.homeX;n.y=n.homeY;station2Grabbed=null;cursor.grabbedName=null;cursor.pinchReleaseSince=0;cursor.state='normal';}
      }
    }
  }else{
    cursor.state=hover?'hover':'normal';
  }
  cursor.prevPinch=cursor.pinch;
}
function finishStation2(){
  if(station2Audio) station2Audio.pause();
  if(station2TimerHandle) clearInterval(station2TimerHandle);
  const t=formatSongTime(performance.now()-station2Start);
  songFeedback.textContent=`🎉 STESEN 2 完成！最终得分：${station2Score} 分，用时 ${t}`;
  songFeedback.className='song-feedback correct';
  setTimeout(()=>{
    station2.classList.add('hidden');
    alert(`第二关完成！\n最终得分：${station2Score} 分\n用时：${t}`);
  },1200);
}

function resize(){W=innerWidth;H=innerHeight;canvas.width=W*devicePixelRatio;canvas.height=H*devicePixelRatio;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);layout();}
addEventListener('resize',resize);
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function layout(){
  const panelW=clamp(W*.285,360,470);
  const leftW=W-panelW-42;
  const gapX=clamp(W*.010,8,16);
  const gapY=clamp(H*.045,8,18);

  const cardW=clamp((leftW-28-gapX*4)/5,88,168);
  const cardH=clamp(H*.30,130,225);
  const totalW=cardW*5+gapX*4;
  const startX=Math.max(10,(leftW-totalW)/2);
  const topY=Math.max(105,H*.19);
  const bottomY=Math.min(H-cardH-12,topY+cardH+gapY);

  targets=PM_DATA.map((pm,i)=>({
    id:i,x:startX+(i%5)*(cardW+gapX),y:i<5?topY:bottomY,
    w:cardW,h:cardH,pm,filled:false
  }));

  nameBoard={
    x:W-panelW-10,
    y:Math.max(108,H*.14),
    w:panelW,
    h:H-Math.max(125,H*.16)
  };
}

function makeNames(){
  const padX=12,top=48,bottom=16,gapX=10,gapY=8;
  const cols=2,rows=5;
  const colW=(nameBoard.w-padX*2-gapX)/cols;
  const rowH=clamp(
    (nameBoard.h-top-bottom-gapY*(rows-1))/rows,
    48,72
  );
  const fontSize=clamp(rowH*.25,11,16);

  const shuffled=shuffle(PM_DATA.map((p,i)=>({
    id:i,
    name:p.name,
    label:p.name,
    w:colW,h:rowH,r:rowH*.34,
    x:0,y:0,homeX:0,homeY:0,
    grab:false,placed:false,fontSize
  })));

  shuffled.forEach((n,i)=>{
    const col=i%cols,row=Math.floor(i/cols);
    n.x=nameBoard.x+padX+col*(colW+gapX)+colW/2;
    n.y=nameBoard.y+top+row*(rowH+gapY)+rowH/2;
    n.homeX=n.x;n.homeY=n.y;
  });
  names=shuffled;
}

function reset(){
  particles=[];
  cursor.grabbedName=null;
  cursor.pinch=false;
  cursor.prevPinch=false;
  cursor.state='normal';
  cursor.hoveredName=null;
  cursor.hoverLockUntil=0;
  cursor.pinchReleaseSince=0;
  layout();makeNames();

  // Timer starts immediately when the game screen starts.
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
  if(!game)return;

  const now=performance.now();
  const pinchStarted=cursor.pinch&&!cursor.prevPinch;

  // ------------------------------------------------------------
  // HOVER LOCK: like the reference HTML, getting close to a card
  // turns the cursor yellow and gives a generous magnetic hit area.
  // The lock has a short grace period so small hand jitter does not
  // make the target disappear between MediaPipe frames.
  // ------------------------------------------------------------
  let hoveredName=null,bestD=Infinity;
  if(!cursor.grabbedName){
    for(const n of names){
      if(n.placed)continue;
      const hitW=n.w/2+62;
      const hitH=n.h/2+36;
      const dx=Math.abs(cursor.x-n.x);
      const dy=Math.abs(cursor.y-n.y);
      if(dx<=hitW&&dy<=hitH){
        const d=(dx/hitW)**2+(dy/hitH)**2;
        if(d<bestD){bestD=d;hoveredName=n;}
      }
    }
  }

  if(hoveredName){
    cursor.hoveredName=hoveredName;
    cursor.hoverLockUntil=now+180;
  }else if(now>cursor.hoverLockUntil && !cursor.grabbedName){
    cursor.hoveredName=null;
  }else if(cursor.hoveredName?.placed){
    cursor.hoveredName=null;
  }

  // Only a NEW pinch can grab. Merely touching/hovering never removes
  // or hides a name card.
  if(pinchStarted&&!cursor.grabbedName&&cursor.hoveredName){
    const n=cursor.hoveredName;
    cursor.grabbedName=n;
    n.grab=true;
    cursor.grabDX=n.x-cursor.x;
    cursor.grabDY=n.y-cursor.y;
    cursor.pinchReleaseSince=0;
    cursor.state='grab';
    showToast('🤏 已锁定姓名');
  }

  // Once grabbed, use a larger release threshold and a short release
  // debounce. This prevents a tiny hand wobble from making the card drop.
  if(cursor.grabbedName){
    if(cursor.pinch){
      cursor.pinchReleaseSince=0;
      const n=cursor.grabbedName;
      const ox=42,oy=-52;
      n.x=cursor.x+cursor.grabDX+ox;
      n.y=cursor.y+cursor.grabDY+oy;
      n.x=clamp(n.x,n.w/2+4,W-n.w/2-4);
      n.y=clamp(n.y,n.h/2+4,H-n.h/2-4);
      cursor.state='grab';
    }else{
      if(!cursor.pinchReleaseSince) cursor.pinchReleaseSince=now;
      // 140ms grace period: brief pinch detection loss is ignored.
      if(now-cursor.pinchReleaseSince>=140){
        const n=cursor.grabbedName;
        n.grab=false;
        dropName(n);
        cursor.grabbedName=null;
        cursor.grabDX=0;cursor.grabDY=0;
        cursor.pinchReleaseSince=0;
        cursor.state='normal';
        cursor.hoveredName=null;
      }else{
        cursor.state='grab';
      }
    }
  }else{
    cursor.state=cursor.hoveredName?'hover':'normal';
  }

  cursor.prevPinch=cursor.pinch;
}
// The old v11 build called dropName() but did not contain the function.
// That ReferenceError stopped the animation loop on the first release.
// This complete release handler fixes that root cause.
function dropName(n){
  // A name is correct when its text matches the target person's name.
  // Therefore either of the two identical “敦马哈迪医生” cards can
  // correctly fill PM-04 OR PM-07.
  const target=targets.find(t=>
    !t.filled &&
    n.name===t.pm.name &&
    n.x>=t.x && n.x<=t.x+t.w &&
    n.y>=t.y && n.y<=t.y+t.h
  );

  if(target){
    target.filled=true;
    n.placed=true;
    n.x=target.x+target.w/2;
    n.y=target.y+target.h-21;
    addBurst(n.x,n.y);
    beep(true);
    showToast('✓ 配对正确！');

    if(targets.every(t=>t.filled)){
      game=false;
      endTime=performance.now();
      elapsedMs=endTime-startTime;
      updateTimer();
      if(timerHandle) clearInterval(timerHandle);
      document.getElementById('finalTime').textContent=formatTime(elapsedMs);
      win.classList.remove('hidden');
    }
  }else{
    n.x=n.homeX;
    n.y=n.homeY;
    beep(false);
    showToast('✕ 配对错误，请再试一次');
  }
}


function drawStation2Canvas(){
  // Clear the first-station UI by covering it with transparent glass panels;
  // the real webcam remains visible underneath.
  ctx.save();
  ctx.fillStyle='rgba(7,24,41,.20)';
  ctx.fillRect(0,76,W,H-76);
  ctx.fillStyle='rgba(8,25,42,.58)';
  rr(ctx,18,96,W*.33,H-120,24);ctx.fill();
  ctx.restore();

  station2Options.forEach(n=>{
    if(n.placed||n===station2Grabbed) return;
    drawFloatingSongCard(n,n===cursor.hoveredName);
  });
  if(station2Grabbed&&!station2Grabbed.placed) drawFloatingSongCard(station2Grabbed,true,true);

  // Answer slot is mirrored in the canvas as a visual target behind the DOM slot.
  const r=s2AnswerSlot.getBoundingClientRect();
  ctx.save();
  ctx.strokeStyle=cursor.grabbedName?'#34d399':'rgba(255,255,255,.8)';
  ctx.lineWidth=3;ctx.setLineDash([10,8]);
  rr(ctx,r.left,r.top,r.width,r.height,18);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='rgba(255,255,255,.08)';ctx.fill();ctx.restore();

  // AR cursor feedback, matching Station 1/reference style.
  ctx.save();
  const locked=!!cursor.hoveredName&&!station2Grabbed;
  const grabbing=!!station2Grabbed;
  const color=grabbing?'#34d399':locked?'#facc15':'#38bdf8';
  const rad=grabbing?24:locked?30:18;
  ctx.strokeStyle=color;ctx.lineWidth=grabbing?5:3;
  if(locked&&!grabbing)ctx.setLineDash([7,6]);
  ctx.beginPath();ctx.arc(cursor.x,cursor.y,rad,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(cursor.x,cursor.y,5,0,Math.PI*2);ctx.fill();
  if(locked&&!grabbing){ctx.fillStyle='#fff';ctx.font='900 12px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText('锁定',cursor.x,cursor.y-rad-10);}
  if(grabbing){ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText('🤏',cursor.x,cursor.y-34);}
  ctx.restore();
}
function drawFloatingSongCard(n,isHover,isGrab){
  const x=n.x-n.w/2,y=n.y-n.h/2;
  ctx.save();
  const g=ctx.createLinearGradient(x,y,x+n.w,y+n.h);g.addColorStop(0,'#0ea5e9');g.addColorStop(1,'#6941d9');
  rr(ctx,x,y,n.w,n.h,18);ctx.fillStyle=g;ctx.shadowColor=isGrab?'#34d399':isHover?'#facc15':'rgba(0,0,0,.7)';ctx.shadowBlur=isGrab?28:isHover?22:10;ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle=isGrab?'#34d399':isHover?'#facc15':'rgba(255,255,255,.78)';ctx.lineWidth=isGrab?5:isHover?4:2;ctx.stroke();
  if(isHover&&!isGrab){ctx.save();rr(ctx,x-6,y-6,n.w+12,n.h+12,22);ctx.strokeStyle='rgba(250,204,21,.95)';ctx.lineWidth=2.5;ctx.setLineDash([7,6]);ctx.stroke();ctx.restore();}
  ctx.fillStyle='#fff';ctx.font=`900 ${clamp(n.w*.095,13,22)}px "Microsoft YaHei","Noto Sans SC",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.name,n.x,n.y);
  ctx.restore();
}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function draw(){
  ctx.clearRect(0,0,W,H);
  update();

  // Station 2 owns the canvas while it is active. Do not draw the
  // Station 1 name board/cards underneath it; that made the second
  // station visually interfere with the first station.
  if(!station2.classList.contains("hidden")){
    updateStation2Interaction();
    drawStation2Canvas();
    // IMPORTANT: keep the render loop alive during Station 2.
    // The previous version returned here without scheduling the next frame,
    // which froze the AR cursor and floating answer cards.
    requestAnimationFrame(draw);
    return;
  }

  // Right-side name panel
  ctx.save();
  ctx.fillStyle='rgba(4,18,32,.80)';
  rr(ctx,nameBoard.x,nameBoard.y,nameBoard.w,nameBoard.h,24);
  ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.18)';
  ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#ffd34e';
  ctx.font=`900 ${clamp(W*.014,15,21)}px "Microsoft YaHei","Noto Sans SC",system-ui`;
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
      if(img?.complete) ctx.drawImage(img,t.x+6,t.y+6,t.w-12,t.h-50);

      ctx.fillStyle=t.filled?'#b7ffd9':'#fff';
      ctx.font=`800 ${clamp(t.w*.075,10,15)}px "Microsoft YaHei","Noto Sans SC",system-ui`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(t.filled?t.pm.name:'把姓名放这里',t.x+t.w/2,t.y+t.h-21);
      ctx.restore();
    });

    // Draw every unplaced name. Nothing disappears merely because the hand touches it.
    names.forEach(n=>{
      if(n.placed || n===cursor.grabbedName) return;
      drawNameCard(n);
    });

    // Draw grabbed name LAST, exactly like the reference game's grabbed bubble.
    if(cursor.grabbedName && !cursor.grabbedName.placed){
      drawNameCard(cursor.grabbedName);
    }
  }

  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.a-=.025;
    if(p.a<=0){particles.splice(i,1);continue}
    ctx.save();ctx.globalAlpha=p.a;ctx.fillStyle='#ffd34e';
    ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  ctx.save();
  const locked=!!cursor.hoveredName&&!cursor.grabbedName;
  const grabbing=!!cursor.grabbedName;
  const cursorColor=grabbing?'#34d399':(locked?'#facc15':'#38bdf8');
  const cursorRadius=grabbing?24:(locked?30:18);
  ctx.strokeStyle=cursorColor;
  ctx.lineWidth=grabbing?5:3;
  if(locked&&!grabbing) ctx.setLineDash([7,6]);
  ctx.beginPath();ctx.arc(cursor.x,cursor.y,cursorRadius,0,Math.PI*2);ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle=cursorColor;
  ctx.beginPath();ctx.arc(cursor.x,cursor.y,5,0,Math.PI*2);ctx.fill();

  if(locked&&!grabbing){
    ctx.fillStyle='#fff';
    ctx.font='900 12px "Microsoft YaHei","Noto Sans SC",sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('锁定',cursor.x,cursor.y-cursorRadius-10);
  }
  if(grabbing){
    ctx.fillStyle='#fff';
    ctx.font='18px sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🤏',cursor.x,cursor.y-34);
  }
  ctx.restore();

  requestAnimationFrame(draw);
}

function drawNameCard(n){
  const x=n.x-n.w/2,y=n.y-n.h/2;
  ctx.save();
  const g=ctx.createLinearGradient(x,y,x+n.w,y+n.h);
  g.addColorStop(0,'#0ea5e9');g.addColorStop(1,'#6941d9');

  const isHover=n===cursor.hoveredName && !n.grab;
  rr(ctx,x,y,n.w,n.h,14);
  ctx.fillStyle=g;
  ctx.shadowColor=n.grab?'#34d399':(isHover?'#facc15':'rgba(0,0,0,.7)');
  ctx.shadowBlur=n.grab?30:(isHover?24:10);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=n.grab?'#34d399':(isHover?'#facc15':'rgba(255,255,255,.68)');
  ctx.lineWidth=n.grab?5:(isHover?4:2);
  ctx.stroke();

  // Reference-style yellow "lock ring" when the finger is near a name.
  if(isHover){
    ctx.save();
    rr(ctx,x-5,y-5,n.w+10,n.h+10,18);
    ctx.strokeStyle='rgba(250,204,21,.9)';
    ctx.lineWidth=2.5;
    ctx.setLineDash([7,6]);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle='#fff';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`900 ${Math.max(10,n.fontSize-1)}px "Microsoft YaHei","Noto Sans SC",system-ui`;

  const lines=(n.label||n.name).split("\\n");
  const gap=Math.max(13,n.fontSize*1.02);
  if(lines.length>1){
    ctx.fillText(lines[0],n.x,n.y-gap/2);
    ctx.fillText(lines[1],n.x,n.y+gap/2);
  }else{
    ctx.fillText(lines[0],n.x,n.y);
  }
  ctx.restore();
}
const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({
  maxNumHands:1, // 只允许检测一只手

  modelComplexity:1,
  minDetectionConfidence:.65,
  minTrackingConfidence:.65
});
hands.onResults(r=>{
  // IMPORTANT: only the FIRST detected hand is used.
  // MediaPipe is explicitly limited to one hand.
  if(r.multiHandLandmarks && r.multiHandLandmarks.length>0){
    handsDetected=true;
    lastHand=Date.now();

    const lm=r.multiHandLandmarks[0];
    const indexTip=lm[8];
    const thumbTip=lm[4];

    // Same coordinate method as the reference file:
    // index finger tip is the cursor, mirrored horizontally.
    const newX=(1-indexTip.x)*W;
    const newY=indexTip.y*H;
    cursor.x += (newX-cursor.x)*0.58;
    cursor.y += (newY-cursor.y)*0.58;

    // Same direct pixel-distance pinch detection as the reference.
    const thumbX=(1-thumbTip.x)*W;
    const thumbY=thumbTip.y*H;
    const dx=thumbX-cursor.x;
    const dy=thumbY-cursor.y;
    const distance=Math.sqrt(dx*dx+dy*dy);

    // Hysteresis: easier to start Pinch, much harder to accidentally release.
    // This is the key stability improvement for real classroom use.
    const pinchStartThreshold=52;
    const pinchHoldThreshold=78;
    if(!cursor.pinch) cursor.pinch=distance<pinchStartThreshold;
    else cursor.pinch=distance<pinchHoldThreshold;

    if(cursor.pinch){
      statusEl.textContent=cursor.grabbedName
        ? '● 捏住中 — 正在抓取姓名'
        : '● 已锁定目标 — 捏住姓名';
    }else{
      statusEl.textContent='● 已检测到一只手 — 靠近姓名会自动锁定';
    }
    statusEl.className='status ok';
  }else if(Date.now()-lastHand>1000){
    handsDetected=false;
    statusEl.textContent='● 正在寻找一只手';
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

document.getElementById('nextStationBtn').onclick=()=>startStation2();

document.getElementById('startBtn').onclick=async()=>{
  await startCamera();
  if(cameraRunning){
    start.classList.add('hidden');
    reset();
  }
};

if(submitSongBtn) submitSongBtn.onclick=submitStation2Answer;
if(songAnswerEl) songAnswerEl.addEventListener('keydown',e=>{if(e.key==='Enter')submitStation2Answer();});

// No restartBtn on the current first-station screen.
// Load all ten PM images before starting the render loop.
images=PM_DATA.map(p=>{
  const i=new Image();
  i.src=p.image;
  i.onload=()=>{ if(!game) draw(); };
  i.onerror=()=>console.warn('无法加载首相图片：',p.image);
  return i;
});
resize();
draw();


function finishStation(force=false){
  // Universal skip handler for Station 1. Password-protected skipping
  // should not depend on a missing legacy function.
  if(timerHandle) clearInterval(timerHandle);
  game=false;
  elapsedMs=Math.max(0, performance.now()-startTime);
  updateTimer();
  const final=document.getElementById('finalTime');
  if(final) final.textContent=formatTime(elapsedMs);
  win.classList.remove('hidden');
}

function showSkipPassword(){
  let box=document.getElementById("skipPasswordModal");
  if(!box){
    box=document.createElement("div");
    box.id="skipPasswordModal";
    box.innerHTML=`
      <div class="skip-backdrop"></div>
      <div class="skip-card">
        <div class="skip-title">跳过这一关</div>
        <div class="skip-sub">请输入密码后直接进入下一关</div>
        <input id="skipPasswordInput" type="password" inputmode="numeric" maxlength="12" placeholder="密码">
        <div class="skip-actions">
          <button id="skipCancelBtn">取消</button>
          <button id="skipConfirmBtn">确认</button>
        </div>
        <div id="skipError"></div>
      </div>`;
    document.body.appendChild(box);
    box.querySelector(".skip-backdrop").onclick=()=>box.remove();
    box.querySelector("#skipCancelBtn").onclick=()=>box.remove();
    box.querySelector("#skipConfirmBtn").onclick=()=>{
      const v=box.querySelector("#skipPasswordInput").value;
      if(v==="123"){
        box.remove();
        if(!station2.classList.contains('hidden')){
          finishStation2();
        }else if(game){
          finishStation(true);
        }
      }else{
        box.querySelector("#skipError").textContent="密码错误";
      }
    };
    box.querySelector("#skipPasswordInput").addEventListener("keydown",e=>{
      if(e.key==="Enter") box.querySelector("#skipConfirmBtn").click();
    });
  }
  box.querySelector("#skipPasswordInput").focus();
}

function addSkipButton(){
  if(document.getElementById("skipStationBtn")) return;
  const b=document.createElement("button");
  b.id="skipStationBtn";
  b.textContent="⏭ 跳过这一关";
  b.onclick=showSkipPassword;
  document.body.appendChild(b);
}
window.addEventListener("load",addSkipButton);
