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
export { EVOLUTION_RULES, checkArchetypeEvolution, buildEvolutionDisplay, getArchetypeHistory, buildEvolutionCeremony };
