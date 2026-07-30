'use strict';

const rules = window.RUNNER_MOVEMENT_RULES;
const field =
  document.querySelector('#runner-motion-field') ||
  document.querySelector('.runner-motion-field');
const selfRunner = field.querySelector('.self-runner');
const otherRunners = [...field.querySelectorAll('.other-runner')];
const startButtons = [...document.querySelectorAll('[data-start]')];
const kakenukeButton = document.querySelector('#runner-kakenuke');
const roundButton = document.querySelector('#runner-round');
const goButton = document.querySelector('#runner-go');
const stopButton = document.querySelector('#runner-stop');
const halfwayButton = document.querySelector('#runner-halfway');
const backButton = document.querySelector('#runner-back');
const status = document.querySelector('#runner-status');
const routeTime = document.querySelector('#route-time');
const integratedRunnerGame = field.id === 'gallery-field';
const KAKENUK_TO_FIRST_DURATION =
  rules.SEGMENTS[0].duration * .78;
const KAKENUK_EXTENSION_DURATION =
  rules.SEGMENTS[0].duration * .22;
const KAKENUK_BACK_DURATION = 1080;
const CONTACT_LEAD_DURATION = 200;
let batterOutTimer;
let tagUpTimer;

const state = {
  startKey: 'BATTER',
  minimumBaseIndex: 0,
  baseIndex: 0,
  segmentIndex: null,
  segmentProgress: 0,
  animation: null,
  segmentStartProgress: 0,
  segmentTargetProgress: 0,
  segmentDuration: 0,
  moving: false,
  continueAfterBase: false,
  roundFirst: false,
  special: null,
  batterContacted: !integratedRunnerGame,
  out: false,
  fairBallInfield: false,
  backFloorBaseIndex: null,
  activeScene: null,
  activeDirection: null,
  tagUpEligible: false,
  rundownActive: false,
  rundownSegmentIndex: null,
  kakenukeFirstDuration: 0
};

function notifyAcceptedAction(action) {
  field.dispatchEvent(new CustomEvent(
    'runner-action-accepted',
    { detail: { action } }
  ));
}

function currentOutCount() {
  return Math.max(
    0,
    Number(
      window.RUNNER_GAME_STATE_API?.outs?.()
    ) || 0
  );
}

function notifyPrePitchLead(action, baseIndex) {
  if (!integratedRunnerGame) return;
  const snapshot = defensiveRaceSnapshot();
  if (!snapshot?.moving && !snapshot?.offBase) return;
  field.dispatchEvent(new CustomEvent(
    'runner-pre-pitch-lead',
    {
      detail: {
        action,
        baseIndex,
        runnerId: 'self'
      }
    }
  ));
}

function pct(value) {
  return `${value}%`;
}

function baseLabel(base) {
  return {
    HOME: 'ホーム',
    FIRST: '1塁',
    SECOND: '2塁',
    THIRD: '3塁'
  }[base];
}

function placeAt(element, point) {
  element.style.left = pct(point[0]);
  element.style.top = pct(point[1]);
}

function selfPointAt(segmentIndex, progress) {
  if (state.startKey === 'BATTER' && segmentIndex === 0) {
    const ratio = rules.clampProgress(progress);
    return [
      rules.BATTER_BOX_POINT[0] +
        (rules.BASE_POINTS.FIRST[0] - rules.BATTER_BOX_POINT[0]) * ratio,
      rules.BATTER_BOX_POINT[1] +
        (rules.BASE_POINTS.FIRST[1] - rules.BATTER_BOX_POINT[1]) * ratio
    ];
  }
  return rules.pointAt(segmentIndex, progress);
}

function currentPoint() {
  if (state.special === 'kakenuke-end') {
    return rules.KAKENUK_END;
  }
  if (state.segmentIndex !== null) {
    return selfPointAt(state.segmentIndex, state.segmentProgress);
  }
  if (
    state.startKey === 'BATTER' &&
    state.baseIndex === 0
  ) {
    return rules.BATTER_BOX_POINT;
  }
  return rules.BASE_POINTS[rules.BASE_SEQUENCE[state.baseIndex]];
}

function placeSelf() {
  placeAt(selfRunner, currentPoint());
}

function placeOtherRunners(start) {
  const configuredBases =
    field.dataset.otherBases !== undefined
      ? field.dataset.otherBases
          .split(',')
          .map((base) => base.trim())
          .filter(Boolean)
      : start.otherBases;
  otherRunners.forEach((runner, index) => {
    const base = configuredBases[index];
    runner.hidden = !base;
    if (!base) return;
    placeAt(
      runner,
      base === 'HOME'
        ? rules.BATTER_BOX_POINT
        : rules.BASE_POINTS[base]
    );
    runner.dataset.base = base;
    runner.setAttribute('aria-label', `${baseLabel(base)}にいるほかの走者`);
  });
}

