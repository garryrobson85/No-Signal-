// No Signal — state.js
// Game state (G), utilities, contestant/team builders

// ===== STATE =====
// Centralized project version — used in seed hashing and any place that needs it.
// Bump on actual schema changes, not casual edits.
const PROJECT_VERSION = 'no-signal-v4';

let G = {
  cast:[], teams:[], settings:{},
  twists:new Set(TWISTS_DATA.map(t=>t.id)),
  episode:1, merged:false, jury:[],
  episodeLog:[], dramaLevel:0, idolHolders:[],
  alliances:[], challengeWinStreaks:{},
  currentEpData:null, stageIndex:0,
  extraVoteHolders:[], stealVoteHolders:[],
  pendingChallenge:null,
  rngState:null, relationships:{},
  placementHistory:[], allianceLog:[], fanSaveUsed:false, fanSavePlayer:null,
  memories:[],  // persistent contestant memory events — see memory.js
  producerPowers:{}, // producer mode power usage tracking — see producer.js
  playerContestantId:null, // null=simulate mode; set to cast id=play mode (reserved for v2 play mode)
  perceivedRelationships:{}, // future: how players THINK others feel about them (diverges from relationships)
                              // Structure: {subjectId: {objectId: perceivedScore 0-100}}
                              // When perception ≠ reality → blindsides, paranoia, false security
};

