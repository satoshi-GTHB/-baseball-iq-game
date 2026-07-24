const LEVELS=[
  {name:'体験生',xp:0,school:'はじめての野球',active:true},
  {name:'入団',xp:20,school:'低学年・基礎',active:true},
  {name:'準レギュラー',xp:60,school:'低学年・判断入門',active:true},
  {name:'レギュラー',xp:120,school:'低学年の到達目標',active:true},
  {name:'オール上尾',xp:220,school:'高学年・発展',active:false},
  {name:'コーチ',xp:350,school:'中級',active:false},
  {name:'監督',xp:500,school:'上級',active:false},
  {name:'NPB',xp:700,school:'高度な状況判断',active:false},
  {name:'メジャー',xp:950,school:'確率とリスク',active:false},
  {name:'殿堂入り',xp:1250,school:'説明・指導レベル',active:false}
];

const PROMOTION={
  1:{attempts:2,rate:.70},
  2:{attempts:3,rate:.75},
  3:{attempts:3,rate:.75}
};

const RUNNERS={
  NONE:[],
  FIRST:['FIRST'],
  SECOND:['SECOND'],
  THIRD:['THIRD'],
  FIRST_SECOND:['FIRST','SECOND'],
  FIRST_THIRD:['FIRST','THIRD'],
  SECOND_THIRD:['SECOND','THIRD'],
  LOADED:['FIRST','SECOND','THIRD']
};

const POS={
  FIRST:[76,38],
  SECOND:[39,25],
  THIRD:[22,60]
};

const HISTORY_STORAGE_KEY='baseballIqAnswerHistoryV1';
const SESSION_SIZE=5;
const DEFENSE_COUNT_STORAGE_KEY='baseballIqDefenseQuestionCountV1';
const DEFENSE_CASE_FREQUENCY_KEY='baseballIqDefenseCaseFrequencyV1';
const DEFENSE_FIELDER_FREQUENCY_KEY='baseballIqDefenseFielderFrequencyV1';
const PROFILE_STORAGE_KEY='baseballIqProfilesV1';
const MAX_PROFILES=5;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function safeParse(value,fallback){
  try{
    return value ? JSON.parse(value) : fallback;
  }catch(error){
    return fallback;
  }
}

function createEmptyProfileData(){
  return {
    xp:0,
    stats:{},
    history:{
      version:1,
      answers:[]
    },
    caseFrequency:{},
    fielderFrequency:{},
    results:[]
  };
}

function normalizeProfileData(data){
  const empty=createEmptyProfileData();

  return {
    ...empty,
    ...(data || {}),
    stats:data?.stats || {},
    history:
      data?.history &&
      Array.isArray(data.history.answers)
        ?data.history
        :empty.history,
    caseFrequency:data?.caseFrequency || {},
    fielderFrequency:data?.fielderFrequency || {},
    results:Array.isArray(data?.results)
      ?data.results
      :[]
  };
}

function loadProfileStore(){
  const saved=safeParse(
    localStorage.getItem(PROFILE_STORAGE_KEY),
    null
  );

  if(
    saved &&
    saved.version===1 &&
    Array.isArray(saved.profiles)
  ){
    const profiles=saved.profiles
      .slice(0,MAX_PROFILES)
      .map(profile=>({
        ...profile,
        data:normalizeProfileData(profile.data)
      }));
    const activeExists=profiles.some(
      profile=>profile.id===saved.activeProfileId
    );

    return {
      version:1,
      legacyMigrated:Boolean(saved.legacyMigrated),
      activeProfileId:activeExists
        ?saved.activeProfileId
        :(profiles[0]?.id || null),
      profiles
    };
  }

  return {
    version:1,
    legacyMigrated:false,
    activeProfileId:null,
    profiles:[]
  };
}

function saveProfileStore(){
  localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify(profileStore)
  );
}

function getActiveProfile(){
  return profileStore.profiles.find(
    profile=>profile.id===profileStore.activeProfileId
  ) || null;
}

function getActiveProfileData(){
  return getActiveProfile()?.data || null;
}

function legacyProfileData(){
  const data=createEmptyProfileData();
  const legacyHistory=safeParse(
    localStorage.getItem(HISTORY_STORAGE_KEY),
    null
  );

  data.xp=Number(
    localStorage.getItem('baseballIqXp') || 0
  );
  data.stats=safeParse(
    localStorage.getItem('baseballIqMastery'),
    {}
  );
  data.history=
    legacyHistory &&
    Array.isArray(legacyHistory.answers)
      ?legacyHistory
      :data.history;
  data.caseFrequency=safeParse(
    localStorage.getItem(DEFENSE_CASE_FREQUENCY_KEY),
    {}
  );
  data.fielderFrequency=safeParse(
    localStorage.getItem(DEFENSE_FIELDER_FREQUENCY_KEY),
    {}
  );

  return data;
}

let profileStore=loadProfileStore();
const initialProfileData=
  getActiveProfileData() ||
  (
    !profileStore.legacyMigrated
      ?legacyProfileData()
      :null
  );

let state={
  mode:'defense',
  index:0,
  score:0,
  xp:Number(initialProfileData?.xp || 0),
  stats:initialProfileData?.stats || {},
  questions:[],
  sessionAnswers:[],
  level:1,
  questionStartedAt:null,
  answering:false,
playSequence:[],
playActions:[],
firstPlayType:null,
firstPlayHadUnneededTouch:false,
playState:{
  active:false,
  outs:0,
  maxOuts:2,
  currentPlayIndex:0,
  runnerTargets:{
    batter:null,
    firstRunner:null,
    secondRunner:null,
    thirdRunner:null
  },
  outRunners:[],
  safeRunners:[],
  nextPlayMustBeSafe:false,
startingOuts:0,
managerInstruction:null,
infieldInSelected:false,
currentPlay:null,
timerId:null,
decisionTimerId:null,
playFinished:false
}
};
function buildRunnerTargets(situation){
  const occupiedBases=RUNNERS[situation] || [];

  return {
    batter:'FIRST',
    firstRunner:occupiedBases.includes('FIRST')?'SECOND':null,
    secondRunner:occupiedBases.includes('SECOND')?'THIRD':null,
    thirdRunner:occupiedBases.includes('THIRD')?'HOME':null
  };
}
function initializePlayState(runnerTargets={},options={}){
  if(state.playState.timerId){
  clearInterval(state.playState.timerId);
  state.playState.timerId=null;
}
if(state.playState.decisionTimerId){
  clearTimeout(state.playState.decisionTimerId);
  state.playState.decisionTimerId=null;
}
if(playTimer){
  playTimer.textContent='2.0';
}
if(playStatus){
  playStatus.textContent='';
  playStatus.classList.remove('is-out','is-safe');
}
document.querySelectorAll('.field .base').forEach(base=>{
  base.classList.remove('is-selected');
});
if(touchControl){
  touchControl.disabled=false;
}
  state.playSequence=[];
  state.playActions=[];
  state.firstPlayType=null;
  state.firstPlayHadUnneededTouch=false;

  state.playState.active=true;
  state.playState.outs=0;
state.playState.startingOuts=Number(options.outs || 0);
state.playState.maxOuts=
  state.playState.startingOuts===2?1:2;
updateOutCount();
  state.playState.managerInstruction=options.instruction || null;
state.playState.infieldInSelected=false;
state.playState.playFinished=false;

state.playState.currentPlay=null;
  state.playState.currentPlayIndex=0;
  state.playState.runnerTargets={
    batter:runnerTargets.batter || null,
    firstRunner:runnerTargets.firstRunner || null,
    secondRunner:runnerTargets.secondRunner || null,
    thirdRunner:runnerTargets.thirdRunner || null
  };
  state.playState.outRunners=[];
  state.playState.safeRunners=[];
  state.playState.nextPlayMustBeSafe=false;
}
function getRunnerHeadingTo(base){
  const targets=state.playState.runnerTargets;

  return Object.keys(targets).find(runner=>{
    return targets[runner]===base
      && !state.playState.outRunners.includes(runner)
      && !state.playState.safeRunners.includes(runner);
  }) || null;
}
function isForcePlay(runner){
  const isActive=(runnerName)=>{
    return state.playState.runnerTargets[runnerName]!==null
      && !state.playState.outRunners.includes(runnerName);
  };

  if(runner==='batter'){
    return true;
  }

  if(runner==='firstRunner'){
    return isActive('batter');
  }

  if(runner==='secondRunner'){
    return isActive('firstRunner')
      && isActive('batter');
  }

  if(runner==='thirdRunner'){
    return isActive('secondRunner')
      && isActive('firstRunner')
      && isActive('batter');
  }

  return false;
}

