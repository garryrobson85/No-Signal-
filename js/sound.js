// No Signal v1.1.2 — sound.js
// Sound is ALWAYS ON. No toggle. AudioContext is created on the first user
// interaction (browser policy), then kept alive permanently.
// Haptics, particles, flash, drawer, themes also live here.

// ═══ UI SETTINGS (no sound toggle — sound is always on) ═══
const NS = {
  haptic:    true,
  flash:     true,
  particles: true,
  scanlines: true,
};
try {
  const stored = localStorage.getItem('ns_ui_settings');
  if (stored) {
    const parsed = JSON.parse(stored);
    // Merge but ignore any old 'sound' key — sound is always on now
    const {sound, ...rest} = parsed;
    Object.assign(NS, rest);
  }
} catch(e) {}

function nsSave() {
  try { localStorage.setItem('ns_ui_settings', JSON.stringify(NS)); } catch(e) {}
}

function applyScanlinesState() {
  document.documentElement.classList.toggle('no-scan', !NS.scanlines);
}

// ═══ AUDIO ═══
// Rule: AudioContext is created the moment the user first interacts with the page.
// After that, playTone always works — we never check a "sound enabled" flag.
let _actx = null;
let _audioReady = false;

function _initAudio() {
  if (_actx) return;
  try {
    _actx = new (window.AudioContext || window.webkitAudioContext)();
    _actx.onstatechange = () => {
      if (_actx && _actx.state === 'suspended') _actx.resume().catch(()=>{});
    };
    _audioReady = true;
  } catch(e) { _actx = null; }
}

// Called on EVERY user interaction — creates context on first call, resumes on subsequent
function _ensureAudio() {
  if (!_actx) {
    _initAudio();
  } else if (_actx.state === 'suspended') {
    _actx.resume().catch(()=>{});
  }
}

// Register on all gesture types so we catch the very first interaction
['pointerdown','click','touchstart','keydown'].forEach(ev => {
  document.addEventListener(ev, _ensureAudio, { passive: true });
});

// Periodic keep-alive in case browser suspends silently
setInterval(() => { if (_actx && _actx.state === 'suspended') _actx.resume().catch(()=>{}); }, 2000);

function playTone(f, t='sine', d=0.15, v=0.09, delay=0) {
  if (!_actx) { _initAudio(); if(!_actx) return; }
  const doPlay = () => {
    try {
      if (_actx.state === 'closed') return;
      const o = _actx.createOscillator(), g = _actx.createGain();
      o.connect(g); g.connect(_actx.destination);
      o.type = t; o.frequency.value = f;
      const T = _actx.currentTime + Math.max(0, delay);
      g.gain.setValueAtTime(Math.max(0.001, v), T);
      g.gain.exponentialRampToValueAtTime(0.0001, T + d);
      o.start(T); o.stop(T + d + 0.05);
    } catch(e) { /* silent */ }
  };
  // Always go through resume() — it resolves synchronously if already running
  // This fixes the race where click + sound happen in the same microtask
  if (_actx.state === 'running') {
    doPlay();
  } else {
    _actx.resume().then(doPlay).catch(()=>{});
  }
}

// Reliable button sound — re-inits audio if needed, plays immediately
function sfxBtn() {
  if (!_actx) _initAudio();
  if (!_actx) return;
  // Short crisp tick — distinct from sfxTick
  playTone(600, 'sine', 0.08, 0.09);
}

function sfxVote()   { playTone(220,'sine',0.07,0.13); playTone(440,'sine',0.1,0.10,0.05); playTone(330,'triangle',0.18,0.08,0.09); }
function sfxElim()   { [80,70,60,50,40].forEach((f,i)=>playTone(f,'sawtooth',0.38,0.10,i*0.11)); playTone(220,'sine',0.5,0.07,0.62); }
function sfxWin()    { [523,659,784,1047].forEach((f,i)=>playTone(f,'sine',0.2,0.13,i*0.09)); }
function sfxAdv()    { playTone(440,'sine',0.12,0.10); playTone(550,'sine',0.12,0.09,0.07); }
function sfxSelect() { playTone(520,'sine',0.10,0.11); playTone(780,'sine',0.13,0.10,0.07); }
function sfxTick()   { playTone(800,'sine',0.13,0.09); }
function sfxNav()    { playTone(520,'sine',0.11,0.08); }
function sfxToggle() { playTone(700,'triangle',0.13,0.08); playTone(900,'triangle',0.09,0.06,0.05); }
function sfxOpen()   { playTone(440,'sine',0.09,0.07); playTone(550,'sine',0.09,0.06,0.06); }

