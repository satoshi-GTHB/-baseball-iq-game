const TUTORIAL_CASES=[
  {outs:0,runners:[],runnerText:'ランナーなし',hit:'サード方向',fielder:'THIRD',steps:['FIRST'],title:'まずは1塁でアウト!',explain:'ランナーがいないゴロでは、バッターランナーが向かう1塁へ送球しよう。'},
  {outs:1,runners:['FIRST'],runnerText:'ランナー1塁',hit:'ショート方向',fielder:'SHORT',steps:['SECOND','FIRST'],title:'2塁から1塁へゲッツー!',explain:'1塁ランナーを2塁でフォースアウト。そのあと1塁へ送り、バッターランナーもアウトにしよう。'},
  {outs:0,runners:['SECOND'],runnerText:'ランナー2塁',hit:'ショート方向',fielder:'SHORT',steps:['THIRD','TOUCH_THIRD'],title:'3塁ではタッチが必要!',explain:'後ろの1塁が空いているので、2塁ランナーは3塁へ走らなくてもよいよ。後ろがつまっていないランナーをアウトにするには、ベースをふむだけではなくタッチが必要だよ。'},
  {outs:1,runners:['THIRD'],runnerText:'ランナー3塁',hit:'ファースト方向',fielder:'FIRST',instruction:'1点もやりたくない!',steps:['INFIELD_IN','HOME','TOUCH_HOME'],title:'前進守備でホームアウト!',explain:'ホームでアウトを取るには、内野前進でホームまでの距離を短くすることが必要だよ。ただし、強い打球を捕れず、ヒットにしてしまうリスクもある。それでも監督は3塁ランナーをホームでアウトにすることを優先しているので、指示どおりに動こう。'},
  {outs:1,runners:['THIRD'],runnerText:'ランナー3塁',hit:'セカンド方向',fielder:'SECOND',instruction:'アウト優先!',introTitle:'今回も、ランナー3塁だ！',steps:['INFIELD_IN','INFIELD_NORMAL','FIRST'],title:'確実な1塁アウトを優先!',explain:'「アウト優先!」は監督が点を取られてもいいと言ってるよ。点差が大きく、監督が「アウト優先!」というときは、前進しないで確実なアウトをとって、新しいランナーを出さずに早く試合を終わらせよう！'}
];
const BASE_POS={HOME:[50,84],FIRST:[79,50],SECOND:[50,17],THIRD:[20,50]};
const RUNNER_POS={FIRST:[76,38],SECOND:[39,25],THIRD:[22,60]};
const FIELDER_LAYOUTS={
  normal:{CATCHER:[50,90],FIRST:[76,43],SECOND:[63,27],SHORT:[37,27],THIRD:[24,43]},
  infield:{CATCHER:[50,90],FIRST:[72,51],SECOND:[61,34],SHORT:[39,34],THIRD:[28,51]}
};
const HIT_POS={FIRST:[68,58],SECOND:[60,43],SHORT:[40,43],THIRD:[32,58]};
let tutorialIndex=0;
let stepIndex=0;
let locked=false;
let playCallTimer=null;
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];

function buildFielders(){
  const layer=$('#tutorial-fielder-layer');
  [['CATCHER','2'],['FIRST','3'],['SECOND','4'],['SHORT','6'],['THIRD','5']].forEach(([key,number])=>{
    const player=document.createElement('span');
    player.className='field-player';
    player.dataset.fielder=key;
    player.textContent=number;
    layer.appendChild(player);
  });
}

function placeFielders(infield){
  const layout=infield?FIELDER_LAYOUTS.infield:FIELDER_LAYOUTS.normal;
  $$('#tutorial-fielder-layer .field-player').forEach(player=>{
    const [left,top]=layout[player.dataset.fielder];
    player.style.left=`${left}%`;
    player.style.top=`${top}%`;
  });
}

function renderRunners(runners){
  const layer=$('#tutorial-runner-layer');
  layer.innerHTML='';
  runners.forEach(base=>{
    const runner=document.createElement('div');
    const [left,top]=RUNNER_POS[base];
    runner.className='runner';
    runner.style.left=`${left}%`;
    runner.style.top=`${top}%`;
    runner.innerHTML=`<img class="runner-image" src="assets/runner-${base==='THIRD'?'right':'left'}.png" alt="">`;
    layer.appendChild(runner);
  });
}

