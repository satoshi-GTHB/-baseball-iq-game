'use strict';

const runnerGameField = document.querySelector('#gallery-field');
const runnerGamePlayArea =
  runnerGameField.querySelector('.field-play-area') || runnerGameField;
const runnerGameOtherRunners = [
  ...runnerGameField.querySelectorAll('.other-runner')
];
const runnerGameStartButtons = [
  ...document.querySelectorAll('[data-start]')
];
const runnerGameSceneButtons = [
  ...document.querySelectorAll('[data-scene]')
];
const runnerGameStealSignButtons = [
  ...document.querySelectorAll('[data-steal-sign]')
];
const runnerGameBso = document.querySelector('#runner-bso');
const runnerGameOutLights = [
  ...document.querySelectorAll('.runner-out-light')
];
let runnerGameAutonomousAnimations = [];
const runnerGameRaceStates = new Map();
const runnerGameRundownSupportIds = new Set();
const runnerGameOutRunnerIds = new Set();
let runnerGamePassingTimer = null;
let runnerGameOuts = 0;
let runnerGamePlayOuts = 0;
let runnerGamePlayStartOuts = 0;
let runnerGameInningOver = false;
let runnerGameDefenseAlignment = 'normal';
let runnerGameSelfLeadAction = 'BACK';
const runnerDefenseBasePoints = Object.freeze({
  1: [75, 60],
  2: [50, 31],
  3: [25, 60],
  4: [50, 89]
});

function renderRunnerBso() {
  runnerGameOutLights.forEach((light, index) => {
    light.classList.toggle('is-on', runnerGameOuts > index);
  });
  runnerGameBso?.setAttribute(
    'aria-label',
    `ボール0、ストライク0、アウト${runnerGameOuts}`
  );
}

function prepareRunnerOutCount() {
  if (runnerGameInningOver) {
    runnerGameOuts = 0;
    runnerGameInningOver = false;
  }
  runnerGamePlayStartOuts = runnerGameOuts;
  runnerGamePlayOuts = 0;
  renderRunnerBso();
}

function registerRunnerOut(detail) {
  runnerGameOuts += 1;
  runnerGamePlayOuts += 1;
  runnerGameInningOver = runnerGameOuts >= 3;
  renderRunnerBso();
  detail.outs = runnerGameOuts;
  detail.playOuts = runnerGamePlayOuts;
  detail.inningOver = runnerGameInningOver;
}

function cancelAutonomousAnimations() {
  runnerGameAutonomousAnimations.forEach((animation) => animation.cancel());
  runnerGameAutonomousAnimations = [];
  runnerGameRaceStates.clear();
  runnerGameRundownSupportIds.clear();
  runnerGameOutRunnerIds.clear();
}

function selectedStartKey() {
  return runnerGameStartButtons.find(
    (button) => button.getAttribute('aria-pressed') === 'true'
  )?.dataset.start || 'BATTER';
}

function selectedSceneKey() {
  return runnerGameSceneButtons.find(
    (button) => button.getAttribute('aria-pressed') === 'true'
  )?.dataset.scene || 'fly';
}

function thirdBaseRunnerPresent() {
  const start =
    window.RUNNER_MOVEMENT_RULES.STARTS[
      selectedStartKey()
    ];
  const configuredBases =
    runnerGameField.dataset.otherBases !== undefined
      ? runnerGameField.dataset.otherBases
          .split(',')
          .map((base) => base.trim())
          .filter(Boolean)
      : start?.otherBases || [];
  return Boolean(
    start?.baseIndex === 3 ||
    configuredBases.includes('THIRD')
  );
}

function chooseRunnerDefenseAlignment() {
  const requested =
    runnerGameField.dataset.requestedDefenseAlignment;
  if (requested === 'normal' || requested === 'infield-in') {
    return requested;
  }
  if (runnerGameOuts >= 2 || !thirdBaseRunnerPresent()) {
    return 'normal';
  }
  return Math.random() < .5
    ? 'infield-in'
    : 'normal';
}

function stealSignSelected() {
  return runnerGameStealSignButtons.some(
    (button) =>
      button.dataset.stealSign === 'on' &&
      button.getAttribute('aria-pressed') === 'true'
  );
}

function syncPitchOnlyStart() {
  const batterButton = runnerGameStartButtons.find(
    (button) => button.dataset.start === 'BATTER'
  );
  const firstBaseButton = runnerGameStartButtons.find(
    (button) => button.dataset.start === 'FIRST'
  );
  const needsBaseRunner =
    selectedSceneKey() === 'passed' ||
    selectedSceneKey() === 'swing' ||
    selectedSceneKey() === 'take' ||
    stealSignSelected();

  batterButton.disabled = needsBaseRunner;
  if (needsBaseRunner && selectedStartKey() === 'BATTER') {
    firstBaseButton.click();
  }
}

function resetAutonomousRunners() {
  cancelAutonomousAnimations();
  delete runnerGameField.dataset.rundownOtherRunnersGoing;
  const start = window.RUNNER_MOVEMENT_RULES.STARTS[selectedStartKey()];
  const configuredBases =
    runnerGameField.dataset.otherBases !== undefined
      ? runnerGameField.dataset.otherBases
          .split(',')
          .map((base) => base.trim())
          .filter(Boolean)
      : start.otherBases;

  runnerGameOtherRunners.forEach((runner, index) => {
    runner.dataset.raceId = `other-${index}`;
    delete runner.dataset.rundownGo;
    delete runner.dataset.rundownDecision;
    const base = configuredBases[index];
    runner.hidden = !base;
    if (!base) return;
    const point = base === 'HOME'
      ? window.RUNNER_MOVEMENT_RULES.BATTER_BOX_POINT
      : window.RUNNER_MOVEMENT_RULES.BASE_POINTS[base];
    runner.dataset.base = base;
    runner.style.left = `${point[0]}%`;
    runner.style.top = `${point[1]}%`;
    runner.style.opacity = '1';
  });
}

function autonomousAnimation(runner, frames, options) {
  const animation = runner.animate(
    frames,
    { ...options, fill: 'forwards' }
  );
  runnerGameAutonomousAnimations.push(animation);
  return animation;
}

function segmentIndexFromBase(base) {
  return {
    HOME: 0,
    FIRST: 1,
    SECOND: 2,
    THIRD: 3
  }[base];
}

function autonomousPointAt(segmentIndex, progress) {
  if (segmentIndex === 0) {
    const start = window.RUNNER_MOVEMENT_RULES.BATTER_BOX_POINT;
    const end = window.RUNNER_MOVEMENT_RULES.BASE_POINTS.FIRST;
    const ratio = window.RUNNER_MOVEMENT_RULES.clampProgress(progress);
    return [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio
    ];
  }
  return window.RUNNER_MOVEMENT_RULES.pointAt(segmentIndex, progress);
}

