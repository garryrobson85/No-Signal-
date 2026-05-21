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



// ===== NARRATIVE GUARDRAILS =====
// Keeps visible story text locked to what the audience/players know at that moment.
function hasSwapOccurredByEpisode(ep){
  return !!((ep&&ep.twist&&ep.twist.id==='swap') || (G.episodeLog||[]).some(e=>e.ep < (ep?.ep||999) && e.twist && e.twist.id==='swap'));
}
function hasMergeOccurredByEpisode(ep){
  return !!((ep&&ep.mergeHappened) || (G.episodeLog||[]).some(e=>e.ep <= (ep?.ep||999) && e.mergeHappened));
}
function hiddenRelLabel(score){
  score=Number(score)||50;
  if(score>=70) return 'strong trust';
  if(score>=56) return 'growing trust';
  if(score>=42) return 'uncertain';
  if(score>=28) return 'uneasy';
  return 'open tension';
}
function narrativeFallbackConfessional(player, ep){
  const safeEp={...ep, voteResult:null, eliminated:null, eliminated2:null, idolPlay:null};
  return buildConfessionalText(player, safeEp);
}
function narrativeFallbackInteraction(a,b,ep){
  const an=a.name.split(' ')[0], bn=b.name.split(' ')[0];
  const score=(typeof v19RelScore==='function')?v19RelScore(a.id,b.id):50;
  if(score>=65) return `${an} and ${bn} found a quiet moment at camp. There is trust there, but neither of them is ready to say everything out loud yet.`;
  if(score<=35) return `${an} and ${bn} shared a short, careful conversation. Nothing exploded, but both walked away with more questions than answers.`;
  if(ep?.ep===1) return `${an} and ${bn} compared first impressions around camp. It was friendly enough, but this early nobody really knows what anyone is hiding.`;
  return `${an} and ${bn} checked in with each other before the challenge. The conversation stayed light, but both were listening for more than words.`;
}
function cleanNarrativeText(text, ep, fallback){
  if(!text) return fallback||'';
  let t=String(text)
    .replace(/\b\d{1,3}\s*\/\s*100\s*(?:relationship\s*)?(?:score|bond|trust)?\b/gi,'a private read')
    .replace(/\b(?:relationship|bond|trust|threat)\s*score\s*(?:of|is|:)?\s*\d{1,3}\b/gi,'private read')
    .replace(/\b\d{1,3}\s*(?:score|rating)\b/gi,'private read')
    .replace(/\bunderlying strategy beneath .*? persona\b/gi,'something under the surface')
    .replace(/\s+/g,' ')
    .trim();
  const lower=t.toLowerCase();
  const noSwap=!hasSwapOccurredByEpisode(ep);
  const noMerge=!hasMergeOccurredByEpisode(ep);
  const impossible=[];
  if(noSwap) impossible.push('tribe swap','swap happened','after the swap','post-swap','new tribe','swapped tribes','tribe swapped');
  if(noMerge) impossible.push('post-merge','after the merge','merge vote','merged tribe','jury management','jury vote');
  if(ep?.ep===1) impossible.push('resume move','big move resume','tribal history','for weeks','all season long');
  if(impossible.some(term=>lower.includes(term))) return fallback||'';
  return t;
}

