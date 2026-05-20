// No Signal — main.js
// Entry point — imports all modules and wires up the app

// ===== IMPORTS =====
// ES module imports — load order is handled by the module system
import { TWISTS_DATA, ARCHETYPES, PERSONALITIES, CHALLENGE_DATA, DRAMA_EVENTS,
         CONFESSIONAL_TEMPLATES, CONFESSIONAL_IDOL_TEMPLATES,
         INTERACTION_TEMPLATES_NEUTRAL, INTERACTION_TEMPLATES_IDOL,
         INTERACTION_TEMPLATES_ADVANTAGE, HOST, HOST_LINES, ACTION_BANK,
         DIALOGUE_BANK, VOTE_REASONS,
         buildConfessionalText, buildInteractionText, buildDramaText } from './data.js';

import { generatePortrait, getPortrait, updateContestantPortrait,
         triggerImageUpload, handleImageUpload, applyCustomImage,
         clearImage, showBulkUpload } from './portraits.js';

import { G, rng, pick, shuffle, uid, notify, openModal, closeModal,
         getPlayerView, isPlayMode, getPerceivedScore, setPerceivedScore,
         openV19Modal, goHome, goSetup, showGameScreen,
         initTeams, renderCastList, addContestant, removeContestant,
         updateContestant, makeContestant, generateRandomCast,
         updateCastNavCount, renderTwistsGrid, updateTeamsPanel,
         autoAssignTeams, setupNav, startSeason, applyColor,
         pickColor, makeTeam, makeName, resetNamePool,
         buildAlliances, getTeamMembers, toggleReturneeSettings } from './state.js';

import { getActive, rollChallenge, targetScore, getVoterAllies,
         pickVoteReason, runVote, resolveTie, resolveChallengerTie,
         idolFindChance, maybeGiveIdol, checkIdolPlay, getTwist,
         applyTwist, pickInteraction, computeAndStartEpisode,
         runChallengeWithChoice, capturePlacementSnapshot,
         selectChallenge, confirmChallenge, nextEpisode } from './engine.js';

import { buildBadge, buildPlayerChip, buildEventCard, buildNotice,
         renderStage, buildEpisodeHeader, buildStageCampLife,
         buildStageChallenge, buildChallengeChooser, buildStageTribal,
         buildStageElimination, buildStageNav, initVoteReveal,
         flipVote, revealAllVotes, updateRunningTally, revealElimination,
         updateGameSidebar, gsPlayerChip, showPlayerDetail,
         showCastStatus, showJuryPanel, showSeasonStats,
         addDramaEvent, hostPlantIdol, hostGrantImmunity,
         applyHostImmunity, answerTribalQuestion } from './ui.js';

import { generateEpisodeScript, showEpisodeScripts, showSeasonRecap, copySeasonRecap, downloadSeasonRecap,
         scrollToScriptEp, copyScript } from './script_gen.js';

import { showTribeHistory, showRelationshipWeb, showRelationshipHistory, showRelHistoryPicker, v19RelScore,
         showPlayerProfiles, showOneProfile, showV19Insights,
         showV19Relationships, exportV19SeasonReport } from './features.js';

import { saveGame, loadGame, hasSavedGame, deleteSave,
         updateContinueButton, queueAutosave, exportSaveFile,
         openImportSave, importSaveFile, loadQuickDemo,
         SAVE_KEY } from './save.js';

import { EVOLUTION_RULES, checkArchetypeEvolution,
         buildEvolutionDisplay, getArchetypeHistory, buildEvolutionCeremony } from './evolution.js';

import { PRODUCER_POWERS, initProducerPowers, producerPowerUsed,
         useProducerPower, producerUsesLeft,
         showProducerPanel, executeProducerAction,
         producerForceRivalry, confirmRivalry,
         producerBlindside, confirmBlindside,
         producerGuidedIdol, confirmGuidedIdol,
         producerFractureAlliance, confirmFractureAlliance,
         producerChallengeBoost, confirmChallengeBoost,
         producerIntelDrop } from './producer.js';

import { MEMORY_TYPES, recordMemory, getMemories, memoryScore,
         hasBetrayedBy, getStrongestMemory, getUnseenMemories,
         getJuryBias, recordVoteMemories, recordIdolMemories,
         memoryTargetBonus, getMemoryConfessionalLine, getMemorySummary } from './memory.js';

import { analyseSeasonStory, buildSeasonStoryCard, showSeasonStory, exportSeasonStory } from './story.js';

import { callGemini, buildEpisodePrompt, generateAIDialogueForEp,
         generateAIEpisodeScript, testGeminiKey, showGeminiHelp,
         saveGeminiKey, getGeminiKey, initGeminiKeyField } from './ai.js';

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

    // Dark mode
    case 'toggleDarkMode':    toggleDarkMode(); break;

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
    case 'toggleSetting':     el.classList.toggle('on'); break;
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
