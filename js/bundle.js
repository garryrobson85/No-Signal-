
// ===== FILE: data.js =====
// No Signal — data.js
// All game constants, templates, dialogue banks — zero logic

// ===== DATA =====
const PALETTE = ['#E8450A','#0EA5E9','#16A34A','#9333EA','#EAB308','#EC4899','#06B6D4','#F97316','#6366F1','#84CC16','#F43F5E','#8B5CF6','#14B8A6','#F59E0B','#3B82F6','#10B981'];
const PERSONALITIES = ['Strategic','Loyal','Chaotic','Social','Villain','Hero','Underdog','Floater','Hothead','Peacemaker','Wildcard','Schemer','Jock','Nerd','Romantic','Comic Relief'];
const ARCHETYPES = ['The Strategist','The Fan Favorite','The Challenge Beast','The Manipulator','The Sweetheart','The Loose Cannon','The Quiet Threat','The Social Butterfly','The Big Villain','The Underdog','The Narrator','The Duo','The Flipper','The Goat','The Veteran','The Superfan','The Physical Threat','The Emotional Player','The Wildfire','The Puppet Master','The Coattail Rider','The Jury Threat','The Number','The Narrator','The Shield','The Sleeper Agent'];
const FIRST_NAMES = ['Alex','Sam','Jordan','Casey','Taylor','Morgan','Riley','Avery','Quinn','Drew','Blake','Sage','Rowan','Finley','Logan','Harper','Emerson','Skylar','Kendall','Reese','Charlie','Dakota','Elliot','River','Presley','Cameron','Marlowe','Indigo','Wren','Zephyr','Tobias','Vivian','Celeste','Marcus','Priya','Dani','Leon','Yara','Milo','Cleo'];
const LAST_NAMES = ['Carter','Rivera','Kim','Okafor','Thompson','Nakamura','Santos','Bellamy','Walsh','Patel','Moreau','Cruz','Nguyen','Larsson','Hassan','Diaz','Osei','Kowalski','Ferreira','Lindqvist'];
const TRIBE_NAMES = ['Fang','Kota','Jacaré','Nova','Sol','Luna','Ignis','Terra','Vento','Mare'];
const CHALLENGE_NAMES = ['Obstacle Course Sprint','Puzzle Tower','Water War','Flag Capture','Endurance Hold-Off','Memory Grid','Paddleboard Race','Blindfolded Relay','Giant Maze','Trivia Gauntlet','Balance Beam','Sandbag Toss','Night Navigation','Fire Making','Tug of War'];
const CHALLENGE_TYPES = ['physical','social','mental','endurance'];
const TWISTS_DATA = [
  {id:'swap',name:'Team Swap',desc:'All tribes are randomly reshuffled.',icon:'🔀',rarity:'common'},
  {id:'double',name:'Double Elimination',desc:'Two players are voted out this episode.',icon:'⚡',rarity:'uncommon'},
  {id:'noelim',name:'No Elimination',desc:'Nobody goes home — tribe loses but no vote.',icon:'🛡️',rarity:'uncommon'},
  {id:'idol_clue',name:'Idol Clue',desc:'A clue to a hidden idol is publicly revealed.',icon:'🗺️',rarity:'common'},
  {id:'returnee',name:'Player Returns',desc:'A previously eliminated contestant comes back.',icon:'🔄',rarity:'rare'},
  {id:'steal_vote',name:'Vote Steal',desc:"One contestant can steal another's tribal vote.",icon:'🤚',rarity:'uncommon'},
  {id:'tribe_dissolve',name:'Tribe Dissolve',desc:'The weakest tribe is dissolved into the others.',icon:'💥',rarity:'rare'},
  {id:'exile',name:'Exile Island',desc:'The losing tribe must send one player into exile.',icon:'🏝️',rarity:'common'},
  {id:'challenge_advantage',name:'Challenge Advantage',desc:'One player secretly earns a challenge advantage.',icon:'⭐',rarity:'common'},
  {id:'new_alliance',name:'Forced Alliance',desc:'Two rivals are secretly told to work together.',icon:'🤝',rarity:'uncommon'},
  {id:'power_shift',name:'Power Shift',desc:'The player with most challenge wins loses immunity this round.',icon:'🔃',rarity:'rare'},
  {id:'extra_vote',name:'Extra Vote',desc:'A secret extra vote advantage enters the game.',icon:'🗳️',rarity:'uncommon'},
];
// ===== INTERACTION TEMPLATES =====

// ===== CONTEXT-AWARE DIALOGUE GENERATORS =====
// These use real game state — player names, archetypes, vote outcomes, alliances —
// so every line is specific to what actually happened, not generic filler.

// Generates a confessional grounded in what this player is actually experiencing
function buildConfessionalText(player, ep){
  const fn=player.name.split(' ')[0];
  const allies=(player.allianceIds||[]).flatMap(aid=>{
    const al=G.alliances.find(a=>a.id===aid);
    return al?al.members.filter(m=>m!==player.id).map(m=>G.cast.find(c=>c.id===m)?.name.split(' ')[0]).filter(Boolean):[];
  });
  const hasIdol=G.idolHolders.includes(player.id);
  const votesAgainstMe=(ep.voteResult?.tally?.[player.id]||0);
  const elimName=ep.eliminated?.name.split(' ')[0];
  const elimArch=ep.eliminated?.archetype;
  const wonChallenge=ep.challengeResult?.winner?.id===player.id
    ||(ep.challengeResult?.winner?.ti!=null&&ep.challengeResult?.winner?.ti===player.team);
  const merged=G.merged;
  const active=getActive().length;

  // Build a specific, contextual confessional from real state
  const lines=[];

  // React to the vote if they were involved
  if(votesAgainstMe>0) lines.push(`${votesAgainstMe>1?`${votesAgainstMe} votes came my way`:'My name came up at tribal'}. I felt it. I knew. But I'm still here — and that tells me more about this game than any alliance meeting ever could.`);
  if(elimName&&ep.eliminated?.id!==player.id){
    const betrayed=(ep.voteResult?.individualVotes||[]).some(v=>v.voter.id===player.id&&v.target.id===ep.eliminated?.id);
    if(betrayed) lines.push(`I voted ${elimName} out. ${elimArch?`${elimName} was ${elimArch.toLowerCase()} and that made them dangerous`:'It wasn\'t personal — it was necessary'}. I won\'t lose sleep over it.`);
    else lines.push(`${elimName} is gone. ${elimArch?`A ${elimArch.toLowerCase()}`:'Someone'} who had more game left in them than people realised. The tribe made their call. I made mine.`);
  }

  // Alliance state
  if(allies.length>0) lines.push(`${allies.length===1?`${allies[0]} and I`:`${allies.slice(0,-1).join(', ')} and ${allies[allies.length-1]} — that\'s my core`}. ${merged?'Post-merge, every vote matters more. We can\'t afford a crack.':'Pre-merge, we stay tight. One crack and we\'re done.'}`);

  // Idol awareness
  if(hasIdol) lines.push(`I\'m carrying something that nobody else knows about. The timing has to be perfect — play it too early and I waste it, too late and I go home with it in my pocket.`);

  // Challenge reaction
  if(wonChallenge) lines.push(`Winning that challenge was everything. For one episode I\'m untouchable — and I plan to use every minute of that safety to make moves.`);

  // Position / threat awareness by archetype
  const archLines={
    'The Strategist':`Every conversation at this camp is a data point. I\'m running the numbers constantly. ${active<=6?'We\'re deep in the game now and every vote is a final answer.':'The picture is getting clearer.'}`,
    'The Fan Favorite':`I just love this. Even the hard parts. Even the paranoid 3am moments where you\'re wondering if your closest ally wrote your name down. This is the most alive I\'ve ever felt.`,
    'The Big Villain':`I look around this camp and see exactly who I need to cut and in what order. Nobody here thinks I\'m the threat. That\'s the whole plan.`,
    'The Underdog':`I\'m still here. That\'s the whole confessional. I. Am. Still. Here.`,
    'The Puppet Master':`Three separate conversations today all ended where I needed them to end. They think they\'re making their own decisions. They\'re not.`,
    'The Sweetheart':`I never wanted to be in this position — having to think about who to vote out, who to trust, who\'s lying. But here we are. And I\'m still here.`,
    'The Loose Cannon':`I had an idea today that literally nobody else in this game would have. That\'s terrifying and amazing and I might do it.`,
    'The Quiet Threat':`${active<=8?'Getting close to the end. I\'ve been invisible long enough — now I need to be visible in the right way.':'Nobody\'s watching me. That\'s exactly where I want to be.'}`,
  };
  const archLine=archLines[player.archetype];
  if(archLine&&lines.length<2) lines.push(archLine);

  // Fallback if somehow still empty
  if(!lines.length) lines.push(`Day ${ep.ep*3-2}. ${active} of us left. Every morning out here feels different — and this one is no exception.`);

  // Memory layer — surface a specific past event if available and unseen
  const memoryLine=(typeof getMemoryConfessionalLine==='function')
    ? getMemoryConfessionalLine(player,ep):null;
  if(memoryLine) lines.unshift(memoryLine);

  // Pick 1-2 lines — always lead with memory line if present
  const picked=memoryLine
    ? [memoryLine,...shuffle(lines.filter(l=>l!==memoryLine)).slice(0,1)]
    : shuffle(lines).slice(0,2);
  return picked.join(' ');
}

// Generates a grounded interaction narrative between two specific players
function buildInteractionText(a, b, ep){
  const an=a.name.split(' ')[0], bn=b.name.split(' ')[0];
  const allied=(a.allianceIds||[]).some(id=>(b.allianceIds||[]).includes(id));
  const relScore=v19RelScore(a.id,b.id);
  const merged=G.merged;
  const sameTeam=!merged&&a.team!=null&&a.team===b.team;
  const crossTeam=!merged&&!sameTeam&&a.team!=null&&b.team!=null;

  if(allied&&relScore>=60){
    const opts=[
      `${an} and ${bn} found a quiet moment away from camp. Their alliance is holding — but both know the deeper they go, the harder the choices get.`,
      `${an} pulled ${bn} aside to compare notes on where everyone's heads are at. The trust between them runs deeper than most people realise.`,
      `${bn} reassured ${an} after a tense day — their bond is one of the few genuinely stable things left at this camp.`,
    ];
    return pick(opts);
  }
  if(!allied&&relScore<=35){
    const opts=[
      `${an} and ${bn} kept their distance at camp, but the tension between them was impossible to miss. Something is building.`,
      `A brief exchange between ${an} and ${bn} turned sharp fast. Old frustrations surfaced. Nobody apologised.`,
      `${bn} vented about ${an} to anyone who would listen. Whether it was strategy or genuine grievance — probably both.`,
    ];
    return pick(opts);
  }
  if(crossTeam){
    const opts=[
      `Despite being on opposite tribes, ${an} and ${bn} found a moment to connect at the challenge site. A quiet conversation that neither side saw coming.`,
      `${an} reached across tribal lines to feel out ${bn}'s position. A risky move — but information is worth the exposure.`,
    ];
    return pick(opts);
  }
  if(G.idolHolders.includes(a.id)||G.idolHolders.includes(b.id)){
    const holder=G.idolHolders.includes(a.id)?an:bn;
    const other=G.idolHolders.includes(a.id)?bn:an;
    const opts=[
      `${other} caught ${holder} slipping away from camp for the third time this week. ${holder} had an explanation ready. Whether ${other} bought it is another question.`,
      `${holder} made a calculated decision and hinted to ${other} that they might have something hidden. A gamble on trust.`,
    ];
    return pick(opts);
  }
  // Memory layer — if there's a documented history between these two, use it
  if(typeof getMemorySummary==='function'){
    const historySummary=getMemorySummary(a,b);
    if(historySummary) return historySummary;
  }

  // Generic but still specific
  const opts=[
    `${an} and ${bn} talked by the fire well into the night — about the game, about trust, about who they think is actually running things. Neither fully showed their hand.`,
    `${bn} approached ${an} with what looked like a straightforward conversation. ${an} filed every word away for later.`,
    `${an} and ${bn} spent the morning working on shelter repairs together. Small moments build big loyalties — or expose their absence.`,
    `${merged?`${an} found ${bn} alone after tribal and the conversation that followed was careful, measured, and full of subtext.`:`On the same tribe for ${ep.ep} episodes now, ${an} and ${bn} are still figuring out whether they actually trust each other.`}`,
  ];
  return pick(opts);
}

// Drama events grounded in specific players and game state
function buildDramaText(ep){
  const active=getActive();
  if(!active.length) return pick(DRAMA_EVENTS);
  const p=pick(active), q=pick(active.filter(x=>x.id!==p.id));
  const pn=p.name.split(' ')[0];
  const qn=q?.name.split(' ')[0];
  const contextual=[
    `${pn}'s name came up in a conversation they weren't part of. By nightfall the whole camp knew — and the damage was already done.`,
    `A quiet comment from ${pn} landed wrong and the camp spent the rest of the day pretending it hadn't.`,
    qn?`${pn} and ${qn} ended up doing camp chores together in complete silence. Everybody noticed.`:`Camp morale took a hit — nobody said why, but everyone felt it.`,
    `Someone moved ${pn}'s personal belongings. Innocent accident or calculated provocation? The camp split on the answer.`,
    qn?`${pn} overheard ${qn} saying something they weren't supposed to hear. What they do with that information remains to be seen.`:`Rain hit camp overnight and what little sleep everyone got did nothing for the mood.`,
    `A food dispute — trivial in isolation — opened up a much deeper fault line. Suddenly alliances feel less stable.`,
    `${pn} had a visible emotional moment at camp. Some players went closer. Others quietly calculated how to use it.`,
  ];
  return pick(contextual);
}

// Legacy templates kept as fallback strings (not functions anymore — functions replaced above)
const INTERACTION_TEMPLATES_NEUTRAL = [
  (a,b)=>`${a} and ${b} had a long late-night conversation and found they have more in common than expected. A tentative alliance formed.`,
  (a,b)=>`${b} tried to quietly flip ${a}'s vote before tribal but couldn't seal the deal.`,
  (a,b)=>`${a} and ${b} were spotted whispering near the well. Nobody could hear it, but everyone noticed.`,
  (a,b)=>`${b} promised ${a} their loyalty — but their body language told a different story.`,
  (a,b)=>`${a} tried to recruit ${b} into a larger voting bloc, with mixed results.`,
];
const INTERACTION_TEMPLATES_IDOL=[
  (a,b)=>`${a} caught ${b} searching near the water well. The discovery created visible tension between them.`,
  (a,b)=>`${a} quietly revealed the existence of an idol to ${b} — a bold, trusting gamble.`,
];
const INTERACTION_TEMPLATES_ADVANTAGE=[
  (a,b)=>`${a} hinted to ${b} that they might have something useful hidden away. ${b} filed that information away carefully.`,
  (a,b)=>`${b} confronted ${a} about a possible advantage. ${a} played it completely cool.`,
];
const CONFESSIONAL_TEMPLATES=[
  n=>`I see everything happening out here. Someone thinks they're running this game — but I've got other plans entirely.`,
  n=>`I came here to win. Not to make friends. Nobody should forget that.`,
  n=>`I'm genuinely worried. My name was mentioned last night and I could feel the shift in the air.`,
  n=>`Nobody out here is thinking about the jury yet, but I am. Every vote, every move — it all matters.`,
];
const CONFESSIONAL_IDOL_TEMPLATES=[
  n=>`I found something today that could change everything for me. Nobody can find out. Not yet.`,
  n=>`This thing in my bag… it's everything. When to use it — that's the real game.`,
];
const DRAMA_EVENTS=[
  'A heated argument broke out over food rations.',
  'Rain pounded camp all night, leaving everyone exhausted and miserable.',
  'Two players got into a loud shouting match over strategy.',
  'Whispers of a massive blindside spread through the tribe like wildfire.',
  'An overheard conversation has everyone wondering who is actually loyal.',
];

const CHALLENGE_DATA = [
  {name:'Obstacle Course Sprint',type:'physical',flavor:'A grueling race through mud, ropes, and logs. Strength and speed decide the winner.',icon:'🏃'},
  {name:'Puzzle Tower',type:'mental',flavor:'Piece together a massive puzzle while exhaustion sets in. Only the sharpest minds survive.',icon:'🧩'},
  {name:'Water War',type:'endurance',flavor:'Hold your breath, carry water, outlast the rest. The sea shows no mercy.',icon:'🌊'},
  {name:'Flag Capture',type:'physical',flavor:'Race across the field and plant your tribe\'s flag before the others do.',icon:'🚩'},
  {name:'Endurance Hold-Off',type:'endurance',flavor:'Stand on a narrow perch above the water. Last person standing wins immunity.',icon:'🧍'},
  {name:'Memory Grid',type:'mental',flavor:'Study the symbols, memorize the pattern, and recreate it perfectly. One wrong move and it\'s over.',icon:'🔢'},
  {name:'Paddleboard Race',type:'physical',flavor:'Paddle hard through choppy water to collect puzzle pieces and assemble them on shore.',icon:'🛶'},
  {name:'Blindfolded Relay',type:'social',flavor:'One caller, four blindfolded players. Communication and trust are everything.',icon:'🙈'},
  {name:'Giant Maze',type:'mental',flavor:'Navigate a massive bamboo maze in complete darkness. The mind is your only compass.',icon:'🌀'},
  {name:'Trivia Gauntlet',type:'mental',flavor:'Answer questions about camp life and your tribemates. Knowledge is immunity.',icon:'❓'},
  {name:'Balance Beam',type:'endurance',flavor:'Walk across narrow beams above the ocean. Balance, focus, and nerve are all that matter.',icon:'⚖️'},
  {name:'Sandbag Toss',type:'physical',flavor:'Launch sandbags from your catapult to knock targets off a platform. Precision wins.',icon:'💣'},
  {name:'Night Navigation',type:'mental',flavor:'Navigate through a dark jungle with only stars as guides. Find the hidden immunity totem first.',icon:'🌙'},
  {name:'Fire Making',type:'endurance',flavor:'Use flint and steel to be the first to burn through your rope. One spark can change everything.',icon:'🔥'},
  {name:'Tug of War',type:'physical',flavor:'Dig your heels in. Pure raw power against the other tribe. There\'s nowhere to hide.',icon:'💪'},
  {name:'Bucket Fill Relay',type:'endurance',flavor:'Run to the ocean, fill your bucket with holes, and pour it into the barrel. Every drop counts.',icon:'🪣'},
  {name:'Log Roll',type:'endurance',flavor:'Two players on a log in the water — keep rolling until the other falls off.',icon:'🪵'},
  {name:'Bola Throw',type:'physical',flavor:'Swing your bola and wrap it around the target posts. Precision and power decide immunity.',icon:'🎯'},
  {name:'Coconut Chop',type:'social',flavor:'Each tribe member chops ropes to drop coconuts — targeting who they want out. Strategy in plain sight.',icon:'🥥'},
  {name:'Stacking Blocks',type:'mental',flavor:'Build a tower of letter blocks spelling out a phrase — while balancing it on a wobble board.',icon:'🏗️'},
];


// ===== EXPORTS =====


// ===== FILE: ai.js =====
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

