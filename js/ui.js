// No Signal — ui.js
// All DOM rendering — screens, modals, stage builders, vote reveal

// ===== SHARED UI BUILDER HELPERS =====
// These replace repeated inline HTML patterns throughout the codebase.

/**
 * buildBadge(text, type) — coloured status chip
 * type: 'leaf'|'red'|'water'|'win'|'purple'|'fire'
 */
function buildBadge(text, type='leaf'){
  return `<span class="badge badge-${type}">${text}</span>`;
}

/**
 * buildPlayerChip(c, opts) — compact player avatar + name row
 * Used in sidebar, cast status grid, tally chips etc.
 */
function buildPlayerChip(c, opts={}){
  const {size=28, showName=true, onClick='', extraClass=''} = opts;
  const portrait = c.customImage
    ? `<img src="${c.customImage}" style="width:${size}px;height:${size}px;object-fit:cover;object-position:top;border-radius:50%;display:block;">`
    : getPortrait(c).replace(/width="120"/g,`width="${size}"`).replace(/height="145"/g,`height="${Math.round(size*1.2)}"`);
  const nameEl = showName ? `<span class="p-name">${c.name.split(' ')[0]}</span>` : '';
  const clickAttr = onClick ? `onclick="${onClick}"` : '';
  return `<div class="gs-player ${extraClass}" ${clickAttr} style="cursor:${onClick?'pointer':'default'}">
    <div class="mini-avatar" style="background:${c.color};overflow:hidden;padding:0;width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0">${portrait}</div>
    ${nameEl}
  </div>`;
}

/**
 * buildEventCard(type, typeLabel, title, body, extra='') — standard event card
 * type: 'interaction'|'vote'|'challenge'|'merge'|'twist' etc.
 */
function buildEventCard(type, typeLabel, title, body, extra=''){
  return `<div class="event-card type-${type}">
    ${typeLabel ? `<div class="event-card-type">${typeLabel}</div>` : ''}
    ${title ? `<div class="event-card-title">${title}</div>` : ''}
    ${body ? `<div class="event-card-body">${body}</div>` : ''}
    ${extra}
  </div>`;
}

/**
 * buildNotice(emoji, title, body, style='') — coloured notice banner
 * Used for merge announcement, immunity win, tribe goes to tribal etc.
 */
function buildNotice(emoji, title, body, bgColor='var(--win-light)', borderColor='var(--win)'){
  return `<div style="background:${bgColor};border:1.5px solid ${borderColor};border-radius:var(--radius-lg);padding:16px 18px;margin:10px 0;text-align:center">
    <div style="font-size:28px;margin-bottom:6px">${emoji}</div>
    <div style="font-weight:700;font-size:15px;margin-bottom:4px">${title}</div>
    ${body ? `<div style="font-size:13px;color:var(--text2)">${body}</div>` : ''}
  </div>`;
}

// ===== STAGED RENDER =====

function renderStage(idx){
  try {
  G.stageIndex=idx;
  const ep=G.currentEpData;
  const container=document.getElementById('ep-view-container');
  if(!ep||!container) return; // nothing to render — fail silently rather than throwing

  // Rejoin episode: only ever shows stage 0 (the return screen) then goes to next episode
  if(ep.isRejoinEpisode){
    let html=buildEpisodeHeader(ep);
    html+=`<div id="stage-container">`;
    html+=buildStageCampLife(ep); // contains the rejoin display block
    html+=`<div class="ep-stage-nav" id="stage-nav">
      <button class="btn btn-fire" onclick="nextEpisode()">Continue to Episode ${ep.ep+1} →<\/button>
      <button class="btn btn-outline btn-sm" onclick="showEpisodeScripts(${ep.ep})">📜 Episode Script<\/button>
    <\/div>`;
    html+=`<\/div><\/div>`;
    container.innerHTML=`<div class="ep-view">${html}<\/div>`;
    capturePlacementSnapshot(ep);
    G.episodeLog.push(ep);
    setTimeout(()=>{const gm=document.querySelector('.game-main');if(gm)gm.scrollTo({top:gm.scrollHeight,behavior:'smooth'});},120);
    updateGameSidebar();
    return;
  }

  let html=buildEpisodeHeader(ep);
  html+=`<div id="stage-container">`;
  if(idx>=0) html+=buildStageCampLife(ep);
  if(idx>=1&&ep.challengeResult) html+=buildStageChallenge(ep);
  if(idx===1&&!ep.challengeResult) html+=buildChallengeChooser(ep);
  if(idx>=2) html+=buildStageTribal(ep);
  if(idx>=4) html+=buildStageElimination(ep);
  html+=buildStageNav(ep,idx);
  html+=`<\/div><\/div>`;
  container.innerHTML=`<div class="ep-view">${html}<\/div>`;
  // Init vote state when tribal loads
  if(idx===2&&ep.voteResult) initVoteReveal();
  setTimeout(()=>{
    const gm=document.querySelector('.game-main');
    if(gm) gm.scrollTo({top:gm.scrollHeight,behavior:'smooth'});
  },120);
  updateGameSidebar();
  } catch(err) {
    console.error('renderStage failed:',err);
    notify('⚠️ Stage render failed — see console. Try advancing the episode or save & reload.');
    // Best-effort recovery: show a minimal panel with a save/home option
    const c=document.getElementById('ep-view-container');
    if(c){
      c.innerHTML=`<div class="ep-view" style="padding:20px;text-align:center">
        <div style="font-size:18px;font-weight:700;margin-bottom:12px">Something broke rendering this episode.</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Your progress is intact — try saving and reloading.</div>
        <button class="btn btn-outline" data-action="saveGame">💾 Save Now<\/button>
        <button class="btn btn-outline" data-action="goHome">🏠 Home<\/button>
      <\/div>`;
    }
  }
}

function buildEpisodeHeader(ep){
  const active=getActive();
  const phase=G.merged?'Post-Merge':'Pre-Merge';
  return `<div class="ep-header">
    <div class="ep-number-wrap"><span class="ep-season-tag">${G.settings.name}<\/span><div class="ep-title">Episode ${ep.ep}<\/div><\/div>
    <div class="ep-meta">
      <span class="badge ${G.merged?'badge-leaf':'badge-water'}">${phase}<\/span>
      ${ep.mergeHappened?'<span class="badge badge-win">⭐ Merge<\/span>':''}
      ${ep.twist?`<span class="badge badge-purple">🌀 ${ep.twist.name}<\/span>`:''}
      ${ep.noElim&&!ep.isRejoinEpisode?'<span class="badge badge-leaf">🛡️ No Elim<\/span>':''}
      ${ep.isRejoinEpisode?'<span class="badge badge-win">🔄 Rejoin Episode<\/span>':''}
      ${ep.doubleElim?'<span class="badge badge-red">⚡ Double<\/span>':''}
      <span class="badge badge-gray">👥 ${active.length+(ep.eliminated&&!ep.eliminated.eliminated?1:0)}<\/span>
    <\/div>
  <\/div>`;
}