function updateTimeChip() {
  const segmentIndex = state.segmentIndex ?? state.baseIndex;
  const segment = rules.SEGMENTS[segmentIndex];
  if (routeTime) {
    routeTime.textContent = segment
      ? `次の塁まで${(segment.duration / 1000).toFixed(1)}秒`
      : 'ホーム到着';
  }
}

function atInitialBase() {
  return (
    state.segmentIndex === null &&
    state.baseIndex === state.minimumBaseIndex &&
    !state.special
  );
}

function updateControls() {
  const showsBatterRunnerActions = state.startKey === 'BATTER';
  const batterReady =
    state.startKey === 'BATTER' &&
    state.batterContacted &&
    !state.out &&
    (
      atInitialBase() ||
      state.special === 'kakenuke-running' ||
      (
        state.moving &&
        state.segmentIndex === 0 &&
        !state.special
      )
    );
  const finished = state.baseIndex >= 4 && state.segmentIndex === null;
  const specialRunning = state.special === 'kakenuke-running';
  const specialEnded = state.special === 'kakenuke-end';
  const waitingForContact =
    state.startKey === 'BATTER' && !state.batterContacted;
  const unavailable = waitingForContact || state.out;
  const canBack =
    (
      specialEnded ||
      (
        !specialRunning &&
        (
          state.moving ||
          state.segmentIndex !== null ||
          state.baseIndex > state.minimumBaseIndex
        )
      )
    ) &&
    (
      !state.fairBallInfield ||
      state.backFloorBaseIndex === null ||
      state.segmentIndex !== null ||
      state.baseIndex > state.backFloorBaseIndex ||
      specialEnded
    );

  kakenukeButton.hidden = !showsBatterRunnerActions;
  roundButton.hidden = !showsBatterRunnerActions;
  kakenukeButton.disabled =
    !batterReady || state.special === 'kakenuke-running';
  roundButton.disabled =
    !batterReady ||
    (state.roundFirst && state.special !== 'kakenuke-running');
  goButton.disabled =
    unavailable || finished || Boolean(state.special);
  stopButton.disabled =
    unavailable ||
    Boolean(state.special) ||
    finished ||
    state.rundownActive;
  halfwayButton.disabled =
    unavailable ||
    specialRunning ||
    finished ||
    specialEnded ||
    state.rundownActive;
  backButton.disabled = unavailable || !canBack;
}

function cancelAnimation() {
  if (!state.animation) return;
  state.animation.onfinish = null;
  state.animation.cancel();
  state.animation = null;
}

function captureSegmentProgress() {
  if (!state.animation || !state.moving || state.segmentIndex === null) {
    return;
  }
  const elapsed = Math.max(
    0,
    Math.min(state.segmentDuration, Number(state.animation.currentTime) || 0)
  );
  const ratio = state.segmentDuration
    ? elapsed / state.segmentDuration
    : 1;

  state.segmentProgress =
    state.segmentStartProgress +
    (state.segmentTargetProgress - state.segmentStartProgress) * ratio;
  cancelAnimation();
  state.moving = false;
  placeSelf();
}

function finishAtBase(baseIndex) {
  state.baseIndex = baseIndex;
  state.segmentIndex = null;
  state.segmentProgress = 0;
  state.moving = false;
  placeSelf();
  updateTimeChip();
}

function segmentFrames(segmentIndex, fromProgress, targetProgress, rounded) {
  const from = selfPointAt(segmentIndex, fromProgress);
  const to = selfPointAt(segmentIndex, targetProgress);

  if (
    rounded &&
    segmentIndex === 1 &&
    fromProgress === 0 &&
    targetProgress === 1
  ) {
    return [
      { left: pct(from[0]), top: pct(from[1]) },
      {
        left: pct(rules.ROUND_FIRST_POINT[0]),
        top: pct(rules.ROUND_FIRST_POINT[1]),
        offset: .12
      },
      {
        left: pct(rules.ROUND_FIRST_EXIT[0]),
        top: pct(rules.ROUND_FIRST_EXIT[1]),
        offset: .27
      },
      { left: pct(to[0]), top: pct(to[1]) }
    ];
  }
  return [
    { left: pct(from[0]), top: pct(from[1]) },
    { left: pct(to[0]), top: pct(to[1]) }
  ];
}