function getPlayAtBase(base){
  const runner=getRunnerHeadingTo(base);

  if(!runner){
    return null;
  }

  const force=isForcePlay(runner);

  return {
  base,
  runner,
  isForce:force,
  requiresTouch:!force,
  touchSelected:false
};
}

function getBasicPlayResult(play){
  if(!play){
    return null;
  }

if(state.playState.nextPlayMustBeSafe){
  state.playState.nextPlayMustBeSafe=false;

  return {
    result:'SAFE',
    reason:'TIME_LOSS'
  };
}

  if(play.isForce){
    return {
      result:'OUT',
      reason:play.touchSelected
        ? 'UNNEEDED_TOUCH'
        : 'FORCE'
    };
  }

  if(play.touchSelected){
    return {
      result:'OUT',
      reason:'TOUCH'
    };
  }

  return {
    result:'SAFE',
    reason:'MISSED_TOUCH'
  };
}

function recordRunnerOut(runner){
  if(!runner
|| state.playState.outRunners.includes(runner)
|| state.playState.safeRunners.includes(runner)
|| state.playState.outs>=state.playState.maxOuts){
  return false;
}

  state.playState.outRunners.push(runner);
  state.playState.runnerTargets[runner]=null;
  state.playState.outs+=1;
  updateOutCount();

  if(state.playState.outs>=state.playState.maxOuts){
    state.playState.active=false;
  }

  return true;
}

function updateOutCount(){
  if(!outCount){
    return;
  }

  const totalOuts=
    state.playState.startingOuts
    + state.playState.outs;
outLight1?.classList.toggle('is-on', totalOuts >= 1);
outLight2?.classList.toggle('is-on', totalOuts >= 2);
  outCount.textContent=`アウト：${totalOuts}`;
}

function finishBasicPlay(play){
  const q=state.questions[state.index];
  const action={
    base:play.base,
    touch:Boolean(play.touchSelected)
  };
  const evaluation=
    state.mode==='defense' &&
    q?.caseId &&
    window.FUJICON_SPRINT45
      ?evaluateDefenseActions(
        q,
        [...state.playActions, action]
      )
      :null;
  const playResult=evaluation
    ?evaluation.plays[evaluation.plays.length-1]
    :getBasicPlayResult(play);

  if(!playResult){
    return;
  }

  if(evaluation){
    state.playActions.push(action);
    state.playSequence=evaluation.plays.slice();
    state.playState.outs=evaluation.outsAdded;
    state.playState.active=!evaluation.inningOver;
    updateOutCount();
  }

  if(playResult.result==='OUT'){
    if(!evaluation){
      recordRunnerOut(play.runner);
    }
    

const totalOuts=
  state.playState.startingOuts
  + state.playState.outs;

playStatus.textContent=
  totalOuts>=3
    ? 'チェンジ!!'
    : state.playState.outs===2
      ? 'ゲッツー!!'
      : 'アウト！';
      playStatus.classList.remove('is-safe');
playStatus.classList.add('is-out');
  }else{
    if(!evaluation){
      recordRunnerSafe(play.runner);
    }
    playStatus.textContent='セーフ…';
    playStatus.classList.remove('is-out');
playStatus.classList.add('is-safe');
  }

  if(!evaluation){
    recordPlayResult({
      ...play,
      ...playResult
    });
  }else{
    state.playState.currentPlayIndex=state.playSequence.length;
  }

  state.playState.currentPlay=null;
  scheduleDefenseAnswer(evaluation);
}

function evaluateDefenseActions(q,actions){
  return window.FUJICON_SPRINT45.evaluateActions(
    {
      ...q,
      defense:state.playState.infieldInSelected
        ?'INFIELD_IN'
        :'NORMAL'
    },
    actions
  );
}

function defenseGrade(evaluation,q){
  const plays=evaluation.plays;
  const reasons=plays.map(play=>play.reason);
  const isOneOutFirstThird=
    Number(q.outs)===1 &&
    q.situation==='FIRST_THIRD';
  const homeTouchOutOnly=
    isOneOutFirstThird &&
    plays.length===1 &&
    plays[0].base==='HOME' &&
    plays[0].touch &&
    plays[0].result==='OUT';
  const riskyThrowAfterHomeOut=
    isOneOutFirstThird &&
    plays.length===2 &&
    plays[0].base==='HOME' &&
    plays[0].touch &&
    plays[0].result==='OUT' &&
    plays[1].base==='FIRST' &&
    plays[1].result==='SAFE';
  let grade;

  if(homeTouchOutOnly){
    grade='◎';
  }else if(riskyThrowAfterHomeOut){
    grade='△';
  }else if(evaluation.outsAdded===0){
    grade='×';
  }else if(reasons.includes('UNNEEDED_TOUCH')){
    grade='△';
  }else if(evaluation.outsAdded>=2 || evaluation.inningOver){
    grade='◎';
  }else if(plays.length>=2 && plays[1].result==='SAFE'){
    grade=plays[1].base==='SECOND' ?'△':'×';
  }else if(
    reasons.includes('EMPTY_BASE_THROW') ||
    reasons.includes('MISSED_TOUCH') ||
    reasons.includes('THIRD_TOO_LATE') ||
    reasons.includes('HOME_TOO_LATE') ||
    reasons.includes('LATE_EXTRA_THROW')
  ){
    grade='△';
  }else{
    grade='○';
  }

  const hasThirdRunner=
    (RUNNERS[q.situation] || []).includes('THIRD');
  const positioningQuestion=
    Number(q.outs)<2 && hasThirdRunner;
  const expectedInfieldIn=
    q.instruction==='INFIELD_IN';
  const acceptedFirstThirdResult=
    isOneOutFirstThird &&
    (
      homeTouchOutOnly ||
      riskyThrowAfterHomeOut ||
      evaluation.outsAdded>=2
    );

  if(
    positioningQuestion &&
    !acceptedFirstThirdResult &&
    state.playState.infieldInSelected!==expectedInfieldIn
  ){
    const lowerGrade={
      '◎':'○',
      '○':'△',
      '△':'×',
      '×':'×'
    };

    grade=lowerGrade[grade];
  }

  if(
    q.instruction==='INFIELD_IN' &&
    evaluation.runsScored>0 &&
    (grade==='◎' || grade==='○')
  ){
    grade='△';
  }

  return window.FUJICON_SPRINT45.enforceOutFloor(
    grade,
    evaluation.outsAdded
  );
}

function defenseActionCandidates(){
  const bases=['FIRST','SECOND','THIRD','HOME'];
  const actions=[];

  bases.forEach(base=>{
    actions.push({base,touch:false});
    actions.push({base,touch:true});
  });

  return actions;
}

function describeDefenseOut(action,play){
  const baseLabels={
    FIRST:'1塁',
    SECOND:'2塁',
    THIRD:'3塁',
    HOME:'ホーム'
  };
  const runnerLabels={
    batter:'バッターランナー',
    firstRunner:'1塁ランナー',
    secondRunner:'2塁ランナー',
    thirdRunner:'3塁ランナー'
  };
  const method=action.touch
    ?'タッチして'
    :'ベースを踏んで';
  const runner=runnerLabels[play?.runner]||'ランナー';

  return `${baseLabels[action.base]}で${runner}を${method}アウトにする`;
}