// ===== UTILITIES =====
function hashSeed(str){
  let h=2166136261>>>0;
  str=String(str||'');
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function seededRandom(){
  if(!G.settings||!G.settings.seed) return Math.random();
  if(G.rngState==null) G.rngState=hashSeed(G.settings.seed+'|'+(G.episode||1)+'|'+PROJECT_VERSION);
  G.rngState=(Math.imul(1664525,G.rngState)+1013904223)>>>0;
  return G.rngState/4294967296;
}
const rng=(min,max)=>Math.floor(seededRandom()*(max-min+1))+min;
const pick=arr=>arr[rng(0,arr.length-1)];
const shuffle=arr=>{let a=[...arr];for(let i=a.length-1;i>0;i--){let j=rng(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
const uid=()=>Math.random().toString(36).slice(2,8);
const isOn=id=>document.getElementById(id)?.classList.contains('on');

// HTML escaping for any user-supplied string that flows into innerHTML / template literals.
// Always escape: cast names, season name, tribe names, custom dialogue, anything imported via save file.
// A contestant named '<img src=x onerror=alert(1)>' becomes inert text after this.
function escapeHtml(s){
  if(s==null) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
// Shorthand for templates: `${esc(name)}` is easier on the eyes than the full name.
const esc=escapeHtml;

let _notifyQueue=[],_notifyShowing=false,_lastNotifyMsg='';
function notify(msg,type='fire'){
  // Collapse identical adjacent messages so progress flows like "Sending → Sending → Sending" don't stack.
  if(msg===_lastNotifyMsg && _notifyShowing) return;
  _lastNotifyMsg=msg;
  _notifyQueue.push({msg,type});
  if(!_notifyShowing) _showNextNotify();
}
function _showNextNotify(){
  if(!_notifyQueue.length){_notifyShowing=false;return;}
  _notifyShowing=true;
  const {msg,type}=_notifyQueue.shift();
  const el=document.getElementById('notification');
  el.textContent=msg; el.className=`notification type-${type} show`;
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(_showNextNotify,300);
  },2200);
}
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function goHome(){
  // Auto-save if there's an active game
  if(G.currentEpData&&G.cast.length) saveGame(true);
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-home').classList.add('active');
  document.getElementById('header-ep-badge').style.display='none';
  updateContinueButton();
}
function goSetup(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-setup').classList.add('active');
  if(!G.cast.length) generateRandomCast(12);
  renderTwistsGrid();
  setupNav('general',document.querySelector('[data-panel="general"]'));
  updateTeamsPanel();
}
function setupNav(panel,el){
  try {
    // el might be a child span if the user tapped on the icon/label inside the nav div.
    // Walk up to the actual .setup-nav-item so we add 'active' to the right element.
    if(el && !el.classList.contains('setup-nav-item')){
      el = el.closest('.setup-nav-item') || el;
    }
    document.querySelectorAll('.setup-nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelectorAll('.setup-panel').forEach(p=>p.classList.remove('active'));
    if(el && el.classList) el.classList.add('active');
    const target = document.getElementById('panel-'+panel);
    if(!target){
      console.error('setupNav: panel-'+panel+' not found in DOM');
      notify('Panel "'+panel+'" not found — refresh the page');
      // Restore the General panel as a safe fallback so the user isn't stuck on a blank screen
      const fallback = document.getElementById('panel-general');
      if(fallback) fallback.classList.add('active');
      return;
    }
    target.classList.add('active');
    if(panel==='teams') updateTeamsPanel();
    if(panel==='cast') renderCastList();
    if(panel==='twists') renderTwistsGrid();
  } catch(err) {
    console.error('setupNav failed:', err);
    notify('Setup nav error: '+(err.message||'unknown').slice(0,60));
    // Recovery: force General panel back so the user can keep working
    document.querySelectorAll('.setup-panel').forEach(p=>p.classList.remove('active'));
    const g = document.getElementById('panel-general');
    if(g) g.classList.add('active');
  }
}

// ===== CONTESTANT =====
// Track used names within a generation run to prevent duplicates
const _usedFirstNames=new Set(), _usedLastNames=new Set();
function makeName(){
  // Pick a first name not already used; fall back to any if all are exhausted
  const availFirst=FIRST_NAMES.filter(n=>!_usedFirstNames.has(n));
  const first=availFirst.length?pick(availFirst):pick(FIRST_NAMES);
  _usedFirstNames.add(first);
  const availLast=LAST_NAMES.filter(n=>!_usedLastNames.has(n));
  const last=availLast.length?pick(availLast):pick(LAST_NAMES);
  _usedLastNames.add(last);
  return first+' '+last;
}
function resetNamePool(){_usedFirstNames.clear();_usedLastNames.clear();}
function makeContestant(overrides={}){
  const name=overrides.name||makeName();
  const color=overrides.color||pick(PALETTE);
  return{
    id:uid(),name,color,
    initials:name.split(' ').map(w=>w[0]).join('').slice(0,2),
    archetype:overrides.archetype||pick(ARCHETYPES),
    personality:overrides.personality||pick(PERSONALITIES),
    physical:overrides.physical??rng(3,10),social:overrides.social??rng(3,10),
    mental:overrides.mental??rng(3,10),endurance:overrides.endurance??rng(3,10),
    team:overrides.team??null, eliminated:false, juryMember:false,
    votes:0, immunity:false, hasIdol:false, idolPlayed:false,
    challengeWins:0, allianceIds:[], elimEp:null, juryReturn:false,
    _portrait:null, customImage:overrides.customImage||null,
  };
}
function getPortrait(c){
  // Custom uploaded image takes priority over generated SVG portrait
  if(c.customImage){
    // Return a consistently-sized <img> with the stored base64 data
    return`<img src="${c.customImage}" alt="${c.name}" style="width:120px;height:145px;object-fit:cover;object-position:top;border-radius:12px;display:block;">`;
  }
  // Cache key includes properties that affect appearance — auto-invalidates on change
  const key=`${c.color}|${c.personality}|${c.archetype}`;
  if(c._portraitKey!==key){
    c._portrait=generatePortrait(c);
    c._portraitKey=key;
  }
  return c._portrait;
}
function updateContestantPortrait(c){c._portraitKey=null;}
function addContestant(){const c=makeContestant();G.cast.push(c);renderCastList();updateCastNavCount();}
function generateRandomCast(n=12){G.cast=[];resetNamePool();for(let i=0;i<n;i++)G.cast.push(makeContestant());renderCastList();updateCastNavCount();notify(`Generated ${n} contestants! ✨`);}
function removeContestant(id){G.cast=G.cast.filter(c=>c.id!==id);renderCastList();updateCastNavCount();updateTeamsPanel();}
function updateCastNavCount(){
  const el=document.getElementById('cast-nav-count');
  el.textContent=G.cast.length; el.classList.toggle('show',G.cast.length>0);
  const d=document.getElementById('cast-count-display'); if(d) d.textContent=`(${G.cast.length})`;
}
function renderCastList(){
  const container=document.getElementById('cast-list-container'); if(!container) return;
  if(!G.cast.length){container.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥<\/div><div>No contestants yet.<\/div><\/div>`;return;}
  container.innerHTML=G.cast.map((c,i)=>`
    <div class="cast-card anim-in" id="cast-card-${c.id}" style="animation-delay:${i*0.03}s">
      <div class="cast-card-header">
        <div class="cast-portrait-upload" id="cpu-${c.id}">
          <div class="cpu-img-wrap" onclick="triggerImageUpload('${c.id}')" title="${c.customImage?'Click to change photo':'Click to upload photo'}">
            ${getPortrait(c).replace('width:120px;height:145px','width:76px;height:92px').replace('width="120" height="145"','width="76" height="92"')}
            <div class="cpu-overlay">${c.customImage?'📷 Change':'📷 Upload'}<\/div>
          <\/div>
          <input type="file" id="img-input-${c.id}" accept="image/*" style="display:none" onchange="handleImageUpload('${c.id}',this)">
          ${c.customImage?`<button class="cpu-clear-btn" onclick="clearImage('${c.id}')" title="Remove photo">✕<\/button>`:''}
        <\/div>
        <div style="flex:1;min-width:0">
          <input class="cast-name-edit" value="${esc(c.name)}" oninput="updateContestant('${c.id}','name',this.value)" placeholder="Contestant name">
          <div class="cpu-hint">${c.customImage?`<span style="color:var(--leaf);font-size:11px">✓ Custom photo<\/span>`:`<span style="color:var(--text3);font-size:11px">Click portrait to upload or change colour<\/span>`}<\/div>
          ${!c.customImage?`<button class="cpu-color-btn" onclick="pickColor('${c.id}')" style="margin-top:4px">🎨 Colour<\/button>`:''}
        <\/div>
        <button class="cast-del" onclick="removeContestant('${c.id}')" title="Remove">✕<\/button>
      <\/div>
      <div class="cast-badges" style="margin-bottom:10px">
        <select class="cast-select" onchange="updateContestant('${c.id}','personality',this.value)">
          ${PERSONALITIES.map(p=>`<option${c.personality===p?' selected':''}>${p}<\/option>`).join('')}
        <\/select>
        <select class="cast-select" onchange="updateContestant('${c.id}','archetype',this.value)">
          ${ARCHETYPES.map(a=>`<option${c.archetype===a?' selected':''}>${a}<\/option>`).join('')}
        <\/select>
      <\/div>
      <div class="cast-stats">
        ${renderStatRow('physical',c.physical,'#0EA5E9',c.id)}
        ${renderStatRow('social',c.social,'#16A34A',c.id)}
        ${renderStatRow('mental',c.mental,'#9333EA',c.id)}
        ${renderStatRow('endurance',c.endurance,'#EAB308',c.id)}
      <\/div>
    <\/div>`).join('');
}
function renderStatRow(stat,val,color,id){
  return `<div class="stat-row">
    <span class="stat-name">${stat.slice(0,3).toUpperCase()}<\/span>
    <div class="stat-track"><div class="stat-fill" id="sf-${id}-${stat}" style="width:${val*10}%;background:${color}"><\/div><\/div>
    <input type="range" class="stat-input" min="1" max="10" value="${val}"
      oninput="updateContestant('${id}','${stat}',+this.value);document.getElementById('sf-${id}-${stat}').style.width=(this.value*10)+'%';document.getElementById('sn-${id}-${stat}').textContent=this.value">
    <span class="stat-num" id="sn-${id}-${stat}">${val}<\/span>
  <\/div>`;
}
function updateContestant(id,field,val){
  const c=G.cast.find(x=>x.id===id); if(!c) return;
  // Names and other free-text fields must never carry raw HTML. Strip the dangerous metacharacters
  // at the input boundary so display sites can safely interpolate.
  if(field==='name' && typeof val==='string'){
    val=val.replace(/[<>"'`]/g,'').slice(0,40);
  }
  c[field]=val; c._portrait=null;
  if(field==='name'){c.initials=val.split(' ').map(w=>w[0]).join('').slice(0,2)||'?';}
}
function updateTeamName(idx,val){
  if(!G.teams[idx]) return;
  G.teams[idx].name=String(val||'').replace(/[<>"'`]/g,'').slice(0,30);
}

let _colorPickTarget=null,_teamColorTarget=null;
function pickColor(id){
  _colorPickTarget=id; _teamColorTarget=null;
  const c=G.cast.find(x=>x.id===id);
  document.getElementById('color-grid-container').innerHTML=PALETTE.map(col=>`
    <div class="color-swatch${c&&c.color===col?' selected':''}" style="background:${col}" onclick="applyColor('${col}')"><\/div>`).join('');
  openModal('modal-color-pick');
}
function applyColor(col){
  if(_colorPickTarget){
    const c=G.cast.find(x=>x.id===_colorPickTarget);
    if(c){c.color=col;c._portrait=null;}
    closeModal('modal-color-pick');
    // Refresh just that card portrait
    const wrap=document.querySelector(`#cast-card-${_colorPickTarget} .cast-portrait-wrap`);
    if(wrap&&c) wrap.innerHTML=getPortrait(c);
  } else if(_teamColorTarget!==null){
    G.teams[_teamColorTarget].color=col;
    closeModal('modal-color-pick');
    renderTeamCards();
  }
}

// ===== TEAMS =====
function initTeams(){
  const n=+document.getElementById('s-num-teams').value;
  const names=['Tribe '+TRIBE_NAMES[0],'Tribe '+TRIBE_NAMES[1],'Tribe '+TRIBE_NAMES[2],'Tribe '+TRIBE_NAMES[3]];
  const colors=[PALETTE[0],PALETTE[1],PALETTE[2],PALETTE[6]];
  if(G.teams.length!==n){G.cast.forEach(c=>c.team=null);G.teams=[];for(let i=0;i<n;i++)G.teams.push({id:uid(),name:names[i],color:colors[i]});}
  updateTeamsPanel();
}
function autoAssignTeams(){
  const n=G.teams.length||+document.getElementById('s-num-teams').value;
  if(!G.teams.length) initTeams();
  shuffle([...G.cast]).forEach((c,i)=>c.team=i%n);
  updateTeamsPanel(); notify('Players auto-assigned! 🔀');
}
function updateTeamsPanel(){if(G.teams.length===0)initTeams();renderUnassignedPool();renderTeamCards();}
function renderUnassignedPool(){
  const pool=document.getElementById('unassigned-pool'); if(!pool) return;
  const unassigned=G.cast.filter(c=>c.team===null||c.team===undefined);
  if(!unassigned.length){pool.innerHTML=`<div style="font-size:12px;color:var(--text3);padding:6px">All players assigned ✓<\/div>`;return;}
  pool.innerHTML=unassigned.map(c=>`<span class="pool-chip" onclick="showAssignMenu('${c.id}',event)">
    <span style="width:16px;height:16px;border-radius:50%;background:${c.color};display:inline-block;flex-shrink:0"><\/span>${c.name.split(' ')[0]}<\/span>`).join('');
}
function showAssignMenu(cid,event){
  const existing=document.getElementById('assign-menu'); if(existing) existing.remove();
  const menu=document.createElement('div'); menu.id='assign-menu';
  menu.style.cssText=`position:fixed;background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:6px;box-shadow:var(--shadow-lg);z-index:500;min-width:150px`;
  menu.style.top=(event.clientY+8)+'px'; menu.style.left=event.clientX+'px';
  menu.innerHTML=G.teams.map((t,i)=>`<div onclick="assignToTeam('${cid}',${i});this.closest('#assign-menu').remove()"
    style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-radius:7px;font-size:13px"
    onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
    <span style="width:12px;height:12px;border-radius:50%;background:${t.color};display:inline-block"><\/span>${t.name}<\/div>`).join('');
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),50);
}
function assignToTeam(cid,ti){const c=G.cast.find(x=>x.id===cid);if(c)c.team=ti;updateTeamsPanel();}
function removeFromTeam(cid){const c=G.cast.find(x=>x.id===cid);if(c)c.team=null;updateTeamsPanel();}
function renderTeamCards(){
  const container=document.getElementById('team-config-container'); if(!container) return;
  container.innerHTML=G.teams.map((t,ti)=>{
    const members=G.cast.filter(c=>c.team===ti);
    return `<div class="team-card" style="border-left-color:${t.color}">
      <div class="team-card-header">
        <div class="team-color-dot" style="background:${t.color}" onclick="pickTeamColor(${ti})" title="Change color"><\/div>
        <input class="team-name-edit" value="${esc(t.name)}" oninput="updateTeamName(${ti},this.value)">
        <span class="badge badge-gray">${members.length} members<\/span>
      <\/div>
      <div class="team-members-area" id="team-area-${ti}">
        ${members.map(c=>`<span class="member-chip" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44" onclick="removeFromTeam('${c.id}')">
          <span style="width:14px;height:14px;border-radius:50%;background:${c.color};display:inline-block;flex-shrink:0"><\/span>
          ${c.name.split(' ')[0]} <span style="opacity:0.5;font-size:10px">✕<\/span><\/span>`).join('')}
        ${!members.length?`<div style="font-size:12px;color:var(--text3);padding:4px">No members — click unassigned players above<\/div>`:''}
      <\/div>
    <\/div>`;
  }).join('');
}
function pickTeamColor(ti){
  _teamColorTarget=ti; _colorPickTarget=null;
  document.getElementById('color-grid-container').innerHTML=PALETTE.map(col=>`
    <div class="color-swatch${G.teams[ti]&&G.teams[ti].color===col?' selected':''}" style="background:${col}" onclick="applyColor('${col}')"><\/div>`).join('');
  openModal('modal-color-pick');
}
function renderTwistsGrid(){
  const container=document.getElementById('twist-grid-container'); if(!container) return;
  container.innerHTML=TWISTS_DATA.map(t=>`<div class="twist-card${G.twists.has(t.id)?' selected':''}" onclick="toggleTwist('${t.id}',this)">
    <div class="twist-check">✓<\/div><div class="twist-icon">${t.icon}<\/div>
    <div class="twist-name">${t.name}<\/div><div class="twist-desc">${t.desc}<\/div>
    <div style="margin-top:6px"><span class="badge badge-gray" style="font-size:9px">${t.rarity}<\/span><\/div>
  <\/div>`).join('');
}
function toggleTwist(id,el){el.classList.toggle('selected');if(G.twists.has(id))G.twists.delete(id);else G.twists.add(id);}

// ===== START SEASON =====
function toggleReturneeSettings(toggle){
  const cfg=document.getElementById('returnee-config');
  if(cfg) cfg.style.display=toggle.classList.contains('on')?'block':'none';
}
function startSeason(){
  if(G.cast.length<4){alert('Add at least 4 contestants!');return;}
  const unassigned=G.cast.filter(c=>c.team===null||c.team===undefined);
  if(unassigned.length>0){if(!confirm(`${unassigned.length} player(s) have no team. Auto-assign?`))return;autoAssignTeams();}
  G.settings={
    name:document.getElementById('s-name').value||'Season 1',
    theme:document.getElementById('s-theme').value,
    flavor:document.getElementById('s-flavor').value,
    seed:document.getElementById('s-seed')?.value.trim()||'',
    mergeEpisode:+document.getElementById('s-merge').value||6,
    finaleSize:+document.getElementById('s-finale-size').value||3,
    voteSystem:document.getElementById('s-vote-system').value,
    tiebreak:document.getElementById('s-tiebreak').value,
    alliances:isOn('t-alliances'),confessionals:isOn('t-confessionals'),
    drama:isOn('t-drama'),idols:isOn('t-idols'),jury:isOn('t-jury'),
    interactions:isOn('t-interactions'),streaks:isOn('t-streaks'),log:isOn('t-log'),
    twistFreq:+document.getElementById('s-twist-freq').value||15,
    randomness:+document.getElementById('s-randomness').value||30,
    allianceStr:+document.getElementById('s-alliance-str').value||60,
    idolDiff:document.getElementById('s-idol-diff').value,
    dramaRate:document.getElementById('s-drama-rate').value,
    tone:document.getElementById('s-tone').value,
    showScores:isOn('t-scores'),showVotes:isOn('t-show-votes'),returnees:isOn('t-returnees'),
    rejoinEpisode:isOn('t-returnees')?(+document.getElementById('s-rejoin-ep')?.value||4):null,
    rejoinCount:isOn('t-returnees')?(+document.getElementById('s-rejoin-count')?.value||1):0,
  };
  G.episode=1;G.merged=false;G.jury=[];G.episodeLog=[];G.dramaLevel=0;G.idolHolders=[];G.rngState=null;G.relationships={};
  G.alliances=[];G.challengeWinStreaks={};G.extraVoteHolders=[];G.stealVoteHolders=[];
  G.cast.forEach(c=>{c.eliminated=false;c.juryMember=false;c.votes=0;c.immunity=false;c.hasIdol=false;c.idolPlayed=false;c.challengeWins=0;c.allianceIds=[];c.elimEp=null;c.juryReturn=false;});
  if(G.settings.alliances) buildAlliances();
  document.getElementById('header-ep-badge').style.display='flex';
  showGameScreen();
  computeAndStartEpisode();
}
// Records an alliance lifecycle event into G.allianceLog for later replay / story analysis.
// Action is 'formed' | 'broken' | 'forced'. Episode defaults to current G.episode.
function logAlliance(action, alliance, ep){
  if(!G.allianceLog) G.allianceLog=[];
  G.allianceLog.push({
    action,
    allianceId: alliance.id,
    name: alliance.name,
    members: [...(alliance.members||[])],
    episode: ep||G.episode||1,
    at: Date.now()
  });
}

function buildAlliances(){
  G.alliances=[];
  const players=shuffle([...G.cast]);
  for(let i=0;i<players.length-1;i+=2){
    const a=players[i],b=players[i+1],alId=uid();
    a.allianceIds.push(alId);b.allianceIds.push(alId);
    const al={id:alId,members:[a.id,b.id],name:`${a.name.split(' ')[0]}-${b.name.split(' ')[0]} duo`};
    G.alliances.push(al);
    logAlliance('formed', al, 1);
  }
  if(players.length>=6){
    const trio=shuffle(players).slice(0,3),alId=uid();
    trio.forEach(p=>p.allianceIds.push(alId));
    const al={id:alId,members:trio.map(p=>p.id),name:`${trio[0].name.split(' ')[0]}'s trio`};
    G.alliances.push(al);
    logAlliance('formed', al, 1);
  }
}

// ===== GAME SCREEN =====
function showGameScreen(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-game').classList.add('active');
  updateGameSidebar();
}
function updateGameSidebar(){
  const active=getActive();
  document.getElementById('gs-ep-num').textContent=G.episode;
  const phase=G.merged?(active.length<=G.settings.finaleSize?'Finale':'Post-Merge'):'Pre-Merge';
  document.getElementById('gs-ep-label').textContent=phase;
  document.getElementById('hdr-ep-txt').textContent=`Ep ${G.episode} · ${G.settings.name}`;
  const badge=document.getElementById('gs-phase-badge');
  badge.textContent=phase;
  badge.className='gs-status-badge '+(G.merged?(phase==='Finale'?'gs-status-finale':'gs-status-merge'):'gs-status-pre');
  const total=G.cast.length-G.settings.finaleSize;
  const eliminated=G.cast.filter(c=>c.eliminated).length;
  document.getElementById('gs-progress-txt').textContent=`${eliminated}/${total} out`;
  document.getElementById('gs-progress-bar').style.width=total>0?(eliminated/total*100)+'%':'0%';
  if(G.settings.drama){
    document.getElementById('drama-meter-wrap').style.display='block';
    document.getElementById('drama-bars').innerHTML=Array.from({length:5},(_,i)=>`<div class="drama-pip${i<G.dramaLevel?' active':''}"><\/div>`).join('');
  }
  const playerList=document.getElementById('gs-player-list');
  if(G.merged){
    playerList.innerHTML=`<div class="gs-tribe-label" style="color:rgba(255,255,255,0.4)">MERGED TRIBE<\/div>`+active.map(c=>gsPlayerChip(c)).join('');
  } else {
    playerList.innerHTML=G.teams.map((t,ti)=>{
      const members=active.filter(c=>c.team===ti); if(!members.length) return '';
      return `<div class="gs-tribe-group"><div class="gs-tribe-label" style="color:${t.color}">${t.name.toUpperCase()}<\/div>${members.map(c=>gsPlayerChip(c)).join('')}<\/div>`;
    }).join('');
  }
}
function gsPlayerChip(c){
  const idol=G.idolHolders.includes(c.id);
  // Custom image: use <img> cropped to circle; otherwise use generated SVG
  const miniPortrait=c.customImage
    ? `<img src="${c.customImage}" alt="${c.name}" style="width:28px;height:28px;object-fit:cover;object-position:top;border-radius:50%;display:block;">`
    : getPortrait(c).replace('width="120" height="145"','width="28" height="34"').replace('viewBox="0 0 120 145"','viewBox="15 20 90 95"');
  return `<div class="gs-player${c.immunity?' immune':''}${c.juryMember?' jury-member':''}${idol?' has-idol':''}" onclick="showPlayerDetail('${c.id}')">
    <div class="mini-avatar" style="background:${c.color};overflow:hidden;padding:0">${miniPortrait}<\/div>
    <span class="p-name">${c.name.split(' ')[0]}<\/span>
    ${idol?'<span style="font-size:9px">💎<\/span>':''}
    ${c.immunity?'<span style="font-size:9px">🛡️<\/span>':''}
    ${!G.merged&&c.team!==null&&G.teams[c.team]?`<span class="p-team-dot" style="background:${G.teams[c.team].color}"><\/span>`:''}
  <\/div>`;
}


// ===== PLAY MODE ARCHITECTURE SEEDS =====
// These stubs exist so play mode can be added post-launch without
// restructuring the engine. Simulate mode ignores them entirely.

/**
 * getPerceivedScore(subjectId, objectId)
 * Returns how subjectId THINKS objectId feels about them.
 * Currently mirrors the real relationship score (no divergence yet).
 * In the full perception system this will differ based on:
 *   - visible signals (who talked to them, how they voted)
 *   - personality biases (paranoid types underestimate safety)
 *   - deliberate deception by other players
 * Stub now — full implementation in perception system update.
 */
function getPerceivedScore(subjectId, objectId){
  // Check if we have a perceived score stored
  const perceived=(G.perceivedRelationships||{})[subjectId]?.[objectId];
  if(perceived!=null) return perceived;
  // Fall back to real relationship score — no divergence yet
  return v19RelScore(subjectId, objectId);
}

/**
 * setPerceivedScore(subjectId, objectId, score)
 * Updates how subjectId perceives their relationship with objectId.
 * Will be called by social interaction events, deception mechanics,
 * and personality-based distortion in the full perception system.
 */
function setPerceivedScore(subjectId, objectId, score){
  if(!G.perceivedRelationships) G.perceivedRelationships={};
  if(!G.perceivedRelationships[subjectId]) G.perceivedRelationships[subjectId]={};
  G.perceivedRelationships[subjectId][objectId]=Math.max(0,Math.min(100,score));
}

/**
 * getPlayerView()
 * Returns a filtered read of G state representing only what the player's
 * character could realistically know — their alliances, their relationships,
 * votes they personally witnessed, memories they've experienced.
 *
 * In simulate mode: always returns null (unused).
 * In play mode: returns {alliances, relationships, memories, knownVotes}
 * filtered to playerContestantId's perspective.
 *
 * Imperfect information is the core tension of play mode — the player
 * should never see the full G state, only their character's knowledge.
 */
function getPlayerView(){
  if(!G.playerContestantId) return null; // simulate mode — no player perspective
  const pid = G.playerContestantId;

  // Alliances the player is actually in
  const myAlliances = (G.alliances||[]).filter(a=>a.members.includes(pid));

  // Relationships the player has directly experienced (not inferred)
  const myRelationships = {};
  Object.entries(G.relationships||{}).forEach(([key,score])=>{
    if(key.includes(pid)) myRelationships[key] = score;
  });

  // Memories where the player is subject or object
  const myMemories = (G.memories||[]).filter(m=>
    m.subject===pid || m.object===pid
  );

  // Votes the player has personally witnessed (parchments they've seen flipped)
  const knownVotes = (G.currentEpData?._renderedVoteOrder||[])
    .slice(0, G.stageIndex >= 3 ? undefined : 0); // only after tribal

  return { alliances:myAlliances, relationships:myRelationships,
           memories:myMemories, knownVotes };
}

/**
 * isPlayMode()
 * Convenience check — true if a human player contestant is set.
 */
function isPlayMode(){
  return !!G.playerContestantId;
}