// No Signal — story.js
// Season Story Layer — the game reads its own season and identifies narrative highlights.
// Transforms vote sequences into remembered character arcs.
// Called at season end or on demand via the 📖 Season Story button.

// ===== SEASON NARRATIVE ANALYSER =====

/**
 * analyseSeasonStory()
 * Reads G.memories[], G.episodeLog[], G.cast, G.alliances
 * and identifies the key narrative moments that define this season.
 * Returns a structured story object used by buildSeasonStoryCard().
 */
function analyseSeasonStory(){
  const story={
    title:        null,   // auto-generated season tagline
    villain:      null,   // player who manipulated most aggressively
    hero:         null,   // dominant winner or fan favourite
    tragic:       null,   // player with power who lost it suddenly
    underdog:     null,   // most survived despite votes against them
    mastermind:   null,   // player who controlled the most votes
    bitterJuror:  null,   // jury member with highest betrayal score
    bestAlliance: null,   // alliance that lasted longest / deepest
    biggestBlindside: null, // highest-intensity betrayal event
    definingEpisode: null,  // episode with most significant events
    arcSummary:   null,   // 2-3 sentence season arc in prose
    playerArcs:   [],     // per-player arc summaries
  };

  if(!G.cast||!G.cast.length) return story;

  const eliminated=[...G.cast].filter(c=>c.eliminated&&c.elimEp).sort((a,b)=>a.elimEp-b.elimEp);
  const active=getActive();
  const winner=G.cast.find(c=>c.winner);
  const allMemories=G.memories||[];

  // ── VILLAIN ─────────────────────────────────────────────────────────────
  // Most betrayal events as SUBJECT (they did the betraying)
  const betrayalsByPlayer={};
  allMemories.filter(m=>m.type==='betrayal').forEach(m=>{
    betrayalsByPlayer[m.subject]=(betrayalsByPlayer[m.subject]||0)+m.intensity;
  });
  const villainId=Object.entries(betrayalsByPlayer).sort((a,b)=>b[1]-a[1])[0]?.[0];
  story.villain=villainId?G.cast.find(c=>c.id===villainId):null;

  // ── HERO / DOMINANT PLAYER ───────────────────────────────────────────────
  // Highest combined challenge wins + final placement + jury respect
  const heroScore=c=>{
    const wins=c.challengeWins||0;
    const placement=c.winner?1:(c.juryMember?G.jury.indexOf(G.jury.find(j=>j.id===c.id))+1:99);
    const juryBias=G.jury.reduce((sum,j)=>{
      return sum+(typeof getJuryBias==='function'?getJuryBias(j.id,c.id):0);
    },0);
    return wins*15 + (10-Math.min(placement,10)) + juryBias*0.1;
  };
  story.hero=winner||[...G.cast].sort((a,b)=>heroScore(b)-heroScore(a))[0];

  // ── TRAGIC DOWNFALL ──────────────────────────────────────────────────────
  // Player who held power (challenge wins, alliances) then was blindsided
  const tragicScore=c=>{
    if(!c.eliminated) return 0;
    const wins=c.challengeWins||0;
    const hadAlliance=(c.allianceIds||[]).length>0?1:0;
    // Higher elimination episode = deeper run = bigger fall
    const depth=c.elimEp||0;
    // Check if they were blindsided — many in their alliance voted them out
    const betrayedThem=allMemories.filter(m=>
      m.type==='betrayal'&&m.object===c.id&&m.intensity>=70
    ).length;
    return (wins*10) + (hadAlliance*8) + (depth*3) + (betrayedThem*15);
  };
  story.tragic=eliminated.length
    ?[...eliminated].sort((a,b)=>tragicScore(b)-tragicScore(a))[0]
    :null;

  // ── UNDERDOG ─────────────────────────────────────────────────────────────
  // Most votes received while surviving — narrowly escaped the most
  const votesReceivedWhileSurviving={};
  (G.episodeLog||[]).forEach(ep=>{
    if(!ep.voteResult?.tally) return;
    Object.entries(ep.voteResult.tally).forEach(([id,count])=>{
      const p=G.cast.find(c=>c.id===id);
      // Only count if they survived this episode
      if(p&&ep.eliminated?.id!==id&&count>0){
        votesReceivedWhileSurviving[id]=(votesReceivedWhileSurviving[id]||0)+count;
      }
    });
  });
  const underdogId=Object.entries(votesReceivedWhileSurviving)
    .sort((a,b)=>b[1]-a[1])[0]?.[0];
  story.underdog=underdogId?G.cast.find(c=>c.id===underdogId):null;

  // ── MASTERMIND ───────────────────────────────────────────────────────────
  // Player whose vote target went home the most (controlled most eliminations)
  const controlledVotes={};
  (G.episodeLog||[]).forEach(ep=>{
    if(!ep.voteResult?.individualVotes||!ep.eliminated) return;
    ep.voteResult.individualVotes.forEach(v=>{
      if(v.target.id===ep.eliminated.id){
        controlledVotes[v.voter.id]=(controlledVotes[v.voter.id]||0)+1;
      }
    });
  });
  const mastermindId=Object.entries(controlledVotes).sort((a,b)=>b[1]-a[1])[0]?.[0];
  story.mastermind=mastermindId?G.cast.find(c=>c.id===mastermindId):null;

  // ── BITTER JUROR ─────────────────────────────────────────────────────────
  // Jury member with highest total betrayal intensity against finalists
  if(G.jury&&G.jury.length){
    const finalists=active.length?active:G.cast.filter(c=>c.winner);
    const bitterScore=j=>finalists.reduce((sum,f)=>{
      const mems=allMemories.filter(m=>
        m.type==='betrayal'&&m.subject===j.id&&m.object===f.id
      );
      return sum+mems.reduce((s,m)=>s+m.intensity,0);
    },0);
    const sorted=[...G.jury].sort((a,b)=>bitterScore(b)-bitterScore(a));
    if(bitterScore(sorted[0])>0) story.bitterJuror=sorted[0];
  }

  // ── BEST ALLIANCE ────────────────────────────────────────────────────────
  // Alliance whose members collectively lasted deepest into the game
  if(G.alliances&&G.alliances.length){
    const allianceDepth=al=>{
      const members=al.members.map(id=>G.cast.find(c=>c.id===id)).filter(Boolean);
      const avgPlacement=members.reduce((sum,m)=>{
        const ep=m.eliminated?m.elimEp||0:G.episode+5;
        return sum+ep;
      },0)/Math.max(members.length,1);
      return avgPlacement * members.length;
    };
    story.bestAlliance=[...G.alliances].sort((a,b)=>allianceDepth(b)-allianceDepth(a))[0];
  }

  // ── BIGGEST BLINDSIDE ────────────────────────────────────────────────────
  // Highest intensity betrayal memory event
  const biggestBetrayalMem=allMemories
    .filter(m=>m.type==='betrayal')
    .sort((a,b)=>b.intensity-a.intensity)[0];
  if(biggestBetrayalMem){
    story.biggestBlindside={
      victim: G.cast.find(c=>c.id===biggestBetrayalMem.object),
      perpetrator: G.cast.find(c=>c.id===biggestBetrayalMem.subject),
      episode: biggestBetrayalMem.episode,
      intensity: biggestBetrayalMem.intensity,
    };
  }

  // ── DEFINING EPISODE ────────────────────────────────────────────────────
  // Episode with most significant combined events
  const epSignificance=ep=>{
    let score=0;
    if(ep.mergeHappened) score+=30;
    if(ep.idolPlay) score+=25;
    if(ep.twist) score+=10;
    if(ep.doubleElim) score+=20;
    if(ep.voteResult?.tied) score+=15;
    if(ep.evolutionEvents?.length) score+=ep.evolutionEvents.length*10;
    const betrayalsThisEp=allMemories.filter(m=>m.type==='betrayal'&&m.episode===ep.ep);
    score+=betrayalsThisEp.reduce((s,m)=>s+m.intensity,0)*0.1;
    return score;
  };
  if(G.episodeLog?.length){
    story.definingEpisode=[...G.episodeLog].sort((a,b)=>epSignificance(b)-epSignificance(a))[0];
  }

  // ── PLAYER ARCS ──────────────────────────────────────────────────────────
  // Per-player narrative summaries for the top 5 most story-relevant players
  const storyPlayers=new Set([
    story.villain, story.hero, story.tragic,
    story.underdog, story.mastermind
  ].filter(Boolean).map(p=>p.id));

  story.playerArcs=[...storyPlayers].slice(0,5).map(id=>{
    const p=G.cast.find(c=>c.id===id);
    if(!p) return null;
    return buildPlayerArc(p, story);
  }).filter(Boolean);

  // ── ARC SUMMARY ─────────────────────────────────────────────────────────
  story.arcSummary=buildArcSummary(story);

  // ── SEASON TAGLINE ───────────────────────────────────────────────────────
  story.title=buildSeasonTagline(story);

  return story;
}

