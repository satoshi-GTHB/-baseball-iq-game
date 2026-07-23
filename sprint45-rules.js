(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.FUJICON_SPRINT45 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BASES = Object.freeze({
    FIRST: 'FIRST',
    SECOND: 'SECOND',
    THIRD: 'THIRD',
    HOME: 'HOME'
  });

  const FIELDERS = Object.freeze({
    FIRST: 'FIRST',
    SECOND: 'SECOND',
    SHORT: 'SHORT',
    THIRD: 'THIRD'
  });

  const DEFENSES = Object.freeze({
    NORMAL: 'NORMAL',
    INFIELD_IN: 'INFIELD_IN'
  });

  const SITUATIONS = Object.freeze({
    NONE: 'NONE',
    FIRST: 'FIRST',
    SECOND: 'SECOND',
    FIRST_SECOND: 'FIRST_SECOND',
    THIRD: 'THIRD',
    FIRST_THIRD: 'FIRST_THIRD',
    SECOND_THIRD: 'SECOND_THIRD',
    LOADED: 'LOADED'
  });

  const SITUATION_ORDER = Object.freeze([
    SITUATIONS.NONE,
    SITUATIONS.FIRST,
    SITUATIONS.SECOND,
    SITUATIONS.FIRST_SECOND,
    SITUATIONS.THIRD,
    SITUATIONS.FIRST_THIRD,
    SITUATIONS.SECOND_THIRD,
    SITUATIONS.LOADED
  ]);

  const THIRD_RUNNER_SITUATIONS = new Set([
    SITUATIONS.THIRD,
    SITUATIONS.FIRST_THIRD,
    SITUATIONS.SECOND_THIRD,
    SITUATIONS.LOADED
  ]);

  const RUNNERS_BY_SITUATION = Object.freeze({
    NONE: [],
    FIRST: [BASES.FIRST],
    SECOND: [BASES.SECOND],
    FIRST_SECOND: [BASES.FIRST, BASES.SECOND],
    THIRD: [BASES.THIRD],
    FIRST_THIRD: [BASES.FIRST, BASES.THIRD],
    SECOND_THIRD: [BASES.SECOND, BASES.THIRD],
    LOADED: [BASES.FIRST, BASES.SECOND, BASES.THIRD]
  });

  const POINTS_BY_GRADE = Object.freeze({
    '◎': 3,
    '○': 2,
    '△': 1,
    '×': 0
  });

  const SITUATION_LABELS = Object.freeze({
    NONE: '走者なし',
    FIRST: '走者1塁',
    SECOND: '走者2塁',
    FIRST_SECOND: '走者1・2塁',
    THIRD: '走者3塁',
    FIRST_THIRD: '走者1・3塁',
    SECOND_THIRD: '走者2・3塁',
    LOADED: '満塁'
  });

  const FIELDER_LABELS = Object.freeze({
    FIRST: 'ファースト',
    SECOND: 'セカンド',
    SHORT: 'ショート',
    THIRD: 'サード'
  });

  const DEFENSE_LABELS = Object.freeze({
    NORMAL: '通常守備',
    INFIELD_IN: '内野前進'
  });

  function createCases() {
    const cases = [];
    let number = 1;

    [0, 1, 2].forEach((outs) => {
      SITUATION_ORDER.forEach((situation) => {
        const defenses =
          outs < 2 && THIRD_RUNNER_SITUATIONS.has(situation)
            ? [DEFENSES.NORMAL, DEFENSES.INFIELD_IN]
            : [DEFENSES.NORMAL];

        defenses.forEach((defense) => {
          cases.push(Object.freeze({
            id: `C${String(number).padStart(2, '0')}`,
            outs,
            situation,
            defense
          }));
          number += 1;
        });
      });
    });

    return Object.freeze(cases);
  }

  const CASES = createCases();

  function shuffle(items, random = Math.random) {
    const copy = items.slice();

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }

  function createBalancedSession(random = Math.random) {
    const fielders = shuffle([
      ...Array(8).fill(FIELDERS.FIRST),
      ...Array(8).fill(FIELDERS.SECOND),
      ...Array(8).fill(FIELDERS.SHORT),
      ...Array(8).fill(FIELDERS.THIRD)
    ], random);

    return shuffle(CASES, random).map((gameCase, index) => ({
      ...gameCase,
      fielder: fielders[index]
    }));
  }

  function createDefenseSession(random = Math.random) {
    return createBalancedSession(random).map((gameCase) => ({
      ...gameCase,
      caseId: gameCase.id,
      difficulty: 1,
      label: SITUATION_LABELS[gameCase.situation],
      q: '内野ゴロを捕った。どこへ送球する？',
      note: `${FIELDER_LABELS[gameCase.fielder]}が捕球`,
      instruction: gameCase.defense,
      answers: []
    }));
  }

  function buildRunnerTargets(situation, outs) {
    const occupied = RUNNERS_BY_SITUATION[situation] || [];
    const secondRunnerMoves =
      occupied.includes(BASES.SECOND) &&
      situation !== SITUATIONS.SECOND_THIRD &&
      !(situation === SITUATIONS.SECOND && outs === 2);

    return {
      batter: BASES.FIRST,
      firstRunner: occupied.includes(BASES.FIRST) ? BASES.SECOND : null,
      secondRunner: secondRunnerMoves ? BASES.THIRD : null,
      thirdRunner: occupied.includes(BASES.THIRD) ? BASES.HOME : null
    };
  }

  function createPlayState(gameCase) {
    return {
      caseId: gameCase.id,
      startingOuts: gameCase.outs,
      situation: gameCase.situation,
      defense: gameCase.defense,
      fielder: gameCase.fielder,
      runnerTargets: buildRunnerTargets(gameCase.situation, gameCase.outs),
      outRunners: [],
      safeRunners: [],
      plays: [],
      outsAdded: 0
    };
  }

  function runnerIsActive(state, runnerName) {
    return Boolean(
      state.runnerTargets[runnerName] &&
      !state.outRunners.includes(runnerName) &&
      !state.safeRunners.includes(runnerName)
    );
  }

  function getRunnerHeadingTo(state, base) {
    return Object.keys(state.runnerTargets).find((runnerName) => (
      state.runnerTargets[runnerName] === base &&
      runnerIsActive(state, runnerName)
    )) || null;
  }

  function isForcePlay(state, runnerName) {
    if (runnerName === 'batter') {
      return true;
    }

    if (runnerName === 'firstRunner') {
      return runnerIsActive(state, 'batter');
    }

    if (runnerName === 'secondRunner') {
      return (
        runnerIsActive(state, 'firstRunner') &&
        runnerIsActive(state, 'batter')
      );
    }

    if (runnerName === 'thirdRunner') {
      return (
        runnerIsActive(state, 'secondRunner') &&
        runnerIsActive(state, 'firstRunner') &&
        runnerIsActive(state, 'batter')
      );
    }

    return false;
  }

  function getTechniqueResult(state, action) {
    const runner = getRunnerHeadingTo(state, action.base);

    if (!runner) {
      return {
        result: 'SAFE',
        reason: 'EMPTY_BASE_THROW',
        runner: null,
        isForce: false
      };
    }

    const force = isForcePlay(state, runner);

    if (force) {
      return {
        result: 'OUT',
        reason: action.touch ? 'UNNEEDED_TOUCH' : 'FORCE_OUT',
        runner,
        isForce: true
      };
    }

    return {
      result: action.touch ? 'OUT' : 'SAFE',
      reason: action.touch ? 'TOUCH_OUT' : 'MISSED_TOUCH',
      runner,
      isForce: false
    };
  }

  function firstPlayCanArrive(state, action) {
    if (action.base === BASES.THIRD) {
      return (
        state.fielder === FIELDERS.SHORT ||
        state.fielder === FIELDERS.THIRD
      );
    }

    if (action.base === BASES.HOME) {
      if (state.startingOuts === 2) {
        return false;
      }

      return state.defense === DEFENSES.INFIELD_IN;
    }

    return true;
  }

  function secondPlayCanArrive(state, firstPlay, secondAction) {
    const from = firstPlay.base;
    const to = secondAction.base;

    if (from === BASES.FIRST && to === BASES.SECOND) {
      return (
        state.fielder === FIELDERS.FIRST ||
        state.fielder === FIELDERS.SECOND
      );
    }

    if (from === BASES.SECOND && to === BASES.FIRST) {
      return true;
    }

    if (from === BASES.THIRD && to === BASES.FIRST) {
      return state.fielder === FIELDERS.THIRD;
    }

    if (from === BASES.HOME && to === BASES.FIRST) {
      return firstPlay.reason === 'FORCE_OUT';
    }

    return false;
  }

  function recordOut(state, runnerName) {
    state.outRunners.push(runnerName);
    state.runnerTargets[runnerName] = null;
    state.outsAdded += 1;
  }

  function recordSafe(state, runnerName) {
    if (runnerName) {
      state.safeRunners.push(runnerName);
    }
  }

  function resolveAction(state, action, playIndex) {
    const technique = getTechniqueResult(state, action);
    let result = technique.result;
    let reason = technique.reason;

    if (playIndex === 1) {
      const firstPlay = state.plays[0];

      if (
        !firstPlay ||
        firstPlay.result === 'SAFE' ||
        firstPlay.reason === 'UNNEEDED_TOUCH'
      ) {
        result = 'SAFE';
        reason = 'FIRST_PLAY_TIME_LOSS';
      } else if (
        result === 'OUT' &&
        !secondPlayCanArrive(state, firstPlay, action)
      ) {
        result = 'SAFE';
        reason = 'LATE_EXTRA_THROW';
      }
    } else if (result === 'OUT' && !firstPlayCanArrive(state, action)) {
      result = 'SAFE';
      reason =
        action.base === BASES.HOME
          ? 'HOME_TOO_LATE'
          : 'THIRD_TOO_LATE';
    }

    const play = {
      base: action.base,
      touch: Boolean(action.touch),
      runner: technique.runner,
      isForce: technique.isForce,
      result,
      reason
    };

    if (result === 'OUT') {
      recordOut(state, technique.runner);
    } else {
      recordSafe(state, technique.runner);
    }

    state.plays.push(play);
    return play;
  }

  function evaluateActions(gameCase, actions) {
    const state = createPlayState(gameCase);
    const limitedActions = actions.slice(0, 2);

    limitedActions.forEach((action, index) => {
      if (state.startingOuts + state.outsAdded >= 3) {
        return;
      }

      resolveAction(state, action, index);
    });

    const thirdRunnerStarted =
      (RUNNERS_BY_SITUATION[state.situation] || [])
        .includes(BASES.THIRD);
    const inningOver =
      state.startingOuts + state.outsAdded >= 3;
    const runsScored =
      limitedActions.length > 0 &&
      thirdRunnerStarted &&
      !inningOver &&
      !state.outRunners.includes('thirdRunner')
        ? 1
        : 0;

    return {
      caseId: state.caseId,
      plays: state.plays,
      outsAdded: state.outsAdded,
      runsScored,
      inningOver,
      tags: createResultTags(state)
    };
  }

  function createResultTags(state) {
    const tags = [];

    if (state.outsAdded === 0) {
      tags.push('NO_OUT');
    } else if (state.outsAdded === 1) {
      tags.push('ONE_OUT');
    } else {
      tags.push('DOUBLE_PLAY');
    }

    if (state.startingOuts + state.outsAdded >= 3) {
      tags.push('INNING_OVER');
    }

    state.plays.forEach((play) => {
      if (!tags.includes(play.reason)) {
        tags.push(play.reason);
      }
    });

    return tags;
  }

  function scoreGrade(grade) {
    return POINTS_BY_GRADE[grade] ?? 0;
  }

  function enforceOutFloor(grade, outsAdded) {
    return Number(outsAdded) >= 1 && grade === '×'
      ? '△'
      : grade;
  }

  return Object.freeze({
    BASES,
    CASES,
    DEFENSES,
    DEFENSE_LABELS,
    FIELDERS,
    FIELDER_LABELS,
    POINTS_BY_GRADE,
    SITUATIONS,
    SITUATION_LABELS,
    buildRunnerTargets,
    createBalancedSession,
    createCases,
    createDefenseSession,
    createPlayState,
    evaluateActions,
    getRunnerHeadingTo,
    isForcePlay,
    scoreGrade,
    enforceOutFloor
  });
});