function buildStageCampLife(ep){
  let html=`<div class="stage-block anim-in"><div class="stage-label">🏕️ Camp Life<\/div>`;

  // ── OPENING NARRATION (orange host card) ────────────────────────────────
  // Ep 1: "Welcome to Season N" intro. Ep 2+: "Previously On" recap.
  // Text is generated by buildOpeningNarration(ep) and may be replaced by AI
  // (ai.js sets ep._aiOpeningNarration when Gemini key is set).
  const opening = ep._aiOpeningNarration || ep._openingNarration || buildOpeningNarration(ep);
  if(opening){
    const isEp1 = ep.ep===1;
    const icon = isEp1 ? '🔥' : '📺';
    const label = isEp1 ? 'OPENING NARRATION' : 'PREVIOUSLY ON';
    const title = isEp1
      ? `WELCOME TO ${esc((G.settings.name||'NO SIGNAL').toUpperCase())}`
      : `PREVIOUSLY ON ${esc((G.settings.name||'NO SIGNAL').toUpperCase())}`;
    html+=`<div class="host-narration-card" style="background:linear-gradient(135deg,rgba(232,69,10,0.18),rgba(232,69,10,0.04));border-left:4px solid var(--fire);border-radius:var(--radius-lg);padding:18px 20px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--fire);letter-spacing:0.08em;margin-bottom:6px">${icon} ${label}<\/div>
      <div style="font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:0.03em;margin-bottom:10px;line-height:1.1">${title}<\/div>
      <div style="font-size:14px;line-height:1.55;color:var(--text)">${esc(opening)}<\/div>
    <\/div>`;
  }

  // ── ARCHETYPE EVOLUTIONS with ceremony ──────────────────────────────────
  if(G._pendingEvolutions&&G._pendingEvolutions.length){
    const evoHtml=buildEvolutionDisplay(G._pendingEvolutions);
    if(evoHtml){
      html+=`<div class="event-card type-twist" style="margin-bottom:12px">
        <div class="event-card-type">🔄 Character Arc<\/div>
        <div class="event-card-title">Something Has Shifted…<\/div>
        ${evoHtml}
      <\/div>`;
    }
    // Show ceremony — confessional from the evolving player, camp reaction
    G._pendingEvolutions.forEach(ev=>{
      if(ev.confessional&&ev.player){
        const port=ev.player.customImage
          ?`<img src="${ev.player.customImage}" style="width:32px;height:39px;object-fit:cover;object-position:top;border-radius:6px">`
          :getPortrait(ev.player).replace('width="120" height="145"','width="32" height="39"');
        html+=`<div class="confessional-card">
          <div class="conf-header">
            <div style="width:32px;height:39px;border-radius:6px;overflow:hidden;flex-shrink:0">${port}<\/div>
            <div>
              <span class="conf-name">${ev.player.name.toUpperCase()}<\/span>
              <span class="conf-label">— CONFESSIONAL<\/span>
              <div style="font-size:9px;color:var(--fire2);margin-top:1px;font-weight:600">${ev.from} → ${ev.to}<\/div>
            <\/div>
          <\/div>
          <div class="conf-text">"${ev.confessional}"<\/div>
        <\/div>`;
      }
      if(ev.campReaction){
        html+=`<div class="event-card type-interaction" style="margin-top:8px">
          <div class="event-card-type">👁️ Camp Reaction<\/div>
          <div class="event-card-body">${ev.campReaction}<\/div>
        <\/div>`;
      }
    });
    G._pendingEvolutions=[];
  }

  // ── REJOIN EPISODE ─────────────────────────────────────────────────────
  if(ep.isRejoinEpisode&&ep.rejoinPlayers&&ep.rejoinPlayers.length){
    const portraits=ep.rejoinPlayers.map(r=>{
      const img=r.customImage
        ? `<img src="${r.customImage}" style="width:80px;height:97px;object-fit:cover;object-position:top;border-radius:10px;display:block;">`
        : getPortrait(r).replace('width="120" height="145"','width="80" height="97"');
      const teamLabel=(!G.merged&&r.team!==-1&&r.team!=null&&G.teams[r.team])
        ? `<div style="font-size:10px;color:${G.teams[r.team].color};font-weight:600;margin-top:2px">${G.teams[r.team].name}<\/div>` : '';
      return `<div style="text-align:center">
        <div style="width:80px;height:97px;border-radius:10px;overflow:hidden;margin:0 auto 8px;border:3px solid #FCD34D;box-shadow:0 4px 16px rgba(0,0,0,0.15)">${img}<\/div>
        <div style="font-size:13px;font-weight:700">${r.name}<\/div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${r.archetype}<\/div>
        <div style="font-size:10px;color:var(--text3)">${r.personality}<\/div>
        ${teamLabel}
      <\/div>`;
    }).join('');

    html+=`<div style="background:linear-gradient(135deg,#FEF9C3,#FFFBEB);border:2px solid #FCD34D;border-radius:var(--radius-lg);padding:24px;text-align:center;margin-bottom:12px;animation:portrait-pop 0.5s ease">
      <div style="font-family:'Bebas Neue',cursive;font-size:36px;color:#92400E;letter-spacing:0.05em;margin-bottom:6px">🔄 Back in the Game!<\/div>
      <div style="font-size:14px;color:#78350F;margin-bottom:18px">${ep.rejoinNames} ${ep.rejoinPlayers.length>1?'have':'has'} returned. The game just shifted.<\/div>
      <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap">${portraits}<\/div>
    <\/div>`;

    html+=`<div class="event-card type-merge" style="margin-top:0">
      <div class="event-card-type">No Elimination Tonight<\/div>
      <div class="event-card-body">This episode is dedicated to the dramatic return. No one goes home — but nothing will be the same from here.<\/div>
    <\/div>`;

    html+=`<\/div>`;
    return html;
  }
  // ─────────────────────────────────────────────────────────────────────
  if(ep.mergeHappened) html+=`<div class="merge-banner"><div class="merge-title">🏆 The Merge!<\/div><div class="merge-sub">The tribes are united. Individual play begins. Anyone's game now.<\/div><\/div>`;
  if(ep.twist) html+=`<div class="twist-banner"><div class="twist-banner-title">${ep.twist.icon} ${ep.twist.name}<\/div><div class="twist-banner-desc">${ep.twistMsg}<\/div><\/div>`;
  if(ep.dramaMsg) html+=`<div class="event-card type-drama"><div class="event-card-type">Camp Drama<\/div><div class="event-card-body">🎭 ${ep.dramaMsg}<\/div><\/div>`;
  if(ep.idolFinder) html+=`<div class="event-card type-idol"><div class="event-card-type">Idol Found<\/div><div class="event-card-title">💎 ${ep.idolFinder.name} found a hidden immunity idol<\/div><div class="event-card-body">They slipped away from camp undetected. Their secret could change everything.<\/div><\/div>`;
  if(ep.interactions.length){ep.interactions.forEach(({a,b,text})=>{
    const pa=getPortrait(a).replace('width="120" height="145"','width="56" height="68"');
    const pb=getPortrait(b).replace('width="120" height="145"','width="56" height="68"');
    html+=`<div class="event-card type-interaction">
      <div class="event-card-type">Player Interaction<\/div>
      <div class="interaction-players">
        <div class="interaction-player">
          <div class="interaction-portrait">${pa}<\/div>
          <div class="interaction-name">${a.name}<\/div>
        <\/div>
        <div class="interaction-vs">↔<\/div>
        <div class="interaction-player">
          <div class="interaction-portrait">${pb}<\/div>
          <div class="interaction-name">${b.name}<\/div>
        <\/div>
      <\/div>
      <div class="event-card-body" style="margin-top:10px;clear:both">${text}<\/div>
    <\/div>`;});}
  if(ep.confessionals.length){ep.confessionals.forEach(c=>{
    const cp=getPortrait(c.who).replace('width="120" height="145"','width="44" height="53"');
    html+=`<div class="confessional-card"><div class="conf-header">
      <div class="conf-portrait" style="flex-shrink:0;border-radius:8px;overflow:hidden;line-height:0;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${cp}<\/div>
      <div><div class="conf-name">${c.who.name}<\/div><div class="conf-label">${c.who.archetype} · ${c.who.personality}<\/div><\/div>
    <\/div><div class="conf-text">${c.text}<\/div><\/div>`;});}
  if(!ep.dramaMsg&&!ep.idolFinder&&!ep.interactions.length&&!ep.confessionals.length&&!ep.twist&&!ep.mergeHappened)
    html+=`<div style="font-size:13px;color:var(--text2);padding:8px 0">A quiet day at camp. Everyone conserving energy before the challenge.<\/div>`;
  html+=`<\/div>`;
  return html;
}

