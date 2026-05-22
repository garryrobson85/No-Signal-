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
// Hard cap on memory list size. By the finale a season can accumulate a few hundred
// memory events; without a cap, the save payload bloats and getMemories scans slow down.
// 250 is comfortably above what a full season needs while keeping save size sane.
const MEMORY_HARD_CAP = 250;
function recordMemory(type, subjectId, objectId, episode, intensity=50){
  if(!G.memories) G.memories=[];
  // Don't duplicate identical events in same episode
  const dupe = G.memories.find(m=>
    m.type===type && m.subject===subjectId &&
    m.object===objectId && m.episode===episode
  );
  if(dupe) return;
  G.memories.push({ type, subject:subjectId, object:objectId, episode, intensity, seen:false });
  // Prune if over cap — drop the lowest score (oldest + lowest intensity first).
  if(G.memories.length > MEMORY_HARD_CAP){
    G.memories.sort((a,b)=>{
      // Score: higher = keep. Recent + intense beats old + weak.
      const sa = (a.episode||0)*2 + (a.intensity||0)/10;
      const sb = (b.episode||0)*2 + (b.intensity||0)/10;
      return sb - sa;
    });
    G.memories.length = MEMORY_HARD_CAP;
  }
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