// ===== ARC BUILDERS =====

/**
 * buildPlayerArc(player, story)
 * Generates a 2-3 sentence narrative summary of one player's season story.
 */
function buildPlayerArc(p, story){
  const fn=p.name.split(' ')[0];
  const evo=p.archetypeHistory?.length
    ? ` — evolving from ${p.archetypeHistory[0].from} to ${p.archetype} by episode ${p.archetypeHistory[p.archetypeHistory.length-1].episode}`
    : '';
  const wins=p.challengeWins||0;
  const isVillain=story.villain?.id===p.id;
  const isHero=story.hero?.id===p.id;
  const isTragic=story.tragic?.id===p.id;
  const isUnderdog=story.underdog?.id===p.id;
  const isMastermind=story.mastermind?.id===p.id;

  const votesAgainst=Object.values(
    (G.episodeLog||[]).reduce((acc,ep)=>{
      const v=ep.voteResult?.tally?.[p.id]||0;
      if(v>0) acc[ep.ep]=v;
      return acc;
    },{})
  ).reduce((s,v)=>s+v,0);

  let arc='';

  if(p.winner){
    arc=`${fn} played a complete game${wins>0?`, winning ${wins} challenge${wins!==1?'s':''}`:''}.`;
    if(isMastermind) arc+=` They controlled the vote more than anyone else in the game.`;
    else if(isHero) arc+=` Their social game never cracked under pressure.`;
    arc+=` At the finale, the jury rewarded them with the win.`;
  } else if(isTragic){
    arc=`${fn} had everything needed to win${wins>0?` — ${wins} challenge win${wins!==1?'s':''} and a strong alliance`:''}${evo}.`;
    arc+=` But the game turned on them in episode ${p.elimEp||'?'}, and the player who seemed untouchable became the most memorable elimination of the season.`;
  } else if(isVillain){
    arc=`${fn} left a trail of broken alliances and betrayal memories through this season${evo}.`;
    arc+=` Whether it was strategy or survival, nobody trusted them by the end — and the jury remembered every move.`;
  } else if(isUnderdog){
    arc=`${fn} received ${votesAgainst} vote${votesAgainst!==1?'s':''} against them and survived every single one${evo}.`;
    arc+=` They outlasted players with more power, more allies, and better odds. Somehow they're still here.`;
  } else if(isMastermind){
    arc=`${fn} controlled the direction of more votes than anyone else this season${evo}.`;
    arc+=` Most players never realised the extent of their influence until it was too late.`;
  } else {
    arc=`${fn} played a ${p.personality?.toLowerCase()||'strategic'} game${evo}`;
    arc+=p.eliminated?`, finishing in episode ${p.elimEp||'?'}.`:`, and is still fighting.`;
  }
  return { player:p, arc, role:isVillain?'Villain':isHero?'Hero':isTragic?'Tragic':isUnderdog?'Underdog':isMastermind?'Mastermind':'Player' };
}

