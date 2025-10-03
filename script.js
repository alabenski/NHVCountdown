'use strict';
/* --- CONFIG (can be changed in settings) --- */
let CLASS_HOUR = 15;
let CLASS_MINUTE = 0;
let CLASS_END_HOUR = 15;
let CLASS_END_MINUTE = 50;
const CLASS_DAYS = [1,3,5]; // Monday, Wednesday, Friday

function pad(n){ return String(n).padStart(2,'0'); }
const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

window.addEventListener('DOMContentLoaded', ()=> {
  // DOM elements
  const COUNT_LABEL = document.getElementById('count-label');
  const COUNTDOWN = document.getElementById('countdown');
  const PROG_CONTAINER = document.getElementById('progress-container');
  const PROG_BAR = document.getElementById('progress-bar');
  const PROG_TEXT = document.getElementById('progress-text');
  const CANVAS = document.getElementById('confetti-canvas');
  const CTX = CANVAS.getContext ? CANVAS.getContext('2d') : null;
  const MAIN_VIEW = document.getElementById('main-view');
  const SETTINGS_VIEW = document.getElementById('settings-view');
  const START_INPUT = document.getElementById('start-time');
  const END_INPUT = document.getElementById('end-time');
  const SAVE_BTN = document.getElementById('save-btn');
  const BACK_BTN = document.getElementById('back-btn');

  // Load saved settings (optional)
  try {
    const saved = JSON.parse(localStorage.getItem('nhv_settings') || '{}');
    if (saved.h != null) {
      CLASS_HOUR = saved.h;
      CLASS_MINUTE = saved.m;
      CLASS_END_HOUR = saved.eh;
      CLASS_END_MINUTE = saved.em;
    }
  } catch(e){ /* ignore invalid storage */ }

  // init inputs
  START_INPUT.value = `${pad(CLASS_HOUR)}:${pad(CLASS_MINUTE)}`;
  END_INPUT.value = `${pad(CLASS_END_HOUR)}:${pad(CLASS_END_MINUTE)}`;

  // secret code detection to open settings
  let typed = '';
  window.addEventListener('keydown', (e) => {
    typed += e.key;
    if (typed.length > 80) typed = typed.slice(-80);
    if (typed.toLowerCase().includes('nhvchange')) {
      typed = '';
      MAIN_VIEW.style.display = 'none';
      SETTINGS_VIEW.style.display = 'block';
    }
  });

  BACK_BTN.addEventListener('click', ()=> {
    SETTINGS_VIEW.style.display='none';
    MAIN_VIEW.style.display='block';
  });

  SAVE_BTN.addEventListener('click', ()=> {
    const [sh,sm] = (START_INPUT.value || '').split(':').map(Number);
    const [eh,em] = (END_INPUT.value || '').split(':').map(Number);
    if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
      CLASS_HOUR = sh; CLASS_MINUTE = sm; CLASS_END_HOUR = eh; CLASS_END_MINUTE = em;
      localStorage.setItem('nhv_settings', JSON.stringify({ h: CLASS_HOUR, m: CLASS_MINUTE, eh: CLASS_END_HOUR, em: CLASS_END_MINUTE }));
    } else {
      console.warn('Invalid time values in settings');
    }
    SETTINGS_VIEW.style.display='none';
    MAIN_VIEW.style.display='block';
  });

  // canvas resize
  function resizeCanvas(){
    const dpr = window.devicePixelRatio || 1;
    CANVAS.width = Math.floor(window.innerWidth * dpr);
    CANVAS.height = Math.floor(window.innerHeight * dpr);
    CANVAS.style.width = window.innerWidth + 'px';
    CANVAS.style.height = window.innerHeight + 'px';
    if (CTX && CTX.setTransform) CTX.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // helpers for class times
  function setToClassStart(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), CLASS_HOUR, CLASS_MINUTE, 0, 0);
  }
  function setToClassEnd(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), CLASS_END_HOUR, CLASS_END_MINUTE, 0, 0);
  }

  // find the next class (robust)
  function findNextClass(now){
    // todayStart / todayEnd for the current day
    const todayStart = setToClassStart(now);
    const todayEnd = setToClassEnd(now);
    const todayDay = now.getDay();

    // if today is a class day and class hasn't ended, next is today (either later or currently happening)
    if (CLASS_DAYS.includes(todayDay) && now < todayEnd) {
      return { start: todayStart, end: todayEnd, isToday: true };
    }

    // otherwise search forward up to 14 days
    for (let i = 1; i <= 14; i++) {
      const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (CLASS_DAYS.includes(candidate.getDay())) {
        return { start: setToClassStart(candidate), end: setToClassEnd(candidate), isToday: false };
      }
    }

    // fallback to today's times (shouldn't happen unless CLASS_DAYS empty)
    return { start: todayStart, end: todayEnd, isToday: false };
  }

  /* Confetti */
  let confettiPieces = [], confettiActive = false, confettiEndTime = 0, rafId = null;
  function newConfettiPiece(){ 
    return {
      x: Math.random() * window.innerWidth,
      y: -Math.random() * window.innerHeight,
      w: Math.random()*10 + 6,
      h: Math.random()*6 + 4,
      angle: Math.random() * Math.PI * 2,
      speedX: (Math.random()-0.5)*2,
      speedY: Math.random()*3 + 2,
      color: `hsl(${Math.floor(Math.random()*360)},85%,55%)`,
      rotationSpeed: (Math.random()-0.5)*0.2
    };
  }
  function startConfetti(){
    if (!CTX) return;
    confettiActive = true;
    confettiEndTime = Date.now() + 60_000;
    confettiPieces = Array.from({length:200}, newConfettiPiece);
    if (!rafId) drawConfetti();
  }
  function drawConfetti(){
    if (!CTX) return;
    CTX.clearRect(0,0,CANVAS.width,CANVAS.height);
    for (let p of confettiPieces) {
      CTX.save();
      CTX.translate(p.x,p.y);
      CTX.rotate(p.angle);
      CTX.fillStyle = p.color;
      CTX.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      CTX.restore();
      p.x += p.speedX;
      p.y += p.speedY;
      p.angle += p.rotationSpeed;
      if (p.y > window.innerHeight + 20) {
        Object.assign(p, newConfettiPiece(), { y: -10 });
      }
    }
    if (Date.now() < confettiEndTime) {
      rafId = requestAnimationFrame(drawConfetti);
    } else {
      confettiActive = false;
      confettiPieces = [];
      CTX.clearRect(0,0,CANVAS.width,CANVAS.height);
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }
  }

  /* Update loop */
  function updateOnce(){
    const now = new Date();
    const todayStart = setToClassStart(now);
    const todayEnd = setToClassEnd(now);
    const inClassNow = CLASS_DAYS.includes(now.getDay()) && now >= todayStart && now < todayEnd;

    if (inClassNow){
      // show progress bar during class
      COUNT_LABEL.style.display = 'none';
      COUNTDOWN.style.display = 'none';
      PROG_CONTAINER.style.display = 'block';

      const elapsed = now - todayStart;
      const total = todayEnd - todayStart;
      const percent = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 100;
      PROG_BAR.style.width = percent.toFixed(2) + '%';
      PROG_TEXT.textContent = `${percent.toFixed(1)}% Through Class`;

      if (percent >= 100 && !confettiActive) startConfetti();
    } else {
      // show countdown to next class
      const next = findNextClass(now);
      const diffMS = Math.max(0, next.start.getTime() - now.getTime());
      const totalSeconds = Math.floor(diffMS / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);

      COUNT_LABEL.style.display = 'block';
      COUNTDOWN.style.display = 'block';
      PROG_CONTAINER.style.display = 'none';

      const whenText = next.isToday ? 'Today' : dayNames[next.start.getDay()];
      COUNT_LABEL.textContent = next.isToday ? 'Class Today In:' : `Next class on ${whenText} in:`;
      COUNTDOWN.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
  }

  // run loop
  updateOnce();
  setInterval(updateOnce, 1000);

  // small debug helper (can be used in console)
  window.__nhv_debug = { findNextClass, CLASS_DAYS, CLASS_HOUR, CLASS_MINUTE, CLASS_END_HOUR, CLASS_END_MINUTE };
});