Rules: Stay in character. Make dialogue specific — reference names, archetypes, what actually happened. No generic lines. Keep each confessional unique.`;
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


// ===== FILE: portraits.js =====
// No Signal — portraits.js
// SVG portrait generator and custom image upload

// ===== SVG PORTRAIT GENERATOR =====
function generatePortrait(contestant) {
  const c = contestant;
  const hue = parseInt(c.color.slice(1),16);
  const skinTones=['#FDDBB4','#F5C594','#E8A87C','#C68642','#8D5524','#4A2F1A'];
  const hairColors=['#1a1a1a','#3d2b1f','#7B3F00','#C19A6B','#F5DEB3','#FF6B35','#4A0E8F','#2E8B57'];
  const personality = c.personality||'';
  const archetype = c.archetype||'';

  // Deterministic seeding from id
  const seed = c.id.split('').reduce((a,ch)=>a+ch.charCodeAt(0),0);
  const r = (n) => { const x=Math.sin(seed*n)*10000; return x-Math.floor(x); };

  const skinIdx = Math.floor(r(1)*skinTones.length);
  const hairIdx = Math.floor(r(2)*hairColors.length);
  const skinColor = skinTones[skinIdx];
  const hairColor = hairColors[hairIdx];
  const eyeColor = ['#3B2314','#1B4F72','#145A32','#784212'][Math.floor(r(3)*4)];

  // Face shape
  const faceW = 54 + Math.floor(r(4)*14);
  const faceH = 60 + Math.floor(r(5)*16);
  const faceX = 60 - faceW/2;
  const faceY = 28;

  // Hair style based on archetype/personality
  const isVillain = personality==='Villain'||archetype.includes('Villain');
  const isHero = personality==='Hero'||archetype.includes('Hero')||archetype.includes('Favorite');
  const isJock = personality==='Jock'||archetype.includes('Challenge Beast');
  const isNerd = personality==='Nerd'||archetype.includes('Narrator');
  const isWild = personality==='Chaotic'||archetype.includes('Loose Cannon')||personality==='Wildcard';

  // Eye shape
  const eyeSlant = isVillain ? -3 : isHero ? 2 : 0;
  const eyeSize = isNerd ? 7 : isJock ? 5 : 6;
  const browThick = isVillain ? 4 : 2.5;

  // Expression
  const smileAmount = isVillain ? -1 : isHero ? 6 : personality==='Hothead' ? -3 : personality==='Social' ? 8 : 3;

  // Accessories
  const hasGlasses = isNerd || (r(6)>0.85);
  const hasBandana = isJock || isWild;
  const hasEarrings = personality==='Romantic'||personality==='Social';

  // Background gradient using contestant color
  const bg1 = c.color;
  const bg2 = shadeColor(c.color, -40);

  // Hair paths
  let hairPath = '';
  if(isJock) {
    hairPath = `<rect x="${faceX-2}" y="${faceY-4}" width="${faceW+4}" height="18" rx="6" fill="${hairColor}"/>`;
  } else if(isVillain) {
    hairPath = `<path d="M${faceX-4},${faceY+20} Q${60},${faceY-18} ${faceX+faceW+4},${faceY+20} Q${faceX+faceW},${faceY-2} ${faceX+faceW-8},${faceY+10} Q60,${faceY-12} ${faceX+8},${faceY+10} Z" fill="${hairColor}"/>`;
  } else if(isWild) {
    // Messy wild hair
    hairPath = `<path d="M${faceX},${faceY+20} Q${faceX-14},${faceY-20} ${60},${faceY-16} Q${faceX+faceW+14},${faceY-20} ${faceX+faceW},${faceY+20} Q${faceX+faceW-4},${faceY-4} ${60},${faceY-10} Q${faceX+4},${faceY-4} Z" fill="${hairColor}"/>
      <path d="M${faceX-4},${faceY+14} Q${faceX-18},${faceY} ${faceX-10},${faceY-10}" stroke="${hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M${faceX+faceW+4},${faceY+14} Q${faceX+faceW+18},${faceY} ${faceX+faceW+10},${faceY-10}" stroke="${hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else if(r(7)>0.5) {
    // Long hair
    hairPath = `<path d="M${faceX},${faceY+24} Q${faceX-12},${faceY+60} ${faceX},${faceY+faceH+12} L${faceX-4},${faceY+faceH+16} Q${faceX-8},${faceY+50} ${faceX-4},${faceY+20} Q${faceX},${faceY-16} ${60},${faceY-14} Q${faceX+faceW},${faceY-16} ${faceX+faceW+4},${faceY+20} Q${faceX+faceW+8},${faceY+50} ${faceX+faceW+4},${faceY+faceH+16} L${faceX+faceW},${faceY+faceH+12} Q${faceX+faceW+12},${faceY+60} ${faceX+faceW},${faceY+24} Z" fill="${hairColor}"/>`;
  } else {
    // Medium hair
    hairPath = `<path d="M${faceX+4},${faceY+22} Q${faceX-8},${faceY-10} ${60},${faceY-14} Q${faceX+faceW+8},${faceY-10} ${faceX+faceW-4},${faceY+22} Q${faceX+faceW},${faceY+6} ${faceX+faceW-6},${faceY+2} Q60,${faceY-8} ${faceX+6},${faceY+2} Z" fill="${hairColor}"/>`;
  }

  const bandanaEl = hasBandana ? `<rect x="${faceX}" y="${faceY+2}" width="${faceW}" height="10" rx="3" fill="${c.color}" opacity="0.85"/>
    <line x1="${faceX}" y1="${faceY+2}" x2="${faceX+faceW}" y2="${faceY+2}" stroke="${shadeColor(c.color,-20)}" stroke-width="1.5"/>
    <line x1="${faceX}" y1="${faceY+12}" x2="${faceX+faceW}" y2="${faceY+12}" stroke="${shadeColor(c.color,-20)}" stroke-width="1"/>` : '';

  const glassesEl = hasGlasses ? `<rect x="${60-22}" y="${faceY+faceH*0.32-3}" width="16" height="12" rx="5" fill="none" stroke="#2c3e50" stroke-width="2"/>
    <rect x="${60+6}" y="${faceY+faceH*0.32-3}" width="16" height="12" rx="5" fill="none" stroke="#2c3e50" stroke-width="2"/>
    <line x1="${60-6}" y1="${faceY+faceH*0.32+3}" x2="${60+6}" y2="${faceY+faceH*0.32+3}" stroke="#2c3e50" stroke-width="2"/>` : '';

  const earringEl = hasEarrings ? `<circle cx="${faceX-3}" cy="${faceY+faceH*0.5}" r="3" fill="${c.color}"/>
    <circle cx="${faceX+faceW+3}" cy="${faceY+faceH*0.5}" r="3" fill="${c.color}"/>` : '';

  const eyeY = faceY + faceH*0.35;
  const leftEyeX = 60 - 14;
  const rightEyeX = 60 + 14;

  // Clothing based on archetype
  const clothingColor = isVillain ? '#1a1a2e' : isHero ? '#1B4F72' : isJock ? '#117a3e' : c.color;
  const clothingEl = `<path d="M${faceX-10},${faceY+faceH+40} Q${faceX-4},${faceY+faceH+8} ${60},${faceY+faceH+10} Q${faceX+faceW+4},${faceY+faceH+8} ${faceX+faceW+10},${faceY+faceH+40} Z" fill="${clothingColor}"/>
    ${isVillain?`<path d="M${60-8},${faceY+faceH+10} L${60},${faceY+faceH+28} L${60+8},${faceY+faceH+10}" fill="white" opacity="0.15"/>`:''}
    ${isHero?`<path d="M${60-14},${faceY+faceH+12} L${60},${faceY+faceH+24} L${60+14},${faceY+faceH+12}" fill="white" opacity="0.2"/>`:''}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 145" width="120" height="145">
  <defs>
    <radialGradient id="bg-${c.id}" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${bg1}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${bg2}" stop-opacity="1"/>
    <\/radialGradient>
    <radialGradient id="face-${c.id}" cx="45%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${lightenColor(skinColor,20)}"/>
      <stop offset="100%" stop-color="${skinColor}"/>
    <\/radialGradient>
    <filter id="shadow-${c.id}">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    <\/filter>
  <\/defs>
  /* Background */
  <rect width="120" height="145" rx="12" fill="url(#bg-${c.id})"/>
  /* Clothing */
  ${clothingEl}
  /* Hair (back) */
  ${hairPath}
  /* Neck */
  <rect x="${60-10}" y="${faceY+faceH-4}" width="20" height="20" fill="${skinColor}"/>
  /* Face */
  <ellipse cx="${60}" cy="${faceY+faceH*0.5}" rx="${faceW/2}" ry="${faceH/2}" fill="url(#face-${c.id})" filter="url(#shadow-${c.id})"/>
  /* Ears */
  <ellipse cx="${faceX-4}" cy="${faceY+faceH*0.48}" rx="5" ry="7" fill="${skinColor}"/>
  <ellipse cx="${faceX+faceW+4}" cy="${faceY+faceH*0.48}" rx="5" ry="7" fill="${skinColor}"/>
  ${earringEl}
  /* Eyebrows */
  <path d="M${leftEyeX-eyeSize},${eyeY-eyeSize-4+eyeSlant} Q${leftEyeX},${eyeY-eyeSize-7} ${leftEyeX+eyeSize},${eyeY-eyeSize-4-eyeSlant}" stroke="${hairColor}" stroke-width="${browThick}" fill="none" stroke-linecap="round"/>
  <path d="M${rightEyeX-eyeSize},${eyeY-eyeSize-4-eyeSlant} Q${rightEyeX},${eyeY-eyeSize-7} ${rightEyeX+eyeSize},${eyeY-eyeSize-4+eyeSlant}" stroke="${hairColor}" stroke-width="${browThick}" fill="none" stroke-linecap="round"/>
  /* Eyes */
  <ellipse cx="${leftEyeX}" cy="${eyeY}" rx="${eyeSize}" ry="${eyeSize*0.8}" fill="white"/>
  <circle cx="${leftEyeX+1}" cy="${eyeY}" r="${eyeSize*0.55}" fill="${eyeColor}"/>
  <circle cx="${leftEyeX+2}" cy="${eyeY-1}" r="${eyeSize*0.2}" fill="white"/>
  <ellipse cx="${rightEyeX}" cy="${eyeY}" rx="${eyeSize}" ry="${eyeSize*0.8}" fill="white"/>
  <circle cx="${rightEyeX+1}" cy="${eyeY}" r="${eyeSize*0.55}" fill="${eyeColor}"/>
  <circle cx="${rightEyeX+2}" cy="${eyeY-1}" r="${eyeSize*0.2}" fill="white"/>
  ${hasGlasses?glassesEl:''}
  /* Nose */
  <path d="M${60},${eyeY+eyeSize+2} Q${60+5},${eyeY+eyeSize+10} ${60+2},${eyeY+eyeSize+13} Q${60},${eyeY+eyeSize+15} ${60-2},${eyeY+eyeSize+13} Q${60-5},${eyeY+eyeSize+10} ${60},${eyeY+eyeSize+2}" fill="${shadeColor(skinColor,-15)}" opacity="0.6"/>
  /* Mouth */
  <path d="M${60-9},${eyeY+eyeSize+20} Q${60},${eyeY+eyeSize+20+smileAmount} ${60+9},${eyeY+eyeSize+20}" stroke="${shadeColor(skinColor,-30)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  ${smileAmount>4?`<path d="M${60-7},${eyeY+eyeSize+20} Q${60},${eyeY+eyeSize+24+smileAmount*0.5} ${60+7},${eyeY+eyeSize+20}" fill="${shadeColor(skinColor,-10)}" opacity="0.5"/>`:''}
  /* Bandana overlay */
  ${bandanaEl}
  /* Villain scar */
  ${isVillain?`<path d="M${faceX+faceW*0.6},${eyeY-8} L${faceX+faceW*0.7},${eyeY+10}" stroke="${shadeColor(skinColor,-40)}" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>`:''}
  /* Name tag */
  <rect x="6" y="120" width="108" height="19" rx="5" fill="rgba(0,0,0,0.35)"/>
  <text x="60" y="133" text-anchor="middle" font-family="'Bebas Neue', sans-serif" font-size="11" fill="white" letter-spacing="0.5">${c.name.toUpperCase()}<\/text>
<\/svg>`;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#',''),16);
  const r=Math.max(0,Math.min(255,(num>>16)+percent));
  const g=Math.max(0,Math.min(255,((num>>8)&0x00FF)+percent));
  const b=Math.max(0,Math.min(255,(num&0x0000FF)+percent));
  return '#'+(b|g<<8|r<<16).toString(16).padStart(6,'0');
}
function lightenColor(hex, percent) { return shadeColor(hex, percent); }

// ===== CUSTOM IMAGE UPLOAD =====
// Triggers the hidden file input for a specific contestant
function triggerImageUpload(id){
  const inp=document.getElementById(`img-input-${id}`);
  if(inp) inp.click();
}

// Handles the file change event — resize & store
function handleImageUpload(id,input){
  const file=input.files&&input.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){notify('Please choose an image file');return;}

  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      // Resize to max 256×256 to keep localStorage usage low (~15-30KB per image)
      const MAX=256;
      const canvas=document.createElement('canvas');
      // Crop to portrait aspect ratio (4:5) from centre top
      const srcAspect=img.width/img.height;
      const targetAspect=4/5;
      let sx=0,sy=0,sw=img.width,sh=img.height;
      if(srcAspect>targetAspect){
        // wider than portrait — crop sides
        sw=Math.round(img.height*targetAspect);
        sx=Math.round((img.width-sw)/2);
      } else {
        // taller than portrait — crop from top
        sh=Math.round(img.width/targetAspect);
        sy=0;
      }
      const outW=Math.min(MAX,sw);
      const outH=Math.round(outW/targetAspect);
      canvas.width=outW; canvas.height=outH;
      const ctx=canvas.getContext('2d');
      // Smooth scaling
      ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,sx,sy,sw,sh,0,0,outW,outH);
      const dataUrl=canvas.toDataURL('image/jpeg',0.80);
      applyCustomImage(id,dataUrl);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
  // Reset input so re-uploading same file triggers onchange
  input.value='';
}

function applyCustomImage(id,dataUrl){
  const c=G.cast.find(x=>x.id===id); if(!c) return;
  c.customImage=dataUrl;
  c._portrait=null; c._portraitKey=null; // invalidate cache
  // Patch the cast card in-place without full re-render (faster)
  const wrap=document.getElementById(`cpu-${id}`);
  if(wrap){
    renderCastList(); // re-render the whole list to pick up changes
  }
  updateTeamsPanel();
  notify(`Photo uploaded for ${c.name.split(' ')[0]}! 📷`,'win');
}

function clearImage(id){
  const c=G.cast.find(x=>x.id===id); if(!c) return;
  c.customImage=null; c._portrait=null; c._portraitKey=null;
  renderCastList();
  updateTeamsPanel();
  notify(`Photo removed — back to generated portrait`);
}

// Bulk upload: present a UI to upload all at once
function showBulkUpload(){
  const active=G.cast;
  if(!active.length){notify('Add contestants first!');return;}
  const modal=document.getElementById('modal-player-content');
  modal.innerHTML=`
    <div class="modal-title">📷 Upload Cast Photos<\/div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px;line-height:1.5">Click any portrait to upload a photo. Images are auto-cropped to portrait format and compressed. Supports JPG, PNG, WEBP.<\/div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:12px;">
      ${active.map(c=>`
        <div style="text-align:center;cursor:pointer" onclick="triggerImageUpload('${c.id}')">
          <div style="width:80px;height:97px;margin:0 auto;border-radius:10px;overflow:hidden;border:2px solid ${c.customImage?'var(--leaf)':'var(--border2)'};position:relative">
            ${c.customImage
              ? `<img src="${c.customImage}" style="width:100%;height:100%;object-fit:cover;object-position:top">`
              : getPortrait(c).replace('width="120" height="145"','width="80" height="97"')
            }
            <div style="position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s" onmouseover="this.style.background='rgba(0,0,0,0.4)';this.style.opacity='1'" onmouseout="this.style.background='rgba(0,0,0,0)';this.style.opacity='0'">📷<\/div>
          <\/div>
          <input type="file" id="img-input-${c.id}" accept="image/*" style="display:none" onchange="handleImageUpload('${c.id}',this);closeModal('modal-player-detail');showBulkUpload()">
          <div style="font-size:11px;font-weight:500;margin-top:5px;color:${c.customImage?'var(--leaf)':'var(--text2)'}">${c.name.split(' ')[0]}<\/div>
          ${c.customImage?`<div style="font-size:10px;color:var(--leaf)">✓ photo<\/div>`:
            `<button onclick="event.stopPropagation();clearImage('${c.id}');showBulkUpload()" style="display:none"><\/button>`}
          ${c.customImage?`<button onclick="event.stopPropagation();clearImage('${c.id}');showBulkUpload()" style="font-size:9px;background:var(--elim-light);color:var(--elim);border:none;border-radius:6px;padding:2px 6px;cursor:pointer;margin-top:2px">Remove<\/button>`:''}
        <\/div>
      `).join('')}
    <\/div>`;
  openModal('modal-player-detail');
}

function showCastStatus(){
  document.getElementById('modal-cast-content').innerHTML=`<div class="cast-status-grid">${G.cast.map(c=>{
    const hasIdol=G.idolHolders.includes(c.id);
    return `<div class="cast-status-card${c.eliminated?' eliminated':''}${c.juryMember?' jury-member':''}${c.immunity?' immune':''}">
      <div class="cast-st-portrait">${getPortrait(c)}<\/div>
      <div class="cast-st-name">${c.name}<\/div>
      <div class="cast-st-archetype">${c.archetype}<\/div>
      <div class="cast-st-badges">
        ${c.eliminated?`<span class="badge badge-red" style="font-size:9px">Ep ${c.elimEp||'?'}<\/span>`:''}
        ${c.juryMember?`<span class="badge badge-purple" style="font-size:9px">Jury<\/span>`:''}
        ${c.immunity?`<span class="badge badge-water" style="font-size:9px">🛡 Immune<\/span>`:''}
        ${hasIdol?`<span class="badge badge-win" style="font-size:9px">💎 Idol<\/span>`:''}
        ${!c.eliminated?`<span class="badge badge-gray" style="font-size:9px">${c.personality}<\/span>`:''}
      <\/div>
      ${!c.eliminated?`<div class="cast-st-stats">
        <div class="cast-st-stat">Phy <strong>${c.physical}<\/strong><\/div><div class="cast-st-stat">Soc <strong>${c.social}<\/strong><\/div>
        <div class="cast-st-stat">Men <strong>${c.mental}<\/strong><\/div><div class="cast-st-stat">End <strong>${c.endurance}<\/strong><\/div>
      <\/div>`:''}
    <\/div>`;
  }).join('')}<\/div>`;
  openModal('modal-cast-status');
}


// ===== EXPORTS =====


// ===== FILE: state.js =====
// No Signal — state.js
// Game state (G), utilities, contestant/team builders

// ===== STATE =====
let G = {
  cast:[], teams:[], settings:{},
  twists:new Set(TWISTS_DATA.map(t=>t.id)),
  episode:1, merged:false, jury:[],
  episodeLog:[], dramaLevel:0, idolHolders:[],
  alliances:[], challengeWinStreaks:{},
  currentEpData:null, stageIndex:0,
  extraVoteHolders:[], stealVoteHolders:[],
  pendingChallenge:null,
  rngState:null, relationships:{},
  placementHistory:[], allianceLog:[], fanSaveUsed:false, fanSavePlayer:null,
  memories:[],  // persistent contestant memory events — see memory.js
  producerPowers:{}, // producer mode power usage tracking — see producer.js
  playerContestantId:null, // null=simulate mode; set to cast id=play mode (reserved for v2 play mode)
  perceivedRelationships:{}, // future: how players THINK others feel about them (diverges from relationships)
                              // Structure: {subjectId: {objectId: perceivedScore 0-100}}
                              // When perception ≠ reality → blindsides, paranoia, false security
};