function advanceAutonomousRunner(runner, delay, baseCount = 1) {
  const startSegmentIndex = segmentIndexFromBase(runner.dataset.base);
  const segments = window.RUNNER_MOVEMENT_RULES.SEGMENTS.slice(
    startSegmentIndex,
    startSegmentIndex + baseCount
  );
  if (!segments.length) return;

  const totalDuration = segments.reduce(
    (sum, segment) => sum + segment.duration,
    0
  );
  let elapsed = 0;
  const frames = [
    {
      left: `${
        startSegmentIndex === 0
          ? window.RUNNER_MOVEMENT_RULES.BATTER_BOX_POINT[0]
          : segments[0].start[0]
      }%`,
      top: `${
        startSegmentIndex === 0
          ? window.RUNNER_MOVEMENT_RULES.BATTER_BOX_POINT[1]
          : segments[0].start[1]
      }%`,
      offset: 0
    }
  ];
  segments.forEach((segment) => {
    elapsed += segment.duration;
    frames.push({
      left: `${segment.end[0]}%`,
      top: `${segment.end[1]}%`,
      offset: elapsed / totalDuration
    });
  });
  const animation = autonomousAnimation(
    runner,
    frames,
    { duration: totalDuration, delay, easing: 'linear' }
  );
  runnerGameRaceStates.set(runner, {
    kind: 'forward',
    runner,
    animation,
    delay,
    startSegmentIndex,
    segments,
    totalDuration
  });
}

function armAutonomousBatterRunnerRunThrough(runner) {
  const raceState = runnerGameRaceStates.get(runner);
  if (
    !runner ||
    raceState?.kind !== 'forward' ||
    raceState.startSegmentIndex !== 0 ||
    raceState.runThroughFirst
  ) return;

  const currentTime = Math.max(
    0,
    Number(raceState.animation.currentTime) || 0
  );
  const arrivalMs = Math.max(
    0,
    raceState.delay +
      raceState.segments[0].duration -
      currentTime
  );
  const runThroughAnimation = autonomousAnimation(
    runner,
    [
      {
        left: `${window.RUNNER_MOVEMENT_RULES.BASE_POINTS.FIRST[0]}%`,
        top: `${window.RUNNER_MOVEMENT_RULES.BASE_POINTS.FIRST[1]}%`
      },
      {
        left: `${window.RUNNER_MOVEMENT_RULES.KAKENUK_END[0]}%`,
        top: `${window.RUNNER_MOVEMENT_RULES.KAKENUK_END[1]}%`
      }
    ],
    {
      duration: 700,
      delay: arrivalMs,
      easing: 'linear'
    }
  );
  raceState.runThroughFirst = true;
  raceState.animations = [
    ...(raceState.animations || []),
    runThroughAnimation
  ];
}

function leadAndReturnAutonomousRunner(
  runner,
  catchDelay,
  leadProgress
) {
  const segmentIndex = segmentIndexFromBase(runner.dataset.base);
  const segment = window.RUNNER_MOVEMENT_RULES.SEGMENTS[segmentIndex];
  if (!segment) return;
  const lead = autonomousPointAt(segmentIndex, leadProgress);
  const leadDuration = Math.max(250, segment.duration * leadProgress);

  const leadAnimation = autonomousAnimation(
    runner,
    [
      { left: `${segment.start[0]}%`, top: `${segment.start[1]}%` },
      { left: `${lead[0]}%`, top: `${lead[1]}%` }
    ],
    { duration: leadDuration, delay: 80, easing: 'linear' }
  );
  const returnAnimation = autonomousAnimation(
    runner,
    [
      { left: `${lead[0]}%`, top: `${lead[1]}%` },
      { left: `${segment.start[0]}%`, top: `${segment.start[1]}%` }
    ],
    {
      duration: leadDuration,
      delay: catchDelay,
      easing: 'linear'
    }
  );
  runnerGameRaceStates.set(runner, {
    kind: 'lead-return',
    runner,
    animations: [leadAnimation, returnAnimation],
    returnAnimation,
    returnDelay: catchDelay,
    returnDuration: leadDuration,
    segmentIndex,
    leadProgress
  });
}

function tagUpAutonomousRunner(runner, catchDelay) {
  const segmentIndex =
    segmentIndexFromBase(runner.dataset.base);
  const segment =
    window.RUNNER_MOVEMENT_RULES.SEGMENTS[segmentIndex];
  if (!segment) return;

  const leadDelay = 80;
  const leadDuration = 200;
  const returnDelay = leadDelay + leadDuration;
  const returnDuration = 200;
  const leadProgress = Math.min(
    .08,
    leadDuration / segment.duration
  );
  const lead = autonomousPointAt(
    segmentIndex,
    leadProgress
  );

  const leadAnimation = autonomousAnimation(
    runner,
    [
      {
        left: `${segment.start[0]}%`,
        top: `${segment.start[1]}%`
      },
      { left: `${lead[0]}%`, top: `${lead[1]}%` }
    ],
    {
      duration: leadDuration,
      delay: leadDelay,
      easing: 'linear'
    }
  );
  const returnAnimation = autonomousAnimation(
    runner,
    [
      { left: `${lead[0]}%`, top: `${lead[1]}%` },
      {
        left: `${segment.start[0]}%`,
        top: `${segment.start[1]}%`
      }
    ],
    {
      duration: returnDuration,
      delay: returnDelay,
      easing: 'linear'
    }
  );
  const advanceAnimation = autonomousAnimation(
    runner,
    [
      {
        left: `${segment.start[0]}%`,
        top: `${segment.start[1]}%`
      },
      {
        left: `${segment.end[0]}%`,
        top: `${segment.end[1]}%`
      }
    ],
    {
      duration: segment.duration,
      delay: catchDelay,
      easing: 'linear'
    }
  );

  runnerGameRaceStates.set(runner, {
    kind: 'tag-up',
    runner,
    animations: [
      leadAnimation,
      returnAnimation,
      advanceAnimation
    ],
    timelineAnimation: advanceAnimation,
    segmentIndex,
    leadDelay,
    leadDuration,
    returnDelay,
    returnDuration,
    leadProgress,
    advanceDelay: catchDelay,
    advanceDuration: segment.duration
  });
}

function batterOutOnCatch(runner, catchDelay, runProgress) {
  const segment = window.RUNNER_MOVEMENT_RULES.SEGMENTS[0];
  const lead = autonomousPointAt(0, runProgress);
  const runDuration = Math.max(250, Math.min(
    catchDelay - 80,
    segment.duration * runProgress
  ));

  autonomousAnimation(
    runner,
    [
      {
        left: `${window.RUNNER_MOVEMENT_RULES.BATTER_BOX_POINT[0]}%`,
        top: `${window.RUNNER_MOVEMENT_RULES.BATTER_BOX_POINT[1]}%`,
        opacity: 1
      },
      {
        left: `${lead[0]}%`,
        top: `${lead[1]}%`,
        opacity: 1
      }
    ],
    { duration: runDuration, delay: 80, easing: 'linear' }
  );
  autonomousAnimation(
    runner,
    [
      { opacity: 1 },
      { opacity: 0 }
    ],
    { duration: 160, delay: catchDelay, easing: 'linear' }
  );
}

