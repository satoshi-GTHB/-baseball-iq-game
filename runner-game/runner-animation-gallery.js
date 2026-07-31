const galleryField = document.querySelector('#gallery-field');
const galleryPlayArea =
  galleryField.querySelector('.field-play-area') || galleryField;
const galleryReplay = document.querySelector('#gallery-replay');
const galleryStatus = document.querySelector('#gallery-status');
const sceneButtons = [...document.querySelectorAll('[data-scene]')];
const stealSignButtons = [
  ...document.querySelectorAll('[data-steal-sign]')
];
const directionPicker = document.querySelector('#direction-picker');
const directionButtons = [...document.querySelectorAll('[data-direction]')];

const fielders = Object.freeze({
  catcher: galleryField.querySelector('.catcher'),
  pitcher: galleryField.querySelector('.pitcher'),
  first: galleryField.querySelector('.first'),
  second: galleryField.querySelector('.second'),
  short: galleryField.querySelector('.short'),
  third: galleryField.querySelector('.third'),
  left: galleryField.querySelector('.left'),
  center: galleryField.querySelector('.center'),
  right: galleryField.querySelector('.right')
});

const ball = galleryField.querySelector('.gallery-ball');
const boardBat = galleryField.querySelector('.board-bat');
const shadow = galleryField.querySelector('.gallery-shadow');
const catchFlash = galleryField.querySelector('.catch-flash');
const missFlash = galleryField.querySelector('.miss-flash');
const playResultCall =
  galleryField.querySelector('.play-result-call');
const defenseAlignmentLabel =
  galleryField.querySelector('.defense-alignment-label');
const galleryHasRunnerGame =
  galleryField.classList.contains('runner-motion-field');

const BALL_RESULT_COLORS = Object.freeze({
  CAUGHT: '#f28c28',
  FAIR: '#91d43b'
});

const SCENES = Object.freeze({
  fly: { label: '外野フライ', duration: 8600, directions: 'outfield' },
  popup: { label: '内野フライ', duration: 7000, directions: 'infield' },
  liner: { label: 'ライナー', duration: 5000, directions: 'infield' },
  extra: { label: '長打コース', duration: 8400, directions: 'outfield' },
  single: { label: '外野前ヒット', duration: 8400, directions: 'gaps' },
  passed: { label: 'パスボール', duration: 3400, directions: null },
  swing: { label: '空振り', duration: 4600, directions: null },
  take: { label: '見逃し', duration: 4600, directions: null },
  ground: { label: '内野ゴロ', duration: 8000, directions: 'infield' },
  error: { label: 'エラー', duration: 8500, directions: 'infield' },
  bunt: { label: 'バント', duration: 7800, directions: 'bunt' }
});

const DIRECTION_SETS = Object.freeze({
  outfield: [
    ['left-line', 'レフト線'],
    ['left', 'レフト'],
    ['left-center', '左中間'],
    ['center', 'センター'],
    ['right-center', '右中間'],
    ['right', 'ライト'],
    ['right-line', 'ライト線']
  ],
  infield: [
    ['third-line', '三塁線'],
    ['third', '三塁側'],
    ['short', '遊撃側'],
    ['pitcher', '投手方向'],
    ['second', '二塁側'],
    ['first', '一塁側'],
    ['first-line', '一塁線']
  ],
  gaps: [
    ['third-short', 'レフト前'],
    ['middle', 'センター前'],
    ['first-second', 'ライト前']
  ],
  bunt: [
    ['third-ground', '3塁側ゴロ'],
    ['third-popup', '3塁側小フライ'],
    ['pitcher-ground', 'ピッチャー前'],
    ['pitcher-popup', 'ピッチャー前小フライ'],
    ['first-ground', '1塁側ゴロ'],
    ['first-popup', '1塁前小フライ']
  ]
});

const OUTFIELD_PLAYS = Object.freeze({
  'left-line': {
    target: [8, 29], primary: 'left', backup: 'center', far: 'right',
    backupPoint: [11, 20], farPoint: [66, 18], cut: 'short', base: 'second',
    cutPoint: [28, 29]
  },
  left: {
    target: [17, 24], primary: 'left', backup: 'center', far: 'right',
    backupPoint: [22, 15], farPoint: [66, 18], cut: 'short', base: 'second',
    cutPoint: [31, 27]
  },
  'left-center': {
    target: [34, 18], primary: 'center', backup: 'left', far: 'right',
    backupPoint: [27, 12], farPoint: [67, 16], cut: 'short', base: 'second',
    cutPoint: [38, 23]
  },
  center: {
    target: [50, 17], primary: 'center', backup: 'left', far: 'right',
    backupPoint: [40, 11], farPoint: [60, 11], cut: 'short', base: 'second',
    cutPoint: [47, 21]
  },
  'right-center': {
    target: [66, 18], primary: 'center', backup: 'right', far: 'left',
    backupPoint: [73, 12], farPoint: [33, 16], cut: 'second', base: 'short',
    cutPoint: [62, 23]
  },
  right: {
    target: [83, 24], primary: 'right', backup: 'center', far: 'left',
    backupPoint: [78, 15], farPoint: [34, 18], cut: 'second', base: 'short',
    cutPoint: [69, 27]
  },
  'right-line': {
    target: [92, 29], primary: 'right', backup: 'center', far: 'left',
    backupPoint: [89, 20], farPoint: [34, 18], cut: 'second', base: 'short',
    cutPoint: [72, 29]
  }
});

const LONG_HIT_TARGETS = Object.freeze({
  'left-line': [2, 20],
  left: [6, 4],
  'left-center': [30, 2],
  center: [50, 1],
  'right-center': [70, 2],
  right: [94, 4],
  'right-line': [98, 20]
});

const INFIELD_PLAYS = Object.freeze({
  'third-line': {
    target: [20, 53], primary: 'third', cover: 'second',
    support: 'short', supportPoint: [31, 52]
  },
  third: {
    target: [30, 46], primary: 'third', cover: 'second',
    support: 'short', supportPoint: [38, 50]
  },
  short: { target: [40, 40], primary: 'short', cover: 'second' },
  pitcher: {
    target: [50, 57], primary: 'pitcher', cover: 'short',
    support: 'second', supportPoint: [58, 50]
  },
  second: { target: [60, 40], primary: 'second', cover: 'short' },
  first: {
    target: [70, 46], primary: 'first', cover: 'short',
    support: 'second', supportPoint: [62, 50]
  },
  'first-line': {
    target: [80, 53], primary: 'first', cover: 'short',
    support: 'second', supportPoint: [69, 52]
  }
});

const GROUND_OUTFIELD_PLAYS = Object.freeze({
  'third-line': {
    chaser: 'left', chasePoint: [15, 47],
    backup: 'center', backupPoint: [10, 38],
    shift: 'right', shiftPoint: [90, 50]
  },
  third: {
    chaser: 'left', chasePoint: [24, 33],
    backup: 'center', backupPoint: [18, 24],
    shift: 'right', shiftPoint: [90, 50]
  },
  short: {
    chaser: 'left', chasePoint: [38, 24],
    backup: 'center', backupPoint: [34, 16],
    shift: 'right', shiftPoint: [90, 50]
  },
  pitcher: {
    chaser: 'center', chasePoint: [50, 21],
    backup: 'left', backupPoint: [40, 17],
    shift: 'right', shiftPoint: [90, 50]
  },
  second: {
    chaser: 'right', chasePoint: [62, 24],
    backup: 'center', backupPoint: [66, 16],
    shift: 'left', shiftPoint: [34, 19]
  },
  first: {
    chaser: 'right', chasePoint: [76, 33],
    backup: 'center', backupPoint: [82, 24],
    shift: 'left', shiftPoint: [34, 19]
  },
  'first-line': {
    chaser: 'right', chasePoint: [85, 47],
    backup: 'center', backupPoint: [90, 38],
    shift: 'left', shiftPoint: [34, 19]
  }
});

const BUNT_PLAYS = Object.freeze({
  'third-ground': {
    target: [41, 72],
    primary: 'third',
    popup: false
  },
  'third-popup': {
    target: [42, 68],
    primary: 'third',
    popup: true
  },
  'pitcher-ground': {
    target: [50, 70],
    primary: 'pitcher',
    popup: false
  },
  'pitcher-popup': {
    target: [50, 66],
    primary: 'pitcher',
    popup: true
  },
  'first-ground': {
    target: [59, 72],
    primary: 'first',
    popup: false
  },
  'first-popup': {
    target: [58, 68],
    primary: 'first',
    popup: true
  }
});

const OUTFIELD_SINGLE_PLAYS = Object.freeze({
  'third-short': {
    through: [35, 45], target: [24, 27],
    primary: 'left', backup: 'center', far: 'right',
    backupPoint: [18, 17], farPoint: [66, 18],
    cut: 'short', base: 'second', cutPoint: [33, 30],
    infieldChasers: [
      ['third', [35, 51]],
      ['short', [34, 34]]
    ]
  },
  middle: {
    through: [50, 39], target: [50, 18],
    primary: 'center', backup: 'left', far: 'right',
    backupPoint: [40, 12], farPoint: [60, 12],
    cut: 'short', base: 'second', cutPoint: [43, 22],
    infieldChasers: [
      ['short', [47, 31]],
      ['second', [53, 31]]
    ]
  },
  'first-second': {
    through: [65, 45], target: [76, 27],
    primary: 'right', backup: 'center', far: 'left',
    backupPoint: [82, 17], farPoint: [34, 18],
    cut: 'second', base: 'short', cutPoint: [67, 30],
    infieldChasers: [
      ['second', [66, 34]],
      ['first', [65, 51]]
    ]
  }
});

let selectedScene = 'fly';
let selectedDirection = 'center';
let currentDefenseAlignment = 'normal';
let currentThirdBaseRunnerPresent = false;
let stealSignEnabled = stealSignButtons.some(
  (button) =>
    button.dataset.stealSign === 'on' &&
    button.getAttribute('aria-pressed') === 'true'
);
let sceneTimer;
let playStartTimer;
let runnerPhaseTimers = [];
let activeAnimations = [];
let activeRundown = null;
const resolvedSafeTargets = new Set();
let scheduledPitchAt = null;
let pitchWindowActive = false;
let pickoffActive = false;
let caughtPitchReady = false;
let caughtPitchDefenseStarted = false;
let playCompletionSent = false;
const PITCH_DURATION = 1200;
const STEAL_SIGN_DELAY = 500;
const PRE_PITCH_WINDOW_DURATION = 500;
const BATTED_BALL_TIME_SCALE = 2;
const DIAMOND_DIAGONAL_THROW_DURATION = 2500;
const FLY_BALL_SCALE = 1.5;
const RUNDOWN_MINIMUM_ENGAGEMENT_MS = 1000;
const TAG_APPLICATION_DURATION = 200;
const RUNDOWN_BASE_POINTS = Object.freeze({
  1: [75, 60],
  2: [50, 31],
  3: [25, 60],
  4: [50, 89]
});
const RUNDOWN_BACKUP_POINTS = Object.freeze({
  1: Object.freeze({
    trail: [80, 65],
    lead: [50, 25],
    field: Object.freeze([
      ['right', [84, 53]],
      ['center', [50, 19]]
    ])
  }),
  2: Object.freeze({
    trail: [54, 26],
    lead: [20, 56],
    field: Object.freeze([
      ['center', [45, 20]],
      ['left', [15, 50]]
    ])
  }),
  3: Object.freeze({
    trail: [20, 56],
    lead: [54, 94],
    field: Object.freeze([
      ['left', [15, 50]],
      ['first', [59, 81]]
    ])
  })
});

function fieldDistance(from, to) {
  const width = galleryPlayArea.clientWidth || 100;
  const height = galleryPlayArea.clientHeight || 100;
  return Math.hypot(
    (to[0] - from[0]) * width / 100,
    (to[1] - from[1]) * height / 100
  );
}

function throwDuration(from, to) {
  const diagonalDistance = fieldDistance([50, 88], [50, 31]);
  if (!diagonalDistance) return DIAMOND_DIAGONAL_THROW_DURATION;
  return Math.round(
    DIAMOND_DIAGONAL_THROW_DURATION *
    fieldDistance(from, to) /
    diagonalDistance
  );
}

function fielderMoveDuration(from, to) {
  const standardSegment =
    window.RUNNER_MOVEMENT_RULES?.SEGMENTS?.[1];
  const standardDistance = fieldDistance(
    RUNDOWN_BASE_POINTS[1],
    RUNDOWN_BASE_POINTS[2]
  );
  if (!standardSegment || !standardDistance) return 1;
  return Math.max(
    1,
    Math.round(
      standardSegment.duration *
      fieldDistance(from, to) /
      standardDistance
    )
  );
}

function pct(value) {
  return `${value}%`;
}

function move(element, from, to, _duration, delay = 0, _easing = 'linear') {
  const duration = fielderMoveDuration(from, to);
  const animation = element.animate(
    [
      { left: pct(from[0]), top: pct(from[1]) },
      { left: pct(to[0]), top: pct(to[1]) }
    ],
    { duration, delay, easing: 'linear', fill: 'forwards' }
  );
  activeAnimations.push(animation);
  return animation;
}

