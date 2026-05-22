// No Signal — save.js
// Save / load, autosave, export, demo loader

// ===== DEMO =====
function loadQuickDemo(){
  G.cast=[];
  [['Alex Carter','#E8450A','Strategic','The Strategist',8,7,9,6],['Morgan Rivera','#0EA5E9','Loyal','The Fan Favorite',5,10,7,8],
   ['Casey Thompson','#16A34A','Villain','The Big Villain',9,6,8,10],['Jordan Kim','#9333EA','Hero','The Underdog',6,8,5,9],
   ['Taylor Walsh','#EAB308','Chaotic','The Loose Cannon',7,9,6,7],['Sam Okafor','#EC4899','Social','The Social Butterfly',4,10,8,6],
   ['Riley Nakamura','#06B6D4','Floater','The Quiet Threat',7,7,9,7],['Quinn Santos','#F97316','Hothead','The Challenge Beast',10,5,6,10],
   ['Blake Bellamy','#84CC16','Peacemaker','The Sweetheart',5,9,7,8],['Drew Hassan','#6366F1','Schemer','The Manipulator',6,8,10,5],
   ['Sage Nguyen','#14B8A6','Nerd','The Narrator',5,7,10,6],['Avery Cruz','#F43F5E','Romantic','The Duo',7,9,6,8],
  ].forEach(([name,color,personality,archetype,phy,soc,men,end])=>G.cast.push(makeContestant({name,color,personality,archetype,physical:phy,social:soc,mental:men,endurance:end})));
  G.teams=[{id:uid(),name:'Tribe Fang',color:'#E8450A'},{id:uid(),name:'Tribe Kota',color:'#0EA5E9'}];
  G.cast.forEach((c,i)=>c.team=i%2);
  G.settings={name:'No Signal: Demo Season',theme:'Tropical Volcanic Island',flavor:'drama',seed:'demo-season-1',mergeEpisode:5,finaleSize:3,
    voteSystem:'plurality',tiebreak:'fire',alliances:true,confessionals:true,drama:true,idols:true,jury:true,
    interactions:true,streaks:true,log:true,twistFreq:20,randomness:35,allianceStr:65,idolDiff:'medium',
    dramaRate:'medium',tone:'dramatic',showScores:true,showVotes:true,returnees:true};
  G.twists=new Set(TWISTS_DATA.map(t=>t.id));
  G.episode=1;G.merged=false;G.jury=[];G.episodeLog=[];G.dramaLevel=0;G.idolHolders=[];G.alliances=[];G.challengeWinStreaks={};G.extraVoteHolders=[];G.stealVoteHolders=[];
  G.cast.forEach(c=>{c.eliminated=false;c.juryMember=false;c.votes=0;c.immunity=false;c.hasIdol=false;c.idolPlayed=false;c.challengeWins=0;c.allianceIds=[];c.elimEp=null;c.juryReturn=false;c._portrait=null;});
  buildAlliances();
  document.getElementById('header-ep-badge').style.display='flex';
  showGameScreen(); computeAndStartEpisode();
  notify('Demo season loaded! ⚡','win');
}
function continueGame(){showGameScreen();if(G.currentEpData)renderStage(G.stageIndex||0);}

// ===== SAVE / LOAD =====
const SAVE_VERSION=19;
const SAVE_KEY='nosignal_save_v19';
// All known past key names — scanned in order newest→oldest so we always prefer the freshest.
const LEGACY_SAVE_KEYS=[
  'nosignal_save_v18','nosignal_save_v17','nosignal_save_v16',
  'nosignal_save_v15','nosignal_save_v12','nosignal_save_v10',
  'nosignal_save_v5','nosignal_save_v4','nosignal_save_v3',
  'nosignal_save_v2','nosignal_save_v1',
  'noSignalSave','no_signal_save','nosignal_save',   // pre-versioned key variants
];

// Default settings — used to fill in any field an old save is missing.
// Every key the engine reads from G.settings must have a fallback here.
const SETTINGS_DEFAULTS = {
  name:'No Signal: Season 1', theme:'Remote Island', flavor:'drama', seed:'',
  mergeEpisode:6, finaleSize:3, voteSystem:'plurality', tiebreak:'revote',
  alliances:true, confessionals:true, drama:true, idols:true, jury:true,
  interactions:true, streaks:true, log:true,
  twistFreq:15, randomness:30, allianceStr:60, idolDiff:'medium',
  dramaRate:'medium', tone:'dramatic', showScores:true, showVotes:false,
  returnees:true, rejoinEpisode:4, rejoinCount:1,
};

