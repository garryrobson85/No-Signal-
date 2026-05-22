// No Signal — features.js
// Tribe History, Profiles, Relationship Web, V19 Insights

// ===== V19 INSIGHTS / RELATIONSHIP TOOLS =====
function v19PlayerName(id){const p=G.cast.find(c=>c.id===id);return p?p.name:'Unknown';}
function v19ActiveThreatScore(c){
  const statAvg=((+c.physical||0)+(+c.social||0)+(+c.mental||0)+(+c.endurance||0))/4;
  const wins=(+c.challengeWins||0)*1.6;
  const idols=G.idolHolders&&G.idolHolders.includes(c.id)?2.2:0;
  const alliance=(c.allianceIds||[]).length*0.7;
  const juryPenalty=c.juryMember?-3:0;
  return Math.max(0, Math.round((statAvg+wins+idols+alliance+juryPenalty)*10)/10);
}
function v19SocialPowerScore(c){
  const rel=v19RelationshipScoresFor(c.id);
  const avg=rel.length?rel.reduce((a,b)=>a+b.score,0)/rel.length:50;
  return Math.round(((+c.social||0)*6 + avg*0.4 + ((c.allianceIds||[]).length*8))*10)/10;
}
function v19RelationshipKey(a,b){return [a,b].sort().join('|');}
function v19EnsureRelationships(){
  if(!G.relationships) G.relationships={};
  const ids=G.cast.map(c=>c.id);
  ids.forEach((a,i)=>ids.slice(i+1).forEach(b=>{
    const key=v19RelationshipKey(a,b);
    if(G.relationships[key]==null){
      const pa=G.cast.find(c=>c.id===a), pb=G.cast.find(c=>c.id===b);
      let base=50;
      if(pa&&pb){
        if((pa.allianceIds||[]).some(x=>(pb.allianceIds||[]).includes(x))) base+=18;
        if(pa.personality===pb.personality) base+=8;
        if(pa.archetype===pb.archetype) base+=5;
        base+=Math.round((((+pa.social||5)+(+pb.social||5))/2-5)*2);
      }
      G.relationships[key]=Math.max(5,Math.min(95,base));
    }
  }));
  return G.relationships;
}
function v19RelationshipScoresFor(id){
  v19EnsureRelationships();
  return Object.entries(G.relationships).filter(([k])=>k.includes(id)).map(([k,score])=>{
    const other=k.split('|').find(x=>x!==id);
    return {id:other, name:v19PlayerName(other), score:+score||50};
  }).sort((a,b)=>b.score-a.score);
}
function v19TopPairs(){
  v19EnsureRelationships();
  return Object.entries(G.relationships).map(([k,score])=>{
    const [a,b]=k.split('|'); return {a,b,score:+score||50};
  }).sort((x,y)=>y.score-x.score);
}
function openV19Modal(title,html){
  document.getElementById('modal-v19-title').textContent=title;
  document.getElementById('modal-v19-content').innerHTML=html;
  openModal('modal-v19');
}
function showV19Insights(){
  const active=getActive();
  v19EnsureRelationships();
  const threats=[...active].sort((a,b)=>v19ActiveThreatScore(b)-v19ActiveThreatScore(a));
  const social=[...active].sort((a,b)=>v19SocialPowerScore(b)-v19SocialPowerScore(a));
  const underdogs=[...active].sort((a,b)=>v19ActiveThreatScore(a)-v19ActiveThreatScore(b));
  const leader=threats[0], socialBoss=social[0], underdog=underdogs[0];
  let html=`<div class="v19-help">These are explainable v19 estimates, not hard-coded outcomes. They combine stats, challenge wins, idols, alliances and relationship strength so you can see why someone may become a target.<\/div>`;
  html+=`<div class="v19-card-grid">
    <div class="v19-insight-card"><div class="v19-insight-label">Biggest Threat<\/div><div class="v19-insight-value">${leader?leader.name:'—'}<\/div><div class="v19-insight-sub">Threat score ${leader?v19ActiveThreatScore(leader):0}<\/div><\/div>
    <div class="v19-insight-card"><div class="v19-insight-label">Social Power<\/div><div class="v19-insight-value">${socialBoss?socialBoss.name:'—'}<\/div><div class="v19-insight-sub">Power score ${socialBoss?v19SocialPowerScore(socialBoss):0}<\/div><\/div>
    <div class="v19-insight-card"><div class="v19-insight-label">Underdog<\/div><div class="v19-insight-value">${underdog?underdog.name:'—'}<\/div><div class="v19-insight-sub">Lowest visible threat<\/div><\/div>
    <div class="v19-insight-card"><div class="v19-insight-label">Seed<\/div><div class="v19-insight-value" style="font-size:15px">${G.settings.seed||'Random'}<\/div><div class="v19-insight-sub">Replayable if a seed is set<\/div><\/div>
  <\/div>`;
  html+=`<table class="v19-table"><thead><tr><th>Player<\/th><th>Threat<\/th><th>Social<\/th><th>Wins<\/th><th>Idol<\/th><th>Read<\/th><\/tr><\/thead><tbody>`;
  threats.forEach(c=>{
    const threat=v19ActiveThreatScore(c), sp=v19SocialPowerScore(c);
    const read=threat>=13?'Huge target':threat>=10?'Visible threat':sp>=75?'Protected socially':'Floating safely';
    html+=`<tr><td><strong>${c.name}<\/strong><div style="font-size:10px;color:var(--text3)">${c.archetype} · ${c.personality}<\/div><\/td><td><span class="v19-score-pill">${threat}<\/span><\/td><td><span class="v19-score-pill">${sp}<\/span><\/td><td>${c.challengeWins||0}<\/td><td>${G.idolHolders.includes(c.id)?'💎':'—'}<\/td><td>${read}<\/td><\/tr>`;
  });
  html+=`<\/tbody><\/table><div class="modal-btns"><button class="btn btn-fire" onclick="exportV19SeasonReport()">⬇ Export readable report<\/button><\/div>`;
  openV19Modal('🧠 v19 Game Insights',html);
}