function animateSegment(
  segmentIndex,
  fromProgress,
  targetProgress,
  onFinish,
  rounded = false
) {
  cancelAnimation();
  const duration = rules.durationBetween(
    segmentIndex,
    fromProgress,
    targetProgress
  );

  state.segmentIndex = segmentIndex;
  state.segmentProgress = fromProgress;
  state.segmentStartProgress = fromProgress;
  state.segmentTargetProgress = targetProgress;
  state.segmentDuration = duration;
  state.moving = true;
  state.animation = selfRunner.animate(
    segmentFrames(segmentIndex, fromProgress, targetProgress, rounded),
    { duration, easing: 'linear', fill: 'forwards' }
  );
  updateTimeChip();
  updateControls();

  const animation = state.animation;
  animation.onfinish = () => {
    if (state.animation !== animation) return;
    state.segmentProgress = targetProgress;
    state.moving = false;
    animation.cancel();
    state.animation = null;
    placeSelf();
    onFinish();
    updateControls();
  };
}

function arriveForward(segmentIndex) {
  const shouldContinue = state.continueAfterBase;
  const nextBaseIndex = segmentIndex + 1;
  state.continueAfterBase = false;
  finishAtBase(nextBaseIndex);

  if (shouldContinue && nextBaseIndex < 4) {
    status.textContent =
      `${baseLabel(rules.BASE_SEQUENCE[nextBaseIndex])}を通過して走り続けます。`;
    runForward(false);
    return;
  }
  status.textContent = nextBaseIndex >= 4
    ? 'ホームへ着きました。'
    : `${baseLabel(rules.BASE_SEQUENCE[nextBaseIndex])}で止まりました。`;
}

function runForward(continuous) {
  if (state.baseIndex >= 4 && state.segmentIndex === null) return;
  const segmentIndex = state.segmentIndex ?? state.baseIndex;
  const fromProgress =
    state.segmentIndex === null ? 0 : state.segmentProgress;

  state.continueAfterBase = continuous;
  status.textContent = continuous
    ? `${baseLabel(rules.SEGMENTS[segmentIndex].to)}を通過し、その次の塁まで走ります。`
    : `次の${baseLabel(rules.SEGMENTS[segmentIndex].to)}で止まります。`;
  animateSegment(
    segmentIndex,
    fromProgress,
    1,
    () => arriveForward(segmentIndex),
    state.roundFirst && segmentIndex === 1
  );
}

function chooseGo() {
  if (state.special || state.out) return;

  if (state.moving) {
    captureSegmentProgress();
    const canAddNextBase =
      state.segmentIndex !== null &&
      state.segmentProgress >= .5;

    if (canAddNextBase) {
      runForward(true);
      return;
    }

    runForward(false);
    status.textContent = 'まず近づいている次の塁まで走ります。';
    return;
  }

  runForward(false);
}

function stopAtNearestBase() {
  if (state.special || state.out) return;
  if (state.moving) captureSegmentProgress();

  if (state.segmentIndex === null) {
    const currentBase = rules.BASE_SEQUENCE[state.baseIndex];
    state.continueAfterBase = false;
    status.textContent = state.baseIndex >= 4
      ? 'ホームで止まっています。'
      : `${baseLabel(currentBase)}で止まっています。`;
    updateControls();
    return;
  }

  const segmentIndex = state.segmentIndex;
  const fromProgress = state.segmentProgress;
  const returnsToPrevious = fromProgress < .5;
  const targetProgress = returnsToPrevious ? 0 : 1;
  const destinationIndex = returnsToPrevious
    ? segmentIndex
    : segmentIndex + 1;
  const destination = rules.BASE_SEQUENCE[destinationIndex];

  state.continueAfterBase = false;
  status.textContent = returnsToPrevious
    ? `近いほうの${baseLabel(destination)}へ戻ります。`
    : `近いほうの${baseLabel(destination)}へ進みます。`;

  if (fromProgress === targetProgress) {
    finishAtBase(destinationIndex);
    status.textContent = `${baseLabel(destination)}で止まりました。`;
    updateControls();
    return;
  }

  animateSegment(
    segmentIndex,
    fromProgress,
    targetProgress,
    () => {
      finishAtBase(destinationIndex);
      status.textContent = `${baseLabel(destination)}で止まりました。`;
    }
  );
}

function stopAtHalfway(
  segmentIndex,
  fromProgress,
  targetProgress = .5
) {
  state.continueAfterBase = false;
  const targetLabel = targetProgress === .25
    ? '塁間の4分の1'
    : '塁間の中間地点';
  status.textContent = `${targetLabel}へ向かいます。`;
  if (fromProgress === targetProgress) {
    state.segmentIndex = segmentIndex;
    state.segmentProgress = targetProgress;
    state.moving = false;
    placeSelf();
    status.textContent = `${targetLabel}で止まっています。`;
    updateTimeChip();
    updateControls();
    return;
  }
  animateSegment(segmentIndex, fromProgress, targetProgress, () => {
    state.segmentIndex = segmentIndex;
    state.segmentProgress = targetProgress;
    state.moving = false;
    placeSelf();
    status.textContent = `${targetLabel}で止まりました。`;
    updateTimeChip();
  });
}