function animate(element, frames, options) {
  const animation = element.animate(frames, { ...options, fill: 'forwards' });
  activeAnimations.push(animation);
  return animation;
}

function markBallResult(color, delay) {
  animate(
    ball,
    [
      { backgroundColor: color },
      { backgroundColor: color }
    ],
    { duration: 1, delay, easing: 'linear' }
  );
}

function resetAnimation() {
  clearTimeout(sceneTimer);
  clearTimeout(playStartTimer);
  runnerPhaseTimers.forEach((timer) => clearTimeout(timer));
  runnerPhaseTimers = [];
  activeAnimations.forEach((animation) => animation.cancel());
  activeAnimations = [];
  activeRundown = null;
  resolvedSafeTargets.clear();
  scheduledPitchAt = null;
  pitchWindowActive = false;
  pickoffActive = false;
  caughtPitchReady = false;
  caughtPitchDefenseStarted = false;
  delete galleryField.dataset.rundownState;
  delete galleryField.dataset.rundownThrows;
  delete galleryField.dataset.rundownRunner;
  delete galleryField.dataset.rundownSegment;
  delete galleryField.dataset.rundownReceiver;
  delete galleryField.dataset.rundownReceiveProgress;
  delete galleryField.dataset.rundownTrailGate;
  delete galleryField.dataset.rundownLeadGate;
  delete galleryField.dataset.rundownEngagementTicks;
  delete galleryField.dataset.lastThrowRoute;
  delete galleryField.dataset.pickoffBase;
  delete galleryField.dataset.pitchWindow;
  Object.values(fielders).forEach((fielder) => {
    fielder.classList.remove('is-receiving');
  });
  currentDefenseAlignment = 'normal';
  currentThirdBaseRunnerPresent = false;
  Object.entries(fielders).forEach(([name, fielder]) => {
    const point = regularPositionOf(name);
    fielder.style.left = pct(point[0]);
    fielder.style.top = pct(point[1]);
  });
  galleryField.classList.remove('defense-infield-in');
  if (defenseAlignmentLabel) {
    defenseAlignmentLabel.hidden = true;
    defenseAlignmentLabel.classList.remove('is-infield-in');
  }
  galleryField.classList.remove('scene-running');
  galleryReplay.disabled = false;
  if (playResultCall) {
    playResultCall.textContent = '';
    playResultCall.className = 'play-result-call';
  }
}

function currentDirectionLabel() {
  if (!SCENES[selectedScene].directions) return '';
  const options = DIRECTION_SETS[SCENES[selectedScene].directions];
  return options.find(([value]) => value === selectedDirection)?.[1] || '';
}

function displayLabel() {
  const direction = currentDirectionLabel();
  const playLabel = direction
    ? `${SCENES[selectedScene].label}（${direction}）`
    : SCENES[selectedScene].label;
  return stealSignEnabled
    ? `盗塁サイン＋${playLabel}`
    : playLabel;
}

function renderDirectionPicker() {
  const setName = SCENES[selectedScene].directions;
  directionPicker.hidden = !setName;
  if (!setName) return;

  const options = DIRECTION_SETS[setName];
  if (!options.some(([value]) => value === selectedDirection)) {
    selectedDirection =
      setName === 'outfield'
        ? 'center'
        : setName === 'infield'
          ? 'pitcher'
          : setName === 'bunt'
            ? 'pitcher-ground'
          : options[Math.floor(options.length / 2)][0];
  }
  directionPicker.classList.toggle('three-options', options.length === 3);
  directionPicker.classList.toggle('six-options', options.length === 6);

  directionButtons.forEach((button, index) => {
    const option = options[index];
    button.hidden = !option;
    if (!option) return;
    button.dataset.direction = option[0];
    button.textContent = option[1];
    button.setAttribute('aria-pressed', String(option[0] === selectedDirection));
  });
}

function updateLabels() {
  const label = displayLabel();
  galleryField.setAttribute(
    'aria-label',
    selectedScene === 'fly'
      ? `${currentDirectionLabel()}方向のフライ。捕球、外野カバー、カット、2塁カバー、返球の連係`
      : `${label}のアニメーション`
  );
  galleryReplay.textContent = `▶ ${label}を再生`;
  galleryStatus.textContent = `${label}を選択中です。`;
}

function selectScene(sceneName) {
  if (!SCENES[sceneName]) return;
  resetAnimation();
  galleryField.classList.remove(`scene-${selectedScene}`);
  selectedScene = sceneName;
  galleryField.classList.add(`scene-${selectedScene}`);

  sceneButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.scene === selectedScene));
  });
  renderDirectionPicker();
  updateLabels();
}

function selectStealSign(enabled) {
  resetAnimation();
  stealSignEnabled = enabled;
  stealSignButtons.forEach((button) => {
    button.setAttribute(
      'aria-pressed',
      String((button.dataset.stealSign === 'on') === enabled)
    );
  });
  updateLabels();
}

function selectDirection(directionName) {
  const setName = SCENES[selectedScene].directions;
  if (!setName || !DIRECTION_SETS[setName].some(([value]) => value === directionName)) return;

  resetAnimation();
  galleryField.classList.remove(`direction-${selectedDirection}`);
  selectedDirection = directionName;
  galleryField.classList.add(`direction-${selectedDirection}`);
  renderDirectionPicker();
  updateLabels();
}

function playCatchFlash(point, delay) {
  catchFlash.style.left = pct(point[0]);
  catchFlash.style.top = pct(point[1]);
  animate(
    catchFlash,
    [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(.3)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.2)', offset: .45 },
      { opacity: 0, transform: 'translate(-50%, -50%) scale(1.5)' }
    ],
    { duration: 500, delay, easing: 'ease-out' }
  );
}

function scheduleAction(delay, callback) {
  const timer = setTimeout(callback, delay);
  runnerPhaseTimers.push(timer);
  return timer;
}

function dispatchPlayComplete(reason = 'settled') {
  if (playCompletionSent) return;
  playCompletionSent = true;
  galleryField.dispatchEvent(new CustomEvent(
    'runner-play-complete',
    {
      detail: {
        reason,
        scene: selectedScene,
        direction: selectedDirection
      }
    }
  ));
}

function requestRunnerDefenseDecision(possessionPoint = null) {
  const detail = {
    decision: null,
    possessionPoint,
    defenseAlignment: currentDefenseAlignment,
    scene: selectedScene,
    direction: selectedDirection,
    resolvedSafeTargets: [...resolvedSafeTargets]
  };
  galleryField.dispatchEvent(new CustomEvent(
    'runner-defense-decision',
    { detail }
  ));
  return detail.decision;
}

function resultCallPoint(baseIndex = null, contactPoint = null) {
  if (
    Array.isArray(contactPoint) &&
    contactPoint.length >= 2
  ) {
    return [
      Math.max(13, Math.min(87, Number(contactPoint[0]))),
      Math.max(10, Math.min(88, Number(contactPoint[1]) - 6))
    ];
  }
  return {
    1: [79, 55],
    2: [50, 24],
    3: [21, 55],
    4: [50, 82]
  }[Number(baseIndex)] || [50, 48];
}

function showRunnerCall(
  out,
  text = null,
  baseIndex = null,
  contactPoint = null
) {
  if (!playResultCall) return;
  const point = resultCallPoint(baseIndex, contactPoint);
  playResultCall.textContent =
    text || (out ? 'アウト！' : 'セーフ!!');
  playResultCall.style.left = pct(point[0]);
  playResultCall.style.top = pct(point[1]);
  playResultCall.classList.toggle(
    'is-base-call',
    Number.isInteger(Number(baseIndex)) ||
      Array.isArray(contactPoint)
  );
  playResultCall.classList.toggle('is-out', out);
  playResultCall.classList.toggle('is-safe', !out);
  animate(
    playResultCall,
    [
      {
        opacity: 0,
        transform: 'translate(-50%, -50%) scale(.5)'
      },
      {
        opacity: 1,
        transform: 'translate(-50%, -50%) scale(1.15)',
        offset: .35
      },
      {
        opacity: 1,
        transform: 'translate(-50%, -50%) scale(1)'
      }
    ],
    { duration: 900, easing: 'ease-out' }
  );
}

function dispatchRunnerDefenseResult(decision, out) {
  const detail = {
    ...decision,
    out
  };
  if (
    !out &&
    detail.runnerId &&
    Number.isInteger(Number(detail.targetBaseIndex))
  ) {
    resolvedSafeTargets.add(
      `${detail.runnerId}:${detail.targetBaseIndex}`
    );
  }
  galleryField.dispatchEvent(new CustomEvent(
    'runner-defense-result',
    {
      detail
    }
  ));
  return detail;
}

function showDefenseFollowup(outcome) {
  if (outcome?.inningOver) {
    scheduleAction(950, () => {
      showRunnerCall(true, 'チェンジ!!');
    });
    return;
  }
  if (Number(outcome?.playOuts) >= 2) {
    scheduleAction(750, () => {
      showRunnerCall(true, 'ゲッツー!!');
    });
  }
}

function finishPickoffPlay() {
  if (!pickoffActive) return;
  pickoffActive = false;
  galleryField.dataset.pitchWindow = 'closed';
  galleryReplay.disabled = false;
  galleryReplay.textContent = '↻ 牽制プレーをもう一度見る';
  galleryStatus.textContent = '牽制プレーが終わりました。';
  dispatchPlayComplete('pickoff-settled');
}

function recordAutomaticOut(reason) {
  showRunnerCall(true);
  const outcome = dispatchRunnerDefenseResult(
    {
      automatic: true,
      reason
    },
    true
  );
  showDefenseFollowup(outcome);
  return outcome;
}

function continueDefenseAfterPlay(
  possessionPoint,
  outcome,
  fallbackTarget,
  retryCount = 0
) {
  if (outcome?.inningOver) {
    showDefenseFollowup(outcome);
    finishPickoffPlay();
    return;
  }
  scheduleAction(450, () => {
    const nextDecision = requestRunnerDefenseDecision(
      possessionPoint
    );
    if (
      !nextDecision ||
      nextDecision.inningOver
    ) return;
    if (nextDecision.allStopped) {
      showDefenseFollowup(outcome);
      finishPickoffPlay();
      return;
    }
    const nextTargetKey =
      nextDecision.runnerId &&
      Number.isInteger(Number(nextDecision.targetBaseIndex))
        ? `${nextDecision.runnerId}:${nextDecision.targetBaseIndex}`
        : null;
    if (
      nextTargetKey &&
      resolvedSafeTargets.has(nextTargetKey)
    ) {
      if (retryCount >= 4) {
        showDefenseFollowup(outcome);
        finishPickoffPlay();
        return;
      }
      continueDefenseAfterPlay(
        possessionPoint,
        outcome,
        fallbackTarget,
        retryCount + 1
      );
      return;
    }
    throwAtRunner(
      possessionPoint,
      nextDecision,
      fallbackTarget
    );
  });
}

function shouldThrowHomeDirect(decision) {
  return Boolean(
    decision &&
    decision.allStopped === false &&
    Number(decision.targetBaseIndex) === 4
  );
}

function throwHomeDirect(from, decision) {
  galleryField.dataset.lastThrowRoute = 'direct-home';
  return throwAtRunner(
    from,
    decision,
    [50, 89]
  );
}

function currentFielderPoint(fielder) {
  const fieldRect = galleryPlayArea.getBoundingClientRect();
  const fielderRect = fielder.getBoundingClientRect();
  if (!fieldRect.width || !fieldRect.height) {
    return [50, 50];
  }
  return [
    (
      fielderRect.left +
      fielderRect.width / 2 -
      fieldRect.left
    ) / fieldRect.width * 100,
    (
      fielderRect.top +
      fielderRect.height / 2 -
      fieldRect.top
    ) / fieldRect.height * 100
  ];
}

function baseIndexForTarget(target) {
  const basePoints = {
    1: [75, 60],
    2: [50, 31],
    3: [25, 60],
    4: [50, 89]
  };
  return Number(
    Object.entries(basePoints).sort(
      ([, firstPoint], [, secondPoint]) =>
        fieldDistance(firstPoint, target) -
        fieldDistance(secondPoint, target)
    )[0][0]
  );
}