function findDoublePlayContinuation(q,evaluation){
  if(
    state.playActions.length!==1 ||
    evaluation.outsAdded!==1 ||
    Number(q.outs)>=2
  ){
    return null;
  }

  const firstAction=state.playActions[0];

  for(const action of defenseActionCandidates()){
    if(action.base===firstAction.base){
      continue;
    }

    const nextEvaluation=evaluateDefenseActions(
      q,
      [firstAction,action]
    );
    const nextPlay=nextEvaluation.plays[1];

    if(
      nextEvaluation.outsAdded>=2 &&
      nextPlay?.result==='OUT' &&
      nextPlay.reason!=='UNNEEDED_TOUCH'
    ){
      return {action,play:nextPlay};
    }
  }

  return null;
}

function findBestDefenseSequence(q){
  const candidates=defenseActionCandidates();
  const sequences=candidates.map(action=>[action]);

  candidates.forEach(firstAction=>{
    candidates.forEach(secondAction=>{
      if(firstAction.base!==secondAction.base){
        sequences.push([firstAction,secondAction]);
      }
    });
  });

  return sequences
    .map(actions=>{
      const evaluation=evaluateDefenseActions(q,actions);
      const grade=defenseGrade(evaluation,q);
      const safePlays=evaluation.plays.filter(
        play=>play.result==='SAFE'
      ).length;

      return {
        actions,
        evaluation,
        points:window.FUJICON_SPRINT45.scoreGrade(grade),
        safePlays
      };
    })
    .sort((a,b)=>{
      return b.points-a.points ||
        b.evaluation.outsAdded-a.evaluation.outsAdded ||
        a.safePlays-b.safePlays ||
        a.actions.length-b.actions.length;
    })[0];
}

function bestDefenseAdvice(q){
  const best=findBestDefenseSequence(q);

  if(!best || !best.evaluation.plays.length){
    return '確実にアウトを取れる塁を選ぼう。';
  }

  const first=describeDefenseOut(
    best.actions[0],
    best.evaluation.plays[0]
  );

  if(
    best.evaluation.outsAdded>=2 &&
    best.actions[1] &&
    best.evaluation.plays[1]?.result==='OUT'
  ){
    const second=describeDefenseOut(
      best.actions[1],
      best.evaluation.plays[1]
    );

    return `この場面では、まず${first}。次に${second}とゲッツーが取れるよ。`;
  }

  return `この場面では、${first}のが確実だよ。`;
}

function defenseAdvice(evaluation,grade){
  const reasons=evaluation.plays.map(play=>play.reason);
  const q=state.questions[state.index];
  const hasThirdRunner=
    (RUNNERS[q.situation] || []).includes('THIRD');
  const expectedInfieldIn=
    q.instruction==='INFIELD_IN';
  const isOneOutFirstThird=
    Number(q.outs)===1 &&
    q.situation==='FIRST_THIRD';
  const homeTouchOutOnly=
    isOneOutFirstThird &&
    evaluation.plays.length===1 &&
    evaluation.plays[0].base==='HOME' &&
    evaluation.plays[0].touch &&
    evaluation.plays[0].result==='OUT';
  const riskyThrowAfterHomeOut=
    isOneOutFirstThird &&
    evaluation.plays.length===2 &&
    evaluation.plays[0].base==='HOME' &&
    evaluation.plays[0].touch &&
    evaluation.plays[0].result==='OUT' &&
    evaluation.plays[1].base==='FIRST' &&
    evaluation.plays[1].result==='SAFE';
  const acceptedFirstThirdResult=
    isOneOutFirstThird &&
    (
      homeTouchOutOnly ||
      riskyThrowAfterHomeOut ||
      evaluation.outsAdded>=2
    );
  const positioningMiss=
    Number(q.outs)<2 &&
    hasThirdRunner &&
    !acceptedFirstThirdResult &&
    state.playState.infieldInSelected!==expectedInfieldIn;
  const runAllowedAgainstInstruction=
    q.instruction==='INFIELD_IN' &&
    evaluation.runsScored>0;
  const result=
    evaluation.inningOver &&
    evaluation.outsAdded>=2
      ?'ゲッツーで2つのアウトを取り、チェンジです。'
      :evaluation.inningOver
      ?'3つ目のアウトでチェンジです。'
      :evaluation.outsAdded>=2
        ?'ゲッツーで2つのアウトを取れました。'
        :evaluation.outsAdded===1
          ?'アウトを1つ取れました。'
           :'アウトを取れませんでした。';
  let reason='確実にアウトを取れる塁を選ぶことが大切です。';
  const doublePlayContinuation=
    findDoublePlayContinuation(q,evaluation);
  const stationaryRunnerPlay=
    evaluation.plays.find(
      play=>play.reason==='STATIONARY_RUNNER_THROW'
    );
  const stationaryRunnerIndex=
    evaluation.plays.indexOf(stationaryRunnerPlay);
  const stationaryRunnerAction=
    stationaryRunnerIndex>=0
      ?state.playActions[stationaryRunnerIndex]
      :null;
  const baseLabels={
    FIRST:'1塁',
    SECOND:'2塁',
    THIRD:'3塁',
    HOME:'ホーム'
  };

  if(runAllowedAgainstInstruction){
    reason='アウトを取っても1点が入りました。「1点もやらない!」では、ホームのランナーをアウトにしよう。';
  }else if(stationaryRunnerPlay){
    const baseLabel=
      baseLabels[stationaryRunnerAction?.base]||'その塁';

    reason=stationaryRunnerAction?.touch
      ?`進塁義務のない${baseLabel}ランナーへのタッチプレーは、ランナーを追うのでアウトが取りづらいよ。確実にアウトが取れる塁へ送球しよう。`
      :`進塁義務のないランナーがいる${baseLabel}へ、タッチせず送球してもアウトにはならないよ。無意味な送球をせず、確実にアウトが取れる塁へ送球しよう。`;
  }else if(positioningMiss){
    reason=expectedInfieldIn
      ?'1点を防ぐ場面では、内野前進を選びましょう。'
      :'アウト優先の場面では、通常の位置で守りましょう。';
  }else if(reasons.includes('MISSED_TOUCH')){
    const missedPlay=evaluation.plays.find(
      play=>play.reason==='MISSED_TOUCH'
    );
    const missedAction=state.playActions[
      evaluation.plays.indexOf(missedPlay)
    ];
    reason=`フォースではないので、${describeDefenseOut(missedAction,missedPlay)}必要があったよ。`;
  }else if(reasons.includes('UNNEEDED_TOUCH')){
    const extraTouchPlay=evaluation.plays.find(
      play=>play.reason==='UNNEEDED_TOUCH'
    );
    const extraTouchAction=state.playActions[
      evaluation.plays.indexOf(extraTouchPlay)
    ];
    reason=`ここはフォースプレーだから、${describeDefenseOut({...extraTouchAction,touch:false},extraTouchPlay)}だけでよかったよ。`;
  }else if(doublePlayContinuation){
    reason=`次に${describeDefenseOut(doublePlayContinuation.action,doublePlayContinuation.play)}と、ゲッツーが取れたよ。`;
  }else if(
    reasons.includes('THIRD_TOO_LATE') ||
    reasons.includes('HOME_TOO_LATE') ||
    reasons.includes('LATE_EXTRA_THROW') ||
    reasons.includes('EMPTY_BASE_THROW')
  ){
    const safePlay=evaluation.plays.find(
      play=>play.result==='SAFE'
    );
    const safeIndex=evaluation.plays.indexOf(safePlay);
    const safeAction=state.playActions[safeIndex];
    reason=evaluation.outsAdded===0
      ?`${baseLabels[safeAction?.base]||'その塁'}への送球は間に合わないよ。${bestDefenseAdvice(q)}`
      :`${baseLabels[safeAction?.base]||'その塁'}への送球は間に合わないよ。アウトを取ったところで止めれば、ミスや進塁を防げたよ。`;
  }else if(evaluation.outsAdded===0 || grade==='×'){
    reason=bestDefenseAdvice(q);
  }else if(grade==='◎'){
    reason='状況に合った最善のプレーを選べました。';
  }else{
    reason=bestDefenseAdvice(q);
  }

  return `${result}\n${reason}`;
}

