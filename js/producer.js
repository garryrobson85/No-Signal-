// No Signal — producer.js
// Producer Mode — host agency tools that give the player meaningful decisions
// These are deliberate interventions in the simulation, not random events.
// One power per category per season to keep them meaningful.

// ===== PRODUCER POWER DEFINITIONS =====
const PRODUCER_POWERS = {
  // Force a specific rivalry to be publicly noted at camp
  force_rivalry: {
    id: 'force_rivalry',
    name: '⚔️ Manufacture Rivalry',
    desc: 'Force a public confrontation between two players. Creates a lasting rivalry memory between them.',
    usesPerSeason: 2,
    phase: 'any',        // when it can be used
    stage: 0,            // camp life stage
  },
  // Override the vote result this episode (host picks who goes home)
  blindside: {
    id: 'blindside',
    name: '💥 Producer Blindside',
    desc: 'Override the vote — you choose who goes home this episode. Once per season.',
    usesPerSeason: 1,
    phase: 'any',
    stage: 2,            // tribal council stage
  },
  // Make a specific player find the idol (plant it where they look)
  guided_idol: {
    id: 'guided_idol',
    name: '🗺️ Guided Idol Plant',
    desc: 'Guarantee a specific player finds the hidden idol this episode.',
    usesPerSeason: 1,
    phase: 'any',
    stage: 0,
  },
  // Force a specific alliance to fracture this episode
  fracture_alliance: {
    id: 'fracture_alliance',
    name: '🔥 Fracture Alliance',
    desc: 'Force a specific alliance to fracture. One member betrays the others this vote.',
    usesPerSeason: 1,
    phase: 'any',
    stage: 0,
  },
  // Boost a player's challenge performance this episode
  challenge_boost: {
    id: 'challenge_boost',
    name: '⚡ Challenge Boost',
    desc: 'One player performs at their peak this challenge — maximum stats, no randomness.',
    usesPerSeason: 2,
    phase: 'any',
    stage: 1,
  },
  // Secret vote reading — see how everyone plans to vote before tribal
  intel_drop: {
    id: 'intel_drop',
    name: '👁️ Intel Drop',
    desc: 'See how the tribe plans to vote before the parchments are read. No changes — just knowledge.',
    usesPerSeason: 2,
    phase: 'any',
    stage: 2,
  },
};

// Track usage in G.producerPowers = { powerId: usesRemaining }
function initProducerPowers() {
  G.producerPowers = {};
  Object.entries(PRODUCER_POWERS).forEach(([id, p]) => {
    G.producerPowers[id] = p.usesPerSeason;
  });
}

function producerPowerUsed(id) {
  if(!G.producerPowers) initProducerPowers();
  return (G.producerPowers[id] || 0) <= 0;
}

function useProducerPower(id) {
  if(!G.producerPowers) initProducerPowers();
  if(G.producerPowers[id] > 0) G.producerPowers[id]--;
}

function producerUsesLeft(id) {
  if(!G.producerPowers) initProducerPowers();
  return G.producerPowers[id] ?? PRODUCER_POWERS[id]?.usesPerSeason ?? 0;
}

// ===== PRODUCER ACTIONS =====

/**
 * showProducerPanel()
 * Opens the producer modal showing all available powers and their status.
 * Called from the HOST CHOICE section of buildStageNav.
 */