function autonomousRaceSnapshot(raceState) {
  if (!raceState) return null;
  if (raceState.kind === 'tag-up') {
    const elapsed = Math.max(
      0,
      Number(raceState.timelineAnimation.currentTime) || 0
    );
    let progress = 0;
    let moving = false;
    let movingForward = null;
    let targetBaseIndex = null;
    let runnerArrivalMs = null;
    let tagUpEligible = false;

    if (
      elapsed >= raceState.leadDelay &&
      elapsed < raceState.leadDelay + raceState.leadDuration
    ) {
      const ratio =
        (elapsed - raceState.leadDelay) /
        raceState.leadDuration;
      progress = raceState.leadProgress * ratio;
      moving = true;
      movingForward = true;
      targetBaseIndex = raceState.segmentIndex;
      runnerArrivalMs =
        raceState.leadDuration * (1 - ratio) +
        raceState.returnDuration;
    } else if (
      elapsed >= raceState.returnDelay &&
      elapsed < raceState.returnDelay + raceState.returnDuration
    ) {
      const ratio =
        (elapsed - raceState.returnDelay) /
        raceState.returnDuration;
      progress = raceState.leadProgress * (1 - ratio);
      moving = true;
      movingForward = false;
      targetBaseIndex = raceState.segmentIndex;
      runnerArrivalMs =
        raceState.returnDuration * (1 - ratio);
    } else if (
      elapsed >= raceState.advanceDelay &&
      elapsed <
        raceState.advanceDelay + raceState.advanceDuration
    ) {
      progress =
        (elapsed - raceState.advanceDelay) /
        raceState.advanceDuration;
      moving = true;
      movingForward = true;
      targetBaseIndex = raceState.segmentIndex + 1;
      runnerArrivalMs =
        raceState.advanceDuration * (1 - progress);
      tagUpEligible = true;
    } else if (
      elapsed >=
      raceState.advanceDelay + raceState.advanceDuration
    ) {
      return {
        id: raceState.runner.dataset.raceId,
        type: 'autonomous',
        moving: false,
        offBase: false,
        baseIndex: raceState.segmentIndex + 1,
        startBaseIndex: raceState.segmentIndex,
        segmentIndex: null,
        movingForward: null,
        advance: raceState.segmentIndex + 1,
        point: autonomousPointAt(
          raceState.segmentIndex,
          1
        ),
        tagUpEligible: true
      };
    }

    if (!moving) {
      return {
        id: raceState.runner.dataset.raceId,
        type: 'autonomous',
        moving: false,
        offBase: false,
        baseIndex: raceState.segmentIndex,
        startBaseIndex: raceState.segmentIndex,
        segmentIndex: null,
        movingForward: null,
        advance: raceState.segmentIndex,
        point: autonomousPointAt(
          raceState.segmentIndex,
          0
        )
      };
    }

    return {
      id: raceState.runner.dataset.raceId,
      type: 'autonomous',
      moving,
      offBase: true,
      startBaseIndex: raceState.segmentIndex,
      segmentIndex: raceState.segmentIndex,
      movingForward,
      advance: raceState.segmentIndex + progress,
      point: autonomousPointAt(
        raceState.segmentIndex,
        progress
      ),
      targetBaseIndex,
      runnerArrivalMs,
      tagUpEligible,
      arrivalMsByBase: {
        [targetBaseIndex]: runnerArrivalMs
      }
    };
  }

  if (raceState.kind === 'rundown') {
    const elapsed = Math.max(
      0,
      Math.min(
        raceState.duration,
        Number(raceState.animation.currentTime) || 0
      )
    );
    const ratio = raceState.duration
      ? elapsed / raceState.duration
      : 1;
    const progress =
      raceState.fromProgress +
      (
        raceState.targetProgress -
        raceState.fromProgress
      ) * ratio;
    const complete = elapsed >= raceState.duration;
    const reachedBase =
      raceState.targetProgress === 0 ||
      raceState.targetProgress === 1;
    const movingForward =
      raceState.targetProgress > raceState.fromProgress;
    return {
      id: raceState.runner.dataset.raceId,
      type: 'autonomous',
      moving: !complete,
      offBase: complete ? !reachedBase : true,
      baseIndex: complete && reachedBase
        ? (
            raceState.targetProgress === 1
              ? raceState.segmentIndex + 1
              : raceState.segmentIndex
          )
        : null,
      startBaseIndex: raceState.startBaseIndex,
      segmentIndex:
        complete && reachedBase
          ? null
          : raceState.segmentIndex,
      movingForward: complete ? null : movingForward,
      advance: raceState.segmentIndex + progress,
      point: autonomousPointAt(
        raceState.segmentIndex,
        progress
      ),
      targetBaseIndex: movingForward
        ? raceState.segmentIndex + 1
        : raceState.segmentIndex,
      runnerArrivalMs: complete
        ? 0
        : raceState.duration - elapsed
    };
  }

  if (raceState.kind === 'forward') {
    const currentTime = Math.max(
      0,
      Number(raceState.animation.currentTime) || 0
    );
    const activeTime = Math.max(
      0,
      currentTime - raceState.delay
    );
    if (activeTime >= raceState.totalDuration) {
      return {
        id: raceState.runner.dataset.raceId,
        type: 'autonomous',
        moving: false,
        offBase: false,
        baseIndex:
          raceState.startSegmentIndex +
          raceState.segments.length,
        startBaseIndex: raceState.startSegmentIndex,
        segmentIndex: null,
        movingForward: null,
        advance:
          raceState.startSegmentIndex +
          raceState.segments.length,
        point:
          raceState.segments[
            raceState.segments.length - 1
          ].end
      };
    }
    if (currentTime < raceState.delay) {
      return {
        id: raceState.runner.dataset.raceId,
        type: 'autonomous',
        moving: false,
        offBase: false,
        baseIndex: raceState.startSegmentIndex,
        startBaseIndex: raceState.startSegmentIndex,
        segmentIndex: null,
        movingForward: null,
        advance: raceState.startSegmentIndex,
        point: autonomousPointAt(
          raceState.startSegmentIndex,
          0
        )
      };
    }

    let elapsed = activeTime;
    let completedSegments = 0;
    for (const segment of raceState.segments) {
      if (elapsed <= segment.duration) {
        const progress = segment.duration
          ? elapsed / segment.duration
          : 1;
        const currentSegmentIndex =
          raceState.startSegmentIndex +
          completedSegments;
        const arrivalMsByBase = {};
        let timeToBase = segment.duration - elapsed;
        arrivalMsByBase[currentSegmentIndex + 1] =
          Math.max(0, timeToBase);
        raceState.segments
          .slice(completedSegments + 1)
          .forEach((futureSegment, offset) => {
            timeToBase += futureSegment.duration;
            arrivalMsByBase[
              currentSegmentIndex + offset + 2
            ] = timeToBase;
          });
        return {
          id: raceState.runner.dataset.raceId,
          type: 'autonomous',
          moving: true,
          offBase: true,
          startBaseIndex: raceState.startSegmentIndex,
          segmentIndex: currentSegmentIndex,
          movingForward: true,
          advance:
            raceState.startSegmentIndex +
            completedSegments +
            progress,
          point: autonomousPointAt(
            raceState.startSegmentIndex +
              completedSegments,
            progress
          ),
          targetBaseIndex:
            raceState.startSegmentIndex +
            raceState.segments.length,
          runnerArrivalMs:
            raceState.totalDuration - activeTime,
          arrivalMsByBase
        };
      }
      elapsed -= segment.duration;
      completedSegments += 1;
    }
  }

  if (raceState.kind === 'lead-return') {
    const currentTime = Math.max(
      0,
      Number(raceState.returnAnimation.currentTime) || 0
    );
    const activeTime = Math.max(
      0,
      currentTime - raceState.returnDelay
    );
    if (currentTime < raceState.returnDelay) {
      return {
        id: raceState.runner.dataset.raceId,
        type: 'autonomous',
        moving: true,
        offBase: true,
        startBaseIndex: raceState.segmentIndex,
        segmentIndex: raceState.segmentIndex,
        movingForward: true,
        advance:
          raceState.segmentIndex + raceState.leadProgress,
        point: autonomousPointAt(
          raceState.segmentIndex,
          raceState.leadProgress
        ),
        targetBaseIndex: raceState.segmentIndex,
        runnerArrivalMs: raceState.returnDuration
      };
    }
    if (activeTime < raceState.returnDuration) {
      const returnRatio =
        activeTime / raceState.returnDuration;
      return {
        id: raceState.runner.dataset.raceId,
        type: 'autonomous',
        moving: true,
        offBase: true,
        startBaseIndex: raceState.segmentIndex,
        segmentIndex: raceState.segmentIndex,
        movingForward: false,
        advance:
          raceState.segmentIndex +
          raceState.leadProgress * (1 - returnRatio),
        point: autonomousPointAt(
          raceState.segmentIndex,
          raceState.leadProgress * (1 - returnRatio)
        ),
        targetBaseIndex: raceState.segmentIndex,
        runnerArrivalMs:
          raceState.returnDuration - activeTime
      };
    }
    return {
      id: raceState.runner.dataset.raceId,
      type: 'autonomous',
      moving: false,
      offBase: false,
      baseIndex: raceState.segmentIndex,
      startBaseIndex: raceState.segmentIndex,
      segmentIndex: null,
      movingForward: null,
      advance: raceState.segmentIndex,
      point: autonomousPointAt(
        raceState.segmentIndex,
        0
      )
    };
  }

  return null;
}