function moveReceiverToBase(
  from,
  target,
  throwTime,
  requestedBaseIndex
) {
  const baseIndex =
    requestedBaseIndex || baseIndexForTarget(target);
  const receiverPoint = {
    1: [70.5, 54.8],
    3: [29.5, 54.8],
    // ホーム送球は、捕手がホームベースの前・二塁側で受ける。
    4: [50, 86]
  }[baseIndex] || target;
  const candidateNames = {
    1: ['first', 'second', 'pitcher'],
    2: ['short', 'second'],
    3: ['third', 'short'],
    4: ['catcher', 'pitcher']
  }[baseIndex] || [];
  const allCandidates = candidateNames
    .map((name) => ({
      name,
      fielder: fielders[name],
      point: currentFielderPoint(fielders[name])
    }));
  const sourceCandidate = [...allCandidates]
    .sort(
      (first, second) =>
        fieldDistance(first.point, from) -
        fieldDistance(second.point, from)
    )
    .find(
      ({ point }) => fieldDistance(point, from) <= 8
    );
  const onTimeReceivers = allCandidates
    .filter(
      ({ name }) => name !== sourceCandidate?.name
    )
    .map((candidate) => ({
      ...candidate,
      arrivalTime: fielderMoveDuration(
        candidate.point,
        receiverPoint
      )
    }))
    .filter(
      ({ arrivalTime }) => arrivalTime <= throwTime
    )
    .sort(
      (first, second) =>
        first.arrivalTime - second.arrivalTime
    );
  if (sourceCandidate && !onTimeReceivers.length) {
    const carryDuration = fielderMoveDuration(
      sourceCandidate.point,
      receiverPoint
    );
    if (
      fieldDistance(
        sourceCandidate.point,
        receiverPoint
      ) > 2
    ) {
      move(
        sourceCandidate.fielder,
        sourceCandidate.point,
        receiverPoint,
        carryDuration,
        0,
        'linear'
      );
    }
    sourceCandidate.fielder.classList.add('is-receiving');
    return {
      name: sourceCandidate.name,
      point: receiverPoint,
      carriesBall: true,
      duration: carryDuration
    };
  }
  const availableCandidates = allCandidates.filter(
      ({ point }) =>
        fieldDistance(point, from) > 14 ||
        fieldDistance(from, target) < 14
    );
  const candidates = (
    onTimeReceivers.length
      ? onTimeReceivers
      : availableCandidates.length
        ? availableCandidates
        : allCandidates
  )
    .sort(
      (first, second) =>
        fieldDistance(first.point, receiverPoint) -
        fieldDistance(second.point, receiverPoint)
    );
  const receiver = candidates[0];
  if (!receiver) return null;

  const receiverTime = Math.max(
    1,
    Math.min(
      throwTime,
      Number(receiver.arrivalTime) || throwTime - 100
    )
  );
  if (fieldDistance(receiver.point, receiverPoint) > 2) {
    move(
      receiver.fielder,
      receiver.point,
      receiverPoint,
      receiverTime,
      0,
      'linear'
    );
  }
  receiver.fielder.classList.add('is-receiving');
  return {
    name: receiver.name,
    point: receiverPoint,
    carriesBall: false,
    duration: throwTime
  };
}

function rundownPoint(segmentIndex, progress) {
  const trail = RUNDOWN_BASE_POINTS[segmentIndex];
  const lead = RUNDOWN_BASE_POINTS[segmentIndex + 1];
  const ratio =
    window.RUNNER_MOVEMENT_RULES.clampProgress(progress);
  return [
    trail[0] + (lead[0] - trail[0]) * ratio,
    trail[1] + (lead[1] - trail[1]) * ratio
  ];
}

function rundownFielderDuration(
  segmentIndex,
  from,
  to
) {
  return fielderMoveDuration(from, to);
}

function rundownQueuePoint(
  segmentIndex,
  side,
  queueIndex
) {
  if (queueIndex === 0) {
    return side === 'trail'
      ? RUNDOWN_BASE_POINTS[segmentIndex]
      : RUNDOWN_BASE_POINTS[segmentIndex + 1];
  }
  const basePoint = side === 'trail'
    ? RUNDOWN_BASE_POINTS[segmentIndex]
    : RUNDOWN_BASE_POINTS[segmentIndex + 1];
  const firstBackup =
    RUNDOWN_BACKUP_POINTS[segmentIndex][side];
  const distanceScale = 1 + .72 * (queueIndex - 1);
  return [
    basePoint[0] +
      (firstBackup[0] - basePoint[0]) * distanceScale,
    basePoint[1] +
      (firstBackup[1] - basePoint[1]) * distanceScale
  ];
}

function moveRundownFielder(
  rundown,
  name,
  to,
  delay = 0
) {
  const fielder = fielders[name];
  if (!fielder) return 0;
  const from = currentFielderPoint(fielder);
  const duration = rundownFielderDuration(
    rundown.segmentIndex,
    from,
    to
  );
  if (fieldDistance(from, to) > 1) {
    move(
      fielder,
      from,
      to,
      duration,
      delay,
      'linear'
    );
  }
  return duration;
}

function arrangeRundownQueue(
  rundown,
  side,
  delay = 0
) {
  rundown.lines[side].forEach((name, index) => {
    moveRundownFielder(
      rundown,
      name,
      rundownQueuePoint(
        rundown.segmentIndex,
        side,
        index
      ),
      delay
    );
  });
}

function dispatchRundownEvent(name, detail) {
  galleryField.dispatchEvent(new CustomEvent(name, {
    detail
  }));
}

function requestRundownSnapshot(runnerId) {
  const detail = {
    runnerId,
    snapshot: null
  };
  dispatchRundownEvent(
    'runner-rundown-snapshot-request',
    detail
  );
  return detail.snapshot;
}

function requestRundownLeadDecision(
  rundown,
  possessionPoint
) {
  const detail = {
    decision: null,
    runnerId: rundown.decision.runnerId,
    segmentIndex: rundown.segmentIndex,
    possessionPoint
  };
  dispatchRundownEvent(
    'runner-rundown-lead-request',
    detail
  );
  return detail.decision;
}

function arrangeRundownLine(
  rundown,
  side,
  preferredReceiver = null
) {
  const names = [...rundown.lines[side]];
  const basePoint = side === 'trail'
    ? RUNDOWN_BASE_POINTS[rundown.segmentIndex]
    : RUNDOWN_BASE_POINTS[rundown.segmentIndex + 1];
  const closestName = names
    .filter((name) => fielders[name])
    .sort(
      (firstName, secondName) =>
        fieldDistance(
          currentFielderPoint(fielders[firstName]),
          basePoint
        ) -
        fieldDistance(
          currentFielderPoint(fielders[secondName]),
          basePoint
        )
    )[0];
  const gateFielder = preferredReceiver || closestName;
  const receiverIndex = names.indexOf(gateFielder);
  if (receiverIndex > 0) {
    [
      names[0],
      names[receiverIndex]
    ] = [
      names[receiverIndex],
      names[0]
    ];
  }
  rundown.lines[side] = names;
  arrangeRundownQueue(rundown, side);
}

function moveRundownSupportingFielders(rundown) {
  RUNDOWN_BACKUP_POINTS[
    rundown.segmentIndex
  ].field.forEach(([name, target]) => {
    const fielder = fielders[name];
    if (!fielder) return;
    moveRundownFielder(rundown, name, target);
  });
}

function scheduleRundownTick(delay = 240) {
  if (!activeRundown?.active) return;
  scheduleAction(delay, rundownTick);
}

function resolveRundownTagAfterGrace(delay = 0) {
  const rundown = activeRundown;
  if (!rundown?.active) return;
  scheduleAction(
    delay + TAG_APPLICATION_DURATION,
    () => {
      if (!rundown.active || activeRundown !== rundown) {
        return;
      }
      const runnerSnapshot =
        requestRundownSnapshot(
          rundown.decision.runnerId
        );
      const reachedBase = Boolean(
        runnerSnapshot &&
        !runnerSnapshot.moving &&
        !runnerSnapshot.offBase &&
        Number.isInteger(Number(runnerSnapshot.baseIndex))
      );
      finishRundown(!reachedBase);
    }
  );
}

function finishRundown(out) {
  const rundown = activeRundown;
  if (!rundown?.active) return;
  rundown.active = false;
  galleryField.dataset.rundownState =
    out ? 'out' : 'safe';
  const runnerSnapshot =
    requestRundownSnapshot(rundown.decision.runnerId);
  const holder = fielders[rundown.holderName];
  const holderFrom = holder
    ? currentFielderPoint(holder)
    : rundownPoint(
        rundown.segmentIndex,
        rundown.holderProgress
      );
  const settleBaseIndex = rundown.ballSide === 'lead'
    ? rundown.segmentIndex + 1
    : rundown.segmentIndex;
  const settlePoint =
    RUNDOWN_BASE_POINTS[settleBaseIndex];
  const settleDuration = rundownFielderDuration(
    rundown.segmentIndex,
    holderFrom,
    settlePoint
  );

  showRunnerCall(
    out,
    null,
    out ? null : runnerSnapshot?.baseIndex,
    out ? runnerSnapshot?.point : null
  );
  const rundownEndDetail = {
    runnerId: rundown.decision.runnerId,
    segmentIndex: rundown.segmentIndex,
    out,
    safeBaseIndex: out
      ? null
      : runnerSnapshot?.baseIndex
  };
  dispatchRundownEvent(
    'runner-rundown-end',
    rundownEndDetail
  );
  const outcome = dispatchRunnerDefenseResult(
    {
      ...rundown.decision,
      rundown: true
    },
    out
  );
  showDefenseFollowup(outcome);

  if (holder) {
    move(
      holder,
      holderFrom,
      settlePoint,
      settleDuration,
      0,
      'linear'
    );
  }
  animate(
    ball,
    [
      {
        left: pct(holderFrom[0]),
        top: pct(holderFrom[1]),
        opacity: 1,
        transform: 'scale(.72)'
      },
      {
        left: pct(settlePoint[0]),
        top: pct(settlePoint[1]),
        opacity: 1,
        transform: 'scale(.72)'
      }
    ],
    { duration: settleDuration, easing: 'linear' }
  );
  const supportSettleMs = Math.max(
    0,
    Number(rundownEndDetail.supportSettleMs) || 0
  );
  scheduleAction(
    Math.max(
      settleDuration + 10,
      supportSettleMs + 40
    ),
    () => {
      if (activeRundown === rundown) {
        activeRundown = null;
      }
      continueDefenseAfterPlay(
        settlePoint,
        outcome,
        settlePoint
      );
    }
  );
}

function finishRundownAtReachedBase(rundown, snapshot) {
  const runnerBaseIndex = Number(snapshot?.baseIndex);
  const ballBaseIndex = rundown.ballSide === 'lead'
    ? rundown.segmentIndex + 1
    : rundown.segmentIndex;
  const holderAtBase = rundown.ballSide === 'lead'
    ? Number(rundown.holderProgress) >= .999
    : Number(rundown.holderProgress) <= .001;
  const ballLeadMs = Math.max(
    0,
    performance.now() - Number(
      rundown.ballSideReadyAt || performance.now()
    )
  );
  const out = holderAtBase && (
    window.RUNNER_MOVEMENT_RULES?.isRundownBaseOut?.(
      runnerBaseIndex,
      ballBaseIndex,
      ballLeadMs,
      TAG_APPLICATION_DURATION
    ) ?? (
      runnerBaseIndex === ballBaseIndex &&
      ballLeadMs > TAG_APPLICATION_DURATION
    )
  );
  galleryField.dataset.rundownBaseBallLeadMs =
    String(Math.round(ballLeadMs));
  galleryField.dataset.rundownBaseRunner =
    String(runnerBaseIndex);
  galleryField.dataset.rundownBaseBall =
    String(ballBaseIndex);
  galleryField.dataset.rundownBaseOutcome =
    out ? 'out' : 'safe';
  finishRundown(out);
}

function transferRundownToLeadRunner(
  rundown,
  leadDecision,
  possessionPoint
) {
  if (!rundown?.active || !leadDecision) return;
  rundown.active = false;
  galleryField.dataset.rundownState = 'transferred';
  dispatchRundownEvent('runner-rundown-transfer', {
    runnerId: rundown.decision.runnerId,
    segmentIndex: rundown.segmentIndex,
    targetBaseIndex: rundown.segmentIndex + 1,
    leadRunnerId: leadDecision.runnerId
  });
  if (activeRundown === rundown) {
    activeRundown = null;
  }
  throwAtRunner(
    possessionPoint,
    leadDecision,
    leadDecision.targetPoint
  );
}

function moveRundownThrowerForward(
  rundown,
  name,
  from,
  destinationSide,
  queueIndex,
  delay = 0
) {
  const fielder = fielders[name];
  if (!fielder) return;
  const to = rundownQueuePoint(
    rundown.segmentIndex,
    destinationSide,
    queueIndex
  );
  const deltaX = to[0] - from[0];
  const deltaY = to[1] - from[1];
  const length = Math.hypot(deltaX, deltaY) || 1;
  const curveDirection =
    rundown.segmentIndex === 2 ? -1 : 1;
  const passPoint = [
    (from[0] + to[0]) / 2 +
      (-deltaY / length) * 3.2 * curveDirection,
    (from[1] + to[1]) / 2 +
      (deltaX / length) * 3.2 * curveDirection
  ];
  const duration = rundownFielderDuration(
    rundown.segmentIndex,
    from,
    to
  );
  animate(
    fielder,
    [
      { left: pct(from[0]), top: pct(from[1]) },
      {
        left: pct(passPoint[0]),
        top: pct(passPoint[1]),
        offset: .5
      },
      { left: pct(to[0]), top: pct(to[1]) }
    ],
    { duration, delay, easing: 'linear' }
  );
}