function showProducerPanel() {
  if(!G.producerPowers) initProducerPowers();
  const active = getActive();
  if(!active.length) return;

  const ep = G.currentEpData;
  const stage = G.stageIndex;

  let html = `<div class="v19-help">Use these once-per-season powers to shape the narrative. Choose carefully — they're limited.<\/div>`;

  html += `<div class="producer-grid">`;
  Object.entries(PRODUCER_POWERS).forEach(([id, p]) => {
    const uses = producerUsesLeft(id);
    const used = uses <= 0;
    const wrongStage = p.stage !== undefined && p.stage !== stage;
    const disabled = used || wrongStage;
    const reason = used ? 'Used up' : wrongStage ? `Available at ${['Camp','Challenge','Tribal'][p.stage]} stage` : '';
    html += `<div class="producer-card ${disabled?'producer-disabled':''}">
      <div class="producer-name">${p.name}<\/div>
      <div class="producer-desc">${p.desc}<\/div>
      <div class="producer-meta">
        <span class="${used?'producer-used':'producer-uses'}">${used?'Exhausted':`${uses} use${uses!==1?'s':''} left`}<\/span>
        ${reason?`<span class="producer-reason">${reason}<\/span>`:''}
      <\/div>
      ${!disabled?`<button class="btn btn-fire btn-sm" style="margin-top:8px;width:100%" data-action="producerAction" data-power="${id}">Use Now<\/button>`:''}
    <\/div>`;
  });
  html += `<\/div>`;

  openV19Modal('🎬 Producer Controls', html);
}

/**
 * executeProducerAction(powerId)
 * Dispatched from the delegated event handler when a producer button is tapped.
 */
function executeProducerAction(powerId) {
  closeModal('modal-v19');
  switch(powerId) {
    case 'force_rivalry':     producerForceRivalry(); break;
    case 'blindside':         producerBlindside(); break;
    case 'guided_idol':       producerGuidedIdol(); break;
    case 'fracture_alliance': producerFractureAlliance(); break;
    case 'challenge_boost':   producerChallengeBoost(); break;
    case 'intel_drop':        producerIntelDrop(); break;
  }
}

// ─── FORCE RIVALRY ───────────────────────────────────────────────────────────
function producerForceRivalry() {
  const active = getActive();
  if(active.length < 2) return;

  // Build player picker
  const opts = active.map(c =>
    `<option value="${c.id}">${c.name} (${c.archetype})<\/option>`
  ).join('');

  const html = `<div class="v19-help">Choose two players. A public confrontation erupts between them — creating a lasting rivalry memory on both sides.<\/div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
      <div>
        <label class="form-label">Player A<\/label>
        <select class="form-select" id="rivalry-a">${opts}<\/select>
      <\/div>
      <div>
        <label class="form-label">Player B<\/label>
        <select class="form-select" id="rivalry-b">${opts}<\/select>
      <\/div>
      <button class="btn btn-fire" data-action="confirmRivalry">⚔️ Manufacture Rivalry<\/button>
    <\/div>`;
  openV19Modal('⚔️ Manufacture Rivalry', html);
}

function confirmRivalry() {
  const aId = document.getElementById('rivalry-a')?.value;
  const bId = document.getElementById('rivalry-b')?.value;
  if(!aId || !bId || aId === bId) { notify('Pick two different players'); return; }
  const a = G.cast.find(c=>c.id===aId), b = G.cast.find(c=>c.id===bId);
  if(!a||!b) return;
  closeModal('modal-v19');
  useProducerPower('force_rivalry');
  // Record rivalry memories on both sides at high intensity
  recordMemory('rivalry', aId, bId, G.episode, 85);
  recordMemory('rivalry', bId, aId, G.episode, 85);
  // Also set negative relationship score
  const key = [aId,bId].sort().join('|');
  G.relationships[key] = Math.min(G.relationships[key]||50, 20);
  G.dramaLevel = Math.min(5, G.dramaLevel + 1);
  notify(`⚔️ ${a.name.split(' ')[0]} and ${b.name.split(' ')[0]} just became enemies`, 'twist');
  renderStage(G.stageIndex);
}