function autonomousRunnerById(runnerId) {
  return runnerGameOtherRunners.find(
    (runner) => runner.dataset.raceId === runnerId
  ) || null;
}

function autonomousRunnerSnapshot(runner) {
  const raceState = runnerGameRaceStates.get(runner);
  const activeSnapshot = autonomousRaceSnapshot(raceState);
  if (activeSnapshot) return activeSnapshot;
  const baseIndex = segmentIndexFromBase(
    runner?.dataset?.base
  );
  if (!Number.isInteger(baseIndex)) return null;
  return {
    id: runner.dataset.raceId,
    type: 'autonomous',
    moving: false,
    offBase: false,
    baseIndex,
    startBaseIndex: baseIndex,
    segmentIndex: null,
    movingForward: null,
    advance: baseIndex,
    point: autonomousPointAt(baseIndex, 0),
    targetBaseIndex: null,
    runnerArrivalMs: null
  };
}

function allActiveRunnerSnapshots() {
  const snapshots = [];
  const selfSnapshot =
    window.RUNNER_SELF_RACE_API?.snapshot?.();
  if (
    selfSnapshot &&
    !runnerGameOutRunnerIds.has(selfSnapshot.id)
  ) {
    snapshots.push(selfSnapshot);
  }
  runnerGameOtherRunners
    .filter((runner) => !runner.hidden)
    .forEach((runner) => {
      if (
        runnerGameOutRunnerIds.has(
          runner.dataset.raceId
        )
      ) return;
      const snapshot = autonomousRunnerSnapshot(runner);
      if (snapshot) snapshots.push(snapshot);
    });
  return snapshots;
}

function stopPassingRunnerMonitor() {
  if (runnerGamePassingTimer !== null) {
    clearInterval(runnerGamePassingTimer);
    runnerGamePassingTimer = null;
  }
}

function checkForPassedRunner() {
  const snapshots = allActiveRunnerSnapshots();
  const passedRunner =
    window.RUNNER_MOVEMENT_RULES.findPassedRunner(
      snapshots
    );
  if (!passedRunner) return;
  const rearRunner = snapshots.find(
    (snapshot) =>
      snapshot.id === passedRunner.runnerId
  );
  if (!rearRunner) return;
  runnerGameOutRunnerIds.add(rearRunner.id);
  runnerGameField.dispatchEvent(new CustomEvent(
    'runner-passing-out',
    {
      detail: {
        runnerId: rearRunner.id,
        runnerType: rearRunner.type,
        passedRunnerId: passedRunner.passedRunnerId,
        reason: 'passed-runner'
      }
    }
  ));
}

function startPassingRunnerMonitor() {
  stopPassingRunnerMonitor();
  runnerGamePassingTimer = setInterval(
    checkForPassedRunner,
    80
  );
}

function cancelRaceStateAnimations(raceState) {
  if (!raceState) return;
  if (raceState.animation) raceState.animation.cancel();
  raceState.animations?.forEach(
    (animation) => animation.cancel()
  );
}

function startAutonomousRundownLeg(
  runnerId,
  segmentIndex,
  targetProgress
) {
  const runner = autonomousRunnerById(runnerId);
  if (!runner) return 0;
  const currentState = runnerGameRaceStates.get(runner);
  const snapshot = autonomousRunnerSnapshot(runner);
  if (!snapshot) return 0;
  const segment = Number(segmentIndex);
  const requestedTarget =
    window.RUNNER_MOVEMENT_RULES.clampProgress(
      targetProgress
    );
  const target =
    segment === 0 ? 1 : requestedTarget;
  if (
    currentState?.kind === 'rundown' &&
    currentState.segmentIndex === segment &&
    currentState.targetProgress === target &&
    snapshot.moving
  ) return Math.max(
    0,
    Number(snapshot.runnerArrivalMs) || 0
  );

  const fromProgress =
    window.RUNNER_MOVEMENT_RULES.clampProgress(
      Number(snapshot.advance) - segment
    );
  if (
    !Number.isFinite(fromProgress) ||
    Math.abs(fromProgress - target) < .002
  ) return 0;
  cancelRaceStateAnimations(currentState);
  const from = autonomousPointAt(segment, fromProgress);
  const to = autonomousPointAt(segment, target);
  const duration = Math.max(
    80,
    window.RUNNER_MOVEMENT_RULES.durationBetween(
      segment,
      fromProgress,
      target
    )
  );
  const animation = autonomousAnimation(
    runner,
    [
      { left: `${from[0]}%`, top: `${from[1]}%` },
      { left: `${to[0]}%`, top: `${to[1]}%` }
    ],
    { duration, easing: 'linear' }
  );
  runnerGameRaceStates.set(runner, {
    kind: 'rundown',
    runner,
    animation,
    duration,
    segmentIndex: segment,
    fromProgress,
    targetProgress: target,
    startBaseIndex:
      Number.isInteger(Number(snapshot.startBaseIndex))
        ? Number(snapshot.startBaseIndex)
        : segment
  });
  return duration;
}

function directAutonomousRunnerAwayFromBall(detail) {
  if (
    detail?.runnerId === 'self' ||
    !Number.isInteger(Number(detail?.segmentIndex))
  ) return;
  const runner = autonomousRunnerById(detail.runnerId);
  const snapshot = runner
    ? autonomousRunnerSnapshot(runner)
    : null;
  const runningTowardBall = Boolean(
    snapshot?.moving &&
    (
      (
        detail.ballSide === 'lead' &&
        snapshot.movingForward === true
      ) ||
      (
        detail.ballSide === 'trail' &&
        snapshot.movingForward === false
      )
    )
  );
  const commitsToClosePlay = Boolean(
    runningTowardBall &&
    window.RUNNER_MOVEMENT_RULES
      .shouldAttemptClosePlay(
        snapshot.runnerArrivalMs,
        0
      )
  );
  if (runner) {
    runner.dataset.rundownDecision =
      commitsToClosePlay
        ? 'commit-close-play'
        : 'escape-ball';
  }
  startAutonomousRundownLeg(
    detail.runnerId,
    Number(detail.segmentIndex),
    commitsToClosePlay
      ? (snapshot.movingForward ? 1 : 0)
      : (detail.ballSide === 'lead' ? 0 : 1)
  );
}

function armAutonomousRundownTarget(detail) {
  if (
    detail?.runnerId === 'self' ||
    !Number.isInteger(Number(detail?.segmentIndex))
  ) return;
  startAutonomousRundownLeg(
    detail.runnerId,
    Number(detail.segmentIndex),
    detail.ballSide === 'lead' ? 0 : 1
  );
}