function planRundownReception(
  rundown,
  destinationSide,
  runnerProgress,
  ballFrom,
  receiverFrom
) {
  const segmentDuration =
    window.RUNNER_MOVEMENT_RULES
      .SEGMENTS[rundown.segmentIndex].duration;
  const runnerDirection =
    destinationSide === 'trail' ? -1 : 1;
  const timeToBase =
    (
      destinationSide === 'trail'
        ? runnerProgress
        : 1 - runnerProgress
    ) * segmentDuration;

  for (
    let catchDuration = 40;
    catchDuration <= timeToBase;
    catchDuration += 20
  ) {
    const progress =
      window.RUNNER_MOVEMENT_RULES.clampProgress(
        runnerProgress +
        runnerDirection *
        catchDuration /
        segmentDuration
      );
    const point = rundownPoint(
      rundown.segmentIndex,
      progress
    );
    const receiverDuration = rundownFielderDuration(
      rundown.segmentIndex,
      receiverFrom,
      point
    );
    const ballDuration = Math.max(
      220,
      Math.min(520, throwDuration(ballFrom, point))
    );
    if (
      receiverDuration <= catchDuration &&
      ballDuration <= catchDuration
    ) {
      return {
        ballDelay: catchDuration - ballDuration,
        ballDuration,
        catchDuration,
        intercepted: true,
        point,
        progress,
        receiverDelay:
          catchDuration - receiverDuration,
        receiverDuration
      };
    }
  }

  const progress =
    destinationSide === 'trail' ? .06 : .94;
  const point = rundownPoint(
    rundown.segmentIndex,
    progress
  );
  const receiverDuration = rundownFielderDuration(
    rundown.segmentIndex,
    receiverFrom,
    point
  );
  const ballDuration = Math.max(
    220,
    Math.min(520, throwDuration(ballFrom, point))
  );
  const catchDuration = Math.max(
    receiverDuration,
    ballDuration
  );
  return {
    ballDelay: catchDuration - ballDuration,
    ballDuration,
    catchDuration,
    intercepted: false,
    point,
    progress,
    receiverDelay: catchDuration - receiverDuration,
    receiverDuration
  };
}

function throwAcrossRundown(
  destinationSide,
  runnerProgress
) {
  const rundown = activeRundown;
  if (
    !rundown?.active ||
    rundown.throwing ||
    destinationSide === rundown.ballSide
  ) return;
  rundown.throwing = true;
  galleryField.dataset.rundownThrows = String(
    Number(galleryField.dataset.rundownThrows || 0) + 1
  );
  const originSide = rundown.ballSide;
  const liveRunnerSnapshot = requestRundownSnapshot(
    rundown.decision.runnerId
  );
  if (
    liveRunnerSnapshot &&
    (liveRunnerSnapshot.moving ||
      liveRunnerSnapshot.offBase)
  ) {
    runnerProgress =
      window.RUNNER_MOVEMENT_RULES.clampProgress(
        Number(liveRunnerSnapshot.advance) -
        rundown.segmentIndex
      );
  }
  const oldHolderName = rundown.holderName;
  const oldHolder = fielders[oldHolderName];
  const from = oldHolder
    ? currentFielderPoint(oldHolder)
    : rundownPoint(
        rundown.segmentIndex,
        rundown.holderProgress
      );
  let destinationLine = rundown.lines[destinationSide];
  const receiverCandidates = destinationLine
    .map((name, index) => {
      const fielder = fielders[name];
      const receiverFrom = fielder
        ? currentFielderPoint(fielder)
        : rundownQueuePoint(
            rundown.segmentIndex,
            destinationSide,
            index
          );
      return {
        fielder,
        index,
        name,
        receiverFrom,
        reception: planRundownReception(
          rundown,
          destinationSide,
          runnerProgress,
          from,
          receiverFrom
        )
      };
    })
    .sort((a, b) => {
      if (
        a.reception.intercepted !==
        b.reception.intercepted
      ) {
        return a.reception.intercepted ? -1 : 1;
      }
      return (
        a.reception.catchDuration -
        b.reception.catchDuration
      );
    });
  const selectedReceiver = receiverCandidates[0];
  const nextHolderName = selectedReceiver.name;
  const nextHolder = selectedReceiver.fielder;
  const receiverFrom = selectedReceiver.receiverFrom;
  const reception = selectedReceiver.reception;
  if (selectedReceiver.index > 0) {
    destinationLine = destinationLine.slice();
    destinationLine.splice(selectedReceiver.index, 1);
    destinationLine.unshift(nextHolderName);
    rundown.lines[destinationSide] = destinationLine;
  }
  galleryField.dataset.rundownReceiver =
    nextHolderName;
  galleryField.dataset.rundownReceiveProgress =
    reception.progress.toFixed(3);
  const destinationProgress = reception.progress;
  const destinationPoint = reception.point;
  const duration = reception.ballDuration;
  const receiverMoveDuration =
    reception.receiverDuration;
  const receiverDelay = reception.receiverDelay;
  const ballDelay = reception.ballDelay;

  if (nextHolder) {
    if (fieldDistance(receiverFrom, destinationPoint) > 1) {
      move(
        nextHolder,
        receiverFrom,
        destinationPoint,
        receiverMoveDuration,
        receiverDelay,
        'linear'
      );
    }
    nextHolder.classList.add('is-receiving');
  }
  animate(
    ball,
    [
      {
        left: pct(from[0]),
        top: pct(from[1]),
        opacity: 1,
        transform: 'scale(.72)'
      },
      {
        left: pct(destinationPoint[0]),
        top: pct(destinationPoint[1]),
        opacity: 1,
        transform: 'scale(.72)'
      }
    ],
    {
      duration,
      delay: ballDelay,
      easing: 'linear'
    }
  );
  const catchDuration = reception.catchDuration;
  playCatchFlash(
    destinationPoint,
    Math.max(0, catchDuration - 90)
  );

  const rotation =
    window.RUNNER_MOVEMENT_RULES.rotateRundownLines(
      rundown.lines,
      originSide,
      destinationSide
    );
  rundown.lines = rotation.lines;
  arrangeRundownQueue(
    rundown,
    originSide,
    ballDelay
  );
  rundown.lines[destinationSide]
    .slice(0, -1)
    .forEach((name, index) => {
      if (name === nextHolderName) return;
      moveRundownFielder(
        rundown,
        name,
        rundownQueuePoint(
          rundown.segmentIndex,
          destinationSide,
          index + 1
        )
      );
    });
  moveRundownThrowerForward(
    rundown,
    oldHolderName,
    from,
    destinationSide,
    rundown.lines[destinationSide].length - 1,
    ballDelay
  );

  scheduleAction(catchDuration, () => {
    if (!rundown.active || activeRundown !== rundown) return;
    fielders[oldHolderName]?.classList.remove(
      'is-receiving'
    );
    rundown.ballSide = destinationSide;
    rundown.holderName = nextHolderName;
    rundown.holderProgress = destinationProgress;
    rundown.ballSideReadyAt =
      (
        destinationSide === 'lead' &&
        destinationProgress >= .999
      ) ||
      (
        destinationSide === 'trail' &&
        destinationProgress <= .001
      )
        ? performance.now()
        : null;
    rundown.throwing = false;
    const caughtRunnerSnapshot =
      requestRundownSnapshot(
        rundown.decision.runnerId
      );
    if (
      caughtRunnerSnapshot &&
      !caughtRunnerSnapshot.moving &&
      !caughtRunnerSnapshot.offBase
    ) {
      finishRundownAtReachedBase(
        rundown,
        caughtRunnerSnapshot
      );
      return;
    }
    const caughtRunnerProgress =
      caughtRunnerSnapshot
        ? window.RUNNER_MOVEMENT_RULES.clampProgress(
            Number(caughtRunnerSnapshot.advance) -
            rundown.segmentIndex
          )
        : null;
    if (
      Number.isFinite(caughtRunnerProgress) &&
      Math.abs(
        destinationProgress - caughtRunnerProgress
      ) <= .045
    ) {
      resolveRundownTagAfterGrace();
      return;
    }
    dispatchRundownEvent('runner-rundown-pressure', {
      runnerId: rundown.decision.runnerId,
      segmentIndex: rundown.segmentIndex,
      ballSide: rundown.ballSide
    });
    scheduleRundownTick(120);
  });
}

function rundownTick() {
  const rundown = activeRundown;
  if (!rundown?.active || rundown.throwing) return;
  const snapshot = requestRundownSnapshot(
    rundown.decision.runnerId
  );
  if (!snapshot) {
    finishRundown(true);
    return;
  }
  if (!snapshot.moving && !snapshot.offBase) {
    finishRundownAtReachedBase(rundown, snapshot);
    return;
  }
  const possessionPoint = fielders[rundown.holderName]
    ? currentFielderPoint(fielders[rundown.holderName])
    : rundownPoint(
        rundown.segmentIndex,
        rundown.holderProgress
      );
  const rundownElapsed =
    performance.now() - rundown.startedAt;
  const minimumEngagementMs =
    galleryField.dataset.autonomousDecoySteal === 'true'
      ? 3000
      : RUNDOWN_MINIMUM_ENGAGEMENT_MS;
  const leadDecision =
    rundownElapsed >= minimumEngagementMs &&
    rundown.engagementTicks >= 3
      ? requestRundownLeadDecision(
          rundown,
          possessionPoint
        )
      : null;
  if (leadDecision) {
    transferRundownToLeadRunner(
      rundown,
      leadDecision,
      possessionPoint
    );
    return;
  }
  rundown.engagementTicks += 1;
  galleryField.dataset.rundownEngagementTicks =
    String(rundown.engagementTicks);
  const runnerProgress =
    window.RUNNER_MOVEMENT_RULES.clampProgress(
      Number(snapshot.advance) - rundown.segmentIndex
    );
  dispatchRundownEvent('runner-rundown-pressure', {
    runnerId: rundown.decision.runnerId,
    segmentIndex: rundown.segmentIndex,
    ballSide: rundown.ballSide
  });

  const holder = fielders[rundown.holderName];
  const holderFrom = holder
    ? currentFielderPoint(holder)
    : rundownPoint(
        rundown.segmentIndex,
        rundown.holderProgress
      );
  const holderStartProgress = rundown.holderProgress;
  const chaseDuration = 240;
  const chaseStep =
    chaseDuration /
    window.RUNNER_MOVEMENT_RULES
      .SEGMENTS[rundown.segmentIndex].duration;
  const holderTargetProgress =
    rundown.ballSide === 'lead'
      ? rundown.holderProgress - chaseStep
      : rundown.holderProgress + chaseStep;
  const clampedHolderTarget = Math.min(
    .94,
    Math.max(.06, holderTargetProgress)
  );
  const runnerDirection = snapshot.moving
    ? (
        snapshot.movingForward === true
          ? 1
          : snapshot.movingForward === false
            ? -1
            : 0
      )
    : 0;
  const projectedRunnerProgress =
    window.RUNNER_MOVEMENT_RULES.clampProgress(
      runnerProgress + runnerDirection * chaseStep
    );
  const collision =
    window.RUNNER_MOVEMENT_RULES.rundownCollision(
      holderStartProgress,
      clampedHolderTarget,
      runnerProgress,
      projectedRunnerProgress
    );
  rundown.holderProgress = collision
    ? collision.progress
    : clampedHolderTarget;
  if (
    (
      rundown.ballSide === 'lead' &&
      rundown.holderProgress < .999
    ) ||
    (
      rundown.ballSide === 'trail' &&
      rundown.holderProgress > .001
    )
  ) {
    rundown.ballSideReadyAt = null;
  }
  const holderTo = rundownPoint(
    rundown.segmentIndex,
    rundown.holderProgress
  );
  const holderMoveDuration = collision
    ? Math.max(1, chaseDuration * collision.ratio)
    : Math.max(
        1,
        window.RUNNER_MOVEMENT_RULES.durationBetween(
          rundown.segmentIndex,
          holderStartProgress,
          rundown.holderProgress
        )
      );
  if (holder) {
    move(
      holder,
      holderFrom,
      holderTo,
      holderMoveDuration,
      0,
      'linear'
    );
  }
  animate(
    ball,
    [
      {
        left: pct(holderFrom[0]),
        top: pct(holderFrom[1]),
        opacity: 1,
        transform: 'scale(.72)'
      },
      {
        left: pct(holderTo[0]),
        top: pct(holderTo[1]),
        opacity: 1,
        transform: 'scale(.72)'
      }
    ],
    { duration: holderMoveDuration, easing: 'linear' }
  );

  if (collision) {
    resolveRundownTagAfterGrace(holderMoveDuration);
    return;
  }
  const runnerEscaping =
    (
      rundown.ballSide === 'lead' &&
      snapshot.movingForward === false
    ) ||
    (
      rundown.ballSide === 'trail' &&
      snapshot.movingForward === true
    );
  if (
    runnerEscaping &&
      rundown.ballSide === 'lead' &&
      runnerProgress <= .45
  ) {
    scheduleAction(
      220,
      () => throwAcrossRundown(
        'trail',
        runnerProgress
      )
    );
    return;
  }
  if (
    runnerEscaping &&
      rundown.ballSide === 'trail' &&
      runnerProgress >= .55
  ) {
    scheduleAction(
      220,
      () => throwAcrossRundown(
        'lead',
        runnerProgress
      )
    );
    return;
  }
  scheduleRundownTick(250);
}

function activateRundown(rundown) {
  if (
    !rundown?.active ||
    activeRundown !== rundown ||
    rundown.started
  ) return;
  rundown.started = true;
  rundown.startedAt = performance.now();
  rundown.engagementTicks = 0;
  galleryField.dataset.rundownState = 'active';
  galleryField.dataset.rundownEngagementTicks = '0';
  dispatchRundownEvent('runner-rundown-start', {
    runnerId: rundown.decision.runnerId,
    segmentIndex: rundown.segmentIndex,
    ballSide: rundown.ballSide
  });
  scheduleRundownTick(80);
}