// ===== TRIBE HISTORY TRACKER (BrantSteele-style placement timeline) =====
function showTribeHistory(){
  if(!G.placementHistory.length){ notify('No episodes played yet — history builds as you go'); return; }
  // Order players by how far they got: still active first, then by elimination episode desc
  const order=[...G.cast].sort((a,b)=>{
    const ae=a.eliminated?(a.elimEp||0):999, be=b.eliminated?(b.elimEp||0):999;
    if(ae!==be) return be-ae;
    return a.name.localeCompare(b.name);
  });
  const eps=G.placementHistory;
  let html=`<div class="th-wrap"><table class="th-table"><thead><tr><th class="th-name-col">Player<\/th>`;
  eps.forEach(s=>{ html+=`<th title="Episode ${s.episode}">${s.episode}<\/th>`; });
  html+=`<th>Result<\/th><\/tr><\/thead><tbody>`;
  order.forEach(c=>{
    html+=`<tr><td class="th-name-col"><span class="th-dot" style="background:${c.color}"><\/span>${c.name.split(' ')[0]}<\/td>`;
    eps.forEach(s=>{
      const ps=s.players[c.id];
      if(!ps){ html+=`<td class="th-cell th-blank"><\/td>`; return; }
      let cls='th-cell', label='', bg='';
      if(ps.status==='eliminated'){ cls+=' th-elim'; label='OUT'; bg='#EF4444'; }
      else if(ps.status==='out'){ cls+=' th-gone'; label=''; bg='transparent'; }
      else if(ps.status==='rejoined'){ cls+=' th-rejoin'; label='↩'; bg='#F59E0B'; }
      else if(ps.merged){ cls+=' th-merged'; label=ps.immune?'🛡':'•'; bg='#8B5CF6'; }
      else if(ps.team!=null&&G.teams[ps.team]){ label=ps.immune?'🛡':''; bg=G.teams[ps.team].color; }
      else { label=ps.immune?'🛡':'•'; bg='#94A3B8'; }
      const title=`Ep ${s.episode}: ${ps.status}${ps.votesGot?` · ${ps.votesGot} vote(s)`:''}`;
      html+=`<td class="${cls}" style="background:${bg};color:#fff" title="${title}">${label}<\/td>`;
    });
    const res=c.eliminated?`Ep ${c.elimEp||'?'}`:(c.winner?'WINNER 👑':'Still in');
    html+=`<td class="th-result ${c.eliminated?'':'th-alive'}">${res}<\/td><\/tr>`;
  });
  html+=`<\/tbody><\/table><\/div>
    <div class="th-legend">
      <span><i style="background:#94A3B8"><\/i> Pre-merge<\/span>
      <span><i style="background:#8B5CF6"><\/i> Merged<\/span>
      <span><i style="background:#EF4444"><\/i> Voted out<\/span>
      <span><i style="background:#F59E0B"><\/i> Rejoined<\/span>
      <span>🛡 Immune<\/span>
    <\/div>`;
  openV19Modal('📊 Tribe History',html);
}