// HOST CHOOSES CHALLENGE
function buildChallengeChooser(ep){
  let html=`<div class="stage-block anim-in"><div class="stage-label">🏆 Choose the Challenge<\/div>`;
  html+=`<div class="host-panel"><div class="host-panel-title">HOST DECISION<\/div>
    <div class="host-panel-sub">You are the host. Pick which challenge the ${G.merged?'players':'tribes'} will compete in today.<\/div>
  <\/div>`;
  html+=`<div class="challenge-picker-grid">`;
  ep.challengeOptions.forEach((ch,i)=>{
    const statColors={physical:'#0EA5E9',social:'#16A34A',mental:'#9333EA',endurance:'#EAB308'};
    const col=statColors[ch.type]||'#888';
    html+=`<div class="challenge-pick-card" onclick="selectChallenge(${i})" id="cpick-${i}">
      <div class="challenge-pick-icon">${ch.icon}<\/div>
      <div class="challenge-pick-name">${ch.name}<\/div>
      <div class="challenge-pick-badge" style="background:${col}22;color:${col};border:1px solid ${col}44">${ch.type.toUpperCase()}<\/div>
      <div class="challenge-pick-flavor">${ch.flavor}<\/div>
    <\/div>`;
  });
  html+=`<\/div>`;
  html+=`<div id="challenge-pick-nav" style="margin-top:16px"><\/div>`;
  html+=`<\/div>`;
  return html;
}

let _selectedChallengeIdx=null;
function selectChallenge(idx){
  _selectedChallengeIdx=idx;
  document.querySelectorAll('.challenge-pick-card').forEach((c,i)=>{
    c.classList.toggle('selected',i===idx);
  });
  const nav=document.getElementById('challenge-pick-nav');
  if(nav) nav.innerHTML=`<button class="btn btn-fire" onclick="confirmChallenge()">🏆 Run This Challenge →<\/button>`;
}
function confirmChallenge(){
  if(_selectedChallengeIdx===null) return;
  const ch=G.currentEpData.challengeOptions[_selectedChallengeIdx];
  _selectedChallengeIdx=null;
  runChallengeWithChoice(ch);
}

function buildStageChallenge(ep){
  const r=ep.challengeResult; if(!r) return '';
  let html=`<div class="stage-block anim-in"><div class="stage-label">🏆 The Challenge: ${r.name}<\/div>`;
  html+=`<div class="challenge-header-card" style="background:linear-gradient(135deg,#0EA5E910,#0EA5E905);border:1px solid #0EA5E930;border-radius:var(--radius-lg);padding:16px;margin-bottom:14px;display:flex;align-items:center;gap:14px">
    <div style="font-size:40px">${r.icon||'🏆'}<\/div>
    <div><div style="font-size:18px;font-weight:700">${r.name}<\/div><div style="font-size:12px;color:var(--text2);margin-top:4px;line-height:1.5">${r.flavor||''}<\/div><\/div>
  <\/div>`;
  if(r.tieMsg) html+=`<div class="tie-banner">⚖️ ${r.tieMsg}<\/div>`;
  if(r.type==='individual'){
    const top=r.scores.slice(0,Math.min(6,r.scores.length));
    const maxS=Math.max(...top.map(s=>s.score),1);
    html+=`<div class="event-card type-challenge"><div class="event-card-type">Individual Immunity · ${r.stat.toUpperCase()}<\/div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="width:48px;height:56px;flex-shrink:0">${r.winner?getPortrait(r.winner):''}<\/div>
        <div><span class="badge badge-win" style="font-size:13px;padding:6px 12px">🛡️ ${r.winner?.name||'?'} wins immunity!<\/span><\/div>
      <\/div>`;
    if(G.settings.showScores){
      html+=`<div class="score-bars animated-bars">`;
      top.forEach((s,i)=>{html+=`<div class="score-bar-row" style="animation-delay:${i*0.12}s">
        <span class="score-bar-label" style="display:flex;align-items:center;gap:5px">
          <span style="width:14px;height:14px;border-radius:50%;background:${s.color};display:inline-block;flex-shrink:0"><\/span>
          <span style="font-size:11px;${i===0?'font-weight:700':''}">${s.name.split(' ')[0]}<\/span>
        <\/span>
        <div class="score-bar-track"><div class="score-bar-fill score-bar-anim" style="--target-width:${Math.round(s.score/maxS*100)}%;background:${s.color}"><\/div><\/div>
        <span class="score-bar-val">${s.score}<\/span>
      <\/div>`;});
      html+=`<\/div>`;
    }
    html+=`<\/div>`;
  } else {
    const maxS=Math.max(...(r.scores||[]).map(s=>s.totalScore),1);
    html+=`<div class="event-card type-challenge"><div class="event-card-type">Tribe Challenge · ${r.stat.toUpperCase()}<\/div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <span class="badge badge-leaf">👑 ${r.winner?.team?.name||'?'} wins!<\/span>
        <span class="badge badge-red">⚠️ ${r.loser?.team?.name||'?'} goes to tribal<\/span>
      <\/div>`;
    if(G.settings.showScores&&r.scores){
      html+=`<div class="score-bars animated-bars">`;
      r.scores.forEach((s,i)=>{html+=`<div class="score-bar-row" style="animation-delay:${i*0.15}s">
        <span class="score-bar-label" style="color:${s.team.color};font-weight:600;font-size:12px">${s.team.name}<\/span>
        <div class="score-bar-track"><div class="score-bar-fill score-bar-anim" style="--target-width:${Math.round(Math.max(0,s.totalScore)/Math.max(maxS,1)*100)}%;background:${s.team.color}"><\/div><\/div>
        <span class="score-bar-val">${Math.max(0,s.totalScore)}<\/span>
      <\/div>`;});
      html+=`<\/div>`;
    }
    html+=`<\/div>`;
  }
  html+=`<\/div>`;
  return html;
}