// ─── PRODUCER BLINDSIDE ───────────────────────────────────────────────────────
function producerBlindside() {
  const ep = G.currentEpData;
  if(!ep?.voteResult) { notify('Run the vote first — then override it'); return; }
  const active = getActive().filter(c =>
    !ep.eliminated || c.id !== ep.eliminated.id
  );
  const opts = active.map(c => {
    const votes = ep.voteResult.tally[c.id] || 0;
    return `<option value="${c.id}">${c.name} (${c.archetype}) — ${votes} vote${votes!==1?'s':''}<\/option>`;
  }).join('');

  const html = `<div class="v19-help">The vote has been counted — but you can override it. Choose who actually goes home tonight. The original vote result is discarded.<\/div>
    <div style="margin-top:12px">
      <label class="form-label">Send home instead<\/label>
      <select class="form-select" id="blindside-target">${opts}<\/select>
      <button class="btn btn-fire" style="margin-top:12px;width:100%" data-action="confirmBlindside">💥 Execute Blindside<\/button>
    <\/div>`;
  openV19Modal('💥 Producer Blindside', html);
}

function confirmBlindside() {
  const targetId = document.getElementById('blindside-target')?.value;
  if(!targetId) return;
  const target = G.cast.find(c=>c.id===targetId);
  if(!target) return;
  closeModal('modal-v19');
  useProducerPower('blindside');
  const ep = G.currentEpData;
  // Override the eliminated player
  const old = ep.eliminated;
  ep.eliminated = target;
  ep._producerBlindside = true;
  ep._originalEliminated = old;
  // Record betrayal memories for everyone who voted the original target
  (ep.voteResult?.individualVotes||[]).forEach(iv => {
    if(iv.target.id === (old?.id)) {
      recordMemory('betrayal', iv.target.id, 'producer', G.episode, 60);
    }
  });
  notify(`💥 Producer blindside — ${target.name.split(' ')[0]} goes home instead`, 'twist');
  renderStage(G.stageIndex);
}

// ─── GUIDED IDOL ─────────────────────────────────────────────────────────────
function producerGuidedIdol() {
  const active = getActive();
  const opts = active.map(c =>
    `<option value="${c.id}">${c.name} (${c.archetype})<\/option>`
  ).join('');

  const html = `<div class="v19-help">Choose a player. They'll find the hidden idol this episode — guaranteed. Useful for protecting a fan favourite or disrupting a dominant alliance.<\/div>
    <div style="margin-top:12px">
      <label class="form-label">Idol goes to<\/label>
      <select class="form-select" id="guided-idol-target">${opts}<\/select>
      <button class="btn btn-fire" style="margin-top:12px;width:100%" data-action="confirmGuidedIdol">🗺️ Plant the Idol<\/button>
    <\/div>`;
  openV19Modal('🗺️ Guided Idol Plant', html);
}

function confirmGuidedIdol() {
  const targetId = document.getElementById('guided-idol-target')?.value;
  if(!targetId) return;
  const target = G.cast.find(c=>c.id===targetId);
  if(!target) return;
  closeModal('modal-v19');
  useProducerPower('guided_idol');
  if(!G.idolHolders.includes(targetId)) G.idolHolders.push(targetId);
  const ep = G.currentEpData;
  ep.idolFinder = target;
  notify(`🗺️ ${target.name.split(' ')[0]} finds the hidden idol`, 'win');
  renderStage(G.stageIndex);
}

// ─── FRACTURE ALLIANCE ────────────────────────────────────────────────────────
function producerFractureAlliance() {
  if(!G.alliances?.length) { notify('No active alliances to fracture'); return; }
  const opts = G.alliances.map(a => {
    const names = a.members.map(id => G.cast.find(c=>c.id===id)?.name.split(' ')[0]).filter(Boolean).join(', ');
    return `<option value="${a.id}">${names}<\/option>`;
  }).join('');

  const html = `<div class="v19-help">Choose an alliance to fracture. One member will betray the others this vote — and everyone will remember it.<\/div>
    <div style="margin-top:12px">
      <label class="form-label">Alliance to fracture<\/label>
      <select class="form-select" id="fracture-target">${opts}<\/select>
      <button class="btn btn-fire" style="margin-top:12px;width:100%" data-action="confirmFractureAlliance">🔥 Fracture It<\/button>
    <\/div>`;
  openV19Modal('🔥 Fracture Alliance', html);
}