// ===== RELATIONSHIP WEB (visual graph, not a table) =====
function showRelationshipWeb(){
  const active=getActive();
  if(active.length<2){ notify('Need at least 2 active players'); return; }
  v19EnsureRelationships();
  const N=active.length;
  const size=Math.min(680, Math.max(340, N*46));
  const cx=size/2, cy=size/2, R=size/2-54;
  // node positions on a circle
  const nodes=active.map((c,i)=>{
    const ang=(i/N)*Math.PI*2 - Math.PI/2;
    return { c, x:cx+Math.cos(ang)*R, y:cy+Math.sin(ang)*R };
  });
  let edges='';
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i], b=nodes[j];
      const score=v19RelScore(a.c.id,b.c.id); // 0-100
      if(score<35 && score>20) continue; // skip neutral clutter
      let col, w;
      if(score>=65){ col='rgba(22,163,74,'; w=1+(score-65)/14; }
      else if(score<=20){ col='rgba(220,38,38,'; w=1+(20-score)/12; }
      else continue;
      const op=Math.min(0.85, 0.25+Math.abs(score-42)/70);
      edges+=`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${col}${op.toFixed(2)})" stroke-width="${w.toFixed(2)}"/>`;
    }
  }
  let dots='';
  nodes.forEach(n=>{
    // Clickable node — tap to see this player's history with others
    dots+=`<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="13" fill="${n.c.color}" stroke="#fff" stroke-width="2" style="cursor:pointer" onclick="showOneProfile('${n.c.id}')"/>`;
    const lx=n.x, ly=n.y> cy ? n.y+26 : n.y-18;
    dots+=`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text)" style="cursor:pointer" onclick="showOneProfile('${n.c.id}')">${n.c.name.split(' ')[0]}<\/text>`;
  });
  const svg=`<svg viewBox="0 0 ${size} ${size}" style="width:100%;max-width:${size}px;display:block;margin:0 auto">${edges}${dots}<\/svg>`;
  const legend=`<div class="th-legend" style="justify-content:center;margin-top:10px">
    <span><i style="background:rgba(22,163,74,0.8)"><\/i> Strong bond<\/span>
    <span><i style="background:rgba(220,38,38,0.8)"><\/i> Rivalry<\/span>
    <span style="color:var(--text2)">Line thickness = intensity<\/span>
  <\/div>`;
  openV19Modal('🕸️ Relationship Web', `<div class="v19-help">A live map of who's tight and who's clashing. Strong bonds in green, rivalries in red.<\/div>${svg}${legend}`);
}
// score helper that reads the v19 relationship store consistently
function v19RelScore(idA,idB){
  if(typeof v19PairScore==='function') return v19PairScore(idA,idB);
  const key=[idA,idB].sort().join('|');
  if(G.relationships&&G.relationships[key]!=null) return G.relationships[key];
  // fallback derived score
  const a=G.cast.find(c=>c.id===idA), b=G.cast.find(c=>c.id===idB);
  if(!a||!b) return 50;
  let s=50;
  const shared=(a.allianceIds||[]).some(x=>(b.allianceIds||[]).includes(x));
  if(shared) s+=30;
  if(a.personality===b.personality) s+=8;
  s+=((a.social||5)+(b.social||5))-10;
  return Math.max(0,Math.min(100,Math.round(s)));
}