function waitForRundownReturn(rundown) {
  if (!rundown?.active || activeRundown !== rundown) {
    return;
  }
  const snapshot = requestRundownSnapshot(
    rundown.decision.runnerId
  );
  if (!snapshot) {
    finishRundown(true);
    return;
  }
  if (!snapshot.moving && !snapshot.offBase) {
    finishRundownAtReachedBase(rundown, snapshot);
    return;
  }
  const returning = Boolean(
    snapshot.moving &&
    (
      (
        rundown.ballSide === 'lead' &&
        snapshot.movingForward === false
      ) ||
      (
        rundown.ballSide === 'trail' &&
        snapshot.movingForward === true
      )
    )
  );
  if (returning) {
    activateRundown(rundown);
    return;
  }
  scheduleAction(
    80,
    () => waitForRundownReturn(rundown)
  );
}

function startRundown(decision, receiver, receivePoint) {
  const segmentIndex = Number(decision?.segmentIndex);
  const formation =
    window.RUNNER_MOVEMENT_RULES
      ?.RUNDOWN_FORMATIONS?.[segmentIndex];
  if (!formation || !receiver) return false;
  const ballSide =
    Number(decision.targetBaseIndex) === segmentIndex + 1
      ? 'lead'
      : 'trail';
  const lines = {
    trail: [...formation.trail],
    lead: [...formation.lead]
  };
  activeRundown = {
    active: true,
    throwing: false,
    decision,
    segmentIndex,
    lines,
    ballSide,
    holderName: receiver.name,
    holderProgress: ballSide === 'trail' ? 0 : 1,
    ballSideReadyAt: performance.now(),
    started: false,
    startedAt: null,
    engagementTicks: 0
  };
  galleryField.dataset.rundownState = 'waiting-return';
  galleryField.dataset.rundownThrows = '0';
  galleryField.dataset.rundownRunner =
    decision.runnerId;
  galleryField.dataset.rundownSegment =
    String(segmentIndex);
  galleryField.dataset.rundownEngagementTicks = '0';
  arrangeRundownLine(
    activeRundown,
    ballSide,
    receiver.name
  );
  arrangeRundownLine(
    activeRundown,
    ballSide === 'trail' ? 'lead' : 'trail'
  );
  galleryField.dataset.rundownTrailGate =
    activeRundown.lines.trail[0];
  galleryField.dataset.rundownLeadGate =
    activeRundown.lines.lead[0];
  moveRundownSupportingFielders(activeRundown);
  dispatchRundownEvent('runner-rundown-arm', {
    runnerId: decision.runnerId,
    segmentIndex,
    ballSide
  });
  const armedRundown = activeRundown;
  waitForRundownReturn(armedRundown);
  return true;
}

function throwAtRunner(from, decision, fallbackTarget) {
  if (decision?.tagAtContact) {
    const out =
      window.RUNNER_MOVEMENT_RULES?.resolveBasePlay?.({
        forceOut: false,
        ballArrivalMs: 0,
        runnerArrivalMs: decision.runnerArrivalMs,
        tagApplicationMs: TAG_APPLICATION_DURATION
      }) ?? (
        TAG_APPLICATION_DURATION <
        Number(decision.runnerArrivalMs)
      );
    scheduleAction(TAG_APPLICATION_DURATION, () => {
      showRunnerCall(
        out,
        null,
        decision?.targetBaseIndex,
        decision?.targetPoint
      );
      const outcome =
        dispatchRunnerDefenseResult(decision, out);
      continueDefenseAfterPlay(
        from,
        outcome,
        fallbackTarget
      );
    });
    return TAG_APPLICATION_DURATION;
  }
  const target = decision?.targetPoint || fallbackTarget;
  const plannedThrowDuration = throwDuration(from, target);
  const receiver = moveReceiverToBase(
    from,
    target,
    plannedThrowDuration,
    decision?.targetBaseIndex
  );
  const duration = receiver?.carriesBall
    ? receiver.duration
    : plannedThrowDuration;
  const receivePoint = receiver?.point || target;
  if (receiver?.carriesBall) {
    galleryField.dataset.lastThrowRoute = 'carry-to-base';
  }
  animate(
    ball,
    [
      {
        left: pct(from[0]),
        top: pct(from[1]),
        opacity: 1,
        transform: 'scale(.72)'
      },
      {
        left: pct(receivePoint[0]),
        top: pct(receivePoint[1]),
        opacity: 1,
        transform: 'scale(.72)'
      }
    ],
    { duration, easing: 'linear' }
  );
  playCatchFlash(
    receivePoint,
    Math.max(0, duration - 100)
  );

  if (decision) {
    galleryField.dataset.lastDefenseReason =
      decision.defenseReason || '';
    const guaranteedHomeTagUpSafe =
      decision.tagUpEligible &&
      Number(decision.targetBaseIndex) === 4;
    const out = guaranteedHomeTagUpSafe
      ? false
      : (
          window.RUNNER_MOVEMENT_RULES?.resolveBasePlay?.({
            forceOut: Boolean(decision.forceOut),
            ballArrivalMs: duration,
            runnerArrivalMs: decision.runnerArrivalMs,
            tagApplicationMs: TAG_APPLICATION_DURATION
          }) ?? (
            decision.forceOut
              ? duration < decision.runnerArrivalMs
              : duration + TAG_APPLICATION_DURATION <
                  decision.runnerArrivalMs
          )
        );
    if (
      out &&
      decision.rundownEligible &&
      receiver
    ) {
      scheduleAction(duration, () => {
        startRundown(
          decision,
          receiver,
          receivePoint
        );
      });
      return duration;
    }
    const finiteRunnerArrival =
      Number.isFinite(Number(decision.runnerArrivalMs))
        ? Number(decision.runnerArrivalMs)
        : 0;
    const callDelay =
      !decision.forceOut && out
        ? duration + TAG_APPLICATION_DURATION
        : Math.max(duration, finiteRunnerArrival);
    scheduleAction(callDelay, () => {
      showRunnerCall(
        out,
        null,
        decision.targetBaseIndex,
        decision.targetPoint
      );
      const outcome =
        dispatchRunnerDefenseResult(decision, out);
      continueDefenseAfterPlay(
        receivePoint,
        outcome,
        fallbackTarget
      );
    });
  }
  return duration;
}

function finishFromCut(cutName, cutPoint, fallbackTarget) {
  const decision = requestRunnerDefenseDecision(cutPoint);
  if (decision?.inningOver) return;
  if (decision?.allStopped) {
    const regularPoint = positionOf(cutName);
    const returnDuration = fielderMoveDuration(
      cutPoint,
      regularPoint
    );
    move(
      fielders[cutName],
      cutPoint,
      regularPoint,
      returnDuration,
      0,
      'linear'
    );
    animate(
      ball,
      [
        {
          left: pct(cutPoint[0]),
          top: pct(cutPoint[1]),
          opacity: 1,
          transform: 'scale(.72)'
        },
        {
          left: pct(regularPoint[0]),
          top: pct(regularPoint[1]),
          opacity: 1,
          transform: 'scale(.72)'
        }
      ],
      { duration: returnDuration, easing: 'linear' }
    );
    return;
  }
  throwAtRunner(
    cutPoint,
    decision?.allStopped === false ? decision : null,
    fallbackTarget
  );
}

function canCenterThrowDirect(primary, decision, from) {
  return Boolean(
    primary === 'center' &&
    decision &&
    !decision.allStopped &&
    decision.targetBaseIndex === 2 &&
    (
      window.RUNNER_MOVEMENT_RULES
        ?.shouldAttemptClosePlay?.(
        throwDuration(from, [50, 31]),
        decision.runnerArrivalMs
      ) ??
      (
        throwDuration(from, [50, 31]) <
        decision.runnerArrivalMs
      )
    )
  );
}

function playBallFlight(target, duration, peakScale = 1.7) {
  animate(
    ball,
    [
      { left: '50%', top: '89%', opacity: 1, transform: `scale(${.72 * FLY_BALL_SCALE})` },
      { left: pct((50 + target[0]) / 2), top: pct((89 + target[1]) / 2), opacity: 1, transform: `scale(${peakScale * FLY_BALL_SCALE})` },
      { left: pct(target[0]), top: pct(target[1]), opacity: 1, transform: `scale(${.78 * FLY_BALL_SCALE})` }
    ],
    { duration, easing: 'linear' }
  );
  animate(
    shadow,
    [
      { left: '50%', top: '89%', opacity: .4, transform: 'scale(.8)' },
      { left: pct((50 + target[0]) / 2), top: pct((89 + target[1]) / 2), opacity: .12, transform: 'scale(.3)' },
      { left: pct(target[0]), top: pct(target[1]), opacity: .42, transform: 'scale(.75)' }
    ],
    { duration, easing: 'linear' }
  );
}

function playOutfieldFly() {
  const play = OUTFIELD_PLAYS[selectedDirection];
  const catchTime = 2250 * BATTED_BALL_TIME_SCALE;
  const cutHoldDuration = 450;

  playBallFlight(play.target, catchTime);
  move(fielders[play.primary], positionOf(play.primary), play.target, 1350, 650);
  move(fielders[play.backup], positionOf(play.backup), play.backupPoint, 1450, 600);
  move(fielders[play.far], positionOf(play.far), play.farPoint, 1250, 650);

  move(fielders[play.cut], positionOf(play.cut), play.cutPoint, 1050, 1000);
  move(fielders[play.base], positionOf(play.base), [50, 30], 950, 1050);
  move(fielders.third, positionOf('third'), [25, 60], 850, 850);
  move(fielders.first, positionOf('first'), [75, 60], 850, 850);
  move(fielders.pitcher, positionOf('pitcher'), [50, 40], 900, 1200);

  playCatchFlash(play.target, catchTime - 120);
  markBallResult(BALL_RESULT_COLORS.CAUGHT, catchTime);
  scheduleAction(catchTime, () => {
    recordAutomaticOut('caught-fly');
  });
  scheduleAction(catchTime + 180, () => {
    const pickupDecision =
      requestRunnerDefenseDecision(play.target);
    if (pickupDecision?.inningOver) return;
    if (shouldThrowHomeDirect(pickupDecision)) {
      throwHomeDirect(play.target, pickupDecision);
      return;
    }
    if (
      canCenterThrowDirect(
        play.primary,
        pickupDecision,
        play.target
      )
    ) {
      throwAtRunner(
        play.target,
        pickupDecision,
        [50, 31]
      );
      return;
    }

    const cutReceiveDuration = throwDuration(
      play.target,
      play.cutPoint
    );
    animate(
      ball,
      [
        {
          left: pct(play.target[0]),
          top: pct(play.target[1]),
          opacity: 1,
          transform: 'scale(.78)'
        },
        {
          left: pct(play.cutPoint[0]),
          top: pct(play.cutPoint[1]),
          opacity: 1,
          transform: 'scale(.72)'
        }
      ],
      { duration: cutReceiveDuration, easing: 'linear' }
    );
    playCatchFlash(
      play.cutPoint,
      Math.max(0, cutReceiveDuration - 100)
    );
    scheduleAction(
      cutReceiveDuration + cutHoldDuration,
      () => {
        finishFromCut(
          play.cut,
          play.cutPoint,
          [50, 30]
        );
      }
    );
  });
}

function regularPositionOf(name) {
  return {
    catcher: [50, 90],
    pitcher: [50, 59],
    first: [72, 51],
    second: [61, 34],
    short: [39, 34],
    third: [28, 51],
    left: [17, 25],
    center: [50, 9],
    right: [83, 25]
  }[name];
}

function infieldInPoint(point) {
  const home = [50, 89];
  const width = galleryPlayArea.clientWidth || 100;
  const height = galleryPlayArea.clientHeight || 100;
  const deltaX = (home[0] - point[0]) * width / 100;
  const deltaY = (home[1] - point[1]) * height / 100;
  const distance = Math.hypot(deltaX, deltaY);
  if (!distance) return point;
  const fielderDiameter = 31;
  return [
    point[0] +
      deltaX / distance * fielderDiameter / width * 100,
    point[1] +
      deltaY / distance * fielderDiameter / height * 100
  ];
}

function positionOf(name) {
  const regularPoint = regularPositionOf(name);
  if (
    currentDefenseAlignment === 'infield-in' &&
    ['first', 'second', 'short', 'third'].includes(name)
  ) {
    return infieldInPoint(regularPoint);
  }
  return regularPoint;
}

function applyDefenseAlignment() {
  Object.entries(fielders).forEach(([name, fielder]) => {
    const point = positionOf(name);
    fielder.style.left = pct(point[0]);
    fielder.style.top = pct(point[1]);
  });
  galleryField.classList.toggle(
    'defense-infield-in',
    currentDefenseAlignment === 'infield-in'
  );
  if (defenseAlignmentLabel) {
    defenseAlignmentLabel.hidden = false;
    defenseAlignmentLabel.textContent =
      currentDefenseAlignment === 'infield-in'
        ? '前進'
        : '定位置';
    defenseAlignmentLabel.classList.toggle(
      'is-infield-in',
      currentDefenseAlignment === 'infield-in'
    );
  }
}