function defensePlayLabel(actions){
  const labels={
    FIRST:'1塁',
    SECOND:'2塁',
    THIRD:'3塁',
    HOME:'ホーム'
  };

  return actions.map(action=>{
    return `${labels[action.base]}${action.touch?'T':'F'}`;
  }).join('→');
}

function finalizeDefenseAnswer(){
  if(
    state.mode!=='defense' ||
    state.answering ||
    state.playState.playFinished ||
    state.playState.currentPlay ||
    state.playActions.length===0
  ){
    return;
  }

  const q=state.questions[state.index];
  const evaluation=
    evaluateDefenseActions(
      q,
      state.playActions
    );
  const grade=defenseGrade(evaluation,q);
  const points=
    window.FUJICON_SPRINT45.scoreGrade(grade);

  state.playState.playFinished=true;
  state.playState.active=false;

  if(state.playState.timerId){
    clearInterval(state.playState.timerId);
    state.playState.timerId=null;
  }

  if(state.playState.decisionTimerId){
    clearTimeout(state.playState.decisionTimerId);
    state.playState.decisionTimerId=null;
  }

  answer([
    defensePlayLabel(state.playActions),
    grade,
    points,
    defenseAdvice(evaluation,grade)
  ],q);
}

function scheduleDefenseAnswer(evaluation){
  if(!evaluation || state.mode!=='defense'){
    return;
  }

  if(state.playState.decisionTimerId){
    clearTimeout(state.playState.decisionTimerId);
  }

  const delay=
    evaluation.inningOver || state.playActions.length>=2
      ?700
      :2000;

  state.playState.decisionTimerId=setTimeout(()=>{
    state.playState.decisionTimerId=null;
    finalizeDefenseAnswer();
  },delay);
}

function recordRunnerSafe(runner){
  if(!runner
    || state.playState.safeRunners.includes(runner)
    || state.playState.outRunners.includes(runner)){
    return false;
  }

  state.playState.safeRunners.push(runner);

  return true;
}
function recordPlayResult(playResult){
  state.playSequence.push(playResult);

  if(
  playResult.reason==='UNNEEDED_TOUCH'
  || playResult.reason==='TOUCH'
){
  state.playState.nextPlayMustBeSafe=true;
}

  state.playState.currentPlayIndex=state.playSequence.length;
}

function startPlayTimer(play){
  if(!play || !playTimer){
    return;
  }

  if(state.playState.timerId){
    clearInterval(state.playState.timerId);
  }

  const startedAt=Date.now();

  play.touchSelected=false;
  play.timeExpired=false;
  playTimer.textContent='2.0';

  state.playState.timerId=setInterval(()=>{
    const remaining=Math.max(
      0,
      2-(Date.now()-startedAt)/1000
    );

    playTimer.textContent=remaining.toFixed(1);

    if(remaining<=0){
      clearInterval(state.playState.timerId);
      state.playState.timerId=null;
      play.timeExpired=true;
      finishBasicPlay(play);
    }
  },100);
}

function shuffle(items){
  const copy=items.slice();

  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }

  return copy;
}

function show(id){
  $$('.screen').forEach(screen=>{
    screen.classList.remove('active');
  });

  $('#'+id).classList.add('active');

  window.scrollTo(0,0);
}

function loadAnswerHistory(){
  const saved=getActiveProfileData()?.history;

  if(
    saved &&
    saved.version===1 &&
    Array.isArray(saved.answers)
  ){
    return saved;
  }

  return {
    version:1,
    answers:[]
  };
}

function saveAnswerHistory(history){
  const data=getActiveProfileData();

  if(!data){
    return;
  }

  data.history=history;
  saveProfileStore();
}

function getQuestionId(q){
  const bank=QUESTION_BANK[state.mode]||[];
  const originalIndex=bank.indexOf(q);

  if(originalIndex>=0){
    return `${state.mode}-${String(originalIndex+1).padStart(3,'0')}`;
  }

  return `${state.mode}-unknown-${q.difficulty}`;
}

function inferTheme(q){
  const text=`${q.q} ${q.note} ${q.label}`;

  if(text.includes('フォース')){
    return 'フォースアウト';
  }

  if(
    text.includes('タッチアップ') ||
    text.includes('外野フライ') ||
    text.includes('フライ')
  ){
    return 'フライ・帰塁';
  }

  if(q.situation==='LOADED'){
    return '満塁';
  }

  if(
    q.situation==='FIRST_SECOND' ||
    q.situation==='FIRST_THIRD' ||
    q.situation==='SECOND_THIRD'
  ){
    return '複数ランナー';
  }

  if(state.mode==='defense'){
    return '守備の送球判断';
  }

  if(
    text.includes('次に向かう') ||
    text.includes('どこへ進む')
  ){
    return '塁の順番';
  }

  return '走塁判断';
}

function recordAnswer(q,a){
  const [
    selectedAnswer,
    grade,
    xp
  ]=a;

  const correctAnswer=q.answers.find(answer=>{
    return answer[1]==='○';
  });

  const entry={
    questionId:getQuestionId(q),
    mode:state.mode,
    difficulty:q.difficulty,
    situation:q.situation,
    theme:inferTheme(q),
    selectedAnswer:selectedAnswer,
    correctAnswer:correctAnswer
      ?correctAnswer[0]
      :'',
    grade:grade,
    points:xp,
    result:
      grade==='◎' || grade==='○'
        ?'correct'
        :grade==='△'
          ?'partial'
          :'incorrect',
    responseTimeMs:state.questionStartedAt
      ?Date.now()-state.questionStartedAt
      :null,
    answeredAt:new Date().toISOString()
  };

  const history=loadAnswerHistory();

  history.answers.push(entry);

  if(history.answers.length>300){
    history.answers=history.answers.slice(-300);
  }

  saveAnswerHistory(history);

  state.sessionAnswers.push(entry);
}

function mastery(level){
  const data=state.stats[level]||{
    attempts:0,
    points:0
  };

  return {
    attempts:data.attempts,
    rate:data.attempts
      ?data.points/(data.attempts*10)
      :0
  };
}

function calculateLevel(){
  let level=1;

  for(let current=1;current<=3;current++){
    const next=LEVELS[current];
    const currentMastery=mastery(current);
    const rule=PROMOTION[current];

    if(
      state.xp>=next.xp &&
      currentMastery.attempts>=rule.attempts &&
      currentMastery.rate>=rule.rate
    ){
      level=current+1;
    }else{
      break;
    }
  }

  return level;
}

function promotionText(){
  const level=state.level;

  if(level===4){
    return '低学年の目標「レギュラー」到達！ 発展編はβ版以降で追加します。';
  }

  const next=LEVELS[level];
  const currentMastery=mastery(level);
  const rule=PROMOTION[level];

  return `次の「${next.name}」まで：XP ${Math.max(0,next.xp-state.xp)}／レベル${level}問題 ${currentMastery.attempts}/${rule.attempts}問／理解度 ${Math.round(currentMastery.rate*100)}%（目標${Math.round(rule.rate*100)}%）`;
}