// ═══ HAPTICS ═══
function haptic(p=[8]) {
  if (!NS.haptic) return;
  try { if (navigator.vibrate) navigator.vibrate(p); } catch(e) {}
}
function hapticVote() { haptic([15,8,15]); }
function hapticElim() { haptic([50,30,80,30,50]); }
function hapticTap()  { haptic([7]); }
function hapticWin()  { haptic([20,15,40]); }
function hapticAdv()  { haptic([8]); }

// ═══ SCREEN FLASH ═══
function nsFlash() {
  if (!NS.flash) return;
  const el = document.getElementById('ns-flash');
  if (!el) return;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 110);
}

// ═══ PARTICLES ═══
const _pc = document.getElementById('ns-particles');
const _pctx = _pc ? _pc.getContext('2d') : null;
let _parts = [];

function _resizePC() {
  if (!_pc) return;
  _pc.width = window.innerWidth;
  _pc.height = window.innerHeight;
  _pc.style.width = window.innerWidth + 'px';
  _pc.style.height = window.innerHeight + 'px';
}
_resizePC();
window.addEventListener('resize', _resizePC);

class _Particle {
  constructor(x, y, c='#E8450A') {
    this.x=x; this.y=y;
    this.vx=(Math.random()-.5)*4; this.vy=-Math.random()*5-2;
    this.life=1; this.d=Math.random()*0.02+0.014;
    this.sz=Math.random()*3.5+2; this.c=c;
  }
  update() { this.x+=this.vx; this.y+=this.vy; this.vy+=0.1; this.life-=this.d; this.sz*=0.97; }
  draw(ctx) {
    ctx.save(); ctx.globalAlpha=this.life;
    ctx.fillStyle=this.c; ctx.shadowColor=this.c; ctx.shadowBlur=7;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.sz,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

function nsBurst(x, y, n=18, c='#E8450A') {
  if (!NS.particles || !_pctx) return;
  for (let i=0; i<n; i++) _parts.push(new _Particle(x, y, c));
}
function nsElimBurst() {
  if (!NS.particles || !_pctx) return;
  const cx = window.innerWidth/2;
  for (let i=0; i<50; i++) {
    const p = new _Particle(cx+(Math.random()-.5)*100, window.innerHeight*.35, '#E8450A');
    p.vy *= 1.6; _parts.push(p);
  }
}
(function _ploop() {
  if (_pctx) {
    _pctx.clearRect(0,0,_pc.width,_pc.height);
    _parts = _parts.filter(p=>p.life>0);
    _parts.forEach(p=>{ p.update(); p.draw(_pctx); });
  }
  requestAnimationFrame(_ploop);
})();

// ═══ SETTINGS DRAWER ═══
function nsToggle(key) {
  NS[key] = !NS[key];
  const el = document.getElementById('ns-t-'+key);
  if (el) el.classList.toggle('on', NS[key]);
  nsSave();
  hapticTap(); sfxToggle();
  if (key==='scanlines') applyScanlinesState();
}

function openDrawer() {
  document.getElementById('settings-drawer')?.classList.add('open');
  document.getElementById('drawer-backdrop')?.classList.add('open');
  hapticTap(); sfxOpen();
}
function closeDrawer() {
  document.getElementById('settings-drawer')?.classList.remove('open');
  document.getElementById('drawer-backdrop')?.classList.remove('open');
}

// ═══ THEMES ═══
const _themes = {
  default: {},
  arctic:  {'--fire':'#00d4ff','--fire2':'#0099cc','--ember':'#a0e8ff','--ice':'#a78bfa','--ice2':'#7c3aed'},
  jungle:  {'--fire':'#39ff14','--fire2':'#22c55e','--ember':'#86efac','--ice':'#ffcc00','--ice2':'#f59e0b'},
  void:    {'--fire':'#a78bfa','--fire2':'#c084fc','--ember':'#e9d5ff','--ice':'#f472b6','--ice2':'#db2777'},
};
function setTheme(key) {
  document.querySelectorAll('.theme-opt').forEach(t=>t.classList.remove('sel'));
  document.querySelector(`[data-theme="${key}"]`)?.classList.add('sel');
  const theme = _themes[key] || {};
  Object.keys(_themes.arctic).forEach(k=>document.documentElement.style.removeProperty(k));
  Object.entries(theme).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
  try { localStorage.setItem('ns_theme', key); } catch(e) {}
  hapticTap(); sfxSelect();
}

// ═══ SIDEBAR TOGGLE (mobile) ═══
function toggleSidebar() {
  const sidebar = document.getElementById('game-sidebar');
  if (sidebar) { sidebar.classList.toggle('open'); hapticTap(); sfxNav(); }
}

// Drawer CSS is in components.css — no JS injection needed

// ═══ INIT ═══
// DOMContentLoaded consolidated into main.js
