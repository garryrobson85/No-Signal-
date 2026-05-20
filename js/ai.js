// No Signal — ai.js
// Gemini API integration, prompt builder, AI dialogue generation

// ===== GEMINI AI DIALOGUE GENERATION =====
const GEMINI_KEY_STORE='nosignal_gemini_key';
function showGeminiHelp(){openModal('modal-gemini-help');}
async function testGeminiKey(){
  const key=getGeminiKey();
  if(!key){notify('Paste your API key first');return;}
  notify('Testing key…');
  const models=['gemini-2.5-flash-lite','gemini-2.5-flash','gemini-2.5-flash-preview-04-17'];
  const errors=[];
  for(const model of models){
    try{
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:'Say OK'}]}],generationConfig:{maxOutputTokens:5}})
      });
      if(res.ok){notify(`✅ Key works with ${model}`,'win');return;}
      const err=await res.json().catch(()=>({}));
      const msg=err?.error?.message||'';
      errors.push(`${model}: ${res.status} — ${msg.slice(0,50)}`);
      if(res.status===401||res.status===403){notify(`❌ Key invalid or restricted: ${msg.slice(0,60)}`);return;}
    }catch(e){errors.push(`${model}: network error`);}
  }
  notify(`❌ Failed. First error: ${errors[0]||'unknown'}`);
  console.log('All model errors:',errors);
}
function saveGeminiKey(val){
  try{val=val.trim();if(val)localStorage.setItem(GEMINI_KEY_STORE,val);else localStorage.removeItem(GEMINI_KEY_STORE);}catch(e){}
}
function getGeminiKey(){
  try{return localStorage.getItem(GEMINI_KEY_STORE)||'';}catch(e){return '';}
}
function initGeminiKeyField(){
  const el=document.getElementById('s-gemini-key');
  if(el){const k=getGeminiKey();if(k) el.value=k;}
}