function startAutonomousRundownSupport(detail) {
  runnerGameRundownSupportIds.clear();
  let advancingRunnerCount = 0;
  const pitchOnlyScene = [
    'passed',
    'swing',
    'take'
  ].includes(selectedSceneKey());

  const supportCandidates = runnerGameOtherRunners
    .filter((runner) => !runner.hidden)
    .map((runner) => ({
      runner,
      snapshot: autonomousRunnerSnapshot(runner)
    }))
    .filter(({ runner, snapshot }) => (
      runner.dataset.raceId !== detail.runnerId &&
      snapshot &&
      Number(snapshot.advance) < 4
    ))
    .sort(
      (first, second) =>
        Number(second.snapshot.advance) -
        Number(first.snapshot.advance)
    );

  supportCandidates.forEach(({ runner, snapshot }) => {
    if (
      pitchOnlyScene &&
      runner.dataset.base === 'HOME'
    ) {
      runner.dataset.rundownGo = 'batter-hold';
      return;
    }
    const hasActiveSegment =
      snapshot.segmentIndex !== null &&
      snapshot.segmentIndex !== undefined &&
      Number.isInteger(Number(snapshot.segmentIndex));
    const segmentIndex = hasActiveSegment
      ? Number(snapshot.segmentIndex)
      : Number(snapshot.baseIndex);
    if (
      !Number.isInteger(segmentIndex) ||
      segmentIndex < 0 ||
      segmentIndex >= 4
    ) return;
    runnerGameRundownSupportIds.add(
      runner.dataset.raceId
    );
    const duration = startAutonomousRundownLeg(
      runner.dataset.raceId,
      segmentIndex,
      1
    );
    runner.dataset.rundownGo =
      duration > 0
        ? `go-${segmentIndex}`
        : 'already-there';
    if (duration > 0) advancingRunnerCount += 1;
  });
  checkForPassedRunner();
  return advancingRunnerCount;
}

function settleAutonomousRundownSupport(detail) {
  const rundownSegment = Number(detail?.segmentIndex);
  const supportRunners = [
    ...runnerGameRundownSupportIds
  ]
    .map((runnerId) => {
      const runner = autonomousRunnerById(runnerId);
      const snapshot = runner
        ? autonomousRunnerSnapshot(runner)
        : null;
      return snapshot
        ? {
            ...snapshot,
            id: runnerId
          }
        : null;
    })
    .filter(Boolean);
  const supportPlan =
    window.RUNNER_MOVEMENT_RULES.planRundownSupport(
      supportRunners,
      rundownSegment,
      detail?.safeBaseIndex,
      Boolean(detail?.out)
    );
  let settleMs = 0;
  supportPlan.forEach((plan) => {
    settleMs = Math.max(
      settleMs,
      startAutonomousRundownLeg(
        plan.runnerId,
        plan.segmentIndex,
        plan.targetProgress
      )
    );
  });
  runnerGameRundownSupportIds.clear();
  detail.supportSettleMs = settleMs;
}

function runnerPointDistance(firstPoint, secondPoint) {
  if (!firstPoint || !secondPoint) return Infinity;
  const width = runnerGamePlayArea.clientWidth || 100;
  const height = runnerGamePlayArea.clientHeight || 100;
  return Math.hypot(
    (firstPoint[0] - secondPoint[0]) * width / 100,
    (firstPoint[1] - secondPoint[1]) * height / 100
  );
}

function estimatedDefenseThrowMs(from, to) {
  const diagonal = runnerPointDistance(
    runnerDefenseBasePoints[4],
    runnerDefenseBasePoints[2]
  );
  if (!Number.isFinite(diagonal) || !diagonal) return 2500;
  return Math.round(
    2500 * runnerPointDistance(from, to) / diagonal
  );
}