// ===== PLAYER PROFILES (per-player full season history) =====
function showPlayerProfiles(){
  const order=[...G.cast].sort((a,b)=>{
    const ae=a.eliminated?(a.elimEp||0):999, be=b.eliminated?(b.elimEp||0):999;
    if(ae!==be) return be-ae; return a.name.localeCompare(b.name);
  });
  let html=`<div class="v19-help">Tap a player for their full season story — placement, votes, challenges, alliances.<\/div><div class="pp-grid">`;
  order.forEach(c=>{
    const port=c.customImage
      ? `<img src="${c.customImage}" style="width:54px;height:65px;object-fit:cover;object-position:top;border-radius:8px">`
      : getPortrait(c).replace('width="120" height="145"','width="54" height="65"');
    html+=`<div class="pp-card" onclick="showOneProfile('${c.id}')">
      <div class="pp-port">${port}<\/div>
      <div class="pp-name">${c.name.split(' ')[0]}<\/div>
      <div class="pp-sub">${c.eliminated?`Out Ep ${c.elimEp||'?'}`:(c.winner?'👑 Winner':'Active')}<\/div>
    <\/div>`;
  });
  html+=`<\/div>`;
  openV19Modal('👤 Player Profiles',html);
}
function showOneProfile(id){
  const c=G.cast.find(x=>x.id===id); if(!c) return;
  let votesCast=0, votesGot=0, tcAppear=0, immunities=0;
  G.episodeLog.forEach(ep=>{
    if(ep.voteResult&&ep.voteResult.individualVotes){
      ep.voteResult.individualVotes.forEach(v=>{
        if(v.voter.id===c.id) votesCast++;
        if(v.target.id===c.id) votesGot++;
      });
      if(ep.voteResult.individualVotes.some(v=>v.voter.id===c.id)) tcAppear++;
    }
    if(ep.challengeResult){
      if(ep.challengeResult.type==='individual'&&ep.challengeResult.winner?.id===c.id) immunities++;
      if(ep.challengeResult.type==='tribal'&&ep.challengeResult.winner?.ti===c.team) immunities++;
    }
  });
  const allies=(c.allianceIds||[]).flatMap(aid=>{
    const al=G.alliances.find(a=>a.id===aid);
    return al?al.members.filter(m=>m!==c.id).map(m=>G.cast.find(x=>x.id===m)?.name.split(' ')[0]).filter(Boolean):[];
  });
  const port=c.customImage
    ? `<img src="${c.customImage}" style="width:90px;height:109px;object-fit:cover;object-position:top;border-radius:10px">`
    : getPortrait(c).replace('width="120" height="145"','width="90" height="109"');
  let timeline='';
  G.placementHistory.forEach(s=>{
    const ps=s.players[c.id]; if(!ps||ps.status==='out') return;
    let tag=ps.status==='eliminated'?'🔴 Voted out':ps.status==='rejoined'?'↩ Rejoined':ps.immune?'🛡 Immune':ps.merged?'Merged':'Safe';
    timeline+=`<div class="pp-tl-row"><span class="pp-tl-ep">Ep ${s.episode}<\/span><span>${tag}${ps.votesGot?` · received ${ps.votesGot} vote(s)`:''}<\/span><\/div>`;
  });
  const html=`<div class="pp-detail">
    <div class="pp-detail-head">
      <div style="border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.15)">${port}<\/div>
      <div>
        <div class="pp-detail-name">${c.name}<\/div>
        <div class="pp-detail-arch">${c.archetype} · ${c.personality}<\/div>
        <div class="pp-detail-status">${c.eliminated?`Eliminated Episode ${c.elimEp||'?'}${c.juryMember?' · Jury member':''}`:(c.winner?'👑 Sole Survivor':'Still in the game')}<\/div>
      <\/div>
    <\/div>
    <div class="pp-stats">
      <div class="pp-stat"><b>${immunities}<\/b><span>Immunities<\/span><\/div>
      <div class="pp-stat"><b>${votesGot}<\/b><span>Votes received<\/span><\/div>
      <div class="pp-stat"><b>${votesCast}<\/b><span>Votes cast<\/span><\/div>
      <div class="pp-stat"><b>${tcAppear}<\/b><span>Tribals attended<\/span><\/div>
      <div class="pp-stat"><b>${c.challengeWins||0}<\/b><span>Challenge wins<\/span><\/div>
      <div class="pp-stat"><b>${G.idolHolders.includes(c.id)?'Yes':'No'}<\/b><span>Holds idol<\/span><\/div>
    <\/div>
    ${allies.length?`<div class="pp-section"><b>Alliance:<\/b> ${allies.join(', ')}<\/div>`:''}
    <div class="pp-section"><b>Stats:<\/b> 💪${c.physical} 🧠${c.mental} ❤️${c.social} 🔋${c.endurance}<\/div>
    ${c.archetypeHistory&&c.archetypeHistory.length?`<div class="pp-section"><b>Archetype evolution:<\/b> ${c.archetypeHistory.map(h=>`Ep${h.episode}: ${h.from} → ${h.to}`).join(' · ')}<\/div>`:''}
    <div class="pp-section"><b>Season timeline:<\/b><\/div>
    <div class="pp-timeline">${timeline||'<div style="color:var(--text2);font-size:13px">No episodes recorded yet.<\/div>'}<\/div>
    <button class="btn btn-outline btn-sm" style="margin-top:14px" onclick="showPlayerProfiles()">← All profiles<\/button>
    <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" data-action="showRelHistoryPicker" data-player="${c.id}">🔗 View Relationship History<\/button>
  <\/div>`;
  openV19Modal(`👤 ${c.name}`,html);
}