function stripRuntimeFields(contestant){
  const {_portrait,_portraitKey,...rest}=contestant||{};
  return rest;
}
function buildSavePayload(){
  return {
    app:'No Signal', version:SAVE_VERSION, schema:'nosignal-season-save',
    cast:G.cast.map(stripRuntimeFields), teams:G.teams, settings:G.settings, twists:[...G.twists],
    relationships:G.relationships||{}, rngState:G.rngState,
    episode:G.episode, merged:G.merged, jury:G.jury.map(j=>j.id),
    dramaLevel:G.dramaLevel, idolHolders:G.idolHolders,
    alliances:G.alliances, challengeWinStreaks:G.challengeWinStreaks,
    extraVoteHolders:G.extraVoteHolders, stealVoteHolders:G.stealVoteHolders,
    stageIndex:G.stageIndex, currentEpData:G.currentEpData,
    memories:G.memories||[], placementHistory:G.placementHistory||[],
    producerPowers:G.producerPowers||{},
    perceivedRelationships:G.perceivedRelationships||{},
    // Persistent history — without these, season recap, story, and Previously On break across save/load
    episodeLog:G.episodeLog||[],
    allianceLog:G.allianceLog||[],
    fanSaveUsed:!!G.fanSaveUsed,
    fanSavePlayer:G.fanSavePlayer||null,
    savedAt:Date.now()
  };
}
function getSaveRaw(){
  try{
    const current=localStorage.getItem(SAVE_KEY);
    if(current) return {raw:current, fromKey:SAVE_KEY};
    for(const key of LEGACY_SAVE_KEYS){
      const legacy=localStorage.getItem(key);
      if(legacy) return {raw:legacy, fromKey:key};
    }
  }catch(e){}
  return null;
}
function hasSavedGame(){
  return !!getSaveRaw();
}

// Schema migrations — keyed by FROM version.
const SAVE_MIGRATIONS = {
  // Slot new migrations here as the schema evolves.
  // Example: 17: (save) => { save.newField = []; save.version = 18; return save; }
};