function setHitArrow(fielder){
  const [x,y]=HIT_POS[fielder];
  const line=$('#tutorial-hit-arrow line');
  const marker=$('#tutorial-hit-arrow circle');
  line.setAttribute('x2',x);
  line.setAttribute('y2',y);
  marker.setAttribute('cx',x);
  marker.setAttribute('cy',y);
}

function expectedLabel(step){
  if(step==='INFIELD_IN')return 'まず「内野前進」を押してみよう。';
  if(step==='INFIELD_NORMAL')return '監督は「アウト優先!」だよ。もう一度「内野前進」を押して、通常守備に戻そう。';
  if(step.startsWith('TOUCH_'))return '赤くなった「タッチ」を押してみよう。';
  const names={HOME:'ホーム',FIRST:'1塁',SECOND:'2塁',THIRD:'3塁'};
  return `${names[step]}へ送球しよう。ベースを押してみよう。`;
}

function clearGuides(){
  $$('.is-guide').forEach(element=>element.classList.remove('is-guide'));
  $('#tutorial-home-guide-ring').classList.remove('is-showing');
}

function guideNext(){
  clearGuides();
  const step=TUTORIAL_CASES[tutorialIndex].steps[stepIndex];
  const item=TUTORIAL_CASES[tutorialIndex];
  $('#guide-title').textContent=
    stepIndex===0
      ?item.introTitle||'このプレーをやってみよう'
      :'つぎの操作';
  $('#guide-text').textContent=expectedLabel(step);
  if(step==='INFIELD_IN')$('#tutorial-infield-in').classList.add('is-guide');
  else if(step==='INFIELD_NORMAL'){
    $('#tutorial-infield-in').classList.add('is-guide');
    $('#tutorial-manager').classList.add('is-guide');
  }
  else if(step.startsWith('TOUCH_'))$(`[data-touch="${step.replace('TOUCH_','')}"]`).classList.add('is-guide');
  else{
    $(`[data-base="${step}"]`).classList.add('is-guide');
    if(step==='HOME'){
      $('#tutorial-home-guide-ring').classList.add('is-showing');
    }
  }
}

function renderCase(){
  locked=false;
  stepIndex=0;
  const item=TUTORIAL_CASES[tutorialIndex];
  $('#tutorial-progress').textContent=`${tutorialIndex+1} / ${TUTORIAL_CASES.length}`;
  $('#tutorial-outs').textContent=`${item.outs}アウト`;
  $('#tutorial-runners').textContent=item.runnerText;
  $('#tutorial-hit').textContent=item.hit;
  $('#tutorial-instruction').textContent=item.instruction||'';
  $('#tutorial-instruction').hidden=!item.instruction;
  $('#out-light-1').classList.toggle('is-on',item.outs>=1);
  $('#out-light-2').classList.toggle('is-on',item.outs>=2);
  renderRunners(item.runners);
  placeFielders(false);
  setHitArrow(item.fielder);
  $('#tutorial-hit-arrow').classList.remove('has-throw');
  clearTimeout(playCallTimer);
  $$('.tutorial-base').forEach(base=>base.classList.remove('is-done','is-guide'));
  $$('.base-touch-button').forEach(button=>{
    button.disabled=true;
    button.classList.remove('is-ready','is-done','is-guide');
  });
  $('#tutorial-infield-in').hidden=!item.steps.includes('INFIELD_IN');
  $('#tutorial-infield-in').disabled=false;
  $('#tutorial-infield-in').classList.remove('is-guide','is-selected');
  $('#tutorial-manager').hidden=!item.instruction;
  $('#tutorial-manager-text').textContent=item.instruction||'';
  const ball=$('#tutorial-ball');
  const hitStart=HIT_POS[item.fielder];
  ball.classList.add('is-resetting');
  ball.style.left=`${hitStart[0]}%`;
  ball.style.top=`${hitStart[1]}%`;
  ball.style.opacity='0';
  void ball.offsetWidth;
  ball.classList.remove('is-resetting');
  $('#tutorial-out-call').textContent='';
  $('#tutorial-action-status').textContent='';
  $('#tutorial-feedback').hidden=true;
  $('.tutorial-guide').classList.remove('is-explanation');
  guideNext();
}