// ===== UTILITIES =====
function hashSeed(str){
  let h=2166136261>>>0;
  str=String(str||'');
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function seededRandom(){
  if(!G.settings||!G.settings.seed) return Math.random();
  if(G.rngState==null) G.rngState=hashSeed(G.settings.seed+'|'+(G.episode||1)+'|no-signal-v19');
  G.rngState=(Math.imul(1664525,G.rngState)+1013904223)>>>0;
  return G.rngState/4294967296;
}
const rng=(min,max)=>Math.floor(seededRandom()*(max-min+1))+min;
const pick=arr=>arr[rng(0,arr.length-1)];
const shuffle=arr=>{let a=[...arr];for(let i=a.length-1;i>0;i--){let j=rng(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
const uid=()=>Math.random().toString(36).slice(2,8);
const isOn=id=>document.getElementById(id)?.classList.contains('on');

let _notifyQueue=[],_notifyShowing=false;
function notify(msg,type='fire'){
  _notifyQueue.push({msg,type});
  if(!_notifyShowing) _showNextNotify();
}
function _showNextNotify(){
  if(!_notifyQueue.length){_notifyShowing=false;return;}
  _notifyShowing=true;
  const {msg,type}=_notifyQueue.shift();
  const el=document.getElementById('notification');
  el.textContent=msg; el.className=`notification type-${type} show`;
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(_showNextNotify,300);
  },2200);
}
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function goHome(){
  // Auto-save if there's an active game
  if(G.currentEpData&&G.cast.length) saveGame(true);
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-home').classList.add('active');
  document.getElementById('header-ep-badge').style.display='none';
  updateContinueButton();
}
function goSetup(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-setup').classList.add('active');
  if(!G.cast.length) generateRandomCast(12);
  renderTwistsGrid();
  setupNav('general',document.querySelector('[data-panel="general"]'));
  updateTeamsPanel();
}
function setupNav(panel,el){
  document.querySelectorAll('.setup-nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.setup-panel').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('panel-'+panel).classList.add('active');
  if(panel==='teams') updateTeamsPanel();
  if(panel==='cast') renderCastList();
}

// ===== CONTESTANT =====
// Track used names within a generation run to prevent duplicates
const _usedFirstNames=new Set(), _usedLastNames=new Set();
function makeName(){
  // Pick a first name not already used; fall back to any if all are exhausted
  const availFirst=FIRST_NAMES.filter(n=>!_usedFirstNames.has(n));
  const first=availFirst.length?pick(availFirst):pick(FIRST_NAMES);
  _usedFirstNames.add(first);
  const availLast=LAST_NAMES.filter(n=>!_usedLastNames.has(n));
  const last=availLast.length?pick(availLast):pick(LAST_NAMES);
  _usedLastNames.add(last);
  return first+' '+last;
}
function resetNamePool(){_usedFirstNames.clear();_usedLastNames.clear();}
function makeContestant(overrides={}){
  const name=overrides.name||makeName();
  const color=overrides.color||pick(PALETTE);
  return{
    id:uid(),name,color,
    initials:name.split(' ').map(w=>w[0]).join('').slice(0,2),
    archetype:overrides.archetype||pick(ARCHETYPES),
    personality:overrides.personality||pick(PERSONALITIES),
    physical:overrides.physical??rng(3,10),social:overrides.social??rng(3,10),
    mental:overrides.mental??rng(3,10),endurance:overrides.endurance??rng(3,10),
    team:overrides.team??null, eliminated:false, juryMember:false,
    votes:0, immunity:false, hasIdol:false, idolPlayed:false,
    challengeWins:0, allianceIds:[], elimEp:null, juryReturn:false,
    _portrait:null, customImage:overrides.customImage||null,
  };
}
function getPortrait(c){
  // Custom uploaded image takes priority over generated SVG portrait
  if(c.customImage){
    // Return a consistently-sized <img> with the stored base64 data
    return`<img src="${c.customImage}" alt="${c.name}" style="width:120px;height:145px;object-fit:cover;object-position:top;border-radius:12px;display:block;">`;
  }
  // Cache key includes properties that affect appearance — auto-invalidates on change
  const key=`${c.color}|${c.personality}|${c.archetype}`;
  if(c._portraitKey!==key){
    c._portrait=generatePortrait(c);
    c._portraitKey=key;
  }
  return c._portrait;
}
function updateContestantPortrait(c){c._portraitKey=null;}
function addContestant(){const c=makeContestant();G.cast.push(c);renderCastList();updateCastNavCount();}
function generateRandomCast(n=12){G.cast=[];resetNamePool();for(let i=0;i<n;i++)G.cast.push(makeContestant());renderCastList();updateCastNavCount();notify(`Generated ${n} contestants! ✨`);}
function removeContestant(id){G.cast=G.cast.filter(c=>c.id!==id);renderCastList();updateCastNavCount();updateTeamsPanel();}
function updateCastNavCount(){
  const el=document.getElementById('cast-nav-count');
  el.textContent=G.cast.length; el.classList.toggle('show',G.cast.length>0);
  const d=document.getElementById('cast-count-display'); if(d) d.textContent=`(${G.cast.length})`;
}
function renderCastList(){
  const container=document.getElementById('cast-list-container'); if(!container) return;
  if(!G.cast.length){container.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥<\/div><div>No contestants yet.<\/div><\/div>`;return;}
  container.innerHTML=G.cast.map((c,i)=>`
    <div class="cast-card anim-in" id="cast-card-${c.id}" style="animation-delay:${i*0.03}s">
      <div class="cast-card-header">
        <div class="cast-portrait-upload" id="cpu-${c.id}">
          <div class="cpu-img-wrap" onclick="triggerImageUpload('${c.id}')" title="${c.customImage?'Click to change photo':'Click to upload photo'}">
            ${getPortrait(c).replace('width:120px;height:145px','width:76px;height:92px').replace('width="120" height="145"','width="76" height="92"')}
            <div class="cpu-overlay">${c.customImage?'📷 Change':'📷 Upload'}<\/div>
          <\/div>
          <input type="file" id="img-input-${c.id}" accept="image/*" style="display:none" onchange="handleImageUpload('${c.id}',this)">
          ${c.customImage?`<button class="cpu-clear-btn" onclick="clearImage('${c.id}')" title="Remove photo">✕<\/button>`:''}
        <\/div>
        <div style="flex:1;min-width:0">
          <input class="cast-name-edit" value="${c.name}" oninput="updateContestant('${c.id}','name',this.value)" placeholder="Contestant name">
          <div class="cpu-hint">${c.customImage?`<span style="color:var(--leaf);font-size:11px">✓ Custom photo<\/span>`:`<span style="color:var(--text3);font-size:11px">Click portrait to upload or change colour<\/span>`}<\/div>
          ${!c.customImage?`<button class="cpu-color-btn" onclick="pickColor('${c.id}')" style="margin-top:4px">🎨 Colour<\/button>`:''}
        <\/div>
        <button class="cast-del" onclick="removeContestant('${c.id}')" title="Remove">✕<\/button>
      <\/div>
      <div class="cast-badges" style="margin-bottom:10px">
        <select class="cast-select" onchange="updateContestant('${c.id}','personality',this.value)">
          ${PERSONALITIES.map(p=>`<option${c.personality===p?' selected':''}>${p}<\/option>`).join('')}
        <\/select>
        <select class="cast-select" onchange="updateContestant('${c.id}','archetype',this.value)">
          ${ARCHETYPES.map(a=>`<option${c.archetype===a?' selected':''}>${a}<\/option>`).join('')}
        <\/select>
      <\/div>
      <div class="cast-stats">
        ${renderStatRow('physical',c.physical,'#0EA5E9',c.id)}
        ${renderStatRow('social',c.social,'#16A34A',c.id)}
        ${renderStatRow('mental',c.mental,'#9333EA',c.id)}
        ${renderStatRow('endurance',c.endurance,'#EAB308',c.id)}
      <\/div>
    <\/div>`).join('');
}
function renderStatRow(stat,val,color,id){
  return `<div class="stat-row">
    <span class="stat-name">${stat.slice(0,3).toUpperCase()}<\/span>
    <div class="stat-track"><div class="stat-fill" id="sf-${id}-${stat}" style="width:${val*10}%;background:${color}"><\/div><\/div>
    <input type="range" class="stat-input" min="1" max="10" value="${val}"
      oninput="updateContestant('${id}','${stat}',+this.value);document.getElementById('sf-${id}-${stat}').style.width=(this.value*10)+'%';document.getElementById('sn-${id}-${stat}').textContent=this.value">
    <span class="stat-num" id="sn-${id}-${stat}">${val}<\/span>
  <\/div>`;
}
function updateContestant(id,field,val){
  const c=G.cast.find(x=>x.id===id); if(!c) return;
  c[field]=val; c._portrait=null;
  if(field==='name'){c.initials=val.split(' ').map(w=>w[0]).join('').slice(0,2)||'?';}
}

let _colorPickTarget=null,_teamColorTarget=null;
function pickColor(id){
  _colorPickTarget=id; _teamColorTarget=null;
  const c=G.cast.find(x=>x.id===id);
  document.getElementById('color-grid-container').innerHTML=PALETTE.map(col=>`
    <div class="color-swatch${c&&c.color===col?' selected':''}" style="background:${col}" onclick="applyColor('${col}')"><\/div>`).join('');
  openModal('modal-color-pick');
}
function applyColor(col){
  if(_colorPickTarget){
    const c=G.cast.find(x=>x.id===_colorPickTarget);
    if(c){c.color=col;c._portrait=null;}
    closeModal('modal-color-pick');
    // Refresh just that card portrait
    const wrap=document.querySelector(`#cast-card-${_colorPickTarget} .cast-portrait-wrap`);
    if(wrap&&c) wrap.innerHTML=getPortrait(c);
  } else if(_teamColorTarget!==null){
    G.teams[_teamColorTarget].color=col;
    closeModal('modal-color-pick');
    renderTeamCards();
  }
}

// ===== TEAMS =====
function initTeams(){
  const n=+document.getElementById('s-num-teams').value;
  const names=['Tribe '+TRIBE_NAMES[0],'Tribe '+TRIBE_NAMES[1],'Tribe '+TRIBE_NAMES[2],'Tribe '+TRIBE_NAMES[3]];
  const colors=[PALETTE[0],PALETTE[1],PALETTE[2],PALETTE[6]];
  if(G.teams.length!==n){G.cast.forEach(c=>c.team=null);G.teams=[];for(let i=0;i<n;i++)G.teams.push({id:uid(),name:names[i],color:colors[i]});}
  updateTeamsPanel();
}
function autoAssignTeams(){
  const n=G.teams.length||+document.getElementById('s-num-teams').value;
  if(!G.teams.length) initTeams();
  shuffle([...G.cast]).forEach((c,i)=>c.team=i%n);
  updateTeamsPanel(); notify('Players auto-assigned! 🔀');
}
function updateTeamsPanel(){if(G.teams.length===0)initTeams();renderUnassignedPool();renderTeamCards();}
function renderUnassignedPool(){
  const pool=document.getElementById('unassigned-pool'); if(!pool) return;
  const unassigned=G.cast.filter(c=>c.team===null||c.team===undefined);
  if(!unassigned.length){pool.innerHTML=`<div style="font-size:12px;color:var(--text3);padding:6px">All players assigned ✓<\/div>`;return;}
  pool.innerHTML=unassigned.map(c=>`<span class="pool-chip" onclick="showAssignMenu('${c.id}',event)">
    <span style="width:16px;height:16px;border-radius:50%;background:${c.color};display:inline-block;flex-shrink:0"><\/span>${c.name.split(' ')[0]}<\/span>`).join('');
}
function showAssignMenu(cid,event){
  const existing=document.getElementById('assign-menu'); if(existing) existing.remove();
  const menu=document.createElement('div'); menu.id='assign-menu';
  menu.style.cssText=`position:fixed;background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:6px;box-shadow:var(--shadow-lg);z-index:500;min-width:150px`;
  menu.style.top=(event.clientY+8)+'px'; menu.style.left=event.clientX+'px';
  menu.innerHTML=G.teams.map((t,i)=>`<div onclick="assignToTeam('${cid}',${i});this.closest('#assign-menu').remove()"
    style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;border-radius:7px;font-size:13px"
    onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
    <span style="width:12px;height:12px;border-radius:50%;background:${t.color};display:inline-block"><\/span>${t.name}<\/div>`).join('');
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),50);
}
function assignToTeam(cid,ti){const c=G.cast.find(x=>x.id===cid);if(c)c.team=ti;updateTeamsPanel();}
function removeFromTeam(cid){const c=G.cast.find(x=>x.id===cid);if(c)c.team=null;updateTeamsPanel();}
function renderTeamCards(){
  const container=document.getElementById('team-config-container'); if(!container) return;
  container.innerHTML=G.teams.map((t,ti)=>{
    const members=G.cast.filter(c=>c.team===ti);
    return `<div class="team-card" style="border-left-color:${t.color}">
      <div class="team-card-header">
        <div class="team-color-dot" style="background:${t.color}" onclick="pickTeamColor(${ti})" title="Change color"><\/div>
        <input class="team-name-edit" value="${t.name}" oninput="G.teams[${ti}].name=this.value">
        <span class="badge badge-gray">${members.length} members<\/span>
      <\/div>
      <div class="team-members-area" id="team-area-${ti}">
        ${members.map(c=>`<span class="member-chip" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44" onclick="removeFromTeam('${c.id}')">
          <span style="width:14px;height:14px;border-radius:50%;background:${c.color};display:inline-block;flex-shrink:0"><\/span>
          ${c.name.split(' ')[0]} <span style="opacity:0.5;font-size:10px">✕<\/span><\/span>`).join('')}
        ${!members.length?`<div style="font-size:12px;color:var(--text3);padding:4px">No members — click unassigned players above<\/div>`:''}
      <\/div>
    <\/div>`;
  }).join('');
}
function pickTeamColor(ti){
  _teamColorTarget=ti; _colorPickTarget=null;
  document.getElementById('color-grid-container').innerHTML=PALETTE.map(col=>`
    <div class="color-swatch${G.teams[ti]&&G.teams[ti].color===col?' selected':''}" style="background:${col}" onclick="applyColor('${col}')"><\/div>`).join('');
  openModal('modal-color-pick');
}
function renderTwistsGrid(){
  const container=document.getElementById('twist-grid-container'); if(!container) return;
  container.innerHTML=TWISTS_DATA.map(t=>`<div class="twist-card${G.twists.has(t.id)?' selected':''}" onclick="toggleTwist('${t.id}',this)">
    <div class="twist-check">✓<\/div><div class="twist-icon">${t.icon}<\/div>
    <div class="twist-name">${t.name}<\/div><div class="twist-desc">${t.desc}<\/div>
    <div style="margin-top:6px"><span class="badge badge-gray" style="font-size:9px">${t.rarity}<\/span><\/div>
  <\/div>`).join('');
}
function toggleTwist(id,el){el.classList.toggle('selected');if(G.twists.has(id))G.twists.delete(id);else G.twists.add(id);}

// ===== START SEASON =====
function toggleReturneeSettings(toggle){
  const cfg=document.getElementById('returnee-config');
  if(cfg) cfg.style.display=toggle.classList.contains('on')?'block':'none';
}
function startSeason(){
  if(G.cast.length<4){alert('Add at least 4 contestants!');return;}
  const unassigned=G.cast.filter(c=>c.team===null||c.team===undefined);
  if(unassigned.length>0){if(!confirm(`${unassigned.length} player(s) have no team. Auto-assign?`))return;autoAssignTeams();}
  G.settings={
    name:document.getElementById('s-name').value||'Season 1',
    theme:document.getElementById('s-theme').value,
    flavor:document.getElementById('s-flavor').value,
    seed:document.getElementById('s-seed')?.value.trim()||'',
    mergeEpisode:+document.getElementById('s-merge').value||6,
    finaleSize:+document.getElementById('s-finale-size').value||3,
    voteSystem:document.getElementById('s-vote-system').value,
    tiebreak:document.getElementById('s-tiebreak').value,
    alliances:isOn('t-alliances'),confessionals:isOn('t-confessionals'),
    drama:isOn('t-drama'),idols:isOn('t-idols'),jury:isOn('t-jury'),
    interactions:isOn('t-interactions'),streaks:isOn('t-streaks'),log:isOn('t-log'),
    twistFreq:+document.getElementById('s-twist-freq').value||15,
    randomness:+document.getElementById('s-randomness').value||30,
    allianceStr:+document.getElementById('s-alliance-str').value||60,
    idolDiff:document.getElementById('s-idol-diff').value,
    dramaRate:document.getElementById('s-drama-rate').value,
    tone:document.getElementById('s-tone').value,
    showScores:isOn('t-scores'),showVotes:isOn('t-show-votes'),returnees:isOn('t-returnees'),
    rejoinEpisode:isOn('t-returnees')?(+document.getElementById('s-rejoin-ep')?.value||4):null,
    rejoinCount:isOn('t-returnees')?(+document.getElementById('s-rejoin-count')?.value||1):0,
  };
  G.episode=1;G.merged=false;G.jury=[];G.episodeLog=[];G.dramaLevel=0;G.idolHolders=[];G.rngState=null;G.relationships={};
  G.alliances=[];G.challengeWinStreaks={};G.extraVoteHolders=[];G.stealVoteHolders=[];
  G.cast.forEach(c=>{c.eliminated=false;c.juryMember=false;c.votes=0;c.immunity=false;c.hasIdol=false;c.idolPlayed=false;c.challengeWins=0;c.allianceIds=[];c.elimEp=null;c.juryReturn=false;});
  if(G.settings.alliances) buildAlliances();
  document.getElementById('header-ep-badge').style.display='flex';
  showGameScreen();
  computeAndStartEpisode();
}
function buildAlliances(){
  G.alliances=[];
  const players=shuffle([...G.cast]);
  for(let i=0;i<players.length-1;i+=2){
    const a=players[i],b=players[i+1],alId=uid();
    a.allianceIds.push(alId);b.allianceIds.push(alId);
    G.alliances.push({id:alId,members:[a.id,b.id],name:`${a.name.split(' ')[0]}-${b.name.split(' ')[0]} duo`});
  }
  if(players.length>=6){
    const trio=shuffle(players).slice(0,3),alId=uid();
    trio.forEach(p=>p.allianceIds.push(alId));
    G.alliances.push({id:alId,members:trio.map(p=>p.id),name:`${trio[0].name.split(' ')[0]}'s trio`});
  }
}

// ===== GAME SCREEN =====
function showGameScreen(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-game').classList.add('active');
  updateGameSidebar();
}
function updateGameSidebar(){
  const active=getActive();
  document.getElementById('gs-ep-num').textContent=G.episode;
  const phase=G.merged?(active.length<=G.settings.finaleSize?'Finale':'Post-Merge'):'Pre-Merge';
  document.getElementById('gs-ep-label').textContent=phase;
  document.getElementById('hdr-ep-txt').textContent=`Ep ${G.episode} · ${G.settings.name}`;
  const badge=document.getElementById('gs-phase-badge');
  badge.textContent=phase;
  badge.className='gs-status-badge '+(G.merged?(phase==='Finale'?'gs-status-finale':'gs-status-merge'):'gs-status-pre');
  const total=G.cast.length-G.settings.finaleSize;
  const eliminated=G.cast.filter(c=>c.eliminated).length;
  document.getElementById('gs-progress-txt').textContent=`${eliminated}/${total} out`;
  document.getElementById('gs-progress-bar').style.width=total>0?(eliminated/total*100)+'%':'0%';
  if(G.settings.drama){
    document.getElementById('drama-meter-wrap').style.display='block';
    document.getElementById('drama-bars').innerHTML=Array.from({length:5},(_,i)=>`<div class="drama-pip${i<G.dramaLevel?' active':''}"><\/div>`).join('');
  }
  const playerList=document.getElementById('gs-player-list');
  if(G.merged){
    playerList.innerHTML=`<div class="gs-tribe-label" style="color:rgba(255,255,255,0.4)">MERGED TRIBE<\/div>`+active.map(c=>gsPlayerChip(c)).join('');
  } else {
    playerList.innerHTML=G.teams.map((t,ti)=>{
      const members=active.filter(c=>c.team===ti); if(!members.length) return '';
      return `<div class="gs-tribe-group"><div class="gs-tribe-label" style="color:${t.color}">${t.name.toUpperCase()}<\/div>${members.map(c=>gsPlayerChip(c)).join('')}<\/div>`;
    }).join('');
  }
}
function gsPlayerChip(c){
  const idol=G.idolHolders.includes(c.id);
  // Custom image: use <img> cropped to circle; otherwise use generated SVG
  const miniPortrait=c.customImage
    ? `<img src="${c.customImage}" alt="${c.name}" style="width:28px;height:28px;object-fit:cover;object-position:top;border-radius:50%;display:block;">`
    : getPortrait(c).replace('width="120" height="145"','width="28" height="34"').replace('viewBox="0 0 120 145"','viewBox="15 20 90 95"');
  return `<div class="gs-player${c.immunity?' immune':''}${c.juryMember?' jury-member':''}${idol?' has-idol':''}" onclick="showPlayerDetail('${c.id}')">
    <div class="mini-avatar" style="background:${c.color};overflow:hidden;padding:0">${miniPortrait}<\/div>
    <span class="p-name">${c.name.split(' ')[0]}<\/span>
    ${idol?'<span style="font-size:9px">💎<\/span>':''}
    ${c.immunity?'<span style="font-size:9px">🛡️<\/span>':''}
    ${!G.merged&&c.team!==null&&G.teams[c.team]?`<span class="p-team-dot" style="background:${G.teams[c.team].color}"><\/span>`:''}
  <\/div>`;
}


// ===== PLAY MODE ARCHITECTURE SEEDS =====
// These stubs exist so play mode can be added post-launch without
// restructuring the engine. Simulate mode ignores them entirely.

/**
 * getPerceivedScore(subjectId, objectId)
 * Returns how subjectId THINKS objectId feels about them.
 * Currently mirrors the real relationship score (no divergence yet).
 * In the full perception system this will differ based on:
 *   - visible signals (who talked to them, how they voted)
 *   - personality biases (paranoid types underestimate safety)
 *   - deliberate deception by other players
 * Stub now — full implementation in perception system update.
 */
function getPerceivedScore(subjectId, objectId){
  // Check if we have a perceived score stored
  const perceived=(G.perceivedRelationships||{})[subjectId]?.[objectId];
  if(perceived!=null) return perceived;
  // Fall back to real relationship score — no divergence yet
  return v19RelScore(subjectId, objectId);
}

/**
 * setPerceivedScore(subjectId, objectId, score)
 * Updates how subjectId perceives their relationship with objectId.
 * Will be called by social interaction events, deception mechanics,
 * and personality-based distortion in the full perception system.
 */
function setPerceivedScore(subjectId, objectId, score){
  if(!G.perceivedRelationships) G.perceivedRelationships={};
  if(!G.perceivedRelationships[subjectId]) G.perceivedRelationships[subjectId]={};
  G.perceivedRelationships[subjectId][objectId]=Math.max(0,Math.min(100,score));
}

/**
 * getPlayerView()
 * Returns a filtered read of G state representing only what the player's
 * character could realistically know — their alliances, their relationships,
 * votes they personally witnessed, memories they've experienced.
 *
 * In simulate mode: always returns null (unused).
 * In play mode: returns {alliances, relationships, memories, knownVotes}
 * filtered to playerContestantId's perspective.
 *
 * Imperfect information is the core tension of play mode — the player
 * should never see the full G state, only their character's knowledge.
 */
function getPlayerView(){
  if(!G.playerContestantId) return null; // simulate mode — no player perspective
  const pid = G.playerContestantId;

  // Alliances the player is actually in
  const myAlliances = (G.alliances||[]).filter(a=>a.members.includes(pid));

  // Relationships the player has directly experienced (not inferred)
  const myRelationships = {};
  Object.entries(G.relationships||{}).forEach(([key,score])=>{
    if(key.includes(pid)) myRelationships[key] = score;
  });

  // Memories where the player is subject or object
  const myMemories = (G.memories||[]).filter(m=>
    m.subject===pid || m.object===pid
  );

  // Votes the player has personally witnessed (parchments they've seen flipped)
  const knownVotes = (G.currentEpData?._renderedVoteOrder||[])
    .slice(0, G.stageIndex >= 3 ? undefined : 0); // only after tribal

  return { alliances:myAlliances, relationships:myRelationships,
           memories:myMemories, knownVotes };
}

/**
 * isPlayMode()
 * Convenience check — true if a human player contestant is set.
 */
function isPlayMode(){
  return !!G.playerContestantId;
}

// ===== EXPORTS =====


// ===== FILE: memory.js =====
// No Signal — memory.js
// Persistent contestant memory system
// Contestants remember betrayals, alliances, idol plays, saves, and rivalries.
// These memories feed into voting logic, confessionals, jury bias, and scripts.

// ===== MEMORY EVENT TYPES =====
// Each memory is a discrete event stored in G.memories[]
//
// { type, subject, object, episode, intensity, seen }
//
// type:      string key (see MEMORY_TYPES below)
// subject:   contestant id who experienced/performed the action
// object:    contestant id the action was directed at (or null)
// episode:   episode number when it happened
// intensity: 0-100 how significant this memory is
// seen:      bool — whether this has been surfaced in a confessional/script

const MEMORY_TYPES = {
  betrayal:         { label:'Betrayal',        sentiment:-1, decay:0.02  }, // voted out / backstabbed an ally
  voted_for:        { label:'Voted for',        sentiment:-1, decay:0.05  }, // non-ally vote
  saved:            { label:'Saved',            sentiment:+1, decay:0.03  }, // didn't vote them out when they could
  idol_played_on:   { label:'Idol played on',   sentiment:+1, decay:0.01  }, // used idol to save them
  idol_played_against:{ label:'Idol blocked',   sentiment:-1, decay:0.01  }, // idol negated votes for them
  alliance_formed:  { label:'Alliance formed',  sentiment:+1, decay:0.01  }, // formed alliance together
  alliance_broken:  { label:'Alliance broken',  sentiment:-1, decay:0.02  }, // alliance shattered
  challenge_beat:   { label:'Beat in challenge',sentiment:-1, decay:0.08  }, // beat them in key challenge
  jury_speech:      { label:'Jury speech',      sentiment: 0, decay:0     }, // final jury statement
  rivalry:          { label:'Rivalry',          sentiment:-1, decay:0.015 }, // ongoing conflict
};

// ===== CORE MEMORY API =====

/**
 * recordMemory(type, subjectId, objectId, episode, intensity)
 * Adds a new memory event to G.memories[].
 * Called from engine.js after significant game events.
 */
