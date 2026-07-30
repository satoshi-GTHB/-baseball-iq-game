(() => {
  'use strict';

  const LEVELS = [
    { id: 'beginner', name: '初心者', description: '基本ルールと基本操作' },
    { id: 'basic', name: '初級', description: '内野の打球を見て考える' },
    { id: 'middle', name: '中級', description: '打球と、その後のボールを見る' },
    { id: 'advanced', name: '上級', description: '前と後ろのランナーも見る' },
    { id: 'expert', name: '超上級', description: '監督の作戦どおりに動く' }
  ];

  const ACTION_LABELS = {
    GO: 'ゴー',
    STOP: 'ストップ',
    HALFWAY: 'ハーフウェイ／2次リード',
    BACK: 'バック',
    KAKENUK: 'かけぬけ',
    ROUND: 'オーバーラン'
  };

  function point(action, weight = 1, axis = 'personal') {
    return { action, weight, axis };
  }

  function makeProblem(id, level, options) {
    const problem = {
      id,
      level,
      outs: 0,
      balls: 0,
      strikes: 0,
      start: 'FIRST',
      scene: 'ground',
      direction: 'center',
      stealSign: false,
      alignment: '通常守備',
      otherBases: null,
      title: '走り方を考えよう',
      prompt: 'プレーを見て、どう走るか考えよう。',
      instruction: '',
      expected: [point('GO', 3)],
      good: '',
      next: 'ボールと守備の動きを最後まで見よう。',
      ...options
    };
    if (problem.start !== 'BATTER' && !problem.stealSign) {
      const expectedAfterLead = problem.expected.map((item, index) =>
        index === 0 && item.action === 'STOP'
          ? { ...item, action: 'BACK' }
          : item
      );
      problem.expected = [
        point('HALFWAY', 2),
        ...expectedAfterLead
      ];
    }
    return problem;
  }

  const PROBLEMS = [
    makeProblem('BG-01', 'beginner', {
      start: 'BATTER', title: 'バッターランナー・内野ゴロ',
      prompt: '打ったあとは、1塁でどう走る？',
      expected: [point('KAKENUK', 3)],
      good: '1塁は止まらず、ベースの先まで走り切れたね。',
      next: '内野ゴロでは「かけぬけ」で1塁を全力で通り過ぎよう。'
    }),
    makeProblem('BG-02', 'beginner', {
      start: 'FIRST', direction: 'right', title: '1塁走者・後ろが詰まったゴロ',
      prompt: '後ろからバッターランナーが来る。次の塁へ進もう。',
      expected: [point('GO', 3)],
      good: '後ろにバッターランナーが来ているときに、次の塁へ進めたね。',
      next: '打者が走ってくると1塁には戻れないので、2塁へゴーだよ。'
    }),
    makeProblem('BG-03', 'beginner', {
      start: 'SECOND', direction: 'left', title: '1・2塁の2塁走者',
      prompt: '後ろの塁がつまっている。どうする？',
      otherBases: ['HOME', 'FIRST'],
      expected: [point('GO', 3)],
      good: '後ろが詰まっているということを理解できたね。',
      next: '1・2塁では2塁走者も3塁へ進まなければならないよ。'
    }),
    makeProblem('BG-04', 'beginner', {
      start: 'THIRD', direction: 'left', title: '満塁の3塁走者',
      prompt: 'すべての塁がつまっている。ホームへ向かおう。',
      otherBases: ['HOME', 'FIRST', 'SECOND'],
      expected: [point('GO', 3)],
      good: '満塁でランナーがつまっているときに、ホームへ進めたね。',
      next: '満塁では3塁にも戻れないので、ホームへゴーだよ。'
    }),
    makeProblem('BG-05', 'beginner', {
      start: 'FIRST', scene: 'swing', stealSign: true,
      title: '盗塁のサイン', prompt: 'トミー監督のサインにこたえよう。',
      instruction: '盗塁！ 投球と同時にスタートだ。',
      expected: [point('GO', 3, 'strategy')],
      good: '監督の盗塁サインを見てスタートできたね。',
      next: '盗塁サインが出たら、投球に合わせてゴーしよう。'
    }),
    makeProblem('BG-06', 'beginner', {
      start: 'BATTER', scene: 'popup', direction: 'center',
      title: 'バッターランナー・内野フライ',
      prompt: '内野フライでも、1塁まで全力で走ろう。',
      expected: [point('KAKENUK', 3)],
      good: '内野フライでも1塁まで走り切れたね。',
      next: '内野フライでも「かけぬけ」で1塁まで全力で走ろう。'
    }),
    makeProblem('BG-07', 'beginner', {
      start: 'BATTER', scene: 'fly', direction: 'left',
      title: 'バッターランナー・外野フライ',
      prompt: '外野フライで、1塁を回って先を見よう。',
      expected: [point('ROUND', 3)]
    }),
    makeProblem('BG-08', 'beginner', {
      start: 'BATTER', direction: 'right', title: '一塁側の内野ゴロ',
      prompt: 'ボールとランナーがほぼ同時に1塁へ来る。1塁を走り切ろう。',
      expected: [point('KAKENUK', 3)]
    }),
    makeProblem('BG-09', 'beginner', {
      start: 'FIRST', direction: 'left-center', title: '1塁走者・二塁へ',
      prompt: '内野ゴロで1塁には戻れない。どうする？',
      expected: [point('GO', 3)]
    }),
    makeProblem('BG-10', 'beginner', {
      start: 'SECOND', direction: 'right-center', title: '後ろが詰まったゴロ',
      prompt: '後ろの走者が進んでくる。3塁へ向かおう。',
      otherBases: ['HOME', 'FIRST'],
      expected: [point('GO', 3)]
    }),

    makeProblem('BA-01', 'basic', {
      start: 'SECOND', direction: 'left', title: '前のゴロ',
      prompt: '自分より前で内野手がボールを取りそうだ。',
      expected: [point('STOP', 3)],
      good: '前のゴロで飛び出さず、止まれたね。',
      next: '自分より前のゴロは、捕った野手から近いのでまず止まろう。'
    }),
    makeProblem('BA-02', 'basic', {
      start: 'SECOND', direction: 'right', title: '後ろのゴロ',
      prompt: '打球が自分より後ろへ転がった。',
      expected: [point('GO', 3)]
    }),
    makeProblem('BA-03', 'basic', {
      start: 'THIRD', direction: 'center', title: '3塁ランナー・内野ゴロ',
      prompt: '守る人の位置を見て、どう走るか考えよう。',
      otherBases: ['HOME', 'SECOND'],
      expected: [point('GO', 3)]
    }),
    makeProblem('BA-04', 'basic', {
      start: 'THIRD', direction: 'left', alignment: '前進守備',
      title: '3塁ランナー・内野ゴロ', prompt: '守る人の位置を見て、どう走るか考えよう。',
      otherBases: ['HOME', 'SECOND'],
      expected: [point('STOP', 3)]
    }),
    makeProblem('BA-05', 'basic', {
      start: 'FIRST', scene: 'popup', title: '内野フライ',
      prompt: '打球が高く上がった。元の塁へ戻ろう。',
      expected: [point('BACK', 3)]
    }),
    makeProblem('BA-06', 'basic', {
      start: 'SECOND', scene: 'liner', title: '内野ライナー',
      prompt: 'ボールが地面につく前に取られそうだ。',
      expected: [point('BACK', 3)]
    }),
    makeProblem('BA-07', 'basic', {
      start: 'FIRST', scene: 'passed', title: 'パスボール',
      prompt: 'ボールがキャッチャーの後ろへ転がった。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('BA-08', 'basic', {
      start: 'SECOND', scene: 'passed', title: '2塁からのパスボール',
      prompt: 'ボールが大きく後ろへそれた。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('BA-09', 'basic', {
      start: 'THIRD', scene: 'passed', title: '3塁からのパスボール',
      prompt: 'ホームが空いた。1点をねらおう。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('BA-10', 'basic', {
      start: 'BATTER', scene: 'passed', balls: 0, strikes: 2,
      title: '振り逃げ', prompt: '2ストライク。捕手がボールを後ろへそらした。',
      expected: [point('GO', 3, 'strategy'), point('KAKENUK', 1)]
    }),

    makeProblem('MI-01', 'middle', {
      start: 'FIRST', scene: 'ground', balls: 3, strikes: 2, outs: 2,
      title: '2アウト・3ボール2ストライク',
      prompt: 'ランナーがつまっている。打球と同時に走ろう。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('MI-02', 'middle', {
      start: 'THIRD', scene: 'fly', outs: 1,
      title: '外野フライのタッチアップ',
      prompt: 'まず元の塁へもどり、ボールを取ったのを見てホームへ走ろう。',
      expected: [point('BACK', 2), point('GO', 3)]
    }),
    makeProblem('MI-03', 'middle', {
      start: 'FIRST', scene: 'single', direction: 'left',
      title: 'レフト前ヒット', prompt: '外野へぬけた。守る人が投げる先も見よう。',
      expected: [point('GO', 3), point('STOP', 2)]
    }),
    makeProblem('MI-04', 'middle', {
      start: 'SECOND', scene: 'single', direction: 'center',
      title: 'センター前ヒット', prompt: '次の塁へ進み、守る人が投げる先を見て止まろう。',
      expected: [point('GO', 3), point('STOP', 2)]
    }),
    makeProblem('MI-05', 'middle', {
      start: 'FIRST', scene: 'fly', title: '1塁走者・外野フライ',
      prompt: 'ボールを取られるかもしれない。まずもどろう。',
      expected: [point('BACK', 3)]
    }),
    makeProblem('MI-06', 'middle', {
      start: 'SECOND', scene: 'fly', title: '2塁走者・外野フライ',
      prompt: 'ボールを取ったか見える場所へもどろう。',
      expected: [point('BACK', 3)]
    }),
    makeProblem('MI-07', 'middle', {
      start: 'FIRST', scene: 'ground', outs: 2,
      title: '2アウトの内野ゴロ', prompt: '打球と同時にスタートだ。',
      expected: [point('GO', 3)]
    }),
    makeProblem('MI-08', 'middle', {
      start: 'SECOND', scene: 'fly', outs: 2,
      title: '2アウトの外野フライ', prompt: 'ボールを取るのを待たずに走ろう。',
      expected: [point('GO', 3)]
    }),
    makeProblem('MI-09', 'middle', {
      start: 'BATTER', scene: 'single', direction: 'right',
      title: 'バッターランナー・ライト前ヒット', prompt: '1塁を回って、次の塁へ行けるか見よう。',
      expected: [point('ROUND', 3), point('STOP', 1)]
    }),
    makeProblem('MI-10', 'middle', {
      start: 'BATTER', scene: 'extra', direction: 'left-center',
      title: '左中間の長打', prompt: '1塁を回り、2塁へ向かおう。',
      expected: [point('ROUND', 2), point('GO', 3), point('STOP', 1)]
    }),

    makeProblem('AD-01', 'advanced', {
      start: 'FIRST', direction: 'left', title: 'ホームへ投げた間に進む',
      prompt: '2塁へ進み、守備がホームへ投げたら3塁を狙おう。',
      expected: [point('GO', 3), point('GO', 2)]
    }),
    makeProblem('AD-02', 'advanced', {
      start: 'FIRST', scene: 'ground', title: '前の走者が挟まれた',
      prompt: '前のランナーが塁の間ではさまれている間に、2塁へ進んで止まろう。',
      expected: [point('GO', 3), point('STOP', 2)]
    }),
    makeProblem('AD-03', 'advanced', {
      start: 'FIRST', scene: 'single', title: '前の走者を見る',
      prompt: '前の走者が3塁で止まった。自分は2塁で止まろう。',
      expected: [point('GO', 3), point('STOP', 3)]
    }),
    makeProblem('AD-04', 'advanced', {
      start: 'FIRST', scene: 'popup', title: '内野フライ・すぐ元の塁へ',
      prompt: '前方の守備がフライを捕った。すぐに戻ろう。',
      expected: [point('BACK', 3)]
    }),
    makeProblem('AD-05', 'advanced', {
      start: 'FIRST', scene: 'ground', title: '塁の間ではさまれた・後ろへ投げた',
      prompt: 'ボールが後ろの塁へ送られた。',
      expected: [point('GO', 3)]
    }),
    makeProblem('AD-06', 'advanced', {
      start: 'SECOND', scene: 'bunt', direction: 'left',
      title: '送りバント', prompt: 'バントがフェアになった。3塁へ進もう。',
      expected: [point('GO', 3), point('STOP', 1)]
    }),
    makeProblem('AD-07', 'advanced', {
      start: 'THIRD', alignment: '通常守備', title: '3塁ランナー・守る人を見る',
      prompt: '守る人の位置を見て、どう走るか考えよう。',
      expected: [point('GO', 3)]
    }),
    makeProblem('AD-08', 'advanced', {
      start: 'THIRD', alignment: '前進守備', title: '3塁ランナー・守る人を見る',
      prompt: '守る人の位置を見て、どう走るか考えよう。',
      expected: [point('STOP', 3)]
    }),
    makeProblem('AD-09', 'advanced', {
      start: 'SECOND', scene: 'single', direction: 'right',
      title: 'ボールを投げた先を見る', prompt: '守る人が別のランナーへ投げた。もう一つ先へ行こう。',
      expected: [point('GO', 2), point('GO', 3)]
    }),
    makeProblem('AD-10', 'advanced', {
      start: 'FIRST', scene: 'extra', direction: 'right-center',
      title: '長打と前の走者', prompt: '前の走者との間を保ちながら進もう。',
      expected: [point('ROUND', 2), point('GO', 3), point('STOP', 2)]
    }),

    makeProblem('EX-01', 'expert', {
      start: 'THIRD', title: '1点を取りにいく', instruction: 'アウトになっても1点を取りにいこう。',
      prompt: '監督の作戦どおりに動こう。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('EX-02', 'expert', {
      start: 'THIRD', title: 'ランナーをのこす', instruction: 'むりをせず、ランナーをのこそう。',
      prompt: '監督の作戦どおりに動こう。',
      expected: [point('STOP', 3, 'strategy')]
    }),
    makeProblem('EX-03', 'expert', {
      start: 'FIRST', scene: 'ground', outs: 2, title: 'おとりになって走る',
      instruction: '自分がおとりになって、3塁走者を返そう。',
      prompt: '守備を引きつけよう。',
      expected: [point('GO', 3, 'strategy'), point('BACK', 2), point('GO', 2)]
    }),
    makeProblem('EX-04', 'expert', {
      start: 'THIRD', scene: 'bunt', outs: 1, title: 'スクイズ・ゴロ',
      instruction: 'スクイズで1点を取ろう。',
      prompt: '投球と同時にスタートしよう。',
      expected: [point('GO', 3, 'strategy'), point('GO', 2)]
    }),
    makeProblem('EX-05', 'expert', {
      start: 'THIRD', scene: 'bunt', outs: 1, direction: 'left',
      title: 'スクイズ・小フライ', instruction: 'スクイズで1点を取ろう。',
      prompt: '投球でスタートし、フライなら戻ろう。',
      expected: [point('GO', 3, 'strategy'), point('BACK', 3)]
    }),
    makeProblem('EX-06', 'expert', {
      start: 'THIRD', scene: 'ground', outs: 2, title: '遅れたスタート',
      instruction: '1塁走者、遅れてスタート。',
      prompt: 'ランナーが塁の間ではさまれたら、ホームへ向かおう。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('EX-07', 'expert', {
      start: 'THIRD', alignment: '前進守備', title: '1点より走者を残す',
      instruction: 'たくさん点を取るため、むりをしない。',
      prompt: '守る人の位置を見て、どうするか考えよう。',
      expected: [point('STOP', 3, 'strategy')]
    }),
    makeProblem('EX-08', 'expert', {
      start: 'FIRST', scene: 'ground', outs: 2, title: '塁の間ではさまれて時間を作る',
      instruction: '3塁走者がかえるまで守備を引きつけよう。',
      prompt: 'ボールから離れる方向へ逃げよう。',
      expected: [point('GO', 3, 'strategy'), point('BACK', 2), point('GO', 2)]
    }),
    makeProblem('EX-09', 'expert', {
      start: 'THIRD', scene: 'bunt', title: 'スクイズの打球を見る',
      instruction: 'スクイズで1点を取ろう。',
      prompt: 'バントが転がるか、上がるかを見よう。',
      expected: [point('GO', 3, 'strategy'), point('BACK', 2)]
    }),
    makeProblem('EX-10', 'expert', {
      start: 'FIRST', scene: 'ground', title: '点を取るのを助ける走り',
      instruction: '前の走者を返すため、守備の目を引こう。',
      prompt: '次の塁へ進み、守る人をまよわせよう。',
      expected: [point('GO', 3, 'strategy'), point('STOP', 1)]
    })
  ];

  const app = document.querySelector('.academy-runner-game');
  const field = document.querySelector('#gallery-field');
  const levelScreen = document.querySelector('#level-screen');
  const levelGrid = document.querySelector('#level-grid');
  const resultOverlay = document.querySelector('#result-overlay');
  const gameResultOverlay = document.querySelector('#game-result-overlay');
  const playButton = document.querySelector('#gallery-replay');
  const state = {
    unlocked: Math.max(1, Math.min(5, Number(localStorage.getItem('academyRunnerUnlocked')) || 1)),
    levelIndex: 0,
    questions: [],
    index: 0,
    scores: [],
    actions: [],
    timeline: [],
    defenseResults: [],
    active: false,
    started: false,
    startedAt: 0,
    replaying: false,
    resultTimer: null,
    lastSelfDefenseResult: null
  };

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function renderLevels() {
    levelGrid.replaceChildren();
    LEVELS.forEach((level, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'level-button';
      button.disabled = index + 1 > state.unlocked;
      button.innerHTML = `
        <span class="level-number">${index + 1}</span>
        <span class="level-copy"><strong>${level.name}</strong><small>${level.description}</small></span>
        <span class="level-state">${button.disabled ? 'まだあそべない' : 'あそぶ'}</span>
      `;
      button.addEventListener('click', () => startGame(index));
      levelGrid.append(button);
    });
  }

  function clickOption(selector) {
    const button = document.querySelector(selector);
    if (button) button.click();
  }

  function setCount(problem) {
    const rows = document.querySelectorAll('.runner-bso-row');
    rows.forEach((row, rowIndex) => {
      const count = rowIndex === 0 ? problem.balls : rowIndex === 1 ? problem.strikes : problem.outs;
      row.querySelectorAll('.runner-bso-dot').forEach((dot, index) => {
        dot.classList.toggle('is-game-on', index < count);
      });
    });
  }

  function currentProblem() {
    return state.questions[state.index];
  }

  function directionForScene(problem) {
    if (['ground', 'error', 'popup', 'liner'].includes(problem.scene)) {
      return {
        'left-line': 'third-line',
        left: 'third',
        'left-center': 'short',
        center: 'pitcher',
        'right-center': 'second',
        right: 'first',
        'right-line': 'first-line'
      }[problem.direction] || problem.direction;
    }
    return problem.direction;
  }

  function configureProblem(problem) {
    const defaultOtherBases = {
      BATTER: [],
      FIRST: problem.scene === 'ground' ? ['HOME'] : [],
      SECOND: problem.scene === 'ground' ? ['HOME', 'THIRD'] : [],
      THIRD: problem.scene === 'ground' ? ['HOME', 'SECOND'] : []
    }[problem.start] || [];
    field.dataset.otherBases = (
      problem.otherBases || defaultOtherBases
    ).join(',');
    field.dataset.requestedDefenseAlignment =
      problem.alignment === '前進守備'
        ? 'infield-in'
        : 'normal';
    window.RUNNER_GAME_STATE_API?.setOuts?.(problem.outs);
    clickOption(`[data-start="${problem.start}"]`);
    clickOption(`[data-scene="${problem.scene}"]`);
    clickOption(`[data-direction="${directionForScene(problem)}"]`);
    clickOption(`[data-steal-sign="${problem.stealSign ? 'on' : 'off'}"]`);
    setCount(problem);
    document.querySelector('#game-header-status').textContent = `${LEVELS[state.levelIndex].name} ${state.index + 1}/10`;
    state.actions = [];
    state.timeline = [];
    state.defenseResults = [];
    state.active = true;
    state.started = false;
    state.startedAt = 0;
    state.replaying = false;
    state.lastSelfDefenseResult = null;
    clearTimeout(state.resultTimer);
    playButton.disabled = false;
    playButton.textContent = '▶ プレー開始';
  }

  function startGame(levelIndex) {
    state.levelIndex = levelIndex;
    state.questions = shuffle(PROBLEMS.filter((problem) => problem.level === LEVELS[levelIndex].id)).slice(0, 10);
    state.index = 0;
    state.scores = [];
    levelScreen.hidden = true;
    app.classList.add('is-playing');
    configureProblem(currentProblem());
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function recordAction(action) {
    if (!state.active || !state.started) return;
    state.actions.push(action);
    state.timeline.push({
      action,
      at: Math.max(0, performance.now() - state.startedAt)
    });
  }

  function actionsForGrade(problem) {
    if (!problem.stealSign) {
      const actions = [...state.actions];
      const expectedActions = problem.expected.map((item) => item.action);
      const safeFlyReturn =
        ['fly', 'popup', 'liner'].includes(problem.scene) &&
        expectedActions.includes('BACK') &&
        !expectedActions.includes('GO') &&
        actions.at(-1) === 'BACK' &&
        state.lastSelfDefenseResult?.out !== true;
      return safeFlyReturn
        ? actions.filter((action) =>
            action !== 'GO'
          )
        : actions;
    }
    const pitchStartAt =
      Number(window.RUNNER_THROW_TIMING?.stealSignDelay);
    const catcherArrivalAt =
      pitchStartAt +
      Number(window.RUNNER_THROW_TIMING?.pitchDuration);
    return state.timeline
      .filter((item) => (
        item.action !== 'GO' ||
        window.RUNNER_MOVEMENT_RULES
          ?.isStealStartOnTime?.(
            item.at,
            pitchStartAt,
            catcherArrivalAt,
            500
          )
      ))
      .map((item) => item.action);
  }

  function stealStartAssessment(problem) {
    if (!problem.stealSign) return null;
    const pitchStartAt =
      Number(window.RUNNER_THROW_TIMING?.stealSignDelay);
    const catcherArrivalAt =
      pitchStartAt +
      Number(window.RUNNER_THROW_TIMING?.pitchDuration);
    const starts = state.timeline.filter((item) => item.action === 'GO');
    const onTime = starts.some((item) =>
      window.RUNNER_MOVEMENT_RULES
        ?.isStealStartOnTime?.(
          item.at,
          pitchStartAt,
          catcherArrivalAt,
          500
        )
    );
    return {
      attempted: starts.length > 0,
      onTime
    };
  }

  function lateCaughtPitchStealAssessment(problem) {
    if (
      problem.stealSign ||
      problem.start !== 'FIRST' ||
      !['swing', 'take'].includes(problem.scene)
    ) return null;
    const catcherArrivalAt =
      500 + Number(window.RUNNER_THROW_TIMING?.pitchDuration);
    const lateStart = state.timeline.some((item) =>
      item.action === 'GO' &&
      item.at >= catcherArrivalAt
    );
    return lateStart ? { attempted: true, onTime: false } : null;
  }

  function isForcedGroundAdvance(problem) {
    if (
      problem.scene !== 'ground' ||
      !['FIRST', 'SECOND', 'THIRD'].includes(problem.start)
    ) return false;
    if (problem.start === 'FIRST') return true;
    const occupied = new Set(problem.otherBases || []);
    if (problem.start === 'SECOND') return occupied.has('FIRST');
    return occupied.has('FIRST') && occupied.has('SECOND');
  }

  function weightedAxis(problem, axis, actions) {
    const targets = problem.expected.filter((item) => item.axis === axis);
    const max = targets.reduce((sum, item) => sum + item.weight, 0);
    if (!max) return { earned: 0, max: 0 };
    let searchFrom = 0;
    let earnedWeight = 0;
    targets.forEach((target) => {
      const foundAt = actions.indexOf(target.action, searchFrom);
      if (foundAt >= 0) {
        earnedWeight += target.weight;
        searchFrom = foundAt + 1;
      }
    });
    return { earned: earnedWeight, max };
  }

  function roundHalf(value) {
    return Math.round((Number(value) + Number.EPSILON) * 2) / 2;
  }

  function displayNumber(value) {
    return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
  }

  function grade(problem) {
    const evaluatedActions = actionsForGrade(problem);
    const allExpected = problem.expected.map((item) => item.action);
    const stealWasOut =
      problem.stealSign &&
      state.lastSelfDefenseResult?.out === true;
    const exact =
      !stealWasOut &&
      evaluatedActions.length === allExpected.length &&
      evaluatedActions.every(
        (action, index) => action === allExpected[index]
      );
    if (problem.level === 'beginner') {
      return {
        total: exact ? 10 : 0,
        play: null,
        personal: null,
        strategy: null,
        exact,
        evaluatedActions
      };
    }

    const personalWeight = weightedAxis(
      problem,
      'personal',
      evaluatedActions
    );
    const strategyWeight = weightedAxis(
      problem,
      'strategy',
      evaluatedActions
    );
    const hasStrategy = strategyWeight.max > 0;
    const personalMax = hasStrategy ? 5 : 8;
    const personalRaw = personalWeight.max
      ? personalWeight.earned / personalWeight.max * personalMax
      : personalMax;
    const strategyRaw = hasStrategy
      ? strategyWeight.earned / strategyWeight.max * 3
      : 0;
    const matchedWeight = personalWeight.earned + strategyWeight.earned;
    const totalWeight = personalWeight.max + strategyWeight.max;
    const ratio = totalWeight ? matchedWeight / totalWeight : 0;
    const play = exact ? 2 : ratio >= .5 ? 1 : 0;
    const personal = roundHalf(personalRaw);
    const strategy = roundHalf(strategyRaw);
    return {
      total: roundHalf(play + personal + strategy),
      play,
      personal,
      personalMax,
      strategy: hasStrategy ? strategy : null,
      exact,
      evaluatedActions
    };
  }

  function markFor(score) {
    if (score >= 9) return '◎';
    if (score >= 7) return '○';
    if (score >= 4) return '△';
    return '×';
  }

  function bestStoryItems(problem) {
    const expectedActions = problem.expected.map((item) => item.action);
    const caughtFly = ['fly', 'popup', 'liner'].includes(problem.scene);
    return expectedActions.map((action, index) => {
      if (action === 'BACK' && caughtFly) {
        return 'フライが上がったのを見てバックする';
      }
      if (action === 'GO' && problem.stealSign) {
        return 'ピッチャーが投げるのに合わせてスタートを切る';
      }
      if (
        action === 'GO' &&
        caughtFly &&
        expectedActions.slice(0, index).includes('BACK')
      ) {
        return '守る人がボールを取ったのを見てスタートを切る';
      }
      if (action === 'GO' && problem.scene === 'ground') {
        return '打球がゴロになったのを見てスタートを切る';
      }
      if (action === 'GO') {
        return '打球と守る人を見てスタートを切る';
      }
      if (action === 'HALFWAY') {
        return '投球に合わせて2次リードをする';
      }
      if (action === 'STOP') {
        return '守る人と前のランナーを見てストップする';
      }
      if (action === 'KAKENUK') {
        return '内野ゴロを見て、1塁をかけぬける';
      }
      return '外野への打球を見て、ベースを回る';
    });
  }

  function evaluationPhrase(problem, action) {
    if (action === 'BACK' && ['fly', 'popup', 'liner'].includes(problem.scene)) {
      return 'フライが上がった状況でのバック';
    }
    if (action === 'HALFWAY') {
      return '投球に合わせるタイミングでの2次リード';
    }
    if (action === 'GO' && problem.stealSign) {
      return '投球に合わせるタイミングでの盗塁スタート';
    }
    if (action === 'GO' && isForcedGroundAdvance(problem)) {
      return 'ランナーが詰まっている状況でのスタート';
    }
    if (action === 'GO') {
      return '打球と守る人を見たタイミングでのスタート';
    }
    if (action === 'STOP') {
      return '守る人と前のランナーを見たタイミングでのストップ';
    }
    if (action === 'KAKENUK') {
      return '内野ゴロのような状況での1塁かけぬけ';
    }
    return '外野へ打球が飛んだ状況でのオーバーラン';
  }

  function showQuestionResult() {
    if (!state.active) return;
    state.active = false;
    const problem = currentProblem();
    const result = grade(problem);
    state.scores.push(result);
    const mark = markFor(result.total);
    document.querySelector('#result-mark').textContent = mark;
    document.querySelector('#result-score').textContent =
      `${displayNumber(result.total)}／10点`;
    const breakdown = document.querySelector('#score-breakdown');
    if (problem.level === 'beginner') {
      breakdown.innerHTML = `<div class="score-row"><span>基本の考え方</span><b>${displayNumber(result.total)}／10</b></div>`;
    } else {
      const rows = [
        ['プレー結果', result.play, 2],
        ['自分の走り方', result.personal, result.personalMax]
      ];
      if (result.strategy !== null) rows.push(['監督の作戦どおりに動けたか', result.strategy, 3]);
      breakdown.innerHTML = rows.map(([label, score, max]) =>
        `<div class="score-row"><span>${label}</span><b>${displayNumber(score)}／${max}</b></div>`
      ).join('');
    }
    const expectedActions = [
      ...new Set(problem.expected.map((expected) => expected.action))
    ];
    const stealStart =
      stealStartAssessment(problem) ||
      lateCaughtPitchStealAssessment(problem);
    const stealWasOut =
      Boolean(stealStart) &&
      state.lastSelfDefenseResult?.out === true;
    const stealSucceeded =
      Boolean(stealStart?.onTime) &&
      !stealWasOut;
    const completedActions = expectedActions.filter((action) =>
      result.evaluatedActions.includes(action)
    );
    const missingActions = expectedActions.filter((action) =>
      !result.evaluatedActions.includes(action)
    );
    const extraActions = [
      ...new Set(result.evaluatedActions.filter((action) =>
        !expectedActions.includes(action)
      ))
    ];
    const missedForcedGroundAdvance =
      isForcedGroundAdvance(problem) &&
      missingActions.includes('GO');
    const renderFeedbackList = (selector, items) => {
      document.querySelector(selector).innerHTML = items
        .map((item) => `<li>${item}</li>`)
        .join('');
    };
    renderFeedbackList('#best-story-list', bestStoryItems(problem));
    let didItems = completedActions.map((action) =>
      evaluationPhrase(problem, action)
    );
    let missedItems = missingActions.map((action) =>
      evaluationPhrase(problem, action)
    );
    if (stealStart) {
      didItems = stealSucceeded
        ? ['投球に合わせるタイミングでの盗塁スタート']
        : [];
      missedItems = stealSucceeded
        ? []
        : [
            stealWasOut
              ? '投球より遅れたタイミングでの盗塁スタート'
              : stealStart.attempted
              ? '捕手にボールが届いた後のタイミングでの盗塁スタート'
              : '投球に合わせるタイミングでの盗塁スタート'
          ];
    } else if (missedForcedGroundAdvance) {
      didItems = [];
      missedItems = ['ランナーが詰まっている状況でのスタート'];
    } else {
      extraActions.forEach((action) => {
        const causedRunnerOut = state.defenseResults.some((defenseResult) =>
          defenseResult.out &&
          defenseResult.action === action
        );
        if (causedRunnerOut) {
          missedItems.push(
            `この状況での不要な「${ACTION_LABELS[action]}」`
          );
        }
      });
    }
    renderFeedbackList(
      '#feedback-did',
      didItems.length ? didItems : ['なし']
    );
    renderFeedbackList(
      '#feedback-missed',
      missedItems.length ? missedItems : ['なし']
    );
    document.querySelector('#next-question').textContent =
      state.index === 9 ? '結果を見る' : '次の問題へ';
    resultOverlay.hidden = false;
  }

  function replayQuestion() {
    if (state.replaying) return;
    state.replaying = true;
    resultOverlay.hidden = true;
    const replayTimeline = state.timeline.map((item) => ({ ...item }));
    playButton.click();
    replayTimeline.forEach((item) => {
      setTimeout(() => {
        const selector = {
          GO: '#runner-go',
          STOP: '#runner-stop',
          HALFWAY: '#runner-halfway',
          BACK: '#runner-back',
          KAKENUK: '#runner-kakenuke',
          ROUND: '#runner-round'
        }[item.action];
        document.querySelector(selector)?.click();
      }, item.at);
    });
  }

  function showGameResult() {
    const total = roundHalf(state.scores.reduce((sum, result) => sum + result.total, 0));
    const cleared = total >= 80;
    document.querySelector('#final-score').textContent = displayNumber(total);
    document.querySelector('#final-message').textContent =
      cleared ? 'レベルクリア！' : 'もう一度やってみよう';
    let unlockText = '80点以上で次のレベルが開きます。';
    if (cleared && state.levelIndex < LEVELS.length - 1) {
      state.unlocked = Math.max(state.unlocked, state.levelIndex + 2);
      localStorage.setItem('academyRunnerUnlocked', String(state.unlocked));
      unlockText = `「${LEVELS[state.levelIndex + 1].name}」を解放しました！`;
    } else if (cleared) {
      unlockText = 'すべてのレベルをクリアしました！';
    }
    document.querySelector('#unlock-message').textContent = unlockText;
    gameResultOverlay.hidden = false;
  }

  function nextQuestion() {
    resultOverlay.hidden = true;
    if (state.index >= 9) {
      showGameResult();
      return;
    }
    state.index += 1;
    configureProblem(currentProblem());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToLevels() {
    gameResultOverlay.hidden = true;
    app.classList.remove('is-playing');
    levelScreen.hidden = false;
    document.querySelector('#game-header-status').textContent = 'レベル選択';
    renderLevels();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const actionButtons = [
    '#runner-go',
    '#runner-stop',
    '#runner-halfway',
    '#runner-back',
    '#runner-kakenuke',
    '#runner-round'
  ];
  actionButtons.forEach((selector) => {
    document.querySelector(selector)?.addEventListener('click', (event) => {
      if (state.active && !state.started) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  });
  field.addEventListener('runner-action-accepted', (event) => {
    if (ACTION_LABELS[event.detail?.action]) {
      recordAction(event.detail.action);
    }
  });
  field.addEventListener('runner-defense-result', (event) => {
    state.defenseResults.push({
      out: Boolean(event.detail?.out),
      action: state.timeline.at(-1)?.action || null,
      runnerId:
        event.detail?.runnerId ||
        event.detail?.runnerType ||
        null
    });
    if (
      event.detail?.runnerId === 'self' ||
      event.detail?.runnerType === 'self'
    ) {
      state.lastSelfDefenseResult = {
        out: Boolean(event.detail.out),
        targetBaseIndex: Number(event.detail.targetBaseIndex)
      };
    }
  });

  playButton.addEventListener('click', () => {
    if (!state.active) return;
    state.started = true;
    state.startedAt = performance.now();
  }, true);
  field.addEventListener('runner-play-complete', () => {
    clearTimeout(state.resultTimer);
    state.resultTimer = setTimeout(() => {
      if (state.replaying) {
        state.replaying = false;
        resultOverlay.hidden = false;
        return;
      }
      showQuestionResult();
    }, 1000);
  });
  document.querySelector('#result-replay').addEventListener('click', replayQuestion);
  document.querySelector('#next-question').addEventListener('click', nextQuestion);
  document.querySelector('#retry-level').addEventListener('click', () => {
    gameResultOverlay.hidden = true;
    startGame(state.levelIndex);
  });
  document.querySelector('#back-to-levels').addEventListener('click', backToLevels);

  renderLevels();
})();