function updateLevel(){
  state.level=calculateLevel();

  const info=LEVELS[state.level-1];

  $$('[data-xp]').forEach(element=>{
    element.textContent=state.xp;
  });

  $$('[data-level]').forEach(element=>{
    element.textContent=state.level;
  });

  $$('[data-level-name]').forEach(element=>{
    element.textContent=info.name;
  });

  const curriculum=$('#curriculum-status');

  if(curriculum){
    curriculum.textContent=
      `現在：Lv.${state.level} ${info.name}｜${info.school}`;
  }

  const promotion=$('#promotion-status');

  if(promotion){
    promotion.textContent=promotionText();
  }
}

function createSession(mode){
  if(
    mode==='defense' &&
    window.FUJICON_SPRINT45
  ){
    return createBalancedDefenseSession(
      getSelectedDefenseQuestionCount()
    );
  }

  const bank=QUESTION_BANK[mode]||[];

  const sameLevel=shuffle(
    bank.filter(question=>{
      return question.difficulty===state.level;
    })
  );

  const lowerLevel=shuffle(
    bank
      .filter(question=>{
        return question.difficulty<state.level;
      })
      .sort((a,b)=>{
        return b.difficulty-a.difficulty;
      })
  );

  const higherLevel=shuffle(
    bank
      .filter(question=>{
        return question.difficulty>state.level;
      })
      .sort((a,b)=>{
        return a.difficulty-b.difficulty;
      })
  );

  const pool=[
    ...sameLevel,
    ...lowerLevel,
    ...higherLevel
  ];

  if(!pool.length){
    return [];
  }

  const result=[];
  let cursor=0;

  while(result.length<SESSION_SIZE){
    result.push(
      pool[cursor%pool.length]
    );

    cursor++;
  }

  return result;
}

function getSelectedDefenseQuestionCount(){
  const saved=Number(
    localStorage.getItem(DEFENSE_COUNT_STORAGE_KEY)
  );

  return [10,15,20].includes(saved)
    ? saved
    : 15;
}

function selectLeastSeen(items,counts,count,getKey){
  return shuffle(items)
    .sort((a,b)=>{
      return (counts[getKey(a)]||0)-
        (counts[getKey(b)]||0);
    })
    .slice(0,count);
}

function createBalancedDefenseSession(questionCount){
  const allQuestions=
    window.FUJICON_SPRINT45.createDefenseSession();
  const profileData=
    getActiveProfileData();
  const caseCounts=
    profileData?.caseFrequency || {};
  const fielderCounts=
    profileData?.fielderFrequency || {};
  const selected=selectLeastSeen(
    allQuestions,
    caseCounts,
    questionCount,
    question=>question.caseId
  );
  const fielders=
    window.FUJICON_SPRINT45.FIELDERS;
  const fielderPool=[
    fielders.FIRST,
    fielders.SECOND,
    fielders.SHORT,
    fielders.THIRD
  ];

  selected.forEach(question=>{
    const fielder=selectLeastSeen(
      fielderPool,
      fielderCounts,
      1,
      value=>value
    )[0];

    question.fielder=fielder;
    question.note=
      `${window.FUJICON_SPRINT45.FIELDER_LABELS[fielder]}が捕球`;
    caseCounts[question.caseId]=
      (caseCounts[question.caseId]||0)+1;
    fielderCounts[fielder]=
      (fielderCounts[fielder]||0)+1;
  });

  if(profileData){
    profileData.caseFrequency=caseCounts;
    profileData.fielderFrequency=fielderCounts;
    saveProfileStore();
  }

  return shuffle(selected);
}

function runnerSvgOld(direction='right'){
  return `
    <svg viewBox="0 0 86 94" aria-hidden="true">
      <g transform="${direction === 'left' ? 'translate(86 0) scale(-1 1)' : ''} rotate(-7 43 47)">
        <ellipse
          cx="43"
          cy="88"
          rx="26"
          ry="5"
          fill="#06284a"
          opacity=".18"
        />

        <path
          d="M28 17 Q43 3 60 17 L58 28 Q43 22 27 29Z"
          fill="#06284a"
          stroke="#fff"
          stroke-width="2"
        />

        <path
          d="M55 16 L72 23 Q62 28 54 25Z"
          fill="#06284a"
          stroke="#fff"
          stroke-width="2"
        />
<text
  x="43"
  y="23"
  text-anchor="middle"
  font-size="12"
  font-weight="900"
  fill="#fff"
  transform="${direction === 'left' ? 'translate(86 0) scale(-1 1)' : ''}"
>
  F
</text>

        <circle
          cx="44"
          cy="31"
          r="13"
          fill="#f2bd93"
          stroke="#06284a"
          stroke-width="3"
        />

        <circle
          cx="40"
          cy="30"
          r="1.7"
          fill="#152338"
        />

        <circle
          cx="49"
          cy="30"
          r="1.7"
          fill="#152338"
        />

        <path
          d="M40 36 Q45 40 50 35"
          fill="none"
          stroke="#8b4e32"
          stroke-width="2"
          stroke-linecap="round"
        />

        <path
          d="M29 43 Q43 38 58 45 L57 66 Q43 73 28 64Z"
          fill="#06284a"
          stroke="#fff"
          stroke-width="3"
        />

        <path
          d="M34 46 L52 46"
          stroke="#dc2638"
          stroke-width="4"
        />

        <text
          x="43"
          y="58"
          text-anchor="middle"
          font-size="8"
          font-weight="900"
          fill="#fff"
          transform="${direction === 'left' ? 'translate(86 0) scale(-1 1)' : ''}"
        >
          FUJICON
        </text>

        <path
          d="M31 48 L17 61"
          stroke="#f2bd93"
          stroke-width="7"
          stroke-linecap="round"
        />

        <path
          d="M56 48 L72 38"
          stroke="#f2bd93"
          stroke-width="7"
          stroke-linecap="round"
        />

        <path
          d="M35 66 L22 83"
          stroke="#fff"
          stroke-width="9"
          stroke-linecap="round"
        />

        <path
          d="M51 66 L68 79"
          stroke="#fff"
          stroke-width="9"
          stroke-linecap="round"
        />

        <path
          d="M20 84 L8 85"
          stroke="#06284a"
          stroke-width="7"
          stroke-linecap="round"
        />

        <path
          d="M67 80 L77 86"
          stroke="#06284a"
          stroke-width="7"
          stroke-linecap="round"
        />

        <path
          d="M25 64 L59 64"
          stroke="#dc2638"
          stroke-width="3"
        />
      </g>
    </svg>
  `;
}
function runnerSvg(direction='right'){
  const textFix = direction === 'left'
    ? 'translate(86 0) scale(-1 1)'
    : '';

  return `
    <svg viewBox="0 0 86 94" aria-hidden="true">
      <ellipse
        cx="43"
        cy="88"
        rx="24"
        ry="5"
        fill="#06284a"
        opacity=".16"
      />

      <g transform="${direction === 'left' ? 'translate(86 0) scale(-1 1)' : ''} rotate(-6 43 47)">
        <path
          d="M31 62 L23 80"
          stroke="#fff"
          stroke-width="10"
          stroke-linecap="round"
        />
        <path
          d="M49 63 L64 77"
          stroke="#fff"
          stroke-width="10"
          stroke-linecap="round"
        />

        <path
          d="M22 80 L12 82"
          stroke="#06284a"
          stroke-width="7"
          stroke-linecap="round"
        />
        <path
          d="M63 77 L75 82"
          stroke="#06284a"
          stroke-width="7"
          stroke-linecap="round"
        />

        <path
          d="M29 43 Q43 37 57 43 L55 64 Q43 72 31 64 Z"
          fill="#0a2f67"
          stroke="#fff"
          stroke-width="2.5"
          stroke-linejoin="round"
        />

        <path
          d="M31 49 L55 49"
          stroke="#dc2638"
          stroke-width="5"
        />

        <text
          x="43"
          y="58"
          text-anchor="middle"
          font-size="7"
          font-weight="900"
          fill="#fff"
          transform="${textFix}"
        >
          FUJICON
        </text>

        <path
          d="M31 47 L18 59"
          stroke="#f2bd93"
          stroke-width="7"
          stroke-linecap="round"
        />
        <path
          d="M55 47 L68 38"
          stroke="#f2bd93"
          stroke-width="7"
          stroke-linecap="round"
        />

        <circle
          cx="43"
          cy="31"
          r="13"
          fill="#f2bd93"
          stroke="#06284a"
          stroke-width="2.5"
        />

        <circle cx="39" cy="30" r="1.6" fill="#13243a" />
        <circle cx="47" cy="30" r="1.6" fill="#13243a" />

        <path
          d="M39 35 Q43 38 47 35"
          fill="none"
          stroke="#8b4e32"
          stroke-width="2"
          stroke-linecap="round"
        />

        <path
          d="M27 21 Q43 10 60 18 L57 31 Q43 25 29 31 Z"
          fill="#0a2f67"
          stroke="#fff"
          stroke-width="2.5"
          stroke-linejoin="round"
        />

        <path
          d="M55 20 L72 26 Q62 31 54 28 Z"
          fill="#0a2f67"
          stroke="#fff"
          stroke-width="2.5"
          stroke-linejoin="round"
        />

        <text
          x="43"
          y="25"
          text-anchor="middle"
          font-size="12"
          font-weight="900"
          fill="#fff"
          transform="${textFix}"
        >
          F
        </text>
      </g>
    </svg>
  `;
}
function renderField(q){
  const layer=$('#runner-layer');

  layer.innerHTML='';

  const runners=RUNNERS[q.situation]||[];

  runners.forEach(base=>{
    const position=POS[base];
    const x=position[0];
    const y=position[1];
    const self=q.self===base;

    const element=document.createElement('div');

    element.className=
      'runner'+
      (self?' self':'');

    element.style.left=x+'%';
    element.style.top=y+'%';

    element.innerHTML = `${self ? '<span class="self-label">自分</span>' : ''}<img class="runner-image" src="assets/runner-${base === 'THIRD' ? 'right' : 'left'}.png" alt="">`;

    layer.appendChild(element);
  });

  renderBattedBallDirection(q);
  renderManagerGuidance(q);
}