function buildStageTribal(ep){
  if(ep.noElim) return`<div class="stage-block anim-in"><div class="stage-label">🔦 Tribal Council<\/div>
    <div class="event-card type-merge"><div class="event-card-type">No Vote<\/div><div class="event-card-title">🛡️ No Elimination Tonight<\/div><div class="event-card-body">Nobody was voted out. The game continues.<\/div><\/div><\/div>`;
  if(!ep.voteResult) return '';

  let html=`<div class="stage-block anim-in"><div class="stage-label">🔦 Tribal Council<\/div>`;

  // ── HOST TRANSITION: BEFORE TRIBAL COUNCIL ─────────────────────────────
  const beforeTribal = ep._aiBeforeTribal || ep._beforeTribal || buildBeforeTribalNarration(ep);
  if(beforeTribal){
    const losingTribeName = (!G.merged && ep.loseTeam!=null && G.teams[ep.loseTeam])
      ? G.teams[ep.loseTeam].name : 'the tribe';
    html+=`<div class="host-narration-card" style="background:linear-gradient(135deg,rgba(232,69,10,0.18),rgba(232,69,10,0.04));border-left:4px solid var(--fire);border-radius:var(--radius-lg);padding:18px 20px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--fire);letter-spacing:0.08em;margin-bottom:6px">🔦 HOST TRANSITION<\/div>
      <div style="font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:0.03em;margin-bottom:10px;line-height:1.1">BEFORE TRIBAL COUNCIL<\/div>
      <div style="font-size:14px;line-height:1.55;color:var(--text)">${esc(beforeTribal)}<\/div>
    <\/div>`;
  }

  // Atmosphere
  html+=`<div class="tribal-atmosphere">
    <div class="tribal-fire-row">${Array.from({length:5},()=>`<div class="tribal-flame">🔥<\/div>`).join('')}<\/div>
    <div class="tribal-atmosphere-text">The torch light flickers. Only one will leave tonight.<\/div>
  <\/div>`;

  // Idol play
  if(ep.idolPlay){
    html+=`<div class="idol-play-popup">
      <div class="idol-play-popup-icon">💎<\/div>
      <div class="idol-play-popup-title">${ep.idolPlay.idolPlayer.name} plays their idol!<\/div>
      <div class="idol-play-popup-sub">All votes against ${ep.idolPlay.idolPlayer.name} are null and void.<br>The vote now falls on someone else entirely.<\/div>
    <\/div>`;
  }

  // Tie breaker message
  if(ep.voteResult.tied&&ep.voteResult.tiebreakerApplied){
    html+=`<div class="tie-banner">⚖️ ${ep.voteResult.tiebreakerApplied}<\/div>`;
  }

  // ===== TRIBAL COUNCIL QUIZ: HOST ASKS A QUESTION =====
  // Only if merged (adds strategy drama)
  if(G.merged&&ep.voteResult&&!ep._tribalQuestionAnswered){
    const active=getActive();
    const q=pickTribalQuestion(ep,active);
    if(q){
      html+=`<div class="host-panel" id="tribal-question-panel">
        <div class="host-panel-title">🎙️ HOST QUESTION<\/div>
        <div class="host-panel-sub">${q.prompt}<\/div>
        <div class="host-options">
          ${q.options.map((opt,i)=>`<button class="host-option-btn" onclick="answerTribalQuestion(${i},'${q.id}')" id="tq-opt-${i}">${opt}<\/button>`).join('')}
        <\/div>
      <\/div>`;
    }
  }

  // Build ordered votes for reveal — fully randomised, NO pre-sorting by outcome
  // We must not sort elim votes last (reveals the answer by position/count)
  const {tally,individualVotes}=ep.voteResult;
  if(!individualVotes||!individualVotes.length) return html+'<div style="font-size:13px;color:var(--text2);padding:8px">Votes were cast in private.<\/div><\/div>';
  
  // Fully shuffle — the suspense comes from not knowing which is which
  // Store the order on ep so initVoteReveal can use the exact same sequence
  const orderedVotes=shuffle([...individualVotes]);
  ep._renderedVoteOrder=orderedVotes;

  html+=`<div class="event-card type-vote">
    <div class="event-card-type">🗳️ The Votes<\/div>
    <div class="event-card-title" style="margin-bottom:14px">I'll now read the votes…<\/div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px">Click each parchment to flip it and reveal a vote. You must reveal them in order.<\/div>
    <div class="vote-parchments" id="vote-parchments">`;

  orderedVotes.forEach((v,i)=>{
    // NO isElimVote class on the front — styling only revealed when flipped
    html+=`<div class="vote-parchment" id="vp-${i}" onclick="flipVote(${i})" title="Click to reveal vote ${i+1}">
      <div class="vp-inner">
        <div class="vp-front">
          <span class="vp-scroll-icon">📜<\/span>
          <span class="vp-hint">${i+1} of ${orderedVotes.length}<\/span>
        <\/div>
        <div class="vp-back" id="vp-back-${i}">
          <div class="vp-voter-row">
            <span class="vp-voter-dot" style="background:${v.voter.color}"><\/span>
            <span class="vp-voter-name">${v.voter.name.split(' ')[0]}<\/span>
          <\/div>
          <div class="vp-arrow-icon">↓<\/div>
          <div class="vp-target-name" id="vp-target-${i}">${v.target.name}<\/div>
          ${v.reason?`<div style="font-size:9px;color:var(--text3);text-align:center;margin-top:2px;font-style:italic">${VOTE_REASONS[v.reason]||''}<\/div>`:''}
          ${v.extra?'<div class="vp-extra">extra vote<\/div>':''}
        <\/div>
      <\/div>
    <\/div>`;
  });

  html+=`<\/div>
    <div class="running-tally" id="running-tally">
      <div class="tally-label">Tally so far<\/div>
      <div id="tally-display"><\/div>
    <\/div>
    <div id="tribal-nav-inner" style="margin-top:14px">
      <div style="font-size:12px;color:var(--text2)">Flip all ${orderedVotes.length} parchments to reveal who's going home.<\/div>
    <\/div>
  <\/div><\/div>`;
  return html;
}


let _voteRevealIdx=0,_revealedVotes={},_totalVotes=0,_orderedVotes=[];
function initVoteReveal(){
  const ep=G.currentEpData;
  const {individualVotes}=ep.voteResult;
  // Must use the SAME shuffle seed as buildStageTribal used.
  // Since we can't replay the same shuffle, we re-read the rendered order from the DOM.
  // We store the order in a data attribute during buildStageTribal via _orderedVotes being set
  // here from the already-rendered parchments. Instead: store order on ep at build time.
  _orderedVotes=ep._renderedVoteOrder||shuffle([...individualVotes]);
  _voteRevealIdx=0; _revealedVotes={}; _totalVotes=_orderedVotes.length;
}
function flipVote(i){
  const ep=G.currentEpData;
  const parchment=document.getElementById(`vp-${i}`);
  if(!parchment||parchment.classList.contains('flipped')) return;
  if(i!==_voteRevealIdx){
    parchment.classList.add('shake');
    setTimeout(()=>parchment.classList.remove('shake'),500);
    const hint=document.querySelector(`#vp-${_voteRevealIdx} .vp-hint`);
    if(hint){hint.textContent='← flip this one';hint.style.color='var(--fire)';}
    return;
  }
  parchment.classList.add('flipped');
  const v=_orderedVotes[i];

  // No colour change on flip — tiles stay neutral throughout the reveal

  _revealedVotes[v.target.id]=(_revealedVotes[v.target.id]||0)+1;
  _voteRevealIdx++;
  updateRunningTally(ep);

  if(_voteRevealIdx>=_totalVotes){
    const nav=document.getElementById('tribal-nav-inner');
    if(nav) nav.innerHTML=`<button class="btn btn-fire" onclick="revealElimination()" style="animation:pulse-fire 1.5s infinite">🔦 The tribe has spoken…<\/button>`;
  }
}