/**
 * buildArcSummary(story)
 * 2-3 sentence season arc summary.
 */
function buildArcSummary(story){
  const parts=[];
  const sn=G.settings.name||'This season';

  if(story.villain&&story.hero&&story.villain.id!==story.hero.id){
    parts.push(`${sn} was defined by the collision between ${story.villain.name.split(' ')[0]}'s ruthless manipulation and ${story.hero.name.split(' ')[0]}'s steadier game.`);
  } else if(story.hero){
    parts.push(`${sn} belonged to ${story.hero.name.split(' ')[0]}, who emerged as the season's defining player.`);
  } else {
    parts.push(`${sn} was a season of shifting power and unpredictable alliances.`);
  }

  if(story.tragic){
    parts.push(`The season's most dramatic moment came when ${story.tragic.name.split(' ')[0]} — seemingly in control — was blindsided in episode ${story.tragic.elimEp||'?'}.`);
  } else if(story.biggestBlindside?.victim){
    parts.push(`The defining moment came in episode ${story.biggestBlindside.episode}, when ${story.biggestBlindside.victim.name.split(' ')[0]} was betrayed by ${story.biggestBlindside.perpetrator?.name.split(' ')[0]||'someone they trusted'}.`);
  }

  if(story.underdog&&story.underdog.id!==story.hero?.id){
    parts.push(`Throughout it all, ${story.underdog.name.split(' ')[0]} quietly survived everything the game threw at them — the season's most resilient story.`);
  }

  return parts.join(' ');
}