function renderManagerGuidance(q){
  const guidance=$('#manager-guidance');
  const hasThirdRunner=
    (RUNNERS[q.situation] || []).includes('THIRD');
  const shouldShow=
    state.mode==='defense' &&
    Number(q.outs)<2 &&
    hasThirdRunner;

  guidance.hidden=!shouldShow;

  if(!shouldShow){
    return;
  }

  $('#manager-guidance-text').textContent=
    q.instruction==='INFIELD_IN'
      ?'1点もやらない!'
      :'アウト優先!';
}

function renderBattedBallDirection(q){
  const direction=$('#batted-ball-direction');

  if(!direction){
    return;
  }

  if(state.mode!=='defense' || !q.fielder){
    direction.hidden=true;
    return;
  }

  const positions={
    FIRST:{x:68,y:58,label:'ファースト'},
    SECOND:{x:60,y:43,label:'セカンド'},
    SHORT:{x:40,y:43,label:'ショート'},
    THIRD:{x:32,y:58,label:'サード'}
  };
  const position=positions[q.fielder];

  if(!position){
    direction.hidden=true;
    return;
  }

  direction.hidden=false;
  $('#batted-ball-line').setAttribute('x2',position.x);
  $('#batted-ball-line').setAttribute('y2',position.y);
  $('#batted-ball-marker').setAttribute('cx',position.x);
  $('#batted-ball-marker').setAttribute('cy',position.y);

  direction.classList.remove('is-animating');
  void direction.getBoundingClientRect();
  direction.classList.add('is-animating');
}

function renderQuestion(){
  const q=state.questions[state.index];

  state.questionStartedAt=Date.now();
  state.answering=false;

  $('#mode-title').textContent=
    state.mode==='defense'
      ?'内野守備編'
      :'ランナー編';

  $('#question-count').textContent=
    `${state.index+1} / ${state.questions.length}`;

  $('#situation-tag').textContent=
    q.label;

  $('#role-tag').textContent=
    q.caseId
      ?`${q.caseId}｜${window.FUJICON_SPRINT45.FIELDER_LABELS[q.fielder]}`
      :`Lv.${q.difficulty} ${LEVELS[q.difficulty-1].name}`;

  $('#question-text').textContent=
    q.q;

  $('#question-note').textContent=
    q.note;

  $('#field-caption').textContent=
    state.mode==='runner'
      ?'「自分」の位置と他のランナーを確認しよう'
      :'ランナーの配置を確認しよう';

  renderField(q);
  if(state.mode==='defense'){
  initializePlayState(
  window.FUJICON_SPRINT45
    ?window.FUJICON_SPRINT45.buildRunnerTargets(
      q.situation,
      q.outs
    )
    :buildRunnerTargets(q.situation),
  {outs:q.outs, instruction:q.instruction}
);
}
const infieldInButton=$('#infield-in-button');
const hasThirdRunner=
  (RUNNERS[q.situation] || []).includes('THIRD');
const showInfieldInInstruction=
  state.mode==='defense' &&
  Number(q.outs)<2 &&
  hasThirdRunner;

infieldInButton.hidden=
  !showInfieldInInstruction;
  infieldInButton.disabled=false;
  infieldInButton.classList.remove('is-selected');

  const answersBox=$('#answers');
  answersBox.style.display=state.mode==='defense'?'none':'';

  answersBox.innerHTML='';

  q.answers.forEach(answerData=>{
    const button=document.createElement('button');

    button.type='button';
    button.className='answer';
    button.textContent=answerData[0];

    button.addEventListener('click',()=>{
      answer(answerData,q);
    });

    answersBox.appendChild(button);
  });
}

function start(mode){
  if(!getActiveProfile()){
    $('#profile-error').textContent=
      '名前を登録して選んでください。';
    show('home');
    return;
  }

  state.mode=mode;
  state.index=0;
  state.score=0;
  state.sessionAnswers=[];
  state.questions=createSession(mode);

  if(!state.questions.length){
    alert('問題は準備中です。');
    return;
  }

  renderQuestion();
  show('quiz');
}

function renderFeedbackReview(q){
  const review=$('#feedback-review');

  if(!review){
    return;
  }

  const isDefense=
    state.mode==='defense' && q?.caseId;

  review.hidden=!isDefense;

  if(!isDefense){
    return;
  }

  const hasThirdRunner=
    (RUNNERS[q.situation] || []).includes('THIRD');
  const direction=
    window.FUJICON_SPRINT45
      ?.FIELDER_LABELS[q.fielder] || '';
  const baseLabels={
    FIRST:'1塁',
    SECOND:'2塁',
    THIRD:'3塁',
    HOME:'ホーム'
  };
  const answerText=state.playActions.length
    ?state.playActions.map((action,index)=>{
      const touch=action.touch
        ?'タッチあり'
        :'タッチなし';

      const orderMarks=['①','②'];

      return `${orderMarks[index] || `${index+1}.`}${baseLabels[action.base]}（${touch}）`;
    }).join('\n')
    :'送球なし';

  $('#review-outs').textContent=
    `${Number(q.outs)}アウト`;
  $('#review-runners').textContent=
    q.label.replace(/^走者/,'') || 'なし';
  $('#review-direction').textContent=
    `${direction}方向`;
  $('#review-answer').textContent=
    answerText;

  const instructionRow=
    $('#review-instruction-row');
  const defenseRow=
    $('#review-defense-row');

  instructionRow.hidden=!hasThirdRunner;
  defenseRow.hidden=!hasThirdRunner;

  if(hasThirdRunner){
    $('#review-instruction').textContent=
      q.instruction==='INFIELD_IN'
        ?'「1点もやらない!」'
        :'「アウト優先!」';
    $('#review-defense').textContent=
      state.playState.infieldInSelected
        ?'内野前進を選択'
        :'通常守備を選択';
  }
}

