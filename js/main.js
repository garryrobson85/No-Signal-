// No Signal — main.js
// Entry point — sets up event delegation and keyboard shortcuts.
// All other JS files are loaded as classic scripts in index.html.

// ===== DELEGATED EVENT HANDLER =====
// All data-action attributes in index.html are handled here.
// This replaces ~40 inline onclick="fn()" calls with a single listener,
// making it easy to find, trace, and modify any UI interaction.
document.addEventListener('click', function(e){
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const action = el.dataset.action;
  const panel  = el.dataset.panel;
  const modal  = el.dataset.modal;

  // ── Sound on every action ──────────────────────────────────────────────
  // flipVote has its own dramatic sfx — skip here
  if(typeof sfxTick==='function' && action !== 'nsToggle'){
    const bigActions = new Set(['startSeason','loadGame','loadQuickDemo','runFinale','nextEpisode']);
    const navActions  = new Set(['goHome','goSetup','setupNav','closeModal','showCastStatus',
      'showSeasonStats','showTribeHistory','showPlayerProfiles','showV19Insights',
      'showRelationshipWeb','showEpisodeScripts','showSeasonRecap','showSeasonStory',
      'showProducerPanel','openDrawer','openImportSave']);
    const toggleActions = new Set(['toggleSetting','toggleReturneeSettings']);
    if(bigActions.has(action))    { sfxWin&&sfxWin();    hapticWin&&hapticWin(); }
    else if(navActions.has(action)){ sfxNav&&sfxNav();    hapticAdv&&hapticAdv(); }
    else if(toggleActions.has(action)){sfxToggle&&sfxToggle(); hapticTap&&hapticTap(); }
    else                           { sfxTick&&sfxTick();  hapticTap&&hapticTap(); }
  }

  switch(action){
    // Navigation
    case 'goHome':            goHome(); break;
    case 'goSetup':           goSetup(); break;
    case 'startSeason':       startSeason(); break;
    case 'loadQuickDemo':     loadQuickDemo(); break;

    // Save / load
    case 'loadGame':          loadGame(); break;
    case 'saveGame':          saveGame(); break;
    case 'exportSaveFile':    exportSaveFile(); break;
    case 'openImportSave':    openImportSave(); break;
    case 'deleteSave':        deleteSave(); break;

    // Setup navigation
    case 'setupNav':          setupNav(panel, el); break;

    // Cast
    case 'generateCast12':    generateRandomCast(12); break;
    case 'generateCast16':    generateRandomCast(16); break;
    case 'addContestant':     addContestant(); break;
    case 'showBulkUpload':    showBulkUpload(); break;
    case 'autoAssignTeams':   autoAssignTeams(); break;

    // Game screens
    case 'showCastStatus':    showCastStatus(); break;
    case 'showSeasonStats':   showSeasonStats(); break;
    case 'showTribeHistory':  showTribeHistory(); break;
    case 'showPlayerProfiles':showPlayerProfiles(); break;
    case 'showV19Insights':   showV19Insights(); break;
    case 'showRelationshipWeb':showRelationshipWeb(); break;
    case 'showEpisodeScripts':showEpisodeScripts(); break;

    // Episode actions
    case 'nextEpisode':       nextEpisode(); break;
    case 'runFinale':         runFinale(); break;
    case 'revealAllVotes':    revealAllVotes(); break;

    // Script
    case 'copyScript':        copyScript(); break;

    // AI
    case 'showGeminiHelp':    showGeminiHelp(); break;
    case 'testGeminiKey':     testGeminiKey(); break;

    // Modals
    case 'closeModal':        if(modal) closeModal(modal); break;

    // Drawer + theme
    case 'openDrawer':        openDrawer(); break;
    case 'closeDrawer':       closeDrawer(); break;
    case 'nsToggle':          if(el.dataset.key) nsToggle(el.dataset.key); break;
    case 'setTheme':          if(el.dataset.theme) setTheme(el.dataset.theme); break;

    // Season Story
    case 'showSeasonStory':    showSeasonStory(); break;
    case 'exportSeasonStory':  exportSeasonStory(); break;

    // Season recap
    case 'showSeasonRecap':      showSeasonRecap(); break;
    case 'copySeasonRecap':      copySeasonRecap(); break;
    case 'downloadSeasonRecap':  downloadSeasonRecap(); break;

    // Relationship history
    case 'showRelHistory':
      if(el.dataset.a&&el.dataset.b) showRelationshipHistory(el.dataset.a,el.dataset.b); break;
    case 'showRelHistoryPicker':
      if(el.dataset.player) showRelHistoryPicker(el.dataset.player); break;

    // Producer Mode
    case 'showProducerPanel':        showProducerPanel(); break;
    case 'producerAction':
      if(el.dataset.power) executeProducerAction(el.dataset.power); break;
    case 'confirmRivalry':           confirmRivalry(); break;
    case 'confirmBlindside':         confirmBlindside(); break;
    case 'confirmGuidedIdol':        confirmGuidedIdol(); break;
    case 'confirmFractureAlliance':  confirmFractureAlliance(); break;
    case 'confirmChallengeBoost':    confirmChallengeBoost(); break;
    case 'producerIntelDrop':        producerIntelDrop(); break;
    case 'closeV19Modal':            closeModal('modal-v19'); break;

    // Toggle switches (settings checkboxes)
    case 'toggleSetting':
      el.classList.toggle('on');
      if(typeof sfxToggle==='function') sfxToggle();
      if(typeof hapticTap==='function') hapticTap();
      break;
    case 'toggleReturneeSettings':
      el.classList.toggle('on');
      toggleReturneeSettings(el);
      break;
  }
});

// ===== DARK MODE =====

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  if(document.getElementById('screen-game').classList.contains('active')){
    // Space or Enter = next/advance
    if(e.code==='Space'||e.code==='Enter'){
      e.preventDefault();
      // Find the most prominent fire button currently shown
      const btn=document.querySelector('#stage-nav .btn-fire')||document.querySelector('#tribal-nav-inner .btn-fire');
      if(btn) btn.click();
    }
    // S = save
    if((e.key==='s'||e.key==='S')&&!e.ctrlKey&&!e.metaKey){
      e.preventDefault(); saveGame();
    }
    // E = export save file
    if((e.key==='e'||e.key==='E')&&!e.ctrlKey&&!e.metaKey){
      e.preventDefault(); exportSaveFile();
    }
  }
});