function updateRunningTally(ep){
  const display=document.getElementById('tally-display'); if(!display) return;
  const sorted=Object.entries(_revealedVotes).sort((a,b)=>b[1]-a[1]);
  if(!sorted.length) return;

  // Find the current leader(s) — highlight whoever has the MOST revealed votes so far
  // Do NOT pre-reveal who the final eliminated is
  const topCount=sorted[0][1];
  const leaders=new Set(sorted.filter(([,c])=>c===topCount).map(([id])=>id));

  display.innerHTML=sorted.map(([id,count])=>{
    const p=G.cast.find(c=>c.id===id); if(!p) return '';
    const isLeader=leaders.has(id);
    const col=isLeader?p.color:'#888';
    const portraitMini=p.customImage
      ? `<img src="${p.customImage}" style="width:24px;height:24px;object-fit:cover;object-position:top;border-radius:50%">`
      : getPortrait(p).replace(/width="120"/g,'width="24"').replace(/height="145"/g,'height="29"').replace(/viewBox="0 0 120 145"/g,'viewBox="5 5 110 100"');
    return `<div class="tally-chip${isLeader?' tally-elim':''}" style="border-color:${isLeader?col+'99':'var(--border2)'}">
      <div class="tally-portrait">${portraitMini}<\/div>
      <span class="tally-name">${p.name.split(' ')[0]}<\/span>
      <span class="tally-count" style="color:${col}">${count}<\/span>
    <\/div>`;
  }).join('');
}


function buildStageElimination(ep){
  if(ep.noElim||!ep.eliminated) return`<div class="stage-block anim-in"><div class="stage-label">✅ Result<\/div><div class="event-card type-merge"><div class="event-card-body">No one was eliminated.<\/div><\/div><\/div>`;
  if(!ep.eliminated.eliminated){
    ep.eliminated.eliminated=true; ep.eliminated.elimEp=ep.ep;
    if(G.settings.jury&&G.merged&&!G.jury.find(j=>j.id===ep.eliminated.id)){ep.eliminated.juryMember=true;G.jury.push(ep.eliminated);}
  }
  if(ep.eliminated2&&!ep.eliminated2.eliminated){
    ep.eliminated2.eliminated=true; ep.eliminated2.elimEp=ep.ep;
    if(G.settings.jury&&G.merged&&!G.jury.find(j=>j.id===ep.eliminated2.id)){ep.eliminated2.juryMember=true;G.jury.push(ep.eliminated2);}
  }
  let html=`<div class="stage-block anim-in"><div class="stage-label">🔦 The Tribe Has Spoken<\/div>`;
  html+=buildElimBanner(ep.eliminated);
  if(ep.eliminated2) html+=buildElimBanner(ep.eliminated2);
  html+=`<\/div>`;
  updateGameSidebar();
  return html;
}

function buildElimBanner(p){
  const bigPortrait=getPortrait(p).replace('width="120" height="145"','width="80" height="97"');
  const stats=[
    {label:'PHY',val:p.physical,color:'#0EA5E9'},
    {label:'SOC',val:p.social,color:'#16A34A'},
    {label:'MEN',val:p.mental,color:'#9333EA'},
    {label:'END',val:p.endurance,color:'#EAB308'},
  ];
  return `<div class="elim-banner-big">
    <div class="elim-torch-anim">🔦<\/div>
    <div class="elim-portrait-wrap">${bigPortrait}<\/div>
    <div class="elim-text" style="flex:1">
      <div class="elim-name">${p.name}<\/div>
      <div class="elim-desc">${p.archetype}<\/div>
      <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
        ${stats.map(s=>`<div style="display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:${s.color}">${s.label} <span style="font-family:'DM Mono',monospace">${s.val}<\/span><\/div>`).join('<span style="color:#ddd;margin:0 1px">·<\/span>')}
      <\/div>
      ${p.juryMember?'<div class="elim-jury-tag" style="margin-top:6px">Joins the Jury 🏛️<\/div>':'<div style="font-size:11px;color:#991B1B;margin-top:4px">Their torch has been snuffed.<\/div>'}
    <\/div>
    <div class="torch-snuff-anim">💨<\/div>
  <\/div>`;
}

function buildStageNav(ep,idx){
  let html=`<div class="ep-stage-nav" id="stage-nav">`;
  const active=getActive();
  const isFinale=active.length<=G.settings.finaleSize;

  if(idx===0){
    html+=`<span class="host-decision-chip">🎙️ HOST CHOICE<\/span> `;
    html+=`<button class="btn btn-fire" onclick="renderStage(1)">🏆 Head to the Challenge →<\/button>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="addDramaEvent()">🎭 Stir Drama<\/button>`;
    if(G.settings.idols&&getActive().length>0) html+=`<button class="btn btn-outline btn-sm" onclick="hostPlantIdol()">💎 Plant an Idol<\/button>`;
    html+=`<button class="btn btn-outline btn-sm" style="border-color:var(--fire);color:var(--fire)" onclick="showProducerPanel()">🎬 Producer<\/button>`;
  } else if(idx===1){
    if(!ep.challengeResult){
      // still on challenge chooser
      html+=`<div style="font-size:12px;color:var(--text2)">Select a challenge above to continue.<\/div>`;
    } else if(ep.noElim){
      html+=`<button class="btn btn-fire" onclick="nextEpisode()">Continue →<\/button>`;
    } else if(ep.voteResult){
      html+=`<button class="btn btn-fire" onclick="renderStage(2)">🔦 Go to Tribal Council →<\/button>`;
      html+=`<button class="btn btn-outline btn-sm" onclick="hostGrantImmunity()">🛡️ Grant Immunity<\/button>`;
    } else {
      html+=`<button class="btn btn-fire" onclick="nextEpisode()">Next Episode ${G.episode+1} →<\/button>`;
    }
  } else if(idx===2){
    html+=`<div style="font-size:12px;color:var(--text2)">Flip all parchments above to read the votes.<\/div>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="revealAllVotes()">📜 Reveal All<\/button>`;
  } else if(idx>=4){
    const nextLabel=isFinale?'🏆 Go to Finale':`Episode ${G.episode+1} →`;
    html+=`<button class="btn btn-fire" onclick="${isFinale?'runFinale()':'nextEpisode()'}">${nextLabel}<\/button>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="showEpisodeScripts(${ep.ep})">📜 Episode Script<\/button>`;
    html+=`<button class="btn btn-outline btn-sm" onclick="showCastStatus()">👥 Cast Status<\/button>`;
    if(G.jury.length) html+=`<button class="btn btn-outline btn-sm" onclick="showJuryPanel()">🏛️ Jury (${G.jury.length})<\/button>`;
  }
  html+=`<\/div>`;
  return html;
}


function revealElimination(){renderStage(4);}
function nextEpisode(){G.episode++;G.cast.forEach(c=>c.immunity=false);saveGame(true);computeAndStartEpisode();}
function nextAction(){nextEpisode();}

// ===== CAST STATUS =====

// ===== HOST ACTION HELPERS =====
function addDramaEvent(){
  const line=pick(DRAMA_EVENTS);
  G.dramaLevel=Math.min(G.dramaLevel+1,5);
  const ep=G.currentEpData;
  ep.dramaMsg=(ep.dramaMsg?ep.dramaMsg+' Also: ':'')+line;
  notify('Drama added! 🎭');
  renderStage(0);
}