function selectPlayDefenseAlignment() {
  const detail = { alignment: 'normal' };
  galleryField.dispatchEvent(new CustomEvent(
    'runner-defense-alignment-request',
    { detail }
  ));
  currentDefenseAlignment =
    detail.alignment === 'infield-in'
      ? 'infield-in'
      : 'normal';
  currentThirdBaseRunnerPresent =
    Boolean(detail.thirdBaseRunner);
  applyDefenseAlignment();
}

function playOutfieldLiner(isExtra = false) {
  const play = OUTFIELD_PLAYS[selectedDirection];
  const target = isExtra
    ? LONG_HIT_TARGETS[selectedDirection]
    : play.target;
  const cutPoint = isExtra
    ? [
        target[0] + (50 - target[0]) * .62,
        target[1] + (30 - target[1]) * .62
      ]
    : play.cutPoint;
  const duration =
    (isExtra ? 1700 : 1050) * BATTED_BALL_TIME_SCALE;

  animate(
    ball,
    [
      { left: '50%', top: '89%', opacity: 1, transform: 'scale(.78)' },
      { left: pct(target[0]), top: pct(target[1]), opacity: 1, transform: 'scale(.76)' }
    ],
    { duration, easing: 'linear' }
  );

  const primaryTarget = isExtra
    ? target
    : play.target;
  const backupTarget = isExtra
    ? [
        target[0] + (positionOf(play.backup)[0] - target[0]) * .28,
        target[1] + (positionOf(play.backup)[1] - target[1]) * .28
      ]
    : play.backupPoint;
  const farTarget = isExtra
    ? [
        target[0] + (positionOf(play.far)[0] - target[0]) * .45,
        target[1] + (positionOf(play.far)[1] - target[1]) * .45
      ]
    : play.farPoint;
  move(fielders[play.primary], positionOf(play.primary), primaryTarget, duration + 250, 80, 'ease-in');
  move(fielders[play.backup], positionOf(play.backup), backupTarget, duration + 300, 120, 'ease-in');
  move(fielders[play.far], positionOf(play.far), farTarget, duration, 180);
  move(fielders[play.cut], positionOf(play.cut), cutPoint, 950, 550);
  move(fielders[play.base], positionOf(play.base), [50, 30], 850, 600);
  move(fielders.pitcher, positionOf('pitcher'), [50, 40], 800, 700);

  if (isExtra) {
    const pickupTime = duration + 330;
    const cutReceiveDelay = pickupTime + 100;
    const cutHoldDuration = 450;
    playCatchFlash(target, pickupTime - 120);
    markBallResult(BALL_RESULT_COLORS.FAIR, duration);
    scheduleAction(cutReceiveDelay, () => {
      const pickupDecision =
        requestRunnerDefenseDecision(target);
      if (pickupDecision?.inningOver) return;
      if (shouldThrowHomeDirect(pickupDecision)) {
        const directDuration =
          throwHomeDirect(target, pickupDecision);
        scheduleRunnerPhase(
          'fair-ball-infield',
          'extra',
          directDuration
        );
        return;
      }
      if (
        canCenterThrowDirect(
          play.primary,
          pickupDecision,
          target
        )
      ) {
        const directDuration = throwAtRunner(
          target,
          pickupDecision,
          [50, 31]
        );
        scheduleRunnerPhase(
          'fair-ball-infield',
          'extra',
          directDuration
        );
        return;
      }

      const cutReceiveDuration = throwDuration(
        target,
        cutPoint
      );
      animate(
        ball,
        [
          {
            left: pct(target[0]), top: pct(target[1]),
            opacity: 1, transform: 'scale(.76)'
          },
          {
            left: pct(cutPoint[0]), top: pct(cutPoint[1]),
            opacity: 1, transform: 'scale(.72)'
          }
        ],
        { duration: cutReceiveDuration, easing: 'linear' }
      );
      playCatchFlash(
        cutPoint,
        Math.max(0, cutReceiveDuration - 100)
      );
      scheduleRunnerPhase(
        'fair-ball-infield',
        'extra',
        cutReceiveDuration
      );
      scheduleAction(
        cutReceiveDuration + cutHoldDuration,
        () => {
          finishFromCut(
            play.cut,
            cutPoint,
            [50, 30]
          );
        }
      );
    });
  } else {
    playCatchFlash(target, duration - 100);
    markBallResult(BALL_RESULT_COLORS.CAUGHT, duration);
  }
}

function playOutfieldSingle() {
  const play = OUTFIELD_SINGLE_PLAYS[selectedDirection];
  const fieldTime = 1250 * BATTED_BALL_TIME_SCALE;
  markBallResult(
    BALL_RESULT_COLORS.FAIR,
    180 * BATTED_BALL_TIME_SCALE
  );

  animate(
    ball,
    [
      {
        left: '50%', top: '89%', opacity: 1,
        transform: 'translateY(0) scale(.86)'
      },
      {
        left: pct((50 + play.through[0]) / 2),
        top: pct((89 + play.through[1]) / 2),
        opacity: 1,
        transform: 'translateY(-6px) scale(.9)',
        offset: .18
      },
      {
        left: pct(play.through[0]), top: pct(play.through[1]),
        opacity: 1, transform: 'translateY(0) scale(.84)',
        offset: .36
      },
      {
        left: pct(play.target[0]), top: pct(play.target[1]),
        opacity: 1, transform: 'translateY(0) scale(.78)'
      }
    ],
    { duration: fieldTime, easing: 'linear' }
  );

  play.infieldChasers.forEach(([name, point]) => {
    move(fielders[name], positionOf(name), point, 800, 160);
  });
  const infieldChaserNames = play.infieldChasers.map(([name]) => name);
  move(fielders[play.primary], positionOf(play.primary), play.target, 1150, 500);
  move(fielders[play.backup], positionOf(play.backup), play.backupPoint, 1250, 450);
  move(fielders[play.far], positionOf(play.far), play.farPoint, 1050, 500);

  move(fielders[play.cut], play.infieldChasers.find(([name]) => name === play.cut)?.[1] || positionOf(play.cut), play.cutPoint, 800, 980);
  const baseChaser = play.infieldChasers.find(([name]) => name === play.base);
  move(
    fielders[play.base],
    baseChaser?.[1] || positionOf(play.base),
    [50, 30],
    850,
    baseChaser ? 980 : 650
  );
  if (!infieldChaserNames.includes('third')) {
    move(fielders.third, positionOf('third'), [25, 60], 750, 650);
  }
  if (!infieldChaserNames.includes('first')) {
    move(fielders.first, positionOf('first'), [75, 60], 750, 650);
  }
  move(fielders.pitcher, positionOf('pitcher'), [50, 40], 850, 850);

  playCatchFlash(play.target, fieldTime - 100);
  const cutReceiveDelay = fieldTime + 180;
  const cutHoldDuration = 450;
  scheduleAction(cutReceiveDelay, () => {
    const pickupDecision =
      requestRunnerDefenseDecision(play.target);
    if (pickupDecision?.inningOver) return;
    if (shouldThrowHomeDirect(pickupDecision)) {
      const directDuration =
        throwHomeDirect(play.target, pickupDecision);
      scheduleRunnerPhase(
        'fair-ball-infield',
        'single',
        directDuration
      );
      return;
    }
    if (
      canCenterThrowDirect(
        play.primary,
        pickupDecision,
        play.target
      )
    ) {
      const directDuration = throwAtRunner(
        play.target,
        pickupDecision,
        [50, 31]
      );
      scheduleRunnerPhase(
        'fair-ball-infield',
        'single',
        directDuration
      );
      return;
    }

    const cutReceiveDuration = throwDuration(
      play.target,
      play.cutPoint
    );
    animate(
      ball,
      [
        {
          left: pct(play.target[0]),
          top: pct(play.target[1]),
          opacity: 1,
          transform: 'scale(.78)'
        },
        {
          left: pct(play.cutPoint[0]),
          top: pct(play.cutPoint[1]),
          opacity: 1,
          transform: 'scale(.72)'
        }
      ],
      { duration: cutReceiveDuration, easing: 'linear' }
    );
    playCatchFlash(
      play.cutPoint,
      Math.max(0, cutReceiveDuration - 100)
    );
    scheduleRunnerPhase(
      'fair-ball-infield',
      'single',
      cutReceiveDuration
    );
    scheduleAction(
      cutReceiveDuration + cutHoldDuration,
      () => {
        finishFromCut(
          play.cut,
          play.cutPoint,
          [50, 30]
        );
      }
    );
  });
}

function playGroundOutfieldCoverage(directionName) {
  const coverage = GROUND_OUTFIELD_PLAYS[directionName];

  // 外野手は、まず内野を抜ける可能性を考えて土と芝の境界まで追う。
  move(
    fielders[coverage.chaser],
    positionOf(coverage.chaser),
    coverage.chasePoint,
    950,
    180
  );

  move(
    fielders[coverage.backup],
    positionOf(coverage.backup),
    coverage.backupPoint,
    1000,
    220
  );
  move(
    fielders[coverage.shift],
    positionOf(coverage.shift),
    coverage.shiftPoint,
    1150,
    280
  );
}

function playPitcherGroundCoverage(play, needsHomeCover, needsFirstCover) {
  const homeCoverPoint = [50, 87];

  if (needsFirstCover) {
    // 一塁手が打球を処理するため、投手が一塁ベースの内野側へ入る。
    move(fielders.pitcher, positionOf('pitcher'), [68, 60], 950, 150);
    return;
  }

  if (play.primary === 'pitcher') {
    if (needsHomeCover) {
      move(fielders.pitcher, play.target, homeCoverPoint, 850, 1120);
    }
    return;
  }

  const chasePoint = [
    50 + ((play.target[0] - 50) * .35),
    59 + ((play.target[1] - 59) * .35)
  ];
  move(fielders.pitcher, positionOf('pitcher'), chasePoint, 650, 100);
  if (needsHomeCover) {
    // 捕手が一塁カバーへ出る場合だけ、打球を追った後にホームへ戻る。
    move(fielders.pitcher, chasePoint, homeCoverPoint, 900, 850);
  }
}