function buildRunnerDefenseDecision(
  possessionPoint = null,
  defenseAlignment = runnerGameDefenseAlignment,
  scene = selectedSceneKey(),
  direction = null,
  resolvedSafeTargets = []
) {
  if (runnerGameInningOver) {
    return { allStopped: true, inningOver: true };
  }
  const snapshots = [];
  const selfSnapshot =
    window.RUNNER_SELF_RACE_API?.snapshot?.();
  if (selfSnapshot) snapshots.push(selfSnapshot);
  runnerGameRaceStates.forEach((raceState) => {
    const snapshot = autonomousRaceSnapshot(raceState);
    if (snapshot) snapshots.push(snapshot);
  });

  const fairBallScene =
    scene === 'ground' ||
    scene === 'error' ||
    scene === 'single' ||
    scene === 'extra' ||
    (
      scene === 'bunt' &&
      String(direction).endsWith('-ground')
    );
  const caughtBallScene =
    scene === 'fly' ||
    scene === 'popup' ||
    scene === 'liner' ||
    (
      scene === 'bunt' &&
      String(direction).endsWith('-popup')
    );

  const resolvedTargets = new Set(
    resolvedSafeTargets || []
  );
  const movingRunners = snapshots
    .filter(
      (snapshot) => snapshot.moving || snapshot.offBase
    )
    .filter((snapshot) => {
      const targetBaseIndex =
        Number(snapshot.targetBaseIndex);
      if (
        !snapshot.id ||
        !Number.isInteger(targetBaseIndex)
      ) return true;
      return !resolvedTargets.has(
        `${snapshot.id}:${targetBaseIndex}`
      );
    });
  const retouchRunners =
    caughtBallScene && runnerGamePlayStartOuts < 2
      ? snapshots.filter((runner) => {
          const startBaseIndex =
            Number(runner.startBaseIndex);
          if (
            !Number.isInteger(startBaseIndex) ||
            startBaseIndex < 1 ||
            startBaseIndex > 3 ||
            runner.tagUpEligible
          ) return false;
          return (
            runner.moving ||
            runner.offBase ||
            Number(runner.baseIndex) !== startBaseIndex
          );
        })
      : [];
  if (
    !movingRunners.length &&
    !retouchRunners.length
  ) {
    return { allStopped: true };
  }

  if (possessionPoint) {
    const contactedRunner = movingRunners.find(
      (snapshot) =>
        runnerPointDistance(
          possessionPoint,
          snapshot.point
        ) <= 18
    );
    if (contactedRunner) {
      return {
        allStopped: false,
        tagAtContact: true,
        runnerId: contactedRunner.id,
        runnerType: contactedRunner.type,
        runnerArrivalMs:
          contactedRunner.runnerArrivalMs,
        targetBaseIndex: contactedRunner.targetBaseIndex,
        targetPoint: possessionPoint
      };
    }
  }

  const candidateForBase = (
    runner,
    targetBaseIndex,
    runnerArrivalMs,
    forceOut = false
  ) => {
    const targetPoint =
      runnerDefenseBasePoints[targetBaseIndex];
    if (!targetPoint) return null;
    return {
      ...runner,
      targetBaseIndex,
      targetPoint,
      runnerArrivalMs,
      defenseArrivalMs:
        possessionPoint
          ? estimatedDefenseThrowMs(
              possessionPoint,
              targetPoint
            )
          : Number.POSITIVE_INFINITY,
      forceOut
    };
  };

  const occupiedStartBaseIndexes = snapshots
    .map((runner) => Number(runner.startBaseIndex))
    .filter(Number.isInteger);
  const runnerIsForced = (runner) => Boolean(
    window.RUNNER_MOVEMENT_RULES
      ?.forcedBaseIndex?.(
        runner.startBaseIndex,
        occupiedStartBaseIndexes
      )
  );
  const leadCandidates = movingRunners
    .filter((runner) => !runnerIsForced(runner))
    .filter((runner) => (
      !window.RUNNER_MOVEMENT_RULES
        ?.shouldIgnoreNormalInfieldLeadTarget?.({
          scene,
          direction,
          alignment: defenseAlignment,
          startBaseIndex: runner.startBaseIndex,
          targetBaseIndex: runner.targetBaseIndex,
          forced: runnerIsForced(runner)
        })
    ))
    .map((runner) =>
      candidateForBase(
        runner,
        runner.targetBaseIndex,
        runner.runnerArrivalMs
      )
    )
    .filter(Boolean);
  const forceCandidates = fairBallScene
    ? movingRunners
        .map((runner) => {
          const forceBaseIndex =
            window.RUNNER_MOVEMENT_RULES
              ?.forcedBaseIndex?.(
                runner.startBaseIndex,
                occupiedStartBaseIndexes
              );
          if (
            !forceBaseIndex ||
            Number(runner.advance) >= forceBaseIndex
          ) return null;
          const recordedArrival =
            runner.arrivalMsByBase?.[forceBaseIndex];
          const forceArrivalMs =
            Number.isFinite(Number(recordedArrival))
              ? Number(recordedArrival)
              : (
                  runner.targetBaseIndex === forceBaseIndex
                    ? runner.runnerArrivalMs
                    : Number.POSITIVE_INFINITY
                );
          return candidateForBase(
            runner,
            forceBaseIndex,
            forceArrivalMs,
            true
          );
        })
        .filter(Boolean)
        .filter((candidate) => (
          !window.RUNNER_MOVEMENT_RULES
            ?.shouldIgnoreNormalInfieldLeadTarget?.({
              scene,
              direction,
              alignment: defenseAlignment,
              startBaseIndex: candidate.startBaseIndex,
              targetBaseIndex: candidate.targetBaseIndex,
              forced: true
            })
        ))
    : [];
  const basesLoaded =
    [0, 1, 2, 3].every(
      (baseIndex) =>
        occupiedStartBaseIndexes.includes(baseIndex)
    );
  if (
    scene === 'ground' &&
    defenseAlignment === 'normal' &&
    basesLoaded
  ) {
    const preferredDoublePlayBase =
      ['third-line', 'third', 'short'].includes(
        String(direction)
      )
        ? 3
        : 2;
    forceCandidates.forEach((candidate) => {
      candidate.defensePriority =
        Number(candidate.targetBaseIndex) ===
        preferredDoublePlayBase
          ? 0
          : Number(candidate.targetBaseIndex) === 1
            ? 2
            : 1;
      candidate.defenseReason =
        'normal-defense-double-play';
    });
  }
  const retouchCandidates =
    caughtBallScene && runnerGamePlayStartOuts < 2
      ? retouchRunners
          .map((runner) => {
            const retouchBaseIndex =
              Number(runner.startBaseIndex);
            const returningToOriginal =
              Number(runner.targetBaseIndex) ===
              retouchBaseIndex;
            const candidate = candidateForBase(
              runner,
              retouchBaseIndex,
              returningToOriginal
                ? runner.runnerArrivalMs
                : Number.POSITIVE_INFINITY,
              true
            );
            if (!candidate) return null;
            candidate.retouchOut = true;
            candidate.defenseReason = 'retouch-out';
            return candidate;
          })
          .filter(Boolean)
          .sort(
            (first, second) =>
              Number(second.advance) -
              Number(first.advance)
          )
      : [];
  const targetRunner =
    retouchCandidates[0] ||
    window.RUNNER_MOVEMENT_RULES
      ?.selectDefenseTarget?.(
        leadCandidates,
        forceCandidates
      ) ||
    leadCandidates.sort(
      (first, second) =>
        Number(second.advance) - Number(first.advance)
    )[0];
  if (!targetRunner) return { allStopped: true };
  const targetPoint =
    runnerDefenseBasePoints[targetRunner.targetBaseIndex];
  if (!targetPoint) return { allStopped: true };
  const leadTagUpInProgress = snapshots.some((runner) => (
    runner.id !== targetRunner.id &&
    runner.tagUpEligible &&
    Number(runner.startBaseIndex) >= 2 &&
    Number(runner.targetBaseIndex) >
      Number(runner.startBaseIndex)
  ));
  const prohibitedFirstBaseTagUp = Boolean(
    caughtBallScene &&
    scene === 'fly' &&
    Number(targetRunner.startBaseIndex) === 1 &&
    Number(targetRunner.targetBaseIndex) === 2 &&
    [
      'left-center',
      'center',
      'right-center',
      'right',
      'right-line'
    ].includes(String(direction)) &&
    !leadTagUpInProgress
  );
  const prohibitedSecondBaseTagUp = Boolean(
    caughtBallScene &&
    scene === 'fly' &&
    Number(targetRunner.startBaseIndex) === 2 &&
    Number(targetRunner.targetBaseIndex) === 3 &&
    ['left-line', 'left'].includes(String(direction))
  );

  return {
    allStopped: false,
    runnerId: targetRunner.id,
    runnerType: targetRunner.type,
    runnerArrivalMs: targetRunner.runnerArrivalMs,
    targetBaseIndex: targetRunner.targetBaseIndex,
    targetPoint,
    runnerPoint: targetRunner.point,
    segmentIndex: targetRunner.segmentIndex,
    movingForward: targetRunner.movingForward,
    tagUpEligible: Boolean(
      targetRunner.tagUpEligible
    ),
    forceOut: Boolean(targetRunner.forceOut),
    prohibitedFirstBaseTagUp,
    prohibitedSecondBaseTagUp,
    rundownEligible: Boolean(
      !targetRunner.forceOut &&
      !caughtBallScene &&
      [1, 2, 3].includes(
        Number(targetRunner.segmentIndex)
      )
    ),
    defenseReason: targetRunner.defenseReason || null
  };
}

function buildRundownLeadDecision(detail) {
  const rundownSegment = Number(detail?.segmentIndex);
  const snapshots = [];
  const selfSnapshot =
    window.RUNNER_SELF_RACE_API?.snapshot?.();
  if (selfSnapshot) snapshots.push(selfSnapshot);
  runnerGameRaceStates.forEach((raceState) => {
    const snapshot = autonomousRaceSnapshot(raceState);
    if (snapshot) snapshots.push(snapshot);
  });
  const targetRunner = snapshots
    .filter((snapshot) => (
      snapshot.id !== detail?.runnerId &&
      (snapshot.moving || snapshot.offBase) &&
      snapshot.movingForward !== false &&
      Number(snapshot.advance) > rundownSegment + .8 &&
      Number.isInteger(Number(snapshot.targetBaseIndex)) &&
      Number(snapshot.targetBaseIndex) >
        Number(snapshot.advance)
    ))
    .sort(
      (first, second) =>
        Number(second.advance) - Number(first.advance)
    )[0];
  if (!targetRunner) return null;
  const targetBaseIndex =
    Number(targetRunner.targetBaseIndex);
  const targetPoint =
    runnerDefenseBasePoints[targetBaseIndex];
  if (!targetPoint) return null;
  return {
    allStopped: false,
    runnerId: targetRunner.id,
    runnerType: targetRunner.type,
    runnerArrivalMs: targetRunner.runnerArrivalMs,
    targetBaseIndex,
    targetPoint,
    runnerPoint: targetRunner.point,
    segmentIndex: targetRunner.segmentIndex,
    movingForward: targetRunner.movingForward,
    forceOut: false,
    rundownEligible: [1, 2, 3].includes(
      Number(targetRunner.segmentIndex)
    ),
    defenseReason: 'rundown-lead-runner'
  };
}