// Generates a confessional grounded in what this player is actually experiencing
function buildConfessionalText(player, ep){
  const fn=player.name.split(' ')[0];
  const voiceTag=(player.personality||player.archetype||'').toLowerCase();
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

  // Episode 1 should feel like arrivals and first impressions, not voting history.
  // No one has enough lived game yet to talk like they have already betrayed people.
  if(ep.ep===1 && !ep.voteResult){
    const tribeMates=G.cast.filter(c=>c.id!==player.id && c.team===player.team && c.status==='active')
      .slice(0,3).map(c=>c.name.split(' ')[0]);
    const tribeLine=tribeMates.length
      ? `I'm still working out ${tribeMates.join(', ')}. First impressions matter out here, but they can lie to you.`
      : `I'm trying to read the room before the room starts reading me.`;
    const firstLines={
      'The Strategist':`First day, I'm not trying to control the game. I'm trying to understand it. Who talks too much, who listens, who needs someone to trust.`,
      'The Fan Favorite':`Walking onto the beach felt unreal. Everyone is smiling, but you can already feel people sizing each other up.`,
      'The Challenge Beast':`I know people will look at me and think challenge threat. So day one is about being useful without looking too dangerous.`,
      'The Manipulator':`Everyone wants to make a good first impression. I want to see which first impressions are fake.`,
      'The Sweetheart':`I want people to feel comfortable around me. That sounds simple, but out here comfort can become trust.`,
      'The Loose Cannon':`I promised myself I'd keep it calm on day one. I made that promise before I met everyone.`,
      'The Quiet Threat':`Day one is perfect for me. Let the loud people become memorable. I'll become necessary.`,
      'The Social Butterfly':`Names, stories, little details — I'm collecting all of it. The game starts with connection.`,
      'The Big Villain':`Everyone is trying to be nice. Cute. I'm trying to find the people who can actually be useful.`,
      'The Underdog':`I can already tell some people underestimated me when I walked in. Honestly, good. Let them.`,
      'The Superfan':`I've watched this moment a hundred times in my head. Being here is different. The sand, the nerves, the eyes on you — it's real now.`,
      'The Romantic':`There are some big personalities here. I'm trying to lead with warmth, but I know warmth alone won't keep me safe forever.`
    };
    const baseOptions=[
      firstLines[player.archetype] || `First day out here, everyone is performing a version of themselves. I'm just trying to spot who feels real.`,
      voiceTag.includes('villain') ? `Everyone is being polite because it is day one. I am being polite because it is useful.` : null,
      voiceTag.includes('chaotic')||voiceTag.includes('wildcard') ? `I told myself I would play it cool. That lasted about ten minutes.` : null,
      voiceTag.includes('loyal') ? `I am looking for people who feel steady. Out here, steady might be the rarest thing.` : null,
      voiceTag.includes('social') ? `You learn a lot from who people choose to sit beside when nobody tells them where to go.` : null,
      voiceTag.includes('nerd')||voiceTag.includes('strategic') ? `I am trying not to overthink it, which obviously means I am overthinking everything.` : null,
      voiceTag.includes('underdog') ? `I can feel a few people looking past me already. That might be the first mistake they make.` : null
    ].filter(Boolean);
    const base=baseOptions[Math.abs((player.id||fn).toString().split('').reduce((a,ch)=>a+ch.charCodeAt(0),0))%baseOptions.length];
    const challengeLine=wonChallenge
      ? `Winning early feels good, but I need people to see it as tribe strength, not a reason to mark me out.`
      : `For now, I need to settle in, learn names, and avoid becoming the easy first target.`;
    return [base, tribeLine, challengeLine].slice(0,2).join(' ');
  }

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

  if(ep?.ep===1){
    const opts=[
      `${an} and ${bn} traded first impressions while camp was still finding its rhythm. It sounded casual, but both were already taking notes.`,
      `${an} tried to get a read on ${bn} without pushing too hard. Day one smiles can hide a lot.`,
      `${bn} made an early effort with ${an}. It was friendly, careful, and just strategic enough to matter.`,
      `${an} and ${bn} compared the mood around camp. Nobody said the word trust yet, but both were clearly looking for it.`
    ];
    return pick(opts);
  }

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
  (a,b)=>`${b} tried to quietly test whether ${a} could be useful later, but couldn't get a clear answer.`,
  (a,b)=>`${a} and ${b} were spotted whispering near the well. Nobody could hear it, but everyone noticed.`,
  (a,b)=>`${b} promised ${a} their loyalty — but their body language told a different story.`,
  (a,b)=>`${a} tried to pull ${b} closer socially, with mixed results.`,
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
export { TWISTS_DATA, ARCHETYPES, PERSONALITIES, CHALLENGE_DATA, DRAMA_EVENTS, CONFESSIONAL_TEMPLATES, CONFESSIONAL_IDOL_TEMPLATES, INTERACTION_TEMPLATES_NEUTRAL, INTERACTION_TEMPLATES_IDOL, INTERACTION_TEMPLATES_ADVANTAGE, buildConfessionalText, buildInteractionText, buildDramaText, hasSwapOccurredByEpisode, hasMergeOccurredByEpisode, hiddenRelLabel, narrativeFallbackConfessional, narrativeFallbackInteraction, cleanNarrativeText };
