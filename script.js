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
const PROMOTION={1:{attempts:2,rate:.70},2:{attempts:3,rate:.75},3:{attempts:3,rate:.75}};
const RUNNERS={NONE:[],FIRST:['FIRST'],SECOND:['SECOND'],THIRD:['THIRD'],FIRST_SECOND:['FIRST','SECOND'],FIRST_THIRD:['FIRST','THIRD'],SECOND_THIRD:['SECOND','THIRD'],LOADED:['FIRST','SECOND','THIRD']};
const POS={FIRST:[78,58],SECOND:[51,31],THIRD:[22,58]};
const savedStats=JSON.parse(localStorage.getItem('baseballIqMastery')||'{}');
let state={mode:'defense',index:0,score:0,xp:Number(localStorage.getItem('baseballIqXp')||0),stats:savedStats,questions:[],level:1};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function show(id){$$('.screen').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active')}
function mastery(level){const x=state.stats[level]||{attempts:0,points:0};return {attempts:x.attempts,rate:x.attempts?x.points/(x.attempts*10):0}}
function calculateLevel(){
  let level=1;
  for(let current=1;current<=3;current++){
    const next=LEVELS[current];
    const m=mastery(current),rule=PROMOTION[current];
    if(state.xp>=next.xp && m.attempts>=rule.attempts && m.rate>=rule.rate) level=current+1;
    else break;
  }
  return level;
}
function promotionText(){
  const level=state.level;
  if(level===4)return '低学年の目標「レギュラー」到達！ 発展編はβ版以降で追加します。';
  const next=LEVELS[level],m=mastery(level),rule=PROMOTION[level];
  return `次の「${next.name}」まで：XP ${Math.max(0,next.xp-state.xp)}／レベル${level}問題 ${m.attempts}/${rule.attempts}問／理解度 ${Math.round(m.rate*100)}%（目標${Math.round(rule.rate*100)}%）`;
}
function updateLevel(){
  state.level=calculateLevel();
  const info=LEVELS[state.level-1];
  $$('[data-xp]').forEach(x=>x.textContent=state.xp);
  $$('[data-level]').forEach(x=>x.textContent=state.level);
  $$('[data-level-name]').forEach(x=>x.textContent=info.name);
  const c=$('#curriculum-status');if(c)c.textContent=`現在：Lv.${state.level} ${info.name}｜${info.school}`;
  const p=$('#promotion-status');if(p)p.textContent=promotionText();
}
function runnerSvg(){return `
<svg viewBox="0 0 86 94" aria-hidden="true">
  <g transform="rotate(-7 43 47)">
    <ellipse cx="43" cy="88" rx="26" ry="5" fill="#06284a" opacity=".18"/>
    <path d="M28 17 Q43 3 60 17 L58 28 Q43 22 27 29Z" fill="#06284a" stroke="#fff" stroke-width="2"/>
    <path d="M55 16 L72 23 Q62 28 54 25Z" fill="#06284a" stroke="#fff" stroke-width="2"/>
    <circle cx="44" cy="31" r="13" fill="#f2bd93" stroke="#06284a" stroke-width="3"/>
    <circle cx="40" cy="30" r="1.7" fill="#152338"/><circle cx="49" cy="30" r="1.7" fill="#152338"/>
    <path d="M40 36 Q45 40 50 35" fill="none" stroke="#8b4e32" stroke-width="2" stroke-linecap="round"/>
    <path d="M29 43 Q43 38 58 45 L57 66 Q43 73 28 64Z" fill="#06284a" stroke="#fff" stroke-width="3"/>
    <path d="M34 46 L52 46" stroke="#dc2638" stroke-width="4"/><text x="43" y="58" text-anchor="middle" font-size="8" font-weight="900" fill="#fff">FUJICON</text>
    <path d="M31 48 L17 61" stroke="#f2bd93" stroke-width="7" stroke-linecap="round"/><path d="M56 48 L72 38" stroke="#f2bd93" stroke-width="7" stroke-linecap="round"/>
    <path d="M35 66 L22 83" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M51 66 L68 79" stroke="#fff" stroke-width="9" stroke-linecap="round"/>
    <path d="M20 84 L8 85" stroke="#06284a" stroke-width="7" stroke-linecap="round"/><path d="M67 80 L77 86" stroke="#06284a" stroke-width="7" stroke-linecap="round"/>
    <path d="M25 64 L59 64" stroke="#dc2638" stroke-width="3"/>
  </g>
</svg>`}
function renderField(q){const layer=$('#runner-layer');layer.innerHTML='';RUNNERS[q.situation].forEach(base=>{const [x,y]=POS[base];const self=q.self===base;const el=document.createElement('div');el.className='runner'+(self?' self':'');el.style.left=x+'%';el.style.top=y+'%';el.innerHTML=`${self?'<span class="self-label">自分</span>':''}${runnerSvg()}`;layer.appendChild(el)})}
function renderQuestion(){const q=state.questions[state.index];$('#mode-title').textContent=state.mode==='defense'?'守備編':'ランナー編';$('#question-count').textContent=`${state.index+1} / ${state.questions.length}`;$('#situation-tag').textContent=q.label;$('#role-tag').textContent=`Lv.${q.difficulty} ${LEVELS[q.difficulty-1].name}`;$('#question-text').textContent=q.q;$('#question-note').textContent=q.note;$('#field-caption').textContent=state.mode==='runner'?'「自分」の位置と他のランナーを確認しよう':'ランナーの配置を確認しよう';renderField(q);const box=$('#answers');box.innerHTML='';q.answers.forEach(a=>{const b=document.createElement('button');b.type='button';b.className='answer';b.textContent=a[0];b.addEventListener('click',()=>answer(a,q));box.appendChild(b)})}
function start(mode){state.mode=mode;state.index=0;state.score=0;state.questions=currentQuestions(mode);renderQuestion();show('quiz')}
function answer(a,q){const [label,grade,xp,explain]=a;state.xp+=xp;state.score+=xp;const key=String(q.difficulty);const stat=state.stats[key]||{attempts:0,points:0};stat.attempts+=1;stat.points+=xp;state.stats[key]=stat;localStorage.setItem('baseballIqXp',state.xp);localStorage.setItem('baseballIqMastery',JSON.stringify(state.stats));updateLevel();$('#judge').textContent=grade;$('#judge').className='judge '+(grade==='△'?'triangle':grade==='×'?'cross':'');$('#judge-title').textContent=grade==='○'?'最善の判断！':grade==='△'?'悪くない判断！':'もう一度考えよう';$('#feedback-text').textContent=explain;$('#gain').textContent=xp;show('feedback')}
function next(){state.index++;if(state.index>=state.questions.length){const max=state.questions.length*10;$('#result-score').textContent=`獲得 ${state.score} / ${max} XP`;$('#result-title').textContent=state.score>=max*.8?'このレベルを理解できている！':'同じレベルでもう一度練習しよう！';show('result')}else{renderQuestion();show('quiz')}}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));$('#back-home').addEventListener('click',()=>show('home'));$('#next').addEventListener('click',next);$('#retry').addEventListener('click',()=>start(state.mode));$('#result-home').addEventListener('click',()=>show('home'));updateLevel();