function recordMemory(type, subjectId, objectId, episode, intensity=50){
  if(!G.memories) G.memories=[];
  // Don't duplicate identical events in same episode
  const dupe = G.memories.find(m=>
    m.type===type && m.subject===subjectId &&
    m.object===objectId && m.episode===episode
  );
  if(dupe) return;
  G.memories.push({ type, subject:subjectId, object:objectId, episode, intensity, seen:false });
}

/**
 * getMemories(subjectId, objectId=null, types=null)
 * Returns memories for a subject, optionally filtered by object and/or type.
 * Sorted by episode desc (most recent first).
 */
function getMemories(subjectId, objectId=null, types=null){
  if(!G.memories) return [];
  return G.memories
    .filter(m=>{
      if(m.subject!==subjectId) return false;
      if(objectId && m.object!==objectId) return false;
      if(types && !types.includes(m.type)) return false;
      return true;
    })
    .sort((a,b)=>b.episode-a.episode);
}

/**
 * memoryScore(subjectId, objectId)
 * Returns a -100 to +100 sentiment score representing how subjectId
 * feels about objectId, based on accumulated memories with decay over time.
 *
 * Decay: old memories fade — a betrayal in ep 1 hurts less by ep 10.
 * Recency: recent events weigh more heavily.
 */
function memoryScore(subjectId, objectId){
  const mems = getMemories(subjectId, objectId);
  if(!mems.length) return 0;
  const currentEp = G.episode||1;
  let total=0, weight=0;
  mems.forEach(m=>{
    const def = MEMORY_TYPES[m.type];
    if(!def) return;
    const age = currentEp - m.episode;
    const decayFactor = Math.max(0.1, 1 - def.decay * age);
    const contribution = def.sentiment * m.intensity * decayFactor;
    total += contribution;
    weight += Math.abs(contribution);
  });
  if(!weight) return 0;
  return Math.max(-100, Math.min(100, Math.round(total)));
}

/**
 * hasBetrayedBy(subjectId, objectId)
 * Returns true if objectId has betrayed subjectId (voted them out, broke alliance etc)
 */
function hasBetrayedBy(subjectId, objectId){
  return getMemories(subjectId, objectId, ['betrayal','alliance_broken']).length > 0;
}

/**
 * getStrongestMemory(subjectId, objectId)
 * Returns the most intense memory between these two players.
 * Used in confessional and script generation for flavour.
 */
function getStrongestMemory(subjectId, objectId){
  const mems = getMemories(subjectId, objectId);
  if(!mems.length) return null;
  return mems.reduce((best,m)=>m.intensity>best.intensity?m:best, mems[0]);
}

/**
 * getUnseenMemories(subjectId)
 * Returns memories that haven't been surfaced in confessionals yet.
 * Marks them as seen once retrieved.
 */
function getUnseenMemories(subjectId){
  if(!G.memories) return [];
  const unseen = G.memories.filter(m=>m.subject===subjectId && !m.seen);
  unseen.forEach(m=>m.seen=true);
  return unseen;
}

/**
 * getJuryBias(jurorId, finalistId)
 * Returns a -100 to +100 jury vote bias score.
 * Combines relationship score, memory score, and archetype affinity.
 * Called during finale jury vote calculation.
 */
function getJuryBias(jurorId, finalistId){
  const mem = memoryScore(jurorId, finalistId);
  const rel = v19RelScore(jurorId, finalistId);
  const juror = G.cast.find(c=>c.id===jurorId);
  const finalist = G.cast.find(c=>c.id===finalistId);
  if(!juror||!finalist) return 0;

  // Base: relationship score normalised to -50/+50
  let bias = (rel - 50);

  // Memory layer: betrayal hurts badly, saves help
  bias += mem * 0.4;

  // Archetype respect: some juror types respect certain play styles
  const respectMatrix = {
    'Strategic':  ['The Strategist','The Puppet Master','The Quiet Threat'],
    'Loyal':      ['The Sweetheart','The Fan Favorite','The Underdog'],
    'Villain':    ['The Big Villain','The Manipulator','The Puppet Master'],
    'Social':     ['The Social Butterfly','The Fan Favorite','The Sweetheart'],
    'Hothead':    ['The Challenge Beast','The Physical Threat','The Loose Cannon'],
    'Underdog':   ['The Underdog','The Fan Favorite','The Sweetheart'],
  };
  const respected = respectMatrix[juror.personality]||[];
  if(respected.includes(finalist.archetype)) bias += 15;

  // Betrayal penalty: if juror was voted out by finalist, strong negative bias
  if(hasBetrayedBy(jurorId, finalistId)) bias -= 25;

  // Saved bonus: if finalist saved juror at some point
  if(getMemories(jurorId, finalistId, ['saved']).length) bias += 20;

  return Math.max(-100, Math.min(100, Math.round(bias)));
}

// ===== MEMORY RECORDING HELPERS =====
// Called from engine.js at key game moments

/**
 * recordVoteMemories(voteResult, ep)
 * After a vote, records memories for all players involved.
 * - The eliminated player remembers who voted for them (betrayal if ally)
 * - Voters remember voting against someone (voted_for)
 * - Alliance members who voted together reinforce bonds
 */
function recordVoteMemories(voteResult, ep){
  if(!voteResult||!voteResult.individualVotes) return;
  const {eliminated, individualVotes} = voteResult;
  const epNum = ep.ep;

  individualVotes.forEach(({voter, target, reason})=>{
    // Target remembers being voted for
    const isBetrayal = (voter.allianceIds||[]).some(aid=>(target.allianceIds||[]).includes(aid));
    if(isBetrayal){
      // Alliance member voted against them — that's a betrayal
      recordMemory('betrayal', target.id, voter.id, epNum, 80);
      recordMemory('alliance_broken', target.id, voter.id, epNum, 75);
      // Voter also knows they broke the alliance
      recordMemory('alliance_broken', voter.id, target.id, epNum, 60);
    } else {
      recordMemory('voted_for', target.id, voter.id, epNum, 40);
    }

    // If eliminated, everyone who voted for them — they remember more vividly
    if(eliminated && target.id === eliminated.id){
      recordMemory('voted_for', target.id, voter.id, epNum,
        isBetrayal ? 95 : 55);
    }
  });

  // Allies who voted together reinforce their bond
  if(G.alliances){
    G.alliances.forEach(alliance=>{
      const votingTogether = alliance.members.filter(mid=>{
        const v = individualVotes.find(iv=>iv.voter.id===mid);
        if(!v) return false;
        // Check if majority of alliance voted same target
        const allianceVotes = individualVotes.filter(iv=>alliance.members.includes(iv.voter.id));
        const topTarget = allianceVotes.reduce((acc,iv)=>{
          acc[iv.target.id]=(acc[iv.target.id]||0)+1; return acc;
        },{});
        const maxVotes = Math.max(...Object.values(topTarget));
        const consensusTarget = Object.keys(topTarget).find(id=>topTarget[id]===maxVotes);
        return v.target.id === consensusTarget;
      });
      // If 3+ alliance members voted together, reinforce bonds between them
      if(votingTogether.length>=3){
        for(let i=0;i<votingTogether.length;i++){
          for(let j=i+1;j<votingTogether.length;j++){
            recordMemory('alliance_formed', votingTogether[i], votingTogether[j], epNum, 20);
            recordMemory('alliance_formed', votingTogether[j], votingTogether[i], epNum, 20);
          }
        }
      }
    });
  }
}

/**
 * recordIdolMemories(idolPlay, ep)
 * Records memories when an idol is played.
 */
function recordIdolMemories(idolPlay, ep){
  if(!idolPlay) return;
  const {idolPlayer, target} = idolPlay;
  const epNum = ep.ep;
  // Everyone who had votes nullified remembers the idol play
  if(idolPlayer.id === target?.id){
    // Played on themselves — anyone who voted for them remembers being blocked
    (ep.voteResult?.individualVotes||[])
      .filter(iv=>iv.target.id===idolPlayer.id)
      .forEach(iv=>{
        recordMemory('idol_played_against', iv.voter.id, idolPlayer.id, epNum, 70);
      });
  } else if(target){
    // Played on someone else — they feel saved
    recordMemory('idol_played_on', target.id, idolPlayer.id, epNum, 85);
    recordMemory('saved', target.id, idolPlayer.id, epNum, 85);
  }
}

// ===== MEMORY → VOTING INTEGRATION =====

/**
 * memoryTargetBonus(voter, target)
 * Returns a score modifier for targetScore() based on voter's memories of target.
 * Positive = more likely to vote them out. Negative = less likely.
 */
function memoryTargetBonus(voter, target){
  const score = memoryScore(voter.id, target.id);
  // Negative memory score (betrayal, conflict) → voter wants to vote them out
  // Positive memory score (saved, alliance) → voter less likely to target
  // Scale: -100 → +8 bonus (strongly want out), +100 → -6 bonus (protected)
  if(score < -60) return 8;
  if(score < -30) return 5;
  if(score < -10) return 2;
  if(score > 60)  return -6;
  if(score > 30)  return -3;
  if(score > 10)  return -1;
  return 0;
}

// ===== MEMORY → CONFESSIONAL INTEGRATION =====

/**
 * getMemoryConfessionalLine(player, ep)
 * Returns a specific confessional line referencing a real past memory.
 * Returns null if no relevant unseen memories exist.
 */
function getMemoryConfessionalLine(player, ep){
  if(!G.memories) return null;
  const recentBetrayal = getMemories(player.id, null, ['betrayal'])
    .find(m => ep.ep - m.episode <= 3);
  const recentSave = getMemories(player.id, null, ['saved'])
    .find(m => ep.ep - m.episode <= 3);
  const recentIdolBlock = getMemories(player.id, null, ['idol_played_against'])
    .find(m => ep.ep - m.episode <= 2);

  if(recentBetrayal){
    const betrayer = G.cast.find(c=>c.id===recentBetrayal.object);
    if(betrayer) return `${betrayer.name.split(' ')[0]} voted against me in Episode ${recentBetrayal.episode}. I haven't forgotten that. I won't.`;
  }
  if(recentIdolBlock){
    const blocker = G.cast.find(c=>c.id===recentIdolBlock.object);
    if(blocker) return `${blocker.name.split(' ')[0]} played an idol and blocked my vote. That kind of move doesn't go unanswered.`;
  }
  if(recentSave){
    const saviour = G.cast.find(c=>c.id===recentSave.object);
    if(saviour) return `${saviour.name.split(' ')[0]} could have written my name down and didn't. That means something to me. I owe them.`;
  }
  return null;
}

/**
 * getMemorySummary(playerA, playerB)
 * Returns a short prose description of the relationship history between two players.
 * Used in interaction text and script generation.
 */
function getMemorySummary(playerA, playerB){
  const score = memoryScore(playerA.id, playerB.id);
  const betrayals = getMemories(playerA.id, playerB.id, ['betrayal']).length;
  const saves = getMemories(playerA.id, playerB.id, ['saved']).length;
  const an = playerA.name.split(' ')[0];
  const bn = playerB.name.split(' ')[0];

  if(betrayals>=2) return `${an} has been burned by ${bn} more than once. The history between them runs cold.`;
  if(betrayals===1) return `${bn} voted against ${an} once before. ${an} hasn't forgotten.`;
  if(saves>=1) return `${bn} spared ${an} when they didn't have to. That debt still stands.`;
  if(score>60) return `${an} and ${bn} have built real trust across this season.`;
  if(score<-40) return `The tension between ${an} and ${bn} has been building for weeks.`;
  return null;
}

// ===== EXPORTS =====


// ===== FILE: evolution.js =====
// No Signal — evolution.js
// Dynamic archetype evolution system
// Archetypes shift mid-season based on actual gameplay events.
// Triggered at the start of each episode after ep 3.

// ===== EVOLUTION RULES =====
// Each rule: { from, to, condition(c, memories), minEpisode, message }
// condition receives the contestant object and their memory array
// Returns true if the evolution should trigger

const EVOLUTION_RULES = [
  // Challenge wins → threat recognition
  {
    from: 'The Underdog',
    to: 'The Challenge Beast',
    condition: (c) => c.challengeWins >= 3,
    minEpisode: 3,
    message: '{name} has stopped being the underdog — three challenge wins demands a new label.',
  },
  {
    from: 'The Underdog',
    to: 'The Fan Favorite',
    condition: (c, mems) => {
      const saves = mems.filter(m => m.type === 'saved' && m.object !== c.id).length;
      return c.social >= 7 && saves >= 1;
    },
    minEpisode: 4,
    message: '{name} has survived against the odds so many times the whole cast has started quietly rooting for them.',
  },
  {
    from: 'The Floater',
    to: 'The Puppet Master',
    condition: (c, mems) => {
      const betrayals = mems.filter(m => m.type === 'betrayal' && m.subject === c.id).length;
      return betrayals >= 2 && c.mental >= 7;
    },
    minEpisode: 4,
    message: '{name} has been labelled a Floater — but two alliances broken strategically tells a different story.',
  },
  {
    from: 'The Floater',
    to: 'The Goat',
    condition: (c) => c.challengeWins === 0 && G.episode >= 7,
    minEpisode: 7,
    message: '{name} has drifted through this game without leaving a mark. People are keeping them around for a reason.',
  },
  {
    from: 'The Strategist',
    to: 'The Big Villain',
    condition: (c, mems) => {
      const betrayals = mems.filter(m => m.type === 'betrayal' && m.subject !== c.id && m.object === c.id).length;
      // They've been caught betraying people
      const caughtBetrayals = mems.filter(m => m.type === 'betrayal' && m.object === c.id).length;
      return caughtBetrayals >= 2;
    },
    minEpisode: 4,
    message: '{name} started as a strategist — but the number of burned allies tells a different story.',
  },
  {
    from: 'The Social Butterfly',
    to: 'The Puppet Master',
    condition: (c, mems) => {
      const alliancesFormed = mems.filter(m => m.type === 'alliance_formed' && m.subject === c.id).length;
      return alliancesFormed >= 3 && c.social >= 8;
    },
    minEpisode: 5,
    message: '{name} isn\'t just social — they\'re running three separate alliances simultaneously.',
  },
  {
    from: 'The Challenge Beast',
    to: 'The Jury Threat',
    condition: (c) => c.challengeWins >= 4 && G.merged,
    minEpisode: 6,
    message: '{name}\'s challenge record post-merge has made them the most obvious jury threat in the game.',
  },
  {
    from: 'The Sweetheart',
    to: 'The Jury Threat',
    condition: (c, mems) => {
      const saves = mems.filter(m => m.type === 'saved' && m.object === c.id).length;
      return c.social >= 8 && saves >= 2 && G.merged;
    },
    minEpisode: 6,
    message: '{name} has been saved by other players twice. That kind of goodwill wins jury votes.',
  },
  {
    from: 'The Quiet Threat',
    to: 'The Strategist',
    condition: (c) => G.merged && c.mental >= 8 && c.challengeWins >= 1,
    minEpisode: 5,
    message: '{name} can\'t stay quiet forever. Post-merge they\'ve stepped into the light.',
  },
  {
    from: 'The Loose Cannon',
    to: 'The Flipper',
    condition: (c, mems) => {
      const broken = mems.filter(m => m.type === 'alliance_broken' && m.subject === c.id).length;
      return broken >= 2;
    },
    minEpisode: 3,
    message: '{name}\'s chaos has a pattern now. They don\'t blow things up randomly — they flip deliberately.',
  },
  {
    from: 'The Number',
    to: 'The Underdog',
    condition: (c, mems) => {
      const votesAgainst = mems.filter(m => m.type === 'voted_for' && m.object === c.id).length;
      return votesAgainst >= 3 && !c.eliminated;
    },
    minEpisode: 4,
    message: '{name} has had their name written down three times and is still here. That\'s not a Number anymore.',
  },
];

// ===== EVOLUTION ENGINE =====

/**
 * checkArchetypeEvolution()
 * Called at the start of each episode (ep >= 3).
 * Checks all active players against evolution rules.
 * Returns array of evolution events that occurred.
 * Mutates contestant.archetype if rule triggers.
 */
function checkArchetypeEvolution() {
  if(!G.memories) return [];
  const events = [];
  const active = getActive();

  active.forEach(c => {
    const memories = G.memories.filter(m => m.subject === c.id || m.object === c.id);
    for(const rule of EVOLUTION_RULES) {
      if(c.archetype !== rule.from) continue;
      if(G.episode < rule.minEpisode) continue;
      if(!rule.condition(c, memories)) continue;
      // Evolution triggers — don't evolve same player twice in same episode
      if(events.find(e => e.playerId === c.id)) continue;

      const oldArchetype = c.archetype;
      c.archetype = rule.to;
      // Store evolution history on the contestant
      if(!c.archetypeHistory) c.archetypeHistory = [];
      c.archetypeHistory.push({ from: oldArchetype, to: rule.to, episode: G.episode });

      const msg = rule.message.replace('{name}', c.name.split(' ')[0]);
      events.push({ player: c, from: oldArchetype, to: rule.to, message: msg });

      // Record as a memory event — others notice the change
      recordMemory('rivalry', c.id, null, G.episode, 30); // self-awareness spike
      break; // only one evolution per player per episode
    }
  });

  return events;
}

/**
 * buildEvolutionDisplay(events)
 * Returns HTML for the camp life stage showing evolution events.
 */
function buildEvolutionDisplay(events) {
  if(!events || !events.length) return '';
  return events.map(ev => {
    const port = ev.player.customImage
      ? `<img src="${ev.player.customImage}" style="width:36px;height:44px;object-fit:cover;object-position:top;border-radius:6px">`
      : getPortrait(ev.player).replace('width="120" height="145"','width="36" height="44"');
    return `<div class="evolution-card">
      <div class="evolution-port">${port}<\/div>
      <div class="evolution-body">
        <div class="evolution-label">
          <span class="evolution-old">${ev.from}<\/span>
          <span class="evolution-arrow">→<\/span>
          <span class="evolution-new">${ev.to}<\/span>
        <\/div>
        <div class="evolution-msg">${ev.message}<\/div>
      <\/div>
    <\/div>`;
  }).join('');
}



// ===== EVOLUTION CEREMONY =====
/**
 * buildEvolutionCeremony(events, ep)
 * Generates confessional text and camp reactions for archetype evolutions.
 * Called after checkArchetypeEvolution() when events exist.
 * Returns array of {player, confessional, campReaction} objects.
 */
function buildEvolutionCeremony(events, ep){
  return events.map(ev=>{
    const fn=ev.player.name.split(' ')[0];
    const confessional=_evoConfessional(ev);
    const campReaction=_evoCampReaction(ev, ep);
    // Store on ep so script generator can use them
    return { player:ev.player, from:ev.from, to:ev.to,
             confessional, campReaction, message:ev.message };
  });
}

function _evoConfessional(ev){
  const fn=ev.player.name.split(' ')[0];
  const lines={
    // Underdog evolutions
    'The Underdog→The Challenge Beast': `Three challenge wins. Three. I came out here labelled as someone who didn't belong. I don't think anyone's calling me an underdog anymore.`,
    'The Underdog→The Fan Favorite': `I keep surviving when I shouldn't. I'm starting to wonder if that's not luck — if maybe I've been playing this game better than I thought.`,
    // Floater evolutions
    'The Floater→The Puppet Master': `People think I've been drifting. I haven't been drifting. I've been watching. There's a difference. A very important difference.`,
    'The Floater→The Goat': `I'm still here. I genuinely don't know if that's a good thing or a bad thing.`,
    // Strategist evolutions
    'The Strategist→The Big Villain': `I've made some moves that weren't popular. That's the cost of playing to win. I can live with it.`,
    // Social butterfly evolutions
    'The Social Butterfly→The Puppet Master': `I have four separate conversations before breakfast every morning. And none of them know about the other three. That's not social — that's strategy.`,
    // Challenge beast evolution
    'The Challenge Beast→The Jury Threat': `I know what they're thinking. I'd be thinking the same thing. Four wins. I'm the biggest threat in this game. So now I have to be smarter than I am strong.`,
    // Sweetheart evolution
    'The Sweetheart→The Jury Threat': `People keep saving me. I used to think that was kindness. Now I think it's a strategy and I'm terrified they're right to do it.`,
    // Quiet threat evolution
    'The Quiet Threat→The Strategist': `Post-merge. No more hiding. Time to actually play.`,
    // Loose cannon evolution
    'The Loose Cannon→The Flipper': `I know what everyone says about me. That I'm unpredictable. That I can't be trusted. They're wrong. I'm completely predictable. I just have different priorities.`,
  };
  const key=`${ev.from}→${ev.to}`;
  return lines[key]||`${fn}: ${ev.message}`;
}

function _evoCampReaction(ev, ep){
  const fn=ev.player.name.split(' ')[0];
  // Find another active player who might have noticed
  const active=G.cast.filter(c=>!c.eliminated&&c.id!==ev.player.id);
  if(!active.length) return null;
  const observer=pick(active);
  const on=observer.name.split(' ')[0];

  const negativeEvolutions=['The Big Villain','The Goat','The Jury Threat'];
  const positiveEvolutions=['The Fan Favorite','The Challenge Beast','The Puppet Master'];

  if(negativeEvolutions.includes(ev.to)){
    const reactions=[
      `${on} noticed the shift in ${fn}'s demeanour. Something had changed. They filed it away quietly.`,
      `Around camp, people were starting to talk about ${fn} differently. ${on} heard it and said nothing.`,
      `${on} pulled someone aside after ${fn} left camp. "Has ${fn} seemed different to you lately?" They had.`,
    ];
    return pick(reactions);
  }
  if(positiveEvolutions.includes(ev.to)){
    const reactions=[
      `${on} watched ${fn} from across camp and felt something uncomfortable — was ${fn} actually going to win this?`,
      `The tribe's perception of ${fn} was shifting. ${on} felt it and wasn't sure if that was good or bad for their own game.`,
      `"${fn} is not who I thought ${fn} was," ${on} admitted to themselves. They'd need to recalibrate.`,
    ];
    return pick(reactions);
  }
  return `The tribe watched ${fn} closely tonight. Something was different and everyone could feel it.`;
}