function showV19Relationships(){
  const pairs=v19TopPairs();
  const strongest=pairs.slice(0,8), weakest=pairs.slice(-8).reverse();
  let html=`<div class="v19-help">Relationship scores are generated from alliances, personality matches and social stats. You can use this as a production board for storylines and future vote logic.<\/div>`;
  html+=`<h3 style="font-size:15px;margin:12px 0 6px">Strongest Bonds<\/h3>`;
  strongest.forEach(p=>{html+=`<div class="v19-rel-row"><strong>${v19PlayerName(p.a)}<\/strong><div class="v19-rel-meter"><div class="v19-rel-fill" style="width:${p.score}%"><\/div><\/div><strong style="text-align:right">${v19PlayerName(p.b)}<\/strong><div style="grid-column:1/-1;font-size:11px;color:var(--text2)">Bond score ${p.score}/100<\/div><\/div>`});
  html+=`<h3 style="font-size:15px;margin:18px 0 6px">Weakest Bonds / Rivalries<\/h3>`;
  weakest.forEach(p=>{html+=`<div class="v19-rel-row"><strong>${v19PlayerName(p.a)}<\/strong><div class="v19-rel-meter"><div class="v19-rel-fill" style="width:${p.score}%;background:var(--elim)"><\/div><\/div><strong style="text-align:right">${v19PlayerName(p.b)}<\/strong><div style="grid-column:1/-1;font-size:11px;color:var(--text2)">Bond score ${p.score}/100<\/div><\/div>`});
  openV19Modal('🕸️ v19 Relationship Board',html);
}
function buildV19SeasonReport(){
  const lines=[];
  lines.push(`${G.settings.name||'No Signal Season'} — v19 Report`);
  lines.push(`Theme: ${G.settings.theme||'—'}`);
  lines.push(`Seed: ${G.settings.seed||'Random'}`);
  lines.push(`Episode: ${G.episode} | Phase: ${G.merged?'Post-merge':'Pre-merge'}`);
  lines.push('');
  lines.push('ACTIVE PLAYER READS');
  getActive().sort((a,b)=>v19ActiveThreatScore(b)-v19ActiveThreatScore(a)).forEach(c=>{
    lines.push(`- ${c.name}: threat ${v19ActiveThreatScore(c)}, social ${v19SocialPowerScore(c)}, wins ${c.challengeWins||0}${G.idolHolders.includes(c.id)?', has idol':''}`);
  });
  lines.push('');
  lines.push('ELIMINATED');
  G.cast.filter(c=>c.eliminated).sort((a,b)=>(a.elimEp||99)-(b.elimEp||99)).forEach(c=>lines.push(`- Ep ${c.elimEp||'?'}: ${c.name}${c.juryMember?' (jury)':''}`));
  lines.push('');
  lines.push('TOP RELATIONSHIPS');
  v19TopPairs().slice(0,10).forEach(p=>lines.push(`- ${v19PlayerName(p.a)} + ${v19PlayerName(p.b)}: ${p.score}/100`));
  return lines.join('\n');
}
function exportV19SeasonReport(){
  downloadTextFile(`${seasonSlug()}-v19-report.txt`, buildV19SeasonReport(), 'text/plain');
  notify('⬇ v19 report exported','win');
}

