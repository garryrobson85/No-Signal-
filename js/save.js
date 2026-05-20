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
  G.settings={name:'No Signal: Demo Season',theme:'Tropical Volcanic Island',flavor:'drama',seed:'demo-v19',mergeEpisode:5,finaleSize:3,
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
const LEGACY_SAVE_KEYS=['nosignal_save_v18','nosignal_save_v1'];

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
    savedAt:Date.now()
  };
}
function getSaveRaw(){
  try{
    const current=localStorage.getItem(SAVE_KEY);
    if(current) return current;
    for(const key of LEGACY_SAVE_KEYS){
      const legacy=localStorage.getItem(key);
      if(legacy) return legacy;
    }
  }catch(e){}
  return null;
}
function migrateSaveIfNeeded(raw){
  const save=JSON.parse(raw);
  save.version=save.version||1;
  save.schema=save.schema||'nosignal-season-save';
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
  G.cast=save.cast||[];
  G.teams=save.teams||[];
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
  if(G.currentEpData){
    const findById=id=>G.cast.find(c=>c.id===id);
    ['eliminated','eliminated2','idolFinder','winner','runnerUp'].forEach(k=>{
      if(G.currentEpData[k]&&G.currentEpData[k].id) G.currentEpData[k]=findById(G.currentEpData[k].id)||G.currentEpData[k];
    });
  }
}
function loadGame(){
  try {
    const raw=getSaveRaw();
    if(!raw) return false;
    const save=migrateSaveIfNeeded(raw);
    applyLoadedSave(save);
    // Re-save legacy saves under the v19 key after a successful migration.
    saveGame(true);
    document.getElementById('header-ep-badge').style.display='flex';
    showGameScreen();
    if(G.currentEpData) renderStage(G.stageIndex||0);
    else computeAndStartEpisode();
    notify('✅ Save loaded','win');
    return true;
  } catch(e){
    console.error('Load failed:',e);
    notify('Load failed — save may be corrupted');
    return false;
  }
}
function exportSaveFile(){
  try{
    const payload=buildSavePayload();
    downloadTextFile(`${seasonSlug()}-v19-save.json`, JSON.stringify(payload,null,2));
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
      if(!Array.isArray(save.cast)) throw new Error('Missing cast array');
      localStorage.setItem(SAVE_KEY,JSON.stringify(save));
      applyLoadedSave(save);
      updateContinueButton();
      notify('⬆ Save imported','win');
    }catch(e){ console.error(e); notify('Import failed — not a valid No Signal save'); }
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


// ===== EXPORTS =====
export { saveGame, loadGame, hasSavedGame, deleteSave, updateContinueButton, queueAutosave, exportSaveFile, openImportSave, importSaveFile, loadQuickDemo, SAVE_KEY };