/**
 * getArchetypeHistory(contestant)
 * Returns a formatted string of the contestant's evolution history.
 * Used in Player Profiles.
 */
function getArchetypeHistory(contestant) {
  if(!contestant.archetypeHistory || !contestant.archetypeHistory.length) return null;
  return contestant.archetypeHistory
    .map(h => `Ep ${h.episode}: ${h.from} → ${h.to}`)
    .join(' · ');
}

// ===== EXPORTS =====


// ===== FILE: producer.js =====
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


// ===== FILE: story.js =====
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


// ===== FILE: engine.js =====
// No Signal — engine.js
// Episode engine, voting, challenges, alliances, idols
// No DOM manipulation here.

// ===== EPISODE ENGINE =====
function getActive(){return G.cast.filter(c=>!c.eliminated);}
function getTeamMembers(ti){return getActive().filter(c=>c.team===ti);}
/**
 * rollChallenge — scores players for a challenge of a given stat type
 *
 * Score formula: stat*(1-randomness) + random(1-10)*randomness + jitter(-2,+2)
 * randomness=0  → pure stat, strongest always wins
 * randomness=1  → pure luck, anyone can win
 * Default is 0.35 — skill-leaning but upsets are possible
 */
function rollChallenge(players,type){
  const rand=G.settings.randomness/100;
  return players.map(p=>{
    // Producer challenge boost — this player performs at max stats, no randomness
    if(G._challengeBoostId && p.id===G._challengeBoostId){
      G._challengeBoostId=null; // consume the boost
      return {...p, score:p[type]+10, boosted:true};
    }
    return {...p, score:Math.round(p[type]*(1-rand)+rng(1,10)*rand+rng(-2,2))};
  }).sort((a,b)=>b.score-a.score);
}
// Voting reasons — used by the script generator for flavour
const VOTE_REASONS={
  alliance:'voted with their alliance',
  challenge_threat:'saw them as a challenge threat',
  social_threat:'saw them as too well-liked',
  jury_threat:'worried they would win the jury vote',
  physical_threat:'saw them as a physical threat',
  weak_link:'saw them as the weakest link in challenges',
  strategic:'made a strategic move against them',
  personal:'had a personal conflict with them',
  chaos:'made a chaotic flip vote',
};

function getVoterAllies(voter){
  if(!G.settings.alliances||!voter.allianceIds.length) return [];
  return voter.allianceIds.flatMap(aid=>{
    const al=G.alliances.find(a=>a.id===aid);
    return al?al.members.filter(mid=>mid!==voter.id):[];
  });
}

/**
 * targetScore — scores how much voter wants to vote out target
 *
 * Returns a number; higher = voter is more likely to target this person.
 * Components (cumulative):
 *   -999  ally penalty      — almost never vote an ally
 *   +0-9  bloc pressure     — allies converging on same target pulls voter along
 *   +4-8  challenge threat  — win streaks or high combined stats
 *   +3-4  social/jury threat — high social stat or jury-magnet archetype
 *   +3    weak link         — low physical pre-merge (tribal liability)
 *   +2    personal grudge   — Hothead/Villain personality, random
 *   +0-5  chaos             — high drama level, random noise
 *   +0-1.5 base noise       — ensures no two candidates score identically
 */
function targetScore(voter,target,allies,allianceStr,pool){
  let score=0;
  const isAlly=allies.includes(target.id);
  const poolSize=pool.length;

  // Heavy alliance penalty — allies almost never vote each other
  if(isAlly) return -999;

  // 1. Alliance bloc pressure: if allies are all targeting same person, voter follows
  const allyTargets=allies.flatMap(aid=>{
    // Check if this ally is in a "consensus" — look at who their enemies are
    const allyPlayer=pool.find(p=>p.id===aid); if(!allyPlayer) return [];
    const allyAllies=getVoterAllies(allyPlayer);
    return pool.filter(p=>!allyAllies.includes(p.id)&&p.id!==allyPlayer.id).map(p=>p.id);
  });
  const allyVoteCounts={};
  allyTargets.forEach(id=>allyVoteCounts[id]=(allyVoteCounts[id]||0)+1);
  score+=(allyVoteCounts[target.id]||0)*3; // strong bloc pull

  // 2. Challenge threat: high combined stats = threat
  const statSum=target.physical+target.mental+target.endurance;
  if(G.settings.streaks&&target.challengeWins>=2) score+=8;
  else if(statSum>=24) score+=4;

  // 3. Social / jury threat: high social + archetype
  if(target.social>=8) score+=3;
  const juryThreatArchetypes=['The Fan Favorite','The Sweetheart','The Underdog','The Social Butterfly'];
  if(juryThreatArchetypes.some(a=>target.archetype===a)) score+=4;

  // 4. Weak link (pre-merge only): low physical = drag on tribe
  if(!G.merged&&target.physical<=4) score+=3;

  // 5. Personal conflict: hothead or villain voters may have grudges
  if((voter.personality==='Hothead'||voter.personality==='Villain')&&Math.random()<0.3) score+=2;

  // 6. Memory bonus — past betrayals/saves modify targeting (see memory.js)
  if(G.memories&&G.memories.length) score+=memoryTargetBonus(voter,target);

  // 6. Drama-fuelled chaos: unpredictable flips at high drama
  if(G.settings.drama&&G.dramaLevel>=4&&Math.random()<0.2) score+=rng(0,5);

  // 7. Small noise so we never get identical scores
  score+=Math.random()*1.5;

  return score;
}

function pickVoteReason(voter,target,allies){
  if(allies.length&&!allies.includes(target.id)) return 'alliance';
  if(G.settings.streaks&&target.challengeWins>=2) return 'challenge_threat';
  if(target.social>=8) return 'social_threat';
  if(target.physical>=8&&!G.merged) return 'physical_threat';
  if(['The Fan Favorite','The Sweetheart','The Underdog'].includes(target.archetype)) return 'jury_threat';
  if(target.physical<=4&&!G.merged) return 'weak_link';
  if(voter.personality==='Hothead'||voter.personality==='Villain') return 'personal';
  if(G.dramaLevel>=4) return 'chaos';
  return 'strategic';
}

/**
 * runVote — core tribal council vote simulation
 *
 * pool:   all players who can vote (losing tribe pre-merge, everyone post-merge)
 * immune: player who cannot be voted for (individual immunity winner)
 *
 * Each voter scores every candidate via targetScore(), then a loyalty roll
 * determines whether they follow strategic consensus or deviate:
 *   loyaltyRoll < allianceStr*0.7+0.25  → vote top-scored target (strategic)
 *   loyaltyRoll < 0.85                  → pick randomly from top 3 (noise)
 *   otherwise                           → pure chaos flip
 *
 * The formula allianceStr*0.7+0.25 means:
 *   allianceStr=0   → 25% strategic  (chaotic game)
 *   allianceStr=0.5 → 60% strategic  (balanced)
 *   allianceStr=1.0 → 95% strategic  (alliance-locked)
 */
function runVote(pool,immune=null){
  const eligible=pool.filter(p=>!immune||p.id!==immune.id);
  if(!eligible.length) return{eliminated:pool[0],tally:{},individualVotes:[],tied:false,tiebreakerApplied:''};
  const tally={};eligible.forEach(p=>tally[p.id]=0);
  const individualVotes=[],allianceStr=G.settings.allianceStr/100; // normalised 0–1

  pool.forEach(voter=>{
    const allies=getVoterAllies(voter);
    const candidates=eligible.filter(p=>p.id!==voter.id);
    // Every voter MUST cast a vote — guarantee with fallback
    if(!candidates.length){
      // Voter has no one to vote for (only target is themselves) — skip
      return;
    }

    // Score each candidate
    const scored=candidates
      .map(p=>({p,s:targetScore(voter,p,allies,allianceStr,pool)}))
      .sort((a,b)=>b.s-a.s);

    let target=null;
    const loyaltyRoll=Math.random();
    // allianceStr is already 0-1; use directly
    // High loyalty = vote top-scored almost always; low = more randomness
    if(loyaltyRoll<allianceStr*0.7+0.25){
      target=scored[0].p; // strategic consensus
    } else if(scored.length>=2&&loyaltyRoll<0.85){
      target=scored[rng(0,Math.min(2,scored.length-1))].p; // top-3 noise
    } else {
      target=pick(candidates); // chaos flip
    }
    // Final safety net — should never be null at this point but guard anyway
    if(!target) target=pick(candidates);

    const reason=pickVoteReason(voter,target,allies);
    tally[target.id]=(tally[target.id]||0)+1;
    individualVotes.push({voter,target,reason});

    // Extra-vote advantage: cast a second vote against a different target
    if(G.extraVoteHolders.includes(voter.id)){
      const extraCandidates=candidates.filter(p=>p.id!==target.id);
      if(extraCandidates.length){
        const extraScored=extraCandidates.map(p=>({p,s:targetScore(voter,p,allies,allianceStr,pool)})).sort((a,b)=>b.s-a.s);
        const et=extraScored[0].p;
        tally[et.id]++;
        individualVotes.push({voter,target:et,reason:'alliance',extra:true});
      }
    }
  });

  // Safety: if somehow tally is empty (all voters had no candidates), pick random
  const tallyKeys=Object.keys(tally).filter(id=>tally[id]>0);
  if(!tallyKeys.length){
    const fallback=pick(eligible);
    return{eliminated:fallback,tally:{[fallback.id]:1},individualVotes:[],tied:false,tiebreakerApplied:''};
  }

  const sorted=eligible.slice().sort((a,b)=>(tally[b.id]||0)-(tally[a.id]||0));
  const topVotes=tally[sorted[0].id]||0;
  const tied=sorted.filter(p=>(tally[p.id]||0)===topVotes);
  let eliminated=sorted[0],tiebreakerApplied='';
  if(tied.length>1){const tb=resolveTie(tied,pool,immune,topVotes);eliminated=tb.eliminated;tiebreakerApplied=tb.method;}
  return{eliminated,tally,individualVotes,tied:tied.length>1,tiebreakerApplied};
}
function resolveTie(tiedPlayers,pool,immune,tieVotes){
  const rule=G.settings.tiebreak||'revote';
  if(rule==='rocks') return{eliminated:pick(tiedPlayers),method:`Tie at ${tieVotes} votes — purple rocks drawn! Fate decided.`};
  if(rule==='fire'){const winner=tiedPlayers.slice().sort((a,b)=>(b.physical+b.endurance)-(a.physical+a.endurance))[0];const loser=tiedPlayers.find(p=>p.id!==winner.id);return{eliminated:loser||tiedPlayers[1],method:`Tie at ${tieVotes} votes — fire-making challenge! ${winner.name} survived.`};}
  const revoteVoters=pool.filter(p=>!tiedPlayers.find(t=>t.id===p.id)&&(!immune||p.id!==immune.id));
  if(!revoteVoters.length) return{eliminated:pick(tiedPlayers),method:`Tie at ${tieVotes} — revote deadlocked, random draw.`};
  const rt={};tiedPlayers.forEach(p=>rt[p.id]=0);revoteVoters.forEach(v=>{const t=pick(tiedPlayers);rt[t.id]++;});
  const rs=tiedPlayers.slice().sort((a,b)=>(rt[b.id]||0)-(rt[a.id]||0));
  const topR=rt[rs[0].id]||0;const stillTied=rs.filter(p=>(rt[p.id]||0)===topR);
  const elim=stillTied.length>1?pick(stillTied):rs[0];
  return{eliminated:elim,method:`Tie at ${tieVotes} — revote! ${elim.name} received the most revotes.`};
}
function resolveChallengerTie(tiedTeams){
  const tb=tiedTeams.map(t=>({...t,tbScore:rng(1,20)})).sort((a,b)=>b.tbScore-a.tbScore);
  return{winner:tb[0],loser:tb[tb.length-1],tied:true,tiebreaker:`Challenge tied — sudden death tiebreaker!`};
}
function idolFindChance(){return{easy:0.20,medium:0.12,hard:0.06,rare:0.03}[G.settings.idolDiff]||0.12;}
function maybeGiveIdol(){
  if(!G.settings.idols||Math.random()>idolFindChance()) return null;
  const pool=getActive().filter(c=>!G.idolHolders.includes(c.id)); if(!pool.length) return null;
  const finder=pick(pool); G.idolHolders.push(finder.id); return finder;
}
/**
 * checkIdolPlay — determines if the eliminated player plays their idol
 *
 * Called AFTER votes are tallied but BEFORE elimination is confirmed.
 * If the player holds an idol:
 *   - Idols expire at final 6 (standard Survivor rule)
 *   - 65% chance they choose to play it (not all idols get played)
 *   - If played, all votes against them are nullified
 *   - The next-highest vote-getter in the original tally goes home instead
 *     (handled in runChallengeWithChoice by scanning the original tally)
 */
function checkIdolPlay(eliminated,pool){
  if(!G.idolHolders.includes(eliminated.id)) return null;
  // Idols cannot be played after final 6 — standard game rule
  if(getActive().length<=6){ notify(`${eliminated.name} holds an idol but it\'s now expired — too late to play!`); G.idolHolders=G.idolHolders.filter(id=>id!==eliminated.id); return null; }
  if(Math.random()>0.65) return null;
  G.idolHolders=G.idolHolders.filter(id=>id!==eliminated.id); eliminated.idolPlayed=true;
  const newPool=pool.filter(p=>p.id!==eliminated.id&&!p.immunity&&!p.eliminated);
  if(!newPool.length) return null;
  return{idolPlayer:eliminated,newElim:pick(newPool)};
}
function getTwist(){
  if(Math.random()*100>G.settings.twistFreq) return null;
  const avail=TWISTS_DATA.filter(t=>G.twists.has(t.id)); if(!avail.length) return null;
  return pick(avail);
}
function pickInteraction(a,b,ep){
  // Use context-aware builder when we have ep data
  if(ep) return buildInteractionText(a,b,ep);
  // Legacy fallback
  let pool=[...INTERACTION_TEMPLATES_NEUTRAL];
  if(G.idolHolders.includes(a.id)||G.idolHolders.includes(b.id)) pool=[...pool,...INTERACTION_TEMPLATES_IDOL];
  if(G.extraVoteHolders.includes(a.id)||G.stealVoteHolders.includes(a.id)||G.extraVoteHolders.includes(b.id)||G.stealVoteHolders.includes(b.id)) pool=[...pool,...INTERACTION_TEMPLATES_ADVANTAGE];
  return pick(pool)(a.name.split(' ')[0],b.name.split(' ')[0]);
}

// ===== COMPUTE EPISODE =====
function computeAndStartEpisode(){
  const ep=G.episode, active=getActive();
  if(active.length<=G.settings.finaleSize){runFinale();return;}

  // Decision points — named pause points where play mode would hand control to the player.
  // Simulate mode auto-resolves all of these. Play mode reads this array to know
  // when to interrupt the episode flow and show the player a choice.
  // Populated as the episode progresses — do not pre-fill.
  if(!G.currentEpData) G.currentEpData={};
  G.currentEpData.decisionPoints = [
    // { stage:'social',    resolved:false, options:[] },  // pre-challenge conversations
    // { stage:'challenge', resolved:false, options:[] },  // compete/throw/risk decision
    // { stage:'alliance',  resolved:false, options:[] },  // pre-tribal alliance check
    // { stage:'vote',      resolved:false, options:[] },  // cast your vote
  ];
  // In simulate mode these are never populated — the engine resolves everything automatically.
  // In play mode the episode flow will pause at each stage and fill in options[].

  // Check for archetype evolutions before the episode begins
  // Only from ep 3 onward — too early before that
  let evolutionEvents=[];
  if(ep>=3 && typeof checkArchetypeEvolution==='function'){
    evolutionEvents=checkArchetypeEvolution();
  }
  // Build ceremony content (confessionals + camp reactions) for each evolution
  if(evolutionEvents.length && typeof buildEvolutionCeremony==='function'){
    evolutionEvents=buildEvolutionCeremony(evolutionEvents, {ep});
  }
  G._pendingEvolutions=evolutionEvents;

  // ── REJOIN EPISODE ────────────────────────────────────────
  // If this is the designated rejoin episode, run a dedicated rejoin episode (no elim)
  if(G.settings.returnees && G.settings.rejoinEpisode && ep===G.settings.rejoinEpisode){
    const eliminated=G.cast.filter(c=>c.eliminated&&!c.juryReturn);
    const returning=shuffle(eliminated).slice(0,G.settings.rejoinCount||1);
    returning.forEach(r=>{
      r.eliminated=false; r.juryMember=false; r.votes=0; r.immunity=false; r.juryReturn=true;
      if(G.merged){ r.team=-1; }
      else {
        const sizes=G.teams.map((_,ti)=>({ti,count:getTeamMembers(ti).length})).sort((a,b)=>a.count-b.count);
        r.team=sizes[0].ti;
      }
    });
    const rejoinNames=returning.map(r=>r.name).join(' & ');
    G.currentEpData={
      ep, twist:null, twistMsg:'', dramaMsg:'', idolFinder:null,
      interactions:[], confessionals:[], mergeHappened:false,
      challengeOptions:[], challengeResult:null, voteResult:null,
      eliminated:null, eliminated2:null, idolPlay:null,
      doubleElim:false, noElim:true,
      isRejoinEpisode:true, rejoinPlayers:returning, rejoinNames,
    };
    G.stageIndex=0; updateGameSidebar(); renderStage(0); // renderStage handles episodeLog push for rejoin
    return;
  }

  let doubleElim=false,noElim=false,mergeHappened=false;
  // Twists: block team swap post-merge
  const rawTwist=getTwist();
  const twist=(rawTwist&&rawTwist.id==='swap'&&G.merged)?null:rawTwist;
  let twistMsg='';
  if(twist){twistMsg=applyTwist(twist);if(twist.id==='double')doubleElim=true;if(twist.id==='noelim')noElim=true;}

  let dramaMsg='',idolFinder=null;
  if(G.settings.drama&&Math.random()<(G.settings.dramaRate==='fast'?0.5:G.settings.dramaRate==='slow'?0.15:0.3)){dramaMsg=buildDramaText({ep:G.episode});G.dramaLevel=Math.min(G.dramaLevel+1,5);}
  // Idols blocked after final 6
  if(active.length>6) idolFinder=maybeGiveIdol();

  // Interactions: pre-merge = within same team only; post-merge = anyone
  const interactions=[];
  if(G.settings.interactions&&active.length>=2){
    let pool;
    if(!G.merged){
      // Find the largest team for intra-team interaction
      const byTeam=G.teams.map((_,ti)=>getTeamMembers(ti));
      const biggest=byTeam.sort((a,b)=>b.length-a.length)[0];
      pool=biggest&&biggest.length>=2?biggest:active;
    } else { pool=active; }
    if(pool.length>=2){
      const pair=shuffle(pool).slice(0,2);
      interactions.push({a:pair[0],b:pair[1],text:pickInteraction(pair[0],pair[1],null)});// ep not yet built — context added in script generator
    }
    // Sometimes a cross-team interaction in pre-merge too (30% chance — like at challenges)
    if(!G.merged&&active.length>=4&&Math.random()<0.3){
      const teams=G.teams.map((_,ti)=>getTeamMembers(ti)).filter(t=>t.length>0);
      if(teams.length>=2){
        const a=pick(teams[0]),b=pick(teams[1]);
        if(a&&b) interactions.push({a,b,text:pickInteraction(a,b,null),crossTeam:true});
      }
    }
  }

  const confessionals=[];
  if(G.settings.confessionals&&active.length){
    const n=rng(1,Math.min(3,active.length));
    shuffle(active).slice(0,n).forEach(p=>{
      confessionals.push({who:p,text:'__PENDING__'});// filled in after vote resolves
    });
  }
  if(!G.merged&&ep>=G.settings.mergeEpisode){G.merged=true;mergeHappened=true;G.dramaLevel=Math.max(0,G.dramaLevel-2);}
  if(!dramaMsg&&ep%3===0) G.dramaLevel=Math.max(0,G.dramaLevel-1);

  const challengeOptions=shuffle([...CHALLENGE_DATA]).slice(0,3);

  G.currentEpData={
    ep,twist,twistMsg,dramaMsg,idolFinder,interactions,confessionals,mergeHappened,
    challengeOptions,challengeResult:null,voteResult:null,eliminated:null,eliminated2:null,
    idolPlay:null,doubleElim,noElim,revealed:{},
  };
  G.stageIndex=0;
  updateGameSidebar();
  renderStage(0);
}

