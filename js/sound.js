// No Signal v1.1.2 — sound.js
// Web Audio SFX, haptics, particle system, settings drawer, theme switcher
// Loaded after ai.js, before main.js

// ═══ SETTINGS STATE ═══
const NS = {
  sound: false,
  haptic: true,
  flash: true,
  particles: true,
  scanlines: true,
};

try {
  const stored = localStorage.getItem('ns_ui_settings');
  if (stored) Object.assign(NS, JSON.parse(stored));
} catch(e) {}

function nsSave() {
  try { localStorage.setItem('ns_ui_settings', JSON.stringify(NS)); } catch(e) {}
}

// Apply scanlines setting on load
function applyScanlinesState() {
  document.documentElement.classList.toggle('no-scan', !NS.scanlines);
}

// ═══ AUDIO ═══
let _actx = null;

// Create AudioContext eagerly on FIRST user interaction — mobile browsers require this.
// Once created during a gesture, subsequent calls work even without a gesture.
function _initAudio() {
  if (_actx) return;
  try {
    _actx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) { _actx = null; }
}

function getAC() {
  if (!NS.sound) return null;
  if (!_actx) return null; // not yet initialised — need a user gesture first
  if (_actx.state === 'suspended') _actx.resume().catch(()=>{});
  return _actx;
}

function playTone(f, t='sine', d=0.15, v=0.09, delay=0) {
  const c = getAC(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = t; o.frequency.value = f;
    const T = c.currentTime + delay;
    g.gain.setValueAtTime(v, T);
    g.gain.exponentialRampToValueAtTime(0.001, T + d);
    o.start(T); o.stop(T + d);
  } catch(e) {}
}

function sfxVote()   { playTone(220,'sine',0.07,0.09); playTone(440,'sine',0.1,0.07,0.05); playTone(330,'triangle',0.16,0.05,0.09); }
function sfxElim()   { [80,70,60,50,40].forEach((f,i)=>playTone(f,'sawtooth',0.38,0.06,i*0.11)); playTone(220,'sine',0.5,0.04,0.62); }
function sfxWin()    { [523,659,784,1047].forEach((f,i)=>playTone(f,'sine',0.14,0.09,i*0.09)); }
function sfxAdv()    { playTone(440,'sine',0.09,0.06); playTone(550,'sine',0.09,0.05,0.07); }
function sfxSelect() { playTone(660,'sine',0.1,0.07); }
function sfxTick()   { playTone(880,'sine',0.06,0.05); }
function sfxOpen()   { playTone(440,'sine',0.08,0.06); playTone(550,'sine',0.08,0.05,0.06); }

// ═══ HAPTICS ═══
function haptic(p=[8]) {
  if (!NS.haptic) return;
  try { if (navigator.vibrate) navigator.vibrate(p); } catch(e) {}
}
function hapticVote()   { haptic([15,8,15]); }
function hapticElim()   { haptic([50,30,80,30,50]); }
function hapticTap()    { haptic([7]); }
function hapticWin()    { haptic([20,15,40]); }
function hapticAdv()    { haptic([8]); }

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
    this.vx=(Math.random()-.5)*4;
    this.vy=-Math.random()*5-2;
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

// ═══ SOUND TOGGLE (header button) ═══
function toggleNsSound() {
  NS.sound = !NS.sound;
  nsSave();
  // Create AudioContext on this gesture — guaranteed to work on mobile
  if (NS.sound) _initAudio();
  _updateSoundBtn();
  const ts = document.getElementById('ns-t-sound');
  if (ts) ts.classList.toggle('on', NS.sound);
  if (NS.sound) { setTimeout(()=>sfxTick(), 50); hapticTap(); }
}

function _updateSoundBtn() {
  const icon  = document.getElementById('sound-hdr-icon');
  const label = document.getElementById('sound-hdr-label');
  const btn   = document.getElementById('sound-hdr-btn');
  if (icon)  icon.textContent  = NS.sound ? '🔊' : '🔇';
  if (label) label.textContent = NS.sound ? 'SOUND ON' : 'SOUND OFF';
  if (btn)   btn.style.borderColor = NS.sound ? 'var(--fire)' : '';
  if (btn)   btn.style.color       = NS.sound ? 'var(--fire)' : '';
}

// ═══ SETTINGS DRAWER TOGGLE ═══
function nsToggle(key) {
  NS[key] = !NS[key];
  const el = document.getElementById('ns-t-'+key);
  if (el) el.classList.toggle('on', NS[key]);
  nsSave();
  hapticTap();
  if (NS.sound) sfxTick();
  if (key==='sound') { if (NS.sound) _initAudio(); _updateSoundBtn(); }
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
  // reset to defaults first
  Object.keys(_themes.arctic).forEach(k=>document.documentElement.style.removeProperty(k));
  Object.entries(theme).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
  try { localStorage.setItem('ns_theme', key); } catch(e) {}
  hapticTap(); if(NS.sound) sfxSelect();
}

// ═══ DRAWER CSS (injected here to keep it out of the CSS files) ═══
(function injectDrawerCSS() {
  const s = document.createElement('style');
  s.textContent = `
    .drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:300;opacity:0;pointer-events:none;transition:opacity 0.25s;backdrop-filter:blur(4px)}
    .drawer-backdrop.open{opacity:1;pointer-events:all}
    .drawer{position:fixed;right:0;top:0;bottom:0;width:290px;max-width:88vw;background:var(--deep);border-left:1px solid var(--border);z-index:301;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);overflow-y:auto}
    .drawer.open{transform:translateX(0)}
    .drawer-head{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
    .drawer-title{font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:0.06em;color:var(--fire)}
    .drawer-close{font-size:18px;color:var(--text3);cursor:pointer;padding:4px 6px;background:none;border:none;transition:color 0.2s}
    .drawer-close:hover{color:var(--text)}
    .drawer-section{padding:12px 16px;border-bottom:1px solid var(--border)}
    .drawer-label{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.14em;color:var(--text3);text-transform:uppercase;margin-bottom:10px}
    .theme-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:4px}
    .theme-opt{padding:9px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);font-family:'Space Mono',monospace;font-size:9px;font-weight:700;cursor:pointer;text-align:center;transition:all 0.18s;letter-spacing:0.06em;color:var(--text2)}
    .theme-opt:hover{border-color:var(--border2);color:var(--text)}
    .theme-opt.sel{border-color:var(--fire);background:rgba(232,69,10,0.08);color:var(--fire)}
    .dark-toggle-btn.on{border-color:var(--fire)!important;color:var(--fire)!important;background:rgba(232,69,10,0.1)!important}
    html.no-scan body::before{display:none}
  `;
  document.head.appendChild(s);
})();

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded', () => {
  // Sync toggle states
  Object.keys(NS).forEach(key => {
    const el = document.getElementById('ns-t-'+key);
    if (el) el.classList.toggle('on', NS[key]);
  });
  _updateSoundBtn();
  applyScanlinesState();
  // Restore theme
  try {
    const t = localStorage.getItem('ns_theme');
    if (t && _themes[t]) setTheme(t);
  } catch(e) {}
  // Dark mode class for compat (game is always dark now)
  document.documentElement.classList.add('dark');
});

// ═══ SIDEBAR TOGGLE (mobile) ═══
function toggleSidebar() {
  const sidebar = document.getElementById('game-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
    hapticTap();
  }
}

// ═══ RESUME AUDIO on first interaction (browser policy) ═══
document.addEventListener('click', function resumeAudio() {
  if (_actx && _actx.state === 'suspended') _actx.resume();
}, { once: false });
