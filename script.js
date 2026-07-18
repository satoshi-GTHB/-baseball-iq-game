(() => {
  'use strict';
  const qs = window.GAME_QUESTIONS || [];
  const screens = {home:document.getElementById('home'),stage:document.getElementById('stage'),quiz:document.getElementById('quiz'),result:document.getElementById('result')};
  const feedback = document.getElementById('feedback');
  let index=0, score=0, answered=false;
  const show = name => {Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name].classList.add('active');window.scrollTo({top:0,behavior:'smooth'});};
  document.getElementById('startBtn').addEventListener('click',()=>show('stage'));
  document.getElementById('learnBtn').addEventListener('click',()=>show('stage'));
  document.getElementById('backHome').addEventListener('click',()=>show('home'));
  document.getElementById('backStage').addEventListener('click',()=>show('stage'));
  document.getElementById('stage1').addEventListener('click',start);
  document.getElementById('retryBtn').addEventListener('click',start);
  document.getElementById('resultHome').addEventListener('click',()=>show('home'));
  document.getElementById('nextBtn').addEventListener('click',next);
  document.getElementById('hintBtn').addEventListener('click',()=>{const el=document.getElementById('hintText');el.hidden=!el.hidden;});
  function start(){index=0;score=0;show('quiz');render();}
  function render(){answered=false;feedback.hidden=true;const q=qs[index];document.getElementById('count').textContent=`${index+1} / ${qs.length}`;document.getElementById('score').textContent=score;document.getElementById('bar').style.width=`${((index+1)/qs.length)*100}%`;document.getElementById('category').textContent=q.category;document.getElementById('situation').textContent=q.situation;document.getElementById('runner').textContent=q.runner;document.getElementById('caseNo').textContent=index+1;document.getElementById('question').textContent=q.question;const hint=document.getElementById('hintText');hint.textContent=q.hint;hint.hidden=true;const wrap=document.getElementById('answers');wrap.replaceChildren();q.choices.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='answer-btn';b.innerHTML=`<span>${i+1}</span><strong>${c}</strong>`;b.addEventListener('click',()=>choose(i,b));wrap.appendChild(b);});}
  function choose(i,btn){if(answered)return;answered=true;const q=qs[index];[...document.querySelectorAll('.answer-btn')].forEach((b,j)=>{b.disabled=true;if(j===q.answer)b.classList.add('correct');});const ok=i===q.answer;if(ok){score++;document.getElementById('score').textContent=score;}else btn.classList.add('wrong');document.getElementById('mark').textContent=ok?'○':'×';document.getElementById('feedbackTitle').textContent=ok?'正解！ ナイス判断！':'すばらしい、まちがってる！（笑）';document.getElementById('explanation').textContent=q.explanation;document.querySelector('.feedback-card').classList.toggle('wrong',!ok);document.getElementById('nextBtn').textContent=index===qs.length-1?'結果を見る':'次の問題へ';feedback.hidden=false;}
  function next(){if(index<qs.length-1){index++;render();}else{document.getElementById('finalScore').textContent=`${score} / ${qs.length}`;document.getElementById('resultText').textContent=score===qs.length?'全問正解！名監督への第一歩です。':score>=3?'いい判断が増えています。もう一度挑戦しよう！':'まちがいは成長のチャンス。解説を覚えてもう一度！';feedback.hidden=true;show('result');}}
})();