function transferRearRundownRunner(detail) {
  window.RUNNER_SELF_RACE_API?.transferRundown?.(
    detail
  );
  if (detail?.runnerId !== 'self') {
    startAutonomousRundownLeg(
      detail.runnerId,
      Number(detail.segmentIndex),
      1
    );
  }
  settleAutonomousRundownSupport({
    ...detail,
    out: true,
    safeBaseIndex: null
  });
}

function applyRunnerDefenseResult(detail) {
  if (!detail) return;
  detail.outs = runnerGameOuts;
  detail.playOuts = runnerGamePlayOuts;
  detail.inningOver = runnerGameInningOver;
  if (!detail.out || detail.counted) return;
  if (detail.runnerId) {
    runnerGameOutRunnerIds.add(detail.runnerId);
  }

  if (!detail.automatic) {
    if (detail.runnerType === 'self') {
      window.RUNNER_SELF_RACE_API?.applyOut?.(detail);
    } else {
      const targetRunner = runnerGameOtherRunners.find(
        (runner) =>
          runner.dataset.raceId === detail.runnerId
      );
      if (targetRunner) {
        const raceState =
          runnerGameRaceStates.get(targetRunner);
        const finishRunThrough =
          Number(detail.targetBaseIndex) === 1 &&
          raceState?.startSegmentIndex === 0 &&
          raceState?.runThroughFirst;
        if (!finishRunThrough) {
          if (raceState?.animation) {
            raceState.animation.cancel();
          }
          raceState?.animations?.forEach(
            (animation) => animation.cancel()
          );
          targetRunner.style.opacity = '0';
        }
        runnerGameRaceStates.delete(targetRunner);
      }
    }
  }

  detail.counted = true;
  registerRunnerOut(detail);
}

function playAutonomousRunners(
  scene = selectedSceneKey(),
  direction = null
) {
  resetAutonomousRunners();
  const visibleRunners = runnerGameOtherRunners.filter(
    (runner) => !runner.hidden
  );
  const batterRunner = visibleRunners.find(
    (runner) => runner.dataset.base === 'HOME'
  );
  const baseRunners = visibleRunners.filter(
    (runner) => runner.dataset.base !== 'HOME'
  );
  const selfStartBaseIndex =
    window.RUNNER_MOVEMENT_RULES.STARTS[
      selectedStartKey()
    ]?.baseIndex;
  const occupiedBaseIndexes = [
    ...visibleRunners.map(
      (runner) => segmentIndexFromBase(runner.dataset.base)
    ),
    selfStartBaseIndex
  ].filter(Number.isInteger);
  const followsControlledRunner = (runner) => {
    const startBaseIndex =
      segmentIndexFromBase(runner.dataset.base);
    return (
      Number.isInteger(selfStartBaseIndex) &&
      selfStartBaseIndex === startBaseIndex + 1 &&
      !window.RUNNER_MOVEMENT_RULES.forcedBaseIndex(
        startBaseIndex,
        occupiedBaseIndexes
      )
    );
  };
  const baseRunnerMayAdvance = (
    runner,
    includeBatterForce = true
  ) => {
    if (followsControlledRunner(runner)) {
      return window.RUNNER_MOVEMENT_RULES
        .autonomousRunnerDecision(
          segmentIndexFromBase(runner.dataset.base),
          occupiedBaseIndexes,
          runnerGameSelfLeadAction
        ) === 'GO';
    }
    return window.RUNNER_MOVEMENT_RULES.autonomousRunnerMayAdvance(
      segmentIndexFromBase(runner.dataset.base),
      includeBatterForce
        ? occupiedBaseIndexes
        : occupiedBaseIndexes.filter(
            (baseIndex) => baseIndex !== 0
          )
    );
  };
  const returnBehindControlledRunner = (
    runner,
    delay = 650,
    leadProgress = .08
  ) => {
    leadAndReturnAutonomousRunner(
      runner,
      delay,
      leadProgress
    );
  };

  const playCaughtBallRunners = (
    catchDelay,
    leadProgress
  ) => {
    baseRunners.forEach((runner) => {
      const baseIndex =
        segmentIndexFromBase(runner.dataset.base);
      const plan =
        window.RUNNER_MOVEMENT_RULES.runnerContactPlan(
          runnerGameOuts,
          scene,
          baseIndex
        );
      if (!baseRunnerMayAdvance(runner, false)) {
        if (followsControlledRunner(runner)) {
          returnBehindControlledRunner(
            runner,
            catchDelay,
            leadProgress
          );
          return;
        }
        leadAndReturnAutonomousRunner(
          runner,
          catchDelay,
          leadProgress
        );
        return;
      }
      if (plan === 'GO') {
        advanceAutonomousRunner(runner, 80);
      } else if (plan === 'TAG_UP') {
        tagUpAutonomousRunner(runner, catchDelay);
      } else {
        leadAndReturnAutonomousRunner(
          runner,
          catchDelay,
          leadProgress
        );
      }
    });
  };

  if (scene === 'fly') {
    if (batterRunner) batterOutOnCatch(batterRunner, 4500, .72);
    playCaughtBallRunners(4500, .5);
    return;
  }
  if (scene === 'popup') {
    if (batterRunner) batterOutOnCatch(batterRunner, 3800, .58);
    playCaughtBallRunners(3800, .25);
    return;
  }
  if (scene === 'liner') {
    if (batterRunner) batterOutOnCatch(batterRunner, 1440, .18);
    playCaughtBallRunners(1440, .18);
    return;
  }
  if (
    scene === 'bunt' &&
    String(direction).endsWith('-popup')
  ) {
    if (batterRunner) {
      batterOutOnCatch(batterRunner, 1700, .24);
    }
    playCaughtBallRunners(1700, .18);
    return;
  }
  if (scene === 'swing' || scene === 'take') {
    if (
      runnerGameField.dataset.autonomousDecoySteal === 'true'
    ) {
      const decoyRunner = baseRunners.find(
        (runner) => runner.dataset.base === 'FIRST'
      );
      if (decoyRunner) {
        advanceAutonomousRunner(
          decoyRunner,
          Math.max(
            0,
            Number(
              runnerGameField.dataset.autonomousDecoyDelay
            ) || 0
          )
        );
      }
    }
    return;
  }

  if (scene === 'single' || scene === 'extra') {
    if (batterRunner) advanceAutonomousRunner(batterRunner, 100);
    baseRunners.forEach((runner) => {
      if (!baseRunnerMayAdvance(runner)) {
        if (followsControlledRunner(runner)) {
          returnBehindControlledRunner(runner);
        }
        return;
      }
      const baseCount =
        scene === 'single' && runner.dataset.base === 'FIRST'
          ? 1
          : 2;
      advanceAutonomousRunner(runner, 100, baseCount);
    });
    return;
  }

  const delay = scene === 'passed'
    ? 850
    : 180;
  const runnersToAdvance = scene === 'passed'
    ? baseRunners
    : visibleRunners;
  runnersToAdvance.forEach((runner) => {
    if (
      runner !== batterRunner &&
      !baseRunnerMayAdvance(runner)
    ) {
      if (followsControlledRunner(runner)) {
        returnBehindControlledRunner(runner);
      }
      return;
    }
    const unforcedSecondRunnerOnLeftGround =
      scene === 'ground' &&
      runner.dataset.base === 'SECOND' &&
      !baseRunners.some(
        (candidate) => candidate.dataset.base === 'FIRST'
      ) &&
      ['third-line', 'third', 'short'].includes(
        String(direction)
      );
    if (unforcedSecondRunnerOnLeftGround) {
      leadAndReturnAutonomousRunner(runner, 850, .08);
      return;
    }
    advanceAutonomousRunner(runner, delay);
    if (
      runner === batterRunner &&
      window.RUNNER_MOVEMENT_RULES
        .batterRunnerMustRunThrough(scene, direction)
    ) {
      armAutonomousBatterRunnerRunThrough(runner);
    }
  });
}

