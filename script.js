/* --- CONFIG (can be changed in settings) --- */
let CLASS_HOUR = 15;
let CLASS_MINUTE = 0;
let CLASS_END_HOUR = 15;
let CLASS_END_MINUTE = 50;
const CLASS_DAYS = [1,3,5]; // Monday, Wednesday, Friday

/* DOM Elements */
const COUNT_LABEL = document.getElementById('count-label');
const COUNTDOWN = document.getElementById('countdown');
const PROG_CONTAINER = document.getElementById('progress-container');
const PROG_BAR = document.getElementById('progress-bar');
const PROG_TEXT = document.getElementById('progress-text');
const CANVAS = document.getElementById('confetti-canvas');
const CTX = CANVAS.getContext('2d');
const MAIN_VIEW = document.getElementById('main-view');
const SETTINGS_VIEW = document.getElementById('settings-view');
const START_INPUT = document.getElementById('start-time');
const END_INPUT = document.getElementById('end-time');
const SAVE_BTN = document.getElementById('save-btn');
const BACK_BTN = document.getElementById('back-btn');

/* secret code detection */
let typed="";
window.addEventListener("keydown",(e)=>{
  typed+=e.key;
  if(typed.toLowerCase().includes("nhvchange")){
    typed="";
    MAIN_VIEW.style.display="none";
    SETTINGS_VIEW.style.display="block";
  }
});

BACK_BTN.addEventListener("click", ()=>{ 
  SETTINGS_VIEW.style.display="none"; 
  MAIN_VIEW.style.display="block"; 
});
SAVE_BTN.addEventListener("click", ()=>{
  const [sh,sm]=START_INPUT.value.split(":").map(Number);
  const [eh,em]=END_INPUT.value.split(":").map(Number);
  if(!isNaN(sh)&&!isNaN(sm)&&!isNaN(eh)&&!isNaN(em)){
    CLASS_HOUR=sh; 
    CLASS_MINUTE=sm; 
    CLASS_END_HOUR=eh; 
    CLASS_END_MINUTE=em;
  }
  SETTINGS_VIEW.style.display="none"; 
  MAIN_VIEW.style.display="block";
});

/* Canvas resize */
function resizeCanvas(){
  const dpr=window.devicePixelRatio||1;
  CANVAS.width=Math.floor(window.innerWidth*dpr);
  CANVAS.height=Math.floor(window.innerHeight*dpr);
  CANVAS.style.width=window.innerWidth+'px';
  CANVAS.style.height=window.innerHeight+'px';
  CTX.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resizeCanvas); 
resizeCanvas();

/* Class start/end helpers */
function setToClassStart(date){ 
  const d=new Date(date); 
  d.setHours(CLASS_HOUR,CLASS_MINUTE,0,0); 
  return d; 
}
function setToClassEnd(date){ 
  const d=new Date(date); 
  d.setHours(CLASS_END_HOUR,CLASS_END_MINUTE,0,0); 
  return d; 
}
function findNextClass(now){
  const today=new Date(now);
  const day=today.getDay();
  const todayStart=setToClassStart(today);
  const todayEnd=setToClassEnd(today);

  if(CLASS_DAYS.includes(day) && now < todayEnd){
    return {start:todayStart,end:todayEnd,isToday:true};
  }

  for (let i = 1; i <= 14; i++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + i);
    if (CLASS_DAYS.includes(candidate.getDay())) {
      return { 
        start: setToClassStart(candidate), 
        end: setToClassEnd(candidate), 
        isToday: false 
      };
    }
  }

  return {start:todayStart,end:todayEnd,isToday:false};
}

/* Confetti */
let confettiPieces=[], confettiActive=false, confettiEndTime=0, rafId=null;
function newConfettiPiece(){ 
  return {
    x:Math.random()*window.innerWidth, 
    y:-Math.random()*window.innerHeight, 
    w:Math.random()*10+6, 
    h:Math.random()*6+4, 
    angle:Math.random()*Math.PI*2, 
    speedX:(Math.random()-0.5)*2, 
    speedY:Math.random()*3+2, 
    color:`hsl(${Math.floor(Math.random()*360)},85%,55%)`, 
    rotationSpeed:(Math.random()-0.5)*0.2
  }; 
}
function startConfetti(){ 
  confettiActive=true; 
  confettiEndTime=Date.now()+60_000; 
  confettiPieces=Array.from({length:200},newConfettiPiece); 
  if(!rafId) drawConfetti(); 
}
function drawConfetti(){ 
  CTX.clearRect(0,0,CANVAS.width,CANVAS.height); 
  for(let p of confettiPieces){ 
    CTX.save(); 
    CTX.translate(p.x,p.y); 
    CTX.rotate(p.angle); 
    CTX.fillStyle=p.color; 
    CTX.fillRect(-p.w/2,-p.h/2,p.w,p.h); 
    CTX.restore(); 
    p.x+=p.speedX; 
    p.y+=p.speedY; 
    p.angle+=p.rotationSpeed; 
    if(p.y>window.innerHeight+20){ 
      Object.assign(p,newConfettiPiece(),{y:-10}); 
    } 
  } 
  if(Date.now()<confettiEndTime){ 
    rafId=requestAnimationFrame(drawConfetti); 
  } else{ 
    confettiActive=false; 
    confettiPieces=[]; 
    CTX.clearRect(0,0,CANVAS.width,CANVAS.height); 
    if(rafId){cancelAnimationFrame(rafId); rafId=null;} 
  } 
}

/* Update loop */
function updateOnce(){
  const now=new Date();
  const todayStart=setToClassStart(now);
  const todayEnd=setToClassEnd(now);
  const inClassNow=CLASS_DAYS.includes(now.getDay()) && now>=todayStart && now<todayEnd;

  if(inClassNow){
    COUNT_LABEL.style.display='none';
    COUNTDOWN.style.display='none';
    PROG_CONTAINER.style.display='block';
    const elapsed=now-todayStart;
    const total=todayEnd-todayStart;
    const percent=Math.max(0,Math.min(100,(elapsed/total)*100));
    PROG_BAR.style.width=percent.toFixed(2)+'%';
    PROG_TEXT.textContent=`${percent.toFixed(1)}% Through Class`;
    if(percent>=100&&!confettiActive) startConfetti();
  } else {
    COUNT_LABEL.style.display='block';
    COUNTDOWN.style.display='block';
    PROG_CONTAINER.style.display='none';
    const next=findNextClass(now);
    const diffMS=next.start-now;
    const totalSeconds=Math.max(0,Math.floor(diffMS/1000));
    const days=Math.floor(totalSeconds/86400);
    const hours=Math.floor((totalSeconds%86400)/3600);
    const minutes=Math.floor((totalSeconds%3600)/60);
    const seconds=Math.floor(totalSeconds%60);
    COUNTDOWN.textContent=`${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}
updateOnce(); 
setInterval(updateOnce,1000);