function hostPlantIdol(){
  const pool=getActive().filter(c=>!G.idolHolders.includes(c.id));
  if(!pool.length){notify('Everyone already has an idol!');return;}
  const lucky=pick(pool);
  G.idolHolders.push(lucky.id);
  G.currentEpData.idolFinder=lucky;
  notify(`💎 Idol planted for ${lucky.name}!`,'win');
  renderStage(0);
}

function hostGrantImmunity(){
  const active=getActive();
  if(!active.length) return;
  // Show picker
  const modal=document.getElementById('modal-player-content');
  modal.innerHTML=`<div class="modal-title">🛡️ Grant Extra Immunity<\/div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Choose a player to grant immunity to for this tribal.<\/div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      ${active.map(p=>`<div onclick="applyHostImmunity('${p.id}')" style="cursor:pointer;text-align:center;padding:10px;border:1.5px solid var(--border2);border-radius:10px;transition:all 0.15s" onmouseover="this.style.borderColor='var(--fire2)'" onmouseout="this.style.borderColor='var(--border2)'">
        ${getPortrait(p).replace('width="120" height="145"','width="48" height="58"')}
        <div style="font-size:11px;font-weight:600;margin-top:4px">${p.name.split(' ')[0]}<\/div>
      <\/div>`).join('')}
    <\/div>`;
  openModal('modal-player-detail');
}

function applyHostImmunity(id){
  const p=G.cast.find(c=>c.id===id); if(!p) return;
  p.immunity=true;
  // Recompute vote without this person being eligible
  const ep=G.currentEpData;
  const votePool=G.merged?getActive():(ep.challengeResult?.loser?.members||[]);
  let vr=runVote(votePool,p);
  const ic=checkIdolPlay(vr.eliminated,votePool);
  if(ic){ep.idolPlay=ic;const np=votePool.filter(x=>x.id!==ic.idolPlayer.id);vr=runVote(np,p);vr.eliminated=ic.newElim;}
  ep.voteResult=vr; ep.eliminated=vr.eliminated;
  closeModal('modal-player-detail');
  notify(`🛡️ ${p.name} granted immunity by the host!`,'win');
  renderStage(1);
}

function revealAllVotes(){
  const ep=G.currentEpData;
  if(!ep.voteResult||!_orderedVotes.length) return;
  while(_voteRevealIdx<_totalVotes){
    const i=_voteRevealIdx;
    const parchment=document.getElementById(`vp-${i}`);
    if(parchment) parchment.classList.add('flipped');
    const v=_orderedVotes[i];
    // No colour change — tiles stay neutral
    _revealedVotes[v.target.id]=(_revealedVotes[v.target.id]||0)+1;
    _voteRevealIdx++;
  }
  updateRunningTally(ep);
  const nav=document.getElementById('tribal-nav-inner');
  if(nav) nav.innerHTML=`<button class="btn btn-fire" onclick="revealElimination()" style="animation:pulse-fire 1.5s infinite">🔦 The tribe has spoken…<\/button>`;
}

// ===== TRIBAL COUNCIL HOST QUESTIONS =====
function pickTribalQuestion(ep,active){
  const eliminated=ep.eliminated; if(!eliminated) return null;
  const immune=active.find(p=>p.immunity);
  const questions=[
    {
      id:'q_target',
      prompt:`Before the vote — who do you think is most at risk tonight?`,
      options:active.slice(0,4).map(p=>p.name.split(' ')[0]),
      onAnswer:(idx)=>{
        const chosen=active[idx];
        if(chosen&&chosen.id===eliminated.id) notify('Your read was right! 👀','win');
        else notify(`You guessed ${chosen?.name.split(' ')[0]} — but it was ${eliminated.name}!`);
      }
    },
    {
      id:'q_idol',
      prompt:`Do you think anyone will play a hidden immunity idol tonight?`,
      options:['Yes, definitely','Probably not','No chance'],
      onAnswer:(idx)=>{
        const played=!!ep.idolPlay;
        if(idx===0&&played) notify('Correct! An idol was played! 💎','win');
        else if(idx!==0&&!played) notify('Correct — no idol tonight!','win');
        else notify(played?'An idol WAS played!':'No idol was played.');
      }
    },
    {
      id:'q_loyalty',
      prompt:`Will tonight's vote be unanimous or split?`,
      options:['Unanimous','Split vote','Very close split'],
      onAnswer:(idx)=>{
        const tally=ep.voteResult.tally||{};
        const vals=Object.values(tally);
        const total=vals.reduce((a,b)=>a+b,0);
        const max=Math.max(...vals);
        const isUnan=max===total;
        const isSplit=vals.filter(v=>v>0).length>2;
        if(idx===0&&isUnan) notify('Correct — unanimous vote!','win');
        else if(idx===1&&!isUnan&&!isSplit) notify('Correct — it was a split!','win');
        else if(idx===2&&isSplit) notify('Correct — many split votes!','win');
        else notify('Not quite — the tribe had other ideas.');
      }
    },
  ];
  return pick(questions);
}

function answerTribalQuestion(optIdx,qId){
  document.querySelectorAll('.host-option-btn').forEach((b,i)=>{
    b.classList.toggle('selected',i===optIdx);
    b.disabled=true;
  });
  const ep=G.currentEpData;
  if(!ep) return;
  const active=getActive();
  const q=pickTribalQuestion(ep,active); // pick same questions pool for callback
  // Fire relevant feedback
  const tally=ep.voteResult?.tally||{};
  const vals=Object.values(tally);
  const total=vals.reduce((a,b)=>a+b,0);
  const max=Math.max(...vals,0);
  const eliminated=ep.eliminated;
  
  // Generic feedback based on question type
  const feedbacks={
    q_target: ()=>{
      const chosen=active[optIdx];
      if(chosen&&chosen.id===eliminated?.id) notify('Your read was spot on! 🎯','win');
      else notify(`Interesting guess — the tribe had different plans.`);
    },
    q_idol:()=>{
      const played=!!ep.idolPlay;
      if(optIdx===0&&played) notify('Correct! An idol was played! 💎','win');
      else if(optIdx!==0&&!played) notify('Correct — no idol tonight!','win');
      else notify(played?'An idol WAS played — you guessed wrong!':'No idol was played.');
    },
    q_loyalty:()=>{
      const isUnan=max===total;
      const splitCount=vals.filter(v=>v>0).length;
      if(optIdx===0&&isUnan) notify('Correct — unanimous!','win');
      else if(optIdx===1&&!isUnan&&splitCount<=2) notify('Correct — split vote!','win');
      else if(optIdx===2&&splitCount>2) notify('Correct — chaotic split!','win');
      else notify('The tribe surprised you!');
    },
  };
  (feedbacks[qId]||feedbacks.q_target)();
  ep._tribalQuestionAnswered=true;
  // Hide question panel
  const panel=document.getElementById('tribal-question-panel');
  if(panel) panel.style.opacity='0.5';
}