// Build the episode prompt for Gemini — tight, specific, structured
function buildEpisodePrompt(ep){
  const active=G.cast.filter(c=>!c.eliminated||(c.elimEp&&c.elimEp>=ep.ep));
  const eliminated=ep.eliminated;
  const tally=ep.voteResult?.tally||{};

  // Narrative compression — use summaries not raw objects (~65% fewer tokens)
  const recentSummaries=G.episodeLog
    .filter(e=>e.summary&&e.ep<ep.ep).slice(-4)
    .map(e=>e.summary).join(' / ');
  const keyMemories=(G.memories||[])
    .filter(m=>['betrayal','saved','idol_played_on'].includes(m.type)&&m.episode>=ep.ep-3)
    .slice(0,6)
    .map(m=>{
      const s=G.cast.find(c=>c.id===m.subject),o=G.cast.find(c=>c.id===m.object);
      return `${s?.name?.split(' ')[0]||'?'} ${m.type.replace(/_/g,' ')} ${o?.name?.split(' ')[0]||'?'}(ep${m.episode})`;
    }).join('; ');
  const allianceDesc=G.alliances
    .map(a=>{
      const names=a.members.map(id=>G.cast.find(c=>c.id===id)?.name.split(' ')[0]).filter(Boolean);
      return names.length>=2?names.join('+'):null;
    }).filter(Boolean).join(' | ');
  const voteLines=Object.entries(tally).map(([id,v])=>{
    const p=G.cast.find(c=>c.id===id);
    return p?`${v}v→${p.name.split(' ')[0]}(${p.archetype})`:null;
  }).filter(Boolean).join(', ');
  const confPlayers=(ep.confessionals||[]).map(c=>`${c.who.name} (${c.who.archetype}, ${c.who.personality}, ${c.who.challengeWins||0} challenge wins${G.idolHolders.includes(c.who.id)?' — has idol':''}${tally[c.who.id]?` — received ${tally[c.who.id]} vote(s)`:''})`).join('\n- ');
  const interPlayers=(ep.interactions||[]).map(i=>`${i.a.name} (${i.a.archetype}/${i.a.personality}) + ${i.b.name} (${i.b.archetype}/${i.b.personality}), relationship score: ${v19RelScore(i.a.id,i.b.id)}/100`).join('\n- ');

  return `Reality TV writer for "${G.settings.name||'No Signal'}" (Survivor-style, ${G.settings.theme||'remote island'}).
Ep${ep.ep}/${G.settings.mergeEpisode||6}. ${G.merged?'POST-MERGE':'PRE-MERGE'}. ${active.length} remain.
RECENT SEASON: ${recentSummaries||'Season start'}
KEY MEMORIES: ${keyMemories||'None yet'}
THIS EPISODE: ${ep.summary||''}
ALLIANCES: ${allianceDesc||'None'}
${ep.mergeHappened?'*** THE MERGE HAPPENED THIS EPISODE ***':''}
CONFESSIONALS NEEDED (player/archetype/personality): ${confPlayers||'None'}
INTERACTIONS (player pairs/rel score): ${interPlayers||'None'}

Write the following in JSON format (no markdown, no backticks, pure JSON):
{
  "confessionals": [
    { "playerId": "...", "text": "2-3 sentence confessional in first person, specific to their situation this episode, in the voice of their archetype and personality" }
  ],
  "interactions": [
    { "playerIds": ["...", "..."], "text": "1-2 sentence third-person description of what happened between these two players, specific to their relationship score and episode events" }
  ],
  "exitSpeech": "2-3 sentence exit speech from ${eliminated?eliminated.name+' ('+eliminated.archetype+', '+eliminated.personality+')'  :'the eliminated player'}, in character",
  "exitFinalWords": "3-4 sentence final words, reflective, in character for their archetype",
  "hostComment": "1 sentence host quip reacting to tonight's vote specifically"
}

Player IDs for confessionals: ${(ep.confessionals||[]).map(c=>c.who.id).join(', ')}
Interaction player ID pairs: ${(ep.interactions||[]).map(i=>`[${i.a.id},${i.b.id}]`).join(', ')}
${eliminated?`Eliminated player ID: ${eliminated.id}`:''}

Rules: Stay in character. Make dialogue specific — reference names, archetypes, what actually happened. No generic lines. Keep each confessional unique.
Important episode logic: if this is Episode 1 and no vote has happened yet, confessionals must be first-impression based only. Do not mention voting someone out, names coming up, betrayal, cracks, post-vote fallout, tribal paranoia, or "I made my call" before the first vote exists. Early Episode 1 should sound like arrival, tribe dynamics, sizing people up, shelter/camp, first challenge nerves, and cautious social reads.`;
}

// Call Gemini Flash API
async function callGemini(prompt){
  const key=getGeminiKey();
  if(!key) return null;
  // Try models in order of preference — free tier availability varies
  const models=['gemini-2.5-flash-lite','gemini-2.5-flash','gemini-2.5-flash-preview-04-17'];
  for(const model of models){
    try{
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          contents:[{parts:[{text:prompt}]}],
          generationConfig:{temperature:0.85,maxOutputTokens:1400,thinkingConfig:{thinkingBudget:0}}
          // Note: NOT using responseMimeType — causes failures on some models/keys
        })
      });
      if(!res.ok){
        const err=await res.json().catch(()=>({}));
        const msg=err?.error?.message||res.statusText||'Unknown error';
        // 404 = model not found, try next; other errors = real problem
        if(res.status===404||res.status===400) continue;
        console.error(`Gemini ${model} error:`,msg);
        notify(`AI error: ${msg.slice(0,80)}`);
        return null;
      }
      const data=await res.json();
      const text=data.candidates?.[0]?.content?.parts?.[0]?.text||'';
      if(!text){ console.error('Gemini returned empty text'); continue; }
      // Strip markdown code fences if model wrapped the JSON
      const clean=text.replace(/^```(?:json)?\s*/,'').replace(/\s*```\s*$/,'').trim();
      // Find the JSON object within the response (model sometimes adds preamble)
      const jsonMatch=clean.match(/\{[\s\S]*\}/);
      if(!jsonMatch){ console.error('No JSON found in response:', clean.slice(0,200)); continue; }
      return JSON.parse(jsonMatch[0]);
    }catch(e){
      console.error(`Gemini ${model} call failed:`,e);
      if(e instanceof SyntaxError) continue; // bad JSON, try next model
      notify(`AI connection error: ${e.message?.slice(0,60)||'Network error'}`);
      return null;
    }
  }
  notify('AI generation failed — no working model found. Check your key at aistudio.google.com');
  return null;
}