/* ===== v19 CLEANUP HELPERS =====
   These helpers are intentionally non-invasive. Existing inline onclick handlers remain
   for compatibility, but future controls can use data-action/data-payload and route here.
   v19 adds seeded seasons, insight panels, relationship tools, and richer season export. */
const NoSignalCleanup = (() => {
  function safeJson(value) {
    if (!value) return null;
    try { return JSON.parse(value); } catch (_) { return value; }
  }

  function delegateActions(root = document) {
    root.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const payload = safeJson(target.dataset.payload);
      const handler = window[action];
      if (typeof handler === 'function') {
        event.preventDefault();
        Array.isArray(payload) ? handler(...payload) : handler(payload);
      }
    });
  }

  function saveGameSafe(reason = 'manual') {
    if (typeof saveGame === 'function') {
      try { saveGame(); return true; }
      catch (err) { console.warn('Save failed:', reason, err); }
    }
    return false;
  }

  return { delegateActions, saveGameSafe };
})();

// NOTE: delegateActions auto-registration removed — it conflicts with main.js's switch-based
// delegator. The old code called `window[action](payload)` for every data-action, which meant
// setupNav was being called as setupNav(undefined) (no panel name passed), breaking every
// setup nav click. main.js already handles every data-action with the correct arguments.
// NoSignalCleanup is kept for saveGameSafe and as a manual-only call surface.
//
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => NoSignalCleanup.delegateActions());
// } else {
//   NoSignalCleanup.delegateActions();
// }


// ===== RELATIONSHIP HISTORY PANEL =====
/**
 * showRelationshipHistory(idA, idB)
 * Shows the full episode-by-episode history between two players.
 * The Jordan↔Casey table — every interaction, vote, and memory event
 * with emotional weight, ordered chronologically.
 * Called from player profiles, relationship web, and cast status.
 */
function showRelationshipHistory(idA, idB){
  const a=G.cast.find(c=>c.id===idA), b=G.cast.find(c=>c.id===idB);
  if(!a||!b) return;

  // Gather all memory events involving both players
  const events=[];
  (G.memories||[]).forEach(m=>{
    const involves=(m.subject===idA&&m.object===idB)||(m.subject===idB&&m.object===idA);
    if(!involves) return;
    const def=MEMORY_TYPES[m.type]||{sentiment:0};
    const actor=G.cast.find(c=>c.id===m.subject);
    const target=G.cast.find(c=>c.id===m.object);
    events.push({
      episode:m.episode,
      type:m.type,
      label:_memTypeLabel(m.type,actor,target),
      intensity:m.intensity,
      sentiment:def.sentiment,
      actor,target,
    });
  });

  // Also include alliance formation from G.alliances history
  (G.alliances||[]).forEach(al=>{
    if(al.members.includes(idA)&&al.members.includes(idB)){
      events.push({
        episode:1,type:'alliance_active',
        label:`In alliance together`,
        intensity:60,sentiment:1,actor:a,target:b,
      });
    }
  });

  // Sort by episode
  events.sort((x,y)=>x.episode-y.episode||(x.sentiment-y.sentiment));

  // Running score
  let runningScore=50; // neutral baseline
  const rows=events.map(ev=>{
    const delta=Math.round(ev.sentiment*ev.intensity*0.4);
    runningScore=Math.max(0,Math.min(100,runningScore+delta));
    const col=delta>0?'var(--leaf)':delta<0?'var(--elim)':'var(--text2)';
    const sign=delta>0?'+':'';
    return `<tr>
      <td class="rh-ep">Ep ${ev.episode}</td>
      <td class="rh-event">${ev.label}</td>
      <td class="rh-delta" style="color:${col}">${sign}${delta}</td>
      <td class="rh-score">${runningScore}</td>
    </tr>`;
  }).join('');

  // Current relationship score
  const curScore=v19RelScore(idA,idB);
  const scoreColor=curScore>=65?'var(--leaf)':curScore<=35?'var(--elim)':'var(--text2)';
  const scoreLabel=curScore>=65?'Strong bond':curScore<=35?'Rivalry':'Neutral';

  const portA=a.customImage
    ?`<img src="${a.customImage}" style="width:48px;height:58px;object-fit:cover;object-position:top;border-radius:8px">`
    :getPortrait(a).replace('width="120" height="145"','width="48" height="58"');
  const portB=b.customImage
    ?`<img src="${b.customImage}" style="width:48px;height:58px;object-fit:cover;object-position:top;border-radius:8px">`
    :getPortrait(b).replace('width="120" height="145"','width="48" height="58"');

  const html=`
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div style="text-align:center">
        <div style="width:48px;height:58px;border-radius:8px;overflow:hidden;margin:0 auto 4px">${portA}<\/div>
        <div style="font-size:12px;font-weight:700">${a.name.split(' ')[0]}<\/div>
        <div style="font-size:10px;color:var(--text2)">${a.archetype}<\/div>
      <\/div>
      <div style="flex:1;text-align:center">
        <div style="font-size:22px">↔<\/div>
        <div style="font-size:18px;font-weight:800;color:${scoreColor}">${curScore}<\/div>
        <div style="font-size:11px;color:${scoreColor}">${scoreLabel}<\/div>
      <\/div>
      <div style="text-align:center">
        <div style="width:48px;height:58px;border-radius:8px;overflow:hidden;margin:0 auto 4px">${portB}<\/div>
        <div style="font-size:12px;font-weight:700">${b.name.split(' ')[0]}<\/div>
        <div style="font-size:10px;color:var(--text2)">${b.archetype}<\/div>
      <\/div>
    <\/div>
    ${events.length?`
    <table class="rh-table">
      <thead><tr>
        <th>Ep<\/th><th>Event<\/th><th>Δ<\/th><th>Score<\/th>
      <\/tr><\/thead>
      <tbody>${rows}<\/tbody>
    <\/table>
    `:`<div style="text-align:center;color:var(--text2);font-size:13px;padding:20px">No recorded history yet — history builds as episodes are played.<\/div>`}
    <div style="font-size:11px;color:var(--text3);margin-top:10px;text-align:center">Score: 0=bitter rivals · 50=neutral · 100=unbreakable bond<\/div>`;

  openV19Modal(`🔗 ${a.name.split(' ')[0]} ↔ ${b.name.split(' ')[0]}`, html);
}