function showMistake(){
  $('#tutorial-action-status').textContent='黄色く光っているところを押してみよう!';
}

function moveBall(base){
  const [left,top]=BASE_POS[base];
  const ball=$('#tutorial-ball');
  if(stepIndex===0){
    ball.style.opacity='1';
    void ball.offsetWidth;
  }
  $('#tutorial-hit-arrow').classList.add('has-throw');
  requestAnimationFrame(()=>{
    ball.style.left=`${left}%`;
    ball.style.top=`${top}%`;
  });
}

function showPlayCall(text){
  $('#tutorial-out-call').textContent=text;
}

function showOut(){
  showPlayCall('アウト！');
}

function showDoublePlayFinish(){
  showPlayCall('ゲッツー!!');
  clearTimeout(playCallTimer);
  playCallTimer=setTimeout(()=>{
    showPlayCall('チェンジ!!');
  },700);
}

function acceptStep(step,element){
  $('#tutorial-action-status').textContent='';
  element.classList.remove('is-guide');
  if(step==='INFIELD_IN'){
    placeFielders(true);
    element.classList.add('is-selected');
    element.disabled=
      TUTORIAL_CASES[tutorialIndex].steps[stepIndex+1]!=='INFIELD_NORMAL';
  }else if(step==='INFIELD_NORMAL'){
    placeFielders(false);
    element.classList.remove('is-selected');
    element.disabled=true;
  }else if(step.startsWith('TOUCH_')){
    element.classList.remove('is-ready');
    element.classList.add('is-done');
    showOut();
  }else{
    element.classList.add('is-done');
    moveBall(step);
    const next=TUTORIAL_CASES[tutorialIndex].steps[stepIndex+1];
    if(next===`TOUCH_${step}`){
      const touch=$(`[data-touch="${step}"]`);
      touch.disabled=false;
      touch.classList.add('is-ready');
    }else if(tutorialIndex===1 && stepIndex===1){
      showDoublePlayFinish();
    }else{
      showOut();
    }
  }
  stepIndex+=1;
  if(stepIndex<TUTORIAL_CASES[tutorialIndex].steps.length){
    guideNext();
    return;
  }
  locked=true;
  clearGuides();
  const item=TUTORIAL_CASES[tutorialIndex];
  $('.tutorial-guide').classList.add('is-explanation');
  $('#guide-title').textContent=item.title;
  $('#guide-text').textContent=item.explain;
  $('#tutorial-feedback').hidden=false;
  $('#tutorial-next').textContent=tutorialIndex===TUTORIAL_CASES.length-1?'チュートリアルを終わる':'次のれんしゅうへ';
}

$$('.tutorial-base').forEach(base=>base.addEventListener('click',()=>{
  if(locked)return;
  const expected=TUTORIAL_CASES[tutorialIndex].steps[stepIndex];
  if(expected!==base.dataset.base){showMistake();return}
  acceptStep(expected,base);
}));

$$('.base-touch-button').forEach(button=>button.addEventListener('click',()=>{
  if(locked)return;
  const expected=TUTORIAL_CASES[tutorialIndex].steps[stepIndex];
  if(expected!==`TOUCH_${button.dataset.touch}`){showMistake();return}
  acceptStep(expected,button);
}));

$('#tutorial-infield-in').addEventListener('click',()=>{
  if(locked)return;
  const expected=TUTORIAL_CASES[tutorialIndex].steps[stepIndex];
  if(expected!=='INFIELD_IN'&&expected!=='INFIELD_NORMAL'){showMistake();return}
  acceptStep(expected,$('#tutorial-infield-in'));
});

$('#tutorial-next').addEventListener('click',()=>{
  if(tutorialIndex<TUTORIAL_CASES.length-1){
    tutorialIndex+=1;
    renderCase();
    return;
  }
  $('.tutorial-guide').hidden=true;
  $('.tutorial-case').hidden=true;
  $('.tutorial-field-wrap').hidden=true;
  $('#tutorial-infield-in').hidden=true;
  $('#tutorial-feedback').hidden=true;
  $('#tutorial-action-status').hidden=true;
  $('#tutorial-finish').hidden=false;
});

buildFielders();
renderCase();