function chooseHalfway() {
  if (state.special) return;
  if (state.moving) captureSegmentProgress();
  const usesQuarterLead =
    state.activeScene === 'popup' ||
    (
      state.activeScene === 'bunt' &&
      String(state.activeDirection).endsWith('-popup')
    );
  const targetProgress = usesQuarterLead ? .25 : .5;

  if (state.segmentIndex === null) {
    if (state.baseIndex >= 4) return;
    stopAtHalfway(state.baseIndex, 0, targetProgress);
    return;
  }
  if (usesQuarterLead) {
    stopAtHalfway(
      state.segmentIndex,
      state.segmentProgress,
      targetProgress
    );
    return;
  }
  if (state.segmentProgress < targetProgress) {
    stopAtHalfway(
      state.segmentIndex,
      state.segmentProgress,
      targetProgress
    );
    return;
  }

  const segmentIndex = state.segmentIndex;
  status.textContent = '次の塁を通過し、その次の塁間の中間で止まります。';
  animateSegment(segmentIndex, state.segmentProgress, 1, () => {
    const nextBaseIndex = segmentIndex + 1;
    finishAtBase(nextBaseIndex);
    if (nextBaseIndex < 4) {
      stopAtHalfway(nextBaseIndex, 0, targetProgress);
    } else {
      status.textContent = 'ホームへ着きました。';
    }
  });
}

function goBack() {
  if (state.special === 'kakenuke-end') {
    if (
      state.fairBallInfield &&
      state.backFloorBaseIndex === null
    ) {
      state.backFloorBaseIndex = 1;
    }
    state.special = 'kakenuke-back';
    state.moving = true;
    const animation = selfRunner.animate(
      [
        {
          left: pct(rules.KAKENUK_END[0]),
          top: pct(rules.KAKENUK_END[1])
        },
        {
          left: pct(rules.BASE_POINTS.FIRST[0]),
          top: pct(rules.BASE_POINTS.FIRST[1])
        }
      ],
      {
        duration: KAKENUK_BACK_DURATION,
        easing: 'linear',
        fill: 'forwards'
      }
    );
    state.animation = animation;
    status.textContent = '1つ前の1塁へ戻っています。';
    updateControls();
    animation.onfinish = () => {
      animation.cancel();
      state.animation = null;
      state.special = null;
      finishAtBase(1);
      status.textContent = '1塁へ戻りました。';
      updateControls();
    };
    return;
  }

  if (state.moving) captureSegmentProgress();
  let segmentIndex;
  let fromProgress;

  if (state.segmentIndex !== null) {
    segmentIndex = state.segmentIndex;
    fromProgress = state.segmentProgress;
  } else {
    if (state.baseIndex <= state.minimumBaseIndex) return;
    segmentIndex = state.baseIndex - 1;
    fromProgress = 1;
  }

  if (
    state.startKey === 'BATTER' &&
    segmentIndex === 0
  ) {
    state.continueAfterBase = false;
    state.roundFirst = false;
    status.textContent =
      '1塁より手前には戻らず、1塁へ向かいます。';
    animateSegment(0, fromProgress, 1, () => {
      finishAtBase(1);
      status.textContent = '1塁へ着きました。';
    });
    return;
  }

  const destinationIndex = segmentIndex;
  if (state.fairBallInfield) {
    if (state.backFloorBaseIndex === null) {
      state.backFloorBaseIndex = destinationIndex;
    } else if (destinationIndex < state.backFloorBaseIndex) {
      status.textContent =
        `${baseLabel(rules.BASE_SEQUENCE[state.backFloorBaseIndex])}より後ろには戻りません。`;
      updateControls();
      return;
    }
  }
  state.continueAfterBase = false;
  status.textContent =
    `1つ前の${baseLabel(rules.BASE_SEQUENCE[destinationIndex])}へ戻っています。`;
  animateSegment(segmentIndex, fromProgress, 0, () => {
    finishAtBase(destinationIndex);
    status.textContent =
      `${baseLabel(rules.BASE_SEQUENCE[destinationIndex])}へ戻りました。`;
  });
}

