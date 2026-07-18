(()=>{
  "use strict";

  const questions=Array.isArray(window.GAME_QUESTIONS)?window.GAME_QUESTIONS:[];
  const screens=[...document.querySelectorAll(".screen")];
  const $=id=>document.getElementById(id);

  let current=0;
  let score=0;
  let xp=0;
  let answered=false;

  function show(id){
    screens.forEach(screen=>screen.classList.remove("active"));
    $(id).classList.add("active");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function syncXP(){
    document.querySelectorAll("[data-xp]").forEach(node=>{
      node.textContent=String(xp);
    });
  }

  function startGame(){
    current=0;
    score=0;
    answered=false;
    show("quiz-screen");
    renderQuestion();
  }

  function renderQuestion(){
    const item=questions[current];
    answered=false;

    $("question-counter").textContent=`${current+1} / ${questions.length}`;
    $("progress-bar").style.width=`${((current+1)/questions.length)*100}%`;
    $("category-tag").textContent=item.category;
    $("situation-tag").textContent=item.situation;
    $("case-number").textContent=`ケース${current+1}`;
    $("question-text").textContent=item.question;
    $("hint-text").textContent=item.hint;
    $("hint-text").hidden=true;

    const answerList=$("answer-list");
    answerList.replaceChildren();

    item.choices.forEach((choice,index)=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="answer-button";

      const number=document.createElement("span");
      number.className="answer-number";
      number.textContent=String(index+1);

      const label=document.createElement("span");
      label.textContent=choice;

      button.append(number,label);
      button.addEventListener("click",()=>judge(index));
      answerList.appendChild(button);
    });
  }

  function judge(selected){
    if(answered)return;
    answered=true;

    const item=questions[current];
    const correct=selected===item.answer;
    const feedbackCard=document.querySelector(".feedback-card");

    if(correct){
      score+=1;
      xp+=10;
      $("judge-mark").textContent="○";
      $("judge-title").textContent="正解！ ナイス判断！";
      $("earned-xp").textContent="10";
      feedbackCard.classList.remove("wrong");
    }else{
      $("judge-mark").textContent="×";
      $("judge-title").textContent="すばらしい、まちがってる！（笑）";
      $("earned-xp").textContent="0";
      feedbackCard.classList.add("wrong");
    }

    $("explanation-text").textContent=item.explanation;
    $("next-button").textContent=current===questions.length-1?"結果を見る":"次の問題へ";
    syncXP();
    show("feedback-screen");
  }

  $("start-menu").addEventListener("click",()=>show("stage-screen"));
  $("lesson-menu").addEventListener("click",()=>show("lesson-screen"));
  $("stage-home").addEventListener("click",()=>show("home-screen"));
  $("lesson-home").addEventListener("click",()=>show("home-screen"));
  $("stage-one").addEventListener("click",startGame);
  $("lesson-start").addEventListener("click",startGame);
  $("quiz-stage").addEventListener("click",()=>show("stage-screen"));
  $("hint-button").addEventListener("click",()=>{$("hint-text").hidden=false});

  $("next-button").addEventListener("click",()=>{
    if(current<questions.length-1){
      current+=1;
      show("quiz-screen");
      renderQuestion();
      return;
    }

    $("final-score").textContent=`${score} / ${questions.length}`;
    $("result-message").textContent=
      score===questions.length
        ?"全問正解！名監督への第一歩です。"
        :score>=3
          ?"いい判断が増えています。もう一度挑戦しよう！"
          :"まちがいは成長のチャンス。解説を覚えて次へ進もう！";

    show("result-screen");
  });

  $("retry-button").addEventListener("click",startGame);
  $("result-home").addEventListener("click",()=>show("home-screen"));

  syncXP();
})();