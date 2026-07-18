(()=>{"use strict";
const q=window.GAME_QUESTIONS||[],screens=[...document.querySelectorAll(".screen")];
let i=0,score=0,xp=0,answered=false;
const $=id=>document.getElementById(id);
function show(id){screens.forEach(s=>s.classList.remove("active"));$(id).classList.add("active");scrollTo({top:0,behavior:"smooth"})}
function syncXP(){["home-xp","stage-xp","xp"].forEach(id=>{const e=$(id);if(e)e.textContent=xp})}
function start(){i=0;score=0;answered=false;show("quiz");render()}
function render(){answered=false;const x=q[i];$("count").textContent=`${i+1} / ${q.length}`;$("progress").style.width=`${(i+1)/q.length*100}%`;$("category").textContent=x.category;$("situation").textContent=x.situation;$("case").textContent=`ケース${i+1}`;$("question").textContent=x.question;$("hint-text").textContent=x.hint;$("hint-text").hidden=true;$("answers").replaceChildren();x.choices.forEach((c,n)=>{const b=document.createElement("button");b.className="answer";b.type="button";b.innerHTML=`<b>${n+1}</b>${c}`;b.addEventListener("click",()=>judge(n));$("answers").appendChild(b)})}
function judge(n){if(answered)return;answered=true;const x=q[i],ok=n===x.answer;if(ok){score++;xp+=10;$("judge-mark").textContent="○";$("judge-title").textContent="正解！ ナイス判断！";$("earned").textContent="10";document.querySelector(".feedback-panel").classList.remove("wrong")}else{$("judge-mark").textContent="×";$("judge-title").textContent="すばらしい、まちがってる！（笑）";$("earned").textContent="0";document.querySelector(".feedback-panel").classList.add("wrong")}$("explanation").textContent=x.explanation;$("next").textContent=i===q.length-1?"結果を見る":"次の問題へ";syncXP();show("feedback")}
$("go-stage").addEventListener("click",()=>show("stage"));
$("go-rules").addEventListener("click",()=>show("rules"));
$("stage-back").addEventListener("click",()=>show("home"));
$("rules-back").addEventListener("click",()=>show("home"));
$("stage-one").addEventListener("click",start);
$("rules-start").addEventListener("click",start);
$("quiz-back").addEventListener("click",()=>show("stage"));
$("hint-btn").addEventListener("click",()=>{$("hint-text").hidden=false});
$("next").addEventListener("click",()=>{if(i<q.length-1){i++;show("quiz");render()}else{$("final-score").textContent=`${score} / ${q.length}`;$("result-message").textContent=score===q.length?"全問正解！名監督への第一歩です。":score>=3?"いい判断が増えています。もう一度挑戦しよう！":"まちがいは成長のチャンス。解説を覚えて次へ進もう！";show("result")}});
$("retry").addEventListener("click",start);
$("result-home").addEventListener("click",()=>show("home"));
syncXP();
})();