function startKakenuke() {
  if (
    state.startKey !== 'BATTER' ||
    !state.batterContacted ||
    state.out
  ) return;
  if (state.moving) captureSegmentProgress();

  state.roundFirst = false;
  notifyAcceptedAction('KAKENUK');
  const progress = state.segmentIndex === 0
    ? state.segmentProgress
    : 0;
  const startPoint = selfPointAt(0, progress);
  const toFirstDuration =
    (1 - progress) * KAKENUK_TO_FIRST_DURATION;
  const extensionDuration = KAKENUK_EXTENSION_DURATION;
  const duration = toFirstDuration + extensionDuration;
  const firstOffset = duration
    ? toFirstDuration / duration
    : 0;

  state.special = 'kakenuke-running';
  state.kakenukeFirstDuration = toFirstDuration;
  state.moving = true;
  status.textContent = '1塁線の先までかけぬけます。';
  const animation = selfRunner.animate(
    [
      {
        left: pct(startPoint[0]),
        top: pct(startPoint[1])
      },
      {
        left: pct(rules.BASE_POINTS.FIRST[0]),
        top: pct(rules.BASE_POINTS.FIRST[1]),
        offset: firstOffset
      },
      {
        left: pct(rules.KAKENUK_END[0]),
        top: pct(rules.KAKENUK_END[1])
      }
    ],
    { duration, easing: 'linear', fill: 'forwards' }
  );
  state.animation = animation;
  updateControls();
  animation.onfinish = () => {
    animation.cancel();
    state.animation = null;
    state.moving = false;
    state.baseIndex = 1;
    state.special = 'kakenuke-end';
    placeSelf();
    status.textContent = '1塁線の先までかけぬけて止まりました。';
    updateTimeChip();
    updateControls();
  };
}

function leaveKakenukeForRound() {
  if (state.special !== 'kakenuke-running') return;
  const elapsed = Math.max(
    0,
    Math.min(
      Number(state.kakenukeFirstDuration) || 0,
      Number(state.animation?.currentTime) || 0
    )
  );
  const startProgress = 1 -
    (Number(state.kakenukeFirstDuration) || 0) /
      KAKENUK_TO_FIRST_DURATION;
  const progress = rules.clampProgress(
    startProgress + elapsed / KAKENUK_TO_FIRST_DURATION
  );
  cancelAnimation();
  state.special = null;
  state.moving = false;
  state.baseIndex = 0;
  state.segmentIndex = 0;
  state.segmentProgress = progress;
  state.kakenukeFirstDuration = 0;
  placeSelf();
}

function selectStart(startKey) {
  const start = rules.STARTS[startKey];
  if (!start) return;

  cancelAnimation();
  clearTimeout(batterOutTimer);
  clearTimeout(tagUpTimer);
  state.startKey = startKey;
  state.minimumBaseIndex = start.baseIndex;
  state.baseIndex = start.baseIndex;
  state.segmentIndex = null;
  state.segmentProgress = 0;
  state.moving = false;
  state.continueAfterBase = false;
  state.roundFirst = false;
  state.special = null;
  state.batterContacted =
    startKey !== 'BATTER' || !integratedRunnerGame;
  state.out = false;
  state.fairBallInfield = false;
  state.backFloorBaseIndex = null;
  state.activeScene = null;
  state.activeDirection = null;
  state.tagUpEligible = false;
  state.rundownActive = false;
  state.rundownSegmentIndex = null;
  state.kakenukeFirstDuration = 0;
  selfRunner.style.opacity = '1';
  placeSelf();
  placeOtherRunners(start);

  startButtons.forEach((button) => {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.start === startKey)
    );
  });
  field.setAttribute(
    'aria-label',
    `${start.label}の走塁アニメーション`
  );
  status.textContent = startKey === 'BATTER'
    ? 'バッターボックスからスタートします。'
    : `${baseLabel(rules.BASE_SEQUENCE[start.baseIndex])}からスタートします。`;
  updateTimeChip();
  updateControls();
}

function markBatterRunnerOut() {
  if (state.startKey !== 'BATTER' || state.out) return;
  captureSegmentProgress();
  cancelAnimation();
  state.moving = false;
  state.special = null;
  state.out = true;
  selfRunner.style.opacity = '0';
  status.textContent = 'ボールが地面につく前に取られ、バッターランナーはアウトです。';
  updateControls();
}