/**
 * buildSeasonTagline(story)
 * Generates a short dramatic tagline for the season.
 */
function buildSeasonTagline(story){
  const taglines=[
    story.villain&&story.hero&&story.villain.id!==story.hero.id
      ? `${story.hero.name.split(' ')[0]} vs ${story.villain.name.split(' ')[0]}: One Game, Two Visions`
      : null,
    story.tragic
      ? `The Fall of ${story.tragic.name.split(' ')[0]}`
      : null,
    story.underdog&&(G.cast.find(c=>c.winner)?.id===story.underdog.id)
      ? `The ${story.underdog.name.split(' ')[0]} Story: Against Every Odd`
      : null,
    story.biggestBlindside?.victim
      ? `Nobody Saw It Coming`
      : null,
    `${G.settings.name||'No Signal'}: A Season of Broken Trust`,
  ];
  return taglines.find(t=>t!==null)||`${G.settings.name||'No Signal'}`;
}

// ===== SEASON STORY CARD BUILDER =====

/**
 * buildSeasonStoryCard(story)
 * Returns HTML for the full season story card.
 * Visual, editorial, emotionally readable.
 */
function buildSeasonStoryCard(story){
  const winner=G.cast.find(c=>c.winner);

  let html=`<div class="ss-wrap">`;

  // ── SEASON TAGLINE ──────────────────────────────────────────────────────
  html+=`<div class="ss-tagline">${story.title||G.settings.name||'No Signal'}</div>`;

  // ── ARC SUMMARY ─────────────────────────────────────────────────────────
  if(story.arcSummary){
    html+=`<div class="ss-arc">${story.arcSummary}</div>`;
  }

  // ── STORY ROLES GRID ────────────────────────────────────────────────────
  const roles=[
    { label:'Season Villain',   player:story.villain,      icon:'😈', desc:'Most betrayals committed' },
    { label:'Dominant Player',  player:story.hero,         icon:'👑', desc:'Most control over outcome' },
    { label:'Tragic Fall',      player:story.tragic,       icon:'💔', desc:'Had power — then lost it all' },
    { label:'Underdog',         player:story.underdog,     icon:'🔥', desc:'Survived the most votes against' },
    { label:'Puppet Master',    player:story.mastermind,   icon:'🧵', desc:'Controlled the most eliminations' },
    { label:'Bitter Juror',     player:story.bitterJuror,  icon:'⚖️', desc:'Most aggrieved jury member' },
  ].filter(r=>r.player);

  if(roles.length){
    html+=`<div class="ss-roles">`;
    roles.forEach(r=>{
      const p=r.player;
      const port=p.customImage
        ?`<img src="${p.customImage}" style="width:52px;height:63px;object-fit:cover;object-position:top;border-radius:8px;display:block">`
        :getPortrait(p).replace('width="120" height="145"','width="52" height="63"');
      html+=`<div class="ss-role-card">
        <div class="ss-role-port" style="border-color:${p.color}">${port}</div>
        <div class="ss-role-icon">${r.icon}</div>
        <div class="ss-role-label">${r.label}</div>
        <div class="ss-role-name">${p.name.split(' ')[0]}</div>
        <div class="ss-role-arch">${p.archetype}</div>
        <div class="ss-role-desc">${r.desc}</div>
      </div>`;
    });
    html+=`</div>`;
  }

  // ── DEFINING EPISODE ────────────────────────────────────────────────────
  if(story.definingEpisode){
    const ep=story.definingEpisode;
    const title=ep.mergeHappened?'The Merge':ep.idolPlay?'The Idol Play':ep.doubleElim?'Double Elimination':`Episode ${ep.ep}`;
    html+=`<div class="ss-defining">
      <div class="ss-section-label">🎬 Defining Episode</div>
      <div class="ss-defining-title">Episode ${ep.ep} — ${title}</div>
      <div class="ss-defining-body">${ep.summary||''}</div>
    </div>`;
  }

  // ── BIGGEST BLINDSIDE ────────────────────────────────────────────────────
  if(story.biggestBlindside?.victim&&story.biggestBlindside?.perpetrator){
    const bs=story.biggestBlindside;
    html+=`<div class="ss-blindside">
      <div class="ss-section-label">💥 Biggest Blindside</div>
      <div class="ss-blindside-body">
        Episode ${bs.episode}: <strong>${bs.perpetrator.name.split(' ')[0]}</strong> betrayed <strong>${bs.victim.name.split(' ')[0]}</strong> with an intensity score of ${bs.intensity}/100.
        ${bs.intensity>=90?'An all-time betrayal.':bs.intensity>=70?'A defining moment of the season.':'A turning point nobody expected.'}
      </div>
    </div>`;
  }

  // ── BEST ALLIANCE ────────────────────────────────────────────────────────
  if(story.bestAlliance){
    const al=story.bestAlliance;
    const names=al.members.map(id=>G.cast.find(c=>c.id===id)?.name.split(' ')[0]).filter(Boolean);
    html+=`<div class="ss-alliance">
      <div class="ss-section-label">🤝 Most Effective Alliance</div>
      <div class="ss-alliance-names">${names.join(' · ')}</div>
    </div>`;
  }

  // ── PLAYER ARCS ──────────────────────────────────────────────────────────
  if(story.playerArcs?.length){
    html+=`<div class="ss-section-label" style="margin-top:16px">📖 Character Arcs</div>`;
    html+=`<div class="ss-arcs">`;
    story.playerArcs.forEach(a=>{
      const roleBadge=`<span class="ss-arc-role ss-role-${a.role.toLowerCase()}">${a.role}</span>`;
      html+=`<div class="ss-arc-item">
        <div class="ss-arc-header">${a.player.name} ${roleBadge}</div>
        <div class="ss-arc-text">${a.arc}</div>
      </div>`;
    });
    html+=`</div>`;
  }

  html+=`</div>`;
  return html;
}

