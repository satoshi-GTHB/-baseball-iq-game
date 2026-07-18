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
  FIRST:[78,58],
  SECOND:[51,31],
  THIRD:[22,58]
};

const HISTORY_STORAGE_KEY='baseballIqAnswerHistoryV1';
const SESSION_SIZE=5;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function safeParse(value,fallback){
  try{
    return value ? JSON.parse(value) : fallback;
  }catch(error){
    return fallback;
  }
}

const savedStats=safeParse(
  localStorage.getItem('baseballIqMastery'),
  {}
);

let state={
  mode:'defense',
  index:0,
  score:0,
  xp:Number(localStorage.getItem('baseballIqXp')||0),
  stats:savedStats,
  questions:[],
  sessionAnswers:[],
  level:1,
  questionStartedAt:null,
  answering:false
};

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
  const saved=safeParse(
    localStorage.getItem(HISTORY_STORAGE_KEY),
    null
  );

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
  localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(history)
  );
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
      grade==='○'
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

function runnerSvg(){
  return `
    <svg viewBox="0 0 86 94" aria-hidden="true">
      <g transform="rotate(-7 43 47)">
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

    element.innerHTML=
      `${self
        ?'<span class="self-label">自分</span>'
        :''
      }${runnerSvg()}`;

    layer.appendChild(element);
  });
}

function renderQuestion(){
  const q=state.questions[state.index];

  state.questionStartedAt=Date.now();
  state.answering=false;

  $('#mode-title').textContent=
    state.mode==='defense'
      ?'守備編'
      :'ランナー編';

  $('#question-count').textContent=
    `${state.index+1} / ${state.questions.length}`;

  $('#situation-tag').textContent=
    q.label;

  $('#role-tag').textContent=
    `Lv.${q.difficulty} ${LEVELS[q.difficulty-1].name}`;

  $('#question-text').textContent=
    q.q;

  $('#question-note').textContent=
    q.note;

  $('#field-caption').textContent=
    state.mode==='runner'
      ?'「自分」の位置と他のランナーを確認しよう'
      :'ランナーの配置を確認しよう';

  renderField(q);

  const answersBox=$('#answers');

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

  localStorage.setItem(
    'baseballIqXp',
    state.xp
  );

  localStorage.setItem(
    'baseballIqMastery',
    JSON.stringify(state.stats)
  );

  updateLevel();

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
    grade==='○'
      ?'最善の判断！'
      :grade==='△'
        ?'悪くない判断！'
        :'素晴らしい、間違ってる（笑）';

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
    margin:16px 0;
    padding:16px;
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
      🧢 AI監督からひとこと
    </strong>

    <p
      id="coach-comment"
      style="
        line-height:1.7;
        margin:10px 0 14px;
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

  const correct=answers.filter(answer=>{
    return answer.grade==='○';
  }).length;

  const partial=answers.filter(answer=>{
    return answer.grade==='△';
  }).length;

  const maxPoints=
    answers.length*10;

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
          (a[1].attempts*10);

        const rateB=
          b[1].points/
          (b[1].attempts*10);

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

  if(correct===5){
    comment=
      '5問すべて最善の判断！状況を見て、落ち着いて判断できています。次は、なぜその答えなのかも声に出して説明してみよう。';
  }else if(rate>=.7){
    comment=
      `${correct}問で最善の判断ができました。間違いも大切な練習です。迷った場面だけ、もう一度確認すればさらに強くなれます。`;
  }else{
    comment=
      `今回は${correct}問で最善の判断ができました。不正解は大歓迎！ランナーの位置と「進まなければならない塁」を順番に確認しよう。`;
  }

  const recommendation=
    weakest
      ?`「${weakest[0]}」を意識して、同じ編をもう一度5問！`
      :'同じ編をもう一度5問！';

  return {
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
    state.questions.length*10;

  const analysis=
    sessionAnalysis();

  $('#result-score').textContent=
    `獲得 ${state.score} / ${max} XP｜最善 ${analysis.correct}問・おしい ${analysis.partial}問`;

  $('#result-title').textContent=
    analysis.rate>=.8
      ?'ナイス判断！'
      :analysis.rate>=.5
        ?'あと一歩！'
        :'間違いから強くなろう！';

  $('#coach-comment').textContent=
    analysis.comment;

  $('#mastery-label').textContent=
    analysis.masteryLabel;

  $('#recommendation').textContent=
    analysis.recommendation;

  $('#retry').textContent=
    'もう一度5問';

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

$$('[data-mode]').forEach(button=>{
  button.addEventListener('click',()=>{
    start(button.dataset.mode);
  });
});

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
      HISTORY_STORAGE_KEY
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

updateLevel();