function defensiveRaceSnapshot() {
  if (state.out) return null;

  if (
    state.special === 'kakenuke-running' &&
    state.animation
  ) {
    const elapsed = Math.max(
      0,
      Number(state.animation.currentTime) || 0
    );
    const firstProgress = Math.min(
      1,
      elapsed / KAKENUK_TO_FIRST_DURATION
    );
    return {
      id: 'self',
      type: 'self',
      moving: true,
      startBaseIndex: 0,
      segmentIndex: 0,
      movingForward: true,
      advance: firstProgress,
      point: [
        rules.BATTER_BOX_POINT[0] +
          (
            rules.BASE_POINTS.FIRST[0] -
            rules.BATTER_BOX_POINT[0]
          ) * firstProgress,
        rules.BATTER_BOX_POINT[1] +
          (
            rules.BASE_POINTS.FIRST[1] -
            rules.BATTER_BOX_POINT[1]
          ) * firstProgress
      ],
      targetBaseIndex: 1,
      runnerArrivalMs: Math.max(
        0,
        KAKENUK_TO_FIRST_DURATION - elapsed
      ),
      arrivalMsByBase: {
        1: Math.max(
          0,
          KAKENUK_TO_FIRST_DURATION - elapsed
        )
      }
    };
  }

  if (
    state.special === 'kakenuke-back' &&
    state.animation
  ) {
    const elapsed = Math.max(
      0,
      Number(state.animation.currentTime) || 0
    );
    return {
      id: 'self',
      type: 'self',
      moving: true,
      startBaseIndex: 0,
      segmentIndex: 0,
      movingForward: false,
      advance: 1,
      point: rules.KAKENUK_END,
      targetBaseIndex: 1,
      runnerArrivalMs: Math.max(
        0,
        KAKENUK_BACK_DURATION - elapsed
      ),
      arrivalMsByBase: {
        1: Math.max(
          0,
          KAKENUK_BACK_DURATION - elapsed
        )
      }
    };
  }

  if (
    !state.moving ||
    state.segmentIndex === null ||
    !state.animation
  ) {
    const offBase =
      state.segmentIndex !== null &&
      state.segmentProgress > 0 &&
      state.segmentProgress < 1;
    const mustRetouch =
      currentOutCount() < 2 &&
      (
        state.activeScene === 'fly' ||
        state.activeScene === 'popup' ||
        state.activeScene === 'liner' ||
        (
          state.activeScene === 'bunt' &&
          String(state.activeDirection).endsWith('-popup')
        )
      );
    const targetBaseIndex = offBase
      ? (
          mustRetouch || state.segmentProgress < .5
            ? state.segmentIndex
            : state.segmentIndex + 1
        )
      : null;
    return {
      id: 'self',
      type: 'self',
      moving: false,
      startBaseIndex: rules.STARTS[state.startKey].baseIndex,
      segmentIndex: offBase ? state.segmentIndex : null,
      movingForward: null,
      baseIndex: offBase ? null : state.baseIndex,
      offBase,
      advance:
        state.segmentIndex === null
          ? state.baseIndex
          : state.segmentIndex + state.segmentProgress,
      point:
        state.segmentIndex === null
          ? rules.BASE_POINTS[
              rules.BASE_SEQUENCE[state.baseIndex]
            ]
          : rules.pointAt(
              state.segmentIndex,
              state.segmentProgress
            ),
      targetBaseIndex,
      runnerArrivalMs: offBase
        ? Number.POSITIVE_INFINITY
        : null,
      tagUpEligible: state.tagUpEligible
    };
  }

  const elapsed = Math.max(
    0,
    Math.min(
      state.segmentDuration,
      Number(state.animation.currentTime) || 0
    )
  );
  const ratio = state.segmentDuration
    ? elapsed / state.segmentDuration
    : 1;
  const progress =
    state.segmentStartProgress +
    (
      state.segmentTargetProgress -
      state.segmentStartProgress
    ) * ratio;
  const movingForward =
    state.segmentTargetProgress >= progress;

    return {
      id: 'self',
      type: 'self',
      moving: true,
      startBaseIndex: rules.STARTS[state.startKey].baseIndex,
      segmentIndex: state.segmentIndex,
      movingForward,
      advance: state.segmentIndex + progress,
    point: rules.pointAt(state.segmentIndex, progress),
    targetBaseIndex: movingForward
      ? state.segmentIndex + 1
      : state.segmentIndex,
      runnerArrivalMs: rules.durationBetween(
        state.segmentIndex,
        progress,
        state.segmentTargetProgress
      ),
      tagUpEligible: state.tagUpEligible,
      arrivalMsByBase: {
        [movingForward
          ? state.segmentIndex + 1
          : state.segmentIndex]:
          rules.durationBetween(
            state.segmentIndex,
            progress,
            state.segmentTargetProgress
          )
      }
    };
}

function applyDefensiveOut(detail = null) {
  if (state.out) return;
  const finishRunThrough =
    Number(detail?.targetBaseIndex) === 1 &&
    state.startKey === 'BATTER' &&
    state.special === 'kakenuke-running';
  if (!finishRunThrough) {
    captureSegmentProgress();
    cancelAnimation();
    state.moving = false;
    state.special = null;
  }
  state.out = true;
  if (!finishRunThrough) {
    selfRunner.style.opacity = '0';
  }
  status.textContent = detail?.reason === 'passed-runner'
    ? '前の走者を追い抜いたため、アウトになりました。'
    : detail?.rundown
      ? 'ボールを持った守備にタッチされ、アウトになりました。'
      : '投げたボールが先にベースへ着き、アウトになりました。';
  updateControls();
}