function runChallengeWithChoice(chosenChallenge){
  const ep=G.currentEpData;
  const challengeName=chosenChallenge.name, challengeType=chosenChallenge.type;
  let challengeResult=null,winTeam=null,loseTeam=null,immuneWinner=null,challengeTieMsg='';
  let teamScores=null; // hoisted so double-elim block can reference it

  if(G.merged){
    const scores=rollChallenge(getActive(),challengeType);
    if(scores.length>=2&&scores[0].score===scores[1].score){
      const topScore=scores[0].score,topTied=scores.filter(s=>s.score===topScore),tbWinner=shuffle(topTied)[0];
      challengeTieMsg=`Challenge tied at ${topScore}! Sudden-death — ${tbWinner.name} prevailed!`;
      scores.splice(0,topTied.length,...[tbWinner,...topTied.filter(s=>s.id!==tbWinner.id)]);
    }
    immuneWinner=G.cast.find(c=>c.id===scores[0].id);
    if(immuneWinner){immuneWinner.immunity=true;immuneWinner.challengeWins++;}
    if(G.settings.streaks&&immuneWinner) G.challengeWinStreaks[immuneWinner.id]=(G.challengeWinStreaks[immuneWinner.id]||0)+1;
    challengeResult={type:'individual',name:challengeName,icon:chosenChallenge.icon,flavor:chosenChallenge.flavor,stat:challengeType,scores,winner:immuneWinner,tieMsg:challengeTieMsg};
  } else {
    // Compute active members per team
    let teamRosters=G.teams.map((t,ti)=>{
      return{team:t,ti,members:getTeamMembers(ti),allMembers:getTeamMembers(ti)};
    }).filter(t=>t.members.length>0);
    // Sit-out equalisation rule: find the smallest active tribe size, then bench
    // the strongest players (by challenge stat) from larger tribes until sizes match.
    // IMPORTANT: allMembers preserves the full tribe roster for voting.
    // Only `members` (the reduced set) is used for challenge score calculation.
    // A 7-person tribe losing to a 5-person tribe still sends all 7 to vote.
    const minSize=Math.min(...teamRosters.map(t=>t.members.length));
    const sitOuts=[];
    teamRosters=teamRosters.map(t=>{
      if(t.members.length>minSize){
        const sorted=[...t.members].sort((a,b)=>(b[challengeType]||0)-(a[challengeType]||0));
        const sitting=sorted.slice(0,t.members.length-minSize);
        sitting.forEach(s=>sitOuts.push({player:s,team:t.team}));
        // members = only those competing; allMembers = full tribe for voting
        return{...t,members:sorted.slice(t.members.length-minSize),sitOuts:sitting};
      }
      return{...t,sitOuts:[]};
    });
    teamScores=teamRosters.map(t=>({
      ...t,totalScore:t.members.reduce((s,m)=>s+m[challengeType],0)+rng(-5,5)
    })).sort((a,b)=>b.totalScore-a.totalScore);
    ep.sitOuts=sitOuts;
    if(teamScores.length>=2&&teamScores[0].totalScore===teamScores[teamScores.length-1].totalScore){
      const tb=resolveChallengerTie([teamScores[0],teamScores[teamScores.length-1]]);
      winTeam=tb.winner;loseTeam=tb.loser;challengeTieMsg=tb.tiebreaker;
    } else {winTeam=teamScores[0];loseTeam=teamScores[teamScores.length-1];}
    challengeResult={type:'tribal',name:challengeName,icon:chosenChallenge.icon,flavor:chosenChallenge.flavor,stat:challengeType,scores:teamScores,winner:winTeam,loser:loseTeam,tieMsg:challengeTieMsg};
  }
  ep.challengeResult=challengeResult;

  let voteResult=null,eliminated=null,eliminated2=null,idolPlay=null;
  if(!ep.noElim){
    // Vote pool = full tribe roster (allMembers), NOT the sit-out-reduced challenge members
    const votePool=G.merged?getActive():(loseTeam?.allMembers||loseTeam?.members||[]);
    if(votePool.length){
      let vr=runVote(votePool,immuneWinner||null);
      const ic=checkIdolPlay(vr.eliminated,votePool);
      if(ic){
        // Idol nullifies all votes against the holder. The next-highest vote-getter goes home.
        // We keep the original tally for display, but mark the new eliminated.
        idolPlay=ic;
        const sortedByTally=Object.entries(vr.tally)
          .filter(([id])=>id!==ic.idolPlayer.id)
          .sort((a,b)=>b[1]-a[1]);
        if(sortedByTally.length){
          const newElimId=sortedByTally[0][0];
          const newElim=votePool.find(p=>p.id===newElimId)||ic.newElim;
          vr.eliminated=newElim;
          // Update the idol play to show the actual new elim (not the random one)
          ic.newElim=newElim;
        } else {
          vr.eliminated=ic.newElim;
        }
      }
      eliminated=vr.eliminated; voteResult=vr;
    }
    if(ep.doubleElim&&getActive().filter(c=>c.id!==eliminated?.id).length>G.settings.finaleSize){
      // Second vote: if pre-merge, second-worst tribe votes; if merged, remaining active minus first elim
      // The first eliminated is not yet marked .eliminated=true, so we exclude them manually
      let pool2;
      if(G.merged){
        // Post-merge double: everyone except immune winner and first elim votes
        pool2=getActive().filter(p=>
          p.id!==eliminated?.id &&
          (!immuneWinner||p.id!==immuneWinner.id)
        );
      } else {
        // Pre-merge double: second-worst team (or same losing team if only 2 teams)
        const losingTi=loseTeam?.ti??-1;
        const otherLosers=teamScores ? teamScores.filter(t=>t.ti!==losingTi&&t.members.length>0) : [];
        if(otherLosers.length>0){
          // Second-worst team votes
          pool2=otherLosers[otherLosers.length-1].members.filter(p=>p.id!==eliminated?.id);
        } else {
          // Only one team — pick from same losing pool excluding first elim
          pool2=(loseTeam?.members||[]).filter(p=>p.id!==eliminated?.id);
        }
      }
      if(pool2&&pool2.length>0){
        const vr2=runVote(pool2,G.merged?immuneWinner:null);
        eliminated2=vr2.eliminated;
      }
    }
  }
  ep.voteResult=voteResult; ep.eliminated=eliminated; ep.eliminated2=eliminated2; ep.idolPlay=idolPlay;
  // Record memories from this vote — feeds into future voting and jury bias
  recordVoteMemories(voteResult, ep);
  if(idolPlay) recordIdolMemories(idolPlay, ep);
  // Now fill in confessionals with real episode context (vote outcome, eliminated player, etc.)
  ep.confessionals=(ep.confessionals||[]).map(conf=>({
    ...conf,
    text:conf.text==='__PENDING__'?buildConfessionalText(conf.who,ep):conf.text
  }));
  // Update interactions too now that we have the full ep
  ep.interactions=(ep.interactions||[]).map(i=>({
    ...i,
    text:buildInteractionText(i.a,i.b,ep)
  }));
  // Store evolution events on ep for recap export
  ep.evolutionEvents = G._pendingEvolutions||[];

  // Build a compressed narrative summary for AI prompt efficiency
  // Stores ~50 tokens instead of sending raw episode objects to Gemini
  ep.summary = buildEpisodeSummary(ep);

  // Snapshot placement state for the Tribe History tracker
  capturePlacementSnapshot(ep);
  G.episodeLog.push(ep); // always log for script generation
  renderStage(1);
}

/**
 * buildEpisodeSummary(ep)
 * Builds a compressed ~50-token text summary of an episode.
 * Used by buildEpisodePrompt instead of sending raw episode objects.
 * Dramatically reduces token cost on long seasons.
 */
function buildEpisodeSummary(ep){
  const parts=[];
  if(ep.mergeHappened) parts.push('MERGE');
  if(ep.twist&&ep.twistMsg) parts.push(`Twist:${ep.twistMsg.slice(0,40)}`);
  if(ep.idolFinder) parts.push(`${ep.idolFinder.name.split(' ')[0]} found idol`);
  if(ep.idolPlay) parts.push(`${ep.idolPlay.idolPlayer.name.split(' ')[0]} played idol`);
  if(ep.challengeResult){
    const w=ep.challengeResult.type==='individual'
      ?ep.challengeResult.winner?.name?.split(' ')[0]
      :ep.challengeResult.winner?.team?.name;
    if(w) parts.push(`${w} won immunity`);
  }
  if(ep.voteResult?.tally){
    const top=Object.entries(ep.voteResult.tally).sort((a,b)=>b[1]-a[1]).slice(0,2);
    parts.push(`Votes:${top.map(([id,n])=>{const p=G.cast.find(c=>c.id===id);return `${p?.name?.split(' ')[0]||'?'}(${n})`;}).join(',')}`);
  }
  if(ep.eliminated) parts.push(`OUT:${ep.eliminated.name}`);
  if(ep.eliminated2) parts.push(`OUT:${ep.eliminated2.name}`);
  return `Ep${ep.ep} ${parts.join(' | ')}`;
}

// Records each player's status this episode for the Tribe History timeline
function capturePlacementSnapshot(ep){
  const snap={ episode:ep.ep, players:{} };
  const elimIds=new Set();
  if(ep.eliminated) elimIds.add(ep.eliminated.id);
  if(ep.eliminated2) elimIds.add(ep.eliminated2.id);
  const winId = ep.challengeResult
    ? (ep.challengeResult.type==='individual'
        ? ep.challengeResult.winner?.id
        : null)
    : null;
  const winTeamTi = ep.challengeResult&&ep.challengeResult.type==='tribal'
    ? ep.challengeResult.winner?.ti : null;
  const votesReceived={};
  if(ep.voteResult&&ep.voteResult.tally) Object.assign(votesReceived,ep.voteResult.tally);
  G.cast.forEach(c=>{
    let status;
    if(elimIds.has(c.id)) status='eliminated';
    else if(c.eliminated) status='out';            // already gone in a prior episode
    else if(ep.isRejoinEpisode&&ep.rejoinPlayers&&ep.rejoinPlayers.some(r=>r.id===c.id)) status='rejoined';
    else status='safe';
    snap.players[c.id]={
      status,
      team: (!G.merged && c.team!=null && c.team!==-1) ? c.team : null,
      merged: G.merged,
      immune: winId===c.id || (winTeamTi!=null && c.team===winTeamTi) || c.immunity,
      votesGot: votesReceived[c.id]||0,
    };
  });
  G.placementHistory.push(snap);
}

function applyTwist(twist){
  switch(twist.id){
    case 'swap':{shuffle(getActive()).forEach((c,i)=>c.team=i%G.teams.length);return`All tribes reshuffled! Nobody stays with their original tribe.`;}
    case 'double': return`Double Elimination! Two players will be voted out tonight.`;
    case 'noelim': return`No Elimination tonight! The losing tribe lives to fight another day.`;
    case 'idol_clue':{const l=pick(getActive());return l?`${l.name} received a public idol clue. Everyone is watching.`:`An idol clue was hidden at camp.`;}
    case 'returnee':{
      if(!G.settings.returnees)return`A returnee twist was teased — nobody came back.`;
      const e=G.cast.filter(c=>c.eliminated&&!c.juryReturn);
      if(e.length){
        const r=pick(e);
        r.eliminated=false;r.juryMember=false;r.votes=0;r.immunity=false;r.juryReturn=true;
        // Pick smallest non-empty team for balance; if merged, no team
        if(G.merged){r.team=-1;}
        else {
          const sizes=G.teams.map((_,ti)=>({ti,count:getTeamMembers(ti).length})).sort((a,b)=>a.count-b.count);
          r.team=sizes[0].ti;
        }
        return`${r.name} has returned to the game!`;
      }
      return`No eligible returnees.`;
    }
    case 'steal_vote':{const a=getActive();if(a.length>=2){const [x,y]=shuffle(a).slice(0,2);G.stealVoteHolders.push(x.id);return`${x.name} received a vote steal advantage.`;}return`A vote steal entered the game.`;}
    case 'tribe_dissolve':{if(!G.merged&&G.teams.length>2){const sz=G.teams.map((t,ti)=>({ti,count:getTeamMembers(ti).length})).sort((a,b)=>a.count-b.count);const dis=sz[0];getTeamMembers(dis.ti).forEach(c=>{const others=G.teams.map((_,ti)=>ti).filter(ti=>ti!==dis.ti);c.team=pick(others);});return`Tribe ${G.teams[dis.ti].name} dissolved — members absorbed into other tribes.`;}return`A tribe restructuring occurred.`;}
    case 'exile':{const e=pick(getActive());return e?`${e.name} was sent to Exile Island.`:`Exile Island twist.`;}
    case 'challenge_advantage':{const l=pick(getActive());return l?`${l.name} earned a challenge advantage!`:`A challenge advantage was hidden.`;}
    case 'new_alliance':{const a=getActive();if(a.length>=2){const[x,y]=shuffle(a).slice(0,2);const alId=uid();x.allianceIds.push(alId);y.allianceIds.push(alId);G.alliances.push({id:alId,members:[x.id,y.id],name:`Forced: ${x.name.split(' ')[0]}-${y.name.split(' ')[0]}`});return`${x.name} and ${y.name} were forced into a secret alliance.`;}return`Forced alliance twist.`;}
    case 'power_shift':{const top=getActive().sort((a,b)=>b.challengeWins-a.challengeWins)[0];if(top&&top.challengeWins>0){top.immunity=false;return`Power Shift! ${top.name} cannot compete for immunity tonight.`;}return`Power Shift — no effect yet.`;}
    case 'extra_vote':{const l=pick(getActive());if(l){G.extraVoteHolders.push(l.id);return`${l.name} found an extra vote advantage!`;}return`Extra vote hidden.`;}
    default: return`A twist activated.`;
  }
}


// ===== EXPORTS =====


// ===== FILE: script_gen.js =====
// No Signal — script_gen.js
// Episode screenplay generator, Previously On, plain-text export

// ===== EPISODE SCRIPT GENERATOR =====
// Produces a full screenplay (slug lines, host character, stage directions,
// confessionals, act structure, cliffhanger tag) from the real episode data.

// The recurring host — a snarky character who narrates the show
const HOST = { name:'CHIP DELACROIX', short:'Chip' };

// Host one-liners by moment, with {vars}
const HOST_LINES = {
  open: [
    "Welcome back to {show} — where the alliances are fragile and the bug spray ran out in Episode 1.",
    "{show}. Day {day}. The sun is up, the morale is down, and somewhere a torch is about to get very personal.",
    "We are {phase} on {show}, and I'd like to remind everyone that I am contractually the only person here guaranteed to make it home.",
  ],
  toChallenge: [
    "Drop your snacks and your trust issues — it's challenge time.",
    "Everyone to the mat. Yes, the mat. The one I'm aggressively gesturing at.",
    "Time to compete. Try to remember it's a game. They never do.",
  ],
  challengeWinTribal: [
    "{winner} takes it. {loser} — pack your strategy, you're coming to see me tonight.",
    "And that's a win for {winner}. {loser}, I'll get the torches warm.",
  ],
  challengeWinIndiv: [
    "{winner} grabs immunity. Everyone else — start campaigning, the clock is loud tonight.",
    "{winner} is safe. The rest of you? Beautifully, deliciously not.",
  ],
  toTribal: [
    "Grab a torch. In this game, fire represents your life — and also our entire prop budget.",
    "It's time to vote. Be honest. Or don't. Honestly, don't is better television.",
    "The walk to Tribal is short. The silence is not.",
  ],
  snuff: [
    "{name}, the tribe has spoken.",
    "{name}. Bring me your torch. You know how this goes.",
  ],
  tag: [
    "Who's lying? Who's loyal? Who genuinely doesn't know there's a camera? Find out next time — on {show}.",
    "Alliances cracking, idols burning, and {count} still standing. Next time on {show}, it gets worse. I promise.",
    "{count} remain. The game tightens. Somebody's about to do something extremely unwise. See you next time — on {show}.",
  ],
};
function _h(key,vars={}){
  let s=pick(HOST_LINES[key]);
  Object.entries(vars).forEach(([k,v])=>s=s.split(`{${k}}`).join(v));
  return s;
}

// Stage-direction fragments keyed to personality — used to color how a contestant moves/acts
const ACTION_BANK = {
  Strategic:["scanning the room like a chessboard","already counting votes on their fingers","wearing the calm of someone three moves ahead"],
  Loyal:["standing close to their alliance, arms crossed","giving a reassuring nod to a friend across camp","unmistakably steady"],
  Chaotic:["vibrating with an idea they probably shouldn't have","grinning at absolutely nothing","clearly about to do something"],
  Social:["working the camp like a wedding they're hosting","laughing a little too warmly at someone's joke","mid-conversation with everyone at once"],
  Villain:["watching from the edge with a small, private smile","pretending not to listen while listening very hard","radiating calm menace"],
  Hero:["helping someone with the fire without being asked","jaw set, eyes clear","quietly doing the right thing again"],
  Underdog:["overlooked in the back, taking everything in","sharpening a plan nobody knows they have","easy to miss, which is the point"],
  Floater:["drifting between groups, committing to none","nodding along to two opposite plans","strategically vague"],
  Hothead:["jaw tight, one comment away from a scene","pacing","visibly chewing on a grudge"],
  Peacemaker:["physically stepping between two arguments","palms out, voice soft","trying to lower the temperature in the room"],
  Wildcard:["doing something nobody asked about","unreadable, possibly on purpose","grinning like they know the ending"],
  Schemer:["whispering at the treeline","palming information like a card trick","three conversations deep and counting"],
  Jock:["stretching like the challenge is already on","flexing for absolutely no audience","sizing up the competition"],
  Nerd:["doing math nobody requested","quietly noticing everything","filing away a detail for later"],
  Romantic:["sitting a little too close to someone specific","glowing about a connection","heart fully on sleeve"],
  "Comic Relief":["mid-bit to an unamused audience","narrating their own life unprompted","being funnier than the situation allows"],
};
function _act(p){ return pick(ACTION_BANK[p.personality]||ACTION_BANK.Floater); }

// Distinctive dialogue lines per personality
const DIALOGUE_BANK = {
  Strategic:["Every name we write down changes the next three votes. I've already done the math.","Trust is a resource. I'm not spending mine on a feeling.","I don't need to be liked. I need to be in the majority."],
  Loyal:["My alliance knows where I stand. I don't move.","I'd rather lose honest than win as a snake.","My word's the only currency I've got out here. I'm not counterfeiting it."],
  Chaotic:["What if — and hear me out — we blow the entire thing up tonight?","Plans are for people who lose interestingly. I lose CHAOTICALLY.","Honestly I forgot what I was doing halfway through doing it. Still working though."],
  Social:["I've talked to every single person at this camp today. That's not luck, that's the game.","People win this thing, not muscles. And people like me.","If we're all friends, nobody writes my name down. Simple."],
  Villain:["I'll smile at them right up until the vote. Then I'll smile differently.","It's not personal. It's just that they're useful to lose.","They won't see it coming. That's not arrogance. That's preparation."],
  Hero:["I'm playing this with a clear conscience or not at all.","I won't burn someone just to last one more round.","If I go, I go clean. That matters more than the money. Mostly."],
  Underdog:["Everyone counts me out. Good. Keep doing that.","I've got nothing to protect, so I've got everything to swing.","They'll learn my name when it's way, way too late."],
  Floater:["I'm wherever the numbers are. The numbers are my friend.","No need to pick a side while both sides still need me.","Boring keeps me here. I'll be loud when it pays."],
  Hothead:["Say it to my face. I'll wait.","I'm done biting my tongue around this camp.","Push me one more time. See what the edit does."],
  Peacemaker:["Can we just — breathe? One vote isn't worth the whole tribe imploding.","Fighting helps the OTHER team. Think about that.","I'll hold this group together with my bare hands if I have to."],
  Wildcard:["You won't predict my vote. Neither will I, frankly.","Rules. In MY game. Adorable.","I do my best work when something's on fire. Metaphorically. Usually."],
  Schemer:["I've got three plans running and a lie for each of them.","By the time they connect the dots, the dots will have voted them out.","Information is the whole game. And I've got all of it."],
  Jock:["I win the challenges. You need me here. That's the pitch.","Strategy's cute. I'll be over here being an immunity machine.","Keep the strong one. Vote the spreadsheet."],
  Nerd:["I ran the numbers. The optimal vote isn't even close.","People underestimate the quiet ones. Historically, a mistake.","I see the patterns. Nobody else is even looking."],
  Romantic:["I made a real connection out here. That's not weakness, that's a number.","This game is brutal. Having someone to trust isn't.","Loyalty and heart get me to the end. Watch."],
  "Comic Relief":["If I'm going home I'm at least getting a callback out of it.","Morale is a strategy and you're all welcome.","I'm not ONLY here for the jokes. ...I'm mostly here for the jokes."],
};
function _line(p){ return pick(DIALOGUE_BANK[p.personality]||DIALOGUE_BANK.Floater); }

function _slug(text){ return `<div class="script-slug">${text}<\/div>`; }
function _dir(text){ return `<div class="script-stage-direction">${text}<\/div>`; }
function _hostLine(text){ return `<div class="script-line"><div class="script-speaker host-speaker">${HOST.name}<\/div><div class="script-dialogue">${text}<\/div><\/div>`; }
function _charLine(p,text,paren){
  return `<div class="script-line"><div class="script-speaker"><span class="sp-dot" style="background:${p.color}"><\/span>${p.name.toUpperCase()}<\/div>${paren?`<div class="script-paren">(${paren})<\/div>`:''}<div class="script-dialogue">${text}<\/div><\/div>`;
}
function _conf(p,text,paren){
  return `<div class="script-confessional"><div class="sc-name"><span class="sp-dot" style="background:${p.color}"><\/span>${p.name} — Confessional<\/div>${paren?`<div class="sc-paren">${paren}<\/div>`:''}<div class="sc-text">${text}<\/div><\/div>`;
}
function _actHead(n,title){ return `<div class="script-act-head">${n} — ${title}<\/div>`; }

// Pull the real dialogue out of a stored interaction sentence so the script reflects it
function _interactionToScene(a,b,text){
  let h=_slug(`INT. CAMP — DAY`);
  h+=_dir(`<em>${a.name}, ${_act(a)}, falls into conversation with ${b.name}, ${_act(b)}. ${text}<\/em>`);
  h+=_charLine(a,`"${_line(a)}"`);
  h+=_charLine(b,`"${_line(b)}"`,'measuring the moment');
  return h;
}