// ===== SHOW SEASON STORY MODAL =====

/**
 * showSeasonStory()
 * Analyses the current season and shows the story card modal.
 */
function showSeasonStory(){
  if(!G.episodeLog?.length&&!G.cast.some(c=>c.eliminated)){
    notify('Play some episodes first — the story builds as the season unfolds');
    return;
  }
  const story=analyseSeasonStory();
  const card=buildSeasonStoryCard(story);
  const html=`${card}
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-fire" style="flex:1" data-action="exportSeasonStory">⬇ Export Story</button>
      <button class="btn btn-outline" style="flex:1" data-action="showSeasonRecap">📺 Full Recap</button>
    </div>`;
  openV19Modal('📖 Season Story', html);
  // Cache story for export
  window._currentStory=story;
}

/**
 * exportSeasonStory()
 * Exports the season story as a formatted text file.
 */
function exportSeasonStory(){
  const story=window._currentStory||analyseSeasonStory();
  let txt=`${(G.settings.name||'No Signal Season').toUpperCase()}\n`;
  txt+=`${story.title?story.title+'\n':''}\n`;
  if(story.arcSummary) txt+=`${story.arcSummary}\n\n`;

  txt+=`SEASON ROLES\n${'─'.repeat(40)}\n`;
  const roles=[
    ['Season Villain', story.villain],
    ['Dominant Player', story.hero],
    ['Tragic Fall',     story.tragic],
    ['Underdog',        story.underdog],
    ['Puppet Master',   story.mastermind],
    ['Bitter Juror',    story.bitterJuror],
  ];
  roles.filter(([,p])=>p).forEach(([role,p])=>{
    txt+=`${role}: ${p.name} (${p.archetype})\n`;
  });

  if(story.biggestBlindside?.victim){
    const bs=story.biggestBlindside;
    txt+=`\nBIGGEST BLINDSIDE\n${'─'.repeat(40)}\n`;
    txt+=`Episode ${bs.episode}: ${bs.perpetrator?.name||'?'} → ${bs.victim.name} (intensity: ${bs.intensity}/100)\n`;
  }

  if(story.bestAlliance){
    const names=story.bestAlliance.members
      .map(id=>G.cast.find(c=>c.id===id)?.name).filter(Boolean).join(', ');
    txt+=`\nBEST ALLIANCE\n${'─'.repeat(40)}\n${names}\n`;
  }

  if(story.playerArcs?.length){
    txt+=`\nCHARACTER ARCS\n${'─'.repeat(40)}\n`;
    story.playerArcs.forEach(a=>{
      txt+=`${a.player.name} (${a.role})\n${a.arc}\n\n`;
    });
  }

  txt+=`\nGenerated by No Signal — garryrobson85.github.io/No-Signal-\n`;

  const name=(G.settings.name||'no-signal').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const blob=new Blob([txt],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`${name}-story.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  notify('Season story exported ✓','win');
}

// ===== EXPORTS =====
export {
  analyseSeasonStory, buildSeasonStoryCard, buildPlayerArc,
  buildArcSummary, buildSeasonTagline,
  showSeasonStory, exportSeasonStory,
};