function startSelfRundown(detail) {
  if (
    state.out ||
    detail?.runnerId !== 'self' ||
    !Number.isInteger(Number(detail.segmentIndex))
  ) return;
  state.rundownActive = true;
  state.rundownSegmentIndex = Number(detail.segmentIndex);
  status.textContent =
    '挟まれました。「ゴーッ!」「バック！」を使って、ボールから逃げよう。';
  updateControls();
}

function armSelfRundown(detail) {
  if (
    state.out ||
    detail?.runnerId !== 'self'
  ) return;
  status.textContent =
    '前の塁にボールが来ました。バックすると、塁の間ではさむプレーが始まります。';
}

function pressureSelfRundown(detail) {
  if (
    !state.rundownActive ||
    detail?.runnerId !== 'self'
  ) return;
  status.textContent = detail.ballSide === 'lead'
    ? '先の塁にボールがあります。「バック！」で逃げよう。'
    : '前の塁にボールがあります。「ゴーッ!」で逃げよう。';
}

function endSelfRundown(detail) {
  if (
    !state.rundownActive ||
    detail?.runnerId !== 'self'
  ) return;
  state.rundownActive = false;
  state.rundownSegmentIndex = null;
  if (!detail.out && !state.out) {
    status.textContent =
      'ベースへ先に着き、塁の間ではさむプレーからにげ切りました。';
  }
  updateControls();
}

function transferSelfRundown(detail) {
  if (
    !state.rundownActive ||
    detail?.runnerId !== 'self' ||
    state.out
  ) return;
  state.rundownActive = false;
  state.rundownSegmentIndex = null;
  if (state.moving) captureSegmentProgress();
  state.roundFirst = false;
  runForward(false);
  status.textContent =
    '守備が先の走者へ投げたので、空いた次の塁へ進みます。';
}

function advanceSelfDuringRundown(detail) {
  if (
    state.out ||
    state.special ||
    detail?.runnerId === 'self'
  ) return false;
  const snapshot = defensiveRaceSnapshot();
  if (!snapshot || Number(snapshot.advance) >= 4) {
    return false;
  }
  if (state.moving) captureSegmentProgress();
  state.roundFirst = false;
  state.continueAfterBase = false;
  runForward(false);
  status.textContent =
    'ほかの走者が挟まれている間に、次の塁を狙います。';
  return true;
}

function startBatterRunnerAtContact(scene, direction = null) {
  if (
    state.startKey !== 'BATTER' ||
    state.batterContacted ||
    state.out
  ) return;

  state.batterContacted = true;
  state.roundFirst = false;
  if (rules.batterRunnerMustRunThrough(scene, direction)) {
    status.textContent =
      '打球が当たりました。「かけぬけ」で1塁を走り切ろう。';
  } else {
    status.textContent =
      '打球が当たりました。走塁ボタンを選ぼう。';
  }
  updateControls();

  const catchDelay = {
    fly: 4500,
    popup: 3800,
    liner: 1440
  }[scene];
  const resolvedCatchDelay =
    scene === 'bunt' &&
    String(direction).endsWith('-popup')
      ? 1700
      : catchDelay;
  if (resolvedCatchDelay) {
    clearTimeout(batterOutTimer);
    batterOutTimer = setTimeout(
      markBatterRunnerOut,
      resolvedCatchDelay
    );
  }
}