function playInfieldScene(kind) {
  const play = INFIELD_PLAYS[selectedDirection];
  const isPopup = kind === 'popup';
  const isLiner = kind === 'liner';
  const isError = kind === 'error';
  const flightDuration = (
    isPopup ? 1900 : isLiner ? 720 : 1100
  ) * BATTED_BALL_TIME_SCALE;
  markBallResult(
    isPopup || isLiner
      ? BALL_RESULT_COLORS.CAUGHT
      : BALL_RESULT_COLORS.FAIR,
    isPopup || isLiner
      ? flightDuration
      : 180 * BATTED_BALL_TIME_SCALE
  );

  if (isPopup) {
    playBallFlight(play.target, flightDuration);
  } else if (isLiner) {
    animate(
      ball,
      [
        { left: '50%', top: '89%', opacity: 1, transform: 'scale(.82)' },
        { left: pct(play.target[0]), top: pct(play.target[1]), opacity: 1, transform: 'scale(.78)' }
      ],
      { duration: flightDuration, easing: 'linear' }
    );
  } else {
    animate(
      ball,
      [
        { left: '50%', top: '89%', opacity: 1, transform: 'translateY(0) scale(.85)' },
        { left: pct((50 + play.target[0]) / 2), top: pct((89 + play.target[1]) / 2), opacity: 1, transform: 'translateY(-6px) scale(.9)' },
        { left: pct(play.target[0]), top: pct(play.target[1]), opacity: 1, transform: 'translateY(0) scale(.82)' }
      ],
      { duration: flightDuration, easing: 'linear' }
    );
  }

  const isPitcherLiner = isLiner && play.primary === 'pitcher';
  const baseCover = isPitcherLiner ? 'second' : play.cover;

  move(fielders[play.primary], positionOf(play.primary), play.target, flightDuration - 200, 180);
  move(fielders[baseCover], positionOf(baseCover), [50, 30], 800, 500);
  if (isPitcherLiner) {
    // 投手の横を抜ける可能性を考え、センター前ヒットと同じ連係へ入る。
    move(fielders.short, positionOf('short'), [47, 25], 850, 420);
  } else if (play.support) {
    // 二遊間の一方が2塁へ入るとき、もう一方は打球側で捕球者をカバーする。
    const usesInfieldCoverage =
      kind === 'ground' ||
      kind === 'error' ||
      kind === 'popup' ||
      kind === 'liner';
    const supportPoint =
      usesInfieldCoverage && selectedDirection === 'third-line'
        ? [25, 43]
        : usesInfieldCoverage && selectedDirection === 'third'
          ? [32, 38]
          : play.supportPoint;
    move(
      fielders[play.support],
      positionOf(play.support),
      supportPoint,
      950,
      420
    );
  }
  if (play.primary !== 'first') {
    move(fielders.first, positionOf('first'), [75, 60], 750, 500);
  }
  if (play.primary !== 'third') {
    move(fielders.third, positionOf('third'), [25, 60], 750, 500);
  }
  if (
    kind === 'ground' ||
    kind === 'error' ||
    kind === 'popup' ||
    kind === 'liner'
  ) {
    const catcherCoversFirst =
      selectedDirection === 'second' &&
      !currentThirdBaseRunnerPresent;
    const pitcherCoversFirst =
      kind !== 'liner' &&
      (
        selectedDirection === 'first' ||
        selectedDirection === 'first-line'
      );
    if (catcherCoversFirst) {
      // 二塁側だけ、捕手が一塁後方へ寄る。
      move(fielders.catcher, positionOf('catcher'), [69, 80], 900, 320);
    }
    playGroundOutfieldCoverage(selectedDirection);
    // ライナーでは一塁方向へ反応するが、投手はベースまで到達しない。
    playPitcherGroundCoverage(
      play,
      catcherCoversFirst,
      pitcherCoversFirst
    );
  }

  if (isError) {
    const looseBallPoint = [
      play.target[0] + (play.target[0] <= 50 ? -8 : 8),
      play.target[1] + 6
    ];
    missFlash.style.left = pct(play.target[0]);
    missFlash.style.top = pct(play.target[1]);
    animate(
      ball,
      [
        { left: pct(play.target[0]), top: pct(play.target[1]), opacity: 1 },
        { left: pct(looseBallPoint[0]), top: pct(looseBallPoint[1]), opacity: 1 }
      ],
      {
        duration: 650 * BATTED_BALL_TIME_SCALE,
        delay: flightDuration,
        easing: 'ease-out'
      }
    );
    // 通常のゴロ処理位置へ入った後、エラーでこぼれたボールを追い直す。
    move(
      fielders[play.primary],
      play.target,
      looseBallPoint,
      650 * BATTED_BALL_TIME_SCALE,
      flightDuration
    );
    animate(
      missFlash,
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.4)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.15)', offset: .45 },
        { opacity: 0, transform: 'translate(-50%, -70%) scale(1)' }
      ],
      { duration: 600, delay: flightDuration - 80, easing: 'ease-out' }
    );
  } else {
    playCatchFlash(play.target, flightDuration - 110);
  }

  if (isPopup || isLiner) {
    scheduleAction(flightDuration, () => {
      const catchOutcome = recordAutomaticOut(
        isPopup ? 'caught-popup' : 'caught-liner'
      );
      if (catchOutcome?.inningOver) return;
      scheduleAction(220, () => {
        const returnDecision =
          requestRunnerDefenseDecision(play.target);
        if (
          !returnDecision ||
          returnDecision.inningOver
        ) return;
        if (returnDecision.allStopped) {
          throwAtRunner(play.target, null, [75, 60]);
          return;
        }
        throwAtRunner(
          play.target,
          returnDecision,
          [75, 60]
        );
      });
    });
    return;
  }

  const possessionDelay = isError
    ? flightDuration + 650 * BATTED_BALL_TIME_SCALE
    : flightDuration + 80;
  scheduleAction(possessionDelay, () => {
    const defenseDecision =
      requestRunnerDefenseDecision(
        isError
          ? [
              play.target[0] +
                (play.target[0] <= 50 ? -8 : 8),
              play.target[1] + 6
            ]
          : play.target
      );
    if (
      !defenseDecision ||
      defenseDecision.inningOver
    ) return;
    if (defenseDecision.allStopped) {
      throwAtRunner(
        isError
          ? [
              play.target[0] +
                (play.target[0] <= 50 ? -8 : 8),
              play.target[1] + 6
            ]
          : play.target,
        null,
        [75, 60]
      );
      return;
    }
    throwAtRunner(
      isError
        ? [
            play.target[0] +
              (play.target[0] <= 50 ? -8 : 8),
            play.target[1] + 6
          ]
        : play.target,
      defenseDecision,
      [75, 60]
    );
  });
}

function playBuntFormation(play, fieldDuration) {
  const chargeDelay = 80;
  const chargeDuration = Math.max(650, fieldDuration - 260);
  const returnDelay = Math.max(450, fieldDuration - 1050);
  const returnDuration = 700;
  const cornerChargePoints = {
    third: [40, 71],
    first: [60, 71]
  };
  const cornerBasePoints = {
    third: [27.5, 57.5],
    first: [72.5, 57.5]
  };
  const pitcherCoverPoint = [57, 67];

  ['third', 'first'].forEach((name) => {
    const target = name === play.primary
      ? play.target
      : cornerChargePoints[name];
    move(
      fielders[name],
      positionOf(name),
      target,
      chargeDuration,
      chargeDelay,
      'ease-in'
    );
  });

  const returnCornerToBase = (name) => {
    scheduleAction(returnDelay, () => {
      move(
        fielders[name],
        currentFielderPoint(fielders[name]),
        cornerBasePoints[name],
        returnDuration,
        0,
        'linear'
      );
    });
  };

  if (play.primary === 'pitcher') {
    move(
      fielders.pitcher,
      positionOf('pitcher'),
      play.target,
      chargeDuration,
      chargeDelay,
      'ease-in'
    );
    // 投手が捕球する時は、一塁手が投手の後方をカバーし、
    // 三塁手は三塁へ戻る。
    scheduleAction(returnDelay, () => {
      move(
        fielders.first,
        currentFielderPoint(fielders.first),
        pitcherCoverPoint,
        returnDuration,
        0,
        'linear'
      );
    });
    returnCornerToBase('third');
  } else {
    const pitcherBackup = play.primary === 'third'
      ? [46, 69]
      : [54, 69];
    move(
      fielders.pitcher,
      positionOf('pitcher'),
      pitcherBackup,
      chargeDuration,
      chargeDelay + 40,
      'ease-in'
    );
  }

  const secondCoverPoint =
    play.primary === 'third'
      ? [50, 30]
      : [72.5, 57.5];
  const shortCoverPoint =
    play.primary === 'third'
      ? [27.5, 57.5]
      : [50, 30];

  move(
    fielders.second,
    positionOf('second'),
    secondCoverPoint,
    950,
    220,
    'linear'
  );
  move(
    fielders.short,
    positionOf('short'),
    shortCoverPoint,
    900,
    220,
    'linear'
  );

  if (play.primary === 'third') {
    // 三塁手が捕球する時は一塁手が一塁へ戻り、
    // 二塁手が二塁、遊撃手が三塁を埋める。
    returnCornerToBase('first');
    move(
      fielders.center,
      positionOf('center'),
      [50, 25],
      1050,
      360
    );
  } else if (play.primary === 'first') {
    // 一塁手が捕球する時は三塁手が三塁へ戻り、
    // 二塁手が一塁、遊撃手が二塁を埋める。
    returnCornerToBase('third');
  }

  if (!currentThirdBaseRunnerPresent) {
    move(
      fielders.catcher,
      positionOf('catcher'),
      [50, 84],
      520,
      120
    );
  }
  move(fielders.left, positionOf('left'), [22, 45], 1050, 420);
  move(fielders.right, positionOf('right'), [78, 45], 1050, 420);
}

function playBuntScene() {
  const play = BUNT_PLAYS[selectedDirection];
  if (!play) return;

  const fieldDuration = (play.popup ? 850 : 950) *
    BATTED_BALL_TIME_SCALE;
  playBuntFormation(play, fieldDuration);
  markBallResult(
    play.popup
      ? BALL_RESULT_COLORS.CAUGHT
      : BALL_RESULT_COLORS.FAIR,
    play.popup
      ? fieldDuration
      : 160 * BATTED_BALL_TIME_SCALE
  );

  if (play.popup) {
    playBallFlight(play.target, fieldDuration, 1.15);
  } else {
    animate(
      ball,
      [
        {
          left: '50%',
          top: '89%',
          opacity: 1,
          transform: 'translateY(0) scale(.78)'
        },
        {
          left: pct((50 + play.target[0]) / 2),
          top: pct((89 + play.target[1]) / 2),
          opacity: 1,
          transform: 'translateY(-2px) scale(.82)'
        },
        {
          left: pct(play.target[0]),
          top: pct(play.target[1]),
          opacity: 1,
          transform: 'translateY(0) scale(.78)'
        }
      ],
      { duration: fieldDuration, easing: 'linear' }
    );
  }

  playCatchFlash(play.target, fieldDuration - 100);

  if (play.popup) {
    scheduleAction(fieldDuration, () => {
      const catchOutcome = recordAutomaticOut(
        'caught-bunt-popup'
      );
      if (catchOutcome?.inningOver) return;
      scheduleAction(220, () => {
        const returnDecision =
          requestRunnerDefenseDecision(play.target);
        if (
          !returnDecision ||
          returnDecision.inningOver
        ) return;
        if (returnDecision.allStopped) {
          throwAtRunner(play.target, null, [75, 60]);
          return;
        }
        throwAtRunner(
          play.target,
          returnDecision,
          [75, 60]
        );
      });
    });
    return;
  }

  scheduleAction(fieldDuration + 80, () => {
    const defenseDecision =
      requestRunnerDefenseDecision(play.target);
    if (!defenseDecision && !galleryHasRunnerGame) {
      // フォーメーション学習では走者判定を行わず、
      // 捕球後に確実な一塁アウトの送球まで見せる。
      throwAtRunner(play.target, null, [75, 60]);
      return;
    }
    if (
      !defenseDecision ||
      defenseDecision.inningOver
    ) return;
    if (defenseDecision.allStopped) {
      throwAtRunner(play.target, null, [75, 60]);
      return;
    }
    throwAtRunner(
      play.target,
      defenseDecision,
      [75, 60]
    );
  });
}

function playPassedBall(startDelay = 0) {
  const passedBallPoint = [63, 98];
  const homeCoverPoint = [50, 82];
  animate(
    ball,
    [
      { left: '50%', top: '59%', opacity: 1, transform: 'scale(.78)' },
      { left: '51%', top: '88%', opacity: 1, transform: 'scale(1)' }
    ],
    {
      duration: PITCH_DURATION,
      delay: startDelay,
      easing: 'ease-in'
    }
  );
  animate(
    ball,
    [
      { left: '51%', top: '88%', opacity: 1, transform: 'scale(1)' },
      { left: '55%', top: '92%', opacity: 1, transform: 'scale(.92)', offset: .28 },
      {
        left: pct(passedBallPoint[0]),
        top: pct(passedBallPoint[1]),
        opacity: 1,
        transform: 'scale(.8)'
      }
    ],
    {
      duration: 950,
      delay: startDelay + PITCH_DURATION,
      easing: 'ease-out'
    }
  );
  missFlash.style.left = '51%';
  missFlash.style.top = '88%';
  animate(
    missFlash,
    [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(.4)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.15)', offset: .45 },
      { opacity: 0, transform: 'translate(-50%, -70%) scale(1)' }
    ],
    {
      duration: 500,
      delay: startDelay + PITCH_DURATION - 80,
      easing: 'ease-out'
    }
  );
  // 捕手がそらした後、後方へ転がるボールを追う。
  move(
    fielders.catcher,
    positionOf('catcher'),
    [61, 96],
    850,
    startDelay + PITCH_DURATION + 150
  );
  const pickupDelay =
    startDelay + PITCH_DURATION + 1000;
  playCatchFlash(
    passedBallPoint,
    Math.max(0, pickupDelay - 100)
  );
  if (!currentThirdBaseRunnerPresent) {
    const catcherHomePoint = positionOf('catcher');
    const catcherReturnDuration = 650;
    move(
      fielders.catcher,
      [61, 96],
      catcherHomePoint,
      catcherReturnDuration,
      pickupDelay
    );
    animate(
      ball,
      [
        {
          left: pct(passedBallPoint[0]),
          top: pct(passedBallPoint[1]),
          opacity: 1,
          transform: 'scale(.8)'
        },
        {
          left: pct(catcherHomePoint[0]),
          top: pct(catcherHomePoint[1]),
          opacity: 1,
          transform: 'scale(.72)'
        }
      ],
      {
        duration: catcherReturnDuration,
        delay: pickupDelay,
        easing: 'linear'
      }
    );
    return;
  }
  // 捕手が追い始めた後、投手がホームプレートの内野側へカバーに入る。
  move(
    fielders.pitcher,
    positionOf('pitcher'),
    homeCoverPoint,
    800,
    startDelay + PITCH_DURATION + 300
  );
  const returnDuration = throwDuration(
    passedBallPoint,
    homeCoverPoint
  );
  animate(
    ball,
    [
      {
        left: pct(passedBallPoint[0]),
        top: pct(passedBallPoint[1]),
        opacity: 1,
        transform: 'scale(.8)'
      },
      {
        left: pct(homeCoverPoint[0]),
        top: pct(homeCoverPoint[1]),
        opacity: 1,
        transform: 'scale(.72)'
      }
    ],
    {
      duration: returnDuration,
      delay: pickupDelay,
      easing: 'linear'
    }
  );
  playCatchFlash(
    homeCoverPoint,
    pickupDelay + returnDuration - 100
  );
}

function selectedRunnerStart() {
  return document.querySelector(
    '[data-start][aria-pressed="true"]'
  )?.dataset.start || 'FIRST';
}

