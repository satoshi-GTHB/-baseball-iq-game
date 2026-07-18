(()=>{
  "use strict";

  const questions = Array.isArray(window.GAME_QUESTIONS) ? window.GAME_QUESTIONS : [];
  const levels = Array.isArray(window.LEVELS) ? window.LEVELS : [];
  const screens = [...document.querySelectorAll(".screen")];
  const $ = id => document.getElementById(id);

  let current = 0;
  let sessionScore = 0;
  let xp = Number(localStorage.getItem("baseballIqXp") || 0);
  let answered = false;

  function show(id){
    screens.forEach(screen => screen.classList.remove("active"));
    $(id).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getCurrentLevel(){
    let result = levels[0] || { level: 1, name: "体験生", minXp: 0 };
    for (const level of levels){
      if (xp >= level.minXp) result = level;
    }
    return result;
  }

  function getNextLevel(currentLevel){
    return levels.find(level => level.level === currentLevel.level + 1) || null;
  }

  function syncLevelUI(){
    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel(currentLevel);

    document.querySelectorAll("[data-xp]").forEach(node => {
      node.textContent = String(xp);
    });
    document.querySelectorAll("[data-level-number]").forEach(node => {
      node.textContent = String(currentLevel.level);
    });
    document.querySelectorAll("[data-level-name]").forEach(node => {
      node.textContent = currentLevel.name;
    });
    document.querySelectorAll("[data-next-xp]").forEach(node => {
      node.textContent = nextLevel ? String(nextLevel.minXp) : "MAX";
    });
  }


  function renderRunners(runners){
    const active = new Set(Array.isArray(runners) ? runners : []);
    document.querySelectorAll(".runner-marker").forEach(marker => {
      marker.hidden = !active.has(marker.dataset.base);
    });

    const labels = [];
    if (active.has("first")) labels.push("1塁");
    if (active.has("second")) labels.push("2塁");
    if (active.has("third")) labels.push("3塁");

    $("field-caption").textContent =
      labels.length > 0
        ? `ランナー：${labels.join("・")}`
        : "ランナーなし";
  }

  function startGame(){
    current = 0;
    sessionScore = 0;
    answered = false;
    show("quiz-screen");
    renderQuestion();
  }

  function renderQuestion(){
    const item = questions[current];
    answered = false;

    $("question-counter").textContent = `${current + 1} / ${questions.length}`;
    $("progress-bar").style.width = `${((current + 1) / questions.length) * 100}%`;
    $("category-tag").textContent = item.category;
    $("situation-tag").textContent = item.situation;
    $("case-number").textContent = `ケース${current + 1}`;
    $("question-text").textContent = item.question;
    $("hint-text").textContent = item.hint;
    $("hint-text").hidden = true;
    renderRunners(item.runners);

    const answerList = $("answer-list");
    answerList.replaceChildren();

    item.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";

      const number = document.createElement("span");
      number.className = "answer-number";
      number.textContent = String(index + 1);

      const label = document.createElement("span");
      label.textContent = choice.text;

      button.append(number, label);
      button.addEventListener("click", () => judge(choice));
      answerList.appendChild(button);
    });
  }

  function judge(choice){
    if (answered) return;
    answered = true;

    const beforeLevel = getCurrentLevel();
    const earned = choice.points;

    sessionScore += earned;
    xp += earned;
    localStorage.setItem("baseballIqXp", String(xp));

    const feedbackCard = document.querySelector(".feedback-card");
    feedbackCard.classList.remove("wrong", "triangle");

    if (choice.grade === "circle"){
      $("judge-mark").textContent = "○";
      $("judge-title").textContent = "最善の判断！";
      $("grade-label").textContent = "高得点";
    } else if (choice.grade === "triangle"){
      $("judge-mark").textContent = "△";
      $("judge-title").textContent = "間違いではない！";
      $("grade-label").textContent = "でも、もっと良い判断があります";
      feedbackCard.classList.add("triangle");
    } else {
      $("judge-mark").textContent = "×";
      $("judge-title").textContent = "すばらしい、まちがってる！（笑）";
      $("grade-label").textContent = "次はもっと良い判断を探そう";
      feedbackCard.classList.add("wrong");
    }

    $("earned-xp").textContent = String(earned);
    $("explanation-text").textContent = choice.explanation;
    $("next-button").textContent = current === questions.length - 1 ? "結果を見る" : "次の問題へ";

    syncLevelUI();

    const afterLevel = getCurrentLevel();
    if (afterLevel.level > beforeLevel.level){
      $("grade-label").textContent += `｜レベルアップ！ ${afterLevel.name}`;
    }

    show("feedback-screen");
  }

  $("start-menu").addEventListener("click", () => show("stage-screen"));
  $("lesson-menu").addEventListener("click", () => show("lesson-screen"));
  $("stage-home").addEventListener("click", () => show("home-screen"));
  $("lesson-home").addEventListener("click", () => show("home-screen"));
  $("stage-one").addEventListener("click", startGame);
  $("lesson-start").addEventListener("click", startGame);
  $("quiz-stage").addEventListener("click", () => show("stage-screen"));
  $("hint-button").addEventListener("click", () => {
    $("hint-text").hidden = false;
  });

  $("next-button").addEventListener("click", () => {
    if (current < questions.length - 1){
      current += 1;
      show("quiz-screen");
      renderQuestion();
      return;
    }

    $("final-score").textContent = `${sessionScore} / ${questions.length * 10}`;
    $("result-message").textContent =
      sessionScore === questions.length * 10
        ? "全問で最善の判断！すばらしい野球IQです。"
        : sessionScore >= questions.length * 7
          ? "良い判断が増えています。△だった問題をもう一度考えよう！"
          : "まちがいは成長のチャンス。解説を覚えて次へ進もう！";

    show("result-screen");
  });

  $("retry-button").addEventListener("click", startGame);
  $("result-home").addEventListener("click", () => show("home-screen"));

  syncLevelUI();
})();