runnerGameField.addEventListener('runner-play-phase', (event) => {
  if (event.detail?.phase === 'prepare') {
    runnerGameSelfLeadAction = 'BACK';
    prepareRunnerOutCount();
    resetAutonomousRunners();
    startPassingRunnerMonitor();
    return;
  }
  if (
    event.detail?.phase === 'contact' ||
    event.detail?.phase === 'pitch'
  ) {
    playAutonomousRunners(
      event.detail?.scene,
      event.detail?.direction
    );
  }
});
runnerGameField.addEventListener(
  'runner-action-accepted',
  (event) => {
    const action = event.detail?.action;
    if (!['GO', 'BACK', 'STOP'].includes(action)) return;
    runnerGameSelfLeadAction =
      action === 'GO' ? 'GO' : 'BACK';

    const selfStartBaseIndex =
      window.RUNNER_MOVEMENT_RULES.STARTS[
        selectedStartKey()
      ]?.baseIndex;
    const visibleRunners = runnerGameOtherRunners.filter(
      (runner) => !runner.hidden
    );
    const occupiedBaseIndexes = [
      ...visibleRunners.map(
        (runner) =>
          segmentIndexFromBase(runner.dataset.base)
      ),
      selfStartBaseIndex
    ].filter(Number.isInteger);

    visibleRunners.forEach((runner) => {
      const startBaseIndex =
        segmentIndexFromBase(runner.dataset.base);
      if (
        !Number.isInteger(selfStartBaseIndex) ||
        selfStartBaseIndex !== startBaseIndex + 1 ||
        window.RUNNER_MOVEMENT_RULES.forcedBaseIndex(
          startBaseIndex,
          occupiedBaseIndexes
        )
      ) return;
      const decision = window.RUNNER_MOVEMENT_RULES
        .autonomousRunnerDecision(
          startBaseIndex,
          occupiedBaseIndexes,
          runnerGameSelfLeadAction
        );
      startAutonomousRundownLeg(
        runner.dataset.raceId,
        startBaseIndex,
        decision === 'GO' ? 1 : 0
      );
    });
  }
);
runnerGameField.addEventListener(
  'runner-defense-alignment-request',
  (event) => {
    runnerGameDefenseAlignment =
      chooseRunnerDefenseAlignment();
    event.detail.alignment =
      runnerGameDefenseAlignment;
    event.detail.outs = runnerGameOuts;
    event.detail.thirdBaseRunner =
      thirdBaseRunnerPresent();
  }
);
runnerGameField.addEventListener(
  'runner-defense-decision',
  (event) => {
    event.detail.decision = buildRunnerDefenseDecision(
      event.detail.possessionPoint,
      event.detail.defenseAlignment,
      event.detail.scene,
      event.detail.direction,
      event.detail.resolvedSafeTargets
    );
  }
);
runnerGameField.addEventListener(
  'runner-defense-result',
  (event) => {
    applyRunnerDefenseResult(event.detail);
  }
);
runnerGameField.addEventListener(
  'runner-rundown-snapshot-request',
  (event) => {
    if (event.detail?.runnerId === 'self') {
      event.detail.snapshot =
        window.RUNNER_SELF_RACE_API?.snapshot?.() || null;
      return;
    }
    const runner = autonomousRunnerById(
      event.detail?.runnerId
    );
    event.detail.snapshot = runner
      ? autonomousRaceSnapshot(
          runnerGameRaceStates.get(runner)
        )
      : null;
  }
);
runnerGameField.addEventListener(
  'runner-rundown-arm',
  (event) => {
    window.RUNNER_SELF_RACE_API?.armRundown?.(
      event.detail
    );
    armAutonomousRundownTarget(event.detail);
  }
);
runnerGameField.addEventListener(
  'runner-rundown-start',
  (event) => {
    window.RUNNER_SELF_RACE_API?.startRundown?.(
      event.detail
    );
    const selfAdvancing =
      runnerGameField.dataset.autonomousDecoySteal === 'true'
        ? false
        : window.RUNNER_SELF_RACE_API
            ?.advanceDuringRundown?.(event.detail);
    directAutonomousRunnerAwayFromBall(event.detail);
    const autonomousAdvancing =
      startAutonomousRundownSupport(event.detail);
    runnerGameField.dataset.rundownOtherRunnersGoing =
      String(
        autonomousAdvancing +
        (selfAdvancing ? 1 : 0)
      );
  }
);
runnerGameField.addEventListener(
  'runner-rundown-pressure',
  (event) => {
    window.RUNNER_SELF_RACE_API?.pressureRundown?.(
      event.detail
    );
    directAutonomousRunnerAwayFromBall(event.detail);
  }
);
runnerGameField.addEventListener(
  'runner-rundown-lead-request',
  (event) => {
    event.detail.decision =
      buildRundownLeadDecision(event.detail);
  }
);
runnerGameField.addEventListener(
  'runner-rundown-transfer',
  (event) => {
    transferRearRundownRunner(event.detail);
  }
);
runnerGameField.addEventListener(
  'runner-rundown-end',
  (event) => {
    window.RUNNER_SELF_RACE_API?.endRundown?.(
      event.detail
    );
    settleAutonomousRundownSupport(event.detail);
  }
);
runnerGameStartButtons.forEach((button) => {
  button.addEventListener('click', resetAutonomousRunners);
});
runnerGameSceneButtons.forEach((button) => {
  button.addEventListener('click', () => {
    syncPitchOnlyStart();
    resetAutonomousRunners();
  });
});
runnerGameStealSignButtons.forEach((button) => {
  button.addEventListener('click', () => {
    syncPitchOnlyStart();
    resetAutonomousRunners();
  });
});

syncPitchOnlyStart();
resetAutonomousRunners();
renderRunnerBso();

window.RUNNER_GAME_STATE_API = Object.freeze({
  outs: () => runnerGameOuts,
  playOutcome: () => ({
    inningOver: runnerGameInningOver,
    outs: runnerGameOuts,
    playOuts: runnerGamePlayOuts,
    outRunnerIds: [...runnerGameOutRunnerIds],
    runners: allActiveRunnerSnapshots().map((snapshot) => ({
      id: snapshot.id,
      baseIndex: snapshot.baseIndex,
      startBaseIndex: snapshot.startBaseIndex,
      advance: snapshot.advance,
      moving: snapshot.moving,
      offBase: snapshot.offBase
    }))
  }),
  setOuts: (outs) => {
    runnerGameOuts = Math.max(0, Math.min(2, Number(outs) || 0));
    runnerGamePlayStartOuts = runnerGameOuts;
    runnerGamePlayOuts = 0;
    runnerGameInningOver = false;
    renderRunnerBso();
  }
});