function migrateSaveIfNeeded(raw){
  let save;
  try { save=JSON.parse(raw); } catch(e){ throw new Error('Save file is not valid JSON'); }
  save.version = save.version || 1;
  save.schema  = save.schema  || 'nosignal-season-save';

  // Walk explicit version migrations
  let safety=0;
  while(SAVE_MIGRATIONS[save.version] && safety++ < 32){
    try { Object.assign(save, SAVE_MIGRATIONS[save.version](save)); }
    catch(e){ console.error(`Migration v${save.version} failed:`,e); break; }
  }

  // ── Settings: fill every missing field from SETTINGS_DEFAULTS ────────
  save.settings = Object.assign({}, SETTINGS_DEFAULTS, save.settings||{});

  // ── Arrays: guarantee required array fields exist ─────────────────────
  const arrayFields=['episodeLog','allianceLog','memories','placementHistory',
                     'idolHolders','extraVoteHolders','stealVoteHolders','alliances','cast','teams'];
  arrayFields.forEach(k=>{ if(!Array.isArray(save[k])) save[k]=[]; });

  // ── Objects: guarantee required object fields exist ───────────────────
  if(!save.relationships || typeof save.relationships!=='object') save.relationships={};
  if(!save.perceivedRelationships || typeof save.perceivedRelationships!=='object') save.perceivedRelationships={};
  if(!save.producerPowers || typeof save.producerPowers!=='object') save.producerPowers={};
  if(!save.challengeWinStreaks || typeof save.challengeWinStreaks!=='object') save.challengeWinStreaks={};

  // ── Jury: old saves stored full contestant objects, new code stores ids only ──
  if(Array.isArray(save.jury)){
    save.jury = save.jury.map(j=>{
      if(typeof j==='string') return j;         // already an id
      if(j && typeof j==='object' && j.id) return j.id;  // full object → extract id
      return null;
    }).filter(Boolean);
  } else {
    save.jury=[];
  }

  // ── Cast: backfill any missing contestant fields ──────────────────────
  const CAST_DEFAULTS={eliminated:false,juryMember:false,winner:false,allianceIds:[],
                       challengeWins:0,immunity:false,elimEp:null,archetypeHistory:[]};
  save.cast = save.cast.map(c=>{
    if(!c || typeof c!=='object') return null;
    const filled=Object.assign({},CAST_DEFAULTS,c);
    if(!Array.isArray(filled.allianceIds)) filled.allianceIds=[];
    if(!Array.isArray(filled.archetypeHistory)) filled.archetypeHistory=[];
    // Sanitize name/id
    if(typeof filled.name!=='string' || !filled.name) filled.name='Unknown';
    if(typeof filled.id!=='string' || !filled.id) filled.id=Math.random().toString(36).slice(2,8);
    return filled;
  }).filter(Boolean);

  // ── Scalars: guarantee primitive fields have sane values ─────────────
  if(typeof save.episode!=='number' || save.episode<1) save.episode=1;
  if(typeof save.merged!=='boolean') save.merged=!!save.merged;
  if(typeof save.dramaLevel!=='number') save.dramaLevel=0;
  if(typeof save.stageIndex!=='number') save.stageIndex=0;
  if(typeof save.fanSaveUsed!=='boolean') save.fanSaveUsed=!!save.fanSaveUsed;
  save.fanSavePlayer = save.fanSavePlayer||null;
  save.rngState = save.rngState||null;

  save._migrated = (save.version < SAVE_VERSION); // flag so loadGame can show a notice
  return save;
}
function downloadTextFile(filename, text, mime='application/json'){
  const blob=new Blob([text],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function seasonSlug(){
  const title=(G.settings&&G.settings.seasonName)||'no-signal-season';
  return title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'no-signal-season';
}
function saveGame(silent=false){
  try {
    const save=buildSavePayload();
    const json=JSON.stringify(save);
    localStorage.setItem(SAVE_KEY,json);
    // Keep a one-step recovery slot so a bad save/import is not fatal.
    localStorage.setItem(SAVE_KEY+'_backup',json);
    if(!silent) notify('💾 Game saved','win');
    if(json.length>4*1024*1024) notify('⚠️ Save is large ('+Math.round(json.length/1024)+'KB) — export a backup or remove some photos');
    return true;
  } catch(e){
    if(!silent) notify('Save failed — storage may be full');
    console.error('Save failed:',e);
    return false;
  }
}
function hasSavedGame(){
  return !!getSaveRaw();
}
function applyLoadedSave(save){
  G.cast=(save.cast||[]).map(c=>{
    // Imported saves can contain anything — sanitize free-text fields defensively.
    if(c&&typeof c.name==='string') c.name=c.name.replace(/[<>"'`]/g,'').slice(0,40);
    return c;
  });
  G.teams=(save.teams||[]).map(t=>{
    if(t&&typeof t.name==='string') t.name=t.name.replace(/[<>"'`]/g,'').slice(0,30);
    return t;
  });
  G.settings=Object.assign({}, G.settings||{}, save.settings||{});
  G.twists=new Set(save.twists||TWISTS_DATA.map(t=>t.id));
  G.relationships=save.relationships||{};
  G.memories=save.memories||[];
  G.placementHistory=save.placementHistory||[];
  G.producerPowers=save.producerPowers||{};
  G.perceivedRelationships=save.perceivedRelationships||{}; G.rngState=save.rngState||null;
  G.episode=save.episode||1;
  G.merged=!!save.merged;
  G.jury=(save.jury||[]).map(id=>G.cast.find(c=>c.id===id)).filter(Boolean);
  G.dramaLevel=save.dramaLevel||0;
  G.idolHolders=save.idolHolders||[];
  G.alliances=save.alliances||[];
  G.challengeWinStreaks=save.challengeWinStreaks||{};
  G.extraVoteHolders=save.extraVoteHolders||[];
  G.stealVoteHolders=save.stealVoteHolders||[];
  G.stageIndex=save.stageIndex||0;
  G.currentEpData=save.currentEpData||null;
  // Persistent history fields — restored here so season recap / story / Previously On survive reload
  G.episodeLog=save.episodeLog||[];
  G.allianceLog=save.allianceLog||[];
  G.fanSaveUsed=!!save.fanSaveUsed;
  G.fanSavePlayer=save.fanSavePlayer||null;
  if(G.currentEpData){
    const findById=id=>G.cast.find(c=>c.id===id);
    ['eliminated','eliminated2','idolFinder','winner','runnerUp'].forEach(k=>{
      if(G.currentEpData[k]&&G.currentEpData[k].id) G.currentEpData[k]=findById(G.currentEpData[k].id)||G.currentEpData[k];
    });
  }
}
function loadGame(){
  try {
    const found=getSaveRaw();
    if(!found) return false;
    const {raw, fromKey} = found;
    const save=migrateSaveIfNeeded(raw);
    applyLoadedSave(save);
    // After a successful load from any key, re-save under the current key.
    // This means legacy saves are automatically promoted on first load.
    saveGame(true);
    document.getElementById('header-ep-badge').style.display='flex';
    showGameScreen();
    if(G.currentEpData) renderStage(G.stageIndex||0);
    else computeAndStartEpisode();
    // Show a clear notice if the save came from an older version
    if(save._migrated || fromKey!==SAVE_KEY){
      const oldVersion = save.version || '?';
      const castCount = (G.cast||[]).length;
      const ep = G.episode||1;
      notify(`⬆️ Older save migrated (v${oldVersion} → v${SAVE_VERSION}). ${castCount} cast, Episode ${ep}. Saved under current version.`,'win');
      // Export a backup automatically so the user has the migrated save as a file
      setTimeout(()=>{
        try { exportSaveFile(); notify('💾 Backup exported — keep this file safe','win'); } catch(e){}
      }, 1200);
    } else {
      notify('✅ Save loaded','win');
    }
    return true;
  } catch(e){
    console.error('Load failed:',e);
    // Try the backup slot before giving up
    try {
      const backupRaw = localStorage.getItem(SAVE_KEY+'_backup');
      if(backupRaw){
        const save=migrateSaveIfNeeded(backupRaw);
        applyLoadedSave(save);
        saveGame(true);
        document.getElementById('header-ep-badge').style.display='flex';
        showGameScreen();
        if(G.currentEpData) renderStage(G.stageIndex||0);
        else computeAndStartEpisode();
        notify('⚠️ Main save failed — loaded from backup slot','win');
        return true;
      }
    } catch(e2){ console.error('Backup load also failed:',e2); }
    notify('❌ Load failed — save may be corrupted. Try importing a .json export.');
    return false;
  }
}
function exportSaveFile(){
  try{
    const payload=buildSavePayload();
    const ver = (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v1').replace(/\./g,'-');
    downloadTextFile(`${seasonSlug()}-${ver}-save.json`, JSON.stringify(payload,null,2));
    notify('⬇ Save exported','win');
  }catch(e){ console.error(e); notify('Export failed'); }
}
function openImportSave(){
  const input=document.getElementById('save-import-input');
  if(input) input.click();
}
function importSaveFile(event){
  const file=event.target.files&&event.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const save=migrateSaveIfNeeded(String(reader.result||''));
      if(!Array.isArray(save.cast)||save.cast.length===0) throw new Error('No cast found in save file');
      localStorage.setItem(SAVE_KEY,JSON.stringify(save));
      applyLoadedSave(save);
      updateContinueButton();
      const wasLegacy = save._migrated || (save.version && save.version < SAVE_VERSION);
      const castCount = (G.cast||[]).length;
      if(wasLegacy){
        notify(`⬆️ Older save imported & migrated (v${save.version||'?'}). ${castCount} cast loaded — click Resume to continue.`,'win');
      } else {
        notify(`⬆️ Save imported — ${castCount} cast, Episode ${save.episode||1}. Click Resume to continue.`,'win');
      }
    }catch(e){
      console.error('Import failed:',e);
      notify('❌ Import failed — '+((e.message||'').slice(0,60)||'not a valid No Signal save'));
    }
    event.target.value='';
  };
  reader.readAsText(file);
}
function deleteSave(){
  if(!confirm('Delete saved game permanently?')) return;
  try{[SAVE_KEY,SAVE_KEY+'_backup',...LEGACY_SAVE_KEYS].forEach(k=>localStorage.removeItem(k));notify('Save deleted');updateContinueButton();}catch(e){}
}
function updateContinueButton(){
  const wrap=document.getElementById('continue-btn-wrap');
  if(!wrap) return;
  wrap.style.display=hasSavedGame()?'flex':'none';
}

// ===== V19 AUTOSAVE / EXPORT SAFETY =====
let _autosaveTimer=null;
function queueAutosave(reason='change'){
  clearTimeout(_autosaveTimer);
  _autosaveTimer=setTimeout(()=>saveGame(true),700);
}
function markDirty(reason='change'){
  queueAutosave(reason);
}