function confirmFractureAlliance() {
  const allianceId = document.getElementById('fracture-target')?.value;
  if(!allianceId) return;
  const alliance = G.alliances.find(a=>a.id===allianceId);
  if(!alliance||alliance.members.length<2) return;
  closeModal('modal-v19');
  useProducerPower('fracture_alliance');
  // Pick a random member as the betrayer
  const betrayer = G.cast.find(c=>c.id===pick(alliance.members));
  // Record betrayal memories on all other members
  alliance.members.forEach(mid => {
    if(mid === betrayer.id) return;
    recordMemory('betrayal', mid, betrayer.id, G.episode, 90);
    recordMemory('alliance_broken', mid, betrayer.id, G.episode, 85);
  });
  // Remove from alliance
  alliance.members = alliance.members.filter(id=>id!==betrayer.id);
  betrayer.allianceIds = (betrayer.allianceIds||[]).filter(id=>id!==allianceId);
  G.dramaLevel = Math.min(5, G.dramaLevel + 2);
  notify(`🔥 ${betrayer.name.split(' ')[0]} fractures the alliance — betrayal recorded`, 'twist');
  renderStage(G.stageIndex);
}

// ─── CHALLENGE BOOST ──────────────────────────────────────────────────────────
function producerChallengeBoost() {
  const active = getActive();
  const opts = active.map(c =>
    `<option value="${c.id}">${c.name} — ${c.archetype} (phys:${c.physical} ment:${c.mental})<\/option>`
  ).join('');

  const html = `<div class="v19-help">Choose a player. They perform at their absolute peak this challenge — max stats, no randomness applied.<\/div>
    <div style="margin-top:12px">
      <label class="form-label">Boost this player<\/label>
      <select class="form-select" id="boost-target">${opts}<\/select>
      <button class="btn btn-fire" style="margin-top:12px;width:100%" data-action="confirmChallengeBoost">⚡ Apply Boost<\/button>
    <\/div>`;
  openV19Modal('⚡ Challenge Boost', html);
}

function confirmChallengeBoost() {
  const targetId = document.getElementById('boost-target')?.value;
  if(!targetId) return;
  const target = G.cast.find(c=>c.id===targetId);
  if(!target) return;
  closeModal('modal-v19');
  useProducerPower('challenge_boost');
  G._challengeBoostId = targetId;
  notify(`⚡ ${target.name.split(' ')[0]} will dominate the challenge`, 'win');
}

// ─── INTEL DROP ───────────────────────────────────────────────────────────────
function producerIntelDrop() {
  const ep = G.currentEpData;
  if(!ep?.voteResult?.tally) { notify('No vote data yet — run the episode first'); return; }
  const tally = ep.voteResult.tally;
  const sorted = Object.entries(tally)
    .sort((a,b)=>b[1]-a[1])
    .map(([id,count]) => {
      const p = G.cast.find(c=>c.id===id);
      return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <span>${p?.name||id} <span style="font-size:11px;color:var(--text2)">${p?.archetype||''}<\/span><\/span>
        <strong>${count} vote${count!==1?'s':''}<\/strong>
      <\/div>`;
    }).join('');

  const html = `<div class="v19-help">Host's eyes only. This is how the votes actually fell — before the parchments are read.<\/div>
    <div style="margin-top:12px">${sorted}<\/div>
    <button class="btn btn-outline" style="margin-top:14px;width:100%" data-action="closeV19Modal">Close<\/button>`;
  useProducerPower('intel_drop');
  openV19Modal('👁️ Intel Drop — Confidential', html);
}

// ===== EXPORTS =====
export {
  PRODUCER_POWERS, initProducerPowers, producerPowerUsed,
  useProducerPower, producerUsesLeft,
  showProducerPanel, executeProducerAction,
  producerForceRivalry, confirmRivalry,
  producerBlindside, confirmBlindside,
  producerGuidedIdol, confirmGuidedIdol,
  producerFractureAlliance, confirmFractureAlliance,
  producerChallengeBoost, confirmChallengeBoost,
  producerIntelDrop,
};