// ===== JURY PANEL MODAL =====
function showJuryPanel(){
  const modal=document.getElementById('modal-cast-content');
  const doc=document.querySelector('.modal-title');
  if(doc) doc.textContent='🏛️ The Jury';
  modal.innerHTML=`
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Players eliminated after the merge who will vote for the winner at the finale.<\/div>
    <div class="jury-portrait-row">
      ${G.jury.map(p=>`<div class="jury-portrait-item" onclick="showPlayerDetail('${p.id}');closeModal('modal-cast-status')">
        ${getPortrait(p).replace('width="120" height="145"','width="64" height="77"')}
        <div class="jp-name">${p.name.split(' ')[0]}<\/div>
        <div style="font-size:9px;color:var(--text3)">Ep ${p.elimEp||'?'}<\/div>
      <\/div>`).join('')}
    <\/div>
    ${!G.jury.length?'<div style="font-size:13px;color:var(--text3);padding:16px;text-align:center">No jury members yet — they join after the merge.<\/div>':''}
    <div style="font-size:12px;color:var(--text3);margin-top:8px">Jury members will vote for the winner based on gameplay, loyalty, and how you treated them.<\/div>`;
  openModal('modal-cast-status');
}

// ===== SHOW FULL SEASON STATS =====
function showSeasonStats(){
  const modal=document.getElementById('modal-cast-content');
  const doc=document.querySelector('.modal-title');
  if(doc) doc.textContent='📊 Season Stats';
  const sorted=G.cast.filter(c=>c.challengeWins>0).sort((a,b)=>b.challengeWins-a.challengeWins);
  const alliances=G.alliances.filter(a=>a.members.some(id=>!G.cast.find(c=>c.id===id)?.eliminated));
  modal.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:var(--fire)">${G.episode}<\/div>
        <div style="font-size:11px;color:var(--text2)">Episodes played<\/div>
      <\/div>
      <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:var(--fire)">${G.cast.filter(c=>c.eliminated).length}<\/div>
        <div style="font-size:11px;color:var(--text2)">Players eliminated<\/div>
      <\/div>
      <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:var(--win)">${G.idolHolders.length}<\/div>
        <div style="font-size:11px;color:var(--text2)">Idols in play<\/div>
      <\/div>
      <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:var(--jury)">${G.alliances.length}<\/div>
        <div style="font-size:11px;color:var(--text2)">Alliances formed<\/div>
      <\/div>
    <\/div>
    ${sorted.length?`<div style="font-size:13px;font-weight:600;margin-bottom:8px">🏆 Challenge Wins<\/div>
    ${sorted.map(p=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
      ${getPortrait(p).replace('width="120" height="145"','width="32" height="39"')}
      <span style="font-size:13px;flex:1">${p.name}<\/span>
      <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:var(--win)">${p.challengeWins} win${p.challengeWins!==1?'s':''}<\/span>
    <\/div>`).join('')}`:''}`;
  openModal('modal-cast-status');
}

// ===== ALLIANCE WEB =====
function showAllianceWeb(){
  const active=getActive();
  const size=320,center=size/2;
  const angleStep=(2*Math.PI)/Math.max(active.length,1);
  const positions={};
  active.forEach((p,i)=>{
    const a=angleStep*i-Math.PI/2, r=110;
    positions[p.id]={x:center+Math.cos(a)*r, y:center+Math.sin(a)*r};
  });
  let svg=`<svg viewBox="0 0 ${size} ${size}" style="width:100%;max-width:360px;display:block;margin:0 auto">`;
  // Draw alliance lines
  G.alliances.forEach(al=>{
    const members=al.members.filter(id=>active.find(p=>p.id===id));
    for(let i=0;i<members.length;i++) for(let j=i+1;j<members.length;j++){
      const a=positions[members[i]],b=positions[members[j]];
      if(a&&b) svg+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#9333EA" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="4,3"/>`;
    }
  });
  // Draw players
  active.forEach(p=>{
    const pos=positions[p.id]; if(!pos) return;
    const hasIdol=G.idolHolders.includes(p.id);
    svg+=`<g transform="translate(${pos.x},${pos.y})">
      <circle cx="0" cy="0" r="18" fill="${p.color}" opacity="0.15"/>
      <circle cx="0" cy="0" r="14" fill="${p.color}"/>
      <text x="0" y="4" text-anchor="middle" font-size="9" font-weight="700" fill="white" font-family="'Bebas Neue',cursive">${p.initials}<\/text>
      ${hasIdol?`<text x="14" y="-10" font-size="10">💎<\/text>`:''}
      ${p.immunity?`<text x="-14" y="-10" font-size="10">🛡️<\/text>`:''}
      <text x="0" y="28" text-anchor="middle" font-size="8" fill="#57534E">${p.name.split(' ')[0]}<\/text>
    <\/g>`;
  });
  svg+=`<\/svg>`;
  svg+=`<div style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;color:var(--text2)"><span style="display:inline-block;width:24px;height:2px;background:#9333EA;border-top:1px dashed #9333EA"><\/span> Alliance connection<\/div>`;
  document.getElementById('modal-player-content').innerHTML=`<div style="font-size:16px;font-weight:600;margin-bottom:14px">🕸️ Alliance Web — Ep ${G.episode}<\/div>${svg}`;
  openModal('modal-player-detail');
}