function moveStealCoverage(start, target) {
  if (start === 'SECOND') {
    move(fielders.third, positionOf('third'), target, 650, 0);
    move(fielders.short, positionOf('short'), [20, 50], 700, 0);
    move(fielders.left, positionOf('left'), [13, 43], 850, 0);
    move(fielders.center, positionOf('center'), [34, 17], 800, 40);
  } else if (start === 'THIRD') {
    move(fielders.pitcher, positionOf('pitcher'), [50, 82], 650, 0);
    move(fielders.center, positionOf('center'), [50, 18], 800, 40);
    move(fielders.left, positionOf('left'), [31, 25], 750, 80);
    move(fielders.right, positionOf('right'), [69, 25], 750, 80);
  } else {
    move(fielders.short, positionOf('short'), target, 650, 0);
    move(fielders.second, positionOf('second'), [50, 23], 750, 0);
    move(fielders.center, positionOf('center'), [50, 15], 800, 40);
    move(fielders.left, positionOf('left'), [29, 21], 750, 80);
    move(fielders.right, positionOf('right'), [71, 21], 750, 80);
  }
}

function defendCaughtPitchRunner() {
  if (
    !caughtPitchReady ||
    caughtPitchDefenseStarted ||
    pickoffActive
  ) return false;
  const stealDecision =
    requestRunnerDefenseDecision([50, 88]);
  if (stealDecision?.inningOver) return false;
  if (stealDecision?.allStopped !== false) return false;
  caughtPitchDefenseStarted = true;
  galleryField.dataset.lastThrowRoute = 'steal-attempt';
  const autonomousStart = {
    1: 'FIRST',
    2: 'SECOND',
    3: 'THIRD'
  }[Number(stealDecision.segmentIndex)];
  const start = stealDecision.runnerType === 'autonomous'
    ? autonomousStart
    : selectedRunnerStart();
  const target =
    stealDecision.targetPoint ||
    (
      start === 'SECOND'
        ? [25, 60]
        : start === 'THIRD'
          ? [50, 89]
          : [50, 31]
    );
  moveStealCoverage(start, target);
  throwAtRunner(
    [50, 88],
    stealDecision,
    target
  );
  return true;
}

function playCaughtPitch(startDelay = 0) {
  const start = selectedRunnerStart();

  animate(
    ball,
    [
      { left: '50%', top: '59%', opacity: 1, transform: 'scale(.78)' },
      { left: '50%', top: '88%', opacity: 1, transform: 'scale(.92)' }
    ],
    {
      duration: PITCH_DURATION,
      delay: startDelay,
      easing: 'linear'
    }
  );
  playCatchFlash(
    [50, 88],
    startDelay + PITCH_DURATION - 100
  );
  scheduleAction(
    startDelay + PITCH_DURATION,
    () => {
      caughtPitchReady = true;
    }
  );
  scheduleAction(
    startDelay + PITCH_DURATION + 200,
    defendCaughtPitchRunner
  );
}

function playPitchToContact(startDelay = 0) {
  animate(
    ball,
    [
      { left: '50%', top: '59%', opacity: 1, transform: 'scale(.78)' },
      { left: '50%', top: '89%', opacity: 1, transform: 'scale(.86)' }
    ],
    {
      duration: PITCH_DURATION,
      delay: startDelay,
      easing: 'linear'
    }
  );
}

function playBatSwing(startDelay = 0, misses = false) {
  if (!boardBat) return;
  const swingStartDelay =
    startDelay +
    PITCH_DURATION -
    (misses ? 580 : 380);

  animate(
    boardBat,
    [
      { transform: 'rotate(15deg)' },
      {
        transform: 'rotate(0deg)',
        offset: misses
          ? .55
          : 380 / 420
      },
      { transform: 'rotate(-45deg)' }
    ],
    {
      duration: 420,
      delay: swingStartDelay,
      easing: 'cubic-bezier(.3,.05,.55,1)'
    }
  );
  animate(
    boardBat,
    [
      { transform: 'rotate(-45deg)' },
      { transform: 'rotate(15deg)' }
    ],
    {
      duration: 300,
      delay: startDelay + PITCH_DURATION + 120,
      easing: 'ease-out'
    }
  );
}

function playBuntBatHold(startDelay = 0) {
  if (!boardBat) return;
  const moveStart =
    startDelay + PITCH_DURATION - 380;

  // バントは振り切らず、投球に合わせてバットを前へ出して止める。
  animate(
    boardBat,
    [
      { transform: 'rotate(15deg)' },
      { transform: 'rotate(0deg)', offset: .5 },
      { transform: 'rotate(0deg)' }
    ],
    {
      duration: 760,
      delay: moveStart,
      easing: 'ease-out'
    }
  );
  animate(
    boardBat,
    [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(15deg)' }
    ],
    {
      duration: 300,
      delay: startDelay + PITCH_DURATION + 380,
      easing: 'ease-out'
    }
  );
}

function dispatchRunnerPhase(phase, sceneName) {
  galleryField.dispatchEvent(new CustomEvent('runner-play-phase', {
    detail: {
      phase,
      scene: sceneName,
      direction: selectedDirection,
      stealSign: stealSignEnabled
    }
  }));
}

function scheduleRunnerPhase(phase, sceneName, delay) {
  const timer = setTimeout(() => {
    dispatchRunnerPhase(phase, sceneName);
  }, delay);
  runnerPhaseTimers.push(timer);
}

function playSceneAnimation(sceneName) {
  if (sceneName === 'fly') playOutfieldFly();
  else if (sceneName === 'popup') playInfieldScene('popup');
  else if (sceneName === 'liner') playInfieldScene('liner');
  else if (sceneName === 'extra') playOutfieldLiner(true);
  else if (sceneName === 'single') playOutfieldSingle();
  else if (sceneName === 'ground') playInfieldScene('ground');
  else if (sceneName === 'error') playInfieldScene('error');
  else if (sceneName === 'bunt') playBuntScene();
}

function triggerPickoff(baseIndex) {
  const targetBaseIndex = Number(baseIndex);
  const targetPoint =
    RUNDOWN_BASE_POINTS[targetBaseIndex];
  if (
    pickoffActive ||
    !targetPoint ||
    ![1, 2, 3].includes(targetBaseIndex)
  ) return false;

  clearTimeout(sceneTimer);
  clearTimeout(playStartTimer);
  runnerPhaseTimers.forEach((timer) => clearTimeout(timer));
  runnerPhaseTimers = [];
  activeAnimations.forEach((animation) => animation.cancel());
  activeAnimations = [];
  pitchWindowActive = false;
  scheduledPitchAt = null;
  pickoffActive = true;
  galleryField.dataset.pitchWindow = 'pickoff';
  galleryField.dataset.pickoffBase =
    String(targetBaseIndex);
  galleryField.dataset.lastThrowRoute = 'pickoff';
  galleryReplay.disabled = true;
  galleryReplay.textContent = '牽制プレー中…';
  galleryStatus.textContent =
    '投手が走者のいた塁へ牽制球を投げました。';

  throwAtRunner(
    positionOf('pitcher'),
    {
      allStopped: false,
      runnerId: 'self',
      runnerType: 'self',
      runnerArrivalMs: Number.POSITIVE_INFINITY,
      targetBaseIndex,
      targetPoint,
      segmentIndex: targetBaseIndex,
      movingForward: true,
      forceOut: false,
      rundownEligible: true,
      defenseReason: 'pickoff'
    },
    targetPoint
  );
  return true;
}

function contactBallResultColor(sceneName, direction) {
  if (['fly', 'popup', 'liner'].includes(sceneName)) {
    return BALL_RESULT_COLORS.CAUGHT;
  }
  if (sceneName === 'bunt') {
    return String(direction).endsWith('-popup')
      ? BALL_RESULT_COLORS.CAUGHT
      : BALL_RESULT_COLORS.FAIR;
  }
  if (['extra', 'single', 'ground', 'error'].includes(sceneName)) {
    return BALL_RESULT_COLORS.FAIR;
  }
  return null;
}

function playSelectedScene() {
  const scene = SCENES[selectedScene];
  const sceneName = selectedScene;
  const label = displayLabel();
  resetAnimation();
  playCompletionSent = false;
  galleryField.classList.remove('manager-instruction-visible');
  galleryField
    .querySelector('.manager-sign')
    ?.setAttribute('aria-hidden', 'true');
  const pitchStartDelay = PRE_PITCH_WINDOW_DURATION;
  scheduledPitchAt =
    performance.now() + pitchStartDelay;
  pitchWindowActive = true;
  galleryField.dataset.pitchWindow = 'open';
  scheduleAction(pitchStartDelay, () => {
    pitchWindowActive = false;
    scheduledPitchAt = null;
    if (!pickoffActive) {
      galleryField.dataset.pitchWindow = 'closed';
    }
  });
  galleryField.classList.add('scene-running');
  galleryReplay.disabled = true;
  galleryReplay.textContent = `${label}を再生中…`;
  galleryStatus.textContent = `${label}を再生しています。`;
  dispatchRunnerPhase('prepare', sceneName);
  selectPlayDefenseAlignment();
  const beginsWithPitchOnly =
    sceneName === 'passed' ||
    sceneName === 'swing' ||
    sceneName === 'take';

  if (sceneName === 'bunt') {
    playBuntBatHold(pitchStartDelay);
  } else if (sceneName !== 'take') {
    playBatSwing(
      pitchStartDelay,
      sceneName === 'swing'
    );
  }

  if (beginsWithPitchOnly) {
    scheduleRunnerPhase(
      'pitch',
      sceneName,
      pitchStartDelay
    );
    if (sceneName === 'passed') {
      playPassedBall(pitchStartDelay);
    } else {
      playCaughtPitch(pitchStartDelay);
    }
  } else {
    playPitchToContact(pitchStartDelay);
    playStartTimer = setTimeout(() => {
      const contactColor =
        contactBallResultColor(sceneName, selectedDirection);
      if (contactColor) markBallResult(contactColor, 0);
      dispatchRunnerPhase('contact', sceneName);
      playSceneAnimation(sceneName);
    }, pitchStartDelay + PITCH_DURATION);
  }

  sceneTimer = setTimeout(() => {
    galleryReplay.disabled = false;
    galleryReplay.textContent = `↻ ${label}をもう一度見る`;
    galleryStatus.textContent = `${label}の再生が終わりました。`;
    dispatchPlayComplete('scene-settled');
  }, (
    scene.duration +
    (
      sceneName === 'swing' &&
      galleryField.dataset.autonomousDecoySteal === 'true'
        ? 5000
        : 0
    ) +
    pitchStartDelay +
    (beginsWithPitchOnly ? 0 : PITCH_DURATION)
  ));
}

sceneButtons.forEach((button) => {
  button.addEventListener('click', () => selectScene(button.dataset.scene));
});

stealSignButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectStealSign(button.dataset.stealSign === 'on');
  });
});

directionButtons.forEach((button) => {
  button.addEventListener('click', () => selectDirection(button.dataset.direction));
});

galleryField.addEventListener(
  'runner-pre-pitch-lead',
  (event) => {
    const millisecondsUntilPitch =
      Number(scheduledPitchAt) - performance.now();
    event.detail.millisecondsUntilPitch =
      millisecondsUntilPitch;
    const shouldPickoff = Boolean(
      !stealSignEnabled &&
      pitchWindowActive &&
      window.RUNNER_MOVEMENT_RULES
        ?.shouldTriggerPickoff?.(
          millisecondsUntilPitch,
          event.detail.action,
          event.detail.baseIndex,
          PRE_PITCH_WINDOW_DURATION
        )
    );
    event.detail.pickoff = shouldPickoff;
    if (shouldPickoff) {
      triggerPickoff(event.detail.baseIndex);
    }
  }
);
galleryField.addEventListener(
  'runner-action-accepted',
  (event) => {
    if (
      ['GO', 'BACK', 'HALFWAY', 'STOP'].includes(
        event.detail?.action
      )
    ) {
      defendCaughtPitchRunner();
    }
  }
);

galleryReplay.addEventListener('click', playSelectedScene);
galleryField.addEventListener(
  'runner-passing-out',
  (event) => {
    const detail = event.detail || {};
    let possessionPoint = null;
    if (
      activeRundown?.active &&
      activeRundown.decision.runnerId === detail.runnerId
    ) {
      const endedRundown = activeRundown;
      possessionPoint = fielders[
        endedRundown.holderName
      ]
        ? currentFielderPoint(
            fielders[endedRundown.holderName]
          )
        : rundownPoint(
            endedRundown.segmentIndex,
            endedRundown.holderProgress
          );
      endedRundown.active = false;
      dispatchRundownEvent('runner-rundown-end', {
        runnerId: detail.runnerId,
        segmentIndex: endedRundown.segmentIndex,
        out: true,
        safeBaseIndex: null
      });
      activeRundown = null;
    }
    showRunnerCall(true);
    const outcome = dispatchRunnerDefenseResult(
      detail,
      true
    );
    showDefenseFollowup(outcome);
    if (possessionPoint) {
      continueDefenseAfterPlay(
        possessionPoint,
        outcome,
        possessionPoint
      );
    }
  }
);
renderDirectionPicker();
updateLabels();

window.RUNNER_BALL_RESULT_COLORS = BALL_RESULT_COLORS;
window.RUNNER_THROW_TIMING = Object.freeze({
  pitchDuration: PITCH_DURATION,
  stealSignDelay: STEAL_SIGN_DELAY,
  diagonalDuration: DIAMOND_DIAGONAL_THROW_DURATION,
  durationBetween: throwDuration
});