function takeContactLead(scene, stealSign, direction = null) {
  if (
    state.startKey === 'BATTER' ||
    state.out ||
    !atInitialBase()
  ) return;
  const segment = rules.SEGMENTS[state.baseIndex];
  if (!segment) return;
  const contactPlan = rules.runnerContactPlan(
    currentOutCount(),
    scene,
    state.baseIndex
  );
  if (contactPlan === 'GO') {
    state.roundFirst = false;
    runForward(false);
    status.textContent =
      '2アウトなので、打球と同時に次の塁へ走ります。';
    return;
  }
  if (stealSign) return;
  if (contactPlan === 'TAG_UP') {
    clearTimeout(tagUpTimer);
    tagUpTimer = setTimeout(() => {
      if (
        state.out ||
        state.activeScene !== 'fly' ||
        state.startKey !== 'THIRD' ||
        state.baseIndex !== 3 ||
        state.segmentIndex !== null ||
        currentOutCount() >= 2
      ) return;
      state.roundFirst = false;
      state.tagUpEligible = true;
      runForward(false);
      status.textContent =
        'ボールを取ったのを見て、3塁からホームへタッチアップします。';
    }, 4500);
  }
  const leadProgress = Math.min(
    .08,
    CONTACT_LEAD_DURATION / segment.duration
  );
  status.textContent =
    '打球に合わせて、少しだけ塁を離れました。';
  animateSegment(
    state.baseIndex,
    0,
    leadProgress,
    () => {
      if (contactPlan === 'TAG_UP') {
        const tagUpBaseIndex = state.baseIndex;
        status.textContent =
          '外野フライなので、三塁へ戻ってタッチアップに備えます。';
        animateSegment(
          tagUpBaseIndex,
          leadProgress,
          0,
          () => {
            finishAtBase(tagUpBaseIndex);
            status.textContent =
              '3塁へもどりました。ボールを取った後のタッチアップをねらいます。';
          }
        );
        return;
      }
      state.segmentIndex = state.baseIndex;
      state.segmentProgress = leadProgress;
      state.moving = false;
      placeSelf();
      status.textContent = (
        scene === 'fly' ||
        scene === 'popup' ||
        scene === 'liner' ||
        (
          scene === 'bunt' &&
          String(direction).endsWith('-popup')
        )
      )
        ? 'ボールが地面につく前に取られたら「バック！」で元の塁へもどろう。'
        : '打球を見て、次にどう走るか考えよう。';
      updateTimeChip();
    }
  );
}

field.addEventListener('runner-play-phase', (event) => {
  if (event.detail?.phase === 'prepare') {
    selectStart(state.startKey);
    state.activeScene = event.detail.scene || null;
    state.activeDirection = event.detail.direction || null;
    return;
  }
  if (event.detail?.phase === 'contact') {
    startBatterRunnerAtContact(
      event.detail.scene,
      event.detail.direction
    );
    takeContactLead(
      event.detail.scene,
      event.detail.stealSign,
      event.detail.direction
    );
    return;
  }
  if (event.detail?.phase === 'fair-ball-infield') {
    state.fairBallInfield = true;
    state.backFloorBaseIndex = null;
    updateControls();
  }
});

startButtons.forEach((button) => {
  button.addEventListener('click', () => selectStart(button.dataset.start));
});

kakenukeButton.addEventListener('click', startKakenuke);

roundButton.addEventListener('click', () => {
  leaveKakenukeForRound();
  if (state.moving) captureSegmentProgress();
  state.roundFirst = true;
  status.textContent = '1塁を回り、2塁まで走ります。';
  runForward(true);
  notifyAcceptedAction('ROUND');
});

goButton.addEventListener('click', () => {
  const leavesInitialBase =
    state.startKey !== 'BATTER' &&
    !state.out &&
    atInitialBase();
  const leadBaseIndex = state.baseIndex;
  state.roundFirst = false;
  chooseGo();
  notifyAcceptedAction('GO');
  if (leavesInitialBase) {
    notifyPrePitchLead('GO', leadBaseIndex);
  }
});

stopButton.addEventListener('click', () => {
  stopAtNearestBase();
  notifyAcceptedAction('STOP');
});

halfwayButton.addEventListener('click', () => {
  const leavesInitialBase =
    state.startKey !== 'BATTER' &&
    !state.out &&
    atInitialBase();
  const leadBaseIndex = state.baseIndex;
  chooseHalfway();
  notifyAcceptedAction('HALFWAY');
  if (leavesInitialBase) {
    notifyPrePitchLead('HALFWAY', leadBaseIndex);
  }
});
backButton.addEventListener('click', () => {
  goBack();
  notifyAcceptedAction('BACK');
});

selectStart(state.startKey);

window.RUNNER_SELF_RACE_API = Object.freeze({
  advanceDuringRundown: advanceSelfDuringRundown,
  armRundown: armSelfRundown,
  snapshot: defensiveRaceSnapshot,
  applyOut: applyDefensiveOut,
  endRundown: endSelfRundown,
  pressureRundown: pressureSelfRundown,
  startRundown: startSelfRundown,
  transferRundown: transferSelfRundown,
  hasTouchedBase: (baseIndex) => {
    const targetBaseIndex = Number(baseIndex);
    if (
      state.startKey === 'BATTER' &&
      targetBaseIndex === 1
    ) {
      if (
        state.special === 'kakenuke-end' ||
        state.baseIndex >= 1
      ) return true;
      if (
        state.special === 'kakenuke-running' &&
        state.animation
      ) {
        return (
          Number(state.animation.currentTime) >=
          Number(state.kakenukeFirstDuration)
        );
      }
    }
    return (
      state.segmentIndex === null &&
      Number(state.baseIndex) === targetBaseIndex
    );
  }
});