function showPlayerDetail(id){
  const c=G.cast.find(p=>p.id===id); if(!c) return;
  const team=c.team!==null&&c.team!==undefined&&G.teams[c.team]?G.teams[c.team]:null;
  const hasIdol=G.idolHolders.includes(c.id);
  const alliances=G.alliances.filter(a=>a.members.includes(c.id));
  const streakVal=G.challengeWinStreaks[c.id]||0;
  const portrait=getPortrait(c).replace('width="120" height="145"','width="80" height="97"');
  const statColors={physical:'#0EA5E9',social:'#16A34A',mental:'#9333EA',endurance:'#EAB308'};
  document.getElementById('modal-player-content').innerHTML=`
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px">
      <div style="flex-shrink:0;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.12)">${portrait}<\/div>
      <div style="flex:1;min-width:0">
        <div style="font-size:20px;font-weight:700">${c.name}<\/div>
        <div style="font-size:13px;color:var(--text2);margin-top:2px">${c.archetype} · ${c.personality}<\/div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">
          ${team?`<span class="badge badge-gray" style="color:${team.color}">${team.name}<\/span>`:''}
          ${c.eliminated?`<span class="badge badge-red">Eliminated Ep ${c.elimEp||'?'}<\/span>`:'<span class="badge badge-leaf">Active<\/span>'}
        ${ep.sitOuts&&ep.sitOuts.length?`<div style="margin-top:8px;font-size:12px;color:var(--text2)">🪑 Sitting out: ${ep.sitOuts.map(s=>s.player.name.split(' ')[0]).join(', ')}<\/div>`:''}
          ${c.juryMember?`<span class="badge badge-purple">Jury<\/span>`:''}
          ${c.immunity?`<span class="badge badge-water">🛡 Immune<\/span>`:''}
          ${hasIdol?`<span class="badge badge-win">💎 Idol<\/span>`:''}
          ${streakVal>0?`<span class="badge badge-win">🏆 ${streakVal} win${streakVal!==1?'s':''}<\/span>`:''}
        <\/div>
      <\/div>
    <\/div>
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Challenge Stats<\/div>
      ${['physical','social','mental','endurance'].map(stat=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;width:70px">${stat}<\/span>
          <div style="flex:1;height:8px;background:var(--surface3);border-radius:4px;overflow:hidden">
            <div class="stat-sparkline-bar" style="width:${c[stat]*10}%;background:${statColors[stat]};height:8px;border-radius:4px"><\/div>
          <\/div>
          <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--text2);font-weight:600">${c[stat]}/10<\/span>
        <\/div>`).join('')}
    <\/div>
    ${alliances.length?`<div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Alliances<\/div>
      ${alliances.map(a=>{
        const partners=a.members.filter(mid=>mid!==c.id).map(mid=>{const p=G.cast.find(x=>x.id===mid);return p?`<span style="display:inline-flex;align-items:center;gap:4px">${getPortrait(p).replace('width="120" height="145"','width="18" height="22"')} ${p.name.split(' ')[0]}<\/span>`:'Unknown';});
        return `<div style="font-size:12px;padding:7px 10px;background:var(--surface2);border-radius:8px;margin-bottom:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="alliance-indicator">🤝 ${a.name}<\/span> with ${partners.join(', ')}
        <\/div>`;
      }).join('')}
    <\/div>`:''}`;
  openModal('modal-player-detail');
}

// ===== FINALE =====
function runFinale(){
  const finalists=getActive();
  // Enforce odd jury if finale is final-2 (prevents tie)
  const finaleSize=G.settings.finaleSize||3;
  if(finaleSize===2&&G.jury.length%2===0&&G.jury.length>0){
    // The most recently added jury member gets to participate in finale instead (moves to finalists)
    // — simplest fix: just note it; jury with even count means tied vote is resolved by random
    // The real Survivor rule: odd jury. We just protect against exact tie by random if needed.
    // (We handle ties in runFinale's vote logic below via tiebreak)
  }
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-finale').classList.add('active');
  document.getElementById('header-ep-badge').style.display='flex';
  document.getElementById('hdr-ep-txt').textContent=`Finale · ${G.settings.name}`;
  if(!G.settings.jury||!G.jury.length){renderFinaleNoJury(pick(finalists),finalists);return;}
  // Enforce odd jury when final 2 — prevents tied jury vote
  const finaleSize2=G.settings.finaleSize||3;
  if(finaleSize2===2&&G.jury.length%2===0&&G.jury.length>0){
    // Return the most recent jury member to the game as an additional finalist (edge case)
    // Simpler: add a note and break ties by most challenge wins
    G._evenJuryNote=true;
  }
  const votes={};finalists.forEach(f=>votes[f.id]=0);
  const reasons=['Most deserving game','Best strategic play','Loyalty and heart','Challenge dominance','Survived the most odds','Most authentic player','Outplayed everyone','Respected by all'];
  const juryVotes=G.jury.map(j=>{
    const scored=finalists.map(f=>{
      let score=rng(1,5);
      // Base personality/archetype affinity
      if(['Loyal','Hero','Underdog','Sweetheart'].some(p=>f.personality===p||f.archetype.includes(p))) score+=2;
      if(f.social>=8) score+=2; if(f.challengeWins>0) score+=1;
      if(f.archetype==='The Big Villain'||f.personality==='Villain') score-=1;
      // Memory-based jury bias — betrayals, saves, and relationship history
      // This is the key addition: jury members vote based on what actually happened
      if(typeof getJuryBias==='function'){
        const bias=getJuryBias(j.id,f.id);
        score+=bias/20; // normalise -100/+100 bias to roughly -5/+5 score range
      }
      return{finalist:f,score};
    }).sort((a,b)=>b.score-a.score);
    const votedFor=scored[0].finalist; votes[votedFor.id]++;
    return{juror:j,votedFor};
  });
  const sorted=finalists.slice().sort((a,b)=>(votes[b.id]||0)-(votes[a.id]||0));
  renderFinale(sorted[0],sorted,G.jury,juryVotes,votes,reasons);
}
function renderFinale(winner,sorted,jury,juryVotes,votes,reasons){
  document.getElementById('finale-container').innerHTML=`
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:64px;margin-bottom:8px;animation:flicker 2s ease-in-out infinite alternate">🏆<\/div>
      <div class="winner-title">THE WINNER IS<\/div>
      <div class="winner-name">${winner.name}<\/div>
      <div style="display:flex;justify-content:center;margin:14px 0">${getPortrait(winner)}<\/div>
      <div style="font-size:15px;color:var(--text2)">${winner.archetype} · ${winner.personality}<\/div>
      <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;flex-wrap:wrap">
        <span class="badge badge-win">🏆 ${votes[winner.id]} jury vote${votes[winner.id]!==1?'s':''}<\/span>
        <span class="badge badge-fire">🔥 ${G.settings.name}<\/span>
      <\/div>
    <\/div>
    <div class="finale-podium">
      ${sorted[1]?`<div class="podium-slot place-2"><div style="width:60px;margin:0 auto 6px">${getPortrait(sorted[1])}<\/div><div class="p-name">${sorted[1].name}<\/div><div class="p-votes">${votes[sorted[1].id]||0} votes<\/div><div style="font-size:11px;color:var(--text3)">#2<\/div><\/div>`:''}
      <div class="podium-slot place-1"><div style="font-size:20px;margin-bottom:4px">👑<\/div><div style="width:80px;margin:0 auto 6px;box-shadow:0 0 0 3px var(--win);border-radius:10px">${getPortrait(winner)}<\/div><div class="p-name" style="font-weight:700">${winner.name}<\/div><div class="p-votes" style="color:var(--win)">${votes[winner.id]} votes<\/div><div style="font-size:11px;color:var(--win);font-weight:600">WINNER<\/div><\/div>
      ${sorted[2]?`<div class="podium-slot place-3"><div style="width:48px;margin:0 auto 6px">${getPortrait(sorted[2])}<\/div><div class="p-name">${sorted[2].name}<\/div><div class="p-votes">${votes[sorted[2].id]||0} votes<\/div><div style="font-size:11px;color:var(--text3)">#3<\/div><\/div>`:''}
    <\/div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:24px">
      <div style="font-size:15px;font-weight:600;margin-bottom:14px">🗳️ Jury Votes<\/div>
      <table class="jury-votes-table"><thead><tr><th>Jury Member<\/th><th>Voted For<\/th><th>Reason<\/th><\/tr><\/thead><tbody>
        ${juryVotes.map(({juror,votedFor})=>`<tr>
          <td><div style="display:flex;align-items:center;gap:8px"><div style="width:36px;flex-shrink:0">${getPortrait(juror)}<\/div>${juror.name}<\/div><\/td>
          <td style="font-weight:600;color:${votedFor.color}">${votedFor.name}<\/td>
          <td style="color:var(--text2);font-size:12px">${pick(reasons)}<\/td>
        <\/tr>`).join('')}
      <\/tbody><\/table>
    <\/div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px">
      <button class="btn btn-fire" onclick="showEpisodeScripts()">📜 Read Full Season Script<\/button>
      <button class="btn btn-outline" onclick="goHome()">🔥 New Season<\/button>
      <button class="btn btn-outline" onclick="goSetup()">⚙️ Edit & Replay<\/button>
    <\/div>`;
}
function renderFinaleNoJury(winner,finalists){
  document.getElementById('finale-container').innerHTML=`<div style="text-align:center;padding:40px 0">
    <div style="font-size:64px">🏆<\/div><div class="winner-title">SOLE SURVIVOR<\/div>
    <div class="winner-name">${winner.name}<\/div>
    <div style="width:120px;margin:16px auto">${getPortrait(winner)}<\/div>
    <div style="margin-top:24px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-fire" onclick="showEpisodeScripts()">📜 Read Full Season Script<\/button><button class="btn btn-outline" onclick="goHome()">🔥 New Season<\/button><\/div>
  <\/div>`;
}