function _memTypeLabel(type, actor, target){
  const an=actor?.name?.split(' ')[0]||'?';
  const tn=target?.name?.split(' ')[0]||'?';
  const labels={
    betrayal:`${an} betrayed ${tn}`,
    voted_for:`${an} voted against ${tn}`,
    saved:`${an} spared ${tn}`,
    idol_played_on:`${an} played idol for ${tn}`,
    idol_played_against:`${an}'s idol blocked ${tn}'s votes`,
    alliance_formed:`${an} and ${tn} strengthened their alliance`,
    alliance_broken:`${an} broke alliance with ${tn}`,
    challenge_beat:`${an} beat ${tn} in a challenge`,
    rivalry:`${an} and ${tn} clashed`,
    jury_speech:`${an} addressed ${tn} at the finale`,
  };
  return labels[type]||type.replace(/_/g,' ');
}


/**
 * showRelHistoryPicker(playerId)
 * Shows a picker to select which other player to compare history with.
 */
function showRelHistoryPicker(playerId){
  const player=G.cast.find(c=>c.id===playerId);
  if(!player) return;
  const others=G.cast.filter(c=>c.id!==playerId);
  const opts=others.map(c=>{
    const score=v19RelScore(playerId,c.id);
    const col=score>=65?'var(--leaf)':score<=35?'var(--elim)':'var(--text2)';
    const port=c.customImage
      ?`<img src="${c.customImage}" style="width:28px;height:34px;object-fit:cover;object-position:top;border-radius:5px">`
      :getPortrait(c).replace('width="120" height="145"','width="28" height="34"');
    return `<div class="rh-pick-row" data-action="showRelHistory" data-a="${playerId}" data-b="${c.id}">
      <div style="width:28px;height:34px;border-radius:5px;overflow:hidden;flex-shrink:0">${port}<\/div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${c.name}<\/div>
        <div style="font-size:10px;color:var(--text2)">${c.archetype}<\/div>
      <\/div>
      <div style="font-weight:700;font-size:14px;color:${col}">${score}<\/div>
    <\/div>`;
  }).join('');
  openV19Modal(`🔗 ${player.name.split(' ')[0]}'s Relationships`,
    `<div class="v19-help">Select a player to view your full history together — every vote, alliance, and memory event.<\/div><div style="margin-top:10px">${opts}<\/div>`);
}