// Generate AI dialogue for one episode and apply it
async function generateAIDialogueForEp(ep,onProgress){
  const key=getGeminiKey();
  if(!key) return false;
  onProgress&&onProgress('Sending episode data to Gemini…');
  const prompt=buildEpisodePrompt(ep);
  const result=await callGemini(prompt);
  if(!result) return false;
  // Apply confessionals
  if(result.confessionals&&ep.confessionals){
    result.confessionals.forEach(ai=>{
      const conf=ep.confessionals.find(c=>c.who.id===ai.playerId);
      if(conf&&ai.text) conf.text=ai.text;
    });
  }
  // Apply interactions
  if(result.interactions&&ep.interactions){
    result.interactions.forEach((ai,i)=>{
      if(ep.interactions[i]&&ai.text) ep.interactions[i].text=ai.text;
    });
  }
  // Apply exit speech
  if(result.exitSpeech&&ep.eliminated) ep._aiExitSpeech=result.exitSpeech;
  if(result.exitFinalWords&&ep.eliminated) ep._aiExitFinalWords=result.exitFinalWords;
  if(result.hostComment) ep._aiHostComment=result.hostComment;
  ep._aiGenerated=true;
  onProgress&&onProgress('AI dialogue applied ✓');
  return true;
}

// Expose to script modal — "Generate with AI" button
async function generateAIEpisodeScript(epNum){
  const ep=G.episodeLog.find(e=>e.ep===epNum);
  if(!ep){notify('Episode not found');return;}
  const key=getGeminiKey();
  if(!key){
    notify('Add your free Gemini API key in Setup → General Settings');
    showGeminiHelp();
    return;
  }
  const btn=document.getElementById(`ai-gen-btn-${epNum}`);
  if(btn){btn.disabled=true;btn.textContent='⏳ Contacting Gemini…';}
  notify('Generating AI dialogue for Episode '+epNum+'…');
  const ok=await generateAIDialogueForEp(ep,msg=>{
    notify(msg);
    if(btn) btn.textContent=`⏳ ${msg}`;
  });
  if(ok){
    notify('✨ Done! Script updated with AI dialogue','win');
    setTimeout(()=>showEpisodeScripts(epNum),500);
  } else {
    if(btn){btn.disabled=false;btn.textContent='✨ Generate with AI — Retry';}
  }
}

function toggleDarkMode(){
  const isDark = document.documentElement.classList.toggle('dark');
  document.getElementById('dark-toggle-btn').textContent = isDark ? '☀️' : '🌙';
  try { localStorage.setItem('nosignal_darkmode', isDark ? '1' : '0'); } catch(e){}
}
function initDarkMode(){
  let pref = '0';
  try { pref = localStorage.getItem('nosignal_darkmode') || '0'; } catch(e){}
  // Also respect system preference if no saved preference
  if(pref === '0' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) pref = '1';
  if(pref === '1'){
    document.documentElement.classList.add('dark');
    const btn = document.getElementById('dark-toggle-btn');
    if(btn) btn.textContent = '☀️';
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  initDarkMode();
  initGeminiKeyField();
  initTeams();renderTwistsGrid();
  updateContinueButton();
});


// ===== EXPORTS =====
export { callGemini, buildEpisodePrompt, generateAIDialogueForEp, generateAIEpisodeScript, testGeminiKey, showGeminiHelp, saveGeminiKey, getGeminiKey, initGeminiKeyField };
