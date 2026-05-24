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
  if((voter.personality==='Hothead'||voter.personality==='Villain')&&seededRandom()<0.3) score+=2;

  // 6. Memory bonus — past betrayals/saves modify targeting (see memory.js)
  if(G.memories&&G.memories.length) score+=memoryTargetBonus(voter,target);

  // 6. Drama-fuelled chaos: unpredictable flips at high drama
  if(G.settings.drama&&G.dramaLevel>=4&&seededRandom()<0.2) score+=rng(0,5);

  // 7. Small noise so we never get identical scores
  score+=seededRandom()*1.5;

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
/**
 * generateVotingPlans — before tribal, build majority/minority target plans
 * Returns {majority:{target,members,confidence}, minority:{target,members,confidence}, swing:[]}
 * runVote uses these to make voting feel coordinated rather than individual.
 */
function generateVotingPlans(pool, immune=null){
  const eligible=pool.filter(p=>!immune||p.id!==immune.id);
  const allianceStr=G.settings.allianceStr/100;

  // Score every candidate from every voter's perspective, aggregate
  const globalScore={};
  eligible.forEach(candidate=>{
    globalScore[candidate.id]=0;
    pool.forEach(voter=>{
      if(voter.id===candidate.id) return;
      const allies=getVoterAllies(voter);
      if(allies.includes(candidate.id)) return; // never target allies in plan
      globalScore[candidate.id]+=targetScore(voter,candidate,allies,allianceStr,pool);
    });
  });

  // Sort candidates by aggregate threat score
  const ranked=eligible.slice().sort((a,b)=>(globalScore[b.id]||0)-(globalScore[a.id]||0));
  if(!ranked.length) return{majority:null,minority:null,swing:[]};

  const majorityTarget=ranked[0];
  const minorityTarget=ranked.length>1?ranked[1]:null;

  // Assign each voter to a plan based on their alliances + loyalty
  const majorityMembers=[],minorityMembers=[],swing=[];
  pool.forEach(voter=>{
    const allies=getVoterAllies(voter);
    const loyaltyRoll=seededRandom();
    // If voter is allied with the majority target, they'll likely oppose
    if(allies.includes(majorityTarget.id)){
      if(minorityTarget&&!allies.includes(minorityTarget.id)) minorityMembers.push(voter.id);
      else swing.push(voter.id);
    } else if(loyaltyRoll<allianceStr*0.7+0.25){
      majorityMembers.push(voter.id);
    } else {
      swing.push(voter.id);
    }
  });

  const majorityConfidence=Math.min(0.95, majorityMembers.length/pool.length+0.1);
  const minorityConfidence=minorityMembers.length/pool.length;

  return{
    majority:{target:majorityTarget, members:majorityMembers, confidence:majorityConfidence},
    minority:minorityTarget?{target:minorityTarget, members:minorityMembers, confidence:minorityConfidence}:null,
    swing
  };
}

