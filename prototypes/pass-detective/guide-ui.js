// Guidance is layered onto existing controls so every workflow keeps one source of state.
(()=>{
  document.title='RIPPLE · Explore the next pass';
  const header=document.querySelector('header');
  header.querySelector('.eyebrow').textContent='RIPPLE / Pass Detective';
  header.querySelector('h1').textContent='See the space. Understand the pass.';
  header.querySelector('p').textContent='Explore a football situation, compare passing options, and understand what could close the lane. Start with the example board—no upload or account needed.';
  const board=$('pitch').closest('.panel');
  const player=$('player').closest('.panel');
  const recommendations=$('cards').closest('.panel');
  const assumptions=$('reaction').closest('.panel');
  const evidence=$('evidence').closest('.panel');
  const sections=[
    [board,'tactics','Explore the pitch','Choose Open receiver for a guided example. Select a numbered player, then drag them or use the position sliders below. Choose Make passer to give them the ball. Recommendations update automatically.'],
    [player,'player-settings','Edit one player','Select a player on the pitch or in this menu. X moves them left/right; Y moves them up/down. Facing sets body direction. Other-foot ability describes the assumed skill of their weaker foot.'],
    [recommendations,'pass-options','Choose a passing option','Select a card to highlight its route on the pitch. Solid lines are viable estimates; dashed lines have a detected risk. Use Inspect any teammate to see options outside the top three. Scores out of 100 are rankings, not percentage chances.'],
    [assumptions,'movement-settings','Adjust the assumptions','Keep the defaults for your first try. Increase reaction time to make players react later, or adjust acceleration and top speed. These settings apply to all players. Reset board restores the scenario defaults.'],
    [evidence,'route-evidence','Read the route evidence','After selecting a card, compare ball and defender arrival times here. A positive margin means time remains before the defender arrives; a negative margin means the defender can arrive first. Small positive margins can still fail the model’s safety thresholds.'],
    [studioPanel,'explanations','Understand the decision','Select a passing card first, then choose Explain candidate. Local explanations work without Azure. Test passing window shows how much defender movement changes the result; Animate estimated route previews the calculation, not recorded match footage.'],
    [comparePanel,'compare-pass','Try a what-if comparison','Pin the inspected candidate, return to the pitch, and move a defender. Come back here to compare the same pass before and after. The pinned target stays fixed even if you move its receiver. Clear comparison starts over.'],
    [replayPanel,'match-replay','Practice on a synthetic match','Load a synthetic match, inspect the pitch and select a passing card. Choose inspected candidate records your choice; Reveal observed outcome shows what happened in the synthetic sequence. Next advances the timeline. Exit replay unlocks board editing.'],
    [snapshotPanel,'snapshot-import','Bring your own snapshot','Use an image with all four pitch corners and all 22 players visible. Upload it, click the four requested corners in order, then mark each player’s feet and the ball. Apply mapped snapshot unlocks when every position is marked. Review the passer and player settings afterwards.']
  ];
  for(const [panel,id,title,copy] of sections){
    panel.id=id;panel.tabIndex=-1;
    const help=document.createElement('details');help.className='section-help';
    const summary=document.createElement('summary');summary.textContent='How to use this section';
    const text=document.createElement('p');text.textContent=copy;
    help.append(summary,text);panel.prepend(help);
    if(!panel.querySelector('h2')){const h=document.createElement('h2');h.textContent=title;panel.prepend(h);}
  }
  // Keep the pitch and recommendations together before optional input workflows.
  document.querySelector('.layout').append(replayPanel,snapshotPanel);
  const welcome=document.createElement('section');welcome.className='welcome panel';welcome.id='getting-started';
  welcome.innerHTML=`<div class="welcome-heading"><div><div class="eyebrow">Your first passing analysis</div><h2>Start with one decision.</h2></div><span class="pill">Works without AI setup</span></div>
  <div class="start-grid">
    <div><span class="step-number">01</span><h3>Try a ready-made situation</h3><p>Open a clear passing lane, then close it with a defender and watch the recommendation change.</p><button id="guidedStart" class="primary">Try the guided example →</button></div>
    <div><span class="step-number">02</span><h3>Inspect a passing card</h3><p>Choose a receiver in Passing recommendations. Follow the highlighted route and read its timing evidence.</p><a href="#pass-options">Go to passing options →</a></div>
    <div><span class="step-number">03</span><h3>Find out why</h3><p>Get a plain-language explanation, preview the route, or test how easily a defender can close it.</p><a href="#explanations">Explore explanations →</a></div>
  </div><p class="save-reminder">Your board is temporary. Use <a href="#snapshot-import">Save board JSON</a> before reloading or switching scenarios to keep your work.</p>`;
  const nav=document.createElement('nav');nav.className='section-nav';nav.setAttribute('aria-label','Analysis sections');
  nav.innerHTML='<a href="#tactics">Pitch</a><a href="#pass-options">Passing options</a><a href="#route-evidence">Evidence</a><a href="#explanations">Explain</a><a href="#compare-pass">Compare</a><a href="#match-replay">Match replay</a><a href="#snapshot-import">Screenshot & save</a>';
  document.querySelector('main').prepend(welcome,nav);
  const skip=document.createElement('a');skip.href='#tactics';skip.className='skip-link';skip.textContent='Skip to tactical pitch';document.body.prepend(skip);
  $('guidedStart').onclick=()=>{
    if(replayActive)$('exitReplay').click();
    document.querySelector('[data-scene="open"]').click();
    board.focus();board.scrollIntoView({block:'start'});
  };
  document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
    const target=document.getElementById(link.hash.slice(1));
    if(target){target.tabIndex=-1;target.focus({preventScroll:true});}
  }));
  const glossary=document.createElement('details');glossary.className='section-help';
  glossary.innerHTML='<summary>Football & analysis terms</summary><dl><dt>GK / CB / RB / LB</dt><dd>Goalkeeper, centre-back, right-back and left-back.</dd><dt>DM / CM / RW / LW / ST</dt><dd>Defensive midfielder, central midfielder, right winger, left winger and striker.</dd><dt>To feet / into space</dt><dd>Pass to the receiver’s current position / a nearby point they must run to.</dd><dt>Route / control / release margin</dt><dd>Estimated spare time along the pass / to control the ball / to release it before pressure.</dd></dl>';
  recommendations.append(glossary);
  const extra=document.createElement('details');extra.className='section-help';
  extra.innerHTML='<summary>Replay, language & presentation tools</summary><p>Load a synthetic match to populate turning points and contribution chains. Player Focus filters the recap to one player; Fan or Analyst changes explanation detail. Language changes the supported explanation text; some controls remain in English.</p><p>Broadcast view simplifies the page for presenting. Use the same toggle to return. Show 8-second overlay displays a temporary caption; Export overlay JSON saves caption data, not a video. Ask for an explanation first to give the overlay supporting evidence.</p>';
  studioPanel.append(extra);
  const modelHelp=document.querySelectorAll('.layout > .panel details');
  for(const details of modelHelp){
    if(details.querySelector('summary')?.textContent==='How the model ranks passes'){
      details.querySelector('p').textContent='Passing rankings use local movement and interception calculations. Optional Azure explanations can describe verified evidence; they do not produce these rankings. The experimental CatBoost model is not used in the app.';
    }
  }
})();