function generateEpisodeScript(ep){
  const day=ep.ep*3-2;
  const phase=ep.mergeHappened?'merge night':(G.merged?'post-merge':'pre-merge');
  const remaining=G.cast.filter(c=>!c.eliminated).length + (ep.eliminated&&ep.eliminated.eliminated?1:0) + (ep.eliminated2&&ep.eliminated2.eliminated?1:0);
  const livePool=()=>G.cast.filter(c=>!c.eliminated||(c.elimEp&&c.elimEp>=ep.ep));
  let h=`<div class="script-episode-block">`;

  // ===== "PREVIOUSLY ON" RECAP (from the previous logged episode) =====
  if(ep.ep>1){
    const prev=G.episodeLog.find(e=>e.ep===ep.ep-1);
    if(prev){
      const bits=[];
      if(prev.mergeHappened) bits.push(`the tribes merged into one`);
      if(prev.twist&&prev.twistMsg) bits.push(prev.twistMsg.replace(/\.$/,'').toLowerCase());
      if(prev.dramaMsg) bits.push(prev.dramaMsg.replace(/\.$/,'').toLowerCase());
      if(prev.idolFinder) bits.push(`${prev.idolFinder.name.split(' ')[0]} found a hidden immunity idol`);
      if(prev.challengeResult){
        const w=prev.challengeResult.type==='individual'
          ? prev.challengeResult.winner?.name?.split(' ')[0]
          : prev.challengeResult.winner?.team?.name;
        if(w) bits.push(`${w} won immunity`);
      }
      if(prev.idolPlay) bits.push(`${prev.idolPlay.idolPlayer.name.split(' ')[0]} shocked everyone by playing an idol`);
      if(prev.eliminated) bits.push(`and ${prev.eliminated.name.split(' ')[0]} had their torch snuffed`);
      if(prev.eliminated2) bits.push(`${prev.eliminated2.name.split(' ')[0]} was also sent home`);
      // Add memory-derived drama — betrayals that happened last episode
      if(typeof getMemories==='function'&&prev.eliminated){
        const betrayals=getMemories(prev.eliminated.id,null,['betrayal'])
          .filter(m=>m.episode===prev.ep);
        if(betrayals.length){
          const betrayer=G.cast.find(c=>c.id===betrayals[0].object);
          if(betrayer) bits.push(`${betrayer.name.split(' ')[0]}'s vote proved to be a betrayal`);
        }
      }
      if(bits.length){
        const recap=bits.join('; ').replace(/;([^;]*)$/, ' —$1');
        h+=`<div class="script-prev">
          <div class="script-prev-label">Previously on ${(G.settings.name||'No Signal')}…<\/div>
          <div class="script-prev-body">Last time, ${recap}. ${G.cast.filter(c=>!c.eliminated).length} remain. Tonight, the game continues.<\/div>
        <\/div>`;
      }
    }
  }

  // TITLE
  h+=`<div class="script-title-card">
    <div class="stc-show">${(G.settings.name||'NO SIGNAL').toUpperCase()}<\/div>
    <div class="stc-ep">Season 1, Episode ${ep.ep} — "${_episodeTitle(ep)}"<\/div>
    <div class="stc-tag">A reality competition. ${G.cast.length} contestants. ${G.settings.theme||'One island'}. One host who is legally the real threat.<\/div>
  <\/div>`;

  // ===== COLD OPEN =====
  h+=_actHead('COLD OPEN','');
  h+=_slug(`EXT. ${(G.settings.theme||'CAMP').toUpperCase()} — DAY`);
  h+=_dir(`<em>${_h('open',{show:(G.settings.name||'the show'),day,phase})}<\/em>`);
  h+=_hostLine(_h('open',{show:G.settings.name||'the show',day,phase}));
    // Rejoin episode: dedicated display, no further processing needed
  if(ep.isRejoinEpisode&&ep.rejoinPlayers&&ep.rejoinPlayers.length){
    const portraits=ep.rejoinPlayers.map(r=>{
      const p=r.customImage?`<img src="${r.customImage}" style="width:64px;height:77px;object-fit:cover;object-position:top;border-radius:10px">`:getPortrait(r).replace('width="120" height="145"','width="64" height="77"');
      return `<div style="text-align:center"><div style="width:64px;height:77px;border-radius:10px;overflow:hidden;margin:0 auto 6px;border:2px solid #FCD34D">${p}<\/div><div style="font-size:12px;font-weight:600">${r.name}<\/div><div style="font-size:10px;color:var(--text2)">${r.archetype}<\/div><\/div>`;
    }).join('');
    html+=`<div class="merge-banner" style="background:linear-gradient(135deg,#FEF9C3,#FFFBEB);border-color:#FCD34D">
      <div class="merge-title" style="color:#92400E">🔄 They're Back!<\/div>
      <div class="merge-sub" style="color:#78350F">${ep.rejoinNames} ${ep.rejoinPlayers.length>1?'have':'has'} returned to the game. The competition just changed.<\/div>
      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:14px">${portraits}<\/div>
    <\/div>
    <div class="event-card type-merge"><div class="event-card-type">No Vote Tonight<\/div><div class="event-card-body">This episode is dedicated to the dramatic return. No one is voted out tonight — but the game has fundamentally shifted.<\/div><\/div>`;
    html+=`<\/div>`;
    return html;
  }
if(ep.mergeHappened){
    h+=_dir(`<em>${HOST.short} produces a tray of new buffs with theatrical menace. Nobody is comfortable.<\/em>`);
    h+=_hostLine(`Drop your buffs. As of right now there are no tribes — just ${remaining} people who used to trust each other.`);
    h+=_conf(pick(livePool()),`The merge changes everything. Every promise I made on the old tribe? Renegotiating. Today.`,'already recalculating');
  } else {
    h+=_hostLine(`${remaining} of you left. One of you is leaving by nightfall. I won't say who. I do know. I always know.`);
  }

  // ===== ACT ONE — CAMP LIFE & TWIST =====
  h+=_actHead('ACT ONE','CAMP LIFE');
  h+=_slug(`INT. ${(G.settings.theme||'CAMP').toUpperCase()} SHELTER — MORNING`);

  if(ep.twist){
    h+=_dir(`<em>${HOST.short}'s voice crackles over a speaker nobody can locate. A twist has entered the game.<\/em>`);
    h+=_hostLine(`Small announcement. ${ep.twistMsg}`);
    const r=pick(livePool());
    if(r){
      h+=_conf(r,_twistReaction(ep.twist,r),'processing the news');
    }
  } else {
    h+=_dir(`<em>A slow morning at camp. Hunger, sun, and quiet arithmetic. Everyone is doing the math on everyone.<\/em>`);
  }

  if(ep.dramaMsg){
    h+=_dir(`<em>And then it goes sideways. ${ep.dramaMsg}<\/em>`);
    const a=pick(livePool());
    if(a) h+=_charLine(a,`"${_line(a)}"`,_act(a));
    const b=pick(livePool().filter(x=>!a||x.id!==a.id));
    if(b) h+=_conf(b,`This camp is one bad night away from completely combusting. ${b.name.split(' ')[0]==='I'?'':''}I just need to not be holding the match when it does.`,'watching it unfold');
  }

  if(ep.idolFinder){
    h+=_slug(`EXT. ${(G.settings.theme||'JUNGLE').toUpperCase()} — CONTINUOUS`);
    h+=_dir(`<em>${ep.idolFinder.name} slips away from camp, ${_act(ep.idolFinder)}, searching where nobody else bothers to look...<\/em>`);
    h+=_dir(`<em>${ep.idolFinder.name.toUpperCase()} UNEARTHS A HIDDEN IMMUNITY IDOL and pockets it before anyone breathes.<\/em>`);
    h+=_conf(ep.idolFinder,`Nobody knows I have this. And nobody will — until it is far, far too late to do anything about it.`,'idol hidden, smile hidden better');
  }

  // ===== ACT TWO — STRATEGY / INTERACTIONS =====
  if(ep.interactions&&ep.interactions.length){
    h+=_actHead('ACT TWO','THE SCHEMING');
    ep.interactions.forEach(({a,b,text})=>{ h+=_interactionToScene(a,b,text); });
    // confessional from one of them
    const sp=pick(ep.interactions[0]?[ep.interactions[0].a,ep.interactions[0].b]:livePool());
    if(sp) h+=_conf(sp,_line(sp),'after the conversation');
  } else if(ep.confessionals&&ep.confessionals.length){
    h+=_actHead('ACT TWO','THE SCHEMING');
  }

  // Stored confessionals (the real generated ones)
  if(ep.confessionals&&ep.confessionals.length){
    if(!ep.interactions||!ep.interactions.length) h+=_slug(`INT. THE CONFESSIONAL — VARIOUS`);
    ep.confessionals.forEach(c=>{
      h+=_conf(c.who,c.text,`${c.who.archetype}`);
    });
  }

  // ===== ACT THREE — THE CHALLENGE =====
  if(ep.challengeResult){
    const r=ep.challengeResult;
    h+=_actHead('ACT THREE','THE CHALLENGE');
    h+=_slug(`EXT. CHALLENGE ARENA — DAY`);
    h+=_dir(`<em>A course of questionable safety and total commitment. Today's test: ${r.stat}.<\/em>`);
    h+=_hostLine(`Today's challenge — "${r.name}". ${r.flavor||'Win, and you are safe.'} ${_h('toChallenge')}`);
    if(r.tieMsg) h+=_dir(`<em>${r.tieMsg}<\/em>`);
    if(r.type==='tribal'){
      const w=(r.winner&&r.winner.members&&r.winner.members.length)?pick(r.winner.members):null;
      const l=(r.loser&&r.loser.members&&r.loser.members.length)?pick(r.loser.members):null;
      if(w) h+=_dir(`<em>${w.name}, ${_act(w)}, anchors it for ${r.winner.team.name}. They surge ahead.<\/em>`);
      h+=_dir(`<em>${r.winner.team.name} crosses first. ${r.loser.team.name} falls short and falls quiet.<\/em>`);
      h+=_hostLine(_h('challengeWinTribal',{winner:r.winner.team.name,loser:r.loser.team.name}));
      if(w) h+=_charLine(w,`"${pick(['That win keeps us whole. For now.','We needed that. Badly.','Pressure goes back on them. Good.'])}"`,'breathing hard');
      if(l) h+=_conf(l,`We lost. Which means tonight someone in this group goes home, and everyone is already doing the math on everyone. Including me. Especially me.`,'losing tribe, racing brain');
    } else {
      h+=_dir(`<em>A grueling individual battle. One by one they fall, until only ${r.winner?r.winner.name:'one'} remains standing.<\/em>`);
      if(r.winner){
        h+=_hostLine(_h('challengeWinIndiv',{winner:r.winner.name}));
        h+=_charLine(r.winner,`"${pick(['This necklace means I see another sunrise.','They cannot touch me tonight. Anyone else? Fair game.','One more step. I am not done here.'])}"`,'immunity in hand');
      }
    }
  }

  // ===== ACT FOUR — TRIBAL COUNCIL =====
  if(!ep.noElim&&ep.voteResult&&ep.eliminated){
    h+=_actHead('ACT FOUR','TRIBAL COUNCIL');
    h+=_slug(`INT. TRIBAL COUNCIL — NIGHT`);
    h+=_dir(`<em>Torches lit. Faces orange in the firelight. The least comfortable chairs ever assembled.<\/em>`);
    h+=_hostLine(_h('toTribal'));

    // pre-vote beats from a couple of vulnerable players
    const tally=ep.voteResult.tally||{};
    const targeted=Object.entries(tally).filter(([,v])=>v>0).map(([id])=>G.cast.find(c=>c.id===id)).filter(Boolean);
    const speakers=shuffle(targeted).slice(0,2);
    speakers.forEach(s=>{
      h+=_charLine(s,`"${pick(['Trust is everything here. I really hope mine is not misplaced.','My gut says tonight gets messy.','I have done everything I can. Now it is in their hands.','Somebody is going home shocked. I am hoping it is not me.'])}"`,'to the host');
    });

    if(ep.idolPlay){
      h+=_dir(`<em>${ep.idolPlay.idolPlayer.name} rises. Reaches into a pocket. Produces a HIDDEN IMMUNITY IDOL. The fire seems to get louder.<\/em>`);
      h+=_hostLine(`That is a hidden immunity idol. It is real. Any votes against ${ep.idolPlay.idolPlayer.name} — do not count.`);
      h+=_conf(ep.idolPlay.idolPlayer,`They thought they had me. They had nothing. Best feeling in this game, bar none.`,'idol spent, point made');
    }
    if(ep.voteResult.tied&&ep.voteResult.tiebreakerApplied){
      h+=_dir(`<em>${ep.voteResult.tiebreakerApplied}<\/em>`);
    }

    // The vote read — actual numbers from the data
    const sortedVotes=Object.entries(tally).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    h+=_dir(`<em>${HOST.short} reads the votes one at a time, pausing for maximum cruelty.<\/em>`);
    let runningTxt=sortedVotes.map(([id,v])=>{const p=G.cast.find(c=>c.id===id);return p?`${v} for ${p.name.split(' ')[0]}`:null;}).filter(Boolean).join(' &middot; ');
    h+=_hostLine(`Votes: ${runningTxt}.`);
    h+=_dir(`<em>An extremely long pause. The fire pops. Somewhere the ${G.settings.theme||'jungle'} holds its breath.<\/em>`);
    h+=_hostLine(ep._aiHostComment||_h('snuff',{name:ep.eliminated.name}));
    h+=_charLine(ep.eliminated,`"${ep._aiExitSpeech||_exitLine(ep.eliminated)}"`,'grabbing the torch, walking out');
    h+=_dir(`<em>${HOST.short} snuffs the torch. The flame dies with a small, final hiss.<\/em>`);
    if(ep.eliminated2){
      h+=_dir(`<em>And it is not over. A second name. ${ep.eliminated2.name.toUpperCase()}'s torch is snuffed too — a brutal double.<\/em>`);
      h+=_charLine(ep.eliminated2,`"${_exitLine(ep.eliminated2)}"`,'stunned');
    }
    h+=_conf(ep.eliminated,ep._aiExitFinalWords||_finalWords(ep.eliminated),'final words');
  } else if(ep.noElim){
    h+=_actHead('ACT FOUR','TRIBAL COUNCIL');
    h+=_slug(`INT. TRIBAL COUNCIL — NIGHT`);
    h+=_dir(`<em>Everyone braces for a vote that does not come.<\/em>`);
    h+=_hostLine(`Twist of the night: nobody is going home. Torches stay lit. Tension does not.`);
    h+=_conf(pick(livePool()),`We all walked in ready to vote and walked out with nothing decided. That just means tomorrow is worse.`,'relieved and rattled');
  }

  // ===== TAG / CLIFFHANGER =====
  h+=_actHead('TAG','CLIFFHANGER');
  h+=_slug(`EXT. ${(G.settings.theme||'CAMP').toUpperCase()} — LATER`);
  const liveNow=G.cast.filter(c=>!c.eliminated);
  const schemer=liveNow.find(c=>c.personality==='Villain'||c.personality==='Schemer'||c.personality==='Strategic')||pick(liveNow);
  if(schemer){
    h+=_dir(`<em>The others drift to their shelters. ${schemer.name} lingers in the dark, ${_act(schemer)}.<\/em>`);
    h+=_conf(schemer,`${ep.eliminated&&ep.eliminated.eliminated?'One down. ':''}${liveNow.length} to go. And not one of them knows what I'm actually planning.`,'small, private smile');
  }
  h+=_hostLine(`${_h('tag',{show:G.settings.name||'the show',count:liveNow.length})}`);
  h+=_dir(`<em>SMASH TO CREDITS.<\/em>`);
  h+=`<div class="script-end">END OF EPISODE ${ep.ep}<\/div>`;
  h+=`<\/div>`;
  return h;
}

function _episodeTitle(ep){
  if(ep.mergeHappened) return "Drop Your Buffs";
  if(ep.idolPlay) return "The Idol Speaks";
  if(ep.eliminated2) return "Double or Nothing";
  if(ep.noElim) return "Nobody Goes Home";
  if(ep.twist) return ep.twist.name;
  if(ep.idolFinder) return "Buried Things";
  if(ep.dramaMsg) return "Camp on Fire";
  if(ep.eliminated) return `So Long, ${ep.eliminated.name.split(' ')[0]}`;
  return `Day ${ep.ep*3-2}`;
}
function _twistReaction(twist,p){
  const m={
    swap:"New tribe, new everything. Every read I had is garbage now. Starting over — out loud.",
    double:"TWO of us go home tonight? I need to be furniture. Beautiful, unvotable furniture.",
    noelim:"Nobody leaves? Cute. That just means the knife comes out next week instead.",
    returnee:"Someone's BACK? Great. A whole grudge with legs just walked into my game.",
    steal_vote:"Somebody can steal a vote? I trust exactly nobody now. Including the trees.",
    tribe_dissolve:"My tribe just dissolved under me. I am a free agent and I am terrified.",
    exile:"Exile? Alone, with my thoughts and a coconut? My thoughts are not good company right now.",
    challenge_advantage:"Quiet little edge in my back pocket. Nobody clocks the quiet ones until it's late.",
    new_alliance:"Forced to work with them? Fine. I'll smile. I'm great at smiling.",
    power_shift:"The rug just got pulled. I either adapt in the next ten minutes or I'm the story.",
    extra_vote:"Two votes in my pocket and a straight face on. This is going to be fun for exactly one of us.",
  };
  return m[twist.id]||"A twist like this rewards whoever moves first. Good thing that's me.";
}
function _exitLine(p){
  // Per-archetype exit lines — each archetype has its own voice
  const byArchetype={
    'The Strategist':["Every alliance I built meant something. This vote means something too — just not what I planned.","I had three contingencies. They beat all three. Respect.","The math was right. The relationships weren't. That's the game."],
    'The Fan Favorite':["The tribe made their call and I respect it. I love every one of you.","This isn't how I wrote it in my head, but it's still the most incredible thing I've ever done.","No hard feelings. Genuinely. Thank you for letting me play."],
    'The Challenge Beast':["Challenge wins don't protect you from the vote. Lesson learned — too late.","I carried that tribe on my back. They thanked me by writing my name down.","Turns out physical dominance has a shelf life. Who knew."],
    'The Manipulator':["You think you outplayed me? You played the move I wanted you to play.","Every lie I told was a work of art. I leave with no regrets, only notes.","Masterful. Truly. I tipped my hand once. Once was enough."],
    'The Sweetheart':["I kept my word. I played with kindness. I can leave with that.","I hope everyone here finds something out here worth holding onto. I already did.","This hurts, but I'm grateful. I meant every friendship I made."],
    'The Loose Cannon':["Did I expect this? No. Am I surprised? Also no.","I made chaos my strategy and chaos made me a target. Fair trade.","At least nobody out here was bored. You're welcome."],
    'The Quiet Threat':["They finally noticed me. A little late.","I was the threat they forgot to deal with — until they remembered.","Quiet game, loud exit. That's all I've got."],
    'The Social Butterfly':["I talked to everyone, trusted too many, and here we are.","Social games end when the numbers turn. Mine turned.","I made real connections out here. No vote changes that."],
    'The Big Villain':["You'll miss me when I'm gone. This season gets boring without a villain.","The jury's going to have fun with this. Enjoy.","Every great story needs an antagonist. I was yours. You're welcome."],
    'The Underdog':["Nobody saw me coming and nobody saw me going either. Story of my life.","I got further than anyone expected — including me.","Counted out from day one. I made them count."],
    'The Narrator':["I saw every move before it happened. I just couldn't stop this one.","I'll have a lot to say about this at the finale. A lot.","The story was always going to end somewhere. Just not quite here."],
    'The Duo':["My partner's still in there. Finish what we started.","Half of us is still fighting. That's enough.","This isn't over. Watch the other half of this duo."],
    'The Flipper':["I flipped once too many times and the numbers finally caught me. Fair.","Every vote I changed felt right in the moment. This one will too, eventually.","I kept the game alive. Someone else will win it."],
    'The Goat':["They kept me around because they thought they could beat me. They were right.","I know what I was to them. I used it while I could.","No strategic masterpiece, but I lasted longer than most would've. Take that."],
    'The Veteran':["This game has changed since I last played. I didn't change enough.","Experience only gets you so far when the whole cast has watched every season.","Been here before. It hurts the same way every time."],
    'The Superfan':["I studied this game my entire life. Losing it is still a privilege.","Every tribal council I watched on TV — and now I've lived one. Worth it.","I know every historic vote and I still couldn't save myself. The irony is not lost on me."],
    'The Physical Threat':["They voted me out because they were scared of me. I'll take that.","Strong people go early. You'd think they'd have figured out a better system.","Threat. That was always going to be the word on my back."],
    'The Emotional Player':["I led with my heart and my heart got me here. I won't apologise for that.","This game rewards cold decisions. I'm a warm person. It was always going to end this way.","I cried out here, laughed out here, fought out here. I lived it."],
    'The Wildfire':["I burned hot and burned out. No regrets.","Some people play it safe their whole game. I set things on fire. Mine was more interesting.","The chaos was the point. Mission accomplished."],
    'The Puppet Master':["The strings are all still attached. They just can't see them.","I controlled this game longer than anyone knew. This vote was the one I couldn't script.","Every person left out there was part of my plan at some point."],
    'The Coattail Rider':["I made it further than my threat level warranted. That's the whole strategy.","They called it riding coattails. I called it surviving. Same thing.","Nobody wanted me gone badly enough. Until they did."],
    'The Jury Threat':["They voted me out because they knew I'd beat them. Respectfully, they were right.","Winning the jury is the whole game. They knew that. So they got rid of me.","Jury threat is the nicest reason to be eliminated. I'll take it."],
    'The Number':["I was a vote. I know that. I'm okay with that.","Not everyone needs to be a mastermind. Sometimes you're just a number that mattered.","I kept my people safe as long as I could."],
    'The Shield':["I spent this game absorbing hits meant for others. My job is done.","They used me as a buffer until they didn't need one. Classic.","I protected someone all the way. They better use it."],
    'The Sleeper Agent':["They still don't know what I was doing out here. Good.","My game was invisible until it wasn't. That's how you play it.","I had more going on than anyone saw. Just not quite enough."],
  };
  const byPersonality={
    Villain:["You all just made the most expensive mistake of your lives.","Enjoy it. I'll be on the jury, taking notes.","I leave smiling. Figure that one out."],
    Hero:["No regrets. I played it clean and I'd do it again.","Good game, all of you. I mean that.","Head up. That's the only way I know how to leave."],
    Hothead:["Unbelievable. UN-be-LIEV-able.","You will regret this. All of you. Specifically.","Fine. FINE. I'm done."],
    Underdog:["Counted me out the whole way. Almost worked.","Not bad for the one nobody watched.","I made them work for it at least."],
    Loyal:["I kept my word. Every time. That's more than most.","My alliance knew where I stood. Always.","Loyalty got me here. I'd do it the same way."],
    Chaotic:["Well that escalated quickly.","I regret nothing and understand nothing.","Could've seen that coming if I'd been paying attention."],
    Peacemaker:["I held this group together longer than it deserved.","No bad feelings. Peace.","I hope they stay kind to each other. They won't."],
    'Comic Relief':["Tell my story. Make me taller in it.","Exit stage left. Try not to miss me too loudly.","I was robbed. Comedically, dramatically, totally robbed."],
  };
  const lines=byArchetype[p.archetype]||byPersonality[p.personality]||["Well. That's the game.","I gave it everything out here.","No hard feelings. Mostly.","Should've seen it coming."];
  return pick(lines);
}
function _finalWords(p){
  const f=p.name.split(' ')[0];
  const byArchetype={
    'The Strategist':`${f} built something real out here — a web of plans and moves most players never even saw. The vote that sent them home was clever, but so was everything they did. The jury will remember.`,
    'The Fan Favorite':`${f} came out here to play the game they loved watching, and they did. Every moment was genuine. The friendships were real. This isn't how the story was supposed to end — but the story was good.`,
    'The Challenge Beast':`${f} dominated physically and paid the price everyone predicted they would. Challenge wins buy time, not loyalty. They knew that — they just couldn't stop winning.`,
    'The Manipulator':`${f} played three games at once and nearly pulled all of them off. The people left behind are playing a simpler game now. They might not even realise it.`,
    'The Sweetheart':`${f} proved that you can play this game with warmth and still get far. The kindness was never a strategy — it was just who they are. The jury will decide if that's worth something.`,
    'The Loose Cannon':`${f} was the variable nobody could account for, right up until the vote they couldn't escape. Unpredictable players make great television. They made great television.`,
    'The Quiet Threat':`${f} spent this whole game hiding in plain sight, building equity the other players didn't recognise until it was almost too late. Almost.`,
    'The Social Butterfly':`${f} had a relationship with everyone in this cast. That's rare. That kind of social capital doesn't disappear — it sits on the jury and asks hard questions.`,
    'The Big Villain':`${f} was the season's best villain and they earned that title every single day. The edit will love them. The jury might too. Depends who they're sitting next to.`,
    'The Underdog':`${f} was never supposed to be here this long. And yet. Whatever comes next, ${f} proved something — maybe to the cast, definitely to themselves.`,
    'The Physical Threat':`${f} was the most physically dominant player this season. They paid the price that comes with that — because the game is social before it is physical, and the social part caught up.`,
    'The Puppet Master':`${f} controlled more of this game than the final players will ever admit. Every vote, every flip, every alliance — ${f} had a hand in most of them. The jury knows.`,
    'The Jury Threat':`${f} was voted out because they would have won. That's the highest compliment this game can give.`,
    'The Sleeper Agent':`${f} played quietly, moved carefully, and got further than anyone expected by doing less than anyone tracked. Invisible games end when people finally look.`,
  };
  return byArchetype[p.archetype]||`${f} came out here as ${p.archetype.toLowerCase()} and they played it fully. The vote ends their game but not their story. Watch the jury. Watch the finale. ${f} is not done yet.`;
}

