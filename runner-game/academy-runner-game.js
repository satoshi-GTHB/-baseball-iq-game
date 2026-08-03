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
    HALFWAY: '２次リード/ハーフウェイ',
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
      immediateStart: false,
      secondaryLeadForbidden: false,
      decoySteal: false,
      autonomousDecoySteal: false,
      autonomousDecoyDelay: 900,
      resultGoal: '',
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
    if (problem.start === 'BATTER') {
      const firstBaseAction = (
        problem.scene === 'ground' ||
        problem.scene === 'popup' ||
        problem.scene === 'liner' ||
        problem.scene === 'error' ||
        problem.scene === 'passed' ||
        (
          problem.scene === 'bunt' &&
          String(problem.direction).endsWith('-ground')
        )
      )
        ? 'KAKENUK'
        : 'ROUND';
      problem.expected = problem.expected.map((item) =>
        ['KAKENUK', 'ROUND'].includes(item.action)
          ? { ...item, action: firstBaseAction }
          : item
      );
    }
    if (
      problem.start !== 'BATTER' &&
      !problem.stealSign &&
      !problem.immediateStart &&
      !problem.secondaryLeadForbidden
    ) {
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
    if (!problem.instruction) {
      problem.expected = problem.expected.map((item) =>
        item.axis === 'strategy'
          ? { ...item, axis: 'personal' }
          : item
      );
    }
    return problem;
  }

  const PROBLEMS = [
    makeProblem('BG-01', 'beginner', {
      start: 'BATTER', title: 'バッターランナー・内野ゴロ',
      prompt: '打ったあとは、1塁でどう走る？',
      expected: [point('KAKENUK', 3)],
      good: '内野ゴロで、1塁をかけぬけられたね。',
      next: '内野への打球では、1塁をまっすぐかけぬけよう。'
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
      good: '内野フライでも、1塁をかけぬけられたね。',
      next: '内野への打球では、1塁をまっすぐかけぬけよう。'
    }),
    makeProblem('BG-07', 'beginner', {
      start: 'BATTER', scene: 'fly', direction: 'left',
      title: 'バッターランナー・外野フライ',
      prompt: '外野フライで、1塁を回って先を見よう。',
      expected: [point('ROUND', 3)]
    }),
    makeProblem('BG-08', 'beginner', {
      start: 'BATTER', direction: 'right', title: '一塁側の内野ゴロ',
      prompt: 'ボールとランナーがほぼ同時に1塁へ来る。1塁をかけぬけよう。',
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
      immediateStart: true,
      secondaryLeadForbidden: true,
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
      title: 'バッターランナー・ライト前ヒット', prompt: '1塁をオーバーランして、1塁で止まろう。',
      expected: [point('ROUND', 3)]
    }),
    makeProblem('MI-10', 'middle', {
      start: 'BATTER', scene: 'extra', direction: 'left-center',
      title: '左中間の長打', prompt: '1塁を回り、2塁へ向かおう。',
      expected: [point('ROUND', 2), point('GO', 3), point('STOP', 1)]
    }),

    makeProblem('AD-01', 'advanced', {
      start: 'FIRST', scene: 'single', direction: 'left',
      otherBases: ['HOME', 'SECOND'],
      secondAdvanceTrigger: 'home-throw',
      title: 'ホームへ投げた間に進む',
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
      start: 'SECOND', scene: 'bunt', direction: 'third-ground',
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
      otherBases: ['HOME', 'THIRD'],
      secondAdvanceTrigger: 'home-throw',
      title: 'ボールを投げた先を見る', prompt: '守る人が別のランナーへ投げた。もう一つ先へ行こう。',
      expected: [point('GO', 2), point('GO', 3)]
    }),
    makeProblem('AD-10', 'advanced', {
      start: 'FIRST', scene: 'extra', direction: 'right-center',
      title: '長打と前の走者', prompt: '前の走者との間を保ちながら進もう。',
      expected: [point('ROUND', 2), point('GO', 3), point('STOP', 2)]
    }),
    makeProblem('AD-11', 'advanced', {
      start: 'FIRST', scene: 'fly', direction: 'center', outs: 0,
      otherBases: ['THIRD'],
      title: '前の走者への送球を見て進む',
      prompt: '3塁走者がタッチアップした。外野からホームへの送球を見て2塁をねらおう。',
      expected: [point('BACK', 2), point('GO', 3)]
    }),

    makeProblem('EX-01', 'expert', {
      start: 'THIRD', outs: 1, otherBases: ['HOME'],
      immediateStart: true, resultGoal: 'score-self',
      title: '1点を取りにいく', instruction: 'アウトになっても1点を取りにいこう。',
      prompt: '監督の作戦どおりに動こう。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('EX-02', 'expert', {
      start: 'THIRD', otherBases: ['HOME', 'SECOND'],
      resultGoal: 'keep-self-safe',
      title: 'ランナーをのこす', instruction: 'むりをせず、ランナーをのこそう。',
      prompt: '監督の作戦どおりに動こう。',
      expected: [point('STOP', 3, 'strategy')]
    }),
    makeProblem('EX-03', 'expert', {
      start: 'FIRST', scene: 'swing', outs: 1,
      immediateStart: true, decoySteal: true,
      otherBases: ['THIRD'], resultGoal: 'decoy-success',
      title: 'おとりになって走る',
      instruction: '盗塁でおとりになれ！',
      prompt: '捕手の動きを見て、おとりの盗塁を成功させよう。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('EX-03B', 'expert', {
      start: 'THIRD', scene: 'swing', outs: 1,
      autonomousDecoySteal: true,
      secondaryLeadForbidden: true,
      otherBases: ['FIRST'], resultGoal: 'score-self',
      title: 'おとりの走者を見て走る',
      instruction: '盗塁でおとりになれ！',
      prompt: '1塁走者が塁の間ではさまれたのを見て、ホームへ走ろう。',
      expected: [point('GO', 3, 'strategy')]
    }),
    makeProblem('EX-03D', 'expert', {
      start: 'THIRD', scene: 'swing', outs: 1,
      autonomousDecoySteal: true,
      autonomousDecoyDelay: 0,
      secondaryLeadForbidden: true,
      otherBases: ['FIRST'], resultGoal: 'keep-self-safe',
      title: '捕手がこちらを見るおとり盗塁',
      instruction: '盗塁でおとりになれ！',
      prompt: '捕手が送球せず自分を見ていたら、3塁にとどまろう。',
      expected: [point('STOP', 3, 'strategy')]
    }),
    makeProblem('EX-04', 'expert', {
      start: 'THIRD', scene: 'bunt', outs: 1,
      direction: 'pitcher-ground',
      otherBases: ['HOME'], immediateStart: true,
      resultGoal: 'score-self',
      title: 'スクイズ・ゴロ',
      instruction: 'スクイズで1点を取ろう。',
      prompt: '投球と同時にスタートしよう。',
      expected: [point('GO', 3, 'strategy'), point('GO', 2)]
    }),
    makeProblem('EX-05', 'expert', {
      start: 'THIRD', scene: 'bunt', outs: 1,
      direction: 'third-popup',
      otherBases: ['HOME'], immediateStart: true,
      resultGoal: 'keep-self-safe',
      title: 'スクイズ・小フライ',
      instruction: 'スクイズで1点を取ろう。',
      prompt: '投球でスタートし、フライなら戻ろう。',
      expected: [point('GO', 3, 'strategy'), point('BACK', 3)]
    }),
    makeProblem('EX-07', 'expert', {
      start: 'THIRD', alignment: '前進守備',
      otherBases: ['HOME', 'SECOND'], resultGoal: 'keep-self-safe',
      title: '1点より走者を残す',
      instruction: 'たくさん点を取るため、むりをしない。',
      prompt: '守る人の位置を見て、どうするか考えよう。',
      expected: [point('STOP', 3, 'strategy')]
    }),
    makeProblem('EX-09', 'expert', {
      start: 'THIRD', scene: 'bunt', direction: 'pitcher-popup',
      otherBases: ['HOME'], resultGoal: 'keep-self-safe',
      immediateStart: true, title: 'スクイズの打球を見る',
      instruction: 'スクイズで1点を取ろう。',
      prompt: 'バントが転がるか、上がるかを見よう。',
      expected: [point('GO', 3, 'strategy'), point('BACK', 2)]
    })
  ];

  const OUTFIELD_DIRECTIONS = [
    'left-line',
    'left',
    'left-center',
    'center',
    'right-center',
    'right',
    'right-line'
  ];
  const INFIELD_DIRECTIONS = [
    'left-line',
    'left',
    'left-center',
    'center',
    'right-center',
    'right',
    'right-line'
  ];

  function directionVariants(problem) {
    if (['fly', 'single', 'extra'].includes(problem.scene)) {
      return OUTFIELD_DIRECTIONS;
    }
    if (['popup', 'liner'].includes(problem.scene)) {
      return INFIELD_DIRECTIONS;
    }
    if (problem.scene !== 'ground') {
      return [problem.direction];
    }
    if (
      problem.start === 'BATTER' ||
      problem.start === 'FIRST' ||
      problem.start === 'THIRD' ||
      problem.outs >= 2 ||
      isForcedGroundAdvance(problem)
    ) {
      return INFIELD_DIRECTIONS;
    }
    const firstDecision = problem.expected.find((item) =>
      item.action !== 'HALFWAY'
    )?.action;
    return firstDecision === 'GO'
      ? ['right-center', 'right', 'right-line']
      : ['left-line', 'left', 'left-center', 'center'];
  }

  function problemCandidates(levelId) {
    return PROBLEMS
      .filter((problem) => problem.level === levelId)
      .flatMap((problem) =>
        directionVariants(problem).map((direction, index) => ({
          ...problem,
          id: `${problem.id}-V${index + 1}`,
          sourceId: problem.id,
          direction
        }))
      );
  }

  function chooseQuestions(levelId, count = 10) {
    if (levelId === 'beginner') {
      const beginnerQuestions = PROBLEMS
        .filter((problem) => problem.level === 'beginner')
        .map((problem) => ({
          ...problem,
          sourceId: problem.id
        }));
      return shuffle(beginnerQuestions).slice(0, count);
    }
    if (levelId === 'expert') {
      const usedExpertSources = new Set();
      const expertCandidates = shuffle(
        problemCandidates(levelId)
      );
      const firstManagerQuestions = expertCandidates
        .filter((problem) => {
          if (usedExpertSources.has(problem.sourceId)) {
            return false;
          }
          usedExpertSources.add(problem.sourceId);
          return true;
        })
        .slice(0, 9);
      const selectedManagerIds = new Set(
        firstManagerQuestions.map((problem) => problem.id)
      );
      const extraManagerQuestions = expertCandidates
        .filter(
          (problem) =>
            !selectedManagerIds.has(problem.id) &&
            firstManagerQuestions.some(
              (selected) =>
                selected.sourceId === problem.sourceId
            )
        )
        .filter((problem, index, candidates) =>
          candidates.findIndex(
            (candidate) =>
              candidate.sourceId === problem.sourceId
          ) === index
        )
        .slice(
          0,
          Math.max(0, 9 - firstManagerQuestions.length)
        );
      const managerQuestions = [
        ...firstManagerQuestions,
        ...extraManagerQuestions
      ];
      const reviewSource = shuffle(
        PROBLEMS.filter(
          (problem) => problem.level !== 'expert'
        )
      )[0];
      const reviewDirection = shuffle(
        directionVariants(reviewSource)
      )[0];
      const reviewQuestion = {
        ...reviewSource,
        id: `REVIEW-${reviewSource.id}`,
        sourceId: reviewSource.id,
        direction: reviewDirection
      };
      return shuffle([
        ...managerQuestions,
        reviewQuestion
      ]);
    }
    const sourceCounts = new Map();
    return shuffle(problemCandidates(levelId))
      .filter((problem) => {
        const used = sourceCounts.get(problem.sourceId) || 0;
        if (used >= 2) return false;
        sourceCounts.set(problem.sourceId, used + 1);
        return true;
      })
      .slice(0, count);
  }

  const app = document.querySelector('.academy-runner-game');
  const field = document.querySelector('#gallery-field');
  const levelScreen = document.querySelector('#level-screen');
  const levelGrid = document.querySelector('#level-grid');
  const resultOverlay = document.querySelector('#result-overlay');
  const gameResultOverlay = document.querySelector('#game-result-overlay');
  const playButton = document.querySelector('#gallery-replay');
  const PROFILE_STORAGE_KEY = 'baseballIqProfilesV1';

  function activeRunnerProfile() {
    try {
      const store = JSON.parse(
        localStorage.getItem(PROFILE_STORAGE_KEY) || 'null'
      );
      const profile = store?.profiles?.find(
        (item) => item.id === store.activeProfileId
      );
      return profile ? { store, profile } : null;
    } catch (error) {
      return null;
    }
  }

  function saveRunnerUserLevel(userLevel) {
    const context = activeRunnerProfile();
    if (!context) return false;
    context.profile.data ||= {};
    context.profile.data.courses ||= {};
    context.profile.data.courses.runner ||= {};
    context.profile.data.courses.runner.userLevel = userLevel;
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(context.store)
    );
    return true;
  }

  const runnerProfile = activeRunnerProfile();
  const legacyUserLevel = Number(
    localStorage.getItem('academyRunnerUserLevel') ||
    localStorage.getItem('academyRunnerUnlocked')
  );
  const savedUserLevel = Number(
    runnerProfile?.profile?.data?.courses?.runner?.userLevel ||
    legacyUserLevel
  );
  const state = {
    userLevel: Math.max(1, Math.min(5, savedUserLevel || 1)),
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
    caughtBallAt: null,
    replaying: false,
    resultTimer: null,
    lastSelfDefenseResult: null,
    playOutcome: null,
    autonomousDecoyStartedAt: null
  };
  if (
    runnerProfile &&
    !runnerProfile.profile.data?.courses?.runner?.userLevel
  ) {
    saveRunnerUserLevel(state.userLevel);
    localStorage.removeItem('academyRunnerUserLevel');
    localStorage.removeItem('academyRunnerUnlocked');
  }

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
      button.innerHTML = `
        <span class="level-number">${index + 1}</span>
        <span class="level-copy"><strong>${level.name}</strong><small>${level.description}</small></span>
        <span class="level-state">あそぶ</span>
      `;
      button.addEventListener('click', () => startGame(index));
      levelGrid.append(button);
    });
  }

  function updateUserLevelDisplay() {
    document.querySelector('#user-level-status').textContent =
      `ユーザーレベル：${LEVELS[state.userLevel - 1].name}`;
    const profileName = document.querySelector('#runner-profile-name');
    if (profileName) {
      profileName.textContent = runnerProfile
        ? `プレイヤー：${runnerProfile.profile.name}`
        : 'プレイヤー：タイトル画面で選んでください';
    }
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
      FIRST: [],
      SECOND: problem.scene === 'ground' ? ['THIRD'] : [],
      THIRD: problem.scene === 'ground' ? ['SECOND'] : []
    }[problem.start] || [];
    const configuredOtherBases = [
      ...(problem.otherBases || defaultOtherBases)
    ];
    if (
      problem.start !== 'BATTER' &&
      !configuredOtherBases.includes('HOME')
    ) {
      configuredOtherBases.unshift('HOME');
    }
    field.dataset.otherBases = configuredOtherBases.join(',');
    field.dataset.requestedDefenseAlignment =
      problem.alignment === '前進守備'
        ? 'infield-in'
        : 'normal';
    field.dataset.managerInstruction = problem.instruction;
    field.dataset.decoySteal =
      String(Boolean(problem.decoySteal));
    field.dataset.autonomousDecoySteal =
      String(Boolean(problem.autonomousDecoySteal));
    field.dataset.autonomousDecoyDelay =
      String(Number(problem.autonomousDecoyDelay) || 0);
    const managerSign = field.querySelector('.manager-sign');
    if (managerSign) {
      managerSign.querySelector('p').textContent = problem.instruction;
      managerSign.setAttribute(
        'aria-hidden',
        String(!problem.instruction)
      );
    }
    field.classList.toggle(
      'manager-instruction-visible',
      Boolean(problem.instruction)
    );
    const replayCoachComment =
      field.querySelector('.replay-coach-comment');
    if (replayCoachComment) {
      replayCoachComment.textContent = problem.instruction;
      replayCoachComment.hidden = true;
    }
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
    state.caughtBallAt = null;
    state.replaying = false;
    state.lastSelfDefenseResult = null;
    state.playOutcome = null;
    state.autonomousDecoyStartedAt = null;
    clearTimeout(state.resultTimer);
    playButton.disabled = false;
    playButton.textContent = '▶ プレー開始';
  }

  function startGame(levelIndex) {
    state.levelIndex = levelIndex;
    state.questions = chooseQuestions(LEVELS[levelIndex].id);
    state.index = 0;
    state.scores = [];
    levelScreen.hidden = true;
    app.classList.add('is-playing');
    configureProblem(currentProblem());
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function recordAction(action) {
    if (!state.active || !state.started) return;
    const replacesBatterRun =
      ['KAKENUK', 'ROUND'].includes(action) &&
      ['KAKENUK', 'ROUND'].includes(state.actions.at(-1)) &&
      state.actions.at(-1) !== action;
    if (replacesBatterRun) {
      state.actions.pop();
      state.timeline.pop();
    }
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
      const selfRunner = (state.playOutcome?.runners || [])
        .find((runner) => runner.id === 'self');
      const selfOut =
        state.playOutcome?.outRunnerIds?.includes('self') ||
        state.lastSelfDefenseResult?.out === true;
      const reachedExpectedBase = Boolean(
        !selfOut &&
        Number(selfRunner?.baseIndex ?? selfRunner?.advance) >=
          expectedDestinationBaseIndex(problem)
      );
      if (reachedExpectedBase) {
        const expectedGoCount = expectedActions.filter(
          (action) => action === 'GO'
        ).length;
        let recordedGoCount = actions.filter(
          (action) => action === 'GO'
        ).length;
        while (recordedGoCount < expectedGoCount) {
          const stopIndex = actions.lastIndexOf('STOP');
          if (stopIndex >= 0) actions.splice(stopIndex, 0, 'GO');
          else actions.push('GO');
          recordedGoCount += 1;
        }
        if (
          expectedActions.includes('STOP') &&
          !actions.includes('STOP') &&
          !selfRunner?.moving &&
          !selfRunner?.offBase
        ) {
          actions.push('STOP');
        }
      }
      const safeFlyReturn =
        ['fly', 'popup', 'liner'].includes(problem.scene) &&
        expectedActions.includes('BACK') &&
        !expectedActions.includes('GO') &&
        actions.at(-1) === 'BACK' &&
        state.lastSelfDefenseResult?.out !== true;
      const safePitcherGroundReturn =
        isThirdBaseGroundJudgment(problem) &&
        directionForScene(problem) === 'pitcher' &&
        actions.at(-1) === 'BACK' &&
        !thirdBaseHomeAttempted();
      if (safeFlyReturn) {
        let leadReplaced = false;
        return actions.flatMap((action) => {
          if (action !== 'GO') return [action];
          if (
            expectedActions.includes('HALFWAY') &&
            !leadReplaced
          ) {
            leadReplaced = true;
            return ['HALFWAY'];
          }
          return [];
        });
      }
      return safePitcherGroundReturn
        ? actions.filter((action) => action !== 'GO')
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

  function defenseThrewHome() {
    return ['home-attempt', 'direct-home'].includes(
      field.dataset.lastThrowRoute
    );
  }

  function isSecondRunnerBehindThirdOnLeftGround(problem) {
    if (
      problem.start !== 'SECOND' ||
      problem.scene !== 'ground' ||
      !['third-line', 'third', 'short'].includes(
        String(directionForScene(problem))
      )
    ) return false;
    const otherBases = new Set(
      problem.otherBases || ['THIRD']
    );
    return otherBases.has('THIRD') && !otherBases.has('FIRST');
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

  function hasEarlyForcedGroundBack(problem, actions) {
    if (!isForcedGroundAdvance(problem)) return false;
    const firstGo = actions.indexOf('GO');
    const firstBack = actions.indexOf('BACK');
    return firstBack >= 0 && (firstGo < 0 || firstBack < firstGo);
  }

  function weightedAxis(problem, axis, actions) {
    const targets = problem.expected.filter((item) => item.axis === axis);
    const max = targets.reduce((sum, item) => sum + item.weight, 0);
    if (!max) return { earned: 0, max: 0 };
    const remainingActions = [...actions];
    let earnedWeight = 0;
    targets.forEach((target) => {
      const foundAt = remainingActions.indexOf(target.action);
      if (foundAt >= 0) {
        earnedWeight += target.weight;
        remainingActions.splice(foundAt, 1);
      }
    });
    return { earned: earnedWeight, max };
  }

  function unmatchedExpectedItems(problem, axis, actions) {
    const targets = problem.expected.filter(
      (item) => item.axis === axis
    );
    const remainingActions = [...actions];
    return targets.filter((target) => {
      const foundAt = remainingActions.indexOf(target.action);
      if (foundAt < 0) return true;
      remainingActions.splice(foundAt, 1);
      return false;
    });
  }

  function isThirdBaseGroundJudgment(problem) {
    return (
      problem.start === 'THIRD' &&
      problem.scene === 'ground' &&
      problem.outs < 2 &&
      !isForcedGroundAdvance(problem)
    );
  }

  function managerOrdersRunForPoint(problem) {
    return (
      problem.start === 'THIRD' &&
      problem.resultGoal === 'score-self' &&
      /アウトになっても1点/.test(problem.instruction || '')
    );
  }

  function thirdBaseRunnerScored() {
    const selfRunner = (state.playOutcome?.runners || [])
      .find((runner) => runner.id === 'self');
    return (
      !state.playOutcome?.outRunnerIds?.includes('self') &&
      Number(selfRunner?.baseIndex ?? selfRunner?.advance) >= 4
    );
  }

  function thirdBaseHomeAttempted() {
    const selfRunner = (state.playOutcome?.runners || [])
      .find((runner) => runner.id === 'self');
    return (
      Number(selfRunner?.baseIndex ?? selfRunner?.advance) >= 4 ||
      Number(state.lastSelfDefenseResult?.targetBaseIndex) >= 4
    );
  }

  function outfieldTwoBaseResult(problem) {
    if (
      !['single', 'extra'].includes(problem.scene) ||
      !['FIRST', 'SECOND'].includes(problem.start)
    ) return null;
    const startBaseIndex = problem.start === 'FIRST' ? 1 : 2;
    const targetBaseIndex = Math.min(4, startBaseIndex + 2);
    const selfRunner = (state.playOutcome?.runners || [])
      .find((runner) => runner.id === 'self');
    const out =
      state.playOutcome?.outRunnerIds?.includes('self') ||
      state.lastSelfDefenseResult?.out === true;
    const reachedTarget =
      Number(selfRunner?.baseIndex ?? selfRunner?.advance) >=
      targetBaseIndex;
    const attemptedTarget =
      Number(state.lastSelfDefenseResult?.targetBaseIndex) >=
      targetBaseIndex;
    if (!reachedTarget && !attemptedTarget) return null;
    return {
      safe: reachedTarget && !out,
      out: Boolean(out)
    };
  }

  function isReachableExtraBaseHit(problem) {
    return Boolean(
      problem.scene === 'extra' &&
      ['left-center', 'right-center'].includes(problem.direction)
    );
  }

  function successfulTagUpAdvance(problem) {
    if (
      !['fly', 'popup', 'liner'].includes(problem.scene) ||
      !['FIRST', 'SECOND', 'THIRD'].includes(problem.start)
    ) return false;
    const startBaseIndex = {
      FIRST: 1,
      SECOND: 2,
      THIRD: 3
    }[problem.start];
    const selfRunner = (state.playOutcome?.runners || [])
      .find((runner) => runner.id === 'self');
    const reachedBaseIndex = Number(
      selfRunner?.baseIndex ?? selfRunner?.advance
    );
    const selfOut =
      state.playOutcome?.outRunnerIds?.includes('self') ||
      state.lastSelfDefenseResult?.out === true;
    return Boolean(
      !selfOut &&
      state.lastSelfDefenseResult?.tagUpEligible &&
      Number.isFinite(reachedBaseIndex) &&
      reachedBaseIndex > startBaseIndex
    );
  }

  function problemForEvaluation(problem) {
    if (problem.secondAdvanceTrigger === 'home-throw') {
      if (!defenseThrewHome()) {
        let firstGoKept = false;
        return {
          ...problem,
          expected: problem.expected.filter((item) => {
            if (item.action !== 'GO') return true;
            if (!firstGoKept) {
              firstGoKept = true;
              return true;
            }
            return false;
          })
        };
      }
    }
    if (
      problem.start !== 'BATTER' &&
      problem.expected.some((item) =>
        ['ROUND', 'KAKENUK'].includes(item.action)
      )
    ) {
      return problemForEvaluation({
        ...problem,
        expected: problem.expected.filter((item) =>
          !['ROUND', 'KAKENUK'].includes(item.action)
        )
      });
    }
    const lead = problem.expected.filter(
      (item) => item.action === 'HALFWAY'
    );
    if (isSecondRunnerBehindThirdOnLeftGround(problem)) {
      const expected = problem.outs >= 2
        ? [...lead, point('GO', 3)]
        : [
            ...lead,
            point('BACK', 2),
            ...(defenseThrewHome() ? [point('GO', 3)] : [])
          ];
      return { ...problem, expected };
    }
    if (
      problem.start === 'BATTER' &&
      problem.scene === 'extra' &&
      !isReachableExtraBaseHit(problem)
    ) {
      return {
        ...problem,
        expected: [point('ROUND', 3)]
      };
    }
    if (successfulTagUpAdvance(problem)) {
      const alreadyExpectsGo = problem.expected.some(
        (item) => item.action === 'GO'
      );
      return {
        ...problem,
        expected: alreadyExpectsGo
          ? problem.expected
          : [...problem.expected, point('GO', 2)]
      };
    }
    const thirdBasePitcherFly =
      problem.start === 'THIRD' &&
      (
        (
          problem.scene === 'popup' &&
          directionForScene(problem) === 'pitcher'
        ) ||
        (
          problem.scene === 'bunt' &&
          problem.direction === 'pitcher-popup'
        )
      );
    if (thirdBasePitcherFly) {
      const strategyAxis = problem.expected.some(
        (item) => item.axis === 'strategy'
      ) ? 'strategy' : 'personal';
      return {
        ...problem,
        expected: problem.immediateStart
          ? [
              point('GO', 3, strategyAxis),
              point('BACK', 3, strategyAxis)
            ]
          : [
              ...lead,
              point('BACK', 3, strategyAxis)
            ]
      };
    }
    if (isThirdBaseGroundJudgment(problem)) {
      const pitcherGround = directionForScene(problem) === 'pitcher';
      const decisiveAction =
        managerOrdersRunForPoint(problem) ||
        (!pitcherGround && thirdBaseRunnerScored())
          ? 'GO'
          : 'BACK';
      const decision = problem.expected.find(
        (item) => item.action !== 'HALFWAY'
      );
      return {
        ...problem,
        expected: [
          ...lead,
          {
            ...(decision || point(decisiveAction, 3)),
            action: decisiveAction
          }
        ]
      };
    }
    const twoBaseResult = outfieldTwoBaseResult(problem);
    if (twoBaseResult?.safe) {
      return {
        ...problem,
        expected: [
          ...lead,
          point('GO', 3),
          point('GO', 2)
        ]
      };
    }
    if (twoBaseResult?.out) {
      return {
        ...problem,
        expected: [
          ...lead,
          point('GO', 3),
          point('STOP', 1),
          point('BACK', 2)
        ]
      };
    }
    return problem;
  }

  function roundHalf(value) {
    return Math.round((Number(value) + Number.EPSILON) * 2) / 2;
  }

  function displayNumber(value) {
    return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
  }

  function strategyOutcome(problem) {
    if (!problem.resultGoal) return null;
    const runners = state.playOutcome?.runners || [];
    const reachedHome = (runner) =>
      Number(runner?.baseIndex ?? runner?.advance) >= 4;
    const selfRunner = runners.find((runner) => runner.id === 'self');
    const thirdRunnerId =
      problem.start === 'THIRD'
        ? 'self'
        : `other-${(problem.otherBases || []).indexOf('THIRD')}`;
    const thirdRunner = runners.find(
      (runner) => runner.id === thirdRunnerId
    );
    if (problem.resultGoal === 'score-self') {
      return {
        met: reachedHome(selfRunner),
        success: 'ねらった1点を取れた',
        failure: 'ねらった1点を取れなかった'
      };
    }
    if (problem.resultGoal === 'score-third') {
      return {
        met: reachedHome(thirdRunner),
        success: '3塁走者がホームに帰れた',
        failure: '3塁走者がホームに帰れなかった'
      };
    }
    if (problem.resultGoal === 'decoy-success') {
      const selfReachedSecond =
        Number(selfRunner?.baseIndex ?? selfRunner?.advance) >= 2;
      const thirdScored = reachedHome(thirdRunner);
      const unchallengedStealSucceeded =
        field.dataset.lastThrowRoute === 'catcher-watches-third' &&
        !state.playOutcome?.outRunnerIds?.includes('self') &&
        state.lastSelfDefenseResult?.out !== true &&
        state.actions.includes('GO');
      const stealSucceeded =
        selfReachedSecond || unchallengedStealSucceeded;
      return {
        met: stealSucceeded || thirdScored,
        success: thirdScored
          ? 'おとりの盗塁で、3塁走者がホームに帰れた'
          : 'キャッチャーが投げない間に、2塁へ盗塁できた',
        failure: '盗塁できず、3塁走者もホームに帰れなかった'
      };
    }
    return {
      met: Boolean(selfRunner),
      success: '監督の指示どおり、ランナーを塁に残せた',
      failure: 'ランナーがアウトになった'
    };
  }

  function actualPlayOutcome(problem) {
    const runners = state.playOutcome?.runners || [];
    const selfRunner = runners.find((runner) => runner.id === 'self');
    const selfOut =
      state.playOutcome?.outRunnerIds?.includes('self') ||
      state.lastSelfDefenseResult?.out === true;
    const forceOutResult = state.defenseResults.find((result) =>
      result.out && result.forceOut
    );
    const fairBallForceOut = Boolean(
      !problem.resultGoal &&
      forceOutResult &&
      (
        ['ground', 'error', 'single', 'extra'].includes(problem.scene) ||
        (
          problem.scene === 'bunt' &&
          String(problem.direction).endsWith('-ground')
        )
      )
    );
    if (fairBallForceOut) {
      return {
        met: true,
        uncontrollable: true,
        success: '',
        failure: ''
      };
    }
    if (selfOut) {
      return {
        met: false,
        success: '',
        failure: `${runnerLabelForId(problem, 'self')}がアウトになった`
      };
    }

    const caughtBatterOut = Boolean(
      problem.start !== 'BATTER' &&
      (
        ['fly', 'popup', 'liner'].includes(problem.scene) ||
        (
          problem.scene === 'bunt' &&
          String(problem.direction).endsWith('-popup')
        )
      )
    );
    if (!problem.resultGoal && caughtBatterOut) {
      return {
        met: true,
        uncontrollable: true,
        success: '',
        failure: ''
      };
    }
    const playEndedByAnotherOut =
      problem.start !== 'BATTER' &&
      state.playOutcome?.inningOver === true;
    if (playEndedByAnotherOut) {
      return {
        met: true,
        uncontrollable: true,
        success: '',
        failure: ''
      };
    }
    const strategy = strategyOutcome(problem);
    if (strategy) return strategy;
    const startBaseIndex = {
      BATTER: 0,
      FIRST: 1,
      SECOND: 2,
      THIRD: 3
    }[problem.start] ?? 0;
    const twoBaseResult = outfieldTwoBaseResult(problem);
    let targetBaseIndex = startBaseIndex;
    if (twoBaseResult) {
      targetBaseIndex = Math.min(4, startBaseIndex + 2);
    } else if (problem.start === 'BATTER') {
      targetBaseIndex = isReachableExtraBaseHit(problem) ? 2 : 1;
    } else if (
      problem.expected.some((item) => item.action === 'GO')
    ) {
      targetBaseIndex = Math.min(4, startBaseIndex + 1);
    }
    const reachedBaseIndex = Number(
      selfRunner?.baseIndex ?? selfRunner?.advance
    );
    const met =
      Number.isFinite(reachedBaseIndex) &&
      reachedBaseIndex >= targetBaseIndex;
    const targetLabel = {
      1: '1塁',
      2: '2塁',
      3: '3塁',
      4: 'ホーム'
    }[targetBaseIndex] || '元の塁';
    const success = targetBaseIndex >= 4
      ? `${runnerLabelForId(problem, 'self')}がホームまで進み、得点できた`
      : targetBaseIndex === startBaseIndex
        ? `${runnerLabelForId(problem, 'self')}が元の塁に残り、セーフだった`
        : `${runnerLabelForId(problem, 'self')}が${targetLabel}まで進み、セーフだった`;
    return {
      met,
      success,
      failure: playResultFailure(problem)
    };
  }

  function runnerLabelForId(problem, runnerId) {
    if (runnerId === 'self') {
      return {
        BATTER: 'バッターランナー',
        FIRST: '1塁走者',
        SECOND: '2塁走者',
        THIRD: '3塁走者'
      }[problem.start] || '操作したランナー';
    }
    const otherIndex = Number(
      String(runnerId).replace('other-', '')
    );
    const otherBase = (problem.otherBases || [])[otherIndex];
    return {
      HOME: 'バッターランナー',
      FIRST: '1塁走者',
      SECOND: '2塁走者',
      THIRD: '3塁走者'
    }[otherBase] || 'ほかのランナー';
  }

  function expectedDestinationBaseIndex(problem) {
    const startBaseIndex = {
      BATTER: 0,
      FIRST: 1,
      SECOND: 2,
      THIRD: 3
    }[problem.start] ?? 0;
    const expectedGoCount = problem.expected.filter(
      (item) => item.action === 'GO'
    ).length;
    return (
      problem.start === 'BATTER' &&
      isReachableExtraBaseHit(problem)
        ? 2
        : problem.start === 'BATTER'
          ? 1
          : Math.min(4, startBaseIndex + expectedGoCount)
    );
  }

  function expectedDestinationLabel(problem) {
    const targetBaseIndex = expectedDestinationBaseIndex(problem);
    return {
      1: '1塁',
      2: '2塁',
      3: '3塁',
      4: 'ホーム'
    }[targetBaseIndex] || '目標の塁';
  }

  function intendedGoalForAction(problem, action) {
    const destination = expectedDestinationLabel(problem);
    if (problem.resultGoal === 'score-self') {
      return 'ホームに帰って1点を取る';
    }
    if (problem.resultGoal === 'decoy-success') {
      return '盗塁するか、3塁走者が1点を取る';
    }
    if (problem.resultGoal === 'keep-self-safe') {
      return 'アウトにならず、塁に残る';
    }
    if (
      ['fly', 'popup', 'liner'].includes(problem.scene) &&
      action === 'GO'
    ) {
      return successfulTagUpAdvance(problem)
        ? `元の塁へ戻ってから、${destination}へ進む`
        : '元の塁へ戻ってセーフになる';
    }
    if (action === 'BACK') {
      return `${destination}へ進んでセーフになる`;
    }
    if (action === 'STOP') {
      return '安全な塁で止まる';
    }
    if (problem.start === 'BATTER') {
      return '1塁でセーフになる';
    }
    return `${destination}でセーフになる`;
  }

  function defenseLocationDescription(problem) {
    const direction = directionForScene(problem);
    const position = {
      'third-line': '三塁線を守るサードの近く',
      third: 'サードの正面',
      short: 'ショートの近く',
      pitcher: 'ピッチャーの正面',
      second: 'セカンドの近く',
      first: 'ファーストの正面',
      'first-line': '一塁線を守るファーストの近く',
      'left-line': 'レフト線を守るレフトの近く',
      left: 'レフトの正面',
      'left-center': '左中間のレフトとセンターの間',
      center: 'センターの正面',
      'right-center': '右中間のセンターとライトの間',
      right: 'ライトの正面',
      'right-line': 'ライト線を守るライトの近く'
    }[direction] || 'ボールを取る人の近く';
    if (problem.start === 'SECOND') {
      const relative = [
        'third-line', 'third', 'short', 'pitcher'
      ].includes(direction)
        ? '2塁走者から見て前にいる'
        : '2塁走者から見て後ろにいる';
      return `${relative}${position}`;
    }
    if (problem.start === 'THIRD') {
      const relative = ['third-line', 'third'].includes(direction)
        ? '3塁走者に近い'
        : '3塁走者から離れた位置にいる';
      return `${relative}${position}`;
    }
    return position;
  }

  function extraActionOutFeedback(problem, action) {
    const situation = sceneSituation(problem);
    const intendedGoal = intendedGoalForAction(problem, action);
    const location = defenseLocationDescription(problem);
    const selfPosition = runnerLabelForId(problem, 'self');
    const destination = expectedDestinationLabel(problem);
    if (action === 'GO') {
      return `${selfPosition}。ねらいは「${intendedGoal}」。${location}への${situation}で、${destination}へ進んでアウトになった`;
    }
    if (action === 'BACK') {
      return `${selfPosition}。ねらいは「${intendedGoal}」。${location}への${situation}で、元の塁へ戻ってアウトになった`;
    }
    if (action === 'STOP') {
      return `${selfPosition}。ねらいは「${intendedGoal}」。${location}への${situation}で、塁の間に止まってアウトになった`;
    }
    if (action === 'HALFWAY') {
      return `${selfPosition}。ねらいは「${intendedGoal}」。${location}への${situation}で、早く塁を離れてアウトになった`;
    }
    return `${selfPosition}。ねらいは「${intendedGoal}」。${location}への${situation}で「${ACTION_LABELS[action]}」を選び、アウトになった`;
  }

  function missedActionFeedback(problem, action) {
    const selfPosition = runnerLabelForId(problem, 'self');
    const intendedGoal = intendedGoalForAction(problem, action);
    const location = defenseLocationDescription(problem);
    const situation = sceneSituation(problem);
    const destination = expectedDestinationLabel(problem);
    const selfOut =
      state.playOutcome?.outRunnerIds?.includes('self') ||
      state.lastSelfDefenseResult?.out === true;
    const outFact = selfOut
      ? `、${selfPosition}がアウトになった`
      : '';
    if (
      action === 'GO' &&
      isSecondRunnerBehindThirdOnLeftGround(problem)
    ) {
      return problem.outs >= 2
        ? '2アウトなのに、バットに当たった瞬間に3塁へ走らなかった'
        : '守備がホームへ投げたのに、その間に3塁へ走らなかった';
    }
    if (
      action === 'BACK' &&
      isSecondRunnerBehindThirdOnLeftGround(problem)
    ) {
      return 'ショートやサードへのゴロで、ホーム送球を確認する前に3塁へ進み、2塁へ戻らなかった';
    }
    if (action === 'GO') {
      return `${selfPosition}。ねらいは「${intendedGoal}」。${location}への${situation}で、${destination}へ進まなかった${outFact}`;
    }
    if (action === 'BACK') {
      return `${selfPosition}。ねらいは「${intendedGoal}」。${location}への${situation}で、元の塁へ戻らず${outFact || '、アウトになった'}`;
    }
    if (action === 'STOP') {
      return `${selfPosition}。ねらいは「${intendedGoal}」。${location}への${situation}で、安全な${destination}に止まらなかった${outFact}`;
    }
    if (action === 'HALFWAY') {
      return `${selfPosition}。ピッチャーが投げたときに、2次リードをしなかった${outFact}`;
    }
    return `${selfPosition}。${location}への${situation}で「${ACTION_LABELS[action]}」を選ばなかった${outFact}`;
  }

  function specificActionDifferenceFeedback(
    problem,
    axis,
    actions,
    selectedAction = null
  ) {
    const expectedItems = problem.expected.filter(
      (item) => item.axis === axis
    );
    const unmatched = unmatchedExpectedItems(
      problem,
      axis,
      actions
    );
    const expectedAction = unmatched[0]?.action ||
      expectedItems[0]?.action;
    const allExpectedActions = problem.expected.map(
      (item) => item.action
    );
    const actualAction = selectedAction || actions.find(
      (action) => !allExpectedActions.includes(action)
    );
    if (expectedAction && actualAction) {
      return `自分は${runnerLabelForId(problem, 'self')}。${defenseLocationDescription(problem)}への${sceneSituation(problem)}で「${ACTION_LABELS[expectedAction]}」をするところ、「${ACTION_LABELS[actualAction]}」を選んだ`;
    }
    if (expectedAction) {
      return missedActionFeedback(problem, expectedAction);
    }
    if (actualAction) {
      return `自分は${runnerLabelForId(problem, 'self')}。${defenseLocationDescription(problem)}への${sceneSituation(problem)}で「${ACTION_LABELS[actualAction]}」を選んだ`;
    }
    return `自分は${runnerLabelForId(problem, 'self')}。${defenseLocationDescription(problem)}への${sceneSituation(problem)}で、点になる走り方ができなかった`;
  }

  function unmatchedItemFeedback(problem, item, actions) {
    const expectedCount = problem.expected.filter(
      (expected) => expected.action === item.action
    ).length;
    const recordedCount = actions.filter(
      (action) => action === item.action
    ).length;
    return recordedCount < expectedCount
      ? missedActionFeedback(problem, item.action)
      : '';
  }

  function playResultFailure(problem) {
    const outRunnerIds = state.playOutcome?.outRunnerIds || [];
    if (outRunnerIds.length) {
      const labels = outRunnerIds.map((runnerId) =>
        runnerLabelForId(problem, runnerId)
      );
      return `${[...new Set(labels)].join('と')}がアウトになったこと`;
    }
    if (
      problem.start === 'THIRD' &&
      problem.expected.some((item) => item.action === 'GO')
    ) {
      return 'ホームへ進めず、得点できなかったこと';
    }
    if (problem.expected.some((item) => item.action === 'GO')) {
      return `${expectedDestinationLabel(problem)}へ進めなかったこと`;
    }
    if (problem.expected.some((item) => item.action === 'BACK')) {
      return `${runnerLabelForId(problem, 'self')}がアウトになったこと`;
    }
    return 'ランナーを安全に塁へ残せなかったこと';
  }

  function failedTagUpAssessment(problem) {
    const caughtFly =
      ['fly', 'popup', 'liner'].includes(problem.scene) ||
      (
        problem.scene === 'bunt' &&
        String(problem.direction).endsWith('-popup')
      );
    const selfOut =
      state.playOutcome?.outRunnerIds?.includes('self') ||
      state.lastSelfDefenseResult?.out === true;
    if (
      !caughtFly ||
      !selfOut ||
      !['FIRST', 'SECOND', 'THIRD'].includes(problem.start) ||
      state.caughtBallAt === null ||
      !Number.isFinite(Number(state.caughtBallAt))
    ) return null;
    const tagUpGo = state.timeline.find((item) =>
      item.action === 'GO' &&
      item.at >= Number(state.caughtBallAt) - 100
    );
    if (!tagUpGo) return null;
    const prohibited = Boolean(
      state.lastSelfDefenseResult?.prohibitedFirstBaseTagUp ||
      state.lastSelfDefenseResult?.prohibitedSecondBaseTagUp
    );
    const delay = tagUpGo.at - Number(state.caughtBallAt);
    return {
      prohibited,
      late: !prohibited && delay > 650,
      delay
    };
  }

  function grade(problem) {
    const submittedActions = actionsForGrade(problem);
    const firstGoAt = state.timeline.find(
      (item) => item.action === 'GO'
    )?.at;
    const earlyAutonomousDecoyGo =
      problem.autonomousDecoySteal &&
      Number.isFinite(Number(firstGoAt)) &&
      (
        state.autonomousDecoyStartedAt === null ||
        Number(firstGoAt) <
          Number(state.autonomousDecoyStartedAt)
      );
    const earlyForcedGroundBack =
      hasEarlyForcedGroundBack(problem, submittedActions);
    const forcedLeadBeforeImmediateStart =
      problem.secondaryLeadForbidden &&
      submittedActions.includes('HALFWAY');
    const evaluatedActions = (
      earlyForcedGroundBack ||
      forcedLeadBeforeImmediateStart ||
      earlyAutonomousDecoyGo
    )
      ? submittedActions.filter((action) => action !== 'GO')
      : submittedActions;
    const allExpected = problem.expected.map((item) => item.action);
    const decisionExact =
      evaluatedActions.length === allExpected.length &&
      evaluatedActions.every(
        (action, index) => action === allExpected[index]
      );
    if (problem.level === 'beginner') {
      return {
        total: decisionExact ? 10 : 0,
        play: null,
        personal: null,
        strategy: null,
        outcome: null,
        exact: decisionExact,
        evaluatedActions
      };
    }
    const stealWasOut =
      problem.stealSign &&
      state.lastSelfDefenseResult?.out === true;
    const pickoffOut =
      state.lastSelfDefenseResult?.out === true &&
      state.lastSelfDefenseResult?.reason === 'pickoff';
    const exact =
      !stealWasOut &&
      !pickoffOut &&
      decisionExact;

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
    const expertResultFocus = problem.level === 'expert';
    let personalMax = expertResultFocus
      ? 2
      : hasStrategy ? 5 : 8;
    let personalRaw = personalWeight.max
      ? personalWeight.earned / personalWeight.max * personalMax
      : 0;
    if (
      expertResultFocus &&
      problem.immediateStart &&
      submittedActions.includes('HALFWAY')
    ) {
      personalRaw *= .5;
    }
    if (pickoffOut) personalRaw = 0;
    const failedTagUp = failedTagUpAssessment(problem);
    if (failedTagUp) {
      personalRaw = failedTagUp.prohibited
        ? 0
        : Math.min(personalRaw, personalMax * .5);
    }
    let strategyRaw = hasStrategy
      ? strategyWeight.earned / strategyWeight.max * 3
      : 0;
    if (pickoffOut) strategyRaw = 0;
    const outcome = actualPlayOutcome(problem);
    const resultWeight = expertResultFocus ? 5 : 2;
    const playIsEvaluated = !outcome?.uncontrollable;
    const play = playIsEvaluated && outcome?.met ? resultWeight : 0;
    const playMax = playIsEvaluated ? resultWeight : 0;
    if (!playIsEvaluated && personalWeight.max) {
      personalMax += resultWeight;
      personalRaw = personalWeight.earned /
        personalWeight.max * personalMax;
      if (pickoffOut) personalRaw = 0;
    }
    const personal = roundHalf(personalRaw);
    const strategy = roundHalf(strategyRaw);
    return {
      total: roundHalf(play + personal + strategy),
      play,
      playMax,
      personal,
      personalMax,
      strategy: hasStrategy ? strategy : null,
      outcome,
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

  function sceneSituation(problem) {
    return {
      ground: '内野ゴロ',
      fly: '外野フライ',
      popup: '内野フライ',
      liner: 'ライナー',
      single: '外野前ヒット',
      extra: '長打',
      passed: 'ボールが後ろへそれた場面',
      swing: '空振り',
      take: '見逃し',
      error: '守備のエラー',
      bunt: 'バント'
    }[problem.scene] || '打球';
  }

  function bestStoryItems(problem) {
    const expectedActions = problem.expected.map((item) => item.action);
    const caughtFly = ['fly', 'popup', 'liner'].includes(problem.scene);
    const situation = sceneSituation(problem);
    if (problem.decoySteal) {
      return field.dataset.lastThrowRoute ===
        'catcher-watches-third'
        ? [
            'ピッチャーが投げたら、盗塁を始める',
            'キャッチャーが投げなければ、そのまま2塁へ走る'
          ]
        : [
            'ピッチャーが投げたら、盗塁を始める',
            'キャッチャーが2塁へ投げたら、3塁走者はホームへ走る'
          ];
    }
    return expectedActions.map((action, index) => {
      if (
        problem.autonomousDecoySteal &&
        problem.autonomousDecoyDelay === 0 &&
        action === 'STOP'
      ) {
        return 'キャッチャーが3塁を見ていたら、3塁に止まる';
      }
      if (
        problem.autonomousDecoySteal &&
        action === 'GO'
      ) {
        return '1塁走者がはさまれたら、ホームへ走る';
      }
      if (problem.decoySteal && action === 'BACK') {
        return '塁の間で挟まれたら、元の塁の方向へ逃げる';
      }
      if (problem.decoySteal && action === 'GO') {
        return index === 0
          ? '盗塁をして、キャッチャーに2塁へ投げさせる'
          : 'ボールが来たら、次の塁へにげる';
      }
      if (
        action === 'BACK' &&
        isSecondRunnerBehindThirdOnLeftGround(problem)
      ) {
        return 'ショートやサードへのゴロで、守備がホームへ投げていないため2塁へ戻る';
      }
      if (action === 'BACK' && caughtFly) {
        return `${situation}が上がったのを見てバックする`;
      }
      if (action === 'BACK' && problem.scene === 'bunt') {
        return 'バントがフライになったのを見てバックする';
      }
      if (action === 'BACK') {
        return `${situation}と守る人を見て元の塁へ戻る`;
      }
      if (
        action === 'GO' &&
        isSecondRunnerBehindThirdOnLeftGround(problem)
      ) {
        return problem.outs >= 2
          ? '2アウトなので、バットに当たった瞬間に3塁へ走る'
          : '守備がホームへ投げたのを見て、3塁へ走る';
      }

    if (action === 'GO' && problem.stealSign) {
        return 'ピッチャーが投げるのに合わせてスタートを切る';
      }
      if (action === 'GO' && problem.immediateStart) {
        return problem.instruction
          ? '監督の指示に合わせて、投球と同時にスタートを切る'
          : 'ピッチャーが投げたら、すぐにスタートを切る';
      }
      if (
        action === 'GO' &&
        caughtFly &&
        expectedActions.slice(0, index).includes('BACK')
      ) {
        return '守る人がボールを取ったのを見てスタートを切る';
      }
      if (action === 'GO' && problem.scene === 'bunt') {
        return 'バントが転がったのを見てスタートを切る';
      }
      if (
        action === 'GO' &&
        problem.secondAdvanceTrigger === 'home-throw'
      ) {
        const goNumber = expectedActions
          .slice(0, index + 1)
          .filter((expectedAction) => expectedAction === 'GO').length;
        if (goNumber === 2) {
          return '守る人がホームへ投げたのを見て、もう一つ先の塁へ進む';
        }
        return problem.start === 'FIRST'
          ? 'ヒットで2塁へ進む'
          : 'ヒットで3塁へ進む';
      }
      if (action === 'GO' && isForcedGroundAdvance(problem)) {
        return '内野ゴロで元の塁へ戻れないため、次の塁へ進む';
      }
      if (action === 'GO') {
        return `${situation}と守る人を見てスタートを切る`;
      }
      if (action === 'HALFWAY') {
        return 'ピッチャーが投げたら、2次リードをする';
      }
      if (action === 'STOP') {
        return `${situation}と前のランナーを見てストップする`;
      }
      if (action === 'KAKENUK') {
        return `${situation}を見て、1塁をかけぬける`;
      }
      return `${situation}を見て、1塁を回る`;
    });
  }

  function evaluationPhrase(problem, action) {
    const situation = sceneSituation(problem);
    if (
      problem.autonomousDecoySteal &&
      problem.autonomousDecoyDelay === 0 &&
      action === 'STOP'
    ) {
      return 'キャッチャーが3塁を見ていたので、3塁で止まれた';
    }
    if (
      action === 'GO' &&
      problem.autonomousDecoySteal
    ) {
      return 'キャッチャーが2塁へ投げたとき、ホームへ走れた';
    }
    if (action === 'GO' && problem.decoySteal) {
      return field.dataset.lastThrowRoute ===
        'catcher-watches-third'
        ? 'キャッチャーが投げない間に、2塁へ盗塁できた'
        : '3塁走者をホームへ返すため、おとりの盗塁ができた';
    }
    if (action === 'BACK' && problem.decoySteal) {
      return 'はさまれたとき、ボールと反対へにげられた';
    }
    if (
      action === 'BACK' &&
      isSecondRunnerBehindThirdOnLeftGround(problem)
    ) {
      return 'ショートやサードへのゴロで、ホーム送球がなかったため2塁へ戻れた';
    }
    if (action === 'BACK' && ['fly', 'popup', 'liner'].includes(problem.scene)) {
      return `${situation}が上がったので、元の塁へ戻れた`;
    }
    if (action === 'HALFWAY') {
      return 'ピッチャーが投げたとき、2次リードができた';
    }
    if (
      action === 'GO' &&
      isSecondRunnerBehindThirdOnLeftGround(problem)
    ) {
      return problem.outs >= 2
        ? '2アウトで、バットに当たった瞬間に3塁へ走れた'
        : 'ホーム送球を見て、3塁へ走れた';
    }
    if (action === 'GO' && problem.stealSign) {
      return 'ピッチャーが投げたとき、盗塁を始められた';
    }
    if (action === 'GO' && problem.immediateStart) {
      return problem.instruction
        ? '監督の指示どおり、すぐに走れた'
        : 'ピッチャーが投げたら、すぐに走り始められた';
    }
    if (action === 'GO' && isForcedGroundAdvance(problem)) {
      return '内野ゴロで戻れないため、次の塁へ走れた';
    }
    if (action === 'GO') {
      return `${situation}と守る人を見て、走り始められた`;
    }
    if (action === 'STOP') {
      return `${situation}と前のランナーを見て、止まれた`;
    }
    if (action === 'KAKENUK') {
      return `${situation}を見て、1塁をかけぬけられた`;
    }
    if (action === 'ROUND') {
      return `${situation}を見て、1塁を回れた`;
    }
    return `${situation}を見て、元の塁へ戻れた`;
  }

  function easyAdviceText(text) {
    return String(text)
      .replaceAll('打者走者', 'バッターランナー')
      .replaceAll('走者', 'ランナー')
      .replaceAll('打者', 'バッター')
      .replaceAll('一塁', '1塁')
      .replaceAll('二塁', '2塁')
      .replaceAll('三塁', '3塁')
      .replaceAll('投手', 'ピッチャー')
      .replaceAll('捕手', 'キャッチャー')
      .replaceAll('一塁手', 'ファースト')
      .replaceAll('1塁手', 'ファースト')
      .replaceAll('二塁手', 'セカンド')
      .replaceAll('2塁手', 'セカンド')
      .replaceAll('三塁手', 'サード')
      .replaceAll('3塁手', 'サード')
      .replaceAll('遊撃手', 'ショート')
      .replaceAll('左翼手', 'レフト')
      .replaceAll('中堅手', 'センター')
      .replaceAll('右翼手', 'ライト')
      .replaceAll('守備者', '守る人')
      .replaceAll('送球', 'ボールを投げること')
      .replaceAll('捕球', 'ボールを取ること')
      .replaceAll('進塁', '次の塁へ進むこと')
      .replaceAll('挟殺', '塁の間ではさむプレー')
      .replaceAll('切り返し', 'ボールと反対へにげること')
      .replaceAll('とどまる', '止まる')
      .replaceAll('実行', 'その動き')
      .replaceAll('タイミングでの', 'ときの')
      .replaceAll('状況での', 'ときの')
      .replaceAll('無謀なプレー', 'セーフになるのがむずかしいプレー')
      .replaceAll('想定した', 'お手本の');
  }

  function validateProblemAdvice() {
    const forbiddenByScene = {
      ground: ['外野フライ', '外野前ヒット', '長打', '内野フライ'],
      fly: ['内野ゴロ', '内野フライ', '外野前ヒット'],
      popup: ['内野ゴロ', '外野フライ', '外野前ヒット'],
      liner: ['内野ゴロ', '内野フライ', '外野フライ'],
      single: ['内野ゴロ', '内野フライ', '外野フライ', '長打'],
      extra: ['内野ゴロ', '内野フライ', '外野フライ', '外野前ヒット'],
      passed: ['内野ゴロ', '内野フライ', '外野フライ', '外野前ヒット', '長打']
    };
    const issues = [];
    PROBLEMS.forEach((problem) => {
      const phrases = [
        ...bestStoryItems(problem),
        ...problem.expected.map((item) =>
          evaluationPhrase(problem, item.action)
        )
      ];
      (forbiddenByScene[problem.scene] || []).forEach((word) => {
        if (phrases.some((phrase) => phrase.includes(word))) {
          issues.push(`${problem.id}: ${word}`);
        }
      });
    });
    if (issues.length) {
      throw new Error(
        `出題とアドバイスが一致していません: ${issues.join(', ')}`
      );
    }
  }

  function validateManagerSituations() {
    const issues = [];
    PROBLEMS
      .filter((problem) => problem.instruction)
      .forEach((problem) => {
        const otherBases = new Set(problem.otherBases || []);
        const scoresRunner =
          /1点|返そ|かえる|ホーム/.test(
            `${problem.instruction}${problem.prompt}`
          );
        if (scoresRunner && problem.outs >= 2) {
          issues.push(`${problem.id}: 2アウトで得点を助ける指示`);
        }
        if (
          /3塁走者|前の走者/.test(problem.instruction) &&
          problem.start !== 'THIRD' &&
          !otherBases.has('THIRD')
        ) {
          issues.push(`${problem.id}: 3塁走者がいない`);
        }
        if (
          /1塁走者/.test(problem.instruction) &&
          problem.start !== 'FIRST' &&
          !otherBases.has('FIRST')
        ) {
          issues.push(`${problem.id}: 1塁走者がいない`);
        }
        if (
          /スクイズ/.test(problem.instruction) &&
          (
            problem.start !== 'THIRD' ||
            !otherBases.has('HOME')
          )
        ) {
          issues.push(`${problem.id}: スクイズの走者配置が違う`);
        }
        if (
          (
            /アウトになっても1点|スクイズ/.test(
              problem.instruction
            )
          ) &&
          !problem.immediateStart
        ) {
          issues.push(`${problem.id}: すぐスタートする設定がない`);
        }
        if (problem.level === 'expert' && !problem.resultGoal) {
          issues.push(`${problem.id}: 結果の目標がない`);
        }
        if (
          problem.decoySteal &&
          (
            problem.start !== 'FIRST' ||
            !otherBases.has('THIRD') ||
            problem.scene !== 'swing'
          )
        ) {
          issues.push(`${problem.id}: おとり盗塁の状況が違う`);
        }
        if (
          problem.autonomousDecoySteal &&
          (
            problem.start !== 'THIRD' ||
            !otherBases.has('FIRST') ||
            problem.scene !== 'swing'
          )
        ) {
          issues.push(`${problem.id}: おとりを見る状況が違う`);
        }
        if (
          problem.scene === 'bunt' &&
          ![
            'third-ground',
            'third-popup',
            'pitcher-ground',
            'pitcher-popup',
            'first-ground',
            'first-popup'
          ].includes(problem.direction)
        ) {
          issues.push(`${problem.id}: バントの打球設定が違う`);
        }
      });
    if (issues.length) {
      throw new Error(
        `監督の指示と状況が一致していません: ${issues.join(', ')}`
      );
    }
  }

  function showQuestionResult() {
    if (!state.active) return;
    state.active = false;
    const problem = problemForEvaluation(currentProblem());
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
        ['プレー結果', result.play, result.playMax],
        ['自分の走り方', result.personal, result.personalMax]
      ].filter(([, , max]) => Number(max) > 0);
      if (result.strategy !== null) rows.push(['監督の作戦どおりに動けたか', result.strategy, 3]);
      breakdown.innerHTML = rows.map(([label, score, max]) =>
        `<div class="score-row"><span>${label}</span><b>${displayNumber(score)}／${max}</b></div>`
      ).join('');
    }
    const expectedActions = [
      ...new Set(problem.expected.map((expected) => expected.action))
    ];
    const stealStart = problem.decoySteal
      ? null
      : (
          stealStartAssessment(problem) ||
          lateCaughtPitchStealAssessment(problem)
        );
    const stealWasOut =
      Boolean(stealStart) &&
      state.lastSelfDefenseResult?.out === true;
    const stealSucceeded =
      Boolean(stealStart?.onTime) &&
      !stealWasOut;
    const pickoffOut =
      state.lastSelfDefenseResult?.out === true &&
      state.lastSelfDefenseResult?.reason === 'pickoff';
    const completedActions = expectedActions.filter((action) =>
      result.evaluatedActions.includes(action)
    );
    const unmatchedPersonalItems = unmatchedExpectedItems(
      problem,
      'personal',
      result.evaluatedActions
    );
    const unmatchedStrategyItems = unmatchedExpectedItems(
      problem,
      'strategy',
      result.evaluatedActions
    );
    const missingActions = [
      ...new Set([
        ...unmatchedPersonalItems,
        ...unmatchedStrategyItems
      ].map((item) => item.action))
    ];
    const extraActions = [
      ...new Set(result.evaluatedActions.filter((action) =>
        !expectedActions.includes(action)
      ))
    ];
    const missedForcedGroundAdvance =
      isForcedGroundAdvance(problem) &&
      missingActions.includes('GO');
    const usedForbiddenSecondaryLead =
      problem.secondaryLeadForbidden &&
      state.actions.includes('HALFWAY');
    const recklessPitcherGroundGo =
      isThirdBaseGroundJudgment(problem) &&
      directionForScene(problem) === 'pitcher' &&
      thirdBaseHomeAttempted() &&
      (
        !managerOrdersRunForPoint(problem) ||
        state.playOutcome?.outRunnerIds?.includes('self') ||
        state.lastSelfDefenseResult?.out === true
      );
    const failedOutfieldTwoBaseAttempt =
      outfieldTwoBaseResult(problem)?.out === true;
    const recklessLeftFlySecondTagUp =
      problem.start === 'SECOND' &&
      problem.scene === 'fly' &&
      ['left-line', 'left'].includes(problem.direction) &&
      result.evaluatedActions.includes('GO');
    const failedTagUp = failedTagUpAssessment(problem);
    const renderFeedbackList = (selector, items) => {
      document.querySelector(selector).innerHTML = items
        .map((item) => `<li>${easyAdviceText(item)}</li>`)
        .join('');
    };
    const renderFeedbackGroups = (selector, groups) => {
      document.querySelector(selector).innerHTML = groups
        .map(({ label, items }) => [
          `<li class="feedback-axis-title">（${label}）</li>`,
          ...(items.length ? items : ['なし'])
            .map((item) => `<li>${easyAdviceText(item)}</li>`)
        ].join(''))
        .join('');
    };
    renderFeedbackList('#best-story-list', [
      ...bestStoryItems(problem),
      ...(
        result.outcome?.uncontrollable && result.outcome?.success
          ? [result.outcome.success]
          : []
      )
    ]);
    if (problem.level === 'beginner') {
      const beginnerDidItems = result.exact
        ? expectedActions.map((action) => evaluationPhrase(problem, action))
        : completedActions.map((action) => evaluationPhrase(problem, action));
      const beginnerMissedItems = result.exact
        ? []
        : [
            ...new Set([
              ...missingActions.map((action) =>
                missedActionFeedback(problem, action)
              ),
              ...extraActions.map((action) =>
                specificActionDifferenceFeedback(
                  problem,
                  'personal',
                  result.evaluatedActions,
                  action
                )
              )
            ])
          ];
      renderFeedbackGroups('#feedback-did', [
        { label: '基本の考え方', items: beginnerDidItems }
      ]);
      renderFeedbackGroups('#feedback-missed', [
        { label: '基本の考え方', items: beginnerMissedItems }
      ]);
      document.querySelector('#next-question').textContent =
        state.index === 9 ? '結果を見る' : '次の問題へ';
      resultOverlay.hidden = false;
      return;
    }
    const personalActions = new Set(
      problem.expected
        .filter((item) => item.axis !== 'strategy')
        .map((item) => item.action)
    );
    const strategyActions = new Set(
      problem.expected
        .filter((item) => item.axis === 'strategy')
        .map((item) => item.action)
    );
    let didItems = completedActions
      .filter((action) => personalActions.has(action))
      .map((action) => evaluationPhrase(problem, action));
    let missedItems = [
      ...new Set(unmatchedPersonalItems.map((item) =>
        unmatchedItemFeedback(
          problem,
          item,
          result.evaluatedActions
        )
      ))
    ];
    let strategyDidItems = completedActions
      .filter((action) => strategyActions.has(action))
      .map((action) => evaluationPhrase(problem, action));
    let strategyMissedItems = [
      ...new Set(unmatchedStrategyItems.map((item) =>
        unmatchedItemFeedback(
          problem,
          item,
          result.evaluatedActions
        )
      ))
    ];
    if (pickoffOut) {
      didItems = [];
      missedItems = [
        '投球前に塁を離れすぎ、けん制で挟まれてアウトになった'
      ];
      strategyDidItems = [];
      strategyMissedItems = result.strategy === null
        ? []
        : ['監督の指示を実行する前に、けん制でアウトになった'];
    } else if (stealStart) {
      strategyDidItems = stealSucceeded
        ? ['投球に合わせるタイミングでの盗塁スタート']
        : [];
      strategyMissedItems = stealSucceeded
        ? []
        : [
            stealWasOut
              ? '投球より遅れたタイミングでの盗塁スタート'
              : stealStart.attempted
              ? '捕手にボールが届いた後のタイミングでの盗塁スタート'
              : '投球に合わせるタイミングでの盗塁スタート'
          ];
    } else if (usedForbiddenSecondaryLead) {
      didItems = [];
      missedItems = [
        '2アウト・3ボール2ストライクで、投球前に2次リードを取ってしまった'
      ];
      strategyDidItems = [];
      strategyMissedItems = [
        '2アウト・3ボール2ストライクで、投球と同時にスタートすること'
      ];
    } else if (recklessPitcherGroundGo) {
      didItems = completedActions
        .filter((action) => action !== 'GO')
        .map((action) => evaluationPhrase(problem, action));
      missedItems = [
        managerOrdersRunForPoint(problem)
          ? 'ピッチャーゴロでホームへ突っ込んでしまい、アウトになった'
          : 'ピッチャーゴロなのにホームへ突っ込んでしまった（セーフでも無謀なプレー）'
      ];
    } else if (recklessLeftFlySecondTagUp) {
      didItems = completedActions
        .filter((action) => action !== 'GO')
        .map((action) => evaluationPhrase(problem, action));
      missedItems = [
        'レフトフライでは3塁へタッチアップせず、2塁にとどまる判断'
      ];
    } else if (failedTagUp) {
      const location = defenseLocationDescription(problem);
      const selfPosition = runnerLabelForId(problem, 'self');
      const destination = expectedDestinationLabel(problem);
      didItems = [
        `${location}へのフライを見て、タッチアップのスタートを切れた`
      ];
      missedItems = [
        failedTagUp.late
          ? `${location}へのフライで、捕球後のスタートが遅れ、${selfPosition}が${destination}に間に合わずアウトになった`
          : `${location}から${destination}までの送球距離に対してタッチアップが無謀で、${selfPosition}がアウトになった`
      ];
    } else if (failedOutfieldTwoBaseAttempt) {
      didItems = completedActions
        .filter((action) => !['STOP', 'BACK'].includes(action))
        .map((action) => evaluationPhrase(problem, action));
      missedItems = [
        '外野への打球で、途中で止まって元の塁へバックすること'
      ];
    } else if (missedForcedGroundAdvance) {
      missedItems = ['内野ゴロで元の塁へ戻れない状況での進塁'];
    } else {
      extraActions.forEach((action) => {
        const causedRunnerOut = state.defenseResults.find((defenseResult) =>
          defenseResult.out &&
          !defenseResult.forceOut &&
          defenseResult.action === action
        );
        if (causedRunnerOut) {
          missedItems.push(
            extraActionOutFeedback(
              problem,
              action
            )
          );
        }
      });
    }
    const alignFeedbackWithScore = (
      did,
      missed,
      score,
      max,
      fallbackMissed
    ) => {
      if (score === null || max === null || Number(max) <= 0) {
        return { did, missed, score };
      }
      if (!did.length) {
        return {
          did: [],
          missed: missed.length ? missed : [fallbackMissed],
          score: 0
        };
      }
      if (!missed.length) {
        return { did, missed: [], score: Number(max) };
      }
      return {
        did,
        missed,
        score: Math.min(
          Number(max) - .5,
          Math.max(.5, Number(score))
        )
      };
    };
    const alignedPersonal = alignFeedbackWithScore(
      didItems,
      missedItems,
      result.personal,
      result.personalMax,
      specificActionDifferenceFeedback(
        problem,
        'personal',
        result.evaluatedActions
      )
    );
    didItems = alignedPersonal.did;
    missedItems = alignedPersonal.missed;
    result.personal = alignedPersonal.score;
    const alignedStrategy = alignFeedbackWithScore(
      strategyDidItems,
      strategyMissedItems,
      result.strategy,
      result.strategy === null ? null : 3,
      '監督の指示どおりに動けなかったこと'
    );
    strategyDidItems = alignedStrategy.did;
    strategyMissedItems = alignedStrategy.missed;
    result.strategy = alignedStrategy.score;
    const playSucceeded = result.outcome
      ? result.outcome.met
      : result.play === null
        ? result.exact
        : result.play === result.playMax;
    const playDidItems = playSucceeded && !result.outcome?.uncontrollable
      ? [result.outcome?.success || '想定したプレー結果にできたこと']
      : [];
    const playMissedItems = playSucceeded
      ? []
      : [result.outcome?.failure || playResultFailure(problem)];
    result.total = roundHalf(
      Number(result.play || 0) +
      Number(result.personal || 0) +
      Number(result.strategy || 0)
    );
    document.querySelector('#result-mark').textContent = markFor(result.total);
    document.querySelector('#result-score').textContent =
      `${displayNumber(result.total)}／10点`;
    const synchronizedRows = [
      ['プレー結果', result.play, result.playMax],
      ['自分の走り方', result.personal, result.personalMax]
    ].filter(([, , max]) => Number(max) > 0);
    if (result.strategy !== null) {
      synchronizedRows.push([
        '監督の作戦どおりに動けたか',
        result.strategy,
        3
      ]);
    }
    breakdown.innerHTML = synchronizedRows.map(([label, score, max]) =>
      `<div class="score-row"><span>${label}</span><b>${displayNumber(score)}／${max}</b></div>`
    ).join('');
    const didGroups = [
      { label: 'プレー結果', items: playDidItems },
      { label: '走り方', items: didItems }
    ];
    const missedGroups = [
      { label: 'プレー結果', items: playMissedItems },
      { label: '走り方', items: missedItems }
    ];
    if (result.strategy !== null) {
      didGroups.push({ label: '監督指示', items: strategyDidItems });
      missedGroups.push({ label: '監督指示', items: strategyMissedItems });
    }
    renderFeedbackGroups('#feedback-did', didGroups);
    renderFeedbackGroups('#feedback-missed', missedGroups);
    document.querySelector('#next-question').textContent =
      state.index === 9 ? '結果を見る' : '次の問題へ';
    resultOverlay.hidden = false;
  }

  function replayQuestion() {
    if (state.replaying) return;
    state.replaying = true;
    resultOverlay.hidden = true;
    const replayCoachComment =
      field.querySelector('.replay-coach-comment');
    if (replayCoachComment) {
      replayCoachComment.textContent = currentProblem().instruction;
      replayCoachComment.hidden = !currentProblem().instruction;
    }
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
    let resultText = '80点以上でユーザーレベルが上がります。';
    if (cleared) {
      const previousUserLevel = state.userLevel;
      state.userLevel = Math.max(
        state.userLevel,
        Math.min(LEVELS.length, state.levelIndex + 2)
      );
      saveRunnerUserLevel(state.userLevel);
      updateUserLevelDisplay();
      resultText = state.userLevel > previousUserLevel
        ? `ユーザーレベルが「${LEVELS[state.userLevel - 1].name}」になりました！`
        : `現在のユーザーレベルは「${LEVELS[state.userLevel - 1].name}」です。`;
    }
    document.querySelector('#unlock-message').textContent = resultText;
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
        null,
      forceOut: Boolean(event.detail?.forceOut),
      targetBaseIndex: Number(event.detail?.targetBaseIndex)
    });
    if (
      event.detail?.runnerId === 'self' ||
      event.detail?.runnerType === 'self'
    ) {
      state.lastSelfDefenseResult = {
        out: Boolean(event.detail.out),
        targetBaseIndex: Number(event.detail.targetBaseIndex),
        reason:
          event.detail.defenseReason ||
          event.detail.reason ||
          null,
        prohibitedFirstBaseTagUp: Boolean(
          event.detail.prohibitedFirstBaseTagUp
        ),
        prohibitedSecondBaseTagUp: Boolean(
          event.detail.prohibitedSecondBaseTagUp
        ),
        tagUpEligible: Boolean(event.detail.tagUpEligible),
        forceOut: Boolean(event.detail.forceOut),
        runnerArrivalMs: Number(event.detail.runnerArrivalMs),
        action: state.timeline.at(-1)?.action || null
      };
    }
  });
  field.addEventListener('runner-play-phase', (event) => {
    if (event.detail?.phase !== 'catch' || !state.started) return;
    state.caughtBallAt = Math.max(
      0,
      performance.now() - state.startedAt
    );
  });
  field.addEventListener('runner-rundown-start', (event) => {
    if (
      !currentProblem().autonomousDecoySteal ||
      event.detail?.runnerId === 'self'
    ) return;
    state.autonomousDecoyStartedAt = Math.max(
      0,
      performance.now() - state.startedAt
    );
  });
  field.addEventListener('runner-decoy-throw-to-second', () => {
    if (!currentProblem().autonomousDecoySteal) return;
    state.autonomousDecoyStartedAt = Math.max(
      0,
      performance.now() - state.startedAt
    );
  });

  playButton.addEventListener('click', () => {
    if (!state.active) return;
    state.started = true;
    state.startedAt = performance.now();
  }, true);
  field.addEventListener('runner-play-complete', () => {
    clearTimeout(state.resultTimer);
    state.playOutcome =
      window.RUNNER_GAME_STATE_API?.playOutcome?.() || null;
    state.resultTimer = setTimeout(() => {
      if (state.replaying) {
        state.replaying = false;
        const replayCoachComment =
          field.querySelector('.replay-coach-comment');
        if (replayCoachComment) replayCoachComment.hidden = true;
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

  validateProblemAdvice();
  validateManagerSituations();
  updateUserLevelDisplay();
  renderLevels();
})();