function persistActiveProfileProgress(){
  const data=getActiveProfileData();

  if(!data){
    return;
  }

  data.xp=state.xp;
  data.stats=state.stats;
  saveProfileStore();
}

function answer(answerData,q){
  if(state.answering){
    return;
  }

  state.answering=true;

  $$('.answer').forEach(button=>{
    button.disabled=true;
  });

  const grade=answerData[1];
  const xp=answerData[2];
  const explanation=answerData[3];

  recordAnswer(q,answerData);

  state.xp+=xp;
  state.score+=xp;

  const key=String(q.difficulty);

  const stat=state.stats[key]||{
    attempts:0,
    points:0
  };

  stat.attempts+=1;
  stat.points+=xp;

  state.stats[key]=stat;

  persistActiveProfileProgress();

  updateLevel();
  renderFeedbackReview(q);

  $('#judge').textContent=
    grade;

  $('#judge').className=
    'judge '+
    (
      grade==='△'
        ?'triangle'
        :grade==='×'
          ?'cross'
          :''
    );

  $('#judge-title').textContent=
    grade==='◎'
      ?'最善の判断！'
      :grade==='○'
        ?'よい判断！'
      :grade==='△'
        ?'改善できる判断！'
        :'もう一度考えよう！';

  $('#feedback-text').textContent=
    explanation;

  $('#gain').textContent=
    xp;

  $('#next').textContent=
    state.index===state.questions.length-1
      ?'結果を見る'
      :'次へ';

  show('feedback');
}

function ensureCoachBox(){
  let coachBox=$('#coach-result');

  if(coachBox){
    return coachBox;
  }

  coachBox=document.createElement('section');

  coachBox.id='coach-result';

  coachBox.style.cssText=`
    margin:10px 0;
    padding:12px;
    border-radius:18px;
    background:#f2f7fb;
    border:2px solid #d7e4ee;
    text-align:left;
  `;

  coachBox.innerHTML=`
    <strong
      style="
        display:block;
        color:#06284a;
        font-size:18px;
      "
    >
      🧢 『トミー監督』からひとこと
    </strong>

    <p
      id="coach-comment"
      style="
        line-height:1.45;
        margin:7px 0 10px;
      "
    ></p>

    <div
      style="
        border-top:1px solid #d9e3ec;
        padding-top:9px;
      "
    >
      <small
        style="
          color:#68788c;
          font-weight:800;
        "
      >
        今回の理解度
      </small>

      <b
        id="mastery-label"
        style="
          display:block;
          color:#06284a;
          margin-top:3px;
        "
      ></b>
    </div>

    <div
      style="
        border-top:1px solid #d9e3ec;
        padding-top:9px;
        margin-top:9px;
      "
    >
      <small
        style="
          color:#68788c;
          font-weight:800;
        "
      >
        次のおすすめ
      </small>

      <b
        id="recommendation"
        style="
          display:block;
          color:#dc2638;
          margin-top:3px;
        "
      ></b>
    </div>
  `;

  $('#result-score')
    .insertAdjacentElement(
      'afterend',
      coachBox
    );

  return coachBox;
}

function sessionAnalysis(){
  const answers=state.sessionAnswers;

  const best=answers.filter(answer=>{
    return answer.grade==='◎';
  }).length;

  const correct=answers.filter(answer=>{
    return (
      answer.grade==='◎' ||
      answer.grade==='○'
    );
  }).length;

  const partial=answers.filter(answer=>{
    return answer.grade==='△';
  }).length;

  const maxPoints=
    answers.length*3;

  const rate=maxPoints
    ?state.score/maxPoints
    :0;

  const themeStats={};

  answers.forEach(answer=>{
    if(!themeStats[answer.theme]){
      themeStats[answer.theme]={
        attempts:0,
        points:0
      };
    }

    themeStats[answer.theme].attempts+=1;
    themeStats[answer.theme].points+=answer.points;
  });

  const weakest=
    Object
      .entries(themeStats)
      .sort((a,b)=>{
        const rateA=
          a[1].points/
          (a[1].attempts*3);

        const rateB=
          b[1].points/
          (b[1].attempts*3);

        return rateA-rateB;
      })[0];

  let masteryLabel='もう一度チャレンジ';

  if(rate>=.9){
    masteryLabel='ばっちり！';
  }else if(rate>=.7){
    masteryLabel='よく理解できている';
  }else if(rate>=.5){
    masteryLabel='あと一歩';
  }

  let comment='';

  if(best===answers.length && answers.length){
    comment=
      `${answers.length}問すべて最善の判断！状況を見て、落ち着いて判断できています。次は、なぜその答えなのかも声に出して説明してみよう。`;
  }else if(rate>=.7){
    comment=
      `${best}問で最善の判断ができました。間違いも大切な練習です。迷った場面だけ、もう一度確認すればさらに強くなれます。`;
  }else{
    comment=
      `今回は${best}問で最善の判断ができました。不正解は大歓迎！ランナーの位置と「進まなければならない塁」を順番に確認しよう。`;
  }

  const recommendation=
    weakest
      ?`「${weakest[0]}」を意識して、同じ編をもう一度${state.questions.length}問！`
      :`同じ編をもう一度${state.questions.length}問！`;

  return {
    best,
    correct,
    partial,
    rate,
    masteryLabel,
    comment,
    recommendation
  };
}

function showResult(){
  ensureCoachBox();

  const max=
    state.questions.length*3;
  const scoreRate=
    max ? state.score/max : 0;
  const scorePercent=
    Math.round(scoreRate*100);

  const analysis=
    sessionAnalysis();

  $('#result-score').textContent=
    `獲得 ${state.score} / ${max}点（${scorePercent}%）｜よい判断 ${analysis.correct}問・おしい ${analysis.partial}問`;

  $('#result-title').textContent=
    scoreRate>=.8
      ?'ナイス判断！'
      :scoreRate>=.6
        ?'あと一歩！'
        :'間違いから強くなろう！';

  $('#coach-comment').textContent=
    analysis.comment;

  $('#mastery-label').textContent=
    analysis.masteryLabel;

  $('#recommendation').textContent=
    analysis.recommendation;

  $('#retry').textContent=
    `もう一度${state.questions.length}問`;

  const profileData=getActiveProfileData();

  if(profileData){
    profileData.results.push({
      playedAt:new Date().toISOString(),
      mode:state.mode,
      questionCount:state.questions.length,
      score:state.score,
      maxScore:max,
      scorePercent
    });

    if(profileData.results.length>50){
      profileData.results=
        profileData.results.slice(-50);
    }

    saveProfileStore();
  }

  show('result');
}

function next(){
  state.index+=1;

  if(state.index>=state.questions.length){
    showResult();
    return;
  }

  renderQuestion();
  show('quiz');
}

function syncStateFromActiveProfile(){
  const data=getActiveProfileData();

  state.xp=Number(data?.xp || 0);
  state.stats=data?.stats || {};
  updateLevel();
}

function hideProfileForm(){
  $('#profile-form').hidden=true;
  $('#profile-name').value='';
  $('#profile-error').textContent='';
}

