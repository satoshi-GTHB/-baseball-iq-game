(() => {
  "use strict";

  const questions = Array.isArray(window.GAME_QUESTIONS) ? window.GAME_QUESTIONS : [];

  const screens = {
    start: document.getElementById("start-screen"),
    quiz: document.getElementById("quiz-screen"),
    result: document.getElementById("result-screen")
  };

  const startButton = document.getElementById("start-button");
  const retryButton = document.getElementById("retry-button");
  const nextButton = document.getElementById("next-button");
  const questionCount = document.getElementById("question-count");
  const scoreText = document.getElementById("score-text");
  const progressBar = document.getElementById("progress-bar");
  const categoryLabel = document.getElementById("category-label");
  const questionText = document.getElementById("question-text");
  const answerList = document.getElementById("answer-list");
  const feedbackBox = document.getElementById("feedback-box");
  const feedbackTitle = document.getElementById("feedback-title");
  const feedbackExplanation = document.getElementById("feedback-explanation");
  const finalScore = document.getElementById("final-score");
  const resultMessage = document.getElementById("result-message");

  let currentIndex = 0;
  let score = 0;
  let answered = false;

  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("active"));
    screens[name].classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame() {
    if (questions.length === 0) {
      alert("問題データを読み込めませんでした。");
      return;
    }

    currentIndex = 0;
    score = 0;
    answered = false;
    showScreen("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const item = questions[currentIndex];
    answered = false;
    feedbackBox.hidden = true;
    answerList.replaceChildren();

    questionCount.textContent = `第${currentIndex + 1}問 / ${questions.length}問`;
    scoreText.textContent = `${score}点`;
    progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
    categoryLabel.textContent = item.category;
    questionText.textContent = item.question;

    item.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";
      button.textContent = choice;
      button.dataset.index = String(index);
      button.addEventListener("click", () => selectAnswer(index, button));
      answerList.appendChild(button);
    });
  }

  function selectAnswer(selectedIndex, selectedButton) {
    if (answered) return;
    answered = true;

    const item = questions[currentIndex];
    const buttons = Array.from(answerList.querySelectorAll(".answer-button"));
    buttons.forEach((button) => {
      button.disabled = true;
      const index = Number(button.dataset.index);
      if (index === item.answer) button.classList.add("correct");
    });

    if (selectedIndex === item.answer) {
      score += 1;
      scoreText.textContent = `${score}点`;
      feedbackTitle.textContent = "正解！ナイス判断！";
    } else {
      selectedButton.classList.add("wrong");
      feedbackTitle.textContent = "すばらしい、まちがってる！（笑）";
    }

    feedbackExplanation.textContent = item.explanation;
    nextButton.textContent = currentIndex === questions.length - 1 ? "結果を見る" : "次の問題へ";
    feedbackBox.hidden = false;
    feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function goNext() {
    if (!answered) return;

    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
      renderQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      showResult();
    }
  }

  function showResult() {
    finalScore.textContent = `${score} / ${questions.length}問正解`;

    if (score === questions.length) {
      resultMessage.textContent = "全問正解！名監督への第一歩です。";
    } else if (score >= 3) {
      resultMessage.textContent = "いい判断が増えています。解説を思い出して、もう一度挑戦してみよう。";
    } else {
      resultMessage.textContent = "まちがいは成長のチャンス。考え方を覚えれば、次はもっと強くなれます。";
    }

    showScreen("result");
  }

  startButton.addEventListener("click", startGame);
  retryButton.addEventListener("click", startGame);
  nextButton.addEventListener("click", goNext);
})();