function runVote(pool,immune=null){
  const eligible=pool.filter(p=>!immune||p.id!==immune.id);
  if(!eligible.length) return{eliminated:pool[0],tally:{},individualVotes:[],tied:false,tiebreakerApplied:''};
  const tally={};eligible.forEach(p=>tally[p.id]=0);
  const individualVotes=[],allianceStr=G.settings.allianceStr/100; // normalised 0–1

  // Generate coordinated voting plans — makes alliances feel intentional
  const plans=generateVotingPlans(eligible,null);

  pool.forEach(voter=>{
    const allies=getVoterAllies(voter);
    const candidates=eligible.filter(p=>p.id!==voter.id);
    if(!candidates.length) return;

    // Score each candidate
    const scored=candidates
      .map(p=>({p,s:targetScore(voter,p,allies,allianceStr,pool)}))
      .sort((a,b)=>b.s-a.s);

    let target=null;
    const loyaltyRoll=seededRandom();

    // Check if voter is in a voting plan
    const inMajority=plans.majority?.members.includes(voter.id);
    const inMinority=plans.minority?.members.includes(voter.id);

    if(inMajority&&loyaltyRoll<plans.majority.confidence){
      // Follow majority plan — but check if plan target is valid candidate
      const planTarget=candidates.find(c=>c.id===plans.majority.target.id);
      target=planTarget||scored[0].p;
    } else if(inMinority&&plans.minority&&loyaltyRoll<plans.minority.confidence+0.1){
      const planTarget=candidates.find(c=>c.id===plans.minority.target.id);
      target=planTarget||scored[0].p;
    } else if(loyaltyRoll<allianceStr*0.7+0.25){
      target=scored[0].p; // individual strategic consensus
    } else if(scored.length>=2&&loyaltyRoll<0.85){
      target=scored[rng(0,Math.min(2,scored.length-1))].p; // top-3 noise
    } else {
      target=pick(candidates); // chaos flip
    }
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
  if(!G.settings.idols||seededRandom()>idolFindChance()) return null;
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
  if(seededRandom()>0.65) return null;
  G.idolHolders=G.idolHolders.filter(id=>id!==eliminated.id); eliminated.idolPlayed=true;
  const newPool=pool.filter(p=>p.id!==eliminated.id&&!p.immunity&&!p.eliminated);
  if(!newPool.length) return null;
  // Return null for newElim — caller (runChallengeWithChoice) resolves via tally
  // pick(newPool) was a random fallback; caller now always uses sortedByTally first
  return{idolPlayer:eliminated,newElim:newPool[0]||null};
}
function getTwist(){
  if(seededRandom()*100>G.settings.twistFreq) return null;
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
  try {
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
  // Guard: ep must be > 1 AND at least one player must have been eliminated
  const _eliminatedSoFar = G.cast.filter(c=>c.eliminated&&!c.juryReturn);
  if(G.settings.returnees && G.settings.rejoinEpisode && ep===G.settings.rejoinEpisode
     && ep > 1 && _eliminatedSoFar.length > 0){
    const returning=shuffle(_eliminatedSoFar).slice(0,G.settings.rejoinCount||1);
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
    G.stageIndex=0; updateGameSidebar(); renderStage(0);
    return;
  }

  let doubleElim=false,noElim=false,mergeHappened=false;
  // Twists: block team swap post-merge
  const rawTwist=getTwist();
  const twist=(rawTwist&&rawTwist.id==='swap'&&G.merged)?null:rawTwist;
  let twistMsg='';
  if(twist){
    twistMsg=applyTwist(twist)||'';
    // If applyTwist returned null/empty the twist had no effect (e.g. returnee with no candidates)
    // Clear it so no twist banner shows and subsequent logic ignores it
    if(!twistMsg){ twist=null; }
    if(twist&&twist.id==='double') doubleElim=true;
    if(twist&&twist.id==='noelim') noElim=true;
  }

  let dramaMsg='',idolFinder=null;
  if(G.settings.drama&&seededRandom()<(G.settings.dramaRate==='fast'?0.5:G.settings.dramaRate==='slow'?0.15:0.3)){dramaMsg=buildDramaText({ep:G.episode});G.dramaLevel=Math.min(G.dramaLevel+1,5);}
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
    if(!G.merged&&active.length>=4&&seededRandom()<0.3){
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
  // Pre-fill template narration so non-AI users see the orange host cards too.
  // ai.js will overwrite _aiOpeningNarration / _aiBeforeTribal when AI runs.
  G.currentEpData._openingNarration = buildOpeningNarration(G.currentEpData);
  G.currentEpData._beforeTribal = buildBeforeTribalNarration(G.currentEpData);
  G.stageIndex=0;
  updateGameSidebar();
  renderStage(0);
  } catch(err) {
    console.error('computeAndStartEpisode failed:',err);
    notify('⚠️ Episode build failed — see console. Try Save → reload, or start a new season.');
    // Leave G.stageIndex intact so the user can still try saving / exporting their season.
  }
}

function runChallengeWithChoice(chosenChallenge){
  try {
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
    text:conf.text==='__PENDING__'?buildConfessionalText(conf.who,ep):conf.text,
    _source: conf._source || 'engine'   // ai.js overwrites this with 'ai' when Gemini runs
  }));
  // Update interactions now that we have the full ep — deduplicate across pairs
  const _usedInteractionTexts = new Set();
  ep.interactions=(ep.interactions||[]).map(i=>{
    const text = buildInteractionText(i.a, i.b, ep, _usedInteractionTexts);
    return {...i, text, _source: i._source||'engine'};
  });
  // Store evolution events on ep for recap export
  ep.evolutionEvents = G._pendingEvolutions||[];

  // Build a compressed narrative summary for AI prompt efficiency
  // Stores ~50 tokens instead of sending raw episode objects to Gemini
  ep.summary = buildEpisodeSummary(ep);

  // Snapshot placement state for the Tribe History tracker
  capturePlacementSnapshot(ep);
  G.episodeLog.push(ep); // always log for script generation

  // ── AI-BEFORE-RENDER ─────────────────────────────────────────────────────
  // If a Gemini key is set, generate AI dialogue NOW — before the player sees
  // any text. renderStage(1) rebuilds ALL stages from 0 upward, so by the time
  // the player sees anything, every confessional / interaction / narration is AI.
  // Fallback: if no key or AI fails → render immediately with engine templates.
  const _aiKey = typeof getGeminiKey === 'function' && getGeminiKey();
  if(_aiKey){
    // Scroll to top BEFORE swapping content so user lands on the generation screen
    const _evPre=document.querySelector('.ep-view');
    if(_evPre){_evPre.scrollTop=0;}
    window.scrollTo(0,0);
    const _c = document.getElementById('ep-view-container');
    if(_c) _c.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:16px;min-height:200px">
      <div style="font-size:36px;animation:pulse-fire 1.5s ease-in-out infinite">✨<\/div>
      <div style="font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:0.05em;color:var(--fire)">Writing Episode ${ep.ep}…<\/div>
      <div id="ai-progress-msg" style="font-size:13px;color:var(--text2)">Contacting Gemini…<\/div>
    <\/div>`;
    generateAIDialogueForEp(ep, msg => {
      const el = document.getElementById('ai-progress-msg');
      if(el) el.textContent = msg;
      // Keep user at top while generation progresses
      const _ev=document.querySelector('.ep-view');
      if(_ev) _ev.scrollTop=0;
    }).then(() => {
      renderStage(1);
      setTimeout(()=>{ if(typeof showChallengeRaceOverlay==='function') showChallengeRaceOverlay(); }, 300);
    }).catch(() => {
      renderStage(1);
      setTimeout(()=>{ if(typeof showChallengeRaceOverlay==='function') showChallengeRaceOverlay(); }, 300);
    });
  } else {
    renderStage(1);
    setTimeout(()=>{ if(typeof showChallengeRaceOverlay==='function') showChallengeRaceOverlay(); }, 300);
  }
  } catch(err) {
    console.error('runChallengeWithChoice failed:',err);
    notify('⚠️ Challenge resolution failed — see console. Save and reload to recover.');
  }
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
      if(!G.settings.returnees) return null; // setting off — treat as no twist
      const e=G.cast.filter(c=>c.eliminated&&!c.juryReturn);
      if(!e.length) return null; // nobody to return — skip silently, no message
      const r=pick(e);
      r.eliminated=false;r.juryMember=false;r.votes=0;r.immunity=false;r.juryReturn=true;
      if(G.merged){r.team=-1;}
      else {
        const sizes=G.teams.map((_,ti)=>({ti,count:getTeamMembers(ti).length})).sort((a,b)=>a.count-b.count);
        r.team=sizes[0].ti;
      }
      return`${r.name} has returned to the game!`;
    }
    case 'steal_vote':{const a=getActive();if(a.length>=2){const [x,y]=shuffle(a).slice(0,2);G.stealVoteHolders.push(x.id);return`${x.name} received a vote steal advantage.`;}return`A vote steal entered the game.`;}
    case 'tribe_dissolve':{if(!G.merged&&G.teams.length>2){const sz=G.teams.map((t,ti)=>({ti,count:getTeamMembers(ti).length})).sort((a,b)=>a.count-b.count);const dis=sz[0];getTeamMembers(dis.ti).forEach(c=>{const others=G.teams.map((_,ti)=>ti).filter(ti=>ti!==dis.ti);c.team=pick(others);});return`Tribe ${G.teams[dis.ti].name} dissolved — members absorbed into other tribes.`;}return`A tribe restructuring occurred.`;}
    case 'exile':{const e=pick(getActive());return e?`${e.name} was sent to Exile Island.`:`Exile Island twist.`;}
    case 'challenge_advantage':{const l=pick(getActive());return l?`${l.name} earned a challenge advantage!`:`A challenge advantage was hidden.`;}
    case 'new_alliance':{const a=getActive();if(a.length>=2){const[x,y]=shuffle(a).slice(0,2);const alId=uid();x.allianceIds.push(alId);y.allianceIds.push(alId);const al={id:alId,members:[x.id,y.id],name:`Forced: ${x.name.split(' ')[0]}-${y.name.split(' ')[0]}`};G.alliances.push(al);logAlliance('forced',al);return`${x.name} and ${y.name} were forced into a secret alliance.`;}return`Forced alliance twist.`;}
    case 'power_shift':{const top=getActive().sort((a,b)=>b.challengeWins-a.challengeWins)[0];if(top&&top.challengeWins>0){top.immunity=false;return`Power Shift! ${top.name} cannot compete for immunity tonight.`;}return`Power Shift — no effect yet.`;}
    case 'extra_vote':{const l=pick(getActive());if(l){G.extraVoteHolders.push(l.id);return`${l.name} found an extra vote advantage!`;}return`Extra vote hidden.`;}
    default: return`A twist activated.`;
  }
}