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