function renderProfiles(){
  const list=$('#profile-list');
  const activeProfile=getActiveProfile();

  list.innerHTML='';

  profileStore.profiles.forEach(profile=>{
    const row=document.createElement('div');
    const selectButton=document.createElement('button');
    const deleteButton=document.createElement('button');

    row.className='profile-row';
    selectButton.type='button';
    selectButton.className='profile-select';
    selectButton.textContent=
      profile.id===profileStore.activeProfileId
        ?`✓ ${profile.name}`
        :profile.name;
    selectButton.classList.toggle(
      'is-selected',
      profile.id===profileStore.activeProfileId
    );
    selectButton.setAttribute(
      'aria-pressed',
      String(profile.id===profileStore.activeProfileId)
    );
    selectButton.addEventListener('click',()=>{
      profileStore.activeProfileId=profile.id;
      saveProfileStore();
      syncStateFromActiveProfile();
      renderProfiles();
    });

    deleteButton.type='button';
    deleteButton.className='profile-delete';
    deleteButton.textContent='削除';
    deleteButton.setAttribute(
      'aria-label',
      `${profile.name}の登録と成績を削除`
    );
    deleteButton.addEventListener('click',()=>{
      const approved=window.confirm(
        `${profile.name}の登録と過去結果を削除しますか？`
      );

      if(!approved){
        return;
      }

      profileStore.profiles=
        profileStore.profiles.filter(
          item=>item.id!==profile.id
        );

      if(profileStore.activeProfileId===profile.id){
        profileStore.activeProfileId=
          profileStore.profiles[0]?.id || null;
      }

      saveProfileStore();
      syncStateFromActiveProfile();
      renderProfiles();
    });

    row.append(selectButton,deleteButton);
    list.appendChild(row);
  });

  $('#profile-count').textContent=
    `${profileStore.profiles.length} / ${MAX_PROFILES}人`;
  $('#profile-empty').hidden=
    profileStore.profiles.length>0;
  $('#show-profile-form').hidden=
    profileStore.profiles.length>=MAX_PROFILES;

  const startButton=$('[data-mode="defense"]');

  if(startButton){
    startButton.disabled=!activeProfile;
    startButton.textContent=activeProfile
      ?'スタート'
      :'名前を登録してください';
  }
}

$('#show-profile-form').addEventListener('click',()=>{
  $('#profile-form').hidden=false;
  $('#profile-error').textContent='';
  $('#profile-name').focus();
});

$('#cancel-profile-form').addEventListener('click',()=>{
  hideProfileForm();
});

$('#profile-form').addEventListener('submit',event=>{
  event.preventDefault();

  const name=$('#profile-name').value.trim();

  if(!name){
    $('#profile-error').textContent=
      '名前を入力してください。';
    return;
  }

  if(profileStore.profiles.length>=MAX_PROFILES){
    $('#profile-error').textContent=
      '登録できるのは5人までです。';
    return;
  }

  if(
    profileStore.profiles.some(
      profile=>profile.name===name
    )
  ){
    $('#profile-error').textContent=
      '同じ名前が登録されています。';
    return;
  }

  const shouldMigrateLegacy=
    !profileStore.legacyMigrated;
  const profile={
    id:`p-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    name,
    createdAt:new Date().toISOString(),
    data:shouldMigrateLegacy
      ?legacyProfileData()
      :createEmptyProfileData()
  };

  profileStore.profiles.push(profile);
  profileStore.legacyMigrated=true;
  profileStore.activeProfileId=profile.id;
  saveProfileStore();
  hideProfileForm();
  syncStateFromActiveProfile();
  renderProfiles();
});

renderProfiles();

if(location.hash==='#game'){
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}`
  );

  if(getActiveProfile()){
    start('defense');
  }else{
    $('#profile-form').hidden=false;
    $('#show-profile-form').hidden=true;
    $('#profile-error').textContent=
      '名前を登録して選んでください。';
    show('home');
  }
}

$$('[data-mode]').forEach(button=>{
  button.addEventListener('click',()=>{
    start(button.dataset.mode);
  });
});

function renderDefenseQuestionCountPicker(){
  const selected=
    getSelectedDefenseQuestionCount();

  $$('[data-question-count]').forEach(button=>{
    const active=
      Number(button.dataset.questionCount)===selected;

    button.classList.toggle(
      'is-selected',
      active
    );
    button.setAttribute(
      'aria-pressed',
      String(active)
    );
  });
}

$$('[data-question-count]').forEach(button=>{
  button.addEventListener('click',()=>{
    localStorage.setItem(
      DEFENSE_COUNT_STORAGE_KEY,
      button.dataset.questionCount
    );
    renderDefenseQuestionCountPicker();
  });
});

renderDefenseQuestionCountPicker();

$('#back-home').addEventListener('click',()=>{
  show('home');
});

$('#next').addEventListener('click',()=>{
  next();
});

$('#retry').addEventListener('click',()=>{
  start(state.mode);
});

$('#result-home').addEventListener('click',()=>{
  show('home');
});

window.FUJICON_DEBUG={
  getHistory(){
    return loadAnswerHistory();
  },

  resetHistory(){
    const emptyHistory={
      version:1,
      answers:[]
    };

    saveAnswerHistory(emptyHistory);

    return emptyHistory;
  },

  resetAll(){
    localStorage.removeItem(
      PROFILE_STORAGE_KEY
    );

    localStorage.removeItem(
      HISTORY_STORAGE_KEY
    );

    localStorage.removeItem(
      DEFENSE_COUNT_STORAGE_KEY
    );

    localStorage.removeItem(
      DEFENSE_CASE_FREQUENCY_KEY
    );

    localStorage.removeItem(
      DEFENSE_FIELDER_FREQUENCY_KEY
    );

    localStorage.removeItem(
      'baseballIqXp'
    );

    localStorage.removeItem(
      'baseballIqMastery'
    );

    location.reload();
  }
};

const infieldInControl=$('#infield-in-button');

const touchControl=$('#touch-button');

const playTimer=$('#play-timer');

const outCount=$('#out-count');
const outLight1=$('#out-light-1');
const outLight2=$('#out-light-2');

const playStatus=$('#play-status');

infieldInControl.addEventListener('click',()=>{
  if(
    state.mode!=='defense'
    || infieldInControl.hidden
    || state.playState.playFinished
    || state.playActions.length>0
    || state.playState.currentPlay
  ){
    return;
  }

  state.playState.infieldInSelected=
    !state.playState.infieldInSelected;
  infieldInControl.classList.toggle(
    'is-selected',
    state.playState.infieldInSelected
  );
});

touchControl.addEventListener('click',()=>{

  const play=state.playState.currentPlay;

  if(
    state.mode!=='defense'
    || state.playState.playFinished
    || !play
  ){
    return;
  }

  play.touchSelected=true;

  clearInterval(state.playState.timerId);
state.playState.timerId=null;
play.timeExpired=false;
finishBasicPlay(play);
});

updateLevel();// Sprint4.1 ベースをタップすると光る
document.querySelectorAll('.field .base').forEach((base) => {
  base.addEventListener('click', () => {
    if(
      state.mode!=='defense' ||
      state.answering ||
      state.playState.playFinished
    ){
      return;
    }

    if(state.playState.decisionTimerId){
      clearTimeout(state.playState.decisionTimerId);
      state.playState.decisionTimerId=null;
    }

    const tappedBase=
  base.classList.contains('home')?'HOME':
  base.classList.contains('first')?'FIRST':
  base.classList.contains('second')?'SECOND':
  base.classList.contains('third')?'THIRD':
  null;

const currentPlay=state.playState.currentPlay;

if(currentPlay){
  if(state.playState.timerId){
    clearInterval(state.playState.timerId);
    state.playState.timerId=null;
  }

  finishBasicPlay(currentPlay);

  if(state.playState.decisionTimerId){
    clearTimeout(state.playState.decisionTimerId);
    state.playState.decisionTimerId=null;
  }
}

  const play=getPlayAtBase(tappedBase) || {
  base: tappedBase,
  runner: null,
  isForce: false,
  requiresTouch: false,
  touchSelected: false
};
  state.playState.currentPlay=play;

  startPlayTimer(play);
    document.querySelectorAll('.field .base').forEach((item) => {
      item.classList.remove('is-selected');
    });

    base.classList.add('is-selected');
  });
});