// Show the full season screenplay modal
let _currentScriptText='';
function showEpisodeScripts(focusEp){
  // Gather log - fall back to currentEpData if log is empty (e.g. first episode still in progress)
  let log=G.episodeLog||[];
  if(!log.length&&G.currentEpData) log=[G.currentEpData];
  if(!log.length){
    notify('Play through at least one episode first!');
    return;
  }
  const titleEl=document.getElementById('script-modal-title');
  if(titleEl) titleEl.textContent=`📜 ${G.settings.name||'Season'} — Episode Scripts`;
  const content=document.getElementById('script-modal-content');
  if(!content) return;

  // Table of contents + AI button
  const hasKey=!!getGeminiKey();
  let toc=`<div class="script-ep-toc">`;
  log.forEach(ep=>{
    const aiTag=ep._aiGenerated?'<span style="font-size:9px;vertical-align:super;color:var(--leaf)">✨<\/span>':'';
    toc+=`<button onclick="scrollToScriptEp(${ep.ep})" id="toc-ep-${ep.ep}">Ep ${ep.ep}${aiTag}<\/button>`;
  });
  toc+=`<\/div>`;
  if(hasKey) toc+=`<div style="font-size:12px;color:var(--text2);margin-bottom:8px">✨ = AI generated · Click "Generate with AI" on any episode to upgrade its dialogue<\/div>`;
  else toc+=`<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Add a free <a href="https://aistudio.google.com" target="_blank" style="color:var(--fire2)">Gemini API key<\/a> in Setup → General Settings to enable AI-generated dialogue<\/div>`;

  let body=`<div class="script-doc" id="script-doc-root">`;
  log.forEach(ep=>{
    body+=`<div id="script-anchor-${ep.ep}">`;
    body+=generateEpisodeScript(ep);
    // AI generate button per episode
    if(hasKey&&!ep._aiGenerated) body+=`<button id="ai-gen-btn-${ep.ep}" class="btn btn-outline btn-sm" style="margin:12px 0;width:100%" onclick="generateAIEpisodeScript(${ep.ep})">✨ Generate with AI for Episode ${ep.ep}<\/button>`;
    else if(ep._aiGenerated) body+=`<div style="text-align:center;font-size:12px;color:var(--leaf);margin:8px 0">✨ AI-generated dialogue<\/div>`;
    body+=`<\/div>`;
  });
  body+=`<\/div>`;
  content.innerHTML=toc+body;
  _currentScriptText=_buildPlainTextScript(log);
  openModal('modal-script');
  if(focusEp) setTimeout(()=>scrollToScriptEp(focusEp),120);
  else setTimeout(()=>scrollToScriptEp(log[log.length-1].ep),120);
}
function scrollToScriptEp(n){
  const el=document.getElementById(`script-anchor-${n}`);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.script-ep-toc button').forEach(b=>b.classList.remove('active'));
  const tb=document.getElementById(`toc-ep-${n}`);
  if(tb) tb.classList.add('active');
}
function _buildPlainTextScript(log){
  // Plain-text version for clipboard
  log=log||(G.episodeLog||[]);
  const title=(G.settings.name||'Season').toUpperCase();
  let txt=title+'\n'+'='.repeat(title.length)+'\n\n';
  log.forEach(ep=>{
    const tmp=document.createElement('div');
    tmp.innerHTML=generateEpisodeScript(ep);
    txt+=_domToScriptText(tmp)+'\n\n'+'—'.repeat(30)+'\n\n';
  });
  return txt;
}
function _domToScriptText(node){
  let out='';
  node.querySelectorAll('.script-prev,.script-title-card,.script-act-head,.script-slug,.script-stage-direction,.script-line,.script-confessional,.script-end').forEach(el=>{
    if(el.classList.contains('script-prev')){
      const lbl=(el.querySelector('.script-prev-label')?.textContent||'').trim();
      const body=(el.querySelector('.script-prev-body')?.textContent||'').trim();
      out+=`\n${lbl}\n${body}\n`;
    } else if(el.classList.contains('script-title-card')){
      const show=el.querySelector('.stc-show')?.textContent||'';
      const ep=el.querySelector('.stc-ep')?.textContent||'';
      const tag=el.querySelector('.stc-tag')?.textContent||'';
      out+=`\n\n${show.toUpperCase()}\n${ep}\n${tag?tag+'\n':''}${'='.repeat(46)}\n`;
    } else if(el.classList.contains('script-act-head')){
      out+=`\n\n--- ${el.textContent.trim()} ---\n`;
    } else if(el.classList.contains('script-slug')){
      out+=`\n${el.textContent.trim()}\n`;
    } else if(el.classList.contains('script-stage-direction')){
      out+=`\n${el.textContent.trim()}\n`;
    } else if(el.classList.contains('script-line')){
      const sp=(el.querySelector('.script-speaker')?.textContent||'').trim();
      const paren=(el.querySelector('.script-paren')?.textContent||'').trim();
      const dlg=(el.querySelector('.script-dialogue')?.textContent||'').trim();
      out+=`\n${sp}\n`;
      if(paren) out+=`  ${paren}\n`;
      out+=`  ${dlg}\n`;
    } else if(el.classList.contains('script-confessional')){
      const nm=(el.querySelector('.sc-name')?.textContent||'').trim();
      const pr=(el.querySelector('.sc-paren')?.textContent||'').trim();
      const tx=(el.querySelector('.sc-text')?.textContent||'').trim();
      out+=`\n[ ${nm} ]\n`;
      if(pr) out+=`  ${pr}\n`;
      out+=`  "${tx}"\n`;
    } else if(el.classList.contains('script-end')){
      out+=`\n${el.textContent.trim()}\n`;
    }
  });
  return out;
}
function copyScript(){
  if(!_currentScriptText) _currentScriptText=_buildPlainTextScript();
  navigator.clipboard?.writeText(_currentScriptText).then(
    ()=>notify('📋 Script copied to clipboard!','win'),
    ()=>{
      // Fallback
      const ta=document.createElement('textarea');
      ta.value=_currentScriptText;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');notify('📋 Script copied!','win');}catch(e){notify('Copy failed — select manually');}
      document.body.removeChild(ta);
    }
  );
}


// ===== SEASON RECAP EXPORT — TV PROSE FORMAT =====
/**
 * generateSeasonRecap()
 * Generates a shareable season summary in television recap prose.
 * Format: Episode by episode, like a Wikipedia episode guide.
 * Designed to be posted on Reddit, Discord, shared with friends.
 */
function generateSeasonRecap(){
  if(!G.episodeLog||!G.episodeLog.length){
    notify('Play some episodes first'); return;
  }

  const seasonName=G.settings.name||'No Signal Season';
  const theme=G.settings.theme||'a remote location';
  const totalCast=G.cast.length;
  const winner=G.cast.find(c=>c.winner);
  const jury=G.jury||[];

  let recap=`${seasonName.toUpperCase()}
`;
  recap+=`${'═'.repeat(seasonName.length)}

`;
  recap+=`${totalCast} contestants. One winner. Every vote matters.
`;
  recap+=`Setting: ${theme}

`;

  // Story analysis header
  if(typeof analyseSeasonStory==='function'){
    try{
      const st=analyseSeasonStory();
      if(st.title&&st.title!==seasonName) recap+=`${st.title}\n\n`;
      if(st.arcSummary) recap+=`${st.arcSummary}\n\n`;
      const sr=[['Villain',st.villain],['Hero',st.hero],['Tragic',st.tragic],['Underdog',st.underdog]].filter(([,p])=>p);
      if(sr.length){recap+=`NOTABLE PLAYERS\n${'-'.repeat(30)}\n`;sr.forEach(([r,p])=>recap+=`${r}: ${p.name} (${p.archetype})\n`);recap+=`\n`;}
    }catch(e){}
  }
  // Episode by episode
  G.episodeLog.forEach(ep=>{
    const epTitle=_recapEpTitle(ep);
    recap+=`─── EPISODE ${ep.ep}${epTitle?' — '+epTitle:''} ───

`;

    // Merge announcement
    if(ep.mergeHappened){
      const remaining=G.cast.filter(c=>!c.eliminated||c.elimEp>=ep.ep).length;
      recap+=`The tribes merged into one with ${remaining} players remaining.
`;
    }

    // Twist
    if(ep.twist&&ep.twistMsg){
      recap+=`${ep.twistMsg}
`;
    }

    // Idol find
    if(ep.idolFinder){
      recap+=`${ep.idolFinder.name} found a hidden immunity idol, keeping it secret from the rest of the tribe.
`;
    }

    // Challenge result
    if(ep.challengeResult){
      const cr=ep.challengeResult;
      if(cr.type==='individual'&&cr.winner){
        const wins=cr.winner.challengeWins||1;
        recap+=`${cr.winner.name} won individual immunity${wins>1?` — their ${_ordinal(wins)} challenge win of the season`:''}.
`;
      } else if(cr.type==='tribal'&&cr.winner){
        recap+=`${cr.winner.team?.name||'The winning tribe'} won the immunity challenge, sending ${cr.loser?.team?.name||'the losing tribe'} to tribal council.
`;
      }
    }

    // Idol play
    if(ep.idolPlay){
      const {idolPlayer,target}=ep.idolPlay;
      if(idolPlayer.id===target?.id){
        recap+=`In a dramatic moment at tribal council, ${idolPlayer.name} played their hidden immunity idol — nullifying all votes cast against them.
`;
      } else {
        recap+=`${idolPlayer.name} played a hidden immunity idol for ${target?.name||'another player'}, nullifying the votes.
`;
      }
    }

    // Drama/interactions — pick the most significant
    if(ep.dramaMsg){
      recap+=`${ep.dramaMsg}
`;
    }

    // Key interaction — most significant relationship moment
    if(ep.interactions&&ep.interactions.length){
      const keyInt=ep.interactions[0];
      if(keyInt&&keyInt.text) recap+=`${keyInt.text}
`;
    }

    // Vote result
    if(ep.voteResult&&!ep.noElim){
      const tally=ep.voteResult.tally||{};
      const sorted=Object.entries(tally).sort((a,b)=>b[1]-a[1]);
      if(sorted.length>=2){
        const [topId,topVotes]=sorted[0];
        const [secId,secVotes]=sorted[1];
        const topP=G.cast.find(c=>c.id===topId);
        const secP=G.cast.find(c=>c.id===secId);
        if(topP&&secP){
          recap+=`At tribal council, the vote fell ${topVotes}-${secVotes}`;
          if(ep.voteResult.tied) recap+=` after a tiebreaker`;
          recap+=`.
`;
        }
      }
    }

    // Elimination
    if(ep.eliminated){
      const el=ep.eliminated;
      const juryNum=jury.findIndex(j=>j.id===el.id)+1;
      const isJury=el.juryMember||juryNum>0;
      recap+=`${el.name} (${el.archetype}) was voted out`;
      if(isJury) recap+=`, becoming jury member #${juryNum||jury.length}`;
      recap+=`.
`;
      // Add a final words quote if AI generated
      if(ep._aiExitFinalWords){
        const fw=ep._aiExitFinalWords.slice(0,120)+(ep._aiExitFinalWords.length>120?'…':'');
        recap+=`Final words: "${fw}"\n`;
      }
    }
    if(ep.eliminated2){
      const el2=ep.eliminated2;
      recap+=`In a double elimination, ${el2.name} (${el2.archetype}) was also voted out.
`;
    }

    // Archetype evolution this episode
    if(ep.evolutionEvents&&ep.evolutionEvents.length){
      ep.evolutionEvents.forEach(ev=>{
        recap+=`📝 ${ev.message}
`;
      });
    }

    recap+=`
`;
  });

  // Season summary
  recap+=`─── SEASON SUMMARY ───

`;
  const elims=[...G.cast]
    .filter(c=>c.eliminated&&c.elimEp)
    .sort((a,b)=>a.elimEp-b.elimEp);
  recap+=`ELIMINATION ORDER:
`;
  elims.forEach((c,i)=>{
    recap+=`${i+1}. ${c.name} (${c.archetype}) — Episode ${c.elimEp}
`;
  });
  if(winner){
    recap+=`
🏆 WINNER: ${winner.name} (${winner.archetype})
`;
    if(winner.challengeWins>0) recap+=`Challenge wins: ${winner.challengeWins}
`;
  }

  // Key stats
  const mostWins=G.cast.reduce((best,c)=>(!best||c.challengeWins>best.challengeWins)?c:best,null);
  if(mostWins&&mostWins.challengeWins>0){
    recap+=`
Most challenge wins: ${mostWins.name} (${mostWins.challengeWins})
`;
  }

  // Most betrayals
  if(G.memories&&G.memories.length){
    const betrayalCounts={};
    G.memories.filter(m=>m.type==='betrayal').forEach(m=>{
      betrayalCounts[m.object]=(betrayalCounts[m.object]||0)+1;
    });
    const mostBetrayed=Object.entries(betrayalCounts).sort((a,b)=>b[1]-a[1])[0];
    if(mostBetrayed){
      const p=G.cast.find(c=>c.id===mostBetrayed[0]);
      if(p) recap+=`Most betrayed: ${p.name} (${mostBetrayed[1]} betrayal${mostBetrayed[1]!==1?'s':''})
`;
    }
  }

  recap+=`
Generated by No Signal — garryrobson85.github.io/No-Signal-
`;
  return recap;
}

function _recapEpTitle(ep){
  if(ep.mergeHappened) return 'The Merge';
  if(ep.isRejoinEpisode) return 'The Return';
  if(ep.doubleElim) return 'Double Elimination';
  if(ep.twist&&ep.twistMsg) return ep.twistMsg.split('.')[0].slice(0,30);
  if(ep.idolPlay) return 'The Idol Play';
  if(ep.dramaMsg&&ep.dramaMsg.length>10) return ep.dramaMsg.split('.')[0].slice(0,30);
  return null;
}

function _ordinal(n){
  const s=['th','st','nd','rd'];
  const v=n%100;
  return n+(s[(v-20)%10]||s[v]||s[0]);
}

/**
 * showSeasonRecap()
 * Opens a modal with the full season recap and a copy button.
 */
function showSeasonRecap(){
  if(!G.episodeLog||!G.episodeLog.length){ notify('No episodes played yet'); return; }
  const recap=generateSeasonRecap();
  const html=`
    <div class="v19-help">Your season story — formatted for sharing. Copy and post it anywhere.</div>
    <textarea id="recap-text" style="width:100%;height:320px;font-family:var(--font-mono);font-size:12px;background:var(--surface2);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:12px;resize:vertical;line-height:1.6" readonly>${recap.replace(/</g,'&lt;')}</textarea>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-fire" style="flex:1" data-action="copySeasonRecap">📋 Copy to Clipboard</button>
      <button class="btn btn-outline" style="flex:1" data-action="downloadSeasonRecap">⬇ Download .txt</button>
    </div>`;
  openV19Modal('📺 Season Recap', html);
  // Store recap for copy/download actions
  window._currentRecap=recap;
}

function copySeasonRecap(){
  const text=window._currentRecap||generateSeasonRecap();
  navigator.clipboard.writeText(text).then(()=>notify('Season recap copied ✓','win'))
    .catch(()=>{
      const el=document.getElementById('recap-text');
      if(el){el.select();document.execCommand('copy');notify('Copied ✓','win');}
    });
}

function downloadSeasonRecap(){
  const text=window._currentRecap||generateSeasonRecap();
  const name=(G.settings.name||'no-signal-season').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const blob=new Blob([text],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`${name}-recap.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  notify('Downloaded ✓','win');
}


// ===== EXPORTS =====


// ===== FILE: features.js =====
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NoSignalCleanup.delegateActions());
} else {
  NoSignalCleanup.delegateActions();
}


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


// ===== EXPORTS =====


// ===== FILE: save.js =====
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


// ===== FILE: ui.js =====
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
  G.stageIndex=idx;
  const ep=G.currentEpData;
  const container=document.getElementById('ep-view-container');

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


// ===== EXPORTS =====
window.toggleDarkMode=function(){
  document.body.classList.toggle('light-mode');
  const isLight=document.body.classList.contains('light-mode');
  localStorage.setItem('ns-theme', isLight ? 'light':'dark');

  const btn=document.getElementById('dark-toggle-btn');
  if(btn) btn.textContent=isLight ? '☀️':'🌙';
};

document.addEventListener('DOMContentLoaded',()=>{
  const saved=localStorage.getItem('ns-theme');
  if(saved==='light'){
    document.body.classList.add('light-mode');
    const btn=document.getElementById('dark-toggle-btn');
    if(btn) btn.textContent='☀️';
  }
});


// ===== FILE: main.js =====
// No Signal — main.js
// Entry point — imports all modules and wires up the app

// ===== IMPORTS =====
// ES module imports — load order is handled by the module system
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


// ===== NO SIGNAL HOTFIX BOOTSTRAP =====
(function(){
  // Robust dark/light mode: body.light-mode drives CSS variables.
  window.toggleDarkMode = function(){
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    try { localStorage.setItem('ns-theme', isLight ? 'light' : 'dark'); } catch(e) {}
    const btn = document.getElementById('dark-toggle-btn');
    if(btn) btn.textContent = isLight ? '☀️' : '🌙';
  };
  document.addEventListener('DOMContentLoaded', function(){
    try {
      if(localStorage.getItem('ns-theme') === 'light') document.body.classList.add('light-mode');
    } catch(e) {}
    const btn = document.getElementById('dark-toggle-btn');
    if(btn) btn.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
  });
})();


// ===== v19.5 ROBUST THEME PATCH =====
(function(){
  function applyTheme(mode){
    const isLight = mode === 'light';
    document.documentElement.classList.toggle('light', isLight);
    document.documentElement.classList.toggle('dark', !isLight);
    document.body.classList.toggle('light-mode', isLight);
    try { localStorage.setItem('ns-theme', mode); localStorage.setItem('nosignal_darkmode', isLight ? '0' : '1'); } catch(e) {}
    const btn = document.getElementById('dark-toggle-btn');
    if(btn){
      btn.textContent = isLight ? '🌙' : '☀️';
      btn.title = isLight ? 'Switch to dark mode' : 'Switch to light mode';
      btn.setAttribute('aria-label', btn.title);
    }
  }
  window.toggleDarkMode = function(){
    const isLight = document.documentElement.classList.contains('light') || document.body.classList.contains('light-mode');
    applyTheme(isLight ? 'dark' : 'light');
  };
  document.addEventListener('DOMContentLoaded', function(){
    let saved = null;
    try { saved = localStorage.getItem('ns-theme'); } catch(e) {}
    if(!saved){
      try { saved = localStorage.getItem('nosignal_darkmode') === '0' ? 'light' : 'dark'; } catch(e) {}
    }
    applyTheme(saved === 'light' ? 'light' : 'dark');
    const btn = document.getElementById('dark-toggle-btn');
    if(btn){
      btn.onclick = function(ev){ ev.preventDefault(); ev.stopPropagation(); window.toggleDarkMode(); };
    }
  });
  document.addEventListener('click', function(ev){
    const btn = ev.target.closest && ev.target.closest('#dark-toggle-btn,[data-action="toggleDarkMode"]');
    if(btn){ ev.preventDefault(); ev.stopPropagation(); window.toggleDarkMode(); }
  }, true);
})();
