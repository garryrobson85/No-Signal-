// No Signal — ai.js
// Gemini API integration, prompt builder, AI dialogue generation

// ===== GEMINI API KEY MANAGEMENT =====
const GEMINI_KEY_STORE='nosignal_gemini_key';
function showGeminiHelp(){openModal('modal-gemini-help');}
async function testGeminiKey(){
  // Read from localStorage first, fall back to input field value
  let key=getGeminiKey();
  if(!key){
    const el=document.getElementById('s-gemini-key');
    if(el) key=el.value.trim();
  }
  if(!key){notify('Paste your API key first');return;}
  // If we got key from field but not storage, save it now
  saveGeminiKey(key);
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
  try{
    const stored=localStorage.getItem(GEMINI_KEY_STORE)||'';
    if(stored) return stored;
  }catch(e){}
  // Fallback: read directly from input field (handles Brave/Firefox strict mode)
  try{
    const el=document.getElementById('s-gemini-key');
    if(el&&el.value.trim()) return el.value.trim();
  }catch(e){}
  return '';
}
function initGeminiKeyField(){
  const el=document.getElementById('s-gemini-key');
  if(el){const k=getGeminiKey();if(k) el.value=k;}
}

// ===== TEXT POST-PROCESSOR =====
// Strips common AI artifacts from generated text before display
function cleanNarrativeText(text){
  if(!text||typeof text!=='string') return text;
  return text
    // Strip markdown formatting that leaked through
    .replace(/\*\*(.*?)\*\*/g,'$1')
    .replace(/\*(.*?)\*/g,'$1')
    // Remove trailing calls-to-action / production commentary
    .replace(/\s*(Stay tuned[^.]*\.|Tune in[^.]*\.|Don't miss[^.]*\.|Next time on[^.]*\.)/gi,'')
    // Remove self-referential meta lines
    .replace(/\s*(This is [Ss]urvivor|This is reality TV|As a contestant[^.]*\.)/g,'')
    // Collapse multiple spaces / fix punctuation spacing
    .replace(/\s{2,}/g,' ')
    .replace(/\s([.,!?])/g,'$1')
    .trim();
}

// ===== PROMPT BUILDER =====
// Build the Gemini episode prompt — tight, specific, no filler
function buildEpisodePrompt(ep){
  const isEp1 = ep.ep===1;
  const active=G.cast.filter(c=>!c.eliminated||(c.elimEp&&c.elimEp>=ep.ep));
  const eliminated=ep.eliminated;
  const tally=ep.voteResult?.tally||{};

  // --- Season context (compressed) ---
  const recentSummaries=G.episodeLog
    .filter(e=>e.summary&&e.ep<ep.ep).slice(-4)
    .map(e=>`Ep${e.ep}: ${e.summary}`).join(' | ');

  // --- Key memories (betrayals, saves, idol plays) ---
  const keyMemories=(G.memories||[])
    .filter(m=>['betrayal','saved','idol_played_on'].includes(m.type)&&m.episode>=ep.ep-3)
    .slice(0,5)
    .map(m=>{
      const s=G.cast.find(c=>c.id===m.subject),o=G.cast.find(c=>c.id===m.object);
      return `${s?.name?.split(' ')[0]||'?'} ${m.type.replace(/_/g,' ')} ${o?.name?.split(' ')[0]||'?'} (ep${m.episode})`;
    }).join('; ');

  // --- Alliance health context ---
  const allianceDesc=G.alliances.map(a=>{
    const names=a.members.map(id=>G.cast.find(c=>c.id===id)?.name.split(' ')[0]).filter(Boolean);
    if(names.length<2) return null;
    const str=a.strength||50;
    const health=str>=70?'strong':str>=40?'shaky':'fragile';
    return `${names.join('+')} [${health}, str:${str}]`;
  }).filter(Boolean).join(' | ');

  // --- Vote tally (for post-vote sections only) ---
  const voteLines=Object.entries(tally).map(([id,v])=>{
    const p=G.cast.find(c=>c.id===id);
    return p?`${p.name.split(' ')[0]}: ${v} vote${v!==1?'s':''}`:null;
  }).filter(Boolean).join(', ');

  // --- Players needing confessionals ---
  const confPlayers=(ep.confessionals||[]).map(c=>{
    const votesAgainst=tally[c.who.id]||0;
    const hasIdol=G.idolHolders.includes(c.who.id);
    const wins=c.who.challengeWins||0;
    return `${c.who.name} | archetype: ${c.who.archetype} | personality: ${c.who.personality} | challenge wins: ${wins}${hasIdol?' | HAS IDOL':''}${votesAgainst>0?` | received ${votesAgainst} vote${votesAgainst!==1?'s':''} tonight`:''}`;
  }).join('\n- ');

  // --- Interaction pairs with relationship context ---
  const interPlayers=(ep.interactions||[]).map(i=>{
    const score=v19RelScore(i.a.id,i.b.id);
    const relLabel=score>=70?'close allies':score>=50?'cautious allies':score>=30?'neutral':score>=15?'uneasy':'rivals';
    return `${i.a.name} (${i.a.archetype}) + ${i.b.name} (${i.b.archetype}) | relationship: ${relLabel} (${score}/100)`;
  }).join('\n- ');

  // --- Episode-1-specific vs ongoing rules ---
  const ep1Rules=isEp1?`
EP1 MODE — No tribal council has occurred yet. Confessionals must focus ONLY on:
- First impressions of tribemates
- Physical/social reads on specific people by name
- Tribe dynamics and challenge pressure
- What the player is thinking heading into the game
DO NOT mention votes, betrayals, blindsides, alliances being broken, or anything that hasn't happened yet.`:'';

  // --- Strict fact sheet + forbidden topics ---
  const nextEp=ep.ep+1;
  const futureNames=G.cast.filter(c=>!c.eliminated).map(c=>c.name.split(' ')[0]);
  const spoilerRule=`STRICT FACT SHEET — EPISODE ${ep.ep} ONLY.
FORBIDDEN: Do not mention, foreshadow, or reference ANY of the following:
- Who gets eliminated BEFORE the exit speech/final words sections
- Upcoming tribe swaps, merges, or twists not yet announced (merge happens ep ${G.settings.mergeEpisode||6})
- Future immunity challenges or episode numbers beyond ${ep.ep}
- Players returning, quitting, or being medevac'd (unless it happened THIS episode)
- Any event that occurs AFTER tribal council in confessionals/interactions
${eliminated?`CONFESSIONALS/INTERACTIONS: Recorded BEFORE tribal. Must NOT reference ${eliminated.name} going home, the vote count, or tonight's result. Only exit speech + host comment sections may reference the elimination.`:'CONFESSIONALS/INTERACTIONS: No elimination this episode. Do not hint at future votes or outcomes.'}
CONTINUITY: Only reference events that have already happened in episodes 1-${ep.ep}.`;

  return `Reality TV writer for "${G.settings.name||'No Signal'}" (Survivor-style, ${G.settings.theme||'remote island'}).
Ep${ep.ep}/${G.settings.mergeEpisode||6} — ${G.merged?'POST-MERGE':'PRE-MERGE'} — ${active.length} remain.
${ep.mergeHappened?'*** THE MERGE HAPPENED THIS EPISODE ***\n':''}
== SEASON SO FAR ==
${recentSummaries||'Season premiere — no prior episodes.'}

== KEY EVENTS IN PLAYER MEMORIES ==
${keyMemories||'None yet.'}

== THIS EPISODE ==
${ep.summary||''}

== ACTIVE ALLIANCES ==
${allianceDesc||'No alliances yet.'}

== CONFESSIONALS NEEDED ==
- ${confPlayers||'None'}

== INTERACTION PAIRS ==
- ${interPlayers||'None'}

== TRIBAL VOTE RESULT ==
${voteLines||'No vote this episode.'}
${eliminated?`Eliminated: ${eliminated.name} (${eliminated.archetype}, ${eliminated.personality})`:''}

${ep1Rules}
${spoilerRule}

== WRITING RULES ==
1. VARY sentence openings and structure. No two confessionals can start the same way.
2. BANNED PHRASES — never use: "one crack and we're done", "stay tight", "numbers game", "at the end of the day", "moving forward", "it is what it is", "stay the course", "keep our heads down". These are overused and kill authenticity.
3. SPECIFICITY — every line must reference actual names, archetypes, or events from this episode's data. No generic Survivor filler.
4. GRAMMAR — match subject/verb correctly: "votes were cast" not "votes was cast". Plural alliances take plural verbs.
5. CHARACTER VOICE — a Strategist sounds calculating; a Sweetheart sounds earnest; a Villain sounds self-aware and unapologetic; a Goofball sounds self-deprecating. Don't swap these.
6. CONTINUITY — if recentSummaries mentions a rivalry or idol play, characters can reference it. Don't contradict established events.
7. LENGTH — confessionals: 2-3 sentences. Interactions: 1-2 sentences. Exit speech: 2-3 sentences. Final words: 3-4 sentences. Host comment: 1 sentence.

Write ONLY a JSON object — no markdown, no backticks, no preamble:
{
  "openingNarration": "${isEp1?`A 2-3 sentence "welcome to a new season" intro for ${G.settings.name||'this season'}. Mention the ${active.length} contestants and tribes by name. Set the tone — first impressions, everything to prove.`:`A 2-3 sentence "Previously On" recap referencing what actually happened last episode (use recentSummaries above). End with one line setting up tonight.`}",
  "beforeTribal": "${eliminated?'A 2-sentence host transition setting up tribal council. Reference the actual tension in the air — who feels safe, who is on the block, what the mood is. Do not name who goes home.':'A 2-sentence transition for an episode with no elimination — keep tension high without spoiling the outcome.'}",
  "confessionals": [
    { "playerId": "...", "text": "..." }
  ],
  "interactions": [
    { "playerIds": ["...", "..."], "text": "..." }
  ],
  "exitSpeech": "2-3 sentence spoken exit speech from ${eliminated?`${eliminated.name} (${eliminated.archetype}, ${eliminated.personality})`:'the eliminated player'} at tribal council, addressing the remaining players and host directly. Must reference SPECIFIC people by first name — who they trusted, who voted them out if they can tell, any ally they want to acknowledge. Voice must match their archetype. No generic lines.",
  "exitFinalWords": "2-3 sentence private final words to camera after leaving tribal. More honest and raw than the speech — they can reveal a secret plan, name who they think will win, express real anger or real gratitude. Must reference actual events from this episode and their time in the game. In character — a Villain stays unapologetic, a Sweetheart stays warm even if hurt, an Underdog stays defiant.",
  "hostComment": "Chip's one-liner reacting specifically to how tonight's vote played out"
}

Player IDs for confessionals: ${(ep.confessionals||[]).map(c=>c.who.id).join(', ')}
Interaction ID pairs: ${(ep.interactions||[]).map(i=>`[${i.a.id},${i.b.id}]`).join(', ')}
${eliminated?`Eliminated player ID: ${eliminated.id}`:'No elimination.'}`;
}

// ===== GEMINI API CALL =====
const GEMINI_MODEL_CACHE_KEY = 'nosignal_gemini_last_model';
async function callGemini(prompt){
  const key=getGeminiKey();
  if(!key) return null;
  // Try the last-known-working model first to skip dead 404 retries.
  const allModels=['gemini-2.5-flash-lite','gemini-2.5-flash','gemini-2.5-flash-preview-04-17'];
  let models=allModels;
  try {
    const cached=localStorage.getItem(GEMINI_MODEL_CACHE_KEY);
    if(cached && allModels.includes(cached)) models=[cached, ...allModels.filter(m=>m!==cached)];
  } catch(e){}
  for(const model of models){
    // Per-model timeout so a single bad endpoint doesn't stall the whole flow.
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),15000);
    try{
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        signal:ctrl.signal,
        body:JSON.stringify({
          contents:[{parts:[{text:prompt}]}],
          generationConfig:{temperature:0.85,maxOutputTokens:1400,thinkingConfig:{thinkingBudget:0}}
          // NOT using responseMimeType — causes 400s on some models/keys
        })
      });
      clearTimeout(timer);
      if(!res.ok){
        const err=await res.json().catch(()=>({}));
        const msg=err?.error?.message||res.statusText||'Unknown error';
        if(res.status===404||res.status===400) continue;
        console.error(`Gemini ${model} error:`,msg);
        notify(`AI error: ${msg.slice(0,80)}`);
        return null;
      }
      const data=await res.json();
      const text=data.candidates?.[0]?.content?.parts?.[0]?.text||'';
      if(!text){console.error('Gemini returned empty text');continue;}
      const clean=text.replace(/^```(?:json)?\s*/,'').replace(/\s*```\s*$/,'').trim();
      const jsonMatch=clean.match(/\{[\s\S]*\}/);
      if(!jsonMatch){console.error('No JSON found in response:',clean.slice(0,200));continue;}
      // Remember which model worked so next call hits it first.
      try { localStorage.setItem(GEMINI_MODEL_CACHE_KEY, model); } catch(e){}
      return JSON.parse(jsonMatch[0]);
    }catch(e){
      clearTimeout(timer);
      if(e.name==='AbortError'){
        console.error(`Gemini ${model} timed out after 15s`);
        continue;
      }
      console.error(`Gemini ${model} call failed:`,e);
      if(e instanceof SyntaxError) continue;
      notify(`AI connection error: ${e.message?.slice(0,60)||'Network error'}`);
      return null;
    }
  }
  notify('AI generation failed — no working model found. Check your key at aistudio.google.com');
  return null;
}

// ===== AI DIALOGUE APPLICATION =====
// Generate AI dialogue for one episode and apply it to ep object
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
      if(conf&&ai.text){ conf.text=cleanNarrativeText(ai.text); conf._source='ai'; }
    });
  }
  // Apply interactions
  if(result.interactions&&ep.interactions){
    result.interactions.forEach((ai,i)=>{
      if(ep.interactions[i]&&ai.text){ ep.interactions[i].text=cleanNarrativeText(ai.text); ep.interactions[i]._source='ai'; }
    });
  }
  // Apply exit content
  if(result.exitSpeech&&ep.eliminated) ep._aiExitSpeech=cleanNarrativeText(result.exitSpeech);
  if(result.exitFinalWords&&ep.eliminated) ep._aiExitFinalWords=cleanNarrativeText(result.exitFinalWords);
  if(result.hostComment) ep._aiHostComment=cleanNarrativeText(result.hostComment);
  // Apply opening narration (Ep 1 welcome OR Ep 2+ Previously On) and before-tribal host card
  if(result.openingNarration) ep._aiOpeningNarration=cleanNarrativeText(result.openingNarration);
  if(result.beforeTribal) ep._aiBeforeTribal=cleanNarrativeText(result.beforeTribal);

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
    notify('✨ AI dialogue applied','win');
    setTimeout(()=>showEpisodeScripts(epNum),400);
  } else {
    if(btn){btn.disabled=false;btn.textContent='✨ Generate with AI — Retry';}
  }
}
// DOMContentLoaded consolidated into main.js